export type AppLocale = "vi" | "en" | "ko";
export type CurrencyCode = "VND" | "KRW" | "USD";
export type DateRangeKey = "today" | "7d" | "30d";

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
  periodsMeta: Record<DateRangeKey, PeriodMetaMaster>;
  chainOverview: ChainOverviewMaster;
  properties: PartnerPropertyMaster[];
}

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
  roomName?: LocalizedText;
  roomNumber?: number;
  netRevenueVnd?: number;
  guestNote?: LocalizedText;
  amenities?: AmenityCode[];
}

export interface HubGuestMessageMaster {
  id: string;
  propertyId: PropertyId;
  bookingCode: string;
  guestName: string;
  receivedAt: string;
  unread: boolean;
  preview: LocalizedText;
}

export interface HubNotificationMaster {
  id: string;
  scope: "chain" | PropertyId;
  tone: "emerald" | "indigo" | "amber";
  createdAt: string;
  text: LocalizedText;
}

export interface HubInboxMaster {
  messages: HubGuestMessageMaster[];
  notifications: HubNotificationMaster[];
}

export interface MasterDataBundle {
  hubConfig: PartnerHubConfigMaster;
  bidRecords: BidRecordMaster[];
  hubInbox: HubInboxMaster;
}
