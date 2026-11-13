import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  CORE_MASTER_TABLE_FILES,
  MASTER_DATA_DIR,
  PROJECT_ROOT,
  SEED_DATA_DIR,
  loadSeedMasterBundle,
} from "../helpers/seed-loader";

describe("TC-DATA: Master Data Schema, Referential Integrity & Table Parity", () => {
  const bundle = loadSeedMasterBundle();

  it("TC-DATA-01: all 11 core seed & live JSON files exist and parse cleanly", () => {
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
      assert.doesNotThrow(() => JSON.parse(fs.readFileSync(seedPath, "utf-8")));
      assert.doesNotThrow(() => JSON.parse(fs.readFileSync(livePath, "utf-8")));
    }
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

  it("TC-DATA-03: hotel_profile invariants (pricing rates, SLA thresholds, 30 rooms across 3 branches)", () => {
    const hp = bundle.hotelProfile;
    assert.equal(hp.totalRooms, 30);
    assert.equal(hp.goldenWindowDays, 14);
    assert.equal(hp.platformFeeRate, 0.15);
    assert.equal(hp.vatRate, 0.1);
    assert.equal(
      Number(((1 + hp.platformFeeRate) * (1 + hp.vatRate)).toFixed(4)),
      hp.guestPriceMultiplier,
    );
    assert.ok(hp.urgentThresholdSeconds < hp.warnThresholdSeconds);
    assert.ok(hp.warnThresholdSeconds < hp.bidTtlSeconds);
    assert.ok(hp.defaultFloorPrice > 0);
    assert.equal(hp.branches.length, 3);

    const branchRoomSum = hp.branches.reduce((s, b) => s + b.totalRooms, 0);
    assert.equal(branchRoomSum, hp.totalRooms);
  });

  it("TC-DATA-04: users_roles defines Manager (override ON, bot ON) and Receptionist (override OFF, bot OFF)", () => {
    const manager = bundle.usersRoles.find((u) => u.role === "manager");
    const receptionist = bundle.usersRoles.find(
      (u) => u.role === "receptionist",
    );
    assert.ok(manager, "Missing manager role in users_roles.json");
    assert.ok(receptionist, "Missing receptionist role in users_roles.json");
    assert.equal(manager.canOverrideFloor, true);
    assert.equal(manager.canConfigureBotRules, true);
    assert.equal(receptionist.canOverrideFloor, false);
    assert.equal(receptionist.canConfigureBotRules, false);
  });

  it("TC-DATA-05: room_classes sum to 30 rooms and baseFloorPrice < rackRate", () => {
    assert.equal(bundle.roomClasses.length, 4);
    const totalClassRooms = bundle.roomClasses.reduce(
      (sum, rc) => sum + rc.totalRooms,
      0,
    );
    assert.equal(totalClassRooms, bundle.hotelProfile.totalRooms);

    for (const rc of bundle.roomClasses) {
      assert.ok(
        rc.baseFloorPrice > 0 && rc.baseFloorPrice < rc.rackRate,
        `Invalid floor/rack rate on ${rc.id}`,
      );
      assert.ok(!rc.roomRange.includes("##"), `Double hash in ${rc.roomRange}`);
    }
  });

  it("TC-DATA-06: rooms_pms has 30 unique rooms (#101..#130) with valid branchId & roomClassId FKs", () => {
    assert.equal(bundle.roomsPms.length, 30);
    const validBranchIds = new Set(bundle.hotelProfile.branches.map((b) => b.id));
    const validClassIds = new Set(bundle.roomClasses.map((c) => c.id));
    const seenRooms = new Set<number>();

    for (const room of bundle.roomsPms) {
      assert.ok(
        room.roomNumber >= 101 && room.roomNumber <= 130,
        `Room number out of range: ${room.roomNumber}`,
      );
      assert.equal(
        seenRooms.has(room.roomNumber),
        false,
        `Duplicate roomNumber: ${room.roomNumber}`,
      );
      seenRooms.add(room.roomNumber);
      assert.ok(
        validBranchIds.has(room.branchId),
        `Unknown branchId ${room.branchId} on room ${room.roomNumber}`,
      );
      assert.ok(
        validClassIds.has(room.roomClassId),
        `Unknown roomClassId ${room.roomClassId} on room ${room.roomNumber}`,
      );
    }

    // Per-branch count matches hotelProfile.branches.totalRooms
    for (const br of bundle.hotelProfile.branches) {
      const count = bundle.roomsPms.filter((r) => r.branchId === br.id).length;
      assert.equal(count, br.totalRooms, `Branch ${br.id} room count mismatch`);
    }

    // Per-class count matches roomClasses.totalRooms
    for (const rc of bundle.roomClasses) {
      const count = bundle.roomsPms.filter(
        (r) => r.roomClassId === rc.id,
      ).length;
      assert.equal(count, rc.totalRooms, `RoomClass ${rc.id} count mismatch`);
    }
  });

  it("TC-DATA-07: calendar_14d_pms has 14 sequential days (dayOffset 0..13) starting at referenceDate", () => {
    assert.equal(bundle.calendar14dPms.length, 14);
    assert.equal(
      bundle.calendar14dPms[0].isoDate,
      bundle.hotelProfile.referenceDate,
    );

    bundle.calendar14dPms.forEach((day, idx) => {
      assert.equal(day.dayOffset, idx);
      assert.equal(day.totalRooms, 30);
      const holdCount = day.paymentHoldRooms ?? 0;
      assert.ok(
        day.otherBooked >= 0 &&
          day.auctionBooked >= 0 &&
          holdCount >= 0 &&
          day.vacantRooms >= 0,
      );
      assert.equal(
        day.otherBooked + day.auctionBooked + holdCount + day.vacantRooms,
        day.totalRooms,
        `Day offset ${idx} (${day.isoDate}) room equation mismatch`,
      );
    });
  });

  it("TC-DATA-08: auction_sessions have unique IDs and valid roomClassId, branchId, lockedRoomNumber & autopsyId FKs", () => {
    assert.ok(bundle.auctionSessions.length >= 60);
    const seenIds = new Set<string>();
    const validBranchIds = new Set(bundle.hotelProfile.branches.map((b) => b.id));
    const validClassIds = new Set(bundle.roomClasses.map((c) => c.id));
    const validRooms = new Set(bundle.roomsPms.map((r) => r.roomNumber));

    for (const s of bundle.auctionSessions) {
      assert.equal(seenIds.has(s.id), false, `Duplicate session ID: ${s.id}`);
      seenIds.add(s.id);
      assert.ok(
        validClassIds.has(s.matchedRoomClassId),
        `Session ${s.id} has invalid matchedRoomClassId ${s.matchedRoomClassId}`,
      );
      if (s.branchId) {
        assert.ok(
          validBranchIds.has(s.branchId),
          `Session ${s.id} has invalid branchId ${s.branchId}`,
        );
      }
      if (s.lockedRoomNumber !== undefined) {
        assert.ok(
          validRooms.has(s.lockedRoomNumber),
          `Session ${s.id} has invalid lockedRoomNumber ${s.lockedRoomNumber}`,
        );
      }
      if (s.holdRoomNumber != null) {
        assert.ok(
          validRooms.has(s.holdRoomNumber),
          `Session ${s.id} has invalid holdRoomNumber ${s.holdRoomNumber}`,
        );
      }
      if (s.autopsyId) {
        assert.ok(
          Boolean(bundle.lossAutopsies[s.autopsyId]),
          `Session ${s.id} references missing autopsyId ${s.autopsyId}`,
        );
      }
      assert.ok(s.matchScore >= 0 && s.matchScore <= 100);
      assert.ok(s.nights >= 1);
    }
  });

  it("TC-DATA-09: system_benchmarks covers all 3 periods (today, 7d, 30d) and all 4 room classes", () => {
    const periods = bundle.systemBenchmarks.periodsMeta;
    for (const key of ["today", "7d", "30d"] as const) {
      assert.ok(periods[key], `Missing period meta for ${key}`);
      assert.ok(periods[key].startDate <= periods[key].endDate);
      assert.equal(periods[key].endDate, bundle.hotelProfile.referenceDate);
      assert.ok(periods[key].platformWinRatePct > 0 && periods[key].platformWinRatePct < 100);
    }

    const benchIds = new Set(
      bundle.systemBenchmarks.roomClassBenchmarks.map((b) => b.roomClassId),
    );
    for (const rc of bundle.roomClasses) {
      assert.ok(benchIds.has(rc.id), `Missing benchmark for room class ${rc.id}`);
    }
  });

  it("TC-DATA-10: perks_catalog & match_breakdowns link valid perk IDs", () => {
    assert.ok(bundle.perksCatalog.length >= 3);
    const perkIds = new Set(bundle.perksCatalog.map((p) => p.id));
    for (const p of bundle.perksCatalog) {
      assert.ok(p.unitCostVnd >= 0);
      assert.ok(p.winBoostPct > 0);
    }
    for (const [key, mb] of Object.entries(bundle.matchBreakdowns)) {
      if (mb.suggestedPerkId) {
        assert.ok(
          perkIds.has(mb.suggestedPerkId),
          `MatchBreakdown ${key} references unknown suggestedPerkId ${mb.suggestedPerkId}`,
        );
      }
    }
  });

  it("TC-DATA-11: lifecycle_catalog defines 9 stages, 4 room states, 11+ reject codes, 18 cases & 10m payment_hold FK parity", () => {
    const lc = bundle.lifecycleCatalog;
    assert.ok(lc, "Missing lifecycle_catalog.json in master bundle");
    assert.equal(lc.holdMechanism.ttlSeconds, 600);
    assert.equal(lc.holdMechanism.ttlMinutes, 10);
    assert.equal(lc.roomStateMachine.length, 4);
    assert.equal(lc.stages.length, 9);
    assert.ok(lc.rejectCatalog.length >= 11);
    assert.equal(lc.scenarioMatrix.length, 18);

    const holdRooms = bundle.roomsPms.filter((r) => r.status === "payment_hold");
    assert.equal(holdRooms.length, 1, "Expected 1 active 10m payment_hold room in seed (#130)");
    assert.equal(holdRooms[0].roomNumber, 130);
    assert.equal(holdRooms[0].linkedReqId, "CRQ-8944");
    assert.ok((holdRooms[0].holdRemainingSeconds ?? 0) > 0 && (holdRooms[0].holdRemainingSeconds ?? 0) <= 600);
  });
});
