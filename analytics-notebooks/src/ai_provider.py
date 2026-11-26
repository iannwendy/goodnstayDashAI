"""Pluggable AI Provider Abstraction for goodNstay Analytics Notebooks.

Designed directly around the CTO's 3-year roadmap:
- Years 1-2: Plug in `OpenAiAdvisorProvider` via `OPENAI_API_KEY` (Structured
  Outputs + Batch API JSONL builder).
- Local dev / temporary placeholder key / Year 3+ API offloading: Swap seamlessly
  to `RuleBasedFallbackProvider` (or a future LightGBM/SHAP/self-hosted model)
  with zero changes to notebook evaluation or BigQuery Gold AI Mart schemas.
"""

from __future__ import annotations

import json
import math
import re
from abc import ABC, abstractmethod
from typing import Any, Literal, Mapping, Sequence

from pydantic import BaseModel, Field

from .config import NotebookSettings, load_settings
from .keyword_rules import extract_tier1_keywords
from .pii_scrubber import scrub_pii


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return default
    return default if math.isnan(parsed) or math.isinf(parsed) else parsed


def _safe_int(value: Any, default: int = 0) -> int:
    return int(round(_safe_float(value, float(default))))


def _normalize_missing_criteria(raw: Any) -> list[Mapping[str, Any]]:
    """Normalize BigQuery ARRAY<STRUCT> (numpy.ndarray or list) into a plain Python list."""
    if raw is None:
        return []
    if hasattr(raw, "tolist"):
        raw = raw.tolist()
    if isinstance(raw, (list, tuple)):
        return [item for item in raw if isinstance(item, Mapping)]
    return []

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None  # type: ignore[assignment]

KeywordEnum = Literal[
    "KW_01", "KW_02", "KW_03", "KW_04",
    "KW_05", "KW_06", "KW_07", "KW_08",
    "KW_09", "KW_10", "KW_11", "KW_12",
    "KW_13", "KW_14", "KW_15", "KW_16",
]

LeverEnum = Literal[
    "pricing_discount_band",
    "auto_bid_speed",
    "multi_room_bundle",
    "amenity_package",
    "media_and_video",
    "first_review_boost",
]

BottleneckEnum = Literal[
    "visibility_speed",
    "price_saving",
    "amenity_gap",
    "media_trust",
    "balanced",
]


class KeywordTagResult(BaseModel):
    matched_keywords: list[KeywordEnum] = Field(default_factory=list)
    candidate_new_phrases: list[str] = Field(default_factory=list)
    provider: str = "fallback_rules"


class ActionCard(BaseModel):
    lever: LeverEnum
    headline_vi: str = Field(min_length=8, max_length=120)
    why_won_or_lost_vi: str = Field(min_length=12, max_length=320)
    recommended_action_vi: str = Field(min_length=12, max_length=260)


class BranchAiDiagnosis(BaseModel):
    branch_id: str
    primary_bottleneck: BottleneckEnum
    cards: list[ActionCard] = Field(min_length=3, max_length=3)
    provider: str = "fallback_rules"
    model_used: str = "deterministic-threshold-v1"


_FORBIDDEN_SNAKE_RE = re.compile(r"\b[a-z]{2,}_[a-z0-9_]{2,}\b")
_FORBIDDEN_SQL_RE = re.compile(r"\b(?:SELECT|FROM|WHERE|SUM|COUNT|DISTINCT|AVG|GROUP BY)\b")
_FORBIDDEN_PLACEHOLDER_RE = re.compile(r"\[[A-Za-z0-9_]+\]%")


def validate_business_prose(diagnosis: BranchAiDiagnosis) -> list[str]:
    """Audit AI cards against AGENTS.md Section 8 (zero snake_case, SQL, or [X]% leaks)."""
    violations: list[str] = []
    for idx, card in enumerate(diagnosis.cards, start=1):
        for field_name in ("headline_vi", "why_won_or_lost_vi", "recommended_action_vi"):
            text = getattr(card, field_name)
            if _FORBIDDEN_SNAKE_RE.search(text):
                violations.append(f"Card {idx}.{field_name} leaked snake_case token: {text}")
            if _FORBIDDEN_SQL_RE.search(text):
                violations.append(f"Card {idx}.{field_name} leaked SQL token: {text}")
            if _FORBIDDEN_PLACEHOLDER_RE.search(text):
                violations.append(f"Card {idx}.{field_name} leaked placeholder token: {text}")
    return violations


class AiAdvisorProvider(ABC):
    """Common interface so OpenAI API can be swapped for in-house ML/models later."""

    provider_name: str
    model_used: str

    @abstractmethod
    def tag_freetext(self, raw_text: str, known_names: Sequence[str] | None = None) -> KeywordTagResult:
        """Classify PII-scrubbed traveler text into canonical KW_01..KW_16 tags."""

    @abstractmethod
    def diagnose_branch(self, snapshot: Mapping[str, Any]) -> BranchAiDiagnosis:
        """Generate 3 hotel-actionable diagnostic cards (Why Won vs Why Lost)."""


class RuleBasedFallbackProvider(AiAdvisorProvider):
    """Zero-API deterministic provider used with temporary OPENAI_API_KEY or API offload mode."""

    provider_name = "fallback_rules"
    model_used = "deterministic-threshold-v1"

    def tag_freetext(self, raw_text: str, known_names: Sequence[str] | None = None) -> KeywordTagResult:
        t1 = extract_tier1_keywords(raw_text, known_names=known_names)
        return KeywordTagResult(
            matched_keywords=list(t1.matched_keywords),  # type: ignore[arg-type]
            candidate_new_phrases=[],
            provider=self.provider_name,
        )

    def diagnose_branch(self, snapshot: Mapping[str, Any]) -> BranchAiDiagnosis:
        branch_id = str(snapshot.get("branch_id") or "unknown")
        total = max(_safe_int(snapshot.get("total_bids_30d"), 0), 1)
        won = _safe_int(snapshot.get("won_bids_30d"), 0)
        rejected = _safe_int(snapshot.get("rejected_bids_30d"), 0)
        expired = _safe_int(snapshot.get("expired_bids_30d"), 0)
        won_saving = _safe_float(snapshot.get("avg_won_saving_pct"), 0.0)
        rej_saving = _safe_float(snapshot.get("avg_rejected_saving_pct"), 0.0)
        won_match = _safe_float(snapshot.get("avg_won_match_pct"), 0.0)
        rej_match = _safe_float(snapshot.get("avg_rejected_match_pct"), 0.0)
        decision_sec = _safe_float(snapshot.get("avg_decision_sec"), 0.0)

        win_rate = round((won / total) * 100.0, 1)
        expired_rate = round((expired / total) * 100.0, 1)
        saving_gap = round(won_saving - rej_saving, 1)

        missing_items = _normalize_missing_criteria(snapshot.get("top_missing_criteria"))
        top_missing_label = "tiện ích bổ sung"
        if missing_items:
            raw_key = str(missing_items[0].get("unmatched_key") or "")
            label_map = {
                "breakfast": "bữa sáng",
                "breakfastIncluded": "bữa sáng",
                "swimmingPool": "hồ bơi",
                "pool": "hồ bơi",
                "parkingLot": "bãi đậu xe",
                "parking": "bãi đậu xe",
                "lateCheckout": "trả phòng trễ",
                "petAllow": "chính sách thú cưng",
            }
            top_missing_label = label_map.get(raw_key, "tiện ích khách tích chọn")

        if expired_rate >= 30.0:
            bottleneck: BottleneckEnum = "visibility_speed"
        elif saving_gap >= 3.0 or (rej_saving < 10.0 and rejected > won):
            bottleneck = "price_saving"
        elif rej_match < 80.0 and missing_items:
            bottleneck = "amenity_gap"
        elif win_rate < 30.0:
            bottleneck = "media_trust"
        else:
            bottleneck = "balanced"

        cards = [
            ActionCard(
                lever="pricing_discount_band",
                headline_vi="Tối ưu biên tiết kiệm so với sàn đặt phòng khác",
                why_won_or_lost_vi=(
                    f"Trong kỳ 30 ngày, cơ sở lưu trú đạt tỷ lệ trúng thầu {win_rate}% "
                    f"({won}/{total} báo giá). Các đơn thắng có mức tiết kiệm trung bình {won_saving:.1f}% "
                    f"so với {rej_saving:.1f}% ở nhóm bị từ chối."
                ),
                recommended_action_vi=(
                    "Thiết lập vùng giá ưu đãi chủ lực quanh mức tiết kiệm 10%–15% so với giá công khai "
                    "để giữ tỷ lệ chốt tốt mà không làm mỏng biên lợi nhuận."
                ),
            ),
            ActionCard(
                lever="auto_bid_speed" if expired_rate >= 15.0 else "amenity_package",
                headline_vi=(
                    "Rút ngắn thời gian phản hồi báo giá tự động"
                    if expired_rate >= 15.0
                    else "Đóng gói thêm tiện ích khách thường tìm"
                ),
                why_won_or_lost_vi=(
                    f"Tỷ lệ báo giá hết hạn đang ở mức {expired_rate}% ({expired} báo giá) "
                    f"với thời gian khách cân nhắc trung bình khoảng {int(decision_sec)} giây."
                    if expired_rate >= 15.0
                    else f"Độ khớp tiêu chí nhóm bị từ chối đạt {rej_match:.1f}% (thấp hơn mức {won_match:.1f}% của nhóm thắng), "
                    f"tập trung thiếu nhóm {top_missing_label}."
                ),
                recommended_action_vi=(
                    "Bật chế độ báo giá tự động 24/7 cho các khung giờ đặt sát ngày để lọt nhóm hiển thị đầu tiên."
                    if expired_rate >= 15.0
                    else f"Cập nhật gói chào kèm {top_missing_label} hoặc tách hạng phòng linh hoạt để tăng độ khớp yêu cầu."
                ),
            ),
            ActionCard(
                lever="media_and_video" if win_rate < 30.0 else "multi_room_bundle",
                headline_vi=(
                    "Bổ sung ảnh thực tế và video hạng phòng"
                    if win_rate < 30.0
                    else "Mở rộng chào đa hạng phòng trên cùng thẻ báo giá"
                ),
                why_won_or_lost_vi=(
                    f"Khi tỷ lệ thắng dưới ngưỡng 30% ({win_rate}%), khách thường dừng lại thẩm định niềm tin "
                    "về hình ảnh phòng, vị trí và đánh giá trước khi bấm Chọn."
                    if win_rate < 30.0
                    else f"Cơ sở lưu trú đang giữ nhịp trúng thầu ổn định ({win_rate}%) và có thể khai thác thêm "
                    "nhu cầu nâng hạng phòng từ nhóm khách gia đình hoặc nghỉ dưỡng."
                ),
                recommended_action_vi=(
                    "Bổ sung tối thiểu 1 video thực tế và ảnh sắc nét cho từng hạng phòng chủ lực để giảm thoát xem chi tiết."
                    if win_rate < 30.0
                    else "Cấu hình chào song song 2–3 hạng phòng có chênh lệch giá hợp lý để tăng giá trị trung bình mỗi đơn."
                ),
            ),
        ]

        return BranchAiDiagnosis(
            branch_id=branch_id,
            primary_bottleneck=bottleneck,
            cards=cards,
            provider=self.provider_name,
            model_used=self.model_used,
        )


class OpenAiAdvisorProvider(AiAdvisorProvider):
    """Live OpenAI API provider using Pydantic Structured Outputs (Years 1-2 bootstrap)."""

    provider_name = "openai_api"

    def __init__(self, api_key: str, model: str = "gpt-4o-mini", client: Any | None = None) -> None:
        if client is None:
            if OpenAI is None:
                raise RuntimeError("openai package is not installed in the active Python environment.")
            self._client = OpenAI(api_key=api_key)
        else:
            self._client = client
        self.model_used = model

    def tag_freetext(self, raw_text: str, known_names: Sequence[str] | None = None) -> KeywordTagResult:
        scrubbed = scrub_pii(raw_text, known_names=known_names)
        if not scrubbed.cleaned_text:
            return KeywordTagResult(matched_keywords=[], candidate_new_phrases=[], provider=self.provider_name)

        response = self._client.responses.parse(
            model=self.model_used,
            input=[
                {
                    "role": "system",
                    "content": (
                        "You classify anonymized hotel request notes (VI/EN/KO) strictly into canonical codes "
                        "KW_01..KW_16. Respect negation (e.g. 'không cần bữa sáng' must NOT map to KW_06). "
                        "Never output codes outside KW_01..KW_16."
                    ),
                },
                {"role": "user", "content": scrubbed.cleaned_text},
            ],
            text_format=KeywordTagResult,
        )
        parsed: KeywordTagResult = response.output_parsed
        return parsed.model_copy(update={"provider": self.provider_name})

    def diagnose_branch(self, snapshot: Mapping[str, Any]) -> BranchAiDiagnosis:
        safe_payload = {
            "branch_id": str(snapshot.get("branch_id") or "unknown"),
            "total_bids_30d": _safe_int(snapshot.get("total_bids_30d"), 0),
            "won_bids_30d": _safe_int(snapshot.get("won_bids_30d"), 0),
            "rejected_bids_30d": _safe_int(snapshot.get("rejected_bids_30d"), 0),
            "expired_bids_30d": _safe_int(snapshot.get("expired_bids_30d"), 0),
            "avg_won_saving_pct": _safe_float(snapshot.get("avg_won_saving_pct"), 0.0),
            "avg_rejected_saving_pct": _safe_float(snapshot.get("avg_rejected_saving_pct"), 0.0),
            "avg_won_match_pct": _safe_float(snapshot.get("avg_won_match_pct"), 0.0),
            "avg_rejected_match_pct": _safe_float(snapshot.get("avg_rejected_match_pct"), 0.0),
            "avg_decision_sec": _safe_float(snapshot.get("avg_decision_sec"), 0.0),
        }
        response = self._client.responses.parse(
            model=self.model_used,
            input=[
                {
                    "role": "system",
                    "content": (
                        "Bạn là cố vấn vận hành khách sạn của goodNstay. Dựa ĐÚNG số liệu tổng hợp, "
                        "tạo đúng 3 thẻ chẩn đoán (Tại sao trúng thầu vs. Tại sao không trúng thầu) bằng "
                        "tiếng Việt kinh doanh tự nhiên. Tuyệt đối KHÔNG dùng biến kỹ thuật snake_case, "
                        "KHÔNG dùng câu lệnh SQL, KHÔNG bịa số liệu, và chỉ khuyên hành động khách sạn tự kiểm soát được."
                    ),
                },
                {"role": "user", "content": json.dumps(safe_payload, ensure_ascii=False)},
            ],
            text_format=BranchAiDiagnosis,
        )
        parsed: BranchAiDiagnosis = response.output_parsed
        return parsed.model_copy(
            update={
                "branch_id": safe_payload["branch_id"],
                "provider": self.provider_name,
                "model_used": self.model_used,
            }
        )


def build_batch_jsonl_lines(
    items: Sequence[Mapping[str, str]],
    model: str = "gpt-4o-mini",
) -> list[str]:
    """Build PII-scrubbed JSONL request lines for OpenAI Batch API (/v1/batches, 50% discount)."""
    lines: list[str] = []
    for item in items:
        custom_id = str(item["custom_id"])
        scrubbed = scrub_pii(item.get("text", ""))
        if not scrubbed.cleaned_text:
            continue
        payload = {
            "custom_id": custom_id,
            "method": "POST",
            "url": "/v1/responses",
            "body": {
                "model": model,
                "input": [
                    {
                        "role": "system",
                        "content": "Classify anonymized hotel notes into KW_01..KW_16 JSON.",
                    },
                    {"role": "user", "content": scrubbed.cleaned_text},
                ],
            },
        }
        lines.append(json.dumps(payload, ensure_ascii=False))
    return lines


def create_ai_provider(settings: NotebookSettings | None = None) -> AiAdvisorProvider:
    """Factory that switches cleanly between temporary fallback mode and live OpenAI API."""
    cfg = settings or load_settings()
    if cfg.ai_provider_mode == "fallback":
        return RuleBasedFallbackProvider()
    if cfg.ai_provider_mode == "openai":
        if not cfg.has_live_openai_key:
            raise ValueError(
                "AI_PROVIDER_MODE=openai requires a real OPENAI_API_KEY in analytics-notebooks/.env "
                "(currently using temporary placeholder)."
            )
        return OpenAiAdvisorProvider(api_key=cfg.openai_api_key, model=cfg.openai_model)
    # mode == "auto": use OpenAI only when a real key is configured, otherwise deterministic fallback
    if cfg.has_live_openai_key:
        return OpenAiAdvisorProvider(api_key=cfg.openai_api_key, model=cfg.openai_model)
    return RuleBasedFallbackProvider()
