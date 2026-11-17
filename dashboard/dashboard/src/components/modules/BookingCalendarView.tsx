import { useState } from "react";
import {
  CalendarDays,
  DoorOpen,
  BedDouble,
  ShieldAlert,
  Percent,
  Eye,
  Lock,
  Unlock,
  Phone,
  Users,
  ChevronDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  AppLocale,
  CalendarRoomBlockMaster,
  PropertyId,
  RoomInventoryMaster,
} from "@/data";
import type { HubModulesCopy } from "@/lib/hubModulesI18n";
import {
  nextIsoDay,
  type CalendarModuleViewModel,
  type CalendarWindowKey,
} from "@/services/hubModulesAnalytics";

interface BookingCalendarViewProps {
  vm: CalendarModuleViewModel;
  roomInventory: RoomInventoryMaster;
  mCopy: HubModulesCopy;
  locale: AppLocale;
  onChangeWindow: (next: CalendarWindowKey) => void;
  onOpenBookingByRef: (refOrCode: string) => void;
  onSaveRoomInventory: (next: RoomInventoryMaster, notice?: string) => void;
}

interface PendingBlockTarget {
  propertyId: PropertyId;
  roomNumber: number;
  roomTypeName: string;
  isoDate: string;
  dateLabel: string;
  existingBlockId?: string;
  existingReason?: string;
}

export function BookingCalendarView({
  vm,
  roomInventory,
  mCopy,
  onChangeWindow,
  onOpenBookingByRef,
  onSaveRoomInventory,
}: BookingCalendarViewProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | "booked" | "available" | "blocked"
  >("all");
  const [blockTarget, setBlockTarget] = useState<PendingBlockTarget | null>(
    null,
  );
  const [blockType, setBlockType] = useState<"maintenance" | "walkin_hold">(
    "walkin_hold",
  );
  const [blockReason, setBlockReason] = useState("");

  const c = mCopy.calendar;

  const filteredRoomRows = vm.roomRows.filter((row) => {
    if (statusFilter === "all") return true;
    return row.cells.some((cell) => cell.state === statusFilter);
  });

  const openCellAction = (
    row: CalendarModuleViewModel["roomRows"][number],
    cell: CalendarModuleViewModel["roomRows"][number]["cells"][number],
    dateLabel: string,
  ) => {
    if (cell.state === "booked" && cell.refSessionId) {
      onOpenBookingByRef(cell.refSessionId);
      return;
    }
    setBlockType(cell.blockType ?? "walkin_hold");
    setBlockReason(
      cell.blockTitle ??
        (cell.blockType === "maintenance"
          ? c.blockTypeMaint
          : c.blockTypeHold),
    );
    setBlockTarget({
      propertyId: row.propertyId,
      roomNumber: row.roomNumber,
      roomTypeName: row.roomTypeName,
      isoDate: cell.isoDate,
      dateLabel,
      existingBlockId: cell.blockId,
      existingReason: cell.blockTitle,
    });
  };

  const handleConfirmBlock = () => {
    if (!blockTarget) return;
    const reasonText =
      blockReason.trim() ||
      (blockType === "maintenance" ? c.blockTypeMaint : c.blockTypeHold);

    const newBlock: CalendarRoomBlockMaster = {
      id: `BLK-${Date.now()}`,
      propertyId: blockTarget.propertyId,
      roomNumber: blockTarget.roomNumber,
      startDate: blockTarget.isoDate,
      endDate: nextIsoDay(blockTarget.isoDate, 1),
      blockType,
      title: {
        vi: reasonText,
        en: reasonText,
        ko: reasonText,
      },
    };

    const nextInv: RoomInventoryMaster = {
      ...roomInventory,
      calendarBlocks: [...roomInventory.calendarBlocks, newBlock],
    };
    setBlockTarget(null);
    onSaveRoomInventory(nextInv, mCopy.common.savedToast);
  };

  const handleRemoveBlock = () => {
    if (!blockTarget?.existingBlockId) return;
    const nextInv: RoomInventoryMaster = {
      ...roomInventory,
      calendarBlocks: roomInventory.calendarBlocks.filter(
        (b) => b.id !== blockTarget.existingBlockId,
      ),
    };
    setBlockTarget(null);
    onSaveRoomInventory(nextInv, mCopy.common.savedToast);
  };

  const kpiCards = [
    {
      id: "arrivals",
      testId: "cal-kpi-arrivals",
      label: c.kpiArrivalsToday,
      value: String(vm.kpis.arrivalsTodayCount),
      valueCls: "text-[#16A34A]",
      icon: <DoorOpen className="w-[18px] h-[18px] text-[#16A34A]" />,
      bgCls: "bg-emerald-50",
    },
    {
      id: "inhouse",
      testId: "cal-kpi-inhouse",
      label: c.kpiInHouse,
      value: String(vm.kpis.inHouseTodayCount),
      valueCls: "text-[#2563EB]",
      icon: <BedDouble className="w-[18px] h-[18px] text-[#2563EB]" />,
      bgCls: "bg-blue-50",
    },
    {
      id: "blocked",
      testId: "cal-kpi-blocked",
      label: c.kpiBlockedRooms,
      value: String(vm.kpis.activeBlocksCount),
      valueCls: "text-[#D97706]",
      icon: <ShieldAlert className="w-[18px] h-[18px] text-[#D97706]" />,
      bgCls: "bg-amber-50",
    },
    {
      id: "occupancy",
      testId: "cal-kpi-occupancy",
      label: c.kpiOccupancy7d,
      value: vm.kpis.occupancyFormatted,
      valueCls: "text-[#4F46E5]",
      icon: <Percent className="w-[18px] h-[18px] text-[#4F46E5]" />,
      bgCls: "bg-indigo-50",
    },
  ];

  return (
    <div data-testid="module-calendar-view" className="space-y-6 min-w-0">
      {/* Header + Window Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
            {c.pageTitle}
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-3xl">
            {c.pageSubtitle}
          </p>
        </div>

        <div className="relative flex items-center shrink-0">
          <select
            data-testid="calendar-window-select"
            aria-label={c.pageTitle}
            value={vm.windowKey}
            onChange={(e) =>
              onChangeWindow(e.target.value as CalendarWindowKey)
            }
            className="appearance-none bg-white border border-slate-200/95 rounded-lg pl-3.5 pr-9 py-2 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300 focus:outline-none"
          >
            <option value="current7d">{c.windowCurrent7d}</option>
            <option value="extended14d">{c.windowExtended14d}</option>
            <option value="past7d">{c.windowPast7d}</option>
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5" />
        </div>
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
                className={`w-7 h-7 rounded-full ${k.bgCls} flex items-center justify-center shrink-0`}
              >
                {k.icon}
              </span>
            </div>
            <div
              className={`mt-2 text-[22px] font-bold tracking-tight tabular truncate ${k.valueCls}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </section>

      {/* Room Tape Chart Card */}
      <section
        data-testid="calendar-tape-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-slate-900 m-0 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{c.tapeTitle}</span>
            </h2>
            <p className="text-[12.5px] text-slate-500 mt-1 mb-0">
              {c.tapeHint}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "booked", "available", "blocked"] as const).map((f) => {
              const label =
                f === "all"
                  ? mCopy.common.allFilter
                  : f === "booked"
                    ? c.legendBooked
                    : f === "available"
                      ? c.legendAvailable
                      : c.legendBlocked;
              return (
                <button
                  key={f}
                  type="button"
                  data-testid={`calendar-filter-${f}`}
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    statusFilter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-400" />
            {c.legendBooked}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-50 border border-slate-300" />
            {c.legendAvailable}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-400" />
            {c.legendBlocked}
          </span>
        </div>

        {/* Scrollable Tape Matrix */}
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/95 border-b border-slate-200/90 text-[12px] font-semibold text-slate-700">
                <th className="py-2.5 px-3 min-w-[190px] sticky left-0 bg-slate-50/95 z-[1] border-r border-slate-200/80">
                  {c.colRoomUnit}
                </th>
                {vm.dateColumns.map((col) => (
                  <th
                    key={col.isoDate}
                    className={`py-2.5 px-2 text-center min-w-[92px] tabular ${
                      col.isReferenceToday
                        ? "bg-indigo-50/90 text-indigo-700"
                        : ""
                    }`}
                  >
                    <div>{col.shortDateLabel}</div>
                    {col.isReferenceToday && (
                      <span className="inline-block mt-0.5 rounded-full bg-indigo-600 text-white px-1.5 py-0 text-[10px] font-bold">
                        {c.todayBadge}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[12px]">
              {filteredRoomRows.map((row) => (
                <tr key={row.unitId} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 sticky left-0 bg-white z-[1] border-r border-slate-200/70">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-slate-900 tabular">
                        #{row.roomNumber}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 truncate">
                        {row.propertyShortName}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-slate-500 truncate max-w-[175px]">
                      {row.roomTypeName}
                    </div>
                  </td>

                  {row.cells.map((cell, idx) => {
                    const colMeta = vm.dateColumns[idx];
                    if (cell.state === "booked") {
                      return (
                        <td
                          key={cell.isoDate}
                          className={`p-1.5 ${
                            colMeta.isReferenceToday ? "bg-indigo-50/30" : ""
                          }`}
                        >
                          <button
                            type="button"
                            data-testid={`tape-booked-${row.roomNumber}-${cell.isoDate}`}
                            onClick={() =>
                              openCellAction(row, cell, colMeta.fullDateLabel)
                            }
                            className="w-full rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-1.5 text-left transition-colors"
                          >
                            <div className="font-bold text-emerald-800 text-[11.5px] tabular truncate">
                              {cell.bookingCode}
                            </div>
                            <div className="text-[10.5px] text-emerald-700 truncate">
                              {cell.guestName}
                            </div>
                          </button>
                        </td>
                      );
                    }

                    if (cell.state === "blocked") {
                      return (
                        <td
                          key={cell.isoDate}
                          className={`p-1.5 ${
                            colMeta.isReferenceToday ? "bg-indigo-50/30" : ""
                          }`}
                        >
                          <button
                            type="button"
                            data-testid={`tape-blocked-${row.roomNumber}-${cell.isoDate}`}
                            onClick={() =>
                              openCellAction(row, cell, colMeta.fullDateLabel)
                            }
                            className="w-full rounded-lg border border-amber-300 bg-amber-50/90 hover:bg-amber-100/80 px-2 py-1.5 text-left transition-colors"
                          >
                            <div className="flex items-center gap-1 font-semibold text-amber-800 text-[11px] truncate">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cell.blockTitle}</span>
                            </div>
                          </button>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={cell.isoDate}
                        className={`p-1.5 ${
                          colMeta.isReferenceToday ? "bg-indigo-50/20" : ""
                        }`}
                      >
                        <button
                          type="button"
                          data-testid={`tape-free-${row.roomNumber}-${cell.isoDate}`}
                          onClick={() =>
                            openCellAction(row, cell, colMeta.fullDateLabel)
                          }
                          className="w-full rounded-lg border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 px-2 py-2 text-center text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {c.freeCellAction}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Front-Desk Arrivals & Active Stays List */}
      <section
        data-testid="calendar-frontdesk-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0"
      >
        <h2 className="text-[17px] font-bold text-slate-900 m-0">
          {c.frontDeskTitle}
        </h2>

        {vm.frontDeskStays.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-slate-500">
            {c.frontDeskEmpty}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5 min-w-0">
            {vm.frontDeskStays.map((stay) => {
              const badgeCls =
                stay.stayStatus === "arriving_today"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : stay.stayStatus === "in_house"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-100 text-slate-600 border-slate-200";
              const badgeText =
                stay.stayStatus === "arriving_today"
                  ? c.stayArrivingToday
                  : stay.stayStatus === "in_house"
                    ? c.stayInHouse
                    : c.stayCheckedOut;

              return (
                <div
                  key={stay.refSessionId}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/45 p-4 flex flex-col justify-between gap-3 min-w-0"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-indigo-700 tabular">
                          {stay.bookingCode}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {stay.guestFullName}
                        </span>
                      </div>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeCls}`}
                      >
                        {badgeText}
                      </span>
                    </div>

                    <div className="text-[12.5px] text-slate-700 font-medium truncate">
                      {stay.propertyShortName} · #{stay.roomNumber} (
                      {stay.roomTypeName})
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-500 tabular">
                      <span>
                        {stay.checkInLabel} → {stay.checkOutLabel} ({stay.nights}{" "}
                        {mCopy.common.nightsUnit})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {stay.guestsCount} {mCopy.common.guestsUnit}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {stay.guestPhone}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between gap-2">
                    <span className="font-bold text-[#16A34A] text-[13.5px] tabular">
                      {stay.netRevenueFormatted}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenBookingByRef(stay.refSessionId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{stay.bookingCode}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Date Hold / Unblock Modal */}
      <Dialog
        open={Boolean(blockTarget)}
        onOpenChange={(open) => !open && setBlockTarget(null)}
      >
        <DialogContent
          data-testid="calendar-block-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          {blockTarget && (
            <>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-[17px] font-bold text-slate-900">
                  {c.blockModalTitle} · #{blockTarget.roomNumber}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] text-slate-600">
                  {blockTarget.roomTypeName} · {blockTarget.dateLabel} —{" "}
                  {c.blockModalSubtitle}
                </DialogDescription>
              </DialogHeader>

              {blockTarget.existingBlockId ? (
                <div className="mt-3 space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-[13px] text-amber-900">
                    <div className="font-semibold mb-1">{c.legendBlocked}</div>
                    <div>{blockTarget.existingReason}</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setBlockTarget(null)}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {mCopy.common.cancelBtn}
                    </button>
                    <button
                      type="button"
                      data-testid="calendar-unblock-confirm-btn"
                      onClick={handleRemoveBlock}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{c.unblockBtn}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(["walkin_hold", "maintenance"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setBlockType(t);
                          setBlockReason(
                            t === "maintenance"
                              ? c.blockTypeMaint
                              : c.blockTypeHold,
                          );
                        }}
                        className={`rounded-xl border p-3 text-left text-[12.5px] font-semibold transition-colors ${
                          blockType === t
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {t === "maintenance"
                          ? c.blockTypeMaint
                          : c.blockTypeHold}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                      {c.blockFieldReason}
                    </label>
                    <input
                      type="text"
                      data-testid="calendar-block-reason-input"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBlockTarget(null)}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {mCopy.common.cancelBtn}
                    </button>
                    <button
                      type="button"
                      data-testid="calendar-block-confirm-btn"
                      onClick={handleConfirmBlock}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700"
                    >
                      <Lock className="w-4 h-4" />
                      <span>{c.blockConfirmBtn}</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
