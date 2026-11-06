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
  Info,
} from "lucide-react";
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
  type KpiType,
  type HotelProfileMaster,
} from "@/data";
import type { ComputedDashboardAnalytics } from "@/services/analyticsEngine";
import { RoomScheduleExplorer } from "@/components/RoomScheduleExplorer";

interface KpiDrilldownModalProps {
  activeKpi: KpiType | null;
  onClose: () => void;
  hotelProfile: HotelProfileMaster;
  analytics: ComputedDashboardAnalytics;
  nightFlashSaleActive: boolean;
  onActivateNightFlashSale: () => void;
  onSwitchToAiTab: () => void;
}

export function KpiDrilldownModal({
  activeKpi,
  onClose,
  hotelProfile,
  analytics,
  nightFlashSaleActive,
  onActivateNightFlashSale,
  onSwitchToAiTab,
}: KpiDrilldownModalProps) {
  const {
    periodMetrics,
    todayBaseRevenue,
    todayGuestPaidTotal,
    todayOrders,
    todayTotalNights,
    todayBaseAdr,
    occupiedCount,
    otherBookedTotal,
    auctionBookedTotal,
    vacantCount,
    occupancyPct,
    checkOutTomorrowCount,
    dailyRoomSchedules,
  } = analytics;

  const isWideModal =
    activeKpi === "rooms_occupied" || activeKpi === "rooms_vacant";

  return (
    <Dialog open={activeKpi !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`${
          isWideModal ? "sm:max-w-[920px]" : "sm:max-w-2xl"
        } p-6 max-h-[90vh] overflow-y-auto overflow-x-hidden gap-4`}
      >
        {/* 1. THỰC NHẬN RÒNG KHÁCH SẠN */}
        {activeKpi === "revenue_total" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Đối Soát Thực Nhận Ròng KS ({periodMetrics.rangeText})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    0% Hoa hồng trừ vào Giá gốc • Tăng trưởng{" "}
                    {periodMetrics.growthPct >= 0
                      ? `+${periodMetrics.growthPct}%`
                      : `${periodMetrics.growthPct}%`}{" "}
                    so với kỳ trước ({formatFullVnd(periodMetrics.previousNetRevenue)})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] text-zinc-500 block font-medium">
                    Tổng Giá gốc KS (100% Base)
                  </span>
                  <span className="text-base font-semibold text-zinc-900 font-mono mt-0.5 block">
                    {formatFullVnd(periodMetrics.baseRevenue)}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Khách TT sàn: {formatCompactVnd(periodMetrics.guestPaidTotal)}đ
                  </span>
                </div>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] text-zinc-500 block font-medium">
                    Hoàn tiền y tế bất khả kháng
                  </span>
                  <span className="text-base font-semibold text-rose-600 font-mono mt-0.5 block">
                    -{formatFullVnd(periodMetrics.medicalRefund)}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {periodMetrics.medicalRefundCases.length} ca duyệt hợp lệ
                  </span>
                </div>
                <div className="p-3.5 bg-zinc-950 text-white rounded-xl border border-zinc-950">
                  <span className="text-[11px] text-zinc-400 block font-medium">
                    Thực nhận ròng về KS
                  </span>
                  <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                    {formatFullVnd(periodMetrics.netReceive)}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    ADR kỳ: {formatCompactVnd(periodMetrics.periodBaseAdr)}đ/đêm
                  </span>
                </div>
              </div>

              {periodMetrics.medicalRefundCases.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950">
                  {periodMetrics.medicalRefundCases.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2">
                      <span>
                        <strong>#{c.id}</strong> ({c.date}): {c.note}
                      </span>
                      <strong className="font-mono text-rose-700 shrink-0">
                        -{formatFullVnd(c.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
                <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                  Cơ Cấu Giá Gốc Theo Hạng Phòng ({periodMetrics.paidWonCount} Đơn Đã TT)
                </h4>
                <div className="space-y-2.5">
                  {periodMetrics.roomClassRevenueShares.map((item) => (
                    <div key={item.roomClassId}>
                      <div className="flex justify-between text-zinc-600 mb-1">
                        <span>
                          {item.roomClassName} ({item.wonSessionsCount} đơn •{" "}
                          {item.category})
                        </span>
                        <span className="font-semibold text-zinc-950 font-mono">
                          {formatFullVnd(item.baseRevenue)} ({item.sharePct}%)
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

              <div className="text-[11px] text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Cổng đối soát:{" "}
                  <strong className="text-zinc-900">
                    {hotelProfile.payoutInfo.gateway}
                  </strong>{" "}
                  • Giải ngân kế tiếp:{" "}
                  <strong className="text-zinc-900">
                    {hotelProfile.payoutInfo.nextPayoutDate}
                  </strong>
                </span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <strong className="text-zinc-900">
                    {hotelProfile.payoutInfo.beneficiaryBank}
                  </strong>
                </span>
              </div>
            </div>
          </>
        )}

        {/* 2. DOANH THU HÔM NAY (06/11/2026) */}
        {activeKpi === "revenue_today" && (
          <>
            <DialogHeader className="border-b border-zinc-200 pb-3.5 text-left">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="w-4 h-4" />
                </span>
                <div>
                  <DialogTitle className="font-semibold text-base text-zinc-950">
                    Sổ Cái Đơn Đã Thanh Toán Hôm Nay (06/11/2026)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    {todayOrders.length} đơn đã TT 100% ({todayTotalNights} đêm
                    phòng) • Khách TT tổng cộng {formatFullVnd(todayGuestPaidTotal)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-zinc-950 text-white rounded-xl border border-zinc-950">
                  <span className="text-[11px] text-zinc-400 block font-medium">
                    Giá gốc KS nhận hôm nay
                  </span>
                  <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                    {formatFullVnd(todayBaseRevenue)}
                  </span>
                </div>
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                  <span className="text-[11px] text-zinc-500 block font-medium">
                    ADR Hôm nay ({todayTotalNights} đêm)
                  </span>
                  <span className="text-base font-semibold text-zinc-900 font-mono mt-0.5 block">
                    {formatFullVnd(todayBaseAdr)}/đêm
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 block font-medium">
                    Trạng thái Ký quỹ KCP
                  </span>
                  <span className="text-base font-semibold text-emerald-800 mt-0.5 block">
                    100% Đã thu & Khóa phòng
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                  Chi Tiết Từng Đơn Đã Khóa Phòng (Từ auction_sessions.json)
                </h4>
                <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100 border border-zinc-200 rounded-xl bg-white">
                  {todayOrders.map((order) => (
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
                          Phòng #{order.lockedRoomNumber}
                        </Badge>
                        <span className="text-zinc-400 text-[10px] block mt-0.5 font-mono">
                          {order.paidTime} • {order.stayDates}
                        </span>
                      </div>
                      <div className="text-right font-mono">
                        <strong className="text-zinc-950 block">
                          +{formatFullVnd(order.baseAmount)}
                        </strong>
                        <span className="text-[10px] text-zinc-400">
                          Khách TT: {formatFullVnd(order.guestPaidAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-2">
                <span className="text-zinc-700 font-medium">
                  Dự báo đến 23h59: Còn khoảng{" "}
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
                    {periodMetrics.rangeText} • Đang chờ khách TT Live:{" "}
                    <strong>{analytics.pendingLiveBidsCount} phiên</strong> •
                    Trần Auto-Bid: &le;{hotelProfile.autoBidMaxRooms} phòng &
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
                    {periodMetrics.paidWonCount}/{periodMetrics.bidsSent} báo giá
                    được khách TT 100% • Cao hơn TB sàn Đà Nẵng (
                    {periodMetrics.platformWinRatePct}%)
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2.5">
                <h4 className="font-semibold text-zinc-900 text-[11px] uppercase tracking-wider">
                  Phễu Đấu Giá 3 Bước ({periodMetrics.rangeText})
                </h4>
                <div className="space-y-2">
                  <div className="p-2.5 bg-white rounded-lg border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-700">
                        1. Gửi báo giá 1 lần hợp lệ (60 phút)
                      </span>
                      <strong className="text-zinc-950 font-mono">
                        {periodMetrics.bidsSent} phiên (100%)
                      </strong>
                    </div>
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full">
                      <div className="bg-zinc-400 h-1.5 rounded-full w-full" />
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-zinc-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-zinc-800">
                        2. Du khách mở xem chi tiết đề xuất của KS
                      </span>
                      <strong className="text-zinc-950 font-mono">
                        {periodMetrics.guestOpenedCount} phiên (
                        {periodMetrics.guestOpenedRatePct}%)
                      </strong>
                    </div>
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full">
                      <div
                        className="bg-zinc-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${periodMetrics.guestOpenedRatePct}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-zinc-900 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-950">
                        3. Khách hoàn tất TT 100% qua NHN KCP (Khóa phòng)
                      </span>
                      <strong className="text-emerald-700 font-bold font-mono">
                        {periodMetrics.paidWonCount} đơn ({periodMetrics.winRatePct}
                        %)
                      </strong>
                    </div>
                    <div className="w-full bg-zinc-100 h-1.5 rounded-full">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${periodMetrics.winRatePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white border border-zinc-200 p-3.5 rounded-xl">
                <div>
                  <span className="text-zinc-500 block">
                    Thời gian khách thanh toán trung bình (các đơn thắng):
                  </span>
                  <strong className="font-mono text-zinc-950 text-sm">
                    {periodMetrics.avgCloseMinutes} phút kể từ lúc gửi giá
                  </strong>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onSwitchToAiTab();
                  }}
                  className="h-8 text-xs"
                >
                  Xem Benchmark Hệ thống &rarr;
                </Button>
              </div>
            </div>
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
                    Lịch 30 Phòng Theo Từng Ngày ({hotelProfile.goldenWindowRange})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    Chọn từng ngày hoặc chuyển sang <strong>Bảng lịch 14 ngày</strong>{" "}
                    để tra cứu chính xác phòng nào (#101–#130) đang trống mở khóa
                    hay đã khóa theo đơn.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <RoomScheduleExplorer
                schedules={dailyRoomSchedules}
                initialView="day"
                initialStatusFilter="all"
                compact
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <span className="text-zinc-500 text-[11px] block">
                    Hôm nay (06/11/2026) — Lấp đầy {occupancyPct}%:
                  </span>
                  <span className="text-sm font-bold text-zinc-950 font-mono">
                    {auctionBookedTotal} phòng goodNstay TT 100% · {otherBookedTotal} phòng kênh khác
                  </span>
                </div>
                <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <span className="text-zinc-500 text-[11px] block">
                    Dự kiến trả phòng trưa mai (07/11):
                  </span>
                  <span className="text-sm font-bold text-zinc-950 font-mono">
                    {checkOutTomorrowCount} phòng check-out 12:00
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
                    Tra Cứu Phòng Trống Mở Khóa Theo Ngày ({hotelProfile.goldenWindowRange})
                  </DialogTitle>
                  <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                    1 phòng trống có thể tham gia nhiều phiên đấu giá cùng lúc ·
                    Chỉ khóa sang Đã đặt khi khách hoàn tất thanh toán 100%
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <RoomScheduleExplorer
                schedules={dailyRoomSchedules}
                initialView="day"
                initialStatusFilter="vacant"
                compact
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

              {vacantCount > 0 && (
                <div className="bg-zinc-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-xs flex items-center gap-1.5 text-amber-400">
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        Xả đêm hôm nay 06/11 (Sau {hotelProfile.nightFlashStartHour})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      Hạ {hotelProfile.nightFlashDiscountPct}% giá sàn bảo vệ cho{" "}
                      {vacantCount} phòng trống đêm nay mà không ảnh hưởng giá OTA.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onActivateNightFlashSale();
                      onClose();
                    }}
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
