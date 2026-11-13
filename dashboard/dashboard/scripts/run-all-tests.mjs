#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SEED_DIR = path.join(ROOT, "master-data", "seed");
const LIVE_DIR = path.join(ROOT, "master-data");

const TABLE_FILES = [
  "hotel_profile.json",
  "users_roles.json",
  "perks_catalog.json",
  "room_classes.json",
  "rooms_pms.json",
  "calendar_14d_pms.json",
  "system_benchmarks.json",
  "auction_sessions.json",
  "match_breakdowns.json",
  "loss_autopsies.json",
  "bot_rules.json",
  "lifecycle_catalog.json",
];

function restoreSeedFiles() {
  for (const filename of TABLE_FILES) {
    const src = path.join(SEED_DIR, filename);
    const dst = path.join(LIVE_DIR, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    }
  }
}

function runStep(title, cmd, args) {
  console.log(`\n======================================================================`);
  console.log(`▶ ${title}`);
  console.log(`======================================================================`);
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return res.status ?? 1;
}

let exitCode = 0;

try {
  restoreSeedFiles();

  // 1. Unit, Master-Data Contract, Analytics Engine & TypeScript Build Gate
  const unitFiles = fs
    .readdirSync(path.join(ROOT, "tests", "unit"))
    .filter((f) => f.endsWith(".test.ts"))
    .sort()
    .map((f) => path.join("tests", "unit", f));

  const unitStatus = runStep(
    "PHASE 1/2 — Unit, Contract, Business Logic & TypeScript Build Gate",
    process.execPath,
    ["--import", "./tests/helpers/register-ts-alias.mjs", "--test", ...unitFiles],
  );
  if (unitStatus !== 0) {
    exitCode = unitStatus;
  }

  // 2. Playwright E2E, REST API, All Buttons/Modals, RBAC & 7-Viewport Responsive Matrix
  const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
  const e2eStatus = runStep(
    "PHASE 2/2 — Playwright E2E, REST API, UI Controls, RBAC & Responsive Matrix",
    npxBin,
    ["playwright", "test"],
  );
  if (e2eStatus !== 0 && exitCode === 0) {
    exitCode = e2eStatus;
  }
} finally {
  restoreSeedFiles();
  console.log(`\n✔ Restored master-data/*.json cleanly from master-data/seed/*.json.`);
}

process.exit(exitCode);
