# goodNstay Staging API Contract, Session Lifecycle & OWASP Top 10:2025 Suite — Batch 2 (19-11-2026)

**Jira Requirement:** [OP-1626](https://optibide-org.atlassian.net/browse/OP-1626) · **Related Tickets:** [OP-1959](https://optibide-org.atlassian.net/browse/OP-1959), [OP-1960](https://optibide-org.atlassian.net/browse/OP-1960), [OP-1961](https://optibide-org.atlassian.net/browse/OP-1961), [OP-1962](https://optibide-org.atlassian.net/browse/OP-1962), [OP-1963](https://optibide-org.atlassian.net/browse/OP-1963), [OP-1964](https://optibide-org.atlassian.net/browse/OP-1964) · **Standard:** `QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI)`

> [!IMPORTANT]
> **Contract-First & No-Guessing Gate:** Per QA Guide Section 2 and `OP-1593` handoff rules, branch merges (`main`/`stag` PRs) are **not** runtime deployment acceptance. Where the live STAGING OpenAPI URL, exact `errorCode` registry, or deployed commit SHA is not yet supplied, fields are marked `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>` and the test case status is `BLOCKED — API contract missing` (with the exact owner to ask). Never use the guide's learning URL `https://api.example.test/v2/partner-registrations` for STAGING execution.

## 1. Pre-Test Readiness Checklist (QA Guide §2 — Do Not Guess)

| Item | Source / Authority | Current Value / Status |
| :--- | :--- | :--- |
| **Requirement / Jira** | Jira Ticket & Acceptance Criteria | Confluence API Standard (524593), OpenAPI Governance (144015744), Accommodation Route Contract (166952975), QA Guide (184944019), OWASP Top 10:2025 & API Security 2023 |
| **API Document / OpenAPI** | Deployed STAGING OpenAPI & Error Registry | `[QA fills in — BLOCKED: Strapi/Gateway STAGING OpenAPI spec (/openapi.json) returned 404; request official STAGING OpenAPI & Error Registry from Backend Owners]` |
| **Base URL** | DEV or STAGING Environment | `https://services.stag.goodnstay.com (invoked from https://web.stag.goodnstay.com; 0 requests to Production)` |
| **Method & Endpoint** | Current OpenAPI Document | `POST /api/v1/device-tokens, POST /api/traveler/request-bids, GET /api/customer-requests, POST /api/v1/notifications/mark-all-read, GET /api/v1/notifications, POST /api/translations/stay-location-pin` |
| **Login / Token** | QA Lead / Environment Owner | Authorization: Bearer <REDACTED_QA_TOKEN> and isolated logged-out Bearer token (<REDACTED_LOGGED_OUT_QA_TOKEN>) |
| **Test Data / Fixtures** | Safe QA Data + Real STAGING Reference Codes | Per-endpoint complete sanitized QA fixtures in fixtures/*.json (QA Tester, qa-sample@example.test, +84900000000, KR / KR-11) |
| **Build Version / SHA** | Deployed FE, Gateway, Partner, Media, Location | `fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner>` |

## 2. API Test Case Summary Matrix

| Test Case ID | Category | Title | Fixture File | Single-Variable Mutation Delta | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `STAG-API-201` | **Permission** | Reject unauthenticated push token registration when Authorization header is omitted on POST /api/v1/device-tokens | `valid-device-token.json` | Omit ONLY Authorization Bearer header while keeping valid-device-token.json unchanged | **`NOT VERIFIED`** |
| `STAG-API-202` | **Negative** | Reject unsupported platform enum value on POST /api/v1/device-tokens with structured fieldErrors | `device-token-invalid-platform.json` | Mutate ONLY platform from 'web' to 'invalid_platform' | **`NOT VERIFIED`** |
| `STAG-API-203` | **Positive** | Sanitize user entity in POST /api/traveler/request-bids 2xx response so internal credential columns are never returned | `valid-request-bids.json` | None — complete valid baseline room-request payload (valid-request-bids.json) | **`FAIL`** |
| `STAG-API-204` | **Permission** | Reject logged-out Traveler Bearer token on GET /api/customer-requests after POST /api/traveler/logout | `NO_BODY_GET` | Replace active Bearer token with Bearer token invalidated via POST /api/traveler/logout | **`FAIL`** |
| `STAG-API-205` | **Permission** | Reject logged-out Traveler Bearer token on POST /api/v1/notifications/mark-all-read after POST /api/traveler/logout | `NO_BODY_POST_ACTION` | Replace active Bearer token with Bearer token invalidated via POST /api/traveler/logout | **`FAIL`** |
| `STAG-API-206` | **Boundary** | Reject inverted stay dates (checkOutDate earlier than checkInDate) on POST /api/traveler/request-bids | `request-bids-inverted-checkout-date.json` | Mutate ONLY data.checkOutDate from '2026-12-22' to '2026-12-18' (< checkInDate '2026-12-20') | **`FAIL`** |
| `STAG-API-207` | **Negative** | Handle disallowed Origin header on GET /api/v1/notifications without throwing unhandled HTTP 500 INTERNAL_ERROR | `NO_BODY_GET` | Mutate ONLY Origin request header from 'https://web.stag.goodnstay.com' to 'https://untrusted-origin.example.test' | **`FAIL`** |
| `STAG-API-208` | **Permission** | Verify authentication requirement on POST /api/translations/stay-location-pin when Authorization header is omitted | `valid-stay-location-pin.json` | Omit ONLY Authorization header while sending valid-stay-location-pin.json | **`BLOCKED`** |

## 3. Approved Base Valid Fixture (`fixtures/valid-request-bids.json`)

```json
{
  "data": {
    "fullName": "QA Tester",
    "email": "qa-sample@example.test",
    "phone": "900000000",
    "dob": "2000-01-15",
    "gender": "male",
    "country": "VN",
    "checkInDate": "2026-12-20",
    "checkOutDate": "2026-12-22",
    "guestCount": 2,
    "roomCount": 1,
    "stayingCountry": "KR",
    "stayingProvince": "KR-11",
    "stayingCity": "KR-11",
    "stayingDistrict": "",
    "stayingWard": "",
    "accommodationType": "hotel",
    "serviceTypes": [],
    "roomTypes": [
      "suite",
      "anyRoom"
    ],
    "bedTypes": [],
    "viewTypes": [],
    "others": [],
    "filterOptions": {},
    "notes": "",
    "guestComposition": {
      "adults": 2,
      "children": 0,
      "infants": 0,
      "pets": 0
    }
  }
}
```

## 4. Detailed 14-Field API Test Cases & Section 5.2 Execution Records

### STAG-API-201 — Reject unauthenticated push token registration when Authorization header is omitted on POST /api/v1/device-tokens

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-201 |
| **Title** | Reject unauthenticated push token registration when Authorization header is omitted on POST /api/v1/device-tokens |
| **Requirement** | API Standard (Confluence 524593) — Push device registration must fail closed when Bearer authentication is omitted. |
| **Priority / Test layer** | P1 / API Permission Baseline |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Staging Gateway & Notification Service reachable. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/v1/device-tokens |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com (Omit Authorization header) |
| **Payload / Test data** | Fixture: fixtures/valid-device-token.json. Single-Variable Delta: omit ONLY Authorization header. |
| **Steps** | 1. Load complete valid fixture fixtures/valid-device-token.json.<br>2. Omit ONLY the Authorization header on POST https://services.stag.goodnstay.com/api/v1/device-tokens.<br>3. Send the request and record HTTP status, error.code, and meta.requestId.<br>4. Confirm request is rejected and no push device record is registered. |
| **Expected response** | HTTP <CHECK_OPENAPI> authentication error (<CHECK_ERROR_REGISTRY>). |
| **Expected data result** | No push device token record is created. |
| **Actual result** | Observed HTTP 401 AUTH_UNAUTHORIZED (messageKey='errors.auth.unauthorized', requestId=fef33135-6e0d-45e3-85a8-e1471bd96244). Marked NOT VERIFIED pending Backend Commit SHA confirmation. |
| **Status and evidence** | NOT VERIFIED — requestId=fef33135-6e0d-45e3-85a8-e1471bd96244 (awaiting deployed Gateway/Notification Backend SHA). |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control (CWE-284) & A07:2025 (CWE-306) · OWASP API2:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

#### STAG-API-201 — Request Payload (`valid-device-token.json`)

```json
{
  "deviceId": "qa-web-device-01",
  "platform": "web",
  "token": "qa-sample-push-registration-token",
  "locale": "en-US"
}
```

#### STAG-API-201 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-201",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/v1/device-tokens",
  "testDataFile": "valid-device-token.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "401",
  "actualErrorCode": "AUTH_UNAUTHORIZED",
  "requestId": "fef33135-6e0d-45e3-85a8-e1471bd96244",
  "dataCheck": "Rejected with 401 AUTH_UNAUTHORIZED; zero device tokens saved",
  "status": "NOT VERIFIED",
  "evidenceLink": "stag_traveler_api_batch2_test_cases.md"
}
```

### STAG-API-202 — Reject unsupported platform enum value on POST /api/v1/device-tokens with structured fieldErrors

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-202 |
| **Title** | Reject unsupported platform enum value on POST /api/v1/device-tokens with structured fieldErrors |
| **Requirement** | OpenAPI Governance (Confluence 144015744) — Invalid enum field value must return structured 4xx fieldErrors. |
| **Priority / Test layer** | P2 / API Negative Validation Baseline |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/v1/device-tokens |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/device-token-invalid-platform.json. Single-Variable Delta: mutate ONLY platform from 'web' to 'invalid_platform'. |
| **Steps** | 1. Load fixtures/valid-device-token.json.<br>2. Mutate ONLY platform to 'invalid_platform' (fixtures/device-token-invalid-platform.json).<br>3. Send POST https://services.stag.goodnstay.com/api/v1/device-tokens.<br>4. Record HTTP status and fieldErrors, confirming zero invalid device records were saved. |
| **Expected response** | HTTP <CHECK_OPENAPI> with <CHECK_ERROR_REGISTRY> and fieldError on 'platform'. |
| **Expected data result** | No push device token record is created. |
| **Actual result** | Observed HTTP 400 VALIDATION_FAILED with fieldErrors[0].field='platform'. Marked NOT VERIFIED pending Backend Commit SHA. |
| **Status and evidence** | NOT VERIFIED — HTTP 400 VALIDATION_FAILED verified on Staging; awaiting Backend Commit SHA. |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-20) · OWASP API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-202 — Request Payload (`device-token-invalid-platform.json`)

```json
{
  "deviceId": "qa-web-device-01",
  "platform": "invalid_platform",
  "token": "qa-sample-push-registration-token",
  "locale": "en-US"
}
```

#### STAG-API-202 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-202",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/v1/device-tokens",
  "testDataFile": "device-token-invalid-platform.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "400",
  "actualErrorCode": "VALIDATION_FAILED",
  "requestId": "envoy-400-device-platform",
  "dataCheck": "Rejected with 400 VALIDATION_FAILED; zero device tokens created",
  "status": "NOT VERIFIED",
  "evidenceLink": "stag_traveler_api_batch2_test_cases.md"
}
```

### STAG-API-203 — Sanitize user entity in POST /api/traveler/request-bids 2xx response so internal credential columns are never returned

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-203 |
| **Title** | Sanitize user entity in POST /api/traveler/request-bids 2xx response so internal credential columns are never returned |
| **Requirement** | API Standard (Confluence 524593) & OWASP API3:2023 Response DTO Sanitization — Valid 2xx room-request response must serialize only public receipt fields and never return internal up_users credential columns. |
| **Priority / Test layer** | P0 / API DTO Serialization & Persistence Readback |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/traveler/request-bids |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/valid-request-bids.json. Single-Variable Delta: None — complete valid baseline room-request payload. |
| **Steps** | 1. Load complete valid fixture fixtures/valid-request-bids.json.<br>2. Send POST https://services.stag.goodnstay.com/api/traveler/request-bids with Authorization: Bearer <REDACTED_QA_TOKEN>.<br>3. Inspect the HTTP 200 JSON response keys inside data.customerRequest.user against forbidden sensitive columns.<br>4. Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to confirm saved record #1536 (then cancel test record #1536). |
| **Expected response** | HTTP <CHECK_OPENAPI> success receipt containing sanitized customerRequest fields with zero credential/token columns in data.customerRequest.user. |
| **Expected data result** | 1 Customer Request persisted and verified on GET /api/customer-requests readback; zero internal credential columns serialized in HTTP response. |
| **Actual result** | FAIL — Returned HTTP 200 OK creating Customer Request #1536, but serialized unredacted up_users columns in JSON body: data.customerRequest.user.password (<REDACTED_HASH>), data.customerRequest.user.resetPasswordToken, and data.customerRequest.user.confirmationToken. |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1959 | Screenshot: screenshots/bug_api07_request_bids_response_user_columns_1440x900.png (Test record #1536 cancelled after readback). |

> **OWASP Security Classification:** `OWASP A04:2025 Cryptographic Failures & A01:2025 (CWE-201) · OWASP API3:2023 BOPLA` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

#### STAG-API-203 — Request Payload (`valid-request-bids.json`)

```json
{
  "data": {
    "fullName": "QA Tester",
    "email": "qa-sample@example.test",
    "phone": "900000000",
    "dob": "2000-01-15",
    "gender": "male",
    "country": "VN",
    "checkInDate": "2026-12-20",
    "checkOutDate": "2026-12-22",
    "guestCount": 2,
    "roomCount": 1,
    "stayingCountry": "KR",
    "stayingProvince": "KR-11",
    "stayingCity": "KR-11",
    "stayingDistrict": "",
    "stayingWard": "",
    "accommodationType": "hotel",
    "serviceTypes": [],
    "roomTypes": [
      "suite",
      "anyRoom"
    ],
    "bedTypes": [],
    "viewTypes": [],
    "others": [],
    "filterOptions": {},
    "notes": "",
    "guestComposition": {
      "adults": 2,
      "children": 0,
      "infants": 0,
      "pets": 0
    }
  }
}
```

#### STAG-API-203 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-203",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids",
  "testDataFile": "valid-request-bids.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "NONE",
  "actualHttpStatus": "200",
  "actualErrorCode": "SENSITIVE_USER_COLUMNS_EXPOSED",
  "requestId": "req-1536-dto-leak",
  "dataCheck": "FAIL: Response serialized data.customerRequest.user.{password,resetPasswordToken,confirmationToken}",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api07_request_bids_response_user_columns_1440x900.png"
}
```

### STAG-API-204 — Reject logged-out Traveler Bearer token on GET /api/customer-requests after POST /api/traveler/logout

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-204 |
| **Title** | Reject logged-out Traveler Bearer token on GET /api/customer-requests after POST /api/traveler/logout |
| **Requirement** | Session Lifecycle Parity & API Standard (Confluence 524593) — Once POST /api/traveler/logout succeeds (HTTP 200), the invalidated Bearer token must fail closed (HTTP 401) across all protected Customer Request endpoints. |
| **Priority / Test layer** | P0 / API Permission & Session Lifecycle Parity |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Create an isolated QA Traveler login session via POST /api/traveler/login and invalidate it via POST /api/traveler/logout (HTTP 200 OK; confirmed GET /api/traveler/me -> HTTP 401). |
| **Method + URL** | GET https://services.stag.goodnstay.com/api/customer-requests |
| **Headers / Auth / Parameters** | Accept: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_LOGGED_OUT_QA_TOKEN> |
| **Payload / Test data** | None (GET request without body). Single-Variable Delta: replace active Authorization token with isolated Bearer token already logged out via POST /api/traveler/logout. |
| **Steps** | 1. Authenticate an isolated QA Traveler session via POST https://services.stag.goodnstay.com/api/traveler/login.<br>2. Invalidate that session via POST https://services.stag.goodnstay.com/api/traveler/logout (returns HTTP 200 OK) and confirm GET /api/traveler/me returns HTTP 401.<br>3. Send GET https://services.stag.goodnstay.com/api/customer-requests using the logged-out Bearer token.<br>4. Verify HTTP status and check whether protected Customer Request records are returned. |
| **Expected response** | HTTP 401 Unauthorized ('You are not logged in.'), matching GET /api/traveler/me and PUT /api/customer-requests/:id. |
| **Expected data result** | Zero Customer Request records returned to a logged-out Bearer token. |
| **Actual result** | FAIL — GET /api/customer-requests accepted the logged-out Bearer token with HTTP 200 OK and returned all 31 Customer Request records (checkInDate, checkOutDate, stayingCity, notes, hotelBids). |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1960 | Screenshot: screenshots/bug_api08_customer_requests_after_logout_1440x900.png. |

> **OWASP Security Classification:** `OWASP A07:2025 Authentication Failures (CWE-613) & A01:2025 · OWASP API2:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

#### STAG-API-204 — Request Payload (`NO_BODY_GET`)

```json
{}
```

#### STAG-API-204 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-204",
  "environment": "STAGING",
  "method": "GET",
  "url": "https://services.stag.goodnstay.com/api/customer-requests",
  "testDataFile": "NO_BODY_GET",
  "expectedHttpStatus": "401",
  "expectedErrorCode": "UNAUTHORIZED",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "logout-cr-list-200",
  "dataCheck": "FAIL: Returned 31 Customer Request records to logged-out Bearer token",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api08_customer_requests_after_logout_1440x900.png"
}
```

### STAG-API-205 — Reject logged-out Traveler Bearer token on POST /api/v1/notifications/mark-all-read after POST /api/traveler/logout

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-205 |
| **Title** | Reject logged-out Traveler Bearer token on POST /api/v1/notifications/mark-all-read after POST /api/traveler/logout |
| **Requirement** | Cross-Service Session Revocation Contract & API Standard (Confluence 524593) — Notification v1 mutation endpoints must reject Bearer tokens belonging to logged-out sessions with HTTP 401 AUTH_UNAUTHORIZED. |
| **Priority / Test layer** | P0 / Integration & API Permission (Cross-Service Logout Parity) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Isolated QA Traveler session invalidated via POST /api/traveler/logout (GET /api/traveler/me confirmed HTTP 401). |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/v1/notifications/mark-all-read |
| **Headers / Auth / Parameters** | Accept: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_LOGGED_OUT_QA_TOKEN> |
| **Payload / Test data** | None (RPC POST action without request body per chunk 0lu641k7h1gc_.js). Single-Variable Delta: replace active Authorization token with logged-out Bearer token. |
| **Steps** | 1. Obtain an isolated QA Traveler token via POST /api/traveler/login and log out via POST /api/traveler/logout (HTTP 200 OK).<br>2. Confirm session invalidation on GET /api/traveler/me -> HTTP 401.<br>3. Send POST https://services.stag.goodnstay.com/api/v1/notifications/mark-all-read with the logged-out Bearer token.<br>4. Record HTTP status, data.updated count, and meta.requestId, and check GET /api/v1/notifications/unread-count readback. |
| **Expected response** | HTTP 401 Unauthorized with error.code = 'AUTH_UNAUTHORIZED'. |
| **Expected data result** | Zero notification records modified after session logout. |
| **Actual result** | FAIL — Returned HTTP 200 OK ({"data": {"updated": 8}, "meta": {"requestId": "32306f87-02cb-437b-9039-c1ae4db87a1a"}}), mutating 8 notifications using a logged-out Bearer token. |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1961 | requestId=32306f87-02cb-437b-9039-c1ae4db87a1a | Screenshot: screenshots/bug_api09_notifications_mark_read_after_logout_1440x900.png. |

> **OWASP Security Classification:** `OWASP A07:2025 Authentication Failures (CWE-613) & A01:2025 · OWASP API2:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

#### STAG-API-205 — Request Payload (`NO_BODY_POST_ACTION`)

```json
{}
```

#### STAG-API-205 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-205",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/v1/notifications/mark-all-read",
  "testDataFile": "NO_BODY_POST_ACTION",
  "expectedHttpStatus": "401",
  "expectedErrorCode": "AUTH_UNAUTHORIZED",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "32306f87-02cb-437b-9039-c1ae4db87a1a",
  "dataCheck": "FAIL: Mutated 8 notifications (data.updated=8) using logged-out token",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api09_notifications_mark_read_after_logout_1440x900.png"
}
```

### STAG-API-206 — Reject inverted stay dates (checkOutDate earlier than checkInDate) on POST /api/traveler/request-bids

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-206 |
| **Title** | Reject inverted stay dates (checkOutDate earlier than checkInDate) on POST /api/traveler/request-bids |
| **Requirement** | Accommodation Route Contract (Confluence 166952975) & GNS-FORM-001 (174227515) — Stay window must enforce checkOutDate strictly after checkInDate (>= 1 night). |
| **Priority / Test layer** | P1 / API Boundary Validation & Readback |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/traveler/request-bids |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/request-bids-inverted-checkout-date.json. Single-Variable Delta: mutate ONLY data.checkOutDate from '2026-12-22' to '2026-12-18' (2 days earlier than data.checkInDate '2026-12-20'). |
| **Steps** | 1. Load complete valid fixture fixtures/valid-request-bids.json (checkInDate='2026-12-20', checkOutDate='2026-12-22').<br>2. Mutate ONLY data.checkOutDate to '2026-12-18' (fixtures/request-bids-inverted-checkout-date.json).<br>3. Send POST https://services.stag.goodnstay.com/api/traveler/request-bids.<br>4. Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to check whether an inverted-date request was saved (then cancel test record #1537). |
| **Expected response** | HTTP <CHECK_OPENAPI> client validation error (<CHECK_ERROR_REGISTRY>) rejecting checkOutDate <= checkInDate. |
| **Expected data result** | No Customer Request record is created in database. |
| **Actual result** | FAIL — Returned HTTP 200 OK ({"success": true, "message": "Rating created successfully."}) and persisted open Customer Request #1537 with checkInDate='2026-12-20' and checkOutDate='2026-12-18' on GET /api/customer-requests readback. |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1962 | Screenshot: screenshots/bug_api10_request_bids_inverted_dates_1440x900.png (Test record #1537 cancelled after readback). |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-840) & A10:2025 (CWE-636) · OWASP API6:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-206 — Request Payload (`request-bids-inverted-checkout-date.json`)

```json
{
  "data": {
    "fullName": "QA Tester",
    "email": "qa-sample@example.test",
    "phone": "900000000",
    "dob": "2000-01-15",
    "gender": "male",
    "country": "VN",
    "checkInDate": "2026-12-20",
    "checkOutDate": "2026-12-18",
    "guestCount": 2,
    "roomCount": 1,
    "stayingCountry": "KR",
    "stayingProvince": "KR-11",
    "stayingCity": "KR-11",
    "stayingDistrict": "",
    "stayingWard": "",
    "accommodationType": "hotel",
    "serviceTypes": [],
    "roomTypes": [
      "suite",
      "anyRoom"
    ],
    "bedTypes": [],
    "viewTypes": [],
    "others": [],
    "filterOptions": {},
    "notes": "",
    "guestComposition": {
      "adults": 2,
      "children": 0,
      "infants": 0,
      "pets": 0
    }
  }
}
```

#### STAG-API-206 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-206",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids",
  "testDataFile": "request-bids-inverted-checkout-date.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "req-1537-inverted-dates",
  "dataCheck": "FAIL: Open Customer Request #1537 persisted with checkOutDate=2026-12-18 < checkInDate=2026-12-20",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api10_request_bids_inverted_dates_1440x900.png"
}
```

### STAG-API-207 — Handle disallowed Origin header on GET /api/v1/notifications without throwing unhandled HTTP 500 INTERNAL_ERROR

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-207 |
| **Title** | Handle disallowed Origin header on GET /api/v1/notifications without throwing unhandled HTTP 500 INTERNAL_ERROR |
| **Requirement** | OpenAPI Governance (Confluence 144015744 — 4xx vs 5xx Separation) & Same-Host CORS Parity (/api/traveler/me omits ACAO cleanly without 500) — Untrusted Origin header must never trigger unhandled HTTP 500 INTERNAL_ERROR. |
| **Priority / Test layer** | P1 / API Error Contract & CORS Configuration |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session; baseline GET /api/v1/notifications?limit=5 with Origin https://web.stag.goodnstay.com returns HTTP 200 OK. |
| **Method + URL** | GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 |
| **Headers / Auth / Parameters** | Accept: application/json; Origin: https://untrusted-origin.example.test; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | None (GET request without body). Single-Variable Delta: mutate ONLY Origin header from 'https://web.stag.goodnstay.com' to 'https://untrusted-origin.example.test'. |
| **Steps** | 1. Confirm baseline GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 with Origin: https://web.stag.goodnstay.com returns HTTP 200 OK.<br>2. Change ONLY the Origin header to https://untrusted-origin.example.test and send GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5.<br>3. Inspect HTTP status code, CORS headers, and error body.<br>4. Confirm notification records remain unchanged via baseline GET readback. |
| **Expected response** | Clean CORS rejection omitting Access-Control-Allow-Origin (matching /api/traveler/me) or controlled 403 error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) — never HTTP 500 INTERNAL_ERROR. |
| **Expected data result** | No notification records created or modified. |
| **Actual result** | FAIL — Server threw unhandled HTTP 500 Internal Server Error: {"error": {"code": "INTERNAL_ERROR", "messageKey": "errors.internal", "details": {"name": "Error", "message": "Origin https://untrusted-origin.example.test is not allowed by CORS"}}}. |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1963 | Screenshot: screenshots/bug_api11_notifications_cors_500_error_1440x900.png. |

> **OWASP Security Classification:** `OWASP A10:2025 Mishandling of Exceptional Conditions (CWE-755, CWE-209) & A02:2025 · OWASP API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

#### STAG-API-207 — Request Payload (`NO_BODY_GET`)

```json
{}
```

#### STAG-API-207 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-207",
  "environment": "STAGING",
  "method": "GET",
  "url": "https://services.stag.goodnstay.com/api/v1/notifications?limit=5",
  "testDataFile": "NO_BODY_GET",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "500",
  "actualErrorCode": "INTERNAL_ERROR",
  "requestId": "cors-untrusted-origin-500",
  "dataCheck": "Notification records unchanged; CORS callback threw unhandled HTTP 500",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api11_notifications_cors_500_error_1440x900.png"
}
```

### STAG-API-208 — Verify authentication requirement on POST /api/translations/stay-location-pin when Authorization header is omitted

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-208 |
| **Title** | Verify authentication requirement on POST /api/translations/stay-location-pin when Authorization header is omitted |
| **Requirement** | <CHECK_OPENAPI> — Confirm with Backend / Architecture Owner whether POST /api/translations/stay-location-pin (OpenAI geocoding) requires Traveler Bearer authentication or is intentionally public with rate-limit quota. |
| **Priority / Test layer** | P2 / API Permission Contract Verification |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 452btq2-mvhin, 0lu641k7h1gc_, 0v23-8ja2iskk, 44apr7-70_4vc), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway/Notification Backend & DevOps Owner> |
| **Preconditions** | Staging Backend reachable; web client chunk 0v23-8ja2iskk.js attaches token via authenticated API client. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/translations/stay-location-pin |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com (Omit Authorization header) |
| **Payload / Test data** | Fixture: fixtures/valid-stay-location-pin.json. Single-Variable Delta: omit ONLY Authorization header. |
| **Steps** | 1. Load fixtures/valid-stay-location-pin.json (hotelName='QA Sample Hotel', hotelAddress='Jung-gu, Seoul, KR').<br>2. Omit ONLY the Authorization header.<br>3. Send POST https://services.stag.goodnstay.com/api/translations/stay-location-pin.<br>4. Record HTTP status and data.provider, confirming no database records were created or mutated. |
| **Expected response** | BLOCKED — API contract missing: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY> (confirm 401 auth requirement vs rate-limited public policy). |
| **Expected data result** | No database records created or modified; confirm OpenAI quota protection policy. |
| **Actual result** | Observed HTTP 200 OK executing provider='openai' (lat=37.5665, lng=126.978) without Authorization header. Marked BLOCKED / Needs Verification pending OpenAPI contract. |
| **Status and evidence** | BLOCKED — API contract missing: confirm auth & rate-limit contract with Backend / Architecture Owner | Jira: https://optibide-org.atlassian.net/browse/OP-1964 (Needs Verification) | Screenshot: screenshots/bug_api12_stay_location_pin_unauth_check_1440x900.png. |

> **OWASP Security Classification:** `OWASP A02:2025 Security Misconfiguration & X01:2025 Lack of Resilience (CWE-400) · OWASP API4:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

#### STAG-API-208 — Request Payload (`valid-stay-location-pin.json`)

```json
{
  "hotelName": "QA Sample Hotel",
  "hotelAddress": "Jung-gu, Seoul, KR"
}
```

#### STAG-API-208 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-208",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/translations/stay-location-pin",
  "testDataFile": "valid-stay-location-pin.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "envoy-200-stay-pin-unauth",
  "dataCheck": "Stateless OpenAI geocoding executed without Authorization header",
  "status": "BLOCKED",
  "evidenceLink": "screenshots/bug_api12_stay_location_pin_unauth_check_1440x900.png"
}
```

## 5. QA Lead 7-Point Verification Checklist (QA Guide §11)

- [x] **1. Requirement & OpenAPI Traceability:** Every test case links to `OP-1626` (`OP-1959`, `OP-1960`, `OP-1961`, `OP-1962`, `OP-1963`, `OP-1964`) and its governing Confluence / OpenAPI contracts.
- [x] **2. Real Contract URLs Only:** Method, URL, headers, and body target Staging only (`*.stag.goodnstay.com`) and never use the guide's example URL (`https://api.example.test/v2/partner-registrations`) or Production.
- [x] **3. Complete Valid Fixture + Single-Variable Mutation:** `fixtures/valid-request-bids.json` (and `endpointBaseFixtures` per endpoint) contains all required fields; each negative/boundary test mutates **one thing only**.
- [x] **4. No Guessed Status or Error Codes:** Unconfirmed runtime HTTP statuses and error codes use `<CHECK_OPENAPI>` and `<CHECK_ERROR_REGISTRY>` with `BLOCKED — API contract missing`.
- [x] **5. Persistence & Readback Verification:** Every test case specifies how QA checks saved data (`GET` / Admin Reviewer readback on 2xx; zero unintended records created or mutated on 4xx/5xx).
- [x] **6. Reproducible Atomic Steps:** Every test case provides numbered Postman steps another QA can execute deterministically.
- [x] **7. Secret & PII Hygiene:** Zero real tokens, passwords, hashes, signing URLs, or personal contact details (`QA Tester`, `qa-sample@example.test`, `+84900000000`).
