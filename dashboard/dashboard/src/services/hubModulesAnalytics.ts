import type {
  AmenityCode,
  AppLocale,
  BidDispatchMode,
  BidOutcomeStatus,
  BidRecordMaster,
  CurrencyCode,
  LiveRequestStatus,
  MasterDataBundle,
  PayoutBatchStatus,
  PropertyId,
  RoomUnitStatus,
  StayLifecycleStatus,
  UpsellCategory,
} from "@/data";
import {
  formatBusinessMoney,
  formatDisplayDate,
  localizeAmenityCode,
} from "@/lib/i18n";
import type { PropertyFilterKey, RecentBookingRow } from "@/services/overviewAnalytics";

export type CalendarWindowKey = "current7d" | "extended14d" | "past7d";

export interface CalendarDateColumn {
  isoDate: string;
  shortDateLabel: string;
  fullDateLabel: string;
  isReferenceToday: boolean;
}

export interface CalendarCellItem {
  isoDate: string;
  state: "available" | "booked" | "blocked";
  bookingCode?: string;
  refSessionId?: string;
  guestName?: string;
  nights?: number;
  netRevenueFormatted?: string;
  blockId?: string;
  blockType?: "maintenance" | "walkin_hold";
  blockTitle?: string;
}

export interface CalendarRoomTapeRow {
  unitId: string;
  propertyId: PropertyId;
  propertyShortName: string;
  roomNumber: number;
  floor: number;
  roomTypeName: string;
  housekeepingStatus: RoomUnitStatus;
  cells: CalendarCellItem[];
}

export interface FrontDeskStayItem {
  bookingCode: string;
  refSessionId: string;
  propertyShortName: string;
  guestFullName: string;
  guestPhone: string;
  roomNumber: number;
  roomTypeName: string;
  checkInIso: string;
  checkOutIso: string;
  checkInLabel: string;
  checkOutLabel: string;
  nights: number;
  guestsCount: number;
  stayStatus: StayLifecycleStatus;
  netRevenueVnd: number;
  netRevenueFormatted: string;
  guestNote: string;
}

export interface CalendarModuleViewModel {
  referenceDate: string;
  windowKey: CalendarWindowKey;
  dateColumns: CalendarDateColumn[];
  kpis: {
    arrivalsTodayCount: number;
    inHouseTodayCount: number;
    activeBlocksCount: number;
    occupancyRatePct: number;
    occupancyFormatted: string;
  };
  roomRows: CalendarRoomTapeRow[];
  frontDeskStays: FrontDeskStayItem[];
  allBookingsMap: Record<string, RecentBookingRow>;
}

export interface PayoutLineItemView {
  bookingCode: string;
  refSessionId: string;
  guestFullName: string;
  roomLabel: string;
  stayLabel: string;
  nights: number;
  netRevenueVnd: number;
  netRevenueFormatted: string;
}

export interface PayoutBatchView {
  id: string;
  propertyId: PropertyId;
  propertyShortName: string;
  cycleCode: string;
  periodLabel: string;
  scheduledPayoutLabel: string;
  paidAtLabel?: string;
  bankTransferRef?: string;
  status: PayoutBatchStatus;
  bookingsCount: number;
  netPayoutVnd: number;
  netPayoutFormatted: string;
  note: string;
  lineItems: PayoutLineItemView[];
}

export interface BankAccountView {
  propertyId: PropertyId;
  propertyShortName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  payoutCycleText: string;
  verified: boolean;
  autoSettlement: boolean;
  updatedAtLabel: string;
}

export interface PayoutModuleViewModel {
  kpis: {
    totalReconciledVnd: number;
    totalReconciledFormatted: string;
    paidBankVnd: number;
    paidBankFormatted: string;
    processingVnd: number;
    processingFormatted: string;
    upcomingVnd: number;
    upcomingFormatted: string;
  };
  bankAccounts: BankAccountView[];
  batches: PayoutBatchView[];
}

export interface RoomCategoryView {
  id: string;
  propertyId: PropertyId;
  propertyShortName: string;
  name: string;
  bedSummary: string;
  sizeSqm: number;
  maxGuests: number;
  unitsCount: number;
  readyUnitsCount: number;
  standardRateVnd: number;
  standardRateFormatted: string;
  floorRateVnd: number;
  floorRateFormatted: string;
  amenities: AmenityCode[];
  amenitiesLabels: string[];
  biddingEnabled: boolean;
}

export interface PhysicalRoomUnitView {
  unitId: string;
  propertyId: PropertyId;
  propertyShortName: string;
  roomTypeId: string;
  roomTypeName: string;
  roomNumber: number;
  floor: number;
  status: RoomUnitStatus;
  activeBookingCode?: string;
  activeBookingRefId?: string;
  housekeepingAssignee: string;
  note: string;
  standardRateFormatted: string;
}

export interface RoomsModuleViewModel {
  kpis: {
    totalUnits: number;
    readyCount: number;
    occupiedCount: number;
    dirtyCount: number;
    maintenanceCount: number;
  };
  categories: RoomCategoryView[];
  units: PhysicalRoomUnitView[];
}

export interface LiveRequestView {
  id: string;
  propertyId: PropertyId;
  propertyShortName: string;
  receivedAt: string;
  expiresInMinutes: number;
  checkInLabel: string;
  checkOutLabel: string;
  nights: number;
  guestsCount: number;
  roomTypePreference: string;
  travelerSegment: string;
  guestTargetRateVnd: number;
  guestTargetFormatted: string;
  suggestedWinRateVnd: number;
  suggestedWinFormatted: string;
  minFloorGuardrailVnd: number;
  minFloorGuardrailFormatted: string;
  requestedPerks: AmenityCode[];
  requestedPerksLabels: string[];
  guestMessage: string;
  status: LiveRequestStatus;
  submittedRateVnd?: number;
  submittedRateFormatted?: string;
  submittedTotalNetFormatted?: string;
  submittedPerksLabels?: string[];
  respondedAt?: string;
}

export interface AutoBidRuleView {
  propertyId: PropertyId;
  propertyShortName: string;
  propertyLabel: string;
  enabled: boolean;
  minFloorRateVnd: number;
  minFloorFormatted: string;
  maxDiscountPct: number;
  nightShiftAutoBoost: boolean;
  multiNightExtraDiscountPct: number;
  defaultPerks: AmenityCode[];
  defaultPerksLabels: string[];
  targetResponseSeconds: number;
  updatedAt: string;
}

export interface BidHistoryItemView {
  id: string;
  bookingCode?: string;
  propertyShortName: string;
  status: BidOutcomeStatus;
  bidMode: BidDispatchMode;
  sessionDateLabel: string;
  timeLabel: string;
  nights: number;
  offeredRateFormatted: string;
  totalEstimateFormatted: string;
}

export interface BiddingModuleViewModel {
  kpis: {
    waitingRequestsCount: number;
    sentOffersCount: number;
    acceptRate30dPct: number;
    acceptRate30dFormatted: string;
    autoBidActiveSummary: string;
  };
  liveRequests: LiveRequestView[];
  autoBidRules: AutoBidRuleView[];
  recentHistory: BidHistoryItemView[];
}

export interface ConversationMessageView {
  id: string;
  sender: "guest" | "hotel";
  sentAt: string;
  text: string;
}

export interface GuestConversationView {
  id: string;
  propertyId: PropertyId;
  propertyShortName: string;
  bookingCode: string;
  linkedBookingRefId?: string;
  guestName: string;
  guestPhone: string;
  receivedAt: string;
  unread: boolean;
  status: "needs_reply" | "replied";
  topicTag: string;
  staySummary: string;
  preview: string;
  thread: ConversationMessageView[];
}

export interface QuickReplyTemplateView {
  id: string;
  label: string;
  template: string;
}

export interface MessagesModuleViewModel {
  kpis: {
    totalThreads: number;
    unreadCount: number;
    repliedCount: number;
  };
  conversations: GuestConversationView[];
  quickReplies: QuickReplyTemplateView[];
}

export interface FlashDealView {
  id: string;
  propertyId: PropertyId;
  propertyShortName: string;
  title: string;
  subtitle: string;
  roomTypeName: string;
  bookingWindowLabel: string;
  discountPct: number;
  originalRateVnd: number;
  originalRateFormatted: string;
  dealRateVnd: number;
  dealRateFormatted: string;
  dailyRoomQuota: number;
  roomsSold30d: number;
  netRevenue30dVnd: number;
  netRevenue30dFormatted: string;
  perks: AmenityCode[];
  perksLabels: string[];
  active: boolean;
}

export interface UpsellOfferView {
  id: string;
  propertyId: PropertyId;
  propertyShortName: string;
  category: UpsellCategory;
  title: string;
  description: string;
  priceVnd: number;
  priceFormatted: string;
  pricingUnit: "per_night" | "per_stay";
  orders30d: number;
  extraRevenue30dVnd: number;
  extraRevenue30dFormatted: string;
  active: boolean;
}

export interface MarketingModuleViewModel {
  kpis: {
    activeCampaignsCount: number;
    promoRoomsSold30d: number;
    flashRevenue30dVnd: number;
    flashRevenue30dFormatted: string;
    upsellRevenue30dVnd: number;
    upsellRevenue30dFormatted: string;
  };
  flashDeals: FlashDealView[];
  upsellOffers: UpsellOfferView[];
}

function buildIsoRange(startIso: string, days: number): string[] {
  const startMs = Date.parse(`${startIso}T00:00:00Z`);
  const res: string[] = [];
  for (let i = 0; i < days; i++) {
    res.push(new Date(startMs + i * 86_400_000).toISOString().slice(0, 10));
  }
  return res;
}

export function nextIsoDay(isoDate: string, offsetDays = 1): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  return new Date(ms + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function resolveScopedPropertyIds(
  bundle: MasterDataBundle,
  propertyKey: PropertyFilterKey,
): Set<PropertyId> {
  if (propertyKey === "all") {
    return new Set(
      bundle.hubConfig.properties
        .filter((p) => p.isChainMember)
        .map((p) => p.id),
    );
  }
  return new Set([propertyKey]);
}

export function buildAllAcceptedBookingMap(
  bundle: MasterDataBundle,
  locale: AppLocale,
): Record<string, RecentBookingRow> {
  const propMap = new Map(
    bundle.hubConfig.properties.map((p) => [p.id, p] as const),
  );
  const out: Record<string, RecentBookingRow> = {};
  for (const r of bundle.bidRecords) {
    if (r.status !== "accepted") continue;
    const propMeta = propMap.get(r.propertyId);
    const checkInIso = r.checkInDate ?? r.sessionDate;
    const checkOutIso = r.checkOutDate ?? r.sessionDate;
    const safeNights = Math.max(1, r.nights || 1);
    const earned = r.netRevenueVnd ?? r.offeredRatePerNightVnd * safeNights;
    const row: RecentBookingRow = {
      bookingCode: r.bookingCode ?? `#${r.id}`,
      refSessionId: r.id,
      propertyName:
        propMeta?.label[locale] ??
        bundle.hubConfig.chainOverview.shortName[locale],
      roomName: r.roomName?.[locale] ?? "Deluxe Double",
      roomNumber: r.roomNumber ?? 108,
      checkInIso,
      checkOutIso,
      checkInLabel: formatDisplayDate(checkInIso, locale, true),
      checkOutLabel: formatDisplayDate(checkOutIso, locale, true),
      nights: safeNights,
      guestsCount: r.guestsCount ?? 2,
      paidAtLabel: `${formatDisplayDate(r.sessionDate, locale, true)} ${r.timeLabel}`,
      netRevenueVnd: earned,
      guestNote: r.guestNote?.[locale] ?? "",
      amenities: (r.amenities ?? ["wifi"]).map((c) =>
        localizeAmenityCode(c, locale),
      ),
    };
    out[r.id] = row;
    if (r.bookingCode) {
      out[r.bookingCode] = row;
    }
  }
  return out;
}

export function buildCalendarModuleViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    windowKey: CalendarWindowKey;
    locale: AppLocale;
    currency: CurrencyCode;
  },
): CalendarModuleViewModel {
  const { propertyKey, windowKey, locale, currency } = params;
  const cfg = bundle.hubConfig;
  const rates = cfg.currencyRates;
  const refDate = cfg.referenceDate;
  const scopedIds = resolveScopedPropertyIds(bundle, propertyKey);
  const propMap = new Map(cfg.properties.map((p) => [p.id, p] as const));
  const roomTypeMap = new Map(
    bundle.roomInventory.roomTypes.map((rt) => [rt.id, rt] as const),
  );

  const windowSpec: Record<CalendarWindowKey, { start: string; days: number }> = {
    current7d: { start: "2026-11-04", days: 7 },
    extended14d: { start: "2026-11-01", days: 14 },
    past7d: { start: "2026-10-28", days: 7 },
  };
  const { start, days } = windowSpec[windowKey];
  const isoDates = buildIsoRange(start, days);
  const windowEndExclusive = nextIsoDay(isoDates[isoDates.length - 1], 1);

  const dateColumns: CalendarDateColumn[] = isoDates.map((iso) => ({
    isoDate: iso,
    shortDateLabel: formatDisplayDate(iso, locale, false),
    fullDateLabel: formatDisplayDate(iso, locale, true),
    isReferenceToday: iso === refDate,
  }));

  const scopedUnits = bundle.roomInventory.units
    .filter((u) => scopedIds.has(u.propertyId))
    .sort((a, b) => a.roomNumber - b.roomNumber);

  const scopedAccepted = bundle.bidRecords.filter(
    (r): r is BidRecordMaster =>
      r.status === "accepted" && scopedIds.has(r.propertyId),
  );

  const scopedBlocks = bundle.roomInventory.calendarBlocks.filter((b) =>
    scopedIds.has(b.propertyId),
  );

  let bookedCellCount = 0;
  const totalCellCount = Math.max(1, scopedUnits.length * isoDates.length);

  const roomRows: CalendarRoomTapeRow[] = scopedUnits.map((unit) => {
    const prop = propMap.get(unit.propertyId);
    const rt = roomTypeMap.get(unit.roomTypeId);
    const roomBookings = scopedAccepted.filter(
      (b) => b.roomNumber === unit.roomNumber,
    );
    const roomBlocks = scopedBlocks.filter(
      (bl) => bl.roomNumber === unit.roomNumber,
    );

    const cells: CalendarCellItem[] = isoDates.map((iso) => {
      const hitBooking = roomBookings.find((b) => {
        const ci = b.checkInDate ?? b.sessionDate;
        const co = b.checkOutDate ?? nextIsoDay(ci, Math.max(1, b.nights || 1));
        return ci <= iso && iso < co;
      });
      if (hitBooking) {
        bookedCellCount += 1;
        const netVnd =
          hitBooking.netRevenueVnd ??
          hitBooking.offeredRatePerNightVnd * Math.max(1, hitBooking.nights || 1);
        return {
          isoDate: iso,
          state: "booked",
          bookingCode: hitBooking.bookingCode ?? `#${hitBooking.id}`,
          refSessionId: hitBooking.id,
          guestName: hitBooking.guestFullName ?? "Guest",
          nights: hitBooking.nights,
          netRevenueFormatted: formatBusinessMoney(netVnd, currency, { rates }),
        };
      }

      const hitBlock = roomBlocks.find(
        (bl) => bl.startDate <= iso && iso < bl.endDate,
      );
      if (hitBlock) {
        return {
          isoDate: iso,
          state: "blocked",
          blockId: hitBlock.id,
          blockType: hitBlock.blockType,
          blockTitle: hitBlock.title[locale],
        };
      }

      return {
        isoDate: iso,
        state: "available",
      };
    });

    return {
      unitId: unit.unitId,
      propertyId: unit.propertyId,
      propertyShortName: prop?.shortName[locale] ?? unit.propertyId,
      roomNumber: unit.roomNumber,
      floor: unit.floor,
      roomTypeName: rt?.name[locale] ?? "Standard",
      housekeepingStatus: unit.status,
      cells,
    };
  });

  const arrivalsTodayCount = scopedAccepted.filter(
    (b) => (b.checkInDate ?? b.sessionDate) === refDate,
  ).length;
  const inHouseTodayCount = scopedAccepted.filter((b) => {
    const ci = b.checkInDate ?? b.sessionDate;
    const co = b.checkOutDate ?? nextIsoDay(ci, 1);
    return ci <= refDate && refDate < co;
  }).length;
  const activeBlocksCount = scopedBlocks.length;
  const occupancyRatePct =
    scopedUnits.length > 0
      ? Number(((bookedCellCount / totalCellCount) * 100).toFixed(1))
      : 0;

  const staysInWindow = scopedAccepted
    .filter((b) => {
      const ci = b.checkInDate ?? b.sessionDate;
      const co = b.checkOutDate ?? nextIsoDay(ci, 1);
      return ci < windowEndExclusive && co > start;
    })
    .sort((a, b) =>
      (b.checkInDate ?? b.sessionDate).localeCompare(
        a.checkInDate ?? a.sessionDate,
      ),
    );

  const frontDeskStays: FrontDeskStayItem[] = staysInWindow.map((r) => {
    const prop = propMap.get(r.propertyId);
    const ci = r.checkInDate ?? r.sessionDate;
    const co = r.checkOutDate ?? nextIsoDay(ci, 1);
    const netVnd =
      r.netRevenueVnd ?? r.offeredRatePerNightVnd * Math.max(1, r.nights || 1);
    const computedStatus: StayLifecycleStatus =
      ci === refDate
        ? "arriving_today"
        : ci < refDate && refDate < co
          ? "in_house"
          : co <= refDate
            ? "checked_out"
            : "upcoming";
    return {
      bookingCode: r.bookingCode ?? `#${r.id}`,
      refSessionId: r.id,
      propertyShortName: prop?.shortName[locale] ?? r.propertyId,
      guestFullName: r.guestFullName ?? "Guest",
      guestPhone: r.guestPhone ?? "+84 905 000 000",
      roomNumber: r.roomNumber ?? 101,
      roomTypeName: r.roomName?.[locale] ?? "Deluxe",
      checkInIso: ci,
      checkOutIso: co,
      checkInLabel: formatDisplayDate(ci, locale, true),
      checkOutLabel: formatDisplayDate(co, locale, true),
      nights: Math.max(1, r.nights || 1),
      guestsCount: r.guestsCount ?? 2,
      stayStatus: r.stayStatus ?? computedStatus,
      netRevenueVnd: netVnd,
      netRevenueFormatted: formatBusinessMoney(netVnd, currency, { rates }),
      guestNote: r.guestNote?.[locale] ?? "",
    };
  });

  return {
    referenceDate: refDate,
    windowKey,
    dateColumns,
    kpis: {
      arrivalsTodayCount,
      inHouseTodayCount,
      activeBlocksCount,
      occupancyRatePct,
      occupancyFormatted: `${occupancyRatePct.toFixed(1)}%`,
    },
    roomRows,
    frontDeskStays,
    allBookingsMap: buildAllAcceptedBookingMap(bundle, locale),
  };
}

export function buildPayoutModuleViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    locale: AppLocale;
    currency: CurrencyCode;
  },
): PayoutModuleViewModel {
  const { propertyKey, locale, currency } = params;
  const cfg = bundle.hubConfig;
  const rates = cfg.currencyRates;
  const scopedIds = resolveScopedPropertyIds(bundle, propertyKey);
  const propMap = new Map(cfg.properties.map((p) => [p.id, p] as const));

  const acceptedByCode = new Map<string, BidRecordMaster>();
  for (const r of bundle.bidRecords) {
    if (r.status === "accepted" && r.bookingCode) {
      acceptedByCode.set(r.bookingCode, r);
    }
  }

  const bankAccounts: BankAccountView[] = bundle.payoutLedgers.bankAccounts
    .filter((ba) => scopedIds.has(ba.propertyId))
    .map((ba) => ({
      propertyId: ba.propertyId,
      propertyShortName:
        propMap.get(ba.propertyId)?.shortName[locale] ?? ba.propertyId,
      bankName: ba.bankName,
      accountNumber: ba.accountNumber,
      accountHolder: ba.accountHolder,
      payoutCycleText: ba.payoutCycleLabel[locale],
      verified: ba.verified,
      autoSettlement: ba.autoSettlement,
      updatedAtLabel: formatDisplayDate(ba.updatedAt, locale, true),
    }));

  const batches: PayoutBatchView[] = bundle.payoutLedgers.batches
    .filter((b) => scopedIds.has(b.propertyId))
    .map((b) => {
      const lineItems: PayoutLineItemView[] = b.bookingCodes
        .map((code) => acceptedByCode.get(code))
        .filter((r): r is BidRecordMaster => Boolean(r))
        .map((r) => {
          const ci = r.checkInDate ?? r.sessionDate;
          const co = r.checkOutDate ?? r.sessionDate;
          const earned =
            r.netRevenueVnd ??
            r.offeredRatePerNightVnd * Math.max(1, r.nights || 1);
          return {
            bookingCode: r.bookingCode ?? `#${r.id}`,
            refSessionId: r.id,
            guestFullName: r.guestFullName ?? "Guest",
            roomLabel: `${r.roomName?.[locale] ?? "Deluxe"} · #${r.roomNumber ?? 101}`,
            stayLabel: `${formatDisplayDate(ci, locale, false)} → ${formatDisplayDate(co, locale, false)}`,
            nights: Math.max(1, r.nights || 1),
            netRevenueVnd: earned,
            netRevenueFormatted: formatBusinessMoney(earned, currency, {
              rates,
            }),
          };
        });

      const computedNet =
        lineItems.length > 0
          ? lineItems.reduce((s, li) => s + li.netRevenueVnd, 0)
          : b.netPayoutVnd;

      return {
        id: b.id,
        propertyId: b.propertyId,
        propertyShortName:
          propMap.get(b.propertyId)?.shortName[locale] ?? b.propertyId,
        cycleCode: b.cycleCode,
        periodLabel: `${formatDisplayDate(b.periodStart, locale, false)} – ${formatDisplayDate(b.periodEnd, locale, true)}`,
        scheduledPayoutLabel: formatDisplayDate(
          b.scheduledPayoutDate,
          locale,
          true,
        ),
        paidAtLabel: b.paidAtDate
          ? formatDisplayDate(b.paidAtDate, locale, true)
          : undefined,
        bankTransferRef: b.bankTransferRef,
        status: b.status,
        bookingsCount: b.bookingsCount,
        netPayoutVnd: computedNet,
        netPayoutFormatted: formatBusinessMoney(computedNet, currency, {
          rates,
        }),
        note: b.note[locale],
        lineItems,
      };
    });

  const paidBankVnd = batches
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + b.netPayoutVnd, 0);
  const processingVnd = batches
    .filter((b) => b.status === "processing")
    .reduce((s, b) => s + b.netPayoutVnd, 0);
  const upcomingVnd = batches
    .filter((b) => b.status === "upcoming")
    .reduce((s, b) => s + b.netPayoutVnd, 0);
  const totalReconciledVnd = paidBankVnd + processingVnd + upcomingVnd;

  return {
    kpis: {
      totalReconciledVnd,
      totalReconciledFormatted: formatBusinessMoney(
        totalReconciledVnd,
        currency,
        { compact: true, withPlus: totalReconciledVnd > 0, rates },
      ),
      paidBankVnd,
      paidBankFormatted: formatBusinessMoney(paidBankVnd, currency, {
        compact: true,
        rates,
      }),
      processingVnd,
      processingFormatted: formatBusinessMoney(processingVnd, currency, {
        compact: true,
        rates,
      }),
      upcomingVnd,
      upcomingFormatted: formatBusinessMoney(upcomingVnd, currency, {
        compact: true,
        rates,
      }),
    },
    bankAccounts,
    batches,
  };
}

export function buildRoomsModuleViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    locale: AppLocale;
    currency: CurrencyCode;
  },
): RoomsModuleViewModel {
  const { propertyKey, locale, currency } = params;
  const cfg = bundle.hubConfig;
  const rates = cfg.currencyRates;
  const scopedIds = resolveScopedPropertyIds(bundle, propertyKey);
  const propMap = new Map(cfg.properties.map((p) => [p.id, p] as const));

  const bookingRefByCode = new Map<string, string>();
  for (const r of bundle.bidRecords) {
    if (r.status === "accepted" && r.bookingCode) {
      bookingRefByCode.set(r.bookingCode, r.id);
    }
  }

  const scopedUnitsRaw = bundle.roomInventory.units
    .filter((u) => scopedIds.has(u.propertyId))
    .sort((a, b) => a.roomNumber - b.roomNumber);

  const scopedTypesRaw = bundle.roomInventory.roomTypes.filter((rt) =>
    scopedIds.has(rt.propertyId),
  );
  const rtLookup = new Map(scopedTypesRaw.map((rt) => [rt.id, rt] as const));

  const categories: RoomCategoryView[] = scopedTypesRaw.map((rt) => {
    const readyUnitsCount = scopedUnitsRaw.filter(
      (u) => u.roomTypeId === rt.id && u.status === "ready",
    ).length;
    return {
      id: rt.id,
      propertyId: rt.propertyId,
      propertyShortName:
        propMap.get(rt.propertyId)?.shortName[locale] ?? rt.propertyId,
      name: rt.name[locale],
      bedSummary: rt.bedSummary[locale],
      sizeSqm: rt.sizeSqm,
      maxGuests: rt.maxGuests,
      unitsCount: rt.unitsCount,
      readyUnitsCount,
      standardRateVnd: rt.standardRateVnd,
      standardRateFormatted: formatBusinessMoney(rt.standardRateVnd, currency, {
        rates,
      }),
      floorRateVnd: rt.floorRateVnd,
      floorRateFormatted: formatBusinessMoney(rt.floorRateVnd, currency, {
        rates,
      }),
      amenities: rt.amenities,
      amenitiesLabels: rt.amenities.map((c) => localizeAmenityCode(c, locale)),
      biddingEnabled: rt.biddingEnabled,
    };
  });

  const units: PhysicalRoomUnitView[] = scopedUnitsRaw.map((u) => {
    const rt = rtLookup.get(u.roomTypeId);
    return {
      unitId: u.unitId,
      propertyId: u.propertyId,
      propertyShortName:
        propMap.get(u.propertyId)?.shortName[locale] ?? u.propertyId,
      roomTypeId: u.roomTypeId,
      roomTypeName: rt?.name[locale] ?? "Standard",
      roomNumber: u.roomNumber,
      floor: u.floor,
      status: u.status,
      activeBookingCode: u.activeBookingCode,
      activeBookingRefId: u.activeBookingCode
        ? bookingRefByCode.get(u.activeBookingCode)
        : undefined,
      housekeepingAssignee: u.housekeepingAssignee,
      note: u.note[locale],
      standardRateFormatted: formatBusinessMoney(
        rt?.standardRateVnd ?? 900_000,
        currency,
        { rates },
      ),
    };
  });

  const readyCount = units.filter((u) => u.status === "ready").length;
  const occupiedCount = units.filter((u) => u.status === "occupied").length;
  const dirtyCount = units.filter((u) => u.status === "dirty").length;
  const maintenanceCount = units.filter(
    (u) => u.status === "maintenance",
  ).length;

  return {
    kpis: {
      totalUnits: units.length,
      readyCount,
      occupiedCount,
      dirtyCount,
      maintenanceCount,
    },
    categories,
    units,
  };
}

export function buildBiddingModuleViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    locale: AppLocale;
    currency: CurrencyCode;
  },
): BiddingModuleViewModel {
  const { propertyKey, locale, currency } = params;
  const cfg = bundle.hubConfig;
  const rates = cfg.currencyRates;
  const scopedIds = resolveScopedPropertyIds(bundle, propertyKey);
  const propMap = new Map(cfg.properties.map((p) => [p.id, p] as const));

  const ruleMap = new Map(
    bundle.biddingOperations.autoBidRules.map((r) => [r.propertyId, r] as const),
  );

  const liveRequests: LiveRequestView[] = bundle.biddingOperations.liveRequests
    .filter((req) => scopedIds.has(req.propertyId))
    .map((req) => {
      const rule = ruleMap.get(req.propertyId);
      const floorVnd = rule?.minFloorRateVnd ?? 750_000;
      const submittedRate = req.submittedRatePerNightVnd;
      return {
        id: req.id,
        propertyId: req.propertyId,
        propertyShortName:
          propMap.get(req.propertyId)?.shortName[locale] ?? req.propertyId,
        receivedAt: req.receivedAt,
        expiresInMinutes: req.expiresInMinutes,
        checkInLabel: formatDisplayDate(req.checkInDate, locale, true),
        checkOutLabel: formatDisplayDate(req.checkOutDate, locale, true),
        nights: req.nights,
        guestsCount: req.guestsCount,
        roomTypePreference: req.roomTypePreference[locale],
        travelerSegment: req.travelerSegment[locale],
        guestTargetRateVnd: req.guestTargetRatePerNightVnd,
        guestTargetFormatted: formatBusinessMoney(
          req.guestTargetRatePerNightVnd,
          currency,
          { rates },
        ),
        suggestedWinRateVnd: req.suggestedWinRatePerNightVnd,
        suggestedWinFormatted: formatBusinessMoney(
          req.suggestedWinRatePerNightVnd,
          currency,
          { rates },
        ),
        minFloorGuardrailVnd: floorVnd,
        minFloorGuardrailFormatted: formatBusinessMoney(floorVnd, currency, {
          rates,
        }),
        requestedPerks: req.requestedPerks,
        requestedPerksLabels: req.requestedPerks.map((p) =>
          localizeAmenityCode(p, locale),
        ),
        guestMessage: req.guestMessage[locale],
        status: req.status,
        submittedRateVnd: submittedRate,
        submittedRateFormatted:
          submittedRate != null
            ? formatBusinessMoney(submittedRate, currency, { rates })
            : undefined,
        submittedTotalNetFormatted:
          submittedRate != null
            ? formatBusinessMoney(
                submittedRate * Math.max(1, req.nights),
                currency,
                { rates },
              )
            : undefined,
        submittedPerksLabels: req.submittedPerks?.map((p) =>
          localizeAmenityCode(p, locale),
        ),
        respondedAt: req.respondedAt,
      };
    });

  const autoBidRules: AutoBidRuleView[] = bundle.biddingOperations.autoBidRules
    .filter((r) => scopedIds.has(r.propertyId))
    .map((r) => {
      const prop = propMap.get(r.propertyId);
      return {
        propertyId: r.propertyId,
        propertyShortName: prop?.shortName[locale] ?? r.propertyId,
        propertyLabel: prop?.label[locale] ?? r.propertyId,
        enabled: r.enabled,
        minFloorRateVnd: r.minFloorRateVnd,
        minFloorFormatted: formatBusinessMoney(r.minFloorRateVnd, currency, {
          rates,
        }),
        maxDiscountPct: r.maxDiscountPct,
        nightShiftAutoBoost: r.nightShiftAutoBoost,
        multiNightExtraDiscountPct: r.multiNightExtraDiscountPct,
        defaultPerks: r.defaultPerks,
        defaultPerksLabels: r.defaultPerks.map((p) =>
          localizeAmenityCode(p, locale),
        ),
        targetResponseSeconds: r.targetResponseSeconds,
        updatedAt: r.updatedAt,
      };
    });

  const scopedBids30d = bundle.bidRecords.filter((b) =>
    scopedIds.has(b.propertyId),
  );
  const accepted30d = scopedBids30d.filter(
    (b) => b.status === "accepted",
  ).length;
  const acceptRate30dPct =
    scopedBids30d.length > 0
      ? Number(((accepted30d / scopedBids30d.length) * 100).toFixed(1))
      : 0;

  const enabledRulesCount = autoBidRules.filter((r) => r.enabled).length;

  const recentHistory: BidHistoryItemView[] = [...scopedBids30d]
    .sort((a, b) => {
      if (a.sessionDate !== b.sessionDate) {
        return b.sessionDate.localeCompare(a.sessionDate);
      }
      return b.timeLabel.localeCompare(a.timeLabel);
    })
    .slice(0, 15)
    .map((r) => {
      const totalVnd =
        r.netRevenueVnd ?? r.offeredRatePerNightVnd * Math.max(1, r.nights || 1);
      return {
        id: r.id,
        bookingCode: r.bookingCode,
        propertyShortName:
          propMap.get(r.propertyId)?.shortName[locale] ?? r.propertyId,
        status: r.status,
        bidMode: r.bidMode,
        sessionDateLabel: formatDisplayDate(r.sessionDate, locale, true),
        timeLabel: r.timeLabel,
        nights: Math.max(1, r.nights || 1),
        offeredRateFormatted: formatBusinessMoney(
          r.offeredRatePerNightVnd,
          currency,
          { rates },
        ),
        totalEstimateFormatted: formatBusinessMoney(totalVnd, currency, {
          rates,
        }),
      };
    });

  return {
    kpis: {
      waitingRequestsCount: liveRequests.filter(
        (r) => r.status === "waiting_offer",
      ).length,
      sentOffersCount: liveRequests.filter((r) => r.status === "offer_sent")
        .length,
      acceptRate30dPct,
      acceptRate30dFormatted: `${acceptRate30dPct.toFixed(1)}%`,
      autoBidActiveSummary: `${enabledRulesCount}/${autoBidRules.length}`,
    },
    liveRequests,
    autoBidRules,
    recentHistory,
  };
}

export function buildMessagesModuleViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    locale: AppLocale;
  },
): MessagesModuleViewModel {
  const { propertyKey, locale } = params;
  const scopedIds = resolveScopedPropertyIds(bundle, propertyKey);
  const propMap = new Map(
    bundle.hubConfig.properties.map((p) => [p.id, p] as const),
  );

  const bookingRefByCode = new Map<string, string>();
  for (const r of bundle.bidRecords) {
    if (r.status === "accepted" && r.bookingCode) {
      bookingRefByCode.set(r.bookingCode, r.id);
    }
  }

  const conversations: GuestConversationView[] = bundle.hubInbox.messages
    .filter((m) => scopedIds.has(m.propertyId))
    .map((m) => {
      const threadRaw = m.thread && m.thread.length > 0
        ? m.thread
        : [
            {
              id: `${m.id}-init`,
              sender: "guest" as const,
              sentAt: m.receivedAt,
              body: m.preview,
            },
          ];

      return {
        id: m.id,
        propertyId: m.propertyId,
        propertyShortName:
          propMap.get(m.propertyId)?.shortName[locale] ?? m.propertyId,
        bookingCode: m.bookingCode,
        linkedBookingRefId: bookingRefByCode.get(m.bookingCode),
        guestName: m.guestName,
        guestPhone: m.guestPhone ?? "+84 905 000 000",
        receivedAt: m.receivedAt,
        unread: m.unread,
        status: m.status ?? (m.unread ? "needs_reply" : "replied"),
        topicTag: m.topicTag?.[locale] ?? m.bookingCode,
        staySummary: m.staySummary?.[locale] ?? m.bookingCode,
        preview: m.preview[locale],
        thread: threadRaw.map((t) => ({
          id: t.id,
          sender: t.sender,
          sentAt: t.sentAt,
          text: t.body[locale],
        })),
      };
    });

  const unreadCount = conversations.filter((c) => c.unread).length;
  const repliedCount = conversations.filter(
    (c) => !c.unread || c.status === "replied",
  ).length;

  const quickReplies: QuickReplyTemplateView[] = (
    bundle.hubInbox.quickReplies ?? []
  ).map((qr) => ({
    id: qr.id,
    label: qr.label[locale],
    template: qr.template[locale],
  }));

  return {
    kpis: {
      totalThreads: conversations.length,
      unreadCount,
      repliedCount,
    },
    conversations,
    quickReplies,
  };
}

export function buildMarketingModuleViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    locale: AppLocale;
    currency: CurrencyCode;
  },
): MarketingModuleViewModel {
  const { propertyKey, locale, currency } = params;
  const cfg = bundle.hubConfig;
  const rates = cfg.currencyRates;
  const scopedIds = resolveScopedPropertyIds(bundle, propertyKey);
  const propMap = new Map(cfg.properties.map((p) => [p.id, p] as const));

  const flashDeals: FlashDealView[] = bundle.marketingCampaigns.flashDeals
    .filter((d) => scopedIds.has(d.propertyId))
    .map((d) => ({
      id: d.id,
      propertyId: d.propertyId,
      propertyShortName:
        propMap.get(d.propertyId)?.shortName[locale] ?? d.propertyId,
      title: d.title[locale],
      subtitle: d.subtitle[locale],
      roomTypeName: d.roomTypeName[locale],
      bookingWindowLabel: d.bookingWindowLabel[locale],
      discountPct: d.discountPct,
      originalRateVnd: d.originalRateVnd,
      originalRateFormatted: formatBusinessMoney(d.originalRateVnd, currency, {
        rates,
      }),
      dealRateVnd: d.dealRateVnd,
      dealRateFormatted: formatBusinessMoney(d.dealRateVnd, currency, {
        rates,
      }),
      dailyRoomQuota: d.dailyRoomQuota,
      roomsSold30d: d.roomsSold30d,
      netRevenue30dVnd: d.netRevenue30dVnd,
      netRevenue30dFormatted: formatBusinessMoney(
        d.netRevenue30dVnd,
        currency,
        { rates },
      ),
      perks: d.perks,
      perksLabels: d.perks.map((p) => localizeAmenityCode(p, locale)),
      active: d.active,
    }));

  const upsellOffers: UpsellOfferView[] = bundle.marketingCampaigns.upsellOffers
    .filter((u) => scopedIds.has(u.propertyId))
    .map((u) => ({
      id: u.id,
      propertyId: u.propertyId,
      propertyShortName:
        propMap.get(u.propertyId)?.shortName[locale] ?? u.propertyId,
      category: u.category,
      title: u.title[locale],
      description: u.description[locale],
      priceVnd: u.priceVnd,
      priceFormatted: formatBusinessMoney(u.priceVnd, currency, { rates }),
      pricingUnit: u.pricingUnit,
      orders30d: u.orders30d,
      extraRevenue30dVnd: u.extraRevenue30dVnd,
      extraRevenue30dFormatted: formatBusinessMoney(
        u.extraRevenue30dVnd,
        currency,
        { rates },
      ),
      active: u.active,
    }));

  const activeCampaignsCount =
    flashDeals.filter((d) => d.active).length +
    upsellOffers.filter((u) => u.active).length;
  const promoRoomsSold30d = flashDeals.reduce(
    (s, d) => s + d.roomsSold30d,
    0,
  );
  const flashRevenue30dVnd = flashDeals.reduce(
    (s, d) => s + d.netRevenue30dVnd,
    0,
  );
  const upsellRevenue30dVnd = upsellOffers.reduce(
    (s, u) => s + u.extraRevenue30dVnd,
    0,
  );

  return {
    kpis: {
      activeCampaignsCount,
      promoRoomsSold30d,
      flashRevenue30dVnd,
      flashRevenue30dFormatted: formatBusinessMoney(
        flashRevenue30dVnd,
        currency,
        { compact: true, withPlus: flashRevenue30dVnd > 0, rates },
      ),
      upsellRevenue30dVnd,
      upsellRevenue30dFormatted: formatBusinessMoney(
        upsellRevenue30dVnd,
        currency,
        { compact: true, withPlus: upsellRevenue30dVnd > 0, rates },
      ),
    },
    flashDeals,
    upsellOffers,
  };
}
