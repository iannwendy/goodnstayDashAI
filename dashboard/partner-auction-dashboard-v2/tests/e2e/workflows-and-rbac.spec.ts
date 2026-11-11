import { test, expect } from "@playwright/test";
import {
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-FLOW: RBAC Floor Guardrails, Auto-Bid, Reject, Pay-to-Lock, Bot Rules & Inventory Protection", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-FLOW-01..04: Manager vs Receptionist Floor Guardrail (Auto-Bid ON vs OFF) & Manager Override Bid", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);
    const dialog = page.getByRole("dialog");

    // 1. As Manager with Auto-Bid ON -> below-floor price is locked until Auto-Bid is disabled + override confirmed
    await page.getByRole("button", { name: "Tùy chỉnh" }).first().click();
    await expect(
      dialog.getByText("Gửi Báo Giá 1 Lần (One-Shot) & Đặc Quyền"),
    ).toBeVisible();

    const priceInput = dialog.locator("#customPriceInput");
    await priceInput.fill("500000");

    await expect(
      dialog.getByText(/Cảnh báo Bảo vệ Giá sàn \(Floor Guardrail\)/),
    ).toBeVisible();
    const submitBtn = dialog.getByRole("button", {
      name: /Gửi báo giá 1 lần/i,
    });
    await expect(submitBtn).toBeDisabled();

    // Manager clicks inline "Tắt Auto-Bid ngay để Quản lý duyệt"
    const disableAutoInline = dialog.getByRole("button", {
      name: "Tắt Auto-Bid ngay để Quản lý duyệt",
    });
    await expect(disableAutoInline).toBeVisible();
    await disableAutoInline.click();

    // Override checkbox appears, submit still disabled until checked
    await expect(submitBtn).toBeDisabled();
    const overrideCheckbox = dialog
      .locator("label", {
        hasText:
          "Tôi (Chủ/Quản lý) xác nhận chủ động duyệt mức giá dưới sàn này",
      })
      .locator('input[type="checkbox"]');
    await expect(overrideCheckbox).toBeVisible();

    // Close without submitting first to test Receptionist role when Auto-Bid is OFF
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(dialog).toBeHidden();

    // 2. Switch to Receptionist (Lễ tân) while Auto-Bid is OFF -> below-floor MUST remain strictly blocked
    const roleBtn = page.locator('button[title="Đổi vai trò Quản lý / Lễ tân"]');
    await roleBtn.click();
    await expect(roleBtn).toContainText("Lễ tân");

    await page.getByRole("button", { name: "Tùy chỉnh" }).first().click();
    await priceInput.fill("500000");
    await expect(
      dialog.getByText(/Tài khoản Lễ tân không có quyền duyệt dưới sàn/),
    ).toBeVisible();
    await expect(overrideCheckbox).toHaveCount(0);
    await expect(submitBtn).toBeDisabled();
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(dialog).toBeHidden();

    // 3. Switch back to Manager -> check override -> successfully submit below-floor custom bid
    await roleBtn.click();
    await expect(roleBtn).toContainText("Quản lý");

    await page.getByRole("button", { name: "Tùy chỉnh" }).first().click();
    await priceInput.fill("500000");
    await overrideCheckbox.check();
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Đã báo giá").first()).toBeVisible();

    monitor.assertZeroErrors();
  });

  test("TC-FLOW-05..08: Bulk Run Auto-Bid, Guest Reject -> Pareto Sync, and Pay-to-Lock Revenue + Room Lock", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    const rejectedPill = page.getByRole("button", { name: /^Từ chối \(\d+\)$/ });
    const initialRejectedText = await rejectedPill.innerText();
    const initialRejectedCount = Number(
      initialRejectedText.match(/\((\d+)\)/)?.[1] ?? 0,
    );

    // 1. Bulk "Chạy Auto-Bid ngay" submits bids on all eligible open live sessions
    const runAutoBtn = page.getByRole("button", {
      name: /Chạy Auto-Bid ngay/,
    });
    await expect(runAutoBtn).toBeVisible();
    await runAutoBtn.click();
    await expect(runAutoBtn).toBeHidden();

    // 2. Simulate "Từ chối" on first bid session -> increments "Từ chối (N)" in Session Log
    const rejectBtn = page
      .locator('button:has-text("Từ chối")')
      .filter({ hasNotText: "(" })
      .first();
    await expect(rejectBtn).toBeVisible();
    await rejectBtn.click();
    await expect(
      page.getByRole("button", {
        name: `Từ chối (${initialRejectedCount + 1})`,
      }),
    ).toBeVisible();

    // 3. Simulate "Khách TT 100% · Khóa phòng" on remaining bid session -> Paid orders count increases from 29 to 30
    await expect(page.getByText("29 đơn TT 100%")).toBeVisible();
    await page
      .getByRole("button", { name: /Khách TT 100% · Khóa phòng/ })
      .first()
      .click();
    await expect(page.getByText("30 đơn TT 100%")).toBeVisible();

    monitor.assertZeroErrors();
  });

  test("TC-FLOW-09..12: Bot Rules CRUD + RBAC Lock & Tab 3 Inventory Explorer 100%-Paid Lock Protection", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // 1. Tab 2: Manager creates new Bot Rule, then Receptionist is blocked from editing
    await page.getByRole("tab", { name: /Hiệu suất & Thị phần/ }).click();
    await expect(
      page.getByText("Quy tắc Auto-Bid đang cấu hình (2)"),
    ).toBeVisible();

    await page.getByRole("button", { name: /Lưu quy tắc Auto-Bid/ }).click();
    await expect(
      page.getByText("Quy tắc Auto-Bid đang cấu hình (3)"),
    ).toBeVisible();

    // Switch to Receptionist -> Save & Delete buttons are disabled
    await page.locator('button[title="Đổi vai trò Quản lý / Lễ tân"]').click();
    await expect(
      page.getByRole("button", { name: /Lưu quy tắc Auto-Bid/ }),
    ).toBeDisabled();
    await expect(
      page.locator('button[title="Xóa quy tắc Auto-Bid"]').first(),
    ).toBeDisabled();

    // Switch back to Manager -> delete newly added rule -> back to (2)
    await page.locator('button[title="Đổi vai trò Quản lý / Lễ tân"]').click();
    await page.locator('button[title="Xóa quy tắc Auto-Bid"]').last().click();
    await expect(
      page.getByText("Quy tắc Auto-Bid đang cấu hình (2)"),
    ).toBeVisible();

    // 2. Tab 3: Inventory Explorer filters & protection of 100%-paid goodNstay rooms
    await page.getByRole("tab", { name: /Quỹ phòng/ }).click();
    await page
      .getByRole("button", { name: /^goodNstay \(\d+\)$/ })
      .first()
      .click();

    // Click a 100%-paid room cell -> footer shows "Đã khóa đơn TT 100%" (no manual unlock button!)
    const paidRoomCell = page.locator("button", { hasText: /#1\d{2}/ }).first();
    await expect(paidRoomCell).toBeVisible();
    await paidRoomCell.click();
    await expect(page.getByText("Đã khóa đơn TT 100%")).toBeVisible();

    monitor.assertZeroErrors();
  });
});
