# Tiêu Chuẩn Kiểm Thử Bảo Mật API Phi Phá Hủy (OWASP Top 10:2025 & OWASP API Security Top 10:2023) Trên `goodNstay`

> **Mục đích tài liệu**: Hệ thống hóa phương pháp kiểm thử bảo mật API phi phá hủy (*Non-Destructive Security Smoke Testing*), ma trận đột biến đơn biến (`SEC-M01`..`SEC-M08`), quy tắc che lọc thông tin định danh cá nhân (`PII Scrubbing`) và danh mục bộ kiểm thử thực thi trên môi trường **Staging (`https://services.stag.goodnstay.com`)**.

---

## 1. Ranh Giới An Toàn Bắt Buộc Khi Kiểm Thử Bảo Mật (`Staging-Only & Non-Destructive`)

1. **Chỉ thực thi trên môi trường Staging**:
   - Toàn bộ request kiểm thử phân quyền, xác thực và rò rỉ dữ liệu chỉ được phép gửi tới `https://web.stag.goodnstay.com` và `https://services.stag.goodnstay.com`.
   - Mọi URL trỏ về Production (`goodnstay.com` / `services.goodnstay.com`) đều bị chặn cứng bởi quy tắc `FORBIDDEN_PRODUCTION_URL` trong công cụ kiểm thử tự động.
2. **Đột biến đơn biến an toàn (`1 Test Case = 1 Endpoint = 1 Single-Variable Mutation`)**:
   - Không dùng công cụ quét tấn công phá hoại (fuzzing gây treo DB, SQLi xóa bảng hay flood DDoS).
   - Mỗi kịch bản xuất phát từ một payload hợp lệ hoàn chỉnh (`valid-*.json`) và **chỉ thay đổi đúng 1 biến duy nhất** (ví dụ: bỏ header `Authorization`, đổi `:id` sang tài nguyên của tài khoản khác, hoặc chèn thêm 1 trường `role: "admin"` để kiểm tra *Mass Assignment*).

---

## 2. Ma Trận 8 Đột Biến Bảo Mật Cốt Lõi (`SEC-M01` .. `SEC-M08`)

| Mã Đột Biến | Hạng mục OWASP Top 10:2025 & API Top 10:2023 | Kỹ thuật kiểm thử phi phá hủy | Hành vi Hệ thống Mong đợi (Pass Criteria) |
| :---: | :--- | :--- | :--- |
| **`SEC-M01`** | `A01:2025` Broken Access Control · `API2:2023` Broken Authentication | Lược bỏ hoàn toàn header `Authorization: Bearer` trên endpoint yêu cầu đăng nhập | Trả về `401 Unauthorized` chuẩn hóa; không thực thi nghiệp vụ và không trả `500`. |
| **`SEC-M02`** | `A01:2025` Broken Access Control · `API1:2023` BOLA | Giữ token của Người dùng A nhưng thay tham số đường dẫn `:id` bằng mã tài nguyên của Người dùng B | Trả về `403 Forbidden` hoặc `404 Not Found`; tuyệt đối không đọc/ghi đè được dữ liệu của B. |
| **`SEC-M03`** | `A01:2025` Broken Access Control · `API5:2023` BFLA | Dùng token vai trò thấp (`Traveler` hoặc `Receptionist`) gọi vào endpoint của `Admin` / `Manager` | Trả về `403 Forbidden`; từ chối thực thi chức năng vượt thẩm quyền. |
| **`SEC-M04`** | `A06:2025` Insecure Design · `API3:2023` BOPLA (Mass Assignment) | Bổ sung đúng 1 thuộc tính nhạy cảm không được phép sửa (`"role": "admin"` hoặc `"verified": true`) vào body `PUT/POST` | Backend bỏ qua trường lạ (whitelist DTO) hoặc trả `400 Bad Request`; quyền trong DB không thay đổi. |
| **`SEC-M05`** | `A04:2025` Cryptographic / Sensitive Data Exposure · `API3:2023` | Kiểm tra thụ động toàn bộ JSON trả về của các lệnh `2xx` (đặc biệt khi tạo yêu cầu hoặc lấy hồ sơ) | Không bao giờ lộ các cột nội bộ của bảng người dùng (`password`, `resetPasswordToken`, `confirmationToken`, `provider`, hash). |
| **`SEC-M06`** | `A10:2025` Mishandling of Exceptional Conditions · `API8:2023` | Truyền giá trị sai định dạng biên (VD: `dob: "not-a-valid-date"`, số trang âm `page=-1`) | Bắt lỗi đầu vào và trả `400/422` kèm mã lỗi rõ ràng; không văng `500 Internal Server Error` hay lộ stack trace. |
| **`SEC-M07`** | `A06:2025` Insecure Design · `API6:2023` Business Flow Bypass | Đảo ngược quy tắc nghiệp vụ cốt lõi (VD: `checkOutDate < checkInDate`, `roomCount < 0`) | Chặn ngay ở tầng Validation (`Fail-Closed`), đảm bảo 0 bản ghi rác được lưu vào DB. |
| **`SEC-M08`** | `A02:2025` Security Misconfiguration · `API4:2023` Unrestricted Resource Consumption | Kiểm tra chính sách `CORS` (`Origin` lạ) & bắt buộc xác thực trên các endpoint tiêu tốn tài nguyên trả phí (như dịch thuật AI / OpenAI) | Từ chối truy cập ẩn danh (`401`) và không trả `Access-Control-Allow-Origin: *` cho các miền không tin cậy. |

---

## 3. Quy Tắc Che Lọc Thông Tin Cá Nhân (`0% PII Leak`) Trong Bằng Chứng Báo Cáo Lỗi

Trước khi đính kèm bất kỳ ảnh chụp màn hình F12 Network/Console hoặc file `.json` fixture nào lên Jira hay kho lưu trữ Git:
- Xóa/thay thế toàn bộ token thật bằng `<REDACTED_QA_TOKEN>`, dùng dữ liệu mẫu an toàn (`QA Tester`, `qa-sample@example.test`, `+84900000000`).
- Trên giao diện trình duyệt trước khi chụp bằng chứng, che sạch tên tài khoản thật, ảnh đại diện, email, số điện thoại và mã băm nội bộ.

---

## 4. Mục Lục Trỏ Tới Bộ Kiểm Thử & Bằng Chứng Thực Thi Trong Kho Mã Nguồn

- **Bộ đặc tả & kịch bản OWASP Security Smoke Suite (`OWASP-SEC-001`..`008`)**:
  - Tài liệu 14 trường chi tiết: [`../../API Test/stag_owasp_security_smoke_suite/stag_owasp_security_smoke_test_cases.md`](../../API%20Test/stag_owasp_security_smoke_suite/stag_owasp_security_smoke_test_cases.md)
  - Bộ sưu tập Postman thực thi tự động: [`../../API Test/stag_owasp_security_smoke_suite/stag_owasp_security_smoke.postman_collection.json`](../../API%20Test/stag_owasp_security_smoke_suite/stag_owasp_security_smoke.postman_collection.json)
- **Báo cáo phát hiện lỗi API & Bảo mật trên Staging (`OP-1947` .. `OP-1964`)**:
  - Đợt 1 (`BUG-API-01`..`06`): [`../../API Test/stag_api_testing_19-11-2026/API_BUG_REPORT_19-11-2026.md`](../../API%20Test/stag_api_testing_19-11-2026/API_BUG_REPORT_19-11-2026.md)
  - Đợt 2 (`BUG-API-07`..`12` — bao gồm lộ cột user, phiên sau đăng xuất & CORS/500): [`../../API Test/stag_api_batch2_19-11-2026/API_BUG_REPORT_BATCH2_19-11-2026.md`](../../API%20Test/stag_api_batch2_19-11-2026/API_BUG_REPORT_BATCH2_19-11-2026.md)
- **Quy chuẩn viết API Test Case gốc của dự án**:
  - [`../../API Test/guides/QA Guide — How to Write API Test Cases.md`](../../API%20Test/guides/QA%20Guide%20%E2%80%94%20How%20to%20Write%20API%20Test%20Cases.md)
