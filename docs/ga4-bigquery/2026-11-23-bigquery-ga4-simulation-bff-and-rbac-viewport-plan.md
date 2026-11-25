# BigQuery GA4 Simulation, Multi-Tenant RBAC BFF & Live Viewport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simulate a complete 30-day GA4 BigQuery Export + OLTP + `userID × branchID` RBAC warehouse on GCP project `aevo-512307` (`US` multi-region, aligned with live BigQuery MCP), expose it via a standalone TypeScript Backend BFF (`dashboard/bigquery-bff` on port `:4000`), and integrate both a global `Local JSON <-> Live BigQuery` source switcher and a dedicated `BigQuery Live Viewport` into `dashboard/dashboard` (`:5182`).

**Architecture:** Three-phase decoupled rollout: (1) Deterministic Python generator + BigQuery seeding into `gns_sim_ga4` (30 daily `events_YYYYMMDD` shards with nested `ARRAY<STRUCT>` `event_params`), `gns_sim_oltp` (5-account RBAC + 143 bid offers/orders + 12 payout batches), and `gns_analytics_mart` (partitioned & clustered Silver/Gold tables built via `UNNEST(event_params)`); (2) Lightweight zero-bloat Node.js/TypeScript BFF (`node:http` + `node:crypto` HS256 JWT + `@google-cloud/bigquery`) enforcing strict `allowedBranchIds` (`403 FORBIDDEN_BRANCH_SCOPE`), receptionist financial masking, `maximumBytesBilled = 50 MiB`, and 60s TTL caching; (3) React UI upgrades in `dashboard/dashboard` preserving 100% backward compatibility with all existing 29 unit tests and 28 Playwright E2E/responsive tests.

**Tech Stack:** Google Cloud BigQuery (`aevo-512307`, `asia-southeast1`), BigQuery MCP (`data-agent-kit-plugin_dak-bigquery`) & `bq` CLI, Python 3 (deterministic JSONL mock builder), Node.js 24 + TypeScript + `@google-cloud/bigquery`, React 19 + Tailwind CSS + Recharts + Playwright.

**Spec:** `docs/ga4-bigquery/2026-11-23-bigquery-ga4-simulation-bff-and-rbac-viewport-design.md`

## Global Constraints

- GCP Target: Project `aevo-512307`, dataset location `asia-southeast1`, mandatory CLI attribution `--label datacloud:antigravity` on supported `bq` mutation/query commands.
- Zero PII in BigQuery: Scrub guest names/phones into pseudonymous IDs (`TRV-XXXX`) in `gns_sim_ga4` and `gns_sim_oltp`.
- Financial Reconciliation Invariant: Accepted bookings (`#43..#71`, 29 orders on `HTL-DN-024`) must sum to exact `66,360,000 VND` net hotel revenue (`83,945,400 VND` gross GMV via `×1.265`).
- Zero-Regression UI Gate: Default `Local JSON` mode under default `USR-PARTNER-01` must keep all existing `npm test` (Unit + Contract + E2E + 7-Viewport Responsive) and `npm run build` passing with 0 errors; Vietnamese Overview copy must never contain `"Mô phỏng"`.

## Review Focus

- Cross-branch BOLA tampering: Authenticated `USR-MGR-MYKHE` (`allowedBranchIds: ["br_mykhe"]`) requesting `?branchId=br_songhan` or `?branchId=all` on BFF `:4000` must receive `HTTP 403` with `errorCode: "FORBIDDEN_BRANCH_SCOPE"` and zero BigQuery bytes scanned.
- Receptionist financial leakage: Authenticated `USR-STAFF-02` (`canViewFinancials: false`) querying `/api/v1/analytics/viewport` or `/api/v1/analytics/bundle` must receive `netRevenueVnd: null` / `0` and empty `payoutLedgers.batches` at the HTTP JSON payload level, not merely hidden in CSS.
- Offline BFF resilience: If `dashboard/bigquery-bff` (`:4000`) is unreachable when a user toggles `Live BigQuery`, `dashboard/dashboard` must surface a clear status banner and keep existing local state intact without uncaught promise rejections or blank screens.
-GA4 `UNNEST` fan-out bug: Flattening `gns_sim_ga4.events_*` must use correlated scalar subqueries per parameter so 1 GA4 event produces 1 Silver row (verified by asserting `COUNT(*)` in `stg_ga4_behavior_events` equals total generated GA4 events).
- Responsive layout safety: All new cards, tables, SQL filter badges, and charts in `BigQueryWarehouseView.tsx` must use `min-w-0` / `overflow-x-auto` so `scrollWidth <= innerWidth` holds across all 7 viewports down to `360×800`.

---

### Phase 1: Deterministic Mock Data Generation & BigQuery Warehouse Seeding (`aevo-512307`)

#### Task 1: Generate 30-Day GA4 Export Shards & OLTP/RBAC JSONL Files

**Files:**
- Create: `dashboard/bigquery-bff/scripts/generate_bigquery_mock_data.py`
- Create: `dashboard/bigquery-bff/schemas/ga4_events_schema.json`
- Test: `dashboard/bigquery-bff/tests/test_mock_generator.py`

**Interfaces:**
- Consumes: `dashboard/dashboard/master-data/seed/bid_records.json`, `partner_hub_config.json`, `payout_ledgers.json`
- Produces: JSONL files under `dashboard/bigquery-bff/.generated_warehouse/` (`ga4/events_YYYYMMDD.jsonl` for `20261008..20261106` + `events_intraday_20261106.jsonl`, `oltp/partner_user_branch_access.jsonl`, `oltp/partner_branches.jsonl`, `oltp/bid_offers_and_orders.jsonl`, `oltp/payout_batches.jsonl`, and `manifest_summary.json`)

- [x] **Step 1: Implement generator & schema definitions deriving from Master Data v4.0**
- [x] **Step 2: Verify exact invariants (`66,360,000 VND`, 5 RBAC profiles, 30 daily GA4 shards, 0% PII) via Python unit tests**

#### Task 2: Provision Datasets, Load Shards & Build Partitioned/Clustered Gold Marts on `aevo-512307`

**Files:**
- Create: `dashboard/bigquery-bff/sql/build_analytics_marts.sql`
- Create: `dashboard/bigquery-bff/scripts/deploy_bigquery_warehouse.sh`

**Interfaces:**
- Consumes: `.generated_warehouse/**/*.jsonl`
- Produces on `aevo-512307` (`asia-southeast1`):
  - `gns_sim_ga4.events_20261008` .. `events_20261106` + `events_intraday_20261106`
  - `gns_sim_oltp.{partner_user_branch_access, partner_branches, bid_offers_and_orders, payout_batches}`
  - `gns_analytics_mart.{stg_ga4_behavior_events, mart_partner_branch_daily, mart_branch_funnel_and_media, mart_branch_ai_advisor_snapshots}`

- [x] **Step 1: Create datasets `gns_sim_ga4`, `gns_sim_oltp`, `gns_analytics_mart` in `US` and batch-load JSONL tables via `bq load --label datacloud:antigravity`**
- [x] **Step 2: Execute `build_analytics_marts.sql` on BigQuery to materialize partitioned & clustered Silver and Gold tables**
- [x] **Step 3: Verify row counts, zero `UNNEST` fan-out, `66,360,000 VND` reconciliation, and scoped `@partnerId` / `@branchIds` queries via BigQuery MCP (`execute_sql_readonly`)**

---

### Phase 2: Standalone Multi-Tenant Backend BFF (`dashboard/bigquery-bff` on `:4000`)

#### Task 3: Build `dashboard/bigquery-bff` Server, HS256 JWT Auth, RBAC Guard & BigQuery Query Service

**Files:**
- Create: `dashboard/bigquery-bff/package.json`
- Create: `dashboard/bigquery-bff/tsconfig.json`
- Create: `dashboard/bigquery-bff/src/types.ts`
- Create: `dashboard/bigquery-bff/src/auth.ts`
- Create: `dashboard/bigquery-bff/src/bigqueryClient.ts`
- Create: `dashboard/bigquery-bff/src/server.ts`
- Test: `dashboard/bigquery-bff/tests/bff.test.ts`

- [x] **Step 1: Write unit & live BigQuery integration tests covering JWT login for all 5 `userID`s, `403 FORBIDDEN_BRANCH_SCOPE` cross-branch BOLA blocking, `receptionist` financial masking, `/api/v1/analytics/viewport`, `/api/v1/analytics/bundle`, and all 6 BigQuery cost guardrails**
- [x] **Step 2: Implement BFF service (`config.ts`, `types.ts`, `auth.ts`, `costGuard.ts`, `bigqueryService.ts`, `server.ts`, `index.ts`) with parameterized `@google-cloud/bigquery` queries, 6-layer cost guard (`25 MiB` default ceiling, `$0` dry-run preflight, `500 MiB/24h` circuit breaker, Singleflight + TTL cache, per-user rate limit), and in-memory operational overlay**
- [x] **Step 3: Run `npm test` in `dashboard/bigquery-bff` against live `aevo-512307` and verify 100% pass (14/14 TS tests + 3/3 Python tests)**

---

### Phase 3: Dashboard UI Integration (`dashboard/dashboard` on `:5182`) & Full QA Gate

#### Task 4: Integrate 5-Profile `userID × branchID` RBAC, Dual-Source Switcher & `BigQueryWarehouseView.tsx`

**Files:**
- Modify: `dashboard/dashboard/master-data/seed/partner_hub_config.json` & `master-data/partner_hub_config.json`
- Modify: `dashboard/dashboard/src/data.ts`
- Create: `dashboard/dashboard/src/services/bigQueryApiService.ts`
- Create: `dashboard/dashboard/src/components/modules/BigQueryWarehouseView.tsx`
- Modify: `dashboard/dashboard/src/components/PartnerHubShell.tsx`
- Modify: `dashboard/dashboard/src/lib/hubModulesI18n.ts`
- Modify: `dashboard/dashboard/src/App.tsx`
- Test: `dashboard/dashboard/tests/unit/master-data-contract.test.ts`, `tests/e2e/bigquery-live-and-rbac.spec.ts`, `tests/e2e/responsive-matrix.spec.ts`, `tests/TEST_CASES.md`

- [x] **Step 1: Update 5 `staffProfiles` with `allowedBranchIds` / `canViewFinancials` / `canManagePricing`, add `src/lib/rbacScoping.ts`, `src/services/bigQueryApiService.ts`, `BigQueryWarehouseView` (`vi`/`en`/`ko`), and Global `Local JSON <-> BigQuery` Source Switcher**
- [x] **Step 2: Add comprehensive Unit (`TC-RBAC-01..03`, updated `TC-DATA-03`) + Playwright E2E (`TC-BQ-01..05`) + 7-Viewport Responsive (`TC-RESP` incl. `BigQuery Live`) tests verifying live BFF/BigQuery connection, `HTTP 403 FORBIDDEN_BRANCH_SCOPE` cross-branch guard inspector, receptionist financial masking, and offline resilience**
- [x] **Step 3: Execute mandatory `npm test` (32/32 unit + 23/23 Playwright E2E/responsive) + `npm run build` gate in `dashboard/dashboard` and confirm 100% pass with 0 errors**
