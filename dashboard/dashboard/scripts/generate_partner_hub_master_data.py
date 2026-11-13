#!/usr/bin/env python3
"""Generate clean Lean Master Data v3.0 for Optibide Partner Hub Overview."""
from __future__ import annotations

import datetime
import json
import pathlib
import re

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

STAY_H11_30D_PATTERN = [
    {"expired": 0, "rejected": 2},
    {"expired": 0, "rejected": 1},
    {"expired": 0, "rejected": 2},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 1},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 3},
    {"expired": 0, "rejected": 2},
    {"expired": 0, "rejected": 8},
    {"expired": 0, "rejected": 6},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 1},
    {"expired": 0, "rejected": 1},
    {"expired": 0, "rejected": 0},
    {"expired": 0, "rejected": 10},
    {"expired": 0, "rejected": 4},
    {"expired": 1, "rejected": 3},
    {"expired": 1, "rejected": 1},
    {"expired": 0, "rejected": 6},
    {"expired": 0, "rejected": 1},
    {"expired": 0, "rejected": 1},
    {"expired": 0, "rejected": 1},
    {"expired": 3, "rejected": 3},
    {"expired": 1, "rejected": 0},
    {"expired": 0, "rejected": 0},
    {"expired": 1, "rejected": 4},
    {"expired": 1, "rejected": 6},
]

ROOM_NAME_I18N = {
    "Superior Double": {
        "vi": "Phòng Superior Giường Đôi",
        "en": "Superior Double",
        "ko": "슈페리어 더블",
    },
    "Deluxe Twin City View": {
        "vi": "Phòng Deluxe 2 Giường Đơn (Hướng Phố)",
        "en": "Deluxe Twin City View",
        "ko": "디럭스 트윈 시티뷰",
    },
    "Family Connecting Suite": {
        "vi": "Suite Gia Đình Thông Nhau",
        "en": "Family Connecting Suite",
        "ko": "패밀리 커넥팅 스위트",
    },
    "Executive Ocean Suite": {
        "vi": "Suite Hướng Biển Trực Diện",
        "en": "Executive Ocean Suite",
        "ko": "이그제큐티브 오션 스위트",
    },
}

AMENITY_CODE_MAP = {
    "Bữa sáng": "breakfast",
    "Wifi": "wifi",
    "Hồ bơi": "pool",
    "Thang máy": "elevator",
    "Bãi đậu xe": "parking",
    "Trả phòng trễ": "late_checkout",
    "Bồn tắm": "bathtub",
    "Truyền hình (OTT)": "ott_tv",
}


def build_guest_note_i18n(raw_title: str, nights: int) -> tuple[int, dict[str, str]]:
    if "Gia đình 4 người" in raw_title:
        return 4, {
            "vi": raw_title,
            "en": f"Family of 4 · Connecting suite stay ({nights} nights)",
            "ko": f"4인 가족 · 커넥팅 스위트 {nights}박 확정 예약",
        }
    if "2 khách công tác" in raw_title:
        return 2, {
            "vi": raw_title,
            "en": f"2 business travelers · {nights}-night corporate stay",
            "ko": f"출장객 2명 · {nights}박 비즈니스 확정 예약",
        }
    if "Cặp đôi Hàn Quốc" in raw_title:
        return 2, {
            "vi": raw_title,
            "en": f"Couple stay · My Khe oceanfront view ({nights} night)",
            "ko": f"커플 투숙객 · 미케 오션뷰 {nights}박 확정 예약",
        }
    if "Chuyến bay chiều từ Hà Nội" in raw_title:
        return 2, {
            "vi": raw_title,
            "en": f"2 adults · Afternoon flight arrival ({nights} nights)",
            "ko": f"성인 2명 · 오후 항공편 도착 {nights}박 확정 예약",
        }
    if "Nghỉ dưỡng cuối tuần" in raw_title:
        return 2, {
            "vi": raw_title,
            "en": f"2 adults · Weekend leisure stay ({nights} nights)",
            "ko": f"성인 2명 · 주말 휴양 {nights}박 확정 예약",
        }
    m = re.search(r"(\d+)\s*người lớn", raw_title, re.I)
    adults = int(m.group(1)) if m else 2
    unit_en = "night" if nights == 1 else "nights"
    return adults, {
        "vi": raw_title,
        "en": f"{adults} adults · {nights}-{unit_en} prepaid confirmed stay",
        "ko": f"성인 {adults}명 · {nights}박 사전 결제 확정 예약",
    }


def parse_stay_dates(stay_label: str, session_date: str, nights: int) -> tuple[str, str]:
    year = int(session_date[:4])
    m = re.search(r"(\d{1,2})/(\d{1,2})\s*[–-]\s*(\d{1,2})/(\d{1,2})", stay_label or "")
    if m:
        d1, m1, d2, m2 = map(int, m.groups())
        y2 = year + 1 if (m2 < m1) else year
        return f"{year:04d}-{m1:02d}-{d1:02d}", f"{y2:04d}-{m2:02d}-{d2:02d}"
    ci = datetime.date.fromisoformat(session_date)
    co = ci + datetime.timedelta(days=max(1, nights))
    return ci.isoformat(), co.isoformat()


def main() -> None:
    legacy_sessions_path = SEED_DIR / "auction_sessions.json"
    raw_sessions = json.loads(legacy_sessions_path.read_text("utf-8"))

    # 1. Build partner_hub_config.json
    hub_config = {
        "schemaVersion": "3.0.0",
        "brandName": "Optibide",
        "referenceDate": "2026-11-06",
        "currencyRates": {
            "VND": 1,
            "KRW": 18.5,
            "USD": 25400,
        },
        "partnerUser": {
            "userId": "USR-PARTNER-01",
            "displayName": {
                "vi": "Nguyễn Bảo Minh",
                "en": "Kim Ha-yoon",
                "ko": "김하윤",
            },
            "initials": {
                "vi": "BM",
                "en": "KH",
                "ko": "KH",
            },
            "roleBadge": {
                "vi": "Quản lý khách sạn",
                "en": "Property Manager",
                "ko": "호텔 지배인",
            },
        },
        "periodsMeta": {
            "today": {
                "startDate": "2026-11-06",
                "endDate": "2026-11-06",
                "previousNetRevenueVnd": 9800000,
                "targetAcceptRatePct": 36.5,
            },
            "7d": {
                "startDate": "2026-10-31",
                "endDate": "2026-11-06",
                "previousNetRevenueVnd": 25200000,
                "targetAcceptRatePct": 36.2,
            },
            "30d": {
                "startDate": "2026-10-08",
                "endDate": "2026-11-06",
                "previousNetRevenueVnd": 54600000,
                "targetAcceptRatePct": 35.8,
            },
        },
        "chainOverview": {
            "hotelId": "HTL-DN-024",
            "label": {
                "vi": "L'amour Boutique Hotel (Toàn hệ thống)",
                "en": "L'amour Boutique Hotel (All Properties)",
                "ko": "L'amour Boutique Hotel (전체 지점)",
            },
            "shortName": {
                "vi": "L'amour Boutique Hotel",
                "en": "L'amour Boutique Hotel",
                "ko": "L'amour Boutique Hotel",
            },
            "district": {
                "vi": "Đà Nẵng",
                "en": "Da Nang",
                "ko": "다낭",
            },
            "roomsCount": 30,
            "badgeColor": "#1D4ED8",
            "autoBidEnabled": True,
            "reviewRating5": 4.8,
            "reviewCount": 142,
            "reviewCriteria5": {
                "amenities": 4.7,
                "checkin": 4.8,
                "cleanliness": 4.9,
                "service": 4.8,
                "value": 4.8,
            },
            "eloScore": 1680,
            "visibilityTone": "good",
            "visibilitySubtitle": {
                "vi": "Hiển thị ưu tiên cao — Báo giá của khách sạn được ưu tiên đưa lên nhóm đầu cho khách xem",
                "en": "High visibility · Top 12% in Da Nang",
                "ko": "우수 노출 등급 — 고객 검색 시 호텔의 제안이 상단에 우선 표시됩니다",
            },
        },
        "properties": [
            {
                "id": "br_mykhe",
                "isChainMember": True,
                "label": {
                    "vi": "L'amour Mỹ Khê · Sơn Trà",
                    "en": "L'amour My Khe · Son Tra",
                    "ko": "라무르 미케 · 선짜",
                },
                "shortName": {
                    "vi": "CN Mỹ Khê",
                    "en": "L'amour My Khe",
                    "ko": "미케 지점",
                },
                "district": {
                    "vi": "Phước Mỹ, Sơn Trà",
                    "en": "Phuoc My, Son Tra",
                    "ko": "선짜구 프억미",
                },
                "roomsCount": 12,
                "badgeColor": "#2563EB",
                "autoBidEnabled": True,
                "previousPeriodRevenueVnd": {
                    "today": 4600000,
                    "7d": 7200000,
                    "30d": 20200000,
                },
                "reviewRating5": 4.9,
                "reviewCount": 64,
                "reviewCriteria5": {
                    "amenities": 4.8,
                    "checkin": 4.9,
                    "cleanliness": 5.0,
                    "service": 4.9,
                    "value": 4.9,
                },
                "eloScore": 1720,
                "visibilityTone": "good",
                "visibilitySubtitle": {
                    "vi": "Hiển thị ưu tiên rất cao — Thuộc nhóm dẫn đầu khu vực biển Mỹ Khê",
                    "en": "Top-tier visibility · My Khe Beachfront",
                    "ko": "최상위 노출 등급 — 미케 해변 상위 그룹 우선 노출",
                },
            },
            {
                "id": "br_songhan",
                "isChainMember": True,
                "label": {
                    "vi": "L'amour Sông Hàn · Hải Châu",
                    "en": "L'amour Han River · Hai Chau",
                    "ko": "라무르 한강 · 하이쩌우",
                },
                "shortName": {
                    "vi": "CN Sông Hàn",
                    "en": "L'amour Han River",
                    "ko": "한강 지점",
                },
                "district": {
                    "vi": "Bạch Đằng, Hải Châu",
                    "en": "Bach Dang, Hai Chau",
                    "ko": "하이쩌우구 박당",
                },
                "roomsCount": 10,
                "badgeColor": "#0D9488",
                "autoBidEnabled": True,
                "previousPeriodRevenueVnd": {
                    "today": 2500000,
                    "7d": 13100000,
                    "30d": 20400000,
                },
                "reviewRating5": 4.8,
                "reviewCount": 46,
                "reviewCriteria5": {
                    "amenities": 4.7,
                    "checkin": 4.8,
                    "cleanliness": 4.8,
                    "service": 4.8,
                    "value": 4.8,
                },
                "eloScore": 1665,
                "visibilityTone": "good",
                "visibilitySubtitle": {
                    "vi": "Hiển thị ưu tiên cao — Được nhóm khách công tác trung tâm Hải Châu tin chọn",
                    "en": "High visibility · Hai Chau City Center",
                    "ko": "우수 노출 등급 — 하이쩌우 도심 출장객 선호 숙소",
                },
            },
            {
                "id": "br_anthuong",
                "isChainMember": True,
                "label": {
                    "vi": "L'amour An Thượng · Ngũ Hành Sơn",
                    "en": "L'amour An Thuong · Ngu Hanh Son",
                    "ko": "라무르 안트엉 · 응우하인선",
                },
                "shortName": {
                    "vi": "CN An Thượng",
                    "en": "L'amour An Thuong",
                    "ko": "안트엉 지점",
                },
                "district": {
                    "vi": "Mỹ An, Ngũ Hành Sơn",
                    "en": "My An, Ngu Hanh Son",
                    "ko": "응우하인선구 미안",
                },
                "roomsCount": 8,
                "badgeColor": "#7C3AED",
                "autoBidEnabled": True,
                "previousPeriodRevenueVnd": {
                    "today": 2700000,
                    "7d": 4900000,
                    "30d": 14000000,
                },
                "reviewRating5": 4.7,
                "reviewCount": 32,
                "reviewCriteria5": {
                    "amenities": 4.6,
                    "checkin": 4.7,
                    "cleanliness": 4.8,
                    "service": 4.7,
                    "value": 4.7,
                },
                "eloScore": 1610,
                "visibilityTone": "good",
                "visibilitySubtitle": {
                    "vi": "Hiển thị ổn định — Thu hút khách lưu trú nhiều đêm tại khu phố du lịch An Thượng",
                    "en": "Strong visibility · An Thuong Tourist Quarter",
                    "ko": "안정적 노출 등급 — 안트엉 여행자 거리 연박 고객 선호",
                },
            },
            {
                "id": "stay_h11",
                "isChainMember": False,
                "label": {
                    "vi": "Stay Hotel H11 (Cơ sở mới)",
                    "en": "Stay Hotel H11",
                    "ko": "Stay Hotel H11 (신규 지점)",
                },
                "shortName": {
                    "vi": "Stay Hotel H11",
                    "en": "Stay Hotel H11",
                    "ko": "Stay Hotel H11",
                },
                "district": {
                    "vi": "Cơ sở mới kích hoạt",
                    "en": "Newly Onboarded",
                    "ko": "신규 입점 숙소",
                },
                "roomsCount": 18,
                "badgeColor": "#64748B",
                "autoBidEnabled": True,
                "previousPeriodRevenueVnd": {
                    "today": 0,
                    "7d": 0,
                    "30d": 0,
                },
                "reviewRating5": 0.0,
                "reviewCount": 0,
                "reviewCriteria5": {
                    "amenities": 0.0,
                    "checkin": 0.0,
                    "cleanliness": 0.0,
                    "service": 0.0,
                    "value": 0.0,
                },
                "eloScore": 800,
                "visibilityTone": "low",
                "visibilitySubtitle": {
                    "vi": "Mức hiển thị khởi điểm — Hoàn tất thêm đơn đặt phòng để được ưu tiên đẩy lên đầu danh sách",
                    "en": "Poor visibility",
                    "ko": "초기 노출 단계 — 첫 확정 예약과 리뷰가 쌓이면 상단 노출 우선순위가 올라갑니다",
                },
            },
        ],
    }

    # 2. Build bid_records.json (68 L'amour records + 75 Stay Hotel H11 records)
    hist_sessions = [s for s in raw_sessions if s["status"] != "live"]
    won_sorted = sorted(
        [s for s in hist_sessions if s["status"] == "won"],
        key=lambda x: (x["sessionDate"], x.get("timeLabel") or ""),
        reverse=True,
    )
    base_seq = 42 + len(won_sorted)  # #71 down to #43
    booking_code_map = {
        s["id"]: f"#{base_seq - idx}" for idx, s in enumerate(won_sorted)
    }

    bid_records = []
    for s in hist_sessions:
        raw_st = s["status"]
        if raw_st == "won":
            status = "accepted"
        elif raw_st == "expired":
            status = "expired"
        elif raw_st == "payment_failed":
            status = "cancelled"
        else:
            status = "rejected"

        nights = int(s["nights"])
        rate = int(s.get("offeredBasePrice") or 850000)

        if status == "accepted":
            ci, co = parse_stay_dates(s.get("stayDatesLabel", ""), s["sessionDate"], nights)
            guests_cnt, note_i18n = build_guest_note_i18n(
                s.get("guestRequestTitle", "2 người lớn"), nights
            )
            offered_room_en = s.get("offeredRoom") or "Superior Double"
            room_i18n = ROOM_NAME_I18N.get(
                offered_room_en,
                {
                    "vi": offered_room_en,
                    "en": offered_room_en,
                    "ko": offered_room_en,
                },
            )
            amenities = [
                AMENITY_CODE_MAP.get(tag, "wifi")
                for tag in (s.get("amenitiesTags") or ["Wifi"])
            ]
            # Deduplicate while preserving order
            seen_am = []
            for a in amenities:
                if a not in seen_am:
                    seen_am.append(a)

            bid_records.append(
                {
                    "id": s["id"],
                    "bookingCode": booking_code_map[s["id"]],
                    "propertyId": s["branchId"],
                    "status": "accepted",
                    "bidMode": s.get("bidMode") or "auto",
                    "sessionDate": s["sessionDate"],
                    "timeLabel": s.get("timeLabel") or "18:00",
                    "checkInDate": ci,
                    "checkOutDate": co,
                    "nights": nights,
                    "guestsCount": guests_cnt,
                    "roomName": room_i18n,
                    "roomNumber": int(s.get("lockedRoomNumber") or 106),
                    "offeredRatePerNightVnd": rate,
                    "netRevenueVnd": int(s.get("hotelEarnedBase") or (rate * nights)),
                    "guestNote": note_i18n,
                    "amenities": seen_am,
                }
            )
        else:
            bid_records.append(
                {
                    "id": s["id"],
                    "propertyId": s["branchId"],
                    "status": status,
                    "bidMode": s.get("bidMode") or "manual",
                    "sessionDate": s["sessionDate"],
                    "timeLabel": s.get("timeLabel") or "19:00",
                    "nights": nights,
                    "offeredRatePerNightVnd": rate,
                }
            )

    # Append Stay Hotel H11 75 real records across 2026-10-08 .. 2026-11-06
    start_dt = datetime.date(2026, 10, 8)
    h11_seq = 1
    for day_idx, counts in enumerate(STAY_H11_30D_PATTERN):
        iso_date = (start_dt + datetime.timedelta(days=day_idx)).isoformat()
        for e_i in range(counts["expired"]):
            bid_records.append(
                {
                    "id": f"H11-{h11_seq:03d}",
                    "propertyId": "stay_h11",
                    "status": "expired",
                    "bidMode": "auto",
                    "sessionDate": iso_date,
                    "timeLabel": f"{11 + (e_i * 4) % 12:02d}:15",
                    "nights": 1 + (h11_seq % 2),
                    "offeredRatePerNightVnd": 920000,
                }
            )
            h11_seq += 1
        for r_i in range(counts["rejected"]):
            bid_records.append(
                {
                    "id": f"H11-{h11_seq:03d}",
                    "propertyId": "stay_h11",
                    "status": "rejected",
                    "bidMode": "auto",
                    "sessionDate": iso_date,
                    "timeLabel": f"{13 + (r_i * 2) % 10:02d}:30",
                    "nights": 1 + (h11_seq % 2),
                    "offeredRatePerNightVnd": 960000,
                }
            )
            h11_seq += 1

    # 3. Build hub_inbox.json
    hub_inbox = {
        "messages": [
            {
                "id": "MSG-01",
                "propertyId": "br_mykhe",
                "bookingCode": "#71",
                "guestName": "Minh Anh",
                "receivedAt": "19:10",
                "unread": True,
                "preview": {
                    "vi": "Đơn #71: Cho mình hỏi khách sạn có chỗ đậu ô tô 7 chỗ qua đêm không ạ?",
                    "en": "Booking #71: Could you confirm if overnight parking is available for a 7-seater SUV?",
                    "ko": "예약 #71: 7인승 차량 야간 무료 주차가 가능한지 확인 부탁드립니다.",
                },
            },
            {
                "id": "MSG-02",
                "propertyId": "br_anthuong",
                "bookingCode": "#69",
                "guestName": "Hoàng Nam",
                "receivedAt": "15:25",
                "unread": True,
                "preview": {
                    "vi": "Đơn #69: Gia đình mình 4 người xin chuẩn bị sẵn thêm 2 khăn tắm lớn trong phòng nhé.",
                    "en": "Booking #69: Our family of 4 would appreciate two extra bath towels upon check-in.",
                    "ko": "예약 #69: 4인 가족 투숙 예정으로 큰 타월 2장을 추가 비치해 주시면 감사하겠습니다.",
                },
            },
        ],
        "notifications": [
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
                    "vi": "Stay Hotel H11 chưa có đơn mở hàng — hãy cân nhắc giảm nhẹ 5–10% giá chào buổi tối.",
                    "en": "Stay Hotel H11 has 0 completed bookings — consider lowering opening evening rates by 5–10%.",
                    "ko": "Stay Hotel H11 첫 예약 유치를 위해 저녁 시간대 시작 요금을 5~10% 조정해 보세요.",
                },
            },
        ],
    }

    # 4. Build schema_manifest.json v3.0.0
    manifest = {
        "schemaVersion": "3.0.0",
        "architecture": "Optibide Partner Hub • Pure-Business Overview • Multi-Property • VI/EN/KO & VND/KRW/USD",
        "generatedAt": "2026-11-13T10:55:00+07:00",
        "primaryReferenceDate": "2026-11-06",
        "tables": {
            "hubConfig": {
                "file": "partner_hub_config.json",
                "pk": "schemaVersion",
                "description": "Cấu hình cổng đối tác Optibide, tỷ giá VND/KRW/USD, tài khoản quản lý, kỳ lọc Today/7D/30D và 4 cơ sở (3 CN L'amour + Stay Hotel H11)",
            },
            "bidRecords": {
                "file": "bid_records.json",
                "pk": "id",
                "fk": "propertyId -> hubConfig.properties.id",
                "description": "Dữ liệu các lượt báo giá & đơn đặt phòng hoàn tất (đủ 4 trạng thái accepted, expired, rejected, cancelled; kèm phiếu đặt phòng đa ngôn ngữ)",
            },
            "hubInbox": {
                "file": "hub_inbox.json",
                "pk": "messages.id / notifications.id",
                "fk": "propertyId -> hubConfig.properties.id",
                "description": "Hộp thư tin nhắn khách đặt phòng & thông báo vận hành hiển thị trên Topbar theo từng cơ sở",
            },
        },
    }

    outputs = {
        "partner_hub_config.json": hub_config,
        "bid_records.json": bid_records,
        "hub_inbox.json": hub_inbox,
        "schema_manifest.json": manifest,
    }

    for folder in (MASTER_DIR, SEED_DIR):
        folder.mkdir(parents=True, exist_ok=True)
        for fname, payload in outputs.items():
            (folder / fname).write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        for obs in OBSOLETE_FILES:
            obs_path = folder / obs
            if obs_path.exists():
                obs_path.unlink()

    print("Generated Master Data v3.0 cleanly:")
    for fname in outputs:
        sz = (MASTER_DIR / fname).stat().st_size
        print(f"  - {fname}: {sz:,} bytes")


if __name__ == "__main__":
    main()
