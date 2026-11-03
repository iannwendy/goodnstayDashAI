# Báo Cáo Kiểm Thử Responsive Mobile (Các Tỉ Lệ Màn Hình Ít Phổ Biến) — goodNstay.com

- **URL kiểm thử**: `https://goodnstay.com/en-US` & `https://goodnstay.com/vi-VN`
- **Phạm vi kiểm thử**: Trang Login (Home page khi chưa đăng nhập), Trang Tạo tài khoản (Sign Up / Create Account), Trang Quên mật khẩu (Forgot Password), Menu Drawer Mobile, Onboarding Tour (`Take a tour`), và các seção trên trang chủ Login (`Hall of Fame`, `Floating Actions`).
- **Thư mục lưu ảnh chụp màn hình chuẩn**: `/Users/iannwendy/Desktop/goodNstay/responsive_mobile_bugs/`
- **Quy ước đặt tên file ảnh**: `BUG-<ID>_<Page>_<Issue-Summary>_<WidthxHeight>_<AspectRatio>_<Device>.png`

---

## Danh Sách Các Tỉ Lệ Màn Hình Đã Kiểm Thử

| Kích thước (CSS px) | Tỉ lệ màn hình | Thiết bị đại diện (Ít phổ biến / Đặc thù) |
| :--- | :--- | :--- |
| **`280x653`** | `~21:9` (Siêu hẹp) | Samsung Galaxy Fold (Gen 1) — Màn hình ngoài (Cover Screen) |
| **`320x374`** | `~6:7` (Gần vuông nhỏ) | Samsung Galaxy Z Flip5 — Màn hình phụ (Flex Window / Cover) |
| **`320x480`** | `3:2` (Ngắn & hẹp) | iPhone 4 / 4S / Thiết bị Mobile Compact 3:2 |
| **`320x568`** | `16:9` (Nhỏ hẹp) | iPhone SE (Gen 1) / iPhone 5S |
| **`344x882`** | `23.1:9` (Siêu dài & hẹp) | Samsung Galaxy Z Fold5 / Z Fold4 — Màn hình ngoài |
| **`360x840`** | `21:9` (CinemaWide) | Sony Xperia 1 V / Xperia 5 V |
| **`412x446`** | `~9:10` (Gần vuông) | Motorola Razr 40 Ultra / 50 Ultra — Màn hình ngoài |
| **`450x450`** | `1:1` (Màn hình vuông) | BlackBerry Passport / Unihertz Titan |
| **`540x720`** | `3:4` (Màn hình đơn rộng) | Microsoft Surface Duo (Single Screen) |
| **`568x320`** | `16:9` (Xoay ngang) | Mobile Landscape (iPhone SE / Compact Android xoay ngang) |
| **`673x841`** | `~4:5` (Gập mở rộng) | Samsung Galaxy Z Fold — Màn hình chính mở rộng (Unfolded) |

---

## Chi Tiết 10 Nhóm Lỗi Responsive & Lấp Chữ (Kèm Ảnh Chụp Màn Hình)

### BUG-01: Nút "Accommodation" / "Lưu trú" trên thanh Header bị cắt cụt chữ và mất viền bo góc
- **Trang gặp lỗi**: Login (Home Page), Create Account (Sign Up), Forgot Password (chung `<nav>` Header).
- **Kích thước màn hình bị ảnh hưởng**: Tất cả màn hình có chiều ngang `< 394px` đối với bản tiếng Anh (`280x653`, `320x374`, `320x480`, `320x568`, `344x882`, `360x840`) và `280x653` đối với bản tiếng Việt.
- **Mô tả chi tiết**:
  - Tab `"Accommodation"` có kích thước cố định rộng `238px` (`min-h-[64px] px-4 py-3 whitespace-nowrap text-lg`) nằm trong thẻ `<ul class="flex-1 overflow-x-auto">` kẹp giữa Logo `goodNstay` và cụm nút `?` (`Take a tour`) + Hamburger (`Open menu`).
  - Ở màn hình `280x653` (21:9), `<ul>` chỉ còn rộng `124px`, khiến chữ `"Accommodation"` bị cắt cụt thành **`"Accor"`** (bản tiếng Việt `"Lưu trú"` bị cắt thành **`"Lưu t"`**).
  - Ở màn hình `344x882` (23.1:9 Galaxy Z Fold5 Cover), chữ bị cắt thành **`"Accommodat"`**.
  - Ở màn hình `360x840` (21:9 Sony Xperia 1 V), chữ bị cắt thành **`"Accommodatio"`**.
- **Ảnh chụp màn hình**:
  - `BUG-01a_Login-Header_Accommodation-Clipped_280x653_21-9_GalaxyFoldCover.png`
  - `BUG-01b_Login-Header_Accommodation-Clipped_344x882_23.1-9_GalaxyZFold5Cover.png`
  - `BUG-01c_Login-Header_Accommodation-Clipped_360x840_21-9_SonyXperia1V.png`

---

### BUG-02: Tiêu đề "GOODNSTAY HALL OF FAME" bị tràn khung lệch tâm & ô Location bị cắt chữ
- **Trang gặp lỗi**: Login (Home Page — khu vực `GOODNSTAY HALL OF FAME`).
- **Kích thước màn hình bị ảnh hưởng**: `280x653` (`21:9` Galaxy Fold Cover).
- **Mô tả chi tiết**:
  - Khung chứa tiêu đề `<h2>GOODNSTAY HALL OF FAME</h2>` nằm kẹp giữa 2 biểu tượng bông lúa (`45x45px` mỗi bên) nên chỉ còn rộng `102px` (`clientWidth: 102px`), trong khi từ `"GOODNSTAY"` rộng `125px` (`scrollWidth: 125px`). Do không thể ngắt dòng từ `"GOODNSTAY"`, chữ bị tràn sang phải (`23px`), làm dòng chữ `"GOODNSTAY"` bị lệch hẳn sang phải so với `"HALL OF"` và `"FAME"` và đè sát vào bông lúa bên phải.
  - Ô tìm kiếm `Location` bên dưới bị hẹp khiến giá trị mặc định `"Seoul, South Korea"` bị cắt cụt thành **`"Seoul, South Kor"`**.
- **Ảnh chụp màn hình**:
  - `BUG-02_Login-Home_HallOfFame-Heading-And-Location-Overflow_280x653_21-9_GalaxyFoldCover.png`

---

### BUG-03: Hai nút nổi cố định (`✨ GNS AI` và `Back to top ↑`) đè trực tiếp lên các nút bấm, ô nhập liệu và link chuyển trang trong Form
- **Trang gặp lỗi**: Login, Create Account (Sign Up), Forgot Password, và cả khi mở Mobile Menu Drawer.
- **Kích thước màn hình bị ảnh hưởng**: Mọi màn hình mobile nhỏ/ngắn hoặc hẹp (`280x653`, `320x374`, `320x480`, `320x568`, `344x882`, `412x446`, `568x320`).
- **Mô tả chi tiết**:
  - Cụm nút nổi `✨ GNS AI` (`101x44px`, góc dưới phải) và nút `Back to top ↑` (`48x48px`) có `position: fixed` và `z-index` rất cao, luôn đè lên góc dưới bên phải của màn hình.
  - Trên trang **Login** (`320x480` 3:2 và `280x653` 21:9): Nút `✨ GNS AI` che khuất hoàn toàn chữ `"Signup"` trong dòng `"Don't have an account? Signup now"` (chỉ còn thấy chữ `"now"`), che một phần nút `"LOGIN & FIND YOUR STAY"`, `"Google"`, `"Naver"`, còn nút `↑` đè lên góc phải của nút `"LOGIN & FIND YOUR STAY"`.
  - Trên trang **Create Account (Sign Up)** (`280x653`, `344x882`): Hai nút này đè lên biểu tượng con mắt ẩn/hiện mật khẩu (`Toggle password visibility`), các lựa chọn giới tính (`Male`, `Female`, `Others`, `Prefer not to say`), đường link `"Terms & Conditions"` / `"Privacy Policy"`, nút `"SIGN UP goodNstay"`, và link `"Login now"`.
- **Ảnh chụp màn hình**:
  - `BUG-03a_Login_Floating-Buttons-Overlap-Form-Controls_320x480_3-2_iPhone4Compact.png`
  - `BUG-03b_SignUp_Floating-Buttons-Overlap-Submit-And-LoginLink_280x653_21-9_GalaxyFoldCover.png`

---

### BUG-04: Cụm Radio "Gender * (required)" / "Giới tính * (bắt buộc)" không xuống dòng khiến chữ bị tràn lề phải của Form và ngắt dòng dọc khó đọc
- **Trang gặp lỗi**: Create Account (Sign Up).
- **Kích thước màn hình bị ảnh hưởng**: `280x653` (`21:9`), `320x374` (`6:7`), `320x480` (`3:2`), `320x568` (`16:9`), `344x882` (`23.1:9`).
- **Mô tả chi tiết**:
  - Trong khi các trường input khác dùng `.ota-form-row` để đưa nhãn (`label`) lên dòng trên khi màn hình hẹp, trường `Gender * (required)` lại giữ nhãn nằm ngang bên trái và ép 4 radio buttons (`Male`, `Female`, `Others`, `Prefer not to say` / `Không muốn nói`) vào một cột cực hẹp bên phải.
  - Ở `280x653` (`scrollWidth: 204px > clientWidth: 192px`), chữ **`"Female"`** (bản EN) và **`"Không muốn nói"`** (bản VI) tràn hẳn ra ngoài đường kẻ biên phải của Form (`right: 248px–251px` so với biên form `right: 236px`), chạm sát mép thẻ trắng.
  - Cụm chữ `"Prefer not to say"` / `"Không muốn nói"` bị ép gãy thành 3 dòng ngắn (`Prefer / not to / say`), trong khi toàn bộ nửa dưới bên trái của mục Gender bị bỏ trống.
  - Đồng thời ở `280x653`, placeholder `"Search for a country"` bị cắt thành **`"Search for a countr"`**, và placeholder số điện thoại `"912 345 678"` bị cắt mất nửa số `8` (**`"912 345 67{"`**).
- **Ảnh chụp màn hình**:
  - `BUG-04a_SignUp_Gender-Radio-Group-Cramped-And-Overflowing_280x653_21-9_GalaxyFoldCover.png`
  - `BUG-04b_SignUp-VI_Gender-Radio-Group-Overflowing-Card_280x653_21-9_GalaxyFoldCover.png`

---

### BUG-05: Dropdown "Country of residence" bị đường viền cắt ngang chữ ("Angola") và đè chồng chữ lên mục Gender bên dưới
- **Trang gặp lỗi**: Create Account (Sign Up).
- **Kích thước màn hình bị ảnh hưởng**: `280x653` (`21:9`), `320x568` (`16:9`), `344x882` (`23.1:9`), `360x840` (`21:9`).
- **Mô tả chi tiết**:
  - Khi mở danh sách chọn quốc gia (`Country of residence` — `[role="listbox"]`), đường viền đen của khung danh sách (`height: 240px`) cắt ngang qua nửa dưới dòng chữ **`"Angola"`** ở cuối khung nhìn.
  - Ở màn hình `280x653`, chữ **`"Angola"`** bị lấp/đè trực tiếp lên dòng chữ **`"Gender * (required) ○ Male"`** nằm ngay sát mép dưới của dropdown.
- **Ảnh chụp màn hình**:
  - `BUG-05a_SignUp_Country-Combobox-Text-Overlap-Gender_280x653_21-9_GalaxyFoldCover.png`
  - `BUG-05b_SignUp_Country-Combobox-Dropdown-Border-Clips-Option_344x882_23.1-9_GalaxyZFold5Cover.png`

---

### BUG-06: Breakpoint `@container (max-width: 319px)` kích hoạt quá sớm ở màn hình `412x446` & `450x450` khiến ô nhập Số điện thoại bị bóp nghẹt (chỉ hiện 3 chữ số) và nhãn đè lên đường kẻ ngang
- **Trang gặp lỗi**: Create Account (Sign Up).
- **Kích thước màn hình bị ảnh hưởng**: Các màn hình có chiều ngang từ `408px` đến `480px`, đặc biệt trên các tỉ lệ màn hình vuông/gần vuông như **`412x446` (`~9:10` Motorola Razr External Screen)** và **`450x450` (`1:1` BlackBerry Passport / Square Mobile)**.
- **Mô tả chi tiết**:
  - CSS của form sử dụng `@container (max-width: 319px)` trên `.ota-form-row-container` để xếp dọc nhãn (`label`) phía trên ô `input`. Ngay khi màn hình đạt chiều ngang `408px` (`412x446` có container rộng `324px > 319px`), form lập tức chuyển sang bố cục nằm ngang (`flex-direction: row`), ép nhãn và ô input nằm trên cùng 1 hàng:
    1. **Trường `Số điện thoại * (bắt buộc)` / `Phone No. * (required)`**: Nhãn + nút chọn mã vùng (`🇰🇷 +82 ⌄`) + ô nhập số điện thoại bị ép chung vào một dòng `324px`. Ở bản tiếng Việt (`412x446`), phần diện tích hiển thị số điện thoại chỉ còn rộng khoảng **`35px`**, khiến placeholder `"912 345 678"` bị cắt cụt chỉ còn thấy đúng 3 chữ số **`"912 "`**! Ở bản tiếng Anh (`412x446`), placeholder cũng bị cắt mất `" 678"`, chỉ còn **`"912 345"`**.
    2. **Trường `Country of residence * (required)` / `Quốc gia cư trú * (bắt buộc)`**: Nhãn bị gãy thành 2–3 dòng bên trái và chữ `"(required)"` / `"(bắt buộc)"` ở dòng cuối chạm/đè sát lên đường kẻ viền dưới (`border-b`) của hàng input.
- **Ảnh chụp màn hình**:
  - `BUG-06a_SignUp-VI_Phone-Input-Crushed-To-3-Digits_412x446_9-10_MotorolaRazrCover.png`
  - `BUG-06b_SignUp_Phone-Input-Crushed-And-Label-Border-Collision_450x450_1-1_SquareMobile.png`

---

### BUG-07: Dropdown chọn mã vùng điện thoại (`+82`) bị tràn hẳn ra ngoài mép phải màn hình và bị trôi lệch vị trí khi cuộn trang
- **Trang gặp lỗi**: Create Account (Sign Up).
- **Kích thước màn hình bị ảnh hưởng**:
  - Nhóm 1 (Màn hình `< 328px`): `280x653` (`21:9`), `320x374` (`6:7`), `320x480` (`3:2`), `320x568` (`16:9`).
  - Nhóm 2 (Màn hình `408px – 503px`): `412x446` (`9:10` Motorola Razr Cover), `450x450` (`1:1` Square Mobile).
- **Mô tả chi tiết**:
  - Popup chọn mã vùng điện thoại (`[data-phone-dial-menu="true"]`) sử dụng `position: fixed; width: 280px; left: <button.left>px` mà không giới hạn (`clamp`) theo `window.innerWidth`:
    - Ở màn hình `280x653`: Nút `+82` có `left: 48px` -> popup trải dài tới `right: 328px`, tràn **`48px` ra khỏi mép phải màn hình `280px`** (mất viền phải và thanh cuộn).
    - Ở màn hình `412x446` (và `450x450`): Do nhãn `"Số điện thoại * (bắt buộc)"` nằm ngang bên trái đẩy nút `+82` sang `left: 223.8px`, popup rộng `280px` trải dài tới `right: 503.8px`, **tràn `92px` ra khỏi mép phải màn hình `412px`** (và tràn `54px` ở màn hình `450x450`)!
    - Ngoài ra, do dùng `position: fixed` với tọa độ `top` tĩnh lúc mở mà không cập nhật khi cuộn trang, nếu người dùng cuộn trang khi popup đang mở, popup sẽ tách rời khỏi nút `+82` và trôi lơ lửng đè lên các trường khác hoặc tiêu đề trang.
- **Ảnh chụp màn hình**:
  - `BUG-07a_SignUp-VI_Phone-CountryCode-Dropdown-Overflow-And-Detach_412x446_9-10_MotorolaRazrCover.png`
  - `BUG-07b_SignUp_Phone-CountryCode-Dropdown-Overflow_280x653_21-9_GalaxyFoldCover.png`

---

### BUG-08: Lịch chọn Ngày sinh (DOB Calendar) bị cắt mất hàng ngày cuối tháng (`26–31`) trên màn hình thấp/xoay ngang & trùng lặp 6 cột thứ `"Th"` ở bản tiếng Việt
- **Trang gặp lỗi**: Create Account (Sign Up — popup `Select Date` / `Chọn ngày`).
- **Kích thước màn hình bị ảnh hưởng**: `568x320` (`16:9` Mobile Landscape), `320x374` (`6:7` Galaxy Z Flip5 Cover Screen).
- **Mô tả chi tiết**:
  - Khi mở popup lịch `.ota-dob-cal-v2__panel` trên màn hình có chiều cao thấp (`568x320`), khung lịch bị giới hạn chiều cao nhưng không có thanh cuộn dọc (`overflow-y: auto`), khiến toàn bộ hàng ngày cuối cùng của tháng (**`26, 27, 28, 29, 30, 31`**) bị cắt mất ở đáy popup (chỉ nhìn thấy 2px mép trên của ô ngày `30`), người dùng không thể chọn các ngày từ `26` đến `31`.
  - Ở bản tiếng Việt (`vi-VN`), tiêu đề 7 cột thứ trong tuần bị cắt 2 ký tự đầu (`"Thứ 2"` .. `"Thứ 7"` -> `"Th"`), dẫn đến 6 cột từ Thứ Hai đến Thứ Bảy đều hiển thị giống hệt nhau: **`Th | Th | Th | Th | Th | Th | Ch`**.
- **Ảnh chụp màn hình**:
  - `BUG-08_SignUp-VI_DOB-Calendar-Clipped-And-Duplicate-Th-Headers_568x320_16-9-Landscape.png`

---

### BUG-09: Menu Drawer trên Mobile bị tràn danh sách Tiền tệ ra ngoài mép trái màn hình & vùng menu điều hướng bị ép còn `38px` không thể sử dụng khi xoay ngang
- **Trang gặp lỗi**: Mobile Hamburger Menu Drawer (mở từ Header của trang Login / Sign Up / Forgot Password).
- **Kích thước màn hình bị ảnh hưởng**:
  - Nhóm 9a (`280x653` 21:9, `320x568` 16:9): Bị cắt chữ nút ngôn ngữ & tràn mép trái dropdown tiền tệ.
  - Nhóm 9b (`568x320` 16:9 Landscape, `320x374` 6:7 Z Flip Cover): Vùng danh sách link điều hướng bị bóp nghẹt.
- **Mô tả chi tiết**:
  - **Lỗi 9a (Ở `280x653`)**:
    - Nút chọn ngôn ngữ trong Drawer quá hẹp khiến ngay cả chữ `"English"` cũng bị cắt thành **`"Engl..."`** (tiếng Việt bị cắt thành **`"Tiếng V..."`**).
    - Khi bấm vào nút chọn tiền tệ (`USD $`), menu thả xuống có class `absolute right-0 min-w-[16rem]` (`width: 256px`). Vì mép phải của nút `USD $` nằm ở `x = 230.4px`, cạnh trái của menu tiền tệ bị đẩy âm ra ngoài màn hình (**`left: -25.6px`**), làm **mất ký tự đầu tiên của toàn bộ các loại tiền tệ**: `"SD $ US Dollar"`, `"ND ₫ Vietnamese Dong"`, `"RW ₩ South Korean Won"`, `"WD NT$ New Taiwan Dollar"`, `"PY ¥ Japanese Yen"`, `"NY ¥ Chinese Yuan"`, `"UR € Euro"`, `"UB ₽ Russian Ruble"`, `"DR Rp Indonesian Rupiah"`.
    - Đồng thời, mở dropdown Tiền tệ không tự động đóng dropdown Ngôn ngữ khiến 2 menu chồng đè lên nhau, và chiều cao danh sách tiền tệ (`bottom: 803px`) tràn khỏi đáy màn hình `653px`.
  - **Lỗi 9b (Ở `568x320` Landscape)**:
    - Trong Drawer (`height: 320px`), phần Header chứa Logo (`155px`) và cụm nút `Tạo tài khoản miễn phí` + `Ngôn ngữ / Tiền tệ` (`126px`) chiếm cứng **`282px` chiều cao cố định không cuộn được**.
    - Phần danh sách điều hướng bên dưới (`Khám phá thế giới / Lưu trú / Tài khoản / Lịch sử / Hỗ trợ`) chỉ còn đúng **`38px` chiều cao** (`320 - 282 = 38px`), chỉ lộ ra nửa dòng tiêu đề `"Khám phá thế giới"` và hoàn toàn không nhìn thấy bất kỳ mục menu nào.
- **Ảnh chụp màn hình**:
  - `BUG-09a_MobileMenu_Currency-Dropdown-Left-And-Bottom-Offscreen_280x653_21-9_GalaxyFoldCover.png`
  - `BUG-09b_MobileMenu_Drawer-Navigation-Crushed-Into-38px-Slit_568x320_16-9-Landscape.png`

---

### BUG-10: Trang Quên mật khẩu (Forgot Password) bị mất thẻ nền trắng & tiêu đề trang; Popover "Take a tour" chạm sát mép phải màn hình `280x653`
- **Trang gặp lỗi**: Forgot Password (`Forget password?` / `Quên mật khẩu?`) & Popover `Take a tour` (`?`).
- **Kích thước màn hình bị ảnh hưởng**: `280x653` (`21:9` Galaxy Fold Cover) và các màn hình mobile khác.
- **Mô tả chi tiết**:
  - Khi chuyển từ trang Login (`LOGIN & FIND YOUR STAY`) hoặc Sign Up (`CREATE ACCOUNT & FIND YOUR STAY`) sang trang **Forgot Password**, giao diện bị mất thẻ nền trắng bo góc (`bg-white rounded-3xl p-4 shadow`) và hoàn toàn **không có tiêu đề (`<h2>` / `<h3>`)** để báo cho người dùng biết đang ở màn hình Đặt lại mật khẩu / Quên mật khẩu (chỉ có mỗi ô `Email * (required)` nằm trơ trọi trên nền xám).
  - Khi bấm vào nút `?` (`Take a tour`) trên Header ở màn hình `280x653`, hộp thoại hướng dẫn (`width: 270px, left: 10px, right: 280px`) tràn chạm sát mép phải của viewport (`right: 280px`, không còn khoảng cách lề phải).
- **Ảnh chụp màn hình**:
  - `BUG-10_ForgotPassword-And-Tour_Missing-Card-Header-And-Tour-Popover-Edge-Collision_280x653_21-9_GalaxyFoldCover.png`
