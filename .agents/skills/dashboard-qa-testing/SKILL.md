---
name: dashboard-qa-testing
description: Use this skill EVERY TIME you add a new feature, modify existing logic/UI/master-data, fix a bug, or verify quality in the goodNstay Partner Auction Dashboard (`dashboard/partner-auction-dashboard-v2`). Enforces mandatory post-change automated regression testing (Unit + Master-Data Contract + Business Logic + TypeScript + REST API + All Buttons/Modals + RBAC + 7-Viewport Responsive) and requires adding new test cases for every code change.
---

# Partner Auction Dashboard v2 — Mandatory QA & Automated Testing Skill

## When to Activate
Activate this skill **automatically and unconditionally** whenever a task touches anything inside `dashboard/partner-auction-dashboard-v2/` (`src/`, `master-data/`, `vite.config.ts`, `scripts/`, or `tests/`), including:
- Adding a new UI component, button, filter, chart, modal, or tab
- Modifying pricing formulas (`×1.265`), KPI analytics, funnel steps, RBAC permissions, or room-lock logic
- Updating `master-data/*.json` or `master-data/seed/*.json`
- Fixing layout, responsive, or functional bugs

---

## Non-Negotiable Definition of Done (DoD)

> **CRITICAL RULE**: Never declare a dashboard feature or edit "complete" until ALL 4 gates below have been executed and verified with real terminal output:

### Gate 1 — Write / Update Automated Test Cases First or Alongside Every Change
Every code change MUST be accompanied by corresponding automated tests:
1. **Formula / Formatter / Helper Change (`src/data.ts`)**
   - Add or update unit tests in `tests/unit/pricing-and-formatters.test.ts`.
2. **Master Data / Schema / Seed Change (`master-data/`)**
   - Keep `master-data/seed/*.json` and `master-data/*.json` synchronized.
   - Add or update schema & foreign-key invariants in `tests/unit/master-data-contract.test.ts`.
3. **Analytics / KPI / Funnel / Schedule / Filter Change (`src/services/analyticsEngine.ts`)**
   - Add or update deterministic logic tests across periods (`today`, `7d`, `30d`) and branches (`all`, `br_mykhe`, `br_songhan`, `br_anthuong`) in `tests/unit/analytics-engine.test.ts`.
4. **UI Control / Button / Modal / Workflow / RBAC Change (`src/App.tsx`, `src/components/*.tsx`)**
   - Add or update Playwright E2E interactions in `tests/e2e/buttons-and-modals.spec.ts` or `tests/e2e/workflows-and-rbac.spec.ts`.
   - Ensure any new layout/grid/chart/modal has `min-w-0` where needed and passes all 7 viewports (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`) in `tests/e2e/responsive-matrix.spec.ts` with zero horizontal overflow (`document.documentElement.scrollWidth <= window.innerWidth`).
5. **Update the Test Catalog**
   - Record every newly added or updated test case ID in `tests/TEST_CASES.md`.

### Gate 2 — Run the Full Automated Test Suite (`npm test`)
From `/Users/iannwendy/Desktop/goodNstay/dashboard/partner-auction-dashboard-v2`, execute:
```bash
npm test
```
This runs `scripts/run-all-tests.mjs`, which sequentially verifies:
1. `tests/unit/*.test.ts` (Pricing/Formatters + Master-Data Contract + Analytics Engine + `tsc --noEmit` TypeScript gate)
2. `npx playwright test` (REST API + All Buttons/Modals + RBAC/Workflows + 7-Viewport Responsive Matrix + Audit/Benchmark/Pagination specs)
3. Automatic restoration of `master-data/*.json` from `master-data/seed/*.json`

### Gate 3 — Verify Production Build (`npm run build`)
Execute:
```bash
npm run build
```
Confirm `tsc -b && vite build` succeeds with `0` TypeScript or Rollup bundling errors.

### Gate 4 — Clean Seed State & Live Dev Server Preservation
- Never kill an existing user Vite dev server running on port `5182` (`playwright.config.ts` uses `reuseExistingServer: true`).
- Confirm `master-data/*.json` matches `master-data/seed/*.json` after E2E mutation tests finish (`scripts/run-all-tests.mjs` and `resetSeedViaApi` handle this automatically).

---

## Quick Diagnostic Commands

```bash
# Fast inner loop (~1.3s): Unit + Data Contract + Logic + TypeScript check
npm run test:unit

# Responsive-only check across 7 desktop/tablet/mobile viewports
npm run test:responsive

# Run a single Playwright spec file during debugging
npx playwright test tests/e2e/workflows-and-rbac.spec.ts
```
