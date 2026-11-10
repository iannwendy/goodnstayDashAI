import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRevenueTimeSeries,
  computeBenchmarkTrendSeries,
  computeDashboardAnalytics,
  resolveMatchBreakdown,
  type BenchmarkLineFilters,
} from "@/services/analyticsEngine";
import { loadSeedMasterBundle } from "../helpers/seed-loader";

const DEFAULT_BENCH_FILTERS: BenchmarkLineFilters = {
  roomClass: "all",
  pricePosition: "all",
  bidMode: "all",
  timeSlot: "all",
};

describe("TC-LOGIC: Analytics Engine, Funnel, Flash Sale, Branch Scope & 14-Day PMS", () => {
  it("TC-LOGIC-01: period monotonic hierarchy (today <= 7d <= 30d for revenue, bids, wins, nights)", () => {
    const bundle = loadSeedMasterBundle();
    const res = computeDashboardAnalytics(bundle, "30d", {});
    const pToday = res.allPeriods.today;
    const p7d = res.allPeriods["7d"];
    const p30d = res.allPeriods["30d"];

    assert.ok(pToday.baseRevenue > 0);
    assert.ok(pToday.baseRevenue <= p7d.baseRevenue);
    assert.ok(p7d.baseRevenue <= p30d.baseRevenue);

    assert.ok(pToday.bidsSent <= p7d.bidsSent);
    assert.ok(p7d.bidsSent <= p30d.bidsSent);

    assert.ok(pToday.paidWonCount <= p7d.paidWonCount);
    assert.ok(p7d.paidWonCount <= p30d.paidWonCount);

    assert.ok(pToday.roomNightsSold <= p7d.roomNightsSold);
    assert.ok(p7d.roomNightsSold <= p30d.roomNightsSold);
  });

  it("TC-LOGIC-02: ADR, Net Revenue & Guest Paid x1.265 mathematical identities hold on all periods", () => {
    const bundle = loadSeedMasterBundle();
    const res = computeDashboardAnalytics(bundle, "30d", {});

    for (const key of ["today", "7d", "30d"] as const) {
      const m = res.allPeriods[key];
      const expectedAdr =
        m.roomNightsSold > 0 ? Math.round(m.baseRevenue / m.roomNightsSold) : 0;
      assert.equal(m.periodBaseAdr, expectedAdr, `ADR mismatch on ${key}`);

      const sumOrderBase = m.periodOrders.reduce((s, o) => s + o.baseAmount, 0);
      const sumOrderGuest = m.periodOrders.reduce(
        (s, o) => s + o.guestPaidAmount,
        0,
      );
      assert.equal(m.baseRevenue, sumOrderBase, `Order base sum mismatch on ${key}`);
      assert.equal(
        m.guestPaidTotal,
        sumOrderGuest,
        `Order guestPaid sum mismatch on ${key}`,
      );
      assert.equal(
        m.platformFeeAndVatTotal,
        m.guestPaidTotal - m.baseRevenue,
        `Platform fee + VAT identity mismatch on ${key}`,
      );
      assert.equal(m.autoBidsCount + m.manualBidsCount, m.bidsSent);
    }
  });

  it("TC-LOGIC-03: multi-branch filtering partitions rooms (12 + 10 + 8 = 30) and sums to chain revenue", () => {
    const bundle = loadSeedMasterBundle();
    const allChain = computeDashboardAnalytics(bundle, "30d", {}, "all");

    let branchRoomsSum = 0;
    let branchRevSum30d = 0;
    let branchOrdersSum30d = 0;

    for (const br of bundle.hotelProfile.branches) {
      const scoped = computeDashboardAnalytics(bundle, "30d", {}, br.id);
      assert.equal(scoped.scopedTotalRooms, br.totalRooms);
      assert.equal(scoped.roomMatrix.length, br.totalRooms);
      assert.equal(scoped.activeBranchLabel, br.shortName);
      assert.ok(scoped.roomMatrix.every((r) => r.branchId === br.id));

      branchRoomsSum += scoped.scopedTotalRooms;
      branchRevSum30d += scoped.periodMetrics.baseRevenue;
      branchOrdersSum30d += scoped.periodMetrics.paidWonCount;
    }

    assert.equal(branchRoomsSum, 30);
    assert.equal(branchRevSum30d, allChain.periodMetrics.baseRevenue);
    assert.equal(branchOrdersSum30d, allChain.periodMetrics.paidWonCount);
  });

  it("TC-LOGIC-04: per-room revenue breakdown covers all 30 rooms (#101..#130) and sums to baseRevenue", () => {
    const bundle = loadSeedMasterBundle();
    const res = computeDashboardAnalytics(bundle, "30d", {}, "all");
    const rooms = res.periodMetrics.allChainRoomRevenues;

    assert.equal(rooms.length, 30);
    for (let i = 1; i < rooms.length; i++) {
      assert.ok(
        rooms[i - 1].roomNumber < rooms[i].roomNumber,
        "allChainRoomRevenues must be ordered by roomNumber ascending (#101..#130)",
      );
    }
    const totalRoomRev = rooms.reduce((s, r) => s + r.revenue, 0);
    assert.equal(totalRoomRev, res.periodMetrics.baseRevenue);
  });

  it("TC-LOGIC-05: buildRevenueTimeSeries preserves exact revenue & order totals across all granularities", () => {
    const bundle = loadSeedMasterBundle();
    const res = computeDashboardAnalytics(bundle, "30d", {});

    // Today -> 4 intraday slots
    const todaySlots = buildRevenueTimeSeries(
      "today",
      bundle.systemBenchmarks.periodsMeta.today,
      res.allPeriods.today.periodOrders,
      bundle.hotelProfile.referenceDate,
    );
    assert.equal(todaySlots.length, 4);
    assert.equal(
      todaySlots.reduce((s, b) => s + b.revenueVnd, 0),
      res.allPeriods.today.baseRevenue,
    );

    // 7d -> 7 daily buckets
    const buckets7d = buildRevenueTimeSeries(
      "7d",
      bundle.systemBenchmarks.periodsMeta["7d"],
      res.allPeriods["7d"].periodOrders,
      bundle.hotelProfile.referenceDate,
    );
    assert.equal(buckets7d.length, 7);
    assert.equal(
      buckets7d.reduce((s, b) => s + b.revenueVnd, 0),
      res.allPeriods["7d"].baseRevenue,
    );

    // 30d weekly -> 4 weekly buckets; 30d daily -> 30 daily buckets
    const buckets30dWeekly = buildRevenueTimeSeries(
      "30d",
      bundle.systemBenchmarks.periodsMeta["30d"],
      res.allPeriods["30d"].periodOrders,
      bundle.hotelProfile.referenceDate,
      "weekly",
    );
    const buckets30dDaily = buildRevenueTimeSeries(
      "30d",
      bundle.systemBenchmarks.periodsMeta["30d"],
      res.allPeriods["30d"].periodOrders,
      bundle.hotelProfile.referenceDate,
      "daily",
    );
    assert.equal(buckets30dWeekly.length, 4);
    assert.equal(buckets30dDaily.length, 30);
    assert.equal(
      buckets30dWeekly.reduce((s, b) => s + b.revenueVnd, 0),
      res.allPeriods["30d"].baseRevenue,
    );
    assert.equal(
      buckets30dDaily.reduce((s, b) => s + b.revenueVnd, 0),
      res.allPeriods["30d"].baseRevenue,
    );
  });

  it("TC-LOGIC-06: Night Flash Sale lowers floor & tonight AI price (-15%) without discounting future check-in dates", () => {
    const bundleOff = loadSeedMasterBundle();
    bundleOff.hotelProfile.nightFlashSaleActive = false;
    const resOff = computeDashboardAnalytics(bundleOff, "30d", {});

    const bundleOn = loadSeedMasterBundle();
    bundleOn.hotelProfile.nightFlashSaleActive = true;
    const resOn = computeDashboardAnalytics(bundleOn, "30d", {});

    assert.equal(resOff.activeFloorPrice, bundleOff.hotelProfile.defaultFloorPrice);
    assert.equal(
      resOn.activeFloorPrice,
      Math.round(
        bundleOn.hotelProfile.defaultFloorPrice *
          (1 - bundleOn.hotelProfile.nightFlashDiscountPct / 100),
      ),
    );

    for (const lsOn of resOn.liveSessions) {
      const lsOff = resOff.liveSessions.find((x) => x.id === lsOn.id)!;
      if (lsOn.isTonightCheckIn) {
        assert.equal(lsOn.flashDiscountApplied, true);
        assert.ok(lsOn.aiSuggestedBasePrice < lsOff.aiSuggestedBasePrice);
        assert.ok(lsOn.effectiveFloorPrice < lsOff.effectiveFloorPrice);
      } else {
        assert.equal(lsOn.flashDiscountApplied, false);
        assert.equal(lsOn.aiSuggestedBasePrice, lsOff.aiSuggestedBasePrice);
        assert.equal(lsOn.effectiveFloorPrice, lsOff.effectiveFloorPrice);
      }
    }
  });

  it("TC-LOGIC-07: liveCountdownOverrides expires session when remainingSeconds <= 0 and respects Auto-Bid ceilings", () => {
    const bundle = loadSeedMasterBundle();
    const baseRes = computeDashboardAnalytics(bundle, "30d", {});
    assert.ok(baseRes.liveSessions.length >= 2);

    const targetId = baseRes.liveSessions[0].id;
    const expiredRes = computeDashboardAnalytics(bundle, "30d", {
      [targetId]: 0,
    });
    assert.equal(expiredRes.activeLiveCount, baseRes.activeLiveCount - 1);
    const maybeSession = expiredRes.liveSessions.find((s) => s.id === targetId);
    if (maybeSession) {
      assert.equal(maybeSession.remainingSeconds, 0);
    }

    for (const ls of baseRes.liveSessions) {
      const expectedEligible =
        ls.roomsQty <= bundle.hotelProfile.autoBidMaxRooms &&
        ls.guestsCount <= bundle.hotelProfile.autoBidMaxGuests;
      assert.equal(ls.isAutoBidEligible, expectedEligible);
    }
  });

  it("TC-LOGIC-08: 8-step Payment Conversion Funnel enforces non-increasing step counts & segment additivity", () => {
    const bundle = loadSeedMasterBundle();
    const res = computeDashboardAnalytics(bundle, "30d", {});

    for (const periodKey of ["today", "7d", "30d"] as const) {
      const funnels = res.allPeriods[periodKey].paymentFunnels;
      assert.equal(
        funnels.auto.totalBids + funnels.manual.totalBids,
        funnels.all.totalBids,
      );
      assert.equal(
        funnels.auto.wonCount + funnels.manual.wonCount,
        funnels.all.wonCount,
      );

      for (const seg of ["all", "auto", "manual"] as const) {
        const f = funnels[seg];
        assert.equal(f.steps.length, 8);
        assert.equal(f.steps[0].count, f.totalBids);
        assert.equal(f.steps[7].count, f.wonCount);
        assert.equal(f.totalBids - f.wonCount, f.totalLosses);

        for (let i = 1; i < f.steps.length; i++) {
          assert.ok(
            f.steps[i].count <= f.steps[i - 1].count,
            `Funnel step ${i + 1} count exceeded previous step on ${periodKey}/${seg}`,
          );
          assert.equal(
            f.steps[i].droppedFromPrevCount,
            f.steps[i - 1].count - f.steps[i].count,
          );
        }
      }
    }
  });

  it("TC-LOGIC-09: 14-day schedule honors manualOverrides on future days while protecting 100%-paid booked_auction rooms", () => {
    const bundle = loadSeedMasterBundle();
    const baseline = computeDashboardAnalytics(bundle, "30d", {});
    const day4 = baseline.dailyRoomSchedules[4]; // 10/11/2026

    const vacantRoom = day4.rooms.find((r) => r.status === "vacant_unlocked");
    const auctionRoom = day4.rooms.find((r) => r.status === "booked_auction");
    assert.ok(vacantRoom, "Expected at least 1 vacant room on dayOffset=4");
    assert.ok(
      auctionRoom,
      "Expected at least 1 auction-locked room on dayOffset=4",
    );

    // Lock vacant room manually AND attempt to force-unlock an auction-paid room
    bundle.calendar14dPms[4].manualOverrides = {
      [String(vacantRoom.roomNumber)]: "booked_other",
      [String(auctionRoom.roomNumber)]: "vacant_unlocked",
    };

    const mutated = computeDashboardAnalytics(bundle, "30d", {});
    const mutatedDay4 = mutated.dailyRoomSchedules[4];

    const updatedVacant = mutatedDay4.rooms.find(
      (r) => r.roomNumber === vacantRoom.roomNumber,
    )!;
    const updatedAuction = mutatedDay4.rooms.find(
      (r) => r.roomNumber === auctionRoom.roomNumber,
    )!;

    assert.equal(updatedVacant.status, "booked_other");
    assert.equal(
      updatedAuction.status,
      "booked_auction",
      "100%-paid goodNstay room must NEVER be unlocked by manualOverrides",
    );
    assert.equal(mutatedDay4.vacantRooms, day4.vacantRooms - 1);
  });

  it("TC-LOGIC-10: resolveMatchBreakdown returns seeded record or deterministic 3-criterion fallback", () => {
    const bundle = loadSeedMasterBundle();
    const seededIds = Object.keys(bundle.matchBreakdowns);
    assert.ok(seededIds.length > 0);

    const exact = resolveMatchBreakdown(seededIds[0], bundle);
    assert.equal(exact.reqId, seededIds[0]);
    assert.ok(exact.items.length >= 3);

    const fallback = resolveMatchBreakdown("CRQ-UNKNOWN-9999", bundle);
    assert.equal(fallback.reqId, "CRQ-UNKNOWN-9999");
    assert.equal(fallback.items.length, 3);
    assert.equal(fallback.suggestedPerkId, "perk_bf");
  });

  it("TC-LOGIC-11: computeBenchmarkTrendSeries buckets (today=6, 7d=7, 30d=6), filters & empty-state guard", () => {
    const bundle = loadSeedMasterBundle();

    const sToday = computeBenchmarkTrendSeries(
      bundle,
      "today",
      DEFAULT_BENCH_FILTERS,
    );
    const s7d = computeBenchmarkTrendSeries(
      bundle,
      "7d",
      DEFAULT_BENCH_FILTERS,
    );
    const s30d = computeBenchmarkTrendSeries(
      bundle,
      "30d",
      DEFAULT_BENCH_FILTERS,
    );

    assert.equal(sToday.points.length, 6);
    assert.equal(s7d.points.length, 7);
    assert.equal(s30d.points.length, 6);

    // Bucket bids & wins sum to period totalBids & totalWins
    assert.equal(
      s30d.points.reduce((s, p) => s + p.bids, 0),
      s30d.totalBids,
    );
    assert.equal(
      s30d.points.reduce((s, p) => s + p.wins, 0),
      s30d.totalWins,
    );

    // Multi-filter active count & scope label
    const supComp = computeBenchmarkTrendSeries(bundle, "30d", {
      roomClass: "sup",
      pricePosition: "competitive",
      bidMode: "auto",
      timeSlot: "evening_peak",
    });
    assert.equal(supComp.activeFiltersCount, 4);
    assert.equal(supComp.scopeLabel, "Hạng Superior");
    assert.ok(supComp.sysAvgWinPct >= 6 && supComp.sysAvgWinPct <= 88);

    // Narrow zero-match combination on Today (Family Suite + Above Market)
    const empty = computeBenchmarkTrendSeries(bundle, "today", {
      roomClass: "fsuite",
      pricePosition: "above_market",
      bidMode: "all",
      timeSlot: "all",
    });
    assert.equal(empty.totalBids, 0);
    assert.equal(empty.hotelWinPct, null);
    assert.equal(empty.hotelAvgBasePrice, null);
    assert.ok(empty.sysAvgBasePrice > 0);
  });

  it("TC-LOGIC-12: 10-minute payment_hold locks room across stay dates, flags overlapping sessions as standby_hold_conflict, blocks manual override, and releases on countdown 0", () => {
    const bundle = loadSeedMasterBundle();
    const res = computeDashboardAnalytics(bundle, "30d", {});

    // Day 0 (06/11) and Day 1 (07/11) both hold Room #130 for CRQ-8944 (06/11 – 08/11)
    assert.equal(res.paymentHoldTotal, 1);
    assert.equal(res.dailyRoomSchedules[0].paymentHoldRooms, 1);
    assert.equal(res.dailyRoomSchedules[1].paymentHoldRooms, 1);
    const room130Day1 = res.dailyRoomSchedules[1].rooms.find(
      (r) => r.roomNumber === 130,
    )!;
    assert.equal(room130Day1.status, "payment_hold");
    assert.equal(room130Day1.linkedReqId, "CRQ-8944");

    // Scoped to CN Mỹ Khê (br_mykhe), #130 is the last remaining Executive Ocean Suite (#129 is booked_other) -> CRQ-8942 enters Standby conflict!
    const myKheRes = computeDashboardAnalytics(bundle, "30d", {}, "br_mykhe");
    const crq8944 = myKheRes.liveSessions.find((s) => s.id === "CRQ-8944")!;
    const crq8942 = myKheRes.liveSessions.find((s) => s.id === "CRQ-8942")!;
    assert.equal(crq8944.holdRoomNumber, 130);
    assert.equal(crq8944.bidStatus, "payment_hold_10m");
    assert.equal(crq8944.paymentStatus, "awaiting_hold_10m");
    assert.equal(crq8942.isBlockedByPaymentHold, true);
    assert.deepEqual(crq8942.heldRoomNumbers, [130]);
    assert.deepEqual(crq8942.heldByReqIds, ["CRQ-8944"]);

    // Attempting to override #130 on Day 1 via manualOverrides must NEVER clobber an active payment_hold
    bundle.calendar14dPms[1].manualOverrides = { "130": "booked_other" };
    const guarded = computeDashboardAnalytics(bundle, "30d", {});
    assert.equal(
      guarded.dailyRoomSchedules[1].rooms.find((r) => r.roomNumber === 130)!
        .status,
      "payment_hold",
    );

    // When 10-minute hold countdown hits 0 (holdCountdownOverrides["CRQ-8944"] = 0), Room #130 immediately releases back to vacant_unlocked and CRQ-8942 is unblocked!
    delete bundle.calendar14dPms[1].manualOverrides;
    const released = computeDashboardAnalytics(
      bundle,
      "30d",
      {},
      "br_mykhe",
      { "CRQ-8944": 0 },
    );
    assert.equal(released.paymentHoldTotal, 0);
    assert.equal(
      released.dailyRoomSchedules[0].rooms.find((r) => r.roomNumber === 130)!
        .status,
      "vacant_unlocked",
    );
    assert.equal(
      released.dailyRoomSchedules[1].rooms.find((r) => r.roomNumber === 130)!
        .status,
      "vacant_unlocked",
    );
    const crq8942After = released.liveSessions.find((s) => s.id === "CRQ-8942")!;
    assert.equal(crq8942After.isBlockedByPaymentHold, false);
    assert.ok(crq8942After.vacantForStay >= 1);
  });
});
