import { test, expect } from "@playwright/test";
import { attachErrorMonitor, resetSeedViaApi } from "../helpers/e2e-helpers";

test.describe("TC-API: Master Data REST API, Persistence, Validation & Static Fallback", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-API-01..05: GET /api/master-data, PUT persistence, 400 validation errors & POST /reset", async ({
    request,
  }) => {
    await resetSeedViaApi(request);

    // TC-API-01: GET /api/master-data returns full 12-table bundle
    const getRes = await request.get("/api/master-data");
    expect(getRes.status()).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.ok).toBe(true);
    expect(getJson.source).toBe("live-master-api");
    expect(typeof getJson.syncedAt).toBe("string");

    const requiredTables = [
      "hotelProfile",
      "usersRoles",
      "perksCatalog",
      "roomClasses",
      "roomsPms",
      "calendar14dPms",
      "systemBenchmarks",
      "auctionSessions",
      "matchBreakdowns",
      "lossAutopsies",
      "botRules",
      "lifecycleCatalog",
    ];
    for (const key of requiredTables) {
      expect(getJson.bundle).toHaveProperty(key);
    }
    const seedBotRulesCount = getJson.bundle.botRules.length;

    // TC-API-02: PUT /api/master-data/botRules persists new rule to disk
    const updatedRules = [
      ...getJson.bundle.botRules,
      {
        ruleId: "RULE-API-TEST",
        title: "Quy tắc kiểm thử tự động REST API",
        active: true,
        createdAt: "06/11/2026",
        sourceCaseId: "CRQ-8924",
      },
    ];
    const putRes = await request.put("/api/master-data/botRules", {
      data: { data: updatedRules },
    });
    expect(putRes.status()).toBe(200);
    const putJson = await putRes.json();
    expect(putJson.ok).toBe(true);
    expect(putJson.table).toBe("botRules");

    const verifyGet = await (await request.get("/api/master-data")).json();
    expect(verifyGet.bundle.botRules).toHaveLength(seedBotRulesCount + 1);
    expect(
      verifyGet.bundle.botRules.some(
        (r: { ruleId: string }) => r.ruleId === "RULE-API-TEST",
      ),
    ).toBe(true);

    // TC-API-03: Unknown table key returns HTTP 400
    const badTableRes = await request.put("/api/master-data/unknownTableXyz", {
      data: { data: [] },
    });
    expect(badTableRes.status()).toBe(400);
    const badTableJson = await badTableRes.json();
    expect(badTableJson.ok).toBe(false);

    // TC-API-04: Invalid JSON body returns HTTP 400
    const malformedRes = await request.fetch("/api/master-data/botRules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: "{broken-json-payload",
    });
    expect(malformedRes.status()).toBe(400);

    // TC-API-05: POST /api/master-data/reset restores exact seed state
    await resetSeedViaApi(request);
    const afterReset = await (await request.get("/api/master-data")).json();
    expect(afterReset.bundle.botRules).toHaveLength(seedBotRulesCount);
    expect(
      afterReset.bundle.botRules.some(
        (r: { ruleId: string }) => r.ruleId === "RULE-API-TEST",
      ),
    ).toBe(false);
  });

  test("TC-API-06..07: Static /master-data/*.json endpoint & localStorage fallback when REST API is unreachable", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page, { ignoreNetAbort: true });
    await resetSeedViaApi(request);

    // TC-API-06: Static JSON endpoint serves hotel_profile.json accurately
    const staticRes = await request.get("/master-data/hotel_profile.json");
    expect(staticRes.status()).toBe(200);
    const hp = await staticRes.json();
    expect(hp.guestPriceMultiplier).toBe(1.265);
    expect(hp.totalRooms).toBe(30);

    // TC-API-07: Abort /api/master-data -> app seamlessly falls back to static /master-data/*.json + localStorage
    await page.route("**/api/master-data**", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();
    await expect(page.getByText("Doanh thu (30 ngày)")).toBeVisible();

    // Toggle Night Flash Sale while offline -> persists to localStorage fallback key
    const flashSwitch = page
      .locator("div", { hasText: /Xả đêm 20:00/ })
      .locator('button[role="switch"]')
      .first();
    const initialChecked = await flashSwitch.getAttribute("aria-checked");
    await flashSwitch.click();
    await expect(flashSwitch).toHaveAttribute(
      "aria-checked",
      initialChecked === "true" ? "false" : "true",
    );

    const cachedProfile = await page.evaluate(() =>
      localStorage.getItem("gns_master_v28_hotelProfile"),
    );
    expect(cachedProfile).not.toBeNull();

    await page.unroute("**/api/master-data**");
    await page.evaluate(() => localStorage.clear());
    monitor.assertZeroErrors();
  });
});
