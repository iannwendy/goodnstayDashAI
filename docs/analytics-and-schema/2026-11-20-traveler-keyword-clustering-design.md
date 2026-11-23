# Thiết Kế Từ Điển Keywords Đa Nguồn & Quy Tắc Phân Cụm Du Khách 2 Giai Đoạn (`C1–C4`) Cho Partner AI Dashboard

**Ngày lập:** 2026-11-20  
**Phạm vi áp dụng:** Hệ thống Phân tích Đấu thầu & AI Chẩn đoán trên `Optibide Partner Hub` + Bộ tài liệu chốt thiết kế cùng CTO (`[GNS] Database Schema`, Bộ Slide 41 trang `v9+` và Kịch bản 45 phút).  
**Ngôn ngữ dữ liệu hỗ trợ:** 3 ngôn ngữ (`Tiếng Việt · English · 한국어`).

---

## 1. Mục Đích & Lý Do (Intent & Why)

Trong bộ Slide trình bày với CTO (Slides 27–31), mô hình đã xác lập nguyên tắc **phân cụm chân dung du khách (`C1–C4`) ở tầng dữ liệu ngầm** nhằm khóa chặt phạm vi tư vấn của AI vào các đòn bẩy khách sạn tự kiểm soát được. Tuy nhiên, khi dữ liệu sự kiện thực tế đổ về thành một khối lớn gồm cả **thao tác bấm chọn** lẫn **văn bản khách tự gõ (`free-text`)**, đội ngũ Kỹ thuật / Dữ liệu và buổi bảo vệ trước CTO cần lời giải tường minh cho 3 câu hỏi thực thi:

1. **Tìm Keywords ở đâu để không sót và không ảo?** Đối chiếu 1-1 giữa **Slides / `[GNS] Database Schema`** và **sản phẩm thực tế (`goodnstay.com` / API `POST /api/traveler/request-bids` + Đánh giá của khách)** để xác lập danh mục tín hiệu có thật 100%.
2. **Trích xuất Keywords từ `free-text` đa ngôn ngữ như thế nào?** Giải quyết bài toán 70%–85% khách để trống ô ghi chú (`notes = ""`) trong khi 15%–30% khách gõ yêu cầu tự nhiên bằng tiếng Việt (có dấu/không dấu), tiếng Anh, tiếng Hàn hoặc câu phủ định.
3. **Xếp mỗi yêu cầu vào đúng 1 cụm chính duy nhất ra sao qua 2 giai đoạn?** Minh bạch hóa công thức chấm điểm trọng số ở **Giai đoạn 1 (Rule-based Scoring)** và lộ trình chuyển sang **Giai đoạn 2 (Machine Learning Clustering)** trên dữ liệu sạch chu kỳ `3–7 ngày` mà không bao giờ phá vỡ ranh giới phạm vi AI của khách sạn.

---

## 2. Mục Tiêu, Ngoài Phạm Vi & Điều Cấm Kỵ (Goals, Non-Goals & Anti-Goals)

### Mục tiêu (Goals)
1. ** Chuẩn hóa Bộ Từ Điển Keywords & Tín Hiệu Gốc (`Master Keyword & Signal Taxonomy`)** gộp cả **dữ liệu có cấu trúc (checkbox + hành vi bấm)** và **2 nguồn `free-text` có thật sau mốc bấm Tìm bid** (`notes` trong yêu cầu đặt phòng và `review` lịch sử đánh giá).
2. **Bổ sung khoảng trống dữ liệu giữa Thực tế và Slides:** Đưa thêm tham số trích xuất từ trường `notes` (`has_request_notes`, `extracted_note_keywords`) của `POST /api/traveler/request-bids` vào sự kiện chốt yêu cầu `booking_form_complete` trên Schema và tài liệu thuyết trình CTO.
3. **Thiết kế Pipeline Bóc tách 2 Tầng (`Phương án C — Hybrid Waterfall`)** cho dữ liệu `free-text` trên 3 ngôn ngữ (`VI · EN · KO`): Tầng 1 dò từ điển chuẩn + luật phủ định (0 chi phí, bắt ~80% câu phổ biến); Tầng 2 dùng model ngôn ngữ nhẹ khóa cứng danh mục nhãn (`Closed-Taxonomy LLM Tagging`) trong job đêm `T-1` cho các câu phức tạp còn lại.
4. **Thiết kế Công thức Chấm điểm Gán 1 Cụm Chính Duy Nhất (`C1–C4`) cho Giai đoạn 1** kèm quy tắc phá hòa (`Tie-breaker`) cố định, đảm bảo 100% yêu cầu sau khi bấm Tìm bid đều có đúng 1 nhãn cụm duy nhất.
5. **Thiết kế Kiến trúc Gom cụm Máy học cho Giai đoạn 2** (điều kiện kích hoạt theo cỡ mẫu, cấu trúc vector đặc trưng, thuật toán phân cấp + K-Means trên cửa sổ dữ liệu sạch `3–7 ngày` và cơ chế khóa cứng đầu ra khuyến nghị).
6. **Cập nhật đồng bộ gói tài liệu CTO** *(Quyết định của Builder)*: Xuất bản tài liệu chuyên đề *Từ điển Keywords & Quy tắc Phân cụm AI* phục vụ Dev/Data & phụ lục hỏi đáp CTO, đồng thời cập nhật nhẹ Slide 11, Slide 28 và Kịch bản 45 phút để phản ánh rõ cơ chế bóc Keyword `Thẻ chọn + Hành vi + Free-text (notes/review)`.

### Ngoài phạm vi (Non-Goals)
- **Không sửa giao diện `ai-dashboard-proposal.html` phía chủ khách sạn:** Toàn bộ bộ máy bóc tách keyword và phân cụm `C1–C4` chạy ngầm ở tầng dữ liệu phía sau; màn hình chủ khách sạn giữ nguyên sự tối giản hiện tại (5 KPI, 5 biểu đồ, 3 thẻ đề xuất hành động).
- **Không bịa thêm ô nhập chữ mới trên sản phẩm khách hàng:** Không thêm ô gõ lý do từ chối báo giá bằng chữ hay khung chat nếu sản phẩm thực tế chưa mở.
- **Không sửa mã nguồn ứng dụng React trong `dashboard/dashboard`** ở phạm vi tài liệu thiết kế này (tránh ảnh hưởng các thay đổi Master Data đang có trong workspace).

### Điều cấm kỵ (Anti-Goals)
- **Không đưa dữ liệu ngoài biên vào vector phân cụm:** Tuyệt đối không đưa các thao tác nháp trước khi bấm nút **Tìm bid (`booking_form_complete`)** và không đưa các sự cố lỗi thẻ / lỗi cổng thanh toán (`payment_submit_attempt`, `payment_fail`, `payment_session_interrupted`) vào bộ chấm điểm hay vector máy học của AI đối tác.
- **Không lưu hoặc truyền thông tin định danh cá nhân (`PII`) từ `notes` / `review` sang AI:** Mọi số điện thoại, email, số căn cước/hộ chiếu hoặc tên riêng khách gõ trong `notes` phải được che lọc (`PII scrubbing`) trước khi tách keyword và lưu kho phân tích.
- **Không để AI tự đặt lời khuyên ngoài danh mục đòn bẩy khách sạn:** Dù ở Giai đoạn 1 hay Giai đoạn 2, nhãn cụm chỉ được ánh xạ vào tập hành động mà cơ sở lưu trú kiểm soát được (mức ưu đãi giá, bật Auto-bid 24/7, chào đa hạng phòng, đóng gói bữa sáng/đậu xe/trả trễ, bổ sung ảnh/video thực tế, ghi rõ khoảng cách di chuyển, gói đón khách đầu tiên lấy đánh giá).

---

## 3. Các Phương Án Đã Cân Nhắc (Approaches)

1. **Phương án A — Từ điển Tĩnh 3 ngôn ngữ (Regex / Khớp từ) + Chấm điểm Trọng số *(Loại bỏ)*:**
   - *Ưu điểm:* Chi phí `0đ`, chạy thuần SQL/Python, dễ giải thích.
   - *Nhược điểm:* Bỏ sót tiếng Việt không dấu, từ viết tắt, câu pha trộn Anh–Việt–Hàn và dễ bắt nhầm ngữ cảnh phủ định phức tạp trong `notes` hoặc `review`.
2. **Phương án B — Đưa 100% dòng có `free-text` qua LLM bóc nhãn khóa danh mục + Chấm điểm Trọng số *(Loại bỏ)*:**
   - *Ưu điểm:* Hiểu ngữ cảnh và câu phủ định tốt trên cả 3 ngôn ngữ.
   - *Nhược điểm:* Tốn chi phí gọi model cho cả những câu ghi chú rất ngắn và lặp lại hàng ngày (*"early check-in"*, *"high floor"*, *"cần nôi em bé"*), thiếu bảng từ khóa tường minh ngay ở tầng đầu.
3. **Phương án C — Kết hợp 2 tầng lọc (`Hybrid Waterfall`: Từ điển chuẩn bắt 80% + AI khóa danh mục bắt 20% câu khó) + Chấm điểm Trọng số GĐ1 $\rightarrow$ Máy học GĐ2 *(Đã chọn)*:**
   - *Lý do chọn:* Vừa có **Bảng Từ điển Keywords 3 ngôn ngữ tường minh** để trình bày thuyết phục CTO và chạy tức thì không tốn phí cho đại đa số câu phổ biến, vừa có lưới hứng thông minh trong job đêm `T-1` cho các câu tự nhiên phức tạp, đồng thời tự động bồi đắp từ mới vào từ điển sau mỗi chu kỳ làm sạch `3–7 ngày`.

---

## 4. Nguồn Tìm Keywords: Đối Chiếu Thực Chứng Slides vs. Thực Tế Sản Phẩm

Kết quả rà soát đối chiếu giữa **41 Slides / `[GNS] Database Schema.xlsx`** và **hệ thống thực tế (`goodnstay.com` UI + payload `POST /api/traveler/request-bids`)** xác lập **3 nhóm nguồn tín hiệu hợp lệ** (chỉ tính từ thời điểm khách bấm gửi yêu cầu `booking_form_complete` trở đi):

| Nhóm nguồn | Có trong Slides / Schema hiện tại? | Có trên Thực tế `goodnstay.com`? | Trường dữ liệu gốc & Độ phủ thực tế | Quyết định chuẩn hóa |
| :--- | :---: | :---: | :--- | :--- |
| **Nguồn 1: Lựa chọn có cấu trúc lúc chốt Tìm bid** | Có (Slides 08–11) | Có (Bước `1/3` – `3/3` trên `/accommodation`) | `stay_nights`, `lead_time_days`, `roomCount`, `guestComposition` (`adults`, `children`, `infants`, `pets`), `accommodationType` (5 loại), `roomTypes` (6 loại), `bedTypes` (4 loại), `serviceTypes` (11 ô tích dịch vụ). **Độ phủ: 100% yêu cầu.** | Giữ làm nền tảng bắt buộc để không bao giờ có yêu cầu nào bị rỗng dữ liệu phân cụm. |
| **Nguồn 2: Hành vi tương tác sau khi nhận báo giá** | Có (Slides 12–23, 26) | Có (`Offer Listing`, Popup `CHỐT BID NGAY`, màn hình Biên lai) | 5 kiểu `Sort` (`offer_listing_sort_change`), bấm xem so sánh giá OTA (`offer_card_ota_expand`, `explore_stay_ota_compare_click`), đổi hạng phòng `<1/N>`, chốt nhanh ngoài thẻ (`offer_card_select_click`), từ chối (`unmatched_keys`), bấm 7 tab thư viện (`videos`, `dining`, `facilities`, `rooms`, `property_views`, `nearby_attractions`), mở `Bản đồ`, đọc `Review`, đặt hộ người khác (`guest_same_as_booker=false`), tải PDF biên lai (`download_receipt_pdf`). **Độ phủ: ~85%–100% phiên có xem báo giá.** | Đặt trọng số cao nhất vì phản ánh hành động thật của khách trước giá và hình ảnh của khách sạn. |
| **Nguồn 3A: Ô ghi chú yêu cầu riêng (`free-text notes`)** | **Chưa có** *(Phát hiện thiếu trong Schema/Slides)* | **Có thật** (`data.notes` trong `POST /api/traveler/request-bids`) | Văn bản tự do khách gõ thêm lúc tạo yêu cầu (`VI · EN · KO`). Không bắt buộc nên thực tế **~15%–30% yêu cầu có chữ**, **70%–85% để trống `""`**. | **Bổ sung vào sự kiện `booking_form_complete`** dưới dạng `has_request_notes` (`boolean`) và `extracted_note_keywords` (`string[]` sau khi che PII). |
| **Nguồn 3B: Nội dung bài đánh giá (`free-text review`)** | Mới đếm lượt mở xem (`explore_stay_review_inspect`) | **Có thật** (Bài nhận xét chữ tự do của khách sau lưu trú) | Văn bản nhận xét của chính tài khoản `user_id` ở các kỳ nghỉ hoàn tất trước đó (nếu là khách quay lại) và nội dung đánh giá khách hiện tại bấm mở đọc lâu. **Độ phủ theo `user_id`: ~10%–25% khách quay lại.** | Dùng làm **tín hiệu lịch sử bổ trợ trọng số nhẹ** (không lấn át nhu cầu của chuyến đi hiện tại). |

---

## 5. Bộ Từ Điển Keywords Chuẩn (`Master Keyword Dictionary` — 16 Mã Tín Hiệu Cốt Lõi)

Mọi lựa chọn checkbox, hành vi bấm và từ ngữ tự do (`VI · EN · KO`) đều được quy chuẩn về **16 Mã Keyword chuẩn (`KW_01` .. `KW_16`)** chia đều theo **4 Cụm Chân Dung Chuẩn (`C1–C4`)**:

### Cụm `C1` — Khách Săn Giá & Đối Chiếu Sàn Ngoài (*Price & Deal Seekers*)
| Mã chuẩn | Tên tín hiệu kinh doanh | Tín hiệu từ Thẻ chọn / Hành vi bấm (Slides + Thực tế) | Từ khóa `Free-text` trong `notes` / `review` (`VI · EN · KO`) |
| :--- | :--- | :--- | :--- |
| **`KW_01`** | Ưu tiên giá rẻ nhất | Bấm `Sort: Giá thấp nhất` (`sort_lowest_price`); tích `Phòng bất kỳ` (`anyRoom`) + `Giường bất kỳ` (`anyBed`) với `criteria_count <= 1`. | **VI:** `giá rẻ`, `tiết kiệm`, `phòng cơ bản`, `ngân sách thấp`, `rẻ nhất`, `khuyến mãi`<br>**EN:** `budget`, `cheapest`, `lowest price`, `affordable`, `economy`, `promo`<br>**KO:** `저렴한`, `가성비`, `최저가`, `특가`, `할인` |
| **`KW_02`** | So sánh chênh lệch giá OTA | Bấm `Sort: Mức tiết kiệm % cao` (`sort_highest_saving_pct`); bấm mở `offer_card_ota_expand` hoặc `explore_stay_ota_compare_click` (`Agoda / Booking / Traveloka / Expedia`). | **VI:** `rẻ hơn agoda`, `so giá booking`, `khớp giá`, `ưu đãi tốt hơn`<br>**EN:** `price match`, `cheaper than agoda`, `better deal`, `ota price`, `discount`<br>**KO:** `가격비교`, `아고다보다`, `부킹닷컴`, `더 싼` |
| **`KW_03`** | Nhạy cảm phụ phí ẩn | Dừng đọc phần mô tả/chính sách lâu rồi đóng popup sau khi xem bảng giá; phản ánh phí phát sinh trong `review` cũ. | **VI:** `không phụ thu`, `đã gồm thuế phí`, `miễn phí thêm người`, `không phí ẩn`<br>**EN:** `no hidden fee`, `all inclusive price`, `no extra charge`, `free extra bed`<br>**KO:** `추가요금 없이`, `세금포함`, `무료 추가` |
| **`KW_04`** | Chốt nóng vì mức giảm sâu | Bấm `CHỌN` thẳng ngoài thẻ (`offer_card_select_click`, `was_detail_viewed = false`) khi `saving_pct >= 10%` và `decision_duration_sec <= 180`. | *(Thuần tín hiệu hành vi thực tế trên `offer_listing`)* |

### Cụm `C2` — Khách Gia Đình, Đi Đoàn & Nghỉ Dưỡng Cần Tiện Nghi (*Family, Group & Comfort Seekers*)
| Mã chuẩn | Tên tín hiệu kinh doanh | Tín hiệu từ Thẻ chọn / Hành vi bấm (Slides + Thực tế) | Từ khóa `Free-text` trong `notes` / `review` (`VI · EN · KO`) |
| :--- | :--- | :--- | :--- |
| **`KW_05`** | Gia đình có trẻ nhỏ / người lớn tuổi | `children > 0` hoặc `infants > 0`; tích `Xe lăn` (`wheelchair_accessible`) hoặc `Thang máy` (`elevator`). | **VI:** `nôi em bé`, `cũi trẻ em`, `trẻ nhỏ`, `gia đình`, `người già`, `bố mẹ lớn tuổi`, `tầng thấp dễ đi`, `ghế trẻ em`, `cháo em bé`<br>**EN:** `baby cot`, `crib`, `infant`, `toddler`, `kids`, `family`, `elderly`, `stroller`, `wheelchair`, `low floor`<br>**KO:** `아기침대`, `유아`, `아이와`, `가족여행`, `부모님`, `어르신`, `유모차`, `휠체어`, `저층` |
| **`KW_06`** | Ưa chuộng gói Bữa sáng & Ẩm thực | Tích checkbox `Bữa sáng` (`breakfast`); từ chối báo giá vì `unmatched_keys` chứa `breakfast`; bấm tab thư viện `Ẩm thực` (`dining`). | **VI:** `ăn sáng`, `buffet sáng`, `bữa sáng miễn phí`, `đồ chay`, `halal`, `dị ứng thực phẩm`<br>**EN:** `breakfast included`, `morning buffet`, `free breakfast`, `vegetarian`, `halal`, `food allergy`<br>**KO:** `조식포함`, `무료조식`, `아침식사`, `뷔페`, `채식`, `알레르기` |
| **`KW_07`** | Nghỉ dưỡng dài ngày / Cặp đôi / Tiện ích cao | `stay_nights >= 3`; chọn `Resort` / `Villa` / `Căn hộ` hoặc hạng `Suite`; tích `Hồ bơi` (`pool`), `Bãi đậu xe` (`parking`), `Giặt ủi` (`laundry`), `Thú cưng` (`pets > 0`); đổi xem hạng phòng nâng cấp `<1/N>`. | **VI:** `trăng mật`, `kỷ niệm ngày cưới`, `sinh nhật`, `trang trí phòng`, `bồn tắm nằm`, `hồ bơi vô cực`, `đậu xe ô tô`, `phòng thông nhau`, `mang chó mèo`<br>**EN:** `honeymoon`, `anniversary`, `birthday`, `bathtub`, `connecting rooms`, `adjacent rooms`, `free parking`, `pet friendly`, `kitchenette`<br>**KO:** `신혼여행`, `허니문`, `기념일`, `생일`, `욕조`, `커넥팅룸`, `연결된 방`, `주차장`, `반려견`, `취사가능` |
| **`KW_08`** | Bấm `Sort: Độ phù hợp cao nhất` | Bấm `Sort: Độ phù hợp cao nhất` (`sort_best_match`) ưu tiên báo giá đáp ứng trọn bộ tiện ích đã tích chọn (`match_rate_pct >= 85%`). | *(Thuần tín hiệu hành vi `Sort` trên `offer_listing`)* |

### Cụm `C3` — Khách Đặt Gấp Sát Giờ & Công Tác Cần Nhanh Gọn (*Last-Minute, Business & Fast Bookers*)
| Mã chuẩn | Tên tín hiệu kinh doanh | Tín hiệu từ Thẻ chọn / Hành vi bấm (Slides + Thực tế) | Từ khóa `Free-text` trong `notes` / `review` (`VI · EN · KO`) |
| :--- | :--- | :--- | :--- |
| **`KW_09`** | Đặt gấp nhận phòng trong `0–1 ngày` | `lead_time_days <= 1` (đặt trong ngày hoặc cho ngày mai), thường `stay_nights` từ `1–2 đêm`. | **VI:** `nhận phòng ngay`, `đang trên đường tới`, `tới khuya`, `check in muộn`, `nhận phòng đêm`, `cần phòng gấp`<br>**EN:** `arriving tonight`, `late check-in`, `midnight arrival`, `urgent`, `immediate check-in`<br>**KO:** `오늘 입실`, `늦은 체크인`, `심야 도착`, `급하게`, `바로 입실` |
| **`KW_10`** | Nhạy tốc độ phản hồi đầu tiên | Mở xem báo giá ngay trong `<= 120 giây` kể từ lúc khách sạn gửi (`elapsed_since_bid_sec <= 120`); ưu tiên chọn báo giá `is_auto_bid = true` đến sớm nhất. | **VI:** `xác nhận ngay`, `phản hồi nhanh`<br>**EN:** `instant confirmation`, `quick reply`<br>**KO:** `빠른 확정`, `즉시 확인` |
| **`KW_11`** | Linh hoạt giờ Nhận sớm / Trả trễ | Tích checkbox `Trả phòng trễ` (`late_checkout`) hoặc bị từ chối do thiếu `late_checkout`. | **VI:** `nhận phòng sớm`, `check in sớm`, `trả phòng trễ`, `late check out`, `gửi hành lý`<br>**EN:** `early check-in`, `late check-out`, `luggage storage`, `flight at night`<br>**KO:** `얼리 체크인`, `레이트 체크아웃`, `짐보관`, `늦은 퇴실` |
| **`KW_12`** | Khách đi công tác / Đặt hộ / Cần hóa đơn | Đi lẻ 1 người lớn (`adults = 1, children = 0`) tại khu trung tâm; tích `Wifi`; đặt hộ (`guest_same_as_booker = false`) hoặc bấm tải hóa đơn PDF (`post_pay_cta = download_receipt_pdf`). | **VI:** `công tác`, `xuất hóa đơn`, `hóa đơn đỏ`, `hóa đơn VAT`, `bàn làm việc`, `wifi mạnh`, `ủi đồ`<br>**EN:** `business trip`, `tax invoice`, `company receipt`, `VAT invoice`, `work desk`, `fast wifi`<br>**KO:** `출장`, `세금계산서`, `영수증 발급`, `법인카드`, `업무용 책상` |

### Cụm `C4` — Khách Kỹ Tính Thẩm Định Đánh Giá, Hình Ảnh & Vị Trí (*Trust, Visual & Location Verifiers*)
| Mã chuẩn | Tên tín hiệu kinh doanh | Tín hiệu từ Thẻ chọn / Hành vi bấm (Slides + Thực tế) | Từ khóa `Free-text` trong `notes` / `review` (`VI · EN · KO`) |
| :--- | :--- | :--- | :--- |
| **`KW_13`** | Ưu tiên Điểm đánh giá & Uy tín thực | Bấm `Sort: Điểm đánh giá cao` (`sort_highest_rating`); bấm mở đọc chi tiết nhận xét (`explore_stay_review_inspect`); đóng trang nhanh nếu `review_count = 0`. | **VI:** `sạch sẽ`, `không mùi thuốc lá`, `phòng không hút thuốc`, `cách âm tốt`, `yên tĩnh`, `an ninh`, `mới sửa`<br>**EN:** `spotless`, `clean`, `non-smoking`, `smoke-free`, `soundproof`, `quiet room`, `away from elevator`, `safe`<br>**KO:** `청결`, `깨끗한`, `금연실`, `담배냄새 없는`, `방음`, `조용한 방`, `엘리베이터에서 먼` |
| **`KW_14`** | Thẩm định kỹ Video & Ảnh thực tế | Bấm mở thư viện ảnh (`explore_stay_gallery_open`), chuyển sang tab `Video` (`content_category = videos`) hoặc bấm xem `>= 4` ảnh/video (`media_clicked_count >= 4`). | **VI:** `hướng biển`, `view biển`, `cửa sổ lớn`, `ban công`, `tầng cao`, `thoáng mát`, `đúng như hình`<br>**EN:** `ocean view`, `sea view`, `city view`, `high floor`, `balcony`, `big window`, `natural light`, `no window` *(phủ định)*<br>**KO:** `오션뷰`, `바다전망`, `시티뷰`, `고층`, `발코니`, `창문 있는 방`, `채광` |
| **`KW_15`** | Sàng lọc kỹ Khoảng cách & Bản đồ | Bấm `Sort: Khoảng cách gần nhất` (`sort_nearest_distance`); phóng to/kéo bản đồ hoặc bấm mở Google Maps (`explore_stay_map_interact`); bấm tab `Điểm tham quan gần đó` (`nearby_attractions`). | **VI:** `gần biển`, `đi bộ ra biển`, `gần trung tâm`, `gần chợ đêm`, `gần ga tàu`, `xe đưa đón sân bay`<br>**EN:** `walking distance`, `near beach`, `near metro`, `subway station`, `city center`, `airport shuttle`, `pickup`<br>**KO:** `역세권`, `지하철역 근처`, `해변 도보`, `시내 중심`, `공항 픽업`, `셔틀` |
| **`KW_16`** | Đọc kỹ mô tả & đối chiếu nhiều vòng | Mở xem chi tiết cùng một báo giá từ `2 lần` trở lên (`browse_click_count >= 2`), cuộn lên xuống đối chiếu (`scroll_up_count >= 2`) và đọc mô tả `description_dwell_ms >= 8000` (hoặc bấm dịch AI mô tả phòng). | *(Tín hiệu hành vi thẩm định sâu trong `explore_stays`)* |

---

## 6. Cơ Chế Bóc Tách `Free-Text` 2 Tầng (`Phương Án C — Hybrid Waterfall`)

Quy trình xử lý văn bản cho `request.notes` và `past_reviews.comment` chạy trong tiến trình tổng hợp dữ liệu ban đêm (`T-1`, độ trễ tối thiểu `24 giờ`):

```text
Văn bản thô (notes / review)
   │
   ├──► [Bước 0: Che lọc PII & Chuẩn hóa chữ]
   │       • Xóa SĐT, email, mã thẻ/CCCD, đường dẫn URL
   │       • Chuẩn hóa Unicode NFC, chữ thường, tạo bản không dấu cho Tiếng Việt
   │       • Nếu rỗng ("") hoặc < 3 ký tự ──► Bỏ qua (0 chi phí), chuyển thẳng sang chấm điểm Thẻ chọn & Hành vi
   │
   ├──► [Tầng 1: Bộ khớp Từ điển 3 ngôn ngữ + Luật Phủ định (0 chi phí, xử lý ~80% câu có chữ)]
   │       • Dò khớp cụm từ theo biên từ (word-boundary) trên từ điển KW_01..KW_15 (VI có dấu + VI không dấu + EN + KO)
   │       • Kiểm tra cửa sổ phủ định 4 từ đứng trước ("không", "đừng", "miễn", "no", "without", "not", "없이", "말고"):
   │           - Ví dụ: "không cần bữa sáng" -> HỦY gắn nhãn KW_06
   │           - Ví dụ: "không mùi thuốc lá" / "no smoking" / "담배냄새 없는" -> Khớp mẫu cố định dương tính của KW_13!
   │       • Nếu khớp >= 1 mã VÀ câu ngắn (< 80 ký tự, không chứa từ chuyển ý "nhưng / tuy nhiên / except / 하지만") ──► Chốt mã!
   │
   └──► [Tầng 2: Model Ngôn ngữ Nhẹ Khóa Cứng Danh Mục (chỉ ~5% tổng đơn có câu dài / phức tạp)]
           • Đầu vào: Câu đã che PII
           • Ràng buộc Schema JSON cứng: {"matched_keywords": Array<Enum["KW_01".."KW_15"]>, "candidate_new_phrases": string[]}
           • Tuyệt đối không cho sinh văn bản tự do hay gán nhãn ngoài KW_01..KW_15
           • Vòng lặp học từ mới (mỗi chu kỳ sạch 3–7 ngày): Cụm từ mới xuất hiện >= 10 lần với độ đồng thuận >= 90% được duyệt đưa vào Tầng 1.
```

---

## 7. Lộ Trình Phân Cụm 2 Giai Đoạn & Công Thức Gán 1 Cụm Chính Duy Nhất

### 7.1. Giai Đoạn 1 — Chấm Điểm Trọng Số Minh Bạch (`Deterministic Weighted Scoring`)

Mỗi yêu cầu đặt phòng `r` (sau mốc `booking_form_complete`) được chấm điểm trên cả 4 cụm `C1, C2, C3, C4` theo nguyên tắc: **Hành động thực tế và chữ khách chủ động gõ có sức nặng lớn hơn ô tích chọn mặc định ban đầu**, còn **lịch sử đánh giá cũ chỉ đóng vai trò điểm cộng tham khảo nhẹ**.

**Công thức tổng điểm cho từng cụm $k \in \{C1, C2, C3, C4\}$:**

$$\text{Score}(r, k) = \sum_{m \in \text{Behavior}(k)} w_{\text{beh}} + \sum_{m \in \text{Notes}(k)} w_{\text{note}} + \sum_{m \in \text{Form}(k)} w_{\text{form}} + \sum_{m \in \text{PastReview}(k)} w_{\text{rev}}$$

**Thang trọng số chuẩn *(Quyết định của Builder)*:**
- **$w_{\text{note}} = +4,0\text{ điểm}$** cho mỗi mã `KW` tách được từ ô ghi chú `notes` của **chính yêu cầu hiện tại** *(khách mất công tự gõ chữ chứng tỏ ưu tiên rất cao; tối đa cộng 2 mã khác nhau/cụm = `8,0đ` để tránh một đoạn văn dài lấn át tuyệt đối mọi hành vi)*.
- **$w_{\text{beh}} = +3,5\text{ điểm}$** cho mỗi hành vi chủ động sau khi nhận báo giá: bấm `Sort` thuộc cụm đó, bấm mở `So sánh giá OTA`, bấm xem `Video` / `Bản đồ` / `Review`, chốt nhanh ngoài thẻ `<180s`, hoặc từ chối do thiếu tiện ích `unmatched_keys`.
- **$w_{\text{form}} = +2,0\text{ điểm}$** cho mỗi điều kiện cấu trúc lúc gửi Tìm bid: `lead_time_days <= 1` (`C3`), `stay_nights >= 3` (`C2`), `children/infants > 0` (`C2`), tích `Bữa sáng / Hồ bơi / Đậu xe` (`C2`), tích `Trả phòng trễ` (`C3`), `adults = 1` đi khu trung tâm (`C3`), hoặc chỉ chọn `anyRoom` không kèm điều kiện phụ (`C1`).
- **$w_{\text{rev}} = +1,0\text{ điểm}$** cho mỗi mã `KW` trích từ các bài `review` trong quá khứ của cùng tài khoản `user_id` *(giữ ở mức `+1,0đ` để khách năm ngoái đi công tác một mình (`C3`) nhưng năm nay dẫn vợ con đi biển (`C2`: `+2đ trẻ nhỏ + 2đ bữa sáng + 4đ notes nôi em bé = 8đ`) vẫn được xếp chuẩn xác vào `C2`)*.

**Quy tắc Gán Đúng 1 Cụm Chính Duy Nhất & Phá Hòa (`Single-Cluster Winner & Tie-Breaker`):**
1. Chọn cụm $k^* = \arg\max_{k \in \{C1, C2, C3, C4\}} \text{Score}(r, k)$.
2. **Đảm bảo 0% rơi vào "Chưa phân loại":** Vì mọi yêu cầu `booking_form_complete` đều bắt buộc có `lead_time_days`, `stay_nights`, `guestComposition`, `accommodationType` và `roomTypes`, tổng điểm luôn `>= 2,0` (ví dụ khách đi 2 người, đặt trước 5 ngày, ở 1–2 đêm, chọn `anyRoom` không tích dịch vụ phụ sẽ nhận `+2,0đ` nền vào `C1`).
3. **Thứ tự phá hòa cố định nếu 2 cụm bằng điểm nhau:**
   - **Ưu tiên 1:** Cụm nào có tổng điểm từ **Hành vi thực tế sau nhận báo giá ($w_{\text{beh}}$)** cao hơn sẽ thắng.
   - **Ưu tiên 2:** Cụm nào có điểm từ **Ghi chú `notes` của chuyến hiện tại ($w_{\text{note}}$)** cao hơn sẽ thắng.
   - **Ưu tiên 3:** Thứ tự ưu tiên hành động vận hành cố định: **`C3` (Đặt gấp / Tự động báo giá) $\succ$ `C1` (Vùng giá 10–15%) $\succ$ `C2` (Đóng gói tiện ích) $\succ$ `C4` (Hình ảnh / Đánh giá / Bản đồ)**.

### 7.2. Giai Đoạn 2 — Chuyển Tiếp Lên Máy Học (`Unsupervised ML Clustering` Trên Chu Kỳ Sạch 3–7 Ngày)

Khi lượng dữ liệu đã đủ lớn, hệ thống nâng cấp từ chấm điểm tĩnh sang máy học mà **không làm xáo trộn giao diện hay mở khóa cho AI đi lan man**:

1. **Điều kiện kích hoạt Giai đoạn 2 *(Quyết định của Builder)*:** Kho dữ liệu đạt tối thiểu **`5.000` yêu cầu đặt phòng đã qua chu kỳ làm sạch `7 ngày`** (đã khử trùng lặp sự kiện và nối trọn vẹn từ `booking_form_complete` tới kết quả cuối) trên tối thiểu **`30` cơ sở lưu trú đang hoạt động**.
2. **Vector đặc trưng đầu vào ($\mathbf{x}_r \in \mathbb{R}^{38}$):**
   - **6 biến liên tục chuẩn hóa (`StandardScaler`):** `log1p(lead_time_days)`, `stay_nights`, `total_guests`, `criteria_count`, `max_scroll_depth_pct`, `log1p(total_dwell_ms)`.
   - **16 biến nhị phân (`0/1`) của Bộ Từ điển `KW_01..KW_16`** (hợp nhất từ Thẻ chọn, Hành vi bấm và Tầng 1+2 `free-text`).
   - **16 chiều nén ngữ nghĩa (`PCA 16-dim` từ Multilingual Embedding)** của văn bản `notes` + `review` (bằng vector `0` nếu khách không gõ chữ).
3. **Thuật toán & Chu kỳ huấn luyện:**
   - Huấn luyện định kỳ mỗi tuần trên **tập dữ liệu đã chốt sạch (`T-7` trở về trước)**: dùng **Phân cụm phân cấp (`Ward Hierarchical Clustering`)** để kiểm tra cây phân nhánh tự nhiên (ví dụ khi dữ liệu lớn có thể tách `C2` thành *`C2a` Gia đình trẻ nhỏ* và *`C2b` Cặp đôi nghỉ dưỡng dài ngày*, hoặc tách `C3` thành *`C3a` Đặt gấp trong đêm* và *`C3b` Khách công tác cần hóa đơn*), kết hợp **K-Means** để gán cụm nhanh hàng đêm ở mốc `T-1`.
   - Ngưỡng kiểm định chất lượng mô hình: chỉ áp dụng bộ tâm cụm mới nếu `Silhouette Score >= 0.25` và không có cụm nào nhỏ hơn `5%` tổng lượng yêu cầu.
4. **Cơ chế Khóa Cứng Đầu Ra AI (`Hard Action-Scope Guardrail`):**
   - Mỗi cụm máy học $M_j$ sau khi hình thành phải được ánh xạ cố định vào **Bảng Đòn Bẩy Khách Sạn Kiểm Soát Được** (cùng khung ngưỡng `< 30%` · `30% – 70%` · `> 70%` trên `dashboard_overview`). AI chỉ được đọc tỷ lệ thắng/thua của từng cụm để chọn ra **Top 3 hành động sát sườn nhất** cho khách sạn đó.

---

## 8. Bàn Giao & Đồng Bộ Tài Liệu (Deliverables)

Sau khi bản thiết kế này được duyệt, công việc triển khai gồm 2 phần gọn rõ:
1. **Tài liệu chuyên đề cho Data/Dev & Phụ lục CTO:** Xuất bản tệp tra cứu chuẩn `docs/presentations/cto-ai-dashboard-proposal/Tu_Dien_Keywords_Va_Quy_Tac_Phan_Cum_AI.md` (chứa đầy đủ bảng ánh xạ Slides vs. Thực tế, 16 mã `KW_01..KW_16` đa ngôn ngữ `VI · EN · KO`, pipeline `Phương án C` và công thức GĐ1 $\rightarrow$ GĐ2).
2. **Đồng bộ sang Bộ Slide 41 trang & Kịch bản 45 phút:**
   - Cập nhật chú thích trên **Slide 11 (`booking_form_complete`)** và **Slide 28 (`Phân cụm C1–C4`)** trong `CTO_AI_Dashboard_And_Bidding_Analytics_45min_v9_Synced8Notes.pptx` (+ bản chuẩn `.pptx`) để nêu rõ nguồn Keywords gộp cả `Thẻ chọn + Hành vi Sort/Click + Chữ tự do (notes/review)` và lộ trình `GĐ1 Chấm điểm -> GĐ2 Máy học`.
   - Bổ sung câu hỏi & lời giải chi tiết *"Dựa vào bộ Keywords nào và xử lý chữ tự do ra sao để phân cụm?"* vào phần Q&A của `Kich_Ban_Thuyet_Trinh_CTO_45Phut_3Nguoi.md`.
