import { useState } from "react";
import {
  Sparkles,
  RotateCw,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  Info,
} from "lucide-react";
import type { AdvisorCardItem, AdvisorPanelModel } from "@/services/overviewAnalytics";

interface AiAdvisorSectionProps {
  sectionPrefix: "revenue" | "bids";
  title: string;
  advisorBadge: string;
  collapseLabel: string;
  expandLabel: string;
  refreshLabel: string;
  model: AdvisorPanelModel;
  onRefresh: () => void;
}

const PILL_TONE_CLASSES: Record<
  AdvisorPanelModel["pills"][number]["tone"],
  string
> = {
  green: "bg-[#16A34A] text-white",
  indigo: "bg-[#6366F1] text-white",
  blue: "bg-[#0284C7] text-white",
  amber: "bg-[#D97706] text-white",
  red: "bg-[#DC2626] text-white",
};

const CARD_BADGE_CLASSES: Record<AdvisorCardItem["badgeTone"], string> = {
  green: "bg-[#16A34A] text-white",
  blue: "bg-[#0284C7] text-white",
  amber: "bg-[#EA580C] text-white",
  red: "bg-[#DC2626] text-white",
  indigo: "bg-[#4F46E5] text-white",
};

function CardIcon({ type }: { type: AdvisorCardItem["iconType"] }) {
  if (type === "trend") {
    return <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
  }
  if (type === "sparkles") {
    return <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />;
  }
  if (type === "award") {
    return <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
  }
  if (type === "bulb") {
    return <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />;
  }
  if (type === "alert") {
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  }
  return <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />;
}

export function AiAdvisorSection({
  sectionPrefix,
  title,
  advisorBadge,
  collapseLabel,
  expandLabel,
  refreshLabel,
  model,
  onRefresh,
}: AiAdvisorSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mt-6 rounded-xl border border-indigo-100/95 bg-[#FAFBFF] p-4 sm:p-5 min-w-0">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <h3 className="text-[13.5px] font-bold text-slate-900 m-0">
            {title}
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
            <Sparkles className="w-3 h-3" />
            {advisorBadge}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid={`advisor-${sectionPrefix}-refresh`}
            aria-label={refreshLabel}
            title={refreshLabel}
            onClick={onRefresh}
            className="w-7 h-7 rounded-md flex items-center justify-center text-indigo-600 hover:bg-indigo-100/70 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            data-testid={`advisor-${sectionPrefix}-toggle`}
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold text-indigo-600 hover:bg-indigo-100/70 transition-colors"
          >
            <span>{collapsed ? expandLabel : collapseLabel}</span>
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Summary Pills + Analyzed Timestamp */}
      <div className="mt-3 pt-3 border-t border-indigo-100/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {model.pills.map((pill) => (
            <span
              key={pill.label}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-semibold ${PILL_TONE_CLASSES[pill.tone]}`}
            >
              <span>{pill.label}:</span>
              <span className="tabular">{pill.value}</span>
            </span>
          ))}
        </div>
        <span className="text-[11px] italic text-slate-400">
          {model.analyzedAtText}
        </span>
      </div>

      {/* Collapsible Advice Cards */}
      {!collapsed && (
        <div
          data-testid={`advisor-${sectionPrefix}-cards`}
          className={`mt-4 grid gap-3.5 ${
            model.cards.length === 1
              ? "grid-cols-1 max-w-md"
              : "grid-cols-1 md:grid-cols-3"
          }`}
        >
          {model.cards.map((card) => (
            <div
              key={card.id}
              className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between min-w-0"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <CardIcon type={card.iconType} />
                    <div className="text-[12.5px] font-bold text-slate-900 leading-snug">
                      {card.title}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold whitespace-nowrap ${CARD_BADGE_CLASSES[card.badgeTone]}`}
                  >
                    {card.badgeText}
                  </span>
                </div>
                <p className="text-[12px] text-slate-600 leading-relaxed m-0">
                  {card.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
