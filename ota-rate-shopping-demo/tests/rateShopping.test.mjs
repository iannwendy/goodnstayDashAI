import test from "node:test";
import assert from "node:assert/strict";
import {
  GOODNSTAY_ROOM_TYPES,
  GOODNSTAY_BED_TYPES,
  GOODNSTAY_AMENITY_TYPES,
  classifyBedConfiguration,
  classifyRoomTypeWithContext,
  normalizeRawOtaRoom,
  calculatePlatformPriceSpread,
  buildMatchedRoomComparisonGroups,
} from "../src/goodnstayMapper.mjs";
import { buildMultiPlatformReferenceDataset } from "../src/liveScraper.mjs";

test("1. Phân biệt chính xác Single Room, Twin Room, Double/King và Phòng Nhiều Giường (Triple / Family)", () => {
  // Single Room (1 giường đơn - 1 khách)
  const single = classifyBedConfiguration("1 single bed", "Standard Single Room", 1);
  assert.equal(single.goodNStayBedType, "Single");
  assert.equal(single.detailedBedCategory, "SINGLE_1_BED");
  assert.equal(single.isMultiBed, false);
  assert.equal(single.inferredMaxGuests, 1);

  // Twin Room (2 giường đơn - 2 khách)
  const twin = classifyBedConfiguration("2 single beds", "Deluxe Twin City View", 2);
  assert.equal(twin.goodNStayBedType, "Twin");
  assert.equal(twin.detailedBedCategory, "TWIN_2_SINGLE");
  assert.equal(twin.isMultiBed, true);
  assert.equal(twin.inferredMaxGuests, 2);

  // King Bed (1 giường King lớn - 2 khách)
  const king = classifyBedConfiguration("1 extra-large double bed", "Deluxe Double Room", 2);
  assert.equal(king.goodNStayBedType, "Double (Queen, King)");
  assert.equal(king.detailedBedCategory, "KING_1_BED");
  assert.equal(king.isMultiBed, false);
  assert.equal(king.inferredMaxGuests, 2);

  // Multi-Bed Triple (1 giường đơn + 1 giường đôi - 3 khách)
  const triple = classifyBedConfiguration(
    "1 single bed and 1 large double bed",
    "Deluxe Triple Room",
    3
  );
  assert.equal(triple.goodNStayBedType, "Any Bed");
  assert.equal(triple.detailedBedCategory, "MULTI_BED_TRIPLE");
  assert.equal(triple.isMultiBed, true);
  assert.equal(triple.inferredMaxGuests, 3);

  // Multi-Bed Family/Quad (2 giường đôi lớn - 4 khách)
  const quad = classifyBedConfiguration(
    "2 large double beds",
    "Family Ocean Suite",
    4
  );
  assert.equal(quad.goodNStayBedType, "Any Bed");
  assert.equal(quad.detailedBedCategory, "MULTI_BED_QUAD_FAMILY");
  assert.equal(quad.isMultiBed, true);
  assert.equal(quad.inferredMaxGuests, 4);
});

test("2. Phân loại đúng 'Urban Room' (tên phòng không có từ khóa chuẩn) bằng Intra-Hotel Ranking", () => {
  const hotelContext = [
    { roomName: "Standard Single", areaSqm: 20, basePrice: 780000 },
    { roomName: "Urban Room", areaSqm: 22, basePrice: 920000 },
    { roomName: "Deluxe King City", areaSqm: 32, basePrice: 1200000 },
    { roomName: "Executive Family Suite", areaSqm: 65, basePrice: 2980000 },
  ];

  const urbanResult = classifyRoomTypeWithContext("Urban Room", 22, 920000, hotelContext);
  assert.equal(urbanResult.roomType, "Standard");
  assert.equal(urbanResult.method, "INTRA_HOTEL_RANKING");
});

test("3. Điền chính xác 100% cả 8 trường của Form goodNstay từ dữ liệu phòng Agoda thực tế", () => {
  const sampleAgodaRoom = {
    id: "AGODA_3936472",
    otaSource: "AGODA",
    roomName: "Deluxe Double City View",
    features: [
      "Room size: 32 m²/344 ft²",
      "City view",
      "1 king bed",
      "Mini bar",
      "Wi-Fi [free]",
      "Air conditioning",
      "Cable TV channels",
    ],
    bedText: "1 king bed",
    photos: ["https://pix8.agoda.net/sample.jpg"],
    netPrice: 1020712,
    grossPrice: 1157487,
    maxAdults: 2,
    benefits: ["Breakfast", "Free WiFi", "Cable TV channels"],
    totalInventory: 5,
  };

  const normalized = normalizeRawOtaRoom(sampleAgodaRoom);
  const f = normalized.formFields;

  assert.ok(GOODNSTAY_ROOM_TYPES.includes(f.roomType));
  assert.ok(GOODNSTAY_BED_TYPES.includes(f.bedType));
  assert.equal(f.roomType, "Deluxe");
  assert.equal(f.bedType, "Double (Queen, King)");
  assert.equal(f.maximumGuests, 2);
  assert.equal(f.pricePerNightVnd, 1157487);
  assert.deepEqual(
    f.amenityTypes.sort(),
    ["Minibar", "Television", "Free Wi-Fi", "Air Conditioner"].sort()
  );
  for (const am of f.amenityTypes) {
    assert.ok(GOODNSTAY_AMENITY_TYPES.includes(am));
  }
});

test("4. Bộ lọc 6 tầng (6-Stage Strict Filter) tách biệt hoàn toàn Single, Twin, King và Multi-Bed", () => {
  const dataset = buildMultiPlatformReferenceDataset([]);

  // Lọc chỉ lấy Single Room (1 giường đơn - 1 khách)
  const singleGroups = buildMatchedRoomComparisonGroups(dataset, {
    detailedBedCategory: "SINGLE_1_BED",
  });
  assert.equal(singleGroups.length, 1);
  assert.equal(singleGroups[0].goodNStayBedType, "Single");
  assert.equal(singleGroups[0].maxGuests, 1);

  // Lọc chỉ lấy Phòng Nhiều Giường (Twin / Triple / Family)
  const multiBedGroups = buildMatchedRoomComparisonGroups(dataset, {
    multiBedMode: "MULTI_BED_ONLY",
  });
  assert.equal(multiBedGroups.length, 3); // Twin + Triple + Family Quad
  for (const grp of multiBedGroups) {
    assert.equal(grp.isMultiBed, true);
  }

  // Kiểm tra công thức tính % chênh lệch (Gross Price)
  const spread = calculatePlatformPriceSpread(
    {
      GOODNSTAY: { netPrice: 1000000, grossPrice: 1000000, taxesAndFees: 0, roomName: "Deluxe" },
      AGODA: { netPrice: 1038961, grossPrice: 1200000, taxesAndFees: 161039, roomName: "Deluxe" },
    },
    "GROSS"
  );
  assert.equal(spread.platforms.AGODA.diffVsRefPct, 20);
  assert.equal(spread.platforms.AGODA.customerSavingsVsOtaPct, 16.67);
});
