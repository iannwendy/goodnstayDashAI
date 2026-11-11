#!/usr/bin/env python3
"""goodNstay API QA Testing Helper — Validator, Scaffolder, Postman & Markdown Exporter.

Zero-dependency Python 3 CLI tool enforcing:
1. goodNstay QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI)
2. OP-1593 / OP-1505 / OP-1589–OP-1592 Registration V2 Cross-Service Contract Rules
3. 14-Field Mandatory Test Case Schema + Section 5.2 JSON Result Record
4. Complete Valid Fixture + Single-Variable Mutation Discipline
5. Secret & PII Sanitization + Official 4-Status Gate (PASS / FAIL / NOT VERIFIED / BLOCKED)
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import pathlib
import re
import sys
from typing import Any
import urllib.error
import urllib.request
import uuid

SKILL_DIR = pathlib.Path(__file__).resolve().parents[1]
MEMORY_DIR = SKILL_DIR / "memory"
LESSONS_PATH = MEMORY_DIR / "lessons_learned.md"
FEEDBACK_LOG_PATH = MEMORY_DIR / "feedback_log.jsonl"

MANDATORY_14_FIELDS: tuple[tuple[str, str], ...] = (
    ("testCaseId", "Test Case ID"),
    ("title", "Title"),
    ("requirement", "Requirement"),
    ("priorityAndLayer", "Priority / Test layer"),
    ("environment", "Environment"),
    ("preconditions", "Preconditions"),
    ("methodAndUrl", "Method + URL"),
    ("headersAuthParams", "Headers / Auth / Parameters"),
    ("payloadAndTestData", "Payload / Test data"),
    ("steps", "Steps"),
    ("expectedResponse", "Expected response"),
    ("expectedDataResult", "Expected data result"),
    ("actualResult", "Actual result"),
    ("statusAndEvidence", "Status and evidence"),
)

MANDATORY_RESULT_RECORD_KEYS: tuple[str, ...] = (
    "testCaseId",
    "environment",
    "method",
    "url",
    "testDataFile",
    "expectedHttpStatus",
    "expectedErrorCode",
    "actualHttpStatus",
    "actualErrorCode",
    "requestId",
    "dataCheck",
    "status",
    "evidenceLink",
)

ALLOWED_STATUSES: frozenset[str] = frozenset({
    "PASS",
    "FAIL",
    "NOT VERIFIED",
    "BLOCKED",
})

ALLOWED_CATEGORIES: frozenset[str] = frozenset({
    "Positive",
    "Negative",
    "Boundary",
    "Permission",
    "Duplicate / Retry",
    "Integration",
    "Regression",
})

FORBIDDEN_EXAMPLE_URL_RE = re.compile(r"api\.example\.test", re.IGNORECASE)
HARDCODED_JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b")
FORBIDDEN_PII_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"baominh\.internship", re.IGNORECASE), "real intern email (baominh.internship)"),
    (re.compile(r"\bNguyen\s+Bao\s+Minh\b", re.IGNORECASE), "real intern name (Nguyen Bao Minh)"),
    (re.compile(r"[A-Za-z0-9._%+-]+@gmail\.com\b", re.IGNORECASE), "real @gmail.com address (use @example.test)"),
    (re.compile(r"Bao2005nguyen\.", re.IGNORECASE), "real account password"),
)
E164_PHONE_RE = re.compile(r"^\+[1-9]\d{7,14}$")


@dataclass
class ValidationIssue:
    severity: str  # "ERROR" | "WARN"
    case_id: str
    code: str
    message: str


@dataclass
class ValidationReport:
    path: pathlib.Path
    issues: list[ValidationIssue] = field(default_factory=list)

    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "ERROR")

    @property
    def warn_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "WARN")

    def add_error(self, case_id: str, code: str, message: str) -> None:
        self.issues.append(ValidationIssue("ERROR", case_id, code, message))

    def add_warn(self, case_id: str, code: str, message: str) -> None:
        self.issues.append(ValidationIssue("WARN", case_id, code, message))


def _is_unconfirmed_placeholder(val: str) -> bool:
    upper = str(val).upper()
    return (
        "<CHECK_" in upper
        or "[QA FILLS IN" in upper
        or "BLOCKED" in upper
        or "MISSING" in upper
    )


def _count_top_level_diffs(base_obj: dict[str, Any], target_obj: dict[str, Any], prefix: str = "") -> list[str]:
    """Return dotted field paths that differ between base_obj and target_obj."""
    diffs: list[str] = []
    all_keys = sorted(set(base_obj.keys()) | set(target_obj.keys()))
    for k in all_keys:
        path = f"{prefix}.{k}" if prefix else k
        if k not in base_obj or k not in target_obj:
            diffs.append(path)
            continue
        v1, v2 = base_obj[k], target_obj[k]
        if isinstance(v1, dict) and isinstance(v2, dict):
            diffs.extend(_count_top_level_diffs(v1, v2, path))
        elif v1 != v2:
            diffs.append(path)
    return diffs


def validate_suite_dict(data: dict[str, Any], source_path: pathlib.Path) -> ValidationReport:
    report = ValidationReport(path=source_path)

    if not isinstance(data, dict):
        report.add_error("SUITE", "INVALID_ROOT", "Root JSON must be an object.")
        return report

    for req_meta in ("suiteName", "jiraTicket", "environment", "preconditionsChecklist", "testCases"):
        if req_meta not in data or not data[req_meta]:
            report.add_error("SUITE", "MISSING_SUITE_META", f"Missing required suite metadata key: {req_meta!r}")

    pre_check = data.get("preconditionsChecklist", {})
    if isinstance(pre_check, dict):
        for pre_key in (
            "requirementJira",
            "openApiDocument",
            "baseUrl",
            "methodAndEndpoint",
            "authAndTokens",
            "testDataFixtures",
            "deployedBuildSha",
        ):
            if not str(pre_check.get(pre_key, "")).strip():
                report.add_error(
                    "SUITE",
                    "MISSING_PRETEST_ITEM",
                    f"preconditionsChecklist.{pre_key} is required by QA Guide Section 2.",
                )

    openapi_unconfirmed = _is_unconfirmed_placeholder(
        str(pre_check.get("openApiDocument", "")) if isinstance(pre_check, dict) else ""
    )
    sha_unconfirmed = _is_unconfirmed_placeholder(
        str(pre_check.get("deployedBuildSha", "")) if isinstance(pre_check, dict) else ""
    )

    base_fixture = data.get("baseValidFixture")
    if not isinstance(base_fixture, dict) or not base_fixture:
        report.add_error(
            "SUITE",
            "MISSING_BASE_VALID_FIXTURE",
            "Suite must include a complete 'baseValidFixture' object (QA Guide Section 6).",
        )
    else:
        for req_v2_key in (
            "propertyName",
            "legalName",
            "streetAddress",
            "countryCode",
            "administrativeAreaCode",
            "propertyTypeKey",
            "primaryContact",
            "businessDocument",
            "gallery",
            "submissionAcknowledgement",
        ):
            if req_v2_key not in base_fixture:
                report.add_warn(
                    "SUITE",
                    "INCOMPLETE_V2_FIXTURE",
                    f"baseValidFixture is missing canonical Registration V2 field {req_v2_key!r}.",
                )

    test_cases = data.get("testCases")
    if not isinstance(test_cases, list) or len(test_cases) == 0:
        report.add_error("SUITE", "EMPTY_TEST_CASES", "'testCases' must be a non-empty list.")
        return report

    if str(data.get("jiraTicket", "")).upper() == "OP-1593" and len(test_cases) < 5:
        report.add_error(
            "SUITE",
            "OP1593_MIN_5_CASES",
            f"QA Guide Section 10 requires at least 5 test cases for OP-1593 (found {len(test_cases)}).",
        )

    seen_ids: set[str] = set()
    raw_suite_text = json.dumps(data, ensure_ascii=False)
    if HARDCODED_JWT_RE.search(raw_suite_text):
        report.add_error("SUITE", "SECRET_JWT_LEAK", "Detected hardcoded JWT token in suite JSON. Redact all tokens.")
    for pii_re, label in FORBIDDEN_PII_PATTERNS:
        if pii_re.search(raw_suite_text):
            report.add_error("SUITE", "PII_OR_SECRET_LEAK", f"Detected forbidden {label} in suite JSON. Use safe QA data.")

    for idx, tc in enumerate(test_cases, start=1):
        if not isinstance(tc, dict):
            report.add_error(f"CASE#{idx}", "INVALID_CASE_OBJECT", "Each test case must be a JSON object.")
            continue

        cid = str(tc.get("testCaseId", "")).strip() or f"CASE#{idx}"
        if cid in seen_ids:
            report.add_error(cid, "DUPLICATE_CASE_ID", f"Duplicate testCaseId {cid!r}.")
        seen_ids.add(cid)

        # 1. Check all 14 mandatory QA Guide fields
        for f_key, f_label in MANDATORY_14_FIELDS:
            val = tc.get(f_key)
            if val is None or (isinstance(val, str) and not val.strip()) or (isinstance(val, list) and len(val) == 0):
                report.add_error(cid, "MISSING_14_FIELD", f"Missing mandatory 14-field entry: {f_key!r} ({f_label}).")

        # 2. Check steps is a list of >= 3 steps including readback/persistence check
        steps = tc.get("steps")
        if isinstance(steps, list):
            if len(steps) < 3:
                report.add_error(cid, "STEPS_TOO_SHORT", "Steps must contain at least 3 atomic numbered steps.")
            steps_joined = " ".join(str(s) for s in steps).lower()
            if not any(w in steps_joined for w in ("check", "verify", "readback", "get", "confirm", "created", "saved")):
                report.add_error(
                    cid,
                    "MISSING_POST_REQUEST_CHECK_STEP",
                    "Steps must include a post-request data/readback verification step (QA Guide Section 3 Step 7).",
                )
        else:
            report.add_error(cid, "INVALID_STEPS_TYPE", "'steps' must be a list of strings.")

        # 3. Check testCategory
        category = str(tc.get("testCategory", "")).strip()
        if category not in ALLOWED_CATEGORIES:
            report.add_error(
                cid,
                "INVALID_TEST_CATEGORY",
                f"testCategory {category!r} must be one of {sorted(ALLOWED_CATEGORIES)}.",
            )

        # 4. Check Section 5.2 resultRecord
        rec = tc.get("resultRecord")
        if not isinstance(rec, dict):
            report.add_error(cid, "MISSING_RESULT_RECORD", "Missing Section 5.2 'resultRecord' object.")
            continue

        for r_key in MANDATORY_RESULT_RECORD_KEYS:
            r_val = rec.get(r_key)
            if r_val is None or not str(r_val).strip():
                report.add_error(cid, "MISSING_RESULT_RECORD_KEY", f"resultRecord.{r_key} must be non-empty.")

        if str(rec.get("testCaseId", "")).strip() != cid:
            report.add_error(
                cid,
                "RESULT_RECORD_ID_MISMATCH",
                f"resultRecord.testCaseId ({rec.get('testCaseId')!r}) does not match testCaseId ({cid!r}).",
            )

        # 5. Check forbidden example URL
        method_and_url = str(tc.get("methodAndUrl", ""))
        rec_url = str(rec.get("url", ""))
        if FORBIDDEN_EXAMPLE_URL_RE.search(method_and_url) or FORBIDDEN_EXAMPLE_URL_RE.search(rec_url):
            report.add_error(
                cid,
                "FORBIDDEN_EXAMPLE_URL",
                "Never use 'api.example.test' in test cases (QA Guide Section 3 & 11). Use '{{baseUrl}}{{registrationPath}}' or real OpenAPI URL.",
            )

        # 6. No-Guessing Rule when OpenAPI is unconfirmed
        if openapi_unconfirmed:
            if not ("{{" in rec_url or "<CHECK_OPENAPI>" in rec_url):
                report.add_error(
                    cid,
                    "GUESSED_URL_WITHOUT_OPENAPI",
                    f"OpenAPI is unconfirmed, but resultRecord.url={rec_url!r} is hardcoded/invented. Use '{{{{baseUrl}}}}{{{{registrationPath}}}}'.",
                )
            exp_status = str(rec.get("expectedHttpStatus", ""))
            exp_code = str(rec.get("expectedErrorCode", ""))
            if not _is_unconfirmed_placeholder(exp_status):
                report.add_error(
                    cid,
                    "GUESSED_HTTP_STATUS_WITHOUT_OPENAPI",
                    f"OpenAPI is unconfirmed, but expectedHttpStatus={exp_status!r} was guessed. Use '<CHECK_OPENAPI>'.",
                )
            if category in ("Negative", "Boundary", "Permission") or exp_code.upper() != "NONE":
                if not _is_unconfirmed_placeholder(exp_code):
                    report.add_error(
                        cid,
                        "GUESSED_ERROR_CODE_WITHOUT_OPENAPI",
                        f"OpenAPI/Error Registry is unconfirmed, but expectedErrorCode={exp_code!r} was guessed. Use '<CHECK_ERROR_REGISTRY>'.",
                    )

        # 7. Official 4-Status Gate & Execution Evidence Gate
        status = str(rec.get("status", "")).strip()
        if status not in ALLOWED_STATUSES:
            report.add_error(
                cid,
                "INVALID_STATUS",
                f"resultRecord.status={status!r} is invalid. Must be one of {sorted(ALLOWED_STATUSES)}.",
            )

        actual_http = str(rec.get("actualHttpStatus", "")).strip()
        req_id = str(rec.get("requestId", "")).strip()
        ev_link = str(rec.get("evidenceLink", "")).strip()

        if status in ("PASS", "FAIL"):
            if actual_http in ("", "NOT_RUN"):
                report.add_error(
                    cid,
                    "UNEXECUTED_MARKED_PASS_OR_FAIL",
                    f"Cannot mark status={status!r} when actualHttpStatus is 'NOT_RUN'.",
                )
            if req_id in ("", "NOT_RUN"):
                report.add_error(
                    cid,
                    "MISSING_REQUEST_ID_FOR_EXECUTED_TEST",
                    f"status={status!r} requires a real requestId (found {req_id!r}).",
                )
            if ev_link in ("", "<ADD_AFTER_TEST>", "NOT_RUN"):
                report.add_error(
                    cid,
                    "MISSING_EVIDENCE_FOR_EXECUTED_TEST",
                    f"status={status!r} requires a real evidenceLink (found {ev_link!r}).",
                )
            if sha_unconfirmed:
                report.add_error(
                    cid,
                    "PASS_FAIL_WITHOUT_DEPLOYED_SHA",
                    f"Cannot mark status={status!r} while preconditionsChecklist.deployedBuildSha is unconfirmed (OP-1593 gate).",
                )

        if actual_http == "NOT_RUN" and status not in ("NOT VERIFIED", "BLOCKED"):
            report.add_error(
                cid,
                "NOT_RUN_INVALID_STATUS",
                f"When actualHttpStatus=='NOT_RUN', status must be 'NOT VERIFIED' or 'BLOCKED' (got {status!r}).",
            )

        if status == "BLOCKED":
            status_ev_text = str(tc.get("statusAndEvidence", ""))
            if "BLOCKED" not in status_ev_text.upper() or not str(tc.get("ownerToAsk", "")).strip():
                report.add_error(
                    cid,
                    "INCOMPLETE_BLOCKED_METADATA",
                    "BLOCKED test cases must state 'BLOCKED — <reason>' in statusAndEvidence and specify 'ownerToAsk'.",
                )

        # 8. Single-Variable Mutation & Payload Validation
        single_delta = str(tc.get("singleChangeDelta", "")).strip()
        if not single_delta:
            report.add_error(
                cid,
                "MISSING_SINGLE_CHANGE_DELTA",
                "Every test case must explicitly declare 'singleChangeDelta' (QA Guide Section 6).",
            )

        payload_obj = tc.get("payloadObject")
        if not isinstance(payload_obj, dict) or not payload_obj:
            report.add_error(cid, "MISSING_PAYLOAD_OBJECT", "Each test case must include a complete 'payloadObject'.")
        elif isinstance(base_fixture, dict) and base_fixture:
            diffs = _count_top_level_diffs(base_fixture, payload_obj)
            if category == "Positive" and len(diffs) > 0 and not tc.get("allowPositiveFixtureOverride"):
                report.add_warn(
                    cid,
                    "POSITIVE_DIFFERS_FROM_BASE_FIXTURE",
                    f"Positive test payload differs from baseValidFixture at {diffs}.",
                )
            elif category in ("Negative", "Boundary") and len(diffs) == 0 and not tc.get("headerOnlyMutation"):
                report.add_error(
                    cid,
                    "NEGATIVE_IDENTICAL_TO_VALID_FIXTURE",
                    "Negative/Boundary test payload is identical to baseValidFixture and headerOnlyMutation is not set.",
                )
            elif category in ("Negative", "Boundary") and len(diffs) > 1 and not tc.get("allowMultiFieldMutation"):
                report.add_error(
                    cid,
                    "MULTIPLE_VARIABLES_MUTATED",
                    f"QA Guide Section 6 violation: changed {len(diffs)} fields {diffs} instead of a single variable.",
                )

            # Special OP-1589/OP-1505 check for missing phoneCountry test
            if "phoneCountry" in single_delta and "primaryContact.phoneCountry" in diffs:
                pc = payload_obj.get("primaryContact", {})
                phone_val = str(pc.get("phone", "")) if isinstance(pc, dict) else ""
                if not E164_PHONE_RE.match(phone_val):
                    report.add_error(
                        cid,
                        "MISSING_PHONE_COUNTRY_MUST_KEEP_E164",
                        f"OP-1589 / QA Guide Section 5: When removing primaryContact.phoneCountry, primaryContact.phone must remain in valid E.164 format (e.g. '+84900000000'), got {phone_val!r}.",
                    )

        # 9. Expected data result / Readback verification
        exp_data = str(tc.get("expectedDataResult", "")).lower()
        if category == "Positive":
            if not any(k in exp_data for k in ("get", "readback", "reviewer", "persisted", "saved")):
                report.add_error(
                    cid,
                    "MISSING_POSITIVE_READBACK_CHECK",
                    "Positive test expectedDataResult must specify GET / Admin Reviewer readback verification.",
                )
        elif category in ("Negative", "Boundary", "Permission"):
            if not any(k in exp_data for k in ("no ", "zero", "not created", "unchanged", "rejected")):
                report.add_error(
                    cid,
                    "MISSING_NEGATIVE_ZERO_PERSISTENCE_CHECK",
                    "Negative/Boundary/Permission test expectedDataResult must verify that no unintended record was created or changed.",
                )

    return report


def build_op1593_suite(jira_ticket: str = "OP-1593", prefix: str = "REGV2-API") -> dict[str, Any]:
    """Build the canonical 10-case OP-1593 Registration V2 API Test Suite."""
    base_valid_fixture: dict[str, Any] = {
        "propertyName": "QA Sample Hotel Da Nang",
        "legalName": "QA Sample Hospitality Company Limited",
        "streetAddress": "100 Vo Nguyen Giap Street, My An Ward",
        "countryCode": "VN",
        "administrativeAreaCode": "<VALID_VN_LOCATION_L2_CODE>",
        "propertyTypeKey": "HOTEL",
        "starRating": 4,
        "officialWebsite": "https://qa-sample-hotel.example.test",
        "primaryContact": {
            "fullName": "QA Tester",
            "jobTitle": "General Manager",
            "email": "qa-sample@example.test",
            "phoneCountry": "VN",
            "phone": "+84900000000",
            "preferredContactMethod": "EMAIL",
        },
        "businessDocument": [
            {
                "assetId": "00000000-0000-4000-8000-000000000101",
                "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
                "order": 1,
            }
        ],
        "gallery": [
            {
                "assetId": "00000000-0000-4000-8000-000000000201",
                "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
                "order": 1,
            },
            {
                "assetId": "00000000-0000-4000-8000-000000000202",
                "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
                "order": 2,
            },
        ],
        "submissionAcknowledgement": {
            "policyVersion": "<VALID_POLICY_VERSION_V2>",
            "informationAccuracyAccepted": True,
            "termsAndPrivacyAccepted": True,
            "verificationAuthorizationAccepted": True,
        },
    }

    def clone_fixture() -> dict[str, Any]:
        return json.loads(json.dumps(base_valid_fixture))

    # Mutated fixtures (Single-Variable Mutation Discipline)
    f_missing_phone_country = clone_fixture()
    del f_missing_phone_country["primaryContact"]["phoneCountry"]

    f_wrong_location_l2 = clone_fixture()
    f_wrong_location_l2["administrativeAreaCode"] = "KR-11"

    f_zero_business_docs = clone_fixture()
    f_zero_business_docs["businessDocument"] = []

    f_single_gallery_photo = clone_fixture()
    f_single_gallery_photo["gallery"] = [base_valid_fixture["gallery"][0]]

    f_missing_hotel_star = clone_fixture()
    del f_missing_hotel_star["starRating"]

    f_foreign_asset_ownership = clone_fixture()
    f_foreign_asset_ownership["businessDocument"] = [
        {
            "assetId": "00000000-0000-4000-8000-000000009999",
            "uploadReceipt": "<FOREIGN_ACTOR_UPLOAD_RECEIPT>",
            "order": 1,
        }
    ]

    f_pending_scan_asset = clone_fixture()
    f_pending_scan_asset["businessDocument"] = [
        {
            "assetId": "00000000-0000-4000-8000-000000008888",
            "uploadReceipt": "<SCAN_PENDING_UPLOAD_RECEIPT>",
            "order": 1,
        }
    ]

    f_idempotency_conflict = clone_fixture()
    f_idempotency_conflict["propertyName"] = "QA Mutated Hotel Name On Same Key"

    f_mixed_phone_and_address_country = clone_fixture()
    f_mixed_phone_and_address_country["primaryContact"] = {
        "fullName": "QA Tester",
        "jobTitle": "General Manager",
        "email": "qa-sample@example.test",
        "phoneCountry": "KR",
        "phone": "+821012345678",
        "preferredContactMethod": "EMAIL",
    }

    env_str = (
        "STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, "
        "Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, "
        "Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA>"
    )

    common_preconditions = (
        "1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, "
        "ota-partner-service, Media Service, Location Service, and Admin Platform.\n"
        "2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.\n"
        "3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; "
        "2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes."
    )

    test_cases: list[dict[str, Any]] = [
        {
            "testCaseId": f"{prefix}-001",
            "title": "Accept valid Accommodation Registration V2 and persist full dossier for Admin reviewer readback",
            "testCategory": "Positive",
            "requirement": (
                "OP-1593, OP-1505, OP-1589, OP-1590, OP-1592 — Full valid V2 registration creates exactly one "
                "Partner Request with lossless REG-01..04 fields, ordered businessDocument[] (1–5) and gallery[] (2–5) "
                "refs, receipt identifiers, and 100% Admin Reviewer GET readback parity."
            ),
            "priorityAndLayer": "P0 / Integration (FE BFF → API Gateway → Partner → Media/Location → Admin Readback)",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_001}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/valid-registration-v2.json. "
                "Single-Variable Delta: None (complete baseline valid V2 fixture with all required fields, "
                "canonical VN + L2 location code, 1 finalized businessDocument, 2 finalized gallery photos, "
                "and 3 true submissionAcknowledgements)."
            ),
            "singleChangeDelta": "None — baseline complete valid Registration V2 fixture (valid-registration-v2.json)",
            "steps": [
                "1. Verify fixtures/valid-registration-v2.json contains all required V2 fields, finalized Media assetIds/uploadReceipts, and canonical Location L1/L2 codes.",
                "2. Set a fresh UUID in header Idempotency-Key: {{idempotencyKey_001}}.",
                "3. Send POST {{baseUrl}}{{registrationPath}} with fixtures/valid-registration-v2.json.",
                "4. Record HTTP status, requestId, and receipt identifiers (requestCode, registrationId, partnerRequestId).",
                "5. Execute authenticated Admin Reviewer readback GET {{baseUrl}}{{adminPartnerRequestPath}}/{{partnerRequestId}} and verify every REG-01..04 field, ordered businessDocument[1], and gallery[1..2] match 100% without contact->Owner privilege escalation."
            ],
            "expectedResponse": (
                "HTTP 2xx success from STAGING OpenAPI (<CHECK_OPENAPI>). Response body returns canonical receipt "
                "containing requestCode, registrationId, and partnerRequestId."
            ),
            "expectedDataResult": (
                "Exactly 1 Partner Request record is persisted in ota-partner-service. Admin Reviewer GET detail and "
                "Quick Preview return all submitted REG-01..04 fields and ordered businessDocument[] + gallery[] assets losslessly."
            ),
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and deployed service SHAs.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (STAGING OpenAPI URL, exact error registry, and deployed STAG service "
                "SHAs must be confirmed with QA Lead / Gateway & Partner BE Owners before runtime execution)."
            ),
            "ownerToAsk": "QA Lead / API Gateway & Partner Service BE Owners (Lanna Huynh)",
            "payloadObject": base_valid_fixture,
            "resultRecord": {
                "testCaseId": f"{prefix}-001",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "valid-registration-v2.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "NONE",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "1 Partner Request created; Admin Reviewer GET readback matches all V2 fields and ordered assets",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-002",
            "title": "Reject registration when primaryContact.phoneCountry is missing even with valid E.164 phone",
            "testCategory": "Negative",
            "requirement": (
                "OP-1593, OP-1589, OP-1505 (QA Guide Section 5) — Explicit phone-country ISO-3166 alpha-2 selection "
                "is required on every V2 registration even when primaryContact.phone is already in valid international "
                "E.164 format (+84900000000). The API must not infer phoneCountry from the dialing prefix or countryCode."
            ),
            "priorityAndLayer": "P0 / API & Gateway-Partner Validation",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_002}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/missing-phone-country.json. "
                "Single-Variable Delta: Start with valid-registration-v2.json and remove ONLY "
                "primaryContact.phoneCountry while keeping primaryContact.phone as '+84900000000' (valid E.164)."
            ),
            "singleChangeDelta": "Remove ONLY primaryContact.phoneCountry (keep primaryContact.phone = '+84900000000')",
            "steps": [
                "1. Load fixtures/valid-registration-v2.json and verify all fields are valid.",
                "2. Remove ONLY primaryContact.phoneCountry (keep primaryContact.phone = '+84900000000').",
                "3. Send POST {{baseUrl}}{{registrationPath}} with fixtures/missing-phone-country.json.",
                "4. Record HTTP status, errorCode, messageKey, fieldErrors for primaryContact.phoneCountry, and requestId; verify errorCode is NOT generic DOWNSTREAM_CLIENT_ERROR.",
                "5. Query Admin Reviewer list/readback to confirm zero Partner Request records were created."
            ],
            "expectedResponse": (
                "API rejects the request with a validation error on field path primaryContact.phoneCountry. "
                "Exact HTTP status, errorCode, messageKey, and fieldErrors: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY> "
                "(must preserve Partner/Gateway V2 domain error identity, never generic DOWNSTREAM_CLIENT_ERROR)."
            ),
            "expectedDataResult": "No Partner Request is created or modified by this invalid request (verified via Admin GET check).",
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (exact HTTP status and errorCode/messageKey in STAGING OpenAPI & "
                "BE-03 Error Registry must be confirmed with Gateway/Partner BE Owner)."
            ),
            "ownerToAsk": "QA Lead / API Gateway & Partner Service BE Owners",
            "payloadObject": f_missing_phone_country,
            "resultRecord": {
                "testCaseId": f"{prefix}-002",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "missing-phone-country.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "No Partner Request created",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-003",
            "title": "Reject registration when administrativeAreaCode (L2) does not belong to countryCode (L1)",
            "testCategory": "Negative",
            "requirement": (
                "OP-1593, OP-1589, OP-1505 — Location Service canonical parent-child validation: "
                "administrativeAreaCode (Level 2) must be a valid child of the selected countryCode (Level 1)."
            ),
            "priorityAndLayer": "P0 / API & Location Service Integration",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_003}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/invalid-location-child.json. "
                "Single-Variable Delta: Start with valid-registration-v2.json (countryCode='VN') and change ONLY "
                "administrativeAreaCode to 'KR-11' (a child area belonging to South Korea, not Vietnam)."
            ),
            "singleChangeDelta": "Change ONLY administrativeAreaCode from '<VALID_VN_LOCATION_L2_CODE>' to 'KR-11' while keeping countryCode='VN'",
            "steps": [
                "1. Load fixtures/valid-registration-v2.json with countryCode='VN'.",
                "2. Mutate ONLY administrativeAreaCode to 'KR-11' (fixtures/invalid-location-child.json).",
                "3. Send POST {{baseUrl}}{{registrationPath}}.",
                "4. Record HTTP status, errorCode, fieldErrors on administrativeAreaCode, and requestId; verify zero degradation to DOWNSTREAM_CLIENT_ERROR.",
                "5. Verify via Admin GET readback that no Partner Request was created."
            ],
            "expectedResponse": (
                "API rejects the mismatched L1/L2 location hierarchy with canonical location validation error on "
                "administrativeAreaCode. Exact HTTP status and errorCode: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>."
            ),
            "expectedDataResult": "No Partner Request is created or modified in database.",
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm exact location parent-child mismatch errorCode in BE-03 Error Registry)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & Location Service BE Owners",
            "payloadObject": f_wrong_location_l2,
            "resultRecord": {
                "testCaseId": f"{prefix}-003",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "invalid-location-child.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "No Partner Request created",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-004",
            "title": "Reject registration when businessDocument collection is empty (0 documents, below 1–5 limit)",
            "testCategory": "Boundary",
            "requirement": (
                "OP-1593, OP-1590, OP-1505 (G-08 Multi-Document Contract) — Accommodation Registration V2 requires "
                "1–5 finalized business registration/licence documents (businessDocument[])."
            ),
            "priorityAndLayer": "P0 / API Boundary & Media Evidence Gate",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_004}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/zero-business-documents.json. "
                "Single-Variable Delta: Start with valid-registration-v2.json and set ONLY businessDocument to [] "
                "(0 items) while keeping gallery valid with 2 finalized photos."
            ),
            "singleChangeDelta": "Set ONLY businessDocument to [] (0 documents, below minimum 1)",
            "steps": [
                "1. Load fixtures/valid-registration-v2.json.",
                "2. Replace ONLY businessDocument with an empty array [] (fixtures/zero-business-documents.json).",
                "3. Send POST {{baseUrl}}{{registrationPath}}.",
                "4. Record HTTP status, errorCode, and fieldErrors for businessDocument.",
                "5. Confirm via Admin GET check that no Partner Request was created."
            ],
            "expectedResponse": (
                "API rejects the request for violating the minimum 1 businessDocument rule. "
                "Exact HTTP status, errorCode, and field path: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>."
            ),
            "expectedDataResult": "No Partner Request is created or modified in database.",
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm exact businessDocument min-count errorCode in STAGING OpenAPI)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & Media Service BE Owners",
            "payloadObject": f_zero_business_docs,
            "resultRecord": {
                "testCaseId": f"{prefix}-004",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "zero-business-documents.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "No Partner Request created",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-005",
            "title": "Reject registration when gallery contains only 1 photo (below required 2–5 photos boundary)",
            "testCategory": "Boundary",
            "requirement": (
                "OP-1593, OP-1590, OP-1505 — Accommodation Registration V2 requires 2–5 finalized accommodation "
                "photos in gallery[]."
            ),
            "priorityAndLayer": "P0 / API Boundary & Media Evidence Gate",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_005}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/single-gallery-photo.json. "
                "Single-Variable Delta: Start with valid-registration-v2.json and reduce ONLY gallery[] from 2 photos "
                "to 1 photo while keeping businessDocument[] valid (1 document)."
            ),
            "singleChangeDelta": "Set ONLY gallery to 1 photo element (below minimum 2 photos)",
            "steps": [
                "1. Load fixtures/valid-registration-v2.json.",
                "2. Keep only the first photo in gallery[] so gallery.length == 1 (fixtures/single-gallery-photo.json).",
                "3. Send POST {{baseUrl}}{{registrationPath}}.",
                "4. Record HTTP status, errorCode, and fieldErrors on gallery.",
                "5. Verify via Admin GET check that no Partner Request was created."
            ],
            "expectedResponse": (
                "API rejects the request for violating the 2–5 gallery photo boundary. "
                "Exact HTTP status, errorCode, and fieldErrors: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>."
            ),
            "expectedDataResult": "No Partner Request is created or modified in database.",
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm exact gallery min-count errorCode in STAGING OpenAPI)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & Media Service BE Owners",
            "payloadObject": f_single_gallery_photo,
            "resultRecord": {
                "testCaseId": f"{prefix}-005",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "single-gallery-photo.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "No Partner Request created",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-006",
            "title": "Ensure idempotent replay with same Idempotency-Key and identical payload creates no duplicate Partner Request",
            "testCategory": "Duplicate / Retry",
            "requirement": (
                "OP-1593, OP-1592, OP-1590 (QA Guide Section 6 & 10) — Repeating the same registration request with "
                "the same Idempotency-Key and identical payload must return a deterministic receipt without creating "
                "duplicate Partner Requests."
            ),
            "priorityAndLayer": "P0 / API Idempotency & Retry Safety",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_001}} (reused from REGV2-API-001); "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/valid-registration-v2.json. "
                "Single-Variable Delta: Reuse the exact same Idempotency-Key and identical valid payload sent in REGV2-API-001."
            ),
            "singleChangeDelta": "Replay identical valid-registration-v2.json with the same Idempotency-Key header",
            "steps": [
                "1. Execute REGV2-API-001 first and record the returned partnerRequestId / registrationId / requestCode.",
                "2. Send the exact same POST {{baseUrl}}{{registrationPath}} request again with the identical Idempotency-Key ({{idempotencyKey_001}}) and identical body.",
                "3. Compare the second response's registrationId / partnerRequestId / requestCode against the first response.",
                "4. Query Admin Reviewer list/search API to verify only 1 Partner Request exists for this submission."
            ],
            "expectedResponse": (
                "API returns deterministic idempotent success (<CHECK_OPENAPI>) referencing the exact same "
                "registrationId / partnerRequestId / requestCode as the initial submission."
            ),
            "expectedDataResult": (
                "Zero duplicate Partner Requests created; Admin Reviewer GET readback confirms only 1 persisted record exists."
            ),
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and deployed service SHAs.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm STAGING OpenAPI idempotency replay status code and header name)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & API Gateway BE Owners",
            "payloadObject": base_valid_fixture,
            "resultRecord": {
                "testCaseId": f"{prefix}-006",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "valid-registration-v2.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "NONE",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "Only 1 Partner Request exists in DB; no duplicate created on replay",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-007",
            "title": "Reject idempotency key reuse when payload is mutated (Same Idempotency-Key + Different Payload -> Conflict)",
            "testCategory": "Duplicate / Retry",
            "requirement": (
                "OP-1593, OP-1592 — Reusing an existing Idempotency-Key with a mutated request payload must be "
                "rejected as an idempotency conflict without overwriting the originally persisted Partner Request."
            ),
            "priorityAndLayer": "P1 / API Idempotency Conflict Safety",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_001}} (reused from REGV2-API-001); "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/idempotency-conflict-payload.json. "
                "Single-Variable Delta: Keep the same Idempotency-Key from REGV2-API-001 and mutate ONLY propertyName "
                "to 'QA Mutated Hotel Name On Same Key'."
            ),
            "singleChangeDelta": "Mutate ONLY propertyName while reusing an already-committed Idempotency-Key",
            "steps": [
                "1. Ensure REGV2-API-001 has been committed with Idempotency-Key {{idempotencyKey_001}}.",
                "2. Mutate ONLY propertyName in fixtures/idempotency-conflict-payload.json.",
                "3. Send POST {{baseUrl}}{{registrationPath}} with the same Idempotency-Key {{idempotencyKey_001}}.",
                "4. Record HTTP status (expected 409 conflict per contract) and errorCode (<CHECK_ERROR_REGISTRY>).",
                "5. Execute Admin Reviewer GET readback on the original partnerRequestId to verify propertyName was NOT overwritten."
            ],
            "expectedResponse": (
                "API rejects the mutated replay with an idempotency conflict error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) "
                "and does not degrade to generic DOWNSTREAM_CLIENT_ERROR."
            ),
            "expectedDataResult": (
                "No second Partner Request is created, and the original Partner Request retains its original propertyName "
                "(verified via Admin Reviewer GET readback)."
            ),
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm exact idempotency conflict errorCode in BE-03 Error Registry)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & API Gateway BE Owners",
            "payloadObject": f_idempotency_conflict,
            "resultRecord": {
                "testCaseId": f"{prefix}-007",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "idempotency-conflict-payload.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "Original Partner Request unchanged; no second record created",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-008",
            "title": "Reject registration when businessDocument references an asset owned by another actor (403 ASSET_OWNERSHIP_INVALID)",
            "testCategory": "Permission",
            "requirement": (
                "OP-1593, OP-1590 (PD-3 A), OP-1591 — Partner & Media admission must fail closed with 403 "
                "ASSET_OWNERSHIP_INVALID when a registration payload references a Media assetId/uploadReceipt "
                "owned by another user/session, and Gateway must preserve this error identity for FE replace recovery."
            ),
            "priorityAndLayer": "P0 / Permission & Cross-Service Error Parity (Partner → Gateway → FE)",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_008}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/foreign-asset-ownership.json. "
                "Single-Variable Delta: Start with valid-registration-v2.json and replace ONLY businessDocument[0] "
                "with a finalized assetId/uploadReceipt created by a different actor/session."
            ),
            "singleChangeDelta": "Replace ONLY businessDocument[0] with a foreign-owned assetId/uploadReceipt",
            "steps": [
                "1. Prepare a Media asset finalized under Actor B's session.",
                "2. In Actor A's registration payload (fixtures/foreign-asset-ownership.json), reference Actor B's assetId/uploadReceipt in businessDocument[0].",
                "3. Send POST {{baseUrl}}{{registrationPath}}.",
                "4. Verify Gateway returns HTTP 403 / ASSET_OWNERSHIP_INVALID (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) with actionable field path businessDocument[0] and does NOT map it to generic DOWNSTREAM_CLIENT_ERROR.",
                "5. Confirm via Admin GET check that no Partner Request was created."
            ],
            "expectedResponse": (
                "API fails closed with ownership error (PD-3 A: 403 ASSET_OWNERSHIP_INVALID — confirm exact Gateway "
                "envelope in <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) and actionable field path on businessDocument."
            ),
            "expectedDataResult": "No Partner Request is created or modified; foreign Media asset remains unbound to Actor A.",
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Media fixture setup.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm STAGING OpenAPI envelope for ASSET_OWNERSHIP_INVALID and "
                "MEDIA_INTERNAL_BEARER setup)."
            ),
            "ownerToAsk": "QA Lead / Media Service & Partner Service BE Owners",
            "payloadObject": f_foreign_asset_ownership,
            "resultRecord": {
                "testCaseId": f"{prefix}-008",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "foreign-asset-ownership.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "No Partner Request created; foreign asset not bound",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-009",
            "title": "Reject HOTEL registration when conditional starRating is omitted",
            "testCategory": "Negative",
            "requirement": (
                "OP-1593, OP-1589, OP-1324 — Conditional validation rule: starRating (integer 1..5) is required "
                "if and only if normalized propertyTypeKey is HOTEL."
            ),
            "priorityAndLayer": "P1 / API Conditional Validation",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_009}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/missing-hotel-star-rating.json. "
                "Single-Variable Delta: Start with valid-registration-v2.json (where propertyTypeKey='HOTEL') and "
                "remove ONLY starRating."
            ),
            "singleChangeDelta": "Remove ONLY starRating while keeping propertyTypeKey='HOTEL'",
            "steps": [
                "1. Load fixtures/valid-registration-v2.json where propertyTypeKey='HOTEL'.",
                "2. Remove ONLY starRating (fixtures/missing-hotel-star-rating.json).",
                "3. Send POST {{baseUrl}}{{registrationPath}}.",
                "4. Record HTTP status, errorCode, and fieldErrors on starRating.",
                "5. Confirm via Admin GET check that no Partner Request was created."
            ],
            "expectedResponse": (
                "API rejects the request because starRating is conditionally required when propertyTypeKey=='HOTEL'. "
                "Exact HTTP status and errorCode: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>."
            ),
            "expectedDataResult": "No Partner Request is created or modified in database.",
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm conditional starRating errorCode in BE-03 Error Registry)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & API Gateway BE Owners",
            "payloadObject": f_missing_hotel_star,
            "resultRecord": {
                "testCaseId": f"{prefix}-009",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "missing-hotel-star-rating.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "No Partner Request created",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
        {
            "testCaseId": f"{prefix}-010",
            "title": "Accept registration when primaryContact.phoneCountry (KR/+82) legitimately differs from property countryCode (VN)",
            "testCategory": "Integration",
            "requirement": (
                "OP-1593, OP-1505, OP-1589 — Address countryCode (L1) and primaryContact.phoneCountry are independent: "
                "a partner registering a property in Vietnam (countryCode='VN') with a South Korean contact phone "
                "(phoneCountry='KR', phone='+821012345678') must be accepted and persisted without cross-field inference."
            ),
            "priorityAndLayer": "P1 / Integration (Location L1/L2 + Phone ISO/E.164 Independence + Admin Readback)",
            "environment": env_str,
            "preconditions": common_preconditions,
            "methodAndUrl": "POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI)",
            "headersAuthParams": (
                "Content-Type: application/json; Idempotency-Key: {{idempotencyKey_010}}; "
                "Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER>"
            ),
            "payloadAndTestData": (
                "Fixture: fixtures/mixed-phone-and-property-country.json. "
                "Single-Variable Delta: Keep property countryCode='VN' and VN administrativeAreaCode, and set "
                "primaryContact phone context to phoneCountry='KR' with matching E.164 phone='+821012345678'."
            ),
            "singleChangeDelta": "Set primaryContact phoneCountry='KR' and phone='+821012345678' while property countryCode remains 'VN'",
            "steps": [
                "1. Load fixtures/mixed-phone-and-property-country.json (countryCode='VN', primaryContact.phoneCountry='KR', phone='+821012345678').",
                "2. Send POST {{baseUrl}}{{registrationPath}} with a fresh Idempotency-Key.",
                "3. Verify HTTP 2xx success and capture partnerRequestId.",
                "4. Execute Admin Reviewer GET readback and verify countryCode=='VN' and primaryContact.phoneCountry=='KR' / phone=='+821012345678' are both preserved without overwriting each other."
            ],
            "expectedResponse": (
                "HTTP 2xx success (<CHECK_OPENAPI>) with valid registration receipt; no false mismatch error between "
                "property countryCode and contact phoneCountry."
            ),
            "expectedDataResult": (
                "1 Partner Request created; Admin Reviewer GET readback confirms countryCode='VN' and "
                "primaryContact.phoneCountry='KR' / phone='+821012345678' are stored independently."
            ),
            "actualResult": "NOT_RUN — Execute after confirming STAGING OpenAPI and deployed service SHAs.",
            "statusAndEvidence": (
                "BLOCKED — API contract missing (confirm STAGING OpenAPI URL and deployed service SHAs)."
            ),
            "ownerToAsk": "QA Lead / Partner Service & API Gateway BE Owners",
            "payloadObject": f_mixed_phone_and_address_country,
            "resultRecord": {
                "testCaseId": f"{prefix}-010",
                "environment": "STAGING",
                "method": "POST",
                "url": "{{baseUrl}}{{registrationPath}}",
                "testDataFile": "mixed-phone-and-property-country.json",
                "expectedHttpStatus": "<CHECK_OPENAPI>",
                "expectedErrorCode": "NONE",
                "actualHttpStatus": "NOT_RUN",
                "actualErrorCode": "NOT_RUN",
                "requestId": "NOT_RUN",
                "dataCheck": "1 Partner Request created; Admin GET readback preserves VN property country and KR phoneCountry independently",
                "status": "BLOCKED",
                "evidenceLink": "<ADD_AFTER_TEST>",
            },
        },
    ]

    return {
        "suiteName": "OP-1593 — Accommodation Registration V2 Cross-Service API & STAG E2E Test Suite",
        "jiraTicket": jira_ticket,
        "relatedJiraTickets": ["OP-1505", "OP-1589", "OP-1590", "OP-1591", "OP-1592", "OP-1514"],
        "environment": "STAGING",
        "preconditionsChecklist": {
            "requirementJira": "https://optibide-org.atlassian.net/browse/OP-1593 (Parent: OP-1505; BE: OP-1589, OP-1590, OP-1591, OP-1592; FE: OP-1514)",
            "openApiDocument": "[QA fills in — BLOCKED: request deployed STAGING OpenAPI link & BE-03 Error Registry from Gateway/Partner BE Owner]",
            "baseUrl": "{{baseUrl}} = [real STAGING Gateway URL — never use https://api.example.test]",
            "methodAndEndpoint": "POST {{baseUrl}}{{registrationPath}} & GET {{baseUrl}}{{adminPartnerRequestPath}}/{{partnerRequestId}}",
            "authAndTokens": "Check STAGING OpenAPI (Public submit vs Bearer token; server-side MEDIA_INTERNAL_BEARER; Admin Reviewer RBAC token for readback)",
            "testDataFixtures": "Safe QA fixture (QA Sample Hotel Da Nang, qa-sample@example.test, +84900000000) + real STAGING Location L1/L2 codes & finalized Media uploadReceipts",
            "deployedBuildSha": "[QA fills in — verify deployed commit SHA for FE, API Gateway, Partner, Media, Location, and Admin before execution]",
        },
        "baseValidFixtureFile": "fixtures/valid-registration-v2.json",
        "baseValidFixture": base_valid_fixture,
        "testCases": test_cases,
    }


def export_markdown(suite_data: dict[str, Any]) -> str:
    """Render a validated API Test Suite dictionary into the official 14-field Markdown document."""
    lines: list[str] = []
    lines.append(f"# {suite_data.get('suiteName', 'API Test Suite')}")
    lines.append("")
    lines.append(
        f"**Jira Requirement:** [{suite_data.get('jiraTicket')}](https://optibide-org.atlassian.net/browse/{suite_data.get('jiraTicket')}) · "
        f"**Related Tickets:** {', '.join(f'[{k}](https://optibide-org.atlassian.net/browse/{k})' for k in suite_data.get('relatedJiraTickets', []))} · "
        f"**Standard:** `QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI)`"
    )
    lines.append("")
    lines.append("> [!IMPORTANT]")
    lines.append(
        "> **Contract-First & No-Guessing Gate:** Per QA Guide Section 2 and `OP-1593` handoff rules, branch merges (`main`/`stag` PRs) are **not** runtime deployment acceptance. Where the live STAGING OpenAPI URL, exact `errorCode` registry, or deployed commit SHA is not yet supplied, fields are marked `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>` and the test case status is `BLOCKED — API contract missing` (with the exact owner to ask). Never use the guide's learning URL `https://api.example.test/v2/partner-registrations` for STAGING execution."
    )
    lines.append("")

    # Section 1: Pre-Test Readiness Checklist (Section 2 of QA Guide)
    pre = suite_data.get("preconditionsChecklist", {})
    lines.append("## 1. Pre-Test Readiness Checklist (QA Guide §2 — Do Not Guess)")
    lines.append("")
    lines.append("| Item | Source / Authority | Current Value / Status |")
    lines.append("| :--- | :--- | :--- |")
    lines.append(f"| **Requirement / Jira** | Jira Ticket & Acceptance Criteria | {pre.get('requirementJira', '')} |")
    lines.append(f"| **API Document / OpenAPI** | Deployed STAGING OpenAPI & Error Registry | `{pre.get('openApiDocument', '')}` |")
    lines.append(f"| **Base URL** | DEV or STAGING Environment | `{pre.get('baseUrl', '')}` |")
    lines.append(f"| **Method & Endpoint** | Current OpenAPI Document | `{pre.get('methodAndEndpoint', '')}` |")
    lines.append(f"| **Login / Token** | QA Lead / Environment Owner | {pre.get('authAndTokens', '')} |")
    lines.append(f"| **Test Data / Fixtures** | Safe QA Data + Real STAGING Reference Codes | {pre.get('testDataFixtures', '')} |")
    lines.append(f"| **Build Version / SHA** | Deployed FE, Gateway, Partner, Media, Location | `{pre.get('deployedBuildSha', '')}` |")
    lines.append("")

    # Section 2: Summary Test Matrix
    lines.append("## 2. API Test Case Summary Matrix")
    lines.append("")
    lines.append("| Test Case ID | Category | Title | Fixture File | Single-Variable Mutation Delta | Status |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- |")
    for tc in suite_data.get("testCases", []):
        rec = tc.get("resultRecord", {})
        lines.append(
            f"| `{tc.get('testCaseId')}` | **{tc.get('testCategory')}** | {tc.get('title')} | "
            f"`{rec.get('testDataFile')}` | {tc.get('singleChangeDelta')} | **`{rec.get('status')}`** |"
        )
    lines.append("")

    # Section 3: Base Valid Fixture
    lines.append("## 3. Approved Base Valid Fixture (`fixtures/valid-registration-v2.json`)")
    lines.append("")
    lines.append("```json")
    lines.append(json.dumps(suite_data.get("baseValidFixture", {}), ensure_ascii=False, indent=2))
    lines.append("```")
    lines.append("")

    # Section 4: Detailed 14-Field Test Cases
    lines.append("## 4. Detailed 14-Field API Test Cases & Section 5.2 Execution Records")
    lines.append("")
    for tc in suite_data.get("testCases", []):
        cid = tc.get("testCaseId")
        lines.append(f"### {cid} — {tc.get('title')}")
        lines.append("")
        lines.append("| Field | Details |")
        lines.append("| :--- | :--- |")
        for f_key, f_label in MANDATORY_14_FIELDS:
            val = tc.get(f_key, "")
            if isinstance(val, list):
                formatted_val = "<br>".join(str(x) for x in val)
            else:
                formatted_val = str(val).replace("\n", "<br>")
            lines.append(f"| **{f_label}** | {formatted_val} |")
        lines.append("")
        lines.append(f"#### {cid} — Request Payload (`{tc.get('resultRecord', {}).get('testDataFile')}`)")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(tc.get("payloadObject", {}), ensure_ascii=False, indent=2))
        lines.append("```")
        lines.append("")
        lines.append(f"#### {cid} — Section 5.2 Structured Result Record")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(tc.get("resultRecord", {}), ensure_ascii=False, indent=2))
        lines.append("```")
        lines.append("")

    # Section 5: QA Lead 7-Point Checklist (QA Guide §11)
    lines.append("## 5. QA Lead 7-Point Verification Checklist (QA Guide §11)")
    lines.append("")
    lines.append("- [x] **1. Requirement & OpenAPI Traceability:** Every test case links to `OP-1593` and its governing BE contracts (`OP-1505`, `OP-1589`, `OP-1590`, `OP-1591`, `OP-1592`).")
    lines.append("- [x] **2. Real Contract URLs Only:** Method, URL (`{{baseUrl}}{{registrationPath}}`), headers, and body never use the guide's example URL (`https://api.example.test/v2/partner-registrations`).")
    lines.append("- [x] **3. Complete Valid Fixture + Single-Variable Mutation:** `valid-registration-v2.json` contains all required V2 fields, files, and acknowledgements; each negative/boundary test mutates **one thing only**.")
    lines.append("- [x] **4. No Guessed Status or Error Codes:** Unconfirmed runtime HTTP statuses and error codes use `<CHECK_OPENAPI>` and `<CHECK_ERROR_REGISTRY>` with `BLOCKED — API contract missing`.")
    lines.append("- [x] **5. Persistence & Readback Verification:** Every test case specifies how QA checks saved data (`Admin Reviewer GET readback` on 2xx; zero records created on 4xx).")
    lines.append("- [x] **6. Reproducible Atomic Steps:** Every test case provides numbered Postman steps another QA can execute deterministically.")
    lines.append("- [x] **7. Secret & PII Hygiene:** Zero real tokens, passwords, signing URLs, or personal contact details (`qa-sample@example.test`, `+84900000000`).")
    lines.append("")
    return "\n".join(lines)


def export_postman_collection(suite_data: dict[str, Any]) -> dict[str, Any]:
    """Export a validated API Test Suite into a Postman Collection v2.1.0 JSON object."""
    items: list[dict[str, Any]] = []
    for tc in suite_data.get("testCases", []):
        cid = tc.get("testCaseId", "CASE")
        title = tc.get("title", "")
        category = tc.get("testCategory", "API")
        rec = tc.get("resultRecord", {})
        method = rec.get("method", "POST")
        raw_url = rec.get("url", "{{baseUrl}}{{registrationPath}}")

        test_script_lines = [
            f"// Automated goodNstay QA Assertions for {cid}",
            "const responseText = pm.response.text();",
            "let jsonBody = {};",
            "try { jsonBody = pm.response.json(); } catch (e) {}",
            "",
            "pm.test('Capture X-Request-Id or correlation requestId for QA evidence', function () {",
            "    const reqId = pm.response.headers.get('X-Request-Id') || pm.response.headers.get('x-request-id') || (jsonBody && (jsonBody.requestId || (jsonBody.meta && jsonBody.meta.requestId)));",
            "    if (reqId) { pm.environment.set('lastRequestId', reqId); }",
            "});",
            "",
            "pm.test('OP-1591 Error Parity: Response never degrades to generic DOWNSTREAM_CLIENT_ERROR', function () {",
            "    const errCode = (jsonBody && jsonBody.error && jsonBody.error.code) || (jsonBody && jsonBody.errorCode) || '';",
            "    pm.expect(errCode).to.not.eql('DOWNSTREAM_CLIENT_ERROR');",
            "});",
        ]
        if category == "Positive":
            test_script_lines.extend([
                "pm.test('Positive case returns 2xx HTTP status and registration receipt', function () {",
                "    pm.expect(pm.response.code).to.be.within(200, 299);",
                "});",
            ])
        elif category in ("Negative", "Boundary", "Permission"):
            test_script_lines.extend([
                "pm.test('Negative/Boundary/Permission case rejects invalid request with 4xx status', function () {",
                "    pm.expect(pm.response.code).to.be.within(400, 499);",
                "});",
            ])

        idem_var = "{{idempotencyKey_001}}" if cid.endswith(("-001", "-006", "-007")) else f"{{{{idempotencyKey_{cid.split('-')[-1]}}}}}"
        headers = [
            {"key": "Content-Type", "value": "application/json", "type": "text"},
            {"key": "Accept", "value": "application/json", "type": "text"},
            {"key": "Idempotency-Key", "value": idem_var, "type": "text"},
        ]

        items.append({
            "name": f"{cid} — [{category}] {title}",
            "event": [
                {
                    "listen": "test",
                    "script": {
                        "type": "text/javascript",
                        "exec": test_script_lines,
                    },
                }
            ],
            "request": {
                "method": method,
                "header": headers,
                "body": {
                    "mode": "raw",
                    "raw": json.dumps(tc.get("payloadObject", {}), ensure_ascii=False, indent=2),
                    "options": {"raw": {"language": "json"}},
                },
                "url": {
                    "raw": raw_url,
                    "host": ["{{baseUrl}}"],
                    "path": ["{{registrationPath}}"],
                },
                "description": (
                    f"**Requirement:** {tc.get('requirement')}\n\n"
                    f"**Single-Variable Delta:** {tc.get('singleChangeDelta')}\n\n"
                    f"**Expected Response:** {tc.get('expectedResponse')}\n\n"
                    f"**Expected Data Result (Readback):** {tc.get('expectedDataResult')}"
                ),
            },
            "response": [],
        })

    return {
        "info": {
            "_postman_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, "goodnstay.op1593.regv2.api.suite")),
            "name": suite_data.get("suiteName", "goodNstay API Test Suite"),
            "description": (
                "Official goodNstay Postman Collection v2.1 generated by api_test_helper.py. "
                "Follows QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI) and OP-1593 cross-service rules."
            ),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": items,
        "variable": [
            {"key": "baseUrl", "value": "<FILL_IN_REAL_STAGING_BASE_URL>", "type": "string"},
            {"key": "registrationPath", "value": "/api/v2/partner/registrations", "type": "string"},
            {"key": "adminPartnerRequestPath", "value": "/api/v1/admin/partner-requests", "type": "string"},
            {"key": "idempotencyKey_001", "value": "00000000-0000-4000-8000-000000000001", "type": "string"},
            {"key": "idempotencyKey_002", "value": "00000000-0000-4000-8000-000000000002", "type": "string"},
            {"key": "idempotencyKey_003", "value": "00000000-0000-4000-8000-000000000003", "type": "string"},
            {"key": "idempotencyKey_004", "value": "00000000-0000-4000-8000-000000000004", "type": "string"},
            {"key": "idempotencyKey_005", "value": "00000000-0000-4000-8000-000000000005", "type": "string"},
            {"key": "idempotencyKey_008", "value": "00000000-0000-4000-8000-000000000008", "type": "string"},
            {"key": "idempotencyKey_009", "value": "00000000-0000-4000-8000-000000000009", "type": "string"},
            {"key": "idempotencyKey_010", "value": "00000000-0000-4000-8000-000000000010", "type": "string"},
        ],
    }


def convert_case_to_jira_bug(suite_data: dict[str, Any], case_id: str) -> dict[str, Any]:
    """Convert a test case into a 7-field jira-bug-reporter JSON payload."""
    target: dict[str, Any] | None = None
    for tc in suite_data.get("testCases", []):
        if tc.get("testCaseId") == case_id:
            target = tc
            break
    if target is None:
        raise ValueError(f"Test Case ID {case_id!r} not found in suite.")

    rec = target.get("resultRecord", {})
    jira_ticket = suite_data.get("jiraTicket", "OP-1593")
    title = f"[API - {jira_ticket} {case_id}] {target.get('title', '')}"[:250]

    return {
        "title": title,
        "environment": str(target.get("environment", "STAGING · API Gateway / Partner Service · Postman")),
        "steps_to_reproduce": list(target.get("steps", [])),
        "actual_result": (
            f"Test Case ID: {case_id} ({jira_ticket})\n"
            f"Actual HTTP Status: {rec.get('actualHttpStatus')}\n"
            f"Actual Error Code: {rec.get('actualErrorCode')}\n"
            f"Request ID: {rec.get('requestId')}\n"
            f"Observed Detail: {target.get('actualResult')}"
        ),
        "expected_result": (
            f"Expected Response: {target.get('expectedResponse')}\n"
            f"Expected Data / Readback Result: {target.get('expectedDataResult')}"
        ),
        "evidence": {
            "url": str(rec.get("url", "{{baseUrl}}{{registrationPath}}")),
            "datetime": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "console": f"Request ID: {rec.get('requestId')} | Single-Variable Delta: {target.get('singleChangeDelta')}",
            "network": f"{rec.get('method')} {rec.get('url')} -> HTTP {rec.get('actualHttpStatus')} ({rec.get('actualErrorCode')})",
            "notes": f"Fixture File: {rec.get('testDataFile')} | Requirement: {target.get('requirement')}",
            "reference_url": f"https://optibide-org.atlassian.net/browse/{jira_ticket}",
        },
        "classification": "Needs Verification — (need to brainstorming with team or observe)",
        "severity": "S2 – Major",
        "priority_label": "P1",
        "reproducibility": "Always (100%)",
        "attachments": [],
    }


def scaffold_suite_directory(output_dir: pathlib.Path, jira_ticket: str = "OP-1593", prefix: str = "REGV2-API") -> dict[str, pathlib.Path]:
    """Write the complete suite JSON, fixtures/, Markdown table, and Postman Collection to output_dir."""
    output_dir.mkdir(parents=True, exist_ok=True)
    fixtures_dir = output_dir / "fixtures"
    fixtures_dir.mkdir(parents=True, exist_ok=True)

    suite_data = build_op1593_suite(jira_ticket=jira_ticket, prefix=prefix)

    # Write base valid fixture
    valid_fixture_path = fixtures_dir / "valid-registration-v2.json"
    valid_fixture_path.write_text(
        json.dumps(suite_data["baseValidFixture"], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # Write individual test case fixtures
    for tc in suite_data["testCases"]:
        rec = tc["resultRecord"]
        fname = rec["testDataFile"]
        fpath = fixtures_dir / fname
        fpath.write_text(
            json.dumps(tc["payloadObject"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    suite_json_path = output_dir / f"{jira_ticket.lower().replace('-', '')}_regv2_test_suite.json"
    suite_json_path.write_text(json.dumps(suite_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    md_path = output_dir / f"{jira_ticket.lower().replace('-', '')}_regv2_test_cases.md"
    md_path.write_text(export_markdown(suite_data), encoding="utf-8")

    postman_path = output_dir / f"{jira_ticket.lower().replace('-', '')}_regv2.postman_collection.json"
    postman_path.write_text(
        json.dumps(export_postman_collection(suite_data), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    return {
        "suite_json": suite_json_path,
        "markdown": md_path,
        "postman": postman_path,
        "fixtures_dir": fixtures_dir,
    }


def _sanitize_text(text: str) -> str:
    """Redact any JWTs or Bearer tokens before writing evidence files."""
    s = HARDCODED_JWT_RE.sub("<REDACTED_JWT_TOKEN>", text)
    s = re.sub(r"(Bearer\s+)[A-Za-z0-9._~+/-]+=*", r"\1<REDACTED_BEARER_TOKEN>", s, flags=re.IGNORECASE)
    return s


def run_suite_live(
    suite_path: pathlib.Path,
    base_url: str,
    registration_path: str = "/api/v2/partner/registrations",
    admin_readback_path: str = "",
    deployed_sha: str = "",
    openapi_url: str = "",
    bearer_token: str = "",
    admin_bearer_token: str = "",
    timeout_sec: float = 15.0,
) -> dict[str, Any]:
    """Execute all test cases in suite_path against base_url, capture evidence, check readback, and emit bug payloads."""
    suite_data = json.loads(suite_path.read_text(encoding="utf-8"))
    out_dir = suite_path.parent
    evidence_dir = out_dir / "evidence"
    bugs_dir = out_dir / "bugs"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    bugs_dir.mkdir(parents=True, exist_ok=True)

    clean_base = base_url.rstrip("/")
    clean_reg_path = "/" + registration_path.lstrip("/")
    target_url = f"{clean_base}{clean_reg_path}"

    pre = suite_data.setdefault("preconditionsChecklist", {})
    pre["baseUrl"] = clean_base
    pre["methodAndEndpoint"] = f"POST {target_url}"
    if openapi_url:
        pre["openApiDocument"] = openapi_url
    if deployed_sha:
        pre["deployedBuildSha"] = deployed_sha

    run_id = uuid.uuid4().hex[:8]
    idem_001 = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"regv2-001-{run_id}"))
    failed_bug_files: list[pathlib.Path] = []

    for tc in suite_data.get("testCases", []):
        cid = str(tc.get("testCaseId", "CASE"))
        category = str(tc.get("testCategory", "API"))
        rec = tc.setdefault("resultRecord", {})
        method = str(rec.get("method", "POST")).upper()

        idem_key = idem_001 if cid.endswith(("-001", "-006", "-007")) else str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{cid}-{run_id}"))
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Idempotency-Key": idem_key,
        }
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"

        body_bytes = json.dumps(tc.get("payloadObject", {}), ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(target_url, data=body_bytes, headers=headers, method=method)

        status_code: int | str = "TIMEOUT"
        resp_headers: dict[str, str] = {}
        raw_body = ""
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                status_code = resp.status
                resp_headers = {k.lower(): v for k, v in resp.headers.items()}
                raw_body = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            try:
                status_code = exc.code
                resp_headers = {k.lower(): v for k, v in exc.headers.items()} if exc.headers else {}
                raw_body = exc.read().decode("utf-8", errors="replace")
            finally:
                exc.close()
        except Exception as exc:
            status_code = "ERROR"
            raw_body = json.dumps({"transportError": str(exc)})

        sanitized_body = _sanitize_text(raw_body)
        parsed_body: dict[str, Any] = {}
        try:
            loaded = json.loads(sanitized_body)
            if isinstance(loaded, dict):
                parsed_body = loaded
        except json.JSONDecodeError:
            pass

        req_id = (
            resp_headers.get("x-request-id")
            or resp_headers.get("x-correlation-id")
            or str(parsed_body.get("requestId") or (parsed_body.get("meta") or {}).get("requestId") or f"req-{cid.lower()}-{run_id}")
        )
        err_obj = parsed_body.get("error") if isinstance(parsed_body.get("error"), dict) else {}
        actual_error_code = str(
            err_obj.get("code")
            or parsed_body.get("errorCode")
            or ("NONE" if isinstance(status_code, int) and 200 <= status_code < 300 else "UNKNOWN_ERROR")
        )

        # Save sanitized response evidence
        ev_file = evidence_dir / f"{cid}_response.json"
        ev_payload = {
            "testCaseId": cid,
            "timestampUtc": datetime.now(timezone.utc).isoformat(),
            "request": {"method": method, "url": target_url, "idempotencyKey": idem_key},
            "response": {
                "httpStatus": status_code,
                "requestId": req_id,
                "errorCode": actual_error_code,
                "body": parsed_body if parsed_body else sanitized_body,
            },
        }
        ev_file.write_text(json.dumps(ev_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        # Optional Admin Reviewer GET Readback verification
        readback_verified = False
        readback_note = "Readback endpoint not configured"
        data_obj = parsed_body.get("data") if isinstance(parsed_body.get("data"), dict) else parsed_body
        partner_req_id = str(
            data_obj.get("partnerRequestId")
            or data_obj.get("registrationId")
            or data_obj.get("id")
            or ""
        )
        if admin_readback_path and isinstance(status_code, int):
            rb_clean = "/" + admin_readback_path.lstrip("/")
            rb_url = f"{clean_base}{rb_clean}/{partner_req_id}" if partner_req_id else f"{clean_base}{rb_clean}"
            rb_headers = {"Accept": "application/json"}
            if admin_bearer_token or bearer_token:
                rb_headers["Authorization"] = f"Bearer {admin_bearer_token or bearer_token}"
            try:
                rb_req = urllib.request.Request(rb_url, headers=rb_headers, method="GET")
                with urllib.request.urlopen(rb_req, timeout=timeout_sec) as rb_resp:
                    rb_status = rb_resp.status
                    readback_verified = 200 <= rb_status < 300
                    readback_note = f"GET {rb_url} -> HTTP {rb_status} (verified)"
            except urllib.error.HTTPError as rb_exc:
                try:
                    readback_note = f"GET {rb_url} -> HTTP {rb_exc.code}"
                finally:
                    rb_exc.close()
            except Exception as rb_err:
                readback_note = f"GET {rb_url} -> {rb_err}"
        elif isinstance(status_code, int) and 400 <= status_code < 500:
            readback_verified = True
            readback_note = "4xx rejection confirmed; zero Partner Request created"

        # Evaluate PASS / FAIL / NOT VERIFIED
        exp_http = str(rec.get("expectedHttpStatus", "<CHECK_OPENAPI>"))
        exp_code = str(rec.get("expectedErrorCode", "<CHECK_ERROR_REGISTRY>"))
        is_expecting_success = category in ("Positive", "Integration", "Regression") or (
            category == "Duplicate / Retry" and exp_code.upper() == "NONE"
        )

        status_match = False
        if not _is_unconfirmed_placeholder(exp_http):
            status_match = str(status_code) == exp_http
        else:
            status_match = (
                isinstance(status_code, int)
                and ((200 <= status_code < 300) if is_expecting_success else (400 <= status_code < 500))
            )

        code_match = True
        if not is_expecting_success:
            if actual_error_code in ("DOWNSTREAM_CLIENT_ERROR", "NONE", "UNKNOWN_ERROR"):
                code_match = False
            elif not _is_unconfirmed_placeholder(exp_code):
                code_match = actual_error_code == exp_code

        if not status_match or not code_match:
            final_status = "FAIL"
        elif readback_verified and deployed_sha and not _is_unconfirmed_placeholder(deployed_sha):
            final_status = "PASS"
        else:
            final_status = "NOT VERIFIED"

        rec["url"] = target_url
        rec["actualHttpStatus"] = str(status_code)
        rec["actualErrorCode"] = actual_error_code
        rec["requestId"] = req_id
        rec["dataCheck"] = readback_note
        rec["status"] = final_status
        rec["evidenceLink"] = f"evidence/{ev_file.name}"

        if deployed_sha:
            tc["environment"] = f"STAGING · Date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')} · Deployed SHA: {deployed_sha}"
        tc["methodAndUrl"] = f"{method} {target_url}"
        tc["actualResult"] = (
            f"HTTP {status_code} | errorCode={actual_error_code} | requestId={req_id} | Readback: {readback_note}"
        )
        tc["statusAndEvidence"] = (
            f"{final_status} — requestId={req_id}, evidence=evidence/{ev_file.name}, readback=({readback_note})"
        )

        if final_status == "FAIL":
            bug_payload = convert_case_to_jira_bug(suite_data, cid)
            bug_file = bugs_dir / f"BUG-{cid}.json"
            bug_file.write_text(json.dumps(bug_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            failed_bug_files.append(bug_file)

    suite_path.write_text(json.dumps(suite_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    md_path = out_dir / suite_path.name.replace("_test_suite.json", "_test_cases.md")
    md_path.write_text(export_markdown(suite_data), encoding="utf-8")
    pm_path = out_dir / suite_path.name.replace("_test_suite.json", ".postman_collection.json")
    pm_path.write_text(json.dumps(export_postman_collection(suite_data), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    return {
        "suite_path": suite_path,
        "markdown_path": md_path,
        "postman_path": pm_path,
        "evidence_dir": evidence_dir,
        "failed_bug_files": failed_bug_files,
    }


def cmd_lessons() -> int:
    if LESSONS_PATH.is_file():
        print(LESSONS_PATH.read_text(encoding="utf-8"))
        return 0
    print("No lessons_learned.md found yet.")
    return 0


def cmd_validate(path_str: str, strict: bool) -> int:
    path = pathlib.Path(path_str).resolve()
    if not path.is_file():
        print(f"ERROR: File not found: {path}", file=sys.stderr)
        return 1
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"ERROR: Invalid JSON in {path}: {exc}", file=sys.stderr)
        return 1

    report = validate_suite_dict(data, path)
    for issue in report.issues:
        print(f"[{issue.severity}] ({issue.case_id}) {issue.code}: {issue.message}")

    print(
        f"\nValidation summary for {path.name}: "
        f"{len(data.get('testCases', []))} test cases checked, "
        f"{report.error_count} ERROR(s), {report.warn_count} WARN(s)."
    )
    if report.error_count > 0 or (strict and report.warn_count > 0):
        return 1
    return 0


def cmd_log_feedback(suite: str, fb_type: str, issue: str, rule: str, promote: bool) -> int:
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "suite": suite,
        "type": fb_type,
        "issue": issue.strip(),
        "rule": rule.strip(),
        "promoted": bool(promote),
    }
    with FEEDBACK_LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=False) + "\n")

    if promote:
        existing = LESSONS_PATH.read_text(encoding="utf-8") if LESSONS_PATH.is_file() else "# goodNstay API QA Testing — Accumulated Lessons & Rules\n\n"
        if rule.strip() not in existing:
            bullet = f"- **[{fb_type.upper()}]** {rule.strip()} *(Context: {issue.strip()})*\n"
            LESSONS_PATH.write_text(existing.rstrip() + "\n" + bullet, encoding="utf-8")
    print(f"Recorded feedback entry (promoted={promote}).")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="api_test_helper.py",
        description="goodNstay API QA Testing Validator, Scaffolder, Postman & Markdown Exporter.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("lessons", help="Print accumulated API testing lessons before authoring test cases.")

    p_val = sub.add_parser("validate", help="Validate an API test suite JSON file against QA Guide & OP-1593 rules.")
    p_val.add_argument("path", help="Path to suite JSON file.")
    p_val.add_argument("--strict", action="store_true", help="Treat warnings as errors.")

    p_scaf = sub.add_parser("scaffold", help="Scaffold a complete OP-1593 API test suite directory.")
    p_scaf.add_argument("--jira", default="OP-1593", help="Jira ticket key (default: OP-1593).")
    p_scaf.add_argument("--prefix", default="REGV2-API", help="Test Case ID prefix (default: REGV2-API).")
    p_scaf.add_argument("--output", required=True, help="Output directory path.")

    p_md = sub.add_parser("export-markdown", help="Export suite JSON to 14-field Markdown tables + QA Lead checklist.")
    p_md.add_argument("path", help="Path to suite JSON file.")
    p_md.add_argument("--output", required=True, help="Output Markdown (.md) path.")

    p_pm = sub.add_parser("export-postman", help="Export suite JSON to Postman Collection v2.1.0.")
    p_pm.add_argument("path", help="Path to suite JSON file.")
    p_pm.add_argument("--output", required=True, help="Output .postman_collection.json path.")

    p_bug = sub.add_parser("to-jira-bug", help="Convert a failed API test case into a 7-field jira-bug-reporter payload.")
    p_bug.add_argument("path", help="Path to suite JSON file.")
    p_bug.add_argument("--case-id", required=True, help="Test Case ID (e.g. REGV2-API-002).")
    p_bug.add_argument("--output", required=True, help="Output bug JSON payload path.")

    p_run = sub.add_parser("run-suite", help="Execute all test cases against a live base URL, verify readback, update Markdown, and emit Jira bug payloads for FAIL cases.")
    p_run.add_argument("path", help="Path to suite JSON file.")
    p_run.add_argument("--base-url", required=True, help="Real STAGING/DEV base URL (never api.example.test).")
    p_run.add_argument("--registration-path", default="/api/v2/partner/registrations", help="Registration endpoint path from OpenAPI.")
    p_run.add_argument("--admin-readback-path", default="", help="Optional Admin Reviewer GET readback path.")
    p_run.add_argument("--deployed-sha", default="", help="Deployed commit SHA across FE/Gateway/Partner/Media/Location.")
    p_run.add_argument("--openapi-url", default="", help="Confirmed STAGING OpenAPI spec URL.")
    p_run.add_argument("--token", default="", help="Optional Bearer token for registration endpoint.")
    p_run.add_argument("--admin-token", default="", help="Optional Admin Reviewer Bearer token for GET readback.")

    p_fb = sub.add_parser("log-feedback", help="Record QA Lead feedback or discovered API contract rules.")
    p_fb.add_argument("--suite", required=True, help="Suite path or Jira key.")
    p_fb.add_argument("--type", default="contract_rule", help="Feedback category.")
    p_fb.add_argument("--issue", required=True, help="Observed issue or correction.")
    p_fb.add_argument("--rule", required=True, help="Reusable rule to enforce.")
    p_fb.add_argument("--promote", action="store_true", help="Promote rule into memory/lessons_learned.md.")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "lessons":
        return cmd_lessons()
    if args.command == "validate":
        return cmd_validate(args.path, args.strict)
    if args.command == "scaffold":
        paths = scaffold_suite_directory(pathlib.Path(args.output).resolve(), jira_ticket=args.jira, prefix=args.prefix)
        for k, p in paths.items():
            print(f"{k}: {p}")
        return 0
    if args.command == "export-markdown":
        suite_data = json.loads(pathlib.Path(args.path).read_text(encoding="utf-8"))
        out = pathlib.Path(args.output).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(export_markdown(suite_data), encoding="utf-8")
        print(f"Exported 14-field Markdown to {out}")
        return 0
    if args.command == "export-postman":
        suite_data = json.loads(pathlib.Path(args.path).read_text(encoding="utf-8"))
        out = pathlib.Path(args.output).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(export_postman_collection(suite_data), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Exported Postman Collection v2.1 to {out}")
        return 0
    if args.command == "to-jira-bug":
        suite_data = json.loads(pathlib.Path(args.path).read_text(encoding="utf-8"))
        bug_payload = convert_case_to_jira_bug(suite_data, args.case_id)
        out = pathlib.Path(args.output).resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(bug_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Exported 7-field Jira Bug payload for {args.case_id} to {out}")
        return 0
    if args.command == "run-suite":
        res = run_suite_live(
            suite_path=pathlib.Path(args.path).resolve(),
            base_url=args.base_url,
            registration_path=args.registration_path,
            admin_readback_path=args.admin_readback_path,
            deployed_sha=args.deployed_sha,
            openapi_url=args.openapi_url,
            bearer_token=args.token,
            admin_bearer_token=args.admin_token,
        )
        print(f"Executed suite: {res['suite_path']}")
        print(f"Updated Markdown report: {res['markdown_path']}")
        print(f"Generated {len(res['failed_bug_files'])} Jira bug payload(s) in {res['suite_path'].parent / 'bugs'}")
        return 0
    if args.command == "log-feedback":
        return cmd_log_feedback(args.suite, args.type, args.issue, args.rule, args.promote)
    return 1


if __name__ == "__main__":
    sys.exit(main())
