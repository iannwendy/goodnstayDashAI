import base64
import http.server
import json
import os
import pathlib
import struct
import sys
import tempfile
import threading
import unittest
from urllib.parse import parse_qs, quote, urlparse

SCRIPTS_DIR = pathlib.Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import jira_bug_reporter as jbr  # noqa: E402


def _make_valid_png(width: int = 280, height: int = 653) -> bytes:
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + ihdr_data + b"\x00\x00\x00\x00"


class FakeJiraHandler(http.server.BaseHTTPRequestHandler):
    state = None

    def log_message(self, format, *args):
        return

    def _check_auth(self):
        expected = "Basic " + base64.b64encode(b"qa@goodnstay.com:secret-token-123").decode("ascii")
        if self.headers.get("Authorization") != expected:
            self._json(401, {"errorMessages": ["Unauthorized"]})
            return False
        return True

    def _json(self, status: int, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._check_auth():
            return
        parsed = urlparse(self.path)
        self.state["requests"].append(("GET", parsed.path, parse_qs(parsed.query)))

        if parsed.path == "/rest/api/3/myself":
            self._json(
                200,
                {
                    "accountId": "712020:ca1958e5-9851-4d9d-93d9-e8eae49e4c3d",
                    "displayName": "Bao Minh QA",
                    "emailAddress": "qa@goodnstay.com",
                },
            )
            return

        if parsed.path == "/rest/agile/1.0/board":
            boards = self.state.get("boards_override", [])
            self._json(200, {"values": boards, "isLast": True})
            return

        if parsed.path == "/rest/api/3/project/search":
            projects = self.state.get(
                "projects_override",
                [
                    {"id": "101", "key": "IPS", "name": "Internship Program 2026 Sandbox"},
                    {"id": "102", "key": "IP26", "name": "Internship Program 2026"},
                ],
            )
            self._json(200, {"values": projects, "isLast": True})
            return

        if parsed.path == "/rest/api/3/issue/createmeta/IP26/issuetypes":
            self._json(
                200,
                {
                    "issueTypes": [
                        {"id": "10000", "name": "Bug", "subtask": True},
                        {"id": "10001", "name": "Task", "subtask": False},
                        {"id": "10004", "name": "Bug", "subtask": False},
                    ]
                },
            )
            return

        if parsed.path == "/rest/api/3/issue/createmeta/IP26/issuetypes/10004":
            fields_meta = self.state.get(
                "createmeta_fields",
                [
                    {"fieldId": "summary", "name": "Summary", "required": True},
                    {"fieldId": "description", "name": "Description", "required": False},
                    {"fieldId": "labels", "name": "Labels", "required": False},
                    {"fieldId": "assignee", "name": "Assignee", "required": False},
                ],
            )
            self._json(200, {"fields": fields_meta})
            return

        if parsed.path.startswith("/rest/api/3/attachment/content/"):
            att_id = parsed.path.rsplit("/", 1)[-1]
            if self.state.get("omit_media_redirect"):
                self._json(200, {"ok": True})
                return
            uuid_val = self.state["media_uuids"].get(att_id, "12345678-abcd-1234-ef01-123456789abc")
            self.send_response(303)
            self.send_header(
                "Location",
                f"https://api.media.atlassian.com/file/{uuid_val}/binary?collection=jira-issue-media",
            )
            self.end_headers()
            return

        self._json(404, {"errorMessages": [f"Unknown GET {parsed.path}"]})

    def do_POST(self):
        if not self._check_auth():
            return
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(length)

        if parsed.path == "/rest/api/3/issue":
            payload = json.loads(raw_body.decode("utf-8"))
            self.state["created_issues"].append(payload)
            self.state["requests"].append(("POST", parsed.path, payload))
            self._json(
                201,
                {
                    "id": "50042",
                    "key": "IP26-42",
                    "self": f"{self.state['base_url']}/rest/api/3/issue/50042",
                },
            )
            return

        if parsed.path == "/rest/api/3/issue/IP26-42/attachments":
            if self.state.get("fail_attachment_upload"):
                self._json(413, {"errorMessages": ["Attachment exceeds limit"]})
                return
            if self.headers.get("X-Atlassian-Token") != "no-check":
                self._json(403, {"errorMessages": ["Missing X-Atlassian-Token: no-check"]})
                return
            self.state["uploaded_raw"].append(
                {
                    "content_type": self.headers.get("Content-Type", ""),
                    "body": raw_body,
                }
            )
            self.state["requests"].append(("POST", parsed.path, len(raw_body)))
            att_id = str(99000 + len(self.state["uploaded_raw"]))
            self._json(
                200,
                [
                    {
                        "id": att_id,
                        "filename": f"uploaded_{att_id}.png",
                        "size": len(raw_body),
                    }
                ],
            )
            return

        self._json(404, {"errorMessages": [f"Unknown POST {parsed.path}"]})

    def do_PUT(self):
        if not self._check_auth():
            return
        parsed = urlparse(self.path)
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length).decode("utf-8"))
        self.state["updated_issues"].append((parsed.path, payload))
        self.state["requests"].append(("PUT", parsed.path, payload))
        self.send_response(204)
        self.end_headers()


class JiraBugReporterTests(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.tmp_path = pathlib.Path(self.tmp_dir.name)

        self.img_path = self.tmp_path / "BUG-01 ảnh lỗi màn hình (280x653).png"
        self.img_path.write_bytes(_make_valid_png(280, 653))

        self.sample_payload = {
            "title": "Accommodation tab text is clipped on narrow mobile header (< 394px)",
            "environment": "Production · Mobile (280x653 Galaxy Fold Cover) · Chrome · en-US",
            "steps_to_reproduce": [
                "Open https://goodnstay.com/en-US on a 280x653 viewport.",
                "Inspect the top navigation header tab 'Accommodation'.",
                "Check F12 Console and Network tabs.",
            ],
            "actual_result": "The 'Accommodation' label is clipped to 'Accor' and loses its right border radius.",
            "expected_result": "Header navigation labels should remain readable or collapse cleanly without text clipping.",
            "evidence": {
                "url": "https://goodnstay.com/en-US",
                "datetime": "2026-11-03 11:30:00 +07:00",
                "console": "No uncaught JS error.",
                "network": "200 OK document load; purely CSS flex overflow.",
                "reference_url": "Observed UI (no Confluence URL)",
            },
            "classification": "Needs Verification — (need to brainstorming with team or observe)",
            "severity": "S3 – Minor",
            "priority_label": "P2",
            "labels": ["goodNstay", "responsive"],
            "attachments": [str(self.img_path)],
        }

        self.server_state = {
            "requests": [],
            "created_issues": [],
            "uploaded_raw": [],
            "updated_issues": [],
            "media_uuids": {"99001": "12345678-abcd-1234-ef01-123456789abc"},
            "omit_media_redirect": False,
            "fail_attachment_upload": False,
            "base_url": "",
        }
        FakeJiraHandler.state = self.server_state
        self.httpd = http.server.HTTPServer(("127.0.0.1", 0), FakeJiraHandler)
        port = self.httpd.server_port
        self.base_url = f"http://127.0.0.1:{port}"
        self.server_state["base_url"] = self.base_url
        self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.server_thread.start()

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.tmp_dir.cleanup()

    def _make_config(self) -> "jbr.JiraConfig":
        env_file = self.tmp_path / ".env.jira"
        env_file.write_text(
            "\n".join(
                [
                    f"JIRA_BASE_URL={self.base_url}",
                    "JIRA_PROJECT_NAME=Internship Program 2026",
                    "JIRA_EMAIL=qa@goodnstay.com",
                    "JIRA_API_TOKEN=secret-token-123",
                ]
            ),
            encoding="utf-8",
        )
        return jbr.load_config([env_file], ignore_os_env=True)

    def test_load_config_rejects_placeholder_token(self):
        env_file = self.tmp_path / ".env.placeholder"
        env_file.write_text(
            "\n".join(
                [
                    "JIRA_BASE_URL=https://optibide-org.atlassian.net",
                    "JIRA_PROJECT_NAME=Internship Program 2026",
                    "JIRA_EMAIL=baominh.internship@gmail.com",
                    "JIRA_API_TOKEN=PASTE_YOUR_ATLASSIAN_API_TOKEN_HERE",
                ]
            ),
            encoding="utf-8",
        )
        with self.assertRaises(jbr.ConfigError) as ctx:
            jbr.load_config([env_file], ignore_os_env=True)
        self.assertIn("id.atlassian.com", str(ctx.exception))

    def test_default_env_paths_includes_repo_root_from_subdirectory(self):
        sub_cwd = self.tmp_path / "nested" / "dir"
        sub_cwd.mkdir(parents=True)
        paths = jbr.default_env_paths(sub_cwd)
        repo_root = pathlib.Path(jbr.__file__).resolve().parents[4]
        self.assertIn(repo_root / ".env.jira", paths)

    def test_validate_report_enforces_mandatory_evidence_fields_and_safe_adf_links(self):
        bad_ev = dict(self.sample_payload)
        bad_ev["evidence"] = {"notes": "Missing URL, datetime, and F12"}
        with self.assertRaises(jbr.ValidationError) as ctx:
            jbr.validate_report(bad_ev)
        self.assertIn("url", str(ctx.exception))

        # Non-HTTP reference_url must NOT emit an invalid ADF link mark
        report = jbr.validate_report(self.sample_payload)
        adf = jbr.build_adf_description(report)
        adf_json = json.dumps(adf)
        self.assertNotIn('"href": "Observed UI (no Confluence URL)"', adf_json)

    def test_validate_report_checks_mandatory_fields_and_default_classification(self):
        payload = dict(self.sample_payload)
        del payload["classification"]
        report = jbr.validate_report(payload)
        self.assertIn("Needs Verification", report.classification)

        bad_payload = dict(self.sample_payload)
        bad_payload["actual_result"] = "   "
        with self.assertRaises(jbr.ValidationError) as ctx:
            jbr.validate_report(bad_payload)
        self.assertIn("actual_result", str(ctx.exception))

    def test_validate_report_blocks_missing_or_empty_attachment_before_api_call(self):
        bad_payload = dict(self.sample_payload)
        bad_payload["attachments"] = [str(self.tmp_path / "does_not_exist.png")]
        with self.assertRaises(jbr.ValidationError):
            jbr.validate_report(bad_payload)
        self.assertEqual(len(self.server_state["requests"]), 0)

        empty_img = self.tmp_path / "empty.png"
        empty_img.write_bytes(b"")
        bad_payload["attachments"] = [str(empty_img)]
        with self.assertRaises(jbr.ValidationError):
            jbr.validate_report(bad_payload)
        self.assertEqual(len(self.server_state["requests"]), 0)

    def test_dry_run_never_calls_jira_post_and_renders_preview(self):
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        result = jbr.submit_bug_report(config, report, confirm=False)
        self.assertEqual(result["mode"], "dry-run")
        self.assertEqual(len(self.server_state["created_issues"]), 0)
        self.assertIn("Accommodation tab text is clipped", result["preview"])
        self.assertIn(self.img_path.name, result["preview"])

    def test_confirm_creates_issue_rfc5987_upload_and_embeds_media_with_dimensions(self):
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        result = jbr.submit_bug_report(config, report, confirm=True)

        self.assertEqual(result["mode"], "created")
        self.assertEqual(result["issue_key"], "IP26-42")
        self.assertEqual(len(self.server_state["created_issues"]), 1)

        created_fields = self.server_state["created_issues"][0]["fields"]
        self.assertEqual(created_fields["project"]["key"], "IP26")
        # Must skip subtask Bug (10000) and pick standard Bug (10004)
        self.assertEqual(created_fields["issuetype"]["id"], "10004")

        # Verify RFC 5987 filename*=UTF-8'' encoding for Vietnamese filename
        raw_upload = self.server_state["uploaded_raw"][0]["body"]
        expected_rfc5987 = f"filename*=UTF-8''{quote(self.img_path.name, safe='')}".encode("ascii")
        self.assertIn(expected_rfc5987, raw_upload)

        # Verify ADF media node inside mediaSingle has required integer width & height (280x653)
        self.assertEqual(len(self.server_state["updated_issues"]), 1)
        _, put_payload = self.server_state["updated_issues"][0]
        media_singles = [
            n for n in put_payload["fields"]["description"]["content"] if n.get("type") == "mediaSingle"
        ]
        self.assertEqual(len(media_singles), 1)
        media_attrs = media_singles[0]["content"][0]["attrs"]
        self.assertEqual(media_attrs["id"], "12345678-abcd-1234-ef01-123456789abc")
        self.assertEqual(media_attrs["width"], 280)
        self.assertEqual(media_attrs["height"], 653)

    def test_attachment_failure_after_create_preserves_issue_key_in_result(self):
        self.server_state["fail_attachment_upload"] = True
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        result = jbr.submit_bug_report(config, report, confirm=True)

        self.assertEqual(result["issue_key"], "IP26-42")
        self.assertTrue(any("413" in w for w in result["warnings"]))

    def test_omits_labels_with_warning_when_not_on_create_screen(self):
        self.server_state["createmeta_fields"] = [
            {"fieldId": "summary", "name": "Summary", "required": True},
            {"fieldId": "description", "name": "Description", "required": False},
        ]
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        result = jbr.submit_bug_report(config, report, confirm=True)

        created_fields = self.server_state["created_issues"][0]["fields"]
        self.assertNotIn("labels", created_fields)
        self.assertTrue(any("labels" in w.lower() for w in result["warnings"]))

    def test_resolve_project_key_rejects_ambiguous_single_substring_match(self):
        self.server_state["projects_override"] = [
            {"id": "101", "key": "IPS", "name": "Internship Program 2026 Sandbox"}
        ]
        config = self._make_config()
        client = jbr.JiraClient(config)
        with self.assertRaises(jbr.JiraApiError):
            client.resolve_project_key("Internship Program 2026")

    def test_auto_populates_optibide_reporting_expectation_rca_custom_fields(self):
        self.server_state["createmeta_fields"] = [
            {"fieldId": "summary", "name": "Summary", "required": True},
            {"fieldId": "description", "name": "Description", "required": False},
            {"fieldId": "assignee", "name": "Assignee", "required": False},
            {
                "fieldId": "priority",
                "name": "Priority",
                "required": False,
                "allowedValues": [
                    {"id": "1", "name": "Highest"},
                    {"id": "2", "name": "High"},
                    {"id": "3", "name": "Medium"},
                    {"id": "4", "name": "Low"},
                ],
            },
            {
                "fieldId": "customfield_10053",
                "name": "Environment",
                "required": False,
                "schema": {"type": "option-with-child"},
                "allowedValues": [
                    {"id": "10039", "value": "Staging"},
                    {"id": "10040", "value": "Production"},
                ],
            },
            {
                "fieldId": "customfield_10004",
                "name": "Impact",
                "required": False,
                "schema": {"type": "option"},
                "allowedValues": [
                    {"id": "10002", "value": "Moderate / Limited"},
                    {"id": "10003", "value": "Minor / Localized"},
                ],
            },
            {
                "fieldId": "customfield_10038",
                "name": "Platform",
                "required": False,
                "schema": {"type": "array", "items": "option"},
                "allowedValues": [{"id": "10022", "value": "Web Traveler"}],
            },
            {"fieldId": "customfield_10170", "name": "Pre-condition", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
            {"fieldId": "customfield_10135", "name": "Step-by-step", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
            {"fieldId": "customfield_10137", "name": "Actual Result", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
            {"fieldId": "customfield_10136", "name": "Expected Result", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
            {"fieldId": "customfield_10051", "name": "Detailed Analysis (Evidence & Reasoning)", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
            {"fieldId": "customfield_10049", "name": "Signals and Clues", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
            {"fieldId": "customfield_10057", "name": "UI References", "schema": {"type": "string", "custom": "com.atlassian.jira.plugin.system.customfieldtypes:textarea"}},
        ]
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        jbr.submit_bug_report(config, report, confirm=True)

        created_fields = self.server_state["created_issues"][0]["fields"]
        self.assertEqual(created_fields["customfield_10053"], {"id": "10040"})
        self.assertEqual(created_fields["customfield_10004"], {"id": "10003"})
        self.assertEqual(created_fields["customfield_10038"], [{"id": "10022"}])
        self.assertEqual(created_fields["priority"], {"id": "3"})
        self.assertEqual(created_fields["customfield_10170"]["type"], "doc")
        self.assertEqual(created_fields["customfield_10135"]["content"][0]["type"], "orderedList")
        self.assertIn("Accor", json.dumps(created_fields["customfield_10137"]))
        self.assertIn("readable", json.dumps(created_fields["customfield_10136"]))
        self.assertIn("200 OK", json.dumps(created_fields["customfield_10051"]))
        self.assertIn("No uncaught JS error", json.dumps(created_fields["customfield_10049"]))

    def test_resolves_board_name_to_project_key_and_auto_assigns_self(self):
        self.server_state["projects_override"] = []
        self.server_state["boards_override"] = [
            {
                "id": 135,
                "name": "Internship Program 2026",
                "type": "scrum",
                "location": {"projectKey": "IP26", "projectName": "Optibide"},
            }
        ]
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        result = jbr.submit_bug_report(config, report, confirm=True)

        self.assertEqual(result["project_key"], "IP26")
        created_fields = self.server_state["created_issues"][0]["fields"]
        self.assertEqual(
            created_fields["assignee"],
            {"id": "712020:ca1958e5-9851-4d9d-93d9-e8eae49e4c3d"},
        )

    def test_resolve_project_key_prefers_exact_case_insensitive_match(self):
        config = self._make_config()
        client = jbr.JiraClient(config)
        self.assertEqual(client.resolve_project_key("internship program 2026"), "IP26")

    def test_fallback_when_attachment_redirect_has_no_media_uuid(self):
        self.server_state["omit_media_redirect"] = True
        config = self._make_config()
        report = jbr.validate_report(self.sample_payload)
        result = jbr.submit_bug_report(config, report, confirm=True)

        self.assertEqual(result["issue_key"], "IP26-42")
        self.assertEqual(len(result["uploaded_attachments"]), 1)
        self.assertEqual(len(self.server_state["updated_issues"]), 0)


if __name__ == "__main__":
    unittest.main()
