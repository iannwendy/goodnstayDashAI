#!/usr/bin/env python3
"""
Generates normalized Master Data JSON tables (v2.5 Pay-to-Lock & 0% Hotel Commission)
for goodNstay Partner Auction Dashboard v2, plus seed backup copies.
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


# 1. HOTEL PROFILE
hotel_profile = {
    "hotelId": "HTL-DN-024",
    "brandName": "goodNstay",
    "brandSuffix": "Partner Studio",
    "version": "v2.7",
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
    "payoutCycleLabel": "Đối soát T+7 (Ký quỹ tự động)",
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
    "branches": [
        {
            "id": "br_mykhe",
            "shortName": "CN Mỹ Khê",
            "name": "L'amour Mỹ Khê · Sơn Trà",
            "district": "Phước Mỹ, Sơn Trà",
            "totalRooms": 12,
            "previousPeriodRevenue": {
                "today": 4600000,
                "7d": 7200000,
                "30d": 20200000,
            },
        },
        {
            "id": "br_songhan",
            "shortName": "CN Sông Hàn",
            "name": "L'amour Sông Hàn · Hải Châu",
            "district": "Bạch Đằng, Hải Châu",
            "totalRooms": 10,
            "previousPeriodRevenue": {
                "today": 2500000,
                "7d": 13100000,
                "30d": 20400000,
            },
        },
        {
            "id": "br_anthuong",
            "shortName": "CN An Thượng",
            "name": "L'amour An Thượng · Ngũ Hành Sơn",
            "district": "Mỹ An, Ngũ Hành Sơn",
            "totalRooms": 8,
            "previousPeriodRevenue": {
                "today": 2700000,
                "7d": 4900000,
                "30d": 14000000,
            },
        },
    ],
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
        "shift": "Ca điều hành • Toàn quyền duyệt giá dưới sàn",
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

# 5. ROOMS PMS (30 physical rooms #101-#130 for tonight 2026-11-06)
# Counts:
# sup (10): 5 booked_other, 2 booked_auction (#106 CRQ-8939 today, #107 CRQ-8921 stayover 05/11-07/11), 3 vacant_unlocked (#108-#110)
# dlx (10): 5 booked_other, 3 booked_auction (#116 CRQ-8940 today, #117 CRQ-8936 today, #118 CRQ-8915 stayover 05/11-07/11), 2 vacant_unlocked (#119-#120)
# fsuite (6): 4 booked_other, 2 booked_auction (#125 CRQ-8938 today, #126 CRQ-8904 stayover 05/11-07/11), 0 vacant_unlocked (SOLD OUT!)
# osuite (4): 2 booked_other, 1 booked_auction (#129 CRQ-8934 today), 1 vacant_unlocked (#130 -> competing in 2 live sessions!)
# Totals: 16 booked_other + 8 booked_auction = 24 locked (80%), 6 vacant_unlocked!
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
        "checkOutTomorrow": idx in (0, 5),
    })

# Executive Ocean Suite #127-#130
for idx, rno in enumerate(range(127, 131)):
    if idx < 2:
        st, ch, req = "booked_other", other_sources[idx], None
        hold_rem, hold_tot = None, None
    elif idx == 2:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8934"
        hold_rem, hold_tot = None, None
    else:
        # Room #130: Currently in 10-minute temporary payment lock (Movie-Seat Hold) by CRQ-8944!
        st, ch, req = "payment_hold", "Tạm khóa chờ TT 10p", "CRQ-8944"
        hold_rem, hold_tot = 495, 600
    room_entry = {
        "roomNumber": rno,
        "floor": 6,
        "roomClassId": "osuite",
        "roomClass": "Executive Ocean Suite",
        "category": "Executive",
        "status": st,
        "sourceChannel": ch,
        "linkedReqId": req,
        "checkOutTomorrow": idx == 0,
    }
    if hold_rem is not None:
        room_entry["holdRemainingSeconds"] = hold_rem
        room_entry["holdTotalSeconds"] = hold_tot
    rooms_pms.append(room_entry)

# 6. 14-DAY INVENTORY CALENDAR (06/11/2026 - 19/11/2026)
weekday_vn = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]
cal_rows_plan = [
    # (offset, otherBooked, auctionBooked, paymentHoldRooms, policyShort, linkedReqId)
    (0, 16, 8, 1, "Xả phòng đêm sau 20h00 (-15% sàn nếu còn trống)", "CRQ-8944"),
    (1, 18, 6, 1, "Cuối tuần cầu cao • Giữ biên +15% trên giá sàn", "CRQ-8942"),
    (2, 17, 5, 0, "Chủ nhật trả phòng đông • Kèm ưu đãi Late Check-out", "CRQ-8944"),
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

# 7. SYSTEM BENCHMARKS & PERIOD BASELINES (Da Nang Market Data from services.goodnstay.com)
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
            "shortName": "Phản hồi chậm / Quá 60p",
            "color": "#f59e0b",
            "actionHint": "Luôn bật Auto-Bid ca trưa & sau 22h00 đêm",
        },
        {
            "id": "missing_perk",
            "shortName": "Thiếu Bữa sáng / Late C/O",
            "color": "#52525b",
            "actionHint": "Đính kèm đặc quyền mềm 0đ–90k khi độ khớp <90%",
        },
        {
            "id": "payment_abandoned",
            "shortName": "Hết hạn giữ 10p / Lỗi TT",
            "color": "#a1a1aa",
            "actionHint": "Phòng tự mở lại sau 10p tạm khóa nên không thiệt hại công suất",
        },
    ],
}

# 8. AUCTION SESSIONS MASTER FACT TABLE (4 live + 68 historical bids = 72 records)
auction_sessions = [
    # --- 4 ACTIVE LIVE SESSIONS ON 06/11/2026 ---
    {
        "id": "CRQ-8941",
        "status": "live",
        "requestStatus": "bidding_open",
        "bidStatus": "pending_quote",
        "paymentStatus": "not_started",
        "sessionDate": "2026-11-06",
        "timeLabel": "19:38",
        "timeSlot": "evening_peak",
        "remainingSeconds": 1145,
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
        "id": "CRQ-8942",
        "status": "live",
        "requestStatus": "bidding_open",
        "bidStatus": "pending_quote",
        "paymentStatus": "not_started",
        "sessionDate": "2026-11-06",
        "timeLabel": "19:31",
        "timeSlot": "evening_peak",
        "remainingSeconds": 512,
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
    },
    {
        "id": "CRQ-8943",
        "status": "live",
        "requestStatus": "bidding_open",
        "bidStatus": "pending_quote",
        "paymentStatus": "not_started",
        "sessionDate": "2026-11-06",
        "timeLabel": "19:40",
        "timeSlot": "evening_peak",
        "remainingSeconds": 2480,
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
    {
        "id": "CRQ-8944",
        "status": "live",
        "requestStatus": "checkout_hold_10m",
        "bidStatus": "payment_hold_10m",
        "paymentStatus": "awaiting_hold_10m",
        "holdRoomNumber": 130,
        "holdRemainingSeconds": 495,
        "holdTotalSeconds": 600,
        "sessionDate": "2026-11-06",
        "timeLabel": "19:42",
        "timeSlot": "evening_peak",
        "remainingSeconds": 2910,
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
            "submittedAtText": "Khách đang tạm khóa #130 chờ TT (10p)",
            "mode": "quick",
        },
    },
]

# --- TODAY'S 5 PAID WINS ON 2026-11-06 (Sum Base = 11,850,000đ, Total Nights = 10 -> ADR = 1,185,000đ) ---
# 1) CRQ-8940: dlx, 2 đêm x 1,050,000 = 2,100,000
# 2) CRQ-8939: sup, 2 đêm x   825,000 = 1,650,000
# 3) CRQ-8938: fsuite, 2 đêm x 1,750,000 = 3,500,000
# 4) CRQ-8936: dlx, 2 đêm x 1,025,000 = 2,050,000
# 5) CRQ-8934: osuite, 2 đêm x 1,275,000? Wait: osuite floor is 1,850,000! Let's make nights = 10 cleanly with realistic prices:
# Let's check:
# 1) CRQ-8940: dlx, 2 đêm x 1,050,000 = 2,100,000 (2 đêm)
# 2) CRQ-8939: sup, 2 đêm x   800,000 = 1,600,000 (2 đêm)
# 3) CRQ-8938: fsuite, 2 đêm x 1,700,000 = 3,400,000 (2 đêm)
# 4) CRQ-8936: dlx, 3 đêm x   950,000 = 2,850,000 (3 đêm)
# 5) CRQ-8934: osuite, 1 đêm x 1,900,000 = 1,900,000 (1 đêm)
# Check sum: 2,100,000 + 1,600,000 + 3,400,000 + 2,850,000 + 1,900,000 = 11,850,000đ EXACTLY!
# Check nights: 2 + 2 + 2 + 3 + 1 = 10 đêm EXACTLY! ADR = 11,850,000 / 10 = 1,185,000đ/đêm!

today_won_rows = [
    {
        "id": "CRQ-8940",
        "status": "won",
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
        "speedNote": {"text": "Auto-Bid chốt nhanh", "tone": "fast"},
        "lockedRoomNumber": 116,
        "resultNote": "Đã TT 100% • Khóa #116",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8939",
        "status": "won",
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
        "speedNote": {"text": "TT 100% tức thì", "tone": "fast"},
        "lockedRoomNumber": 106,
        "resultNote": "Đã TT 100% • Khóa #106",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8938",
        "status": "won",
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
        "speedNote": {"text": "Khóa căn Suite cuối", "tone": "fast"},
        "lockedRoomNumber": 125,
        "resultNote": "Đã TT 100% • Khóa #125",
        "autopsyId": "CRQ-8918",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8936",
        "status": "won",
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
        "speedNote": {"text": "Chốt <2p • Có thể nhích +50k", "tone": "underpriced"},
        "lockedRoomNumber": 117,
        "resultNote": "Đã TT 100% • Khóa #117",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8934",
        "status": "won",
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
        "speedNote": {"text": "Tặng kèm Trà chiều", "tone": "fast"},
        "lockedRoomNumber": 129,
        "resultNote": "Đã TT 100% • Khóa #129",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
]

# --- TODAY & YESTERDAY FEATURED LOSS / HISTORY ROWS ---
featured_loss_rows = [
    {
        "id": "CRQ-8937",
        "status": "rejected",
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
        "resultNote": "Giá gốc cao hơn đối thủ 200k • Phòng vẫn mở",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8935",
        "status": "expired",
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
        "resultNote": "Quá hạn 60p khách không TT • Tự giải phóng",
        "autopsyId": "CRQ-8909",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8933",
        "status": "rejected",
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
        "resultNote": "Thiếu gói Bữa sáng đi kèm • Phòng vẫn mở",
        "autopsyId": "CRQ-8918",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8932",
        "status": "rejected",
        "sessionDate": "2026-11-06",
        "timeLabel": "07:55",
        "dateTimeLabel": "06/11 • 07:55",
        "timeSlot": "off_peak",
        "stayDatesLabel": "06/11–07/11 (1 đêm)",
        "guestRequestTitle": "1 khách lẻ công tác • Cần ở gần sân bay",
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
        "matchScore": 86,
        "bidMode": "auto",
        "responseMinutes": 0.9,
        "guestOpenedDetail": True,
        "closeMinutes": 11.0,
        "closeSpeedText": "11p 00s",
        "lossReasonId": "payment_abandoned",
        "resultNote": "Khách đổi lịch bay • Không khóa phòng",
        "autopsyId": "CRQ-8924",
        "showInHistory": False,
    },
    # Yesterday 05/11 notable autopsy cases shown in History Table
    {
        "id": "CRQ-8924",
        "status": "rejected",
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
        "resultNote": "Đối thủ chào 2.050k + Trà chiều",
        "autopsyId": "CRQ-8924",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8918",
        "status": "rejected",
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
        "resultNote": "Chào phòng chưa kèm Buffet sáng",
        "autopsyId": "CRQ-8918",
        "showInHistory": True,
    },
    {
        "id": "CRQ-8909",
        "status": "expired",
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
        "resultNote": "Ca đêm gửi sau 31p • Khách đã chốt KS khác",
        "autopsyId": "CRQ-8909",
        "showInHistory": True,
    },
]

auction_sessions.extend(today_won_rows)
auction_sessions.extend(featured_loss_rows)

# Now let's generate the remaining historical sessions across 2026-10-08 .. 2026-11-05
# Target totals across 30d (2026-10-08 .. 2026-11-06):
# Total historical bids = 68:
#   - Won = 29 (5 today + 24 prior days)
#   - Losses = 39:
#       price_high = 16 (already have 2: CRQ-8937, CRQ-8924 -> need 14 more)
#       slow_response = 11 (already have 2: CRQ-8935, CRQ-8909 -> need 9 more)
#       missing_perk = 8 (already have 2: CRQ-8933, CRQ-8918 -> need 6 more)
#       payment_abandoned = 4 (already have 1: CRQ-8932 -> need 3 more)
# Let's check count so far: 5 won + 7 loss = 12 historical sessions.
# Remaining needed: 24 won + 32 loss = 56 sessions! Total = 12 + 56 = 68!

prior_wins_spec = [
    # 7d window includes 2026-10-31 .. 2026-11-05 (let's put 8 wins in Oct 31 - Nov 5 so 7d has 5 + 8 = 13 wins!)
    # Wait: let's also ensure every day in 14-day trend (2026-10-24 .. 2026-11-06) has realistic daily revenue & orders!
    ("CRQ-8921", "2026-11-05", "17:20", "sup", "Superior", "Superior Double", 2, 810000, "auto", 0, True),
    ("CRQ-8915", "2026-11-05", "10:40", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1020000, "auto", 0, True),
    ("CRQ-8904", "2026-11-04", "19:05", "fsuite", "Suite", "Family Connecting Suite", 2, 1720000, "manual", 0, False),
    ("CRQ-8899", "2026-11-04", "12:15", "sup", "Superior", "Superior Double", 1, 830000, "auto", 0, False),
    ("CRQ-8892", "2026-11-03", "20:10", "dlx", "Deluxe", "Deluxe Twin City View", 2, 990000, "auto", 0, False),
    ("CRQ-8886", "2026-11-02", "15:30", "osuite", "Executive", "Executive Ocean Suite", 2, 1950000, "manual", 0, False),
    ("CRQ-8880", "2026-11-01", "18:25", "sup", "Superior", "Superior Double", 2, 820000, "auto", 0, False),
    ("CRQ-8874", "2026-10-31", "11:50", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1040000, "auto", 0, False),
    # Oct 24 - Oct 30 (for 14-day chart continuity: 24/10 - 06/11)
    ("CRQ-8868", "2026-10-30", "19:15", "sup", "Superior", "Superior Double", 2, 800000, "auto", 0, False),
    ("CRQ-8862", "2026-10-29", "14:10", "fsuite", "Suite", "Family Connecting Suite", 2, 1680000, "manual", 0, False),
    ("CRQ-8857", "2026-10-28", "20:05", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1000000, "auto", 0, False),
    ("CRQ-8851", "2026-10-27", "12:40", "sup", "Superior", "Superior Double", 2, 790000, "auto", 0, False),
    ("CRQ-8846", "2026-10-26", "17:50", "osuite", "Executive", "Executive Ocean Suite", 2, 1920000, "manual", 0, False),
    ("CRQ-8841", "2026-10-25", "16:05", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1030000, "auto", 0, False),
    ("CRQ-8838", "2026-10-25", "11:20", "sup", "Superior", "Superior Double", 1, 820000, "auto", 0, False),
    ("CRQ-8836", "2026-10-24", "19:30", "dlx", "Deluxe", "Deluxe Twin City View", 2, 1010000, "manual", 0, False),
    # Earlier in 30d window (Oct 08 - Oct 23)
    ("CRQ-8835", "2026-10-19", "15:00", "sup", "Superior", "Superior Double", 2, 850000, "auto", 0, False),
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

class_room_pools = {
    "sup": [101, 102, 103, 104, 105, 108, 109, 110],
    "dlx": [111, 112, 113, 114, 115, 119, 120],
    "fsuite": [121, 122, 123, 124],
    "osuite": [127, 128, 130],
}
class_room_cursors = {k: 0 for k in class_room_pools}

for cid, sdate, tlabel, rcid, rcat, rname, nights, bprice, bmode, _unused, show_hist in prior_wins_spec:
    earned = bprice * nights
    d_short = f"{sdate[8:10]}/{sdate[5:7]}"
    slot = "lunch_peak" if 11 <= int(tlabel[:2]) <= 13 else ("evening_peak" if 18 <= int(tlabel[:2]) <= 22 else "off_peak")
    if cid in stayover_room_map:
        locked_rno, stay_lbl = stayover_room_map[cid]
        note = f"Đã TT 100% • Đang lưu trú #{locked_rno}"
    else:
        pool = class_room_pools[rcid]
        locked_rno = pool[class_room_cursors[rcid] % len(pool)]
        class_room_cursors[rcid] += 1
        ci_dt = date.fromisoformat(sdate)
        co_dt = ci_dt + timedelta(days=nights)
        stay_lbl = f"{ci_dt.strftime('%d/%m')}–{co_dt.strftime('%d/%m')} ({nights} đêm)"
        note = f"Đã TT 100% • Khóa #{locked_rno}"
    auction_sessions.append({
        "id": cid,
        "status": "won",
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
        "matchScore": 93 if rcid in ("sup", "dlx") else 95,
        "bidMode": bmode,
        "responseMinutes": 0.9 if bmode == "auto" else 4.8,
        "guestOpenedDetail": True,
        "closeMinutes": 3.5,
        "closeSpeedText": "03p 30s",
        "lockedRoomNumber": locked_rno,
        "resultNote": note,
        "autopsyId": "CRQ-8924",
        "showInHistory": show_hist,
    })

# Remaining 32 loss rows:
# Reasons needed: price_high (14), slow_response (9), missing_perk (6), payment_abandoned (3) = 32
loss_reasons_pool = (
    ["price_high"] * 14
    + ["slow_response"] * 9
    + ["missing_perk"] * 6
    + ["payment_abandoned"] * 3
)
assert len(loss_reasons_pool) == 32

class_cycle = [
    ("sup", "Superior", "Superior Double", 860000),
    ("dlx", "Deluxe", "Deluxe Twin City View", 1120000),
    ("fsuite", "Suite", "Family Connecting Suite", 1890000),
    ("osuite", "Executive", "Executive Ocean Suite", 2240000),
    ("sup", "Superior", "Superior Double", 840000),
    ("dlx", "Deluxe", "Deluxe Twin City View", 1090000),
]

loss_dates = [
    # Put 8 losses in Oct 31 - Nov 04 so 7d has: (5+8=13 wins) and (4 today + 3 Nov05 + 8 Oct31-Nov04 = 15 losses) -> 28 bids in 7d (13/28 = 46.4% win rate!)
    "2026-11-04", "2026-11-04", "2026-11-03", "2026-11-03",
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
    st = "expired" if reason_id == "slow_response" and idx % 2 == 0 else "rejected"
    bmode = "manual" if reason_id in ("slow_response", "price_high") and idx % 3 != 0 else "auto"
    d_short = f"{sdate[8:10]}/{sdate[5:7]}"
    cid = f"CRQ-{8750 + idx}"
    autopsy_ref = (
        "CRQ-8924"
        if reason_id == "price_high"
        else ("CRQ-8909" if reason_id == "slow_response" else "CRQ-8918")
    )
    auction_sessions.append({
        "id": cid,
        "status": st,
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
        "closeMinutes": 60.0 if st == "expired" else 10.5,
        "closeSpeedText": "60p 00s" if st == "expired" else "10p 30s",
        "lossReasonId": reason_id,
        "resultNote": "Quá hạn 60p • Giải phóng phòng" if st == "expired" else "Khách chọn đối thủ • Phòng vẫn trống",
        "autopsyId": autopsy_ref,
        "showInHistory": False,
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
                "hotel": "Phước Mỹ, Sơn Trà • Superior Double (#108–#110 trống)",
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
        "tip": "Gợi ý AI: Tặng kèm 'Miễn phí Buffet sáng 2 khách' (chi phí bếp ~90k) sẽ nâng độ khớp lên 100% và tăng +22% xác suất khách TT ngay tối nay.",
        "suggestedPerkId": "perk_bf",
    },
    "CRQ-8942": {
        "reqId": "CRQ-8942",
        "score": 96,
        "sub": "Phiên Live #CRQ-8942 • Hạng bắt buộc: Executive • Khách Hàn Quốc (2 đêm)",
        "title": "Độ khớp Rất Cao (96%) • Cạnh tranh căn Ocean Suite trống cuối (#130)",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Hạng phòng Executive",
                "guest": "Executive • Khu vực biển Mỹ Khê",
                "hotel": "Executive Ocean Suite (#130 đang mở)",
                "status": "match",
                "label": "Đạt chuẩn cứng",
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
        "tip": "Cơ chế Giữ ghế Rạp phim (10 phút): Căn #130 hiện đang bị #CRQ-8944 tạm khóa chờ thanh toán (còn 08:15/10:00). Bạn vẫn gửi báo giá vào Hàng chờ Standby — khách #CRQ-8942 chỉ mở khóa bấm TT được khi #CRQ-8944 hết hạn 10p hoặc hủy thẻ!",
        "suggestedPerkId": "perk_tea",
    },
    "CRQ-8943": {
        "reqId": "CRQ-8943",
        "score": 95,
        "sub": "Phiên Live #CRQ-8943 • Hạng bắt buộc: Deluxe • Khách công tác 2 đêm",
        "title": "Khớp 95% tiêu chí công tác • Sẵn 2 phòng trống (#119, #120)",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Hạng Deluxe",
                "guest": "Deluxe • Đà Nẵng",
                "hotel": "Deluxe Twin City View (2 phòng trống mở)",
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
        "sub": "Phiên Live #CRQ-8944 • Đang Tạm khóa #130 chờ thanh toán (08:15 / 10:00)",
        "title": "Khớp 94% • Phòng #130 đang khóa cứng 10 phút chờ cổng thanh toán xác nhận",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Hạng Executive",
                "guest": "Executive • Nhận phòng tối nay 06/11",
                "hotel": "Executive Ocean Suite (#130 đang tạm khóa 10p)",
                "status": "match",
                "label": "Đang giữ ghế 10p",
            },
            {
                "name": "Truyền hình OTT (Netflix/YouTube) & Hồ bơi",
                "guest": "OTT TV + Hồ bơi + Bữa sáng",
                "hotel": "Smart TV 55 inch có sẵn OTT + Buffet sáng",
                "status": "match",
                "label": "Khớp 100%",
            },
        ],
        "tip": "Khách #CRQ-8944 đã bấm Chọn chào giá (1.950.000đ/đêm) -> Hệ thống tạm khóa độc quyền phòng #130 trong 10 phút (giống giữ ghế rạp chiếu phim). Nếu hoàn tất TT 100%, #130 khóa vĩnh viễn và tự đóng #CRQ-8942; nếu hết 10p, #130 tự mở khóa lại.",
    },
    "CRQ-8924": {
        "reqId": "CRQ-8924",
        "score": 88,
        "sub": "Phiên trượt #CRQ-8924 (05/11) • Khách chọn đối thủ cùng phân khúc 4 sao",
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

# 10. LOSS AUTOPSY CASES (Tab 2 Head-to-Head Visual Autopsy)
loss_autopsies = {
    "CRQ-8924": {
        "id": "CRQ-8924",
        "tabLabel": "#CRQ-8924 • Cao hơn 250k (Suite)",
        "dateLabel": "05/11 • 21:15 (Executive • 2 đêm)",
        "guestRejectTag": "Chọn KS tương đương có giá trọn gói tốt hơn",
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
        "tabLabel": "#CRQ-8918 • Thiếu Buffet sáng",
        "dateLabel": "05/11 • 13:05 (Superior • 2 đêm)",
        "guestRejectTag": "Ưu tiên khách sạn đã gồm sẵn bữa sáng cho gia đình",
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
        "tabLabel": "#CRQ-8909 • Phản hồi trễ 31p",
        "dateLabel": "05/11 • 23:18 (Deluxe • Nhận phòng đêm)",
        "guestRejectTag": "Khách đáp sân bay cần chốt phòng ngay trong 5 phút đầu",
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
                "winner": "Thanh toán lúc phút 03:10",
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

# 12. FULL LIFECYCLE, MULTI-ENTITY STATE MACHINE, REJECT TAXONOMY & 18 SCENARIOS CATALOG
lifecycle_catalog = {
    "version": "2.7.0",
    "holdMechanism": {
        "ttlSeconds": 600,
        "ttlMinutes": 10,
        "analogy": "Giữ ghế rạp chiếu phim (Exclusive 10-Minute Seat Lock)",
        "summary": "Ngay khi du khách bấm 'Chọn chào giá & Thanh toán', hệ thống cấp khóa tạm độc quyền 10 phút (600s) lên đúng mã phòng vật lý trong kỳ lưu trú. Trong 10 phút này: (1) Khách/phiên khác trùng phòng bị chặn nút Thanh toán (chuyển sang Hàng chờ Standby), (2) Lễ tân không thể khóa tay đè lên phòng đang giữ, (3) Hoàn tất thanh toán 100% sẽ chuyển sang Khóa cứng vĩnh viễn và tự đóng các phiên Standby trùng, (4) Hết 10 phút / lỗi thẻ / thoát trang sẽ lập tức nhả khóa về Trống mở đấu giá.",
    },
    "roomStateMachine": [
        {
            "status": "vacant_unlocked",
            "label": "Trống · Mở đấu giá",
            "badgeTone": "sky",
            "canBid": True,
            "canGuestCheckout": True,
            "canManualOverride": True,
            "description": "Phòng vật lý đang mở khóa, cho phép nhận đồng thời nhiều phiên đấu giá Live để tối đa hóa tỷ lệ lấp đầy.",
        },
        {
            "status": "payment_hold",
            "label": "Tạm khóa chờ TT (10p)",
            "badgeTone": "amber",
            "canBid": True,
            "canGuestCheckout": False,
            "canManualOverride": False,
            "description": "Đang giữ chỗ độc quyền tối đa 600 giây (10:00) cho 1 khách tại cổng thanh toán. Phiên khác không thể bấm chọn đè; lễ tân bị chặn khóa tay.",
        },
        {
            "status": "booked_auction",
            "label": "Đã khóa goodNstay (TT 100%)",
            "badgeTone": "emerald",
            "canBid": False,
            "canGuestCheckout": False,
            "canManualOverride": False,
            "description": "Khách đã thanh toán đủ 100% trực tuyến. Phòng khóa cứng bảo vệ quyền lợi khách, tự động rút mọi báo giá trùng ngày.",
        },
        {
            "status": "booked_other",
            "label": "Đã khóa OTA / Lễ tân",
            "badgeTone": "zinc",
            "canBid": False,
            "canGuestCheckout": False,
            "canManualOverride": True,
            "description": "Phòng bán qua Booking/Agoda/Traveloka hoặc Lễ tân khóa thủ công cho khách Walk-in. Có thể chủ động mở khóa lại nếu khách hủy.",
        },
    ],
    "stages": [
        {
            "stageNumber": 1,
            "id": "STG-01",
            "title": "Khách gửi Yêu cầu Đặt phòng (CRQ)",
            "actor": "Du khách (App/Web)",
            "slaText": "Tức thì (<1s)",
            "roomStatus": "vacant_unlocked",
            "requestStatus": "created",
            "bidStatus": "not_invited",
            "paymentStatus": "not_started",
            "happyOutcome": "Tạo mã phiên #CRQ kèm địa bàn, hạng phòng bắt buộc, ngày lưu trú, số khách & tiện ích mong muốn.",
            "failureOutcomes": ["Khách hủy yêu cầu trước khi phát tán"],
        },
        {
            "stageNumber": 2,
            "id": "STG-02",
            "title": "Lọc Hard Rules & Chấm AI Match %",
            "actor": "AI Matching Engine",
            "slaText": "< 500ms",
            "roomStatus": "vacant_unlocked",
            "requestStatus": "matching",
            "bidStatus": "pending_quote",
            "paymentStatus": "not_started",
            "happyOutcome": "Lọc cứng khu vực + hạng phòng + sức chứa + còn buồng mở/tạm giữ, tính điểm khớp mềm (0–100%) và đẩy WebSocket.",
            "failureOutcomes": ["REJ_HARD_RULE_MISMATCH"],
        },
        {
            "stageNumber": 3,
            "id": "STG-03",
            "title": "KS Duyệt Giá sàn RBAC & Gửi Báo giá 1 lần",
            "actor": "AI Auto-Bid / Quản lý / Lễ tân",
            "slaText": "Auto <60s · Tay <5p (TTL 60p)",
            "roomStatus": "vacant_unlocked",
            "requestStatus": "bidding_open",
            "bidStatus": "sent_waiting_guest",
            "paymentStatus": "not_started",
            "happyOutcome": "Gửi giá gốc cố định 1 lần (hiệu lực 60 phút) kèm đặc quyền mềm; phòng vật lý VẪN MỞ KHÓA cho các phiên khác.",
            "failureOutcomes": [
                "REJ_FLOOR_GUARDRAIL_BLOCKED",
                "REJ_PARTNER_SKIPPED_SESSION",
                "REJ_SLOW_RESPONSE_TTL_60M",
            ],
        },
        {
            "stageNumber": 4,
            "id": "STG-04",
            "title": "Khách So sánh Báo giá (Tổng × 1.265)",
            "actor": "Du khách",
            "slaText": "Trong cửa sổ 60 phút",
            "roomStatus": "vacant_unlocked",
            "requestStatus": "offers_comparing",
            "bidStatus": "sent_waiting_guest",
            "paymentStatus": "not_started",
            "happyOutcome": "Khách mở xem ảnh, tiện nghi, đặc quyền và tổng giá thanh toán (= Giá gốc × 1.15 phí sàn × 1.10 VAT).",
            "failureOutcomes": [
                "REJ_COMPETITOR_WON_PRICE",
                "REJ_MISSING_MANDATORY_PERK",
                "REJ_NO_GUEST_ACTION_60M",
            ],
        },
        {
            "stageNumber": 5,
            "id": "STG-05",
            "title": "Bấm Chọn Chào giá → Tạm khóa Phòng 10 Phút",
            "actor": "Du khách + Lock Coordinator",
            "slaText": "Atomic Lock · Đếm ngược 10:00 (600s)",
            "roomStatus": "payment_hold",
            "requestStatus": "checkout_hold_10m",
            "bidStatus": "payment_hold_10m",
            "paymentStatus": "awaiting_hold_10m",
            "happyOutcome": "Giữ độc quyền mã phòng vật lý trong 10 phút (như đặt ghế xem phim). Mọi phiên trùng phòng chuyển sang Standby (khóa nút chọn).",
            "failureOutcomes": ["Standby chờ nhả khóa nếu phòng vừa bị giữ trước 1ms"],
        },
        {
            "stageNumber": 6,
            "id": "STG-06",
            "title": "Xác thực Cổng Thanh toán Trực tuyến 100%",
            "actor": "Du khách + Cổng Thanh toán",
            "slaText": "Tối đa 600 giây (10:00)",
            "roomStatus": "payment_hold",
            "requestStatus": "checkout_hold_10m",
            "bidStatus": "payment_hold_10m",
            "paymentStatus": "processing_gateway",
            "happyOutcome": "Khách hoàn tất thẻ/QR/3DS 100% giá trị đơn trước khi đồng hồ 10:00 về 00:00 (không thu cọc một phần).",
            "failureOutcomes": [
                "REJ_HOLD_EXPIRED_10M",
                "REJ_PAYMENT_GATEWAY_DECLINED",
                "REJ_GUEST_ABANDONED_HOLD",
            ],
        },
        {
            "stageNumber": 7,
            "id": "STG-07",
            "title": "Khóa Cứng Phòng PMS & Tự đóng Phiên Trùng",
            "actor": "PMS Sync & Auction Engine",
            "slaText": "Tức thì (<1s sau Webhook)",
            "roomStatus": "booked_auction",
            "requestStatus": "confirmed_paid",
            "bidStatus": "won_paid_100",
            "paymentStatus": "paid_escrow_100",
            "happyOutcome": "Chuyển phòng từ Tạm khóa 10p sang Đã khóa TT 100%, phát hành mã nhận phòng và tự đóng các phiên trùng hạng hết buồng.",
            "failureOutcomes": ["REJ_AUTO_CLOSED_SOLD_OUT (cho các phiên trùng thua cuộc)"],
        },
        {
            "stageNumber": 8,
            "id": "STG-08",
            "title": "Lưu trú (Check-in / Check-out) hoặc Xử lý Bất khả kháng",
            "actor": "Lễ tân KS & Du khách",
            "slaText": "Theo ngày nhận/trả phòng",
            "roomStatus": "booked_auction",
            "requestStatus": "checked_in",
            "bidStatus": "won_paid_100",
            "paymentStatus": "paid_escrow_100",
            "happyOutcome": "Khách nhận phòng không phải thanh toán lại tiền buồng; hoàn tất trả phòng đúng hạn.",
            "failureOutcomes": ["REJ_FORCE_MAJEURE_REFUND (nếu hủy bất khả kháng có chứng từ)"],
        },
        {
            "stageNumber": 9,
            "id": "STG-09",
            "title": "Đối soát T+7 (100% Giá gốc) & Cập nhật Điểm ELO",
            "actor": "Hệ thống Thanh quyết toán",
            "slaText": "T+7 sau ngày Check-out",
            "roomStatus": "vacant_unlocked",
            "requestStatus": "settled_t_plus_7",
            "bidStatus": "won_paid_100",
            "paymentStatus": "settled_hotel",
            "happyOutcome": "Giải ngân nguyên vẹn 100% Giá gốc về tài khoản khách sạn (0% hoa hồng KS) và cộng điểm uy tín ELO + Review 5 tiêu chí.",
            "failureOutcomes": [],
        },
    ],
    "rejectCatalog": [
        {
            "code": "REJ_HARD_RULE_MISMATCH",
            "shortLabel": "Lệch điều kiện cứng",
            "group": "pre_bid",
            "stageNumber": 2,
            "roomEffect": "Không ảnh hưởng (vẫn mở)",
            "financialEffect": "0đ",
            "description": "Khách sạn khác quận/khu vực, thiếu hạng phòng bắt buộc hoặc hết sạch buồng trống trong ngày lưu trú.",
            "partnerAction": "Mở khóa thêm buồng OTA/Lễ tân còn dư vào quỹ đấu giá 14 ngày vàng.",
        },
        {
            "code": "REJ_FLOOR_GUARDRAIL_BLOCKED",
            "shortLabel": "Chặn dưới giá sàn RBAC",
            "group": "pre_bid",
            "stageNumber": 3,
            "roomEffect": "Không ảnh hưởng (vẫn mở)",
            "financialEffect": "Bảo vệ biên lợi nhuận",
            "description": "Tài khoản Lễ tân nhập mức giá thấp hơn Giá sàn bảo vệ hoặc Quản lý chưa tắt Auto-Bid để ký duyệt ngoại lệ.",
            "partnerAction": "Giữ giá >= Giá sàn hoặc chuyển quyền Quản lý để duyệt giảm sâu có kiểm soát.",
        },
        {
            "code": "REJ_PARTNER_SKIPPED_SESSION",
            "shortLabel": "KS chủ động bỏ qua",
            "group": "pre_bid",
            "stageNumber": 3,
            "roomEffect": "Giữ phòng cho kênh khác",
            "financialEffect": "0đ (không tính phạt ELO)",
            "description": "Khách sạn chủ động bấm 'Bỏ qua' phiên Live khi muốn ưu tiên giữ buồng cho đoàn khách lẻ giá cao.",
            "partnerAction": "Chỉ bỏ qua khi công suất ngày chọn đạt >85%.",
        },
        {
            "code": "REJ_SLOW_RESPONSE_TTL_60M",
            "shortLabel": "Gửi chậm / Hết TTL 60p",
            "group": "bidding_competition",
            "stageNumber": 3,
            "roomEffect": "Không khóa phòng",
            "financialEffect": "Mất cơ hội doanh thu",
            "description": "Phản hồi tay quá trễ (>15–30 phút) hoặc đồng hồ phiên 60 phút chạm 00:00 trước khi kịp gửi giá.",
            "partnerAction": "Bật AI Auto-Bid (<60s) cho ca trưa 11h–13h30 và ca đêm sau 22h00.",
        },
        {
            "code": "REJ_COMPETITOR_WON_PRICE",
            "shortLabel": "Đối thủ thắng giá tốt hơn",
            "group": "bidding_competition",
            "stageNumber": 4,
            "roomEffect": "Phòng vẫn mở cho phiên khác",
            "financialEffect": "0đ",
            "description": "Du khách so sánh danh sách Live và chọn khách sạn cùng hạng có tổng giá thanh toán mềm hơn.",
            "partnerAction": "Hạ nhẹ 3–5% giá gốc hoặc kích hoạt Xả đêm (-15%) sau 20:00.",
        },
        {
            "code": "REJ_MISSING_MANDATORY_PERK",
            "shortLabel": "Thiếu đặc quyền mềm chốt đơn",
            "group": "bidding_competition",
            "stageNumber": 4,
            "roomEffect": "Phòng vẫn mở cho phiên khác",
            "financialEffect": "0đ",
            "description": "Điểm khớp <90% do thiếu Bữa sáng hoặc Trả phòng trễ 14:00 so với đối thủ cùng tầm giá.",
            "partnerAction": "Đính kèm đặc quyền mềm chi phí thấp (0đ–90k) khi gửi báo giá.",
        },
        {
            "code": "REJ_NO_GUEST_ACTION_60M",
            "shortLabel": "Khách không tương tác hết 60p",
            "group": "bidding_competition",
            "stageNumber": 4,
            "roomEffect": "Tự thu hồi hiệu lực giá sau 60p",
            "financialEffect": "0đ",
            "description": "Khách rời ứng dụng và không chọn bất kỳ báo giá nào cho tới khi hết hạn 60 phút.",
            "partnerAction": "Không cần thao tác — phòng không bị giam nên không thiệt hại công suất.",
        },
        {
            "code": "REJ_HOLD_EXPIRED_10M",
            "shortLabel": "Quá hạn tạm khóa 10 phút",
            "group": "payment_hold_10m",
            "stageNumber": 6,
            "roomEffect": "Nhả khóa payment_hold → Trống ngay lập tức",
            "financialEffect": "0đ (không giam phòng quá 10p)",
            "description": "Khách đã bấm giữ phòng 10 phút (600s) nhưng không hoàn tất thanh toán trước khi đồng hồ về 00:00.",
            "partnerAction": "Hệ thống tự mở khóa phòng tức thì và đánh thức các phiên Standby đang chờ.",
        },
        {
            "code": "REJ_PAYMENT_GATEWAY_DECLINED",
            "shortLabel": "Cổng TT từ chối thẻ / 3DS",
            "group": "payment_hold_10m",
            "stageNumber": 6,
            "roomEffect": "Nhả khóa payment_hold → Trống ngay lập tức",
            "financialEffect": "0đ",
            "description": "Giao dịch thẻ nội địa/quốc tế bị ngân hàng từ chối hạn mức hoặc sai xác thực OTP/3DS và không thử lại kịp.",
            "partnerAction": "Phòng tự động mở lại cho phiên kế tiếp mà không cần Lễ tân can thiệp.",
        },
        {
            "code": "REJ_GUEST_ABANDONED_HOLD",
            "shortLabel": "Khách thoát trang giữ chỗ 10p",
            "group": "payment_hold_10m",
            "stageNumber": 6,
            "roomEffect": "Hủy khóa sớm <10p → Trống tức thì",
            "financialEffect": "0đ",
            "description": "Khách chủ động bấm 'Hủy & Chọn lại' ngay trên màn hình thanh toán trước khi hết 10 phút.",
            "partnerAction": "Giải phóng khóa phòng sớm giúp các phiên Standby chốt đơn ngay không phải đợi hết 10 phút.",
        },
        {
            "code": "REJ_AUTO_CLOSED_SOLD_OUT",
            "shortLabel": "Tự đóng do căn cuối vừa TT 100%",
            "group": "post_payment",
            "stageNumber": 7,
            "roomEffect": "Phòng đã khóa cứng cho đơn thắng",
            "financialEffect": "Bảo vệ 100% chống Overbooking",
            "description": "Phiên cạnh tranh cùng hạng phòng đã hoàn tất thanh toán 100% căn trống cuối cùng nên báo giá trùng tự động rút.",
            "partnerAction": "Không tính vào tỷ lệ thua cạnh tranh của khách sạn.",
        },
    ],
    "scenarioMatrix": [
        {
            "caseId": "CASE-01",
            "title": "Happy Path Auto-Bid → Giữ ghế 10p → TT 100% → Khóa cứng",
            "category": "happy_path",
            "trigger": "Yêu cầu ≤4 phòng, ≤8 khách; Auto-Bid bật; khách chọn và thanh toán 100% trong 2 phút.",
            "roomTransition": "vacant_unlocked → payment_hold (10p) → booked_auction",
            "bidTransition": "pending_quote → sent_waiting_guest → payment_hold_10m → won_paid_100",
            "paymentTransition": "not_started → awaiting_hold_10m → paid_escrow_100 → settled_hotel",
            "rejectCode": None,
            "outcome": "SUCCESS",
            "sampleSessionId": "CRQ-8940",
        },
        {
            "caseId": "CASE-02",
            "title": "Happy Path Duyệt tay kèm Đặc quyền mềm → Chốt căn Suite cuối",
            "category": "happy_path",
            "trigger": "Quản lý/Lễ tân gửi báo giá tùy chỉnh kèm Buffet sáng/Trà chiều; khách giữ chỗ 10p và TT 100%.",
            "roomTransition": "vacant_unlocked → payment_hold (10p) → booked_auction",
            "bidTransition": "pending_quote → sent_waiting_guest → payment_hold_10m → won_paid_100",
            "paymentTransition": "not_started → awaiting_hold_10m → paid_escrow_100",
            "rejectCode": None,
            "outcome": "SUCCESS",
            "sampleSessionId": "CRQ-8938",
        },
        {
            "caseId": "CASE-03",
            "title": "Đua giữ ghế Rạp phim (Race Condition): Khách A đang giữ 10p → Khách B bị chặn Standby",
            "category": "payment_hold_concurrency",
            "trigger": "Phòng #130 là căn trống cuối ngày 07/11. #CRQ-8944 bấm TT trước nên giữ khóa 10p; #CRQ-8942 muốn chọn cùng phòng.",
            "roomTransition": "payment_hold (#130 khóa độc quyền bởi #CRQ-8944 trong 600s)",
            "bidTransition": "#CRQ-8944: payment_hold_10m | #CRQ-8942: standby_hold_conflict",
            "paymentTransition": "#CRQ-8944: awaiting_hold_10m | #CRQ-8942: blocked_by_hold",
            "rejectCode": None,
            "outcome": "HOLD_ACTIVE",
            "sampleSessionId": "CRQ-8944",
        },
        {
            "caseId": "CASE-04",
            "title": "Khách A hoàn tất TT 100% trong 10p → Tự động đóng phiên Standby của Khách B",
            "category": "payment_hold_concurrency",
            "trigger": "#CRQ-8944 thanh toán thành công khi đồng hồ giữ phòng còn >00:00; hạng Executive về 0 phòng trống.",
            "roomTransition": "payment_hold → booked_auction (#130 khóa vĩnh viễn)",
            "bidTransition": "#CRQ-8944: won_paid_100 | #CRQ-8942: auto_closed",
            "paymentTransition": "#CRQ-8944: paid_escrow_100 | #CRQ-8942: not_started",
            "rejectCode": "REJ_AUTO_CLOSED_SOLD_OUT",
            "outcome": "AUTO_CLOSED_SIBLING",
            "sampleSessionId": "CRQ-8942",
        },
        {
            "caseId": "CASE-05",
            "title": "Khách A quá hạn giữ phòng 10 phút (00:00) → Nhả khóa #130 & Mở lại cho Khách B",
            "category": "payment_hold_concurrency",
            "trigger": "Đồng hồ 10:00 trên #CRQ-8944 chạm 00:00 mà chưa nhận được xác nhận thanh toán.",
            "roomTransition": "payment_hold → vacant_unlocked (tự mở khóa tức thì)",
            "bidTransition": "payment_hold_10m → release_after_hold (#CRQ-8942 thoát Standby)",
            "paymentTransition": "awaiting_hold_10m → expired_hold_10m",
            "rejectCode": "REJ_HOLD_EXPIRED_10M",
            "outcome": "RELEASED_TO_VACANT",
            "sampleSessionId": "CRQ-8932",
        },
        {
            "caseId": "CASE-06",
            "title": "Thẻ ngân hàng từ chối / Lỗi OTP 3DS trong lúc giữ phòng 10p",
            "category": "payment_hold_concurrency",
            "trigger": "Cổng thanh toán trả mã lỗi thẻ không đủ hạn mức hoặc xác thực 3DS thất bại và phiên đóng.",
            "roomTransition": "payment_hold → vacant_unlocked",
            "bidTransition": "payment_hold_10m → release_after_hold",
            "paymentTransition": "processing_gateway → failed_gateway",
            "rejectCode": "REJ_PAYMENT_GATEWAY_DECLINED",
            "outcome": "PAYMENT_FAILED",
            "sampleSessionId": "CRQ-8779",
        },
        {
            "caseId": "CASE-07",
            "title": "Khách chủ động bấm Thoát / Đổi ý ngay tại màn hình giữ phòng 10p",
            "category": "payment_hold_concurrency",
            "trigger": "Khách bấm nút Quay lại/Hủy giữ chỗ ở phút thứ 3 (còn 07:00) để xem khách sạn khác.",
            "roomTransition": "payment_hold → vacant_unlocked (nhả khóa sớm trước 10p)",
            "bidTransition": "payment_hold_10m → release_after_hold",
            "paymentTransition": "awaiting_hold_10m → abandoned_by_guest",
            "rejectCode": "REJ_GUEST_ABANDONED_HOLD",
            "outcome": "RELEASED_EARLY",
            "sampleSessionId": "CRQ-8780",
        },
        {
            "caseId": "CASE-08",
            "title": "Chặn Lễ tân khóa tay đè lên phòng đang Tạm khóa chờ TT 10p",
            "category": "inventory_guardrail",
            "trigger": "Khách Walk-in tới quầy đúng lúc phòng #130 đang ở trạng thái payment_hold (còn 08:15).",
            "roomTransition": "Giữ nguyên payment_hold (Từ chối thao tác khóa tay cho tới khi hết 10p)",
            "bidTransition": "Giữ nguyên payment_hold_10m",
            "paymentTransition": "Giữ nguyên awaiting_hold_10m",
            "rejectCode": None,
            "outcome": "GUARDRAIL_PROTECTED",
            "sampleSessionId": "CRQ-8944",
        },
        {
            "caseId": "CASE-09",
            "title": "Chặn mở khóa thủ công đối với phòng đã Thanh toán 100% (booked_auction)",
            "category": "inventory_guardrail",
            "trigger": "Nhân sự bấm vào ô phòng #116/#125 đã TT 100% trên Sơ đồ 30 phòng để thử mở khóa.",
            "roomTransition": "Giữ nguyên booked_auction (Khóa cứng bảo vệ khách)",
            "bidTransition": "won_paid_100",
            "paymentTransition": "paid_escrow_100",
            "rejectCode": None,
            "outcome": "GUARDRAIL_PROTECTED",
            "sampleSessionId": "CRQ-8940",
        },
        {
            "caseId": "CASE-10",
            "title": "Lễ tân khóa 1 phòng trống cho khách Walk-in/OTA khi chưa có ai giữ 10p",
            "category": "inventory_guardrail",
            "trigger": "Phòng đang ở vacant_unlocked; Lễ tân bấm 'Khóa phòng' trên lịch 14 ngày.",
            "roomTransition": "vacant_unlocked → booked_other",
            "bidTransition": "Cập nhật giảm số buồng trống của các phiên Live trùng ngày",
            "paymentTransition": "Thu trực tiếp tại quầy / OTA",
            "rejectCode": None,
            "outcome": "INVENTORY_SYNCED",
            "sampleSessionId": "CRQ-8941",
        },
        {
            "caseId": "CASE-11",
            "title": "Lễ tân nhập giá thấp hơn Giá sàn bảo vệ → Bị chặn cứng bởi RBAC",
            "category": "rbac_pricing",
            "trigger": "Vai trò Lễ tân nhập 500.000đ (< Giá sàn 750.000đ) trong cửa sổ Báo giá tùy chỉnh.",
            "roomTransition": "vacant_unlocked",
            "bidTransition": "Chặn nút Gửi báo giá (không phát sinh bid lỗi)",
            "paymentTransition": "not_started",
            "rejectCode": "REJ_FLOOR_GUARDRAIL_BLOCKED",
            "outcome": "RBAC_BLOCKED",
            "sampleSessionId": "CRQ-8941",
        },
        {
            "caseId": "CASE-12",
            "title": "Quản lý tắt Auto-Bid & Tích xác nhận duyệt giá dưới sàn thành công",
            "category": "rbac_pricing",
            "trigger": "Vai trò Quản lý chủ động tắt Auto-Bid, tích ô chịu trách nhiệm duyệt dưới sàn và gửi báo giá 1 lần.",
            "roomTransition": "vacant_unlocked",
            "bidTransition": "pending_quote → sent_waiting_guest",
            "paymentTransition": "not_started",
            "rejectCode": None,
            "outcome": "MANAGER_OVERRIDE_SENT",
            "sampleSessionId": "CRQ-8941",
        },
        {
            "caseId": "CASE-13",
            "title": "Đoàn lớn (>4 phòng hoặc >8 khách) → Tự động chặn Auto-Bid chuyển Duyệt tay",
            "category": "rbac_pricing",
            "trigger": "Yêu cầu đoàn 5 phòng / 10 khách vượt trần an toàn Auto-Bid.",
            "roomTransition": "vacant_unlocked",
            "bidTransition": "Chờ Quản lý kiểm tra quỹ phòng liên thông & báo giá tay",
            "paymentTransition": "not_started",
            "rejectCode": None,
            "outcome": "MANUAL_REVIEW_REQUIRED",
            "sampleSessionId": "CRQ-8938",
        },
        {
            "caseId": "CASE-14",
            "title": "Bật Xả đêm (-15% sau 20:00) → Chỉ giảm đơn nhận phòng tối nay, giữ nguyên ngày xa",
            "category": "rbac_pricing",
            "trigger": "Bật công tắc Xả đêm 20:00: #CRQ-8941 (06/11) giảm sàn -15%, còn #CRQ-8942 (07/11) & #CRQ-8943 (09/11) giữ nguyên.",
            "roomTransition": "vacant_unlocked",
            "bidTransition": "Tự động tính lại AI Suggested Price cho phiên nhận phòng đêm nay",
            "paymentTransition": "not_started",
            "rejectCode": None,
            "outcome": "RATE_PARITY_SAFE",
            "sampleSessionId": "CRQ-8941",
        },
        {
            "caseId": "CASE-15",
            "title": "Khách từ chối báo giá do cao hơn đối thủ hoặc thiếu Bữa sáng / Late Check-out",
            "category": "bidding_loss",
            "trigger": "Giá chào vượt mặt bằng >5% hoặc không đính kèm đặc quyền mềm khi Match Score <90%.",
            "roomTransition": "vacant_unlocked (phòng vẫn mở bán bình thường)",
            "bidTransition": "sent_waiting_guest → rejected_by_guest",
            "paymentTransition": "not_started",
            "rejectCode": "REJ_COMPETITOR_WON_PRICE",
            "outcome": "COMPETITIVE_LOSS",
            "sampleSessionId": "CRQ-8924",
        },
        {
            "caseId": "CASE-16",
            "title": "Phiên hết hạn 60 phút (TTL 00:00) do phản hồi chậm hoặc khách rời phiên",
            "category": "bidding_loss",
            "trigger": "Ca đêm không bật Auto-Bid (gửi sau 31 phút) hoặc khách không thao tác hết 60 phút.",
            "roomTransition": "vacant_unlocked",
            "bidTransition": "sent_waiting_guest → expired_60m",
            "paymentTransition": "not_started",
            "rejectCode": "REJ_SLOW_RESPONSE_TTL_60M",
            "outcome": "EXPIRED_60M",
            "sampleSessionId": "CRQ-8909",
        },
        {
            "caseId": "CASE-17",
            "title": "Khách sạn chủ động bấm 'Bỏ qua' phiên Live để giữ phòng bán lẻ giá cao",
            "category": "bidding_loss",
            "trigger": "Quản lý/Lễ tân bấm 'Bỏ qua' trên thẻ phiên đang mở.",
            "roomTransition": "vacant_unlocked (hoặc khóa tay sang booked_other)",
            "bidTransition": "pending_quote → partner_skipped",
            "paymentTransition": "not_started",
            "rejectCode": "REJ_PARTNER_SKIPPED_SESSION",
            "outcome": "PARTNER_SKIPPED",
            "sampleSessionId": "CRQ-8943",
        },
        {
            "caseId": "CASE-18",
            "title": "Hủy bất khả kháng sau khi đã TT 100% (có chứng từ xác thực) vs. Đối soát T+7",
            "category": "post_payment",
            "trigger": "Sự cố thiên tai/chuyến bay hủy có xác nhận hợp lệ trước giờ nhận phòng → Hoàn trả & mở khóa lại buồng.",
            "roomTransition": "booked_auction → vacant_unlocked (nếu hủy hợp lệ trước check-in)",
            "bidTransition": "won_paid_100 → cancelled_force_majeure (hoặc giữ won_paid_100 tới T+7)",
            "paymentTransition": "paid_escrow_100 → refunded_force_majeure (hoặc settled_hotel ở T+7)",
            "rejectCode": None,
            "outcome": "SETTLED_OR_FORCE_MAJEURE",
            "sampleSessionId": "CRQ-8792",
        },
    ],
}

# 13. SCHEMA MANIFEST
schema_manifest = {
    "schemaVersion": "2.7.0",
    "architecture": "goodNstay Pay-to-Lock • 10-Min Payment Hold • Multi-Entity Lifecycle • 0% Hotel Commission",
    "generatedAt": "2026-11-06T19:45:00+07:00",
    "primaryReferenceDate": "2026-11-06",
    "tables": {
        "hotelProfile": {"file": "hotel_profile.json", "pk": "hotelId", "description": "Cấu hình khách sạn, TTL báo giá 60p, TTL tạm khóa thanh toán 10p (600s), ELO & 3 chi nhánh"},
        "usersRoles": {"file": "users_roles.json", "pk": "userId", "description": "Phân quyền RBAC Quản lý vs. Lễ tân"},
        "perksCatalog": {"file": "perks_catalog.json", "pk": "id", "description": "Danh mục đặc quyền mềm bù đắp điểm khớp"},
        "roomClasses": {"file": "room_classes.json", "pk": "id", "description": "4 hạng phòng gốc (Tổng 30 phòng vật lý)"},
        "roomsPms": {"file": "rooms_pms.json", "pk": "roomNumber", "fk": "roomClassId -> roomClasses.id", "description": "Trạng thái thực tế 30 mã phòng #101-#130 đêm 06/11/2026 (gồm 4 trạng thái: vacant_unlocked, payment_hold, booked_auction, booked_other)"},
        "calendar14dPms": {"file": "calendar_14d_pms.json", "pk": "dayOffset", "description": "Lịch tồn kho 14 ngày vàng (06/11 - 19/11/2026) có đồng bộ paymentHoldRooms"},
        "systemBenchmarks": {"file": "system_benchmarks.json", "pk": "regionName", "description": "Dữ liệu chuẩn so sánh toàn sàn Đà Nẵng theo kỳ Today / 7D / 30D"},
        "auctionSessions": {"file": "auction_sessions.json", "pk": "id", "fk": "matchedRoomClassId -> roomClasses.id", "description": "Bảng giao dịch gốc gồm 4 phiên Live + 68 phiên lịch sử đồng bộ 4 chiều trạng thái (Request / Bid / Payment / Reject)"},
        "matchBreakdowns": {"file": "match_breakdowns.json", "pk": "reqId", "description": "Chi tiết chấm điểm Hard Rules & Soft Rules AI Match %"},
        "lossAutopsies": {"file": "loss_autopsies.json", "pk": "id", "description": "Hồ sơ đối chiếu mổ xẻ phiên trượt"},
        "botRules": {"file": "bot_rules.json", "pk": "ruleId", "description": "Các quy tắc Auto-Bid đang kích hoạt"},
        "lifecycleCatalog": {"file": "lifecycle_catalog.json", "pk": "version", "description": "Đặc tả 9 bước vòng đời, 4 trạng thái phòng, 11 mã Reject và 18 kịch bản nghiệp vụ"},
    },
}

# Enrich all historical auction_sessions with synchronized multi-entity statuses & 10-minute hold failure codes
hold_failure_variants = [
    (
        "REJ_HOLD_EXPIRED_10M",
        "Quá hạn giữ phòng 10p",
        "expired_hold_10m",
        "Quá hạn tạm khóa 10p (#120) · Tự mở khóa lại phòng",
    ),
    (
        "REJ_PAYMENT_GATEWAY_DECLINED",
        "Cổng TT từ chối thẻ / 3DS",
        "failed_gateway",
        "Cổng TT từ chối thẻ trong 10p giữ chỗ · Đã nhả khóa phòng",
    ),
    (
        "REJ_GUEST_ABANDONED_HOLD",
        "Khách thoát trang giữ 10p",
        "abandoned_by_guest",
        "Khách bấm thoát khi đang tạm khóa 10p · Mở khóa tức thì",
    ),
    (
        "REJ_HOLD_EXPIRED_10M",
        "Quá hạn giữ phòng 10p",
        "expired_hold_10m",
        "Đồng hồ giữ chỗ 10:00 chạm 00:00 · Tự giải phóng phòng",
    ),
]
hold_fail_cursor = 0
expired_cursor = 0

for s in auction_sessions:
    if s["status"] == "live":
        continue
    if s["status"] == "won":
        if s["sessionDate"] <= "2026-10-30":
            s["requestStatus"] = "settled_t_plus_7"
            s["paymentStatus"] = "settled_hotel"
        elif s["id"] in stayover_room_map:
            s["requestStatus"] = "checked_in"
            s["paymentStatus"] = "paid_escrow_100"
        else:
            s["requestStatus"] = "confirmed_paid"
            s["paymentStatus"] = "paid_escrow_100"
        s["bidStatus"] = "won_paid_100"
        s["rejectCode"] = None
        s["rejectLabel"] = None
    elif s.get("lossReasonId") == "payment_abandoned":
        rej_code, rej_lbl, pay_st, note_txt = hold_failure_variants[
            hold_fail_cursor % len(hold_failure_variants)
        ]
        hold_fail_cursor += 1
        s["status"] = "payment_failed"
        s["requestStatus"] = "cancelled_or_expired"
        s["bidStatus"] = "release_after_hold"
        s["paymentStatus"] = pay_st
        s["rejectCode"] = rej_code
        s["rejectLabel"] = rej_lbl
        s["resultNote"] = note_txt
    elif s["status"] == "expired":
        if expired_cursor % 2 == 0:
            s["rejectCode"] = "REJ_SLOW_RESPONSE_TTL_60M"
            s["rejectLabel"] = "Gửi chậm / Hết TTL 60p"
        else:
            s["rejectCode"] = "REJ_NO_GUEST_ACTION_60M"
            s["rejectLabel"] = "Khách không tương tác hết 60p"
        expired_cursor += 1
        s["requestStatus"] = "cancelled_or_expired"
        s["bidStatus"] = "expired_60m"
        s["paymentStatus"] = "not_started"
    else:
        reason = s.get("lossReasonId", "price_high")
        if reason == "missing_perk":
            s["rejectCode"] = "REJ_MISSING_MANDATORY_PERK"
            s["rejectLabel"] = "Thiếu đặc quyền mềm chốt đơn"
        elif reason == "slow_response":
            s["rejectCode"] = "REJ_SLOW_RESPONSE_TTL_60M"
            s["rejectLabel"] = "Phản hồi chậm mất ưu thế"
        else:
            s["rejectCode"] = "REJ_COMPETITOR_WON_PRICE"
            s["rejectLabel"] = "Đối thủ thắng giá tốt hơn"
        s["requestStatus"] = "confirmed_paid"
        s["bidStatus"] = "rejected_by_guest"
        s["paymentStatus"] = "not_started"

# Populate exact baselineHotelWins per roomClassBenchmark for dynamic regional share delta calculation
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

# Branch mapping across 30 physical rooms (12 + 10 + 8 = 30 rooms)
branch_meta_map = {b["id"]: b for b in hotel_profile["branches"]}
room_to_branch = {}
for rno in [101, 102, 106, 108, 111, 112, 116, 119, 121, 122, 129, 130]:
    room_to_branch[rno] = "br_mykhe"
for rno in [103, 107, 109, 113, 114, 117, 120, 123, 126, 127]:
    room_to_branch[rno] = "br_songhan"
for rno in [104, 105, 110, 115, 118, 124, 125, 128]:
    room_to_branch[rno] = "br_anthuong"

assert len(room_to_branch) == 30

for r in rooms_pms:
    bid = room_to_branch[r["roomNumber"]]
    r["branchId"] = bid
    r["branchName"] = branch_meta_map[bid]["shortName"]

live_branch_map = {
    "CRQ-8941": "br_anthuong",  # sup (#110 vacant)
    "CRQ-8942": "br_mykhe",     # osuite (#130 competing)
    "CRQ-8943": "br_songhan",   # dlx (#120 vacant)
    "CRQ-8944": "br_mykhe",     # osuite (#130 competing - holding 10m lock!)
}
loss_branch_cycle = ["br_mykhe", "br_songhan", "br_anthuong"]
loss_idx = 0

for s in auction_sessions:
    s.pop("medicalRefund", None)
    s.pop("medicalRefundNote", None)
    if s["id"] in live_branch_map:
        bid = live_branch_map[s["id"]]
    elif s["status"] == "won" and s.get("lockedRoomNumber") in room_to_branch:
        bid = room_to_branch[s["lockedRoomNumber"]]
    else:
        bid = loss_branch_cycle[loss_idx % len(loss_branch_cycle)]
        loss_idx += 1
    s["branchId"] = bid
    s["branchName"] = branch_meta_map[bid]["shortName"]

# Strict Foreign Key Integrity Assertions
all_session_ids = {s["id"] for s in auction_sessions}
all_class_ids = {rc["id"] for rc in room_classes}
for r in rooms_pms:
    assert r["roomClassId"] in all_class_ids, f"Invalid roomClassId {r['roomClassId']}"
    if r["linkedReqId"] is not None:
        assert r["linkedReqId"] in all_session_ids, f"Broken FK rooms_pms.linkedReqId={r['linkedReqId']}"
for c in calendar_14d_pms:
    if c.get("linkedReqId") is not None:
        assert c["linkedReqId"] in all_session_ids, f"Broken FK calendar_14d_pms.linkedReqId={c['linkedReqId']}"

files_to_write = {
    "hotel_profile.json": hotel_profile,
    "users_roles.json": users_roles,
    "perks_catalog.json": perks_catalog,
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

forbidden_tokens = ("kcp", "nhn", "nhk", "medical", "y tế", "khách tt sàn")
for fname, payload in files_to_write.items():
    serialized_lower = json.dumps(payload, ensure_ascii=False).lower()
    for tok in forbidden_tokens:
        assert tok not in serialized_lower, f"Forbidden token '{tok}' found in {fname}"
    out_path = os.path.join(BASE_DIR, fname)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    shutil.copyfile(out_path, os.path.join(SEED_DIR, fname))

# Verification summary printout
hist = [s for s in auction_sessions if s["status"] != "live"]
for pkey, start_d in [("today", "2026-11-06"), ("7d", "2026-10-31"), ("30d", "2026-10-08")]:
    sub = [s for s in hist if start_d <= s["sessionDate"] <= "2026-11-06"]
    wins = [s for s in sub if s["status"] == "won"]
    base_rev = sum(s["hotelEarnedBase"] for s in wins)
    nights = sum(s["nights"] for s in wins)
    print(
        f"[{pkey}] Bids={len(sub)}, Wins={len(wins)}, WinRate={len(wins)/len(sub)*100:.1f}%, "
        f"Revenue={base_rev:,}đ, Nights={nights}"
    )

losses_30d = [s for s in hist if s["status"] != "won"]
by_reason = {}
for s in losses_30d:
    r = s.get("lossReasonId", "other")
    by_reason[r] = by_reason.get(r, 0) + 1
print("Losses 30d breakdown:", by_reason, "Total losses:", len(losses_30d))
print(
    "Rooms PMS count:", len(rooms_pms),
    "Other:", sum(1 for r in rooms_pms if r["status"] == "booked_other"),
    "Auction:", sum(1 for r in rooms_pms if r["status"] == "booked_auction"),
    "PaymentHold10m:", sum(1 for r in rooms_pms if r["status"] == "payment_hold"),
    "Vacant:", sum(1 for r in rooms_pms if r["status"] == "vacant_unlocked"),
    "CheckOutTomorrow:", sum(1 for r in rooms_pms if r["status"] not in ("vacant_unlocked", "payment_hold") and r["checkOutTomorrow"]),
)
print(
    "Lifecycle Catalog:",
    len(lifecycle_catalog["stages"]), "stages,",
    len(lifecycle_catalog["roomStateMachine"]), "room states,",
    len(lifecycle_catalog["rejectCatalog"]), "reject codes,",
    len(lifecycle_catalog["scenarioMatrix"]), "scenarios.",
)
print("100% Foreign Key, Multi-Entity Lifecycle, 10-Min Hold & Clean Revenue Integrity Verified!")
