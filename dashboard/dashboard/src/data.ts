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

export type DeviceOsType = "ios" | "android" | "web";
export type DeviceViewportType = "mobile" | "tablet" | "desktop";
export type AccommodationTypeCode = "hotel" | "apartment" | "villa" | "resort" | "pension";
export type TravelerGroupType = "solo" | "couple" | "family" | "group";
export type ExploreContentCategory =
  | "all"
  | "videos"
  | "property_views"
  | "facilities"
  | "dining"
  | "rooms"
  | "nearby_attractions";
export type PaymentGatewayCode = "nhn_kcp" | "paypal" | "stripe";

export interface PropertyMarketplaceIdentity {
  property_id: string;
  staying_country: string;
  staying_province: string;
  staying_city: string;
  staying_district: string;
  staying_ward: string;
  accommodation_type: AccommodationTypeCode;
  star_rating: number;
  review_score: number;
  review_count: number;
  partner_count_in_district: number;
  gallery_media_counts: Record<Exclude<ExploreContentCategory, "all">, number>;
}

export interface BookingFormTelemetry {
  session_form_id: string;
  request_id: string;
  request_code: string;
  entry_source: "home_hero_cta" | "explore_stays_cta" | "header_nav" | "gns_ai_handoff";
  device_os: DeviceOsType;
  device_type: DeviceViewportType;
  booker_country: string;
  staying_country: string;
  staying_province: string;
  staying_city: string;
  staying_district: string;
  staying_ward: string;
  partner_count: number;
  check_in_date: string;
  check_out_date: string;
  stay_nights: number;
  lead_time_days: number;
  room_count: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  total_guests: number;
  group_type: TravelerGroupType;
  accommodation_type: AccommodationTypeCode;
  combo_signature: string;
  criteria_count: number;
  duration_ms: number;
  is_no_matched_hotel: boolean;
  cancel_source: "step4_cancel_button" | "tab_cancel_icon" | null;
  active_offers_count: number;
  elapsed_open_sec: number;
}

export interface OfferListingTelemetry {
  offer_id: string;
  property_id: string;
  room_id: string;
  room_type_key: string;
  is_auto_bid: boolean;
  match_rate_pct: number;
  offer_total_price: number;
  currency: CurrencyCode;
  card_position: number;
  total_offers_count: number;
  device_type: DeviceViewportType;
  device_os: DeviceOsType;
  is_expired: boolean;
  ota_code: "A" | "B" | "T" | "E";
  ota_price: number;
  saving_pct: number;
  was_impressed: boolean;
  was_detail_viewed: boolean;
  browse_click_count: number;
  elapsed_since_bid_sec: number | null;
  browse_elapsed_sec_list: number[];
  decision_duration_sec: number | null;
  unmatched_keys: string[];
}

export interface ExploreStayTelemetry {
  view_session_id: string;
  trigger_element: "browse_button" | "card_thumbnail";
  star_rating: number;
  review_score: number;
  review_count: number;
  approx_display_amount: number;
  display_currency: CurrencyCode;
  scroll_down_count: number;
  scroll_up_count: number;
  max_scroll_depth_pct: number;
  description_dwell_ms: number;
  total_dwell_ms: number;
  content_category: Exclude<ExploreContentCategory, "all">;
  media_type: "image" | "video";
  media_clicked_count: number;
  view_duration_sec: number;
  map_action: "zoom_in" | "zoom_out" | "pan_drag" | "open_google_maps_link" | null;
  close_method: "selected_cta" | "close_x_button" | "backdrop_click" | "escape_key";
}

export interface PaymentFormTelemetry {
  checkout_session_id: string;
  payment_code: string;
  booking_id: string;
  entry_surface: "offer_card_select" | "explore_stay_modal_select";
  gateway_type: PaymentGatewayCode;
  payment_method_type: "credit_card" | "paypal_wallet" | "local_card";
  booking_currency: CurrencyCode;
  base_price: number;
  platform_fee_amount: number;
  vat_amount: number;
  total_booking_amount: number;
  charge_currency: CurrencyCode;
  fx_quote_code: string | null;
  exchange_rate: number;
  charge_amount: number;
  fx_fee_amount: number;
  skip_staying_info: boolean;
  guest_same_as_booker: boolean;
  save_card_opt_in: boolean;
  interruption_reason: "none" | "popup_closed_early" | "network_uncertain";
  recovery_action: "none" | "resume_current_payment" | "check_payment_status";
  recovery_outcome: "COMPLETED" | "ALREADY_PAID";
  is_first_payment: boolean;
  time_since_signup_hours: number | null;
  days_since_prev_payment: number | null;
  select_to_paid_sec: number;
  post_pay_cta: "view_receipt" | "download_receipt_pdf" | "view_booking_history" | "back_to_home";
}

export interface BidRecordTelemetry {
  booking_form: BookingFormTelemetry;
  offer_listing: OfferListingTelemetry;
  explore_stays: ExploreStayTelemetry | null;
  payment_form: PaymentFormTelemetry | null;
}

export interface RoomCatalogMapping {
  room_id: string;
  room_type_key: "standard" | "deluxe" | "family_suite" | "executive_suite";
  bed_type_key: "doubleQueenKing" | "twinSingle" | "connectingBeds";
  service_option_keys: string[];
  combo_signature: string;
  gallery_room_photos_count: number;
}

export interface PayoutSettlementBreakdown {
  payment_codes: string[];
  booking_currency: CurrencyCode;
  partner_base_price_vnd: number;
  platform_fee_15pct_vnd: number;
  vat_10pct_vnd: number;
  total_booking_gmv_vnd: number;
}

export interface LiveRequestTelemetry {
  request_id: string;
  request_code: string;
  session_form_id: string;
  device_os: DeviceOsType;
  device_type: DeviceViewportType;
  booker_country: string;
  staying_country: string;
  staying_province: string;
  staying_city: string;
  staying_district: string;
  staying_ward: string;
  partner_count: number;
  lead_time_days: number;
  room_count: number;
  adults: number;
  children: number;
  infants: number;
  pets: number;
  group_type: TravelerGroupType;
  accommodation_type: AccommodationTypeCode;
  combo_signature: string;
  criteria_count: number;
  remaining_ttl_sec: number;
}

export interface AutoBidGuardrailTelemetry {
  is_auto_bid_default: boolean;
  min_match_rate_pct_trigger: number;
  supported_option_keys: string[];
  target_saving_vs_ota_pct: number;
}

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
  marketplaceIdentity?: PropertyMarketplaceIdentity;
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
  marketplaceIdentity?: PropertyMarketplaceIdentity;
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
  telemetry?: BidRecordTelemetry;
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
  catalogMapping?: RoomCatalogMapping;
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
  settlementBreakdown?: PayoutSettlementBreakdown;
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
  requestTelemetry?: LiveRequestTelemetry;
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
  guardrailTelemetry?: AutoBidGuardrailTelemetry;
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
