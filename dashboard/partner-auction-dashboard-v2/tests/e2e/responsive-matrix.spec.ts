import { test, expect } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  attachErrorMonitor,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

const VIEWPORT_MATRIX = [
  { name: "Desktop Wide", width: 1440, height: 900, hasDesktopSidebar: true },
  { name: "Laptop Standard", width: 1280, height: 800, hasDesktopSidebar: true },
  { name: "Tablet Landscape", width: 1024, height: 768, hasDesktopSidebar: true },
  { name: "Tablet Portrait", width: 768, height: 1024, hasDesktopSidebar: false },
  { name: "Mobile iPhone 14", width: 390, height: 844, hasDesktopSidebar: false },
  { name: "Mobile iPhone SE", width: 375, height: 667, hasDesktopSidebar: false },
  { name: "Mobile Compact Android", width: 360, height: 800, hasDesktopSidebar: false },
] as const;

test.describe("TC-RESP: Multi-Viewport Responsive Matrix (7 Viewports × Partner Hub Overview & Modals)", () => {
  test.beforeAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  for (const vp of VIEWPORT_MATRIX) {
    test(`TC-RESP [${vp.name} ${vp.width}×${vp.height}]: zero horizontal overflow, responsive sidebar/drawer & clean modal containment`, async ({
      page,
    }) => {
      const monitor = attachErrorMonitor(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();

      // 1. Sidebar vs Mobile Drawer parity across >=1024px vs <1024px
      if (vp.hasDesktopSidebar) {
        await expect(page.getByTestId("sidebar-nav")).toBeVisible();
        await expect(page.getByTestId("mobile-menu-btn")).toBeHidden();
      } else {
        await expect(page.getByTestId("mobile-menu-btn")).toBeVisible();
        await expect(page.getByTestId("topbar-help-btn")).toBeVisible();
        await expect(page.getByTestId("topbar-notifications-btn")).toBeVisible();

        // Notifications popover fits inside mobile viewport without horizontal overflow
        await page.getByTestId("topbar-notifications-btn").click();
        await expect(page.getByTestId("notifications-popover")).toBeVisible();
        await assertNoHorizontalOverflow(page, `${vp.name} - Notifications Popover`);
        await page.getByTestId("topbar-notifications-btn").click();

        await page.getByTestId("mobile-menu-btn").click();
        const drawer = page.getByTestId("mobile-sidebar-drawer");
        await expect(drawer).toBeVisible();
        const drawerBox = await drawer.boundingBox();
        expect(drawerBox).not.toBeNull();
        expect(drawerBox!.x).toBeLessThanOrEqual(2);
        await assertNoHorizontalOverflow(page, `${vp.name} - Mobile Nav Drawer`);
        await page.keyboard.press("Escape");
        await expect(drawer).toBeHidden();
      }

      // 2. Full page Overview fits strictly inside viewport width with readable Property Selector & KPI bounding box
      await assertNoHorizontalOverflow(page, `${vp.name} - Active Overview`);
      const propBox = await page.getByTestId("topbar-property-select").boundingBox();
      expect(propBox).not.toBeNull();
      expect(propBox!.width).toBeGreaterThanOrEqual(140);

      const revBox = await page.getByTestId("kpi-card-revenue").boundingBox();
      expect(revBox).not.toBeNull();
      expect(revBox!.width).toBeGreaterThan(110);
      expect(revBox!.x).toBeGreaterThanOrEqual(0);
      expect(revBox!.x + revBox!.width).toBeLessThanOrEqual(vp.width + 1);

      // 3. Booking Detail Modal fits strictly inside viewport without overflow
      await page.getByTestId("booking-view-detail-btn").first().click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await assertNoHorizontalOverflow(page, `${vp.name} - BookingDetailModal`);
      const modalBox = await dialog.boundingBox();
      expect(modalBox).not.toBeNull();
      expect(modalBox!.width).toBeLessThanOrEqual(vp.width + 1);
      expect(modalBox!.height).toBeLessThanOrEqual(vp.height + 1);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();

      // 4. Zero-booking Stay Hotel H11 empty state also fits cleanly without overflow
      await page.getByTestId("topbar-property-select").selectOption("stay_h11");
      await expect(page.getByTestId("bookings-empty-state")).toBeVisible();
      await assertNoHorizontalOverflow(page, `${vp.name} - Empty Bookings State`);

      monitor.assertZeroErrors();
    });
  }
});
