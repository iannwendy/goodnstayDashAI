import { useState } from "react";
import {
  BedDouble,
  CheckCircle2,
  Sparkles,
  Wrench,
  Users,
  Pencil,
  Search,
  Eye,
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
  RoomInventoryMaster,
  RoomUnitStatus,
  StaffRoleKey,
} from "@/data";
import type { HubModulesCopy } from "@/lib/hubModulesI18n";
import type {
  RoomCategoryView,
  RoomsModuleViewModel,
} from "@/services/hubModulesAnalytics";

interface RoomsManagementViewProps {
  vm: RoomsModuleViewModel;
  roomInventory: RoomInventoryMaster;
  mCopy: HubModulesCopy;
  activeRole: StaffRoleKey;
  onRequireManagerRole: () => void;
  onOpenBookingByRef: (refOrCode: string) => void;
  onSaveRoomInventory: (next: RoomInventoryMaster, notice?: string) => void;
}

export function RoomsManagementView({
  vm,
  roomInventory,
  mCopy,
  activeRole,
  onRequireManagerRole,
  onOpenBookingByRef,
  onSaveRoomInventory,
}: RoomsManagementViewProps) {
  const r = mCopy.rooms;

  const [unitFilter, setUnitFilter] = useState<"all" | RoomUnitStatus>("all");
  const [searchText, setSearchText] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<RoomCategoryView | null>(null);
  const [stdRateInput, setStdRateInput] = useState<number>(0);
  const [floorRateInput, setFloorRateInput] = useState<number>(0);

  const filteredUnits = vm.units.filter((u) => {
    if (unitFilter !== "all" && u.status !== unitFilter) return false;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      return (
        String(u.roomNumber).includes(q) ||
        u.roomTypeName.toLowerCase().includes(q) ||
        u.propertyShortName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleCategoryBidding = (catId: string, nextVal: boolean) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    const nextInv: RoomInventoryMaster = {
      ...roomInventory,
      roomTypes: roomInventory.roomTypes.map((rt) =>
        rt.id === catId ? { ...rt, biddingEnabled: nextVal } : rt,
      ),
    };
    onSaveRoomInventory(nextInv, mCopy.common.savedToast);
  };

  const openEditCategoryRates = (cat: RoomCategoryView) => {
    if (activeRole !== "manager") {
      onRequireManagerRole();
      return;
    }
    setEditingCategory(cat);
    setStdRateInput(cat.standardRateVnd);
    setFloorRateInput(cat.floorRateVnd);
  };

  const handleSaveCategoryRates = () => {
    if (!editingCategory) return;
    const safeStd = Math.max(200_000, Number(stdRateInput) || editingCategory.standardRateVnd);
    const safeFloor = Math.min(
      safeStd,
      Math.max(150_000, Number(floorRateInput) || editingCategory.floorRateVnd),
    );
    const nextInv: RoomInventoryMaster = {
      ...roomInventory,
      roomTypes: roomInventory.roomTypes.map((rt) =>
        rt.id === editingCategory.id
          ? { ...rt, standardRateVnd: safeStd, floorRateVnd: safeFloor }
          : rt,
      ),
    };
    setEditingCategory(null);
    onSaveRoomInventory(nextInv, mCopy.common.savedToast);
  };

  const handleSetUnitStatus = (unitId: string, nextStatus: RoomUnitStatus) => {
    const nextInv: RoomInventoryMaster = {
      ...roomInventory,
      units: roomInventory.units.map((u) =>
        u.unitId === unitId ? { ...u, status: nextStatus } : u,
      ),
    };
    onSaveRoomInventory(nextInv, mCopy.common.savedToast);
  };

  const kpiCards = [
    {
      id: "total",
      testId: "rooms-kpi-total",
      label: r.kpiTotalUnits,
      value: String(vm.kpis.totalUnits),
      cls: "text-slate-900",
    },
    {
      id: "ready",
      testId: "rooms-kpi-ready",
      label: r.kpiReady,
      value: String(vm.kpis.readyCount),
      cls: "text-[#16A34A]",
    },
    {
      id: "occupied",
      testId: "rooms-kpi-occupied",
      label: r.kpiOccupied,
      value: String(vm.kpis.occupiedCount),
      cls: "text-[#2563EB]",
    },
    {
      id: "dirty",
      testId: "rooms-kpi-dirty",
      label: r.kpiDirty,
      value: String(vm.kpis.dirtyCount),
      cls: "text-[#D97706]",
    },
    {
      id: "maint",
      testId: "rooms-kpi-maint",
      label: r.kpiMaintenance,
      value: String(vm.kpis.maintenanceCount),
      cls: "text-[#DC2626]",
    },
  ];

  return (
    <div data-testid="module-rooms-view" className="space-y-6 min-w-0">
      <div>
        <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
          {r.pageTitle}
        </h1>
        <p className="text-[13px] text-slate-500 mt-1 mb-0 max-w-3xl">
          {r.pageSubtitle}
        </p>
      </div>

      {/* 5 Summary KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5 min-w-0">
        {kpiCards.map((k) => (
          <div
            key={k.id}
            data-testid={k.testId}
            className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] min-w-0"
          >
            <div className="text-[12px] font-medium text-slate-500 truncate">
              {k.label}
            </div>
            <div
              className={`mt-1.5 text-[22px] font-bold tabular truncate ${k.cls}`}
            >
              {k.value}
            </div>
          </div>
        ))}
      </section>

      {/* 1. Room Categories & Pricing Guardrails Table */}
      <section
        data-testid="rooms-categories-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <h2 className="text-[17px] font-bold text-slate-900 m-0 flex items-center gap-2">
          <BedDouble className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{r.categoriesTitle}</span>
        </h2>

        <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[12px] font-semibold text-slate-700">
                <th className="py-3 px-3">{r.colRoomType}</th>
                <th className="py-3 px-3">{r.colCapacity}</th>
                <th className="py-3 px-3 text-right">{r.colStandardRate}</th>
                <th className="py-3 px-3 text-right">{r.colSafeFloorRate}</th>
                <th className="py-3 px-3 text-center">{r.colBiddingToggle}</th>
                <th className="py-3 px-3 text-right">{mCopy.common.editBtn}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {vm.categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{cat.name}</div>
                    <div className="text-[11.5px] text-slate-500">
                      {cat.propertyShortName} · {cat.bedSummary} · {cat.sizeSqm}m²
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 tabular">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {cat.maxGuests} {mCopy.common.guestsUnit} ({cat.readyUnitsCount}/
                      {cat.unitsCount})
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular whitespace-nowrap">
                    {cat.standardRateFormatted}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-700 tabular whitespace-nowrap">
                    {cat.floorRateFormatted}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Switch
                      data-testid={`toggle-bidding-${cat.id}`}
                      checked={cat.biddingEnabled}
                      onCheckedChange={(checked) =>
                        handleToggleCategoryBidding(cat.id, checked)
                      }
                    />
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      data-testid={`edit-rate-btn-${cat.id}`}
                      onClick={() => openEditCategoryRates(cat)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{r.editRateBtn}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Physical Room Units Housekeeping Grid */}
      <section
        data-testid="rooms-units-section"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-slate-900 m-0">
            {r.unitsGridTitle}
          </h2>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                data-testid="rooms-search-input"
                placeholder={r.searchRoomPlaceholder}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-1.5 text-[12.5px] text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {(
                ["all", "ready", "occupied", "dirty", "maintenance"] as const
              ).map((st) => {
                const lbl =
                  st === "all"
                    ? mCopy.common.allFilter
                    : st === "ready"
                      ? r.statusReady
                      : st === "occupied"
                        ? r.statusOccupied
                        : st === "dirty"
                          ? r.statusDirty
                          : r.statusMaintenance;
                return (
                  <button
                    key={st}
                    type="button"
                    data-testid={`rooms-filter-${st}`}
                    onClick={() => setUnitFilter(st)}
                    className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      unitFilter === st
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 min-w-0">
          {filteredUnits.map((unit) => {
            const statusStyle =
              unit.status === "ready"
                ? {
                    border: "border-emerald-200/90",
                    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    label: r.statusReady,
                    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                  }
                : unit.status === "occupied"
                  ? {
                      border: "border-blue-200/90",
                      pill: "bg-blue-50 text-blue-700 border-blue-200",
                      label: r.statusOccupied,
                      icon: <BedDouble className="w-3.5 h-3.5" />,
                    }
                  : unit.status === "dirty"
                    ? {
                        border: "border-amber-200/90",
                        pill: "bg-amber-50 text-amber-700 border-amber-200",
                        label: r.statusDirty,
                        icon: <Sparkles className="w-3.5 h-3.5" />,
                      }
                    : {
                        border: "border-red-200/90",
                        pill: "bg-red-50 text-red-700 border-red-200",
                        label: r.statusMaintenance,
                        icon: <Wrench className="w-3.5 h-3.5" />,
                      };

            return (
              <div
                key={unit.unitId}
                data-testid={`room-unit-card-${unit.roomNumber}`}
                className={`rounded-xl border ${statusStyle.border} bg-white p-3.5 flex flex-col justify-between gap-2.5 min-w-0`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-extrabold text-slate-900 tabular">
                      #{unit.roomNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusStyle.pill}`}
                    >
                      {statusStyle.icon}
                      {statusStyle.label}
                    </span>
                  </div>

                  <div className="text-[12.5px] font-semibold text-slate-800 truncate">
                    {unit.roomTypeName}
                  </div>
                  <div className="text-[11.5px] text-slate-500 truncate">
                    {unit.propertyShortName} · {mCopy.common.floorPrefix}{" "}
                    {unit.floor} · {unit.housekeepingAssignee}
                  </div>
                  <p className="text-[11.5px] text-slate-600 leading-snug m-0">
                    {unit.note}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                  {unit.status === "occupied" && unit.activeBookingRefId ? (
                    <button
                      type="button"
                      onClick={() =>
                        onOpenBookingByRef(unit.activeBookingRefId!)
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-[11.5px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{unit.activeBookingCode}</span>
                    </button>
                  ) : unit.status === "dirty" ? (
                    <button
                      type="button"
                      data-testid={`unit-mark-ready-${unit.roomNumber}`}
                      onClick={() => handleSetUnitStatus(unit.unitId, "ready")}
                      className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-[11.5px] font-semibold hover:bg-emerald-700"
                    >
                      {r.markReadyBtn}
                    </button>
                  ) : unit.status === "maintenance" ? (
                    <button
                      type="button"
                      data-testid={`unit-reopen-${unit.roomNumber}`}
                      onClick={() => handleSetUnitStatus(unit.unitId, "ready")}
                      className="rounded-lg bg-indigo-600 text-white px-2.5 py-1 text-[11.5px] font-semibold hover:bg-indigo-700"
                    >
                      {r.reopenRoomBtn}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        data-testid={`unit-mark-dirty-${unit.roomNumber}`}
                        onClick={() =>
                          handleSetUnitStatus(unit.unitId, "dirty")
                        }
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        {r.markDirtyBtn}
                      </button>
                      <button
                        type="button"
                        data-testid={`unit-mark-maint-${unit.roomNumber}`}
                        onClick={() =>
                          handleSetUnitStatus(unit.unitId, "maintenance")
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {r.markMaintBtn}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit Room Category Rates Modal */}
      <Dialog
        open={Boolean(editingCategory)}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent
          data-testid="room-rate-dialog"
          className="max-w-lg w-[92vw] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:p-6"
        >
          {editingCategory && (
            <>
              <DialogHeader className="text-left space-y-1">
                <DialogTitle className="text-[17px] font-bold text-slate-900">
                  {r.rateModalTitle}
                </DialogTitle>
                <DialogDescription className="text-[12.5px] text-slate-600">
                  {editingCategory.propertyShortName} · {editingCategory.name}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {r.rateFieldStandard}
                  </label>
                  <input
                    type="number"
                    step={10000}
                    data-testid="room-std-rate-input"
                    value={stdRateInput}
                    onChange={(e) => setStdRateInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] font-semibold text-slate-900 tabular"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                    {r.rateFieldFloor}
                  </label>
                  <input
                    type="number"
                    step={10000}
                    data-testid="room-floor-rate-input"
                    value={floorRateInput}
                    onChange={(e) => setFloorRateInput(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13.5px] font-semibold text-indigo-700 tabular"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-medium text-slate-700"
                  >
                    {mCopy.common.cancelBtn}
                  </button>
                  <button
                    type="button"
                    data-testid="save-room-rate-btn"
                    onClick={handleSaveCategoryRates}
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
