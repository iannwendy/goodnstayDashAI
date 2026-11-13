import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MasterDataBundle } from "@/data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const MASTER_DATA_DIR = path.join(PROJECT_ROOT, "master-data");
export const SEED_DATA_DIR = path.join(MASTER_DATA_DIR, "seed");

export const CORE_MASTER_TABLE_FILES: Record<keyof MasterDataBundle, string> = {
  hubConfig: "partner_hub_config.json",
  bidRecords: "bid_records.json",
  hubInbox: "hub_inbox.json",
};

export const OBSOLETE_LEGACY_FILES = [
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
] as const;

export function loadSeedMasterBundle(): MasterDataBundle {
  const bundle: Record<string, unknown> = {};
  for (const [key, filename] of Object.entries(CORE_MASTER_TABLE_FILES)) {
    const filePath = path.join(SEED_DATA_DIR, filename);
    bundle[key] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return structuredClone(bundle) as unknown as MasterDataBundle;
}
