import { useState } from "react";
import {
  Wallet,
  CheckCircle2,
  Clock,
  CalendarClock,
  Landmark,
  ShieldCheck,
  FileText,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  PayoutBatchStatus,
  PayoutLedgersMaster,
  PropertyId,
  StaffRoleKey,
} from "@/data";
import type { HubModulesCopy } from "@/lib/hubModulesI18n";
import type {
  PayoutBatchView,
  PayoutModuleViewModel,
} from "@/services/hubModulesAnalytics";

interface PayoutReconciliationViewProps {
  vm: PayoutModuleViewModel;
  payoutLedgers: PayoutLedgersMaster;
  mCopy: HubModulesCopy;
  activeRole: StaffRoleKey;
  onRequireManagerRole: () => void;
  onOpenBookingByRef: (refOrCode: string) => void;
  onSavePayoutLedgers: (next: PayoutLedgersMaster, notice?: string) => void;
}

export function PayoutReconciliationView({
  vm,
  payoutLedgers,
  mCopy,
  activeRole,
  onRequireManagerRole,
  onOpenBookingByRef,
  onSavePayoutLedgers,
}: PayoutReconciliationViewProps) {
  const p = mCopy.payout;

  const [batchFilter, setBatchFilter] = useState<"all" | PayoutBatchStatus>(
    "all",
  );
  const [selectedStatement, setSelectedStatement] =
    useState<PayoutBatchView | null>(null);
  const [editingBankPropId, setEditingBankPropId] = useState<PropertyId | null>(
    null,
  );
  const [bankNameInput, setBankNameInput] = useState("");
  const [bankAccountInput, setBankAccountInput] = useState("");
  const [bankHolderInput, setBankHolderInput] = useState("");

  const filteredBatches = vm.batches.filter(
    (b) => batchFilter === "all" || b.status === batchFilter,
  );

  const startEditBank = (acc: PayoutModuleViewModel["bankAccounts"][number]) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    setEditingBankPropId(acc.propertyId);
    setBankNameInput(acc.bankName);
    setBankAccountInput(acc.accountNumber);
    setBankHolderInput(acc.accountHolder);
  };

  const handleSaveBankInfo = () => {
    if (!editingBankPropId) return;
    const nextLedgers: PayoutLedgersMaster = {
      ...payoutLedgers,
      bankAccounts: payoutLedgers.bankAccounts.map((ba) =>
        ba.propertyId === editingBankPropId
          ? {
              ...ba,
              bankName: bankNameInput.trim() || ba.bankName,
              accountNumber: bankAccountInput.trim() || ba.accountNumber,
              accountHolder: bankHolderInput.trim() || ba.accountHolder,
              updatedAt: "2026-11-06",
            }
          : ba,
      ),
    };
    setEditingBankPropId(null);
    onSavePayoutLedgers(nextLedgers, mCopy.common.savedToast);
  };

  const handleRequestEarlyPayout = (batchId: string) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    const nextLedgers: PayoutLedgersMaster = {
      ...payoutLedgers,
      batches: payoutLedgers.batches.map((b) =>
        b.id === batchId
          ? {
              ...b,
              status: "processing",
              bankTransferRef: b.bankTransferRef ?? `EARLY-${batchId}`,
            }
          : b,
      ),
    };
    onSavePayoutLedgers(nextLedgers, p.earlyPayoutTriggeredToast);
  };

  const kpiCards = [
    {
      id: "total",
      testId: "payout-kpi-total",
      label: p.kpiTotalReconciled,
      value: vm.kpis.totalReconciledFormatted,
      cls: "text-[#16A34A]",
      bg: "bg-emerald-50",
      icon: <Wallet className="w-[18px] h-[18px] text-[#16A34A]" />,
    },
    {
      id: "paid",
      testId: "payout-kpi-paid",
      label: p.kpiPaidBank,
      value: vm.kpis.paidBankFormatted,
      cls: "text-[#2563EB]",
      bg: "bg-blue-50",
      icon: <CheckCircle2 className="w-[18px] h-[18px] text-[#2563EB]" />,
    },
    {
      id: "processing",
      testId: "payout-kpi-processing",
      label: p.kpiProcessing,
      value: vm.kpis.processingFormatted,
      cls: "text-[#D97706]",
      bg: "bg-amber-50",
      icon: <Clock className="w-[18px] h-[18px] text-[#D97706]" />,
    },
    {
      id: "upcoming",
      testId: "payout-kpi-upcoming",
      label: p.kpiUpcoming,
      value: vm.kpis.upcomingFormatted,
      cls: "text-[#4F46E5]",
      bg: "bg-indigo-50",
      icon: <CalendarClock className="w-[18px] h-[18px] text-[#4F46E5]" />,
    },
  ];

  return (
    <div data-testid="module-payout-view" className="space-y-6 min-w-0">
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
          {p.pageTitle}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-3xl">
          {p.pageSubtitle}
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

      {/* Bank Accounts Section */}
      <section
        data-testid="payout-banks-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <h2 className="text-[17px] font-bold text-slate-900 m-0 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{p.bankSectionTitle}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0">
          {vm.bankAccounts.map((ba) => (
            <div
              key={ba.propertyId}
              data-testid={`bank-card-${ba.propertyId}`}
              className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 flex flex-col justify-between gap-3 min-w-0"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px] font-bold text-slate-900 truncate">
                    {ba.propertyShortName}
                  </span>
                  {ba.verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {p.bankVerifiedBadge}
                    </span>
                  )}
                </div>

                <div className="text-[13px] font-semibold text-indigo-700 truncate">
                  {ba.bankName}
                </div>
                <div className="text-[14px] font-bold text-slate-900 tabular">
                  {ba.accountNumber}
                </div>
                <div className="text-[11.5px] font-medium text-slate-600 truncate">
                  {ba.accountHolder}
                </div>
                <div className="text-[12px] text-slate-500">
                  {ba.payoutCycleText}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/75 flex justify-end">
                <button
                  type="button"
                  data-testid={`edit-bank-btn-${ba.propertyId}`}
                  onClick={() => startEditBank(ba)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>{p.editBankBtn}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payout Batches Table */}
      <section
        data-testid="payout-batches-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-slate-900 m-0">
            {p.batchesTitle}
          </h2>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "paid", "processing", "upcoming"] as const).map((st) => {
              const lbl =
                st === "all"
                  ? mCopy.common.allFilter
                  : st === "paid"
                    ? p.filterPaid
                    : st === "processing"
                      ? p.filterProcessing
                      : p.filterUpcoming;
              return (
                <button
                  key={st}
                  type="button"
                  data-testid={`payout-filter-${st}`}
                  onClick={() => setBatchFilter(st)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    batchFilter === st
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

        {filteredBatches.length === 0 ? (
          <div
            data-testid="payout-batches-empty"
            className="py-12 text-center text-[13px] text-slate-500 max-w-lg mx-auto"
          >
            {p.batchesEmpty}
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[12px] font-semibold text-slate-700">
                  <th className="py-3 px-3">{p.colCycle}</th>
                  <th className="py-3 px-3">{p.colProperty}</th>
                  <th className="py-3 px-3">{p.colPeriod}</th>
                  <th className="py-3 px-3 text-right">{p.colBookingsCount}</th>
                  <th className="py-3 px-3 text-right">{p.colNetAmount}</th>
                  <th className="py-3 px-3">{p.colPayoutDate}</th>
                  <th className="py-3 px-3">{p.colStatus}</th>
                  <th className="py-3 px-3 text-right">{p.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {filteredBatches.map((batch) => {
                  const statusBadge =
                    batch.status === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : batch.status === "processing"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200";
                  const statusLabel =
                    batch.status === "paid"
                      ? p.statusPaid
                      : batch.status === "processing"
                        ? p.statusProcessing
                        : p.statusUpcoming;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-bold text-slate-900 tabular whitespace-nowrap">
                        {batch.id}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                        {batch.propertyShortName}
                      </td>
                      <td className="py-3 px-3 text-slate-600 tabular whitespace-nowrap">
                        {batch.periodLabel}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular">
                        {batch.bookingsCount}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#16A34A] tabular whitespace-nowrap">
                        {batch.netPayoutFormatted}
                      </td>
                      <td className="py-3 px-3 text-slate-600 tabular whitespace-nowrap">
                        {batch.paidAtLabel ?? batch.scheduledPayoutLabel}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${statusBadge}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap space-x-1.5">
                        {batch.status === "upcoming" && (
                          <button
                            type="button"
                            data-testid={`early-payout-btn-${batch.id}`}
                            onClick={() => handleRequestEarlyPayout(batch.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>{p.requestEarlyPayoutBtn}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`statement-btn-${batch.id}`}
                          onClick={() => setSelectedStatement(batch)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{p.viewStatementBtn}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Statement Detail Modal */}
      <Dialog
        open={Boolean(selectedStatement)}
        onOpenChange={(open) => !open && setSelectedStatement(null)}
      >
        <DialogContent
          data-testid="payout-statement-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          {selectedStatement && (
            <>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-[17px] font-bold text-slate-900">
                  {p.statementModalTitle} · {selectedStatement.id}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] text-slate-600">
                  {selectedStatement.propertyShortName} ·{" "}
                  {selectedStatement.periodLabel}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-3">
                {selectedStatement.bankTransferRef && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="text-slate-500">
                      {p.statementBankRef}:
                    </span>
                    <span className="font-bold text-slate-900 tabular">
                      {selectedStatement.bankTransferRef}
                    </span>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedStatement.lineItems.map((li) => (
                    <div
                      key={li.bookingCode}
                      className="rounded-xl border border-slate-200/90 bg-white p-3 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStatement(null);
                              onOpenBookingByRef(li.refSessionId);
                            }}
                            className="font-bold text-indigo-600 hover:underline tabular text-[13px]"
                          >
                            {li.bookingCode}
                          </button>
                          <span className="text-[12.5px] font-semibold text-slate-900 truncate">
                            {li.guestFullName}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-slate-500 truncate">
                          {li.roomLabel} · {li.stayLabel}
                        </div>
                      </div>
                      <span className="font-bold text-[#16A34A] text-[13.5px] tabular shrink-0">
                        {li.netRevenueFormatted}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-emerald-900">
                    {p.colNetAmount}
                  </span>
                  <span className="text-[18px] font-bold text-emerald-700 tabular">
                    {selectedStatement.netPayoutFormatted}
                  </span>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedStatement(null)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800"
                >
                  {mCopy.common.closeBtn}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Bank Account Modal */}
      <Dialog
        open={Boolean(editingBankPropId)}
        onOpenChange={(open) => !open && setEditingBankPropId(null)}
      >
        <DialogContent
          data-testid="payout-bank-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-[17px] font-bold text-slate-900">
              {p.bankModalTitle}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-slate-600">
              {p.bankSectionTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                {p.bankFieldName}
              </label>
              <input
                type="text"
                data-testid="bank-name-input"
                value={bankNameInput}
                onChange={(e) => setBankNameInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                {p.bankFieldAccount}
              </label>
              <input
                type="text"
                data-testid="bank-account-input"
                value={bankAccountInput}
                onChange={(e) => setBankAccountInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 tabular"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                {p.bankFieldHolder}
              </label>
              <input
                type="text"
                data-testid="bank-holder-input"
                value={bankHolderInput}
                onChange={(e) => setBankHolderInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBankPropId(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700"
              >
                {mCopy.common.cancelBtn}
              </button>
              <button
                type="button"
                data-testid="save-bank-btn"
                onClick={handleSaveBankInfo}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
              >
                {mCopy.common.saveBtn}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
