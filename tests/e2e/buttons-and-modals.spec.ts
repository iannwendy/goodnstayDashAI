import { test, expect } from "@playwright/test";
import {
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-UI: All Header Buttons, Switches, 6 KPI Modals, Match->Bid Handoff & Session Log", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-UI-01..06: Topbar switches, Branch selector, Formula drawer, Toast dismiss & all 6 KPI Drilldown Modals", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // 1. Formula Drawer open & collapse
    await page.locator('button[title="Xem công thức chuẩn goodNstay"]').click();
    await expect(
      page.getByText("1. Doanh thu & Giá bình quân đêm (ADR)"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thu gọn" }).click();
    await expect(
      page.getByText("1. Doanh thu & Giá bình quân đêm (ADR)"),
    ).toBeHidden();

    // 2. Branch Selector updates room inventory & KPI labels across all 3 branches
    const branchSelect = page.getByTestId("topbar-branch-select");
    await branchSelect.selectOption("br_mykhe");
    await expect(
      page.locator('button[type="button"]', { hasText: /^\d+\/12 đã khóa$/ }),
    ).toBeVisible();

    await branchSelect.selectOption("br_songhan");
    await expect(
      page.locator('button[type="button"]', { hasText: /^\d+\/10 đã khóa$/ }),
    ).toBeVisible();

    await branchSelect.selectOption("br_anthuong");
    await expect(
      page.locator('button[type="button"]', { hasText: /^\d+\/8 đã khóa$/ }),
    ).toBeVisible();

    await branchSelect.selectOption("all");
    await expect(
      page.locator('button[type="button"]', { hasText: /^\d+\/30 đã khóa$/ }),
    ).toBeVisible();

    // 3. Auto-Bid Switch + Toast dismiss button ("Đóng")
    const autoBidSwitch = page
      .locator("header")
      .locator('button[role="switch"]')
      .first();
    await autoBidSwitch.click();
    await expect(
      page.getByRole("button", { name: "Đóng", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    await autoBidSwitch.click();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();

    // 4. Night Flash Sale Switch (-15% tonight floor adjustment)
    const flashSwitch = page
      .locator("div", { hasText: /Xả đêm 20:00/ })
      .locator('button[role="switch"]')
      .first();
    const flashBefore = await flashSwitch.getAttribute("aria-checked");
    await flashSwitch.click();
    await expect(flashSwitch).toHaveAttribute(
      "aria-checked",
      flashBefore === "true" ? "false" : "true",
    );
    await flashSwitch.click();

    const dialog = page.getByRole("dialog");

    // 5A. KPI Modal #1: revenue_total (30d granularity toggle 4 tuần <-> 30 ngày)
    await page.getByTestId("kpi-card-revenue").click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByTestId("revenue-modal-primary-total"),
    ).toBeVisible();
    const gran30dBtn = dialog.getByRole("button", { name: "30 ngày" });
    if (await gran30dBtn.isVisible()) {
      await gran30dBtn.click();
      await dialog.getByRole("button", { name: "4 tuần" }).click();
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 5B. KPI Modal #2: revenue_today (ADR & Paid Orders)
    await page.getByText(/ADR bình quân/).click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/Giá Bình Quân Đêm \(ADR\)/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 5C. KPI Modal #3: sessions_total (XX/YY phiên sub-button on KPI card 3)
    await page
      .locator('button[type="button"]', { hasText: /^\d+\/\d+ phiên/ })
      .click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/AI Auto-Bid/).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 5D. KPI Modal #4: win_rate (Tỷ lệ được chọn card)
    await page.getByText("Tỷ lệ được chọn", { exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/Phễu Chuyển Đổi Thanh Toán/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 5E. KPI Modal #5: rooms_occupied (XX/30 đã khóa sub-button)
    await page
      .locator('button[type="button"]', { hasText: /^\d+\/30 đã khóa$/ })
      .click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Lịch 30 Phòng/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // 5F. KPI Modal #6: rooms_vacant (Quỹ phòng card)
    await page.getByText(/Quỹ phòng hôm nay/).click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(/Quản Lý Mở Khóa \/ Khóa Phòng/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    monitor.assertZeroErrors();
  });

  test("TC-UI-07..10: MatchBreakdownModal -> CustomBidModal perk handoff & Session Log -> Loss Autopsy navigation", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);
    const dialog = page.getByRole("dialog");

    // 1. Open MatchBreakdownModal on a live session -> handoff to CustomBidModal
    const matchBtn = page.getByRole("button", { name: /^Khớp \d+%$/ }).first();
    await matchBtn.click();
    await expect(
      dialog.getByText("Điểm Khớp Yêu Cầu (AI Match %)"),
    ).toBeVisible();

    const applyAndBidBtn = dialog.getByRole("button", {
      name: /Áp dụng & Mở báo giá|Mở cửa sổ báo giá/i,
    });
    if (await applyAndBidBtn.isVisible()) {
      await applyAndBidBtn.click();
      await expect(
        dialog.getByText("Gửi Báo Giá 1 Lần (One-Shot) & Đặc Quyền"),
      ).toBeVisible();
      await dialog.getByRole("button", { name: /Đặt theo AI/ }).click();
      await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    } else {
      await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    }
    await expect(dialog).toBeHidden();

    // 2. Session Log: filter "Từ chối (N)" -> click "Đối chiếu" / autopsy button -> jumps to Tab 2 Loss Autopsy
    await page.getByRole("button", { name: /^Từ chối \(\d+\)$/ }).click();
    const autopsyJumpBtn = page
      .locator("tbody")
      .getByRole("button", { name: /Đối chiếu|Phân tích/i })
      .first();
    if ((await autopsyJumpBtn.count()) > 0) {
      await autopsyJumpBtn.click();
      await expect(
        page.getByRole("tab", { name: /Hiệu suất & Thị phần/ }),
      ).toHaveAttribute("data-state", "active");
    }

    monitor.assertZeroErrors();
  });
});
