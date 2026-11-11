# OP-1593 — Accommodation Registration V2 Cross-Service Contract Matrix

**Jira Authorities:**
- **Parent Task:** [`OP-1505`](https://optibide-org.atlassian.net/browse/OP-1505) — `[Partner/Gateway][PA-C] Registration V2 — G-08 multi-doc + required phone country and Location L1/L2`
- **QA & STAG E2E Acceptance:** [`OP-1593`](https://optibide-org.atlassian.net/browse/OP-1593) — `[QA/Integration][PA-C] REG V2 — Cross-service contract and STAG E2E acceptance`
- **BE-01 Field & Validation Contract:** [`OP-1589`](https://optibide-org.atlassian.net/browse/OP-1589) (Partner PR `#217`, Gateway PR `#195`)
- **BE-02 Multi-Document & Media Integrity:** [`OP-1590`](https://optibide-org.atlassian.net/browse/OP-1590) (Partner PR `#217`, `#218`, Media `3ce84fa9`)
- **BE-03 Error-Code Parity & Recovery:** [`OP-1591`](https://optibide-org.atlassian.net/browse/OP-1591) (Partner PR `#217`, Gateway PR `#195`)
- **BE-04 Dossier Readback & Status Boundary:** [`OP-1592`](https://optibide-org.atlassian.net/browse/OP-1592) (Partner PR `#219`, Gateway PR `#196`)
- **FE Integration:** [`OP-1514`](https://optibide-org.atlassian.net/browse/OP-1514) & [`OP-1513`](https://optibide-org.atlassian.net/browse/OP-1513) (`ota-partner-acquisition-web`)
- **Confluence Authorities:** `172884334` (G-08 Product Authority), `172884010` (PA-C Architecture), `144015744` (OpenAPI Governance & Error Contract)
- **Figma Authority:** `GNSW — 07 Partner Portal` (`node-id=273-2386`, `REG-01..05 v0.2 Desktop 1440`)

---

## 1. End-to-End Service Topology & Pre-Execution Gate

```
ota-partner-acquisition-web (FE / BFF)
  │  (Typed V2 Submit DTO + Idempotency-Key)
  ▼
ota-api-gateway (Edge Routing, DTO Validation, Error Normalization)
  │
  ├──► Location Service (Canonical Country L1 & Administrative Area L2 Parent-Child Validation)
  ├──► Media Service (Initiate -> Provider Upload -> Finalize -> uploadReceipt -> Eligibility/Scan/Ownership)
  ▼
ota-partner-service (Registration V2 Admission, Durable Persistence, Idempotency CAS)
  │
  ▼
Admin Platform (Authenticated Reviewer GET Detail & Quick Preview Read-Model)
```

### Critical Pre-Execution Verification Gate (`OP-1593` Handoff Rule)
- **Source Merge != Runtime Deployment:** PR merges (`Partner #217/#218/#219`, `Gateway #195/#196`, `FE #48/#50/#55/#57`) do **not** constitute STAG runtime acceptance.
- Before executing `OP-1593` tests on STAGING, QA must record:
  1. Actual deployed commit SHA / image tag for `ota-partner-acquisition-web`, `ota-api-gateway`, `ota-partner-service`, `Media Service`, `Location Service`, and `Admin Platform`.
  2. Server-side `MEDIA_INTERNAL_BEARER` configuration between Partner/Gateway and Media Service.
  3. Policy holds: preserve `G-09` legal hold and `IV-12`/`IV-17` policy HOLD (no automatic public status tracker or unauthorized PROD launch).

---

## 2. Registration V2 Canonical Field & Validation Matrix (`OP-1589` / `OP-1505`)

| Wizard Step | Canonical JSON Field Path | Required? | Validation & Business Rules |
| :--- | :--- | :--- | :--- |
| **REG-01 (Business & Property)** | `propertyName` | **Required** | Non-empty trimmed string; distinct from `legalName` and `primaryContact.fullName`. |
| **REG-01** | `legalName` | **Required** | Owner / business legal entity name; must not be silently inferred from `propertyName` or `primaryContact.fullName`. |
| **REG-01** | `streetAddress` | **Required** | Trimmed length `>= 5`; preserved separately from `countryCode` and `administrativeAreaCode`. |
| **REG-01** | `countryCode` | **Required** | Structured Location Service canonical Level 1 country code (ISO-3166 alpha-2, e.g., `"VN"`). Must **never** be derived from `phoneCountry` or browser locale. |
| **REG-01** | `administrativeAreaCode` | **Required** | Structured Location Service canonical Level 2 child code (Province/State/City, e.g., `"VN-DN"` / canonical STAGING code). Must belong to the selected `countryCode` (`parentCode` relationship validated). |
| **REG-01** | `propertyTypeKey` | **Required** | Authoritative property-type catalog key (e.g., `"HOTEL"`, `"RESORT"`, `"VILLA"`). |
| **REG-01** | `starRating` | **Conditional** | **Required iff** normalized `propertyTypeKey == "HOTEL"` (integer `1..5`). Optional/omitted for non-hotel types. |
| **REG-01** | `officialWebsite` | **Optional** | Valid HTTP/HTTPS URL format when supplied; optional. |
| **REG-02 (Primary Contact)** | `primaryContact.fullName` | **Required** | Non-empty trimmed string. Must **not** be escalated to Owner/Legal Representative privilege in Admin readback. |
| **REG-02** | `primaryContact.email` | **Required** | Valid email format; use safe QA domain (`qa-sample@example.test`). |
| **REG-02** | `primaryContact.phoneCountry` | **Required (Always)** | ISO-3166 alpha-2 country code (e.g., `"VN"`). **Mandatory even when `primaryContact.phone` is already in valid international E.164 format (`+84900000000`)**. May legitimately differ from property `countryCode` (mixed phone vs address country is valid!). |
| **REG-02** | `primaryContact.phone` | **Required** | Valid phone number normalized to E.164 (e.g., `"+84900000000"`), consistent with `primaryContact.phoneCountry`. |
| **REG-02** | `primaryContact.jobTitle` | **Optional** | Role / job title string when provided; persisted and returned to reviewer. |
| **REG-02** | `primaryContact.preferredContactMethod` | **Optional / As Specified** | Enum/code from contract (e.g., `"EMAIL"`, `"PHONE"`). |
| **REG-03 (Evidence & Media)** | `businessDocument[]` | **Required (`1–5` items)** | Ordered collection of finalized Media objects (`assetId`, `uploadReceipt`, `order`). Allowed MIME: `application/pdf`, `image/jpeg`, `image/png`. Max `5 MiB` per file. |
| **REG-03** | `gallery[]` | **Required (`2–5` items)** | Ordered collection of finalized accommodation photos (`assetId`, `uploadReceipt`, `order`). Allowed MIME: `image/jpeg`, `image/png` (PDF rejected). Max `5 MiB` per file. |
| **REG-03 (Aggregate)** | `businessDocument[]` + `gallery[]` | **Bounded** | Total `<= 10` refs across both collections; aggregate size `<= 20 MiB`; no duplicate `assetId`s; **never** pass raw `File` objects or Cloudinary/provider IDs in registration JSON. |
| **REG-04 (Review & Consent)** | `submissionAcknowledgement.policyVersion` | **Required** | Versioned policy identifier (e.g., `"2026-10-v2"` / canonical STAGING version). |
| **REG-04** | `submissionAcknowledgement.informationAccuracyAccepted` | **Required (`true`)** | Explicit boolean acknowledgement #1. |
| **REG-04** | `submissionAcknowledgement.termsAndPrivacyAccepted` | **Required (`true`)** | Explicit boolean acknowledgement #2. |
| **REG-04** | `submissionAcknowledgement.verificationAuthorizationAccepted` | **Required (`true`)** | Explicit boolean acknowledgement #3. |

---

## 3. Media Upload & Evidence Integrity Rules (`OP-1590`)

1. **4-Step Media Admission Pipeline**:
   `Initiate Upload Session` → `Provider Upload` → `Finalize Asset` → `Receive uploadReceipt` → `Submit V2 Registration with canonical assetId + uploadReceipt`.
2. **Reviewed Product Directions (`OP-1590` Accepted Baseline)**:
   - **`PD-1 A`**: Image malware scan is `SKIPPED`; `SAFE` denotes admission eligibility (not antivirus `PASSED`). Pending scan (`SCAN_PENDING`) must be handled deterministically.
   - **`PD-2 A`**: Non-exclusive cross-registration asset binding is permitted for retry/re-submission by the same owner.
   - **`PD-3 A`**: Retain `403 ASSET_OWNERSHIP_INVALID` when an applicant submits an `assetId` / receipt belonging to a different actor/session, with deterministic replace/retry recovery in FE.
3. **Mandatory Negative Media Test Vectors**:
   - `0` business documents (`businessDocument: []`) → rejected.
   - `6` business documents (`> 5` max) → rejected.
   - `1` gallery photo (`< 2` min) → rejected.
   - `6` gallery photos (`> 5` max) → rejected.
   - File size `> 5 MiB` single file or `> 20 MiB` aggregate → rejected.
   - Disallowed MIME (e.g., `.pdf` in `gallery[]` or `.exe`/`.svg` in `businessDocument[]`) → rejected.
   - Unfinalized asset, expired/tampered `uploadReceipt`, duplicate `assetId`, or foreign-owned `assetId` (`403 ASSET_OWNERSHIP_INVALID`) → rejected with field path and zero Partner Request created.

---

## 4. Partner → Gateway Error-Code Parity Contract (`OP-1591`)

- **Core Requirement:** Zero accidental loss of Partner domain error identity at the `Partner Service → API Gateway → ota-partner-acquisition-web` boundary.
- **Forbidden Degradation:** Previously, `partner-error.mapper.ts` mapped unrecognized Partner `4xx` responses to generic `DOWNSTREAM_CLIENT_ERROR`. Under `OP-1591`, **100% of recognized Registration V2 domain errors** (validation, phone country, location L1/L2 mismatch, media receipt/scan/ownership, policy, idempotency conflict) must preserve their HTTP status (`400`/`403`/`409`/`422`/`503`), canonical public `errorCode` (or explicitly approved alias), and `fieldErrors[]`.
- **4xx vs 5xx Separation (`OP-1461` / `OP-1591`)**:
  - `4xx` (`400`, `401`, `403`, `404`, `409`, `422`, `429`): Client/domain error with actionable `errorCode` and `fieldErrors` mapped to the exact form step (`REG-01`..`REG-04`).
  - `5xx` (`502`, `503`, `504`): Downstream/transport unavailability (`MEDIA_SERVICE_UNAVAILABLE` / `DOWNSTREAM_UNAVAILABLE`)—fail closed without leaking stack traces, SQL, or internal hostnames.

---

## 5. Idempotency, Persistence & Reviewer Readback (`OP-1592`)

1. **Idempotent Same-Key Replay**:
   Sending the exact same `POST` payload with the same `Idempotency-Key` returns the original registration receipt (`requestCode`, `registrationId`, `partnerRequestId`) and creates **only one** Partner Request in the database.
2. **Idempotency Key Conflict (`409`)**:
   Sending a mutated payload with an already-used `Idempotency-Key` is rejected with `409 Conflict` without overwriting the existing Partner Request.
3. **Admin Reviewer Readback Parity**:
   Calling the authenticated Admin Reviewer detail & Quick Preview endpoints (`GET /api/v1/admin/partner-requests/{id}`) must return:
   - All REG-01..04 scalar fields (`propertyName`, `legalName`, `streetAddress`, `countryCode`, `administrativeAreaCode`, `propertyTypeKey`, `starRating`, `officialWebsite`, `primaryContact.*`, `submissionAcknowledgement.*`).
   - Complete ordered `businessDocument[]` (`1–5`) and `gallery[]` (`2–5`) asset references and authorized preview/thumbnail URLs.
   - Strict role separation: `primaryContact` is displayed as contact only, never conflated with verified Legal Representative / Owner identity.
4. **Known Open Architecture Risks to Track During `OP-1593` Execution**:
   - **`F-01` (`OP-1592`)**: Review Queue V2 applicant search vs displayed contact field mismatch—verify and log under owning service (`ota-partner-service`) if reproduced.
   - **`F-02` (`OP-1590`/`OP-1592`)**: Durable create-commit / crash-window P1 idempotency edge case—track explicitly in release notes.
