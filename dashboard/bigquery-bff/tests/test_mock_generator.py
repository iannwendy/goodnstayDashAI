import json
import unittest
from pathlib import Path
import sys

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from generate_bigquery_mock_data import OUT_DIR, generate_all  # noqa: E402


class TestBigQueryMockGenerator(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.summary = generate_all()

    def test_exact_30_daily_ga4_shards_and_ga4_limits(self) -> None:
        self.assertEqual(self.summary["counts"]["ga4_daily_shards"], 30)
        self.assertGreater(self.summary["counts"]["ga4_total_daily_events"], 1000)

        ga4_files = sorted((OUT_DIR / "ga4").glob("events_*.jsonl"))
        self.assertEqual(len(ga4_files), 30)

        for gf in ga4_files:
            for line in gf.read_text(encoding="utf-8").splitlines():
                ev = json.loads(line)
                self.assertLessEqual(len(ev["event_name"]), 40)
                self.assertLessEqual(len(ev["event_params"]), 25)
                self.assertTrue(ev["user_id"].startswith("TRV-"))
                for param in ev["event_params"]:
                    self.assertLessEqual(len(param["key"]), 40)
                    sv = param["value"]["string_value"]
                    if sv is not None:
                        self.assertLessEqual(len(sv), 100)

    def test_financial_invariant_matches_live_bigquery_delta(self) -> None:
        rec = self.summary["reconciliation"]
        # BigQuery live wave adds +18 bids / +11 paid bookings (+45.6M VND total across 4 branches)
        # on top of Local JSON seed (66.36M VND) so Local JSON <-> BigQuery switching is visually unmistakable.
        self.assertEqual(rec["portfolio_accepted_bookings"], 40)
        self.assertEqual(rec["portfolio_net_revenue_vnd"], 111_960_000)
        self.assertEqual(rec["portfolio_platform_fee_vnd"], 16_794_000)
        self.assertEqual(rec["portfolio_vat_amount_vnd"], 12_875_400)
        self.assertEqual(rec["portfolio_gross_gmv_vnd"], 141_629_400)

        self.assertEqual(rec["lamour_accepted_bookings"], 38)
        self.assertEqual(rec["lamour_net_revenue_vnd"], 104_360_000)
        self.assertEqual(rec["lamour_platform_fee_vnd"], 15_654_000)
        self.assertEqual(rec["lamour_vat_amount_vnd"], 12_001_400)
        self.assertEqual(rec["lamour_gross_gmv_vnd"], 132_015_400)

        self.assertEqual(rec["stay_h11_total_bids"], 78)
        self.assertEqual(rec["stay_h11_accepted_bookings"], 2)
        self.assertEqual(rec["stay_h11_net_revenue_vnd"], 7_600_000)

    def test_five_rbac_profiles_and_zero_pii(self) -> None:
        self.assertEqual(self.summary["counts"]["rbac_profiles"], 5)
        rbac_text = (OUT_DIR / "oltp" / "partner_user_branch_access.jsonl").read_text(encoding="utf-8")
        rbac_rows = [json.loads(line) for line in rbac_text.splitlines()]
        by_id = {r["user_id"]: r for r in rbac_rows}

        self.assertTrue(by_id["USR-PARTNER-01"]["can_view_financials"])
        self.assertEqual(by_id["USR-MGR-MYKHE"]["allowed_branch_ids"], ["br_mykhe"])
        self.assertEqual(by_id["USR-MGR-SONGHAN"]["allowed_branch_ids"], ["br_songhan"])
        self.assertEqual(by_id["USR-MGR-H11"]["allowed_branch_ids"], ["stay_h11"])
        self.assertFalse(by_id["USR-STAFF-02"]["can_view_financials"])
        self.assertFalse(by_id["USR-STAFF-02"]["can_manage_pricing"])

        # Ensure zero traveler phone numbers leaked into OLTP or GA4 warehouse JSONLs
        oltp_bids_raw = (OUT_DIR / "oltp" / "bid_offers_and_orders.jsonl").read_text(encoding="utf-8")
        self.assertNotIn("+84", oltp_bids_raw)
        self.assertNotIn("Minh Anh", oltp_bids_raw)


if __name__ == "__main__":
    unittest.main()
