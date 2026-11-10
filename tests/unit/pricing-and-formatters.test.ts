import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcGuestTotalFromBase,
  formatCompactVnd,
  formatButtonVnd,
  formatFullVnd,
  formatCountdown,
  parseStayDayOffsets,
} from "@/data";

describe("TC-UNIT: Pricing Formula, VND Formatters, Countdown & Stay-Date Parser", () => {
  describe("TC-UNIT-01..05: calcGuestTotalFromBase (1.15 platform fee × 1.10 VAT = 1.265)", () => {
    it("TC-UNIT-01: verifies exact production multiplier (1 + 0.15) * (1 + 0.10) = 1.265", () => {
      const derivedMultiplier = Number(((1 + 0.15) * (1 + 0.1)).toFixed(4));
      assert.equal(derivedMultiplier, 1.265);
      assert.equal(calcGuestTotalFromBase(1_000_000), 1_265_000);
    });

    it("TC-UNIT-02: computes standard hotel base tiers accurately", () => {
      assert.equal(calcGuestTotalFromBase(850_000), 1_075_250);
      assert.equal(calcGuestTotalFromBase(722_500), Math.round(722_500 * 1.265));
      assert.equal(calcGuestTotalFromBase(1_250_000), 1_581_250);
      assert.equal(calcGuestTotalFromBase(1_980_000), 2_504_700);
      assert.equal(calcGuestTotalFromBase(3_200_000), 4_048_000);
    });

    it("TC-UNIT-03: handles zero and rounds fractional VND to nearest integer", () => {
      assert.equal(calcGuestTotalFromBase(0), 0);
      assert.equal(calcGuestTotalFromBase(333_333), Math.round(333_333 * 1.265));
      assert.equal(Number.isInteger(calcGuestTotalFromBase(777_777)), true);
    });

    it("TC-UNIT-04: respects explicit custom multiplier override", () => {
      assert.equal(calcGuestTotalFromBase(1_000_000, 1.1), 1_100_000);
      assert.equal(calcGuestTotalFromBase(1_000_000, 1.0), 1_000_000);
    });

    it("TC-UNIT-05: preserves monotonic ordering (baseA < baseB => guestA <= guestB)", () => {
      for (let price = 500_000; price <= 5_000_000; price += 75_000) {
        assert.ok(
          calcGuestTotalFromBase(price) < calcGuestTotalFromBase(price + 75_000),
        );
      }
    });
  });

  describe("TC-UNIT-06..09: VND Display Formatters (Compact, Button, Full)", () => {
    it("TC-UNIT-06: formatCompactVnd formats sub-million (<1M), 1M–10M, and >=10M tiers", () => {
      assert.equal(formatCompactVnd(0), "0k");
      assert.equal(formatCompactVnd(850_000), "850k");
      assert.equal(formatCompactVnd(722_500), "723k");
      assert.equal(formatCompactVnd(1_000_000), "1M");
      assert.equal(formatCompactVnd(1_500_000), "1.5M");
      assert.equal(formatCompactVnd(1_980_000), "1.98M");
      assert.equal(formatCompactVnd(10_000_000), "10M");
      assert.equal(formatCompactVnd(11_850_000), `${(11.85).toFixed(1)}M`);
      assert.equal(formatCompactVnd(66_360_000), "66.4M");
    });

    it("TC-UNIT-07: formatButtonVnd uses uppercase K below 1M and clean M notation from 1M+", () => {
      assert.equal(formatButtonVnd(850_000), "850K");
      assert.equal(formatButtonVnd(950_000), "950K");
      assert.equal(formatButtonVnd(1_000_000), "1M");
      assert.equal(formatButtonVnd(1_500_000), "1.5M");
      assert.equal(formatButtonVnd(1_980_000), "1.98M");
      assert.equal(formatButtonVnd(2_000_000), "2M");
    });

    it("TC-UNIT-08: formatFullVnd renders vi-VN dot-grouped integers with trailing đ", () => {
      assert.equal(formatFullVnd(0), "0đ");
      assert.equal(formatFullVnd(850_000), "850.000đ");
      assert.equal(formatFullVnd(1_265_000), "1.265.000đ");
      assert.equal(formatFullVnd(66_360_000), "66.360.000đ");
      assert.equal(formatFullVnd(1_000.6), "1.001đ");
    });
  });

  describe("TC-UNIT-10..12: formatCountdown (Auction TTL & SLA Thresholds)", () => {
    it("TC-UNIT-10: clamps zero and negative values to 00:00", () => {
      assert.equal(formatCountdown(0), "00:00");
      assert.equal(formatCountdown(-1), "00:00");
      assert.equal(formatCountdown(-999), "00:00");
    });

    it("TC-UNIT-11: zero-pads single-digit minutes and seconds", () => {
      assert.equal(formatCountdown(5), "00:05");
      assert.equal(formatCountdown(59), "00:59");
      assert.equal(formatCountdown(60), "01:00");
      assert.equal(formatCountdown(65), "01:05");
    });

    it("TC-UNIT-12: formats critical SLA thresholds (3m urgent, 10m warn, 60m TTL)", () => {
      assert.equal(formatCountdown(180), "03:00");
      assert.equal(formatCountdown(600), "10:00");
      assert.equal(formatCountdown(3600), "60:00");
      assert.equal(formatCountdown(3661), "61:01");
    });
  });

  describe("TC-UNIT-13..18: parseStayDayOffsets (14-Day Golden Window Date Parser)", () => {
    it("TC-UNIT-13: parses tonight 1-night stay (06/11 – 07/11) to [0]", () => {
      assert.deepEqual(
        parseStayDayOffsets("06/11 – 07/11 (1 đêm)", "2026-11-06", 1),
        [0],
      );
    });

    it("TC-UNIT-14: parses multi-night future stay with both en-dash (–) and hyphen (-)", () => {
      assert.deepEqual(
        parseStayDayOffsets("09/11 – 11/11 (2 đêm)", "2026-11-06", 2),
        [3, 4],
      );
      assert.deepEqual(
        parseStayDayOffsets("07/11 - 10/11", "2026-11-06", 3),
        [1, 2, 3],
      );
    });

    it("TC-UNIT-15: handles month-boundary rollover accurately (Oct -> Nov)", () => {
      assert.deepEqual(
        parseStayDayOffsets("30/10 – 02/11", "2026-10-30", 3),
        [0, 1, 2],
      );
    });

    it("TC-UNIT-16: clamps stay offsets strictly inside [0, 13] 14-day window", () => {
      // Starts before referenceDate -> negative offsets dropped
      assert.deepEqual(
        parseStayDayOffsets("05/11 – 08/11", "2026-11-06", 3),
        [0, 1],
      );
      // Extends beyond 14-day horizon -> >=14 offsets dropped
      assert.deepEqual(
        parseStayDayOffsets("18/11 – 22/11", "2026-11-06", 4),
        [12, 13],
      );
    });

    it("TC-UNIT-17: falls back safely when stayText is undefined, malformed, or inverted", () => {
      assert.deepEqual(parseStayDayOffsets(undefined, "2026-11-06", 2), [0, 1]);
      assert.deepEqual(parseStayDayOffsets("Tối nay", "2026-11-06", 3), [0, 1, 2]);
      assert.deepEqual(
        parseStayDayOffsets("10/11 – 08/11", "2026-11-06", 1),
        [0],
      );
      // Fallback nights >= 14 still clamps to 14 days [0..13]
      assert.equal(parseStayDayOffsets(undefined, "2026-11-06", 20).length, 14);
    });
  });
});
