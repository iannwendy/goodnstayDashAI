import type {
  AmenityCode,
  AppLocale,
  CurrencyCode,
  CurrencyRateMap,
} from "@/data";

export type { AppLocale, CurrencyCode, CurrencyRateMap };

const DEFAULT_VND_PER_UNIT: CurrencyRateMap = {
  VND: 1,
  KRW: 18.5,
  USD: 25_400,
};

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function convertFromVnd(
  amountVnd: number,
  currency: CurrencyCode,
  rates: CurrencyRateMap = DEFAULT_VND_PER_UNIT,
): number {
  if (!Number.isFinite(amountVnd) || amountVnd === 0) return 0;
  const rate = rates[currency] || DEFAULT_VND_PER_UNIT[currency];
  if (currency === "VND") return Math.round(amountVnd);
  if (currency === "KRW") return Math.round(amountVnd / rate);
  return Number((amountVnd / rate).toFixed(2));
}

export function formatBusinessMoney(
  amountVnd: number,
  currency: CurrencyCode,
  opts?: { compact?: boolean; withPlus?: boolean; rates?: CurrencyRateMap },
): string {
  const converted = convertFromVnd(amountVnd, currency, opts?.rates);
  const abs = Math.abs(converted);
  const signPrefix =
    converted < 0 ? "-" : opts?.withPlus && converted > 0 ? "+" : "";

  if (converted === 0) {
    if (currency === "VND") return "0 ₫";
    if (currency === "KRW") return "0 ₩";
    return "$0";
  }

  if (opts?.compact) {
    if (currency === "VND") {
      if (abs >= 1_000_000_000) {
        const b = (abs / 1_000_000_000)
          .toFixed(2)
          .replace(/\.?0+$/, "")
          .replace(".", ",");
        return `${signPrefix}${b} tỷ ₫`;
      }
      if (abs >= 1_000_000) {
        const m = (abs / 1_000_000)
          .toFixed(1)
          .replace(/\.0$/, "")
          .replace(".", ",");
        return `${signPrefix}${m}tr ₫`;
      }
      if (abs >= 1_000) {
        return `${signPrefix}${Math.round(abs / 1_000)}k ₫`;
      }
      return `${signPrefix}${Math.round(abs)} ₫`;
    }

    if (currency === "KRW") {
      if (abs >= 1_000_000) {
        const m = (abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "");
        return `${signPrefix}${m}M ₩`;
      }
      if (abs >= 1_000) {
        const k = (abs / 1_000).toFixed(1).replace(/\.0$/, "");
        return `${signPrefix}${k}K ₩`;
      }
      return `${signPrefix}${Math.round(abs).toLocaleString("en-US")} ₩`;
    }

    // USD compact
    if (abs >= 1_000_000) {
      return `${signPrefix}$${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
    }
    if (abs >= 1_000) {
      return `${signPrefix}$${(abs / 1_000).toFixed(2).replace(/\.?0+$/, "")}K`;
    }
    return `${signPrefix}$${abs.toFixed(0)}`;
  }

  // Full money format
  if (currency === "VND") {
    return `${signPrefix}${Math.round(abs).toLocaleString("vi-VN")} ₫`;
  }
  if (currency === "KRW") {
    return `${signPrefix}${Math.round(abs).toLocaleString("en-US")} ₩`;
  }
  return `${signPrefix}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: abs < 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function getZeroRevenueAxisMaxVnd(
  currency: CurrencyCode,
  rates: CurrencyRateMap = DEFAULT_VND_PER_UNIT,
): number {
  if (currency === "KRW") return 4 * (rates.KRW || DEFAULT_VND_PER_UNIT.KRW);
  if (currency === "USD") return 4 * (rates.USD || DEFAULT_VND_PER_UNIT.USD);
  return 4_000_000;
}

export function formatAxisTickMoney(
  amountVnd: number,
  currency: CurrencyCode,
  rates: CurrencyRateMap = DEFAULT_VND_PER_UNIT,
): string {
  if (amountVnd <= 0) {
    if (currency === "VND") return "0 ₫";
    if (currency === "KRW") return "0 ₩";
    return "$0";
  }
  return formatBusinessMoney(amountVnd, currency, {
    compact: true,
    withPlus: true,
    rates,
  });
}

export function formatDisplayDate(
  isoDate: string,
  locale: AppLocale,
  includeYear = true,
): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, mStr, dStr] = parts;
  const mIdx = Math.max(0, Math.min(11, Number(mStr) - 1));

  if (locale === "vi") {
    return includeYear ? `${dStr}/${mStr}/${y}` : `${dStr}/${mStr}`;
  }
  if (locale === "ko") {
    return includeYear
      ? `${y}.${mStr}.${dStr}`
      : `${Number(mStr)}월 ${Number(dStr)}일`;
  }
  const mon = EN_MONTHS[mIdx];
  return includeYear ? `${mon} ${dStr}, ${y}` : `${mon} ${dStr}`;
}

const AMENITY_LABELS: Record<
  AmenityCode,
  { vi: string; en: string; ko: string }
> = {
  breakfast: { vi: "Bữa sáng", en: "Breakfast Included", ko: "조식 포함" },
  wifi: { vi: "Wifi", en: "Free Wi-Fi", ko: "무료 와이파이" },
  pool: { vi: "Hồ bơi", en: "Swimming Pool", ko: "수영장" },
  elevator: { vi: "Thang máy", en: "Elevator", ko: "엘리베이터" },
  parking: { vi: "Bãi đậu xe", en: "Free Parking", ko: "무료 주차" },
  late_checkout: {
    vi: "Trả phòng trễ",
    en: "Late Check-out",
    ko: "레이트 체크아웃",
  },
  bathtub: { vi: "Bồn tắm", en: "Bathtub", ko: "욕조" },
  ott_tv: {
    vi: "Truyền hình (OTT)",
    en: "Smart TV (OTT)",
    ko: "스마트 TV (OTT)",
  },
};

export function localizeAmenityCode(
  code: AmenityCode | string,
  locale: AppLocale,
): string {
  const hit = AMENITY_LABELS[code as AmenityCode];
  if (hit) return hit[locale];
  return code;
}

export interface OverviewCopy {
  brandSub: string;
  navOverview: string;
  navCalendar: string;
  navPayout: string;
  navRooms: string;
  navBidding: string;
  navMessages: string;
  navMarketing: string;
  navMarketingSubDeals: string;
  navMarketingSubUpsell: string;
  navLogout: string;
  navComingSoonNotice: string;
  expandSidebarLabel: string;
  collapseSidebarLabel: string;
  openMenuLabel: string;
  closeLabel: string;
  messagesTitle: string;
  messagesEmpty: string;
  notificationsTitle: string;
  helpTitle: string;
  helpSubtitle: string;
  helpItems: Array<{ title: string; body: string }>;
  pageTitle: string;
  periodOptions: {
    "30d": string;
    "7d": string;
    today: string;
  };
  kpiRevenue: string;
  kpiRevenueHint: string;
  kpiTotalBids: string;
  kpiTotalBidsHint: string;
  kpiAcceptRate: string;
  kpiAcceptRateHint: string;
  kpiRating: string;
  kpiRatingHint: string;
  kpiAutoBid: string;
  kpiAutoBidHint: string;
  revenueTimelineTitle: string;
  revenueTimelineSubtitle: string;
  axisRevenueLabel: string;
  axisBookingsLabel: string;
  legendRevenue: string;
  legendBookings: string;
  aiAdvisorBadge: string;
  collapseBtn: string;
  expandBtn: string;
  refreshAnalysisLabel: string;
  analyzedAtPrefix: string;
  revenueGuideTitle: string;
  pillPeriodRevenue: string;
  pillCompletedBookings: string;
  pillAvgBooking: string;
  bidsStatusTitle: string;
  statusAccepted: string;
  statusAcceptedDef: string;
  statusExpired: string;
  statusExpiredDef: string;
  statusRejected: string;
  statusRejectedDef: string;
  statusCancelled: string;
  statusCancelledDef: string;
  breakdownHeading: string;
  colStatus: string;
  colDefinition: string;
  colRecords: string;
  colShare: string;
  rowTotalBids: string;
  bidsGuideTitle: string;
  pillAcceptConversion: string;
  pillExpiredCost: string;
  pillRejectionRate: string;
  ratingsTitle: string;
  ratingsHint: string;
  overallGuestRating: string;
  reviewsCountSuffix: string;
  ratingBreakdownHeading: string;
  criteriaAmenities: string;
  criteriaCheckin: string;
  criteriaCleanliness: string;
  criteriaService: string;
  criteriaValue: string;
  eloTitle: string;
  recentBookingsTitle: string;
  emptyBookingsTitle: string;
  emptyBookingsDesc: string;
  colBookingStatus: string;
  colBookingId: string;
  colCheckIn: string;
  colCheckOut: string;
  colBookingState: string;
  colPaidAt: string;
  colAction: string;
  stateCompletedPaid: string;
  btnViewDetail: string;
  rowsPerPageLabel: string;
  pageRangeConnector: string;
  prevPageLabel: string;
  nextPageLabel: string;
  footerThisPeriod: string;
  footerCompletedWord: string;
  footerNetImpact: string;
  bookingModalTitle: string;
  bookingModalSubtitle: string;
  bookingFieldProperty: string;
  bookingFieldRoom: string;
  bookingFieldStay: string;
  bookingFieldNights: string;
  bookingFieldGuests: string;
  guestsUnit: string;
  bookingFieldPaidAt: string;
  bookingFieldNetPayout: string;
  bookingFieldPayoutNote: string;
  bookingFieldGuestNote: string;
  bookingFieldAmenities: string;
}

const VI_COPY: OverviewCopy = {
  brandSub: "Cổng Đối Tác Khách Sạn",
  navOverview: "Tổng quan hoạt động",
  navCalendar: "Lịch đặt phòng",
  navPayout: "Đối soát doanh thu",
  navRooms: "Quản lý phòng",
  navBidding: "Quản lý báo giá",
  navMessages: "Tin nhắn khách hàng",
  navMarketing: "Khuyến mãi & Tiếp thị",
  navMarketingSubDeals: "Ưu đãi giờ chót",
  navMarketingSubUpsell: "Gói nâng hạng phòng",
  navLogout: "Đăng xuất",
  navComingSoonNotice:
    "Mục này đang được chuẩn bị cho đợt mở rộng tiếp theo. Hiện bạn đang xem trang Tổng quan hoạt động.",
  expandSidebarLabel: "Mở rộng thanh menu",
  collapseSidebarLabel: "Thu gọn thanh menu",
  openMenuLabel: "Mở menu điều hướng",
  closeLabel: "Đóng",
  messagesTitle: "Tin nhắn từ khách đặt phòng",
  messagesEmpty: "Hiện không có tin nhắn mới chưa trả lời.",
  notificationsTitle: "Thông báo vận hành gần đây",
  helpTitle: "Hướng dẫn đọc nhanh bảng Tổng quan",
  helpSubtitle:
    "Dành cho chủ khách sạn & lễ tân — nắm bắt tình hình kinh doanh chỉ trong 30 giây:",
  helpItems: [
    {
      title: "1. Nhìn 5 ô đầu trang",
      body: "Biết ngay kỳ này thu về bao nhiêu tiền phòng thực nhận, đã báo giá bao nhiêu khách và tỷ lệ khách đồng ý đặt là bao nhiêu phần trăm.",
    },
    {
      title: "2. Xem Biểu đồ Doanh thu & Hộp Trợ lý AI",
      body: "Đường màu đỏ là tiền thu từng ngày, cột xanh là số đơn khách đã thanh toán. Ngay bên dưới luôn có lời khuyên kinh doanh ngắn gọn.",
    },
    {
      title: "3. Kiểm tra Lý do trượt đơn & Đơn mới nhất",
      body: "Bảng Tình trạng báo giá chỉ rõ bao nhiêu khách chọn nơi khác hoặc quá hạn phản hồi; cuối trang là danh sách các đơn đã thanh toán kèm phiếu chi tiết.",
    },
  ],
  pageTitle: "Tổng quan hoạt động",
  periodOptions: {
    "30d": "30 ngày qua",
    "7d": "7 ngày qua",
    today: "Hôm nay",
  },
  kpiRevenue: "Doanh thu thực nhận",
  kpiRevenueHint:
    "Tổng tiền phòng thực tế khách sạn thu về từ các đơn đặt phòng đã thanh toán hoàn tất trong kỳ đã chọn.",
  kpiTotalBids: "Tổng lượt báo giá",
  kpiTotalBidsHint:
    "Tổng số lần khách sạn (hoặc chế độ tự động) đã gửi mức giá chào phòng tới khách hỏi phòng.",
  kpiAcceptRate: "Tỷ lệ khách chốt",
  kpiAcceptRateHint:
    "Phần trăm số lượt báo giá được khách đồng ý chọn và hoàn tất thanh toán giữ phòng.",
  kpiRating: "Điểm đánh giá",
  kpiRatingHint:
    "Điểm hài lòng trung bình (trên thang 5 sao) từ những khách thực tế đã nhận phòng và lưu trú.",
  kpiAutoBid: "Báo giá tự động",
  kpiAutoBidHint:
    "Tỷ lệ yêu cầu hỏi phòng được hệ thống tự động phản hồi kịp thời theo khung giá an toàn của khách sạn.",
  revenueTimelineTitle: "Biểu đồ Doanh thu & Đơn đặt phòng",
  revenueTimelineSubtitle:
    "Thể hiện doanh thu thực nhận mỗi ngày (đường màu đỏ) và số đơn hoàn tất (cột màu xanh) trong kỳ đang chọn.",
  axisRevenueLabel: "Doanh thu",
  axisBookingsLabel: "Số đơn hoàn tất",
  legendRevenue: "Doanh thu thực nhận",
  legendBookings: "Số đơn hoàn tất",
  aiAdvisorBadge: "Trợ lý AI goodNstay",
  collapseBtn: "Thu gọn",
  expandBtn: "Mở rộng",
  refreshAnalysisLabel: "Cập nhật lại phân tích",
  analyzedAtPrefix: "Cập nhật phân tích lúc",
  revenueGuideTitle: "Cẩm nang Doanh thu & Nhu cầu khách",
  pillPeriodRevenue: "Doanh thu kỳ này",
  pillCompletedBookings: "Đơn hoàn tất",
  pillAvgBooking: "Bình quân mỗi đơn",
  bidsStatusTitle: "Tình trạng các lượt báo giá",
  statusAccepted: "Khách đã đặt",
  statusAcceptedDef:
    "Khách đồng ý mức giá chào của khách sạn và đã thanh toán hoàn tất để giữ phòng.",
  statusExpired: "Quá hạn phản hồi",
  statusExpiredDef:
    "Yêu cầu hỏi phòng hoặc báo giá hết thời gian chờ mà chưa kịp phản hồi hoặc chốt đơn.",
  statusRejected: "Khách chọn nơi khác",
  statusRejectedDef:
    "Khách đã xem báo giá nhưng chọn một khách sạn khác phù hợp ngân sách/nhu cầu hơn.",
  statusCancelled: "Khách sạn tự hủy",
  statusCancelledDef:
    "Khách sạn chủ động thu hồi báo giá hoặc đóng phiên do hết phòng trống.",
  breakdownHeading: "Chi tiết kết quả báo giá & Ý nghĩa thực tế",
  colStatus: "Trạng thái",
  colDefinition: "Giải thích dễ hiểu",
  colRecords: "Số lượt",
  colShare: "Tỷ trọng",
  rowTotalBids: "Tổng cộng lượt báo giá",
  bidsGuideTitle: "Phân tích tỷ lệ chốt & Gợi ý cải thiện",
  pillAcceptConversion: "Tỷ lệ khách chốt",
  pillExpiredCost: "Bỏ lỡ do quá hạn",
  pillRejectionRate: "Khách chọn nơi khác",
  ratingsTitle: "Đánh giá của khách & Độ ưu tiên hiển thị",
  ratingsHint:
    "Điểm đánh giá thực tế của khách lưu trú kết hợp độ uy tín phản hồi quyết định việc khách sạn được ưu tiên hiện lên đầu cho khách mới.",
  overallGuestRating: "Điểm hài lòng chung của khách",
  reviewsCountSuffix: "lượt đánh giá",
  ratingBreakdownHeading: "Điểm chi tiết từng hạng mục",
  criteriaAmenities: "Tiện nghi trong phòng",
  criteriaCheckin: "Trải nghiệm nhận phòng",
  criteriaCleanliness: "Độ sạch sẽ & thoáng mát",
  criteriaService: "Thái độ phục vụ & hỗ trợ",
  criteriaValue: "Xứng đáng với chi phí",
  eloTitle: "Điểm uy tín hiển thị",
  recentBookingsTitle: "Đơn đặt phòng gần đây",
  emptyBookingsTitle: "Chưa có đơn đặt phòng gần đây",
  emptyBookingsDesc:
    "Hiện chưa có đơn đặt phòng hoàn tất nào trong khoảng thời gian đang chọn.",
  colBookingStatus: "TT",
  colBookingId: "Mã đơn",
  colCheckIn: "Ngày nhận phòng",
  colCheckOut: "Ngày trả phòng",
  colBookingState: "Trạng thái đơn",
  colPaidAt: "Thanh toán lúc",
  colAction: "Thao tác",
  stateCompletedPaid: "Hoàn tất · Đã thanh toán",
  btnViewDetail: "Xem chi tiết",
  rowsPerPageLabel: "Số dòng mỗi trang:",
  pageRangeConnector: "trên",
  prevPageLabel: "Trang trước",
  nextPageLabel: "Trang sau",
  footerThisPeriod: "Kỳ này:",
  footerCompletedWord: "đơn hoàn tất",
  footerNetImpact: "Thực nhận về khách sạn:",
  bookingModalTitle: "Phiếu chi tiết đặt phòng",
  bookingModalSubtitle:
    "Đơn đã thanh toán đủ 100% — phòng đã được giữ chắc chắn cho khách lưu trú.",
  bookingFieldProperty: "Cơ sở lưu trú",
  bookingFieldRoom: "Hạng phòng & Số phòng",
  bookingFieldStay: "Thời gian lưu trú",
  bookingFieldNights: "đêm",
  bookingFieldGuests: "Số khách lưu trú",
  guestsUnit: "khách",
  bookingFieldPaidAt: "Thời điểm thanh toán",
  bookingFieldNetPayout: "Tiền phòng khách sạn thực nhận",
  bookingFieldPayoutNote:
    "Khoản tiền ròng chuyển về tài khoản đối tác theo kỳ đối soát định kỳ (không trừ thêm hoa hồng).",
  bookingFieldGuestNote: "Ghi chú yêu cầu của khách",
  bookingFieldAmenities: "Tiện ích kèm theo đơn",
};

const EN_COPY: OverviewCopy = {
  brandSub: "Partner Hub",
  navOverview: "Dashboard Overview",
  navCalendar: "Booking Calendar",
  navPayout: "Payout",
  navRooms: "Rooms Management",
  navBidding: "Bidding Management",
  navMessages: "Messages",
  navMarketing: "Marketing",
  navMarketingSubDeals: "Last-Minute Deals",
  navMarketingSubUpsell: "Room Upsell Offers",
  navLogout: "Logout",
  navComingSoonNotice:
    "This module will open in the next release. You are currently viewing Dashboard Overview.",
  expandSidebarLabel: "Expand sidebar",
  collapseSidebarLabel: "Collapse sidebar",
  openMenuLabel: "Open navigation menu",
  closeLabel: "Close",
  messagesTitle: "Guest Messages",
  messagesEmpty: "No unread guest messages right now.",
  notificationsTitle: "Recent Property Notifications",
  helpTitle: "Quick Guide to Dashboard Overview",
  helpSubtitle:
    "Built for hotel owners & front-desk managers — read your property health in 30 seconds:",
  helpItems: [
    {
      title: "1. Top 5 Summary Cards",
      body: "Check net hotel revenue, total bids sent, booking acceptance rate, guest rating, and automatic bid coverage at a glance.",
    },
    {
      title: "2. Revenue Timeline & AI Advisor",
      body: "The red curve tracks daily net revenue and blue bars count paid bookings, paired with plain-English pricing suggestions.",
    },
    {
      title: "3. Bids Status & Recent Bookings",
      body: "See why bids won or missed, check property visibility score, and open any completed booking slip in one click.",
    },
  ],
  pageTitle: "Dashboard overview",
  periodOptions: {
    "30d": "Last Month",
    "7d": "Last 7 Days",
    today: "Today",
  },
  kpiRevenue: "Revenue",
  kpiRevenueHint:
    "Total net room revenue earned by your property from completed bookings in the selected period.",
  kpiTotalBids: "Total Bids",
  kpiTotalBidsHint:
    "Total room offers sent to travelers manually or automatically during this period.",
  kpiAcceptRate: "Accept%",
  kpiAcceptRateHint:
    "Percentage of submitted offers accepted and paid by travelers.",
  kpiRating: "Rating",
  kpiRatingHint: "Average verified guest review score out of 5.0 stars.",
  kpiAutoBid: "AutoBid",
  kpiAutoBidHint:
    "Share of eligible traveler requests answered automatically on time.",
  revenueTimelineTitle: "Revenue Timeline",
  revenueTimelineSubtitle:
    "Shows daily revenue (line) and completed bookings (bars) for the selected period.",
  axisRevenueLabel: "Revenue",
  axisBookingsLabel: "Bookings (count)",
  legendRevenue: "Revenue",
  legendBookings: "Bookings (count)",
  aiAdvisorBadge: "goodNstay AI Advisor",
  collapseBtn: "Collapse",
  expandBtn: "Expand",
  refreshAnalysisLabel: "Refresh AI insights",
  analyzedAtPrefix: "goodNstay AI analyzed at",
  revenueGuideTitle: "Revenue & Demand Decision Guide",
  pillPeriodRevenue: "Period Revenue",
  pillCompletedBookings: "Completed Bookings",
  pillAvgBooking: "Est. ADR / Booking",
  bidsStatusTitle: "Bids Status",
  statusAccepted: "Accepted",
  statusAcceptedDef:
    "Traveler accepted the hotel's bid offer and proceeded to booking.",
  statusExpired: "Expired",
  statusExpiredDef:
    "Bid offer or request timed out without action within the allowable window.",
  statusRejected: "Rejected",
  statusRejectedDef:
    "Traveler chose another property offer or declined the submitted bid.",
  statusCancelled: "Cancelled by Hotel",
  statusCancelledDef:
    "Bid offer or reservation was retracted or cancelled by hotel.",
  breakdownHeading: "Bids Status Breakdown & Definitions",
  colStatus: "Status",
  colDefinition: "Workflow Definition",
  colRecords: "Records",
  colShare: "Share",
  rowTotalBids: "Total Bids",
  bidsGuideTitle: "Outcome Breakdown & Conversion Strategy",
  pillAcceptConversion: "Acceptance Conversion",
  pillExpiredCost: "Expired Opportunity Cost",
  pillRejectionRate: "Rejection Rate",
  ratingsTitle: "Ratings, Trust & Visibility",
  ratingsHint:
    "Verified guest ratings and response reliability determine how prominently your property appears to travelers.",
  overallGuestRating: "Overall Guest Rating",
  reviewsCountSuffix: "reviews",
  ratingBreakdownHeading: "Rating Breakdown",
  criteriaAmenities: "Amenities",
  criteriaCheckin: "Check-in Experience",
  criteriaCleanliness: "Cleanliness",
  criteriaService: "Service",
  criteriaValue: "Value for Money",
  eloTitle: "ELO Score",
  recentBookingsTitle: "Recent Bookings",
  emptyBookingsTitle: "No recent bookings",
  emptyBookingsDesc: "There are no bookings to display at the moment.",
  colBookingStatus: "Status",
  colBookingId: "Booking ID",
  colCheckIn: "Check-in",
  colCheckOut: "Check-out",
  colBookingState: "Booking State",
  colPaidAt: "Paid At",
  colAction: "Action",
  stateCompletedPaid: "Completed · Paid",
  btnViewDetail: "View detail",
  rowsPerPageLabel: "Rows per page:",
  pageRangeConnector: "of",
  prevPageLabel: "Previous page",
  nextPageLabel: "Next page",
  footerThisPeriod: "This period:",
  footerCompletedWord: "completed",
  footerNetImpact: "Net impact:",
  bookingModalTitle: "Booking Reservation Detail",
  bookingModalSubtitle:
    "100% paid reservation — room inventory is guaranteed for this guest stay.",
  bookingFieldProperty: "Property",
  bookingFieldRoom: "Room Type & Assigned Unit",
  bookingFieldStay: "Stay Dates",
  bookingFieldNights: "nights",
  bookingFieldGuests: "Guests",
  guestsUnit: "guests",
  bookingFieldPaidAt: "Paid At",
  bookingFieldNetPayout: "Hotel Net Payout",
  bookingFieldPayoutNote:
    "Net room payout settled directly to your hotel account on the regular payout schedule.",
  bookingFieldGuestNote: "Traveler Request Summary",
  bookingFieldAmenities: "Included Amenities",
};

const KO_COPY: OverviewCopy = {
  brandSub: "파트너 허브",
  navOverview: "대시보드 개요",
  navCalendar: "예약 캘린더",
  navPayout: "정산 내역",
  navRooms: "객실 관리",
  navBidding: "입찰 관리",
  navMessages: "메시지",
  navMarketing: "마케팅",
  navMarketingSubDeals: "마감 특가 프로모션",
  navMarketingSubUpsell: "객실 업그레이드 혜택",
  navLogout: "로그아웃",
  navComingSoonNotice:
    "해당 메뉴는 다음 업데이트에서 제공됩니다. 현재 대시보드 개요 화면을 보고 계십니다.",
  expandSidebarLabel: "사이드바 펼치기",
  collapseSidebarLabel: "사이드바 접기",
  openMenuLabel: "메뉴 열기",
  closeLabel: "닫기",
  messagesTitle: "투숙객 메시지",
  messagesEmpty: "새로운 미확인 메시지가 없습니다.",
  notificationsTitle: "최근 호텔 운영 알림",
  helpTitle: "대시보드 빠른 가이드",
  helpSubtitle: "호텔 운영자와 프런트 매니저를 위한 30초 핵심 요약:",
  helpItems: [
    {
      title: "1. 상단 5대 핵심 지표",
      body: "기간별 순수익, 총 입찰 건수, 고객 수락률, 투숙객 평점 및 자동 입찰 응답률을 한눈에 확인하세요.",
    },
    {
      title: "2. 일별 수익 추이 및 AI 어드바이저",
      body: "빨간색 선은 일별 순수익, 파란색 막대는 결제 완료 예약 수를 나타내며 맞춤형 요금 제안을 함께 제공합니다.",
    },
    {
      title: "3. 입찰 결과 분석 및 최근 예약",
      body: "입찰 수락·만료·거절 비중을 비교하고 최근 확정 예약 상세 전표를 바로 열람할 수 있습니다.",
    },
  ],
  pageTitle: "대시보드 개요",
  periodOptions: {
    "30d": "최근 30일",
    "7d": "최근 7일",
    today: "오늘",
  },
  kpiRevenue: "순수익",
  kpiRevenueHint:
    "선택한 기간 동안 결제 완료된 예약에서 발생한 호텔 실수령 객실 수익입니다.",
  kpiTotalBids: "총 입찰 수",
  kpiTotalBidsHint:
    "선택한 기간 동안 고객 요청에 발송한 총 객실 제안 건수입니다.",
  kpiAcceptRate: "수락률",
  kpiAcceptRateHint:
    "발송한 객실 제안 중 고객이 선택하여 결제를 완료한 비율입니다.",
  kpiRating: "평점",
  kpiRatingHint: "실제 투숙 완료 고객이 남긴 5점 만점 기준 평균 만족도입니다.",
  kpiAutoBid: "자동 입찰",
  kpiAutoBidHint:
    "호텔 기준 요금 범위 내에서 자동으로 즉시 응답된 비율입니다.",
  revenueTimelineTitle: "수익 타임라인",
  revenueTimelineSubtitle:
    "선택한 기간의 일별 순수익(선)과 확정 예약 건수(막대)를 보여줍니다.",
  axisRevenueLabel: "순수익",
  axisBookingsLabel: "예약 건수",
  legendRevenue: "순수익",
  legendBookings: "예약 건수",
  aiAdvisorBadge: "goodNstay AI 어드바이저",
  collapseBtn: "접기",
  expandBtn: "펼치기",
  refreshAnalysisLabel: "분석 새로고침",
  analyzedAtPrefix: "goodNstay AI 분석 시각",
  revenueGuideTitle: "수익 및 수요 의사결정 가이드",
  pillPeriodRevenue: "기간 수익",
  pillCompletedBookings: "완료된 예약",
  pillAvgBooking: "예약당 평균 수익",
  bidsStatusTitle: "입찰 상태 현황",
  statusAccepted: "수락됨",
  statusAcceptedDef: "고객이 호텔의 제안을 수락하고 예약 결제를 완료했습니다.",
  statusExpired: "만료됨",
  statusExpiredDef:
    "응답 제한 시간 내에 입찰 또는 선택이 이루어지지 않아 종료되었습니다.",
  statusRejected: "거절됨",
  statusRejectedDef:
    "고객이 다른 숙소를 선택했거나 제안을 거절했습니다.",
  statusCancelled: "호텔 측 취소",
  statusCancelledDef: "객실 마감 등의 사유로 호텔에서 제안을 철회했습니다.",
  breakdownHeading: "입찰 상태별 상세 내역 및 정의",
  colStatus: "상태",
  colDefinition: "업무상 의미",
  colRecords: "건수",
  colShare: "비중",
  rowTotalBids: "총 입찰 합계",
  bidsGuideTitle: "결과 분석 및 예약 전환 전략",
  pillAcceptConversion: "예약 전환율",
  pillExpiredCost: "시간 만료 손실률",
  pillRejectionRate: "미선택 비율",
  ratingsTitle: "평점, 신뢰도 및 노출 순위",
  ratingsHint:
    "투숙객 평점과 응답 신뢰도가 높을수록 고객 검색 결과 상단에 우선 노출됩니다.",
  overallGuestRating: "전체 투숙객 평점",
  reviewsCountSuffix: "개 리뷰",
  ratingBreakdownHeading: "항목별 상세 평점",
  criteriaAmenities: "객실 편의시설",
  criteriaCheckin: "체크인 경험",
  criteriaCleanliness: "청결도",
  criteriaService: "서비스 친절도",
  criteriaValue: "가격 대비 만족도",
  eloTitle: "노출 신뢰 점수",
  recentBookingsTitle: "최근 예약 내역",
  emptyBookingsTitle: "최근 예약 내역이 없습니다",
  emptyBookingsDesc: "선택한 기간에 표시할 완료된 예약이 없습니다.",
  colBookingStatus: "상태",
  colBookingId: "예약 번호",
  colCheckIn: "체크인",
  colCheckOut: "체크아웃",
  colBookingState: "예약 상태",
  colPaidAt: "결제 일시",
  colAction: "상세",
  stateCompletedPaid: "확정 · 결제완료",
  btnViewDetail: "상세 보기",
  rowsPerPageLabel: "페이지당 행:",
  pageRangeConnector: "/",
  prevPageLabel: "이전 페이지",
  nextPageLabel: "다음 페이지",
  footerThisPeriod: "이번 기간:",
  footerCompletedWord: "건 완료",
  footerNetImpact: "순정산 합계:",
  bookingModalTitle: "예약 상세 전표",
  bookingModalSubtitle: "100% 결제 완료된 확정 예약입니다.",
  bookingFieldProperty: "숙소 지점",
  bookingFieldRoom: "객실 타입 및 배정 호수",
  bookingFieldStay: "투숙 일정",
  bookingFieldNights: "박",
  bookingFieldGuests: "투숙 인원",
  guestsUnit: "명",
  bookingFieldPaidAt: "결제 완료 시각",
  bookingFieldNetPayout: "호텔 실수령 정산금",
  bookingFieldPayoutNote:
    "정기 정산 주기에 따라 호텔 계좌로 입금되는 순수익입니다.",
  bookingFieldGuestNote: "고객 요청 사항",
  bookingFieldAmenities: "포함 혜택",
};

export function getDictionary(locale: AppLocale): OverviewCopy {
  if (locale === "en") return EN_COPY;
  if (locale === "ko") return KO_COPY;
  return VI_COPY;
}
