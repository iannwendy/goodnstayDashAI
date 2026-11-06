import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CalendarCheck2,
  Gavel,
  Trophy,
  UserCheck,
  DoorOpen,
  ShieldCheck,
  Sparkles,
  Zap,
  Building2,
  BedDouble,
  Info,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatCompactVnd,
  formatFullVnd,
  type BranchFilter,
  type DailyRoomCell,
  type DateRangeKey,
  type KpiType,
  type HotelProfileMaster,
} from "@/data";
import {
  buildRevenueTimeSeries,
  type ComputedDashboardAnalytics,
} from "@/services/analyticsEngine";
import {
  RoomScheduleExplorer,
  type ExplorerStatusFilter,
  type ExplorerViewMode,
} from "@/components/RoomScheduleExplorer";
import { PaymentConversionFunnelPanel } from "@/components/PaymentConversionFunnelPanel";

type RevenueScopeTab = "all_rooms" | "by_room" | "by_branch";

interface KpiDrilldownModalProps {
  activeKpi: KpiType | null;
  onClose: () => void;
  hotelProfile: HotelProfileMaster;
  analytics: ComputedDashboardAnalytics;
  dateRange: DateRangeKey;
  onChangeDateRange: (range: DateRangeKey) => void;
  branchFilter: BranchFilter;
  onChangeBranchFilter: (branch: BranchFilter) => void;
  nightFlashSaleActive: boolean;
  onActivateNightFlashSale: () => void;
  onSwitchToAiTab: () => void;
  onToggleRoomLock: (dayOffset: number, cell: DailyRoomCell) => void;
  selectedDayOffset: number;
  onSelectDayOffset: (dayOffset: number) => void;
  explorerViewMode: ExplorerViewMode;
  onChangeExplorerViewMode: (mode: ExplorerViewMode) => void;
  explorerStatusFilter: ExplorerStatusFilter;
  onChangeExplorerStatusFilter: (filter: ExplorerStatusFilter) => void;
  explorerClassFilter: string;
  onChangeExplorerClassFilter: (classId: string) => void;
  selectedRoomNum: number;
  onSelectRoomNum: (roomNumber: number) => void;
}

export function KpiDrilldownModal({
  activeKpi,
  onClose,
  hotelProfile,
  analytics,
  dateRange,
  onChangeDateRange,
  branchFilter,
  onChangeBranchFilter,
  nightFlashSaleActive,
  onActivateNightFlashSale,
  onSwitchToAiTab,
  onToggleRoomLock,
  selectedDayOffset,
  onSelectDayOffset,
  explorerViewMode,
  onChangeExplorerViewMode,
  explorerStatusFilter,
  onChangeExplorerStatusFilter,
  explorerClassFilter,
  onChangeExplorerClassFilter,
  selectedRoomNum,
  onSelectRoomNum,
}: KpiDrilldownModalProps) {
  const { periodMetrics, vacantCount, dailyRoomSchedules } = analytics;

  // Revenue drilldown local UI state
  const [revenueScopeTab, setRevenueScopeTab] =
    useState<RevenueScopeTab>("all_rooms");
  const [selectedSingleRoom, setSelectedSingleRoom] = useState<number | "all">(
    "all",
  );
  const [roomClassFilter, setRoomClassFilter] = useState<string>("all");
  const [onlyRoomsWithRevenue, setOnlyRoomsWithRevenue] =
    useState<boolean>(false);
  const [monthGranularity, setMonthGranularity] = useState<"weekly" | "daily">(
    "weekly",
  );

  // If branch changes and the selected single room is not in that branch, reset to "all"
  useEffect(() => {
    if (selectedSingleRoom === "all") return;
    const existsInScope = periodMetrics.roomRevenues.some(
      (r) => r.roomNumber === selectedSingleRoom,
    );
    if (!existsInScope) {
      setSelectedSingleRoom("all");
    }
  }, [branchFilter, periodMetrics.roomRevenues, selectedSingleRoom]);

  const focusedSingleRoomSummary = useMemo(() => {
    if (selectedSingleRoom === "all") return null;
    return (
      periodMetrics.roomRevenues.find(
        (r) => r.roomNumber === selectedSingleRoom,
      ) ?? null
    );
  }, [periodMetrics.roomRevenues, selectedSingleRoom]);

  const scopedOrders = useMemo(() => {
    if (focusedSingleRoomSummary) {
      return focusedSingleRoomSummary.orders;
    }
    return periodMetrics.periodOrders;
  }, [focusedSingleRoomSummary, periodMetrics.periodOrders]);

  const scopedRevenue = focusedSingleRoomSummary
    ? focusedSingleRoomSummary.revenue
    : periodMetrics.baseRevenue;
  const scopedOrdersCount = focusedSingleRoomSummary
    ? focusedSingleRoomSummary.ordersCount
    : periodMetrics.paidWonCount;
  const scopedNightsCount = focusedSingleRoomSummary
    ? focusedSingleRoomSummary.nightsCount
    : periodMetrics.roomNightsSold;
  const scopedAdr = focusedSingleRoomSummary
    ? focusedSingleRoomSummary.adr
    : periodMetrics.periodBaseAdr;

  const activeTimeSeries = useMemo(() => {
    if (!focusedSingleRoomSummary) {
      return dateRange === "30d" && monthGranularity === "daily"
        ? periodMetrics.timeBucketsDaily
        : periodMetrics.timeBucketsPrimary;
    }
    return buildRevenueTimeSeries(
      dateRange,
      {
        shortLabel: periodMetrics.shortLabel,
        rangeText: periodMetrics.rangeText,
        startDate: periodMetrics.startDate,
        endDate: periodMetrics.endDate,
        previousNetRevenue: periodMetrics.previousNetRevenue,
        platformWinRatePct: periodMetrics.platformWinRatePct,
      },
      focusedSingleRoomSummary.orders,
      hotelProfile.referenceDate,
      monthGranularity,
    );
  }, [
    dateRange,
    focusedSingleRoomSummary,
    hotelProfile.referenceDate,
    monthGranularity,
    periodMetrics,
  ]);

  const filteredRoomRows = useMemo(() => {
    return periodMetrics.roomRevenues
      .filter((r) => {
        if (roomClassFilter !== "all" && r.roomClassId !== roomClassFilter) {
          return false;
        }
        if (onlyRoomsWithRevenue && r.revenue <= 0) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) => b.revenue - a.revenue || a.roomNumber - b.roomNumber,
      );
  }, [onlyRoomsWithRevenue, periodMetrics.roomRevenues, roomClassFilter]);

  const chainTotalRevenue = useMemo(
    () => periodMetrics.branchRevenues.reduce((s, b) => s + b.revenue, 0),
    [periodMetrics.branchRevenues],
  );

  const activeDaySchedule =
    dailyRoomSchedules.find((d) => d.dayOffset === selectedDayOffset) ??
    dailyRoomSchedules[0];
  const nextDaySchedule = dailyRoomSchedules[activeDaySchedule.dayOffset + 1];
  const activeDayOccupied =
    activeDaySchedule.otherBooked + activeDaySchedule.auctionBooked;
  const activeDayOccPct =
    activeDaySchedule.totalRooms > 0
      ? Math.round((activeDayOccupied / activeDaySchedule.totalRooms) * 100)
      : 0;
  const activeDayCheckoutCount = activeDaySchedule.rooms.filter(
    (r) => r.status !== "vacant_unlocked" && r.checkOutTomorrow,
  ).length;

  const isWideModal =
    activeKpi === "revenue_total" ||
    activeKpi === "rooms_occupied" ||
    activeKpi === "rooms_vacant" ||
    activeKpi === "win_rate";

  const timePeriodLabel =
    dateRange === "today"
      ? "Theo ngày"
      : dateRange === "7d"
        ? "Theo tuần"
        : "Theo tháng";

  return (
    <Dialog open={activeKpi !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`${
          isWideModal ? "sm:max-w-[960px]" : "sm:max-w-2xl"
        } p-5 sm:p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden gap-4`}
      >
        {/* 1. BÁO CÁO DOANH THU ĐƠN GIẢN (THEO NGÀY / TUẦN / THÁNG • TẤT CẢ PHÒNG / TỪNG PHÒNG / TỪNG CHI NHÁNH) */}
        {activeKpi === "revenue_total" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-6">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <DialogTitle className="font-semibold text-base text-zinc-950">
                      Doanh Thu Khách Sạn ({periodMetrics.rangeText})
                    </DialogTitle>
                    <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                      {timePeriodLabel} •{" "}
                      {focusedSingleRoomSummary
                        ? `Phòng #${focusedSingleRoomSummary.roomNumber} (${focusedSingleRoomSummary.roomClassName} · ${focusedSingleRoomSummary.branchName})`
                        : `${analytics.activeBranchLabel} (${analytics.scopedTotalRooms} phòng)`}{" "}
                      {!focusedSingleRoomSummary && (
                        <>
                          • Tăng trưởng{" "}
                          <strong
                            className={
                              periodMetrics.growthPct >= 0
                                ? "text-emerald-700 font-mono"
                                : "text-rose-600 font-mono"
                            }
                          >
                            {periodMetrics.growthPct >= 0
                              ? `+${periodMetrics.growthPct}%`
                              : `${periodMetrics.growthPct}%`}
                          </strong>{" "}
                          so với kỳ trước
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs min-w-0">
              {/* FILTER BAR: THỜI GIAN + CHI NHÁNH + PHẠM VI PHÒNG */}
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Time Filter: Theo ngày / Theo tuần / Theo tháng */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-500 mr-0.5">
                      Kỳ xem:
                    </span>
                    <div
                      data-testid="revenue-time-tabs"
                      className="inline-flex items-center bg-white p-0.5 rounded-lg border border-zinc-200"
                    >
                      {(
                        [
                          ["today", "Theo ngày"],
                          ["7d", "Theo tuần"],
                          ["30d", "Theo tháng"],
                        ] as const
                      ).map(([key, label]) => {
                        const active = dateRange === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onChangeDateRange(key)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                              active
                                ? "bg-zinc-950 text-white shadow-2xs"
                                : "text-zinc-600 hover:text-zinc-950"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Branch Filter: Tất cả chi nhánh / Từng chi nhánh */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-medium text-zinc-500 mr-0.5">
                      Chi nhánh:
                    </span>
                    <div
                      data-testid="revenue-branch-tabs"
                      className="flex flex-wrap items-center bg-white p-0.5 rounded-lg border border-zinc-200 gap-0.5"
                    >
                      <button
                        type="button"
                        onClick={() => onChangeBranchFilter("all")}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                          branchFilter === "all"
                            ? "bg-zinc-950 text-white shadow-2xs"
                            : "text-zinc-600 hover:text-zinc-950"
                        }`}
                      >
                        Tất cả CN
                      </button>
                      {hotelProfile.branches.map((br) => {
                        const active = branchFilter === br.id;
                        return (
                          <button
                            key={br.id}
                            type="button"
                            onClick={() => onChangeBranchFilter(br.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                              active
                                ? "bg-emerald-600 text-white shadow-2xs"
                                : "text-zinc-600 hover:text-zinc-950"
                            }`}
                          >
                            {br.shortName}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Row 2: Scope View Tabs + Direct Single-Room Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/70">
                  <div
                    data-testid="revenue-scope-tabs"
                    className="inline-flex flex-wrap items-center bg-white p-0.5 rounded-lg border border-zinc-200 gap-0.5"
                  >
                    {(
                      [
                        ["all_rooms", "Tất cả phòng"],
                        ["by_room", "Từng phòng"],
                        ["by_branch", "Từng chi nhánh"],
                      ] as const
                    ).map(([tabId, label]) => {
                      const active = revenueScopeTab === tabId;
                      return (
                        <button
                          key={tabId}
                          type="button"
                          onClick={() => {
                            setRevenueScopeTab(tabId);
                            if (tabId !== "by_room") {
                              setSelectedSingleRoom("all");
                            }
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                            active
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Single Room Picker */}
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <label
                      htmlFor="revenue-single-room-select"
                      className="text-[11px] font-medium text-zinc-500 flex items-center gap-1"
                    >
                      <BedDouble className="w-3.5 h-3.5 text-zinc-400" />
                      Chọn phòng:
                    </label>
                    <select
                      id="revenue-single-room-select"
                      data-testid="revenue-room-select"
                      value={
                        selectedSingleRoom === "all"
                          ? "all"
                          : String(selectedSingleRoom)
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "all") {
                          setSelectedSingleRoom("all");
                        } else {
                          setSelectedSingleRoom(Number(val));
                          setRevenueScopeTab("by_room");
                        }
                      }}
                      className="h-7 px-2.5 rounded-lg bg-white border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900/20 max-w-[230px] truncate cursor-pointer"
                    >
                      <option value="all">
                        Tất cả {periodMetrics.roomRevenues.length} phòng
                      </option>
                      {periodMetrics.roomRevenues.map((r) => (
                        <option key={r.roomNumber} value={r.roomNumber}>
                          Phòng #{r.roomNumber} · {r.category} ({r.branchName}) —{" "}
                          {r.revenue > 0 ? formatFullVnd(r.revenue) : "0đ"}
                        </option>
                      ))}
                    </select>

                    {focusedSingleRoomSummary && (
                      <button
                        type="button"
                        onClick={() => setSelectedSingleRoom("all")}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900 text-white text-[11px] font-medium cursor-pointer hover:bg-zinc-800"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Bỏ lọc #{focusedSingleRoomSummary.roomNumber}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3 SIMPLE REVENUE KPI CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-zinc-950 text-white rounded-xl border border-zinc-950">
                  <span className="text-[11px] text-zinc-400 block font-medium">
                    {focusedSingleRoomSummary
                      ? `Doanh thu Phòng #${focusedSingleRoomSummary.roomNumber}`
                      : `Tổng doanh thu (${analytics.activeBranchLabel})`}
                  </span>
                  <span
                    data-testid="revenue-modal-primary-total"
                    className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block"
                  >
                    {formatFullVnd(scopedRevenue)}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {focusedSingleRoomSummary
                      ? `Chiếm ${focusedSingleRoomSummary.sharePct}% doanh thu phạm vi`
                      : `Kỳ trước: ${formatFullVnd(periodMetrics.previousNetRevenue)} (${
                          periodMetrics.growthPct >= 0
                            ? `+${periodMetrics.growthPct}%`
                            : `${periodMetrics.growthPct}%`
                        })`}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] text-zinc-500 block font-medium">
                    Đơn hoàn tất &amp; Đêm phòng
                  </span>
                  <span className="text-lg font-semibold text-zinc-950 font-mono mt-0.5 block">
                    {scopedOrdersCount} đơn · {scopedNightsCount} đêm
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Đơn đã thanh toán 100% trong kỳ
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] text-zinc-500 block font-medium">
                    Giá bình quân / đêm (ADR)
                  </span>
                  <span className="text-lg font-semibold text-zinc-950 font-mono mt-0.5 block">
                    {scopedNightsCount > 0
                      ? `${formatFullVnd(scopedAdr)}/đêm`
                      : "0đ/đêm"}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {scopedNightsCount > 0
                      ? `${formatCompactVnd(scopedRevenue)}đ ÷ ${scopedNightsCount} đêm`
                      : "Chưa phát sinh đêm lưu trú"}
                  </span>
                </div>
              </div>

              {/* TIME-SERIES REVENUE BREAKDOWN (DAY / WEEK / MONTH) */}
              <div className="p-4 rounded-xl bg-white border border-zinc-200 space-y-3 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-zinc-900 text-xs">
                      Biểu đồ doanh thu{" "}
                      {dateRange === "today"
                        ? "theo khung giờ trong ngày"
                        : dateRange === "7d"
                          ? "theo từng ngày trong tuần"
                          : monthGranularity === "weekly"
                            ? "theo từng tuần trong tháng"
                            : "theo 30 ngày trong tháng"}
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      {focusedSingleRoomSummary
                        ? `Phòng #${focusedSingleRoomSummary.roomNumber} · ${focusedSingleRoomSummary.roomClassName} (${focusedSingleRoomSummary.branchName})`
                        : `${analytics.activeBranchLabel} • ${periodMetrics.rangeText}`}
                    </p>
                  </div>

                  {dateRange === "30d" && (
                    <div className="inline-flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/80">
                      <button
                        type="button"
                        onClick={() => setMonthGranularity("weekly")}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                          monthGranularity === "weekly"
                            ? "bg-white text-zinc-950 shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        Gộp theo tuần
                      </button>
                      <button
                        type="button"
                        onClick={() => setMonthGranularity("daily")}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                          monthGranularity === "daily"
                            ? "bg-white text-zinc-950 shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        Theo từng ngày
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-48 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={activeTimeSeries}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                        interval={
                          dateRange === "30d" && monthGranularity === "daily"
                            ? 3
                            : 0
                        }
                      />
                      <YAxis
                        tickFormatter={(val: number) =>
                          val === 0 ? "0" : `${val}tr`
                        }
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                      />
                      <Tooltip
                        formatter={(
                          _val: unknown,
                          _name: unknown,
                          item: {
                            payload?: {
                              revenue?: number;
                              ordersCount?: number;
                              nightsCount?: number;
                            };
                          },
                        ) => {
                          const p = item?.payload;
                          return [
                            `${formatFullVnd(p?.revenue ?? 0)} (${p?.ordersCount ?? 0} đơn · ${p?.nightsCount ?? 0} đêm)`,
                            "Doanh thu",
                          ];
                        }}
                        labelFormatter={(
                          label: unknown,
                          payload?: ReadonlyArray<{
                            payload?: { subLabel?: string };
                          }>,
                        ) => {
                          const sub = payload?.[0]?.payload?.subLabel;
                          return sub ? `${String(label)} (${sub})` : String(label);
                        }}
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid #e4e4e7",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="revenueM" radius={[6, 6, 0, 0]} maxBarSize={44}>
                        {activeTimeSeries.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.revenueVnd > 0 ? "#059669" : "#e4e4e7"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ================================================================= */}
              {/* TAB 1: TẤT CẢ PHÒNG (THEO HẠNG PHÒNG + TỔNG QUAN CHI NHÁNH + ĐƠN) */}
              {/* ================================================================= */}
              {revenueScopeTab === "all_rooms" && (
                <div className="space-y-4 min-w-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 min-w-0">
                    {/* Breakdown by Room Class */}
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                          Doanh Thu Theo Hạng Phòng
                        </h4>
                        <span className="text-[11px] text-zinc-400 font-mono">
                          {periodMetrics.paidWonCount} đơn
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {periodMetrics.roomClassRevenueShares.map((item) => (
                          <div key={item.roomClassId}>
                            <div className="flex justify-between gap-2 text-zinc-600 mb-1">
                              <span className="truncate">
                                {item.roomClassName} ({item.wonSessionsCount} đơn
                                · {item.roomNightsCount} đêm)
                              </span>
                              <span className="font-semibold text-zinc-950 font-mono shrink-0">
                                {formatFullVnd(item.baseRevenue)} ({item.sharePct}
                                %)
                              </span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-2">
                              <div
                                className={`${item.barColorClass} h-2 rounded-full transition-all`}
                                style={{ width: `${item.sharePct}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Branch Comparison */}
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                          Doanh Thu Theo Chi Nhánh
                        </h4>
                        <button
                          type="button"
                          onClick={() => setRevenueScopeTab("by_branch")}
                          className="text-[11px] text-emerald-700 hover:underline font-medium cursor-pointer"
                        >
                          Chi tiết 3 chi nhánh &rarr;
                        </button>
                      </div>
                      <div className="space-y-2.5">
                        {periodMetrics.branchRevenues.map((br) => {
                          const isCurrentBranch = branchFilter === br.branchId;
                          return (
                            <button
                              key={br.branchId}
                              type="button"
                              onClick={() =>
                                onChangeBranchFilter(
                                  isCurrentBranch ? "all" : br.branchId,
                                )
                              }
                              className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer ${
                                isCurrentBranch
                                  ? "bg-emerald-50/70 border-emerald-300"
                                  : "bg-zinc-50/60 border-zinc-200/70 hover:border-zinc-300"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-medium text-zinc-900 flex items-center gap-1.5 truncate">
                                  <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                  {br.shortName}
                                  <span className="text-[10px] text-zinc-400 font-normal">
                                    ({br.ordersCount} đơn · {br.nightsCount} đêm)
                                  </span>
                                </span>
                                <span className="font-mono font-semibold text-zinc-950 shrink-0">
                                  {formatFullVnd(br.revenue)} ({br.sharePct}%)
                                </span>
                              </div>
                              <div className="w-full bg-zinc-200/70 rounded-full h-1.5">
                                <div
                                  className="bg-emerald-600 h-1.5 rounded-full transition-all"
                                  style={{ width: `${br.sharePct}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 2: DOANH THU TỪNG PHÒNG (#101 - #130)                         */}
              {/* ================================================================= */}
              {revenueScopeTab === "by_room" && (
                <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          ["all", "Tất cả hạng"],
                          ["sup", "Superior"],
                          ["dlx", "Deluxe"],
                          ["fsuite", "Suite"],
                          ["osuite", "Executive"],
                        ] as const
                      ).map(([cid, label]) => (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setRoomClassFilter(cid)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                            roomClassFilter === cid
                              ? "bg-zinc-900 text-white"
                              : "bg-zinc-100 text-zinc-600 hover:text-zinc-950"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={onlyRoomsWithRevenue}
                        onChange={(e) =>
                          setOnlyRoomsWithRevenue(e.target.checked)
                        }
                        className="rounded border-zinc-300 accent-zinc-900"
                      />
                      Chỉ phòng phát sinh doanh thu
                    </label>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-zinc-200/80 rounded-xl divide-y divide-zinc-100">
                    {filteredRoomRows.length === 0 ? (
                      <div className="p-6 text-center text-zinc-400 text-xs">
                        Không có phòng nào khớp bộ lọc trong kỳ này.
                      </div>
                    ) : (
                      filteredRoomRows.map((room) => {
                        const isFocused =
                          selectedSingleRoom === room.roomNumber;
                        return (
                          <button
                            key={room.roomNumber}
                            type="button"
                            onClick={() =>
                              setSelectedSingleRoom(
                                isFocused ? "all" : room.roomNumber,
                              )
                            }
                            className={`w-full px-3 py-2.5 flex items-center justify-between gap-2 text-left transition cursor-pointer ${
                              isFocused
                                ? "bg-emerald-50/80 ring-1 ring-inset ring-emerald-400"
                                : "hover:bg-zinc-50"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono font-bold text-zinc-950 text-xs">
                                  Phòng #{room.roomNumber}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-medium">
                                  {room.branchName}
                                </span>
                                <span className="text-zinc-500 text-[11px] truncate">
                                  {room.roomClassName}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                                {room.ordersCount > 0
                                  ? `${room.ordersCount} đơn · ${room.nightsCount} đêm · TB ${formatFullVnd(room.adr)}/đêm`
                                  : "Chưa phát sinh đơn trong kỳ này"}
                              </span>
                            </div>

                            <div className="text-right font-mono shrink-0">
                              <strong
                                className={`block text-xs ${
                                  room.revenue > 0
                                    ? "text-emerald-700"
                                    : "text-zinc-400 font-normal"
                                }`}
                              >
                                {formatFullVnd(room.revenue)}
                              </strong>
                              {room.revenue > 0 && (
                                <span className="text-[10px] text-zinc-400">
                                  {room.sharePct}%
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 3: DOANH THU TỪNG CHI NHÁNH                                   */}
              {/* ================================================================= */}
              {revenueScopeTab === "by_branch" && (
                <div className="space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <span className="text-[11px] text-zinc-500">
                      Tổng doanh thu toàn chuỗi 3 chi nhánh ({periodMetrics.rangeText}):{" "}
                      <strong className="font-mono text-zinc-950">
                        {formatFullVnd(chainTotalRevenue)}
                      </strong>
                    </span>
                    {branchFilter !== "all" && (
                      <button
                        type="button"
                        onClick={() => onChangeBranchFilter("all")}
                        className="text-[11px] font-medium text-emerald-700 hover:underline cursor-pointer"
                      >
                        Xem gộp cả 3 chi nhánh
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {periodMetrics.branchRevenues.map((br) => {
                      const isSelected = branchFilter === br.branchId;
                      return (
                        <div
                          key={br.branchId}
                          onClick={() =>
                            onChangeBranchFilter(
                              isSelected ? "all" : br.branchId,
                            )
                          }
                          className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                            isSelected
                              ? "bg-emerald-50/70 border-emerald-400 shadow-2xs"
                              : "bg-white border-zinc-200 hover:border-zinc-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-zinc-950 text-xs flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{br.shortName}</span>
                              </div>
                              <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                                {br.district} · {br.totalRooms} phòng
                              </span>
                            </div>
                            <Badge
                              variant={isSelected ? "default" : "secondary"}
                              className="font-mono text-[10px] shrink-0"
                            >
                              {br.sharePct}% chuỗi
                            </Badge>
                          </div>

                          <div>
                            <span className="text-base font-bold text-zinc-950 font-mono block">
                              {formatFullVnd(br.revenue)}
                            </span>
                            <span
                              className={`text-[10px] font-mono ${
                                br.growthPct >= 0
                                  ? "text-emerald-700"
                                  : "text-rose-600"
                              }`}
                            >
                              {br.growthPct >= 0
                                ? `+${br.growthPct}%`
                                : `${br.growthPct}%`}{" "}
                              so với kỳ trước
                            </span>
                          </div>

                          <div className="w-full bg-zinc-100 rounded-full h-1.5">
                            <div
                              className="bg-emerald-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${br.sharePct}%` }}
                            />
                          </div>

                          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-600 font-mono">
                            <span>
                              {br.ordersCount} đơn · {br.nightsCount} đêm
                            </span>
                            <span>
                              {br.adr > 0
                                ? `${formatCompactVnd(br.adr)}đ/đêm`
                                : "0đ"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DANH SÁCH ĐƠN HOÀN TẤT TRONG PHẠM VI ĐANG CHỌN */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-2.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                    Đơn Đã Thanh Toán Trong Kỳ ({scopedOrders.length} đơn)
                  </h4>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {focusedSingleRoomSummary
                      ? `Phòng #${focusedSingleRoomSummary.roomNumber}`
                      : analytics.activeBranchLabel}
                  </span>
                </div>

                {scopedOrders.length === 0 ? (
                  <div className="p-5 text-center text-zinc-400 text-xs bg-zinc-50/60 rounded-lg">
                    Chưa có đơn phát sinh trong phạm vi đang chọn.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-100 border border-zinc-100 rounded-lg">
                    {scopedOrders.map((order) => (
                      <div
                        key={order.reqId}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-xs hover:bg-zinc-50 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <strong className="font-mono text-zinc-950">
                              #{order.reqId}
                            </strong>
                            <span className="font-medium text-zinc-800 truncate">
                              {order.roomSummary}
                            </span>
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] bg-zinc-50"
                            >
                              Phòng #{order.lockedRoomNumber} · {order.nights}{" "}
                              đêm
                            </Badge>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                              {order.branchName}
                            </span>
                          </div>
                          <span className="text-zinc-400 text-[10px] block mt-0.5 font-mono">
                            {order.paidTime} • Lưu trú: {order.stayDates}
                          </span>
                        </div>
                        <div className="text-right font-mono shrink-0">
                          <strong className="text-emerald-700 block">
                            +{formatFullVnd(order.baseAmount)}
                          </strong>
                          <span className="text-[10px] text-zinc-400">
                            {formatFullVnd(
                              Math.round(
                                order.baseAmount / Math.max(1, order.nights),
                              ),
                            )}
                            /đêm
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 2. GIÁ BÌNH QUÂN ĐÊM (ADR) & SỔ ĐƠN THEO KỲ */}
        {activeKpi === "revenue_today" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Giá Bình Quân Đêm (ADR) &amp; Đơn Đã Thanh Toán (
                    {periodMetrics.shortLabel} • {periodMetrics.rangeText})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    {analytics.activeBranchLabel} • {periodMetrics.paidWonCount}{" "}
                    đơn hoàn tất ({periodMetrics.roomNightsSold} đêm phòng)
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-600">
                  Công thức <strong className="text-zinc-900">ADR</strong> (Doanh thu bình quân 1 đêm):
                </span>
                <span className="font-mono font-semibold text-zinc-900">
                  {formatFullVnd(periodMetrics.baseRevenue)} ÷{" "}
                  {periodMetrics.roomNightsSold} đêm ={" "}
                  <span className="text-emerald-700">
                    {formatFullVnd(periodMetrics.periodBaseAdr)}/đêm
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-zinc-950 text-white rounded-xl border border-zinc-950">
                  <span className="text-[11px] text-zinc-400 block font-medium">
                    Tổng doanh thu ({periodMetrics.shortLabel})
                  </span>
                  <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                    {formatFullVnd(periodMetrics.baseRevenue)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] text-zinc-500 block font-medium">
                    ADR bình quân ({periodMetrics.roomNightsSold} đêm)
                  </span>
                  <span className="text-base font-semibold text-zinc-900 font-mono mt-0.5 block">
                    {formatFullVnd(periodMetrics.periodBaseAdr)}/đêm
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 block font-medium">
                    Trạng thái Thanh toán
                  </span>
                  <span className="text-base font-semibold text-emerald-800 mt-0.5 block">
                    {periodMetrics.paidWonCount} đơn TT 100% &amp; Khóa phòng
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                  Chi Tiết {periodMetrics.periodOrders.length} Đơn Đã Khóa Phòng ({periodMetrics.rangeText})
                </h4>
                <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl bg-white">
                  {periodMetrics.periodOrders.map((order) => (
                    <div
                      key={order.reqId}
                      className="p-2.5 flex items-center justify-between text-xs hover:bg-zinc-50 transition"
                    >
                      <div>
                        <strong className="font-mono text-zinc-950">
                          #{order.reqId}
                        </strong>{" "}
                        •{" "}
                        <span className="font-medium text-zinc-800">
                          {order.roomSummary}
                        </span>{" "}
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] ml-1 bg-zinc-50"
                        >
                          Phòng #{order.lockedRoomNumber} • {order.nights} đêm
                        </Badge>
                        <span className="text-zinc-400 text-[10px] block mt-0.5 font-mono">
                          {order.branchName} • {order.paidTime} • {order.stayDates}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <strong className="text-zinc-950 block">
                          +{formatFullVnd(order.baseAmount)}
                        </strong>
                        <span className="text-[10px] text-zinc-400">
                          {formatFullVnd(
                            Math.round(
                              order.baseAmount / Math.max(1, order.nights),
                            ),
                          )}
                          /đêm
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-700 font-medium">
                  Dự báo tối nay đến 23h59: Còn khoảng{" "}
                  {hotelProfile.eveningForecast.expectedRequestsMin}–
                  {hotelProfile.eveningForecast.expectedRequestsMax} phiên tiềm
                  năng cho {vacantCount} phòng trống.
                </span>
                <span className="font-semibold text-emerald-700 font-mono">
                  +{formatCompactVnd(hotelProfile.eveningForecast.potentialBaseRevenueMin)}{" "}
                  – {formatCompactVnd(hotelProfile.eveningForecast.potentialBaseRevenueMax)}đ
                </span>
              </div>
            </div>
          </>
        )}

        {/* 3. PHIÊN GỬI BÁO GIÁ */}
        {activeKpi === "sessions_total" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <Gavel className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Bóc Tách {periodMetrics.bidsSent} Phiên Báo Giá Đã Đóng (1 Lần)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    {analytics.activeBranchLabel} • {periodMetrics.rangeText} •
                    Đang chờ khách TT Live:{" "}
                    <strong>{analytics.pendingLiveBidsCount} phiên</strong> •
                    Trần Auto-Bid: &le;{hotelProfile.autoBidMaxRooms} phòng &amp;
                    &le;{hotelProfile.autoBidMaxGuests} khách
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-950">
                      AI Auto-Bid Tự Động
                    </span>
                    <Badge className="font-mono text-[11px]">
                      {periodMetrics.autoBidStats.sessionsCount} phiên (
                      {periodMetrics.autoBidStats.sharePct}%)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Phản hồi trung bình:{" "}
                    <strong className="text-zinc-950 font-mono">
                      {periodMetrics.autoBidStats.avgResponseMin} phút
                    </strong>{" "}
                    • Tỷ lệ khách TT:{" "}
                    <strong className="text-emerald-700 font-mono">
                      {periodMetrics.autoBidStats.winRatePct}%
                    </strong>
                    .
                  </p>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-zinc-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">
                      Lễ Tân / Quản Lý Duyệt Tay
                    </span>
                    <Badge variant="secondary" className="font-mono text-[11px]">
                      {periodMetrics.manualStats.sessionsCount} phiên (
                      {periodMetrics.manualStats.sharePct}%)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Phản hồi trung bình:{" "}
                    <strong className="text-zinc-900 font-mono">
                      {periodMetrics.manualStats.avgResponseMin} phút
                    </strong>{" "}
                    • Tỷ lệ khách TT:{" "}
                    <strong className="text-zinc-900 font-mono">
                      {periodMetrics.manualStats.winRatePct}%
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
                <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                  Mật Độ Yêu Cầu Theo Khung Giờ Thực Tế
                </h4>
                <div className="space-y-2.5">
                  {periodMetrics.timeSlotDensity.map((slot) => (
                    <div key={slot.slot}>
                      <div className="flex justify-between text-zinc-600 mb-1">
                        <span>{slot.label}</span>
                        <span className="font-semibold text-zinc-950 font-mono">
                          {slot.sessionsCount} phiên ({slot.sharePct}%)
                        </span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-2">
                        <div
                          className={`${slot.barColorClass} h-2 rounded-full transition-all`}
                          style={{ width: `${slot.sharePct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 4. TỶ LỆ ĐƯỢC CHỌN (WIN RATE) */}
        {activeKpi === "win_rate" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Phễu Chuyển Đổi Thanh Toán: {periodMetrics.winRatePct}%
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    {analytics.activeBranchLabel} • {periodMetrics.paidWonCount}/
                    {periodMetrics.bidsSent} đơn TT 100% ({periodMetrics.rangeText}) •
                    TB sàn Đà Nẵng {periodMetrics.platformWinRatePct}%
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <PaymentConversionFunnelPanel
              analytics={analytics}
              mode="modal"
              onCloseAndSwitchToAiTab={() => {
                onClose();
                onSwitchToAiTab();
              }}
            />
          </>
        )}

        {/* 5. LỊCH PHÒNG ĐÃ ĐẶT / CÒN TRỐNG THEO TỪNG NGÀY (14 NGÀY) */}
        {activeKpi === "rooms_occupied" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Lịch {activeDaySchedule.totalRooms} Phòng ({analytics.activeBranchLabel}) — Đang chọn:{" "}
                    {activeDaySchedule.fullDate} ({activeDaySchedule.dayLabel})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    Chọn bất kỳ ngày nào trong kỳ{" "}
                    <strong>{hotelProfile.goldenWindowRange}</strong> — khi đóng
                    cửa sổ, hệ thống giữ nguyên ngày bạn đang theo dõi.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <RoomScheduleExplorer
                schedules={dailyRoomSchedules}
                selectedDayOffset={selectedDayOffset}
                onSelectDayOffset={onSelectDayOffset}
                viewMode={explorerViewMode}
                onChangeViewMode={onChangeExplorerViewMode}
                statusFilter={explorerStatusFilter}
                onChangeStatusFilter={onChangeExplorerStatusFilter}
                classFilter={explorerClassFilter}
                onChangeClassFilter={onChangeExplorerClassFilter}
                selectedRoomNum={selectedRoomNum}
                onSelectRoomNum={onSelectRoomNum}
                compact
                onToggleRoomLock={onToggleRoomLock}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <span className="text-zinc-500 text-[11px] block">
                    Ngày {activeDaySchedule.fullDate} (
                    {activeDaySchedule.dayLabel}) — Lấp đầy {activeDayOccPct}% (
                    {activeDayOccupied}/{activeDaySchedule.totalRooms} phòng):
                  </span>
                  <span className="text-sm font-bold text-zinc-950 font-mono">
                    {activeDaySchedule.auctionBooked} phòng goodNstay TT 100% ·{" "}
                    {activeDaySchedule.otherBooked} phòng kênh khác
                  </span>
                </div>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <span className="text-zinc-500 text-[11px] block">
                    Dự kiến trả phòng trưa hôm sau (
                    {nextDaySchedule?.dateStr ?? "kế tiếp"}):
                  </span>
                  <span className="text-sm font-bold text-zinc-950 font-mono">
                    {activeDayCheckoutCount} phòng check-out 12:00 ·{" "}
                    {activeDaySchedule.vacantRooms} phòng đang trống
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 6. PHÒNG TRỐNG MỞ KHÓA THEO TỪNG NGÀY & QUY TẮC PAY-TO-LOCK */}
        {activeKpi === "rooms_vacant" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <DoorOpen className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Quản Lý Mở Khóa / Khóa Phòng ({analytics.activeBranchLabel}) — Ngày{" "}
                    {activeDaySchedule.fullDate} ({activeDaySchedule.dayLabel})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    Bấm trực tiếp vào từng buồng để{" "}
                    <strong>Khóa phòng</strong> (khách Lễ tân/OTA) hoặc{" "}
                    <strong>Mở khóa</strong> nhận đấu giá · Ngày đang chọn được
                    giữ nguyên khi đóng hộp thoại.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <RoomScheduleExplorer
                schedules={dailyRoomSchedules}
                selectedDayOffset={selectedDayOffset}
                onSelectDayOffset={onSelectDayOffset}
                viewMode={explorerViewMode}
                onChangeViewMode={onChangeExplorerViewMode}
                statusFilter={explorerStatusFilter}
                onChangeStatusFilter={onChangeExplorerStatusFilter}
                classFilter={explorerClassFilter}
                onChangeClassFilter={onChangeExplorerClassFilter}
                selectedRoomNum={selectedRoomNum}
                onSelectRoomNum={onSelectRoomNum}
                compact
                onToggleRoomLock={onToggleRoomLock}
              />

              <div className="bg-zinc-50 border border-zinc-200/80 p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-zinc-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Tự động chống Overbooking:</strong> Ngay khi phòng
                    trống cuối cùng của một hạng trong ngày lưu trú được khách TT
                    100%, các báo giá trùng ngày của hạng đó sẽ tự động đóng.
                  </span>
                </div>
              </div>

              {(vacantCount > 0 || nightFlashSaleActive) && (
                <div className="bg-zinc-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        Xả đêm hôm nay 06/11 (Sau {hotelProfile.nightFlashStartHour})
                        {nightFlashSaleActive ? " · ĐANG BẬT" : ""}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Hạ {hotelProfile.nightFlashDiscountPct}% giá sàn &amp; giá đề xuất tối nay cho{" "}
                      {vacantCount} phòng trống mà không ảnh hưởng giá công bố OTA.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onActivateNightFlashSale}
                    className="bg-white hover:bg-zinc-100 text-zinc-950 font-semibold shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {nightFlashSaleActive
                      ? "Tắt xả đêm"
                      : `Bật xả đêm (-${hotelProfile.nightFlashDiscountPct}%)`}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-between items-center pt-3 border-t border-zinc-200">
          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-emerald-600" />
            Truy vấn trực tiếp từ bộ Master Data JSON (Không dùng Mock Data)
          </span>
          <Button variant="outline" onClick={onClose} className="h-8 px-4">
            Đóng cửa sổ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
