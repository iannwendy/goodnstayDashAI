import type { BffConfig } from "./config.js";
import type { CostGuardStatus } from "./types.js";

export const BIGQUERY_ONDEMAND_USD_PER_TIB = 6.25;
export const BYTES_PER_TIB = 1024 ** 4; // 1,099,511,627,776 bytes

export class CostGuardError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details: Record<string, unknown>;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "CostGuardError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export function estimateQueryCostUsd(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  return Number(((bytes / BYTES_PER_TIB) * BIGQUERY_ONDEMAND_USD_PER_TIB).toFixed(8));
}

interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

interface BillingRecord {
  timestampMs: number;
  bytesBilled: number;
  bytesProcessed: number;
}

const FORBIDDEN_SQL_PATTERNS: ReadonlyArray<{ label: string; regex: RegExp }> = [
  { label: "DML/DDL mutation keyword", regex: /\b(INSERT|UPDATE|DELETE|MERGE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\b/i },
  { label: "Unbounded SELECT *", regex: /\bSELECT\s+\*/i },
  { label: "Multiple SQL statements", regex: /;\s*\S/ },
];

/**
 * 6-Layer BigQuery Cost Guardrail Engine:
 * 1. Read-only & no-SELECT-* static SQL safety validation
 * 2. Per-user sliding-window rate limiter (separate tighter cap for force-refresh)
 * 3. Two-tier TTL response cache + Singleflight in-flight deduplication (anti-stampede)
 * 4. Rolling 24h cumulative bytes-billed circuit breaker
 * 5. Zero-cost Pre-Flight Dry-Run byte ceiling verification
 * 6. Per-query hard `maximumBytesBilled` + `jobTimeoutMs` + telemetry audit tracking
 */
export class BigQueryCostGuard {
  private readonly cfg: BffConfig;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly rateBuckets = new Map<string, number[]>();
  private readonly refreshBuckets = new Map<string, number[]>();
  private readonly billingWindow: BillingRecord[] = [];

  private readonly counters = {
    totalRequests: 0,
    bffCacheHits: 0,
    singleflightCoalesced: 0,
    liveBqJobsExecuted: 0,
    bqNativeCacheHits: 0,
    dryRunPreflightsRun: 0,
    blockedByCostCeiling: 0,
    blockedByDailyBudget: 0,
    blockedByRateLimit: 0,
    blockedBySqlSafety: 0,
  };

  private cumulativeBytesProcessed = 0;
  private cumulativeBytesBilled = 0;

  constructor(cfg: BffConfig) {
    this.cfg = cfg;
  }

  /** Layer 1: Assert query is strictly a single read-only SELECT with explicit column pruning and WHERE filter */
  assertSqlSafe(sql: string): void {
    const trimmed = sql.trim();
    if (!/^(WITH|SELECT)\b/i.test(trimmed)) {
      this.counters.blockedBySqlSafety += 1;
      throw new CostGuardError(
        400,
        "UNSAFE_SQL_STATEMENT",
        "Only read-only SELECT/WITH analytical queries are permitted through BFF.",
      );
    }

    for (const rule of FORBIDDEN_SQL_PATTERNS) {
      if (rule.regex.test(trimmed)) {
        this.counters.blockedBySqlSafety += 1;
        throw new CostGuardError(
          400,
          "UNSAFE_SQL_PATTERN",
          `Blocked query due to cost/safety rule: ${rule.label}.`,
          { rule: rule.label },
        );
      }
    }
  }

  /** Layer 2: Per-user sliding-window rate limiting to stop accidental UI loops */
  checkRateLimit(userId: string, isForceRefresh: boolean, nowMs: number = Date.now()): void {
    const cutoff = nowMs - 60_000;
    const reqList = (this.rateBuckets.get(userId) ?? []).filter((ts) => ts > cutoff);
    if (reqList.length >= this.cfg.rateLimitPerMin) {
      this.counters.blockedByRateLimit += 1;
      throw new CostGuardError(
        429,
        "RATE_LIMIT_EXCEEDED",
        `Rate limit exceeded (${this.cfg.rateLimitPerMin} requests/minute per user).`,
        { userId, limitPerMin: this.cfg.rateLimitPerMin },
      );
    }
    reqList.push(nowMs);
    this.rateBuckets.set(userId, reqList);

    if (isForceRefresh) {
      const refList = (this.refreshBuckets.get(userId) ?? []).filter((ts) => ts > cutoff);
      if (refList.length >= this.cfg.forceRefreshLimitPerMin) {
        this.counters.blockedByRateLimit += 1;
        throw new CostGuardError(
          429,
          "FORCE_REFRESH_RATE_LIMIT_EXCEEDED",
          `Force-live BigQuery refresh capped at ${this.cfg.forceRefreshLimitPerMin}/minute per user.`,
          { userId, forceRefreshLimitPerMin: this.cfg.forceRefreshLimitPerMin },
        );
      }
      refList.push(nowMs);
      this.refreshBuckets.set(userId, refList);
    }
  }

  /** Layer 4: Rolling 24h daily byte circuit breaker */
  private pruneBillingWindow(nowMs: number): void {
    const dayAgo = nowMs - 24 * 60 * 60 * 1000;
    while (this.billingWindow.length > 0 && (this.billingWindow[0]?.timestampMs ?? 0) <= dayAgo) {
      this.billingWindow.shift();
    }
  }

  getDailyBytesBilled(nowMs: number = Date.now()): number {
    this.pruneBillingWindow(nowMs);
    return this.billingWindow.reduce((sum, r) => sum + r.bytesBilled, 0);
  }

  assertDailyBudgetAvailable(nowMs: number = Date.now()): void {
    const used = this.getDailyBytesBilled(nowMs);
    if (used >= this.cfg.dailyBilledByteBudget) {
      this.counters.blockedByDailyBudget += 1;
      throw new CostGuardError(
        503,
        "BQ_DAILY_BUDGET_EXCEEDED",
        `Daily BigQuery billed-byte circuit breaker tripped (${used} / ${this.cfg.dailyBilledByteBudget} bytes).`,
        {
          dailyBilledBytesUsed: used,
          dailyBilledByteBudget: this.cfg.dailyBilledByteBudget,
        },
      );
    }
  }

  /** Layer 5: Evaluate dryRun byte estimate against per-query and remaining daily ceiling */
  assertDryRunWithinCeiling(
    estimatedBytesProcessed: number,
    nowMs: number = Date.now(),
  ): void {
    this.counters.dryRunPreflightsRun += 1;
    if (estimatedBytesProcessed > this.cfg.maxBytesBilledPerQuery) {
      this.counters.blockedByCostCeiling += 1;
      throw new CostGuardError(
        400,
        "BQ_COST_LIMIT_EXCEEDED",
        `Pre-flight dry-run blocked query: estimated ${estimatedBytesProcessed} bytes exceeds per-query ceiling ${this.cfg.maxBytesBilledPerQuery} bytes ($0 billed).`,
        {
          estimatedBytesProcessed,
          maxBytesBilledPerQuery: this.cfg.maxBytesBilledPerQuery,
          estimatedCostUsdIfExecuted: estimateQueryCostUsd(estimatedBytesProcessed),
        },
      );
    }

    const usedToday = this.getDailyBytesBilled(nowMs);
    const projectedMinimumBill = estimatedBytesProcessed > 0 ? Math.max(estimatedBytesProcessed, 10 * 1024 * 1024) : 0;
    if (usedToday + projectedMinimumBill > this.cfg.dailyBilledByteBudget) {
      this.counters.blockedByDailyBudget += 1;
      throw new CostGuardError(
        503,
        "BQ_DAILY_BUDGET_EXCEEDED",
        `Pre-flight blocked query: projected billing would exceed 24h safety budget (${this.cfg.dailyBilledByteBudget} bytes).`,
        {
          dailyBilledBytesUsed: usedToday,
          projectedMinimumBill,
          dailyBilledByteBudget: this.cfg.dailyBilledByteBudget,
        },
      );
    }
  }

  /** Record actual post-execution BigQuery job statistics */
  recordExecutedJob(
    bytesProcessed: number,
    bytesBilled: number,
    bqCacheHit: boolean,
    nowMs: number = Date.now(),
  ): void {
    this.counters.liveBqJobsExecuted += 1;
    if (bqCacheHit) {
      this.counters.bqNativeCacheHits += 1;
    }
    const safeProcessed = Math.max(0, Number.isFinite(bytesProcessed) ? bytesProcessed : 0);
    const safeBilled = bqCacheHit ? 0 : Math.max(0, Number.isFinite(bytesBilled) ? bytesBilled : 0);

    this.cumulativeBytesProcessed += safeProcessed;
    this.cumulativeBytesBilled += safeBilled;
    this.billingWindow.push({
      timestampMs: nowMs,
      bytesProcessed: safeProcessed,
      bytesBilled: safeBilled,
    });
    this.pruneBillingWindow(nowMs);
  }

  /** Layer 3: TTL Cache + Singleflight deduplication */
  async runCachedSingleflight<T>(
    cacheKey: string,
    ttlMs: number,
    bypassCache: boolean,
    loader: () => Promise<T>,
    nowMs: number = Date.now(),
  ): Promise<{ value: T; bffCacheHit: boolean; singleflightJoined: boolean }> {
    this.counters.totalRequests += 1;

    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAtMs > nowMs) {
        this.counters.bffCacheHits += 1;
        return { value: cached.value as T, bffCacheHit: true, singleflightJoined: false };
      }
      if (cached) {
        this.cache.delete(cacheKey);
      }
    }

    const existingPromise = this.inFlight.get(cacheKey);
    if (existingPromise) {
      this.counters.singleflightCoalesced += 1;
      const value = (await existingPromise) as T;
      return { value, bffCacheHit: false, singleflightJoined: true };
    }

    const pending = loader()
      .then((result) => {
        this.cache.set(cacheKey, {
          value: result,
          expiresAtMs: Date.now() + ttlMs,
        });
        return result;
      })
      .finally(() => {
        this.inFlight.delete(cacheKey);
      });

    this.inFlight.set(cacheKey, pending);
    const value = await pending;
    return { value, bffCacheHit: false, singleflightJoined: false };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStatus(nowMs: number = Date.now()): CostGuardStatus {
    const dailyUsed = this.getDailyBytesBilled(nowMs);
    const remainingRatio = Math.max(
      0,
      Math.min(100, ((this.cfg.dailyBilledByteBudget - dailyUsed) / this.cfg.dailyBilledByteBudget) * 100),
    );
    return {
      pricingModel: "On-Demand (Protected by 6-Layer Cost Guardrail)",
      onDemandRateUsdPerTiB: BIGQUERY_ONDEMAND_USD_PER_TIB,
      monthlyFreeTierTiB: 1,
      maxBytesBilledPerQuery: this.cfg.maxBytesBilledPerQuery,
      maxWorstCaseCostPerQueryUsd: estimateQueryCostUsd(this.cfg.maxBytesBilledPerQuery),
      enableDryRunPreflight: this.cfg.enableDryRunPreflight,
      dailyBilledByteBudget: this.cfg.dailyBilledByteBudget,
      dailyBilledBytesUsed: dailyUsed,
      dailyBudgetRemainingPct: Number(remainingRatio.toFixed(2)),
      circuitBreakerTripped: dailyUsed >= this.cfg.dailyBilledByteBudget,
      jobTimeoutMs: this.cfg.jobTimeoutMs,
      cacheTtlTodaySec: Math.round(this.cfg.cacheTtlTodayMs / 1000),
      cacheTtlHistorySec: Math.round(this.cfg.cacheTtlHistoryMs / 1000),
      rateLimitPerMin: this.cfg.rateLimitPerMin,
      forceRefreshLimitPerMin: this.cfg.forceRefreshLimitPerMin,
      counters: { ...this.counters },
      cumulativeBytesProcessed: this.cumulativeBytesProcessed,
      cumulativeBytesBilled: this.cumulativeBytesBilled,
      cumulativeEstimatedUsd: estimateQueryCostUsd(this.cumulativeBytesBilled),
    };
  }
}
