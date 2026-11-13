# Hệ Thống Kiểm Thử Tự Động Toàn Diện (`tests/`)

Thư mục này chứa toàn bộ hệ thống kiểm thử tự động cho **Optibide Partner Hub — Dashboard Overview** (`goodNstay Partner Auction Dashboard v2`), bao phủ từ công thức nền, hợp đồng dữ liệu JSON, engine phân tích tổng quan kinh doanh khách sạn, đa ngôn ngữ/tiền tệ, kiểm tra kiểu TypeScript, REST API cho tới từng nút bấm, thông báo, phiếu đặt phòng và giao diện responsive trên 7 kích thước màn hình.

## Cấu Trúc Thư Mục

```text
tests/
├── README.md                              # Hướng dẫn chạy & mở rộng bộ test
├── TEST_CASES.md                          # Danh mục chi tiết toàn bộ mã Test Case (TC-*)
├── helpers/
│   ├── register-ts-alias.mjs              # Node 24 ESM loader giải quyết alias @/* cho Unit Test
│   ├── seed-loader.ts                     # Nạp dữ liệu gốc từ master-data/seed/*.json
│   └── e2e-helpers.ts                     # Tiện ích Playwright (chặn lỗi console, reset seed, kiểm tra tràn ngang)
├── unit/
│   ├── pricing-and-formatters.test.ts     # Kiểm thử công thức giá nền, định dạng VNĐ, đếm ngược, ngày lưu trú
│   ├── master-data-contract.test.ts       # Kiểm thử schema, khóa ngoại & đồng bộ bảng Master Data
│   ├── analytics-engine.test.ts           # Kiểm thử động cơ tổng hợp nền theo kỳ, chi nhánh, lịch 14 ngày
│   ├── overview-analytics.test.ts         # Kiểm thử KPI Tổng quan, chuỗi ngày, báo giá 4 nhóm, đa ngôn ngữ/tiền tệ & mã đơn ổn định
│   └── build-and-typecheck.test.ts        # Cổng kiểm tra biên dịch tĩnh tsc --noEmit (0 lỗi)
└── e2e/
    ├── api-master-data.spec.ts            # Kiểm thử REST API GET/PUT/POST, lỗi 400 & fallback offline
    ├── buttons-and-modals.spec.ts         # Kiểm thử thanh menu trái, trợ giúp, thông báo, cố vấn AI & phiếu đặt phòng
    ├── workflows-and-rbac.spec.ts         # Kiểm thử ngôn ngữ thuần kinh doanh, bộ lọc kỳ/cơ sở, đa ngôn ngữ/tiền tệ & phân trang
    └── responsive-matrix.spec.ts          # Kiểm thử responsive 7 màn hình (360px -> 1440px), ngăn kéo menu & modal
```

## Các Lệnh Chạy Kiểm Thử

Chạy từ thư mục `dashboard/dashboard`:

```bash
# 1. Chạy TOÀN BỘ (Unit + Data Contract + Logic + Typecheck + E2E + Responsive + Tự động Reset Seed)
npm test

# 2. Chỉ chạy nhanh Unit + Contract + Business Logic + Typecheck (~1.3 giây)
npm run test:unit

# 3. Chỉ chạy toàn bộ Playwright E2E + API + Responsive
npm run test:e2e

# 4. Chỉ chạy ma trận Responsive 7 kích thước màn hình (360px -> 1440px)
npm run test:responsive

# 5. Kiểm tra riêng biên dịch TypeScript & đóng gói Production
npm run test:typecheck
npm run build
```

## Quy Tắc Bắt Buộc Khi Sửa Code Hoặc Thêm Tính Năng Mới

1. **Không bao giờ kết thúc phiên làm việc mà chưa chạy `npm test` và `npm run build` xanh 100%**.
2. **Thêm tính năng mới / sửa logic cũ -> Bắt buộc thêm Test Case mới**:
   - Hàm tính toán / công thức / bộ lọc mới -> thêm test vào `tests/unit/analytics-engine.test.ts` hoặc `tests/unit/pricing-and-formatters.test.ts`.
   - Thêm trường JSON mới -> cập nhật cả `master-data/seed/*.json` lẫn `master-data/*.json` và bổ sung kiểm tra vào `tests/unit/master-data-contract.test.ts`.
   - Thêm nút bấm / modal / biểu đồ / bảng mới -> bổ sung kịch bản tương tác vào `tests/e2e/` và đảm bảo không tràn ngang trên mobile `360px`/`390px` trong `tests/e2e/responsive-matrix.spec.ts`.
   - Ghi nhận mã Test Case mới vào `tests/TEST_CASES.md`.
3. **Giữ sạch dữ liệu gốc**: Mọi test E2E có ghi dữ liệu (`PUT` / thao tác UI) phải gọi `resetSeedViaApi(request)` trong `afterAll` (hoặc chạy qua `npm test`) để trả `master-data/*.json` về đúng bản `seed`.
