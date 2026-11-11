import { test, expect } from "@playwright/test";
import {
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-UI: Partner Hub Sidebar, Topbar Utilities, AI Advisor Panels, KPI Tooltips & Booking Slip Modal", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-UI-01..06: Collapsible Sidebar (1.png <-> 2.png), Marketing Submenu, Polite Nav Notice, Help Guide & Notifications", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    const sidebar = page.getByTestId("sidebar-nav");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");

    // 1. Expand Marketing submenu while sidebar is expanded
    await page.getByTestId("nav-item-marketing").click();
    await expect(page.getByTestId("nav-marketing-submenu")).toBeVisible();

    // 2. Collapse sidebar -> switches to compact icon-rail (like demo_new/1.png)
    await page.getByTestId("sidebar-collapse-btn").click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");

    // Expand back -> full sidebar (like demo_new/2.png)
    await page.getByTestId("sidebar-collapse-btn").click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");

    // 3. Clicking non-overview nav item shows polite commercial notice and stays on Overview
    await page.getByTestId("nav-item-calendar").click();
    const noticeToast = page.getByTestId("hub-toast-banner");
    await expect(noticeToast).toBeVisible();
    await page.getByTestId("hub-toast-close").click();
    await expect(noticeToast).toBeHidden();
    await expect(page.getByTestId("section-revenue-timeline")).toBeVisible();

    // 4. Help Guide dialog opens & closes cleanly
    await page.getByTestId("topbar-help-btn").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("30 giây");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 5. Notifications popover opens & closes
    await page.getByTestId("topbar-notifications-btn").click();
    await expect(page.getByTestId("notifications-popover")).toBeVisible();
    await page.getByTestId("topbar-notifications-btn").click();
    await expect(page.getByTestId("notifications-popover")).toBeHidden();

    monitor.assertZeroErrors();
  });

  test("TC-UI-07..10: KPI Info Tooltips, Both AI Advisor Collapse/Refresh Controls & Booking Detail Slip Modal", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // 1. KPI info button reveals plain-business explanation
    await page.getByTestId("kpi-info-revenue").click();
    await expect(page.getByTestId("kpi-tooltip-revenue")).toBeVisible();
    await page.getByTestId("kpi-info-revenue").click();

    // 2. Revenue AI Advisor collapse & expand
    const revCards = page.getByTestId("advisor-revenue-cards");
    await expect(revCards).toBeVisible();
    await page.getByTestId("advisor-revenue-toggle").click();
    await expect(revCards).toBeHidden();
    await page.getByTestId("advisor-revenue-toggle").click();
    await expect(revCards).toBeVisible();

    // 3. Bids Status AI Advisor collapse & expand + refresh timestamp
    const bidsCards = page.getByTestId("advisor-bids-cards");
    await expect(bidsCards).toBeVisible();
    await page.getByTestId("advisor-bids-refresh").click();
    await page.getByTestId("advisor-bids-toggle").click();
    await expect(bidsCards).toBeHidden();
    await page.getByTestId("advisor-bids-toggle").click();
    await expect(bidsCards).toBeVisible();

    // 4. Recent Bookings -> click "Xem chi tiết" -> opens real hotel Reservation Slip modal
    const firstDetailBtn = page.getByTestId("booking-view-detail-btn").first();
    await expect(firstDetailBtn).toBeVisible();
    await firstDetailBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("#71");
    await expect(dialog).toContainText("100%");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    monitor.assertZeroErrors();
  });
});
