import type {
  AuctionSessionMasterRecord,
  DateRangeKey,
  MasterDataBundle,
} from "@/data";
import {
  formatBusinessMoney,
  formatDisplayDate,
  getDictionary,
  localizeAmenityTag,
  localizeGuestStayNote,
  type AppLocale,
  type CurrencyCode,
} from "@/lib/i18n";

export type PropertyFilterKey =
  | "all"
  | "br_mykhe"
  | "br_songhan"
  | "br_anthuong"
  | "stay_h11";

export interface PropertyOptionItem {
  key: PropertyFilterKey;
  label: string;
  shortName: string;
  districtLabel: string;
  roomsCount: number;
  badgeColor: string;
}

export interface OverviewDailyPoint {
  isoDate: string;
  dateLabel: string;
  tooltipDate: string;
  revenueVnd: number;
  bookingsCount: number;
  accepted: number;
  expired: number;
  rejected: number;
  cancelled: number;
}

export interface AdvisorCardItem {
  id: string;
  iconType: "trend" | "sparkles" | "award" | "alert" | "bulb" | "info";
  title: string;
  badgeText: string;
  badgeTone: "green" | "blue" | "amber" | "red" | "indigo";
  body: string;
}

export interface AdvisorPanelModel {
  pills: Array<{
    label: string;
    value: string;
    tone: "green" | "indigo" | "blue" | "amber" | "red";
  }>;
  analyzedAtText: string;
  cards: AdvisorCardItem[];
}

export interface BidBucketSummary {
  key: "accepted" | "expired" | "rejected" | "cancelled";
  label: string;
  definition: string;
  colorHex: string;
  count: number;
  sharePct: number;
  shareLabel: string;
}

export interface RecentBookingRow {
  bookingCode: string;
  refSessionId: string;
  propertyName: string;
  roomName: string;
  roomNumber: number;
  checkInIso: string;
  checkOutIso: string;
  checkInLabel: string;
  checkOutLabel: string;
  nights: number;
  paidAtLabel: string;
  netRevenueVnd: number;
  guestNote: string;
  amenities: string[];
}

export interface OverviewViewModel {
  selectedProperty: PropertyOptionItem;
  properties: PropertyOptionItem[];
  periodRangeLabel: string;
  kpis: {
    revenueVnd: number;
    revenueFormatted: string;
    totalBids: number;
    acceptRatePct: number;
    acceptRateFormatted: string;
    rating: number;
    ratingFormatted: string;
    reviewCount: number;
    autoBidPct: number;
    autoBidFormatted: string;
  };
  dailySeries: OverviewDailyPoint[];
  revenueAdvisor: AdvisorPanelModel;
  bidsBreakdown: {
    accepted: BidBucketSummary;
    expired: BidBucketSummary;
    rejected: BidBucketSummary;
    cancelled: BidBucketSummary;
    total: number;
    totalShareLabel: string;
  };
  bidsAdvisor: AdvisorPanelModel;
  trust: {
    overallRating: number;
    reviewCount: number;
    criteria: Array<{ key: string; label: string; score: number }>;
    eloScore: number;
    visibilitySubtitle: string;
    visibilityTone: "good" | "low";
  };
  completedBookings: RecentBookingRow[];
}

// Deterministic 30-day pattern for Stay Hotel H11 (newly onboarded property matching demo_new/1.png:
// 0 Accepted, 8 Expired, 67 Rejected, 0 Cancelled = 75 Total Bids over 30d)
const STAY_H11_30D_PATTERN: Array<{ expired: number; rejected: number }> = [
  { expired: 0, rejected: 2 },
  { expired: 0, rejected: 1 },
  { expired: 0, rejected: 2 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 1 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 3 },
  { expired: 0, rejected: 2 },
  { expired: 0, rejected: 8 },
  { expired: 0, rejected: 6 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 1 },
  { expired: 0, rejected: 1 },
  { expired: 0, rejected: 0 },
  { expired: 0, rejected: 10 },
  { expired: 0, rejected: 4 },
  { expired: 1, rejected: 3 },
  { expired: 1, rejected: 1 },
  { expired: 0, rejected: 6 },
  { expired: 0, rejected: 1 },
  { expired: 0, rejected: 1 },
  { expired: 0, rejected: 1 },
  { expired: 3, rejected: 3 },
  { expired: 1, rejected: 0 },
  { expired: 0, rejected: 0 },
  { expired: 1, rejected: 4 },
  { expired: 1, rejected: 6 },
];

function classifySessionOutcome(
  s: AuctionSessionMasterRecord,
): "accepted" | "expired" | "rejected" | "cancelled" | null {
  if (s.status === "live") return null;
  if (s.status === "won") return "accepted";
  if (s.status === "expired") return "expired";
  if (s.status === "partner_declined" || s.status === "auto_closed") {
    return "cancelled";
  }
  return "rejected";
}

function addIsoDays(isoDate: string, daysToAdd: number): string {
  const ms = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(ms)) return isoDate;
  const next = new Date(ms + daysToAdd * 86_400_000);
  return next.toISOString().slice(0, 10);
}

function parseStayIsoRange(
  stayDatesLabel: string | undefined,
  sessionDate: string,
  nights: number,
): { checkInIso: string; checkOutIso: string } {
  const year = sessionDate.slice(0, 4) || "2026";
  if (stayDatesLabel) {
    const m = stayDatesLabel.match(
      /(\d{1,2})\/(\d{1,2})\s*[–-]\s*(\d{1,2})\/(\d{1,2})/,
    );
    if (m) {
      const ciD = m[1].padStart(2, "0");
      const ciM = m[2].padStart(2, "0");
      const coD = m[3].padStart(2, "0");
      const coM = m[4].padStart(2, "0");
      return {
        checkInIso: `${year}-${ciM}-${ciD}`,
        checkOutIso: `${year}-${coM}-${coD}`,
      };
    }
  }
  const safeNights = Math.max(1, nights || 1);
  return {
    checkInIso: sessionDate,
    checkOutIso: addIsoDays(sessionDate, safeNights),
  };
}

function buildIsoDatesInWindow(startDate: string, endDate: string): string[] {
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  const days = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
  const list: string[] = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(startMs + i * 86_400_000);
    list.push(dt.toISOString().slice(0, 10));
  }
  return list;
}

function safePct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function buildPropertiesList(
  bundle: MasterDataBundle,
  locale: AppLocale,
): PropertyOptionItem[] {
  const hp = bundle.hotelProfile;
  const allLabel =
    locale === "vi"
      ? `${hp.hotelName} (Toàn hệ thống)`
      : locale === "ko"
        ? `${hp.hotelName} (전체 지점)`
        : `${hp.hotelName} (All Properties)`;

  const branchItems: PropertyOptionItem[] = hp.branches.map((b, idx) => ({
    key: b.id as PropertyFilterKey,
    label: b.name,
    shortName: b.shortName,
    districtLabel: b.district,
    roomsCount: b.totalRooms,
    badgeColor:
      idx === 0 ? "#2563EB" : idx === 1 ? "#0D9488" : "#7C3AED",
  }));

  const h11Label =
    locale === "vi"
      ? "Stay Hotel H11 (Cơ sở mới)"
      : locale === "ko"
        ? "Stay Hotel H11 (신규 지점)"
        : "Stay Hotel H11";

  return [
    {
      key: "all",
      label: allLabel,
      shortName: hp.hotelName,
      districtLabel: hp.city,
      roomsCount: hp.totalRooms,
      badgeColor: "#1D4ED8",
    },
    ...branchItems,
    {
      key: "stay_h11",
      label: h11Label,
      shortName: "Stay Hotel H11",
      districtLabel:
        locale === "vi"
          ? "Cơ sở mới kích hoạt"
          : locale === "ko"
            ? "신규 입점 숙소"
            : "Newly Onboarded",
      roomsCount: 18,
      badgeColor: "#64748B",
    },
  ];
}

export function buildOverviewViewModel(
  bundle: MasterDataBundle,
  params: {
    propertyKey: PropertyFilterKey;
    periodKey: DateRangeKey;
    locale: AppLocale;
    currency: CurrencyCode;
    analyzedTimeText?: string;
  },
): OverviewViewModel {
  const { propertyKey, periodKey, locale, currency } = params;
  const copy = getDictionary(locale);
  const properties = buildPropertiesList(bundle, locale);
  const selectedProperty =
    properties.find((p) => p.key === propertyKey) ?? properties[0];

  const periodMeta = bundle.systemBenchmarks.periodsMeta[periodKey];
  const isoDates = buildIsoDatesInWindow(
    periodMeta.startDate,
    periodMeta.endDate,
  );
  const timeStamp =
    params.analyzedTimeText ??
    (locale === "vi" ? "15:08" : locale === "ko" ? "오후 03:08" : "03:08 PM");

  // Branch: Stay Hotel H11 (newly onboarded zero-booking state matching demo_new/1.png)
  if (propertyKey === "stay_h11") {
    const sliceLen = isoDates.length;
    const patternSlice = STAY_H11_30D_PATTERN.slice(
      Math.max(0, STAY_H11_30D_PATTERN.length - sliceLen),
    );

    const dailySeries: OverviewDailyPoint[] = isoDates.map((iso, idx) => {
      const p = patternSlice[idx] ?? { expired: 0, rejected: 1 };
      return {
        isoDate: iso,
        dateLabel: formatDisplayDate(iso, locale, false),
        tooltipDate: formatDisplayDate(iso, locale, true),
        revenueVnd: 0,
        bookingsCount: 0,
        accepted: 0,
        expired: p.expired,
        rejected: p.rejected,
        cancelled: 0,
      };
    });

    const totalExpired = dailySeries.reduce((s, d) => s + d.expired, 0);
    const totalRejected = dailySeries.reduce((s, d) => s + d.rejected, 0);
    const totalBids = totalExpired + totalRejected;
    const expPct = safePct(totalExpired, totalBids);
    const rejPct = safePct(totalRejected, totalBids);
    const zeroMoney = formatBusinessMoney(0, currency, { compact: false });

    return {
      selectedProperty,
      properties,
      periodRangeLabel: `${formatDisplayDate(periodMeta.startDate, locale, true)} – ${formatDisplayDate(periodMeta.endDate, locale, true)}`,
      kpis: {
        revenueVnd: 0,
        revenueFormatted: formatBusinessMoney(0, currency, {
          compact: true,
          withPlus: true,
        }),
        totalBids,
        acceptRatePct: 0,
        acceptRateFormatted: "0.0%",
        rating: 0,
        ratingFormatted: "★0.0",
        reviewCount: 0,
        autoBidPct: 100,
        autoBidFormatted: "100.0%",
      },
      dailySeries,
      revenueAdvisor: {
        pills: [
          { label: copy.pillPeriodRevenue, value: zeroMoney, tone: "green" },
          { label: copy.pillCompletedBookings, value: "0", tone: "indigo" },
          { label: copy.pillAvgBooking, value: zeroMoney, tone: "blue" },
        ],
        analyzedAtText: `${copy.analyzedAtPrefix} ${timeStamp}`,
        cards: [
          {
            id: "baseline-zero",
            iconType: "info",
            title:
              locale === "vi"
                ? "Giai đoạn khởi động cơ sở mới"
                : locale === "ko"
                  ? "신규 지점 초기 안정화 구간"
                  : "goodNstay AI: Stable Revenue Baseline",
            badgeText:
              locale === "vi"
                ? "Cân đối giá chào"
                : locale === "ko"
                  ? "요금 점검"
                  : "Pricing & ADR",
            badgeTone: "indigo",
            body:
              locale === "vi"
                ? "Cơ sở đang gửi báo giá đều đặn nhưng chưa phát sinh đơn chốt đầu tiên. Bạn nên giảm nhẹ giá chào 5–10% hoặc tặng kèm bữa sáng để thu hút những lượt khách mở hàng và lấy đánh giá đầu tiên."
                : locale === "ko"
                  ? "입찰은 꾸준히 발송되고 있으나 아직 첫 확정 예약이 발생하지 않았습니다. 첫 투숙객 유치와 초기 리뷰 확보를 위해 시작 요금을 소폭 낮추거나 조식 혜택을 추가해 보세요."
                  : "Revenue flow is maintaining predictable baseline pacing. Review opening room rates relative to nearby properties to capture your first completed bookings and guest reviews.",
          },
        ],
      },
      bidsBreakdown: {
        accepted: {
          key: "accepted",
          label: copy.statusAccepted,
          definition: copy.statusAcceptedDef,
          colorHex: "#22C55E",
          count: 0,
          sharePct: 0,
          shareLabel: "0.0%",
        },
        expired: {
          key: "expired",
          label: copy.statusExpired,
          definition: copy.statusExpiredDef,
          colorHex: "#F59E0B",
          count: totalExpired,
          sharePct: expPct,
          shareLabel: `${expPct.toFixed(1)}%`,
        },
        rejected: {
          key: "rejected",
          label: copy.statusRejected,
          definition: copy.statusRejectedDef,
          colorHex: "#EF4444",
          count: totalRejected,
          sharePct: rejPct,
          shareLabel: `${rejPct.toFixed(1)}%`,
        },
        cancelled: {
          key: "cancelled",
          label: copy.statusCancelled,
          definition: copy.statusCancelledDef,
          colorHex: "#9CA3AF",
          count: 0,
          sharePct: 0,
          shareLabel: "0.0%",
        },
        total: totalBids,
        totalShareLabel: totalBids > 0 ? "100%" : "0%",
      },
      bidsAdvisor: {
        pills: [
          {
            label: copy.pillAcceptConversion,
            value: "0.0%",
            tone: "green",
          },
          {
            label: copy.pillExpiredCost,
            value: `${expPct.toFixed(1)}%`,
            tone: "amber",
          },
          {
            label: copy.pillRejectionRate,
            value: `${rejPct.toFixed(1)}%`,
            tone: "red",
          },
        ],
        analyzedAtText: `${copy.analyzedAtPrefix} ${timeStamp}`,
        cards: buildBidsAdvisorCards({
          locale,
          acceptPct: 0,
          expiredPct: expPct,
          rejectedPct: rejPct,
        }),
      },
      trust: {
        overallRating: 0,
        reviewCount: 0,
        criteria: [
          { key: "cleanliness", label: copy.criteriaCleanliness, score: 0 },
          { key: "service", label: copy.criteriaService, score: 0 },
          { key: "checkin", label: copy.criteriaCheckin, score: 0 },
          { key: "amenities", label: copy.criteriaAmenities, score: 0 },
          { key: "value", label: copy.criteriaValue, score: 0 },
        ],
        eloScore: 800,
        visibilityTone: "low",
        visibilitySubtitle:
          locale === "vi"
            ? "Mức hiển thị khởi điểm — Hoàn tất thêm đơn đặt phòng để được ưu tiên đẩy lên đầu danh sách"
            : locale === "ko"
              ? "초기 노출 단계 — 첫 확정 예약과 리뷰가 쌓이면 상단 노출 우선순위가 올라갑니다"
              : "Poor visibility",
      },
      completedBookings: [],
    };
  }

  // Active hotel chain or specific branch from master-data
  const branchMatch = (s: AuctionSessionMasterRecord) =>
    propertyKey === "all" || (s.branchId ?? "br_mykhe") === propertyKey;

  const historicalInWindow = bundle.auctionSessions.filter(
    (s) =>
      s.status !== "live" &&
      branchMatch(s) &&
      s.sessionDate >= periodMeta.startDate &&
      s.sessionDate <= periodMeta.endDate,
  );

  const byDateMap = new Map<string, OverviewDailyPoint>();
  for (const iso of isoDates) {
    byDateMap.set(iso, {
      isoDate: iso,
      dateLabel: formatDisplayDate(iso, locale, false),
      tooltipDate: formatDisplayDate(iso, locale, true),
      revenueVnd: 0,
      bookingsCount: 0,
      accepted: 0,
      expired: 0,
      rejected: 0,
      cancelled: 0,
    });
  }

  let autoCount = 0;
  for (const s of historicalInWindow) {
    const bucket = classifySessionOutcome(s);
    if (!bucket) continue;
    if (s.bidMode === "auto") autoCount += 1;

    const pt = byDateMap.get(s.sessionDate);
    if (pt) {
      pt[bucket] += 1;
      if (bucket === "accepted") {
        const earned =
          s.hotelEarnedBase ??
          (s.offeredBasePrice ?? 0) * Math.max(1, s.nights || 1);
        pt.revenueVnd += earned;
        pt.bookingsCount += 1;
      }
    }
  }

  const dailySeries = isoDates.map((iso) => byDateMap.get(iso)!);
  const totalAccepted = dailySeries.reduce((s, d) => s + d.accepted, 0);
  const totalExpired = dailySeries.reduce((s, d) => s + d.expired, 0);
  const totalRejected = dailySeries.reduce((s, d) => s + d.rejected, 0);
  const totalCancelled = dailySeries.reduce((s, d) => s + d.cancelled, 0);
  const totalBids = totalAccepted + totalExpired + totalRejected + totalCancelled;
  const revenueVnd = dailySeries.reduce((s, d) => s + d.revenueVnd, 0);

  const acceptRatePct = safePct(totalAccepted, totalBids);
  const expiredPct = safePct(totalExpired, totalBids);
  const rejectedPct = safePct(totalRejected, totalBids);
  const cancelledPct = safePct(totalCancelled, totalBids);
  const autoBidPct =
    totalBids > 0
      ? safePct(autoCount, totalBids)
      : bundle.hotelProfile.autoBidEnabled
        ? 100
        : 0;

  // Previous period revenue for growth comparison
  const prevRevenueVnd =
    propertyKey === "all"
      ? periodMeta.previousNetRevenue
      : (bundle.hotelProfile.branches.find((b) => b.id === propertyKey)
          ?.previousPeriodRevenue[periodKey] ?? 0);

  const growthPct =
    prevRevenueVnd > 0
      ? Number((((revenueVnd - prevRevenueVnd) / prevRevenueVnd) * 100).toFixed(1))
      : 0;

  // Build globally stable hotel-wide Booking ID map (#43..#71) across all won sessions
  const allWonSortedNewestFirst = bundle.auctionSessions
    .filter((s) => s.status === "won")
    .sort((a, b) => {
      if (a.sessionDate !== b.sessionDate) {
        return b.sessionDate.localeCompare(a.sessionDate);
      }
      return (b.timeLabel ?? "").localeCompare(a.timeLabel ?? "");
    });
  const globalBaseSeq = 42 + allWonSortedNewestFirst.length;
  const bookingCodeBySessionId = new Map<string, string>();
  allWonSortedNewestFirst.forEach((s, idx) => {
    bookingCodeBySessionId.set(s.id, `#${globalBaseSeq - idx}`);
  });

  // Build sorted completed bookings list for active property & period
  const wonSessions = historicalInWindow
    .filter((s) => s.status === "won")
    .sort((a, b) => {
      if (a.sessionDate !== b.sessionDate) {
        return b.sessionDate.localeCompare(a.sessionDate);
      }
      return (b.timeLabel ?? "").localeCompare(a.timeLabel ?? "");
    });

  const completedBookings: RecentBookingRow[] = wonSessions.map((s, idx) => {
    const bookingCode =
      bookingCodeBySessionId.get(s.id) ?? `#${globalBaseSeq - idx}`;
    const { checkInIso, checkOutIso } = parseStayIsoRange(
      s.stayDatesLabel,
      s.sessionDate,
      s.nights,
    );
    const earned =
      s.hotelEarnedBase ??
      (s.offeredBasePrice ?? 0) * Math.max(1, s.nights || 1);
    const branchObj = bundle.hotelProfile.branches.find(
      (b) => b.id === s.branchId,
    );
    const propName =
      branchObj?.name ?? bundle.hotelProfile.hotelName;
    const paidTime = s.timeLabel ?? "15:40";
    const safeNights = Math.max(1, s.nights || 1);

    return {
      bookingCode,
      refSessionId: s.id,
      propertyName: propName,
      roomName: s.offeredRoom ?? s.roomCategory ?? "Deluxe Double",
      roomNumber: s.lockedRoomNumber ?? 108,
      checkInIso,
      checkOutIso,
      checkInLabel: formatDisplayDate(checkInIso, locale, true),
      checkOutLabel: formatDisplayDate(checkOutIso, locale, true),
      nights: safeNights,
      paidAtLabel: `${formatDisplayDate(s.sessionDate, locale, true)} ${paidTime}`,
      netRevenueVnd: earned,
      guestNote: localizeGuestStayNote(s.guestRequestTitle, safeNights, locale),
      amenities: (s.amenitiesTags ?? ["Wifi"]).map((tag) =>
        localizeAmenityTag(tag, locale),
      ),
    };
  });

  const avgPerBookingVnd =
    completedBookings.length > 0
      ? Math.round(revenueVnd / completedBookings.length)
      : 0;

  // Peak day lookup
  const peakPoint = dailySeries.reduce<OverviewDailyPoint | null>(
    (best, cur) => (!best || cur.revenueVnd > best.revenueVnd ? cur : best),
    null,
  );

  const revenueAdvisorCards: AdvisorCardItem[] =
    revenueVnd <= 0
      ? [
          {
            id: "zero-rev",
            iconType: "info",
            title:
              locale === "vi"
                ? "Chưa phát sinh đơn hoàn tất trong kỳ"
                : locale === "ko"
                  ? "해당 기간 완료된 예약 없음"
                  : "goodNstay AI: Stable Revenue Baseline",
            badgeText:
              locale === "vi"
                ? "Cân đối giá chào"
                : locale === "ko"
                  ? "요금 점검"
                  : "Pricing & ADR",
            badgeTone: "indigo",
            body:
              locale === "vi"
                ? "Chưa có đơn đặt phòng hoàn tất trong khoảng thời gian này. Hãy kiểm tra lại mức giá chào buổi tối và đảm bảo phòng trống đã được mở bán."
                : locale === "ko"
                  ? "선택한 기간에 확정된 예약이 없습니다. 저녁 시간대 제안 요금과 잔여 객실 오픈 상태를 점검해 보세요."
                  : "No completed bookings recorded in this window. Keep monitoring evening offer rates to capture incoming demand.",
          },
        ]
      : [
          {
            id: "momentum",
            iconType: "trend",
            title:
              locale === "vi"
                ? `Nhịp doanh thu ổn định (${growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`})`
                : locale === "ko"
                  ? `수익 흐름 추이 (${growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`})`
                  : `goodNstay AI: Revenue Momentum (${growthPct >= 0 ? `+${growthPct}%` : `${growthPct}%`})`,
            badgeText:
              locale === "vi"
                ? "Nhu cầu đặt tốt"
                : locale === "ko"
                  ? "수요 양호"
                  : "High Demand",
            badgeTone: "green",
            body:
              locale === "vi"
                ? `Khách sạn đã chốt thành công ${completedBookings.length} đơn trong kỳ. Vào các tối cuối tuần khách hỏi phòng đông, bạn có thể giữ mức giá tốt thay vì giảm sâu.`
                : locale === "ko"
                  ? `기간 내 ${completedBookings.length}건의 확정 예약을 달성했습니다. 주말 성수기에는 무리한 할인 대신 적정 요금을 유지해 수익성을 지키세요.`
                  : `Your property completed ${completedBookings.length} bookings across the timeframe. Consider holding firm weekend rates to capture peak traveler demand.`,
          },
          {
            id: "avg-booking",
            iconType: "sparkles",
            title:
              locale === "vi"
                ? "Tối ưu thu nhập trên mỗi đơn đặt"
                : locale === "ko"
                  ? "예약당 평균 수익 최적화"
                  : "goodNstay AI: Booking Value Optimization",
            badgeText:
              locale === "vi"
                ? "Tăng giá trị đơn"
                : locale === "ko"
                  ? "객단가 향상"
                  : "Yield Growth",
            badgeTone: "blue",
            body:
              locale === "vi"
                ? `Trung bình mỗi đơn hoàn tất mang về ${formatBusinessMoney(avgPerBookingVnd, currency)}. Bạn có thể gợi ý khách nâng lên phòng rộng hoặc kèm bữa sáng để tăng doanh thu trên mỗi lượt ở.`
                : locale === "ko"
                  ? `예약 1건당 평균 실수령액은 ${formatBusinessMoney(avgPerBookingVnd, currency)}입니다. 상위 객실 타입이나 조식 포함 구성을 함께 제안해 객단가를 높여 보세요.`
                  : `Average net payout stands at ${formatBusinessMoney(avgPerBookingVnd, currency)} per booking. Offer room upgrades or breakfast packages to lift total stay value.`,
          },
          {
            id: "peak-window",
            iconType: "award",
            title:
              locale === "vi"
                ? "Ngày đông khách nhất trong kỳ"
                : locale === "ko"
                  ? "최고 수익 발생일 확인"
                  : "goodNstay AI: Peak Demand Window Identified",
            badgeText:
              locale === "vi"
                ? "Cao điểm đặt phòng"
                : locale === "ko"
                  ? "피크 구간"
                  : "High Demand",
            badgeTone: "green",
            body:
              locale === "vi"
                ? `Ngày đạt doanh thu cao nhất là ${peakPoint?.tooltipDate ?? ""} với ${formatBusinessMoney(peakPoint?.revenueVnd ?? 0, currency)} (${peakPoint?.bookingsCount ?? 0} đơn). Với những ngày tương tự sắp tới, nên ưu tiên nhận khách lưu trú từ 2 đêm trở lên.`
                : locale === "ko"
                  ? `가장 높은 수익을 기록한 날은 ${peakPoint?.tooltipDate ?? ""} (${formatBusinessMoney(peakPoint?.revenueVnd ?? 0, currency)}, ${peakPoint?.bookingsCount ?? 0}건)입니다. 유사한 성수기 일정에는 2박 이상 연박 고객을 우선 유치해 보세요.`
                  : `Highest daily revenue was ${formatBusinessMoney(peakPoint?.revenueVnd ?? 0, currency)} on ${peakPoint?.tooltipDate ?? ""} with ${peakPoint?.bookingsCount ?? 0} bookings. Prioritize multi-night stays on upcoming peak dates.`,
          },
        ];

  const hp = bundle.hotelProfile;
  const rc = hp.reviewCriteria5;

  return {
    selectedProperty,
    properties,
    periodRangeLabel: `${formatDisplayDate(periodMeta.startDate, locale, true)} – ${formatDisplayDate(periodMeta.endDate, locale, true)}`,
    kpis: {
      revenueVnd,
      revenueFormatted: formatBusinessMoney(revenueVnd, currency, {
        compact: true,
        withPlus: revenueVnd > 0,
      }),
      totalBids,
      acceptRatePct,
      acceptRateFormatted: `${acceptRatePct.toFixed(1)}%`,
      rating: hp.reviewRating5,
      ratingFormatted: `★${hp.reviewRating5.toFixed(1)}`,
      reviewCount: hp.reviewCount,
      autoBidPct,
      autoBidFormatted: `${autoBidPct.toFixed(1)}%`,
    },
    dailySeries,
    revenueAdvisor: {
      pills: [
        {
          label: copy.pillPeriodRevenue,
          value: formatBusinessMoney(revenueVnd, currency, {
            withPlus: revenueVnd > 0,
          }),
          tone: "green",
        },
        {
          label: copy.pillCompletedBookings,
          value: String(completedBookings.length),
          tone: "indigo",
        },
        {
          label: copy.pillAvgBooking,
          value: formatBusinessMoney(avgPerBookingVnd, currency, {
            withPlus: avgPerBookingVnd > 0,
          }),
          tone: "blue",
        },
      ],
      analyzedAtText: `${copy.analyzedAtPrefix} ${timeStamp}`,
      cards: revenueAdvisorCards,
    },
    bidsBreakdown: {
      accepted: {
        key: "accepted",
        label: copy.statusAccepted,
        definition: copy.statusAcceptedDef,
        colorHex: "#22C55E",
        count: totalAccepted,
        sharePct: acceptRatePct,
        shareLabel: `${acceptRatePct.toFixed(1)}%`,
      },
      expired: {
        key: "expired",
        label: copy.statusExpired,
        definition: copy.statusExpiredDef,
        colorHex: "#F59E0B",
        count: totalExpired,
        sharePct: expiredPct,
        shareLabel: `${expiredPct.toFixed(1)}%`,
      },
      rejected: {
        key: "rejected",
        label: copy.statusRejected,
        definition: copy.statusRejectedDef,
        colorHex: "#EF4444",
        count: totalRejected,
        sharePct: rejectedPct,
        shareLabel: `${rejectedPct.toFixed(1)}%`,
      },
      cancelled: {
        key: "cancelled",
        label: copy.statusCancelled,
        definition: copy.statusCancelledDef,
        colorHex: "#9CA3AF",
        count: totalCancelled,
        sharePct: cancelledPct,
        shareLabel: `${cancelledPct.toFixed(1)}%`,
      },
      total: totalBids,
      totalShareLabel: totalBids > 0 ? "100%" : "0%",
    },
    bidsAdvisor: {
      pills: [
        {
          label: copy.pillAcceptConversion,
          value: `${acceptRatePct.toFixed(1)}%`,
          tone: "green",
        },
        {
          label: copy.pillExpiredCost,
          value: `${expiredPct.toFixed(1)}%`,
          tone: "amber",
        },
        {
          label: copy.pillRejectionRate,
          value: `${rejectedPct.toFixed(1)}%`,
          tone: "red",
        },
      ],
      analyzedAtText: `${copy.analyzedAtPrefix} ${timeStamp}`,
      cards: buildBidsAdvisorCards({
        locale,
        acceptPct: acceptRatePct,
        expiredPct,
        rejectedPct,
      }),
    },
    trust: {
      overallRating: hp.reviewRating5,
      reviewCount: hp.reviewCount,
      criteria: [
        {
          key: "amenities",
          label: copy.criteriaAmenities,
          score: rc.amenitiesExpectation,
        },
        {
          key: "checkin",
          label: copy.criteriaCheckin,
          score: rc.checkinExperience,
        },
        {
          key: "cleanliness",
          label: copy.criteriaCleanliness,
          score: rc.roomComfortCleanliness,
        },
        {
          key: "service",
          label: copy.criteriaService,
          score: rc.staffHospitality,
        },
        {
          key: "value",
          label: copy.criteriaValue,
          score: rc.valueForMoney,
        },
      ],
      eloScore: hp.eloScore,
      visibilityTone: "good",
      visibilitySubtitle:
        locale === "vi"
          ? "Hiển thị ưu tiên cao — Báo giá của khách sạn được ưu tiên đưa lên nhóm đầu cho khách xem"
          : locale === "ko"
            ? "우수 노출 등급 — 고객 검색 시 호텔의 제안이 상단에 우선 표시됩니다"
            : "High visibility · Top 12% in Da Nang",
    },
    completedBookings,
  };
}

function buildBidsAdvisorCards(params: {
  locale: AppLocale;
  acceptPct: number;
  expiredPct: number;
  rejectedPct: number;
}): AdvisorCardItem[] {
  const { locale, acceptPct, expiredPct, rejectedPct } = params;

  if (locale === "vi") {
    return [
      {
        id: "conv-gap",
        iconType: "alert",
        title:
          acceptPct >= 35
            ? `Tỷ lệ khách chốt đạt mức tốt (${acceptPct.toFixed(1)}%)`
            : `Dư địa tăng thêm khách chốt (${acceptPct.toFixed(1)}%)`,
        badgeText: "Cân đối giá",
        badgeTone: "amber",
        body:
          acceptPct >= 35
            ? "Tỷ lệ khách đồng ý đặt phòng của bạn đang cao hơn mặt bằng chung (35%). Hãy tiếp tục duy trì chất lượng hình ảnh phòng và ưu đãi ăn sáng."
            : "Tỷ lệ chốt đang thấp hơn ngưỡng tối ưu của khu vực (35%). Hãy tham khảo lại mặt bằng giá của các khách sạn lân cận vào ngày thường để tăng sức cạnh tranh.",
      },
      {
        id: "resp-cadence",
        iconType: "bulb",
        title: "Tốc độ phản hồi khách hỏi phòng",
        badgeText: "Phản hồi nhanh",
        badgeTone: "indigo",
        body: `Tỷ lệ lỡ đơn do quá hạn đang ở mức ${expiredPct.toFixed(1)}%. Hãy luôn bật chế độ Báo giá tự động vào ca trưa và sau 22h đêm để khách hỏi lúc nào cũng nhận được giá ngay.`,
      },
      {
        id: "price-resistance",
        iconType: "alert",
        title: "Nhận diện ngân sách khách mong muốn",
        badgeText: "Giá chào phòng",
        badgeTone: "red",
        body: `Có ${rejectedPct.toFixed(1)}% lượt báo giá khách xem xong nhưng chọn nơi khác. Với những ngày còn nhiều phòng trống, bạn có thể hạ nhẹ mức giá tối thiểu hoặc tặng kèm đón sân bay/trả phòng trễ.`,
      },
    ];
  }

  if (locale === "ko") {
    return [
      {
        id: "conv-gap",
        iconType: "alert",
        title: `예약 전환율 점검 (${acceptPct.toFixed(1)}%)`,
        badgeText: "요금 마진",
        badgeTone: "amber",
        body:
          "권장 전환율 기준(35%)과 비교해 평일 객실 제안 요금 경쟁력을 점검하면 추가 예약을 확보할 수 있습니다.",
      },
      {
        id: "resp-cadence",
        iconType: "bulb",
        title: "안정적인 응답 속도 유지",
        badgeText: "응답 속도",
        badgeTone: "indigo",
        body: `시간 만료 비율이 ${expiredPct.toFixed(1)}% 수준입니다. 심야 시간대에도 자동 입찰 규칙을 유지해 예약 기회를 놓치지 마세요.`,
      },
      {
        id: "price-resistance",
        iconType: "alert",
        title: "고객 희망 예산 대비 가격 민감도",
        badgeText: "제안 요금",
        badgeTone: "red",
        body: `미선택 비율(${rejectedPct.toFixed(1)}%)은 고객 예산과 제안 요금 간 차이가 있음을 시사합니다. 비수기 최소 할인 폭을 유연하게 조정해 보세요.`,
      },
    ];
  }

  return [
    {
      id: "conv-gap",
      iconType: "alert",
      title: `goodNstay AI: Conversion Opportunity (${acceptPct.toFixed(1)}%)`,
      badgeText: "Price Margin",
      badgeTone: "amber",
      body:
        acceptPct >= 35
          ? "Acceptance rate is outperforming the 35% district benchmark. Keep room photos and breakfast inclusions consistent."
          : "Acceptance rate is below optimal benchmark (35%). Review price points on competing properties in your district to ensure offer competitiveness.",
    },
    {
      id: "resp-cadence",
      iconType: "bulb",
      title: "goodNstay AI: Healthy Response Cadence",
      badgeText: "Response Speed",
      badgeTone: "indigo",
      body: `Expired bids are kept at ${expiredPct.toFixed(1)}%. Ensure auto-bid standby rules remain active during overnight hours.`,
    },
    {
      id: "price-resistance",
      iconType: "alert",
      title: "goodNstay AI: Guest Price Sensitivity",
      badgeText: "Pricing & ADR",
      badgeTone: "red",
      body: `Rejection rate of ${rejectedPct.toFixed(1)}% suggests some offers exceed traveler target budgets. Adjust minimum acceptable discount margins on low-occupancy nights.`,
    },
  ];
}
