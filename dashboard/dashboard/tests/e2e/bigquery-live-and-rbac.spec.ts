import { test, expect } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-BQ: Live BigQuery Viewport, 6-Layer Cost Guard & 5-Profile user_id × branch_id RBAC", () => {
  test.beforeAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-BQ-01: Kho BigQuery loads live aevo-512307 metrics, 6-layer Cost Guard, CTO 3-Chart Suite & 8-Step Funnel", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("nav-item-bigquery").click();
    await expect(page.getByTestId("module-bigquery-view")).toBeVisible();
    await expect(page.getByTestId("bq-live-badge")).toContainText("aevo-512307");
    await expect(page.getByTestId("bq-cost-guard-panel")).toBeVisible();

    // USR-PARTNER-01 live BigQuery portfolio 30d revenue (111.960.000 ₫ across 4 branches, visibly distinct from Local JSON 66.360.000 ₫)
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("111.960.000 ₫", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("bq-cto-3charts")).toBeVisible();
    await expect(page.getByTestId("bq-funnel-8steps")).toBeVisible();

    // Toggle CTO 3-Chart lens between Offer Funnel & Booking Form Demand
    await page.getByTestId("cto-lens-form").click();
    await page.getByTestId("cto-lens-offer").click();

    // Force Live Query executes cleanly with live telemetry
    await page.getByTestId("bq-force-refresh-btn").click();
    await expect(page.getByTestId("bq-telemetry-chip")).toBeVisible({
      timeout: 15_000,
    });

    monitor.assertZeroErrors();
  });

  test("TC-BQ-02: USR-MGR-MYKHE locks to br_mykhe (46.490.000 ₫ live BigQuery) and live Cross-Branch Guard blocks br_songhan with HTTP 403", async ({
    page,
    request,
  }) => {
    // Allow expected HTTP 403 console entry produced specifically by the intentional Cross-Branch Guard probe
    const monitor = attachErrorMonitor(page, { ignoreHttp403: true });
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("nav-item-bigquery").click();
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("111.960.000 ₫", {
      timeout: 15_000,
    });

    // Switch account to My Khe Branch Manager (USR-MGR-MYKHE)
    await page.getByTestId("nav-item-logout").click();
    await expect(page.getByTestId("session-handover-dialog")).toBeVisible();
    await page.getByTestId("switch-user-USR-MGR-MYKHE").click();

    // Topbar selector locks strictly to br_mykhe (no "all", no other branches)
    const propSelect = page.getByTestId("topbar-property-select");
    await expect(propSelect).toHaveValue("br_mykhe");
    const optionValues = await propSelect.locator("option").evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    );
    expect(optionValues).toEqual(["br_mykhe"]);

    // BigQuery KPI reflects My Khe branch live net revenue strictly (46.490.000 ₫ vs Local JSON 28.290.000 ₫)
    await expect(page.getByTestId("bq-rbac-user")).toContainText("USR-MGR-MYKHE");
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("46.490.000 ₫", {
      timeout: 15_000,
    });

    // Click Live Cross-Branch Security Probe -> BFF returns HTTP 403 FORBIDDEN_BRANCH_SCOPE
    await page.getByTestId("bq-test-cross-branch-btn").click();
    await expect(page.getByTestId("bq-cross-branch-result")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("bq-cross-branch-result")).toContainText(
      "HTTP 403 · FORBIDDEN_BRANCH_SCOPE",
    );
    await expect(page.getByTestId("bq-cross-branch-result")).toContainText(
      "target: br_songhan",
    );

    monitor.assertZeroErrors();
  });

  test("TC-BQ-03: USR-STAFF-02 (Receptionist) locks to br_mykhe and masks financial amounts server-side & UI-side", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("nav-item-bigquery").click();
    await expect(page.getByTestId("bq-kpi-revenue")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-receptionist").click();

    const propSelect = page.getByTestId("topbar-property-select");
    await expect(propSelect).toHaveValue("br_mykhe");
    await expect(page.getByTestId("bq-rbac-financials")).toContainText("Đã che số tiền", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("•••••• ₫ (Đã che)");

    monitor.assertZeroErrors();
  });

  test("TC-BQ-04: Global Data Source Switcher (Local JSON ↔ BigQuery) hydrates Overview live & respects RBAC scoping", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // Verify Local JSON starts at +66,4tr ₫ and inline BigQuery charts are hidden before toggling
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+66,4tr ₫");
    await expect(page.getByTestId("overview-bigquery-charts-section")).toBeHidden();

    // Switch Global Data Source to Live BigQuery on Overview -> visibly jumps to +104,4tr ₫ AND renders inline BigQuery charts!
    await page.getByTestId("source-toggle-bigquery").click();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+104,4tr ₫", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("overview-bigquery-charts-section")).toBeVisible();
    await expect(page.getByTestId("overview-bq-live-pill")).toContainText("aevo-512307");
    await expect(page.getByTestId("overview-bq-cto-3charts")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("overview-bq-funnel")).toBeVisible();
    await expect(page.getByTestId("overview-bq-media")).toBeVisible();
    await expect(page.getByTestId("overview-bq-devices")).toBeVisible();
    await page.getByTestId("overview-cto-lens-form").click();
    await page.getByTestId("overview-cto-lens-offer").click();

    // Switch to My Khe Branch Manager -> Overview hydrates strictly My Khe live BigQuery bundle (+46,5tr ₫) & SQL scope locks
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-user-USR-MGR-MYKHE").click();
    await expect(page.getByTestId("topbar-property-select")).toHaveValue("br_mykhe");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+46,5tr ₫", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("overview-bq-sql-scope")).toContainText(
      "branch_id IN ('br_mykhe')",
      { timeout: 15_000 },
    );

    // Switch to Receptionist -> Overview masks financial KPI in Live BigQuery mode
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-receptionist").click();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("•••••• ₫ (Đã che)", {
      timeout: 15_000,
    });

    // Switch back to Local JSON + Chain Owner -> hides inline BigQuery charts & restores full 4-property local dataset (+66,4tr ₫)
    await page.getByTestId("source-toggle-local").click();
    await expect(page.getByTestId("overview-bigquery-charts-section")).toBeHidden();
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-manager").click();
    await expect(page.getByTestId("topbar-property-select")).toHaveValue("all");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+66,4tr ₫", {
      timeout: 10_000,
    });

    monitor.assertZeroErrors();
  });

  test("TC-BQ-06: Inline Overview BigQuery charts fit 360×800 mobile without overflow and 1-click jump to Kho BigQuery inspector", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);
    await page.setViewportSize({ width: 360, height: 800 });

    await page.getByTestId("source-toggle-bigquery").click();
    await expect(page.getByTestId("overview-bq-cto-3charts")).toBeVisible({
      timeout: 15_000,
    });
    await assertNoHorizontalOverflow(page, "Mobile 360×800 - Overview Inline BigQuery Charts");

    await page.getByTestId("overview-bq-open-inspector-btn").click();
    await expect(page.getByTestId("module-bigquery-view")).toBeVisible();
    await expect(page.getByTestId("bq-cost-guard-panel")).toBeVisible();

    monitor.assertZeroErrors();
  });

  test("TC-BQ-05: USR-MGR-H11 locks strictly to stay_h11 with 7.600.000 ₫ revenue and 2 / 78 live BigQuery bids", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("nav-item-bigquery").click();
    await expect(page.getByTestId("module-bigquery-view")).toBeVisible();

    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-user-USR-MGR-H11").click();

    const propSelect = page.getByTestId("topbar-property-select");
    await expect(propSelect).toHaveValue("stay_h11");
    const optionValues = await propSelect.locator("option").evaluateAll((opts) =>
      opts.map((o) => (o as HTMLOptionElement).value),
    );
    expect(optionValues).toEqual(["stay_h11"]);

    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("7.600.000 ₫", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("module-bigquery-view")).toContainText("2 / 78 bids");

    monitor.assertZeroErrors();
  });
});
