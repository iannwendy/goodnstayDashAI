import type {
  AppLocale,
  BidOutcomeStatus,
  CurrencyCode,
  CurrencyRateMap,
  DateRangeKey,
  MasterDataBundle,
  PropertyId,
} from "@/data";
import {
  formatBusinessMoney,
  formatDisplayDate,
  getDictionary,
  localizeAmenityCode,
} from "@/lib/i18n";

export type PropertyFilterKey = "all" | PropertyId;

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
  key: BidOutcomeStatus;
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
  guestsCount: number;
  paidAtLabel: string;
  netRevenueVnd: number;
  guestNote: string;
  amenities: string[];
}

export interface InboxMessageViewItem {
  id: string;
  bookingCode: string;
  guestName: string;
  receivedAt: string;
  unread: boolean;
  preview: string;
}

export interface InboxNotificationViewItem {
  id: string;
  tone: "emerald" | "indigo" | "amber";
  createdAt: string;
  text: string;
}

export interface OverviewViewModel {
  brandName: string;
  currencyRates: CurrencyRateMap;
  partnerUser: {
    displayName: string;
    initials: string;
    roleBadge: string;
  };
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
  inboxMessages: InboxMessageViewItem[];
  inboxNotifications: InboxNotificationViewItem[];
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
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function buildPropertiesList(
  bundle: MasterDataBundle,
  locale: AppLocale,
): PropertyOptionItem[] {
  const cfg = bundle.hubConfig;
  return [
    {
      key: "all",
      label: cfg.chainOverview.label[locale],
      shortName: cfg.chainOverview.shortName[locale],
      districtLabel: cfg.chainOverview.district[locale],
      roomsCount: cfg.chainOverview.roomsCount,
      badgeColor: cfg.chainOverview.badgeColor,
    },
    ...cfg.properties.map((p) => ({
      key: p.id as PropertyFilterKey,
      label: p.label[locale],
      shortName: p.shortName[locale],
      districtLabel: p.district[locale],
      roomsCount: p.roomsCount,
      badgeColor: p.badgeColor,
    })),
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
  const cfg = bundle.hubConfig;
  const rates = cfg.currencyRates;
  const copy = getDictionary(locale);

  const properties = buildPropertiesList(bundle, locale);
  const selectedProperty =
    properties.find((p) => p.key === propertyKey) ?? properties[0];

  const isChainAll = propertyKey === "all";
  const selectedPropMaster = !isChainAll
    ? cfg.properties.find((p) => p.id === propertyKey)
    : undefined;
  const chainMemberIds = new Set(
    cfg.properties.filter((p) => p.isChainMember).map((p) => p.id),
  );
  const propertyLookup = new Map(cfg.properties.map((p) => [p.id, p]));

  const periodMeta = cfg.periodsMeta[periodKey];
  const isoDates = buildIsoDatesInWindow(
    periodMeta.startDate,
    periodMeta.endDate,
  );
  const timeStamp =
    params.analyzedTimeText ??
    (locale === "vi" ? "15:08" : locale === "ko" ? "오후 03:08" : "03:08 PM");

  const recordsInWindow = bundle.bidRecords.filter(
    (r) =>
      (isChainAll
        ? chainMemberIds.has(r.propertyId)
        : r.propertyId === propertyKey) &&
      r.sessionDate >= periodMeta.startDate &&
      r.sessionDate <= periodMeta.endDate,
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
  for (const rec of recordsInWindow) {
    if (rec.bidMode === "auto") autoCount += 1;
    const pt = byDateMap.get(rec.sessionDate);
    if (!pt) continue;

    pt[rec.status] += 1;
    if (rec.status === "accepted") {
      const earned =
        rec.netRevenueVnd ??
        rec.offeredRatePerNightVnd * Math.max(1, rec.nights || 1);
      pt.revenueVnd += earned;
      pt.bookingsCount += 1;
    }
  }

  const dailySeries = isoDates.map((iso) => byDateMap.get(iso)!);
  const totalAccepted = dailySeries.reduce((s, d) => s + d.accepted, 0);
  const totalExpired = dailySeries.reduce((s, d) => s + d.expired, 0);
  const totalRejected = dailySeries.reduce((s, d) => s + d.rejected, 0);
  const totalCancelled = dailySeries.reduce((s, d) => s + d.cancelled, 0);
  const totalBids =
    totalAccepted + totalExpired + totalRejected + totalCancelled;
  const revenueVnd = dailySeries.reduce((s, d) => s + d.revenueVnd, 0);

  const acceptRatePct = safePct(totalAccepted, totalBids);
  const expiredPct = safePct(totalExpired, totalBids);
  const rejectedPct = safePct(totalRejected, totalBids);
  const cancelledPct = safePct(totalCancelled, totalBids);

  const activeAutoBidDefault = isChainAll
    ? cfg.chainOverview.autoBidEnabled
    : (selectedPropMaster?.autoBidEnabled ?? true);
  const autoBidPct =
    totalBids > 0
      ? safePct(autoCount, totalBids)
      : activeAutoBidDefault
        ? 100
        : 0;

  const prevRevenueVnd = isChainAll
    ? periodMeta.previousNetRevenueVnd
    : (selectedPropMaster?.previousPeriodRevenueVnd[periodKey] ?? 0);

  const growthPct =
    prevRevenueVnd > 0
      ? Number(
          (((revenueVnd - prevRevenueVnd) / prevRevenueVnd) * 100).toFixed(1),
        )
      : 0;

  // Build sorted completed bookings list from explicit master-data records
  const acceptedRecords = recordsInWindow
    .filter((r) => r.status === "accepted")
    .sort((a, b) => {
      if (a.sessionDate !== b.sessionDate) {
        return b.sessionDate.localeCompare(a.sessionDate);
      }
      return b.timeLabel.localeCompare(a.timeLabel);
    });

  const completedBookings: RecentBookingRow[] = acceptedRecords.map((r) => {
    const propMeta = propertyLookup.get(r.propertyId);
    const propName =
      propMeta?.label[locale] ?? cfg.chainOverview.shortName[locale];
    const checkInIso = r.checkInDate ?? r.sessionDate;
    const checkOutIso = r.checkOutDate ?? r.sessionDate;
    const safeNights = Math.max(1, r.nights || 1);
    const earned =
      r.netRevenueVnd ?? r.offeredRatePerNightVnd * safeNights;

    return {
      bookingCode: r.bookingCode ?? `#${r.id}`,
      refSessionId: r.id,
      propertyName: propName,
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
      amenities: (r.amenities ?? ["wifi"]).map((code) =>
        localizeAmenityCode(code, locale),
      ),
    };
  });

  const avgPerBookingVnd =
    completedBookings.length > 0
      ? Math.round(revenueVnd / completedBookings.length)
      : 0;

  const peakPoint = dailySeries.reduce<OverviewDailyPoint | null>(
    (best, cur) => (!best || cur.revenueVnd > best.revenueVnd ? cur : best),
    null,
  );

  const isNewlyOnboardedProperty =
    !isChainAll &&
    !selectedPropMaster?.isChainMember &&
    (selectedPropMaster?.reviewCount ?? 0) === 0;

  const revenueAdvisorCards: AdvisorCardItem[] =
    revenueVnd <= 0
      ? [
          isNewlyOnboardedProperty
            ? {
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
              }
            : {
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
                ? `Trung bình mỗi đơn hoàn tất mang về ${formatBusinessMoney(avgPerBookingVnd, currency, { rates })}. Bạn có thể gợi ý khách nâng lên phòng rộng hoặc kèm bữa sáng để tăng doanh thu trên mỗi lượt ở.`
                : locale === "ko"
                  ? `예약 1건당 평균 실수령액은 ${formatBusinessMoney(avgPerBookingVnd, currency, { rates })}입니다. 상위 객실 타입이나 조식 포함 구성을 함께 제안해 객단가를 높여 보세요.`
                  : `Average net payout stands at ${formatBusinessMoney(avgPerBookingVnd, currency, { rates })} per booking. Offer room upgrades or breakfast packages to lift total stay value.`,
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
                ? `Ngày đạt doanh thu cao nhất là ${peakPoint?.tooltipDate ?? ""} với ${formatBusinessMoney(peakPoint?.revenueVnd ?? 0, currency, { rates })} (${peakPoint?.bookingsCount ?? 0} đơn). Với những ngày tương tự sắp tới, nên ưu tiên nhận khách lưu trú từ 2 đêm trở lên.`
                : locale === "ko"
                  ? `가장 높은 수익을 기록한 날은 ${peakPoint?.tooltipDate ?? ""} (${formatBusinessMoney(peakPoint?.revenueVnd ?? 0, currency, { rates })}, ${peakPoint?.bookingsCount ?? 0}건)입니다. 유사한 성수기 일정에는 2박 이상 연박 고객을 우선 유치해 보세요.`
                  : `Highest daily revenue was ${formatBusinessMoney(peakPoint?.revenueVnd ?? 0, currency, { rates })} on ${peakPoint?.tooltipDate ?? ""} with ${peakPoint?.bookingsCount ?? 0} bookings. Prioritize multi-night stays on upcoming peak dates.`,
          },
        ];

  const trustSource = isChainAll
    ? cfg.chainOverview
    : (selectedPropMaster ?? cfg.chainOverview);
  const rc = trustSource.reviewCriteria5;

  const inboxMessages: InboxMessageViewItem[] = bundle.hubInbox.messages
    .filter((m) =>
      isChainAll
        ? chainMemberIds.has(m.propertyId)
        : m.propertyId === propertyKey,
    )
    .map((m) => ({
      id: m.id,
      bookingCode: m.bookingCode,
      guestName: m.guestName,
      receivedAt: m.receivedAt,
      unread: m.unread,
      preview: m.preview[locale],
    }));

  const inboxNotifications: InboxNotificationViewItem[] =
    bundle.hubInbox.notifications
      .filter((n) => {
        if (isChainAll) {
          return n.scope === "chain" || chainMemberIds.has(n.scope);
        }
        if (selectedPropMaster?.isChainMember) {
          return n.scope === "chain" || n.scope === propertyKey;
        }
        return n.scope === propertyKey;
      })
      .map((n) => ({
        id: n.id,
        tone: n.tone,
        createdAt: n.createdAt,
        text: n.text[locale],
      }));

  return {
    brandName: cfg.brandName,
    currencyRates: rates,
    partnerUser: {
      displayName: cfg.partnerUser.displayName[locale],
      initials: cfg.partnerUser.initials[locale],
      roleBadge: cfg.partnerUser.roleBadge[locale],
    },
    selectedProperty,
    properties,
    periodRangeLabel: `${formatDisplayDate(periodMeta.startDate, locale, true)} – ${formatDisplayDate(periodMeta.endDate, locale, true)}`,
    kpis: {
      revenueVnd,
      revenueFormatted: formatBusinessMoney(revenueVnd, currency, {
        compact: true,
        withPlus: revenueVnd > 0,
        rates,
      }),
      totalBids,
      acceptRatePct,
      acceptRateFormatted: `${acceptRatePct.toFixed(1)}%`,
      rating: trustSource.reviewRating5,
      ratingFormatted: `★${trustSource.reviewRating5.toFixed(1)}`,
      reviewCount: trustSource.reviewCount,
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
            rates,
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
            rates,
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
        targetAcceptPct: periodMeta.targetAcceptRatePct,
      }),
    },
    trust: {
      overallRating: trustSource.reviewRating5,
      reviewCount: trustSource.reviewCount,
      criteria: [
        {
          key: "amenities",
          label: copy.criteriaAmenities,
          score: rc.amenities,
        },
        {
          key: "checkin",
          label: copy.criteriaCheckin,
          score: rc.checkin,
        },
        {
          key: "cleanliness",
          label: copy.criteriaCleanliness,
          score: rc.cleanliness,
        },
        {
          key: "service",
          label: copy.criteriaService,
          score: rc.service,
        },
        {
          key: "value",
          label: copy.criteriaValue,
          score: rc.value,
        },
      ],
      eloScore: trustSource.eloScore,
      visibilityTone: trustSource.visibilityTone,
      visibilitySubtitle: trustSource.visibilitySubtitle[locale],
    },
    completedBookings,
    inboxMessages,
    inboxNotifications,
  };
}

function buildBidsAdvisorCards(params: {
  locale: AppLocale;
  acceptPct: number;
  expiredPct: number;
  rejectedPct: number;
  targetAcceptPct: number;
}): AdvisorCardItem[] {
  const { locale, acceptPct, expiredPct, rejectedPct, targetAcceptPct } =
    params;
  const benchStr = `${targetAcceptPct.toFixed(1)}%`;

  if (locale === "vi") {
    return [
      {
        id: "conv-gap",
        iconType: "alert",
        title:
          acceptPct >= targetAcceptPct
            ? `Tỷ lệ khách chốt đạt mức tốt (${acceptPct.toFixed(1)}%)`
            : `Dư địa tăng thêm khách chốt (${acceptPct.toFixed(1)}%)`,
        badgeText: "Cân đối giá",
        badgeTone: "amber",
        body:
          acceptPct >= targetAcceptPct
            ? `Tỷ lệ khách đồng ý đặt phòng của bạn đang vượt mặt bằng khu vực (${benchStr}). Hãy tiếp tục duy trì chất lượng hình ảnh phòng và ưu đãi ăn sáng.`
            : `Tỷ lệ chốt đang thấp hơn ngưỡng trung bình khu vực (${benchStr}). Hãy tham khảo lại mặt bằng giá của các khách sạn lân cận vào ngày thường để tăng sức cạnh tranh.`,
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
        body: `지역 권장 전환율 기준(${benchStr})과 비교해 평일 객실 제안 요금 경쟁력을 점검하면 추가 예약을 확보할 수 있습니다.`,
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
        acceptPct >= targetAcceptPct
          ? `Acceptance rate is outperforming the ${benchStr} district benchmark. Keep room photos and breakfast inclusions consistent.`
          : `Acceptance rate is below optimal benchmark (${benchStr}). Review price points on competing properties in your district to ensure offer competitiveness.`,
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
