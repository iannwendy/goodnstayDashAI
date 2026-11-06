#!/usr/bin/env python3
"""
Generates normalized Master Data JSON tables (v2.6 Full Lifecycle, 10-Min Payment Seat-Lock,
Multi-Entity State Machines & Reject Taxonomy) for goodNstay Partner Auction Dashboard v2,
plus clean seed backup copies in master-data/seed/.
"""

import json
import os
import shutil
from datetime import date, timedelta

BASE_DIR = "/Users/iannwendy/Desktop/goodNstay/dashboard/partner-auction-dashboard-v2/master-data"
SEED_DIR = os.path.join(BASE_DIR, "seed")
os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(SEED_DIR, exist_ok=True)

GUEST_MULTIPLIER = 1.265  # Base * 1.15 (15% platform fee) * 1.10 (10% VAT)


def calc_guest_total(base_amount: int) -> int:
    return round(base_amount * GUEST_MULTIPLIER)


# 1. HOTEL PROFILE (v2.6 — includes 10-minute / 600s Payment Seat-Lock TTL)
hotel_profile = {
    "hotelId": "HTL-DN-024",
    "brandName": "goodNstay",
    "brandSuffix": "Partner Studio",
    "version": "v2.6",
    "hotelName": "L'amour Boutique Hotel",
    "starRating": 4,
    "totalRooms": 30,
    "city": "Đà Nẵng",
    "district": "Phường Phước Mỹ, Quận Sơn Trà",
    "referenceDate": "2026-11-06",
    "currentDateLabel": "Thứ Sáu, 06/11/2026",
    "currentShortDate": "06/11/2026 • 19:45",
    "goldenWindowRange": "06/11 – 19/11/2026",
    "goldenWindowDays": 14,
    "bidTtlSeconds": 3600,
    "paymentHoldTtlSeconds": 600,
    "urgentThresholdSeconds": 600,
    "warnThresholdSeconds": 1800,
    "hotelCommissionRate": 0.0,
    "platformFeeRate": 0.15,
    "vatRate": 0.10,
    "guestPriceMultiplier": 1.265,
    "defaultFloorPrice": 750000,
    "nightFlashDiscountPct": 15,
    "nightFlashStartHour": "20:00",
    "autoBidMaxRooms": 4,
    "autoBidMaxGuests": 8,
    "autoBidEnabled": True,
    "nightFlashSaleActive": False,
    "eloScore": 1680,
    "eloTier": "Hạng Vàng (Top 12% Đà Nẵng)",
    "reviewRating5": 4.8,
    "reviewCount": 142,
    "reviewCriteria5": {
        "roomComfortCleanliness": 4.9,
        "staffHospitality": 4.8,
        "checkinExperience": 4.8,
        "amenitiesExpectation": 4.7,
        "valueForMoney": 4.8,
    },
    "payoutInfo": {
        "gateway": "NHN KCP Escrow (kcp.co.kr)",
        "settlementCycle": "Đối soát T+7 sau Check-out",
        "nextPayoutDate": "13/11/2026",
        "beneficiaryBank": "Vietcombank ••8829 (CTCP L'amour Boutique)",
    },
    "eveningForecast": {
        "expectedRequestsMin": 6,
        "expectedRequestsMax": 9,
        "potentialBaseRevenueMin": 5200000,
        "potentialBaseRevenueMax": 8400000,
    },
}

# 2. USERS & ROLES (RBAC)
users_roles = [
    {
        "userId": "USR-MGR-01",
        "role": "manager",
        "name": "Nguyễn Minh Quân",
        "roleTitle": "Quản lý Doanh thu (Chủ KS)",
        "initials": "MQ",
        "canOverrideFloor": True,
        "canConfigureBotRules": True,
        "shift": "Ca điều hành • Toàn quyền duyệt giá dưới sàn & quy tắc Auto-Bid",
    },
    {
        "userId": "USR-REC-02",
        "role": "receptionist",
        "name": "Trần Thảo Vy",
        "roleTitle": "Lễ tân Ca tối (15:00–23:00)",
        "initials": "TV",
        "canOverrideFloor": False,
        "canConfigureBotRules": False,
        "shift": "Ca tối • Khóa cứng dưới giá sàn bảo vệ",
    },
]

# 3. PERKS CATALOG
perks_catalog = [
    {
        "id": "perk_bf",
        "label": "Miễn phí Buffet sáng 2 khách",
        "unitCostVnd": 90000,
        "costEstimate": "Chi phí bếp ~90.000đ • Giữ nguyên giá phòng công khai",
        "winBoostPct": 22,
        "compensatesAmenity": "Bữa sáng",
        "matchScoreRecovery": 8,
        "defaultChecked": True,
    },
    {
        "id": "perk_late",
        "label": "Miễn phí Trả phòng trễ đến 14:00",
        "unitCostVnd": 0,
        "costEstimate": "Chi phí 0đ nếu phòng trống đầu giờ chiều mai",
        "winBoostPct": 14,
        "compensatesAmenity": "Trả phòng trễ",
        "matchScoreRecovery": 6,
        "defaultChecked": False,
    },
    {
        "id": "perk_tea",
        "label": "Set Trà chiều & Trái cây chào mừng",
        "unitCostVnd": 55000,
        "costEstimate": "Chi phí F&B ~55.000đ • Tăng mạnh cảm nhận 4 sao",
        "winBoostPct": 11,
        "compensatesAmenity": "Bồn tắm / View",
        "matchScoreRecovery": 5,
        "defaultChecked": False,
    },
    {
        "id": "perk_pickup",
        "label": "Ưu đãi 50% Xe đón Sân bay Đà Nẵng",
        "unitCostVnd": 70000,
        "costEstimate": "Hỗ trợ 70.000đ chuyến đón • Rất hợp khách Hàn/Nội địa bay tối",
        "winBoostPct": 16,
        "compensatesAmenity": "Đưa đón sân bay",
        "matchScoreRecovery": 6,
        "defaultChecked": False,
    },
]

# 4. ROOM CLASSES (4 classes = 30 rooms total)
room_classes = [
    {
        "id": "sup",
        "name": "Superior Double",
        "category": "Superior",
        "roomRange": "#101–#110",
        "totalRooms": 10,
        "rackRate": 1150000,
        "baseFloorPrice": 750000,
        "bedAndCapacity": "1 Giường đôi Queen • 2 người lớn",
        "hasBathtub": False,
        "includedAmenities": ["Wifi", "Tiện ích phòng", "Thang máy"],
    },
    {
        "id": "dlx",
        "name": "Deluxe Twin City View",
        "category": "Deluxe",
        "roomRange": "#111–#120",
        "totalRooms": 10,
        "rackRate": 1450000,
        "baseFloorPrice": 920000,
        "bedAndCapacity": "2 Giường đơn Twin • 2 người lớn",
        "hasBathtub": False,
        "includedAmenities": ["Bữa sáng", "Wifi", "Hồ bơi", "Bãi đậu xe"],
    },
    {
        "id": "fsuite",
        "name": "Family Connecting Suite",
        "category": "Suite",
        "roomRange": "#121–#126",
        "totalRooms": 6,
        "rackRate": 2250000,
        "baseFloorPrice": 1550000,
        "bedAndCapacity": "2 Giường lớn thông phòng • 4 người lớn",
        "hasBathtub": True,
        "includedAmenities": ["Bữa sáng", "Wifi", "Hồ bơi", "Bồn tắm", "Bãi đậu xe"],
    },
    {
        "id": "osuite",
        "name": "Executive Ocean Suite",
        "category": "Executive",
        "roomRange": "#127–#130",
        "totalRooms": 4,
        "rackRate": 2650000,
        "baseFloorPrice": 1850000,
        "bedAndCapacity": "1 Giường King trực diện biển • 2 người lớn",
        "hasBathtub": True,
        "includedAmenities": ["Bữa sáng", "Wifi", "Hồ bơi", "Bồn tắm", "Trả phòng trễ", "Truyền hình (OTT)"],
    },
]

# 5. ROOMS PMS (30 physical rooms #101-#130 for tonight 2026-11-06 — 4 Canonical States)
# Counts on 06/11/2026:
# - sup (10): 5 booked_other, 2 booked_auction (#106 CRQ-8939, #107 CRQ-8921), 3 vacant_unlocked (#108-#110)
# - dlx (10): 5 booked_other, 3 booked_auction (#116 CRQ-8940, #117 CRQ-8936, #118 CRQ-8915), 2 vacant_unlocked (#119-#120)
# - fsuite (6): 4 booked_other, 2 booked_auction (#125 CRQ-8938, #126 CRQ-8904), 0 vacant_unlocked (SOLD OUT!)
# - osuite (4): 2 booked_other, 1 booked_auction (#129 CRQ-8934), 1 payment_hold (#130 held 10m by CRQ-8944 -> blocks CRQ-8942!)
# Totals: 16 booked_other + 8 booked_auction + 1 payment_hold + 5 vacant_unlocked = 30 rooms!
rooms_pms = []
other_sources = ["Booking.com", "Agoda", "Walk-in / Doanh nghiệp", "Traveloka"]

# Superior #101-#110
for idx, rno in enumerate(range(101, 111)):
    if idx < 5:
        st, ch, req = "booked_other", other_sources[idx % len(other_sources)], None
    elif idx == 5:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8939"
    elif idx == 6:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8921"
    else:
        st, ch, req = "vacant_unlocked", "Trống • Mở đấu giá", None
    rooms_pms.append({
        "roomNumber": rno,
        "floor": 1 if rno <= 105 else 2,
        "roomClassId": "sup",
        "roomClass": "Superior Double",
        "category": "Superior",
        "status": st,
        "sourceChannel": ch,
        "linkedReqId": req,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkOutTomorrow": idx in (0, 2, 6),
    })

# Deluxe #111-#120
for idx, rno in enumerate(range(111, 121)):
    if idx < 5:
        st, ch, req = "booked_other", other_sources[(idx + 1) % len(other_sources)], None
    elif idx == 5:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8940"
    elif idx == 6:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8936"
    elif idx == 7:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8915"
    else:
        st, ch, req = "vacant_unlocked", "Trống • Mở đấu giá", None
    rooms_pms.append({
        "roomNumber": rno,
        "floor": 3 if rno <= 115 else 4,
        "roomClassId": "dlx",
        "roomClass": "Deluxe Twin City View",
        "category": "Deluxe",
        "status": st,
        "sourceChannel": ch,
        "linkedReqId": req,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkOutTomorrow": idx in (1, 4, 7),
    })

# Family Suite #121-#126
for idx, rno in enumerate(range(121, 127)):
    if idx < 4:
        st, ch, req = "booked_other", other_sources[idx % len(other_sources)], None
    elif idx == 4:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8938"
    else:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8904"
    rooms_pms.append({
        "roomNumber": rno,
        "floor": 5,
        "roomClassId": "fsuite",
        "roomClass": "Family Connecting Suite",
        "category": "Suite",
        "status": st,
        "sourceChannel": ch,
        "linkedReqId": req,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkOutTomorrow": idx in (0, 5),
    })

# Executive Ocean Suite #127-#130 (#130 is in 10-minute Movie-Seat Payment Hold for CRQ-8944!)
for idx, rno in enumerate(range(127, 131)):
    hold_rem = None
    hold_tot = None
    if idx < 2:
        st, ch, req = "booked_other", other_sources[idx], None
    elif idx == 2:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8934"
    else:
        st, ch, req = "payment_hold", "Tạm khóa chờ TT (10p)", "CRQ-8944"
        hold_rem = 495  # 08:15 remaining out of 10:00 (600s)
        hold_tot = 600
    rooms_pms.append({
        "roomNumber": rno,
        "floor": 6,
        "roomClassId": "osuite",
        "roomClass": "Executive Ocean Suite",
        "category": "Executive",
        "status": st,
        "sourceChannel": ch,
        "linkedReqId": req,
        "holdRemainingSeconds": hold_rem,
        "holdTotalSeconds": hold_tot,
        "checkOutTomorrow": idx == 2,
    })

# 6. 14-DAY INVENTORY CALENDAR (06/11/2026 - 19/11/2026) with 4-State Breakdown
weekday_vn = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]
cal_rows_plan = [
    # (offset, otherBooked, auctionBooked, paymentHoldRooms, policyShort, linkedReqId)
    (0, 16, 8, 1, "Đang tạm khóa #130 chờ TT 10p (#CRQ-8944) • Xả đêm sau 20h00", "CRQ-8944"),
    (1, 18, 6, 1, "Đêm 2 giữ tạm #130 (#CRQ-8944) • Cuối tuần cầu cao (+15% sàn)", "CRQ-8942"),
    (2, 17, 5, 0, "Chủ nhật trả phòng đông • Kèm ưu đãi Late Check-out", "CRQ-8942"),
    (3, 13, 4, 0, "Đầu tuần vắng • Bật Auto-Bid phản hồi <1 phút", "CRQ-8943"),
    (4, 12, 4, 0, "Ưu tiên lấp nền công suất Superior & Deluxe", None),
    (5, 14, 3, 0, "Tặng Buffet sáng giữ giá gốc không đổi", None),
    (6, 15, 3, 0, "Bám sát giá TB toàn sàn Đà Nẵng", None),
    (7, 19, 3, 0, "Thứ 6 tuần tới • Chỉ nhận báo giá ≥ 950k", None),
    (8, 21, 2, 0, "Thứ 7 cao điểm • Ưu tiên đơn từ 2 đêm trở lên", None),
    (9, 16, 2, 0, "Mở rộng chào giá hạng Suite gia đình", None),
    (10, 13, 1, 0, "Thăm dò sớm • Giữ mức chiết khấu nhẹ 5–8%", None),
    (11, 12, 1, 0, "Giữ giá chuẩn • Không hạ sâu xa ngày", None),
    (12, 11, 1, 0, "Bán song song OTA giá BAR + Đấu giá chọn lọc", None),
    (13, 10, 0, 0, "Ngoài 13 ngày • Bảo vệ Rate Parity tuyệt đối", None),
]
start_ref = date(2026, 11, 6)
calendar_14d_pms = []
for offset, other_b, auc_b, hold_b, policy, lreq in cal_rows_plan:
    d = start_ref + timedelta(days=offset)
    vacant_r = 30 - (other_b + auc_b + hold_b)
    calendar_14d_pms.append({
        "dayOffset": offset,
        "isoDate": d.isoformat(),
        "dateStr": d.strftime("%d/%m"),
        "fullDate": d.strftime("%d/%m/%Y"),
        "dayLabel": "Hôm nay" if offset == 0 else ("Ngày mai" if offset == 1 else weekday_vn[d.weekday()]),
        "totalRooms": 30,
        "otherBooked": other_b,
        "auctionBooked": auc_b,
        "paymentHoldRooms": hold_b,
        "vacantRooms": vacant_r,
        "policyShort": policy,
        "linkedReqId": lreq,
    })

# 7. SYSTEM BENCHMARKS & PERIOD BASELINES
system_benchmarks = {
    "regionName": "Đà Nẵng",
    "periodsMeta": {
        "today": {
            "shortLabel": "Hôm nay",
            "rangeText": "06/11/2026",
            "startDate": "2026-11-06",
            "endDate": "2026-11-06",
            "previousNetRevenue": 10350000,
            "platformWinRatePct": 36.5,
        },
        "7d": {
            "shortLabel": "7 ngày",
            "rangeText": "31/10 – 06/11/2026",
            "startDate": "2026-10-31",
            "endDate": "2026-11-06",
            "previousNetRevenue": 25200000,
            "platformWinRatePct": 36.2,
        },
        "30d": {
            "shortLabel": "30 ngày",
            "rangeText": "08/10 – 06/11/2026",
            "startDate": "2026-10-08",
            "endDate": "2026-11-06",
            "previousNetRevenue": 54600000,
            "platformWinRatePct": 35.8,
        },
    },
    "roomClassBenchmarks": [
        {
            "roomClassId": "sup",
            "category": "Superior",
            "roomName": "Superior Double",
            "systemAvgWinRatePct": {"today": 39.0, "7d": 38.5, "30d": 38.2},
            "systemTotalWinsRegion": {"today": 18, "7d": 84, "30d": 310},
            "systemAvgBasePrice": 840000,
        },
        {
            "roomClassId": "dlx",
            "category": "Deluxe",
            "roomName": "Deluxe Twin City View",
            "systemAvgWinRatePct": {"today": 37.5, "7d": 36.8, "30d": 36.4},
            "systemTotalWinsRegion": {"today": 16, "7d": 76, "30d": 285},
            "systemAvgBasePrice": 1080000,
        },
        {
            "roomClassId": "fsuite",
            "category": "Suite",
            "roomName": "Family Connecting Suite",
            "systemAvgWinRatePct": {"today": 33.0, "7d": 32.5, "30d": 32.0},
            "systemTotalWinsRegion": {"today": 8, "7d": 38, "30d": 140},
            "systemAvgBasePrice": 1820000,
        },
        {
            "roomClassId": "osuite",
            "category": "Executive",
            "roomName": "Executive Ocean Suite",
            "systemAvgWinRatePct": {"today": 31.0, "7d": 30.8, "30d": 30.5},
            "systemTotalWinsRegion": {"today": 7, "7d": 32, "30d": 120},
            "systemAvgBasePrice": 2050000,
        },
    ],
    "lossReasonsCatalog": [
        {
            "id": "price_high",
            "shortName": "Giá gốc cao hơn đối thủ",
            "color": "#e11d48",
            "actionHint": "Giảm nhẹ 5–8% hoặc tặng Buffet sáng cho hạng Suite",
        },
        {
            "id": "slow_response",
            "shortName": "Phản hồi chậm / Hết 60p",
            "color": "#f59e0b",
            "actionHint": "Luôn bật Auto-Bid ca trưa & sau 22h00 đêm",
        },
        {
            "id": "missing_perk",
            "shortName": "Thiếu Bữa sáng / Late C/O",
            "color": "#6366f1",
            "actionHint": "Đính kèm đặc quyền mềm 0đ–90k khi độ khớp <90%",
        },
        {
            "id": "hold_expired_10m",
            "shortName": "Hết 10p giữ chỗ / Lỗi thẻ KCP",
            "color": "#d97706",
            "actionHint": "Hệ thống tự nhả khóa phòng sau 10p để đón khách kế tiếp",
        },
        {
            "id": "payment_abandoned",
            "shortName": "Khách thoát cổng TT sớm",
            "color": "#71717a",
            "actionHint": "Giữ giá gốc mềm để giảm sốc tổng giá ×1.265 bước cuối",
        },
    ],
}

# 8. AUCTION SESSIONS MASTER FACT TABLE
# Includes:
# - 5 Live Sessions demonstrating ALL active lifecycle & 10-min seat-lock states:
#     * CRQ-8944: LIVE + BID_SELECTED_PAYMENT_HOLD (holding room #130 for 10m, 08:15 remaining!)
#     * CRQ-8942: LIVE + BID_STANDBY_HOLD_CONFLICT (bid sent on Executive, blocked because #130 is held by CRQ-8944!)
#     * CRQ-8945: LIVE + BID_SENT (bid sent on Superior, 3 vacant rooms #108-#110 ready for 1-click 10m seat hold!)
#     * CRQ-8941: LIVE + OPEN_UNBID (Superior tonight, awaiting Quick Bid / Custom Bid / Auto-Bid / Partner Reject)
#     * CRQ-8943: LIVE + OPEN_UNBID (Deluxe 09/11-11/11, 5 vacant rooms on 09/11)
# - 68 Completed Bid Sessions in 30d (29 won + 39 non-won across rejected, payment_failed, expired)
# - 4 Non-Denominator System/Partner Closure Sessions (2 auto_closed + 2 partner_declined) for full audit trail!

auction_sessions = [
    # --- 5 ACTIVE LIVE SESSIONS ON 06/11/2026 ---
    {
        "id": "CRQ-8944",
        "status": "live",
        "requestStatus": "awaiting_payment",
        "bidStatus": "payment_hold_10m",
        "paymentStatus": "awaiting_hold_10m",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "19:42",
        "timeSlot": "evening_peak",
        "remainingSeconds": 2910,
        "holdRoomNumber": 130,
        "holdRemainingSeconds": 495,
        "holdTotalSeconds": 600,
        "checkInDateRange": "06/11 – 08/11 (Hôm nay • 2 đêm)",
        "checkInUrgent": True,
        "nights": 2,
        "roomsQty": 1,
        "guestsCount": 2,
        "guestSummary": "2 người lớn • Đổi khách sạn sát biển Mỹ Khê tối nay",
        "mandatoryRoomCategory": "Executive",
        "bedTag": "1 Giường King trực diện biển",
        "amenities": ["Bữa sáng", "Hồ bơi", "Truyền hình (OTT)", "Wifi"],
        "competitorsCount": 2,
        "matchedRoomClassId": "osuite",
        "matchedRoomName": "Executive Ocean Suite",
        "matchScore": 94,
        "aiSuggestedBasePrice": 1950000,
        "bidSubmitted": {
            "basePrice": 1950000,
            "perks": ["Miễn phí Buffet sáng 2 khách"],
            "submittedAtText": "Khách đã chọn lúc 19:43 · Đang khóa tạm #130 (10p)",
            "mode": "quick",
        },
    },
    {
        "id": "CRQ-8942",
        "status": "live",
        "requestStatus": "open",
        "bidStatus": "standby_hold_conflict",
        "paymentStatus": "not_started",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "19:31",
        "timeSlot": "evening_peak",
        "remainingSeconds": 1620,
        "holdRoomNumber": None,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkInDateRange": "07/11 – 09/11 (Ngày mai • 2 đêm)",
        "checkInUrgent": True,
        "nights": 2,
        "roomsQty": 1,
        "guestsCount": 2,
        "guestSummary": "2 người lớn (Khách Hàn Quốc) • Kỷ niệm ngày cưới",
        "mandatoryRoomCategory": "Executive",
        "bedTag": "1 Giường King trực diện biển",
        "amenities": ["Bữa sáng", "Hồ bơi", "Trả phòng trễ", "Wifi"],
        "competitorsCount": 3,
        "matchedRoomClassId": "osuite",
        "matchedRoomName": "Executive Ocean Suite",
        "matchScore": 96,
        "aiSuggestedBasePrice": 1980000,
        "bidSubmitted": {
            "basePrice": 1980000,
            "perks": ["Set Trà chiều & Trái cây chào mừng"],
            "submittedAtText": "Đã báo giá 19:33 · Tạm chặn TT do #130 đang khóa 10p",
            "mode": "custom",
        },
    },
    {
        "id": "CRQ-8945",
        "status": "live",
        "requestStatus": "open",
        "bidStatus": "bid_sent",
        "paymentStatus": "not_started",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "19:44",
        "timeSlot": "evening_peak",
        "remainingSeconds": 3180,
        "holdRoomNumber": None,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkInDateRange": "06/11 – 08/11 (Hôm nay • 2 đêm)",
        "checkInUrgent": True,
        "nights": 2,
        "roomsQty": 1,
        "guestsCount": 2,
        "guestSummary": "Cặp đôi Hà Nội • Nghỉ cuối tuần gần cầu Rồng / Mỹ Khê",
        "mandatoryRoomCategory": "Superior",
        "bedTag": "1 Giường đôi Queen",
        "amenities": ["Bữa sáng", "Wifi", "Thang máy"],
        "competitorsCount": 2,
        "matchedRoomClassId": "sup",
        "matchedRoomName": "Superior Double",
        "matchScore": 95,
        "aiSuggestedBasePrice": 810000,
        "bidSubmitted": {
            "basePrice": 810000,
            "perks": ["Miễn phí Buffet sáng 2 khách"],
            "submittedAtText": "Auto-Bid gửi lúc 19:44 · Chờ khách bấm giữ phòng 10p",
            "mode": "auto",
        },
    },
    {
        "id": "CRQ-8941",
        "status": "live",
        "requestStatus": "open",
        "bidStatus": "open_unbid",
        "paymentStatus": "not_started",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "19:38",
        "timeSlot": "evening_peak",
        "remainingSeconds": 1145,
        "holdRoomNumber": None,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkInDateRange": "06/11 – 07/11 (Hôm nay • 1 đêm)",
        "checkInUrgent": True,
        "nights": 1,
        "roomsQty": 1,
        "guestsCount": 2,
        "guestSummary": "2 người lớn • Nhận phòng sau 20h30 tối nay",
        "mandatoryRoomCategory": "Superior",
        "bedTag": "1 Giường đôi Queen",
        "amenities": ["Bữa sáng", "Wifi", "Thang máy"],
        "competitorsCount": 2,
        "matchedRoomClassId": "sup",
        "matchedRoomName": "Superior Double",
        "matchScore": 92,
        "aiSuggestedBasePrice": 820000,
    },
    {
        "id": "CRQ-8943",
        "status": "live",
        "requestStatus": "open",
        "bidStatus": "open_unbid",
        "paymentStatus": "not_started",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "19:40",
        "timeSlot": "evening_peak",
        "remainingSeconds": 2480,
        "holdRoomNumber": None,
        "holdRemainingSeconds": None,
        "holdTotalSeconds": None,
        "checkInDateRange": "09/11 – 11/11 (Thứ 2 tới • 2 đêm)",
        "checkInUrgent": False,
        "nights": 2,
        "roomsQty": 1,
        "guestsCount": 2,
        "guestSummary": "2 người lớn công tác • Cần xuất hóa đơn & bãi xe",
        "mandatoryRoomCategory": "Deluxe",
        "bedTag": "2 Giường đơn Twin",
        "amenities": ["Bữa sáng", "Wifi", "Bãi đậu xe"],
        "competitorsCount": 2,
        "matchedRoomClassId": "dlx",
        "matchedRoomName": "Deluxe Twin City View",
        "matchScore": 95,
        "aiSuggestedBasePrice": 1020000,
    },
]

# --- TODAY'S 5 PAID WINS ON 2026-11-06 (Sum Base = 11,850,000đ, Total Nights = 10 -> ADR = 1,185,000đ) ---
today_won_rows = [
    {
        "id": "CRQ-8940",
        "status": "won",
        "requestStatus": "completed",
        "bidStatus": "won",
        "paymentStatus": "captured_escrow",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "18:42",
        "dateTimeLabel": "06/11 • 18:42",
        "timeSlot": "evening_peak",
        "stayDatesLabel": "06/11–08/11 (2 đêm)",
        "guestRequestTitle": "2 người lớn • Nghỉ dưỡng cuối tuần",
        "amenitiesTags": ["Bữa sáng", "Hồ bơi", "Wifi"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Deluxe",
        "matchedRoomClassId": "dlx",
        "offeredRoom": "Deluxe Twin City View",
        "offeredBasePrice": 1050000,
        "hotelEarnedBase": 2100000,
        "guestPaidTotal": calc_guest_total(2100000),
        "medicalRefund": 0,
        "matchScore": 96,
        "bidMode": "auto",
        "responseMinutes": 0.8,
        "guestOpenedDetail": True,
        "closeMinutes": 2.4,
        "closeSpeedText": "02p 24s",
        "holdDurationSeconds": 135,
        "speedNote": {"text": "Giữ 10p → TT sau 2p15s", "tone": "fast"},
        "lockedRoomNumber": 116,
        "resultNote": "Giữ ghế 10p → KCP thu 100% • Khóa cứng #116",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8939",
        "status": "won",
        "requestStatus": "completed",
        "bidStatus": "won",
        "paymentStatus": "captured_escrow",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "16:15",
        "dateTimeLabel": "06/11 • 16:15",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–08/11 (2 đêm)",
        "guestRequestTitle": "2 người lớn • Chuyến bay chiều từ Hà Nội",
        "amenitiesTags": ["Wifi", "Thang máy"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Superior",
        "matchedRoomClassId": "sup",
        "offeredRoom": "Superior Double",
        "offeredBasePrice": 800000,
        "hotelEarnedBase": 1600000,
        "guestPaidTotal": calc_guest_total(1600000),
        "medicalRefund": 0,
        "matchScore": 94,
        "bidMode": "auto",
        "responseMinutes": 0.6,
        "guestOpenedDetail": True,
        "closeMinutes": 3.2,
        "closeSpeedText": "03p 12s",
        "holdDurationSeconds": 160,
        "speedNote": {"text": "TT KCP trong 2p40s", "tone": "fast"},
        "lockedRoomNumber": 106,
        "resultNote": "Đã TT 100% KCP Escrow • Khóa cứng #106",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8938",
        "status": "won",
        "requestStatus": "completed",
        "bidStatus": "won",
        "paymentStatus": "captured_escrow",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "14:08",
        "dateTimeLabel": "06/11 • 14:08",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–08/11 (2 đêm)",
        "guestRequestTitle": "Gia đình 4 người • Phòng thông nhau",
        "amenitiesTags": ["Bữa sáng", "Hồ bơi", "Bãi đậu xe"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Suite",
        "matchedRoomClassId": "fsuite",
        "offeredRoom": "Family Connecting Suite",
        "offeredBasePrice": 1700000,
        "hotelEarnedBase": 3400000,
        "guestPaidTotal": calc_guest_total(3400000),
        "medicalRefund": 0,
        "matchScore": 98,
        "bidMode": "manual",
        "responseMinutes": 4.2,
        "guestOpenedDetail": True,
        "closeMinutes": 5.5,
        "closeSpeedText": "05p 30s",
        "holdDurationSeconds": 210,
        "speedNote": {"text": "Khóa căn Suite cuối (#125)", "tone": "fast"},
        "lockedRoomNumber": 125,
        "resultNote": "Đã TT 100% • Khóa #125 & tự đóng #CRQ-8931",
        "autopsyId": "CRQ-8918",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8936",
        "status": "won",
        "requestStatus": "completed",
        "bidStatus": "won",
        "paymentStatus": "captured_escrow",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "12:20",
        "dateTimeLabel": "06/11 • 12:20",
        "timeSlot": "lunch_peak",
        "stayDatesLabel": "06/11–09/11 (3 đêm)",
        "guestRequestTitle": "2 khách công tác • Lưu trú 3 đêm",
        "amenitiesTags": ["Bữa sáng", "Wifi", "Bãi đậu xe"],
        "nights": 3,
        "roomsQty": 1,
        "roomCategory": "Deluxe",
        "matchedRoomClassId": "dlx",
        "offeredRoom": "Deluxe Twin City View",
        "offeredBasePrice": 950000,
        "hotelEarnedBase": 2850000,
        "guestPaidTotal": calc_guest_total(2850000),
        "medicalRefund": 0,
        "matchScore": 95,
        "bidMode": "auto",
        "responseMinutes": 0.9,
        "guestOpenedDetail": True,
        "closeMinutes": 1.8,
        "closeSpeedText": "01p 48s",
        "holdDurationSeconds": 95,
        "speedNote": {"text": "Chốt <2p • Có thể nhích +50k", "tone": "underpriced"},
        "lockedRoomNumber": 117,
        "resultNote": "Đã TT 100% KCP Escrow • Khóa cứng #117",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8934",
        "status": "won",
        "requestStatus": "completed",
        "bidStatus": "won",
        "paymentStatus": "captured_escrow",
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": "2026-11-06",
        "timeLabel": "09:50",
        "dateTimeLabel": "06/11 • 09:50",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–07/11 (1 đêm)",
        "guestRequestTitle": "Cặp đôi Hàn Quốc • View biển Mỹ Khê",
        "amenitiesTags": ["Bữa sáng", "Hồ bơi", "Trả phòng trễ"],
        "nights": 1,
        "roomsQty": 1,
        "roomCategory": "Executive",
        "matchedRoomClassId": "osuite",
        "offeredRoom": "Executive Ocean Suite",
        "offeredBasePrice": 1900000,
        "hotelEarnedBase": 1900000,
        "guestPaidTotal": calc_guest_total(1900000),
        "medicalRefund": 0,
        "matchScore": 97,
        "bidMode": "manual",
        "responseMinutes": 3.5,
        "guestOpenedDetail": True,
        "closeMinutes": 4.1,
        "closeSpeedText": "04p 06s",
        "holdDurationSeconds": 180,
        "speedNote": {"text": "Tặng kèm Trà chiều", "tone": "fast"},
        "lockedRoomNumber": 129,
        "resultNote": "Đã TT 100% KCP Escrow • Khóa cứng #129",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
]

# --- FEATURED LOSS, PAYMENT-HOLD FAILURE & REJECT HISTORY ROWS ---
# Note: Today (06/11) has 5 won + 4 loss/failed/expired = 9 closed bids (plus 1 auto_closed + 1 partner_declined non-denominator audit rows!)
featured_loss_rows = [
    {
        "id": "CRQ-8937",
        "status": "rejected",
        "requestStatus": "completed",
        "bidStatus": "rejected",
        "paymentStatus": "not_started",
        "rejectCode": "REJ_PRICE_HIGH",
        "rejectLabel": "Khách từ chối · Giá cao hơn đối thủ",
        "sessionDate": "2026-11-06",
        "timeLabel": "15:10",
        "dateTimeLabel": "06/11 • 15:10",
        "timeSlot": "off_peak",
        "stayDatesLabel": "07/11–09/11 (2 đêm)",
        "guestRequestTitle": "2 người lớn • Yêu cầu Executive biển",
        "amenitiesTags": ["Bữa sáng", "Hồ bơi", "Trả phòng trễ"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Executive",
        "matchedRoomClassId": "osuite",
        "offeredRoom": "Executive Ocean Suite",
        "offeredBasePrice": 2250000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 91,
        "bidMode": "manual",
        "responseMinutes": 8.0,
        "guestOpenedDetail": True,
        "closeMinutes": 9.5,
        "closeSpeedText": "09p 30s",
        "lossReasonId": "price_high",
        "resultNote": "REJ_PRICE_HIGH • Cao hơn đối thủ 200k • Chưa vào bước khóa 10p",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8935",
        "status": "expired",
        "requestStatus": "expired",
        "bidStatus": "expired",
        "paymentStatus": "not_started",
        "rejectCode": "EXP_TTL_60M",
        "rejectLabel": "Hết hạn 60p báo giá One-Shot",
        "sessionDate": "2026-11-06",
        "timeLabel": "11:45",
        "dateTimeLabel": "06/11 • 11:45",
        "timeSlot": "lunch_peak",
        "stayDatesLabel": "06/11–07/11 (1 đêm)",
        "guestRequestTitle": "2 người lớn • Nhận phòng gấp buổi trưa",
        "amenitiesTags": ["Wifi", "Bãi đậu xe"],
        "nights": 1,
        "roomsQty": 1,
        "roomCategory": "Superior",
        "matchedRoomClassId": "sup",
        "offeredRoom": "Superior Double",
        "offeredBasePrice": 840000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 88,
        "bidMode": "manual",
        "responseMinutes": 24.0,
        "guestOpenedDetail": False,
        "closeMinutes": 60.0,
        "closeSpeedText": "60p 00s",
        "speedNote": {"text": "Gửi trễ sau 24p", "tone": "late"},
        "lossReasonId": "slow_response",
        "resultNote": "EXP_TTL_60M • Hết 60p khách không chọn • Xóa báo giá vĩnh viễn",
        "autopsyId": "CRQ-8909",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8933",
        "status": "rejected",
        "requestStatus": "completed",
        "bidStatus": "rejected",
        "paymentStatus": "not_started",
        "rejectCode": "REJ_MISSING_PERK",
        "rejectLabel": "Khách từ chối · Thiếu Buffet sáng",
        "sessionDate": "2026-11-06",
        "timeLabel": "08:30",
        "dateTimeLabel": "06/11 • 08:30",
        "timeSlot": "off_peak",
        "stayDatesLabel": "08/11–10/11 (2 đêm)",
        "guestRequestTitle": "2 người lớn • Cần Bữa sáng & Late C/O",
        "amenitiesTags": ["Bữa sáng", "Trả phòng trễ", "Wifi"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Superior",
        "matchedRoomClassId": "sup",
        "offeredRoom": "Superior Double",
        "offeredBasePrice": 790000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 82,
        "bidMode": "auto",
        "responseMinutes": 1.1,
        "guestOpenedDetail": True,
        "closeMinutes": 7.0,
        "closeSpeedText": "07p 00s",
        "lossReasonId": "missing_perk",
        "resultNote": "REJ_MISSING_PERK • Thiếu gói Bữa sáng đi kèm • Phòng vẫn mở",
        "autopsyId": "CRQ-8918",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8932",
        "status": "payment_failed",
        "requestStatus": "expired",
        "bidStatus": "payment_failed",
        "paymentStatus": "hold_timeout_10m",
        "rejectCode": "REJ_HOLD_EXPIRED_10M",
        "rejectLabel": "Hết hạn 10p giữ phòng TT · Tự nhả phòng",
        "sessionDate": "2026-11-06",
        "timeLabel": "07:55",
        "dateTimeLabel": "06/11 • 07:55",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–07/11 (1 đêm)",
        "guestRequestTitle": "1 khách lẻ công tác • Khóa tạm #119 quá 10 phút",
        "amenitiesTags": ["Wifi", "Thang máy"],
        "nights": 1,
        "roomsQty": 1,
        "roomCategory": "Deluxe",
        "matchedRoomClassId": "dlx",
        "offeredRoom": "Deluxe Twin City View",
        "offeredBasePrice": 980000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 91,
        "bidMode": "auto",
        "responseMinutes": 0.9,
        "guestOpenedDetail": True,
        "closeMinutes": 10.0,
        "closeSpeedText": "10p 00s (Hold TTL)",
        "holdRoomNumber": 119,
        "holdDurationSeconds": 600,
        "lossReasonId": "hold_expired_10m",
        "resultNote": "REJ_HOLD_EXPIRED_10M • Hết 10p chờ OTP KCP → Tự nhả khóa #119",
        "autopsyId": "CRQ-8932",
        "showInHistory": True,
    },
    # Non-denominator system auto_closed & partner_declined rows (for full lifecycle transparency!)
    {
        "id": "CRQ-8931",
        "status": "auto_closed",
        "requestStatus": "open",
        "bidStatus": "auto_closed",
        "paymentStatus": "not_started",
        "rejectCode": "SYS_AUTO_CLOSED_SOLDOUT",
        "rejectLabel": "Tự rút thầu · Hết phòng trống ngày trùng",
        "sessionDate": "2026-11-06",
        "timeLabel": "14:09",
        "dateTimeLabel": "06/11 • 14:09",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–08/11 (2 đêm)",
        "guestRequestTitle": "Gia đình 4 khách • Trùng ngày với #CRQ-8938",
        "amenitiesTags": ["Bữa sáng", "Hồ bơi"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Suite",
        "matchedRoomClassId": "fsuite",
        "offeredRoom": "Family Connecting Suite",
        "offeredBasePrice": 1720000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 94,
        "bidMode": "manual",
        "responseMinutes": 3.0,
        "guestOpenedDetail": True,
        "closeMinutes": 5.5,
        "closeSpeedText": "Tự rút tức thì",
        "resultNote": "SYS_AUTO_CLOSED_SOLDOUT • Căn Suite cuối #125 vừa khóa bởi #CRQ-8938 (Không phạt ELO)",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8930",
        "status": "partner_declined",
        "requestStatus": "open",
        "bidStatus": "partner_declined",
        "paymentStatus": "not_started",
        "rejectCode": "PARTNER_DECLINED_REQUEST",
        "rejectLabel": "KS chủ động từ chối nhận phiên",
        "sessionDate": "2026-11-06",
        "timeLabel": "10:15",
        "dateTimeLabel": "06/11 • 10:15",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–07/11 (1 đêm)",
        "guestRequestTitle": "Đoàn 10 người lớn (5 phòng) • Vượt trần Auto-Bid",
        "amenitiesTags": ["Bữa sáng", "Bãi đậu xe", "Cho phép thú cưng"],
        "nights": 1,
        "roomsQty": 5,
        "guestsCount": 10,
        "roomCategory": "Superior",
        "matchedRoomClassId": "sup",
        "offeredRoom": "Superior Double",
        "offeredBasePrice": 0,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 74,
        "bidMode": "manual",
        "responseMinutes": 2.1,
        "guestOpenedDetail": False,
        "closeMinutes": 2.1,
        "closeSpeedText": "KS từ chối",
        "resultNote": "PARTNER_DECLINED • Đoàn 10 khách kèm thú cưng (KS không nhận Pet)",
        "showInHistory": True,
    },
    # Yesterday 05/11 notable autopsy & payment_failed cases shown in History Table
    {
        "id": "CRQ-8928",
        "status": "payment_failed",
        "requestStatus": "open",
        "bidStatus": "payment_failed",
        "paymentStatus": "gateway_declined",
        "rejectCode": "REJ_PAYMENT_DECLINED",
        "rejectLabel": "Cổng KCP từ chối thẻ · Đã nhả phòng",
        "sessionDate": "2026-11-05",
        "timeLabel": "22:05",
        "dateTimeLabel": "05/11 • 22:05",
        "timeSlot": "evening_peak",
        "stayDatesLabel": "06/11–08/11 (2 đêm)",
        "guestRequestTitle": "2 khách quốc tế • Thẻ vượt hạn mức trên NHN KCP",
        "amenitiesTags": ["Bữa sáng", "Hồ bơi", "Wifi"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Executive",
        "matchedRoomClassId": "osuite",
        "offeredRoom": "Executive Ocean Suite",
        "offeredBasePrice": 1950000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 95,
        "bidMode": "manual",
        "responseMinutes": 2.4,
        "guestOpenedDetail": True,
        "closeMinutes": 6.2,
        "closeSpeedText": "06p 12s",
        "holdRoomNumber": 130,
        "holdDurationSeconds": 240,
        "lossReasonId": "hold_expired_10m",
        "resultNote": "REJ_PAYMENT_DECLINED • Lỗi 3DS KCP phút thứ 4 → Nhả khóa #130 tức thì",
        "autopsyId": "CRQ-8932",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8924",
        "status": "rejected",
        "requestStatus": "completed",
        "bidStatus": "rejected",
        "paymentStatus": "not_started",
        "rejectCode": "REJ_PRICE_HIGH",
        "rejectLabel": "Khách từ chối · Giá cao hơn đối thủ",
        "sessionDate": "2026-11-05",
        "timeLabel": "21:15",
        "dateTimeLabel": "05/11 • 21:15",
        "timeSlot": "evening_peak",
        "stayDatesLabel": "06/11–08/11 (2 đêm)",
        "guestRequestTitle": "Cặp đôi • Executive Suite trực diện biển",
        "amenitiesTags": ["Bữa sáng", "Bồn tắm", "Trả phòng trễ"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Executive",
        "matchedRoomClassId": "osuite",
        "offeredRoom": "Executive Ocean Suite",
        "offeredBasePrice": 2300000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 88,
        "bidMode": "manual",
        "responseMinutes": 14.5,
        "guestOpenedDetail": True,
        "closeMinutes": 18.0,
        "closeSpeedText": "18p 00s",
        "speedNote": {"text": "Cao hơn đối thủ 250k", "tone": "late"},
        "lossReasonId": "price_high",
        "resultNote": "REJ_PRICE_HIGH • Đối thủ chào 2.050k + Trà chiều",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8918",
        "status": "rejected",
        "requestStatus": "completed",
        "bidStatus": "rejected",
        "paymentStatus": "not_started",
        "rejectCode": "REJ_MISSING_PERK",
        "rejectLabel": "Khách từ chối · Thiếu Buffet sáng",
        "sessionDate": "2026-11-05",
        "timeLabel": "13:05",
        "dateTimeLabel": "05/11 • 13:05",
        "timeSlot": "lunch_peak",
        "stayDatesLabel": "07/11–09/11 (2 đêm)",
        "guestRequestTitle": "Gia đình 3 người • Ưu tiên ăn sáng & trả trễ",
        "amenitiesTags": ["Bữa sáng", "Trả phòng trễ", "Hồ bơi"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Superior",
        "matchedRoomClassId": "sup",
        "offeredRoom": "Superior Double",
        "offeredBasePrice": 810000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 79,
        "bidMode": "manual",
        "responseMinutes": 9.2,
        "guestOpenedDetail": True,
        "closeMinutes": 12.0,
        "closeSpeedText": "12p 00s",
        "lossReasonId": "missing_perk",
        "resultNote": "REJ_MISSING_PERK • Chào phòng chưa kèm Buffet sáng",
        "autopsyId": "CRQ-8918",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8909",
        "status": "expired",
        "requestStatus": "expired",
        "bidStatus": "expired",
        "paymentStatus": "not_started",
        "rejectCode": "EXP_TTL_60M",
        "rejectLabel": "Hết hạn 60p báo giá One-Shot",
        "sessionDate": "2026-11-05",
        "timeLabel": "23:18",
        "dateTimeLabel": "05/11 • 23:18",
        "timeSlot": "off_peak",
        "stayDatesLabel": "05/11–06/11 (1 đêm)",
        "guestRequestTitle": "2 khách đáp chuyến bay đêm • Check-in 23h45",
        "amenitiesTags": ["Wifi", "Thang máy"],
        "nights": 1,
        "roomsQty": 1,
        "roomCategory": "Deluxe",
        "matchedRoomClassId": "dlx",
        "offeredRoom": "Deluxe Twin City View",
        "offeredBasePrice": 990000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 93,
        "bidMode": "manual",
        "responseMinutes": 31.0,
        "guestOpenedDetail": False,
        "closeMinutes": 60.0,
        "closeSpeedText": "60p 00s",
        "speedNote": {"text": "Báo giá quá trễ (31p)", "tone": "late"},
        "lossReasonId": "slow_response",
        "resultNote": "EXP_TTL_60M • Ca đêm gửi sau 31p • Khách đã chốt KS khác",
        "autopsyId": "CRQ-8909",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8903",
        "status": "auto_closed",
        "requestStatus": "open",
        "bidStatus": "auto_closed",
        "paymentStatus": "not_started",
        "rejectCode": "SYS_AUTO_CLOSED_SOLDOUT",
        "rejectLabel": "Tự rút thầu · Đã bán hết qua OTA/KCP",
        "sessionDate": "2026-11-04",
        "timeLabel": "19:06",
        "dateTimeLabel": "04/11 • 19:06",
        "timeSlot": "evening_peak",
        "stayDatesLabel": "05/11–07/11 (2 đêm)",
        "guestRequestTitle": "Gia đình 4 người • Hạng Suite thông phòng",
        "amenitiesTags": ["Bữa sáng", "Bồn tắm"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": "Suite",
        "matchedRoomClassId": "fsuite",
        "offeredRoom": "Family Connecting Suite",
        "offeredBasePrice": 1740000,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 92,
        "bidMode": "auto",
        "responseMinutes": 0.7,
        "guestOpenedDetail": False,
        "closeMinutes": 3.0,
        "closeSpeedText": "Tự rút tức thì",
        "resultNote": "SYS_AUTO_CLOSED_SOLDOUT • Tự đóng do #CRQ-8904 khóa căn Suite cuối",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8895",
        "status": "partner_declined",
        "requestStatus": "open",
        "bidStatus": "partner_declined",
        "paymentStatus": "not_started",
        "rejectCode": "PARTNER_DECLINED_REQUEST",
        "rejectLabel": "KS chủ động từ chối nhận phiên",
        "sessionDate": "2026-11-03",
        "timeLabel": "15:20",
        "dateTimeLabel": "03/11 • 15:20",
        "timeSlot": "off_peak",
        "stayDatesLabel": "04/11–05/11 (1 đêm)",
        "guestRequestTitle": "Đoàn 12 khách • Yêu cầu nhận phòng 06:00 sáng",
        "amenitiesTags": ["Bữa sáng", "Hỗ trợ xe lăn"],
        "nights": 1,
        "roomsQty": 6,
        "guestsCount": 12,
        "roomCategory": "Deluxe",
        "matchedRoomClassId": "dlx",
        "offeredRoom": "Deluxe Twin City View",
        "offeredBasePrice": 0,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 78,
        "bidMode": "manual",
        "responseMinutes": 3.5,
        "guestOpenedDetail": False,
        "closeMinutes": 3.5,
        "closeSpeedText": "KS từ chối",
        "resultNote": "PARTNER_DECLINED • Không đủ 6 phòng trống sớm lúc 06:00 sáng",
        "showInHistory": True,
    },
]

auction_sessions.extend(today_won_rows)
auction_sessions.extend(featured_loss_rows)

# Remaining historical sessions across 2026-10-08 .. 2026-11-05:
# Target completed bids in 30d = 68 (29 won + 39 losses):
#   - Featured losses above already include 8 completed loss/failed/expired rows:
#       CRQ-8937 (price_high), CRQ-8935 (slow_response), CRQ-8933 (missing_perk), CRQ-8932 (hold_expired_10m),
#       CRQ-8928 (hold_expired_10m), CRQ-8924 (price_high), CRQ-8918 (missing_perk), CRQ-8909 (slow_response)
#   - So we need 24 more won rows + 31 more loss rows = 55 rows -> Total completed bids = 5 + 8 + 24 + 31 = 68!
prior_wins_spec = [
    ("CRQ-8921", "2026-11-05", "17:20", "sup", "Superior", "Superior Double", 2, 810000, "auto", 0, True),
    ("CRQ-8915", "2026-11-05", "10:40", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1020000, "auto", 0, True),
    ("CRQ-8904", "2026-11-04", "19:05", "fsuite", "Suite", "Family Connecting Suite", 2, 1720000, "manual", 0, False),
    ("CRQ-8899", "2026-11-04", "12:15", "sup", "Superior", "Superior Double", 1, 830000, "auto", 0, False),
    ("CRQ-8892", "2026-11-03", "20:10", "dlx", "Deluxe", "Deluxe Twin City View", 2, 990000, "auto", 0, False),
    ("CRQ-8886", "2026-11-02", "15:30", "osuite", "Executive", "Executive Ocean Suite", 2, 1950000, "manual", 0, False),
    ("CRQ-8880", "2026-11-01", "18:25", "sup", "Superior", "Superior Double", 2, 820000, "auto", 0, False),
    ("CRQ-8874", "2026-10-31", "11:50", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1040000, "auto", 0, False),
    ("CRQ-8868", "2026-10-30", "19:15", "sup", "Superior", "Superior Double", 2, 800000, "auto", 0, False),
    ("CRQ-8862", "2026-10-29", "14:10", "fsuite", "Suite", "Family Connecting Suite", 2, 1680000, "manual", 0, False),
    ("CRQ-8857", "2026-10-28", "20:05", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1000000, "auto", 0, False),
    ("CRQ-8851", "2026-10-27", "12:40", "sup", "Superior", "Superior Double", 2, 790000, "auto", 0, False),
    ("CRQ-8846", "2026-10-26", "17:50", "osuite", "Executive", "Executive Ocean Suite", 2, 1920000, "manual", 0, False),
    ("CRQ-8841", "2026-10-25", "16:05", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1030000, "auto", 0, False),
    ("CRQ-8838", "2026-10-25", "11:20", "sup", "Superior", "Superior Double", 1, 820000, "auto", 0, False),
    ("CRQ-8836", "2026-10-24", "19:30", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1010000, "manual", 0, False),
    ("CRQ-8835", "2026-10-19", "15:00", "sup", "Superior", "Superior Double", 2, 850000, "auto", 1700000, True),
    ("CRQ-8829", "2026-10-22", "18:40", "fsuite", "Suite", "Family Connecting Suite", 2, 1750000, "manual", 0, False),
    ("CRQ-8822", "2026-10-20", "12:30", "sup", "Superior", "Superior Double", 3, 780000, "auto", 0, False),
    ("CRQ-8816", "2026-10-17", "20:15", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1020000, "auto", 0, False),
    ("CRQ-8810", "2026-10-15", "14:45", "sup", "Superior", "Superior Double", 2, 810000, "auto", 0, False),
    ("CRQ-8804", "2026-10-13", "19:10", "osuite", "Executive", "Executive Ocean Suite", 2, 1960000, "manual", 0, False),
    ("CRQ-8798", "2026-10-11", "11:35", "dlx", "Deluxe", "Deluxe Twin City View", 3, 980000, "auto", 0, False),
    ("CRQ-8792", "2026-10-09", "18:00", "sup", "Superior", "Superior Double", 2, 820000, "manual", 0, False),
]

assert len(prior_wins_spec) == 24

stayover_room_map = {
    "CRQ-8921": (107, "05/11–07/11 (2 đêm)"),
    "CRQ-8915": (118, "05/11–07/11 (2 đêm)"),
    "CRQ-8904": (126, "05/11–07/11 (2 đêm)"),
}

for cid, sdate, tlabel, rcid, rcat, rname, nights, bprice, bmode, med_ref, show_hist in prior_wins_spec:
    earned = bprice * nights
    d_short = f"{sdate[8:10]}/{sdate[5:7]}"
    slot = "lunch_peak" if 11 <= int(tlabel[:2]) <= 13 else ("evening_peak" if 18 <= int(tlabel[:2]) <= 22 else "off_peak")
    locked_rno, stay_lbl = stayover_room_map.get(cid, (108, f"{nights} đêm"))
    if med_ref > 0:
        pay_st = "refunded_medical"
        req_st = "completed"
        note = "PAY_REFUNDED_MEDICAL • Hoàn tiền y tế bất khả kháng (-1.700k)"
    elif sdate <= "2026-10-29":
        pay_st = "settled_t7"
        req_st = "closed"
        note = "PAY_SETTLED_T7 • Đã giải ngân 100% Giá gốc về Vietcombank KS"
    else:
        pay_st = "captured_escrow"
        req_st = "completed"
        note = (
            f"PAY_CAPTURED_ESCROW • Đang lưu trú #{locked_rno} (Chờ T+7)"
            if cid in stayover_room_map
            else "PAY_CAPTURED_ESCROW • Giữ ký quỹ KCP chờ T+7"
        )
    auction_sessions.append({
        "id": cid,
        "status": "won",
        "requestStatus": req_st,
        "bidStatus": "won",
        "paymentStatus": pay_st,
        "rejectCode": None,
        "rejectLabel": None,
        "sessionDate": sdate,
        "timeLabel": tlabel,
        "dateTimeLabel": f"{d_short} • {tlabel}",
        "timeSlot": slot,
        "stayDatesLabel": stay_lbl,
        "guestRequestTitle": f"2 người lớn • Đặt phòng {rcat}",
        "amenitiesTags": ["Bữa sáng", "Wifi"],
        "nights": nights,
        "roomsQty": 1,
        "roomCategory": rcat,
        "matchedRoomClassId": rcid,
        "offeredRoom": rname,
        "offeredBasePrice": bprice,
        "hotelEarnedBase": earned,
        "guestPaidTotal": calc_guest_total(earned),
        "medicalRefund": med_ref,
        "medicalRefundNote": "Khách nhập viện cấp cứu có xác nhận bệnh viện trong ≤3 ngày (Mục 5.3 Optibide)" if med_ref > 0 else None,
        "matchScore": 93 if rcid in ("sup", "dlx") else 95,
        "bidMode": bmode,
        "responseMinutes": 0.9 if bmode == "auto" else 4.8,
        "guestOpenedDetail": True,
        "closeMinutes": 3.5,
        "closeSpeedText": "03p 30s",
        "holdDurationSeconds": 150,
        "lockedRoomNumber": locked_rno,
        "resultNote": note,
        "autopsyId": "CRQ-8924",
        "showInHistory": show_hist,
    })

# Remaining 31 loss rows to reach exact 39 losses in 30d:
# Featured losses already have: price_high (2), slow_response (2), missing_perk (2), hold_expired_10m (2) = 8
# Let's add: price_high (13), slow_response (9), missing_perk (5), hold_expired_10m (2), payment_abandoned (2) = 31!
# Totals in 30d: price_high=15, slow_response=11, missing_perk=7, hold_expired_10m=4, payment_abandoned=2 -> Sum = 39!
loss_reasons_pool = (
    ["price_high"] * 13
    + ["slow_response"] * 9
    + ["missing_perk"] * 5
    + ["hold_expired_10m"] * 2
    + ["payment_abandoned"] * 2
)
assert len(loss_reasons_pool) == 31

class_cycle = [
    ("sup", "Superior", "Superior Double", 860000),
    ("dlx", "Deluxe", "Deluxe Twin City View", 1120000),
    ("fsuite", "Suite", "Family Connecting Suite", 1890000),
    ("osuite", "Executive", "Executive Ocean Suite", 2240000),
    ("sup", "Superior", "Superior Double", 840000),
    ("dlx", "Deluxe", "Deluxe Twin City View", 1090000),
]

loss_dates = [
    # 7 losses in Oct 31 - Nov 04 so 7d has: (5+8=13 wins) and (4 today + 4 Nov05 + 7 Oct31-Nov04 = 15 losses) -> 28 bids in 7d!
    "2026-11-04", "2026-11-04", "2026-11-03",
    "2026-11-02", "2026-11-01", "2026-10-31", "2026-10-31",
    # Remaining 24 losses in Oct 08 - Oct 30
    "2026-10-30", "2026-10-29", "2026-10-28", "2026-10-27",
    "2026-10-26", "2026-10-25", "2026-10-24", "2026-10-23",
    "2026-10-22", "2026-10-21", "2026-10-20", "2026-10-19",
    "2026-10-18", "2026-10-17", "2026-10-16", "2026-10-15",
    "2026-10-14", "2026-10-13", "2026-10-12", "2026-10-11",
    "2026-10-10", "2026-10-09", "2026-10-08", "2026-10-08",
]

for idx, reason_id in enumerate(loss_reasons_pool):
    sdate = loss_dates[idx]
    rcid, rcat, rname, bprice = class_cycle[idx % len(class_cycle)]
    bmode = "manual" if reason_id in ("slow_response", "price_high") and idx % 3 != 0 else "auto"
    d_short = f"{sdate[8:10]}/{sdate[5:7]}"
    cid = f"CRQ-{8750 + idx}"

    if reason_id == "hold_expired_10m":
        st = "payment_failed"
        req_st = "expired"
        bid_st = "payment_failed"
        pay_st = "hold_timeout_10m" if idx % 2 == 0 else "gateway_declined"
        rej_code = "REJ_HOLD_EXPIRED_10M" if idx % 2 == 0 else "REJ_PAYMENT_DECLINED"
        rej_lbl = "Hết 10p giữ phòng TT · Tự nhả phòng" if idx % 2 == 0 else "KCP từ chối thẻ · Đã nhả phòng"
        rnote = f"{rej_code} • Đã giải phóng khóa tạm 10p về Trống mở khóa"
        autopsy_ref = "CRQ-8932"
        close_m = 10.0
        close_txt = "10p 00s"
    elif reason_id == "payment_abandoned":
        st = "payment_failed"
        req_st = "cancelled_by_guest"
        bid_st = "payment_failed"
        pay_st = "guest_abandoned_checkout"
        rej_code = "REJ_CHECKOUT_ABANDONED"
        rej_lbl = "Khách bấm thoát cổng KCP · Đã nhả phòng"
        rnote = "REJ_CHECKOUT_ABANDONED • Khách thoát màn hình KCP phút thứ 3 → Nhả phòng ngay"
        autopsy_ref = "CRQ-8932"
        close_m = 3.2
        close_txt = "03p 12s"
    elif reason_id == "slow_response" and idx % 2 == 0:
        st = "expired"
        req_st = "expired"
        bid_st = "expired"
        pay_st = "not_started"
        rej_code = "EXP_TTL_60M"
        rej_lbl = "Hết hạn 60p báo giá One-Shot"
        rnote = "EXP_TTL_60M • Quá hạn 60p khách không chọn • Xóa báo giá"
        autopsy_ref = "CRQ-8909"
        close_m = 60.0
        close_txt = "60p 00s"
    elif reason_id == "slow_response":
        st = "rejected"
        req_st = "completed"
        bid_st = "rejected"
        pay_st = "not_started"
        rej_code = "REJ_COMPETITOR_FASTER"
        rej_lbl = "Mất đơn · Phản hồi chậm hơn đối thủ"
        rnote = "REJ_COMPETITOR_FASTER • Khách đã khóa tạm 10p với đối thủ Auto-Bid trước"
        autopsy_ref = "CRQ-8909"
        close_m = 14.0
        close_txt = "14p 00s"
    elif reason_id == "missing_perk":
        st = "rejected"
        req_st = "completed"
        bid_st = "rejected"
        pay_st = "not_started"
        rej_code = "REJ_MISSING_PERK"
        rej_lbl = "Khách từ chối · Thiếu đặc quyền mềm"
        rnote = "REJ_MISSING_PERK • Thiếu Buffet sáng / Late C/O • Phòng vẫn mở"
        autopsy_ref = "CRQ-8918"
        close_m = 9.5
        close_txt = "09p 30s"
    else:
        st = "rejected"
        req_st = "completed"
        bid_st = "rejected"
        pay_st = "not_started"
        rej_code = "REJ_PRICE_HIGH"
        rej_lbl = "Khách từ chối · Giá gốc cao hơn đối thủ"
        rnote = "REJ_PRICE_HIGH • Khách chọn đối thủ giá mềm hơn • Phòng vẫn mở"
        autopsy_ref = "CRQ-8924"
        close_m = 10.5
        close_txt = "10p 30s"

    auction_sessions.append({
        "id": cid,
        "status": st,
        "requestStatus": req_st,
        "bidStatus": bid_st,
        "paymentStatus": pay_st,
        "rejectCode": rej_code,
        "rejectLabel": rej_lbl,
        "sessionDate": sdate,
        "timeLabel": "20:15" if idx % 2 == 0 else "12:35",
        "dateTimeLabel": f"{d_short} • {'20:15' if idx % 2 == 0 else '12:35'}",
        "timeSlot": "evening_peak" if idx % 2 == 0 else "lunch_peak",
        "stayDatesLabel": "2 đêm",
        "guestRequestTitle": f"2 người lớn • Tìm phòng {rcat}",
        "amenitiesTags": ["Bữa sáng", "Wifi"],
        "nights": 2,
        "roomsQty": 1,
        "roomCategory": rcat,
        "matchedRoomClassId": rcid,
        "offeredRoom": rname,
        "offeredBasePrice": bprice,
        "hotelEarnedBase": 0,
        "guestPaidTotal": 0,
        "medicalRefund": 0,
        "matchScore": 84 if reason_id == "missing_perk" else 90,
        "bidMode": bmode,
        "responseMinutes": 22.0 if reason_id == "slow_response" else (1.0 if bmode == "auto" else 6.5),
        "guestOpenedDetail": reason_id != "slow_response",
        "closeMinutes": close_m,
        "closeSpeedText": close_txt,
        "lossReasonId": reason_id,
        "resultNote": rnote,
        "autopsyId": autopsy_ref,
        "showInHistory": idx in (3, 18),
    })

# 9. MATCH BREAKDOWNS
match_breakdowns = {
    "CRQ-8941": {
        "reqId": "CRQ-8941",
        "score": 92,
        "sub": "Phiên Live #CRQ-8941 • Hạng bắt buộc: Superior • Lưu trú đêm nay 06/11",
        "title": "Khớp 100% Hard Rules • Thiếu nhẹ Bữa sáng trong gói cơ bản",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Địa bàn & Hạng phòng",
                "guest": "Sơn Trà, Đà Nẵng • Hạng Superior",
                "hotel": "Phước Mỹ, Sơn Trà • Superior Double (#108–#110 trống mở)",
                "status": "match",
                "label": "Đạt chuẩn cứng",
            },
            {
                "name": "Cấu hình Giường & Sức chứa",
                "guest": "1 Giường đôi Queen • 2 người lớn",
                "hotel": "1 Giường đôi Queen • Sức chứa chuẩn 2 NL",
                "status": "match",
                "label": "Khớp 100%",
            },
            {
                "name": "Dịch vụ Bữa sáng đi kèm",
                "guest": "Có chọn Bữa sáng",
                "hotel": "Hạng Superior cơ bản chưa gồm Buffet sáng (-8% điểm mềm)",
                "status": "warn",
                "label": "-8% Soft Rule",
            },
            {
                "name": "Wifi tốc độ cao & Thang máy",
                "guest": "Yêu cầu Wifi + Thang máy",
                "hotel": "Có sẵn miễn phí toàn tòa nhà",
                "status": "match",
                "label": "Khớp 100%",
            },
        ],
        "tip": "Gợi ý AI: Tặng kèm 'Miễn phí Buffet sáng 2 khách' (chi phí bếp ~90k) sẽ nâng độ khớp lên 100% và tăng +22% xác suất khách bấm giữ phòng 10p ngay tối nay.",
        "suggestedPerkId": "perk_bf",
    },
    "CRQ-8942": {
        "reqId": "CRQ-8942",
        "score": 96,
        "sub": "Phiên Live #CRQ-8942 • Hạng bắt buộc: Executive • Đang chờ nhả khóa tạm #130",
        "title": "Độ khớp 96% • Đang bị chặn chọn thanh toán do #130 khóa tạm 10p (#CRQ-8944)",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Hạng phòng Executive",
                "guest": "Executive • Khu vực biển Mỹ Khê",
                "hotel": "Executive Ocean Suite (#130 đang giữ 10p cho #CRQ-8944)",
                "status": "warn",
                "label": "Đang tạm khóa 10p",
            },
            {
                "name": "Giường & Tầm nhìn biển",
                "guest": "Giường King • Ưu tiên kỷ niệm ngày cưới",
                "hotel": "1 Giường King trực diện biển tầng 6",
                "status": "match",
                "label": "Khớp 100%",
            },
            {
                "name": "Bữa sáng, Hồ bơi & Wifi",
                "guest": "Bữa sáng + Hồ bơi + Wifi",
                "hotel": "Đã bao gồm trọn gói trong hạng Executive",
                "status": "match",
                "label": "Khớp 100%",
            },
            {
                "name": "Trả phòng trễ (Late Check-out)",
                "guest": "Mong muốn trả phòng sau 13:00",
                "hotel": "Hỗ trợ linh hoạt tới 13:00 (-4% nếu chưa cam kết cứng 14:00)",
                "status": "warn",
                "label": "-4% Soft Rule",
            },
        ],
        "tip": "Cơ chế Khóa ghế 10p (Movie-Seat Hold): Phòng #130 đang khóa tạm chờ #CRQ-8944 thanh toán. Trong 10 phút này #CRQ-8942 không thể click tranh phòng. Nếu #CRQ-8944 hết hạn 10p hoặc lỗi thẻ, #130 tự mở khóa lại ngay cho #CRQ-8942!",
        "suggestedPerkId": "perk_tea",
    },
    "CRQ-8943": {
        "reqId": "CRQ-8943",
        "score": 95,
        "sub": "Phiên Live #CRQ-8943 • Hạng bắt buộc: Deluxe • Khách công tác 2 đêm",
        "title": "Khớp 95% tiêu chí công tác • Sẵn 5 phòng trống mở ngày 09/11",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Hạng Deluxe",
                "guest": "Deluxe • Đà Nẵng",
                "hotel": "Deluxe Twin City View (5 phòng trống mở ngày 09/11)",
                "status": "match",
                "label": "Đạt chuẩn cứng",
            },
            {
                "name": "Loại giường Twin",
                "guest": "2 Giường đơn Twin",
                "hotel": "2 Giường đơn Twin tiêu chuẩn 4 sao",
                "status": "match",
                "label": "Khớp 100%",
            },
            {
                "name": "Bữa sáng & Bãi đậu xe ô tô",
                "guest": "Bữa sáng + Bãi đậu xe + Xuất HĐ",
                "hotel": "Đáp ứng đầy đủ bãi đỗ xe riêng & VAT",
                "status": "match",
                "label": "Khớp 100%",
            },
        ],
        "tip": "Đoàn công tác đầu tuần rất nhạy tốc độ xác nhận. Gửi ngay giá gốc 1.020.000đ/đêm (Khách TT 1.290.300đ) để chốt sớm.",
        "suggestedPerkId": "perk_late",
    },
    "CRQ-8944": {
        "reqId": "CRQ-8944",
        "score": 94,
        "sub": "Phiên Live #CRQ-8944 • Đang TẠM KHÓA PHÒNG #130 (10 phút) chờ thanh toán KCP",
        "title": "Khớp 94% • Ghế/Phòng #130 đang khóa độc quyền 10p cho khách thanh toán",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule) & Khóa tạm 10p",
                "guest": "Executive • Đã bấm Chọn chào giá lúc 19:43",
                "hotel": "Phòng #130 đang TEMP_LOCKED_PAYMENT (10:00 TTL)",
                "status": "match",
                "label": "Giữ độc quyền 10p",
            },
            {
                "name": "Truyền hình OTT (Netflix/YouTube) & Hồ bơi",
                "guest": "OTT TV + Hồ bơi + Bữa sáng",
                "hotel": "Smart TV 55 inch có sẵn OTT + Buffet sáng",
                "status": "match",
                "label": "Khớp 100%",
            },
        ],
        "tip": "Khách đang ở cổng NHN KCP (còn ~8 phút giữ chỗ). Tuyệt đối không giục khách bấm tạo lại giao dịch mới khi cổng đang xử lý để chống trừ tiền đúp!",
    },
    "CRQ-8945": {
        "reqId": "CRQ-8945",
        "score": 95,
        "sub": "Phiên Live #CRQ-8945 • Auto-Bid đã gửi 810.000đ + Buffet sáng • Chờ khách chọn",
        "title": "Khớp 95% • Còn 3 phòng trống mở (#108–#110) sẵn sàng giữ khóa 10p",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Superior Double",
                "guest": "Superior • Cặp đôi nghỉ 2 đêm (06/11–08/11)",
                "hotel": "Superior Double (#108, #109, #110 đang trống mở)",
                "status": "match",
                "label": "Đạt chuẩn cứng",
            },
            {
                "name": "Buffet sáng đính kèm từ Auto-Bid",
                "guest": "Ưu tiên có ăn sáng",
                "hotel": "Đã tặng kèm Buffet sáng 2 khách (+8% bù điểm khớp)",
                "status": "match",
                "label": "Đã bù đặc quyền",
            },
        ],
        "tip": "Khi khách bấm 'Chọn chào giá & Thanh toán', hệ thống sẽ lập tức khóa tạm phòng #108 trong 10 phút (600s) để bảo vệ khách nhập OTP.",
    },
    "CRQ-8924": {
        "reqId": "CRQ-8924",
        "score": 88,
        "sub": "Phiên trượt #CRQ-8924 (05/11) • Mã từ chối: REJ_PRICE_HIGH",
        "title": "Đạt Hard Rules nhưng kém điểm mềm Trả phòng trễ & Giá cao hơn 250k",
        "items": [
            {
                "name": "Hạng phòng Executive & Bồn tắm",
                "guest": "Executive • Có bồn tắm nằm",
                "hotel": "Executive Ocean Suite có bồn tắm view biển",
                "status": "match",
                "label": "Khớp 100%",
            },
            {
                "name": "Cam kết Trả phòng trễ 14:00",
                "guest": "Yêu cầu Late Check-out 14:00",
                "hotel": "Không tích chọn tặng kèm khi gửi báo giá (-12%)",
                "status": "miss",
                "label": "Thiếu cam kết",
            },
        ],
        "tip": "Đối thủ thắng phiên này chào Giá gốc 2.050.000đ kèm sẵn Trả phòng trễ 14:00 (độ khớp 96%).",
    },
}

# 10. LOSS AUTOPSY CASES (Tab 2 Head-to-Head Visual Autopsy — includes 10m Hold Timeout / KCP Decline!)
loss_autopsies = {
    "CRQ-8924": {
        "id": "CRQ-8924",
        "tabLabel": "#CRQ-8924 • REJ_PRICE_HIGH (+250k)",
        "dateLabel": "05/11 • 21:15 (Executive • 2 đêm • Khách từ chối giá)",
        "guestRejectTag": "REJ_PRICE_HIGH: Chọn KS tương đương có tổng giá ×1.265 tốt hơn",
        "metrics": [
            {
                "label": "Giá gốc chào / đêm",
                "yours": "2.300.000đ",
                "winner": "2.050.000đ",
                "deltaBadge": "+250k đắt hơn",
                "tone": "bad",
            },
            {
                "label": "Tổng giá Khách TT (×1.265)",
                "yours": "2.909.500đ",
                "winner": "2.593.250đ",
                "deltaBadge": "Chênh +316k",
                "tone": "bad",
            },
            {
                "label": "Độ khớp & Đặc quyền",
                "yours": "88% (Không kèm quà)",
                "yoursMatchModalId": "CRQ-8924",
                "winner": "96% (+Trà chiều & Late C/O)",
                "deltaBadge": "Kém -8% khớp",
                "tone": "warn",
            },
            {
                "label": "Tốc độ gửi báo giá",
                "yours": "14 phút 30s",
                "winner": "02 phút 10s",
                "deltaBadge": "Chậm hơn 12p",
                "tone": "warn",
            },
        ],
        "recommendedFormula": {
            "suggestedBasePrice": 2020000,
            "perkSummary": "Tặng Set Trà chiều + Late Check-out 14:00",
            "costNote": "Chi phí F&B chỉ ~55k",
            "estimatedWinProb": 74,
            "ruleTitle": "Executive Suite trống ≥1 phòng sau 20h → Chào gốc 2.020k + Trà chiều & Late C/O",
        },
    },
    "CRQ-8918": {
        "id": "CRQ-8918",
        "tabLabel": "#CRQ-8918 • REJ_MISSING_PERK",
        "dateLabel": "05/11 • 13:05 (Superior • 2 đêm • Thiếu Buffet sáng)",
        "guestRejectTag": "REJ_MISSING_PERK: Ưu tiên khách sạn đã gồm sẵn bữa sáng cho gia đình",
        "metrics": [
            {
                "label": "Giá gốc chào / đêm",
                "yours": "810.000đ",
                "winner": "830.000đ",
                "deltaBadge": "Rẻ hơn 20k",
                "tone": "good",
            },
            {
                "label": "Đặc quyền Bữa sáng",
                "yours": "Không bao gồm",
                "winner": "Miễn phí Buffet sáng",
                "deltaBadge": "Thiếu món chốt",
                "tone": "bad",
            },
            {
                "label": "Điểm khớp AI (Match %)",
                "yours": "79% (Bị trừ điểm mềm)",
                "yoursMatchModalId": "CRQ-8941",
                "winner": "95% (Đủ tiêu chí)",
                "deltaBadge": "-16% độ khớp",
                "tone": "bad",
            },
            {
                "label": "Tốc độ gửi báo giá",
                "yours": "09 phút 12s",
                "winner": "03 phút 40s",
                "deltaBadge": "Chấp nhận được",
                "tone": "neutral",
            },
        ],
        "recommendedFormula": {
            "suggestedBasePrice": 820000,
            "perkSummary": "Tặng kèm Buffet sáng 2 khách miễn phí",
            "costNote": "Chi phí bếp ~90k • Giữ nguyên giá OTA",
            "estimatedWinProb": 78,
            "ruleTitle": "Khách chọn Bữa sáng cho hạng Superior → Giữ giá gốc 820k + Tự động tặng Buffet sáng",
        },
    },
    "CRQ-8909": {
        "id": "CRQ-8909",
        "tabLabel": "#CRQ-8909 • EXP_TTL_60M (Trễ 31p)",
        "dateLabel": "05/11 • 23:18 (Deluxe • Nhận phòng đêm)",
        "guestRejectTag": "EXP_TTL_60M: Khách đáp sân bay đã khóa tạm 10p với đối thủ Auto-Bid trong 5p đầu",
        "metrics": [
            {
                "label": "Tốc độ gửi báo giá",
                "yours": "31 phút 00s",
                "winner": "00 phút 45s (Auto-Bid)",
                "deltaBadge": "Trễ nhịp vàng",
                "tone": "bad",
            },
            {
                "label": "Trạng thái xem của khách",
                "yours": "Chưa mở xem (Đã rời phiên)",
                "winner": "Khóa tạm 10p lúc 01:40 → TT xong 03:10",
                "deltaBadge": "Mất lượt hiển thị",
                "tone": "bad",
            },
            {
                "label": "Giá gốc chào / đêm",
                "yours": "990.000đ",
                "winner": "1.020.000đ",
                "deltaBadge": "Giá tốt nhưng trễ",
                "tone": "warn",
            },
            {
                "label": "Độ khớp yêu cầu",
                "yours": "93% (Deluxe Twin)",
                "winner": "92% (Deluxe Double)",
                "deltaBadge": "+1% cao hơn",
                "tone": "good",
            },
        ],
        "recommendedFormula": {
            "suggestedBasePrice": 950000,
            "perkSummary": "Kích hoạt Auto-Bid tự động dưới 60 giây sau 22h00",
            "costNote": "Trần an toàn ≤4 phòng, ≤8 khách",
            "estimatedWinProb": 82,
            "ruleTitle": "Sau 22h00 đêm → Bật Auto-Bid phản hồi <60s ở mức sàn +5% cho đơn ≤4 phòng, ≤8 khách",
        },
    },
    "CRQ-8932": {
        "id": "CRQ-8932",
        "tabLabel": "#CRQ-8932 • REJ_HOLD_EXPIRED_10M",
        "dateLabel": "06/11 • 07:55 (Deluxe • Quá hạn 10p giữ phòng KCP)",
        "guestRejectTag": "REJ_HOLD_EXPIRED_10M: Khách đã bấm giữ phòng #119 (10p) nhưng treo OTP quá 600s",
        "metrics": [
            {
                "label": "Bước chuyển đổi đạt tới",
                "yours": "Bước 7/8 (Đã khóa tạm #119 · 10:00)",
                "winner": "Tự nhả khóa về Trống mở đúng phút 10:00",
                "deltaBadge": "Bảo toàn tồn kho",
                "tone": "warn",
            },
            {
                "label": "Trạng thái cổng NHN KCP",
                "yours": "PAY_TIMEOUT_10M (Chưa trừ tiền)",
                "winner": "Tự động hủy Token thanh toán cũ",
                "deltaBadge": "0% rủi ro thu đúp",
                "tone": "good",
            },
            {
                "label": "Ảnh hưởng tới phiên cạnh tranh",
                "yours": "Chỉ tạm chặn #119 đúng 10 phút",
                "winner": "Phòng #119 mở bán lại ngay lúc 08:05",
                "deltaBadge": "Không chết phòng",
                "tone": "good",
            },
            {
                "label": "Tổng giá Khách thấy bước cuối",
                "yours": "1.239.700đ (Gốc 980k × 1.265)",
                "winner": "Gợi ý giảm nhẹ gốc còn 940k kèm Late C/O",
                "deltaBadge": "Giảm do dự OTP",
                "tone": "neutral",
            },
        ],
        "recommendedFormula": {
            "suggestedBasePrice": 940000,
            "perkSummary": "Giảm nhẹ gốc -40k + Miễn phí Trả phòng trễ 14:00",
            "costNote": "Tổng khách trả dưới ngưỡng tâm lý 1.200k",
            "estimatedWinProb": 85,
            "ruleTitle": "Khách lẻ Deluxe đặt sáng sớm → Chào gốc 940k (Khách TT 1.189k < 1.2M) để chốt OTP ngay trong 3 phút đầu",
        },
    },
}

# 11. BOT RULES
bot_rules = [
    {
        "ruleId": "RULE-01",
        "title": "Ca đêm vắng lễ tân → Tự chào giá sàn 750k dưới 1 phút (≤4 phòng, ≤8 khách)",
        "active": True,
        "createdAt": "2026-11-01",
        "sourceCaseId": "CRQ-8909",
    },
    {
        "ruleId": "RULE-02",
        "title": "Tự động chặn Auto-Bid khi đoàn >4 phòng hoặc >8 khách (Chuyển duyệt tay)",
        "active": True,
        "createdAt": "2026-10-15",
        "sourceCaseId": "SYSTEM_GUARDRAIL",
    },
]

# 12. FULL LIFECYCLE, MULTI-ENTITY STATE DICTIONARIES & 18-CASE SCENARIO CATALOG
lifecycle_catalog = {
    "version": "2.6",
    "paymentHoldRuleSummary": "Cơ chế Tạm khóa Ghế/Phòng 10 Phút (600s Atomic Checkout Hold): Giai đoạn chào giá 60p KHÔNG khóa phòng; ngay khi khách click 'Chọn chào giá & Thanh toán', hệ thống khóa nguyên tử 1 mã phòng vật lý trong đúng 10 phút (người khác không thể click chọn trùng). Thành công KCP → Khóa cứng vĩnh viễn; Lỗi thẻ / Thoát / Hết 10p → Nhả khóa tức thì về Trống mở khóa.",
    "stages": [
        {
            "stage": 1,
            "code": "STAGE_1_REQUEST_INIT",
            "title": "1. Khởi tạo Yêu cầu Đặt phòng (Form 3 bước D0–D14)",
            "actor": "Du khách (Traveler)",
            "roomState": "vacant_unlocked",
            "bidState": "— (Chưa phát sinh)",
            "paymentState": "not_started",
            "slaOrTimer": "Khung lưu trú 0–14 ngày",
            "summary": "Khách chọn Khu vực hành chính, Ngày nhận/trả phòng (D0–D14), Cơ cấu khách (NL/TE/Em bé/Pet), Hạng phòng bắt buộc, Loại giường & 11 tiện ích mềm (ẩn ngân sách trần).",
            "failOrBranch": "Nếu ngày lưu trú > 14 ngày → Chặn ngoài phạm vi đấu giá (chuyển sang đặt giá niêm yết truyền thống).",
        },
        {
            "stage": 2,
            "code": "STAGE_2_HARD_SOFT_MATCH",
            "title": "2. Sàng lọc Hard Rules & Chấm điểm AI Match %",
            "actor": "Matching Engine",
            "roomState": "vacant_unlocked",
            "bidState": "open_unbid",
            "paymentState": "not_started",
            "slaOrTimer": "Xử lý < 200ms",
            "summary": "Đối chiếu điều kiện cứng (Địa bàn + Hạng phòng còn buồng mở khóa) và tính điểm khớp mềm AI Match % (= 100% − Điểm trừ thiếu tiện ích).",
            "failOrBranch": "0 khách sạn khớp hoặc tất cả hết phòng → Chuyển Request sang REQ_REJECTED_NO_MATCH (cancelledNoMatchedHotel) ngay lập tức.",
        },
        {
            "stage": 3,
            "code": "STAGE_3_ONE_SHOT_BID",
            "title": "3. Phát hành Báo giá 1 Lần (One-Shot Bid · TTL 60p)",
            "actor": "AI Auto-Bid / Lễ tân / Quản lý",
            "roomState": "vacant_unlocked (Mở đa phiên)",
            "bidState": "bid_sent",
            "paymentState": "not_started",
            "slaOrTimer": "Đếm ngược 60:00 (3.600s)",
            "summary": "Auto-Bid tự gửi <60s (nếu ≤4 phòng, ≤8 khách, ≥ Giá sàn) hoặc nhân sự gửi thủ công kèm gói Đặc quyền mềm. Phòng VẪN MỞ KHÓA để tham gia đồng thời nhiều phiên Live.",
            "failOrBranch": "Lễ tân nhập dưới Giá sàn → Chặn cứng (SYS_REJECTED_FLOOR_GUARDRAIL). KS bấm bỏ qua → PARTNER_DECLINED_REQUEST.",
        },
        {
            "stage": 4,
            "code": "STAGE_4_GUEST_COMPARE",
            "title": "4. Phân phối WebSocket, Khách So sánh & Từ chối sớm",
            "actor": "Du khách (Web / App)",
            "roomState": "vacant_unlocked",
            "bidState": "bid_sent",
            "paymentState": "not_started",
            "slaOrTimer": "Trong hạn 60:00 của Bid",
            "summary": "Hệ thống nhân hệ số ×1.265 (15% Phí sàn + 10% VAT) đẩy thẻ chào giá realtime tới màn hình so sánh ẩn danh của khách.",
            "failOrBranch": "Khách từ chối trực tiếp / chọn đối thủ → REJ_PRICE_HIGH / REJ_MISSING_PERK / REJ_COMPETITOR_FASTER. Quá 60p không tương tác → EXP_TTL_60M.",
        },
        {
            "stage": 5,
            "code": "STAGE_5_SEAT_HOLD_10M",
            "title": "5. Khách Bấm Thanh toán → Tạm khóa Phòng 10 Phút (Movie-Seat Lock)",
            "actor": "Atomic Lock Engine (Redis/DB)",
            "roomState": "payment_hold (Khóa tạm 10p)",
            "bidState": "payment_hold_10m",
            "paymentState": "awaiting_hold_10m",
            "slaOrTimer": "Đếm ngược cứng 10:00 (600s)",
            "summary": "Ngay mili-giây khách bấm 'Chọn chào giá & Thanh toán', hệ thống khóa nguyên tử 1 mã phòng vật lý cụ thể (#101–#130) trong 10 phút. Không ai khác (phiên Live cạnh tranh hoặc Lễ tân) có thể click chọn trùng phòng này!",
            "failOrBranch": "Nếu là căn trống cuối cùng: các phiên Live cùng hạng phòng chuyển sang BID_STANDBY_HOLD_CONFLICT (tạm chặn nút TT tối đa 10p).",
        },
        {
            "stage": 6,
            "code": "STAGE_6_KCP_CHECKOUT",
            "title": "6. Xác thực Thẻ / Ví 3DS tại Cổng Ký quỹ NHN KCP",
            "actor": "Du khách & NHN KCP",
            "roomState": "payment_hold",
            "bidState": "payment_hold_10m",
            "paymentState": "processing_webhook / awaiting_hold_10m",
            "slaOrTimer": "Nằm trong cửa sổ 10:00",
            "summary": "Khách nhập thẻ nội địa/quốc tế/ví và xác thực OTP. Áp dụng Payment Recovery Contract: khi trạng thái Pending/Unknown tuyệt đối chặn bấm thanh toán lại chống trừ tiền đúp.",
            "failOrBranch": "Thẻ lỗi/từ chối → REJ_PAYMENT_DECLINED; Khách bấm thoát → REJ_CHECKOUT_ABANDONED; Hết sạch 10:00 → REJ_HOLD_EXPIRED_10M.",
        },
        {
            "stage": 7,
            "code": "STAGE_7_RELEASE_OR_LOCK",
            "title": "7A. Nhả khóa Tức thì (Nếu TT Lỗi/Hết 10p) HOẶC 7B. Khóa Cứng 100% (Nếu TT Thành công)",
            "actor": "Lock Scheduler & PMS Sync",
            "roomState": "vacant_unlocked HOẶC booked_auction",
            "bidState": "payment_failed HOẶC won",
            "paymentState": "hold_timeout_10m / gateway_declined HOẶC captured_escrow",
            "slaOrTimer": "Tức thì (< 500ms sau Webhook / Timeout)",
            "summary": "Nếu thất bại/quá 10p: nhả ngay phòng về Trống mở khóa & mở lại nút TT cho phiên cạnh tranh. Nếu thành công 100%: chuyển phòng sang Đã khóa cứng KCP & tự đóng (SYS_AUTO_CLOSED_SOLDOUT) các phiên trùng đã hết phòng.",
            "failOrBranch": "Đảm bảo 0% Overbooking và 0% chết phòng ảo kéo dài quá 10 phút.",
        },
        {
            "stage": 8,
            "code": "STAGE_8_STAY_OR_MEDICAL",
            "title": "8. Cam kết Lưu trú Hai chiều & Xử lý Ngoại lệ Y tế",
            "actor": "Khách sạn & Du khách & CSKH Optibide",
            "roomState": "booked_auction",
            "bidState": "won",
            "paymentState": "captured_escrow / refunded_medical",
            "slaOrTimer": "Chứng từ y tế ≤ 3 ngày",
            "summary": "Khách nhận phòng đúng hạng đã chốt (cấm thu phụ phí ẩn, cấm hạ hạng/hủy ngang). Tiền giữ an toàn trong tài khoản ký quỹ NHN KCP suốt thời gian lưu trú.",
            "failOrBranch": "Ngoại lệ duy nhất: Sự cố y tế nghiêm trọng có xác nhận bệnh viện nộp ≤ 3 ngày → PAY_REFUNDED_MEDICAL & mở lại phòng.",
        },
        {
            "stage": 9,
            "code": "STAGE_9_SETTLEMENT_REVIEW",
            "title": "9. Check-out, Giải ngân 100% Giá gốc (T+7) & Đánh giá 5 Trụ cột",
            "actor": "NHN KCP, Kế toán KS & Du khách",
            "roomState": "vacant_unlocked (Sau dọn phòng)",
            "bidState": "won",
            "paymentState": "settled_t7",
            "slaOrTimer": "Chu kỳ T+7 sau Check-out",
            "summary": "Xác nhận Check-out hoàn tất → Giải ngân trọn 100% Giá gốc (0% hoa hồng) về ngân hàng thụ hưởng khách sạn. Du khách chấm điểm 5 tiêu chí cập nhật thẳng vào chỉ số ELO.",
            "failOrBranch": "Khép kín vòng đời dữ liệu đưa ngược về huấn luyện AI Auto-Bid kỳ tiếp theo.",
        },
    ],
    "roomStateDefs": [
        {
            "code": "vacant_unlocked",
            "label": "Trống mở khóa (Available)",
            "badgeTone": "sky",
            "canGuestSelectToPay": True,
            "canJoinMultipleAuctions": True,
            "canReceptionistToggle": True,
            "rule": "Sẵn sàng đón khách. Tham gia đồng thời nhiều phiên đấu giá 60p mà không bị giam phòng.",
        },
        {
            "code": "payment_hold",
            "label": "Tạm khóa chờ TT · 10p (Movie-Seat Hold)",
            "badgeTone": "amber",
            "canGuestSelectToPay": False,
            "canJoinMultipleAuctions": False,
            "canReceptionistToggle": False,
            "rule": "Đang giữ độc quyền 600 giây cho 1 khách hoàn tất cổng NHN KCP. Mọi khách khác và lễ tân đều không thể bấm chọn/khóa đè. Tự nhả về Trống nếu quá 10p hoặc lỗi thẻ.",
        },
        {
            "code": "booked_auction",
            "label": "Đã khóa cứng KCP (TT 100%)",
            "badgeTone": "emerald",
            "canGuestSelectToPay": False,
            "canJoinMultipleAuctions": False,
            "canReceptionistToggle": False,
            "rule": "Đã thu đủ 100% qua NHN KCP. Khóa cam kết hai chiều bất khả xâm phạm (chỉ hoàn hủy ngoại lệ y tế ≤3 ngày).",
        },
        {
            "code": "booked_other",
            "label": "Đã khóa OTA / Lễ tân / Bảo trì",
            "badgeTone": "zinc",
            "canGuestSelectToPay": False,
            "canJoinMultipleAuctions": False,
            "canReceptionistToggle": True,
            "rule": "Đã bán qua kênh ngoài (Booking, Agoda, Walk-in) hoặc khóa kỹ thuật. Tách khỏi quỹ phòng đấu giá cho đến khi mở khóa lại.",
        },
    ],
    "rejectTaxonomy": [
        {
            "code": "REJ_PRICE_HIGH",
            "category": "Khách từ chối báo giá (Trước TT)",
            "entity": "BidStatus = rejected",
            "countsInWinRateDenominator": True,
            "roomImpact": "Phòng chưa từng bị khóa (giữ nguyên vacant_unlocked)",
            "description": "Khách mở xem đề xuất nhưng chọn đối thủ cùng hạng có tổng giá thanh toán (×1.265) thấp hơn.",
            "sampleReqId": "CRQ-8937",
        },
        {
            "code": "REJ_MISSING_PERK",
            "category": "Khách từ chối báo giá (Trước TT)",
            "entity": "BidStatus = rejected",
            "countsInWinRateDenominator": True,
            "roomImpact": "Phòng giữ nguyên vacant_unlocked",
            "description": "Điểm AI Match % thấp do thiếu tiện ích mềm trọng yếu (Buffet sáng, Trả phòng trễ 14h, Bồn tắm) không có quà bù đắp.",
            "sampleReqId": "CRQ-8933",
        },
        {
            "code": "REJ_COMPETITOR_FASTER",
            "category": "Khách từ chối báo giá (Trước TT)",
            "entity": "BidStatus = rejected",
            "countsInWinRateDenominator": True,
            "roomImpact": "Phòng giữ nguyên vacant_unlocked",
            "description": "Khách sạn duyệt tay chậm (>5–15p), khách đã bấm khóa tạm 10p và chốt với đối thủ chạy Auto-Bid trước.",
            "sampleReqId": "CRQ-8751",
        },
        {
            "code": "REJ_HOLD_EXPIRED_10M",
            "category": "Thất bại ở bước Khóa tạm 10p & KCP",
            "entity": "BidStatus = payment_failed · Payment = hold_timeout_10m",
            "countsInWinRateDenominator": True,
            "roomImpact": "Tự động nhả phòng payment_hold → vacant_unlocked đúng giây 600",
            "description": "Khách đã bấm giữ phòng 10p nhưng treo màn hình / quá hạn nhập OTP 10 phút. Hệ thống hủy phiên giữ chỗ và mở lại phòng ngay.",
            "sampleReqId": "CRQ-8932",
        },
        {
            "code": "REJ_PAYMENT_DECLINED",
            "category": "Thất bại ở bước Khóa tạm 10p & KCP",
            "entity": "BidStatus = payment_failed · Payment = gateway_declined",
            "countsInWinRateDenominator": True,
            "roomImpact": "Nhả phòng payment_hold → vacant_unlocked tức thì khi nhận mã lỗi KCP",
            "description": "Thẻ không đủ hạn mức, sai 3DS hoặc ngân hàng phát hành từ chối giao dịch trên cổng NHN KCP.",
            "sampleReqId": "CRQ-8928",
        },
        {
            "code": "REJ_CHECKOUT_ABANDONED",
            "category": "Thất bại ở bước Khóa tạm 10p & KCP",
            "entity": "BidStatus = payment_failed · Payment = guest_abandoned_checkout",
            "countsInWinRateDenominator": True,
            "roomImpact": "Nhả phòng payment_hold → vacant_unlocked ngay khi khách bấm Thoát",
            "description": "Khách vào màn hình thanh toán thấy tổng tiền gộp thuế/phí (×1.265) rồi chủ động bấm Hủy/Quay lại trước khi hết 10p.",
            "sampleReqId": "CRQ-8779",
        },
        {
            "code": "EXP_TTL_60M",
            "category": "Hết hạn Sinh tử 60 phút",
            "entity": "BidStatus = expired · Payment = not_started",
            "countsInWinRateDenominator": True,
            "roomImpact": "Phòng giữ nguyên vacant_unlocked · Xóa vĩnh viễn giá chào kín",
            "description": "Đồng hồ báo giá 60:00 chạm 00:00 mà khách không bấm thanh toán. Báo giá tự hủy vĩnh viễn để bảo vệ Rate Parity.",
            "sampleReqId": "CRQ-8935",
        },
        {
            "code": "SYS_AUTO_CLOSED_SOLDOUT",
            "category": "Hệ thống / Khách sạn Chặn & Tự rút",
            "entity": "BidStatus = auto_closed (Không tính trượt)",
            "countsInWinRateDenominator": False,
            "roomImpact": "Phòng cuối cùng đã chuyển sang booked_auction ở đơn thắng",
            "description": "Căn phòng trống cuối cùng vừa được một khách khác thanh toán 100% (hoặc khóa OTA). Hệ thống tự rút các báo giá trùng ngày mà không phạt Win Rate hay ELO.",
            "sampleReqId": "CRQ-8931",
        },
        {
            "code": "PARTNER_DECLINED_REQUEST",
            "category": "Hệ thống / Khách sạn Chặn & Tự rút",
            "entity": "BidStatus = partner_declined (Không tính trượt)",
            "countsInWinRateDenominator": False,
            "roomImpact": "Không khóa phòng",
            "description": "Lễ tân hoặc Quản lý chủ động bấm 'Từ chối nhận phiên' (ví dụ đoàn quá đông, yêu cầu thú cưng hoặc check-in quá sớm không đáp ứng được).",
            "sampleReqId": "CRQ-8930",
        },
        {
            "code": "SYS_REJECTED_FLOOR_GUARDRAIL",
            "category": "Hệ thống / Khách sạn Chặn & Tự rút",
            "entity": "UI/API Pre-Bid Reject (403 Role Guardrail)",
            "countsInWinRateDenominator": False,
            "roomImpact": "Chặn trước khi phát hành Bid",
            "description": "Nhân viên Lễ tân nhập mức Giá gốc thấp hơn Giá sàn bảo vệ của hạng phòng → Hệ thống khóa nút Gửi báo giá (chỉ Quản lý mới có quyền duyệt vượt sàn).",
            "sampleReqId": "CRQ-8941",
        },
        {
            "code": "REQ_REJECTED_NO_MATCH",
            "category": "Hệ thống / Khách sạn Chặn & Tự rút",
            "entity": "RequestStatus = no_matched_hotel",
            "countsInWinRateDenominator": False,
            "roomImpact": "0 phòng khả dụng",
            "description": "Không có khách sạn nào trong khu vực thỏa mãn Hard Rules (Địa bàn + Hạng phòng trống) → Đóng yêu cầu ngay để khách không chờ vô ích.",
            "sampleReqId": "SYSTEM_HARD_FILTER",
        },
    ],
    "scenarioCases": [
        {
            "caseId": "CASE-01",
            "group": "Happy Path",
            "title": "Đặt phòng chuẩn End-to-End (Auto-Bid → Giữ ghế 10p → KCP TT 100% → Giải ngân T+7)",
            "trigger": "Khách gửi yêu cầu ≤4 phòng, ≤8 khách; Auto-Bid chào ngay <1p; khách bấm chọn & hoàn tất OTP trong 2p24s.",
            "roomTransition": "vacant_unlocked → payment_hold (10p) → booked_auction → vacant_unlocked (sau Check-out)",
            "bidAndPayment": "bid_sent → payment_hold_10m → won | awaiting_hold_10m → captured_escrow → settled_t7",
            "sampleReqId": "CRQ-8940",
        },
        {
            "caseId": "CASE-02",
            "group": "10-Min Seat Lock",
            "title": "Đang giữ phòng 10p chờ thanh toán — Chặn khách thứ 2 bấm chọn trùng (Movie-Seat Rule)",
            "trigger": "Chỉ còn 1 căn Executive (#130). Khách #CRQ-8944 bấm thanh toán lúc 19:43 → Khóa tạm #130 trong 10p. Khách #CRQ-8942 cùng hạng phòng mở xem cùng lúc.",
            "roomTransition": "#130: vacant_unlocked → payment_hold (đếm ngược 10:00 → 08:15)",
            "bidAndPayment": "#CRQ-8944: payment_hold_10m | #CRQ-8942: standby_hold_conflict (Nút TT bị khóa tạm thời ≤10p)",
            "sampleReqId": "CRQ-8944",
        },
        {
            "caseId": "CASE-03",
            "group": "10-Min Seat Lock",
            "title": "Race Condition: 2 du khách bấm 'Chọn & Thanh toán' căn phòng cuối cùng trong cùng 1 mili-giây",
            "trigger": "2 request đồng thời gọi API giữ phòng #130. Redis/DB Atomic Lock cấp quyền cho Request đến trước 1ms.",
            "roomTransition": "Chỉ 1 giao dịch nhận khóa payment_hold (600s); giao dịch thứ 2 nhận mã 409 ROOM_TEMPORARILY_HELD",
            "bidAndPayment": "Khách 1 vào cổng KCP bình thường; Khách 2 thấy thông báo 'Phòng vừa được khách khác giữ chờ thanh toán (tối đa 10 phút)'",
            "sampleReqId": "CRQ-8942",
        },
        {
            "caseId": "CASE-04",
            "group": "10-Min Seat Lock",
            "title": "Hết hạn 10 phút giữ phòng (Timeout 00:00) → Tự động nhả phòng & Mở lại phiên cạnh tranh",
            "trigger": "Khách giữ phòng #119 (hoặc #130) nhưng treo máy quá 600 giây không hoàn tất OTP trên NHN KCP.",
            "roomTransition": "payment_hold → vacant_unlocked (tự động giải phóng ngay giây thứ 600)",
            "bidAndPayment": "Bid → payment_failed (REJ_HOLD_EXPIRED_10M) | Payment → hold_timeout_10m | Phiên cạnh tranh mở khóa lại nút TT!",
            "sampleReqId": "CRQ-8932",
        },
        {
            "caseId": "CASE-05",
            "group": "Payment Failure",
            "title": "Thẻ bị từ chối / Sai 3DS trên cổng NHN KCP → Giải phóng khóa tạm trước 10 phút",
            "trigger": "Webhook KCP trả mã lỗi thẻ không đủ hạn mức / từ chối giao dịch ở phút thứ 4.",
            "roomTransition": "payment_hold → vacant_unlocked ngay tức thì (không cần chờ hết 6 phút còn lại)",
            "bidAndPayment": "Bid → payment_failed (REJ_PAYMENT_DECLINED) | Payment → gateway_declined",
            "sampleReqId": "CRQ-8928",
        },
        {
            "caseId": "CASE-06",
            "group": "Payment Failure",
            "title": "Khách chủ động bấm Hủy / Thoát màn hình Checkout KCP giữa chừng",
            "trigger": "Khách do dự tổng giá ×1.265 và bấm nút Quay lại/Hủy phiên thanh toán ở phút thứ 3.",
            "roomTransition": "payment_hold → vacant_unlocked ngay lập tức",
            "bidAndPayment": "Nếu khách chọn hủy hẳn: REJ_CHECKOUT_ABANDONED; nếu còn hạn 60p và khách chỉ quay lại danh sách: Bid về lại bid_sent.",
            "sampleReqId": "CRQ-8779",
        },
        {
            "caseId": "CASE-07",
            "group": "Payment Safety",
            "title": "Đứt mạng sau khi nhập OTP (Trạng thái KCP Pending / Unknown — Chống trừ tiền đúp)",
            "trigger": "Khách đã bấm xác nhận OTP nhưng rớt mạng trước khi trình duyệt nhận trang kết quả.",
            "roomTransition": "Giữ bảo vệ payment_hold cho đến khi Worker đối soát KCP trả kết quả cuối cùng",
            "bidAndPayment": "Payment = processing_webhook: Khóa cứng nút 'Thanh toán lại' để chống thu tiền 2 lần (Payment Recovery Contract).",
            "sampleReqId": "CRQ-8944",
        },
        {
            "caseId": "CASE-08",
            "group": "Zero Overbooking",
            "title": "Khách TT 100% căn phòng cuối cùng → Tự động rút thầu (Auto-Close) các phiên trùng ngày",
            "trigger": "Khách #CRQ-8938 hoàn tất TT 100% khóa căn Family Suite cuối cùng (#125); phiên #CRQ-8931 đang mở cùng ngày.",
            "roomTransition": "#125: payment_hold → booked_auction (0 phòng trống còn lại cho ngày 06/11–08/11)",
            "bidAndPayment": "#CRQ-8938 → won | #CRQ-8931 → auto_closed (SYS_AUTO_CLOSED_SOLDOUT — không tính trượt Win Rate/ELO)",
            "sampleReqId": "CRQ-8931",
        },
        {
            "caseId": "CASE-09",
            "group": "PMS Conflict",
            "title": "Lễ tân bấm khóa thủ công (hoặc đồng bộ OTA) khi phòng đang bị Tạm khóa TT 10p",
            "trigger": "Khách vãng lai đến quầy hỏi phòng #130 đúng lúc #130 đang ở trạng thái payment_hold (còn 08:15).",
            "roomTransition": "Hệ thống CHẶN thao tác khóa đè lên #130 trong 10p để bảo vệ khách đang nhập thẻ KCP",
            "bidAndPayment": "Hiển thị cảnh báo rõ mã phiên & số giây đếm ngược còn lại trên sơ đồ 30 buồng PMS.",
            "sampleReqId": "CRQ-8944",
        },
        {
            "caseId": "CASE-10",
            "group": "Guest Reject",
            "title": "Khách từ chối trực tiếp do Giá chào cao hơn đối thủ cùng hạng (REJ_PRICE_HIGH)",
            "trigger": "Khách mở xem thẻ báo giá nhưng chọn khách sạn 4★ lân cận có giá gốc thấp hơn 200k–250k/đêm.",
            "roomTransition": "Phòng chưa từng bị khóa (giữ nguyên vacant_unlocked suốt phiên)",
            "bidAndPayment": "Bid → rejected (REJ_PRICE_HIGH) | Đưa vào biểu đồ Pareto & AI Loss Autopsy để gợi ý hạ sàn/tặng quà.",
            "sampleReqId": "CRQ-8937",
        },
        {
            "caseId": "CASE-11",
            "group": "Guest Reject",
            "title": "Khách từ chối do Thiếu tiện nghi / Đặc quyền mềm (REJ_MISSING_PERK)",
            "trigger": "Khách cần Bữa sáng & Late Check-out nhưng báo giá gói cơ bản chỉ đạt Match 79–82%.",
            "roomTransition": "Phòng giữ nguyên vacant_unlocked",
            "bidAndPayment": "Bid → rejected (REJ_MISSING_PERK) | Gợi ý bật quy tắc tự động tặng Buffet sáng (~90k).",
            "sampleReqId": "CRQ-8933",
        },
        {
            "caseId": "CASE-12",
            "group": "Expiry 60m",
            "title": "Quá hạn đồng hồ sinh tử 60 phút không phát sinh thanh toán (EXP_TTL_60M)",
            "trigger": "Đồng hồ báo giá One-Shot đếm lùi từ 60:00 về 00:00 mà khách không chọn.",
            "roomTransition": "Phòng giữ nguyên vacant_unlocked",
            "bidAndPayment": "Bid → expired (EXP_TTL_60M) | Xóa vĩnh viễn mức giá ưu đãi, không cho khôi phục để bảo vệ Rate Parity.",
            "sampleReqId": "CRQ-8935",
        },
        {
            "caseId": "CASE-13",
            "group": "Expiry vs Hold",
            "title": "Khách bấm Giữ phòng 10p ở phút thứ 58 của phiên 60p (Grace Window Extension)",
            "trigger": "Phiên 60p chỉ còn 02:00 nhưng khách bấm 'Chọn & Thanh toán' hợp lệ trước khi hết giờ.",
            "roomTransition": "Phòng chuyển sang payment_hold trọn vẹn tối đa 10:00 để khách kịp hoàn tất OTP ngân hàng",
            "bidAndPayment": "Nếu thành công trong 10p → won; nếu thất bại sau mốc 60p gốc → đóng phiên ngay (expired/payment_failed).",
            "sampleReqId": "CRQ-8941",
        },
        {
            "caseId": "CASE-14",
            "group": "Guardrail & RBAC",
            "title": "Lễ tân nhập giá dưới Sàn bảo vệ (Floor Guardrail Reject) vs. Quản lý duyệt vượt sàn",
            "trigger": "Ca tối Lễ tân nhập 700k (< sàn 750k Superior) trong Custom Bid Modal.",
            "roomTransition": "Không đổi",
            "bidAndPayment": "Vai trò Lễ tân: khóa cứng nút Gửi (SYS_REJECTED_FLOOR_GUARDRAIL). Vai trò Quản lý: hiện hộp xác nhận Override có ghi Audit Log.",
            "sampleReqId": "CRQ-8941",
        },
        {
            "caseId": "CASE-15",
            "group": "Partner Reject",
            "title": "Đoàn lớn (>4 phòng hoặc >8 khách) bị Auto-Bid chặn & Khách sạn chủ động Từ chối phiên",
            "trigger": "Đoàn 10 khách (5 phòng) mang thú cưng gửi yêu cầu; Auto-Bid tự chặn và đẩy sang duyệt tay; KS bấm Từ chối.",
            "roomTransition": "Không khóa phòng",
            "bidAndPayment": "Bid → partner_declined (PARTNER_DECLINED_REQUEST — loại trừ khỏi mẫu số tỷ lệ thắng của KS).",
            "sampleReqId": "CRQ-8930",
        },
        {
            "caseId": "CASE-16",
            "group": "Hard Filter",
            "title": "0 khách sạn khớp điều kiện cứng Khu vực / Hạng phòng (REQ_REJECTED_NO_MATCH)",
            "trigger": "Du khách tìm hạng Villa/Suite tại khu vực đã kín 100% phòng trong ngày D0.",
            "roomTransition": "Không tác động",
            "bidAndPayment": "Request đóng tức thì (cancelledNoMatchedHotel) — khách nhận thông báo đổi ngày/hạng phòng ngay lập tức.",
            "sampleReqId": "SYSTEM_HARD_FILTER",
        },
        {
            "caseId": "CASE-17",
            "group": "Post-Paid Exception",
            "title": "Hoàn tiền ngoại lệ Sự cố Y tế bất khả kháng sau khi đã khóa cứng KCP (≤ 3 ngày)",
            "trigger": "Khách nhập viện cấp cứu nộp giấy xác nhận bệnh viện hợp lệ cho Optibide trong vòng 3 ngày.",
            "roomTransition": "booked_auction → vacant_unlocked (mở bán lại các đêm được duyệt hủy)",
            "bidAndPayment": "Payment: captured_escrow → refunded_medical | Khấu trừ minh bạch trên thẻ Thực nhận ròng KS.",
            "sampleReqId": "CRQ-8835",
        },
        {
            "caseId": "CASE-18",
            "group": "Settlement & ELO",
            "title": "Hoàn tất Check-out → Đối soát giải ngân 100% Giá gốc (T+7) & Cập nhật điểm ELO",
            "trigger": "Khách trả phòng suôn sẻ, chấm đánh giá 5 trụ cột (★4.8) và đến kỳ thanh toán NHN KCP T+7.",
            "roomTransition": "booked_auction → vacant_unlocked (sau ca buồng phòng dọn sạch)",
            "bidAndPayment": "Payment: captured_escrow → settled_t7 (100% Base Price về Vietcombank KS, 0% phí hoa hồng).",
            "sampleReqId": "CRQ-8868",
        },
    ],
}

# 13. SCHEMA MANIFEST (v2.6.0 — 12 Normalized Master Data Tables)
schema_manifest = {
    "schemaVersion": "2.6.0",
    "architecture": "goodNstay 10-Min Movie-Seat Payment Hold • 0% Hotel Commission • 1.265x Guest Total • Full Lifecycle",
    "generatedAt": "2026-11-06T19:45:00+07:00",
    "primaryReferenceDate": "2026-11-06",
    "tables": {
        "hotelProfile": {"file": "hotel_profile.json", "pk": "hotelId", "description": "Cấu hình khách sạn, TTL 60p báo giá + TTL 10p giữ phòng TT, phí 15% + VAT 10%, ELO & Review"},
        "usersRoles": {"file": "users_roles.json", "pk": "userId", "description": "Phân quyền RBAC Quản lý vs. Lễ tân"},
        "perksCatalog": {"file": "perks_catalog.json", "pk": "id", "description": "Danh mục đặc quyền mềm bù đắp điểm khớp"},
        "roomClasses": {"file": "room_classes.json", "pk": "id", "description": "4 hạng phòng gốc (Tổng 30 phòng vật lý)"},
        "roomsPms": {"file": "rooms_pms.json", "pk": "roomNumber", "fk": "roomClassId -> roomClasses.id", "description": "4 trạng thái thực tế (vacant_unlocked, payment_hold 10p, booked_auction, booked_other) của 30 phòng #101-#130"},
        "calendar14dPms": {"file": "calendar_14d_pms.json", "pk": "dayOffset", "description": "Lịch tồn kho 14 ngày vàng 4 lớp trạng thái (06/11 - 19/11/2026)"},
        "systemBenchmarks": {"file": "system_benchmarks.json", "pk": "regionName", "description": "Dữ liệu chuẩn so sánh toàn sàn Đà Nẵng & 5 nhóm nguyên nhân Pareto"},
        "auctionSessions": {"file": "auction_sessions.json", "pk": "id", "fk": "matchedRoomClassId -> roomClasses.id", "description": "Bảng giao dịch đa trạng thái (Request / Bid / Payment / Reject) gồm 5 phiên Live + 72 phiên lịch sử"},
        "matchBreakdowns": {"file": "match_breakdowns.json", "pk": "reqId", "description": "Chi tiết chấm điểm Hard Rules & Soft Rules AI Match %"},
        "lossAutopsies": {"file": "loss_autopsies.json", "pk": "id", "description": "Hồ sơ đối chiếu mổ xẻ phiên trượt & quá hạn giữ phòng 10p"},
        "botRules": {"file": "bot_rules.json", "pk": "ruleId", "description": "Các quy tắc Auto-Bid đang kích hoạt"},
        "lifecycleCatalog": {"file": "lifecycle_catalog.json", "pk": "version", "description": "Đặc tả 9 giai đoạn vòng đời, từ điển 4 trạng thái phòng, 11 mã Reject & 18 kịch bản nghiệp vụ"},
    },
}

# Populate exact baselineHotelWins per roomClassBenchmark
for b in system_benchmarks["roomClassBenchmarks"]:
    rcid = b["roomClassId"]
    b["baselineHotelWins"] = {
        pkey: sum(
            1
            for s in auction_sessions
            if s["status"] == "won"
            and s["matchedRoomClassId"] == rcid
            and system_benchmarks["periodsMeta"][pkey]["startDate"]
            <= s["sessionDate"]
            <= system_benchmarks["periodsMeta"][pkey]["endDate"]
        )
        for pkey in ("today", "7d", "30d")
    }

# Strict Foreign Key Integrity Assertions
all_session_ids = {s["id"] for s in auction_sessions}
all_class_ids = {rc["id"] for rc in room_classes}
for r in rooms_pms:
    assert r["roomClassId"] in all_class_ids, f"Invalid roomClassId {r['roomClassId']}"
    if r["linkedReqId"] is not None:
        assert r["linkedReqId"] in all_session_ids, f"Broken FK rooms_pms.linkedReqId={r['linkedReqId']}"
for c in calendar_14d_pms:
    assert c["otherBooked"] + c["auctionBooked"] + c["paymentHoldRooms"] + c["vacantRooms"] == 30
    if c.get("linkedReqId") is not None:
        assert c["linkedReqId"] in all_session_ids, f"Broken FK calendar_14d_pms.linkedReqId={c['linkedReqId']}"

files_to_write = {
    "hotel_profile.json": hotel_profile,
    "users_roles.json": users_roles,
    "perksCatalog.json" if False else "perks_catalog.json": perks_catalog,
    "room_classes.json": room_classes,
    "rooms_pms.json": rooms_pms,
    "calendar_14d_pms.json": calendar_14d_pms,
    "system_benchmarks.json": system_benchmarks,
    "auction_sessions.json": auction_sessions,
    "match_breakdowns.json": match_breakdowns,
    "loss_autopsies.json": loss_autopsies,
    "bot_rules.json": bot_rules,
    "lifecycle_catalog.json": lifecycle_catalog,
    "schema_manifest.json": schema_manifest,
}

for fname, payload in files_to_write.items():
    out_path = os.path.join(BASE_DIR, fname)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    shutil.copyfile(out_path, os.path.join(SEED_DIR, fname))

# Verification summary printout
completed_bid_statuses = {"won", "rejected", "payment_failed", "expired"}
hist_bids = [s for s in auction_sessions if s["status"] in completed_bid_statuses]
for pkey, start_d in [("today", "2026-11-06"), ("7d", "2026-10-31"), ("30d", "2026-10-08")]:
    sub = [s for s in hist_bids if start_d <= s["sessionDate"] <= "2026-11-06"]
    wins = [s for s in sub if s["status"] == "won"]
    base_rev = sum(s["hotelEarnedBase"] for s in wins)
    med_ref = sum(s.get("medicalRefund", 0) for s in wins)
    net_rev = base_rev - med_ref
    nights = sum(s["nights"] for s in wins)
    print(
        f"[{pkey}] Bids={len(sub)}, Wins={len(wins)}, WinRate={len(wins)/len(sub)*100:.1f}%, "
        f"BaseRev={base_rev:,}đ, MedRefund={med_ref:,}đ, NetReceive={net_rev:,}đ, Nights={nights}"
    )

losses_30d = [s for s in hist_bids if s["status"] != "won"]
by_reason = {}
for s in losses_30d:
    r = s.get("lossReasonId", "other")
    by_reason[r] = by_reason.get(r, 0) + 1
print("Losses 30d breakdown:", by_reason, "Total losses:", len(losses_30d))
print(
    "Rooms PMS count:", len(rooms_pms),
    "Other:", sum(1 for r in rooms_pms if r["status"] == "booked_other"),
    "AuctionPaid:", sum(1 for r in rooms_pms if r["status"] == "booked_auction"),
    "PaymentHold10m:", sum(1 for r in rooms_pms if r["status"] == "payment_hold"),
    "VacantUnlocked:", sum(1 for r in rooms_pms if r["status"] == "vacant_unlocked"),
)
print("100% Foreign Key & Mathematical Integrity Verified (v2.6)!")
