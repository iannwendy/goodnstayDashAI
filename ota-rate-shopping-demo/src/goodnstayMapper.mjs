/**
 * Bộ Chuẩn Hóa 8 Trường Form goodNstay, Phân Loại Phòng/Giường Đa Tầng
 * & Động Cơ Khớp Phòng + Tính % Chênh Lệch Giá Đa Sàn OTA (Agoda, Booking.com, Trip.com, goodNstay)
 */

// 1. Đúng 100% các giá trị Enum trên giao diện Form Quản lý Phòng của goodNstay (từ 4 ảnh chụp)
export const GOODNSTAY_ROOM_TYPES = [
  "Standard",
  "Superior",
  "Deluxe",
  "Executive",
  "Suite",
  "Any Room",
];

export const GOODNSTAY_BED_TYPES = [
  "Single",
  "Twin",
  "Double (Queen, King)",
  "Any Bed",
];

export const GOODNSTAY_AMENITY_TYPES = [
  "Minibar",
  "Television",
  "Free Wi-Fi",
  "Air Conditioner",
];

// 2. Từ điển nhận diện 4 Amenity Types chuẩn trên Form goodNstay (Hỗ trợ EN / VI / KO, không dùng \b cho tiếng Việt có dấu)
const AMENITY_PATTERNS = {
  Minibar: /(?:mini[\s-]?bar|tủ lạnh mini|quầy bar mini|미니바|refrigerator)/i,
  Television:
    /(?:\btv\b|television|flat[\s-]?screen|cable|satellite|smart tv|tivi|truyền hình|평면 tv|케이블)/i,
  "Free Wi-Fi":
    /(?:wi[\s-]?fi|wireless internet|internet miễn phí|무료 wi-fi|무선 인터넷)/i,
  "Air Conditioner":
    /(?:air[\s-]?conditioning|air[\s-]?conditioner|\ba\/c\b|climate control|điều hòa|máy lạnh|에어컨|냉방)/i,
};

/**
 * Trích xuất chính xác mảng Amenity Types cho Form goodNstay
 */
export function extractGoodNStayAmenities(rawFacilities = [], rawBenefits = [], hotelHasFreeWifi = true) {
  const combinedText = [...rawFacilities, ...rawBenefits].join(" | ");
  const selected = [];

  for (const amenity of GOODNSTAY_AMENITY_TYPES) {
    if (AMENITY_PATTERNS[amenity].test(combinedText)) {
      selected.push(amenity);
    }
  }

  if (hotelHasFreeWifi && !selected.includes("Free Wi-Fi")) {
    selected.push("Free Wi-Fi");
  }
  // Hầu hết khách sạn 3-5 sao tại VN/KR đều có điều hòa & TV trong phòng tiêu chuẩn nếu danh sách rút gọn bị ẩn
  return selected;
}

/**
 * Trích xuất diện tích phòng (m²) từ danh sách features hoặc mô tả
 */
export function extractAreaSqm(rawTextOrFeatures = []) {
  const text = Array.isArray(rawTextOrFeatures)
    ? rawTextOrFeatures.join(" | ")
    : String(rawTextOrFeatures || "");

  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:m²|m2|sqm|sq\.?\s*m|mét vuông)/i);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return null;
}

/**
 * Trích xuất Hướng nhìn (View Category) để không bao giờ so sánh nhầm City View với Ocean/Sea View
 */
export function classifyViewCategory(rawRoomName = "", rawFeatures = []) {
  const text = `${rawRoomName} | ${rawFeatures.join(" | ")}`.toLowerCase();

  if (/(?:beach[\s-]?front|ocean[\s-]?front|sát biển|trực diện biển|오션프론트)/.test(text)) {
    return "OCEAN_FRONT";
  }
  if (/(?:partial\s*(?:sea|ocean)|nhìn một phần biển|góc biển)/.test(text)) {
    return "PARTIAL_SEA_VIEW";
  }
  if (/(?:sea\s*view|ocean\s*view|bay\s*view|hướng biển|nhìn ra biển|nhìn ra vịnh|오션뷰|바다 전망)/.test(text)) {
    return "OCEAN_SEA_VIEW";
  }
  if (/(?:river\s*view|lake\s*view|hướng sông|hướng hồ|리버뷰)/.test(text)) {
    return "RIVER_LAKE_VIEW";
  }
  if (/(?:pool\s*view|hướng hồ bơi|nhìn ra hồ bơi|풀뷰)/.test(text)) {
    return "POOL_VIEW";
  }
  if (/(?:garden\s*view|courtyard|hướng vườn|nhìn ra vườn|가든뷰)/.test(text)) {
    return "GARDEN_VIEW";
  }
  if (/(?:mountain\s*view|hill\s*view|hướng núi|마운틴뷰)/.test(text)) {
    return "MOUNTAIN_VIEW";
  }
  if (/(?:city\s*view|town\s*view|urban\s*view|hướng phố|hướng thành phố|nhìn ra thành phố|시티뷰)/.test(text)) {
    return "CITY_VIEW";
  }
  if (/(?:no\s*window|without\s*window|interior|không có cửa sổ|창문 없음)/.test(text)) {
    return "NO_WINDOW";
  }
  return "STANDARD_VIEW";
}

/**
 * Phân tích Cấu hình Giường:
 * 1) Điền đúng vào 1 trong 4 giá trị của Dropdown `Bed Type` trên Form goodNstay:
 *    - "Single"
 *    - "Twin"
 *    - "Double (Queen, King)"
 *    - "Any Bed"
 * 2) Sinh nhãn phân loại chi tiết `detailedBedCategory` cho Bộ lọc (Filter) để tách bạch:
 *    - SINGLE_1_BED (Phòng đơn 1 giường đơn - 1 khách)
 *    - TWIN_2_SINGLE (Phòng 2 giường đơn - 2 khách)
 *    - DOUBLE_QUEEN_1_BED (Phòng 1 giường đôi/Queen - 2 khách)
 *    - KING_1_BED (Phòng 1 giường King cỡ lớn - 2 khách)
 *    - FLEX_DOUBLE_OR_TWIN (1 Đôi hoặc 2 Đơn linh hoạt)
 *    - MULTI_BED_TRIPLE (Nhiều giường cho 3 khách: 1 Đôi + 1 Đơn hoặc 3 Đơn)
 *    - MULTI_BED_QUAD_FAMILY (Nhiều giường cho 4+ khách: 2 Giường đôi, 4 Giường đơn, Gia đình)
 *    - BUNK_DORM (Giường tầng / Tập thể)
 */
export function classifyBedConfiguration(rawBedText = "", rawRoomName = "", maxAdults = 2) {
  const combined = `${rawRoomName} | ${rawBedText}`.toLowerCase();

  // 1. Kiểm tra giường tầng / Dormitory
  if (/\b(bunk|dorm|dormitory|capsule|giường tầng|tập thể|도미토리|이층침대)\b/.test(combined)) {
    return {
      goodNStayBedType: "Single",
      detailedBedCategory: "BUNK_DORM",
      filterLabelVi: "Giường tầng / Dorm (1 Khách)",
      totalBeds: 1,
      isMultiBed: false,
      inferredMaxGuests: 1,
      reason: "Phát hiện từ khóa giường tầng / Dormitory",
    };
  }

  // 2. Đếm số lượng giường Đơn và giường Đôi trong mô tả
  let singleCount = 0;
  let doubleCount = 0;

  const singleMatches = [
    ...combined.matchAll(/(\d+)\s*(?:single|twin|giường đơn|싱글\s*베드|싱글침대)/g),
  ];
  for (const m of singleMatches) {
    singleCount = Math.max(singleCount, parseInt(m[1], 10));
  }

  const doubleMatches = [
    ...combined.matchAll(
      /(\d+)\s*(?:extra-large\s*double|large\s*double|super\s*king|king|queen|double|full|giường\s*đôi|giường\s*cỡ\s*king|giường\s*lớn|킹|퀸|더블)/g
    ),
  ];
  for (const m of doubleMatches) {
    doubleCount = Math.max(doubleCount, parseInt(m[1], 10));
  }

  // 3. Kiểm tra cấu hình linh hoạt "1 Double OR 2 Singles" (hoặc "Double or Twin")
  const hasOrKeyword =
    /\b(double\s*or\s*twin|king\s*or\s*twin|1\s*double\s*or\s*2\s*single|1\s*king\s*or\s*2\s*single|hoặc\s*2\s*giường\s*đơn)\b/.test(
      combined
    );
  if (hasOrKeyword) {
    return {
      goodNStayBedType: "Any Bed",
      detailedBedCategory: "FLEX_DOUBLE_OR_TWIN",
      filterLabelVi: "Linh hoạt (1 Đôi hoặc 2 Đơn · 2 Khách)",
      totalBeds: 1,
      isMultiBed: false,
      inferredMaxGuests: 2,
      reason: "OTA khai báo linh hoạt 1 giường đôi hoặc 2 giường đơn",
    };
  }

  // 4. Kiểm tra Phòng NHIỀU GIƯỜNG (Triple 3 khách vs Quad/Family 4+ khách)
  const hasTripleKeyword = /(?:triple|3\s*adults|3\s*người|ba\s*người|3\s*khách|트리플)/.test(combined);
  const hasQuadKeyword =
    /(?:quad|quadruple|4\s*adults|4\s*người|4\s*khách|connecting|쿼드)/.test(combined);

  // Kiểm tra Triple (3 khách: 1 Đôi + 1 Đơn hoặc 3 Đơn) trước
  if (
    ((singleCount === 1 && doubleCount === 1) ||
      singleCount === 3 ||
      hasTripleKeyword ||
      maxAdults === 3) &&
    doubleCount < 2 &&
    maxAdults < 4 &&
    !hasQuadKeyword
  ) {
    const beds = Math.max(singleCount + doubleCount, 2);
    return {
      goodNStayBedType: "Any Bed",
      detailedBedCategory: "MULTI_BED_TRIPLE",
      filterLabelVi: "Nhiều giường: Triple (1 Đôi + 1 Đơn / 3 Đơn · 3 Khách)",
      totalBeds: beds,
      isMultiBed: true,
      inferredMaxGuests: 3,
      reason: `Phòng 3 khách nhiều giường (${doubleCount} đôi + ${singleCount} đơn)`,
    };
  }

  const hasFamilyKeyword = /(?:family|gia\s*đình|패밀리)/.test(combined);
  if (
    doubleCount >= 2 ||
    singleCount >= 4 ||
    (doubleCount >= 1 && singleCount >= 2) ||
    hasQuadKeyword ||
    hasFamilyKeyword ||
    maxAdults >= 4
  ) {
    const beds = Math.max(doubleCount + singleCount, 2);
    return {
      goodNStayBedType: "Any Bed",
      detailedBedCategory: "MULTI_BED_QUAD_FAMILY",
      filterLabelVi: "Nhiều giường: Family / Quad (≥ 2 Giường · 4+ Khách)",
      totalBeds: beds,
      isMultiBed: true,
      inferredMaxGuests: Math.max(maxAdults, 4),
      reason: `Phòng nhiều giường gia đình (${doubleCount || 2} giường đôi / ${singleCount} giường đơn, tối đa ${Math.max(maxAdults, 4)} khách)`,
    };
  }

  // 5. Kiểm tra Phòng TWIN (2 Giường đơn - 2 Khách)
  if (
    singleCount === 2 ||
    /(?:\btwin\b|2\s*single|2\s*giường\s*đơn|hai\s*giường\s*đơn|트윈)/.test(combined)
  ) {
    return {
      goodNStayBedType: "Twin",
      detailedBedCategory: "TWIN_2_SINGLE",
      filterLabelVi: "Twin Room (2 Giường đơn · 2 Khách)",
      totalBeds: 2,
      isMultiBed: true,
      inferredMaxGuests: 2,
      reason: "2 giường đơn (Twin beds) cho 2 khách",
    };
  }

  // 6. Kiểm tra Phòng SINGLE ROOM (1 Giường đơn - 1 Khách)
  if (
    (singleCount === 1 && doubleCount === 0 && !/(?:double|king|queen|giường\s*đôi)/.test(combined)) ||
    maxAdults === 1 ||
    /(?:single\s*room|solo\s*room|phòng\s*đơn|1\s*person|1\s*adult|싱글룸)/.test(combined)
  ) {
    return {
      goodNStayBedType: "Single",
      detailedBedCategory: "SINGLE_1_BED",
      filterLabelVi: "Single Room (1 Giường đơn · 1 Khách)",
      totalBeds: 1,
      isMultiBed: false,
      inferredMaxGuests: 1,
      reason: "1 giường đơn duy nhất cho 1 khách (Single Room)",
    };
  }

  // 7. Kiểm tra Phòng 1 Giường Đôi Lớn (King vs Double/Queen)
  if (
    /(?:super[\s-]?king|extra[\s-]?large\s*double|king\s*bed|king\s*room|1\s*king|cỡ\s*king|giường\s*king|giường\s*đôi\s*cực\s*lớn|킹)/.test(
      combined
    )
  ) {
    return {
      goodNStayBedType: "Double (Queen, King)",
      detailedBedCategory: "KING_1_BED",
      filterLabelVi: "King Bed (1 Giường King lớn · 2 Khách)",
      totalBeds: 1,
      isMultiBed: false,
      inferredMaxGuests: 2,
      reason: "1 giường King cỡ lớn → điền 'Double (Queen, King)' vào Form goodNstay",
    };
  }

  return {
    goodNStayBedType: "Double (Queen, King)",
    detailedBedCategory: "DOUBLE_QUEEN_1_BED",
    filterLabelVi: "Double / Queen (1 Giường đôi · 2 Khách)",
    totalBeds: 1,
    isMultiBed: false,
    inferredMaxGuests: 2,
    reason: "1 giường đôi / Queen tiêu chuẩn → điền 'Double (Queen, King)' vào Form goodNstay",
  };
}

/**
 * Thuật toán Phân Loại `Room Type` 2 Tầng cho Form goodNstay:
 * - Tầng 1: Khớp từ khóa trực tiếp & từ điển đồng nghĩa (Suite, Executive, Deluxe, Superior, Standard)
 * - Tầng 2: Nếu tên phòng sáng tạo (VD: "Urban Room", "Oasis Room", "Signature Room") -> Xếp hạng phân vị
 *   theo Diện tích (m²) và Giá trong nội bộ khách sạn đó!
 */
export function classifyRoomTypeWithContext(roomName = "", areaSqm = null, basePrice = 0, allHotelRooms = []) {
  const lower = roomName.toLowerCase();

  // Tầng 1: Từ khóa tường minh theo thứ tự ưu tiên từ cao xuống thấp
  if (/\b(suite|penthouse|presidential|villa|bungalow|residence|duplex|스위트|풀빌라)\b/.test(lower)) {
    return {
      roomType: "Suite",
      method: "KEYWORD_DIRECT",
      reason: `Tên phòng chứa từ khóa hạng Suite/Villa ('${roomName}')`,
    };
  }
  if (/\b(executive|club|ambassador|premier\s*executive|이그제큐티브|클럽)\b/.test(lower)) {
    return {
      roomType: "Executive",
      method: "KEYWORD_DIRECT",
      reason: `Tên phòng chứa từ khóa hạng Executive/Club ('${roomName}')`,
    };
  }
  if (/\b(deluxe|premier|grand|luxury|prestige|디럭스|프리미어)\b/.test(lower)) {
    return {
      roomType: "Deluxe",
      method: "KEYWORD_DIRECT",
      reason: `Tên phòng chứa từ khóa hạng Deluxe/Premier ('${roomName}')`,
    };
  }
  if (/\b(superior|sup|plus|select|comfort|수페리어)\b/.test(lower)) {
    return {
      roomType: "Superior",
      method: "KEYWORD_DIRECT",
      reason: `Tên phòng chứa từ khóa hạng Superior/Plus ('${roomName}')`,
    };
  }
  if (/\b(standard|economy|basic|classic|cozy|compact|lite|스탠다드|클래식)\b/.test(lower)) {
    return {
      roomType: "Standard",
      method: "KEYWORD_DIRECT",
      reason: `Tên phòng chứa từ khóa hạng Standard/Classic ('${roomName}')`,
    };
  }

  // Tầng 2: Xếp hạng tương đối trong nội bộ khách sạn (dành cho "Urban Room", "Studio", "Oasis Room"...)
  if (allHotelRooms.length >= 2) {
    const areas = allHotelRooms.map((r) => r.areaSqm || 28).sort((a, b) => a - b);
    const prices = allHotelRooms.map((r) => r.basePrice || 1000000).sort((a, b) => a - b);

    const minArea = areas[0];
    const maxArea = areas[areas.length - 1] || minArea + 1;
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1] || minPrice + 1;

    const normArea = maxArea > minArea && areaSqm ? (areaSqm - minArea) / (maxArea - minArea) : 0.3;
    const normPrice = maxPrice > minPrice && basePrice ? (basePrice - minPrice) / (maxPrice - minPrice) : 0.3;
    const compositePercentile = 0.6 * normArea + 0.4 * normPrice;

    if (compositePercentile <= 0.22) {
      return {
        roomType: "Standard",
        method: "INTRA_HOTEL_RANKING",
        reason: `Tên '${roomName}' không chứa từ khóa chuẩn → Xếp hạng phân vị nội bộ (${Math.round(compositePercentile * 100)}%, ${areaSqm || "?"}m²) thuộc nhóm cơ bản nhất → Standard`,
      };
    }
    if (compositePercentile <= 0.48) {
      return {
        roomType: "Superior",
        method: "INTRA_HOTEL_RANKING",
        reason: `Tên '${roomName}' không chứa từ khóa chuẩn → Xếp hạng phân vị nội bộ (${Math.round(compositePercentile * 100)}%, ${areaSqm || "?"}m²) thuộc nhóm nâng cấp nhẹ → Superior`,
      };
    }
    if (compositePercentile <= 0.78) {
      return {
        roomType: "Deluxe",
        method: "INTRA_HOTEL_RANKING",
        reason: `Tên '${roomName}' không chứa từ khóa chuẩn → Xếp hạng phân vị nội bộ (${Math.round(compositePercentile * 100)}%, ${areaSqm || "?"}m²) thuộc nhóm trung-cao cấp → Deluxe`,
      };
    }
    if ((areaSqm && areaSqm >= 48) || compositePercentile > 0.9) {
      return {
        roomType: "Suite",
        method: "INTRA_HOTEL_RANKING",
        reason: `Tên '${roomName}' có diện tích lớn (${areaSqm}m²) thuộc top 10% khách sạn → Suite`,
      };
    }
    return {
      roomType: "Executive",
      method: "INTRA_HOTEL_RANKING",
      reason: `Tên '${roomName}' thuộc phân vị cao (${Math.round(compositePercentile * 100)}%, ${areaSqm || "?"}m²) → Executive`,
    };
  }

  // Fallback theo diện tích tuyệt đối
  if (areaSqm !== null) {
    if (areaSqm <= 23) return { roomType: "Standard", method: "AREA_HEURISTIC", reason: `Diện tích ${areaSqm}m² (≤23m²) → Standard` };
    if (areaSqm <= 28) return { roomType: "Superior", method: "AREA_HEURISTIC", reason: `Diện tích ${areaSqm}m² (24-28m²) → Superior` };
    if (areaSqm <= 38) return { roomType: "Deluxe", method: "AREA_HEURISTIC", reason: `Diện tích ${areaSqm}m² (29-38m²) → Deluxe` };
    if (areaSqm <= 48) return { roomType: "Executive", method: "AREA_HEURISTIC", reason: `Diện tích ${areaSqm}m² (39-48m²) → Executive` };
    return { roomType: "Suite", method: "AREA_HEURISTIC", reason: `Diện tích ${areaSqm}m² (>48m²) → Suite` };
  }

  return {
    roomType: "Any Room",
    method: "FALLBACK",
    reason: "Không đủ thông tin từ khóa hoặc diện tích",
  };
}

/**
 * Phân tích điều kiện gói giá (Rate Plan: Bữa sáng & Chính sách Hoàn hủy)
 */
export function classifyRatePlanConditions(rawBenefits = []) {
  const text = rawBenefits.join(" | ").toLowerCase();

  const hasBreakfast =
    /(?:breakfast|bữa sáng|ăn sáng|buffet sáng|조식\s*포함|무료\s*조식)/.test(text) &&
    !/(?:no\s*breakfast|không\s*gồm\s*bữa\s*sáng|room\s*only|조식\s*불포함)/.test(text);

  const isFreeCancel =
    /(?:free\s*cancellation|hủy\s*miễn\s*phí|hoàn\s*tiền\s*toàn\s*bộ|무료\s*취소)/.test(text) &&
    !/(?:non[\s-]?refundable|không\s*hoàn\s*tiền|không\s*hoàn\s*hủy|환불\s*불가)/.test(text);

  const mealPlan = hasBreakfast ? "BB" : "RO";
  const cancelPolicy = isFreeCancel ? "FREE_CANCEL" : "NON_REFUNDABLE";
  const rateBucket = `${mealPlan}_${cancelPolicy}`;

  return {
    mealPlan,
    mealPlanLabelVi: hasBreakfast ? "Có ăn sáng (BB)" : "Không ăn sáng (Room Only)",
    cancelPolicy,
    cancelPolicyLabelVi: isFreeCancel ? "Hủy miễn phí" : "Không hoàn tiền",
    rateBucket,
  };
}

/**
 * Chuẩn hóa 1 bản ghi phòng thô từ OTA sang:
 * 1) 8 trường chính xác của Form goodNstay (`formFields`)
 * 2) Metadata của Bộ lọc 6 tầng (`filterMeta`)
 */
export function normalizeRawOtaRoom(rawRoom, allHotelRoomsContext = []) {
  const areaSqm = rawRoom.areaSqm ?? extractAreaSqm(rawRoom.features || [rawRoom.description || ""]);
  const viewCategory = classifyViewCategory(rawRoom.roomName, rawRoom.features || []);
  const bedInfo = classifyBedConfiguration(
    rawRoom.bedText || (rawRoom.features || []).join(" | "),
    rawRoom.roomName,
    rawRoom.maxAdults || 2
  );
  const roomTypeInfo = classifyRoomTypeWithContext(
    rawRoom.roomName,
    areaSqm,
    rawRoom.netPrice || rawRoom.grossPrice,
    allHotelRoomsContext
  );
  const amenities = extractGoodNStayAmenities(
    rawRoom.features || [],
    rawRoom.benefits || [],
    true
  );
  const ratePlan = classifyRatePlanConditions(rawRoom.benefits || []);

  // Chuẩn hóa giá Trước thuế (Net) và Sau thuế phí (Gross Landed Price)
  const netPrice = Math.round(rawRoom.netPrice || Math.round((rawRoom.grossPrice || 0) / 1.155));
  const grossPrice = Math.round(rawRoom.grossPrice || Math.round(netPrice * 1.155));
  const taxesAndFees = Math.max(0, grossPrice - netPrice);

  // Gom nhóm diện tích (làm tròn bậc 4m² để dung sai giữa Agoda 32m² và Booking 33m²)
  const areaBucket = areaSqm ? `${Math.round(areaSqm / 4) * 4}SQM` : "NA_SQM";

  // Khóa khớp hạng phòng vật lý (Canonical Room Key)
  const canonicalRoomKey = [
    rawRoom.hotelId || "HOTEL_01",
    roomTypeInfo.roomType.toUpperCase(),
    bedInfo.detailedBedCategory,
    viewCategory,
  ].join("::");

  // Mô tả chuẩn hóa điền vào trường Description * của Form goodNstay
  const structuredDescription = [
    `[Hạng phòng: ${roomTypeInfo.roomType} | Diện tích: ${areaSqm ? `${areaSqm} m²` : "Tiêu chuẩn"} | Hướng nhìn: ${viewCategory.replace(/_/g, " ")} | Giường: ${rawRoom.bedText || bedInfo.filterLabelVi}]`,
    rawRoom.description ||
      `Phòng ${rawRoom.roomName} dành cho tối đa ${bedInfo.inferredMaxGuests} khách. Trang bị đầy đủ: ${amenities.join(", ")}.`,
  ].join(" — ");

  return {
    id: rawRoom.id || `${rawRoom.otaSource}_${Math.random().toString(36).slice(2, 8)}`,
    hotelId: rawRoom.hotelId || "muong-thanh-luxury-nha-trang",
    hotelName: rawRoom.hotelName || "Muong Thanh Luxury Nha Trang Hotel",
    otaSource: rawRoom.otaSource, // 'AGODA' | 'BOOKING' | 'TRIP' | 'GOODNSTAY'
    // --- 8 TRƯỜNG CHÍNH XÁC TRÊN FORM GOODNSTAY ---
    formFields: {
      uploadPhotos: rawRoom.photos || [],
      roomName: rawRoom.roomName.trim(),
      description: structuredDescription,
      pricePerNightVnd: grossPrice,
      pricePerNightKrw: Math.round(grossPrice * 0.056), // Quy đổi tham chiếu VND -> KRW (₩)
      maximumGuests: bedInfo.inferredMaxGuests,
      amenityTypes: amenities,
      roomType: roomTypeInfo.roomType,
      bedType: bedInfo.goodNStayBedType,
      totalInventory: rawRoom.totalInventory ?? 5,
    },
    // --- METADATA BỘ LỌC 6 TẦNG & ĐỐI CHIẾU GIÁ ---
    filterMeta: {
      canonicalRoomKey,
      roomType: roomTypeInfo.roomType,
      roomTypeMethod: roomTypeInfo.method,
      roomTypeReason: roomTypeInfo.reason,
      goodNStayBedType: bedInfo.goodNStayBedType,
      detailedBedCategory: bedInfo.detailedBedCategory,
      bedFilterLabelVi: bedInfo.filterLabelVi,
      bedReason: bedInfo.reason,
      totalBeds: bedInfo.totalBeds,
      isMultiBed: bedInfo.isMultiBed,
      maxGuests: bedInfo.inferredMaxGuests,
      viewCategory,
      areaSqm,
      areaBucket,
      mealPlan: ratePlan.mealPlan,
      mealPlanLabelVi: ratePlan.mealPlanLabelVi,
      cancelPolicy: ratePlan.cancelPolicy,
      cancelPolicyLabelVi: ratePlan.cancelPolicyLabelVi,
      rateBucket: ratePlan.rateBucket,
      netPrice,
      taxesAndFees,
      grossPrice,
      rawBedText: rawRoom.bedText || "",
      rawFeatures: rawRoom.features || [],
      rawBenefits: rawRoom.benefits || [],
    },
  };
}

/**
 * Công thức tính % Chênh lệch giá giữa các nền tảng cho cùng 1 hạng phòng & cùng điều kiện
 * @param {Record<string, { netPrice: number, grossPrice: number, roomName: string }>} otaOffersByPlatform
 * @param {"GROSS" | "NET"} priceBasis - Mặc định "GROSS" (Tổng giá thanh toán sau thuế phí)
 */
export function calculatePlatformPriceSpread(otaOffersByPlatform, priceBasis = "GROSS") {
  const entries = Object.entries(otaOffersByPlatform)
    .filter(([, offer]) => offer && offer.grossPrice > 0)
    .map(([ota, offer]) => ({
      ota,
      price: priceBasis === "GROSS" ? offer.grossPrice : offer.netPrice,
      netPrice: offer.netPrice,
      grossPrice: offer.grossPrice,
      taxesAndFees: offer.taxesAndFees,
      roomName: offer.roomName,
    }));

  if (entries.length === 0) {
    return null;
  }

  const prices = entries.map((e) => e.price).sort((a, b) => a - b);
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];
  const midIdx = Math.floor(prices.length / 2);
  const medianPrice =
    prices.length % 2 === 0
      ? (prices[midIdx - 1] + prices[midIdx]) / 2
      : prices[midIdx];

  const goodNStayEntry = entries.find((e) => e.ota === "GOODNSTAY");
  const refPrice = goodNStayEntry ? goodNStayEntry.price : minPrice;

  const marketSpreadPct = Number((((maxPrice - minPrice) / minPrice) * 100).toFixed(2));

  const platformMetrics = {};
  for (const entry of entries) {
    // 1. % Chênh lệch so với mốc chuẩn goodNstay (Δ% vs Reference)
    const diffVsRefPct = Number((((entry.price - refPrice) / refPrice) * 100).toFixed(2));
    // 2. % Khách tiết kiệm khi đặt trên goodNstay so với OTA này (Savings %)
    const customerSavingsVsOtaPct = Number(
      (((entry.price - refPrice) / entry.price) * 100).toFixed(2)
    );
    // 3. % Cao hơn so với Giá Rẻ Nhất Thị Trường (Spread to Market Min %)
    const spreadToMinPct = Number((((entry.price - minPrice) / minPrice) * 100).toFixed(2));
    // 4. % Lệch so với Trung vị Thị trường (Spread to Median %)
    const spreadToMedianPct = Number(
      (((entry.price - medianPrice) / medianPrice) * 100).toFixed(2)
    );

    platformMetrics[entry.ota] = {
      ...entry,
      diffVsRefPct,
      diffVsRefAmount: entry.price - refPrice,
      customerSavingsVsOtaPct,
      spreadToMinPct,
      spreadToMedianPct,
      isCheapest: entry.price === minPrice,
      isMostExpensive: entry.price === maxPrice && maxPrice > minPrice,
      parityStatus:
        entry.ota === "GOODNSTAY"
          ? "REFERENCE"
          : diffVsRefPct < -0.5
          ? "UNDERCUT_ALERT" // OTA đang bán rẻ hơn goodNstay!
          : Math.abs(diffVsRefPct) <= 0.5
          ? "IN_PARITY"
          : "HIGHER_THAN_REF",
    };
  }

  return {
    priceBasis,
    minPrice,
    maxPrice,
    medianPrice: Math.round(medianPrice),
    referencePrice: refPrice,
    marketSpreadPct,
    cheapestPlatforms: entries.filter((e) => e.price === minPrice).map((e) => e.ota),
    mostExpensivePlatforms: entries.filter((e) => e.price === maxPrice).map((e) => e.ota),
    platforms: platformMetrics,
  };
}

/**
 * Bộ Lọc 6 Tầng (6-Stage Strict Filter) & Gom Nhóm Hạng Phòng Đồng Nhất Giữa Các OTA
 */
export function buildMatchedRoomComparisonGroups(normalizedRooms = [], filters = {}) {
  const {
    hotelId = "ALL",
    roomType = "ALL",               // Tầng 1: Standard | Superior | Deluxe | Executive | Suite
    detailedBedCategory = "ALL",    // Tầng 2: SINGLE_1_BED | TWIN_2_SINGLE | DOUBLE_QUEEN_1_BED | KING_1_BED | MULTI_BED_TRIPLE | MULTI_BED_QUAD_FAMILY
    multiBedMode = "ALL",           // "ALL" | "SINGLE_BED_ONLY" (1 giường) | "MULTI_BED_ONLY" (>=2 giường: Twin, Triple, Family)
    viewCategory = "ALL",           // Tầng 3: OCEAN_SEA_VIEW | CITY_VIEW | ...
    rateBucket = "BB_NON_REFUNDABLE", // Tầng 5: RO_NON_REFUNDABLE | BB_NON_REFUNDABLE | BB_FREE_CANCEL
    priceBasis = "GROSS",           // Tầng 6: GROSS | NET
  } = filters;

  // Lọc các bản ghi thỏa mãn Bộ lọc 6 tầng
  const filtered = normalizedRooms.filter((r) => {
    if (hotelId !== "ALL" && r.hotelId !== hotelId) return false;
    if (roomType !== "ALL" && r.filterMeta.roomType !== roomType) return false;
    if (
      detailedBedCategory !== "ALL" &&
      r.filterMeta.detailedBedCategory !== detailedBedCategory
    ) {
      return false;
    }
    if (multiBedMode === "SINGLE_BED_ONLY" && r.filterMeta.isMultiBed) return false;
    if (multiBedMode === "MULTI_BED_ONLY" && !r.filterMeta.isMultiBed) return false;
    if (viewCategory !== "ALL" && r.filterMeta.viewCategory !== viewCategory) return false;
    if (rateBucket !== "ALL" && r.filterMeta.rateBucket !== rateBucket) return false;
    return true;
  });

  // Gom nhóm theo (canonicalRoomKey + rateBucket)
  const groupsMap = new Map();
  for (const item of filtered) {
    const groupKey = `${item.filterMeta.canonicalRoomKey}::${item.filterMeta.rateBucket}`;
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        groupKey,
        hotelId: item.hotelId,
        hotelName: item.hotelName,
        canonicalRoomKey: item.filterMeta.canonicalRoomKey,
        roomType: item.filterMeta.roomType,
        goodNStayBedType: item.filterMeta.goodNStayBedType,
        detailedBedCategory: item.filterMeta.detailedBedCategory,
        bedFilterLabelVi: item.filterMeta.bedFilterLabelVi,
        totalBeds: item.filterMeta.totalBeds,
        isMultiBed: item.filterMeta.isMultiBed,
        maxGuests: item.filterMeta.maxGuests,
        viewCategory: item.filterMeta.viewCategory,
        areaSqm: item.filterMeta.areaSqm,
        mealPlan: item.filterMeta.mealPlan,
        mealPlanLabelVi: item.filterMeta.mealPlanLabelVi,
        cancelPolicy: item.filterMeta.cancelPolicy,
        cancelPolicyLabelVi: item.filterMeta.cancelPolicyLabelVi,
        rateBucket: item.filterMeta.rateBucket,
        sampleGoodNStayForm: item.formFields,
        otaOffers: {},
        rawItems: [],
      });
    }

    const group = groupsMap.get(groupKey);
    group.rawItems.push(item);
    if (!group.areaSqm && item.filterMeta.areaSqm) {
      group.areaSqm = item.filterMeta.areaSqm;
    }

    // Nếu cùng 1 OTA có nhiều gói trong cùng bucket, giữ gói có giá Gross thấp nhất của bucket đó
    const existing = group.otaOffers[item.otaSource];
    if (!existing || item.filterMeta.grossPrice < existing.grossPrice) {
      group.otaOffers[item.otaSource] = {
        id: item.id,
        roomName: item.formFields.roomName,
        netPrice: item.filterMeta.netPrice,
        taxesAndFees: item.filterMeta.taxesAndFees,
        grossPrice: item.filterMeta.grossPrice,
        formFields: item.formFields,
        filterMeta: item.filterMeta,
      };
    }
  }

  // Tính toán % Chênh lệch giá cho từng nhóm phòng đã khớp
  const results = [];
  for (const group of groupsMap.values()) {
    const spreadAnalysis = calculatePlatformPriceSpread(group.otaOffers, priceBasis);
    results.push({
      ...group,
      spreadAnalysis,
    });
  }

  return results;
}
