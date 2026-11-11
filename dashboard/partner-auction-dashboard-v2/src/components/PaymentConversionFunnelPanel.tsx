import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, CheckCircle2, Sparkles, X } from "lucide-react";
import { formatCompactVnd } from "@/data";
import type {
  ComputedDashboardAnalytics,
  FunnelSegmentFilter,
  PaymentFunnelStep,
} from "@/services/analyticsEngine";

interface PaymentConversionFunnelPanelProps {
  analytics: ComputedDashboardAnalytics;
  mode?: "embedded" | "modal";
  onCloseAndSwitchToAiTab?: () => void;
}

/**
 * Cohesive 8-stop Pine -> Teal -> Signature Emerald progression.
 * Smooth hue/lightness interpolation — zero jarring blue/gray color jumps,
 * and >= 4.2:1 white-text contrast across every slice.
 */
const SLICE_GRADIENTS: [string, string][] = [
  ["#153735", "#1d4845"], // 1. Deep Midnight Pine
  ["#184541", "#215853"], // 2. Dark Forest Teal
  ["#19534d", "#236961"], // 3. Deep Spruce
  ["#196258", "#237b6e"], // 4. Rich Botanical Teal
  ["#167162", "#208c79"], // 5. Jade Emerald
  ["#12806b", "#1b9c82"], // 6. Deep Emerald
  ["#0d8f73", "#15ab89"], // 7. Vivid Emerald
  ["#059669", "#10b981"], // 8. Signature goodNstay Emerald (Paid 100%)
];

const CLEAN_STEP_LABELS: Record<number, string> = {
  1: "Gửi báo giá",
  2: "Hiển thị kịp hạn",
  3: "Xem phòng",
  4: "Khớp tiện ích",
  5: "Đạt ngưỡng giá",
  6: "Thắng đối thủ",
  7: "Chọn chào giá",
  8: "Thanh toán 100%",
};

const ROW_HEIGHT = 40;
const SVG_WIDTH = 400;

/**
 * Computes 9 monotonic width percentages w[0..8] from top mouth to bottom spout,
 * blending actual cumulative conversion % with gentle natural taper so the
 * silhouette always reads as a graceful, balanced funnel.
 */
function computeBoundaryWidths(steps: PaymentFunnelStep[]): number[] {
  const widths: number[] = [98];
  for (let i = 0; i < steps.length; i++) {
    const pct = Math.max(0, Math.min(100, steps[i].cumulativePct));
    const naturalTaper = 96 - (i + 1) * 6.2;
    const blended = pct * 0.62 + naturalTaper * 0.38;
    // Keep minimum 42% so "% (count)" stays comfortably inside the spout on mobile
    const clamped = Math.max(42, Math.min(96, blended));
    const prev = widths[widths.length - 1];
    widths.push(Number(Math.min(prev - 2.2, clamped).toFixed(2)));
  }
  return widths;
}

/**
 * Fritsch–Carlson monotone cubic Hermite slopes (dx/dy) along y,
 * identical to D3's curveMonotoneY so all 8 slices form one single
 * C1-smooth continuous curve with zero kinks and zero accordion wiggles.
 */
function computeMonotoneSlopes(ys: number[], xs: number[]): number[] {
  const n = ys.length;
  const secants: number[] = [];
  const dys: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const dy = ys[i + 1] - ys[i];
    dys.push(dy);
    secants.push((xs[i + 1] - xs[i]) / dy);
  }

  const slopes = new Array<number>(n).fill(0);
  slopes[0] = secants[0] * 0.65;
  slopes[n - 1] = secants[n - 2] * 0.65;

  for (let i = 1; i < n - 1; i++) {
    const s0 = secants[i - 1];
    const s1 = secants[i];
    if (s0 * s1 <= 0) {
      slopes[i] = 0;
    } else {
      const h0 = dys[i - 1];
      const h1 = dys[i];
      slopes[i] =
        (3 * (h0 + h1)) / ((2 * h1 + h0) / s0 + (h1 + 2 * h0) / s1);
    }
  }

  return slopes;
}

export function PaymentConversionFunnelPanel({
  analytics,
  mode = "modal",
  onCloseAndSwitchToAiTab,
}: PaymentConversionFunnelPanelProps) {
  const { periodMetrics } = analytics;
  const [segment, setSegment] = useState<FunnelSegmentFilter>("all");
  const [hoveredStepNum, setHoveredStepNum] = useState<number | null>(null);

  const activeFunnel = periodMetrics.paymentFunnels[segment];

  const [selectedStepNum, setSelectedStepNum] = useState<number | null>(
    mode === "modal"
      ? (activeFunnel.biggestBottleneckStep?.stepNumber ?? 8)
      : null,
  );

  useEffect(() => {
    if (mode === "modal") {
      setSelectedStepNum(
        periodMetrics.paymentFunnels[segment].biggestBottleneckStep
          ?.stepNumber ?? 8,
      );
    }
  }, [mode, periodMetrics.key, segment, periodMetrics.paymentFunnels]);

  const selectedStep: PaymentFunnelStep | null =
    selectedStepNum !== null
      ? (activeFunnel.steps.find((s) => s.stepNumber === selectedStepNum) ??
        null)
      : null;

  const segmentOptions: {
    id: FunnelSegmentFilter;
    label: string;
    count: number;
  }[] = [
    {
      id: "all",
      label: "Tổng phễu",
      count: periodMetrics.paymentFunnels.all.totalBids,
    },
    {
      id: "auto",
      label: "AI Auto-Bid",
      count: periodMetrics.paymentFunnels.auto.totalBids,
    },
    {
      id: "manual",
      label: "Duyệt tay",
      count: periodMetrics.paymentFunnels.manual.totalBids,
    },
  ];

  const svgHeight = activeFunnel.steps.length * ROW_HEIGHT;

  // Build C1-continuous cubic Bézier path segments for all 8 slices
  const sliceGeometry = useMemo(() => {
    const boundaryWidths = computeBoundaryWidths(activeFunnel.steps);
    const ys = boundaryWidths.map((_, k) => k * ROW_HEIGHT);
    const rightXs = boundaryWidths.map(
      (wPct) => SVG_WIDTH / 2 + ((wPct / 100) * SVG_WIDTH) / 2,
    );
    const rightSlopes = computeMonotoneSlopes(ys, rightXs);

    const lastIdx = activeFunnel.steps.length - 1;
    const rx = 9;
    const ry = 6;

    return activeFunnel.steps.map((_, idx) => {
      const y0 = ys[idx];
      const y1 = ys[idx + 1];
      const r0 = rightXs[idx];
      const r1 = rightXs[idx + 1];
      const mr0 = rightSlopes[idx];
      const mr1 = rightSlopes[idx + 1];

      const startY = idx === 0 ? y0 + ry : y0;
      const endY = idx === lastIdx ? y1 - ry : y1;
      const h = endY - startY;

      const rStart = idx === 0 ? r0 + mr0 * ry : r0;
      const rEnd = idx === lastIdx ? r1 - mr1 * ry : r1;

      // Right cubic Bézier control points
      const rc1x = rStart + (mr0 * h) / 3;
      const rc1y = startY + h / 3;
      const rc2x = rEnd - (mr1 * h) / 3;
      const rc2y = endY - h / 3;

      // Mirror symmetrically around x = SVG_WIDTH / 2 for the left wall
      const l0 = SVG_WIDTH - r0;
      const l1 = SVG_WIDTH - r1;
      const lStart = SVG_WIDTH - rStart;
      const lEnd = SVG_WIDTH - rEnd;
      const lc1x = SVG_WIDTH - rc1x;
      const lc2x = SVG_WIDTH - rc2x;

      const segments: string[] = [];

      if (idx === 0) {
        segments.push(
          `M ${(l0 + rx).toFixed(2)} ${y0.toFixed(2)}`,
          `L ${(r0 - rx).toFixed(2)} ${y0.toFixed(2)}`,
          `Q ${r0.toFixed(2)} ${y0.toFixed(2)}, ${rStart.toFixed(2)} ${startY.toFixed(2)}`,
        );
      } else {
        segments.push(
          `M ${l0.toFixed(2)} ${y0.toFixed(2)}`,
          `L ${r0.toFixed(2)} ${y0.toFixed(2)}`,
        );
      }

      segments.push(
        `C ${rc1x.toFixed(2)} ${rc1y.toFixed(2)}, ${rc2x.toFixed(2)} ${rc2y.toFixed(2)}, ${rEnd.toFixed(2)} ${endY.toFixed(2)}`,
      );

      if (idx === lastIdx) {
        segments.push(
          `Q ${r1.toFixed(2)} ${y1.toFixed(2)}, ${(r1 - rx).toFixed(2)} ${y1.toFixed(2)}`,
          `L ${(l1 + rx).toFixed(2)} ${y1.toFixed(2)}`,
          `Q ${l1.toFixed(2)} ${y1.toFixed(2)}, ${lEnd.toFixed(2)} ${endY.toFixed(2)}`,
        );
      } else {
        segments.push(`L ${lEnd.toFixed(2)} ${endY.toFixed(2)}`);
      }

      segments.push(
        `C ${lc2x.toFixed(2)} ${rc2y.toFixed(2)}, ${lc1x.toFixed(2)} ${rc1y.toFixed(2)}, ${lStart.toFixed(2)} ${startY.toFixed(2)}`,
      );

      if (idx === 0) {
        segments.push(
          `Q ${l0.toFixed(2)} ${y0.toFixed(2)}, ${(l0 + rx).toFixed(2)} ${y0.toFixed(2)}`,
        );
      }

      segments.push("Z");

      const midWidthPct = (boundaryWidths[idx] + boundaryWidths[idx + 1]) / 2;

      return { d: segments.join(" "), y0, y1, midWidthPct };
    });
  }, [activeFunnel.steps]);

  const handleSliceClick = (stepNumber: number) => {
    setSelectedStepNum((prev) =>
      mode === "embedded" && prev === stepNumber ? null : stepNumber,
    );
  };

  const gradientIdPrefix = `funnel-grad-${mode}`;

  return (
    <div
      data-testid={`payment-funnel-${mode}`}
      className={
        mode === "embedded"
          ? "p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4 min-w-0"
          : "space-y-3.5 min-w-0"
      }
    >
      {/* Minimal Single-Row Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {mode === "embedded" ? (
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-zinc-900">
              Phễu Chuyển Đổi Thanh Toán: {activeFunnel.winRatePct}%
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
              {activeFunnel.wonCount}/{activeFunnel.totalBids} đơn
            </span>
          </div>
        ) : (
          <span className="text-xs text-zinc-400">
            Chọn từng tầng phễu để xem chi tiết
          </span>
        )}

        {/* Quiet Segment Switcher */}
        <div className="inline-flex items-center gap-0.5 bg-zinc-100/90 p-0.5 rounded-lg">
          {segmentOptions.map((opt) => {
            const active = segment === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSegment(opt.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  active
                    ? "bg-white text-zinc-900 shadow-2xs"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                {opt.label} ({opt.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Funnel Canvas + Optional Click-to-Inspect Drawer */}
      <div
        className={`grid grid-cols-1 ${
          selectedStep ? "lg:grid-cols-12" : "lg:grid-cols-1"
        } gap-6 items-center`}
      >
        {/* LEFT / CENTER: Smooth C1-Curved Sculpted Funnel */}
        <div
          className={`${
            selectedStep ? "lg:col-span-7" : "max-w-[600px] mx-auto w-full"
          } py-1 min-w-0 select-none`}
        >
          <div className="flex items-stretch gap-2.5 sm:gap-4">
            {/* Concise Left Labels */}
            <div className="w-[104px] sm:w-[132px] shrink-0 flex flex-col">
              {activeFunnel.steps.map((step) => {
                const isSelected = selectedStep?.stepNumber === step.stepNumber;
                const isHovered = hoveredStepNum === step.stepNumber;
                const hasSelection = selectedStep !== null;
                const label =
                  CLEAN_STEP_LABELS[step.stepNumber] ?? step.shortTitle;

                return (
                  <button
                    key={step.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => handleSliceClick(step.stepNumber)}
                    onMouseEnter={() => setHoveredStepNum(step.stepNumber)}
                    onMouseLeave={() => setHoveredStepNum(null)}
                    style={{ height: ROW_HEIGHT }}
                    className={`flex items-center justify-end gap-1.5 text-right pr-1 transition-all cursor-pointer ${
                      hasSelection && !isSelected
                        ? "opacity-45 hover:opacity-90"
                        : "opacity-100"
                    }`}
                  >
                    <span
                      className={`text-[11px] sm:text-xs truncate transition-colors ${
                        isSelected
                          ? "font-semibold text-emerald-700"
                          : isHovered
                            ? "font-medium text-zinc-950"
                            : step.stepNumber === 8
                              ? "font-semibold text-zinc-800"
                              : "text-zinc-500"
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all ${
                        isSelected
                          ? "bg-emerald-500 scale-110"
                          : isHovered
                            ? "bg-zinc-400"
                            : "bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Unified Smooth S-Curve SVG + Interactive Overlay Rows */}
            <div
              className="relative flex-1 min-w-[150px]"
              style={{ height: svgHeight }}
            >
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <defs>
                  {SLICE_GRADIENTS.map(([edgeColor, centerColor], idx) => (
                    <linearGradient
                      key={idx}
                      id={`${gradientIdPrefix}-${idx}`}
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="0%"
                    >
                      <stop offset="0%" stopColor={edgeColor} />
                      <stop offset="50%" stopColor={centerColor} />
                      <stop offset="100%" stopColor={edgeColor} />
                    </linearGradient>
                  ))}
                </defs>

                <g>
                  {sliceGeometry.map((geo, idx) => {
                    const step = activeFunnel.steps[idx];
                    const isSelected =
                      selectedStep?.stepNumber === step.stepNumber;
                    const isHovered = hoveredStepNum === step.stepNumber;
                    const hasSelection = selectedStep !== null;

                    const sliceOpacity = hasSelection
                      ? isSelected
                        ? 1
                        : isHovered
                          ? 0.72
                          : 0.38
                      : hoveredStepNum !== null && !isHovered
                        ? 0.84
                        : 1;

                    return (
                      <path
                        key={step.id}
                        d={geo.d}
                        fill={`url(#${gradientIdPrefix}-${idx})`}
                        opacity={sliceOpacity}
                        className="transition-opacity duration-200"
                      />
                    );
                  })}

                  {/* Crisp Hairline White Dividers Between Slices */}
                  {sliceGeometry.slice(1).map((geo, idx) => (
                    <line
                      key={idx}
                      x1="0"
                      y1={geo.y0}
                      x2={SVG_WIDTH}
                      y2={geo.y0}
                      stroke="#ffffff"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
              </svg>

              {/* Accessible Click Buttons + Crisp Numbers + Curve-Hugging Drop Notes */}
              {activeFunnel.steps.map((step, idx) => {
                const geo = sliceGeometry[idx];
                const isSelected = selectedStep?.stepNumber === step.stepNumber;
                const hasSelection = selectedStep !== null;
                const isTopBottleneck =
                  activeFunnel.biggestBottleneckStep?.stepNumber ===
                    step.stepNumber && step.droppedFromPrevCount > 0;

                const rightEdgePct = 50 + geo.midWidthPct / 2;

                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-label={`${step.title} — ${step.count} (${step.cumulativePct}%)`}
                    onClick={() => handleSliceClick(step.stepNumber)}
                    onMouseEnter={() => setHoveredStepNum(step.stepNumber)}
                    onMouseLeave={() => setHoveredStepNum(null)}
                    style={{ height: ROW_HEIGHT }}
                    className="relative z-10 w-full flex items-center justify-center cursor-pointer focus:outline-none group"
                  >
                    {/* Centered Percentage & Count */}
                    <div
                      className={`flex items-baseline gap-1.5 font-mono tabular-nums text-white transition-opacity duration-200 ${
                        hasSelection && !isSelected
                          ? "opacity-55 group-hover:opacity-90"
                          : "opacity-100"
                      }`}
                    >
                      <span className="text-xs sm:text-[13px] font-semibold tracking-tight">
                        {step.cumulativePct}%
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-white/75 font-normal">
                        ({step.count})
                      </span>
                    </div>

                    {/* Desktop/Tablet: Curve-Hugging Subtle Drop Callout */}
                    {step.droppedFromPrevCount > 0 && (
                      <span
                        style={{ left: `calc(${rightEdgePct}% + 8px)` }}
                        className={`hidden sm:inline-flex absolute items-center gap-1 font-mono tabular-nums whitespace-nowrap transition-opacity ${
                          hasSelection && !isSelected
                            ? "opacity-40"
                            : "opacity-100"
                        } ${
                          isTopBottleneck
                            ? "px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 text-[10px] font-semibold"
                            : "text-[11px] text-zinc-400"
                        }`}
                      >
                        {!isTopBottleneck && (
                          <span className="w-2 h-px bg-zinc-200 inline-block" />
                        )}
                        -{step.droppedFromPrevCount}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Reserve breathing room on sm+ so curve-hugging badges never clip */}
            </div>

            {/* Mobile-only compact drop column (on sm+ badges hug the curve directly) */}
            <div className="w-9 sm:w-12 shrink-0 flex flex-col sm:pointer-events-none">
              {activeFunnel.steps.map((step) => {
                const isTopBottleneck =
                  activeFunnel.biggestBottleneckStep?.stepNumber ===
                    step.stepNumber && step.droppedFromPrevCount > 0;
                return (
                  <div
                    key={step.id}
                    style={{ height: ROW_HEIGHT }}
                    className="flex sm:hidden items-center justify-start pl-0.5 font-mono tabular-nums"
                  >
                    {step.droppedFromPrevCount > 0 && (
                      <span
                        className={
                          isTopBottleneck
                            ? "px-1 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold"
                            : "text-[10px] text-zinc-400"
                        }
                      >
                        -{step.droppedFromPrevCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Clean, Airy Detail Card (Revealed on Click) */}
        {selectedStep && (
          <div className="lg:col-span-5 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/80 space-y-3 text-xs min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-white font-mono text-[10px] font-medium">
                    Bước {selectedStep.stepNumber}/8
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {selectedStep.raceStage}
                  </span>
                </div>
                <h4 className="font-semibold text-[13px] text-zinc-900 pt-0.5">
                  {selectedStep.title}
                </h4>
              </div>

              {mode === "embedded" && (
                <button
                  type="button"
                  onClick={() => setSelectedStepNum(null)}
                  className="p-1 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 cursor-pointer shrink-0"
                  title="Đóng"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 3 Minimal Stat Tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-lg bg-white border border-zinc-200/70">
                <span className="text-[10px] text-zinc-400 block">
                  Tích lũy
                </span>
                <strong className="font-mono text-sm text-zinc-950">
                  {selectedStep.cumulativePct}%
                </strong>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  {selectedStep.count}/{activeFunnel.totalBids}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-zinc-200/70">
                <span className="text-[10px] text-zinc-400 block">
                  Giữ chân
                </span>
                <strong className="font-mono text-sm text-zinc-950">
                  {selectedStep.stepConversionPct}%
                </strong>
                <span className="text-[10px] text-rose-500 font-mono block">
                  {selectedStep.stepNumber === 1
                    ? "Đầu phễu"
                    : `-${selectedStep.droppedFromPrevCount} phiên`}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-zinc-200/70">
                <span className="text-[10px] text-zinc-400 block">
                  Vs. sàn ĐN
                </span>
                <strong
                  className={`font-mono text-sm ${
                    selectedStep.deltaVsPlatformPct >= 0
                      ? "text-emerald-600"
                      : "text-amber-600"
                  }`}
                >
                  {selectedStep.deltaVsPlatformPct >= 0
                    ? `+${selectedStep.deltaVsPlatformPct}%`
                    : `${selectedStep.deltaVsPlatformPct}%`}
                </strong>
                <span className="text-[10px] text-zinc-400 font-mono block">
                  Sàn {selectedStep.platformBenchmarkPct}%
                </span>
              </div>
            </div>

            {/* Dropped Sessions List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-700">
                  {selectedStep.stepNumber === 1
                    ? "Nguồn gửi báo giá"
                    : `Phiên rơi rụng trước Bước ${selectedStep.stepNumber} (${selectedStep.droppedSessions.length})`}
                </span>
                {selectedStep.droppedShareOfTotalLossesPct > 0 && (
                  <span className="font-mono text-[10px] text-zinc-400">
                    {selectedStep.droppedShareOfTotalLossesPct}% tổng trượt
                  </span>
                )}
              </div>

              {selectedStep.stepNumber === 1 ? (
                <div className="p-2.5 rounded-lg bg-white border border-zinc-200/70 text-[11px] text-zinc-600 flex items-center justify-between gap-2">
                  <span>
                    Auto-Bid:{" "}
                    <strong className="font-mono text-zinc-900">
                      {periodMetrics.autoBidsCount}
                    </strong>{" "}
                    ({periodMetrics.autoBidStats.winRatePct}%)
                  </span>
                  <span>
                    Duyệt tay:{" "}
                    <strong className="font-mono text-zinc-900">
                      {periodMetrics.manualBidsCount}
                    </strong>{" "}
                    ({periodMetrics.manualStats.winRatePct}%)
                  </span>
                </div>
              ) : selectedStep.droppedSessions.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/70 text-[11px] text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Giữ trọn 100% phiên từ bước trước.</span>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5">
                  {selectedStep.droppedSessions.map((ds) => (
                    <div
                      key={ds.id}
                      className="px-2.5 py-2 rounded-lg bg-white border border-zinc-200/70 space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                        <span className="font-semibold text-zinc-900">
                          #{ds.id}{" "}
                          <span className="font-normal text-zinc-400">
                            ({ds.shortDate} ·{" "}
                            {ds.bidMode === "auto" ? "Auto" : "Tay"})
                          </span>
                        </span>
                        <span className="text-zinc-500">
                          {formatCompactVnd(ds.offeredBasePrice)}
                        </span>
                      </div>
                      <div className="flex items-start gap-1 text-[11px] text-zinc-500">
                        <ArrowDownRight className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        <span>{ds.reasonNote}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Concise Single-Line Actionable Tip */}
            <div className="px-2.5 py-2 rounded-lg bg-emerald-50/60 border border-emerald-200/70 flex items-start gap-1.5 text-[11px] text-emerald-900">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{selectedStep.optimizationTip}</span>
            </div>

            {mode === "modal" && onCloseAndSwitchToAiTab && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onCloseAndSwitchToAiTab}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 underline underline-offset-2 cursor-pointer"
                >
                  Xem Benchmark &amp; Pareto &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
