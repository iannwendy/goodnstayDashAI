import { test, expect } from "@playwright/test";

test.describe("Auction Session Log — 10-Row Pagination (<1/N>), Search & Sort By", () => {
  test("paginates 10 sessions per page with <1/N> navigation, searches by code/name, and sorts accurately", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/");
    await page.getByRole("tab", { name: /Đấu giá Live/i }).click();
    await page.getByRole("button", { name: "30 ngày", exact: true }).click();

    // Ensure "Tất cả" status tab is selected and read dynamic total count
    const allStatusBtn = page.getByRole("button", { name: /^Tất cả \(\d+\)$/ });
    await allStatusBtn.click();
    const allBtnText = await allStatusBtn.innerText();
    const totalCount = Number(allBtnText.match(/\((\d+)\)/)?.[1] ?? 0);
    expect(totalCount).toBeGreaterThan(20);
    const expectedTotalPages = Math.ceil(totalCount / 10);

    // 1. Default view displays max 10 rows and <1/N> indicator
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(10);

    const pageIndicator = page.getByTestId("history-page-indicator");
    await expect(pageIndicator).toHaveText(`1/${expectedTotalPages}`);

    const prevBtn = page.getByRole("button", { name: "Trang trước" });
    const nextBtn = page.getByRole("button", { name: "Trang sau" });
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    const page1FirstRowText = await rows.first().innerText();
    expect(page1FirstRowText).toContain("#CRQ-8940");

    // 2. Next & Previous navigation (<1/N> -> <2/N> -> <1/N>)
    await nextBtn.click();
    await expect(pageIndicator).toHaveText(`2/${expectedTotalPages}`);
    await expect(rows).toHaveCount(10);
    await expect(prevBtn).toBeEnabled();
    const page2FirstRowText = await rows.first().innerText();
    expect(page2FirstRowText).not.toEqual(page1FirstRowText);

    await prevBtn.click();
    await expect(pageIndicator).toHaveText(`1/${expectedTotalPages}`);
    await expect(prevBtn).toBeDisabled();

    // 3. Sub-filter ("Đã TT 100% (29)") resets to page 1/3 and last page has 9 rows
    await page.getByRole("button", { name: /Đã TT 100% \(29\)/ }).click();
    await expect(pageIndicator).toHaveText("1/3");
    await expect(rows).toHaveCount(10);
    await nextBtn.click();
    await nextBtn.click();
    await expect(pageIndicator).toHaveText("3/3");
    await expect(rows).toHaveCount(9);
    await expect(nextBtn).toBeDisabled();

    // Return to "Tất cả"
    await allStatusBtn.click();
    await expect(pageIndicator).toHaveText(`1/${expectedTotalPages}`);

    // 4. Search by session code, room name, and accent-insensitive Vietnamese text
    const searchInput = page.getByLabel("Tìm kiếm nhật ký phiên đấu giá");
    await searchInput.fill("#CRQ-8940");
    await expect(rows).toHaveCount(1);
    await expect(pageIndicator).toHaveText("1/1");
    await expect(rows.first()).toContainText("#CRQ-8940");

    await searchInput.fill("nghi duong cuoi tuan");
    await expect(rows.first()).toContainText("#CRQ-8940");

    await searchInput.fill("khong_co_phien_nao_xyz_999");
    await expect(
      page.getByText(/Không tìm thấy phiên nào khớp với từ khóa/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Xóa bộ lọc tìm kiếm" }).click();
    await expect(rows).toHaveCount(10);
    await expect(pageIndicator).toHaveText(`1/${expectedTotalPages}`);

    // 5. Sort By verification (price_desc, price_asc, match_desc, oldest, newest)
    const sortSelect = page.getByLabel("Sắp xếp nhật ký phiên đấu giá");

    await sortSelect.selectOption("price_desc");
    const highestPriceRow = await rows.first().innerText();
    await sortSelect.selectOption("price_asc");
    const lowestPriceRow = await rows.first().innerText();
    expect(highestPriceRow).not.toEqual(lowestPriceRow);

    await sortSelect.selectOption("oldest");
    const oldestFirstRow = await rows.first().innerText();
    expect(oldestFirstRow).not.toContain("#CRQ-8940");

    await sortSelect.selectOption("newest");
    await expect(rows.first()).toContainText("#CRQ-8940");

    // Verify intuitive 4-tier semantic color coding on Độ khớp badges
    await expect(
      page.locator("tbody button", { hasText: "96%" }).first(),
    ).toHaveClass(/bg-emerald-50/);
    await expect(
      page.locator("tbody button", { hasText: "94%" }).first(),
    ).toHaveClass(/bg-sky-50/);
    await expect(
      page.locator("tbody button", { hasText: "88%" }).first(),
    ).toHaveClass(/bg-amber-50/);
    await sortSelect.selectOption("match_asc");
    await expect(page.locator("tbody tr td:nth-child(5) button").first()).toHaveClass(
      /bg-rose-50/,
    );
    await sortSelect.selectOption("newest");

    // 6. Mobile viewport (390px) has zero horizontal overflow once ResizeObserver settles
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);

    expect(errors).toEqual([]);
  });
});
