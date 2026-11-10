import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const playwrightPath = path.resolve(
  __dirname,
  "../../../dashboard/partner-auction-dashboard-v2/node_modules/playwright"
);
const { chromium } = require(playwrightPath);

const cachedHeadlessShell = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell"
);

const BASE_URL = process.env.BASE_URL || "http://localhost:4180";

function launchBrowser() {
  return chromium.launch({
    headless: true,
    ...(fs.existsSync(cachedHeadlessShell)
      ? { executablePath: cachedHeadlessShell }
      : {}),
  });
}

/**
 * Kiểm tra 2 hình chữ nhật (BoundingClientRect) có đè lên nhau không
 */
function getIntersectionArea(a, b) {
  const xOverlap = Math.max(
    0,
    Math.min(a.right, b.right) - Math.max(a.left, b.left)
  );
  const yOverlap = Math.max(
    0,
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
  );
  return xOverlap * yOverlap;
}

test("E2E-1: Topbar không bị lấp chữ (0px overlap) và không tràn ngang trên 5 kích thước màn hình", async () => {
  const browser = await launchBrowser();
  try {
    const viewports = [
      { name: "Desktop 1440x900", width: 1440, height: 900 },
      { name: "Laptop 1280x800", width: 1280, height: 800 },
      { name: "Small Laptop 1024x768", width: 1024, height: 768 },
      { name: "Tablet 768x1024", width: 768, height: 1024 },
      { name: "Mobile 390x844", width: 390, height: 844 },
    ];

    const page = await browser.newPage();

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, { waitUntil: "networkidle" });

      // 1. Kiểm tra không tràn thanh cuộn ngang (scrollWidth <= innerWidth)
      const overflowCheck = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      assert.ok(
        overflowCheck.scrollWidth <= overflowCheck.innerWidth,
        `[${vp.name}] Trang bị tràn ngang: scrollWidth=${overflowCheck.scrollWidth} > innerWidth=${overflowCheck.innerWidth}`
      );

      // 2. Đo tọa độ thực tế tất cả phần tử trên Topbar để chứng minh 0px chồng lấn (không bao giờ bị lấp chữ)
      const topbarRects = await page.evaluate(() => {
        const selectors = [
          "[data-testid='select-hotel']",
          "[data-testid='select-checkin']",
          "[data-testid='btn-live-badge']",
          "[data-testid='btn-toggle-formulas']",
          "[data-testid='btn-live-scrape']",
        ];
        return selectors
          .map((sel) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const style = window.getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") {
              return null;
            }
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return null;
            return {
              selector: sel,
              left: rect.left,
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              width: rect.width,
              height: rect.height,
            };
          })
          .filter(Boolean);
      });

      for (let i = 0; i < topbarRects.length; i++) {
        for (let j = i + 1; j < topbarRects.length; j++) {
          const area = getIntersectionArea(topbarRects[i], topbarRects[j]);
          assert.equal(
            area,
            0,
            `[${vp.name}] Phát hiện 2 nút trên Topbar đè lên nhau (${topbarRects[i].selector} và ${topbarRects[j].selector}): diện tích chồng lấn = ${area}px²`
          );
        }
      }

      // 3. Kiểm tra điểm giữa và góc phải của ô chọn Khách sạn (select-hotel) không bị bất kỳ phần tử nào che khuất (hit-test bằng elementFromPoint)
      const selectHitTest = await page.evaluate(() => {
        const sel = document.querySelector("[data-testid='select-hotel']");
        if (!sel) return { ok: false, reason: "Missing select-hotel" };
        const rect = sel.getBoundingClientRect();
        const centerEl = document.elementFromPoint(
          rect.left + rect.width * 0.5,
          rect.top + rect.height * 0.5
        );
        const rightEdgeEl = document.elementFromPoint(
          rect.right - 6,
          rect.top + rect.height * 0.5
        );
        return {
          ok:
            (centerEl === sel || sel.contains(centerEl)) &&
            (rightEdgeEl === sel || sel.contains(rightEdgeEl)),
          centerTag: centerEl?.tagName,
          rightTag: rightEdgeEl?.tagName,
        };
      });
      assert.equal(
        selectHitTest.ok,
        true,
        `[${vp.name}] Ô chọn khách sạn bị phần tử khác đè lên vùng bấm: ${JSON.stringify(selectHitTest)}`
      );
    }
  } finally {
    await browser.close();
  }
});

test("E2E-2: Đổi Khách sạn & Ngày Check-in liên tục nhiều lần (không bị khóa sau lần bấm đầu tiên)", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    const hotelSelect = page.getByTestId("select-hotel");
    const checkinSelect = page.getByTestId("select-checkin");

    // Ban đầu là Champton Nha Trang Hotel
    await assert.doesNotReject(async () => {
      await page
        .getByText(/Ma trận Đối sánh Giá Thực Tế \(Champton Nha Trang Hotel/)
        .waitFor({ timeout: 5000 });
    });

    // Bấm đổi qua lại 4 lần liên tiếp giữa Champton <-> Libra
    for (let round = 1; round <= 2; round++) {
      // Đổi sang Libra Hotel Nha Trang
      await hotelSelect.selectOption("libra-nha-trang");
      await page
        .getByText(/Ma trận Đối sánh Giá Thực Tế \(Libra Hotel Nha Trang/)
        .waitFor({ timeout: 5000 });

      const isDisabledAfterLibra = await hotelSelect.isDisabled();
      assert.equal(
        isDisabledAfterLibra,
        false,
        `Lần ${round}: Dropdown khách sạn không được phép bị khóa sau khi chọn Libra`
      );

      // Đổi ngược về Champton Nha Trang Hotel
      await hotelSelect.selectOption("champton-nha-trang");
      await page
        .getByText(/Ma trận Đối sánh Giá Thực Tế \(Champton Nha Trang Hotel/)
        .waitFor({ timeout: 5000 });

      const isDisabledAfterChampton = await hotelSelect.isDisabled();
      assert.equal(
        isDisabledAfterChampton,
        false,
        `Lần ${round}: Dropdown khách sạn không được phép bị khóa sau khi chọn Champton`
      );
    }

    // Bấm đổi qua lại cả 3 ngày Check-in liên tiếp
    for (const dateVal of ["2026-11-25", "2026-12-05", "2026-11-20"]) {
      await checkinSelect.selectOption(dateVal);
      await page
        .getByText(new RegExp(`Champton Nha Trang Hotel · ${dateVal}`))
        .waitFor({ timeout: 5000 });
      assert.equal(await checkinSelect.isDisabled(), false);
    }

    assert.equal(errors.length, 0, `Có lỗi runtime JS: ${errors.join("; ")}`);
  } finally {
    await browser.close();
  }
});

test("E2E-3: Kiểm tra toàn bộ nút bấm Bộ lọc 6 tầng, Chuyển đổi Gross/Net, Form 8 trường, Modal Ảnh & Tab Bằng chứng Live", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // 1. Nút bật/tắt Công thức trên Topbar
    const formulaBtn = page.getByTestId("btn-toggle-formulas");
    await formulaBtn.click();
    await page
      .getByText("4 Bằng Chứng Cào Thực Tế & Công Thức Chuẩn Hóa Đa Sàn")
      .waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: /Thu gọn/i }).click();

    // 2. Chuyển đổi Giá Sau thuế (Gross) <-> Trước thuế (Net)
    await page.getByRole("button", { name: "Trước thuế (Net)" }).click();
    await page.getByText("1.371.998đ").first().waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: "Sau thuế (Gross)" }).click();
    await page.getByText("1.699.905đ").first().waitFor({ timeout: 3000 });

    // 3. Test 3 tab chế độ số giường (Tất cả phòng / Phòng 1 Giường / Phòng Nhiều Giường)
    await page.getByTestId("bed-mode-SINGLE_BED_ONLY").click();
    await page.getByText("Deluxe Double Room").first().waitFor({ timeout: 3000 });

    await page.getByTestId("bed-mode-MULTI_BED_ONLY").click();
    await page.getByText("Deluxe Twin Room").first().waitFor({ timeout: 3000 });

    await page.getByTestId("bed-mode-ALL").click();

    // 4. Test các select lọc Hạng phòng, Cấu hình Giường, Hướng nhìn + nút Đặt lại
    await page.getByTestId("filter-room-type").selectOption("Suite");
    await page.getByText("Champa Junior Suite").first().waitFor({ timeout: 3000 });
    await page.getByTestId("filter-bed-category").selectOption("KING_1_BED");
    await page.getByTestId("filter-view-category").selectOption("PARTIAL_SEA_VIEW");
    await page.getByTestId("btn-reset-filters").click();
    assert.equal(await page.getByTestId("filter-room-type").inputValue(), "ALL");
    assert.equal(await page.getByTestId("filter-bed-category").inputValue(), "ALL");
    assert.equal(await page.getByTestId("filter-view-category").inputValue(), "ALL");

    // 5. Bấm chọn dòng phòng trên bảng & kiểm tra Form 8 trường goodNstay bên phải
    await page.getByText("Champa Deluxe Double").first().click();
    const roomNameInput = page.locator("input[readonly]").first();
    assert.match(await roomNameInput.inputValue(), /Champa Deluxe Double/);

    // Kiểm tra ô Description * đủ cao (rows=4, min-h-[84px]), không bị cắt chữ / cuộn dọc
    const descMetrics = await page.evaluate(() => {
      const ta = document.querySelector("[data-testid='textarea-description']");
      if (!ta) return null;
      return {
        clientHeight: ta.clientHeight,
        scrollHeight: ta.scrollHeight,
      };
    });
    assert.ok(
      descMetrics &&
        descMetrics.clientHeight >= 80 &&
        descMetrics.scrollHeight <= descMetrics.clientHeight + 2,
      `Ô Description * bị hẹp hoặc bị cắt chữ: ${JSON.stringify(descMetrics)}`
    );

    // Chuyển đổi giữa tab Agoda (Live) và Booking.com (Live) trong Inspector
    const bookingSwitchBtn = page.getByRole("button", {
      name: "Booking.com (Live)",
    });
    await bookingSwitchBtn.click();
    assert.match(
      await roomNameInput.inputValue(),
      /Champa Deluxe Double with Partial Sea View/
    );

    // 6. Bấm mở Modal UPLOAD PHOTOS và đóng lại
    const photoBtn = page.getByRole("button", { name: /UPLOAD PHOTOS/i });
    await photoBtn.click();
    await page
      .getByText(/UPLOAD PHOTOS — Danh sách ảnh phòng trích xuất tự động/)
      .waitFor({ timeout: 3000 });
    await page.keyboard.press("Escape");

    // 7. Chuyển sang Tab "Thuế & Khớp phòng"
    await page.getByRole("tab", { name: "Thuế & Khớp phòng" }).click();
    await page
      .getByText(/Giải thích phân loại/)
      .waitFor({ timeout: 3000 });

    // 8. Chuyển sang Tab "Bằng chứng Live" và xác minh 2 ảnh chụp màn hình thật tải thành công (naturalWidth > 0)
    await page.getByRole("tab", { name: "Bằng chứng Live" }).click();
    await page
      .getByText("Xác thực Phiên Cào Trực Tiếp (Playwright Chromium)")
      .waitFor({ timeout: 3000 });

    const imagesLoaded = await page.evaluate(async () => {
      const imgs = Array.from(
        document.querySelectorAll("img[alt*='Screenshot']")
      );
      if (imgs.length < 2) return { count: imgs.length, allLoaded: false };
      for (const img of imgs) {
        if (!img.complete) {
          await new Promise((res) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          });
        }
      }
      return {
        count: imgs.length,
        widths: imgs.map((i) => i.naturalWidth),
        allLoaded: imgs.every((i) => i.complete && i.naturalWidth > 0),
      };
    });

    assert.equal(
      imagesLoaded.allLoaded,
      true,
      `Ảnh bằng chứng chụp màn hình chưa load được: ${JSON.stringify(imagesLoaded)}`
    );

    assert.equal(
      consoleErrors.length,
      0,
      `Phát hiện lỗi Console/PageError: ${consoleErrors.join("; ")}`
    );
  } finally {
    await browser.close();
  }
});
