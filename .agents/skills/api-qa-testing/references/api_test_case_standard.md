# goodNstay API Test Case Authoring Standard (Reference Guide)

**Source Authorities:**
- `QA Guide — How to Write API Test Cases` (Version 1.0 EN / Companion to Vietnamese v3.0, Confluence Page `184944019`)
- `API Standard` (Confluence Page `524593`)
- `OpenAPI Governance, Error Contract & Docs Portal` (Confluence Page `144015744`)
- `GNS-FORM-001 — Global Form UX & Validation` (Confluence Page `174227515`)

---

## 1. Pre-Test Readiness Checklist (7 Mandatory Inputs — Do Not Guess)

Before writing or running any API test case, collect these 7 items from Jira, Confluence, OpenAPI, and your QA Lead / Backend Owner:

| # | Item | Source Authority | Standard Representation When Confirmed vs Unconfirmed |
| :--- | :--- | :--- | :--- |
| 1 | **Requirement / Jira** | Jira Ticket & Acceptance Criteria | e.g., `OP-1593`, `OP-1505`, `OP-1589`, `OP-1590`, `OP-1591`, `OP-1592` |
| 2 | **API Document / OpenAPI** | OpenAPI spec for the deployed version in target env | Confirmed link, or `[QA fills in — ask Gateway/Partner BE Owner]` |
| 3 | **Base URL** | `DEV` or `STAGING` environment | `{{baseUrl}}` (Never use `https://api.example.test` for real tests) |
| 4 | **Method & Endpoint** | Current OpenAPI document | e.g., `POST {{baseUrl}}{{registrationPath}}` |
| 5 | **Login / Token** | QA Lead / Environment Owner | Public API vs `Bearer <REDACTED_QA_TOKEN>` / `MEDIA_INTERNAL_BEARER` |
| 6 | **Test Data / Fixtures** | Safe QA data + real STAGING reference codes | Canonical `countryCode` (L1), `administrativeAreaCode` (L2), finalized Media `assetId`s & `uploadReceipt`s |
| 7 | **Build Version / SHA** | Deployed FE, API Gateway, Partner, Media, Location | Commit SHA / image tag per service (`<CHECK_DEPLOYED_SHA>`) |

> [!WARNING]
> **Fail-Closed Rule for Missing Contract:** If the API document (OpenAPI), endpoint URL, HTTP status, error code, or expected behavior is missing, write **`BLOCKED — API contract missing`** and specify which owner (`QA Lead`, `Gateway BE`, `Partner BE`, `Media BE`) must provide it. **Never invent URLs, field names, HTTP status codes, or error codes.**

---

## 2. Mandatory 14-Field API Test Case Table Schema

Every API test case checks **one clear result** and MUST populate all 14 rows/fields below:

| # | Field Key (`JSON`) | Markdown Label | What to Write |
| :--- | :--- | :--- | :--- |
| 1 | `testCaseId` | **Test Case ID** | Unique deterministic ID (e.g., `REGV2-API-001`, `REGV2-API-002`). |
| 2 | `title` | **Title** | Action-oriented single-outcome title (e.g., *"Reject registration without `primaryContact.phoneCountry`."*). |
| 3 | `requirement` | **Requirement** | Jira ticket link(s) + exact business/validation rule being verified. |
| 4 | `priorityAndLayer` | **Priority / Test layer** | Priority (`P0`–`P3`) + Layer (`API`, `Integration`, `FE + API`), plus test category (`Positive`, `Negative`, `Boundary`, `Permission`, `Duplicate / Retry`, `Integration`, `Regression`). |
| 5 | `environment` | **Environment** | `DEV` or `STAGING`, test date (`YYYY-MM-DD`), and deployed version / commit SHA (`FE`, `Gateway`, `Partner`, `Media`, `Location`). |
| 6 | `preconditions` | **Preconditions** | What must be ready first: auth/role, base valid fixture, canonical Location L1/L2 codes, finalized Media `assetId`s & `uploadReceipt`s. |
| 7 | `methodAndUrl` | **Method + URL** | Exact HTTP method + real OpenAPI URL or Postman variable (`POST {{baseUrl}}{{registrationPath}}`). |
| 8 | `headersAuthParams` | **Headers / Auth / Parameters** | `Content-Type: application/json`, redacted `Authorization` (if required), `Idempotency-Key`, path/query parameters. |
| 9 | `payloadAndTestData` | **Payload / Test data** | Fixture file name (e.g., `missing-phone-country.json`), full JSON/multipart reference, and **Single-Variable Delta** explaining the exact single change from the valid fixture. |
| 10 | `steps` | **Steps** | Numbered atomic steps another QA can execute in Postman, ending with a persistence/readback check. |
| 11 | `expectedResponse` | **Expected response** | Exact HTTP status, response envelope fields, `errorCode`, `messageKey`, `fieldErrors` from OpenAPI/Error Registry (or `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>`). |
| 12 | `expectedDataResult` | **Expected data result** | Persistence & readback verification: Was a record created or changed? Which `GET` / Admin Reviewer API confirms it? (For negative tests: *"No Partner Request is created or modified."*). |
| 13 | `actualResult` | **Actual result** | Observed HTTP status, body, `errorCode`, `requestId`, and readback result after running. Before execution: `NOT_RUN — Fill in after executing against deployed STAGING runtime.` |
| 14 | `statusAndEvidence` | **Status and evidence** | Official status (`PASS` / `FAIL` / `NOT VERIFIED` / `BLOCKED`), `requestId`, sanitized response record, screenshot/log link, and Jira bug link (if `FAIL`). |

---

## 3. Section 5.2 Structured JSON Execution Record Schema

Every API test case must also include (or serialize to) the canonical Section 5.2 JSON record:

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
  "status": "NOT VERIFIED",
  "evidenceLink": "<ADD_AFTER_TEST>"
}
```

---

## 4. Postman 8-Step Execution Protocol

1. Open Postman and create an **HTTP Request**.
2. Select the exact **Method** (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`) verified against OpenAPI.
3. Enter the **URL** (`{{baseUrl}}{{registrationPath}}`) populated with real environment variables (never `https://api.example.test`).
4. Open **Headers**: add `Content-Type: application/json` (or `multipart/form-data` if OpenAPI specifies) and required auth/idempotency headers (`Idempotency-Key`).
5. Open **Body → raw → JSON**: paste the complete request JSON from the approved fixture file.
6. Click **Send**: record the HTTP status, response body, `errorCode` / `messageKey` / `fieldErrors`, and `requestId` (or correlation ID).
7. **Verify Persistence / Readback (Mandatory)**:
   - After a **2xx success**: call the allowed `GET` / Admin Reviewer endpoint to confirm every submitted field, document, and photo was persisted losslessly.
   - After a **4xx/5xx error**: confirm that **zero** unintended records were created or mutated.
   - After a **timeout**: do not assume failure—query readback or replay with the same `Idempotency-Key` to verify whether the server saved the record.
8. Record the **Actual Result** and attach sanitized response JSON / screenshots (with tokens and PII redacted).

---

## 5. The 7 Canonical API Test Categories

| Category | Core Question | Example in goodNstay |
| :--- | :--- | :--- |
| **Positive** | Does the API succeed with a complete valid fixture and persist all data losslessly? | Complete valid V2 payload → 1 Partner Request created + receipt + Admin Reviewer GET readback matches 100%. |
| **Negative** | Does the API deterministically reject invalid/missing data with the exact contract `errorCode` and `fieldErrors`? | Remove only `primaryContact.phoneCountry` (while keeping E.164 `phone: "+84900000000"`) → rejected with field error; 0 records created. |
| **Boundary** | Does the API enforce exact min/max limits at and just beyond boundaries? | `businessDocument[]` (`0` rejected, `1` & `5` allowed, `6` rejected); `gallery[]` (`1` rejected, `2` & `5` allowed, `6` rejected); `5 MiB`/file, `20 MiB` total; hotel `starRating` `1..5`. |
| **Permission** | Does the API fail closed when authentication, role, or ownership proof is missing or invalid? | Unauthenticated Reviewer GET rejected (`401`/`403`); cross-partner `assetId` rejected with `403 ASSET_OWNERSHIP_INVALID`. |
| **Duplicate / Retry** | Is the operation idempotent under retry, timeout, or concurrent replay? | Same `Idempotency-Key` + identical payload → returns original receipt without creating duplicate Partner Request; same key + mutated payload → `409 Conflict`. |
| **Integration** | Do all services (`FE → Gateway → Partner → Media/Location → Admin`) preserve schema and error identity? | Partner domain error code `A` maps to Gateway public code `A` (never generic `DOWNSTREAM_CLIENT_ERROR`); Admin readback shows all ordered documents/photos. |
| **Regression** | Does the new V2 contract preserve backward compatibility for active V1 / Tour flows? | Active V1 / Tour registration payloads continue to work without unintended breakage. |

---

## 6. Official 4-Status Decision Matrix

| Status | Exact Criteria |
| :--- | :--- |
| **`PASS`** | Test was executed against the real deployed environment (with recorded commit SHA), AND both the HTTP response AND post-request data readback match the documented OpenAPI/Error Registry contract. |
| **`FAIL`** | Test was executed against the real deployed environment, and objective evidence (`requestId`, actual HTTP status/body, or readback mismatch) differs from the documented expected contract. |
| **`NOT VERIFIED`** | Test case is drafted/ready, or only partially checked (e.g., not yet executed on STAGING, or HTTP response was checked but DB/GET readback was not verified). |
| **`BLOCKED`** | Test cannot be executed or judged because the OpenAPI contract, error registry, test environment, credentials, or upstream dependency is missing. Must state `BLOCKED — <reason>` and the responsible owner. |

---

## 7. QA Lead 7-Point Review Checklist

Before marking any API test suite ready for review, verify all 7 questions:
1. Does every test case link to a real Jira requirement (`OP-XXXX`) and current OpenAPI spec?
2. Are the method, URL, headers, and body grounded in the real contract (never copied from `https://api.example.test/...` or invented)?
3. Does the base valid fixture include all required V2 fields, canonical Location L1/L2 codes, finalized Media files, and acknowledgements, with negative cases mutating **only one variable**?
4. Are expected HTTP statuses and `errorCode`s sourced from the official OpenAPI / Error Registry (or explicitly marked `<CHECK_OPENAPI>` / `<CHECK_ERROR_REGISTRY>` when blocked)?
5. Does every test case specify how QA verifies whether data was saved or unchanged (`Expected data result` / GET readback)?
6. Can another QA engineer execute the test deterministically using the numbered `Steps`?
7. Are all secrets (`Authorization`, `MEDIA_INTERNAL_BEARER`, signing URLs) and personal data (real names, emails, phones, legal docs) completely sanitized?
