#!/usr/bin/env python3
"""Generate Master Data v4.0 for Optibide Partner Hub (All Left-Menu Business Modules)."""
from __future__ import annotations

import copy
import datetime
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MASTER_DIR = ROOT / "master-data"
SEED_DIR = MASTER_DIR / "seed"

OBSOLETE_FILES = [
    "hotel_profile.json",
    "users_roles.json",
    "perks_catalog.json",
    "room_classes.json",
    "rooms_pms.json",
    "calendar_14d_pms.json",
    "system_benchmarks.json",
    "auction_sessions.json",
    "match_breakdowns.json",
    "loss_autopsies.json",
    "bot_rules.json",
    "lifecycle_catalog.json",
]

GUEST_PROFILES_BY_BOOKING: dict[str, tuple[str, str]] = {
    "#71": ("Trần Minh Anh", "+84 905 412 819"),
    "#70": ("Nguyễn Hoàng Phúc", "+84 913 628 405"),
    "#69": ("Lê Hoàng Nam", "+84 903 884 210"),
    "#68": ("Park Ji-hoon", "+82 10-4821-9034"),
    "#67": ("Choi Soo-bin", "+82 10-7390-1128"),
    "#66": ("Lê Quốc Bảo", "+84 988 301 742"),
    "#65": ("Emma Laurent", "+33 6 42 81 90 15"),
    "#64": ("Võ Thanh Tùng", "+84 909 517 336"),
    "#63": ("Kim Min-seo", "+82 10-6104-5582"),
    "#62": ("Phạm Gia Huy", "+84 935 208 614"),
    "#61": ("Daniel Carter", "+1 415-890-2314"),
    "#60": ("Đặng Thu Trang", "+84 977 492 108"),
    "#59": ("Lee Hyun-woo", "+82 10-3928-7741"),
    "#58": ("Hoàng Đức Anh", "+84 912 745 920"),
    "#57": ("Bùi Ngọc Ánh", "+84 906 118 540"),
    "#56": ("Yoon Seo-연 (Seo-yeon)", "+82 10-8451-3209"),
    "#55": ("Trương Quốc Khánh", "+84 938 660 219"),
    "#54": ("Olivia Chen", "+65 9182 4407"),
    "#53": ("Ngô Minh Khôi", "+84 904 771 392"),
    "#52": ("Phan Thanh Thảo", "+84 983 215 804"),
    "#51": ("Jung Woo-성 (Woo-sung)", "+82 10-5520-8193"),
    "#50": ("Đỗ Quang Vinh", "+84 918 339 470"),
    "#49": ("Vũ Hải Đăng", "+84 902 984 115"),
    "#48": ("Kang Ha-늘 (Ha-neul)", "+82 10-9012-6438"),
    "#47": ("Lý Mỹ Linh", "+84 932 510 786"),
    "#46": ("Lucas Meyer", "+49 171 4829103"),
    "#45": ("Hồ Bảo Châu", "+84 907 624 891"),
    "#44": ("Han Ji-민 (Ji-min)", "+82 10-2749-6012"),
    "#43": ("Đinh Tuấn Kiệt", "+84 914 803 257"),
}

CLEAN_GUEST_NAMES: dict[str, tuple[str, str]] = {
    k: (v[0].split(" (")[0] if "(" not in v[0] else v[0].split("(")[1].rstrip(")"), v[1])
    for k, v in GUEST_PROFILES_BY_BOOKING.items()
}
# Keep Vietnamese names natural and international names pure ASCII/Latin so zero KO/VI script confusion
CLEAN_GUEST_NAMES.update({
    "#71": ("Minh Anh", "+84 905 412 819"),
    "#70": ("Hoang Phuc", "+84 913 628 405"),
    "#69": ("Hoang Nam", "+84 903 884 210"),
    "#68": ("Park Ji-hoon", "+82 10-4821-9034"),
    "#67": ("Choi Soo-bin", "+82 10-7390-1128"),
    "#66": ("Quoc Bao", "+84 988 301 742"),
    "#65": ("Emma Laurent", "+33 6 42 81 90 15"),
    "#64": ("Thanh Tung", "+84 909 517 336"),
    "#63": ("Kim Min-seo", "+82 10-6104-5582"),
    "#62": ("Gia Huy", "+84 935 208 614"),
    "#61": ("Daniel Carter", "+1 415-890-2314"),
    "#60": ("Thu Trang", "+84 977 492 108"),
    "#59": ("Lee Hyun-woo", "+82 10-3928-7741"),
    "#58": ("Duc Anh", "+84 912 745 920"),
    "#57": ("Ngoc Anh", "+84 906 118 540"),
    "#56": ("Yoon Seo-yeon", "+82 10-8451-3209"),
    "#55": ("Quoc Khanh", "+84 938 660 219"),
    "#54": ("Olivia Chen", "+65 9182 4407"),
    "#53": ("Minh Khoi", "+84 904 771 392"),
    "#52": ("Thanh Thao", "+84 983 215 804"),
    "#51": ("Jung Woo-sung", "+82 10-5520-8193"),
    "#50": ("Quang Vinh", "+84 918 339 470"),
    "#49": ("Hai Dang", "+84 902 984 115"),
    "#48": ("Kang Ha-neul", "+82 10-9012-6438"),
    "#47": ("My Linh", "+84 932 510 786"),
    "#46": ("Lucas Meyer", "+49 171 4829103"),
    "#45": ("Bao Chau", "+84 907 624 891"),
    "#44": ("Han Ji-min", "+82 10-2749-6012"),
    "#43": ("Tuan Kiet", "+84 914 803 257"),
})

PROP_PREFIX = {
    "br_mykhe": "MK",
    "br_songhan": "SH",
    "br_anthuong": "AT",
}

ROOM_EN_TO_SUFFIX = {
    "Superior Double": "SUP",
    "Deluxe Twin City View": "DLX",
    "Family Connecting Suite": "FAM",
    "Executive Ocean Suite": "EXE",
}


def determine_room_type_id(prop_id: str, room_en: str) -> str:
    prefix = PROP_PREFIX[prop_id]
    suffix = ROOM_EN_TO_SUFFIX[room_en]
    return f"RT-{prefix}-{suffix}"


def determine_cycle_key(session_date: str) -> str:
    if session_date <= "2026-10-24":
        return "10A"
    if session_date <= "2026-11-02":
        return "10B"
    if session_date <= "2026-11-05":
        return "11A"
    return "11B"


def determine_stay_status(check_in: str, check_out: str, ref_date: str = "2026-11-06") -> str:
    if check_in == ref_date:
        return "arriving_today"
    if check_in < ref_date < check_out:
        return "in_house"
    if check_out <= ref_date:
        return "checked_out"
    return "upcoming"


def build_room_inventory(accepted_by_room: dict[int, dict]) -> dict:
    lamour_specs = [
        ("br_mykhe", "MK", [
            ("SUP", {"vi": "Phòng Superior Giường Đôi", "en": "Superior Double", "ko": "슈페리어 더블"},
             {"vi": "1 giường đôi lớn (Queen)", "en": "1 Queen Bed", "ko": "퀸 베드 1개"},
             26, 2, [101, 102, 106, 108], 920000, 760000, ["wifi", "elevator", "ott_tv"]),
            ("DLX", {"vi": "Phòng Deluxe 2 Giường Đơn (Hướng Phố)", "en": "Deluxe Twin City View", "ko": "디럭스 트윈 시티뷰"},
             {"vi": "2 giường đơn tiêu chuẩn", "en": "2 Single Beds", "ko": "싱글 베드 2개"},
             32, 2, [111, 112, 116, 119], 1180000, 950000, ["breakfast", "wifi", "pool", "elevator"]),
            ("FAM", {"vi": "Suite Gia Đình Thông Nhau", "en": "Family Connecting Suite", "ko": "패밀리 커넥팅 스위트"},
             {"vi": "2 giường lớn thông phòng", "en": "2 King Connecting Beds", "ko": "킹 커넥팅 베드 2개"},
             48, 4, [121, 122], 1920000, 1600000, ["breakfast", "wifi", "pool", "parking", "bathtub"]),
            ("EXE", {"vi": "Suite Hướng Biển Trực Diện", "en": "Executive Ocean Suite", "ko": "이그제큐티브 오션 스위트"},
             {"vi": "1 giường King hướng biển Mỹ Khê", "en": "1 King Oceanfront Bed", "ko": "오션프론트 킹 베드 1개"},
             54, 3, [129, 130], 2250000, 1850000, ["breakfast", "wifi", "pool", "bathtub", "late_checkout"]),
        ]),
        ("br_songhan", "SH", [
            ("SUP", {"vi": "Phòng Superior Giường Đôi", "en": "Superior Double", "ko": "슈페리어 더블"},
             {"vi": "1 giường đôi lớn (Queen)", "en": "1 Queen Bed", "ko": "퀸 베드 1개"},
             25, 2, [103, 107, 109], 900000, 750000, ["wifi", "elevator", "ott_tv"]),
            ("DLX", {"vi": "Phòng Deluxe 2 Giường Đơn (Hướng Phố)", "en": "Deluxe Twin City View", "ko": "디럭스 트윈 시티뷰"},
             {"vi": "2 giường đơn nhìn cầu Sông Hàn", "en": "2 Single Beds · River District", "ko": "싱글 베드 2개 · 도심 전망"},
             31, 2, [113, 114, 117, 120], 1150000, 920000, ["breakfast", "wifi", "elevator", "parking"]),
            ("FAM", {"vi": "Suite Gia Đình Thông Nhau", "en": "Family Connecting Suite", "ko": "패밀리 커넥팅 스위트"},
             {"vi": "2 giường đôi rộng cho gia đình", "en": "2 Queen Connecting Beds", "ko": "퀸 커넥팅 베드 2개"},
             46, 4, [123, 126], 1880000, 1580000, ["breakfast", "wifi", "parking", "bathtub"]),
            ("EXE", {"vi": "Suite Hướng Biển Trực Diện", "en": "Executive Ocean Suite", "ko": "이그제큐티브 오션 스위트"},
             {"vi": "1 giường King tầng cao toàn cảnh", "en": "1 King Panorama Suite", "ko": "파노라마 킹 스위트 1개"},
             52, 3, [127], 2200000, 1820000, ["breakfast", "wifi", "bathtub", "late_checkout", "ott_tv"]),
        ]),
        ("br_anthuong", "AT", [
            ("SUP", {"vi": "Phòng Superior Giường Đôi", "en": "Superior Double", "ko": "슈페리어 더블"},
             {"vi": "1 giường đôi khu phố du lịch", "en": "1 Queen Bed · Courtyard", "ko": "퀸 베드 1개"},
             24, 2, [104, 105, 110], 880000, 740000, ["wifi", "elevator", "ott_tv"]),
            ("DLX", {"vi": "Phòng Deluxe 2 Giường Đơn (Hướng Phố)", "en": "Deluxe Twin City View", "ko": "디럭스 트윈 시티뷰"},
             {"vi": "2 giường đơn ban công thoáng", "en": "2 Single Beds with Balcony", "ko": "발코니 싱글 베드 2개"},
             30, 2, [115, 118], 1120000, 900000, ["breakfast", "wifi", "pool", "elevator"]),
            ("FAM", {"vi": "Suite Gia Đình Thông Nhau", "en": "Family Connecting Suite", "ko": "패밀리 커넥팅 스위트"},
             {"vi": "Phòng đôi thông nhau cho 4 khách", "en": "Connecting Suite for 4 Guests", "ko": "4인 가족 커넥팅 스위트"},
             45, 4, [124, 125], 1850000, 1550000, ["breakfast", "wifi", "pool", "parking"]),
            ("EXE", {"vi": "Suite Hướng Biển Trực Diện", "en": "Executive Ocean Suite", "ko": "이그제큐티브 오션 스위트"},
             {"vi": "1 giường King & bồn tắm nằm", "en": "1 King Bed & Soaking Tub", "ko": "킹 베드 및 욕조 완비"},
             50, 3, [128], 2150000, 1800000, ["breakfast", "wifi", "pool", "bathtub", "late_checkout"]),
        ]),
    ]

    h11_specs = [
        ("STD", {"vi": "Phòng Tiêu Chuẩn Giường Đôi", "en": "Standard Queen Room", "ko": "스탠다드 퀸 룸"},
         {"vi": "1 giường đôi gọn gàng, yên tĩnh", "en": "1 Cozy Queen Bed", "ko": "아늑한 퀸 베드 1개"},
         23, 2, [201, 202, 203, 204, 205, 206, 207, 208], 960000, 780000, ["wifi", "elevator", "ott_tv"]),
        ("DLX", {"vi": "Phòng Deluxe Hướng Phố Trung Tâm", "en": "Deluxe City View", "ko": "디럭스 시티뷰"},
         {"vi": "1 giường King hoặc 2 giường đơn", "en": "1 King or 2 Twin Beds", "ko": "킹 베드 1개 또는 트윈"},
         29, 2, [209, 210, 211, 212, 213, 214], 1220000, 960000, ["breakfast", "wifi", "elevator", "parking"]),
        ("SUI", {"vi": "Phòng Suite Cao Cấp H11", "en": "Premier H11 Suite", "ko": "프리미어 H11 스위트"},
         {"vi": "Phòng khách riêng & bồn tắm", "en": "Living Lounge & Bathtub", "ko": "거실 라운지 및 욕조"},
         42, 4, [215, 216, 217, 218], 1680000, 1320000, ["breakfast", "wifi", "bathtub", "late_checkout", "parking"]),
    ]

    room_types = []
    units = []
    dirty_rooms = {101, 114, 105, 204}
    maint_rooms = {122, 120, 218}
    staff_cycle = ["Cô Lan", "Chị Hương", "Anh Nam", "Chị Thảo"]

    am_to_option = {
        "breakfast": "breakfastIncluded",
        "wifi": "freeWifi",
        "pool": "swimmingPool",
        "elevator": "elevator",
        "parking": "freeParking",
        "late_checkout": "lateCheckout",
        "bathtub": "soakingBathtub",
        "ott_tv": "smartOttTv",
    }
    suffix_to_rt_key = {
        "SUP": "standard",
        "STD": "standard",
        "DLX": "deluxe",
        "FAM": "family_suite",
        "EXE": "executive_suite",
        "SUI": "executive_suite",
    }
    suffix_to_bed_key = {
        "SUP": "doubleQueenKing",
        "STD": "doubleQueenKing",
        "DLX": "twinSingle",
        "FAM": "connectingBeds",
        "EXE": "doubleQueenKing",
        "SUI": "doubleQueenKing",
    }

    for prop_id, prefix, classes in lamour_specs + [("stay_h11", "H11", h11_specs)]:
        for suffix, name_i18n, bed_i18n, sqm, max_g, room_nums, std_rate, flr_rate, ams in classes:
            rt_id = f"RT-{prefix}-{suffix}"
            rt_key = suffix_to_rt_key[suffix]
            bed_key = suffix_to_bed_key[suffix]
            opt_keys = sorted(am_to_option[a] for a in ams)
            photo_cnt = 2 if prop_id == "stay_h11" else (6 if suffix in ("EXE", "FAM") else 4)
            room_types.append({
                "id": rt_id,
                "propertyId": prop_id,
                "name": name_i18n,
                "bedSummary": bed_i18n,
                "sizeSqm": sqm,
                "maxGuests": max_g,
                "unitsCount": len(room_nums),
                "standardRateVnd": std_rate,
                "floorRateVnd": flr_rate,
                "amenities": ams,
                "biddingEnabled": True,
                "catalogMapping": {
                    "room_id": rt_id,
                    "room_type_key": rt_key,
                    "bed_type_key": bed_key,
                    "service_option_keys": opt_keys,
                    "combo_signature": f"hotel|{rt_key}|{bed_key}|{'+'.join(opt_keys)}",
                    "gallery_room_photos_count": photo_cnt,
                },
            })
            for idx, rnum in enumerate(room_nums):
                floor = (rnum // 100) + ((rnum % 100) // 10)
                active_bk = accepted_by_room.get(rnum)
                if active_bk:
                    st = "occupied"
                    bk_code = active_bk["bookingCode"]
                    note = {
                        "vi": f"Khách đơn {bk_code} đang lưu trú đến {active_bk['checkOutDate'][-2:]}/{active_bk['checkOutDate'][5:7]}",
                        "en": f"Occupied by reservation {bk_code} until {active_bk['checkOutDate']}",
                        "ko": f"예약 {bk_code} 투숙 중 ({active_bk['checkOutDate']} 체크아웃)",
                    }
                elif rnum in maint_rooms:
                    st = "maintenance"
                    bk_code = None
                    note = {
                        "vi": "Đang bảo dưỡng định kỳ điều hòa & vòi sen",
                        "en": "Scheduled AC & bathroom fixture maintenance",
                        "ko": "정기 냉방 및 욕실 설비 점검 중",
                    }
                elif rnum in dirty_rooms:
                    st = "dirty"
                    bk_code = None
                    note = {
                        "vi": "Khách vừa trả phòng sáng nay — đang dọn buồng",
                        "en": "Recent check-out — housekeeping in progress",
                        "ko": "체크아웃 직후 객실 정비 진행 중",
                    }
                else:
                    st = "ready"
                    bk_code = None
                    note = {
                        "vi": "Phòng sạch, kiểm tra đủ khăn & nước suối, sẵn sàng đón khách",
                        "en": "Clean & inspected — ready for immediate check-in",
                        "ko": "청소 및 비품 점검 완료 — 즉시 입실 가능",
                    }

                unit_obj = {
                    "unitId": f"UNIT-{prop_id.upper()}-{rnum}",
                    "propertyId": prop_id,
                    "roomTypeId": rt_id,
                    "roomNumber": rnum,
                    "floor": floor,
                    "status": st,
                    "housekeepingAssignee": staff_cycle[(rnum + idx) % len(staff_cycle)],
                    "note": note,
                }
                if bk_code:
                    unit_obj["activeBookingCode"] = bk_code
                units.append(unit_obj)

    calendar_blocks = [
        {
            "id": "BLK-01",
            "propertyId": "br_mykhe",
            "roomNumber": 122,
            "startDate": "2026-11-06",
            "endDate": "2026-11-08",
            "blockType": "maintenance",
            "title": {
                "vi": "Bảo dưỡng điều hòa định kỳ",
                "en": "AC Preventive Maintenance",
                "ko": "에어컨 정기 점검",
            },
        },
        {
            "id": "BLK-02",
            "propertyId": "br_mykhe",
            "roomNumber": 111,
            "startDate": "2026-11-08",
            "endDate": "2026-11-10",
            "blockType": "walkin_hold",
            "title": {
                "vi": "Khách đoàn đặt trực tiếp tại quầy",
                "en": "Direct Walk-in Group Hold",
                "ko": "프런트 직접 단체 예약 홀드",
            },
        },
        {
            "id": "BLK-03",
            "propertyId": "br_songhan",
            "roomNumber": 120,
            "startDate": "2026-11-06",
            "endDate": "2026-11-08",
            "blockType": "maintenance",
            "title": {
                "vi": "Thay mới rèm cản sáng & đèn ngủ",
                "en": "Blackout Curtain & Lighting Upgrade",
                "ko": "암막 커튼 및 조명 교체",
            },
        },
        {
            "id": "BLK-04",
            "propertyId": "br_anthuong",
            "roomNumber": 124,
            "startDate": "2026-11-07",
            "endDate": "2026-11-10",
            "blockType": "walkin_hold",
            "title": {
                "vi": "Khách quen giữ phòng cuối tuần",
                "en": "Returning Guest Weekend Hold",
                "ko": "단골 고객 주말 사전 홀드",
            },
        },
        {
            "id": "BLK-05",
            "propertyId": "stay_h11",
            "roomNumber": 218,
            "startDate": "2026-11-06",
            "endDate": "2026-11-08",
            "blockType": "maintenance",
            "title": {
                "vi": "Hoàn thiện chụp ảnh mẫu phòng Suite",
                "en": "Suite Staging & Photography",
                "ko": "스위트 객실 촬영 및 최종 점검",
            },
        },
    ]

    return {
        "roomTypes": room_types,
        "units": units,
        "calendarBlocks": calendar_blocks,
    }


def build_payout_ledgers(accepted_records: list[dict]) -> dict:
    bank_accounts = [
        {
            "propertyId": "br_mykhe",
            "bankName": "Vietcombank — CN Đà Nẵng",
            "accountNumber": "0041 0008 92418",
            "accountHolder": "CONG TY TNHH KHACH SAN LAMOUR MY KHE",
            "payoutCycleLabel": {
                "vi": "Đối soát tự động thứ Ba & thứ Sáu hàng tuần",
                "en": "Automatic settlement every Tuesday & Friday",
                "ko": "매주 화요일·금요일 자동 정산 입금",
            },
            "verified": True,
            "autoSettlement": True,
            "updatedAt": "2026-11-01",
        },
        {
            "propertyId": "br_songhan",
            "bankName": "Techcombank — CN Hải Châu",
            "accountNumber": "1903 6482 11509",
            "accountHolder": "CHI NHANH KHACH SAN LAMOUR SONG HAN",
            "payoutCycleLabel": {
                "vi": "Đối soát tự động thứ Ba & thứ Sáu hàng tuần",
                "en": "Automatic settlement every Tuesday & Friday",
                "ko": "매주 화요일·금요일 자동 정산 입금",
            },
            "verified": True,
            "autoSettlement": True,
            "updatedAt": "2026-11-01",
        },
        {
            "propertyId": "br_anthuong",
            "bankName": "ACB — PGD Ngũ Hành Sơn",
            "accountNumber": "8829 1045 668",
            "accountHolder": "CHI NHANH KHACH SAN LAMOUR AN THUONG",
            "payoutCycleLabel": {
                "vi": "Đối soát tự động thứ Ba & thứ Sáu hàng tuần",
                "en": "Automatic settlement every Tuesday & Friday",
                "ko": "매주 화요일·금요일 자동 정산 입금",
            },
            "verified": True,
            "autoSettlement": True,
            "updatedAt": "2026-11-01",
        },
        {
            "propertyId": "stay_h11",
            "bankName": "Shinhan Bank — Seoul / Da Nang Desk",
            "accountNumber": "110-482-993015",
            "accountHolder": "STAY HOTEL H11 HOSPITALITY CO., LTD",
            "payoutCycleLabel": {
                "vi": "Đã xác thực — Sẵn sàng nhận khoản thanh toán đơn đầu tiên",
                "en": "Verified — Ready to settle first completed booking",
                "ko": "계좌 인증 완료 — 첫 확정 예약 발생 시 자동 정산",
            },
            "verified": True,
            "autoSettlement": True,
            "updatedAt": "2026-11-05",
        },
    ]

    cycle_defs = [
        ("10A", "2026-10-08", "2026-10-24", "2026-10-26", "2026-10-26", "paid", "VCB-261026", {
            "vi": "Đã chuyển khoản đủ 100% về tài khoản ngân hàng của cơ sở",
            "en": "100% net room payout settled to property bank account",
            "ko": "호텔 지정 계좌로 100% 정산 입금 완료",
        }),
        ("10B", "2026-10-25", "2026-11-02", "2026-11-04", "2026-11-04", "paid", "VCB-261104", {
            "vi": "Đã đối soát & nổi tiền hoàn tất trong kỳ đầu tháng 11",
            "en": "Reconciled and credited in early-November payout run",
            "ko": "11월 초 정기 정산 주기에 정상 입금 완료",
        }),
        ("11A", "2026-11-03", "2026-11-05", "2026-11-07", None, "processing", "PENDING-261107", {
            "vi": "Ngân hàng đang xử lý lệnh chuyển — dự kiến nhận trong ngày 07/11/2026",
            "en": "Bank transfer queued — expected arrival on Nov 07, 2026",
            "ko": "은행 이체 처리 중 — 2026.11.07 입금 예정",
        }),
        ("11B", "2026-11-06", "2026-11-06", "2026-11-10", None, "upcoming", None, {
            "vi": "Đơn mới phát sinh hôm nay — sẽ gộp vào kỳ đối soát ngày 10/11/2026",
            "en": "New bookings paid today — scheduled for Nov 10, 2026 cycle",
            "ko": "오늘 결제된 신규 예약 — 2026.11.10 정산 주기 포함 예정",
        }),
    ]

    batches = []
    for prop_id, prefix in [("br_mykhe", "MK"), ("br_songhan", "SH"), ("br_anthuong", "AT")]:
        for c_key, p_start, p_end, sched_dt, paid_dt, st, ref_prefix, note_i18n in cycle_defs:
            matched = [
                r for r in accepted_records
                if r["propertyId"] == prop_id and p_start <= r["sessionDate"] <= p_end
            ]
            if not matched:
                continue
            batch_id = f"STL-{prefix}-{c_key}"
            for r in matched:
                r["payoutBatchId"] = batch_id
            gross = sum(r["netRevenueVnd"] for r in matched)
            pf_sum = sum(r["telemetry"]["payment_form"]["platform_fee_amount"] for r in matched)
            vat_sum = sum(r["telemetry"]["payment_form"]["vat_amount"] for r in matched)
            gmv_sum = sum(r["telemetry"]["payment_form"]["total_booking_amount"] for r in matched)
            batch_obj = {
                "id": batch_id,
                "propertyId": prop_id,
                "cycleCode": f"2026-{c_key}",
                "periodStart": p_start,
                "periodEnd": p_end,
                "scheduledPayoutDate": sched_dt,
                "status": st,
                "bookingCodes": [r["bookingCode"] for r in matched],
                "bookingsCount": len(matched),
                "grossRoomVnd": gross,
                "adjustmentVnd": 0,
                "netPayoutVnd": gross,
                "note": note_i18n,
                "settlementBreakdown": {
                    "payment_codes": [r["telemetry"]["payment_form"]["payment_code"] for r in matched],
                    "booking_currency": "VND",
                    "partner_base_price_vnd": gross,
                    "platform_fee_15pct_vnd": pf_sum,
                    "vat_10pct_vnd": vat_sum,
                    "total_booking_gmv_vnd": gmv_sum,
                },
            }
            if paid_dt:
                batch_obj["paidAtDate"] = paid_dt
            if ref_prefix:
                batch_obj["bankTransferRef"] = f"{ref_prefix}-{prefix}"
            batches.append(batch_obj)

    # Sort newest cycles first
    batches.sort(key=lambda b: (b["periodEnd"], b["propertyId"]), reverse=True)
    return {
        "bankAccounts": bank_accounts,
        "batches": batches,
    }


def build_bidding_operations() -> dict:
    live_requests = [
        {
            "id": "REQ-9018",
            "propertyId": "br_mykhe",
            "receivedAt": "19:24",
            "expiresInMinutes": 18,
            "checkInDate": "2026-11-07",
            "checkOutDate": "2026-11-09",
            "nights": 2,
            "guestsCount": 2,
            "roomTypePreference": {
                "vi": "Phòng Deluxe hoặc Suite gần biển Mỹ Khê",
                "en": "Deluxe or Ocean Suite near My Khe Beach",
                "ko": "미케 해변 인근 디럭스 또는 오션 스위트",
            },
            "travelerSegment": {
                "vi": "Cặp đôi du lịch cuối tuần",
                "en": "Weekend Leisure Couple",
                "ko": "주말 커플 여행객",
            },
            "guestTargetRatePerNightVnd": 1080000,
            "suggestedWinRatePerNightVnd": 1050000,
            "requestedPerks": ["breakfast", "wifi", "pool"],
            "guestMessage": {
                "vi": "Ưu tiên phòng tầng cao thoáng mát, có ăn sáng cho 2 người.",
                "en": "Prefer high floor with morning breakfast for 2 adults.",
                "ko": "고층 객실 및 성인 2인 조식 포함 조건을 희망합니다.",
            },
            "status": "waiting_offer",
        },
        {
            "id": "REQ-9017",
            "propertyId": "br_songhan",
            "receivedAt": "19:18",
            "expiresInMinutes": 24,
            "checkInDate": "2026-11-08",
            "checkOutDate": "2026-11-11",
            "nights": 3,
            "guestsCount": 2,
            "roomTypePreference": {
                "vi": "Phòng 2 giường đơn khu trung tâm Hải Châu",
                "en": "Deluxe Twin in Hai Chau Center",
                "ko": "하이쩌우 도심 디럭스 트윈",
            },
            "travelerSegment": {
                "vi": "Khách công tác 3 đêm",
                "en": "3-Night Business Stay",
                "ko": "3박 비즈니스 출장객",
            },
            "guestTargetRatePerNightVnd": 980000,
            "suggestedWinRatePerNightVnd": 960000,
            "requestedPerks": ["breakfast", "wifi", "parking"],
            "guestMessage": {
                "vi": "Cần bàn làm việc yên tĩnh và xuất hóa đơn công ty khi trả phòng.",
                "en": "Need quiet workspace desk and corporate tax receipt at check-out.",
                "ko": "조용한 업무용 책상과 체크아웃 시 법인 영수증 발급이 필요합니다.",
            },
            "status": "waiting_offer",
        },
        {
            "id": "REQ-9016",
            "propertyId": "br_anthuong",
            "receivedAt": "19:05",
            "expiresInMinutes": 32,
            "checkInDate": "2026-11-07",
            "checkOutDate": "2026-11-10",
            "nights": 3,
            "guestsCount": 4,
            "roomTypePreference": {
                "vi": "Suite Gia Đình 4 khách khu An Thượng",
                "en": "Family Suite for 4 in An Thuong",
                "ko": "안트엉 4인 패밀리 스위트",
            },
            "travelerSegment": {
                "vi": "Gia đình có trẻ nhỏ",
                "en": "Family of 4 Leisure Stay",
                "ko": "4인 가족 여행객",
            },
            "guestTargetRatePerNightVnd": 1680000,
            "suggestedWinRatePerNightVnd": 1650000,
            "requestedPerks": ["breakfast", "pool", "late_checkout"],
            "guestMessage": {
                "vi": "Gia đình có 2 bé nhỏ, mong muốn phòng thông nhau gần hồ bơi.",
                "en": "Traveling with 2 kids, looking for connecting suite with pool access.",
                "ko": "어린이 2명 동반 가족으로 수영장 이용이 편한 커넥팅 룸을 원합니다.",
            },
            "status": "waiting_offer",
        },
        {
            "id": "REQ-9015",
            "propertyId": "br_mykhe",
            "receivedAt": "18:50",
            "expiresInMinutes": 40,
            "checkInDate": "2026-11-09",
            "checkOutDate": "2026-11-11",
            "nights": 2,
            "guestsCount": 2,
            "roomTypePreference": {
                "vi": "Suite Hướng Biển Trực Diện",
                "en": "Executive Ocean Suite",
                "ko": "이그제큐티브 오션 스위트",
            },
            "travelerSegment": {
                "vi": "Kỷ niệm ngày cưới",
                "en": "Anniversary Getaway",
                "ko": "기념일 휴양 커플",
            },
            "guestTargetRatePerNightVnd": 1950000,
            "suggestedWinRatePerNightVnd": 1920000,
            "requestedPerks": ["breakfast", "bathtub", "late_checkout"],
            "guestMessage": {
                "vi": "Mong muốn phòng view biển trực diện và bồn tắm nằm.",
                "en": "Looking for direct oceanfront view and soaking bathtub.",
                "ko": "정면 오션뷰와 욕조가 있는 스위트 객실을 찾고 있습니다.",
            },
            "status": "offer_sent",
            "submittedRatePerNightVnd": 1920000,
            "submittedPerks": ["breakfast", "bathtub", "late_checkout"],
            "respondedAt": "18:52",
        },
        {
            "id": "REQ-9014",
            "propertyId": "stay_h11",
            "receivedAt": "19:22",
            "expiresInMinutes": 15,
            "checkInDate": "2026-11-07",
            "checkOutDate": "2026-11-09",
            "nights": 2,
            "guestsCount": 2,
            "roomTypePreference": {
                "vi": "Phòng Deluxe Hướng Phố Trung Tâm",
                "en": "Deluxe City View",
                "ko": "디럭스 시티뷰",
            },
            "travelerSegment": {
                "vi": "Cơ hội chốt đơn mở hàng đầu tiên",
                "en": "First-Booking Conversion Opportunity",
                "ko": "첫 확정 예약 유치 유망 요청",
            },
            "guestTargetRatePerNightVnd": 990000,
            "suggestedWinRatePerNightVnd": 960000,
            "requestedPerks": ["breakfast", "wifi", "late_checkout"],
            "guestMessage": {
                "vi": "Khách tìm phòng mới sạch sẽ 2 đêm cuối tuần — rất dễ chốt nếu tặng kèm bữa sáng!",
                "en": "Traveler seeking clean newly opened hotel for 2 weekend nights — high win chance with breakfast!",
                "ko": "신축급 깔끔한 주말 2박 숙소를 찾는 고객입니다 — 조식 포함 제안 시 수락 가능성이 높습니다!",
            },
            "status": "waiting_offer",
        },
        {
            "id": "REQ-9013",
            "propertyId": "stay_h11",
            "receivedAt": "19:08",
            "expiresInMinutes": 28,
            "checkInDate": "2026-11-08",
            "checkOutDate": "2026-11-10",
            "nights": 2,
            "guestsCount": 3,
            "roomTypePreference": {
                "vi": "Phòng Suite Cao Cấp H11",
                "en": "Premier H11 Suite",
                "ko": "프리미어 H11 스위트",
            },
            "travelerSegment": {
                "vi": "Nhóm bạn 3 người du lịch tự túc",
                "en": "3-Guest Friends Trip",
                "ko": "3인 자유여행 그룹",
            },
            "guestTargetRatePerNightVnd": 1400000,
            "suggestedWinRatePerNightVnd": 1360000,
            "requestedPerks": ["breakfast", "wifi", "parking"],
            "guestMessage": {
                "vi": "Cần phòng rộng cho 3 người lớn, nhận phòng lúc 15:00.",
                "en": "Need spacious suite for 3 adults, arriving around 3:00 PM.",
                "ko": "성인 3명 투숙 가능한 넓은 스위트 희망, 15시경 체크인 예정.",
            },
            "status": "waiting_offer",
        },
    ]

    auto_bid_rules = [
        {
            "propertyId": "br_mykhe",
            "enabled": True,
            "minFloorRateVnd": 780000,
            "maxDiscountPct": 15,
            "nightShiftAutoBoost": True,
            "multiNightExtraDiscountPct": 5,
            "defaultPerks": ["breakfast", "wifi", "pool"],
            "targetResponseSeconds": 25,
            "updatedAt": "2026-11-06 18:00",
        },
        {
            "propertyId": "br_songhan",
            "enabled": True,
            "minFloorRateVnd": 760000,
            "maxDiscountPct": 14,
            "nightShiftAutoBoost": True,
            "multiNightExtraDiscountPct": 5,
            "defaultPerks": ["breakfast", "wifi", "parking"],
            "targetResponseSeconds": 30,
            "updatedAt": "2026-11-06 17:30",
        },
        {
            "propertyId": "br_anthuong",
            "enabled": True,
            "minFloorRateVnd": 740000,
            "maxDiscountPct": 16,
            "nightShiftAutoBoost": True,
            "multiNightExtraDiscountPct": 6,
            "defaultPerks": ["breakfast", "wifi", "late_checkout"],
            "targetResponseSeconds": 30,
            "updatedAt": "2026-11-06 16:45",
        },
        {
            "propertyId": "stay_h11",
            "enabled": True,
            "minFloorRateVnd": 780000,
            "maxDiscountPct": 12,
            "nightShiftAutoBoost": True,
            "multiNightExtraDiscountPct": 8,
            "defaultPerks": ["wifi", "elevator"],
            "targetResponseSeconds": 20,
            "updatedAt": "2026-11-06 16:00",
        },
    ]

    prop_geo = {
        "br_mykhe": ("VN", "VN-DN", "VN-DN", "VN-DN-SONTRA", "VN-DN-SONTRA-PHUOCMY", 18),
        "br_songhan": ("VN", "VN-DN", "VN-DN", "VN-DN-HAICHAU", "VN-DN-HAICHAU-HAICHAU1", 22),
        "br_anthuong": ("VN", "VN-DN", "VN-DN", "VN-DN-NGUHANHSON", "VN-DN-NHS-MYAN", 15),
        "stay_h11": ("KR", "KR-11", "KR-11", "KR-11-JUNGGU", "KR-11-JUNGGU-MYEONGDONG", 14),
    }
    am_to_opt = {
        "breakfast": "breakfastIncluded",
        "wifi": "freeWifi",
        "pool": "swimmingPool",
        "elevator": "elevator",
        "parking": "freeParking",
        "late_checkout": "lateCheckout",
        "bathtub": "soakingBathtub",
        "ott_tv": "smartOttTv",
    }
    os_cycle = ["ios", "android", "web"]
    booker_cycle = ["VN", "KR", "VN", "US", "KR", "SG"]
    for idx, req in enumerate(live_requests):
        sc, sp, scty, sdist, sward, pcnt = prop_geo[req["propertyId"]]
        ci = datetime.date.fromisoformat(req["checkInDate"])
        ref_dt = datetime.date.fromisoformat("2026-11-06")
        lead_d = max(0, (ci - ref_dt).days)
        g_cnt = req["guestsCount"]
        if g_cnt == 4:
            adults, children, gtype = 2, 2, "family"
        elif g_cnt >= 3:
            adults, children, gtype = g_cnt, 0, "group"
        elif g_cnt == 2:
            adults, children, gtype = 2, 0, "couple"
        else:
            adults, children, gtype = 1, 0, "solo"
        opts = sorted(am_to_opt[p] for p in req["requestedPerks"])
        rt_pref = "family_suite" if g_cnt >= 4 else ("executive_suite" if req["id"] in ("REQ-9015", "REQ-9013") else "deluxe")
        bed_pref = "connectingBeds" if g_cnt >= 4 else ("twinSingle" if req["id"] == "REQ-9017" else "doubleQueenKing")
        dev_os = os_cycle[idx % len(os_cycle)]
        dev_type = "desktop" if dev_os == "web" else ("tablet" if idx == 4 else "mobile")
        req["requestTelemetry"] = {
            "request_id": f"190{18 - idx}",
            "request_code": req["id"],
            "session_form_id": f"SFM-LIVE-{idx + 1:02d}",
            "device_os": dev_os,
            "device_type": dev_type,
            "booker_country": booker_cycle[idx % len(booker_cycle)],
            "staying_country": sc,
            "staying_province": sp,
            "staying_city": scty,
            "staying_district": sdist,
            "staying_ward": sward,
            "partner_count": pcnt,
            "lead_time_days": lead_d,
            "room_count": 1,
            "adults": adults,
            "children": children,
            "infants": 0,
            "pets": 0,
            "group_type": gtype,
            "accommodation_type": "hotel",
            "combo_signature": f"hotel|{rt_pref}|{bed_pref}|{'+'.join(opts)}",
            "criteria_count": 2 + len(opts),
            "remaining_ttl_sec": req["expiresInMinutes"] * 60,
        }

    rule_targets = {
        "br_mykhe": (75, 16),
        "br_songhan": (72, 14),
        "br_anthuong": (70, 17),
        "stay_h11": (65, 12),
    }
    for rule in auto_bid_rules:
        min_match, sav_target = rule_targets[rule["propertyId"]]
        rule["guardrailTelemetry"] = {
            "is_auto_bid_default": rule["enabled"],
            "min_match_rate_pct_trigger": min_match,
            "supported_option_keys": sorted(am_to_opt[p] for p in rule["defaultPerks"]),
            "target_saving_vs_ota_pct": sav_target,
        }

    return {
        "liveRequests": live_requests,
        "autoBidRules": auto_bid_rules,
    }


def build_marketing_campaigns() -> dict:
    flash_deals = [
        {
            "id": "DEAL-MK-01",
            "propertyId": "br_mykhe",
            "title": {
                "vi": "Ưu đãi Tối Cuối Tuần Biển Mỹ Khê (-15%)",
                "en": "My Khe Beachfront Tonight Saver (-15%)",
                "ko": "미케 비치프론트 오늘 밤 타임세일 (-15%)",
            },
            "subtitle": {
                "vi": "Áp dụng cho khách đặt từ 18:00 – 23:30 để lấp đầy phòng trống trong ngày",
                "en": "Applies to 18:00–23:30 bookings to fill remaining same-day rooms",
                "ko": "당일 잔여 객실 판매를 위한 18:00~23:30 마감 특가",
            },
            "roomTypeName": {
                "vi": "Phòng Deluxe 2 Giường Đơn (Hướng Phố)",
                "en": "Deluxe Twin City View",
                "ko": "디럭스 트윈 시티뷰",
            },
            "bookingWindowLabel": {
                "vi": "18:00 – 23:30 hàng ngày",
                "en": "Daily 18:00 – 23:30",
                "ko": "매일 18:00 – 23:30",
            },
            "discountPct": 15,
            "originalRateVnd": 1180000,
            "dealRateVnd": 1003000,
            "dailyRoomQuota": 3,
            "roomsSold30d": 11,
            "netRevenue30dVnd": 11033000,
            "perks": ["breakfast", "wifi", "pool"],
            "active": True,
        },
        {
            "id": "DEAL-SH-01",
            "propertyId": "br_songhan",
            "title": {
                "vi": "Giá Tốt Giờ Chót Khách Công Tác Hải Châu (-12%)",
                "en": "Hai Chau Business Express Deal (-12%)",
                "ko": "하이쩌우 비즈니스 마감 특가 (-12%)",
            },
            "subtitle": {
                "vi": "Tặng kèm ủi đồ nhanh & nhận phòng linh hoạt cho khách đáp chuyến bay muộn",
                "en": "Includes express pressing & flexible late-flight check-in",
                "ko": "야간 항공편 출장객을 위한 유연 체크인 포함 특가",
            },
            "roomTypeName": {
                "vi": "Phòng Superior Giường Đôi",
                "en": "Superior Double",
                "ko": "슈페리어 더블",
            },
            "bookingWindowLabel": {
                "vi": "19:00 – 23:59 Thứ Hai – Thứ Năm",
                "en": "Mon–Thu 19:00 – 23:59",
                "ko": "월~목 19:00 – 23:59",
            },
            "discountPct": 12,
            "originalRateVnd": 900000,
            "dealRateVnd": 792000,
            "dailyRoomQuota": 3,
            "roomsSold30d": 8,
            "netRevenue30dVnd": 6336000,
            "perks": ["wifi", "elevator", "parking"],
            "active": True,
        },
        {
            "id": "DEAL-AT-01",
            "propertyId": "br_anthuong",
            "title": {
                "vi": "Combo Nghỉ Dài Ngày Phố Tây An Thượng (-18%)",
                "en": "An Thuong 3-Night Stay Saver (-18%)",
                "ko": "안트엉 3박 이상 연박 프로모션 (-18%)",
            },
            "subtitle": {
                "vi": "Ưu đãi cho khách đặt từ 2–3 đêm liên tiếp, kèm trả phòng trễ 14:00",
                "en": "Rewards 2–3 night stays with complimentary 2:00 PM late check-out",
                "ko": "2~3박 연박 고객 대상 14시 레이트 체크아웃 무료 제공",
            },
            "roomTypeName": {
                "vi": "Suite Gia Đình Thông Nhau",
                "en": "Family Connecting Suite",
                "ko": "패밀리 커넥팅 스위트",
            },
            "bookingWindowLabel": {
                "vi": "Cả tuần · Lưu trú từ 2 đêm",
                "en": "All week · Min 2 nights",
                "ko": "주중·주말 상시 · 2박 이상",
            },
            "discountPct": 18,
            "originalRateVnd": 1850000,
            "dealRateVnd": 1517000,
            "dailyRoomQuota": 2,
            "roomsSold30d": 5,
            "netRevenue30dVnd": 7585000,
            "perks": ["breakfast", "pool", "late_checkout"],
            "active": True,
        },
        {
            "id": "DEAL-H11-01",
            "propertyId": "stay_h11",
            "title": {
                "vi": "Ưu Đãi Mở Hàng Cơ Sở Mới Stay Hotel H11 (-15%)",
                "en": "Stay Hotel H11 New Property Launch Offer (-15%)",
                "ko": "Stay Hotel H11 신규 오픈 첫 예약 특가 (-15%)",
            },
            "subtitle": {
                "vi": "Kích hoạt ngay để thu hút 10 lượt khách mở hàng và tích lũy đánh giá 5 sao đầu tiên",
                "en": "Turn on to capture your first 10 bookings and build verified 5-star guest reviews",
                "ko": "첫 10건의 확정 예약과 초기 5점 리뷰 확보를 위한 오픈 프로모션",
            },
            "roomTypeName": {
                "vi": "Phòng Deluxe Hướng Phố Trung Tâm",
                "en": "Deluxe City View",
                "ko": "디럭스 시티뷰",
            },
            "bookingWindowLabel": {
                "vi": "17:00 – 23:59 toàn tuần",
                "en": "Daily 17:00 – 23:59",
                "ko": "매일 17:00 – 23:59",
            },
            "discountPct": 15,
            "originalRateVnd": 1220000,
            "dealRateVnd": 1037000,
            "dailyRoomQuota": 5,
            "roomsSold30d": 0,
            "netRevenue30dVnd": 0,
            "perks": ["breakfast", "wifi", "late_checkout"],
            "active": False,
        },
    ]

    upsell_offers = [
        {
            "id": "UPS-MK-01",
            "propertyId": "br_mykhe",
            "category": "room_upgrade",
            "title": {
                "vi": "Nâng hạng lên Suite Hướng Biển Trực Diện",
                "en": "Upgrade to Executive Oceanfront Suite",
                "ko": "이그제큐티브 오션프론트 스위트 업그레이드",
            },
            "description": {
                "vi": "Chuyển từ phòng Deluxe lên tầng cao hướng biển Mỹ Khê kèm bồn tắm nằm & trà chiều",
                "en": "Step up from Deluxe to direct My Khe oceanfront view with soaking tub & afternoon tea",
                "ko": "디럭스에서 미케 정면 오션뷰 고층 스위트 및 욕조 혜택으로 업그레이드",
            },
            "priceVnd": 450000,
            "pricingUnit": "per_night",
            "orders30d": 9,
            "extraRevenue30dVnd": 4050000,
            "active": True,
        },
        {
            "id": "UPS-MK-02",
            "propertyId": "br_mykhe",
            "category": "airport_transfer",
            "title": {
                "vi": "Xe riêng 7 chỗ đón/tiễn Sân bay Đà Nẵng",
                "en": "Private SUV Da Nang Airport Pickup",
                "ko": "다낭 공항 전용 7인승 픽업/샌딩",
            },
            "description": {
                "vi": "Tài xế cầm bảng tên đón tận sảnh ga đến nội địa & quốc tế 24/7",
                "en": "24/7 meet-and-greet private SUV transfer from Da Nang International Airport",
                "ko": "다낭 국제공항 입국장 피켓 미팅 24시간 전용 차량 서비스",
            },
            "priceVnd": 250000,
            "pricingUnit": "per_stay",
            "orders30d": 14,
            "extraRevenue30dVnd": 3500000,
            "active": True,
        },
        {
            "id": "UPS-SH-01",
            "propertyId": "br_songhan",
            "category": "early_late",
            "title": {
                "vi": "Gói Trả phòng trễ thư thả đến 15:00",
                "en": "Guaranteed Late Check-out until 3:00 PM",
                "ko": "15:00 레이트 체크아웃 보장 패키지",
            },
            "description": {
                "vi": "Phù hợp khách có chuyến bay chiều tối — nghỉ ngơi trọn vẹn không lo vội vã",
                "en": "Ideal for evening flights — relax comfortably in your room until 3:00 PM",
                "ko": "저녁 항공편 이용 고객을 위한 여유로운 15시 퇴실 혜택",
            },
            "priceVnd": 220000,
            "pricingUnit": "per_stay",
            "orders30d": 11,
            "extraRevenue30dVnd": 2420000,
            "active": True,
        },
        {
            "id": "UPS-AT-01",
            "propertyId": "br_anthuong",
            "category": "breakfast_dining",
            "title": {
                "vi": "Bữa sáng Đặc sản Đà Nẵng & Cà phê rang xay (2 khách)",
                "en": "Artisan Breakfast & Specialty Coffee for 2",
                "ko": "다낭 로컬 조식 & 스페셜티 커피 2인 세트",
            },
            "description": {
                "vi": "Phục vụ từ 06:30 – 10:00 tại nhà hàng tầng thượng cho các đơn đặt chưa kèm ăn sáng",
                "en": "Served 06:30–10:00 at our rooftop bistro for room-only reservations",
                "ko": "조식 불포함 예약 고객을 위한 루프탑 조식 2인 추가 옵션",
            },
            "priceVnd": 180000,
            "pricingUnit": "per_night",
            "orders30d": 8,
            "extraRevenue30dVnd": 1440000,
            "active": True,
        },
        {
            "id": "UPS-H11-01",
            "propertyId": "stay_h11",
            "category": "room_upgrade",
            "title": {
                "vi": "Nâng hạng lên Phòng Suite Cao Cấp H11",
                "en": "Upgrade to Premier H11 Suite",
                "ko": "프리미어 H11 스위트 객실 업그레이드",
            },
            "description": {
                "vi": "Thêm không gian phòng khách riêng và bồn tắm thư giãn với chi phí ưu đãi dịp khai trương",
                "en": "Add a private living lounge and soaking tub at a special opening upgrade rate",
                "ko": "오픈 기념 특별 요금으로 거실 라운지 및 욕조 스위트로 업그레이드",
            },
            "priceVnd": 300000,
            "pricingUnit": "per_night",
            "orders30d": 0,
            "extraRevenue30dVnd": 0,
            "active": True,
        },
    ]

    return {
        "flashDeals": flash_deals,
        "upsellOffers": upsell_offers,
    }


def build_hub_inbox() -> dict:
    messages = [
        {
            "id": "MSG-01",
            "propertyId": "br_mykhe",
            "bookingCode": "#71",
            "guestName": "Minh Anh",
            "guestPhone": "+84 905 412 819",
            "receivedAt": "19:10",
            "unread": True,
            "status": "needs_reply",
            "topicTag": {
                "vi": "Bãi đậu ô tô",
                "en": "Parking Inquiry",
                "ko": "주차 문의",
            },
            "staySummary": {
                "vi": "Phòng #116 • 06/11 – 08/11 (2 đêm)",
                "en": "Room #116 · Nov 06 – Nov 08 (2 nights)",
                "ko": "#116호 · 11.06 – 11.08 (2박)",
            },
            "preview": {
                "vi": "Đơn #71: Cho mình hỏi khách sạn có chỗ đậu ô tô 7 chỗ qua đêm không ạ?",
                "en": "Booking #71: Could you confirm if overnight parking is available for a 7-seater SUV?",
                "ko": "예약 #71: 7인승 차량 야간 무료 주차가 가능한지 확인 부탁드립니다.",
            },
            "thread": [
                {
                    "id": "TH-01-1",
                    "sender": "guest",
                    "sentAt": "19:10",
                    "body": {
                        "vi": "Chào khách sạn, gia đình mình đặt đơn #71 tối nay đến nhận phòng khoảng 20:30. Cho mình hỏi khách sạn có chỗ đậu ô tô 7 chỗ qua đêm an toàn không ạ?",
                        "en": "Hello front desk, we hold booking #71 arriving around 8:30 PM tonight. Could you confirm if secure overnight parking is available for a 7-seater SUV?",
                        "ko": "안녕하세요, 오늘 밤 20:30경 입실 예정인 예약 #71 고객입니다. 7인승 SUV 차량 야간 안전 주차가 가능한지 확인 부탁드립니다.",
                    },
                }
            ],
        },
        {
            "id": "MSG-02",
            "propertyId": "br_anthuong",
            "bookingCode": "#69",
            "guestName": "Hoàng Nam",
            "guestPhone": "+84 903 884 210",
            "receivedAt": "15:25",
            "unread": True,
            "status": "needs_reply",
            "topicTag": {
                "vi": "Vật dụng phòng",
                "en": "Room Amenity",
                "ko": "객실 비품 요청",
            },
            "staySummary": {
                "vi": "Phòng #125 • 06/11 – 08/11 (4 khách)",
                "en": "Room #125 · Nov 06 – Nov 08 (4 guests)",
                "ko": "#125호 · 11.06 – 11.08 (4인 가족)",
            },
            "preview": {
                "vi": "Đơn #69: Gia đình mình 4 người xin chuẩn bị sẵn thêm 2 khăn tắm lớn trong phòng nhé.",
                "en": "Booking #69: Our family of 4 would appreciate two extra bath towels upon check-in.",
                "ko": "예약 #69: 4인 가족 투숙 예정으로 큰 타월 2장을 추가 비치해 주시면 감사하겠습니다.",
            },
            "thread": [
                {
                    "id": "TH-02-1",
                    "sender": "guest",
                    "sentAt": "15:25",
                    "body": {
                        "vi": "Đơn #69: Gia đình mình 4 người có 2 bé nhỏ nên nhờ lễ tân chuẩn bị sẵn thêm 2 khăn tắm lớn trong phòng #125 giúp mình nhé.",
                        "en": "Booking #69: Our family of 4 is traveling with two kids — could housekeeping place two extra bath towels in Suite #125 before arrival?",
                        "ko": "예약 #69: 어린이 동반 4인 가족입니다. 입실 전 #125호 객실에 대형 바스 타월 2장을 추가 비치해 주시면 감사하겠습니다.",
                    },
                }
            ],
        },
        {
            "id": "MSG-03",
            "propertyId": "br_songhan",
            "bookingCode": "#68",
            "guestName": "Park Ji-hoon",
            "guestPhone": "+82 10-4821-9034",
            "receivedAt": "14:40",
            "unread": True,
            "status": "needs_reply",
            "topicTag": {
                "vi": "Hóa đơn công tác",
                "en": "Corporate Receipt",
                "ko": "법인 영수증 요청",
            },
            "staySummary": {
                "vi": "Phòng #117 • 06/11 – 09/11 (3 đêm)",
                "en": "Room #117 · Nov 06 – Nov 09 (3 nights)",
                "ko": "#117호 · 11.06 – 11.09 (3박)",
            },
            "preview": {
                "vi": "Đơn #68: Nhờ khách sạn hỗ trợ xuất chứng từ thanh toán công tác khi trả phòng ngày 09/11.",
                "en": "Booking #68: Please prepare an itemized business stay invoice for check-out on Nov 09.",
                "ko": "예약 #68: 11월 9일 체크아웃 시 출장 정산용 상세 영수증 발급을 부탁드립니다.",
            },
            "thread": [
                {
                    "id": "TH-03-1",
                    "sender": "guest",
                    "sentAt": "14:40",
                    "body": {
                        "vi": "Xin chào, tôi đặt đơn #68 lưu trú 3 đêm công tác. Nhờ lễ tân ghi nhận xuất chứng từ thanh toán tên công ty khi trả phòng ngày 09/11.",
                        "en": "Hello, I booked #68 for a 3-night corporate trip. Please note our company details so we can collect the official stay receipt on Nov 09.",
                        "ko": "안녕하세요, 3박 출장 예약 #68 고객입니다. 11월 9일 체크아웃 시 회사명 기재 정산 영수증 발급을 준비해 주시기 바랍니다.",
                    },
                }
            ],
        },
        {
            "id": "MSG-04",
            "propertyId": "br_mykhe",
            "bookingCode": "#67",
            "guestName": "Choi Soo-bin",
            "guestPhone": "+82 10-7390-1128",
            "receivedAt": "11:30",
            "unread": False,
            "status": "replied",
            "topicTag": {
                "vi": "Nhận phòng",
                "en": "Check-in Time",
                "ko": "체크인 안내",
            },
            "staySummary": {
                "vi": "Phòng #129 • 06/11 – 07/11 (1 đêm)",
                "en": "Room #129 · Nov 06 – Nov 07 (1 night)",
                "ko": "#129호 · 11.06 – 11.07 (1박)",
            },
            "preview": {
                "vi": "Đơn #67: Đã xác nhận chuẩn bị phòng Suite hướng biển #129 nhận phòng lúc 14:00.",
                "en": "Booking #67: Confirmed Oceanfront Suite #129 ready for 2:00 PM check-in.",
                "ko": "예약 #67: 오션프론트 스위트 #129호 14:00 정시 입실 준비가 확인되었습니다.",
            },
            "thread": [
                {
                    "id": "TH-04-1",
                    "sender": "guest",
                    "sentAt": "11:18",
                    "body": {
                        "vi": "Tụi mình đến Đà Nẵng lúc 13:45 trưa nay, phòng #129 có nhận đúng 14:00 được không ạ?",
                        "en": "We land in Da Nang at 1:45 PM today — will Ocean Suite #129 be ready for check-in at 2:00 PM?",
                        "ko": "오늘 13:45 다낭 도착 예정인데 14:00에 바로 #129호 체크인이 가능할까요?",
                    },
                },
                {
                    "id": "TH-04-2",
                    "sender": "hotel",
                    "sentAt": "11:30",
                    "body": {
                        "vi": "Dạ L'amour Mỹ Khê xin chào anh/chị! Phòng Suite hướng biển #129 đã được kiểm tra sạch sẽ và sẵn sàng đón mình đúng 14:00 ạ.",
                        "en": "Warm greetings from L'amour My Khe! Ocean Suite #129 is freshly inspected and ready to welcome you right at 2:00 PM.",
                        "ko": "라무르 미케입니다! #129호 오션 스위트 점검이 완료되어 14:00 정시에 바로 입실하실 수 있습니다.",
                    },
                },
            ],
        },
        {
            "id": "MSG-05",
            "propertyId": "br_songhan",
            "bookingCode": "#66",
            "guestName": "Quốc Bảo",
            "guestPhone": "+84 988 301 742",
            "receivedAt": "09:45",
            "unread": False,
            "status": "replied",
            "topicTag": {
                "vi": "Xe sân bay",
                "en": "Airport Transfer",
                "ko": "공항 샌딩",
            },
            "staySummary": {
                "vi": "Phòng #107 • 05/11 – 07/11 (2 đêm)",
                "en": "Room #107 · Nov 05 – Nov 07 (2 nights)",
                "ko": "#107호 · 11.05 – 11.07 (2박)",
            },
            "preview": {
                "vi": "Đơn #66: Lễ tân đã đặt xe tiễn sân bay lúc 10:30 sáng mai 07/11 cho phòng #107.",
                "en": "Booking #66: Front desk arranged 10:30 AM airport drop-off tomorrow for Room #107.",
                "ko": "예약 #66: 내일 오전 10:30 공항 샌딩 차량 배정이 완료되었습니다.",
            },
            "thread": [
                {
                    "id": "TH-05-1",
                    "sender": "guest",
                    "sentAt": "09:32",
                    "body": {
                        "vi": "Sáng mai 07/11 mình bay chuyến 12:15, nhờ lễ tân gọi giúp xe 4 chỗ ra sân bay lúc 10:30 nhé.",
                        "en": "My flight tomorrow Nov 07 departs at 12:15 PM — could front desk arrange a sedan to the airport at 10:30 AM?",
                        "ko": "내일(11/7) 12:15 비행편이라 오전 10:30에 공항 가는 택시 예약을 부탁드립니다.",
                    },
                },
                {
                    "id": "TH-05-2",
                    "sender": "hotel",
                    "sentAt": "09:45",
                    "body": {
                        "vi": "Dạ lễ tân CN Sông Hàn đã đặt xe riêng đón anh tại sảnh đúng 10:30 sáng mai 07/11 rồi ạ.",
                        "en": "Confirmed! Our Han River front desk has scheduled a private car at the lobby for 10:30 AM tomorrow.",
                        "ko": "네, 한강 지점 프런트에서 내일 오전 10:30 로비 출발 전용 차량 예약을 완료했습니다.",
                    },
                },
            ],
        },
    ]

    notifications = [
        {
            "id": "NTF-01",
            "scope": "chain",
            "tone": "indigo",
            "createdAt": "19:00",
            "text": {
                "vi": "Chế độ Báo giá tự động ban đêm đang bật ổn định trên toàn hệ thống L'amour.",
                "en": "Overnight AutoBid standby protection is active across all L'amour properties.",
                "ko": "심야 자동 입찰 응답 규칙이 전 지점에서 정상 작동 중입니다.",
            },
        },
        {
            "id": "NTF-02",
            "scope": "br_mykhe",
            "tone": "emerald",
            "createdAt": "18:42",
            "text": {
                "vi": "CN Mỹ Khê vừa nhận thanh toán đủ 100% cho đơn đặt phòng mới #71.",
                "en": "L'amour My Khe just received 100% prepayment for reservation #71.",
                "ko": "미케 지점 신규 예약 #71의 100% 사전 결제가 완료되었습니다.",
            },
        },
        {
            "id": "NTF-03",
            "scope": "stay_h11",
            "tone": "amber",
            "createdAt": "16:00",
            "text": {
                "vi": "Stay Hotel H11 đang có 2 yêu cầu hỏi phòng mới — hãy gửi giá kèm bữa sáng để chốt đơn mở hàng.",
                "en": "Stay Hotel H11 has 2 live traveler inquiries — include breakfast to win your first booking.",
                "ko": "Stay Hotel H11에 실시간 객실 요청 2건이 도착했습니다 — 조식 혜택으로 첫 예약을 유치해 보세요.",
            },
        },
        {
            "id": "NTF-04",
            "scope": "br_songhan",
            "tone": "indigo",
            "createdAt": "15:10",
            "text": {
                "vi": "Kỳ đối soát 2026-11A của CN Sông Hàn đang được ngân hàng xử lý chuyển khoản.",
                "en": "Settlement batch 2026-11A for L'amour Han River is queued for bank transfer.",
                "ko": "한강 지점 2026-11A 정산 건이 은행 이체 처리 중입니다.",
            },
        },
    ]

    quick_replies = [
        {
            "id": "QR-PARKING",
            "label": {
                "vi": "Xác nhận chỗ đậu ô tô miễn phí",
                "en": "Confirm free overnight parking",
                "ko": "무료 야간 주차 가능 안내",
            },
            "template": {
                "vi": "Dạ khách sạn có bãi đậu ô tô 7 chỗ miễn phí qua đêm ngay khuôn viên có bảo vệ trực 24/7 ạ. Khi xe tới sảnh sẽ có nhân viên hướng dẫn ngay cho gia đình mình nhé!",
                "en": "Yes! Complimentary 24/7 guarded parking for 7-seater SUVs is available right on property. Our staff will assist you upon arrival.",
                "ko": "네, 호텔 구내에 24시간 경비가 상주하는 무료 SUV 야간 주차 공간이 마련되어 있습니다. 도착 시 직원이 바로 안내해 드리겠습니다.",
            },
        },
        {
            "id": "QR-TOWELS",
            "label": {
                "vi": "Đã bổ sung khăn tắm & đồ dùng",
                "en": "Extra towels placed in room",
                "ko": "추가 타월 비치 완료 안내",
            },
            "template": {
                "vi": "Dạ bộ phận buồng phòng đã chuẩn bị sẵn thêm 2 khăn tắm lớn và nước suối trong phòng cho gia đình mình rồi ạ. Hẹn đón gia đình mình nhé!",
                "en": "Housekeeping has placed two fresh extra bath towels and bottled water in your suite ahead of arrival. We look forward to welcoming your family!",
                "ko": "객실팀에서 요청하신 대형 타월 2장과 생수를 미리 추가 비치 완료했습니다. 편안한 투숙 되시길 바랍니다!",
            },
        },
        {
            "id": "QR-INVOICE",
            "label": {
                "vi": "Xác nhận xuất hóa đơn công ty",
                "en": "Confirm corporate stay invoice",
                "ko": "법인 정산 영수증 발급 확인",
            },
            "template": {
                "vi": "Dạ lễ tân đã ghi nhận thông tin xuất hóa đơn công tác cho đơn của quý khách và sẽ gửi bản in kèm file điện tử ngay khi làm thủ tục trả phòng ạ.",
                "en": "Our front desk has noted your corporate billing request and will have both printed and digital receipts ready upon check-out.",
                "ko": "프런트에서 법인 정산 영수증 발급 요청을 확인했으며, 체크아웃 시 출력본과 전자 영수증을 함께 전달드리겠습니다.",
            },
        },
    ]

    return {
        "messages": messages,
        "notifications": notifications,
        "quickReplies": quick_replies,
    }


def build_marketplace_identities() -> dict[str, dict]:
    return {
        "br_mykhe": {
            "property_id": "br_mykhe",
            "staying_country": "VN",
            "staying_province": "VN-DN",
            "staying_city": "VN-DN",
            "staying_district": "VN-DN-SONTRA",
            "staying_ward": "VN-DN-SONTRA-PHUOCMY",
            "accommodation_type": "hotel",
            "star_rating": 4,
            "review_score": 4.9,
            "review_count": 64,
            "partner_count_in_district": 18,
            "gallery_media_counts": {
                "videos": 2,
                "property_views": 6,
                "facilities": 8,
                "dining": 5,
                "rooms": 14,
                "nearby_attractions": 4,
            },
        },
        "br_songhan": {
            "property_id": "br_songhan",
            "staying_country": "VN",
            "staying_province": "VN-DN",
            "staying_city": "VN-DN",
            "staying_district": "VN-DN-HAICHAU",
            "staying_ward": "VN-DN-HAICHAU-HAICHAU1",
            "accommodation_type": "hotel",
            "star_rating": 4,
            "review_score": 4.8,
            "review_count": 46,
            "partner_count_in_district": 22,
            "gallery_media_counts": {
                "videos": 1,
                "property_views": 5,
                "facilities": 6,
                "dining": 4,
                "rooms": 12,
                "nearby_attractions": 5,
            },
        },
        "br_anthuong": {
            "property_id": "br_anthuong",
            "staying_country": "VN",
            "staying_province": "VN-DN",
            "staying_city": "VN-DN",
            "staying_district": "VN-DN-NGUHANHSON",
            "staying_ward": "VN-DN-NHS-MYAN",
            "accommodation_type": "hotel",
            "star_rating": 4,
            "review_score": 4.7,
            "review_count": 32,
            "partner_count_in_district": 15,
            "gallery_media_counts": {
                "videos": 1,
                "property_views": 5,
                "facilities": 7,
                "dining": 4,
                "rooms": 10,
                "nearby_attractions": 4,
            },
        },
        "stay_h11": {
            "property_id": "stay_h11",
            "staying_country": "KR",
            "staying_province": "KR-11",
            "staying_city": "KR-11",
            "staying_district": "KR-11-JUNGGU",
            "staying_ward": "KR-11-JUNGGU-MYEONGDONG",
            "accommodation_type": "hotel",
            "star_rating": 3,
            "review_score": 0.0,
            "review_count": 0,
            "partner_count_in_district": 14,
            "gallery_media_counts": {
                "videos": 0,
                "property_views": 3,
                "facilities": 4,
                "dining": 2,
                "rooms": 6,
                "nearby_attractions": 0,
            },
        },
    }


def _infer_booker_country(phone: str | None, idx: int, prop_id: str) -> str:
    if phone:
        if phone.startswith("+84"):
            return "VN"
        if phone.startswith("+82"):
            return "KR"
        if phone.startswith("+33"):
            return "FR"
        if phone.startswith("+1"):
            return "US"
        if phone.startswith("+65"):
            return "SG"
        if phone.startswith("+49"):
            return "DE"
    if prop_id == "stay_h11":
        return ["KR", "VN", "US", "SG"][idx % 4]
    return ["VN", "KR", "VN", "US", "SG"][idx % 5]


def enrich_bid_records_telemetry(
    bid_records: list[dict],
    prop_identities: dict[str, dict],
    room_types: list[dict],
    currency_rates: dict[str, float],
) -> None:
    rt_by_id = {rt["id"]: rt for rt in room_types}
    default_rt_by_prop = {
        "br_mykhe": "RT-MK-DLX",
        "br_songhan": "RT-SH-DLX",
        "br_anthuong": "RT-AT-DLX",
        "stay_h11": "RT-H11-DLX",
    }
    entry_sources = ["home_hero_cta", "explore_stays_cta", "header_nav", "gns_ai_handoff"]
    os_list = ["ios", "android", "web"]
    ota_codes = ["A", "B", "T", "E"]
    content_cats = ["rooms", "facilities", "property_views", "dining", "nearby_attractions", "videos"]
    map_actions = ["zoom_in", "open_google_maps_link", "pan_drag", None]
    unmatched_pool = ["swimmingPool", "breakfastIncluded", "lateCheckout", "petAllow", "soakingBathtub"]
    post_ctas = ["view_receipt", "download_receipt_pdf", "view_booking_history", "back_to_home"]

    for idx, rec in enumerate(bid_records):
        prop_id = rec["propertyId"]
        status = rec["status"]
        ident = prop_identities[prop_id]
        sess_dt = datetime.date.fromisoformat(rec["sessionDate"])

        if status == "accepted":
            ci_str = rec["checkInDate"]
            co_str = rec["checkOutDate"]
            ci_dt = datetime.date.fromisoformat(ci_str)
            lead_days = max(0, (ci_dt - sess_dt).days)
            g_cnt = rec["guestsCount"]
            room_id = rec["roomTypeId"]
        else:
            lead_days = (idx % 6) + (0 if idx % 3 == 0 else 1)
            ci_dt = sess_dt + datetime.timedelta(days=lead_days)
            co_dt = ci_dt + datetime.timedelta(days=rec["nights"])
            ci_str = ci_dt.isoformat()
            co_str = co_dt.isoformat()
            g_cnt = [2, 2, 1, 3, 4][idx % 5]
            room_id = default_rt_by_prop[prop_id]

        rt_meta = rt_by_id[room_id]["catalogMapping"]
        if g_cnt >= 4:
            adults, children, infants, gtype = 2, 2, 0, "family"
        elif g_cnt == 3:
            adults, children, infants, gtype = 3, 0, 0, "group"
        elif g_cnt == 2:
            adults, children, infants, gtype = 2, 0, 0, "couple"
        else:
            adults, children, infants, gtype = 1, 0, 0, "solo"

        pets = 1 if (status == "rejected" and idx % 9 == 0) else 0
        booker_country = _infer_booker_country(rec.get("guestPhone"), idx, prop_id)
        device_os = os_list[idx % len(os_list)]
        device_type = "desktop" if (device_os == "web" and idx % 2 == 0) else ("tablet" if idx % 11 == 0 else "mobile")
        combo_sig = rt_meta["combo_signature"] + ("+petAllow" if pets > 0 else "")
        criteria_cnt = 2 + len(rt_meta["service_option_keys"]) + (1 if pets > 0 else 0)
        act_offers = 3 + (idx % 3)
        tot_offers = max(act_offers, card_pos if "card_pos" in locals() else 4)

        booking_tel = {
            "session_form_id": f"SFM-{1001 + idx}",
            "request_id": str(1501 + idx),
            "request_code": rec["id"],
            "entry_source": entry_sources[idx % len(entry_sources)],
            "device_os": device_os,
            "device_type": device_type,
            "booker_country": booker_country,
            "staying_country": ident["staying_country"],
            "staying_province": ident["staying_province"],
            "staying_city": ident["staying_city"],
            "staying_district": ident["staying_district"],
            "staying_ward": ident["staying_ward"],
            "partner_count": ident["partner_count_in_district"],
            "check_in_date": ci_str,
            "check_out_date": co_str,
            "stay_nights": rec["nights"],
            "lead_time_days": lead_days,
            "room_count": 2 if (g_cnt >= 4 and idx % 2 == 1) else 1,
            "adults": adults,
            "children": children,
            "infants": infants,
            "pets": pets,
            "total_guests": g_cnt,
            "group_type": gtype,
            "accommodation_type": ident["accommodation_type"],
            "combo_signature": combo_sig,
            "criteria_count": criteria_cnt,
            "duration_ms": 28000 + (idx % 12) * 3400,
            "is_no_matched_hotel": False,
            "cancel_source": (
                ("step4_cancel_button" if idx % 2 == 0 else "tab_cancel_icon")
                if status == "cancelled"
                else None
            ),
            "active_offers_count": 3 + (idx % 3),
            "elapsed_open_sec": 240 + (idx % 18) * 185,
        }

        base_price_vnd = rec.get("netRevenueVnd") or (rec["offeredRatePerNightVnd"] * rec["nights"])
        platform_fee_vnd = round(base_price_vnd * 0.15)
        vat_vnd = round((base_price_vnd + platform_fee_vnd) * 0.10)
        total_gmv_vnd = base_price_vnd + platform_fee_vnd + vat_vnd

        if status == "accepted":
            match_pct = 90 + (idx % 11)
            card_pos = 1 if idx % 3 != 2 else 2
            saving_pct = 13 + (idx % 9)
            was_impressed = True
            was_viewed = idx % 5 != 4  # 80% opened CHOT BID NGAY popup, 20% fast card select
            if was_viewed:
                first_sec = 32 + (idx % 10) * 28  # 32s..284s (0-5m high-intent bucket)
                browse_list = [first_sec] if idx % 3 != 0 else [first_sec, first_sec + 185]
            else:
                browse_list = []
            decision_sec = (browse_list[-1] + 54) if browse_list else (48 + (idx % 6) * 19)
            unmatched: list[str] = [] if match_pct >= 96 else [unmatched_pool[idx % len(unmatched_pool)]]
        elif status == "rejected":
            match_pct = 64 + (idx % 20)
            card_pos = (3 + (idx % 4)) if prop_id == "stay_h11" else (2 + (idx % 3))
            saving_pct = 4 + (idx % 7)
            was_impressed = True
            was_viewed = idx % 3 != 0  # 67% opened popup then rejected (e.g. 0 reviews on stay_h11), 33% card reject
            if was_viewed:
                first_sec = 140 + (idx % 14) * 135  # 2m..33m distribution curve spread
                browse_list = [first_sec] if idx % 4 != 1 else [first_sec, first_sec + 420]
            else:
                browse_list = []
            decision_sec = (browse_list[-1] + 42) if browse_list else (35 + (idx % 7) * 16)
            unmatched = ["petAllow"] if pets > 0 else [
                unmatched_pool[idx % len(unmatched_pool)],
                unmatched_pool[(idx + 2) % len(unmatched_pool)],
            ]
        elif status == "expired":
            match_pct = 68 + (idx % 18)
            card_pos = (4 + (idx % 3)) if prop_id == "stay_h11" else (2 + (idx % 3))
            saving_pct = 5 + (idx % 6)
            was_impressed = idx % 4 != 0
            was_viewed = was_impressed and (idx % 2 == 1)
            if was_viewed:
                first_sec = 480 + (idx % 8) * 340  # 8m..53m attention decay before 60m TTL expiry
                browse_list = [first_sec, min(3540, first_sec + 690)] if idx % 3 == 1 else [first_sec]
            else:
                browse_list = []
            decision_sec = None
            unmatched = [unmatched_pool[idx % len(unmatched_pool)]]
        else:  # cancelled
            match_pct = 74 + (idx % 15)
            card_pos = 2 + (idx % 2)
            saving_pct = 8 + (idx % 5)
            was_impressed = idx % 2 == 0
            was_viewed = False
            browse_list = []
            decision_sec = None
            unmatched = [unmatched_pool[idx % len(unmatched_pool)]]

        ota_price_vnd = round(total_gmv_vnd / (1.0 - saving_pct / 100.0))

        offer_tel = {
            "offer_id": f"OFR-{rec['id']}",
            "property_id": prop_id,
            "room_id": room_id,
            "room_type_key": rt_meta["room_type_key"],
            "is_auto_bid": rec["bidMode"] == "auto",
            "match_rate_pct": match_pct,
            "offer_total_price": total_gmv_vnd,
            "currency": "VND",
            "card_position": card_pos,
            "total_offers_count": max(booking_tel["active_offers_count"] + 1, card_pos),
            "device_type": device_type,
            "device_os": device_os,
            "is_expired": status == "expired",
            "ota_code": ota_codes[idx % len(ota_codes)],
            "ota_price": ota_price_vnd,
            "saving_pct": saving_pct,
            "was_impressed": was_impressed,
            "was_detail_viewed": was_viewed,
            "browse_click_count": len(browse_list),
            "elapsed_since_bid_sec": browse_list[0] if browse_list else None,
            "browse_elapsed_sec_list": browse_list,
            "decision_duration_sec": decision_sec,
            "unmatched_keys": unmatched,
        }

        if was_viewed:
            if booker_country == "KR":
                disp_cur = "KRW"
                approx_amt = round(total_gmv_vnd / currency_rates["KRW"])
            elif booker_country in ("US", "FR", "SG", "DE"):
                disp_cur = "USD"
                approx_amt = round(total_gmv_vnd / currency_rates["USD"], 2)
            else:
                disp_cur = "VND"
                approx_amt = total_gmv_vnd

            cat_pick = content_cats[idx % len(content_cats)]
            m_type = "video" if cat_pick == "videos" else "image"
            selected_in_modal = status == "accepted" and (idx % 4 != 0)
            close_m = (
                "selected_cta"
                if selected_in_modal
                else (["close_x_button", "backdrop_click", "escape_key"][idx % 3])
            )
            explore_tel: dict | None = {
                "view_session_id": f"VWS-{rec['id']}",
                "trigger_element": "browse_button" if idx % 3 != 2 else "card_thumbnail",
                "star_rating": ident["star_rating"],
                "review_score": ident["review_score"],
                "review_count": ident["review_count"],
                "approx_display_amount": approx_amt,
                "display_currency": disp_cur,
                "scroll_down_count": 3 + (idx % 6),
                "scroll_up_count": 1 + (idx % 4),
                "max_scroll_depth_pct": 78 + (idx % 23) if status == "accepted" else 45 + (idx % 48),
                "description_dwell_ms": 4200 + (idx % 7) * 1650,
                "total_dwell_ms": 18500 + (idx % 9) * 5200,
                "content_category": cat_pick,
                "media_type": m_type,
                "media_clicked_count": (
                    0
                    if (prop_id == "stay_h11" and cat_pick in ("videos", "nearby_attractions"))
                    else (2 + (idx % 5))
                ),
                "view_duration_sec": 19 + (idx % 9) * 5,
                "map_action": map_actions[idx % len(map_actions)],
                "close_method": close_m,
            }
        else:
            explore_tel = None

        if status == "accepted":
            bk_num = rec["bookingCode"].lstrip("#").zfill(4)
            entry_surf = (
                "explore_stay_modal_select"
                if (explore_tel is not None and explore_tel["close_method"] == "selected_cta")
                else "offer_card_select"
            )
            if booker_country == "KR":
                gw, pm_type, chg_cur = "nhn_kcp", "local_card", "KRW"
                ex_rate = currency_rates["KRW"]
                fx_fee = round(total_gmv_vnd * 0.012 / ex_rate)
                chg_amt = round(total_gmv_vnd / ex_rate) + fx_fee
                fx_code: str | None = f"FXQ-KRW-{bk_num}"
            elif booker_country in ("US", "FR", "SG", "DE"):
                gw, pm_type, chg_cur = "paypal", "paypal_wallet", "USD"
                ex_rate = currency_rates["USD"]
                fx_fee = round((total_gmv_vnd * 0.015) / ex_rate, 2)
                chg_amt = round((total_gmv_vnd / ex_rate) + fx_fee, 2)
                fx_code = f"FXQ-USD-{bk_num}"
            else:
                gw, pm_type, chg_cur = ("stripe" if idx % 2 == 0 else "nhn_kcp"), "credit_card", "VND"
                ex_rate = 1.0
                fx_fee = 0
                chg_amt = total_gmv_vnd
                fx_code = None

            is_first = idx % 3 != 1
            interrupted = idx % 7 == 3
            payment_tel: dict | None = {
                "checkout_session_id": f"CHK-{rec['id']}",
                "payment_code": f"PM-2026-{bk_num}",
                "booking_id": rec["bookingCode"],
                "entry_surface": entry_surf,
                "gateway_type": gw,
                "payment_method_type": pm_type,
                "booking_currency": "VND",
                "base_price": base_price_vnd,
                "platform_fee_amount": platform_fee_vnd,
                "vat_amount": vat_vnd,
                "total_booking_amount": total_gmv_vnd,
                "charge_currency": chg_cur,
                "fx_quote_code": fx_code,
                "exchange_rate": ex_rate,
                "charge_amount": chg_amt,
                "fx_fee_amount": fx_fee,
                "skip_staying_info": idx % 4 == 2,
                "guest_same_as_booker": idx % 5 != 3,
                "save_card_opt_in": idx % 2 == 0,
                "interruption_reason": "popup_closed_early" if interrupted else "none",
                "recovery_action": "resume_current_payment" if interrupted else "none",
                "recovery_outcome": "COMPLETED",
                "is_first_payment": is_first,
                "time_since_signup_hours": round(1.5 + (idx % 12) * 3.8, 1) if is_first else None,
                "days_since_prev_payment": None if is_first else (9 + (idx % 6) * 7),
                "select_to_paid_sec": (145 if interrupted else 64) + (idx % 8) * 11,
                "post_pay_cta": (
                    "download_receipt_pdf"
                    if booker_country in ("KR", "SG") and idx % 2 == 0
                    else post_ctas[idx % len(post_ctas)]
                ),
            }
        else:
            payment_tel = None

        rec["telemetry"] = {
            "booking_form": booking_tel,
            "offer_listing": offer_tel,
            "explore_stays": explore_tel,
            "payment_form": payment_tel,
        }


EVENT_SHEETS_METADATA = {
    "spreadsheetId": "1y8z02l_JBR5_qP41CV6Ex4HARZkA_SDpP64iRDma8QI",
    "pricingFormulaInvariant": {
        "partnerBasePrice": "netRevenueVnd = offeredRatePerNightVnd * nights (100% settled to hotel, 0% deduction)",
        "platformFee15Pct": "round(base_price * 0.15)",
        "vat10Pct": "round((base_price + platform_fee_amount) * 0.10)",
        "travelerTotalGmv": "base_price + platform_fee_amount + vat_amount (1.265 * base_price)",
    },
    "entityLineage": (
        "session_form_id -> request_id (request_code) -> offer_id -> view_session_id "
        "-> checkout_session_id -> payment_code -> booking_id (bookingCode) -> payoutBatchId"
    ),
    "sheets": {
        "booking_form": {
            "eventsCount": 12,
            "events": [
                "booking_form_view",
                "booking_form_start",
                "booking_form_step_view",
                "booking_destination_select",
                "booking_stay_details_complete",
                "booking_accommodation_type_select",
                "booking_preference_change",
                "booking_form_validation_error",
                "booking_form_submit_attempt",
                "booking_form_submit_result",
                "booking_form_complete",
                "booking_request_cancel",
            ],
            "mappedMasterTables": ["bidRecords", "biddingOperations", "roomInventory", "hubConfig"],
        },
        "offer_listing": {
            "eventsCount": 10,
            "events": [
                "offer_listing_view",
                "offer_card_impression",
                "offer_card_photo_slide",
                "offer_room_option_switch",
                "offer_card_ota_expand",
                "offer_browse_click",
                "offer_card_select_click",
                "offer_reject_attempt",
                "offer_reject_confirm",
                "offer_ttl_expired",
            ],
            "mappedMasterTables": ["bidRecords", "biddingOperations", "marketingCampaigns"],
        },
        "explore_stays": {
            "eventsCount": 12,
            "events": [
                "explore_stay_modal_view",
                "explore_stay_room_carousel_interact",
                "explore_stay_description_engage",
                "explore_stay_scroll_summary",
                "explore_stay_ota_compare_click",
                "explore_stay_gallery_open",
                "explore_stay_gallery_tab_switch",
                "explore_stay_media_click",
                "explore_stay_map_interact",
                "explore_stay_review_inspect",
                "explore_stay_select_click",
                "explore_stay_modal_close",
            ],
            "mappedMasterTables": ["bidRecords", "hubConfig", "roomInventory"],
        },
        "payment_form": {
            "eventsCount": 11,
            "events": [
                "payment_form_view",
                "payment_staying_info_update",
                "payment_gateway_select",
                "payment_fx_quote_result",
                "payment_submit_attempt",
                "payment_gateway_window_open",
                "payment_session_interrupted",
                "payment_recovery_action",
                "payment_complete",
                "payment_fail",
                "payment_receipt_action",
            ],
            "mappedMasterTables": ["bidRecords", "payoutLedgers", "hubInbox"],
        },
    },
}


def main() -> None:
    seed_cfg = json.loads((SEED_DIR / "partner_hub_config.json").read_text("utf-8"))
    seed_bids = json.loads((SEED_DIR / "bid_records.json").read_text("utf-8"))

    # 1. Enrich partner_hub_config.json (v4.0.0)
    hub_config = copy.deepcopy(seed_cfg)
    hub_config["schemaVersion"] = "4.0.0"
    hub_config["partnerUser"]["roleKey"] = "manager"
    hub_config["partnerUser"]["allowedBranchIds"] = ["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"]
    hub_config["partnerUser"]["canViewChainAll"] = True
    hub_config["partnerUser"]["canViewFinancials"] = True
    hub_config["partnerUser"]["canManagePricing"] = True
    hub_config["staffProfiles"] = [
        {
            "userId": "USR-PARTNER-01",
            "roleKey": "manager",
            "displayName": {
                "vi": "Nguyễn Bảo Minh",
                "en": "Kim Ha-yoon",
                "ko": "김하윤",
            },
            "initials": {"vi": "BM", "en": "KH", "ko": "KH"},
            "roleBadge": {
                "vi": "Quản lý khách sạn",
                "en": "Property Manager",
                "ko": "호텔 지배인",
            },
            "allowedBranchIds": ["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"],
            "canViewChainAll": True,
            "canViewFinancials": True,
            "canManagePricing": True,
        },
        {
            "userId": "USR-MGR-MYKHE",
            "roleKey": "branch_manager",
            "displayName": {
                "vi": "Lê Hoàng Nam",
                "en": "Lee Hoang Nam",
                "ko": "레 호앙 남",
            },
            "initials": {"vi": "HN", "en": "HN", "ko": "HN"},
            "roleBadge": {
                "vi": "Quản lý CN Mỹ Khê",
                "en": "Branch Manager · My Khe",
                "ko": "미케 지점장",
            },
            "allowedBranchIds": ["br_mykhe"],
            "canViewChainAll": False,
            "canViewFinancials": True,
            "canManagePricing": True,
        },
        {
            "userId": "USR-MGR-SONGHAN",
            "roleKey": "branch_manager",
            "displayName": {
                "vi": "Phạm Minh Tuấn",
                "en": "Pham Minh Tuan",
                "ko": "팜 민 뚜언",
            },
            "initials": {"vi": "MT", "en": "MT", "ko": "MT"},
            "roleBadge": {
                "vi": "Quản lý CN Sông Hàn",
                "en": "Branch Manager · Han River",
                "ko": "한강 지점장",
            },
            "allowedBranchIds": ["br_songhan"],
            "canViewChainAll": False,
            "canViewFinancials": True,
            "canManagePricing": True,
        },
        {
            "userId": "USR-STAFF-02",
            "roleKey": "receptionist",
            "displayName": {
                "vi": "Trần Thu Hà",
                "en": "Park So-yeon",
                "ko": "박소연",
            },
            "initials": {"vi": "TH", "en": "PS", "ko": "PS"},
            "roleBadge": {
                "vi": "Lễ tân ca trực",
                "en": "Front-Desk Receptionist",
                "ko": "프런트 매니저",
            },
            "allowedBranchIds": ["br_mykhe"],
            "canViewChainAll": False,
            "canViewFinancials": False,
            "canManagePricing": False,
        },
        {
            "userId": "USR-MGR-H11",
            "roleKey": "branch_manager",
            "displayName": {
                "vi": "Kim Ji-hoon",
                "en": "Kim Ji-hoon",
                "ko": "김지훈",
            },
            "initials": {"vi": "JH", "en": "JH", "ko": "JH"},
            "roleBadge": {
                "vi": "Quản lý Stay Hotel H11",
                "en": "Manager · Stay Hotel H11",
                "ko": "스테이 호텔 H11 지배인",
            },
            "allowedBranchIds": ["stay_h11"],
            "canViewChainAll": False,
            "canViewFinancials": True,
            "canManagePricing": True,
        },
    ]

    prop_contacts = {
        "br_mykhe": (
            {"vi": "28 Võ Nguyên Giáp, Sơn Trà, Đà Nẵng", "en": "28 Vo Nguyen Giap, Son Tra, Da Nang", "ko": "다낭 선짜구 보응우옌잡 28"},
            "+84 236 3928 101",
        ),
        "br_songhan": (
            {"vi": "114 Bạch Đằng, Hải Châu, Đà Nẵng", "en": "114 Bach Dang, Hai Chau, Da Nang", "ko": "다낭 하이쩌우구 박당 114"},
            "+84 236 3889 202",
        ),
        "br_anthuong": (
            {"vi": "19 An Thượng 2, Ngũ Hành Sơn, Đà Nẵng", "en": "19 An Thuong 2, Ngu Hanh Son, Da Nang", "ko": "다낭 응우하인선구 안트엉 19"},
            "+84 236 3954 303",
        ),
        "stay_h11": (
            {"vi": "11 Trần Phú, Quận Trung Tâm", "en": "11 Central Boulevard, District 1", "ko": "중구 센트럴대로 11"},
            "+82 2-6014-8811",
        ),
    }
    prop_identities = build_marketplace_identities()
    for prop in hub_config["properties"]:
        addr, hotline = prop_contacts[prop["id"]]
        prop["address"] = addr
        prop["hotline"] = hotline
        prop["checkInTime"] = "14:00"
        prop["checkOutTime"] = "12:00"
        prop["marketplaceIdentity"] = prop_identities[prop["id"]]

    # 2. Enrich bid_records.json while preserving 100% of existing values
    bid_records = copy.deepcopy(seed_bids)
    accepted_records = [r for r in bid_records if r["status"] == "accepted"]
    for rec in accepted_records:
        bk = rec["bookingCode"]
        g_name, g_phone = CLEAN_GUEST_NAMES.get(bk, ("Guest Reservation", "+84 905 000 111"))
        rec["guestFullName"] = g_name
        rec["guestPhone"] = g_phone
        rec["roomTypeId"] = determine_room_type_id(rec["propertyId"], rec["roomName"]["en"])
        rec["stayStatus"] = determine_stay_status(rec["checkInDate"], rec["checkOutDate"], "2026-11-06")

    # Map rooms currently occupied on referenceDate 2026-11-06
    occupied_on_ref: dict[int, dict] = {}
    for rec in accepted_records:
        if rec["checkInDate"] <= "2026-11-06" < rec["checkOutDate"]:
            occupied_on_ref[rec["roomNumber"]] = rec

    # 3. Build Room Inventory, enrich 4-sheet telemetry on all 143 bid_records, then build Payout Ledgers
    room_inventory = build_room_inventory(occupied_on_ref)
    enrich_bid_records_telemetry(
        bid_records,
        prop_identities,
        room_inventory["roomTypes"],
        hub_config["currencyRates"],
    )
    payout_ledgers = build_payout_ledgers(accepted_records)

    # 4. Build Bidding Operations, Marketing Campaigns, and Hub Inbox
    bidding_operations = build_bidding_operations()
    marketing_campaigns = build_marketing_campaigns()
    hub_inbox = build_hub_inbox()

    schema_manifest = {
        "schemaVersion": "4.0.0",
        "architecture": "Optibide Partner Hub • Full 7-Module Hotelier Suite • Pure-Business • Multi-Property • VI/EN/KO & VND/KRW/USD",
        "generatedAt": "2026-11-18T10:35:00+07:00",
        "primaryReferenceDate": "2026-11-06",
        "eventSheetsMetadata": EVENT_SHEETS_METADATA,
        "tables": {
            "hubConfig": {
                "file": "partner_hub_config.json",
                "pk": "schemaVersion",
                "mappedSheets": ["booking_form", "offer_listing", "explore_stays", "payment_form"],
                "sourceEvents": [
                    "booking_destination_select",
                    "offer_card_impression",
                    "explore_stay_modal_view",
                    "explore_stay_gallery_tab_switch",
                    "explore_stay_review_inspect",
                    "payment_fx_quote_result",
                ],
                "mappedParameters": [
                    "property_id",
                    "staying_country",
                    "staying_province",
                    "staying_city",
                    "staying_district",
                    "staying_ward",
                    "partner_count",
                    "star_rating",
                    "review_score",
                    "review_count",
                    "content_category",
                    "exchange_rate",
                ],
                "description": "Cấu hình cổng đối tác Optibide, tỷ giá VND/KRW/USD, hồ sơ ca trực (Quản lý & Lễ tân), kỳ lọc Today/7D/30D và 4 cơ sở kèm định danh marketplaceIdentity",
            },
            "bidRecords": {
                "file": "bid_records.json",
                "pk": "id",
                "fk": "propertyId -> hubConfig.properties.id, roomTypeId -> roomInventory.roomTypes.id, payoutBatchId -> payoutLedgers.batches.id",
                "mappedSheets": ["booking_form", "offer_listing", "explore_stays", "payment_form"],
                "sourceEvents": [
                    "booking_form_complete",
                    "booking_request_cancel",
                    "offer_card_impression",
                    "offer_browse_click",
                    "offer_card_select_click",
                    "offer_reject_confirm",
                    "offer_ttl_expired",
                    "explore_stay_modal_view",
                    "explore_stay_scroll_summary",
                    "explore_stay_media_click",
                    "explore_stay_select_click",
                    "explore_stay_modal_close",
                    "payment_form_view",
                    "payment_session_interrupted",
                    "payment_recovery_action",
                    "payment_complete",
                    "payment_receipt_action",
                ],
                "mappedParameters": [
                    "session_form_id",
                    "request_id",
                    "request_code",
                    "staying_ward",
                    "device_type",
                    "device_os",
                    "offer_id",
                    "card_position",
                    "total_offers_count",
                    "view_session_id",
                    "checkout_session_id",
                    "payment_code",
                    "booking_id",
                    "match_rate_pct",
                    "unmatched_keys",
                    "elapsed_since_bid_sec",
                    "browse_elapsed_sec_list",
                    "scroll_down_count",
                    "scroll_up_count",
                    "base_price",
                    "platform_fee_amount",
                    "vat_amount",
                    "total_booking_amount",
                    "is_first_payment",
                    "time_since_signup_hours",
                    "days_since_prev_payment",
                ],
                "description": "Lịch sử 143 lượt báo giá & 29 phiếu đặt phòng hoàn tất (#43..#71) gắn đầy đủ telemetry xuyên suốt 4 sheets (booking_form -> offer_listing -> explore_stays -> payment_form)",
            },
            "hubInbox": {
                "file": "hub_inbox.json",
                "pk": "messages.id / notifications.id / quickReplies.id",
                "fk": "propertyId -> hubConfig.properties.id, bookingCode -> bidRecords.bookingCode",
                "mappedSheets": ["payment_form", "booking_form"],
                "sourceEvents": [
                    "payment_staying_info_update",
                    "payment_complete",
                    "payment_receipt_action",
                ],
                "mappedParameters": [
                    "booking_id",
                    "property_id",
                    "guest_same_as_booker",
                    "post_pay_cta",
                ],
                "description": "Hội thoại tin nhắn khách đặt phòng hai chiều, mẫu phản hồi nhanh lễ tân & thông báo vận hành hậu thanh toán",
            },
            "roomInventory": {
                "file": "room_inventory.json",
                "pk": "roomTypes.id / units.unitId / calendarBlocks.id",
                "fk": "propertyId -> hubConfig.properties.id, activeBookingCode -> bidRecords.bookingCode",
                "mappedSheets": ["booking_form", "offer_listing", "explore_stays"],
                "sourceEvents": [
                    "booking_stay_details_complete",
                    "booking_preference_change",
                    "offer_room_option_switch",
                    "explore_stay_room_carousel_interact",
                    "explore_stay_media_click",
                ],
                "mappedParameters": [
                    "room_id",
                    "room_type_key",
                    "combo_signature",
                    "check_in_date",
                    "check_out_date",
                    "stay_nights",
                    "room_count",
                ],
                "description": "Danh mục 15 hạng phòng (kèm catalogMapping ánh xạ combo_signature), 48 phòng vật lý thực tế (#101..#130, #201..#218), trạng thái buồng phòng & lịch khóa ngày",
            },
            "payoutLedgers": {
                "file": "payout_ledgers.json",
                "pk": "bankAccounts.propertyId / batches.id",
                "fk": "propertyId -> hubConfig.properties.id, bookingCodes -> bidRecords.bookingCode",
                "mappedSheets": ["payment_form"],
                "sourceEvents": [
                    "payment_fx_quote_result",
                    "payment_complete",
                    "payment_fail",
                ],
                "mappedParameters": [
                    "payment_code",
                    "booking_id",
                    "booking_currency",
                    "base_price",
                    "platform_fee_amount",
                    "vat_amount",
                    "total_booking_amount",
                ],
                "description": "Tài khoản ngân hàng nhận tiền từng cơ sở & 12 kỳ sao kê đối soát khớp 100% doanh thu thực nhận (66.360.000 ₫) kèm đối chiếu phí sàn 15% & VAT 10%",
            },
            "biddingOperations": {
                "file": "bidding_operations.json",
                "pk": "liveRequests.id / autoBidRules.propertyId",
                "fk": "propertyId -> hubConfig.properties.id",
                "mappedSheets": ["booking_form", "offer_listing"],
                "sourceEvents": [
                    "booking_form_complete",
                    "offer_listing_view",
                    "offer_card_impression",
                    "offer_ttl_expired",
                ],
                "mappedParameters": [
                    "request_id",
                    "request_code",
                    "session_form_id",
                    "is_auto_bid",
                    "match_rate_pct",
                    "remaining_ttl_sec",
                    "combo_signature",
                    "saving_pct",
                ],
                "description": "Hàng đợi yêu cầu hỏi phòng trực tiếp 60 phút của khách (kèm requestTelemetry) & cấu hình khung giá sàn Báo giá tự động theo từng cơ sở",
            },
            "marketingCampaigns": {
                "file": "marketing_campaigns.json",
                "pk": "flashDeals.id / upsellOffers.id",
                "fk": "propertyId -> hubConfig.properties.id",
                "mappedSheets": ["booking_form", "offer_listing", "explore_stays"],
                "sourceEvents": [
                    "booking_stay_details_complete",
                    "offer_card_ota_expand",
                    "explore_stay_ota_compare_click",
                ],
                "mappedParameters": [
                    "lead_time_days",
                    "stay_nights",
                    "saving_pct",
                    "offer_total_price",
                    "ota_price",
                ],
                "description": "Chiến dịch Ưu đãi giờ chót (nhắm khách lead_time_days = 0) & Gói nâng hạng phòng / dịch vụ cộng thêm gia tăng doanh thu",
            },
        },
    }

    outputs = {
        "partner_hub_config.json": hub_config,
        "bid_records.json": bid_records,
        "hub_inbox.json": hub_inbox,
        "room_inventory.json": room_inventory,
        "payout_ledgers.json": payout_ledgers,
        "bidding_operations.json": bidding_operations,
        "marketing_campaigns.json": marketing_campaigns,
        "schema_manifest.json": schema_manifest,
    }

    SEED_DIR.mkdir(parents=True, exist_ok=True)
    MASTER_DIR.mkdir(parents=True, exist_ok=True)

    for obsolete in OBSOLETE_FILES:
        for d in (SEED_DIR, MASTER_DIR):
            p = d / obsolete
            if p.exists():
                p.unlink()

    for filename, payload in outputs.items():
        text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        (SEED_DIR / filename).write_text(text, "utf-8")
        (MASTER_DIR / filename).write_text(text, "utf-8")

    print(
        f"Generated Master Data v4.0 ({len(outputs)} files) cleanly: "
        f"{len(bid_records)} bidRecords, {len(room_inventory['units'])} physical rooms, "
        f"{len(payout_ledgers['batches'])} payout batches, {len(bidding_operations['liveRequests'])} live requests."
    )


if __name__ == "__main__":
    main()
