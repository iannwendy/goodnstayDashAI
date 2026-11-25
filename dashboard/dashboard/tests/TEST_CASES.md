# Danh Mục Test Case Tự Động — Optibide Partner Hub (`dashboard/dashboard/tests/`)

Tài liệu này liệt kê toàn bộ các nhóm Test Case tự động bảo vệ chất lượng cho **Optibide Partner Hub** (toàn bộ **8 hạng mục menu bên trái**: *Tổng quan hoạt động*, *Lịch đặt phòng*, *Đối soát doanh thu*, *Quản lý phòng*, *Quản lý báo giá*, *Tin nhắn khách hàng*, *Khuyến mãi & Tiếp thị* [`Ưu đãi giờ chót` & `Gói nâng hạng phòng`], *Đăng xuất / Đổi vai trò ca trực*) và bộ **Master Data v4.0** (7 bảng JSON đồng bộ 2 chiều: `partner_hub_config.json`, `bid_records.json`, `hub_inbox.json`, `room_inventory.json`, `payout_ledgers.json`, `bidding_operations.json`, `marketing_campaigns.json` + `schema_manifest.json`).  
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

## 2. Master-Data v4.0 Contract & Cross-Table Referential Integrity (`tests/unit/master-data-contract.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-DATA-01` | Kiểm tra đủ **7 bảng JSON Master Data v4.0** + `schema_manifest.json` (`4.0.0`) tại `master-data/` & `master-data/seed/`; cấm 12 file thừa v2.7 | Đồng bộ 100% giữa `master-data/` và `master-data/seed/`, `0` file rác cũ tồn tại |
| `TC-DATA-02` | Đồng bộ ánh xạ 7 bảng giữa `vite.config.ts` (`TABLE_FILE_MAP`) và `src/services/masterDataService.ts` (`STATIC_TABLE_PATHS`) | Khớp 100% cả 7 khóa (`hubConfig`, `bidRecords`, `hubInbox`, `roomInventory`, `payoutLedgers`, `biddingOperations`, `marketingCampaigns`) |
| `TC-DATA-03` | Bất biến `partner_hub_config.json`: thương hiệu `Optibide`, tỷ giá `currencyRates`, hồ sơ `partnerUser` + 5 hồ sơ phân quyền `staffProfiles` (`USR-PARTNER-01`, `USR-MGR-MYKHE`, `USR-MGR-SONGHAN`, `USR-STAFF-02`, `USR-MGR-H11`) kèm `allowedBranchIds`/`canViewChainAll`/`canViewFinancials`/`canManagePricing`, 4 cơ sở (`br_mykhe`, `br_songhan`, `br_anthuong`, `stay_h11`), tổng phòng chuỗi `30 = 12+10+8`, tổng `previousPeriodRevenueVnd` khớp chính xác 3 chi nhánh | Toàn vẹn cấu hình, phân quyền 5 tài khoản `user_id × branch_id` & toán học 100% (`9.8M`, `25.2M`, `54.6M`) |
| `TC-DATA-04` | Bất biến `bid_records.json`: `143` bản ghi (`68` chuỗi L'amour + `75` Stay Hotel H11), đủ 4 nhóm trạng thái > 0 trên chuỗi L'amour, và 29 đơn hoàn tất (`#43..#71`) gắn khóa ngoại `roomTypeId`, `payoutBatchId`, `guestFullName`, `guestPhone`, `stayStatus` | Không mồ côi khóa ngoại chéo sang `room_inventory` & `payout_ledgers` |
| `TC-DATA-05` | Bất biến `hub_inbox.json`: luồng hội thoại 2 chiều `thread`, mẫu phản hồi nhanh lễ tân `quickReplies` & thông báo vận hành đa ngôn ngữ (`0` tin nhắn khách trên `stay_h11`) | Đầy đủ bản dịch `vi`/`en`/`ko` cho từng lượt tin nhắn |
| `TC-DATA-06` | Bất biến `room_inventory.json`: `15` hạng phòng & `48` phòng vật lý (`#101..#130`, `#201..#218`) khớp chính xác `roomsCount` từng cơ sở (`12+10+8+18`), khóa ngoại `activeBookingCode` & `calendarBlocks` hợp lệ | Không trùng số phòng vật lý, giá sàn bảo vệ `<=` giá niêm yết |
| `TC-DATA-07` | Bất biến `payout_ledgers.json`: `4` tài khoản ngân hàng đã xác thực & `12` kỳ sao kê đối soát gom đúng 1-1 toàn bộ `29` đơn `#43..#71` | Tổng tiền thực nhận các kỳ sao kê bằng chính xác `66.360.000 ₫` |
| `TC-DATA-08` | Bất biến `bidding_operations.json`: hàng đợi yêu cầu đặt phòng trực tiếp (bao gồm yêu cầu mở hàng cho `stay_h11`) & quy tắc Báo giá tự động 24/7 khớp `autoBidEnabled` từng cơ sở | Đầy đủ thông tin ngân sách khách đề xuất & giá sàn bảo vệ |
| `TC-DATA-09` | Bất biến `marketing_campaigns.json`: chiến dịch *Ưu đãi giờ chót* (`flashDeals`) & *Gói nâng hạng / Dịch vụ cộng thêm* (`upsellOffers`) trên cả 4 cơ sở | `dealRateVnd < originalRateVnd`, đầy đủ bản dịch `vi`/`en`/`ko` |
| `TC-DATA-10` | Bất biến `schema_manifest.json` (`eventSheetsMetadata` & ánh xạ bảng): đối chiếu đủ 4 sheets (`booking_form`, `offer_listing`, `explore_stays`, `payment_form` = `45` events) vào 7 bảng Master Data | `mappedSheets`, `sourceEvents` & `mappedParameters` đầy đủ 100% trên cả 7 bảng, đồng bộ `seed/` |
| `TC-DATA-11` | Toàn vẹn `telemetry` 4-sheet trên `143` `bid_records`, `marketplaceIdentity` (4 cơ sở), `catalogMapping` (15 hạng phòng), `settlementBreakdown` (12 kỳ sao kê) & Distribution Curve (`browse_elapsed_sec_list`) | Khớp 100% công thức `GMV = base_price + 15% phí sàn + 10% VAT` (`66.360.000 ₫` giá gốc đối tác), `browse_click_count === browse_elapsed_sec_list.length` |

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

## 4. Left-Menu Business Modules Analytics & Localization (`tests/unit/hub-modules-analytics.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-MOD-01` | `buildCalendarModuleViewModel` cho sơ đồ phòng theo ngày (`7` ngày / `14` ngày / tuần trước) & bảng lễ tân đón khách qua `all`, `br_mykhe`, `stay_h11` | `30` phòng chuỗi (`12` tại Mỹ Khê, `18` tại `stay_h11` công suất `0%`), ánh xạ chính xác đơn `#71` vào phòng `#116` |
| `TC-MOD-02` | `buildPayoutModuleViewModel` đối soát doanh thu thực nhận, tài khoản ngân hàng & sao kê từng kỳ | Tổng đối soát chuỗi khớp `66.360.000 ₫` (`paid + processing + upcoming === total`); `stay_h11` có tài khoản ngân hàng xác thực sẵn sàng nhận đơn đầu tiên |
| `TC-MOD-03` | `buildRoomsModuleViewModel` phân loại trạng thái buồng phòng (`ready`, `occupied`, `dirty`, `maintenance`) & hạng phòng | Tổng 4 nhóm trạng thái = `30` phòng chuỗi (`12` hạng phòng) và `18` phòng `stay_h11` (`3` hạng phòng, `0` phòng đang ở) |
| `TC-MOD-04` | `buildBiddingModuleViewModel` hàng đợi yêu cầu trực tiếp, quy tắc AutoBid 24/7 & tỷ lệ chốt lịch sử | Tách chuẩn lượt `waiting_offer` / `offer_sent`; `stay_h11` có `2` yêu cầu đang chờ báo giá để chốt đơn mở hàng |
| `TC-MOD-05` | `buildMessagesModuleViewModel` & `buildMarketingModuleViewModel` đa ngôn ngữ (`vi`/`en`/`ko`) & đa tiền tệ (`VND`/`KRW`/`USD`) | Không rò rỉ chuỗi tiếng Việt (`"Đà Nẵng"`, `"khách"`) sang chế độ tiếng Anh / tiếng Hàn |
| `TC-MOD-06` | Kiểm duyệt từ điển các phân hệ menu bên trái `getModulesDictionary("vi")` | `100%` ngôn ngữ thuần kinh doanh khách sạn, `0` thuật ngữ kỹ thuật nội bộ |

---

## 5. Multi-Tenant RBAC Scoping Unit Tests (`tests/unit/rbac-scoping.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-RBAC-01` | Giải mã 5 hồ sơ `staffProfiles` (`USR-PARTNER-01`, `USR-MGR-MYKHE`, `USR-MGR-SONGHAN`, `USR-STAFF-02`, `USR-MGR-H11`) và cờ quyền `allowedBranchIds` / `canViewChainAll` / `canViewFinancials` / `canManagePricing` | Khớp 100% phạm vi chi nhánh và cờ che tài chính / khóa báo giá từng tài khoản |
| `TC-RBAC-02` | `filterPropertiesForProfile` lọc danh sách cơ sở trên dropdown chọn khách sạn theo đúng `allowedBranchIds` của từng tài khoản | Quản lý chi nhánh / Lễ tân chỉ thấy đúng 1 chi nhánh được giao (ẩn `"all"` và chi nhánh khác); Chủ chuỗi thấy đủ `all` + 4 cơ sở |
| `TC-RBAC-03` | `clampPropertyKeyForProfile` & `deriveNextPropertyKeyOnUserSwitch` kẹp ngữ cảnh khi đổi tài khoản liên hoàn | Chuyển `USR-PARTNER-01 -> USR-MGR-MYKHE -> USR-MGR-SONGHAN -> USR-MGR-H11 -> USR-PARTNER-01` luôn tự kẹp `all -> br_mykhe -> br_songhan -> stay_h11 -> all` |

---

## 6. Build & TypeScript Gate (`tests/unit/build-and-typecheck.test.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-BUILD-01` | Kiểm tra biên dịch tĩnh `tsc --noEmit` | `0` lỗi TypeScript trên toàn bộ thư mục `src/` |

---

## 6. REST API v4.0 (7 Bảng), Lưu Trữ & Fallback Offline (`tests/e2e/api-master-data.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-API-01..05` | `GET /api/master-data` (7 bảng v4.0), `PUT /api/master-data/hubInbox` & `/roomInventory`, chặn HTTP `400` bảng lạ / bảng cũ đã xóa (`botRules`, `hotelProfile`) / JSON lỗi & `POST /api/master-data/reset` | Đọc/ghi bền vững trên 7 bảng Master Data v4.0 và khôi phục sạch về `master-data/seed/*.json` |
| `TC-API-06..07` | Static `/master-data/*.json` v4.0, `/master-data/schema_manifest.json` & fallback `localStorage` khi ngắt `/api/master-data` | Cả trang Tổng quan và các phân hệ menu trái vẫn nạp đầy đủ từ static JSON và lưu tùy chọn ổn định |
| `TC-API-08` | Hỗ trợ truy cập qua tên miền Tunnel (`.ts.net`, `.trycloudflare.com`) | Trả HTTP `200` cho cả giao diện và API, không bị chặn `403` |

---

## 7. Thanh Menu Trái, Tiện Ích Đầu Trang, Hộp Thư/Thông Báo, Trợ Lý AI & Phiếu Đặt Phòng (`tests/e2e/buttons-and-modals.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-UI-01..03` | Thu gọn / mở rộng thanh menu trái, mở menu con *Khuyến mãi & Tiếp thị*, điều hướng thực sang *Lịch đặt phòng* và quay về *Tổng quan* | Chuyển đổi mượt `data-collapsed` và điều hướng trực tiếp giữa các phân hệ |
| `TC-UI-04..06` & `TC-UI-11` | Nút Trợ giúp nhanh (`?`), Popover Tin nhắn khách hàng (`hub_inbox.messages`) & Popover Chuông thông báo vận hành (`hub_inbox.notifications`) | Hiển thị tin nhắn thực từ đơn `#71`, `#69` và thông báo vận hành theo đúng cơ sở/ngôn ngữ; đóng sạch bằng click / `Escape` |
| `TC-UI-07..09` | Chú thích `(i)` trên thẻ KPI & thu gọn / mở rộng / làm mới cả 2 hộp `Trợ lý AI goodNstay` | Bật/tắt giải thích dễ hiểu trên KPI và đóng/mở gọn các thẻ lời khuyên AI |
| `TC-UI-10` | Nút `Xem chi tiết` (`View detail`) trên bảng *Đơn đặt phòng gần đây* | Mở phiếu đặt phòng `#71` đầy đủ cơ sở, hạng phòng, số khách (`2 khách`), ngày nhận/trả, tiền thực nhận và đóng mượt bằng `Escape` |

---

## 8. E2E Toàn Bộ Các Phân Hệ Menu Bên Trái & Đồng Bộ Metadata Thực (`tests/e2e/left-menu-modules.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-LEFT-01` | **Lịch đặt phòng (`calendar`)**: Đổi khung lịch `7d`/`14d`, bấm ô phòng `#116` ngày `06/11` mở phiếu đơn `#71`, bấm ô trống `#101` ngày `09/11` khóa phòng khách lẻ & mở khóa lại | Ghi trực tiếp vào `room_inventory.json` (`calendarBlocks`) qua REST API |
| `TC-LEFT-02` | **Đối soát doanh thu (`payout`)**: Kiểm tra tổng `+66,4tr ₫`, xem bảng kê chi tiết kỳ `STL-MK-11B`, yêu cầu rút tiền sớm (`upcoming -> processing`), cập nhật số tài khoản ngân hàng & kiểm tra trạng thái `stay_h11` | Lưu bền vững vào `payout_ledgers.json` |
| `TC-LEFT-03` | **Quản lý phòng (`rooms`)**: Lọc phòng chờ dọn, xác nhận phòng `#101` đã dọn sạch (`dirty -> ready`), chỉnh sửa giá sàn bảo vệ hạng phòng `RT-MK-DLX` | Đồng bộ trực tiếp vào `room_inventory.json` |
| `TC-LEFT-04` | **Quản lý báo giá (`bidding`)**: Gửi báo giá cạnh tranh cho yêu cầu `REQ-9018` (`waiting_offer -> offer_sent`), bỏ qua `REQ-9017`, chỉnh giá sàn & bật/tắt quy tắc AutoBid 24/7, kiểm tra yêu cầu mở hàng tại `stay_h11` | Đồng bộ vào `bidding_operations.json` & `partner_hub_config.json`, giảm badge đếm trên menu |
| `TC-LEFT-05` | **Tin nhắn khách hàng (`messages`)**: Mở hội thoại `MSG-01` (`#71`), xem phiếu đặt phòng liên kết, chèn mẫu phản hồi nhanh `QR-PARKING` & gửi tin nhắn cho khách | Ghi lượt trả lời mới vào `hub_inbox.json`, chuyển trạng thái `replied` & giảm số tin chưa đọc |
| `TC-LEFT-06` | **Khuyến mãi & Tiếp thị (`marketing_deals` & `marketing_upsell`)**: Tạo mới *Ưu đãi giờ chót* và tạo mới *Gói nâng hạng / Dịch vụ cộng thêm* qua submenu bên trái | Lưu trực tiếp vào `marketing_campaigns.json` và hiển thị ngay trên lưới chiến dịch |
| `TC-LEFT-07` | **Đăng xuất & Bàn giao ca trực RBAC (`logout`)**: Đổi vai trò sang `Lễ tân ca trực` (`receptionist`) -> chặn sửa tài khoản ngân hàng & giá sàn với thông báo lịch sự; đổi lại `Quản lý` -> Đăng xuất ra màn hình khóa ca & Đăng nhập lại | Phân quyền nghiệp vụ chuẩn xác giữa Quản lý và Lễ tân |
| `TC-LEFT-08` | **Đa ngôn ngữ (`en` + `KRW`, `ko` + `USD`) trên các phân hệ menu trái** | Đổi sang tiếng Anh (`₩`) và tiếng Hàn (`$`) đồng bộ 100%, không rò rỉ nhãn tiếng Việt |

---

## 9. Luồng Nghiệp Vụ Trang Tổng Quan, Đa Chi Nhánh Động & Phân Trang (`tests/e2e/workflows-and-rbac.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-FLOW-01..02` | Cổng kiểm duyệt ngôn ngữ thuần kinh doanh, hiển thị mặc định 29 đơn hoàn tất & nhóm *Khách sạn tự hủy* (`4` lượt) | `0` thuật ngữ kỹ thuật; đủ cả 4 nhóm trạng thái báo giá có số liệu thực |
| `TC-FLOW-03..05` & `TC-FLOW-11` | Đổi kỳ thời gian (`30d` -> `7d` -> `today`) & đổi chi nhánh (`br_mykhe` -> `br_anthuong` -> `stay_h11`) | Số đơn cập nhật `29 -> 13 -> 5`; điểm đánh giá & ELO nhảy động theo từng chi nhánh (`1680 -> 1720 -> 1610 -> 800`) |
| `TC-FLOW-06..08` & `TC-FLOW-12` | Chuyển đổi Ngôn ngữ (`vi`/`en`/`ko`) + Tiền tệ (`VND`/`KRW`/`USD`), hồ sơ người dùng động & Phiếu đặt phòng gia đình `#69` (`4 guests`) | Đồng bộ 100% nhãn, tiền tệ, tên cơ sở tiếng Anh và đúng `4 guests` |
| `TC-FLOW-09..10` | Phân trang bảng *Đơn đặt phòng gần đây* (`5` / `10` dòng/trang, `<`, `>`) & tự động kẹp về trang 1 khi thu hẹp kỳ lọc | Đang ở trang 3 (`11–15`) của kỳ 30 ngày, chuyển sang `Hôm nay` (`5` đơn) tự động đưa về `1–5` |

---

## 10. Ma Trận Responsive 7 Kích Thước Màn Hình × Toàn Bộ Menu Bên Trái (`tests/e2e/responsive-matrix.spec.ts`)

Kiểm thử tự động trên đủ **7 kích thước màn hình chuẩn**:
- `1440×900` (Desktop Wide)
- `1280×800` (Laptop Standard)
- `1024×768` (Tablet Landscape — ranh giới thanh menu trái cố định `lg:`)
- `768×1024` (Tablet Portrait — ngăn kéo menu di động)
- `390×844` (iPhone 14 / 15)
- `375×667` (iPhone SE)
- `360×800` (Compact Android)

## 11. Live BigQuery Viewport, 6-Layer Cost Guard & 5-Profile RBAC E2E (`tests/e2e/bigquery-live-and-rbac.spec.ts`)

| Mã TC | Mô tả kiểm thử | Kỳ vọng chuẩn |
| :--- | :--- | :--- |
| `TC-BQ-01` | Mở mục `Kho BigQuery` (`nav-item-bigquery`) dưới tài khoản `USR-PARTNER-01`, kiểm tra số liệu sống từ `aevo-512307`, bảng 6 lớp chặn chi phí, bộ 3 biểu đồ ngày của CTO (đổi ống kính `Offer Funnel ↔ Booking Form`), phễu GA4 8 bước và nút `Truy vấn trực tiếp` | Hiển thị chính xác `66.360.000 ₫`, badge `aevo-512307`, telemetry `ms` / `Cache`, `0` lỗi console |
| `TC-BQ-02` | Đổi sang Quản lý Mỹ Khê (`USR-MGR-MYKHE`), xác nhận bộ chọn cơ sở khóa cứng `br_mykhe`, doanh thu cập nhật `28.290.000 ₫` và bấm nút `Kiểm thử chặn chéo chi nhánh (403)` | BFF chặn chéo chi nhánh thành công và hiển thị trực quan `HTTP 403 · FORBIDDEN_BRANCH_SCOPE (target: br_songhan)` |
| `TC-BQ-03` | Đổi sang Lễ tân ca trực (`USR-STAFF-02`), xác nhận khóa cứng `br_mykhe` và che số liệu tài chính cả từ BigQuery SQL lẫn giao diện | Hiển thị `Đã che số tiền` và `•••••• ₫ (Đã che)` trên thẻ doanh thu |
| `TC-BQ-04` | Chuyển đổi Bộ chuyển nguồn toàn cục (`Local JSON ↔ BigQuery`) ngay trên trang Tổng quan và kết hợp đổi tài khoản (`USR-PARTNER-01` -> `USR-MGR-MYKHE` -> `USR-STAFF-02` -> khôi phục `Local JSON`) | Tổng quan nạp trực tiếp bundle scoped từ BigQuery BFF (`28.290.000 ₫` / `•••••• ₫ (Đã che)`) và quay về `Local JSON` (`66.360.000 ₫`) sạch sẽ |
| `TC-BQ-05` | Đổi sang Quản lý Stay Hotel H11 (`USR-MGR-H11`) trên `Kho BigQuery` | Bộ chọn cơ sở khóa cứng `stay_h11`, hiển thị `0 ₫` và `0 / 75 bids` từ BigQuery |

---

**Tiêu chuẩn bắt buộc trên mọi viewport**:
1. `document.documentElement.scrollWidth <= window.innerWidth` trên **trang Tổng quan** (cả có đơn & `stay_h11` trống đơn), **toàn bộ 8 màn hình phân hệ menu trái** (`Calendar`, `Payout`, `Rooms`, `Bidding`, `Messages`, `BigQuery Live`, `Marketing Deals`, `Marketing Upsell`), thanh chuyển nguồn `Local JSON ↔ BigQuery`, popover thông báo, ngăn kéo menu di động và `BookingDetailModal`.
2. `>= 1024px` hiển thị thanh menu trái cố định (`sidebar-nav`); `< 1024px` chuyển sang nút mở ngăn kéo trượt (`mobile-menu-btn` -> `mobile-sidebar-drawer`).
3. `0` lỗi `console.error` và `0` lỗi `pageerror`.
