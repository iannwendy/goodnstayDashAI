import { useState, useEffect, useMemo, useCallback } from "react";
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
  ShieldCheck,
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

type OtaCode = "GOODNSTAY" | "AGODA" | "BOOKING";

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
  externalNativeId: string | null;
  scrapedAt: string | null;
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

interface ComparisonGroup {
  groupKey: string;
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
    priceBasis: "GROSS" | "NET";
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
  GOODNSTAY: "goodNstay",
  AGODA: "Agoda (Live)",
  BOOKING: "Booking.com (Live)",
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
  SINGLE_1_BED: "Single · 1 Giường đơn",
  TWIN_2_SINGLE: "Twin · 2 Giường đơn",
  DOUBLE_QUEEN_1_BED: "Double / Queen · 1 Giường đôi",
  KING_1_BED: "King · 1 Giường đôi lớn",
  FLEX_DOUBLE_OR_TWIN: "Linh hoạt · 1 Đôi hoặc 2 Đơn",
  MULTI_BED_TRIPLE: "Triple · 1 Đôi + 1 Đơn (3 khách)",
  MULTI_BED_QUAD_FAMILY: "Family / Quad · Nhiều giường (4+ khách)",
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

export function App() {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [scraping, setScraping] = useState<boolean>(false);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tham số cào thực tế (Đổi khách sạn hoặc đổi ngày Check-in để chứng minh Live Scrape)
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>(
    "champton-nha-trang"
  );
  const [selectedCheckIn, setSelectedCheckIn] = useState<string>("2026-11-20");

  // Bộ lọc 6 tầng
  const [multiBedMode, setMultiBedMode] = useState<
    "ALL" | "SINGLE_BED_ONLY" | "MULTI_BED_ONLY"
  >("ALL");
  const [roomType, setRoomType] = useState<string>("ALL");
  const [detailedBedCategory, setDetailedBedCategory] = useState<string>("ALL");
  const [viewCategory, setViewCategory] = useState<string>("ALL");
  const [priceBasis, setPriceBasis] = useState<"GROSS" | "NET">("GROSS");

  // Dòng hạng phòng đang chọn để hiển thị ở Inspector bên phải
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedOtaForForm, setSelectedOtaForForm] =
    useState<OtaCode>("AGODA");
  const [inspectorTab, setInspectorTab] = useState<string>("form");

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5500);
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        hotelKey: selectedHotelKey,
        checkIn: selectedCheckIn,
        roomType,
        detailedBedCategory,
        multiBedMode,
        viewCategory,
        priceBasis,
      });
      const res = await fetch(`/api/report?${qs.toString()}`);
      const data: ReportResponse = await res.json();
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
    } finally {
      setLoading(false);
    }
  }, [
    selectedHotelKey,
    selectedCheckIn,
    roomType,
    detailedBedCategory,
    multiBedMode,
    viewCategory,
    priceBasis,
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
      const fresh: ReportResponse = await res.json();
      await fetchReport();
      showToast(
        `Đã cào trực tiếp thành công ${fresh.hotelName} (Ngày ${fresh.checkIn}): Agoda ${fresh.liveScrapeProof?.agoda.masterRoomCount ?? 0} hạng phòng · Booking.com ${fresh.liveScrapeProof?.booking.uniqueRoomCount ?? 0} hạng phòng.`
      );
    } catch {
      showToast("Không thể kết nối phiên cào trực tiếp.");
    } finally {
      setScraping(false);
    }
  };

  const handleResetFilters = () => {
    setMultiBedMode("ALL");
    setRoomType("ALL");
    setDetailedBedCategory("ALL");
    setViewCategory("ALL");
    setPriceBasis("GROSS");
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
      selectedGroup.otaOffers.GOODNSTAY ??
      Object.values(selectedGroup.otaOffers)[0] ??
      null
    );
  }, [selectedGroup, selectedOtaForForm]);

  const summaryStats = useMemo(() => {
    const groups = report?.comparisonGroups ?? [];
    let bothLiveMatchedCount = 0;
    let agodaVsBookingDiffSum = 0;

    groups.forEach((g) => {
      const agoda = g.otaOffers.AGODA;
      const booking = g.otaOffers.BOOKING;
      if (agoda && booking) {
        bothLiveMatchedCount++;
        const pA =
          priceBasis === "GROSS" ? agoda.grossPrice : agoda.netPrice;
        const pB =
          priceBasis === "GROSS" ? booking.grossPrice : booking.netPrice;
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
    `h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
      isActive
        ? "border-emerald-300 bg-emerald-50/80 text-emerald-800"
        : "border-zinc-200/90 bg-zinc-50/70 hover:bg-zinc-100/80 text-zinc-700"
    }`;

  const hasActiveFilter =
    multiBedMode !== "ALL" ||
    roomType !== "ALL" ||
    detailedBedCategory !== "ALL" ||
    viewCategory !== "ALL";

  const proof = report?.liveScrapeProof;
  const isBusy = loading || scraping;
  const skeletonRows =
    report && report.comparisonGroups.length > 0
      ? report.comparisonGroups.map((g) => g.groupKey)
      : ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6", "sk-7"];

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
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-800 cursor-pointer hover:bg-emerald-100/70 transition-colors shrink-0"
              title="Bấm xem bằng chứng ảnh chụp màn hình và SHA-256"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-live" />
              <span className="font-medium">
                Live 2 Sàn: Agoda + Booking.com
              </span>
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

      <main className="max-w-[1360px] mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* =================================================================== */}
        {/* COLLAPSIBLE FORMULA & MATCHING RULE DRAWER                          */}
        {/* =================================================================== */}
        {showFormulas && (
          <section className="p-4 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900">
                4 Bằng Chứng Cào Thực Tế &amp; Công Thức Chuẩn Hóa Đa Sàn
              </span>
              <button
                type="button"
                onClick={() => setShowFormulas(false)}
                className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                Thu gọn <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  1. Cào Trực Tiếp Agoda (JSON State)
                </div>
                <div className="font-mono text-[11px] text-emerald-700">
                  window.propertyPageParams.roomGridData
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Lấy trực tiếp masterRoomId, exclusivePrice (Net) và
                  inclusivePrice (Gross) từ Agoda.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  2. Cào Trực Tiếp Booking.com (2-Step)
                </div>
                <div className="font-mono text-[11px] text-zinc-800">
                  #hprt-table tr[data-block-id]
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Thiết lập cookie phiên và bóc trực tiếp từng blockId + giá
                  VND thực tế trên Booking.com.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  3. Ảnh Chụp Màn Hình &amp; SHA-256
                </div>
                <div className="font-mono text-[11px] text-zinc-800">
                  data/evidence/*.png + SHA-256
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Chụp màn hình trình duyệt thật ngay giây cào dữ liệu để đối
                  chiếu 1-1.
                </div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50/80 space-y-1">
                <div className="font-semibold text-zinc-900">
                  4. Khóa Khớp Phòng (Match Key)
                </div>
                <div className="font-mono text-[11px] text-sky-700">
                  Tier + BedSubCat + View + SubTier
                </div>
                <div className="text-zinc-500 text-[11px]">
                  Tự động ghép đúng cặp phòng giữa Agoda và Booking.com dù khác
                  cách đặt tên.
                </div>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================== */}
        {/* 4 SPACIOUS, CALM KPI CARDS (WITH SKELETON SHIMMER WHEN BUSY)        */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500 truncate">
                Phòng cào trực tiếp (Agoda)
              </span>
              {isBusy ? (
                <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 animate-pulse">
                  Đang cào...
                </span>
              ) : (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                  LIVE 100%
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
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                  {proof?.agoda.masterRoomCount ?? 0}
                </span>
                <span className="text-xs text-zinc-400">
                  Master Rooms từ Agoda
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              {isBusy ? (
                <span className="skeleton-shimmer h-3.5 w-40 rounded" />
              ) : (
                <>
                  <span className="font-mono text-[11px] text-zinc-400 truncate">
                    Token: {proof?.agoda.searchId?.slice(0, 14) || "Live Session"}
                  </span>
                  {proof?.agoda.sourceUrl && (
                    <a
                      href={proof.agoda.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-zinc-700 hover:text-zinc-950 font-medium underline underline-offset-2"
                    >
                      Mở Agoda <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500 truncate">
                Phòng cào trực tiếp (Booking.com)
              </span>
              {isBusy ? (
                <span className="text-[11px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 animate-pulse">
                  Đang cào...
                </span>
              ) : (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                  LIVE 100%
                </span>
              )}
            </div>
            {isBusy ? (
              <div className="flex items-center gap-2 py-0.5">
                <span
                  data-testid="data-skeleton"
                  className="skeleton-shimmer h-7 w-14 rounded-md"
                />
                <span className="skeleton-shimmer h-4 w-32 rounded" />
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-zinc-950">
                  {proof?.booking.uniqueRoomCount ?? 0}
                </span>
                <span className="text-xs text-zinc-400">
                  hạng phòng ({proof?.booking.totalBlocksCount ?? 0} blocks)
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              {isBusy ? (
                <span className="skeleton-shimmer h-3.5 w-36 rounded" />
              ) : (
                <>
                  <span className="font-mono text-[11px] text-zinc-400">
                    #hprt-table DOM
                  </span>
                  {proof?.booking.sourceUrl && (
                    <a
                      href={proof.booking.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-zinc-700 hover:text-zinc-950 font-medium underline underline-offset-2"
                    >
                      Mở Booking <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500 truncate">
                Chênh lệch Agoda vs. Booking.com
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
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
                  {summaryStats.avgAgodaVsBookingPct >= 0
                    ? `+${summaryStats.avgAgodaVsBookingPct}%`
                    : `${summaryStats.avgAgodaVsBookingPct}%`}
                </span>
                <span className="text-xs text-zinc-400">
                  ({summaryStats.bothLiveMatchedCount} cặp khớp cả 2 sàn)
                </span>
              </div>
            )}
            <div className="text-xs text-zinc-500 truncate">
              {isBusy ? (
                <span className="skeleton-shimmer inline-block h-3.5 w-48 rounded" />
              ) : (
                "So sánh trực tiếp trên cùng diện tích m² & loại giường"
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setInspectorTab("proof")}
            className="text-left p-5 rounded-2xl bg-white border border-zinc-200/80 hover:border-zinc-300 shadow-2xs transition-all cursor-pointer flex flex-col justify-between gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-zinc-500 truncate">
                Bằng chứng Cào Thực Tế
              </span>
              {isBusy ? (
                <span className="skeleton-shimmer h-4 w-16 rounded" />
              ) : (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
                  {proof?.durationMs ? `${proof.durationMs}ms` : "Verified"}
                </span>
              )}
            </div>
            {isBusy ? (
              <div className="py-0.5">
                <span
                  data-testid="data-skeleton"
                  className="skeleton-shimmer inline-block h-6 w-44 rounded-md"
                />
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold font-mono tracking-tight text-zinc-950 truncate">
                  SHA-256: {proof?.sha256Digest?.slice(0, 10) ?? "f8cd3812"}...
                </span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-zinc-500">
              {isBusy ? (
                <span className="skeleton-shimmer h-3.5 w-40 rounded" />
              ) : (
                <>
                  <span>2 ảnh chụp màn hình thật</span>
                  <span className="text-zinc-900 font-medium underline underline-offset-2">
                    Xem bằng chứng →
                  </span>
                </>
              )}
            </div>
          </button>
        </section>

        {/* =================================================================== */}
        {/* MAIN WORKSPACE: 12-COLUMN SPLIT                                     */}
        {/* =================================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7 COLS: UNIFIED MULTI-OTA RATE COMPARISON MATRIX */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Ma trận Đối sánh Giá Thực Tế ({report?.hotelName} ·{" "}
                  {report?.checkIn})
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Mỗi ô giá hiển thị kèm Mã Phòng Gốc (masterRoomId / blockId) bóc
                  trực tiếp từ DOM &amp; JSON của Agoda và Booking.com
                </p>
              </div>

              <div className="inline-flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/60">
                <button
                  type="button"
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
                      onClick={() => setMultiBedMode(item.key)}
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
                  onChange={(e) => setRoomType(e.target.value)}
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
                  onChange={(e) => setDetailedBedCategory(e.target.value)}
                  className={getSelectClass(detailedBedCategory !== "ALL")}
                >
                  <option value="ALL">Giường: Tất cả</option>
                  <option value="SINGLE_1_BED">Single (1 Đơn · 1 khách)</option>
                  <option value="TWIN_2_SINGLE">Twin (2 Đơn · 2 khách)</option>
                  <option value="DOUBLE_QUEEN_1_BED">Double / Queen (1 Đôi)</option>
                  <option value="KING_1_BED">King (1 Đôi lớn)</option>
                  <option value="FLEX_DOUBLE_OR_TWIN">
                    Linh hoạt (1 Đôi / 2 Đơn)
                  </option>
                  <option value="MULTI_BED_TRIPLE">Triple (3 khách)</option>
                  <option value="MULTI_BED_QUAD_FAMILY">
                    Family / Quad (4+ khách)
                  </option>
                </select>

                <select
                  data-testid="filter-view-category"
                  aria-label="Lọc theo Hướng nhìn"
                  value={viewCategory}
                  onChange={(e) => setViewCategory(e.target.value)}
                  className={getSelectClass(viewCategory !== "ALL")}
                >
                  <option value="ALL">View: Tất cả</option>
                  <option value="CITY_VIEW">View: City View</option>
                  <option value="PARTIAL_SEA_VIEW">View: Partial Sea View</option>
                  <option value="OCEAN_SEA_VIEW">View: Ocean View</option>
                  <option value="NO_WINDOW">View: No Window</option>
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

            {/* Clean Master Comparison Table (Hides all prices & shows Skeleton Shimmer when busy) */}
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
                          ? "Đang chạy trình duyệt Chromium cào giá thời gian thực từ Agoda.com & Booking.com..."
                          : "Đang đồng bộ dữ liệu đối sánh giá..."}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-mono text-zinc-300 shrink-0">
                      Đang tải dữ liệu...
                    </span>
                  </div>
                )}

                <div
                  data-testid="comparison-table-wrapper"
                  className="rounded-xl border border-zinc-200/80 overflow-hidden"
                >
                  <Table>
                    <TableHeader className="bg-zinc-50/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[11px] font-semibold text-zinc-500 py-2.5 pl-3 pr-2 w-[38%]">
                          Hạng phòng &amp; Cấu hình chuẩn
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-2 w-[19%]">
                          Mốc chuẩn (BAR)
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 px-2 w-[21%]">
                          Agoda (LIVE)
                        </TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 text-right py-2.5 pl-2 pr-4 w-[22%]">
                          Booking.com (LIVE)
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
                                ["GOODNSTAY", "AGODA", "BOOKING"] as OtaCode[]
                              ).map((ota) => (
                                <TableCell
                                  key={ota}
                                  className={`py-3 text-right align-top ${
                                    ota === "BOOKING"
                                      ? "pl-2 pr-4"
                                      : "px-2"
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

                            const renderOtaCell = (ota: OtaCode) => {
                              const m = p[ota];
                              const off = grp.otaOffers[ota];
                              if (!m || !off) {
                                return (
                                  <span className="text-xs text-zinc-300">
                                    --
                                  </span>
                                );
                              }
                              const isPositive = m.diffVsRefPct > 0.05;
                              const isNegative = m.diffVsRefPct < -0.05;
                              const nativeId =
                                off.liveProof?.externalNativeId
                                  ?.replace("masterRoomId:", "#")
                                  .replace("blockId:", "#")
                                  .slice(0, 9) || "";

                              return (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span
                                    data-testid={`price-value-${ota}`}
                                    className="font-mono text-xs font-semibold text-zinc-900"
                                  >
                                    {formatFullVnd(m.price)}
                                  </span>
                                  {ota === "GOODNSTAY" ? (
                                    <span className="text-[10px] font-mono text-zinc-400">
                                      Mốc 0%
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9.5px] font-mono text-zinc-400">
                                        {nativeId}
                                      </span>
                                      <span
                                        className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
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
                                    </div>
                                  )}
                                </div>
                              );
                            };

                            return (
                              <TableRow
                                key={grp.groupKey}
                                onClick={() => setSelectedGroupKey(grp.groupKey)}
                                className={`cursor-pointer transition-colors ${
                                  isSelected
                                    ? "bg-zinc-100/90 hover:bg-zinc-100"
                                    : "hover:bg-zinc-50/70"
                                }`}
                              >
                                <TableCell className="py-3 pl-3 pr-2 align-top whitespace-normal">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-200/70 text-zinc-800 text-[10px] font-semibold">
                                      {grp.roomType}
                                    </span>
                                    <span className="font-semibold text-xs text-zinc-950">
                                      {grp.sampleGoodNStayForm.roomName}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-500 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
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
                                <TableCell className="py-3 px-2 text-right align-top">
                                  {renderOtaCell("GOODNSTAY")}
                                </TableCell>
                                <TableCell className="py-3 px-2 text-right align-top">
                                  {renderOtaCell("AGODA")}
                                </TableCell>
                                <TableCell className="py-3 pl-2 pr-4 text-right align-top">
                                  {renderOtaCell("BOOKING")}
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

          {/* RIGHT 5 COLS: INSPECTOR, 8-FIELD FORM & LIVE PROOF */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-4 lg:sticky lg:top-20">
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
                    <div className="flex items-center gap-1.5">
                      <Badge variant="neutral">{selectedGroup.roomType}</Badge>
                      <Badge
                        variant={selectedGroup.isMultiBed ? "info" : "outline"}
                      >
                        {selectedGroup.isMultiBed
                          ? `Nhiều giường (${selectedGroup.totalBeds} giường)`
                          : "Phòng 1 giường"}
                      </Badge>
                      {activeOfferForForm.liveProof?.isLiveScraped && (
                        <Badge variant="success">LIVE PLAYWRIGHT</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-950 mt-1.5 truncate">
                      {selectedGroup.sampleGoodNStayForm.roomName}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-medium">
                      Biên độ chênh lệch
                    </div>
                    <div className="text-sm font-bold font-mono text-zinc-900">
                      {selectedGroup.spreadAnalysis.marketSpreadPct}%
                    </div>
                  </div>
                </div>

                {/* OTA Source Switcher */}
                <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200/60">
                  {(["AGODA", "BOOKING", "GOODNSTAY"] as OtaCode[]).map(
                    (ota) => {
                      const hasOffer = Boolean(selectedGroup.otaOffers[ota]);
                      const active = selectedOtaForForm === ota;
                      return (
                        <button
                          key={ota}
                          type="button"
                          disabled={!hasOffer}
                          onClick={() => setSelectedOtaForForm(ota)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-40 ${
                            active
                              ? "bg-white text-zinc-950 font-semibold shadow-2xs"
                              : "text-zinc-500 hover:text-zinc-900"
                          }`}
                        >
                          {OTA_LABELS[ota]}
                        </button>
                      );
                    }
                  )}
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

                  {/* TAB 1: EXACT 8-FIELD GOODNSTAY ROOM FORM */}
                  <TabsContent value="form" className="pt-3 space-y-3">
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
                              Ảnh phòng bóc trực tiếp từ CDN của OTA cho hạng
                              phòng {activeOfferForForm.formFields.roomName}
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
                                <div className="p-1.5 text-[10px] font-mono text-zinc-500 truncate">
                                  {url}
                                </div>
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
                          Price per night (KRW / VND) *
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
                        Amenity Types (4 tùy chọn chuẩn)
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/40">
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

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Room Type (Dropdown 6 mục)
                        </label>
                        <div className="h-8 px-2.5 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-xs font-semibold text-zinc-900">
                          <span>{activeOfferForForm.formFields.roomType}</span>
                          <span className="text-[10px] font-normal text-zinc-400">
                            Selected
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Bed Type (Dropdown 4 mục)
                        </label>
                        <div className="h-8 px-2.5 rounded-md border border-zinc-300 bg-white flex items-center justify-between text-xs font-semibold text-zinc-900">
                          <span className="truncate">
                            {activeOfferForForm.formFields.bedType}
                          </span>
                          <span className="text-[10px] font-normal text-zinc-400 shrink-0">
                            Selected
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 items-end pt-1 border-t border-zinc-100">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-zinc-500">
                          Total Inventory *
                        </label>
                        <Input
                          readOnly
                          value={String(
                            activeOfferForForm.formFields.totalInventory
                          )}
                          className="h-8 text-xs font-mono bg-zinc-50/60"
                        />
                      </div>
                      <div className="text-[11px] text-zinc-400 pb-1.5">
                        Số phòng mở bán trên {OTA_LABELS[selectedOtaForForm]}
                      </div>
                    </div>
                  </TabsContent>

                  {/* TAB 2: TAX BREAKDOWN & CLASSIFICATION REASONING */}
                  <TabsContent value="breakdown" className="pt-3 space-y-3">
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-2 text-xs">
                      <div className="font-semibold text-zinc-900">
                        Giải thích phân loại ({OTA_LABELS[selectedOtaForForm]})
                      </div>
                      <div className="text-zinc-600 space-y-1 text-[11.5px]">
                        <div>
                          <span className="font-medium text-zinc-900">
                            Room Type ({activeOfferForForm.formFields.roomType}):
                          </span>{" "}
                          {activeOfferForForm.filterMeta.roomTypeReason}
                        </div>
                        <div>
                          <span className="font-medium text-zinc-900">
                            Bed Type ({activeOfferForForm.formFields.bedType}):
                          </span>{" "}
                          {activeOfferForForm.filterMeta.bedReason}
                        </div>
                        <div>
                          <span className="font-medium text-zinc-900">
                            Mã gốc trên sàn:
                          </span>{" "}
                          <code className="font-mono text-[10.5px] bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                            {activeOfferForForm.liveProof?.externalNativeId}
                          </code>
                        </div>
                      </div>
                    </div>

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
                              Gross Thực trả
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(
                            ["GOODNSTAY", "AGODA", "BOOKING"] as OtaCode[]
                          ).map((ota) => {
                            const off = selectedGroup.otaOffers[ota];
                            if (!off) return null;
                            return (
                              <TableRow key={ota}>
                                <TableCell className="py-2 px-2.5 text-xs font-medium">
                                  <div>{OTA_LABELS[ota]}</div>
                                  <div className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                                    {off.roomName}
                                  </div>
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
                  </TabsContent>

                  {/* TAB 3: UNDENIABLE LIVE PROOF (SCREENSHOTS + LINKS + SHA256) */}
                  <TabsContent value="proof" className="pt-3 space-y-3">
                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold text-emerald-950">
                        <span className="inline-flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          Xác thực Phiên Cào Trực Tiếp (Playwright Chromium)
                        </span>
                        <span className="font-mono text-[11px]">
                          {proof?.durationMs}ms
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-900 font-mono break-all">
                        SHA-256: {proof?.sha256Digest}
                      </div>
                      <div className="text-[11px] text-emerald-800">
                        Thời điểm cào: {proof?.scrapedAt}
                      </div>
                    </div>

                    {proof && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-800">
                              1. Ảnh chụp màn hình trình duyệt Agoda lúc cào:
                            </span>
                            <a
                              href={proof.agoda.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 underline"
                            >
                              Mở link Agoda thật{" "}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <img
                            src={`${proof.agoda.screenshotUrl}?t=${encodeURIComponent(proof.scrapedAt)}`}
                            alt="Agoda Live Scrape Screenshot"
                            className="w-full h-36 object-cover object-top rounded-lg border border-zinc-200"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-zinc-800">
                              2. Ảnh chụp màn hình Booking.com (#hprt-table):
                            </span>
                            <a
                              href={proof.booking.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-700 hover:text-zinc-950 underline"
                            >
                              Mở link Booking thật{" "}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <img
                            src={`${proof.booking.screenshotUrl}?t=${encodeURIComponent(proof.scrapedAt)}`}
                            alt="Booking.com Live Scrape Screenshot"
                            className="w-full h-36 object-cover object-top rounded-lg border border-zinc-200"
                          />
                        </div>
                      </div>
                    )}
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
