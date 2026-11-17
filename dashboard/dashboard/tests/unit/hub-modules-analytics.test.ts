import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadSeedMasterBundle } from "../helpers/seed-loader";
import {
  buildBiddingModuleViewModel,
  buildCalendarModuleViewModel,
  buildMarketingModuleViewModel,
  buildMessagesModuleViewModel,
  buildPayoutModuleViewModel,
  buildRoomsModuleViewModel,
} from "../../src/services/hubModulesAnalytics";
import { getModulesDictionary } from "../../src/lib/hubModulesI18n";

describe("TC-MOD: Left-Menu Business Modules Analytics & Localization (Calendar, Payout, Rooms, Bidding, Messages, Marketing)", () => {
  it("TC-MOD-01: Calendar tape chart & front-desk view model scopes rooms, bookings & blocks accurately across windows and properties", () => {
    const bundle = loadSeedMasterBundle();

    const chain7d = buildCalendarModuleViewModel(bundle, {
      propertyKey: "all",
      windowKey: "current7d",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(chain7d.dateColumns.length, 7);
    assert.equal(chain7d.roomRows.length, 30);
    assert.ok(chain7d.kpis.arrivalsTodayCount >= 1);
    assert.ok(chain7d.kpis.inHouseTodayCount >= 1);
    assert.equal(chain7d.kpis.activeBlocksCount, 4);
    assert.ok(chain7d.allBookingsMap["#71"]);
    assert.equal(chain7d.allBookingsMap["#71"].roomNumber, 116);

    const ext14d = buildCalendarModuleViewModel(bundle, {
      propertyKey: "br_mykhe",
      windowKey: "extended14d",
      locale: "en",
      currency: "USD",
    });
    assert.equal(ext14d.dateColumns.length, 14);
    assert.equal(ext14d.roomRows.length, 12);

    const h11Cal = buildCalendarModuleViewModel(bundle, {
      propertyKey: "stay_h11",
      windowKey: "current7d",
      locale: "ko",
      currency: "KRW",
    });
    assert.equal(h11Cal.roomRows.length, 18);
    assert.equal(h11Cal.kpis.arrivalsTodayCount, 0);
    assert.equal(h11Cal.kpis.inHouseTodayCount, 0);
    assert.equal(h11Cal.kpis.occupancyRatePct, 0);
    assert.equal(h11Cal.frontDeskStays.length, 0);
  });

  it("TC-MOD-02: Payout reconciliation view model matches exact 66,360,000 VND across paid/processing/upcoming cycles and handles stay_h11 cleanly", () => {
    const bundle = loadSeedMasterBundle();

    const chainPayout = buildPayoutModuleViewModel(bundle, {
      propertyKey: "all",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(chainPayout.bankAccounts.length, 3);
    assert.equal(chainPayout.batches.length, 12);
    assert.equal(chainPayout.kpis.totalReconciledVnd, 66_360_000);
    assert.equal(
      chainPayout.kpis.paidBankVnd +
        chainPayout.kpis.processingVnd +
        chainPayout.kpis.upcomingVnd,
      chainPayout.kpis.totalReconciledVnd,
    );
    assert.ok(chainPayout.kpis.paidBankVnd > 0);
    assert.ok(chainPayout.kpis.processingVnd > 0);
    assert.ok(chainPayout.kpis.upcomingVnd > 0);

    const h11Payout = buildPayoutModuleViewModel(bundle, {
      propertyKey: "stay_h11",
      locale: "en",
      currency: "KRW",
    });
    assert.equal(h11Payout.bankAccounts.length, 1);
    assert.equal(h11Payout.bankAccounts[0].verified, true);
    assert.equal(h11Payout.batches.length, 0);
    assert.equal(h11Payout.kpis.totalReconciledVnd, 0);
  });

  it("TC-MOD-03: Rooms inventory & housekeeping view model partitions status buckets cleanly across chain and stay_h11", () => {
    const bundle = loadSeedMasterBundle();

    const chainRooms = buildRoomsModuleViewModel(bundle, {
      propertyKey: "all",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(chainRooms.kpis.totalUnits, 30);
    assert.equal(
      chainRooms.kpis.readyCount +
        chainRooms.kpis.occupiedCount +
        chainRooms.kpis.dirtyCount +
        chainRooms.kpis.maintenanceCount,
      30,
    );
    assert.equal(chainRooms.categories.length, 12);

    const h11Rooms = buildRoomsModuleViewModel(bundle, {
      propertyKey: "stay_h11",
      locale: "en",
      currency: "USD",
    });
    assert.equal(h11Rooms.kpis.totalUnits, 18);
    assert.equal(h11Rooms.kpis.occupiedCount, 0);
    assert.equal(h11Rooms.categories.length, 3);
  });

  it("TC-MOD-04: Bidding operations view model computes live queue, 24/7 AutoBid guardrails & historical acceptance rate", () => {
    const bundle = loadSeedMasterBundle();

    const chainBidding = buildBiddingModuleViewModel(bundle, {
      propertyKey: "all",
      locale: "vi",
      currency: "VND",
    });
    assert.equal(chainBidding.liveRequests.length, 4);
    assert.equal(chainBidding.kpis.waitingRequestsCount, 3);
    assert.equal(chainBidding.kpis.sentOffersCount, 1);
    assert.equal(chainBidding.autoBidRules.length, 3);
    assert.ok(chainBidding.kpis.acceptRate30dPct > 40);

    const h11Bidding = buildBiddingModuleViewModel(bundle, {
      propertyKey: "stay_h11",
      locale: "ko",
      currency: "KRW",
    });
    assert.equal(h11Bidding.liveRequests.length, 2);
    assert.equal(h11Bidding.kpis.waitingRequestsCount, 2);
    assert.equal(h11Bidding.autoBidRules.length, 1);
    assert.equal(h11Bidding.kpis.acceptRate30dPct, 0);
    assert.ok(h11Bidding.liveRequests[0].guestTargetFormatted.includes("₩"));
  });

  it("TC-MOD-05: Guest Messages & Marketing Campaigns view models support vi/en/ko & VND/KRW/USD without Vietnamese string leaks", () => {
    const bundle = loadSeedMasterBundle();

    const enMsgs = buildMessagesModuleViewModel(bundle, {
      propertyKey: "all",
      locale: "en",
    });
    assert.equal(enMsgs.kpis.totalThreads, 5);
    assert.ok(enMsgs.kpis.unreadCount >= 2);
    assert.equal(enMsgs.quickReplies.length, 3);
    for (const conv of enMsgs.conversations) {
      assert.equal(conv.propertyShortName.includes("Đà Nẵng"), false);
      assert.equal(conv.staySummary.includes("khách"), false);
    }

    const h11Msgs = buildMessagesModuleViewModel(bundle, {
      propertyKey: "stay_h11",
      locale: "vi",
    });
    assert.equal(h11Msgs.kpis.totalThreads, 0);
    assert.equal(h11Msgs.conversations.length, 0);

    const usdMkt = buildMarketingModuleViewModel(bundle, {
      propertyKey: "all",
      locale: "en",
      currency: "USD",
    });
    assert.equal(usdMkt.flashDeals.length, 3);
    assert.equal(usdMkt.upsellOffers.length, 4);
    assert.ok(usdMkt.flashDeals[0].dealRateFormatted.includes("$"));

    const h11Mkt = buildMarketingModuleViewModel(bundle, {
      propertyKey: "stay_h11",
      locale: "ko",
      currency: "KRW",
    });
    assert.equal(h11Mkt.flashDeals.length, 1);
    assert.equal(h11Mkt.flashDeals[0].id, "DEAL-H11-01");
    assert.equal(h11Mkt.upsellOffers.length, 1);
  });

  it("TC-MOD-06: Vietnamese modules dictionary is 100% pure hotelier business language with zero internal engineering jargon", () => {
    const viSerialized = JSON.stringify(getModulesDictionary("vi"));
    const forbiddenTokens = [
      "1.265",
      "REJ_",
      "settled_t_plus_7",
      "checkout_hold_10m",
      "RACE",
      "ELO Score",
      "RevPAR",
      "Mô phỏng",
      "BullMQ",
      "webhook",
    ];
    for (const token of forbiddenTokens) {
      assert.equal(
        viSerialized.includes(token),
        false,
        `Found forbidden engineering token "${token}" inside Vietnamese modules copy`,
      );
    }
  });
});
