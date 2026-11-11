# goodNstay API QA Testing — Accumulated Lessons & Rules

This file is automatically read before creating or reviewing any API test suite (`api_test_helper.py lessons`) and updated whenever QA Lead feedback, baseline testing, or live STAGING execution uncovers a new rule (`api_test_helper.py log-feedback --promote`).

## 1. Contract & No-Guessing Guardrails
- **[RULE-API-001] Never Invent Endpoints or Error Codes:** When the STAGING OpenAPI URL or error registry is not yet provided, use `POST {{baseUrl}}{{registrationPath}}`, `<CHECK_OPENAPI>`, and `<CHECK_ERROR_REGISTRY>`, and explicitly note who provides the missing contract (`QA Lead` / `Gateway BE` / `Partner BE`). Never invent paths like `/api/v2/accommodations/register` or copy the learning URL `https://api.example.test/v2/partner-registrations`.
- **[RULE-API-002] Official 4-Status Vocabulary Only:** Every test case status MUST be one of `PASS`, `FAIL`, `NOT VERIFIED`, or `BLOCKED`. Never use `NOT RUN`, `PENDING`, `TODO`, or `ASSUMED`.
- **[RULE-API-003] Source Merge != Runtime Acceptance:** Merged GitHub PRs (`Partner #217/#218/#219`, `Gateway #195/#196`) or FE mocks never justify marking an API test `PASS`. `PASS` requires live execution on the target environment with recorded commit SHA + post-request GET/Admin readback verification.

## 2. Test Data & Single-Variable Mutation Rules
- **[RULE-API-004] Complete Valid Fixture + Single-Variable Mutation:** Always derive negative and boundary test payloads from the complete valid fixture (`valid-registration-v2.json`) by mutating **one field only**. Never send truncated "learning snippet" JSONs in real tests, and never mutate two fields at once (e.g., removing `phoneCountry` AND changing `phone` or `email`).
- **[RULE-API-005] `phoneCountry` Required Even With Valid E.164 `phone` (`OP-1589` / `OP-1505`):** When testing missing `primaryContact.phoneCountry`, keep `primaryContact.phone` in valid international E.164 format (`"+84900000000"`) so the test proves the API does not infer `phoneCountry` from the `+84` dialing prefix.
- **[RULE-API-006] Sanitize All Secrets & PII:** Never include real employee/intern names (`Nguyen Bao Minh`), real emails (`baominh.internship@...`), live JWTs (`Bearer eyJ...`), `MEDIA_INTERNAL_BEARER`, or presigned storage URLs in fixtures or test reports. Use `QA Sample Hotel`, `QA Tester`, `qa-sample@example.test`, and `+84900000000`.

## 3. Cross-Service & Readback Verification Rules (`OP-1593`)
- **[RULE-API-007] Mandatory Persistence Readback (`Expected data result`):** Every positive test must verify saved data via an allowed `GET` / Admin Reviewer endpoint (including ordered `businessDocument[]` and `gallery[]` refs). Every negative test must verify that **zero** Partner Request records were created or mutated.
- **[RULE-API-008] Zero Generic `DOWNSTREAM_CLIENT_ERROR` Fallback (`OP-1591`):** Every recognized Partner Service V2 domain error must preserve its HTTP status, public `errorCode` (or approved alias), and `fieldErrors` through `ota-api-gateway`. Any degradation to generic `DOWNSTREAM_CLIENT_ERROR` is a `FAIL` defect against `ota-api-gateway`.
