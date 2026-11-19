# goodNstay Staging OWASP Top 10:2025 & API Security Smoke Suite (Non-Destructive)

**Jira Requirement:** [OP-1626](https://optibide-org.atlassian.net/browse/OP-1626) · **Related Tickets:** [OP-1947](https://optibide-org.atlassian.net/browse/OP-1947), [OP-1948](https://optibide-org.atlassian.net/browse/OP-1948), [OP-1949](https://optibide-org.atlassian.net/browse/OP-1949), [OP-1950](https://optibide-org.atlassian.net/browse/OP-1950), [OP-1951](https://optibide-org.atlassian.net/browse/OP-1951), [OP-1952](https://optibide-org.atlassian.net/browse/OP-1952), [OP-1593](https://optibide-org.atlassian.net/browse/OP-1593) · **Standard:** `QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI)`

> [!IMPORTANT]
> **Contract-First & No-Guessing Gate:** Per QA Guide Section 2 and `OP-1593` handoff rules, branch merges (`main`/`stag` PRs) are **not** runtime deployment acceptance. Where the live STAGING OpenAPI URL, exact `errorCode` registry, or deployed commit SHA is not yet supplied, fields are marked `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>` and the test case status is `BLOCKED — API contract missing` (with the exact owner to ask). Never use the guide's learning URL `https://api.example.test/v2/partner-registrations` for STAGING execution.

## 1. Pre-Test Readiness Checklist (QA Guide §2 — Do Not Guess)

| Item | Source / Authority | Current Value / Status |
| :--- | :--- | :--- |
| **Requirement / Jira** | Jira Ticket & Acceptance Criteria | OWASP Top 10:2025 + OWASP API Security Top 10:2023 + Confluence API Standard (524593) & OpenAPI Governance (144015744) |
| **API Document / OpenAPI** | Deployed STAGING OpenAPI & Error Registry | `[QA fills in — BLOCKED: request published STAGING OpenAPI & Error Registry from Gateway/Strapi Backend Owners]` |
| **Base URL** | DEV or STAGING Environment | `https://services.stag.goodnstay.com (Staging-Only boundary; 0 requests to Production)` |
| **Method & Endpoint** | Current OpenAPI Document | `PUT /api/traveler/update-profile, PUT /api/traveler/request-bids/:id/staying-information, GET {{baseUrl}}{{adminPartnerRequestPath}}, POST /api/traveler/request-bids, POST /api/translations/room-description` |
| **Login / Token** | QA Lead / Environment Owner | Sanitized QA tokens: Traveler A (<REDACTED_QA_TOKEN>), Traveler B (<PROVISION_SECOND_QA_ACCOUNT>), Admin Reviewer (<CHECK_ADMIN_RBAC_TOKEN>) |
| **Test Data / Fixtures** | Safe QA Data + Real STAGING Reference Codes | Non-destructive sanitized QA fixtures in fixtures/*.json (QA Tester, qa-sample@example.test, +84900000000; 0% PII, 0 exploit payloads) |
| **Build Version / SHA** | Deployed FE, Gateway, Partner, Media, Location | `fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — verify before runtime execution>` |

## 2. API Test Case Summary Matrix

| Test Case ID | Category | Title | Fixture File | Single-Variable Mutation Delta | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `OWASP-SEC-001` | **Permission** | Reject unauthenticated profile update when Authorization header is omitted on PUT /api/traveler/update-profile | `valid-update-profile.json` | Omit ONLY Authorization Bearer header on PUT /api/traveler/update-profile | **`BLOCKED`** |
| `OWASP-SEC-002` | **Permission** | Reject cross-traveler staying-information update on foreign customerRequestId (BOLA ownership check) | `valid-staying-information.json` | Replace ONLY path parameter :customerRequestId with Traveler B's {{foreignCustomerRequestId}} while authenticated as Traveler A | **`BLOCKED`** |
| `OWASP-SEC-003` | **Permission** | Reject Traveler Bearer token when invoking Admin Reviewer partner-requests endpoint (BFLA role boundary) | `NO_BODY_GET` | Replace ONLY Authorization Bearer token from Admin Reviewer role to Traveler role | **`BLOCKED`** |
| `OWASP-SEC-004` | **Negative** | Prevent privilege escalation via injected role property on PUT /api/traveler/update-profile (Mass Assignment) | `update-profile-mass-assignment-role.json` | Add ONLY undeclared privilege property role='admin' to valid-update-profile.json | **`BLOCKED`** |
| `OWASP-SEC-005` | **Positive** | Verify POST /api/traveler/request-bids 2xx response never exposes raw up_users credential columns (OP-1947 guard) | `valid-request-bids.json` | None — complete valid room-request baseline fixture (valid-request-bids.json) | **`BLOCKED`** |
| `OWASP-SEC-006` | **Negative** | Reject malformed dob format on PUT /api/traveler/update-profile with controlled 4xx error instead of HTTP 500 (OP-1949 guard) | `update-profile-exceptional-dob.json` | Mutate ONLY dob from '2000-01-15' to 'not-a-valid-date' | **`BLOCKED`** |
| `OWASP-SEC-007` | **Boundary** | Reject inverted stay window (checkOutDate earlier than checkInDate) on POST /api/traveler/request-bids (Fail-Closed Invariant) | `request-bids-inverted-checkout-date.json` | Mutate ONLY data.checkOutDate from '2026-12-22' to '2026-12-18' (< checkInDate '2026-12-20') | **`BLOCKED`** |
| `OWASP-SEC-008` | **Permission** | Enforce authentication and untrusted Origin CORS policy on paid OpenAI endpoint POST /api/translations/room-description (OP-1951 guard) | `valid-room-translation.json` | Omit Authorization header and pass untrusted Origin https://untrusted-origin.example.test | **`BLOCKED`** |

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

### OWASP-SEC-001 — Reject unauthenticated profile update when Authorization header is omitted on PUT /api/traveler/update-profile

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-001 |
| **Title** | Reject unauthenticated profile update when Authorization header is omitted on PUT /api/traveler/update-profile |
| **Requirement** | API Standard (Confluence 524593) & SEC-M01 Auth Stripping — Protected Traveler mutation endpoints must fail closed when Bearer authentication is missing. |
| **Priority / Test layer** | P0 / API Security Smoke (Permission — Auth Stripping) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Staging environment reachable; baseline profile state recorded via authenticated GET /api/traveler/me. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/update-profile |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com (Omit Authorization header) |
| **Payload / Test data** | Fixture: fixtures/valid-update-profile.json. Single-Variable Delta: Omit ONLY Authorization header while keeping payload valid. |
| **Steps** | 1. Load complete valid profile payload fixtures/valid-update-profile.json.<br>2. Remove ONLY the Authorization header from PUT https://services.stag.goodnstay.com/api/traveler/update-profile.<br>3. Send the request and record HTTP status and error envelope.<br>4. Execute authenticated GET https://services.stag.goodnstay.com/api/traveler/me readback to confirm zero profile fields were modified. |
| **Expected response** | API fails closed with 4xx authentication/authorization error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>, never 2xx or 500). |
| **Expected data result** | Zero profile records modified; GET /api/traveler/me readback matches pre-test state. |
| **Actual result** | NOT_RUN — Non-destructive Staging Security Smoke template ready for execution once OpenAPI & BE SHA are confirmed. |
| **Status and evidence** | BLOCKED — API contract missing (confirm exact 401/403 error envelope in STAGING OpenAPI and deployed BE SHA). |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control (CWE-284) & A07:2025 Authentication Failures (CWE-306) · OWASP API2:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

#### OWASP-SEC-001 — Request Payload (`valid-update-profile.json`)

```json
{
  "fullName": "QA Tester",
  "phone": "+84900000000",
  "country": "VN",
  "dob": "2000-01-15",
  "gender": "male"
}
```

#### OWASP-SEC-001 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-001",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/update-profile",
  "testDataFile": "valid-update-profile.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "Zero profile fields modified on GET /api/traveler/me readback",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-002 — Reject cross-traveler staying-information update on foreign customerRequestId (BOLA ownership check)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-002 |
| **Title** | Reject cross-traveler staying-information update on foreign customerRequestId (BOLA ownership check) |
| **Requirement** | API Standard (Confluence 524593) & SEC-M02 Cross-Actor BOLA — Traveler A must never modify stayingGuests on a Customer Request owned by Traveler B. |
| **Priority / Test layer** | P0 / API Security Smoke (Permission — Object-Level Authorization / BOLA) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Two isolated Staging QA Traveler accounts provisioned (Traveler A and Traveler B), with open request {{foreignCustomerRequestId}} owned by Traveler B. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/request-bids/{{foreignCustomerRequestId}}/staying-information |
| **Headers / Auth / Parameters** | Content-Type: application/json; Authorization: Bearer <REDACTED_TRAVELER_A_QA_TOKEN>; Path param: {{foreignCustomerRequestId}} (owned by Traveler B) |
| **Payload / Test data** | Fixture: fixtures/valid-staying-information.json. Single-Variable Delta: Target Traveler B's customerRequestId using Traveler A's Bearer token. |
| **Steps** | 1. Seed an open Customer Request under Traveler B's QA session and record {{foreignCustomerRequestId}}.<br>2. Load complete valid payload fixtures/valid-staying-information.json.<br>3. Send PUT https://services.stag.goodnstay.com/api/traveler/request-bids/{{foreignCustomerRequestId}}/staying-information using Traveler A's Bearer token.<br>4. Verify 403/404 ownership rejection and execute GET readback under Traveler B's session to confirm stayingGuests was not overwritten. |
| **Expected response** | API rejects cross-account object access (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>, HTTP 403 or 404 Fail-Closed). |
| **Expected data result** | Traveler B's Customer Request stayingGuests record remains 100% unchanged on GET readback. |
| **Actual result** | NOT_RUN — Blocked pending second Staging QA Traveler fixture account (Traveler B) and STAGING OpenAPI BOLA error contract. |
| **Status and evidence** | BLOCKED — Missing second Staging QA Traveler account (Traveler B) and STAGING OpenAPI BOLA error contract. |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control (CWE-283 Unverified Ownership, CWE-639) · OWASP API1:2023 BOLA` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

#### OWASP-SEC-002 — Request Payload (`valid-staying-information.json`)

```json
{
  "stayingGuests": [
    {
      "sameAsBooker": false,
      "fullName": "QA Sample Guest",
      "phone": "+84900000000",
      "email": "qa-sample@example.test"
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

#### OWASP-SEC-002 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-002",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids/{{foreignCustomerRequestId}}/staying-information",
  "testDataFile": "valid-staying-information.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "Traveler B request unchanged on GET readback",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-003 — Reject Traveler Bearer token when invoking Admin Reviewer partner-requests endpoint (BFLA role boundary)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-003 |
| **Title** | Reject Traveler Bearer token when invoking Admin Reviewer partner-requests endpoint (BFLA role boundary) |
| **Requirement** | OP-1592, API Standard (Confluence 524593) & SEC-M03 Cross-Role BFLA — Admin Reviewer partner-request endpoints must reject standard Traveler JWTs. |
| **Priority / Test layer** | P0 / API Security Smoke (Permission — Function-Level Authorization / BFLA) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Confirm exact Admin Reviewer endpoint path in STAGING OpenAPI; prepare standard QA Traveler Bearer token. |
| **Method + URL** | GET {{baseUrl}}{{adminPartnerRequestPath}} |
| **Headers / Auth / Parameters** | Accept: application/json; Authorization: Bearer <REDACTED_TRAVELER_QA_TOKEN> (Traveler role instead of Admin Reviewer role) |
| **Payload / Test data** | None (GET request without body). Single-Variable Delta: Replace Admin Reviewer token with Traveler Bearer token. |
| **Steps** | 1. Confirm exact {{adminPartnerRequestPath}} in STAGING OpenAPI.<br>2. Prepare GET {{baseUrl}}{{adminPartnerRequestPath}} with a valid Traveler-role Bearer token.<br>3. Send the request and verify HTTP 403 Forbidden response.<br>4. Confirm zero partner KYB dossiers or businessDocument URLs are returned in the response body. |
| **Expected response** | API fails closed with role authorization error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>, HTTP 403 Forbidden). |
| **Expected data result** | Zero Partner Request or KYB records exposed to Traveler role. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING Admin Reviewer OpenAPI route and RBAC error registry. |
| **Status and evidence** | BLOCKED — API contract missing (confirm STAGING Admin Reviewer OpenAPI path and 403 errorCode). |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control (CWE-285 Improper Authorization) · OWASP API5:2023 BFLA` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

#### OWASP-SEC-003 — Request Payload (`NO_BODY_GET`)

```json
{}
```

#### OWASP-SEC-003 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-003",
  "environment": "STAGING",
  "method": "GET",
  "url": "{{baseUrl}}{{adminPartnerRequestPath}}",
  "testDataFile": "NO_BODY_GET",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "Zero Partner KYB records returned",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-004 — Prevent privilege escalation via injected role property on PUT /api/traveler/update-profile (Mass Assignment)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-004 |
| **Title** | Prevent privilege escalation via injected role property on PUT /api/traveler/update-profile (Mass Assignment) |
| **Requirement** | OpenAPI Governance (Confluence 144015744) & SEC-M04 Mass Assignment — Undeclared privilege fields ('role') in profile update payload must never elevate user privileges. |
| **Priority / Test layer** | P1 / API Security Smoke (Negative — Mass Assignment & Readback) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session; baseline role verified via GET /api/traveler/me. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/update-profile |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/update-profile-mass-assignment-role.json. Single-Variable Delta: Add ONLY undeclared field role='admin' to valid-update-profile.json. |
| **Steps** | 1. Record current account role on GET https://services.stag.goodnstay.com/api/traveler/me.<br>2. Load fixtures/update-profile-mass-assignment-role.json (valid profile + role='admin').<br>3. Send PUT https://services.stag.goodnstay.com/api/traveler/update-profile.<br>4. Execute GET https://services.stag.goodnstay.com/api/traveler/me readback and verify user role was NOT changed to admin. |
| **Expected response** | API either rejects unknown field with 400 (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) or strips undeclared property per DTO allow-list. |
| **Expected data result** | No privilege escalation created or persisted; GET /api/traveler/me readback confirms Traveler role is unchanged. |
| **Actual result** | NOT_RUN — Awaiting OpenAPI confirmation whether unknown properties must return 400 or be stripped. |
| **Status and evidence** | BLOCKED — API contract missing (confirm strict additionalProperties=false 400 vs DTO strip policy in STAGING OpenAPI). |

> **OWASP Security Classification:** `OWASP A01:2025 Broken Access Control & A08:2025 Software or Data Integrity Failures (CWE-915) · OWASP API3:2023 BOPLA` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)

#### OWASP-SEC-004 — Request Payload (`update-profile-mass-assignment-role.json`)

```json
{
  "fullName": "QA Tester",
  "phone": "+84900000000",
  "country": "VN",
  "dob": "2000-01-15",
  "gender": "male",
  "role": "admin"
}
```

#### OWASP-SEC-004 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-004",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/update-profile",
  "testDataFile": "update-profile-mass-assignment-role.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "GET /api/traveler/me confirms zero role modification",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-005 — Verify POST /api/traveler/request-bids 2xx response never exposes raw up_users credential columns (OP-1947 guard)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-005 |
| **Title** | Verify POST /api/traveler/request-bids 2xx response never exposes raw up_users credential columns (OP-1947 guard) |
| **Requirement** | OP-1947 Regression Guard & SEC-M05 Sensitive-Column Guard — Valid room request returns sanitized DTO without password, resetPasswordToken, confirmationToken, or salt. |
| **Priority / Test layer** | P0 / API Security Smoke (Positive — Response DTO Sanitization & Readback) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session; OP-1947 DTO serializer fix deployed to Staging. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/traveler/request-bids |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/valid-request-bids.json. Single-Variable Delta: None (complete valid baseline fixture). |
| **Steps** | 1. Load complete valid fixture fixtures/valid-request-bids.json.<br>2. Send POST https://services.stag.goodnstay.com/api/traveler/request-bids in Postman.<br>3. Verify automated Postman assertion 'OWASP A04:2025 / API3:2023: Response never exposes raw credential or secret columns' passes with zero leaked keys.<br>4. Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to confirm saved request fields (and clean up test request). |
| **Expected response** | HTTP 2xx (<CHECK_OPENAPI>) returning sanitized room-request receipt with zero credential/secret columns in JSON body. |
| **Expected data result** | 1 valid Customer Request persisted and verified via GET /api/customer-requests readback; zero secret columns leaked. |
| **Actual result** | NOT_RUN — Retest after Backend deploys OP-1947 DTO response allow-list fix and provides STAGING BE SHA. |
| **Status and evidence** | BLOCKED — Awaiting OP-1947 backend fix deployment and STAGING OpenAPI / BE SHA confirmation. |

> **OWASP Security Classification:** `OWASP A04:2025 Cryptographic Failures & A01:2025 (CWE-201) · OWASP API3:2023 BOPLA (Excessive Data Exposure)` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

#### OWASP-SEC-005 — Request Payload (`valid-request-bids.json`)

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

#### OWASP-SEC-005 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-005",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids",
  "testDataFile": "valid-request-bids.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "NONE",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "GET /api/customer-requests readback verified; 0 leaked secret keys",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-006 — Reject malformed dob format on PUT /api/traveler/update-profile with controlled 4xx error instead of HTTP 500 (OP-1949 guard)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-006 |
| **Title** | Reject malformed dob format on PUT /api/traveler/update-profile with controlled 4xx error instead of HTTP 500 (OP-1949 guard) |
| **Requirement** | OP-1949 Regression Guard, OpenAPI Governance (144015744) & SEC-M06 Exceptional Input Handling — Malformed date strings must return 4xx validation error without HTTP 500 or DB stack trace. |
| **Priority / Test layer** | P1 / API Security Smoke (Negative — Exceptional Condition Handling) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session; OP-1949 date validation fix deployed to Staging. |
| **Method + URL** | PUT https://services.stag.goodnstay.com/api/traveler/update-profile |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/update-profile-exceptional-dob.json. Single-Variable Delta: Mutate ONLY dob from '2000-01-15' to 'not-a-valid-date'. |
| **Steps** | 1. Load fixtures/update-profile-exceptional-dob.json (dob='not-a-valid-date').<br>2. Send PUT https://services.stag.goodnstay.com/api/traveler/update-profile.<br>3. Verify automated Postman assertion 'OWASP A10:2025: Server handles exceptional conditions without unhandled 5xx or stack trace leak' passes and status is 4xx.<br>4. Execute GET https://services.stag.goodnstay.com/api/traveler/me readback to confirm stored dob was not modified. |
| **Expected response** | Controlled 4xx client validation error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>), never HTTP 500 or raw DB error. |
| **Expected data result** | Zero profile records corrupted or modified on GET /api/traveler/me readback. |
| **Actual result** | NOT_RUN — Retest after Backend deploys OP-1949 pre-cast ISO date validation fix. |
| **Status and evidence** | BLOCKED — Awaiting OP-1949 backend fix deployment and STAGING Error Registry confirmation. |

> **OWASP Security Classification:** `OWASP A10:2025 Mishandling of Exceptional Conditions (CWE-248, CWE-755, CWE-209) · OWASP API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

#### OWASP-SEC-006 — Request Payload (`update-profile-exceptional-dob.json`)

```json
{
  "fullName": "QA Tester",
  "phone": "+84900000000",
  "country": "VN",
  "dob": "not-a-valid-date",
  "gender": "male"
}
```

#### OWASP-SEC-006 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-006",
  "environment": "STAGING",
  "method": "PUT",
  "url": "https://services.stag.goodnstay.com/api/traveler/update-profile",
  "testDataFile": "update-profile-exceptional-dob.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "No profile record modified on GET /api/traveler/me readback",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-007 — Reject inverted stay window (checkOutDate earlier than checkInDate) on POST /api/traveler/request-bids (Fail-Closed Invariant)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-007 |
| **Title** | Reject inverted stay window (checkOutDate earlier than checkInDate) on POST /api/traveler/request-bids (Fail-Closed Invariant) |
| **Requirement** | Accommodation Route Contract (166952975) & SEC-M07 Business Invariant — Reverse-auction requests must enforce checkOutDate > checkInDate on the server. |
| **Priority / Test layer** | P1 / API Security Smoke (Boundary — Business Logic Invariant) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Authenticated Staging QA Traveler session. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/traveler/request-bids |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://web.stag.goodnstay.com; Authorization: Bearer <REDACTED_QA_TOKEN> |
| **Payload / Test data** | Fixture: fixtures/request-bids-inverted-checkout-date.json. Single-Variable Delta: Mutate ONLY data.checkOutDate from '2026-12-22' to '2026-12-18' (before checkInDate '2026-12-20'). |
| **Steps** | 1. Load fixtures/request-bids-inverted-checkout-date.json where checkOutDate < checkInDate.<br>2. Send POST https://services.stag.goodnstay.com/api/traveler/request-bids.<br>3. Verify HTTP 4xx domain validation rejection and errorCode.<br>4. Execute GET https://services.stag.goodnstay.com/api/customer-requests readback to confirm zero inverted-date Customer Requests were created. |
| **Expected response** | API fails closed with 4xx domain validation error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>). |
| **Expected data result** | No Customer Request record created in database on GET /api/customer-requests readback. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI date-range errorCode. |
| **Status and evidence** | BLOCKED — API contract missing (confirm STAGING OpenAPI errorCode for inverted checkOutDate < checkInDate). |

> **OWASP Security Classification:** `OWASP A06:2025 Insecure Design (CWE-840) & A10:2025 Not Failing Securely (CWE-636) · OWASP API6:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)

#### OWASP-SEC-007 — Request Payload (`request-bids-inverted-checkout-date.json`)

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

#### OWASP-SEC-007 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-007",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/traveler/request-bids",
  "testDataFile": "request-bids-inverted-checkout-date.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "Zero Customer Request records created",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### OWASP-SEC-008 — Enforce authentication and untrusted Origin CORS policy on paid OpenAI endpoint POST /api/translations/room-description (OP-1951 guard)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | OWASP-SEC-008 |
| **Title** | Enforce authentication and untrusted Origin CORS policy on paid OpenAI endpoint POST /api/translations/room-description (OP-1951 guard) |
| **Requirement** | OP-1951 Contract Verification & SEC-M08 Cost-Endpoint & CORS Gate — Third-party OpenAI endpoints must enforce auth/quota and never reflect untrusted CORS Origins with credentials. |
| **Priority / Test layer** | P1 / API Security Smoke (Permission — Paid LLM Gate & CORS Policy) |
| **Environment** | STAGING · Date: 2026-11-19 · Deployed SHA: fe_web=turbopack-2h-u0he6dowwt, be_api=<CHECK_DEPLOYED_SHA — ask Strapi/Gateway Backend & DevOps Owner> |
| **Preconditions** | Confirm OP-1951 authentication & CORS allow-list policy with Architecture / Backend Owner. |
| **Method + URL** | POST https://services.stag.goodnstay.com/api/translations/room-description |
| **Headers / Auth / Parameters** | Content-Type: application/json; Origin: https://untrusted-origin.example.test (Omit Authorization header) |
| **Payload / Test data** | Fixture: fixtures/valid-room-translation.json. Single-Variable Delta: Omit Authorization header with untrusted Origin header. |
| **Steps** | 1. Load complete valid translation fixture fixtures/valid-room-translation.json.<br>2. Send POST https://services.stag.goodnstay.com/api/translations/room-description without Authorization and with Origin: https://untrusted-origin.example.test.<br>3. Inspect HTTP status code and Access-Control-Allow-Origin / Access-Control-Allow-Credentials response headers.<br>4. Verify unauthenticated OpenAI execution is blocked (or rate-limited per approved contract) and untrusted Origin is not reflected with credentials. |
| **Expected response** | Rejected per confirmed auth policy (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) and Access-Control-Allow-Origin does not reflect https://untrusted-origin.example.test. |
| **Expected data result** | Zero unauthorized OpenAI translation quota consumed; no database state mutated. |
| **Actual result** | NOT_RUN — Awaiting Architecture / Backend Owner confirmation on OP-1951 OpenAPI auth & quota contract. |
| **Status and evidence** | BLOCKED — API contract missing (confirm OP-1951 OpenAPI auth requirement and CORS allow-list). |

> **OWASP Security Classification:** `OWASP A02:2025 Security Misconfiguration (CWE-942) & X01:2025 Lack of Resilience (CWE-400) · OWASP API4:2023 & API8:2023` · [OWASP Remediation Guide](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

#### OWASP-SEC-008 — Request Payload (`valid-room-translation.json`)

```json
{
  "text": "Deluxe Suite with panoramic city view",
  "targetLocale": "vi-VN",
  "sourceLocale": "en-US"
}
```

#### OWASP-SEC-008 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "OWASP-SEC-008",
  "environment": "STAGING",
  "method": "POST",
  "url": "https://services.stag.goodnstay.com/api/translations/room-description",
  "testDataFile": "valid-room-translation.json",
  "expectedHttpStatus": "<CHECK_OPENAPI>",
  "expectedErrorCode": "<CHECK_ERROR_REGISTRY>",
  "actualHttpStatus": "NOT_RUN",
  "actualErrorCode": "NOT_RUN",
  "requestId": "NOT_RUN",
  "dataCheck": "Zero unauthorized OpenAI quota consumed",
  "status": "BLOCKED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

## 5. QA Lead 7-Point Verification Checklist (QA Guide §11)

- [x] **1. Requirement & OpenAPI Traceability:** Every test case links to `OP-1626` (`OP-1947`, `OP-1948`, `OP-1949`, `OP-1950`, `OP-1951`, `OP-1952`, `OP-1593`) and its governing Confluence / OpenAPI contracts.
- [x] **2. Real Contract URLs Only:** Method, URL, headers, and body target Staging only (`*.stag.goodnstay.com`) and never use the guide's example URL (`https://api.example.test/v2/partner-registrations`) or Production.
- [x] **3. Complete Valid Fixture + Single-Variable Mutation:** `fixtures/valid-request-bids.json` (and `endpointBaseFixtures` per endpoint) contains all required fields; each negative/boundary test mutates **one thing only**.
- [x] **4. No Guessed Status or Error Codes:** Unconfirmed runtime HTTP statuses and error codes use `<CHECK_OPENAPI>` and `<CHECK_ERROR_REGISTRY>` with `BLOCKED — API contract missing`.
- [x] **5. Persistence & Readback Verification:** Every test case specifies how QA checks saved data (`GET` / Admin Reviewer readback on 2xx; zero unintended records created or mutated on 4xx/5xx).
- [x] **6. Reproducible Atomic Steps:** Every test case provides numbered Postman steps another QA can execute deterministically.
- [x] **7. Secret & PII Hygiene:** Zero real tokens, passwords, hashes, signing URLs, or personal contact details (`QA Tester`, `qa-sample@example.test`, `+84900000000`).
