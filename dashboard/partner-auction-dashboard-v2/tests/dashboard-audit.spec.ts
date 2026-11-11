import { test, expect } from "@playwright/test";

test.describe("goodNstay Partner Auction Dashboard v2 — Full Logic & UI Audit", () => {
  test("1. Period switcher updates KPIs, ADR modal, Chart B, Session Log, Benchmarks & Pareto", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Reset" }).click();

    // --- DEFAULT AFTER RESET: 30 DAYS (08/10 – 06/11/2026) ---
    await expect(page.getByText("Doanh thu (30 ngày)")).toBeVisible();
    await expect(page.getByText("ADR bình quân (30 ngày)")).toBeVisible();
    const adr30dText = await page
      .getByRole("button", { name: /ADR bình quân \(30 ngày\)/ })
      .innerText();
    expect(adr30dText).toContain("08/10 – 06/11/2026");

    await expect(
      page.getByText("30 ngày (08/10 – 06/11/2026)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Nhật ký phiên đấu giá (30 ngày: 08/10 – 06/11/2026)",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tất cả (68)" }),
    ).toBeVisible();

    // Session Log shows max 10 rows per page with <1/7> pagination, search & sort by
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await expect(page.getByTestId("history-page-indicator")).toHaveText("1/7");
    await expect(
      page.getByRole("button", { name: "Trang trước" }),
    ).toBeDisabled();

    // Navigate next & prev across pages
    await page.getByRole("button", { name: "Trang sau" }).click();
    await expect(page.getByTestId("history-page-indicator")).toHaveText("2/7");
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await page.getByRole("button", { name: "Trang trước" }).click();
    await expect(page.getByTestId("history-page-indicator")).toHaveText("1/7");

    // Sub-filters reset to page 1 and paginate accurately (29 won -> 3 pages: 10 + 10 + 9)
    await page.getByRole("button", { name: /Đã TT 100% \(29\)/ }).click();
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await expect(page.getByTestId("history-page-indicator")).toHaveText("1/3");
    await page.getByRole("button", { name: "Trang sau" }).click();
    await page.getByRole("button", { name: "Trang sau" }).click();
    await expect(page.getByTestId("history-page-indicator")).toHaveText("3/3");
    await expect(page.locator("tbody tr")).toHaveCount(9);
    await expect(
      page.getByRole("button", { name: "Trang sau" }),
    ).toBeDisabled();

    await page.getByRole("button", { name: /Tự đóng \(0\)/ }).click();
    await expect(
      page.getByText(/Không có phiên nào thuộc trạng thái này/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Xem tất cả (68)" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(10);
    await expect(page.getByTestId("history-page-indicator")).toHaveText("1/7");

    // Search by code / Vietnamese keyword (accent-insensitive) & clear
    const searchInput = page.getByLabel("Tìm kiếm nhật ký phiên đấu giá");
    await searchInput.fill("CRQ-8940");
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByTestId("history-page-indicator")).toHaveText("1/1");
    await searchInput.fill("nghi duong cuoi tuan");
    await expect(page.locator("tbody tr").first()).toContainText("#CRQ-8940");
    await page.getByRole("button", { name: "Xóa từ khóa tìm kiếm" }).click();
    await expect(page.getByTestId("history-page-indicator")).toHaveText("1/7");

    // Sort by highest match score & reset back to newest
    const sortSelect = page.getByLabel("Sắp xếp nhật ký phiên đấu giá");
    await sortSelect.selectOption("match_desc");
    const firstMatchScoreText = await page
      .locator("tbody tr")
      .first()
      .innerText();
    expect(firstMatchScoreText).toContain("%");
    await sortSelect.selectOption("newest");
    await expect(page.locator("tbody tr").first()).toContainText("#CRQ-8940");

    // Open ADR modal on 30d
    await page.getByText("ADR bình quân (30 ngày)").click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "Giá Bình Quân Đêm (ADR) & Đơn Đã Thanh Toán (30 ngày • 08/10 – 06/11/2026)",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Chi Tiết 29 Đơn Đã Khóa Phòng/i),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // --- SWITCH TO 7 DAYS (31/10 – 06/11/2026) ---
    await page.getByRole("button", { name: "7 ngày", exact: true }).click();
    await expect(page.getByText("Doanh thu (7 ngày)")).toBeVisible();
    await expect(page.getByText("ADR bình quân (7 ngày)")).toBeVisible();
    const adr7dText = await page
      .getByRole("button", { name: /ADR bình quân \(7 ngày\)/ })
      .innerText();
    expect(adr7dText).toContain("31/10 – 06/11/2026");
    expect(adr7dText).not.toEqual(adr30dText);

    await expect(
      page.getByText("7 ngày (31/10 – 06/11/2026)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tất cả (28)" }),
    ).toBeVisible();

    await page.getByText("ADR bình quân (7 ngày)").click();
    await expect(
      dialog.getByText(
        "Giá Bình Quân Đêm (ADR) & Đơn Đã Thanh Toán (7 ngày • 31/10 – 06/11/2026)",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Chi Tiết 13 Đơn Đã Khóa Phòng/i),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // --- SWITCH TO TODAY (06/11/2026) ---
    await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
    await expect(page.getByText("Doanh thu (Hôm nay)")).toBeVisible();
    await expect(page.getByText("ADR bình quân (Hôm nay)")).toBeVisible();
    const adrTodayText = await page
      .getByRole("button", { name: /ADR bình quân \(Hôm nay\)/ })
      .innerText();
    expect(adrTodayText).toContain("06/11/2026");
    expect(adrTodayText).not.toEqual(adr7dText);

    await expect(
      page.getByText("Theo khung giờ hôm nay (06/11/2026)", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Nhật ký phiên đấu giá (Hôm nay: 06/11/2026)",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tất cả (9)" }),
    ).toBeVisible();

    await page.getByText("ADR bình quân (Hôm nay)").click();
    await expect(
      dialog.getByText(
        "Giá Bình Quân Đêm (ADR) & Đơn Đã Thanh Toán (Hôm nay • 06/11/2026)",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Chi Tiết 5 Đơn Đã Khóa Phòng/i),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Tab 2 Benchmarks & Pareto sync with period switcher
    await page.getByRole("tab", { name: /Hiệu suất & Thị phần/ }).click();
    await expect(
      page.getByRole("heading", {
        name: "Nguyên nhân không chốt được phiên (Hôm nay: 06/11/2026)",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Tổng 4 phiên trượt/)).toBeVisible();

    await page.getByRole("button", { name: "30 ngày", exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "Nguyên nhân không chốt được phiên (30 ngày: 08/10 – 06/11/2026)",
      }),
    ).toBeVisible();
    await expect(page.getByText(/Tổng 39 phiên trượt/)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("2. Selected schedule date persists across modal hide/reopen, tab switch, reload & Room Class lock/unlock", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.getByRole("button", { name: "Reset" }).click();

    // Initially on 06/11 (Hôm nay): 6 phòng trống, 24/30 đã khóa
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng hôm nay \(06\/11\).*5 phòng trống/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "24/30 đã khóa", exact: true }),
    ).toBeVisible();

    // Open KPI Card #4 modal -> select 10/11 (Thứ 3: 14 phòng trống, 16/30 đã khóa)
    await page.getByText("Quỹ phòng hôm nay (06/11)").click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "Quản Lý Mở Khóa / Khóa Phòng (Tất cả chi nhánh) — Ngày 06/11/2026 (Hôm nay)",
      ),
    ).toBeVisible();

    await dialog.getByRole("button", { name: /10\/11/ }).click();
    await expect(
      dialog.getByText(
        "Quản Lý Mở Khóa / Khóa Phòng (Tất cả chi nhánh) — Ngày 10/11/2026 (Thứ 3)",
      ),
    ).toBeVisible();

    // Close modal -> KPI Card #4 and Tab 3 badge MUST show 10/11 (14 trống, 16/30 đã khóa)
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng 10\/11 \(Thứ 3\).*14 phòng trống/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "16/30 đã khóa", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /Quỹ phòng \(14 trống · 10\/11\)/ }),
    ).toBeVisible();

    // Reopen modal -> MUST reopen on 10/11 (NOT hardcoded 06/11!)
    await page.getByText("Quỹ phòng 10/11 (Thứ 3)").click();
    await expect(
      dialog.getByText(
        "Quản Lý Mở Khóa / Khóa Phòng (Tất cả chi nhánh) — Ngày 10/11/2026 (Thứ 3)",
      ),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Click '16/30 đã khóa' -> rooms_occupied modal ALSO opens on 10/11!
    await page
      .getByRole("button", { name: "16/30 đã khóa", exact: true })
      .click();
    await expect(
      dialog.getByText(
        "Lịch 30 Phòng (Tất cả chi nhánh) — Đang chọn: 10/11/2026 (Thứ 3)",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Ngày 10\/11\/2026 \(Thứ 3\) — Lấp đầy 53%/),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Reload page -> 10/11 STILL persists!
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng 10\/11 \(Thứ 3\).*14 phòng trống/,
      }),
    ).toBeVisible();

    // Switch to Tab 3 -> Room Class cards show 10/11, NO '##' double-hash bug, and Lock/Unlock mutates 10/11!
    await page.getByRole("tab", { name: /Quỹ phòng/ }).click();
    await expect(
      page.getByText(/Đang xem: Ngày 10\/11\/2026 \(Thứ 3\)/),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("##101");
    await expect(page.getByText(/Superior · #101–#110 ·/)).toBeVisible();

    // Lock 1 Superior room on 10/11 -> drops from 14 trống to 13 trống!
    await page
      .getByRole("button", { name: "Khóa 1 phòng" })
      .first()
      .click();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng 10\/11 \(Thứ 3\).*13 phòng trống/,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "17/30 đã khóa", exact: true }),
    ).toBeVisible();

    // Unlock 1 Superior room on 10/11 -> restores to 14 trống!
    await page
      .getByRole("button", { name: "Mở khóa 1" })
      .first()
      .click();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng 10\/11 \(Thứ 3\).*14 phòng trống/,
      }),
    ).toBeVisible();

    // Switch Explorer to 14-day matrix -> verify zero horizontal page overflow
    await page
      .getByRole("button", { name: "Bảng lịch 14 ngày", exact: true })
      .click();
    const overflow14d = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow14d).toBe(false);

    // Click 'Về 06/11' -> returns cleanly to 06/11 (6 phòng trống)
    await page
      .getByRole("button", { name: "Về 06/11", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng hôm nay \(06\/11\).*5 phòng trống/,
      }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("3. Live session stay-date link, floor guardrail, Pay-to-Lock, Bot rules & responsive layout", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.getByRole("button", { name: "Reset" }).click();

    // Click Live Session #CRQ-8943 (09/11 – 11/11) room availability -> opens schedule on 09/11!
    await page
      .getByRole("button", { name: "Còn 5 phòng trống mở khóa" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "Quản Lý Mở Khóa / Khóa Phòng (Tất cả chi nhánh) — Ngày 09/11/2026 (Thứ 2)",
      ),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // KPI Card #4 now shows 09/11 -> click 'Về 06/11' to return to today without opening modal
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng 09\/11 \(Thứ 2\).*13 phòng trống/,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Về 06/11", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng hôm nay \(06\/11\).*5 phòng trống/,
      }),
    ).toBeVisible();

    // Formula drawer toggle
    await page.getByRole("button", { name: "Công thức" }).click();
    await expect(
      page.getByText("1. Doanh thu & Giá bình quân đêm (ADR)"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thu gọn" }).click();

    // Switch to Receptionist role -> test Floor Guardrail in CustomBidModal
    await page.getByRole("button", { name: "MQ Quản lý" }).click();
    await expect(
      page.getByRole("button", { name: "TV Lễ tân" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Khớp 92%" }).click();
    await expect(
      dialog.getByText("Điểm Khớp Yêu Cầu (AI Match %)"),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Đóng", exact: true }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Tùy chỉnh" }).first().click();
    await expect(
      dialog.getByText("Gửi Báo Giá 1 Lần (One-Shot) & Đặc Quyền"),
    ).toBeVisible();

    const priceInput = dialog.locator('input[type="number"]');
    await priceInput.fill("500000");
    const submitCustomBtn = dialog.getByRole("button", {
      name: /Gửi báo giá 1 lần/i,
    });
    await expect(submitCustomBtn).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Switch back to Manager role
    await page.getByRole("button", { name: "TV Lễ tân" }).click();
    await expect(
      page.getByRole("button", { name: "MQ Quản lý" }),
    ).toBeVisible();

    // Pay-to-Lock flow: Quick Bid on Executive (#CRQ-8942, 07/11–09/11) -> Guest Pays 100% -> Revenue & Orders increase
    await page.getByRole("button", { name: /Gửi 1\.98M/ }).click();
    await expect(page.getByText("+2 chờ TT")).toBeVisible();
    await page
      .getByRole("button", { name: /Khách TT 100% · Khóa phòng/ })
      .first()
      .click();
    await expect(page.getByText("30 đơn TT 100%")).toBeVisible();

    // Tab 2 Bot Rule creation
    await page.getByRole("tab", { name: /Hiệu suất & Thị phần/ }).click();
    await page
      .getByRole("button", { name: /Lưu quy tắc Auto-Bid/ })
      .click();
    await expect(
      page.getByText(/Quy tắc Auto-Bid đang cấu hình \(3\)/),
    ).toBeVisible();

    // Mobile viewport check (390px) -> zero horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(mobileOverflow).toBe(false);

    // Restore desktop viewport & Reset clean seed state
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("29 đơn TT 100%")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng hôm nay \(06\/11\).*5 phòng trống/,
      }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("4. Visual Trapezoid Payment Conversion Funnel on main page & modal (click-to-inspect slices, mobile responsive)", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Reset" }).click();

    // Switch to 7 days -> Main page shows Phễu Chuyển Đổi Thanh Toán: 46.4% directly!
    await page.getByRole("button", { name: "7 ngày", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Phễu Chuyển Đổi Thanh Toán: 46.4%" }),
    ).toBeVisible();

    // Initially uncluttered (detail card hidden until user clicks a funnel slice)
    await expect(
      page.getByText("Phiên rơi rụng trước Bước 6 (5)"),
    ).toBeHidden();

    // Click Slice #6 ("6. Thắng đối thủ") on the main-page funnel -> detail panel opens!
    await page
      .getByRole("button", {
        name: /6\. Thắng đối đầu Giá & Tốc độ trước 2–3 Đối thủ/,
      })
      .click();
    await expect(
      page.getByText("Phiên rơi rụng trước Bước 6 (5)"),
    ).toBeVisible();

    // Click Slice #8 ("8. TT 100% · Khóa phòng") -> switches detail panel to Step 8 (#CRQ-8932)
    await page
      .getByRole("button", {
        name: /8\. Hoàn tất Thanh toán 100% & Khóa Phòng Tức Thì/,
      })
      .click();
    await expect(page.getByText("#CRQ-8932 (")).toBeVisible();

    // Click Slice #8 again -> collapses detail panel cleanly
    await page
      .getByRole("button", {
        name: /8\. Hoàn tất Thanh toán 100% & Khóa Phòng Tức Thì/,
      })
      .click();
    await expect(page.getByText("#CRQ-8932 (")).toBeHidden();

    // Also open KPI Card #3 modal -> clean trapezoid funnel works in modal too
    await page.getByText("Tỷ lệ được chọn", { exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Phễu Chuyển Đổi Thanh Toán: 46.4%"),
    ).toBeVisible();

    await dialog.getByRole("button", { name: /AI Auto-Bid \(14\)/ }).click();
    await expect(dialog.getByText("64.3%").first()).toBeVisible();

    await dialog.getByRole("button", { name: /Duyệt tay \(14\)/ }).click();
    await expect(dialog.getByText("28.6%").first()).toBeVisible();

    await dialog.getByRole("button", { name: /Tổng phễu \(28\)/ }).click();

    // Mobile viewport (390x844) -> zero horizontal overflow on both modal and main page
    await page.setViewportSize({ width: 390, height: 844 });
    const modalMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(modalMobileOverflow).toBe(false);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    const pageMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(pageMobileOverflow).toBe(false);

    // Restore desktop viewport & clean seed
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole("button", { name: "Reset" }).click();

    expect(errors).toEqual([]);
  });

  test("5. Simple Revenue Modal (Day/Week/Month · All Rooms / Per Room / Per Branch) & Topbar Branch Sync with Zero Medical/KCP", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Reset" }).click();

    // Verify main DOM has zero medical / KCP / NHK references
    const mainText = (await page.locator("body").innerText()).toLowerCase();
    expect(mainText).not.toContain("y tế");
    expect(mainText).not.toContain("kcp");
    expect(mainText).not.toContain("nhk");

    // Open KPI Card #1 (Simple Revenue modal)
    await page.getByTestId("kpi-card-revenue").click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText("Doanh Thu Khách Sạn (08/10 – 06/11/2026)"),
    ).toBeVisible();
    await expect(dialog.getByTestId("revenue-modal-primary-total")).toContainText(
      "66.360.000đ",
    );

    // Verify modal DOM has zero medical / KCP / NHK / Khách TT sàn reconciliation text
    const modalText30d = (await dialog.innerText()).toLowerCase();
    expect(modalText30d).not.toContain("y tế");
    expect(modalText30d).not.toContain("kcp");
    expect(modalText30d).not.toContain("nhk");
    expect(modalText30d).not.toContain("khách tt sàn");

    // Switch time period inside Revenue modal: Theo tháng -> Theo tuần -> Theo ngày
    await dialog
      .getByTestId("revenue-time-tabs")
      .getByRole("button", { name: "Theo tuần" })
      .click();
    await expect(
      dialog.getByText("Doanh Thu Khách Sạn (31/10 – 06/11/2026)"),
    ).toBeVisible();
    await expect(dialog.getByTestId("revenue-modal-primary-total")).toContainText(
      "29.380.000đ",
    );

    await dialog
      .getByTestId("revenue-time-tabs")
      .getByRole("button", { name: "Theo ngày" })
      .click();
    await expect(
      dialog.getByText("Doanh Thu Khách Sạn (06/11/2026)"),
    ).toBeVisible();
    await expect(dialog.getByTestId("revenue-modal-primary-total")).toContainText(
      "11.850.000đ",
    );

    // Switch back to Theo tháng (30d) for full multi-room & multi-branch breakdown
    await dialog
      .getByTestId("revenue-time-tabs")
      .getByRole("button", { name: "Theo tháng" })
      .click();

    // Switch Scope -> Từng chi nhánh
    await dialog
      .getByTestId("revenue-scope-tabs")
      .getByRole("button", { name: "Từng chi nhánh" })
      .click();
    await expect(dialog.getByText("CN Mỹ Khê").first()).toBeVisible();
    await expect(dialog.getByText("CN Sông Hàn").first()).toBeVisible();
    await expect(dialog.getByText("CN An Thượng").first()).toBeVisible();

    // Select Branch "CN Mỹ Khê" inside modal -> synchronizes with Topbar selector!
    await dialog
      .getByTestId("revenue-branch-tabs")
      .getByRole("button", { name: "CN Mỹ Khê" })
      .click();
    await expect(page.getByTestId("topbar-branch-select")).toHaveValue(
      "br_mykhe",
    );

    // Switch Scope -> Từng phòng & select single room #116
    await dialog
      .getByTestId("revenue-scope-tabs")
      .getByRole("button", { name: "Từng phòng" })
      .click();
    await dialog.getByTestId("revenue-room-select").selectOption("116");
    await expect(dialog.getByText(/Phòng #116/).first()).toBeVisible();

    // Mobile viewport check inside Revenue modal -> zero horizontal overflow
    await page.setViewportSize({ width: 390, height: 844 });
    const modalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(modalOverflow).toBe(false);

    // Close modal & reset back to clean seed
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId("topbar-branch-select").selectOption("all");
    await page.getByRole("button", { name: "Reset" }).click();

    expect(errors).toEqual([]);
  });

  test("6. 10-Minute Movie-Seat Payment Hold (#130), Overlapping Standby Conflict (#CRQ-8942), Manual Override Guard, Hold Release & Tab 4 Full Lifecycle Matrix", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Reset" }).click();

    // 1. Seed state: #CRQ-8944 holds Room #130 in 10m payment_hold; in CN Mỹ Khê (#130 is last suite), #CRQ-8942 is in Standby!
    await expect(page.getByTestId("hold-banner-CRQ-8944")).toBeVisible();
    await expect(page.getByTestId("hold-banner-CRQ-8944")).toContainText("#130");

    await page.getByTestId("topbar-branch-select").selectOption("br_mykhe");
    await expect(page.getByTestId("standby-banner-CRQ-8942")).toBeVisible();
    await expect(page.getByTestId("standby-banner-CRQ-8942")).toContainText(
      "#CRQ-8944",
    );
    await page.getByTestId("topbar-branch-select").selectOption("all");

    // 2. Tab 3 Inventory: Filter "Tạm khóa 10p (1)" -> Room #130 cannot be manually unlocked/overridden while held
    await page.getByRole("tab", { name: /Quỹ phòng/ }).click();
    await page
      .getByRole("button", { name: "Tạm khóa 10p (1)", exact: true })
      .click();
    const heldRoomCell = page.locator("button", { hasText: "#130" }).first();
    await expect(heldRoomCell).toBeVisible();
    await heldRoomCell.click();
    await expect(page.getByText(/Đang giữ ghế 10p/)).toBeVisible();
    await page.getByRole("button", { name: /^Tất cả \(30\)$/ }).click();

    // 3. Return to Tab 1 -> Release 10m hold on #CRQ-8944 -> Room #130 returns to vacant_unlocked (6 phòng trống) & #CRQ-8942 unblocks in CN Mỹ Khê!
    await page.getByRole("tab", { name: /Đấu giá Live/ }).click();
    await page.getByTestId("btn-release-hold-CRQ-8944").click();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng hôm nay \(06\/11\).*6 phòng trống/,
      }),
    ).toBeVisible();
    await page.getByTestId("topbar-branch-select").selectOption("br_mykhe");
    await expect(page.getByTestId("standby-banner-CRQ-8942")).toBeHidden();
    await page.getByTestId("topbar-branch-select").selectOption("all");

    // Session Log filter "Lỗi TT / 10p" records the released session with REJ_HOLD_EXPIRED_10M
    await page.getByRole("button", { name: /^Lỗi TT \/ 10p \(\d+\)$/ }).click();
    await expect(page.locator("tbody").first()).toContainText("#CRQ-8944");
    await expect(page.locator("tbody").first()).toContainText(
      "REJ_HOLD_EXPIRED_10M",
    );

    // 4. Tab 4 (Vòng đời & Case): 9 lifecycle stages, multi-entity states, reject catalog & 18 cases render & filter cleanly
    await page.getByRole("tab", { name: /Vòng đời & Case/ }).click();
    await expect(page.getByTestId("lifecycle-explorer-root")).toBeVisible();
    await expect(page.getByText(/CASE-01/).first()).toBeVisible();
    await expect(
      page.getByText(/Ma Trận Đầy Đủ 18 Kịch Bản Nghiệp Vụ/),
    ).toBeVisible();

    // Reset back to clean seed state
    await page.getByRole("button", { name: "Reset" }).click();
    await page.getByRole("tab", { name: /Đấu giá Live/ }).click();
    await expect(
      page.getByRole("button", {
        name: /Quỹ phòng hôm nay \(06\/11\).*5 phòng trống/,
      }),
    ).toBeVisible();

    expect(errors).toEqual([]);
  });
});
