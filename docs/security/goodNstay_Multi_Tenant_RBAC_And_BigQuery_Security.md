# Bảo Mật Đa Chi Nhánh (`userID` × `branchID` RBAC), Backend BFF & Google Cloud BigQuery Cho Optibide Partner Hub

> **Phạm vi áp dụng**: Toàn bộ luồng xác thực, phân quyền truy cập dữ liệu khách sạn (`Multi-Tenant Isolation`), kết nối Google Cloud BigQuery / Google Analytics 4 và quản lý thông tin bí mật trên hệ thống **Optibide Partner Hub (`goodNstay`)**.

---

## 1. Mô Hình Mối Đe Dọa Cốt Lõi Trong Sàn Đấu Giá Lưu Trú B2B (Threat Model)

Trong mô hình sàn đấu thầu ngược 1:1 của `goodNstay`, dữ liệu giá sàn (`floorRateVnd`), tỷ lệ thắng thầu (`acceptRatePct`), doanh thu thực nhận (`netRevenueVnd`) và tài khoản ngân hàng nhận đối soát là bí mật kinh doanh sống còn của từng cơ sở lưu trú. Hệ thống bắt buộc phòng chống **4 nhóm rủi ro nghiêm trọng nhất**:

1. **Lộ dữ liệu chéo giữa các đối thủ hoặc chéo chi nhánh (`OWASP API1:2023 — Broken Object Level Authorization / BOLA`)**:
   - Một quản lý chi nhánh sửa tham số `?branchId=br_songhan` hoặc `?partnerId=HTL-KR-011` trên DevTools để đọc lén doanh thu, giá chào thầu của chi nhánh khác hoặc khách sạn đối thủ.
2. **Leo thang đặc quyền vai trò nội bộ (`OWASP API5:2023 — Broken Function Level Authorization / BFLA`)**:
   - Nhân viên ca trực (`receptionist`) truy cập trái phép vào API sao kê ngân hàng (`payout`), sửa số tài khoản thụ hưởng hoặc hạ giá sàn Auto-Bid làm thiệt hại tài chính cho chủ khách sạn.
3. **Lộ khóa dịch vụ Đám mây & Tấn công Cạn kiệt Chi phí (`Cloud Credential Exposure & Financial DoS`)**:
   - Đưa Service Account JSON key, OAuth scope `bigquery` / `analytics.readonly` hoặc `api_secret` của GA4 Measurement Protocol xuống trình duyệt khiến kẻ tấn công có thể quét hàng Terabyte dữ liệu trên BigQuery hoặc bơm dữ liệu rác vào GA4.
4. **SQL Injection trên câu truy vấn phân tích (`OWASP A05:2025 — Injection`)**:
   - Nối chuỗi trực tiếp tham số lọc ngày, mã chi nhánh vào câu lệnh GoogleSQL gửi lên BigQuery.

---

## 2. Tách Biệt Định Danh & Ma Trận Phân Quyền `userID` × `branchID`

### 2.1 Hai Không Gian Định Danh Độc Lập (Tuyệt Đối Không Trộn Lẫn)
- **`traveler_user_id` (Không gian Du khách — GA4 & OLTP Đặt phòng)**: Định danh người đi thuê phòng trên `goodNstay.com`. Dùng để phân tích hành vi chuyển đổi và khách quay lại; không có quyền truy cập vào bất kỳ API nào của Partner Hub.
- **`staff_user_id` (Không gian Nhân sự Đối tác — Partner BFF & RBAC)**: Định danh nhân viên vận hành phía khách sạn đăng nhập vào Partner Hub. Mọi quyền xem và thao tác đều được quyết định bởi cặp khóa **`(staff_user_id, allowed_branch_ids, role_key)`**.

### 2.2 Ma Trận Phân Quyền 3 Chiều Chuẩn Hóa

| Vai trò (`role_key`) | Phạm vi cơ sở (`allowed_branch_ids`) | Chế độ `"Toàn hệ thống"` (`all`) | Quyền Tài chính & Sao kê (`can_view_financials`) | Quyền Giá sàn, Auto-Bid & Khuyến mãi (`can_manage_pricing`) | Quyền Lịch phòng & Hộp thư khách |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Chủ chuỗi / Tổng quản lý (`manager` / `chain_owner`)** | Toàn bộ chi nhánh thuộc chuỗi sở hữu | Cho phép *(chỉ cộng gộp trong chuỗi của mình)* | Toàn quyền xem & đối soát | Toàn quyền bật/tắt & chỉnh giá | Toàn quyền |
| **Quản lý Chi nhánh (`branch_manager`)** | Khóa cứng vào danh sách chi nhánh được giao (VD: `["br_mykhe"]`) | **Cấm (`403`)** | Được xem trong phạm vi chi nhánh phụ trách | Được chỉnh trong phạm vi chi nhánh phụ trách | Toàn quyền tại chi nhánh phụ trách |
| **Lễ tân Ca trực (`receptionist`)** | Khóa cứng vào chi nhánh trực ca (VD: `["br_mykhe"]`) | **Cấm (`403`)** | **Cấm (Ẩn & Che `0`/rỗng ngay từ API)** | **Cấm (`403` trên API + Toast cảnh báo ở UI)** | Được đóng/mở phòng lẻ, check-in & trả lời chat |

---

## 3. Năm Chốt Chặn Bảo Mật Bắt Buộc Tại Tầng Backend BFF & BigQuery

1. **Không Bao Giờ Tin Tham Số Client (`Zero-Trust Query Params`)**:
   - Backend BFF (`dashboard/bigquery-bff`) trích xuất `partnerId`, `allowedBranchIds`, `canViewFinancials` trực tiếp từ chữ ký **JWT (`Authorization: Bearer <token>`)** trên Server.
   - Mọi yêu cầu chứa `branchId` nằm ngoài `allowedBranchIds` bị chặn ngay tại middleware với mã lỗi chuẩn `HTTP 403 FORBIDDEN_BRANCH_SCOPE` trước khi chạm tới BigQuery.

2. **Truy Vấn Tham Số Hóa 100% (`Parameterized Queries`)**:
   - Mọi câu lệnh gọi `@google-cloud/bigquery` bắt buộc truyền qua `params` + `types` (`@partnerId`, `@branchIds`, `@startDate`, `@endDate`), tuyệt đối không dùng template literal nội suy biến đầu vào vào chuỗi SQL ([BigQuery Parameterized Queries](https://cloud.google.com/bigquery/docs/parameterized-queries)).

3. **Service Account Đặc Quyền Tối Thiểu & Lý Do Không Dùng BigQuery RLS Cho Đối Tác Ngoài**:
   - Tầng BFF chỉ được cấp quyền `roles/bigquery.jobUser` và `roles/bigquery.dataViewer` trên dataset đã làm sạch `gns_analytics_mart` (hoặc *Authorized Views*), không cấp quyền đọc bảng thô `analytics_<property_id>.events_*` chứa `user_pseudo_id` và địa chỉ mạng.
   - **Quyết định kiến trúc**: Không gắn `CREATE ROW ACCESS POLICY` (BigQuery Row-Level Security) lên bảng phục vụ khách sạn bên ngoài vì tài liệu Google xác nhận RLS làm mất hoàn toàn khả năng tăng tốc của **BI Engine**, chặn **Materialized Views** và vô hiệu hóa **Partition Pruning** ([RLS Limitations](https://cloud.google.com/bigquery/docs/row-level-security-intro#limitations)). Cô lập bằng `@partnerId` + `UNNEST(@allowedBranchIds)` tại BFF vừa an toàn tuyệt đối vừa bảo toàn tốc độ dưới `200ms`.

4. **Chốt Chặn Trần Chi Phí Quét (`maximumBytesBilled`) & Bộ Nhớ Đệm TTL**:
   - Mọi job truy vấn từ Dashboard đều gắn cứng `maximumBytesBilled = 52428800` (`50 MiB`). Nếu có truy vấn bất thường vượt ngưỡng, BigQuery tự động hủy trước khi chạy với chi phí `0 USD`.
   - Phản hồi theo tổ hợp `(partnerId, branchIds, period, roleKey)` được lưu đệm TTL `60 giây` (kỳ hôm nay) đến `15 phút` (kỳ 7/30 ngày) để chống tấn công làm cạn kiệt slot/token.

5. **Vệ Sinh Khóa Bí Mật & Dữ Liệu Cá Nhân (`Secret Hygiene & PII Scrubbing`)**:
   - Tuyệt đối không commit `.env`, `.env.jira`, Service Account `.json` hoặc `mcp_config.json` lên Git; ưu tiên xác thực local bằng **Application Default Credentials (`ADC`)** và trên Cloud bằng **Workload Identity**.
   - Không truyền họ tên, email, số điện thoại hay số giấy tờ tùy thân của du khách vào tham số sự kiện GA4 hoặc vector phân tích AI.

---

## 4. Liên Kết Tài Liệu Liên Quan
- Thiết kế triển khai BFF + RBAC + BigQuery Viewport: [`../ga4-bigquery/2026-11-23-bigquery-ga4-simulation-bff-and-rbac-viewport-design.md`](../ga4-bigquery/2026-11-23-bigquery-ga4-simulation-bff-and-rbac-viewport-design.md)
- Nghiên cứu chuyên sâu GA4 & BigQuery: [`../ga4-bigquery/goodNstay_GA4_BigQuery_Research_Va_Trien_Khai_Dashboard.md`](../ga4-bigquery/goodNstay_GA4_BigQuery_Research_Va_Trien_Khai_Dashboard.md)
- Tiêu chuẩn kiểm thử bảo mật API OWASP Top 10: [`./goodNstay_OWASP_API_Security_And_Staging_Audit_Guide.md`](./goodNstay_OWASP_API_Security_And_Staging_Audit_Guide.md)
