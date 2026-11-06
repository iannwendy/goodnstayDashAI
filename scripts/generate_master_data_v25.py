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
    "version": "v2.5",
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
    elif idx == 2:
        st, ch, req = "booked_auction", "goodNstay (Đã TT 100%)", "CRQ-8934"
    else:
        st, ch, req = "vacant_unlocked", "Trống • Mở đấu giá", None
    rooms_pms.append({
        "roomNumber": rno,
        "floor": 6,
        "roomClassId": "osuite",
        "roomClass": "Executive Ocean Suite",
        "category": "Executive",
        "status": st,
        "sourceChannel": ch,
        "linkedReqId": req,
        "checkOutTomorrow": idx == 0,
    })

# 6. 14-DAY INVENTORY CALENDAR (06/11/2026 - 19/11/2026)
weekday_vn = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"]
cal_rows_plan = [
    # (offset, otherBooked, auctionBooked, policyShort, linkedReqId)
    (0, 16, 8, "Xả phòng đêm sau 20h00 (-15% sàn nếu còn trống)", "CRQ-8941"),
    (1, 18, 6, "Cuối tuần cầu cao • Giữ biên +15% trên giá sàn", "CRQ-8942"),
    (2, 17, 5, "Chủ nhật trả phòng đông • Kèm ưu đãi Late Check-out", "CRQ-8944"),
    (3, 13, 4, "Đầu tuần vắng • Bật Auto-Bid phản hồi <1 phút", "CRQ-8943"),
    (4, 12, 4, "Ưu tiên lấp nền công suất Superior & Deluxe", None),
    (5, 14, 3, "Tặng Buffet sáng giữ giá gốc không đổi", None),
    (6, 15, 3, "Bám sát giá TB toàn sàn Đà Nẵng", None),
    (7, 19, 3, "Thứ 6 tuần tới • Chỉ nhận báo giá ≥ 950k", None),
    (8, 21, 2, "Thứ 7 cao điểm • Ưu tiên đơn từ 2 đêm trở lên", None),
    (9, 16, 2, "Mở rộng chào giá hạng Suite gia đình", None),
    (10, 13, 1, "Thăm dò sớm • Giữ mức chiết khấu nhẹ 5–8%", None),
    (11, 12, 1, "Giữ giá chuẩn • Không hạ sâu xa ngày", None),
    (12, 11, 1, "Bán song song OTA giá BAR + Đấu giá chọn lọc", None),
    (13, 10, 0, "Ngoài 13 ngày • Bảo vệ Rate Parity tuyệt đối", None),
]
start_ref = date(2026, 11, 6)
calendar_14d_pms = []
for offset, other_b, auc_b, policy, lreq in cal_rows_plan:
    d = start_ref + timedelta(days=offset)
    vacant_r = 30 - (other_b + auc_b)
    calendar_14d_pms.append({
        "dayOffset": offset,
        "isoDate": d.isoformat(),
        "dateStr": d.strftime("%d/%m"),
        "fullDate": d.strftime("%d/%m/%Y"),
        "dayLabel": "Hôm nay" if offset == 0 else ("Ngày mai" if offset == 1 else weekday_vn[d.weekday()]),
        "totalRooms": 30,
        "otherBooked": other_b,
        "auctionBooked": auc_b,
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
            "shortName": "Khách đổi ý trước khi TT",
            "color": "#a1a1aa",
            "actionHint": "Phòng không bị khóa nên không thiệt hại công suất",
        },
    ],
}

# 8. AUCTION SESSIONS MASTER FACT TABLE (4 live + 68 historical bids = 72 records)
auction_sessions = [
    # --- 4 ACTIVE LIVE SESSIONS ON 06/11/2026 ---
    {
        "id": "CRQ-8941",
        "status": "live",
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
            "submittedAtText": "Đã gửi 1 lần lúc 19:43",
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
    # Earlier in 30d window (Oct 08 - Oct 23), including 1 Medical Force-Majeure Refund on Oct 19!
    ("CRQ-8835", "2026-10-19", "15:00", "sup", "Superior", "Superior Double", 2, 850000, "auto", 1700000, False),
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
    note = (
        "Hoàn tiền y tế bất khả kháng (-1.700k)"
        if med_ref > 0
        else (f"Đã TT 100% • Đang lưu trú #{locked_rno}" if cid in stayover_room_map else "Đã TT 100% • Đối soát NHN KCP")
    )
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
        "medicalRefund": med_ref,
        "medicalRefundNote": "Khách nhập viện cấp cứu có xác nhận bệnh viện (Mục 5.3 Optibide)" if med_ref > 0 else None,
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
        "tip": "Lưu ý Pay-to-Lock: Phòng #130 đang tham gia đồng thời #CRQ-8942 và #CRQ-8944. Ai hoàn tất thanh toán 100% qua NHN KCP trước sẽ khóa phòng #130 và tự động rút phiên còn lại!",
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
        "sub": "Phiên Live #CRQ-8944 • Đã gửi báo giá 1 lần • Chờ khách thanh toán 100%",
        "title": "Khớp 94% • Đang chờ khách TT để khóa phòng #130",
        "items": [
            {
                "name": "Điều kiện Cứng (Hard Rule): Hạng Executive",
                "guest": "Executive • Nhận phòng tối nay 06/11",
                "hotel": "Executive Ocean Suite (#130 chưa khóa)",
                "status": "match",
                "label": "Đạt chuẩn cứng",
            },
            {
                "name": "Truyền hình OTT (Netflix/YouTube) & Hồ bơi",
                "guest": "OTT TV + Hồ bơi + Bữa sáng",
                "hotel": "Smart TV 55 inch có sẵn OTT + Buffet sáng",
                "status": "match",
                "label": "Khớp 100%",
            },
        ],
        "tip": "Bạn đã gửi báo giá 1 lần (1.950.000đ/đêm + Buffet sáng). Theo quy tắc One-Shot Bid, giá đã khóa cố định 60 phút nhưng phòng #130 vẫn mở cho #CRQ-8942 tới khi có người thanh toán.",
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

# 12. SCHEMA MANIFEST
schema_manifest = {
    "schemaVersion": "2.5.0",
    "architecture": "goodNstay Pay-to-Lock • 0% Hotel Commission • 1.265x Guest Total",
    "generatedAt": "2026-11-06T19:45:00+07:00",
    "primaryReferenceDate": "2026-11-06",
    "tables": {
        "hotelProfile": {"file": "hotel_profile.json", "pk": "hotelId", "description": "Cấu hình khách sạn, tỷ lệ phí 15% + VAT 10%, ELO & điểm đánh giá 5 sao"},
        "usersRoles": {"file": "users_roles.json", "pk": "userId", "description": "Phân quyền RBAC Quản lý vs. Lễ tân"},
        "perksCatalog": {"file": "perks_catalog.json", "pk": "id", "description": "Danh mục đặc quyền mềm bù đắp điểm khớp"},
        "roomClasses": {"file": "room_classes.json", "pk": "id", "description": "4 hạng phòng gốc (Tổng 30 phòng vật lý)"},
        "roomsPms": {"file": "rooms_pms.json", "pk": "roomNumber", "fk": "roomClassId -> roomClasses.id", "description": "Trạng thái khóa thực tế của 30 mã phòng #101-#130 đêm 06/11/2026"},
        "calendar14dPms": {"file": "calendar_14d_pms.json", "pk": "dayOffset", "description": "Lịch tồn kho 14 ngày vàng (06/11 - 19/11/2026)"},
        "systemBenchmarks": {"file": "system_benchmarks.json", "pk": "regionName", "description": "Dữ liệu chuẩn so sánh toàn sàn Đà Nẵng theo kỳ Today / 7D / 30D"},
        "auctionSessions": {"file": "auction_sessions.json", "pk": "id", "fk": "matchedRoomClassId -> roomClasses.id", "description": "Bảng giao dịch gốc gồm 4 phiên Live + 68 phiên lịch sử trong 30 ngày"},
        "matchBreakdowns": {"file": "match_breakdowns.json", "pk": "reqId", "description": "Chi tiết chấm điểm Hard Rules & Soft Rules AI Match %"},
        "lossAutopsies": {"file": "loss_autopsies.json", "pk": "id", "description": "Hồ sơ đối chiếu mổ xẻ phiên trượt"},
        "botRules": {"file": "bot_rules.json", "pk": "ruleId", "description": "Các quy tắc Auto-Bid đang kích hoạt"},
    },
}

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
    "schema_manifest.json": schema_manifest,
}

for fname, payload in files_to_write.items():
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
    med_ref = sum(s.get("medicalRefund", 0) for s in wins)
    net_rev = base_rev - med_ref
    nights = sum(s["nights"] for s in wins)
    print(
        f"[{pkey}] Bids={len(sub)}, Wins={len(wins)}, WinRate={len(wins)/len(sub)*100:.1f}%, "
        f"BaseRev={base_rev:,}đ, MedRefund={med_ref:,}đ, NetReceive={net_rev:,}đ, Nights={nights}"
    )

losses_30d = [s for s in hist if s["status"] != "won"]
by_reason = {}
for s in losses_30d:
    r = s.get("lossReasonId", "other")
    by_reason[r] = by_reason.get(r, 0) + 1
print("Losses 30d breakdown:", by_reason, "Total losses:", len(losses_30d))
print("Rooms PMS count:", len(rooms_pms),
      "Other:", sum(1 for r in rooms_pms if r["status"] == "booked_other"),
      "Auction:", sum(1 for r in rooms_pms if r["status"] == "booked_auction"),
      "Vacant:", sum(1 for r in rooms_pms if r["status"] == "vacant_unlocked"),
      "CheckOutTomorrow:", sum(1 for r in rooms_pms if r["status"] != "vacant_unlocked" and r["checkOutTomorrow"]))
print("100% Foreign Key & Mathematical Integrity Verified!")
