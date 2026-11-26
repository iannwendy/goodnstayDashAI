"""Mandatory Step-0 PII scrubbing and multilingual text normalization.

Enforces `2026-11-20-traveler-keyword-clustering-design.md` Step 0:
all traveler free-text (`notes`, `review`) must have phones, emails, national
IDs / card numbers, URLs, and known guest names scrubbed BEFORE leaving local /
BigQuery boundaries for any LLM API.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Iterable

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
# Matches Vietnamese/Korean/international phones like +84 905 412 819, 0905-412-819, 010-1234-5678
_PHONE_RE = re.compile(r"(?<!\w)(?:\+?\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?){2,4}\d{2,4}(?!\w)")
# Matches long digit sequences (CCCD 12 digits, passport digits, 13-16 digit card numbers)
_LONG_ID_RE = re.compile(r"(?<!\d)\d{9,16}(?!\d)")
# Matches labeled passport/CCCD codes such as "CCCD: 079201001234" or "Passport B1234567"
_PASSPORT_RE = re.compile(r"\b(?:passport|hộ\s*chiếu|ho\s*chieu|cccd|cmnd)\s*[:#\-]?\s*[A-Z0-9]{6,14}\b", re.IGNORECASE)


@dataclass(frozen=True)
class ScrubResult:
    cleaned_text: str
    redacted_counts: dict[str, int]

    @property
    def had_pii(self) -> bool:
        return sum(self.redacted_counts.values()) > 0


def normalize_text(text: str) -> str:
    """Normalize Unicode NFC and collapse excess whitespace."""
    nfc = unicodedata.normalize("NFC", text or "")
    return re.sub(r"\s+", " ", nfc).strip()


def strip_vietnamese_diacritics(text: str) -> str:
    """Return lowercase diacritic-folded text while preserving composed Hangul syllables."""
    normalized = unicodedata.normalize("NFKD", text or "")
    without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    recomposed = unicodedata.normalize("NFC", without_marks)
    folded = recomposed.replace("đ", "d").replace("Đ", "D")
    return re.sub(r"\s+", " ", folded).strip().lower()


def _replace_with_count(pattern: re.Pattern[str], replacement: str, text: str) -> tuple[str, int]:
    matches = 0

    def _sub(_match: re.Match[str]) -> str:
        nonlocal matches
        matches += 1
        return replacement

    return pattern.sub(_sub, text), matches


def scrub_pii(text: str | None, known_names: Iterable[str] | None = None) -> ScrubResult:
    """Scrub PII tokens from traveler free-text prior to keyword extraction or OpenAI calls."""
    cleaned = normalize_text(text or "")
    counts: dict[str, int] = {
        "email": 0,
        "url": 0,
        "passport_or_id": 0,
        "phone": 0,
        "guest_name": 0,
    }
    if not cleaned:
        return ScrubResult(cleaned_text="", redacted_counts=counts)

    cleaned, counts["email"] = _replace_with_count(_EMAIL_RE, "[EMAIL]", cleaned)
    cleaned, counts["url"] = _replace_with_count(_URL_RE, "[URL]", cleaned)
    cleaned, n_passport = _replace_with_count(_PASSPORT_RE, "[ID_NUMBER]", cleaned)
    cleaned, n_long_id = _replace_with_count(_LONG_ID_RE, "[ID_NUMBER]", cleaned)
    counts["passport_or_id"] = n_passport + n_long_id

    # Guard against redacting short dates like 2026-11-06 by requiring >= 8 digits total in a phone match
    phone_hits = 0

    def _phone_sub(match: re.Match[str]) -> str:
        nonlocal phone_hits
        raw = match.group(0)
        digits_only = re.sub(r"\D", "", raw)
        # Skip ISO dates (YYYY-MM-DD) or short numeric ranges
        if re.fullmatch(r"\d{4}[-/.]\d{2}[-/.]\d{2}", raw):
            return raw
        if len(digits_only) < 8 or len(digits_only) > 15:
            return raw
        phone_hits += 1
        return "[PHONE]"

    cleaned = _PHONE_RE.sub(_phone_sub, cleaned)
    counts["phone"] = phone_hits

    if known_names:
        name_hits = 0
        for raw_name in known_names:
            name = normalize_text(raw_name)
            if len(name) < 3:
                continue
            pattern = re.compile(rf"(?<!\w){re.escape(name)}(?!\w)", re.IGNORECASE)
            cleaned, hit = _replace_with_count(pattern, "[GUEST_NAME]", cleaned)
            name_hits += hit
        counts["guest_name"] = name_hits

    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return ScrubResult(cleaned_text=cleaned, redacted_counts=counts)
