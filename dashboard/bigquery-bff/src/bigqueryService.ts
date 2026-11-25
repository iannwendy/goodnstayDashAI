import fs from "node:fs";
import path from "node:path";
import { BigQuery, type Query } from "@google-cloud/bigquery";
import type { BffConfig } from "./config.js";
import {
  BigQueryCostGuard,
  CostGuardError,
  estimateQueryCostUsd,
} from "./costGuard.js";
import type {
  BranchAiSnapshotRow,
  BranchId,
  CtoDailySeriesPoint,
  DeviceOsBreakdownRow,
  FunnelStepItem,
  JwtSessionClaims,
  MediaCategoryRow,
  PeriodKey,
  QueryJobTelemetry,
  RbacProfile,
  RoleKey,
  ViewportAnalyticsResponse,
} from "./types.js";

export interface ExecutedSqlResult<TRow> {
  rows: TRow[];
  jobId: string;
  dryRunEstimatedBytes: number;
  totalBytesProcessed: number;
  totalBytesBilled: number;
  bqCacheHit: boolean;
  durationMs: number;
}

export interface BigQueryExecutor {
  runProtectedQuery<TRow>(opts: {
    sql: string;
    params?: Record<string, unknown>;
    types?: Record<string, string | string[]>;
    endpointLabel: string;
  }): Promise<ExecutedSqlResult<TRow>>;
}

const PERIOD_WINDOWS: Record<PeriodKey, { startDate: string; endDate: string }> = {
  today: { startDate: "2026-11-06", endDate: "2026-11-06" },
  "7d": { startDate: "2026-10-31", endDate: "2026-11-06" },
  "30d": { startDate: "2026-10-08", endDate: "2026-11-06" },
};

function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

function safeBoundedPct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  const raw = (numerator / denominator) * 100;
  return Number(Math.max(0, Math.min(100, raw)).toFixed(1));
}

export class GoogleBigQueryExecutor implements BigQueryExecutor {
  private readonly bq: BigQuery;
  private readonly cfg: BffConfig;
  private readonly costGuard: BigQueryCostGuard;

  constructor(cfg: BffConfig, costGuard: BigQueryCostGuard) {
    this.cfg = cfg;
    this.costGuard = costGuard;
    this.bq = new BigQuery({
      projectId: cfg.gcpProjectId,
      location: cfg.bqLocation,
    });
  }

  async runProtectedQuery<TRow>(opts: {
    sql: string;
    params?: Record<string, unknown>;
    types?: Record<string, string | string[]>;
    endpointLabel: string;
  }): Promise<ExecutedSqlResult<TRow>> {
    // Layer 1: Static read-only SQL & no SELECT * verification
    this.costGuard.assertSqlSafe(opts.sql);

    // Layer 4: Daily cumulative billed-byte circuit breaker
    this.costGuard.assertDailyBudgetAvailable();

    const baseQuery: Query = {
      query: opts.sql,
      location: this.cfg.bqLocation,
      useLegacySql: false,
      useQueryCache: true,
      params: opts.params,
      types: opts.types,
      labels: {
        datacloud: "antigravity",
        service: "gns_bigquery_bff",
        endpoint: opts.endpointLabel.replace(/[^a-z0-9_-]/gi, "_").toLowerCase().slice(0, 60),
      },
    };

    const startedMs = Date.now();
    let dryRunEstimatedBytes = 0;

    // Layer 5: Zero-cost Pre-Flight Dry-Run byte estimation
    if (this.cfg.enableDryRunPreflight) {
      const [dryJob] = await this.bq.createQueryJob({
        ...baseQuery,
        dryRun: true,
      });
      const dryStats = (dryJob.metadata as { statistics?: { totalBytesProcessed?: string } } | undefined)
        ?.statistics;
      dryRunEstimatedBytes = toNum(dryStats?.totalBytesProcessed);
      this.costGuard.assertDryRunWithinCeiling(dryRunEstimatedBytes);
    }

    // Layer 6: Execute real query with hard per-query `maximumBytesBilled` + `jobTimeoutMs`
    try {
      const [job] = await this.bq.createQueryJob({
        ...baseQuery,
        maximumBytesBilled: String(this.cfg.maxBytesBilledPerQuery),
        jobTimeoutMs: this.cfg.jobTimeoutMs,
      });
      const [rows] = await job.getQueryResults();
      const [meta] = await job.getMetadata();
      const durationMs = Math.max(1, Date.now() - startedMs);

      const qStats = (
        meta as {
          statistics?: {
            query?: {
              totalBytesProcessed?: string;
              totalBytesBilled?: string;
              cacheHit?: boolean;
            };
          };
        }
      )?.statistics?.query;

      const totalBytesProcessed = toNum(qStats?.totalBytesProcessed);
      const bqCacheHit = Boolean(qStats?.cacheHit);
      const totalBytesBilled = bqCacheHit ? 0 : toNum(qStats?.totalBytesBilled);

      this.costGuard.recordExecutedJob(totalBytesProcessed, totalBytesBilled, bqCacheHit);

      return {
        rows: rows as TRow[],
        jobId: job.id ?? "unknown-job",
        dryRunEstimatedBytes,
        totalBytesProcessed,
        totalBytesBilled,
        bqCacheHit,
        durationMs,
      };
    } catch (err) {
      if (err instanceof CostGuardError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      if (/bytes billed|billingTierLimitExceeded/i.test(msg)) {
        throw new CostGuardError(
          400,
          "BQ_COST_LIMIT_EXCEEDED",
          `BigQuery aborted query before execution: scan exceeded maximumBytesBilled (${this.cfg.maxBytesBilledPerQuery} bytes, $0 billed).`,
          { maxBytesBilledPerQuery: this.cfg.maxBytesBilledPerQuery },
        );
      }
      throw err;
    }
  }
}

interface RawRbacRow {
  user_id: string;
  partner_id: string;
  role_key: RoleKey;
  display_name_vi: string;
  display_name_en: string;
  display_name_ko: string;
  initials_vi: string;
  initials_en: string;
  initials_ko: string;
  role_badge_vi: string;
  role_badge_en: string;
  role_badge_ko: string;
  allowed_branch_ids: string[];
  can_view_chain_all: boolean;
  can_view_financials: boolean;
  can_manage_pricing: boolean;
}

interface RawDailyRow {
  iso_date: string;
  total_bids: number | string;
  auto_bids_count: number | string;
  accepted_paid_bids: number | string;
  expired_bids: number | string;
  rejected_bids: number | string;
  cancelled_bids: number | string;
  hotel_net_revenue_vnd: number | string;
  platform_fee_vnd: number | string;
  vat_amount_vnd: number | string;
  gross_gmv_vnd: number | string;
  avg_match_rate_pct: number | string;
  avg_saving_pct: number | string;
  avg_decision_duration_sec: number | string;
  step1_form_starts: number | string;
  step2_requests_submitted: number | string;
  step3_offers_impressed: number | string;
  total_browse_clicks: number | string;
  step4_unique_viewed_offers: number | string;
  step5_media_engaged_offers: number | string;
  step6_unique_selected_offers: number | string;
  step7_checkout_opened_offers: number | string;
  step8_paid_completed_offers: number | string;
  avg_description_dwell_ms: number | string;
}

interface RawMediaDeviceRow {
  grounds_image_clicks: number | string;
  grounds_video_clicks: number | string;
  facility_image_clicks: number | string;
  facility_video_clicks: number | string;
  dining_image_clicks: number | string;
  dining_video_clicks: number | string;
  room_image_clicks: number | string;
  room_video_clicks: number | string;
  nearby_image_clicks: number | string;
  nearby_video_clicks: number | string;
  ios_requests: number | string;
  ios_paid: number | string;
  android_requests: number | string;
  android_paid: number | string;
  web_requests: number | string;
  web_paid: number | string;
}

interface RawAiSnapshotRow {
  partner_id: string;
  branch_id: string;
  total_bids_30d: number | string;
  won_bids_30d: number | string;
  rejected_bids_30d: number | string;
  expired_bids_30d: number | string;
  avg_won_saving_pct: number | string | null;
  avg_rejected_saving_pct: number | string | null;
  avg_won_match_pct: number | string | null;
  avg_rejected_match_pct: number | string | null;
  avg_decision_sec: number | string | null;
  top_missing_criteria: Array<{ unmatched_key: string; miss_count: number | string }> | null;
}

interface RawOltpBidRow {
  record_id: string;
  branch_id: BranchId;
  status: string;
  bid_mode: string;
  session_date: string;
  time_label: string;
  nights: number | string;
  guests_count: number | string;
  room_type_id: string;
  room_number: number | string | null;
  booking_code: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  payout_batch_id: string | null;
  offered_rate_per_night_vnd: number | string;
  net_revenue_vnd: number | string;
}

interface RawOltpBranchRow {
  branch_id: BranchId;
  review_rating_5: number | string;
  review_count: number | string;
  elo_score: number | string;
  auto_bid_enabled: boolean;
}

interface RawOltpPayoutRow {
  batch_id: string;
  branch_id: BranchId;
  cycle_code: string;
  period_start: string;
  period_end: string;
  scheduled_payout_date: string;
  paid_at_date: string | null;
  status: string;
  bookings_count: number | string;
  net_payout_vnd: number | string;
  platform_fee_vnd: number | string;
  vat_amount_vnd: number | string;
  gross_gmv_vnd: number | string;
  booking_codes: string[] | null;
}

export interface SeedMasterBundleSnapshot {
  hubConfig: Record<string, unknown>;
  bidRecords: Array<Record<string, unknown>>;
  hubInbox: {
    messages: Array<Record<string, unknown>>;
    notifications: Array<Record<string, unknown>>;
    quickReplies: Array<Record<string, unknown>>;
  };
  roomInventory: {
    roomTypes: Array<Record<string, unknown>>;
    units: Array<Record<string, unknown>>;
    calendarBlocks: Array<Record<string, unknown>>;
  };
  payoutLedgers: {
    bankAccounts: Array<Record<string, unknown>>;
    batches: Array<Record<string, unknown>>;
  };
  biddingOperations: {
    liveRequests: Array<Record<string, unknown>>;
    autoBidRules: Array<Record<string, unknown>>;
  };
  marketingCampaigns: {
    flashDeals: Array<Record<string, unknown>>;
    upsellOffers: Array<Record<string, unknown>>;
  };
}

export class PartnerAnalyticsService {
  private readonly cfg: BffConfig;
  private readonly executor: BigQueryExecutor;
  readonly costGuard: BigQueryCostGuard;
  private readonly seedBundle: SeedMasterBundleSnapshot;
  private readonly sessionOverlays = new Map<string, Partial<SeedMasterBundleSnapshot>>();

  constructor(cfg: BffConfig, costGuard: BigQueryCostGuard, executor?: BigQueryExecutor) {
    this.cfg = cfg;
    this.costGuard = costGuard;
    this.executor = executor ?? new GoogleBigQueryExecutor(cfg, costGuard);
    this.seedBundle = this.loadSeedSnapshot(cfg.seedMasterDataDir);
  }

  private loadSeedSnapshot(seedDir: string): SeedMasterBundleSnapshot {
    const readJson = (file: string) =>
      JSON.parse(fs.readFileSync(path.join(seedDir, file), "utf-8"));
    return {
      hubConfig: readJson("partner_hub_config.json"),
      bidRecords: readJson("bid_records.json"),
      hubInbox: readJson("hub_inbox.json"),
      roomInventory: readJson("room_inventory.json"),
      payoutLedgers: readJson("payout_ledgers.json"),
      biddingOperations: readJson("bidding_operations.json"),
      marketingCampaigns: readJson("marketing_campaigns.json"),
    };
  }

  async listRbacProfiles(): Promise<RbacProfile[]> {
    const cacheKey = `v1:rbac_profiles:${this.cfg.gcpProjectId}`;
    const { value } = await this.costGuard.runCachedSingleflight(
      cacheKey,
      this.cfg.profileCacheTtlMs,
      false,
      async () => {
        const sql = `
          SELECT
            user_id,
            partner_id,
            role_key,
            display_name_vi,
            display_name_en,
            display_name_ko,
            initials_vi,
            initials_en,
            initials_ko,
            role_badge_vi,
            role_badge_en,
            role_badge_ko,
            allowed_branch_ids,
            can_view_chain_all,
            can_view_financials,
            can_manage_pricing
          FROM \`${this.cfg.gcpProjectId}.gns_sim_oltp.partner_user_branch_access\`
          WHERE user_id IS NOT NULL
          ORDER BY
            CASE role_key
              WHEN 'manager' THEN 1
              WHEN 'branch_manager' THEN 2
              ELSE 3
            END,
            user_id ASC
        `;
        const res = await this.executor.runProtectedQuery<RawRbacRow>({
          sql,
          endpointLabel: "auth_profiles",
        });
        return res.rows.map((r): RbacProfile => ({
          userId: r.user_id,
          partnerId: r.partner_id,
          roleKey: r.role_key,
          displayName: {
            vi: r.display_name_vi,
            en: r.display_name_en,
            ko: r.display_name_ko,
          },
          initials: {
            vi: r.initials_vi,
            en: r.initials_en,
            ko: r.initials_ko,
          },
          roleBadge: {
            vi: r.role_badge_vi,
            en: r.role_badge_en,
            ko: r.role_badge_ko,
          },
          allowedBranchIds: (r.allowed_branch_ids ?? []) as BranchId[],
          canViewChainAll: Boolean(r.can_view_chain_all),
          canViewFinancials: Boolean(r.can_view_financials),
          canManagePricing: Boolean(r.can_manage_pricing),
        }));
      },
    );
    return value;
  }

  async getProfileByUserId(userId: string): Promise<RbacProfile | null> {
    const profiles = await this.listRbacProfiles();
    return profiles.find((p) => p.userId === userId) ?? null;
  }

  async getViewportAnalytics(
    claims: JwtSessionClaims,
    scopedBranches: BranchId[],
    period: PeriodKey,
    forceRefresh: boolean,
  ): Promise<ViewportAnalyticsResponse> {
    this.costGuard.checkRateLimit(claims.sub, forceRefresh);

    const window = PERIOD_WINDOWS[period];
    const sortedBranches = [...scopedBranches].sort();
    const ttlMs = period === "today" ? this.cfg.cacheTtlTodayMs : this.cfg.cacheTtlHistoryMs;
    const cacheKey = `v1:viewport:${claims.sub}:${sortedBranches.join(",")}:${period}:${claims.canViewFinancials}`;

    const cachedResult = await this.costGuard.runCachedSingleflight(
      cacheKey,
      ttlMs,
      forceRefresh,
      async () => {
        const dailySql = `
          SELECT
            FORMAT_DATE('%Y-%m-%d', metric_date) AS iso_date,
            SUM(total_bids) AS total_bids,
            SUM(auto_bids_count) AS auto_bids_count,
            SUM(accepted_paid_bids) AS accepted_paid_bids,
            SUM(expired_bids) AS expired_bids,
            SUM(rejected_bids) AS rejected_bids,
            SUM(cancelled_bids) AS cancelled_bids,
            CASE WHEN @canViewFinancials THEN SUM(hotel_net_revenue_vnd) ELSE 0 END AS hotel_net_revenue_vnd,
            CASE WHEN @canViewFinancials THEN SUM(platform_fee_vnd) ELSE 0 END AS platform_fee_vnd,
            CASE WHEN @canViewFinancials THEN SUM(vat_amount_vnd) ELSE 0 END AS vat_amount_vnd,
            CASE WHEN @canViewFinancials THEN SUM(gross_gmv_vnd) ELSE 0 END AS gross_gmv_vnd,
            AVG(NULLIF(avg_match_rate_pct, 0)) AS avg_match_rate_pct,
            AVG(NULLIF(avg_saving_pct, 0)) AS avg_saving_pct,
            AVG(NULLIF(avg_decision_duration_sec, 0)) AS avg_decision_duration_sec,
            SUM(step1_form_starts) AS step1_form_starts,
            SUM(step2_requests_submitted) AS step2_requests_submitted,
            SUM(step3_offers_impressed) AS step3_offers_impressed,
            SUM(total_browse_clicks) AS total_browse_clicks,
            SUM(step4_unique_viewed_offers) AS step4_unique_viewed_offers,
            SUM(step5_media_engaged_offers) AS step5_media_engaged_offers,
            SUM(step6_unique_selected_offers) AS step6_unique_selected_offers,
            SUM(step7_checkout_opened_offers) AS step7_checkout_opened_offers,
            SUM(step8_paid_completed_offers) AS step8_paid_completed_offers,
            AVG(NULLIF(avg_description_dwell_ms, 0)) AS avg_description_dwell_ms
          FROM \`${this.cfg.gcpProjectId}.gns_analytics_mart.mart_partner_branch_daily\`
          WHERE metric_date BETWEEN @startDate AND @endDate
            AND branch_id IN UNNEST(@branchIds)
          GROUP BY metric_date
          ORDER BY metric_date ASC
        `;

        const mediaSql = `
          SELECT
            COALESCE(SUM(grounds_image_clicks), 0) AS grounds_image_clicks,
            COALESCE(SUM(grounds_video_clicks), 0) AS grounds_video_clicks,
            COALESCE(SUM(facility_image_clicks), 0) AS facility_image_clicks,
            COALESCE(SUM(facility_video_clicks), 0) AS facility_video_clicks,
            COALESCE(SUM(dining_image_clicks), 0) AS dining_image_clicks,
            COALESCE(SUM(dining_video_clicks), 0) AS dining_video_clicks,
            COALESCE(SUM(room_image_clicks), 0) AS room_image_clicks,
            COALESCE(SUM(room_video_clicks), 0) AS room_video_clicks,
            COALESCE(SUM(nearby_image_clicks), 0) AS nearby_image_clicks,
            COALESCE(SUM(nearby_video_clicks), 0) AS nearby_video_clicks,
            COALESCE(SUM(ios_requests), 0) AS ios_requests,
            COALESCE(SUM(ios_paid), 0) AS ios_paid,
            COALESCE(SUM(android_requests), 0) AS android_requests,
            COALESCE(SUM(android_paid), 0) AS android_paid,
            COALESCE(SUM(web_requests), 0) AS web_requests,
            COALESCE(SUM(web_paid), 0) AS web_paid
          FROM \`${this.cfg.gcpProjectId}.gns_analytics_mart.mart_branch_media_and_devices\`
          WHERE metric_date BETWEEN @startDate AND @endDate
            AND branch_id IN UNNEST(@branchIds)
        `;

        const aiSql = `
          SELECT
            partner_id,
            branch_id,
            total_bids_30d,
            won_bids_30d,
            rejected_bids_30d,
            expired_bids_30d,
            avg_won_saving_pct,
            avg_rejected_saving_pct,
            avg_won_match_pct,
            avg_rejected_match_pct,
            avg_decision_sec,
            top_missing_criteria
          FROM \`${this.cfg.gcpProjectId}.gns_analytics_mart.mart_branch_ai_advisor_snapshots\`
          WHERE branch_id IN UNNEST(@branchIds)
          ORDER BY branch_id ASC
        `;

        const [dailyRes, mediaRes, aiRes] = await Promise.all([
          this.executor.runProtectedQuery<RawDailyRow>({
            sql: dailySql,
            params: {
              startDate: BigQuery.date(window.startDate),
              endDate: BigQuery.date(window.endDate),
              branchIds: sortedBranches,
              canViewFinancials: claims.canViewFinancials,
            },
            types: {
              branchIds: ["STRING"],
            },
            endpointLabel: "viewport_daily",
          }),
          this.executor.runProtectedQuery<RawMediaDeviceRow>({
            sql: mediaSql,
            params: {
              startDate: BigQuery.date(window.startDate),
              endDate: BigQuery.date(window.endDate),
              branchIds: sortedBranches,
            },
            types: {
              branchIds: ["STRING"],
            },
            endpointLabel: "viewport_media",
          }),
          this.executor.runProtectedQuery<RawAiSnapshotRow>({
            sql: aiSql,
            params: { branchIds: sortedBranches },
            types: { branchIds: ["STRING"] },
            endpointLabel: "viewport_ai",
          }),
        ]);

        let totalBids = 0;
        let autoBidsCount = 0;
        let paidBookings = 0;
        let expiredBids = 0;
        let rejectedBids = 0;
        let cancelledBids = 0;
        let netRevenueVnd = 0;
        let platformFeeVnd = 0;
        let vatAmountVnd = 0;
        let grossGmvVnd = 0;

        let step1 = 0;
        let step2 = 0;
        let step3 = 0;
        let totalBrowseClicks = 0;
        let step4 = 0;
        let step5 = 0;
        let step6 = 0;
        let step7 = 0;
        let step8 = 0;

        const matchSamples: number[] = [];
        const savingSamples: number[] = [];
        const decisionSamples: number[] = [];
        const dwellSamples: number[] = [];

        const ctoDailySeries: CtoDailySeriesPoint[] = dailyRes.rows.map((r) => {
          const dBids = toNum(r.total_bids);
          const dAuto = toNum(r.auto_bids_count);
          const dPaid = toNum(r.accepted_paid_bids);
          const dExp = toNum(r.expired_bids);
          const dRej = toNum(r.rejected_bids);
          const dCan = toNum(r.cancelled_bids);
          const dNet = toNum(r.hotel_net_revenue_vnd);
          const dFee = toNum(r.platform_fee_vnd);
          const dVat = toNum(r.vat_amount_vnd);
          const dGmv = toNum(r.gross_gmv_vnd);

          const s1 = toNum(r.step1_form_starts);
          const s2 = toNum(r.step2_requests_submitted);
          const s3 = toNum(r.step3_offers_impressed);
          const bClicks = toNum(r.total_browse_clicks);
          const s4 = toNum(r.step4_unique_viewed_offers);
          const s5 = toNum(r.step5_media_engaged_offers);
          const s6 = toNum(r.step6_unique_selected_offers);
          const s7 = toNum(r.step7_checkout_opened_offers);
          const s8 = toNum(r.step8_paid_completed_offers);

          totalBids += dBids;
          autoBidsCount += dAuto;
          paidBookings += dPaid;
          expiredBids += dExp;
          rejectedBids += dRej;
          cancelledBids += dCan;
          netRevenueVnd += dNet;
          platformFeeVnd += dFee;
          vatAmountVnd += dVat;
          grossGmvVnd += dGmv;

          step1 += s1;
          step2 += s2;
          step3 += s3;
          totalBrowseClicks += bClicks;
          step4 += s4;
          step5 += s5;
          step6 += s6;
          step7 += s7;
          step8 += s8;

          if (toNum(r.avg_match_rate_pct) > 0) matchSamples.push(toNum(r.avg_match_rate_pct));
          if (toNum(r.avg_saving_pct) > 0) savingSamples.push(toNum(r.avg_saving_pct));
          if (toNum(r.avg_decision_duration_sec) > 0) decisionSamples.push(toNum(r.avg_decision_duration_sec));
          if (toNum(r.avg_description_dwell_ms) > 0) dwellSamples.push(toNum(r.avg_description_dwell_ms));

          return {
            date: r.iso_date,
            formViews: s1,
            formCompleted: s2,
            formCompletionRatioPct: safeBoundedPct(s2, s1),
            offersImpressed: s3,
            totalBrowseClicks: bClicks,
            uniqueViewedOffers: s4,
            uniqueSelectedOffers: s6,
            paidBookings: dPaid,
            viewToSelectRatioPct: safeBoundedPct(s6, Math.max(s4, s6)),
            selectToPayRatioPct: safeBoundedPct(dPaid, Math.max(s6, dPaid)),
            netRevenueVnd: claims.canViewFinancials ? dNet : null,
          };
        });

        const avg = (arr: number[], digits = 1): number =>
          arr.length === 0
            ? 0
            : Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(digits));

        const rawCounts = [
          {
            stepOrder: 1,
            stepCode: "booking_form_start",
            labelVi: "Mở biểu mẫu tìm phòng (Khu vực)",
            labelEn: "Opened Stay Search Form",
            labelKo: "숙소 검색 폼 시작",
            count: step1,
          },
          {
            stepOrder: 2,
            stepCode: "booking_form_complete",
            labelVi: "Gửi yêu cầu tìm báo giá",
            labelEn: "Submitted Bid Request",
            labelKo: "입찰 요청 제출",
            count: step2,
          },
          {
            stepOrder: 3,
            stepCode: "offer_card_impression",
            labelVi: "Thẻ báo giá hiện trên màn hình",
            labelEn: "Offer Card Visible in Viewport",
            labelKo: "제안 카드 화면 노출",
            count: step3,
          },
          {
            stepOrder: 4,
            stepCode: "offer_browse_click",
            labelVi: "Đề nghị duy nhất được bấm Xem",
            labelEn: "Unique Offers Detail Viewed",
            labelKo: "상세 조회된 고유 제안",
            count: step4,
          },
          {
            stepOrder: 5,
            stepCode: "explore_stay_media_click",
            labelVi: "Tương tác ảnh / video cơ sở",
            labelEn: "Engaged with Gallery Media",
            labelKo: "사진/동영상 탐색",
            count: step5,
          },
          {
            stepOrder: 6,
            stepCode: "offer_select_click",
            labelVi: "Bấm Chọn báo giá",
            labelEn: "Selected Hotel Offer",
            labelKo: "제안 선택 클릭",
            count: step6,
          },
          {
            stepOrder: 7,
            stepCode: "payment_checkout_open",
            labelVi: "Mở màn hình thanh toán",
            labelEn: "Opened Checkout Gateway",
            labelKo: "결제 화면 진입",
            count: step7,
          },
          {
            stepOrder: 8,
            stepCode: "payment_complete",
            labelVi: "Thanh toán thành công (Chốt đơn)",
            labelEn: "Payment Completed (Won)",
            labelKo: "결제 완료 (예약 확정)",
            count: step8,
          },
        ];

        const funnel8Steps: FunnelStepItem[] = rawCounts.map((item, idx) => {
          const prevCount = idx === 0 ? item.count : (rawCounts[idx - 1]?.count ?? item.count);
          return {
            ...item,
            conversionFromPrevPct: idx === 0 ? 100 : safeBoundedPct(item.count, prevCount),
            conversionFromStartPct: safeBoundedPct(item.count, step1),
          };
        });

        const m = mediaRes.rows[0];
        const mediaEngagement: MediaCategoryRow[] = [
          {
            categoryKey: "rooms",
            imageClicks: toNum(m?.room_image_clicks),
            videoClicks: toNum(m?.room_video_clicks),
            totalClicks: toNum(m?.room_image_clicks) + toNum(m?.room_video_clicks),
          },
          {
            categoryKey: "facilities",
            imageClicks: toNum(m?.facility_image_clicks),
            videoClicks: toNum(m?.facility_video_clicks),
            totalClicks: toNum(m?.facility_image_clicks) + toNum(m?.facility_video_clicks),
          },
          {
            categoryKey: "property_views",
            imageClicks: toNum(m?.grounds_image_clicks),
            videoClicks: toNum(m?.grounds_video_clicks),
            totalClicks: toNum(m?.grounds_image_clicks) + toNum(m?.grounds_video_clicks),
          },
          {
            categoryKey: "dining",
            imageClicks: toNum(m?.dining_image_clicks),
            videoClicks: toNum(m?.dining_video_clicks),
            totalClicks: toNum(m?.dining_image_clicks) + toNum(m?.dining_video_clicks),
          },
          {
            categoryKey: "nearby_attractions",
            imageClicks: toNum(m?.nearby_image_clicks),
            videoClicks: toNum(m?.nearby_video_clicks),
            totalClicks: toNum(m?.nearby_image_clicks) + toNum(m?.nearby_video_clicks),
          },
        ];

        const deviceBreakdown: DeviceOsBreakdownRow[] = [
          {
            deviceOs: "ios",
            requestsCount: toNum(m?.ios_requests),
            paidBookingsCount: toNum(m?.ios_paid),
            conversionRatePct: safeBoundedPct(toNum(m?.ios_paid), toNum(m?.ios_requests)),
          },
          {
            deviceOs: "android",
            requestsCount: toNum(m?.android_requests),
            paidBookingsCount: toNum(m?.android_paid),
            conversionRatePct: safeBoundedPct(toNum(m?.android_paid), toNum(m?.android_requests)),
          },
          {
            deviceOs: "web",
            requestsCount: toNum(m?.web_requests),
            paidBookingsCount: toNum(m?.web_paid),
            conversionRatePct: safeBoundedPct(toNum(m?.web_paid), toNum(m?.web_requests)),
          },
        ];

        const aiSnapshots: BranchAiSnapshotRow[] = aiRes.rows.map((a) => ({
          partnerId: a.partner_id,
          branchId: a.branch_id,
          totalBids30d: toNum(a.total_bids_30d),
          wonBids30d: toNum(a.won_bids_30d),
          rejectedBids30d: toNum(a.rejected_bids_30d),
          expiredBids30d: toNum(a.expired_bids_30d),
          avgWonSavingPct: a.avg_won_saving_pct === null ? null : toNum(a.avg_won_saving_pct),
          avgRejectedSavingPct:
            a.avg_rejected_saving_pct === null ? null : toNum(a.avg_rejected_saving_pct),
          avgWonMatchPct: a.avg_won_match_pct === null ? null : toNum(a.avg_won_match_pct),
          avgRejectedMatchPct:
            a.avg_rejected_match_pct === null ? null : toNum(a.avg_rejected_match_pct),
          avgDecisionSec: a.avg_decision_sec === null ? null : toNum(a.avg_decision_sec),
          topMissingCriteria: (a.top_missing_criteria ?? []).map((mc) => ({
            unmatchedKey: mc.unmatched_key,
            missCount: toNum(mc.miss_count),
          })),
        }));

        const totalProcessed =
          dailyRes.totalBytesProcessed + mediaRes.totalBytesProcessed + aiRes.totalBytesProcessed;
        const totalBilled =
          dailyRes.totalBytesBilled + mediaRes.totalBytesBilled + aiRes.totalBytesBilled;
        const totalDryRun =
          dailyRes.dryRunEstimatedBytes + mediaRes.dryRunEstimatedBytes + aiRes.dryRunEstimatedBytes;
        const maxDuration = Math.max(dailyRes.durationMs, mediaRes.durationMs, aiRes.durationMs);
        const allBqCacheHit = dailyRes.bqCacheHit && mediaRes.bqCacheHit && aiRes.bqCacheHit;

        const basePayload: Omit<ViewportAnalyticsResponse, "telemetry" | "costGuard"> & {
          baseTelemetry: Omit<QueryJobTelemetry, "bffCacheHit" | "singleflightJoined">;
        } = {
          ok: true,
          source: "live-bigquery",
          period,
          dateWindow: window,
          rbacContext: {
            userId: claims.sub,
            partnerId: claims.partnerId,
            roleKey: claims.roleKey,
            allowedBranchIds: claims.allowedBranchIds,
            effectiveBranchIds: sortedBranches,
            canViewChainAll: claims.canViewChainAll,
            canViewFinancials: claims.canViewFinancials,
            canManagePricing: claims.canManagePricing,
            financialsMasked: !claims.canViewFinancials,
          },
          kpis: {
            totalBids,
            autoBidsCount,
            paidBookings,
            rejectedBids,
            expiredBids,
            cancelledBids,
            acceptRatePct: safeBoundedPct(paidBookings, totalBids),
            totalBrowseClicks,
            uniqueViewedOffers: step4,
            uniqueSelectedOffers: step6,
            viewToSelectPct: safeBoundedPct(step6, Math.max(step4, step6)),
            selectToPayPct: safeBoundedPct(paidBookings, Math.max(step6, paidBookings)),
            avgMatchRatePct: avg(matchSamples, 1),
            avgSavingPct: avg(savingSamples, 1),
            avgDecisionSec: avg(decisionSamples, 0),
            avgDescriptionDwellMs: avg(dwellSamples, 0),
            netRevenueVnd: claims.canViewFinancials ? netRevenueVnd : null,
            platformFeeVnd: claims.canViewFinancials ? platformFeeVnd : null,
            vatAmountVnd: claims.canViewFinancials ? vatAmountVnd : null,
            grossGmvVnd: claims.canViewFinancials ? grossGmvVnd : null,
          },
          ctoDailySeries,
          funnel8Steps,
          mediaEngagement,
          deviceBreakdown,
          aiSnapshots,
          baseTelemetry: {
            projectId: this.cfg.gcpProjectId,
            location: this.cfg.bqLocation,
            dataset: "gns_analytics_mart",
            jobId: dailyRes.jobId,
            dryRunPreflightEnabled: this.cfg.enableDryRunPreflight,
            dryRunEstimatedBytes: totalDryRun,
            totalBytesProcessed: totalProcessed,
            totalBytesBilled: totalBilled,
            estimatedCostUsd: estimateQueryCostUsd(totalBilled),
            queryDurationMs: maxDuration,
            bqCacheHit: allBqCacheHit,
            executedAt: new Date().toISOString(),
            appliedFilterSummary: `metric_date BETWEEN '${window.startDate}' AND '${window.endDate}' AND branch_id IN (${sortedBranches.map((b) => `'${b}'`).join(", ")})`,
          },
        };

        return basePayload;
      },
    );

    const { baseTelemetry, ...rest } = cachedResult.value;
    const telemetry: QueryJobTelemetry = {
      ...baseTelemetry,
      bffCacheHit: cachedResult.bffCacheHit,
      singleflightJoined: cachedResult.singleflightJoined,
      queryDurationMs: cachedResult.bffCacheHit ? 1 : baseTelemetry.queryDurationMs,
    };

    return {
      ...rest,
      telemetry,
      costGuard: this.costGuard.getStatus(),
    };
  }

  async getScopedMasterBundle(
    claims: JwtSessionClaims,
    scopedBranches: BranchId[],
    forceRefresh: boolean,
  ): Promise<{
    ok: true;
    source: "live-bigquery-bff";
    syncedAt: string;
    rbacContext: {
      userId: string;
      partnerId: string;
      roleKey: RoleKey;
      allowedBranchIds: BranchId[];
      effectiveBranchIds: BranchId[];
      canViewChainAll: boolean;
      canViewFinancials: boolean;
      canManagePricing: boolean;
    };
    bundle: SeedMasterBundleSnapshot;
    telemetry: QueryJobTelemetry;
    costGuard: ReturnType<BigQueryCostGuard["getStatus"]>;
  }> {
    this.costGuard.checkRateLimit(claims.sub, forceRefresh);

    const sortedBranches = [...scopedBranches].sort();
    const branchSet = new Set<string>(sortedBranches);
    const cacheKey = `v1:bundle:${claims.sub}:${sortedBranches.join(",")}:${claims.canViewFinancials}`;

    const cached = await this.costGuard.runCachedSingleflight(
      cacheKey,
      this.cfg.cacheTtlTodayMs,
      forceRefresh,
      async () => {
        const bidsSql = `
          SELECT
            record_id,
            branch_id,
            status,
            bid_mode,
            FORMAT_DATE('%Y-%m-%d', session_date) AS session_date,
            time_label,
            nights,
            guests_count,
            room_type_id,
            room_number,
            booking_code,
            FORMAT_DATE('%Y-%m-%d', check_in_date) AS check_in_date,
            FORMAT_DATE('%Y-%m-%d', check_out_date) AS check_out_date,
            payout_batch_id,
            CASE WHEN @canViewFinancials THEN offered_rate_per_night_vnd ELSE 0 END AS offered_rate_per_night_vnd,
            CASE WHEN @canViewFinancials THEN net_revenue_vnd ELSE 0 END AS net_revenue_vnd
          FROM \`${this.cfg.gcpProjectId}.gns_sim_oltp.bid_offers_and_orders\`
          WHERE session_date BETWEEN DATE '2026-10-08' AND DATE '2026-11-06'
            AND branch_id IN UNNEST(@branchIds)
          ORDER BY session_date DESC, record_id DESC
        `;

        const branchesSql = `
          SELECT
            branch_id,
            review_rating_5,
            review_count,
            elo_score,
            auto_bid_enabled
          FROM \`${this.cfg.gcpProjectId}.gns_sim_oltp.partner_branches\`
          WHERE branch_id IN UNNEST(@branchIds)
        `;

        const payoutsSql = `
          SELECT
            batch_id,
            branch_id,
            cycle_code,
            FORMAT_DATE('%Y-%m-%d', period_start) AS period_start,
            FORMAT_DATE('%Y-%m-%d', period_end) AS period_end,
            FORMAT_DATE('%Y-%m-%d', scheduled_payout_date) AS scheduled_payout_date,
            FORMAT_DATE('%Y-%m-%d', paid_at_date) AS paid_at_date,
            status,
            bookings_count,
            booking_codes,
            CASE WHEN @canViewFinancials THEN net_payout_vnd ELSE 0 END AS net_payout_vnd,
            CASE WHEN @canViewFinancials THEN platform_fee_vnd ELSE 0 END AS platform_fee_vnd,
            CASE WHEN @canViewFinancials THEN vat_amount_vnd ELSE 0 END AS vat_amount_vnd,
            CASE WHEN @canViewFinancials THEN gross_gmv_vnd ELSE 0 END AS gross_gmv_vnd
          FROM \`${this.cfg.gcpProjectId}.gns_sim_oltp.payout_batches\`
          WHERE branch_id IN UNNEST(@branchIds)
        `;

        const [bidsRes, branchesRes, payoutsRes, profiles] = await Promise.all([
          this.executor.runProtectedQuery<RawOltpBidRow>({
            sql: bidsSql,
            params: { branchIds: sortedBranches, canViewFinancials: claims.canViewFinancials },
            types: { branchIds: ["STRING"], canViewFinancials: "BOOL" },
            endpointLabel: "bundle_bids",
          }),
          this.executor.runProtectedQuery<RawOltpBranchRow>({
            sql: branchesSql,
            params: { branchIds: sortedBranches },
            types: { branchIds: ["STRING"] },
            endpointLabel: "bundle_branches",
          }),
          this.executor.runProtectedQuery<RawOltpPayoutRow>({
            sql: payoutsSql,
            params: { branchIds: sortedBranches, canViewFinancials: claims.canViewFinancials },
            types: { branchIds: ["STRING"], canViewFinancials: "BOOL" },
            endpointLabel: "bundle_payouts",
          }),
          this.listRbacProfiles(),
        ]);

        const branchMetaById = new Map(branchesRes.rows.map((b) => [b.branch_id, b] as const));
        const seedBidById = new Map(
          this.seedBundle.bidRecords.map((b) => [String(b.id), b] as const),
        );
        const seedPayoutById = new Map(
          this.seedBundle.payoutLedgers.batches.map((b) => [String(b.id), b] as const),
        );
        const seedRoomTypeById = new Map(
          this.seedBundle.roomInventory.roomTypes.map((rt) => [String(rt.id), rt] as const),
        );

        const seedHub = structuredClone(this.seedBundle.hubConfig) as Record<string, unknown>;
        const seedProps = (seedHub.properties as Array<Record<string, unknown>>) ?? [];
        const scopedProps = seedProps
          .filter((p) => branchSet.has(String(p.id)))
          .map((p) => {
            const liveMeta = branchMetaById.get(p.id as BranchId);
            if (!liveMeta) return p;
            return {
              ...p,
              reviewRating5: toNum(liveMeta.review_rating_5),
              reviewCount: toNum(liveMeta.review_count),
              eloScore: toNum(liveMeta.elo_score),
              autoBidEnabled: Boolean(liveMeta.auto_bid_enabled),
            };
          });

        // Recompute chainOverview live aggregates from live BigQuery partner_branches
        const chainLiveProps = scopedProps.filter((p) => Boolean(p.isChainMember));
        const seedChainOverview = (seedHub.chainOverview as Record<string, unknown>) ?? {};
        let hydratedChainOverview = seedChainOverview;
        if (chainLiveProps.length > 0) {
          const totalReviews = chainLiveProps.reduce((s, p) => s + toNum(p.reviewCount), 0);
          const weightedRating =
            totalReviews > 0
              ? Number(
                  (
                    chainLiveProps.reduce(
                      (s, p) => s + toNum(p.reviewRating5) * toNum(p.reviewCount),
                      0,
                    ) / totalReviews
                  ).toFixed(1),
                )
              : toNum(seedChainOverview.reviewRating5);
          const avgElo = Math.round(
            chainLiveProps.reduce((s, p) => s + toNum(p.eloScore), 0) / chainLiveProps.length,
          );
          hydratedChainOverview = {
            ...seedChainOverview,
            reviewRating5: weightedRating,
            reviewCount: totalReviews,
            eloScore: avgElo,
          };
        }

        const activeProfile =
          profiles.find((p) => p.userId === claims.sub) ?? profiles[0];

        const hydratedHubConfig = {
          ...seedHub,
          chainOverview: hydratedChainOverview,
          partnerUser: activeProfile
            ? {
                userId: activeProfile.userId,
                roleKey: activeProfile.roleKey,
                displayName: activeProfile.displayName,
                initials: activeProfile.initials,
                roleBadge: activeProfile.roleBadge,
                allowedBranchIds: activeProfile.allowedBranchIds,
                canViewChainAll: activeProfile.canViewChainAll,
                canViewFinancials: activeProfile.canViewFinancials,
                canManagePricing: activeProfile.canManagePricing,
              }
            : seedHub.partnerUser,
          staffProfiles: profiles.map((p) => ({
            userId: p.userId,
            roleKey: p.roleKey,
            displayName: p.displayName,
            initials: p.initials,
            roleBadge: p.roleBadge,
            allowedBranchIds: p.allowedBranchIds,
            canViewChainAll: p.canViewChainAll,
            canViewFinancials: p.canViewFinancials,
            canManagePricing: p.canManagePricing,
          })),
          properties: scopedProps,
        };

        const hydratedBids = bidsRes.rows.map((row) => {
          const seedHit = seedBidById.get(row.record_id);
          const seedRec = structuredClone(seedHit ?? {}) as Record<string, unknown>;
          const rtMeta = seedRoomTypeById.get(row.room_type_id);
          const merged: Record<string, unknown> = {
            ...seedRec,
            id: row.record_id,
            propertyId: row.branch_id,
            status: row.status,
            bidMode: row.bid_mode,
            sessionDate: row.session_date,
            timeLabel: row.time_label,
            nights: toNum(row.nights),
            guestsCount: toNum(row.guests_count),
            roomTypeId: row.room_type_id,
            offeredRatePerNightVnd: claims.canViewFinancials
              ? toNum(row.offered_rate_per_night_vnd)
              : 0,
            netRevenueVnd: claims.canViewFinancials ? toNum(row.net_revenue_vnd) : 0,
          };
          if (row.booking_code) merged.bookingCode = row.booking_code;
          if (row.check_in_date) merged.checkInDate = row.check_in_date;
          if (row.check_out_date) merged.checkOutDate = row.check_out_date;
          if (row.room_number !== null) merged.roomNumber = toNum(row.room_number);
          if (row.payout_batch_id) merged.payoutBatchId = row.payout_batch_id;

          // Hydrate rich booking metadata for BigQuery-only live wave records not present in Local JSON seed
          if (!seedHit) {
            if (rtMeta?.name) {
              merged.roomName = structuredClone(rtMeta.name);
            }
            if (Array.isArray(rtMeta?.amenities)) {
              merged.amenities = structuredClone(rtMeta.amenities);
            } else {
              merged.amenities = ["breakfast", "wifi"];
            }
            if (row.status === "accepted") {
              merged.guestFullName = `BigQuery Cloud Guest ${row.booking_code ?? row.record_id}`;
              merged.stayStatus = "upcoming";
              merged.guestNote = {
                vi: `Đơn mới đồng bộ từ kho BigQuery Cloud (${this.cfg.gcpProjectId})`,
                en: `Live booking synced from BigQuery Cloud (${this.cfg.gcpProjectId})`,
                ko: `BigQuery 클라우드(${this.cfg.gcpProjectId}) 실시간 동기화 예약`,
              };
            }
          }

          if (!claims.canViewFinancials && merged.telemetry && typeof merged.telemetry === "object") {
            const tel = merged.telemetry as Record<string, unknown>;
            if (tel.payment_form && typeof tel.payment_form === "object") {
              tel.payment_form = {
                ...(tel.payment_form as Record<string, unknown>),
                base_price: 0,
                platform_fee_amount: 0,
                vat_amount: 0,
                total_booking_amount: 0,
                charge_amount: 0,
              };
            }
          }
          return merged;
        });

        const scopedBankAccounts = this.seedBundle.payoutLedgers.bankAccounts
          .filter((ba) => branchSet.has(String(ba.propertyId)))
          .map((ba) =>
            claims.canViewFinancials
              ? structuredClone(ba)
              : {
                  ...structuredClone(ba),
                  accountNumber: "•••• •••• ••••",
                  accountHolder: "RESTRICTED",
                },
          );

        const scopedBatches = claims.canViewFinancials
          ? payoutsRes.rows.map((p) => {
              const seedHit = seedPayoutById.get(p.batch_id);
              const seedBatch = structuredClone(seedHit ?? {}) as Record<string, unknown>;
              const netPayout = toNum(p.net_payout_vnd);
              const baseObj: Record<string, unknown> = {
                ...seedBatch,
                id: p.batch_id,
                propertyId: p.branch_id,
                cycleCode: p.cycle_code || (seedBatch.cycleCode as string) || "2026-11-BQ",
                periodStart: p.period_start || (seedBatch.periodStart as string) || "2026-10-22",
                periodEnd: p.period_end || (seedBatch.periodEnd as string) || "2026-11-06",
                scheduledPayoutDate:
                  p.scheduled_payout_date || (seedBatch.scheduledPayoutDate as string) || "2026-11-12",
                status: p.status,
                bookingsCount: toNum(p.bookings_count),
                bookingCodes: Array.isArray(p.booking_codes)
                  ? p.booking_codes
                  : ((seedBatch.bookingCodes as string[]) ?? []),
                grossRoomVnd: netPayout,
                adjustmentVnd: 0,
                netPayoutVnd: netPayout,
              };
              if (p.paid_at_date) {
                baseObj.paidAtDate = p.paid_at_date;
              }
              if (!seedHit) {
                baseObj.note = {
                  vi: `Kỳ đối soát đồng bộ từ BigQuery Cloud (${this.cfg.gcpProjectId})`,
                  en: `Live payout cycle synced from BigQuery Cloud (${this.cfg.gcpProjectId})`,
                  ko: `BigQuery 클라우드(${this.cfg.gcpProjectId}) 실시간 정산 주기`,
                };
                baseObj.settlementBreakdown = {
                  payment_codes: (baseObj.bookingCodes as string[]).map(
                    (code) => `PM-BQ-${code.replace("#", "")}`,
                  ),
                  booking_currency: "VND",
                  partner_base_price_vnd: netPayout,
                  platform_fee_15pct_vnd: toNum(p.platform_fee_vnd),
                  vat_10pct_vnd: toNum(p.vat_amount_vnd),
                  total_booking_gmv_vnd: toNum(p.gross_gmv_vnd),
                };
              }
              return baseObj;
            })
          : [];

        const baseBundle: SeedMasterBundleSnapshot = {
          hubConfig: hydratedHubConfig,
          bidRecords: hydratedBids,
          hubInbox: {
            messages: this.seedBundle.hubInbox.messages
              .filter((m) => branchSet.has(String(m.propertyId)))
              .map((m) => structuredClone(m)),
            notifications: this.seedBundle.hubInbox.notifications
              .filter(
                (n) =>
                  (n.scope === "chain" && claims.canViewChainAll) ||
                  branchSet.has(String(n.scope)),
              )
              .map((n) => structuredClone(n)),
            quickReplies: structuredClone(this.seedBundle.hubInbox.quickReplies),
          },
          roomInventory: {
            roomTypes: this.seedBundle.roomInventory.roomTypes
              .filter((rt) => branchSet.has(String(rt.propertyId)))
              .map((rt) => structuredClone(rt)),
            units: this.seedBundle.roomInventory.units
              .filter((u) => branchSet.has(String(u.propertyId)))
              .map((u) => structuredClone(u)),
            calendarBlocks: this.seedBundle.roomInventory.calendarBlocks
              .filter((cb) => branchSet.has(String(cb.propertyId)))
              .map((cb) => structuredClone(cb)),
          },
          payoutLedgers: {
            bankAccounts: scopedBankAccounts,
            batches: scopedBatches,
          },
          biddingOperations: {
            liveRequests: this.seedBundle.biddingOperations.liveRequests
              .filter((lr) => branchSet.has(String(lr.propertyId)))
              .map((lr) => structuredClone(lr)),
            autoBidRules: this.seedBundle.biddingOperations.autoBidRules
              .filter((ar) => branchSet.has(String(ar.propertyId)))
              .map((ar) => structuredClone(ar)),
          },
          marketingCampaigns: {
            flashDeals: this.seedBundle.marketingCampaigns.flashDeals
              .filter((fd) => branchSet.has(String(fd.propertyId)))
              .map((fd) => structuredClone(fd)),
            upsellOffers: this.seedBundle.marketingCampaigns.upsellOffers
              .filter((uo) => branchSet.has(String(uo.propertyId)))
              .map((uo) => structuredClone(uo)),
          },
        };

        const totalProcessed =
          bidsRes.totalBytesProcessed + branchesRes.totalBytesProcessed + payoutsRes.totalBytesProcessed;
        const totalBilled =
          bidsRes.totalBytesBilled + branchesRes.totalBytesBilled + payoutsRes.totalBytesBilled;
        const totalDryRun =
          bidsRes.dryRunEstimatedBytes +
          branchesRes.dryRunEstimatedBytes +
          payoutsRes.dryRunEstimatedBytes;

        return {
          baseBundle,
          baseTelemetry: {
            projectId: this.cfg.gcpProjectId,
            location: this.cfg.bqLocation,
            dataset: "gns_sim_oltp",
            jobId: bidsRes.jobId,
            dryRunPreflightEnabled: this.cfg.enableDryRunPreflight,
            dryRunEstimatedBytes: totalDryRun,
            totalBytesProcessed: totalProcessed,
            totalBytesBilled: totalBilled,
            estimatedCostUsd: estimateQueryCostUsd(totalBilled),
            queryDurationMs: Math.max(bidsRes.durationMs, branchesRes.durationMs, payoutsRes.durationMs),
            bqCacheHit: bidsRes.bqCacheHit && branchesRes.bqCacheHit && payoutsRes.bqCacheHit,
            executedAt: new Date().toISOString(),
            appliedFilterSummary: `branch_id IN (${sortedBranches.map((b) => `'${b}'`).join(", ")})`,
          },
        };
      },
    );

    // Apply in-memory operational overlay for current user (keeps BigQuery immutable & zero DML cost)
    const overlay = this.sessionOverlays.get(claims.sub);
    const mergedBundle: SeedMasterBundleSnapshot = {
      ...structuredClone(cached.value.baseBundle),
      ...(overlay ?? {}),
    };

    const telemetry: QueryJobTelemetry = {
      ...cached.value.baseTelemetry,
      bffCacheHit: cached.bffCacheHit,
      singleflightJoined: cached.singleflightJoined,
      queryDurationMs: cached.bffCacheHit ? 1 : cached.value.baseTelemetry.queryDurationMs,
    };

    return {
      ok: true,
      source: "live-bigquery-bff",
      syncedAt: new Date().toISOString(),
      rbacContext: {
        userId: claims.sub,
        partnerId: claims.partnerId,
        roleKey: claims.roleKey,
        allowedBranchIds: claims.allowedBranchIds,
        effectiveBranchIds: sortedBranches,
        canViewChainAll: claims.canViewChainAll,
        canViewFinancials: claims.canViewFinancials,
        canManagePricing: claims.canManagePricing,
      },
      bundle: mergedBundle,
      telemetry,
      costGuard: this.costGuard.getStatus(),
    };
  }

  applySessionOverlay(
    userId: string,
    tableKey: keyof SeedMasterBundleSnapshot,
    data: unknown,
  ): { ok: true; table: string; overlayMode: "in-memory-session"; syncedAt: string } {
    const existing = this.sessionOverlays.get(userId) ?? {};
    (existing as Record<string, unknown>)[tableKey] = data;
    this.sessionOverlays.set(userId, existing);
    return {
      ok: true,
      table: tableKey,
      overlayMode: "in-memory-session",
      syncedAt: new Date().toISOString(),
    };
  }

  resetSessionOverlay(userId: string): { ok: true; cleared: boolean } {
    const cleared = this.sessionOverlays.delete(userId);
    return { ok: true, cleared };
  }
}
