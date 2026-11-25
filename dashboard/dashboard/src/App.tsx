import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleDollarSign,
  Bed,
  CheckCircle2,
  Star,
  Sparkles,
  Info,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarX2,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type {
  BiddingOperationsMaster,
  DateRangeKey,
  HubInboxMaster,
  HubNavSection,
  MarketingCampaignsMaster,
  MasterDataBundle,
  PartnerUserMaster,
  PayoutLedgersMaster,
  PropertyId,
  RoomInventoryMaster,
  StaffRoleKey,
} from "@/data";
import {
  loadMasterDataBundle,
  persistMasterTable,
} from "@/services/masterDataService";
import {
  fetchBigQueryScopedBundle,
  persistBffSessionOverlay,
  type DataSourceMode,
} from "@/services/bigQueryApiService";
import {
  ALL_SYSTEM_PROPERTY_IDS,
  canProfileManagePricing,
  canProfileViewChainAll,
  canProfileViewFinancials,
  clampPropertyKeyForProfile,
  deriveNextPropertyKeyOnUserSwitch,
  filterPropertiesForProfile,
  getEffectiveAllowedBranchIds,
  resolveStaffProfile,
} from "@/lib/rbacScoping";
import {
  formatAxisTickMoney,
  formatBusinessMoney,
  getDictionary,
  getZeroRevenueAxisMaxVnd,
  type AppLocale,
  type CurrencyCode,
} from "@/lib/i18n";
import { getModulesDictionary } from "@/lib/hubModulesI18n";
import {
  buildOverviewViewModel,
  type OverviewDailyPoint,
  type PropertyFilterKey,
} from "@/services/overviewAnalytics";
import {
  buildAllAcceptedBookingMap,
  buildBiddingModuleViewModel,
  buildCalendarModuleViewModel,
  buildMarketingModuleViewModel,
  buildMessagesModuleViewModel,
  buildPayoutModuleViewModel,
  buildRoomsModuleViewModel,
  type CalendarWindowKey,
} from "@/services/hubModulesAnalytics";
import {
  PartnerHubShell,
  type StaffProfileOption,
} from "@/components/PartnerHubShell";
import { AiAdvisorSection } from "@/components/AiAdvisorSection";
import { BookingDetailModal } from "@/components/BookingDetailModal";
import { BookingCalendarView } from "@/components/modules/BookingCalendarView";
import { PayoutReconciliationView } from "@/components/modules/PayoutReconciliationView";
import { RoomsManagementView } from "@/components/modules/RoomsManagementView";
import { BiddingManagementView } from "@/components/modules/BiddingManagementView";
import { GuestMessagesView } from "@/components/modules/GuestMessagesView";
import { MarketingCampaignsView } from "@/components/modules/MarketingCampaignsView";
import { BigQueryWarehouseView } from "@/components/modules/BigQueryWarehouseView";
import { OverviewBigQueryChartsPanel } from "@/components/OverviewBigQueryChartsPanel";

const HUB_PREFS_STORAGE_KEY = "gns_partner_hub_prefs_v1";

const VALID_NAV_SECTIONS: HubNavSection[] = [
  "overview",
  "calendar",
  "payout",
  "rooms",
  "bidding",
  "messages",
  "bigquery_live",
  "marketing_deals",
  "marketing_upsell",
];

interface PersistedHubPrefs {
  locale: AppLocale;
  currency: CurrencyCode;
  propertyKey: PropertyFilterKey;
  periodKey: DateRangeKey;
  rowsPerPage: number;
  activeSection: HubNavSection;
  activeRoleKey: StaffRoleKey;
  activeUserId: string;
  dataSourceMode: DataSourceMode;
}

function readInitialHubPrefs(): PersistedHubPrefs {
  const fallback: PersistedHubPrefs = {
    locale: "vi",
    currency: "VND",
    propertyKey: "all",
    periodKey: "30d",
    rowsPerPage: 5,
    activeSection: "overview",
    activeRoleKey: "manager",
    activeUserId: "USR-PARTNER-01",
    dataSourceMode: "local-json",
  };
  try {
    const raw = localStorage.getItem(HUB_PREFS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedHubPrefs>;
    const resolvedRole: StaffRoleKey =
      parsed.activeRoleKey === "manager" ||
      parsed.activeRoleKey === "branch_manager" ||
      parsed.activeRoleKey === "receptionist"
        ? parsed.activeRoleKey
        : "manager";
    const resolvedUserId =
      typeof parsed.activeUserId === "string" && parsed.activeUserId.trim()
        ? parsed.activeUserId.trim()
        : resolvedRole === "receptionist"
          ? "USR-STAFF-02"
          : "USR-PARTNER-01";
    return {
      locale:
        parsed.locale === "vi" || parsed.locale === "en" || parsed.locale === "ko"
          ? parsed.locale
          : "vi",
      currency:
        parsed.currency === "VND" ||
        parsed.currency === "KRW" ||
        parsed.currency === "USD"
          ? parsed.currency
          : "VND",
      propertyKey:
        parsed.propertyKey === "all" ||
        parsed.propertyKey === "br_mykhe" ||
        parsed.propertyKey === "br_songhan" ||
        parsed.propertyKey === "br_anthuong" ||
        parsed.propertyKey === "stay_h11"
          ? parsed.propertyKey
          : "all",
      periodKey:
        parsed.periodKey === "30d" ||
        parsed.periodKey === "7d" ||
        parsed.periodKey === "today"
          ? parsed.periodKey
          : "30d",
      rowsPerPage:
        parsed.rowsPerPage === 5 ||
        parsed.rowsPerPage === 10 ||
        parsed.rowsPerPage === 20
          ? parsed.rowsPerPage
          : 5,
      activeSection: VALID_NAV_SECTIONS.includes(
        parsed.activeSection as HubNavSection,
      )
        ? (parsed.activeSection as HubNavSection)
        : "overview",
      activeRoleKey: resolvedRole,
      activeUserId: resolvedUserId,
      dataSourceMode:
        parsed.dataSourceMode === "live-bigquery"
          ? "live-bigquery"
          : "local-json",
    };
  } catch {
    return fallback;
  }
}

function StarRow({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const rounded = Math.round(score);
  const iconCls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((idx) => {
        const filled = score > 0 && idx <= rounded;
        return (
          <Star
            key={idx}
            className={`${iconCls} ${
              filled
                ? "text-amber-400 fill-amber-400"
                : "text-amber-400/75 fill-transparent"
            }`}
          />
        );
      })}
    </span>
  );
}

function formatCurrentClock(locale: AppLocale): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  if (locale === "vi") return `${hh}:${mm}`;
  const h12 = now.getHours() % 12 || 12;
  const suffix = now.getHours() >= 12 ? "PM" : "AM";
  if (locale === "ko") {
    return `${now.getHours() >= 12 ? "오후" : "오전"} ${String(h12).padStart(2, "0")}:${mm}`;
  }
  return `${String(h12).padStart(2, "0")}:${mm} ${suffix}`;
}

export function App() {
  const initialPrefs = useMemo(() => readInitialHubPrefs(), []);

  const [bundle, setBundle] = useState<MasterDataBundle | null>(null);
  const [loading, setLoading] = useState(true);

  const [locale, setLocale] = useState<AppLocale>(initialPrefs.locale);
  const [currency, setCurrency] = useState<CurrencyCode>(initialPrefs.currency);
  const [propertyKey, setPropertyKey] = useState<PropertyFilterKey>(
    initialPrefs.propertyKey,
  );
  const [periodKey, setPeriodKey] = useState<DateRangeKey>(
    initialPrefs.periodKey,
  );
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    initialPrefs.rowsPerPage,
  );
  const [activeSection, setActiveSection] = useState<HubNavSection>(
    initialPrefs.activeSection,
  );
  const [activeRoleKey, setActiveRoleKey] = useState<StaffRoleKey>(
    initialPrefs.activeRoleKey,
  );
  const [activeUserId, setActiveUserId] = useState<string>(
    initialPrefs.activeUserId,
  );
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(
    initialPrefs.dataSourceMode,
  );
  const [bqSyncing, setBqSyncing] = useState<boolean>(false);
  const prevDataSourceRef = useRef<DataSourceMode>(initialPrefs.dataSourceMode);
  const [calendarWindow, setCalendarWindow] =
    useState<CalendarWindowKey>("current7d");
  const [signedOut, setSignedOut] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeInfoKey, setActiveInfoKey] = useState<string | null>(null);
  const [selectedBookingRefId, setSelectedBookingRefId] = useState<
    string | null
  >(null);
  const [analyzedTimeOverride, setAnalyzedTimeOverride] = useState<
    string | undefined
  >(undefined);

  // Initial load from Local JSON seed/API (zero unsolicited calls to BigQuery BFF in Local JSON mode)
  useEffect(() => {
    let mounted = true;
    loadMasterDataBundle()
      .then((res) => {
        if (mounted) {
          setBundle(res.bundle);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const staffMasters: PartnerUserMaster[] = useMemo(() => {
    if (!bundle) return [];
    return (
      bundle.hubConfig.staffProfiles ?? [
        { ...bundle.hubConfig.partnerUser, roleKey: "manager" as const },
      ]
    );
  }, [bundle]);

  const activeStaffMaster: PartnerUserMaster | null = useMemo(() => {
    if (staffMasters.length === 0) return null;
    return resolveStaffProfile(staffMasters, activeUserId, activeRoleKey);
  }, [staffMasters, activeUserId, activeRoleKey]);

  const effectiveAllowedBranches: PropertyId[] = useMemo(() => {
    if (!activeStaffMaster) return [...ALL_SYSTEM_PROPERTY_IDS];
    return getEffectiveAllowedBranchIds(
      activeStaffMaster,
      ALL_SYSTEM_PROPERTY_IDS,
    );
  }, [activeStaffMaster]);

  const canViewChainAll = activeStaffMaster
    ? canProfileViewChainAll(activeStaffMaster)
    : true;
  const canViewFinancials = activeStaffMaster
    ? canProfileViewFinancials(activeStaffMaster)
    : true;
  const canManagePricing = activeStaffMaster
    ? canProfileManagePricing(activeStaffMaster)
    : true;

  const effectivePropertyKey: PropertyFilterKey = useMemo(() => {
    if (!activeStaffMaster) return propertyKey;
    return clampPropertyKeyForProfile(
      propertyKey,
      activeStaffMaster,
      ALL_SYSTEM_PROPERTY_IDS,
    );
  }, [propertyKey, activeStaffMaster]);

  const effectiveModuleRole: StaffRoleKey = canManagePricing
    ? "manager"
    : "receptionist";

  const targetUserId = activeStaffMaster?.userId ?? activeUserId;
  const bundleScopeBranch: PropertyFilterKey = canViewChainAll
    ? "all"
    : (effectiveAllowedBranches[0] ?? "br_mykhe");
  const localeRef = useRef<AppLocale>(locale);
  localeRef.current = locale;

  // Synchronize live BigQuery scoped bundle when Global Data Source is "live-bigquery"
  // Dependencies are strictly primitive strings so updating `bundle` NEVER triggers a re-fetch loop.
  useEffect(() => {
    let cancelled = false;

    if (dataSourceMode === "live-bigquery") {
      setBqSyncing(true);
      fetchBigQueryScopedBundle({
        userId: targetUserId,
        branchId: bundleScopeBranch,
      })
        .then((res) => {
          if (cancelled) return;
          setBundle(res.bundle);
          setLoading(false);
          setBqSyncing(false);
        })
        .catch(() => {
          if (cancelled) return;
          setBqSyncing(false);
          setDataSourceMode("local-json");
          const curLoc = localeRef.current;
          setToastMessage(
            curLoc === "vi"
              ? "BigQuery BFF (:4000) hiện chưa bật — đã tự động chuyển về Local JSON."
              : curLoc === "ko"
                ? "BigQuery BFF(:4000)에 연결할 수 없어 Local JSON 모드로 전환했습니다."
                : "BigQuery BFF (:4000) is offline — reverted safely to Local JSON.",
          );
        });
    } else if (prevDataSourceRef.current === "live-bigquery") {
      // Switching back from Live BigQuery to Local JSON restores the full local dataset
      loadMasterDataBundle()
        .then((res) => {
          if (!cancelled) {
            setBundle(res.bundle);
            setLoading(false);
          }
        })
        .catch(() => {
          // Keep existing in-memory bundle if local reload fails
        });
    }

    prevDataSourceRef.current = dataSourceMode;

    return () => {
      cancelled = true;
    };
  }, [dataSourceMode, targetUserId, bundleScopeBranch]);

  useEffect(() => {
    try {
      const prefs: PersistedHubPrefs = {
        locale,
        currency,
        propertyKey: effectivePropertyKey,
        periodKey,
        rowsPerPage,
        activeSection,
        activeRoleKey: activeStaffMaster?.roleKey ?? activeRoleKey,
        activeUserId: activeStaffMaster?.userId ?? activeUserId,
        dataSourceMode,
      };
      localStorage.setItem(HUB_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    locale,
    currency,
    effectivePropertyKey,
    periodKey,
    rowsPerPage,
    activeSection,
    activeRoleKey,
    activeUserId,
    activeStaffMaster?.roleKey,
    activeStaffMaster?.userId,
    dataSourceMode,
  ]);

  // Reset pagination to page 1 whenever property, period, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [effectivePropertyKey, periodKey, rowsPerPage]);

  const copy = useMemo(() => getDictionary(locale), [locale]);
  const mCopy = useMemo(() => getModulesDictionary(locale), [locale]);

  const vm = useMemo(() => {
    if (!bundle) return null;
    return buildOverviewViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      periodKey,
      locale,
      currency,
      analyzedTimeText: analyzedTimeOverride,
    });
  }, [
    bundle,
    effectivePropertyKey,
    periodKey,
    locale,
    currency,
    analyzedTimeOverride,
  ]);

  const allBookingsMap = useMemo(() => {
    if (!bundle) return {};
    return buildAllAcceptedBookingMap(bundle, locale);
  }, [bundle, locale]);

  const calendarVm = useMemo(() => {
    if (!bundle) return null;
    return buildCalendarModuleViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      windowKey: calendarWindow,
      locale,
      currency,
    });
  }, [bundle, effectivePropertyKey, calendarWindow, locale, currency]);

  const payoutVm = useMemo(() => {
    if (!bundle) return null;
    return buildPayoutModuleViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      locale,
      currency,
    });
  }, [bundle, effectivePropertyKey, locale, currency]);

  const roomsVm = useMemo(() => {
    if (!bundle) return null;
    return buildRoomsModuleViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      locale,
      currency,
    });
  }, [bundle, effectivePropertyKey, locale, currency]);

  const biddingVm = useMemo(() => {
    if (!bundle) return null;
    return buildBiddingModuleViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      locale,
      currency,
    });
  }, [bundle, effectivePropertyKey, locale, currency]);

  const messagesVm = useMemo(() => {
    if (!bundle) return null;
    return buildMessagesModuleViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      locale,
    });
  }, [bundle, effectivePropertyKey, locale]);

  const marketingVm = useMemo(() => {
    if (!bundle) return null;
    return buildMarketingModuleViewModel(bundle, {
      propertyKey: effectivePropertyKey,
      locale,
      currency,
    });
  }, [bundle, effectivePropertyKey, locale, currency]);

  if (loading || !bundle || !vm) {
    return (
      <div className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm flex items-center gap-3 text-[13.5px] font-medium text-slate-600">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
          <span>Optibide Partner Hub...</span>
        </div>
      </div>
    );
  }

  if (signedOut) {
    return (
      <div
        data-testid="signed-out-screen"
        className="min-h-screen bg-[#F6F7FB] flex items-center justify-center p-6"
      >
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-[19px] font-bold text-slate-900 m-0">
            {mCopy.session.signedOutTitle}
          </h1>
          <p className="text-[13px] text-slate-600 leading-relaxed m-0">
            {mCopy.session.signedOutSubtitle}
          </p>
          <button
            type="button"
            data-testid="sign-back-in-btn"
            onClick={() => setSignedOut(false)}
            className="w-full rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-[13.5px] font-semibold hover:bg-indigo-700 transition-colors"
          >
            {mCopy.session.signBackInBtn}
          </button>
        </div>
      </div>
    );
  }

  const staffProfiles: StaffProfileOption[] = staffMasters.map((sp) => ({
    userId: sp.userId,
    roleKey: sp.roleKey ?? "manager",
    displayName: sp.displayName[locale],
    initials: sp.initials[locale],
    roleBadge: sp.roleBadge[locale],
    allowedBranchIds: getEffectiveAllowedBranchIds(sp, ALL_SYSTEM_PROPERTY_IDS),
    canViewChainAll: canProfileViewChainAll(sp),
    canViewFinancials: canProfileViewFinancials(sp),
    canManagePricing: canProfileManagePricing(sp),
  }));

  const activeStaffProfile =
    staffProfiles.find(
      (s) => s.userId === (activeStaffMaster?.userId ?? activeUserId),
    ) ?? staffProfiles[0];

  const scopedProperties = activeStaffMaster
    ? filterPropertiesForProfile(vm.properties, activeStaffMaster)
    : vm.properties;
  const selectedScopedProperty =
    scopedProperties.find((p) => p.key === effectivePropertyKey) ??
    scopedProperties[0] ??
    vm.selectedProperty;

  const handleSelectUserProfile = (nextUserId: string) => {
    const nextMaster = resolveStaffProfile(staffMasters, nextUserId);
    const prevMaster = activeStaffMaster ?? nextMaster;
    const nextPropKey = deriveNextPropertyKeyOnUserSwitch(
      prevMaster,
      nextMaster,
      effectivePropertyKey,
      ALL_SYSTEM_PROPERTY_IDS,
    );
    setActiveUserId(nextMaster.userId);
    setActiveRoleKey(nextMaster.roleKey ?? "manager");
    setPropertyKey(nextPropKey);
    setToastMessage(mCopy.common.savedToast);
  };

  const persistActiveTable = <
    K extends keyof Omit<MasterDataBundle, "bidRecords">,
  >(
    tableKey: K,
    data: MasterDataBundle[K],
  ) => {
    if (dataSourceMode === "live-bigquery") {
      void persistBffSessionOverlay({
        userId: activeStaffProfile.userId,
        tableKey,
        data,
      });
    } else {
      void persistMasterTable(tableKey, data);
    }
  };

  const handleSaveRoomInventory = (
    next: RoomInventoryMaster,
    notice?: string,
  ) => {
    setBundle((prev) => (prev ? { ...prev, roomInventory: next } : prev));
    persistActiveTable("roomInventory", next);
    if (notice) setToastMessage(notice);
  };

  const handleSavePayoutLedgers = (
    next: PayoutLedgersMaster,
    notice?: string,
  ) => {
    setBundle((prev) => (prev ? { ...prev, payoutLedgers: next } : prev));
    persistActiveTable("payoutLedgers", next);
    if (notice) setToastMessage(notice);
  };

  const handleSaveBiddingOperations = (
    next: BiddingOperationsMaster,
    syncPropertyAutoBid?: { propertyId: PropertyId; enabled: boolean },
    notice?: string,
  ) => {
    if (syncPropertyAutoBid) {
      const nextHubConfig = {
        ...bundle.hubConfig,
        properties: bundle.hubConfig.properties.map((p) =>
          p.id === syncPropertyAutoBid.propertyId
            ? { ...p, autoBidEnabled: syncPropertyAutoBid.enabled }
            : p,
        ),
      };
      setBundle((prev) =>
        prev
          ? {
              ...prev,
              biddingOperations: next,
              hubConfig: nextHubConfig,
            }
          : prev,
      );
      persistActiveTable("biddingOperations", next);
      persistActiveTable("hubConfig", nextHubConfig);
    } else {
      setBundle((prev) => (prev ? { ...prev, biddingOperations: next } : prev));
      persistActiveTable("biddingOperations", next);
    }
    if (notice) setToastMessage(notice);
  };

  const handleSaveHubInbox = (next: HubInboxMaster, notice?: string) => {
    setBundle((prev) => (prev ? { ...prev, hubInbox: next } : prev));
    persistActiveTable("hubInbox", next);
    if (notice) setToastMessage(notice);
  };

  const handleSaveMarketingCampaigns = (
    next: MarketingCampaignsMaster,
    notice?: string,
  ) => {
    setBundle((prev) => (prev ? { ...prev, marketingCampaigns: next } : prev));
    persistActiveTable("marketingCampaigns", next);
    if (notice) setToastMessage(notice);
  };

  const totalBookings = vm.completedBookings.length;
  const selectedBooking =
    selectedBookingRefId != null
      ? (allBookingsMap[selectedBookingRefId] ??
        vm.completedBookings.find(
          (b) => b.refSessionId === selectedBookingRefId,
        ) ??
        null)
      : null;

  const totalPages = Math.max(1, Math.ceil(totalBookings / rowsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safePage - 1) * rowsPerPage;
  const pagedBookings = vm.completedBookings.slice(
    startIdx,
    startIdx + rowsPerPage,
  );
  const rangeStart = totalBookings === 0 ? 0 : startIdx + 1;
  const rangeEnd = Math.min(totalBookings, startIdx + pagedBookings.length);

  const isOverviewFinancialsMasked =
    dataSourceMode === "live-bigquery" && !canViewFinancials;
  const maskedMoneyText =
    locale === "vi"
      ? "•••••• ₫ (Đã che)"
      : locale === "ko"
        ? "•••••• (권한 제한)"
        : "•••••• (Restricted)";

  const kpiCards = [
    {
      id: "revenue",
      testId: "kpi-card-revenue",
      label: copy.kpiRevenue,
      hint: copy.kpiRevenueHint,
      value: isOverviewFinancialsMasked
        ? maskedMoneyText
        : vm.kpis.revenueFormatted,
      valueClass: isOverviewFinancialsMasked
        ? "text-amber-700"
        : "text-[#16A34A]",
      icon: (
        <span className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <CircleDollarSign className="w-[18px] h-[18px] text-[#16A34A]" />
        </span>
      ),
    },
    {
      id: "total-bids",
      testId: "kpi-card-total-bids",
      label: copy.kpiTotalBids,
      hint: copy.kpiTotalBidsHint,
      value: String(vm.kpis.totalBids),
      valueClass: "text-[#DC2626]",
      icon: (
        <span className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <Bed className="w-[18px] h-[18px] text-[#EF4444]" />
        </span>
      ),
    },
    {
      id: "accept-rate",
      testId: "kpi-card-accept-rate",
      label: copy.kpiAcceptRate,
      hint: copy.kpiAcceptRateHint,
      value: vm.kpis.acceptRateFormatted,
      valueClass: "text-[#2563EB]",
      icon: (
        <span className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-[18px] h-[18px] text-[#2563EB]" />
        </span>
      ),
    },
    {
      id: "rating",
      testId: "kpi-card-rating",
      label: copy.kpiRating,
      hint: copy.kpiRatingHint,
      value: vm.kpis.ratingFormatted,
      valueClass: "text-[#DC2626]",
      icon: (
        <span className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <Star className="w-[17px] h-[17px] text-[#EF4444] fill-[#EF4444]" />
        </span>
      ),
    },
    {
      id: "autobid",
      testId: "kpi-card-autobid",
      label: copy.kpiAutoBid,
      hint: copy.kpiAutoBidHint,
      value: vm.kpis.autoBidFormatted,
      valueClass: "text-[#2563EB]",
      icon: (
        <span className="w-7 h-7 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
          <Sparkles className="w-[17px] h-[17px] text-[#0284C7]" />
        </span>
      ),
    },
  ];

  const statusBuckets = [
    vm.bidsBreakdown.accepted,
    vm.bidsBreakdown.expired,
    vm.bidsBreakdown.rejected,
    vm.bidsBreakdown.cancelled,
  ];

  const handleRefreshAdvisor = () => {
    setAnalyzedTimeOverride(formatCurrentClock(locale));
  };

  const formattedPeriodNet = isOverviewFinancialsMasked
    ? maskedMoneyText
    : formatBusinessMoney(vm.kpis.revenueVnd, currency, {
        rates: vm.currencyRates,
      });

  const renderActiveSection = () => {
    if (activeSection === "bigquery_live") {
      return (
        <BigQueryWarehouseView
          activeUserId={activeStaffProfile.userId}
          activeUserName={activeStaffProfile.displayName}
          activeRoleKey={activeStaffProfile.roleKey}
          allowedBranchIds={activeStaffProfile.allowedBranchIds}
          propertyKey={effectivePropertyKey}
          periodKey={periodKey}
          onChangePeriod={setPeriodKey}
          locale={locale}
          currency={currency}
          currencyRates={vm.currencyRates}
          onSwitchToLocalJson={() => {
            setDataSourceMode("local-json");
            setActiveSection("overview");
          }}
        />
      );
    }

    if (activeSection === "calendar" && calendarVm) {
      return (
        <BookingCalendarView
          vm={calendarVm}
          roomInventory={bundle.roomInventory}
          mCopy={mCopy}
          locale={locale}
          onChangeWindow={setCalendarWindow}
          onOpenBookingByRef={setSelectedBookingRefId}
          onSaveRoomInventory={handleSaveRoomInventory}
        />
      );
    }

    if (activeSection === "payout" && payoutVm) {
      return (
        <PayoutReconciliationView
          vm={payoutVm}
          payoutLedgers={bundle.payoutLedgers}
          mCopy={mCopy}
          activeRole={effectiveModuleRole}
          onRequireManagerRole={() =>
            setToastMessage(mCopy.common.roleRestrictedNotice)
          }
          onOpenBookingByRef={setSelectedBookingRefId}
          onSavePayoutLedgers={handleSavePayoutLedgers}
        />
      );
    }

    if (activeSection === "rooms" && roomsVm) {
      return (
        <RoomsManagementView
          vm={roomsVm}
          roomInventory={bundle.roomInventory}
          mCopy={mCopy}
          activeRole={effectiveModuleRole}
          onRequireManagerRole={() =>
            setToastMessage(mCopy.common.roleRestrictedNotice)
          }
          onOpenBookingByRef={setSelectedBookingRefId}
          onSaveRoomInventory={handleSaveRoomInventory}
        />
      );
    }

    if (activeSection === "bidding" && biddingVm) {
      return (
        <BiddingManagementView
          vm={biddingVm}
          biddingOperations={bundle.biddingOperations}
          mCopy={mCopy}
          copy={copy}
          locale={locale}
          currency={currency}
          currencyRates={vm.currencyRates}
          activeRole={effectiveModuleRole}
          onRequireManagerRole={() =>
            setToastMessage(mCopy.common.roleRestrictedNotice)
          }
          onSaveBiddingOperations={handleSaveBiddingOperations}
        />
      );
    }

    if (activeSection === "messages" && messagesVm) {
      return (
        <GuestMessagesView
          vm={messagesVm}
          hubInbox={bundle.hubInbox}
          mCopy={mCopy}
          onOpenBookingByRef={setSelectedBookingRefId}
          onSaveHubInbox={handleSaveHubInbox}
        />
      );
    }

    if (
      (activeSection === "marketing_deals" ||
        activeSection === "marketing_upsell") &&
      marketingVm
    ) {
      return (
        <MarketingCampaignsView
          activeSubTab={activeSection}
          onChangeSubTab={setActiveSection}
          vm={marketingVm}
          marketingCampaigns={bundle.marketingCampaigns}
          propertyKey={effectivePropertyKey}
          mCopy={mCopy}
          activeRole={effectiveModuleRole}
          onRequireManagerRole={() =>
            setToastMessage(mCopy.common.roleRestrictedNotice)
          }
          onSaveMarketingCampaigns={handleSaveMarketingCampaigns}
        />
      );
    }

    return (
      <div className="space-y-6 min-w-0">
        {/* Page Header + Period Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-slate-900 m-0">
            {copy.pageTitle}
          </h1>

          <div className="relative flex items-center">
            <select
              data-testid="period-select"
              aria-label="Period"
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value as DateRangeKey)}
              className="appearance-none bg-white border border-slate-200/95 rounded-lg pl-3.5 pr-9 py-2 text-[13px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300 focus:outline-none"
            >
              <option value="30d">{copy.periodOptions["30d"]}</option>
              <option value="7d">{copy.periodOptions["7d"]}</option>
              <option value="today">{copy.periodOptions.today}</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 pointer-events-none absolute right-2.5" />
          </div>
        </div>

        {/* 1. Top 5 Business KPI Cards */}
        <section
          aria-label="Key business metrics"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5 min-w-0"
        >
          {kpiCards.map((card) => {
            const isOpen = activeInfoKey === card.id;
            return (
              <div
                key={card.id}
                data-testid={card.testId}
                className="relative rounded-xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex flex-col justify-between min-w-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12.5px] font-medium text-slate-500 truncate">
                      {card.label}
                    </span>
                    <button
                      type="button"
                      data-testid={`kpi-info-${card.id}`}
                      aria-label={`${card.label} info`}
                      onClick={() =>
                        setActiveInfoKey((prev) =>
                          prev === card.id ? null : card.id,
                        )
                      }
                      className="text-slate-400 hover:text-slate-700 shrink-0 inline-flex items-center"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {card.icon}
                </div>

                <div
                  className={`mt-2 text-[22px] sm:text-[23px] font-bold tracking-tight tabular truncate ${card.valueClass}`}
                >
                  {card.value}
                </div>

                {isOpen && (
                  <div
                    data-testid={`kpi-tooltip-${card.id}`}
                    className="mt-2.5 rounded-lg bg-slate-900 text-white p-2.5 text-[11.5px] leading-relaxed shadow-md"
                  >
                    {card.hint}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* 1b. Live BigQuery GA4 & CTO 3-Chart Suite (visible inline on Overview when BigQuery mode is active) */}
        {dataSourceMode === "live-bigquery" && (
          <OverviewBigQueryChartsPanel
            activeUserId={activeStaffProfile.userId}
            propertyKey={effectivePropertyKey}
            periodKey={periodKey}
            locale={locale}
            onOpenBigQueryInspector={() => setActiveSection("bigquery_live")}
          />
        )}

        {/* 2. Revenue Timeline Card + AI Advisor */}
        <section
          data-testid="section-revenue-timeline"
          className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0"
        >
          <div>
            <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-900 m-0">
              {copy.revenueTimelineTitle}
            </h2>
            <p className="text-[12.5px] text-slate-500 mt-1 mb-0">
              {copy.revenueTimelineSubtitle}
            </p>
          </div>

          <div className="mt-5 w-full min-w-0 h-[250px] sm:h-[290px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart
                data={vm.dailySeries}
                margin={{ top: 10, right: 8, left: 0, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={true}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />
                <YAxis
                  yAxisId="revenue"
                  stroke="#EF4444"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  tickFormatter={(val) =>
                    formatAxisTickMoney(
                      Number(val),
                      currency,
                      vm.currencyRates,
                    )
                  }
                  width={74}
                  label={{
                    value: `${copy.axisRevenueLabel} (${currency})`,
                    angle: -90,
                    position: "insideLeft",
                    offset: 8,
                    style: {
                      fontSize: 11,
                      fill: "#334155",
                      fontWeight: 600,
                      textAnchor: "middle",
                    },
                  }}
                  domain={[
                    0,
                    (dataMax: number) =>
                      dataMax <= 0
                        ? getZeroRevenueAxisMaxVnd(currency, vm.currencyRates)
                        : Math.ceil(dataMax * 1.15),
                  ]}
                />
                <YAxis
                  yAxisId="bookings"
                  orientation="right"
                  stroke="#3B82F6"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#334155" }}
                  width={50}
                  label={{
                    value: copy.axisBookingsLabel,
                    angle: 90,
                    position: "insideRight",
                    offset: 10,
                    style: {
                      fontSize: 11,
                      fill: "#334155",
                      fontWeight: 600,
                      textAnchor: "middle",
                    },
                  }}
                  domain={[
                    0,
                    (dataMax: number) =>
                      dataMax <= 0 ? 4 : Math.max(4, Math.ceil(dataMax * 1.2)),
                  ]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const pt = payload[0].payload as OverviewDailyPoint;
                    return (
                      <div className="rounded-lg bg-slate-800/95 text-white px-3.5 py-2.5 text-[12px] shadow-xl space-y-1">
                        <div className="font-semibold text-slate-100">
                          {pt.tooltipDate}
                        </div>
                        <div className="text-red-300 font-medium tabular">
                          {copy.kpiRevenue}:{" "}
                          {formatBusinessMoney(pt.revenueVnd, currency, {
                            rates: vm.currencyRates,
                          })}
                        </div>
                        <div className="text-sky-300 font-medium tabular">
                          {copy.legendBookings}: {pt.bookingsCount}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="bookings"
                  dataKey="bookingsCount"
                  fill="#93C5FD"
                  maxBarSize={24}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenueVnd"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#revGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#EF4444" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-[12px] text-slate-600">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-2 rounded-[2px] bg-[#FCA5A5] border border-[#EF4444]" />
              <span>
                {copy.legendRevenue} ({currency})
              </span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-2.5 rounded-[2px] bg-[#93C5FD]" />
              <span>{copy.legendBookings}</span>
            </span>
          </div>

          <AiAdvisorSection
            sectionPrefix="revenue"
            title={copy.revenueGuideTitle}
            advisorBadge={copy.aiAdvisorBadge}
            collapseLabel={copy.collapseBtn}
            expandLabel={copy.expandBtn}
            refreshLabel={copy.refreshAnalysisLabel}
            model={vm.revenueAdvisor}
            onRefresh={handleRefreshAdvisor}
          />
        </section>

        {/* 3. Bids Status Card + Breakdown Table + AI Advisor */}
        <section
          data-testid="section-bids-status"
          className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0"
        >
          <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-900 m-0">
            {copy.bidsStatusTitle}
          </h2>

          <div className="mt-5 w-full min-w-0 h-[230px] sm:h-[260px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={vm.dailySeries}
                margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={true}
                  stroke="#F1F5F9"
                />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: "#64748B" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={18}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  axisLine={{ stroke: "#CBD5E1" }}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }
                    const pt = payload[0].payload as OverviewDailyPoint;
                    return (
                      <div className="rounded-lg bg-slate-800/95 text-white px-3.5 py-2.5 text-[12px] shadow-xl space-y-1">
                        <div className="font-semibold">{pt.tooltipDate}</div>
                        <div className="text-emerald-300 tabular">
                          {copy.statusAccepted}: {pt.accepted}
                        </div>
                        <div className="text-amber-300 tabular">
                          {copy.statusExpired}: {pt.expired}
                        </div>
                        <div className="text-red-300 tabular">
                          {copy.statusRejected}: {pt.rejected}
                        </div>
                        <div className="text-slate-300 tabular">
                          {copy.statusCancelled}: {pt.cancelled}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="accepted"
                  stackId="bids"
                  fill="#22C55E"
                  maxBarSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="expired"
                  stackId="bids"
                  fill="#F59E0B"
                  maxBarSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="rejected"
                  stackId="bids"
                  fill="#EF4444"
                  maxBarSize={24}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="cancelled"
                  stackId="bids"
                  fill="#9CA3AF"
                  maxBarSize={24}
                  radius={[2, 2, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Status Pills */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {statusBuckets.map((b) => (
              <span
                key={b.key}
                title={b.definition}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[11.5px] font-medium text-slate-700"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: b.colorHex }}
                />
                <span className="font-semibold text-slate-900">{b.label}</span>
                <span className="text-slate-500 tabular">({b.count})</span>
                <Info className="w-3 h-3 text-slate-400" />
              </span>
            ))}
          </div>

          {/* Breakdown & Definitions Table */}
          <div className="mt-6">
            <h3 className="text-[13px] font-bold text-slate-900 mb-2.5">
              {copy.breakdownHeading}
            </h3>
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200/90">
              <table className="w-full min-w-[540px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200/90 text-[12px] font-semibold text-slate-700">
                    <th className="py-2.5 px-3.5">{copy.colStatus}</th>
                    <th className="py-2.5 px-3.5">{copy.colDefinition}</th>
                    <th className="py-2.5 px-3.5 text-right">
                      {copy.colRecords}
                    </th>
                    <th className="py-2.5 px-3.5 text-right">{copy.colShare}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12.5px]">
                  {statusBuckets.map((b) => (
                    <tr key={b.key} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: b.colorHex }}
                          />
                          {b.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600">
                        {b.definition}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 tabular">
                        {b.count}
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 tabular">
                          {b.shareLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200/90 text-[12.5px] font-bold text-slate-900">
                    <td className="py-2.5 px-3.5" colSpan={2}>
                      {copy.rowTotalBids}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular">
                      {vm.bidsBreakdown.total}
                    </td>
                    <td className="py-2.5 px-3.5 text-right tabular">
                      {vm.bidsBreakdown.totalShareLabel}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <AiAdvisorSection
            sectionPrefix="bids"
            title={copy.bidsGuideTitle}
            advisorBadge={copy.aiAdvisorBadge}
            collapseLabel={copy.collapseBtn}
            expandLabel={copy.expandBtn}
            refreshLabel={copy.refreshAnalysisLabel}
            model={vm.bidsAdvisor}
            onRefresh={handleRefreshAdvisor}
          />
        </section>

        {/* 4. Ratings, Trust & Visibility Card */}
        <section
          data-testid="section-ratings-trust"
          className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0 space-y-4"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-900 m-0">
              {copy.ratingsTitle}
            </h2>
            <button
              type="button"
              aria-label={copy.ratingsTitle}
              onClick={() =>
                setActiveInfoKey((prev) =>
                  prev === "ratings-section" ? null : "ratings-section",
                )
              }
              className="text-slate-400 hover:text-slate-700 inline-flex items-center"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {activeInfoKey === "ratings-section" && (
            <div className="rounded-xl bg-slate-900 text-white p-3 text-[12px] leading-relaxed">
              {copy.ratingsHint}
            </div>
          )}

          {/* Overall Rating + 5 Criteria Breakdown */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-5 space-y-4">
            <div>
              <div className="text-[12.5px] font-bold text-slate-900 mb-2">
                {copy.overallGuestRating}
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <StarRow score={vm.trust.overallRating} size="md" />
                <span className="text-[17px] font-bold text-slate-900 tabular">
                  {vm.trust.overallRating.toFixed(1)} / 5
                </span>
                <span
                  data-testid="overall-review-count"
                  className="text-[12.5px] font-medium text-slate-500 tabular"
                >
                  ({vm.trust.reviewCount} {copy.reviewsCountSuffix})
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="text-[12.5px] font-bold text-slate-900">
                {copy.ratingBreakdownHeading}
              </div>
              {vm.trust.criteria.map((c) => (
                <div
                  key={c.key}
                  className="flex items-center justify-between gap-3 text-[13px] py-0.5"
                >
                  <span className="text-slate-700 truncate">{c.label}</span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <StarRow score={c.score} size="sm" />
                    <span className="w-7 text-right text-[12.5px] font-medium text-slate-600 tabular">
                      {c.score.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ELO / Visibility Score Box */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-5 text-center">
            <div className="text-[12.5px] font-bold text-slate-900">
              {copy.eloTitle}
            </div>
            <div
              data-testid="elo-score-value"
              className="mt-1.5 text-[28px] font-extrabold text-[#6366F1] tabular leading-none"
            >
              {vm.trust.eloScore}
            </div>
            <div className="mt-2 text-[12.5px] text-slate-500 max-w-xl mx-auto">
              {vm.trust.visibilitySubtitle}
            </div>
          </div>
        </section>

        {/* 5. Recent Bookings Card */}
        <section
          data-testid="section-recent-bookings"
          className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(15,23,42,0.03)] min-w-0"
        >
          <h2 className="text-[17px] sm:text-[18px] font-bold text-slate-900 m-0">
            {copy.recentBookingsTitle} · {vm.selectedProperty.shortName}
          </h2>

          {totalBookings === 0 ? (
            <div
              data-testid="bookings-empty-state"
              className="py-14 px-4 flex flex-col items-center justify-center text-center"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <CalendarX2 className="w-6 h-6" />
              </div>
              <div className="text-[14px] font-semibold text-slate-600">
                {copy.emptyBookingsTitle}
              </div>
              <p className="text-[12.5px] text-slate-400 mt-1 mb-0 max-w-sm">
                {copy.emptyBookingsDesc}
              </p>
            </div>
          ) : (
            <>
              <div className="mt-4 w-full overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200/90 text-[12px] font-semibold text-slate-600">
                      <th className="py-3 px-3">{copy.colBookingStatus}</th>
                      <th className="py-3 px-3">{copy.colBookingId}</th>
                      <th className="py-3 px-3">{copy.colCheckIn}</th>
                      <th className="py-3 px-3">{copy.colCheckOut}</th>
                      <th className="py-3 px-3">{copy.colBookingState}</th>
                      <th className="py-3 px-3">{copy.colPaidAt}</th>
                      <th className="py-3 px-3 text-right">{copy.colAction}</th>
                    </tr>
                  </thead>
                  <tbody
                    data-testid="recent-bookings-tbody"
                    className="divide-y divide-slate-100 text-[13px]"
                  >
                    {pagedBookings.map((row) => (
                      <tr
                        key={row.refSessionId}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-3">
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-900 tabular">
                          {row.bookingCode}
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 tabular whitespace-nowrap">
                          {row.checkInLabel}
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 tabular whitespace-nowrap">
                          {row.checkOutLabel}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {copy.stateCompletedPaid}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 tabular whitespace-nowrap">
                          {row.paidAtLabel}
                        </td>
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            data-testid="booking-view-detail-btn"
                            onClick={() =>
                              setSelectedBookingRefId(row.refSessionId)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{copy.btnViewDetail}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-end gap-4 text-[12.5px] text-slate-600">
                <div className="flex items-center gap-2">
                  <span>{copy.rowsPerPageLabel}</span>
                  <select
                    data-testid="bookings-rows-per-page"
                    aria-label={copy.rowsPerPageLabel}
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12.5px] font-medium text-slate-800 focus:outline-none"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <span
                  data-testid="bookings-range-indicator"
                  className="tabular font-medium text-slate-700"
                >
                  {rangeStart}–{rangeEnd} {copy.pageRangeConnector}{" "}
                  {totalBookings}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid="bookings-prev-page"
                    aria-label={copy.prevPageLabel}
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-35"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    data-testid="bookings-next-page"
                    aria-label={copy.nextPageLabel}
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-35"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Period Net Impact Bar */}
              <div className="mt-3 rounded-xl bg-slate-50/90 border border-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                <div
                  data-testid="bookings-period-summary"
                  className="flex flex-wrap items-center gap-1.5 text-slate-600"
                >
                  <span>{copy.footerThisPeriod}</span>
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span className="font-semibold text-slate-900 tabular">
                    {totalBookings} {copy.footerCompletedWord}
                  </span>
                  <span>·</span>
                  <span className="font-bold text-[#16A34A] tabular">
                    {formattedPeriodNet}
                  </span>
                </div>

                <div
                  data-testid="bookings-net-impact"
                  className="font-bold text-[#16A34A] tabular"
                >
                  {copy.footerNetImpact} {formattedPeriodNet}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    );
  };

  return (
    <PartnerHubShell
      brandName={vm.brandName}
      partnerUser={activeStaffProfile}
      staffProfiles={staffProfiles}
      activeUserId={activeStaffProfile.userId}
      onSelectUserProfile={handleSelectUserProfile}
      dataSourceMode={dataSourceMode}
      onChangeDataSourceMode={(nextMode) => {
        setDataSourceMode(nextMode);
        if (nextMode === "local-json") {
          setToastMessage(
            locale === "vi"
              ? "Đã chuyển nguồn dữ liệu sang Local JSON."
              : locale === "ko"
                ? "데이터 소스를 Local JSON으로 전환했습니다."
                : "Switched data source to Local JSON.",
          );
        }
      }}
      bqSyncing={bqSyncing}
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      openBiddingCount={biddingVm?.kpis.waitingRequestsCount ?? 0}
      unreadMessagesCount={messagesVm?.kpis.unreadCount ?? 0}
      toastMessage={toastMessage}
      onDismissToast={() => setToastMessage(null)}
      onSignOutSession={() => setSignedOut(true)}
      inboxMessages={vm.inboxMessages}
      inboxNotifications={vm.inboxNotifications}
      locale={locale}
      onChangeLocale={(next) => {
        setLocale(next);
        setAnalyzedTimeOverride(undefined);
      }}
      currency={currency}
      onChangeCurrency={setCurrency}
      propertyKey={effectivePropertyKey}
      properties={scopedProperties}
      selectedProperty={selectedScopedProperty}
      onChangeProperty={setPropertyKey}
      copy={copy}
      mCopy={mCopy}
      completedCount={totalBookings}
    >
      {renderActiveSection()}

      <BookingDetailModal
        booking={selectedBooking}
        onClose={() => setSelectedBookingRefId(null)}
        currency={currency}
        currencyRates={vm.currencyRates}
        copy={copy}
      />
    </PartnerHubShell>
  );
}

export default App;
