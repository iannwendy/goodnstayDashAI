import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MasterDataBundle } from "@/data";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const MASTER_DATA_DIR = path.join(PROJECT_ROOT, "master-data");
export const SEED_DATA_DIR = path.join(MASTER_DATA_DIR, "seed");

export const CORE_MASTER_TABLE_FILES: Record<keyof MasterDataBundle, string> = {
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

export function loadSeedMasterBundle(): MasterDataBundle {
  const bundle: Record<string, unknown> = {};
  for (const [key, filename] of Object.entries(CORE_MASTER_TABLE_FILES)) {
    const filePath = path.join(SEED_DATA_DIR, filename);
    bundle[key] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return structuredClone(bundle) as unknown as MasterDataBundle;
}
