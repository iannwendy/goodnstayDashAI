# Kho Tài Liệu Kỹ Thuật, Kiến Trúc & Nghiệp Vụ — `goodNstay` (`docs/`)

Thư mục `docs/` được tổ chức phân tách theo từng miền chuyên đề kỹ thuật và nghiệp vụ của hệ sinh thái **goodNstay & Optibide Partner Hub**.

---

## Cấu Trúc Thư Mục Theo Chuyên Đề

```text
docs/
├── ga4-bigquery/               # 1. Google Analytics 4, BigQuery Data Warehouse & Thiết kế BFF/Viewport
├── security/                   # 2. Bảo mật Đa chi nhánh (userID × branchID RBAC), Cloud Security & OWASP API
├── analytics-and-schema/       # 3. Event Tracking 45 sự kiện, Database Schema, ERD & Phân cụm AI (C1–C4)
├── partner-dashboard/          # 4. Thiết kế Giao diện, Nghiệp vụ & Kế hoạch phát triển Optibide Partner Hub
├── business-and-system/        # 5. Giải phẫu Mô hình Đấu thầu Ngược 1:1 & Kiến trúc Hệ sinh thái goodNstay
├── presentations/              # 6. Kịch bản Thuyết trình CTO/Team & Bản mẫu HTML Proposal (file .pptx giữ local)
└── templates/                  # 7. Biểu mẫu QA & Tài liệu mẫu nội bộ (giữ local theo .gitignore)
```

---

## Mục Lục Tài Liệu Chi Tiết

### 1. Google Analytics 4 & Google Cloud BigQuery (`ga4-bigquery/`)
- [`goodNstay_GA4_BigQuery_Research_Va_Trien_Khai_Dashboard.md`](./ga4-bigquery/goodNstay_GA4_BigQuery_Research_Va_Trien_Khai_Dashboard.md) — Nghiên cứu từ nguồn chính thức của Google về cách kết hợp `gtag.js`, Measurement Protocol, GA4 BigQuery Export (`events_*` / `events_intraday_*`), mô hình Medallion (`Bronze → Silver → Gold`), BI Engine và ước tính chi phí thực tế cho Partner Dashboard.
- [`2026-11-23-bigquery-ga4-simulation-bff-and-rbac-viewport-design.md`](./ga4-bigquery/2026-11-23-bigquery-ga4-simulation-bff-and-rbac-viewport-design.md) — Đặc tả thiết kế kỹ thuật Phương án B: Giả lập dữ liệu 30 ngày trên GCP BigQuery (`aevo-512307`), tách microservice `bigquery-bff` (`:4000`), phân quyền `userID × branchID` và tích hợp `BigQuery Live Viewport` vào Dashboard.

### 2. Bảo Mật, Phân Quyền Đa Chi Nhánh & OWASP API (`security/`)
- [`Giai_Phap_Phan_Quyen_Branch_Va_User_Theo_Y_Tuong_Dashboard_CTO.md`](./security/Giai_Phap_Phan_Quyen_Branch_Va_User_Theo_Y_Tuong_Dashboard_CTO.md) — **(Tài liệu dễ đọc cho mọi phòng ban)** Giải thích ngắn gọn mô hình phân quyền *Chi nhánh (`branch_id`) – Người dùng (`user_id`)* và kết nối trực tiếp với ý tưởng 3 biểu đồ trên trang tính `dashboard_sample` của CTO.
- [`goodNstay_Multi_Tenant_RBAC_And_BigQuery_Security.md`](./security/goodNstay_Multi_Tenant_RBAC_And_BigQuery_Security.md) — Kiến trúc phân tách `traveler_user_id` vs. `staff_user_id`, ma trận phân quyền 3 chiều (`Role × Branch × Action`), chống lộ dữ liệu chéo `BOLA (403)`, Parameterized Queries, lý do dùng BFF Filter + Authorized Views thay vì BigQuery RLS và quy tắc bảo vệ khóa GCP.
- [`goodNstay_OWASP_API_Security_And_Staging_Audit_Guide.md`](./security/goodNstay_OWASP_API_Security_And_Staging_Audit_Guide.md) — Tiêu chuẩn kiểm thử bảo mật phi phá hủy theo **OWASP Top 10:2025 & API Security Top 10:2023** (`SEC-M01`..`SEC-M08`), quy tắc che lọc `0% PII` và mục lục dẫn tới các bộ test thực thi trong `API Test/`.

### 3. Event Tracking, Database Schema & Phân Cụm AI (`analytics-and-schema/`)
- [`goodNstay_Dashboard_Event_Metadata_Mapping.md`](./analytics-and-schema/goodNstay_Dashboard_Event_Metadata_Mapping.md) — Ánh xạ 1-1 giữa 45 sự kiện trên 4 nhóm (`booking_form`, `offer_listing`, `explore_stays`, `payment_form`) với 7 bảng Master Data và công thức tài chính bất biến `×1.265`.
- [`2026-11-20-traveler-keyword-clustering-design.md`](./analytics-and-schema/2026-11-20-traveler-keyword-clustering-design.md) — Thiết kế bộ từ điển Keywords đa ngôn ngữ (`VI · EN · KO`) và quy tắc gom cụm du khách 2 giai đoạn (`C1–C4`) cho AI tư vấn khách sạn.
- [`2026-11-18-gns-database-schema-slides-design.md`](./analytics-and-schema/2026-11-18-gns-database-schema-slides-design.md) & [`2026-11-18-gns-database-schema-slides-plan.md`](./analytics-and-schema/2026-11-18-gns-database-schema-slides-plan.md) — Thiết kế & kế hoạch bộ tài liệu giải thích `[GNS] Database Schema`.
- *(Xem thêm đặc tả ERD 15 bảng kèm sơ đồ tại [`../dashboard/dashboard/goodNstay_AI_Analytics_Tables_Va_ERD_Chi_Tiet.md`](../dashboard/dashboard/goodNstay_AI_Analytics_Tables_Va_ERD_Chi_Tiet.md) và [`../dashboard/dashboard/goodNstay_Master_Data_Subtables_Va_ERD_Chi_Tiet.md`](../dashboard/dashboard/goodNstay_Master_Data_Subtables_Va_ERD_Chi_Tiet.md)).*

### 4. Thiết Kế & Kế Hoạch Optibide Partner Hub (`partner-dashboard/`)
- [`2026-11-11-business-hotel-dashboard-overview-design.md`](./partner-dashboard/2026-11-11-business-hotel-dashboard-overview-design.md) & [`2026-11-11-business-hotel-dashboard-overview-plan.md`](./partner-dashboard/2026-11-11-business-hotel-dashboard-overview-plan.md) — Đặc tả & kế hoạch xây dựng màn hình Tổng quan hiệu suất khách sạn.
- [`2026-11-19-cto-ai-dashboard-and-45min-slides-design.md`](./partner-dashboard/2026-11-19-cto-ai-dashboard-and-45min-slides-design.md) & [`2026-11-19-cto-ai-dashboard-and-45min-slides-plan.md`](./partner-dashboard/2026-11-19-cto-ai-dashboard-and-45min-slides-plan.md) — Thiết kế đề xuất AI Dashboard & bài trình bày 45 phút với CTO.
- *(Xem thêm tài liệu mô tả tính năng người dùng cuối tại [`../dashboard/goodNstay_Dashboard_Tinh_Nang_Va_Nghiep_Vu.md`](../dashboard/goodNstay_Dashboard_Tinh_Nang_Va_Nghiep_Vu.md)).*

### 5. Nghiệp Vụ Cốt Lõi & Kiến Trúc Hệ Sinh Thái (`business-and-system/`)
- [`goodNstay_Bao_Cao_Chi_Tiet_Nghiep_Vu_Va_He_Thong.md`](./business-and-system/goodNstay_Bao_Cao_Chi_Tiet_Nghiep_Vu_Va_He_Thong.md) — Báo cáo giải phẫu toàn diện mô hình kinh doanh, pháp nhân vận hành, luồng đấu thầu ngược 1:1 và hệ sinh thái đa cổng của Optibide / goodNstay.

### 6. Kịch Bản Thuyết Trình & Bản Mẫu Đề Xuất (`presentations/`)
- [`presentations/cto-ai-dashboard-proposal/Kich_Ban_Thuyet_Trinh_CTO_45Phut_3Nguoi.md`](./presentations/cto-ai-dashboard-proposal/Kich_Ban_Thuyet_Trinh_CTO_45Phut_3Nguoi.md) — Kịch bản chi tiết từng phút cho buổi thuyết trình 45 phút.
- [`presentations/cto-ai-dashboard-proposal/Bo_Keywords_Va_Gom_Nhom_Du_Khach.md`](./presentations/cto-ai-dashboard-proposal/Bo_Keywords_Va_Gom_Nhom_Du_Khach.md) — Bản tóm tắt nhanh bộ Keywords `C1–C4` phục vụ hỏi đáp CTO.
- [`presentations/cto-ai-dashboard-proposal/ai-dashboard-proposal.html`](./presentations/cto-ai-dashboard-proposal/ai-dashboard-proposal.html) — Giao diện mẫu HTML độc lập trình diễn đề xuất AI Dashboard.
