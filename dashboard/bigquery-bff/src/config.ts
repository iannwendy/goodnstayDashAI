import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDefaultSeedDir(): string {
  const candidates = [
    path.resolve(__dirname, "../../dashboard/master-data/seed"),
    path.resolve(__dirname, "../../../dashboard/master-data/seed"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0]!;
}

export interface BffConfig {
  port: number;
  host: string;
  gcpProjectId: string;
  bqLocation: string;
  jwtSecret: string;
  jwtTtlSec: number;
  maxBytesBilledPerQuery: number;
  hardCapBytesPerQuery: number;
  enableDryRunPreflight: boolean;
  dailyBilledByteBudget: number;
  jobTimeoutMs: number;
  cacheTtlTodayMs: number;
  cacheTtlHistoryMs: number;
  profileCacheTtlMs: number;
  rateLimitPerMin: number;
  forceRefreshLimitPerMin: number;
  corsAllowedOrigins: string[];
  seedMasterDataDir: string;
}

const HARD_CAP_BYTES_PER_QUERY = 100 * 1024 * 1024; // 100 MiB absolute server maximum (~$0.0006/query)

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return fallback;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BffConfig {
  const requestedMaxBytes = parsePositiveInt(
    env.BQ_MAX_BYTES_BILLED,
    25 * 1024 * 1024, // Default 25 MiB per query (~$0.00015 worst-case)
  );
  const clampedMaxBytes = Math.min(requestedMaxBytes, HARD_CAP_BYTES_PER_QUERY);

  const defaultOrigins = [
    "http://localhost:5182",
    "http://127.0.0.1:5182",
    "http://localhost:4182",
    "http://127.0.0.1:4182",
  ];
  const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS
    ? env.CORS_ALLOWED_ORIGINS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : defaultOrigins;

  return {
    port: parsePositiveInt(env.PORT, 4000),
    host: env.HOST?.trim() || "127.0.0.1",
    gcpProjectId: env.GCP_PROJECT_ID?.trim() || "aevo-512307",
    bqLocation: env.BQ_LOCATION?.trim() || "US",
    jwtSecret: env.BFF_JWT_SECRET?.trim() || crypto.randomBytes(32).toString("hex"),
    jwtTtlSec: parsePositiveInt(env.BFF_JWT_TTL_SEC, 8 * 3600),
    maxBytesBilledPerQuery: clampedMaxBytes,
    hardCapBytesPerQuery: HARD_CAP_BYTES_PER_QUERY,
    enableDryRunPreflight: parseBool(env.BQ_ENABLE_DRY_RUN_PREFLIGHT, true),
    dailyBilledByteBudget: parsePositiveInt(
      env.BQ_DAILY_BYTE_BUDGET,
      500 * 1024 * 1024, // Default 500 MiB/24h (~$0.003/day worst-case)
    ),
    jobTimeoutMs: Math.min(parsePositiveInt(env.BQ_JOB_TIMEOUT_MS, 10_000), 30_000),
    cacheTtlTodayMs: parsePositiveInt(env.BFF_CACHE_TTL_TODAY_MS, 60_000),
    cacheTtlHistoryMs: parsePositiveInt(env.BFF_CACHE_TTL_HISTORY_MS, 15 * 60_000),
    profileCacheTtlMs: parsePositiveInt(env.BFF_PROFILE_CACHE_TTL_MS, 10 * 60_000),
    rateLimitPerMin: parsePositiveInt(env.BFF_RATE_LIMIT_PER_MIN, 60),
    forceRefreshLimitPerMin: parsePositiveInt(env.BFF_FORCE_REFRESH_LIMIT_PER_MIN, 10),
    corsAllowedOrigins,
    seedMasterDataDir:
      env.SEED_MASTER_DATA_DIR?.trim() || resolveDefaultSeedDir(),
  };
}
