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
          "[data-testid='btn-toggle-theme']",
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
      .getByText("Công Thức Chuẩn Hóa & Khớp Phòng Đa Sàn")
      .waitFor({ timeout: 3000 });
    await page.getByRole("button", { name: /Thu gọn/i }).click();

    // 2. Chuyển đổi 3 chế độ Giá: Khớp UI Web (Mặt trang) <-> Sau thuế (Gross) <-> Trước thuế (Net)
    // Mặc định mở trang là "Khớp UI Web (Mặt trang)" -> Giá chính cột Agoda là 1.371.998đ, cột Booking là 1.719.200đ
    await page.getByText("1.371.998đ").first().waitFor({ timeout: 3000 });
    await page.getByText("1.719.200đ").first().waitFor({ timeout: 3000 });

    await page.getByTestId("basis-GROSS").click();
    await page.getByText("1.699.905đ").first().waitFor({ timeout: 3000 });

    await page.getByTestId("basis-NET").click();
    await page.getByText("1.488.485đ").first().waitFor({ timeout: 3000 });

    await page.getByTestId("basis-UI_WEB").click();
    await page.getByText("1.371.998đ").first().waitFor({ timeout: 3000 });

    // 3. Test 3 tab chế độ số giường (Tất cả phòng / Phòng 1 Giường / Phòng Nhiều Giường)
    await page.getByTestId("bed-mode-SINGLE_BED_ONLY").click();
    await page.getByText("Deluxe Double Room").first().waitFor({ timeout: 3000 });

    await page.getByTestId("bed-mode-MULTI_BED_ONLY").click();
    await page.getByText("Deluxe Twin Room").first().waitFor({ timeout: 3000 });

    await page.getByTestId("bed-mode-ALL").click();

    // 4. Test các select lọc Hạng phòng, Cấu hình Giường, Hướng nhìn, Diện tích + nút Đặt lại
    await page.getByTestId("filter-room-type").selectOption("Suite");
    await page.getByText("Champa Junior Suite").first().waitFor({ timeout: 3000 });
    await page.getByTestId("filter-bed-category").selectOption("KING_1_BED");
    await page.getByTestId("filter-view-category").selectOption("PARTIAL_SEA_VIEW");
    await page.getByTestId("filter-area-range").selectOption("OVER_50");
    await page.getByTestId("btn-reset-filters").click();
    assert.equal(await page.getByTestId("filter-room-type").inputValue(), "ALL");
    assert.equal(await page.getByTestId("filter-bed-category").inputValue(), "ALL");
    assert.equal(await page.getByTestId("filter-view-category").inputValue(), "ALL");
    assert.equal(await page.getByTestId("filter-area-range").inputValue(), "ALL");

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

    // Chuyển đổi giữa tab Agoda (Live), Booking.com (Live), Expedia (EPS) và Trip.com trong Inspector (đã bỏ nút goodNstay khỏi thanh chọn sàn)
    const bookingSwitchBtn = page.getByRole("button", {
      name: "Booking.com (Live)",
    });
    await bookingSwitchBtn.click();
    assert.match(
      await roomNameInput.inputValue(),
      /Champa Deluxe Double with Partial Sea View/
    );

    const expediaSwitchBtn = page.getByRole("button", {
      name: "Expedia (EPS)",
    });
    await expediaSwitchBtn.click();
    assert.match(await roomNameInput.inputValue(), /Champa Deluxe Double/);

    const tripSwitchBtn = page.getByRole("button", {
      name: "Trip.com",
    });
    await tripSwitchBtn.click();
    assert.match(await roomNameInput.inputValue(), /Champa Deluxe Double/);

    // 6. Bấm mở Modal UPLOAD PHOTOS và đóng lại
    const photoBtn = page.getByRole("button", { name: /UPLOAD PHOTOS/i });
    await photoBtn.click();
    await page
      .getByText(/UPLOAD PHOTOS — Danh sách ảnh phòng trích xuất tự động/)
      .waitFor({ timeout: 3000 });
    await page.keyboard.press("Escape");

    // 7. Chuyển sang Tab "Thuế & Khớp phòng" & Kiểm tra Hợp đồng JSON Mapping (gns-room-matcher-v1) cho cả 6 nền tảng
    await page.getByRole("tab", { name: "Thuế & Khớp phòng" }).click();
    await page
      .getByTestId("json-mapping-contract-panel")
      .waitFor({ timeout: 3000 });

    const jsonCodeEl = page.getByTestId("json-mapping-code");
    await jsonCodeEl.waitFor({ timeout: 3000 });
    const bookingContract = JSON.parse(await jsonCodeEl.innerText());
    assert.equal(bookingContract.ota, "BOOKING_COM");
    assert.equal(bookingContract.externalProperty.propertyId, "14399894");
    assert.equal(bookingContract.matching.status, "VERIFIED");
    assert.equal(bookingContract.matching.method, "HYBRID_RULES_AI");
    assert.equal(bookingContract.matching.modelVersion, "gns-room-matcher-v1");
    assert.equal(
      bookingContract.rateLookup.lookupMethod,
      "PROPERTY_AND_ROOM_ID"
    );

    // Chuyển sang xem JSON Mapping của AGODA
    await page.getByTestId("mapping-ota-AGODA").click();
    const agodaContract = JSON.parse(await jsonCodeEl.innerText());
    assert.equal(agodaContract.ota, "AGODA");
    assert.equal(agodaContract.externalProperty.propertyId, "75836171");
    assert.equal(agodaContract.matching.status, "VERIFIED");

    // Chuyển sang xem JSON Mapping của EXPEDIA
    await page.getByTestId("mapping-ota-EXPEDIA").click();
    const expediaContract = JSON.parse(await jsonCodeEl.innerText());
    assert.equal(expediaContract.ota, "EXPEDIA");
    assert.equal(expediaContract.externalProperty.propertyId, "104829512");
    assert.equal(expediaContract.matching.status, "VERIFIED");
    assert.equal(expediaContract.source.type, "EXTERNAL_CATALOG");
    assert.equal(
      expediaContract.rateLookup.lookupMethod,
      "PROPERTY_AND_ROOM_ID"
    );

    // Chuyển sang xem JSON Mapping của TRIP_COM
    await page.getByTestId("mapping-ota-TRIP_COM").click();
    const tripContract = JSON.parse(await jsonCodeEl.innerText());
    assert.equal(tripContract.ota, "TRIP_COM");
    assert.equal(tripContract.externalProperty.propertyId, "108549210");
    assert.equal(tripContract.matching.status, "VERIFIED");
    assert.equal(tripContract.source.type, "EXTERNAL_CATALOG");
    assert.equal(
      tripContract.rateLookup.lookupMethod,
      "PROPERTY_AND_ROOM_ID"
    );

    // Chuyển sang xem JSON Mapping của HOTELS_COM
    await page.getByTestId("mapping-ota-HOTELS_COM").click();
    const hotelsComContract = JSON.parse(await jsonCodeEl.innerText());
    assert.equal(hotelsComContract.ota, "HOTELS_COM");
    assert.equal(hotelsComContract.externalProperty.propertyId, "ho3354644384");
    assert.equal(
      hotelsComContract.source.type,
      "EXPEDIA_EPS_SHARED_CATALOG"
    );
    assert.equal(
      hotelsComContract.rateLookup.lookupMethod,
      "PROPERTY_AND_ROOM_ID"
    );

    // Chuyển sang xem JSON Mapping của GOOGLE_HOTELS
    await page.getByTestId("mapping-ota-GOOGLE_HOTELS").click();
    const googleHotelsContract = JSON.parse(await jsonCodeEl.innerText());
    assert.equal(googleHotelsContract.ota, "GOOGLE_HOTELS");
    assert.equal(googleHotelsContract.source.type, "METASEARCH_ARI_FEED");
    assert.equal(
      googleHotelsContract.rateLookup.lookupMethod,
      "METASEARCH_RATE_FEED"
    );

    // Bấm nút Sao chép JSON
    await page.getByTestId("btn-copy-json-mapping").click();
    await page.getByText("Đã sao chép").waitFor({ timeout: 3000 });

    // Kiểm tra API endpoint /api/room-mappings trả về đúng JSON Contract cho cả 6 nền tảng
    const apiContracts = await page.evaluate(async () => {
      const r = await fetch(
        "/api/room-mappings?hotelKey=champton-nha-trang&gnsRoomId=GNS-R201&ota=ALL"
      );
      return r.json();
    });
    assert.equal(Array.isArray(apiContracts), true);
    assert.equal(apiContracts.length, 6);
    assert.deepEqual(
      apiContracts.map((c) => c.ota),
      [
        "BOOKING_COM",
        "AGODA",
        "EXPEDIA",
        "TRIP_COM",
        "HOTELS_COM",
        "GOOGLE_HOTELS",
      ]
    );

    // 8. Chuyển sang Tab "Bằng chứng Live" và xác minh chỉ hiển thị danh sách Link phòng trực tiếp gọn nhẹ (đã bỏ khung SHA-256 & 2 ảnh chụp màn hình gây rối mắt)
    await page.getByRole("tab", { name: "Bằng chứng Live" }).click();
    await page
      .getByTestId("selected-room-proof-panel")
      .waitFor({ timeout: 3000 });

    const proofCleanAudit = await page.evaluate(() => ({
      screenshotImgCount: document.querySelectorAll("img[alt*='Screenshot']").length,
      hasSha256Card: document.body.innerText.includes("SHA-256:"),
    }));
    assert.equal(
      proofCleanAudit.screenshotImgCount,
      0,
      "Ảnh chụp màn hình lớn trong tab Bằng chứng Live phải được gỡ bỏ khỏi UI"
    );
    assert.equal(
      proofCleanAudit.hasSha256Card,
      false,
      "Thẻ SHA-256 phải được gỡ bỏ khỏi UI để giao diện tối giản"
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

test("E2E-4: Khi bấm 'Cào Trực Tiếp Ngay', toàn bộ số tiền, KPI và Form 8 trường ẩn đi thay bằng Skeleton Loading, có dữ liệu mới hiện lại", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // Kiểm tra trước khi bấm: Giá tiền thật đang hiển thị và cột Booking.com không bị cắt chữ 'đ'
    const beforeCheck = await page.evaluate(() => {
      const wrapper = document.querySelector(
        "[data-testid='comparison-table-wrapper']"
      );
      const bookingPrices = Array.from(
        document.querySelectorAll("[data-testid='price-value-BOOKING']")
      );
      const wRect = wrapper?.getBoundingClientRect();
      const clipped = bookingPrices.some((el) => {
        const r = el.getBoundingClientRect();
        return !wRect || r.right > wRect.right - 6;
      });
      return {
        bookingPriceCount: bookingPrices.length,
        clipped,
      };
    });
    assert.ok(beforeCheck.bookingPriceCount > 0, "Phải có giá Booking.com hiển thị");
    assert.equal(
      beforeCheck.clipped,
      false,
      "Cột giá Booking.com (LIVE) bị sát lề hoặc lẹm chữ 'đ'"
    );

    // Giữ request POST /api/scrape-live trong 900ms để xác minh trạng thái Skeleton Shimmer trên toàn trang
    let scrapeRouteHit = false;
    await page.route("**/api/scrape-live", async (route) => {
      scrapeRouteHit = true;
      await new Promise((r) => setTimeout(r, 900));
      const reportRes = await page.request.get(
        `${BASE_URL}/api/report?hotelKey=champton-nha-trang&checkIn=2026-11-20`
      );
      const body = await reportRes.text();
      await route.fulfill({
        status: 200,
        contentType: "application/json; charset=utf-8",
        body,
      });
    });

    // Bấm nút "Cào Trực Tiếp Ngay"
    await page.getByTestId("btn-live-scrape").click();

    // Xác minh ngay trong lúc đang cào:
    // 1) Toàn bộ con số giá tiền trong bảng ([data-testid^='price-value-']) ĐÃ ẨN ĐI (count === 0)
    // 2) Các thanh animation loading ([data-testid='price-cell-skeleton'], [data-testid='data-skeleton'], [data-testid='form-field-skeleton']) HIỆN LÊN
    await page.getByTestId("scraping-status-banner").waitFor({ timeout: 2000 });

    const duringScrapeCheck = await page.evaluate(() => ({
      visiblePriceNumbers: document.querySelectorAll(
        "[data-testid^='price-value-']"
      ).length,
      tablePriceSkeletons: document.querySelectorAll(
        "[data-testid='price-cell-skeleton']"
      ).length,
      kpiSkeletons: document.querySelectorAll("[data-testid='data-skeleton']")
        .length,
      inspectorSkeletons: document.querySelectorAll(
        "[data-testid='form-field-skeleton']"
      ).length,
    }));

    assert.equal(
      duringScrapeCheck.visiblePriceNumbers,
      0,
      "Trong lúc đang cào, toàn bộ con số giá tiền cũ phải ẩn đi hoàn toàn"
    );
    assert.ok(
      duringScrapeCheck.tablePriceSkeletons >= 15,
      `Trong lúc đang cào, các ô giá trong bảng phải hiện skeleton loading (thực tế: ${duringScrapeCheck.tablePriceSkeletons})`
    );
    assert.equal(
      duringScrapeCheck.kpiSkeletons,
      3,
      "3 thẻ KPI phía trên phải hiện skeleton loading"
    );
    assert.ok(
      duringScrapeCheck.inspectorSkeletons >= 4,
      "Form 8 trường bên phải phải hiện skeleton loading"
    );

    // Chờ phiên cào hoàn tất -> Toàn bộ skeleton biến mất, dữ liệu thật hiển thị trở lại
    await page
      .locator("[data-testid='price-value-AGODA']")
      .first()
      .waitFor({ timeout: 5000 });

    const afterScrapeCheck = await page.evaluate(() => ({
      visiblePriceNumbers: document.querySelectorAll(
        "[data-testid^='price-value-']"
      ).length,
      tablePriceSkeletons: document.querySelectorAll(
        "[data-testid='price-cell-skeleton']"
      ).length,
    }));

    assert.equal(scrapeRouteHit, true);
    assert.equal(
      afterScrapeCheck.tablePriceSkeletons,
      0,
      "Sau khi có dữ liệu, skeleton loading phải ẩn đi"
    );
    assert.ok(
      afterScrapeCheck.visiblePriceNumbers >= 15,
      "Sau khi có dữ liệu, các con số giá tiền phải hiện lên đầy đủ"
    );
  } finally {
    await browser.close();
  }
});

test("E2E-5: Phân trang Lazy Top-5 (bấm tiếp mới load tiếp) & Deep Link RoomID chính xác tuyệt đối nhảy tới đúng phòng + giá hiển thị trên UI web", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // 1. Trang 1 chỉ hiển thị đúng Top 5 hạng phòng khớp chuẩn nhất (Match 100%)
    const page1Rows = await page.getByTestId("comparison-row").count();
    assert.equal(
      page1Rows,
      5,
      `Trang 1 chỉ được phép hiển thị đúng Top 5 hạng phòng, thực tế: ${page1Rows}`
    );
    await page.getByText(/Hiển thị Top 1–5/).waitFor({ timeout: 3000 });

    // 2. Kiểm tra RoomID đầy đủ (không bị cắt ngắn, không còn bbasic_0) & Deep Link #:~:text= + Giá UI Web
    const deepLinkAudit = await page.evaluate(() => {
      const agodaLinks = Array.from(
        document.querySelectorAll("[data-testid='room-proof-link-AGODA']")
      );
      const bookingLinks = Array.from(
        document.querySelectorAll("[data-testid='room-proof-link-BOOKING']")
      );
      const uiWebPrices = Array.from(
        document.querySelectorAll("[data-testid^='ui-web-price-']")
      );
      return {
        agodaIds: agodaLinks.map((a) => a.textContent?.trim()),
        agodaHrefs: agodaLinks.map((a) => a.getAttribute("href")),
        bookingIds: bookingLinks.map((a) => a.textContent?.trim()),
        bookingHrefs: bookingLinks.map((a) => a.getAttribute("href")),
        uiWebPriceCount: uiWebPrices.length,
      };
    });

    assert.equal(
      deepLinkAudit.agodaIds.length,
      5,
      "Cả 5 phòng Top 1–5 trên Trang 1 đều phải có mã phòng Agoda đầy đủ"
    );
    assert.equal(
      deepLinkAudit.bookingIds.length,
      5,
      "Cả 5 phòng Top 1–5 trên Trang 1 đều phải có mã phòng Booking.com đầy đủ"
    );
    // Đảm bảo mã phòng là số đầy đủ >= 8 chữ số (ví dụ #1188793531, #1439989410, #1439989401), không trùng nhau và không có bbasic_0
    for (const id of [
      ...deepLinkAudit.agodaIds,
      ...deepLinkAudit.bookingIds,
    ]) {
      assert.match(
        id || "",
        /^#\d{8,12}$/,
        `RoomID phải là mã số gốc đầy đủ, phát hiện ID lỗi: ${id}`
      );
    }
    assert.equal(
      new Set(deepLinkAudit.bookingIds).size,
      5,
      `5 hạng phòng trên Booking.com phải có 5 RoomID riêng biệt, thực tế: ${JSON.stringify(deepLinkAudit.bookingIds)}`
    );
    for (const href of [
      ...deepLinkAudit.agodaHrefs,
      ...deepLinkAudit.bookingHrefs,
    ]) {
      assert.match(
        href || "",
        /#:~:text=/,
        `Link bằng chứng phải chứa neo nhảy thẳng tới phòng (#:~:text=): ${href}`
      );
    }
    assert.equal(
      deepLinkAudit.uiWebPriceCount,
      20,
      "Mỗi ô Agoda, Booking, Expedia và Trip.com trong Top 5 (5 dòng x 4 sàn = 20 ô) đều phải hiển thị rõ 'UI Web: ...đ'"
    );

    // 3. Bấm nút "Tiếp Top 5 →" để tải Trang 2 (Top 6–10)
    await page.getByTestId("btn-next-page").click();
    await page.getByText(/Hiển thị Top 6–10/).waitFor({ timeout: 3000 });
    await page.getByText("Champa Deluxe Twin").first().waitFor({ timeout: 3000 });

    // 4. Bấm sang Trang 3 (Top 11–12) rồi quay về Trang 1 (Top 1–5)
    await page.getByTestId("btn-page-3").click();
    await page.getByText(/Hiển thị Top 11–/).waitFor({ timeout: 3000 });
    await page.getByTestId("btn-page-1").click();
    await page.getByText(/Hiển thị Top 1–5/).waitFor({ timeout: 3000 });

    // 5. Kiểm tra khung "Đối chiếu Nhanh Phòng Đang Chọn" + Thời điểm cào chuẩn Giờ VN (GMT+7) trong tab Bằng chứng Live
    await page.getByRole("tab", { name: "Bằng chứng Live" }).click();
    await page.getByTestId("selected-room-proof-panel").waitFor({ timeout: 3000 });
    const agodaJumpHref = await page
      .getByTestId("inspector-deep-jump-AGODA")
      .getAttribute("href");
    const bookingJumpHref = await page
      .getByTestId("inspector-deep-jump-BOOKING")
      .getAttribute("href");
    const expediaJumpHref = await page
      .getByTestId("inspector-deep-jump-EXPEDIA")
      .getAttribute("href");
    const tripJumpHref = await page
      .getByTestId("inspector-deep-jump-TRIP")
      .getAttribute("href");
    assert.match(agodaJumpHref || "", /#:~:text=/);
    assert.match(bookingJumpHref || "", /#:~:text=/);
    assert.match(expediaJumpHref || "", /selectedRoomType=/);
    assert.match(tripJumpHref || "", /roomId=/);

    // Xác minh Thời điểm cào hiển thị đúng định dạng Giờ Việt Nam (GMT+7), KHÔNG hiển thị chuỗi UTC (...Z) lệch -7 tiếng
    const scrapedTimeText =
      (await page.getByTestId("scraped-at-vietnam-time").textContent()) || "";
    assert.match(
      scrapedTimeText,
      /\d{2}:\d{2}:\d{2}\s*—\s*\d{2}\/\d{2}\/\d{4}\s*\(Giờ VN GMT\+7\)/,
      `Thời điểm cào phải hiển thị đúng Giờ VN GMT+7, thực tế: ${scrapedTimeText}`
    );
    assert.equal(
      scrapedTimeText.includes("Z"),
      false,
      `Thời điểm cào không được chứa hậu tố UTC 'Z': ${scrapedTimeText}`
    );
  } finally {
    await browser.close();
  }
});

test("E2E-6: Kiểm tra Bộ lọc theo Diện tích (m²), Chuyển đổi Light/Dark Mode và trạng thái 'Sàn chưa cào giá' khi thiếu dữ liệu hoặc lỗi gọi API", async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });

    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // 1. Kiểm tra chuyển đổi Light / Dark Mode bằng nút btn-toggle-theme
    const themeBtn = page.getByTestId("btn-toggle-theme");
    await themeBtn.waitFor({ timeout: 5000 });

    const initialTheme = await page.evaluate(() => ({
      isDarkClass: document.documentElement.classList.contains("dark"),
      dataTheme: document.documentElement.getAttribute("data-theme"),
    }));
    assert.equal(initialTheme.isDarkClass, false);
    assert.equal(initialTheme.dataTheme, "light");

    await themeBtn.click();
    const darkThemeState = await page.evaluate(() => {
      const root = document.documentElement;
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      return {
        isDarkClass: root.classList.contains("dark"),
        dataTheme: root.getAttribute("data-theme"),
        savedStorage: window.localStorage.getItem("gns_ota_theme"),
        bodyBg,
      };
    });
    assert.equal(darkThemeState.isDarkClass, true);
    assert.equal(darkThemeState.dataTheme, "dark");
    assert.equal(darkThemeState.savedStorage, "dark");
    assert.equal(darkThemeState.bodyBg, "rgb(9, 9, 11)");

    // Bấm lại để quay về Light Mode
    await themeBtn.click();
    const lightThemeState = await page.evaluate(() => ({
      isDarkClass: document.documentElement.classList.contains("dark"),
      dataTheme: document.documentElement.getAttribute("data-theme"),
      savedStorage: window.localStorage.getItem("gns_ota_theme"),
    }));
    assert.equal(lightThemeState.isDarkClass, false);
    assert.equal(lightThemeState.dataTheme, "light");
    assert.equal(lightThemeState.savedStorage, "light");

    // 2. Kiểm tra Bộ lọc theo Diện tích (filter-area-range)
    const areaFilter = page.getByTestId("filter-area-range");
    await areaFilter.selectOption("FROM_36_TO_50");
    await page.getByText("Champa Junior Suite").first().waitFor({ timeout: 5000 });

    await areaFilter.selectOption("OVER_50");
    await page.getByText("Terrace Suite").first().waitFor({ timeout: 5000 });

    const over50Areas = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-testid='comparison-row']")).map(
        (r) => r.textContent || ""
      )
    );
    assert.ok(over50Areas.length >= 1);
    for (const rowText of over50Areas) {
      const m = rowText.match(/(\d+)\s*m²/);
      assert.ok(m && Number(m[1]) > 50, `Dòng lọc OVER_50 phải > 50m²: ${rowText}`);
    }

    // Đổi sang Libra Hotel Nha Trang và lọc UNDER_25 (< 25m²)
    await page.getByTestId("select-hotel").selectOption("libra-nha-trang");
    await areaFilter.selectOption("UNDER_25");
    await page
      .getByText("Standard Double Room without Window")
      .first()
      .waitFor({ timeout: 5000 });
    const under25Areas = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-testid='comparison-row']")).map(
        (r) => r.textContent || ""
      )
    );
    assert.ok(under25Areas.length >= 1);
    for (const rowText of under25Areas) {
      const m = rowText.match(/(\d+)\s*m²/);
      assert.ok(m && Number(m[1]) < 25, `Dòng lọc UNDER_25 phải < 25m²: ${rowText}`);
    }

    // Đặt lại bộ lọc và quay về Champton Nha Trang
    await page.getByTestId("btn-reset-filters").click();
    await page.getByTestId("select-hotel").selectOption("champton-nha-trang");
    await page.getByText("Champa Deluxe Double").first().waitFor({ timeout: 5000 });

    // 3. Kiểm tra trạng thái "Sàn chưa cào giá" trên dòng phòng thiếu dữ liệu OTA (Trang 3: Top 11–12)
    await page.getByTestId("btn-page-3").click();
    await page.getByText(/Hiển thị Top 11–/).waitFor({ timeout: 5000 });
    const unscrapedCellsPage3 = await page
      .locator("[data-testid^='ota-unscraped-']")
      .count();
    assert.ok(
      unscrapedCellsPage3 >= 1,
      "Các sàn chưa có dữ liệu cào ở Trang 3 phải hiển thị rõ badge 'Sàn chưa cào giá'"
    );
    const rowBadgeTextPage3 =
      (await page.getByTestId("row-live-ota-badge").first().textContent()) || "";
    assert.match(rowBadgeTextPage3, /Sàn chưa cào giá/);

    // Quay về Trang 1
    await page.getByTestId("btn-page-1").click();
    await page.getByText(/Hiển thị Top 1–5/).waitFor({ timeout: 5000 });

    // 4. Giả lập lỗi gọi API (/api/scrape-live trả về HTTP 500) -> kiểm tra Live # Sàn & KPI & Ma trận hiển thị "Sàn chưa cào giá"
    await page.route("**/api/scrape-live", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated API Failure" }),
      });
    });

    await page.getByTestId("btn-live-scrape").click();

    await page.getByTestId("api-fail-unscraped-banner").waitFor({ timeout: 5000 });
    const liveBadgeTextAfterFail =
      (await page.getByTestId("btn-live-badge").textContent()) || "";
    assert.match(
      liveBadgeTextAfterFail,
      /Live 0 Sàn · Sàn chưa cào giá/,
      `Topbar btn-live-badge phải hiển thị 'Live 0 Sàn · Sàn chưa cào giá' khi lỗi gọi API, thực tế: ${liveBadgeTextAfterFail}`
    );

    const agodaKpiStatus =
      (await page.getByTestId("kpi-status-agoda").textContent()) || "";
    const bookingKpiStatus =
      (await page.getByTestId("kpi-status-booking").textContent()) || "";
    assert.equal(agodaKpiStatus.trim(), "Sàn chưa cào giá");
    assert.equal(bookingKpiStatus.trim(), "Sàn chưa cào giá");

    const unscrapedAgodaCells = await page
      .getByTestId("ota-unscraped-AGODA")
      .count();
    const unscrapedBookingCells = await page
      .getByTestId("ota-unscraped-BOOKING")
      .count();
    assert.equal(unscrapedAgodaCells, 5);
    assert.equal(unscrapedBookingCells, 5);

    await page.unroute("**/api/scrape-live");
  } finally {
    await browser.close();
  }
});

