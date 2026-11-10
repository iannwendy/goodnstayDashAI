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
const EVIDENCE_DIR = fileURLToPath(
  new URL("./data/evidence", import.meta.url)
);

function loadOrInitReport() {
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
        const report = loadOrInitReport();
        const roomType = url.searchParams.get("roomType") || "ALL";
        const detailedBedCategory =
          url.searchParams.get("detailedBedCategory") || "ALL";
        const multiBedMode = url.searchParams.get("multiBedMode") || "ALL";
        const viewCategory = url.searchParams.get("viewCategory") || "ALL";
        const priceBasis = (url.searchParams.get("priceBasis") || "GROSS") as
          | "GROSS"
          | "NET";

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
            matchedCanonicalGroupsCount: filteredGroups.length,
            comparisonGroups: filteredGroups,
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
