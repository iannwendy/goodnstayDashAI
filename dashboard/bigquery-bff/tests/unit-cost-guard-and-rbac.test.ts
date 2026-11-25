import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractBearerToken,
  HttpAuthError,
  resolveScopedBranches,
  signSessionJwt,
  verifySessionJwt,
} from "../src/auth.js";
import { loadConfig } from "../src/config.js";
import {
  BigQueryCostGuard,
  CostGuardError,
  estimateQueryCostUsd,
} from "../src/costGuard.js";
import type { RbacProfile } from "../src/types.js";

const SAMPLE_PROFILES: Record<string, RbacProfile> = {
  manager: {
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
  },
  branchMgr: {
    userId: "USR-MGR-MYKHE",
    partnerId: "HTL-DN-024",
    roleKey: "branch_manager",
    displayName: { vi: "Lê Hoàng Nam", en: "Lee Hoang Nam", ko: "레 호앙 남" },
    initials: { vi: "HN", en: "HN", ko: "HN" },
    roleBadge: { vi: "Quản lý CN Mỹ Khê", en: "Branch Manager", ko: "미케 지점장" },
    allowedBranchIds: ["br_mykhe"],
    canViewChainAll: false,
    canViewFinancials: true,
    canManagePricing: true,
  },
  receptionist: {
    userId: "USR-STAFF-02",
    partnerId: "HTL-DN-024",
    roleKey: "receptionist",
    displayName: { vi: "Trần Thu Hà", en: "Park So-yeon", ko: "박소연" },
    initials: { vi: "TH", en: "PS", ko: "PS" },
    roleBadge: { vi: "Lễ tân", en: "Receptionist", ko: "프런트" },
    allowedBranchIds: ["br_mykhe"],
    canViewChainAll: false,
    canViewFinancials: false,
    canManagePricing: false,
  },
};

describe("TC-BFF-AUTH: HS256 JWT Verification & Strict user_id x branch_id RBAC Scoping", () => {
  const secret = "unit-test-hmac-secret-key-2026";

  it("signs and verifies valid HS256 session JWT and rejects tampered/expired/alg:none tokens", () => {
    const now = 1_795_000_000;
    const { token } = signSessionJwt(SAMPLE_PROFILES.branchMgr!, secret, 3600, now);

    const verified = verifySessionJwt(token, secret, now + 100);
    assert.equal(verified.sub, "USR-MGR-MYKHE");
    assert.deepEqual(verified.allowedBranchIds, ["br_mykhe"]);
    assert.equal(verified.canViewChainAll, false);

    // Expired token -> 401
    assert.throws(
      () => verifySessionJwt(token, secret, now + 3601),
      (err: unknown) => err instanceof HttpAuthError && err.statusCode === 401 && err.errorCode === "TOKEN_EXPIRED",
    );

    // Tampered payload -> 401 INVALID_TOKEN_SIGNATURE
    const parts = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...verified, allowedBranchIds: ["br_mykhe", "br_songhan"], canViewChainAll: true }),
    ).toString("base64url");
    assert.throws(
      () => verifySessionJwt(`${parts[0]}.${tamperedPayload}.${parts[2]}`, secret, now + 100),
      (err: unknown) => err instanceof HttpAuthError && err.errorCode === "INVALID_TOKEN_SIGNATURE",
    );

    // alg:none confusion attack -> 401 UNSUPPORTED_TOKEN_ALG
    const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    assert.throws(
      () => verifySessionJwt(`${noneHeader}.${parts[1]}.`, secret, now + 100),
      (err: unknown) => err instanceof HttpAuthError && err.errorCode === "UNSUPPORTED_TOKEN_ALG",
    );

    // Missing Authorization header -> 401
    assert.throws(
      () => extractBearerToken(undefined),
      (err: unknown) => err instanceof HttpAuthError && err.statusCode === 401 && err.errorCode === "MISSING_AUTHORIZATION",
    );
  });

  it("enforces strict cross-branch 403 FORBIDDEN_BRANCH_SCOPE isolation", () => {
    const { claims: mgrClaims } = signSessionJwt(SAMPLE_PROFILES.manager!, secret, 3600);
    const { claims: myKheClaims } = signSessionJwt(SAMPLE_PROFILES.branchMgr!, secret, 3600);

    // Portfolio manager sees all 4 branches
    assert.deepEqual(resolveScopedBranches(mgrClaims, "all"), [
      "br_mykhe",
      "br_songhan",
      "br_anthuong",
      "stay_h11",
    ]);
    assert.deepEqual(resolveScopedBranches(mgrClaims, "stay_h11"), ["stay_h11"]);

    // Branch manager allowed only own branch (explicit or omitted)
    assert.deepEqual(resolveScopedBranches(myKheClaims, "br_mykhe"), ["br_mykhe"]);
    assert.deepEqual(resolveScopedBranches(myKheClaims, null), ["br_mykhe"]);

    // Cross-branch BOLA attempts -> 403
    for (const forbiddenTarget of ["br_songhan", "br_anthuong", "stay_h11", "all"]) {
      assert.throws(
        () => resolveScopedBranches(myKheClaims, forbiddenTarget),
        (err: unknown) =>
          err instanceof HttpAuthError &&
          err.statusCode === 403 &&
          err.errorCode === "FORBIDDEN_BRANCH_SCOPE",
      );
    }

    // Invalid branch ID -> 400
    assert.throws(
      () => resolveScopedBranches(mgrClaims, "unknown_hotel"),
      (err: unknown) =>
        err instanceof HttpAuthError && err.statusCode === 400 && err.errorCode === "INVALID_BRANCH_ID",
    );
  });
});

describe("TC-BFF-COST: 6-Layer BigQuery Cost Guardrail Protection (CTO Requirements)", () => {
  it("Layer 6: clamps misconfigured BQ_MAX_BYTES_BILLED env var to hard 100 MiB server ceiling", () => {
    const cfg = loadConfig({
      BQ_MAX_BYTES_BILLED: String(10 * 1024 ** 4), // Accidental 10 TiB config!
    });
    assert.equal(cfg.maxBytesBilledPerQuery, 100 * 1024 * 1024);
    assert.ok(estimateQueryCostUsd(cfg.maxBytesBilledPerQuery) < 0.001);
  });

  it("Layer 1: blocks SELECT *, DML/DDL mutations, and multi-statement SQL injection", () => {
    const cfg = loadConfig({});
    const guard = new BigQueryCostGuard(cfg);

    assert.doesNotThrow(() =>
      guard.assertSqlSafe(
        "SELECT metric_date, total_bids FROM `aevo-512307.gns_analytics_mart.mart_partner_branch_daily` WHERE metric_date = @d",
      ),
    );

    const forbiddenQueries = [
      "SELECT * FROM `aevo-512307.gns_sim_oltp.bid_offers_and_orders`",
      "DELETE FROM `aevo-512307.gns_sim_oltp.bid_offers_and_orders` WHERE TRUE",
      "UPDATE `aevo-512307.gns_sim_oltp.partner_branches` SET elo_score = 9999 WHERE TRUE",
      "DROP TABLE `aevo-512307.gns_sim_oltp.partner_branches`",
      "SELECT 1; DROP TABLE foo",
    ];
    for (const badSql of forbiddenQueries) {
      assert.throws(
        () => guard.assertSqlSafe(badSql),
        (err: unknown) => err instanceof CostGuardError && err.statusCode === 400,
      );
    }
    assert.equal(guard.getStatus().counters.blockedBySqlSafety, forbiddenQueries.length);
  });

  it("Layer 2: enforces per-user sliding-window rate limit and tighter force-refresh cap", () => {
    const cfg = loadConfig({ BFF_RATE_LIMIT_PER_MIN: "5", BFF_FORCE_REFRESH_LIMIT_PER_MIN: "2" });
    const guard = new BigQueryCostGuard(cfg);
    const t0 = 1_700_000_000_000;

    guard.checkRateLimit("USR-1", true, t0);
    guard.checkRateLimit("USR-1", true, t0 + 100);

    // 3rd force-refresh within 60s -> blocked with 429
    assert.throws(
      () => guard.checkRateLimit("USR-1", true, t0 + 200),
      (err: unknown) =>
        err instanceof CostGuardError &&
        err.statusCode === 429 &&
        err.errorCode === "FORCE_REFRESH_RATE_LIMIT_EXCEEDED",
    );

    // Other user unaffected
    assert.doesNotThrow(() => guard.checkRateLimit("USR-2", true, t0 + 200));

    // After 61s window expires -> allowed again
    assert.doesNotThrow(() => guard.checkRateLimit("USR-1", true, t0 + 61_000));
  });

  it("Layer 3: deduplicates 15 concurrent cold requests via Singleflight and serves subsequent hits from TTL cache", async () => {
    const cfg = loadConfig({});
    const guard = new BigQueryCostGuard(cfg);

    let bigQueryCalls = 0;
    const slowLoader = async () => {
      bigQueryCalls += 1;
      await new Promise((r) => setTimeout(r, 35));
      return { totalBids: 143 };
    };

    // Fire 15 concurrent identical cold requests
    const concurrent = await Promise.all(
      Array.from({ length: 15 }, () =>
        guard.runCachedSingleflight("k:viewport:all:30d", 60_000, false, slowLoader),
      ),
    );

    assert.equal(bigQueryCalls, 1, "Singleflight MUST coalesce all 15 concurrent requests into 1 BQ job");
    assert.equal(concurrent.filter((r) => r.singleflightJoined).length, 14);
    assert.equal(concurrent.every((r) => r.value.totalBids === 143), true);

    // Next call hits TTL cache immediately
    const second = await guard.runCachedSingleflight("k:viewport:all:30d", 60_000, false, slowLoader);
    assert.equal(bigQueryCalls, 1);
    assert.equal(second.bffCacheHit, true);
    assert.equal(guard.getStatus().counters.bffCacheHits, 1);
    assert.equal(guard.getStatus().counters.singleflightCoalesced, 14);
  });

  it("Layer 4 & Layer 5: blocks over-ceiling dry-run estimates ($0 billed) and trips 24h daily byte circuit breaker", () => {
    const cfg = loadConfig({
      BQ_MAX_BYTES_BILLED: String(25 * 1024 * 1024), // 25 MiB per query
      BQ_DAILY_BYTE_BUDGET: String(40 * 1024 * 1024), // 40 MiB/24h budget
    });
    const guard = new BigQueryCostGuard(cfg);
    const t0 = 1_700_000_000_000;

    // 30 MiB dry-run exceeds 25 MiB per-query ceiling -> 400 BQ_COST_LIMIT_EXCEEDED
    assert.throws(
      () => guard.assertDryRunWithinCeiling(30 * 1024 * 1024, t0),
      (err: unknown) =>
        err instanceof CostGuardError &&
        err.statusCode === 400 &&
        err.errorCode === "BQ_COST_LIMIT_EXCEEDED",
    );

    // Record 2 live queries totaling 40 MiB billed -> trips daily circuit breaker
    guard.recordExecutedJob(20 * 1024 * 1024, 20 * 1024 * 1024, false, t0);
    guard.recordExecutedJob(20 * 1024 * 1024, 20 * 1024 * 1024, false, t0 + 1000);
    assert.equal(guard.getStatus(t0 + 2000).circuitBreakerTripped, true);

    assert.throws(
      () => guard.assertDailyBudgetAvailable(t0 + 2000),
      (err: unknown) =>
        err instanceof CostGuardError &&
        err.statusCode === 503 &&
        err.errorCode === "BQ_DAILY_BUDGET_EXCEEDED",
    );

    // BigQuery native cache hits record 0 bytes billed
    const tNextDay = t0 + 25 * 3600 * 1000;
    assert.doesNotThrow(() => guard.assertDailyBudgetAvailable(tNextDay));
    guard.recordExecutedJob(15 * 1024 * 1024, 15 * 1024 * 1024, true, tNextDay);
    assert.equal(guard.getDailyBytesBilled(tNextDay), 0);
  });
});
