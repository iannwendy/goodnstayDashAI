# TÀI LIỆU KỊCH BẢN & HƯỚNG DẪN THUYẾT TRÌNH CÙNG CTO (45 PHÚT — CHIA 3 NGƯỜI)

- **Chủ đề:** Thiết Kế Bảng Quản Trị Đấu Thầu & Cố Vấn Kinh Doanh AI Dành Cho Chủ Khách Sạn
- **Tổng thời lượng:** 45 phút (khoảng 40–42 phút trình bày + 3–5 phút thảo luận chốt quyết định cùng CTO)
- **Tổng số lượng slides:** **41 slides** (File trình chiếu: `CTO_AI_Dashboard_And_Bidding_Analytics_45min_v8_WhiteCover.pptx`)
- **File Demo tương tác đi kèm:** `ai-dashboard-proposal.html` *(Đã cập nhật đủ 3 ngôn ngữ `Tiếng Việt · English · 한국어`, chú thích độ trễ `T-1 ≥ 24h` & chu kỳ làm sạch `3–7 ngày`, Phễu 4 bước + kép 2 tỷ lệ thua, 5 tiêu chí `Sort` và Phân cụm chân dung du khách `C1`–`C4` khóa phạm vi AI)*
- **File dữ liệu gốc đối chiếu:** Google Sheet `[GNS] Database Schema` (trang `dashboard_overview` và 4 trang sự kiện)

---

## I. BẢNG PHÂN CÔNG NHIỆM VỤ CHO 3 THÀNH VIÊN

Bộ 41 slides được chia thành **3 phần cân đối theo đúng mạch tư duy của CTO**: đi từ *Vấn đề & Khởi đầu hành trình* → *Đi sâu hành vi sắp xếp, chọn/từ chối & ranh giới thanh toán* → *Quy tắc tính toán, Phân cụm khóa phạm vi AI, Giải đáp 3 câu hỏi lớn & Demo giao diện HTML đa ngôn ngữ*.

| Người trình bày | Phạm vi Slides | Số lượng | Thời lượng | Trọng tâm phụ trách |
| :--- | :---: | :---: | :---: | :--- |
| **Bạn 1** *(Mở màn & Đặt nền móng)* | **Slide 01 → Slide 11** | 11 slides | **~12 phút** | Mở đầu, chỉ ra 2 điểm mù thực tế trên hệ thống hiện tại, đặt 3 câu hỏi cốt lõi, dẫn dắt quy trình tổng thể và giải thích **giai đoạn Tìm phòng (`booking_form`) — phân định rõ thao tác nháp nội bộ trước khi bấm Tìm bid với bản chốt yêu cầu đưa vào AI (`booking_form_complete`)**. |
| **Bạn 2** *(Phân tích sâu hành vi đấu thầu)* | **Slide 12 → Slide 26** | 15 slides | **~15 phút** | Giải thích **15 mục sự kiện tiếp theo** qua 3 giai đoạn: **Nhận & Sắp xếp báo giá (`offer_listing` kèm 5 tiêu chí `Sort`)**, **Xem chi tiết (`explore_stays`)** và **Ranh giới Thanh toán (`payment_form` — tách riêng lỗi cổng thanh toán về vận hành nội bộ, chỉ đưa `payment_complete` vào Dashboard đối tác)**. |
| **Bạn 3** *(Chốt phương án & Demo HTML)* | **Slide 27 → Slide 41** | 15 slides | **~15 phút** *(+ 3p chốt)* | Giải thích công thức chuẩn Excel, độ trễ `T-1 (≥24h)` & chu kỳ làm sạch `3–7 ngày`, Phân cụm chân dung du khách (`C1`–`C4`) khóa phạm vi AI, trả lời **3 câu hỏi lớn của CTO**, **mở Demo trực tiếp file HTML 3 ngôn ngữ** (Phễu 4 bước kèm kép tỷ lệ thua + Khuyến nghị AI) và xin phê duyệt. |

---

## II. HƯỚNG DẪN CHUẨN BỊ & NGUYÊN TẮC THUYẾT TRÌNH GHI ĐIỂM VỚI CTO

### 1. Chuẩn bị kỹ thuật trên máy chiếu trước 5 phút
1. **Tab 1 — Slide thuyết trình:** Mở sẵn file `CTO_AI_Dashboard_And_Bidding_Analytics_45min_v8_WhiteCover.pptx` (hoặc bản Google Slides) ở chế độ toàn màn hình.
2. **Tab 2 — Giao diện HTML mẫu (`ai-dashboard-proposal.html`):** Mở sẵn trên trình duyệt Chrome ở mức thu phóng `100%`, mặc định chọn **Khách sạn mẫu A · Kỳ 30 ngày qua · Tiếng Việt** và chưa bật nút `Xem nguồn sự kiện thu thập`. Đến **Slide 32 (Đa ngôn ngữ & Độ trễ `T-1`)**, **Slide 36 (Biểu đồ Phễu 4 bước + Tỷ lệ thua)** và **Slide 38–40 (Phân cụm Chân dung + Khuyến nghị AI)**, Bạn 3 chuyển qua Tab 2 khoảng 60–90 giây để thao tác trực tiếp cho CTO xem độ mượt rồi quay lại chốt Slide 41.
3. **Tab 3 — Bảng tính `[GNS] Database Schema`:** Mở sẵn ở trang `dashboard_overview` (chỉ mở dự phòng khi CTO hỏi sâu về một dòng công thức cụ thể).

### 2. Bốn nguyên tắc vàng khi trình bày cho Sếp / CTO
- **Tuyệt đối không đọc nguyên văn chữ trên slide:** Slide được thiết kế cô đọng để CTO lướt mắt 3 giây là nắm ý. Người nói đóng vai trò **kể câu chuyện nghiệp vụ đằng sau tấm ảnh chụp màn hình**.
- **Luôn giữ kỷ luật "Biên dữ liệu sạch cho AI đối tác" xuyên suốt bài nói:**
  1. **Không đưa hành vi khi khách chưa bấm Tìm bid vào AI của khách sạn** (lỗi điền form, nhấp nháp thoát sớm là việc của đội Product/UX nội bộ GNS).
  2. **Không đưa lỗi thẻ / lỗi cổng thanh toán vào Phễu và AI của khách sạn** (chủ khách sạn không sửa cổng thanh toán được; chỉ tính từ `booking_form_complete` đến `payment_complete`).
  3. **Phân cụm chân dung du khách (`Clustering`) & cây phân cấp 3 tầng** để khóa cứng phạm vi, tránh AI suy diễn lan man ra ngoài những việc chủ khách sạn làm được.
- **Minh bạch về độ trễ & chu kỳ làm sạch dữ liệu:** Luôn nhấn mạnh dữ liệu hành vi lấy về có **độ trễ tối thiểu 24 giờ (`T-1`)** và cần **chu kỳ 3 ngày (`72h`) đến 7 ngày** để công cụ phân tích khử trùng lặp, lọc nhiễu và chốt số sạch cố định.
- **Giữ đúng chân dung người dùng mục tiêu:** Người mở Dashboard mỗi sáng là **chủ doanh nghiệp khách sạn 50–60 tuổi (Việt Nam, Hàn Quốc, quốc tế)** quen nhìn bảng tổng hợp kiểu Excel, cần thấy rõ cả **Tỷ lệ thắng lẫn Tỷ lệ thua** bằng ngôn ngữ kinh doanh tự nhiên trên cả 3 locale **Việt – Anh – Hàn**.

---

## III. KỊCH BẢN CHI TIẾT TỪNG SLIDE DÀNH CHO BẠN 1 (SLIDE 01 → SLIDE 11 · ~12 PHÚT)

### Slide 01 — Trang bìa trắng: Thiết Kế Dashboard Tích Hợp AI Phân Tích Nguyên Nhân Trúng & Trượt Bid *(1,0 phút)*
- **[Hành động]:** Đứng mở màn tự tin, chỉ nhẹ sang cụm cửa sổ giao diện sản phẩm minh họa bên tay phải trang bìa.
- **[Lời thoại gợi ý]:**
  > "Em chào anh [Tên CTO] và mọi người ạ. Hôm nay nhóm em xin trình bày đề xuất **Thiết kế Dashboard tích hợp AI phân tích nguyên nhân trúng và trượt bid** dành cho đối tác khách sạn trên Optibide Partner Hub, hỗ trợ đồng bộ 3 ngôn ngữ **Việt – Anh – Hàn**.
  > Mục tiêu trọng tâm của buổi 45 phút hôm nay là làm rõ ranh giới thu thập dữ liệu hành vi (cái nào phục vụ vận hành nội bộ GNS, cái nào đưa vào AI của khách sạn), cách phân cụm dữ liệu chuẩn xác kèm chu kỳ làm sạch dữ liệu, và đề xuất bản giao diện HTML trực quan cho chủ khách sạn."

---

### Slide 02 — Mục lục & Lộ trình trình bày 5 chặng xuyên suốt 45 phút *(1,0 phút)*
- **[Hành động]:** Chỉ dọc theo trục lộ trình bên trái từ mục `01` xuống `05` kèm cột số trang và thời lượng bên phải.
- **[Lời thoại gợi ý]:**
  > "Để buổi làm việc đi đúng trọng tâm 45 phút, lộ trình trình bày được chia thành **5 chặng rõ ràng**:
  > - **Chặng 01 — Mở đầu & Đặt vấn đề (Trang 03 – 06, 6 phút):** Chỉ ra điểm mù mục 'Từ chối 80%' trên cơ sở đang chạy, rào cản '0 đánh giá' của cơ sở mới và 3 câu hỏi cốt lõi.
  > - **Chặng 02 — Bằng chứng hành vi qua các chặng đặt phòng (Trang 07 – 26, 20 phút):** Đi qua từng mắt xích dữ liệu kèm ảnh thật, đồng thời phân ranh giới rạch ròi: chỉ đưa dữ liệu **sau khi khách bấm Tìm bid** và **thuộc quyền kiểm soát của khách sạn** vào AI.
  > - **Chặng 03 — Bảng tính tổng hợp & Quy tắc dữ liệu sạch (Trang 27 – 28, 3 phút):** Công thức chuẩn Excel, độ trễ `T-1 (≥24h)`, chu kỳ làm sạch `3–7 ngày` và 3 ngưỡng khuyến nghị cố định.
  > - **Chặng 04 — Giải đáp 3 bài toán của CTO (Trang 29 – 31, 5 phút):** Chốt 5 góc độ Giá trúng thầu, Phễu **4 bước khách rời đi kèm Tỷ lệ thua**, hành vi `Sort` và Phân cụm chân dung du khách khóa phạm vi AI.
  > - **Chặng 05 — Demo HTML 3 ngôn ngữ & Chốt phê duyệt (Trang 32 – 41, 11 phút):** Trình chiếu trực tiếp trên trình duyệt và xin ý kiến thống nhất."

---

### Slide 03 — Thực trạng 1: Giao diện cũ gộp chung mọi đơn chưa chốt vào mục "Từ chối" *(1,5 phút)*
- **[Hành động]:** Chỉ trực tiếp vào khung khoanh đỏ dòng `Rejected — 72 (80.0%)` bên trái, rồi chỉ sang mũi tên dẫn tới thẻ `Guest Price Resistance Detected` khoanh cam bên phải.
- **[Lời thoại gợi ý]:**
  > "Trước hết, mời anh nhìn vào ảnh chụp thực tế từ Dashboard của một khách sạn đang hoạt động. Ở bảng bên trái, toàn bộ các lượt báo giá không thành công đều bị gom chung vào một dòng **Từ chối — 80%**.
  > Vì chỉ nhìn kết quả cuối mà không phân tách hành trình và không khóa phạm vi cho AI, thẻ AI bên phải lập tức suy đoán cảm tính rằng *'Khách chê giá cao'* rồi khuyên hạ giá. Trong khi thực tế, khách sạn có thể thua thầu vì bị tụt hạng khi khách bấm `Sort` danh sách, vì gói phòng thiếu bữa sáng, hoặc vì mục Video phòng bỏ trống — còn các sự cố lỗi thẻ thanh toán lại là lỗi kỹ thuật không liên quan gì tới giá phòng của khách sạn. Nếu gom chung tất cả vào AI thì AI sẽ đi lan man và khuyên giảm giá sai."
- **[Ý chốt đắt giá]:** Muốn AI khuyên đúng, phải bóc tách rõ **Tỷ lệ thua ở từng bước khách sạn kiểm soát được** và loại bỏ các nhiễu kỹ thuật ngoài phạm vi.

---

### Slide 04 — Thực trạng 2: Khách sạn mới khai trương chưa có đơn vì thiếu đánh giá *(1,5 phút)*
- **[Hành động]:** Chỉ vào khung đỏ trên cùng (`0 ₩ doanh thu` dù gửi đều đặn báo giá tự động), sau đó chỉ xuống 2 khung nguyên nhân bên dưới (`0.0 / 5` và `ELO 800`).
- **[Lời thoại gợi ý]:**
  > "Thực trạng thứ hai xảy ra với các cơ sở mới vừa lên sàn. Nhìn vào hàng chỉ số phía trên, cơ sở này bật báo giá tự động 100% nhưng tỷ lệ thua vẫn là 100%, doanh thu bằng 0.
  > Nguyên nhân gốc không nằm ở giá phòng đắt, mà nằm ở hai điểm: một là cơ sở mới **chưa có lượt đánh giá nào (0,0 sao)** nên khi khách dùng chức năng `Sort` theo Điểm đánh giá hoặc mở xem chi tiết đều e ngại rời đi; hai là điểm ưu tiên hiển thị khởi điểm ở mức **800** nên báo giá chìm xuống cuối danh sách. Với nhóm này, AI phải khuyên mở ưu đãi đón 5 đoàn đầu tiên để lấy đánh giá thực tế và đăng ngay Video phòng, chứ không áp chung bài toán của khách sạn lâu năm."

---

### Slide 05 — Ba câu hỏi cốt lõi định hướng toàn bộ thiết kế *(1,0 phút)*
- **[Hành động]:** Điểm qua 3 cột Câu hỏi cốt lõi 01, 02, 03.
- **[Lời thoại gợi ý]:**
  > "Từ hai thực trạng đó, toàn bộ thiết kế dữ liệu và biểu đồ của nhóm tập trung giải quyết 3 bài toán lớn:
  > - **Bài toán 1 — Phân tích Giá trúng thầu:** Nhìn từ những góc độ nào (kể cả hành vi khách `Sort` theo giá/mức tiết kiệm) để tìm ra vùng ưu đãi chốt đơn cao nhất mà vẫn bảo toàn lợi nhuận?
  > - **Bài toán 2 — Tại sao không trúng thầu & Tỷ lệ thua:** Làm sao đo chính xác **Tỷ lệ thua** qua từng bước thuộc tầm tay khách sạn thay cho cục 'Từ chối' chung chung?
  > - **Bài toán 3 — Chọn lọc & Phân cụm dữ liệu cho AI:** Loại bỏ nhiễu ngoài phạm vi (trước khi bấm Tìm bid & lỗi thanh toán), phân cụm chân dung du khách thế nào để AI tư vấn sắc bén, không đi lan man?"

---

### Slide 06 — Phương án tổng thể 4 bước dẫn dắt từ hành vi đến quyết định *(1,0 phút)*
- **[Hành động]:** Chỉ theo dòng chảy ngang từ Bước 01 sang Bước 04.
- **[Lời thoại gợi ý]:**
  > "Phương án của nhóm đi theo 4 bước chặt chẽ:
  > **Bước 1:** Chỉ đưa vào luồng phân tích đối tác các hành vi **từ thời điểm khách đã bấm Tìm bid (`booking_form_complete`)** trở đi → **Bước 2:** Phân cụm chân dung du khách kết hợp hành vi Sắp xếp (`Sort`), đối chiếu giá và xem hồ sơ phòng → **Bước 3:** Chốt dữ liệu theo chu kỳ sạch (`T-1 ≥ 24h`, đối soát sạch `3–7 ngày`) bằng công thức chuẩn Excel và 3 ngưỡng cố định → **Bước 4:** Hiển thị thành 5 biểu đồ trực quan (có rõ Tỷ lệ thắng / Tỷ lệ thua) và 3 khuyến nghị AI khóa chặt trong phạm vi khách sạn trên 3 ngôn ngữ Việt – Anh – Hàn."

---

### Slide 07 — Main Event 01/20 (`booking_form_view`): Mở phiếu tìm phòng *(1,0 phút — NHẤN MẠNH RANH GIỚI KHÔNG ĐƯA VÀO AI ĐỐI TÁC)*
- **[Hành động]:** Chỉ vào vùng khoanh đỏ bên trái, đồng thời nêu rõ ranh giới tách về Vận hành UX nội bộ GNS.
- **[Lời thoại gợi ý]:**
  > "Đi vào nhóm 5 mục đầu tiên trên `booking_form`, em xin làm rõ ngay **nguyên tắc biên dữ liệu** ở đây:
  > Khi khách mới mở biểu mẫu (`booking_form_view`) và đang thao tác nháp chưa bấm nút Tìm bid, các lỗi nhập liệu hay việc khách tự thoát biểu mẫu sớm **chỉ phục vụ đội Product/UX nội bộ của goodNstay** để tối ưu giao diện tìm kiếm. Chúng ta **tuyệt đối không đưa các hành vi chưa bấm Tìm bid này vào AI của Dashboard chủ khách sạn**, vì lúc đó yêu cầu chưa hề gửi tới khách sạn nào cả."

---

### Slide 08 — Main Event 02/20 (`booking_destination_select`): Thông số khu vực lưu trú khi gửi yêu cầu *(1,0 phút)*
- **[Hành động]:** Chỉ vào khung xanh dương (Quốc gia / Tỉnh thành) và khung cam bên dưới.
- **[Lời thoại gợi ý]:**
  > "Ở mục thứ hai (`booking_destination_select`), đối với vận hành nội bộ GNS thì giúp biết khu vực nào khách đang dạo tìm; còn đối với **AI của chủ khách sạn**, thông tin Quận/Huyện, Phường/Xã này chỉ được trích xuất **sau khi khách đã bấm gửi yêu cầu hoàn tất ở Slide 11** — giúp hệ thống đối chiếu tỷ lệ thắng/thua của khách sạn với đúng mặt bằng đối thủ láng giềng cùng khu phố."

---

### Slide 09 — Main Event 03/20 (`booking_stay_details_complete`): Thông số ngày lưu trú & đoàn khách chốt gửi *(1,0 phút)*
- **[Hành động]:** Chỉ vào khung cam (Nhận phòng – Trả phòng) và khung xanh lá (Tổng số khách – Tổng số phòng).
- **[Lời thoại gợi ý]:**
  > "Tương tự ở mục thứ ba: mọi thao tác đổi ngày qua lại lúc đang gõ form đều được lọc bỏ khỏi AI đối tác; hệ thống chỉ lấy **thông số chốt cuối cùng khi khách đã bấm Tìm bid** — gồm khoảng cách ngày đặt trước (`đặt gấp 0–1 ngày`), độ dài kỳ nghỉ (`từ 3 đêm`) và cơ cấu đoàn khách (cặp đôi, gia đình có trẻ nhỏ). Đây là đầu vào cốt lõi để phân cụm chân dung **Khách đặt gấp sát giờ** và **Khách gia đình lưu trú dài ngày**."

---

### Slide 10 — Main Event 04/20 (`booking_accommodation_type_select`): Điều kiện hạng phòng & dịch vụ bắt buộc *(1,0 phút)*
- **[Hành động]:** Nhấn mạnh vào khung khoanh đỏ bên dưới (`Bữa sáng · Hồ bơi · Bãi đậu xe · Trả phòng trễ`).
- **[Lời thoại gợi ý]:**
  > "Mục thứ tư ghi nhận các dịch vụ bắt buộc khách tích chọn trong yêu cầu chốt gửi — như **Bữa sáng, Hồ bơi, Bãi đậu xe, Trả phòng trễ**. Khi yêu cầu này được bắn sang khách sạn (từ bước bấm Tìm bid), danh sách tiện ích bắt buộc này trở thành 'đề bài gốc' để đối chiếu tự động nếu sau đó khách bấm Từ chối báo giá của khách sạn."

---

### Slide 11 — Main Event 05/20 (`booking_form_complete`): Mốc khởi đầu chính thức của dữ liệu AI Đối tác *(1,0 phút + Chuyển lời)*
- **[Hành động]:** Chỉ vào nút xanh `MỜI KHÁCH SẠN BÁO GIÁ` — nhấn mạnh đây chính là **Cột mốc số 0 (Điểm bắt đầu)** đưa dữ liệu vào Partner AI Dashboard.
- **[Lời thoại gợi ý]:**
  > "Và mục số 5 — `booking_form_complete` — khi khách chính thức bấm **Mời khách sạn báo giá (Tìm bid)** chính là **vạch xuất phát thực sự của toàn bộ dữ liệu trên AI Dashboard dành cho chủ khách sạn**. Từ khoảnh khắc sinh ra `request_id` này, yêu cầu mới đến tay khách sạn để đo tốc độ phản hồi Auto-bid dưới 1 phút so với nhập tay chậm trễ ban đêm."
- **[Câu chuyển lời mượt sang Bạn 2]:**
  > *"Từ vạch xuất phát `booking_form_complete` này, khách hàng bắt đầu sắp xếp (`Sort`) danh sách báo giá, mở xem chi tiết và đi tới bước đặt phòng như thế nào? Em xin nhường lời cho [Tên Bạn 2] đi tiếp 15 mắt xích tiếp theo ạ."*

---

## IV. KỊCH BẢN CHI TIẾT TỪNG SLIDE DÀNH CHO BẠN 2 (SLIDE 12 → SLIDE 26 · ~15 PHÚT)

> **Lưu ý nhịp độ cho Bạn 2:** Bạn phụ trách 15 slides (`Mục 06/20` → `20/20`) trong ~15 phút (~1 phút / slide). Nhớ nhấn mạnh **2 điểm chốt của CTO**: (1) Bổ sung đầy đủ hành vi khách dùng bộ **`Sort` (5 tiêu chí sắp xếp)** ở Slide 12–13; và (2) Ở Slide 24–25, giải thích rõ **các lỗi thanh toán kỹ thuật được tách riêng cho đội vận hành GNS, không đưa vào Phễu và không đưa vào AI của khách sạn**.

### Slide 12 — Main Event 06/20 (`offer_listing_view` & `offer_listing_sort_change`): Quy mô cạnh tranh & Hành vi Sắp xếp (`Sort`) danh sách *(1,0 phút)*
- **[Hành động]:** Chỉ vào khu vực đầu danh sách báo giá — nơi hiển thị số lượng đề xuất cạnh tranh và thanh Sắp xếp (`Sort`).
- **[Lời thoại gợi ý]:**
  > "Em xin tiếp nối ở giai đoạn khách nhận danh sách báo giá. Bên cạnh việc ghi nhận có bao nhiêu khách sạn cùng đấu giá trong phiên (`offer_listing_view`), hệ thống tính luôn cả **hành vi khách sử dụng chức năng Sắp xếp — `Sort` (`offer_listing_sort_change`)** với đầy đủ **5 tiêu chí dự kiến**: *Giá thấp nhất, Mức tiết kiệm % cao nhất, Điểm đánh giá cao nhất, Độ phù hợp cao nhất, và Khoảng cách gần nhất*.
  > Tính đến hành vi `Sort` cực kỳ quan trọng: vì cùng một báo giá nhưng nếu khách bấm `Sort theo Điểm đánh giá cao`, cơ sở mới 0 sao sẽ rớt xuống cuối ngay; còn nếu khách bấm `Sort theo Mức tiết kiệm %`, cơ sở giảm 10–15% sẽ vọt lên đầu màn hình."

---

### Slide 13 — Main Event 07/20 (`offer_card_impression`): Vị trí xuất hiện thực tế sau khi `Sort` *(1,0 phút)*
- **[Hành động]:** Chỉ vào thẻ #1 khoanh xanh lá phía trên (kèm nút đổi phòng `< 1 / 2 >`) và đối chiếu với thẻ #2 khoanh tím nằm sâu bên dưới.
- **[Lời thoại gợi ý]:**
  > "Tiếp theo là `offer_card_impression` — ghi nhận vị trí xuất hiện thực tế của thẻ báo giá sau khi áp dụng thứ tự xếp hạng/`Sort`, báo giá gửi tự động hay thủ công, và khách có lướt xem hạng phòng thứ 2, thứ 3 qua nút `< 1 / 2 >` hay không.
  > Nhờ kết hợp thứ tự `Sort` với `impression`, hệ thống tách bạch chính xác **Bước thua số 1 trên Phễu**: báo giá thua do nằm khuất tầm nhìn (chưa từng được khách nhìn thấy) chứ không phải do khách chê phòng."

---

### Slide 14 — Main Event 08/20 (`offer_browse_click`): Khung giờ vàng khách mở xem báo giá *(1,0 phút)*
- **[Hành động]:** Chỉ vào khung xanh dương bao quanh tên phòng và ảnh đại diện trên thẻ.
- **[Lời thoại gợi ý]:**
  > "Mục thứ 8 là `offer_browse_click`: đo chính xác sau bao nhiêu giây kể từ lúc khách sạn gửi báo giá thì khách bấm mở xem. Dữ liệu này chứng minh nhóm **Khách đặt gấp sát giờ** tập trung chốt đơn ngay trong vài phút đầu tiên — là cơ sở để AI khuyên chủ khách sạn bật Auto-bid xuyên đêm."

---

### Slide 15 — Main Event 09/20 (`offer_card_select_click`): Khách chọn đặt ngay ngoài danh sách *(1,0 phút)*
- **[Hành động]:** Chỉ vào khung xanh lá quanh dải nhãn tiết kiệm bên ngoài thẻ.
- **[Lời thoại gợi ý]:**
  > "Mục thứ 9 — `offer_card_select_click` — ghi nhận các lượt khách quyết định chọn đặt phòng ngay từ ngoài thẻ danh sách nhờ mức tiết kiệm % và điểm đánh giá thuyết phục ngay từ cái nhìn đầu tiên."

---

### Slide 16 — Main Event 10/20 (`offer_reject_confirm`): Khách chủ động bấm Từ chối báo giá *(1,0 phút)*
- **[Hành động]:** Chỉ thẳng vào khung khoanh đỏ góc trái dưới thẻ (`4 khách · Executive · Tủ lạnh mini · TV · Wi-Fi` — thiếu Bữa sáng/Đậu xe).
- **[Lời thoại gợi ý]:**
  > "Mục thứ 10 — `offer_reject_confirm` — giải quyết trực diện **Bước thua số 2 trên Phễu** (khách từ chối ngay ngoài danh sách). Hệ thống đối chiếu gói phòng vừa chào với tiện ích bắt buộc trong `booking_form_complete` để chỉ đích danh: khách từ chối vì thiếu **Bữa sáng miễn phí**, thiếu **Trả phòng trễ 14h** hay thiếu **Chỗ đậu xe**, giúp chủ khách sạn bổ sung đúng dịch vụ thay vì hạ giá mù quáng."

---

### Slide 17 — Main Event 11/20 (`offer_ttl_expired`): Báo giá trôi hết thời gian chờ *(1,0 phút)*
- **[Hành động]:** Chỉ vào nhãn hồng `Ưu đãi đã hết hạn` góc trên bên phải thẻ.
- **[Lời thoại gợi ý]:**
  > "Mục 11 là `offer_ttl_expired` — khi báo giá hết 60 phút hiệu lực, giúp kiểm chứng báo giá gửi muộn lúc khách đã rời ứng dụng để xếp đúng vào nhóm mất hiển thị ở đầu phễu."

---

### Slide 18 — Main Event 12/20 (`explore_stay_modal_view`): Mở cửa sổ chi tiết — Hạng sao & Đánh giá *(1,0 phút)*
- **[Hành động]:** Chỉ vào 2 khung khoanh trên 2 ảnh: `0 (0 đánh giá)` bên trái và thông báo `Chưa có đánh giá nào từ khách hàng` bên phải.
- **[Lời thoại gợi ý]:**
  > "Bước vào cửa sổ chi tiết `explore_stays`, mục 12 (`explore_stay_modal_view`) bắt ngay rào cản lớn nhất của cụm **Khách thẩm định uy tín**: với cơ sở mới đang có **0 đánh giá**, khách mở ra thấy chưa có nhận xét nào là đóng trang rời đi ngay — giúp AI kích hoạt đúng khuyến nghị mở gói ưu đãi đón 5 đoàn khách đầu tiên."

---

### Slide 19 — Main Event 13/20 (`explore_stay_media_click`): Khách kiểm tra Thư viện ảnh & Video *(1,0 phút)*
- **[Hành động]:** Chỉ vào khung đỏ trên thanh bộ lọc thư viện ảnh, nhấn mạnh chữ `Video (0)` và `Điểm tham quan gần đó (0)`.
- **[Lời thoại gợi ý]:**
  > "Mục 13 (`explore_stay_media_click`) bắt chính xác khoảnh khắc khách bấm vào tab **Video (0)** đang bỏ trống rồi đóng trang thoát ra. Đây là nguyên nhân hàng đầu ở **Bước thua số 4 trên Phễu**, giúp AI chỉ thẳng việc cần làm là quay bổ sung Video thực tế phòng."

---

### Slide 20 — Main Event 14/20 (`explore_stay_scroll_summary`): Đọc kỹ mô tả phòng & chính sách phụ thu *(1,0 phút)*
- **[Hành động]:** Chỉ vào dòng mô tả diện tích `Phòng cao cấp 40–45 m²` và thẻ `Tùy chọn phòng`.
- **[Lời thoại gợi ý]:**
  > "Mục 14 (`explore_stay_scroll_summary`) đo thời gian khách đọc phần mô tả diện tích phòng, loại giường và quy định phụ thu trẻ em — phục vụ trực tiếp cho cụm **Khách gia đình lưu trú dài ngày**."

---

### Slide 21 — Main Event 15/20 (`explore_stay_ota_compare_click`): Đối chiếu giá với các kênh bên ngoài *(1,0 phút)*
- **[Hành động]:** Chỉ vào khung xanh lá bao quanh bảng `SO SÁNH GIÁ` với 4 kênh `A, B, T, E (OTA)`.
- **[Lời thoại gợi ý]:**
  > "Mục 15 — `explore_stay_ota_compare_click` — là dữ liệu trung tâm của cụm **Khách săn giá & so sánh sàn ngoài** cũng như **Bước thua số 3 trên Phễu**. Khi khách bấm đối chiếu giá thị trường, hệ thống đo chính xác ở mức giảm nào khách quay lại đặt phòng và ở mức giảm dưới 5% nào khách đóng trang rời đi — từ đó tìm ra vùng ưu đãi ngọt nhất **10% – 15%**."

---

### Slide 22 — Main Event 16/20 (`explore_stay_map_interact`): Mở bản đồ kiểm tra vị trí đi lại *(1,0 phút)*
- **[Hành động]:** Chỉ vào nút `Mở trên bản đồ` góc trái dưới và ghim vị trí khách sạn trên bản đồ.
- **[Lời thoại gợi ý]:**
  > "Mục 16 (`explore_stay_map_interact`) kết hợp với bộ `Sort theo Khoảng cách gần nhất` nhận diện nhóm khách đóng trang ngay sau khi đo đường đi trên bản đồ — giúp khách sạn bổ sung hướng dẫn phút di chuyển thực tế hoặc dịch vụ xe đón."

---

### Slide 23 — Main Event 17/20 (`explore_stay_select_click`): Quyết định bấm Chọn trong cửa sổ chi tiết *(1,0 phút)*
- **[Hành động]:** Chỉ vào nút xanh dương `Chọn và tiến hành thanh toán` ở cuối cửa sổ.
- **[Lời thoại gợi ý]:**
  > "Mục 17 (`explore_stay_select_click`) xác nhận khách đã vượt qua toàn bộ 4 bước sàng lọc về Hiển thị/`Sort`, Dịch vụ kèm theo, Đối chiếu giá và Hồ sơ Ảnh/Video/Đánh giá của khách sạn để quyết định chọn đặt phòng."

---

### Slide 24 — Main Event 18/20 (`payment_form_view`): Màn hình thanh toán — Tách ranh giới kỹ thuật nội bộ *(1,0 phút — CẬP NHẬT THEO CHỐT CỦA CTO)*
- **[Hành động]:** Chỉ vào màn hình kiểm tra thanh toán & quy đổi ngoại tệ, nhấn mạnh việc **tách khỏi AI của chủ khách sạn**.
- **[Lời thoại gợi ý]:**
  > "Sang 3 mục ở giai đoạn Thanh toán (`payment_form`), nhóm áp dụng nguyên tắc phân tách trách nhiệm rất dứt khoát:
  > Ở Mục 18 (`payment_form_view`), các yếu tố về biểu mẫu thanh toán hay hiển thị quy đổi ngoại tệ thuộc về trải nghiệm cổng thanh toán của nền tảng goodNstay. Chúng ta ghi nhận cho **đội Product & Payment nội bộ GNS** theo dõi tối ưu tỷ lệ chuyển đổi thanh toán, **không đưa vào AI của Dashboard chủ khách sạn**."

---

### Slide 25 — Main Event 19/20 (`payment_submit_attempt`): Sự cố lỗi thanh toán — Loại trừ cứng khỏi Phễu & AI Đối tác *(1,0 phút — CẬP NHẬT THEO CHỐT CỦA CTO)*
- **[Hành động]:** Chỉ vào cổng thanh toán `NHN KCP / PayPal` và nêu rõ quy tắc **loại trừ khỏi Phễu 4 bước và AI của khách sạn**.
- **[Lời thoại gợi ý]:**
  > "Đặc biệt ở Mục 19 (`payment_submit_attempt`): khi người dùng không tiếp tục thanh toán do **lỗi thẻ ngân hàng, rớt mạng hoặc lỗi cổng thanh toán kỹ thuật**, chủ khách sạn hoàn toàn không có quyền can thiệp hay sửa chữa.
  > Vì vậy, khác với cách tiếp cận cũ là đưa vào phễu đối tác, trên bản thiết kế chuẩn hóa này chúng ta **gỡ bỏ hoàn toàn nguyên nhân lỗi thanh toán ra khỏi Biểu đồ Phễu của khách sạn và tuyệt đối không đưa vào AI của Dashboard** — vừa tránh làm lệch Tỷ lệ thua thực tế của cơ sở, vừa giữ cho AI không đi lan man sang lỗi kỹ thuật thanh toán."

---

### Slide 26 — Main Event 20/20 (`payment_complete`): Hoàn tất thu tiền & Chốt đơn thành công *(1,0 phút + Chuyển lời)*
- **[Hành động]:** Chỉ vào khung xanh lá xác nhận đơn thành công `Review Your Booking Info — Total Price`.
- **[Lời thoại gợi ý]:**
  > "Chỉ khi giao dịch hoàn tất ở Mục 20 (`payment_complete`), đơn đặt phòng thành công và doanh thu thực nhận mới được đẩy thẳng lên thẻ KPI, Biểu đồ 1 và đáy Phễu chiến thắng của khách sạn."
- **[Câu chuyển lời mượt sang Bạn 3]:**
  > *"Sau khi đã khóa chặt biên dữ liệu đầu vào — bỏ thao tác nháp trước khi bấm Tìm bid và tách riêng lỗi thanh toán kỹ thuật khỏi AI — dữ liệu sạch này được chuẩn hóa chu kỳ thời gian, phân cụm chân dung du khách và đưa lên giao diện HTML 3 ngôn ngữ như thế nào? Em xin mời [Tên Bạn 3] trình bày và Demo trực tiếp ạ."*

---

## V. KỊCH BẢN CHI TIẾT TỪNG SLIDE DÀNH CHO BẠN 3 (SLIDE 27 → SLIDE 41 · ~15 PHÚT + CHỐT DUYỆT)

### Slide 27 — Tổng hợp về `dashboard_overview`, Độ trễ `T-1 (≥24h)` & Chu kỳ làm sạch `3–7 ngày` *(1,0 phút)*
- **[Hành động]:** Chỉ chuỗi tổng hợp dữ liệu và nhấn mạnh quy chuẩn **Độ trễ 24h + Chu kỳ làm sạch 3–7 ngày**.
- **[Lời thoại gợi ý]:**
  > "Em xin tiếp lời [Tên Bạn 2] đi vào Phần 3 và Phần 4. Khi tổng hợp dữ liệu sự kiện về `dashboard_overview` bằng các phép tính tỷ lệ rõ như Excel, nhóm thiết lập **hai quy tắc vận hành dữ liệu bắt buộc** và chú thích công khai ngay đầu Dashboard:
  > - Thứ nhất là **Độ trễ lấy dữ liệu tối thiểu 24 tiếng (`T-1`)**: ghi rõ ngày giờ chốt dữ liệu hành vi (ví dụ chốt đến `23:59` ngày hôm qua), tránh để chủ khách sạn hiểu lầm là vừa đổi giá vài phút trước thì biểu đồ AI nhảy ngay.
  > - Thứ hai là **Chu kỳ làm sạch dữ liệu 3 ngày (`72h`) đến 7 ngày**: các công cụ phân tích cần từ 3 đến 7 ngày để khử trùng lặp, lọc bot và gộp sự kiện gửi muộn cho 'sạch' hẳn — nên số liệu trong 3–7 ngày gần nhất luôn được gắn nhãn *số tạm tính* trước khi chốt cố định."

---

### Slide 28 — Phân cụm phân cấp (`Clustering`) & 3 ngưỡng cố định khóa chặt phạm vi AI *(1,0 phút)*
- **[Hành động]:** Điểm qua 3 cột Ngưỡng 01 (`Dưới 30%`), Ngưỡng 02 (`30% – 70%`), Ngưỡng 03 (`Trên 70%`) gắn với cây phân cấp hành vi.
- **[Lời thoại gợi ý]:**
  > "Để ngăn chặn triệt để việc AI tư vấn lan man khỏi phạm vi khách sạn, dữ liệu đầu vào trước khi qua 3 ngưỡng `<30% · 30–70% · >70%` được gom theo **Cây phân cụm phân cấp 3 tầng (Hierarchical Clustering)**:
  > - **Tầng 1:** Phân cụm 4 chân dung du khách (*C1: Khách săn giá & so sàn ngoài · C2: Khách gia đình cần tiện nghi & video · C3: Khách đặt gấp sát giờ · C4: Khách lọc theo đánh giá & khoảng cách*).
  > - **Tầng 2:** Gắn với hành vi thực tế và 5 tiêu chí `Sort` trên danh sách.
  > - **Tầng 3:** Khóa cứng vào đúng các đòn bẩy chủ khách sạn tự chỉnh được trên hệ thống (giá ưu đãi, gói bữa sáng, video phòng, chế độ Auto-bid & đa hạng phòng)."

---

### Slide 29 — Giải đáp Câu hỏi cốt lõi 01: Phân tích Giá trúng thầu gồm những góc độ nào? *(1,5 phút)*
- **[Hành động]:** Chỉ dọc 5 hàng từ Góc độ 01 đến Góc độ 05 và cột đích đến bên phải.
- **[Lời thoại gợi ý]:**
  > "Từ đó, nhóm xin trả lời **Câu hỏi lớn thứ nhất**: *Phân tích giá trúng thầu gồm những góc độ nào?*
  > Chúng ta soi chiếu qua **5 góc độ sau khi khách đã bấm Tìm bid**:
  > 1. **Góc độ Thị trường & `Sort` giá/tiết kiệm:** Mức ưu đãi % so với sàn ngoài và thứ hạng khi khách `Sort` theo Giá thấp / Tiết kiệm % (**Biểu đồ 2**).
  > 2. **Góc độ Thời điểm yêu cầu:** Khách đặt gấp sát giờ, lưu trú từ 3 đêm và tốc độ phản hồi Auto-bid (**Biểu đồ 3**).
  > 3. **Góc độ Gói phòng & Độ khớp:** Chào kèm từ 2 hạng phòng trở lên để tăng thứ hạng khi khách `Sort` theo Độ phù hợp (**Biểu đồ 3 + Cụm C3**).
  > 4 & 5. **Góc độ Chân dung đoàn khách & Phản xạ chốt nhanh:** Đưa vào tầng **Phân cụm chân dung (`C1`–`C4`)** để AI chọn lọc khuyến nghị sát nhất."

---

### Slide 30 — Giải đáp Câu hỏi cốt lõi 02: Tại sao không trúng thầu & Tỷ lệ thua qua 4 bước? *(1,5 phút)*
- **[Hành động]:** Chỉ sang các điểm dừng trên hành trình — nhấn mạnh việc **rút gọn thành đúng 4 bước thuộc tầm kiểm soát của khách sạn** (đã gỡ bỏ bước lỗi thanh toán) và đo **kép 2 chỉ số Tỷ lệ thua**.
- **[Lời thoại gợi ý]:**
  > "Trả lời **Câu hỏi lớn thứ hai**: *Tại sao không trúng thầu và Tỷ lệ thua nằm ở đâu?*
  > Sau khi đã loại bỏ hoàn toàn các lỗi cổng thanh toán kỹ thuật ra khỏi phễu đánh giá khách sạn, toàn bộ lượng báo giá thua thầu được bóc tách chính xác vào **4 bước thuộc quyền cải thiện của chủ khách sạn**, kèm **cả 2 cách tính Tỷ lệ thua** (Tỷ lệ thua tại từng bước và Tỷ lệ thua trên tổng báo giá):
  > - **Bước 1:** Khuất tầm nhìn do tụt hạng khi khách `Sort` danh sách hoặc gửi chậm ban đêm → Sửa bằng bật Auto-bid 24/7 & giữ mức giảm cạnh tranh.
  > - **Bước 2:** Từ chối ngay ngoài danh sách vì thiếu dịch vụ bắt buộc → Sửa bằng đóng gói Bữa sáng / Đậu xe.
  > - **Bước 3:** Rời đi sau khi đối chiếu giá thị trường & lọc `Sort` giá → **Chỉ ở bước này AI mới khuyên điều chỉnh ưu đãi về vùng 10% – 15%!**
  > - **Bước 4:** Đóng trang chi tiết vì trống mục Video phòng, 0 đánh giá hoặc khoảng cách → Sửa bằng đăng Video thực tế & gói đón khách đầu tiên."

---

### Slide 31 — Giải đáp Câu hỏi cốt lõi 03: Chọn lọc số liệu lên Biểu đồ & Khóa biên AI *(1,0 phút)*
- **[Hành động]:** Chỉ từ khối tổng hợp sang 3 nhóm phân tầng `01`, `02`, `03`.
- **[Lời thoại gợi ý]:**
  > "Và trả lời **Câu hỏi lớn thứ ba**: *Chọn lọc số liệu như thế nào?*
  > - **Nhóm 1 — Vẽ thành 5 Biểu đồ chính:** Doanh thu ngày, Vùng giá ngọt 10–15%, Nhóm yêu cầu & cách chào phòng, Phễu 4 bước kèm kép Tỷ lệ thua, và Xếp hạng lý do chi tiết.
  > - **Nhóm 2 — Tầng Phân cụm Chân dung (`C1`–`C4`) & 5 tiêu chí `Sort` nuôi AI:** Khóa chặt đầu vào để sinh ra đúng **3 thẻ khuyến nghị thiết thực nhất trong tuần**.
  > - **Nhóm 3 — Loại trừ cứng khỏi AI đối tác (Giữ cho Vận hành Nội bộ GNS):** Toàn bộ hành vi trước khi khách bấm Tìm bid và toàn bộ sự cố lỗi thẻ / cổng thanh toán."

---

### Slide 32 — Giao diện HTML mẫu: Đa ngôn ngữ `Việt · Anh · Hàn`, Mốc ngày lấy dữ liệu & KPI Thắng/Thua *(1,0 phút)*
- **[Hành động]:** Chỉ vào thanh Topbar (bộ chọn `Tiếng Việt / English / 한국어`, dòng ghi chú mốc dữ liệu `Số liệu tính đến 23:59 · DD/MM/YYYY`), và thẻ KPI thứ 3 (`18,7% / 81,3%`).
- **[Lời thoại gợi ý]:**
  > "Trên bản giao diện `ai-dashboard-proposal.html` mới nhất, ngay thanh đầu trang đã hỗ trợ chuyển đổi tức thì **3 ngôn ngữ Việt – Anh – Hàn** tương tự Partner Hub, đi kèm dòng chú thích gọn gàng ghi rõ **ngày giờ chốt dữ liệu hành vi (`23:59` ngày hôm qua — độ trễ tối thiểu 24 giờ)** mà không làm rối màn hình bằng các hộp cảnh báo kỹ thuật. Đồng thời ngay trên hàng KPI đầu trang, chủ khách sạn thấy trực diện cả **Tỷ lệ thắng lẫn Tỷ lệ thua (`18,7% / 81,3%`)**."

---

### Slide 33 — Biểu đồ 1: Doanh thu thực nhận & Số đơn thành công theo ngày (2 trục tung độc lập) *(0,8 phút)*
- **[Hành động]:** Chỉ vào cột trục tung trái màu xanh dương (`Số đơn`) ứng với các cột và cột trục tung phải màu xanh lá (`Doanh thu thực nhận`) ứng với đường doanh thu.
- **[Lời thoại gợi ý]:**
  > "Biểu đồ 1 được thiết kế chuẩn 2 trục tung độc lập: trục bên trái đo **Số đơn hoàn tất** (cột xanh dương), còn trục bên phải đo **Doanh thu thực nhận** (đường xanh lá) lấy trực tiếp từ sự kiện `payment_complete` — tự động quy đổi vạch chia tiền tệ (`tr ₫`, `만 ₩`, `$`) và ngày tháng theo đúng ngôn ngữ chủ khách sạn chọn."

---

### Slide 34 — Biểu đồ 2: Tỷ lệ chốt đơn theo mức ưu đãi giá so với thị trường (2 trục tung độc lập) *(1,0 phút)*
- **[Hành động]:** Chỉ đối chiếu cột trục tung trái (`Lượt báo giá`) với cột trục tung phải (`Tỷ lệ chốt %`) và vùng xanh lá `Giảm 10% – 15%` đạt đỉnh `46,2%`.
- **[Lời thoại gợi ý]:**
  > "Biểu đồ 2 đặt song song trục trái là **Số lượt báo giá gửi đi** và trục phải là **Tỷ lệ chốt đơn (%)** qua 5 dải giá: chủ khách sạn nhìn vào thấy ngay phần lớn lượt báo giá đang nằm ở vùng giảm nhẹ nhưng tỷ lệ thắng rất thấp, trong khi **vùng ưu đãi 10% – 15% vọt lên đỉnh chốt 46,2%**, giúp tránh giảm sâu trên 15% gây mất lãi."

---

### Slide 35 — Biểu đồ 3: Tỷ lệ chốt đơn theo nhóm yêu cầu & cách chào phòng *(0,9 phút)*
- **[Hành động]:** Chỉ vào 4 cặp thanh so sánh ngang (tính từ dữ liệu sau khi bấm Tìm bid `booking_form_complete`).
- **[Lời thoại gợi ý]:**
  > "Biểu đồ 3 tổng hợp thuần túy từ các yêu cầu đã gửi tìm phòng: chứng minh đón khách đặt gấp trong ngày, bật Auto-bid và chào từ 2 hạng phòng trở lên giúp nâng tỷ lệ thắng gấp 2,0 đến 2,6 lần."

---

### Slide 36 — Biểu đồ 4: Phễu 4 bước khách rời đi & Kép 2 chỉ số Tỷ lệ thua *(2,2 phút — CHUYỂN QUA TAB HTML THAO TÁC TRỰC TIẾP!)*
- **[Hành động quan trọng]:** Chuyển sang **Tab trình duyệt `ai-dashboard-proposal.html`**, cuộn tới **Biểu đồ 4**, chỉ vào huy hiệu đỏ **`Tổng tỷ lệ thua: 81,3% (74/91 lượt)`**, di chuột qua 4 tầng phễu bên trái, bấm chọn từng dòng trên bảng Excel bên phải, và đổi thử ngôn ngữ sang **`English` / `한국어`**!
- **[Lời thoại gợi ý]:**
  > "Em xin chuyển sang Tab HTML thật để thao tác trực tiếp **Biểu đồ Phễu 4 bước** đã cập nhật đầy đủ các góp ý ạ.
  > *(Thao tác trên HTML)* Anh có thể thấy ngay góc phải tiêu đề hiển thị rõ **Tổng tỷ lệ thua: 81,3% (74/91 lượt)** đặt cạnh **Tỷ lệ thắng: 18,7% (17/91 đơn)**, và bước lỗi thanh toán kỹ thuật đã được gỡ hoàn toàn khỏi phễu khách sạn.
  > Trên từng tầng phễu bên trái và trong bảng tổng hợp kiểu Excel bên phải, hệ thống hiển thị **đồng thời cả hai tỷ lệ thua**: một là **Tỷ lệ thua ngay tại bước đó** (ví dụ ở Bước 2: 78 khách nhìn thấy nhưng 24 khách từ chối → *Thua 30,8% tại bước*), và hai là **Tỷ lệ thua trên tổng 91 báo giá ban đầu** (*26,4% tổng gửi*, cộng dọc 4 bước khớp đúng *81,3%* tổng tỷ lệ thua)."

---

### Slide 37 — Biểu đồ 5: Xếp hạng chi tiết các dịch vụ còn thiếu & lý do đóng trang *(0,8 phút)*
- **[Hành động]:** Chỉ nhanh Biểu đồ 5 ngay dưới Phễu trên Tab HTML.
- **[Lời thoại gợi ý]:**
  > "Ngay bên dưới Phễu, Biểu đồ 5 bóc tách chi tiết số lượt của Bước 2 (`24 lượt` từ chối ngoài danh sách) và Bước 4 (`19 lượt` đóng trang chi tiết) — khi đổi kỳ sang *7 ngày qua*, toàn bộ con số trên Phễu, Biểu đồ 5 và lời giải thích bên dưới đều tự động đồng bộ khớp nhau 100%."

---

### Slide 38 — Khối Đề xuất điều chỉnh kinh doanh trong tuần (Khách sạn đang hoạt động) *(1,3 phút — DEMO TRỰC TIẾP TRÊN TAB HTML)*
- **[Hành động]:** Cuộn xuống khối **Đề Xuất Điều Chỉnh Kinh Doanh Trong Tuần** ở cuối trang HTML.
- **[Lời thoại gợi ý]:**
  > "Cuối trang là khối **Đề xuất điều chỉnh kinh doanh trong tuần** được giữ nguyên thiết kế tối giản, điềm đạm cho chủ khách sạn — toàn bộ phần phân cụm chân dung du khách và quy tắc lọc dữ liệu chạy ngầm phía sau chứ không phơi bày sơ đồ kỹ thuật lên màn hình đối tác.
  > Nhờ đã khóa chặt phạm vi và loại bỏ hoàn toàn thẻ lỗi thanh toán cũ, hệ thống chỉ lọc ra đúng 3 việc thiết thực nhất thuộc quyền tự quyết của chủ khách sạn: (1) chỉnh ưu đãi về vùng 10–15% để tăng hạng khi khách sắp xếp theo giá và giữ chân sau bước đối chiếu, (2) bổ sung Video phòng & gói Bữa sáng, và (3) bật báo giá tự động ban đêm kèm chào từ 2 hạng phòng trở lên để đón tệp khách đặt gấp."

---

### Slide 39 — Phóng cận cảnh cấu trúc thẻ AI & Nút tra cứu nguồn sự kiện gốc *(0,8 phút)*
- **[Hành động]:** Bấm nút **`Xem nguồn sự kiện thu thập`** trên thanh Topbar của Tab HTML cho CTO xem các nhãn xanh `booking_form_complete`, `offer_listing_sort_change`, `explore_stay_ota_compare_click`, đồng thời bấm đổi nhanh sang **`한국어`** hoặc **`English`**.
- **[Lời thoại gợi ý]:**
  > "Khi bấm bật **`Xem nguồn sự kiện thu thập`**, mọi biểu đồ, tiêu chí `Sort` và thẻ AI đều hiện rõ sự kiện gốc phía sau — kiểm chứng trực tiếp rằng không còn bất kỳ sự kiện trước Tìm bid hay sự kiện lỗi thanh toán nào lọt vào AI, và hỗ trợ trọn vẹn 3 ngôn ngữ **Tiếng Việt · Tiếng Anh · Tiếng Hàn**."

---

### Slide 40 — Tự động thích ứng khi chuyển sang Khách sạn mới khai trương (`Tỷ lệ thua 100%`) *(0,9 phút)*
- **[Hành động]:** Chọn dropdown chuyển sang **`Khách sạn mẫu B — Mới khai trương (75 lượt báo giá · Chưa có đơn)`**.
- **[Lời thoại gợi ý]:**
  > "Khi chuyển sang **Khách sạn mẫu B mới khai trương**, Tổng tỷ lệ thua hiện rõ `100,0% (75/75 lượt)` — trong đó Bước 1 chỉ rõ 19 lượt bị trôi xuống đáy khi khách `Sort theo Điểm đánh giá cao`, và Bước 4 chỉ rõ 35 lượt đóng trang vì e ngại 0 đánh giá. Ba thẻ AI lập tức đổi sang khuyên mở gói đón 5 đoàn đầu tiên để lấy đánh giá và quay ngay Video phòng."

---

### Slide 41 — Tổng kết & Xin ý kiến phê duyệt từ CTO *(1,5 phút)*
- **[Hành động]:** Quay lại Slide 41 cuối cùng, trình bày dứt khoát 3 hạng mục xin chốt quyết định.
- **[Lời thoại gợi ý]:**
  > "Để khép lại phần trình bày, nhóm em xin tổng kết **3 hạng mục đã chuẩn hóa để xin ý kiến phê duyệt triển khai từ anh CTO**:
  > 1. **Thống nhất Biên dữ liệu & Chu kỳ làm sạch:** Chỉ đưa vào AI đối tác các sự kiện **sau khi khách bấm Tìm bid (`booking_form_complete`)**, loại trừ hoàn toàn lỗi thanh toán kỹ thuật, tính đủ 5 tiêu chí `Sort`, và công khai độ trễ `T-1 (≥24h)` kèm chu kỳ làm sạch `3–7 ngày`.
  > 2. **Thống nhất Phễu 4 bước thuộc tầm tay khách sạn & Kép 2 chỉ số Tỷ lệ thua:** Hiển thị minh bạch cả Tỷ lệ thua tại từng bước lẫn Tỷ lệ thua trên tổng báo giá.
  > 3. **Thống nhất Cây phân cụm chân dung du khách (`C1`–`C4`) khóa phạm vi AI & Giao diện đa ngôn ngữ (`Việt · Anh · Hàn`):** Đảm bảo AI chỉ khuyến nghị đúng đòn bẩy kinh doanh của khách sạn, trình bày điềm đạm, dễ hiểu cho chủ khách sạn 50–60 tuổi.
  >
  > Nhóm em rất mong nhận được ý kiến chỉ đạo của anh để triển khai sang các bước tiếp theo ạ. Em xin cảm ơn anh và mọi người!"

---

## VI. CẨM NANG TRẢ LỜI NHANH 5 CÂU HỎI PHẢN BIỆN KHÓ TỪ CTO (Q&A CHEAT SHEET)

| Câu hỏi CTO có thể đặt ra | Ai trả lời chính | Cách trả lời ngắn gọn, đúng trọng tâm kỹ thuật & kinh doanh |
| :--- | :---: | :--- |
| **1. "Tại sao phải chú thích cả độ trễ `≥ 24 tiếng` lẫn chu kỳ làm sạch `3–7 ngày` trên Dashboard?"** | **Bạn 3** | Dạ vì pipeline phân tích hành vi (như GA4 → BigQuery) xuất dữ liệu theo lô ngày (`T-1`, trễ ít nhất 24h) và cần **72 giờ (3 ngày) đến 7 ngày** để khử trùng lặp, lọc bot và gộp các sự kiện gửi muộn khi điện thoại khách mất mạng mở lại. Ghi rõ giúp chủ khách sạn hiểu số 3–7 ngày gần nhất là *số tạm tính*, không thắc mắc khi số liệu chỉnh nhẹ sau đối soát. |
| **2. "Làm sao đảm bảo khi nối LLM/AI vào thì AI không đi lan man sang lỗi hệ thống hay tư vấn ngoài phạm vi?"** | **Bạn 3** | Dạ nhờ **2 chốt chặn cứng**: (1) Lọc từ tầng ETL — cắt bỏ toàn bộ sự kiện trước `booking_form_complete` và toàn bộ sự cố `payment_fail` khỏi bảng dữ liệu cấp cho AI đối tác; (2) Gom sẵn chỉ số vào **Cây phân cấp 3 tầng (`4 Cụm chân dung C1–C4` → `Hành vi & 5 kiểu Sort` → `Đòn bẩy khách sạn`)** kết hợp 3 ngưỡng `<30% · 30–70% · >70%`, AI chỉ được diễn giải bên trong khung đã khóa này. |
| **3. "Hiện giao diện danh sách báo giá chưa chốt cứng các nút `Sort` cuối cùng thì thiết kế dữ liệu thế nào để không phải sửa lại?"** | **Bạn 2** | Dạ sự kiện `offer_listing_sort_change` được thiết kế truyền tham số mở `sort_by` (đã dự trù sẵn đầy đủ 5 tiêu chí phổ biến nhất: `sort_price_asc`, `sort_saving_desc`, `sort_rating_desc`, `sort_match_desc`, `sort_distance_asc`). Khi UI chốt bật những tiêu chí nào thì dữ liệu tự động đổ vào đúng nhánh phân cụm đó mà không cần sửa cấu trúc bảng. |
| **4. "Khi gỡ Tầng 5 (Lỗi thanh toán) khỏi Phễu của khách sạn thì các đơn lỗi thẻ đó đi đâu, có bị thất lạc theo dõi không?"** | **Bạn 2** | Dạ hoàn toàn không thất lạc ạ. Các sự kiện `payment_form_view` và `payment_submit_attempt` / `payment_fail` vẫn được thu thập đầy đủ nhưng đẩy sang **Bảng giám sát Vận hành Thanh toán Nội bộ của goodNstay** để đội kỹ thuật tối ưu cổng `NHN KCP / PayPal` và cứu đơn; chỉ tách khỏi Phễu & AI của chủ khách sạn vì khách sạn không tự sửa lỗi thẻ ngân hàng được. |
| **5. "Bắn chuỗi sự kiện hành vi và `Sort` trên điện thoại khách hàng có làm chậm tốc độ tải trang không?"** | **Bạn 2 / Bạn 3** | Dạ không làm chậm thao tác của khách ạ. Toàn bộ sự kiện hành vi (`offer_listing_sort_change`, `offer_card_impression`, `explore_stay_scroll_summary`) đều gửi **bất đồng bộ chạy ngầm (non-blocking beacon / batch queue)** sau khi giao diện đã hiển thị xong, nối xuyên suốt bằng chuỗi khóa `request_id` → `offer_id` → `view_session_id` → `booking_id`. |
