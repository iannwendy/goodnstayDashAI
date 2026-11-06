import { test, expect } from "@playwright/test";

test.describe("SelectionBenchmarkLinePanel — Dual-Line Benchmark & Multi-Filters", () => {
  test("renders dual-line chart, switches Win Rate / Base Price modes, and filters accurately without layout overflow", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");

    // Ensure we are on Tab 1 (Đấu giá Live) and 30d period
    await page.getByRole("tab", { name: /Đấu giá Live/i }).click();
    await page.getByRole("button", { name: "30 ngày", exact: true }).click();

    // 1. Verify Dual-Line Chart Title & Default Unfiltered Summary
    await expect(
      page.getByRole("heading", {
        name: "Tỷ lệ được chọn: KS của bạn vs. TB toàn sàn",
      }),
    ).toBeVisible();

    const roomSelect = page.getByLabel("Lọc hạng phòng");
    const priceSelect = page.getByLabel("Lọc mức giá");
    const modeSelect = page.getByLabel("Lọc phương thức báo giá");
    const slotSelect = page.getByLabel("Lọc khung giờ");

    await expect(roomSelect).toBeVisible();
    await expect(priceSelect).toBeVisible();
    await expect(modeSelect).toBeVisible();
    await expect(slotSelect).toBeVisible();

    await expect(page.getByText("Của bạn (Toàn khách sạn)")).toBeVisible();

    // Verify Recharts SVG lines are rendered inside the panel
    const chartLines = page.locator(".recharts-line-curve");
    await expect(chartLines.first()).toBeVisible();
    expect(await chartLines.count()).toBeGreaterThanOrEqual(2);

    // 2. Filter by Room Class: Superior
    await roomSelect.selectOption("sup");
    await expect(page.getByText("Của bạn (Hạng Superior)")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Đặt lại \(1\)/ }),
    ).toBeVisible();

    // 3. Combine with Price Filter: Competitive (<= TB sàn)
    await priceSelect.selectOption("competitive");
    await expect(
      page.getByRole("button", { name: /Đặt lại \(2\)/ }),
    ).toBeVisible();

    // 4. Switch Metric Mode to Base Price (VNĐ)
    await page.getByRole("button", { name: "Giá chào (VNĐ)" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Giá gốc chào TB: KS của bạn vs. TB toàn sàn",
      }),
    ).toBeVisible();

    // Switch back to Win Rate (%) and reset filters
    await page.getByRole("button", { name: "Tỷ lệ chọn (%)" }).click();
    await page.getByRole("button", { name: /Đặt lại \(2\)/ }).click();
    await expect(page.getByText("Của bạn (Toàn khách sạn)")).toBeVisible();

    // 5. Test Bid Mode & Time Slot filters
    await modeSelect.selectOption("auto");
    await slotSelect.selectOption("evening_peak");
    await expect(
      page.getByRole("button", { name: /Đặt lại \(2\)/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Đặt lại \(2\)/ }).click();

    // 6. Test narrow zero-session empty state on "Hôm nay"
    await page.getByRole("button", { name: "Hôm nay", exact: true }).click();
    await roomSelect.selectOption("fsuite");
    await priceSelect.selectOption("above_market");
    await expect(
      page.getByText(/Chưa có phiên báo giá khớp tổ hợp bộ lọc này/),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Xóa bộ lọc để xem toàn bộ" })
      .click();

    // Restore 30d default view
    await page.getByRole("button", { name: "30 ngày", exact: true }).click();

    // 7. Responsive check on 390px mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(mobileOverflow).toBe(false);

    expect(errors).toEqual([]);
  });
});
