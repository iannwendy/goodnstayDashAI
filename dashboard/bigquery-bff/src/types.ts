export type RoleKey = "manager" | "branch_manager" | "receptionist";
export type PeriodKey = "today" | "7d" | "30d";
export type BranchId = "br_mykhe" | "br_songhan" | "br_anthuong" | "stay_h11";
export type ViewportSlotId = "overview_analytics" | "deep_analytics";
export type ViewportProvider =
  | "simulated_bi"
  | "superset"
  | "metabase"
  | "looker"
  | "generic_iframe";

export interface ViewportEmbedClaims {
  sub: string;
  partnerId: string;
  roleKey: RoleKey;
  slotId: ViewportSlotId;
  allowedBranchIds: BranchId[];
  canViewChainAll: boolean;
  canViewFinancials: boolean;
  canManagePricing: boolean;
  iat: number;
  exp: number;
}

export interface ViewportRegistrySlot {
  slotId: ViewportSlotId;
  provider: ViewportProvider;
  mode: "simulated" | "external" | "disabled";
  defaultMinHeightPx: number;
  allowFullscreen: boolean;
}

export interface ViewportEmbedSessionResponse {
  ok: true;
  slotId: ViewportSlotId;
  provider: ViewportProvider;
  embedUrl: string;
  guestToken: string | null;
  issuedAt: string;
  expiresAt: string;
  ttlSec: number;
  minHeightPx: number;
  allowFullscreen: boolean;
  scopeSummary: {
    userId: string;
    partnerId: string;
    roleKey: RoleKey;
    allowedBranchIds: BranchId[];
    canViewChainAll: boolean;
    canViewFinancials: boolean;
  };
}

export interface LocalizedText {
  vi: string;
  en: string;
  ko: string;
}

export interface RbacProfile {
  userId: string;
  partnerId: string;
  roleKey: RoleKey;
  displayName: LocalizedText;
  initials: LocalizedText;
  roleBadge: LocalizedText;
  allowedBranchIds: BranchId[];
  canViewChainAll: boolean;
  canViewFinancials: boolean;
  canManagePricing: boolean;
}

export interface JwtSessionClaims {
  sub: string;
  partnerId: string;
  roleKey: RoleKey;
  allowedBranchIds: BranchId[];
  canViewChainAll: boolean;
  canViewFinancials: boolean;
  canManagePricing: boolean;
  iat: number;
  exp: number;
}

export interface QueryJobTelemetry {
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

export interface CostGuardStatus {
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
  categoryKey: "property_views" | "facilities" | "dining" | "rooms" | "nearby_attractions";
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

export interface ViewportAnalyticsResponse {
  ok: true;
  source: "live-bigquery";
  period: PeriodKey;
  dateWindow: { startDate: string; endDate: string };
  rbacContext: {
    userId: string;
    partnerId: string;
    roleKey: RoleKey;
    allowedBranchIds: BranchId[];
    effectiveBranchIds: BranchId[];
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
  telemetry: QueryJobTelemetry;
  costGuard: CostGuardStatus;
}
