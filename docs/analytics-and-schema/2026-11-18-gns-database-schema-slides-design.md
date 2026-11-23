# [GNS] Database Schema — Team Presentation Slides Design

**Date:** 2026-11-18  
**Source Sheet:** `[GNS] Database Schema` (`1y8z02l_JBR5_qP41CV6Ex4HARZkA_SDpP64iRDma8QI`) & local mirror `[GNS] Database Schema.xlsx`  
**Presenter:** Nguyen Bao Minh (`baominh.internship@gmail.com`)  
**Target Output:** Native Google Slides deck (16:9 widescreen, 12 slides + Vietnamese Speaker Notes)

---

## 1. Intent & Why
Present the complete architecture and business value of the `[GNS] Database Schema` workbook to the entire goodNstay team (PM, Business, QA, Frontend/Backend/Data) so every member clearly understands what was built across all 6 tabs and can align on next implementation steps.

## 2. Goals, Non-Goals & Anti-Goals
- **Goals:**
  - Give every team member a crystal-clear mental model of the 6 tabs (`Sample`, `booking_form`, `offer_listing`, `explore_stays`, `payment_form`, `dashboard_overview`).
  - Explain how 45 bilingual behavioral events connect end-to-end across 4 traveler stages via 5 backbone IDs (`session_form_id`, `request_id`, `offer_id`, `property_id`, `checkout_session_id` + `view_session_id`).
  - Showcase all 16 business diagnostic groups on `dashboard_overview` and the 3-step `AI Assistance` framework (*Why a property WON vs. LOST a bid*).
  - Equip the presenter with concise Vietnamese Speaker Notes on every slide.
- **Non-Goals:**
  - Dumping all 45 event rows and hundreds of parameter definitions verbatim onto slides (the Google Sheet itself remains the row-level reference).
- **Anti-Goals:**
  - Walls of dense text, overlapping boxes, or unreadable tiny screenshots.
  - Leaking `snake_case` technical identifiers, SQL keywords (`SUM`, `COUNT`, `DISTINCT`), or hardcoded mock hotel names/prices (`Stay Hotel H11`, `L'amour`, `#69`) into business explanation cards on `dashboard_overview` slides (`AGENTS.md` §8).
  - Changing sharing permissions to public (`anyone`) without explicit user instruction.

## 3. Constraints
- **Slide Count & Aspect Ratio:** 12 slides, 16:9 (`13.333 in × 7.5 in`).
- **Language:** Natural Vietnamese prose; technical tab names, sample event names, and foreign-key identifiers shown only inside clearly demarcated technical pills/diagrams.
- **Font & Google Slides Compatibility:** Clean sans-serif (`Arial`) supported natively by Google Slides conversion without font-substitution reflow; generous line spacing and padding so Vietnamese diacritics never clip.
- **Delivery Format:** Built locally as `.pptx` (`docs/presentations/gns-database-schema/GNS_Database_Schema_Team_Walkthrough.pptx`) and imported into native Google Slides (`application/vnd.google-apps.presentation`) via `google-workspace` MCP `import_to_google_slides` on `baominh.internship@gmail.com`.

## 4. Approaches Considered
- **Approach A — Journey & Business-Value Storytelling (Selected):** 12 slides walking through the problem, the 6-tab architecture & ID backbone, the 4 traveler UI stages (with real UI screenshots + 2–3 representative events per stage), the 16 `dashboard_overview` diagnostic metrics, the `AI Assistance` Won/Lost framework, and team discussion prompts. Accessible to mixed technical and non-technical teammates.
- **Approach B — Exhaustive Technical Schema Walkthrough (Rejected):** 14–16 slides enumerating event schemas, payload types, and edge-case status codes. Too text-heavy for a cross-functional team alignment session.

## 5. Slide-by-Slide Specification (12 Slides)
1. **Slide 1 — Trang bìa:** `[GNS] Database Schema` — Hệ thống Tracking Hành trình Đặt phòng & Chẩn đoán Đấu thầu Đối tác (Tác giả, mục tiêu buổi chia sẻ, 3 con số tổng quan: `6 Tab` · `45 Sự kiện` · `16 Nhóm Chẩn đoán & AI`).
2. **Slide 2 — Bài toán & Tổng quan 6 Tab đã xây dựng:** Khoảng trống dữ liệu trước đây vs. kiến trúc 3 tầng trong Sheet (`1 Tab Khung mẫu Sample` → `4 Tab Hành trình Khách hàng` → `1 Tab Tổng hợp Kinh doanh & AI Chẩn đoán`).
3. **Slide 3 — Cấu trúc chuẩn mỗi Tab & Sợi dây liên kết dữ liệu:** Giải phẫu 9 cột chuẩn của 1 tab sự kiện (Ảnh UI thực tế + Khối Kỹ thuật + Song ngữ Anh–Việt) và luồng khóa ngoại xuyên suốt (`session_form_id` → `request_id` → `offer_id` + `property_id` → `view_session_id` → `checkout_session_id`).
4. **Slide 4 — Chặng 1: `booking_form` (12 sự kiện):** Ảnh UI thực tế (`image3.png`) + theo dõi 3 bước tạo yêu cầu (`1/3 Địa điểm`, `2/3 Ngày & Đoàn khách`, `3/3 Chỗ ở, Phòng & Tiện ích`), lỗi nhập liệu và hủy yêu cầu.
5. **Slide 5 — Chặng 2: `offer_listing` (10 sự kiện):** Ảnh UI thực tế (`image1.png`) + phân biệt hiển thị thực tế (`>=50%` trong `>=1s`), lướt ảnh/đổi gói phòng, mở so sánh giá sàn ngoài, bấm Xem / Chọn / Từ chối / Hết hạn 60 phút.
6. **Slide 6 — Chặng 3: `explore_stays` (12 sự kiện):** Ảnh ghép 2×2 sắc nét từ `image5.png` + đo chiều sâu khám phá trong cửa sổ *"Chốt Bid Ngay"* (đọc & dịch mô tả, cuộn đối chiếu, so sánh giá sàn ngoài, mở từng mục Thư viện ảnh/video & phát hiện mục trống, xem Bản đồ, đọc Đánh giá).
7. **Slide 7 — Chặng 4: `payment_form` (11 sự kiện):** Ảnh ghép cân đối từ `image4.png` + chốt chặn thanh toán 10 phút (cổng `NHN KCP` / `PayPal` / `Stripe`, tỷ giá ngoại tệ, gián đoạn phiên & cứu đơn, hoàn tất / thất bại, tải biên lai).
8. **Slide 8 — Từ 45 Sự kiện thô đến `dashboard_overview`:** Nguyên tắc chuyển hóa dữ liệu kỹ thuật sang ngôn ngữ kinh doanh dễ đọc trong 2 giây (4 cột Kỹ thuật `Main/Sub event & parameters` ↔ 4 cột Kinh doanh `Calculation`, `Meaning`, `Business value`, `AI Assistance`).
9. **Slide 9 — 16 Nhóm Chẩn đoán (Phần 1: Cung cầu, Tốc độ & Giá — Nhóm 1–8):** 8 thẻ trực quan: (1) Tổng quan thắng/trượt thầu, (2) Báo giá tự động ngoài giờ, (3) Áp lực cạnh tranh khu vực, (4) Chênh lệch giá sàn ngoài, (5) Lý do từ chối & tiện ích thiếu, (6) Độ khớp tổ hợp phòng & đa phương án, (7) Phục vụ theo nhóm khách/gia đình/thú cưng, (8) Giá sát giờ & lưu trú dài ngày.
10. **Slide 10 — 16 Nhóm Chẩn đoán (Phần 2: Hiển thị, Niềm tin & Thanh toán — Nhóm 9–16):** 8 thẻ trực quan: (9) Vị trí hiển thị & tỷ lệ bấm Xem, (10) Đường cong độ chú ý theo khung phút vàng, (11) Thư viện ảnh/video & mục trống tư liệu, (12) Cường độ cuộn đọc & dịch mô tả, (13) Vị trí bản đồ thực tế, (14) Uy tín hạng sao & đánh giá, (15) Thu tiền & cứu đơn gián đoạn, (16) Trải nghiệm theo thiết bị.
11. **Slide 11 — Điểm nhấn `AI Assistance`: Vì sao Trúng thầu vs. Không trúng thầu:** Minh họa khuôn mẫu 3 bước chuẩn hóa (`Câu hỏi kiểm tra` → `Khi trúng thầu` → `Khi không trúng thầu`) kèm 2 tình huống đối조 thực tế (Tốc độ phản hồi tự động & Chốt chặn thanh toán vạch đích).
12. **Slide 12 — Tổng kết & Thảo luận cùng cả nhóm:** Đúc kết giá trị bàn giao và 3 nhóm câu hỏi thảo luận cho Product/Business, Frontend/Backend và Data/QA.

## 6. Builder Decisions
- Palette: Light Executive Slate background (`#F8FAFC`), Deep Navy header/primary (`#0F172A` / `#1E3A8A`), Royal Blue accent (`#2563EB`), Amber highlight (`#D97706`), Won Emerald (`#059669`), Lost Coral (`#DC2626`).
- Multi-panel horizontal screenshots (`image5.png` `2681×544` and `image4.png` `1574×564`) are recomposed into balanced ~4:3 visual cards so UI details remain crisp and legible on screen.
