import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  convertFromVnd,
  formatAxisTickMoney,
  formatBusinessMoney,
  formatDisplayDate,
  getZeroRevenueAxisMaxVnd,
  localizeAmenityCode,
} from "@/lib/i18n";

describe("TC-UNIT: Partner Hub Multi-Currency FX, Compact/Full Money, Date & Amenity Localization", () => {
  it("TC-UNIT-01: convertFromVnd handles zero, default FX rates, and custom master-data FX rate overrides", () => {
    assert.equal(convertFromVnd(0, "VND"), 0);
    assert.equal(convertFromVnd(0, "KRW"), 0);
    assert.equal(convertFromVnd(0, "USD"), 0);

    assert.equal(convertFromVnd(1_850_000, "KRW"), 100_000);
    assert.equal(convertFromVnd(2_540_000, "USD"), 100);

    // Custom FX rates passed from partner_hub_config.json
    const customRates = { VND: 1, KRW: 20, USD: 25_000 };
    assert.equal(convertFromVnd(2_000_000, "KRW", customRates), 100_000);
    assert.equal(convertFromVnd(2_500_000, "USD", customRates), 100);
  });

  it("TC-UNIT-02: formatBusinessMoney formats VND, KRW, and USD across compact, full, zero, and signed tiers", () => {
    assert.equal(
      formatBusinessMoney(0, "VND", { compact: true, withPlus: true }),
      "0 ₫",
    );
    assert.equal(
      formatBusinessMoney(0, "KRW", { compact: true, withPlus: true }),
      "0 ₩",
    );
    assert.equal(
      formatBusinessMoney(0, "USD", { compact: true, withPlus: true }),
      "$0",
    );

    const vndCompact = formatBusinessMoney(31_820_000, "VND", {
      compact: true,
      withPlus: true,
    });
    assert.equal(vndCompact, "+31,8tr ₫");

    const krwCompact = formatBusinessMoney(48_100_000, "KRW", {
      compact: true,
      withPlus: true,
    });
    assert.ok(krwCompact.startsWith("+") && krwCompact.endsWith("₩"));

    const usdFull = formatBusinessMoney(25_400_000, "USD");
    assert.equal(usdFull, "$1,000");
  });

  it("TC-UNIT-03: chart Y-axis helpers formatZeroRevenueAxisMaxVnd & formatAxisTickMoney cleanly", () => {
    assert.equal(
      formatAxisTickMoney(getZeroRevenueAxisMaxVnd("KRW"), "KRW"),
      "+4 ₩",
    );
    assert.equal(
      formatAxisTickMoney(getZeroRevenueAxisMaxVnd("USD"), "USD"),
      "+$4",
    );
    assert.equal(formatAxisTickMoney(0, "VND"), "0 ₫");
  });

  it("TC-UNIT-04: formatDisplayDate formats ISO dates accurately in vi, en, and ko", () => {
    assert.equal(formatDisplayDate("2026-11-06", "vi", true), "06/11/2026");
    assert.equal(formatDisplayDate("2026-11-06", "vi", false), "06/11");
    assert.equal(formatDisplayDate("2026-11-06", "en", true), "Nov 06, 2026");
    assert.equal(formatDisplayDate("2026-11-06", "en", false), "Nov 06");
    assert.equal(formatDisplayDate("2026-11-06", "ko", true), "2026.11.06");
    assert.equal(formatDisplayDate("2026-11-06", "ko", false), "11월 6일");
  });

  it("TC-UNIT-05: localizeAmenityCode maps canonical amenity keys to vi, en, and ko labels", () => {
    assert.equal(localizeAmenityCode("breakfast", "vi"), "Bữa sáng");
    assert.equal(localizeAmenityCode("breakfast", "en"), "Breakfast Included");
    assert.equal(localizeAmenityCode("breakfast", "ko"), "조식 포함");
    assert.equal(localizeAmenityCode("late_checkout", "vi"), "Trả phòng trễ");
    assert.equal(localizeAmenityCode("late_checkout", "en"), "Late Check-out");
  });
});
