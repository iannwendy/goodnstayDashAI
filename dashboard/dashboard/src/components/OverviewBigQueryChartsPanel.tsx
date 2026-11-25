import { useEffect, useState } from "react";
import {
  Database,
  RefreshCw,
  Cpu,
  Image as ImageIcon,
  Smartphone,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
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
import type { AppLocale, DateRangeKey } from "@/data";
import type { PropertyFilterKey } from "@/services/overviewAnalytics";
import {
  fetchBigQueryViewport,
  type BigQueryViewportPayload,
} from "@/services/bigQueryApiService";

interface OverviewBigQueryChartsPanelProps {
  activeUserId: string;
  propertyKey: PropertyFilterKey;
  periodKey: DateRangeKey;
  locale: AppLocale;
  onOpenBigQueryInspector: () => void;
}

function formatBytesShort(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getPanelCopy(locale: AppLocale) {
  if (locale === "en") {
    return {
      sectionTitle: "BigQuery Live · GA4 Behavior & CTO 3-Chart Suite",
      sectionSubtitle:
        "Queried live from Google Cloud BigQuery (aevo-512307) through the 6-layer cost-guarded BFF, strictly scoped to your authorized branch_id.",
      refreshBtn: "Refresh",
      openInspectorBtn: "Cost Guard & 403 Test",
      loadingText: "Querying live BigQuery charts...",
      lensOffer: "Offer Funnel (Viewed → Selected → %)",
      lensForm: "Search Demand (Form View → Submit → %)",
      chartInput: "1. Daily Input",
      chartOutput: "2. Daily Output",
      chartRatio: "3. Conversion Ratio (0%–100%)",
      funnelTitle: "8-Step GA4 Behavioral Funnel",
      mediaTitle: "5-Category Gallery Clicks (Image vs. Video)",
      deviceTitle: "Paid Conversion by Device OS",
      aiStripTitle: "BigQuery AI Win vs. Loss Snapshot",
      catLabels: {
        rooms: "Rooms",
        facilities: "Facilities",
        property_views: "Grounds",
        dining: "Dining",
        nearby_attractions: "Nearby",
      },
    };
  }
  if (locale === "ko") {
    return {
      sectionTitle: "BigQuery 라이브 · GA4 행동 퍼널 및 CTO 3종 차트",
      sectionSubtitle:
        "6단계 비용 보호 BFF를 통해 Google Cloud BigQuery(aevo-512307)에서 허용된 branch_id 범위만 실시간 조회합니다.",
      refreshBtn: "새로고침",
      openInspectorBtn: "비용 가드 · 403 검증",
      loadingText: "BigQuery 실시간 차트를 불러오는 중...",
      lensOffer: "제안 퍼널 (고유 조회 → 선택 → %)",
      lensForm: "검색 수요 (폼 조회 → 제출 → %)",
      chartInput: "1. 일별 유입",
      chartOutput: "2. 일별 완료",
      chartRatio: "3. 전환율 (0%–100%)",
      funnelTitle: "GA4 8단계 행동 퍼널",
      mediaTitle: "5개 영역 미디어 클릭 (이미지 vs 동영상)",
      deviceTitle: "기기 OS별 결제 전환율",
      aiStripTitle: "BigQuery AI 낙찰/실패 요약",
      catLabels: {
        rooms: "객실",
        facilities: "부대시설",
        property_views: "외관",
        dining: "다이닝",
        nearby_attractions: "주변",
      },
    };
  }
  return {
    sectionTitle: "Biểu Đồ BigQuery Live · Phễu GA4 & Bộ 3 Biểu Đồ CTO",
    sectionSubtitle:
      "Truy vấn trực tiếp từ Google Cloud BigQuery (aevo-512307) qua BFF khóa chi phí 6 lớp, tự động lọc cứng theo quyền chi nhánh đang xem.",
    refreshBtn: "Làm mới",
    openInspectorBtn: "Chi phí & Test 403",
    loadingText: "Đang tải biểu đồ trực tiếp từ BigQuery...",
    lensOffer: "Hiệu suất chào giá (Xem duy nhất → Chọn → %)",
    lensForm: "Nhu cầu tìm phòng (Mở form → Gửi yêu cầu → %)",
    chartInput: "1. Lượng đầu vào theo ngày",
    chartOutput: "2. Lượng đầu ra theo ngày",
    chartRatio: "3. Tỷ lệ chuyển đổi (0%–100%)",
    funnelTitle: "Phễu Hành Vi GA4 8 Bước",
    mediaTitle: "Tương Tác 5 Nhóm Ảnh & Video Gallery",
    deviceTitle: "Tỷ Lệ Chốt Đơn Theo Thiết Bị (OS)",
    aiStripTitle: "Tóm Tắt Chẩn Đoán AI BigQuery (Trúng vs. Rớt Thầu)",
    catLabels: {
      rooms: "Phòng",
      facilities: "Tiện ích",
      property_views: "Ngoại cảnh",
      dining: "Ẩm thực",
      nearby_attractions: "Gần đó",
    },
  };
}

export function OverviewBigQueryChartsPanel({
  activeUserId,
  propertyKey,
  periodKey,
  locale,
  onOpenBigQueryInspector,
}: OverviewBigQueryChartsPanelProps) {
  const t = getPanelCopy(locale);
  const [payload, setPayload] = useState<BigQueryViewportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ctoLens, setCtoLens] = useState<"offer_funnel" | "booking_form">(
    "offer_funnel",
  );

  const loadViewport = async (forceRefresh = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchBigQueryViewport({
        userId: activeUserId,
        branchId: propertyKey,
        period: periodKey,
        forceRefresh,
      });
      setPayload(res);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Unable to load BigQuery charts.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Strictly primitive dependencies to guarantee 1 single fetch per (user, branch, period) change
  useEffect(() => {
    void loadViewport(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, propertyKey, periodKey]);

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

  return (
    <section
      data-testid="overview-bigquery-charts-section"
      className="rounded-2xl border border-indigo-200/90 bg-gradient-to-b from-[#F8FAFF] to-white p-4 sm:p-6 shadow-[0_1px_4px_rgba(79,70,229,0.06)] space-y-5 min-w-0"
    >
      {/* Section Header + Live Telemetry Strip + Actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </span>
            <h2 className="text-[16.5px] sm:text-[18px] font-bold text-slate-900 m-0">
              {t.sectionTitle}
            </h2>
            <span
              data-testid="overview-bq-live-pill"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {tel?.projectId ?? "aevo-512307"} · {tel?.location ?? "US"}
            </span>
          </div>
          <p className="text-[12.5px] text-slate-600 m-0">
            {t.sectionSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          {tel && (
            <span
              data-testid="overview-bq-telemetry"
              className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-mono text-slate-700 max-w-full"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{tel.queryDurationMs}ms</span>
              <span>·</span>
              <span>{formatBytesShort(tel.totalBytesBilled)} billed</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">
                {tel.bffCacheHit
                  ? "TTL Cache"
                  : tel.bqCacheHit
                    ? "BQ Cache ($0)"
                    : `$${tel.estimatedCostUsd.toFixed(6)}`}
              </span>
            </span>
          )}

          <button
            type="button"
            data-testid="overview-bq-refresh-btn"
            disabled={loading}
            onClick={() => void loadViewport(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>{t.refreshBtn}</span>
          </button>

          <button
            type="button"
            data-testid="overview-bq-open-inspector-btn"
            onClick={onOpenBigQueryInspector}
            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-indigo-700 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.openInspectorBtn}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Applied SQL RBAC Filter Bar */}
      {tel?.appliedFilterSummary && (
        <div
          data-testid="overview-bq-sql-scope"
          className="rounded-lg bg-slate-900 text-sky-200 px-3 py-2 text-[11.5px] font-mono overflow-x-auto"
        >
          SQL Scope ({payload?.rbacContext.userId}): WHERE{" "}
          {tel.appliedFilterSummary}
        </div>
      )}

      {errorMsg && !payload && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-900">
          {errorMsg}
        </div>
      )}

      {loading && !payload && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-[13px] text-slate-500">
          {t.loadingText}
        </div>
      )}

      {payload && (
        <>
          {/* CTO Lens Switcher + 3-Chart Daily Suite (Strictly Bounded 0% - 100%) */}
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap max-w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
                <button
                  type="button"
                  data-testid="overview-cto-lens-offer"
                  onClick={() => setCtoLens("offer_funnel")}
                  className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-colors text-left ${
                    ctoLens === "offer_funnel"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  {t.lensOffer}
                </button>
                <button
                  type="button"
                  data-testid="overview-cto-lens-form"
                  onClick={() => setCtoLens("booking_form")}
                  className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold transition-colors text-left ${
                    ctoLens === "booking_form"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600"
                  }`}
                >
                  {t.lensForm}
                </button>
              </div>
            </div>

            <div
              data-testid="overview-bq-cto-3charts"
              className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0"
            >
              {/* Chart 1: Daily Input */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 min-w-0">
                <div className="text-[12.5px] font-bold text-slate-800 mb-2">
                  {t.chartInput}
                </div>
                <div className="h-[185px] w-full min-w-0">
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
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 min-w-0">
                <div className="text-[12.5px] font-bold text-slate-800 mb-2">
                  {t.chartOutput}
                </div>
                <div className="h-[185px] w-full min-w-0">
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

              {/* Chart 3: Conversion Ratio (0..100%) */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 min-w-0">
                <div className="text-[12.5px] font-bold text-slate-800 mb-2">
                  {t.chartRatio}
                </div>
                <div className="h-[185px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={ctoSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="dateShort" tick={{ fontSize: 10 }} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        width={34}
                      />
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
          </div>

          {/* 8-Step GA4 Funnel + 5-Category Media + Device OS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            <div
              data-testid="overview-bq-funnel"
              className="rounded-xl border border-slate-200/90 bg-white p-4 space-y-2.5 min-w-0"
            >
              <h3 className="text-[13.5px] font-bold text-slate-900 m-0">
                {t.funnelTitle}
              </h3>
              <div className="space-y-2">
                {payload.funnel8Steps.map((st) => {
                  const label =
                    locale === "vi"
                      ? st.labelVi
                      : locale === "ko"
                        ? st.labelKo
                        : st.labelEn;
                  const barWidth = Math.max(
                    4,
                    Math.min(100, st.conversionFromStartPct),
                  );
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
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 min-w-0">
              <div
                data-testid="overview-bq-media"
                className="rounded-xl border border-slate-200/90 bg-white p-4 min-w-0"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h3 className="text-[13.5px] font-bold text-slate-900 m-0">
                    {t.mediaTitle}
                  </h3>
                </div>
                <div className="h-[175px] w-full min-w-0">
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
                        stackId="m"
                        fill="#4F46E5"
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey="video"
                        stackId="m"
                        fill="#0EA5E9"
                        radius={[4, 4, 0, 0]}
                        isAnimationActive={false}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                data-testid="overview-bq-devices"
                className="rounded-xl border border-slate-200/90 bg-white p-4 min-w-0"
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h3 className="text-[13.5px] font-bold text-slate-900 m-0">
                    {t.deviceTitle}
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {payload.deviceBreakdown.map((dev) => (
                    <div
                      key={dev.deviceOs}
                      className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 text-center min-w-0"
                    >
                      <div className="text-[11px] font-bold uppercase text-slate-500">
                        {dev.deviceOs}
                      </div>
                      <div className="text-[16px] font-bold text-slate-900 tabular mt-0.5">
                        {dev.conversionRatePct}%
                      </div>
                      <div className="text-[11px] text-slate-500 tabular">
                        {dev.paidBookingsCount} / {dev.requestsCount}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Compact AI Win vs Loss Strip from BigQuery Gold Mart */}
          {payload.aiSnapshots.length > 0 && (
            <div className="rounded-xl border border-indigo-100 bg-white p-3.5 space-y-2 min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-[13px] font-bold text-slate-900">
                  {t.aiStripTitle}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {payload.aiSnapshots.map((snap) => (
                  <div
                    key={snap.branchId}
                    className="rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-[12px] flex flex-wrap items-center justify-between gap-2 min-w-0"
                  >
                    <span className="font-mono font-bold text-indigo-700">
                      {snap.branchId}
                    </span>
                    <span className="text-slate-700 tabular">
                      Won <strong>{snap.wonBids30d}</strong>/{snap.totalBids30d} ·
                      Match <strong>{snap.avgWonMatchPct ?? "—"}%</strong> ·
                      Save <strong>-{snap.avgWonSavingPct ?? "—"}%</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
