import { test, expect } from "@playwright/test";
import {
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

    // USR-PARTNER-01 chain 30d revenue matches exact BigQuery OLTP sum
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("66.360.000 ₫", {
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

  test("TC-BQ-02: USR-MGR-MYKHE locks to br_mykhe (28.290.000 ₫) and live Cross-Branch Guard blocks br_songhan with HTTP 403", async ({
    page,
    request,
  }) => {
    // Allow expected HTTP 403 console entry produced specifically by the intentional Cross-Branch Guard probe
    const monitor = attachErrorMonitor(page, { ignoreHttp403: true });
    await gotoFreshSeedDashboard(page, request);

    await page.getByTestId("nav-item-bigquery").click();
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("66.360.000 ₫", {
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

    // BigQuery KPI reflects My Khe branch net revenue strictly
    await expect(page.getByTestId("bq-rbac-user")).toContainText("USR-MGR-MYKHE");
    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("28.290.000 ₫", {
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

    // Switch Global Data Source to Live BigQuery on Overview
    await page.getByTestId("source-toggle-bigquery").click();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+66,4tr ₫", {
      timeout: 15_000,
    });

    // Switch to My Khe Branch Manager -> Overview hydrates strictly My Khe live BigQuery bundle
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-user-USR-MGR-MYKHE").click();
    await expect(page.getByTestId("topbar-property-select")).toHaveValue("br_mykhe");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+28,3tr ₫", {
      timeout: 15_000,
    });

    // Switch to Receptionist -> Overview masks financial KPI in Live BigQuery mode
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-receptionist").click();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("•••••• ₫ (Đã che)", {
      timeout: 15_000,
    });

    // Switch back to Local JSON + Chain Owner -> restores full 4-property local dataset
    await page.getByTestId("source-toggle-local").click();
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-manager").click();
    await expect(page.getByTestId("topbar-property-select")).toHaveValue("all");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("+66,4tr ₫", {
      timeout: 10_000,
    });

    monitor.assertZeroErrors();
  });

  test("TC-BQ-05: USR-MGR-H11 locks strictly to stay_h11 with 0 ₫ revenue and 75 live BigQuery bids", async ({
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

    await expect(page.getByTestId("bq-kpi-revenue")).toContainText("0 ₫", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("module-bigquery-view")).toContainText("0 / 75 bids");

    monitor.assertZeroErrors();
  });
});
