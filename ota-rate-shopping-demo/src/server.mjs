import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMatchedRoomComparisonGroups,
  normalizeRawOtaRoom,
} from "./goodnstayMapper.mjs";
import {
  buildMultiPlatformReferenceDataset,
  runFullScrapeAndCompare,
} from "./liveScraper.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 4180);

const dataFilePath = path.resolve(__dirname, "../data/latest_comparison_report.json");
const publicDir = path.resolve(__dirname, "../public");

function loadOrInitReport() {
  if (fs.existsSync(dataFilePath)) {
    return JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
  }
  const normalizedRooms = buildMultiPlatformReferenceDataset([]);
  const comparisonGroups = buildMatchedRoomComparisonGroups(normalizedRooms, {
    rateBucket: "BB_NON_REFUNDABLE",
    priceBasis: "GROSS",
  });
  return {
    generatedAt: new Date().toISOString(),
    liveAgodaScrapeStatus: {
      success: false,
      scrapedAt: null,
      masterRoomCountFromLiveAgoda: 0,
      liveOffersExtractedCount: 0,
    },
    totalNormalizedRoomOffers: normalizedRooms.length,
    matchedCanonicalGroupsCount: comparisonGroups.length,
    comparisonGroups,
    allNormalizedRooms: normalizedRooms,
    rawLiveAgodaRooms: [],
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // API 1: Lấy dữ liệu báo cáo + lọc trực tiếp theo 6 tầng Filter
  if (url.pathname === "/api/report" && req.method === "GET") {
    const report = loadOrInitReport();
    const roomType = url.searchParams.get("roomType") || "ALL";
    const detailedBedCategory = url.searchParams.get("detailedBedCategory") || "ALL";
    const multiBedMode = url.searchParams.get("multiBedMode") || "ALL";
    const viewCategory = url.searchParams.get("viewCategory") || "ALL";
    const priceBasis = url.searchParams.get("priceBasis") || "GROSS";

    const filteredGroups = buildMatchedRoomComparisonGroups(
      report.allNormalizedRooms,
      {
        roomType,
        detailedBedCategory,
        multiBedMode,
        viewCategory,
        rateBucket: "BB_NON_REFUNDABLE",
        priceBasis,
      }
    );

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        ...report,
        appliedFilters: {
          roomType,
          detailedBedCategory,
          multiBedMode,
          viewCategory,
          priceBasis,
        },
        matchedCanonicalGroupsCount: filteredGroups.length,
        comparisonGroups: filteredGroups,
      })
    );
    return;
  }

  // API 2: Kích hoạt cào trực tiếp Agoda (Playwright Live Scrape)
  if (url.pathname === "/api/scrape-live" && req.method === "POST") {
    try {
      const freshReport = await runFullScrapeAndCompare();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(freshReport));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 3: Thử nghiệm chuẩn hóa 1 phòng bất kỳ do người dùng nhập để tự động điền 8 trường Form goodNstay
  if (url.pathname === "/api/normalize-custom" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const input = JSON.parse(body || "{}");
        const report = loadOrInitReport();
        const hotelContext = report.allNormalizedRooms.map((r) => ({
          roomName: r.formFields.roomName,
          areaSqm: r.filterMeta.areaSqm || 30,
          basePrice: r.filterMeta.grossPrice,
        }));
        const normalized = normalizeRawOtaRoom(input, hotelContext);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(normalized));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Phục vụ giao diện Demo tĩnh
  const indexHtmlPath = path.join(publicDir, "index.html");
  if (fs.existsSync(indexHtmlPath)) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(indexHtmlPath, "utf8"));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`🚀 goodNstay OTA Rate Shopping & Room Matcher Demo đang chạy tại: http://localhost:${PORT}`);
});
