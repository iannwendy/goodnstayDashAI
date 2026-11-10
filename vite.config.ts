import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const MASTER_DATA_DIR = fileURLToPath(
  new URL("./master-data", import.meta.url),
);
const SEED_DATA_DIR = path.join(MASTER_DATA_DIR, "seed");
const DIST_MASTER_DATA_DIR = fileURLToPath(
  new URL("./dist/master-data", import.meta.url),
);

const TABLE_FILE_MAP: Record<string, string> = {
  hotelProfile: "hotel_profile.json",
  usersRoles: "users_roles.json",
  perksCatalog: "perks_catalog.json",
  roomClasses: "room_classes.json",
  roomsPms: "rooms_pms.json",
  calendar14dPms: "calendar_14d_pms.json",
  systemBenchmarks: "system_benchmarks.json",
  auctionSessions: "auction_sessions.json",
  matchBreakdowns: "match_breakdowns.json",
  lossAutopsies: "loss_autopsies.json",
  botRules: "bot_rules.json",
  lifecycleCatalog: "lifecycle_catalog.json",
};

function readAllMasterTables() {
  const bundle: Record<string, unknown> = {};
  for (const [key, filename] of Object.entries(TABLE_FILE_MAP)) {
    const fullPath = path.join(MASTER_DATA_DIR, filename);
    bundle[key] = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  }
  return bundle;
}

function attachMasterDataMiddleware(
  middlewares: {
    use: (
      route: string,
      fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void,
    ) => void;
  },
) {
  middlewares.use("/master-data", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    const relPath = decodeURIComponent((req.url || "/").split("?")[0]).replace(
      /^\/+/,
      "",
    );
    const resolved = path.resolve(MASTER_DATA_DIR, relPath);
    if (
      !resolved.startsWith(MASTER_DATA_DIR) ||
      !fs.existsSync(resolved) ||
      !fs.statSync(resolved).isFile()
    ) {
      next();
      return;
    }
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.statusCode = 200;
    res.end(fs.readFileSync(resolved, "utf-8"));
  });

  middlewares.use("/api/master-data", (req, res, next) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const subPath = (req.url || "/").split("?")[0];

    try {
      if (req.method === "GET" && (subPath === "/" || subPath === "")) {
        const bundle = readAllMasterTables();
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            source: "live-master-api",
            syncedAt: new Date().toISOString(),
            bundle,
          }),
        );
        return;
      }

      if (req.method === "POST" && subPath === "/reset") {
        for (const filename of Object.values(TABLE_FILE_MAP)) {
          const seedFile = path.join(SEED_DATA_DIR, filename);
          const targetFile = path.join(MASTER_DATA_DIR, filename);
          if (fs.existsSync(seedFile)) {
            fs.copyFileSync(seedFile, targetFile);
          }
        }
        const bundle = readAllMasterTables();
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: true,
            source: "live-master-api",
            syncedAt: new Date().toISOString(),
            bundle,
          }),
        );
        return;
      }

      if (req.method === "PUT" && subPath.startsWith("/")) {
        const tableKey = subPath.slice(1);
        const filename = TABLE_FILE_MAP[tableKey];
        if (!filename) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: `Unknown table: ${tableKey}` }));
          return;
        }

        let rawBody = "";
        req.on("data", (chunk) => {
          rawBody += chunk;
        });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(rawBody);
            const targetFile = path.join(MASTER_DATA_DIR, filename);
            fs.writeFileSync(
              targetFile,
              JSON.stringify(parsed.data, null, 2),
              "utf-8",
            );
            res.statusCode = 200;
            res.end(
              JSON.stringify({
                ok: true,
                table: tableKey,
                syncedAt: new Date().toISOString(),
              }),
            );
          } catch (err) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                ok: false,
                error: err instanceof Error ? err.message : "Invalid JSON payload",
              }),
            );
          }
        });
        return;
      }

      next();
    } catch (err) {
      res.statusCode = 500;
      res.end(
        JSON.stringify({
          ok: false,
          error: err instanceof Error ? err.message : "Internal Master Data Error",
        }),
      );
    }
  });
}

function masterDataApiPlugin(): Plugin {
  return {
    name: "revbid-master-data-api",
    configureServer(server) {
      attachMasterDataMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMasterDataMiddleware(server.middlewares);
    },
    closeBundle() {
      if (fs.existsSync(MASTER_DATA_DIR)) {
        fs.cpSync(MASTER_DATA_DIR, DIST_MASTER_DATA_DIR, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), masterDataApiPlugin()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5182,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
    watch: {
      ignored: ["**/master-data/**"],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4182,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
  },
});
