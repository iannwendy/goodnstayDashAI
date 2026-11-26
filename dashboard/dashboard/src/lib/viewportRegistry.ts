export type ViewportSlotId = "overview_analytics" | "deep_analytics";

export type ViewportProvider =
  | "simulated_bi"
  | "superset"
  | "metabase"
  | "looker"
  | "generic_iframe";

export interface ViewportSlotMetadata {
  slotId: ViewportSlotId;
  defaultMinHeightPx: number;
  allowFullscreen: boolean;
  label: {
    vi: string;
    en: string;
    ko: string;
  };
  subtitle: {
    vi: string;
    en: string;
    ko: string;
  };
}

export const VIEWPORT_SLOTS: Record<ViewportSlotId, ViewportSlotMetadata> = {
  overview_analytics: {
    slotId: "overview_analytics",
    defaultMinHeightPx: 780,
    allowFullscreen: true,
    label: {
      vi: "BI Viewport · Phân Tích Tổng Quan",
      en: "BI Viewport · Overview Analytics",
      ko: "BI 뷰포트 · 종합 분석",
    },
    subtitle: {
      vi: "Toàn quyền nội dung, biểu đồ và bộ lọc do đội Data Science / BI điều chỉnh trực tiếp.",
      en: "All charts, KPIs, and internal filters are owned directly by Data Science / BI.",
      ko: "모든 차트, 지표 및 내부 필터는 데이터 사이언스/BI 팀이 직접 관리합니다.",
    },
  },
  deep_analytics: {
    slotId: "deep_analytics",
    defaultMinHeightPx: 860,
    allowFullscreen: true,
    label: {
      vi: "BI Viewport · Phân Tích Chuyên Sâu",
      en: "BI Viewport · Deep Analytics Workspace",
      ko: "BI 뷰포트 · 심층 분석 워크스페이스",
    },
    subtitle: {
      vi: "Không gian báo cáo chuyên sâu toàn trang (Phễu GA4, Media, Phân cụm C1–C4) từ công cụ BI.",
      en: "Full-page BI analytics space (GA4 Funnel, Media, C1–C4 Clusters) owned by Data Science.",
      ko: "BI 도구에서 직접 제공하는 전체 화면 심층 분석 공간입니다.",
    },
  },
};

export const DEFAULT_ALLOWED_VIEWPORT_ORIGINS: readonly string[] = [
  "http://127.0.0.1:4000",
  "http://localhost:4000",
  "http://127.0.0.1:5182",
  "http://localhost:5182",
  "http://127.0.0.1:4182",
  "http://localhost:4182",
];

const DEMO_OVERRIDE_STORAGE_KEY = "gns_viewport_demo_overrides_v1";

export interface DemoViewportOverride {
  customUrl?: string;
  allowExternalHttps?: boolean;
  presetHint?: "executive" | "funnel" | "ai_clusters";
}

export interface ViewportUrlValidationResult {
  ok: boolean;
  normalizedUrl: string;
  resolvedOrigin: string;
  usedExternalDemoAllowance: boolean;
  reason?: string;
}

export interface ViewportSandboxPolicy {
  isSameOrigin: boolean;
  sandboxAttr: string;
  expectedPostMessageOrigin: string;
}

export function getEffectiveAllowedOrigins(
  currentOrigin: string,
  envConfiguredOrigins: string[] = [],
): string[] {
  const set = new Set<string>(DEFAULT_ALLOWED_VIEWPORT_ORIGINS);
  if (currentOrigin) {
    set.add(currentOrigin);
  }
  for (const raw of envConfiguredOrigins) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const u = new URL(trimmed);
      if (u.protocol === "http:" || u.protocol === "https:") {
        set.add(u.origin);
      }
    } catch {
      // Ignore malformed env origin entries
    }
  }
  return [...set];
}

export function getRuntimeEnvAllowedOrigins(): string[] {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const raw = env?.VITE_VIEWPORT_ALLOWED_ORIGINS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isViewportDemoToolsEnabled(): boolean {
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env;
  return Boolean(env?.DEV) || env?.VITE_ENABLE_VIEWPORT_DEMO_TOOLS === "true";
}

export function validateViewportEmbedUrl(
  rawUrl: string,
  opts: {
    currentOrigin: string;
    allowedOrigins: string[];
    allowExternalHttpsDemo: boolean;
  },
): ViewportUrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      ok: false,
      normalizedUrl: "",
      resolvedOrigin: "",
      usedExternalDemoAllowance: false,
      reason: "URL is empty.",
    };
  }

  // Block dangerous schemes before URL parsing
  if (/^(javascript|data|blob|file|vbscript):/i.test(trimmed)) {
    return {
      ok: false,
      normalizedUrl: "",
      resolvedOrigin: "",
      usedExternalDemoAllowance: false,
      reason: "Unsupported or unsafe URL scheme.",
    };
  }

  let parsed: URL;
  try {
    parsed = trimmed.startsWith("/")
      ? new URL(trimmed, opts.currentOrigin)
      : new URL(trimmed);
  } catch {
    return {
      ok: false,
      normalizedUrl: "",
      resolvedOrigin: "",
      usedExternalDemoAllowance: false,
      reason: "Malformed URL.",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      normalizedUrl: "",
      resolvedOrigin: "",
      usedExternalDemoAllowance: false,
      reason: `Scheme '${parsed.protocol}' is not allowed.`,
    };
  }

  const isAllowlisted = opts.allowedOrigins.includes(parsed.origin);
  if (isAllowlisted) {
    return {
      ok: true,
      normalizedUrl: trimmed.startsWith("/") ? parsed.pathname + parsed.search + parsed.hash : parsed.href,
      resolvedOrigin: parsed.origin,
      usedExternalDemoAllowance: false,
    };
  }

  if (opts.allowExternalHttpsDemo && parsed.protocol === "https:") {
    return {
      ok: true,
      normalizedUrl: parsed.href,
      resolvedOrigin: parsed.origin,
      usedExternalDemoAllowance: true,
    };
  }

  return {
    ok: false,
    normalizedUrl: "",
    resolvedOrigin: parsed.origin,
    usedExternalDemoAllowance: false,
    reason: `Origin '${parsed.origin}' is outside the allowed BI Viewport allowlist.`,
  };
}

export function isSameOriginEmbed(embedUrl: string, currentOrigin: string): boolean {
  try {
    const parsed = embedUrl.startsWith("/")
      ? new URL(embedUrl, currentOrigin)
      : new URL(embedUrl);
    return parsed.origin === currentOrigin;
  } catch {
    return true;
  }
}

/**
 * Adaptive sandbox policy:
 * - Cross-origin embeds (e.g. :5182 -> :4000 or partner.* -> bi.*) use `allow-same-origin`
 *   safely so the BI app can run on its own isolated origin.
 * - Same-origin proxied embeds (single HTTPS tunnel) MUST drop `allow-same-origin` so the
 *   iframe cannot access host DOM or localStorage; its postMessage origin becomes opaque `"null"`.
 */
export function resolveViewportSandboxPolicy(
  embedUrl: string,
  currentOrigin: string,
): ViewportSandboxPolicy {
  const sameOrigin = isSameOriginEmbed(embedUrl, currentOrigin);
  if (sameOrigin) {
    return {
      isSameOrigin: true,
      sandboxAttr: "allow-scripts allow-forms allow-downloads",
      expectedPostMessageOrigin: "null",
    };
  }
  const parsed = new URL(embedUrl, currentOrigin);
  return {
    isSameOrigin: false,
    sandboxAttr: "allow-scripts allow-same-origin allow-forms allow-downloads",
    expectedPostMessageOrigin: parsed.origin,
  };
}

export function readDemoViewportOverride(slotId: ViewportSlotId): DemoViewportOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<ViewportSlotId, DemoViewportOverride>>;
    return parsed[slotId] ?? null;
  } catch {
    return null;
  }
}

export function saveDemoViewportOverride(
  slotId: ViewportSlotId,
  override: DemoViewportOverride,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DEMO_OVERRIDE_STORAGE_KEY);
    const current = raw
      ? (JSON.parse(raw) as Partial<Record<ViewportSlotId, DemoViewportOverride>>)
      : {};
    current[slotId] = override;
    window.localStorage.setItem(DEMO_OVERRIDE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearDemoViewportOverride(slotId: ViewportSlotId): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DEMO_OVERRIDE_STORAGE_KEY);
    if (!raw) return;
    const current = JSON.parse(raw) as Partial<Record<ViewportSlotId, DemoViewportOverride>>;
    delete current[slotId];
    window.localStorage.setItem(DEMO_OVERRIDE_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage errors
  }
}
