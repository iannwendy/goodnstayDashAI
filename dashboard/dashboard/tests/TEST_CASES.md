# Danh Mục Test Case Tự Động — Optibide Partner Hub (`dashboard/dashboard/tests/`)

Tài liệu này liệt kê toàn bộ các nhóm Test Case tự động bảo vệ chất lượng cho **Optibide Partner Hub — Dashboard Overview** (giao diện quản lý khách sạn thương mại dành cho người dùng thuần kinh doanh).  
**Quy tắc bắt buộc**: Mỗi khi thêm tính năng mới hoặc chỉnh sửa logic/giao diện hiện có, phải chạy lại toàn bộ `npm test` + `npm run build` và cập nhật danh mục mã Test Case vào tài liệu này.

---

## 1. Unit Tests — Công Thức Giá, Định Dạng Tiền Tệ, Đếm Ngược & Ngày Lưu Trú (`tests/unit/pricing-and-formatters.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UNIT-01..05` | Công thức nền `calcGuestTotalFromBase` (`1.265`), biên `0đ`, làm tròn nguyên & tính đơn điệu | Tính chính xác và bảo toàn thứ tự đơn điệu |
| `TC-UNIT-06..09` | Bộ định dạng tiền VNĐ (`formatCompactVnd`, `formatButtonVnd`, `formatFullVnd`) | Hiển thị chuẩn dấu chấm phân nhóm hàng nghìn và đơn vị |
| `TC-UNIT-10..12` | `formatCountdown` tại biên âm, `0s`, `3p`, `10p`, `60p` | Clamping `<=0` về `00:00`, pad đủ 2 chữ số |
| `TC-UNIT-13..17` | `parseStayDayOffsets` qua ranh giới tháng và khung 14 ngày | Trả về mảng `dayOffset` hợp lệ nằm gọn trong `[0..13]` |

---

## 2. Master-Data Contract & Referential Integrity (`tests/unit/master-data-contract.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-DATA-01..02` | Đầy đủ 12 bảng JSON trong `master-data/seed/` & `master-data/` và đồng bộ đường dẫn với `vite.config.ts` / `masterDataService.ts` | Parse sạch 100%, khớp ánh xạ REST API & static fallback |
| `TC-DATA-03..11` | Bất biến `hotel_profile` (30 phòng = `12+10+8`), `users_roles`, `room_classes`, `rooms_pms` (`#101..#130`), `calendar_14d_pms`, `auction_sessions`, `system_benchmarks`, `perks_catalog`, `lifecycle_catalog` | Toàn vẹn khóa ngoại & ràng buộc số học 100% |

---

## 3. Core Analytics Engine (`tests/unit/analytics-engine.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-LOGIC-01..12` | Động cơ tổng hợp nền theo kỳ (`today <= 7d <= 30d`), chi nhánh, từng phòng, chuỗi thời gian, giá sàn đêm và lịch 14 ngày | Đảm bảo tính nhất quán dữ liệu nền cho toàn bộ báo cáo |

---

## 4. Business Hotel Overview Analytics, Đa Ngôn Ngữ & Đa Tiền Tệ (`tests/unit/overview-analytics.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-OVW-01` | Quy đổi `convertFromVnd` & định dạng `formatBusinessMoney` / `formatDisplayDate` qua `VND`, `KRW`, `USD` và `vi`, `en`, `ko` | Biên `0` hiển thị `0 ₫` / `0 ₩` / `$0`; số dương compact có dấu `+`; ngày hiển thị đúng chuẩn từng ngôn ngữ, không có `NaN` |
| `TC-OVW-02` | Chuỗi ngày `dailySeries` & tổng 4 nhóm trạng thái báo giá (`accepted`, `expired`, `rejected`, `cancelled`) qua mọi kỳ (`today`, `7d`, `30d`) và mọi cơ sở L'amour | Đúng số ngày (`1`/`7`/`30`), tổng doanh thu ngày = KPI doanh thu, tổng đơn ngày = số đơn hoàn tất (`29` đơn ở `all/30d`), `accepted + expired + rejected + cancelled === totalBids` |
| `TC-OVW-03` | Cơ sở mới `stay_h11` (khớp `demo_new/1.png`) & biên `0` lượt báo giá | Trả về `0` doanh thu, `75` lượt báo giá (`0` chốt, `8` quá hạn, `67` chọn nơi khác, `0` hủy), điểm đánh giá `0.0`, điểm hiển thị `800`, `0` đơn đặt phòng và tuyệt đối không phát sinh `NaN` / `Infinity` |
| `TC-OVW-04` | Kiểm tra ngôn ngữ Tiếng Việt thuần kinh doanh khách sạn | Dùng nhãn đời thường (*Doanh thu thực nhận*, *Tỷ lệ khách chốt*, *Điểm uy tín hiển thị*); `0` thuật ngữ kỹ thuật nội bộ (`1.265`, `REJ_`, `settled_t_plus_7`, `RACE`, `ELO Score`, `RevPAR`, `Mô phỏng`) |
| `TC-OVW-05` | Từ điển `English` & `한국어` chuẩn cổng đối tác khách sạn | Khớp chính xác tiêu đề tham chiếu `Optibide Partner Hub` (`Dashboard overview`, `Revenue Timeline`, `Bids Status`, `Ratings, Trust & Visibility`, `ELO Score`, `Recent Bookings`) |
| `TC-OVW-06` | Bảo toàn mã đơn đặt phòng toàn chuỗi (`#43..#71`) & dịch thuật ghi chú/tiện ích theo ngôn ngữ | Đơn mới nhất giữ nguyên mã `#71` dù lọc `today`/`7d`/`30d` hay lọc riêng từng chi nhánh; tiện ích & ghi chú khách lưu trú dịch chuẩn sang `en` và `ko` |

---

## 5. Build & TypeScript Gate (`tests/unit/build-and-typecheck.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-BUILD-01` | Kiểm tra biên dịch tĩnh `tsc --noEmit` | `0` lỗi TypeScript trên toàn bộ thư mục `src/` |

---

## 6. REST API, Lưu Trữ & Fallback Offline (`tests/e2e/api-master-data.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-API-01..05` | `GET /api/master-data`, `PUT /api/master-data/botRules`, chặn HTTP `400` bảng lạ / JSON lỗi & `POST /api/master-data/reset` | Hoạt động chính xác và khôi phục sạch về `master-data/seed/*.json` |
| `TC-API-06..07` | Static `/master-data/*.json` & `localStorage` (`gns_partner_hub_prefs_v1`) khi ngắt kết nối `/api/master-data` | Trang Tổng quan vẫn hiển thị đầy đủ biểu đồ/KPI và lưu tùy chọn tiền tệ/ngôn ngữ ổn định |
| `TC-API-08` | Hỗ trợ truy cập qua tên miền Tunnel (`.ts.net`, `.trycloudflare.com`) | Trả HTTP `200` cho cả giao diện và API, không bị chặn `403` |

---

## 7. Thanh Menu Trái, Tiện Ích Đầu Trang, Trợ Lý AI & Phiếu Đặt Phòng (`tests/e2e/buttons-and-modals.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UI-01..03` | Thu gọn / mở rộng thanh menu trái (`1.png` <-> `2.png`), mở menu con *Khuyến mãi & Tiếp thị*, thông báo lịch sự cho các mục menu phụ | Chuyển đổi mượt `data-collapsed`, hiển thị thông báo thương mại lịch sự và giữ nguyên trang Tổng quan |
| `TC-UI-04..06` | Nút Trợ giúp nhanh (`?`) 30 giây & Popover Chuông thông báo vận hành | Mở/đóng hộp thoại hướng dẫn ngôn ngữ đời thường và danh sách thông báo sạch bằng `Escape` / click |
| `TC-UI-07..09` | Chú thích `(i)` trên thẻ KPI & thu gọn / mở rộng / làm mới cả 2 hộp `Trợ lý AI goodNstay` | Bật/tắt giải thích dễ hiểu trên KPI và đóng/mở gọn các thẻ lời khuyên AI |
| `TC-UI-10` | Nút `Xem chi tiết` (`View detail`) trên bảng *Đơn đặt phòng gần đây* | Mở phiếu đặt phòng `#71` đầy đủ thông tin cơ sở, hạng phòng, ngày nhận/trả, tiền thực nhận và đóng mượt bằng `Escape` |

---

## 8. Luồng Nghiệp Vụ Kinh Doanh, Đa Ngôn Ngữ/Tiền Tệ & Phân Trang (`tests/e2e/workflows-and-rbac.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-FLOW-01..02` | Cổng kiểm duyệt ngôn ngữ thuần kinh doanh & hiển thị mặc định toàn chuỗi 30 ngày | Không xuất hiện chuỗi kỹ thuật/giả lập trên toàn bộ trang; hiển thị đúng 29 đơn hoàn tất |
| `TC-FLOW-03..05` | Đổi kỳ thời gian (`30d` -> `7d` -> `today`) & đổi cơ sở sang `Stay Hotel H11 (Cơ sở mới)` | Cập nhật đúng số đơn (`29` -> `13` -> `5`); cơ sở `Stay Hotel H11` hiển thị đúng trạng thái `1.png` (`0 ₫`, `75` báo giá, `★0.0`, điểm hiển thị `800`, khung trống *Chưa có đơn đặt phòng gần đây*) |
| `TC-FLOW-06..08` | Chuyển đổi trực tiếp Ngôn ngữ (`Tiếng Việt` / `English` / `한국어`) & Tiền tệ (`VND` / `KRW` / `USD`) | Đồng bộ ngay lập tức toàn bộ tiêu đề, nhãn biểu đồ, hộp cố vấn AI và ký hiệu tiền tệ (`₫`, `₩`, `$`) |
| `TC-FLOW-09..10` | Phân trang bảng *Đơn đặt phòng gần đây* (`5` / `10` dòng/trang, `<`, `>`) & tự động kẹp về trang 1 khi thu hẹp kỳ lọc | Đang ở trang 3 (`11–15`) của kỳ 30 ngày, chuyển sang `Hôm nay` (`5` đơn) tự động đưa về `1–5`, không bao giờ rơi vào trang rỗng |

---

## 9. Ma Trận Responsive 7 Kích Thước Màn Hình (`tests/e2e/responsive-matrix.spec.ts`)

Kiểm thử tự động trên đủ **7 kích thước màn hình chuẩn**:
- `1440×900` (Desktop Wide)
- `1280×800` (Laptop Standard)
- `1024×768` (Tablet Landscape — ranh giới thanh menu trái cố định `lg:`)
- `768×1024` (Tablet Portrait — ngăn kéo menu di động)
- `390×844` (iPhone 14 / 15)
- `375×667` (iPhone SE)
- `360×800` (Compact Android)

**Tiêu chuẩn bắt buộc trên mọi viewport**:
1. `document.documentElement.scrollWidth <= window.innerWidth` trên cả trạng thái có đơn hoàn tất, trạng thái cơ sở mới trống đơn (`stay_h11`), ngăn kéo menu di động và hộp thoại `Phiếu chi tiết đặt phòng`.
2. `>= 1024px` hiển thị thanh menu trái cố định (`sidebar-nav`); `< 1024px` chuyển sang nút mở ngăn kéo trượt (`mobile-menu-btn` -> `mobile-sidebar-drawer`).
3. `0` lỗi `console.error` và `0` lỗi `pageerror`.
