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
    await expect(page.getByText("Thực nhận ròng (30 ngày)")).toBeVisible();
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

    // Session Log sub-filters work accurately on 30d (including empty state for Tự đóng (0))
    await page.getByRole("button", { name: /Đã TT 100% \(29\)/ }).click();
    await expect(page.locator("tbody tr")).toHaveCount(29);
    await page.getByRole("button", { name: /Tự đóng \(0\)/ }).click();
    await expect(
      page.getByText(/Không có phiên nào thuộc trạng thái này/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Xem tất cả (68)" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(68);

    // Open ADR modal on 30d
    await page.getByText("ADR bình quân (30 ngày)").click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByText(
        "ADR Bình Quân & Đơn Đã Thanh Toán (30 ngày • 08/10 – 06/11/2026)",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Chi Tiết 29 Đơn Đã Khóa Phòng/i),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // --- SWITCH TO 7 DAYS (31/10 – 06/11/2026) ---
    await page.getByRole("button", { name: "7 ngày", exact: true }).click();
    await expect(page.getByText("Thực nhận ròng (7 ngày)")).toBeVisible();
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
        "ADR Bình Quân & Đơn Đã Thanh Toán (7 ngày • 31/10 – 06/11/2026)",
      ),
    ).toBeVisible();
    await expect(
      dialog.getByText(/Chi Tiết 13 Đơn Đã Khóa Phòng/i),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // --- SWITCH TO TODAY (06/11/2026) ---
    await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
    await expect(page.getByText("Thực nhận ròng (Hôm nay)")).toBeVisible();
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
        "ADR Bình Quân & Đơn Đã Thanh Toán (Hôm nay • 06/11/2026)",
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
        name: /Quỹ phòng hôm nay \(06\/11\).*6 phòng trống/,
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
        "Quản Lý Mở Khóa / Khóa Phòng — Ngày 06/11/2026 (Hôm nay)",
      ),
    ).toBeVisible();

    await dialog.getByRole("button", { name: /10\/11/ }).click();
    await expect(
      dialog.getByText(
        "Quản Lý Mở Khóa / Khóa Phòng — Ngày 10/11/2026 (Thứ 3)",
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
        "Quản Lý Mở Khóa / Khóa Phòng — Ngày 10/11/2026 (Thứ 3)",
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
        "Lịch 30 Phòng Theo Từng Ngày — Đang chọn: 10/11/2026 (Thứ 3)",
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
        name: /Quỹ phòng hôm nay \(06\/11\).*6 phòng trống/,
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
        "Quản Lý Mở Khóa / Khóa Phòng — Ngày 09/11/2026 (Thứ 2)",
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
        name: /Quỹ phòng hôm nay \(06\/11\).*6 phòng trống/,
      }),
    ).toBeVisible();

    // Formula drawer toggle
    await page.getByRole("button", { name: "Công thức" }).click();
    await expect(
      page.getByText("1. Thực nhận ròng & ADR (0% phí KS)"),
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
        name: /Quỹ phòng hôm nay \(06\/11\).*6 phòng trống/,
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
        name: /8\. Xác thực NHN KCP & Thu 100% Khóa Phòng Tức Thì/,
      })
      .click();
    await expect(page.getByText("#CRQ-8932 (")).toBeVisible();

    // Click Slice #8 again -> collapses detail panel cleanly
    await page
      .getByRole("button", {
        name: /8\. Xác thực NHN KCP & Thu 100% Khóa Phòng Tức Thì/,
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
});
