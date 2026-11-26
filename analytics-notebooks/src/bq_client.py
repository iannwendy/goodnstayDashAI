"""BigQuery analytics loader with cost guardrails and local seed fallback.

Connects to `aevo-512307` (`location="US"`) using Application Default Credentials
and enforces `QueryJobConfig.maximum_bytes_billed` + attribution labels on every
query. Falls back transparently to `dashboard/dashboard/master-data/seed/` when
running offline or when `DATA_SOURCE_MODE=seed`.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Sequence

import pandas as pd

from .config import NotebookSettings, load_settings

try:
    from google.cloud import bigquery
except ImportError:  # pragma: no cover - allows unit tests without google-cloud-bigquery
    bigquery = None  # type: ignore[assignment]


@dataclass(frozen=True)
class QueryTelemetry:
    source: str
    table: str
    row_count: int
    duration_ms: float
    total_bytes_processed: int = 0
    total_bytes_billed: int = 0
    cache_hit: bool = False
    job_id: str | None = None
    fallback_reason: str | None = None


class GoodNstayAnalyticsLoader:
    """Cost-guarded BigQuery & seed-JSON loader for goodNstay Jupyter notebooks."""

    def __init__(self, settings: NotebookSettings | None = None, bq_client: Any | None = None) -> None:
        self.settings = settings or load_settings()
        self._bq_client = bq_client

    def _get_bq_client(self) -> Any:
        if self._bq_client is not None:
            return self._bq_client
        if bigquery is None:
            raise RuntimeError("google-cloud-bigquery is not installed in the active Python environment.")
        self._bq_client = bigquery.Client(
            project=self.settings.gcp_project_id,
            location=self.settings.bq_location,
        )
        return self._bq_client

    def _run_bigquery_df(
        self,
        sql: str,
        table_label: str,
        query_parameters: Sequence[Any] = (),
    ) -> tuple[pd.DataFrame, QueryTelemetry]:
        client = self._get_bq_client()
        job_config = bigquery.QueryJobConfig(
            query_parameters=list(query_parameters),
            maximum_bytes_billed=self.settings.bq_max_bytes_billed,
            use_query_cache=True,
            labels={
                "datacloud": "antigravity",
                "workload": "jupyter_analytics",
            },
        )
        started = time.perf_counter()
        job = client.query(sql, job_config=job_config, location=self.settings.bq_location)
        df = job.to_dataframe(create_bqstorage_client=False)
        elapsed_ms = round((time.perf_counter() - started) * 1000.0, 2)
        telemetry = QueryTelemetry(
            source="bigquery_live",
            table=table_label,
            row_count=len(df),
            duration_ms=elapsed_ms,
            total_bytes_processed=int(getattr(job, "total_bytes_processed", 0) or 0),
            total_bytes_billed=int(getattr(job, "total_bytes_billed", 0) or 0),
            cache_hit=bool(getattr(job, "cache_hit", False)),
            job_id=getattr(job, "job_id", None),
        )
        return df, telemetry

    def _read_seed_json(self, filename: str) -> Any:
        path = Path(self.settings.seed_master_data_dir) / filename
        if not path.exists():
            raise FileNotFoundError(f"Seed file not found: {path}")
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)

    def load_bid_telemetry_sample(self) -> pd.DataFrame:
        """Load per-request 4-stage telemetry & multilingual notes from seed JSON."""
        records = self._read_seed_json("bid_records.json")
        rows: list[dict[str, Any]] = []
        for rec in records:
            tel = rec.get("telemetry") or {}
            bf = tel.get("booking_form") or {}
            ol = tel.get("offer_listing") or {}
            es = tel.get("explore_stays") or {}
            pf = tel.get("payment_form") or {}
            guest_note = rec.get("guestNote") or {}
            rows.append(
                {
                    "request_code": rec.get("id"),
                    "branch_id": rec.get("propertyId"),
                    "status": rec.get("status"),
                    "bid_mode": rec.get("bidMode"),
                    "session_date": rec.get("sessionDate"),
                    "nights": int(rec.get("nights") or bf.get("stay_nights") or 1),
                    "lead_time_days": int(bf.get("lead_time_days") or 0),
                    "adults": int(bf.get("adults") or 2),
                    "children": int(bf.get("children") or 0),
                    "infants": int(bf.get("infants") or 0),
                    "pets": int(bf.get("pets") or 0),
                    "total_guests": int(bf.get("total_guests") or rec.get("guestsCount") or 2),
                    "group_type": bf.get("group_type") or "couple",
                    "accommodation_type": bf.get("accommodation_type") or "hotel",
                    "criteria_count": int(bf.get("criteria_count") or 0),
                    "device_os": ol.get("device_os") or bf.get("device_os") or "web",
                    "is_auto_bid": bool(ol.get("is_auto_bid", rec.get("bidMode") == "auto")),
                    "match_rate_pct": float(ol.get("match_rate_pct") or 0.0),
                    "saving_pct": float(ol.get("saving_pct") or 0.0),
                    "was_impressed": bool(ol.get("was_impressed", True)),
                    "was_detail_viewed": bool(ol.get("was_detail_viewed", False)),
                    "browse_click_count": int(ol.get("browse_click_count") or 0),
                    "elapsed_since_bid_sec": float(ol.get("elapsed_since_bid_sec") or 0.0),
                    "decision_duration_sec": float(ol.get("decision_duration_sec") or 0.0),
                    "unmatched_keys": list(ol.get("unmatched_keys") or []),
                    "amenities": list(rec.get("amenities") or []),
                    "content_category": es.get("content_category"),
                    "media_type": es.get("media_type"),
                    "media_clicked_count": int(es.get("media_clicked_count") or 0),
                    "scroll_down_count": int(es.get("scroll_down_count") or 0),
                    "scroll_up_count": int(es.get("scroll_up_count") or 0),
                    "max_scroll_depth_pct": float(es.get("max_scroll_depth_pct") or 0.0),
                    "description_dwell_ms": float(es.get("description_dwell_ms") or 0.0),
                    "total_dwell_ms": float(es.get("total_dwell_ms") or 0.0),
                    "map_action": es.get("map_action"),
                    "review_count": int(es.get("review_count") or 0),
                    "guest_same_as_booker": bool(pf.get("guest_same_as_booker", True)),
                    "post_pay_cta": pf.get("post_pay_cta"),
                    "net_revenue_vnd": float(rec.get("netRevenueVnd") or 0.0),
                    "offered_rate_per_night_vnd": float(rec.get("offeredRatePerNightVnd") or 0.0),
                    "guest_note_vi": guest_note.get("vi") or "",
                    "guest_note_en": guest_note.get("en") or "",
                    "guest_note_ko": guest_note.get("ko") or "",
                    "guest_full_name": rec.get("guestFullName") or "",
                    "guest_phone": rec.get("guestPhone") or "",
                }
            )
        return pd.DataFrame(rows)

    def _build_seed_daily_kpis(
        self,
        start_date: str,
        end_date: str,
        branch_ids: Sequence[str] | None,
        fallback_reason: str | None = None,
    ) -> tuple[pd.DataFrame, QueryTelemetry]:
        started = time.perf_counter()
        raw = self.load_bid_telemetry_sample()
        df = raw[(raw["session_date"] >= start_date) & (raw["session_date"] <= end_date)].copy()
        if branch_ids:
            df = df[df["branch_id"].isin(list(branch_ids))]

        if df.empty:
            empty_cols = [
                "metric_date", "branch_id", "total_bids", "auto_bids_count",
                "accepted_paid_bids", "expired_bids", "rejected_bids", "cancelled_bids",
                "hotel_net_revenue_vnd", "gross_gmv_vnd", "avg_match_rate_pct",
                "avg_saving_pct", "avg_decision_duration_sec", "step1_form_starts",
                "step2_requests_submitted", "step3_offers_impressed", "total_browse_clicks",
                "step4_unique_viewed_offers", "step5_media_engaged_offers",
                "step6_unique_selected_offers", "step7_checkout_opened_offers",
                "step8_paid_completed_offers",
            ]
            out = pd.DataFrame(columns=empty_cols)
        else:
            df["metric_date"] = pd.to_datetime(df["session_date"]).dt.date
            grouped = df.groupby(["metric_date", "branch_id"], as_index=False).agg(
                total_bids=("request_code", "count"),
                auto_bids_count=("is_auto_bid", "sum"),
                accepted_paid_bids=("status", lambda s: int((s == "accepted").sum())),
                expired_bids=("status", lambda s: int((s == "expired").sum())),
                rejected_bids=("status", lambda s: int((s == "rejected").sum())),
                cancelled_bids=("status", lambda s: int((s == "cancelled").sum())),
                hotel_net_revenue_vnd=("net_revenue_vnd", "sum"),
                avg_match_rate_pct=("match_rate_pct", "mean"),
                avg_saving_pct=("saving_pct", "mean"),
                avg_decision_duration_sec=("decision_duration_sec", "mean"),
                step3_offers_impressed=("was_impressed", "sum"),
                total_browse_clicks=("browse_click_count", "sum"),
                step4_unique_viewed_offers=("was_detail_viewed", "sum"),
                step5_media_engaged_offers=("media_clicked_count", lambda s: int((s > 0).sum())),
                step8_paid_completed_offers=("status", lambda s: int((s == "accepted").sum())),
            )
            grouped["gross_gmv_vnd"] = (grouped["hotel_net_revenue_vnd"] * 1.265).round(0)
            grouped["step1_form_starts"] = grouped["total_bids"]
            grouped["step2_requests_submitted"] = grouped["total_bids"]
            grouped["step6_unique_selected_offers"] = grouped["accepted_paid_bids"]
            grouped["step7_checkout_opened_offers"] = grouped["accepted_paid_bids"]
            out = grouped.sort_values(["metric_date", "branch_id"]).reset_index(drop=True)

        telemetry = QueryTelemetry(
            source="local_seed_fallback",
            table="seed/bid_records.json",
            row_count=len(out),
            duration_ms=round((time.perf_counter() - started) * 1000.0, 2),
            fallback_reason=fallback_reason,
        )
        return out, telemetry

    def load_daily_kpis(
        self,
        start_date: str = "2026-10-08",
        end_date: str = "2026-11-06",
        branch_ids: Sequence[str] | None = None,
    ) -> tuple[pd.DataFrame, QueryTelemetry]:
        """Load daily branch KPIs & 8-step funnel from BigQuery Gold Mart (or local seed)."""
        if self.settings.data_source_mode == "seed":
            return self._build_seed_daily_kpis(start_date, end_date, branch_ids, fallback_reason="mode=seed")

        table_fqn = f"{self.settings.gcp_project_id}.gns_analytics_mart.mart_partner_branch_daily"
        branch_filter = "AND branch_id IN UNNEST(@branch_ids)" if branch_ids else ""
        sql = f"""
        SELECT
          metric_date,
          partner_id,
          branch_id,
          total_bids,
          auto_bids_count,
          accepted_paid_bids,
          expired_bids,
          rejected_bids,
          cancelled_bids,
          hotel_net_revenue_vnd,
          platform_fee_vnd,
          vat_amount_vnd,
          gross_gmv_vnd,
          avg_match_rate_pct,
          avg_saving_pct,
          avg_decision_duration_sec,
          step1_form_starts,
          step2_requests_submitted,
          step3_offers_impressed,
          total_browse_clicks,
          step4_unique_viewed_offers,
          step5_media_engaged_offers,
          step6_unique_selected_offers,
          step7_checkout_opened_offers,
          step8_paid_completed_offers,
          avg_description_dwell_ms
        FROM `{table_fqn}`
        WHERE metric_date BETWEEN @start_date AND @end_date
          {branch_filter}
        ORDER BY metric_date ASC, branch_id ASC
        """
        try:
            params: list[Any] = [
                bigquery.ScalarQueryParameter("start_date", "DATE", date.fromisoformat(start_date)),
                bigquery.ScalarQueryParameter("end_date", "DATE", date.fromisoformat(end_date)),
            ]
            if branch_ids:
                params.append(bigquery.ArrayQueryParameter("branch_ids", "STRING", list(branch_ids)))
            return self._run_bigquery_df(sql, table_fqn, query_parameters=params)
        except Exception as exc:
            if self.settings.data_source_mode == "bigquery":
                raise
            return self._build_seed_daily_kpis(
                start_date,
                end_date,
                branch_ids,
                fallback_reason=f"bigquery_unavailable: {type(exc).__name__}",
            )

    def load_ai_advisor_snapshots(
        self,
        branch_ids: Sequence[str] | None = None,
    ) -> tuple[pd.DataFrame, QueryTelemetry]:
        """Load 30-day per-branch AI Advisor snapshots from BigQuery (or local seed)."""
        if self.settings.data_source_mode != "seed":
            table_fqn = f"{self.settings.gcp_project_id}.gns_analytics_mart.mart_branch_ai_advisor_snapshots"
            branch_filter = "WHERE branch_id IN UNNEST(@branch_ids)" if branch_ids else ""
            sql = f"""
            SELECT
              partner_id,
              branch_id,
              total_bids_30d,
              won_bids_30d,
              rejected_bids_30d,
              expired_bids_30d,
              avg_won_saving_pct,
              avg_rejected_saving_pct,
              avg_won_match_pct,
              avg_rejected_match_pct,
              avg_decision_sec,
              top_missing_criteria
            FROM `{table_fqn}`
            {branch_filter}
            ORDER BY branch_id ASC
            """
            try:
                params = (
                    [bigquery.ArrayQueryParameter("branch_ids", "STRING", list(branch_ids))]
                    if branch_ids
                    else []
                )
                return self._run_bigquery_df(sql, table_fqn, query_parameters=params)
            except Exception as exc:
                if self.settings.data_source_mode == "bigquery":
                    raise
                fallback_reason = f"bigquery_unavailable: {type(exc).__name__}"
        else:
            fallback_reason = "mode=seed"

        started = time.perf_counter()
        raw = self.load_bid_telemetry_sample()
        if branch_ids:
            raw = raw[raw["branch_id"].isin(list(branch_ids))]
        rows: list[dict[str, Any]] = []
        for branch_id, grp in raw.groupby("branch_id"):
            won = grp[grp["status"] == "accepted"]
            rej = grp[grp["status"] == "rejected"]
            exp = grp[grp["status"] == "expired"]
            miss_counts: dict[str, int] = {}
            for keys in rej["unmatched_keys"]:
                for key in keys:
                    miss_counts[key] = miss_counts.get(key, 0) + 1
            top_missing = [
                {"unmatched_key": k, "miss_count": v}
                for k, v in sorted(miss_counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
            ]
            rows.append(
                {
                    "partner_id": "HTL-DN-024" if str(branch_id).startswith("br_") else "HTL-KR-011",
                    "branch_id": str(branch_id),
                    "total_bids_30d": int(len(grp)),
                    "won_bids_30d": int(len(won)),
                    "rejected_bids_30d": int(len(rej)),
                    "expired_bids_30d": int(len(exp)),
                    "avg_won_saving_pct": round(float(won["saving_pct"].mean()), 2) if not won.empty else 0.0,
                    "avg_rejected_saving_pct": round(float(rej["saving_pct"].mean()), 2) if not rej.empty else 0.0,
                    "avg_won_match_pct": round(float(won["match_rate_pct"].mean()), 2) if not won.empty else 0.0,
                    "avg_rejected_match_pct": round(float(rej["match_rate_pct"].mean()), 2) if not rej.empty else 0.0,
                    "avg_decision_sec": round(float(grp["decision_duration_sec"].mean()), 1) if not grp.empty else 0.0,
                    "top_missing_criteria": top_missing,
                }
            )
        out = pd.DataFrame(rows).sort_values("branch_id").reset_index(drop=True) if rows else pd.DataFrame()
        telemetry = QueryTelemetry(
            source="local_seed_fallback",
            table="seed/bid_records.json",
            row_count=len(out),
            duration_ms=round((time.perf_counter() - started) * 1000.0, 2),
            fallback_reason=fallback_reason,
        )
        return out, telemetry

    def publish_ai_insights(
        self,
        df_insights: pd.DataFrame,
        run_date: str,
        table_id: str = "gns_analytics_mart.mart_property_ai_insights",
        dry_run: bool = True,
    ) -> dict[str, Any]:
        """Validate and optionally write partitioned AI insights back to BigQuery Gold Mart."""
        required_cols = {
            "metric_date",
            "partner_id",
            "branch_id",
            "primary_bottleneck",
            "cards_json",
            "provider",
            "model_used",
        }
        missing = sorted(required_cols - set(df_insights.columns))
        if missing:
            raise ValueError(f"df_insights missing required columns: {missing}")

        partition_suffix = date.fromisoformat(run_date).strftime("%Y%m%d")
        destination = f"{self.settings.gcp_project_id}.{table_id}${partition_suffix}"

        if dry_run or not self.settings.allow_bq_writeback:
            return {
                "status": "DRY_RUN",
                "destination": destination,
                "rows_prepared": int(len(df_insights)),
                "allow_bq_writeback": self.settings.allow_bq_writeback,
            }

        client = self._get_bq_client()
        load_config = bigquery.LoadJobConfig(
            write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
            time_partitioning=bigquery.TimePartitioning(field="metric_date"),
            clustering_fields=["partner_id", "branch_id"],
            labels={
                "datacloud": "antigravity",
                "workload": "jupyter_ai_publish",
            },
        )
        job = client.load_table_from_dataframe(
            df_insights,
            destination,
            job_config=load_config,
            location=self.settings.bq_location,
        )
        job.result()
        return {
            "status": "PUBLISHED",
            "destination": destination,
            "rows_written": int(len(df_insights)),
            "job_id": getattr(job, "job_id", None),
        }
