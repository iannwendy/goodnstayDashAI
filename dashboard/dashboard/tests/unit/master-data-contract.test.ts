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

describe("TC-DATA: Lean Partner Hub Master Data v3.0 Contract & Referential Integrity", () => {
  it("TC-DATA-01: all 3 lean master-data & seed JSON files + schema_manifest v3.0.0 exist and 0 legacy bloat files remain", () => {
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
    assert.equal(manifest.schemaVersion, "3.0.0");
    assert.deepEqual(
      Object.keys(manifest.tables).sort(),
      Object.keys(CORE_MASTER_TABLE_FILES).sort(),
    );
  });

  it("TC-DATA-02: vite.config.ts TABLE_FILE_MAP matches masterDataService.ts STATIC_TABLE_PATHS", () => {
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

  it("TC-DATA-03: partner_hub_config invariants (Optibide brand, FX rates, user i18n, exact period revenue sums, 4 properties incl. stay_h11)", () => {
    const bundle = loadSeedMasterBundle();
    const cfg = bundle.hubConfig;

    assert.equal(cfg.schemaVersion, "3.0.0");
    assert.equal(cfg.brandName, "Optibide");
    assert.equal(cfg.currencyRates.VND, 1);
    assert.ok(cfg.currencyRates.KRW > 0);
    assert.ok(cfg.currencyRates.USD > 0);

    for (const loc of ["vi", "en", "ko"] as const) {
      assert.ok(cfg.partnerUser.displayName[loc].length > 0);
      assert.ok(cfg.partnerUser.initials[loc].length > 0);
      assert.ok(cfg.partnerUser.roleBadge[loc].length > 0);
    }

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

    // Exact previousPeriodRevenueVnd equality across ALL 3 periods (fixing the old 550k today discrepancy)
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

    // Distinct ratings & ELO across branches + stay_h11 zero-booking baseline
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

  it("TC-DATA-04: bid_records has 100% valid FKs, all 4 status buckets > 0 on L'amour, exact 75 records for stay_h11, and complete accepted booking slips", () => {
    const bundle = loadSeedMasterBundle();
    const validPropIds = new Set(bundle.hubConfig.properties.map((p) => p.id));
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
      }
    }

    // L'amour chain records have non-zero counts in ALL 4 buckets (including cancelled > 0)
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

    // Family Connecting Suite CRQ-8938 explicitly records 4 guests
    const familyBooking = bundle.bidRecords.find((r) => r.id === "CRQ-8938");
    assert.ok(familyBooking);
    assert.equal(familyBooking.guestsCount, 4);

    // Stay Hotel H11 records come directly from bid_records.json (0 accepted, 8 expired, 67 rejected, 0 cancelled = 75)
    const h11Recs = bundle.bidRecords.filter((r) => r.propertyId === "stay_h11");
    assert.equal(h11Recs.length, 75);
    assert.equal(h11Recs.filter((r) => r.status === "accepted").length, 0);
    assert.equal(h11Recs.filter((r) => r.status === "expired").length, 8);
    assert.equal(h11Recs.filter((r) => r.status === "rejected").length, 67);
    assert.equal(h11Recs.filter((r) => r.status === "cancelled").length, 0);
  });

  it("TC-DATA-05: hub_inbox provides localized messages and operational notifications", () => {
    const bundle = loadSeedMasterBundle();
    assert.ok(Array.isArray(bundle.hubInbox.messages));
    assert.ok(bundle.hubInbox.messages.length >= 2);
    assert.ok(Array.isArray(bundle.hubInbox.notifications));
    assert.ok(bundle.hubInbox.notifications.length >= 2);

    for (const msg of bundle.hubInbox.messages) {
      assert.ok(msg.preview.vi && msg.preview.en && msg.preview.ko);
    }
    for (const note of bundle.hubInbox.notifications) {
      assert.ok(note.text.vi && note.text.en && note.text.ko);
    }
  });
});
