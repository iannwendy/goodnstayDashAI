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
  buildRoomMappingContract,
  normalizeMultilingualText,
  extractAreaSqm,
  matchesAreaFilter,
  parseMonetaryAmount,
  convertCurrencyAmount,
} from "../src/goodnstayMapper.mjs";
import {
  buildMultiPlatformReferenceDataset,
  buildAutoMatchedOtaRequests,
  resolveHotelConfigAuto,
  executeOtaChannelWithFallback,
  runCoalescedScrapeJob,
  resetOtaCircuitBreakers,
  getOtaCircuitBreakerState,
} from "../src/liveScraper.mjs";

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

test("5. Sinh Hợp đồng JSON Mapping Chuẩn (gns-room-matcher-v1) khớp 100% schema mục tiêu", () => {
  const contract = buildRoomMappingContract({
    gnsRoomId: "GNS-R201",
    gnsRoomVersion: 3,
    ota: "BOOKING_COM",
    externalProperty: {
      propertyId: "1234567",
      url: "https://www.booking.com/hotel/xx/example.html",
    },
    gnsRef: {
      roomName: "Deluxe Double Sea View",
      areaM2: 35,
      beds: ["KING"],
      maxOccupancy: 2,
      view: "SEA_VIEW",
      nameSimilarityOverride: 0.94,
    },
    otaOffer: {
      roomName: "Deluxe Double Sea View",
      filterMeta: {
        areaSqm: 35,
        detailedBedCategory: "KING_1_BED",
        maxGuests: 2,
        viewCategory: "OCEAN_SEA_VIEW",
        rawBedText: "1 king bed",
      },
      liveProof: {
        roomId: "987654",
        scrapedAt: "2026-11-10T04:00:00Z",
        sourceUrl: "https://www.booking.com/hotel/xx/example.html",
      },
    },
  });

  assert.deepEqual(contract, {
    gnsRoomId: "GNS-R201",
    gnsRoomVersion: 3,
    ota: "BOOKING_COM",
    externalProperty: {
      propertyId: "1234567",
      url: "https://www.booking.com/hotel/xx/example.html",
    },
    matchedRoom: {
      externalRoomId: "987654",
      roomName: "Deluxe Double Sea View",
      areaM2: 35,
      beds: ["KING"],
      maxOccupancy: 2,
      view: "SEA_VIEW",
    },
    matching: {
      status: "VERIFIED",
      confidence: 0.97,
      method: "HYBRID_RULES_AI",
      modelVersion: "gns-room-matcher-v1",
      evidence: {
        nameSimilarity: 0.94,
        areaMatch: true,
        bedMatch: true,
        occupancyMatch: true,
        viewMatch: true,
      },
      verifiedBy: "AUTOMATED_POLICY",
    },
    source: {
      type: "EXTERNAL_CATALOG",
      observedAt: "2026-11-10T04:00:00Z",
      catalogVersion: "2026-11-10",
    },
    rateLookup: {
      supported: true,
      lookupMethod: "PROPERTY_AND_ROOM_ID",
    },
  });
});

test("6. Đa ngôn ngữ: Chuẩn hóa Unicode NFKC (tiếng Việt tổ hợp NFD, ký tự Hàn/Nhật) và tự động quy đổi diện tích ft² / Pyeong (평) sang m²", () => {
  // Chuỗi tiếng Việt tổ hợp (NFD: 'giường đơn', 'hướng biển')
  const nfdBed = "2 giu\u031B\u01A1\u0300ng \u0111\u01A1n";
  const nfdRoom = "Pho\u0300ng Deluxe H\u01B0\u01A1\u0301ng Bi\u00EA\u0309n";
  const normalizedText = normalizeMultilingualText(`${nfdRoom} | 32㎡`);
  assert.ok(normalizedText.includes("m²"));

  const bedRes = classifyBedConfiguration(nfdBed, nfdRoom, 2);
  assert.equal(bedRes.goodNStayBedType, "Twin");
  assert.equal(bedRes.detailedBedCategory, "TWIN_2_SINGLE");

  // Quy đổi diện tích từ Square Feet (344 sq ft -> ~32 m²) và Pyeong Hàn Quốc (10 평 -> ~33 m²)
  assert.equal(extractAreaSqm(["Room size: 32 m²/344 ft²"]), 32);
  assert.equal(extractAreaSqm(["Room size: 344 sq ft"]), 32);
  assert.equal(extractAreaSqm(["객실 면적: 10평"]), 33);
  assert.equal(extractAreaSqm(["객실 크기: 28㎡"]), 28);
});

test("7. Đa tiền tệ & Thuế phí: parseMonetaryAmount chống lỗi nhân 100x số thập phân (USD/EUR) và chuẩn hóa thuế/tỷ giá theo Quốc gia", () => {
  // Zero-decimal currencies (VND, KRW, JPY)
  assert.equal(parseMonetaryAmount("1.699.905 ₫", "VND"), 1699905);
  assert.equal(parseMonetaryAmount("1,699,905.00 VND", "VND"), 1699905);
  assert.equal(parseMonetaryAmount("₩ 95,200", "KRW"), 95200);

  // Two-decimal currencies (USD, EUR, SGD) - không bị nhân 100 lần!
  assert.equal(parseMonetaryAmount("US$125.50", "USD"), 125.5);
  assert.equal(parseMonetaryAmount("1.250,75 €", "EUR"), 1250.75);

  // Quy đổi tiền tệ sang VND và KRW cho Form goodNstay khi cào phòng bằng USD hoặc KRW
  const vndFromUsd = convertCurrencyAmount(100, "USD", "VND");
  assert.ok(vndFromUsd >= 2400000 && vndFromUsd <= 2700000);

  // Kiểm tra normalizeRawOtaRoom với khách sạn Hàn Quốc (countryCode: 'KR', thuế VAT 10%, tiền tệ gốc KRW)
  const krRoom = normalizeRawOtaRoom({
    id: "AGODA_KR_101",
    otaSource: "AGODA",
    countryCode: "KR",
    currency: "KRW",
    roomName: "디럭스 트윈 오션뷰 (Deluxe Twin)",
    features: ["10평", "오션뷰", "2 싱글베드", "무료 Wi-Fi", "에어컨"],
    bedText: "2 싱글베드",
    netPrice: 100000, // 100,000 KRW Net -> Gross 110,000 KRW (10% VAT tại Hàn Quốc)
    maxAdults: 2,
    benefits: ["무료 조식", "무료 취소"],
  });

  assert.equal(krRoom.filterMeta.areaSqm, 33);
  assert.equal(krRoom.filterMeta.viewCategory, "OCEAN_SEA_VIEW");
  assert.equal(krRoom.filterMeta.detailedBedCategory, "TWIN_2_SINGLE");
  assert.equal(krRoom.filterMeta.grossPrice, 110000);
  assert.equal(krRoom.formFields.pricePerNightKrw, 110000);
  assert.ok(krRoom.formFields.pricePerNightVnd > 1800000);
});

test("8. Zero-Click Auto-Matching: Tự động suy luận tham số gọi OTA (adults, currency, checkIn) và tự động nhận diện khách sạn", () => {
  // 1. Tự động khớp khách sạn qua tên gần đúng hoặc URL bất kỳ mà không cần biết mã key
  const matchedByUrl = resolveHotelConfigAuto(
    "https://www.booking.com/hotel/vn/libra-nha-trang.vi.html"
  );
  assert.equal(matchedByUrl.hotelId, "libra-nha-trang");

  const matchedByName = resolveHotelConfigAuto("Champton Nha Trang");
  assert.equal(matchedByName.hotelId, "champton-nha-trang");

  // 2. Tự động suy luận adults = 1 cho Single, adults = 3 cho Triple, adults = 4 cho Family
  const singleReq = buildAutoMatchedOtaRequests(
    { targetBedCategory: "SINGLE_1_BED", checkIn: "2026-11-20" },
    matchedByName
  );
  assert.equal(singleReq.canonicalParams.adults, 1);
  assert.equal(singleReq.canonicalParams.currency, "VND");
  assert.match(singleReq.agoda.url, /adults=1/);
  assert.match(singleReq.booking.url, /group_adults=1/);

  const familyReq = buildAutoMatchedOtaRequests(
    { targetBedCategory: "MULTI_BED_QUAD_FAMILY", checkIn: "2026-11-20" },
    matchedByName
  );
  assert.equal(familyReq.canonicalParams.adults, 4);
  assert.match(familyReq.agoda.url, /adults=4/);
  assert.match(familyReq.booking.url, /group_adults=4/);
});

test("9. Cơ chế Retry, Circuit Breaker khi bị Lock và Singleflight + Fallback đảm bảo hệ thống luôn hoạt động", async () => {
  resetOtaCircuitBreakers();

  // A. Retry thành công ở lần thử thứ 2 khi gặp lỗi mạng tạm thời (NET_TRANSIENT_ERROR)
  let transientAttempts = 0;
  const recoveredResult = await executeOtaChannelWithFallback({
    ota: "AGODA",
    baseDelayMs: 10,
    maxRetries: 2,
    scrapeFn: async () => {
      transientAttempts++;
      if (transientAttempts < 2) {
        throw new Error("ETIMEDOUT: transient network failure");
      }
      return {
        rooms: [{ masterRoomId: "101", roomName: "Deluxe King", grossPrice: 1500000 }],
      };
    },
    fallbackFn: async () => ({
      rooms: [{ masterRoomId: "999", roomName: "Cached Room", grossPrice: 1400000 }],
    }),
  });

  assert.equal(recoveredResult.dataMode, "LIVE");
  assert.equal(transientAttempts, 2);
  assert.equal(recoveredResult.rooms.length, 1);

  // B. Khi phát hiện bị Lock / Rate-Limit (isSoftLocked: true):
  // NGỪNG retry ngay lập tức (chỉ gọi 1 lần), mở Circuit Breaker (OPEN) và trả về dữ liệu Fallback
  let lockAttempts = 0;
  const lockedResult = await executeOtaChannelWithFallback({
    ota: "BOOKING",
    baseDelayMs: 10,
    maxRetries: 3,
    scrapeFn: async () => {
      lockAttempts++;
      return { isSoftLocked: true, lockReason: "HTTP_429_RATE_LIMIT", rooms: [] };
    },
    fallbackFn: async (reason) => ({
      fallbackTrigger: reason,
      rooms: [{ roomId: "1439989401", roomName: "Deluxe Twin (SWR Snapshot)", grossPrice: 1719200 }],
    }),
  });

  assert.equal(lockAttempts, 1, "Khi bị Lock tuyệt đối không được retry bồi thêm");
  assert.equal(lockedResult.dataMode, "FALLBACK_CACHED");
  assert.equal(lockedResult.rooms.length, 1);
  assert.equal(getOtaCircuitBreakerState("BOOKING").status, "OPEN");

  // C. Khi Circuit Breaker đang OPEN, request tiếp theo không gọi scrapeFn mà trả về Fallback tức thì (0ms)
  let calledWhileOpen = false;
  const fastFallback = await executeOtaChannelWithFallback({
    ota: "BOOKING",
    scrapeFn: async () => {
      calledWhileOpen = true;
      return { rooms: [] };
    },
    fallbackFn: async (reason) => ({
      fallbackTrigger: reason,
      rooms: [{ roomId: "1439989401", roomName: "Instant SWR", grossPrice: 1719200 }],
    }),
  });
  assert.equal(calledWhileOpen, false);
  assert.equal(fastFallback.fallbackTrigger, "CIRCUIT_OPEN_COOLDOWN");

  // D. Singleflight Request Coalescing: 5 request gọi đồng thời cùng 1 khóa chỉ chạy jobFactory đúng 1 lần
  let browserLaunchCount = 0;
  const concurrentCalls = await Promise.all(
    [1, 2, 3, 4, 5].map(() =>
      runCoalescedScrapeJob("champton-nha-trang::2026-11-20", async () => {
        browserLaunchCount++;
        await new Promise((r) => setTimeout(r, 25));
        return { ok: true, count: 12 };
      })
    )
  );
  assert.equal(
    browserLaunchCount,
    1,
    "5 request trùng tham số chỉ được phép khởi chạy đúng 1 phiên cào"
  );
  assert.equal(concurrentCalls.length, 5);
  resetOtaCircuitBreakers();
});

test("10. Bộ lọc theo diện tích (areaRange): matchesAreaFilter và buildMatchedRoomComparisonGroups lọc chính xác các mốc < 25m², 25-35m², 36-50m², > 50m²", () => {
  // Kiểm tra hàm matchesAreaFilter trực tiếp
  assert.equal(matchesAreaFilter(18, "ALL"), true);
  assert.equal(matchesAreaFilter(null, "ALL"), true);
  assert.equal(matchesAreaFilter(18, "UNDER_25"), true);
  assert.equal(matchesAreaFilter(25, "UNDER_25"), false);
  assert.equal(matchesAreaFilter(25, "FROM_25_TO_35"), true);
  assert.equal(matchesAreaFilter(35, "FROM_25_TO_35"), true);
  assert.equal(matchesAreaFilter(36, "FROM_25_TO_35"), false);
  assert.equal(matchesAreaFilter(36, "FROM_36_TO_50"), true);
  assert.equal(matchesAreaFilter(50, "FROM_36_TO_50"), true);
  assert.equal(matchesAreaFilter(51, "FROM_36_TO_50"), false);
  assert.equal(matchesAreaFilter(60, "OVER_50"), true);
  assert.equal(matchesAreaFilter(50, "OVER_50"), false);

  // Kiểm tra lọc trên dataset đối sánh đa sàn (20m², 30m², 40m², 100m²)
  const dataset = buildMultiPlatformReferenceDataset([]);
  const allGroups = buildMatchedRoomComparisonGroups(dataset, {
    areaRange: "ALL",
  });
  assert.equal(allGroups.length, 4);

  const under25 = buildMatchedRoomComparisonGroups(dataset, {
    areaRange: "UNDER_25",
  });
  assert.equal(under25.length, 1);
  assert.ok(under25.every((g) => g.areaSqm !== null && g.areaSqm < 25));

  const from25To35 = buildMatchedRoomComparisonGroups(dataset, {
    areaRange: "FROM_25_TO_35",
  });
  assert.equal(from25To35.length, 1);
  assert.ok(
    from25To35.every(
      (g) => g.areaSqm !== null && g.areaSqm >= 25 && g.areaSqm <= 35
    )
  );

  const from36To50 = buildMatchedRoomComparisonGroups(dataset, {
    areaRange: "FROM_36_TO_50",
  });
  assert.equal(from36To50.length, 1);
  assert.equal(from36To50[0].areaSqm, 40);

  const over50 = buildMatchedRoomComparisonGroups(dataset, {
    areaRange: "OVER_50",
  });
  assert.equal(over50.length, 1);
  assert.equal(over50[0].areaSqm, 100);
});



