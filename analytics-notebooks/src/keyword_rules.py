"""Tier-1 multilingual keyword extraction (VI/EN/KO) and Phase-1 C1-C4 clustering.

Directly implements `docs/analytics-and-schema/2026-11-20-traveler-keyword-clustering-design.md`:
- 16 canonical keyword codes (`KW_01`..`KW_16`) mapped to 4 clusters (`C1`..`C4`).
- Tier-1 zero-cost dictionary + 4-word negation window with positive exceptions.
- Phase-1 deterministic weighted scoring (`w_note=4.0`, `w_beh=3.5`, `w_form=2.0`,
  `w_rev=1.0`) and 3-level deterministic tie-breaker (`behavior > note > C3>C1>C2>C4`).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .pii_scrubber import scrub_pii, strip_vietnamese_diacritics

ClusterCode = str

KEYWORD_TO_CLUSTER: dict[str, ClusterCode] = {
    "KW_01": "C1", "KW_02": "C1", "KW_03": "C1", "KW_04": "C1",
    "KW_05": "C2", "KW_06": "C2", "KW_07": "C2", "KW_08": "C2",
    "KW_09": "C3", "KW_10": "C3", "KW_11": "C3", "KW_12": "C3",
    "KW_13": "C4", "KW_14": "C4", "KW_15": "C4", "KW_16": "C4",
}

CLUSTER_LABELS_VI: dict[ClusterCode, str] = {
    "C1": "Khách săn giá & đối chiếu sàn ngoài",
    "C2": "Khách gia đình, đi đoàn & nghỉ dưỡng cần tiện nghi",
    "C3": "Khách đặt gấp sát giờ & công tác cần nhanh gọn",
    "C4": "Khách kỹ tính thẩm định đánh giá, hình ảnh & vị trí",
}

CLUSTER_TIE_PRIORITY: tuple[ClusterCode, ...] = ("C3", "C1", "C2", "C4")

# Multilingual phrases (Vietnamese, English, Korean) from Master Keyword Dictionary
TIER1_KEYWORD_PHRASES: dict[str, tuple[str, ...]] = {
    "KW_01": (
        "gia re", "tiet kiem", "phong co ban", "ngan sach thap", "re nhat", "khuyen mai",
        "budget", "cheapest", "lowest price", "affordable", "economy", "promo",
        "저렴한", "가성비", "최저가", "특가", "할인",
    ),
    "KW_02": (
        "re hon agoda", "so gia booking", "khop gia", "uu dai tot hon",
        "price match", "cheaper than agoda", "better deal", "ota price", "discount",
        "가격비교", "아고다보다", "부킹닷컴", "더 싼",
    ),
    "KW_03": (
        "khong phu thu", "da gom thue phi", "mien phi them nguoi", "khong phi an",
        "no hidden fee", "all inclusive price", "no extra charge", "free extra bed",
        "추가요금 없이", "세금포함", "무료 추가",
    ),
    "KW_05": (
        "noi em be", "cui tre em", "tre nho", "gia dinh", "nguoi gia", "bo me lon tuoi",
        "tang thap de di", "ghe tre em", "chao em be",
        "baby cot", "crib", "infant", "toddler", "kids", "family", "elderly", "stroller", "wheelchair", "low floor",
        "아기침대", "유아", "아이와", "가족여행", "부모님", "어르신", "유모차", "휠체어", "저층",
    ),
    "KW_06": (
        "an sang", "buffet sang", "bua sang", "do chay", "halal", "di ung thuc pham",
        "breakfast included", "morning buffet", "free breakfast", "breakfast", "vegetarian", "food allergy",
        "조식포함", "무료조식", "아침식사", "조식", "뷔페", "채식", "알레르기",
    ),
    "KW_07": (
        "trang mat", "ky niem ngay cuoi", "sinh nhat", "trang tri phong", "bon tam nam",
        "ho boi", "dau xe o to", "phong thong nhau", "mang cho meo", "nghi duong",
        "honeymoon", "anniversary", "birthday", "bathtub", "connecting rooms", "adjacent rooms",
        "free parking", "pet friendly", "kitchenette", "leisure stay", "weekend leisure",
        "신혼여행", "허니문", "기념일", "생일", "욕조", "커넥팅룸", "연결된 방", "주차장", "반려견", "취사가능", "주말 휴양",
    ),
    "KW_09": (
        "nhan phong ngay", "dang tren duong toi", "toi khuya", "check in muon", "nhan phong dem", "can phong gap",
        "arriving tonight", "late check-in", "midnight arrival", "urgent", "immediate check-in",
        "오늘 입실", "늦은 체크인", "심야 도착", "급하게", "바로 입실",
    ),
    "KW_10": (
        "xac nhan ngay", "phan hoi nhanh",
        "instant confirmation", "quick reply",
        "빠른 확정", "즉시 확인",
    ),
    "KW_11": (
        "nhan phong som", "check in som", "tra phong tre", "late check out", "gui hanh ly",
        "early check-in", "late check-out", "luggage storage", "flight at night",
        "얼리 체크인", "레이트 체크아웃", "짐보관", "늦은 퇴실",
    ),
    "KW_12": (
        "cong tac", "xuat hoa don", "hoa don do", "hoa don vat", "ban lam viec", "wifi manh", "ui do",
        "business trip", "tax invoice", "company receipt", "vat invoice", "work desk", "fast wifi",
        "출장", "세금계산서", "영수증 발급", "법인카드", "업무용 책상",
    ),
    "KW_13": (
        "sach se", "khong mui thuoc la", "phong khong hut thuoc", "cach am tot", "yen tinh", "an ninh", "moi sua",
        "spotless", "clean", "non-smoking", "smoke-free", "no smoking", "soundproof", "quiet room", "away from elevator", "safe",
        "청결", "깨끗한", "금연실", "담배냄새 없는", "방음", "조용한 방", "엘리베이터에서 먼",
    ),
    "KW_14": (
        "huong bien", "view bien", "cua so lon", "ban cong", "tang cao", "thoang mat", "dung nhu hinh",
        "ocean view", "sea view", "city view", "high floor", "balcony", "big window", "natural light",
        "오션뷰", "바다전망", "시티뷰", "고층", "발코니", "창문 있는 방", "채광",
    ),
    "KW_15": (
        "gan bien", "di bo ra bien", "gan trung tam", "gan cho dem", "gan ga tau", "xe dua don san bay",
        "walking distance", "near beach", "near metro", "subway station", "city center", "airport shuttle", "pickup",
        "역세권", "지하철역 근처", "해변 도보", "시내 중심", "공항 픽업", "셔틀",
    ),
}

# Fixed positive phrases that legitimately contain negation tokens ("không", "no", "없이")
POSITIVE_NEGATION_PHRASES: frozenset[str] = frozenset({
    "khong phu thu", "khong phi an", "no hidden fee", "no extra charge", "추가요금 없이",
    "khong mui thuoc la", "phong khong hut thuoc", "non-smoking", "no smoking", "smoke-free", "담배냄새 없는",
})

NEGATION_TOKENS: frozenset[str] = frozenset({
    "khong", "dung", "mien", "no", "without", "not", "dont", "don't", "없이", "말고", "안", "필요없",
})

CONTRAST_MARKERS: tuple[str, ...] = (
    "nhung", "tuy nhien", "ngoai tru", "except", "however", "but", "하지만", "그러나",
)


@dataclass(frozen=True)
class Tier1TagResult:
    cleaned_text: str
    matched_keywords: tuple[str, ...]
    needs_tier2_llm: bool
    had_pii: bool


def _is_negated_before(folded_text: str, match_start: int, phrase: str) -> bool:
    if phrase in POSITIVE_NEGATION_PHRASES:
        return False
    prefix = folded_text[:match_start]
    # Limit negation scope to the current clause after punctuation/contrast markers
    clause = re.split(r"[,;.\n]|(?:\bnhung\b|\btuy nhien\b|\bbut\b|\bhowever\b|하지만)", prefix)[-1].strip()
    if not clause:
        return False
    # Neutralize positive idioms that contain negation words (e.g. "khong mui thuoc la")
    for positive_idiom in POSITIVE_NEGATION_PHRASES:
        clause = clause.replace(positive_idiom, " ")
    prev_tokens = re.findall(r"[a-z0-9']+|[가-힣]+", clause)[-4:]
    return any(tok in NEGATION_TOKENS for tok in prev_tokens)


def extract_tier1_keywords(
    raw_text: str | None,
    known_names: Sequence[str] | None = None,
) -> Tier1TagResult:
    """Run Step-0 PII scrubbing + Tier-1 VI/EN/KO dictionary + 4-word negation guard."""
    scrubbed = scrub_pii(raw_text, known_names=known_names)
    cleaned = scrubbed.cleaned_text
    if len(cleaned) < 3:
        return Tier1TagResult(
            cleaned_text=cleaned,
            matched_keywords=(),
            needs_tier2_llm=False,
            had_pii=scrubbed.had_pii,
        )

    folded = strip_vietnamese_diacritics(cleaned)
    matched: list[str] = []

    for kw_code, phrases in TIER1_KEYWORD_PHRASES.items():
        for phrase in phrases:
            # Korean phrases match directly; Latin phrases use word boundaries
            is_latin = bool(re.fullmatch(r"[a-z0-9\s\-]+", phrase))
            if is_latin:
                pattern = re.compile(rf"(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])")
            else:
                pattern = re.compile(re.escape(phrase))
            found = pattern.search(folded)
            if found and not _is_negated_before(folded, found.start(), phrase):
                matched.append(kw_code)
                break

    has_contrast = any(marker in folded for marker in CONTRAST_MARKERS)
    needs_t2 = (len(matched) == 0 and len(cleaned) >= 12) or len(cleaned) >= 80 or has_contrast
    return Tier1TagResult(
        cleaned_text=cleaned,
        matched_keywords=tuple(sorted(set(matched))),
        needs_tier2_llm=needs_t2,
        had_pii=scrubbed.had_pii,
    )


@dataclass(frozen=True)
class ClusterAssignment:
    cluster: ClusterCode
    cluster_label_vi: str
    total_scores: dict[ClusterCode, float]
    behavior_scores: dict[ClusterCode, float]
    note_scores: dict[ClusterCode, float]
    matched_note_keywords: tuple[str, ...]


def score_and_assign_cluster(
    record: Mapping[str, Any],
    note_keywords: Sequence[str] = (),
    past_review_keywords: Sequence[str] = (),
) -> ClusterAssignment:
    """Compute Phase-1 deterministic C1-C4 weighted scores and assign 1 winning cluster."""
    behavior_scores: dict[ClusterCode, float] = {"C1": 0.0, "C2": 0.0, "C3": 0.0, "C4": 0.0}
    note_scores: dict[ClusterCode, float] = {"C1": 0.0, "C2": 0.0, "C3": 0.0, "C4": 0.0}
    form_scores: dict[ClusterCode, float] = {"C1": 0.0, "C2": 0.0, "C3": 0.0, "C4": 0.0}
    review_scores: dict[ClusterCode, float] = {"C1": 0.0, "C2": 0.0, "C3": 0.0, "C4": 0.0}

    # 1. Notes (w_note = +4.0, capped at 2 distinct keywords per cluster = 8.0)
    seen_note_per_cluster: dict[ClusterCode, set[str]] = {c: set() for c in behavior_scores}
    for kw in note_keywords:
        cluster = KEYWORD_TO_CLUSTER.get(kw)
        if cluster and len(seen_note_per_cluster[cluster]) < 2 and kw not in seen_note_per_cluster[cluster]:
            seen_note_per_cluster[cluster].add(kw)
            note_scores[cluster] += 4.0

    # 2. Past review signals (w_rev = +1.0)
    for kw in set(past_review_keywords):
        cluster = KEYWORD_TO_CLUSTER.get(kw)
        if cluster:
            review_scores[cluster] += 1.0

    # 3. Post-offer behavioral signals (w_beh = +3.5)
    saving_pct = float(record.get("saving_pct") or 0.0)
    decision_sec = float(record.get("decision_duration_sec") or 0.0)
    elapsed_bid_sec = float(record.get("elapsed_since_bid_sec") or 9999.0)
    was_detail_viewed = bool(record.get("was_detail_viewed", False))
    browse_clicks = int(record.get("browse_click_count") or 0)
    media_clicks = int(record.get("media_clicked_count") or 0)
    scroll_up = int(record.get("scroll_up_count") or 0)
    dwell_ms = float(record.get("description_dwell_ms") or 0.0)
    unmatched_keys = set(record.get("unmatched_keys") or [])
    status = str(record.get("status") or "")

    if status == "accepted" and not was_detail_viewed and saving_pct >= 10.0 and 0 < decision_sec <= 180:
        behavior_scores["C1"] += 3.5
    if unmatched_keys & {"breakfast", "breakfastIncluded", "swimmingPool", "pool", "parkingLot", "parking"}:
        behavior_scores["C2"] += 3.5
    if record.get("content_category") == "dining":
        behavior_scores["C2"] += 3.5
    if elapsed_bid_sec <= 120 and bool(record.get("is_auto_bid", False)):
        behavior_scores["C3"] += 3.5
    if unmatched_keys & {"lateCheckout", "late_checkout"}:
        behavior_scores["C3"] += 3.5
    if media_clicks >= 4 or record.get("content_category") == "videos":
        behavior_scores["C4"] += 3.5
    if record.get("map_action") not in {None, "", "none"} or record.get("content_category") == "nearby_attractions":
        behavior_scores["C4"] += 3.5
    if browse_clicks >= 2 and scroll_up >= 2 and dwell_ms >= 8000:
        behavior_scores["C4"] += 3.5

    # 4. Structured booking form signals (w_form = +2.0)
    lead_time = int(record.get("lead_time_days") or 0)
    nights = int(record.get("nights") or 1)
    adults = int(record.get("adults") or 2)
    children = int(record.get("children") or 0)
    infants = int(record.get("infants") or 0)
    pets = int(record.get("pets") or 0)
    amenities = set(record.get("amenities") or [])
    criteria_count = int(record.get("criteria_count") or 0)

    if lead_time <= 1:
        form_scores["C3"] += 2.0
    if adults == 1 and children == 0 and infants == 0:
        form_scores["C3"] += 2.0
    if not bool(record.get("guest_same_as_booker", True)) or record.get("post_pay_cta") == "download_receipt_pdf":
        form_scores["C3"] += 2.0
    if nights >= 3:
        form_scores["C2"] += 2.0
    if children > 0 or infants > 0 or pets > 0:
        form_scores["C2"] += 2.0
    if amenities & {"breakfast", "pool", "parking", "laundry"}:
        form_scores["C2"] += 2.0
    if criteria_count <= 1:
        form_scores["C1"] += 2.0

    # Guarantee 0% unclassified: baseline +2.0 to C1 if all scores are 0
    total_scores = {
        c: round(behavior_scores[c] + note_scores[c] + form_scores[c] + review_scores[c], 2)
        for c in ("C1", "C2", "C3", "C4")
    }
    if max(total_scores.values()) == 0.0:
        total_scores["C1"] = 2.0

    # Deterministic 3-level tie-breaker: total -> behavior -> note -> fixed C3 > C1 > C2 > C4
    winner = max(
        ("C1", "C2", "C3", "C4"),
        key=lambda c: (
            total_scores[c],
            behavior_scores[c],
            note_scores[c],
            -CLUSTER_TIE_PRIORITY.index(c),
        ),
    )
    return ClusterAssignment(
        cluster=winner,
        cluster_label_vi=CLUSTER_LABELS_VI[winner],
        total_scores=total_scores,
        behavior_scores=behavior_scores,
        note_scores=note_scores,
        matched_note_keywords=tuple(sorted(set(note_keywords))),
    )
