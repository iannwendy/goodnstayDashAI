import { test, expect } from "@playwright/test";
import {
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-FLOW: Property States, Dynamic Branch Trust/ELO, Periods, Multi-Language/Currency, Guest Count & Pagination", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-FLOW-01..05 & TC-FLOW-11: Active Chain, Dynamic Per-Branch Rating/ELO, Non-Zero Cancelled Bucket, Stay Hotel H11 & Pure-Business Copy", async ({
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

    // 2. Default 30d All Chain shows 29 completed bookings, 4 cancelled bids, 142 reviews & ELO 1680
    const bookingRows = page.locator('[data-testid="recent-bookings-tbody"] tr');
    await expect(bookingRows).toHaveCount(5);
    await expect(page.getByTestId("bookings-period-summary")).toContainText("29");
    await expect(page.getByTestId("section-bids-status")).toContainText("Khách sạn tự hủy");
    await expect(page.getByTestId("section-bids-status")).toContainText("(4)");
    await expect(page.getByTestId("overall-review-count")).toContainText("142");
    await expect(page.getByTestId("elo-score-value")).toHaveText("1680");

    // 3. Switch Period: 30d -> 7d -> today -> back to 30d (Booking #71 stays stable across periods!)
    const periodSelect = page.getByTestId("period-select");
    await periodSelect.selectOption("7d");
    await expect(page.getByTestId("bookings-period-summary")).toContainText("13");
    await expect(bookingRows.first()).toContainText("#71");

    await periodSelect.selectOption("today");
    await expect(page.getByTestId("bookings-period-summary")).toContainText("5");
    await expect(bookingRows.first()).toContainText("#71");
    await periodSelect.selectOption("30d");

    // 4. TC-FLOW-11: Dynamic per-branch Rating, Review Count & ELO Score from partner_hub_config.json
    const propSelect = page.getByTestId("topbar-property-select");
    await propSelect.selectOption("br_mykhe");
    await expect(page.getByTestId("kpi-card-rating")).toContainText("★4.9");
    await expect(page.getByTestId("overall-review-count")).toContainText("64");
    await expect(page.getByTestId("elo-score-value")).toHaveText("1720");

    await propSelect.selectOption("br_anthuong");
    await expect(page.getByTestId("kpi-card-rating")).toContainText("★4.7");
    await expect(page.getByTestId("overall-review-count")).toContainText("32");
    await expect(page.getByTestId("elo-score-value")).toHaveText("1610");

    // 5. Switch Property to Stay Hotel H11 -> loads 100% from master-data (0 revenue, 75 bids, ★0.0, ELO 800, empty bookings, 0 messages)
    await propSelect.selectOption("stay_h11");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("0 ₫");
    await expect(page.getByTestId("kpi-card-total-bids")).toContainText("75");
    await expect(page.getByTestId("kpi-card-accept-rate")).toContainText("0.0%");
    await expect(page.getByTestId("kpi-card-rating")).toContainText("★0.0");
    await expect(page.getByTestId("overall-review-count")).toContainText("0");
    await expect(page.getByTestId("elo-score-value")).toHaveText("800");
    await expect(page.getByTestId("bookings-empty-state")).toBeVisible();

    // Switch back to All Chain
    await propSelect.selectOption("all");
    await expect(bookingRows).toHaveCount(5);

    monitor.assertZeroErrors();
  });

  test("TC-FLOW-06..10 & TC-FLOW-12: Multi-Language (vi/en/ko) + Currency (VND/KRW/USD), Localized Booking Slip (4-Guest #69) & Pagination Safety", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    const langSelect = page.getByTestId("topbar-language-select");
    const currSelect = page.getByTestId("topbar-currency-select");

    // 1. Switch to English + KRW -> matches Optibide Partner Hub labels, user profile, & ₩ symbols
    await langSelect.selectOption("en");
    await currSelect.selectOption("KRW");

    await expect(page.getByRole("heading", { name: "Dashboard overview" })).toBeVisible();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("₩");
    await expect(page.getByText("Revenue Timeline")).toBeVisible();
    await expect(page.getByText("Bids Status", { exact: true })).toBeVisible();
    await expect(page.getByText("ELO Score")).toBeVisible();
    await expect(page.getByTestId("bookings-net-impact")).toContainText("₩");
    await expect(page.getByTestId("topbar-user-avatar")).toHaveText("KH");
    await expect(page.getByTestId("topbar-user-avatar")).toHaveAttribute(
      "title",
      /Kim Ha-yoon/,
    );

    // 2. TC-FLOW-12: Open Family Suite #69 (row index 2 on page 1) -> verify localized English property name & exact 4 guests
    await page.getByTestId("booking-view-detail-btn").nth(2).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const enModalText = await dialog.innerText();
    expect(enModalText).toContain("#69");
    expect(enModalText).toContain("₩");
    expect(enModalText).toContain("L'amour An Thuong · Ngu Hanh Son");
    expect(enModalText).toContain("Family Connecting Suite");
    expect(enModalText).toContain("Family of 4");
    expect(enModalText).not.toContain("người lớn");
    expect(enModalText).not.toContain("Bữa sáng");
    expect(enModalText).not.toContain("Ngũ Hành Sơn");
    await expect(page.getByTestId("booking-modal-guests")).toHaveText("4 guests");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 3. Switch to Korean + USD -> updates labels to Korean, user profile to 김하윤, and money to $
    await langSelect.selectOption("ko");
    await currSelect.selectOption("USD");
    await expect(page.getByRole("heading", { name: "대시보드 개요" })).toBeVisible();
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("$");
    await expect(page.getByTestId("bookings-net-impact")).toContainText("$");
    await expect(page.getByTestId("topbar-user-avatar")).toHaveAttribute(
      "title",
      /김하윤/,
    );

    // Return to Vietnamese + VND
    await langSelect.selectOption("vi");
    await currSelect.selectOption("VND");

    // 4. Pagination: Rows per page (5 -> 10 -> 5), Next/Prev, and Page-Clamp reset when switching period
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
