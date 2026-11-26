import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AddressInfo } from "node:net";
import type http from "node:http";
import {
  HttpAuthError,
  signSessionJwt,
  signViewportEmbedToken,
  verifyViewportEmbedToken,
} from "../src/auth.js";
import { loadConfig } from "../src/config.js";
import { BigQueryCostGuard, CostGuardError } from "../src/costGuard.js";
import {
  PartnerAnalyticsService,
  type BigQueryExecutor,
} from "../src/bigqueryService.js";
import { createBffServer } from "../src/server.js";
import type { RbacProfile } from "../src/types.js";

const MANAGER_PROFILE: RbacProfile = {
  userId: "USR-PARTNER-01",
  partnerId: "HTL-PORTFOLIO-01",
  roleKey: "manager",
  displayName: { vi: "Nguyễn Bảo Minh", en: "Kim Ha-yoon", ko: "김하윤" },
  initials: { vi: "BM", en: "KH", ko: "KH" },
  roleBadge: { vi: "Tổng quản lý", en: "Portfolio Manager", ko: "총괄 지배인" },
  allowedBranchIds: ["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"],
  canViewChainAll: true,
  canViewFinancials: true,
  canManagePricing: true,
};

describe("TC-BFF-VP-AUTH: HS256 BI_EMBED Token Signing & Verification", () => {
  const secret = "vp-unit-secret-2026";

  it("signs and verifies BI_EMBED token and rejects expired, tampered, or regular Session JWT tokens", () => {
    const now = 1_795_000_000;
    const { token: sessionToken, claims: sessionClaims } = signSessionJwt(
      MANAGER_PROFILE,
      secret,
      3600,
      now,
    );

    const { token: embedToken, claims: embedClaims } = signViewportEmbedToken(
      sessionClaims,
      "overview_analytics",
      secret,
      900,
      now,
    );

    assert.equal(embedClaims.slotId, "overview_analytics");
    assert.equal(embedClaims.exp, now + 900);

    const verified = verifyViewportEmbedToken(embedToken, secret, now + 30);
    assert.equal(verified.sub, "USR-PARTNER-01");
    assert.equal(verified.slotId, "overview_analytics");
    assert.deepEqual(verified.allowedBranchIds, [
      "br_mykhe",
      "br_songhan",
      "br_anthuong",
      "stay_h11",
    ]);

    // Reject expired embed token -> 401 TOKEN_EXPIRED
    assert.throws(
      () => verifyViewportEmbedToken(embedToken, secret, now + 901),
      (err: unknown) =>
        err instanceof HttpAuthError &&
        err.statusCode === 401 &&
        err.errorCode === "TOKEN_EXPIRED",
    );

    // Reject regular Session JWT (typ: "JWT") used in place of BI_EMBED token -> 401
    assert.throws(
      () => verifyViewportEmbedToken(sessionToken, secret, now + 30),
      (err: unknown) =>
        err instanceof HttpAuthError &&
        err.statusCode === 401 &&
        err.errorCode === "UNSUPPORTED_TOKEN_ALG",
    );

    // Reject tampered payload -> 401 INVALID_TOKEN_SIGNATURE
    const parts = embedToken.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ ...verified, canViewFinancials: true, allowedBranchIds: ["stay_h11"] }),
    ).toString("base64url");
    assert.throws(
      () => verifyViewportEmbedToken(`${parts[0]}.${tampered}.${parts[2]}`, secret, now + 30),
      (err: unknown) =>
        err instanceof HttpAuthError &&
        err.statusCode === 401 &&
        err.errorCode === "INVALID_TOKEN_SIGNATURE",
    );
  });
});

describe("TC-BFF-VP-HTTP: Embed Session Broker, Offline Seed Fallback & Simulated BI Host", () => {
  let server: http.Server;
  let baseUrl: string;
  let offlineExecutorMode: "network_error" | "cost_guard_error" = "network_error";

  const stubExecutor: BigQueryExecutor = {
    async runProtectedQuery() {
      if (offlineExecutorMode === "cost_guard_error") {
        throw new CostGuardError(503, "BQ_DAILY_BUDGET_EXCEEDED", "Simulated budget exhaustion");
      }
      throw new Error("Simulated offline GCP credentials error");
    },
  };

  before(async () => {
    const cfg = loadConfig({
      PORT: "0",
      BFF_JWT_SECRET: "test-vp-http-secret-2026",
      BFF_OFFLINE_SEED_FALLBACK: "true",
      VIEWPORT_PROVIDER: "simulated_bi",
    });
    const guard = new BigQueryCostGuard(cfg);
    const service = new PartnerAnalyticsService(cfg, guard, stubExecutor);
    server = createBffServer(cfg, service);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function loginAs(userId: string): Promise<string> {
    const res = await fetch(`${baseUrl}/api/v1/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    assert.equal(res.status, 200, `Expected 200 login for ${userId}`);
    const body = (await res.json()) as { accessToken: string };
    return body.accessToken;
  }

  it("falls back to seed RBAC profiles when GCP is offline, lists registry, and issues embed sessions", async () => {
    offlineExecutorMode = "network_error";
    const token = await loginAs("USR-PARTNER-01");

    const regRes = await fetch(`${baseUrl}/api/v1/viewports/registry`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(regRes.status, 200);
    const regBody = (await regRes.json()) as {
      ok: boolean;
      slots: Array<{ slotId: string; provider: string }>;
    };
    assert.equal(regBody.ok, true);
    assert.deepEqual(
      regBody.slots.map((s) => s.slotId),
      ["overview_analytics", "deep_analytics"],
    );

    const sessRes = await fetch(`${baseUrl}/api/v1/viewports/overview_analytics/embed-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localeHint: "vi" }),
    });
    assert.equal(sessRes.status, 200);
    const sessBody = (await sessRes.json()) as {
      ok: boolean;
      slotId: string;
      provider: string;
      embedUrl: string;
      guestToken: string | null;
      ttlSec: number;
      scopeSummary: { userId: string; allowedBranchIds: string[]; canViewFinancials: boolean };
    };
    assert.equal(sessBody.ok, true);
    assert.equal(sessBody.slotId, "overview_analytics");
    assert.equal(sessBody.provider, "simulated_bi");
    assert.equal(sessBody.guestToken, null);
    assert.match(sessBody.embedUrl, /\/bi-embed\/render\?token=/);
    assert.equal(sessBody.scopeSummary.userId, "USR-PARTNER-01");
    assert.equal(sessBody.scopeSummary.canViewFinancials, true);

    // Unknown slot -> 404 UNKNOWN_VIEWPORT_SLOT
    const badSlotRes = await fetch(`${baseUrl}/api/v1/viewports/does_not_exist/embed-session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(badSlotRes.status, 404);
    const badSlotBody = (await badSlotRes.json()) as { errorCode: string };
    assert.equal(badSlotBody.errorCode, "UNKNOWN_VIEWPORT_SLOT");
  });

  it("renders Simulated BI HTML scoped strictly to USR-MGR-MYKHE and masks financials for USR-STAFF-02", async () => {
    offlineExecutorMode = "network_error";

    // 1. Branch Manager (USR-MGR-MYKHE) -> ONLY br_mykhe allowed, no br_songhan / stay_h11
    const mgrToken = await loginAs("USR-MGR-MYKHE");
    const mgrSessRes = await fetch(`${baseUrl}/api/v1/viewports/overview_analytics/embed-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mgrToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localeHint: "vi" }),
    });
    assert.equal(mgrSessRes.status, 200);
    const mgrSess = (await mgrSessRes.json()) as { embedUrl: string };
    const mgrRenderPath = new URL(mgrSess.embedUrl).pathname + new URL(mgrSess.embedUrl).search;
    const mgrHtmlRes = await fetch(`${baseUrl}${mgrRenderPath}`);
    assert.equal(mgrHtmlRes.status, 200);
    assert.match(mgrHtmlRes.headers.get("content-type") ?? "", /text\/html/i);
    assert.match(mgrHtmlRes.headers.get("content-security-policy") ?? "", /frame-ancestors/i);
    const mgrHtml = await mgrHtmlRes.text();
    assert.match(mgrHtml, /br_mykhe/);
    assert.doesNotMatch(mgrHtml, /br_songhan/);
    assert.doesNotMatch(mgrHtml, /stay_h11/);
    assert.match(mgrHtml, /id="bi-lang-filter"/);
    assert.match(mgrHtml, /id="bi-currency-filter"/);
    assert.match(mgrHtml, /"initialLang":"vi"/);
    assert.match(mgrHtml, /"KRW":18\.5/);
    assert.match(mgrHtml, /"USD":25400/);

    // 2. Receptionist (USR-STAFF-02) -> financials strictly redacted server-side
    const recToken = await loginAs("USR-STAFF-02");
    const recSessRes = await fetch(`${baseUrl}/api/v1/viewports/deep_analytics/embed-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${recToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localeHint: "vi" }),
    });
    assert.equal(recSessRes.status, 200);
    const recSess = (await recSessRes.json()) as { embedUrl: string };
    const recRenderPath = new URL(recSess.embedUrl).pathname + new URL(recSess.embedUrl).search;
    const recHtmlRes = await fetch(`${baseUrl}${recRenderPath}`);
    assert.equal(recHtmlRes.status, 200);
    const recHtml = await recHtmlRes.text();
    assert.match(recHtml, /Restricted by RBAC Token/i);
    assert.doesNotMatch(recHtml, /28\.290\.000/);
    assert.doesNotMatch(recHtml, /66\.360\.000/);

    // 3. Passing Session JWT instead of BI_EMBED token to /bi-embed/render -> 401
    const wrongTypeRes = await fetch(
      `${baseUrl}/bi-embed/render?token=${encodeURIComponent(mgrToken)}`,
    );
    assert.equal(wrongTypeRes.status, 401);
  });

  it("returns relative /bi-embed URL when proxied via HTTPS tunnel host header", async () => {
    const token = await loginAs("USR-PARTNER-01");
    const sessRes = await fetch(`${baseUrl}/api/v1/viewports/overview_analytics/embed-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Forwarded-Host": "demo-host.tail6930d7.ts.net",
        "X-Forwarded-Proto": "https",
      },
    });
    assert.equal(sessRes.status, 200);
    const body = (await sessRes.json()) as { embedUrl: string };
    assert.ok(
      body.embedUrl.startsWith("/bi-embed/render?token="),
      `Expected relative tunnel embedUrl, got: ${body.embedUrl}`,
    );
  });

  it("never swallows CostGuardError during offline RBAC profile lookup", async () => {
    const cfg = loadConfig({
      PORT: "0",
      BFF_JWT_SECRET: "cost-guard-test-secret",
      BFF_OFFLINE_SEED_FALLBACK: "true",
    });
    const guard = new BigQueryCostGuard(cfg);
    offlineExecutorMode = "cost_guard_error";
    const service = new PartnerAnalyticsService(cfg, guard, stubExecutor);
    await assert.rejects(
      () => service.listRbacProfiles(),
      (err: unknown) => err instanceof CostGuardError && err.errorCode === "BQ_DAILY_BUDGET_EXCEEDED",
    );
    offlineExecutorMode = "network_error";
  });

  it("enforces external BI URL passthrough (no secret leakage), {token} substitution, superset guestToken, and 503 triggers", async () => {
    const extCfg = loadConfig({
      PORT: "0",
      BFF_JWT_SECRET: "ext-vp-secret-2026",
      BFF_OFFLINE_SEED_FALLBACK: "true",
      VIEWPORT_PROVIDER: "superset",
      VIEWPORT_OVERVIEW_EMBED_URL: "https://bi.goodnstay.com/embedded/overview",
      VIEWPORT_DEEP_EMBED_URL: "disabled",
      VIEWPORT_ALLOWED_ORIGINS: "https://bi.goodnstay.com",
    });
    const extServer = createBffServer(
      extCfg,
      new PartnerAnalyticsService(extCfg, new BigQueryCostGuard(extCfg), stubExecutor),
    );
    await new Promise<void>((resolve) => extServer.listen(0, "127.0.0.1", () => resolve()));
    const extPort = (extServer.address() as AddressInfo).port;
    const extBase = `http://127.0.0.1:${extPort}`;

    try {
      const loginRes = await fetch(`${extBase}/api/v1/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "USR-PARTNER-01" }),
      });
      const { accessToken } = (await loginRes.json()) as { accessToken: string };

      // 1. Superset external URL returned untouched (no ?token= leak) + guestToken populated
      const okRes = await fetch(`${extBase}/api/v1/viewports/overview_analytics/embed-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(okRes.status, 200);
      const okBody = (await okRes.json()) as {
        embedUrl: string;
        guestToken: string | null;
        provider: string;
      };
      assert.equal(okBody.provider, "superset");
      assert.equal(okBody.embedUrl, "https://bi.goodnstay.com/embedded/overview");
      assert.ok(typeof okBody.guestToken === "string" && okBody.guestToken.split(".").length === 3);

      // 2. Disabled slot -> 503 VIEWPORT_PROVIDER_UNCONFIGURED
      const disabledRes = await fetch(`${extBase}/api/v1/viewports/deep_analytics/embed-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(disabledRes.status, 503);
      const disabledBody = (await disabledRes.json()) as { errorCode: string };
      assert.equal(disabledBody.errorCode, "VIEWPORT_PROVIDER_UNCONFIGURED");
    } finally {
      await new Promise<void>((resolve, reject) =>
        extServer.close((err) => (err ? reject(err) : resolve())),
      );
    }

    // 3. Explicit {token} placeholder + disallowed origin -> 503
    const tplCfg = loadConfig({
      PORT: "0",
      BFF_JWT_SECRET: "tpl-vp-secret-2026",
      BFF_OFFLINE_SEED_FALLBACK: "true",
      VIEWPORT_PROVIDER: "generic_iframe",
      VIEWPORT_OVERVIEW_EMBED_URL: "https://internal-bi.goodnstay.com/view?embed={token}",
      VIEWPORT_DEEP_EMBED_URL: "https://untrusted.evil.test/view",
      VIEWPORT_ALLOWED_ORIGINS: "https://internal-bi.goodnstay.com",
    });
    const tplServer = createBffServer(
      tplCfg,
      new PartnerAnalyticsService(tplCfg, new BigQueryCostGuard(tplCfg), stubExecutor),
    );
    await new Promise<void>((resolve) => tplServer.listen(0, "127.0.0.1", () => resolve()));
    const tplPort = (tplServer.address() as AddressInfo).port;
    const tplBase = `http://127.0.0.1:${tplPort}`;

    try {
      const loginRes = await fetch(`${tplBase}/api/v1/auth/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "USR-PARTNER-01" }),
      });
      const { accessToken } = (await loginRes.json()) as { accessToken: string };

      const tplRes = await fetch(`${tplBase}/api/v1/viewports/overview_analytics/embed-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(tplRes.status, 200);
      const tplBody = (await tplRes.json()) as { embedUrl: string; guestToken: string | null };
      assert.match(tplBody.embedUrl, /^https:\/\/internal-bi\.goodnstay\.com\/view\?embed=/);
      assert.equal(tplBody.guestToken, null);

      const untrustedRes = await fetch(`${tplBase}/api/v1/viewports/deep_analytics/embed-session`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      assert.equal(untrustedRes.status, 503);
      const untrustedBody = (await untrustedRes.json()) as { errorCode: string };
      assert.equal(untrustedBody.errorCode, "VIEWPORT_PROVIDER_UNCONFIGURED");
    } finally {
      await new Promise<void>((resolve, reject) =>
        tplServer.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
