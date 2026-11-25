import { useEffect, useState } from "react";
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  DollarSign,
  Cpu,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Image as ImageIcon,
  Smartphone,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type {
  AppLocale,
  CurrencyCode,
  CurrencyRateMap,
  DateRangeKey,
  PropertyId,
  StaffRoleKey,
} from "@/data";
import { formatBusinessMoney } from "@/lib/i18n";
import type { PropertyFilterKey } from "@/services/overviewAnalytics";
import {
  fetchBigQueryViewport,
  getBffBaseUrl,
  probeCrossBranchGuard,
  type BigQueryViewportPayload,
  type CrossBranchProbeResult,
} from "@/services/bigQueryApiService";

interface BigQueryWarehouseViewProps {
  activeUserId: string;
  activeUserName: string;
  activeRoleKey: StaffRoleKey;
  allowedBranchIds: PropertyId[];
  propertyKey: PropertyFilterKey;
  periodKey: DateRangeKey;
  onChangePeriod: (next: DateRangeKey) => void;
  locale: AppLocale;
  currency: CurrencyCode;
  currencyRates: CurrencyRateMap;
  onSwitchToLocalJson: () => void;
}

const ALL_KNOWN_BRANCHES: PropertyId[] = [
  "br_mykhe",
  "br_songhan",
  "br_anthuong",
  "stay_h11",
];

function formatBytesHuman(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCopy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "BigQuery Live Analytics & RBAC Viewport",
      subtitle:
        "Direct live telemetry from Google Cloud BigQuery (aevo-512307) via port-4000 BFF with 6-layer cost guardrails and strict user_id × branch_id scoping.",
      refreshBtn: "Force Live Query",
      retryBtn: "Retry Connection",
      backLocalBtn: "Use Local JSON",
      offlineTitle: "BigQuery BFF (:4000) is currently offline",
      offlineHint:
        "Start the standalone BFF microservice to query aevo-512307 live:",
      costGuardTitle: "6-Layer BigQuery Cost Guardrail (CTO Budget Shield)",
      perQueryCap: "Per-Query Cap",
      dailyBudget: "24h Circuit Breaker",
      dryRunEstimate: "Dry-Run Estimate",
      billedActual: "Actual Billed / Est. Cost",
      cacheHits: "Cache / Singleflight",
      rbacTitle: "user_id × branch_id Access Inspector",
      rbacAllowed: "Authorized Branches",
      rbacEffective: "Active SQL Scope",
      rbacFinancials: "Financial Visibility",
      rbacFull: "Full Revenue & Payout",
      rbacMasked: "Masked (Receptionist Guard)",
      test403Btn: "Test Cross-Branch Guard (403)",
      testing403: "Probing BFF...",
      ctoTitle: "CTO 3-Chart Daily Performance Suite (Bounded 0%–100%)",
      ctoSubtitle:
        "Input volume, Output completions, and daily Conversion Ratio (%) queried from gns_analytics_mart.mart_partner_branch_daily.",
      lensBookingForm: "Search Demand (Form View → Submit → Ratio %)",
      lensOfferFunnel: "Offer Funnel (Unique Viewed → Selected → Paid %)",
      chartInput: "Daily Input",
      chartOutput: "Daily Output",
      chartRatio: "Conversion Ratio (%)",
      funnelTitle: "8-Step GA4 Behavioral Funnel (UNNEST event_params)",
      mediaTitle: "5-Category Gallery Engagement (Image vs. Video)",
      deviceTitle: "Conversion by Device OS",
      aiTitle: "BigQuery AI Win vs. Loss Diagnostics",
      clicksVsUnique: "Total Browse Clicks vs. Unique Offers Viewed",
      revenueMaskedVal: "•••••• (Restricted)",
      catLabels: {
        rooms: "Rooms",
        facilities: "Facilities",
        property_views: "Property Grounds",
        dining: "Dining",
        nearby_attractions: "Nearby Attractions",
      },
      periodLabels: {
        today: "Today",
        "7d": "Last 7 days",
        "30d": "Last 30 days",
      },
    };
  }
  if (locale === "ko") {
    return {
      title: "BigQuery 라이브 분석 및 RBAC 뷰포트",
      subtitle:
        "6단계 비용 보호 장치와 user_id × branch_id 권한 제어를 적용하여 Google Cloud BigQuery(aevo-512307)에서 실시간 조회합니다.",
      refreshBtn: "라이브 새로고침",
      retryBtn: "다시 연결",
      backLocalBtn: "Local JSON 사용",
      offlineTitle: "BigQuery BFF(:4000) 서버가 오프라인입니다",
      offlineHint: "실시간 BigQuery 조회를 위해 BFF 서버를 실행하세요:",
      costGuardTitle: "6단계 BigQuery 비용 보호 현황 (CTO 예산 가드)",
      perQueryCap: "쿼리당 상한",
      dailyBudget: "24시간 예산 서킷",
      dryRunEstimate: "Dry-Run 예상 스캔",
      billedActual: "실제 과금 / 예상 비용",
      cacheHits: "캐시 / Singleflight",
      rbacTitle: "user_id × branch_id 접근 권한 검증",
      rbacAllowed: "허용된 지점",
      rbacEffective: "적용된 SQL 필터",
      rbacFinancials: "매출/정산 조회 권한",
      rbacFull: "전체 조회 허용",
      rbacMasked: "마스킹됨 (프런트 제한)",
      test403Btn: "타 지점 차단 테스트 (403)",
      testing403: "검증 중...",
      ctoTitle: "CTO 3종 일별 추이 차트 (0%–100% 정규화)",
      ctoSubtitle:
        "gns_analytics_mart.mart_partner_branch_daily 기반 일별 유입, 완료 및 전환율(%) 추이.",
      lensBookingForm: "검색 수요 (폼 조회 → 제출 → 전환율 %)",
      lensOfferFunnel: "제안 퍼널 (고유 조회 → 선택 → 결제율 %)",
      chartInput: "일별 유입",
      chartOutput: "일별 완료",
      chartRatio: "전환율 (%)",
      funnelTitle: "GA4 8단계 행동 퍼널 (UNNEST event_params)",
      mediaTitle: "5개 콘텐츠 영역 미디어 클릭 (이미지 vs 동영상)",
      deviceTitle: "기기 OS별 결제 전환율",
      aiTitle: "BigQuery AI 낙찰/실패 원인 진단",
      clicksVsUnique: "총 조회 클릭 vs 고유 조회 제안",
      revenueMaskedVal: "•••••• (권한 제한)",
      catLabels: {
        rooms: "객실",
        facilities: "부대시설",
        property_views: "호텔 전경",
        dining: "다이닝",
        nearby_attractions: "주변 명소",
      },
      periodLabels: {
        today: "오늘",
        "7d": "최근 7일",
        "30d": "최근 30일",
      },
    };
  }
  return {
    title: "BigQuery Live Viewport & Kiểm Chứng Phân Quyền",
    subtitle:
      "Truy vấn trực tiếp kho Google Cloud BigQuery (aevo-512307) qua BFF cổng :4000 với 6 lớp khóa chi phí và phân quyền cứng theo user_id × branch_id.",
    refreshBtn: "Truy vấn trực tiếp",
    retryBtn: "Thử kết nối lại",
    backLocalBtn: "Dùng Local JSON",
    offlineTitle: "Dịch vụ BigQuery BFF (:4000) hiện chưa bật",
    offlineHint:
      "Khởi chạy server BFF để tải dữ liệu trực tiếp từ BigQuery aevo-512307:",
    costGuardTitle: "Giám Sát 6 Lớp Chặn Chi Phí BigQuery (CTO Budget Shield)",
    perQueryCap: "Trần / 1 truy vấn",
    dailyBudget: "Ngân sách 24 giờ",
    dryRunEstimate: "Dry-Run ước tính",
    billedActual: "Tính phí thực / USD",
    cacheHits: "Cache / Singleflight",
    rbacTitle: "Kiểm Chứng Phân Quyền user_id × branch_id",
    rbacAllowed: "Chi nhánh được cấp",
    rbacEffective: "Điều kiện SQL đang ép",
    rbacFinancials: "Quyền xem Tài chính",
    rbacFull: "Đầy đủ Doanh thu & Sao kê",
    rbacMasked: "Đã che số tiền (Quyền Lễ tân)",
    test403Btn: "Kiểm thử chặn chéo chi nhánh (403)",
    testing403: "Đang kiểm tra...",
    ctoTitle: "Bộ 3 Biểu Đồ Theo Ngày Của CTO (Chuẩn hóa 0% – 100%)",
    ctoSubtitle:
      "Lượng đầu vào, Lượng hoàn tất đầu ra và Tỷ lệ chuyển đổi (%) theo ngày lấy trực tiếp từ bảng Gold Mart BigQuery.",
    lensBookingForm: "Nhu cầu tìm phòng (Mở form → Gửi yêu cầu → Tỷ lệ %)",
    lensOfferFunnel: "Hiệu suất chào giá (Xem duy nhất → Bấm Chọn → Tỷ lệ %)",
    chartInput: "Lượng đầu vào theo ngày",
    chartOutput: "Lượng đầu ra theo ngày",
    chartRatio: "Tỷ lệ chuyển đổi (%)",
    funnelTitle: "Phễu Hành Vi GA4 8 Bước (UNNEST event_params)",
    mediaTitle: "Tương Tác 5 Nhóm Nội Dung Gallery (Ảnh vs. Video)",
    deviceTitle: "Tỷ Lệ Chốt Đơn Theo Thiết Bị (iOS / Android / Web)",
    aiTitle: "Chẩn Đoán AI Từ BigQuery: Tại Sao Trúng Thầu vs. Rớt Thầu",
    clicksVsUnique: "Tổng lượt bấm Xem vs. Đề nghị duy nhất được xem",
    revenueMaskedVal: "•••••• ₫ (Đã che)",
    catLabels: {
      rooms: "Không gian phòng",
      facilities: "Tiện ích chung",
      property_views: "Khuôn viên / Ngoại cảnh",
      dining: "Ẩm thực / Bữa sáng",
      nearby_attractions: "Điểm tham quan gần đó",
    },
    periodLabels: {
      today: "Hôm nay",
      "7d": "7 ngày qua",
      "30d": "30 ngày qua",
    },
  };
}

export function BigQueryWarehouseView({
  activeUserId,
  activeUserName,
  activeRoleKey,
  allowedBranchIds,
  propertyKey,
  periodKey,
  onChangePeriod,
  locale,
  currency,
  currencyRates,
  onSwitchToLocalJson,
}: BigQueryWarehouseViewProps) {
  const t = getCopy(locale);
  const [payload, setPayload] = useState<BigQueryViewportPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ctoLens, setCtoLens] = useState<"booking_form" | "offer_funnel">(
    "offer_funnel",
  );
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState<CrossBranchProbeResult | null>(
    null,
  );

  const loadData = async (forceRefresh = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchBigQueryViewport({
        userId: activeUserId,
        branchId: propertyKey,
        period: periodKey,
        forceRefresh,
      });
      setPayload(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to reach BigQuery BFF.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setProbeResult(null);
    void loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, propertyKey, periodKey]);

  // Pick a branch OUTSIDE allowedBranchIds to demonstrate live HTTP 403 enforcement
  const forbiddenProbeTarget: PropertyId =
    ALL_KNOWN_BRANCHES.find((b) => !allowedBranchIds.includes(b)) ??
    "br_songhan";

  const handleProbeCrossBranch = async () => {
    setProbeLoading(true);
    try {
      const result = await probeCrossBranchGuard({
        userId: activeUserId,
        targetBranchId: forbiddenProbeTarget,
      });
      setProbeResult(result);
    } catch (err) {
      setProbeResult({
        httpStatus: 0,
        blocked: false,
        errorCode: "BFF_UNREACHABLE",
        message: err instanceof Error ? err.message : "BFF unreachable",
        targetBranchId: forbiddenProbeTarget,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setProbeLoading(false);
    }
  };

  if (errorMsg && !payload) {
    return (
      <div
        data-testid="module-bigquery-view"
        className="space-y-4 min-w-0 w-full"
      >
        <div
          data-testid="bq-offline-card"
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 sm:p-6 space-y-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-[16px] font-bold text-slate-900 m-0">
                {t.offlineTitle}
              </h2>
              <p className="text-[13px] text-slate-700 m-0">{t.offlineHint}</p>
              <pre className="rounded-lg bg-slate-900 text-emerald-300 text-[12px] px-3 py-2 overflow-x-auto m-0">
                cd dashboard/bigquery-bff &amp;&amp; npm run dev
              </pre>
              <p className="text-[11.5px] text-slate-500 m-0 break-all">
                Endpoint: {getBffBaseUrl()} · {errorMsg}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              data-testid="bq-retry-btn"
              onClick={() => void loadData(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3.5 py-2 text-[12.5px] font-semibold hover:bg-indigo-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.retryBtn}</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToLocalJson}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.backLocalBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ctoSeries = (payload?.ctoDailySeries ?? []).map((pt) => ({
    dateShort: pt.date.slice(5),
    inputVal:
      ctoLens === "booking_form" ? pt.formViews : pt.uniqueViewedOffers,
    outputVal:
      ctoLens === "booking_form" ? pt.formCompleted : pt.uniqueSelectedOffers,
    ratioPct:
      ctoLens === "booking_form"
        ? pt.formCompletionRatioPct
        : pt.viewToSelectRatioPct,
  }));

  const tel = payload?.telemetry;
  const cg = payload?.costGuard;

  return (
    <div
      data-testid="module-bigquery-view"
      className="space-y-5 min-w-0 w-full"
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600 shrink-0" />
            <h1 className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight m-0">
              {t.title}
            </h1>
            <span
              data-testid="bq-live-badge"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {tel?.projectId ?? "aevo-512307"} · {tel?.location ?? "US"}
            </span>
          </div>
          <p className="text-[13px] text-slate-600 mt-1 mb-0">{t.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <select
            data-testid="bq-period-select"
            aria-label="BigQuery period"
            value={periodKey}
            onChange={(e) => onChangePeriod(e.target.value as DateRangeKey)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700"
          >
            <option value="today">{t.periodLabels.today}</option>
            <option value="7d">{t.periodLabels["7d"]}</option>
            <option value="30d">{t.periodLabels["30d"]}</option>
          </select>

          <button
            type="button"
            data-testid="bq-force-refresh-btn"
            disabled={loading}
            onClick={() => void loadData(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3.5 py-2 text-[12.5px] font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{t.refreshBtn}</span>
          </button>
        </div>
      </div>

      {/* Panel 1: 6-Layer Cost Guardrail & Live Job Telemetry Strip */}
      <section
        data-testid="bq-cost-guard-panel"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-w-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
            <h2 className="text-[14px] font-bold text-slate-900 m-0">
              {t.costGuardTitle}
            </h2>
          </div>
          {tel && (
            <span
              data-testid="bq-telemetry-chip"
              className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-700"
            >
              <Cpu className="w-3 h-3 text-indigo-600" />
              <span>{tel.queryDurationMs}ms</span>
              <span>·</span>
              <span>
                {tel.bffCacheHit
                  ? "BFF TTL Cache"
                  : tel.bqCacheHit
                    ? "BQ 24h Cache ($0)"
                    : "Live Scan"}
              </span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.perQueryCap}
            </div>
            <div className="text-[15px] font-bold text-slate-900 tabular mt-0.5">
              {formatBytesHuman(cg?.maxBytesBilledPerQuery ?? 26_214_400)}
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5">
              Max ≤ ${cg?.maxWorstCaseCostPerQueryUsd.toFixed(6) ?? "0.000149"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.dryRunEstimate}
            </div>
            <div
              data-testid="bq-dryrun-bytes"
              className="text-[15px] font-bold text-indigo-700 tabular mt-0.5"
            >
              {formatBytesHuman(tel?.dryRunEstimatedBytes ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Dry-Run Pre-Flight: {cg?.enableDryRunPreflight ? "ON ($0)" : "OFF"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.billedActual}
            </div>
            <div
              data-testid="bq-billed-bytes"
              className="text-[15px] font-bold text-emerald-700 tabular mt-0.5"
            >
              {formatBytesHuman(tel?.totalBytesBilled ?? 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 tabular">
              ${(tel?.estimatedCostUsd ?? 0).toFixed(6)} USD
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.dailyBudget}
            </div>
            <div className="text-[15px] font-bold text-slate-900 tabular mt-0.5">
              {cg?.dailyBudgetRemainingPct ?? 100}%
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {formatBytesHuman(cg?.dailyBilledBytesUsed ?? 0)} /{" "}
              {formatBytesHuman(cg?.dailyBilledByteBudget ?? 524_288_000)}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.cacheHits}
            </div>
            <div className="text-[15px] font-bold text-slate-900 tabular mt-0.5">
              {(cg?.counters.bffCacheHits ?? 0) +
                (cg?.counters.bqNativeCacheHits ?? 0)}{" "}
              hits
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Singleflight: {cg?.counters.singleflightCoalesced ?? 0} · Blocked:{" "}
              {(cg?.counters.blockedByCostCeiling ?? 0) +
                (cg?.counters.blockedByRateLimit ?? 0)}
            </div>
          </div>
        </div>
      </section>

      {/* Panel 2: RBAC Scope Inspector & Live 403 Cross-Branch Guard */}
      <section
        data-testid="bq-rbac-inspector"
        className="rounded-2xl border border-indigo-200/80 bg-[#FAFBFF] p-4 sm:p-5 min-w-0 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <h2 className="text-[14px] font-bold text-slate-900 m-0">
              {t.rbacTitle}
            </h2>
          </div>

          <button
            type="button"
            data-testid="bq-test-cross-branch-btn"
            disabled={probeLoading}
            onClick={() => void handleProbeCrossBranch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              {probeLoading
                ? t.testing403
                : `${t.test403Btn}: ${forbiddenProbeTarget}`}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12.5px]">
          <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              user_id · role_key
            </div>
            <div
              data-testid="bq-rbac-user"
              className="font-bold text-slate-900 mt-0.5 break-words"
            >
              {activeUserId} ({activeUserName})
            </div>
            <span className="inline-block mt-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
              {activeRoleKey}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.rbacAllowed}
            </div>
            <div
              data-testid="bq-rbac-branches"
              className="flex flex-wrap gap-1 mt-1"
            >
              {(payload?.rbacContext.allowedBranchIds ?? allowedBranchIds).map(
                (b) => (
                  <span
                    key={b}
                    className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono font-semibold text-slate-700"
                  >
                    {b}
                  </span>
                ),
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 min-w-0">
            <div className="text-[11px] font-semibold text-slate-500">
              {t.rbacFinancials}
            </div>
            <div
              data-testid="bq-rbac-financials"
              className="mt-1 flex items-center gap-1.5 font-semibold"
            >
              {payload?.rbacContext.financialsMasked ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="text-amber-700">{t.rbacMasked}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">{t.rbacFull}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {tel?.appliedFilterSummary && (
          <div className="rounded-lg bg-slate-900 text-sky-200 px-3 py-2 text-[11.5px] font-mono overflow-x-auto">
            WHERE {tel.appliedFilterSummary}
          </div>
        )}

        {probeResult && (
          <div
            data-testid="bq-cross-branch-result"
            className={`rounded-xl border p-3 text-[12.5px] flex items-start gap-2.5 ${
              probeResult.blocked
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-950"
                : "border-indigo-200 bg-indigo-50/80 text-indigo-950"
            }`}
          >
            {probeResult.blocked ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 break-words">
              <div className="font-bold">
                HTTP {probeResult.httpStatus} · {probeResult.errorCode} (target:{" "}
                {probeResult.targetBranchId})
              </div>
              <div className="text-[12px] opacity-90 mt-0.5">
                {probeResult.message}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* KPI Summary Strip */}
      {payload && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
            <div className="text-[12px] font-semibold text-slate-500">
              {locale === "vi"
                ? "Doanh thu thuần (BigQuery OLTP)"
                : locale === "ko"
                  ? "순매출 (BigQuery OLTP)"
                  : "Net Revenue (BigQuery OLTP)"}
            </div>
            <div
              data-testid="bq-kpi-revenue"
              className="text-[20px] font-bold text-slate-900 tabular mt-1"
            >
              {payload.rbacContext.financialsMasked ||
              payload.kpis.netRevenueVnd === null
                ? t.revenueMaskedVal
                : formatBusinessMoney(payload.kpis.netRevenueVnd, currency, {
                    rates: currencyRates,
                  })}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1">
              {payload.kpis.paidBookings} / {payload.kpis.totalBids} bids (
              {payload.kpis.acceptRatePct}%)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
            <div className="text-[12px] font-semibold text-slate-500">
              {t.clicksVsUnique}
            </div>
            <div
              data-testid="bq-kpi-clicks-unique"
              className="text-[20px] font-bold text-indigo-700 tabular mt-1"
            >
              {payload.kpis.totalBrowseClicks} / {payload.kpis.uniqueViewedOffers}
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1">
              View → Select: {payload.kpis.viewToSelectPct}%
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
            <div className="text-[12px] font-semibold text-slate-500">
              {locale === "vi"
                ? "Độ khớp yêu cầu & Ưu đãi TB"
                : locale === "ko"
                  ? "평균 일치율 및 할인율"
                  : "Avg Match Rate & OTA Saving"}
            </div>
            <div className="text-[20px] font-bold text-emerald-700 tabular mt-1">
              {payload.kpis.avgMatchRatePct}% · -{payload.kpis.avgSavingPct}%
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1">
              Select → Paid: {payload.kpis.selectToPayPct}%
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 min-w-0">
            <div className="text-[12px] font-semibold text-slate-500">
              {locale === "vi"
                ? "Thời gian quyết định & Đọc mô tả"
                : locale === "ko"
                  ? "평균 결정 시간 및 체류 시간"
                  : "Avg Decision & Dwell Time"}
            </div>
            <div className="text-[20px] font-bold text-slate-900 tabular mt-1">
              {payload.kpis.avgDecisionSec}s
            </div>
            <div className="text-[11.5px] text-slate-500 mt-1">
              Dwell: {(payload.kpis.avgDescriptionDwellMs / 1000).toFixed(1)}s
            </div>
          </div>
        </section>
      )}

      {/* Panel 3: CTO's 3-Chart Daily Conversion Suite */}
      <section
        data-testid="bq-cto-3charts"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] space-y-4 min-w-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-bold text-slate-900 m-0">
              {t.ctoTitle}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5 mb-0">
              {t.ctoSubtitle}
            </p>
          </div>
          <div className="flex flex-wrap max-w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
            <button
              type="button"
              data-testid="cto-lens-offer"
              onClick={() => setCtoLens("offer_funnel")}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-colors text-left ${
                ctoLens === "offer_funnel"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              {t.lensOfferFunnel}
            </button>
            <button
              type="button"
              data-testid="cto-lens-form"
              onClick={() => setCtoLens("booking_form")}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-colors text-left ${
                ctoLens === "booking_form"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600"
              }`}
            >
              {t.lensBookingForm}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Daily Input */}
          <div className="rounded-xl border border-slate-200/80 p-3.5 min-w-0">
            <div className="text-[12.5px] font-bold text-slate-800 mb-2">
              1. {t.chartInput}
            </div>
            <div className="h-[190px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={ctoSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="dateShort" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="inputVal"
                    stroke="#2563EB"
                    fill="#DBEAFE"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Daily Output */}
          <div className="rounded-xl border border-slate-200/80 p-3.5 min-w-0">
            <div className="text-[12.5px] font-bold text-slate-800 mb-2">
              2. {t.chartOutput}
            </div>
            <div className="h-[190px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={ctoSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="dateShort" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="outputVal"
                    stroke="#4F46E5"
                    fill="#E0E7FF"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Daily Conversion Ratio (%) strictly 0..100 */}
          <div className="rounded-xl border border-slate-200/80 p-3.5 min-w-0">
            <div className="text-[12.5px] font-bold text-slate-800 mb-2">
              3. {t.chartRatio}
            </div>
            <div className="h-[190px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={ctoSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="dateShort" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={34} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="ratioPct"
                    stroke="#059669"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Panel 4: 8-Step Funnel + 5-Category Media + Device OS */}
      {payload && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 8-Step GA4 Funnel */}
          <section
            data-testid="bq-funnel-8steps"
            className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 min-w-0"
          >
            <h2 className="text-[14.5px] font-bold text-slate-900 m-0">
              {t.funnelTitle}
            </h2>
            <div className="space-y-2.5">
              {payload.funnel8Steps.map((st) => {
                const label =
                  locale === "vi"
                    ? st.labelVi
                    : locale === "ko"
                      ? st.labelKo
                      : st.labelEn;
                const barWidth = Math.max(4, Math.min(100, st.conversionFromStartPct));
                return (
                  <div key={st.stepCode} className="space-y-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="font-medium text-slate-700 truncate">
                        {st.stepOrder}. {label}
                      </span>
                      <span className="font-bold text-slate-900 tabular shrink-0">
                        {st.count}{" "}
                        <span className="text-slate-400 font-normal">
                          ({st.conversionFromPrevPct}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 5-Category Media + Device Breakdown */}
          <div className="space-y-5 min-w-0">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                <h2 className="text-[14.5px] font-bold text-slate-900 m-0">
                  {t.mediaTitle}
                </h2>
              </div>
              <div className="h-[190px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={payload.mediaEngagement.map((m) => ({
                      name: t.catLabels[m.categoryKey],
                      image: m.imageClicks,
                      video: m.videoClicks,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={28} />
                    <Tooltip />
                    <Bar
                      dataKey="image"
                      stackId="a"
                      fill="#4F46E5"
                      radius={[0, 0, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="video"
                      stackId="a"
                      fill="#0EA5E9"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <h2 className="text-[14.5px] font-bold text-slate-900 m-0">
                  {t.deviceTitle}
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {payload.deviceBreakdown.map((dev) => (
                  <div
                    key={dev.deviceOs}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-center min-w-0"
                  >
                    <div className="text-[11px] font-bold uppercase text-slate-500">
                      {dev.deviceOs}
                    </div>
                    <div className="text-[17px] font-bold text-slate-900 tabular mt-0.5">
                      {dev.conversionRatePct}%
                    </div>
                    <div className="text-[11px] text-slate-500 tabular">
                      {dev.paidBookingsCount} / {dev.requestsCount}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Panel 5: AI Win vs Loss Diagnostics from mart_branch_ai_advisor_snapshots */}
      {payload && payload.aiSnapshots.length > 0 && (
        <section className="rounded-2xl border border-indigo-100 bg-[#FAFBFF] p-4 sm:p-5 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <h2 className="text-[14.5px] font-bold text-slate-900 m-0">
              {t.aiTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {payload.aiSnapshots.map((snap) => (
              <div
                key={snap.branchId}
                className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2 min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] font-bold text-indigo-700">
                    {snap.branchId}
                  </span>
                  <span className="text-[11.5px] font-semibold text-slate-600 tabular">
                    Won {snap.wonBids30d} / {snap.totalBids30d} · Rej{" "}
                    {snap.rejectedBids30d} · Exp {snap.expiredBids30d}
                  </span>
                </div>
                <div className="text-[12px] text-slate-600 flex flex-wrap gap-3">
                  <span>
                    Won Match:{" "}
                    <strong>{snap.avgWonMatchPct ?? "—"}%</strong> (Saving{" "}
                    <strong>-{snap.avgWonSavingPct ?? "—"}%</strong>)
                  </span>
                  <span>
                    Rejected Match:{" "}
                    <strong>{snap.avgRejectedMatchPct ?? "—"}%</strong>
                  </span>
                </div>
                {snap.topMissingCriteria.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {snap.topMissingCriteria.map((mc) => (
                      <span
                        key={mc.unmatchedKey}
                        className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                      >
                        Missing: {mc.unmatchedKey} ({mc.missCount})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
