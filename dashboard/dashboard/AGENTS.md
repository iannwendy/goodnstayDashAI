# Partner Auction Dashboard v2 — Agent Engineering & Mandatory Testing Rules

Mọi AI Agent làm việc trong thư mục `dashboard/dashboard` **BẮT BUỘC** tuân thủ quy trình kiểm thử tự động dưới đây sau **mỗi lần** thêm tính năng mới, chỉnh sửa tính năng cũ, cập nhật dữ liệu mẫu hoặc sửa lỗi giao diện:

## 1. Quy Tắc Bắt Buộc Sau Mỗi Lần Chỉnh Sửa Code ("Code Xong Phải Test Kỹ + Thêm Testcase")

1. **Bổ sung / cập nhật Test Case tương ứng với thay đổi vừa làm**:
   - Sửa công thức giá (`×1.265`), định dạng tiền tệ, đếm ngược, ngày lưu trú -> thêm/cập nhật test trong `tests/unit/pricing-and-formatters.test.ts`.
   - Sửa cấu trúc hoặc dữ liệu `master-data/*.json` -> đồng bộ với `master-data/seed/*.json` và thêm kiểm tra ràng buộc trong `tests/unit/master-data-contract.test.ts`.
   - Sửa logic KPI, bộ lọc kỳ (`today`/`7d`/`30d`), chi nhánh, phễu chuyển đổi 8 bước, xả đêm, lịch phòng 14 ngày hoặc biểu đồ Benchmark -> thêm test trong `tests/unit/analytics-engine.test.ts`.
   - Thêm/sửa nút bấm, switch, dropdown, bảng phân trang, hộp thoại modal hoặc phân quyền RBAC (`Quản lý` vs `Lễ tân`) -> thêm kịch bản E2E trong `tests/e2e/buttons-and-modals.spec.ts` hoặc `tests/e2e/workflows-and-rbac.spec.ts`.
   - Thêm/sửa bố cục giao diện, lưới thẻ, biểu đồ Recharts hoặc bảng dữ liệu -> kiểm tra không tràn ngang trên đủ **7 kích thước màn hình** (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`) trong `tests/e2e/responsive-matrix.spec.ts`.
   - Cập nhật danh mục mã Test Case trong `tests/TEST_CASES.md`.

2. **Chạy toàn bộ bộ kiểm thử tự động & Build Production trước khi báo cáo hoàn thành**:
   ```bash
   npm test
   npm run build
   ```
   - `npm test` sẽ tự động chạy:
     - **Phase 1**: Toàn bộ Unit Test + Master-Data Contract + Business Logic + Cổng kiểm tra kiểu `tsc --noEmit` (`tests/unit/*.test.ts`).
     - **Phase 2**: Toàn bộ Playwright E2E + REST API + Nút bấm/Modal + RBAC + Ma trận Responsive 7 màn hình (`tests/**/*.spec.ts`).
     - **Cleanup**: Tự động khôi phục sạch `master-data/*.json` từ `master-data/seed/*.json`.
   - Nếu bất kỳ test nào đỏ: **phải tìm đúng nguyên nhân gốc và sửa dứt điểm cho tới khi 100% PASS** (`0 fail`, `0 console.error`, `0 pageerror`, `0 horizontal overflow`).

3. **Bảo toàn môi trường chạy**:
   - Không tắt tiến trình Vite dev server đang mở trên cổng `5182` (`playwright.config.ts` đã cấu hình `reuseExistingServer: true`).
   - Kích hoạt skill `.agents/skills/dashboard-qa-testing/SKILL.md` bất cứ khi nào thao tác trên dự án này.
