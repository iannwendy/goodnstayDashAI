import http from "node:http";
import { test, expect } from "@playwright/test";
import { attachErrorMonitor, resetSeedViaApi } from "../helpers/e2e-helpers";

function httpGetWithHost(
  pathName: string,
  hostHeader: string,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: 5182,
        path: pathName,
        method: "GET",
        headers: { Host: hostHeader, Accept: "*/*" },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

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

  test("TC-API-06..07: Static /master-data/*.json endpoint & localStorage UI fallback when REST API is unreachable", async ({
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

    // TC-API-07: Abort /api/master-data -> Partner Hub Overview seamlessly loads from static /master-data/*.json + persists UI prefs
    await page.route("**/api/master-data**", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();
    await expect(page.getByTestId("section-revenue-timeline")).toBeVisible();

    await page.getByTestId("topbar-currency-select").selectOption("KRW");
    await expect(page.getByTestId("kpi-card-revenue")).toContainText("₩");

    const cachedPrefs = await page.evaluate(() =>
      localStorage.getItem("gns_partner_hub_prefs_v1"),
    );
    expect(cachedPrefs).not.toBeNull();
    expect(cachedPrefs).toContain("KRW");

    await page.unroute("**/api/master-data**");
    await page.evaluate(() => localStorage.clear());
    monitor.assertZeroErrors();
  });

  test("TC-API-08: Allowed tunnel Host headers (.ts.net & .trycloudflare.com) serve FE & BE without 403 block", async () => {
    for (const tunnelHost of [
      "bao-minh-nguyens-macbook-pro-m4-pro.tail6930d7.ts.net",
      "demo-quick-tunnel.trycloudflare.com",
    ]) {
      const feRes = await httpGetWithHost("/", tunnelHost);
      expect(feRes.statusCode).toBe(200);
      expect(feRes.body).toContain('<div id="root"></div>');

      const beRes = await httpGetWithHost("/api/master-data", tunnelHost);
      expect(beRes.statusCode).toBe(200);
      const parsed = JSON.parse(beRes.body);
      expect(parsed.ok).toBe(true);
      expect(parsed.source).toBe("live-master-api");
    }
  });
});
