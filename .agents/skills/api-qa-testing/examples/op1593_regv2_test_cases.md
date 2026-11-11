# OP-1593 — Accommodation Registration V2 Cross-Service API & STAG E2E Test Suite

**Jira Requirement:** [OP-1593](https://optibide-org.atlassian.net/browse/OP-1593) · **Related Tickets:** [OP-1505](https://optibide-org.atlassian.net/browse/OP-1505), [OP-1589](https://optibide-org.atlassian.net/browse/OP-1589), [OP-1590](https://optibide-org.atlassian.net/browse/OP-1590), [OP-1591](https://optibide-org.atlassian.net/browse/OP-1591), [OP-1592](https://optibide-org.atlassian.net/browse/OP-1592), [OP-1514](https://optibide-org.atlassian.net/browse/OP-1514) · **Standard:** `QA Guide — How to Write API Test Cases (v1.0 EN / v3.0 VI)`

> [!IMPORTANT]
> **Contract-First & No-Guessing Gate:** Per QA Guide Section 2 and `OP-1593` handoff rules, branch merges (`main`/`stag` PRs) are **not** runtime deployment acceptance. Where the live STAGING OpenAPI URL, exact `errorCode` registry, or deployed commit SHA is not yet supplied, fields are marked `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>` and the test case status is `BLOCKED — API contract missing` (with the exact owner to ask). Never use the guide's learning URL `https://api.example.test/v2/partner-registrations` for STAGING execution.

## 1. Pre-Test Readiness Checklist (QA Guide §2 — Do Not Guess)

| Item | Source / Authority | Current Value / Status |
| :--- | :--- | :--- |
| **Requirement / Jira** | Jira Ticket & Acceptance Criteria | https://optibide-org.atlassian.net/browse/OP-1593 (Parent: OP-1505; BE: OP-1589, OP-1590, OP-1591, OP-1592; FE: OP-1514) |
| **API Document / OpenAPI** | Deployed STAGING OpenAPI & Error Registry | `[QA fills in — BLOCKED: request deployed STAGING OpenAPI link & BE-03 Error Registry from Gateway/Partner BE Owner]` |
| **Base URL** | DEV or STAGING Environment | `{{baseUrl}} = [real STAGING Gateway URL — never use https://api.example.test]` |
| **Method & Endpoint** | Current OpenAPI Document | `POST {{baseUrl}}{{registrationPath}} & GET {{baseUrl}}{{adminPartnerRequestPath}}/{{partnerRequestId}}` |
| **Login / Token** | QA Lead / Environment Owner | Check STAGING OpenAPI (Public submit vs Bearer token; server-side MEDIA_INTERNAL_BEARER; Admin Reviewer RBAC token for readback) |
| **Test Data / Fixtures** | Safe QA Data + Real STAGING Reference Codes | Safe QA fixture (QA Sample Hotel Da Nang, qa-sample@example.test, +84900000000) + real STAGING Location L1/L2 codes & finalized Media uploadReceipts |
| **Build Version / SHA** | Deployed FE, Gateway, Partner, Media, Location | `[QA fills in — verify deployed commit SHA for FE, API Gateway, Partner, Media, Location, and Admin before execution]` |

## 2. API Test Case Summary Matrix

| Test Case ID | Category | Title | Fixture File | Single-Variable Mutation Delta | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `REGV2-API-001` | **Positive** | Accept valid Accommodation Registration V2 and persist full dossier for Admin reviewer readback | `valid-registration-v2.json` | None — baseline complete valid Registration V2 fixture (valid-registration-v2.json) | **`BLOCKED`** |
| `REGV2-API-002` | **Negative** | Reject registration when primaryContact.phoneCountry is missing even with valid E.164 phone | `missing-phone-country.json` | Remove ONLY primaryContact.phoneCountry (keep primaryContact.phone = '+84900000000') | **`BLOCKED`** |
| `REGV2-API-003` | **Negative** | Reject registration when administrativeAreaCode (L2) does not belong to countryCode (L1) | `invalid-location-child.json` | Change ONLY administrativeAreaCode from '<VALID_VN_LOCATION_L2_CODE>' to 'KR-11' while keeping countryCode='VN' | **`BLOCKED`** |
| `REGV2-API-004` | **Boundary** | Reject registration when businessDocument collection is empty (0 documents, below 1–5 limit) | `zero-business-documents.json` | Set ONLY businessDocument to [] (0 documents, below minimum 1) | **`BLOCKED`** |
| `REGV2-API-005` | **Boundary** | Reject registration when gallery contains only 1 photo (below required 2–5 photos boundary) | `single-gallery-photo.json` | Set ONLY gallery to 1 photo element (below minimum 2 photos) | **`BLOCKED`** |
| `REGV2-API-006` | **Duplicate / Retry** | Ensure idempotent replay with same Idempotency-Key and identical payload creates no duplicate Partner Request | `valid-registration-v2.json` | Replay identical valid-registration-v2.json with the same Idempotency-Key header | **`BLOCKED`** |
| `REGV2-API-007` | **Duplicate / Retry** | Reject idempotency key reuse when payload is mutated (Same Idempotency-Key + Different Payload -> Conflict) | `idempotency-conflict-payload.json` | Mutate ONLY propertyName while reusing an already-committed Idempotency-Key | **`BLOCKED`** |
| `REGV2-API-008` | **Permission** | Reject registration when businessDocument references an asset owned by another actor (403 ASSET_OWNERSHIP_INVALID) | `foreign-asset-ownership.json` | Replace ONLY businessDocument[0] with a foreign-owned assetId/uploadReceipt | **`BLOCKED`** |
| `REGV2-API-009` | **Negative** | Reject HOTEL registration when conditional starRating is omitted | `missing-hotel-star-rating.json` | Remove ONLY starRating while keeping propertyTypeKey='HOTEL' | **`BLOCKED`** |
| `REGV2-API-010` | **Integration** | Accept registration when primaryContact.phoneCountry (KR/+82) legitimately differs from property countryCode (VN) | `mixed-phone-and-property-country.json` | Set primaryContact phoneCountry='KR' and phone='+821012345678' while property countryCode remains 'VN' | **`BLOCKED`** |

## 3. Approved Base Valid Fixture (`fixtures/valid-registration-v2.json`)

```json
{
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

## 4. Detailed 14-Field API Test Cases & Section 5.2 Execution Records

### REGV2-API-001 — Accept valid Accommodation Registration V2 and persist full dossier for Admin reviewer readback

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-001 |
| **Title** | Accept valid Accommodation Registration V2 and persist full dossier for Admin reviewer readback |
| **Requirement** | OP-1593, OP-1505, OP-1589, OP-1590, OP-1592 — Full valid V2 registration creates exactly one Partner Request with lossless REG-01..04 fields, ordered businessDocument[] (1–5) and gallery[] (2–5) refs, receipt identifiers, and 100% Admin Reviewer GET readback parity. |
| **Priority / Test layer** | P0 / Integration (FE BFF → API Gateway → Partner → Media/Location → Admin Readback) |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_001}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/valid-registration-v2.json. Single-Variable Delta: None (complete baseline valid V2 fixture with all required fields, canonical VN + L2 location code, 1 finalized businessDocument, 2 finalized gallery photos, and 3 true submissionAcknowledgements). |
| **Steps** | 1. Verify fixtures/valid-registration-v2.json contains all required V2 fields, finalized Media assetIds/uploadReceipts, and canonical Location L1/L2 codes.<br>2. Set a fresh UUID in header Idempotency-Key: {{idempotencyKey_001}}.<br>3. Send POST {{baseUrl}}{{registrationPath}} with fixtures/valid-registration-v2.json.<br>4. Record HTTP status, requestId, and receipt identifiers (requestCode, registrationId, partnerRequestId).<br>5. Execute authenticated Admin Reviewer readback GET {{baseUrl}}{{adminPartnerRequestPath}}/{{partnerRequestId}} and verify every REG-01..04 field, ordered businessDocument[1], and gallery[1..2] match 100% without contact->Owner privilege escalation. |
| **Expected response** | HTTP 2xx success from STAGING OpenAPI (<CHECK_OPENAPI>). Response body returns canonical receipt containing requestCode, registrationId, and partnerRequestId. |
| **Expected data result** | Exactly 1 Partner Request record is persisted in ota-partner-service. Admin Reviewer GET detail and Quick Preview return all submitted REG-01..04 fields and ordered businessDocument[] + gallery[] assets losslessly. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and deployed service SHAs. |
| **Status and evidence** | BLOCKED — API contract missing (STAGING OpenAPI URL, exact error registry, and deployed STAG service SHAs must be confirmed with QA Lead / Gateway & Partner BE Owners before runtime execution). |

#### REGV2-API-001 — Request Payload (`valid-registration-v2.json`)

```json
{
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-001 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-001",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-002 — Reject registration when primaryContact.phoneCountry is missing even with valid E.164 phone

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-002 |
| **Title** | Reject registration when primaryContact.phoneCountry is missing even with valid E.164 phone |
| **Requirement** | OP-1593, OP-1589, OP-1505 (QA Guide Section 5) — Explicit phone-country ISO-3166 alpha-2 selection is required on every V2 registration even when primaryContact.phone is already in valid international E.164 format (+84900000000). The API must not infer phoneCountry from the dialing prefix or countryCode. |
| **Priority / Test layer** | P0 / API & Gateway-Partner Validation |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_002}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/missing-phone-country.json. Single-Variable Delta: Start with valid-registration-v2.json and remove ONLY primaryContact.phoneCountry while keeping primaryContact.phone as '+84900000000' (valid E.164). |
| **Steps** | 1. Load fixtures/valid-registration-v2.json and verify all fields are valid.<br>2. Remove ONLY primaryContact.phoneCountry (keep primaryContact.phone = '+84900000000').<br>3. Send POST {{baseUrl}}{{registrationPath}} with fixtures/missing-phone-country.json.<br>4. Record HTTP status, errorCode, messageKey, fieldErrors for primaryContact.phoneCountry, and requestId; verify errorCode is NOT generic DOWNSTREAM_CLIENT_ERROR.<br>5. Query Admin Reviewer list/readback to confirm zero Partner Request records were created. |
| **Expected response** | API rejects the request with a validation error on field path primaryContact.phoneCountry. Exact HTTP status, errorCode, messageKey, and fieldErrors: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY> (must preserve Partner/Gateway V2 domain error identity, never generic DOWNSTREAM_CLIENT_ERROR). |
| **Expected data result** | No Partner Request is created or modified by this invalid request (verified via Admin GET check). |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry. |
| **Status and evidence** | BLOCKED — API contract missing (exact HTTP status and errorCode/messageKey in STAGING OpenAPI & BE-03 Error Registry must be confirmed with Gateway/Partner BE Owner). |

#### REGV2-API-002 — Request Payload (`missing-phone-country.json`)

```json
{
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
    "phone": "+84900000000",
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-002 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-002",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-003 — Reject registration when administrativeAreaCode (L2) does not belong to countryCode (L1)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-003 |
| **Title** | Reject registration when administrativeAreaCode (L2) does not belong to countryCode (L1) |
| **Requirement** | OP-1593, OP-1589, OP-1505 — Location Service canonical parent-child validation: administrativeAreaCode (Level 2) must be a valid child of the selected countryCode (Level 1). |
| **Priority / Test layer** | P0 / API & Location Service Integration |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_003}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/invalid-location-child.json. Single-Variable Delta: Start with valid-registration-v2.json (countryCode='VN') and change ONLY administrativeAreaCode to 'KR-11' (a child area belonging to South Korea, not Vietnam). |
| **Steps** | 1. Load fixtures/valid-registration-v2.json with countryCode='VN'.<br>2. Mutate ONLY administrativeAreaCode to 'KR-11' (fixtures/invalid-location-child.json).<br>3. Send POST {{baseUrl}}{{registrationPath}}.<br>4. Record HTTP status, errorCode, fieldErrors on administrativeAreaCode, and requestId; verify zero degradation to DOWNSTREAM_CLIENT_ERROR.<br>5. Verify via Admin GET readback that no Partner Request was created. |
| **Expected response** | API rejects the mismatched L1/L2 location hierarchy with canonical location validation error on administrativeAreaCode. Exact HTTP status and errorCode: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>. |
| **Expected data result** | No Partner Request is created or modified in database. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry. |
| **Status and evidence** | BLOCKED — API contract missing (confirm exact location parent-child mismatch errorCode in BE-03 Error Registry). |

#### REGV2-API-003 — Request Payload (`invalid-location-child.json`)

```json
{
  "propertyName": "QA Sample Hotel Da Nang",
  "legalName": "QA Sample Hospitality Company Limited",
  "streetAddress": "100 Vo Nguyen Giap Street, My An Ward",
  "countryCode": "VN",
  "administrativeAreaCode": "KR-11",
  "propertyTypeKey": "HOTEL",
  "starRating": 4,
  "officialWebsite": "https://qa-sample-hotel.example.test",
  "primaryContact": {
    "fullName": "QA Tester",
    "jobTitle": "General Manager",
    "email": "qa-sample@example.test",
    "phoneCountry": "VN",
    "phone": "+84900000000",
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-003 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-003",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-004 — Reject registration when businessDocument collection is empty (0 documents, below 1–5 limit)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-004 |
| **Title** | Reject registration when businessDocument collection is empty (0 documents, below 1–5 limit) |
| **Requirement** | OP-1593, OP-1590, OP-1505 (G-08 Multi-Document Contract) — Accommodation Registration V2 requires 1–5 finalized business registration/licence documents (businessDocument[]). |
| **Priority / Test layer** | P0 / API Boundary & Media Evidence Gate |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_004}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/zero-business-documents.json. Single-Variable Delta: Start with valid-registration-v2.json and set ONLY businessDocument to [] (0 items) while keeping gallery valid with 2 finalized photos. |
| **Steps** | 1. Load fixtures/valid-registration-v2.json.<br>2. Replace ONLY businessDocument with an empty array [] (fixtures/zero-business-documents.json).<br>3. Send POST {{baseUrl}}{{registrationPath}}.<br>4. Record HTTP status, errorCode, and fieldErrors for businessDocument.<br>5. Confirm via Admin GET check that no Partner Request was created. |
| **Expected response** | API rejects the request for violating the minimum 1 businessDocument rule. Exact HTTP status, errorCode, and field path: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>. |
| **Expected data result** | No Partner Request is created or modified in database. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry. |
| **Status and evidence** | BLOCKED — API contract missing (confirm exact businessDocument min-count errorCode in STAGING OpenAPI). |

#### REGV2-API-004 — Request Payload (`zero-business-documents.json`)

```json
{
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-004 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-004",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-005 — Reject registration when gallery contains only 1 photo (below required 2–5 photos boundary)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-005 |
| **Title** | Reject registration when gallery contains only 1 photo (below required 2–5 photos boundary) |
| **Requirement** | OP-1593, OP-1590, OP-1505 — Accommodation Registration V2 requires 2–5 finalized accommodation photos in gallery[]. |
| **Priority / Test layer** | P0 / API Boundary & Media Evidence Gate |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_005}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/single-gallery-photo.json. Single-Variable Delta: Start with valid-registration-v2.json and reduce ONLY gallery[] from 2 photos to 1 photo while keeping businessDocument[] valid (1 document). |
| **Steps** | 1. Load fixtures/valid-registration-v2.json.<br>2. Keep only the first photo in gallery[] so gallery.length == 1 (fixtures/single-gallery-photo.json).<br>3. Send POST {{baseUrl}}{{registrationPath}}.<br>4. Record HTTP status, errorCode, and fieldErrors on gallery.<br>5. Verify via Admin GET check that no Partner Request was created. |
| **Expected response** | API rejects the request for violating the 2–5 gallery photo boundary. Exact HTTP status, errorCode, and fieldErrors: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>. |
| **Expected data result** | No Partner Request is created or modified in database. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry. |
| **Status and evidence** | BLOCKED — API contract missing (confirm exact gallery min-count errorCode in STAGING OpenAPI). |

#### REGV2-API-005 — Request Payload (`single-gallery-photo.json`)

```json
{
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-005 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-005",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-006 — Ensure idempotent replay with same Idempotency-Key and identical payload creates no duplicate Partner Request

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-006 |
| **Title** | Ensure idempotent replay with same Idempotency-Key and identical payload creates no duplicate Partner Request |
| **Requirement** | OP-1593, OP-1592, OP-1590 (QA Guide Section 6 & 10) — Repeating the same registration request with the same Idempotency-Key and identical payload must return a deterministic receipt without creating duplicate Partner Requests. |
| **Priority / Test layer** | P0 / API Idempotency & Retry Safety |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_001}} (reused from REGV2-API-001); Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/valid-registration-v2.json. Single-Variable Delta: Reuse the exact same Idempotency-Key and identical valid payload sent in REGV2-API-001. |
| **Steps** | 1. Execute REGV2-API-001 first and record the returned partnerRequestId / registrationId / requestCode.<br>2. Send the exact same POST {{baseUrl}}{{registrationPath}} request again with the identical Idempotency-Key ({{idempotencyKey_001}}) and identical body.<br>3. Compare the second response's registrationId / partnerRequestId / requestCode against the first response.<br>4. Query Admin Reviewer list/search API to verify only 1 Partner Request exists for this submission. |
| **Expected response** | API returns deterministic idempotent success (<CHECK_OPENAPI>) referencing the exact same registrationId / partnerRequestId / requestCode as the initial submission. |
| **Expected data result** | Zero duplicate Partner Requests created; Admin Reviewer GET readback confirms only 1 persisted record exists. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and deployed service SHAs. |
| **Status and evidence** | BLOCKED — API contract missing (confirm STAGING OpenAPI idempotency replay status code and header name). |

#### REGV2-API-006 — Request Payload (`valid-registration-v2.json`)

```json
{
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-006 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-006",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-007 — Reject idempotency key reuse when payload is mutated (Same Idempotency-Key + Different Payload -> Conflict)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-007 |
| **Title** | Reject idempotency key reuse when payload is mutated (Same Idempotency-Key + Different Payload -> Conflict) |
| **Requirement** | OP-1593, OP-1592 — Reusing an existing Idempotency-Key with a mutated request payload must be rejected as an idempotency conflict without overwriting the originally persisted Partner Request. |
| **Priority / Test layer** | P1 / API Idempotency Conflict Safety |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_001}} (reused from REGV2-API-001); Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/idempotency-conflict-payload.json. Single-Variable Delta: Keep the same Idempotency-Key from REGV2-API-001 and mutate ONLY propertyName to 'QA Mutated Hotel Name On Same Key'. |
| **Steps** | 1. Ensure REGV2-API-001 has been committed with Idempotency-Key {{idempotencyKey_001}}.<br>2. Mutate ONLY propertyName in fixtures/idempotency-conflict-payload.json.<br>3. Send POST {{baseUrl}}{{registrationPath}} with the same Idempotency-Key {{idempotencyKey_001}}.<br>4. Record HTTP status (expected 409 conflict per contract) and errorCode (<CHECK_ERROR_REGISTRY>).<br>5. Execute Admin Reviewer GET readback on the original partnerRequestId to verify propertyName was NOT overwritten. |
| **Expected response** | API rejects the mutated replay with an idempotency conflict error (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) and does not degrade to generic DOWNSTREAM_CLIENT_ERROR. |
| **Expected data result** | No second Partner Request is created, and the original Partner Request retains its original propertyName (verified via Admin Reviewer GET readback). |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry. |
| **Status and evidence** | BLOCKED — API contract missing (confirm exact idempotency conflict errorCode in BE-03 Error Registry). |

#### REGV2-API-007 — Request Payload (`idempotency-conflict-payload.json`)

```json
{
  "propertyName": "QA Mutated Hotel Name On Same Key",
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-007 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-007",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-008 — Reject registration when businessDocument references an asset owned by another actor (403 ASSET_OWNERSHIP_INVALID)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-008 |
| **Title** | Reject registration when businessDocument references an asset owned by another actor (403 ASSET_OWNERSHIP_INVALID) |
| **Requirement** | OP-1593, OP-1590 (PD-3 A), OP-1591 — Partner & Media admission must fail closed with 403 ASSET_OWNERSHIP_INVALID when a registration payload references a Media assetId/uploadReceipt owned by another user/session, and Gateway must preserve this error identity for FE replace recovery. |
| **Priority / Test layer** | P0 / Permission & Cross-Service Error Parity (Partner → Gateway → FE) |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_008}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/foreign-asset-ownership.json. Single-Variable Delta: Start with valid-registration-v2.json and replace ONLY businessDocument[0] with a finalized assetId/uploadReceipt created by a different actor/session. |
| **Steps** | 1. Prepare a Media asset finalized under Actor B's session.<br>2. In Actor A's registration payload (fixtures/foreign-asset-ownership.json), reference Actor B's assetId/uploadReceipt in businessDocument[0].<br>3. Send POST {{baseUrl}}{{registrationPath}}.<br>4. Verify Gateway returns HTTP 403 / ASSET_OWNERSHIP_INVALID (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) with actionable field path businessDocument[0] and does NOT map it to generic DOWNSTREAM_CLIENT_ERROR.<br>5. Confirm via Admin GET check that no Partner Request was created. |
| **Expected response** | API fails closed with ownership error (PD-3 A: 403 ASSET_OWNERSHIP_INVALID — confirm exact Gateway envelope in <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>) and actionable field path on businessDocument. |
| **Expected data result** | No Partner Request is created or modified; foreign Media asset remains unbound to Actor A. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Media fixture setup. |
| **Status and evidence** | BLOCKED — API contract missing (confirm STAGING OpenAPI envelope for ASSET_OWNERSHIP_INVALID and MEDIA_INTERNAL_BEARER setup). |

#### REGV2-API-008 — Request Payload (`foreign-asset-ownership.json`)

```json
{
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
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000009999",
      "uploadReceipt": "<FOREIGN_ACTOR_UPLOAD_RECEIPT>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-008 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-008",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-009 — Reject HOTEL registration when conditional starRating is omitted

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-009 |
| **Title** | Reject HOTEL registration when conditional starRating is omitted |
| **Requirement** | OP-1593, OP-1589, OP-1324 — Conditional validation rule: starRating (integer 1..5) is required if and only if normalized propertyTypeKey is HOTEL. |
| **Priority / Test layer** | P1 / API Conditional Validation |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_009}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/missing-hotel-star-rating.json. Single-Variable Delta: Start with valid-registration-v2.json (where propertyTypeKey='HOTEL') and remove ONLY starRating. |
| **Steps** | 1. Load fixtures/valid-registration-v2.json where propertyTypeKey='HOTEL'.<br>2. Remove ONLY starRating (fixtures/missing-hotel-star-rating.json).<br>3. Send POST {{baseUrl}}{{registrationPath}}.<br>4. Record HTTP status, errorCode, and fieldErrors on starRating.<br>5. Confirm via Admin GET check that no Partner Request was created. |
| **Expected response** | API rejects the request because starRating is conditionally required when propertyTypeKey=='HOTEL'. Exact HTTP status and errorCode: <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>. |
| **Expected data result** | No Partner Request is created or modified in database. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and Error Registry. |
| **Status and evidence** | BLOCKED — API contract missing (confirm conditional starRating errorCode in BE-03 Error Registry). |

#### REGV2-API-009 — Request Payload (`missing-hotel-star-rating.json`)

```json
{
  "propertyName": "QA Sample Hotel Da Nang",
  "legalName": "QA Sample Hospitality Company Limited",
  "streetAddress": "100 Vo Nguyen Giap Street, My An Ward",
  "countryCode": "VN",
  "administrativeAreaCode": "<VALID_VN_LOCATION_L2_CODE>",
  "propertyTypeKey": "HOTEL",
  "officialWebsite": "https://qa-sample-hotel.example.test",
  "primaryContact": {
    "fullName": "QA Tester",
    "jobTitle": "General Manager",
    "email": "qa-sample@example.test",
    "phoneCountry": "VN",
    "phone": "+84900000000",
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-009 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-009",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

### REGV2-API-010 — Accept registration when primaryContact.phoneCountry (KR/+82) legitimately differs from property countryCode (VN)

| Field | Details |
| :--- | :--- |
| **Test Case ID** | REGV2-API-010 |
| **Title** | Accept registration when primaryContact.phoneCountry (KR/+82) legitimately differs from property countryCode (VN) |
| **Requirement** | OP-1593, OP-1505, OP-1589 — Address countryCode (L1) and primaryContact.phoneCountry are independent: a partner registering a property in Vietnam (countryCode='VN') with a South Korean contact phone (phoneCountry='KR', phone='+821012345678') must be accepted and persisted without cross-field inference. |
| **Priority / Test layer** | P1 / Integration (Location L1/L2 + Phone ISO/E.164 Independence + Admin Readback) |
| **Environment** | STAGING · Date: <YYYY-MM-DD> · Deployed SHA: FE=<CHECK_DEPLOYED_SHA>, Gateway=<CHECK_DEPLOYED_SHA>, Partner=<CHECK_DEPLOYED_SHA>, Media=<CHECK_DEPLOYED_SHA>, Location=<CHECK_DEPLOYED_SHA> |
| **Preconditions** | 1. Confirm deployed STAGING commit SHAs across ota-partner-acquisition-web, ota-api-gateway, ota-partner-service, Media Service, Location Service, and Admin Platform.<br>2. Confirm STAGING OpenAPI spec link and server-side MEDIA_INTERNAL_BEARER configuration.<br>3. Prepare finalized Media uploadReceipts (1–5 businessDocument PDF/JPEG/PNG <=5MiB; 2–5 gallery JPEG/PNG <=5MiB) and canonical Location Service L1/L2 codes. |
| **Method + URL** | POST {{baseUrl}}{{registrationPath}} (verify exact path against STAGING OpenAPI) |
| **Headers / Auth / Parameters** | Content-Type: application/json; Idempotency-Key: {{idempotencyKey_010}}; Authorization: <CHECK_OPENAPI_PUBLIC_OR_BEARER> |
| **Payload / Test data** | Fixture: fixtures/mixed-phone-and-property-country.json. Single-Variable Delta: Keep property countryCode='VN' and VN administrativeAreaCode, and set primaryContact phone context to phoneCountry='KR' with matching E.164 phone='+821012345678'. |
| **Steps** | 1. Load fixtures/mixed-phone-and-property-country.json (countryCode='VN', primaryContact.phoneCountry='KR', phone='+821012345678').<br>2. Send POST {{baseUrl}}{{registrationPath}} with a fresh Idempotency-Key.<br>3. Verify HTTP 2xx success and capture partnerRequestId.<br>4. Execute Admin Reviewer GET readback and verify countryCode=='VN' and primaryContact.phoneCountry=='KR' / phone=='+821012345678' are both preserved without overwriting each other. |
| **Expected response** | HTTP 2xx success (<CHECK_OPENAPI>) with valid registration receipt; no false mismatch error between property countryCode and contact phoneCountry. |
| **Expected data result** | 1 Partner Request created; Admin Reviewer GET readback confirms countryCode='VN' and primaryContact.phoneCountry='KR' / phone='+821012345678' are stored independently. |
| **Actual result** | NOT_RUN — Execute after confirming STAGING OpenAPI and deployed service SHAs. |
| **Status and evidence** | BLOCKED — API contract missing (confirm STAGING OpenAPI URL and deployed service SHAs). |

#### REGV2-API-010 — Request Payload (`mixed-phone-and-property-country.json`)

```json
{
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
    "phoneCountry": "KR",
    "phone": "+821012345678",
    "preferredContactMethod": "EMAIL"
  },
  "businessDocument": [
    {
      "assetId": "00000000-0000-4000-8000-000000000101",
      "uploadReceipt": "<VALID_FINALIZED_DOC_RECEIPT_1>",
      "order": 1
    }
  ],
  "gallery": [
    {
      "assetId": "00000000-0000-4000-8000-000000000201",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_1>",
      "order": 1
    },
    {
      "assetId": "00000000-0000-4000-8000-000000000202",
      "uploadReceipt": "<VALID_FINALIZED_PHOTO_RECEIPT_2>",
      "order": 2
    }
  ],
  "submissionAcknowledgement": {
    "policyVersion": "<VALID_POLICY_VERSION_V2>",
    "informationAccuracyAccepted": true,
    "termsAndPrivacyAccepted": true,
    "verificationAuthorizationAccepted": true
  }
}
```

#### REGV2-API-010 — Section 5.2 Structured Result Record

```json
{
  "testCaseId": "REGV2-API-010",
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
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

## 5. QA Lead 7-Point Verification Checklist (QA Guide §11)

- [x] **1. Requirement & OpenAPI Traceability:** Every test case links to `OP-1593` and its governing BE contracts (`OP-1505`, `OP-1589`, `OP-1590`, `OP-1591`, `OP-1592`).
- [x] **2. Real Contract URLs Only:** Method, URL (`{{baseUrl}}{{registrationPath}}`), headers, and body never use the guide's example URL (`https://api.example.test/v2/partner-registrations`).
- [x] **3. Complete Valid Fixture + Single-Variable Mutation:** `valid-registration-v2.json` contains all required V2 fields, files, and acknowledgements; each negative/boundary test mutates **one thing only**.
- [x] **4. No Guessed Status or Error Codes:** Unconfirmed runtime HTTP statuses and error codes use `<CHECK_OPENAPI>` and `<CHECK_ERROR_REGISTRY>` with `BLOCKED — API contract missing`.
- [x] **5. Persistence & Readback Verification:** Every test case specifies how QA checks saved data (`Admin Reviewer GET readback` on 2xx; zero records created on 4xx).
- [x] **6. Reproducible Atomic Steps:** Every test case provides numbered Postman steps another QA can execute deterministically.
- [x] **7. Secret & PII Hygiene:** Zero real tokens, passwords, signing URLs, or personal contact details (`qa-sample@example.test`, `+84900000000`).
