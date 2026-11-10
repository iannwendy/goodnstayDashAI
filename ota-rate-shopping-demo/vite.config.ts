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

function loadOrInitReport() {
  if (fs.existsSync(DATA_FILE)) {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
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

function otaRateShoppingApiPlugin(): Plugin {
  return {
    name: "ota-rate-shopping-api",
    configureServer(server) {
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

      server.middlewares.use("/api/scrape-live", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
          return;
        }
        try {
          const fresh = await runFullScrapeAndCompare();
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

      server.middlewares.use("/api/normalize-custom", (req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const input = JSON.parse(body || "{}");
            const report = loadOrInitReport();
            const hotelContext = report.allNormalizedRooms.map((r: any) => ({
              roomName: r.formFields.roomName,
              areaSqm: r.filterMeta.areaSqm || 30,
              basePrice: r.filterMeta.grossPrice,
            }));
            const normalized = normalizeRawOtaRoom(input, hotelContext);
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.statusCode = 200;
            res.end(JSON.stringify(normalized));
          } catch (err) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                error: err instanceof Error ? err.message : "Invalid payload",
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
  },
});
