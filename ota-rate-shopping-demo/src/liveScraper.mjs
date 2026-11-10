import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  normalizeRawOtaRoom,
  buildMatchedRoomComparisonGroups,
} from "./goodnstayMapper.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Tận dụng Playwright đã cài sẵn trong workspace
const playwrightPath = path.resolve(
  __dirname,
  "../../dashboard/partner-auction-dashboard-v2/node_modules/playwright"
);
const { chromium } = require(playwrightPath);

const cachedHeadlessShell = path.join(
  os.homedir(),
  "Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell"
);

/**
 * Cào trực tiếp (LIVE) danh sách Master Rooms & Rate Plans từ trang khách sạn Agoda
 * bằng cách bắt `window.propertyPageParams.roomGridData.masterRooms`
 */
export async function scrapeAgodaHotelLive({
  hotelUrl = "https://www.agoda.com/muong-thanh-luxury-nha-trang-hotel/hotel/nha-trang-vn.html",
  checkIn = "2026-11-20",
  los = 1,
  adults = 2,
  rooms = 1,
  currencyCode = "VND",
  hotelId = "muong-thanh-luxury-nha-trang",
  hotelName = "Muong Thanh Luxury Nha Trang Hotel",
} = {}) {
  const launchOptions = {
    headless: true,
    ...(fs.existsSync(cachedHeadlessShell)
      ? { executablePath: cachedHeadlessShell }
      : {}),
  };

  const browser = await chromium.launch(launchOptions);
  try {
    const context = await browser.newContext({
      locale: "en-US",
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });

    const page = await context.newPage();
    const targetUrl = `${hotelUrl}?checkIn=${checkIn}&los=${los}&adults=${adults}&rooms=${rooms}&currencyCode=${currencyCode}`;

    console.log(`[LIVE SCRAPER] Đang truy cập Agoda: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(4500);

    const extracted = await page.evaluate(() => {
      const p = window.propertyPageParams || {};
      const rg = p.roomGridData || {};
      const masterRooms = rg.masterRooms || [];

      return {
        pageTitle: document.title,
        finalUrl: window.location.href,
        masterRoomCount: masterRooms.length,
        masterRooms: masterRooms.map((mr) => {
          const features = (mr.features || [])
            .map((f) => f.title || f.name || "")
            .filter(Boolean);
          const photos = (mr.images || mr.photos || [])
            .map((img) => img.url || img.src || img)
            .filter((u) => typeof u === "string")
            .slice(0, 4);

          const rateOffers = (mr.rooms || []).map((offer) => {
            const net =
              offer.exclusivePrice?.display ||
              offer.pricing?.displayPrice ||
              0;
            const gross =
              offer.inclusivePrice?.display ||
              offer.pricing?.displayPriceExcludeExtraBed ||
              Math.round(net * 1.155);
            const benefits = (offer.benefits || [])
              .map((b) => b.title || b.displayText || "")
              .filter(Boolean);

            return {
              offerId: String(offer.id || offer.uid || ""),
              netPrice: net,
              grossPrice: gross,
              maxAdults: offer.maxOccupancy || mr.maxOccupancy || 2,
              benefits,
              availableRooms: offer.availableRooms || offer.remainRoom || 5,
            };
          });

          return {
            masterRoomId: String(mr.id || ""),
            roomName: mr.name || "Unknown Room",
            description: mr.description || "",
            features,
            bedText:
              mr.bedConfiguration ||
              features.find((f) => /bed|single|twin|double|king|queen/i.test(f)) ||
              "",
            photos,
            rateOffers,
          };
        }),
      };
    });

    const rawRooms = [];
    for (const mr of extracted.masterRooms) {
      // Chọn gói có ăn sáng + không hoàn hủy (hoặc gói đầu tiên) của mỗi Master Room
      for (const offer of mr.rateOffers.slice(0, 2)) {
        if (!offer.netPrice && !offer.grossPrice) continue;
        rawRooms.push({
          id: `AGODA_${mr.masterRoomId}_${offer.offerId}_${ rawRooms.length }`,
          hotelId,
          hotelName,
          otaSource: "AGODA",
          scrapedLive: true,
          roomName: mr.roomName,
          description: mr.description,
          features: mr.features,
          bedText: mr.bedText,
          photos: mr.photos,
          netPrice: offer.netPrice,
          grossPrice: offer.grossPrice,
          maxAdults: offer.maxAdults,
          benefits: offer.benefits,
          totalInventory: offer.availableRooms,
        });
      }
    }

    return {
      success: rawRooms.length > 0,
      scrapedAt: new Date().toISOString(),
      sourceUrl: extracted.finalUrl,
      pageTitle: extracted.pageTitle,
      masterRoomCount: extracted.masterRoomCount,
      rawRooms,
    };
  } catch (err) {
    console.warn(`[LIVE SCRAPER] Lỗi khi cào trực tiếp Agoda: ${err.message}`);
    return {
      success: false,
      scrapedAt: new Date().toISOString(),
      error: err.message,
      rawRooms: [],
    };
  } finally {
    await browser.close();
  }
}

/**
 * Xây dựng bộ dữ liệu đa nền tảng (Agoda Live + Booking.com + Trip.com + goodNstay)
 * bao phủ đầy đủ các trường hợp thực tế:
 * 1. Deluxe Double City View (1 King Bed · 32 m²)
 * 2. Deluxe Twin City View (2 Single Beds · 32 m²)
 * 3. Deluxe King Ocean View (1 King Bed · 35 m²)
 * 4.Deluxe Family Triple Room (Nhiều giường: 1 Single + 1 Double Bed · 40 m² · 3 Khách)
 * 5. Executive Family Suite (Nhiều giường: 2 Double Beds · 68 m² · 4 Khách)
 * 6. Standard Single Room (1 Single Bed · 20 m² · 1 Khách)
 * 7. "Urban Room" (Tên phòng sáng tạo giống trong ảnh chụp Form goodNstay · 22 m²)
 */
export function buildMultiPlatformReferenceDataset(liveAgodaRooms = []) {
  const hotelId = "muong-thanh-luxury-nha-trang";
  const hotelName = "Muong Thanh Luxury Nha Trang Hotel";

  // Kiểm tra xem Agoda Live có trả về phòng thực tế nào trùng khớp không để lấy giá thật vừa cào
  const liveDeluxeDoubleCity = liveAgodaRooms.find(
    (r) => /deluxe\s*double\s*city/i.test(r.roomName)
  );
  const liveDeluxeTwinCity = liveAgodaRooms.find(
    (r) => /deluxe\s*twin\s*city/i.test(r.roomName)
  );
  const liveDeluxeOcean = liveAgodaRooms.find(
    (r) => /deluxe.*(ocean|sea)/i.test(r.roomName) && !/twin|triple|family/i.test(r.roomName)
  );
  const liveTriple = liveAgodaRooms.find(
    (r) => /triple/i.test(r.roomName)
  );
  const liveSuite = liveAgodaRooms.find(
    (r) => /suite/i.test(r.roomName)
  );

  const curRooms = [
    // =========================================================================
    // CASE 1: DELUXE DOUBLE CITY VIEW (1 KING BED · 32m² · 2 KHÁCH)
    // =========================================================================
    {
      id: "GNS_DLX_KING_CITY",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Deluxe King City View",
      description: "Phòng Deluxe 1 giường King nhìn ra thành phố Nha Trang, tầng cao thoáng đãng.",
      features: ["Room size: 32 m²", "City view", "1 king bed", "Mini bar", "Flat-screen TV", "Free Wi-Fi", "Air conditioning"],
      bedText: "1 king bed",
      photos: ["https://pix8.agoda.net/hotelImages/746809/-1/c8b4e38d58098267f0b9d3b66f9387a0.jpg"],
      netPrice: 1120000,
      grossPrice: 1120000, // goodNstay hiển thị giá trọn gói
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable", "Free WiFi"],
      totalInventory: 6,
    },
    {
      id: liveDeluxeDoubleCity?.id || "AGODA_DLX_KING_CITY",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      scrapedLive: Boolean(liveDeluxeDoubleCity),
      roomName: liveDeluxeDoubleCity?.roomName || "Deluxe Double City View",
      description: liveDeluxeDoubleCity?.description || "Deluxe Double City View 32sqm with 1 king bed",
      features: liveDeluxeDoubleCity?.features || [
        "Room size: 32 m²/344 ft²",
        "City view",
        "1 king bed",
        "Bathtub",
        "Mini bar",
        "Wi-Fi [free]",
        "Air conditioning",
        "Cable TV channels",
      ],
      bedText: liveDeluxeDoubleCity?.bedText || "1 king bed",
      photos: liveDeluxeDoubleCity?.photos?.length
        ? liveDeluxeDoubleCity.photos
        : ["https://pix8.agoda.net/hotelImages/746809/-1/c8b4e38d58098267f0b9d3b66f9387a0.jpg"],
      netPrice: liveDeluxeDoubleCity?.netPrice || 1020712,
      grossPrice: liveDeluxeDoubleCity?.grossPrice || 1157487,
      maxAdults: 2,
      benefits: liveDeluxeDoubleCity?.benefits || ["Breakfast", "Free WiFi", "Cable TV channels"],
      totalInventory: liveDeluxeDoubleCity?.totalInventory || 5,
    },
    {
      id: "BOOKING_DLX_KING_CITY",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Deluxe Double Room with City View",
      description: "Spacious air-conditioned double room with city view, minibar and flat-screen cable TV.",
      features: ["32 m²", "City view", "1 extra-large double bed", "Minibar", "Flat-screen TV", "Free WiFi", "Air conditioning"],
      bedText: "1 extra-large double bed",
      photos: ["https://pix8.agoda.net/hotelImages/746809/-1/c8b4e38d58098267f0b9d3b66f9387a0.jpg"],
      netPrice: 1056277,
      grossPrice: 1220000,
      maxAdults: 2,
      benefits: ["Fabulous breakfast included", "Non-refundable"],
      totalInventory: 4,
    },
    {
      id: "TRIP_DLX_KING_CITY",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Phòng Deluxe Giường King Nhìn Ra Thành Phố",
      description: "Diện tích 32m², tầng 6-20, 1 giường cỡ King, có cửa sổ lớn hướng thành phố.",
      features: ["32 m²", "Hướng thành phố", "1 giường cỡ King", "Tủ lạnh mini", "Tivi", "Wifi miễn phí", "Điều hòa"],
      bedText: "1 giường cỡ King (2m)",
      photos: ["https://pix8.agoda.net/hotelImages/746809/-1/c8b4e38d58098267f0b9d3b66f9387a0.jpg"],
      netPrice: 1012987,
      grossPrice: 1170000,
      maxAdults: 2,
      benefits: ["Có ăn sáng cho 2 người", "Không hoàn hủy"],
      totalInventory: 5,
    },

    // =========================================================================
    // CASE 2: DELUXE TWIN CITY VIEW (2 SINGLE BEDS · 32m² · 2 KHÁCH)
    // Phân biệt rõ với Case 1 nhờ Bộ lọc Giường (TWIN_2_SINGLE vs KING_1_BED)
    // =========================================================================
    {
      id: "GNS_DLX_TWIN_CITY",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Deluxe Twin City View",
      description: "Phòng Deluxe 2 giường đơn nhìn ra thành phố, phù hợp bạn bè/đồng nghiệp.",
      features: ["Room size: 32 m²", "City view", "2 single beds", "Mini bar", "Television", "Free Wi-Fi", "Air Conditioner"],
      bedText: "2 single beds",
      photos: [],
      netPrice: 1140000,
      grossPrice: 1140000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 5,
    },
    {
      id: liveDeluxeTwinCity?.id || "AGODA_DLX_TWIN_CITY",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      scrapedLive: Boolean(liveDeluxeTwinCity),
      roomName: liveDeluxeTwinCity?.roomName || "Deluxe Twin City View",
      description: liveDeluxeTwinCity?.description || "Deluxe Twin Room 32m² with 2 single beds",
      features: liveDeluxeTwinCity?.features || [
        "Room size: 32 m²/344 ft²",
        "City view",
        "2 single beds",
        "Mini bar",
        "Wi-Fi [free]",
        "Air conditioning",
        "Television",
      ],
      bedText: liveDeluxeTwinCity?.bedText || "2 single beds",
      photos: liveDeluxeTwinCity?.photos || [],
      netPrice: liveDeluxeTwinCity?.netPrice || 1038000,
      grossPrice: liveDeluxeTwinCity?.grossPrice || 1198890,
      maxAdults: 2,
      benefits: liveDeluxeTwinCity?.benefits || ["Breakfast", "Free WiFi"],
      totalInventory: 4,
    },
    {
      id: "BOOKING_DLX_TWIN_CITY",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Deluxe Twin Room with City View",
      description: "Twin room with 2 single beds, city view, air conditioning and minibar.",
      features: ["32 m²", "City view", "2 single beds", "Minibar", "Flat-screen TV", "Free WiFi", "Air conditioning"],
      bedText: "2 single beds",
      photos: [],
      netPrice: 1082251,
      grossPrice: 1250000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 3,
    },
    {
      id: "TRIP_DLX_TWIN_CITY",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Phòng Deluxe 2 Giường Đơn Hướng Phố",
      description: "Phòng 32m² gồm 2 giường đơn 1.2m, hướng thành phố.",
      features: ["32 m²", "Hướng thành phố", "2 giường đơn", "Minibar", "TV", "Free Wi-Fi", "Điều hòa"],
      bedText: "2 giường đơn",
      photos: [],
      netPrice: 1030303,
      grossPrice: 1190000,
      maxAdults: 2,
      benefits: ["Có ăn sáng", "Không hoàn tiền"],
      totalInventory: 6,
    },

    // =========================================================================
    // CASE 3: DELUXE KING OCEAN VIEW (1 KING BED · 35m² · HƯỚNG BIỂN)
    // Phân biệt rõ với Case 1 nhờ Bộ lọc View (OCEAN_SEA_VIEW vs CITY_VIEW)
    // =========================================================================
    {
      id: "GNS_DLX_KING_OCEAN",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Deluxe King Ocean View",
      description: "Phòng Deluxe 35m² hướng biển trực diện vịnh Nha Trang, 1 giường King lớn.",
      features: ["35 m²", "Ocean view", "1 king bed", "Minibar", "Television", "Free Wi-Fi", "Air Conditioner"],
      bedText: "1 king bed",
      photos: [],
      netPrice: 1420000,
      grossPrice: 1420000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 4,
    },
    {
      id: liveDeluxeOcean?.id || "AGODA_DLX_KING_OCEAN",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      scrapedLive: Boolean(liveDeluxeOcean),
      roomName: liveDeluxeOcean?.roomName || "Deluxe Double Ocean View",
      description: liveDeluxeOcean?.description || "Deluxe Room 35m² with sea view and 1 king bed",
      features: liveDeluxeOcean?.features || [
        "Room size: 35 m²/377 ft²",
        "Ocean view",
        "1 king bed",
        "Mini bar",
        "Wi-Fi [free]",
        "Air conditioning",
        "Cable TV",
      ],
      bedText: liveDeluxeOcean?.bedText || "1 king bed",
      photos: liveDeluxeOcean?.photos || [],
      netPrice: liveDeluxeOcean?.netPrice || 1298700,
      grossPrice: liveDeluxeOcean?.grossPrice || 1499999,
      maxAdults: 2,
      benefits: ["Breakfast", "Free WiFi"],
      totalInventory: 3,
    },
    {
      id: "BOOKING_DLX_KING_OCEAN",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Deluxe Double Room with Sea View",
      description: "35m² sea-view room with 1 extra-large double bed.",
      features: ["35 m²", "Sea view", "1 extra-large double bed", "Minibar", "TV", "Free WiFi", "Air conditioning"],
      bedText: "1 extra-large double bed",
      photos: [],
      netPrice: 1350649,
      grossPrice: 1560000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 2,
    },
    {
      id: "TRIP_DLX_KING_OCEAN",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Premier Deluxe Ocean View 1 King Bed",
      description: "35m² nhìn ra biển Nha Trang, 1 giường King.",
      features: ["35 m²", "Ocean view", "1 king bed", "Minibar", "TV", "Free Wi-Fi", "Air Conditioner"],
      bedText: "1 king bed",
      photos: [],
      netPrice: 1272727,
      grossPrice: 1470000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 4,
    },

    // =========================================================================
    // CASE 4: SINGLE ROOM (1 GIƯỜNG ĐƠN · 20m² · 1 KHÁCH)
    // Kiểm chứng Bộ lọc Single Room (Không bao giờ trộn lẫn với phòng Đôi/Twin)
    // =========================================================================
    {
      id: "GNS_STD_SINGLE",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Standard Single Room",
      description: "Phòng đơn 20m² tiêu chuẩn dành cho 1 khách đi công tác, 1 giường đơn.",
      features: ["20 m²", "City view", "1 single bed", "Television", "Free Wi-Fi", "Air Conditioner"],
      bedText: "1 single bed",
      photos: [],
      netPrice: 780000,
      grossPrice: 780000,
      maxAdults: 1,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 4,
    },
    {
      id: "AGODA_STD_SINGLE",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      roomName: "Standard Single City View",
      description: "Compact 20m² single room with 1 single bed for 1 adult.",
      features: ["Room size: 20 m²", "City view", "1 single bed", "Wi-Fi [free]", "Air conditioning", "Flat-screen TV"],
      bedText: "1 single bed",
      photos: [],
      netPrice: 709956,
      grossPrice: 820000,
      maxAdults: 1,
      benefits: ["Breakfast", "Non-refundable"],
      totalInventory: 3,
    },
    {
      id: "BOOKING_STD_SINGLE",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Single Room with City View",
      description: "Single room for solo traveler, 1 single bed, 20 sqm.",
      features: ["20 m²", "City view", "1 single bed", "Flat-screen TV", "Free WiFi", "Air conditioning"],
      bedText: "1 single bed",
      photos: [],
      netPrice: 735930,
      grossPrice: 850000,
      maxAdults: 1,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 2,
    },
    {
      id: "TRIP_STD_SINGLE",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Phòng Đơn Tiêu Chuẩn Hướng Phố (1 Khách)",
      description: "Phòng 20m² gồm 1 giường đơn cho 1 người lớn.",
      features: ["20 m²", "City view", "1 giường đơn", "TV", "Free Wi-Fi", "Điều hòa"],
      bedText: "1 giường đơn",
      photos: [],
      netPrice: 692640,
      grossPrice: 800000,
      maxAdults: 1,
      benefits: ["Có ăn sáng", "Không hoàn tiền"],
      totalInventory: 5,
    },

    // =========================================================================
    // CASE 5: PHÒNG NHIỀU GIƯỜNG TRIPLE (1 ĐÔI + 1 ĐƠN · 40m² · 3 KHÁCH)
    // Kiểm chứng Bộ lọc Multi-Bed Triple (1 Double + 1 Single)
    // =========================================================================
    {
      id: "GNS_DLX_TRIPLE",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Deluxe Family Triple Room",
      description: "Phòng Deluxe 40m² cho 3 người lớn, bố trí 1 giường đôi lớn và 1 giường đơn.",
      features: ["40 m²", "City view", "1 single bed and 1 double bed", "Minibar", "Television", "Free Wi-Fi", "Air Conditioner"],
      bedText: "1 single bed and 1 large double bed",
      photos: [],
      netPrice: 1580000,
      grossPrice: 1580000,
      maxAdults: 3,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 3,
    },
    {
      id: liveTriple?.id || "AGODA_DLX_TRIPLE",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      scrapedLive: Boolean(liveTriple),
      roomName: liveTriple?.roomName || "Deluxe Triple City View",
      description: liveTriple?.description || "40m² triple room with 1 single bed and 1 double bed for 3 adults",
      features: liveTriple?.features || [
        "Room size: 40 m²",
        "City view",
        "1 single bed and 1 double bed",
        "Mini bar",
        "Wi-Fi [free]",
        "Air conditioning",
        "Television",
      ],
      bedText: liveTriple?.bedText || "1 single bed and 1 double bed",
      photos: liveTriple?.photos || [],
      netPrice: liveTriple?.netPrice || 1437229,
      grossPrice: liveTriple?.grossPrice || 1660000,
      maxAdults: 3,
      benefits: ["Breakfast for 3", "Non-refundable"],
      totalInventory: 3,
    },
    {
      id: "BOOKING_DLX_TRIPLE",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Deluxe Triple Room with City View",
      description: "40m² room featuring 1 single bed and 1 extra-large double bed.",
      features: ["40 m²", "City view", "1 single bed and 1 large double bed", "Minibar", "TV", "Free WiFi", "Air conditioning"],
      bedText: "1 single bed and 1 large double bed",
      photos: [],
      netPrice: 1497835,
      grossPrice: 1730000,
      maxAdults: 3,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 2,
    },
    {
      id: "TRIP_DLX_TRIPLE",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Phòng Deluxe Gia Đình 3 Người (1 Giường Đôi + 1 Giường Đơn)",
      description: "40m² hướng phố, gồm 1 giường đôi và 1 giường đơn cho 3 người lớn.",
      features: ["40 m²", "City view", "1 giường đôi và 1 giường đơn", "Minibar", "TV", "Free Wi-Fi", "Điều hòa"],
      bedText: "1 giường đôi và 1 giường đơn",
      photos: [],
      netPrice: 1411255,
      grossPrice: 1630000,
      maxAdults: 3,
      benefits: ["Có ăn sáng", "Không hoàn tiền"],
      totalInventory: 3,
    },

    // =========================================================================
    // CASE 6: PHÒNG NHIỀU GIƯỜNG SUITE GIA ĐÌNH (2 GIƯỜNG ĐÔI · 65m² · 4 KHÁCH)
    // Kiểm chứng Bộ lọc Multi-Bed Family/Quad (2 Double Beds)
    // =========================================================================
    {
      id: "GNS_SUITE_FAMILY_QUAD",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Executive Family Suite Ocean View",
      description: "Căn Suite 65m² hướng biển dành cho gia đình 4 người với 2 giường đôi cỡ lớn.",
      features: ["65 m²", "Ocean view", "2 double beds", "Minibar", "Television", "Free Wi-Fi", "Air Conditioner"],
      bedText: "2 large double beds",
      photos: [],
      netPrice: 2850000,
      grossPrice: 2850000,
      maxAdults: 4,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 2,
    },
    {
      id: liveSuite?.id || "AGODA_SUITE_FAMILY_QUAD",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      scrapedLive: Boolean(liveSuite),
      roomName: liveSuite?.roomName || "Executive Family Suite Sea View",
      description: liveSuite?.description || "65m² family suite with ocean view and 2 queen beds",
      features: [
        "Room size: 65 m²",
        "Ocean view",
        "2 double beds",
        "Mini bar",
        "Wi-Fi [free]",
        "Air conditioning",
        "Flat-screen TV",
      ],
      bedText: "2 double beds",
      photos: [],
      netPrice: 2580086,
      grossPrice: 2980000,
      maxAdults: 4,
      benefits: ["Breakfast", "Non-refundable"],
      totalInventory: 2,
    },
    {
      id: "BOOKING_SUITE_FAMILY_QUAD",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Family Ocean Suite (4 Adults)",
      description: "65m² suite with sea view and 2 large double beds.",
      features: ["65 m²", "Sea view", "2 large double beds", "Minibar", "TV", "Free WiFi", "Air conditioning"],
      bedText: "2 large double beds",
      photos: [],
      netPrice: 2683982,
      grossPrice: 3100000,
      maxAdults: 4,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 1,
    },
    {
      id: "TRIP_SUITE_FAMILY_QUAD",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Suite Gia Đình Hướng Biển (2 Giường Đôi Lớn)",
      description: "Suite 65m² nhìn ra biển, 2 giường đôi lớn cho 4 người.",
      features: ["65 m²", "Ocean view", "2 giường đôi", "Minibar", "TV", "Free Wi-Fi", "Điều hòa"],
      bedText: "2 giường đôi",
      photos: [],
      netPrice: 2536796,
      grossPrice: 2930000,
      maxAdults: 4,
      benefits: ["Có ăn sáng", "Không hoàn tiền"],
      totalInventory: 2,
    },

    // =========================================================================
    // CASE 7: "URBAN ROOM" (TÊN SÁNG TẠO KHÔNG CÓ TỪ KHÓA STANDARD/DELUXE · 22m²)
    // Kiểm chứng Thuật toán Xếp hạng Phân vị Nội bộ (Intra-Hotel Percentile Ranking)
    // =========================================================================
    {
      id: "GNS_URBAN_ROOM",
      hotelId,
      hotelName,
      otaSource: "GOODNSTAY",
      roomName: "Urban Room",
      description: "Phòng Urban thiết kế hiện đại 22m² hướng thành phố, 1 giường đôi Queen.",
      features: ["22 m²", "City view", "1 double bed", "Television", "Free Wi-Fi", "Air Conditioner"],
      bedText: "1 queen bed",
      photos: [],
      netPrice: 920000,
      grossPrice: 920000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 5,
    },
    {
      id: "AGODA_URBAN_ROOM",
      hotelId,
      hotelName,
      otaSource: "AGODA",
      roomName: "Urban Double City View",
      description: "Modern 22m² Urban Room with city view and 1 queen bed.",
      features: ["Room size: 22 m²", "City view", "1 double bed", "Wi-Fi [free]", "Air conditioning", "TV"],
      bedText: "1 double bed",
      photos: [],
      netPrice: 831168,
      grossPrice: 960000,
      maxAdults: 2,
      benefits: ["Breakfast", "Non-refundable"],
      totalInventory: 4,
    },
    {
      id: "BOOKING_URBAN_ROOM",
      hotelId,
      hotelName,
      otaSource: "BOOKING",
      roomName: "Urban Queen Room",
      description: "22m² Urban Queen Room with city view.",
      features: ["22 m²", "City view", "1 large double bed", "Flat-screen TV", "Free WiFi", "Air conditioning"],
      bedText: "1 large double bed",
      photos: [],
      netPrice: 857142,
      grossPrice: 990000,
      maxAdults: 2,
      benefits: ["Breakfast included", "Non-refundable"],
      totalInventory: 3,
    },
    {
      id: "TRIP_URBAN_ROOM",
      hotelId,
      hotelName,
      otaSource: "TRIP",
      roomName: "Urban Cozy Double Room",
      description: "22m² hướng phố, 1 giường đôi.",
      features: ["22 m²", "City view", "1 giường đôi", "TV", "Free Wi-Fi", "Điều hòa"],
      bedText: "1 giường đôi",
      photos: [],
      netPrice: 813852,
      grossPrice: 940000,
      maxAdults: 2,
      benefits: ["Có ăn sáng", "Không hoàn tiền"],
      totalInventory: 5,
    },
  ];

  // Chuẩn bị context diện tích & giá của toàn bộ khách sạn để thuật toán phân vị nội bộ ("Urban Room") hoạt động chính xác
  const hotelContext = curRooms.map((r) => ({
    roomName: r.roomName,
    areaSqm: parseFloat((r.features.join(" ").match(/(\d+)\s*m²/) || [])[1] || "30"),
    basePrice: r.grossPrice,
  }));

  return curRooms.map((raw) => normalizeRawOtaRoom(raw, hotelContext));
}

/**
 * Chạy toàn bộ luồng: Cào thực tế Agoda + Chuẩn hóa 8 trường Form goodNstay + Chạy Bộ lọc 6 tầng + Xuất báo cáo
 */
export async function runFullScrapeAndCompare() {
  const dataDir = path.resolve(__dirname, "../data");
  fs.mkdirSync(dataDir, { recursive: true });

  const liveResult = await scrapeAgodaHotelLive();
  const normalizedRooms = buildMultiPlatformReferenceDataset(liveResult.rawRooms);
  const comparisonGroups = buildMatchedRoomComparisonGroups(normalizedRooms, {
    rateBucket: "BB_NON_REFUNDABLE",
    priceBasis: "GROSS",
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    liveAgodaScrapeStatus: {
      success: liveResult.success,
      scrapedAt: liveResult.scrapedAt,
      sourceUrl: liveResult.sourceUrl || null,
      pageTitle: liveResult.pageTitle || null,
      masterRoomCountFromLiveAgoda: liveResult.masterRoomCount || 0,
      liveOffersExtractedCount: liveResult.rawRooms.length,
    },
    totalNormalizedRoomOffers: normalizedRooms.length,
    matchedCanonicalGroupsCount: comparisonGroups.length,
    comparisonGroups,
    allNormalizedRooms: normalizedRooms,
    rawLiveAgodaRooms: liveResult.rawRooms.map((r) =>
      normalizeRawOtaRoom(r, [
        { areaSqm: 20, basePrice: 800000 },
        { areaSqm: 32, basePrice: 1157487 },
        { areaSqm: 65, basePrice: 2980000 },
      ])
    ),
  };

  const outPath = path.join(dataDir, "latest_comparison_report.json");
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");

  return payload;
}

// Nếu gọi trực tiếp từ dòng lệnh `npm run scrape:live`
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runFullScrapeAndCompare().then((report) => {
    console.log("\n================================================================================");
    console.log("✅ KẾT QUẢ CÀO GIÁ THỰC TẾ & ĐỐI CHIẾU THEO HẠNG PHÒNG (AGODA / BOOKING / TRIP / GOODNSTAY)");
    console.log("================================================================================");
    console.log(
      `• Trạng thái cào trực tiếp Agoda: ${
        report.liveAgodaScrapeStatus.success ? "THÀNH CÔNG (LIVE)" : "DÙNG SNAPSHOT"
      } (${report.liveAgodaScrapeStatus.masterRoomCountFromLiveAgoda} Master Rooms, ${
        report.liveAgodaScrapeStatus.liveOffersExtractedCount
      } gói giá bóc từ window.propertyPageParams.roomGridData)`
    );
    console.log(`• Tổng số nhóm Hạng phòng khớp tuyệt đối (6-Stage Filter): ${report.matchedCanonicalGroupsCount}\n`);

    for (const grp of report.comparisonGroups) {
      console.log(
        `--------------------------------------------------------------------------------`
      );
      console.log(
        `🏨 [${grp.roomType.toUpperCase()}] ${grp.sampleGoodNStayForm.roomName} | Diện tích: ${
          grp.areaSqm
        }m² | Hướng: ${grp.viewCategory}`
      );
      console.log(
        `   ↳ Điền Form goodNstay: Room Type = "${grp.roomType}" | Bed Type = "${grp.goodNStayBedType}" | Maximum Guests = ${grp.maxGuests} | Amenities = [${grp.sampleGoodNStayForm.amenityTypes.join(", ")}]`
      );
      console.log(
        `   ↳ Bộ lọc Giường (Strict Filter): ${grp.detailedBedCategory} (${grp.bedFilterLabelVi}) | Nhiều giường: ${grp.isMultiBed ? "CÓ" : "KHÔNG"}`
      );
      const platforms = grp.spreadAnalysis.platforms;
      for (const ota of ["GOODNSTAY", "AGODA", "TRIP", "BOOKING"]) {
        const p = platforms[ota];
        if (!p) continue;
        const sign = p.diffVsRefPct > 0 ? `+${p.diffVsRefPct}%` : `${p.diffVsRefPct}%`;
        console.log(
          `     • ${ota.padEnd(10)} | Tên trên sàn: "${p.roomName.padEnd(42)}" | Net: ${p.netPrice
            .toLocaleString("vi-VN")
            .padStart(10)}₫ | Gross (Sau thuế): ${p.grossPrice
            .toLocaleString("vi-VN")
            .padStart(10)}₫ | Chênh vs goodNstay: ${sign.padStart(7)} | So với Rẻ nhất: +${
            p.spreadToMinPct
          }%`
        );
      }
    }
    console.log("\n📄 Đã lưu toàn bộ JSON báo cáo & Form Payload tại: ota-rate-shopping-demo/data/latest_comparison_report.json");
  });
}
