import { useMemo, useState } from "react";
import { CalendarDays, Clock, LayoutGrid, Lock, LockOpen } from "lucide-react";
import {
  formatCountdown,
  type DailyRoomCell,
  type DailyRoomSchedule,
} from "@/data";

export type ExplorerStatusFilter =
  | "all"
  | "vacant"
  | "hold"
  | "auction"
  | "other";
export type ExplorerViewMode = "day" | "timeline";

interface RoomScheduleExplorerProps {
  schedules: DailyRoomSchedule[];
  initialView?: ExplorerViewMode;
  initialDayOffset?: number;
  initialStatusFilter?: ExplorerStatusFilter;
  selectedDayOffset?: number;
  onSelectDayOffset?: (dayOffset: number) => void;
  viewMode?: ExplorerViewMode;
  onChangeViewMode?: (mode: ExplorerViewMode) => void;
  statusFilter?: ExplorerStatusFilter;
  onChangeStatusFilter?: (filter: ExplorerStatusFilter) => void;
  classFilter?: string;
  onChangeClassFilter?: (classId: string) => void;
  selectedRoomNum?: number;
  onSelectRoomNum?: (roomNumber: number) => void;
  compact?: boolean;
  onToggleRoomLock?: (dayOffset: number, cell: DailyRoomCell) => void;
}

const SHORT_CHANNEL: Record<string, string> = {
  "Booking.com": "Booking",
  Agoda: "Agoda",
  Traveloka: "Traveloka",
  "Walk-in / Doanh nghiệp": "Lễ tân",
  "Lễ tân / Walk-in": "Lễ tân",
};

const SHORT_DAY_LABEL: Record<string, string> = {
  "Hôm nay": "Nay",
  "Ngày mai": "Mai",
  "Thứ 2": "T2",
  "Thứ 3": "T3",
  "Thứ 4": "T4",
  "Thứ 5": "T5",
  "Thứ 6": "T6",
  "Thứ 7": "T7",
  CN: "CN",
};

export function RoomScheduleExplorer({
  schedules,
  initialView = "day",
  initialDayOffset = 0,
  initialStatusFilter = "all",
  selectedDayOffset: controlledDayOffset,
  onSelectDayOffset,
  viewMode: controlledViewMode,
  onChangeViewMode,
  statusFilter: controlledStatusFilter,
  onChangeStatusFilter,
  classFilter: controlledClassFilter,
  onChangeClassFilter,
  selectedRoomNum: controlledRoomNum,
  onSelectRoomNum,
  compact = false,
  onToggleRoomLock,
}: RoomScheduleExplorerProps) {
  const [internalViewMode, setInternalViewMode] =
    useState<ExplorerViewMode>(initialView);
  const [internalDayOffset, setInternalDayOffset] =
    useState<number>(initialDayOffset);
  const [internalStatusFilter, setInternalStatusFilter] =
    useState<ExplorerStatusFilter>(initialStatusFilter);
  const [internalClassFilter, setInternalClassFilter] = useState<string>("all");
  const [internalRoomNum, setInternalRoomNum] = useState<number>(108);

  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: ExplorerViewMode) => {
    setInternalViewMode(mode);
    onChangeViewMode?.(mode);
  };

  const selectedDayOffset = controlledDayOffset ?? internalDayOffset;
  const setSelectedDayOffset = (offset: number) => {
    setInternalDayOffset(offset);
    onSelectDayOffset?.(offset);
  };

  const statusFilter = controlledStatusFilter ?? internalStatusFilter;
  const setStatusFilter = (filter: ExplorerStatusFilter) => {
    setInternalStatusFilter(filter);
    onChangeStatusFilter?.(filter);
  };

  const classFilter = controlledClassFilter ?? internalClassFilter;
  const setClassFilter = (cls: string) => {
    setInternalClassFilter(cls);
    onChangeClassFilter?.(cls);
  };

  const selectedRoomNum = controlledRoomNum ?? internalRoomNum;
  const setSelectedRoomNum = (roomNum: number) => {
    setInternalRoomNum(roomNum);
    onSelectRoomNum?.(roomNum);
  };

  const activeSchedule =
    schedules.find((s) => s.dayOffset === selectedDayOffset) ?? schedules[0];

  const roomGroups = useMemo(() => {
    if (!activeSchedule) return [];
    const groupsMap = new Map<
      string,
      {
        roomClassId: string;
        roomClass: string;
        category: string;
        allRooms: DailyRoomCell[];
        filteredRooms: DailyRoomCell[];
      }
    >();

    activeSchedule.rooms.forEach((cell) => {
      let grp = groupsMap.get(cell.roomClassId);
      if (!grp) {
        grp = {
          roomClassId: cell.roomClassId,
          roomClass: cell.roomClass,
          category: cell.category,
          allRooms: [],
          filteredRooms: [],
        };
        groupsMap.set(cell.roomClassId, grp);
      }
      grp.allRooms.push(cell);
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "vacant"
            ? cell.status === "vacant_unlocked"
            : statusFilter === "hold"
              ? cell.status === "payment_hold"
              : statusFilter === "auction"
                ? cell.status === "booked_auction"
                : cell.status === "booked_other";
      if (matchStatus) {
        grp.filteredRooms.push(cell);
      }
    });

    return Array.from(groupsMap.values());
  }, [activeSchedule, statusFilter]);

  const timelineRoomRows = useMemo(() => {
    const baseRooms = schedules[0]?.rooms ?? [];
    return baseRooms.filter((r) => {
      if (classFilter !== "all" && r.roomClassId !== classFilter) return false;
      if (statusFilter === "all") return true;
      const cellOnSelectedDay = activeSchedule?.rooms.find(
        (c) => c.roomNumber === r.roomNumber,
      );
      if (!cellOnSelectedDay) return true;
      if (statusFilter === "vacant")
        return cellOnSelectedDay.status === "vacant_unlocked";
      if (statusFilter === "hold")
        return cellOnSelectedDay.status === "payment_hold";
      if (statusFilter === "auction")
        return cellOnSelectedDay.status === "booked_auction";
      return cellOnSelectedDay.status === "booked_other";
    });
  }, [schedules, classFilter, statusFilter, activeSchedule]);

  if (!activeSchedule) return null;

  const focusedCell =
    activeSchedule.rooms.find((r) => r.roomNumber === selectedRoomNum) ??
    activeSchedule.rooms[0];

  return (
    <div className="min-w-0 w-full space-y-3.5">
      {/* Top Toolbar: View Switcher + Compact Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="inline-flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/70">
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
              viewMode === "day"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Theo từng ngày
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all whitespace-nowrap ${
              viewMode === "timeline"
                ? "bg-white text-zinc-950 shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Bảng lịch 14 ngày
          </button>
        </div>

        {/* Status Quick Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(
            [
              ["all", `Tất cả (${activeSchedule.totalRooms})`, "bg-zinc-900 text-white"],
              [
                "vacant",
                `Trống (${activeSchedule.vacantRooms})`,
                "bg-sky-600 text-white",
              ],
              [
                "hold",
                `Tạm khóa 10p (${activeSchedule.paymentHoldRooms ?? 0})`,
                "bg-amber-600 text-white",
              ],
              [
                "auction",
                `goodNstay (${activeSchedule.auctionBooked})`,
                "bg-emerald-600 text-white",
              ],
              [
                "other",
                `Kênh khác (${activeSchedule.otherBooked})`,
                "bg-zinc-700 text-white",
              ],
            ] as const
          ).map(([key, label, activeCls]) => {
            const active = statusFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? `${activeCls} border-transparent`
                    : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: ZERO-OVERFLOW 7×2 CALENDAR + 5-COLUMN FLOOR ROOM GRID         */}
      {/* ===================================================================== */}
      {viewMode === "day" && (
        <div className="space-y-3.5 min-w-0">
          {/* 14-Day 2-Row Calendar Grid (7 columns × 2 rows — zero horizontal overflow!) */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {schedules.map((day) => {
              const isSelected = day.dayOffset === selectedDayOffset;
              const occPct = Math.round(
                ((day.otherBooked + day.auctionBooked) / day.totalRooms) * 100,
              );
              const holdCnt = day.paymentHoldRooms ?? 0;
              return (
                <button
                  key={day.isoDate}
                  type="button"
                  onClick={() => setSelectedDayOffset(day.dayOffset)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200/80 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-mono font-bold text-xs">
                      {day.dateStr}
                    </span>
                    <span
                      className={`text-[10px] truncate ${
                        isSelected ? "text-zinc-300" : "text-zinc-400"
                      }`}
                    >
                      {holdCnt > 0 ? `Giữ ${holdCnt}` : day.dayLabel}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-zinc-200/60 overflow-hidden mt-1.5 flex">
                    <div
                      className={`h-full ${
                        isSelected ? "bg-emerald-400" : "bg-zinc-700"
                      }`}
                      style={{ width: `${occPct}%` }}
                    />
                    {holdCnt > 0 && (
                      <div
                        className="h-full bg-amber-400"
                        style={{
                          width: `${Math.round((holdCnt / day.totalRooms) * 100)}%`,
                        }}
                      />
                    )}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-1 flex items-center justify-between ${
                      isSelected
                        ? "text-sky-300"
                        : day.vacantRooms > 0
                          ? "text-sky-600 font-medium"
                          : "text-rose-500"
                    }`}
                  >
                    <span>{day.vacantRooms} trống</span>
                    <span
                      className={
                        isSelected ? "text-zinc-400" : "text-zinc-400 font-normal"
                      }
                    >
                      {day.otherBooked + day.auctionBooked} đặt
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Date Context Bar */}
          <div className="px-3.5 py-2 rounded-xl bg-zinc-50 border border-zinc-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-zinc-900">
                Ngày {activeSchedule.fullDate} ({activeSchedule.dayLabel})
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-zinc-600">
                Đã khóa{" "}
                <strong className="font-mono text-zinc-900">
                  {activeSchedule.otherBooked + activeSchedule.auctionBooked}/
                  {activeSchedule.totalRooms}
                </strong>{" "}
                (goodNstay: {activeSchedule.auctionBooked}, Kênh khác:{" "}
                {activeSchedule.otherBooked}
                {(activeSchedule.paymentHoldRooms ?? 0) > 0
                  ? `, Tạm khóa 10p: ${activeSchedule.paymentHoldRooms}`
                  : ""}
                )
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {activeSchedule.policyShort}
            </span>
          </div>

          {/* 30 Rooms Grouped by Room Class (5 per row in modal = exact hotel floor layout!) */}
          <div className="space-y-2.5">
            {roomGroups.every((grp) => grp.filteredRooms.length === 0) && (
              <div className="p-6 rounded-xl bg-white border border-zinc-200/80 text-center text-xs text-zinc-500 space-y-2">
                <div>
                  Không có phòng nào thuộc bộ lọc hiện tại trong ngày{" "}
                  <strong>{activeSchedule.fullDate}</strong>.
                </div>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="px-3 py-1 rounded-lg bg-zinc-900 text-white font-medium cursor-pointer"
                >
                  Xem tất cả {activeSchedule.totalRooms} phòng
                </button>
              </div>
            )}
            {roomGroups.map((grp) => {
              if (grp.filteredRooms.length === 0) return null;
              const vacantInGrp = grp.allRooms.filter(
                (r) => r.status === "vacant_unlocked",
              ).length;
              const holdInGrp = grp.allRooms.filter(
                (r) => r.status === "payment_hold",
              ).length;

              return (
                <div
                  key={grp.roomClassId}
                  className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[11px] font-medium shrink-0">
                        {grp.category}
                      </span>
                      <span className="font-semibold text-zinc-900 truncate">
                        {grp.roomClass}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs text-zinc-500 shrink-0">
                      {holdInGrp > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10.5px] font-semibold">
                          {holdInGrp} giữ 10p
                        </span>
                      )}
                      <span>
                        <strong
                          className={
                            vacantInGrp > 0 ? "text-sky-600" : "text-zinc-500"
                          }
                        >
                          {vacantInGrp}
                        </strong>
                        /{grp.allRooms.length} trống
                      </span>
                    </div>
                  </div>

                  <div
                    className={`grid gap-2 ${
                      compact
                        ? "grid-cols-2 sm:grid-cols-5"
                        : "grid-cols-2 sm:grid-cols-5 xl:grid-cols-10"
                    }`}
                  >
                    {grp.filteredRooms.map((cell) => {
                      const isAuction = cell.status === "booked_auction";
                      const isHold = cell.status === "payment_hold";
                      const isVacant = cell.status === "vacant_unlocked";
                      const isSelected =
                        cell.roomNumber === focusedCell?.roomNumber;
                      const shortSource =
                        SHORT_CHANNEL[cell.sourceChannel] ??
                        (cell.sourceChannel.includes("Khóa tay")
                          ? "Khóa tay"
                          : cell.sourceChannel);

                      return (
                        <button
                          key={cell.roomNumber}
                          type="button"
                          onClick={() => {
                            setSelectedRoomNum(cell.roomNumber);
                            onToggleRoomLock?.(activeSchedule.dayOffset, cell);
                          }}
                          onMouseEnter={() => setSelectedRoomNum(cell.roomNumber)}
                          title={
                            isAuction
                              ? `Phòng #${cell.roomNumber} (${cell.branchName}): Đã khóa đơn goodNstay (${cell.linkedReqId})`
                              : isHold
                                ? `Phòng #${cell.roomNumber} (${cell.branchName}): Đang tạm khóa chờ thanh toán 10p bởi #${cell.linkedReqId ?? "goodNstay"} (còn ${formatCountdown(cell.holdRemainingSeconds ?? 600)}) — Không thể chọn đè`
                                : isVacant
                                  ? `Bấm để KHÓA thủ công phòng #${cell.roomNumber} ngày ${activeSchedule.dateStr}`
                                  : `Bấm để MỞ KHÓA phòng #${cell.roomNumber} nhận đấu giá ngày ${activeSchedule.dateStr}`
                          }
                          className={`group px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                            isAuction
                              ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                              : isHold
                                ? "bg-amber-50/90 border-amber-400 text-amber-950"
                                : isVacant
                                  ? cell.activeAuctionCount > 0
                                    ? "bg-sky-50/80 border-sky-400 hover:border-sky-600 text-zinc-900"
                                    : "bg-white border-sky-200 hover:border-sky-500 text-zinc-900"
                                  : "bg-zinc-100/70 border-zinc-200 hover:border-zinc-400 text-zinc-600"
                          } ${isSelected ? "ring-2 ring-zinc-900/80" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs">
                              #{cell.roomNumber}
                            </span>
                            {onToggleRoomLock ? (
                              isAuction ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9.5px] font-semibold shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  Đã TT
                                </span>
                              ) : isHold ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-200/90 text-amber-900 text-[9.5px] font-mono font-semibold shrink-0">
                                  <Clock className="w-2.5 h-2.5" />
                                  {formatCountdown(cell.holdRemainingSeconds ?? 600)}
                                </span>
                              ) : isVacant ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-100 group-hover:bg-zinc-900 text-sky-800 group-hover:text-white text-[9.5px] font-semibold transition-colors shrink-0">
                                  <LockOpen className="w-2.5 h-2.5" />
                                  Khóa
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white group-hover:bg-sky-600 text-zinc-700 group-hover:text-white border border-zinc-200/80 text-[9.5px] font-semibold transition-colors shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  Mở khóa
                                </span>
                              )
                            ) : isVacant ? (
                              <LockOpen className="w-3 h-3 text-sky-600 shrink-0" />
                            ) : isHold ? (
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            ) : (
                              <Lock
                                className={`w-3 h-3 shrink-0 ${
                                  isAuction
                                    ? "text-emerald-600"
                                    : "text-zinc-400"
                                }`}
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                            <span className="truncate font-medium">
                              {isAuction
                                ? `#${cell.linkedReqId?.replace("CRQ-", "") ?? "TT"}`
                                : isHold
                                  ? `Giữ #${cell.linkedReqId?.replace("CRQ-", "") ?? "10p"}`
                                  : isVacant
                                    ? cell.activeAuctionCount > 0
                                      ? `Đấu ${cell.activeAuctionCount} phiên`
                                      : "Trống mở"
                                    : shortSource}
                            </span>
                            <span className="text-[9.5px] text-zinc-400 font-mono shrink-0">
                              {isHold
                                ? "10p TT"
                                : isVacant
                                  ? activeSchedule.dateStr
                                  : cell.staySpanText.split(" (")[0]}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: ZERO-OVERFLOW 14-DAY × ROOM PMS TIMELINE                      */}
      {/* ===================================================================== */}
      {viewMode === "timeline" && (
        <div className="space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ["all", `Tất cả (${schedules[0]?.rooms.length ?? 0})`],
                  [
                    "sup",
                    `Superior (${schedules[0]?.rooms.filter((r) => r.roomClassId === "sup").length ?? 0})`,
                  ],
                  [
                    "dlx",
                    `Deluxe (${schedules[0]?.rooms.filter((r) => r.roomClassId === "dlx").length ?? 0})`,
                  ],
                  [
                    "fsuite",
                    `Suite (${schedules[0]?.rooms.filter((r) => r.roomClassId === "fsuite").length ?? 0})`,
                  ],
                  [
                    "osuite",
                    `Executive (${schedules[0]?.rooms.filter((r) => r.roomClassId === "osuite").length ?? 0})`,
                  ],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setClassFilter(id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                    classFilter === id
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-zinc-400">
              Chọn ô bất kỳ để xem đơn hoặc bấm nút Khóa / Mở khóa bên dưới
            </span>
          </div>

          <div className="w-full max-w-full border border-zinc-200/90 rounded-xl overflow-hidden bg-white">
            <div className="max-h-[360px] w-full overflow-auto">
              <table className="w-full min-w-[720px] table-fixed border-collapse text-[10.5px]">
                <thead className="sticky top-0 z-20 bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="sticky left-0 z-30 bg-zinc-50 py-2 px-2.5 text-left font-semibold text-zinc-700 border-r border-zinc-200 w-[104px]">
                      Phòng
                    </th>
                    {schedules.map((day) => {
                      const isSelDay = day.dayOffset === selectedDayOffset;
                      return (
                        <th
                          key={day.isoDate}
                          onClick={() => setSelectedDayOffset(day.dayOffset)}
                          className={`py-1.5 px-0.5 text-center font-mono cursor-pointer border-r border-zinc-100 last:border-r-0 ${
                            isSelDay
                              ? "bg-zinc-900 text-white"
                              : "text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          <div className="text-[9px] font-sans font-normal opacity-75">
                            {SHORT_DAY_LABEL[day.dayLabel] ?? day.dayLabel}
                          </div>
                          <div className="font-bold">{day.dateStr}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {timelineRoomRows.map((roomMeta) => (
                    <tr key={roomMeta.roomNumber} className="hover:bg-zinc-50/50">
                      <td className="sticky left-0 z-10 bg-white py-1.5 px-2.5 border-r border-zinc-200 font-medium text-zinc-900 truncate">
                        <span className="font-mono font-bold">
                          #{roomMeta.roomNumber}
                        </span>{" "}
                        <span className="text-zinc-400 text-[9.5px]">
                          {roomMeta.category.slice(0, 4)}
                        </span>
                      </td>
                      {schedules.map((day) => {
                        const cell = day.rooms.find(
                          (c) => c.roomNumber === roomMeta.roomNumber,
                        )!;
                        const isAuction = cell.status === "booked_auction";
                        const isHold = cell.status === "payment_hold";
                        const isVacant = cell.status === "vacant_unlocked";
                        const isFocused =
                          day.dayOffset === selectedDayOffset &&
                          roomMeta.roomNumber === focusedCell?.roomNumber;

                        return (
                          <td
                            key={day.isoDate}
                            className="p-0.5 border-r border-zinc-100 last:border-r-0 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDayOffset(day.dayOffset);
                                setSelectedRoomNum(roomMeta.roomNumber);
                              }}
                              onDoubleClick={() => {
                                onToggleRoomLock?.(day.dayOffset, cell);
                              }}
                              className={`w-full py-1 px-0.5 rounded text-[9.5px] font-mono truncate transition-all cursor-pointer ${
                                isAuction
                                  ? "bg-emerald-100/90 text-emerald-900 font-semibold"
                                  : isHold
                                    ? "bg-amber-100 text-amber-900 font-semibold border border-amber-300"
                                    : isVacant
                                      ? cell.activeAuctionCount > 0
                                        ? "bg-sky-100 text-sky-800 font-semibold border border-sky-300"
                                        : "bg-sky-50/50 text-sky-700 hover:bg-sky-100/60"
                                      : "bg-zinc-100 text-zinc-500"
                              } ${isFocused ? "ring-2 ring-zinc-900" : ""}`}
                              title={`Ngày ${day.fullDate} • Phòng #${cell.roomNumber}: ${cell.sourceChannel} (${cell.staySpanText}) — Nháy đúp để Khóa/Mở khóa`}
                            >
                              {isAuction
                                ? `#${cell.linkedReqId?.slice(-4) ?? "TT"}`
                                : isHold
                                  ? "10p"
                                  : isVacant
                                    ? cell.activeAuctionCount > 0
                                      ? `Đấu ${cell.activeAuctionCount}`
                                      : "Trống"
                                    : cell.sourceChannel.includes("Khóa tay")
                                      ? "Khóa"
                                      : "OTA"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Selected Room × Selected Date Inspection & Action Bar */}
      {focusedCell && (
        <div className="px-3.5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-white/15 font-mono font-semibold">
              {activeSchedule.fullDate}
            </span>
            <span className="font-mono font-bold text-emerald-300">
              Phòng #{focusedCell.roomNumber}
            </span>
            <span className="text-zinc-300">
              ({focusedCell.branchName} · Tầng {focusedCell.floor} · {focusedCell.roomClass})
            </span>
            <span className="text-zinc-500 hidden sm:inline">·</span>
            <span className="font-mono text-xs">
              {focusedCell.status === "booked_auction" ? (
                <span className="text-emerald-300 font-semibold">
                  Đã khóa goodNstay TT 100% ({focusedCell.linkedReqId}) ·{" "}
                  {focusedCell.staySpanText}
                </span>
              ) : focusedCell.status === "payment_hold" ? (
                <span className="text-amber-300 font-semibold">
                  Tạm khóa chờ TT 10p (#{focusedCell.linkedReqId ?? "goodNstay"}) · Còn{" "}
                  {formatCountdown(focusedCell.holdRemainingSeconds ?? 600)}/10:00 — Chặn khách khác &amp; Lễ tân chọn đè
                </span>
              ) : focusedCell.status === "booked_other" ? (
                <span className="text-zinc-200">
                  Đã khóa {focusedCell.sourceChannel} · {focusedCell.staySpanText}
                </span>
              ) : focusedCell.activeAuctionCount > 0 ? (
                <span className="text-sky-300 font-semibold">
                  Trống mở khóa · Đang đấu {focusedCell.activeAuctionCount} phiên (
                  {focusedCell.activeAuctionIds.map((id) => `#${id}`).join(", ")})
                </span>
              ) : (
                <span className="text-sky-300">
                  Trống mở khóa · Sẵn sàng đấu giá
                </span>
              )}
            </span>
          </div>

          {onToggleRoomLock && (
            <div className="shrink-0">
              {focusedCell.status === "booked_auction" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-medium">
                  <Lock className="w-3 h-3" />
                  Đã khóa đơn TT 100%
                </span>
              ) : focusedCell.status === "payment_hold" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-mono font-medium">
                  <Clock className="w-3 h-3" />
                  Đang giữ ghế 10p ({formatCountdown(focusedCell.holdRemainingSeconds ?? 600)})
                </span>
              ) : focusedCell.status === "vacant_unlocked" ? (
                <button
                  type="button"
                  onClick={() =>
                    onToggleRoomLock(activeSchedule.dayOffset, focusedCell)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs cursor-pointer transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Khóa phòng #{focusedCell.roomNumber} ({activeSchedule.dateStr})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onToggleRoomLock(activeSchedule.dayOffset, focusedCell)
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold text-xs cursor-pointer transition-colors"
                >
                  <LockOpen className="w-3.5 h-3.5" />
                  Mở khóa #{focusedCell.roomNumber} nhận Đấu giá
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
