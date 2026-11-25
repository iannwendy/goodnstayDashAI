import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CORE_MASTER_TABLE_FILES,
  MASTER_DATA_DIR,
  OBSOLETE_LEGACY_FILES,
  PROJECT_ROOT,
  SEED_DATA_DIR,
  loadSeedMasterBundle,
} from "../helpers/seed-loader";

describe("TC-DATA: Partner Hub Master Data v4.0 Contract & Cross-Table Referential Integrity", () => {
  it("TC-DATA-01: all 7 master-data & seed JSON files + schema_manifest v4.0.0 exist and 0 legacy bloat files remain", () => {
    assert.equal(Object.keys(CORE_MASTER_TABLE_FILES).length, 7);

    for (const [tableKey, filename] of Object.entries(CORE_MASTER_TABLE_FILES)) {
      const seedPath = path.join(SEED_DATA_DIR, filename);
      const livePath = path.join(MASTER_DATA_DIR, filename);
      assert.equal(
        fs.existsSync(seedPath),
        true,
        `Missing seed file for ${tableKey}: ${seedPath}`,
      );
      assert.equal(
        fs.existsSync(livePath),
        true,
        `Missing live master-data file for ${tableKey}: ${livePath}`,
      );
      const seedParsed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
      const liveParsed = JSON.parse(fs.readFileSync(livePath, "utf-8"));
      assert.deepEqual(
        liveParsed,
        seedParsed,
        `Live file ${filename} drifted from seed/${filename}`,
      );
    }

    for (const legacy of OBSOLETE_LEGACY_FILES) {
      assert.equal(
        fs.existsSync(path.join(MASTER_DATA_DIR, legacy)),
        false,
        `Obsolete file still in master-data/: ${legacy}`,
      );
      assert.equal(
        fs.existsSync(path.join(SEED_DATA_DIR, legacy)),
        false,
        `Obsolete file still in master-data/seed/: ${legacy}`,
      );
    }

    assert.equal(
      fs.existsSync(path.join(PROJECT_ROOT, "src/services/analyticsEngine.ts")),
      false,
      "Legacy unused analyticsEngine.ts should be removed",
    );

    const manifest = JSON.parse(
      fs.readFileSync(path.join(MASTER_DATA_DIR, "schema_manifest.json"), "utf-8"),
    );
    assert.equal(manifest.schemaVersion, "4.0.0");
    assert.deepEqual(
      Object.keys(manifest.tables).sort(),
      Object.keys(CORE_MASTER_TABLE_FILES).sort(),
    );
  });

  it("TC-DATA-02: vite.config.ts TABLE_FILE_MAP matches masterDataService.ts STATIC_TABLE_PATHS across all 7 tables", () => {
    const viteSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "vite.config.ts"),
      "utf-8",
    );
    const serviceSource = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/services/masterDataService.ts"),
      "utf-8",
    );

    for (const [key, filename] of Object.entries(CORE_MASTER_TABLE_FILES)) {
      assert.ok(
        viteSource.includes(`${key}: "${filename}"`),
        `vite.config.ts missing mapping ${key}: "${filename}"`,
      );
      assert.ok(
        serviceSource.includes(`${key}: "/master-data/${filename}"`),
        `masterDataService.ts missing path ${key}: "/master-data/${filename}"`,
      );
    }
  });

  it("TC-DATA-03: partner_hub_config v4.0 invariants (Optibide brand, FX rates, staffProfiles RBAC, exact period revenue sums, 4 properties incl. stay_h11)", () => {
    const bundle = loadSeedMasterBundle();
    const cfg = bundle.hubConfig;

    assert.equal(cfg.schemaVersion, "4.0.0");
    assert.equal(cfg.brandName, "Optibide");
    assert.equal(cfg.currencyRates.VND, 1);
    assert.ok(cfg.currencyRates.KRW > 0);
    assert.ok(cfg.currencyRates.USD > 0);

    for (const loc of ["vi", "en", "ko"] as const) {
      assert.ok(cfg.partnerUser.displayName[loc].length > 0);
      assert.ok(cfg.partnerUser.initials[loc].length > 0);
      assert.ok(cfg.partnerUser.roleBadge[loc].length > 0);
    }

    assert.ok(Array.isArray(cfg.staffProfiles) && cfg.staffProfiles.length === 5);
    assert.deepEqual(
      cfg.staffProfiles.map((s) => s.userId),
      [
        "USR-PARTNER-01",
        "USR-MGR-MYKHE",
        "USR-MGR-SONGHAN",
        "USR-STAFF-02",
        "USR-MGR-H11",
      ],
    );
    assert.deepEqual(
      cfg.staffProfiles.map((s) => s.roleKey),
      ["manager", "branch_manager", "branch_manager", "receptionist", "branch_manager"],
    );
    const ownerProfile = cfg.staffProfiles.find((s) => s.userId === "USR-PARTNER-01")!;
    assert.deepEqual(ownerProfile.allowedBranchIds, [
      "br_mykhe",
      "br_songhan",
      "br_anthuong",
      "stay_h11",
    ]);
    assert.equal(ownerProfile.canViewChainAll, true);
    assert.equal(ownerProfile.canViewFinancials, true);
    assert.equal(ownerProfile.canManagePricing, true);

    const receptionistProfile = cfg.staffProfiles.find((s) => s.userId === "USR-STAFF-02")!;
    assert.deepEqual(receptionistProfile.allowedBranchIds, ["br_mykhe"]);
    assert.equal(receptionistProfile.canViewChainAll, false);
    assert.equal(receptionistProfile.canViewFinancials, false);
    assert.equal(receptionistProfile.canManagePricing, false);

    const h11Manager = cfg.staffProfiles.find((s) => s.userId === "USR-MGR-H11")!;
    assert.deepEqual(h11Manager.allowedBranchIds, ["stay_h11"]);
    assert.equal(h11Manager.canViewChainAll, false);
    assert.equal(h11Manager.canViewFinancials, true);
    assert.equal(h11Manager.canManagePricing, true);

    assert.equal(cfg.properties.length, 4);
    const propIds = cfg.properties.map((p) => p.id);
    assert.deepEqual(propIds, [
      "br_mykhe",
      "br_songhan",
      "br_anthuong",
      "stay_h11",
    ]);

    const chainMembers = cfg.properties.filter((p) => p.isChainMember);
    assert.equal(chainMembers.length, 3);
    assert.equal(
      chainMembers.reduce((s, p) => s + p.roomsCount, 0),
      cfg.chainOverview.roomsCount,
    );
    assert.equal(
      chainMembers.reduce((s, p) => s + p.reviewCount, 0),
      cfg.chainOverview.reviewCount,
    );

    for (const period of ["today", "7d", "30d"] as const) {
      const meta = cfg.periodsMeta[period];
      assert.ok(meta.startDate <= meta.endDate);
      assert.equal(meta.endDate, cfg.referenceDate);
      assert.ok(meta.targetAcceptRatePct > 0 && meta.targetAcceptRatePct < 100);

      const branchSum = chainMembers.reduce(
        (s, p) => s + p.previousPeriodRevenueVnd[period],
        0,
      );
      assert.equal(
        branchSum,
        meta.previousNetRevenueVnd,
        `Period ${period} previousNetRevenueVnd (${meta.previousNetRevenueVnd}) != chain branch sum (${branchSum})`,
      );
    }

    const distinctElo = new Set(cfg.properties.map((p) => p.eloScore));
    assert.equal(
      distinctElo.size,
      4,
      "Each property should have its own ELO visibility score",
    );
    const h11 = cfg.properties.find((p) => p.id === "stay_h11")!;
    assert.equal(h11.isChainMember, false);
    assert.equal(h11.reviewRating5, 0);
    assert.equal(h11.reviewCount, 0);
    assert.equal(h11.eloScore, 800);
  });

  it("TC-DATA-04: bid_records has 100% valid FKs, all 4 status buckets > 0 on L'amour, exact 75 records for stay_h11, and enriched accepted booking slips", () => {
    const bundle = loadSeedMasterBundle();
    const validPropIds = new Set(bundle.hubConfig.properties.map((p) => p.id));
    const validRoomTypeIds = new Set(bundle.roomInventory.roomTypes.map((rt) => rt.id));
    const validBatchIds = new Set(bundle.payoutLedgers.batches.map((b) => b.id));
    const seenIds = new Set<string>();
    const seenBookingCodes = new Set<string>();

    for (const rec of bundle.bidRecords) {
      assert.equal(seenIds.has(rec.id), false, `Duplicate bid ID: ${rec.id}`);
      seenIds.add(rec.id);
      assert.ok(
        validPropIds.has(rec.propertyId),
        `Unknown propertyId ${rec.propertyId} on ${rec.id}`,
      );
      assert.ok(
        ["accepted", "expired", "rejected", "cancelled"].includes(rec.status),
        `Invalid status ${rec.status} on ${rec.id}`,
      );
      assert.ok(["auto", "manual"].includes(rec.bidMode));
      assert.ok(rec.nights >= 1);

      if (rec.status === "accepted") {
        assert.ok(rec.bookingCode?.startsWith("#"), `Missing bookingCode on ${rec.id}`);
        assert.equal(
          seenBookingCodes.has(rec.bookingCode!),
          false,
          `Duplicate bookingCode ${rec.bookingCode}`,
        );
        seenBookingCodes.add(rec.bookingCode!);
        assert.ok(rec.checkInDate && rec.checkOutDate);
        const diffDays = Math.round(
          (Date.parse(`${rec.checkOutDate}T00:00:00Z`) -
            Date.parse(`${rec.checkInDate}T00:00:00Z`)) /
            86_400_000,
        );
        assert.equal(diffDays, rec.nights, `Stay nights mismatch on ${rec.id}`);
        assert.ok((rec.guestsCount ?? 0) >= 1);
        assert.ok((rec.roomNumber ?? 0) >= 101);
        assert.equal(
          rec.netRevenueVnd,
          rec.offeredRatePerNightVnd * rec.nights,
          `Net revenue mismatch on ${rec.id}`,
        );
        assert.ok(rec.roomName && rec.roomName.vi && rec.roomName.en && rec.roomName.ko);
        assert.ok(rec.guestNote && rec.guestNote.vi && rec.guestNote.en && rec.guestNote.ko);
        assert.ok(Array.isArray(rec.amenities) && rec.amenities.length > 0);
        assert.ok(rec.guestFullName && rec.guestFullName.length > 1);
        assert.ok(rec.guestPhone && rec.guestPhone.length > 5);
        assert.ok(rec.roomTypeId && validRoomTypeIds.has(rec.roomTypeId));
        assert.ok(rec.payoutBatchId && validBatchIds.has(rec.payoutBatchId));
      }
    }

    const chainIds = new Set(
      bundle.hubConfig.properties.filter((p) => p.isChainMember).map((p) => p.id),
    );
    const chainRecs = bundle.bidRecords.filter((r) => chainIds.has(r.propertyId));
    assert.equal(chainRecs.length, 68);
    assert.equal(chainRecs.filter((r) => r.status === "accepted").length, 29);
    assert.ok(chainRecs.filter((r) => r.status === "expired").length > 0);
    assert.ok(chainRecs.filter((r) => r.status === "rejected").length > 0);
    assert.ok(
      chainRecs.filter((r) => r.status === "cancelled").length >= 4,
      "Expected >= 4 cancelled records so 4th Bids Status bucket is populated",
    );

    const familyBooking = bundle.bidRecords.find((r) => r.id === "CRQ-8938");
    assert.ok(familyBooking);
    assert.equal(familyBooking.guestsCount, 4);

    const h11Recs = bundle.bidRecords.filter((r) => r.propertyId === "stay_h11");
    assert.equal(h11Recs.length, 75);
    assert.equal(h11Recs.filter((r) => r.status === "accepted").length, 0);
    assert.equal(h11Recs.filter((r) => r.status === "expired").length, 8);
    assert.equal(h11Recs.filter((r) => r.status === "rejected").length, 67);
    assert.equal(h11Recs.filter((r) => r.status === "cancelled").length, 0);
  });

  it("TC-DATA-05: hub_inbox provides 2-way guest message threads, quickReplies & operational notifications (0 guest messages on stay_h11)", () => {
    const bundle = loadSeedMasterBundle();
    assert.ok(Array.isArray(bundle.hubInbox.messages));
    assert.ok(bundle.hubInbox.messages.length >= 5);
    assert.ok(Array.isArray(bundle.hubInbox.notifications));
    assert.ok(bundle.hubInbox.notifications.length >= 3);
    assert.ok(Array.isArray(bundle.hubInbox.quickReplies));
    assert.ok(bundle.hubInbox.quickReplies!.length >= 3);

    for (const msg of bundle.hubInbox.messages) {
      assert.notEqual(msg.propertyId, "stay_h11");
      assert.ok(msg.preview.vi && msg.preview.en && msg.preview.ko);
      assert.ok(Array.isArray(msg.thread) && msg.thread.length >= 1);
      for (const turn of msg.thread!) {
        assert.ok(turn.body.vi && turn.body.en && turn.body.ko);
      }
    }
    for (const note of bundle.hubInbox.notifications) {
      assert.ok(note.text.vi && note.text.en && note.text.ko);
    }
  });

  it("TC-DATA-06: room_inventory has exact 48 physical units matching properties[].roomsCount (12+10+8+18) and valid FKs", () => {
    const bundle = loadSeedMasterBundle();
    const inv = bundle.roomInventory;
    const propMap = new Map(bundle.hubConfig.properties.map((p) => [p.id, p]));
    const rtMap = new Map(inv.roomTypes.map((rt) => [rt.id, rt]));
    const bookingCodes = new Set(
      bundle.bidRecords
        .filter((r) => r.status === "accepted" && r.bookingCode)
        .map((r) => r.bookingCode!),
    );

    assert.equal(inv.roomTypes.length, 15);
    assert.equal(inv.units.length, 48);

    for (const rt of inv.roomTypes) {
      assert.ok(propMap.has(rt.propertyId));
      assert.ok(rt.floorRateVnd > 0 && rt.floorRateVnd <= rt.standardRateVnd);
      const matchingUnits = inv.units.filter((u) => u.roomTypeId === rt.id);
      assert.equal(
        matchingUnits.length,
        rt.unitsCount,
        `RoomType ${rt.id} unitsCount (${rt.unitsCount}) != physical units (${matchingUnits.length})`,
      );
    }

    for (const prop of bundle.hubConfig.properties) {
      const propUnits = inv.units.filter((u) => u.propertyId === prop.id);
      assert.equal(
        propUnits.length,
        prop.roomsCount,
        `Property ${prop.id} roomsCount (${prop.roomsCount}) != physical units (${propUnits.length})`,
      );
    }

    const seenRoomNumbers = new Set<number>();
    for (const u of inv.units) {
      assert.ok(rtMap.has(u.roomTypeId));
      assert.equal(seenRoomNumbers.has(u.roomNumber), false, `Duplicate roomNumber ${u.roomNumber}`);
      seenRoomNumbers.add(u.roomNumber);
      if (u.activeBookingCode) {
        assert.ok(bookingCodes.has(u.activeBookingCode));
      }
    }

    for (const blk of inv.calendarBlocks) {
      assert.ok(propMap.has(blk.propertyId));
      assert.ok(seenRoomNumbers.has(blk.roomNumber));
      assert.ok(blk.startDate < blk.endDate);
    }
  });

  it("TC-DATA-07: payout_ledgers reconciles 100% of accepted bookings (#43..#71) to exact 66,360,000 VND with 4 verified bank accounts", () => {
    const bundle = loadSeedMasterBundle();
    const ledgers = bundle.payoutLedgers;
    assert.equal(ledgers.bankAccounts.length, 4);
    for (const ba of ledgers.bankAccounts) {
      assert.equal(ba.verified, true);
      assert.ok(ba.accountNumber.length >= 8);
    }

    const acceptedRecs = bundle.bidRecords.filter((r) => r.status === "accepted");
    const totalAcceptedVnd = acceptedRecs.reduce(
      (s, r) => s + (r.netRevenueVnd ?? r.offeredRatePerNightVnd * r.nights),
      0,
    );
    assert.equal(totalAcceptedVnd, 66_360_000);

    const batchedCodes = new Set<string>();
    let totalBatchesNetVnd = 0;
    for (const batch of ledgers.batches) {
      assert.equal(batch.bookingCodes.length, batch.bookingsCount);
      assert.equal(batch.grossRoomVnd + batch.adjustmentVnd, batch.netPayoutVnd);
      totalBatchesNetVnd += batch.netPayoutVnd;
      for (const code of batch.bookingCodes) {
        assert.equal(batchedCodes.has(code), false, `Booking ${code} in multiple payout batches`);
        batchedCodes.add(code);
      }
    }

    assert.equal(batchedCodes.size, 29);
    assert.equal(totalBatchesNetVnd, 66_360_000);
  });

  it("TC-DATA-08: bidding_operations provides live traveler requests (incl. stay_h11) and synchronized per-property AutoBid guardrails", () => {
    const bundle = loadSeedMasterBundle();
    const ops = bundle.biddingOperations;
    const validProps = new Map(bundle.hubConfig.properties.map((p) => [p.id, p]));

    assert.ok(ops.liveRequests.length >= 6);
    assert.ok(
      ops.liveRequests.some(
        (req) => req.propertyId === "stay_h11" && req.status === "waiting_offer",
      ),
      "stay_h11 should have live waiting traveler requests so hotelier can send first winning offer",
    );

    assert.equal(ops.autoBidRules.length, 4);
    for (const rule of ops.autoBidRules) {
      const prop = validProps.get(rule.propertyId);
      assert.ok(prop);
      assert.equal(rule.enabled, prop.autoBidEnabled);
      assert.ok(rule.minFloorRateVnd >= 400_000);
    }
  });

  it("TC-DATA-09: marketing_campaigns provides localized Last-Minute Deals & Room Upsell offers with valid pricing", () => {
    const bundle = loadSeedMasterBundle();
    const mkt = bundle.marketingCampaigns;
    const validPropIds = new Set(bundle.hubConfig.properties.map((p) => p.id));

    assert.ok(mkt.flashDeals.length >= 4);
    for (const deal of mkt.flashDeals) {
      assert.ok(validPropIds.has(deal.propertyId));
      assert.ok(deal.dealRateVnd > 0 && deal.dealRateVnd < deal.originalRateVnd);
      assert.ok(deal.title.vi && deal.title.en && deal.title.ko);
    }

    assert.ok(mkt.upsellOffers.length >= 5);
    for (const up of mkt.upsellOffers) {
      assert.ok(validPropIds.has(up.propertyId));
      assert.ok(up.priceVnd > 0);
      assert.ok(up.title.vi && up.title.en && up.title.ko);
    }
  });

  it("TC-DATA-10: schema_manifest v4.0.0 maps all 4 event tracking sheets (45 events) across all 7 master-data tables", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(MASTER_DATA_DIR, "schema_manifest.json"), "utf-8"),
    );
    const seedManifest = JSON.parse(
      fs.readFileSync(path.join(SEED_DATA_DIR, "schema_manifest.json"), "utf-8"),
    );
    assert.deepEqual(manifest, seedManifest);

    assert.ok(manifest.eventSheetsMetadata);
    assert.equal(
      manifest.eventSheetsMetadata.spreadsheetId,
      "1y8z02l_JBR5_qP41CV6Ex4HARZkA_SDpP64iRDma8QI",
    );
    const sheets = manifest.eventSheetsMetadata.sheets;
    assert.deepEqual(Object.keys(sheets).sort(), [
      "booking_form",
      "explore_stays",
      "offer_listing",
      "payment_form",
    ]);
    assert.equal(sheets.booking_form.events.length, 12);
    assert.equal(sheets.offer_listing.events.length, 10);
    assert.equal(sheets.explore_stays.events.length, 12);
    assert.equal(sheets.payment_form.events.length, 11);

    const totalEvents =
      sheets.booking_form.events.length +
      sheets.offer_listing.events.length +
      sheets.explore_stays.events.length +
      sheets.payment_form.events.length;
    assert.equal(totalEvents, 45);

    for (const [tableKey, tableDef] of Object.entries<any>(manifest.tables)) {
      assert.ok(
        Array.isArray(tableDef.mappedSheets) && tableDef.mappedSheets.length >= 1,
        `Table ${tableKey} missing mappedSheets`,
      );
      assert.ok(
        Array.isArray(tableDef.sourceEvents) && tableDef.sourceEvents.length >= 1,
        `Table ${tableKey} missing sourceEvents`,
      );
      assert.ok(
        Array.isArray(tableDef.mappedParameters) && tableDef.mappedParameters.length >= 1,
        `Table ${tableKey} missing mappedParameters`,
      );
    }
  });

  it("TC-DATA-11: 143 bid_records, 4 properties, 15 roomTypes, 12 payout batches & 6 liveRequests satisfy 4-sheet telemetry, Distribution Curve, and x1.265 GMV/Fee/VAT invariants", () => {
    const bundle = loadSeedMasterBundle();
    const propMap = new Map(bundle.hubConfig.properties.map((p) => [p.id, p]));
    const rtMap = new Map(bundle.roomInventory.roomTypes.map((rt) => [rt.id, rt]));

    for (const prop of bundle.hubConfig.properties) {
      assert.ok(prop.marketplaceIdentity, `Missing marketplaceIdentity on ${prop.id}`);
      assert.equal(prop.marketplaceIdentity!.property_id, prop.id);
      assert.ok(prop.marketplaceIdentity!.staying_ward.length > 5);
      assert.equal(prop.marketplaceIdentity!.review_score, prop.reviewRating5);
      assert.equal(prop.marketplaceIdentity!.review_count, prop.reviewCount);
    }

    for (const rt of bundle.roomInventory.roomTypes) {
      assert.ok(rt.catalogMapping, `Missing catalogMapping on ${rt.id}`);
      assert.equal(rt.catalogMapping!.room_id, rt.id);
      assert.ok(rt.catalogMapping!.combo_signature.startsWith("hotel|"));
    }

    let sumAcceptedBaseVnd = 0;
    let sumAcceptedFeeVnd = 0;
    let sumAcceptedVatVnd = 0;
    let sumAcceptedGmvVnd = 0;

    for (const rec of bundle.bidRecords) {
      assert.ok(rec.telemetry, `Missing telemetry on ${rec.id}`);
      const { booking_form: bf, offer_listing: ol, explore_stays: es, payment_form: pf } =
        rec.telemetry!;

      assert.equal(bf.request_code, rec.id);
      assert.ok(["mobile", "tablet", "desktop"].includes(bf.device_type));
      assert.ok(bf.staying_ward.length > 5);
      assert.equal(bf.stay_nights, rec.nights);
      assert.equal(bf.adults + bf.children + bf.infants, bf.total_guests);
      assert.equal(
        bf.cancel_source !== null,
        rec.status === "cancelled",
        `cancel_source mismatch on ${rec.id}`,
      );

      assert.equal(ol.property_id, rec.propertyId);
      assert.ok(rtMap.has(ol.room_id), `Unknown room_id ${ol.room_id} on ${rec.id}`);
      assert.equal(ol.is_auto_bid, rec.bidMode === "auto");
      assert.equal(ol.device_type, bf.device_type);
      assert.equal(ol.device_os, bf.device_os);
      assert.ok(ol.card_position >= 1 && ol.card_position <= ol.total_offers_count);
      assert.equal(ol.is_expired, rec.status === "expired");
      assert.equal(
        ol.browse_click_count,
        ol.browse_elapsed_sec_list.length,
        `Distribution curve list length != browse_click_count on ${rec.id}`,
      );
      if (ol.was_detail_viewed) {
        assert.ok(ol.browse_elapsed_sec_list.length >= 1);
        assert.equal(ol.elapsed_since_bid_sec, ol.browse_elapsed_sec_list[0]);
        for (let i = 0; i < ol.browse_elapsed_sec_list.length; i++) {
          const sec = ol.browse_elapsed_sec_list[i];
          assert.ok(sec > 0 && sec <= 3600, `Invalid browse sec ${sec} on ${rec.id}`);
          if (i > 0) {
            assert.ok(sec > ol.browse_elapsed_sec_list[i - 1]);
          }
        }
        assert.ok(es !== null, `Expected explore_stays telemetry when viewed on ${rec.id}`);
        const propIdent = propMap.get(rec.propertyId)!.marketplaceIdentity!;
        assert.equal(es!.star_rating, propIdent.star_rating);
        assert.equal(es!.review_score, propIdent.review_score);
        assert.equal(es!.review_count, propIdent.review_count);
      } else {
        assert.equal(ol.elapsed_since_bid_sec, null);
        assert.equal(es, null);
      }

      const expectedBase = rec.netRevenueVnd ?? rec.offeredRatePerNightVnd * rec.nights;
      const expectedFee = Math.round(expectedBase * 0.15);
      const expectedVat = Math.round((expectedBase + expectedFee) * 0.1);
      const expectedGmv = expectedBase + expectedFee + expectedVat;
      assert.equal(ol.offer_total_price, expectedGmv);
      assert.ok(ol.ota_price > ol.offer_total_price);

      if (rec.status === "accepted") {
        assert.ok(pf !== null, `Missing payment_form telemetry on accepted ${rec.id}`);
        assert.equal(pf!.booking_id, rec.bookingCode);
        assert.equal(pf!.base_price, expectedBase);
        assert.equal(pf!.platform_fee_amount, expectedFee);
        assert.equal(pf!.vat_amount, expectedVat);
        assert.equal(pf!.total_booking_amount, expectedGmv);
        if (pf!.is_first_payment) {
          assert.ok(pf!.time_since_signup_hours !== null && pf!.time_since_signup_hours > 0);
          assert.equal(pf!.days_since_prev_payment, null);
        } else {
          assert.equal(pf!.time_since_signup_hours, null);
          assert.ok(pf!.days_since_prev_payment !== null && pf!.days_since_prev_payment > 0);
        }
        sumAcceptedBaseVnd += pf!.base_price;
        sumAcceptedFeeVnd += pf!.platform_fee_amount;
        sumAcceptedVatVnd += pf!.vat_amount;
        sumAcceptedGmvVnd += pf!.total_booking_amount;
      } else {
        assert.equal(pf, null, `Non-accepted bid ${rec.id} must have payment_form = null`);
      }
    }

    assert.equal(sumAcceptedBaseVnd, 66_360_000);
    let batchBase = 0;
    let batchFee = 0;
    let batchVat = 0;
    let batchGmv = 0;
    for (const batch of bundle.payoutLedgers.batches) {
      assert.ok(batch.settlementBreakdown, `Missing settlementBreakdown on ${batch.id}`);
      const sb = batch.settlementBreakdown!;
      assert.equal(sb.payment_codes.length, batch.bookingsCount);
      assert.equal(sb.partner_base_price_vnd, batch.netPayoutVnd);
      assert.equal(
        sb.partner_base_price_vnd + sb.platform_fee_15pct_vnd + sb.vat_10pct_vnd,
        sb.total_booking_gmv_vnd,
      );
      batchBase += sb.partner_base_price_vnd;
      batchFee += sb.platform_fee_15pct_vnd;
      batchVat += sb.vat_10pct_vnd;
      batchGmv += sb.total_booking_gmv_vnd;
    }
    assert.equal(batchBase, sumAcceptedBaseVnd);
    assert.equal(batchFee, sumAcceptedFeeVnd);
    assert.equal(batchVat, sumAcceptedVatVnd);
    assert.equal(batchGmv, sumAcceptedGmvVnd);

    for (const req of bundle.biddingOperations.liveRequests) {
      assert.ok(req.requestTelemetry, `Missing requestTelemetry on ${req.id}`);
      assert.equal(req.requestTelemetry!.remaining_ttl_sec, req.expiresInMinutes * 60);
    }
    for (const rule of bundle.biddingOperations.autoBidRules) {
      assert.ok(rule.guardrailTelemetry, `Missing guardrailTelemetry on ${rule.propertyId}`);
      assert.equal(rule.guardrailTelemetry!.is_auto_bid_default, rule.enabled);
    }
  });
});
