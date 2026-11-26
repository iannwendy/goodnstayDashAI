import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Maximize2,
  Minimize2,
  MonitorPlay,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { AppLocale } from "@/data";
import {
  VIEWPORT_SLOTS,
  clearDemoViewportOverride,
  getEffectiveAllowedOrigins,
  getRuntimeEnvAllowedOrigins,
  isViewportDemoToolsEnabled,
  readDemoViewportOverride,
  resolveViewportSandboxPolicy,
  saveDemoViewportOverride,
  validateViewportEmbedUrl,
  type DemoViewportOverride,
  type ViewportSlotId,
} from "@/lib/viewportRegistry";
import {
  requestViewportEmbedSession,
  type ViewportEmbedSession,
} from "@/services/viewportEmbedService";

interface BiViewportFrameProps {
  slotId: ViewportSlotId;
  activeUserId: string;
  canUseDemoTools: boolean;
  locale: AppLocale;
  onFallbackToNative: () => void;
}

const MIN_IFRAME_HEIGHT = 420;
const MAX_IFRAME_HEIGHT = 2400;

function getFrameCopy(locale: AppLocale) {
  if (locale === "en") {
    return {
      loadingText: "Connecting to BI Viewport & signing scoped embed token...",
      reloadBtn: "Reload",
      fullscreenBtn: "Fullscreen",
      exitFullscreenBtn: "Exit Fullscreen",
      demoConfigBtn: "Swap URL (Demo)",
      demoPanelTitle: "CTO Demo · Hot-Swap BI Viewport Source (Zero FE Code Change)",
      demoPresetLabel: "Switch BI Tool Layout Preset (Simulated DS Update)",
      demoCustomUrlLabel: "Or paste a BI Embed URL (Looker Studio / Metabase / Superset)",
      demoAllowExternalLabel: "Allow external HTTPS BI URL (Dev Demo only)",
      demoApplyBtn: "Apply to Viewport",
      demoResetBtn: "Reset to Server Default",
      demoContractHeading: "Active Embed Session Contract (FE ↔ Backend/Data)",
      demoOverrideBanner:
        "DEV DEMO OVERRIDE ACTIVE — Displaying custom test URL/preset. Production strictly enforces server-issued signed embed tokens.",
      errorTitle: "BI Viewport is currently unavailable",
      errorSubtitle:
        "Operational tabs (Calendar, Rooms, Bidding, Messages, Recent Bookings) stay 100% isolated and unaffected.",
      errorStartHint: "Start the local Embed Broker / BFF (:4000) to load the BI Viewport:",
      retryBtn: "Retry Viewport",
      fallbackBtn: "Switch to Local JSON",
      filtersInsidePill: "Filters Inside BI",
      sandboxCrossLabel: "Cross-Origin Isolated",
      sandboxSameLabel: "Same-Origin Sandboxed",
      rbacMaskedBadge: "Financials Masked (RBAC)",
    };
  }
  if (locale === "ko") {
    return {
      loadingText: "BI 뷰포트 연결 및 권한 서명 토큰을 발급하는 중...",
      reloadBtn: "새로고침",
      fullscreenBtn: "전체 화면",
      exitFullscreenBtn: "전체 화면 닫기",
      demoConfigBtn: "URL 교체 (데모)",
      demoPanelTitle: "CTO 데모 · BI 뷰포트 소스 즉시 교체 (프런트엔드 수정 없음)",
      demoPresetLabel: "BI 레이아웃 프리셋 전환 (데이터 팀 자율 변경 시뮬레이션)",
      demoCustomUrlLabel: "또는 외부 BI 임베드 URL 입력 (Looker / Metabase / Superset)",
      demoAllowExternalLabel: "외부 HTTPS BI URL 허용 (개발 데모 전용)",
      demoApplyBtn: "뷰포트에 적용",
      demoResetBtn: "서버 기본값 복원",
      demoContractHeading: "현재 임베드 세션 계약 (FE ↔ Backend/Data)",
      demoOverrideBanner:
        "DEV DEMO OVERRIDE 활성 — 테스트 URL/프리셋 표시 중. 운영 환경은 서버 서명 토큰만 허용합니다.",
      errorTitle: "BI 뷰포트에 현재 연결할 수 없습니다",
      errorSubtitle:
        "예약 캘린더·객실·입찰·메시지 등 운영 화면은 완전히 격리되어 정상 작동합니다.",
      errorStartHint: "BI 뷰포트를 보려면 로컬 BFF(:4000)를 실행하세요:",
      retryBtn: "다시 시도",
      fallbackBtn: "Local JSON으로 전환",
      filtersInsidePill: "BI 내부 필터",
      sandboxCrossLabel: "Cross-Origin 격리",
      sandboxSameLabel: "Same-Origin 샌드박스",
      rbacMaskedBadge: "매출 마스킹 (RBAC)",
    };
  }
  return {
    loadingText: "Đang cấp phiên BI Viewport và ký token phân quyền chi nhánh...",
    reloadBtn: "Tải lại",
    fullscreenBtn: "Toàn màn hình",
    exitFullscreenBtn: "Thu nhỏ",
    demoConfigBtn: "Đổi URL (Demo)",
    demoPanelTitle: "Demo CTO · Đổi Nguồn BI Viewport Trực Tiếp (Không Sửa Code FE)",
    demoPresetLabel: "Đổi mẫu bố cục trên BI Tool (Mô phỏng đội Data Science tự chỉnh)",
    demoCustomUrlLabel: "Hoặc dán link BI Embed thử nghiệm (Looker Studio / Metabase / Superset)",
    demoAllowExternalLabel: "Cho phép link HTTPS BI ngoài allowlist (Chỉ dùng Dev Demo)",
    demoApplyBtn: "Áp dụng vào Viewport",
    demoResetBtn: "Khôi phục mặc định Server",
    demoContractHeading: "Payload Hợp Đồng Kết Nối Hiện Tại (FE ↔ Backend/Data)",
    demoOverrideBanner:
      "DEV DEMO OVERRIDE — Đang chạy nguồn/preset thử nghiệm cục bộ. Production chỉ chấp nhận Signed Token do Server cấp.",
    errorTitle: "Không thể kết nối BI Viewport lúc này",
    errorSubtitle:
      "Các phân hệ vận hành (Lịch phòng, Đấu giá, Phòng, Tin nhắn, Đơn gần đây) vẫn hoạt động hoàn toàn độc lập.",
    errorStartHint: "Khởi chạy dịch vụ BFF (:4000) để tải BI Viewport:",
    retryBtn: "Thử lại",
    fallbackBtn: "Về giao diện Local JSON",
    filtersInsidePill: "Bộ lọc bên trong BI",
    sandboxCrossLabel: "Cách ly Cross-Origin",
    sandboxSameLabel: "Sandbox Same-Origin",
    rbacMaskedBadge: "Đã che tài chính (RBAC)",
  };
}

export function BiViewportFrame({
  slotId,
  activeUserId,
  canUseDemoTools,
  locale,
  onFallbackToNative,
}: BiViewportFrameProps) {
  const slotMeta = VIEWPORT_SLOTS[slotId];
  const copy = getFrameCopy(locale);
  const showDemoControls = canUseDemoTools && isViewportDemoToolsEnabled();

  const [session, setSession] = useState<ViewportEmbedSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState<number>(slotMeta.defaultMinHeightPx);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [refreshNonce, setRefreshNonce] = useState<number>(0);

  const [demoPanelOpen, setDemoPanelOpen] = useState<boolean>(false);
  const [demoOverride, setDemoOverride] = useState<DemoViewportOverride | null>(() =>
    showDemoControls ? readDemoViewportOverride(slotId) : null,
  );
  const [customUrlInput, setCustomUrlInput] = useState<string>(
    () => (showDemoControls ? readDemoViewportOverride(slotId)?.customUrl ?? "" : ""),
  );
  const [allowExternalHttps, setAllowExternalHttps] = useState<boolean>(
    () => (showDemoControls ? Boolean(readDemoViewportOverride(slotId)?.allowExternalHttps) : false),
  );
  const [demoValidationError, setDemoValidationError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const localeRef = useRef<AppLocale>(locale);
  localeRef.current = locale;

  // Reset slot-scoped demo override when switching slots or losing demo privileges (e.g. switching to receptionist)
  useEffect(() => {
    if (!showDemoControls) {
      setDemoPanelOpen(false);
      setDemoOverride(null);
      setDemoValidationError(null);
      return;
    }
    const stored = readDemoViewportOverride(slotId);
    setDemoOverride(stored);
    setCustomUrlInput(stored?.customUrl ?? "");
    setAllowExternalHttps(Boolean(stored?.allowExternalHttps));
    setDemoValidationError(null);
  }, [slotId, showDemoControls]);

  const currentOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:5182";

  const allowedOrigins = useMemo(
    () => getEffectiveAllowedOrigins(currentOrigin, getRuntimeEnvAllowedOrigins()),
    [currentOrigin],
  );

  const activePresetHint = showDemoControls ? demoOverride?.presetHint : undefined;
  const activeCustomUrl = showDemoControls ? demoOverride?.customUrl?.trim() || "" : "";
  const activeAllowExternal = showDemoControls ? Boolean(demoOverride?.allowExternalHttps) : false;

  // Fetch server-signed embed session strictly on (slotId, activeUserId, refreshNonce, activePresetHint)
  // Intentionally ignores Header propertyKey & periodKey so BI internal filters remain authoritative.
  useEffect(() => {
    let cancelled = false;

    if (activeCustomUrl) {
      const check = validateViewportEmbedUrl(activeCustomUrl, {
        currentOrigin,
        allowedOrigins,
        allowExternalHttpsDemo: activeAllowExternal,
      });
      if (!check.ok) {
        setErrorMsg(check.reason ?? "Invalid demo override URL.");
        setLoading(false);
        return;
      }
      setErrorMsg(null);
      setLoading(false);
      setIframeLoaded(false);
      return;
    }

    setLoading(true);
    setIframeLoaded(false);
    setErrorMsg(null);

    requestViewportEmbedSession({
      slotId,
      userId: activeUserId,
      localeHint: localeRef.current,
      presetHint: activePresetHint,
    })
      .then((res) => {
        if (cancelled) return;
        const urlCheck = validateViewportEmbedUrl(res.embedUrl, {
          currentOrigin,
          allowedOrigins,
          allowExternalHttpsDemo: false,
        });
        if (!urlCheck.ok) {
          setSession(null);
          setErrorMsg(
            `Blocked untrusted BI embedUrl from server: ${urlCheck.reason ?? res.embedUrl}`,
          );
          setLoading(false);
          return;
        }
        setSession(res);
        setFrameHeight(Math.max(MIN_IFRAME_HEIGHT, res.minHeightPx || slotMeta.defaultMinHeightPx));
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setSession(null);
        setErrorMsg(err instanceof Error ? err.message : "Unable to load BI Viewport.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    slotId,
    activeUserId,
    refreshNonce,
    activePresetHint,
    activeCustomUrl,
    activeAllowExternal,
    currentOrigin,
    allowedOrigins,
    slotMeta.defaultMinHeightPx,
  ]);

  // Proactive token refresh 60 seconds before expiresAt
  useEffect(() => {
    if (!session?.expiresAt || activeCustomUrl) return;
    const expiresMs = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresMs)) return;
    const delayMs = Math.max(15_000, expiresMs - Date.now() - 60_000);
    const timer = window.setTimeout(() => {
      setRefreshNonce((n) => n + 1);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [session?.expiresAt, activeCustomUrl]);

  const effectiveEmbedUrl = useMemo(() => {
    if (activeCustomUrl) {
      const check = validateViewportEmbedUrl(activeCustomUrl, {
        currentOrigin,
        allowedOrigins,
        allowExternalHttpsDemo: activeAllowExternal,
      });
      return check.ok ? check.normalizedUrl : null;
    }
    return session?.embedUrl ?? null;
  }, [activeCustomUrl, activeAllowExternal, allowedOrigins, currentOrigin, session?.embedUrl]);

  const sandboxPolicy = useMemo(() => {
    if (!effectiveEmbedUrl) return null;
    return resolveViewportSandboxPolicy(effectiveEmbedUrl, currentOrigin);
  }, [effectiveEmbedUrl, currentOrigin]);

  // Strict origin + source verified postMessage lifecycle listener
  useEffect(() => {
    if (!sandboxPolicy) return;

    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }
      if (event.origin !== sandboxPolicy.expectedPostMessageOrigin) {
        return;
      }
      const data = event.data as {
        type?: string;
        slotId?: string;
        heightPx?: number;
        message?: string;
      } | null;
      if (!data || typeof data !== "object") return;
      if (data.slotId && data.slotId !== slotId) return;

      if (data.type === "gns:viewport:ready") {
        setIframeLoaded(true);
      } else if (data.type === "gns:viewport:resize" && typeof data.heightPx === "number") {
        const clamped = Math.max(
          MIN_IFRAME_HEIGHT,
          Math.min(MAX_IFRAME_HEIGHT, Math.round(data.heightPx)),
        );
        setFrameHeight(clamped);
      } else if (data.type === "gns:viewport:error" && typeof data.message === "string") {
        setErrorMsg(data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [sandboxPolicy, slotId]);

  // Escape exits fullscreen cleanly
  useEffect(() => {
    if (!fullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  const handleApplyPreset = (presetHint: "executive" | "funnel" | "ai_clusters") => {
    const next: DemoViewportOverride = { presetHint };
    saveDemoViewportOverride(slotId, next);
    setDemoOverride(next);
    setCustomUrlInput("");
    setDemoValidationError(null);
  };

  const handleApplyCustomUrl = () => {
    const check = validateViewportEmbedUrl(customUrlInput, {
      currentOrigin,
      allowedOrigins,
      allowExternalHttpsDemo: allowExternalHttps,
    });
    if (!check.ok) {
      setDemoValidationError(check.reason ?? "Invalid URL.");
      return;
    }
    const next: DemoViewportOverride = {
      customUrl: check.normalizedUrl,
      allowExternalHttps,
    };
    saveDemoViewportOverride(slotId, next);
    setDemoOverride(next);
    setDemoValidationError(null);
  };

  const handleResetDemoOverride = () => {
    clearDemoViewportOverride(slotId);
    setDemoOverride(null);
    setCustomUrlInput("");
    setAllowExternalHttps(false);
    setDemoValidationError(null);
    setRefreshNonce((n) => n + 1);
  };

  const isDemoOverrideActive = showDemoControls && Boolean(activeCustomUrl || activePresetHint);

  return (
    <section
      data-testid={`bi-viewport-frame-${slotId}`}
      aria-label={slotMeta.label[locale]}
      className={
        fullscreen
          ? "fixed inset-0 z-50 bg-slate-950/75 p-2 sm:p-4 flex flex-col min-w-0"
          : "rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden min-w-0"
      }
    >
      <div
        className={
          fullscreen
            ? "flex-1 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden min-w-0"
            : "flex flex-col min-w-0"
        }
      >
        {/* Minimal Host Chrome Header */}
        <div className="px-3.5 sm:px-5 py-3 border-b border-slate-200/80 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 shrink-0">
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>{slotMeta.label[locale]}</span>
              </span>

              {session && !activeCustomUrl && (
                <span
                  data-testid={`bi-viewport-provider-${slotId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                >
                  <span>{session.provider}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>{copy.filtersInsidePill}</span>
              </span>

              {sandboxPolicy && (
                <span
                  data-testid={`bi-viewport-sandbox-badge-${slotId}`}
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10.5px] font-medium text-slate-600"
                >
                  <ShieldCheck className="w-3 h-3 text-slate-500 shrink-0" />
                  <span>
                    {sandboxPolicy.isSameOrigin
                      ? copy.sandboxSameLabel
                      : copy.sandboxCrossLabel}
                  </span>
                </span>
              )}

              {session && !session.scopeSummary.canViewFinancials && (
                <span
                  data-testid={`bi-viewport-rbac-masked-${slotId}`}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800"
                >
                  {copy.rbacMaskedBadge}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-slate-500 mt-1 mb-0 truncate">
              {slotMeta.subtitle[locale]}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              data-testid="bi-viewport-reload-btn"
              onClick={() => setRefreshNonce((n) => n + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{copy.reloadBtn}</span>
            </button>

            {slotMeta.allowFullscreen && (
              <button
                type="button"
                data-testid="bi-viewport-fullscreen-btn"
                onClick={() => setFullscreen((f) => !f)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {fullscreen ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>{copy.exitFullscreenBtn}</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>{copy.fullscreenBtn}</span>
                  </>
                )}
              </button>
            )}

            {showDemoControls && (
              <button
                type="button"
                data-testid="bi-viewport-demo-config-btn"
                onClick={() => setDemoPanelOpen((o) => !o)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                  demoPanelOpen || isDemoOverrideActive
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{copy.demoConfigBtn}</span>
              </button>
            )}
          </div>
        </div>

        {/* DEV DEMO OVERRIDE Warning Banner */}
        {isDemoOverrideActive && (
          <div
            data-testid="bi-viewport-demo-override-banner"
            className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-amber-900"
          >
            <span className="font-medium">{copy.demoOverrideBanner}</span>
            <button
              type="button"
              data-testid="bi-viewport-demo-reset-banner-btn"
              onClick={handleResetDemoOverride}
              className="inline-flex items-center gap-1 rounded-md bg-white border border-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{copy.demoResetBtn}</span>
            </button>
          </div>
        )}

        {/* Dev-Only Manager-Only Swap URL & Contract Inspector Drawer */}
        {showDemoControls && demoPanelOpen && (
          <div
            data-testid="bi-viewport-demo-panel"
            className="px-4 py-3.5 bg-slate-900 text-slate-100 border-b border-slate-700 space-y-3 text-[12px]"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-slate-100 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{copy.demoPanelTitle}</span>
              </div>
              <button
                type="button"
                aria-label="Close demo panel"
                onClick={() => setDemoPanelOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">
                {copy.demoPresetLabel}
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "executive", label: "Preset 1 · Executive Revenue" },
                    { id: "funnel", label: "Preset 2 · GA4 8-Step Funnel" },
                    { id: "ai_clusters", label: "Preset 3 · AI Clusters C1–C4" },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    data-testid={`bi-demo-preset-${preset.id}`}
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold border transition-colors ${
                      activePresetHint === preset.id && !activeCustomUrl
                        ? "bg-sky-600 border-sky-400 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label
                htmlFor={`bi-custom-url-${slotId}`}
                className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wide"
              >
                {copy.demoCustomUrlLabel}
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id={`bi-custom-url-${slotId}`}
                  data-testid="bi-demo-custom-url-input"
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder="https://lookerstudio.google.com/embed/reporting/..."
                  className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-[12px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  data-testid="bi-demo-apply-url-btn"
                  onClick={handleApplyCustomUrl}
                  className="rounded-lg bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 text-[12px] font-semibold shrink-0"
                >
                  {copy.demoApplyBtn}
                </button>
                <button
                  type="button"
                  data-testid="bi-demo-reset-btn"
                  onClick={handleResetDemoOverride}
                  className="rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-[12px] font-semibold shrink-0"
                >
                  {copy.demoResetBtn}
                </button>
              </div>
              <label className="inline-flex items-center gap-2 text-[11.5px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  data-testid="bi-demo-allow-external-checkbox"
                  checked={allowExternalHttps}
                  onChange={(e) => setAllowExternalHttps(e.target.checked)}
                  className="rounded border-slate-600"
                />
                <span>{copy.demoAllowExternalLabel}</span>
              </label>
              {demoValidationError && (
                <div
                  data-testid="bi-demo-validation-error"
                  className="rounded-lg bg-red-950/70 border border-red-700 px-3 py-1.5 text-[11.5px] text-red-200"
                >
                  {demoValidationError}
                </div>
              )}
            </div>

            {session && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 mb-1">
                  {copy.demoContractHeading}
                </div>
                <pre className="m-0 rounded-lg bg-slate-950 p-2.5 text-[10.5px] text-emerald-300 overflow-x-auto max-h-36">
                  {JSON.stringify(
                    {
                      slotId: session.slotId,
                      provider: session.provider,
                      expiresAt: session.expiresAt,
                      minHeightPx: session.minHeightPx,
                      scopeSummary: session.scopeSummary,
                      sandbox: sandboxPolicy?.sandboxAttr,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Main Viewport Canvas (Loading / Error / Sandboxed Iframe) */}
        <div
          className={
            fullscreen
              ? "relative flex-1 min-h-0 bg-slate-100 overflow-hidden"
              : "relative w-full min-w-0 bg-slate-100/70 overflow-hidden"
          }
          style={fullscreen ? undefined : { minHeight: `${Math.min(frameHeight, 620)}px` }}
        >
          {errorMsg ? (
            <div
              data-testid="bi-viewport-error-card"
              className="p-6 sm:p-10 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-3"
            >
              <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-[16px] font-bold text-slate-900 m-0">
                {copy.errorTitle}
              </h3>
              <p className="text-[12.5px] text-slate-600 m-0 leading-relaxed">
                {copy.errorSubtitle}
              </p>
              <div className="w-full rounded-lg bg-slate-900 text-amber-300 px-3 py-2 text-[11.5px] font-mono break-all text-left">
                {errorMsg}
              </div>
              <div className="w-full text-[11.5px] text-slate-500">
                {copy.errorStartHint}{" "}
                <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-slate-800">
                  cd dashboard/bigquery-bff && npm run dev
                </code>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  data-testid="bi-viewport-retry-btn"
                  onClick={() => setRefreshNonce((n) => n + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-[12.5px] font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{copy.retryBtn}</span>
                </button>
                <button
                  type="button"
                  data-testid="bi-viewport-fallback-btn"
                  onClick={onFallbackToNative}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 text-[12.5px] font-semibold"
                >
                  <span>{copy.fallbackBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {(loading || !iframeLoaded) && (
                <div
                  data-testid={`bi-viewport-skeleton-${slotId}`}
                  className="absolute inset-0 z-10 bg-white/95 p-6 flex flex-col justify-center items-center gap-3 text-center pointer-events-none"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                  <div className="text-[13px] font-medium text-slate-600">
                    {copy.loadingText}
                  </div>
                </div>
              )}

              {effectiveEmbedUrl && sandboxPolicy && (
                <iframe
                  ref={iframeRef}
                  key={`${slotId}:${effectiveEmbedUrl}`}
                  data-testid={`bi-viewport-iframe-${slotId}`}
                  title={slotMeta.label[locale]}
                  src={effectiveEmbedUrl}
                  sandbox={sandboxPolicy.sandboxAttr}
                  referrerPolicy="no-referrer"
                  onLoad={() => setIframeLoaded(true)}
                  className="w-full border-0 block bg-white"
                  style={
                    fullscreen
                      ? { height: "100%", minHeight: "100%" }
                      : { height: `${frameHeight}px`, minHeight: `${MIN_IFRAME_HEIGHT}px` }
                  }
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
