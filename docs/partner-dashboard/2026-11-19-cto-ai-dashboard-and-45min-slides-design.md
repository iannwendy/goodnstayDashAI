# Thiết Kế Bộ Slide Thuyết Trình 45 Phút Với CTO & Bản HTML AI Dashboard Mẫu (`[GNS] Database Schema` → `Optibide Partner Hub`)

**Ngày lập:** 2026-11-19  
**Người trình bày:** Nguyễn Bảo Minh (`baominh.internship@gmail.com`)  
**Đối tượng nghe & ra quyết định:** CTO và đội ngũ Sản phẩm / Kỹ thuật / Dữ liệu goodNstay (Thời lượng: **45 phút**)  
**Nguồn dữ liệu chuẩn:** Google Sheet `[GNS] Database Schema` (`1y8z02l_JBR5_qP41CV6Ex4HARZkA_SDpP64iRDma8QI` — 6 tabs, 45 sự kiện hành vi, 66 dòng chỉ số & ngưỡng AI trên `dashboard_overview`) + ảnh hiện trạng `dashboard/demo_new/1.png`, `2.png` + ảnh chụp UI gốc trong `[GNS] Database Schema.xlsx`.

---

## 1. Mục Đích & Lý Do (Intent & Why)

Buổi thuyết trình 45 phút với CTO không nhằm đọc lại bảng mô tả sự kiện khô khan, mà nhằm **chốt thiết kế phần Phân tích & AI Chẩn đoán trên Partner Dashboard (`Optibide Partner Hub`)**, dẫn dắt bằng chuỗi **bằng chứng hình ảnh khoanh vùng trực quan (Visual Evidence)** từ giao diện thực tế → cách rút trích dữ liệu trên Google Sheet → bản **HTML Dashboard mẫu có biểu đồ hoạt động thật**.

Kết thúc 45 phút, CTO và cả nhóm cần chốt được câu trả lời rõ ràng, có cơ sở dữ liệu cho **3 câu hỏi lớn**:
1. **Phân tích Giá trúng thầu:** Có bao nhiêu góc nhìn và bộ câu hỏi cốt lõi để biết mức giá nào thực sự giúp cơ sở lưu trú thắng thầu tối ưu?
2. **Tại sao Không trúng thầu:** Có bao nhiêu góc nhìn và tầng nguyên nhân thực tế làm rớt đơn (thay vì gom mù mờ vào một con số *Rejected 80%* rồi đoán mò là do giá cao)?
3. **Chọn lọc dữ liệu & Thể hiện lên Biểu đồ:** Giữa 45 sự kiện và 66 dòng chỉ số trên Sheet, chọn lọc theo tiêu chí nào để đưa đúng số liệu đắt giá nhất lên biểu đồ cho chủ khách sạn mà không gây ngợp, phần nào chạy ngầm cho AI Advisor, phần nào giữ cho vận hành nội bộ?

---

## 2. Mục Tiêu, Ngoài Phạm Vi & Điều Cấm Kỵ (Goals, Non-Goals & Anti-Goals)

### Mục tiêu (Goals)
1. **Bản HTML AI Dashboard Mẫu (`docs/presentations/cto-ai-dashboard-proposal/ai-dashboard-proposal.html`)**:
   - Độc lập (standalone HTML/CSS/JS, mở chạy mượt ngay trên trình duyệt không cần cài server), kế thừa đúng khung giao diện **Optibide Partner Hub** hiện hữu (`1.png`, `2.png`: Sidebar, Topbar chọn Cơ sở lưu trú / Kỳ thời gian / Ngôn ngữ / Tiền tệ, hàng KPI đầu trang) theo **Hướng 1** đã chọn.
   - Bổ sung khối trung tâm **AI Bidding & Pricing Intelligence** giải quyết trọn vẹn 3 câu hỏi lớn bằng hệ thống biểu đồ tương tác (Combo Bar+Line, Grouped Horizontal Bar, 5-Stage Loss Waterfall/Funnel, Pareto Breakdown) và các thẻ **AI Diagnostic Advisor** vận hành theo 3 ngưỡng chuẩn trên Sheet (`< 30%` · `30% – 70%` · `> 70%`).
   - Hỗ trợ chuyển đổi trực tiếp giữa ít nhất **2 kịch bản cơ sở lưu trú đối lập** (Cơ sở đang hoạt động có doanh thu nhưng tỷ lệ trượt còn cao vs. Cơ sở mới lên sàn chưa có đánh giá / 0 đơn hoàn tất như `1.png`) và nút bật/tắt **"CTO Data Lineage Mode"** hiển thị nhãn ánh xạ *Tab Sheet → Sự kiện/Tham số → Công thức* ngay trên từng biểu đồ và thẻ AI để trả lời trực tiếp câu hỏi của CTO lúc demo.
2. **Bộ Slide Google Slides Gốc 45 Phút (~22 slides, tỷ lệ 16:9)**:
   - **Thiên về hình ảnh & khoanh vùng điểm nóng (70%+ diện tích mặt slide là hình ảnh/screenshot/sơ đồ)**: Chụp ảnh thực tế `1.png`/`2.png`, 4 màn hình khách hàng, ảnh bảng Google Sheet thực tế và ảnh chụp độ phân giải cao từ chính bản HTML Dashboard mẫu; vẽ sẵn **khung khoanh vùng màu nổi bật (đỏ/cam/xanh lá) kèm số thứ tự `① ② ③` và nhãn chú thích ngắn** ngay trên ảnh trước khi đưa vào slide.
   - Chữ trên slide cực kỳ cô đọng (mỗi khung chỉ 1 dòng tiêu đề kết luận + các nhãn chú thích gắn với vùng khoanh trên ảnh); toàn bộ lời giảng giải sâu cho 45 phút nằm trong **Speaker Notes (Ghi chú thuyết trình tiếng Việt kèm phân bổ số phút từng slide)**.

### Ngoài phạm vi (Non-Goals)
- Không sửa mã nguồn ứng dụng React hiện hữu trong `dashboard/dashboard` (tránh ảnh hưởng nhánh `main` đang có thay đổi dở dang của người dùng; bản HTML mẫu là bản đề xuất độc lập phục vụ buổi chốt với CTO).
- Không liệt kê toàn văn 66 dòng công thức của `dashboard_overview` lên mặt slide (dùng sơ đồ gom nhóm và ảnh chụp khoanh vùng tiêu biểu; Sheet gốc là tài liệu tra cứu chi tiết).

### Điều cấm kỵ (Anti-Goals)
- **Không làm slide toàn chữ ("wall of text")**: Tuyệt đối không nhồi nhiều đoạn văn dài lên slide khiến người nghe đọc chữ thay vì nhìn hình khoanh vùng và nghe thuyết trình.
- **Không rò rỉ mã biến kỹ thuật vào giao diện kinh doanh của chủ khách sạn (`AGENTS.md` §8)**: Ở chế độ xem mặc định dành cho chủ khách sạn trên HTML Dashboard mẫu và trong phần diễn giải kinh doanh trên slide, dùng 100% ngôn ngữ kinh doanh khách sạn tự nhiên (*chi nhánh, cơ sở lưu trú, sàn đặt phòng khác, cổng thanh toán*); tên sự kiện/tham số `snake_case` chỉ xuất hiện trong nhãn kỹ thuật riêng biệt hoặc khi bật nút *"CTO Data Lineage Mode"*.
- **Không mở quyền chia sẻ công khai (`anyone`)** cho file Google Slides trên Drive khi chưa có yêu cầu.

---

## 3. Các Phương Án Đã Cân Nhắc (Approaches)

- **Hướng 1 — Nâng cấp trực tiếp trên khung `Optibide Partner Hub` hiện hữu (Đã chọn):** Giữ nguyên khung giao diện quen thuộc của `1.png` / `2.png`, tinh gọn và nâng cấp khối phân tích & AI thành cụm biểu đồ + cố vấn AI giải quyết trực diện 3 câu hỏi lớn, kèm công tắc xem nguồn dữ liệu cho CTO. *Lý do chọn:* Thực tế, trực quan, CTO thấy ngay cách tích hợp vào sản phẩm đang chạy mà không làm rối mắt chủ khách sạn.
- **Hướng 2 — Trang "AI Analytics Lab" tách rời hoàn toàn (Loại bỏ):** Trình bày 7–8 biểu đồ chuyên sâu trên một màn hình mới riêng biệt; dễ gây cảm giác quá tải chỉ số cho đối tác vận hành khách sạn.

---

## 4. Ràng Buộc Kỹ Thuật & Quy Chuẩn Hiển Thị (Constraints)

1. **Ngôn ngữ & Tiền tệ (Đã xác nhận với người dùng)**:
   - **Toàn bộ 22 Slides, Ghi chú thuyết trình 45 phút và Ảnh chụp HTML Dashboard nhúng trên Slide:** Dùng **Tiếng Việt** làm ngôn ngữ chính (trên thanh Topbar của `ai-dashboard-proposal.html` vẫn hỗ trợ nút đổi trực tiếp `Tiếng Việt ⇄ English` và `VND ⇄ KRW ⇄ USD` khi demo trực tiếp).
2. **HTML Dashboard Mẫu (`docs/presentations/cto-ai-dashboard-proposal/ai-dashboard-proposal.html`)**:
   - Một tệp tự chứa hoàn chỉnh (offline-safe HTML/CSS/SVG+Canvas JS không phụ thuộc CDN ngoài để mở chạy tức thì trong phòng họp và chụp ảnh qua Playwright `@2x` DPI sắc nét tuyệt đối).
   - **Vị trí lắp ghép trên khung `Optibide Partner Hub` *(Quyết định của Builder)*:** Giữ nguyên Sidebar, Topbar, 5 thẻ KPI và biểu đồ *Doanh thu & Đơn hoàn tất theo ngày* ở phần trên; **nâng cấp thay thế trực tiếp** khu vực *Bids Status + AI Advisor chung chung* cũ bằng cụm **Phân tích AI: Giá Trúng Thầu & Chẩn Đoán Trượt Thầu** (gồm 4 biểu đồ chuyên sâu + thẻ AI theo ngưỡng `<30% · 30–70% · >70%`), bên dưới giữ gọn khu vực *Đánh giá & Điểm hiển thị* và *Đơn đặt phòng gần đây* để trang liền mạch, không bị trùng lặp biểu đồ.
   - **Đồng bộ toán học 1-1 với ảnh hiện trạng `2.png` & `1.png` bằng tên cơ sở tổng quát *(Quyết định của Builder, tuân thủ `AGENTS.md` §8)*:**
     - *Cơ sở lưu trú A — Đang hoạt động (91 báo giá · 17 đơn thắng · 18,7%)*: Khớp chính xác tổng 91 báo giá của `2.png`, bóc tách 74 báo giá không trúng thành 5 tầng rõ ràng (`9` khuất tầm mắt/quá hạn chưa xem + `24` gạt bỏ ngoài thẻ + `14` thua khi đối chiếu giá sàn ngoài + `19` thoát sau khi mở xem chi tiết + `8` khách đã bấm Chọn nhưng rớt bước thanh toán = `74`).
     - *Cơ sở lưu trú B — Mới lên sàn (75 báo giá · 0 đơn thắng · 0 đánh giá)*: Khớp chính xác 75 báo giá của `1.png`, làm nổi bật nguyên nhân trượt do rào cản *0 đánh giá*, *mục Video/Ảnh trống* và *điểm hiển thị khởi điểm 800*.
   - **Cơ chế mở Demo khi thuyết trình *(Quyết định của Builder)*:** Mở trực tiếp tệp `ai-dashboard-proposal.html` trên tab trình duyệt song song với Google Slides (tránh đặt link `file://` bị Google Slides chặn); file Google Slides giữ quyền riêng tư của `baominh.internship@gmail.com`.
3. **Xử lý Ảnh Khoanh Vùng (Annotated Visual Evidence)**:
   - Dùng script Python (`Pillow`) vẽ khung viền bo góc nổi bật (độ dày 4–6px, huy hiệu đánh số `①`, `②`, `③`, nhãn chú thích ngắn gọn) trực tiếp lên các ảnh chụp thực tế:
     - Hiện trạng Partner Hub: `1.png` và `2.png`
     - 4 chặng giao diện khách đặt phòng: `booking_form`, `offer_listing`, `explore_stays`, `payment_form`
     - Ảnh bảng dữ liệu thực tế từ Google Sheet (`booking_form` 9 cột & `dashboard_overview` cột công thức + ngưỡng AI 3 bậc)
     - Ảnh chụp độ phân giải cao từ chính `ai-dashboard-proposal.html` (chế độ Tiếng Việt mặc định & chế độ bật *CTO Data Lineage*)
4. **Google Slides 16:9**:
   - Kích thước `13.333 in × 7.5 in`, phông `Arial`, tắt bóng đổ mặc định của theme Office (`shadow.inherit = False`), kiểm tra tự động không tràn khung và xuất PDF từ Google Slides ra PNG kiểm tra trực quan từng trang sau chuyển đổi.

---

## 5. Kiến Trúc Nội Dung Trả Lời 3 Câu Hỏi Lớn & Ánh Xạ Chính Xác 66 Dòng Sheet

*(Tổng 66 dòng chỉ số từ `R2` đến `R67` trên tab `dashboard_overview` được phân bổ 100% không trùng lặp: **52 dòng phục vụ Đối tác** [gồm **22 dòng Giá trúng thầu** + **30 dòng Lý do không trúng**] và **14 dòng Vận hành kỹ thuật nội bộ GNS**).*

### 5.1. Lời Giải Cho Câu Hỏi Lớn 1: Phân Tích Giá Trúng Thầu (5 Góc Nhìn · 22 Câu Hỏi Dữ Liệu)
1. **Góc nhìn 1 — Khoảng cách tiết kiệm so với Sàn đặt phòng khác** (*2 dòng: `R52`, `R53`*): Giá chào thấp hơn giá công khai bên ngoài bao nhiêu `%` là "Vùng giá ngọt" vừa đủ giữ khách quay lại bấm Chọn sau khi đối chiếu giá mà không làm mỏng biên lợi nhuận?
2. **Góc nhìn 2 — Độ nhạy giá theo Thời điểm đặt, Độ dài kỳ nghỉ & Tốc độ phản hồi** (*5 dòng: `R11`, `R12`, `R28`, `R31`, `R32`*): Giảm giá xả phòng sát giờ (`0–1 ngày` trước giờ nhận) kết hợp Báo giá tự động trong khung phút vàng đầu tiên và ưu đãi lưu trú dài ngày (`>= 3 đêm`) nâng tỷ lệ thắng ra sao?
3. **Góc nhìn 3 — Cấu trúc gói chào: Tổ hợp phòng, Đa phương án & Hạng sao** (*6 dòng: `R16`, `R17`, `R18`, `R29`, `R30`, `R43`*): Chào linh hoạt 2–3 hạng phòng trên cùng một thẻ và khớp đúng tổ hợp giường/dịch vụ giúp chốt mức giá tốt hơn thế nào so với chào 1 phương án cứng nhắc?
4. **Góc nhìn 4 — Sức mua theo Tệp đoàn khách & Địa bàn cạnh tranh** (*5 dòng: `R7`, `8`, `13`, `14`, `15`*): Gia đình có trẻ nhỏ, đoàn đông hoặc mang thú cưng tại từng thành phố/quận huyện chấp nhận biên giá nào?
5. **Góc nhìn 5 — Phản xạ quyết định trước mức giá: Chốt nóng ngoài thẻ vs. Cân nhắc kỹ** (*4 dòng: `R33`, `34`, `35`, `56`*): Tỷ trọng khách bấm Chọn thẳng ngoài thẻ trong 3 phút đầu (tín hiệu giá cực hời) so với mở xem nhiều vòng rồi mới Chọn.

### 5.2. Lời Giải Cho Câu Hỏi Lớn 2: Tại Sao Không Trúng Thầu (5 Tầng Nguyên Nhân · 30 Câu Hỏi Dữ Liệu)
1. **Tầng 1 — Chưa từng lọt vào mắt khách (Mất hiển thị / Phản hồi chậm)** (*6 dòng: `R9`, `19`, `20`, `22`, `24`, `25`, `40` — trong đó `R40` đo trực tiếp hết hạn chưa từng thấy, cùng nhóm áp lực phiên `R19, 20, 22, 24, 25`*): Báo giá gửi chậm khi khách đã hủy, hoặc đứng thứ hạng sâu khuất dưới màn hình rồi trôi hết hạn 60 phút trong im lặng → *Cần bật Báo giá tự động & tăng điểm hiển thị, không phải giảm giá mù quáng.*
2. **Tầng 2 — Bị gạt bỏ ngay ngoài thẻ danh sách** (*4 dòng: `R23`, `37`, `38`, `39`*): Khách nhìn thấy thẻ và bấm Từ chối ngay không mở xem → Tách đôi nguyên nhân: **Giá ngoài thẻ vượt kỳ vọng** vs. **Khuyết tiện ích bắt buộc khách chọn** (`R37`: bữa sáng, đậu xe, hồ bơi...).
3. **Tầng 3 — Thua ngay sau bước đối chiếu Giá sàn ngoài** (*kết hợp nhánh đóng thoát của `R52`, `R53` + so sánh tốc độ phản xạ `R36`*): Khách mở bảng đối chiếu giá thấy chênh lệch tiết kiệm quá mỏng nên đóng cửa sổ rời đi.
4. **Tầng 4 — Mở xem chi tiết nhưng hụt niềm tin / vướng vị trí** (*15 dòng: `R9`, `41`, `42`, `44`, `45`, `46`, `47`, `48`, `49`, `50`, `51`, `54`, `55`, `57`, `58`*): Đã qua ải giá ban đầu nhưng thoát ra vì bấm phải **mục ảnh/video trống (`R48`)**, mở **Bản đồ thấy xa (`R54–R55`)**, phân vân điều kiện mô tả (`R49–R51`), hoặc e ngại **cơ sở mới chưa có đánh giá (`R44–R45`)**.
5. **Tầng 5 — Đã thắng lòng khách (đã bấm Chọn!) nhưng rớt kỹ thuật ở vạch đích Thanh toán** (*4 dòng đối tác: `R60`, `62`, `63`, `64`*): Rớt ở phiên 10 phút do tâm lý quy đổi tỷ giá ngoại tệ, gián đoạn cửa sổ thanh toán chưa kịp cứu đơn hoặc thẻ bị từ chối → *Bảo vệ AI không đổ lỗi nhầm cho giá phòng!*

### 5.3. Lời Giải Cho Câu Hỏi Lớn 3: Phễu Lọc 3 Tầng từ 66 Số Liệu lên Biểu Đồ & AI (`14 + 38 + 14 = 66`)
- **Nhóm A — 14 dòng cốt lõi vẽ thành Biểu đồ trực quan trên Partner Hub (`R11, R12, R28, R30, R37, R38, R40, R45, R48, R52, R53, R55, R62, R64`):**
  1. *Chart 1 (Kế thừa `2.png` — Dual-Axis Line + Bar):* Doanh thu & Đơn hoàn tất theo ngày.
  2. *Chart 2 (Combo Bar + Line — Câu hỏi 1 · `R52, R53`):* **Dải Giá Trúng Thầu & Điểm Ngọt Tiết Kiệm so với Sàn Ngoài** (chỉ rõ bậc tiết kiệm `10–15%` tối ưu tỷ lệ thắng nhất).
  3. *Chart 3 (Horizontal Grouped Bar — Câu hỏi 1 · `R11, R12, R28, R30`):* **Tỷ lệ Thắng theo Ngữ cảnh Đặt phòng** (Đặt sát giờ `0–1 ngày` · Lưu trú dài `>=3 đêm` · Báo giá tự động · Chào đa phương án phòng).
  4. *Chart 4 (5-Stage Horizontal Loss Waterfall — Câu hỏi 2 · `R40, R38, R52, R48/R55/R45, R62/R64`):* **Giải phẫu 100% Đơn Không Trúng Thầu qua 5 Tầng hành vi**.
  5. *Chart 5 (Dual Pareto Breakdown — Câu hỏi 2 · `R37` & `R45, R48, R55`):* **Top Điểm Nghẽn Khắc Phục Ngay** (Tiện ích thiếu bị từ chối nhiều nhất & Lý do thoát cửa sổ chi tiết).
- **Nhóm B — 38 dòng chạy ngầm trong Bộ máy AI Advisor (`<30%` · `30–70%` · `>70%`):** Chấm điểm ngầm 38 dòng còn lại trong nhóm 52 dòng đối tác và chỉ bật **Top 3–4 Thẻ Chẩn Đoán & Khuyến Nghị** cấp bách nhất kèm hộp câu hỏi gợi ý nhanh.
- **Nhóm C — 14 dòng Vận hành Kỹ thuật Nội bộ GNS (`R2, R3, R4, R5, R6, R10, R21, R26, R27, R59, R61, R65, R66, R67`):** Lỗi nhập biểu mẫu, tỷ lệ theo hệ điều hành/khung nhìn thiết bị, đóng tab khảo giá, hiệu suất cổng thanh toán — ẩn khỏi giao diện chủ khách sạn để tránh nhiễu, chỉ hiển thị khi CTO bật công tắc *"CTO Data Lineage Mode"*.

---

## 6. Dàn Ý Chi Tiết 22 Slides Cho Bài Thuyết Trình 45 Phút (Visual-First & Annotated)

| Slide | Phần & Thời lượng | Tiêu đề Slide | Hình ảnh / Screenshot Khoanh Vùng Chủ Đạo (70%+ diện tích) |
| :--- | :--- | :--- | :--- |
| **01** | **Intro** *(1p)* | Header: Thiết kế AI Dashboard & Phân tích Đấu thầu Đối tác | Bố cục bìa trực quan đặt cạnh khung thu nhỏ giao diện AI Dashboard đề xuất |
| **02** | **Intro** *(2p)* | Table of Contents: Lộ trình 4 phần & 3 mục tiêu cần chốt (45p) | Sơ đồ lộ trình 4 chặng trực quan: `Opening` → `Solution & Evidence` → `Sheet Data` → `HTML Dashboard Proposal` |
| **03** | **Opening** *(2.5p)* | Đề bài thực tế: Dashboard hiện tại mới thấy "Kết quả cuối", chưa thấy "Lý do" | Ảnh chụp `2.png` **khoanh đỏ 3 vùng**: ① `Accept% 18.7%`, ② `Rejected 80.0%`, ③ `AI Advisor` đang phán đoán chung chung |
| **04** | **Opening** *(2p)* | Nỗi đau của Cơ sở mới: 75 lần chào giá, 0 đơn thắng, không biết sửa ở đâu | Ảnh chụp `1.png` **khoanh đỏ 3 vùng**: ① `0 ₩ / 75 Bids`, ② `67 Rejected / 8 Expired`, ③ `ELO 800 · 0.0 Rating` |
| **05** | **Opening** *(2.5p)* | 3 Câu hỏi lớn cần chốt để nâng cấp phần AI trên Dashboard | Sơ đồ 3 khối câu hỏi lớn của CTO: (1) Giá trúng thầu, (2) Tại sao không trúng, (3) Lọc số liệu nào lên Chart |
| **06** | **Body · Solution** *(2p)* | Hướng giải quyết: Bắt hành vi thực tế → Chuẩn hóa Sheet → Lọc lên AI Dashboard | Sơ đồ kiến trúc hình ảnh nối 4 màn hình khách hàng → Google Sheet 6 tab → Partner AI Hub |
| **07** | **Body · Evidence 1** *(2.5p)* | Bằng chứng Chặng 1 (`booking_form`): Bắt trọn "Đề bài gốc" của du khách | Ảnh `booking_form` **khoanh vùng ① Khu vực · ② Ngày & Đoàn khách · ③ Tổ hợp phòng & Tiện ích** + hộp *Reason* |
| **08** | **Body · Evidence 2** *(3p)* | Bằng chứng Chặng 2 (`offer_listing`): Tách bạch "Khuất tầm mắt" với "Bị từ chối" | Ảnh `offer_listing` **khoanh vùng ① Thứ hạng & Độ khớp · ② So giá bên A/B · ③ Đổi gói phòng `<1/2>` · ④ Hết hạn/Từ chối** + *Reason* |
| **09** | **Body · Evidence 3** *(3p)* | Bằng chứng Chặng 3 (`explore_stays`): Bắt điểm rơi niềm tin bên trong cửa sổ chi tiết | Ảnh ghép `explore_stays` **khoanh đỏ ① Bảng 4 sàn ngoài · ② Tab `Video (0)` trống · ③ Mở bản đồ · ④ Chưa có đánh giá** + *Reason* |
| **10** | **Body · Evidence 4** *(2.5p)* | Bằng chứng Chặng 4 (`payment_form`): Minh oan cho báo giá khi khách rớt lúc trả tiền | Ảnh `payment_form` **khoanh vùng ① Tỷ giá quy đổi · ② Cổng `NHN KCP / PayPal` · ③ Phiên 10 phút** + *Reason* |
| **11** | **Body · Data** *(2.5p)* | Cách tổ chức dữ liệu trên Sheet: 45 sự kiện nối liền mạch bằng 5 khóa xương sống | Ảnh chụp trực tiếp bảng sự kiện trên Sheet **khoanh vùng 9 cột chuẩn** + sơ đồ chuỗi khóa nối từ mở form đến thu tiền |
| **12** | **Body · Data** *(2.5p)* | Tab `dashboard_overview`: 66 công thức & Bộ quy tắc AI 3 bậc ngưỡng (`<30% · 30–70% · >70%`) | Ảnh chụp trực tiếp tab `dashboard_overview` **khoanh vùng cột `Calculation` và 5 gạch đầu dòng trong `AI Assistance`** |
| **13** | **Proposal · Q1** *(3p)* | Giải đáp Câu hỏi 1: Phân tích Giá Trúng Thầu gồm 5 góc nhìn & 22 câu hỏi | Bản đồ trực quan 5 nhánh góc nhìn Giá trúng thầu (đánh dấu rõ nhánh nào lên Chart, nhánh nào AI đọc ngầm) |
| **14** | **Proposal · Q2** *(3p)* | Giải đáp Câu hỏi 2: Giải mã Tại sao Không Trúng qua 5 tầng & 30 câu hỏi | Sơ đồ trực quan Phễu rớt đơn 5 tầng đối chiếu trực tiếp với cục `Rejected 80%` cũ |
| **15** | **Proposal · Q3** *(2.5p)* | Giải đáp Câu hỏi 3: Phễu lọc 66 chỉ số → 14 lên Chart · 38 chạy ngầm AI · 14 Nội bộ | Sơ đồ Phễu lọc 3 tầng giải thích vì sao chọn đúng 5 biểu đồ hành động thay vì vẽ tràn lan |
| **16** | **Proposal · Q3** *(2p)* | Ma trận chọn Biểu đồ: Chỉ số nào đi với dạng Chart nào để nhìn 3 giây hiểu ngay? | Bảng ma trận hình ảnh minh họa 4 dạng biểu đồ mới (Combo Bar-Line, Grouped Bar, 5-Stage Waterfall, Pareto) |
| **17** | **Proposal · Demo** *(2p)* | Toàn cảnh HTML Dashboard Mẫu tích hợp thẳng vào `Optibide Partner Hub` | Ảnh chụp toàn trang `ai-dashboard-proposal.html` **khoanh vùng vị trí lắp ghép** (mở song song tệp HTML lúc demo) |
| **18** | **Proposal · Demo** *(2p)* | Cận cảnh Biểu đồ Giá Trúng Thầu: Tìm ngay "Vùng Giá Ngọt" & Ngữ cảnh thắng cao | Ảnh chụp cận cảnh khối Chart 2 & Chart 3 từ HTML mẫu **khoanh đỏ vùng tiết kiệm tối ưu `10–15%` & nhóm Đặt sát giờ** |
| **19** | **Proposal · Demo** *(2p)* | Cận cảnh Biểu đồ Không Trúng Thầu: Chỉ đích danh khâu làm tuột mất khách | Ảnh chụp cận cảnh khối Chart 4 & Chart 5 từ HTML mẫu **khoanh đỏ tầng Rớt thanh toán & Tiện ích khuyết / Ảnh trống** |
| **20** | **Proposal · Demo** *(2p)* | Cận cảnh Bộ não AI Chẩn đoán: Tự động đổi khuyến nghị theo ngưỡng & từng cơ sở | Ảnh chụp so sánh khối AI Advisor trên HTML mẫu giữa **Cơ sở đang vận hành** vs. **Cơ sở mới 0 đánh giá** (có bật nhãn nguồn dữ liệu CTO) |
| **21** | **Proposal · Compare** *(1.5p)* | Đối chiếu Trước & Sau: Từ "AI đoán mò chung chung" sang "AI có bằng chứng hành vi" | Ảnh ghép song song `2.png` hiện tại (trái) vs. `ai-dashboard-proposal.html` mới (phải) khoanh đối xứng từng cải tiến |
| **22** | **Closing** *(1.5p)* | Chốt Quyết định cùng CTO: 3 hạng mục thống nhất & Lộ trình gắn dữ liệu | Khung 3 quyết định cần chốt tại cuộc họp & lộ trình 3 pha triển khai thực tế |

---

## 7. Các Quyết Định Giao Cho Bộ Dựng Kỹ Thuật (Left to the Builder)

- Số liệu minh họa trên bản HTML Dashboard mẫu được tổng hợp nhất quán về mặt toán học cho 2 hồ sơ cơ sở mẫu (*Cơ sở đang vận hành có doanh thu* và *Cơ sở mới khai trương 0 đơn hoàn tất*), giữ đúng quy chuẩn không lộ biến kỹ thuật ở chế độ xem đối tác mặc định và hiển thị đầy đủ nguồn sự kiện khi bật chế độ *"CTO Data Lineage Mode"*.
- Tự động render các bảng trích đoạn từ dữ liệu thật của Google Sheet thành ảnh PNG độ nét cao kèm khung khoanh đỏ/cam để nhúng vào Slides 11–12.
- Tinh chỉnh bố cục 22 slides sao cho mọi slide bằng chứng và demo đều ưu tiên diện tích lớn nhất cho ảnh khoanh vùng, chữ to rõ, không đè hình và kiểm chứng 100% sau khi chuyển đổi sang Google Slides gốc.
