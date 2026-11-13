import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDictionary } from "@/lib/i18n";
import {
  buildOverviewViewModel,
  type PropertyFilterKey,
} from "@/services/overviewAnalytics";
import { loadSeedMasterBundle } from "../helpers/seed-loader";

describe("TC-OVW: Business Hotel Overview Analytics (100% Master-Data Driven)", () => {
  it("TC-OVW-01: daily timeline & 4-bucket Bids Status completeness hold across all periods and properties", () => {
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

        const expectedDays =
          periodKey === "today" ? 1 : periodKey === "7d" ? 7 : 30;
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

        const { accepted, expired, rejected, cancelled, total } =
          vm.bidsBreakdown;
        assert.equal(
          accepted.count + expired.count + rejected.count + cancelled.count,
          total,
          `4-bucket sum mismatch on ${propertyKey}/${periodKey}`,
        );
        assert.equal(total, vm.kpis.totalBids);
      }
    }

    const chain30d = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(chain30d.completedBookings.length, 29);
    assert.ok(
      chain30d.bidsBreakdown.cancelled.count >= 4,
      "Expected non-zero Cancelled bucket in 30d chain view",
    );
    assert.equal(chain30d.revenueAdvisor.cards.length, 3);
    assert.equal(chain30d.bidsAdvisor.cards.length, 3);
  });

  it("TC-OVW-02: switching properties dynamically updates Rating, Review Count, 5 Criteria & ELO Score from partner_hub_config", () => {
    const bundle = loadSeedMasterBundle();
    const allVm = buildOverviewViewModel(bundle, {
      propertyKey: "all",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });
    const mykheVm = buildOverviewViewModel(bundle, {
      propertyKey: "br_mykhe",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });
    const anthuongVm = buildOverviewViewModel(bundle, {
      propertyKey: "br_anthuong",
      periodKey: "30d",
      locale: "vi",
      currency: "VND",
    });

    assert.equal(allVm.trust.eloScore, 1680);
    assert.equal(allVm.trust.reviewCount, 142);
    assert.notEqual(mykheVm.trust.eloScore, allVm.trust.eloScore);
    assert.notEqual(mykheVm.trust.eloScore, anthuongVm.trust.eloScore);
    assert.notEqual(mykheVm.kpis.rating, anthuongVm.kpis.rating);
  });

  it("TC-OVW-03: Stay Hotel H11 loads 100% from bid_records & partner_hub_config (0 revenue, 75 bids, ★0.0, ELO 800, 0 messages)", () => {
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
    assert.equal(h11.inboxMessages.length, 0);

    assert.equal(h11.bidsBreakdown.accepted.count, 0);
    assert.equal(h11.bidsBreakdown.expired.count, 8);
    assert.equal(h11.bidsBreakdown.rejected.count, 67);
    assert.equal(h11.bidsBreakdown.cancelled.count, 0);
    assert.equal(h11.revenueAdvisor.cards.length, 1);

    // Zero-bid synthetic bundle safety check
    const emptyBundle = structuredClone(bundle);
    emptyBundle.bidRecords = [];
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

  it("TC-OVW-06: Booking IDs remain fixed (#43..#71), property/room/guestNote localize cleanly in en & ko (incl. 4-guest Family Suite CRQ-8938)", () => {
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
      all7.completedBookings.find((b) => b.refSessionId === topSessionId)
        ?.bookingCode,
      "#71",
    );
    assert.equal(
      allToday.completedBookings.find((b) => b.refSessionId === topSessionId)
        ?.bookingCode,
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

    const enFamily = enVm.completedBookings.find(
      (b) => b.refSessionId === "CRQ-8938",
    )!;
    assert.equal(enFamily.guestsCount, 4);
    assert.ok(
      enFamily.guestNote.includes("4"),
      `Expected 4 guests in EN note, got: ${enFamily.guestNote}`,
    );

    const koFamily = koVm.completedBookings.find(
      (b) => b.refSessionId === "CRQ-8938",
    )!;
    assert.ok(
      koFamily.guestNote.includes("4"),
      `Expected 4 guests in KO note, got: ${koFamily.guestNote}`,
    );

    for (const row of enVm.completedBookings) {
      assert.equal(row.guestNote.includes("người lớn"), false);
      assert.equal(row.propertyName.includes("Sơn Trà"), false);
      assert.equal(row.amenities.includes("Bữa sáng"), false);
    }
    for (const row of koVm.completedBookings) {
      assert.equal(row.guestNote.includes("người lớn"), false);
      assert.equal(row.propertyName.includes("Sơn Trà"), false);
      assert.equal(row.amenities.includes("Bữa sáng"), false);
    }
  });
});
