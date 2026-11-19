#!/usr/bin/env python3
"""Anti-duplicate batch publisher & verifier for Batch 2 API bugs (BUG-API-07 .. BUG-API-12)."""

from __future__ import annotations

import json
import pathlib
import sys

BASE_DIR = pathlib.Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parents[1]
sys.path.insert(0, str(REPO_ROOT / ".agents" / "skills" / "jira-bug-reporter" / "scripts"))
import jira_bug_reporter as jbr  # noqa: E402

REQUIRED_12_CF = [
    "customfield_10045",
    "customfield_10046",
    "customfield_10047",
    "customfield_10048",
    "customfield_10049",
    "customfield_10050",
    "customfield_10051",
    "customfield_10052",
    "customfield_10037",
    "customfield_10038",
    "customfield_10039",
    "customfield_10040",
]


def main() -> int:
    cfg = jbr.load_config([REPO_ROOT / ".env.jira"])
    client = jbr.JiraClient(cfg)
    out_path = BASE_DIR / "uploaded_jira_tickets.json"

    existing_saved: dict[str, dict] = {}
    if out_path.is_file():
        saved_obj = json.loads(out_path.read_text(encoding="utf-8"))
        for t in saved_obj.get("tickets", []):
            existing_saved[t["bug_id"]] = t

    board_resp = client._request_json("GET", "/rest/agile/1.0/board/135/issue?maxResults=100&fields=summary")
    board_by_summary = {
        (it.get("fields", {}).get("summary") or "").strip(): it.get("key")
        for it in board_resp.get("issues", [])
    }

    tickets_out: list[dict] = []
    for idx in range(7, 13):
        bug_id = f"BUG-API-{idx:02d}"
        p_file = BASE_DIR / "json_payloads" / f"{bug_id}.json"
        raw = json.loads(p_file.read_text(encoding="utf-8"))
        report = jbr.validate_report(raw, base_dir=p_file.parent)

        if bug_id in existing_saved:
            issue_key = existing_saved[bug_id]["issue_key"]
            print(f"[SKIP-SAVED] {bug_id} already mapped to {issue_key}")
        elif report.title in board_by_summary:
            issue_key = board_by_summary[report.title]
            print(f"[SKIP-BOARD] {bug_id} already exists on Board #135 as {issue_key}")
        else:
            res = jbr.submit_bug_report(cfg, report, confirm=True)
            issue_key = res["issue_key"]
            print(f"[CREATED] {bug_id} -> {issue_key} (inline_media={res.get('inline_embedded_count')}, warnings={res.get('warnings')})")

        # Immediately flush after each ticket
        issue_data = client._request_json("GET", f"/rest/api/3/issue/{issue_key}")
        fields = issue_data.get("fields", {})
        atts = fields.get("attachment") or []
        missing_cf = [cf for cf in REQUIRED_12_CF if not fields.get(cf)]
        assignee_name = (fields.get("assignee") or {}).get("displayName", "")

        entry = {
            "bug_id": bug_id,
            "issue_key": issue_key,
            "issue_url": f"{cfg.base_url}/browse/{issue_key}",
            "title": report.title,
            "classification": report.classification,
            "severity": report.severity,
            "priority_label": report.priority_label,
            "inline_embedded_count": len(atts),
            "verified_on_board_135": False,
            "verified_jira_attachments": len(atts),
            "verified_assignee": assignee_name,
            "missing_custom_fields": missing_cf,
            "attachment_urls": [a.get("content") for a in atts if a.get("content")],
            "attachment_filenames": [a.get("filename") for a in atts if a.get("filename")],
        }
        tickets_out.append(entry)
        out_path.write_text(
            json.dumps(
                {
                    "board_name": "Internship Program 2026",
                    "board_id": 135,
                    "board_url": "https://optibide-org.atlassian.net/jira/software/c/projects/OP/boards/135/backlog",
                    "total_uploaded": len(tickets_out),
                    "tickets": tickets_out,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )

    # Final Board #135 verification pass
    board_after = client._request_json("GET", "/rest/agile/1.0/board/135/issue?maxResults=100&fields=summary")
    board_keys = {it.get("key") for it in board_after.get("issues", [])}
    for t in tickets_out:
        t["verified_on_board_135"] = t["issue_key"] in board_keys
        print(
            f"[VERIFY] {t['bug_id']} -> {t['issue_key']} | on_board_135={t['verified_on_board_135']} | "
            f"attachments={t['verified_jira_attachments']} | assignee={t['verified_assignee']} | missing_cf={t['missing_custom_fields']}"
        )

    out_path.write_text(
        json.dumps(
            {
                "board_name": "Internship Program 2026",
                "board_id": 135,
                "board_url": "https://optibide-org.atlassian.net/jira/software/c/projects/OP/boards/135/backlog",
                "total_uploaded": len(tickets_out),
                "tickets": tickets_out,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
