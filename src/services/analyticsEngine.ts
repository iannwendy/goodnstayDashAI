import {
  calcGuestTotalFromBase,
  parseStayDayOffsets,
  type AuctionSessionMasterRecord,
  type BranchFilter,
  type Calendar14DayPmsRecord,
  type DailyRoomCell,
  type DailyRoomSchedule,
  type DateRangeKey,
  type HistorySession,
  type LiveSession,
  type LossReasonId,
  type MasterDataBundle,
  type MatchBreakdown,
  type PeriodBaselineMeta,
  type RoomCell,
  type RoomClassInventory,
  type TimeSlotType,
  type TodayOrder,
} from "@/data";

export interface RoomClassRevenueShare {
  roomClassId: string;
  roomClassName: string;
  category: string;
  wonSessionsCount: number;
  roomNightsCount: number;
  baseRevenue: number;
  guestPaidTotal: number;
  sharePct: number;
  barColorClass: string;
}

export interface BranchRevenueSummary {
  branchId: string;
  shortName: string;
  name: string;
  district: string;
  totalRooms: number;
  ordersCount: number;
  nightsCount: number;
  revenue: number;
  adr: number;
  previousRevenue: number;
  growthPct: number;
  sharePct: number;
}

export interface RoomRevenueSummary {
  roomNumber: number;
  floor: number;
  branchId: string;
  branchName: string;
  roomClassId: string;
  roomClassName: string;
  category: string;
  ordersCount: number;
  nightsCount: number;
  revenue: number;
  adr: number;
  sharePct: number;
  orders: TodayOrder[];
}

export interface RevenueTimeBucket {
  key: string;
  label: string;
  subLabel?: string;
  revenueVnd: number;
  revenueM: number;
  ordersCount: number;
  nightsCount: number;
}

export function buildRevenueTimeSeries(
  key: DateRangeKey,
  meta: PeriodBaselineMeta,
  orders: TodayOrder[],
  referenceDate: string,
  granularity30d: "weekly" | "daily" = "weekly",
): RevenueTimeBucket[] {
  if (key === "today") {
    const slots = [
      { key: "06-11", label: "Sáng (06–11h)", minH: 0, maxH: 10 },
      { key: "11-14", label: "Trưa (11–14h)", minH: 11, maxH: 13 },
      { key: "14-18", label: "Chiều (14–18h)", minH: 14, maxH: 17 },
      { key: "18-24", label: "Tối (18–24h)", minH: 18, maxH: 23 },
    ];
    return slots.map((b) => {
      const matched = orders.filter((o) => {
        const hm = o.timeLabel?.match(/^(\d{1,2})/);
        const h = hm ? Number(hm[1]) : 18;
        return h >= b.minH && h <= b.maxH;
      });
      const rev = matched.reduce((s, o) => s + o.baseAmount, 0);
      const nights = matched.reduce((s, o) => s + o.nights, 0);
      return {
        key: `${referenceDate}-${b.key}`,
        label: b.label,
        revenueVnd: rev,
        revenueM: Number((rev / 1_000_000).toFixed(2)),
        ordersCount: matched.length,
        nightsCount: nights,
      };
    });
  }

  if (key === "30d" && granularity30d === "weekly") {
    const weeks = [
      {
        key: "w1",
        label: "Tuần 1",
        subLabel: "08/10 – 14/10",
        start: "2026-10-08",
        end: "2026-10-14",
      },
      {
        key: "w2",
        label: "Tuần 2",
        subLabel: "15/10 – 21/10",
        start: "2026-10-15",
        end: "2026-10-21",
      },
      {
        key: "w3",
        label: "Tuần 3",
        subLabel: "22/10 – 28/10",
        start: "2026-10-22",
        end: "2026-10-28",
      },
      {
        key: "w4",
        label: "Tuần 4",
        subLabel: "29/10 – 06/11",
        start: "2026-10-29",
        end: "2026-11-06",
      },
    ];
    return weeks.map((w) => {
      const matched = orders.filter(
        (o) => o.sessionDate >= w.start && o.sessionDate <= w.end,
      );
      const rev = matched.reduce((s, o) => s + o.baseAmount, 0);
      const nights = matched.reduce((s, o) => s + o.nights, 0);
      return {
        key: w.key,
        label: `${w.label} (${w.subLabel.slice(0, 5)})`,
        subLabel: w.subLabel,
        revenueVnd: rev,
        revenueM: Number((rev / 1_000_000).toFixed(2)),
        ordersCount: matched.length,
        nightsCount: nights,
      };
    });
  }

  const startMs = Date.parse(`${meta.startDate}T00:00:00Z`);
  const endMs = Date.parse(`${meta.endDate}T00:00:00Z`);
  const daysCount = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
  const buckets: RevenueTimeBucket[] = [];
  for (let i = 0; i < daysCount; i++) {
    const dt = new Date(startMs + i * 86_400_000);
    const iso = dt.toISOString().slice(0, 10);
    const shortD = `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
    const matched = orders.filter((o) => o.sessionDate === iso);
    const rev = matched.reduce((s, o) => s + o.baseAmount, 0);
    const nights = matched.reduce((s, o) => s + o.nights, 0);
    buckets.push({
      key: iso,
      label: shortD,
      revenueVnd: rev,
      revenueM: Number((rev / 1_000_000).toFixed(2)),
      ordersCount: matched.length,
      nightsCount: nights,
    });
  }
  return buckets;
}

export interface BidModePerformance {
  sessionsCount: number;
  sharePct: number;
  wonCount: number;
  winRatePct: number;
  avgResponseMin: number;
}

export interface TimeSlotDensityItem {
  slot: TimeSlotType;
  label: string;
  sessionsCount: number;
  sharePct: number;
  barColorClass: string;
}

export type FunnelSegmentFilter = "all" | "auto" | "manual";

export type SmartInsightsRaceStage = "REACH" | "ACT" | "CONVERT" | "ENGAGE";

export interface DroppedSessionPreview {
  id: string;
  sessionDate: string;
  shortDate: string;
  roomCategory: string;
  offeredRoom: string;
  offeredBasePrice: number;
  guestTotalPrice: number;
  bidMode: "auto" | "manual";
  matchScore: number;
  responseMinutes: number;
  reasonNote: string;
}

export interface PaymentFunnelStep {
  stepNumber: number;
  id: string;
  raceStage: SmartInsightsRaceStage;
  raceBadgeLabel: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  smartInsightsMapping: string;
  smartInsightsRetailBenchmarkPct?: number;
  count: number;
  cumulativePct: number;
  stepConversionPct: number;
  droppedFromPrevCount: number;
  droppedFromPrevPct: number;
  droppedShareOfTotalLossesPct: number;
  platformBenchmarkPct: number;
  deltaVsPlatformPct: number;
  optimizationTip: string;
  droppedSessions: DroppedSessionPreview[];
}

export interface PaymentFunnelBreakdown {
  segment: FunnelSegmentFilter;
  segmentLabel: string;
  totalBids: number;
  wonCount: number;
  totalLosses: number;
  winRatePct: number;
  platformWinRatePct: number;
  pdpViewCount: number;
  pdpViewRatePct: number;
  checkoutInitCount: number;
  checkoutInitRatePct: number;
  checkoutCompletionRatePct: number;
  cartAbandonmentRatePct: number;
  biggestBottleneckStep: {
    stepNumber: number;
    shortTitle: string;
    droppedCount: number;
    shareOfLossesPct: number;
  } | null;
  steps: PaymentFunnelStep[];
}

export interface PeriodComputedMetrics {
  key: DateRangeKey;
  shortLabel: string;
  rangeText: string;
  startDate: string;
  endDate: string;
  baseRevenue: number;
  netReceive: number;
  guestPaidTotal: number;
  platformFeeAndVatTotal: number;
  previousNetRevenue: number;
  growthPct: number;
  bidsSent: number;
  autoBidsCount: number;
  manualBidsCount: number;
  paidWonCount: number;
  autoClosedCount: number;
  winRatePct: number;
  platformWinRatePct: number;
  roomNightsSold: number;
  periodBaseAdr: number;
  periodOrders: TodayOrder[];
  branchRevenues: BranchRevenueSummary[];
  roomRevenues: RoomRevenueSummary[];
  allChainRoomRevenues: RoomRevenueSummary[];
  timeBucketsPrimary: RevenueTimeBucket[];
  timeBucketsDaily: RevenueTimeBucket[];
  guestOpenedCount: number;
  guestOpenedRatePct: number;
  avgCloseMinutes: number;
  roomClassRevenueShares: RoomClassRevenueShare[];
  manualStats: BidModePerformance;
  autoBidStats: BidModePerformance;
  timeSlotDensity: TimeSlotDensityItem[];
  paymentFunnels: Record<FunnelSegmentFilter, PaymentFunnelBreakdown>;
}

export interface BenchmarkRowComputed {
  roomClassId: string;
  category: string;
  roomName: string;
  bids: number;
  wins: number;
  hotelWinPct: number;
  sysAvgPct: number;
  deltaPct: number;
  sysTotalWins: number;
  regionSharePct: number;
  hotelAvgBasePrice: number;
  systemAvgBasePrice: number;
}

export interface DailyRevenueTrendPoint {
  isoDate: string;
  date: string;
  baseRevenueVnd: number;
  baseRevenueM: number;
  paidOrders: number;
}

export interface LossReasonComputed {
  id: LossReasonId;
  shortName: string;
  color: string;
  actionHint: string;
  sessions: number;
  pct: number;
}

export interface ComputedDashboardAnalytics {
  branchFilter: BranchFilter;
  activeBranchLabel: string;
  scopedTotalRooms: number;
  activeFloorPrice: number;
  periodMetrics: PeriodComputedMetrics;
  allPeriods: Record<DateRangeKey, PeriodComputedMetrics>;
  // Today (06/11/2026)
  todayBaseRevenue: number;
  todayGuestPaidTotal: number;
  todayOrders: TodayOrder[];
  todayTotalNights: number;
  todayBaseAdr: number;
  // Rooms & PMS Tonight
  roomInventory: RoomClassInventory[];
  occupiedCount: number;
  otherBookedTotal: number;
  auctionBookedTotal: number;
  vacantCount: number;
  occupancyPct: number;
  checkOutTomorrowCount: number;
  activeAuctionCountByClass: Record<string, number>;
  roomMatrix: RoomCell[];
  golden14ChartData: Calendar14DayPmsRecord[];
  dailyRoomSchedules: DailyRoomSchedule[];
  // Live & History
  liveSessions: LiveSession[];
  activeLiveCount: number;
  pendingLiveBidsCount: number;
  historySessions: HistorySession[];
  // Tab 1 & Tab 2 Charts & Benchmarks
  benchmarkChartData: BenchmarkRowComputed[];
  dailyRevenueTrend: DailyRevenueTrendPoint[];
  revenueTrendSubtitle: string;
  periodLossReasons: LossReasonComputed[];
  periodTotalLosses: number;
  lossReasons30d: LossReasonComputed[];
  totalLosses30d: number;
}

const BAR_COLORS: Record<string, string> = {
  sup: "bg-zinc-950",
  dlx: "bg-zinc-700",
  fsuite: "bg-emerald-600",
  osuite: "bg-amber-500",
};

function mapSessionToOrder(
  s: AuctionSessionMasterRecord,
  multiplier: number,
  roomBranchLookup: Map<number, { branchId: string; branchName: string }>,
): TodayOrder {
  const baseAmount =
    s.hotelEarnedBase ??
    (s.offeredBasePrice ?? 0) * s.nights * (s.roomsQty ?? 1);
  const guestPaidAmount =
    s.guestPaidTotal ?? calcGuestTotalFromBase(baseAmount, multiplier);
  const shortDate = `${s.sessionDate.slice(8, 10)}/${s.sessionDate.slice(5, 7)}`;
  const rno = s.lockedRoomNumber ?? 106;
  const fallbackBr = roomBranchLookup.get(rno);
  return {
    reqId: s.id,
    branchId: s.branchId ?? fallbackBr?.branchId ?? "br_mykhe",
    branchName: s.branchName ?? fallbackBr?.branchName ?? "CN Mỹ Khê",
    sessionDate: s.sessionDate,
    timeLabel: s.timeLabel ?? "18:00",
    roomCategory: s.roomCategory ?? "Superior",
    roomSummary: s.offeredRoom ?? "Superior Double",
    nights: s.nights * (s.roomsQty ?? 1),
    stayDates: s.stayDatesLabel ?? `${s.nights} đêm`,
    paidTime: s.dateTimeLabel ?? `${s.timeLabel} • ${shortDate}`,
    lockedRoomNumber: rno,
    baseAmount,
    guestPaidAmount,
    paymentStatus: "Đã thanh toán 100%",
  };
}

function computeSinglePeriod(
  key: DateRangeKey,
  bundle: MasterDataBundle,
  scopedCompletedSessions: AuctionSessionMasterRecord[],
  allChainCompletedSessions: AuctionSessionMasterRecord[],
  branchFilter: BranchFilter,
  roomBranchLookup: Map<number, { branchId: string; branchName: string }>,
): PeriodComputedMetrics {
  const meta = bundle.systemBenchmarks.periodsMeta[key];
  const multiplier = bundle.hotelProfile.guestPriceMultiplier;

  const inPeriod = scopedCompletedSessions.filter(
    (s) => s.sessionDate >= meta.startDate && s.sessionDate <= meta.endDate,
  );
  const wonInPeriod = inPeriod.filter((s) => s.status === "won");

  const baseRevenue = wonInPeriod.reduce(
    (sum, s) =>
      sum +
      (s.hotelEarnedBase ??
        (s.offeredBasePrice ?? 0) * s.nights * (s.roomsQty ?? 1)),
    0,
  );
  const netReceive = baseRevenue;

  const guestPaidTotal = wonInPeriod.reduce(
    (sum, s) =>
      sum +
      (s.guestPaidTotal ??
        calcGuestTotalFromBase(
          s.hotelEarnedBase ?? (s.offeredBasePrice ?? 0) * s.nights,
          multiplier,
        )),
    0,
  );
  const platformFeeAndVatTotal = Math.max(0, guestPaidTotal - baseRevenue);

  const selectedBranchMeta =
    branchFilter !== "all"
      ? bundle.hotelProfile.branches.find((b) => b.id === branchFilter)
      : undefined;
  const previousNetRevenue = selectedBranchMeta
    ? selectedBranchMeta.previousPeriodRevenue[key]
    : meta.previousNetRevenue;

  const growthPct =
    previousNetRevenue > 0
      ? Number(
          (((netReceive - previousNetRevenue) / previousNetRevenue) * 100).toFixed(
            1,
          ),
        )
      : 0;

  const bidsSent = inPeriod.length;
  const autoSessions = inPeriod.filter((s) => s.bidMode === "auto");
  const manualSessions = inPeriod.filter((s) => s.bidMode !== "auto");

  const paidWonCount = wonInPeriod.length;
  const winRatePct =
    bidsSent > 0 ? Number(((paidWonCount / bidsSent) * 100).toFixed(1)) : 0;

  const roomNightsSold = wonInPeriod.reduce(
    (sum, s) => sum + s.nights * (s.roomsQty ?? 1),
    0,
  );
  const periodBaseAdr =
    roomNightsSold > 0 ? Math.round(baseRevenue / roomNightsSold) : 0;

  const periodOrders: TodayOrder[] = [...wonInPeriod]
    .sort((a, b) => {
      const dc = b.sessionDate.localeCompare(a.sessionDate);
      if (dc !== 0) return dc;
      return (b.timeLabel ?? "").localeCompare(a.timeLabel ?? "");
    })
    .map((s) => mapSessionToOrder(s, multiplier, roomBranchLookup));

  // Chain-wide won sessions in this period for Branch comparison & All-Chain Room lookup
  const allChainWonInPeriod = allChainCompletedSessions.filter(
    (s) =>
      s.status === "won" &&
      s.sessionDate >= meta.startDate &&
      s.sessionDate <= meta.endDate,
  );
  const allChainOrders = [...allChainWonInPeriod]
    .sort((a, b) => {
      const dc = b.sessionDate.localeCompare(a.sessionDate);
      if (dc !== 0) return dc;
      return (b.timeLabel ?? "").localeCompare(a.timeLabel ?? "");
    })
    .map((s) => mapSessionToOrder(s, multiplier, roomBranchLookup));

  const chainTotalRevenue = allChainOrders.reduce(
    (s, o) => s + o.baseAmount,
    0,
  );

  const branchRevenues: BranchRevenueSummary[] =
    bundle.hotelProfile.branches.map((br) => {
      const brOrders = allChainOrders.filter((o) => o.branchId === br.id);
      const rev = brOrders.reduce((s, o) => s + o.baseAmount, 0);
      const nights = brOrders.reduce((s, o) => s + o.nights, 0);
      const prev = br.previousPeriodRevenue[key];
      const gr =
        prev > 0 ? Number((((rev - prev) / prev) * 100).toFixed(1)) : 0;
      const share =
        chainTotalRevenue > 0
          ? Math.round((rev / chainTotalRevenue) * 100)
          : 0;
      return {
        branchId: br.id,
        shortName: br.shortName,
        name: br.name,
        district: br.district,
        totalRooms: br.totalRooms,
        ordersCount: brOrders.length,
        nightsCount: nights,
        revenue: rev,
        adr: nights > 0 ? Math.round(rev / nights) : 0,
        previousRevenue: prev,
        growthPct: gr,
        sharePct: share,
      };
    });

  const allChainRoomRevenues: RoomRevenueSummary[] = bundle.roomsPms
    .slice()
    .sort((a, b) => a.roomNumber - b.roomNumber)
    .map((r) => {
      const rOrders = allChainOrders.filter(
        (o) => o.lockedRoomNumber === r.roomNumber,
      );
      const rev = rOrders.reduce((s, o) => s + o.baseAmount, 0);
      const nights = rOrders.reduce((s, o) => s + o.nights, 0);
      return {
        roomNumber: r.roomNumber,
        floor: r.floor,
        branchId: r.branchId,
        branchName: r.branchName,
        roomClassId: r.roomClassId,
        roomClassName: r.roomClass,
        category: r.category,
        ordersCount: rOrders.length,
        nightsCount: nights,
        revenue: rev,
        adr: nights > 0 ? Math.round(rev / nights) : 0,
        sharePct:
          baseRevenue > 0 ? Number(((rev / baseRevenue) * 100).toFixed(1)) : 0,
        orders: rOrders,
      };
    });

  const roomRevenues: RoomRevenueSummary[] =
    branchFilter === "all"
      ? allChainRoomRevenues
      : allChainRoomRevenues.filter((r) => r.branchId === branchFilter);

  const timeBucketsPrimary = buildRevenueTimeSeries(
    key,
    meta,
    periodOrders,
    bundle.hotelProfile.referenceDate,
    "weekly",
  );
  const timeBucketsDaily = buildRevenueTimeSeries(
    key,
    meta,
    periodOrders,
    bundle.hotelProfile.referenceDate,
    "daily",
  );

  const guestOpenedCount = inPeriod.filter((s) => s.guestOpenedDetail).length;
  const guestOpenedRatePct =
    bidsSent > 0 ? Number(((guestOpenedCount / bidsSent) * 100).toFixed(1)) : 0;

  const avgCloseMinutes =
    wonInPeriod.length > 0
      ? Number(
          (
            wonInPeriod.reduce((sum, s) => sum + (s.closeMinutes ?? 3.5), 0) /
            wonInPeriod.length
          ).toFixed(1),
        )
      : 0;

  const roomClassRevenueShares: RoomClassRevenueShare[] = bundle.roomClasses
    .map((rc) => {
      const rcWins = wonInPeriod.filter((s) => s.matchedRoomClassId === rc.id);
      const rcBase = rcWins.reduce(
        (sum, s) => sum + (s.hotelEarnedBase ?? 0),
        0,
      );
      const rcNights = rcWins.reduce(
        (sum, s) => sum + s.nights * (s.roomsQty ?? 1),
        0,
      );
      const rcGuest = rcWins.reduce(
        (sum, s) =>
          sum +
          (s.guestPaidTotal ??
            calcGuestTotalFromBase(s.hotelEarnedBase ?? 0, multiplier)),
        0,
      );
      const sharePct =
        baseRevenue > 0 ? Math.round((rcBase / baseRevenue) * 100) : 0;
      return {
        roomClassId: rc.id,
        roomClassName: rc.name,
        category: rc.category,
        wonSessionsCount: rcWins.length,
        roomNightsCount: rcNights,
        baseRevenue: rcBase,
        guestPaidTotal: rcGuest,
        sharePct,
        barColorClass: BAR_COLORS[rc.id] ?? "bg-zinc-600",
      };
    })
    .sort((a, b) => b.baseRevenue - a.baseRevenue);

  const buildModePerf = (
    subset: AuctionSessionMasterRecord[],
  ): BidModePerformance => {
    const count = subset.length;
    const wins = subset.filter((s) => s.status === "won").length;
    const avgResp =
      count > 0
        ? Number(
            (
              subset.reduce((sum, s) => sum + (s.responseMinutes ?? 2), 0) /
              count
            ).toFixed(1),
          )
        : 0;
    return {
      sessionsCount: count,
      sharePct: bidsSent > 0 ? Math.round((count / bidsSent) * 100) : 0,
      wonCount: wins,
      winRatePct: count > 0 ? Math.round((wins / count) * 100) : 0,
      avgResponseMin: avgResp,
    };
  };

  const slotDefs: { slot: TimeSlotType; label: string; color: string }[] = [
    {
      slot: "evening_peak",
      label: "Cao điểm tối (18:00 – 22:00)",
      color: "bg-zinc-950",
    },
    {
      slot: "lunch_peak",
      label: "Cao điểm trưa (11:00 – 13:30)",
      color: "bg-zinc-600",
    },
    {
      slot: "off_peak",
      label: "Khung giờ rải rác khác",
      color: "bg-zinc-400",
    },
  ];

  const timeSlotDensity: TimeSlotDensityItem[] = slotDefs.map((sd) => {
    const cnt = inPeriod.filter((s) => s.timeSlot === sd.slot).length;
    return {
      slot: sd.slot,
      label: sd.label,
      sessionsCount: cnt,
      sharePct: bidsSent > 0 ? Math.round((cnt / bidsSent) * 100) : 0,
      barColorClass: sd.color,
    };
  });

  const autoClosedCount = bundle.auctionSessions.filter(
    (s) =>
      s.status === "auto_closed" &&
      (branchFilter === "all" || s.branchId === branchFilter) &&
      s.sessionDate >= meta.startDate &&
      s.sessionDate <= meta.endDate,
  ).length;

  const classSysAvgPriceMap = new Map<string, number>(
    bundle.systemBenchmarks.roomClassBenchmarks.map((b) => [
      b.roomClassId,
      b.systemAvgBasePrice,
    ]),
  );

  const classifyMaxFunnelStep = (
    s: AuctionSessionMasterRecord,
  ): { maxStep: number; reasonNote: string } => {
    if (s.status === "won") {
      return { maxStep: 8, reasonNote: "Đã thanh toán 100% · Khóa phòng" };
    }
    const resp = s.responseMinutes ?? 5.0;
    if (s.status === "expired") {
      return {
        maxStep: 1,
        reasonNote: `Quá hạn 60p không tương tác (phản hồi ${resp}p)`,
      };
    }
    if (!s.guestOpenedDetail) {
      return {
        maxStep: 2,
        reasonNote: `Phản hồi chậm (${resp}p) · Khách đã xem đối thủ trước`,
      };
    }
    if (s.lossReasonId === "missing_perk") {
      return {
        maxStep: 3,
        reasonNote: `Độ khớp ${s.matchScore}% · Thiếu đặc quyền mềm (Bữa sáng / Late C/O)`,
      };
    }
    if (s.lossReasonId === "payment_abandoned") {
      return {
        maxStep: 7,
        reasonNote:
          "Thoát bước thanh toán trước khi xác nhận · Phòng vẫn mở khóa",
      };
    }
    const sysAvg = classSysAvgPriceMap.get(s.matchedRoomClassId) ?? 1_000_000;
    const offered = s.offeredBasePrice ?? sysAvg;
    if (offered > sysAvg * 1.05) {
      const overPct = Math.max(
        6,
        Math.round(((offered - sysAvg) / sysAvg) * 100),
      );
      return {
        maxStep: 4,
        reasonNote: `Giá gốc cao hơn +${overPct}% mặt bằng hạng ${s.roomCategory ?? "phòng"}`,
      };
    }
    if (s.bidMode !== "auto" && resp >= 4.0) {
      return {
        maxStep: 5,
        reasonNote: `Duyệt tay (${resp}p) kém ưu thế hơn Auto-Bid đối thủ cùng phiên`,
      };
    }
    return {
      maxStep: 6,
      reasonNote:
        "Nhạy cảm tổng giá ×1.265 (+15% phí sàn + 10% VAT) trước bước chọn",
    };
  };

  // Baseline Da Nang platform step curve anchored at 100.0% (Step 1) -> platformWinRatePct (Step 8)
  const baseRefCurve36_2 = [100.0, 86.8, 79.5, 68.4, 58.2, 46.5, 39.8, 36.2];
  const dropScale = (100 - meta.platformWinRatePct) / (100 - 36.2);
  const platformStepPcts = baseRefCurve36_2.map((val, idx) => {
    if (idx === 0) return 100;
    if (idx === 7) return meta.platformWinRatePct;
    return Number(
      Math.max(
        meta.platformWinRatePct,
        100 - (100 - val) * dropScale,
      ).toFixed(1),
    );
  });

  const stepDefinitions: {
    stepNumber: number;
    id: string;
    raceStage: SmartInsightsRaceStage;
    raceBadgeLabel: string;
    title: string;
    shortTitle: string;
    subtitle: string;
    smartInsightsMapping: string;
    smartInsightsRetailBenchmarkPct?: number;
    optimizationTip: string;
  }[] = [
    {
      stepNumber: 1,
      id: "bid_dispatched",
      raceStage: "REACH",
      raceBadgeLabel: "REACH · Đủ chuẩn",
      title: "1. Phát hành Báo giá 1 lần hợp lệ (TTL 60p)",
      shortTitle: "Phát hành Báo giá 1 lần",
      subtitle:
        "Vượt lọc cứng Địa bàn + Hạng phòng (Hard Rules), khóa giá gốc cố định hiệu lực 60 phút.",
      smartInsightsMapping:
        "Smart Insights [Reach]: Tổng phiên đủ điều kiện (Total Qualified Sessions — 100%)",
      smartInsightsRetailBenchmarkPct: 100,
      optimizationTip:
        "Duy trì bật AI Auto-Bid cho yêu cầu ≤ 4 phòng & ≤ 8 khách để phủ 100% cơ hội khung giờ đêm.",
    },
    {
      stepNumber: 2,
      id: "active_live_impression",
      raceStage: "REACH",
      raceBadgeLabel: "REACH · Hiển thị",
      title: "2. Phân phối Live trước mốc Hết hạn 60 phút",
      shortTitle: "Hiển thị Live < 60p",
      subtitle:
        "Đẩy qua WebSocket tới màn hình so sánh của du khách trước khi đồng hồ 01:00:00 chạm 0.",
      smartInsightsMapping:
        "Smart Insights [Reach → Act]: Phiên tương tác không thoát sớm (Active Non-Bounce Sessions)",
      optimizationTip:
        "Rút ngắn SLA duyệt tay dưới 5 phút hoặc bật Auto-Bid ca trưa (11h–13h30) & đêm (>22h) để triệt tiêu hết hạn 60p.",
    },
    {
      stepNumber: 3,
      id: "pdp_detail_view",
      raceStage: "ACT",
      raceBadgeLabel: "ACT · Xem đề xuất",
      title: "3. Du khách mở thẻ xem Chi tiết Phòng & Ảnh",
      shortTitle: "Mở xem Chi tiết (PDP)",
      subtitle:
        "Khách bấm mở thẻ đề xuất của KS để xem ảnh thực tế, cấu hình giường & quy chuẩn nhận phòng.",
      smartInsightsMapping:
        "Smart Insights [Act]: Xem trang chi tiết sản phẩm (Product Page Views — Chuẩn TMĐT: 43.8%)",
      smartInsightsRetailBenchmarkPct: 43.8,
      optimizationTip:
        "Phản hồi trong 60 giây đầu giúp thẻ chào giá đứng đầu danh sách Live, tối đa hóa tỷ lệ mở xem chi tiết.",
    },
    {
      stepNumber: 4,
      id: "amenity_perk_fit",
      raceStage: "ACT",
      raceBadgeLabel: "ACT · Khớp tiện ích",
      title: "4. Đạt chuẩn Độ khớp Tiện ích & Đặc quyền mềm",
      shortTitle: "Đạt Độ khớp & Đặc quyền",
      subtitle:
        "Khách thẩm định Match Score (%) và 11 tiện ích mềm (Buffet sáng, Hồ bơi, Late Check-out, Bãi xe).",
      smartInsightsMapping:
        "Smart Insights [Act]: Đánh giá thông số & giá trị đề xuất (Product Spec & Value Fit)",
      optimizationTip:
        "Khi Match Score < 90%, đính kèm đặc quyền mềm 0đ–90k (Buffet sáng / Trả phòng trễ 14h) để bù điểm khớp.",
    },
    {
      stepNumber: 5,
      id: "market_price_screen",
      raceStage: "ACT",
      raceBadgeLabel: "ACT · Lọc giá gốc",
      title: "5. Vượt ngưỡng Giá gốc Tham chiếu Hệ thống (≤ +5%)",
      shortTitle: "Vượt sàng lọc Giá gốc",
      subtitle:
        "Giá gốc chào không vượt quá +5% mặt bằng hạng phòng khu vực Đà Nẵng trong cùng khung ngày.",
      smartInsightsMapping:
        "Smart Insights [Act]: Sàng lọc giá niêm yết trên danh mục (Category Price Screening)",
      optimizationTip:
        "Giữ giá chào sát mức AI Suggested Base Price hoặc bật Giảm giá đêm muộn (-12%) cho phòng trống sau 18h.",
    },
    {
      stepNumber: 6,
      id: "competitor_shortlist",
      raceStage: "ACT",
      raceBadgeLabel: "ACT · Đọ đối thủ",
      title: "6. Thắng đối đầu Giá & Tốc độ trước 2–3 Đối thủ",
      shortTitle: "Lọt Top Ưu tiên Đối đầu",
      subtitle:
        "Vượt vòng so sánh trực tiếp về tốc độ phản hồi và ưu đãi kèm theo trong cùng tab yêu cầu CRQ.",
      smartInsightsMapping:
        "Smart Insights [Act]: Đưa vào nhóm ưu tiên cân nhắc cuối (Shortlist Micro-Conversion)",
      optimizationTip:
        "Các phiên duyệt tay phản hồi ≥ 4–5 phút dễ mất ưu thế trước đối thủ chạy Auto-Bid sát giá — ưu tiên Quick-Bid 1 chạm.",
    },
    {
      stepNumber: 7,
      id: "accept_offer_checkout",
      raceStage: "CONVERT",
      raceBadgeLabel: "CONVERT · Chọn chào giá",
      title: "7. Duyệt Tổng giá & Bấm 'Chọn Chào Giá'",
      shortTitle: "Chọn Chào giá (Checkout)",
      subtitle:
        "Khách xác nhận đề xuất phòng của KS và chuyển sang bước thanh toán trực tuyến.",
      smartInsightsMapping:
        "Smart Insights [Convert]: Thêm giỏ hàng & Mở Checkout (Add-to-Basket — Chuẩn TMĐT: 14.5%)",
      smartInsightsRetailBenchmarkPct: 14.5,
      optimizationTip:
        "Tối ưu giá gốc mềm hơn 3–5% giúp tăng tỷ lệ khách bấm Chọn chào giá ngay ở vòng cuối.",
    },
    {
      stepNumber: 8,
      id: "paid_locked_100",
      raceStage: "CONVERT",
      raceBadgeLabel: "CONVERT · Khóa 100%",
      title: "8. Hoàn tất Thanh toán 100% & Khóa Phòng Tức Thì",
      shortTitle: "TT 100% · Khóa phòng",
      subtitle:
        "Hệ thống xác nhận thu đủ 100% trực tuyến → Khóa cứng phòng PMS & ghi nhận 100% doanh thu KS.",
      smartInsightsMapping:
        "Smart Insights [Convert]: Hoàn tất giao dịch thanh toán (Completed Sale — Chuẩn TMĐT: 3.3%)",
      smartInsightsRetailBenchmarkPct: 3.3,
      optimizationTip:
        "Cơ chế Pay-to-Lock chỉ khóa phòng khi đơn hoàn tất thanh toán 100% — phiên bỏ giỏ không gây thiệt hại công suất.",
    },
  ];

  const buildFunnelSegment = (
    segment: FunnelSegmentFilter,
    segmentLabel: string,
    subset: AuctionSessionMasterRecord[],
  ): PaymentFunnelBreakdown => {
    const total = subset.length;
    const classified = subset.map((s) => ({
      record: s,
      ...classifyMaxFunnelStep(s),
    }));
    const wonCnt = classified.filter((x) => x.maxStep >= 8).length;
    const totalLosses = Math.max(0, total - wonCnt);
    const segWinPct =
      total > 0 ? Number(((wonCnt / total) * 100).toFixed(1)) : 0;

    const steps: PaymentFunnelStep[] = stepDefinitions.map((def, idx) => {
      const k = def.stepNumber;
      const count = classified.filter((x) => x.maxStep >= k).length;
      const prevCount =
        k === 1
          ? total
          : classified.filter((x) => x.maxStep >= k - 1).length;
      const cumulativePct =
        total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
      const stepConversionPct =
        k === 1
          ? 100
          : prevCount > 0
            ? Number(((count / prevCount) * 100).toFixed(1))
            : 0;
      const droppedFromPrevCount = k === 1 ? 0 : Math.max(0, prevCount - count);
      const droppedFromPrevPct =
        k === 1 || prevCount === 0
          ? 0
          : Number(((droppedFromPrevCount / prevCount) * 100).toFixed(1));
      const droppedShareOfTotalLossesPct =
        totalLosses > 0
          ? Number(((droppedFromPrevCount / totalLosses) * 100).toFixed(1))
          : 0;
      const platformBenchmarkPct = platformStepPcts[idx] ?? meta.platformWinRatePct;
      const deltaVsPlatformPct = Number(
        (cumulativePct - platformBenchmarkPct).toFixed(1),
      );

      const droppedSessions: DroppedSessionPreview[] =
        k === 1
          ? []
          : classified
              .filter((x) => x.maxStep === k - 1)
              .sort((a, b) =>
                b.record.sessionDate.localeCompare(a.record.sessionDate),
              )
              .map(({ record, reasonNote }) => {
                const base = record.offeredBasePrice ?? 0;
                const totalGuest = calcGuestTotalFromBase(base, multiplier);
                return {
                  id: record.id,
                  sessionDate: record.sessionDate,
                  shortDate: `${record.sessionDate.slice(8, 10)}/${record.sessionDate.slice(5, 7)}`,
                  roomCategory: record.roomCategory ?? "Superior",
                  offeredRoom: record.offeredRoom ?? "Superior Double",
                  offeredBasePrice: base,
                  guestTotalPrice: totalGuest,
                  bidMode: record.bidMode === "auto" ? "auto" : "manual",
                  matchScore: record.matchScore,
                  responseMinutes: record.responseMinutes ?? 5,
                  reasonNote,
                };
              });

      return {
        ...def,
        count,
        cumulativePct,
        stepConversionPct,
        droppedFromPrevCount,
        droppedFromPrevPct,
        droppedShareOfTotalLossesPct,
        platformBenchmarkPct,
        deltaVsPlatformPct,
        droppedSessions,
      };
    });

    const step3 = steps[2];
    const step7 = steps[6];
    const checkoutCompletionRatePct =
      step7.count > 0
        ? Number(((wonCnt / step7.count) * 100).toFixed(1))
        : 0;
    const cartAbandonmentRatePct =
      step7.count > 0 ? Number((100 - checkoutCompletionRatePct).toFixed(1)) : 0;

    const dropSteps = steps.filter((st) => st.droppedFromPrevCount > 0);
    const topDrop =
      dropSteps.length > 0
        ? [...dropSteps].sort(
            (a, b) => b.droppedFromPrevCount - a.droppedFromPrevCount,
          )[0]
        : null;

    return {
      segment,
      segmentLabel,
      totalBids: total,
      wonCount: wonCnt,
      totalLosses,
      winRatePct: segWinPct,
      platformWinRatePct: meta.platformWinRatePct,
      pdpViewCount: step3.count,
      pdpViewRatePct: step3.cumulativePct,
      checkoutInitCount: step7.count,
      checkoutInitRatePct: step7.cumulativePct,
      checkoutCompletionRatePct,
      cartAbandonmentRatePct,
      biggestBottleneckStep: topDrop
        ? {
            stepNumber: topDrop.stepNumber,
            shortTitle: topDrop.shortTitle,
            droppedCount: topDrop.droppedFromPrevCount,
            shareOfLossesPct: topDrop.droppedShareOfTotalLossesPct,
          }
        : null,
      steps,
    };
  };

  const paymentFunnels: Record<FunnelSegmentFilter, PaymentFunnelBreakdown> = {
    all: buildFunnelSegment("all", "Tất cả báo giá", inPeriod),
    auto: buildFunnelSegment("auto", "AI Auto-Bid", autoSessions),
    manual: buildFunnelSegment("manual", "Duyệt tay", manualSessions),
  };

  return {
    key,
    shortLabel: meta.shortLabel,
    rangeText: meta.rangeText,
    startDate: meta.startDate,
    endDate: meta.endDate,
    baseRevenue,
    netReceive,
    guestPaidTotal,
    platformFeeAndVatTotal,
    previousNetRevenue,
    growthPct,
    bidsSent,
    autoBidsCount: autoSessions.length,
    manualBidsCount: manualSessions.length,
    paidWonCount,
    autoClosedCount,
    winRatePct,
    platformWinRatePct: meta.platformWinRatePct,
    roomNightsSold,
    periodBaseAdr,
    periodOrders,
    branchRevenues,
    roomRevenues,
    allChainRoomRevenues,
    timeBucketsPrimary,
    timeBucketsDaily,
    guestOpenedCount,
    guestOpenedRatePct,
    avgCloseMinutes,
    roomClassRevenueShares,
    manualStats: buildModePerf(manualSessions),
    autoBidStats: buildModePerf(autoSessions),
    timeSlotDensity,
    paymentFunnels,
  };
}

export function computeDashboardAnalytics(
  bundle: MasterDataBundle,
  dateRangeKey: DateRangeKey,
  liveCountdownOverrides: Record<string, number>,
  branchFilter: BranchFilter = "all",
): ComputedDashboardAnalytics {
  const {
    hotelProfile,
    roomClasses,
    roomsPms,
    calendar14dPms,
    systemBenchmarks,
    auctionSessions,
  } = bundle;

  const roomBranchLookup = new Map<
    number,
    { branchId: string; branchName: string }
  >(
    roomsPms.map((r) => [
      r.roomNumber,
      { branchId: r.branchId, branchName: r.branchName },
    ]),
  );

  const activeBranchMeta =
    branchFilter !== "all"
      ? hotelProfile.branches.find((b) => b.id === branchFilter)
      : undefined;
  const activeBranchLabel = activeBranchMeta
    ? activeBranchMeta.shortName
    : "Tất cả chi nhánh";

  const scopedRoomsPms =
    branchFilter === "all"
      ? roomsPms
      : roomsPms.filter((r) => r.branchId === branchFilter);
  const scopedRoomSet = new Set(scopedRoomsPms.map((r) => r.roomNumber));
  const scopedTotalRooms = scopedRoomsPms.length || hotelProfile.totalRooms;

  const activeFloorPrice = hotelProfile.nightFlashSaleActive
    ? Math.round(
        hotelProfile.defaultFloorPrice *
          (1 - hotelProfile.nightFlashDiscountPct / 100),
      )
    : hotelProfile.defaultFloorPrice;

  // 1. Live Sessions (preliminary pass before 14-day room schedule enrichment)
  const rawLiveRecords = auctionSessions.filter(
    (s) =>
      s.status === "live" &&
      (branchFilter === "all" || s.branchId === branchFilter),
  );

  const prelimLiveSessions = rawLiveRecords.map((s) => {
    const rc = roomClasses.find((r) => r.id === s.matchedRoomClassId);
    const classBaseFloor = rc?.baseFloorPrice ?? hotelProfile.defaultFloorPrice;
    const checkInDateRange = s.checkInDateRange ?? "06/11 – 07/11 (1 đêm)";
    const stayOffsets = parseStayDayOffsets(
      checkInDateRange,
      hotelProfile.referenceDate,
      s.nights,
    );
    const isTonightCheckIn = stayOffsets.includes(0);
    const flashDiscountApplied =
      hotelProfile.nightFlashSaleActive && isTonightCheckIn;

    const effectiveFloorPrice = flashDiscountApplied
      ? Math.round(
          classBaseFloor * (1 - hotelProfile.nightFlashDiscountPct / 100),
        )
      : classBaseFloor;

    const standardSuggestedBasePrice =
      s.aiSuggestedBasePrice ?? hotelProfile.defaultFloorPrice;
    const discountedSuggested = Math.max(
      effectiveFloorPrice,
      Math.round(
        (standardSuggestedBasePrice *
          (1 - hotelProfile.nightFlashDiscountPct / 100)) /
          5000,
      ) * 5000,
    );
    const aiSuggestedBasePrice = flashDiscountApplied
      ? discountedSuggested
      : standardSuggestedBasePrice;

    const roomsQty = s.roomsQty ?? 1;
    const guestsCount = s.guestsCount ?? 2;
    const isAutoBidEligible =
      roomsQty <= hotelProfile.autoBidMaxRooms &&
      guestsCount <= hotelProfile.autoBidMaxGuests;

    const remainingSeconds =
      liveCountdownOverrides[s.id] !== undefined
        ? liveCountdownOverrides[s.id]
        : (s.remainingSeconds ?? hotelProfile.bidTtlSeconds);

    return {
      id: s.id,
      branchId: s.branchId ?? "br_mykhe",
      branchName: s.branchName ?? "CN Mỹ Khê",
      remainingSeconds,
      checkInDateRange,
      stayOffsets,
      checkInUrgent: s.checkInUrgent,
      nights: s.nights,
      roomsQty,
      guestsCount,
      guestSummary: s.guestSummary ?? "2 người lớn",
      mandatoryRoomCategory: s.mandatoryRoomCategory ?? "Superior",
      bedTag: s.bedTag ?? "1 Giường đôi",
      amenities: s.amenities ?? [],
      competitorsCount: s.competitorsCount ?? 2,
      matchedRoomName: s.matchedRoomName ?? rc?.name ?? "Superior Double",
      matchedRoomClassId: s.matchedRoomClassId,
      matchScore: s.matchScore,
      aiSuggestedBasePrice,
      standardSuggestedBasePrice,
      effectiveFloorPrice,
      isTonightCheckIn,
      flashDiscountApplied,
      isAutoBidEligible,
      bidSubmitted: s.bidSubmitted,
    };
  });

  const activeLiveCount = prelimLiveSessions.filter(
    (s) => s.remainingSeconds > 0,
  ).length;

  const pendingLiveBidsCount = prelimLiveSessions.filter(
    (s) => s.remainingSeconds > 0 && Boolean(s.bidSubmitted),
  ).length;

  // 2. Completed Bid Sessions (won + rejected + expired; excludes auto_closed sold-out withdrawals)
  const allChainCompletedSessions = auctionSessions.filter(
    (s) =>
      s.status === "won" || s.status === "rejected" || s.status === "expired",
  );
  const scopedCompletedSessions =
    branchFilter === "all"
      ? allChainCompletedSessions
      : allChainCompletedSessions.filter((s) => s.branchId === branchFilter);

  // 3. Period Metrics (today / 7d / 30d)
  const allPeriods: Record<DateRangeKey, PeriodComputedMetrics> = {
    today: computeSinglePeriod(
      "today",
      bundle,
      scopedCompletedSessions,
      allChainCompletedSessions,
      branchFilter,
      roomBranchLookup,
    ),
    "7d": computeSinglePeriod(
      "7d",
      bundle,
      scopedCompletedSessions,
      allChainCompletedSessions,
      branchFilter,
      roomBranchLookup,
    ),
    "30d": computeSinglePeriod(
      "30d",
      bundle,
      scopedCompletedSessions,
      allChainCompletedSessions,
      branchFilter,
      roomBranchLookup,
    ),
  };
  const periodMetrics = allPeriods[dateRangeKey];

  // 4. Today's Real-Time Paid Orders (referenceDate = 2026-11-06)
  const todayWonSessions = scopedCompletedSessions.filter(
    (s) =>
      s.status === "won" && s.sessionDate === hotelProfile.referenceDate,
  );

  const todayOrders: TodayOrder[] = todayWonSessions.map((s) =>
    mapSessionToOrder(s, hotelProfile.guestPriceMultiplier, roomBranchLookup),
  );

  const todayBaseRevenue = todayOrders.reduce((s, o) => s + o.baseAmount, 0);
  const todayGuestPaidTotal = todayOrders.reduce(
    (s, o) => s + o.guestPaidAmount,
    0,
  );
  const todayTotalNights = todayOrders.reduce((s, o) => s + o.nights, 0);
  const todayBaseAdr =
    todayTotalNights > 0 ? Math.round(todayBaseRevenue / todayTotalNights) : 0;

  // 5. Room Inventory & PMS Matrix (Tonight 06/11/2026, scoped by branchFilter)
  const activeAuctionCountByClass: Record<string, number> = {};
  prelimLiveSessions.forEach((ls) => {
    if (ls.remainingSeconds > 0) {
      activeAuctionCountByClass[ls.matchedRoomClassId] =
        (activeAuctionCountByClass[ls.matchedRoomClassId] ?? 0) + 1;
    }
  });

  const roomInventory: RoomClassInventory[] = roomClasses.map((rc) => {
    const pmsOfClass = scopedRoomsPms
      .filter((r) => r.roomClassId === rc.id)
      .sort((a, b) => a.roomNumber - b.roomNumber);
    const otherChannelBooked = pmsOfClass.filter(
      (r) => r.status === "booked_other",
    ).length;
    const auctionPaidBooked = pmsOfClass.filter(
      (r) => r.status === "booked_auction",
    ).length;
    const dynamicRoomRange =
      branchFilter === "all"
        ? rc.roomRange
        : pmsOfClass.map((r) => `#${r.roomNumber}`).join(", ");
    return {
      id: rc.id,
      name: rc.name,
      category: rc.category,
      roomRange: dynamicRoomRange,
      bedAndCapacity: rc.bedAndCapacity,
      totalRooms: branchFilter === "all" ? rc.totalRooms : pmsOfClass.length,
      otherChannelBooked,
      auctionPaidBooked,
      baseFloorPrice: rc.baseFloorPrice,
      rackRate: rc.rackRate,
    };
  });

  const otherBookedTotal = roomInventory.reduce(
    (s, r) => s + r.otherChannelBooked,
    0,
  );
  const auctionBookedTotal = roomInventory.reduce(
    (s, r) => s + r.auctionPaidBooked,
    0,
  );
  const occupiedCount = otherBookedTotal + auctionBookedTotal;
  const vacantCount = Math.max(0, scopedTotalRooms - occupiedCount);
  const occupancyPct =
    scopedTotalRooms > 0
      ? Math.round((occupiedCount / scopedTotalRooms) * 100)
      : 0;
  const checkOutTomorrowCount = scopedRoomsPms.filter(
    (r) => r.status !== "vacant_unlocked" && r.checkOutTomorrow,
  ).length;

  const roomMatrix: RoomCell[] = scopedRoomsPms
    .slice()
    .sort((a, b) => a.roomNumber - b.roomNumber)
    .map((r) => ({
      roomNumber: r.roomNumber,
      floor: r.floor,
      branchId: r.branchId,
      branchName: r.branchName,
      roomClassId: r.roomClassId,
      roomClass: r.roomClass,
      category: r.category,
      sourceChannel: r.sourceChannel,
      status: r.status,
      linkedReqId: r.linkedReqId,
      checkOutTomorrow: r.checkOutTomorrow,
      activeAuctionCount:
        r.status === "vacant_unlocked"
          ? (activeAuctionCountByClass[r.roomClassId] ?? 0)
          : 0,
    }));

  // 5B. Build 14-Day Room-by-Room Schedule across all 30 rooms first for deterministic consistency, then project onto scopedRoomsPms
  const sortedAllPmsRooms = roomsPms
    .slice()
    .sort((a, b) => a.roomNumber - b.roomNumber);

  const allLiveRecords = auctionSessions.filter((s) => s.status === "live");
  const liveByDayAndClassAll: Record<number, Record<string, string[]>> = {};
  allLiveRecords.forEach((ls) => {
    const rem =
      liveCountdownOverrides[ls.id] !== undefined
        ? liveCountdownOverrides[ls.id]
        : (ls.remainingSeconds ?? hotelProfile.bidTtlSeconds);
    if (rem <= 0) return;
    if (branchFilter !== "all" && ls.branchId !== branchFilter) return;
    const offsets = parseStayDayOffsets(
      ls.checkInDateRange ?? "06/11 – 07/11 (1 đêm)",
      hotelProfile.referenceDate,
      ls.nights,
    );
    offsets.forEach((off) => {
      if (!liveByDayAndClassAll[off]) liveByDayAndClassAll[off] = {};
      if (!liveByDayAndClassAll[off][ls.matchedRoomClassId]) {
        liveByDayAndClassAll[off][ls.matchedRoomClassId] = [];
      }
      liveByDayAndClassAll[off][ls.matchedRoomClassId].push(ls.id);
    });
  });

  const wonStayMap = new Map<
    string,
    { reqId: string; staySpanText: string; checkOutTomorrow: boolean }
  >();
  auctionSessions.forEach((s) => {
    if (s.status !== "won" || s.lockedRoomNumber == null) return;
    const rawStay = s.stayDatesLabel ?? s.checkInDateRange;
    const offsets = parseStayDayOffsets(
      rawStay,
      hotelProfile.referenceDate,
      s.nights,
    );
    if (offsets.length === 0) return;
    const cleanSpan =
      rawStay?.split(" (")[0]?.trim() ||
      `06/11–${String(6 + s.nights).padStart(2, "0")}/11`;
    offsets.forEach((off) => {
      wonStayMap.set(`${s.lockedRoomNumber}:${off}`, {
        reqId: s.id,
        staySpanText: cleanSpan,
        checkOutTomorrow: !offsets.includes(off + 1),
      });
    });
  });

  const OTA_CHANNELS = [
    "Booking.com",
    "Agoda",
    "Traveloka",
    "Lễ tân / Walk-in",
  ];

  const allDay0Other = roomsPms.filter((r) => r.status === "booked_other").length;
  const allDay0Auction = roomsPms.filter(
    (r) => r.status === "booked_auction",
  ).length;
  const allDay0Vacant = Math.max(
    0,
    hotelProfile.totalRooms - allDay0Other - allDay0Auction,
  );

  const baseCalendar14d: Calendar14DayPmsRecord[] = calendar14dPms.map((d) =>
    d.dayOffset === 0
      ? {
          ...d,
          otherBooked: allDay0Other,
          auctionBooked: allDay0Auction,
          vacantRooms: allDay0Vacant,
        }
      : d,
  );

  const fullDailyRoomSchedules: DailyRoomSchedule[] = baseCalendar14d.map(
    (calDay) => {
      const d = calDay.dayOffset;
      const nextDateStr =
        baseCalendar14d[d + 1]?.dateStr ??
        `20/${calDay.dateStr.slice(3, 5)}`;

      if (d === 0) {
        const roomsDay0: DailyRoomCell[] = sortedAllPmsRooms.map((r) => {
          const wonInfo = wonStayMap.get(`${r.roomNumber}:0`);
          const activeIds =
            r.status === "vacant_unlocked"
              ? (liveByDayAndClassAll[0]?.[r.roomClassId] ?? [])
              : [];
          const staySpanText =
            r.status === "booked_auction"
              ? (wonInfo?.staySpanText ??
                (r.checkOutTomorrow ? "05/11–07/11" : "06/11–08/11"))
              : r.status === "booked_other"
                ? r.sourceChannel.includes("Khóa tay")
                  ? `Khóa thủ công ngày ${calDay.dateStr}`
                  : r.checkOutTomorrow
                    ? "05/11–07/11 (CO 12:00)"
                    : "06/11–08/11"
                : `Trống mở khóa ngày ${calDay.dateStr}`;

          return {
            roomNumber: r.roomNumber,
            floor: r.floor,
            branchId: r.branchId,
            branchName: r.branchName,
            roomClassId: r.roomClassId,
            roomClass: r.roomClass,
            category: r.category,
            status: r.status,
            sourceChannel: r.sourceChannel,
            linkedReqId: r.linkedReqId ?? wonInfo?.reqId ?? null,
            staySpanText,
            checkOutTomorrow: r.checkOutTomorrow,
            activeAuctionIds: activeIds,
            activeAuctionCount: activeIds.length,
          };
        });

        return {
          ...calDay,
          rooms: roomsDay0,
        };
      }

      // Future Days (d = 1..13)
      const assigned = new Map<
        number,
        {
          status: "booked_other" | "booked_auction";
          sourceChannel: string;
          linkedReqId: string | null;
          staySpanText: string;
          checkOutTomorrow: boolean;
        }
      >();

      // A. Place explicit multi-night won auctions covering day d
      sortedAllPmsRooms.forEach((r) => {
        const wonInfo = wonStayMap.get(`${r.roomNumber}:${d}`);
        if (wonInfo) {
          assigned.set(r.roomNumber, {
            status: "booked_auction",
            sourceChannel: "goodNstay (Đã TT 100%)",
            linkedReqId: wonInfo.reqId,
            staySpanText: wonInfo.staySpanText,
            checkOutTomorrow: wonInfo.checkOutTomorrow,
          });
        }
      });

      // Reserve at least 1 vacant room per class that has an active live auction on day d
      const reservedVacantSet = new Set<number>();
      roomClasses.forEach((rc) => {
        const liveOnDay = liveByDayAndClassAll[d]?.[rc.id] ?? [];
        if (liveOnDay.length > 0) {
          const candidate = sortedAllPmsRooms
            .filter(
              (r) => r.roomClassId === rc.id && !assigned.has(r.roomNumber),
            )
            .at(-1);
          if (candidate) reservedVacantSet.add(candidate.roomNumber);
        }
      });

      // B. Fill remaining pre-booked auction slots up to calDay.auctionBooked
      let auctionCount = assigned.size;
      const targetAuction = Math.max(auctionCount, calDay.auctionBooked);
      for (let step = 0; step < 30 && auctionCount < targetAuction; step++) {
        const idx = (step * 7 + d * 5 + 5) % sortedAllPmsRooms.length;
        const candidate = sortedAllPmsRooms[idx];
        if (
          assigned.has(candidate.roomNumber) ||
          reservedVacantSet.has(candidate.roomNumber)
        ) {
          continue;
        }
        assigned.set(candidate.roomNumber, {
          status: "booked_auction",
          sourceChannel: "goodNstay (Đã TT 100%)",
          linkedReqId: `CRQ-88${String(50 + d * 3 + step).slice(-2)}`,
          staySpanText: `${calDay.dateStr}–${nextDateStr}`,
          checkOutTomorrow: (step + d) % 2 === 0,
        });
        auctionCount++;
      }

      // C. Carry over non-checkout OTA stayovers on d === 1, keep weekend Suite #129 booked on 07/11–08/11 so #130 is sole vacant Ocean Suite, then fill up to calDay.otherBooked
      let otherCount = 0;
      const targetOther = Math.min(30 - auctionCount, calDay.otherBooked);

      if (d === 1) {
        sortedAllPmsRooms.forEach((r) => {
          if (
            otherCount < targetOther &&
            r.status === "booked_other" &&
            !r.checkOutTomorrow &&
            !assigned.has(r.roomNumber) &&
            !reservedVacantSet.has(r.roomNumber)
          ) {
            assigned.set(r.roomNumber, {
              status: "booked_other",
              sourceChannel: r.sourceChannel,
              linkedReqId: null,
              staySpanText: "06/11–08/11",
              checkOutTomorrow: true,
            });
            otherCount++;
          }
        });
      }

      if ((d === 1 || d === 2) && otherCount < targetOther && !assigned.has(129)) {
        assigned.set(129, {
          status: "booked_other",
          sourceChannel: "Booking.com",
          linkedReqId: null,
          staySpanText: "07/11–09/11",
          checkOutTomorrow: d === 2,
        });
        otherCount++;
      }

      // Deterministic rotation for remaining OTA bookings on day d
      for (const allowReserved of [false, true]) {
        for (let step = 0; step < 30 && otherCount < targetOther; step++) {
          const idx = (step * 7 + d * 3) % sortedAllPmsRooms.length;
          const candidate = sortedAllPmsRooms[idx];
          if (assigned.has(candidate.roomNumber)) continue;
          if (!allowReserved && reservedVacantSet.has(candidate.roomNumber)) {
            continue;
          }
          const ch = OTA_CHANNELS[(candidate.roomNumber + d) % OTA_CHANNELS.length];
          const spanEnd =
            baseCalendar14d[Math.min(13, d + 1 + ((step + d) % 2))]?.dateStr ??
            nextDateStr;
          assigned.set(candidate.roomNumber, {
            status: "booked_other",
            sourceChannel: ch,
            linkedReqId: null,
            staySpanText: `${calDay.dateStr}–${spanEnd}`,
            checkOutTomorrow: (step + d) % 2 === 1,
          });
          otherCount++;
        }
      }

      const dayOverrides = calDay.manualOverrides ?? {};

      const roomsForDay: DailyRoomCell[] = sortedAllPmsRooms.map((r) => {
        const hit = assigned.get(r.roomNumber);
        const manualState = dayOverrides[String(r.roomNumber)];

        // Protect 100% paid auction rooms from manual override
        if (hit?.status === "booked_auction") {
          return {
            roomNumber: r.roomNumber,
            floor: r.floor,
            branchId: r.branchId,
            branchName: r.branchName,
            roomClassId: r.roomClassId,
            roomClass: r.roomClass,
            category: r.category,
            status: "booked_auction",
            sourceChannel: hit.sourceChannel,
            linkedReqId: hit.linkedReqId,
            staySpanText: hit.staySpanText,
            checkOutTomorrow: hit.checkOutTomorrow,
            activeAuctionIds: [],
            activeAuctionCount: 0,
          };
        }

        if (manualState === "booked_other") {
          return {
            roomNumber: r.roomNumber,
            floor: r.floor,
            branchId: r.branchId,
            branchName: r.branchName,
            roomClassId: r.roomClassId,
            roomClass: r.roomClass,
            category: r.category,
            status: "booked_other",
            sourceChannel: "Lễ tân / Khóa tay",
            linkedReqId: null,
            staySpanText: `Khóa thủ công ngày ${calDay.dateStr}`,
            checkOutTomorrow: false,
            activeAuctionIds: [],
            activeAuctionCount: 0,
          };
        }

        if (hit && manualState !== "vacant_unlocked") {
          return {
            roomNumber: r.roomNumber,
            floor: r.floor,
            branchId: r.branchId,
            branchName: r.branchName,
            roomClassId: r.roomClassId,
            roomClass: r.roomClass,
            category: r.category,
            status: hit.status,
            sourceChannel: hit.sourceChannel,
            linkedReqId: hit.linkedReqId,
            staySpanText: hit.staySpanText,
            checkOutTomorrow: hit.checkOutTomorrow,
            activeAuctionIds: [],
            activeAuctionCount: 0,
          };
        }

        const activeIds = liveByDayAndClassAll[d]?.[r.roomClassId] ?? [];
        return {
          roomNumber: r.roomNumber,
          floor: r.floor,
          branchId: r.branchId,
          branchName: r.branchName,
          roomClassId: r.roomClassId,
          roomClass: r.roomClass,
          category: r.category,
          status: "vacant_unlocked",
          sourceChannel: "Trống · Mở đấu giá",
          linkedReqId: null,
          staySpanText: `Trống mở khóa ngày ${calDay.dateStr}`,
          checkOutTomorrow: false,
          activeAuctionIds: activeIds,
          activeAuctionCount: activeIds.length,
        };
      });

      const finalOther = roomsForDay.filter(
        (x) => x.status === "booked_other",
      ).length;
      const finalAuction = roomsForDay.filter(
        (x) => x.status === "booked_auction",
      ).length;
      const finalVacant = roomsForDay.length - finalOther - finalAuction;

      return {
        ...calDay,
        otherBooked: finalOther,
        auctionBooked: finalAuction,
        vacantRooms: finalVacant,
        rooms: roomsForDay,
      };
    },
  );

  const dailyRoomSchedules: DailyRoomSchedule[] =
    branchFilter === "all"
      ? fullDailyRoomSchedules
      : fullDailyRoomSchedules.map((sched) => {
          const scopedRooms = sched.rooms.filter((r) =>
            scopedRoomSet.has(r.roomNumber),
          );
          const otherBooked = scopedRooms.filter(
            (r) => r.status === "booked_other",
          ).length;
          const auctionBooked = scopedRooms.filter(
            (r) => r.status === "booked_auction",
          ).length;
          const vacantRooms = Math.max(
            0,
            scopedRooms.length - otherBooked - auctionBooked,
          );
          return {
            ...sched,
            totalRooms: scopedRooms.length,
            otherBooked,
            auctionBooked,
            vacantRooms,
            rooms: scopedRooms,
          };
        });

  // Sync 14-day chart directly from actual room schedules
  const golden14ChartData: Calendar14DayPmsRecord[] = dailyRoomSchedules.map(
    ({ rooms: _rooms, ...summary }) => summary,
  );

  // Enrich LiveSessions with exact stay-date vacancy & overlapping live contests
  const liveSessions: LiveSession[] = prelimLiveSessions.map((ls) => {
    const offsets = ls.stayOffsets.length > 0 ? ls.stayOffsets : [0];
    const vacantCountsAcrossStay = offsets.map((off) => {
      const sched = dailyRoomSchedules[off];
      if (!sched) return 0;
      return sched.rooms.filter(
        (r) =>
          r.roomClassId === ls.matchedRoomClassId &&
          r.status === "vacant_unlocked",
      ).length;
    });
    const vacantForStay =
      vacantCountsAcrossStay.length > 0
        ? Math.min(...vacantCountsAcrossStay)
        : 0;

    const overlappingLive = prelimLiveSessions.filter(
      (other) =>
        other.remainingSeconds > 0 &&
        other.matchedRoomClassId === ls.matchedRoomClassId &&
        other.stayOffsets.some((o) => offsets.includes(o)),
    ).length;

    const { stayOffsets: _omitOffsets, ...rest } = ls;
    return {
      ...rest,
      vacantForStay,
      concurrentForStay: Math.max(1, overlappingLive),
    };
  });

  // 6. Active Period Range & History Table Rows (all non-live sessions within selected period & branch, newest first)
  const activePeriodRange = systemBenchmarks.periodsMeta[dateRangeKey];

  const historySessions: HistorySession[] = auctionSessions
    .filter(
      (s) =>
        s.status !== "live" &&
        (branchFilter === "all" || s.branchId === branchFilter) &&
        s.sessionDate >= activePeriodRange.startDate &&
        s.sessionDate <= activePeriodRange.endDate,
    )
    .sort((a, b) => {
      const dateCmp = b.sessionDate.localeCompare(a.sessionDate);
      if (dateCmp !== 0) return dateCmp;
      return (b.timeLabel ?? "").localeCompare(a.timeLabel ?? "");
    })
    .map((s) => {
      const rc = roomClasses.find((r) => r.id === s.matchedRoomClassId);
      const roomBr =
        s.lockedRoomNumber != null
          ? roomBranchLookup.get(s.lockedRoomNumber)
          : undefined;
      return {
        id: s.id,
        branchId: roomBr?.branchId ?? s.branchId ?? "br_mykhe",
        branchName: roomBr?.branchName ?? s.branchName ?? "CN Mỹ Khê",
        sessionDate: s.sessionDate,
        dateTimeLabel:
          s.dateTimeLabel ??
          `${s.sessionDate.slice(8, 10)}/${s.sessionDate.slice(5, 7)} • ${s.timeLabel}`,
        stayDatesLabel:
          s.stayDatesLabel ??
          s.checkInDateRange?.split(" (")[0] ??
          `${s.nights} đêm`,
        guestRequestTitle:
          s.guestRequestTitle ?? s.guestSummary ?? "2 người lớn",
        amenitiesTags: s.amenitiesTags ?? s.amenities ?? ["Wifi"],
        nights: s.nights,
        roomCategory:
          s.roomCategory ??
          s.mandatoryRoomCategory ??
          rc?.category ??
          "Superior",
        offeredRoom:
          s.offeredRoom ?? s.matchedRoomName ?? rc?.name ?? "Superior Double",
        offeredBasePrice:
          s.offeredBasePrice ??
          s.bidSubmitted?.basePrice ??
          s.aiSuggestedBasePrice ??
          rc?.baseFloorPrice ??
          800000,
        matchScore: s.matchScore,
        closeSpeedText: s.closeSpeedText ?? "04p 00s",
        speedNote: s.speedNote,
        status: s.status as HistorySession["status"],
        hotelEarnedBase: s.hotelEarnedBase,
        guestPaidTotal: s.guestPaidTotal,
        resultNote:
          s.resultNote ??
          (s.status === "won"
            ? `Đã TT 100%${s.lockedRoomNumber ? ` · Khóa #${s.lockedRoomNumber}` : ""}`
            : s.status === "rejected"
              ? "Khách chọn đề xuất khác phù hợp hơn"
              : s.status === "expired"
                ? "Quá 60 phút không phát sinh thanh toán"
                : ""),
        autopsyId: s.autopsyId ?? "CRQ-8924",
      };
    });

  // 7. Benchmark Chart Data (Hotel vs System for selected dateRangeKey)
  const sessionsInActiveRange = scopedCompletedSessions.filter(
    (s) =>
      s.sessionDate >= activePeriodRange.startDate &&
      s.sessionDate <= activePeriodRange.endDate,
  );

  const benchmarkChartData: BenchmarkRowComputed[] =
    systemBenchmarks.roomClassBenchmarks.map((b) => {
      const classBids = sessionsInActiveRange.filter(
        (s) => s.matchedRoomClassId === b.roomClassId,
      );
      const classWins = classBids.filter((s) => s.status === "won");

      const bids = classBids.length;
      const wins = classWins.length;
      const hotelWinPct =
        bids > 0 ? Number(((wins / bids) * 100).toFixed(1)) : 0;
      const sysAvgPct = b.systemAvgWinRatePct[dateRangeKey];
      const deltaPct = Number((hotelWinPct - sysAvgPct).toFixed(1));

      const seedHotelWins = b.baselineHotelWins?.[dateRangeKey] ?? wins;
      const extraHotelWins =
        branchFilter === "all" ? Math.max(0, wins - seedHotelWins) : 0;
      const sysTotalWins = Math.max(
        wins,
        b.systemTotalWinsRegion[dateRangeKey] + extraHotelWins,
      );
      const regionSharePct =
        sysTotalWins > 0
          ? Number(((wins / sysTotalWins) * 100).toFixed(1))
          : 0;

      const hotelAvgBasePrice =
        classBids.length > 0
          ? Math.round(
              classBids.reduce(
                (sum, s) => sum + (s.offeredBasePrice ?? b.systemAvgBasePrice),
                0,
              ) / classBids.length,
            )
          : b.systemAvgBasePrice;

      return {
        roomClassId: b.roomClassId,
        category: b.category,
        roomName: b.roomName,
        bids,
        wins,
        hotelWinPct,
        sysAvgPct,
        deltaPct,
        sysTotalWins,
        regionSharePct,
        hotelAvgBasePrice,
        systemAvgBasePrice: b.systemAvgBasePrice,
      };
    });

  // 8. Period-Reactive Revenue & Paid Orders Trend (Today intraday slots | 7d | 30d)
  let dailyRevenueTrend: DailyRevenueTrendPoint[] = [];
  let revenueTrendSubtitle = "";

  if (dateRangeKey === "today") {
    revenueTrendSubtitle = `Theo khung giờ hôm nay (${activePeriodRange.rangeText})`;
    const buckets = [
      { key: "06-09", label: "06–09h", minH: 0, maxH: 8 },
      { key: "09-12", label: "09–12h", minH: 9, maxH: 11 },
      { key: "12-15", label: "12–15h", minH: 12, maxH: 14 },
      { key: "15-18", label: "15–18h", minH: 15, maxH: 17 },
      { key: "18-21", label: "18–21h", minH: 18, maxH: 20 },
      { key: "21-24", label: "21–24h", minH: 21, maxH: 23 },
    ];
    const winsToday = sessionsInActiveRange.filter((s) => s.status === "won");
    dailyRevenueTrend = buckets.map((b) => {
      const slotWins = winsToday.filter((s) => {
        const hourMatch = s.timeLabel?.match(/^(\d{1,2})/);
        const h = hourMatch ? Number(hourMatch[1]) : 19;
        return h >= b.minH && h <= b.maxH;
      });
      const baseRev = slotWins.reduce(
        (sum, s) =>
          sum +
          (s.hotelEarnedBase ??
            (s.offeredBasePrice ?? 0) * s.nights * (s.roomsQty ?? 1)),
        0,
      );
      return {
        isoDate: `${hotelProfile.referenceDate}-${b.key}`,
        date: b.label,
        baseRevenueVnd: baseRev,
        baseRevenueM: Number((baseRev / 1_000_000).toFixed(2)),
        paidOrders: slotWins.length,
      };
    });
  } else {
    const startMs = Date.parse(`${activePeriodRange.startDate}T00:00:00Z`);
    const endMs = Date.parse(`${activePeriodRange.endDate}T00:00:00Z`);
    const daysCount = Math.max(
      1,
      Math.round((endMs - startMs) / 86_400_000) + 1,
    );
    revenueTrendSubtitle = `${activePeriodRange.shortLabel} (${activePeriodRange.rangeText})`;
    const trendDates: string[] = [];
    for (let i = 0; i < daysCount; i++) {
      const dt = new Date(startMs + i * 86_400_000);
      trendDates.push(dt.toISOString().slice(0, 10));
    }
    dailyRevenueTrend = trendDates.map((iso) => {
      const dayWins = sessionsInActiveRange.filter(
        (s) => s.status === "won" && s.sessionDate === iso,
      );
      const baseRev = dayWins.reduce(
        (sum, s) =>
          sum +
          (s.hotelEarnedBase ??
            (s.offeredBasePrice ?? 0) * s.nights * (s.roomsQty ?? 1)),
        0,
      );
      return {
        isoDate: iso,
        date: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
        baseRevenueVnd: baseRev,
        baseRevenueM: Number((baseRev / 1_000_000).toFixed(2)),
        paidOrders: dayWins.length,
      };
    });
  }

  // 9. Period-Reactive Loss Reasons Pareto + 30d reference
  const periodLossesList = sessionsInActiveRange.filter(
    (s) => s.status !== "won",
  );
  const periodTotalLosses = periodLossesList.length;
  const periodLossReasons: LossReasonComputed[] =
    systemBenchmarks.lossReasonsCatalog
      .map((cat) => {
        const cnt = periodLossesList.filter(
          (s) => s.lossReasonId === cat.id,
        ).length;
        const pct =
          periodTotalLosses > 0
            ? Number(((cnt / periodTotalLosses) * 100).toFixed(1))
            : 0;
        return {
          ...cat,
          sessions: cnt,
          pct,
        };
      })
      .sort((a, b) => b.sessions - a.sessions);

  const meta30d = systemBenchmarks.periodsMeta["30d"];
  const losses30dList = scopedCompletedSessions.filter(
    (s) =>
      s.status !== "won" &&
      s.sessionDate >= meta30d.startDate &&
      s.sessionDate <= meta30d.endDate,
  );
  const totalLosses30d = losses30dList.length;

  const lossReasons30d: LossReasonComputed[] = systemBenchmarks.lossReasonsCatalog
    .map((cat) => {
      const cnt = losses30dList.filter((s) => s.lossReasonId === cat.id).length;
      const pct =
        totalLosses30d > 0
          ? Number(((cnt / totalLosses30d) * 100).toFixed(1))
          : 0;
      return {
        ...cat,
        sessions: cnt,
        pct,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  return {
    branchFilter,
    activeBranchLabel,
    scopedTotalRooms,
    activeFloorPrice,
    periodMetrics,
    allPeriods,
    todayBaseRevenue,
    todayGuestPaidTotal,
    todayOrders,
    todayTotalNights,
    todayBaseAdr,
    roomInventory,
    occupiedCount,
    otherBookedTotal,
    auctionBookedTotal,
    vacantCount,
    occupancyPct,
    checkOutTomorrowCount,
    activeAuctionCountByClass,
    roomMatrix,
    golden14ChartData,
    dailyRoomSchedules,
    liveSessions,
    activeLiveCount,
    pendingLiveBidsCount,
    historySessions,
    benchmarkChartData,
    dailyRevenueTrend,
    revenueTrendSubtitle,
    periodLossReasons,
    periodTotalLosses,
    lossReasons30d,
    totalLosses30d,
  };
}

export function resolveMatchBreakdown(
  reqId: string,
  bundle: MasterDataBundle,
): MatchBreakdown {
  if (bundle.matchBreakdowns[reqId]) {
    return bundle.matchBreakdowns[reqId];
  }

  const session = bundle.auctionSessions.find((s) => s.id === reqId);
  const rc = bundle.roomClasses.find(
    (r) => r.id === session?.matchedRoomClassId,
  );
  const score = session?.matchScore ?? 92;

  return {
    reqId,
    score,
    sub: `Phiên #${reqId} • Hạng đối chiếu: ${rc?.name ?? "Superior Double"}`,
    title:
      score >= 90
        ? "Đạt chuẩn Hard Rules & Độ khớp tiện ích cao"
        : "Đạt Hard Rules • Có thể bù thêm đặc quyền mềm",
    items: [
      {
        name: "Điều kiện Cứng (Hard Rule): Khu vực & Hạng phòng",
        guest: `${bundle.hotelProfile.city} • Hạng ${session?.roomCategory ?? session?.mandatoryRoomCategory ?? rc?.category ?? "Superior"}`,
        hotel: `${rc?.name ?? "Superior Double"} (${rc?.roomRange ?? "#101–#110"})`,
        status: "match",
        label: "Đạt chuẩn cứng",
      },
      {
        name: "Cấu hình Giường & Sức chứa",
        guest: session?.bedTag ?? "Giường tiêu chuẩn • 2 người lớn",
        hotel: rc?.bedAndCapacity ?? "Tiêu chuẩn 4 sao",
        status: "match",
        label: "Khớp 100%",
      },
      {
        name: "Tiện nghi đi kèm (Soft Preferences)",
        guest:
          (session?.amenities ?? session?.amenitiesTags ?? ["Bữa sáng", "Wifi"]).join(
            ", ",
          ),
        hotel: (rc?.includedAmenities ?? ["Wifi", "Hồ bơi"]).join(", "),
        status: score >= 90 ? "match" : "warn",
        label: score >= 90 ? "Khớp tốt" : "Nên kèm quà",
      },
    ],
    tip: "Dữ liệu đối chiếu tự động từ bảng auction_sessions.json & room_classes.json trên Master Data.",
    suggestedPerkId: score < 95 ? "perk_bf" : undefined,
  };
}

export type BenchmarkRoomFilter = "all" | "sup" | "dlx" | "fsuite" | "osuite";
export type BenchmarkPriceFilter =
  | "all"
  | "competitive"
  | "near_market"
  | "above_market";
export type BenchmarkBidModeFilter = "all" | "auto" | "manual";
export type BenchmarkTimeSlotFilter = "all" | TimeSlotType;
export type BenchmarkMetricMode = "win_rate" | "base_price";

export interface BenchmarkLineFilters {
  roomClass: BenchmarkRoomFilter;
  pricePosition: BenchmarkPriceFilter;
  bidMode: BenchmarkBidModeFilter;
  timeSlot: BenchmarkTimeSlotFilter;
}

export interface BenchmarkTrendPoint {
  bucketKey: string;
  label: string;
  fullLabel: string;
  bids: number;
  wins: number;
  hotelWinPct: number | null;
  sysWinPct: number;
  deltaWinPct: number | null;
  hotelAvgBasePrice: number | null;
  sysAvgBasePrice: number;
  hotelAvgBasePriceK: number | null;
  sysAvgBasePriceK: number;
  deltaPriceVnd: number | null;
}

export interface BenchmarkTrendAnalysis {
  bucketUnitLabel: string;
  scopeLabel: string;
  activeFiltersCount: number;
  points: BenchmarkTrendPoint[];
  totalBids: number;
  totalWins: number;
  hotelWinPct: number | null;
  sysAvgWinPct: number;
  deltaWinPct: number | null;
  hotelAvgBasePrice: number | null;
  sysAvgBasePrice: number;
  deltaPriceVnd: number | null;
  regionTotalWins: number;
  regionSharePct: number;
}

export function computeBenchmarkTrendSeries(
  bundle: MasterDataBundle,
  dateRangeKey: DateRangeKey,
  filters: BenchmarkLineFilters,
  branchFilter: BranchFilter = "all",
): BenchmarkTrendAnalysis {
  const { systemBenchmarks, auctionSessions, hotelProfile } = bundle;
  const activePeriod = systemBenchmarks.periodsMeta[dateRangeKey];

  const classBenchMap = new Map(
    systemBenchmarks.roomClassBenchmarks.map((b) => [b.roomClassId, b]),
  );

  const completedInPeriod = auctionSessions.filter(
    (s) =>
      (s.status === "won" ||
        s.status === "rejected" ||
        s.status === "expired") &&
      s.sessionDate >= activePeriod.startDate &&
      s.sessionDate <= activePeriod.endDate &&
      (branchFilter === "all" || s.branchId === branchFilter),
  );

  const matchesPriceFilter = (s: AuctionSessionMasterRecord): boolean => {
    if (filters.pricePosition === "all") return true;
    const sysBase =
      classBenchMap.get(s.matchedRoomClassId)?.systemAvgBasePrice ?? 1_000_000;
    const offered = s.offeredBasePrice ?? sysBase;
    const upperNear = Math.round(sysBase * 1.05);
    if (filters.pricePosition === "competitive") {
      return offered <= sysBase;
    }
    if (filters.pricePosition === "near_market") {
      return offered > sysBase && offered <= upperNear;
    }
    return offered > upperNear;
  };

  const filteredSessions = completedInPeriod.filter((s) => {
    if (
      filters.roomClass !== "all" &&
      s.matchedRoomClassId !== filters.roomClass
    ) {
      return false;
    }
    if (!matchesPriceFilter(s)) {
      return false;
    }
    if (filters.bidMode === "auto" && s.bidMode !== "auto") {
      return false;
    }
    if (filters.bidMode === "manual" && s.bidMode === "auto") {
      return false;
    }
    if (filters.timeSlot !== "all" && s.timeSlot !== filters.timeSlot) {
      return false;
    }
    return true;
  });

  const activeFiltersCount = [
    filters.roomClass !== "all",
    filters.pricePosition !== "all",
    filters.bidMode !== "all",
    filters.timeSlot !== "all",
  ].filter(Boolean).length;

  const selectedClassBench =
    filters.roomClass !== "all"
      ? classBenchMap.get(filters.roomClass)
      : undefined;

  // 1. Baseline System Win Rate (%) + Peer Segment Adjustment
  const baseSysWinPct = selectedClassBench
    ? selectedClassBench.systemAvgWinRatePct[dateRangeKey]
    : activePeriod.platformWinRatePct;

  const priceWinAdj =
    filters.pricePosition === "competitive"
      ? 14.5
      : filters.pricePosition === "near_market"
        ? -12.5
        : filters.pricePosition === "above_market"
          ? -23.0
          : 0;

  const modeWinAdj =
    filters.bidMode === "auto" ? 5.2 : filters.bidMode === "manual" ? -4.2 : 0;

  const slotWinAdj =
    filters.timeSlot === "evening_peak"
      ? 1.8
      : filters.timeSlot === "lunch_peak"
        ? 0.6
        : filters.timeSlot === "off_peak"
          ? -2.2
          : 0;

  const sysAvgWinPct = Number(
    Math.min(
      88,
      Math.max(6, baseSysWinPct + priceWinAdj + modeWinAdj + slotWinAdj),
    ).toFixed(1),
  );

  // 2. Baseline System Price (VND) + Price Segment Multiplier
  const priceSegmentMult =
    filters.pricePosition === "competitive"
      ? 0.96
      : filters.pricePosition === "near_market"
        ? 1.03
        : filters.pricePosition === "above_market"
          ? 1.09
          : 1.0;

  const totalRegWinsAllClasses = systemBenchmarks.roomClassBenchmarks.reduce(
    (sum, b) => sum + b.systemTotalWinsRegion[dateRangeKey],
    0,
  );
  const regionalWeightedBasePrice =
    totalRegWinsAllClasses > 0
      ? Math.round(
          systemBenchmarks.roomClassBenchmarks.reduce(
            (sum, b) =>
              sum +
              b.systemAvgBasePrice * b.systemTotalWinsRegion[dateRangeKey],
            0,
          ) / totalRegWinsAllClasses,
        )
      : 1_250_000;

  const computeSubsetMatchedSysPrice = (
    subset: AuctionSessionMasterRecord[],
  ): number => {
    if (selectedClassBench) {
      return Math.round(
        selectedClassBench.systemAvgBasePrice * priceSegmentMult,
      );
    }
    if (subset.length === 0) {
      return Math.round(regionalWeightedBasePrice * priceSegmentMult);
    }
    const rawAvg =
      subset.reduce(
        (sum, s) =>
          sum +
          (classBenchMap.get(s.matchedRoomClassId)?.systemAvgBasePrice ??
            regionalWeightedBasePrice),
        0,
      ) / subset.length;
    return Math.round(rawAvg * priceSegmentMult);
  };

  // 3. Build Time Buckets by Period (Today: 6 slots | 7d: 7 days | 30d: 6 x 5-day windows)
  interface RawBucketDef {
    key: string;
    label: string;
    fullLabel: string;
    winWaveOffset: number;
    priceWavePct: number;
    sessions: AuctionSessionMasterRecord[];
  }

  let bucketUnitLabel = "";
  let rawBuckets: RawBucketDef[] = [];

  if (dateRangeKey === "today") {
    bucketUnitLabel = "Theo 6 khung giờ trong ngày";
    const slotBuckets = [
      {
        key: "06-09",
        label: "06–09h",
        fullLabel: `Khung 06:00 – 09:00 (${activePeriod.rangeText})`,
        minH: 0,
        maxH: 8,
        winWaveOffset: -2.4,
        priceWavePct: -0.015,
      },
      {
        key: "09-12",
        label: "09–12h",
        fullLabel: `Khung 09:00 – 12:00 (${activePeriod.rangeText})`,
        minH: 9,
        maxH: 11,
        winWaveOffset: -0.8,
        priceWavePct: -0.005,
      },
      {
        key: "12-15",
        label: "12–15h",
        fullLabel: `Cao điểm trưa 12:00 – 15:00 (${activePeriod.rangeText})`,
        minH: 12,
        maxH: 14,
        winWaveOffset: 1.6,
        priceWavePct: 0.008,
      },
      {
        key: "15-18",
        label: "15–18h",
        fullLabel: `Khung chiều 15:00 – 18:00 (${activePeriod.rangeText})`,
        minH: 15,
        maxH: 17,
        winWaveOffset: -1.2,
        priceWavePct: -0.006,
      },
      {
        key: "18-21",
        label: "18–21h",
        fullLabel: `Cao điểm tối 18:00 – 21:00 (${activePeriod.rangeText})`,
        minH: 18,
        maxH: 20,
        winWaveOffset: 2.6,
        priceWavePct: 0.014,
      },
      {
        key: "21-24",
        label: "21–24h",
        fullLabel: `Đêm muộn 21:00 – 24:00 (${activePeriod.rangeText})`,
        minH: 21,
        maxH: 23,
        winWaveOffset: 0.2,
        priceWavePct: 0.004,
      },
    ];
    rawBuckets = slotBuckets.map((b) => ({
      key: `${hotelProfile.referenceDate}-${b.key}`,
      label: b.label,
      fullLabel: b.fullLabel,
      winWaveOffset: b.winWaveOffset,
      priceWavePct: b.priceWavePct,
      sessions: filteredSessions.filter((s) => {
        const hourMatch = s.timeLabel?.match(/^(\d{1,2})/);
        const h = hourMatch ? Number(hourMatch[1]) : 19;
        return h >= b.minH && h <= b.maxH;
      }),
    }));
  } else if (dateRangeKey === "7d") {
    bucketUnitLabel = "Theo từng ngày (7 ngày)";
    const startMs = Date.parse(`${activePeriod.startDate}T00:00:00Z`);
    const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    // Zero-sum natural market rhythm across 7 days (Sat 31/10 -> Fri 06/11)
    const winWaves7d = [2.2, 1.4, -2.0, -1.8, -1.1, -0.5, 1.8];
    const priceWaves7d = [0.018, 0.01, -0.016, -0.014, -0.008, -0.004, 0.014];

    for (let i = 0; i < 7; i++) {
      const dt = new Date(startMs + i * 86_400_000);
      const iso = dt.toISOString().slice(0, 10);
      const ddmm = `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
      const wd = weekdayNames[dt.getUTCDay()];
      rawBuckets.push({
        key: iso,
        label: ddmm,
        fullLabel: `${wd}, ngày ${ddmm}/${iso.slice(0, 4)}`,
        winWaveOffset: winWaves7d[i] ?? 0,
        priceWavePct: priceWaves7d[i] ?? 0,
        sessions: filteredSessions.filter((s) => s.sessionDate === iso),
      });
    }
  } else {
    bucketUnitLabel = "Theo 6 chặng (5 ngày/chặng)";
    const startMs = Date.parse(`${activePeriod.startDate}T00:00:00Z`);
    // Zero-sum natural market rhythm across 6 x 5-day windows (08/10 -> 06/11)
    const winWaves30d = [-2.1, -0.9, 0.4, 1.8, -0.6, 1.4];
    const priceWaves30d = [-0.018, -0.008, 0.005, 0.015, -0.006, 0.012];

    for (let i = 0; i < 6; i++) {
      const bStartDt = new Date(startMs + i * 5 * 86_400_000);
      const bEndDt = new Date(startMs + (i * 5 + 4) * 86_400_000);
      const sIso = bStartDt.toISOString().slice(0, 10);
      const eIso = bEndDt.toISOString().slice(0, 10);
      const sShort = `${sIso.slice(8, 10)}/${sIso.slice(5, 7)}`;
      const eShort = `${eIso.slice(8, 10)}/${eIso.slice(5, 7)}`;
      const sameMonth = sIso.slice(5, 7) === eIso.slice(5, 7);
      const compactLabel = sameMonth
        ? `${sIso.slice(8, 10)}–${eShort}`
        : `${sShort}–${eShort}`;

      rawBuckets.push({
        key: `${sIso}_${eIso}`,
        label: compactLabel,
        fullLabel: `Chặng ${sShort} – ${eShort}/2026`,
        winWaveOffset: winWaves30d[i] ?? 0,
        priceWavePct: priceWaves30d[i] ?? 0,
        sessions: filteredSessions.filter(
          (s) => s.sessionDate >= sIso && s.sessionDate <= eIso,
        ),
      });
    }
  }

  const points: BenchmarkTrendPoint[] = rawBuckets.map((rb) => {
    const bids = rb.sessions.length;
    const wins = rb.sessions.filter((s) => s.status === "won").length;
    const hotelWinPct =
      bids > 0 ? Number(((wins / bids) * 100).toFixed(1)) : null;

    const sysWinPct = Number(
      Math.min(92, Math.max(5, sysAvgWinPct + rb.winWaveOffset)).toFixed(1),
    );
    const deltaWinPct =
      hotelWinPct !== null
        ? Number((hotelWinPct - sysWinPct).toFixed(1))
        : null;

    const baseBucketSysPrice = computeSubsetMatchedSysPrice(rb.sessions);
    const sysAvgBasePrice =
      Math.round((baseBucketSysPrice * (1 + rb.priceWavePct)) / 1000) * 1000;

    const hotelAvgBasePrice =
      bids > 0
        ? Math.round(
            rb.sessions.reduce(
              (sum, s) =>
                sum +
                (s.offeredBasePrice ??
                  classBenchMap.get(s.matchedRoomClassId)?.systemAvgBasePrice ??
                  baseBucketSysPrice),
              0,
            ) / bids,
          )
        : null;

    const deltaPriceVnd =
      hotelAvgBasePrice !== null ? hotelAvgBasePrice - sysAvgBasePrice : null;

    return {
      bucketKey: rb.key,
      label: rb.label,
      fullLabel: rb.fullLabel,
      bids,
      wins,
      hotelWinPct,
      sysWinPct,
      deltaWinPct,
      hotelAvgBasePrice,
      sysAvgBasePrice,
      hotelAvgBasePriceK:
        hotelAvgBasePrice !== null ? Math.round(hotelAvgBasePrice / 1000) : null,
      sysAvgBasePriceK: Math.round(sysAvgBasePrice / 1000),
      deltaPriceVnd,
    };
  });

  // 4. Period Aggregates for Footer Summary
  const totalBids = filteredSessions.length;
  const totalWins = filteredSessions.filter((s) => s.status === "won").length;
  const hotelWinPct =
    totalBids > 0 ? Number(((totalWins / totalBids) * 100).toFixed(1)) : null;
  const deltaWinPct =
    hotelWinPct !== null
      ? Number((hotelWinPct - sysAvgWinPct).toFixed(1))
      : null;

  const sysAvgBasePrice = computeSubsetMatchedSysPrice(filteredSessions);
  const hotelAvgBasePrice =
    totalBids > 0
      ? Math.round(
          filteredSessions.reduce(
            (sum, s) =>
              sum +
              (s.offeredBasePrice ??
                classBenchMap.get(s.matchedRoomClassId)?.systemAvgBasePrice ??
                sysAvgBasePrice),
            0,
          ) / totalBids,
        )
      : null;
  const deltaPriceVnd =
    hotelAvgBasePrice !== null ? hotelAvgBasePrice - sysAvgBasePrice : null;

  // Regional share for selected room class (or all classes combined)
  const relevantClassBenchmarks = selectedClassBench
    ? [selectedClassBench]
    : systemBenchmarks.roomClassBenchmarks;

  const regionTotalWins = relevantClassBenchmarks.reduce((sum, b) => {
    const classAllWinsInPeriod = completedInPeriod.filter(
      (s) => s.matchedRoomClassId === b.roomClassId && s.status === "won",
    ).length;
    const seedWins =
      b.baselineHotelWins?.[dateRangeKey] ?? classAllWinsInPeriod;
    const extraWins = Math.max(0, classAllWinsInPeriod - seedWins);
    return (
      sum +
      Math.max(
        classAllWinsInPeriod,
        b.systemTotalWinsRegion[dateRangeKey] + extraWins,
      )
    );
  }, 0);

  const regionSharePct =
    regionTotalWins > 0
      ? Number(((totalWins / regionTotalWins) * 100).toFixed(1))
      : 0;

  const scopeLabel = selectedClassBench
    ? `Hạng ${selectedClassBench.category}`
    : "Toàn khách sạn";

  return {
    bucketUnitLabel,
    scopeLabel,
    activeFiltersCount,
    points,
    totalBids,
    totalWins,
    hotelWinPct,
    sysAvgWinPct,
    deltaWinPct,
    hotelAvgBasePrice,
    sysAvgBasePrice,
    deltaPriceVnd,
    regionTotalWins,
    regionSharePct,
  };
}

