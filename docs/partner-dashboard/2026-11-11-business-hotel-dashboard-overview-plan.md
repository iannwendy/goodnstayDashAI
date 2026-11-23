# Business Hotel Dashboard Overview (Optibide Partner Hub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans and superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `dashboard/partner-auction-dashboard-v2` into a 100% real-world commercial Hotel Partner Portal (`Optibide Partner Hub — Dashboard Overview`) faithful to `dashboard/demo_new/1.png` and `dashboard/demo_new/2.png`, crafted in plain everyday hospitality language for non-technical hotel business users with live `vi / en / ko` and `VND / KRW / USD` switching.

**Architecture:** Preserve the existing 12-table `master-data/*.json` seed/API persistence layer (`masterDataService.ts`, `data.ts`, `analyticsEngine.ts`) so all backend/data contracts remain intact, while introducing a clean pure-business aggregation & currency/i18n layer (`src/lib/i18n.ts`, `src/services/overviewAnalytics.ts`) and modular commercial UI components (`PartnerHubShell.tsx`, `AiAdvisorSection.tsx`, `BookingDetailModal.tsx`, and rewritten `src/App.tsx`). All legacy developer/QA simulation widgets and state-machine panels are removed from the UI, and the automated unit + Playwright E2E + 7-viewport responsive suite is updated to verify every user workflow.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS v4, Recharts 3.2, Radix UI Dialog, Lucide React, Node `node:test`, Playwright 1.65.

**Spec:** `/Users/iannwendy/Desktop/goodNstay/docs/superpowers/specs/2026-11-11-business-hotel-dashboard-overview-design.md`

## Global Constraints

- Never kill an existing Vite dev server running on port `5182`.
- Keep all 12 `master-data/*.json` and `master-data/seed/*.json` files synchronized and schema-compatible with `tests/unit/master-data-contract.test.ts` and `tests/e2e/api-master-data.spec.ts`.
- Zero internal engineering jargon (`×1.265`, `REJ_*` enum codes, `settled_t_plus_7`, `RACE`, or "Mô phỏng" simulation buttons) anywhere in the rendered UI.
- Default locale is `vi` (`Tiếng Việt`) and default currency is `VND` (`₫`), with live working topbar selectors for `vi | en | ko` and `VND | KRW | USD`.
- Zero horizontal page overflow (`document.documentElement.scrollWidth <= window.innerWidth`) and zero console/page errors across all 7 viewports (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`).

## Review Focus

- Zero-booking or zero-bid division safety (`Stay Hotel H11` or empty day): `acceptRatePct`, `avgRevenuePerBooking`, and status `sharePct` never emit `NaN` or `Infinity`.
- Daily Bids Status 4-bucket completeness: `accepted + expired + rejected + cancelled === totalBids` across every period (`today`, `7d`, `30d`) and property (`all`, branches, `stay_h11`).
- Currency & locale synchronization: switching `VND / KRW / USD` and `vi / en / ko` updates KPI cards, chart axes, AI Advisor pills, Recent Bookings net impact, and Booking Detail Modal without stale symbols.
- Pagination page-clamp safety: switching from a multi-page dataset (`30d` page 3) to a smaller dataset (`today` or `stay_h11`) resets/clamps `currentPage` to `1` so valid rows are never hidden.
- Mobile responsive containment (`360×800`–`768×1024`): collapsible desktop sidebar switches to an off-canvas drawer below `1024px` and tables scroll internally without widening `document.documentElement.scrollWidth`.

---

### Task 1: Currency Formatting, Business Localization Dictionary & Overview Analytics Engine

**Files:**
- Create: `dashboard/partner-auction-dashboard-v2/src/lib/i18n.ts`
- Create: `dashboard/partner-auction-dashboard-v2/src/services/overviewAnalytics.ts`
- Create: `dashboard/partner-auction-dashboard-v2/tests/unit/overview-analytics.test.ts`

**Interfaces:**
- Produces in `src/lib/i18n.ts`:
  - `export type AppLocale = "vi" | "en" | "ko"`
  - `export type CurrencyCode = "VND" | "KRW" | "USD"`
  - `export function convertFromVnd(amountVnd: number, currency: CurrencyCode): number`
  - `export function formatBusinessMoney(amountVnd: number, currency: CurrencyCode, opts?: { compact?: boolean; withPlus?: boolean }): string`
  - `export function formatDisplayDate(isoDate: string, locale: AppLocale, includeYear?: boolean): string`
  - `export function getDictionary(locale: AppLocale): OverviewCopy`
- Produces in `src/services/overviewAnalytics.ts`:
  - `export type PropertyFilterKey = "all" | "br_mykhe" | "br_songhan" | "br_anthuong" | "stay_h11"`
  - `export interface OverviewDailyPoint { isoDate: string; dateLabel: string; tooltipDate: string; revenueVnd: number; bookingsCount: number; accepted: number; expired: number; rejected: number; cancelled: number }`
  - `export interface RecentBookingRow { bookingCode: string; refSessionId: string; propertyName: string; roomName: string; roomNumber: number; checkInIso: string; checkOutIso: string; checkInLabel: string; checkOutLabel: string; nights: number; paidAtLabel: string; netRevenueVnd: number; guestNote: string; amenities: string[] }`
  - `export function buildOverviewViewModel(bundle: MasterDataBundle, params: { propertyKey: PropertyFilterKey; periodKey: DateRangeKey; locale: AppLocale; currency: CurrencyCode }): OverviewViewModel`

- [ ] **Step 1: Write failing unit tests in `tests/unit/overview-analytics.test.ts`**
  Cover: (a) `convertFromVnd` & `formatBusinessMoney` across `VND`, `KRW`, `USD` including `0` and `+` compact KPI formatting; (b) `buildOverviewViewModel` on `all` + `30d` verifying 30 daily points, exact 4-bucket sum `accepted + expired + rejected + cancelled === totalBids`, `completedBookings.length === 29`, and non-empty AI Advisor cards; (c) `stay_h11` newly onboarded property returning `revenueVnd === 0`, `totalBids === 75` (`0` accepted, `8` expired, `67` rejected, `0` cancelled), `acceptRatePct === 0`, `eloScore === 800`, `rating === 0`, and `0` bookings without `NaN`; (d) Vietnamese copy contains zero raw `ELO Score` / `RevPAR` headings.
- [ ] **Step 2: Run unit test to verify RED**
  Run: `npm --prefix /Users/iannwendy/Desktop/goodNstay/dashboard/partner-auction-dashboard-v2 run test:unit`
  Expected: FAIL (`Cannot find module '@/lib/i18n'` / `'@/services/overviewAnalytics'`).
- [ ] **Step 3: Implement `src/lib/i18n.ts` and `src/services/overviewAnalytics.ts`**
- [ ] **Step 4: Run unit tests to verify GREEN**
  Run: `npm --prefix /Users/iannwendy/Desktop/goodNstay/dashboard/partner-auction-dashboard-v2 run test:unit`
  Expected: PASS (all existing unit/contract/analytics tests + new `overview-analytics.test.ts` pass).

---

### Task 2: Optibide Partner Hub Shell, Overview Sections & Booking Detail Slip Modal

**Files:**
- Create: `dashboard/partner-auction-dashboard-v2/src/components/PartnerHubShell.tsx`
- Create: `dashboard/partner-auction-dashboard-v2/src/components/AiAdvisorSection.tsx`
- Create: `dashboard/partner-auction-dashboard-v2/src/components/BookingDetailModal.tsx`
- Modify: `dashboard/partner-auction-dashboard-v2/src/App.tsx`
- Modify: `dashboard/partner-auction-dashboard-v2/src/styles.css`
- Modify: `dashboard/partner-auction-dashboard-v2/index.html`
- Delete unused legacy tech-heavy UI components: `CustomBidModal.tsx`, `KpiDrilldownModal.tsx`, `LifecycleStateExplorer.tsx`, `MatchBreakdownModal.tsx`, `PaymentConversionFunnelPanel.tsx`, `RoomScheduleExplorer.tsx`, `SelectionBenchmarkLinePanel.tsx`

**Interfaces:**
- Consumes `buildOverviewViewModel`, `formatBusinessMoney`, `getDictionary`, `AppLocale`, `CurrencyCode`, `PropertyFilterKey`, `RecentBookingRow` from Task 1, plus `loadMasterDataBundle` & `persistMasterTable` from `src/services/masterDataService.ts`.
- Exposes stable `data-testid` hooks for E2E & responsive verification:
  - `sidebar-nav`, `sidebar-collapse-btn`, `mobile-menu-btn`
  - `topbar-property-select`, `topbar-language-select`, `topbar-currency-select`, `period-select`
  - `kpi-card-revenue`, `kpi-card-total-bids`, `kpi-card-accept-rate`, `kpi-card-rating`, `kpi-card-autobid`
  - `section-revenue-timeline`, `advisor-revenue-toggle`, `section-bids-status`, `advisor-bids-toggle`, `section-ratings-trust`, `section-recent-bookings`
  - `bookings-rows-per-page`, `bookings-prev-page`, `bookings-next-page`, `bookings-empty-state`

- [ ] **Step 1: Build `PartnerHubShell.tsx`, `AiAdvisorSection.tsx`, `BookingDetailModal.tsx`, and rewrite `src/App.tsx` + `src/styles.css` + `index.html`**
  Match `demo_new/1.png` and `demo_new/2.png` layout, colors, dual-axis Revenue & Bookings chart, stacked 4-status Bids chart + breakdown table, Ratings + Visibility card, Recent Bookings table with `5 / 10 / 20` pagination + `View detail` modal + empty state, and polite toast feedback when clicking unbuilt sidebar items. Remove unused legacy tech components.
- [ ] **Step 2: Run TypeScript & Unit Test Gate**
  Run: `npm --prefix /Users/iannwendy/Desktop/goodNstay/dashboard/partner-auction-dashboard-v2 run test:unit`
  Expected: PASS (`0` TypeScript errors, all unit tests green).

---

### Task 3: E2E, Offline Fallback, 7-Viewport Responsive Suite & Test Catalog Update

**Files:**
- Modify: `dashboard/partner-auction-dashboard-v2/tests/e2e/api-master-data.spec.ts`
- Modify: `dashboard/partner-auction-dashboard-v2/tests/e2e/buttons-and-modals.spec.ts`
- Modify: `dashboard/partner-auction-dashboard-v2/tests/e2e/workflows-and-rbac.spec.ts`
- Modify: `dashboard/partner-auction-dashboard-v2/tests/e2e/responsive-matrix.spec.ts`
- Delete obsolete root specs targeting removed legacy panels: `tests/benchmark-line-chart.spec.ts`, `tests/dashboard-audit.spec.ts`, `tests/session-log-pagination.spec.ts`
- Modify: `dashboard/partner-auction-dashboard-v2/tests/TEST_CASES.md`

- [ ] **Step 1: Update E2E specs to thoroughly test the new Partner Hub Overview**
  - `api-master-data.spec.ts`: keep REST API `TC-API-01..08` intact; update `TC-API-07` offline `/api/master-data` abort test to verify the new Partner Hub Overview renders cleanly from static `/master-data/*.json` + persists UI/profile preferences in `localStorage`.
  - `buttons-and-modals.spec.ts`: test sidebar collapse/expand (`1.png` <-> `2.png`), Marketing submenu expand, non-overview nav polite toast, KPI `(i)` plain-business tooltips, Help guide dialog, Notifications popover, AI Advisor collapse/expand & refresh, and `BookingDetailModal` open/content/Escape close.
  - `workflows-and-rbac.spec.ts`: test Property Switcher (`L'amour` active bookings state vs `Stay Hotel H11` zero-booking empty state matching `1.png`), Period Switcher (`30d` / `7d` / `today`), Language Switcher (`vi` -> `en` -> `ko`) & Currency Switcher (`VND` -> `KRW` -> `USD`), Recent Bookings pagination (`Rows per page: 5 / 10`, `<`, `>`, and automatic page-clamp reset to page 1 when switching property/period), plus strict assertion that zero tech/simulation tokens (`×1.265`, `REJ_`, `Mô phỏng`) exist in DOM text.
  - `responsive-matrix.spec.ts`: verify all 7 viewports (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`) have `0` horizontal overflow (`scrollWidth <= innerWidth`), desktop sidebar vs mobile drawer parity, clean `BookingDetailModal` containment, and `0` console/page errors.
  - Update `tests/TEST_CASES.md` with all added/updated test case IDs.
- [ ] **Step 2: Run full `npm test` and `npm run build` verification gates**
  Run: `cd /Users/iannwendy/Desktop/goodNstay/dashboard/partner-auction-dashboard-v2 && npm test && npm run build`
  Expected: `0` unit failures, `0` E2E/responsive failures, `0` build errors, `master-data/*.json` cleanly restored to seed.
- [ ] **Step 3: Visual inspection & independent Code Reviewer subagent audit**
  Capture desktop & mobile screenshots on both active (`2.png` equivalent) and zero-booking (`1.png` equivalent) states to verify visual polish against `demo_new/1.png` and `demo_new/2.png`, and run a fresh `research` code-review subagent against the spec and Review Focus items.
