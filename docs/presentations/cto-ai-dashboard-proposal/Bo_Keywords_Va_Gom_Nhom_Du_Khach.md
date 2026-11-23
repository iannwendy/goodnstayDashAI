# Bộ Keywords & Quy Tắc Gom Nhóm Du Khách (`C1 – C4`) — Bản Gọn Trình Bày CTO

> **Nguyên tắc biên dữ liệu:** Chỉ lấy dữ liệu **từ lúc khách bấm Tìm bid (`booking_form_complete`)**, loại bỏ hoàn toàn thao tác nháp trước đó và lỗi thanh toán kỹ thuật.

---

## 1. Tìm Keywords ở đâu? (Đối chiếu Slides + Thực tế `goodnstay.com`)

| Nguồn dữ liệu | Lấy từ đâu? | Các trường / tín hiệu thực tế |
| :--- | :--- | :--- |
| **1. Ô tích chọn lúc gửi Tìm bid** *(Có trong Slides 08–11 & UI thật — phủ 100% khách)* | Bản chốt `booking_form_complete` | • Thời điểm & số đêm: `Đặt gấp 0–1 ngày`, `Ở dài ≥ 3 đêm`<br>• Đoàn khách: `Đi lẻ 1 người`, `Trẻ em / Em bé`, `Thú cưng`, `Nhiều phòng`<br>• Loại chỗ ở & phòng: `Khách sạn / Căn hộ / Villa / Resort / Pension`, `Phòng bất kỳ` vs `Suite / Executive`<br>• **11 ô dịch vụ thật:** `Bữa sáng`, `Hồ bơi`, `Wifi`, `Bãi đậu xe`, `Thú cưng`, `Trả phòng trễ`, `Tiện ích phòng`, `Truyền hình`, `Giặt ủi`, `Thang máy`, `Xe lăn` |
| **2. Hành vi bấm sau khi nhận báo giá** *(Có trong Slides 12–23, 26 & UI thật)* | `offer_listing` + `explore_stays` + `payment_receipt_action` | • **5 kiểu Sort:** `Giá thấp nhất` · `Tiết kiệm % cao` · `Đánh giá cao` · `Độ phù hợp` · `Khoảng cách gần`<br>• **Hành động thẻ ngoài:** Bấm `So sánh giá OTA`, đổi hạng phòng `<1/N>`, `Chọn ngay` ngoài thẻ, hoặc `Từ chối` (báo thiếu dịch vụ gì)<br>• **Hành động trang chi tiết:** Mở tab `Video / Ẩm thực / Tiện ích / Phòng / Điểm gần đó`, bấm xem `Đánh giá`, mở `Bản đồ`, tải `Hóa đơn PDF` |
| **3. Chữ tự do (`Free-text`)** *(Có trên API thật `goodnstay.com`, bổ sung vào Schema)* | `request.notes` + `review` cũ | • **Ô ghi chú yêu cầu riêng (`data.notes`)** khi khách gửi Tìm bid (~15–30% khách gõ chữ)<br>• **Bài nhận xét cũ (`review`)** của tài khoản đó ở các chuyến trước (`Việt · Anh · Hàn`) |

---

## 2. Bộ Keywords Chi Tiết & Gom Thành 4 Nhóm Chính (`C1 – C4`)

### Nhóm `C1` — Khách Săn Giá & So Sánh Sàn Ngoài
- **Tín hiệu bấm chọn & Hành vi:**
  - Bấm **`Sort: Giá thấp nhất`** hoặc **`Sort: Mức tiết kiệm % cao`**
  - Bấm mở bảng **`So sánh giá OTA`** (Agoda / Booking / Traveloka / Expedia)
  - Tích **`Phòng bất kỳ` + `Giường bất kỳ`** (không kén tiện ích phụ), hoặc bấm **`Chọn ngay`** ngoài thẻ khi thấy ưu đãi giảm `≥ 10%`
- **Keywords chữ tự do (`notes` / `review`):**
  - **Tiếng Việt:** `giá rẻ`, `tiết kiệm`, `ngân sách thấp`, `phòng cơ bản`, `khuyến mãi`, `rẻ hơn agoda`, `khớp giá`, `không phụ thu`, `đã gồm thuế phí`, `không phí ẩn`
  - **English:** `budget`, `cheapest`, `lowest price`, `affordable`, `promo`, `price match`, `better deal`, `no hidden fee`, `no extra charge`, `all inclusive price`
  - **한국어:** `저렴한`, `가성비`, `최저가`, `특가`, `할인`, `가격비교`, `추가요금 없이`, `세금포함`
- **Khóa phạm vi AI khuyên khách sạn:** Điều chỉnh ưu đãi về vùng ngọt **`10% – 15%`** so với sàn ngoài (tránh giảm quá sâu mất lãi).

---

### Nhóm `C2` — Khách Gia Đình, Cặp Đôi & Nghỉ Dưỡng Cần Tiện Nghi
- **Tín hiệu bấm chọn & Hành vi:**
  - Bấm **`Sort: Độ phù hợp cao nhất`**
  - Có **`Trẻ em / Em bé`**, mang **`Thú cưng`**, đặt **`≥ 2 phòng`** hoặc lưu trú dài **`≥ 3 đêm`**
  - Chọn `Resort / Villa / Căn hộ` hoặc hạng `Suite`; tích **`Bữa sáng`**, **`Hồ bơi`**, **`Bãi đậu xe`**, **`Giặt ủi`**, **`Thang máy`**, **`Xe lăn`**
  - Bấm xem tab **`Ẩm thực` / `Tiện ích`**, bấm chuyển xem phòng nâng cấp `<1/N>`, hoặc từ chối báo giá vì thiếu `Bữa sáng / Đậu xe`
- **Keywords chữ tự do (`notes` / `review`):**
  - **Tiếng Việt:** `nôi em bé`, `cũi trẻ em`, `trẻ nhỏ`, `gia đình`, `bố mẹ lớn tuổi`, `tầng thấp`, `ăn sáng`, `buffet sáng`, `đồ chay`, `dị ứng`, `trăng mật`, `kỷ niệm`, `sinh nhật`, `bồn tắm`, `phòng thông nhau`, `đậu xe ô tô`, `chó mèo`
  - **English:** `baby cot`, `crib`, `infant`, `kids`, `family`, `elderly`, `wheelchair`, `low floor`, `free breakfast`, `buffet`, `vegetarian`, `honeymoon`, `anniversary`, `birthday`, `bathtub`, `connecting rooms`, `parking`, `pet friendly`
  - **한국어:** `아기침대`, `유아`, `아이와`, `가족여행`, `부모님`, `어르신`, `휠체어`, `저층`, `조식포함`, `뷔페`, `채식`, `신혼여행`, `허니문`, `기념일`, `욕조`, `커넥팅룸`, `주차장`, `반려견`
- **Khóa phạm vi AI khuyên khách sạn:** Đóng gói sẵn **`Bữa sáng / Đậu xe`**, mở bán linh hoạt **`2–3 hạng phòng`** (có phòng gia đình/thông nhau).

---

### Nhóm `C3` — Khách Đặt Gấp Sát Giờ & Công Tác Cần Nhanh Gọn
- **Tín hiệu bấm chọn & Hành vi:**
  - Đặt sát giờ nhận phòng **`0 – 1 ngày`** (`lead_time_days <= 1`), ở ngắn `1 – 2 đêm`
  - Mở xem báo giá ngay trong **`2 phút đầu`** và chốt nhanh báo giá phản hồi tự động (`Auto-bid`) đầu tiên
  - Đi lẻ **`1 người lớn`** khu trung tâm, tích **`Trả phòng trễ`** / **`Wifi`**, đặt hộ người khác (`guest_same_as_booker = false`), hoặc bấm **`Tải hóa đơn PDF`** sau thanh toán
- **Keywords chữ tự do (`notes` / `review`):**
  - **Tiếng Việt:** `nhận phòng ngay`, `đang tới`, `tới khuya`, `check in muộn`, `cần phòng gấp`, `nhận phòng sớm`, `check in sớm`, `trả phòng trễ`, `gửi hành lý`, `công tác`, `xuất hóa đơn`, `hóa đơn đỏ`, `hóa đơn VAT`, `bàn làm việc`, `wifi mạnh`
  - **English:** `arriving tonight`, `late check-in`, `midnight arrival`, `urgent`, `instant confirmation`, `early check-in`, `late check-out`, `luggage storage`, `business trip`, `tax invoice`, `VAT invoice`, `company receipt`, `work desk`, `fast wifi`
  - **한국어:** `오늘 입실`, `늦은 체크인`, `심야 도착`, `급하게`, `빠른 확정`, `얼리 체크인`, `레이트 체크아웃`, `짐보관`, `출장`, `세금계산서`, `영수증 발급`, `법인카드`, `업무용 책상`
- **Khóa phạm vi AI khuyên khách sạn:** Bật **`Auto-bid 24/7`** (đặc biệt khung đêm) và thêm tùy chọn **`Nhận sớm / Trả phòng trễ`**.

---

### Nhóm `C4` — Khách Kỹ Tính Thẩm Định Đánh Giá, Hình Ảnh & Vị Trí
- **Tín hiệu bấm chọn & Hành vi:**
  - Bấm **`Sort: Điểm đánh giá cao`** hoặc **`Sort: Khoảng cách gần nhất`**
  - Bấm mở đọc chi tiết **`Đánh giá (Review)`**, thoát nhanh nếu khách sạn `0 đánh giá`
  - Mở thư viện bấm tab **`Video`**, xem `≥ 4 ảnh/video`, đọc kỹ mô tả phòng (`≥ 8 giây`), hoặc phóng to / mở **`Bản đồ (Google Maps)`**
- **Keywords chữ tự do (`notes` / `review`):**
  - **Tiếng Việt:** `sạch sẽ`, `không hút thuốc`, `không mùi thuốc lá`, `cách âm`, `yên tĩnh`, `xa thang máy`, `an ninh`, `view biển`, `hướng biển`, `tầng cao`, `ban công`, `cửa sổ lớn`, `đúng như hình`, `gần biển`, `đi bộ ra biển`, `gần trung tâm`, `gần ga tàu`, `đưa đón sân bay`
  - **English:** `clean`, `spotless`, `non-smoking`, `smoke-free`, `soundproof`, `quiet room`, `away from elevator`, `sea view`, `ocean view`, `high floor`, `balcony`, `big window`, `walking distance`, `near beach`, `near metro`, `city center`, `airport shuttle`
  - **한국어:** `청결`, `깨끗한`, `금연실`, `담배냄새 없는`, `방음`, `조용한 방`, `엘리베이터에서 먼`, `오션뷰`, `바다전망`, `고층`, `발코니`, `창문 있는 방`, `역세권`, `해변 도보`, `시내 중심`, `공항 픽업`
- **Khóa phạm vi AI khuyên khách sạn:** Quay bổ sung **`Video phòng thực tế`**, ghi rõ **số phút di chuyển** tới biển/ga tàu, và bật **gói ưu đãi đón khách đầu tiên** (với khách sạn mới `0 đánh giá`).

---

## 3. Tóm Tắt 3 Ý Cốt Lõi Để Nói Nhanh Khi Trình Bày (30 giây)

1. **Cách bắt chữ tự do (`Phương án C`):** Quét 2 tầng — **Tầng 1** dò trực tiếp Bộ Keywords 3 ngôn ngữ ở trên kèm lọc từ phủ định (*"không / no / 없이"*), bắt ngay ~80% câu phổ biến với chi phí `0đ`; **Tầng 2** chỉ dùng AI nhẹ khóa cứng danh mục để gán nhãn ~20% câu viết dài/lạ trong luồng tổng hợp đêm `T-1`.
2. **Cách chốt ra đúng 1 nhóm chính duy nhất (Giai đoạn 1):** Cộng điểm trọng số theo mức độ chủ động của khách: **Gõ chữ trong `notes` (`+4đ`) > Hành vi `Sort / Xem chi tiết` (`+3,5đ`) > Ô tích chọn lúc Tìm bid (`+2đ`) > Review cũ (`+1đ`)** $\rightarrow$ Nhóm nào cao điểm nhất lấy **1 nhóm duy nhất** (100% đơn đều có nhóm kể cả khi không gõ `notes`).
3. **Lộ trình lên Máy học (Giai đoạn 2):** Khi tích lũy đủ dữ liệu đã làm sạch qua chu kỳ `3–7 ngày`, chuyển bảng mã Keywords này thành vector chạy gom cụm máy học (`Hierarchical / K-Means`) để tự tinh chỉnh trọng số, nhưng vẫn **khóa chặt đầu ra** chỉ khuyên những việc khách sạn tự sửa được.
