import http, { type IncomingMessage, type ServerResponse } from "node:http";
import {
  extractBearerToken,
  HttpAuthError,
  resolveScopedBranches,
  signSessionJwt,
  verifySessionJwt,
} from "./auth.js";
import type { PartnerAnalyticsService, SeedMasterBundleSnapshot } from "./bigqueryService.js";
import type { BffConfig } from "./config.js";
import { CostGuardError } from "./costGuard.js";
import type { PeriodKey } from "./types.js";

const MAX_BODY_BYTES = 512 * 1024; // 512 KiB max request payload
const ALLOWED_PERIODS: ReadonlySet<string> = new Set(["today", "7d", "30d"]);
const ALLOWED_OVERLAY_TABLES: ReadonlySet<string> = new Set([
  "hubConfig",
  "hubInbox",
  "roomInventory",
  "payoutLedgers",
  "biddingOperations",
  "marketingCampaigns",
]);
const PRICING_OR_FINANCIAL_TABLES: ReadonlySet<string> = new Set([
  "payoutLedgers",
  "marketingCampaigns",
  "biddingOperations",
]);

function applySecurityHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  cfg: BffConfig,
): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-store");

  const origin = req.headers.origin;
  if (origin && cfg.corsAllowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject(new HttpAuthError(413, "PAYLOAD_TOO_LARGE", "Request body exceeds 512 KiB limit."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          reject(new HttpAuthError(400, "INVALID_JSON_OBJECT", "Expected a JSON object body."));
          return;
        }
        resolve(parsed as Record<string, unknown>);
      } catch {
        reject(new HttpAuthError(400, "MALFORMED_JSON", "Request body is not valid JSON."));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export function createBffServer(cfg: BffConfig, service: PartnerAnalyticsService): http.Server {
  return http.createServer(async (req, res) => {
    applySecurityHeaders(req, res, cfg);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;

    try {
      // 1. Public Health & Cost-Guardrail Summary
      if (req.method === "GET" && pathname === "/api/v1/health") {
        sendJson(res, 200, {
          ok: true,
          service: "goodnstay-bigquery-bff",
          gcpProjectId: cfg.gcpProjectId,
          bqLocation: cfg.bqLocation,
          costGuard: service.costGuard.getStatus(),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // 2. Public Demo RBAC Profile Directory (for Dashboard account switcher)
      if (req.method === "GET" && pathname === "/api/v1/auth/profiles") {
        const profiles = await service.listRbacProfiles();
        sendJson(res, 200, {
          ok: true,
          profiles,
        });
        return;
      }

      // 3. Issue Signed HS256 JWT Session for a Verified user_id in BigQuery RBAC Table
      if (req.method === "POST" && pathname === "/api/v1/auth/session") {
        const body = await readJsonBody(req);
        const userId = typeof body.userId === "string" ? body.userId.trim() : "";
        if (!userId) {
          throw new HttpAuthError(400, "MISSING_USER_ID", "Field 'userId' is required.");
        }
        const profile = await service.getProfileByUserId(userId);
        if (!profile) {
          throw new HttpAuthError(404, "UNKNOWN_USER_ID", `User '${userId}' was not found.`);
        }
        const { token, claims } = signSessionJwt(profile, cfg.jwtSecret, cfg.jwtTtlSec);
        sendJson(res, 200, {
          ok: true,
          accessToken: token,
          tokenType: "Bearer",
          expiresInSec: cfg.jwtTtlSec,
          profile,
          claimsSummary: {
            userId: claims.sub,
            roleKey: claims.roleKey,
            allowedBranchIds: claims.allowedBranchIds,
            canViewChainAll: claims.canViewChainAll,
            canViewFinancials: claims.canViewFinancials,
            canManagePricing: claims.canManagePricing,
          },
        });
        return;
      }

      // ---- All endpoints below require a valid HS256 Bearer JWT ----
      const token = extractBearerToken(req.headers.authorization);
      const claims = verifySessionJwt(token, cfg.jwtSecret);

      // 4. Authenticated Real-Time CTO Cost Guardrail Telemetry
      if (req.method === "GET" && pathname === "/api/v1/analytics/cost-guard") {
        sendJson(res, 200, {
          ok: true,
          gcpProjectId: cfg.gcpProjectId,
          bqLocation: cfg.bqLocation,
          costGuard: service.costGuard.getStatus(),
        });
        return;
      }

      // 5. Authenticated Live BigQuery Viewport (CTO 3-Chart Daily Series + 8-Step Funnel + Media + AI)
      if (req.method === "GET" && pathname === "/api/v1/analytics/viewport") {
        const requestedBranch = url.searchParams.get("branchId");
        const scopedBranches = resolveScopedBranches(claims, requestedBranch);

        const rawPeriod = (url.searchParams.get("period") ?? "30d").trim();
        if (!ALLOWED_PERIODS.has(rawPeriod)) {
          throw new HttpAuthError(
            400,
            "INVALID_PERIOD",
            `Parameter 'period' must be one of: today, 7d, 30d.`,
          );
        }
        const forceRefresh = url.searchParams.get("refresh") === "true";

        const payload = await service.getViewportAnalytics(
          claims,
          scopedBranches,
          rawPeriod as PeriodKey,
          forceRefresh,
        );
        sendJson(res, 200, payload);
        return;
      }

      // 6. Authenticated Scoped MasterDataBundle Hydrated from BigQuery
      if (req.method === "GET" && pathname === "/api/v1/analytics/bundle") {
        const requestedBranch = url.searchParams.get("branchId");
        const scopedBranches = resolveScopedBranches(claims, requestedBranch);
        const forceRefresh = url.searchParams.get("refresh") === "true";

        const payload = await service.getScopedMasterBundle(claims, scopedBranches, forceRefresh);
        sendJson(res, 200, payload);
        return;
      }

      // 7. In-Memory Operational Session Overlay (Zero BigQuery DML Cost & Role-Guarded)
      if (req.method === "POST" && pathname === "/api/v1/session-overlay/reset") {
        const result = service.resetSessionOverlay(claims.sub);
        sendJson(res, 200, result);
        return;
      }

      if (req.method === "PUT" && pathname.startsWith("/api/v1/session-overlay/")) {
        const tableKey = pathname.slice("/api/v1/session-overlay/".length);
        if (!ALLOWED_OVERLAY_TABLES.has(tableKey)) {
          throw new HttpAuthError(400, "INVALID_OVERLAY_TABLE", `Unsupported table '${tableKey}'.`);
        }
        if (PRICING_OR_FINANCIAL_TABLES.has(tableKey) && !claims.canManagePricing) {
          throw new HttpAuthError(
            403,
            "FORBIDDEN_ROLE_PERMISSION",
            `Role '${claims.roleKey}' cannot modify '${tableKey}'.`,
          );
        }
        const body = await readJsonBody(req);
        if (!("data" in body)) {
          throw new HttpAuthError(400, "MISSING_DATA_FIELD", "Expected JSON body with 'data'.");
        }
        const result = service.applySessionOverlay(
          claims.sub,
          tableKey as keyof SeedMasterBundleSnapshot,
          body.data,
        );
        sendJson(res, 200, result);
        return;
      }

      sendJson(res, 404, {
        ok: false,
        errorCode: "NOT_FOUND",
        message: `Route ${req.method} ${pathname} not found.`,
      });
    } catch (err) {
      if (err instanceof HttpAuthError) {
        sendJson(res, err.statusCode, {
          ok: false,
          errorCode: err.errorCode,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        });
        return;
      }
      if (err instanceof CostGuardError) {
        sendJson(res, err.statusCode, {
          ok: false,
          errorCode: err.errorCode,
          message: err.message,
          details: err.details,
        });
        return;
      }
      // OWASP A10:2025 — Never leak stack traces or internal GCP credential paths to clients
      console.error("[bigquery-bff] Unhandled request error:", err);
      sendJson(res, 500, {
        ok: false,
        errorCode: "INTERNAL_BFF_ERROR",
        message: "An unexpected server error occurred while serving analytics.",
      });
    }
  });
}
