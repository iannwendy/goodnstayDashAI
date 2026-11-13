# Danh Mục Test Case Tự Động — Optibide Partner Hub (`dashboard/dashboard/tests/`)

Tài liệu này liệt kê toàn bộ các nhóm Test Case tự động bảo vệ chất lượng cho **Optibide Partner Hub — Dashboard Overview** và bộ **Lean Master Data v3.0** (`partner_hub_config.json`, `bid_records.json`, `hub_inbox.json`, `schema_manifest.json`).  
**Quy tắc bắt buộc**: Mỗi khi thêm tính năng mới hoặc chỉnh sửa dữ liệu/logic/giao diện hiện có, phải chạy lại toàn bộ `npm test` + `npm run build` và cập nhật danh mục mã Test Case vào tài liệu này.

---

## 1. Unit Tests — Đa Tiền Tệ (VND/KRW/USD), Tỷ Giá Động, Ngày Lưu Trú & Tiện Ích (`tests/unit/pricing-and-formatters.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UNIT-01` | Quy đổi `convertFromVnd` tại biên `0`, tỷ giá mặc định và tỷ giá động truyền từ `partner_hub_config.json` | Làm tròn chuẩn (`VND` & `KRW` nguyên, `USD` 2 chữ số thập phân), không phát sinh `NaN` |
| `TC-UNIT-02` | Bộ định dạng tiền thương mại `formatBusinessMoney` (compact / full / có dấu `+` / âm / `0`) cho `VND`, `KRW`, `USD` | Hiển thị chuẩn `+66,4tr ₫`, `3,587,027 ₩`, `$2,612.60`, `0 ₫`, `0 ₩`, `$0` |
| `TC-UNIT-03` | Định dạng trục tung biểu đồ `getZeroRevenueAxisMaxVnd` & `formatAxisTickMoney` khi doanh thu `= 0` và `> 0` | Trục `0` không bị suy biến, mốc dương có dấu `+` và đúng đơn vị tiền tệ |
| `TC-UNIT-04` | `formatDisplayDate` định dạng ngày ISO `YYYY-MM-DD` sang `vi`, `en`, `ko` | `06/11/2026`, `Nov 06, 2026`, `2026.11.06` / `11월 6일` |
| `TC-UNIT-05` | `localizeAmenityCode` ánh xạ mã tiện ích chuẩn (`breakfast`, `wifi`, `pool`, `late_checkout`...) sang 3 ngôn ngữ | Dịch chính xác 100% sang `vi`, `en`, `ko` |

---

## 2. Lean Master-Data v3.0 Contract & Referential Integrity (`tests/unit/master-data-contract.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-DATA-01` | Kiểm tra đúng 3 bảng JSON tinh gọn (`partner_hub_config.json`, `bid_records.json`, `hub_inbox.json`) + `schema_manifest.json` (`3.0.0`) tại `master-data/` & `master-data/seed/`; cấm 12 file thừa v2.7 | Đồng bộ 100% giữa `master-data/` và `master-data/seed/`, `0` file rác cũ tồn tại |
| `TC-DATA-02` | Đồng bộ ánh xạ bảng giữa `vite.config.ts` (`TABLE_FILE_MAP`) và `src/services/masterDataService.ts` (`STATIC_TABLE_PATHS`) | Khớp 100% cả 3 khóa `hubConfig`, `bidRecords`, `hubInbox` |
| `TC-DATA-03` | Bất biến `partner_hub_config.json`: thương hiệu `Optibide`, tỷ giá `currencyRates`, hồ sơ `partnerUser` đa ngôn ngữ, 4 cơ sở (`br_mykhe`, `br_songhan`, `br_anthuong`, `stay_h11`), tổng phòng chuỗi `30 = 12+10+8`, tổng `previousPeriodRevenueVnd` khớp chính xác tổng 3 chi nhánh | Toàn vẹn cấu hình & toán học 100% (`9.8M`, `25.2M`, `54.6M`) |
| `TC-DATA-04` | Bất biến `bid_records.json`: `143` bản ghi (`68` chuỗi L'amour + `75` Stay Hotel H11), khóa ngoại `propertyId`, đủ 4 nhóm trạng thái > 0 trên chuỗi L'amour (`29` chốt, `7` quá hạn, `28` chọn nơi khác, `4` tự hủy), và phiếu đặt phòng hoàn tất có đủ ngày nhận/trả, hạng phòng đa ngôn ngữ, `guestsCount`, `netRevenueVnd` | Không mồ côi khóa ngoại, không cần regex suy đoán ngày lưu trú hay số khách |
| `TC-DATA-05` | Bất biến `hub_inbox.json`: tin nhắn khách hàng & thông báo vận hành đa ngôn ngữ (`vi`/`en`/`ko`) có `propertyId` / `scope` hợp lệ | Khớp khóa ngoại và đầy đủ bản dịch 3 ngôn ngữ |

---

## 3. Business Hotel Overview Analytics — 100% Master-Data Driven (`tests/unit/overview-analytics.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-OVW-01` | Chuỗi ngày `dailySeries` & tổng 4 nhóm trạng thái báo giá (`accepted`, `expired`, `rejected`, `cancelled`) qua mọi kỳ (`today`, `7d`, `30d`) và mọi cơ sở | Đúng số ngày (`1`/`7`/`30`), tổng doanh thu ngày = KPI doanh thu (`66.360.000 ₫` ở `all/30d`), `accepted + expired + rejected + cancelled === totalBids` |
| `TC-OVW-02` | Chuyển đổi chi nhánh cập nhật động Điểm đánh giá, Số lượt đánh giá, 5 tiêu chí & Điểm uy tín hiển thị (`eloScore`) từ `partner_hub_config.json` | `all` (`4.8`, `142`, `1680`), `br_mykhe` (`4.9`, `64`, `1720`), `br_songhan` (`4.8`, `46`, `1665`), `br_anthuong` (`4.7`, `32`, `1610`), `stay_h11` (`0.0`, `0`, `800`) |
| `TC-OVW-03` | Cơ sở mới `stay_h11` nạp 100% từ `bid_records.json` & `partner_hub_config.json` (không hardcode trong code TS) | `0 ₫` doanh thu, `75` lượt báo giá (`0` chốt, `8` quá hạn, `67` chọn nơi khác, `0` hủy), `100.0%` báo giá tự động, `0` đơn hoàn tất, `0` tin nhắn |
| `TC-OVW-04` | Kiểm duyệt ngôn ngữ Tiếng Việt thuần kinh doanh khách sạn | `0` thuật ngữ kỹ thuật nội bộ (`1.265`, `REJ_`, `settled_t_plus_7`, `checkout_hold_10m`, `RACE`, `ELO Score`, `RevPAR`, `Mô phỏng`) |
| `TC-OVW-05` | Từ điển `English` & `한국어` chuẩn cổng đối tác `Optibide Partner Hub` | Khớp chính xác tiêu đề tham chiếu (`Dashboard overview`, `Revenue Timeline`, `Bids Status`, `Ratings, Trust & Visibility`, `ELO Score`, `Recent Bookings`) |
| `TC-OVW-06` | Bảo toàn mã đơn (`#43..#71`), dịch tên cơ sở/hạng phòng/ghi chú sang `en`/`ko` & đúng số khách gia đình 4 người trên đơn `#69` (`CRQ-8938`) | Đơn `#71` luôn đứng đầu mọi kỳ; đơn `#69` có `guestsCount === 4` và không bị lỗi dịch sai thành `"2 adults"` hay dính chuỗi tiếng Việt `"Sơn Trà"` |

---

## 4. Build & TypeScript Gate (`tests/unit/build-and-typecheck.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-BUILD-01` | Kiểm tra biên dịch tĩnh `tsc --noEmit` | `0` lỗi TypeScript trên toàn bộ thư mục `src/` |

---

## 5. REST API v3.0, Lưu Trữ & Fallback Offline (`tests/e2e/api-master-data.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-API-01..05` | `GET /api/master-data` (3 bảng tinh gọn), `PUT /api/master-data/hubInbox`, chặn HTTP `400` bảng lạ / bảng cũ đã xóa (`botRules`, `hotelProfile`) / JSON lỗi & `POST /api/master-data/reset` | Đọc/ghi chính xác trên 3 bảng v3.0 và khôi phục sạch về `master-data/seed/*.json` |
| `TC-API-06..07` | Static `/master-data/partner_hub_config.json`, `/master-data/schema_manifest.json` & fallback `localStorage` (`gns_partner_hub_prefs_v1`) khi ngắt `/api/master-data` | Trang Tổng quan vẫn hiển thị đầy đủ biểu đồ/KPI và lưu tùy chọn tiền tệ/ngôn ngữ ổn định |
| `TC-API-08` | Hỗ trợ truy cập qua tên miền Tunnel (`.ts.net`, `.trycloudflare.com`) | Trả HTTP `200` cho cả giao diện và API, không bị chặn `403` |

---

## 6. Thanh Menu Trái, Tiện Ích Đầu Trang, Hộp Thư/Thông Báo, Trợ Lý AI & Phiếu Đặt Phòng (`tests/e2e/buttons-and-modals.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UI-01..03` | Thu gọn / mở rộng thanh menu trái, mở menu con *Khuyến mãi & Tiếp thị*, thông báo lịch sự cho các mục menu mở rộng | Chuyển đổi mượt `data-collapsed`, hiển thị thông báo thương mại lịch sự và giữ nguyên trang Tổng quan |
| `TC-UI-04..06` & `TC-UI-11` | Nút Trợ giúp nhanh (`?`), Popover Tin nhắn khách hàng (`hub_inbox.messages`) & Popover Chuông thông báo vận hành (`hub_inbox.notifications`) | Hiển thị tin nhắn thực từ đơn `#71`, `#69` và thông báo vận hành theo đúng cơ sở/ngôn ngữ; đóng sạch bằng click / `Escape` |
| `TC-UI-07..09` | Chú thích `(i)` trên thẻ KPI & thu gọn / mở rộng / làm mới cả 2 hộp `Trợ lý AI goodNstay` | Bật/tắt giải thích dễ hiểu trên KPI và đóng/mở gọn các thẻ lời khuyên AI |
| `TC-UI-10` | Nút `Xem chi tiết` (`View detail`) trên bảng *Đơn đặt phòng gần đây* | Mở phiếu đặt phòng `#71` đầy đủ cơ sở, hạng phòng, số khách (`2 khách`), ngày nhận/trả, tiền thực nhận và đóng mượt bằng `Escape` |

---

## 7. Luồng Nghiệp Vụ Kinh Doanh, Đa Chi Nhánh Động, Đa Ngôn Ngữ/Tiền Tệ & Phân Trang (`tests/e2e/workflows-and-rbac.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-FLOW-01..02` | Cổng kiểm duyệt ngôn ngữ thuần kinh doanh, hiển thị mặc định 29 đơn hoàn tất & nhóm *Khách sạn tự hủy* (`4` lượt) | `0` thuật ngữ kỹ thuật; đủ cả 4 nhóm trạng thái báo giá có số liệu thực |
| `TC-FLOW-03..05` & `TC-FLOW-11` | Đổi kỳ thời gian (`30d` -> `7d` -> `today`) & đổi chi nhánh (`br_mykhe` -> `br_anthuong` -> `stay_h11`) | Số đơn cập nhật `29 -> 13 -> 5`; điểm đánh giá & ELO nhảy động theo từng chi nhánh (`1680 -> 1720 -> 1610 -> 800`) |
| `TC-FLOW-06..08` & `TC-FLOW-12` | Chuyển đổi Ngôn ngữ (`vi`/`en`/`ko`) + Tiền tệ (`VND`/`KRW`/`USD`), hồ sơ người dùng động (`Nguyễn Bảo Minh` / `Kim Ha-yoon` / `김하윤`) & Phiếu đặt phòng gia đình `#69` (`4 guests`) | Đồng bộ 100% nhãn, tiền tệ, tên cơ sở tiếng Anh (`L'amour An Thuong · Ngu Hanh Son`, không sót tiếng Việt) và đúng `4 guests` |
| `TC-FLOW-09..10` | Phân trang bảng *Đơn đặt phòng gần đây* (`5` / `10` dòng/trang, `<`, `>`) & tự động kẹp về trang 1 khi thu hẹp kỳ lọc | Đang ở trang 3 (`11–15`) của kỳ 30 ngày, chuyển sang `Hôm nay` (`5` đơn) tự động đưa về `1–5` |

---

## 8. Ma Trận Responsive 7 Kích Thước Màn Hình (`tests/e2e/responsive-matrix.spec.ts`)

Kiểm thử tự động trên đủ **7 kích thước màn hình chuẩn**:
- `1440×900` (Desktop Wide)
- `1280×800` (Laptop Standard)
- `1024×768` (Tablet Landscape — ranh giới thanh menu trái cố định `lg:`)
- `768×1024` (Tablet Portrait — ngăn kéo menu di động)
- `390×844` (iPhone 14 / 15)
- `375×667` (iPhone SE)
- `360×800` (Compact Android)

**Tiêu chuẩn bắt buộc trên mọi viewport**:
1. `document.documentElement.scrollWidth <= window.innerWidth` trên cả trạng thái có đơn hoàn tất, trạng thái cơ sở mới trống đơn (`stay_h11`), popover thông báo, ngăn kéo menu di động và hộp thoại `Phiếu chi tiết đặt phòng`.
2. `>= 1024px` hiển thị thanh menu trái cố định (`sidebar-nav`); `< 1024px` chuyển sang nút mở ngăn kéo trượt (`mobile-menu-btn` -> `mobile-sidebar-drawer`).
3. `0` lỗi `console.error` và `0` lỗi `pageerror`.
