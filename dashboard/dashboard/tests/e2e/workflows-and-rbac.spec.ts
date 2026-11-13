import { test, expect } from "@playwright/test";
import {
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-FLOW: Property States (Active 2.png vs Zero-Booking 1.png), Periods, Multi-Language/Currency, Pagination & Pure-Business Copy", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-FLOW-01..05: Active Chain (2.png) vs Stay Hotel H11 Zero-Booking State (1.png), Period Filter & Pure-Business Copy Gate", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // 1. Default Vietnamese pure-business copy check — zero engineering/simulation jargon anywhere on page
    const bodyTextVi = await page.locator("body").innerText();
    expect(bodyTextVi).not.toContain("1.265");
    expect(bodyTextVi).not.toContain("REJ_");
    expect(bodyTextVi).not.toContain("settled_t_plus_7");
    expect(bodyTextVi).not.toContain("Mô phỏng");
    expect(bodyTextVi).toContain("Doanh thu thực nhận");
    expect(bodyTextVi).toContain("Điểm uy tín hiển thị");

    // 2. Default 30d All Chain shows 29 completed bookings (5 rows on page 1)
    const bookingRows = page.locator('[data-testid="recent-bookings-tbody"] tr');
    await expect(bookingRows).toHaveCount(5);
    await expect(page.getByTestId("bookings-period-summary")).toContainText("29");

    // 3. Switch Period: 30d -> 7d -> today -> back to 30d (Booking #71 stays stable across periods!)
    const periodSelect = page.getByTestId("period-select");
    await periodSelect.selectOption("7d");
    await expect(page.getByTestId("bookings-period-summary")).toContainText("13");
    await expect(bookingRows.first()).toContainText("#71");

    await periodSelect.selectOption("today");
    await expect(page.getByTestId("bookings-period-summary")).toContainText("5");
    await expect(bookingRows.first()).toContainText("#71");
    await periodSelect.selectOption("30d");

    // 4. Switch Property to Stay Hotel H11 -> reproduces demo_new/1.png (0 revenue, 75 bids, ★0.0, ELO 800, empty bookings)
    const propSelect = page.getByTestId("topbar-property-select");
    await propSelect.selectOption("stay_h11");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("0 ₫");
    await expect(page.getByTestId("kpi-card-total-bids")).toContainText("75");
    await expect(page.getByTestId("kpi-card-accept-rate")).toContainText("0.0%");
    await expect(page.getByTestId("kpi-card-rating")).toContainText("★0.0");
    await expect(page.getByTestId("elo-score-value")).toHaveText("800");
    await expect(page.getByTestId("bookings-empty-state")).toBeVisible();

    // Switch back to All Chain
    await propSelect.selectOption("all");
    await expect(bookingRows).toHaveCount(5);

    monitor.assertZeroErrors();
  });

  test("TC-FLOW-06..10: Multi-Language (vi/en/ko) + Currency (VND/KRW/USD) Sync & Pagination Page-Clamp Safety", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    const langSelect = page.getByTestId("topbar-language-select");
    const currSelect = page.getByTestId("topbar-currency-select");

    // 1. Switch to English + KRW -> matches demo_new/2.png exact labels & ₩ symbols across KPI, AI Advisor, and Footer
    await langSelect.selectOption("en");
    await currSelect.selectOption("KRW");

    await expect(page.getByRole("heading", { name: "Dashboard overview" })).toBeVisible();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("₩");
    await expect(page.getByText("Revenue Timeline")).toBeVisible();
    await expect(page.getByText("Bids Status", { exact: true })).toBeVisible();
    await expect(page.getByText("ELO Score")).toBeVisible();
    await expect(page.getByTestId("bookings-net-impact")).toContainText("₩");

    // Open Booking Detail Modal in English + KRW -> verify zero raw Vietnamese strings inside modal
    await page.getByTestId("booking-view-detail-btn").first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const enModalText = await dialog.innerText();
    expect(enModalText).toContain("₩");
    expect(enModalText).not.toContain("người lớn");
    expect(enModalText).not.toContain("Bữa sáng");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 2. Switch to Korean + USD -> updates labels to Korean and money to $
    await langSelect.selectOption("ko");
    await currSelect.selectOption("USD");
    await expect(page.getByRole("heading", { name: "대시보드 개요" })).toBeVisible();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("$");
    await expect(page.getByTestId("bookings-net-impact")).toContainText("$");

    // Return to Vietnamese + VND
    await langSelect.selectOption("vi");
    await currSelect.selectOption("VND");

    // 3. Pagination: Rows per page (5 -> 10 -> 5), Next/Prev, and Page-Clamp reset when switching period
    const rows = page.locator('[data-testid="recent-bookings-tbody"] tr');
    await expect(rows).toHaveCount(5);
    await expect(page.getByTestId("bookings-range-indicator")).toContainText("1–5");

    const rowsPerPage = page.getByTestId("bookings-rows-per-page");
    await rowsPerPage.selectOption("10");
    await expect(rows).toHaveCount(10);
    await expect(page.getByTestId("bookings-range-indicator")).toContainText("1–10");

    await rowsPerPage.selectOption("5");
    await page.getByTestId("bookings-next-page").click();
    await page.getByTestId("bookings-next-page").click();
    await expect(page.getByTestId("bookings-range-indicator")).toContainText("11–15");

    // Switching from 30d (page 3) to "today" (only 5 bookings) MUST clamp/reset back to page 1 (1–5)
    await page.getByTestId("period-select").selectOption("today");
    await expect(rows).toHaveCount(5);
    await expect(page.getByTestId("bookings-range-indicator")).toContainText("1–5");

    monitor.assertZeroErrors();
  });
});
