# goodNstay — QA Engineering, API Testing, Rate Shopping & Partner Dashboard Workspace

Kho lưu trữ tập trung toàn bộ bộ công cụ kiểm thử tự động (Skills), bộ API Test Suite (`OP-1593`), báo cáo Bug QA, hệ thống đối sánh giá OTA (`ota-rate-shopping-demo`) và tài liệu thiết kế Partner Auction Dashboard v2 của **goodNstay**.

---

## Cấu trúc Thư mục Nghiệp vụ (Domain Structure)

```text
goodNstay/
├── .agents/skills/                   # Bộ 4 AI & QA Automation Skills chuẩn hoá
│   ├── api-qa-testing/               # Skill + CLI kiểm định, chạy tự động & xuất API Test Case (14-field / Postman v2.1)
│   ├── jira-bug-reporter/            # Skill + CLI đẩy Bug Report 7-field & ảnh inline lên Jira Board #135 (OP)
│   ├── dashboard-qa-testing/         # Skill kiểm thử hồi quy bắt buộc cho Partner Auction Dashboard v2
│   └── drawio-diagram-builder/       # Skill vẽ, kiểm định toạ độ XML & tự học sơ đồ Draw.io
│
├── API Test/                         # Nghiệp vụ Kiểm thử API (API QA Testing)
│   ├── guides/                       # Tài liệu chuẩn QA Guide — How to Write API Test Cases (.md & .pdf)
│   └── op1593_regv2_suite/           # Bộ 10 API Test Cases (REGV2-API-001..010), Fixtures & Postman Collection cho OP-1593
│
├── bug_report_3-11-2026/             # Nghiệp vụ QA Bug Discovery & Bằng chứng F12 trên goodnstay.com
│   ├── BUG_REPORT_03-11-2026.md      # Báo cáo tổng hợp 9 lỗi UI/Functional/API
│   ├── json_payloads/                # Payload chuẩn 7-field cho từng ticket Bug (BUG-01..BUG-09)
│   └── uploaded_jira_tickets.json    # Sổ đối soát các mã ticket OP-XXXX đã đẩy lên Board #135
│
├── dashboard/                        # Nghiệp vụ Partner Auction Dashboard v2
│   ├── partner-auction-dashboard-v2/ # Source code ứng dụng Dashboard v2 (Git repo độc lập: github.com/iannwendy/dashv2)
│   ├── diagrams/                     # Sơ đồ Use Case, Booking Lifecycle & State Flow (.drawio / .svg / .png)
│   ├── SRS.docx                      # Tài liệu đặc tả yêu cầu phần mềm (SRS)
│   ├── goodNstay_Dashboard_Metrics_Summary.xlsx
│   ├── goodNstay_Dashboard_Tinh_Nang_Va_Nghiep_Vu.md
│   └── partner-auction-dashboard-v2.html
│
├── ota-rate-shopping-demo/           # Nghiệp vụ OTA Rate Shopping & Room Auto-Match Engine
│   ├── src/ & tests/                 # Scraper Agoda/Booking/Trip/Expedia, 8-Field Auto-Mapper, React UI & E2E tests
│   ├── reports/                      # Báo cáo PDF đa ngôn ngữ (VI / EN / KO) & dữ liệu đối sánh JSON
│   ├── docs/                         # Tài liệu nghiên cứu thuật toán ghép phòng & ảnh chụp form mẫu
│   ├── ota-rate-shopping-clone.html  # Bản HTML standalone chạy độc lập (VI/EN)
│   └── ota-rate-shopping-clone-ko.html # Bản HTML standalone chạy độc lập (KO)
│
└── docs/                             # Tài liệu Nghiệp vụ Hệ thống & Biểu mẫu QA Chung
    ├── goodNstay_Bao_Cao_Chi_Tiet_Nghiep_Vu_Va_He_Thong.md
    └── templates/                    # Mẫu Bug Report, Ngân hàng câu hỏi Intern (.docx) & mẫu SRS tham khảo
```

---

## Chính sách Bảo mật & Phân loại File (Push vs Giữ Local)

- **Tuyệt đối giữ ở máy local (đã chặn trong `.gitignore`):**
  - `.env.jira`, `.env`, `.env.local`: Chứa `JIRA_API_TOKEN` cá nhân và thông tin xác thực Atlassian.
  - `AGENTS.md`, `CLAUDE.md`: Chứa tài khoản test nội bộ và quy tắc bộ nhớ cá nhân hóa trên máy.
  - `skills/system/`, `.playwright-mcp/`, `node_modules/`, `dist/`, `__pycache__/`, `.DS_Store`: Thư mục cache/build sinh tự động.
  - `dashboard/partner-auction-dashboard-v2/`: Được quản lý bằng Git repo riêng (`https://github.com/iannwendy/dashv2.git`).
- **Được phép Commit & Push lên GitHub (`origin/main`):**
  - Toàn bộ `.agents/skills/`, `API Test/`, `bug_report_3-11-2026/`, `dashboard/` (trừ thư mục con có repo riêng), `ota-rate-shopping-demo/`, `docs/`, `.env.jira.example`, `.gitignore`, và `README.md`.
