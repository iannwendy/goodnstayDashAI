#!/usr/bin/env python3
"""
Deterministic 30-Day GA4 BigQuery Export + OLTP + Multi-Tenant RBAC Mock Data Generator
for goodNstay Optibide Partner Hub (Target GCP Project: aevo-512307, Region: asia-southeast1).
"""

from __future__ import annotations

import hashlib
import json
import random
import shutil
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_DIR = REPO_ROOT / "dashboard" / "dashboard" / "master-data" / "seed"
BFF_ROOT = REPO_ROOT / "dashboard" / "bigquery-bff"
OUT_DIR = BFF_ROOT / ".generated_warehouse"
SCHEMAS_DIR = BFF_ROOT / "schemas"

BRANCH_TO_PARTNER: dict[str, str] = {
    "br_mykhe": "HTL-DN-024",
    "br_songhan": "HTL-DN-024",
    "br_anthuong": "HTL-DN-024",
    "stay_h11": "HTL-KR-011",
}

CONTENT_CATEGORIES = [
    "property_views",
    "facilities",
    "dining",
    "rooms",
    "nearby_attractions",
]

COUNTRY_GEO_MAP: dict[str, tuple[str, str, str]] = {
    "VN": ("Vietnam", "Da Nang", "Da Nang"),
    "KR": ("South Korea", "Seoul", "Seoul"),
    "US": ("United States", "California", "Los Angeles"),
    "JP": ("Japan", "Tokyo", "Tokyo"),
    "SG": ("Singapore", "Singapore", "Singapore"),
    "AU": ("Australia", "New South Wales", "Sydney"),
}

TRAFFIC_SOURCES = [
    ("gns_brand_search", "cpc", "google"),
    ("reverse_auction_launch", "paid_social", "facebook"),
    ("(organic)", "organic", "google"),
    ("(direct)", "(none)", "(direct)"),
    ("kr_outbound_danang", "cpc", "naver"),
]


def make_param(key: str, val: Any) -> dict[str, Any]:
    """Encode a single GA4 event_params union record enforcing <= 40 key & <= 100 str value."""
    safe_key = str(key)[:40]
    if isinstance(val, bool):
        return {
            "key": safe_key,
            "value": {
                "string_value": "true" if val else "false",
                "int_value": None,
                "float_value": None,
                "double_value": None,
            },
        }
    if isinstance(val, int):
        return {
            "key": safe_key,
            "value": {
                "string_value": None,
                "int_value": val,
                "float_value": None,
                "double_value": None,
            },
        }
    if isinstance(val, float):
        return {
            "key": safe_key,
            "value": {
                "string_value": None,
                "int_value": None,
                "float_value": None,
                "double_value": round(val, 4),
            },
        }
    s_val = str(val)[:100]
    return {
        "key": safe_key,
        "value": {
            "string_value": s_val,
            "int_value": None,
            "float_value": None,
            "double_value": None,
        },
    }


def map_device_struct(device_os: str, device_type: str, booker_country: str) -> tuple[str, dict[str, str]]:
    os_map = {"ios": "iOS", "android": "Android", "web": "Web"}
    platform_map = {"ios": "IOS", "android": "ANDROID", "web": "WEB"}
    lang_map = {"VN": "vi-vn", "KR": "ko-kr"}
    return platform_map.get(device_os, "WEB"), {
        "category": device_type if device_type in ("mobile", "tablet", "desktop") else "mobile",
        "operating_system": os_map.get(device_os, "Web"),
        "language": lang_map.get(booker_country, "en-us"),
    }


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_oltp_schemas() -> None:
    SCHEMAS_DIR.mkdir(parents=True, exist_ok=True)

    rbac_schema = [
        {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "partner_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "role_key", "type": "STRING", "mode": "REQUIRED"},
        {"name": "display_name_vi", "type": "STRING", "mode": "REQUIRED"},
        {"name": "display_name_en", "type": "STRING", "mode": "REQUIRED"},
        {"name": "display_name_ko", "type": "STRING", "mode": "REQUIRED"},
        {"name": "initials_vi", "type": "STRING", "mode": "REQUIRED"},
        {"name": "initials_en", "type": "STRING", "mode": "REQUIRED"},
        {"name": "initials_ko", "type": "STRING", "mode": "REQUIRED"},
        {"name": "role_badge_vi", "type": "STRING", "mode": "REQUIRED"},
        {"name": "role_badge_en", "type": "STRING", "mode": "REQUIRED"},
        {"name": "role_badge_ko", "type": "STRING", "mode": "REQUIRED"},
        {"name": "allowed_branch_ids", "type": "STRING", "mode": "REPEATED"},
        {"name": "can_view_chain_all", "type": "BOOL", "mode": "REQUIRED"},
        {"name": "can_view_financials", "type": "BOOL", "mode": "REQUIRED"},
        {"name": "can_manage_pricing", "type": "BOOL", "mode": "REQUIRED"},
    ]

    branches_schema = [
        {"name": "branch_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "partner_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "is_chain_member", "type": "BOOL", "mode": "REQUIRED"},
        {"name": "label_vi", "type": "STRING", "mode": "REQUIRED"},
        {"name": "label_en", "type": "STRING", "mode": "REQUIRED"},
        {"name": "label_ko", "type": "STRING", "mode": "REQUIRED"},
        {"name": "short_name_vi", "type": "STRING", "mode": "REQUIRED"},
        {"name": "short_name_en", "type": "STRING", "mode": "REQUIRED"},
        {"name": "short_name_ko", "type": "STRING", "mode": "REQUIRED"},
        {"name": "staying_country", "type": "STRING", "mode": "REQUIRED"},
        {"name": "staying_city", "type": "STRING", "mode": "REQUIRED"},
        {"name": "staying_district", "type": "STRING", "mode": "REQUIRED"},
        {"name": "accommodation_type", "type": "STRING", "mode": "REQUIRED"},
        {"name": "rooms_count", "type": "INT64", "mode": "REQUIRED"},
        {"name": "star_rating", "type": "INT64", "mode": "REQUIRED"},
        {"name": "review_rating_5", "type": "FLOAT64", "mode": "REQUIRED"},
        {"name": "review_count", "type": "INT64", "mode": "REQUIRED"},
        {"name": "elo_score", "type": "INT64", "mode": "REQUIRED"},
        {"name": "auto_bid_enabled", "type": "BOOL", "mode": "REQUIRED"},
    ]

    bids_schema = [
        {"name": "record_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "offer_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "request_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "booking_code", "type": "STRING", "mode": "NULLABLE"},
        {"name": "payment_code", "type": "STRING", "mode": "NULLABLE"},
        {"name": "payout_batch_id", "type": "STRING", "mode": "NULLABLE"},
        {"name": "partner_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "branch_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "session_date", "type": "DATE", "mode": "REQUIRED"},
        {"name": "time_label", "type": "STRING", "mode": "REQUIRED"},
        {"name": "status", "type": "STRING", "mode": "REQUIRED"},
        {"name": "bid_mode", "type": "STRING", "mode": "REQUIRED"},
        {"name": "check_in_date", "type": "DATE", "mode": "NULLABLE"},
        {"name": "check_out_date", "type": "DATE", "mode": "NULLABLE"},
        {"name": "nights", "type": "INT64", "mode": "REQUIRED"},
        {"name": "guests_count", "type": "INT64", "mode": "REQUIRED"},
        {"name": "room_type_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "room_type_key", "type": "STRING", "mode": "REQUIRED"},
        {"name": "room_number", "type": "INT64", "mode": "NULLABLE"},
        {"name": "offered_rate_per_night_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "net_revenue_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "platform_fee_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "vat_amount_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "gross_gmv_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "offer_total_price_display", "type": "FLOAT64", "mode": "REQUIRED"},
        {"name": "offer_currency", "type": "STRING", "mode": "REQUIRED"},
        {"name": "match_rate_pct", "type": "FLOAT64", "mode": "REQUIRED"},
        {"name": "saving_pct", "type": "FLOAT64", "mode": "REQUIRED"},
        {"name": "ota_code", "type": "STRING", "mode": "REQUIRED"},
        {"name": "ota_price_display", "type": "FLOAT64", "mode": "REQUIRED"},
        {"name": "was_impressed", "type": "BOOL", "mode": "REQUIRED"},
        {"name": "was_detail_viewed", "type": "BOOL", "mode": "REQUIRED"},
        {"name": "browse_click_count", "type": "INT64", "mode": "REQUIRED"},
        {"name": "decision_duration_sec", "type": "INT64", "mode": "NULLABLE"},
        {"name": "unmatched_keys", "type": "STRING", "mode": "REPEATED"},
        {"name": "device_os", "type": "STRING", "mode": "REQUIRED"},
        {"name": "device_type", "type": "STRING", "mode": "REQUIRED"},
        {"name": "booker_country", "type": "STRING", "mode": "REQUIRED"},
        {"name": "group_type", "type": "STRING", "mode": "REQUIRED"},
        {"name": "accommodation_type", "type": "STRING", "mode": "REQUIRED"},
        {"name": "lead_time_days", "type": "INT64", "mode": "REQUIRED"},
        {"name": "combo_signature", "type": "STRING", "mode": "REQUIRED"},
        {"name": "traveler_pseudo_id", "type": "STRING", "mode": "REQUIRED"},
    ]

    payouts_schema = [
        {"name": "batch_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "partner_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "branch_id", "type": "STRING", "mode": "REQUIRED"},
        {"name": "cycle_code", "type": "STRING", "mode": "REQUIRED"},
        {"name": "period_start", "type": "DATE", "mode": "REQUIRED"},
        {"name": "period_end", "type": "DATE", "mode": "REQUIRED"},
        {"name": "scheduled_payout_date", "type": "DATE", "mode": "REQUIRED"},
        {"name": "paid_at_date", "type": "DATE", "mode": "NULLABLE"},
        {"name": "status", "type": "STRING", "mode": "REQUIRED"},
        {"name": "bookings_count", "type": "INT64", "mode": "REQUIRED"},
        {"name": "net_payout_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "platform_fee_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "vat_amount_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "gross_gmv_vnd", "type": "INT64", "mode": "REQUIRED"},
        {"name": "booking_codes", "type": "STRING", "mode": "REPEATED"},
    ]

    (SCHEMAS_DIR / "oltp_partner_user_branch_access.json").write_text(
        json.dumps(rbac_schema, indent=2) + "\n", encoding="utf-8"
    )
    (SCHEMAS_DIR / "oltp_partner_branches.json").write_text(
        json.dumps(branches_schema, indent=2) + "\n", encoding="utf-8"
    )
    (SCHEMAS_DIR / "oltp_bid_offers_and_orders.json").write_text(
        json.dumps(bids_schema, indent=2) + "\n", encoding="utf-8"
    )
    (SCHEMAS_DIR / "oltp_payout_batches.json").write_text(
        json.dumps(payouts_schema, indent=2) + "\n", encoding="utf-8"
    )


def build_rbac_rows() -> list[dict[str, Any]]:
    return [
        {
            "user_id": "USR-PARTNER-01",
            "partner_id": "HTL-PORTFOLIO-01",
            "role_key": "manager",
            "display_name_vi": "Nguyễn Bảo Minh",
            "display_name_en": "Kim Ha-yoon",
            "display_name_ko": "김하윤",
            "initials_vi": "BM",
            "initials_en": "KH",
            "initials_ko": "KH",
            "role_badge_vi": "Tổng quản lý hệ thống",
            "role_badge_en": "Portfolio Manager",
            "role_badge_ko": "총괄 지배인",
            "allowed_branch_ids": ["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"],
            "can_view_chain_all": True,
            "can_view_financials": True,
            "can_manage_pricing": True,
        },
        {
            "user_id": "USR-MGR-MYKHE",
            "partner_id": "HTL-DN-024",
            "role_key": "branch_manager",
            "display_name_vi": "Lê Hoàng Nam",
            "display_name_en": "Lee Hoang Nam",
            "display_name_ko": "레 호앙 남",
            "initials_vi": "HN",
            "initials_en": "HN",
            "initials_ko": "HN",
            "role_badge_vi": "Quản lý CN Mỹ Khê",
            "role_badge_en": "Branch Manager · My Khe",
            "role_badge_ko": "미케 지점장",
            "allowed_branch_ids": ["br_mykhe"],
            "can_view_chain_all": False,
            "can_view_financials": True,
            "can_manage_pricing": True,
        },
        {
            "user_id": "USR-MGR-SONGHAN",
            "partner_id": "HTL-DN-024",
            "role_key": "branch_manager",
            "display_name_vi": "Phạm Minh Tuấn",
            "display_name_en": "Pham Minh Tuan",
            "display_name_ko": "팜 민 뚜언",
            "initials_vi": "MT",
            "initials_en": "MT",
            "initials_ko": "MT",
            "role_badge_vi": "Quản lý CN Sông Hàn",
            "role_badge_en": "Branch Manager · Han River",
            "role_badge_ko": "한강 지점장",
            "allowed_branch_ids": ["br_songhan"],
            "can_view_chain_all": False,
            "can_view_financials": True,
            "can_manage_pricing": True,
        },
        {
            "user_id": "USR-STAFF-02",
            "partner_id": "HTL-DN-024",
            "role_key": "receptionist",
            "display_name_vi": "Trần Thu Hà",
            "display_name_en": "Park So-yeon",
            "display_name_ko": "박소연",
            "initials_vi": "TH",
            "initials_en": "PS",
            "initials_ko": "PS",
            "role_badge_vi": "Lễ tân ca trực · Mỹ Khê",
            "role_badge_en": "Front-Desk · My Khe",
            "role_badge_ko": "프런트 · 미케 지점",
            "allowed_branch_ids": ["br_mykhe"],
            "can_view_chain_all": False,
            "can_view_financials": False,
            "can_manage_pricing": False,
        },
        {
            "user_id": "USR-MGR-H11",
            "partner_id": "HTL-KR-011",
            "role_key": "branch_manager",
            "display_name_vi": "Kim Ji-hoon",
            "display_name_en": "Kim Ji-hoon",
            "display_name_ko": "김지훈",
            "initials_vi": "JH",
            "initials_en": "JH",
            "initials_ko": "JH",
            "role_badge_vi": "Quản lý Stay Hotel H11",
            "role_badge_en": "Manager · Stay Hotel H11",
            "role_badge_ko": "스테이 호텔 H11 지배인",
            "allowed_branch_ids": ["stay_h11"],
            "can_view_chain_all": False,
            "can_view_financials": True,
            "can_manage_pricing": True,
        },
    ]


def generate_all() -> dict[str, Any]:
    rng = random.Random(20261123)

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_oltp_schemas()

    hub_cfg = json.loads((SEED_DIR / "partner_hub_config.json").read_text(encoding="utf-8"))
    bid_records = json.loads((SEED_DIR / "bid_records.json").read_text(encoding="utf-8"))
    payout_ledgers = json.loads((SEED_DIR / "payout_ledgers.json").read_text(encoding="utf-8"))

    # 1. RBAC table
    rbac_rows = build_rbac_rows()
    write_jsonl(OUT_DIR / "oltp" / "partner_user_branch_access.jsonl", rbac_rows)

    # 2. Branches table
    branch_rows: list[dict[str, Any]] = []
    for p in hub_cfg["properties"]:
        bid = p["id"]
        mi = p["marketplaceIdentity"]
        branch_rows.append(
            {
                "branch_id": bid,
                "partner_id": BRANCH_TO_PARTNER[bid],
                "is_chain_member": bool(p["isChainMember"]),
                "label_vi": p["label"]["vi"],
                "label_en": p["label"]["en"],
                "label_ko": p["label"]["ko"],
                "short_name_vi": p["shortName"]["vi"],
                "short_name_en": p["shortName"]["en"],
                "short_name_ko": p["shortName"]["ko"],
                "staying_country": mi["staying_country"],
                "staying_city": mi["staying_city"],
                "staying_district": mi["staying_district"],
                "accommodation_type": mi["accommodation_type"],
                "rooms_count": int(p["roomsCount"]),
                "star_rating": int(mi["star_rating"]),
                "review_rating_5": float(p["reviewRating5"]),
                "review_count": int(p["reviewCount"]),
                "elo_score": int(p["eloScore"]),
                "auto_bid_enabled": bool(p["autoBidEnabled"]),
            }
        )
    write_jsonl(OUT_DIR / "oltp" / "partner_branches.jsonl", branch_rows)

    # 3. Payout batches table
    payout_rows: list[dict[str, Any]] = []
    for b in payout_ledgers["batches"]:
        sb = b["settlementBreakdown"]
        bid = b["propertyId"]
        payout_rows.append(
            {
                "batch_id": b["id"],
                "partner_id": BRANCH_TO_PARTNER[bid],
                "branch_id": bid,
                "cycle_code": b["cycleCode"],
                "period_start": b["periodStart"],
                "period_end": b["periodEnd"],
                "scheduled_payout_date": b["scheduledPayoutDate"],
                "paid_at_date": b.get("paidAtDate"),
                "status": b["status"],
                "bookings_count": int(b["bookingsCount"]),
                "net_payout_vnd": int(sb["partner_base_price_vnd"]),
                "platform_fee_vnd": int(sb["platform_fee_15pct_vnd"]),
                "vat_amount_vnd": int(sb["vat_10pct_vnd"]),
                "gross_gmv_vnd": int(sb["total_booking_gmv_vnd"]),
                "booking_codes": list(b["bookingCodes"]),
            }
        )
    write_jsonl(OUT_DIR / "oltp" / "payout_batches.jsonl", payout_rows)

    # Prepare 30-day shards map (2026-10-08 .. 2026-11-06)
    start_dt = date(2026, 10, 8)
    end_dt = date(2026, 11, 6)
    ga4_shards: dict[str, list[dict[str, Any]]] = {}
    cur = start_dt
    while cur <= end_dt:
        ga4_shards[cur.strftime("%Y%m%d")] = []
        cur += timedelta(days=1)

    oltp_bid_rows: list[dict[str, Any]] = []

    def emit_ga4(
        shard_ymd: str,
        ts_micros: int,
        event_name: str,
        user_id: str,
        pseudo_id: str,
        platform: str,
        device_struct: dict[str, str],
        geo_struct: dict[str, str],
        traffic_struct: dict[str, str],
        params_dict: dict[str, Any],
    ) -> None:
        stream_id = "90881001" if platform == "WEB" else ("90881002" if platform == "IOS" else "90881003")
        event_params = [make_param(k, v) for k, v in params_dict.items() if v is not None]
        assert len(event_params) <= 25, f"Exceeded 25 GA4 params on {event_name}"
        ga4_shards[shard_ymd].append(
            {
                "event_date": shard_ymd,
                "event_timestamp": ts_micros,
                "event_name": event_name,
                "user_id": user_id,
                "user_pseudo_id": pseudo_id,
                "stream_id": stream_id,
                "platform": platform,
                "device": device_struct,
                "geo": geo_struct,
                "traffic_source": traffic_struct,
                "event_params": event_params,
            }
        )

    # 4. Expand all 143 bid_records into OLTP rows + authentic GA4 funnel events
    for idx, rec in enumerate(bid_records, start=1):
        branch_id = rec["propertyId"]
        partner_id = BRANCH_TO_PARTNER[branch_id]
        tel = rec["telemetry"]
        bf = tel["booking_form"]
        ol = tel["offer_listing"]
        es = tel.get("explore_stays")
        pf = tel.get("payment_form")

        session_iso = rec["sessionDate"]  # YYYY-MM-DD
        shard_ymd = session_iso.replace("-", "")
        hh, mm = [int(x) for x in rec["timeLabel"].split(":")]
        base_dt = datetime(
            int(session_iso[0:4]),
            int(session_iso[5:7]),
            int(session_iso[8:10]),
            hh,
            mm,
            rng.randint(5, 45),
            tzinfo=timezone.utc,
        )
        base_micros = int(base_dt.timestamp() * 1_000_000)

        status = rec["status"]  # accepted | expired | rejected | cancelled
        nights = max(1, int(rec.get("nights") or bf.get("stay_nights") or 1))
        rate_vnd = int(rec["offeredRatePerNightVnd"])

        if status == "accepted" and pf is not None:
            net_vnd = int(pf["base_price"])
            fee_vnd = int(pf["platform_fee_amount"])
            vat_vnd = int(pf["vat_amount"])
            gmv_vnd = int(pf["total_booking_amount"])
            payment_code = pf["payment_code"]
        else:
            net_vnd = 0
            fee_vnd = 0
            vat_vnd = 0
            gmv_vnd = 0
            payment_code = None

        pseudo_seed = int(hashlib.sha256(rec["id"].encode("utf-8")).hexdigest()[:8], 16)
        user_id = f"TRV-{1000 + (pseudo_seed % 9000)}"
        pseudo_id = f"{100000000 + (pseudo_seed % 899999999)}.{int(base_dt.timestamp()) - 3600}"
        ga_session_id = int(base_dt.timestamp())

        booker_country = bf["booker_country"]
        country_name, region_name, city_name = COUNTRY_GEO_MAP.get(
            booker_country, ("Vietnam", "Ho Chi Minh", "Ho Chi Minh City")
        )
        geo_struct = {"country": country_name, "region": region_name, "city": city_name}
        platform, device_struct = map_device_struct(bf["device_os"], bf["device_type"], booker_country)
        src_name, src_med, src_src = TRAFFIC_SOURCES[pseudo_seed % len(TRAFFIC_SOURCES)]
        traffic_struct = {"name": src_name, "medium": src_med, "source": src_src}

        combo_hash = hashlib.md5(bf["combo_signature"].encode("utf-8")).hexdigest()[:12]

        oltp_bid_rows.append(
            {
                "record_id": rec["id"],
                "offer_id": ol["offer_id"],
                "request_id": bf["request_id"],
                "booking_code": rec.get("bookingCode"),
                "payment_code": payment_code,
                "payout_batch_id": rec.get("payoutBatchId"),
                "partner_id": partner_id,
                "branch_id": branch_id,
                "session_date": session_iso,
                "time_label": rec["timeLabel"],
                "status": status,
                "bid_mode": rec["bidMode"],
                "check_in_date": rec.get("checkInDate") or bf["check_in_date"],
                "check_out_date": rec.get("checkOutDate") or bf["check_out_date"],
                "nights": nights,
                "guests_count": int(rec.get("guestsCount") or bf["total_guests"]),
                "room_type_id": rec.get("roomTypeId") or ol["room_id"],
                "room_type_key": ol["room_type_key"],
                "room_number": rec.get("roomNumber"),
                "offered_rate_per_night_vnd": rate_vnd,
                "net_revenue_vnd": net_vnd,
                "platform_fee_vnd": fee_vnd,
                "vat_amount_vnd": vat_vnd,
                "gross_gmv_vnd": gmv_vnd,
                "offer_total_price_display": float(ol["offer_total_price"]),
                "offer_currency": ol["currency"],
                "match_rate_pct": float(ol["match_rate_pct"]),
                "saving_pct": float(ol["saving_pct"]),
                "ota_code": ol["ota_code"],
                "ota_price_display": float(ol["ota_price"]),
                "was_impressed": bool(ol["was_impressed"]),
                "was_detail_viewed": bool(ol["was_detail_viewed"]),
                "browse_click_count": int(ol["browse_click_count"]),
                "decision_duration_sec": ol.get("decision_duration_sec"),
                "unmatched_keys": list(ol.get("unmatched_keys") or []),
                "device_os": bf["device_os"],
                "device_type": bf["device_type"],
                "booker_country": booker_country,
                "group_type": bf["group_type"],
                "accommodation_type": bf["accommodation_type"],
                "lead_time_days": int(bf["lead_time_days"]),
                "combo_signature": bf["combo_signature"],
                "traveler_pseudo_id": user_id,
            }
        )

        common_params = {
            "ga_session_id": ga_session_id,
            "engagement_time_msec": 1200,
            "partner_id": partner_id,
            "branch_id": branch_id,
            "request_id": bf["request_id"],
            "request_code": bf["request_code"],
            "device_os": bf["device_os"],
            "booker_country": booker_country,
        }

        # Step 1: booking_form_start
        emit_ga4(
            shard_ymd,
            base_micros,
            "booking_form_start",
            user_id,
            pseudo_id,
            platform,
            device_struct,
            geo_struct,
            traffic_struct,
            {
                **common_params,
                "entry_source": bf["entry_source"],
                "staying_country": bf["staying_country"],
                "staying_city": bf["staying_city"],
                "accommodation_type": bf["accommodation_type"],
            },
        )

        # Step 2: booking_form_complete
        step2_micros = base_micros + int(bf["duration_ms"]) * 1000
        emit_ga4(
            shard_ymd,
            step2_micros,
            "booking_form_complete",
            user_id,
            pseudo_id,
            platform,
            device_struct,
            geo_struct,
            traffic_struct,
            {
                **common_params,
                "stay_nights": int(bf["stay_nights"]),
                "lead_time_days": int(bf["lead_time_days"]),
                "total_guests": int(bf["total_guests"]),
                "group_type": bf["group_type"],
                "accommodation_type": bf["accommodation_type"],
                "combo_hash": combo_hash,
                "criteria_count": int(bf["criteria_count"]),
            },
        )

        # Step 3: offer_card_impression (when hotel bid arrives & renders)
        if ol["was_impressed"]:
            imp_micros = step2_micros + 5_000_000
            emit_ga4(
                shard_ymd,
                imp_micros,
                "offer_card_impression",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "room_id": ol["room_id"],
                    "is_auto_bid": bool(ol["is_auto_bid"]),
                    "match_rate_pct": float(ol["match_rate_pct"]),
                    "saving_pct": float(ol["saving_pct"]),
                    "card_position": int(ol["card_position"]),
                    "currency": ol["currency"],
                },
            )

        # Step 4: offer_browse_click (1 or more clicks -> demonstrates Total Clicks vs Unique Viewed Offers!)
        browse_list = list(ol.get("browse_elapsed_sec_list") or [])
        if ol["was_detail_viewed"] and not browse_list:
            browse_list = [int(ol.get("elapsed_since_bid_sec") or 25)]

        for click_idx, elapsed_sec in enumerate(browse_list, start=1):
            click_micros = step2_micros + max(6, int(elapsed_sec)) * 1_000_000
            emit_ga4(
                shard_ymd,
                click_micros,
                "offer_browse_click",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "room_id": ol["room_id"],
                    "click_seq": click_idx,
                    "match_rate_pct": float(ol["match_rate_pct"]),
                    "saving_pct": float(ol["saving_pct"]),
                },
            )

        # Step 5: explore_stay_media_click & scroll/dwell inside detail modal
        if es is not None and ol["was_detail_viewed"]:
            modal_base_micros = step2_micros + max(10, int(browse_list[0] if browse_list else 20)) * 1_000_000
            emit_ga4(
                shard_ymd,
                modal_base_micros + 3_000_000,
                "explore_stay_modal_scroll",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "view_session_id": es["view_session_id"],
                    "scroll_down_count": int(es["scroll_down_count"]),
                    "scroll_up_count": int(es["scroll_up_count"]),
                    "max_scroll_depth_pct": int(es["max_scroll_depth_pct"]),
                    "dwell_ms": int(es["description_dwell_ms"]),
                },
            )

            media_clicks = max(1, int(es.get("media_clicked_count") or 1))
            primary_cat = es["content_category"]
            if primary_cat == "videos":
                primary_cat = "rooms"
            for m_idx in range(media_clicks):
                cat = primary_cat if m_idx == 0 else CONTENT_CATEGORIES[(idx + m_idx) % len(CONTENT_CATEGORIES)]
                m_type = "video" if (m_idx == media_clicks - 1 and es["media_type"] == "video") or (m_idx % 4 == 3) else "image"
                emit_ga4(
                    shard_ymd,
                    modal_base_micros + (5 + m_idx * 2) * 1_000_000,
                    "explore_stay_media_click",
                    user_id,
                    pseudo_id,
                    platform,
                    device_struct,
                    geo_struct,
                    traffic_struct,
                    {
                        **common_params,
                        "offer_id": ol["offer_id"],
                        "view_session_id": es["view_session_id"],
                        "content_category": cat,
                        "media_type": m_type,
                        "dwell_ms": rng.randint(1800, 6500),
                    },
                )

        # Terminal / checkout steps (Steps 6, 7, 8 or Reject / Expired / Cancelled)
        decision_sec = int(ol.get("decision_duration_sec") or 180)
        decision_micros = step2_micros + max(30, decision_sec) * 1_000_000

        if status == "accepted" and pf is not None:
            # Step 6: offer_select_click
            emit_ga4(
                shard_ymd,
                decision_micros,
                "offer_select_click",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "entry_surface": pf["entry_surface"],
                    "decision_duration_sec": decision_sec,
                    "match_rate_pct": float(ol["match_rate_pct"]),
                    "saving_pct": float(ol["saving_pct"]),
                },
            )
            # Step 7: payment_checkout_open
            emit_ga4(
                shard_ymd,
                decision_micros + 4_000_000,
                "payment_checkout_open",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "checkout_session_id": pf["checkout_session_id"],
                    "gateway_type": pf["gateway_type"],
                    "currency": pf["booking_currency"],
                },
            )
            # Step 8: payment_complete
            paid_offset_sec = max(15, int(pf["select_to_paid_sec"]))
            emit_ga4(
                shard_ymd,
                decision_micros + paid_offset_sec * 1_000_000,
                "payment_complete",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "booking_id": pf["booking_id"],
                    "payment_code": pf["payment_code"],
                    "gateway_type": pf["gateway_type"],
                    "currency": "VND",
                    "value": float(net_vnd),
                    "gmv_vnd": gmv_vnd,
                    "select_to_paid_sec": paid_offset_sec,
                },
            )
        elif status == "rejected":
            # ~30% of rejected offers hesitated after clicking Select (Step 6 -> abandoned before payment)
            if idx % 3 == 0 and ol["was_detail_viewed"]:
                emit_ga4(
                    shard_ymd,
                    decision_micros - 20_000_000,
                    "offer_select_click",
                    user_id,
                    pseudo_id,
                    platform,
                    device_struct,
                    geo_struct,
                    traffic_struct,
                    {
                        **common_params,
                        "offer_id": ol["offer_id"],
                        "entry_surface": "explore_stay_modal_select",
                        "decision_duration_sec": decision_sec,
                    },
                )
                if idx % 6 == 0:
                    emit_ga4(
                        shard_ymd,
                        decision_micros - 10_000_000,
                        "payment_checkout_open",
                        user_id,
                        pseudo_id,
                        platform,
                        device_struct,
                        geo_struct,
                        traffic_struct,
                        {
                            **common_params,
                            "offer_id": ol["offer_id"],
                            "checkout_session_id": f"CHK-ABND-{idx}",
                            "gateway_type": "nhn_kcp",
                            "currency": ol["currency"],
                        },
                    )
            unmatched_first = (ol.get("unmatched_keys") or ["price_above_target"])[0]
            emit_ga4(
                shard_ymd,
                decision_micros,
                "offer_reject_click",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "decision_duration_sec": decision_sec,
                    "primary_unmatched_key": unmatched_first,
                    "match_rate_pct": float(ol["match_rate_pct"]),
                    "saving_pct": float(ol["saving_pct"]),
                },
            )
        elif status == "expired":
            emit_ga4(
                shard_ymd,
                step2_micros + 3600 * 1_000_000,
                "offer_ttl_expired",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "was_detail_viewed": bool(ol["was_detail_viewed"]),
                    "saving_pct": float(ol["saving_pct"]),
                },
            )
        elif status == "cancelled":
            emit_ga4(
                shard_ymd,
                decision_micros,
                "booking_request_cancel",
                user_id,
                pseudo_id,
                platform,
                device_struct,
                geo_struct,
                traffic_struct,
                {
                    **common_params,
                    "offer_id": ol["offer_id"],
                    "cancel_source": bf.get("cancel_source") or "partner_inventory_hold",
                },
            )

    # 5. Add realistic top-of-funnel pre-submit form starts across all 30 days & 4 branches
    branches_cycle = ["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"]
    os_cycle = ["ios", "android", "web"]
    cur = start_dt
    abnd_seq = 1
    while cur <= end_dt:
        ymd = cur.strftime("%Y%m%d")
        for b_idx, branch_id in enumerate(branches_cycle):
            extra_starts = 2 if branch_id != "stay_h11" else 3
            for k in range(extra_starts):
                abnd_seq += 1
                partner_id = BRANCH_TO_PARTNER[branch_id]
                dev_os = os_cycle[(abnd_seq + b_idx) % len(os_cycle)]
                dev_type = "desktop" if dev_os == "web" else "mobile"
                b_country = "KR" if branch_id == "stay_h11" else ("VN" if k == 0 else "KR")
                c_name, r_name, ci_name = COUNTRY_GEO_MAP[b_country]
                platform, dev_struct = map_device_struct(dev_os, dev_type, b_country)
                src_name, src_med, src_src = TRAFFIC_SOURCES[abnd_seq % len(TRAFFIC_SOURCES)]
                dt_utc = datetime(cur.year, cur.month, cur.day, 9 + (k * 4) + b_idx, 15, 0, tzinfo=timezone.utc)
                ts_mic = int(dt_utc.timestamp() * 1_000_000)
                emit_ga4(
                    ymd,
                    ts_mic,
                    "booking_form_start",
                    f"TRV-ABND-{abnd_seq}",
                    f"9900{abnd_seq}.{int(dt_utc.timestamp())}",
                    platform,
                    dev_struct,
                    {"country": c_name, "region": r_name, "city": ci_name},
                    {"name": src_name, "medium": src_med, "source": src_src},
                    {
                        "ga_session_id": int(dt_utc.timestamp()),
                        "engagement_time_msec": 650,
                        "partner_id": partner_id,
                        "branch_id": branch_id,
                        "request_id": f"ABND-{abnd_seq}",
                        "device_os": dev_os,
                        "booker_country": b_country,
                        "entry_source": "explore_stays_cta",
                        "staying_country": "KR" if branch_id == "stay_h11" else "VN",
                        "accommodation_type": "hotel",
                    },
                )
        cur += timedelta(days=1)

    write_jsonl(OUT_DIR / "oltp" / "bid_offers_and_orders.jsonl", oltp_bid_rows)

    total_ga4_events = 0
    for ymd, rows in sorted(ga4_shards.items()):
        rows.sort(key=lambda r: r["event_timestamp"])
        write_jsonl(OUT_DIR / "ga4" / f"events_{ymd}.jsonl", rows)
        total_ga4_events += len(rows)

    # Also write intraday mirror for reference today (20261106) to demonstrate streaming table structure
    intraday_rows = ga4_shards["20261106"]
    write_jsonl(OUT_DIR / "ga4_intraday" / "events_intraday_20261106.jsonl", intraday_rows)

    accepted_lamour = [
        r for r in oltp_bid_rows if r["partner_id"] == "HTL-DN-024" and r["status"] == "accepted"
    ]
    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "gcp_project_id": "aevo-512307",
        "bq_location": "US",
        "date_window": {"start": "2026-10-08", "end": "2026-11-06", "days": len(ga4_shards)},
        "counts": {
            "rbac_profiles": len(rbac_rows),
            "branches": len(branch_rows),
            "oltp_bid_offers": len(oltp_bid_rows),
            "payout_batches": len(payout_rows),
            "ga4_daily_shards": len(ga4_shards),
            "ga4_total_daily_events": total_ga4_events,
            "ga4_intraday_20261106_events": len(intraday_rows),
        },
        "reconciliation": {
            "lamour_accepted_bookings": len(accepted_lamour),
            "lamour_net_revenue_vnd": sum(r["net_revenue_vnd"] for r in accepted_lamour),
            "lamour_platform_fee_vnd": sum(r["platform_fee_vnd"] for r in accepted_lamour),
            "lamour_vat_amount_vnd": sum(r["vat_amount_vnd"] for r in accepted_lamour),
            "lamour_gross_gmv_vnd": sum(r["gross_gmv_vnd"] for r in accepted_lamour),
            "stay_h11_total_bids": sum(1 for r in oltp_bid_rows if r["branch_id"] == "stay_h11"),
            "stay_h11_net_revenue_vnd": sum(
                r["net_revenue_vnd"] for r in oltp_bid_rows if r["branch_id"] == "stay_h11"
            ),
        },
    }
    (OUT_DIR / "manifest_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    return summary


if __name__ == "__main__":
    result = generate_all()
    print(json.dumps(result, indent=2, ensure_ascii=False))
