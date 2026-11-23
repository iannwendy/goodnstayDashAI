#!/usr/bin/env python3
"""
Batch-loads all generated GA4 daily/intraday shards and OLTP/RBAC tables into
Google Cloud BigQuery (project: aevo-512307, location: asia-southeast1) using
parallel `bq load` jobs with mandatory `datacloud:antigravity` attribution labels.
"""

from __future__ import annotations

import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

BFF_ROOT = Path(__file__).resolve().parents[1]
WAREHOUSE_DIR = BFF_ROOT / ".generated_warehouse"
SCHEMAS_DIR = BFF_ROOT / "schemas"

PROJECT_ID = "aevo-512307"
LOCATION = "US"


def run_bq_load(target_table: str, source_jsonl: Path, schema_json: Path, extra_flags: list[str] | None = None) -> str:
    cmd = [
        "bq",
        f"--project_id={PROJECT_ID}",
        f"--location={LOCATION}",
        "load",
        "--replace",
        "--label",
        "datacloud:antigravity",
        "--source_format=NEWLINE_DELIMITED_JSON",
    ]
    if extra_flags:
        cmd.extend(extra_flags)
    cmd.extend([target_table, str(source_jsonl), str(schema_json)])

    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            f"Failed loading {target_table}:\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}"
        )
    return target_table


def main() -> None:
    jobs: list[tuple[str, Path, Path, list[str]]] = []

    # 1. OLTP & RBAC tables
    jobs.append((
        "gns_sim_oltp.partner_user_branch_access",
        WAREHOUSE_DIR / "oltp" / "partner_user_branch_access.jsonl",
        SCHEMAS_DIR / "oltp_partner_user_branch_access.json",
        ["--clustering_fields=partner_id,role_key"],
    ))
    jobs.append((
        "gns_sim_oltp.partner_branches",
        WAREHOUSE_DIR / "oltp" / "partner_branches.jsonl",
        SCHEMAS_DIR / "oltp_partner_branches.json",
        ["--clustering_fields=partner_id,branch_id"],
    ))
    jobs.append((
        "gns_sim_oltp.bid_offers_and_orders",
        WAREHOUSE_DIR / "oltp" / "bid_offers_and_orders.jsonl",
        SCHEMAS_DIR / "oltp_bid_offers_and_orders.json",
        [
            "--time_partitioning_field=session_date",
            "--time_partitioning_type=DAY",
            "--clustering_fields=partner_id,branch_id,status",
        ],
    ))
    jobs.append((
        "gns_sim_oltp.payout_batches",
        WAREHOUSE_DIR / "oltp" / "payout_batches.jsonl",
        SCHEMAS_DIR / "oltp_payout_batches.json",
        ["--clustering_fields=partner_id,branch_id"],
    ))

    # 2. GA4 30 daily shards + 1 intraday shard
    ga4_schema = SCHEMAS_DIR / "ga4_events_schema.json"
    for shard_file in sorted((WAREHOUSE_DIR / "ga4").glob("events_*.jsonl")):
        table_name = shard_file.stem
        jobs.append((f"gns_sim_ga4.{table_name}", shard_file, ga4_schema, []))

    intraday_file = WAREHOUSE_DIR / "ga4_intraday" / "events_intraday_20261106.jsonl"
    if intraday_file.exists():
        jobs.append(("gns_sim_ga4.events_intraday_20261106", intraday_file, ga4_schema, []))

    print(f"Uploading {len(jobs)} BigQuery tables to {PROJECT_ID} ({LOCATION})...")
    completed = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(run_bq_load, *job): job[0] for job in jobs}
        for fut in as_completed(futures):
            tbl = fut.result()
            completed += 1
            if completed % 5 == 0 or completed == len(jobs):
                print(f"  [{completed}/{len(jobs)}] Loaded {tbl}")

    print("All raw GA4 & OLTP tables uploaded successfully!")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)
