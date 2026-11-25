import assert from "node:assert/strict";
import type http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { PartnerAnalyticsService } from "../src/bigqueryService.js";
import { loadConfig } from "../src/config.js";
import { BigQueryCostGuard } from "../src/costGuard.js";
import { createBffServer } from "../src/server.js";
import type { ViewportAnalyticsResponse } from "../src/types.js";

async function startEphemeralBff(envOverrides: Record<string, string> = {}): Promise<{
  server: http.Server;
  baseUrl: string;
  costGuard: BigQueryCostGuard;
}> {
  const cfg = loadConfig({
    ...process.env,
    GCP_PROJECT_ID: "aevo-512307",
    BQ_LOCATION: "US",
    BFF_JWT_SECRET: "live-integration-test-secret-aevo-512307",
    ...envOverrides,
  });
  const costGuard = new BigQueryCostGuard(cfg);
  const service = new PartnerAnalyticsService(cfg, costGuard);
  const server = createBffServer(cfg, service);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${addr.port}`, costGuard };
}

async function loginAs(baseUrl: string, userId: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/v1/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  assert.equal(res.status, 200, `Login for ${userId} should succeed`);
  const json = (await res.json()) as { ok: boolean; accessToken: string };
  assert.equal(json.ok, true);
  assert.ok(json.accessToken.length > 20);
  return json.accessToken;
}

describe("TC-BFF-LIVE: Real HTTP + Google Cloud BigQuery (aevo-512307) End-to-End Verification", () => {
  let server: http.Server;
  let baseUrl: string;
  let costGuard: BigQueryCostGuard;

  before(async () => {
    const started = await startEphemeralBff();
    server = started.server;
    baseUrl = started.baseUrl;
    costGuard = started.costGuard;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("TC-LIVE-01: GET /api/v1/health & /api/v1/auth/profiles read 5 RBAC accounts from BigQuery aevo-512307", async () => {
    const healthRes = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: "http://localhost:5182" },
    });
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.headers.get("access-control-allow-origin"), "http://localhost:5182");
    assert.equal(healthRes.headers.get("x-content-type-options"), "nosniff");
    const health = (await healthRes.json()) as {
      ok: boolean;
      gcpProjectId: string;
      costGuard: { maxBytesBilledPerQuery: number; enableDryRunPreflight: boolean };
    };
    assert.equal(health.ok, true);
    assert.equal(health.gcpProjectId, "aevo-512307");
    assert.equal(health.costGuard.maxBytesBilledPerQuery, 25 * 1024 * 1024);
    assert.equal(health.costGuard.enableDryRunPreflight, true);

    // Untrusted Origin must NOT receive ACAO header (OWASP A02:2025)
    const untrustedRes = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { Origin: "https://evil-attacker.example.test" },
    });
    assert.equal(untrustedRes.headers.get("access-control-allow-origin"), null);

    const profilesRes = await fetch(`${baseUrl}/api/v1/auth/profiles`);
    assert.equal(profilesRes.status, 200);
    const profilesJson = (await profilesRes.json()) as {
      ok: boolean;
      profiles: Array<{ userId: string }>;
    };
    assert.equal(profilesJson.profiles.length, 5);
    assert.deepEqual(
      profilesJson.profiles.map((p) => p.userId).sort(),
      ["USR-MGR-H11", "USR-MGR-MYKHE", "USR-MGR-SONGHAN", "USR-PARTNER-01", "USR-STAFF-02"],
    );
  });

  it("TC-LIVE-02: Unauthenticated requests to analytics endpoints return 401 without hitting BigQuery", async () => {
    const beforeJobs = costGuard.getStatus().counters.liveBqJobsExecuted;
    const res = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=all&period=30d`);
    assert.equal(res.status, 401);
    const json = (await res.json()) as { ok: boolean; errorCode: string };
    assert.equal(json.ok, false);
    assert.equal(json.errorCode, "MISSING_AUTHORIZATION");
    assert.equal(costGuard.getStatus().counters.liveBqJobsExecuted, beforeJobs);
  });

  it("TC-LIVE-03: Portfolio Manager USR-PARTNER-01 reconciles exact BigQuery live portfolio (111,960,000 VND / 161 bids), bounded CTO 3-chart ratios (0..100%), and TTL caching", async () => {
    const token = await loginAs(baseUrl, "USR-PARTNER-01");
    const res = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=all&period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as ViewportAnalyticsResponse;

    assert.equal(data.ok, true);
    assert.equal(data.source, "live-bigquery");
    assert.equal(data.kpis.totalBids, 161);
    assert.equal(data.kpis.paidBookings, 40);
    assert.equal(data.kpis.netRevenueVnd, 111_960_000);
    assert.equal(data.kpis.platformFeeVnd, 16_794_000);
    assert.equal(data.kpis.vatAmountVnd, 12_875_400);
    assert.equal(data.kpis.grossGmvVnd, 141_629_400);
    assert.ok(
      data.kpis.totalBrowseClicks > data.kpis.uniqueViewedOffers,
      "Total browse clicks must exceed unique viewed offers",
    );

    // CTO's 3-chart daily series: 30 days, every ratio strictly within 0..100%
    assert.equal(data.ctoDailySeries.length, 30);
    for (const pt of data.ctoDailySeries) {
      assert.ok(pt.formCompletionRatioPct >= 0 && pt.formCompletionRatioPct <= 100);
      assert.ok(pt.viewToSelectRatioPct >= 0 && pt.viewToSelectRatioPct <= 100);
      assert.ok(pt.selectToPayRatioPct >= 0 && pt.selectToPayRatioPct <= 100);
    }

    assert.equal(data.funnel8Steps.length, 8);
    assert.equal(data.mediaEngagement.length, 5);
    assert.equal(data.deviceBreakdown.length, 3);
    assert.equal(data.aiSnapshots.length, 4);

    // Cost telemetry proof: scanned bytes < 1 MB and cost < $0.001
    assert.equal(data.telemetry.projectId, "aevo-512307");
    assert.equal(data.telemetry.dryRunPreflightEnabled, true);
    assert.ok(data.telemetry.totalBytesProcessed < 1_000_000);
    assert.ok(data.telemetry.estimatedCostUsd < 0.001);
    assert.equal(data.telemetry.bffCacheHit, false);

    // Immediate repeat call hits BFF TTL cache with 0 additional BigQuery jobs
    const jobsAfterFirst = costGuard.getStatus().counters.liveBqJobsExecuted;
    const cachedRes = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=all&period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(cachedRes.status, 200);
    const cachedData = (await cachedRes.json()) as ViewportAnalyticsResponse;
    assert.equal(cachedData.telemetry.bffCacheHit, true);
    assert.equal(costGuard.getStatus().counters.liveBqJobsExecuted, jobsAfterFirst);
  });

  it("TC-LIVE-04: Branch Manager USR-MGR-MYKHE sees only br_mykhe (46,490,000 VND / 32 bids) and gets 403 on cross-branch BOLA attempts", async () => {
    const token = await loginAs(baseUrl, "USR-MGR-MYKHE");

    const okRes = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=br_mykhe&period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(okRes.status, 200);
    const okData = (await okRes.json()) as ViewportAnalyticsResponse;
    assert.equal(okData.kpis.totalBids, 32);
    assert.equal(okData.kpis.paidBookings, 17);
    assert.equal(okData.kpis.netRevenueVnd, 46_490_000);
    assert.deepEqual(okData.rbacContext.effectiveBranchIds, ["br_mykhe"]);
    assert.equal(okData.aiSnapshots.length, 1);
    assert.equal(okData.aiSnapshots[0]?.branchId, "br_mykhe");

    // Cross-branch BOLA probes must fail BEFORE hitting BigQuery
    const jobsBeforeBola = costGuard.getStatus().counters.liveBqJobsExecuted;
    for (const target of ["br_songhan", "stay_h11", "all"]) {
      const bolaRes = await fetch(
        `${baseUrl}/api/v1/analytics/viewport?branchId=${target}&period=30d`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      assert.equal(bolaRes.status, 403);
      const errJson = (await bolaRes.json()) as { errorCode: string };
      assert.equal(errJson.errorCode, "FORBIDDEN_BRANCH_SCOPE");
    }
    assert.equal(
      costGuard.getStatus().counters.liveBqJobsExecuted,
      jobsBeforeBola,
      "Rejected 403 BOLA attempts must incur ZERO BigQuery queries",
    );
  });

  it("TC-LIVE-05: Receptionist USR-STAFF-02 has all financial numbers masked at API payload level and cannot write payout/pricing overlays", async () => {
    const token = await loginAs(baseUrl, "USR-STAFF-02");

    // Viewport payload masks all revenue/fee/VAT/GMV to null
    const vpRes = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=br_mykhe&period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(vpRes.status, 200);
    const vp = (await vpRes.json()) as ViewportAnalyticsResponse;
    assert.equal(vp.kpis.totalBids, 32);
    assert.equal(vp.rbacContext.financialsMasked, true);
    assert.equal(vp.kpis.netRevenueVnd, null);
    assert.equal(vp.kpis.platformFeeVnd, null);
    assert.equal(vp.kpis.vatAmountVnd, null);
    assert.equal(vp.kpis.grossGmvVnd, null);
    assert.ok(vp.ctoDailySeries.every((pt) => pt.netRevenueVnd === null));

    // Bundle payload strips payout batches, masks bank account, and scopes exclusively to br_mykhe
    const bundleRes = await fetch(`${baseUrl}/api/v1/analytics/bundle?branchId=br_mykhe`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(bundleRes.status, 200);
    const bundleJson = (await bundleRes.json()) as {
      ok: boolean;
      bundle: {
        hubConfig: { properties: Array<{ id: string }> };
        bidRecords: Array<{ propertyId: string; netRevenueVnd: number }>;
        payoutLedgers: { batches: unknown[]; bankAccounts: Array<{ accountNumber: string }> };
      };
    };
    assert.deepEqual(
      bundleJson.bundle.hubConfig.properties.map((p) => p.id),
      ["br_mykhe"],
    );
    assert.equal(bundleJson.bundle.bidRecords.length, 32);
    assert.ok(bundleJson.bundle.bidRecords.every((b) => b.propertyId === "br_mykhe" && b.netRevenueVnd === 0));
    assert.equal(bundleJson.bundle.payoutLedgers.batches.length, 0);
    assert.equal(bundleJson.bundle.payoutLedgers.bankAccounts[0]?.accountNumber, "•••• •••• ••••");

    // Receptionist forbidden from writing payoutLedgers overlay -> 403
    const forbiddenWrite = await fetch(`${baseUrl}/api/v1/session-overlay/payoutLedgers`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { batches: [], bankAccounts: [] } }),
    });
    assert.equal(forbiddenWrite.status, 403);
    const fwJson = (await forbiddenWrite.json()) as { errorCode: string };
    assert.equal(fwJson.errorCode, "FORBIDDEN_ROLE_PERMISSION");

    // Receptionist allowed to update hubInbox overlay & reset cleanly
    const inboxWrite = await fetch(`${baseUrl}/api/v1/session-overlay/hubInbox`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { messages: [], notifications: [], quickReplies: [] } }),
    });
    assert.equal(inboxWrite.status, 200);

    const resetOverlay = await fetch(`${baseUrl}/api/v1/session-overlay/reset`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(resetOverlay.status, 200);
  });

  it("TC-LIVE-06: Stay Hotel H11 Manager USR-MGR-H11 sees exact 78 Seoul bids (2 paid / 7,600,000 VND) and is blocked from Da Nang branches", async () => {
    const token = await loginAs(baseUrl, "USR-MGR-H11");
    const res = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=stay_h11&period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const vp = (await res.json()) as ViewportAnalyticsResponse;
    assert.equal(vp.kpis.totalBids, 78);
    assert.equal(vp.kpis.paidBookings, 2);
    assert.equal(vp.kpis.netRevenueVnd, 7_600_000);

    const crossRes = await fetch(`${baseUrl}/api/v1/analytics/viewport?branchId=br_mykhe&period=30d`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(crossRes.status, 403);
  });

  it("TC-LIVE-07: Live BigQuery Dry-Run Pre-Flight blocks over-ceiling scan with 400 BQ_COST_LIMIT_EXCEEDED and $0 billed", async () => {
    const tight = await startEphemeralBff({
      BQ_MAX_BYTES_BILLED: "1024", // Intentionally tiny 1 KiB ceiling (< ~14 KiB actual Gold Mart scan)
      BQ_ENABLE_DRY_RUN_PREFLIGHT: "true",
    });
    try {
      const token = await loginAs(tight.baseUrl, "USR-PARTNER-01");
      const res = await fetch(`${tight.baseUrl}/api/v1/analytics/viewport?branchId=all&period=30d`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(res.status, 400);
      const errJson = (await res.json()) as { ok: boolean; errorCode: string };
      assert.equal(errJson.ok, false);
      assert.equal(errJson.errorCode, "BQ_COST_LIMIT_EXCEEDED");

      const status = tight.costGuard.getStatus();
      assert.ok(status.counters.blockedByCostCeiling >= 1);
      // Only profile lookup ran before viewport; the blocked viewport query spent $0
      assert.ok(status.cumulativeEstimatedUsd < 0.0002);
    } finally {
      await new Promise<void>((resolve) => tight.server.close(() => resolve()));
    }
  });
});
