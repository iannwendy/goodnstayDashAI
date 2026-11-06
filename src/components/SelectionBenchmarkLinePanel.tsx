import { useMemo, useState } from "react";
import { RotateCcw, TrendingUp, SlidersHorizontal } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  formatCompactVnd,
  formatFullVnd,
  type BranchFilter,
  type DateRangeKey,
  type MasterDataBundle,
} from "@/data";
import {
  computeBenchmarkTrendSeries,
  type BenchmarkBidModeFilter,
  type BenchmarkLineFilters,
  type BenchmarkMetricMode,
  type BenchmarkPriceFilter,
  type BenchmarkRoomFilter,
  type BenchmarkTimeSlotFilter,
  type BenchmarkTrendPoint,
} from "@/services/analyticsEngine";

interface SelectionBenchmarkLinePanelProps {
  bundle: MasterDataBundle;
  dateRange: DateRangeKey;
  branchFilter?: BranchFilter;
  rangeText: string;
  onOpenMarketShare: () => void;
}

const DEFAULT_FILTERS: BenchmarkLineFilters = {
  roomClass: "all",
  pricePosition: "all",
  bidMode: "all",
  timeSlot: "all",
};

function formatAxisK(valK: number): string {
  if (valK >= 1000) {
    const m = valK / 1000;
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  return `${Math.round(valK)}k`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload?: BenchmarkTrendPoint }[];
  metricMode: BenchmarkMetricMode;
}

function BenchmarkCustomTooltip({
  active,
  payload,
  metricMode,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const hasHotelData = point.bids > 0;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/95 backdrop-blur-xs p-3 shadow-lg text-xs space-y-2 min-w-[225px]">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-1.5">
        <span className="font-semibold text-zinc-900">{point.fullLabel}</span>
        <span className="font-mono text-[11px] text-zinc-500">
          {hasHotelData ? `${point.wins}/${point.bids} đơn` : "0 phiên"}
        </span>
      </div>

      {metricMode === "win_rate" ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              KS của bạn:
            </span>
            <strong className="font-mono text-emerald-600">
              {point.hotelWinPct !== null
                ? `${point.hotelWinPct}%`
                : "Chưa có phiên"}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-slate-400" />
              TB toàn sàn:
            </span>
            <span className="font-mono font-medium text-zinc-700">
              {point.sysWinPct}%
            </span>
          </div>
          {point.deltaWinPct !== null && (
            <div className="pt-1 border-t border-zinc-100 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-zinc-400">Hiệu suất mốc này:</span>
              <span
                className={`font-mono font-semibold ${
                  point.deltaWinPct >= 0 ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {point.deltaWinPct >= 0
                  ? `+${point.deltaWinPct}% vượt sàn`
                  : `${point.deltaWinPct}% vs sàn`}
              </span>
            </div>
          )}
          {point.hotelAvgBasePrice !== null && (
            <div className="text-[11px] text-zinc-500 flex items-center justify-between gap-2">
              <span>Giá gốc chào TB:</span>
              <span className="font-mono text-zinc-700">
                {formatCompactVnd(point.hotelAvgBasePrice)} (sàn{" "}
                {formatCompactVnd(point.sysAvgBasePrice)})
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Giá chào KS:
            </span>
            <strong className="font-mono text-emerald-600">
              {point.hotelAvgBasePrice !== null
                ? formatFullVnd(point.hotelAvgBasePrice)
                : "Chưa có phiên"}
            </strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <span className="w-2.5 h-0.5 border-t-2 border-dashed border-slate-400" />
              Giá TB toàn sàn:
            </span>
            <span className="font-mono font-medium text-zinc-700">
              {formatFullVnd(point.sysAvgBasePrice)}
            </span>
          </div>
          {point.deltaPriceVnd !== null && (
            <div className="pt-1 border-t border-zinc-100 flex items-center justify-between gap-2 text-[11px]">
              <span className="text-zinc-400">Vị thế giá gốc:</span>
              <span
                className={`font-mono font-semibold ${
                  point.deltaPriceVnd <= 0
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {point.deltaPriceVnd <= 0 ? "" : "+"}
                {Math.round(point.deltaPriceVnd / 1000)}k vs sàn
              </span>
            </div>
          )}
          {point.hotelWinPct !== null && (
            <div className="text-[11px] text-zinc-500 flex items-center justify-between gap-2">
              <span>Tỷ lệ được chọn:</span>
              <span className="font-mono text-zinc-700">
                {point.hotelWinPct}% vs {point.sysWinPct}% sàn
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SelectionBenchmarkLinePanel({
  bundle,
  dateRange,
  branchFilter = "all",
  rangeText,
  onOpenMarketShare,
}: SelectionBenchmarkLinePanelProps) {
  const [metricMode, setMetricMode] = useState<BenchmarkMetricMode>("win_rate");
  const [filters, setFilters] = useState<BenchmarkLineFilters>(DEFAULT_FILTERS);

  const trend = useMemo(
    () => computeBenchmarkTrendSeries(bundle, dateRange, filters, branchFilter),
    [bundle, dateRange, filters, branchFilter],
  );

  const priceAxisDomain = useMemo<[number, number]>(() => {
    const vals: number[] = [];
    trend.points.forEach((p) => {
      vals.push(p.sysAvgBasePriceK);
      if (p.hotelAvgBasePriceK !== null) {
        vals.push(p.hotelAvgBasePriceK);
      }
    });
    if (vals.length === 0) return [600, 2200];
    const minVal = Math.min(...vals);
    const maxVal = Math.max(...vals);
    const lower = Math.max(400, Math.floor((minVal - 120) / 100) * 100);
    const upper = Math.ceil((maxVal + 120) / 100) * 100;
    return [lower, Math.max(lower + 300, upper)];
  }, [trend.points]);

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const getSelectClass = (isActive: boolean) =>
    `h-7 px-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-full truncate ${
      isActive
        ? "border-emerald-300 bg-emerald-50/80 text-emerald-800"
        : "border-zinc-200/90 bg-zinc-50/70 hover:bg-zinc-100/80 text-zinc-700"
    }`;

  const regionName = bundle.systemBenchmarks.regionName;

  return (
    <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-3.5">
      {/* 1. Header + Metric Mode Toggle */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {metricMode === "win_rate"
                  ? "Tỷ lệ được chọn: KS của bạn vs. TB toàn sàn"
                  : "Giá gốc chào TB: KS của bạn vs. TB toàn sàn"}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Kỳ {rangeText} · {trend.bucketUnitLabel} ·{" "}
              {metricMode === "win_rate"
                ? "Đơn TT 100% ÷ Phiên báo giá"
                : "Giá gốc chào 1 đêm (0% phí KS)"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label="Chế độ chỉ số đối sánh"
              className="inline-flex items-center bg-zinc-100 p-0.5 rounded-lg"
            >
              <button
                type="button"
                onClick={() => setMetricMode("win_rate")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  metricMode === "win_rate"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Tỷ lệ chọn (%)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode("base_price")}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  metricMode === "base_price"
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                Giá chào (VNĐ)
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenMarketShare}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer whitespace-nowrap"
            >
              Chi tiết thị phần →
            </button>
          </div>
        </div>

        {/* 2. Multi-Dimensional Filter Bar (Loại phòng · Mức giá · Phương thức · Khung giờ) */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 pt-0.5">
          <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-zinc-400 mr-0.5">
            <SlidersHorizontal className="w-3 h-3" />
            Lọc:
          </span>

          <select
            aria-label="Lọc hạng phòng"
            value={filters.roomClass}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                roomClass: e.target.value as BenchmarkRoomFilter,
              }))
            }
            className={getSelectClass(filters.roomClass !== "all")}
          >
            <option value="all">Loại: Tất cả hạng</option>
            {bundle.roomClasses.map((rc) => (
              <option key={rc.id} value={rc.id}>
                Loại: {rc.category}
              </option>
            ))}
          </select>

          <select
            aria-label="Lọc mức giá"
            value={filters.pricePosition}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                pricePosition: e.target.value as BenchmarkPriceFilter,
              }))
            }
            className={getSelectClass(filters.pricePosition !== "all")}
          >
            <option value="all">Giá: Tất cả mức giá</option>
            <option value="competitive">Giá: ≤ TB sàn (Cạnh tranh)</option>
            <option value="near_market">Giá: Sát sàn (+1%..+5%)</option>
            <option value="above_market">Giá: Cao hơn sàn (&gt; +5%)</option>
          </select>

          <select
            aria-label="Lọc phương thức báo giá"
            value={filters.bidMode}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                bidMode: e.target.value as BenchmarkBidModeFilter,
              }))
            }
            className={getSelectClass(filters.bidMode !== "all")}
          >
            <option value="all">P.thức: Tất cả</option>
            <option value="auto">P.thức: AI Auto-Bid</option>
            <option value="manual">P.thức: Duyệt tay</option>
          </select>

          <select
            aria-label="Lọc khung giờ"
            value={filters.timeSlot}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                timeSlot: e.target.value as BenchmarkTimeSlotFilter,
              }))
            }
            className={getSelectClass(filters.timeSlot !== "all")}
          >
            <option value="all">Giờ: Tất cả khung</option>
            <option value="evening_peak">Giờ: Tối (18–22h)</option>
            <option value="lunch_peak">Giờ: Trưa (11–13h30)</option>
            <option value="off_peak">Giờ: Khung khác</option>
          </select>

          {trend.activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 h-7 px-2 rounded-lg text-[11px] font-medium text-rose-600 hover:text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Đặt lại ({trend.activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* 3. Custom Legend + Dual-Line Chart */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-0.5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
              <span className="w-3 h-0.5 bg-emerald-500 rounded-full relative flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </span>
              KS của bạn (
              {metricMode === "win_rate" ? "Tỷ lệ chọn %" : "Giá gốc chào"})
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-500">
              <span className="w-3.5 h-0 border-t-2 border-dashed border-slate-400" />
              TB toàn sàn {regionName}
            </span>
          </div>
          <span className="font-mono text-zinc-400">
            Mẫu lọc: {trend.totalWins}/{trend.totalBids} phiên thắng
          </span>
        </div>

        <div className="relative h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {metricMode === "win_rate" ? (
              <ComposedChart
                data={trend.points}
                margin={{ left: -12, right: 10, top: 8, bottom: 2 }}
              >
                <defs>
                  <linearGradient
                    id="gnsHotelWinFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f4f4f5"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<BenchmarkCustomTooltip metricMode="win_rate" />}
                />
                <Area
                  type="monotone"
                  dataKey="hotelWinPct"
                  fill="url(#gnsHotelWinFill)"
                  stroke="none"
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="sysWinPct"
                  name="TB toàn sàn (%)"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2.5, fill: "#94a3b8", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#64748b", stroke: "#fff", strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="hotelWinPct"
                  name="KS của bạn (%)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  connectNulls
                  dot={{
                    r: 3.5,
                    fill: "#10b981",
                    stroke: "#ffffff",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: "#059669",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            ) : (
              <ComposedChart
                data={trend.points}
                margin={{ left: -8, right: 10, top: 8, bottom: 2 }}
              >
                <defs>
                  <linearGradient
                    id="gnsHotelPriceFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f4f4f5"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={priceAxisDomain}
                  tickFormatter={formatAxisK}
                  tick={{ fontSize: 11, fill: "#71717a" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<BenchmarkCustomTooltip metricMode="base_price" />}
                />
                <Area
                  type="monotone"
                  dataKey="hotelAvgBasePriceK"
                  fill="url(#gnsHotelPriceFill)"
                  stroke="none"
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="sysAvgBasePriceK"
                  name="Giá TB toàn sàn"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 2.5, fill: "#94a3b8", strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: "#64748b", stroke: "#fff", strokeWidth: 1.5 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="hotelAvgBasePriceK"
                  name="Giá chào KS của bạn"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  connectNulls
                  dot={{
                    r: 3.5,
                    fill: "#10b981",
                    stroke: "#ffffff",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 5,
                    fill: "#059669",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>

          {trend.totalBids === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-xl p-4">
              <div className="text-center space-y-2 max-w-xs">
                <div className="text-xs font-medium text-zinc-700">
                  Chưa có phiên báo giá khớp tổ hợp bộ lọc này trong kỳ{" "}
                  <span className="font-mono">{rangeText}</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  Đường nét đứt thể hiện mức chuẩn TB toàn sàn (
                  <span className="font-mono font-semibold text-zinc-700">
                    {metricMode === "win_rate"
                      ? `${trend.sysAvgWinPct}%`
                      : formatCompactVnd(trend.sysAvgBasePrice)}
                  </span>
                  ).
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Xóa bộ lọc để xem toàn bộ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Dynamic 4-Column Benchmark Summary Footer */}
      <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400 truncate">
            Của bạn ({trend.scopeLabel})
          </div>
          <div className="text-xs font-mono font-semibold text-emerald-600">
            {metricMode === "win_rate" ? (
              trend.hotelWinPct !== null ? (
                <>
                  {trend.hotelWinPct}%{" "}
                  <span className="font-normal text-zinc-400">
                    ({trend.totalWins}/{trend.totalBids})
                  </span>
                </>
              ) : (
                <span className="text-zinc-400">— (0 phiên)</span>
              )
            ) : trend.hotelAvgBasePrice !== null ? (
              <>
                {formatCompactVnd(trend.hotelAvgBasePrice)}đ{" "}
                <span className="font-normal text-zinc-400">/đêm</span>
              </>
            ) : (
              <span className="text-zinc-400">— (0 phiên)</span>
            )}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400 truncate">
            TB toàn sàn {regionName}
          </div>
          <div className="text-xs font-mono font-semibold text-zinc-700">
            {metricMode === "win_rate" ? (
              <>
                {trend.sysAvgWinPct}%{" "}
                <span className="font-normal text-zinc-400">chuẩn</span>
              </>
            ) : (
              <>
                {formatCompactVnd(trend.sysAvgBasePrice)}đ{" "}
                <span className="font-normal text-zinc-400">/đêm</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400 truncate">
            So với toàn sàn
          </div>
          <div className="text-xs font-mono font-semibold">
            {metricMode === "win_rate" ? (
              trend.deltaWinPct !== null ? (
                <span
                  className={
                    trend.deltaWinPct >= 0
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }
                >
                  {trend.deltaWinPct >= 0
                    ? `+${trend.deltaWinPct}%`
                    : `${trend.deltaWinPct}%`}{" "}
                  <span className="font-normal text-zinc-400">
                    {trend.deltaWinPct >= 0 ? "vượt sàn" : "dưới sàn"}
                  </span>
                </span>
              ) : (
                <span className="text-zinc-400">—</span>
              )
            ) : trend.deltaPriceVnd !== null ? (
              <span
                className={
                  trend.deltaPriceVnd <= 0
                    ? "text-emerald-600"
                    : "text-amber-600"
                }
              >
                {trend.deltaPriceVnd <= 0 ? "" : "+"}
                {Math.round(trend.deltaPriceVnd / 1000)}k{" "}
                <span className="font-normal text-zinc-400">
                  {trend.deltaPriceVnd <= 0 ? "cạnh tranh" : "cao hơn"}
                </span>
              </span>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </div>
        </div>

        <div className="space-y-0.5">
          <div className="text-[11px] text-zinc-400 truncate">
            {metricMode === "win_rate"
              ? "Giá chào TB · Thị phần"
              : "Tỷ lệ chọn · Thị phần"}
          </div>
          <div className="text-xs font-mono font-semibold text-zinc-800 truncate">
            {metricMode === "win_rate" ? (
              <>
                {trend.hotelAvgBasePrice !== null
                  ? formatCompactVnd(trend.hotelAvgBasePrice)
                  : "—"}{" "}
                <span className="font-normal text-zinc-400">
                  · TP {trend.regionSharePct}%
                </span>
              </>
            ) : (
              <>
                {trend.hotelWinPct !== null ? `${trend.hotelWinPct}%` : "—"}{" "}
                <span className="font-normal text-zinc-400">
                  · TP {trend.regionSharePct}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
