import type { AppLocale, PropertyId, StaffRoleKey } from "@/data";
import type { ViewportProvider, ViewportSlotId } from "@/lib/viewportRegistry";
import {
  getBffRequestBaseUrl,
  getOrCreateBffToken,
} from "@/services/bigQueryApiService";

export interface ViewportEmbedSession {
  ok: true;
  slotId: ViewportSlotId;
  provider: ViewportProvider;
  embedUrl: string;
  guestToken: string | null;
  issuedAt: string;
  expiresAt: string;
  ttlSec: number;
  minHeightPx: number;
  allowFullscreen: boolean;
  scopeSummary: {
    userId: string;
    partnerId: string;
    roleKey: StaffRoleKey;
    allowedBranchIds: PropertyId[];
    canViewChainAll: boolean;
    canViewFinancials: boolean;
  };
}

export interface ViewportRegistryItem {
  slotId: ViewportSlotId;
  provider: ViewportProvider;
  mode: "simulated" | "external" | "disabled";
  defaultMinHeightPx: number;
  allowFullscreen: boolean;
}

export async function requestViewportEmbedSession(params: {
  slotId: ViewportSlotId;
  userId: string;
  localeHint: AppLocale;
  presetHint?: "executive" | "funnel" | "ai_clusters";
}): Promise<ViewportEmbedSession> {
  const token = await getOrCreateBffToken(params.userId);
  const baseUrl = getBffRequestBaseUrl();
  const res = await fetch(
    `${baseUrl}/api/v1/viewports/${encodeURIComponent(params.slotId)}/embed-session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        localeHint: params.localeHint,
        ...(params.presetHint ? { presetHint: params.presetHint } : {}),
      }),
      cache: "no-store",
    },
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.ok || typeof payload?.embedUrl !== "string") {
    const errCode = typeof payload?.errorCode === "string" ? payload.errorCode : `HTTP_${res.status}`;
    const errMsg =
      typeof payload?.message === "string"
        ? payload.message
        : `Failed to acquire BI Viewport embed session (${res.status}).`;
    throw new Error(`[${errCode}] ${errMsg}`);
  }

  return payload as ViewportEmbedSession;
}

export async function fetchViewportRegistry(
  userId: string,
): Promise<ViewportRegistryItem[]> {
  const token = await getOrCreateBffToken(userId);
  const baseUrl = getBffRequestBaseUrl();
  const res = await fetch(`${baseUrl}/api/v1/viewports/registry`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload?.ok || !Array.isArray(payload?.slots)) {
    throw new Error(payload?.message || `Failed to fetch viewport registry (${res.status}).`);
  }
  return payload.slots as ViewportRegistryItem[];
}
