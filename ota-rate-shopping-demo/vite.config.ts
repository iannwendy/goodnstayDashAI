import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import {
  buildMatchedRoomComparisonGroups,
  normalizeRawOtaRoom,
} from "./src/goodnstayMapper.mjs";
import {
  buildMultiPlatformReferenceDataset,
  runFullScrapeAndCompare,
} from "./src/liveScraper.mjs";

const DATA_FILE = fileURLToPath(
  new URL("./data/latest_comparison_report.json", import.meta.url)
);
const REPORTS_DIR = fileURLToPath(
  new URL("./data/reports", import.meta.url)
);
const EVIDENCE_DIR = fileURLToPath(
  new URL("./data/evidence", import.meta.url)
);

function loadOrInitReport(requestedHotelKey?: string, requestedCheckIn?: string) {
  if (requestedHotelKey && requestedCheckIn) {
    const exactPath = path.join(
      REPORTS_DIR,
      `report_${requestedHotelKey}_${requestedCheckIn}.json`
    );
    if (fs.existsSync(exactPath)) {
      return JSON.parse(fs.readFileSync(exactPath, "utf-8"));
    }
  }
  if (requestedHotelKey) {
    const fallbackHotelPath = path.join(
      REPORTS_DIR,
      `report_${requestedHotelKey}_2026-11-20.json`
    );
    if (fs.existsSync(fallbackHotelPath)) {
      const parsed = JSON.parse(fs.readFileSync(fallbackHotelPath, "utf-8"));
      return {
        ...parsed,
        checkIn: requestedCheckIn || parsed.checkIn,
      };
    }
  }
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  }
  const normalizedRooms = buildMultiPlatformReferenceDataset();
  const comparisonGroups = buildMatchedRoomComparisonGroups(normalizedRooms, {
    rateBucket: "BB_NON_REFUNDABLE",
    priceBasis: "GROSS",
  });
  return {
    generatedAt: new Date().toISOString(),
    hotelKey: "champton-nha-trang",
    hotelName: "Champton Nha Trang Hotel",
    checkIn: "2026-11-20",
    checkOut: "2026-11-21",
    liveScrapeProof: null,
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
  };
}

function otaRateShoppingApiPlugin(): Plugin {
  return {
    name: "ota-rate-shopping-api",
    configureServer(server) {
      // Phục vụ ảnh chụp màn hình bằng chứng cào thực tế
      server.middlewares.use("/api/evidence", (req, res, next) => {
        const rel = decodeURIComponent((req.url || "/").split("?")[0]).replace(
          /^\/+/,
          ""
        );
        const fullPath = path.resolve(EVIDENCE_DIR, rel);
        if (
          fullPath.startsWith(EVIDENCE_DIR) &&
          fs.existsSync(fullPath) &&
          fs.statSync(fullPath).isFile()
        ) {
          res.setHeader("Content-Type", "image/png");
          res.statusCode = 200;
          res.end(fs.readFileSync(fullPath));
          return;
        }
        next();
      });

      server.middlewares.use("/api/report", (req, res) => {
        const url = new URL(req.url || "/", "http://localhost:4180");
        const requestedHotelKey = url.searchParams.get("hotelKey") || undefined;
        const requestedCheckIn = url.searchParams.get("checkIn") || undefined;
        const report = loadOrInitReport(requestedHotelKey, requestedCheckIn);
        const roomType = url.searchParams.get("roomType") || "ALL";
        const detailedBedCategory =
          url.searchParams.get("detailedBedCategory") || "ALL";
        const multiBedMode = url.searchParams.get("multiBedMode") || "ALL";
        const viewCategory = url.searchParams.get("viewCategory") || "ALL";
        const priceBasis = (url.searchParams.get("priceBasis") || "GROSS") as
          | "GROSS"
          | "NET";
        const requestedPage = Math.max(
          1,
          parseInt(url.searchParams.get("page") || "1", 10) || 1
        );
        const pageSize = Math.max(
          1,
          Math.min(20, parseInt(url.searchParams.get("pageSize") || "5", 10) || 5)
        );

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

        for (const grp of filteredGroups) {
          for (const item of grp.rawItems) {
            if (grp.otaOffers[item.otaSource] && item.liveProof) {
              grp.otaOffers[item.otaSource].liveProof = item.liveProof;
            }
          }
        }

        // Tính tổng quan trên toàn tập kết quả đã lọc
        let bothLiveMatchedCount = 0;
        let agodaVsBookingDiffSum = 0;
        for (const g of filteredGroups) {
          const agoda = g.otaOffers.AGODA;
          const booking = g.otaOffers.BOOKING;
          if (agoda && booking) {
            bothLiveMatchedCount++;
            const pA =
              priceBasis === "GROSS" ? agoda.grossPrice : agoda.netPrice;
            const pB =
              priceBasis === "GROSS" ? booking.grossPrice : booking.netPrice;
            agodaVsBookingDiffSum += ((pA - pB) / pB) * 100;
          }
        }
        const avgAgodaVsBookingPct = bothLiveMatchedCount
          ? Number((agodaVsBookingDiffSum / bothLiveMatchedCount).toFixed(2))
          : 0;

        // Phân trang Lazy Load: mỗi trang chỉ trả về đúng Top 5 theo thứ tự khớp chuẩn với Form
        const totalItems = filteredGroups.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(requestedPage, totalPages);
        const startIdx = (safePage - 1) * pageSize;
        const pagedGroups = filteredGroups.slice(startIdx, startIdx + pageSize);

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.statusCode = 200;
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
            pagination: {
              page: safePage,
              pageSize,
              totalItems,
              totalPages,
              startRank: totalItems === 0 ? 0 : startIdx + 1,
              endRank: Math.min(totalItems, startIdx + pagedGroups.length),
            },
            overallSummary: {
              bothLiveMatchedCount,
              avgAgodaVsBookingPct,
            },
            matchedCanonicalGroupsCount: totalItems,
            comparisonGroups: pagedGroups,
          })
        );
      });

      server.middlewares.use("/api/scrape-live", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const parsed = body ? JSON.parse(body) : {};
            const hotelKey = parsed.hotelKey || "champton-nha-trang";
            const checkIn = parsed.checkIn || "2026-11-20";
            const fresh = await runFullScrapeAndCompare({ hotelKey, checkIn });
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 200;
            res.end(JSON.stringify(fresh));
          } catch (err) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 500;
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : "Scrape error",
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), otaRateShoppingApiPlugin()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 4180,
    strictPort: true,
    watch: {
      ignored: ["**/data/**"],
    },
  },
});
