import { test, expect } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  attachErrorMonitor,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

const VIEWPORT_MATRIX = [
  { name: "Desktop Wide", width: 1440, height: 900, isDesktopHeader: true },
  { name: "Laptop Standard", width: 1280, height: 800, isDesktopHeader: true },
  { name: "Tablet Landscape", width: 1024, height: 768, isDesktopHeader: true },
  { name: "Tablet Portrait", width: 768, height: 1024, isDesktopHeader: false },
  { name: "Mobile iPhone 14", width: 390, height: 844, isDesktopHeader: false },
  { name: "Mobile iPhone SE", width: 375, height: 667, isDesktopHeader: false },
  { name: "Mobile Compact Android", width: 360, height: 800, isDesktopHeader: false },
] as const;

test.describe("TC-RESP: Multi-Viewport Responsive Matrix (7 Viewports × 3 Tabs × Key Modals)", () => {
  test.beforeAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  for (const vp of VIEWPORT_MATRIX) {
    test(`TC-RESP [${vp.name} ${vp.width}×${vp.height}]: zero horizontal overflow, valid control bounding boxes & clean modals`, async ({
      page,
    }) => {
      const monitor = attachErrorMonitor(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();

      // 1. Header breakpoint parity (<1024px uses mobile branch/period bar; >=1024px uses desktop bar)
      if (vp.isDesktopHeader) {
        await expect(page.getByTestId("topbar-branch-select")).toBeVisible();
        await expect(page.getByTestId("mobile-branch-select")).toBeHidden();
      } else {
        await expect(page.getByTestId("mobile-branch-select")).toBeVisible();
        await expect(page.getByTestId("topbar-branch-select")).toBeHidden();
      }

      // 2. Tab 1 (Đấu giá Live): zero overflow & KPI cards fit strictly inside viewport width
      await assertNoHorizontalOverflow(page, `${vp.name} - Tab 1 Workspace`);
      const revBox = await page.getByTestId("kpi-card-revenue").boundingBox();
      expect(revBox).not.toBeNull();
      expect(revBox!.width).toBeGreaterThan(120);
      expect(revBox!.x).toBeGreaterThanOrEqual(0);
      expect(revBox!.x + revBox!.width).toBeLessThanOrEqual(vp.width + 1);

      // 3. Revenue Drilldown Modal fits cleanly inside viewport without horizontal page overflow
      await page.getByTestId("kpi-card-revenue").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await assertNoHorizontalOverflow(page, `${vp.name} - Revenue Modal`);
      const modalBox = await dialog.boundingBox();
      expect(modalBox).not.toBeNull();
      expect(modalBox!.width).toBeLessThanOrEqual(vp.width + 1);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();

      // 4. CustomBidModal fits cleanly inside viewport
      const customBtn = page.getByRole("button", { name: "Tùy chỉnh" }).first();
      if (await customBtn.isVisible()) {
        const btnBox = await customBtn.boundingBox();
        expect(btnBox).not.toBeNull();
        expect(btnBox!.height).toBeGreaterThanOrEqual(24);
        await customBtn.click();
        await expect(dialog).toBeVisible();
        await assertNoHorizontalOverflow(page, `${vp.name} - CustomBidModal`);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
      }

      // 5. Tab 2 (Hiệu suất & Thị phần): Benchmarks, Pareto & Loss Autopsy have zero overflow
      await page.getByRole("tab", { name: /Hiệu suất & Thị phần/ }).click();
      await assertNoHorizontalOverflow(page, `${vp.name} - Tab 2 Analytics`);

      // 6. Tab 3 (Quỹ phòng): both 30-room grid & 14-day timeline table stay contained without page overflow
      await page.getByRole("tab", { name: /Quỹ phòng/ }).click();
      await assertNoHorizontalOverflow(
        page,
        `${vp.name} - Tab 3 Inventory Day Grid`,
      );
      await page
        .getByRole("button", { name: "Bảng lịch 14 ngày", exact: true })
        .click();
      await assertNoHorizontalOverflow(
        page,
        `${vp.name} - Tab 3 Inventory 14-Day Matrix`,
      );

      // 7. Tab 4 (Vòng đời & Case): 9-stage lifecycle, multi-entity matrix & 18 cases fit cleanly
      await page.getByRole("tab", { name: /Vòng đời & Case/ }).click();
      await assertNoHorizontalOverflow(
        page,
        `${vp.name} - Tab 4 Full Lifecycle & Cases`,
      );

      monitor.assertZeroErrors();
    });
  }
});
