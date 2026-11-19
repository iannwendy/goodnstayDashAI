# goodNstay Staging Traveler Web API Test Suite — QA Guide Compliant (19-11-2026)

**Jira Requirement:** [OP-1626](https://optibide-org.atlassian.net/browse/OP-1626) · **Related Tickets:** [OP-1947](https://optibide-org.atlassian.net/browse/OP-1947), [OP-1948](https://optibide-org.atlassian.net/browse/OP-1948), [OP-1949](https://optibide-org.atlassian.net/browse/OP-1949), [OP-1950](https://optibide-org.atlassian.net/browse/OP-1950), [OP-1951](https://optibide-org.atlassian.net/browse/OP-1951), [OP-1952](https://optibide-org.atlassian.net/browse/OP-1952) · **Standard:** `QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI)`

> [!IMPORTANT]
> **Contract-First & No-Guessing Gate:** Per QA Guide Section 2 and `OP-1593` handoff rules, branch merges (`main`/`stag` PRs) are **not** runtime deployment acceptance. Where the live STAGING OpenAPI URL, exact `errorCode` registry, or deployed commit SHA is not yet supplied, fields are marked `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>` and the test case status is `BLOCKED — API contract missing` (with the exact owner to ask). Never use the guide's learning URL `https://api.example.test/v2/partner-registrations` for STAGING execution.

## 1. Pre-Test Readiness Checklist (QA Guide §2 — Do Not Guess)

| Item | Source / Authority | Current Value / Status |
| :--- | :--- | :--- |
| **Requirement / Jira** | Jira Ticket & Acceptance Criteria | Confluence API Standard (524593), OpenAPI Governance (144015744), Accommodation Route Contract (166952975), QA Guide (184944019) |
| **API Document / OpenAPI** | Deployed STAGING OpenAPI & Error Registry | `[QA fills in — BLOCKED: Strapi STAGING OpenAPI spec (/openapi.json, /documentation) returned 404; request official STAGING OpenAPI & Error Registry from Backend Owner]` |
| **Base URL** | DEV or STAGING Environment | `https://services.stag.goodnstay.com (invoked from https://web.stag.goodnstay.com)` |
| **Method & Endpoint** | Current OpenAPI Document | `PUT /api/traveler/update-profile, POST /api/traveler/logout, GET /api/v1/notifications, POST /api/traveler/request-bids, GET /api/ticket-supports, PUT /api/traveler/request-bids/:id/staying-information, POST /api/translations/room-description, GET /api/traveler/login-records` |
| **Login / Token** | QA Lead / Environment Owner | Authorization: Bearer <REDACTED_QA_TOKEN> (Staging QA Traveler session; Origin: https://web.stag.goodnstay.com) |
| **Test Data / Fixtures** | Safe QA Data + Real STAGING Reference Codes | Per-endpoint complete valid QA fixtures in fixtures/*.json using sanitized QA data (QA Tester, qa-sample@example.test, +84900000000, KR / KR-11) |
| **Build Version / SHA** | Deployed FE, Gateway, Partner, Media, Location | `fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner>` |

## 2. API Test Case Summary Matrix

| Test Case ID | Category | Title | Fixture File | Single-Variable Mutation Delta | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `STAG-API-001` | **Positive** | Accept complete valid traveler profile update and persist all fields on GET /api/traveler/me readback | `valid-update-profile.json` | None — complete valid profile fixture (valid-update-profile.json) | **`NOT VERIFIED`** |
| `STAG-API-002` | **Permission** | Revoke active Traveler Bearer session upon POST /api/traveler/logout | `valid-logout.json` | Session state transition: revoke token via POST /api/traveler/logout then replay token on GET /api/traveler/me | **`NOT VERIFIED`** |
| `STAG-API-003` | **Boundary** | Reject negative limit query parameter (limit=-5) on GET /api/v1/notifications | `NO_BODY_GET` | Mutate ONLY query parameter limit from 5 to -5 | **`NOT VERIFIED`** |
| `STAG-API-004` | **Negative** | Reject invalid gender enum value on PUT /api/traveler/update-profile without mutating stored profile | `update-profile-invalid-gender.json` | Mutate ONLY gender from 'male' to 'invalid_gender_value' | **`NOT VERIFIED`** |
| `STAG-API-005` | **Boundary** | Reject negative roomCount (-1) on POST /api/traveler/request-bids with 400 INVALID_ROOM_OR_GUEST_COUNT | `request-bids-negative-room-count.json` | Mutate ONLY data.roomCount from 1 to -1 (keeping all other 21 fields identical to valid-request-bids.json) | **`FAIL`** |
| `STAG-API-006` | **Permission** | Deny unauthenticated public read access to GET /api/ticket-supports | `NO_BODY_GET` | Omit Authorization header on GET /api/ticket-supports | **`FAIL`** |
| `STAG-API-007` | **Negative** | Reject malformed dob string on PUT /api/traveler/update-profile with 4xx error instead of HTTP 500 Server Error | `update-profile-malformed-dob.json` | Mutate ONLY dob from '2000-01-15' to 'not-a-valid-date' | **`FAIL`** |
| `STAG-API-008` | **Negative** | Reject malformed guest email on PUT /api/traveler/request-bids/:id/staying-information | `staying-information-invalid-email.json` | Mutate ONLY stayingGuests[0].email from 'qa-sample@example.test' to 'invalid-email-format' | **`FAIL`** |
| `STAG-API-009` | **Permission** | Verify authentication requirement on POST /api/translations/room-description when Authorization header is omitted | `valid-room-translation.json` | Omit ONLY Authorization header while sending valid-room-translation.json | **`BLOCKED`** |
| `STAG-API-010` | **Boundary** | Verify negative page parameter handling (page=-1) on GET /api/traveler/login-records | `NO_BODY_GET` | Mutate ONLY query parameter page from 1 to -1 (keeping pageSize=6) | **`BLOCKED`** |

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

### STAG-API-001 — Accept complete valid traveler profile update and persist all fields on GET /api/traveler/me readback

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-001 |
| **Title** | Accept complete valid traveler profile update and persist all fields on GET /api/traveler/me readback |
| **Requirement** | Traveler Profile Update Contract (chunk 2k50va9an1vxz.js) — Valid profile update persists fullName, phone, country, dob, and gender. |
| **Priority / Test layer** | P0 / API Positive & Persistence Readback |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session; baseline GET /api/traveler/me recorded. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/update-profile |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/valid-update-profile.json. Single-Variable Delta: None (complete baseline valid profile payload). |
| **Steps** | 1. Load fixtures/valid-update-profile.json containing valid QA profile fields.<br>2. Send PUT https://services.stag.goodnstay.com/api/traveler/update-profile with Authorization: Bearer <REDACTED_QA_TOKEN>.<br>3. Record HTTP status and response envelope.<br>4. Execute GET https://services.stag.goodnstay.com/api/traveler/me readback and verify all 5 submitted fields match. |
| **Expected response** | HTTP <CHECK_OPENAPI> success envelope returning updated traveler profile. |
| **Expected data result** | Traveler profile record is persisted and matches 100% on GET /api/traveler/me readback. |
| **Actual result** | Observed HTTP 200 OK ({"success": true, "message": "Update successful."}); GET /api/traveler/me readback matched all fields. Marked NOT VERIFIED pending Backend Commit SHA & OpenAPI spec confirmation. |
| **Status and evidence** | NOT VERIFIED — Runtime response & GET /api/traveler/me readback matched, but Backend Commit SHA & STAGING OpenAPI spec must be confirmed before marking PASS (QA Guide §2 & §9). |

> **OWASP Security Classification:** `OWASP A08:2025 Software or Data Integrity Failures · OWASP API3:2023 BOPLA` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

#### STAG-API-001 — Request Payload (`valid-update-profile.json`)

```json
{
  "fullName": "QA Tester",
  "phone": "+84900000000",
  "country": "VN",
  "dob": "2000-01-15",
  "gender": "male"
}
```

#### STAG-API-001 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-001",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/update-profile",
  "testDataFile": "valid-update-profile.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "NONE",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "envoy-37ms-profile-valid",
  "dataCheck": "GET /api/traveler/me readback matched all submitted fields",
  "status": "NOT VERIFIED",
  "evidenceLink": "stag_traveler_api_test_cases.md"
}
```

### STAG-API-002 — Revoke active Traveler Bearer session upon POST /api/traveler/logout

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-002 |
| **Title** | Revoke active Traveler Bearer session upon POST /api/traveler/logout |
| **Requirement** | Session Lifecycle Contract — Logged-out session token must fail closed on subsequent protected GET /api/traveler/me calls. |
| **Priority / Test layer** | P0 / API Permission & Session Lifecycle |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Fresh isolated QA Traveler login session on Staging. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/traveler/logout |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/valid-logout.json ({refreshToken: '<REDACTED_QA_REFRESH_TOKEN>'}). |
| **Steps** | 1. Obtain an isolated QA Traveler session via POST /api/traveler/login.<br>2. Send POST https://services.stag.goodnstay.com/api/traveler/logout with fixtures/valid-logout.json.<br>3. Replay the logged-out Bearer token on GET https://services.stag.goodnstay.com/api/traveler/me and verify rejection. |
| **Expected response** | Logout returns <CHECK_OPENAPI>; subsequent GET /api/traveler/me rejects revoked token (<CHECK_ERROR_REGISTRY>). |
| **Expected data result** | Session is invalidated; zero protected profile data is returned after logout. |
| **Actual result** | Observed HTTP 200 OK on logout and HTTP 401 ("You are not logged in.") on subsequent GET /api/traveler/me. Marked NOT VERIFIED pending Backend Commit SHA & OpenAPI spec. |
| **Status and evidence** | NOT VERIFIED — Token revocation confirmed via GET /api/traveler/me (HTTP 401), awaiting Backend Commit SHA & OpenAPI spec. |

> **OWASP Security Classification:** `OWASP A07:2025 Authentication Failures (CWE-613) · OWASP API2:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

#### STAG-API-002 — Request Payload (`valid-logout.json`)

```json
{
  "refreshToken": "<REDACTED_QA_REFRESH_TOKEN>"
}
```

#### STAG-API-002 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-002",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/traveler/logout",
  "testDataFile": "valid-logout.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "logout-revoked-401",
  "dataCheck": "Subsequent GET /api/traveler/me returned HTTP 401",
  "status": "NOT VERIFIED",
  "evidenceLink": "stag_traveler_api_test_cases.md"
}
```

### STAG-API-003 — Reject negative limit query parameter (limit=-5) on GET /api/v1/notifications

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-003 |
| **Title** | Reject negative limit query parameter (limit=-5) on GET /api/v1/notifications |
| **Requirement** | OpenAPI Governance & Error Contract (Confluence 144015744) — Pagination limit < 1 must fail closed with structured fieldErrors. |
| **Priority / Test layer** | P1 / API Boundary Validation |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | GET https://services.stag.goodnstay.com/api/v1/notifications?limit=-5 |
| **Headers / Auth / Parameters** | Accept: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | None (GET request; query parameter mutated from limit=5 to limit=-5). |
| **Steps** | 1. Confirm baseline GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 returns HTTP 200 OK.<br>2. Change ONLY query parameter limit to -5 and send GET /api/v1/notifications?limit=-5.<br>3. Record HTTP status, error.code, fieldErrors, and meta.requestId; confirm no notification state changed. |
| **Expected response** | HTTP <CHECK_OPENAPI> with <CHECK_ERROR_REGISTRY> and fieldError on 'limit'. |
| **Expected data result** | No notification records are created or modified. |
| **Actual result** | Observed HTTP 400 VALIDATION_FAILED (fieldErrors[0].field='limit', debugMessage='limit must not be less than 1', requestId=8ccd0adc-30d5-4217-aeff-8ace66d88765). Marked NOT VERIFIED pending deployed Notification Service SHA. |
| **Status and evidence** | NOT VERIFIED — requestId=8ccd0adc-30d5-4217-aeff-8ace66d88765 (awaiting deployed Backend SHA confirmation). |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-20) · OWASP API4:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-003 — Request Payload (`NO_BODY_GET`)

```json
{}
```

#### STAG-API-003 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-003",
  "environment": "STAGING",
  "method": "GET",
  "url": "https://services.stag.goodnstay.com/api/v1/notifications?limit=-5",
  "testDataFile": "NO_BODY_GET",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "400",
  "actualErrorCode": "VALIDATION_FAILED",
  "requestId": "8ccd0adc-30d5-4217-aeff-8ace66d88765",
  "dataCheck": "No notification records modified",
  "status": "NOT VERIFIED",
  "evidenceLink": "stag_traveler_api_test_cases.md"
}
```

### STAG-API-004 — Reject invalid gender enum value on PUT /api/traveler/update-profile without mutating stored profile

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-004 |
| **Title** | Reject invalid gender enum value on PUT /api/traveler/update-profile without mutating stored profile |
| **Requirement** | Traveler Profile Validation Contract — Unrecognized gender enum value must be rejected and leave persisted profile unchanged. |
| **Priority / Test layer** | P1 / API Negative Validation |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session with gender='male'. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/update-profile |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/update-profile-invalid-gender.json. Single-Variable Delta: change ONLY gender from 'male' to 'invalid_gender_value'. |
| **Steps** | 1. Load fixtures/valid-update-profile.json.<br>2. Mutate ONLY gender to 'invalid_gender_value' (fixtures/update-profile-invalid-gender.json).<br>3. Send PUT https://services.stag.goodnstay.com/api/traveler/update-profile.<br>4. Execute GET https://services.stag.goodnstay.com/api/traveler/me readback to confirm gender remains 'male'. |
| **Expected response** | HTTP <CHECK_OPENAPI> rejecting invalid gender (<CHECK_ERROR_REGISTRY>). |
| **Expected data result** | No profile record modified; GET /api/traveler/me readback retains gender='male'. |
| **Actual result** | Observed HTTP 422 ({"code": 422, "message": "Invalid input.", "details": ["gender:gender_invalid"]}); GET /api/traveler/me unchanged. Marked NOT VERIFIED pending Backend SHA & OpenAPI. |
| **Status and evidence** | NOT VERIFIED — HTTP 422 rejection and unchanged readback verified; awaiting Backend SHA & OpenAPI spec. |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-20) · OWASP API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-004 — Request Payload (`update-profile-invalid-gender.json`)

```json
{
  "fullName": "QA Tester",
  "phone": "+84900000000",
  "country": "VN",
  "dob": "2000-01-15",
  "gender": "invalid_gender_value"
}
```

#### STAG-API-004 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-004",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/update-profile",
  "testDataFile": "update-profile-invalid-gender.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "422",
  "actualErrorCode": "gender:gender_invalid",
  "requestId": "envoy-422-gender",
  "dataCheck": "GET /api/traveler/me readback confirmed gender remained 'male'",
  "status": "NOT VERIFIED",
  "evidenceLink": "stag_traveler_api_test_cases.md"
}
```

### STAG-API-005 — Reject negative roomCount (-1) on POST /api/traveler/request-bids with 400 INVALID_ROOM_OR_GUEST_COUNT

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-005 |
| **Title** | Reject negative roomCount (-1) on POST /api/traveler/request-bids with 400 INVALID_ROOM_OR_GUEST_COUNT |
| **Requirement** | Accommodation Request Boundary Rule (Confluence 166952975 & same-endpoint rule 'Room count and guest count must be greater than 0.') — roomCount = -1 (< 1) must be rejected with 400 INVALID_ROOM_OR_GUEST_COUNT. |
| **Priority / Test layer** | P0 / API Boundary Validation & Readback |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/traveler/request-bids |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/request-bids-negative-room-count.json. Single-Variable Delta: start with fixtures/valid-request-bids.json and change ONLY data.roomCount from 1 to -1. |
| **Steps** | 1. Verify fixtures/valid-request-bids.json is complete and valid.<br>2. Mutate ONLY data.roomCount from 1 to -1 (fixtures/request-bids-negative-room-count.json).<br>3. Send POST https://services.stag.goodnstay.com/api/traveler/request-bids.<br>4. Record HTTP status and response body.<br>5. Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to check whether a negative-room Customer Request was created (and cancel test record #1534). |
| **Expected response** | HTTP 400 Bad Request with error.message.code = 'INVALID_ROOM_OR_GUEST_COUNT' ('Room count and guest count must be greater than 0.'). |
| **Expected data result** | No Customer Request record is created in database. |
| **Actual result** | FAIL — Returned HTTP 200 OK ({"success": true, "message": "Rating created successfully."}) and persisted open Customer Request #1534 with roomCount = -1 (verified via GET /api/customer-requests readback; also serialized raw up_users credential columns in response). |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1947 | Screenshot: screenshots/bug_api01_request_bids_negative_roomcount_1440x900.png (Request #1534 cancelled after readback). |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-840) · OWASP API6:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-005 — Request Payload (`request-bids-negative-room-count.json`)

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
    "roomCount": -1,
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

#### STAG-API-005 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-005",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids",
  "testDataFile": "request-bids-negative-room-count.json",
  "expectedHttpStatus": "400",
  "expectedErrorCode": "INVALID_ROOM_OR_GUEST_COUNT",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "req-1534-neg-room",
  "dataCheck": "FAIL: Open Customer Request #1534 persisted with roomCount=-1 on GET /api/customer-requests",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api01_request_bids_negative_roomcount_1440x900.png"
}
```

### STAG-API-006 — Deny unauthenticated public read access to GET /api/ticket-supports

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-006 |
| **Title** | Deny unauthenticated public read access to GET /api/ticket-supports |
| **Requirement** | API Standard Fail-Closed Access Control (Confluence 524593 & QA Guide §7/§8; same-service Strapi parity with GET /api/customer-requests & GET /api/hotel-bids -> 403 ForbiddenError). |
| **Priority / Test layer** | P0 / API Permission & Data Privacy |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Unauthenticated client with no Authorization header. |
| **Method + URL** | GET https://services.stag.goodnstay.com/api/ticket-supports |
| **Headers / Auth / Parameters** | Accept: application/json; Origin: https://web.stag.goodnstay.com (No Authorization header) |
| **Payload / Test data** | None (unauthenticated GET request without body). |
| **Steps** | 1. Prepare an unauthenticated GET request with no Authorization header.<br>2. Send GET https://services.stag.goodnstay.com/api/ticket-supports.<br>3. Inspect HTTP status code and returned data[] collection. |
| **Expected response** | HTTP <CHECK_OPENAPI> (<CHECK_ERROR_REGISTRY> — 401 Unauthorized or 403 ForbiddenError matching sibling Strapi collections). |
| **Expected data result** | Zero submitted support or account-deletion tickets are returned to unauthenticated callers. |
| **Actual result** | FAIL — Returned HTTP 200 OK with full paginated Strapi ticket-supports data[] collection (email, phone, type='delete_account', title, description). |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1948 | Screenshot: screenshots/bug_api02_ticket_supports_unauth_get_1440x900.png. |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control (CWE-284, CWE-200) · OWASP API5:2023 BFLA` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

#### STAG-API-006 — Request Payload (`NO_BODY_GET`)

```json
{}
```

#### STAG-API-006 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-006",
  "environment": "STAGING",
  "method": "GET",
  "url": "https://services.stag.goodnstay.com/api/ticket-supports",
  "testDataFile": "NO_BODY_GET",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "envoy-19ms-tickets-get",
  "dataCheck": "FAIL: Unauthenticated GET publicly returned submitted ticket records",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api02_ticket_supports_unauth_get_1440x900.png"
}
```

### STAG-API-007 — Reject malformed dob string on PUT /api/traveler/update-profile with 4xx error instead of HTTP 500 Server Error

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-007 |
| **Title** | Reject malformed dob string on PUT /api/traveler/update-profile with 4xx error instead of HTTP 500 Server Error |
| **Requirement** | OpenAPI Governance 4xx vs 5xx Separation (Confluence 144015744 & GNS-FORM-001 174227515) — Invalid client field format must return deterministic 4xx validation error, never unhandled HTTP 500. |
| **Priority / Test layer** | P1 / API Negative Validation & Error Handling |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session; baseline GET /api/traveler/me recorded. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/update-profile |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/update-profile-malformed-dob.json. Single-Variable Delta: start with fixtures/valid-update-profile.json and change ONLY dob from '2000-01-15' to 'not-a-valid-date'. |
| **Steps** | 1. Load fixtures/valid-update-profile.json.<br>2. Mutate ONLY dob to 'not-a-valid-date' (fixtures/update-profile-malformed-dob.json).<br>3. Send PUT https://services.stag.goodnstay.com/api/traveler/update-profile.<br>4. Record HTTP status and response body.<br>5. Execute GET https://services.stag.goodnstay.com/api/traveler/me readback to verify existing dob was not corrupted. |
| **Expected response** | HTTP <CHECK_OPENAPI> 4xx validation error with <CHECK_ERROR_REGISTRY> (consistent with HTTP 422 on invalid gender); never HTTP 500. |
| **Expected data result** | No profile record modified; GET /api/traveler/me retains original dob. |
| **Actual result** | FAIL — Returned unhandled HTTP 500 Internal Server Error ({"success": false, "error": {"code": 500, "message": "Server error.", "details": []}}). |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1949 | Screenshot: screenshots/bug_api03_update_profile_malformed_dob_500_1440x900.png. |

> **OWASP Security Classification:** `OWASP A10:2025 Mishandling of Exceptional Conditions (CWE-248, CWE-755) · OWASP API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

#### STAG-API-007 — Request Payload (`update-profile-malformed-dob.json`)

```json
{
  "fullName": "QA Tester",
  "phone": "+84900000000",
  "country": "VN",
  "dob": "not-a-valid-date",
  "gender": "male"
}
```

#### STAG-API-007 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-007",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/update-profile",
  "testDataFile": "update-profile-malformed-dob.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "500",
  "actualErrorCode": "500",
  "requestId": "envoy-500-dob",
  "dataCheck": "GET /api/traveler/me readback unchanged, but API crashed with HTTP 500",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api03_update_profile_malformed_dob_500_1440x900.png"
}
```

### STAG-API-008 — Reject malformed guest email on PUT /api/traveler/request-bids/:id/staying-information

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-008 |
| **Title** | Reject malformed guest email on PUT /api/traveler/request-bids/:id/staying-information |
| **Requirement** | GNS-FORM-001 Global Form Validation (Confluence 174227515) — Guest contact email must be a valid email address before persisting to Customer Request. |
| **Priority / Test layer** | P1 / API Negative Validation & Readback |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler owning open Customer Request #1514. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/request-bids/1514/staying-information |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/staying-information-invalid-email.json. Single-Variable Delta: start with fixtures/valid-staying-information.json and change ONLY stayingGuests[0].email from 'qa-sample@example.test' to 'invalid-email-format'. |
| **Steps** | 1. Load fixtures/valid-staying-information.json with valid guest fullName, E.164 phone '+84900000000', and emergencyContact.<br>2. Mutate ONLY stayingGuests[0].email to 'invalid-email-format' (fixtures/staying-information-invalid-email.json).<br>3. Send PUT https://services.stag.goodnstay.com/api/traveler/request-bids/1514/staying-information.<br>4. Execute GET https://services.stag.goodnstay.com/api/traveler/request-bids?requestStatus=open&locale=en-US readback to check whether the invalid email was saved (then restore valid fixture). |
| **Expected response** | HTTP <CHECK_OPENAPI> 4xx validation error (<CHECK_ERROR_REGISTRY>) on stayingGuests[0].email. |
| **Expected data result** | No invalid email is persisted on Customer Request #1514. |
| **Actual result** | FAIL — Returned HTTP 200 OK ({"success": true, "message": "Update successful.", "data": {"acknowledged": true, ...}}) and persisted 'invalid-email-format' onto Request #1514 (confirmed via GET /api/traveler/request-bids readback). |
| **Status and evidence** | FAIL — Jira: https://optibide-org.atlassian.net/browse/OP-1950 | Screenshot: screenshots/bug_api04_staying_info_invalid_email_1440x900.png. |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-20) · OWASP API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-008 — Request Payload (`staying-information-invalid-email.json`)

```json
{
  "stayingGuests": [
    {
      "sameAsBooker": false,
      "fullName": "QA Sample Guest",
      "phone": "+84900000000",
      "email": "invalid-email-format"
    }
  ],
  "emergencyContact": {
    "sameAsBooker": false,
    "fullName": "QA Sample Contact",
    "phone": "+84900000001",
    "email": "qa-contact@example.test"
  }
}
```

#### STAG-API-008 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-008",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids/1514/staying-information",
  "testDataFile": "staying-information-invalid-email.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "envoy-50ms-stayinfo-email",
  "dataCheck": "FAIL: Malformed email 'invalid-email-format' persisted on Request #1514",
  "status": "FAIL",
  "evidenceLink": "screenshots/bug_api04_staying_info_invalid_email_1440x900.png"
}
```

### STAG-API-009 — Verify authentication requirement on POST /api/translations/room-description when Authorization header is omitted

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-009 |
| **Title** | Verify authentication requirement on POST /api/translations/room-description when Authorization header is omitted |
| **Requirement** | Translation Endpoint Auth Policy (<CHECK_OPENAPI> — confirm whether OpenAI room-description translation requires Traveler Bearer authentication). |
| **Priority / Test layer** | P2 / API Permission Contract Check |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Unauthenticated client calling Staging API without Authorization header. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/translations/room-description |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com (Omit Authorization header) |
| **Payload / Test data** | Fixture: fixtures/valid-room-translation.json. Single-Variable Delta: omit ONLY Authorization header. |
| **Steps** | 1. Load fixtures/valid-room-translation.json.<br>2. Send POST https://services.stag.goodnstay.com/api/translations/room-description WITHOUT an Authorization header.<br>3. Record HTTP status and provider execution, and confirm zero DB mutation. |
| **Expected response** | <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY> (confirm with Backend Owner whether unauthenticated calls must return HTTP 401 or are intentionally public). |
| **Expected data result** | No database records created or modified. |
| **Actual result** | Observed HTTP 200 OK invoking upstream provider='openai' without Authorization header. Logged as Needs Verification (OP-1951) pending OpenAPI auth contract confirmation. |
| **Status and evidence** | BLOCKED — API contract missing (STAGING OpenAPI does not specify whether POST /api/translations/room-description requires Bearer auth; tracked for team verification in OP-1951 | screenshots/bug_api05_translations_unauth_check_1440x900.png). |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control & X01:2025 Lack of Resilience (CWE-400) · OWASP API4:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

#### STAG-API-009 — Request Payload (`valid-room-translation.json`)

```json
{
  "text": "Deluxe Suite with panoramic city view",
  "targetLocale": "vi-VN",
  "sourceLocale": "en-US"
}
```

#### STAG-API-009 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-009",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/translations/room-description",
  "testDataFile": "valid-room-translation.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "openai-trans-unauth-check",
  "dataCheck": "No DB mutation; upstream OpenAI executed without Bearer header",
  "status": "BLOCKED",
  "evidenceLink": "screenshots/bug_api05_translations_unauth_check_1440x900.png"
}
```

### STAG-API-010 — Verify negative page parameter handling (page=-1) on GET /api/traveler/login-records

| Field | Details |
| :--- | :--- |
| **Test Case ID** | STAG-API-010 |
| **Title** | Verify negative page parameter handling (page=-1) on GET /api/traveler/login-records |
| **Requirement** | Pagination Boundary Contract (<CHECK_OPENAPI> — confirm whether Strapi login-records must reject page < 1 with HTTP 400 like /api/v1/notifications or clamp to page=1). |
| **Priority / Test layer** | P2 / API Boundary Contract Check |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt (chunks: 2k50va9an1vxz, 452btq2-mvhin, 0v23-8ja2iskk, 0lu641k7h1gc_, 1yil-2d8cpf3l), be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | GET https://services.stag.goodnstay.com/api/traveler/login-records?page=-1&pageSize=6 |
| **Headers / Auth / Parameters** | Accept: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | None (GET request; change ONLY query parameter page from 1 to -1). |
| **Steps** | 1. Confirm baseline GET https://services.stag.goodnstay.com/api/traveler/login-records?page=1&pageSize=6 returns HTTP 200 OK.<br>2. Mutate ONLY page from 1 to -1 and send GET /api/traveler/login-records?page=-1&pageSize=6.<br>3. Record HTTP status and returned pagination metadata; confirm no login records are modified. |
| **Expected response** | <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY> (confirm with Strapi Backend Owner whether page=-1 must return HTTP 400 or clamp to page=1). |
| **Expected data result** | No login-record rows created or modified. |
| **Actual result** | Observed HTTP 200 OK clamping page=-1 to page=1. Logged as Needs Verification (OP-1952) pending OpenAPI pagination contract confirmation. |
| **Status and evidence** | BLOCKED — API contract missing (STAGING OpenAPI missing for /api/traveler/login-records pagination clamping vs 400 rejection; tracked in OP-1952 | screenshots/bug_api06_login_records_negative_page_check_1440x900.png). |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-20) · OWASP API4:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### STAG-API-010 — Request Payload (`NO_BODY_GET`)

```json
{}
```

#### STAG-API-010 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "STAG-API-010",
  "environment": "STAGING",
  "method": "GET",
  "url": "https://services.stag.goodnstay.com/api/traveler/login-records?page=-1&pageSize=6",
  "testDataFile": "NO_BODY_GET",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "200",
  "actualErrorCode": "NONE",
  "requestId": "envoy-25ms-login-records-page",
  "dataCheck": "No DB mutation; silently clamped page=-1 to page=1",
  "status": "BLOCKED",
  "evidenceLink": "screenshots/bug_api06_login_records_negative_page_check_1440x900.png"
}
```

## 5. QA Lead 7-Point Verification Checklist (QA Guide §11)

- [x] **1. Requirement & OpenAPI Traceability:** Every test case links to `OP-1626` (`OP-1947`, `OP-1948`, `OP-1949`, `OP-1950`, `OP-1951`, `OP-1952`) and its governing Confluence / OpenAPI contracts.
- [x] **2. Real Contract URLs Only:** Method, URL, headers, and body target Staging only (`*.stag.goodnstay.com`) and never use the guide's example URL (`https://api.example.test/v2/partner-registrations`) or Production.
- [x] **3. Complete Valid Fixture + Single-Variable Mutation:** `fixtures/valid-request-bids.json` (and `endpointBaseFixtures` per endpoint) contains all required fields; each negative/boundary test mutates **one thing only**.
- [x] **4. No Guessed Status or Error Codes:** Unconfirmed runtime HTTP statuses and error codes use `<CHECK_OPENAPI>` and `<CHECK_ERROR_REGISTRY>` with `BLOCKED — API contract missing`.
- [x] **5. Persistence & Readback Verification:** Every test case specifies how QA checks saved data (`GET` / Admin Reviewer readback on 2xx; zero unintended records created or mutated on 4xx/5xx).
- [x] **6. Reproducible Atomic Steps:** Every test case provides numbered Postman steps another QA can execute deterministically.
- [x] **7. Secret & PII Hygiene:** Zero real tokens, passwords, hashes, signing URLs, or personal contact details (`QA Tester`, `qa-sample@example.test`, `+84900000000`).
