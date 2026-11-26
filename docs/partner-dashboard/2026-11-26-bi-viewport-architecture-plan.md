# BI Viewport Khối Lớn (Decoupled Analytics Shell) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phương án B — a decoupled, BI-tool-agnostic coarse-grained `<BiViewportFrame />` architecture on `dashboard/dashboard` (`:5182`) backed by an HS256-signed Embed Session Broker and standalone Simulated BI Host on `dashboard/bigquery-bff` (`:4000`), preserving 100% of existing tests and supporting both `localhost` and Tailscale/Cloudflare HTTPS tunnel demos.

**Architecture:** The Backend BFF (`:4000`) acts as the Data/BI broker, minting short-lived HS256 `BI_EMBED` tokens bound strictly to the authenticated staff member's `allowedBranchIds` and `canViewFinancials`, and serving a self-contained neutral BI Simulator at `GET /bi-embed/render?token=...` (or passing through configured external BI URLs with zero token leakage). The Frontend (`:5182`) adds a 3rd `BI Viewport` mode on the global switcher that replaces the analytics sections on `Overview` (`overview_analytics`) and `Kho BigQuery` (`deep_analytics`) with adaptive-sandbox `<BiViewportFrame />` iframes while keeping `Recent Bookings`, `BookingDetailModal`, and all operational tabs isolated on Local JSON.

**Tech Stack:** TypeScript 5.9, Node.js `node:http` / `node:crypto` / `node:test`, React 19, Vite 7, Tailwind CSS 4, Playwright E2E.

**Spec:** `docs/partner-dashboard/2026-11-26-bi-viewport-architecture-design.md`

## Global Constraints

- Default initial `DataSourceMode` remains `"local-json"` so 100% of existing 73+ unit, contract, E2E, RBAC, and 7-viewport responsive tests pass with zero regressions.
- Never modify `master-data/seed/*.json` or BigQuery schemas; never kill the already-running Vite dev server on port `:5182`.
- Every UI change must pass all 7 responsive viewports (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`) with `scrollWidth <= innerWidth`, `0` console errors, and `0` page errors.
- All user-visible UI strings must support `vi`, `en`, and `ko`.
- `BI_EMBED` tokens must never be blindly appended to arbitrary third-party external URLs, and Receptionist (`canViewFinancials: false`) must have all monetary values masked both server-side in the BI HTML and UI-side in `section-recent-bookings` + `BookingDetailModal` when in `bi-viewport` / `live-bigquery` mode.

## Review Focus

1. **Same-origin tunnel sandbox escape**: When served through a single HTTPS tunnel (`*.ts.net` / `*.trycloudflare.com`), the proxied `/bi-embed` iframe shares `window.location.origin` — `<BiViewportFrame />` MUST drop `allow-same-origin` from `sandbox` and verify `postMessage` via `event.source === iframeWindow && event.origin === "null"` (tested in Task 2 & Task 4).
2. **Token type confusion**: A long-lived Session JWT (`typ: "JWT"`) passed to `GET /bi-embed/render?token=...` MUST be rejected with `401` because only short-lived `typ: "BI_EMBED"` tokens are accepted (tested in Task 1).
3. **Receptionist financial leak under `bi-viewport`**: Switching to `USR-STAFF-02` in `bi-viewport` mode MUST mask revenue inside the BI iframe HTML, in `bookings-period-summary` / `bookings-net-impact`, AND inside `BookingDetailModal` (tested in Task 1 & Task 4).
4. **Stale `today` period trap when outer `period-select` is hidden**: Entering `bi-viewport` mode after having `periodKey = "today"` persisted in `localStorage` MUST NOT leave `section-recent-bookings` stuck on `today` — it pins to `"30d"` (tested in Task 4).
5. **Offline GCP during `POST /api/v1/auth/session`**: When GCP is unreachable in dev/demo (`BFF_OFFLINE_SEED_FALLBACK=true`), `listRbacProfiles()` and Simulated BI MUST fall back to `master-data/seed/` cleanly while still propagating `CostGuardError` (tested in Task 1).

---

### Task 1: BFF Embed Session Broker, `BI_EMBED` Token Auth, Offline Seed Fallback & Simulated BI Host

**Files:**
- Modify: `dashboard/bigquery-bff/src/types.ts`
- Modify: `dashboard/bigquery-bff/src/config.ts`
- Modify: `dashboard/bigquery-bff/src/auth.ts`
- Modify: `dashboard/bigquery-bff/src/bigqueryService.ts`
- Create: `dashboard/bigquery-bff/src/viewportService.ts`
- Modify: `dashboard/bigquery-bff/src/server.ts`
- Test: `dashboard/bigquery-bff/tests/viewport-embed.test.ts`

**Interfaces:**
- Consumes: `BffConfig`, `JwtSessionClaims`, `RbacProfile`, `PartnerAnalyticsService`, `HttpAuthError` from `dashboard/bigquery-bff/src/*`.
- Produces:
  - `ViewportSlotId = "overview_analytics" | "deep_analytics"`
  - `ViewportProvider = "simulated_bi" | "superset" | "metabase" | "looker" | "generic_iframe"`
  - `signViewportEmbedToken(claims, slotId, secret, ttlSec, nowSec?)` & `verifyViewportEmbedToken(token, secret, nowSec?)` in `auth.ts`
  - `GET /api/v1/viewports/registry` (Bearer JWT)
  - `POST /api/v1/viewports/:slotId/embed-session` (Bearer JWT)
  - `GET /bi-embed/render?token=<signed_embed_token>` (HTML BI Simulator with CSP `frame-ancestors`, internal filters, preset switcher, Receptionist redaction, and `postMessage` beacons)

- [ ] **Step 1: Write failing BFF unit & HTTP integration tests in `dashboard/bigquery-bff/tests/viewport-embed.test.ts`**
  - Verify `signViewportEmbedToken` / `verifyViewportEmbedToken`: valid round-trip, expired -> `401 TOKEN_EXPIRED`, tampered payload -> `401 INVALID_TOKEN_SIGNATURE`, Session JWT (`typ: "JWT"`) rejected -> `401 UNSUPPORTED_TOKEN_ALG`.
  - Verify `POST /api/v1/viewports/overview_analytics/embed-session` & `deep_analytics` over real local `http.Server` using stubbed `BigQueryExecutor` (simulating GCP failure to prove `BFF_OFFLINE_SEED_FALLBACK` works on `POST /api/v1/auth/session` + Simulated BI, while `CostGuardError` is never swallowed).
  - Verify `404 UNKNOWN_VIEWPORT_SLOT`, `503 VIEWPORT_PROVIDER_UNCONFIGURED` (`"disabled"`, missing external URL, disallowed external origin), external URL `{token}` substitution vs. non-leaking passthrough, and `superset` `guestToken` population.
  - Verify `GET /bi-embed/render?token=...` HTML content: `USR-MGR-MYKHE` contains only `br_mykhe` (never `br_songhan`/`stay_h11`), `USR-STAFF-02` masks all VND revenue figures server-side, and tampered/expired token returns `401`.

- [ ] **Step 2: Run test to verify it fails**
  - Run: `cd dashboard/bigquery-bff && npm run test:unit` (and new test file build)
  - Expected: FAIL (missing `viewportService.ts` and `signViewportEmbedToken`).

- [ ] **Step 3: Implement Task 1 modules (`types.ts`, `config.ts`, `auth.ts`, `bigqueryService.ts`, `viewportService.ts`, `server.ts`)**
  - Add `ViewportSlotId`, `ViewportProvider`, `ViewportEmbedClaims`, `ViewportEmbedSessionResponse`, `ViewportRegistrySlot` to `types.ts`.
  - Add `viewportProvider`, `viewportOverviewEmbedUrl`, `viewportDeepEmbedUrl`, `viewportPublicBaseUrl`, `viewportEmbedTtlSec`, `viewportAllowedOrigins`, `offlineSeedFallback` to `BffConfig` in `config.ts`.
  - Add `signViewportEmbedToken` & `verifyViewportEmbedToken` (`typ: "BI_EMBED"`, HS256 timing-safe verification) in `auth.ts`.
  - Add offline seed fallback helper in `bigqueryService.ts` (`listRbacProfiles()` falls back to `seedBundle.hubConfig.staffProfiles` with deterministic `partnerId` mapping only on non-`CostGuardError` failures when `cfg.offlineSeedFallback` is true; expose `getSeedMasterBundle()` for Simulated BI fallback).
  - Implement `viewportService.ts` with slot catalog, embed session builder (supporting localhost cross-origin `:4000`, relative `/bi-embed/render?...` when proxied via HTTPS tunnel `x-forwarded-host` / non-localhost host, and `VIEWPORT_PUBLIC_BASE_URL`), and `renderSimulatedBiHtml(...)` (neutral BI chrome, internal Period + RBAC-scoped Branch + 3 BI Layout Presets, inline SVG charts, GA4 8-step funnel, AI C1–C4 table, server-side Receptionist redaction, and `postMessage` ready/resize script).
  - Wire routes `GET /api/v1/viewports/registry`, `POST /api/v1/viewports/:slotId/embed-session`, and `GET /bi-embed/render` (dynamic CSP `frame-ancestors`) in `server.ts`.

- [ ] **Step 4: Run BFF build & full unit/viewport tests**
  - Run: `cd dashboard/bigquery-bff && npm run build && node --test dist/tests/unit-cost-guard-and-rbac.test.js dist/tests/viewport-embed.test.js`
  - Expected: 100% PASS.

---

### Task 2: Frontend Viewport Registry, URL Security Guard, Embed Service & Vite `/bi-embed` Proxy

**Files:**
- Modify: `dashboard/dashboard/vite.config.ts`
- Modify: `dashboard/dashboard/src/services/bigQueryApiService.ts`
- Create: `dashboard/dashboard/src/lib/viewportRegistry.ts`
- Create: `dashboard/dashboard/src/services/viewportEmbedService.ts`
- Test: `dashboard/dashboard/tests/unit/viewport-contract.test.ts`

**Interfaces:**
- Consumes: `getOrCreateBffToken`, `resolveBffRequestBaseUrl` from `bigQueryApiService.ts`; `POST /api/v1/viewports/:slotId/embed-session` from Task 1.
- Produces:
  - `DataSourceMode = "local-json" | "live-bigquery" | "bi-viewport"` in `bigQueryApiService.ts`
  - `VIEWPORT_SLOTS`, `ViewportSlotId`, `ViewportProvider`, `validateViewportEmbedUrl(rawUrl, opts)`, `isSameOriginEmbed(embedUrl, currentOrigin)`, `readDemoViewportOverride(slotId)`, `saveDemoViewportOverride(slotId, url, allowExternalHttps)`, `clearDemoViewportOverride(slotId)` in `viewportRegistry.ts`
  - `requestViewportEmbedSession(params)` and `ViewportEmbedSession` in `viewportEmbedService.ts`

- [ ] **Step 1: Write failing unit tests in `dashboard/dashboard/tests/unit/viewport-contract.test.ts`**
  - Verify `VIEWPORT_SLOTS` registers `overview_analytics` (`minHeightPx: 780`) and `deep_analytics` (`minHeightPx: 860`).
  - Verify `validateViewportEmbedUrl` rejects `javascript:alert(1)`, `data:text/html,...`, `blob:...`, `file:///etc/passwd`, and non-allowlisted origins (`https://evil.example/embed`) in strict server mode; accepts `http://127.0.0.1:4000/bi-embed/render?token=abc` and relative `/bi-embed/render?token=abc`; accepts arbitrary `https://` ONLY when `allowExternalHttpsDemo: true` (while STILL rejecting `http://` external or `javascript:`).
  - Verify `isSameOriginEmbed` returns `true` for relative `/bi-embed/render?token=x` or matching origin and `false` for `http://127.0.0.1:4000/...` when host is `http://localhost:5182`.

- [ ] **Step 2: Run unit tests to verify they fail**
  - Run: `cd dashboard/dashboard && npm run test:unit`
  - Expected: FAIL (missing `viewportRegistry.ts`).

- [ ] **Step 3: Implement `vite.config.ts` `/bi-embed` proxy, `bigQueryApiService.ts` `DataSourceMode` extension, `viewportRegistry.ts`, and `viewportEmbedService.ts`**

- [ ] **Step 4: Run `npm run test:unit` to verify PASS**
  - Expected: 100% PASS (including `tsc --noEmit`).

---

### Task 3: Reusable `<BiViewportFrame />`, Topbar Switcher, `BookingDetailModal` Masking & `App.tsx` Integration

**Files:**
- Create: `dashboard/dashboard/src/components/BiViewportFrame.tsx`
- Modify: `dashboard/dashboard/src/components/PartnerHubShell.tsx`
- Modify: `dashboard/dashboard/src/components/BookingDetailModal.tsx`
- Modify: `dashboard/dashboard/src/App.tsx`

**Interfaces:**
- Consumes: `viewportRegistry.ts`, `viewportEmbedService.ts`, `DataSourceMode`.
- Produces:
  - `<BiViewportFrame slotId activeUserId canUseDemoTools locale onFallbackToNative />` with `data-testid="bi-viewport-frame-${slotId}"`, `data-testid="bi-viewport-iframe-${slotId}"`, `data-testid="bi-viewport-reload-btn"`, `data-testid="bi-viewport-fullscreen-btn"`, `data-testid="bi-viewport-demo-config-btn"`, `data-testid="bi-viewport-error-card"`, `data-testid="bi-viewport-fallback-btn"`.
  - Topbar button `data-testid="source-toggle-bi-viewport"`.
  - `BookingDetailModal` optional props `maskFinancials?: boolean`, `maskedMoneyText?: string` (`data-testid="booking-modal-net-payout"`).

- [ ] **Step 1: Implement `BiViewportFrame.tsx`**
  - Adaptive `sandbox`: drops `allow-same-origin` whenever `isSameOriginEmbed(effectiveUrl, window.location.origin)` is `true`, keeping `allow-scripts allow-same-origin allow-forms allow-downloads` for genuine cross-origin embeds.
  - Strict `postMessage` listener validating `event.source === iframeRef.current?.contentWindow` and expected origin (`expectedOrigin` for cross-origin, `"null"` for same-origin sandboxed), clamping auto-height to `[420, 2400]`.
  - Proactive token refresh `60_000ms` before `expiresAt`, manual Reload, Fullscreen overlay toggle, Dev-only Manager-only Demo Swap URL & Contract JSON Inspector popover (`canUseDemoTools && (import.meta.env.DEV || VITE_ENABLE_VIEWPORT_DEMO_TOOLS === "true")`), localized `vi`/`en`/`ko` copy, and isolated error/offline fallback card.
  - Strictly depends ONLY on `[slotId, activeUserId, refreshNonce, demoOverrideUrl]` — never re-fetches on `propertyKey` or `periodKey`.

- [ ] **Step 2: Wire `PartnerHubShell.tsx`, `BookingDetailModal.tsx`, and `App.tsx`**
  - Add 3rd toggle button `BI Viewport` (`source-toggle-bi-viewport`) inside `topbar-data-source-switcher` with compact padding so `360px` mobile has `0` overflow.
  - Add optional `maskFinancials` support to `BookingDetailModal.tsx`.
  - In `App.tsx`:
    - Accept `"bi-viewport"` in `readInitialHubPrefs()`.
    - Keep operational bundle on Local JSON in `"bi-viewport"` mode (reloading Local JSON if switching from `"live-bigquery"` to `"bi-viewport"`).
    - Compute `overviewPeriodKey = dataSourceMode === "bi-viewport" ? "30d" : periodKey` for `buildOverviewViewModel` so `section-recent-bookings` is never stuck on stale `"today"`.
    - Set `isOverviewFinancialsMasked = (dataSourceMode === "live-bigquery" || dataSourceMode === "bi-viewport") && !canViewFinancials` and pass `maskFinancials={isOverviewFinancialsMasked}` + `maskedMoneyText={maskedMoneyText}` to `BookingDetailModal`.
    - In `overview` + `bi-viewport`: hide `period-select`, replace KPI/Charts/Ratings/AI sections with `<BiViewportFrame slotId="overview_analytics" ... />`, keep `section-recent-bookings` below with `"30 ngày gần nhất"` / `"Last 30 days"` / `"최근 30일"` subtle scope pill.
    - In `bigquery_live` + `bi-viewport`: render `<BiViewportFrame slotId="deep_analytics" ... />` full-page.

- [ ] **Step 3: Run `npm run test:unit && npm run build` in `dashboard/dashboard`**
  - Expected: `0` TypeScript/build errors, all unit tests PASS.

---

### Task 4: Playwright E2E Suite, 7-Viewport Responsive Check, Test Catalog & Live Demo Verification

**Files:**
- Create: `dashboard/dashboard/tests/e2e/bi-viewport.spec.ts`
- Modify: `dashboard/dashboard/tests/TEST_CASES.md`

- [ ] **Step 1: Write Playwright E2E suite `dashboard/dashboard/tests/e2e/bi-viewport.spec.ts`**
  - `TC-VP-01`: Switch to `BI Viewport` on `Overview` -> `period-select` hidden, native `kpi-card-revenue` / `section-revenue-timeline` replaced by `bi-viewport-frame-overview_analytics` + live iframe rendering Simulated BI with internal filters & preset switcher, while `section-recent-bookings` remains visible and opens `BookingDetailModal`.
  - `TC-VP-02`: Switch to `Kho BigQuery / Phân tích BI` tab in `BI Viewport` mode -> `bi-viewport-frame-deep_analytics` renders full-page.
  - `TC-VP-03`: Switch user to `USR-MGR-MYKHE` -> iframe reloads with token scoped strictly to `br_mykhe`; changing Header `topbar-property-select` does NOT trigger extra `/embed-session` requests; entering `bi-viewport` after `periodKey = "today"` still shows `30d` bookings in `section-recent-bookings`.
  - `TC-VP-04`: Switch user to `USR-STAFF-02` (Receptionist) -> Demo Swap URL button is hidden, iframe HTML masks revenue with RBAC badge, AND `bookings-net-impact` + `BookingDetailModal` mask revenue.
  - `TC-VP-05`: Demo Swap URL tool (Manager): rejects `javascript:alert(1)`, swaps to preset URL and displays `DEV DEMO OVERRIDE` banner, resets cleanly back to server URL; simulated BFF offline (`route.abort`) shows isolated `bi-viewport-error-card` while operational tabs still work and `bi-viewport-fallback-btn` restores `Local JSON`.
  - `TC-VP-06`: 7-Viewport Responsive Matrix (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`) in `BI Viewport` mode on `Overview` + `deep_analytics` -> `scrollWidth <= innerWidth`, `0` console errors, `0` page errors.

- [ ] **Step 2: Update `dashboard/dashboard/tests/TEST_CASES.md` with `TC-VP-UNIT-01..04` and `TC-VP-01..06`**

- [ ] **Step 3: Restart BFF (`:4000`) with freshly built `dist/`, verify Vite (`:5182`) stays alive, run ALL verification suites**
  - Run:
    1. `cd dashboard/bigquery-bff && npm test`
    2. `cd dashboard/dashboard && npm test && npm run build`
    3. Verify live `/api/v1/health`, `/api/v1/viewports/overview_analytics/embed-session`, `/bi-embed/render`, and Tailscale HTTPS tunnel `https://bao-minh-nguyens-macbook-pro-m4-pro.tail6930d7.ts.net/`!
