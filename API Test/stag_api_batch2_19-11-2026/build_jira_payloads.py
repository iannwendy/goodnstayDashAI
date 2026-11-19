#!/usr/bin/env python3
"""Generate 7-Field + 12-Custom-Field OP Jira Bug Payloads for Batch 2 (BUG-API-07 .. BUG-API-12)."""

from __future__ import annotations

import json
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent
OUT_DIR = BASE_DIR / "json_payloads"
OUT_DIR.mkdir(parents=True, exist_ok=True)

COMMON_JIRA_FIELDS = {
    "customfield_10038": [{"id": "10025"}],
    "customfield_10039": [{"id": "10033"}],
}

BUGS = [
    (
        "BUG-API-07",
        {
            "title": "[Accommodation Request API - POST /api/traveler/request-bids] 200 OK Room-Request Response Serializes Sensitive User Columns in data.customerRequest.user",
            "environment": "Staging (STAG) · Strapi Backend API & Desktop 1440×900 · Chrome · en-US · FE=turbopack-2h-u0he6dowwt, BE=<CHECK_DEPLOYED_SHA> (https://web.stag.goodnstay.com/en-US/accommodation)",
            "test_account": "Signed-In QA Traveler Session on Staging (Authorization: Bearer <REDACTED_QA_TOKEN>)",
            "steps_to_reproduce": [
                "Prepare the complete valid room-request baseline fixture (fixtures/valid-request-bids.json) using sanitized QA data (QA Tester, qa-sample@example.test, +84900000000, KR / KR-11, guestCount=2, roomCount=1).",
                "Send POST https://services.stag.goodnstay.com/api/traveler/request-bids with Authorization: Bearer <REDACTED_QA_TOKEN>.",
                "Inspect the HTTP 200 OK JSON response body keys inside data.customerRequest.user.",
                "Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to confirm saved record #1536, then cancel test record #1536."
            ],
            "actual_result": "- POST /api/traveler/request-bids returns HTTP 200 OK creating Customer Request #1536, and embeds the unredacted Strapi up_users entity inside data.customerRequest.user containing sensitive internal columns:\n  • data.customerRequest.user.password (\"<REDACTED_HASH>\")\n  • data.customerRequest.user.resetPasswordToken\n  • data.customerRequest.user.confirmationToken",
            "expected_result": "- Per API Standard (Confluence 524593) and DTO Response Sanitization rules, 2xx room-request creation responses must return only public receipt fields and must never serialize internal credential/token columns (password, resetPasswordToken, confirmationToken) over the network.\n- Customer Request record is persisted and verified via GET /api/customer-requests readback.",
            "evidence": {
                "url": "https://web.stag.goodnstay.com/en-US/accommodation",
                "datetime": "19/11/2026 13:58 ICT",
                "console": "Test Case STAG-API-203 (Positive DTO Sanitization) | Single-Variable Delta: None — valid baseline fixture | Test record #1536 cancelled after readback.",
                "network": "POST https://services.stag.goodnstay.com/api/traveler/request-bids (fixtures/valid-request-bids.json) -> HTTP 200 OK exposing data.customerRequest.user.{password, resetPasswordToken, confirmationToken}.",
                "notes": "Frontend chunk 452btq2-mvhin.js calls POST /api/traveler/request-bids. Strapi custom controller populates and returns the full up_users relation without applying sanitizeOutput / explicit DTO field selection. | Security Classification: OWASP A04:2025 Cryptographic Failures & A01:2025 (CWE-201) · OWASP API3:2023 Broken Object Property Level Authorization (Excessive Data Exposure) | OWASP Remediation: Apply explicit DTO response allow-listing or Strapi contentAPI.sanitize.output before returning customerRequest payloads (https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).",
                "reference_url": "https://optibide-org.atlassian.net/wiki/spaces/O/pages/524593",
            },
            "classification": "Confirmed Bug — POST /api/traveler/request-bids 200 OK Response Serializes Internal up_users Credential Columns",
            "severity": "S1 – Critical",
            "priority_label": "P0",
            "reproducibility": "Always (100% — reproduced on every valid room-request submission on STAG)",
            "jira_fields": COMMON_JIRA_FIELDS,
            "attachments": ["../screenshots/bug_api07_request_bids_response_user_columns_1440x900.png"],
        },
    ),
    (
        "BUG-API-08",
        {
            "title": "[Customer Requests API - GET /api/customer-requests] Logged-Out Bearer Token Continues Returning Customer Requests (HTTP 200 OK) After POST /api/traveler/logout",
            "environment": "Staging (STAG) · Strapi Backend API & Desktop 1440×900 · Chrome · en-US · FE=turbopack-2h-u0he6dowwt, BE=<CHECK_DEPLOYED_SHA> (https://web.stag.goodnstay.com/en-US/accommodation)",
            "test_account": "Isolated QA Traveler Session Invalidated via POST /api/traveler/logout (<REDACTED_LOGGED_OUT_QA_TOKEN>)",
            "steps_to_reproduce": [
                "Authenticate an isolated QA Traveler session via POST https://services.stag.goodnstay.com/api/traveler/login.",
                "Invalidate that session via POST https://services.stag.goodnstay.com/api/traveler/logout -> returns HTTP 200 OK ({\"success\": true, \"message\": \"Logged out successfully.\"}).",
                "Verify session revocation baseline on custom Traveler routes: GET /api/traveler/me -> HTTP 401 ('You are not logged in.') and PUT /api/customer-requests/:id -> HTTP 401.",
                "Single-Variable Session Check: Send GET https://services.stag.goodnstay.com/api/customer-requests with Authorization: Bearer <REDACTED_LOGGED_OUT_QA_TOKEN>."
            ],
            "actual_result": "- GET /api/customer-requests accepts the logged-out Bearer token and returns HTTP 200 OK containing all 31 Customer Request records (id, checkInDate, checkOutDate, stayingCity, notes, hotelBids).",
            "expected_result": "- Per API Standard Fail-Closed Session Lifecycle (Confluence 524593) and same-session parity with GET /api/traveler/me & PUT /api/customer-requests/:id (both returning HTTP 401 'You are not logged in.'), GET /api/customer-requests must reject logged-out Bearer tokens with HTTP 401 Unauthorized.\n- Zero Customer Request records may be returned after logout.",
            "evidence": {
                "url": "https://web.stag.goodnstay.com/en-US/accommodation",
                "datetime": "19/11/2026 13:56 ICT",
                "console": "Test Case STAG-API-204 | Single-Variable Delta: Replay Bearer token invalidated via POST /api/traveler/logout.",
                "network": "POST /api/traveler/logout -> 200 OK; GET /api/traveler/me -> 401; GET https://services.stag.goodnstay.com/api/customer-requests (with logged-out Bearer token) -> HTTP 200 OK (31 items returned).",
                "notes": "Custom /api/traveler/* endpoints validate active session state against login-devices, whereas default Strapi collection find on GET /api/customer-requests verifies only JWT signature without checking session revocation. | Security Classification: OWASP A07:2025 Authentication Failures (CWE-613 Insufficient Session Expiration) & A01:2025 · OWASP API2:2023 Broken Authentication | OWASP Remediation: Enforce centralized active-session / token-revocation middleware on GET /api/customer-requests (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).",
                "reference_url": "https://optibide-org.atlassian.net/wiki/spaces/O/pages/524593",
            },
            "classification": "Confirmed Bug — Logged-Out Bearer Token Remains Accepted on GET /api/customer-requests",
            "severity": "S1 – Critical",
            "priority_label": "P0",
            "reproducibility": "Always (100% — verified with isolated logged-out token on STAG)",
            "jira_fields": COMMON_JIRA_FIELDS,
            "attachments": ["../screenshots/bug_api08_customer_requests_after_logout_1440x900.png"],
        },
    ),
    (
        "BUG-API-09",
        {
            "title": "[Notification API - POST /api/v1/notifications/mark-all-read] Logged-Out Bearer Token Continues Mutating Notification Read State (HTTP 200 OK) After POST /api/traveler/logout",
            "environment": "Staging (STAG) · API Gateway / Notification Service & Desktop 1440×900 · Chrome · en-US · FE=turbopack-2h-u0he6dowwt, BE=<CHECK_DEPLOYED_SHA> (https://web.stag.goodnstay.com/en-US/home)",
            "test_account": "Isolated QA Traveler Session Invalidated via POST /api/traveler/logout (<REDACTED_LOGGED_OUT_QA_TOKEN>)",
            "steps_to_reproduce": [
                "Authenticate an isolated QA Traveler session via POST https://services.stag.goodnstay.com/api/traveler/login.",
                "Log out that session via POST https://services.stag.goodnstay.com/api/traveler/logout (HTTP 200 OK) and confirm GET /api/traveler/me rejects the token with HTTP 401 ('You are not logged in.').",
                "Single-Variable Session Check: Send POST https://services.stag.goodnstay.com/api/v1/notifications/mark-all-read using Authorization: Bearer <REDACTED_LOGGED_OUT_QA_TOKEN>.",
                "Record HTTP status, data.updated count, and meta.requestId."
            ],
            "actual_result": "- POST /api/v1/notifications/mark-all-read accepts the logged-out Bearer token and returns HTTP 200 OK: {\"data\": {\"updated\": 8}, \"meta\": {\"requestId\": \"32306f87-02cb-437b-9039-c1ae4db87a1a\", \"timestamp\": \"2026-11-19T06:57:59.900Z\"}}, mutating 8 notification records after session logout (GET /api/v1/notifications?limit=5 also continues returning HTTP 200 OK).",
            "expected_result": "- Per Cross-Service Session Lifecycle & API Standard (Confluence 524593), once a Traveler logs out via POST /api/traveler/logout, Gateway / Notification v1 endpoints must reject the revoked token with HTTP 401 AUTH_UNAUTHORIZED.\n- Zero notification records may be modified by a logged-out session token.",
            "evidence": {
                "url": "https://web.stag.goodnstay.com/en-US/home",
                "datetime": "19/11/2026 13:58 ICT",
                "console": "Test Case STAG-API-205 | requestId=32306f87-02cb-437b-9039-c1ae4db87a1a | Single-Variable Delta: Replay logged-out Bearer token.",
                "network": "POST /api/traveler/logout -> 200 OK; GET /api/traveler/me -> 401; POST https://services.stag.goodnstay.com/api/v1/notifications/mark-all-read -> HTTP 200 OK (data.updated=8, requestId=32306f87-02cb-437b-9039-c1ae4db87a1a).",
                "notes": "Frontend chunk 0lu641k7h1gc_.js calls /api/v1/notifications/* via NEXT_PUBLIC_API_GATEWAY_URL. Gateway JWT verification validates signature/exp claims without checking Strapi session revocation / jti denylist. | Security Classification: OWASP A07:2025 Authentication Failures (CWE-613 Insufficient Session Expiration) & A01:2025 · OWASP API2:2023 Broken Authentication | OWASP Remediation: Propagate session revocation (Redis jti denylist or session introspection) to API Gateway /api/v1/* auth guard (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).",
                "reference_url": "https://optibide-org.atlassian.net/wiki/spaces/O/pages/524593",
            },
            "classification": "Confirmed Bug — Revoked Traveler Session Token Continues Mutating State on /api/v1/notifications/*",
            "severity": "S1 – Critical",
            "priority_label": "P0",
            "reproducibility": "Always (100% — requestId=32306f87-02cb-437b-9039-c1ae4db87a1a verified on STAG)",
            "jira_fields": COMMON_JIRA_FIELDS,
            "attachments": ["../screenshots/bug_api09_notifications_mark_read_after_logout_1440x900.png"],
        },
    ),
    (
        "BUG-API-10",
        {
            "title": "[Accommodation Request API - POST /api/traveler/request-bids] Inverted Stay Dates (checkOutDate Earlier Than checkInDate) Are Accepted and Persisted With HTTP 200 OK",
            "environment": "Staging (STAG) · Strapi Backend API & Desktop 1440×900 · Chrome · en-US · FE=turbopack-2h-u0he6dowwt, BE=<CHECK_DEPLOYED_SHA> (https://web.stag.goodnstay.com/en-US/accommodation)",
            "test_account": "Signed-In QA Traveler Session on Staging (Authorization: Bearer <REDACTED_QA_TOKEN>)",
            "steps_to_reproduce": [
                "Load the complete valid room-request fixture (fixtures/valid-request-bids.json) where data.checkInDate='2026-12-20' and data.checkOutDate='2026-12-22'.",
                "Single-Variable Mutation: Clone valid-request-bids.json and change ONLY data.checkOutDate from '2026-12-22' to '2026-12-18' (2 days before checkInDate; fixtures/request-bids-inverted-checkout-date.json).",
                "Send POST https://services.stag.goodnstay.com/api/traveler/request-bids with Authorization: Bearer <REDACTED_QA_TOKEN>.",
                "Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to check whether an open Customer Request was persisted (then cancel test record #1537)."
            ],
            "actual_result": "- POST /api/traveler/request-bids with checkInDate='2026-12-20' and checkOutDate='2026-12-18' returns HTTP 200 OK ({\"success\": true, \"message\": \"Rating created successfully.\"}).\n- GET /api/customer-requests readback confirms open Customer Request #1537 was persisted in PostgreSQL with checkInDate='2026-12-20' and checkOutDate='2026-12-18'.",
            "expected_result": "- Per Accommodation Route Contract (Confluence 166952975) and GNS-FORM-001 (Confluence 174227515), the backend must enforce checkOutDate strictly after checkInDate (>= 1 night) and reject inverted date ranges with a 4xx validation error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>).\n- Zero Customer Request records may be created in the database.",
            "evidence": {
                "url": "https://web.stag.goodnstay.com/en-US/accommodation",
                "datetime": "19/11/2026 14:04 ICT",
                "console": "Test Case STAG-API-206 | Single-Variable Delta: data.checkOutDate ('2026-12-22' -> '2026-12-18') | Test record #1537 cancelled after readback.",
                "network": "POST https://services.stag.goodnstay.com/api/traveler/request-bids (checkInDate='2026-12-20', checkOutDate='2026-12-18') -> HTTP 200 OK; GET /api/customer-requests -> confirmed id=1537 saved.",
                "notes": "Frontend chunk 452btq2-mvhin.js enforces date picker constraints in UI, but POST /api/traveler/request-bids lacks server-side checkOutDate > checkInDate domain validation. | Security Classification: OWASP A06:2025 Insecure Design (CWE-840) & A10:2025 Not Failing Securely (CWE-636) · OWASP API6:2023 | OWASP Remediation: Validate ISO stay dates server-side (checkInDate >= today and checkOutDate > checkInDate) before DB insert (https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).",
                "reference_url": "https://optibide-org.atlassian.net/wiki/spaces/O/pages/166952975",
            },
            "classification": "Confirmed Bug — Inverted Stay Window (checkOutDate < checkInDate) Persists Open Customer Request With HTTP 200 OK",
            "severity": "S2 – Major",
            "priority_label": "P1",
            "reproducibility": "Always (100% — single-variable mutation verified with GET readback on STAG)",
            "jira_fields": COMMON_JIRA_FIELDS,
            "attachments": ["../screenshots/bug_api10_request_bids_inverted_dates_1440x900.png"],
        },
    ),
    (
        "BUG-API-11",
        {
            "title": "[Notification API - GET /api/v1/notifications] Disallowed Origin Header Triggers Unhandled HTTP 500 INTERNAL_ERROR Instead of Clean CORS Rejection",
            "environment": "Staging (STAG) · API Gateway / Notification Service & Desktop 1440×900 · Chrome · en-US · FE=turbopack-2h-u0he6dowwt, BE=<CHECK_DEPLOYED_SHA> (https://web.stag.goodnstay.com/en-US/home)",
            "test_account": "Signed-In QA Traveler Session on Staging (Authorization: Bearer <REDACTED_QA_TOKEN>)",
            "steps_to_reproduce": [
                "Confirm baseline GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 with Origin: https://web.stag.goodnstay.com returns HTTP 200 OK.",
                "Confirm same-host CORS parity on GET https://services.stag.goodnstay.com/api/traveler/me with Origin: https://untrusted-origin.example.test -> cleanly omits Access-Control-Allow-Origin without throwing HTTP 500.",
                "Single-Variable Header Mutation: Change ONLY the Origin header to https://untrusted-origin.example.test on GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5.",
                "Send the request and record HTTP status, CORS response headers, and error payload."
            ],
            "actual_result": "- GET /api/v1/notifications?limit=5 with Origin: https://untrusted-origin.example.test throws an unhandled HTTP 500 Internal Server Error:\n  {\"error\": {\"code\": \"INTERNAL_ERROR\", \"messageKey\": \"errors.internal\", \"details\": {\"name\": \"Error\", \"message\": \"Origin https://untrusted-origin.example.test is not allowed by CORS\"}}}.",
            "expected_result": "- Per OpenAPI Governance 4xx vs 5xx Separation (Confluence 144015744) and same-host parity with /api/traveler/me, an untrusted client Origin header must never trigger an unhandled HTTP 500 server error; the CORS middleware should return callback(null, false) (omitting Access-Control-Allow-Origin) or a controlled 403 error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>).",
            "evidence": {
                "url": "https://web.stag.goodnstay.com/en-US/home",
                "datetime": "19/11/2026 13:56 ICT",
                "console": "Test Case STAG-API-207 | Single-Variable Header Delta: Origin -> https://untrusted-origin.example.test.",
                "network": "GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 (Origin: https://untrusted-origin.example.test) -> HTTP 500 INTERNAL_ERROR.",
                "notes": "Express/NestJS CORS origin callback invokes callback(new Error('Origin ... is not allowed by CORS')) instead of callback(null, false), escalating client header rejection into a 500 INTERNAL_ERROR and polluting 5xx SLO metrics. | Security Classification: OWASP A10:2025 Mishandling of Exceptional Conditions (CWE-755, CWE-209) & A02:2025 Security Misconfiguration · OWASP API8:2023 | OWASP Remediation: Return callback(null, false) in CORS origin allow-list check or map disallowed origin to 403 without internal Error serialization (https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html).",
                "reference_url": "https://optibide-org.atlassian.net/wiki/spaces/O/pages/144015744",
            },
            "classification": "Confirmed Bug — CORS Origin Callback Throws Unhandled HTTP 500 INTERNAL_ERROR on /api/v1/notifications",
            "severity": "S2 – Major",
            "priority_label": "P1",
            "reproducibility": "Always (100% — deterministic single-header reproduction on STAG)",
            "jira_fields": COMMON_JIRA_FIELDS,
            "attachments": ["../screenshots/bug_api11_notifications_cors_500_error_1440x900.png"],
        },
    ),
    (
        "BUG-API-12",
        {
            "title": "[Location Pin API - POST /api/translations/stay-location-pin] Unauthenticated Request Without Authorization Header Executes OpenAI Geocoding Pipeline (Contract Verification)",
            "environment": "Staging (STAG) · Strapi Backend API & Desktop 1440×900 · Chrome · en-US · FE=turbopack-2h-u0he6dowwt, BE=<CHECK_DEPLOYED_SHA> (https://web.stag.goodnstay.com/en-US/accommodation)",
            "test_account": "Unauthenticated Client Session (Authorization header omitted)",
            "steps_to_reproduce": [
                "Prepare the complete valid geocoding fixture (fixtures/valid-stay-location-pin.json: {\"hotelName\": \"QA Sample Hotel\", \"hotelAddress\": \"Jung-gu, Seoul, KR\"}).",
                "Single-Variable Header Mutation: Omit ONLY the Authorization Bearer header (which web client chunk 0v23-8ja2iskk.js attaches via authenticated API client).",
                "Send POST https://services.stag.goodnstay.com/api/translations/stay-location-pin and record HTTP status and provider metadata."
            ],
            "actual_result": "- POST /api/translations/stay-location-pin without an Authorization header executes the OpenAI geocoding provider and returns HTTP 200 OK ({\"success\": true, \"message\": \"Data retrieved successfully.\", \"data\": {\"lat\": 37.5665, \"lng\": 126.978, \"provider\": \"openai\"}}).",
            "expected_result": "- <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>: Because STAGING OpenAPI (/openapi.json) is unpublished (404), confirm with Backend / Architecture Owner whether POST /api/translations/stay-location-pin must require Traveler Bearer authentication (HTTP 401) alongside OP-1951, or is intentionally public with rate-limiting.",
            "evidence": {
                "url": "https://web.stag.goodnstay.com/en-US/accommodation",
                "datetime": "19/11/2026 13:56 ICT",
                "console": "Test Case STAG-API-208 (Status: BLOCKED — API contract missing) | Single-Variable Header Delta: Omit Authorization header.",
                "network": "POST https://services.stag.goodnstay.com/api/translations/stay-location-pin (no Authorization header) -> HTTP 200 OK (provider='openai').",
                "notes": "Frontend chunk 0v23-8ja2iskk.js calls POST /api/translations/stay-location-pin with localStorage token. Marked Needs Verification per QA Guide §2 (No Guessing when OpenAPI contract is missing). | Security Classification: OWASP A02:2025 Security Misconfiguration & X01:2025 Lack of Resilience (CWE-400) · OWASP API4:2023 Unrestricted Resource Consumption | OWASP Remediation: Enforce Bearer authentication and strict per-caller rate-limiting/caching on paid OpenAI endpoints (https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).",
                "reference_url": "https://optibide-org.atlassian.net/wiki/spaces/O/pages/165937257",
            },
            "classification": "Needs Verification — (need to brainstorming with team or observe)",
            "severity": "S3 – Minor",
            "priority_label": "P2",
            "reproducibility": "Always (100% — observed on STAG; awaiting OpenAPI auth contract confirmation)",
            "jira_fields": COMMON_JIRA_FIELDS,
            "attachments": ["../screenshots/bug_api12_stay_location_pin_unauth_check_1440x900.png"],
        },
    ),
]

for bug_id, payload in BUGS:
    p = OUT_DIR / f"{bug_id}.json"
    p.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {p.name} (title_len={len(payload['title'])})")
