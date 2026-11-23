# Thiết Kế Giao Diện Mới: Optibide Partner Hub — Dashboard Overview Thuần Kinh Doanh Khách Sạn

**Ngày lập:** 2026-11-11  
**Dự án mục tiêu:** `dashboard/partner-auction-dashboard-v2`  
**Tài liệu tham chiếu hình ảnh:** `dashboard/demo_new/1.png`, `dashboard/demo_new/2.png`

---

## 1. Mục Đích & Lý Do Thay Đổi (Intent & Why)

Bản dashboard hiện tại (`partner-auction-dashboard-v2`) được thiết kế nặng về góc nhìn kỹ thuật/nội bộ (công thức toán học `×1.265`, phễu chuyển đổi `RACE` 8 bước, sơ đồ máy trạng thái `LifecycleStateExplorer`, các mã lỗi `REJ_*`, cùng các nút giả lập kiểm thử *"Mô phỏng khách TT / Từ chối"*), khiến giao diện dày đặc, rối mắt và khó tiếp cận đối với người vận hành khách sạn thực tế.

 Bản viết lại này chuyển đổi toàn bộ giao diện sang **Optibide Partner Hub — Dashboard Overview**, bám sát 100% bố cục, nhịp điệu thị giác sáng thoáng và cấu trúc 5 khu vực từ trên xuống của `dashboard/demo_new/1.png` và `dashboard/demo_new/2.png`. Mục tiêu cốt lõi:
1. **Dành trọn vẹn cho người làm kinh doanh khách sạn** (chủ khách sạn, quản lý cơ sở, lễ tân) — người hoàn toàn không biết gì về công nghệ nhìn vào là hiểu ngay tình hình doanh thu, lượng khách hỏi phòng, lý do trượt đơn, mức độ uy tín hiển thị và danh sách đặt phòng đã thanh toán.
2. **Hiển thị như một phần mềm quản lý đối tác khách sạn thương mại thật 100%** — loại bỏ hoàn toàn mọi công cụ debug/mô phỏng giả lập và thuật ngữ kỹ thuật nội bộ.

---

## 2. Mục Tiêu, Ngoài Phạm Vi & Điều Cấm Kỵ (Goals, Non-Goals & Anti-Goals)

### Mục tiêu (Goals)
- **Bám sát bố cục & thẩm mỹ của `1.png` và `2.png`**: Nền xám nhạt dịu mắt (`#F8F9FB`), thẻ trắng bo góc tinh tế, thanh menu trái có thể mở rộng (`2.png`) hoặc thu gọn thành thanh icon (`1.png`), thanh đầu trang (Topbar) gồm bộ chọn Khách sạn/Cơ sở, Ngôn ngữ, Tiền tệ, Tin nhắn/Thông báo/Trợ giúp và Hồ sơ người dùng.
- **Ngôn ngữ kinh doanh đời thường + Đa ngôn ngữ & Đa tiền tệ hoạt động thật**:
  - Mặc định hiển thị **Tiếng Việt (`vi`)** và **VNĐ (`VND`)** với cách diễn đạt gần gũi, dễ hiểu ngay cho chủ khách sạn Việt.
  - Bộ chuyển đổi **Ngôn ngữ (`Tiếng Việt` / `English` / `한국어`)** và **Tiền tệ (`VND` / `KRW` / `USD`)** trên thanh đầu trang hoạt động thật, tự động cập nhật toàn bộ nhãn, biểu đồ, lời khuyên AI và số tiền (khi chọn `English` + `KRW` sẽ khớp trực tiếp phong cách hiển thị của `1.png` & `2.png`).
- **Thể hiện trọn vẹn cả 2 trạng thái thực tế trong `1.png` và `2.png`**:
  - **Trạng thái khách sạn đang hoạt động có doanh thu (`2.png`)**: Dữ liệu thật từ chuỗi khách sạn *L'amour Boutique Hotel* (Toàn chuỗi 30 phòng và từng chi nhánh *Mỹ Khê*, *Sông Hàn*, *An Thượng*).
  - **Trạng thái cơ sở mới khai trương chưa phát sinh đơn hoàn tất (`1.png`)**: Có sẵn tùy chọn cơ sở mới (*Stay Hotel H11 · Cơ sở mới*) trên ô chọn khách sạn đầu trang — có lượt báo giá nhưng `0` đơn hoàn tất, hiển thị biểu đồ đường phẳng `0` và khung trống *"Chưa có đơn đặt phòng gần đây"* y hệt `1.png`.
- **Đạt chuẩn kiểm thử tự động 100% (`dashboard-qa-testing`)**: Giữ nguyên hợp đồng dữ liệu `master-data/*.json` & REST API `/api/master-data`, bổ sung unit test cho bộ tính toán chuỗi ngày/tiền tệ/cố vấn kinh doanh, và viết lại bộ Playwright E2E + Responsive 7 màn hình (`1440×900` → `360×800`) đảm bảo `0` lỗi console/pageerror và `0` tràn ngang.

### Ngoài phạm vi giai đoạn này (Non-Goals — do người dùng xác nhận)
- **Chưa xây dựng trang con cho các mục khác trên thanh menu trái** (*Lịch đặt phòng / Booking Calendar, Thanh toán / Payout, Quản lý phòng / Rooms Management, Quản lý báo giá / Bidding Management, Tin nhắn / Messages, Tiếp thị / Marketing, Đăng xuất / Logout*). Các mục này chỉ hiển thị chuẩn xác trên thanh menu trái (có hiệu ứng thu gọn/mở rộng thanh bên và mũi tên mở rộng mục *Tiếp thị / Marketing* như `2.png`), còn nội dung chính cố định ở **Tổng quan (Dashboard Overview)**.

### Điều cấm kỵ (Anti-Goals — dù chạy đúng kỹ thuật vẫn tính là thất bại)
- Không được xuất hiện bất kỳ nút giả lập nội bộ nào (*"Mô phỏng khách TT 100%"*, *"Mô phỏng từ chối"*, *"Reset seed"*, *"Xem công thức ×1.265"*).
- Không được phơi bày mã kỹ thuật (`REJ_COMPETITOR_WON_PRICE`, `checkout_hold_10m`, `settled_t_plus_7`, `RACE`) lên giao diện.
- Ở chế độ Tiếng Việt, không dùng trần trụi các từ viết tắt chuyên môn như `ADR`, `RevPAR`, `ELO Score`, `SLA`, `TTL` làm tiêu đề chính mà không diễn giải bằng từ ngữ kinh doanh khách sạn đời thường (*Giá phòng bình quân/đêm*, *Doanh thu bình quân*, *Điểm uy tín & độ ưu tiên hiển thị*).

---

## 3. Các Phương Án Đã Cân Nhắc (Approaches)

1. **Phương án 1 (Đã được chọn)**: Bám sát 100% bố cục, màu sắc và luồng 5 khối của `1.png` & `2.png`, nhưng biên tập lại toàn bộ câu chữ sang ngôn ngữ kinh doanh khách sạn đời thường dễ hiểu, mặc định Tiếng Việt + VNĐ và hỗ trợ đổi trực tiếp sang `English / 한국어` cùng `VND / KRW / USD` ngay trên thanh đầu trang.
   - *Đánh đổi*: Cần xây dựng tầng từ điển đa ngôn ngữ và quy đổi tiền tệ đồng nhất cho KPI, trục biểu đồ, lời khuyên AI và bảng đặt phòng, nhưng giải quyết trọn vẹn bài toán vừa đẹp chuẩn ảnh mẫu vừa thân thiện tuyệt đối với người không rành công nghệ.
2. **Phương án 2 (Loại bỏ)**: Dịch sát từng chữ các nhãn chuyên môn OTA (`ELO Score`, `ADR Yield Optimization`, `RevPAR Growth`) từ ảnh mẫu mà không biên tập lại ngôn ngữ đời thường.
   - *Lý do loại*: Người dùng thuần kinh doanh khách sạn truyền thống vẫn phải đoán nghĩa các thuật ngữ hệ thống.

---

## 4. Ràng Buộc Kỹ Thuật (Constraints)

- **Nền tảng**: React 19, TypeScript 5.9, Tailwind CSS v4, Recharts 3.2, Radix UI Dialog, Lucide Icons, chạy trên Vite (`port 5182`, bảo toàn tiến trình dev server đang chạy).
- **Bảo toàn dữ liệu gốc (`master-data/`)**: Giữ nguyên cấu trúc 12 bảng JSON trong `master-data/*.json` và `master-data/seed/*.json` cùng middleware REST API trong `vite.config.ts` và cơ chế fallback tĩnh/localStorage trong `src/services/masterDataService.ts` để toàn bộ kiểm thử hợp đồng dữ liệu (`master-data-contract.test.ts`, `api-master-data.spec.ts`) luôn tương thích.
- **Đáp ứng đa thiết bị (7 Viewports)**: Trên màn hình lớn (`>= 1024px`) hiển thị thanh menu trái cố định (mở rộng `240px` hoặc thu gọn `64px`); trên Tablet dọc & Điện thoại (`< 1024px`, tới `360×800`) thanh menu trái chuyển thành ngăn kéo trượt (drawer) mở bằng nút menu ở thanh đầu trang để không chiếm chiều ngang biểu đồ và bảng, đảm bảo `document.documentElement.scrollWidth <= window.innerWidth` ở mọi kích thước.

---

## 5. Chi Tiết Thiết Kế Giao Diện & Nghiệp Vụ Hiển Thị

### 5.1. Khung Ứng Dụng (App Shell: Sidebar + Topbar)
- **Thanh menu trái (`Optibide Partner Hub`)**:
  - Logo + tên thương hiệu `Optibide Partner Hub` ở góc trên cùng bên trái kèm nút `<` thu gọn thành thanh biểu tượng dọc (giống hệt `1.png`) và nút `>` để mở rộng lại (giống `2.png`).
  - Danh sách mục điều hướng chuẩn phần mềm khách sạn:
    1. **Tổng quan** (`Dashboard Overview`) — đang chọn (nền xanh nhạt `#EEF2FF`, chữ & icon xanh đậm `#4F46E5`).
    2. **Lịch đặt phòng** (`Booking Calendar`)
    3. **Đối soát doanh thu** (`Payout`)
    4. **Quản lý phòng** (`Rooms Management`)
    5. **Quản lý báo giá** (`Bidding Management`)
    6. **Tin nhắn** (`Messages`)
    7. **Khuyến mãi & Tiếp thị** (`Marketing` — có mũi tên mở rộng xem danh mục con)
    8. **Đăng xuất** (`Logout`)
    *(Khi bấm vào các mục 2–8 vốn chưa triển khai ở giai đoạn này, thanh thông báo nhẹ góc màn hình sẽ báo lịch sự kiểu phần mềm thật, không chuyển đi khỏi trang Tổng quan).*
- **Thanh đầu trang (Topbar)**:
  - **Trái**: Ô chọn khách sạn/chi nhánh có ảnh đại diện khách sạn nhỏ bo góc:
    - *L'amour Boutique Hotel (Toàn hệ thống)*
    - *L'amour Mỹ Khê · Sơn Trà*
    - *L'amour Sông Hàn · Hải Châu*
    - *L'amour An Thượng · Ngũ Hành Sơn*
    - *Stay Hotel H11 (Cơ sở mới)* — mô phỏng trung thực khách sạn mới lên sàn có 75 lượt báo giá, `0` đơn hoàn tất, điểm đánh giá `0.0`, điểm hiển thị khởi điểm `800` giống hệt `1.png`.
  - **Phải**:
    - Bộ chọn **Ngôn ngữ**: `Tiếng Việt` (mặc định), `English`, `한국어`.
    - Bộ chọn **Tiền tệ**: `VND (₫)` (mặc định), `KRW (₩)`, `USD ($)` — quy đổi nhất quán từ giá trị gốc VNĐ theo tỷ giá chuẩn hiển thị rõ ràng, và lưu tùy chọn vào `localStorage` (kể cả khi mất kết nối API).
    - Cụm biểu tượng tiện ích phần mềm thật: Tin nhắn nhanh, Chuông thông báo (mở popover thông báo vận hành ngắn gọn của khách sạn), Trợ giúp `?` (mở hướng dẫn sử dụng ngắn gọn bằng ngôn ngữ đời thường), và Hồ sơ người dùng (ảnh đại diện + tên quản lý khách sạn).

### 5.2. Tiêu Đề Trang & Bộ Lọc Kỳ Thời Gian
- Hàng tiêu đề: Bên trái là tiêu đề **Tổng quan hoạt động** (`Dashboard overview`), bên phải là ô chọn kỳ xem dữ liệu (dropdown sạch gọn giống `1.png`/`2.png`):
  - **30 ngày qua** (`Last Month` / `30d` — mặc định)
  - **7 ngày qua** (`Last 7 Days` / `7d`)
  - **Hôm nay** (`Today` / `today`)

### 5.3. Hàng 1: 5 Thẻ Chỉ Số Kinh Doanh Cốt Lõi (KPI Cards)
Xếp trên lưới 5 cột cân đối (tự động xuống 2–3 cột trên tablet và 1–2 cột trên điện thoại, không bao giờ tràn ngang), mỗi thẻ nền trắng viền mảnh, có biểu tượng màu góc phải và nút `(i)` giải thích cực kỳ dễ hiểu khi rê chuột hoặc bấm vào:
1. **Doanh thu thực nhận (`Revenue`)**: Màu xanh lá (`#16A34A`), icon đồng tiền xanh lá, hiển thị tổng tiền phòng khách sạn thu về trong kỳ (ví dụ `+31,8tr ₫` hoặc `+2.6K ₩`, hoặc `0 ₫` khi chưa có đơn).
2. **Tổng lượt báo giá (`Total Bids`)**: Màu đỏ cam (`#DC2626`), icon giường khách sạn, hiển thị tổng số lần khách sạn đã gửi báo giá cho khách trong kỳ.
3. **Tỷ lệ khách chốt (`Accept%`)**: Màu xanh dương (`#2563EB`), icon dấu tích tròn, phần trăm số báo giá được khách đồng ý đặt và thanh toán thành công.
4. **Điểm đánh giá (`Rating`)**: Màu đỏ/cam ngôi sao (`★4.8` hoặc `★0.0` với cơ sở mới), thể hiện mức độ hài lòng trung bình của khách đã lưu trú.
5. **Báo giá tự động (`AutoBid`)**: Màu xanh dương nhạt (`#0284C7`), icon tia sáng thông minh, hiển thị tỷ lệ báo giá được hệ thống hỗ trợ phản hồi tự động kịp thời (hoặc trạng thái phủ tự động).

### 5.4. Khu Vực 2: Biểu Đồ Doanh Thu & Lượng Đơn Theo Ngày (`Revenue Timeline`)
- **Biểu đồ kết hợp 2 trục tung (Dual-Axis ComposedChart)**:
  - Trục tung trái (đường viền đỏ): **Doanh thu** — vẽ đường cong mượt màu đỏ san hô có tô vùng mờ nhẹ phía dưới (giống hệt `2.png`, và nằm sát vạch `0` màu đỏ khi doanh thu bằng `0` như `1.png`).
  - Trục tung phải (đường viền xanh dương): **Số đơn hoàn tất** — vẽ cột màu xanh dương nhạt cho số đặt phòng thành công từng ngày.
  - Trục hoành: Chuỗi ngày liên tục trong kỳ đã chọn.
  - Hộp chú thích nổi (Tooltip nền tối chữ sáng như `1.png`): Ngày cụ thể, Doanh thu trong ngày, Số đơn đặt phòng thành công.
- **Khung cố vấn thu gọn/mở rộng (`Cẩm nang Doanh thu & Nhu cầu khách` · `Trợ lý AI goodNstay`)**:
  - Nằm ngay bên dưới biểu đồ trong cùng thẻ trắng, có nút **Thu gọn / Mở rộng** (`Collapse`) và nút làm mới thời gian phân tích.
  - Hàng nhãn tóm tắt màu sắc nổi bật: `Doanh thu kỳ này`, `Đơn hoàn tất`, `Giá thu bình quân / đơn`.
  - Khi chưa có đơn (`0` doanh thu như `1.png`): Hiển thị 1 thẻ nhận định ôn hòa giải thích khách sạn đang ở giai đoạn bắt đầu/chưa phát sinh đơn chốt và gợi ý kiểm tra mức giá chào.
  - Khi đã có doanh thu (`2.png`): Hiển thị 3 thẻ lời khuyên kinh doanh thực tế bằng ngôn ngữ đời thường:
    1. *Đà tăng trưởng doanh thu* (nhận xét xu hướng khách đặt và gợi ý giữ giá tốt ngày cao điểm/cuối tuần).
    2. *Tối ưu giá trị mỗi đơn đặt phòng* (gợi ý nâng cấp hạng phòng hoặc kèm bữa sáng để tăng thu nhập trên mỗi khách).
    3. *Ngày cao điểm đông khách nhất* (chỉ rõ ngày thu cao nhất trong kỳ và gợi ý ưu tiên nhận khách ở từ 2 đêm).

### 5.5. Khu Vực 3: Tình Trạng Các Lượt Báo Giá (`Bids Status`)
- **Biểu đồ cột chồng theo ngày (Stacked BarChart)**:
  - Mỗi ngày là 1 cột chồng gồm 4 nhóm kết quả rõ ràng theo đúng bảng màu của `1.png` & `2.png`:
    - Xanh lá (`#22C55E`): **Khách đã đặt (`Accepted`)**
    - Cam (`#F59E0B`): **Quá hạn phản hồi (`Expired`)**
    - Đỏ (`#EF4444`): **Khách chọn nơi khác (`Rejected`)**
    - Xám (`#9CA3AF`): **Khách sạn thu hồi/hủy (`Cancelled by Hotel`)**
  - Hàng chú thích dạng viên thuốc (pill) bên dưới biểu đồ kèm số lượng từng nhóm và biểu tượng `(i)` giải thích ngắn.
- **Bảng giải thích & thống kê (`Chi tiết kết quả báo giá & Ý nghĩa`)**:
  - 4 dòng trạng thái + dòng **Tổng cộng (`Total Bids`)** ở cuối, gồm các cột: *Trạng thái* | *Giải thích dễ hiểu* | *Số lượt* | *Tỷ trọng (%)*.
  - Mọi câu giải thích viết thuần nghiệp vụ lễ tân/chủ khách sạn (ví dụ: *"Khách đồng ý mức giá của khách sạn và đã thanh toán giữ phòng"* thay vì bất kỳ thuật ngữ kỹ thuật nào).
- **Khung cố vấn thu gọn/mở rộng (`Phân tích tỷ lệ chốt & Gợi ý cải thiện` · `Trợ lý AI goodNstay`)**:
  - Hàng nhãn tóm tắt: `Tỷ lệ khách chốt (xanh)`, `Bỏ lỡ do quá hạn (cam)`, `Tỷ lệ khách từ chối (đỏ)`.
  - 3 thẻ gợi ý hành động cụ thể: *Cơ hội tăng lượng khách chốt (Cân đối giá)*, *Tốc độ phản hồi khách (Duy trì báo giá tự động ban đêm)*, và *Mức độ cạnh tranh về giá (Điều chỉnh biên độ giảm giá tối thiểu khi vắng khách)*.

### 5.6. Khu Vực 4: Đánh Giá Của Khách & Độ Ưu Tiên Hiển Thị (`Ratings, Trust & Visibility`)
- Khung trên: **Điểm đánh giá chung của khách lưu trú** (`★★★★☆ 4.8 / 5` hoặc `0.0 / 5`) kèm 5 dòng tiêu chí chấm sao trực quan giống hệt ảnh mẫu:
  1. *Tiện nghi phòng (`Amenities`)*
  2. *Trải nghiệm nhận phòng (`Check-in Experience`)*
  3. *Độ sạch sẽ (`Cleanliness`)*
  4. *Thái độ phục vụ (`Service`)*
  5. *Xứng đáng giá tiền (`Value for Money`)*
- Khung dưới: **Điểm Uy Tín & Ưu Tiên Hiển Thị** (khi chuyển sang tiếng Anh hiển thị `ELO Score` đúng ảnh mẫu; ở Tiếng Việt ghi rõ **"Điểm uy tín hiển thị"** kèm dòng giải thích bình dân ngay bên dưới con số lớn màu tím xanh `#6366F1`, ví dụ: *"1.680 — Hiển thị ưu tiên cao (Khách dễ thấy báo giá của bạn trước)"* hoặc *"800 — Mức hiển thị thấp (Cần thêm đơn hoàn tất & đánh giá tốt)"* như `1.png`).

### 5.7. Khu Vực 5: Đơn Đặt Phòng Gần Đây (`Recent Bookings · <Tên khách sạn>`)
- **Khi kỳ/cơ sở chưa có đơn hoàn tất (như `1.png`)**: Hiển thị khung trống trang nhã ở giữa thẻ với biểu tượng lịch/hóa đơn, dòng tiêu đề *"Chưa có đơn đặt phòng gần đây"* và mô tả *"Hiện chưa có đặt phòng hoàn tất nào trong khoảng thời gian này."*
- **Khi có đơn hoàn tất (như `2.png`)**:
  - Bảng sạch sẽ gồm 6 cột:
    1. **Trạng thái (`Status`)**: Icon tích tròn xanh lá.
    2. **Mã đặt phòng (`Booking ID`)**: Định dạng gọn đẹp thân thiện kiểu phần mềm khách sạn (`#71`, `#70`... ánh xạ nhất quán từ đơn đã thanh toán).
    3. **Nhận phòng (`Check-in`)**: Ngày nhận phòng rõ ràng.
    4. **Trả phòng (`Check-out`)**: Ngày trả phòng rõ ràng.
    5. **Tình trạng đơn (`Booking State`)**: Nhãn xanh lá `Hoàn tất · Đã thanh toán` (`Completed · Paid`).
    6. **Thời điểm thanh toán (`Paid At`)** & **Thao tác (`Action`)**: Nút `👁 Xem chi tiết` (`View detail`).
  - **Hộp thoại `Xem chi tiết đặt phòng` (Booking Detail Modal)**: Khi bấm `Xem chi tiết`, mở phiếu thông tin đặt phòng chuẩn phần mềm lễ tân khách sạn (Mã đặt phòng, Cơ sở, Hạng phòng & Số phòng đã xếp, Ngày nhận – trả phòng, Số đêm, Chi tiết tiền phòng khách sạn thực nhận, Thời gian thanh toán, Ghi chú yêu cầu của khách) và nút `Đóng`.
  - **Thanh phân trang chân bảng**: Chọn số dòng mỗi trang (`5` / `10` / `20`, mặc định `5` giống `2.png`), chỉ báo `1–5 trên N` và nút `<` `>` chuyển trang.
  - **Thanh tổng kết cuối thẻ**: Bên trái hiển thị `Trong kỳ này: ✔ N đơn hoàn tất · <Tổng doanh thu trang/kỳ>`, bên phải hiển thị `Thực nhận ròng: <Số tiền>` màu xanh lá giống hệt `2.png`.

---

## 6. Chiến Lược Kiểm Thử & Dọn Dẹp Mã Nguồn

1. **Tổ chức lại mã nguồn sạch gọn**:
   - Tách nhỏ giao diện thành các module dễ đọc: từ điển ngôn ngữ & tiền tệ (`src/lib/i18n.ts`), bộ tính toán dữ liệu tổng quan (`src/services/overviewAnalytics.ts`), thanh bên & đầu trang (`src/components/PartnerHubShell.tsx`), hộp thoại chi tiết phiếu đặt phòng (`src/components/BookingDetailModal.tsx`), và trang chính `src/App.tsx`.
   - Gỡ bỏ sự phụ thuộc giao diện vào các component thiên về kỹ thuật cũ (`LifecycleStateExplorer`, `PaymentConversionFunnelPanel`, `SelectionBenchmarkLinePanel`, `CustomBidModal`, `MatchBreakdownModal`, `RoomScheduleExplorer`, `KpiDrilldownModal`).
2. **Kiểm thử tự động toàn diện (`npm test` & `npm run build`)**:
   - Giữ nguyên toàn bộ kiểm thử hợp đồng dữ liệu gốc (`master-data-contract.test.ts`, `pricing-and-formatters.test.ts`, `analytics-engine.test.ts`, `api-master-data.spec.ts` cập nhật selector theo trang mới cho kịch bản offline fallback).
   - Bổ sung unit test cho bộ tổng hợp `overviewAnalytics.ts` (chuỗi doanh thu theo ngày, tổng 4 nhóm trạng thái báo giá khớp 100%, quy đổi `VND / KRW / USD`, và cơ sở mới `Stay Hotel H11` trả về 0 đơn hoàn tất).
   - Cập nhật bộ Playwright E2E kiểm tra đầy đủ: thu gọn/mở rộng thanh menu trái, chuyển đổi Khách sạn/Chi nhánh (bao gồm cả trạng thái có đơn như `2.png` và trạng thái trống `0` đơn như `1.png`), chuyển đổi Kỳ thời gian (`30d` / `7d` / `today`), chuyển đổi Ngôn ngữ (`vi` / `en` / `ko`) & Tiền tệ (`VND` / `KRW` / `USD`), thu gọn/mở rộng 2 khung Trợ lý AI, phân trang bảng Đơn đặt phòng (`Rows per page: 5/10`, `<`, `>`), mở/đóng hộp thoại `Xem chi tiết`, và kiểm tra không tràn ngang trên đủ **7 kích thước màn hình** (`1440×900` → `360×800`).
   - Cập nhật danh mục mã kiểm thử trong `tests/TEST_CASES.md`.

---

## 7. Các Quyết Định Chi Tiết Giao Cho Người Triển Khai (Left to the Builder)

- Tinh chỉnh khoảng cách padding, độ bo góc (`12px–16px`), đổ bóng nhẹ và mã màu biểu đồ Recharts sao cho sát nhất với `1.png` và `2.png`.
- Tỷ giá quy đổi tham chiếu hiển thị nhất quán trên giao diện đối tác (ví dụ: `1 KRW ≈ 18.5 VND`, `1 USD ≈ 25,400 VND`) để khi người dùng chuyển giữa `VND`, `KRW`, `USD` các con số và trục tung biểu đồ co giãn tự nhiên, dễ đọc.
- Sắp xếp bố cục đáp ứng (responsive) trên màn hình điện thoại nhỏ (`360px–390px`): bảng *Đơn đặt phòng gần đây* và *Chi tiết trạng thái báo giá* nằm trong khung cuộn ngang cục bộ mượt mà của riêng bảng (`overflow-x-auto`), giữ cho toàn trang không bao giờ bị vỡ hay tràn chiều ngang.
