import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  GitBranch,
  Layers,
  Lock,
  LockOpen,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  formatCountdown,
  type BidStatus,
  type LifecycleCatalogMaster,
  type LiveSession,
  type MasterDataBundle,
  type PaymentStatus,
  type RejectCode,
  type RequestStatus,
  type RoomPhysicalStatus,
} from "@/data";
import type { ComputedDashboardAnalytics } from "@/services/analyticsEngine";

interface LifecycleStateExplorerProps {
  bundle: MasterDataBundle;
  analytics: ComputedDashboardAnalytics;
  onStartHold10m: (session: LiveSession) => void;
  onReleaseHold10m: (
    session: LiveSession,
    reasonCode:
      | "REJ_HOLD_EXPIRED_10M"
      | "REJ_PAYMENT_GATEWAY_DECLINED"
      | "REJ_GUEST_ABANDONED_HOLD",
  ) => void;
  onCompleteFullPayment: (session: LiveSession) => void;
  onJumpToWorkspaceSession?: (reqId: string) => void;
}

const ROOM_STATE_BADGE: Record<
  RoomPhysicalStatus,
  { label: string; cls: string }
> = {
  vacant_unlocked: {
    label: "vacant_unlocked · Trống mở khóa",
    cls: "bg-sky-50 text-sky-800 border-sky-200",
  },
  payment_hold: {
    label: "payment_hold · Tạm khóa 10p",
    cls: "bg-amber-50 text-amber-900 border-amber-300",
  },
  booked_auction: {
    label: "booked_auction · Khóa cứng TT 100%",
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  booked_other: {
    label: "booked_other · Khóa OTA/Lễ tân",
    cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
};

const REQUEST_STATE_LABEL: Record<RequestStatus, string> = {
  created: "created · Vừa tạo CRQ",
  matching: "matching · Đang lọc Hard Rules",
  bidding_open: "bidding_open · Mở nhận báo giá",
  offers_comparing: "offers_comparing · Khách đang so sánh",
  checkout_hold_10m: "checkout_hold_10m · Giữ ghế TT 10p",
  confirmed_paid: "confirmed_paid · Đã xác nhận TT 100%",
  checked_in: "checked_in · Đang lưu trú",
  settled_t_plus_7: "settled_t_plus_7 · Đã đối soát T+7",
  closed_unbooked: "closed_unbooked · Đóng chưa đặt",
  cancelled_force_majeure: "cancelled_force_majeure · Hủy bất khả kháng",
};

const BID_STATE_LABEL: Record<BidStatus, string> = {
  not_invited: "not_invited · Ngoài phạm vi mời",
  pending_quote: "pending_quote · Chờ gửi báo giá",
  sent_waiting_guest: "sent_waiting_guest · Đã gửi báo giá 1 lần",
  payment_hold_10m: "payment_hold_10m · Đang giữ phòng 10p",
  standby_hold_conflict: "standby_hold_conflict · Chờ nhả khóa 10p",
  won_paid_100: "won_paid_100 · Thắng & Khóa phòng",
  lost_to_competitor: "lost_to_competitor · Thua đối thủ",
  expired_ttl_60m: "expired_ttl_60m · Hết hạn 60 phút",
  auto_closed: "auto_closed · Tự đóng hết phòng",
  partner_declined: "partner_declined · KS chủ động bỏ qua",
  release_after_hold: "release_after_hold · Đã nhả khóa sau lỗi 10p",
};

const PAYMENT_STATE_LABEL: Record<PaymentStatus, string> = {
  not_started: "not_started · Chưa mở cổng TT",
  awaiting_hold_10m: "awaiting_hold_10m · Đếm ngược 10:00",
  blocked_by_hold: "blocked_by_hold · Chặn chọn đè (Standby)",
  processing_gateway: "processing_gateway · Đang xác thực 3DS/QR",
  paid_escrow_100: "paid_escrow_100 · Đã thu đủ 100% ký quỹ",
  settled_hotel: "settled_hotel · Đã giải ngân 100% về KS",
  failed_gateway: "failed_gateway · Cổng TT từ chối thẻ",
  expired_hold_10m: "expired_hold_10m · Quá hạn giữ chỗ 10p",
  abandoned_by_guest: "abandoned_by_guest · Khách thoát giữ chỗ",
  refunded_force_majeure: "refunded_force_majeure · Hoàn bất khả kháng",
};

const REJECT_GROUP_LABELS: Record<string, string> = {
  all: "Tất cả mã Reject",
  pre_bid: "Trước báo giá (Hard Rule / Giá sàn / Bỏ qua)",
  bidding_competition: "Đấu giá & Cạnh tranh (60p)",
  payment_hold_10m: "Tạm khóa TT 10 phút (Giữ ghế)",
  post_payment: "Sau thanh toán (Tự đóng trùng)",
};

const SCENARIO_CATEGORY_LABELS: Record<string, string> = {
  all: "Tất cả kịch bản",
  happy_path: "Happy Path (Thành công)",
  payment_hold_concurrency: "Tạm khóa 10p & Tranh chấp ghế",
  inventory_guardrail: "Bảo vệ Tồn kho & Khóa tay",
  bidding_rejection: "Từ chối / Thua báo giá",
  post_stay_settlement: "Hậu mãi, Đối soát & Bất khả kháng",
};

export function LifecycleStateExplorer({
  bundle,
  analytics,
  onStartHold10m,
  onReleaseHold10m,
  onCompleteFullPayment,
  onJumpToWorkspaceSession,
}: LifecycleStateExplorerProps) {
  const catalog: LifecycleCatalogMaster | undefined = bundle.lifecycleCatalog;
  const [selectedStageNum, setSelectedStageNum] = useState<number>(5);
  const [rejectGroupFilter, setRejectGroupFilter] = useState<string>("all");
  const [scenarioCategoryFilter, setScenarioCategoryFilter] =
    useState<string>("all");

  // Compute live occurrence counts per RejectCode directly from master-data auctionSessions
  const rejectCountsMap = useMemo(() => {
    const counts: Record<string, number> = {};
    bundle.auctionSessions.forEach((s) => {
      if (s.status === "live" || s.status === "won") return;
      const code: RejectCode =
        s.rejectCode ??
        (s.status === "payment_failed"
          ? "REJ_HOLD_EXPIRED_10M"
          : s.status === "auto_closed"
            ? "REJ_AUTO_CLOSED_SOLD_OUT"
            : s.status === "partner_declined"
              ? "REJ_PARTNER_SKIPPED_SESSION"
              : s.status === "expired"
                ? "REJ_NO_GUEST_ACTION_60M"
                : "REJ_COMPETITOR_WON_PRICE");
      counts[code] = (counts[code] ?? 0) + 1;
    });
    return counts;
  }, [bundle.auctionSessions]);

  if (!catalog) {
    return null;
  }

  const activeStage =
    catalog.stages.find((st) => st.stageNumber === selectedStageNum) ??
    catalog.stages[0];

  const filteredRejects =
    rejectGroupFilter === "all"
      ? catalog.rejectCatalog
      : catalog.rejectCatalog.filter((r) => r.group === rejectGroupFilter);

  const filteredScenarios =
    scenarioCategoryFilter === "all"
      ? catalog.scenarioMatrix
      : catalog.scenarioMatrix.filter(
          (sc) => sc.category === scenarioCategoryFilter,
        );

  const activeLiveSessions = analytics.liveSessions.filter(
    (ls) => ls.remainingSeconds > 0,
  );
  const activeHoldLive = activeLiveSessions.filter(
    (ls) => ls.holdRoomNumber != null && (ls.holdRemainingSeconds ?? 0) > 0,
  );
  const standbyConflictLive = activeLiveSessions.filter(
    (ls) => ls.isBlockedByPaymentHold,
  );

  return (
    <div
      data-testid="lifecycle-explorer-root"
      className="space-y-6 min-w-0 w-full"
    >
      {/* ===================================================================== */}
      {/* SECTION 1: 4-STATE ROOM MACHINE & LIVE 10-MINUTE SEAT-LOCK SANDBOX    */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-semibold">
                <Clock className="w-3.5 h-3.5" />
                Cơ chế Giữ ghế Xem phim · {catalog.holdMechanism.ttlMinutes} phút (
                {catalog.holdMechanism.ttlSeconds}s)
              </span>
              <Badge variant="outline" className="font-mono text-[10.5px]">
                Master Data v{catalog.version}
              </Badge>
            </div>
            <h2 className="font-semibold text-base text-zinc-950">
              Máy Trạng Thái Phòng Vật Lý (4 States) &amp; Điều Phối Khóa Tạm 10 Phút
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-4xl">
              {catalog.holdMechanism.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 font-semibold">
              Trống mở: {analytics.vacantCount}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-semibold">
              Tạm khóa 10p: {analytics.paymentHoldTotal}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              TT 100%: {analytics.auctionBookedTotal}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold">
              Kênh khác: {analytics.otherBookedTotal}
            </span>
          </div>
        </div>

        {/* 4 Room State Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {catalog.roomStateMachine.map((rm) => {
            const countTonight =
              rm.status === "vacant_unlocked"
                ? analytics.vacantCount
                : rm.status === "payment_hold"
                  ? analytics.paymentHoldTotal
                  : rm.status === "booked_auction"
                    ? analytics.auctionBookedTotal
                    : analytics.otherBookedTotal;

            const toneCls =
              rm.badgeTone === "sky"
                ? "border-sky-200 bg-sky-50/40"
                : rm.badgeTone === "amber"
                  ? "border-amber-300 bg-amber-50/50"
                  : rm.badgeTone === "emerald"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-zinc-200 bg-zinc-50/70";

            return (
              <div
                key={rm.status}
                className={`p-3.5 rounded-xl border ${toneCls} flex flex-col justify-between gap-2.5 min-w-0`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold text-zinc-900 truncate">
                      {rm.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-zinc-200/80 font-mono text-xs font-bold text-zinc-900 shrink-0">
                      {countTonight}/{analytics.scopedTotalRooms} phòng
                    </span>
                  </div>
                  <div className="font-semibold text-xs text-zinc-900">
                    {rm.label}
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    {rm.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-200/70 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      rm.canBid
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-zinc-200/70 text-zinc-500"
                    }`}
                  >
                    Nhận Bid: {rm.canBid ? "CÓ" : "CHẶN"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      rm.canGuestCheckout
                        ? "bg-sky-100 text-sky-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    Khách bấm TT: {rm.canGuestCheckout ? "MỞ" : "KHÓA GHẾ"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded ${
                      rm.canManualOverride
                        ? "bg-zinc-800 text-white"
                        : "bg-amber-100 text-amber-900"
                    }`}
                  >
                    Khóa tay Lễ tân: {rm.canManualOverride ? "CHO PHÉP" : "BẢO VỆ"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Seat-Lock Concurrency Simulator (Real Master Data Sessions) */}
        <div className="p-4 rounded-xl bg-zinc-950 text-white space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-xs">
                 Bảng Điều Phối Tạm Khóa 10 Phút Trực Tiếp (Live Master Data)
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                ({activeHoldLive.length} đang giữ ghế · {standbyConflictLive.length} phiên Standby chờ nhả khóa)
              </span>
            </div>
            {onJumpToWorkspaceSession && (
              <button
                type="button"
                onClick={() => onJumpToWorkspaceSession("CRQ-8944")}
                className="text-[11px] text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                Mở trên Bàn điều hành báo giá →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {activeLiveSessions.map((ls) => {
              const isHolding =
                ls.holdRoomNumber != null && (ls.holdRemainingSeconds ?? 0) > 0;
              const isStandby = ls.isBlockedByPaymentHold;

              return (
                <div
                  key={ls.id}
                  data-testid={`lifecycle-live-card-${ls.id}`}
                  className={`p-3 rounded-xl border text-xs space-y-2 min-w-0 ${
                    isHolding
                      ? "bg-amber-500/10 border-amber-400/50"
                      : isStandby
                        ? "bg-rose-500/10 border-rose-400/40"
                        : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-white">
                        #{ls.id}
                      </span>
                      <span className="text-zinc-300 truncate">
                        {ls.matchedRoomName} ({ls.branchName})
                      </span>
                      <span className="text-[10.5px] font-mono text-zinc-400">
                        · {ls.checkInDateRange}
                      </span>
                    </div>

                    {isHolding ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-400 text-zinc-950 font-mono font-bold text-[11px] shrink-0">
                        <Lock className="w-3 h-3" />
                        Giữ #{ls.holdRoomNumber} ·{" "}
                        {formatCountdown(ls.holdRemainingSeconds ?? 0)}/10:00
                      </span>
                    ) : isStandby ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/30 border border-rose-400/50 text-rose-200 font-mono font-semibold text-[10.5px] shrink-0">
                        <Lock className="w-3 h-3" />
                        Standby · Chờ #{ls.heldRoomNumbers.join(", #")} (
                        {ls.heldByReqIds.map((id) => `#${id}`).join(", ")})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono text-[10.5px] shrink-0">
                        <LockOpen className="w-3 h-3" />
                        {ls.vacantForStay} phòng trống mở
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono text-zinc-300">
                    <span className="px-1.5 py-0.5 rounded bg-white/10">
                      Bid: {ls.bidStatus}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10">
                      Payment: {ls.paymentStatus}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {isHolding ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onCompleteFullPayment(ls)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          <CreditCard className="w-3 h-3" />
                          TT 100% · Khóa cứng #{ls.holdRoomNumber}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onReleaseHold10m(ls, "REJ_HOLD_EXPIRED_10M")
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 text-[11px] cursor-pointer transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Hết hạn 10p (Nhả khóa)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onReleaseHold10m(ls, "REJ_PAYMENT_GATEWAY_DECLINED")
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-rose-200 text-[11px] cursor-pointer transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Thẻ lỗi (Nhả khóa)
                        </button>
                      </>
                    ) : isStandby ? (
                      <span className="text-[11px] text-rose-200/90">
                        Ghế #{ls.heldRoomNumbers.join(", #")} đang chờ thanh toán 10p bởi{" "}
                        <strong>
                          {ls.heldByReqIds.map((id) => `#${id}`).join(", ")}
                        </strong>{" "}
                        — khách này không thể click chọn thanh toán cho tới khi khóa 10p được giải phóng.
                      </span>
                    ) : ls.vacantForStay > 0 ? (
                      <button
                        type="button"
                        onClick={() => onStartHold10m(ls)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-[11px] cursor-pointer transition-colors"
                      >
                        <Clock className="w-3 h-3" />
                        Mô phỏng Khách bấm Giữ phòng 10p
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-400">
                        Hết phòng trống trong kỳ lưu trú
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 2: 9-STAGE FULL BOOKING LIFECYCLE EXPLORER                    */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base text-zinc-950 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-zinc-700" />
              Full End-to-End Lifecycle (9 Bước: Từ Bấm Đặt Phòng → Tạm Khóa 10p → Đối Soát T+7)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Bấm vào từng bước để xem đồng bộ 4 trạng thái thực thể (Room · Request · Bid · Payment) và các nhánh rẽ thất bại.
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            Đang xem: Bước {activeStage.stageNumber}/9 ({activeStage.id})
          </Badge>
        </div>

        {/* 9 Stepper Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
          {catalog.stages.map((st) => {
            const isSel = st.stageNumber === activeStage.stageNumber;
            const isHoldStage = st.roomStatus === "payment_hold";
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStageNum(st.stageNumber)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                  isSel
                    ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                    : isHoldStage
                      ? "bg-amber-50/70 text-amber-950 border-amber-300 hover:border-amber-400"
                      : "bg-zinc-50/70 text-zinc-700 border-zinc-200 hover:bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-mono text-[10.5px]">
                  <span className="font-bold">B{st.stageNumber}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9.5px] ${
                      isSel
                        ? "bg-white/15 text-amber-300"
                        : isHoldStage
                          ? "bg-amber-200/80 text-amber-900 font-semibold"
                          : "bg-zinc-200/70 text-zinc-600"
                    }`}
                  >
                    {st.roomStatus === "payment_hold"
                      ? "10p Hold"
                      : st.roomStatus === "booked_auction"
                        ? "Locked"
                        : "Open"}
                  </span>
                </div>
                <div className="text-[11px] font-medium mt-1 line-clamp-2 leading-snug">
                  {st.title.replace(/^\d+\.\s*/, "")}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Card */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/90 space-y-3.5 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono text-zinc-500">
                {activeStage.id} · Tác nhân: <strong>{activeStage.actor}</strong>
              </span>
              <h4 className="font-semibold text-sm text-zinc-950 mt-0.5">
                Bước {activeStage.stageNumber}: {activeStage.title}
              </h4>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-zinc-200 font-mono text-xs text-zinc-800">
              SLA: <strong>{activeStage.slaText}</strong>
            </span>
          </div>

          {/* Synchronized 4-Entity State Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                1. Room Status (Phòng vật lý)
              </span>
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded border font-mono text-[11px] font-semibold ${
                  ROOM_STATE_BADGE[activeStage.roomStatus].cls
                }`}
              >
                {ROOM_STATE_BADGE[activeStage.roomStatus].label}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                2. Request Status (Yêu cầu khách)
              </span>
              <span className="inline-block mt-1 font-mono text-[11px] font-semibold text-zinc-900">
                {REQUEST_STATE_LABEL[activeStage.requestStatus]}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                3. Bid Status (Báo giá KS)
              </span>
              <span className="inline-block mt-1 font-mono text-[11px] font-semibold text-zinc-900">
                {BID_STATE_LABEL[activeStage.bidStatus]}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-semibold">
                4. Payment Status (Thanh toán)
              </span>
              <span className="inline-block mt-1 font-mono text-[11px] font-semibold text-zinc-900">
                {PAYMENT_STATE_LABEL[activeStage.paymentStatus]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-emerald-950">
                  Luồng Thành công (Happy Path)
                </div>
                <p className="text-emerald-900/80 mt-0.5 leading-relaxed">
                  {activeStage.happyOutcome}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-rose-950">
                  Nhánh Rẽ Thất Bại / Reject tại Bước {activeStage.stageNumber}
                </div>
                {activeStage.failureOutcomes.length === 0 ? (
                  <p className="text-rose-900/80 mt-0.5">
                    Đã hoàn tất lưu trú &amp; đối soát — không còn rủi ro hủy đơn.
                  </p>
                ) : (
                  <ul className="mt-1 space-y-0.5 text-rose-900/90 font-mono text-[11px]">
                    {activeStage.failureOutcomes.map((fo) => (
                      <li key={fo}>• {fo}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 3: 11 REJECT STATUS TAXONOMY (WITH REAL 30D OCCURRENCE COUNTS)*/}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base text-zinc-950 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600" />
              Bảng Phân Loại {catalog.rejectCatalog.length} Trạng Thái Từ Chối / Thất Bại (Reject Status)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Thống kê trực tiếp số phiên phát sinh trong 30 ngày từ Master Data kèm tác động lên khóa phòng và hướng xử lý.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {Object.entries(REJECT_GROUP_LABELS).map(([grpKey, label]) => (
              <button
                key={grpKey}
                type="button"
                onClick={() => setRejectGroupFilter(grpKey)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  rejectGroupFilter === grpKey
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredRejects.map((rej) => {
            const count30d = rejectCountsMap[rej.code] ?? 0;
            const isHoldRej = rej.group === "payment_hold_10m";
            return (
              <div
                key={rej.code}
                className={`p-3.5 rounded-xl border space-y-2 text-xs min-w-0 ${
                  isHoldRej
                    ? "bg-amber-50/40 border-amber-300"
                    : "bg-zinc-50/50 border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-[10.5px] font-bold text-rose-700 break-all block">
                      {rej.code}
                    </span>
                    <span className="font-semibold text-zinc-950 block mt-0.5">
                      {rej.shortLabel}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white border border-zinc-200 font-mono text-[11px] font-semibold text-zinc-800 shrink-0">
                    {count30d} phiên
                  </span>
                </div>

                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  {rej.description}
                </p>

                <div className="pt-2 border-t border-zinc-200/70 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Bước phát sinh:</span>
                    <span className="font-mono font-semibold text-zinc-900">
                      Bước {rej.stageNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">Trạng thái phòng:</span>
                    <span className="font-medium text-emerald-800 text-right">
                      {rej.roomEffect}
                    </span>
                  </div>
                  <div className="text-zinc-700 bg-white px-2 py-1.5 rounded border border-zinc-200/80 mt-1">
                    <strong>Khuyến nghị KS:</strong> {rej.partnerAction}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 4: FULL 18-CASE SCENARIO & EDGE-CASE MATRIX                   */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs p-5 space-y-4 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base text-zinc-950 flex items-center gap-2">
              <Layers className="w-4 h-4 text-zinc-700" />
              Ma Trận Đầy Đủ {catalog.scenarioMatrix.length} Kịch Bản Nghiệp Vụ &amp; Edge Cases (CASE-01 → CASE-18)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Bao phủ toàn bộ kịch bản đặt phòng, đua giữ ghế 10 phút, chặn khóa tay đè, tự đóng phiên trùng và đối soát T+7.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {Object.entries(SCENARIO_CATEGORY_LABELS).map(([catKey, label]) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setScenarioCategoryFilter(catKey)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                  scenarioCategoryFilter === catKey
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredScenarios.map((sc) => {
            const isConcurrency = sc.category === "payment_hold_concurrency";
            const isSuccess = sc.outcome === "SUCCESS" || sc.outcome === "SETTLED_100_BASE";
            return (
              <div
                key={sc.caseId}
                className={`p-3.5 rounded-xl border text-xs space-y-2 min-w-0 ${
                  isConcurrency
                    ? "bg-amber-50/40 border-amber-300"
                    : isSuccess
                      ? "bg-emerald-50/30 border-emerald-200"
                      : "bg-white border-zinc-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-900 text-white font-mono text-[10.5px] font-bold">
                      {sc.caseId}
                    </span>
                    <span className="font-mono text-[10.5px] text-zinc-500">
                      Mẫu: #{sc.sampleSessionId}
                    </span>
                  </div>
                  {sc.rejectCode ? (
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-mono text-[10px] font-semibold">
                      {sc.rejectCode}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      {sc.outcome}
                    </span>
                  )}
                </div>

                <h4 className="font-semibold text-zinc-950 leading-snug">
                  {sc.title}
                </h4>
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  <strong>Điều kiện kích hoạt:</strong> {sc.trigger}
                </p>

                <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-1 font-mono text-[10.5px] text-zinc-700">
                  <div className="break-words">
                    <strong className="text-zinc-900">Room:</strong>{" "}
                    {sc.roomTransition}
                  </div>
                  <div className="break-words">
                    <strong className="text-zinc-900">Bid:</strong>{" "}
                    {sc.bidTransition}
                  </div>
                  <div className="break-words">
                    <strong className="text-zinc-900">Payment:</strong>{" "}
                    {sc.paymentTransition}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
