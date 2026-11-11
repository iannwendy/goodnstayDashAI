import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Building2,
  Calendar,
  Calculator,
  RotateCcw,
  SlidersHorizontal,
  CheckCircle2,
  ChevronUp,
  Check,
  Image as ImageIcon,
  ExternalLink,
  Sun,
  Moon,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

type OtaCode = "GOODNSTAY" | "AGODA" | "BOOKING" | "EXPEDIA" | "TRIP";
type MappingOtaKey =
  | "BOOKING_COM"
  | "AGODA"
  | "EXPEDIA"
  | "TRIP_COM"
  | "HOTELS_COM"
  | "GOOGLE_HOTELS";

interface GoodNStayFormFields {
  uploadPhotos: string[];
  roomName: string;
  description: string;
  pricePerNightVnd: number;
  pricePerNightKrw: number;
  maximumGuests: number;
  amenityTypes: string[];
  roomType: string;
  bedType: string;
  totalInventory: number;
}

interface RoomFilterMeta {
  canonicalRoomKey: string;
  roomType: string;
  roomTypeMethod: string;
  roomTypeReason: string;
  goodNStayBedType: string;
  detailedBedCategory: string;
  bedFilterLabelVi: string;
  bedReason: string;
  totalBeds: number;
  isMultiBed: boolean;
  maxGuests: number;
  viewCategory: string;
  areaSqm: number | null;
  mealPlan: string;
  mealPlanLabelVi: string;
  cancelPolicy: string;
  cancelPolicyLabelVi: string;
  rateBucket: string;
  netPrice: number;
  taxesAndFees: number;
  grossPrice: number;
  rawBedText: string;
}

interface LiveProofMeta {
  isLiveScraped: boolean;
  roomId?: string | null;
  offerId?: string | null;
  blockId?: string | null;
  externalNativeId: string | null;
  deepLinkUrl?: string | null;
  uiDisplayedPriceVnd?: number;
  uiDisplayedPriceLabel?: string | null;
  origNetPrice?: number | null;
  origGrossPrice?: number | null;
  payAtHotelNet?: number | null;
  payAtHotelGross?: number | null;
  partnerOfferGrossPrice?: number | null;
  crossedOutPrice?: number | null;
  scrapedAt: string | null;
  scrapedAtVi?: string | null;
  sourceUrl: string | null;
}

interface OtaOfferEntry {
  id: string;
  roomName: string;
  netPrice: number;
  taxesAndFees: number;
  grossPrice: number;
  formFields: GoodNStayFormFields;
  filterMeta: RoomFilterMeta;
  liveProof?: LiveProofMeta;
}

interface PlatformMetric {
  ota: OtaCode;
  price: number;
  netPrice: number;
  grossPrice: number;
  taxesAndFees: number;
  roomName: string;
  diffVsRefPct: number;
  diffVsRefAmount: number;
  customerSavingsVsOtaPct: number;
  spreadToMinPct: number;
  spreadToMedianPct: number;
  isCheapest: boolean;
  isMostExpensive: boolean;
  parityStatus: "REFERENCE" | "UNDERCUT_ALERT" | "IN_PARITY" | "HIGHER_THAN_REF";
}

interface RoomMappingContract {
  gnsRoomId: string;
  gnsRoomVersion: number;
  ota: MappingOtaKey;
  externalProperty: {
    propertyId: string;
    url: string;
  };
  matchedRoom: {
    externalRoomId: string;
    roomName: string;
    areaM2: number | null;
    beds: string[];
    maxOccupancy: number;
    view: string;
  };
  matching: {
    status: "VERIFIED" | "PENDING_REVIEW" | "REJECTED";
    confidence: number;
    method: "HYBRID_RULES_AI";
    modelVersion: string;
    evidence: {
      nameSimilarity: number;
      areaMatch: boolean;
      bedMatch: boolean;
      occupancyMatch: boolean;
      viewMatch: boolean;
    };
    verifiedBy: string;
  };
  source: {
    type: string;
    observedAt: string;
    catalogVersion: string;
  };
  rateLookup: {
    supported: boolean;
    lookupMethod: string;
  };
}

interface ComparisonGroup {
  groupKey: string;
  matchRank?: number;
  gnsRoomId?: string;
  gnsRoomVersion?: number;
  roomMappings?: Partial<Record<MappingOtaKey, RoomMappingContract>>;
  matchConfidenceScore?: number;
  matchedBothLiveOtas?: boolean;
  hotelId: string;
  hotelName: string;
  canonicalRoomKey: string;
  roomType: string;
  goodNStayBedType: string;
  detailedBedCategory: string;
  bedFilterLabelVi: string;
  totalBeds: number;
  isMultiBed: boolean;
  maxGuests: number;
  viewCategory: string;
  areaSqm: number | null;
  mealPlanLabelVi: string;
  cancelPolicyLabelVi: string;
  sampleGoodNStayForm: GoodNStayFormFields;
  otaOffers: Partial<Record<OtaCode, OtaOfferEntry>>;
  spreadAnalysis: {
    priceBasis: "UI_WEB" | "GROSS" | "NET";
    minPrice: number;
    maxPrice: number;
    medianPrice: number;
    referencePrice: number;
    marketSpreadPct: number;
    platforms: Partial<Record<OtaCode, PlatformMetric>>;
  };
}

interface LiveScrapeProofBundle {
  success: boolean;
  scrapedAt: string;
  scrapedAtVi?: string;
  verifiedAtVi?: string;
  durationMs: number;
  sha256Digest: string;
  agoda: {
    sourceUrl: string;
    pageTitle: string;
    searchId: string;
    masterRoomCount: number;
    screenshotUrl: string;
    rawRooms: unknown[];
  };
  booking: {
    sourceUrl: string;
    pageTitle: string;
    totalBlocksCount: number;
    uniqueRoomCount: number;
    screenshotUrl: string;
    rawRooms: unknown[];
  };
}

interface ReportResponse {
  generatedAt: string;
  hotelKey?: string;
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
  liveScrapeProof?: LiveScrapeProofBundle | null;
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    startRank: number;
    endRank: number;
  };
  overallSummary?: {
    bothLiveMatchedCount: number;
    avgAgodaVsBookingPct: number;
  };
  liveAgodaScrapeStatus: {
    success: boolean;
    scrapedAt: string | null;
    sourceUrl?: string | null;
    masterRoomCountFromLiveAgoda: number;
    liveOffersExtractedCount: number;
  };
  totalNormalizedRoomOffers: number;
  matchedCanonicalGroupsCount: number;
  comparisonGroups: ComparisonGroup[];
}

type LocaleCode = "vi" | "en" | "ko";

function detectInitialLocale(): LocaleCode {
  if (typeof window !== "undefined") {
    const winLocale = (window as unknown as { __GNS_LOCALE__?: string })
      .__GNS_LOCALE__;
    if (winLocale === "vi" || winLocale === "en" || winLocale === "ko") {
      return winLocale;
    }
    try {
      const saved = window.localStorage.getItem("gns_ota_locale");
      if (saved === "vi" || saved === "en" || saved === "ko") {
        return saved;
      }
    } catch {
      // ignore storage errors
    }
  }
  if (typeof document !== "undefined") {
    const htmlLang = (document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("ko")) return "ko";
    if (htmlLang.startsWith("en")) return "en";
  }
  return "vi";
}

const PAGE_TITLES_BY_LOCALE: Record<LocaleCode, string> = {
  vi: "goodNstay — Đối Sánh Giá Đa Sàn OTA & Tự Động Điền Form Hạng Phòng",
  en: "goodNstay — Multi-OTA Rate Comparison & Automated Room Form Mapping",
  ko: "goodNstay — 실시간 다중 OTA 요금 비교 & 객실 자동 매칭",
};

const OTA_LABELS_BY_LOCALE: Record<LocaleCode, Record<OtaCode, string>> = {
  vi: {
    GOODNSTAY: "Giá mốc chuẩn (BAR)",
    AGODA: "Agoda (Live)",
    BOOKING: "Booking.com (Live)",
    EXPEDIA: "Expedia (EPS)",
    TRIP: "Trip.com",
  },
  en: {
    GOODNSTAY: "Reference Rate (BAR)",
    AGODA: "Agoda (Live)",
    BOOKING: "Booking.com (Live)",
    EXPEDIA: "Expedia (EPS)",
    TRIP: "Trip.com",
  },
  ko: {
    GOODNSTAY: "기준 요금 (BAR)",
    AGODA: "Agoda (Live)",
    BOOKING: "Booking.com (Live)",
    EXPEDIA: "Expedia (EPS)",
    TRIP: "Trip.com",
  },
};

const OTA_SHORT_LABELS_BY_LOCALE: Record<LocaleCode, Record<OtaCode, string>> = {
  vi: {
    GOODNSTAY: "Giá chuẩn (BAR)",
    AGODA: "Agoda",
    BOOKING: "Booking.com",
    EXPEDIA: "Expedia",
    TRIP: "Trip.com",
  },
  en: {
    GOODNSTAY: "BAR Rate",
    AGODA: "Agoda",
    BOOKING: "Booking.com",
    EXPEDIA: "Expedia",
    TRIP: "Trip.com",
  },
  ko: {
    GOODNSTAY: "기준가 (BAR)",
    AGODA: "Agoda",
    BOOKING: "Booking.com",
    EXPEDIA: "Expedia",
    TRIP: "Trip.com",
  },
};

const MAPPING_OTA_SHORT_LABELS: Record<MappingOtaKey, string> = {
  BOOKING_COM: "Booking",
  AGODA: "Agoda",
  EXPEDIA: "Expedia",
  TRIP_COM: "Trip.com",
  HOTELS_COM: "Hotels",
  GOOGLE_HOTELS: "Google",
};

const VIEW_LABELS_BY_LOCALE: Record<LocaleCode, Record<string, string>> = {
  vi: {
    CITY_VIEW: "City View",
    OCEAN_SEA_VIEW: "Ocean View",
    OCEAN_FRONT: "Beachfront",
    PARTIAL_SEA_VIEW: "Partial Sea View",
    POOL_VIEW: "Pool View",
    GARDEN_VIEW: "Garden View",
    NO_WINDOW: "No Window",
    STANDARD_VIEW: "Tiêu chuẩn",
  },
  en: {
    CITY_VIEW: "City View",
    OCEAN_SEA_VIEW: "Ocean View",
    OCEAN_FRONT: "Beachfront",
    PARTIAL_SEA_VIEW: "Partial Sea View",
    POOL_VIEW: "Pool View",
    GARDEN_VIEW: "Garden View",
    NO_WINDOW: "No Window",
    STANDARD_VIEW: "Standard View",
  },
  ko: {
    CITY_VIEW: "시티뷰",
    OCEAN_SEA_VIEW: "오션뷰",
    OCEAN_FRONT: "비치프론트",
    PARTIAL_SEA_VIEW: "부분 오션뷰",
    POOL_VIEW: "풀뷰",
    GARDEN_VIEW: "가든뷰",
    NO_WINDOW: "창문 없음",
    STANDARD_VIEW: "일반 전망",
  },
};

const BED_SHORT_LABELS_BY_LOCALE: Record<LocaleCode, Record<string, string>> = {
  vi: {
    SINGLE_1_BED: "1 Giường đơn",
    TWIN_2_SINGLE: "2 Giường đơn",
    DOUBLE_QUEEN_1_BED: "1 Giường đôi",
    KING_1_BED: "1 Giường King",
    FLEX_DOUBLE_OR_TWIN: "Đôi / 2 Đơn",
    MULTI_BED_TRIPLE: "Triple",
    MULTI_BED_QUAD_FAMILY: "Family",
  },
  en: {
    SINGLE_1_BED: "1 Single Bed",
    TWIN_2_SINGLE: "2 Single Beds",
    DOUBLE_QUEEN_1_BED: "1 Double Bed",
    KING_1_BED: "1 King Bed",
    FLEX_DOUBLE_OR_TWIN: "Double / Twin",
    MULTI_BED_TRIPLE: "Triple (3)",
    MULTI_BED_QUAD_FAMILY: "Family (4+)",
  },
  ko: {
    SINGLE_1_BED: "싱글베드 1개",
    TWIN_2_SINGLE: "싱글베드 2개",
    DOUBLE_QUEEN_1_BED: "더블베드 1개",
    KING_1_BED: "킹베드 1개",
    FLEX_DOUBLE_OR_TWIN: "더블 / 2 싱글",
    MULTI_BED_TRIPLE: "트리플 (3인)",
    MULTI_BED_QUAD_FAMILY: "패밀리 (4인+)",
  },
};

const UI_TEXT = {
  vi: {
    localeSwitcherAria: "Chuyển đổi ngôn ngữ hiển thị",
    hotelSelectAria: "Chọn khách sạn cào thực tế",
    hotelChampton: "Champton Nha Trang Hotel (5 Sao)",
    hotelLibra: "Libra Hotel Nha Trang (4 Sao)",
    checkinSelectAria: "Chọn ngày Check-in để cào thật",
    checkinOpt1: "Check-in: 20/11/2026 (1 đêm)",
    checkinOpt2: "Check-in: 25/11/2026 (1 đêm)",
    checkinOpt3: "Check-in: 05/12/2026 (1 đêm)",
    liveBadgeWarnTitle:
      "Có sàn chưa cào được giá hoặc lỗi gọi API — Bấm để kiểm tra",
    liveBadgeOkTitle: "Bấm xem bằng chứng ảnh chụp màn hình và SHA-256",
    liveBadgeWarnText: (n: number) => `Live ${n} Sàn · Sàn chưa cào giá`,
    liveBadgeOkText: "Live 2 Sàn: Agoda + Booking.com",
    themeToLightAria: "Chuyển sang giao diện Sáng (Light Mode)",
    themeToDarkAria: "Chuyển sang giao diện Tối (Dark Mode)",
    themeDarkTitle: "Đang ở chế độ Tối (Dark Mode) — Bấm để chuyển sang Sáng",
    themeLightTitle: "Đang ở chế độ Sáng (Light Mode) — Bấm để chuyển sang Tối",
    formulasBtn: "Công thức",
    scrapeBusyBtn: "Đang cào Agoda + Booking...",
    scrapeIdleBtn: "Cào Trực Tiếp Ngay",
    closeBtn: "Đóng",
    unscrapedPrefix: "Sàn chưa cào giá:",
    retryScrapeBtn: "Thử cào lại",
    dismissWarnBtn: "Ẩn cảnh báo",
    fetchErrMsg: "Lỗi kết nối API đối sánh giá — Sàn chưa cào giá",
    fetchErrToast: "Lỗi gọi API đối sánh giá — Trạng thái: Sàn chưa cào giá.",
    scrapeOkToast: (
      hotelName?: string,
      checkIn?: string,
      agodaCount?: number,
      bookingCount?: number
    ) =>
      `Đã cào trực tiếp thành công ${hotelName} (Ngày ${checkIn}): Agoda ${agodaCount ?? 0} hạng phòng · Booking.com ${bookingCount ?? 0} hạng phòng.`,
    scrapeErrMsg: "Lỗi gọi API cào giá trực tiếp — Sàn chưa cào giá",
    scrapeErrToast:
      "Không thể kết nối phiên cào trực tiếp — Trạng thái: Sàn chưa cào giá.",
    formulaTitle: "Công Thức Chuẩn Hóa & Khớp Phòng Đa Sàn",
    collapseBtn: "Thu gọn",
    formula1Desc:
      "Bóc trực tiếp mã phòng, giá trước thuế (Net) và sau thuế (Gross).",
    formula2Desc: "Trích xuất mã blockId và giá hiển thị thực tế theo đêm.",
    formula3Title: "3. Khóa Khớp Phòng (Match Key)",
    formula3Desc:
      "Ghép tự động cùng hạng phòng giữa các sàn OTA dù khác tên gọi.",
    kpiScraping: "Đang cào...",
    unscrapedBadge: "Sàn chưa cào giá",
    unscrapedCellBadge: "Sàn chưa cào giá",
    roomTypesUnit: "hạng phòng",
    openAgoda: "Mở Agoda",
    openBooking: "Mở Booking",
    kpiSpreadTitle: "Chênh lệch Agoda vs. Booking",
    matchedPairsCount: (n: number) => `${n} cặp phòng khớp`,
    matrixTitle: (hotelName?: string, checkIn?: string) =>
      `Ma trận Đối sánh Giá Thực Tế (${hotelName} · ${checkIn})`,
    basisUiWeb: "UI Web",
    basisGross: "Sau thuế (Gross)",
    basisNet: "Trước thuế (Net)",
    bedModeAll: "Tất cả phòng",
    bedModeSingle: "Phòng 1 Giường",
    bedModeMulti: "Phòng Nhiều Giường",
    filterRoomTypeAria: "Lọc theo Room Type",
    filterRoomTypeAll: "Hạng: Tất cả",
    filterBedAria: "Lọc theo Cấu hình Giường",
    filterBedAll: "Giường: Tất cả",
    filterBedSingle: "1 Đơn (Single)",
    filterBedTwin: "2 Đơn (Twin)",
    filterBedDouble: "Đôi (Double)",
    filterBedFlex: "Đôi / 2 Đơn",
    filterBedTriple: "Triple (3)",
    filterBedFamily: "Family (4+)",
    filterViewAria: "Lọc theo Hướng nhìn",
    filterViewAll: "View: Tất cả",
    filterViewCity: "City View",
    filterViewPartialSea: "Partial Sea",
    filterViewOcean: "Ocean View",
    filterViewNoWindow: "No Window",
    filterAreaAria: "Lọc theo Diện tích",
    filterAreaAll: "Diện tích: Tất cả",
    resetBtn: "Đặt lại",
    emptyFilterText: "Không có hạng phòng nào khớp với bộ lọc hiện tại.",
    clearFilterBtn: "Xóa bộ lọc",
    scrapingBannerBusy: "Đang cào giá trực tiếp từ Agoda & Booking.com...",
    loadingBannerBusy: "Đang tải dữ liệu...",
    colRoomType: "Hạng phòng",
    colBarRate: "Giá chuẩn",
    barSubLabel: "Giá BAR",
    deepLinkTooltip: (
      roomName: string,
      roomId: string,
      subPrice: string,
      otaLabel: string
    ) => `Mở phòng "${roomName}" (#${roomId} · ${subPrice}) trên ${otaLabel}`,
    rowUnscrapedBadge: (activeCount: number) =>
      `Live ${activeCount}/4 · Sàn chưa cào giá`,
    prevPageBtn: "← Trước",
    nextPageBtn: "Tiếp →",
    skeletonSpreadLabel: "Biên độ chênh lệch",
    inspectorSpreadLabel: "Chênh lệch",
    otaViewDataTitle: (otaLabel: string) => `Xem dữ liệu ${otaLabel}`,
    otaUnscrapedTitle: (otaLabel: string) => `${otaLabel}: Sàn chưa cào giá`,
    tabForm: "Form 8 Trường",
    tabBreakdown: "Thuế & Khớp phòng",
    tabProof: "Bằng chứng Live",
    photosModalTitle:
      "UPLOAD PHOTOS — Danh sách ảnh phòng trích xuất tự động",
    photosModalDesc: (otaLabel: string, roomName: string) =>
      `Ảnh phòng từ ${otaLabel} cho ${roomName}`,
    taxColChannel: "Sàn",
    taxColNet: "Giá Net",
    taxColTaxFee: "Thuế & Phí",
    copiedJsonBtn: "Đã sao chép",
    copyJsonBtn: "Sao chép JSON",
    directRoomLinksTitle: (roomName: string) =>
      `Link phòng trực tiếp (${roomName})`,
    partnerOfferLabel: (formattedAmount: string) =>
      ` · Ưu đãi ĐT: ${formattedAmount}`,
    openRoomBtn: "Mở phòng",
    updatedAtPrefix: "Cập nhật: ",
    selectRoomFallback: "Chọn một hạng phòng bên trái để xem chi tiết.",
  },
  en: {
    localeSwitcherAria: "Switch display language",
    hotelSelectAria: "Select hotel for live rate shopping",
    hotelChampton: "Champton Nha Trang Hotel (5-Star)",
    hotelLibra: "Libra Hotel Nha Trang (4-Star)",
    checkinSelectAria: "Select check-in date",
    checkinOpt1: "Check-in: 2026-11-20 (1 night)",
    checkinOpt2: "Check-in: 2026-11-25 (1 night)",
    checkinOpt3: "Check-in: 2026-12-05 (1 night)",
    liveBadgeWarnTitle:
      "Unscraped OTA or API connection issue — Click to inspect",
    liveBadgeOkTitle: "Click to inspect live scrape proof & room deep links",
    liveBadgeWarnText: (n: number) => `Live ${n} OTAs · Unscraped Rate`,
    liveBadgeOkText: "Live 2 OTAs: Agoda + Booking.com",
    themeToLightAria: "Switch to Light Mode",
    themeToDarkAria: "Switch to Dark Mode",
    themeDarkTitle: "Dark Mode active — Click to switch to Light Mode",
    themeLightTitle: "Light Mode active — Click to switch to Dark Mode",
    formulasBtn: "Formulas",
    scrapeBusyBtn: "Scraping Agoda + Booking...",
    scrapeIdleBtn: "Scrape Live Now",
    closeBtn: "Close",
    unscrapedPrefix: "Unscraped OTA:",
    retryScrapeBtn: "Retry Scrape",
    dismissWarnBtn: "Dismiss",
    fetchErrMsg: "Rate comparison API connection error — Unscraped OTA",
    fetchErrToast: "Rate comparison API error — Status: Unscraped OTA.",
    scrapeOkToast: (
      hotelName?: string,
      checkIn?: string,
      agodaCount?: number,
      bookingCount?: number
    ) =>
      `Live scrape completed for ${hotelName} (${checkIn}): Agoda ${agodaCount ?? 0} room types · Booking.com ${bookingCount ?? 0} room types.`,
    scrapeErrMsg: "Live scrape API error — Unscraped OTA",
    scrapeErrToast:
      "Unable to connect to live scrape session — Status: Unscraped OTA.",
    formulaTitle: "Multi-OTA Rate Normalization & Room Matching Rules",
    collapseBtn: "Collapse",
    formula1Desc:
      "Extracts native room ID, before-tax (Net) and after-tax (Gross) rates directly.",
    formula2Desc:
      "Extracts blockId and live nightly web UI prices directly from DOM.",
    formula3Title: "3. Canonical Match Key",
    formula3Desc:
      "Automatically pairs identical physical rooms across OTAs despite different naming.",
    kpiScraping: "Scraping...",
    unscrapedBadge: "Unscraped Rate",
    unscrapedCellBadge: "Unscraped",
    roomTypesUnit: "room types",
    openAgoda: "Open Agoda",
    openBooking: "Open Booking",
    kpiSpreadTitle: "Agoda vs. Booking Spread",
    matchedPairsCount: (n: number) => `${n} matched room pairs`,
    matrixTitle: (hotelName?: string, checkIn?: string) =>
      `Live Multi-OTA Rate Comparison Matrix (${hotelName} · ${checkIn})`,
    basisUiWeb: "Web UI",
    basisGross: "After Tax (Gross)",
    basisNet: "Before Tax (Net)",
    bedModeAll: "All Rooms",
    bedModeSingle: "1-Bed Rooms",
    bedModeMulti: "Multi-Bed Rooms",
    filterRoomTypeAria: "Filter by Room Type",
    filterRoomTypeAll: "Tier: All",
    filterBedAria: "Filter by Bed Configuration",
    filterBedAll: "Bed: All",
    filterBedSingle: "1 Single",
    filterBedTwin: "2 Twin",
    filterBedDouble: "Double",
    filterBedFlex: "Double / Twin",
    filterBedTriple: "Triple (3)",
    filterBedFamily: "Family (4+)",
    filterViewAria: "Filter by View",
    filterViewAll: "View: All",
    filterViewCity: "City View",
    filterViewPartialSea: "Partial Sea",
    filterViewOcean: "Ocean View",
    filterViewNoWindow: "No Window",
    filterAreaAria: "Filter by Room Area",
    filterAreaAll: "Area: All",
    resetBtn: "Reset",
    emptyFilterText: "No room categories match the current filter criteria.",
    clearFilterBtn: "Clear Filters",
    scrapingBannerBusy:
      "Scraping live rates directly from Agoda & Booking.com...",
    loadingBannerBusy: "Loading rate comparison data...",
    colRoomType: "Room Category",
    colBarRate: "BAR Rate",
    barSubLabel: "BAR Rate",
    deepLinkTooltip: (
      roomName: string,
      roomId: string,
      subPrice: string,
      otaLabel: string
    ) => `Open "${roomName}" (#${roomId} · ${subPrice}) on ${otaLabel}`,
    rowUnscrapedBadge: (activeCount: number) =>
      `Live ${activeCount}/4 · Unscraped`,
    prevPageBtn: "← Prev",
    nextPageBtn: "Next →",
    skeletonSpreadLabel: "Market Spread",
    inspectorSpreadLabel: "Spread",
    otaViewDataTitle: (otaLabel: string) => `View ${otaLabel} data`,
    otaUnscrapedTitle: (otaLabel: string) => `${otaLabel}: Unscraped`,
    tabForm: "8-Field Form",
    tabBreakdown: "Tax & Mapping",
    tabProof: "Live Proof",
    photosModalTitle:
      "UPLOAD PHOTOS — Auto-Extracted OTA Room Gallery",
    photosModalDesc: (otaLabel: string, roomName: string) =>
      `Room photos extracted from ${otaLabel} for ${roomName}`,
    taxColChannel: "Channel",
    taxColNet: "Net Rate",
    taxColTaxFee: "Taxes & Fees",
    copiedJsonBtn: "Copied",
    copyJsonBtn: "Copy JSON",
    directRoomLinksTitle: (roomName: string) =>
      `Direct Room Deep Links (${roomName})`,
    partnerOfferLabel: (formattedAmount: string) =>
      ` · Partner Offer: ${formattedAmount}`,
    openRoomBtn: "Open Room",
    updatedAtPrefix: "Updated: ",
    selectRoomFallback: "Select a room category on the left to inspect details.",
  },
  ko: {
    localeSwitcherAria: "표시 언어 전환",
    hotelSelectAria: "실시간 수집 호텔 선택",
    hotelChampton: "Champton Nha Trang Hotel (5성급)",
    hotelLibra: "Libra Hotel Nha Trang (4성급)",
    checkinSelectAria: "실시간 수집 체크인 날짜 선택",
    checkinOpt1: "체크인: 2026-11-20 (1박)",
    checkinOpt2: "체크인: 2026-11-25 (1박)",
    checkinOpt3: "체크인: 2026-12-05 (1박)",
    liveBadgeWarnTitle: "미수집 채널 또는 API 오류가 있습니다 — 클릭하여 확인",
    liveBadgeOkTitle: "실시간 수집 증빙 및 객실 딥링크 확인",
    liveBadgeWarnText: (n: number) => `실시간 ${n}개 채널 · 요금 미수집`,
    liveBadgeOkText: "실시간 2개 채널: Agoda + Booking.com",
    themeToLightAria: "라이트 모드(Light Mode)로 전환",
    themeToDarkAria: "다크 모드(Dark Mode)로 전환",
    themeDarkTitle: "현재 다크 모드 — 클릭하여 라이트 모드로 전환",
    themeLightTitle: "현재 라이트 모드 — 클릭하여 다크 모드로 전환",
    formulasBtn: "산출 공식",
    scrapeBusyBtn: "Agoda + Booking 실시간 수집 중...",
    scrapeIdleBtn: "실시간 즉시 수집",
    closeBtn: "닫기",
    unscrapedPrefix: "채널 요금 미수집:",
    retryScrapeBtn: "다시 수집",
    dismissWarnBtn: "경고 숨기기",
    fetchErrMsg: "요금 비교 API 연결 오류 — 채널 요금 미수집",
    fetchErrToast: "요금 비교 API 호출 오류 — 상태: 채널 요금 미수집",
    scrapeOkToast: (
      hotelName?: string,
      checkIn?: string,
      agodaCount?: number,
      bookingCount?: number
    ) =>
      `${hotelName} (${checkIn}) 실시간 수집 완료: Agoda ${agodaCount ?? 0}개 객실 유형 · Booking.com ${bookingCount ?? 0}개 객실 유형.`,
    scrapeErrMsg: "실시간 수집 API 호출 오류 — 채널 요금 미수집",
    scrapeErrToast:
      "실시간 수집 세션에 연결할 수 없습니다 — 상태: 채널 요금 미수집",
    formulaTitle: "다중 OTA 요금 정규화 및 객실 매칭 공식",
    collapseBtn: "접기",
    formula1Desc:
      "객실 고유 ID, 세전 요금(Net) 및 세후 총액(Gross)을 직접 추출합니다.",
    formula2Desc:
      "실제 blockId 코드와 1박당 웹 표시 요금을 직접 추출합니다.",
    formula3Title: "3. 객실 매칭 키 (Match Key)",
    formula3Desc:
      "OTA마다 객실명이 달라도 동일한 물리적 객실로 1:1 자동 매칭합니다.",
    kpiScraping: "수집 중...",
    unscrapedBadge: "요금 미수집",
    unscrapedCellBadge: "요금 미수집",
    roomTypesUnit: "개 객실 유형",
    openAgoda: "Agoda 열기",
    openBooking: "Booking 열기",
    kpiSpreadTitle: "Agoda vs. Booking 평균 편차",
    matchedPairsCount: (n: number) => `${n}개 매칭 객실 쌍`,
    matrixTitle: (hotelName?: string, checkIn?: string) =>
      `실시간 다중 OTA 요금 비교 매트릭스 (${hotelName} · ${checkIn})`,
    basisUiWeb: "웹 표시가 (UI Web)",
    basisGross: "세후 총액 (Gross)",
    basisNet: "세전 요금 (Net)",
    bedModeAll: "전체 객실",
    bedModeSingle: "1베드 객실",
    bedModeMulti: "다중 베드 객실",
    filterRoomTypeAria: "객실 등급 필터",
    filterRoomTypeAll: "등급: 전체",
    filterBedAria: "침대 구성 필터",
    filterBedAll: "침대: 전체",
    filterBedSingle: "싱글 1개 (Single)",
    filterBedTwin: "싱글 2개 (Twin)",
    filterBedDouble: "더블 1개 (Double)",
    filterBedFlex: "더블 / 2 싱글",
    filterBedTriple: "트리플 (3인)",
    filterBedFamily: "패밀리 (4인+)",
    filterViewAria: "전망 필터",
    filterViewAll: "전망: 전체",
    filterViewCity: "시티뷰 (City)",
    filterViewPartialSea: "부분 오션뷰",
    filterViewOcean: "오션뷰 (Ocean)",
    filterViewNoWindow: "창문 없음",
    filterAreaAria: "객실 면적 필터",
    filterAreaAll: "면적: 전체",
    resetBtn: "초기화",
    emptyFilterText: "현재 필터 조건과 일치하는 객실 유형이 없습니다.",
    clearFilterBtn: "필터 초기화",
    scrapingBannerBusy:
      "Agoda & Booking.com에서 실시간 요금을 수집하고 있습니다...",
    loadingBannerBusy: "데이터를 불러오는 중...",
    colRoomType: "객실 유형",
    colBarRate: "기준가 (BAR)",
    barSubLabel: "기준 BAR",
    deepLinkTooltip: (
      roomName: string,
      roomId: string,
      subPrice: string,
      otaLabel: string
    ) => `${otaLabel}에서 "${roomName}" (#${roomId} · ${subPrice}) 객실 열기`,
    rowUnscrapedBadge: (activeCount: number) =>
      `실시간 ${activeCount}/4 · 요금 미수집`,
    prevPageBtn: "← 이전",
    nextPageBtn: "다음 →",
    skeletonSpreadLabel: "시장 편차",
    inspectorSpreadLabel: "시장 편차",
    otaViewDataTitle: (otaLabel: string) => `${otaLabel} 데이터 보기`,
    otaUnscrapedTitle: (otaLabel: string) => `${otaLabel}: 요금 미수집`,
    tabForm: "8개 항목 폼",
    tabBreakdown: "세금 & 매칭 JSON",
    tabProof: "실시간 증빙",
    photosModalTitle: "UPLOAD PHOTOS — 자동 추출된 객실 사진 목록",
    photosModalDesc: (otaLabel: string, roomName: string) =>
      `${otaLabel}에서 추출한 ${roomName} 객실 사진`,
    taxColChannel: "채널",
    taxColNet: "세전 (Net)",
    taxColTaxFee: "세금 & 봉사료",
    copiedJsonBtn: "복사 완료",
    copyJsonBtn: "JSON 복사",
    directRoomLinksTitle: (roomName: string) =>
      `실시간 객실 딥링크 (${roomName})`,
    partnerOfferLabel: (formattedAmount: string) =>
      ` · 제휴 특가: ${formattedAmount}`,
    openRoomBtn: "객실 열기",
    updatedAtPrefix: "업데이트: ",
    selectRoomFallback:
      "왼쪽 표에서 객실 유형을 선택하면 상세 정보를 확인할 수 있습니다.",
  },
} as const;

function formatFullVnd(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("vi-VN")}đ`;
}

function formatCompactVnd(amount: number, locale: LocaleCode = "vi"): string {
  const val = Math.round(amount || 0);
  if (val >= 1_000_000) {
    const num = (val / 1_000_000).toFixed(2).replace(/\.?0+$/, "");
    return locale === "vi" ? `${num}tr` : `${num}M₫`;
  }
  return locale === "vi"
    ? `${Math.round(val / 1_000)}k`
    : `${Math.round(val / 1_000)}K₫`;
}

function formatLocalizedDescription(
  offer: OtaOfferEntry,
  locale: LocaleCode
): string {
  if (locale === "vi") {
    return offer.formFields.description;
  }
  const viewCode = offer.filterMeta?.viewCategory || "STANDARD_VIEW";
  const bedCode = offer.filterMeta?.detailedBedCategory || "";
  const amenitiesText = (offer.formFields.amenityTypes || []).join(", ");

  if (locale === "en") {
    const areaText = offer.filterMeta?.areaSqm
      ? `${offer.filterMeta.areaSqm} m²`
      : "Standard";
    const viewText = VIEW_LABELS_BY_LOCALE.en[viewCode] || viewCode;
    const bedText =
      BED_SHORT_LABELS_BY_LOCALE.en[bedCode] ||
      offer.filterMeta?.rawBedText ||
      offer.formFields.bedType;
    return `[Tier: ${offer.formFields.roomType} | Area: ${areaText} | View: ${viewText} | Bed: ${bedText}] — ${offer.formFields.roomName} (Max ${offer.formFields.maximumGuests} guests). Key amenities: ${amenitiesText}.`;
  }

  const areaText = offer.filterMeta?.areaSqm
    ? `${offer.filterMeta.areaSqm} m²`
    : "표준";
  const viewText = VIEW_LABELS_BY_LOCALE.ko[viewCode] || viewCode;
  const bedText =
    BED_SHORT_LABELS_BY_LOCALE.ko[bedCode] ||
    offer.filterMeta?.rawBedText ||
    offer.formFields.bedType;
  return `[객실 등급: ${offer.formFields.roomType} | 면적: ${areaText} | 전망: ${viewText} | 침대: ${bedText}] — ${offer.formFields.roomName} 객실 (최대 ${offer.formFields.maximumGuests}인 투숙 가능). 기본 구비 시설: ${amenitiesText}.`;
}

/**
 * Định dạng thời gian sang chuẩn Giờ Việt Nam (GMT+7 / Asia/Ho_Chi_Minh)
 * Tránh hiển thị chuỗi UTC (...T05:18:09Z) lệch -7 tiếng so với đồng hồ máy người dùng
 */
function formatVietnamDateTime(
  isoOrStr?: string | null,
  preformattedVi?: string | null,
  locale: LocaleCode = "vi"
): string {
  if (preformattedVi && preformattedVi.includes("GMT+7")) {
    if (locale === "ko") {
      return preformattedVi.replace("(Giờ VN GMT+7)", "(베트남 시간 GMT+7)");
    }
    if (locale === "en") {
      return preformattedVi.replace("(Giờ VN GMT+7)", "(VN Time GMT+7)");
    }
    return preformattedVi;
  }
  const d = isoOrStr ? new Date(isoOrStr) : new Date();
  const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(validDate);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const tzSuffix =
    locale === "ko"
      ? "(베트남 시간 GMT+7)"
      : locale === "en"
        ? "(VN Time GMT+7)"
        : "(Giờ VN GMT+7)";
  return `${map.hour}:${map.minute}:${map.second} — ${map.day}/${map.month}/${map.year} ${tzSuffix}`;
}

export function App() {
  const [locale, setLocale] = useState<LocaleCode>(() => detectInitialLocale());
  const t = UI_TEXT[locale];
  const OTA_LABELS = OTA_LABELS_BY_LOCALE[locale];
  const OTA_SHORT_LABELS = OTA_SHORT_LABELS_BY_LOCALE[locale];
  const VIEW_LABELS = VIEW_LABELS_BY_LOCALE[locale];
  const BED_SHORT_LABELS = BED_SHORT_LABELS_BY_LOCALE[locale];

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.title = PAGE_TITLES_BY_LOCALE[locale];
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("gns_ota_locale", locale);
      } catch {
        // ignore storage errors
      }
    }
  }, [locale]);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scraping, setScraping] = useState<boolean>(false);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Light / Dark Mode Theme (persist in localStorage)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("gns_ota_theme");
        if (saved === "dark" || saved === "light") return saved;
      } catch {
        // ignore storage errors
      }
    }
    return "light";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("gns_ota_theme", theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Trạng thái lỗi gọi API cào giá ("Sàn chưa cào giá")
  const [apiErrorState, setApiErrorState] = useState<{
    failed: boolean;
    kind?: "fetch" | "scrape";
    message: string;
    failedOtas: OtaCode[];
  } | null>(null);

  const localeRef = useRef<LocaleCode>(locale);
  localeRef.current = locale;

  // Tham số cào thực tế (Đổi khách sạn hoặc đổi ngày Check-in để chứng minh Live Scrape)
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>(
    "champton-nha-trang"
  );
  const [selectedCheckIn, setSelectedCheckIn] = useState<string>("2026-11-20");

  // Bộ lọc 6 tầng + Diện tích (m²) + Phân trang Lazy Top-5
  const [multiBedMode, setMultiBedMode] = useState<
    "ALL" | "SINGLE_BED_ONLY" | "MULTI_BED_ONLY"
  >("ALL");
  const [roomType, setRoomType] = useState<string>("ALL");
  const [detailedBedCategory, setDetailedBedCategory] = useState<string>("ALL");
  const [viewCategory, setViewCategory] = useState<string>("ALL");
  const [areaRange, setAreaRange] = useState<string>("ALL");
  const [priceBasis, setPriceBasis] = useState<"UI_WEB" | "GROSS" | "NET">(
    "UI_WEB"
  );
  const [page, setPage] = useState<number>(1);
  const pageSize = 5;

  // Dòng hạng phòng đang chọn để hiển thị ở Inspector bên phải
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedOtaForForm, setSelectedOtaForForm] =
    useState<OtaCode>("AGODA");
  const [inspectorTab, setInspectorTab] = useState<string>("form");
  const [mappingOtaView, setMappingOtaView] =
    useState<MappingOtaKey>("BOOKING_COM");
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5500);
  }, []);

  const latestFetchIdRef = useRef(0);

  const fetchReport = useCallback(async () => {
    const reqId = ++latestFetchIdRef.current;
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        hotelKey: selectedHotelKey,
        checkIn: selectedCheckIn,
        roomType,
        detailedBedCategory,
        multiBedMode,
        viewCategory,
        areaRange,
        priceBasis,
        page: String(page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/report?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: ReportResponse = await res.json();
      if (reqId !== latestFetchIdRef.current) return;
      setReport(data);
      if (data.comparisonGroups.length > 0) {
        const firstDualMatched =
          data.comparisonGroups.find(
            (g) => g.otaOffers.AGODA && g.otaOffers.BOOKING
          ) ?? data.comparisonGroups[0];
        setSelectedGroupKey((prev) =>
          prev && data.comparisonGroups.some((g) => g.groupKey === prev)
            ? prev
            : firstDualMatched.groupKey
        );
      } else {
        setSelectedGroupKey(null);
      }
    } catch {
      if (reqId !== latestFetchIdRef.current) return;
      const curT = UI_TEXT[localeRef.current];
      setApiErrorState({
        failed: true,
        kind: "fetch",
        message: curT.fetchErrMsg,
        failedOtas: ["AGODA", "BOOKING", "EXPEDIA", "TRIP"],
      });
      showToast(curT.fetchErrToast);
    } finally {
      if (reqId === latestFetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    selectedHotelKey,
    selectedCheckIn,
    roomType,
    detailedBedCategory,
    multiBedMode,
    viewCategory,
    areaRange,
    priceBasis,
    page,
    showToast,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleLiveScrape = async (
    overrideHotelKey?: string,
    overrideCheckIn?: string
  ) => {
    const targetHotel = overrideHotelKey ?? selectedHotelKey;
    const targetDate = overrideCheckIn ?? selectedCheckIn;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelKey: targetHotel,
          checkIn: targetDate,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const fresh: ReportResponse = await res.json();
      if (fresh.liveScrapeProof && fresh.liveScrapeProof.success === false) {
        throw new Error("Live scrape returned success=false");
      }
      setApiErrorState(null);
      await fetchReport();
      showToast(
        UI_TEXT[localeRef.current].scrapeOkToast(
          fresh.hotelName,
          fresh.checkIn,
          fresh.liveScrapeProof?.agoda.masterRoomCount,
          fresh.liveScrapeProof?.booking.uniqueRoomCount
        )
      );
    } catch {
      const curT = UI_TEXT[localeRef.current];
      setApiErrorState({
        failed: true,
        kind: "scrape",
        message: curT.scrapeErrMsg,
        failedOtas: ["AGODA", "BOOKING"],
      });
      showToast(curT.scrapeErrToast);
    } finally {
      setScraping(false);
    }
  };

  const handleResetFilters = () => {
    setMultiBedMode("ALL");
    setRoomType("ALL");
    setDetailedBedCategory("ALL");
    setViewCategory("ALL");
    setAreaRange("ALL");
    setPriceBasis("UI_WEB");
    setPage(1);
  };

  const selectedGroup = useMemo(() => {
    if (!report || !report.comparisonGroups.length) return null;
    return (
      report.comparisonGroups.find((g) => g.groupKey === selectedGroupKey) ??
      report.comparisonGroups[0]
    );
  }, [report, selectedGroupKey]);

  const activeOfferForForm = useMemo(() => {
    if (!selectedGroup) return null;
    return (
      selectedGroup.otaOffers[selectedOtaForForm] ??
      selectedGroup.otaOffers.AGODA ??
      selectedGroup.otaOffers.BOOKING ??
      selectedGroup.otaOffers.EXPEDIA ??
      selectedGroup.otaOffers.TRIP ??
      selectedGroup.otaOffers.GOODNSTAY ??
      Object.values(selectedGroup.otaOffers)[0] ??
      null
    );
  }, [selectedGroup, selectedOtaForForm]);

  const getSelectClass = (isActive: boolean) =>
    `h-7 px-2 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
      isActive
        ? "border-emerald-300 bg-emerald-50/80 text-emerald-800"
        : "border-zinc-200/90 bg-white hover:bg-zinc-50 text-zinc-700"
    }`;

  const hasActiveFilter =
    multiBedMode !== "ALL" ||
    roomType !== "ALL" ||
    detailedBedCategory !== "ALL" ||
    viewCategory !== "ALL" ||
    areaRange !== "ALL";

  const proof = report?.liveScrapeProof;
  const isBusy = loading || scraping;
  const skeletonRows = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

  const agodaLiveOk =
    !apiErrorState?.failed &&
    !apiErrorState?.failedOtas.includes("AGODA") &&
    (proof?.agoda?.masterRoomCount ?? 0) > 0;
  const bookingLiveOk =
    !apiErrorState?.failed &&
    !apiErrorState?.failedOtas.includes("BOOKING") &&
    (proof?.booking?.uniqueRoomCount ?? 0) > 0;
  const liveHealthyCount = (agodaLiveOk ? 1 : 0) + (bookingLiveOk ? 1 : 0);
  const hasUnscrapedLiveOta =
    Boolean(apiErrorState?.failed) || !agodaLiveOk || !bookingLiveOk;

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-zinc-900 pb-14 overflow-x-clip">
      {/* ===================================================================== */}
      {/* CLEAN NON-OVERLAPPING TOPBAR                                          */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Brand + Live Hotel Switcher + Check-in Date Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-zinc-950 text-white font-bold text-xs flex items-center justify-center shrink-0">
                g
              </div>
              <span className="font-semibold text-sm tracking-tight text-zinc-950">
                goodNstay
              </span>
              <span className="text-zinc-300 hidden sm:inline">/</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-800 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                data-testid="select-hotel"
                aria-label={t.hotelSelectAria}
                value={selectedHotelKey}
                onChange={(e) => {
                  setSelectedHotelKey(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-medium text-xs text-zinc-900 pr-1 focus:outline-none cursor-pointer"
              >
                <option value="champton-nha-trang">{t.hotelChampton}</option>
                <option value="libra-nha-trang">{t.hotelLibra}</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-zinc-50 border border-zinc-200/90 text-xs font-mono text-zinc-700 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                data-testid="select-checkin"
                aria-label={t.checkinSelectAria}
                value={selectedCheckIn}
                onChange={(e) => {
                  setSelectedCheckIn(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-mono text-xs text-zinc-800 pr-1 focus:outline-none cursor-pointer"
              >
                <option value="2026-11-20">{t.checkinOpt1}</option>
                <option value="2026-11-25">{t.checkinOpt2}</option>
                <option value="2026-12-05">{t.checkinOpt3}</option>
              </select>
            </div>
          </div>

          {/* Right: Compact Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="btn-live-badge"
              onClick={() => setInspectorTab("proof")}
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs cursor-pointer transition-colors shrink-0 ${
                hasUnscrapedLiveOta
                  ? "bg-amber-50/90 border-amber-300 text-amber-900 hover:bg-amber-100/80"
                  : "bg-emerald-50/80 border-emerald-200/80 text-emerald-800 hover:bg-emerald-100/70"
              }`}
              title={
                hasUnscrapedLiveOta ? t.liveBadgeWarnTitle : t.liveBadgeOkTitle
              }
            >
              {hasUnscrapedLiveOta ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-medium">
                    {t.liveBadgeWarnText(liveHealthyCount)}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
                  <span className="font-medium">{t.liveBadgeOkText}</span>
                </>
              )}
            </button>

            {/* 3-Language Switcher: VI / EN / KO */}
            <div
              data-testid="locale-switcher"
              role="group"
              aria-label={t.localeSwitcherAria}
              className="inline-flex items-center gap-0.5 p-0.5 h-8 rounded-lg border border-zinc-200 bg-zinc-100/90 shrink-0"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-500 ml-1.5 mr-0.5 shrink-0" />
              {(
                [
                  { code: "vi", label: "VI", title: "Tiếng Việt" },
                  { code: "en", label: "EN", title: "English" },
                  { code: "ko", label: "KO", title: "한국어" },
                ] as const
              ).map((lang) => {
                const active = locale === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    data-testid={`btn-locale-${lang.code}`}
                    aria-pressed={active}
                    title={lang.title}
                    onClick={() => setLocale(lang.code)}
                    className={`px-2 h-[26px] rounded-md text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                      active
                        ? "bg-zinc-900 text-white shadow-2xs"
                        : "text-zinc-600 hover:text-zinc-950"
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              data-testid="btn-toggle-theme"
              aria-label={
                theme === "dark" ? t.themeToLightAria : t.themeToDarkAria
              }
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
              className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                theme === "dark"
                  ? "bg-zinc-900 text-amber-400 border-zinc-700 hover:bg-zinc-800"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
              }`}
              title={theme === "dark" ? t.themeDarkTitle : t.themeLightTitle}
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span>Dark</span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="btn-toggle-formulas"
              onClick={() => setShowFormulas((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                showFormulas
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{t.formulasBtn}</span>
            </button>

            <button
              type="button"
              data-testid="btn-live-scrape"
              disabled={scraping}
              onClick={() => handleLiveScrape()}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white whitespace-nowrap cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RotateCcw
                className={`w-3.5 h-3.5 ${scraping ? "animate-spin" : ""}`}
              />
              <span>{scraping ? t.scrapeBusyBtn : t.scrapeIdleBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOAST */}
      {toastMessage && (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-3">
          <div className="px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-zinc-400 hover:text-white text-xs cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* API FAIL / UNSCRAPED OTA BANNER */}
      {apiErrorState?.failed && (
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-3">
          <div
            data-testid="api-fail-unscraped-banner"
            className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">{t.unscrapedPrefix}</span>
              <span>
                {apiErrorState.kind === "scrape"
                  ? t.scrapeErrMsg
                  : t.fetchErrMsg}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-retry-scrape"
                onClick={() => handleLiveScrape()}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-medium hover:bg-zinc-800 cursor-pointer"
              >
                {t.retryScrapeBtn}
              </button>
              <button
                type="button"
                data-testid="btn-dismiss-api-error"
                onClick={() => setApiErrorState(null)}
                className="text-amber-800 hover:text-amber-950 text-[11px] font-medium underline cursor-pointer"
              >
                {t.dismissWarnBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* =================================================================== */}
        {/* COLLAPSIBLE FORMULA & MATCHING RULE DRAWER                          */}
        {/* =================================================================== */}
        {showFormulas && (
          <section className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">
                {t.formulaTitle}
              </span>
              <button
                type="button"
                onClick={() => setShowFormulas(false)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                {t.collapseBtn} <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  1. Agoda (Net &amp; Gross)
                </div>
                <div className="font-mono text-[11px] text-emerald-700">
                  roomGridData.masterRooms
                </div>
                <div className="text-zinc-500 text-[11px]">{t.formula1Desc}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  2. Booking.com (DOM Block)
                </div>
                <div className="font-mono text-[11px] text-zinc-800">
                  #hprt-table tr[data-block-id]
                </div>
                <div className="text-zinc-500 text-[11px]">{t.formula2Desc}</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  {t.formula3Title}
                </div>
                <div className="font-mono text-[11px] text-sky-700">
                  Tier + Bed + View + Area (m²)
                </div>
                <div className="text-zinc-500 text-[11px]">{t.formula3Desc}</div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* MAIN WORKSPACE: 12-COLUMN SPLIT (8 + 4) WITH BALANCED HEIGHTS       */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* LEFT 8 COLS: UNIFIED MULTI-OTA RATE COMPARISON MATRIX */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-3.5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  {t.matrixTitle(report?.hotelName, report?.checkIn)}
                </h2>

                <div className="inline-flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/60">
                  <button
                    type="button"
                    data-testid="basis-UI_WEB"
                    onClick={() => setPriceBasis("UI_WEB")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      priceBasis === "UI_WEB"
                        ? "bg-white text-zinc-950 shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {t.basisUiWeb}
                  </button>
                  <button
                    type="button"
                    data-testid="basis-GROSS"
                    onClick={() => setPriceBasis("GROSS")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      priceBasis === "GROSS"
                        ? "bg-white text-zinc-950 shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {t.basisGross}
                  </button>
                  <button
                    type="button"
                    data-testid="basis-NET"
                    onClick={() => setPriceBasis("NET")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                      priceBasis === "NET"
                        ? "bg-white text-zinc-950 shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {t.basisNet}
                  </button>
                </div>
              </div>

              {/* Single-Line Balanced Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70">
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-zinc-200/80 shrink-0">
                  {(
                    [
                      { key: "ALL", label: t.bedModeAll },
                      { key: "SINGLE_BED_ONLY", label: t.bedModeSingle },
                      { key: "MULTI_BED_ONLY", label: t.bedModeMulti },
                    ] as const
                  ).map((item) => {
                    const active = multiBedMode === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        data-testid={`bed-mode-${item.key}`}
                        onClick={() => {
                          setMultiBedMode(item.key);
                          setPage(1);
                        }}
                        className={`px-2 py-1 rounded-md text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                          active
                            ? "bg-zinc-900 text-white font-semibold shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  <select
                    data-testid="filter-room-type"
                    aria-label={t.filterRoomTypeAria}
                    value={roomType}
                    onChange={(e) => {
                      setRoomType(e.target.value);
                      setPage(1);
                    }}
                    className={getSelectClass(roomType !== "ALL")}
                  >
                    <option value="ALL">{t.filterRoomTypeAll}</option>
                    <option value="Standard">Standard</option>
                    <option value="Superior">Superior</option>
                    <option value="Deluxe">Deluxe</option>
                    <option value="Executive">Executive</option>
                    <option value="Suite">Suite</option>
                  </select>

                  <select
                    data-testid="filter-bed-category"
                    aria-label={t.filterBedAria}
                    value={detailedBedCategory}
                    onChange={(e) => {
                      setDetailedBedCategory(e.target.value);
                      setPage(1);
                    }}
                    className={getSelectClass(detailedBedCategory !== "ALL")}
                  >
                    <option value="ALL">{t.filterBedAll}</option>
                    <option value="SINGLE_1_BED">{t.filterBedSingle}</option>
                    <option value="TWIN_2_SINGLE">{t.filterBedTwin}</option>
                    <option value="DOUBLE_QUEEN_1_BED">
                      {t.filterBedDouble}
                    </option>
                    <option value="KING_1_BED">King</option>
                    <option value="FLEX_DOUBLE_OR_TWIN">
                      {t.filterBedFlex}
                    </option>
                    <option value="MULTI_BED_TRIPLE">
                      {t.filterBedTriple}
                    </option>
                    <option value="MULTI_BED_QUAD_FAMILY">
                      {t.filterBedFamily}
                    </option>
                  </select>

                  <select
                    data-testid="filter-view-category"
                    aria-label={t.filterViewAria}
                    value={viewCategory}
                    onChange={(e) => {
                      setViewCategory(e.target.value);
                      setPage(1);
                    }}
                    className={getSelectClass(viewCategory !== "ALL")}
                  >
                    <option value="ALL">{t.filterViewAll}</option>
                    <option value="CITY_VIEW">{t.filterViewCity}</option>
                    <option value="PARTIAL_SEA_VIEW">
                      {t.filterViewPartialSea}
                    </option>
                    <option value="OCEAN_SEA_VIEW">{t.filterViewOcean}</option>
                    <option value="NO_WINDOW">{t.filterViewNoWindow}</option>
                  </select>

                  <select
                    data-testid="filter-area-range"
                    aria-label={t.filterAreaAria}
                    value={areaRange}
                    onChange={(e) => {
                      setAreaRange(e.target.value);
                      setPage(1);
                    }}
                    className={getSelectClass(areaRange !== "ALL")}
                  >
                    <option value="ALL">{t.filterAreaAll}</option>
                    <option value="UNDER_25">&lt; 25m²</option>
                    <option value="FROM_25_TO_35">25 – 35m²</option>
                    <option value="FROM_36_TO_50">36 – 50m²</option>
                    <option value="OVER_50">&gt; 50m²</option>
                  </select>

                  {hasActiveFilter && (
                    <button
                      type="button"
                      data-testid="btn-reset-filters"
                      onClick={handleResetFilters}
                      className="h-7 px-2 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      {t.resetBtn}
                    </button>
                  )}
                </div>
              </div>

              {/* Clean Master Comparison Table */}
              {!isBusy && (!report || report.comparisonGroups.length === 0) ? (
                <div className="py-16 text-center text-xs text-zinc-500 space-y-2">
                  <div>{t.emptyFilterText}</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                  >
                    {t.clearFilterBtn}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {isBusy && (
                    <div
                      data-testid="scraping-status-banner"
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />
                        <span>
                          {scraping
                            ? t.scrapingBannerBusy
                            : t.loadingBannerBusy}
                        </span>
                      </div>
                    </div>
                  )}

                  <div
                    data-testid="comparison-table-wrapper"
                    className="rounded-xl border border-zinc-200/80 overflow-x-auto"
                  >
                    <Table className="table-fixed w-full min-w-[830px]">
                      <TableHeader className="bg-zinc-50/80">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[11px] font-semibold text-zinc-500 py-2.5 pl-3 pr-2 w-[27%]">
                            {t.colRoomType}
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[11%]">
                            {t.colBarRate}
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[15.5%]">
                            Agoda
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[15.5%]">
                            Booking.com
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[15.5%]">
                            Expedia
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 pl-1.5 pr-3 w-[15.5%]">
                            Trip.com
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isBusy
                          ? skeletonRows.map((rowKey) => (
                              <TableRow
                                key={rowKey}
                                className="hover:bg-transparent"
                              >
                                <TableCell className="py-3 pl-3 pr-2 align-middle whitespace-normal overflow-hidden">
                                  <div className="flex items-center gap-2">
                                    <span className="skeleton-shimmer h-4 w-8 rounded" />
                                    <span
                                      data-testid="room-name-skeleton"
                                      className="skeleton-shimmer h-4 w-36 rounded-md"
                                    />
                                  </div>
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <span className="skeleton-shimmer h-3.5 w-10 rounded" />
                                    <span className="skeleton-shimmer h-3.5 w-16 rounded" />
                                    <span className="skeleton-shimmer h-3.5 w-20 rounded" />
                                  </div>
                                </TableCell>
                                {(
                                  [
                                    "GOODNSTAY",
                                    "AGODA",
                                    "BOOKING",
                                    "EXPEDIA",
                                    "TRIP",
                                  ] as OtaCode[]
                                ).map((ota) => (
                                  <TableCell
                                    key={ota}
                                    className={`py-3 text-right align-middle overflow-hidden ${
                                      ota === "TRIP"
                                        ? "pl-1.5 pr-3"
                                        : "px-1.5"
                                    }`}
                                  >
                                    <div
                                      data-testid="price-cell-skeleton"
                                      className="flex flex-col items-end gap-1.5 py-0.5"
                                    >
                                      <span className="skeleton-shimmer h-4 w-20 rounded-md" />
                                      <span className="skeleton-shimmer h-3.5 w-14 rounded" />
                                    </div>
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          : report!.comparisonGroups.map((grp) => {
                              const isSelected =
                                selectedGroup?.groupKey === grp.groupKey;
                              const p = grp.spreadAnalysis.platforms;
                              const comparedOtas: OtaCode[] = [
                                "AGODA",
                                "BOOKING",
                                "EXPEDIA",
                                "TRIP",
                              ];
                              const activeOtaCount = comparedOtas.filter(
                                (ota) =>
                                  Boolean(grp.otaOffers[ota]) &&
                                  !apiErrorState?.failedOtas.includes(ota)
                              ).length;
                              const hasRowUnscraped =
                                activeOtaCount < comparedOtas.length ||
                                Boolean(apiErrorState?.failed);

                              const renderOtaCell = (ota: OtaCode) => {
                                const m = p[ota];
                                const off = grp.otaOffers[ota];
                                const isOtaApiFailed = Boolean(
                                  apiErrorState?.failedOtas.includes(ota)
                                );
                                if (!m || !off || isOtaApiFailed) {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span
                                        data-testid={`ota-unscraped-${ota}`}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-medium whitespace-nowrap"
                                      >
                                        {t.unscrapedCellBadge}
                                      </span>
                                    </div>
                                  );
                                }
                                if (ota === "GOODNSTAY") {
                                  return (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span
                                        data-testid="price-value-GOODNSTAY"
                                        className="font-mono text-[11.5px] font-semibold text-zinc-900"
                                      >
                                        {formatFullVnd(m.price)}
                                      </span>
                                      <span className="text-[10px] font-mono text-zinc-400">
                                        {t.barSubLabel}
                                      </span>
                                    </div>
                                  );
                                }
                                const isPositive = m.diffVsRefPct > 0.05;
                                const isNegative = m.diffVsRefPct < -0.05;
                                const pctFormatted = Number(
                                  m.diffVsRefPct.toFixed(1)
                                );
                                const fullRoomId =
                                  off.liveProof?.roomId ||
                                  off.liveProof?.externalNativeId
                                    ?.replace(/^masterRoomId:/, "")
                                    .replace(/^roomId:/, "")
                                    .replace(/^unitId:/, "")
                                    .replace(/^baseRoomId:/, "")
                                    .replace(/^blockId:/, "") ||
                                  "";
                                const deepLinkUrl =
                                  off.liveProof?.deepLinkUrl ||
                                  off.liveProof?.sourceUrl ||
                                  "#";
                                const subPriceLabel =
                                  ota === "AGODA" ||
                                  ota === "EXPEDIA" ||
                                  ota === "TRIP"
                                    ? `Gross ${formatCompactVnd(off.grossPrice, locale)}`
                                    : `Net ${formatCompactVnd(off.netPrice, locale)}`;

                                return (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center justify-end gap-1">
                                      <span
                                        data-testid={`price-value-${ota}`}
                                        className="font-mono text-[11.5px] font-semibold text-zinc-900"
                                      >
                                        {formatFullVnd(m.price)}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-1 py-0.2 rounded text-[9px] font-mono font-medium ${
                                          isNegative
                                            ? "bg-rose-50 text-rose-700"
                                            : isPositive
                                              ? "bg-emerald-50 text-emerald-700"
                                              : "bg-zinc-100 text-zinc-600"
                                        }`}
                                      >
                                        {isPositive
                                          ? `+${pctFormatted}%`
                                          : `${pctFormatted}%`}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-end text-[10px] font-mono text-zinc-400">
                                      <span
                                        data-testid={`ui-web-price-${ota}`}
                                        className="sr-only"
                                      >
                                        {subPriceLabel}
                                      </span>
                                      <a
                                        href={deepLinkUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        data-testid={`room-proof-link-${ota}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedGroupKey(grp.groupKey);
                                          setSelectedOtaForForm(ota);
                                          setInspectorTab("proof");
                                        }}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-emerald-50 text-zinc-600 hover:text-emerald-800 text-[9.5px] font-mono transition-colors"
                                        title={t.deepLinkTooltip(
                                          off.roomName,
                                          fullRoomId,
                                          subPriceLabel,
                                          OTA_LABELS[ota]
                                        )}
                                      >
                                        <span>#{fullRoomId}</span>
                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <TableRow
                                  key={grp.groupKey}
                                  data-testid="comparison-row"
                                  onClick={() => setSelectedGroupKey(grp.groupKey)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? "bg-zinc-100/90 hover:bg-zinc-100"
                                      : "hover:bg-zinc-50/70"
                                  }`}
                                >
                                  <TableCell className="py-2.5 pl-3 pr-2 align-middle whitespace-normal overflow-hidden">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-white text-[10px] font-mono font-semibold shrink-0">
                                        #{grp.matchRank ?? 1}
                                      </span>
                                      <span
                                        className="font-semibold text-xs text-zinc-950 truncate"
                                        title={grp.sampleGoodNStayForm.roomName}
                                      >
                                        {grp.sampleGoodNStayForm.roomName}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                                      <span className="font-mono text-zinc-600">
                                        {grp.areaSqm ?? "--"}m²
                                      </span>
                                      <span className="text-zinc-300 mx-1">
                                        ·
                                      </span>
                                      <span>
                                        {VIEW_LABELS[grp.viewCategory] ??
                                          grp.viewCategory}
                                      </span>
                                      <span className="text-zinc-300 mx-1">
                                        ·
                                      </span>
                                      <span className="text-zinc-700 font-medium">
                                        {BED_SHORT_LABELS[
                                          grp.detailedBedCategory
                                        ] ?? grp.goodNStayBedType}
                                      </span>
                                    </div>
                                    {hasRowUnscraped && (
                                      <div className="mt-1">
                                        <span
                                          data-testid="row-live-ota-badge"
                                          className="inline-flex px-1.5 py-0.2 rounded border bg-amber-50 text-amber-800 border-amber-200/80 text-[10px] font-mono font-medium"
                                        >
                                          {t.rowUnscrapedBadge(activeOtaCount)}
                                        </span>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2.5 px-1.5 text-right align-middle overflow-hidden">
                                    {renderOtaCell("GOODNSTAY")}
                                  </TableCell>
                                  <TableCell className="py-2.5 px-1.5 text-right align-middle overflow-hidden">
                                    {renderOtaCell("AGODA")}
                                  </TableCell>
                                  <TableCell className="py-2.5 px-1.5 text-right align-middle overflow-hidden">
                                    {renderOtaCell("BOOKING")}
                                  </TableCell>
                                  <TableCell className="py-2.5 px-1.5 text-right align-middle overflow-hidden">
                                    {renderOtaCell("EXPEDIA")}
                                  </TableCell>
                                  <TableCell className="py-2.5 pl-1.5 pr-3 text-right align-middle overflow-hidden">
                                    {renderOtaCell("TRIP")}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>

            {/* TOP-5 LAZY PAGINATION BAR ANCHORED AT BOTTOM OF LEFT CARD */}
            {report?.pagination && (
              <div
                data-testid="pagination-bar"
                className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100"
              >
                <div className="text-xs text-zinc-500">
                  {locale === "ko" ? (
                    <>
                      전체{" "}
                      <span className="font-mono font-semibold text-zinc-900">
                        {report.pagination.totalItems}
                      </span>
                      개 객실 중{" "}
                      <span className="font-mono font-semibold text-zinc-900">
                        Top {report.pagination.startRank}–
                        {report.pagination.endRank}
                      </span>{" "}
                      표시
                    </>
                  ) : locale === "en" ? (
                    <>
                      Showing{" "}
                      <span className="font-mono font-semibold text-zinc-900">
                        Top {report.pagination.startRank}–
                        {report.pagination.endRank}
                      </span>{" "}
                      of{" "}
                      <span className="font-mono font-semibold text-zinc-900">
                        {report.pagination.totalItems}
                      </span>{" "}
                      rooms
                    </>
                  ) : (
                    <>
                      Hiển thị{" "}
                      <span className="font-mono font-semibold text-zinc-900">
                        Top {report.pagination.startRank}–
                        {report.pagination.endRank}
                      </span>{" "}
                      /{" "}
                      <span className="font-mono font-semibold text-zinc-900">
                        {report.pagination.totalItems}
                      </span>{" "}
                      phòng
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="btn-prev-page"
                    disabled={isBusy || (report.pagination.page || 1) <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 disabled:opacity-40 cursor-pointer"
                  >
                    {t.prevPageBtn}
                  </button>

                  {Array.from(
                    { length: report.pagination.totalPages },
                    (_, idx) => idx + 1
                  ).map((pg) => {
                    const isCurr = pg === report.pagination?.page;
                    const sRank = (pg - 1) * pageSize + 1;
                    const eRank = Math.min(
                      report.pagination?.totalItems || 0,
                      pg * pageSize
                    );
                    return (
                      <button
                        key={pg}
                        type="button"
                        data-testid={`btn-page-${pg}`}
                        disabled={isBusy}
                        onClick={() => setPage(pg)}
                        className={`h-7 px-2.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
                          isCurr
                            ? "border-zinc-900 bg-zinc-900 text-white font-semibold"
                            : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600"
                        }`}
                      >
                        Top {sRank}–{eRank}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    data-testid="btn-next-page"
                    disabled={
                      isBusy ||
                      (report.pagination.page || 1) >=
                        (report.pagination.totalPages || 1)
                    }
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          report.pagination?.totalPages || 1,
                          p + 1
                        )
                      )
                    }
                    className="h-7 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 disabled:opacity-40 cursor-pointer"
                  >
                    {t.nextPageBtn}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 4 COLS: INSPECTOR, 8-FIELD FORM & LIVE PROOF */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3.5">
            {isBusy ? (
              <div
                data-testid="inspector-skeleton"
                className="space-y-4"
              >
                <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="skeleton-shimmer h-5 w-14 rounded-md" />
                      <span className="skeleton-shimmer h-5 w-24 rounded-md" />
                    </div>
                    <div className="skeleton-shimmer h-5 w-44 rounded-md" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[10px] text-zinc-400 uppercase font-medium">
                      {t.skeletonSpreadLabel}
                    </span>
                    <span className="skeleton-shimmer h-5 w-16 rounded-md" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
                  <span className="skeleton-shimmer h-7 rounded-lg" />
                  <span className="skeleton-shimmer h-7 rounded-lg" />
                  <span className="skeleton-shimmer h-7 rounded-lg" />
                </div>

                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span
                      data-testid="form-field-skeleton"
                      className="skeleton-shimmer h-7 w-36 rounded-md"
                    />
                    <span className="skeleton-shimmer h-4 w-28 rounded" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-500">
                      Room Name *
                    </label>
                    <div
                      data-testid="form-field-skeleton"
                      className="h-8 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 flex items-center"
                    >
                      <span className="skeleton-shimmer h-4 w-48 rounded" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-500">
                      Description *
                    </label>
                    <div
                      data-testid="form-field-skeleton"
                      className="min-h-[84px] rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2.5 space-y-2"
                    >
                      <div className="skeleton-shimmer h-3.5 w-11/12 rounded" />
                      <div className="skeleton-shimmer h-3.5 w-10/12 rounded" />
                      <div className="skeleton-shimmer h-3.5 w-8/12 rounded" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Price per night *
                      </label>
                      <div
                        data-testid="form-field-skeleton"
                        className="h-8 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 flex items-center"
                      >
                        <span className="skeleton-shimmer h-4 w-28 rounded" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Maximum Guests *
                      </label>
                      <div
                        data-testid="form-field-skeleton"
                        className="h-8 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 flex items-center"
                      >
                        <span className="skeleton-shimmer h-4 w-10 rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-zinc-500">
                      Amenity Types
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/40">
                      <span className="skeleton-shimmer h-4 w-24 rounded" />
                      <span className="skeleton-shimmer h-4 w-24 rounded" />
                      <span className="skeleton-shimmer h-4 w-24 rounded" />
                      <span className="skeleton-shimmer h-4 w-28 rounded" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Room Type
                      </label>
                      <div className="h-8 px-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center">
                        <span className="skeleton-shimmer h-4 w-16 rounded" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Bed Type
                      </label>
                      <div className="h-8 px-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center">
                        <span className="skeleton-shimmer h-4 w-16 rounded" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Inventory *
                      </label>
                      <div className="h-8 px-3 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center">
                        <span className="skeleton-shimmer h-4 w-8 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedGroup && activeOfferForForm ? (
              <>
                <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                        {selectedGroup.gnsRoomId || "GNS-R201"}
                      </span>
                      <Badge variant="neutral">{selectedGroup.roomType}</Badge>
                      <button
                        type="button"
                        data-testid="btn-jump-json-contract"
                        onClick={() => setInspectorTab("breakdown")}
                        className="text-[10.5px] font-mono px-1.5 py-0.5 rounded border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 cursor-pointer"
                      >
                        JSON →
                      </button>
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-950 mt-1.5 truncate">
                      {selectedGroup.sampleGoodNStayForm.roomName}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-medium">
                      {t.inspectorSpreadLabel}
                    </div>
                    <div className="text-sm font-bold font-mono text-zinc-900">
                      {selectedGroup.spreadAnalysis.marketSpreadPct}%
                    </div>
                  </div>
                </div>

                {/* OTA Source Switcher (non-truncated short labels, accessible full aria-label) */}
                <div className="grid grid-cols-4 gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
                  {(
                    ["AGODA", "BOOKING", "EXPEDIA", "TRIP"] as OtaCode[]
                  ).map((ota) => {
                    const isFailed = Boolean(
                      apiErrorState?.failedOtas.includes(ota)
                    );
                    const hasOffer =
                      Boolean(selectedGroup.otaOffers[ota]) && !isFailed;
                    const active = selectedOtaForForm === ota;
                    return (
                      <button
                        key={ota}
                        type="button"
                        aria-label={OTA_LABELS[ota]}
                        disabled={!hasOffer}
                        onClick={() => setSelectedOtaForForm(ota)}
                        title={
                          hasOffer
                            ? t.otaViewDataTitle(OTA_LABELS[ota])
                            : t.otaUnscrapedTitle(OTA_LABELS[ota])
                        }
                        className={`py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer disabled:opacity-40 ${
                          active
                            ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {OTA_SHORT_LABELS[ota]}
                      </button>
                    );
                  })}
                </div>

                <Tabs
                  value={inspectorTab}
                  onValueChange={setInspectorTab}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="form" className="text-xs">
                      {t.tabForm}
                    </TabsTrigger>
                    <TabsTrigger value="breakdown" className="text-xs">
                      {t.tabBreakdown}
                    </TabsTrigger>
                    <TabsTrigger value="proof" className="text-xs">
                      {t.tabProof}
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: CLEAN 8-FIELD GOODNSTAY ROOM FORM */}
                  <TabsContent value="form" className="pt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button
                            type="button"
                            data-testid="btn-upload-photos"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-300 text-[11px] font-semibold text-zinc-700 bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
                            UPLOAD PHOTOS (
                            {(
                              activeOfferForForm.formFields.uploadPhotos
                                .length > 0
                                ? activeOfferForForm.formFields.uploadPhotos
                                : selectedGroup.sampleGoodNStayForm.uploadPhotos
                            ).length || 1}
                            )
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                          <DialogHeader>
                            <DialogTitle>{t.photosModalTitle}</DialogTitle>
                            <DialogDescription>
                              {t.photosModalDesc(
                                OTA_LABELS[selectedOtaForForm],
                                activeOfferForForm.formFields.roomName
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {(activeOfferForForm.formFields.uploadPhotos
                              .length > 0
                              ? activeOfferForForm.formFields.uploadPhotos
                              : selectedGroup.sampleGoodNStayForm.uploadPhotos
                            ).map((url, idx) => (
                              <div
                                key={idx}
                                className="rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50"
                              >
                                <img
                                  src={
                                    url.startsWith("//") ? `https:${url}` : url
                                  }
                                  alt={`Room photo ${idx + 1}`}
                                  className="w-full h-36 object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {activeOfferForForm.liveProof?.externalNativeId}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Room Name *
                      </label>
                      <Input
                        readOnly
                        value={activeOfferForForm.formFields.roomName}
                        className="h-8 text-xs font-medium bg-zinc-50/60"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Description *
                      </label>
                      <textarea
                        data-testid="textarea-description"
                        readOnly
                        rows={4}
                        value={formatLocalizedDescription(
                          activeOfferForForm,
                          locale
                        )}
                        className="w-full min-h-[84px] rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-xs leading-relaxed text-zinc-700 focus:outline-none resize-y"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Price per night *
                        </label>
                        <Input
                          readOnly
                          value={`₩ ${activeOfferForForm.formFields.pricePerNightKrw.toLocaleString("en-US")} (${formatCompactVnd(activeOfferForForm.formFields.pricePerNightVnd, locale)})`}
                          className="h-8 text-xs font-mono font-medium bg-zinc-50/60"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Maximum Guests *
                        </label>
                        <Input
                          readOnly
                          value={String(
                            activeOfferForForm.formFields.maximumGuests
                          )}
                          className="h-8 text-xs font-mono font-medium bg-zinc-50/60"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Amenity Types
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg border border-zinc-200 bg-zinc-50/40">
                        {(
                          [
                            "Minibar",
                            "Television",
                            "Free Wi-Fi",
                            "Air Conditioner",
                          ] as const
                        ).map((am) => {
                          const checked =
                            activeOfferForForm.formFields.amenityTypes.includes(
                              am
                            );
                          return (
                            <div
                              key={am}
                              className="flex items-center gap-2 text-xs text-zinc-800"
                            >
                              <span
                                className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                                  checked
                                    ? "bg-zinc-900 border-zinc-900 text-white"
                                    : "bg-white border-zinc-300"
                                }`}
                              >
                                {checked && <Check className="w-2.5 h-2.5" />}
                              </span>
                              <span>{am}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Room Type
                        </label>
                        <div className="h-8 px-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center text-xs font-semibold text-zinc-900 truncate">
                          {activeOfferForForm.formFields.roomType}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Bed Type
                        </label>
                        <div className="h-8 px-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center text-xs font-semibold text-zinc-900 truncate">
                          {activeOfferForForm.formFields.bedType}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Inventory *
                        </label>
                        <Input
                          readOnly
                          value={String(
                            activeOfferForForm.formFields.totalInventory
                          )}
                          className="h-8 text-xs font-mono bg-zinc-50/60"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: TAX BREAKDOWN & COMPACT JSON MAPPING CONTRACT */}
                  <TabsContent value="breakdown" className="pt-3 space-y-3">
                    <div className="rounded-xl border border-zinc-200/80 overflow-hidden">
                      <Table className="table-fixed w-full">
                        <TableHeader className="bg-zinc-50/80">
                          <TableRow>
                            <TableHead className="text-[10.5px] py-2 pl-2.5 pr-1.5 w-[31%]">
                              {t.taxColChannel}
                            </TableHead>
                            <TableHead className="text-[10.5px] text-right py-2 px-1.5 w-[23%]">
                              {t.taxColNet}
                            </TableHead>
                            <TableHead className="text-[10.5px] text-right py-2 px-1.5 w-[22%]">
                              {t.taxColTaxFee}
                            </TableHead>
                            <TableHead className="text-[10.5px] text-right py-2 pl-1.5 pr-2.5 w-[24%]">
                              Gross
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(
                            [
                              "GOODNSTAY",
                              "AGODA",
                              "BOOKING",
                              "EXPEDIA",
                              "TRIP",
                            ] as OtaCode[]
                          ).map((ota) => {
                            const off = selectedGroup.otaOffers[ota];
                            const isFailed = Boolean(
                              apiErrorState?.failedOtas.includes(ota)
                            );
                            if (!off || isFailed) {
                              return (
                                <TableRow key={ota}>
                                  <TableCell className="py-2 pl-2.5 pr-1.5 text-[11px] font-medium truncate">
                                    {OTA_SHORT_LABELS[ota]}
                                  </TableCell>
                                  <TableCell
                                    colSpan={3}
                                    className="py-2 pr-2.5 text-right"
                                  >
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-medium">
                                      {t.unscrapedCellBadge}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return (
                              <TableRow key={ota}>
                                <TableCell className="py-2 pl-2.5 pr-1.5 text-[11px] font-medium truncate">
                                  {OTA_SHORT_LABELS[ota]}
                                </TableCell>
                                <TableCell className="py-2 px-1.5 text-right font-mono text-[11px] text-zinc-500">
                                  {formatFullVnd(off.netPrice)}
                                </TableCell>
                                <TableCell className="py-2 px-1.5 text-right font-mono text-[11px] text-zinc-400">
                                  +{formatFullVnd(off.taxesAndFees)}
                                </TableCell>
                                <TableCell className="py-2 pl-1.5 pr-2.5 text-right font-mono text-[11px] font-semibold text-zinc-900">
                                  {formatFullVnd(off.grossPrice)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {(() => {
                      const activeContract =
                        selectedGroup.roomMappings?.[mappingOtaView] ||
                        selectedGroup.roomMappings?.BOOKING_COM ||
                        selectedGroup.roomMappings?.AGODA ||
                        null;
                      const jsonString = activeContract
                        ? JSON.stringify(activeContract, null, 2)
                        : "{}";
                      const apiHref = `/api/room-mappings?hotelKey=${encodeURIComponent(
                        selectedHotelKey
                      )}&checkIn=${encodeURIComponent(
                        selectedCheckIn
                      )}&gnsRoomId=${encodeURIComponent(
                        selectedGroup.gnsRoomId || "GNS-R201"
                      )}&ota=${encodeURIComponent(
                        activeContract?.ota || mappingOtaView
                      )}`;

                      return (
                        <div
                          data-testid="json-mapping-contract-panel"
                          className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/90 space-y-2 text-xs"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-900">
                                JSON Mapping
                              </span>
                              <span className="text-[10.5px] font-mono text-zinc-400">
                                gns-room-matcher-v1
                              </span>
                            </div>

                            <div className="grid grid-cols-6 gap-1 bg-white p-1 rounded-lg border border-zinc-200">
                              {(
                                [
                                  "BOOKING_COM",
                                  "AGODA",
                                  "EXPEDIA",
                                  "TRIP_COM",
                                  "HOTELS_COM",
                                  "GOOGLE_HOTELS",
                                ] as const
                              ).map((otaKey) => {
                                const hasMap = Boolean(
                                  selectedGroup.roomMappings?.[otaKey]
                                );
                                const active =
                                  (activeContract?.ota || mappingOtaView) ===
                                  otaKey;
                                return (
                                  <button
                                    key={otaKey}
                                    type="button"
                                    disabled={!hasMap}
                                    data-testid={`mapping-ota-${otaKey}`}
                                    title={otaKey}
                                    onClick={() => setMappingOtaView(otaKey)}
                                    className={`py-1 px-1 rounded text-[10px] font-medium truncate transition-all cursor-pointer disabled:opacity-40 ${
                                      active
                                        ? "bg-zinc-900 text-white font-semibold"
                                        : "text-zinc-600 hover:text-zinc-950"
                                    }`}
                                  >
                                    {MAPPING_OTA_SHORT_LABELS[otaKey]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {activeContract && (
                            <div className="relative">
                              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-t-lg bg-zinc-900 text-zinc-300 text-[10.5px] font-mono border-b border-zinc-800">
                                <span className="truncate min-w-0">
                                  {activeContract.gnsRoomId}_
                                  {activeContract.ota}.json
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    data-testid="btn-copy-json-mapping"
                                    onClick={() => {
                                      navigator.clipboard
                                        ?.writeText(jsonString)
                                        .catch(() => {});
                                      setCopiedJson(true);
                                      setTimeout(
                                        () => setCopiedJson(false),
                                        2000
                                      );
                                    }}
                                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white whitespace-nowrap cursor-pointer"
                                  >
                                    {copiedJson
                                      ? t.copiedJsonBtn
                                      : t.copyJsonBtn}
                                  </button>
                                  <a
                                    href={apiHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-testid="link-open-json-api"
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white whitespace-nowrap"
                                  >
                                    <span>API JSON</span>
                                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                  </a>
                                </div>
                              </div>
                              <pre
                                data-testid="json-mapping-code"
                                className="max-h-48 overflow-auto rounded-b-lg bg-zinc-950 text-emerald-300 p-2.5 text-[10.5px] leading-relaxed font-mono"
                              >
                                {jsonString}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* TAB 3: CLEAN 1-CLICK DEEP LINKS PER OTA (REMOVED SHA-256 & SCREENSHOTS) */}
                  <TabsContent value="proof" className="pt-3 space-y-2.5">
                    <div
                      data-testid="selected-room-proof-panel"
                      className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/90 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-950 truncate">
                          {t.directRoomLinksTitle(
                            selectedGroup.sampleGoodNStayForm.roomName
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {(
                          ["AGODA", "BOOKING", "EXPEDIA", "TRIP"] as OtaCode[]
                        ).map((ota) => {
                          const off = selectedGroup.otaOffers[ota];
                          const isFailed = Boolean(
                            apiErrorState?.failedOtas.includes(ota)
                          );
                          if (!off || isFailed) {
                            return (
                              <div
                                key={ota}
                                className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between gap-2"
                              >
                                <div className="font-semibold text-zinc-900">
                                  {OTA_SHORT_LABELS[ota]}
                                </div>
                                <span
                                  data-testid={`proof-unscraped-${ota}`}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-medium whitespace-nowrap shrink-0"
                                >
                                  {t.unscrapedCellBadge}
                                </span>
                              </div>
                            );
                          }
                          const fullId =
                            off.liveProof?.roomId ||
                            off.liveProof?.externalNativeId ||
                            "--";
                          const deepUrl =
                            off.liveProof?.deepLinkUrl ||
                            off.liveProof?.sourceUrl ||
                            "#";
                          const uiPrice =
                            off.liveProof?.uiDisplayedPriceVnd ??
                            (ota === "AGODA" || ota === "EXPEDIA" || ota === "TRIP"
                              ? off.netPrice
                              : off.grossPrice);
                          return (
                            <div
                              key={ota}
                              className="p-2.5 rounded-lg bg-white border border-zinc-200/80 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-zinc-900">
                                    {OTA_SHORT_LABELS[ota]}
                                  </span>
                                  <code className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700">
                                    #{fullId}
                                  </code>
                                </div>
                                <div className="text-[11px] font-mono text-zinc-600 truncate">
                                  <span className="font-bold text-emerald-700">
                                    {formatFullVnd(uiPrice)}
                                  </span>{" "}
                                  {ota === "BOOKING" ? (
                                    <span className="text-zinc-400">
                                      (Net: {formatFullVnd(off.netPrice)}
                                      {off.liveProof?.partnerOfferGrossPrice
                                        ? t.partnerOfferLabel(
                                            formatFullVnd(
                                              off.liveProof
                                                .partnerOfferGrossPrice
                                            )
                                          )
                                        : ""}
                                      )
                                    </span>
                                  ) : (
                                    <span className="text-zinc-400">
                                      (Gross: {formatFullVnd(off.grossPrice)})
                                    </span>
                                  )}
                                </div>
                              </div>

                              <a
                                href={deepUrl}
                                target="_blank"
                                rel="noreferrer"
                                data-testid={`inspector-deep-jump-${ota}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium whitespace-nowrap shrink-0"
                              >
                                <span>{t.openRoomBtn}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          );
                        })}
                      </div>

                      <div
                        data-testid="scraped-at-vietnam-time"
                        className="pt-1 text-[10.5px] text-zinc-400 font-mono flex items-center justify-between"
                      >
                        <span>
                          {t.updatedAtPrefix}
                          {formatVietnamDateTime(
                            proof?.scrapedAt,
                            proof?.scrapedAtVi,
                            locale
                          )}
                        </span>
                        {proof?.verifiedAtVi && (
                          <span
                            data-testid="verified-at-vietnam-time"
                            className="sr-only"
                          >
                            {proof.verifiedAtVi}
                          </span>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-zinc-400">
                {t.selectRoomFallback}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
