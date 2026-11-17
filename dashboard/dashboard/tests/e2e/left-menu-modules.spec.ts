import { test, expect } from "@playwright/test";
import {
  attachErrorMonitor,
  gotoFreshSeedDashboard,
  resetSeedViaApi,
} from "../helpers/e2e-helpers";

test.describe("TC-LEFT: Complete Left-Sidebar Business Modules E2E & Live Master-Data Sync", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-LEFT-01 & TC-LEFT-02: Booking Calendar (Tape Chart + Block/Unblock Persistence) & Payout Reconciliation (Statements + Early Payout + Bank Edit)", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // --- 1. Booking Calendar (Lịch đặt phòng) ---
    await page.getByTestId("nav-item-calendar").click();
    await expect(page.getByTestId("module-calendar-view")).toBeVisible();

    // Switch window 7d -> 14d -> 7d
    await page.getByTestId("calendar-window-select").selectOption("extended14d");
    await page.getByTestId("calendar-window-select").selectOption("current7d");

    // Click booked cell (#116 on 2026-11-06 -> Booking #71) -> opens Reservation Slip modal
    await page.getByTestId("tape-booked-116-2026-11-06").click();
    const bookingDialog = page.getByRole("dialog");
    await expect(bookingDialog).toBeVisible();
    await expect(bookingDialog).toContainText("#71");
    await page.keyboard.press("Escape");
    await expect(bookingDialog).toBeHidden();

    // Click free cell (#101 on 2026-11-09) -> Block room date & verify persistence in roomInventory
    await page.getByTestId("tape-free-101-2026-11-09").click();
    await expect(page.getByTestId("calendar-block-dialog")).toBeVisible();
    await page
      .getByTestId("calendar-block-reason-input")
      .fill("Khách đoàn VIP giữ phòng tại quầy");
    await page.getByTestId("calendar-block-confirm-btn").click();
    await expect(page.getByTestId("tape-blocked-101-2026-11-09")).toBeVisible();

    const apiAfterBlock = await (await request.get("/api/master-data")).json();
    expect(
      apiAfterBlock.bundle.roomInventory.calendarBlocks.some(
        (b: { roomNumber: number; startDate: string }) =>
          b.roomNumber === 101 && b.startDate === "2026-11-09",
      ),
    ).toBe(true);

    // Reopen blocked room date -> returns to free state
    await page.getByTestId("tape-blocked-101-2026-11-09").click();
    await expect(page.getByTestId("calendar-block-dialog")).toBeVisible();
    await page.getByTestId("calendar-unblock-confirm-btn").click();
    await expect(page.getByTestId("tape-free-101-2026-11-09")).toBeVisible();

    // --- 2. Payout Reconciliation (Đối soát doanh thu) ---
    await page.getByTestId("nav-item-payout").click();
    await expect(page.getByTestId("module-payout-view")).toBeVisible();
    await expect(page.getByTestId("payout-kpi-total")).toContainText("+66,4tr ₫");
    await expect(page.getByTestId("bank-card-br_mykhe")).toContainText("Vietcombank");

    // Open itemized Statement Modal for STL-MK-11B (#71, #70, #67)
    await page.getByTestId("statement-btn-STL-MK-11B").click();
    const stmtDialog = page.getByTestId("payout-statement-dialog");
    await expect(stmtDialog).toBeVisible();
    await expect(stmtDialog).toContainText("#71");
    await expect(stmtDialog).toContainText("5.600.000 ₫");
    await page.keyboard.press("Escape");
    await expect(stmtDialog).toBeHidden();

    // Trigger Early Payout on upcoming batch STL-MK-11B -> transitions to processing
    await page.getByTestId("early-payout-btn-STL-MK-11B").click();
    await expect(page.getByTestId("early-payout-btn-STL-MK-11B")).toBeHidden();

    // Edit Bank Account for br_mykhe -> persists to payoutLedgers
    await page.getByTestId("edit-bank-btn-br_mykhe").click();
    await expect(page.getByTestId("payout-bank-dialog")).toBeVisible();
    await page.getByTestId("bank-account-input").fill("0041 0008 99999");
    await page.getByTestId("save-bank-btn").click();
    await expect(page.getByTestId("bank-card-br_mykhe")).toContainText("0041 0008 99999");

    const apiAfterPayout = await (await request.get("/api/master-data")).json();
    const mkBank = apiAfterPayout.bundle.payoutLedgers.bankAccounts.find(
      (b: { propertyId: string }) => b.propertyId === "br_mykhe",
    );
    expect(mkBank.accountNumber).toBe("0041 0008 99999");

    // Stay Hotel H11 shows verified Shinhan Bank & clean zero-batch message
    await page.getByTestId("topbar-property-select").selectOption("stay_h11");
    await expect(page.getByTestId("bank-card-stay_h11")).toContainText("Shinhan Bank");
    await expect(page.getByTestId("payout-batches-empty")).toBeVisible();
    await page.getByTestId("topbar-property-select").selectOption("all");

    monitor.assertZeroErrors();
  });

  test("TC-LEFT-03 & TC-LEFT-04: Rooms Management (Floor Rates + Housekeeping) & Bidding Management (Live Offer Dispatch + AutoBid Rules)", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // --- 3. Rooms Management (Quản lý phòng) ---
    await page.getByTestId("nav-item-rooms").click();
    await expect(page.getByTestId("module-rooms-view")).toBeVisible();

    // Filter dirty rooms -> mark room #101 clean/ready
    await page.getByTestId("rooms-filter-dirty").click();
    await expect(page.getByTestId("room-unit-card-101")).toBeVisible();
    await page.getByTestId("unit-mark-ready-101").click();
    await expect(page.getByTestId("room-unit-card-101")).toBeHidden();
    await page.getByTestId("rooms-filter-all").click();

    // Update safe floor rate on RT-MK-DLX -> persists to roomInventory
    await page.getByTestId("edit-rate-btn-RT-MK-DLX").click();
    await expect(page.getByTestId("room-rate-dialog")).toBeVisible();
    await page.getByTestId("room-floor-rate-input").fill("980000");
    await page.getByTestId("save-room-rate-btn").click();
    await expect(page.getByTestId("rooms-categories-section")).toContainText("980.000 ₫");

    const apiAfterRoom = await (await request.get("/api/master-data")).json();
    const updatedUnit101 = apiAfterRoom.bundle.roomInventory.units.find(
      (u: { roomNumber: number }) => u.roomNumber === 101,
    );
    expect(updatedUnit101.status).toBe("ready");

    // --- 4. Bidding Management (Quản lý báo giá) ---
    await page.getByTestId("nav-item-bidding").click();
    await expect(page.getByTestId("module-bidding-view")).toBeVisible();

    // Send manual competitive offer on live request REQ-9018
    await page.getByTestId("send-offer-btn-REQ-9018").click();
    await expect(page.getByTestId("bidding-offer-dialog")).toBeVisible();
    await page.getByTestId("offer-rate-input").fill("1040000");
    await page.getByTestId("confirm-send-offer-btn").click();
    await expect(page.getByTestId("send-offer-btn-REQ-9018")).toBeHidden();

    // Pass on live request REQ-9017
    await page.getByTestId("pass-req-btn-REQ-9017").click();
    await expect(page.getByTestId("pass-req-btn-REQ-9017")).toBeHidden();

    // Edit AutoBid guardrail for br_mykhe & toggle switch -> persists to biddingOperations & hubConfig
    await page.getByTestId("edit-rule-btn-br_mykhe").click();
    await expect(page.getByTestId("autobid-rule-dialog")).toBeVisible();
    await page.getByTestId("rule-floor-input").fill("810000");
    await page.getByTestId("save-rule-btn").click();
    await expect(page.getByTestId("autobid-rule-card-br_mykhe")).toContainText("810.000 ₫");

    await page.getByTestId("autobid-switch-br_mykhe").click();
    const apiAfterBid = await (await request.get("/api/master-data")).json();
    const req9018 = apiAfterBid.bundle.biddingOperations.liveRequests.find(
      (r: { id: string }) => r.id === "REQ-9018",
    );
    expect(req9018.status).toBe("offer_sent");
    expect(req9018.submittedRatePerNightVnd).toBe(1_040_000);

    // Stay Hotel H11 shows waiting traveler requests ready to capture its first booking
    await page.getByTestId("topbar-property-select").selectOption("stay_h11");
    await expect(page.getByTestId("autobid-rule-card-stay_h11")).toBeVisible();
    await page.getByTestId("topbar-property-select").selectOption("all");

    monitor.assertZeroErrors();
  });

  test("TC-LEFT-05 & TC-LEFT-06: Guest Messages (2-Pane Inbox + Quick Reply) & Marketing Submenu (Last-Minute Deals + Room Upsell Creation)", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // --- 5. Guest Messages (Tin nhắn khách hàng) ---
    await page.getByTestId("nav-item-messages").click();
    await expect(page.getByTestId("module-messages-view")).toBeVisible();

    await page.getByTestId("thread-item-MSG-01").click();
    await expect(page.getByTestId("active-thread-messages")).toContainText("7 chỗ");

    // Open linked reservation slip #71 right from the chat header
    await page.getByTestId("msg-open-booking-btn").click();
    const slipDialog = page.getByRole("dialog");
    await expect(slipDialog).toBeVisible();
    await expect(slipDialog).toContainText("#71");
    await page.keyboard.press("Escape");
    await expect(slipDialog).toBeHidden();

    // Insert 1-click Front-Desk Quick Reply (QR-PARKING) & send reply -> persists to hubInbox
    await page.getByTestId("quick-reply-QR-PARKING").click();
    await expect(page.getByTestId("message-reply-input")).not.toHaveValue("");
    await page.getByTestId("message-send-reply-btn").click();
    await expect(page.getByTestId("active-thread-messages")).toContainText("24/7");

    const apiAfterMsg = await (await request.get("/api/master-data")).json();
    const msg01 = apiAfterMsg.bundle.hubInbox.messages.find(
      (m: { id: string }) => m.id === "MSG-01",
    );
    expect(msg01.unread).toBe(false);
    expect(msg01.status).toBe("replied");
    expect(msg01.thread.length).toBeGreaterThanOrEqual(2);

    // Stay Hotel H11 shows clean empty inbox state
    await page.getByTestId("topbar-property-select").selectOption("stay_h11");
    await expect(page.getByTestId("messages-empty-state")).toBeVisible();
    await page.getByTestId("topbar-property-select").selectOption("all");

    // --- 6. Marketing Submenu (Ưu đãi giờ chót & Gói nâng hạng phòng) ---
    await page.getByTestId("nav-item-marketing").click();
    await page.getByTestId("nav-sub-deals").click();
    await expect(page.getByTestId("module-marketing-view")).toBeVisible();
    await expect(page.getByTestId("mkt-deals-grid")).toBeVisible();

    // Create a new Last-Minute Flash Deal -> persists to marketingCampaigns
    await page.getByTestId("open-create-deal-btn").click();
    await expect(page.getByTestId("create-deal-dialog")).toBeVisible();
    await page
      .getByTestId("deal-title-input")
      .fill("Ưu đãi Đêm Mưa Biển Mỹ Khê (-20%)");
    await page.getByTestId("deal-discount-input").fill("20");
    await page.getByTestId("confirm-create-deal-btn").click();
    await expect(page.getByTestId("mkt-deals-grid")).toContainText(
      "Ưu đãi Đêm Mưa Biển Mỹ Khê (-20%)",
    );

    // Navigate via sidebar submenu to Room Upsell Offers & create a new Upsell package
    await page.getByTestId("nav-sub-upsell").click();
    await expect(page.getByTestId("mkt-upsell-grid")).toBeVisible();
    await page.getByTestId("open-create-upsell-btn").click();
    await expect(page.getByTestId("create-upsell-dialog")).toBeVisible();
    await page
      .getByTestId("upsell-title-input")
      .fill("Đón sân bay riêng Xe SUV 7 chỗ");
    await page.getByTestId("upsell-price-input").fill("320000");
    await page.getByTestId("confirm-create-upsell-btn").click();
    await expect(page.getByTestId("mkt-upsell-grid")).toContainText(
      "Đón sân bay riêng Xe SUV 7 chỗ",
    );

    const apiAfterMkt = await (await request.get("/api/master-data")).json();
    expect(apiAfterMkt.bundle.marketingCampaigns.flashDeals.length).toBeGreaterThanOrEqual(5);
    expect(apiAfterMkt.bundle.marketingCampaigns.upsellOffers.length).toBeGreaterThanOrEqual(6);

    monitor.assertZeroErrors();
  });

  test("TC-LEFT-07 & TC-LEFT-08: Shift Role RBAC (Manager vs Receptionist), Sign-Out/Sign-In Flow & Multi-Locale/Currency Across Modules", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page);
    await gotoFreshSeedDashboard(page, request);

    // --- 7. Shift Handover RBAC & Logout ---
    await page.getByTestId("nav-item-logout").click();
    await expect(page.getByTestId("session-handover-dialog")).toBeVisible();
    await page.getByTestId("switch-role-receptionist").click();
    await expect(page.getByTestId("topbar-user-avatar")).toHaveText("TH");

    // Receptionist cannot edit Payout Bank Account -> shows polite role notice toast instead
    await page.getByTestId("nav-item-payout").click();
    await page.getByTestId("edit-bank-btn-br_mykhe").click();
    await expect(page.getByTestId("payout-bank-dialog")).toBeHidden();
    await expect(page.getByTestId("hub-toast-banner")).toBeVisible();
    await page.getByTestId("hub-toast-close").click();

    // Receptionist cannot edit Room Safe Floor Rate -> shows polite role notice toast
    await page.getByTestId("nav-item-rooms").click();
    await page.getByTestId("edit-rate-btn-RT-MK-DLX").click();
    await expect(page.getByTestId("room-rate-dialog")).toBeHidden();
    await expect(page.getByTestId("hub-toast-banner")).toBeVisible();

    // Switch back to Manager & test full Sign Out -> Lock Screen -> Sign Back In
    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("switch-role-manager").click();
    await expect(page.getByTestId("topbar-user-avatar")).toHaveText("BM");

    await page.getByTestId("nav-item-logout").click();
    await page.getByTestId("session-signout-btn").click();
    await expect(page.getByTestId("signed-out-screen")).toBeVisible();
    await page.getByTestId("sign-back-in-btn").click();
    await expect(page.getByTestId("module-rooms-view")).toBeVisible();

    // --- 8. Multi-Locale (English + KRW, Korean + USD) across left-menu modules ---
    await page.getByTestId("topbar-language-select").selectOption("en");
    await page.getByTestId("topbar-currency-select").selectOption("KRW");

    await page.getByTestId("nav-item-payout").click();
    await expect(page.getByTestId("payout-kpi-total")).toContainText("₩");
    const payoutEnText = await page.getByTestId("module-payout-view").innerText();
    expect(payoutEnText).toContain("Payout & Revenue Reconciliation");
    expect(payoutEnText).not.toContain("Đối soát doanh thu");

    await page.getByTestId("topbar-language-select").selectOption("ko");
    await page.getByTestId("topbar-currency-select").selectOption("USD");
    await page.getByTestId("nav-item-bidding").click();
    const biddingKoText = await page.getByTestId("module-bidding-view").innerText();
    expect(biddingKoText).toContain("$");
    expect(biddingKoText).not.toContain("Quản lý báo giá");

    monitor.assertZeroErrors();
  });
});
