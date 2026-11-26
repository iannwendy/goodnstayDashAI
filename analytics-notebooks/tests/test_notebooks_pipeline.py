"""Unit tests covering config, PII scrubber, BigQuery fallback, keyword rules, and AI provider."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

NOTEBOOKS_ROOT = Path(__file__).resolve().parents[1]
if str(NOTEBOOKS_ROOT) not in sys.path:
    sys.path.insert(0, str(NOTEBOOKS_ROOT))

from src.ai_provider import (  # noqa: E402
    OpenAiAdvisorProvider,
    RuleBasedFallbackProvider,
    build_batch_jsonl_lines,
    create_ai_provider,
    validate_business_prose,
)
from src.bq_client import GoodNstayAnalyticsLoader  # noqa: E402
from src.config import (  # noqa: E402
    HARD_CAP_BYTES_BILLED,
    is_placeholder_openai_key,
    load_settings,
)
from src.keyword_rules import extract_tier1_keywords, score_and_assign_cluster  # noqa: E402
from src.pii_scrubber import scrub_pii, strip_vietnamese_diacritics  # noqa: E402


class TestConfig(unittest.TestCase):
    def test_detects_temporary_openai_placeholder_keys(self) -> None:
        self.assertTrue(is_placeholder_openai_key(""))
        self.assertTrue(is_placeholder_openai_key("sk-temp-placeholder-replace-me"))
        self.assertTrue(is_placeholder_openai_key("sk-short"))
        self.assertFalse(is_placeholder_openai_key("sk-proj-1234567890abcdefghij123456"))

    def test_clamps_bigquery_cost_cap_and_masks_keys(self) -> None:
        settings = load_settings(
            environ={
                "GCP_PROJECT_ID": "aevo-512307",
                "BQ_LOCATION": "US",
                "BQ_MAX_BYTES_BILLED": str(999 * 1024 * 1024),
                "OPENAI_API_KEY": "sk-temp-placeholder-replace-me",
            }
        )
        self.assertEqual(settings.bq_max_bytes_billed, HARD_CAP_BYTES_BILLED)
        self.assertFalse(settings.has_live_openai_key)
        self.assertEqual(settings.masked_openai_key(), "<TEMP_PLACEHOLDER>")

        live_settings = load_settings(
            environ={"OPENAI_API_KEY": "sk-proj-1234567890abcdefghij9876"}
        )
        self.assertTrue(live_settings.has_live_openai_key)
        self.assertEqual(live_settings.masked_openai_key(), "sk-...9876")
        self.assertNotIn("abcdefghij", live_settings.masked_openai_key())


class TestPiiScrubber(unittest.TestCase):
    def test_scrubs_phone_email_id_url_and_guest_name_but_keeps_dates(self) -> None:
        raw = (
            "Minh Anh đặt phòng ngày 2026-11-06, gọi +84 905 412 819 hoặc "
            "minh.anh@example.com, CCCD: 079201001234, link https://evil.test/x"
        )
        res = scrub_pii(raw, known_names=["Minh Anh"])
        self.assertTrue(res.had_pii)
        self.assertIn("2026-11-06", res.cleaned_text)
        self.assertNotIn("Minh Anh", res.cleaned_text)
        self.assertNotIn("905 412 819", res.cleaned_text)
        self.assertNotIn("minh.anh@example.com", res.cleaned_text)
        self.assertNotIn("079201001234", res.cleaned_text)
        self.assertNotIn("https://evil.test/x", res.cleaned_text)
        self.assertEqual(res.redacted_counts["email"], 1)
        self.assertEqual(res.redacted_counts["phone"], 1)
        self.assertEqual(res.redacted_counts["guest_name"], 1)

    def test_vietnamese_diacritic_folding(self) -> None:
        self.assertEqual(strip_vietnamese_diacritics("Đà Nẵng — Bữa sáng miễn phí"), "da nang — bua sang mien phi")


class TestKeywordRulesAndClustering(unittest.TestCase):
    def test_multilingual_extraction_and_negation_guard(self) -> None:
        res_neg = extract_tier1_keywords("Không cần bữa sáng, nhưng cần phòng không mùi thuốc lá gần biển")
        self.assertNotIn("KW_06", res_neg.matched_keywords)
        self.assertIn("KW_13", res_neg.matched_keywords)
        self.assertIn("KW_15", res_neg.matched_keywords)
        self.assertTrue(res_neg.needs_tier2_llm)  # contains contrast marker "nhưng"

        res_ko = extract_tier1_keywords("아이와 가족여행 조식포함 오션뷰 원해요")
        self.assertIn("KW_05", res_ko.matched_keywords)
        self.assertIn("KW_06", res_ko.matched_keywords)
        self.assertIn("KW_14", res_ko.matched_keywords)

    def test_phase1_scoring_and_deterministic_tie_breaker(self) -> None:
        # Family trip beats past business review
        assigned = score_and_assign_cluster(
            record={"lead_time_days": 5, "nights": 3, "adults": 2, "children": 1, "amenities": ["breakfast"]},
            note_keywords=["KW_05"],
            past_review_keywords=["KW_12"],
        )
        self.assertEqual(assigned.cluster, "C2")
        self.assertGreater(assigned.total_scores["C2"], assigned.total_scores["C3"])

        # Baseline minimal booking never unclassified -> C1
        minimal = score_and_assign_cluster(record={"lead_time_days": 5, "nights": 1, "adults": 2, "criteria_count": 2})
        self.assertEqual(minimal.cluster, "C1")
        self.assertGreaterEqual(minimal.total_scores["C1"], 2.0)


class TestBigQueryLoaderSeedFallback(unittest.TestCase):
    def test_seed_mode_loads_kpis_and_snapshots_with_dry_run_publish(self) -> None:
        settings = load_settings(environ={"DATA_SOURCE_MODE": "seed"})
        loader = GoodNstayAnalyticsLoader(settings=settings)

        daily_df, daily_meta = loader.load_daily_kpis(start_date="2026-10-08", end_date="2026-11-06")
        self.assertEqual(daily_meta.source, "local_seed_fallback")
        self.assertGreater(len(daily_df), 0)
        self.assertIn("hotel_net_revenue_vnd", daily_df.columns)

        snap_df, snap_meta = loader.load_ai_advisor_snapshots()
        self.assertEqual(snap_meta.source, "local_seed_fallback")
        self.assertGreaterEqual(len(snap_df), 1)
        self.assertIn("br_mykhe", set(snap_df["branch_id"]))


class TestAiProviderAbstraction(unittest.TestCase):
    def test_auto_mode_uses_fallback_when_openai_key_is_temporary(self) -> None:
        settings = load_settings(
            environ={
                "OPENAI_API_KEY": "sk-temp-placeholder-replace-me",
                "AI_PROVIDER_MODE": "auto",
            }
        )
        provider = create_ai_provider(settings)
        self.assertIsInstance(provider, RuleBasedFallbackProvider)

        diagnosis = provider.diagnose_branch(
            {
                "branch_id": "br_mykhe",
                "total_bids_30d": 91,
                "won_bids_30d": 17,
                "rejected_bids_30d": 65,
                "expired_bids_30d": 9,
                "avg_won_saving_pct": 13.4,
                "avg_rejected_saving_pct": 7.2,
                "avg_won_match_pct": 91.0,
                "avg_rejected_match_pct": 74.0,
                "avg_decision_sec": 190.0,
                "top_missing_criteria": [{"unmatched_key": "breakfast", "miss_count": 14}],
            }
        )
        self.assertEqual(len(diagnosis.cards), 3)
        self.assertEqual(validate_business_prose(diagnosis), [])

    def test_handles_bigquery_numpy_array_and_nan_values(self) -> None:
        import numpy as np

        provider = RuleBasedFallbackProvider()
        diagnosis = provider.diagnose_branch(
            {
                "branch_id": "stay_h11",
                "total_bids_30d": 12,
                "won_bids_30d": 0,
                "rejected_bids_30d": 10,
                "expired_bids_30d": 2,
                "avg_won_saving_pct": float("nan"),
                "avg_rejected_saving_pct": 6.5,
                "avg_won_match_pct": None,
                "avg_rejected_match_pct": 72.0,
                "avg_decision_sec": float("nan"),
                "top_missing_criteria": np.array(
                    [
                        {"unmatched_key": "swimmingPool", "miss_count": 5},
                        {"unmatched_key": "breakfast", "miss_count": 3},
                    ],
                    dtype=object,
                ),
            }
        )
        self.assertEqual(diagnosis.branch_id, "stay_h11")
        self.assertEqual(len(diagnosis.cards), 3)
        self.assertEqual(validate_business_prose(diagnosis), [])

    def test_strict_openai_mode_rejects_placeholder_and_batch_jsonl_scrubs_pii(self) -> None:
        settings = load_settings(
            environ={
                "OPENAI_API_KEY": "sk-temp-placeholder-replace-me",
                "AI_PROVIDER_MODE": "openai",
            }
        )
        with self.assertRaises(ValueError):
            create_ai_provider(settings)

        live_settings = load_settings(
            environ={
                "OPENAI_API_KEY": "sk-proj-1234567890abcdefghij9876",
                "AI_PROVIDER_MODE": "auto",
            }
        )
        provider = create_ai_provider(live_settings)
        self.assertIsInstance(provider, OpenAiAdvisorProvider)

        lines = build_batch_jsonl_lines(
            [{"custom_id": "req-1", "text": "Gọi +84 905 412 819 để nhận nôi em bé"}]
        )
        self.assertEqual(len(lines), 1)
        decoded = json.loads(lines[0])
        self.assertEqual(decoded["custom_id"], "req-1")
        self.assertNotIn("905 412 819", decoded["body"]["input"][1]["content"])
        self.assertIn("[PHONE]", decoded["body"]["input"][1]["content"])


if __name__ == "__main__":
    unittest.main()
