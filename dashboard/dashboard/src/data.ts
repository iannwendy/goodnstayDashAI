export type AppLocale = "vi" | "en" | "ko";
export type CurrencyCode = "VND" | "KRW" | "USD";
export type DateRangeKey = "today" | "7d" | "30d";

export type HubNavSection =
  | "overview"
  | "calendar"
  | "payout"
  | "rooms"
  | "bidding"
  | "messages"
  | "marketing_deals"
  | "marketing_upsell";

export type StaffRoleKey = "manager" | "receptionist";

export type PropertyId =
  | "br_mykhe"
  | "br_songhan"
  | "br_anthuong"
  | "stay_h11";

export type BidOutcomeStatus =
  | "accepted"
  | "expired"
  | "rejected"
  | "cancelled";

export type BidDispatchMode = "auto" | "manual";

export type AmenityCode =
  | "breakfast"
  | "wifi"
  | "pool"
  | "elevator"
  | "parking"
  | "late_checkout"
  | "bathtub"
  | "ott_tv";

export type LocalizedText = Record<AppLocale, string>;
export type CurrencyRateMap = Record<CurrencyCode, number>;

export interface ReviewCriteriaScores {
  amenities: number;
  checkin: number;
  cleanliness: number;
  service: number;
  value: number;
}

export interface PartnerUserMaster {
  userId: string;
  roleKey?: StaffRoleKey;
  displayName: LocalizedText;
  initials: LocalizedText;
  roleBadge: LocalizedText;
}

export interface PeriodMetaMaster {
  startDate: string;
  endDate: string;
  previousNetRevenueVnd: number;
  targetAcceptRatePct: number;
}

export interface ChainOverviewMaster {
  hotelId: string;
  label: LocalizedText;
  shortName: LocalizedText;
  district: LocalizedText;
  roomsCount: number;
  badgeColor: string;
  autoBidEnabled: boolean;
  reviewRating5: number;
  reviewCount: number;
  reviewCriteria5: ReviewCriteriaScores;
  eloScore: number;
  visibilityTone: "good" | "low";
  visibilitySubtitle: LocalizedText;
}

export interface PartnerPropertyMaster {
  id: PropertyId;
  isChainMember: boolean;
  label: LocalizedText;
  shortName: LocalizedText;
  district: LocalizedText;
  address?: LocalizedText;
  hotline?: string;
  checkInTime?: string;
  checkOutTime?: string;
  roomsCount: number;
  badgeColor: string;
  autoBidEnabled: boolean;
  previousPeriodRevenueVnd: Record<DateRangeKey, number>;
  reviewRating5: number;
  reviewCount: number;
  reviewCriteria5: ReviewCriteriaScores;
  eloScore: number;
  visibilityTone: "good" | "low";
  visibilitySubtitle: LocalizedText;
}

export interface PartnerHubConfigMaster {
  schemaVersion: string;
  brandName: string;
  referenceDate: string;
  currencyRates: CurrencyRateMap;
  partnerUser: PartnerUserMaster;
  staffProfiles: Array<PartnerUserMaster & { roleKey: StaffRoleKey }>;
  periodsMeta: Record<DateRangeKey, PeriodMetaMaster>;
  chainOverview: ChainOverviewMaster;
  properties: PartnerPropertyMaster[];
}

export type StayLifecycleStatus =
  | "arriving_today"
  | "in_house"
  | "checked_out"
  | "upcoming";

export interface BidRecordMaster {
  id: string;
  propertyId: PropertyId;
  status: BidOutcomeStatus;
  bidMode: BidDispatchMode;
  sessionDate: string;
  timeLabel: string;
  nights: number;
  offeredRatePerNightVnd: number;
  // Populated on completed ("accepted") bookings
  bookingCode?: string;
  checkInDate?: string;
  checkOutDate?: string;
  guestsCount?: number;
  guestFullName?: string;
  guestPhone?: string;
  roomTypeId?: string;
  roomName?: LocalizedText;
  roomNumber?: number;
  netRevenueVnd?: number;
  payoutBatchId?: string;
  stayStatus?: StayLifecycleStatus;
  guestNote?: LocalizedText;
  amenities?: AmenityCode[];
}

export interface GuestMessageThreadItem {
  id: string;
  sender: "guest" | "hotel";
  sentAt: string;
  body: LocalizedText;
}

export interface HubGuestMessageMaster {
  id: string;
  propertyId: PropertyId;
  bookingCode: string;
  guestName: string;
  guestPhone?: string;
  receivedAt: string;
  unread: boolean;
  status?: "needs_reply" | "replied";
  topicTag?: LocalizedText;
  staySummary?: LocalizedText;
  preview: LocalizedText;
  thread?: GuestMessageThreadItem[];
}

export interface HubNotificationMaster {
  id: string;
  scope: "chain" | PropertyId;
  tone: "emerald" | "indigo" | "amber";
  createdAt: string;
  text: LocalizedText;
}

export interface HubQuickReplyMaster {
  id: string;
  label: LocalizedText;
  template: LocalizedText;
}

export interface HubInboxMaster {
  messages: HubGuestMessageMaster[];
  notifications: HubNotificationMaster[];
  quickReplies: HubQuickReplyMaster[];
}

export type RoomUnitStatus = "ready" | "occupied" | "dirty" | "maintenance";

export interface RoomTypeMaster {
  id: string;
  propertyId: PropertyId;
  name: LocalizedText;
  bedSummary: LocalizedText;
  sizeSqm: number;
  maxGuests: number;
  unitsCount: number;
  standardRateVnd: number;
  floorRateVnd: number;
  amenities: AmenityCode[];
  biddingEnabled: boolean;
}

export interface PhysicalRoomUnitMaster {
  unitId: string;
  propertyId: PropertyId;
  roomTypeId: string;
  roomNumber: number;
  floor: number;
  status: RoomUnitStatus;
  activeBookingCode?: string;
  housekeepingAssignee: string;
  note: LocalizedText;
}

export interface CalendarRoomBlockMaster {
  id: string;
  propertyId: PropertyId;
  roomNumber: number;
  startDate: string;
  endDate: string;
  blockType: "maintenance" | "walkin_hold";
  title: LocalizedText;
}

export interface RoomInventoryMaster {
  roomTypes: RoomTypeMaster[];
  units: PhysicalRoomUnitMaster[];
  calendarBlocks: CalendarRoomBlockMaster[];
}

export type PayoutBatchStatus = "paid" | "processing" | "upcoming";

export interface PropertyBankAccountMaster {
  propertyId: PropertyId;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  payoutCycleLabel: LocalizedText;
  verified: boolean;
  autoSettlement: boolean;
  updatedAt: string;
}

export interface PayoutBatchMaster {
  id: string;
  propertyId: PropertyId;
  cycleCode: string;
  periodStart: string;
  periodEnd: string;
  scheduledPayoutDate: string;
  paidAtDate?: string;
  bankTransferRef?: string;
  status: PayoutBatchStatus;
  bookingCodes: string[];
  bookingsCount: number;
  grossRoomVnd: number;
  adjustmentVnd: number;
  netPayoutVnd: number;
  note: LocalizedText;
}

export interface PayoutLedgersMaster {
  bankAccounts: PropertyBankAccountMaster[];
  batches: PayoutBatchMaster[];
}

export type LiveRequestStatus = "waiting_offer" | "offer_sent" | "passed";

export interface LiveTravelerRequestMaster {
  id: string;
  propertyId: PropertyId;
  receivedAt: string;
  expiresInMinutes: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestsCount: number;
  roomTypePreference: LocalizedText;
  travelerSegment: LocalizedText;
  guestTargetRatePerNightVnd: number;
  suggestedWinRatePerNightVnd: number;
  requestedPerks: AmenityCode[];
  guestMessage: LocalizedText;
  status: LiveRequestStatus;
  submittedRatePerNightVnd?: number;
  submittedPerks?: AmenityCode[];
  respondedAt?: string;
}

export interface AutoBidRuleMaster {
  propertyId: PropertyId;
  enabled: boolean;
  minFloorRateVnd: number;
  maxDiscountPct: number;
  nightShiftAutoBoost: boolean;
  multiNightExtraDiscountPct: number;
  defaultPerks: AmenityCode[];
  targetResponseSeconds: number;
  updatedAt: string;
}

export interface BiddingOperationsMaster {
  liveRequests: LiveTravelerRequestMaster[];
  autoBidRules: AutoBidRuleMaster[];
}

export type UpsellCategory =
  | "room_upgrade"
  | "early_late"
  | "breakfast_dining"
  | "airport_transfer";

export interface FlashDealCampaignMaster {
  id: string;
  propertyId: PropertyId;
  title: LocalizedText;
  subtitle: LocalizedText;
  roomTypeName: LocalizedText;
  bookingWindowLabel: LocalizedText;
  discountPct: number;
  originalRateVnd: number;
  dealRateVnd: number;
  dailyRoomQuota: number;
  roomsSold30d: number;
  netRevenue30dVnd: number;
  perks: AmenityCode[];
  active: boolean;
}

export interface UpsellPackageMaster {
  id: string;
  propertyId: PropertyId;
  category: UpsellCategory;
  title: LocalizedText;
  description: LocalizedText;
  priceVnd: number;
  pricingUnit: "per_night" | "per_stay";
  orders30d: number;
  extraRevenue30dVnd: number;
  active: boolean;
}

export interface MarketingCampaignsMaster {
  flashDeals: FlashDealCampaignMaster[];
  upsellOffers: UpsellPackageMaster[];
}

export interface MasterDataBundle {
  hubConfig: PartnerHubConfigMaster;
  bidRecords: BidRecordMaster[];
  hubInbox: HubInboxMaster;
  roomInventory: RoomInventoryMaster;
  payoutLedgers: PayoutLedgersMaster;
  biddingOperations: BiddingOperationsMaster;
  marketingCampaigns: MarketingCampaignsMaster;
}
