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
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  X,
  Trash2,
  XCircle,
  Building2,
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
  type BranchFilter,
  type DailyRoomCell,
  type DateRangeKey,
  type HistoryStatus,
  type KpiType,
  type LiveSession,
  type MainTab,
  type MasterDataBundle,
  type PmsRoomRecord,
  type RejectCode,
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
import {
  RoomScheduleExplorer,
  type ExplorerStatusFilter,
  type ExplorerViewMode,
} from "@/components/RoomScheduleExplorer";
import { PaymentConversionFunnelPanel } from "@/components/PaymentConversionFunnelPanel";
import { SelectionBenchmarkLinePanel } from "@/components/SelectionBenchmarkLinePanel";
import { LifecycleStateExplorer } from "@/components/LifecycleStateExplorer";

type HistorySortKey =
  | "newest"
  | "oldest"
  | "price_desc"
  | "price_asc"
  | "total_desc"
  | "match_desc"
  | "match_asc";

const HISTORY_PAGE_SIZE = 10;

function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim();
}

function getMatchScoreStyle(score: number): {
  pillClass: string;
  dotClass: string;
  hint: string;
} {
  if (score >= 95) {
    return {
      pillClass:
        "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/80",
      dotClass: "bg-emerald-500",
      hint: `Khớp tối ưu (${score}%) · Bấm xem chi tiết tiêu chí`,
    };
  }
  if (score >= 90) {
    return {
      pillClass:
        "bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/80",
      dotClass: "bg-sky-500",
      hint: `Khớp tốt (${score}%) · Bấm xem chi tiết tiêu chí`,
    };
  }
  if (score >= 85) {
    return {
      pillClass:
        "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/80",
      dotClass: "bg-amber-500",
      hint: `Khớp khá (${score}%) · Có thể bù thêm đặc quyền`,
    };
  }
  return {
    pillClass:
      "bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/80",
    dotClass: "bg-rose-500",
    hint: `Khớp thấp (${score}%) · Lệch hoặc thiếu tiêu chí quan trọng`,
  };
}

interface PersistedUiPrefs {
  activeTab: MainTab;
  dateRange: DateRangeKey;
  branchFilter: BranchFilter;
  userRole: UserRole;
  showFormulas: boolean;
  historyFilter: "all" | HistoryStatus;
  historySortBy?: HistorySortKey;
  selectedAutopsyId: string;
  selectedScheduleDayOffset: number;
  explorerViewMode: ExplorerViewMode;
  explorerStatusFilter: ExplorerStatusFilter;
  explorerClassFilter: string;
  selectedRoomNum: number;
}

const DEFAULT_UI_STATE: PersistedUiPrefs = {
  activeTab: "workspace",
  dateRange: "30d",
  branchFilter: "all",
  userRole: "manager",
  showFormulas: false,
  historyFilter: "all",
  historySortBy: "newest",
  selectedAutopsyId: "CRQ-8924",
  selectedScheduleDayOffset: 0,
  explorerViewMode: "day",
  explorerStatusFilter: "all",
  explorerClassFilter: "all",
  selectedRoomNum: 108,
};

const UI_PREFS_STORAGE_KEY = "gns_ui_state_v26";

function readInitialUiPrefs(): Partial<PersistedUiPrefs> {
  try {
    const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedUiPrefs>;
  } catch {
    return {};
  }
}

export function App() {
  const initialUi = useMemo(() => readInitialUiPrefs(), []);

  const [bundle, setBundle] = useState<MasterDataBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<MainTab>(
    initialUi.activeTab ?? "workspace",
  );
  const [dateRange, setDateRange] = useState<DateRangeKey>(
    initialUi.dateRange ?? "30d",
  );
  const [branchFilter, setBranchFilter] = useState<BranchFilter>(
    initialUi.branchFilter ?? "all",
  );
  const [userRole, setUserRole] = useState<UserRole>(
    initialUi.userRole ?? "manager",
  );
  const [showFormulas, setShowFormulas] = useState<boolean>(
    initialUi.showFormulas ?? false,
  );
  const [historyFilter, setHistoryFilter] = useState<"all" | HistoryStatus>(
    initialUi.historyFilter ?? "all",
  );
  const [historySortBy, setHistorySortBy] = useState<HistorySortKey>(
    initialUi.historySortBy ?? "newest",
  );
  const [historySearch, setHistorySearch] = useState<string>("");
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [selectedAutopsyId, setSelectedAutopsyId] = useState<string>(
    initialUi.selectedAutopsyId ?? "CRQ-8924",
  );
  const [selectedScheduleDayOffset, setSelectedScheduleDayOffset] =
    useState<number>(initialUi.selectedScheduleDayOffset ?? 0);
  const [explorerViewMode, setExplorerViewMode] = useState<ExplorerViewMode>(
    initialUi.explorerViewMode ?? "day",
  );
  const [explorerStatusFilter, setExplorerStatusFilter] =
    useState<ExplorerStatusFilter>(initialUi.explorerStatusFilter ?? "all");
  const [explorerClassFilter, setExplorerClassFilter] = useState<string>(
    initialUi.explorerClassFilter ?? "all",
  );
  const [selectedRoomNum, setSelectedRoomNum] = useState<number>(
    initialUi.selectedRoomNum ?? 108,
  );
  const [liveCountdowns, setLiveCountdowns] = useState<Record<string, number>>(
    {},
  );
  const [holdCountdowns, setHoldCountdowns] = useState<Record<string, number>>(
    {},
  );
  const [expiredHoldSessionId, setExpiredHoldSessionId] = useState<
    string | null
  >(null);

  // Reset pagination to page 1 whenever filters, search query, sort order, or period changes
  useEffect(() => {
    setHistoryPage(1);
  }, [dateRange, branchFilter, historyFilter, historySearch, historySortBy]);

  // Persist UI preferences across modal close, tab switches, and page reloads
  useEffect(() => {
    try {
      const prefs: PersistedUiPrefs = {
        activeTab,
        dateRange,
        branchFilter,
        userRole,
        showFormulas,
        historyFilter,
        historySortBy,
        selectedAutopsyId,
        selectedScheduleDayOffset,
        explorerViewMode,
        explorerStatusFilter,
        explorerClassFilter,
        selectedRoomNum,
      };
      localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore quota errors
    }
  }, [
    activeTab,
    dateRange,
    branchFilter,
    userRole,
    showFormulas,
    historyFilter,
    historySortBy,
    selectedAutopsyId,
    selectedScheduleDayOffset,
    explorerViewMode,
    explorerStatusFilter,
    explorerClassFilter,
    selectedRoomNum,
  ]);

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
          const initialHolds: Record<string, number> = {};
          res.bundle.auctionSessions.forEach((s) => {
            if (s.status === "live") {
              initialCountdowns[s.id] =
                s.remainingSeconds ?? res.bundle.hotelProfile.bidTtlSeconds;
              if (
                s.holdRoomNumber != null &&
                (s.holdRemainingSeconds ?? 0) > 0
              ) {
                initialHolds[s.id] =
                  s.holdRemainingSeconds ??
                  res.bundle.hotelProfile.paymentHoldTtlSeconds ??
                  600;
              }
            }
          });
          setLiveCountdowns(initialCountdowns);
          setHoldCountdowns(initialHolds);
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

  // 1-second live countdown & 10-minute payment hold ticker
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
      setHoldCountdowns((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        for (const [id, sec] of Object.entries(prev)) {
          if (sec > 1) {
            next[id] = sec - 1;
            changed = true;
          } else if (sec === 1) {
            next[id] = 0;
            changed = true;
            setExpiredHoldSessionId(id);
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
    return computeDashboardAnalytics(
      bundle,
      dateRange,
      liveCountdowns,
      branchFilter,
      holdCountdowns,
    );
  }, [bundle, dateRange, liveCountdowns, branchFilter, holdCountdowns]);

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
    const liveRef = analytics?.liveSessions.find((ls) => ls.id === sessionId);
    const isStandby = Boolean(liveRef?.isBlockedByPaymentHold);
    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          requestStatus: "offers_comparing",
          bidStatus: isStandby ? "standby_hold_conflict" : "sent_waiting_guest",
          paymentStatus: isStandby ? "blocked_by_hold" : "not_started",
          bidSubmitted: {
            basePrice,
            perks,
            submittedAtText: isStandby
              ? "Đã gửi báo giá · Standby chờ phòng nhả khóa 10p"
              : "Đã gửi báo giá · Chờ khách TT 100%",
            mode,
          },
        };
      });

    setBundle({ ...bundle, auctionSessions: nextSessions });
    setCustomBidSessionId(null);
    setSuggestedPerkForBid(undefined);
    await persistMasterTable("auctionSessions", nextSessions);
    showToast(
      isStandby
        ? `Đã gửi báo giá Standby ${formatFullVnd(basePrice)}/đêm cho #${sessionId}. Phiên đang chờ phòng tạm khóa 10p nhả ra hoặc sẽ tự đóng nếu khách trước hoàn tất TT 100%.`
        : `Đã gửi báo giá ${formatFullVnd(basePrice)}/đêm cho #${sessionId}. Phòng vẫn mở khóa đến khi khách bấm thanh toán (giữ chỗ 10p) hoặc hoàn tất TT 100%.`,
    );
  };

  // Simulate Guest Clicking Checkout -> Acquires 10-minute Temporary Payment Hold (Movie-Seat Lock)
  const handleSimulateGuestStartHold10m = async (session: LiveSession) => {
    if (!bundle || !analytics) return;
    if (session.remainingSeconds <= 0) {
      showToast("Phiên đã hết hạn 60 phút, không thể tạo khóa thanh toán 10p.");
      return;
    }
    if (
      session.holdRoomNumber != null &&
      (session.holdRemainingSeconds ?? 0) > 0
    ) {
      showToast(
        `Phiên #${session.id} đang giữ tạm khóa phòng #${session.holdRoomNumber} rồi.`,
      );
      return;
    }

    const stayOffsets = parseStayDayOffsets(
      session.checkInDateRange,
      bundle.hotelProfile.referenceDate,
      session.nights,
    );
    const effectiveOffsets = stayOffsets.length > 0 ? stayOffsets : [0];
    const includesTonight = effectiveOffsets.includes(0);

    const classRooms = bundle.roomsPms
      .filter((r) => r.roomClassId === session.matchedRoomClassId)
      .sort(
        (a, b) =>
          Number(b.branchId === session.branchId) -
            Number(a.branchId === session.branchId) ||
          a.roomNumber - b.roomNumber,
      );

    const candidateRoom = classRooms.find((r) =>
      effectiveOffsets.every((off) => {
        const daySched = analytics.dailyRoomSchedules[off];
        const cell = daySched?.rooms.find((c) => c.roomNumber === r.roomNumber);
        return cell?.status === "vacant_unlocked";
      }),
    );

    if (!candidateRoom) {
      showToast(
        "Không còn phòng trống mở khóa để giữ chỗ 10 phút — phòng đang được khách khác thanh toán hoặc đã khóa.",
      );
      return;
    }

    const holdTtlSec = bundle.hotelProfile.paymentHoldTtlSeconds ?? 600;
    const offeredBase =
      session.bidSubmitted?.basePrice ?? session.aiSuggestedBasePrice;

    const nextRoomsPms: PmsRoomRecord[] = includesTonight
      ? bundle.roomsPms.map((r) =>
          r.roomNumber === candidateRoom.roomNumber
            ? {
                ...r,
                status: "payment_hold",
                sourceChannel: "Tạm khóa 10p chờ TT (goodNstay)",
                linkedReqId: session.id,
                holdRemainingSeconds: holdTtlSec,
                holdExpiresAtLabel: "10:00",
                checkOutTomorrow: false,
              }
            : r,
        )
      : bundle.roomsPms;

    const nextOther0 = nextRoomsPms.filter(
      (r) => r.status === "booked_other",
    ).length;
    const nextAuction0 = nextRoomsPms.filter(
      (r) => r.status === "booked_auction",
    ).length;
    const nextHold0 = nextRoomsPms.filter(
      (r) => r.status === "payment_hold",
    ).length;
    const nextVacant0 = Math.max(
      0,
      bundle.hotelProfile.totalRooms - (nextOther0 + nextAuction0 + nextHold0),
    );

    const nextCalendar14d = bundle.calendar14dPms.map((d) => {
      if (d.dayOffset === 0) {
        return {
          ...d,
          otherBooked: nextOther0,
          auctionBooked: nextAuction0,
          paymentHoldRooms: nextHold0,
          vacantRooms: nextVacant0,
        };
      }
      if (effectiveOffsets.includes(d.dayOffset)) {
        const nextHold = Math.min(
          d.totalRooms - d.otherBooked - d.auctionBooked,
          (d.paymentHoldRooms ?? 0) + 1,
        );
        return {
          ...d,
          paymentHoldRooms: nextHold,
          vacantRooms: Math.max(
            0,
            d.totalRooms - d.otherBooked - d.auctionBooked - nextHold,
          ),
        };
      }
      return d;
    });

    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        if (s.id !== session.id) return s;
        return {
          ...s,
          branchId: candidateRoom.branchId,
          branchName: candidateRoom.branchName,
          holdRoomNumber: candidateRoom.roomNumber,
          holdRemainingSeconds: holdTtlSec,
          requestStatus: "checkout_hold_10m",
          bidStatus: "payment_hold_10m",
          paymentStatus: "awaiting_hold_10m",
          bidSubmitted: s.bidSubmitted ?? {
            basePrice: offeredBase,
            perks: ["Miễn phí Buffet sáng 2 khách"],
            submittedAtText: `Khách đang tạm khóa #${candidateRoom.roomNumber} chờ TT (10p)`,
            mode: "quick",
          },
        };
      });

    setHoldCountdowns((prev) => ({
      ...prev,
      [session.id]: holdTtlSec,
    }));
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

    showToast(
      `Khách #${session.id} bấm thanh toán → Đã tạm khóa phòng #${candidateRoom.roomNumber} trong 10:00 (khách khác không thể chọn trùng ghế này).`,
    );
  };

  // Release 10-minute Temporary Payment Hold (Timeout 00:00 / Card Declined / Guest Exited Checkout)
  const handleReleasePaymentHold = useCallback(
    async (
      sessionId: string,
      reasonCode:
        | "REJ_HOLD_EXPIRED_10M"
        | "REJ_PAYMENT_GATEWAY_DECLINED"
        | "REJ_GUEST_ABANDONED_HOLD" = "REJ_HOLD_EXPIRED_10M",
    ) => {
      if (!bundle) return;
      const rawSession = bundle.auctionSessions.find((s) => s.id === sessionId);
      if (!rawSession || rawSession.status !== "live") return;

      const heldRoomNum = rawSession.holdRoomNumber;
      const stayOffsets = parseStayDayOffsets(
        rawSession.checkInDateRange ?? "06/11 – 07/11",
        bundle.hotelProfile.referenceDate,
        rawSession.nights,
      );
      const effectiveOffsets = stayOffsets.length > 0 ? stayOffsets : [0];
      const includesTonight = effectiveOffsets.includes(0);

      const nextRoomsPms: PmsRoomRecord[] =
        heldRoomNum != null && includesTonight
          ? bundle.roomsPms.map((r) =>
              r.roomNumber === heldRoomNum && r.status === "payment_hold"
                ? {
                    ...r,
                    status: "vacant_unlocked",
                    sourceChannel: "Trống · Mở đấu giá",
                    linkedReqId: null,
                    holdRemainingSeconds: 0,
                    holdExpiresAtLabel: null,
                    checkOutTomorrow: false,
                  }
                : r,
            )
          : bundle.roomsPms;

      const nextOther0 = nextRoomsPms.filter(
        (r) => r.status === "booked_other",
      ).length;
      const nextAuction0 = nextRoomsPms.filter(
        (r) => r.status === "booked_auction",
      ).length;
      const nextHold0 = nextRoomsPms.filter(
        (r) => r.status === "payment_hold",
      ).length;
      const nextVacant0 = Math.max(
        0,
        bundle.hotelProfile.totalRooms -
          (nextOther0 + nextAuction0 + nextHold0),
      );

      const nextCalendar14d = bundle.calendar14dPms.map((d) => {
        if (d.dayOffset === 0) {
          return {
            ...d,
            otherBooked: nextOther0,
            auctionBooked: nextAuction0,
            paymentHoldRooms: nextHold0,
            vacantRooms: nextVacant0,
          };
        }
        if (heldRoomNum != null && effectiveOffsets.includes(d.dayOffset)) {
          const nextHold = Math.max(0, (d.paymentHoldRooms ?? 0) - 1);
          return {
            ...d,
            paymentHoldRooms: nextHold,
            vacantRooms: Math.max(
              0,
              d.totalRooms - d.otherBooked - d.auctionBooked - nextHold,
            ),
          };
        }
        return d;
      });

      const staySpanClean = (
        rawSession.checkInDateRange ??
        rawSession.stayDatesLabel ??
        "06/11 – 07/11"
      ).split(" (")[0];
      const offeredBasePrice =
        rawSession.bidSubmitted?.basePrice ??
        rawSession.aiSuggestedBasePrice ??
        rawSession.offeredBasePrice ??
        1000000;
      const reasonNote =
        reasonCode === "REJ_HOLD_EXPIRED_10M"
          ? `Hết hạn giữ phòng 10p (#${heldRoomNum ?? "--"}) · Hệ thống tự nhả khóa mở lại cho phiên khác`
          : reasonCode === "REJ_PAYMENT_GATEWAY_DECLINED"
            ? `Cổng TT báo lỗi thẻ/3DS (#${heldRoomNum ?? "--"}) · Đã nhả khóa 10p về phòng trống`
            : `Khách thoát trang thanh toán (#${heldRoomNum ?? "--"}) · Đã nhả khóa 10p tức thì`;

      const nextSessions: AuctionSessionMasterRecord[] =
        bundle.auctionSessions.map((s) => {
          if (s.id !== sessionId) return s;
          return {
            ...s,
            status: "payment_failed",
            requestStatus: "closed_unbooked",
            bidStatus: "release_after_hold",
            paymentStatus:
              reasonCode === "REJ_HOLD_EXPIRED_10M"
                ? "expired_hold_10m"
                : reasonCode === "REJ_GUEST_ABANDONED_HOLD"
                  ? "abandoned_by_guest"
                  : "failed_gateway",
            rejectCode: reasonCode,
            holdRoomNumber: null,
            holdRemainingSeconds: 0,
            sessionDate: bundle.hotelProfile.referenceDate,
            dateTimeLabel: "06/11 • Nhả khóa 10p",
            stayDatesLabel: staySpanClean,
            guestRequestTitle:
              rawSession.guestSummary ??
              rawSession.guestRequestTitle ??
              "Yêu cầu lưu trú",
            amenitiesTags: rawSession.amenities ?? rawSession.amenitiesTags,
            roomCategory:
              rawSession.mandatoryRoomCategory ??
              rawSession.roomCategory ??
              "DELUXE",
            offeredRoom:
              rawSession.matchedRoomName ?? rawSession.offeredRoom ?? "",
            offeredBasePrice,
            bidMode:
              rawSession.bidSubmitted?.mode === "auto" ? "auto" : "manual",
            responseMinutes: 1.4,
            guestOpenedDetail: true,
            lossReasonId: "payment_abandoned",
            resultNote: reasonNote,
            showInHistory: true,
          };
        });

      setHoldCountdowns((prev) => {
        const copy = { ...prev };
        delete copy[sessionId];
        return copy;
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

      showToast(
        `Đã nhả khóa tạm 10p của #${sessionId}${heldRoomNum ? ` (Phòng #${heldRoomNum} trở về Trống mở khóa)` : ""} · Các phiên Standby trùng ngày có thể thanh toán ngay!`,
      );
    },
    [bundle, showToast],
  );

  // Auto-release if a 10-minute countdown naturally hits 00:00
  useEffect(() => {
    if (!expiredHoldSessionId) return;
    const targetId = expiredHoldSessionId;
    setExpiredHoldSessionId(null);
    void handleReleasePaymentHold(targetId, "REJ_HOLD_EXPIRED_10M");
  }, [expiredHoldSessionId, handleReleasePaymentHold]);

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

    const wasHoldingThisSession =
      session.holdRoomNumber != null &&
      (session.holdRemainingSeconds ?? 0) > 0;

    // 1) If this session already holds a 10-minute reserved room (like a reserved cinema seat), commit that exact room!
    const heldRoomRecord = wasHoldingThisSession
      ? bundle.roomsPms.find((r) => r.roomNumber === session.holdRoomNumber)
      : undefined;

    // 2) Otherwise find a vacant_unlocked room across ALL nights of the stay (never steal another session's payment_hold room!)
    const classRooms = bundle.roomsPms
      .filter((r) => r.roomClassId === session.matchedRoomClassId)
      .sort(
        (a, b) =>
          Number(b.branchId === session.branchId) -
            Number(a.branchId === session.branchId) ||
          a.roomNumber - b.roomNumber,
      );

    const candidateAcrossAllNights = classRooms.find((r) =>
      effectiveOffsets.every((off) => {
        const daySched = analytics.dailyRoomSchedules[off];
        const cell = daySched?.rooms.find((c) => c.roomNumber === r.roomNumber);
        return cell?.status === "vacant_unlocked";
      }),
    );

    const firstOff = effectiveOffsets[0];
    const fallbackCandidate = classRooms.find((r) => {
      const cell = analytics.dailyRoomSchedules[firstOff]?.rooms.find(
        (c) => c.roomNumber === r.roomNumber,
      );
      return cell?.status === "vacant_unlocked";
    });

    const lockedRoom =
      heldRoomRecord ?? candidateAcrossAllNights ?? fallbackCandidate;

    if (!lockedRoom) {
      showToast(
        session.isBlockedByPaymentHold
          ? `Phòng hạng này đang tạm khóa 10 phút chờ khách #${session.heldByReqIds.join(", #")} thanh toán — vui lòng chờ nhả khóa.`
          : "Hạng phòng này đã hết buồng trống trong khoảng ngày lưu trú.",
      );
      return;
    }

    // Check which stay dates in this room class drop to 0 (vacant + payment_hold) rooms after permanent lock
    const soldOutOffsets = new Set<number>();
    effectiveOffsets.forEach((off) => {
      const schedRooms =
        analytics.dailyRoomSchedules[off]?.rooms.filter(
          (c) => c.roomClassId === session.matchedRoomClassId,
        ) ?? [];
      const openOrHoldBefore = schedRooms.filter(
        (c) => c.status === "vacant_unlocked" || c.status === "payment_hold",
      ).length;
      if (openOrHoldBefore - 1 <= 0) {
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
                holdRemainingSeconds: 0,
                holdExpiresAtLabel: null,
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
    const nextHoldTotal = nextRoomsPms.filter(
      (r) => r.status === "payment_hold",
    ).length;
    const nextVacantTotal = Math.max(
      0,
      bundle.hotelProfile.totalRooms -
        (nextOtherTotal + nextAuctionTotal + nextHoldTotal),
    );

    const nextCalendar14d = bundle.calendar14dPms.map((d) => {
      if (d.dayOffset === 0) {
        return {
          ...d,
          otherBooked: nextOtherTotal,
          auctionBooked: nextAuctionTotal,
          paymentHoldRooms: nextHoldTotal,
          vacantRooms: nextVacantTotal,
        };
      }
      if (effectiveOffsets.includes(d.dayOffset)) {
        const nextHold = wasHoldingThisSession
          ? Math.max(0, (d.paymentHoldRooms ?? 0) - 1)
          : (d.paymentHoldRooms ?? 0);
        const nextAuc = Math.min(
          d.totalRooms - d.otherBooked - nextHold,
          d.auctionBooked + 1,
        );
        return {
          ...d,
          auctionBooked: nextAuc,
          paymentHoldRooms: nextHold,
          vacantRooms: Math.max(
            0,
            d.totalRooms - d.otherBooked - nextAuc - nextHold,
          ),
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
            branchId: lockedRoom.branchId,
            branchName: lockedRoom.branchName,
            status: "won",
            requestStatus: "confirmed_paid",
            bidStatus: "won_paid_100",
            paymentStatus: "paid_escrow_100",
            rejectCode: null,
            holdRoomNumber: null,
            holdRemainingSeconds: 0,
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
            bidMode: session.bidSubmitted?.mode === "auto" ? "auto" : "manual",
            responseMinutes: 1.5,
            guestOpenedDetail: true,
            closeMinutes: 2.3,
            closeSpeedText: "02p 18s",
            lockedRoomNumber: lockedRoom.roomNumber,
            resultNote: `Đã TT 100% · Khóa cứng #${lockedRoom.roomNumber} (${staySpanClean})`,
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
              requestStatus: "closed_unbooked",
              bidStatus: "auto_closed",
              paymentStatus: "not_started",
              rejectCode: "REJ_AUTO_CLOSED_SOLD_OUT",
              holdRoomNumber: null,
              holdRemainingSeconds: 0,
              dateTimeLabel: "06/11 • Tự đóng",
              resultNote: `Tự đóng do hạng ${session.matchedRoomName} đã khóa hết phòng ngày trùng (#${lockedRoom.roomNumber})`,
              showInHistory: true,
            };
          }
        }
        return s;
      });

    setHoldCountdowns((prev) => {
      const copy = { ...prev };
      delete copy[session.id];
      autoClosedSiblingIds.forEach((id) => delete copy[id]);
      return copy;
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
        `Khách #${session.id} đã TT 100% → Khóa cứng phòng #${lockedRoom.roomNumber} (${lockedRoom.branchName}) & tự đóng phiên trùng #${autoClosedSiblingIds.join(", #")}.`,
      );
    } else {
      showToast(
        `Khách #${session.id} đã TT 100% → Đã khóa cứng phòng #${lockedRoom.roomNumber} (${lockedRoom.branchName} · Doanh thu +${formatFullVnd(baseAmt)}).`,
      );
    }
  };

  // Toggle Manual Lock / Unlock on any physical room #101-#130 (Today Day 0 or Future Days 1..13)
  const handleToggleRoomLock = async (
    dayOffset: number,
    cell: DailyRoomCell,
  ) => {
    if (!bundle || !analytics) return;

    if (cell.status === "booked_auction") {
      showToast(
        `Phòng #${cell.roomNumber} đã được khách #${cell.linkedReqId ?? "goodNstay"} thanh toán 100% — hệ thống khóa cứng bảo vệ khách (không thể mở khóa thủ công).`,
      );
      return;
    }

    if (cell.status === "payment_hold") {
      showToast(
        `Phòng #${cell.roomNumber} đang tạm khóa 10 phút chờ khách #${cell.linkedReqId ?? "goodNstay"} thanh toán — không thể khóa/mở khóa thủ công khi ghế đang giữ thanh toán.`,
      );
      return;
    }

    const willLock = cell.status === "vacant_unlocked";

    if (dayOffset === 0) {
      const nextRoomsPms: PmsRoomRecord[] = bundle.roomsPms.map((r) =>
        r.roomNumber === cell.roomNumber
          ? willLock
            ? {
                ...r,
                status: "booked_other",
                sourceChannel: "Lễ tân / Khóa tay",
                linkedReqId: null,
                checkOutTomorrow: false,
              }
            : {
                ...r,
                status: "vacant_unlocked",
                sourceChannel: "Trống · Mở đấu giá",
                linkedReqId: null,
                checkOutTomorrow: false,
              }
          : r,
      );

      const nextOther = nextRoomsPms.filter(
        (r) => r.status === "booked_other",
      ).length;
      const nextAuction = nextRoomsPms.filter(
        (r) => r.status === "booked_auction",
      ).length;
      const nextHold = nextRoomsPms.filter(
        (r) => r.status === "payment_hold",
      ).length;
      const nextVacant = Math.max(
        0,
        bundle.hotelProfile.totalRooms - (nextOther + nextAuction + nextHold),
      );

      const nextCalendar14d = bundle.calendar14dPms.map((d) =>
        d.dayOffset === 0
          ? {
              ...d,
              otherBooked: nextOther,
              auctionBooked: nextAuction,
              paymentHoldRooms: nextHold,
              vacantRooms: nextVacant,
            }
          : d,
      );

      setBundle({
        ...bundle,
        roomsPms: nextRoomsPms,
        calendar14dPms: nextCalendar14d,
      });

      await Promise.all([
        persistMasterTable("roomsPms", nextRoomsPms),
        persistMasterTable("calendar14dPms", nextCalendar14d),
      ]);

      showToast(
        willLock
          ? `Đã KHÓA thủ công phòng #${cell.roomNumber} (${cell.roomClass}) hôm nay · Quỹ phòng đấu giá còn ${nextVacant} phòng trống.`
          : `Đã MỞ KHÓA phòng #${cell.roomNumber} (${cell.roomClass}) vào quỹ đấu giá hôm nay · Hiện có ${nextVacant} phòng trống.`,
      );
      return;
    }

    // Future Day (dayOffset = 1..13)
    const targetSched = analytics.dailyRoomSchedules[dayOffset];
    const dateStr = targetSched?.dateStr ?? `Ngày +${dayOffset}`;
    const nextCalendar14d = bundle.calendar14dPms.map((d) => {
      if (d.dayOffset !== dayOffset) return d;
      const prevOverrides = d.manualOverrides ?? {};
      const nextOverrides: Record<string, "vacant_unlocked" | "booked_other"> =
        {
          ...prevOverrides,
          [String(cell.roomNumber)]: willLock
            ? "booked_other"
            : "vacant_unlocked",
        };
      return {
        ...d,
        manualOverrides: nextOverrides,
      };
    });

    setBundle({
      ...bundle,
      calendar14dPms: nextCalendar14d,
    });
    await persistMasterTable("calendar14dPms", nextCalendar14d);

    showToast(
      willLock
        ? `Đã KHÓA thủ công phòng #${cell.roomNumber} ngày ${dateStr}.`
        : `Đã MỞ KHÓA phòng #${cell.roomNumber} nhận đấu giá ngày ${dateStr}.`,
    );
  };

  // Quick Lock / Unlock 1 room in a Room Class (operates on currently selected schedule date!)
  const handleQuickClassLockToggle = async (
    roomClassId: string,
    action: "lock" | "unlock",
  ) => {
    if (!analytics) return;
    const activeSched =
      analytics.dailyRoomSchedules.find(
        (d) => d.dayOffset === selectedScheduleDayOffset,
      ) ?? analytics.dailyRoomSchedules[0];
    const dayRooms = activeSched?.rooms ?? [];
    const targetCell =
      action === "lock"
        ? dayRooms
            .filter(
              (r) =>
                r.roomClassId === roomClassId && r.status === "vacant_unlocked",
            )
            .at(-1)
        : dayRooms.find(
            (r) => r.roomClassId === roomClassId && r.status === "booked_other",
          );
    if (!targetCell) {
      showToast(
        action === "lock"
          ? `Hạng phòng này không còn phòng trống để khóa thêm trong ngày ${activeSched?.dateStr ?? "06/11"}.`
          : `Các phòng đã khóa còn lại ngày ${activeSched?.dateStr ?? "06/11"} đều là đơn goodNstay TT 100% (đã khóa bảo vệ khách).`,
      );
      return;
    }
    setSelectedRoomNum(targetCell.roomNumber);
    await handleToggleRoomLock(activeSched.dayOffset, targetCell);
  };

  // Run Auto-Bid on all eligible open Live Sessions
  const handleRunAutoBidNow = async () => {
    if (!bundle || !analytics) return;
    const eligibleOpen = analytics.liveSessions.filter(
      (ls) =>
        ls.remainingSeconds > 0 &&
        !ls.bidSubmitted &&
        ls.isAutoBidEligible &&
        ls.vacantForStay > 0,
    );
    if (eligibleOpen.length === 0) {
      showToast("Hiện không có phiên Live nào cần chạy Auto-Bid thêm.");
      return;
    }
    const eligibleMap = new Map(eligibleOpen.map((ls) => [ls.id, ls]));
    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        const ls = eligibleMap.get(s.id);
        if (!ls) return s;
        return {
          ...s,
          bidSubmitted: {
            basePrice: ls.aiSuggestedBasePrice,
            perks: ["Miễn phí Buffet sáng 2 khách"],
            submittedAtText: "Auto-Bid gửi tự động · Chờ khách TT 100%",
            mode: "auto",
          },
        };
      });

    setBundle({ ...bundle, auctionSessions: nextSessions });
    await persistMasterTable("auctionSessions", nextSessions);
    showToast(
      `Auto-Bid đã tự động gửi báo giá 1 lần cho ${eligibleOpen.length} phiên hợp lệ (${eligibleOpen.map((x) => `#${x.id}`).join(", ")}).`,
    );
  };

  // Simulate Guest Rejecting a Submitted Bid (also releases 10m hold if active)
  const handleSimulateGuestReject = async (session: LiveSession) => {
    if (!bundle) return;
    const offeredBasePrice =
      session.bidSubmitted?.basePrice ?? session.aiSuggestedBasePrice;
    const staySpanClean = session.checkInDateRange.split(" (")[0];
    const heldRoomNum = session.holdRoomNumber;
    const stayOffsets = parseStayDayOffsets(
      session.checkInDateRange,
      bundle.hotelProfile.referenceDate,
      session.nights,
    );
    const effectiveOffsets = stayOffsets.length > 0 ? stayOffsets : [0];
    const includesTonight = effectiveOffsets.includes(0);

    const nextRoomsPms: PmsRoomRecord[] =
      heldRoomNum != null && includesTonight
        ? bundle.roomsPms.map((r) =>
            r.roomNumber === heldRoomNum && r.status === "payment_hold"
              ? {
                  ...r,
                  status: "vacant_unlocked",
                  sourceChannel: "Trống · Mở đấu giá",
                  linkedReqId: null,
                  holdRemainingSeconds: 0,
                  holdExpiresAtLabel: null,
                  checkOutTomorrow: false,
                }
              : r,
          )
        : bundle.roomsPms;

    const nextOther0 = nextRoomsPms.filter(
      (r) => r.status === "booked_other",
    ).length;
    const nextAuction0 = nextRoomsPms.filter(
      (r) => r.status === "booked_auction",
    ).length;
    const nextHold0 = nextRoomsPms.filter(
      (r) => r.status === "payment_hold",
    ).length;
    const nextVacant0 = Math.max(
      0,
      bundle.hotelProfile.totalRooms - (nextOther0 + nextAuction0 + nextHold0),
    );

    const nextCalendar14d =
      heldRoomNum != null
        ? bundle.calendar14dPms.map((d) => {
            if (d.dayOffset === 0) {
              return {
                ...d,
                otherBooked: nextOther0,
                auctionBooked: nextAuction0,
                paymentHoldRooms: nextHold0,
                vacantRooms: nextVacant0,
              };
            }
            if (effectiveOffsets.includes(d.dayOffset)) {
              const nextHold = Math.max(0, (d.paymentHoldRooms ?? 0) - 1);
              return {
                ...d,
                paymentHoldRooms: nextHold,
                vacantRooms: Math.max(
                  0,
                  d.totalRooms - d.otherBooked - d.auctionBooked - nextHold,
                ),
              };
            }
            return d;
          })
        : bundle.calendar14dPms;

    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        if (s.id !== session.id) return s;
        return {
          ...s,
          status: "rejected",
          requestStatus: "closed_unbooked",
          bidStatus: "lost_to_competitor",
          paymentStatus:
            heldRoomNum != null ? "abandoned_by_guest" : "not_started",
          rejectCode: "REJ_COMPETITOR_WON_PRICE",
          holdRoomNumber: null,
          holdRemainingSeconds: 0,
          sessionDate: bundle.hotelProfile.referenceDate,
          dateTimeLabel: "06/11 • Khách từ chối",
          stayDatesLabel: staySpanClean,
          guestRequestTitle: session.guestSummary,
          amenitiesTags: session.amenities,
          roomCategory: session.mandatoryRoomCategory,
          offeredRoom: session.matchedRoomName,
          offeredBasePrice,
          bidMode: session.bidSubmitted?.mode === "auto" ? "auto" : "manual",
          responseMinutes: 1.8,
          guestOpenedDetail: true,
          lossReasonId: "price_high",
          resultNote:
            heldRoomNum != null
              ? `Khách hủy thanh toán (#${heldRoomNum} đã nhả khóa) · Chọn đối thủ giá mềm hơn`
              : "Khách chọn đối thủ cùng khu vực có giá mềm hơn",
          autopsyId: "CRQ-8924",
          showInHistory: true,
        };
      });

    if (heldRoomNum != null) {
      setHoldCountdowns((prev) => {
        const copy = { ...prev };
        delete copy[session.id];
        return copy;
      });
    }

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
    showToast(
      `Đã mô phỏng khách từ chối #${session.id}${heldRoomNum ? ` (đã nhả khóa #${heldRoomNum})` : ""} → Tỷ lệ được chọn & biểu đồ Pareto đã cập nhật.`,
    );
  };

  // Hotel Partner Explicitly Skips / Declines an Open Live Request (REJ_PARTNER_SKIPPED_SESSION)
  const handlePartnerSkipSession = async (session: LiveSession) => {
    if (!bundle) return;
    const staySpanClean = session.checkInDateRange.split(" (")[0];
    const nextSessions: AuctionSessionMasterRecord[] =
      bundle.auctionSessions.map((s) => {
        if (s.id !== session.id) return s;
        return {
          ...s,
          status: "partner_declined",
          requestStatus: "bidding_open",
          bidStatus: "partner_declined",
          paymentStatus: "not_started",
          rejectCode: "REJ_PARTNER_SKIPPED_SESSION",
          holdRoomNumber: null,
          holdRemainingSeconds: 0,
          sessionDate: bundle.hotelProfile.referenceDate,
          dateTimeLabel: "06/11 • KS bỏ qua",
          stayDatesLabel: staySpanClean,
          guestRequestTitle: session.guestSummary,
          amenitiesTags: session.amenities,
          roomCategory: session.mandatoryRoomCategory,
          offeredRoom: session.matchedRoomName,
          offeredBasePrice: session.aiSuggestedBasePrice,
          bidMode: "manual",
          responseMinutes: undefined,
          guestOpenedDetail: false,
          resultNote:
            "Khách sạn chủ động bỏ qua phiên · Giữ phòng cho kênh khách lẻ",
          showInHistory: true,
        };
      });

    setBundle({ ...bundle, auctionSessions: nextSessions });
    await persistMasterTable("auctionSessions", nextSessions);
    showToast(
      `Khách sạn đã bỏ qua phiên #${session.id} (Mã REJ_PARTNER_SKIPPED_SESSION · Không ảnh hưởng điểm ELO).`,
    );
  };

  // Save Auto-Bid Rule from Loss Autopsy
  const handleApplyAutopsyRule = async (caseId: string, ruleTitle: string) => {
    if (!bundle) return;
    const exists = bundle.botRules.some((r) => r.sourceCaseId === caseId);
    if (exists) {
      showToast("Quy tắc Auto-Bid này đã có trong danh sách bên dưới.");
      return;
    }
    const nextRules = [
      ...bundle.botRules,
      {
        ruleId: `RULE-0${bundle.botRules.length + 1}`,
        title: ruleTitle,
        active: true,
        createdAt: bundle.hotelProfile.referenceDate,
        sourceCaseId: caseId,
      },
    ];
    setBundle({ ...bundle, botRules: nextRules });
    await persistMasterTable("botRules", nextRules);
    showToast(`Đã thêm & kích hoạt quy tắc Auto-Bid: "${ruleTitle}"`);
  };

  const handleToggleBotRule = async (ruleId: string, checked: boolean) => {
    if (!bundle) return;
    const nextRules = bundle.botRules.map((r) =>
      r.ruleId === ruleId ? { ...r, active: checked } : r,
    );
    setBundle({ ...bundle, botRules: nextRules });
    await persistMasterTable("botRules", nextRules);
    showToast(
      checked
        ? `Đã bật quy tắc ${ruleId}.`
        : `Đã tạm tắt quy tắc ${ruleId}.`,
    );
  };

  const handleDeleteBotRule = async (ruleId: string) => {
    if (!bundle) return;
    const nextRules = bundle.botRules.filter((r) => r.ruleId !== ruleId);
    setBundle({ ...bundle, botRules: nextRules });
    await persistMasterTable("botRules", nextRules);
    showToast(`Đã xóa quy tắc ${ruleId} khỏi cấu hình Auto-Bid.`);
  };

  // Reset Master Data & UI State to Clean Seed
  const handleResetDemo = async () => {
    try {
      localStorage.removeItem(UI_PREFS_STORAGE_KEY);
    } catch {
      // ignore
    }
    const fresh = await resetMasterDataToSeed();
    setBundle(fresh.bundle);
    const freshCountdowns: Record<string, number> = {};
    const freshHolds: Record<string, number> = {};
    fresh.bundle.auctionSessions.forEach((s) => {
      if (s.status === "live") {
        freshCountdowns[s.id] =
          s.remainingSeconds ?? fresh.bundle.hotelProfile.bidTtlSeconds;
        if (s.holdRoomNumber != null && (s.holdRemainingSeconds ?? 0) > 0) {
          freshHolds[s.id] =
            s.holdRemainingSeconds ??
            fresh.bundle.hotelProfile.paymentHoldTtlSeconds ??
            600;
        }
      }
    });
    setLiveCountdowns(freshCountdowns);
    setHoldCountdowns(freshHolds);
    setExpiredHoldSessionId(null);
    setActiveTab(DEFAULT_UI_STATE.activeTab);
    setDateRange(DEFAULT_UI_STATE.dateRange);
    setBranchFilter(DEFAULT_UI_STATE.branchFilter);
    setUserRole(DEFAULT_UI_STATE.userRole);
    setShowFormulas(DEFAULT_UI_STATE.showFormulas);
    setSelectedScheduleDayOffset(DEFAULT_UI_STATE.selectedScheduleDayOffset);
    setExplorerViewMode(DEFAULT_UI_STATE.explorerViewMode);
    setExplorerStatusFilter(DEFAULT_UI_STATE.explorerStatusFilter);
    setExplorerClassFilter(DEFAULT_UI_STATE.explorerClassFilter);
    setSelectedRoomNum(DEFAULT_UI_STATE.selectedRoomNum);
    setHistoryFilter(DEFAULT_UI_STATE.historyFilter);
    setHistorySortBy(DEFAULT_UI_STATE.historySortBy ?? "newest");
    setHistorySearch("");
    setHistoryPage(1);
    setSelectedAutopsyId(DEFAULT_UI_STATE.selectedAutopsyId);
    showToast("Đã khôi phục dữ liệu mẫu & lịch phòng về ngày 06/11/2026.");
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
  const selectedDaySchedule =
    analytics.dailyRoomSchedules.find(
      (d) => d.dayOffset === selectedScheduleDayOffset,
    ) ?? analytics.dailyRoomSchedules[0];
  const selectedDayOccupied =
    selectedDaySchedule.otherBooked + selectedDaySchedule.auctionBooked;

  const openRoomScheduleForSession = (
    session: LiveSession,
    modalType: "rooms_vacant" | "rooms_occupied" = "rooms_vacant",
  ) => {
    const offsets = parseStayDayOffsets(
      session.checkInDateRange,
      hotelProfile.referenceDate,
      session.nights,
    );
    const blockedOff = offsets.find((off) => {
      const sched = analytics.dailyRoomSchedules[off];
      const vac =
        sched?.rooms.filter(
          (r) =>
            r.roomClassId === session.matchedRoomClassId &&
            r.status === "vacant_unlocked",
        ).length ?? 0;
      return vac <= 0;
    });
    const targetOffset = blockedOff ?? offsets[0] ?? 0;
    setSelectedScheduleDayOffset(targetOffset);
    setExplorerStatusFilter("all");
    setExplorerClassFilter("all");
    setActiveKpiModal(modalType);
  };

  const activeCustomBidSession =
    analytics.liveSessions.find((s) => s.id === customBidSessionId) ?? null;

  const normalizedHistoryQuery = normalizeSearchText(historySearch);
  const indexedHistory = analytics.historySessions.map((session, origIdx) => ({
    session,
    origIdx,
  }));

  const searchMatchedIndexedHistory = normalizedHistoryQuery
    ? indexedHistory.filter(({ session: h }) => {
        const statusText =
          h.status === "won"
            ? "Đã TT 100%"
            : h.status === "payment_failed"
              ? "Lỗi TT / Nhả khóa 10p"
              : h.status === "partner_declined"
                ? "KS bỏ qua"
                : h.status === "rejected"
                  ? "Khách từ chối"
                  : h.status === "expired"
                    ? "Hết hạn 60p"
                    : "Tự đóng";
        const haystack = normalizeSearchText(
          [
            `#${h.id}`,
            h.id,
            h.guestRequestTitle,
            h.stayDatesLabel,
            h.dateTimeLabel,
            h.roomCategory,
            h.offeredRoom,
            h.branchName,
            h.resultNote,
            h.rejectCode ?? "",
            statusText,
            ...(h.amenitiesTags ?? []),
          ].join(" "),
        );
        return haystack.includes(normalizedHistoryQuery);
      })
    : indexedHistory;

  const historyCounts: Record<"all" | HistoryStatus, number> = {
    all: searchMatchedIndexedHistory.length,
    won: searchMatchedIndexedHistory.filter((x) => x.session.status === "won")
      .length,
    payment_failed: searchMatchedIndexedHistory.filter(
      (x) => x.session.status === "payment_failed",
    ).length,
    rejected: searchMatchedIndexedHistory.filter(
      (x) => x.session.status === "rejected",
    ).length,
    expired: searchMatchedIndexedHistory.filter(
      (x) => x.session.status === "expired",
    ).length,
    auto_closed: searchMatchedIndexedHistory.filter(
      (x) => x.session.status === "auto_closed",
    ).length,
    partner_declined: searchMatchedIndexedHistory.filter(
      (x) => x.session.status === "partner_declined",
    ).length,
  };

  const filteredHistory = searchMatchedIndexedHistory
    .filter(({ session: h }) =>
      historyFilter === "all" ? true : h.status === historyFilter,
    )
    .sort((a, b) => {
      switch (historySortBy) {
        case "oldest":
          return b.origIdx - a.origIdx;
        case "price_desc":
          return (
            b.session.offeredBasePrice - a.session.offeredBasePrice ||
            a.origIdx - b.origIdx
          );
        case "price_asc":
          return (
            a.session.offeredBasePrice - b.session.offeredBasePrice ||
            a.origIdx - b.origIdx
          );
        case "total_desc": {
          const totalA =
            a.session.hotelEarnedBase ??
            a.session.offeredBasePrice * a.session.nights;
          const totalB =
            b.session.hotelEarnedBase ??
            b.session.offeredBasePrice * b.session.nights;
          return totalB - totalA || a.origIdx - b.origIdx;
        }
        case "match_desc":
          return (
            b.session.matchScore - a.session.matchScore || a.origIdx - b.origIdx
          );
        case "match_asc":
          return (
            a.session.matchScore - b.session.matchScore || a.origIdx - b.origIdx
          );
        case "newest":
        default:
          return a.origIdx - b.origIdx;
      }
    })
    .map((x) => x.session);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredHistory.length / HISTORY_PAGE_SIZE),
  );
  const safeHistoryPage = Math.min(Math.max(1, historyPage), totalHistoryPages);
  const historyPageStartIdx = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;
  const paginatedHistory = filteredHistory.slice(
    historyPageStartIdx,
    historyPageStartIdx + HISTORY_PAGE_SIZE,
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
    <div className="min-h-screen bg-[#f6f7f8] text-zinc-900 pb-14 overflow-x-clip">
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
                {analytics.scopedTotalRooms} phòng
              </span>
            </div>
          </div>

          {/* Center: Clean Period Tabs + Branch Selector + Date Badge */}
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

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-700 whitespace-nowrap">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                aria-label="Chọn chi nhánh"
                data-testid="topbar-branch-select"
                value={branchFilter}
                onChange={(e) =>
                  setBranchFilter(e.target.value as BranchFilter)
                }
                className="bg-transparent font-medium text-xs text-zinc-800 focus:outline-none cursor-pointer"
              >
                <option value="all">
                  Tất cả chi nhánh ({hotelProfile.totalRooms})
                </option>
                {hotelProfile.branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.shortName} ({br.totalRooms})
                  </option>
                ))}
              </select>
            </div>

            <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs font-mono text-zinc-600 whitespace-nowrap">
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

        {/* Mobile Period & Branch Selector */}
        <div className="lg:hidden px-4 py-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/60">
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

          <select
            aria-label="Chọn chi nhánh trên di động"
            data-testid="mobile-branch-select"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value as BranchFilter)}
            className="h-7 px-2 rounded-md bg-white border border-zinc-200 text-xs font-medium text-zinc-800 cursor-pointer"
          >
            <option value="all">Tất cả CN ({hotelProfile.totalRooms})</option>
            {hotelProfile.branches.map((br) => (
              <option key={br.id} value={br.id}>
                {br.shortName} ({br.totalRooms})
              </option>
            ))}
          </select>
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
                Công thức &amp; Quy tắc Nghiệp vụ Chuẩn goodNstay
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
                  1. Doanh thu &amp; Giá bình quân đêm (ADR)
                </div>
                <div className="font-mono text-[11px] text-emerald-700">
                  Doanh thu = 100% Giá gốc đơn TT · ADR = Doanh thu ÷ Đêm
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Theo dõi theo ngày, tuần, tháng cho từng phòng &amp; chi nhánh.
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
                  3. Tỷ lệ chọn &amp; Thị phần
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
          {/* Card 1: Simple Hotel Revenue */}
          <button
            type="button"
            data-testid="kpi-card-revenue"
            onClick={() => setActiveKpiModal("revenue_total")}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Doanh thu ({periodMetrics.shortLabel})
              </span>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md truncate max-w-[110px]">
                {analytics.branchFilter === "all"
                  ? "3 chi nhánh"
                  : analytics.activeBranchLabel}
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

          {/* Card 2: Period ADR & Base Revenue */}
          <button
            type="button"
            onClick={() => setActiveKpiModal("revenue_today")}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                ADR bình quân ({periodMetrics.shortLabel})
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {periodMetrics.rangeText}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                {formatFullVnd(periodMetrics.periodBaseAdr)}
              </span>
              <span className="text-xs text-zinc-400">/đêm</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Giá gốc:{" "}
                <strong className="font-medium text-zinc-700">
                  {formatCompactVnd(periodMetrics.baseRevenue)}đ
                </strong>
              </span>
              <span>
                {periodMetrics.roomNightsSold} đêm ({periodMetrics.paidWonCount} đơn)
              </span>
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
                className="font-mono text-[11px] text-zinc-500 hover:text-zinc-950 underline underline-offset-2 cursor-pointer inline-flex items-center gap-1"
              >
                <span>
                  {periodMetrics.paidWonCount}/{periodMetrics.bidsSent} phiên
                </span>
                {analytics.pendingLiveBidsCount > 0 && (
                  <span className="no-underline px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                    +{analytics.pendingLiveBidsCount} chờ TT
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Card 4: Active Selected Date Room Inventory (Vacant Unlocked vs Locked) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveKpiModal("rooms_vacant")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setActiveKpiModal("rooms_vacant");
              }
            }}
            className={`text-left p-5 rounded-2xl bg-white border transition-all cursor-pointer flex flex-col justify-between gap-3 shadow-2xs ${
              selectedScheduleDayOffset > 0
                ? "border-sky-300 hover:border-sky-400"
                : "border-zinc-200/80 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-600 truncate">
                {selectedScheduleDayOffset === 0
                  ? `Quỹ phòng hôm nay (${selectedDaySchedule.dateStr})`
                  : `Quỹ phòng ${selectedDaySchedule.dateStr} (${selectedDaySchedule.dayLabel})`}
              </span>
              {selectedScheduleDayOffset > 0 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedScheduleDayOffset(0);
                  }}
                  className="text-[11px] font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-900 hover:text-white px-2 py-0.5 rounded-md transition-colors cursor-pointer shrink-0"
                  title="Quay về quỹ phòng hôm nay (06/11/2026)"
                >
                  Về 06/11
                </button>
              ) : (
                <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md shrink-0">
                  Click Mở/Khóa
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                  {selectedDaySchedule.vacantRooms}
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
                {selectedDayOccupied}/{selectedDaySchedule.totalRooms} đã khóa
              </button>
            </div>
            <div className="space-y-1.5">
              <div className="w-full h-1.5 rounded-full bg-sky-100 overflow-hidden flex">
                <div
                  className="h-full bg-zinc-700 transition-all"
                  style={{
                    width: `${(selectedDaySchedule.otherBooked / selectedDaySchedule.totalRooms) * 100}%`,
                  }}
                />
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{
                    width: `${(selectedDaySchedule.auctionBooked / selectedDaySchedule.totalRooms) * 100}%`,
                  }}
                />
                {(selectedDaySchedule.paymentHoldRooms ?? 0) > 0 && (
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{
                      width: `${((selectedDaySchedule.paymentHoldRooms ?? 0) / selectedDaySchedule.totalRooms) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 text-[11px] text-zinc-500">
                <span>TT 100%: {selectedDaySchedule.auctionBooked}</span>
                {(selectedDaySchedule.paymentHoldRooms ?? 0) > 0 && (
                  <span className="text-amber-700 font-semibold">
                    Giữ 10p: {selectedDaySchedule.paymentHoldRooms}
                  </span>
                )}
                <span>OTA/Lễ tân: {selectedDaySchedule.otherBooked}</span>
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
            <TabsList className="bg-zinc-200/60 p-1 rounded-xl max-w-full overflow-x-auto justify-start">
              <TabsTrigger
                value="workspace"
                className="gap-1.5 px-2.5 sm:px-3.5 rounded-lg text-xs shrink-0"
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
                className="px-2.5 sm:px-3.5 rounded-lg text-xs shrink-0"
              >
                Hiệu suất & Thị phần
              </TabsTrigger>
              <TabsTrigger
                value="inventory"
                className="px-2.5 sm:px-3.5 rounded-lg text-xs shrink-0"
              >
                Quỹ phòng ({selectedDaySchedule.vacantRooms} trống
                {(selectedDaySchedule.paymentHoldRooms ?? 0) > 0
                  ? ` · ${selectedDaySchedule.paymentHoldRooms} giữ 10p`
                  : ""}
                {selectedScheduleDayOffset > 0
                  ? ` · ${selectedDaySchedule.dateStr}`
                  : ""}
                )
              </TabsTrigger>
              <TabsTrigger
                value="lifecycle"
                className="gap-1.5 px-2.5 sm:px-3.5 rounded-lg text-xs shrink-0"
              >
                <span>Vòng đời &amp; Case</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-mono">
                  {bundle.lifecycleCatalog?.scenarioMatrix.length ?? 18}
                </span>
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Phiên đang mở ({analytics.activeLiveCount})
                  </h2>
                  <span className="text-xs text-zinc-400">
                    · {hotelProfile.currentDateLabel}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {hotelProfile.autoBidEnabled &&
                    analytics.liveSessions.some(
                      (ls) =>
                        ls.remainingSeconds > 0 &&
                        !ls.bidSubmitted &&
                        ls.isAutoBidEligible &&
                        ls.vacantForStay > 0,
                    ) && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={handleRunAutoBidNow}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        Chạy Auto-Bid ngay (
                        {
                          analytics.liveSessions.filter(
                            (ls) =>
                              ls.remainingSeconds > 0 &&
                              !ls.bidSubmitted &&
                              ls.isAutoBidEligible &&
                              ls.vacantForStay > 0,
                          ).length
                        }{" "}
                        phiên)
                      </Button>
                    )}
                  <span className="hidden sm:inline text-xs text-zinc-400">
                    Báo giá 1 lần (60 phút) · 1 phòng trống có thể đấu nhiều
                    phiên
                  </span>
                </div>
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
                    const vacantInClass = session.vacantForStay;
                    const concurrentInClass = session.concurrentForStay;
                    const isMultiContest = concurrentInClass > 1;
                    const isHoldingThisSession =
                      session.holdRoomNumber != null &&
                      (session.holdRemainingSeconds ?? 0) > 0;
                    const isBlockedByOtherHold =
                      !isHoldingThisSession && session.isBlockedByPaymentHold;
                    const trulySoldOut =
                      !isHoldingThisSession &&
                      vacantInClass <= 0 &&
                      session.paymentHoldForStay <= 0;

                    return (
                      <div
                        key={session.id}
                        data-testid={`live-card-${session.id}`}
                        className={`rounded-2xl bg-white border p-5 flex flex-col justify-between gap-4 shadow-2xs transition-all ${
                          isHoldingThisSession
                            ? "border-amber-400 bg-amber-50/15 ring-1 ring-amber-200/70"
                            : isBlockedByOtherHold || trulySoldOut
                              ? "border-amber-200 bg-amber-50/20"
                              : session.bidSubmitted
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
                              {session.flashDiscountApplied &&
                                !session.bidSubmitted && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[11px] font-medium">
                                    <Flame className="w-3 h-3 text-amber-500" />
                                    Xả đêm -{hotelProfile.nightFlashDiscountPct}%
                                  </span>
                                )}
                              {(() => {
                                const liveMatchUi = getMatchScoreStyle(
                                  session.matchScore,
                                );
                                return (
                                  <button
                                    type="button"
                                    title={liveMatchUi.hint}
                                    onClick={() =>
                                      setActiveMatchReqId(session.id)
                                    }
                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium cursor-pointer transition-colors ${liveMatchUi.pillClass}`}
                                  >
                                    <span
                                      aria-hidden="true"
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${liveMatchUi.dotClass}`}
                                    />
                                    Khớp {session.matchScore}%
                                  </button>
                                );
                              })()}
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

                          {/* Row 3: Subtle Inline Amenities */}
                          <div className="text-xs text-zinc-400 truncate">
                            {session.amenities.join("  ·  ")}
                          </div>

                          {/* Row 3.5: Synchronized Multi-Entity Status Strip (Room · Bid · Payment) */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                            <span
                              className={`px-2 py-0.5 rounded-md font-medium border ${
                                isHoldingThisSession
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : isBlockedByOtherHold
                                    ? "bg-orange-50 text-orange-800 border-orange-200"
                                    : trulySoldOut
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-sky-50 text-sky-700 border-sky-200"
                              }`}
                            >
                              Room:{" "}
                              {isHoldingThisSession
                                ? `Tạm khóa #${session.holdRoomNumber} (10p)`
                                : isBlockedByOtherHold
                                  ? `Bị giữ bởi #${session.heldByReqIds[0] ?? "--"}`
                                  : trulySoldOut
                                    ? "Hết phòng"
                                    : "Trống mở khóa"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-medium border ${
                                isHoldingThisSession
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : session.bidStatus ===
                                      "standby_hold_conflict"
                                    ? "bg-orange-50 text-orange-800 border-orange-200"
                                    : session.bidSubmitted
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-zinc-50 text-zinc-600 border-zinc-200"
                              }`}
                            >
                              Bid:{" "}
                              {isHoldingThisSession
                                ? "Khách đã chọn · Giữ 10p"
                                : session.bidStatus === "standby_hold_conflict"
                                  ? "Standby (Chờ nhả ghế)"
                                  : session.bidSubmitted
                                    ? "Đã báo giá One-Shot"
                                    : "Chờ KS báo giá"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono font-medium border ${
                                isHoldingThisSession
                                  ? "bg-amber-100/80 text-amber-900 border-amber-300"
                                  : "bg-zinc-50 text-zinc-500 border-zinc-200"
                              }`}
                            >
                              Pay:{" "}
                              {isHoldingThisSession
                                ? `Checkout ${formatCountdown(session.holdRemainingSeconds ?? 0)}/10:00`
                                : isBlockedByOtherHold
                                  ? "Khóa click chọn"
                                  : "Chưa khởi tạo"}
                            </span>
                          </div>

                          {/* Row 4: Movie-Seat 10m Hold / Standby Conflict / Vacant Status */}
                          {isHoldingThisSession ? (
                            <div
                              data-testid={`hold-banner-${session.id}`}
                              className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <span className="inline-flex items-center gap-1.5 text-amber-900 font-semibold">
                                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Đang tạm khóa phòng #{session.holdRoomNumber} chờ
                                thanh toán · Còn{" "}
                                <span className="font-mono bg-amber-200/70 px-1.5 py-0.5 rounded text-amber-950">
                                  {formatCountdown(
                                    session.holdRemainingSeconds ?? 0,
                                  )}
                                </span>{" "}
                                / 10:00
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (session.holdRoomNumber != null) {
                                    setSelectedRoomNum(session.holdRoomNumber);
                                  }
                                  openRoomScheduleForSession(
                                    session,
                                    "rooms_vacant",
                                  );
                                }}
                                className="text-amber-800 hover:text-amber-950 font-semibold underline underline-offset-2 cursor-pointer"
                              >
                                Xem ghế #{session.holdRoomNumber} →
                              </button>
                            </div>
                          ) : isBlockedByOtherHold ? (
                            <div
                              data-testid={`standby-banner-${session.id}`}
                              className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-200/90 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <span className="inline-flex items-center gap-1.5 text-orange-800 font-medium">
                                <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                Phòng #{session.heldRoomNumbers.join(", #")}{" "}
                                đang tạm khóa 10p bởi #
                                {session.heldByReqIds.join(", #")} · Khách khác
                                không thể click thanh toán lúc này
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  openRoomScheduleForSession(
                                    session,
                                    "rooms_vacant",
                                  )
                                }
                                className="text-orange-800 hover:text-orange-950 font-semibold underline underline-offset-2 cursor-pointer"
                              >
                                Xem lịch phòng →
                              </button>
                            </div>
                          ) : trulySoldOut ? (
                            <div className="pt-0.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                                <Lock className="w-3.5 h-3.5 shrink-0" />
                                Hết phòng trống mở khóa trong kỳ lưu trú này
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  openRoomScheduleForSession(
                                    session,
                                    "rooms_occupied",
                                  )
                                }
                                className="text-sky-700 hover:text-sky-900 font-semibold underline underline-offset-2 cursor-pointer"
                              >
                                Mở khóa phòng để đấu giá →
                              </button>
                            </div>
                          ) : (
                            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                              <LockOpen
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isMultiContest
                                    ? "text-amber-600"
                                    : "text-sky-600"
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  openRoomScheduleForSession(
                                    session,
                                    "rooms_vacant",
                                  )
                                }
                                className={`text-left hover:underline underline-offset-2 cursor-pointer ${
                                  isMultiContest
                                    ? "text-amber-700 font-medium"
                                    : "text-zinc-600 hover:text-zinc-900"
                                }`}
                                title="Xem lịch phòng chi tiết đúng ngày lưu trú của phiên này"
                              >
                                Còn {vacantInClass} phòng trống mở khóa
                                {isMultiContest
                                  ? ` · đang tham gia ${concurrentInClass} phiên`
                                  : ""}
                              </button>
                              <span className="text-zinc-400">
                                {session.paymentHoldForStay > 0
                                  ? `· ${session.paymentHoldForStay} giữ 10p`
                                  : "· TT 100% mới khóa"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Footer: Price on Left + Compact Buttons on Right */}
                        <div className="pt-3.5 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-bold font-mono text-zinc-950">
                                {formatFullVnd(activeBase)}
                              </span>
                              {session.flashDiscountApplied &&
                                !session.bidSubmitted && (
                                  <span className="text-xs font-mono text-zinc-400 line-through">
                                    {formatButtonVnd(
                                      session.standardSuggestedBasePrice,
                                    )}
                                  </span>
                                )}
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
                            isHoldingThisSession ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`btn-release-hold-${session.id}`}
                                  onClick={() =>
                                    handleReleasePaymentHold(
                                      session.id,
                                      "REJ_HOLD_EXPIRED_10M",
                                    )
                                  }
                                  title="Mô phỏng hết 10 phút hoặc khách thoát trang thanh toán → Nhả khóa phòng ngay lập tức"
                                  className="border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100"
                                >
                                  <LockOpen className="w-3.5 h-3.5" />
                                  Nhả khóa 10p
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleReleasePaymentHold(
                                      session.id,
                                      "REJ_PAYMENT_GATEWAY_DECLINED",
                                    )
                                  }
                                  title="Mô phỏng lỗi thẻ / 3DS bị từ chối → Nhả khóa phòng & ghi nhận REJ_PAYMENT_GATEWAY_DECLINED"
                                  className="text-zinc-600 hover:text-rose-600 hover:border-rose-200"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Lỗi thẻ
                                </Button>
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
                            ) : isBlockedByOtherHold ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  data-testid={`standby-lock-pill-${session.id}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-orange-800 bg-orange-100/80 border border-orange-200 px-2.5 py-1 rounded-lg font-medium"
                                >
                                  <Lock className="w-3 h-3 text-orange-600" />
                                  Chờ #{session.heldRoomNumbers[0] ?? "--"} nhả
                                  khóa 10p
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleSimulateGuestReject(session)
                                  }
                                  className="text-zinc-600 hover:text-rose-600 hover:border-rose-200"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Từ chối
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                                  {session.bidSubmitted.mode === "auto"
                                    ? "Auto-Bid đã gửi"
                                    : "Đã báo giá"}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`btn-start-hold-${session.id}`}
                                  disabled={vacantInClass <= 0}
                                  onClick={() =>
                                    handleSimulateGuestStartHold10m(session)
                                  }
                                  title="Mô phỏng khách bấm chọn khách sạn & vào trang thanh toán → Tạm khóa phòng 10 phút (như giữ ghế rạp phim)"
                                  className="border-amber-300 text-amber-800 hover:bg-amber-50"
                                >
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Giữ phòng 10p
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleSimulateGuestReject(session)
                                  }
                                  title="Mô phỏng khách chọn khách sạn khác để kiểm thử Tỷ lệ trượt & Pareto"
                                  className="text-zinc-600 hover:text-rose-600 hover:border-rose-200"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  Từ chối
                                </Button>
                                <Button
                                  variant="emerald"
                                  size="sm"
                                  disabled={vacantInClass <= 0}
                                  onClick={() =>
                                    handleSimulateGuestFullPayment(session)
                                  }
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  Khách TT 100% · Khóa phòng
                                </Button>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handlePartnerSkipSession(session)
                                }
                                title="Khách sạn chủ động bỏ qua phiên này (REJ_PARTNER_SKIPPED)"
                                className="text-zinc-500 hover:text-zinc-900"
                              >
                                Bỏ qua
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={trulySoldOut}
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
                                disabled={trulySoldOut}
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

            {/* 2A. Interactive Visual Payment Conversion Funnel (Direct on Main Page) */}
            <PaymentConversionFunnelPanel
              analytics={analytics}
              mode="embedded"
            />

            {/* 2B. Clean Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Chart A: Interactive Dual-Line Benchmark (Hotel vs Platform + Multi-Filters) */}
              <SelectionBenchmarkLinePanel
                bundle={bundle}
                dateRange={dateRange}
                branchFilter={branchFilter}
                rangeText={periodMetrics.rangeText}
                onOpenMarketShare={() => setActiveTab("ai-analytics")}
              />

              {/* Chart B: Period Revenue & Paid Orders Trend */}
              <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Doanh thu giá gốc & Đơn thanh toán 100%
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {analytics.revenueTrendSubtitle}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md shrink-0">
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
                        barSize={dateRange === "30d" ? 8 : 22}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="paidOrders"
                        name="Đơn TT 100%"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: dateRange === "30d" ? 2 : 3 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 3. Clean Session Log Table (Synced with Period Filter, Search, Sort & 10-item Pagination) */}
            <div className="rounded-2xl bg-white border border-zinc-200/80 shadow-2xs overflow-hidden">
              <div className="p-5 border-b border-zinc-100 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Nhật ký phiên đấu giá ({periodMetrics.shortLabel}:{" "}
                      {periodMetrics.rangeText})
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Khách hoàn tất thanh toán 100% sẽ khóa phòng ngay · Không
                      có trạng thái đặt cọc
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 bg-zinc-100 p-1 rounded-lg">
                    {(
                      [
                        ["all", "Tất cả"],
                        ["won", "Đã TT 100%"],
                        ["payment_failed", "Lỗi TT / 10p"],
                        ["rejected", "Từ chối"],
                        ["expired", "Hết hạn"],
                        ["auto_closed", "Tự đóng"],
                        ["partner_declined", "KS bỏ qua"],
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
                        {label} ({historyCounts[val]})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search & Sort By Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                  <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Tìm theo mã #CRQ, tên yêu cầu, hạng phòng, #phòng..."
                      aria-label="Tìm kiếm nhật ký phiên đấu giá"
                      className="w-full bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white border border-zinc-200/90 rounded-lg pl-8 pr-8 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch("")}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <label
                      htmlFor="history-sort-select"
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-500 whitespace-nowrap"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Sort by:</span>
                    </label>
                    <select
                      id="history-sort-select"
                      aria-label="Sắp xếp nhật ký phiên đấu giá"
                      value={historySortBy}
                      onChange={(e) =>
                        setHistorySortBy(e.target.value as HistorySortKey)
                      }
                      className="bg-zinc-50/70 hover:bg-zinc-50 focus:bg-white border border-zinc-200/90 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 transition-colors"
                    >
                      <option value="newest">Mới nhất trước</option>
                      <option value="oldest">Cũ nhất trước</option>
                      <option value="price_desc">
                        Giá gốc / đêm: Cao → Thấp
                      </option>
                      <option value="price_asc">
                        Giá gốc / đêm: Thấp → Cao
                      </option>
                      <option value="total_desc">
                        Tổng thực nhận: Cao → Thấp
                      </option>
                      <option value="match_desc">Độ khớp: Cao → Thấp</option>
                      <option value="match_asc">Độ khớp: Thấp → Cao</option>
                    </select>
                  </div>
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
                    {paginatedHistory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-10 px-5 text-center text-xs text-zinc-500"
                        >
                          {normalizedHistoryQuery ? (
                            <>
                              Không tìm thấy phiên nào khớp với từ khóa{" "}
                              <strong>&ldquo;{historySearch.trim()}&rdquo;</strong>{" "}
                              trong kỳ <strong>{periodMetrics.rangeText}</strong>.
                              <button
                                type="button"
                                onClick={() => {
                                  setHistorySearch("");
                                  setHistoryFilter("all");
                                }}
                                className="ml-2 font-semibold text-zinc-900 underline underline-offset-2 cursor-pointer"
                              >
                                Xóa bộ lọc tìm kiếm
                              </button>
                            </>
                          ) : (
                            <>
                              Không có phiên nào thuộc trạng thái này trong kỳ{" "}
                              <strong>{periodMetrics.rangeText}</strong>.
                              {historyFilter !== "all" && (
                                <button
                                  type="button"
                                  onClick={() => setHistoryFilter("all")}
                                  className="ml-2 font-semibold text-zinc-900 underline underline-offset-2 cursor-pointer"
                                >
                                  Xem tất cả ({historyCounts.all})
                                </button>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      paginatedHistory.map((h) => (
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
                            {(() => {
                              const matchUi = getMatchScoreStyle(h.matchScore);
                              return (
                                <button
                                  type="button"
                                  title={matchUi.hint}
                                  onClick={() => setActiveMatchReqId(h.id)}
                                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-xs font-semibold tabular-nums cursor-pointer transition-colors ${matchUi.pillClass}`}
                                >
                                  <span
                                    aria-hidden="true"
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${matchUi.dotClass}`}
                                  />
                                  {h.matchScore}%
                                </button>
                              );
                            })()}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            {h.status === "won" ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                  <Badge variant="success">Đã TT 100%</Badge>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono text-[10px]">
                                    {h.paymentStatus === "settled_hotel"
                                      ? "T+7 đã đối soát"
                                      : "Escrow 100%"}
                                  </span>
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {h.resultNote}
                                </div>
                              </div>
                            ) : h.status === "auto_closed" ||
                              h.status === "partner_declined" ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                  <Badge variant="neutral">
                                    {h.status === "partner_declined"
                                      ? "KS bỏ qua"
                                      : "Tự đóng"}
                                  </Badge>
                                  {h.rejectCode && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab("lifecycle")}
                                      title="Xem chi tiết mã Reject trong Vòng đời & Case"
                                      className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-mono text-[10px] cursor-pointer"
                                    >
                                      {h.rejectCode}
                                    </button>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {h.resultNote}
                                </div>
                              </div>
                            ) : h.status === "payment_failed" ? (
                              <div className="space-y-0.5">
                                <div className="inline-flex flex-wrap items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("lifecycle")}
                                    className="cursor-pointer"
                                  >
                                    <Badge variant="warning">
                                      Lỗi TT · Nhả 10p
                                    </Badge>
                                  </button>
                                  {h.rejectCode && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab("lifecycle")}
                                      title="Xem chi tiết mã Reject trong Vòng đời & Case"
                                      className="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-mono text-[10px] cursor-pointer"
                                    >
                                      {h.rejectCode}
                                    </button>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {h.resultNote}
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-0.5">
                                <div className="inline-flex flex-wrap items-center justify-end gap-1">
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
                                  {h.rejectCode && (
                                    <button
                                      type="button"
                                      onClick={() => setActiveTab("lifecycle")}
                                      title="Xem chi tiết mã Reject trong Vòng đời & Case"
                                      className="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-mono text-[10px] cursor-pointer"
                                    >
                                      {h.rejectCode}
                                    </button>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-400">
                                  {h.resultNote}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer (< 1/N >) */}
              {filteredHistory.length > 0 && (
                <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="text-zinc-500">
                    Hiển thị{" "}
                    <span className="font-semibold text-zinc-800 font-mono">
                      {historyPageStartIdx + 1}–
                      {Math.min(
                        historyPageStartIdx + HISTORY_PAGE_SIZE,
                        filteredHistory.length,
                      )}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-semibold text-zinc-800 font-mono">
                      {filteredHistory.length}
                    </span>{" "}
                    phiên (tối đa {HISTORY_PAGE_SIZE} phiên/trang)
                  </div>

                  <div className="inline-flex items-center gap-1 bg-white border border-zinc-200/90 rounded-lg p-1 shadow-2xs">
                    <button
                      type="button"
                      aria-label="Trang trước"
                      disabled={safeHistoryPage <= 1}
                      onClick={() =>
                        setHistoryPage(Math.max(1, safeHistoryPage - 1))
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Trước</span>
                    </button>

                    <span
                      data-testid="history-page-indicator"
                      className="px-2.5 py-1 font-mono font-semibold text-zinc-900 tabular-nums select-none bg-zinc-50 rounded-md border border-zinc-100"
                    >
                      {safeHistoryPage}/{totalHistoryPages}
                    </span>

                    <button
                      type="button"
                      aria-label="Trang sau"
                      disabled={safeHistoryPage >= totalHistoryPages}
                      onClick={() =>
                        setHistoryPage(
                          Math.min(totalHistoryPages, safeHistoryPage + 1),
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    >
                      <span className="hidden sm:inline">Sau</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
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
                                width: `${Math.min(100, b.hotelWinPct)}%`,
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
                                width: `${Math.min(100, b.sysAvgPct)}%`,
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
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      Nguyên nhân không chốt được phiên (
                      {periodMetrics.shortLabel}: {periodMetrics.rangeText})
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Tổng {analytics.periodTotalLosses} phiên trượt · Xếp giảm
                      dần theo tỷ trọng Pareto
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveKpiModal("win_rate")}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Phễu chuyển đổi 8 bước ({periodMetrics.winRatePct}%) →
                  </button>
                </div>

                <div className="h-52 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={analytics.periodLossReasons}
                      margin={{ left: 8, right: 24 }}
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
                        {analytics.periodLossReasons.map((entry) => (
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
                    Hệ thống {hotelProfile.branches.length} chi nhánh •{" "}
                    {hotelProfile.totalRooms} phòng
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
                    <span className="text-zinc-500">Chiết khấu hoa hồng KS</span>
                    <strong className="font-mono text-zinc-900">
                      0% (Giữ 100% giá gốc)
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

                <div className="border border-zinc-100 rounded-xl overflow-x-auto">
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

            {/* 4. Configured Auto-Bid Rules List */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    Quy tắc Auto-Bid đang cấu hình ({bundle.botRules.length})
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {currentUser?.canConfigureBotRules
                      ? "Vai trò Quản lý có thể bật/tắt hoặc xóa quy tắc tự động"
                      : "Chuyển sang vai trò Quản lý (góc trên bên phải) để bật/tắt hoặc thêm quy tắc Auto-Bid"}
                  </p>
                </div>
                <span className="text-xs font-mono text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-md">
                  Đang kích hoạt:{" "}
                  {bundle.botRules.filter((r) => r.active).length}/
                  {bundle.botRules.length}
                </span>
              </div>

              {bundle.botRules.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-50 text-xs text-zinc-500 text-center">
                  Chưa có quy tắc Auto-Bid nào. Bấm{" "}
                  <strong>Lưu quy tắc Auto-Bid</strong> ở bảng phân tích phiên
                  trượt phía trên để thêm mới.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-100 rounded-xl overflow-hidden">
                  {bundle.botRules.map((rule) => (
                    <div
                      key={rule.ruleId}
                      className="p-3.5 bg-white flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 font-mono text-[11px] text-zinc-600 shrink-0">
                          {rule.ruleId}
                        </span>
                        <span
                          className={`font-medium ${
                            rule.active
                              ? "text-zinc-900"
                              : "text-zinc-400 line-through"
                          }`}
                        >
                          {rule.title}
                        </span>
                        {rule.sourceCaseId && (
                          <span className="text-[11px] font-mono text-zinc-400">
                            (từ #{rule.sourceCaseId})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0">
                        <Switch
                          checked={rule.active}
                          disabled={!currentUser?.canConfigureBotRules}
                          onCheckedChange={(checked) =>
                            handleToggleBotRule(rule.ruleId, checked)
                          }
                        />
                        <button
                          type="button"
                          disabled={!currentUser?.canConfigureBotRules}
                          onClick={() => handleDeleteBotRule(rule.ruleId)}
                          className="p-1.5 rounded-md text-zinc-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                          title="Xóa quy tắc Auto-Bid"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 3: INVENTORY, 14-DAY CHART & 30-ROOM MATRIX                   */}
          {/* ================================================================= */}
          <TabsContent value="inventory" className="space-y-6">
            {/* 1. 14-Day Stacked Column Chart (Click Any Date Column to Select) */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    Dự báo quỹ phòng 14 ngày tới (
                    {hotelProfile.goldenWindowRange})
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Click trực tiếp vào cột ngày bất kỳ để chuyển ngày xem chi
                    tiết · Tổng 30 phòng/ngày = OTA/Lễ tân + goodNstay (TT 100%)
                    + Trống mở khóa
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200/80 text-xs font-medium text-sky-800">
                    Đang xem: Ngày {selectedDaySchedule.fullDate} (
                    {selectedDaySchedule.dayLabel}) ·{" "}
                    <strong>{selectedDaySchedule.vacantRooms} trống</strong>
                  </span>
                  {selectedScheduleDayOffset > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedScheduleDayOffset(0)}
                      className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-xs font-medium text-zinc-700 cursor-pointer transition-colors"
                    >
                      Về 06/11
                    </button>
                  )}
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.golden14ChartData}
                    className="cursor-pointer"
                    onClick={(state) => {
                      const label = state?.activeLabel;
                      if (typeof label === "string") {
                        const found = analytics.dailyRoomSchedules.find(
                          (d) => d.dateStr === label,
                        );
                        if (found) {
                          setSelectedScheduleDayOffset(found.dayOffset);
                        }
                      }
                    }}
                  >
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
                        `Ngày ${payload?.[0]?.payload?.fullDate ?? label} (Click để xem 30 phòng)`
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar
                      dataKey="otherBooked"
                      stackId="rooms"
                      name="Đã đặt OTA / Lễ tân"
                      fill="#52525b"
                      barSize={24}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="auctionBooked"
                      stackId="rooms"
                      name="Đã đặt goodNstay (TT 100%)"
                      fill="#10b981"
                      barSize={24}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="paymentHoldRooms"
                      stackId="rooms"
                      name="Đang tạm khóa 10p chờ TT"
                      fill="#f59e0b"
                      barSize={24}
                      className="cursor-pointer"
                    />
                    <Bar
                      dataKey="vacantRooms"
                      stackId="rooms"
                      name="Phòng trống mở khóa"
                      fill="#38bdf8"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                      className="cursor-pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. 4 Clean Room Class Cards Synced with Selected Schedule Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {analytics.roomInventory.map((rc) => {
                const classRooms = selectedDaySchedule.rooms.filter(
                  (r) => r.roomClassId === rc.id,
                );
                const otherBooked = classRooms.filter(
                  (r) => r.status === "booked_other",
                ).length;
                const auctionBooked = classRooms.filter(
                  (r) => r.status === "booked_auction",
                ).length;
                const paymentHold = classRooms.filter(
                  (r) => r.status === "payment_hold",
                ).length;
                const occ = otherBooked + auctionBooked;
                const vac = Math.max(0, rc.totalRooms - occ - paymentHold);
                const liveJoining = analytics.liveSessions.filter(
                  (s) =>
                    s.remainingSeconds > 0 &&
                    s.matchedRoomClassId === rc.id &&
                    parseStayDayOffsets(
                      s.checkInDateRange,
                      hotelProfile.referenceDate,
                      s.nights,
                    ).includes(selectedScheduleDayOffset),
                ).length;
                const effectiveClassFloor = hotelProfile.nightFlashSaleActive
                  ? Math.round(
                      (rc.baseFloorPrice *
                        (1 - hotelProfile.nightFlashDiscountPct / 100)) /
                        1000,
                    ) * 1000
                  : rc.baseFloorPrice;

                return (
                  <div
                    key={rc.id}
                    className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-zinc-400">
                            {rc.category} · {rc.roomRange} ·{" "}
                            <strong className="font-medium text-zinc-600">
                              {selectedDaySchedule.dateStr}
                            </strong>
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

                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="truncate">{rc.bedAndCapacity}</span>
                        <span className="font-mono text-[11px] text-zinc-600 shrink-0 ml-2">
                          Sàn {formatButtonVnd(effectiveClassFloor)}
                        </span>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-sky-100 overflow-hidden flex">
                        <div
                          className="h-full bg-zinc-700"
                          style={{
                            width: `${(otherBooked / rc.totalRooms) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-emerald-500"
                          style={{
                            width: `${(auctionBooked / rc.totalRooms) * 100}%`,
                          }}
                        />
                        <div
                          className="h-full bg-amber-400"
                          style={{
                            width: `${(paymentHold / rc.totalRooms) * 100}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <span className="text-zinc-400">
                          Đã khóa: {occ}/{rc.totalRooms}
                          {paymentHold > 0 ? ` · Giữ 10p: ${paymentHold}` : ""}
                        </span>
                        {vac === 0 && paymentHold > 0 ? (
                          <span className="text-amber-700 font-medium">
                            Đang giữ 10p ({paymentHold})
                          </span>
                        ) : vac === 0 ? (
                          <span className="text-rose-600 font-medium">
                            Hết phòng
                          </span>
                        ) : liveJoining > 0 ? (
                          <span className="text-sky-700 font-medium">
                            Đang đấu {liveJoining} phiên
                          </span>
                        ) : (
                          <span className="text-zinc-500">
                            Mở khóa sẵn sàng
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick 1-click Lock / Unlock buttons per Room Class on Selected Date */}
                    <div className="pt-2.5 border-t border-zinc-100 grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={vac <= 0}
                        onClick={() =>
                          handleQuickClassLockToggle(rc.id, "lock")
                        }
                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 disabled:opacity-40 disabled:pointer-events-none text-[11px] font-medium text-zinc-700 cursor-pointer transition-colors"
                        title={`Khóa nhanh 1 phòng trống của hạng này ngày ${selectedDaySchedule.fullDate}`}
                      >
                        <Lock className="w-3 h-3" />
                        Khóa 1 phòng
                      </button>
                      <button
                        type="button"
                        disabled={otherBooked <= 0}
                        onClick={() =>
                          handleQuickClassLockToggle(rc.id, "unlock")
                        }
                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-sky-200 bg-sky-50/70 hover:bg-sky-600 hover:text-white hover:border-sky-600 disabled:opacity-40 disabled:pointer-events-none text-[11px] font-medium text-sky-700 cursor-pointer transition-colors"
                        title={`Mở khóa nhanh 1 phòng OTA/Lễ tân sang trống ngày ${selectedDaySchedule.fullDate}`}
                      >
                        <LockOpen className="w-3 h-3" />
                        Mở khóa 1
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 3. Multi-Date Room Explorer & 14-Day PMS Timeline */}
            <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">
                  Lịch chi tiết {analytics.scopedTotalRooms} phòng ({analytics.activeBranchLabel}) theo từng ngày ({hotelProfile.goldenWindowRange})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  <strong>Click trực tiếp vào bất kỳ ô phòng nào</strong>{" "}
                  để <strong>Khóa / Mở khóa</strong> ngay lập tức (hoặc chuyển sang{" "}
                  <strong>Bảng lịch 14 ngày</strong> và click đúp / dùng nút góc dưới).
                  Phòng đang <strong>tạm khóa 10p chờ TT</strong> và phòng đã{" "}
                  <strong>thanh toán 100%</strong> được tự động bảo vệ chống bán trùng.
                </p>
              </div>

              <RoomScheduleExplorer
                schedules={analytics.dailyRoomSchedules}
                onToggleRoomLock={handleToggleRoomLock}
                selectedDayOffset={selectedScheduleDayOffset}
                onSelectDayOffset={setSelectedScheduleDayOffset}
                viewMode={explorerViewMode}
                onChangeViewMode={setExplorerViewMode}
                statusFilter={explorerStatusFilter}
                onChangeStatusFilter={setExplorerStatusFilter}
                classFilter={explorerClassFilter}
                onChangeClassFilter={setExplorerClassFilter}
                selectedRoomNum={selectedRoomNum}
                onSelectRoomNum={setSelectedRoomNum}
              />
            </div>
          </TabsContent>

          {/* ================================================================= */}
          {/* TAB 4: FULL BOOKING LIFECYCLE, MULTI-ENTITY STATES & 18 CASES     */}
          {/* ================================================================= */}
          <TabsContent value="lifecycle" className="mt-0 outline-none">
            <LifecycleStateExplorer
              bundle={bundle}
              analytics={analytics}
              onStartHold10m={handleSimulateGuestStartHold10m}
              onReleaseHold10m={(session, reasonCode) =>
                handleReleasePaymentHold(session.id, reasonCode)
              }
              onCompleteFullPayment={handleSimulateGuestFullPayment}
              onJumpToWorkspaceSession={() => setActiveTab("workspace")}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* MODALS */}
      <KpiDrilldownModal
        activeKpi={activeKpiModal}
        onClose={() => setActiveKpiModal(null)}
        hotelProfile={hotelProfile}
        analytics={analytics}
        dateRange={dateRange}
        onChangeDateRange={setDateRange}
        branchFilter={branchFilter}
        onChangeBranchFilter={setBranchFilter}
        nightFlashSaleActive={hotelProfile.nightFlashSaleActive}
        onActivateNightFlashSale={() =>
          handleToggleFlashSale(!hotelProfile.nightFlashSaleActive)
        }
        onSwitchToAiTab={() => setActiveTab("ai-analytics")}
        onToggleRoomLock={handleToggleRoomLock}
        selectedDayOffset={selectedScheduleDayOffset}
        onSelectDayOffset={setSelectedScheduleDayOffset}
        explorerViewMode={explorerViewMode}
        onChangeExplorerViewMode={setExplorerViewMode}
        explorerStatusFilter={explorerStatusFilter}
        onChangeExplorerStatusFilter={setExplorerStatusFilter}
        explorerClassFilter={explorerClassFilter}
        onChangeExplorerClassFilter={setExplorerClassFilter}
        selectedRoomNum={selectedRoomNum}
        onSelectRoomNum={setSelectedRoomNum}
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
        onDisableAutoBid={() => handleToggleAutoBid(false)}
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
