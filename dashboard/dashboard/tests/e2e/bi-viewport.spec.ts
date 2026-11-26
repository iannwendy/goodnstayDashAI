import { test, expect } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

const VIEWPORT_MATRIX = [
  { name: "Desktop Wide", width: 1440, height: 900 },
  { name: "Laptop Standard", width: 1280, height: 800 },
  { name: "Tablet Landscape", width: 1024, height: 768 },
  { name: "Tablet Portrait", width: 768, height: 1024 },
  { name: "Mobile iPhone 14", width: 390, height: 844 },
  { name: "Mobile iPhone SE", width: 375, height: 667 },
  { name: "Mobile Compact Android", width: 360, height: 800 },
] as const;

test.describe("TC-VP: BI Viewport Khối Lớn (Decoupled Analytics Shell, RBAC Embed Token & 7-Viewport Responsive)", () => {
  test.beforeAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-VP-01: Overview BI Viewport replaces native KPI/charts, hides outer period filter, renders BI internal filters, and keeps Recent Bookings + Modal operational", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // Pre-set period to 'today' before entering BI Viewport to verify anti-stale-filter pinning to 30d
    await page.getByTestId("period-select").selectOption("today");

    // Toggle to BI Viewport mode
    await page.getByTestId("source-toggle-bi-viewport").click();

    // Outer period selector & native KPI/charts are replaced by the coarse-grained BI Viewport
    await expect(page.getByTestId("period-select")).toHaveCount(0);
    await expect(page.getByTestId("kpi-card-revenue")).toHaveCount(0);
    await expect(page.getByTestId("section-revenue-timeline")).toHaveCount(0);
    await expect(page.getByTestId("bi-viewport-frame-overview_analytics")).toBeVisible();

    // Verify sandboxed iframe loads Simulated BI with internal filters & preset switcher
    const iframeLoc = page.getByTestId("bi-viewport-iframe-overview_analytics");
    await expect(iframeLoc).toBeVisible({ timeout: 15_000 });
    const frame = page.frameLocator('[data-testid="bi-viewport-iframe-overview_analytics"]');
    await expect(frame.locator("#bi-period-filter")).toBeVisible({ timeout: 15_000 });
    await expect(frame.locator("#bi-branch-filter")).toBeVisible();
    await expect(frame.locator("#bi-preset-filter")).toBeVisible();

    // Test changing BI internal preset right inside the iframe
    await frame.locator("#bi-preset-filter").selectOption("ai_clusters");
    await expect(frame.locator("#bi-panel-grid")).toContainText("C1–C4");

    // Recent Bookings below the BI Viewport remains operational, pinned to 30d, and opens BookingDetailModal
    await expect(page.getByTestId("section-recent-bookings")).toBeVisible();
    await expect(page.getByTestId("recent-bookings-fixed-window-badge")).toBeVisible();
    await page.getByTestId("booking-view-detail-btn").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("booking-modal-net-payout")).toContainText("₫");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    monitor.assertZeroErrors();
  });

  test("TC-VP-02: Kho BigQuery / BI Analytics tab renders full-page deep_analytics Viewport with Fullscreen toggle", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("source-toggle-bi-viewport").click();
    await page.getByTestId("nav-item-bigquery").click();

    await expect(page.getByTestId("bi-viewport-frame-deep_analytics")).toBeVisible();
    const frame = page.frameLocator('[data-testid="bi-viewport-iframe-deep_analytics"]');
    await expect(frame.locator("#bi-panel-grid")).toContainText("GA4 8", {
      timeout: 15_000,
    });

    // Toggle fullscreen overlay & exit via Escape
    await page.getByTestId("bi-viewport-fullscreen-btn").click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bi-viewport-frame-deep_analytics")).toBeVisible();

    monitor.assertZeroErrors();
  });

  test("TC-VP-03: User switch re-issues RBAC-scoped embed session; changing Header property selector does NOT re-fetch BI Viewport", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    let embedSessionCalls = 0;
    page.on("request", (req) => {
      if (req.url().includes("/api/v1/viewports/overview_analytics/embed-session")) {
        embedSessionCalls += 1;
      }
    });

    await gotoFreshSeedDashboard(page, request);
    await page.getByTestId("source-toggle-bi-viewport").click();
    const frame = page.frameLocator('[data-testid="bi-viewport-iframe-overview_analytics"]');
    await expect(frame.getByTestId("bi-token-user")).toContainText("USR-PARTNER-01", {
      timeout: 15_000,
    });

    const callsBeforeHeaderFilter = embedSessionCalls;
    // Changing Header property filter (for operational tables) must NOT re-trigger BI Viewport session fetch
    await page.getByTestId("topbar-property-select").selectOption("br_mykhe");
    await page.waitForTimeout(300);
    expect(embedSessionCalls).toBe(callsBeforeHeaderFilter);

    // Switching user account to USR-MGR-MYKHE MUST re-issue a strictly scoped embed token
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-user-USR-MGR-MYKHE").click();
    await expect(frame.getByTestId("bi-token-user")).toContainText("USR-MGR-MYKHE", {
      timeout: 15_000,
    });
    await expect(frame.getByTestId("bi-token-branches")).toContainText("br_mykhe");
    const biBranchOptions = await frame
      .locator("#bi-branch-filter option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    expect(biBranchOptions).toEqual(["br_mykhe"]);

    monitor.assertZeroErrors();
  });

  test("TC-VP-04: USR-STAFF-02 (Receptionist) hides Demo Swap URL tool and masks financials inside BI iframe, Recent Bookings bar & BookingDetailModal", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("source-toggle-bi-viewport").click();
    await expect(page.getByTestId("bi-viewport-demo-config-btn")).toBeVisible();

    // Switch to Receptionist
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-receptionist").click();

    // Demo Swap URL tool is hidden for Receptionist
    await expect(page.getByTestId("bi-viewport-demo-config-btn")).toHaveCount(0);
    await expect(page.getByTestId("bi-viewport-rbac-masked-overview_analytics")).toBeVisible({
      timeout: 15_000,
    });

    // BI iframe shows server-side redaction banner
    const frame = page.frameLocator('[data-testid="bi-viewport-iframe-overview_analytics"]');
    await expect(frame.getByTestId("bi-internal-financial-mask-banner")).toBeVisible({
      timeout: 15_000,
    });

    // Recent Bookings footer AND BookingDetailModal both mask revenue
    await expect(page.getByTestId("bookings-net-impact")).toContainText("•••••• ₫ (Đã che)");
    await page.getByTestId("booking-view-detail-btn").first().click();
    await expect(page.getByTestId("booking-modal-net-payout")).toContainText("•••••• ₫ (Đã che)");
    await page.keyboard.press("Escape");

    monitor.assertZeroErrors();
  });

  test("TC-VP-05: Demo Swap URL rejects javascript: XSS, swaps presets cleanly, and isolated BFF offline error recovers to Local JSON", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page, { ignoreHttp503: true });
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("source-toggle-bi-viewport").click();
    await expect(page.getByTestId("bi-viewport-iframe-overview_analytics")).toBeVisible({
      timeout: 15_000,
    });

    // Open Demo Swap panel & verify dangerous scheme rejection
    await page.getByTestId("bi-viewport-demo-config-btn").click();
    await expect(page.getByTestId("bi-viewport-demo-panel")).toBeVisible();
    await page.getByTestId("bi-demo-custom-url-input").fill("javascript:alert(1)");
    await page.getByTestId("bi-demo-apply-url-btn").click();
    await expect(page.getByTestId("bi-demo-validation-error")).toBeVisible();

    // Swap BI layout preset live without touching FE code -> shows DEV DEMO OVERRIDE banner
    await page.getByTestId("bi-demo-preset-funnel").click();
    await expect(page.getByTestId("bi-viewport-demo-override-banner")).toBeVisible();
    const frame = page.frameLocator('[data-testid="bi-viewport-iframe-overview_analytics"]');
    await expect(frame.locator("#bi-panel-grid")).toContainText("GA4 8", {
      timeout: 15_000,
    });

    // Reset demo override cleanly
    await page.getByTestId("bi-demo-reset-btn").click();
    await expect(page.getByTestId("bi-viewport-demo-override-banner")).toHaveCount(0);

    // Simulate BFF embed-session outage -> isolated error card appears while operational tabs stay usable
    await page.route("**/api/v1/viewports/*/embed-session", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          errorCode: "VIEWPORT_PROVIDER_UNCONFIGURED",
          message: "Simulated BI maintenance window",
        }),
      }),
    );
    await page.getByTestId("bi-viewport-reload-btn").click();
    await expect(page.getByTestId("bi-viewport-error-card")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("section-recent-bookings")).toBeVisible();

    // Fallback button cleanly returns to Local JSON native overview
    await page.getByTestId("bi-viewport-fallback-btn").click();
    await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();

    await page.unroute("**/api/v1/viewports/*/embed-session");
    monitor.assertZeroErrors();
  });

  test("TC-VP-06: 7-Viewport Responsive Matrix (1440×900 → 360×800) renders BI Viewport with zero horizontal overflow", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);
    await page.getByTestId("source-toggle-bi-viewport").click();
    await expect(page.getByTestId("bi-viewport-iframe-overview_analytics")).toBeVisible({
      timeout: 15_000,
    });

    for (const vp of VIEWPORT_MATRIX) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(80);
      await assertNoHorizontalOverflow(page, `BI Viewport Overview · ${vp.name}`);
    }

    monitor.assertZeroErrors();
  });

  test("TC-VP-07: In-Viewport Language (VI/EN/KO) & Currency (VND/USD/KRW) switchers update BI UI independently and keep Receptionist revenue masked", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);
    await page.getByTestId("source-toggle-bi-viewport").click();

    const frame = page.frameLocator('[data-testid="bi-viewport-iframe-overview_analytics"]');
    await expect(frame.getByTestId("bi-lang-filter")).toBeVisible({ timeout: 15_000 });
    await expect(frame.getByTestId("bi-currency-filter")).toBeVisible();

    // Default VI + VND
    await expect(frame.locator("#bi-header-title")).toContainText("Không Gian BI Data Science");
    await expect(frame.getByTestId("bi-kpi-revenue-val")).toContainText("₫");

    // Switch Language -> EN & Currency -> USD directly inside the BI Viewport
    await frame.getByTestId("bi-lang-filter").selectOption("en");
    await frame.getByTestId("bi-currency-filter").selectOption("USD");
    await expect(frame.locator("#bi-header-title")).toContainText("Data Science BI Workspace");
    await expect(frame.getByTestId("bi-kpi-revenue-val")).toContainText("$");

    // Switch Language -> KO & Currency -> KRW directly inside the BI Viewport
    await frame.getByTestId("bi-lang-filter").selectOption("ko");
    await frame.getByTestId("bi-currency-filter").selectOption("KRW");
    await expect(frame.locator("#bi-header-title")).toContainText("데이터 사이언스 BI 워크스페이스");
    await expect(frame.getByTestId("bi-kpi-revenue-val")).toContainText("₩");

    // Switch to Receptionist -> switching currencies inside BI must NEVER unmask revenue
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-receptionist").click();
    await expect(frame.getByTestId("bi-internal-financial-mask-banner")).toBeVisible({
      timeout: 15_000,
    });
    await frame.getByTestId("bi-currency-filter").selectOption("USD");
    await expect(frame.getByTestId("bi-kpi-revenue-val")).not.toContainText("$");
    await expect(frame.getByTestId("bi-kpi-revenue-val")).toContainText("RBAC");

    monitor.assertZeroErrors();
  });
});
