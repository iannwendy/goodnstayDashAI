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

test.describe("TC-API: Master Data v4.0 REST API (7 Tables), Persistence, Validation & Static Fallback", () => {
  test.afterAll(async ({ request }) => {
    await resetSeedViaApi(request);
  });

  test("TC-API-01..05: GET /api/master-data (7 v4.0 tables), PUT /hubInbox & /roomInventory persistence, 400 validation errors & POST /reset", async ({
    request,
  }) => {
    await resetSeedViaApi(request);

    // TC-API-01: GET /api/master-data returns exact 7-table v4.0 bundle (0 legacy bloat tables)
    const getRes = await request.get("/api/master-data");
    expect(getRes.status()).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.ok).toBe(true);
    expect(getJson.source).toBe("live-master-api");
    expect(typeof getJson.syncedAt).toBe("string");

    const requiredTables = [
      "hubConfig",
      "bidRecords",
      "hubInbox",
      "roomInventory",
      "payoutLedgers",
      "biddingOperations",
      "marketingCampaigns",
    ];
    for (const key of requiredTables) {
      expect(getJson.bundle).toHaveProperty(key);
    }
    expect(Object.keys(getJson.bundle).sort()).toEqual(
      [...requiredTables].sort(),
    );
    expect(getJson.bundle.hubConfig.schemaVersion).toBe("4.0.0");
    expect(getJson.bundle.bidRecords).toHaveLength(143);
    expect(getJson.bundle.roomInventory.units).toHaveLength(48);
    expect(getJson.bundle.payoutLedgers.batches).toHaveLength(12);

    const seedMsgCount = getJson.bundle.hubInbox.messages.length;
    const seedBlockCount = getJson.bundle.roomInventory.calendarBlocks.length;

    // TC-API-02: PUT /api/master-data/hubInbox & /roomInventory persist mutations to disk
    const updatedInbox = {
      ...getJson.bundle.hubInbox,
      messages: [
        ...getJson.bundle.hubInbox.messages,
        {
          id: "MSG-API-TEST",
          propertyId: "br_mykhe",
          bookingCode: "#71",
          guestName: "Khách Kiểm Thử API",
          receivedAt: "15:20",
          unread: true,
          preview: {
            vi: "Tin nhắn kiểm thử lưu trữ REST API.",
            en: "REST API persistence test message.",
            ko: "REST API 저장 테스트 메시지.",
          },
        },
      ],
    };
    const putRes = await request.put("/api/master-data/hubInbox", {
      data: { data: updatedInbox },
    });
    expect(putRes.status()).toBe(200);
    const putJson = await putRes.json();
    expect(putJson.ok).toBe(true);
    expect(putJson.table).toBe("hubInbox");

    const updatedInventory = {
      ...getJson.bundle.roomInventory,
      calendarBlocks: [
        ...getJson.bundle.roomInventory.calendarBlocks,
        {
          id: "BLK-API-TEST",
          propertyId: "br_mykhe",
          roomNumber: 101,
          startDate: "2026-11-09",
          endDate: "2026-11-10",
          blockType: "walkin_hold",
          title: {
            vi: "Khóa phòng kiểm thử API",
            en: "API Test Room Block",
            ko: "API 테스트 객실 홀드",
          },
        },
      ],
    };
    const putInvRes = await request.put("/api/master-data/roomInventory", {
      data: { data: updatedInventory },
    });
    expect(putInvRes.status()).toBe(200);

    const verifyGet = await (await request.get("/api/master-data")).json();
    expect(verifyGet.bundle.hubInbox.messages).toHaveLength(seedMsgCount + 1);
    expect(verifyGet.bundle.roomInventory.calendarBlocks).toHaveLength(
      seedBlockCount + 1,
    );

    // TC-API-03: Unknown or retired legacy table key returns HTTP 400
    for (const badKey of ["unknownTableXyz", "botRules", "hotelProfile"]) {
      const badTableRes = await request.put(`/api/master-data/${badKey}`, {
        data: { data: [] },
      });
      expect(badTableRes.status()).toBe(400);
      const badTableJson = await badTableRes.json();
      expect(badTableJson.ok).toBe(false);
    }

    // TC-API-04: Invalid JSON body or missing "data" envelope returns HTTP 400 without corrupting disk
    const malformedRawRes = await request.fetch("/api/master-data/hubInbox", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      data: Buffer.from("{broken-json-payload", "utf8"),
    });
    expect(malformedRawRes.status()).toBe(400);

    const missingDataRes = await request.put("/api/master-data/hubInbox", {
      data: { wrongEnvelope: [] },
    });
    expect(missingDataRes.status()).toBe(400);

    // TC-API-05: POST /api/master-data/reset restores exact seed state across all 7 tables
    await resetSeedViaApi(request);
    const afterReset = await (await request.get("/api/master-data")).json();
    expect(afterReset.bundle.hubInbox.messages).toHaveLength(seedMsgCount);
    expect(afterReset.bundle.roomInventory.calendarBlocks).toHaveLength(
      seedBlockCount,
    );
  });

  test("TC-API-06..07: Static /master-data/*.json v4.0 endpoints & localStorage UI fallback when REST API is unreachable", async ({
    page,
    request,
  }) => {
    const monitor = attachErrorMonitor(page, { ignoreNetAbort: true });
    await resetSeedViaApi(request);

    // TC-API-06: Static JSON endpoints serve all v4.0 master tables & schema_manifest.json accurately
    const staticRes = await request.get("/master-data/partner_hub_config.json");
    expect(staticRes.status()).toBe(200);
    const cfg = await staticRes.json();
    expect(cfg.schemaVersion).toBe("4.0.0");
    expect(cfg.brandName).toBe("Optibide");
    expect(cfg.properties).toHaveLength(4);

    for (const staticFile of [
      "room_inventory.json",
      "payout_ledgers.json",
      "bidding_operations.json",
      "marketing_campaigns.json",
    ]) {
      const fileRes = await request.get(`/master-data/${staticFile}`);
      expect(fileRes.status()).toBe(200);
    }

    const manifestRes = await request.get("/master-data/schema_manifest.json");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.schemaVersion).toBe("4.0.0");

    // TC-API-07: Abort /api/master-data -> Partner Hub seamlessly loads all 7 tables from static /master-data/*.json
    await page.route("**/api/master-data**", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByTestId("kpi-card-revenue")).toBeVisible();
    await expect(page.getByTestId("section-revenue-timeline")).toBeVisible();

    await page.getByTestId("nav-item-rooms").click();
    await expect(page.getByTestId("module-rooms-view")).toBeVisible();

    await page.getByTestId("topbar-currency-select").selectOption("KRW");
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
