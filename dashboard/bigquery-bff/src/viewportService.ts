import type { IncomingMessage } from "node:http";
import {
  HttpAuthError,
  isValidViewportSlotId,
  signViewportEmbedToken,
  verifyViewportEmbedToken,
} from "./auth.js";
import type { PartnerAnalyticsService } from "./bigqueryService.js";
import type { BffConfig } from "./config.js";
import type {
  BranchId,
  JwtSessionClaims,
  PeriodKey,
  ViewportEmbedClaims,
  ViewportEmbedSessionResponse,
  ViewportRegistrySlot,
  ViewportSlotId,
} from "./types.js";

const SLOT_METADATA: Record<
  ViewportSlotId,
  { defaultMinHeightPx: number; allowFullscreen: boolean }
> = {
  overview_analytics: { defaultMinHeightPx: 780, allowFullscreen: true },
  deep_analytics: { defaultMinHeightPx: 860, allowFullscreen: true },
};

const BRANCH_LABELS_LOCALIZED: Record<BranchId, { vi: string; en: string; ko: string }> = {
  br_mykhe: {
    vi: "L'amour Mỹ Khê (br_mykhe)",
    en: "L'amour My Khe (br_mykhe)",
    ko: "라무르 미케 (br_mykhe)",
  },
  br_songhan: {
    vi: "L'amour Sông Hàn (br_songhan)",
    en: "L'amour Song Han (br_songhan)",
    ko: "라무르 한강 (br_songhan)",
  },
  br_anthuong: {
    vi: "L'amour An Thượng (br_anthuong)",
    en: "L'amour An Thuong (br_anthuong)",
    ko: "라무르 안트엉 (br_anthuong)",
  },
  stay_h11: {
    vi: "Stay Hotel H11 (stay_h11)",
    en: "Stay Hotel H11 (stay_h11)",
    ko: "스테이 호텔 H11 (stay_h11)",
  },
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getConfiguredSlotUrl(cfg: BffConfig, slotId: ViewportSlotId): string | null {
  return slotId === "overview_analytics"
    ? cfg.viewportOverviewEmbedUrl
    : cfg.viewportDeepEmbedUrl;
}

function isTunnelProxiedRequest(req: IncomingMessage): boolean {
  const fwdHost = String(req.headers["x-forwarded-host"] ?? "").trim().toLowerCase();
  const host = String(req.headers.host ?? "").trim().toLowerCase();
  const origin = String(req.headers.origin ?? "").trim().toLowerCase();
  const probe = `${fwdHost} ${host} ${origin}`;
  return (
    probe.includes(".ts.net") ||
    probe.includes(".trycloudflare.com") ||
    (Boolean(fwdHost) && !fwdHost.startsWith("localhost") && !fwdHost.startsWith("127.0.0.1"))
  );
}

function resolveSimulatedEmbedBaseUrl(cfg: BffConfig, req: IncomingMessage): string {
  if (cfg.viewportPublicBaseUrl) {
    return cfg.viewportPublicBaseUrl;
  }
  if (isTunnelProxiedRequest(req)) {
    // Same-origin relative path proxied via Vite `/bi-embed` over HTTPS tunnel
    return "";
  }
  const hostHeader = String(req.headers.host ?? "").trim();
  if (hostHeader) {
    return `http://${hostHeader}`;
  }
  return `http://${cfg.host}:${cfg.port}`;
}

function assertExternalUrlAllowed(rawUrl: string, allowedOrigins: string[]): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpAuthError(
      503,
      "VIEWPORT_PROVIDER_UNCONFIGURED",
      "Configured BI viewport URL is malformed.",
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new HttpAuthError(
      503,
      "VIEWPORT_PROVIDER_UNCONFIGURED",
      "Configured BI viewport URL must use http:// or https://.",
    );
  }

  if (allowedOrigins.length > 0 && !allowedOrigins.includes(parsed.origin)) {
    throw new HttpAuthError(
      503,
      "VIEWPORT_PROVIDER_UNCONFIGURED",
      `Configured BI viewport origin '${parsed.origin}' is not in VIEWPORT_ALLOWED_ORIGINS.`,
    );
  }
}

export function listViewportRegistry(cfg: BffConfig): ViewportRegistrySlot[] {
  const slotIds: ViewportSlotId[] = ["overview_analytics", "deep_analytics"];
  return slotIds.map((slotId) => {
    const meta = SLOT_METADATA[slotId];
    const configured = getConfiguredSlotUrl(cfg, slotId);
    let mode: "simulated" | "external" | "disabled";
    if (configured?.toLowerCase() === "disabled") {
      mode = "disabled";
    } else if (cfg.viewportProvider !== "simulated_bi") {
      mode = configured ? "external" : "disabled";
    } else {
      mode = configured ? "external" : "simulated";
    }
    return {
      slotId,
      provider: cfg.viewportProvider,
      mode,
      defaultMinHeightPx: meta.defaultMinHeightPx,
      allowFullscreen: meta.allowFullscreen,
    };
  });
}

export function createViewportEmbedSession(
  cfg: BffConfig,
  req: IncomingMessage,
  claims: JwtSessionClaims,
  rawSlotId: string,
  localeHint?: string,
  presetHint?: string,
  currencyHint?: string,
): ViewportEmbedSessionResponse {
  if (!isValidViewportSlotId(rawSlotId)) {
    throw new HttpAuthError(
      404,
      "UNKNOWN_VIEWPORT_SLOT",
      `Viewport slot '${rawSlotId}' is not registered.`,
    );
  }

  const slotId: ViewportSlotId = rawSlotId;
  const meta = SLOT_METADATA[slotId];
  const configuredUrl = getConfiguredSlotUrl(cfg, slotId);

  if (configuredUrl?.toLowerCase() === "disabled") {
    throw new HttpAuthError(
      503,
      "VIEWPORT_PROVIDER_UNCONFIGURED",
      `Viewport slot '${slotId}' is explicitly disabled by server configuration.`,
    );
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const { token: embedToken, claims: embedClaims } = signViewportEmbedToken(
    claims,
    slotId,
    cfg.jwtSecret,
    cfg.viewportEmbedTtlSec,
    nowSec,
  );

  let embedUrl: string;
  let guestToken: string | null = null;

  if (cfg.viewportProvider === "simulated_bi" && !configuredUrl) {
    const base = resolveSimulatedEmbedBaseUrl(cfg, req);
    const qs = new URLSearchParams({ token: embedToken });
    if (localeHint === "vi" || localeHint === "en" || localeHint === "ko") {
      qs.set("lang", localeHint);
    }
    if (presetHint && /^[a-z0-9_-]{1,32}$/i.test(presetHint)) {
      qs.set("preset", presetHint);
    }
    if (currencyHint === "VND" || currencyHint === "KRW" || currencyHint === "USD") {
      qs.set("currency", currencyHint);
    }
    embedUrl = `${base}/bi-embed/render?${qs.toString()}`;
  } else {
    if (!configuredUrl) {
      throw new HttpAuthError(
        503,
        "VIEWPORT_PROVIDER_UNCONFIGURED",
        `Provider '${cfg.viewportProvider}' requires an embed URL for slot '${slotId}'.`,
      );
    }

    const candidateUrl = configuredUrl.includes("{token}")
      ? configuredUrl.replaceAll("{token}", encodeURIComponent(embedToken))
      : configuredUrl;

    assertExternalUrlAllowed(candidateUrl, cfg.viewportAllowedOrigins);
    embedUrl = candidateUrl;

    if (cfg.viewportProvider === "superset") {
      guestToken = embedToken;
    }
  }

  return {
    ok: true,
    slotId,
    provider: cfg.viewportProvider,
    embedUrl,
    guestToken,
    issuedAt: new Date(nowSec * 1000).toISOString(),
    expiresAt: new Date(embedClaims.exp * 1000).toISOString(),
    ttlSec: cfg.viewportEmbedTtlSec,
    minHeightPx: meta.defaultMinHeightPx,
    allowFullscreen: meta.allowFullscreen,
    scopeSummary: {
      userId: embedClaims.sub,
      partnerId: embedClaims.partnerId,
      roleKey: embedClaims.roleKey,
      allowedBranchIds: embedClaims.allowedBranchIds,
      canViewChainAll: embedClaims.canViewChainAll,
      canViewFinancials: embedClaims.canViewFinancials,
    },
  };
}

interface BiFunnelStep {
  step: string;
  labelVi: string;
  labelEn: string;
  labelKo: string;
  count: number;
  pct: number;
}

interface BiClusterRow {
  id: string;
  titleVi: string;
  titleEn: string;
  titleKo: string;
  sharePct: number;
  winRatePct: number;
  signalVi: string;
  signalEn: string;
  signalKo: string;
}

interface BiBranchMetricRecord {
  branchId: BranchId;
  period: PeriodKey;
  totalBids: number;
  wonBids: number;
  rejectedBids: number;
  expiredBids: number;
  cancelledBids: number;
  acceptRatePct: number;
  netRevenueVnd: number | null;
  grossGmvVnd: number | null;
  uniqueViewedOffers: number;
  uniqueSelectedOffers: number;
  viewToSelectPct: number;
  avgSavingPct: number;
  avgMatchPct: number;
  dailySeries: Array<{
    date: string;
    input: number;
    output: number;
    ratioPct: number;
    revenueVnd: number | null;
  }>;
  funnel: BiFunnelStep[];
  media: Array<{ categoryKey: string; images: number; videos: number }>;
  clusters: BiClusterRow[];
}

const DEFAULT_CLUSTERS: BiClusterRow[] = [
  {
    id: "C1",
    titleVi: "C1 · Nhận phòng sớm & Đưa đón sân bay",
    titleEn: "C1 · Early Check-in & Airport",
    titleKo: "C1 · 얼리 체크인 & 공항 픽업",
    sharePct: 34,
    winRatePct: 58.2,
    signalVi: "Tỷ lệ trúng cao khi xác nhận nhận phòng sớm ngay trong báo giá",
    signalEn: "High win rate when early check-in is confirmed in the offer",
    signalKo: "제안서에 얼리 체크인 확정 시 낙찰률 상승",
  },
  {
    id: "C2",
    titleVi: "C2 · Ban công / View biển",
    titleEn: "C2 · Balcony / Sea View",
    titleKo: "C2 · 발코니 / 오션뷰",
    sharePct: 29,
    winRatePct: 49.5,
    signalVi: "Video phòng thực tế giúp tăng tỷ lệ bấm chọn phòng +14%",
    signalEn: "Room gallery videos boost offer selection rate by +14%",
    signalKo: "객실 갤러리 동영상이 선택률을 +14% 향상",
  },
  {
    id: "C3",
    titleVi: "C3 · Săn giá giờ chót (Nhạy cảm giá)",
    titleEn: "C3 · Price-Sensitive Last-Min",
    titleKo: "C3 · 가격 민감 당일 예약",
    sharePct: 22,
    winRatePct: 31.0,
    signalVi: "Dễ rớt thầu khi mức giảm giá dưới 12% so với giá niêm yết",
    signalEn: "Loses bids when discount is below 12% vs. listed rate",
    signalKo: "할인율이 12% 미만일 때 탈락률 급증",
  },
  {
    id: "C4",
    titleVi: "C4 · Gia đình / Phòng thông nhau",
    titleEn: "C4 · Family / Connecting Rooms",
    titleKo: "C4 · 가족 / 커넥팅룸",
    sharePct: 15,
    winRatePct: 42.8,
    signalVi: "Thiếu thông tin giường phụ làm khách từ chối nhanh",
    signalEn: "Missing extra-bed tag causes rapid traveler rejection",
    signalKo: "엑스트라 베드 안내 누락 시 빠른 거절 발생",
  },
];

function buildSeedBiDataset(
  service: PartnerAnalyticsService,
  claims: ViewportEmbedClaims,
): { sourceKey: "seed"; records: BiBranchMetricRecord[] } {
  const seed = service.getSeedMasterBundle();
  const bids = seed.bidRecords as Array<{
    propertyId?: string;
    status?: string;
    sessionDate?: string;
    netRevenueVnd?: number;
  }>;

  const periodCutoffs: Record<PeriodKey, string> = {
    today: "2026-11-06",
    "7d": "2026-10-31",
    "30d": "2026-10-08",
  };

  const records: BiBranchMetricRecord[] = [];
  const periods: PeriodKey[] = ["30d", "7d", "today"];

  for (const period of periods) {
    const startDate = periodCutoffs[period];
    for (const branchId of claims.allowedBranchIds) {
      const scopedBids = bids.filter(
        (b) => b.propertyId === branchId && String(b.sessionDate ?? "") >= startDate,
      );
      const totalBids = scopedBids.length;
      const wonBids = scopedBids.filter((b) => b.status === "accepted").length;
      const rejectedBids = scopedBids.filter((b) => b.status === "rejected").length;
      const expiredBids = scopedBids.filter((b) => b.status === "expired").length;
      const cancelledBids = scopedBids.filter((b) => b.status === "cancelled").length;
      const rawNet = scopedBids
        .filter((b) => b.status === "accepted")
        .reduce((acc, b) => acc + Number(b.netRevenueVnd ?? 0), 0);
      const acceptRatePct = totalBids > 0 ? Number(((wonBids / totalBids) * 100).toFixed(1)) : 0;
      const uniqueViewed = Math.max(totalBids, Math.round(totalBids * 0.84) + wonBids);
      const uniqueSelected = Math.max(wonBids, wonBids + Math.round(rejectedBids * 0.25));
      const viewToSelectPct =
        uniqueViewed > 0 ? Number(((uniqueSelected / uniqueViewed) * 100).toFixed(1)) : 0;

      const byDay = new Map<string, { bids: number; won: number; rev: number }>();
      for (const b of scopedBids) {
        const d = String(b.sessionDate ?? "2026-11-06");
        const cur = byDay.get(d) ?? { bids: 0, won: 0, rev: 0 };
        cur.bids += 1;
        if (b.status === "accepted") {
          cur.won += 1;
          cur.rev += Number(b.netRevenueVnd ?? 0);
        }
        byDay.set(d, cur);
      }
      const dailySeries = [...byDay.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-14)
        .map(([date, v]) => ({
          date: date.slice(5),
          input: v.bids,
          output: v.won,
          ratioPct: v.bids > 0 ? Number(((v.won / v.bids) * 100).toFixed(1)) : 0,
          revenueVnd: claims.canViewFinancials ? v.rev : null,
        }));

      const formStart = Math.max(totalBids + 8, Math.round(totalBids * 1.9));
      const formComplete = Math.max(totalBids + 4, Math.round(totalBids * 1.4));
      const funnelBase = Math.max(1, formStart);
      const funnel: BiFunnelStep[] = [
        {
          step: "S1",
          labelVi: "Mở form tìm phòng",
          labelEn: "Booking Form Start",
          labelKo: "예약 폼 시작",
          count: formStart,
          pct: 100,
        },
        {
          step: "S2",
          labelVi: "Gửi yêu cầu phòng",
          labelEn: "Request Submitted",
          labelKo: "요청 제출",
          count: formComplete,
          pct: Number(((formComplete / funnelBase) * 100).toFixed(1)),
        },
        {
          step: "S3",
          labelVi: "Hiển thị thẻ báo giá",
          labelEn: "Offer Impressed",
          labelKo: "제안 노출",
          count: totalBids,
          pct: Number(((totalBids / funnelBase) * 100).toFixed(1)),
        },
        {
          step: "S4",
          labelVi: "Xem chi tiết duy nhất",
          labelEn: "Unique Viewed",
          labelKo: "고유 조회",
          count: uniqueViewed,
          pct: Number(((uniqueViewed / funnelBase) * 100).toFixed(1)),
        },
        {
          step: "S5",
          labelVi: "Xem ảnh/video Gallery",
          labelEn: "Media Engaged",
          labelKo: "미디어 탐색",
          count: Math.round(uniqueViewed * 0.72),
          pct: Number((((uniqueViewed * 0.72) / funnelBase) * 100).toFixed(1)),
        },
        {
          step: "S6",
          labelVi: "Bấm chọn phòng",
          labelEn: "Offer Selected",
          labelKo: "제안 선택",
          count: uniqueSelected,
          pct: Number(((uniqueSelected / funnelBase) * 100).toFixed(1)),
        },
        {
          step: "S7",
          labelVi: "Mở trang thanh toán",
          labelEn: "Checkout Open",
          labelKo: "결제 페이지 진입",
          count: Math.max(wonBids, Math.round(uniqueSelected * 0.85)),
          pct: Number(((Math.max(wonBids, Math.round(uniqueSelected * 0.85)) / funnelBase) * 100).toFixed(1)),
        },
        {
          step: "S8",
          labelVi: "Thanh toán thành công",
          labelEn: "Paid Completed",
          labelKo: "결제 완료",
          count: wonBids,
          pct: Number(((wonBids / funnelBase) * 100).toFixed(1)),
        },
      ];

      const seedFactor =
        branchId === "br_mykhe"
          ? 1.2
          : branchId === "br_songhan"
            ? 0.95
            : branchId === "stay_h11"
              ? 0.65
              : 0.8;
      const media = [
        { categoryKey: "rooms", images: Math.round(86 * seedFactor), videos: Math.round(24 * seedFactor) },
        { categoryKey: "facilities", images: Math.round(54 * seedFactor), videos: Math.round(18 * seedFactor) },
        { categoryKey: "property_views", images: Math.round(49 * seedFactor), videos: Math.round(15 * seedFactor) },
        { categoryKey: "dining", images: Math.round(31 * seedFactor), videos: Math.round(9 * seedFactor) },
        { categoryKey: "nearby_attractions", images: Math.round(27 * seedFactor), videos: Math.round(7 * seedFactor) },
      ];

      records.push({
        branchId,
        period,
        totalBids,
        wonBids,
        rejectedBids,
        expiredBids,
        cancelledBids,
        acceptRatePct,
        netRevenueVnd: claims.canViewFinancials ? rawNet : null,
        grossGmvVnd: claims.canViewFinancials ? Math.round(rawNet * 1.265) : null,
        uniqueViewedOffers: uniqueViewed,
        uniqueSelectedOffers: uniqueSelected,
        viewToSelectPct,
        avgSavingPct: branchId === "br_mykhe" ? 16.4 : 14.1,
        avgMatchPct: branchId === "br_mykhe" ? 91.2 : 86.5,
        dailySeries,
        funnel,
        media,
        clusters: DEFAULT_CLUSTERS,
      });
    }
  }

  return { sourceKey: "seed", records };
}

async function buildSimulatedBiPayload(
  cfg: BffConfig,
  service: PartnerAnalyticsService,
  claims: ViewportEmbedClaims,
): Promise<{ sourceKey: "live_bq" | "seed"; records: BiBranchMetricRecord[] }> {
  const sortedBranches = [...claims.allowedBranchIds].sort().join(",");
  const cacheKey = `v1:sim_bi_dataset_v2:${claims.sub}:${sortedBranches}:${claims.canViewFinancials}`;
  const { value } = await service.costGuard.runCachedSingleflight(
    cacheKey,
    cfg.cacheTtlHistoryMs,
    false,
    async () => {
      const seedFallback = buildSeedBiDataset(service, claims);
      const sessionClaimsLike: JwtSessionClaims = {
        sub: claims.sub,
        partnerId: claims.partnerId,
        roleKey: claims.roleKey,
        allowedBranchIds: claims.allowedBranchIds,
        canViewChainAll: claims.canViewChainAll,
        canViewFinancials: claims.canViewFinancials,
        canManagePricing: claims.canManagePricing,
        iat: claims.iat,
        exp: claims.exp,
      };

      try {
        const liveRecords: BiBranchMetricRecord[] = [];
        for (const period of ["30d", "7d", "today"] as PeriodKey[]) {
          for (const branchId of claims.allowedBranchIds) {
            const vp = await service.getViewportAnalytics(
              sessionClaimsLike,
              [branchId],
              period,
              false,
              true, // Counted once at /bi-embed/render entry, never 12x
            );
            liveRecords.push({
              branchId,
              period,
              totalBids: vp.kpis.totalBids,
              wonBids: vp.kpis.paidBookings,
              rejectedBids: vp.kpis.rejectedBids,
              expiredBids: vp.kpis.expiredBids,
              cancelledBids: vp.kpis.cancelledBids,
              acceptRatePct: vp.kpis.acceptRatePct,
              netRevenueVnd: claims.canViewFinancials ? vp.kpis.netRevenueVnd : null,
              grossGmvVnd: claims.canViewFinancials ? vp.kpis.grossGmvVnd : null,
              uniqueViewedOffers: vp.kpis.uniqueViewedOffers,
              uniqueSelectedOffers: vp.kpis.uniqueSelectedOffers,
              viewToSelectPct: vp.kpis.viewToSelectPct,
              avgSavingPct: vp.kpis.avgSavingPct,
              avgMatchPct: vp.kpis.avgMatchRatePct,
              dailySeries: vp.ctoDailySeries.slice(-14).map((pt) => ({
                date: pt.date.slice(5),
                input: pt.uniqueViewedOffers,
                output: pt.uniqueSelectedOffers,
                ratioPct: pt.viewToSelectRatioPct,
                revenueVnd: claims.canViewFinancials ? pt.netRevenueVnd : null,
              })),
              funnel: vp.funnel8Steps.map((s) => ({
                step: `S${s.stepOrder}`,
                labelVi: s.labelVi,
                labelEn: s.labelEn,
                labelKo: s.labelKo,
                count: s.count,
                pct: s.conversionFromStartPct,
              })),
              media: vp.mediaEngagement.map((m) => ({
                categoryKey: m.categoryKey,
                images: m.imageClicks,
                videos: m.videoClicks,
              })),
              clusters: DEFAULT_CLUSTERS,
            });
          }
        }
        return { sourceKey: "live_bq" as const, records: liveRecords };
      } catch {
        return seedFallback;
      }
    },
  );
  return value;
}

export function buildViewportCspHeader(cfg: BffConfig): string {
  const ancestors = new Set<string>([
    "'self'",
    ...cfg.corsAllowedOrigins,
    "https://*.ts.net",
    "https://*.trycloudflare.com",
  ]);
  return `frame-ancestors ${[...ancestors].join(" ")}; default-src 'self' 'unsafe-inline'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';`;
}

export function renderViewportErrorHtml(statusCode: number, code: string, message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>BI Embed Auth Error (${statusCode})</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; padding: 24px; }
    .card { max-width: 520px; margin: 24px auto; background: #fff; border: 1px solid #fecaca; border-radius: 10px; padding: 20px; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; color: #991b1b; background: #fee2e2; padding: 3px 8px; border-radius: 999px; }
    h1 { font-size: 16px; margin: 10px 0 6px; }
    p { font-size: 13px; color: #475569; margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">HTTP ${statusCode} · ${escapeHtml(code)}</span>
    <h1>BI Viewport Token Verification Failed</h1>
    <p>${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}

export interface RenderViewportOptions {
  preset?: string | null;
  lang?: string | null;
  currency?: string | null;
}

/**
 * Renders a standalone, vendor-neutral Simulated BI Tool page (Apache Superset / Metabase style)
 * strictly enforcing the cryptographically verified BI_EMBED token claims on the server,
 * with built-in Language (VI/EN/KO) and Currency (VND/KRW/USD) controls owned inside the BI tool.
 */
export async function renderSimulatedBiViewport(
  cfg: BffConfig,
  service: PartnerAnalyticsService,
  token: string,
  opts: RenderViewportOptions = {},
): Promise<{ statusCode: number; html: string }> {
  if (!token) {
    return {
      statusCode: 401,
      html: renderViewportErrorHtml(401, "MISSING_EMBED_TOKEN", "Signed BI embed token is required."),
    };
  }

  let claims: ViewportEmbedClaims;
  try {
    claims = verifyViewportEmbedToken(token, cfg.jwtSecret);
  } catch (err) {
    if (err instanceof HttpAuthError) {
      return {
        statusCode: err.statusCode,
        html: renderViewportErrorHtml(err.statusCode, err.errorCode, err.message),
      };
    }
    return {
      statusCode: 401,
      html: renderViewportErrorHtml(401, "INVALID_EMBED_TOKEN", "Invalid BI embed token."),
    };
  }

  // Count once per viewport render request against user rate limit
  service.costGuard.checkRateLimit(claims.sub, false);

  const { sourceKey, records } = await buildSimulatedBiPayload(cfg, service, claims);
  const initialPreset =
    opts.preset === "funnel" || opts.preset === "ai_clusters" || opts.preset === "executive"
      ? opts.preset
      : claims.slotId === "deep_analytics"
        ? "funnel"
        : "executive";
  const initialLang =
    opts.lang === "vi" || opts.lang === "en" || opts.lang === "ko" ? opts.lang : "vi";
  const initialCurrency =
    opts.currency === "VND" || opts.currency === "KRW" || opts.currency === "USD"
      ? opts.currency
      : "VND";

  const rawRates = (
    service.getSeedMasterBundle().hubConfig as {
      currencyRates?: { VND?: number; KRW?: number; USD?: number };
    }
  ).currencyRates;
  const currencyRates = {
    VND: Number(rawRates?.VND ?? 1),
    KRW: Number(rawRates?.KRW ?? 18.5),
    USD: Number(rawRates?.USD ?? 25400),
  };

  const safeDataJson = JSON.stringify({
    slotId: claims.slotId,
    userId: claims.sub,
    partnerId: claims.partnerId,
    roleKey: claims.roleKey,
    allowedBranchIds: claims.allowedBranchIds,
    canViewChainAll: claims.canViewChainAll,
    canViewFinancials: claims.canViewFinancials,
    sourceKey,
    initialPreset,
    initialLang,
    initialCurrency,
    currencyRates,
    branchLabels: Object.fromEntries(
      claims.allowedBranchIds.map((b) => [b, BRANCH_LABELS_LOCALIZED[b]]),
    ),
    records,
  }).replace(/</g, "\\u003c");

  const financialNoticeBanner = !claims.canViewFinancials
    ? `<div class="rbac-mask-banner" id="bi-rbac-banner" data-testid="bi-internal-financial-mask-banner">🔒 Restricted by RBAC Token — Financial metrics are redacted server-side for role <strong>${escapeHtml(claims.roleKey)}</strong>.</div>`
    : "";

  const html = `<!doctype html>
<html lang="${escapeHtml(initialLang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>goodNstay BI Embedded · ${escapeHtml(claims.slotId)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif; background: #f3f5f8; color: #1e293b; overflow-x: hidden; }
    .bi-shell { max-width: 100%; padding: 14px; }
    .bi-topbar { background: #1e293b; color: #f8fafc; border-radius: 8px; padding: 12px 14px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
    .bi-brand { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .bi-logo { width: 22px; height: 22px; border-radius: 5px; background: #0ea5e9; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; color: #fff; flex-shrink: 0; }
    .bi-title { font-size: 13.5px; font-weight: 700; }
    .bi-pill { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(255,255,255,0.12); color: #e2e8f0; white-space: nowrap; }
    .bi-pill-green { background: rgba(16,185,129,0.22); color: #6ee7b7; }
    .bi-filters { margin-top: 10px; background: #ffffff; border: 1px solid #dbe2ea; border-radius: 8px; padding: 10px 12px; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 10px; }
    .bi-filter-group { display: flex; flex-direction: column; gap: 3px; min-width: 118px; flex: 1 1 132px; }
    .bi-filter-group.compact { min-width: 104px; flex: 0 1 124px; }
    .bi-filter-group label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; font-weight: 700; }
    .bi-filter-group select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; font-size: 12.5px; color: #0f172a; background: #f8fafc; width: 100%; }
    .bi-owner-note { margin-top: 8px; font-size: 11.5px; color: #475569; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 7px; padding: 7px 10px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px; }
    .rbac-mask-banner { margin-top: 8px; font-size: 12px; color: #92400e; background: #fef3c7; border: 1px solid #fde68a; border-radius: 7px; padding: 8px 10px; }
    .kpi-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
    .kpi-card { background: #ffffff; border: 1px solid #dbe2ea; border-radius: 8px; padding: 12px; min-width: 0; }
    .kpi-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
    .kpi-val { margin-top: 6px; font-size: 20px; font-weight: 800; color: #0f172a; font-variant-numeric: tabular-nums; word-break: break-word; }
    .kpi-sub { margin-top: 4px; font-size: 11px; color: #64748b; }
    .panel-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
    .panel { background: #ffffff; border: 1px solid #dbe2ea; border-radius: 8px; padding: 14px; min-width: 0; overflow-x: auto; }
    .panel h3 { margin: 0 0 4px; font-size: 13.5px; color: #0f172a; }
    .panel p.sub { margin: 0 0 10px; font-size: 11.5px; color: #64748b; }
    .bar-row { display: grid; grid-template-columns: 128px 1fr 72px; align-items: center; gap: 8px; margin-bottom: 7px; font-size: 12px; }
    .bar-track { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #0284c7, #38bdf8); }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e2e8f0; }
    th { font-size: 11px; text-transform: uppercase; color: #64748b; background: #f8fafc; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .svg-wrap { width: 100%; overflow-x: auto; }
    @media (max-width: 480px) {
      .bi-shell { padding: 10px; }
      .bi-filter-group, .bi-filter-group.compact { flex: 1 1 100%; }
      .bar-row { grid-template-columns: 96px 1fr 58px; font-size: 11px; }
    }
  </style>
</head>
<body>
  <div class="bi-shell" id="bi-root">
    <div class="bi-topbar">
      <div class="bi-brand">
        <span class="bi-logo">BI</span>
        <span class="bi-title" id="bi-header-title">Data Science BI Workspace · ${escapeHtml(claims.slotId)}</span>
        <span class="bi-pill bi-pill-green" id="bi-source-pill"></span>
      </div>
      <div class="bi-brand">
        <span class="bi-pill" data-testid="bi-token-user">User: ${escapeHtml(claims.sub)}</span>
        <span class="bi-pill" data-testid="bi-token-branches">Scope: ${escapeHtml(claims.allowedBranchIds.join(", "))}</span>
      </div>
    </div>

    ${financialNoticeBanner}

    <div class="bi-filters" aria-label="BI Internal Filters">
      <div class="bi-filter-group">
        <label for="bi-period-filter" id="lbl-period">Khoảng thời gian (BI)</label>
        <select id="bi-period-filter">
          <option value="30d" selected>30 ngày</option>
          <option value="7d">7 ngày</option>
          <option value="today">Hôm nay</option>
        </select>
      </div>
      <div class="bi-filter-group">
        <label for="bi-branch-filter" id="lbl-branch">Phạm vi chi nhánh</label>
        <select id="bi-branch-filter"></select>
      </div>
      <div class="bi-filter-group">
        <label for="bi-preset-filter" id="lbl-preset">Mẫu báo cáo BI (DS)</label>
        <select id="bi-preset-filter">
          <option value="executive">Preset 1</option>
          <option value="funnel">Preset 2</option>
          <option value="ai_clusters">Preset 3</option>
        </select>
      </div>
      <div class="bi-filter-group compact">
        <label for="bi-lang-filter" id="lbl-lang">Ngôn ngữ (BI)</label>
        <select id="bi-lang-filter" data-testid="bi-lang-filter">
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
          <option value="ko">한국어</option>
        </select>
      </div>
      <div class="bi-filter-group compact">
        <label for="bi-currency-filter" id="lbl-currency">Tiền tệ (BI)</label>
        <select id="bi-currency-filter" data-testid="bi-currency-filter">
          <option value="VND">VND (₫)</option>
          <option value="KRW">KRW (₩)</option>
          <option value="USD">USD ($)</option>
        </select>
      </div>
    </div>

    <div class="bi-owner-note">
      <span id="bi-owner-note-text"></span>
      <span id="bi-active-summary"></span>
    </div>

    <div class="kpi-grid" id="bi-kpi-grid"></div>
    <div class="panel-grid" id="bi-panel-grid"></div>
  </div>

  <script>
    (function () {
      const DATA = ${safeDataJson};
      const periodEl = document.getElementById("bi-period-filter");
      const branchEl = document.getElementById("bi-branch-filter");
      const presetEl = document.getElementById("bi-preset-filter");
      const langEl = document.getElementById("bi-lang-filter");
      const currencyEl = document.getElementById("bi-currency-filter");
      const kpiGrid = document.getElementById("bi-kpi-grid");
      const panelGrid = document.getElementById("bi-panel-grid");
      const summaryEl = document.getElementById("bi-active-summary");
      const headerTitleEl = document.getElementById("bi-header-title");
      const sourcePillEl = document.getElementById("bi-source-pill");
      const ownerNoteEl = document.getElementById("bi-owner-note-text");
      const rbacBannerEl = document.getElementById("bi-rbac-banner");

      const I18N = {
        vi: {
          workspaceTitle: "Không Gian BI Data Science",
          sourceLive: "BigQuery Live (aevo-512307)",
          sourceSeed: "Dữ liệu mẫu Offline Safe",
          lblPeriod: "Khoảng thời gian (BI)",
          lblBranch: "Chi nhánh được cấp quyền",
          lblPreset: "Mẫu bố cục BI (DS)",
          lblLang: "Ngôn ngữ (BI)",
          lblCurrency: "Tiền tệ (BI)",
          opt30d: "30 ngày gần nhất",
          opt7d: "7 ngày gần nhất",
          optToday: "Hôm nay",
          allBranches: "Tất cả chi nhánh được cấp",
          presetExec: "Mẫu 1 · Doanh thu & Đấu giá",
          presetFunnel: "Mẫu 2 · Phễu GA4 8 Bước & Media",
          presetAi: "Mẫu 3 · Phân cụm AI Trúng/Rớt (C1–C4)",
          ownerNote: "<strong>Khu vực tự chủ của Data Science:</strong> Biểu đồ, chỉ số, bộ lọc, ngôn ngữ & tiền tệ bên dưới đều do BI tool tự quản — Frontend không chạm tới SQL hay data.",
          rbacBanner: "🔒 Restricted by RBAC Token — Chỉ số tài chính (Doanh thu thuần / GMV) đã bị che ở Server cho vai trò <strong>" + DATA.roleKey + "</strong>.",
          kpiRevenue: "Doanh thu thuần (Khách sạn)",
          kpiRevenueMasked: "Đã che (RBAC)",
          kpiRevenueMaskedSub: "Khóa bởi Server RBAC Token",
          kpiGmvPrefix: "GMV: ",
          kpiBids: "Tổng lượt chào giá",
          kpiBidsSub: function (won, rej) { return "Trúng: " + won + " · Từ chối: " + rej; },
          kpiAccept: "Tỷ lệ chấp nhận",
          kpiAcceptSub: function (v2s) { return "Xem → Chọn: " + v2s + "%"; },
          kpiMatch: "Độ khớp / Giảm giá TB",
          kpiMatchSub: function (sav) { return "Giảm giá TB: -" + sav + "%"; },
          filterPrefix: "Bộ lọc BI: ",
          chartTrendTitle: "Nhu Cầu & Chuyển Đổi Theo Ngày",
          chartTrendSub: "Biểu đồ xu hướng gốc do đội Data Science quản trị trên BI tool",
          legendIn: "● Lượng xem / đầu vào",
          legendOut: "● Được chọn / chốt đơn",
          noDailyData: "Không có điểm dữ liệu ngày cho bộ lọc này.",
          outcomeTitle: "Phân Bổ Kết Quả Chào Giá",
          outcomeSub: "Cơ cấu trạng thái báo giá theo bộ lọc nội bộ của BI",
          colStatus: "Trạng thái",
          colCount: "Số lượng",
          colShare: "Tỷ trọng",
          stAccepted: "Đã chấp nhận (Thanh toán)",
          stRejected: "Khách từ chối",
          stExpired: "Hết hạn",
          stCancelled: "Đã hủy",
          funnelTitle: "Phễu Hành Vi GA4 8 Bước",
          funnelSub: "Phân tích rớt phễu UNNEST(event_params) trực tiếp trong BI tool",
          mediaTitle: "Tương Tác 5 Nhóm Ảnh & Video",
          mediaSub: "Lượt bấm xem Ảnh và Video thúc đẩy quyết định chọn phòng",
          colCategory: "Danh mục",
          colImages: "Ảnh",
          colVideos: "Video",
          colTotal: "Tổng",
          catMap: {
            rooms: "Phòng nghỉ",
            facilities: "Tiện ích",
            property_views: "Ngoại cảnh",
            dining: "Ẩm thực",
            nearby_attractions: "Điểm gần đó",
          },
          clusterTitle: "Phân Cụm Từ Khóa Khách Du Lịch AI (C1–C4)",
          clusterSub: "Xuất bản trực tiếp từ Jupyter Pipeline của đội Data Science lên BI tool",
          colCluster: "Nhóm hành vi",
          colWinRate: "Tỷ lệ trúng",
          colSignal: "Tín hiệu chẩn đoán",
        },
        en: {
          workspaceTitle: "Data Science BI Workspace",
          sourceLive: "Live BigQuery (aevo-512307)",
          sourceSeed: "Seed Snapshot (Offline Safe)",
          lblPeriod: "Date Range (BI Internal)",
          lblBranch: "Authorized Branch Scope",
          lblPreset: "DS Dashboard Layout Preset",
          lblLang: "Language (BI)",
          lblCurrency: "Currency (BI)",
          opt30d: "Last 30 Days",
          opt7d: "Last 7 Days",
          optToday: "Today",
          allBranches: "All Authorized Branches",
          presetExec: "Preset 1 · Executive Revenue & Bidding",
          presetFunnel: "Preset 2 · GA4 8-Step Funnel & Media",
          presetAi: "Preset 3 · AI Win/Loss Clusters (C1–C4)",
          ownerNote: "<strong>Data Science Self-Service Zone:</strong> All charts, metrics, filters, language & currency below run natively inside the BI tool — Frontend owns zero SQL or data logic.",
          rbacBanner: "🔒 Restricted by RBAC Token — Financial metrics (Net Revenue / GMV) are redacted server-side for role <strong>" + DATA.roleKey + "</strong>.",
          kpiRevenue: "Net Revenue (Hotel)",
          kpiRevenueMasked: "Restricted (RBAC)",
          kpiRevenueMaskedSub: "Masked by Server RBAC Token",
          kpiGmvPrefix: "GMV: ",
          kpiBids: "Total Bids",
          kpiBidsSub: function (won, rej) { return "Won: " + won + " · Rejected: " + rej; },
          kpiAccept: "Accept Rate",
          kpiAcceptSub: function (v2s) { return "View → Select: " + v2s + "%"; },
          kpiMatch: "Avg Match / Saving",
          kpiMatchSub: function (sav) { return "Avg Discount: -" + sav + "%"; },
          filterPrefix: "BI Filter: ",
          chartTrendTitle: "Daily Demand vs. Conversions",
          chartTrendSub: "Native BI trend chart controlled directly by Data Science",
          legendIn: "● Input Volume",
          legendOut: "● Accepted / Selected",
          noDailyData: "No daily data points for this filter.",
          outcomeTitle: "Bid Outcome Breakdown",
          outcomeSub: "Distribution across auction outcomes for selected BI filter",
          colStatus: "Status",
          colCount: "Count",
          colShare: "Share",
          stAccepted: "Accepted (Paid)",
          stRejected: "Rejected",
          stExpired: "Expired",
          stCancelled: "Cancelled",
          funnelTitle: "GA4 8-Step Behavioral Funnel",
          funnelSub: "UNNEST(event_params) conversion drop-off inside BI tool",
          mediaTitle: "5-Category Gallery Engagement",
          mediaSub: "Image vs. Video clicks driving offer selection",
          colCategory: "Category",
          colImages: "Images",
          colVideos: "Videos",
          colTotal: "Total",
          catMap: {
            rooms: "Rooms",
            facilities: "Facilities",
            property_views: "Property Views",
            dining: "Dining",
            nearby_attractions: "Nearby Attractions",
          },
          clusterTitle: "AI Traveler Keyword Clusters (C1–C4)",
          clusterSub: "Published directly by Data Science Jupyter pipeline to BI tool",
          colCluster: "Cluster",
          colWinRate: "Win Rate",
          colSignal: "Diagnostic Signal",
        },
        ko: {
          workspaceTitle: "데이터 사이언스 BI 워크스페이스",
          sourceLive: "BigQuery 라이브 (aevo-512307)",
          sourceSeed: "오프라인 시드 스냅샷",
          lblPeriod: "조회 기간 (BI 내부)",
          lblBranch: "허용된 지점 범위",
          lblPreset: "BI 레이아웃 프리셋 (DS)",
          lblLang: "언어 (BI)",
          lblCurrency: "통화 (BI)",
          opt30d: "최근 30일",
          opt7d: "최근 7일",
          optToday: "오늘",
          allBranches: "허용된 전체 지점",
          presetExec: "프리셋 1 · 매출 및 입찰 종합",
          presetFunnel: "프리셋 2 · GA4 8단계 퍼널 & 미디어",
          presetAi: "프리셋 3 · AI 낙찰/실패 클러스터 (C1–C4)",
          ownerNote: "<strong>데이터 사이언스 자율 영역:</strong> 차트, 지표, 필터, 언어 및 통화가 BI 도구 내부에서 독립 제어됩니다.",
          rbacBanner: "🔒 Restricted by RBAC Token — <strong>" + DATA.roleKey + "</strong> 역할의 매출/GMV 지표가 서버에서 마스킹되었습니다.",
          kpiRevenue: "순매출 (호텔 정산)",
          kpiRevenueMasked: "제한됨 (RBAC)",
          kpiRevenueMaskedSub: "서버 RBAC 토큰으로 보호됨",
          kpiGmvPrefix: "GMV: ",
          kpiBids: "총 제안 건수",
          kpiBidsSub: function (won, rej) { return "낙찰: " + won + " · 거절: " + rej; },
          kpiAccept: "수락률",
          kpiAcceptSub: function (v2s) { return "조회 → 선택: " + v2s + "%"; },
          kpiMatch: "평균 매칭 / 할인율",
          kpiMatchSub: function (sav) { return "평균 할인: -" + sav + "%"; },
          filterPrefix: "BI 필터: ",
          chartTrendTitle: "일별 수요 및 전환 추이",
          chartTrendSub: "데이터 팀이 BI 도구에서 직접 관리하는 트렌드 차트",
          legendIn: "● 유입 / 조회량",
          legendOut: "● 선택 / 결제 완료",
          noDailyData: "선택한 기간에 일별 데이터가 없습니다.",
          outcomeTitle: "제안 결과 분포",
          outcomeSub: "BI 내부 필터 기준 입찰 상태별 비중",
          colStatus: "상태",
          colCount: "건수",
          colShare: "비중",
          stAccepted: "수락됨 (결제 완료)",
          stRejected: "거절됨",
          stExpired: "만료됨",
          stCancelled: "취소됨",
          funnelTitle: "GA4 8단계 행동 퍼널",
          funnelSub: "BI 도구 내 UNNEST(event_params) 단계별 전환율",
          mediaTitle: "5개 영역 갤러리 참여도",
          mediaSub: "제안 선택을 이끄는 이미지 vs 동영상 클릭",
          colCategory: "카테고리",
          colImages: "이미지",
          colVideos: "동영상",
          colTotal: "합계",
          catMap: {
            rooms: "객실",
            facilities: "부대시설",
            property_views: "외관",
            dining: "다이닝",
            nearby_attractions: "주변 명소",
          },
          clusterTitle: "AI 여행객 키워드 클러스터 (C1–C4)",
          clusterSub: "데이터 사이언스 Jupyter 파이프라인에서 BI로 직접 발행",
          colCluster: "클러스터",
          colWinRate: "낙찰률",
          colSignal: "진단 신호",
        },
      };

      langEl.value = DATA.initialLang || "vi";
      currencyEl.value = DATA.initialCurrency || "VND";
      presetEl.value = DATA.initialPreset || "executive";

      function getBranchName(bid, lang) {
        const entry = DATA.branchLabels[bid];
        if (!entry) return bid;
        return entry[lang] || entry.en || bid;
      }

      function rebuildBranchOptions(lang) {
        const prev = branchEl.value;
        const t = I18N[lang] || I18N.vi;
        branchEl.innerHTML = "";
        if (DATA.canViewChainAll && DATA.allowedBranchIds.length > 1) {
          const allOpt = document.createElement("option");
          allOpt.value = "ALL_AUTHORIZED";
          allOpt.textContent = t.allBranches + " (" + DATA.allowedBranchIds.length + ")";
          branchEl.appendChild(allOpt);
        }
        DATA.allowedBranchIds.forEach(function (bid) {
          const opt = document.createElement("option");
          opt.value = bid;
          opt.textContent = getBranchName(bid, lang);
          branchEl.appendChild(opt);
        });
        if (prev && Array.from(branchEl.options).some(function (o) { return o.value === prev; })) {
          branchEl.value = prev;
        }
      }

      function formatMoney(vndAmount, currency, lang) {
        const t = I18N[lang] || I18N.vi;
        if (vndAmount === null || vndAmount === undefined || !DATA.canViewFinancials) {
          return t.kpiRevenueMasked;
        }
        const rate = DATA.currencyRates[currency] || 1;
        const converted = vndAmount / rate;
        if (currency === "KRW") {
          return "₩" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(converted));
        }
        if (currency === "USD") {
          return "$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(converted));
        }
        return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Math.round(converted)) + " ₫";
      }

      function aggregate(period, branchSel, lang) {
        const t = I18N[lang] || I18N.vi;
        const matched = DATA.records.filter(function (r) {
          return r.period === period && (branchSel === "ALL_AUTHORIZED" || r.branchId === branchSel);
        });
        if (matched.length === 0) return null;
        if (matched.length === 1) {
          return Object.assign({}, matched[0], {
            branchLabel: getBranchName(matched[0].branchId, lang),
          });
        }

        const sum = function (fn) { return matched.reduce(function (a, b) { return a + fn(b); }, 0); };
        const totalBids = sum(function (r) { return r.totalBids; });
        const wonBids = sum(function (r) { return r.wonBids; });
        const rejectedBids = sum(function (r) { return r.rejectedBids; });
        const expiredBids = sum(function (r) { return r.expiredBids; });
        const cancelledBids = sum(function (r) { return r.cancelledBids; });
        const uniqueViewedOffers = sum(function (r) { return r.uniqueViewedOffers; });
        const uniqueSelectedOffers = sum(function (r) { return r.uniqueSelectedOffers; });
        const netRevenueVnd = DATA.canViewFinancials ? sum(function (r) { return r.netRevenueVnd || 0; }) : null;
        const grossGmvVnd = DATA.canViewFinancials ? sum(function (r) { return r.grossGmvVnd || 0; }) : null;

        const dayMap = new Map();
        matched.forEach(function (r) {
          r.dailySeries.forEach(function (pt) {
            const cur = dayMap.get(pt.date) || { date: pt.date, input: 0, output: 0, revenueVnd: 0 };
            cur.input += pt.input;
            cur.output += pt.output;
            cur.revenueVnd += pt.revenueVnd || 0;
            dayMap.set(pt.date, cur);
          });
        });
        const dailySeries = Array.from(dayMap.values())
          .sort(function (a, b) { return a.date.localeCompare(b.date); })
          .map(function (pt) {
            return {
              date: pt.date,
              input: pt.input,
              output: pt.output,
              ratioPct: pt.input > 0 ? Number(((pt.output / pt.input) * 100).toFixed(1)) : 0,
              revenueVnd: DATA.canViewFinancials ? pt.revenueVnd : null,
            };
          });

        const funnel = matched[0].funnel.map(function (step, idx) {
          const totalCount = matched.reduce(function (acc, r) { return acc + (r.funnel[idx] ? r.funnel[idx].count : 0); }, 0);
          return {
            step: step.step,
            labelVi: step.labelVi,
            labelEn: step.labelEn,
            labelKo: step.labelKo,
            count: totalCount,
            pct: 0,
          };
        });
        const baseCount = Math.max(1, funnel[0] ? funnel[0].count : 1);
        funnel.forEach(function (f) { f.pct = Number(((f.count / baseCount) * 100).toFixed(1)); });

        const media = matched[0].media.map(function (m, idx) {
          return {
            categoryKey: m.categoryKey,
            images: matched.reduce(function (acc, r) { return acc + (r.media[idx] ? r.media[idx].images : 0); }, 0),
            videos: matched.reduce(function (acc, r) { return acc + (r.media[idx] ? r.media[idx].videos : 0); }, 0),
          };
        });

        return {
          branchId: "ALL_AUTHORIZED",
          branchLabel: t.allBranches,
          period: period,
          totalBids: totalBids,
          wonBids: wonBids,
          rejectedBids: rejectedBids,
          expiredBids: expiredBids,
          cancelledBids: cancelledBids,
          acceptRatePct: totalBids > 0 ? Number(((wonBids / totalBids) * 100).toFixed(1)) : 0,
          netRevenueVnd: netRevenueVnd,
          grossGmvVnd: grossGmvVnd,
          uniqueViewedOffers: uniqueViewedOffers,
          uniqueSelectedOffers: uniqueSelectedOffers,
          viewToSelectPct: uniqueViewedOffers > 0 ? Number(((uniqueSelectedOffers / uniqueViewedOffers) * 100).toFixed(1)) : 0,
          avgSavingPct: Number((sum(function (r) { return r.avgSavingPct; }) / matched.length).toFixed(1)),
          avgMatchPct: Number((sum(function (r) { return r.avgMatchPct; }) / matched.length).toFixed(1)),
          dailySeries: dailySeries,
          funnel: funnel,
          media: media,
          clusters: matched[0].clusters,
        };
      }

      function renderLineSvg(series, t) {
        const w = 480;
        const h = 160;
        const pad = 26;
        if (!series || series.length === 0) {
          return '<div style="font-size:12px;color:#64748b;padding:24px 0;">' + t.noDailyData + '</div>';
        }
        const maxVal = Math.max(1, ...series.map(function (d) { return Math.max(d.input, d.output); }));
        const stepX = series.length > 1 ? (w - pad * 2) / (series.length - 1) : 0;
        const ptsIn = series.map(function (d, i) {
          const x = pad + i * stepX;
          const y = h - pad - (d.input / maxVal) * (h - pad * 2);
          return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");
        const ptsOut = series.map(function (d, i) {
          const x = pad + i * stepX;
          const y = h - pad - (d.output / maxVal) * (h - pad * 2);
          return x.toFixed(1) + "," + y.toFixed(1);
        }).join(" ");

        return (
          '<div class="svg-wrap"><svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="160" role="img" aria-label="Daily Trend">' +
          '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '" stroke="#cbd5e1" />' +
          '<polyline fill="none" stroke="#0284c7" stroke-width="2.5" points="' + ptsIn + '" />' +
          '<polyline fill="none" stroke="#10b981" stroke-width="2.5" points="' + ptsOut + '" />' +
          '<text x="' + pad + '" y="14" font-size="10.5" fill="#0284c7">' + t.legendIn + '</text>' +
          '<text x="176" y="14" font-size="10.5" fill="#10b981">' + t.legendOut + '</text>' +
          '</svg></div>'
        );
      }

      function applyStaticLabels(lang) {
        const t = I18N[lang] || I18N.vi;
        document.documentElement.lang = lang;
        headerTitleEl.textContent = t.workspaceTitle + " · " + DATA.slotId;
        sourcePillEl.textContent = DATA.sourceKey === "live_bq" ? t.sourceLive : t.sourceSeed;
        document.getElementById("lbl-period").textContent = t.lblPeriod;
        document.getElementById("lbl-branch").textContent = t.lblBranch;
        document.getElementById("lbl-preset").textContent = t.lblPreset;
        document.getElementById("lbl-lang").textContent = t.lblLang;
        document.getElementById("lbl-currency").textContent = t.lblCurrency;
        periodEl.options[0].textContent = t.opt30d;
        periodEl.options[1].textContent = t.opt7d;
        periodEl.options[2].textContent = t.optToday;
        presetEl.options[0].textContent = t.presetExec;
        presetEl.options[1].textContent = t.presetFunnel;
        presetEl.options[2].textContent = t.presetAi;
        ownerNoteEl.innerHTML = t.ownerNote;
        if (rbacBannerEl) {
          rbacBannerEl.innerHTML = t.rbacBanner;
        }
        rebuildBranchOptions(lang);
      }

      function emitHeight() {
        const h = Math.max(460, Math.min(2200, document.documentElement.scrollHeight + 12));
        window.parent.postMessage({ type: "gns:viewport:resize", slotId: DATA.slotId, heightPx: h }, "*");
      }

      function render() {
        const lang = langEl.value || "vi";
        const currency = currencyEl.value || "VND";
        const t = I18N[lang] || I18N.vi;
        applyStaticLabels(lang);

        const period = periodEl.value;
        const branchSel = branchEl.value;
        const preset = presetEl.value;
        const agg = aggregate(period, branchSel, lang);
        if (!agg) return;

        summaryEl.textContent = t.filterPrefix + period.toUpperCase() + " · " + agg.branchLabel + " · " + currency;

        const kpis = [
          {
            testId: "bi-kpi-revenue-val",
            label: t.kpiRevenue,
            val: formatMoney(agg.netRevenueVnd, currency, lang),
            sub: DATA.canViewFinancials
              ? t.kpiGmvPrefix + formatMoney(agg.grossGmvVnd, currency, lang)
              : t.kpiRevenueMaskedSub,
          },
          {
            testId: "bi-kpi-bids-val",
            label: t.kpiBids,
            val: String(agg.totalBids),
            sub: t.kpiBidsSub(agg.wonBids, agg.rejectedBids),
          },
          {
            testId: "bi-kpi-accept-val",
            label: t.kpiAccept,
            val: agg.acceptRatePct + "%",
            sub: t.kpiAcceptSub(agg.viewToSelectPct),
          },
          {
            testId: "bi-kpi-match-val",
            label: t.kpiMatch,
            val: agg.avgMatchPct + "%",
            sub: t.kpiMatchSub(agg.avgSavingPct),
          },
        ];
        kpiGrid.innerHTML = kpis.map(function (k) {
          return '<div class="kpi-card"><div class="kpi-label">' + k.label + '</div><div class="kpi-val" data-testid="' + k.testId + '">' + k.val + '</div><div class="kpi-sub">' + k.sub + '</div></div>';
        }).join("");

        if (preset === "executive") {
          panelGrid.innerHTML =
            '<div class="panel"><h3>' + t.chartTrendTitle + '</h3><p class="sub">' + t.chartTrendSub + '</p>' +
            renderLineSvg(agg.dailySeries, t) +
            '</div>' +
            '<div class="panel"><h3>' + t.outcomeTitle + '</h3><p class="sub">' + t.outcomeSub + '</p>' +
            '<table><thead><tr><th>' + t.colStatus + '</th><th class="num">' + t.colCount + '</th><th class="num">' + t.colShare + '</th></tr></thead><tbody>' +
            [
              [t.stAccepted, agg.wonBids],
              [t.stRejected, agg.rejectedBids],
              [t.stExpired, agg.expiredBids],
              [t.stCancelled, agg.cancelledBids],
            ].map(function (row) {
              const pct = agg.totalBids > 0 ? ((row[1] / agg.totalBids) * 100).toFixed(1) : "0.0";
              return '<tr><td>' + row[0] + '</td><td class="num">' + row[1] + '</td><td class="num">' + pct + '%</td></tr>';
            }).join("") +
            '</tbody></table></div>';
        } else if (preset === "funnel") {
          const maxF = Math.max(1, ...agg.funnel.map(function (f) { return f.count; }));
          panelGrid.innerHTML =
            '<div class="panel"><h3>' + t.funnelTitle + '</h3><p class="sub">' + t.funnelSub + '</p>' +
            agg.funnel.map(function (f) {
              const pctW = Math.max(4, Math.round((f.count / maxF) * 100));
              const stepLabel = lang === "vi" ? f.labelVi : lang === "ko" ? f.labelKo : f.labelEn;
              return '<div class="bar-row"><span>' + f.step + ' · ' + stepLabel + '</span><div class="bar-track"><div class="bar-fill" style="width:' + pctW + '%"></div></div><span class="num">' + f.count + ' (' + f.pct + '%)</span></div>';
            }).join("") +
            '</div>' +
            '<div class="panel"><h3>' + t.mediaTitle + '</h3><p class="sub">' + t.mediaSub + '</p>' +
            '<table><thead><tr><th>' + t.colCategory + '</th><th class="num">' + t.colImages + '</th><th class="num">' + t.colVideos + '</th><th class="num">' + t.colTotal + '</th></tr></thead><tbody>' +
            agg.media.map(function (m) {
              const catLabel = (t.catMap && t.catMap[m.categoryKey]) || m.categoryKey;
              return '<tr><td>' + catLabel + '</td><td class="num">' + m.images + '</td><td class="num">' + m.videos + '</td><td class="num">' + (m.images + m.videos) + '</td></tr>';
            }).join("") +
            '</tbody></table></div>';
        } else {
          panelGrid.innerHTML =
            '<div class="panel"><h3>' + t.clusterTitle + '</h3><p class="sub">' + t.clusterSub + '</p>' +
            '<table><thead><tr><th>' + t.colCluster + '</th><th class="num">' + t.colShare + '</th><th class="num">' + t.colWinRate + '</th><th>' + t.colSignal + '</th></tr></thead><tbody>' +
            agg.clusters.map(function (c) {
              const title = lang === "vi" ? c.titleVi : lang === "ko" ? c.titleKo : c.titleEn;
              const signal = lang === "vi" ? c.signalVi : lang === "ko" ? c.signalKo : c.signalEn;
              return '<tr><td><strong>' + title + '</strong></td><td class="num">' + c.sharePct + '%</td><td class="num">' + c.winRatePct + '%</td><td>' + signal + '</td></tr>';
            }).join("") +
            '</tbody></table></div>';
        }

        requestAnimationFrame(emitHeight);
      }

      periodEl.addEventListener("change", render);
      branchEl.addEventListener("change", render);
      presetEl.addEventListener("change", render);
      langEl.addEventListener("change", render);
      currencyEl.addEventListener("change", render);

      rebuildBranchOptions(langEl.value || "vi");
      render();
      window.parent.postMessage({ type: "gns:viewport:ready", slotId: DATA.slotId }, "*");
      window.addEventListener("resize", emitHeight);
    })();
  </script>
</body>
</html>`;

  return { statusCode: 200, html };
}
