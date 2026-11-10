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

const OTA_LABELS: Record<OtaCode, string> = {
  GOODNSTAY: "Giá mốc chuẩn (BAR)",
  AGODA: "Agoda (Live)",
  BOOKING: "Booking.com (Live)",
  EXPEDIA: "Expedia (EPS)",
  TRIP: "Trip.com",
};

const OTA_SHORT_LABELS: Record<OtaCode, string> = {
  GOODNSTAY: "Giá chuẩn (BAR)",
  AGODA: "Agoda",
  BOOKING: "Booking.com",
  EXPEDIA: "Expedia",
  TRIP: "Trip.com",
};

const MAPPING_OTA_SHORT_LABELS: Record<MappingOtaKey, string> = {
  BOOKING_COM: "Booking",
  AGODA: "Agoda",
  EXPEDIA: "Expedia",
  TRIP_COM: "Trip.com",
  HOTELS_COM: "Hotels",
  GOOGLE_HOTELS: "Google",
};

const VIEW_LABELS: Record<string, string> = {
  CITY_VIEW: "City View",
  OCEAN_SEA_VIEW: "Ocean View",
  OCEAN_FRONT: "Beachfront",
  PARTIAL_SEA_VIEW: "Partial Sea View",
  POOL_VIEW: "Pool View",
  GARDEN_VIEW: "Garden View",
  NO_WINDOW: "No Window",
  STANDARD_VIEW: "Tiêu chuẩn",
};

const BED_SHORT_LABELS: Record<string, string> = {
  SINGLE_1_BED: "1 Giường đơn",
  TWIN_2_SINGLE: "2 Giường đơn (Twin)",
  DOUBLE_QUEEN_1_BED: "1 Giường đôi",
  KING_1_BED: "1 Giường King",
  FLEX_DOUBLE_OR_TWIN: "Đôi / 2 Đơn",
  MULTI_BED_TRIPLE: "Triple (3 khách)",
  MULTI_BED_QUAD_FAMILY: "Family (4 khách)",
};

function formatFullVnd(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("vi-VN")}đ`;
}

function formatCompactVnd(amount: number): string {
  const val = Math.round(amount || 0);
  if (val >= 1_000_000) {
    return `${(val / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}tr`;
  }
  return `${Math.round(val / 1_000)}k`;
}

/**
 * Định dạng thời gian sang chuẩn Giờ Việt Nam (GMT+7 / Asia/Ho_Chi_Minh)
 * Tránh hiển thị chuỗi UTC (...T05:18:09Z) lệch -7 tiếng so với đồng hồ máy người dùng
 */
function formatVietnamDateTime(
  isoOrStr?: string | null,
  preformattedVi?: string | null
): string {
  if (preformattedVi && preformattedVi.includes("GMT+7")) {
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
  return `${map.hour}:${map.minute}:${map.second} — ${map.day}/${map.month}/${map.year} (Giờ VN GMT+7)`;
}

export function App() {
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
    message: string;
    failedOtas: OtaCode[];
  } | null>(null);

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
      setApiErrorState({
        failed: true,
        message: "Lỗi kết nối API đối sánh giá — Sàn chưa cào giá",
        failedOtas: ["AGODA", "BOOKING", "EXPEDIA", "TRIP"],
      });
      showToast("Lỗi gọi API đối sánh giá — Trạng thái: Sàn chưa cào giá.");
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
        `Đã cào trực tiếp thành công ${fresh.hotelName} (Ngày ${fresh.checkIn}): Agoda ${fresh.liveScrapeProof?.agoda.masterRoomCount ?? 0} hạng phòng · Booking.com ${fresh.liveScrapeProof?.booking.uniqueRoomCount ?? 0} hạng phòng.`
      );
    } catch {
      setApiErrorState({
        failed: true,
        message: "Lỗi gọi API cào giá trực tiếp — Sàn chưa cào giá",
        failedOtas: ["AGODA", "BOOKING"],
      });
      showToast(
        "Không thể kết nối phiên cào trực tiếp — Trạng thái: Sàn chưa cào giá."
      );
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

  const summaryStats = useMemo(() => {
    if (report?.overallSummary) {
      return report.overallSummary;
    }
    const groups = report?.comparisonGroups ?? [];
    let bothLiveMatchedCount = 0;
    let agodaVsBookingDiffSum = 0;

    groups.forEach((g) => {
      const agoda = g.otaOffers.AGODA;
      const booking = g.otaOffers.BOOKING;
      if (agoda && booking) {
        bothLiveMatchedCount++;
        const pA =
          priceBasis === "NET" ? agoda.netPrice : agoda.grossPrice;
        const pB =
          priceBasis === "NET" ? booking.netPrice : booking.grossPrice;
        agodaVsBookingDiffSum += ((pA - pB) / pB) * 100;
      }
    });

    return {
      bothLiveMatchedCount,
      avgAgodaVsBookingPct: bothLiveMatchedCount
        ? Number((agodaVsBookingDiffSum / bothLiveMatchedCount).toFixed(2))
        : 0,
    };
  }, [report, priceBasis]);

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
                aria-label="Chọn khách sạn cào thực tế"
                value={selectedHotelKey}
                onChange={(e) => {
                  setSelectedHotelKey(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-medium text-xs text-zinc-900 pr-1 focus:outline-none cursor-pointer"
              >
                <option value="champton-nha-trang">
                  Champton Nha Trang Hotel (5 Sao)
                </option>
                <option value="libra-nha-trang">
                  Libra Hotel Nha Trang (4 Sao)
                </option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-zinc-50 border border-zinc-200/90 text-xs font-mono text-zinc-700 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                data-testid="select-checkin"
                aria-label="Chọn ngày Check-in để cào thật"
                value={selectedCheckIn}
                onChange={(e) => {
                  setSelectedCheckIn(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-mono text-xs text-zinc-800 pr-1 focus:outline-none cursor-pointer"
              >
                <option value="2026-11-20">Check-in: 20/11/2026 (1 đêm)</option>
                <option value="2026-11-25">Check-in: 25/11/2026 (1 đêm)</option>
                <option value="2026-12-05">Check-in: 05/12/2026 (1 đêm)</option>
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
                hasUnscrapedLiveOta
                  ? "Có sàn chưa cào được giá hoặc lỗi gọi API — Bấm để kiểm tra"
                  : "Bấm xem bằng chứng ảnh chụp màn hình và SHA-256"
              }
            >
              {hasUnscrapedLiveOta ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-medium">
                    Live {liveHealthyCount} Sàn · Sàn chưa cào giá
                  </span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
                  <span className="font-medium">
                    Live 2 Sàn: Agoda + Booking.com
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              data-testid="btn-toggle-theme"
              aria-label={
                theme === "dark"
                  ? "Chuyển sang giao diện Sáng (Light Mode)"
                  : "Chuyển sang giao diện Tối (Dark Mode)"
              }
              onClick={() =>
                setTheme((prev) => (prev === "dark" ? "light" : "dark"))
              }
              className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                theme === "dark"
                  ? "bg-zinc-900 text-amber-400 border-zinc-700 hover:bg-zinc-800"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
              }`}
              title={
                theme === "dark"
                  ? "Đang ở chế độ Tối (Dark Mode) — Bấm để chuyển sang Sáng"
                  : "Đang ở chế độ Sáng (Light Mode) — Bấm để chuyển sang Tối"
              }
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
              <span>Công thức</span>
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
              <span>
                {scraping
                  ? "Đang cào Agoda + Booking..."
                  : "Cào Trực Tiếp Ngay"}
              </span>
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
              Đóng
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
              <span className="font-semibold">Sàn chưa cào giá:</span>
              <span>{apiErrorState.message}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-retry-scrape"
                onClick={() => handleLiveScrape()}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-[11px] font-medium hover:bg-zinc-800 cursor-pointer"
              >
                Thử cào lại
              </button>
              <button
                type="button"
                data-testid="btn-dismiss-api-error"
                onClick={() => setApiErrorState(null)}
                className="text-amber-800 hover:text-amber-950 text-[11px] font-medium underline cursor-pointer"
              >
                Ẩn cảnh báo
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
                Công Thức Chuẩn Hóa &amp; Khớp Phòng Đa Sàn
              </span>
              <button
                type="button"
                onClick={() => setShowFormulas(false)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                Thu gọn <ChevronUp className="w-3.5 h-3.5" />
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
                <div className="text-zinc-500 text-[11px]">
                  Bóc trực tiếp mã phòng, giá trước thuế (Net) và sau thuế
                  (Gross).
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  2. Booking.com (DOM Block)
                </div>
                <div className="font-mono text-[11px] text-zinc-800">
                  #hprt-table tr[data-block-id]
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Trích xuất mã blockId và giá hiển thị thực tế theo đêm.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  3. Khóa Khớp Phòng (Match Key)
                </div>
                <div className="font-mono text-[11px] text-sky-700">
                  Tier + Bed + View + Area (m²)
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Ghép tự động cùng hạng phòng giữa các sàn OTA dù khác tên gọi.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* 3 CLEAN KPI CARDS (REMOVED SHA-256 / SCREENSHOT CARD)               */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Agoda
              </span>
              {isBusy ? (
                <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 animate-pulse">
                  Đang cào...
                </span>
              ) : agodaLiveOk ? (
                <span
                  data-testid="kpi-status-agoda"
                  className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0"
                >
                  LIVE
                </span>
              ) : (
                <span
                  data-testid="kpi-status-agoda"
                  className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0"
                >
                  Sàn chưa cào giá
                </span>
              )}
            </div>
            {isBusy ? (
              <div className="flex items-center gap-2 py-0.5">
                <span
                  data-testid="data-skeleton"
                  className="skeleton-shimmer h-7 w-14 rounded-md"
                />
                <span className="skeleton-shimmer h-4 w-24 rounded" />
              </div>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                    {agodaLiveOk ? (proof?.agoda.masterRoomCount ?? 0) : 0}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {agodaLiveOk ? "hạng phòng" : "Sàn chưa cào giá"}
                  </span>
                </div>
                {proof?.agoda.sourceUrl && (
                  <a
                    href={proof.agoda.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs text-zinc-600 hover:text-zinc-950 font-medium"
                  >
                    Mở Agoda <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Booking.com
              </span>
              {isBusy ? (
                <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 animate-pulse">
                  Đang cào...
                </span>
              ) : bookingLiveOk ? (
                <span
                  data-testid="kpi-status-booking"
                  className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0"
                >
                  LIVE
                </span>
              ) : (
                <span
                  data-testid="kpi-status-booking"
                  className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0"
                >
                  Sàn chưa cào giá
                </span>
              )}
            </div>
            {isBusy ? (
              <div className="flex items-center gap-2 py-0.5">
                <span
                  data-testid="data-skeleton"
                  className="skeleton-shimmer h-7 w-14 rounded-md"
                />
                <span className="skeleton-shimmer h-4 w-28 rounded" />
              </div>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                    {bookingLiveOk ? (proof?.booking.uniqueRoomCount ?? 0) : 0}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {bookingLiveOk ? "hạng phòng" : "Sàn chưa cào giá"}
                  </span>
                </div>
                {proof?.booking.sourceUrl && (
                  <a
                    href={proof.booking.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs text-zinc-600 hover:text-zinc-950 font-medium"
                  >
                    Mở Booking <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500">
                Chênh lệch Agoda vs. Booking
              </span>
              <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                {priceBasis}
              </span>
            </div>
            {isBusy ? (
              <div className="flex items-center gap-2 py-0.5">
                <span
                  data-testid="data-skeleton"
                  className="skeleton-shimmer h-7 w-24 rounded-md"
                />
                <span className="skeleton-shimmer h-4 w-28 rounded" />
              </div>
            ) : (
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
                  {summaryStats.avgAgodaVsBookingPct >= 0
                    ? `+${summaryStats.avgAgodaVsBookingPct}%`
                    : `${summaryStats.avgAgodaVsBookingPct}%`}
                </span>
                <span className="text-xs text-zinc-400">
                  {summaryStats.bothLiveMatchedCount} cặp phòng khớp
                </span>
              </div>
            )}
          </div>
        </section>

        {/* =================================================================== */}
        {/* MAIN WORKSPACE: 12-COLUMN SPLIT                                     */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 8 COLS: UNIFIED MULTI-OTA RATE COMPARISON MATRIX */}
          <div className="lg:col-span-8 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Ma trận Đối sánh Giá Thực Tế ({report?.hotelName} ·{" "}
                {report?.checkIn})
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
                  UI Web
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
                  Sau thuế (Gross)
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
                  Trước thuế (Net)
                </button>
              </div>
            </div>

            {/* Compact Multi-Dimensional Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100">
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/70 shrink-0">
                {(
                  [
                    { key: "ALL", label: "Tất cả phòng" },
                    { key: "SINGLE_BED_ONLY", label: "Phòng 1 Giường" },
                    { key: "MULTI_BED_ONLY", label: "Phòng Nhiều Giường" },
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
                      className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 mr-0.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  Lọc:
                </span>

                <select
                  data-testid="filter-room-type"
                  aria-label="Lọc theo Room Type"
                  value={roomType}
                  onChange={(e) => {
                    setRoomType(e.target.value);
                    setPage(1);
                  }}
                  className={getSelectClass(roomType !== "ALL")}
                >
                  <option value="ALL">Hạng: Tất cả</option>
                  <option value="Standard">Hạng: Standard</option>
                  <option value="Superior">Hạng: Superior</option>
                  <option value="Deluxe">Hạng: Deluxe</option>
                  <option value="Executive">Hạng: Executive</option>
                  <option value="Suite">Hạng: Suite</option>
                </select>

                <select
                  data-testid="filter-bed-category"
                  aria-label="Lọc theo Cấu hình Giường"
                  value={detailedBedCategory}
                  onChange={(e) => {
                    setDetailedBedCategory(e.target.value);
                    setPage(1);
                  }}
                  className={getSelectClass(detailedBedCategory !== "ALL")}
                >
                  <option value="ALL">Giường: Tất cả</option>
                  <option value="SINGLE_1_BED">Single (1 Đơn)</option>
                  <option value="TWIN_2_SINGLE">Twin (2 Đơn)</option>
                  <option value="DOUBLE_QUEEN_1_BED">Double / Queen</option>
                  <option value="KING_1_BED">King</option>
                  <option value="FLEX_DOUBLE_OR_TWIN">Đôi / 2 Đơn</option>
                  <option value="MULTI_BED_TRIPLE">Triple (3 khách)</option>
                  <option value="MULTI_BED_QUAD_FAMILY">Family (4+ khách)</option>
                </select>

                <select
                  data-testid="filter-view-category"
                  aria-label="Lọc theo Hướng nhìn"
                  value={viewCategory}
                  onChange={(e) => {
                    setViewCategory(e.target.value);
                    setPage(1);
                  }}
                  className={getSelectClass(viewCategory !== "ALL")}
                >
                  <option value="ALL">View: Tất cả</option>
                  <option value="CITY_VIEW">View: City View</option>
                  <option value="PARTIAL_SEA_VIEW">View: Partial Sea View</option>
                  <option value="OCEAN_SEA_VIEW">View: Ocean View</option>
                  <option value="NO_WINDOW">View: No Window</option>
                </select>

                <select
                  data-testid="filter-area-range"
                  aria-label="Lọc theo Diện tích"
                  value={areaRange}
                  onChange={(e) => {
                    setAreaRange(e.target.value);
                    setPage(1);
                  }}
                  className={getSelectClass(areaRange !== "ALL")}
                >
                  <option value="ALL">Diện tích: Tất cả</option>
                  <option value="UNDER_25">Diện tích: &lt; 25m²</option>
                  <option value="FROM_25_TO_35">Diện tích: 25m² – 35m²</option>
                  <option value="FROM_36_TO_50">Diện tích: 36m² – 50m²</option>
                  <option value="OVER_50">Diện tích: &gt; 50m²</option>
                </select>

                {hasActiveFilter && (
                  <button
                    type="button"
                    data-testid="btn-reset-filters"
                    onClick={handleResetFilters}
                    className="h-7 px-2 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
            </div>

            {/* Clean Master Comparison Table */}
            {!isBusy && (!report || report.comparisonGroups.length === 0) ? (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                <div>Không có hạng phòng nào khớp với bộ lọc hiện tại.</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  Xóa bộ lọc
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
                          ? "Đang cào giá trực tiếp từ Agoda & Booking.com..."
                          : "Đang tải dữ liệu..."}
                      </span>
                    </div>
                  </div>
                )}

                <div
                  data-testid="comparison-table-wrapper"
                  className="rounded-xl border border-zinc-200/80 overflow-x-auto"
                >
                  <Table>
                    <TableHeader className="bg-zinc-50/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-zinc-500 py-2.5 pl-3 pr-2 w-[28%]">
                          Hạng phòng
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[14%]">
                          Giá chuẩn
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[14.5%]">
                          Agoda
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[14.5%]">
                          Booking.com
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-1.5 w-[14.5%]">
                          Expedia
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 pl-1.5 pr-3 w-[14.5%]">
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
                              <TableCell className="py-3 pl-3 pr-2 align-top whitespace-normal">
                                <div className="flex items-center gap-2">
                                  <span className="skeleton-shimmer h-4 w-12 rounded" />
                                  <span
                                    data-testid="room-name-skeleton"
                                    className="skeleton-shimmer h-4 w-36 rounded-md"
                                  />
                                </div>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <span className="skeleton-shimmer h-3.5 w-10 rounded" />
                                  <span className="skeleton-shimmer h-3.5 w-16 rounded" />
                                  <span className="skeleton-shimmer h-3.5 w-24 rounded" />
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
                                  className={`py-3 text-right align-top ${
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
                                      Sàn chưa cào giá
                                    </span>
                                  </div>
                                );
                              }
                              const isPositive = m.diffVsRefPct > 0.05;
                              const isNegative = m.diffVsRefPct < -0.05;
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
                                  ? `Gross ${formatCompactVnd(off.grossPrice)}`
                                  : `Net ${formatCompactVnd(off.netPrice)}`;

                              return (
                                <div className="flex flex-col items-end gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span
                                      data-testid={`price-value-${ota}`}
                                      className="font-mono text-xs font-semibold text-zinc-900"
                                    >
                                      {formatFullVnd(m.price)}
                                    </span>
                                    {ota !== "GOODNSTAY" && (
                                      <span
                                        className={`inline-flex items-center px-1 py-0.2 rounded text-[9.5px] font-mono font-medium ${
                                          isNegative
                                            ? "bg-rose-50 text-rose-700"
                                            : isPositive
                                              ? "bg-emerald-50 text-emerald-700"
                                              : "bg-zinc-100 text-zinc-600"
                                        }`}
                                      >
                                        {isPositive
                                          ? `+${m.diffVsRefPct}%`
                                          : `${m.diffVsRefPct}%`}
                                      </span>
                                    )}
                                  </div>
                                  {ota !== "GOODNSTAY" && (
                                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                                      <span data-testid={`ui-web-price-${ota}`}>
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
                                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-zinc-100 hover:bg-emerald-50 text-zinc-600 hover:text-emerald-800 text-[9.5px] font-mono transition-colors"
                                        title={`Mở phòng "${off.roomName}" (#${fullRoomId}) trên ${OTA_LABELS[ota]}`}
                                      >
                                        <span>#{fullRoomId}</span>
                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                      </a>
                                    </div>
                                  )}
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
                                <TableCell className="py-2.5 pl-3 pr-2 align-top whitespace-normal">
                                  <div className="flex flex-wrap items-center gap-1">
                                    <span className="px-1.5 py-0.2 rounded bg-zinc-900 text-white text-[10px] font-mono font-semibold">
                                      #{grp.matchRank ?? 1}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded bg-zinc-200/70 text-zinc-800 text-[10px] font-semibold">
                                      {grp.roomType}
                                    </span>
                                    {hasRowUnscraped && (
                                      <span
                                        data-testid="row-live-ota-badge"
                                        className="px-1.5 py-0.2 rounded border bg-amber-50 text-amber-800 border-amber-200/80 text-[10px] font-mono font-medium"
                                      >
                                        Live {activeOtaCount}/4 · Sàn chưa cào giá
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-semibold text-xs text-zinc-950 mt-1">
                                    {grp.sampleGoodNStayForm.roomName}
                                  </div>
                                  <div className="text-[11px] text-zinc-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                    <span>{grp.areaSqm ?? "--"}m²</span>
                                    <span className="text-zinc-300">·</span>
                                    <span>
                                      {VIEW_LABELS[grp.viewCategory] ??
                                        grp.viewCategory}
                                    </span>
                                    <span className="text-zinc-300">·</span>
                                    <span className="text-zinc-700 font-medium">
                                      {BED_SHORT_LABELS[
                                        grp.detailedBedCategory
                                      ] ?? grp.goodNStayBedType}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-2.5 px-1.5 text-right align-top">
                                  {renderOtaCell("GOODNSTAY")}
                                </TableCell>
                                <TableCell className="py-2.5 px-1.5 text-right align-top">
                                  {renderOtaCell("AGODA")}
                                </TableCell>
                                <TableCell className="py-2.5 px-1.5 text-right align-top">
                                  {renderOtaCell("BOOKING")}
                                </TableCell>
                                <TableCell className="py-2.5 px-1.5 text-right align-top">
                                  {renderOtaCell("EXPEDIA")}
                                </TableCell>
                                <TableCell className="py-2.5 pl-1.5 pr-3 text-right align-top">
                                  {renderOtaCell("TRIP")}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                    </TableBody>
                  </Table>
                </div>

                {/* TOP-5 LAZY PAGINATION BAR */}
                {report?.pagination && (
                  <div
                    data-testid="pagination-bar"
                    className="flex flex-wrap items-center justify-between gap-2 pt-2 px-1"
                  >
                    <div className="text-xs text-zinc-500">
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
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        data-testid="btn-prev-page"
                        disabled={
                          isBusy || (report.pagination.page || 1) <= 1
                        }
                        onClick={() =>
                          setPage((p) => Math.max(1, p - 1))
                        }
                        className="h-7 px-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 disabled:opacity-40 cursor-pointer"
                      >
                        ← Trước
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
                        Tiếp →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT 4 COLS: INSPECTOR, 8-FIELD FORM & LIVE PROOF */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4 lg:sticky lg:top-20">
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
                      Biên độ chênh lệch
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
                        Price per night (KRW / VND) *
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
                      Amenity Types (4 tùy chọn chuẩn)
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/40">
                      <span className="skeleton-shimmer h-4 w-24 rounded" />
                      <span className="skeleton-shimmer h-4 w-24 rounded" />
                      <span className="skeleton-shimmer h-4 w-24 rounded" />
                      <span className="skeleton-shimmer h-4 w-28 rounded" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Room Type (Dropdown 6 mục)
                      </label>
                      <div className="h-8 px-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center">
                        <span className="skeleton-shimmer h-4 w-20 rounded" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Bed Type (Dropdown 4 mục)
                      </label>
                      <div className="h-8 px-2.5 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center">
                        <span className="skeleton-shimmer h-4 w-24 rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 items-end pt-1 border-t border-zinc-100">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-500">
                        Total Inventory *
                      </label>
                      <div className="h-8 px-3 rounded-md border border-zinc-200 bg-zinc-50/60 flex items-center">
                        <span className="skeleton-shimmer h-4 w-8 rounded" />
                      </div>
                    </div>
                    <span className="skeleton-shimmer h-4 w-36 rounded mb-1.5" />
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
                      Chênh lệch
                    </div>
                    <div className="text-sm font-bold font-mono text-zinc-900">
                      {selectedGroup.spreadAnalysis.marketSpreadPct}%
                    </div>
                  </div>
                </div>

                {/* OTA Source Switcher */}
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
                        disabled={!hasOffer}
                        onClick={() => setSelectedOtaForForm(ota)}
                        title={
                          hasOffer
                            ? `Xem dữ liệu ${OTA_LABELS[ota]}`
                            : `${OTA_LABELS[ota]}: Sàn chưa cào giá`
                        }
                        className={`py-1.5 px-1.5 rounded-lg text-[11px] font-medium truncate transition-all cursor-pointer disabled:opacity-40 ${
                          active
                            ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                            : "text-zinc-500 hover:text-zinc-900"
                        }`}
                      >
                        {OTA_LABELS[ota]}
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
                      Form 8 Trường
                    </TabsTrigger>
                    <TabsTrigger value="breakdown" className="text-xs">
                      Thuế &amp; Khớp phòng
                    </TabsTrigger>
                    <TabsTrigger value="proof" className="text-xs">
                      Bằng chứng Live
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
                            <DialogTitle>
                              UPLOAD PHOTOS — Danh sách ảnh phòng trích xuất tự
                              động
                            </DialogTitle>
                            <DialogDescription>
                              Ảnh phòng từ {OTA_LABELS[selectedOtaForForm]} cho{" "}
                              {activeOfferForForm.formFields.roomName}
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
                        value={activeOfferForForm.formFields.description}
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
                          value={`₩ ${activeOfferForForm.formFields.pricePerNightKrw.toLocaleString("en-US")} (${formatCompactVnd(activeOfferForForm.formFields.pricePerNightVnd)})`}
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
                      <Table>
                        <TableHeader className="bg-zinc-50/80">
                          <TableRow>
                            <TableHead className="text-[10.5px] py-2 px-2.5">
                              Sàn
                            </TableHead>
                            <TableHead className="text-[10.5px] text-right py-2 px-2">
                              Giá Net
                            </TableHead>
                            <TableHead className="text-[10.5px] text-right py-2 px-2">
                              Thuế &amp; Phí
                            </TableHead>
                            <TableHead className="text-[10.5px] text-right py-2 px-2.5">
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
                                  <TableCell className="py-2 px-2.5 text-xs font-medium">
                                    {OTA_LABELS[ota]}
                                  </TableCell>
                                  <TableCell
                                    colSpan={3}
                                    className="py-2 px-2.5 text-right"
                                  >
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80 text-[10px] font-medium">
                                      Sàn chưa cào giá
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            return (
                              <TableRow key={ota}>
                                <TableCell className="py-2 px-2.5 text-xs font-medium">
                                  <div>{OTA_LABELS[ota]}</div>
                                </TableCell>
                                <TableCell className="py-2 px-2 text-right font-mono text-xs text-zinc-500">
                                  {formatFullVnd(off.netPrice)}
                                </TableCell>
                                <TableCell className="py-2 px-2 text-right font-mono text-xs text-zinc-400">
                                  +{formatFullVnd(off.taxesAndFees)}
                                </TableCell>
                                <TableCell className="py-2 px-2.5 text-right font-mono text-xs font-semibold text-zinc-900">
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
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="font-semibold text-zinc-900">
                              JSON Mapping
                            </span>

                            <div className="flex flex-wrap items-center gap-1 bg-white p-0.5 rounded-lg border border-zinc-200">
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
                                    onClick={() => setMappingOtaView(otaKey)}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-all cursor-pointer disabled:opacity-40 ${
                                      active
                                        ? "bg-zinc-900 text-white"
                                        : "text-zinc-600 hover:text-zinc-950"
                                    }`}
                                  >
                                    {otaKey}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {activeContract && (
                            <div className="relative">
                              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-t-lg bg-zinc-900 text-zinc-300 text-[10.5px] font-mono border-b border-zinc-800">
                                <span>
                                  {activeContract.gnsRoomId}_
                                  {activeContract.ota}.json
                                </span>
                                <div className="flex items-center gap-2">
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
                                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer"
                                  >
                                    {copiedJson
                                      ? "Đã sao chép"
                                      : "Sao chép JSON"}
                                  </button>
                                  <a
                                    href={apiHref}
                                    target="_blank"
                                    rel="noreferrer"
                                    data-testid="link-open-json-api"
                                    className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white"
                                  >
                                    <span>API JSON</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
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
                          Link phòng trực tiếp ({selectedGroup.sampleGoodNStayForm.roomName})
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
                                  {OTA_LABELS[ota]}
                                </div>
                                <span
                                  data-testid={`proof-unscraped-${ota}`}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-medium whitespace-nowrap shrink-0"
                                >
                                  Sàn chưa cào giá
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
                                    {OTA_LABELS[ota]}
                                  </span>
                                  <code className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-700">
                                    #{fullId}
                                  </code>
                                </div>
                                <div className="text-[11px] font-mono text-zinc-600 truncate">
                                  <span className="font-bold text-emerald-700">
                                    {formatFullVnd(uiPrice)}
                                  </span>{" "}
                                  <span className="text-zinc-400">
                                    (Gross: {formatFullVnd(off.grossPrice)})
                                  </span>
                                </div>
                              </div>

                              <a
                                href={deepUrl}
                                target="_blank"
                                rel="noreferrer"
                                data-testid={`inspector-deep-jump-${ota}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-medium whitespace-nowrap shrink-0"
                              >
                                <span>Mở phòng</span>
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
                          Cập nhật:{" "}
                          {formatVietnamDateTime(
                            proof?.scrapedAt,
                            proof?.scrapedAtVi
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
                Chọn một hạng phòng bên trái để xem chi tiết.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
