import {
  calcGuestTotalFromBase,
  parseStayDayOffsets,
  type AuctionSessionMasterRecord,
  type Calendar14DayPmsRecord,
  type DailyRoomCell,
  type DailyRoomSchedule,
  type DateRangeKey,
  type HistorySession,
  type LiveSession,
  type LossReasonId,
  type MasterDataBundle,
  type MatchBreakdown,
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
  baseRevenue: number;
  guestPaidTotal: number;
  sharePct: number;
  barColorClass: string;
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

export interface PeriodComputedMetrics {
  key: DateRangeKey;
  shortLabel: string;
  rangeText: string;
  startDate: string;
  endDate: string;
  baseRevenue: number;
  medicalRefund: number;
  medicalRefundCases: { id: string; date: string; amount: number; note: string }[];
  netReceive: number;
  guestPaidTotal: number;
  platformFeeAndVatTotal: number;
  previousNetRevenue: number;
  growthPct: number;
  bidsSent: number;
  autoBidsCount: number;
  manualBidsCount: number;
  paidWonCount: number;
  winRatePct: number;
  platformWinRatePct: number;
  roomNightsSold: number;
  periodBaseAdr: number;
  guestOpenedCount: number;
  guestOpenedRatePct: number;
  avgCloseMinutes: number;
  roomClassRevenueShares: RoomClassRevenueShare[];
  manualStats: BidModePerformance;
  autoBidStats: BidModePerformance;
  timeSlotDensity: TimeSlotDensityItem[];
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
  // Tab 2 Charts & Benchmarks
  benchmarkChartData: BenchmarkRowComputed[];
  dailyRevenueTrend: DailyRevenueTrendPoint[];
  lossReasons30d: LossReasonComputed[];
  totalLosses30d: number;
}

const BAR_COLORS: Record<string, string> = {
  sup: "bg-zinc-950",
  dlx: "bg-zinc-700",
  fsuite: "bg-emerald-600",
  osuite: "bg-amber-500",
};

function computeSinglePeriod(
  key: DateRangeKey,
  bundle: MasterDataBundle,
  completedSessions: AuctionSessionMasterRecord[],
): PeriodComputedMetrics {
  const meta = bundle.systemBenchmarks.periodsMeta[key];
  const multiplier = bundle.hotelProfile.guestPriceMultiplier;

  const inPeriod = completedSessions.filter(
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

  const medicalRefundCases = wonInPeriod
    .filter((s) => (s.medicalRefund ?? 0) > 0)
    .map((s) => ({
      id: s.id,
      date: s.sessionDate,
      amount: s.medicalRefund ?? 0,
      note:
        s.medicalRefundNote ??
        "Hoàn tiền bất khả kháng y tế theo Mục 5.3 Optibide",
    }));

  const medicalRefund = medicalRefundCases.reduce((s, c) => s + c.amount, 0);
  const netReceive = baseRevenue - medicalRefund;

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

  const growthPct =
    meta.previousNetRevenue > 0
      ? Number(
          (
            ((netReceive - meta.previousNetRevenue) / meta.previousNetRevenue) *
            100
          ).toFixed(1),
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

  return {
    key,
    shortLabel: meta.shortLabel,
    rangeText: meta.rangeText,
    startDate: meta.startDate,
    endDate: meta.endDate,
    baseRevenue,
    medicalRefund,
    medicalRefundCases,
    netReceive,
    guestPaidTotal,
    platformFeeAndVatTotal,
    previousNetRevenue: meta.previousNetRevenue,
    growthPct,
    bidsSent,
    autoBidsCount: autoSessions.length,
    manualBidsCount: manualSessions.length,
    paidWonCount,
    winRatePct,
    platformWinRatePct: meta.platformWinRatePct,
    roomNightsSold,
    periodBaseAdr,
    guestOpenedCount,
    guestOpenedRatePct,
    avgCloseMinutes,
    roomClassRevenueShares,
    manualStats: buildModePerf(manualSessions),
    autoBidStats: buildModePerf(autoSessions),
    timeSlotDensity,
  };
}

export function computeDashboardAnalytics(
  bundle: MasterDataBundle,
  dateRangeKey: DateRangeKey,
  liveCountdownOverrides: Record<string, number>,
): ComputedDashboardAnalytics {
  const {
    hotelProfile,
    roomClasses,
    roomsPms,
    calendar14dPms,
    systemBenchmarks,
    auctionSessions,
  } = bundle;

  const activeFloorPrice = hotelProfile.nightFlashSaleActive
    ? Math.round(
        hotelProfile.defaultFloorPrice *
          (1 - hotelProfile.nightFlashDiscountPct / 100),
      )
    : hotelProfile.defaultFloorPrice;

  // 1. Live Sessions (with per-class Floor Price Guardrail & Auto-Bid ceiling check)
  const liveSessions: LiveSession[] = auctionSessions
    .filter((s) => s.status === "live")
    .map((s) => {
      const rc = roomClasses.find((r) => r.id === s.matchedRoomClassId);
      const classBaseFloor = rc?.baseFloorPrice ?? hotelProfile.defaultFloorPrice;
      const effectiveFloorPrice = hotelProfile.nightFlashSaleActive
        ? Math.round(
            classBaseFloor * (1 - hotelProfile.nightFlashDiscountPct / 100),
          )
        : classBaseFloor;
      const roomsQty = s.roomsQty ?? 1;
      const guestsCount = s.guestsCount ?? 2;
      const isAutoBidEligible =
        roomsQty <= hotelProfile.autoBidMaxRooms &&
        guestsCount <= hotelProfile.autoBidMaxGuests;

      return {
        id: s.id,
        remainingSeconds:
          liveCountdownOverrides[s.id] !== undefined
            ? liveCountdownOverrides[s.id]
            : (s.remainingSeconds ?? hotelProfile.bidTtlSeconds),
        checkInDateRange: s.checkInDateRange ?? "06/11 – 07/11 (1 đêm)",
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
        aiSuggestedBasePrice:
          s.aiSuggestedBasePrice ?? hotelProfile.defaultFloorPrice,
        effectiveFloorPrice,
        isAutoBidEligible,
        bidSubmitted: s.bidSubmitted,
      };
    });

  const activeLiveCount = liveSessions.filter(
    (s) => s.remainingSeconds > 0,
  ).length;

  const pendingLiveBidsCount = liveSessions.filter(
    (s) => s.remainingSeconds > 0 && Boolean(s.bidSubmitted),
  ).length;

  // 2. Completed Bid Sessions (won + rejected + expired; excludes auto_closed sold-out withdrawals)
  const completedSessions = auctionSessions.filter(
    (s) =>
      s.status === "won" || s.status === "rejected" || s.status === "expired",
  );

  // 3. Period Metrics (today / 7d / 30d)
  const allPeriods: Record<DateRangeKey, PeriodComputedMetrics> = {
    today: computeSinglePeriod("today", bundle, completedSessions),
    "7d": computeSinglePeriod("7d", bundle, completedSessions),
    "30d": computeSinglePeriod("30d", bundle, completedSessions),
  };
  const periodMetrics = allPeriods[dateRangeKey];

  // 4. Today's Real-Time Paid Orders (referenceDate = 2026-11-06)
  const todayWonSessions = completedSessions.filter(
    (s) =>
      s.status === "won" && s.sessionDate === hotelProfile.referenceDate,
  );

  const todayOrders: TodayOrder[] = todayWonSessions.map((s) => {
    const baseAmount =
      s.hotelEarnedBase ??
      (s.offeredBasePrice ?? 0) * s.nights * (s.roomsQty ?? 1);
    const guestPaidAmount =
      s.guestPaidTotal ??
      calcGuestTotalFromBase(baseAmount, hotelProfile.guestPriceMultiplier);
    return {
      reqId: s.id,
      roomCategory: s.roomCategory ?? "Superior",
      roomSummary: s.offeredRoom ?? "Superior Double",
      nights: s.nights * (s.roomsQty ?? 1),
      stayDates: s.stayDatesLabel ?? `${s.nights} đêm`,
      paidTime: s.dateTimeLabel ?? `${s.timeLabel} • 06/11`,
      lockedRoomNumber: s.lockedRoomNumber ?? 106,
      baseAmount,
      guestPaidAmount,
      paymentStatus: "Đã thanh toán 100%",
    };
  });

  const todayBaseRevenue = todayOrders.reduce((s, o) => s + o.baseAmount, 0);
  const todayGuestPaidTotal = todayOrders.reduce(
    (s, o) => s + o.guestPaidAmount,
    0,
  );
  const todayTotalNights = todayOrders.reduce((s, o) => s + o.nights, 0);
  const todayBaseAdr =
    todayTotalNights > 0 ? Math.round(todayBaseRevenue / todayTotalNights) : 0;

  // 5. Room Inventory & 30-Room PMS Matrix (Tonight 06/11/2026)
  const activeAuctionCountByClass: Record<string, number> = {};
  liveSessions.forEach((ls) => {
    if (ls.remainingSeconds > 0) {
      activeAuctionCountByClass[ls.matchedRoomClassId] =
        (activeAuctionCountByClass[ls.matchedRoomClassId] ?? 0) + 1;
    }
  });

  const roomInventory: RoomClassInventory[] = roomClasses.map((rc) => {
    const pmsOfClass = roomsPms.filter((r) => r.roomClassId === rc.id);
    const otherChannelBooked = pmsOfClass.filter(
      (r) => r.status === "booked_other",
    ).length;
    const auctionPaidBooked = pmsOfClass.filter(
      (r) => r.status === "booked_auction",
    ).length;
    return {
      id: rc.id,
      name: rc.name,
      category: rc.category,
      roomRange: rc.roomRange,
      bedAndCapacity: rc.bedAndCapacity,
      totalRooms: rc.totalRooms,
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
  const vacantCount = Math.max(0, hotelProfile.totalRooms - occupiedCount);
  const occupancyPct = Math.round(
    (occupiedCount / hotelProfile.totalRooms) * 100,
  );
  const checkOutTomorrowCount = roomsPms.filter(
    (r) => r.status !== "vacant_unlocked" && r.checkOutTomorrow,
  ).length;

  const roomMatrix: RoomCell[] = roomsPms
    .slice()
    .sort((a, b) => a.roomNumber - b.roomNumber)
    .map((r) => ({
      roomNumber: r.roomNumber,
      floor: r.floor,
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

  // Sync Day 0 of 14-day calendar with real-time tonight PMS state
  const golden14ChartData: Calendar14DayPmsRecord[] = calendar14dPms.map((d) =>
    d.dayOffset === 0
      ? {
          ...d,
          otherBooked: otherBookedTotal,
          auctionBooked: auctionBookedTotal,
          vacantRooms: vacantCount,
        }
      : d,
  );

  // 5B. Build 14-Day Room-by-Room Schedule (#101 - #130 × 14 Dates)
  const sortedPmsRooms = roomsPms
    .slice()
    .sort((a, b) => a.roomNumber - b.roomNumber);

  const liveByDayAndClass: Record<number, Record<string, string[]>> = {};
  liveSessions.forEach((ls) => {
    if (ls.remainingSeconds <= 0) return;
    const offsets = parseStayDayOffsets(
      ls.checkInDateRange,
      hotelProfile.referenceDate,
      ls.nights,
    );
    offsets.forEach((off) => {
      if (!liveByDayAndClass[off]) liveByDayAndClass[off] = {};
      if (!liveByDayAndClass[off][ls.matchedRoomClassId]) {
        liveByDayAndClass[off][ls.matchedRoomClassId] = [];
      }
      liveByDayAndClass[off][ls.matchedRoomClassId].push(ls.id);
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

  const dailyRoomSchedules: DailyRoomSchedule[] = golden14ChartData.map(
    (calDay) => {
      const d = calDay.dayOffset;
      const nextDateStr =
        golden14ChartData[d + 1]?.dateStr ??
        `20/${calDay.dateStr.slice(3, 5)}`;

      if (d === 0) {
        const roomsDay0: DailyRoomCell[] = sortedPmsRooms.map((r) => {
          const wonInfo = wonStayMap.get(`${r.roomNumber}:0`);
          const activeIds =
            r.status === "vacant_unlocked"
              ? (liveByDayAndClass[0]?.[r.roomClassId] ?? [])
              : [];
          const staySpanText =
            r.status === "booked_auction"
              ? (wonInfo?.staySpanText ??
                (r.checkOutTomorrow ? "05/11–07/11" : "06/11–08/11"))
              : r.status === "booked_other"
                ? r.checkOutTomorrow
                  ? "05/11–07/11 (CO 12:00)"
                  : "06/11–08/11"
                : `Trống mở khóa ngày ${calDay.dateStr}`;

          return {
            roomNumber: r.roomNumber,
            floor: r.floor,
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
      sortedPmsRooms.forEach((r) => {
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
        const liveOnDay = liveByDayAndClass[d]?.[rc.id] ?? [];
        if (liveOnDay.length > 0) {
          const candidate = sortedPmsRooms
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
        const idx = (step * 7 + d * 5 + 5) % sortedPmsRooms.length;
        const candidate = sortedPmsRooms[idx];
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

      // C. Carry over non-checkout OTA stayovers on d === 1, then fill up to calDay.otherBooked
      let otherCount = 0;
      const targetOther = Math.min(30 - auctionCount, calDay.otherBooked);

      if (d === 1) {
        sortedPmsRooms.forEach((r) => {
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

      // Deterministic rotation for remaining OTA bookings on day d (gcd(7, 30) = 1 visits all 30 rooms)
      for (const allowReserved of [false, true]) {
        for (let step = 0; step < 30 && otherCount < targetOther; step++) {
          const idx = (step * 7 + d * 3) % sortedPmsRooms.length;
          const candidate = sortedPmsRooms[idx];
          if (assigned.has(candidate.roomNumber)) continue;
          if (!allowReserved && reservedVacantSet.has(candidate.roomNumber)) {
            continue;
          }
          const ch = OTA_CHANNELS[(candidate.roomNumber + d) % OTA_CHANNELS.length];
          const spanEnd =
            golden14ChartData[Math.min(13, d + 1 + ((step + d) % 2))]?.dateStr ??
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

      const roomsForDay: DailyRoomCell[] = sortedPmsRooms.map((r) => {
        const hit = assigned.get(r.roomNumber);
        if (hit) {
          return {
            roomNumber: r.roomNumber,
            floor: r.floor,
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
        const activeIds = liveByDayAndClass[d]?.[r.roomClassId] ?? [];
        return {
          roomNumber: r.roomNumber,
          floor: r.floor,
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

  // 6. History Table Rows (recent sessions flagged showInHistory, including auto_closed withdrawals)
  const historySessions: HistorySession[] = auctionSessions
    .filter((s) => s.status !== "live" && s.showInHistory)
    .map((s) => {
      const rc = roomClasses.find((r) => r.id === s.matchedRoomClassId);
      return {
        id: s.id,
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
        medicalRefund: s.medicalRefund,
        resultNote: s.resultNote ?? "",
        autopsyId: s.autopsyId ?? "CRQ-8924",
      };
    });

  // 7. Benchmark Chart Data (Hotel vs System for selected dateRangeKey)
  const activePeriodRange = systemBenchmarks.periodsMeta[dateRangeKey];
  const sessionsInActiveRange = completedSessions.filter(
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

      // Dynamic Da Nang regional total: seed regional wins + any newly simulated hotel wins
      const seedHotelWins = b.baselineHotelWins?.[dateRangeKey] ?? wins;
      const extraHotelWins = Math.max(0, wins - seedHotelWins);
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

  // 8. Daily Revenue & Paid Orders Trend (14 days: 2026-10-24 .. 2026-11-06)
  const trendDates: string[] = [];
  const startTrend = new Date("2026-10-24T00:00:00Z");
  for (let i = 0; i < 14; i++) {
    const dt = new Date(startTrend.getTime() + i * 86_400_000);
    trendDates.push(dt.toISOString().slice(0, 10));
  }

  const dailyRevenueTrend: DailyRevenueTrendPoint[] = trendDates.map((iso) => {
    const dayWins = completedSessions.filter(
      (s) => s.status === "won" && s.sessionDate === iso,
    );
    const baseRev = dayWins.reduce(
      (sum, s) => sum + (s.hotelEarnedBase ?? 0),
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

  // 9. Loss Reasons Pareto (30d window)
  const meta30d = systemBenchmarks.periodsMeta["30d"];
  const losses30dList = completedSessions.filter(
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
