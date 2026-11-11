#!/usr/bin/env python3
"""Unit tests for goodNstay API QA Testing Helper (api_test_helper.py)."""

from __future__ import annotations

import copy
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import pathlib
import sys
import tempfile
import threading
import unittest

SCRIPT_DIR = pathlib.Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import api_test_helper as helper  # noqa: E402


class TestApiTestHelper(unittest.TestCase):
    def setUp(self) -> None:
        self.suite = helper.build_op1593_suite()

    def test_canonical_op1593_suite_passes_strict_validation(self) -> None:
        report = helper.validate_suite_dict(self.suite, pathlib.Path("op1593.json"))
        self.assertEqual(report.error_count, 0, [i.message for i in report.issues])
        self.assertEqual(report.warn_count, 0, [i.message for i in report.issues])
        self.assertEqual(len(self.suite["testCases"]), 10)

    def test_rejects_forbidden_example_url(self) -> None:
        bad = copy.deepcopy(self.suite)
        bad["testCases"][0]["methodAndUrl"] = "POST https://api.example.test/v2/partner-registrations"
        bad["testCases"][0]["resultRecord"]["url"] = "https://api.example.test/v2/partner-registrations"
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("FORBIDDEN_EXAMPLE_URL", codes)

    def test_rejects_guessed_url_status_and_error_code_when_openapi_missing(self) -> None:
        bad = copy.deepcopy(self.suite)
        bad["testCases"][1]["resultRecord"]["url"] = "/api/v2/accommodations/register"
        bad["testCases"][1]["resultRecord"]["expectedHttpStatus"] = "400"
        bad["testCases"][1]["resultRecord"]["expectedErrorCode"] = "VALIDATION_ERROR"
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("GUESSED_URL_WITHOUT_OPENAPI", codes)
        self.assertIn("GUESSED_HTTP_STATUS_WITHOUT_OPENAPI", codes)
        self.assertIn("GUESSED_ERROR_CODE_WITHOUT_OPENAPI", codes)

    def test_rejects_non_standard_statuses_and_unexecuted_pass(self) -> None:
        bad = copy.deepcopy(self.suite)
        bad["testCases"][0]["resultRecord"]["status"] = "NOT RUN"
        bad["testCases"][1]["resultRecord"]["status"] = "PASS"
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("INVALID_STATUS", codes)
        self.assertIn("UNEXECUTED_MARKED_PASS_OR_FAIL", codes)
        self.assertIn("PASS_FAIL_WITHOUT_DEPLOYED_SHA", codes)

    def test_rejects_multiple_variables_mutated_in_negative_case(self) -> None:
        bad = copy.deepcopy(self.suite)
        # REGV2-API-002 removes phoneCountry; also mutate propertyName -> 2 diffs
        bad["testCases"][1]["payloadObject"]["propertyName"] = "Another Hotel Name"
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("MULTIPLE_VARIABLES_MUTATED", codes)

    def test_rejects_missing_phone_country_without_valid_e164_phone(self) -> None:
        bad = copy.deepcopy(self.suite)
        # Keep only 1 diff from baseValidFixture? No, if phone is also changed that's 2 diffs,
        # so allowMultiFieldMutation=True to isolate the E.164 check
        bad["testCases"][1]["allowMultiFieldMutation"] = True
        bad["testCases"][1]["payloadObject"]["primaryContact"]["phone"] = "0901234567"
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("MISSING_PHONE_COUNTRY_MUST_KEEP_E164", codes)

    def test_rejects_pii_and_hardcoded_jwt_leaks(self) -> None:
        bad = copy.deepcopy(self.suite)
        bad["testCases"][0]["payloadObject"]["primaryContact"]["email"] = "baominh.internship@gmail.com"
        bad["testCases"][0]["headersAuthParams"] = (
            "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        )
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("SECRET_JWT_LEAK", codes)
        self.assertIn("PII_OR_SECRET_LEAK", codes)

    def test_rejects_missing_14_fields_and_missing_readback_check(self) -> None:
        bad = copy.deepcopy(self.suite)
        bad["testCases"][0]["priorityAndLayer"] = ""
        bad["testCases"][0]["expectedDataResult"] = "Done."
        bad["testCases"][1]["expectedDataResult"] = "Error returned."
        report = helper.validate_suite_dict(bad, pathlib.Path("bad.json"))
        codes = {i.code for i in report.issues}
        self.assertIn("MISSING_14_FIELD", codes)
        self.assertIn("MISSING_POSITIVE_READBACK_CHECK", codes)
        self.assertIn("MISSING_NEGATIVE_ZERO_PERSISTENCE_CHECK", codes)

    def test_scaffold_and_exporters_and_jira_bug_conversion(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = pathlib.Path(tmp)
            paths = helper.scaffold_suite_directory(tmp_dir, jira_ticket="OP-1593", prefix="REGV2-API")
            self.assertTrue(paths["suite_json"].is_file())
            self.assertTrue(paths["markdown"].is_file())
            self.assertTrue(paths["postman"].is_file())
            self.assertTrue((paths["fixtures_dir"] / "valid-registration-v2.json").is_file())
            self.assertTrue((paths["fixtures_dir"] / "missing-phone-country.json").is_file())

            # Validate scaffolded JSON via CLI
            rc = helper.main(["validate", str(paths["suite_json"]), "--strict"])
            self.assertEqual(rc, 0)

            # Check Postman Collection v2.1 structure
            pm_data = json.loads(paths["postman"].read_text(encoding="utf-8"))
            self.assertEqual(
                pm_data["info"]["schema"],
                "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            )
            self.assertEqual(len(pm_data["item"]), 10)

            # Check Jira Bug conversion compatibility
            bug_path = tmp_dir / "BUG-REGV2-002.json"
            rc_bug = helper.main([
                "to-jira-bug",
                str(paths["suite_json"]),
                "--case-id",
                "REGV2-API-002",
                "--output",
                str(bug_path),
            ])
            self.assertEqual(rc_bug, 0)
            bug_data = json.loads(bug_path.read_text(encoding="utf-8"))
            for req_key in (
                "title",
                "environment",
                "steps_to_reproduce",
                "actual_result",
                "expected_result",
                "evidence",
                "classification",
            ):
                self.assertIn(req_key, bug_data)

    def test_run_suite_live_end_to_end_automation(self) -> None:
        class _Handler(BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: object) -> None:  # noqa: A002
                return

            def do_GET(self) -> None:  # noqa: N802
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Request-Id", "req-readback-001")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "data": {"id": "pr-101"}}).encode("utf-8"))

            def do_POST(self) -> None:  # noqa: N802
                length = int(self.headers.get("Content-Length", "0"))
                body = json.loads(self.rfile.read(length).decode("utf-8"))
                pc = body.get("primaryContact", {})
                if "phoneCountry" not in pc:
                    # Simulate OP-1591 regression: Gateway returns generic DOWNSTREAM_CLIENT_ERROR -> should trigger FAIL + bug file!
                    self.send_response(400)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("X-Request-Id", "req-fail-002")
                    self.end_headers()
                    self.wfile.write(
                        json.dumps({"success": False, "error": {"code": "DOWNSTREAM_CLIENT_ERROR"}}).encode("utf-8")
                    )
                    return
                if body.get("administrativeAreaCode") == "KR-11":
                    self.send_response(422)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("X-Request-Id", "req-pass-003")
                    self.end_headers()
                    self.wfile.write(
                        json.dumps({"success": False, "error": {"code": "LOCATION_CHILD_MISMATCH"}}).encode("utf-8")
                    )
                    return
                self.send_response(201)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Request-Id", "req-pass-001")
                self.end_headers()
                self.wfile.write(
                    json.dumps({"success": True, "data": {"partnerRequestId": "pr-101"}}).encode("utf-8")
                )

        server = HTTPServer(("127.0.0.1", 0), _Handler)
        port = server.server_port
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with tempfile.TemporaryDirectory() as tmp:
                tmp_dir = pathlib.Path(tmp)
                paths = helper.scaffold_suite_directory(tmp_dir)
                rc = helper.main([
                    "run-suite",
                    str(paths["suite_json"]),
                    "--base-url",
                    f"http://127.0.0.1:{port}",
                    "--registration-path",
                    "/api/v2/partner/registrations",
                    "--admin-readback-path",
                    "/api/v1/admin/partner-requests",
                    "--deployed-sha",
                    "fe=abc1234,gw=def5678,partner=9012345",
                    "--openapi-url",
                    f"http://127.0.0.1:{port}/openapi.json",
                ])
                self.assertEqual(rc, 0)
                updated = json.loads(paths["suite_json"].read_text(encoding="utf-8"))
                by_id = {tc["testCaseId"]: tc["resultRecord"] for tc in updated["testCases"]}
                self.assertEqual(by_id["REGV2-API-001"]["status"], "PASS")
                self.assertEqual(by_id["REGV2-API-002"]["status"], "FAIL")
                self.assertEqual(by_id["REGV2-API-003"]["status"], "PASS")
                self.assertTrue((tmp_dir / "bugs" / "BUG-REGV2-API-002.json").is_file())
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
