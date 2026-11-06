export type MainTab = "workspace" | "ai-analytics" | "inventory";

export type DateRangeKey = "today" | "7d" | "30d";

export type KpiType =
  | "revenue_total"
  | "revenue_today"
  | "sessions_total"
  | "win_rate"
  | "rooms_occupied"
  | "rooms_vacant";

export type HistoryStatus = "won" | "rejected" | "expired" | "auto_closed";
export type SessionRecordStatus = "live" | HistoryStatus;
export type UserRole = "manager" | "receptionist";
export type TimeSlotType = "lunch_peak" | "evening_peak" | "off_peak";
export type LossReasonId =
  | "price_high"
  | "slow_response"
  | "missing_perk"
  | "payment_abandoned";

export type BranchFilter = "all" | string;

export interface HotelBranchMaster {
  id: string;
  shortName: string;
  name: string;
  district: string;
  totalRooms: number;
  previousPeriodRevenue: Record<DateRangeKey, number>;
}

export interface HotelProfileMaster {
  hotelId: string;
  brandName: string;
  brandSuffix: string;
  version: string;
  hotelName: string;
  starRating: number;
  totalRooms: number;
  city: string;
  district: string;
  referenceDate: string;
  currentDateLabel: string;
  currentShortDate: string;
  goldenWindowRange: string;
  goldenWindowDays: number;
  bidTtlSeconds: number;
  urgentThresholdSeconds: number;
  warnThresholdSeconds: number;
  hotelCommissionRate: number;
  platformFeeRate: number;
  vatRate: number;
  guestPriceMultiplier: number;
  defaultFloorPrice: number;
  nightFlashDiscountPct: number;
  nightFlashStartHour: string;
  autoBidMaxRooms: number;
  autoBidMaxGuests: number;
  autoBidEnabled: boolean;
  nightFlashSaleActive: boolean;
  eloScore: number;
  eloTier: string;
  reviewRating5: number;
  reviewCount: number;
  reviewCriteria5: {
    roomComfortCleanliness: number;
    staffHospitality: number;
    checkinExperience: number;
    amenitiesExpectation: number;
    valueForMoney: number;
  };
  branches: HotelBranchMaster[];
  eveningForecast: {
    expectedRequestsMin: number;
    expectedRequestsMax: number;
    potentialBaseRevenueMin: number;
    potentialBaseRevenueMax: number;
  };
}

export interface UserRoleMaster {
  userId: string;
  role: UserRole;
  name: string;
  roleTitle: string;
  initials: string;
  canOverrideFloor: boolean;
  canConfigureBotRules: boolean;
  shift: string;
}

export interface PerkOption {
  id: string;
  label: string;
  unitCostVnd: number;
  costEstimate: string;
  winBoostPct: number;
  compensatesAmenity: string;
  matchScoreRecovery: number;
  defaultChecked?: boolean;
}

export interface RoomClassMaster {
  id: string;
  name: string;
  category: string;
  roomRange: string;
  totalRooms: number;
  rackRate: number;
  baseFloorPrice: number;
  bedAndCapacity: string;
  hasBathtub: boolean;
  includedAmenities: string[];
}

export interface PmsRoomRecord {
  roomNumber: number;
  floor: number;
  branchId: string;
  branchName: string;
  roomClassId: string;
  roomClass: string;
  category: string;
  status: "booked_other" | "booked_auction" | "vacant_unlocked";
  sourceChannel: string;
  linkedReqId: string | null;
  checkOutTomorrow: boolean;
}

export interface Calendar14DayPmsRecord {
  dayOffset: number;
  isoDate: string;
  dateStr: string;
  fullDate: string;
  dayLabel: string;
  totalRooms: number;
  otherBooked: number;
  auctionBooked: number;
  vacantRooms: number;
  policyShort: string;
  linkedReqId?: string | null;
  manualOverrides?: Record<string, "vacant_unlocked" | "booked_other">;
}

export interface PeriodBaselineMeta {
  shortLabel: string;
  rangeText: string;
  startDate: string;
  endDate: string;
  previousNetRevenue: number;
  platformWinRatePct: number;
}

export interface RoomClassBenchmarkMaster {
  roomClassId: string;
  category: string;
  roomName: string;
  systemAvgWinRatePct: Record<DateRangeKey, number>;
  systemTotalWinsRegion: Record<DateRangeKey, number>;
  baselineHotelWins?: Record<DateRangeKey, number>;
  systemAvgBasePrice: number;
}

export interface LossReasonCatalogItem {
  id: LossReasonId;
  shortName: string;
  color: string;
  actionHint: string;
}

export interface SystemBenchmarksMaster {
  regionName: string;
  periodsMeta: Record<DateRangeKey, PeriodBaselineMeta>;
  roomClassBenchmarks: RoomClassBenchmarkMaster[];
  lossReasonsCatalog: LossReasonCatalogItem[];
}

export interface AuctionSessionMasterRecord {
  id: string;
  status: SessionRecordStatus;
  branchId?: string;
  branchName?: string;
  sessionDate: string;
  timeLabel: string;
  dateTimeLabel?: string;
  timeSlot: TimeSlotType;
  // Live session fields
  remainingSeconds?: number;
  checkInDateRange?: string;
  checkInUrgent?: boolean;
  guestsCount?: number;
  guestSummary?: string;
  mandatoryRoomCategory?: string;
  bedTag?: string;
  amenities?: string[];
  competitorsCount?: number;
  matchedRoomName?: string;
  aiSuggestedBasePrice?: number;
  bidSubmitted?: {
    basePrice: number;
    perks: string[];
    submittedAtText: string;
    mode: "quick" | "custom" | "auto";
  };
  // Common & historical fields
  stayDatesLabel?: string;
  guestRequestTitle?: string;
  amenitiesTags?: string[];
  nights: number;
  roomsQty?: number;
  roomCategory?: string;
  matchedRoomClassId: string;
  offeredRoom?: string;
  offeredBasePrice?: number;
  hotelEarnedBase?: number;
  guestPaidTotal?: number;
  matchScore: number;
  bidMode?: "auto" | "manual";
  responseMinutes?: number;
  guestOpenedDetail?: boolean;
  closeMinutes?: number;
  closeSpeedText?: string;
  speedNote?: {
    text: string;
    tone: "underpriced" | "late" | "fast";
  };
  lockedRoomNumber?: number;
  lossReasonId?: LossReasonId;
  resultNote?: string;
  autopsyId?: string;
  showInHistory?: boolean;
}

export interface LiveSession {
  id: string;
  branchId: string;
  branchName: string;
  remainingSeconds: number;
  checkInDateRange: string;
  checkInUrgent?: boolean;
  nights: number;
  roomsQty: number;
  guestsCount: number;
  guestSummary: string;
  mandatoryRoomCategory: string;
  bedTag: string;
  amenities: string[];
  competitorsCount: number;
  matchedRoomName: string;
  matchedRoomClassId: string;
  matchScore: number;
  aiSuggestedBasePrice: number;
  standardSuggestedBasePrice: number;
  effectiveFloorPrice: number;
  isTonightCheckIn: boolean;
  flashDiscountApplied: boolean;
  vacantForStay: number;
  concurrentForStay: number;
  isAutoBidEligible: boolean;
  bidSubmitted?: {
    basePrice: number;
    perks: string[];
    submittedAtText: string;
    mode: "quick" | "custom" | "auto";
  };
}

export interface HistorySession {
  id: string;
  branchId: string;
  branchName: string;
  sessionDate: string;
  dateTimeLabel: string;
  stayDatesLabel: string;
  guestRequestTitle: string;
  amenitiesTags: string[];
  nights: number;
  roomCategory: string;
  offeredRoom: string;
  offeredBasePrice: number;
  matchScore: number;
  closeSpeedText: string;
  speedNote?: {
    text: string;
    tone: "underpriced" | "late" | "fast";
  };
  status: HistoryStatus;
  hotelEarnedBase?: number;
  guestPaidTotal?: number;
  resultNote: string;
  autopsyId?: string;
}

export interface TodayOrder {
  reqId: string;
  branchId: string;
  branchName: string;
  sessionDate: string;
  timeLabel: string;
  roomCategory: string;
  roomSummary: string;
  nights: number;
  stayDates: string;
  paidTime: string;
  lockedRoomNumber: number;
  baseAmount: number;
  guestPaidAmount: number;
  paymentStatus: string;
}

export interface RoomClassInventory {
  id: string;
  name: string;
  category: string;
  roomRange: string;
  bedAndCapacity: string;
  totalRooms: number;
  otherChannelBooked: number;
  auctionPaidBooked: number;
  baseFloorPrice: number;
  rackRate: number;
}

export interface RoomCell {
  roomNumber: number;
  floor: number;
  branchId: string;
  branchName: string;
  roomClassId: string;
  roomClass: string;
  category: string;
  sourceChannel: string;
  status: "booked_other" | "booked_auction" | "vacant_unlocked";
  linkedReqId?: string | null;
  checkOutTomorrow: boolean;
  activeAuctionCount: number;
}

export interface DailyRoomCell {
  roomNumber: number;
  floor: number;
  branchId: string;
  branchName: string;
  roomClassId: string;
  roomClass: string;
  category: string;
  status: "booked_other" | "booked_auction" | "vacant_unlocked";
  sourceChannel: string;
  linkedReqId: string | null;
  staySpanText: string;
  checkOutTomorrow: boolean;
  activeAuctionIds: string[];
  activeAuctionCount: number;
}

export interface DailyRoomSchedule {
  dayOffset: number;
  isoDate: string;
  dateStr: string;
  fullDate: string;
  dayLabel: string;
  totalRooms: number;
  otherBooked: number;
  auctionBooked: number;
  vacantRooms: number;
  policyShort: string;
  rooms: DailyRoomCell[];
}

/**
 * Tách danh sách dayOffset (0 = referenceDate 06/11/2026) cho khoảng lưu trú DD/MM – DD/MM
 */
export function parseStayDayOffsets(
  stayText: string | undefined,
  referenceIsoDate = "2026-11-06",
  fallbackNights = 1,
): number[] {
  if (stayText) {
    const match = stayText.match(/(\d{2})\/(\d{2})\s*[–-]\s*(\d{2})\/(\d{2})/);
    if (match) {
      const [, d1, m1, d2, m2] = match;
      const year = Number(referenceIsoDate.slice(0, 4)) || 2026;
      const refMs = Date.UTC(
        year,
        Number(referenceIsoDate.slice(5, 7)) - 1,
        Number(referenceIsoDate.slice(8, 10)),
      );
      const startMs = Date.UTC(year, Number(m1) - 1, Number(d1));
      const endMs = Date.UTC(year, Number(m2) - 1, Number(d2));
      const startOffset = Math.round((startMs - refMs) / 86_400_000);
      const endOffset = Math.round((endMs - refMs) / 86_400_000);
      if (endOffset > startOffset) {
        const offsets: number[] = [];
        for (let o = startOffset; o < endOffset; o++) {
          if (o >= 0 && o < 14) offsets.push(o);
        }
        return offsets;
      }
    }
  }
  const fallback: number[] = [];
  for (let i = 0; i < Math.max(1, fallbackNights); i++) {
    if (i < 14) fallback.push(i);
  }
  return fallback;
}

export interface MatchCriterion {
  name: string;
  guest: string;
  hotel: string;
  status: "match" | "warn" | "miss";
  label: string;
}

export interface MatchBreakdown {
  reqId: string;
  score: number;
  sub: string;
  title: string;
  items: MatchCriterion[];
  tip: string;
  suggestedPerkId?: string;
}

export interface LossAutopsyCase {
  id: string;
  tabLabel: string;
  dateLabel: string;
  guestRejectTag: string;
  metrics: {
    label: string;
    yours: string;
    yoursMatchModalId?: string;
    winner: string;
    winnerMatchModalId?: string;
    deltaBadge: string;
    tone: "bad" | "warn" | "good" | "neutral";
  }[];
  recommendedFormula: {
    suggestedBasePrice: number;
    perkSummary: string;
    costNote: string;
    estimatedWinProb: number;
    ruleTitle: string;
  };
}

export interface BotRuleRecord {
  ruleId: string;
  title: string;
  active: boolean;
  createdAt: string;
  sourceCaseId: string;
}

export interface MasterDataBundle {
  hotelProfile: HotelProfileMaster;
  usersRoles: UserRoleMaster[];
  perksCatalog: PerkOption[];
  roomClasses: RoomClassMaster[];
  roomsPms: PmsRoomRecord[];
  calendar14dPms: Calendar14DayPmsRecord[];
  systemBenchmarks: SystemBenchmarksMaster;
  auctionSessions: AuctionSessionMasterRecord[];
  matchBreakdowns: Record<string, MatchBreakdown>;
  lossAutopsies: Record<string, LossAutopsyCase>;
  botRules: BotRuleRecord[];
}

/**
 * Công thức định giá Production goodNstay:
 * Tổng giá Khách thanh toán = Giá gốc KS × (1 + 15% Phí sàn) × (1 + 10% VAT) = 1.265 × Giá gốc KS
 */
export function calcGuestTotalFromBase(
  baseAmount: number,
  multiplier = 1.265,
): number {
  return Math.round(baseAmount * multiplier);
}

export function formatCompactVnd(amount: number): string {
  if (amount >= 10_000_000) {
    const m = amount / 1_000_000;
    return `${m.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${m.toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  return `${Math.round(amount / 1_000)}k`;
}

export function formatButtonVnd(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, "")}M`;
  }
  return `${Math.round(amount / 1_000)}K`;
}

export function formatFullVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString("vi-VN")}đ`;
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}
