# Danh Mục Test Case Tự Động — Partner Auction Dashboard v2 (`tests/`)

Tài liệu này liệt kê toàn bộ các nhóm Test Case tự động bảo vệ chất lượng cho **goodNstay Partner Auction Dashboard v2**.
**Quy tắc bắt buộc**: Mỗi khi thêm tính năng mới hoặc chỉnh sửa logic/giao diện hiện có, phải chạy lại toàn bộ `npm test` và cập nhật/bổ sung mã Test Case mới vào bảng này.

---

## 1. Unit Tests — Công Thức Giá, Định Dạng Tiền Tệ, Đếm Ngược & Ngày Lưu Trú (`tests/unit/pricing-and-formatters.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UNIT-01` | Hệ số tổng giá khách trả `(1 + 15% Phí sàn) × (1 + 10% VAT)` | Bằng chính xác `1.265` (`1.000.000đ` -> `1.265.000đ`) |
| `TC-UNIT-02` | Tính tổng giá khách trả trên các bậc giá gốc KS (`850k`, `722.5k`, `1.25M`, `1.98M`, `3.2M`) | Khớp chính xác công thức `Math.round(base * 1.265)` |
| `TC-UNIT-03` | Xử lý biên `0đ` và làm tròn số nguyên VNĐ khi nhân lẻ | Trả về `0` với `0đ`, luôn là số nguyên (`Number.isInteger === true`) |
| `TC-UNIT-04` | Ghi đè `multiplier` tùy chỉnh | Tính đúng theo hệ số truyền vào |
| `TC-UNIT-05` | Tính đơn điệu nghiêm ngặt của hàm định giá | `baseA < baseB` luôn cho `guestA < guestB` |
| `TC-UNIT-06` | `formatCompactVnd` cho 3 tầng `<1M`, `1M–10M`, `>=10M` | `850k`, `1.98M`, `66.4M`, không dư `.0` |
| `TC-UNIT-07` | `formatButtonVnd` cho nút bấm báo giá nhanh | Chữ `K` in hoa dưới `1M` (`850K`) và `M` gọn từ `1M+` (`1.98M`) |
| `TC-UNIT-08` | `formatFullVnd` chuẩn `vi-VN` | Tách nhóm nghìn bằng dấu chấm `.` và hậu tố `đ` (`66.360.000đ`) |
| `TC-UNIT-10..12` | `formatCountdown` tại biên âm, `0s`, `3p` khẩn, `10p` cảnh báo, `60p` TTL | Clamping `<=0` về `00:00`, pad 2 chữ số `03:00`, `10:00`, `60:00` |
| `TC-UNIT-13..17` | `parseStayDayOffsets` cho đêm nay, nhiều đêm, qua tháng, vượt khung 14 ngày & chuỗi lỗi | Trả về mảng `dayOffset` hợp lệ nằm gọn trong `[0..13]` |

---

## 2. Master-Data Contract & Referential Integrity (`tests/unit/master-data-contract.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-DATA-01` | Tồn tại & cú pháp JSON của 11 bảng trong `master-data/seed/` và `master-data/` | Đọc & `JSON.parse` thành công 100% |
| `TC-DATA-02` | Đồng bộ ánh xạ bảng giữa `vite.config.ts` và `src/services/masterDataService.ts` | Mọi key trong `MasterDataBundle` khớp tên file ở cả API lẫn static fallback |
| `TC-DATA-03` | Bất biến `hotel_profile.json` | `30` phòng = `12 + 10 + 8` qua 3 chi nhánh, phí sàn `15%`, VAT `10%`, `urgent < warn < ttl` |
| `TC-DATA-04` | Phân quyền RBAC trong `users_roles.json` | `manager` (`canOverrideFloor=true`, `canConfigureBotRules=true`), `receptionist` (`false`, `false`) |
| `TC-DATA-05` | Hạng phòng `room_classes.json` | Tổng `4` hạng = `30` phòng, `baseFloorPrice < rackRate`, không có lỗi `##` |
| `TC-DATA-06` | Sơ đồ `rooms_pms.json` (`#101..#130`) | Đủ `30` phòng duy nhất, khóa ngoại `branchId` & `roomClassId` hợp lệ 100% |
| `TC-DATA-07` | Lịch `calendar_14d_pms.json` | Đủ `14` ngày liên tiếp (`dayOffset 0..13`), `otherBooked + auctionBooked + vacantRooms = 30` |
| `TC-DATA-08` | Phiên đấu giá `auction_sessions.json` | Mã `id` duy nhất, `matchedRoomClassId`, `branchId`, `lockedRoomNumber`, `autopsyId` hợp lệ |
| `TC-DATA-09` | Benchmark toàn sàn `system_benchmarks.json` | Đủ 3 kỳ (`today`, `7d`, `30d`) và đủ 4 hạng phòng |
| `TC-DATA-10` | Đặc quyền `perks_catalog.json` & `match_breakdowns.json` | `suggestedPerkId` luôn trỏ tới `perk.id` hợp lệ |

---

## 3. Business Logic & Analytics Engine (`tests/unit/analytics-engine.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-LOGIC-01` | Quan hệ bao hàm giữa 3 kỳ thời gian (`today <= 7d <= 30d`) | Doanh thu, số báo giá, đơn thắng và số đêm bán tăng dần không giảm |
| `TC-LOGIC-02` | Đẳng thức Doanh thu, ADR, Tổng khách trả & Phí sàn + VAT | `ADR = round(baseRevenue / nights)`, `platformFeeAndVat = guestPaidTotal - baseRevenue` |
| `TC-LOGIC-03` | Bộ lọc Chi nhánh (`all`, `br_mykhe`, `br_songhan`, `br_anthuong`) | Tổng phòng `12 + 10 + 8 = 30`; tổng doanh thu 3 chi nhánh = doanh thu toàn chuỗi |
| `TC-LOGIC-04` | Bóc tách doanh thu từng phòng (`allChainRoomRevenues`) | Đủ `30` phòng theo thứ tự `#101..#130`, tổng bằng chính xác `baseRevenue` |
| `TC-LOGIC-05` | `buildRevenueTimeSeries` (`today` 4 ca, `7d` 7 ngày, `30d` 4 tuần / 30 ngày) | Tổng doanh thu các cột thời gian khớp tuyệt đối `baseRevenue` của kỳ |
| `TC-LOGIC-06` | Chế độ Xả phòng đêm (`Night Flash Sale -15%`) | Chỉ giảm giá sàn & giá gợi ý AI cho phiên nhận phòng tối nay; phiên ngày mai trở đi giữ nguyên |
| `TC-LOGIC-07` | Hết hạn đếm ngược Live (`remainingSeconds = 0`) & trần `isAutoBidEligible` | Giảm `activeLiveCount` đúng 1 đơn vị; kiểm tra chuẩn trần số phòng & số khách |
| `TC-LOGIC-08` | Phễu chuyển đổi thanh toán 8 bước (`all`, `auto`, `manual`) | Không tăng qua từng bước (`step[i] <= step[i-1]`), `auto + manual = all` |
| `TC-LOGIC-09` | Bảo vệ phòng `booked_auction` (Đã TT 100%) trên lịch 14 ngày | `manualOverrides` khóa được phòng trống nhưng **tuyệt đối không mở khóa** được phòng đã TT 100% |
| `TC-LOGIC-10` | `resolveMatchBreakdown` | Trả đúng dữ liệu seed hoặc sinh fallback 3 tiêu chí + gợi ý `perk_bf` khi `score < 95` |
| `TC-LOGIC-11` | `computeBenchmarkTrendSeries` (Biểu đồ đường đôi & bộ lọc 4 chiều) | Đúng số mốc (`6`/`7`/`6`), đếm đúng `activeFiltersCount`, xử lý an toàn trạng thái `0` phiên |

---

## 4. Build & TypeScript Gate (`tests/unit/build-and-typecheck.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-BUILD-01` | Kiểm tra biên dịch tĩnh `tsc --noEmit` | `0` lỗi TypeScript trên toàn bộ thư mục `src/` |

---

## 5. REST API, Lưu Trữ & Fallback Offline (`tests/e2e/api-master-data.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-API-01` | `GET /api/master-data` | HTTP `200`, `ok: true`, trả đủ 11 bảng Master Data |
| `TC-API-02` | `PUT /api/master-data/botRules` | HTTP `200`, ghi xuống đĩa và đọc lại khớp dữ liệu |
| `TC-API-03` | `PUT /api/master-data/<unknown>` | HTTP `400`, từ chối bảng không hợp lệ |
| `TC-API-04` | `PUT /api/master-data/botRules` với JSON hỏng | HTTP `400`, không làm sập server |
| `TC-API-05` | `POST /api/master-data/reset` | Khôi phục nguyên vẹn 11 bảng từ `master-data/seed/*.json` |
| `TC-API-06..07` | Static `/master-data/*.json` & `localStorage` fallback khi đứt `/api/master-data` | UI vẫn khởi chạy đầy đủ và lưu thay đổi vào `gns_master_v28_*` |

---

## 6. Nút Bấm, Công Tắc, 6 Hộp Thoại KPI & Điều Hướng (`tests/e2e/buttons-and-modals.spec.ts` + `tests/*.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UI-01` | Ngăn kéo `Công thức` -> `Thu gọn` | Mở/đóng mượt, hiển thị đúng công thức ADR & `×1.265` |
| `TC-UI-02` | Dropdown chọn Chi nhánh (`Tất cả`, `CN Mỹ Khê`, `CN Sông Hàn`, `CN An Thượng`) | Cập nhật ngay số phòng `/12`, `/10`, `/8`, `/30` và KPI tương ứng |
| `TC-UI-03..04` | Công tắc `Auto-Bid`, `Xả đêm 20:00 (-15%)` & nút `Đóng` Toast | Đổi trạng thái `aria-checked`, hiện thông báo và đóng Toast sạch |
| `TC-UI-05..06` | Mở & đóng toàn bộ **6 chế độ `KpiDrilldownModal`** (`revenue_total`, `revenue_today`, `sessions_total`, `win_rate`, `rooms_occupied`, `rooms_vacant`) | Cả 6 modal hiển thị đúng dữ liệu kỳ/chi nhánh, chuyển tab con mượt, đóng bằng `Escape` |
| `TC-UI-07..10` | `MatchBreakdownModal` -> `CustomBidModal` (`Đặt theo AI`, `Hủy`) & Nhật ký phiên (`<1/N>`, tìm kiếm không dấu, 7 kiểu sắp xếp, nhảy sang `Đối chiếu phiên trượt`) | Chuyển tiếp đặc quyền chính xác, phân trang 10 dòng/trang, nhảy thẳng sang Tab 2 Autopsy |

---

## 7. Luồng Nghiệp Vụ & Phân Quyền RBAC (`tests/e2e/workflows-and-rbac.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-FLOW-01..04` | Bảo vệ Giá sàn (`Floor Guardrail`) theo `Auto-Bid ON/OFF` × vai trò `Quản lý` vs `Lễ tân` | Auto-Bid ON khóa cứng dưới sàn; Lễ tân luôn bị chặn dưới sàn; Quản lý tắt Auto-Bid + tích xác nhận mới gửi được giá dưới sàn |
| `TC-FLOW-05..08` | `Chạy Auto-Bid ngay`, mô phỏng `Từ chối` & `Khách TT 100% · Khóa phòng` | Auto-Bid gửi hàng loạt; `Từ chối` đẩy vào lịch sử trượt; `TT 100%` khóa phòng & tăng đơn thắng từ `29` lên `30` |
| `TC-FLOW-09..12` | CRUD Quy tắc Auto-Bid theo RBAC & khóa cứng phòng `Đã khóa đơn TT 100%` ở Tab 3 | Lễ tân bị `disabled` nút Lưu/Xóa quy tắc; Quản lý thêm/xóa thành công; phòng TT 100% không thể mở khóa tay |

---

## 8. Ma Trận Responsive Đa Thiết Bị (`tests/e2e/responsive-matrix.spec.ts`)

Kiểm thử tự động trên **7 kích thước màn hình chuẩn** × **3 Tab chính** × **Modal Doanh thu & Báo giá tùy chỉnh**:
- `1440×900` (Desktop Wide)
- `1280×800` (Laptop Standard)
- `1024×768` (Tablet Landscape — ranh giới `lg:`)
- `768×1024` (Tablet Portrait)
- `390×844` (iPhone 14 / 15)
- `375×667` (iPhone SE)
- `360×800` (Compact Android)

**Tiêu chuẩn bắt buộc trên mọi viewport**:
1. `document.documentElement.scrollWidth <= window.innerWidth` (Tuyệt đối không tràn ngang trên cả sơ đồ 30 phòng lẫn bảng lịch 14 ngày).
2. Breakpoint thanh điều hướng: `>= 1024px` hiển thị `topbar-branch-select`, ẩn `mobile-branch-select`; `< 1024px` hiển thị `mobile-branch-select`, ẩn `topbar-branch-select`.
3. Mọi thẻ KPI, hộp thoại (`role="dialog"`) và nút thao tác đều nằm trọn trong chiều rộng màn hình (`x >= 0`, `x + width <= viewport.width + 1`) với vùng chạm hợp lệ.
4. `0` lỗi `console.error` và `0` lỗi `pageerror`.

---

## 9. Doanh thu đơn giản & Loại bỏ Y tế / NHN KCP (`tests/dashboard-audit.spec.ts` — `TC-REV`)

| ID | Nội dung kiểm thử | Kỳ vọng |
|---|---|---|
| `TC-REV-01` | Hiển thị Doanh thu khách sạn thuần túy trên KPI Card #1 và cửa sổ `Doanh Thu Khách Sạn` | Hiện đúng tổng doanh thu kỳ (`66.360.000đ` / `29.380.000đ` / `11.850.000đ`), số đơn hoàn tất, số đêm phòng & ADR bình quân |
| `TC-REV-02` | Bộ lọc thời gian trực tiếp trong cửa sổ Doanh thu (`Theo ngày` · `Theo tuần` · `Theo tháng`) | Chuyển đổi đồng bộ dữ liệu, biểu đồ cột và danh sách đơn hoàn tất theo từng kỳ |
| `TC-REV-03` | Bộ lọc phạm vi (`Tất cả phòng` · `Từng phòng #101–#130` · `Từng chi nhánh`) | Cho phép xem gộp theo hạng phòng, chọn riêng từng buồng (VD `#116`), hoặc đối chiếu 3 chi nhánh (`CN Mỹ Khê`, `CN Sông Hàn`, `CN An Thượng`) |
| `TC-REV-04` | Đồng bộ bộ chọn Chi nhánh giữa cửa sổ Doanh thu và thanh Topbar Header | Chọn `CN Mỹ Khê` trong modal cập nhật ngay `topbar-branch-select` = `br_mykhe` trên toàn Dashboard |
| `TC-REV-05` | Kiểm tra tuyệt đối không còn thông tin y tế hay cổng NHN KCP / NHK | Toàn bộ DOM trang chính, các modal và `master-data/*.json` có `0` chuỗi `y tế`, `medical`, `KCP`, `NHN`, `NHK` |
