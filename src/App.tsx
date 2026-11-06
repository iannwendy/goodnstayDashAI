import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Zap,
  Sparkles,
  Flame,
  Clock,
  Lock,
  LockOpen,
  CheckCircle2,
  RotateCcw,
  Calendar,
  Calculator,
  SlidersHorizontal,
  ShieldCheck,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  calcGuestTotalFromBase,
  formatButtonVnd,
  formatCompactVnd,
  formatCountdown,
  formatFullVnd,
  parseStayDayOffsets,
  type AuctionSessionMasterRecord,
  type DateRangeKey,
  type HistoryStatus,
  type KpiType,
  type LiveSession,
  type MainTab,
  type MasterDataBundle,
  type PmsRoomRecord,
  type UserRole,
} from "@/data";
import {
  loadMasterDataBundle,
  persistMasterTable,
  resetMasterDataToSeed,
} from "@/services/masterDataService";
import { computeDashboardAnalytics } from "@/services/analyticsEngine";
import { KpiDrilldownModal } from "@/components/KpiDrilldownModal";
import { MatchBreakdownModal } from "@/components/MatchBreakdownModal";
import { CustomBidModal } from "@/components/CustomBidModal";
import { RoomScheduleExplorer } from "@/components/RoomScheduleExplorer";

export function App() {
  const [bundle, setBundle] = useState<MasterDataBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<MainTab>("workspace");
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [userRole, setUserRole] = useState<UserRole>("manager");
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | HistoryStatus>(
    "all",
  );
  const [selectedAutopsyId, setSelectedAutopsyId] =
    useState<string>("CRQ-8924");
  const [liveCountdowns, setLiveCountdowns] = useState<Record<string, number>>(
    {},
  );

  // Modals
  const [activeKpiModal, setActiveKpiModal] = useState<KpiType | null>(null);
  const [activeMatchReqId, setActiveMatchReqId] = useState<string | null>(null);
  const [customBidSessionId, setCustomBidSessionId] = useState<string | null>(
    null,
  );
  const [suggestedPerkForBid, setSuggestedPerkForBid] = useState<
    string | undefined
  >(undefined);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  // Load Master Data Bundle
  useEffect(() => {
    let mounted = true;
    loadMasterDataBundle()
      .then((res) => {
        if (mounted) {
          setBundle(res.bundle);
          const initialCountdowns: Record<string, number> = {};
          res.bundle.auctionSessions.forEach((s) => {
            if (s.status === "live") {
              initialCountdowns[s.id] =
                s.remainingSeconds ?? res.bundle.hotelProfile.bidTtlSeconds;
            }
          });
          setLiveCountdowns(initialCountdowns);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // 1-second live countdown ticker
  useEffect(() => {
    if (!bundle) return;
    const timer = window.setInterval(() => {
      setLiveCountdowns((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const [id, sec] of Object.entries(prev)) {
          if (sec > 0) {
            next[id] = sec - 1;
            changed = true;
          } else {
            next[id] = 0;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [Boolean(bundle)]);

  const analytics = useMemo(() => {
    if (!bundle) return null;
    return computeDashboardAnalytics(bundle, dateRange, liveCountdowns);
  }, [bundle, dateRange, liveCountdowns]);

  const currentUser = useMemo(() => {
    if (!bundle) return null;
    return (
      bundle.usersRoles.find((u) => u.role === userRole) ??
      bundle.usersRoles[0]
    );
  }, [bundle, userRole]);

  // Toggle Auto-Bid
  const handleToggleAutoBid = async (checked: boolean) => {
    if (!bundle) return;
    const nextProfile = { ...bundle.hotelProfile, autoBidEnabled: checked };
    setBundle({ ...bundle, hotelProfile: nextProfile });
    await persistMasterTable("hotelProfile", nextProfile);
    showToast(
      checked
        ? `Đã bật Auto-Bid One-Shot (Áp dụng yêu cầu ≤${nextProfile.autoBidMaxRooms} phòng & ≤${nextProfile.autoBidMaxGuests} khách).`
        : "Đã tắt Auto-Bid tự động.",
    );
  };

  // Toggle Night Flash Sale
  const handleToggleFlashSale = async (checked: boolean) => {
    if (!bundle) return;
    const nextProfile = {
      ...bundle.hotelProfile,
      nightFlashSaleActive: checked,
    };
    setBundle({ ...bundle, hotelProfile: nextProfile });
    await persistMasterTable("hotelProfile", nextProfile);
    showToast(
      checked
        ? `Đã bật Xả đêm (-${nextProfile.nightFlashDiscountPct}% giá sàn cho ${analytics?.vacantCount ?? 0} phòng trống mở khóa).`
        : "Đã tắt chế độ Xả đêm.",
    );
  };

  // Submit One-Shot Bid (NEVER locks room!)
  const handleSubmitBid = async (
    sessionId: string,
    basePrice: number,
    perks: string[],
    mode: "quick" | "custom" = "custom",
  ) => {
    if (!bundle) return;
    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          bidSubmitted: {
            basePrice,
            perks,
            submittedAtText: "Đã gửi báo giá · Chờ khách TT 100%",
            mode,
          },
        };
      });

    setBundle({ ...bundle, auctionSessions: nextSessions });
    setCustomBidSessionId(null);
    setSuggestedPerkForBid(undefined);
    await persistMasterTable("auctionSessions", nextSessions);
    showToast(
      `Đã gửi báo giá ${formatFullVnd(basePrice)}/đêm cho #${sessionId}. Phòng vẫn mở khóa đến khi khách thanh toán 100%.`,
    );
  };

  // Simulate Guest Completing 100% Payment -> Locks Physical Room across exact stay dates!
  const handleSimulateGuestFullPayment = async (session: LiveSession) => {
    if (!bundle || !analytics) return;
    if (session.remainingSeconds <= 0) {
      showToast("Phiên đã hết hạn 60 phút, không thể thanh toán.");
      return;
    }

    const offeredBasePrice =
      session.bidSubmitted?.basePrice ?? session.aiSuggestedBasePrice;

    const stayOffsets = parseStayDayOffsets(
      session.checkInDateRange,
      bundle.hotelProfile.referenceDate,
      session.nights,
    );
    const effectiveOffsets = stayOffsets.length > 0 ? stayOffsets : [0];
    const includesTonight = effectiveOffsets.includes(0);

    // Find a room in this class that is vacant across ALL nights of the stay
    const classRooms = bundle.roomsPms
      .filter((r) => r.roomClassId === session.matchedRoomClassId)
      .sort((a, b) => a.roomNumber - b.roomNumber);

    const candidateAcrossAllNights = classRooms.find((r) =>
      effectiveOffsets.every((off) => {
        const daySched = analytics.dailyRoomSchedules[off];
        const cell = daySched?.rooms.find((c) => c.roomNumber === r.roomNumber);
        return cell?.status === "vacant_unlocked";
      }),
    );

    // Fallback to vacant on first check-in night if multi-night rotation differed
    const firstOff = effectiveOffsets[0];
    const fallbackCandidate = classRooms.find((r) => {
      const cell = analytics.dailyRoomSchedules[firstOff]?.rooms.find(
        (c) => c.roomNumber === r.roomNumber,
      );
      return cell?.status === "vacant_unlocked";
    });

    const lockedRoom = candidateAcrossAllNights ?? fallbackCandidate;

    if (!lockedRoom) {
      showToast("Hạng phòng này đã hết buồng trống trong khoảng ngày lưu trú.");
      return;
    }

    // Check which stay dates in this room class drop to 0 vacant rooms after locking
    const soldOutOffsets = new Set<number>();
    effectiveOffsets.forEach((off) => {
      const vacantBefore =
        analytics.dailyRoomSchedules[off]?.rooms.filter(
          (c) =>
            c.roomClassId === session.matchedRoomClassId &&
            c.status === "vacant_unlocked",
        ).length ?? 1;
      if (vacantBefore - 1 <= 0) {
        soldOutOffsets.add(off);
      }
    });

    const nextRoomsPms: PmsRoomRecord[] = includesTonight
      ? bundle.roomsPms.map((r) =>
          r.roomNumber === lockedRoom.roomNumber
            ? {
                ...r,
                status: "booked_auction",
                sourceChannel: "goodNstay (Đã TT 100%)",
                linkedReqId: session.id,
                checkOutTomorrow: !effectiveOffsets.includes(1),
              }
            : r,
        )
      : bundle.roomsPms;

    const nextOtherTotal = nextRoomsPms.filter(
      (r) => r.status === "booked_other",
    ).length;
    const nextAuctionTotal = nextRoomsPms.filter(
      (r) => r.status === "booked_auction",
    ).length;
    const nextVacantTotal = Math.max(
      0,
      bundle.hotelProfile.totalRooms - (nextOtherTotal + nextAuctionTotal),
    );

    const nextCalendar14d = bundle.calendar14dPms.map((d) => {
      if (d.dayOffset === 0) {
        return {
          ...d,
          otherBooked: nextOtherTotal,
          auctionBooked: nextAuctionTotal,
          vacantRooms: nextVacantTotal,
        };
      }
      if (effectiveOffsets.includes(d.dayOffset)) {
        const nextAuc = Math.min(d.totalRooms - d.otherBooked, d.auctionBooked + 1);
        return {
          ...d,
          auctionBooked: nextAuc,
          vacantRooms: Math.max(0, d.totalRooms - d.otherBooked - nextAuc),
        };
      }
      return d;
    });

    const baseAmt = offeredBasePrice * session.nights * session.roomsQty;
    const guestPaidAmt = calcGuestTotalFromBase(
      baseAmt,
      bundle.hotelProfile.guestPriceMultiplier,
    );
    const staySpanClean = session.checkInDateRange.split(" (")[0];
    const autoClosedSiblingIds: string[] = [];

    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        if (s.id === session.id) {
          return {
            ...s,
            status: "won",
            sessionDate: bundle.hotelProfile.referenceDate,
            dateTimeLabel: "06/11 • Vừa TT 100%",
            stayDatesLabel: staySpanClean,
            guestRequestTitle: session.guestSummary,
            amenitiesTags: session.amenities,
            roomCategory: session.mandatoryRoomCategory,
            offeredRoom: session.matchedRoomName,
            offeredBasePrice,
            hotelEarnedBase: baseAmt,
            guestPaidTotal: guestPaidAmt,
            medicalRefund: 0,
            bidMode: session.bidSubmitted?.mode === "auto" ? "auto" : "manual",
            responseMinutes: 1.5,
            guestOpenedDetail: true,
            closeMinutes: 2.3,
            closeSpeedText: "02p 18s",
            lockedRoomNumber: lockedRoom.roomNumber,
            resultNote: `Đã TT 100% · Khóa #${lockedRoom.roomNumber} (${staySpanClean})`,
            showInHistory: true,
          };
        }
        if (
          soldOutOffsets.size > 0 &&
          s.status === "live" &&
          s.matchedRoomClassId === session.matchedRoomClassId
        ) {
          const sibOffsets = parseStayDayOffsets(
            s.checkInDateRange,
            bundle.hotelProfile.referenceDate,
            s.nights,
          );
          if (sibOffsets.some((o) => soldOutOffsets.has(o))) {
            autoClosedSiblingIds.push(s.id);
            return {
              ...s,
              status: "auto_closed",
              dateTimeLabel: "06/11 • Tự đóng",
              resultNote: `Tự rút do hạng ${session.matchedRoomName} đã khóa hết phòng ngày trùng`,
              showInHistory: true,
            };
          }
        }
        return s;
      });

    setBundle({
      ...bundle,
      roomsPms: nextRoomsPms,
      calendar14dPms: nextCalendar14d,
      auctionSessions: nextSessions,
    });

    await Promise.all([
      persistMasterTable("roomsPms", nextRoomsPms),
      persistMasterTable("calendar14dPms", nextCalendar14d),
      persistMasterTable("auctionSessions", nextSessions),
    ]);

    if (autoClosedSiblingIds.length > 0) {
      showToast(
        `Khách #${session.id} đã TT 100% (${formatFullVnd(guestPaidAmt)}) → Khóa phòng #${lockedRoom.roomNumber} & tự đóng phiên trùng #${autoClosedSiblingIds.join(", #")}.`,
      );
    } else {
      showToast(
        `Khách #${session.id} đã TT 100% (${formatFullVnd(guestPaidAmt)}) → Đã khóa phòng #${lockedRoom.roomNumber} (KS nhận 100%: ${formatFullVnd(baseAmt)}).`,
      );
    }
  };

  // Save Auto-Bid Rule from Loss Autopsy
  const handleApplyAutopsyRule = async (caseId: string, ruleTitle: string) => {
    if (!bundle) return;
    const exists = bundle.botRules.some((r) => r.sourceCaseId === caseId);
    if (exists) {
      showToast("Quy tắc Auto-Bid này đã được kích hoạt.");
      return;
    }
    const nextRules = [
      ...bundle.botRules,
      {
        ruleId: `RULE-00${bundle.botRules.length + 1}`,
        title: ruleTitle,
        active: true,
        createdAt: new Date().toISOString(),
        sourceCaseId: caseId,
      },
    ];
    setBundle({ ...bundle, botRules: nextRules });
    await persistMasterTable("botRules", nextRules);
    showToast(`Đã kích hoạt quy tắc Auto-Bid: "${ruleTitle}"`);
  };

  // Reset Master Data to Seed
  const handleResetDemo = async () => {
    const fresh = await resetMasterDataToSeed();
    setBundle(fresh.bundle);
    const freshCountdowns: Record<string, number> = {};
    fresh.bundle.auctionSessions.forEach((s) => {
      if (s.status === "live") {
        freshCountdowns[s.id] =
          s.remainingSeconds ?? fresh.bundle.hotelProfile.bidTtlSeconds;
      }
    });
    setLiveCountdowns(freshCountdowns);
    showToast("Đã khôi phục dữ liệu mẫu ngày 06/11/2026.");
  };

  if (loading || !bundle || !analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] text-zinc-500 text-sm">
        Đang tải dữ liệu goodNstay...
      </div>
    );
  }

  const { hotelProfile, systemBenchmarks } = bundle;
  const { periodMetrics } = analytics;
  const activeCustomBidSession =
    analytics.liveSessions.find((s) => s.id === customBidSessionId) ?? null;
  const filteredHistory = analytics.historySessions.filter((h) =>
    historyFilter === "all" ? true : h.status === historyFilter,
  );
  const activeAutopsy =
    bundle.lossAutopsies[selectedAutopsyId] ??
    Object.values(bundle.lossAutopsies)[0];

  const totalRegionWinsAllClasses = analytics.benchmarkChartData.reduce(
    (s, b) => s + b.sysTotalWins,
    0,
  );
  const totalHotelWinsAllClasses = analytics.benchmarkChartData.reduce(
    (s, b) => s + b.wins,
    0,
  );
  const overallRegionSharePct =
    totalRegionWinsAllClasses > 0
      ? Number(
          ((totalHotelWinsAllClasses / totalRegionWinsAllClasses) * 100).toFixed(
            1,
          ),
        )
      : 0;

  const winDeltaVsPlatform = Number(
    (periodMetrics.winRatePct - periodMetrics.platformWinRatePct).toFixed(1),
  );

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-zinc-900 pb-14">
      {/* ===================================================================== */}
      {/* SINGLE-LINE CLEAN TOPBAR (NO WRAPPING BUTTONS)                        */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Brand & Property */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white font-bold text-xs flex items-center justify-center shrink-0">
              g
            </div>
            <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
              <span className="font-semibold text-sm tracking-tight text-zinc-950">
                {hotelProfile.brandName}
              </span>
              <span className="text-zinc-300 hidden sm:inline">/</span>
              <span className="text-xs text-zinc-500 truncate hidden sm:inline">
                {hotelProfile.hotelName} · {hotelProfile.starRating}★ ·{" "}
                {hotelProfile.totalRooms} phòng
              </span>
            </div>
          </div>

          {/* Center: Clean Period Tabs + Single Date Badge */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/70">
              {(["today", "7d", "30d"] as DateRangeKey[]).map((key) => {
                const p = systemBenchmarks.periodsMeta[key];
                const active = dateRange === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDateRange(key)}
                    className={`px-3 py-1 rounded-md text-xs whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {p.shortLabel}
                  </button>
                );
              })}
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs font-mono text-zinc-600 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              {periodMetrics.rangeText}
            </span>
          </div>

          {/* Right: Compact Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200/80 whitespace-nowrap">
              <Zap
                className={`w-3.5 h-3.5 ${
                  hotelProfile.autoBidEnabled
                    ? "text-emerald-600"
                    : "text-zinc-400"
                }`}
              />
              <span className="text-xs font-medium text-zinc-700">
                Auto-Bid{" "}
                <span className="font-mono text-zinc-400">
                  ≥{formatButtonVnd(analytics.activeFloorPrice)}
                </span>
              </span>
              <Switch
                checked={hotelProfile.autoBidEnabled}
                onCheckedChange={handleToggleAutoBid}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFormulas((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                showFormulas
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
              title="Xem công thức chuẩn goodNstay"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Công thức</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-600 whitespace-nowrap cursor-pointer"
              title="Khôi phục dữ liệu mẫu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Reset</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setUserRole((r) =>
                  r === "manager" ? "receptionist" : "manager",
                )
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs whitespace-nowrap cursor-pointer"
              title="Đổi vai trò Quản lý / Lễ tân"
            >
              <span className="w-5 h-5 rounded-full bg-zinc-900 text-white text-[10px] font-semibold flex items-center justify-center">
                {currentUser?.initials}
              </span>
              <span className="hidden sm:inline font-medium text-zinc-700">
                {userRole === "manager" ? "Quản lý" : "Lễ tân"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Period Selector */}
        <div className="lg:hidden px-4 py-2 border-t border-zinc-100 flex items-center justify-between gap-2 bg-zinc-50/60">
          <div className="flex items-center gap-1">
            {(["today", "7d", "30d"] as DateRangeKey[]).map((key) => {
              const p = systemBenchmarks.periodsMeta[key];
              const active = dateRange === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDateRange(key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 border border-zinc-200"
                  }`}
                >
                  {p.shortLabel}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {periodMetrics.rangeText}
          </span>
        </div>
      </header>

      {/* TOAST */}
      {toastMessage && (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-3">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* =================================================================== */}
        {/* COLLAPSIBLE FORMULA & BUSINESS RULE DRAWER                          */}
        {/* =================================================================== */}
        {showFormulas && (
          <section className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">
                Công thức & Quy tắc Nghiệp vụ Chuẩn goodNstay
              </span>
              <button
                type="button"
                onClick={() => setShowFormulas(false)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                Thu gọn <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  1. Thực nhận ròng KS (0% hoa hồng)
                </div>
                <div className="font-mono text-[11px] text-emerald-700">
                  = 100% Giá gốc KS − Hoàn tiền y tế
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Khách sạn nhận đủ 100% giá gốc đã báo.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  2. Tổng giá Khách thanh toán
                </div>
                <div className="font-mono text-[11px] text-zinc-800">
                  = Giá gốc × 1.15 (phí sàn) × 1.10 (VAT)
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Tương đương 126.5% Giá gốc KS · Không có đặt cọc.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  3. Tỷ lệ chọn & Thị phần
                </div>
                <div className="font-mono text-[11px] text-zinc-800">
                  Tỷ lệ = Đơn TT 100% ÷ Phiên báo giá
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Thị phần ĐN = Đơn thắng KS ÷ Tổng đơn thắng cùng hạng.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  4. Cơ chế Mở khóa / Khóa phòng
                </div>
                <div className="font-mono text-[11px] text-sky-700">
                  1 phòng trống → đấu nhiều phiên
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Chỉ khóa sang Đã đặt ngay khi khách hoàn tất TT 100%.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* 4 SPACIOUS, CALM KPI CARDS (CLICKABLE FOR DRILLDOWN)                */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Net Revenue */}
          <button
            type="button"
            onClick={() => setActiveKpiModal("revenue_total")}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Thực nhận ròng ({periodMetrics.shortLabel})
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                0% phí KS
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                {formatCompactVnd(periodMetrics.netReceive)}
                <span className="text-sm font-normal text-zinc-400 ml-0.5">
                  đ
                </span>
              </span>
              <span className="text-xs font-semibold font-mono text-emerald-600">
                {periodMetrics.growthPct >= 0
                  ? `+${periodMetrics.growthPct}%`
                  : `${periodMetrics.growthPct}%`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{periodMetrics.paidWonCount} đơn TT 100%</span>
              <span className="font-mono text-[11px] text-zinc-400">
                {periodMetrics.rangeText}
              </span>
            </div>
          </button>

          {/* Card 2: Today ADR & Revenue */}
          <button
            type="button"
            onClick={() => setActiveKpiModal("revenue_today")}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                ADR hôm nay
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                06/11/2026
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                {formatCompactVnd(analytics.todayBaseAdr)}
              </span>
              <span className="text-xs text-zinc-400">/đêm</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Doanh thu gốc:{" "}
                <strong className="font-medium text-zinc-700">
                  {formatCompactVnd(analytics.todayBaseRevenue)}đ
                </strong>
              </span>
              <span>{analytics.todayTotalNights} đêm</span>
            </div>
          </button>

          {/* Card 3: Selection Rate vs Platform + Bids Drilldown */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveKpiModal("win_rate")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveKpiModal("win_rate");
              }
            }}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Tỷ lệ được chọn
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                TB sàn {periodMetrics.platformWinRatePct}%
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
                {periodMetrics.winRatePct}%
              </span>
              <span
                className={`text-xs font-mono font-medium ${
                  winDeltaVsPlatform >= 0
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              >
                {winDeltaVsPlatform >= 0
                  ? `+${winDeltaVsPlatform}%`
                  : `${winDeltaVsPlatform}%`}{" "}
                vs sàn
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Thị phần ĐN:{" "}
                <strong className="font-medium text-zinc-800">
                  {overallRegionSharePct}%
                </strong>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveKpiModal("sessions_total");
                }}
                className="font-mono text-[11px] text-zinc-500 hover:text-zinc-950 underline underline-offset-2 cursor-pointer"
              >
                {periodMetrics.paidWonCount}/{periodMetrics.bidsSent} phiên
              </button>
            </div>
          </div>

          {/* Card 4: Tonight Room Inventory (Vacant Unlocked vs Locked) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveKpiModal("rooms_vacant")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveKpiModal("rooms_vacant");
              }
            }}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Quỹ phòng hôm nay
              </span>
              <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                Mở khóa đấu giá
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                  {analytics.vacantCount}
                </span>
                <span className="text-xs text-zinc-500">phòng trống</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveKpiModal("rooms_occupied");
                }}
                className="text-xs font-mono text-zinc-500 hover:text-zinc-950 underline underline-offset-2 cursor-pointer"
              >
                {analytics.occupiedCount}/{hotelProfile.totalRooms} đã khóa
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="w-full h-1.5 rounded-full bg-sky-100 overflow-hidden flex">
                <div
                  className="h-full bg-zinc-700"
                  style={{
                    width: `${(analytics.otherBookedTotal / hotelProfile.totalRooms) * 100}%`,
                  }}
                />
                <div
                  className="h-full bg-emerald-500"
                  style={{
                    width: `${(analytics.auctionBookedTotal / hotelProfile.totalRooms) * 100}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>TT 100%: {analytics.auctionBookedTotal}</span>
                <span>OTA/Lễ tân: {analytics.otherBookedTotal}</span>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* UNIFIED NAVIGATION BAR + INLINE NIGHT FLASH SALE TOGGLE             */}
        {/* =================================================================== */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as MainTab)}
          className="space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/90 pb-3">
            <TabsList className="bg-zinc-200/60 p-1 rounded-xl">
              <TabsTrigger
                value="workspace"
                className="gap-1.5 px-3.5 rounded-lg text-xs"
              >
                <span>Đấu giá Live</span>
                {analytics.activeLiveCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-900 text-white text-[10px] font-mono">
                    {analytics.activeLiveCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="ai-analytics"
                className="px-3.5 rounded-lg text-xs"
              >
                Hiệu suất & Thị phần
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="px-3.5 rounded-lg text-xs"
              >
                Quỹ phòng ({analytics.vacantCount} trống)
              </TabsTrigger>
            </TabsList>

            {/* Right: Subtle Rule Note + Compact Night Flash Toggle */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="hidden xl:inline text-xs text-zinc-500">
                Không đặt cọc · Khách thanh toán 100% mới khóa phòng
              </span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-zinc-200/90 text-xs">
                <Flame
                  className={`w-3.5 h-3.5 ${
                    hotelProfile.nightFlashSaleActive
                      ? "text-amber-500"
                      : "text-zinc-400"
                  }`}
                />
                <span className="font-medium text-zinc-700 whitespace-nowrap">
                  Xả đêm {hotelProfile.nightFlashStartHour}{" "}
                  <span className="text-zinc-400 font-normal">
                    (-{hotelProfile.nightFlashDiscountPct}%)
                  </span>
                </span>
                <Switch
                  checked={hotelProfile.nightFlashSaleActive}
                  onCheckedChange={handleToggleFlashSale}
                />
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TAB 1: CLEAN LIVE AUCTIONS, CHARTS & SESSION LOG                  */}
          {/* ================================================================= */}
          <TabsContent value="workspace" className="space-y-6">
            {/* 1. Minimalist Live Auction Cards (Zero Nested Colored Boxes) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Phiên đang mở ({analytics.activeLiveCount})
                  </h2>
                  <span className="text-xs text-zinc-400">
                    · {hotelProfile.currentDateLabel}
                  </span>
                </div>
                <span className="hidden sm:inline text-xs text-zinc-400">
                  Báo giá 1 lần (60 phút) · 1 phòng trống có thể đấu nhiều phiên
                </span>
              </div>

              {analytics.liveSessions.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white border border-zinc-200/80 text-center text-sm text-zinc-500">
                  Hiện không còn phiên Live đang mở. Bấm <strong>Reset</strong>{" "}
                  ở thanh trên cùng để khôi phục phiên mẫu.
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {analytics.liveSessions.map((session) => {
                    const isUrgent =
                      session.remainingSeconds <=
                      hotelProfile.urgentThresholdSeconds;
                    const activeBase =
                      session.bidSubmitted?.basePrice ??
                      session.aiSuggestedBasePrice;
                    const guestNightly = calcGuestTotalFromBase(
                      activeBase,
                      hotelProfile.guestPriceMultiplier,
                    );
                    const inv = analytics.roomInventory.find(
                      (r) => r.id === session.matchedRoomClassId,
                    );
                    const vacantInClass = inv
                      ? Math.max(
                          0,
                          inv.totalRooms -
                            inv.otherChannelBooked -
                            inv.auctionPaidBooked,
                        )
                      : 1;
                    const concurrentInClass =
                      analytics.activeAuctionCountByClass[
                        session.matchedRoomClassId
                      ] ?? 1;
                    const isMultiContest = concurrentInClass > 1;

                    return (
                      <div
                        key={session.id}
                        className={`rounded-2xl bg-white border p-5 flex flex-col justify-between gap-4 shadow-2xs transition-all ${
                          session.bidSubmitted
                            ? "border-emerald-300/90"
                            : "border-zinc-200/90 hover:border-zinc-300"
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Row 1: Room Class & Timer */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-medium shrink-0">
                                {session.mandatoryRoomCategory}
                              </span>
                              <h3 className="text-[15px] font-semibold text-zinc-950 truncate">
                                {session.matchedRoomName}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setActiveMatchReqId(session.id)}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium cursor-pointer transition-colors"
                              >
                                Khớp {session.matchScore}%
                              </button>
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-medium ${
                                  isUrgent
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-zinc-100 text-zinc-600"
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {formatCountdown(session.remainingSeconds)}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Clean 1-line Stay & Guest Details */}
                          <div className="text-xs text-zinc-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium text-zinc-900">
                              {session.checkInDateRange}
                            </span>
                            <span className="text-zinc-300">·</span>
                            <span>{session.bedTag}</span>
                            <span className="text-zinc-300">·</span>
                            <span>{session.guestsCount} khách</span>
                            <span className="text-zinc-300">·</span>
                            <span className="text-zinc-400">
                              {session.competitorsCount} đối thủ (#{session.id})
                            </span>
                          </div>

                          {/* Row 3: Subtle Inline Amenities (No Bordered Pill Clutter) */}
                          <div className="text-xs text-zinc-400 truncate">
                            {session.amenities.join("  ·  ")}
                          </div>

                          {/* Row 4: Calm Inline Room Lock Status */}
                          <div className="pt-0.5 flex items-center gap-1.5 text-xs">
                            <LockOpen
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isMultiContest
                                  ? "text-amber-600"
                                  : "text-sky-600"
                              }`}
                            />
                            <span
                              className={
                                isMultiContest
                                  ? "text-amber-700 font-medium"
                                  : "text-zinc-600"
                              }
                            >
                              Còn {vacantInClass} phòng trống mở khóa
                              {isMultiContest
                                ? ` · đang tham gia ${concurrentInClass} phiên`
                                : ""}
                            </span>
                            <span className="text-zinc-400">
                              · TT 100% mới khóa
                            </span>
                          </div>
                        </div>

                        {/* Footer: Price on Left + Compact Buttons on Right */}
                        <div className="pt-3.5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold font-mono text-zinc-950">
                                {formatFullVnd(activeBase)}
                              </span>
                              <span className="text-xs text-zinc-400">
                                /đêm
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              KS nhận 100% · Khách TT{" "}
                              {formatFullVnd(guestNightly)}
                            </div>
                          </div>

                          {session.remainingSeconds <= 0 ? (
                            <span className="text-xs font-mono text-zinc-400">
                              Đã hết hạn 60 phút
                            </span>
                          ) : session.bidSubmitted ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-700 font-medium hidden sm:inline">
                                Đã báo giá
                              </span>
                              <Button
                                variant="emerald"
                                size="sm"
                                onClick={() =>
                                  handleSimulateGuestFullPayment(session)
                                }
                              >
                                <Lock className="w-3.5 h-3.5" />
                                Khách TT 100% · Khóa phòng
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSuggestedPerkForBid(undefined);
                                  setCustomBidSessionId(session.id);
                                }}
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                Tùy chỉnh
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  handleSubmitBid(
                                    session.id,
                                    session.aiSuggestedBasePrice,
                                    ["Miễn phí Buffet sáng 2 khách"],
                                    "quick",
                                  )
                                }
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Gửi {formatButtonVnd(session.aiSuggestedBasePrice)}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Clean Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart A: Hotel Selection Rate vs System Average */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Tỷ lệ được chọn theo hạng phòng vs. Hệ thống
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Kỳ {periodMetrics.rangeText} · Đơn TT 100% ÷ Phiên báo giá
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai-analytics")}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer whitespace-nowrap"
                  >
                    Chi tiết thị phần →
                  </button>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={analytics.benchmarkChartData}
                      margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f4f4f5"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="category"
                        width={72}
                        tick={{ fontSize: 12, fill: "#18181b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip formatter={(val) => `${val ?? 0}%`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        dataKey="hotelWinPct"
                        name="KS của bạn (%)"
                        fill="#10b981"
                        radius={[0, 4, 4, 0]}
                        barSize={11}
                      />
                      <Bar
                        dataKey="sysAvgPct"
                        name="TB toàn sàn (%)"
                        fill="#d4d4d8"
                        radius={[0, 4, 4, 0]}
                        barSize={11}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Clean 1-line Regional Share Summary */}
                <div className="pt-3 border-t border-zinc-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {analytics.benchmarkChartData.map((b) => (
                    <div key={b.roomClassId} className="space-y-0.5">
                      <div className="text-[11px] text-zinc-400">
                        Thị phần {b.category}
                      </div>
                      <div className="text-xs font-mono font-semibold text-zinc-800">
                        {b.regionSharePct}%{" "}
                        <span className="font-normal text-zinc-400">
                          ({b.wins}/{b.sysTotalWins})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart B: 14-Day Daily Base Revenue & Paid Orders */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Doanh thu giá gốc & Đơn thanh toán 100%
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      14 ngày gần nhất (24/10 – 06/11/2026)
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md">
                    ADR kỳ: {formatCompactVnd(periodMetrics.periodBaseAdr)}/đêm
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={analytics.dailyRevenueTrend}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f4f4f5"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        unit="M"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 11, fill: "#10b981" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val, name) =>
                          String(name).includes("Doanh thu")
                            ? [`${val ?? 0}M đ`, name]
                            : [`${val ?? 0} đơn`, name]
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        yAxisId="left"
                        dataKey="baseRevenueM"
                        name="Doanh thu Giá gốc (Triệu đ)"
                        fill="#18181b"
                        radius={[4, 4, 0, 0]}
                        barSize={18}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="paidOrders"
                        name="Đơn TT 100%"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. Clean Session Log Table */}
            <div className="rounded-2xl bg-white border border-zinc-200/80 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Nhật ký phiên đấu giá gần đây
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Khách hoàn tất thanh toán 100% sẽ khóa phòng ngay · Không có
                    trạng thái đặt cọc
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg">
                  {(
                    [
                      ["all", "Tất cả"],
                      ["won", "Đã TT 100%"],
                      ["rejected", "Từ chối"],
                      ["expired", "Hết hạn"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setHistoryFilter(val)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                        historyFilter === val
                          ? "bg-white text-zinc-950 shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-zinc-50/70 border-b border-zinc-100 text-[11px] font-medium text-zinc-400">
                    <tr>
                      <th className="py-3 px-5">Mã phiên</th>
                      <th className="py-3 px-5">Yêu cầu & Lưu trú</th>
                      <th className="py-3 px-5">Hạng phòng chào</th>
                      <th className="py-3 px-5 text-right">
                        Giá gốc / đêm (KS nhận 100%)
                      </th>
                      <th className="py-3 px-5 text-center">Độ khớp</th>
                      <th className="py-3 px-5 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-50/50">
                        <td className="py-3.5 px-5">
                          <div className="font-mono font-semibold text-zinc-900">
                            #{h.id}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {h.dateTimeLabel}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="font-medium text-zinc-800">
                            {h.guestRequestTitle}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            Lưu trú: {h.stayDatesLabel}
                          </div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="text-zinc-400 mr-1.5">
                            [{h.roomCategory}]
                          </span>
                          <span className="font-medium text-zinc-800">
                            {h.offeredRoom}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono">
                          <div className="font-semibold text-zinc-900">
                            {formatFullVnd(h.offeredBasePrice)}
                          </div>
                          {h.status === "won" && h.hotelEarnedBase && (
                            <div className="text-[11px] text-emerald-600">
                              Tổng: {formatFullVnd(h.hotelEarnedBase)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => setActiveMatchReqId(h.id)}
                            className="px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 font-mono text-xs text-zinc-700 cursor-pointer"
                          >
                            {h.matchScore}%
                          </button>
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          {h.status === "won" ? (
                            <div>
                              <Badge variant="success">Đã TT 100%</Badge>
                              <div className="text-[11px] text-zinc-500 mt-0.5">
                                {h.resultNote}
                              </div>
                            </div>
                          ) : h.status === "auto_closed" ? (
                            <div>
                              <Badge variant="neutral">Tự đóng</Badge>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                {h.resultNote}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (h.autopsyId) {
                                    setSelectedAutopsyId(h.autopsyId);
                                  }
                                  setActiveTab("ai-analytics");
                                }}
                                className="cursor-pointer"
                              >
                                <Badge
                                  variant={
                                    h.status === "rejected"
                                      ? "danger"
                                      : "warning"
                                  }
                                >
                                  {h.status === "rejected"
                                    ? "Khách từ chối"
                                    : "Hết hạn 60p"}
                                </Badge>
                              </button>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                {h.resultNote}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 2: BENCHMARKS VS SYSTEM & LOSS PARETO                         */}
          {/* ================================================================= */}
          <TabsContent value="ai-analytics" className="space-y-6">
            {/* 1. Room Class Benchmark Cards (Both Win Rate vs System & Regional Share) */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Hiệu suất từng hạng phòng so với toàn hệ thống (
                    {periodMetrics.rangeText})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    So sánh đồng thời (1) Tỷ lệ được chọn với TB toàn sàn và (2)
                    Thị phần đơn thắng tại {systemBenchmarks.regionName}
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-zinc-100 text-xs font-mono text-zinc-700">
                  Tổng thị phần {systemBenchmarks.regionName}:{" "}
                  <strong>{overallRegionSharePct}%</strong> (
                  {totalHotelWinsAllClasses}/{totalRegionWinsAllClasses} đơn)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {analytics.benchmarkChartData.map((b) => {
                  const positive = b.deltaPct >= 0;
                  const priceDiff = b.hotelAvgBasePrice - b.systemAvgBasePrice;
                  return (
                    <div
                      key={b.roomClassId}
                      className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/40 space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-zinc-400">
                            Hạng {b.category}
                          </span>
                          <div className="font-semibold text-sm text-zinc-900">
                            {b.roomName}
                          </div>
                        </div>
                        <Badge
                          variant={positive ? "success" : "warning"}
                          className="font-mono text-[10px]"
                        >
                          {positive ? `+${b.deltaPct}%` : `${b.deltaPct}%`} vs
                          sàn
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-600">
                              KS của bạn ({b.wins}/{b.bids})
                            </span>
                            <strong className="font-mono text-emerald-600">
                              {b.hotelWinPct}%
                            </strong>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-200/80 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500"
                              style={{
                                width: `${Math.min(100, b.hotelWinPct * 1.5)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-400">TB hệ thống</span>
                            <span className="font-mono text-zinc-600">
                              {b.sysAvgPct}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-200/80 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-zinc-400"
                              style={{
                                width: `${Math.min(100, b.sysAvgPct * 1.5)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-zinc-200/70 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Thị phần ĐN</span>
                          <strong className="font-mono text-zinc-900">
                            {b.regionSharePct}% ({b.wins}/{b.sysTotalWins})
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">Giá gốc TB</span>
                          <span className="font-mono text-zinc-700">
                            {formatCompactVnd(b.hotelAvgBasePrice)}{" "}
                            <span
                              className={
                                priceDiff <= 0
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }
                            >
                              ({priceDiff <= 0 ? "" : "+"}
                              {Math.round(priceDiff / 1000)}k)
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Pareto Loss Reasons + ELO Reputation */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Nguyên nhân không chốt được phiên (30 ngày: 08/10 –
                    06/11/2026)
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tổng {analytics.totalLosses30d} phiên trượt · Xếp giảm dần
                    theo tỷ trọng Pareto
                  </p>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={analytics.lossReasons30d}
                      margin={{ left: 8, right: 24 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#f4f4f5"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 60]}
                        unit="%"
                        tick={{ fontSize: 11, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        width={145}
                        tick={{ fontSize: 12, fill: "#18181b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(val) => [`${val ?? 0}%`, "Tỷ trọng"]}
                      />
                      <Bar
                        dataKey="pct"
                        name="Tỷ trọng (%)"
                        radius={[0, 4, 4, 0]}
                        barSize={16}
                      >
                        {analytics.lossReasons30d.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900">
                      Điểm uy tín & Đánh giá
                    </span>
                    <Badge variant="success">{hotelProfile.eloTier}</Badge>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-zinc-950">
                      {hotelProfile.eloScore}
                    </span>
                    <span className="text-xs text-zinc-400">điểm ELO</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Chu kỳ đối soát: {hotelProfile.payoutInfo.settlementCycle}
                  </p>
                </div>

                <div className="space-y-2.5 pt-4 border-t border-zinc-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Đánh giá sau lưu trú</span>
                    <strong className="font-mono text-zinc-900">
                      ★ {hotelProfile.reviewRating5} / 5.0 (
                      {hotelProfile.reviewCount})
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Thời gian chốt TB</span>
                    <strong className="font-mono text-emerald-600">
                      {periodMetrics.avgCloseMinutes} phút
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Giải ngân kế tiếp</span>
                    <strong className="font-mono text-zinc-900">
                      {hotelProfile.payoutInfo.nextPayoutDate}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Loss Autopsy Comparison */}
            {activeAutopsy && (
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Đối chiếu phiên trượt với đối thủ được chọn
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {activeAutopsy.dateLabel} · {activeAutopsy.guestRejectTag}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 bg-zinc-100 p-1 rounded-lg">
                    {Object.values(bundle.lossAutopsies).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedAutopsyId(item.id)}
                        className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all ${
                          selectedAutopsyId === item.id
                            ? "bg-white text-zinc-950 shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {item.tabLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-zinc-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-zinc-50/70 border-b border-zinc-100 text-[11px] font-medium text-zinc-400">
                      <tr>
                        <th className="py-2.5 px-4">Tiêu chí</th>
                        <th className="py-2.5 px-4">Báo giá của bạn</th>
                        <th className="py-2.5 px-4">Đối thủ thắng cuộc</th>
                        <th className="py-2.5 px-4 text-right">Chênh lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {activeAutopsy.metrics.map((m, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-4 font-medium text-zinc-800">
                            {m.label}
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-700">
                            <span
                              className={
                                m.tone === "bad"
                                  ? "text-rose-600 font-semibold"
                                  : ""
                              }
                            >
                              {m.yours}
                            </span>
                            {m.yoursMatchModalId && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMatchReqId(m.yoursMatchModalId!)
                                }
                                className="ml-2 underline text-[11px] text-zinc-400 hover:text-zinc-800 cursor-pointer"
                              >
                                Chi tiết
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-emerald-600">
                            {m.winner}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant={
                                m.tone === "bad"
                                  ? "danger"
                                  : m.tone === "warn"
                                    ? "warning"
                                    : m.tone === "good"
                                      ? "success"
                                      : "neutral"
                              }
                            >
                              {m.deltaBadge}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-zinc-900">
                      Gợi ý tối ưu (
                      {activeAutopsy.recommendedFormula.estimatedWinProb}% khả
                      năng thắng):
                    </span>{" "}
                    <span className="text-zinc-600">
                      {activeAutopsy.recommendedFormula.ruleTitle} (
                      {activeAutopsy.recommendedFormula.costNote})
                    </span>
                  </div>
                  <Button
                    variant="emerald"
                    size="xs"
                    disabled={!currentUser?.canConfigureBotRules}
                    onClick={() =>
                      handleApplyAutopsyRule(
                        activeAutopsy.id,
                        activeAutopsy.recommendedFormula.ruleTitle,
                      )
                    }
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Lưu quy tắc Auto-Bid
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 3: INVENTORY, 14-DAY CHART & 30-ROOM MATRIX                   */}
          {/* ================================================================= */}
          <TabsContent value="inventory" className="space-y-6">
            {/* 1. 14-Day Stacked Column Chart */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Dự báo quỹ phòng 14 ngày tới (
                    {hotelProfile.goldenWindowRange})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tổng 30 phòng/ngày = Đã đặt kênh khác + Đã đặt goodNstay (TT
                    100%) + Phòng trống mở khóa
                  </p>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.golden14ChartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f4f4f5"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dateStr"
                      tick={{ fontSize: 11, fill: "#52525b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 30]}
                      tick={{ fontSize: 11, fill: "#71717a" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      labelFormatter={(label, payload) =>
                        `Ngày ${payload?.[0]?.payload?.fullDate ?? label}`
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="otherBooked"
                      stackId="rooms"
                      name="Đã đặt OTA / Lễ tân"
                      fill="#52525b"
                      barSize={24}
                    />
                    <Bar
                      dataKey="auctionBooked"
                      stackId="rooms"
                      name="Đã đặt goodNstay (TT 100%)"
                      fill="#10b981"
                      barSize={24}
                    />
                    <Bar
                      dataKey="vacantRooms"
                      stackId="rooms"
                      name="Phòng trống mở khóa"
                      fill="#38bdf8"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. 4 Clean Room Class Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {analytics.roomInventory.map((rc) => {
                const occ = rc.otherChannelBooked + rc.auctionPaidBooked;
                const vac = Math.max(0, rc.totalRooms - occ);
                const liveJoining =
                  analytics.activeAuctionCountByClass[rc.id] ?? 0;

                return (
                  <div
                    key={rc.id}
                    className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-zinc-400">
                          {rc.category} · #{rc.roomRange}
                        </span>
                        <h3 className="font-semibold text-sm text-zinc-900 mt-0.5">
                          {rc.name}
                        </h3>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-base font-bold text-zinc-950">
                          {vac}
                        </span>
                        <span className="text-xs text-zinc-400">
                          /{rc.totalRooms} trống
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500 truncate">
                      {rc.bedAndCapacity}
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-sky-100 overflow-hidden flex">
                      <div
                        className="h-full bg-zinc-700"
                        style={{
                          width: `${(rc.otherChannelBooked / rc.totalRooms) * 100}%`,
                        }}
                      />
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${(rc.auctionPaidBooked / rc.totalRooms) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-zinc-400">
                        Đã khóa: {occ}/{rc.totalRooms}
                      </span>
                      {vac === 0 ? (
                        <span className="text-rose-600 font-medium">
                          Hết phòng
                        </span>
                      ) : liveJoining > 0 ? (
                        <span className="text-sky-700 font-medium">
                          Đang đấu {liveJoining} phiên
                        </span>
                      ) : (
                        <span className="text-zinc-500">Mở khóa sẵn sàng</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Multi-Date 30-Room Explorer & 14-Day PMS Timeline */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Lịch chi tiết 30 phòng theo từng ngày ({hotelProfile.goldenWindowRange})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Chọn ngày bất kỳ hoặc chuyển sang <strong>Bảng lịch 14 ngày</strong>{" "}
                  để xem chính xác từng buồng (#101–#130) đang trống mở khóa hay
                  đã khóa theo đơn.
                </p>
              </div>

              <RoomScheduleExplorer schedules={analytics.dailyRoomSchedules} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* MODALS */}
      <KpiDrilldownModal
        activeKpi={activeKpiModal}
        onClose={() => setActiveKpiModal(null)}
        hotelProfile={hotelProfile}
        analytics={analytics}
        nightFlashSaleActive={hotelProfile.nightFlashSaleActive}
        onActivateNightFlashSale={() =>
          handleToggleFlashSale(!hotelProfile.nightFlashSaleActive)
        }
        onSwitchToAiTab={() => setActiveTab("ai-analytics")}
      />

      <MatchBreakdownModal
        reqId={activeMatchReqId}
        bundle={bundle}
        isLiveSession={analytics.liveSessions.some(
          (s) => s.id === activeMatchReqId && !s.bidSubmitted,
        )}
        onClose={() => setActiveMatchReqId(null)}
        onOpenCustomBidWithPerk={(reqId, perkId) => {
          setSuggestedPerkForBid(perkId);
          setCustomBidSessionId(reqId);
        }}
      />

      <CustomBidModal
        session={activeCustomBidSession}
        hotelProfile={hotelProfile}
        perksCatalog={bundle.perksCatalog}
        initialSuggestedPerkId={suggestedPerkForBid}
        activeFloorPrice={
          activeCustomBidSession?.effectiveFloorPrice ??
          analytics.activeFloorPrice
        }
        autoBidEnabled={hotelProfile.autoBidEnabled}
        userRole={userRole}
        canOverrideFloor={Boolean(currentUser?.canOverrideFloor)}
        onClose={() => {
          setCustomBidSessionId(null);
          setSuggestedPerkForBid(undefined);
        }}
        onSubmitBid={(sessionId, basePrice, perks) =>
          handleSubmitBid(sessionId, basePrice, perks, "custom")
        }
      />
    </div>
  );
}

export default App;
