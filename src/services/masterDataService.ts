import type { MasterDataBundle } from "@/data";

export type MasterTableKey = keyof MasterDataBundle;

export interface LoadedMasterDataResult {
  bundle: MasterDataBundle;
  source: "live-master-api" | "static-json-files";
  syncedAt: string;
}

const STATIC_TABLE_PATHS: Record<MasterTableKey, string> = {
  hotelProfile: "/master-data/hotel_profile.json",
  usersRoles: "/master-data/users_roles.json",
  perksCatalog: "/master-data/perks_catalog.json",
  roomClasses: "/master-data/room_classes.json",
  roomsPms: "/master-data/rooms_pms.json",
  calendar14dPms: "/master-data/calendar_14d_pms.json",
  systemBenchmarks: "/master-data/system_benchmarks.json",
  auctionSessions: "/master-data/auction_sessions.json",
  matchBreakdowns: "/master-data/match_breakdowns.json",
  lossAutopsies: "/master-data/loss_autopsies.json",
  botRules: "/master-data/bot_rules.json",
};

const LOCAL_FALLBACK_PREFIX = "gns_master_v25_";

export async function loadMasterDataBundle(): Promise<LoadedMasterDataResult> {
  // 1. Direct live Master Data REST API (/api/master-data)
  try {
    const res = await fetch("/api/master-data", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = await res.json();
        if (payload?.ok && payload?.bundle) {
          return {
            bundle: payload.bundle as MasterDataBundle,
            source: "live-master-api",
            syncedAt: payload.syncedAt || new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Fallback to static master-data JSON files below
  }

  // 2. Static deployment fallback: read directly from /master-data/*.json
  const entries = Object.entries(STATIC_TABLE_PATHS) as [
    MasterTableKey,
    string,
  ][];
  const fetchedPairs = await Promise.all(
    entries.map(async ([key, url]) => {
      const cached = localStorage.getItem(`${LOCAL_FALLBACK_PREFIX}${key}`);
      if (cached) {
        try {
          return [key, JSON.parse(cached)] as const;
        } catch {
          localStorage.removeItem(`${LOCAL_FALLBACK_PREFIX}${key}`);
        }
      }
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Không thể tải bảng Master Data: ${url}`);
      }
      const data = await res.json();
      return [key, data] as const;
    }),
  );

  const bundle = Object.fromEntries(fetchedPairs) as unknown as MasterDataBundle;
  return {
    bundle,
    source: "static-json-files",
    syncedAt: new Date().toISOString(),
  };
}

export async function persistMasterTable<K extends MasterTableKey>(
  tableKey: K,
  data: MasterDataBundle[K],
): Promise<{ persistedToDisk: boolean; syncedAt: string }> {
  try {
    const res = await fetch(`/api/master-data/${tableKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (json?.ok) {
          return {
            persistedToDisk: true,
            syncedAt: json.syncedAt || new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Fallback to localStorage below
  }

  try {
    localStorage.setItem(
      `${LOCAL_FALLBACK_PREFIX}${tableKey}`,
      JSON.stringify(data),
    );
  } catch {
    // Ignore storage quota errors
  }
  return {
    persistedToDisk: false,
    syncedAt: new Date().toISOString(),
  };
}

export async function resetMasterDataToSeed(): Promise<LoadedMasterDataResult> {
  Object.keys(STATIC_TABLE_PATHS).forEach((k) => {
    try {
      localStorage.removeItem(`${LOCAL_FALLBACK_PREFIX}${k}`);
    } catch {
      // ignore
    }
  });

  try {
    const res = await fetch("/api/master-data/reset", {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await res.json();
        if (json?.ok && json?.bundle) {
          return {
            bundle: json.bundle as MasterDataBundle,
            source: "live-master-api",
            syncedAt: json.syncedAt || new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Fallback to reloading fresh static files
  }

  return loadMasterDataBundle();
}
