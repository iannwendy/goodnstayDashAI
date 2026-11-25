import type {
  DateRangeKey,
  MasterDataBundle,
  PropertyId,
  StaffRoleKey,
} from "@/data";
import type { PropertyFilterKey } from "@/services/overviewAnalytics";

export type DataSourceMode = "local-json" | "live-bigquery";

export interface BffQueryTelemetry {
  projectId: string;
  location: string;
  dataset: string;
  jobId: string;
  dryRunPreflightEnabled: boolean;
  dryRunEstimatedBytes: number;
  totalBytesProcessed: number;
  totalBytesBilled: number;
  estimatedCostUsd: number;
  queryDurationMs: number;
  bffCacheHit: boolean;
  bqCacheHit: boolean;
  singleflightJoined: boolean;
  executedAt: string;
  appliedFilterSummary: string;
}

export interface BffCostGuardStatus {
  pricingModel: string;
  onDemandRateUsdPerTiB: number;
  monthlyFreeTierTiB: number;
  maxBytesBilledPerQuery: number;
  maxWorstCaseCostPerQueryUsd: number;
  enableDryRunPreflight: boolean;
  dailyBilledByteBudget: number;
  dailyBilledBytesUsed: number;
  dailyBudgetRemainingPct: number;
  circuitBreakerTripped: boolean;
  jobTimeoutMs: number;
  cacheTtlTodaySec: number;
  cacheTtlHistorySec: number;
  rateLimitPerMin: number;
  forceRefreshLimitPerMin: number;
  counters: {
    totalRequests: number;
    bffCacheHits: number;
    singleflightCoalesced: number;
    liveBqJobsExecuted: number;
    bqNativeCacheHits: number;
    dryRunPreflightsRun: number;
    blockedByCostCeiling: number;
    blockedByDailyBudget: number;
    blockedByRateLimit: number;
    blockedBySqlSafety: number;
  };
  cumulativeBytesProcessed: number;
  cumulativeBytesBilled: number;
  cumulativeEstimatedUsd: number;
}

export interface CtoDailySeriesPoint {
  date: string;
  formViews: number;
  formCompleted: number;
  formCompletionRatioPct: number;
  offersImpressed: number;
  totalBrowseClicks: number;
  uniqueViewedOffers: number;
  uniqueSelectedOffers: number;
  paidBookings: number;
  viewToSelectRatioPct: number;
  selectToPayRatioPct: number;
  netRevenueVnd: number | null;
}

export interface FunnelStepItem {
  stepOrder: number;
  stepCode: string;
  labelVi: string;
  labelEn: string;
  labelKo: string;
  count: number;
  conversionFromPrevPct: number;
  conversionFromStartPct: number;
}

export interface MediaCategoryRow {
  categoryKey:
    | "property_views"
    | "facilities"
    | "dining"
    | "rooms"
    | "nearby_attractions";
  imageClicks: number;
  videoClicks: number;
  totalClicks: number;
}

export interface DeviceOsBreakdownRow {
  deviceOs: "ios" | "android" | "web";
  requestsCount: number;
  paidBookingsCount: number;
  conversionRatePct: number;
}

export interface BranchAiSnapshotRow {
  partnerId: string;
  branchId: string;
  totalBids30d: number;
  wonBids30d: number;
  rejectedBids30d: number;
  expiredBids30d: number;
  avgWonSavingPct: number | null;
  avgRejectedSavingPct: number | null;
  avgWonMatchPct: number | null;
  avgRejectedMatchPct: number | null;
  avgDecisionSec: number | null;
  topMissingCriteria: Array<{ unmatchedKey: string; missCount: number }>;
}

export interface BigQueryViewportPayload {
  ok: true;
  source: "live-bigquery";
  period: DateRangeKey;
  dateWindow: { startDate: string; endDate: string };
  rbacContext: {
    userId: string;
    partnerId: string;
    roleKey: StaffRoleKey;
    allowedBranchIds: PropertyId[];
    effectiveBranchIds: PropertyId[];
    canViewChainAll: boolean;
    canViewFinancials: boolean;
    canManagePricing: boolean;
    financialsMasked: boolean;
  };
  kpis: {
    totalBids: number;
    autoBidsCount: number;
    paidBookings: number;
    rejectedBids: number;
    expiredBids: number;
    cancelledBids: number;
    acceptRatePct: number;
    totalBrowseClicks: number;
    uniqueViewedOffers: number;
    uniqueSelectedOffers: number;
    viewToSelectPct: number;
    selectToPayPct: number;
    avgMatchRatePct: number;
    avgSavingPct: number;
    avgDecisionSec: number;
    avgDescriptionDwellMs: number;
    netRevenueVnd: number | null;
    platformFeeVnd: number | null;
    vatAmountVnd: number | null;
    grossGmvVnd: number | null;
  };
  ctoDailySeries: CtoDailySeriesPoint[];
  funnel8Steps: FunnelStepItem[];
  mediaEngagement: MediaCategoryRow[];
  deviceBreakdown: DeviceOsBreakdownRow[];
  aiSnapshots: BranchAiSnapshotRow[];
  telemetry: BffQueryTelemetry;
  costGuard: BffCostGuardStatus;
}

export interface CrossBranchProbeResult {
  httpStatus: number;
  blocked: boolean;
  errorCode: string;
  message: string;
  targetBranchId: string;
  checkedAt: string;
}

export interface BffScopedBundleResult {
  bundle: MasterDataBundle;
  telemetry: BffQueryTelemetry;
  costGuard: BffCostGuardStatus;
  syncedAt: string;
}

const DEFAULT_BFF_BASE_URL =
  (
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
      .env?.VITE_BIGQUERY_BFF_URL
  )?.replace(/\/+$/, "") || "http://127.0.0.1:4000";

const tokenCache = new Map<string, { token: string; expiresAtMs: number }>();

export function getBffBaseUrl(): string {
  return DEFAULT_BFF_BASE_URL;
}

export function clearBffTokenCache(): void {
  tokenCache.clear();
}

export async function getOrCreateBffToken(userId: string): Promise<string> {
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAtMs > Date.now() + 30_000) {
    return cached.token;
  }

  const res = await fetch(`${DEFAULT_BFF_BASE_URL}/api/v1/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`BFF auth failed (${res.status}): ${errText}`);
  }

  const json = (await res.json()) as {
    ok: boolean;
    accessToken: string;
    expiresInSec: number;
  };
  tokenCache.set(userId, {
    token: json.accessToken,
    expiresAtMs: Date.now() + (json.expiresInSec || 3600) * 1000,
  });
  return json.accessToken;
}

export async function fetchBigQueryViewport(params: {
  userId: string;
  branchId: PropertyFilterKey;
  period: DateRangeKey;
  forceRefresh?: boolean;
}): Promise<BigQueryViewportPayload> {
  const token = await getOrCreateBffToken(params.userId);
  const qs = new URLSearchParams({
    branchId: params.branchId,
    period: params.period,
  });
  if (params.forceRefresh) {
    qs.set("refresh", "true");
  }

  const res = await fetch(
    `${DEFAULT_BFF_BASE_URL}/api/v1/analytics/viewport?${qs.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = await res.json();
  if (!res.ok || !payload?.ok) {
    throw new Error(
      payload?.message || `BigQuery Viewport request failed (${res.status})`,
    );
  }
  return payload as BigQueryViewportPayload;
}

export async function fetchBigQueryScopedBundle(params: {
  userId: string;
  branchId: PropertyFilterKey;
  forceRefresh?: boolean;
}): Promise<BffScopedBundleResult> {
  const token = await getOrCreateBffToken(params.userId);
  const qs = new URLSearchParams({
    branchId: params.branchId,
  });
  if (params.forceRefresh) {
    qs.set("refresh", "true");
  }

  const res = await fetch(
    `${DEFAULT_BFF_BASE_URL}/api/v1/analytics/bundle?${qs.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = await res.json();
  if (!res.ok || !payload?.ok || !payload?.bundle) {
    throw new Error(
      payload?.message || `BigQuery Bundle request failed (${res.status})`,
    );
  }

  return {
    bundle: payload.bundle as MasterDataBundle,
    telemetry: payload.telemetry as BffQueryTelemetry,
    costGuard: payload.costGuard as BffCostGuardStatus,
    syncedAt: payload.syncedAt || new Date().toISOString(),
  };
}

export async function persistBffSessionOverlay(params: {
  userId: string;
  tableKey: string;
  data: unknown;
}): Promise<{ ok: boolean; errorCode?: string; message?: string }> {
  const token = await getOrCreateBffToken(params.userId);
  const res = await fetch(
    `${DEFAULT_BFF_BASE_URL}/api/v1/session-overlay/${encodeURIComponent(params.tableKey)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: params.data }),
    },
  );
  const json = await res.json().catch(() => ({ ok: false }));
  return {
    ok: res.ok && Boolean(json?.ok),
    errorCode: json?.errorCode,
    message: json?.message,
  };
}

export async function probeCrossBranchGuard(params: {
  userId: string;
  targetBranchId: string;
}): Promise<CrossBranchProbeResult> {
  const token = await getOrCreateBffToken(params.userId);
  const res = await fetch(
    `${DEFAULT_BFF_BASE_URL}/api/v1/analytics/viewport?branchId=${encodeURIComponent(params.targetBranchId)}&period=30d`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );
  const json = await res.json().catch(() => ({}));
  return {
    httpStatus: res.status,
    blocked: res.status === 403,
    errorCode: String(json?.errorCode || (res.ok ? "ALLOWED_200" : `HTTP_${res.status}`)),
    message: String(
      json?.message ||
        (res.ok
          ? "Request permitted for authorized portfolio/branch scope."
          : "Access denied by server RBAC."),
    ),
    targetBranchId: params.targetBranchId,
    checkedAt: new Date().toISOString(),
  };
}
