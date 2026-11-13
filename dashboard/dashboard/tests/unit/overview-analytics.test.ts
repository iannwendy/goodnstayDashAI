import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertFromVnd,
  formatAxisTickMoney,
  formatBusinessMoney,
  formatDisplayDate,
  getDictionary,
  getZeroRevenueAxisMaxVnd,
} from "@/lib/i18n";
import {
  buildOverviewViewModel,
  type PropertyFilterKey,
} from "@/services/overviewAnalytics";
import { loadSeedMasterBundle } from "../helpers/seed-loader";

describe("TC-OVW: Business Hotel Overview Analytics, Multi-Currency & Plain-Language Copy", () => {
  it("TC-OVW-01: currency conversion & business money formatting across VND, KRW, and USD", () => {
    assert.equal(convertFromVnd(0, "VND"), 0);
    assert.equal(convertFromVnd(0, "KRW"), 0);
    assert.equal(convertFromVnd(0, "USD"), 0);

    assert.equal(formatBusinessMoney(0, "VND", { compact: true, withPlus: true }), "0 ₫");
    assert.equal(formatBusinessMoney(0, "KRW", { compact: true, withPlus: true }), "0 ₩");
    assert.equal(formatBusinessMoney(0, "USD", { compact: true, withPlus: true }), "$0");

    const vndCompact = formatBusinessMoney(31_820_000, "VND", {
      compact: true,
      withPlus: true,
    });
    assert.ok(vndCompact.startsWith("+"), `Expected + prefix on ${vndCompact}`);
    assert.ok(vndCompact.includes("₫"), `Expected ₫ symbol on ${vndCompact}`);
    assert.ok(!vndCompact.includes("NaN"));

    const krwCompact = formatBusinessMoney(48_100_000, "KRW", {
      compact: true,
      withPlus: true,
    });
    assert.ok(krwCompact.startsWith("+"));
    assert.ok(krwCompact.includes("₩"));

    const usdFull = formatBusinessMoney(25_400_000, "USD");
    assert.ok(usdFull.includes("$"));
    assert.ok(!usdFull.includes("NaN"));

    assert.equal(formatDisplayDate("2026-11-06", "vi", true), "06/11/2026");
    assert.equal(formatDisplayDate("2026-11-06", "en", true), "Nov 06, 2026");
    assert.equal(formatDisplayDate("2026-11-06", "ko", true), "2026.11.06");

    assert.equal(
      formatAxisTickMoney(getZeroRevenueAxisMaxVnd("KRW"), "KRW"),
      "+4 ₩",
    );
    assert.equal(
      formatAxisTickMoney(getZeroRevenueAxisMaxVnd("USD"), "USD"),
      "+$4",
    );
  });

  it("TC-OVW-02: daily timeline & 4-bucket Bids Status completeness hold across all periods and branches", () => {
    const bundle = loadSeedMasterBundle();
    const properties: PropertyFilterKey[] = [
      "all",
      "br_mykhe",
      "br_songhan",
      "br_anthuong",
      "stay_h11",
    ];
    const periods = ["today", "7d", "30d"] as const;

    for (const propertyKey of properties) {
      for (const periodKey of periods) {
        const vm = buildOverviewViewModel(bundle, {
          propertyKey,
          periodKey,
          locale: "vi",
          currency: "VND",
        });

        const expectedDays = periodKey === "today" ? 1 : periodKey === "7d" ? 7 : 30;
        assert.equal(
          vm.dailySeries.length,
          expectedDays,
          `Expected ${expectedDays} daily buckets for ${propertyKey}/${periodKey}`,
        );

        const sumDailyRev = vm.dailySeries.reduce((s, d) => s + d.revenueVnd, 0);
        const sumDailyBookings = vm.dailySeries.reduce(
          (s, d) => s + d.bookingsCount,
          0,
        );
        assert.equal(sumDailyRev, vm.kpis.revenueVnd);
        assert.equal(sumDailyBookings, vm.completedBookings.length);

        const { accepted, expired, rejected, cancelled, total } = vm.bidsBreakdown;
        assert.equal(
          accepted.count + expired.count + rejected.count + cancelled.count,
          total,
          `4-bucket sum mismatch on ${propertyKey}/${periodKey}`,
        );
        assert.equal(total, vm.kpis.totalBids);

        for (const bucket of [accepted, expired, rejected, cancelled]) {
          assert.ok(
            Number.isFinite(bucket.sharePct) && bucket.sharePct >= 0,
            `Invalid sharePct on ${propertyKey}/${periodKey}`,
          );
        }
      }
    }

    const chain30d = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(chain30d.completedBookings.length, 29);
    assert.equal(chain30d.revenueAdvisor.cards.length, 3);
    assert.equal(chain30d.bidsAdvisor.cards.length, 3);
  });

  it("TC-OVW-03: newly onboarded Stay Hotel H11 & zero-bid edge cases never emit NaN or Infinity", () => {
    const bundle = loadSeedMasterBundle();
    const h11 = buildOverviewViewModel(bundle, {
      propertyKey: "stay_h11",
      periodKey: "30d",
      locale: "en",
      currency: "KRW",
    });

    assert.equal(h11.kpis.revenueVnd, 0);
    assert.equal(h11.kpis.totalBids, 75);
    assert.equal(h11.kpis.acceptRatePct, 0);
    assert.equal(h11.kpis.rating, 0);
    assert.equal(h11.kpis.autoBidPct, 100);
    assert.equal(h11.trust.eloScore, 800);
    assert.equal(h11.completedBookings.length, 0);

    assert.equal(h11.bidsBreakdown.accepted.count, 0);
    assert.equal(h11.bidsBreakdown.expired.count, 8);
    assert.equal(h11.bidsBreakdown.rejected.count, 67);
    assert.equal(h11.bidsBreakdown.cancelled.count, 0);
    assert.equal(h11.revenueAdvisor.cards.length, 1);

    // Zero-bid synthetic bundle safety check
    const emptyBundle = structuredClone(bundle);
    emptyBundle.auctionSessions = [];
    const zeroVm = buildOverviewViewModel(emptyBundle, {
      propertyKey: "all",
      periodKey: "today",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(zeroVm.kpis.totalBids, 0);
    assert.equal(zeroVm.kpis.acceptRatePct, 0);
    assert.equal(zeroVm.bidsBreakdown.totalShareLabel, "0%");
    assert.ok(!JSON.stringify(zeroVm).includes("NaN"));
    assert.ok(!JSON.stringify(zeroVm).includes("Infinity"));
  });

  it("TC-OVW-04: Vietnamese business copy is 100% free of internal engineering jargon", () => {
    const bundle = loadSeedMasterBundle();
    const viDict = getDictionary("vi");
    const viVm = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });

    assert.equal(viDict.kpiRevenue, "Doanh thu thực nhận");
    assert.equal(viDict.kpiAcceptRate, "Tỷ lệ khách chốt");
    assert.equal(viDict.eloTitle, "Điểm uy tín hiển thị");

    const serializedVi = JSON.stringify({
      viDict,
      revenueAdvisor: viVm.revenueAdvisor,
      bidsAdvisor: viVm.bidsAdvisor,
      trust: viVm.trust,
    });
    for (const forbidden of [
      "1.265",
      "REJ_",
      "settled_t_plus_7",
      "checkout_hold_10m",
      "RACE",
      "ELO Score",
      "RevPAR",
      "Mô phỏng",
    ]) {
      assert.equal(
        serializedVi.includes(forbidden),
        false,
        `Forbidden technical jargon "${forbidden}" leaked into Vietnamese business copy`,
      );
    }
  });

  it("TC-OVW-05: English & Korean dictionaries match Optibide Partner Hub reference terminology", () => {
    const enDict = getDictionary("en");
    assert.equal(enDict.pageTitle, "Dashboard overview");
    assert.equal(enDict.kpiRevenue, "Revenue");
    assert.equal(enDict.kpiTotalBids, "Total Bids");
    assert.equal(enDict.kpiAcceptRate, "Accept%");
    assert.equal(enDict.kpiRating, "Rating");
    assert.equal(enDict.kpiAutoBid, "AutoBid");
    assert.equal(enDict.revenueTimelineTitle, "Revenue Timeline");
    assert.equal(enDict.bidsStatusTitle, "Bids Status");
    assert.equal(enDict.ratingsTitle, "Ratings, Trust & Visibility");
    assert.equal(enDict.eloTitle, "ELO Score");
    assert.equal(enDict.recentBookingsTitle, "Recent Bookings");

    const koDict = getDictionary("ko");
    assert.ok(koDict.pageTitle.length > 0);
    assert.ok(koDict.kpiRevenue.length > 0);
  });

  it("TC-OVW-06: Booking IDs remain globally stable across period/branch filters and guestNote/amenities localize in en & ko", () => {
    const bundle = loadSeedMasterBundle();
    const all30 = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });
    const all7 = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "7d",
      locale: "vi",
      currency: "VND",
    });
    const allToday = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "today",
      locale: "vi",
      currency: "VND",
    });

    const topSessionId = all30.completedBookings[0].refSessionId;
    assert.equal(all30.completedBookings[0].bookingCode, "#71");
    assert.equal(
      all7.completedBookings.find((b) => b.refSessionId === topSessionId)?.bookingCode,
      "#71",
    );
    assert.equal(
      allToday.completedBookings.find((b) => b.refSessionId === topSessionId)?.bookingCode,
      "#71",
    );

    const enVm = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "en",
      currency: "KRW",
    });
    const koVm = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "ko",
      currency: "KRW",
    });

    for (const row of enVm.completedBookings) {
      assert.equal(row.guestNote.includes("người lớn"), false);
      assert.equal(row.amenities.includes("Bữa sáng"), false);
    }
    for (const row of koVm.completedBookings) {
      assert.equal(row.guestNote.includes("người lớn"), false);
      assert.equal(row.amenities.includes("Bữa sáng"), false);
    }
  });
});
