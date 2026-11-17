import type { AppLocale } from "@/data";

export interface HubModulesCopy {
  common: {
    saveBtn: string;
    cancelBtn: string;
    closeBtn: string;
    editBtn: string;
    savedToast: string;
    roleRestrictedNotice: string;
    allFilter: string;
    activeBadge: string;
    pausedBadge: string;
    perNightSuffix: string;
    perStaySuffix: string;
    roomPrefix: string;
    floorPrefix: string;
    nightsUnit: string;
    guestsUnit: string;
  };
  calendar: {
    pageTitle: string;
    pageSubtitle: string;
    windowCurrent7d: string;
    windowExtended14d: string;
    windowPast7d: string;
    kpiArrivalsToday: string;
    kpiInHouse: string;
    kpiBlockedRooms: string;
    kpiOccupancy7d: string;
    tapeTitle: string;
    tapeHint: string;
    legendBooked: string;
    legendAvailable: string;
    legendBlocked: string;
    todayBadge: string;
    colRoomUnit: string;
    freeCellAction: string;
    blockModalTitle: string;
    blockModalSubtitle: string;
    blockFieldReason: string;
    blockTypeMaint: string;
    blockTypeHold: string;
    blockConfirmBtn: string;
    unblockBtn: string;
    frontDeskTitle: string;
    frontDeskEmpty: string;
    stayArrivingToday: string;
    stayInHouse: string;
    stayCheckedOut: string;
  };
  payout: {
    pageTitle: string;
    pageSubtitle: string;
    kpiTotalReconciled: string;
    kpiPaidBank: string;
    kpiProcessing: string;
    kpiUpcoming: string;
    bankSectionTitle: string;
    bankVerifiedBadge: string;
    editBankBtn: string;
    bankModalTitle: string;
    bankFieldName: string;
    bankFieldAccount: string;
    bankFieldHolder: string;
    batchesTitle: string;
    batchesEmpty: string;
    filterPaid: string;
    filterProcessing: string;
    filterUpcoming: string;
    statusPaid: string;
    statusProcessing: string;
    statusUpcoming: string;
    colCycle: string;
    colProperty: string;
    colPeriod: string;
    colBookingsCount: string;
    colNetAmount: string;
    colPayoutDate: string;
    colStatus: string;
    colAction: string;
    viewStatementBtn: string;
    requestEarlyPayoutBtn: string;
    earlyPayoutTriggeredToast: string;
    statementModalTitle: string;
    statementBankRef: string;
  };
  rooms: {
    pageTitle: string;
    pageSubtitle: string;
    kpiTotalUnits: string;
    kpiReady: string;
    kpiOccupied: string;
    kpiDirty: string;
    kpiMaintenance: string;
    categoriesTitle: string;
    colRoomType: string;
    colCapacity: string;
    colStandardRate: string;
    colSafeFloorRate: string;
    colBiddingToggle: string;
    editRateBtn: string;
    rateModalTitle: string;
    rateFieldStandard: string;
    rateFieldFloor: string;
    unitsGridTitle: string;
    statusReady: string;
    statusOccupied: string;
    statusDirty: string;
    statusMaintenance: string;
    markReadyBtn: string;
    markDirtyBtn: string;
    markMaintBtn: string;
    reopenRoomBtn: string;
    searchRoomPlaceholder: string;
  };
  bidding: {
    pageTitle: string;
    pageSubtitle: string;
    kpiOpenRequests: string;
    kpiSentOffers: string;
    kpiAccept30d: string;
    kpiAutoBidActive: string;
    liveQueueTitle: string;
    liveQueueEmpty: string;
    filterWaiting: string;
    filterSent: string;
    filterPassed: string;
    guestBudgetLabel: string;
    suggestedRateLabel: string;
    sendOfferBtn: string;
    passRequestBtn: string;
    offerSentBadge: string;
    passedBadge: string;
    expiresInPrefix: string;
    minutesUnit: string;
    offerModalTitle: string;
    offerFieldRate: string;
    offerFloorWarning: string;
    offerFieldPerks: string;
    offerEstNetTotal: string;
    confirmSendOfferBtn: string;
    autoBidSectionTitle: string;
    autoBidSectionSub: string;
    ruleEnabledLabel: string;
    ruleNightBoostLabel: string;
    ruleFloorLabel: string;
    ruleMaxDiscountLabel: string;
    editRuleBtn: string;
    historyTitle: string;
    modeAuto: string;
    modeManual: string;
  };
  messages: {
    pageTitle: string;
    pageSubtitle: string;
    kpiTotalThreads: string;
    kpiUnread: string;
    kpiReplied: string;
    kpiAvgResponse: string;
    avgResponseValue: string;
    filterUnread: string;
    filterReplied: string;
    searchPlaceholder: string;
    emptyInboxTitle: string;
    emptyInboxDesc: string;
    quickReplyHeading: string;
    replyPlaceholder: string;
    sendReplyBtn: string;
    markReadBtn: string;
    markUnreadBtn: string;
    viewLinkedBookingBtn: string;
    senderGuest: string;
    senderHotel: string;
  };
  marketing: {
    dealsPageTitle: string;
    dealsPageSubtitle: string;
    upsellPageTitle: string;
    upsellPageSubtitle: string;
    tabFlashDeals: string;
    tabRoomUpsell: string;
    kpiActiveCampaigns: string;
    kpiPromoRoomsSold: string;
    kpiFlashRevenue: string;
    kpiUpsellRevenue: string;
    createDealBtn: string;
    createUpsellBtn: string;
    quotaLabel: string;
    sold30dLabel: string;
    orders30dLabel: string;
    revenue30dLabel: string;
    dealModalTitle: string;
    upsellModalTitle: string;
    fieldTitle: string;
    fieldDiscountPct: string;
    fieldOriginalRate: string;
    fieldDailyQuota: string;
    fieldAddOnPrice: string;
    categoryUpgrade: string;
    categoryEarlyLate: string;
    categoryDining: string;
    categoryTransfer: string;
  };
  session: {
    modalTitle: string;
    modalSubtitle: string;
    shiftRoleHeading: string;
    managerPermNote: string;
    receptionistPermNote: string;
    signOutBtn: string;
    stayWorkingBtn: string;
    signedOutTitle: string;
    signedOutSubtitle: string;
    signBackInBtn: string;
  };
}

const VI_MODULES_COPY: HubModulesCopy = {
  common: {
    saveBtn: "Lưu thay đổi",
    cancelBtn: "Hủy bỏ",
    closeBtn: "Đóng",
    editBtn: "Chỉnh sửa",
    savedToast: "Đã cập nhật và đồng bộ dữ liệu thành công.",
    roleRestrictedNotice:
      "Tài khoản Lễ tân ca trực chỉ xem mục này — chuyển sang Quản lý khách sạn để thay đổi cấu hình tài chính/giá sàn.",
    allFilter: "Tất cả",
    activeBadge: "Đang bật",
    pausedBadge: "Tạm dừng",
    perNightSuffix: "/ đêm",
    perStaySuffix: "/ chặng ở",
    roomPrefix: "Phòng",
    floorPrefix: "Tầng",
    nightsUnit: "đêm",
    guestsUnit: "khách",
  },
  calendar: {
    pageTitle: "Lịch đặt phòng & Sơ đồ buồng",
    pageSubtitle:
      "Theo dõi trực quan khách nhận/trả phòng, mở xem phiếu đặt phòng hoặc khóa/mở bán nhanh từng ngày trên sơ đồ.",
    windowCurrent7d: "7 ngày trọng tâm (04/11 – 10/11)",
    windowExtended14d: "14 ngày liên tiếp (01/11 – 14/11)",
    windowPast7d: "Tuần trước (28/10 – 03/11)",
    kpiArrivalsToday: "Khách nhận phòng hôm nay",
    kpiInHouse: "Phòng đang có khách ở",
    kpiBlockedRooms: "Lịch tạm khóa / giữ phòng",
    kpiOccupancy7d: "Công suất lấp đầy kỳ xem",
    tapeTitle: "Sơ đồ lịch phòng theo ngày",
    tapeHint:
      "Bấm vào ô đơn màu xanh để xem phiếu đặt phòng; bấm vào ô trống hoặc ô đang khóa để giữ phòng / mở bán lại.",
    legendBooked: "Đơn đã thanh toán",
    legendAvailable: "Trống · Sẵn sàng bán",
    legendBlocked: "Khóa bảo trì / Giữ tại quầy",
    todayBadge: "Hôm nay",
    colRoomUnit: "Phòng & Hạng phòng",
    freeCellAction: "Trống",
    blockModalTitle: "Khóa lịch phòng hoặc Giữ phòng tại quầy",
    blockModalSubtitle:
      "Ngăn hệ thống tự động nhận đơn trùng vào ngày phòng đang bảo dưỡng hoặc đã giữ cho khách đoàn.",
    blockFieldReason: "Ghi chú lý do giữ / khóa phòng",
    blockTypeMaint: "Bảo trì kỹ thuật phòng",
    blockTypeHold: "Giữ phòng khách đặt tại quầy",
    blockConfirmBtn: "Xác nhận khóa ngày này",
    unblockBtn: "Mở bán lại ngày này",
    frontDeskTitle: "Bảng điều phối Lễ tân — Khách nhận phòng & Đang lưu trú",
    frontDeskEmpty:
      "Chưa có lượt khách nhận phòng hoặc lưu trú nào tại cơ sở này trong kỳ đang chọn.",
    stayArrivingToday: "Nhận phòng hôm nay",
    stayInHouse: "Đang lưu trú",
    stayCheckedOut: "Đã trả phòng",
  },
  payout: {
    pageTitle: "Đối soát doanh thu & Thanh toán",
    pageSubtitle:
      "Minh bạch 100% từng đơn đặt phòng đã hoàn tất, lịch ngân hàng chuyển khoản và tài khoản thụ hưởng của cơ sở.",
    kpiTotalReconciled: "Tổng doanh thu đối soát",
    kpiPaidBank: "Đã nhận về ngân hàng",
    kpiProcessing: "Đang lệnh chuyển khoản",
    kpiUpcoming: "Chờ kỳ đối soát tới",
    bankSectionTitle: "Tài khoản ngân hàng nhận tiền",
    bankVerifiedBadge: "Đã xác thực chính chủ",
    editBankBtn: "Cập nhật tài khoản",
    bankModalTitle: "Cập nhật Tài khoản Ngân hàng Thụ hưởng",
    bankFieldName: "Ngân hàng & Chi nhánh",
    bankFieldAccount: "Số tài khoản nhận tiền",
    bankFieldHolder: "Tên chủ tài khoản",
    batchesTitle: "Các kỳ sao kê & Lệnh chuyển khoản",
    batchesEmpty:
      "Cơ sở chưa phát sinh kỳ sao kê thanh toán nào — tiền phòng sẽ tự động tổng hợp ngay khi có đơn hoàn tất đầu tiên.",
    filterPaid: "Đã nhận tiền",
    filterProcessing: "Đang chuyển",
    filterUpcoming: "Chờ kỳ tới",
    statusPaid: "Đã chuyển khoản",
    statusProcessing: "Đang xử lý NH",
    statusUpcoming: "Chờ kỳ tới",
    colCycle: "Mã kỳ sao kê",
    colProperty: "Cơ sở",
    colPeriod: "Giai đoạn đơn",
    colBookingsCount: "Số đơn",
    colNetAmount: "Thực nhận về KS",
    colPayoutDate: "Ngày nhận tiền",
    colStatus: "Trạng thái",
    colAction: "Thao tác",
    viewStatementBtn: "Xem sao kê",
    requestEarlyPayoutBtn: "Yêu cầu giải ngân sớm",
    earlyPayoutTriggeredToast:
      "Đã gửi lệnh yêu cầu giải ngân sớm sang bộ phận kế toán đối tác.",
    statementModalTitle: "Phiếu Sao Kê Chi Tiết Kỳ Đối Soát",
    statementBankRef: "Mã tham chiếu ngân hàng",
  },
  rooms: {
    pageTitle: "Quản lý hạng phòng & Buồng phòng",
    pageSubtitle:
      "Điều chỉnh khung giá chuẩn, mức giá sàn an toàn khi báo giá và cập nhật tình trạng dọn phòng theo thời gian thực.",
    kpiTotalUnits: "Tổng số phòng",
    kpiReady: "Trống sạch đón khách",
    kpiOccupied: "Đang có khách ở",
    kpiDirty: "Chờ dọn buồng",
    kpiMaintenance: "Tạm khóa bảo trì",
    categoriesTitle: "Danh mục Hạng phòng & Khung giá an toàn",
    colRoomType: "Hạng phòng",
    colCapacity: "Sức chứa",
    colStandardRate: "Giá niêm yết",
    colSafeFloorRate: "Giá sàn tối thiểu",
    colBiddingToggle: "Nhận báo giá",
    editRateBtn: "Sửa khung giá",
    rateModalTitle: "Điều chỉnh Giá niêm yết & Giá sàn Hạng phòng",
    rateFieldStandard: "Giá niêm yết tiêu chuẩn (VND/đêm)",
    rateFieldFloor: "Giá sàn bảo vệ lợi nhuận (VND/đêm)",
    unitsGridTitle: "Sơ đồ Tình trạng Phòng thực tế (Lễ tân & Buồng phòng)",
    statusReady: "Trống sạch",
    statusOccupied: "Đang có khách",
    statusDirty: "Chờ dọn phòng",
    statusMaintenance: "Đang bảo trì",
    markReadyBtn: "Báo dọn xong",
    markDirtyBtn: "Chuyển chờ dọn",
    markMaintBtn: "Khóa bảo trì",
    reopenRoomBtn: "Mở lại phòng",
    searchRoomPlaceholder: "Tìm số phòng (VD: 116, 201)...",
  },
  bidding: {
    pageTitle: "Quản lý báo giá & Phản hồi tự động",
    pageSubtitle:
      "Gửi mức giá chào cạnh tranh cho khách đang hỏi phòng trực tiếp và thiết lập quy tắc Báo giá tự động 24/7.",
    kpiOpenRequests: "Khách đang chờ giá",
    kpiSentOffers: "Đã gửi đang chờ chốt",
    kpiAccept30d: "Tỷ lệ chốt 30 ngày",
    kpiAutoBidActive: "Cơ sở bật Tự động",
    liveQueueTitle: "Hàng đợi Yêu cầu hỏi phòng mới của khách",
    liveQueueEmpty: "Không có yêu cầu nào trong bộ lọc này.",
    filterWaiting: "Chờ gửi giá",
    filterSent: "Đã gửi báo giá",
    filterPassed: "Đã bỏ qua",
    guestBudgetLabel: "Ngân sách khách tìm",
    suggestedRateLabel: "Giá đề xuất dễ chốt",
    sendOfferBtn: "Gửi báo giá ngay",
    passRequestBtn: "Bỏ qua",
    offerSentBadge: "Đã gửi giá chào",
    passedBadge: "Đã bỏ qua",
    expiresInPrefix: "Còn",
    minutesUnit: "phút",
    offerModalTitle: "Gửi Báo Giá Chào Phòng Cho Khách",
    offerFieldRate: "Mức giá chào mỗi đêm (VND)",
    offerFloorWarning:
      "Lưu ý: Mức giá này thấp hơn giá sàn bảo vệ lợi nhuận của cơ sở.",
    offerFieldPerks: "Tiện ích tặng kèm để tăng tỷ lệ khách chọn",
    offerEstNetTotal: "Tổng doanh thu thực nhận dự kiến",
    confirmSendOfferBtn: "Xác nhận gửi báo giá",
    autoBidSectionTitle: "Quy tắc Báo giá Tự động 24/7 theo Cơ sở",
    autoBidSectionSub:
      "Hệ thống tự động phản hồi trong 20–30 giây khi lễ tân bận hoặc vào ban đêm, không bao giờ thấp hơn giá sàn đã cài.",
    ruleEnabledLabel: "Tự động báo giá 24/7",
    ruleNightBoostLabel: "Ưu tiên giữ khách ca đêm (22h–06h)",
    ruleFloorLabel: "Giá sàn bảo vệ",
    ruleMaxDiscountLabel: "Giảm tối đa so với niêm yết",
    editRuleBtn: "Cài đặt quy tắc",
    historyTitle: "Nhật ký các lượt báo giá gần đây",
    modeAuto: "Tự động",
    modeManual: "Thủ công",
  },
  messages: {
    pageTitle: "Tin nhắn & Hỗ trợ khách đặt phòng",
    pageSubtitle:
      "Phản hồi nhanh các yêu cầu đậu xe, thêm khăn tắm, xe đón sân bay hoặc xuất hóa đơn công tác gắn liền từng mã đơn.",
    kpiTotalThreads: "Tổng cuộc trò chuyện",
    kpiUnread: "Tin nhắn chưa đọc",
    kpiReplied: "Đã phản hồi khách",
    kpiAvgResponse: "Tốc độ phản hồi TB",
    avgResponseValue: "4 phút",
    filterUnread: "Chưa đọc",
    filterReplied: "Đã phản hồi",
    searchPlaceholder: "Tìm tên khách hoặc mã đơn (#71)...",
    emptyInboxTitle: "Chưa có tin nhắn khách hàng tại cơ sở này",
    emptyInboxDesc:
      "Khi khách đặt phòng gửi câu hỏi về giờ nhận phòng hoặc tiện ích, hội thoại sẽ hiển thị ngay tại đây.",
    quickReplyHeading: "Mẫu phản hồi nhanh cho Lễ tân:",
    replyPlaceholder: "Nhập nội dung phản hồi gửi tới khách lưu trú...",
    sendReplyBtn: "Gửi phản hồi",
    markReadBtn: "Đánh dấu đã đọc",
    markUnreadBtn: "Đánh dấu chưa đọc",
    viewLinkedBookingBtn: "Xem phiếu đơn",
    senderGuest: "Khách đặt phòng",
    senderHotel: "Lễ tân khách sạn",
  },
  marketing: {
    dealsPageTitle: "Khuyến mãi & Tiếp thị · Ưu đãi giờ chót",
    dealsPageSubtitle:
      "Tăng công suất lấp đầy phòng trống buổi tối bằng các gói ưu đãi có giới hạn số lượng phòng mỗi ngày.",
    upsellPageTitle: "Khuyến mãi & Tiếp thị · Gói nâng hạng phòng",
    upsellPageSubtitle:
      "Gia tăng doanh thu trên mỗi đơn đặt nhờ gợi ý nâng lên phòng hướng biển, trả phòng trễ hoặc xe đón sân bay.",
    tabFlashDeals: "Ưu đãi giờ chót",
    tabRoomUpsell: "Gói nâng hạng phòng",
    kpiActiveCampaigns: "Chương trình đang chạy",
    kpiPromoRoomsSold: "Đêm phòng bán từ ưu đãi",
    kpiFlashRevenue: "Doanh thu ưu đãi giờ chót",
    kpiUpsellRevenue: "Doanh thu cộng thêm 30 ngày",
    createDealBtn: "+ Tạo ưu đãi giờ chót",
    createUpsellBtn: "+ Thêm gói nâng hạng",
    quotaLabel: "Quỹ phòng/ngày",
    sold30dLabel: "Đã bán (30 ngày)",
    orders30dLabel: "Lượt khách mua",
    revenue30dLabel: "Doanh thu mang về",
    dealModalTitle: "Tạo Chương Trình Ưu Đãi Giờ Chót Mới",
    upsellModalTitle: "Thêm Gói Nâng Hạng Phòng / Dịch Vụ Cộng Thêm",
    fieldTitle: "Tên chương trình hiển thị cho khách",
    fieldDiscountPct: "Mức ưu đãi giảm giá (%)",
    fieldOriginalRate: "Giá phòng gốc (VND/đêm)",
    fieldDailyQuota: "Số phòng mở ưu đãi tối đa mỗi ngày",
    fieldAddOnPrice: "Giá cộng thêm (VND)",
    categoryUpgrade: "Nâng hạng phòng cao cấp",
    categoryEarlyLate: "Nhận sớm / Trả phòng trễ",
    categoryDining: "Ẩm thực & Bữa sáng",
    categoryTransfer: "Xe đưa đón sân bay",
  },
  session: {
    modalTitle: "Bàn giao ca trực & Tài khoản phiên làm việc",
    modalSubtitle:
      "Chuyển đổi nhanh vai trò vận hành (Quản lý khách sạn / Lễ tân ca trực) hoặc đăng xuất tạm thời khỏi quầy.",
    shiftRoleHeading: "Đổi vai trò ca làm việc hiện tại",
    managerPermNote: "Toàn quyền: Xem & sửa tài khoản ngân hàng, giá sàn, giải ngân sớm và chiến dịch khuyến mãi.",
    receptionistPermNote: "Vận hành quầy: Xem lịch phòng, cập nhật dọn phòng, trả lời khách & gửi báo giá theo khung an toàn.",
    signOutBtn: "Đăng xuất khỏi ca trực",
    stayWorkingBtn: "Tiếp tục làm việc",
    signedOutTitle: "Đã đăng xuất khỏi Cổng Đối Tác Optibide",
    signedOutSubtitle:
      "Phiên làm việc của bạn đã được khóa an toàn. Bấm nút bên dưới để đăng nhập trở lại bảng điều hành khách sạn.",
    signBackInBtn: "Đăng nhập lại Cổng Đối Tác",
  },
};

const EN_MODULES_COPY: HubModulesCopy = {
  common: {
    saveBtn: "Save changes",
    cancelBtn: "Cancel",
    closeBtn: "Close",
    editBtn: "Edit",
    savedToast: "Changes saved and synchronized successfully.",
    roleRestrictedNotice:
      "Front-Desk Receptionist role has read-only access here — switch to Property Manager to modify payout or floor-rate guardrails.",
    allFilter: "All",
    activeBadge: "Active",
    pausedBadge: "Paused",
    perNightSuffix: "/ night",
    perStaySuffix: "/ stay",
    roomPrefix: "Room",
    floorPrefix: "Floor",
    nightsUnit: "nights",
    guestsUnit: "guests",
  },
  calendar: {
    pageTitle: "Booking Calendar & Room Tape Chart",
    pageSubtitle:
      "Track daily arrivals, in-house stays, open reservation slips, or block/unblock specific room dates in one click.",
    windowCurrent7d: "Focus 7 Days (Nov 04 – Nov 10)",
    windowExtended14d: "14-Day Horizon (Nov 01 – Nov 14)",
    windowPast7d: "Previous Week (Oct 28 – Nov 03)",
    kpiArrivalsToday: "Arrivals Today",
    kpiInHouse: "Occupied Rooms Today",
    kpiBlockedRooms: "Active Date Holds",
    kpiOccupancy7d: "Window Occupancy",
    tapeTitle: "Daily Room Allocation Schedule",
    tapeHint:
      "Click any green booking bar to view the reservation slip; click an open or blocked cell to hold or reopen inventory.",
    legendBooked: "Confirmed & Paid",
    legendAvailable: "Available for Sale",
    legendBlocked: "Maintenance / Walk-in Hold",
    todayBadge: "Today",
    colRoomUnit: "Room & Category",
    freeCellAction: "Open",
    blockModalTitle: "Block Room Date or Walk-in Hold",
    blockModalSubtitle:
      "Prevent automatic offers on dates reserved for room maintenance or direct front-desk guests.",
    blockFieldReason: "Hold / Maintenance Reason",
    blockTypeMaint: "Preventive Maintenance",
    blockTypeHold: "Direct Walk-in Hold",
    blockConfirmBtn: "Confirm Date Block",
    unblockBtn: "Reopen Date for Sale",
    frontDeskTitle: "Front-Desk Dispatch — Today's Arrivals & Active Stays",
    frontDeskEmpty:
      "No arrivals or active stays recorded for this property in the selected window.",
    stayArrivingToday: "Arriving Today",
    stayInHouse: "In-House",
    stayCheckedOut: "Checked Out",
  },
  payout: {
    pageTitle: "Payout & Revenue Reconciliation",
    pageSubtitle:
      "100% transparent booking-by-booking reconciliation, scheduled bank transfers, and verified beneficiary accounts.",
    kpiTotalReconciled: "Total Reconciled Net",
    kpiPaidBank: "Settled to Bank",
    kpiProcessing: "Transfer in Progress",
    kpiUpcoming: "Upcoming Cycle",
    bankSectionTitle: "Verified Settlement Bank Accounts",
    bankVerifiedBadge: "Verified Account",
    editBankBtn: "Update Bank Info",
    bankModalTitle: "Update Beneficiary Bank Account",
    bankFieldName: "Bank & Branch Name",
    bankFieldAccount: "Account Number",
    bankFieldHolder: "Beneficiary Name",
    batchesTitle: "Payout Statements & Transfer Batches",
    batchesEmpty:
      "No settlement batches generated yet — payouts aggregate automatically as soon as your first booking completes.",
    filterPaid: "Settled",
    filterProcessing: "Processing",
    filterUpcoming: "Upcoming",
    statusPaid: "Settled · Paid",
    statusProcessing: "Bank Processing",
    statusUpcoming: "Scheduled",
    colCycle: "Batch ID",
    colProperty: "Property",
    colPeriod: "Stay Window",
    colBookingsCount: "Bookings",
    colNetAmount: "Net Payout",
    colPayoutDate: "Payout Date",
    colStatus: "Status",
    colAction: "Action",
    viewStatementBtn: "View Statement",
    requestEarlyPayoutBtn: "Request Early Payout",
    earlyPayoutTriggeredToast:
      "Early settlement request submitted to partner finance.",
    statementModalTitle: "Itemized Payout Batch Statement",
    statementBankRef: "Bank Reference",
  },
  rooms: {
    pageTitle: "Rooms & Housekeeping Management",
    pageSubtitle:
      "Manage room categories, safe floor-price guardrails, and live housekeeping status across every physical unit.",
    kpiTotalUnits: "Total Rooms",
    kpiReady: "Clean & Ready",
    kpiOccupied: "Occupied",
    kpiDirty: "Needs Cleaning",
    kpiMaintenance: "Maintenance",
    categoriesTitle: "Room Categories & Safe Pricing Guardrails",
    colRoomType: "Room Category",
    colCapacity: "Max Guests",
    colStandardRate: "Standard Rate",
    colSafeFloorRate: "Safe Floor Rate",
    colBiddingToggle: "Bidding Open",
    editRateBtn: "Edit Rates",
    rateModalTitle: "Edit Standard & Safe Floor Rates",
    rateFieldStandard: "Standard Rack Rate (VND/night)",
    rateFieldFloor: "Minimum Safe Floor Rate (VND/night)",
    unitsGridTitle: "Live Physical Room Status (Front Desk & Housekeeping)",
    statusReady: "Clean · Ready",
    statusOccupied: "Occupied",
    statusDirty: "Cleaning",
    statusMaintenance: "Maintenance",
    markReadyBtn: "Mark Clean",
    markDirtyBtn: "Mark Dirty",
    markMaintBtn: "Set Maintenance",
    reopenRoomBtn: "Reopen Unit",
    searchRoomPlaceholder: "Filter by room # (e.g. 116, 201)...",
  },
  bidding: {
    pageTitle: "Bidding Management & AutoBid Rules",
    pageSubtitle:
      "Respond to live traveler room requests with tailored offers and configure 24/7 automatic pricing guardrails.",
    kpiOpenRequests: "Awaiting Offer",
    kpiSentOffers: "Offers Pending Guest",
    kpiAccept30d: "30-Day Win Rate",
    kpiAutoBidActive: "AutoBid Coverage",
    liveQueueTitle: "Live Traveler Room Requests Queue",
    liveQueueEmpty: "No traveler requests match this filter.",
    filterWaiting: "Waiting Offer",
    filterSent: "Offer Sent",
    filterPassed: "Passed",
    guestBudgetLabel: "Traveler Target",
    suggestedRateLabel: "Recommended Win Rate",
    sendOfferBtn: "Send Offer Now",
    passRequestBtn: "Pass",
    offerSentBadge: "Offer Submitted",
    passedBadge: "Passed",
    expiresInPrefix: "Expires in",
    minutesUnit: "min",
    offerModalTitle: "Submit Tailored Room Offer",
    offerFieldRate: "Offer Rate per Night (VND)",
    offerFloorWarning:
      "Note: Entered rate is below this property's configured safe floor price.",
    offerFieldPerks: "Included Perks to Boost Acceptance",
    offerEstNetTotal: "Estimated Net Hotel Payout",
    confirmSendOfferBtn: "Submit Offer to Traveler",
    autoBidSectionTitle: "24/7 AutoBid Guardrail Rules by Property",
    autoBidSectionSub:
      "Automatically answers incoming traveler requests within 20–30 seconds while strictly respecting your floor rate.",
    ruleEnabledLabel: "24/7 AutoBid Active",
    ruleNightBoostLabel: "Overnight Priority (22:00–06:00)",
    ruleFloorLabel: "Safe Floor Rate",
    ruleMaxDiscountLabel: "Max Discount vs Standard",
    editRuleBtn: "Configure Rule",
    historyTitle: "Recent Bidding Outcome Log",
    modeAuto: "AutoBid",
    modeManual: "Manual",
  },
  messages: {
    pageTitle: "Guest Messages & Stay Concierge",
    pageSubtitle:
      "Reply to parking, extra towel, airport transfer, and corporate billing inquiries linked directly to reservations.",
    kpiTotalThreads: "Total Threads",
    kpiUnread: "Unread Inquiries",
    kpiReplied: "Replied",
    kpiAvgResponse: "Avg Response Speed",
    avgResponseValue: "4 mins",
    filterUnread: "Unread",
    filterReplied: "Replied",
    searchPlaceholder: "Search guest name or booking # (#71)...",
    emptyInboxTitle: "No guest messages for this property yet",
    emptyInboxDesc:
      "Traveler questions regarding check-in times or room requests will appear here automatically.",
    quickReplyHeading: "Front-Desk Quick Reply Templates:",
    replyPlaceholder: "Write a helpful reply to the guest...",
    sendReplyBtn: "Send Reply",
    markReadBtn: "Mark as Read",
    markUnreadBtn: "Mark Unread",
    viewLinkedBookingBtn: "View Booking Slip",
    senderGuest: "Traveler",
    senderHotel: "Hotel Front Desk",
  },
  marketing: {
    dealsPageTitle: "Marketing · Last-Minute Deals",
    dealsPageSubtitle:
      "Fill unsold evening inventory with capped daily flash allocations that protect brand rate integrity.",
    upsellPageTitle: "Marketing · Room Upsell Offers",
    upsellPageSubtitle:
      "Grow net stay value with ocean-suite upgrades, guaranteed late check-out, breakfast, and private airport pickups.",
    tabFlashDeals: "Last-Minute Deals",
    tabRoomUpsell: "Room Upsell Offers",
    kpiActiveCampaigns: "Active Campaigns",
    kpiPromoRoomsSold: "Promo Room-Nights (30d)",
    kpiFlashRevenue: "Flash Deal Revenue",
    kpiUpsellRevenue: "30d Add-on Revenue",
    createDealBtn: "+ New Last-Minute Deal",
    createUpsellBtn: "+ New Upsell Offer",
    quotaLabel: "Daily Quota",
    sold30dLabel: "Sold (30d)",
    orders30dLabel: "Guest Orders",
    revenue30dLabel: "30d Net Revenue",
    dealModalTitle: "Create Last-Minute Deal Campaign",
    upsellModalTitle: "Create Room Upsell or Add-on Package",
    fieldTitle: "Guest-Facing Offer Title",
    fieldDiscountPct: "Discount Percentage (%)",
    fieldOriginalRate: "Original Room Rate (VND/night)",
    fieldDailyQuota: "Max Rooms Allocated per Day",
    fieldAddOnPrice: "Add-on Price (VND)",
    categoryUpgrade: "Suite Room Upgrade",
    categoryEarlyLate: "Early Check-in / Late Check-out",
    categoryDining: "Breakfast & Dining",
    categoryTransfer: "Airport Transfer",
  },
  session: {
    modalTitle: "Shift Handover & Session Account",
    modalSubtitle:
      "Switch operational shift profile (Property Manager vs Front-Desk Receptionist) or sign out safely.",
    shiftRoleHeading: "Switch Active Staff Role",
    managerPermNote: "Full Access: Manage settlement bank accounts, floor-rate guardrails, early payouts, and campaigns.",
    receptionistPermNote: "Front-Desk Ops: Manage room calendar, housekeeping status, guest messages, and live offers.",
    signOutBtn: "Sign Out of Session",
    stayWorkingBtn: "Continue Working",
    signedOutTitle: "Signed Out of Optibide Partner Hub",
    signedOutSubtitle:
      "Your partner session is locked safely. Click below to sign back in to the hotel operations console.",
    signBackInBtn: "Sign Back In to Partner Hub",
  },
};

const KO_MODULES_COPY: HubModulesCopy = {
  common: {
    saveBtn: "변경사항 저장",
    cancelBtn: "취소",
    closeBtn: "닫기",
    editBtn: "수정",
    savedToast: "변경 사항이 저장되어 데이터에 즉시 반영되었습니다.",
    roleRestrictedNotice:
      "프런트 매니저 계정은 조회 전용입니다 — 정산 계좌 및 최소 요금 수정은 호텔 지배인 역할로 전환해 주세요.",
    allFilter: "전체",
    activeBadge: "진행 중",
    pausedBadge: "일시중지",
    perNightSuffix: "/ 1박",
    perStaySuffix: "/ 투숙당",
    roomPrefix: "객실",
    floorPrefix: "층",
    nightsUnit: "박",
    guestsUnit: "명",
  },
  calendar: {
    pageTitle: "예약 캘린더 및 객실 배정표",
    pageSubtitle:
      "일별 입·퇴실 현황을 한눈에 확인하고, 예약 전표 열람 및 일자별 객실 판매 잠금/오픈을 즉시 처리하세요.",
    windowCurrent7d: "집중 7일 보기 (11.04 – 11.10)",
    windowExtended14d: "14일 전체 일정 (11.01 – 11.14)",
    windowPast7d: "지난주 내역 (10.28 – 11.03)",
    kpiArrivalsToday: "오늘 체크인",
    kpiInHouse: "현재 투숙 객실",
    kpiBlockedRooms: "점검 / 홀드 객실",
    kpiOccupancy7d: "기간 객실 가동률",
    tapeTitle: "일자별 객실 배정 타임라인",
    tapeHint:
      "초록색 예약 바를 클릭하면 상세 전표가 열리며, 빈 칸이나 잠금 칸을 눌러 객실 홀드/오픈을 설정할 수 있습니다.",
    legendBooked: "결제 확정 예약",
    legendAvailable: "판매 가능",
    legendBlocked: "설비 점검 / 현장 홀드",
    todayBadge: "오늘",
    colRoomUnit: "호수 및 객실 타입",
    freeCellAction: "가능",
    blockModalTitle: "일자별 객실 잠금 / 현장 홀드 설정",
    blockModalSubtitle:
      "설비 점검 또는 현장 단체 예약 일자에 중복 자동 입찰이 발송되지 않도록 보호합니다.",
    blockFieldReason: "잠금 / 홀드 사유",
    blockTypeMaint: "정기 설비 점검",
    blockTypeHold: "프런트 현장 예약 홀드",
    blockConfirmBtn: "선택 일자 잠금 확인",
    unblockBtn: "해당 일자 다시 오픈",
    frontDeskTitle: "프런트 운영 현황 — 금일 입실 및 투숙 목록",
    frontDeskEmpty: "선택한 기간 및 지점에 예정된 투숙 내역이 없습니다.",
    stayArrivingToday: "오늘 체크인",
    stayInHouse: "투숙 중",
    stayCheckedOut: "체크아웃 완료",
  },
  payout: {
    pageTitle: "정산 내역 및 수익 대사",
    pageSubtitle:
      "확정 예약별 실수령 금액, 은행 이체 일정 및 지점별 수취 계좌를 100% 투명하게 관리합니다.",
    kpiTotalReconciled: "총 정산 대상 수익",
    kpiPaidBank: "입금 완료 합계",
    kpiProcessing: "이체 진행 중",
    kpiUpcoming: "차기 정산 예정",
    bankSectionTitle: "지점별 정산 수취 계좌",
    bankVerifiedBadge: "명의 인증 완료",
    editBankBtn: "계좌 정보 수정",
    bankModalTitle: "정산 수취 계좌 정보 업데이트",
    bankFieldName: "은행 및 지점명",
    bankFieldAccount: "계좌 번호",
    bankFieldHolder: "예금주명",
    batchesTitle: "정산 주기별 명세서 및 이체 현황",
    batchesEmpty:
      "아직 생성된 정산 명세서가 없습니다 — 첫 확정 예약이 완료되면 자동으로 정산 주기에 집계됩니다.",
    filterPaid: "입금 완료",
    filterProcessing: "처리 중",
    filterUpcoming: "정산 예정",
    statusPaid: "입금 완료",
    statusProcessing: "은행 처리 중",
    statusUpcoming: "정산 예정",
    colCycle: "정산 코드",
    colProperty: "지점",
    colPeriod: "집계 기간",
    colBookingsCount: "예약 수",
    colNetAmount: "호텔 실수령액",
    colPayoutDate: "입금 일자",
    colStatus: "상태",
    colAction: "관리",
    viewStatementBtn: "명세서 보기",
    requestEarlyPayoutBtn: "조기 정산 요청",
    earlyPayoutTriggeredToast: "조기 정산 요청이 파트너 정산팀에 접수되었습니다.",
    statementModalTitle: "정산 주기별 상세 명세 전표",
    statementBankRef: "은행 이체 번호",
  },
  rooms: {
    pageTitle: "객실 타입 및 하우스키핑 관리",
    pageSubtitle:
      "객실 타입별 기준 요금·최소 방어 요금을 설정하고 전체 호수의 실시간 청소/점검 상태를 관리하세요.",
    kpiTotalUnits: "전체 객실 수",
    kpiReady: "정비 완료 (공실)",
    kpiOccupied: "투숙 중",
    kpiDirty: "청소 대기",
    kpiMaintenance: "설비 점검 중",
    categoriesTitle: "객실 타입 및 최소 방어 요금 설정",
    colRoomType: "객실 타입",
    colCapacity: "기준/최대 인원",
    colStandardRate: "정상 기준 요금",
    colSafeFloorRate: "최소 방어 요금",
    colBiddingToggle: "입찰 오픈",
    editRateBtn: "요금 수정",
    rateModalTitle: "객실 기준 요금 및 최소 방어 요금 설정",
    rateFieldStandard: "정상 기준 요금 (VND/1박)",
    rateFieldFloor: "수익 보호 최소 요금 (VND/1박)",
    unitsGridTitle: "호수별 실시간 객실 상태 (프런트 & 하우스키핑)",
    statusReady: "입실 가능",
    statusOccupied: "투숙 중",
    statusDirty: "청소 필요",
    statusMaintenance: "점검 잠금",
    markReadyBtn: "청소 완료",
    markDirtyBtn: "청소 요청",
    markMaintBtn: "점검 전환",
    reopenRoomBtn: "판매 재개",
    searchRoomPlaceholder: "객실 호수 검색 (예: 116, 201)...",
  },
  bidding: {
    pageTitle: "입찰 관리 및 24시간 자동 입찰",
    pageSubtitle:
      "실시간 고객 객실 요청에 맞춤 제안을 발송하고 지점별 자동 응답 하한선 규칙을 관리합니다.",
    kpiOpenRequests: "제안 대기 요청",
    kpiSentOffers: "고객 선택 대기",
    kpiAccept30d: "30일 수락률",
    kpiAutoBidActive: "자동 입찰 가동",
    liveQueueTitle: "실시간 투숙객 객실 요청 대기열",
    liveQueueEmpty: "선택한 필터에 해당하는 요청이 없습니다.",
    filterWaiting: "제안 대기",
    filterSent: "발송 완료",
    filterPassed: "패스함",
    guestBudgetLabel: "고객 희망 예산",
    suggestedRateLabel: "수락 유망 추천가",
    sendOfferBtn: "맞춤 제안 발송",
    passRequestBtn: "건너뛰기",
    offerSentBadge: "제안 발송됨",
    passedBadge: "건너뜀",
    expiresInPrefix: "마감",
    minutesUnit: "분 전",
    offerModalTitle: "투숙객 맞춤 객실 제안 발송",
    offerFieldRate: "1박당 제안 요금 (VND)",
    offerFloorWarning: "주의: 입력한 요금이 지점 최소 방어 요금보다 낮습니다.",
    offerFieldPerks: "수락률을 높이는 포함 혜택 선택",
    offerEstNetTotal: "예상 호텔 실수령 합계",
    confirmSendOfferBtn: "제안 확정 발송",
    autoBidSectionTitle: "지점별 24시간 자동 입찰 보호 규칙",
    autoBidSectionSub:
      "야간 및 피크 시간에도 설정된 최소 방어 요금 이상으로만 20~30초 내 즉시 자동 응답합니다.",
    ruleEnabledLabel: "24시간 자동 입찰",
    ruleNightBoostLabel: "심야 자동 응대 강화 (22~06시)",
    ruleFloorLabel: "최소 방어 요금",
    ruleMaxDiscountLabel: "최대 할인 한도",
    editRuleBtn: "규칙 설정",
    historyTitle: "최근 입찰 발송 이력",
    modeAuto: "자동",
    modeManual: "수동",
  },
  messages: {
    pageTitle: "투숙객 메시지 및 컨시어지 응대",
    pageSubtitle:
      "예약 번호와 연동된 주차, 추가 타월, 공항 픽업 및 법인 영수증 문의에 신속하게 답변하세요.",
    kpiTotalThreads: "전체 대화방",
    kpiUnread: "미확인 문의",
    kpiReplied: "답변 완료",
    kpiAvgResponse: "평균 응답 시간",
    avgResponseValue: "4분",
    filterUnread: "미확인",
    filterReplied: "답변 완료",
    searchPlaceholder: "고객명 또는 예약번호(#71) 검색...",
    emptyInboxTitle: "해당 지점에 수신된 고객 메시지가 없습니다",
    emptyInboxDesc:
      "투숙객이 체크인 시간이나 추가 요청 사항을 보내면 이곳에 즉시 표시됩니다.",
    quickReplyHeading: "프런트 빠른 답변 템플릿:",
    replyPlaceholder: "고객에게 보낼 안내 메시지를 입력하세요...",
    sendReplyBtn: "답변 전송",
    markReadBtn: "읽음 처리",
    markUnreadBtn: "안읽음 전환",
    viewLinkedBookingBtn: "예약 전표 보기",
    senderGuest: "투숙객",
    senderHotel: "호텔 프런트",
  },
  marketing: {
    dealsPageTitle: "마케팅 · 마감 특가 프로모션",
    dealsPageSubtitle:
      "당일 잔여 객실을 일일 한정 수량 타임세일로 전환하여 객실 가동률을 높이세요.",
    upsellPageTitle: "마케팅 · 객실 업그레이드 및 부가 혜택",
    upsellPageSubtitle:
      "오션뷰 스위트 업그레이드, 레이트 체크아웃, 조식 및 공항 픽업 옵션으로 예약당 수익을 확대하세요.",
    tabFlashDeals: "마감 특가 프로모션",
    tabRoomUpsell: "객실 업그레이드 혜택",
    kpiActiveCampaigns: "진행 중 캠페인",
    kpiPromoRoomsSold: "프로모션 판매 박수",
    kpiFlashRevenue: "마감 특가 수익",
    kpiUpsellRevenue: "30일 부가 옵션 수익",
    createDealBtn: "+ 신규 마감 특가 등록",
    createUpsellBtn: "+ 업그레이드 옵션 추가",
    quotaLabel: "일일 배정 객실",
    sold30dLabel: "30일 판매량",
    orders30dLabel: "선택 건수",
    revenue30dLabel: "30일 순수익 기여",
    dealModalTitle: "신규 마감 특가 프로모션 만들기",
    upsellModalTitle: "객실 업그레이드 / 부가 서비스 패키지 추가",
    fieldTitle: "고객 노출 프로모션 제목",
    fieldDiscountPct: "할인율 (%)",
    fieldOriginalRate: "정상 기준 요금 (VND/1박)",
    fieldDailyQuota: "일일 최대 판매 객실 수",
    fieldAddOnPrice: "추가 요금 (VND)",
    categoryUpgrade: "상위 객실 업그레이드",
    categoryEarlyLate: "얼리 체크인 / 레이트 체크아웃",
    categoryDining: "조식 & 다이닝",
    categoryTransfer: "공항 전용 픽업/샌딩",
  },
  session: {
    modalTitle: "근무 교대 및 세션 계정 관리",
    modalSubtitle:
      "운영 역할(호텔 지배인 / 프런트 매니저)을 전환하거나 현재 근무 세션을 안전하게 로그아웃합니다.",
    shiftRoleHeading: "근무자 권한 역할 전환",
    managerPermNote: "전체 권한: 정산 수취 계좌, 최소 방어 요금, 조기 정산 및 프로모션 설정 가능.",
    receptionistPermNote: "프런트 운영: 예약 캘린더, 객실 청소 상태, 고객 메시지 및 실시간 제안 발송.",
    signOutBtn: "근무 세션 로그아웃",
    stayWorkingBtn: "계속 업무하기",
    signedOutTitle: "Optibide 파트너 허브에서 로그아웃되었습니다",
    signedOutSubtitle:
      "호텔 운영 세션이 안전하게 보호되었습니다. 아래 버튼을 눌러 대시보드로 다시 로그인하세요.",
    signBackInBtn: "파트너 허브 다시 로그인",
  },
};

export function getModulesDictionary(locale: AppLocale): HubModulesCopy {
  if (locale === "en") return EN_MODULES_COPY;
  if (locale === "ko") return KO_MODULES_COPY;
  return VI_MODULES_COPY;
}
