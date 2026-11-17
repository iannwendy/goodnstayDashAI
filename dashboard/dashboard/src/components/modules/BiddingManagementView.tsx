import { useState } from "react";
import {
  Gavel,
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  Users,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import type {
  AmenityCode,
  AppLocale,
  BiddingOperationsMaster,
  CurrencyCode,
  CurrencyRateMap,
  LiveRequestStatus,
  PropertyId,
  StaffRoleKey,
} from "@/data";
import {
  formatBusinessMoney,
  localizeAmenityCode,
  type OverviewCopy,
} from "@/lib/i18n";
import type { HubModulesCopy } from "@/lib/hubModulesI18n";
import type {
  AutoBidRuleView,
  BiddingModuleViewModel,
  LiveRequestView,
} from "@/services/hubModulesAnalytics";

const OFFER_PERK_OPTIONS: AmenityCode[] = [
  "breakfast",
  "wifi",
  "pool",
  "late_checkout",
  "parking",
  "bathtub",
];

interface BiddingManagementViewProps {
  vm: BiddingModuleViewModel;
  biddingOperations: BiddingOperationsMaster;
  mCopy: HubModulesCopy;
  copy: OverviewCopy;
  locale: AppLocale;
  currency: CurrencyCode;
  currencyRates: CurrencyRateMap;
  activeRole: StaffRoleKey;
  onRequireManagerRole: () => void;
  onSaveBiddingOperations: (
    next: BiddingOperationsMaster,
    syncPropertyAutoBid?: { propertyId: PropertyId; enabled: boolean },
    notice?: string,
  ) => void;
}

export function BiddingManagementView({
  vm,
  biddingOperations,
  mCopy,
  copy,
  locale,
  currency,
  currencyRates,
  activeRole,
  onRequireManagerRole,
  onSaveBiddingOperations,
}: BiddingManagementViewProps) {
  const b = mCopy.bidding;

  const [queueFilter, setQueueFilter] = useState<"all" | LiveRequestStatus>(
    "all",
  );
  const [offerModalReq, setOfferModalReq] = useState<LiveRequestView | null>(
    null,
  );
  const [offerRateVnd, setOfferRateVnd] = useState<number>(0);
  const [offerPerks, setOfferPerks] = useState<AmenityCode[]>([]);

  const [editingRule, setEditingRule] = useState<AutoBidRuleView | null>(null);
  const [ruleFloorInput, setRuleFloorInput] = useState<number>(0);
  const [ruleMaxDiscInput, setRuleMaxDiscInput] = useState<number>(15);

  const filteredQueue = vm.liveRequests.filter(
    (req) => queueFilter === "all" || req.status === queueFilter,
  );

  const openOfferModal = (req: LiveRequestView) => {
    setOfferModalReq(req);
    setOfferRateVnd(req.suggestedWinRateVnd);
    setOfferPerks([...req.requestedPerks]);
  };

  const togglePerkInModal = (code: AmenityCode) => {
    setOfferPerks((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleConfirmSendOffer = () => {
    if (!offerModalReq) return;
    const safeRate = Math.max(200_000, Number(offerRateVnd) || offerModalReq.suggestedWinRateVnd);
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    const nextOps: BiddingOperationsMaster = {
      ...biddingOperations,
      liveRequests: biddingOperations.liveRequests.map((item) =>
        item.id === offerModalReq.id
          ? {
              ...item,
              status: "offer_sent",
              submittedRatePerNightVnd: safeRate,
              submittedPerks: offerPerks,
              respondedAt: hhmm,
            }
          : item,
      ),
    };
    setOfferModalReq(null);
    onSaveBiddingOperations(nextOps, undefined, mCopy.common.savedToast);
  };

  const handlePassRequest = (reqId: string) => {
    const nextOps: BiddingOperationsMaster = {
      ...biddingOperations,
      liveRequests: biddingOperations.liveRequests.map((item) =>
        item.id === reqId ? { ...item, status: "passed" } : item,
      ),
    };
    onSaveBiddingOperations(nextOps, undefined, mCopy.common.savedToast);
  };

  const handleToggleAutoBidRule = (
    propertyId: PropertyId,
    enabled: boolean,
  ) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    const nextOps: BiddingOperationsMaster = {
      ...biddingOperations,
      autoBidRules: biddingOperations.autoBidRules.map((r) =>
        r.propertyId === propertyId
          ? { ...r, enabled, updatedAt: "2026-11-06 19:30" }
          : r,
      ),
    };
    onSaveBiddingOperations(
      nextOps,
      { propertyId, enabled },
      mCopy.common.savedToast,
    );
  };

  const handleToggleNightBoost = (propertyId: PropertyId, boost: boolean) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    const nextOps: BiddingOperationsMaster = {
      ...biddingOperations,
      autoBidRules: biddingOperations.autoBidRules.map((r) =>
        r.propertyId === propertyId
          ? { ...r, nightShiftAutoBoost: boost, updatedAt: "2026-11-06 19:30" }
          : r,
      ),
    };
    onSaveBiddingOperations(nextOps, undefined, mCopy.common.savedToast);
  };

  const openEditRuleModal = (rule: AutoBidRuleView) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    setEditingRule(rule);
    setRuleFloorInput(rule.minFloorRateVnd);
    setRuleMaxDiscInput(rule.maxDiscountPct);
  };

  const handleSaveRuleGuardrails = () => {
    if (!editingRule) return;
    const safeFloor = Math.max(200_000, Number(ruleFloorInput) || editingRule.minFloorRateVnd);
    const safeDisc = Math.min(45, Math.max(0, Number(ruleMaxDiscInput) || 0));
    const nextOps: BiddingOperationsMaster = {
      ...biddingOperations,
      autoBidRules: biddingOperations.autoBidRules.map((r) =>
        r.propertyId === editingRule.propertyId
          ? {
              ...r,
              minFloorRateVnd: safeFloor,
              maxDiscountPct: safeDisc,
              updatedAt: "2026-11-06 19:30",
            }
          : r,
      ),
    };
    setEditingRule(null);
    onSaveBiddingOperations(nextOps, undefined, mCopy.common.savedToast);
  };

  const kpiCards = [
    {
      id: "open",
      testId: "bidding-kpi-open",
      label: b.kpiOpenRequests,
      value: String(vm.kpis.waitingRequestsCount),
      cls: "text-[#DC2626]",
      bg: "bg-red-50",
      icon: <Gavel className="w-[18px] h-[18px] text-[#DC2626]" />,
    },
    {
      id: "sent",
      testId: "bidding-kpi-sent",
      label: b.kpiSentOffers,
      value: String(vm.kpis.sentOffersCount),
      cls: "text-[#2563EB]",
      bg: "bg-blue-50",
      icon: <Send className="w-[18px] h-[18px] text-[#2563EB]" />,
    },
    {
      id: "win",
      testId: "bidding-kpi-accept30d",
      label: b.kpiAccept30d,
      value: vm.kpis.acceptRate30dFormatted,
      cls: "text-[#16A34A]",
      bg: "bg-emerald-50",
      icon: <CheckCircle2 className="w-[18px] h-[18px] text-[#16A34A]" />,
    },
    {
      id: "autobid",
      testId: "bidding-kpi-autobid",
      label: b.kpiAutoBidActive,
      value: vm.kpis.autoBidActiveSummary,
      cls: "text-[#4F46E5]",
      bg: "bg-indigo-50",
      icon: <Sparkles className="w-[18px] h-[18px] text-[#4F46E5]" />,
    },
  ];

  const isBelowFloorInModal =
    offerModalReq != null && offerRateVnd < offerModalReq.minFloorGuardrailVnd;

  return (
    <div data-testid="module-bidding-view" className="space-y-6 min-w-0">
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
          {b.pageTitle}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-3xl">
          {b.pageSubtitle}
        </p>
      </div>

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 min-w-0">
        {kpiCards.map((k) => (
          <div
            key={k.id}
            data-testid={k.testId}
            className="rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between min-w-0"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-slate-500 truncate">
                {k.label}
              </span>
              <span
                className={`w-7 h-7 rounded-full ${k.bg} flex items-center justify-center shrink-0`}
              >
                {k.icon}
              </span>
            </div>
            <div
              className={`mt-2 text-[22px] font-bold tracking-tight tabular truncate ${k.cls}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </section>

      {/* 1. Live Traveler Requests Queue */}
      <section
        data-testid="bidding-live-queue-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-slate-900 m-0">
            {b.liveQueueTitle}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              ["all", "waiting_offer", "offer_sent", "passed"] as const
            ).map((st) => {
              const lbl =
                st === "all"
                  ? mCopy.common.allFilter
                  : st === "waiting_offer"
                    ? b.filterWaiting
                    : st === "offer_sent"
                      ? b.filterSent
                      : b.filterPassed;
              return (
                <button
                  key={st}
                  type="button"
                  data-testid={`bidding-filter-${st}`}
                  onClick={() => setQueueFilter(st)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    queueFilter === st
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {filteredQueue.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-500">
            {b.liveQueueEmpty}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-w-0">
            {filteredQueue.map((req) => (
              <div
                key={req.id}
                data-testid={`live-req-card-${req.id}`}
                className="rounded-xl border border-slate-200/95 bg-slate-50/45 p-4 flex flex-col justify-between gap-3.5 min-w-0"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-indigo-700 text-[13px] tabular">
                        {req.id}
                      </span>
                      <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11.5px] font-semibold text-slate-700 truncate">
                        {req.propertyShortName}
                      </span>
                    </div>

                    {req.status === "waiting_offer" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 tabular">
                        <Clock className="w-3 h-3" />
                        {b.expiresInPrefix} {req.expiresInMinutes}{" "}
                        {b.minutesUnit}
                      </span>
                    ) : req.status === "offer_sent" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {b.offerSentBadge}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        {b.passedBadge}
                      </span>
                    )}
                  </div>

                  <div className="text-[14px] font-bold text-slate-900">
                    {req.roomTypePreference}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600 tabular">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {req.checkInLabel} → {req.checkOutLabel} ({req.nights}{" "}
                      {mCopy.common.nightsUnit})
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {req.guestsCount} {mCopy.common.guestsUnit} ·{" "}
                      {req.travelerSegment}
                    </span>
                  </div>

                  <p className="text-[12.5px] text-slate-600 m-0 leading-relaxed">
                    {req.guestMessage}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {req.requestedPerksLabels.map((pk) => (
                      <span
                        key={pk}
                        className="rounded-md bg-white border border-slate-200/90 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {pk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pricing & Actions Footer */}
                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-4 text-[12px]">
                    <div>
                      <div className="text-slate-500">{b.guestBudgetLabel}</div>
                      <div className="font-bold text-slate-900 tabular text-[13.5px]">
                        {req.guestTargetFormatted} {mCopy.common.perNightSuffix}
                      </div>
                    </div>
                    <div>
                      <div className="text-indigo-600 font-medium">
                        {b.suggestedRateLabel}
                      </div>
                      <div className="font-bold text-indigo-700 tabular text-[13.5px]">
                        {req.submittedRateFormatted ?? req.suggestedWinFormatted}{" "}
                        {mCopy.common.perNightSuffix}
                      </div>
                    </div>
                  </div>

                  {req.status === "waiting_offer" ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`pass-req-btn-${req.id}`}
                        onClick={() => handlePassRequest(req.id)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        {b.passRequestBtn}
                      </button>
                      <button
                        type="button"
                        data-testid={`send-offer-btn-${req.id}`}
                        onClick={() => openOfferModal(req)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-indigo-700"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{b.sendOfferBtn}</span>
                      </button>
                    </div>
                  ) : req.status === "offer_sent" ? (
                    <div className="text-[12px] font-semibold text-emerald-700 tabular">
                      {req.submittedTotalNetFormatted} ({req.respondedAt})
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Per-Property 24/7 AutoBid Guardrail Rules */}
      <section
        data-testid="bidding-autobid-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <div>
          <h2 className="text-[17px] font-bold text-slate-900 m-0 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{b.autoBidSectionTitle}</span>
          </h2>
          <p className="text-[12.5px] text-slate-500 mt-1 mb-0">
            {b.autoBidSectionSub}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0">
          {vm.autoBidRules.map((rule) => (
            <div
              key={rule.propertyId}
              data-testid={`autobid-rule-card-${rule.propertyId}`}
              className="rounded-xl border border-slate-200/90 bg-slate-50/45 p-4 flex flex-col justify-between gap-3 min-w-0"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[14px] font-bold text-slate-900 truncate">
                    {rule.propertyLabel}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11.5px] font-medium text-slate-600">
                      {b.ruleEnabledLabel}
                    </span>
                    <Switch
                      data-testid={`autobid-switch-${rule.propertyId}`}
                      checked={rule.enabled}
                      onCheckedChange={(checked) =>
                        handleToggleAutoBidRule(rule.propertyId, checked)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[12px]">
                  <div className="rounded-lg bg-white border border-slate-200/80 p-2.5">
                    <div className="text-slate-500">{b.ruleFloorLabel}</div>
                    <div className="font-bold text-indigo-700 text-[13.5px] tabular mt-0.5">
                      {rule.minFloorFormatted}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white border border-slate-200/80 p-2.5">
                    <div className="text-slate-500">
                      {b.ruleMaxDiscountLabel}
                    </div>
                    <div className="font-bold text-slate-900 text-[13.5px] tabular mt-0.5">
                      -{rule.maxDiscountPct}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[12px] text-slate-700">
                  <span>{b.ruleNightBoostLabel}</span>
                  <Switch
                    checked={rule.nightShiftAutoBoost}
                    onCheckedChange={(checked) =>
                      handleToggleNightBoost(rule.propertyId, checked)
                    }
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/75 flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 min-w-0">
                  {rule.defaultPerksLabels.map((pk) => (
                    <span
                      key={pk}
                      className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700"
                    >
                      {pk}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  data-testid={`edit-rule-btn-${rule.propertyId}`}
                  onClick={() => openEditRuleModal(rule)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {b.editRuleBtn}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Recent Bidding Outcome History */}
      <section
        data-testid="bidding-history-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-3"
      >
        <h2 className="text-[17px] font-bold text-slate-900 m-0">
          {b.historyTitle}
        </h2>

        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">{mCopy.payout.colProperty}</th>
                <th className="py-2.5 px-3">{copy.colPaidAt}</th>
                <th className="py-2.5 px-3">{copy.colStatus}</th>
                <th className="py-2.5 px-3 text-right">
                  {b.offerFieldRate.split(" (")[0]}
                </th>
                <th className="py-2.5 px-3 text-right">
                  {b.offerEstNetTotal}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12.5px]">
              {vm.recentHistory.map((h) => {
                const stText =
                  h.status === "accepted"
                    ? copy.statusAccepted
                    : h.status === "expired"
                      ? copy.statusExpired
                      : h.status === "rejected"
                        ? copy.statusRejected
                        : copy.statusCancelled;
                const stCls =
                  h.status === "accepted"
                    ? "text-emerald-700 bg-emerald-50"
                    : h.status === "expired"
                      ? "text-amber-700 bg-amber-50"
                      : h.status === "rejected"
                        ? "text-red-700 bg-red-50"
                        : "text-slate-600 bg-slate-100";
                return (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 tabular whitespace-nowrap">
                      {h.id}{" "}
                      {h.bookingCode && (
                        <span className="text-indigo-600 font-bold">
                          ({h.bookingCode})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {h.propertyShortName} ·{" "}
                      <span className="text-slate-500">
                        {h.bidMode === "auto" ? b.modeAuto : b.modeManual}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 tabular whitespace-nowrap">
                      {h.sessionDateLabel} {h.timeLabel}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stCls}`}
                      >
                        {stText}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800 tabular whitespace-nowrap">
                      {h.offeredRateFormatted} × {h.nights}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 tabular whitespace-nowrap">
                      {h.totalEstimateFormatted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Send Manual Offer Modal */}
      <Dialog
        open={Boolean(offerModalReq)}
        onOpenChange={(open) => !open && setOfferModalReq(null)}
      >
        <DialogContent
          data-testid="bidding-offer-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          {offerModalReq && (
            <>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-[17px] font-bold text-slate-900">
                  {b.offerModalTitle} · {offerModalReq.id}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] text-slate-600">
                  {offerModalReq.propertyShortName} ·{" "}
                  {offerModalReq.roomTypePreference} ({offerModalReq.nights}{" "}
                  {mCopy.common.nightsUnit})
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-3.5">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {b.offerFieldRate}
                  </label>
                  <input
                    type="number"
                    step={10000}
                    data-testid="offer-rate-input"
                    value={offerRateVnd}
                    onChange={(e) => setOfferRateVnd(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] font-bold text-slate-900 tabular"
                  />
                  {isBelowFloorInModal && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-amber-700">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {b.offerFloorWarning} (
                        {offerModalReq.minFloorGuardrailFormatted})
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[12px] font-semibold text-slate-700 mb-1.5">
                    {b.offerFieldPerks}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {OFFER_PERK_OPTIONS.map((code) => {
                      const selected = offerPerks.includes(code);
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => togglePerkInModal(code)}
                          className={`rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                            selected
                              ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {localizeAmenityCode(code, locale)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-emerald-900">
                    {b.offerEstNetTotal}
                  </span>
                  <span className="text-[18px] font-bold text-emerald-700 tabular">
                    {formatBusinessMoney(
                      Math.max(0, offerRateVnd) *
                        Math.max(1, offerModalReq.nights),
                      currency,
                      { rates: currencyRates },
                    )}
                  </span>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOfferModalReq(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700"
                  >
                    {mCopy.common.cancelBtn}
                  </button>
                  <button
                    type="button"
                    data-testid="confirm-send-offer-btn"
                    onClick={handleConfirmSendOffer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{b.confirmSendOfferBtn}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit AutoBid Rule Modal */}
      <Dialog
        open={Boolean(editingRule)}
        onOpenChange={(open) => !open && setEditingRule(null)}
      >
        <DialogContent
          data-testid="autobid-rule-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          {editingRule && (
            <>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-[17px] font-bold text-slate-900">
                  {b.editRuleBtn} · {editingRule.propertyShortName}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] text-slate-600">
                  {b.autoBidSectionSub}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {b.ruleFloorLabel} (VND)
                  </label>
                  <input
                    type="number"
                    step={10000}
                    data-testid="rule-floor-input"
                    value={ruleFloorInput}
                    onChange={(e) => setRuleFloorInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] font-bold text-indigo-700 tabular"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {b.ruleMaxDiscountLabel} (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={45}
                    data-testid="rule-discount-input"
                    value={ruleMaxDiscInput}
                    onChange={(e) =>
                      setRuleMaxDiscInput(Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] font-bold text-slate-900 tabular"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700"
                  >
                    {mCopy.common.cancelBtn}
                  </button>
                  <button
                    type="button"
                    data-testid="save-rule-btn"
                    onClick={handleSaveRuleGuardrails}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
                  >
                    {mCopy.common.saveBtn}
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
