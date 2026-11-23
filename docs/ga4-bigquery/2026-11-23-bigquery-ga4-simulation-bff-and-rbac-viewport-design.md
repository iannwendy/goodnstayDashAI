# Thiết Kế Kỹ Thuật: Giả Lập Dữ Liệu GA4 + BigQuery, Tách BFF Đa Chi Nhánh (`userID` × `branchID` RBAC) & BigQuery Live Viewport Cho Optibide Partner Hub

- **Ngày lập**: `2026-11-23`
- **Dự án GCP đích**: `aevo-512307` (Region: `asia-southeast1` — Singapore)
- **Kiến trúc được chọn**: **Phương án B** — Tách Backend BFF độc lập (`dashboard/bigquery-bff`, cổng `:4000`) kết nối trực tiếp Google Cloud BigQuery, phục vụ `dashboard/dashboard` (cổng `:5182`) qua công tắc chuyển nguồn toàn hệ thống + màn hình chuyên biệt `BigQuery Live Viewport`.

---

## 1. Mục Đích & Bối Cảnh Nghiệp Vụ (Intent & The Why)

Đội Quản lý Sản phẩm (PM) và Kỹ thuật của `goodNstay` cần giải quyết đồng thời 4 bài toán trước khi nối luồng sự kiện thật từ Production:

1. **Chuẩn hóa bài toán định danh `userID` × `branchID` để phân quyền & phân rule**:
   - Tách biệt rạch ròi **`traveler_user_id`** (du khách đặt phòng trên `goodNstay.com`, xuất hiện trong luồng sự kiện GA4) với **`staff_user_id`** (nhân sự vận hành phía khách sạn đăng nhập vào Partner Hub).
   - Thiết lập mô hình phân quyền 3 tầng (**Tổ chức/Chuỗi `partner_id` $\rightarrow$ Chi nhánh `branch_id` $\rightarrow$ Vai trò & Quyền thao tác `role_key`**) để đảm bảo: Chủ chuỗi xem toàn hệ thống, Quản lý chi nhánh chỉ xem & điều chỉnh giá của đúng chi nhánh phụ trách, Lễ tân ca trực chỉ vận hành lịch phòng/tin nhắn tại chi nhánh được giao và không thấy doanh thu tổng hay sao kê ngân hàng.
2. **Giả lập trọn bộ dữ liệu thực tế (Full Mock Data) và chạy trực tiếp trên Google Cloud BigQuery**:
   - Không phụ thuộc vào việc web `goodNstay.com` đã gắn xong GTM hay chưa; chủ động tạo bộ dữ liệu 30 ngày gồm cả bảng sự kiện hành vi có cấu trúc lồng `ARRAY<STRUCT>` `event_params` giống hệt 100% **GA4 BigQuery Export (`events_YYYYMMDD`)** lẫn các bảng giao dịch OLTP và bảng phân quyền trên project `aevo-512307`.
3. **Kết nối trực tiếp từ BigQuery lên Dashboard qua 2 bề mặt hiển thị**:
   - **(a) Công tắc chuyển nguồn toàn hệ thống (`Local JSON` $\leftrightarrow$ `Live BigQuery`)** để mọi phân hệ sẵn có (`Overview`, `Calendar`, `Payout`, `Rooms`, `Bidding`, `Messages`, `Marketing`) đều đọc được dữ liệu thật từ BigQuery theo đúng phạm vi quyền của `staff_user_id`.
   - **(b) Khung nhìn chuyên biệt `BigQuery Live Viewport`** trên thanh điều hướng trái để quan sát trực tiếp phễu hành vi GA4 bóc tách bằng `UNNEST(event_params)`, tương tác ảnh/video 5 danh mục, kiểm chứng phân quyền `userID × branchID` và thông số thực thi của BigQuery (`Job ID`, `Query ms`, `Bytes scanned`).
4. **Tự động hóa tối đa qua MCP & CLI**:
   - Vận hành trực tiếp thông qua **BigQuery MCP (`data-agent-kit-plugin_dak-bigquery`)** và `bq` / `gcloud` CLI với Application Default Credentials (`ADC`) trên máy local để Agent tự khởi tạo dataset, nạp Mock JSONL, dựng tầng Gold Mart, viết BFF, nối UI và kiểm thử tự động từ đầu đến cuối.

---

## 2. Mục Tiêu, Phi Mục Tiêu & Ràng Buộc (Goals, Non-Goals & Constraints)

### 2.1 Mục tiêu (Goals)
- Khởi tạo tự động 3 dataset trên GCP Project `aevo-512307` (`asia-southeast1`):
  - `gns_sim_ga4`: Chứa các bảng theo ngày `events_202610*` / `events_202611*` đúng chuẩn schema **GA4 BigQuery Export** (`event_date`, `event_timestamp`, `event_name`, `user_id`, `user_pseudo_id`, `device`, `geo`, `event_params ARRAY<STRUCT<...>>`).
  - `gns_sim_oltp`: Chứa các bảng giao dịch chuẩn xác (`partner_organizations`, `partner_branches`, `partner_user_branch_access`, `bid_requests`, `bid_offers`, `orders_and_payments`, `payout_batches`) bảo toàn bất biến tài chính `×1.265` (khách sạn thực nhận 100% `base_price`, phí nền tảng 15%, VAT 10%).
  - `gns_analytics_mart`: Chứa bảng làm phẳng `stg_ga4_behavior_events` và các bảng Gold Mart đã `PARTITION BY` ngày + `CLUSTER BY partner_id, branch_id`.
- Xây dựng microservice độc lập **`dashboard/bigquery-bff`** (TypeScript, cổng `:4000`, dùng `@google-cloud/bigquery`) thực thi xác thực JWT cho `staff_user_id`, kiểm soát truy cập chéo chi nhánh (`403 FORBIDDEN_BRANCH_SCOPE`), ẩn trường tài chính nhạy cảm đối với `receptionist`, giới hạn cứng `maximumBytesBilled = 50 MiB`/query và cache TTL 60 giây.
- Nâng cấp **`dashboard/dashboard`** (cổng `:5182`) với:
  - Bộ chuyển đổi 5 tài khoản `staff_user_id` thực tế đại diện đủ các cấp phân quyền.
  - Công tắc chuyển nguồn dữ liệu `Local JSON` $\leftrightarrow$ `Live BigQuery (:4000)` (tự động fallback an toàn về `Local JSON` khi `:4000` chưa bật để không bao giờ làm trắng trang).
  - Màn hình mới **`BigQuery Live Viewport`** (`activeSection = "bigquery_live"`) đạt chuẩn đa ngôn ngữ (`vi` / `en` / `ko`) và chuẩn responsive trên cả 7 kích thước màn hình (`1440×900` $\rightarrow$ `360×800`).

### 2.2 Phi mục tiêu & Chống mục tiêu (Non-Goals & Anti-Goals)
- **Không gắn mã GTM/`gtag.js` lên môi trường Production (`goodnstay.com`)**: Mọi hoạt động giả lập chỉ diễn ra trên GCP Project `aevo-512307` và môi trường local/staging của dự án.
- **Tuyệt đối không lộ khóa GCP hay gọi thẳng BigQuery từ trình duyệt React**: Trình duyệt chỉ giao tiếp với `bigquery-bff` qua HTTP + JWT của ứng dụng.
- **Không bật `CREATE ROW ACCESS POLICY` (BigQuery Row-Level Security) trên các bảng Gold Mart**: Như đã chứng minh từ tài liệu Google, RLS vô hiệu hóa Partition Pruning, Materialized Views và BI Engine; việc cô lập dữ liệu theo `partner_id` & `branch_id` được khóa chặt bằng tham số `@partnerId` và `UNNEST(@allowedBranchIds)` tại tầng `bigquery-bff`.
- **Không làm hỏng hay làm chậm bộ kiểm thử hiện hữu của `dashboard/dashboard`**: Chế độ mặc định khi khởi động đơn lẻ `dashboard/dashboard` vẫn là `Local JSON` để toàn bộ Unit, Master-Data Contract, RBAC và Responsive E2E tests hiện có chạy xanh 100% mà không phụ thuộc mạng ngoài; các bài test tích hợp BFF + BigQuery có suite kiểm chứng rõ ràng riêng và mock/live contract tests đầy đủ.

---

## 3. So Sánh Các Phương Án Đã Cân Nhắc & Lý Do Chọn Phương Án B

| Tiêu chí | Phương án A: Nhúng Middleware BigQuery vào `vite.config.ts` | **Phương án B (Đã chọn): Tách Microservice độc lập `dashboard/bigquery-bff` (`:4000`)** |
| :--- | :--- | :--- |
| **Kiến trúc hệ thống** | Gộp chung dev server giao diện và kết nối BigQuery trong một tiến trình Vite. | Tách hẳn một dịch vụ Node.js/TypeScript BFF độc lập (`:4000`) cấp JWT, quản lý phân quyền RBAC, cache và kết nối `@google-cloud/bigquery`; Frontend (`:5182`) gọi qua REST API. |
| **Độ sát với Production** | Thấp — khi lên Production vẫn phải viết tách lại từ đầu sang dịch vụ Backend riêng. | **Rất cao** — Cấu trúc thư mục, middleware xác thực JWT, kiểm tra quyền `userID × branchID` và lớp truy vấn BigQuery có thể bê nguyên sang hệ thống microservice thực tế của `goodNstay`. |
| **Vận hành & Độ ổn định UI** | Chỉ cần chạy 1 lệnh `npm run dev`. | Cần chạy BFF (`:4000`) và Dashboard (`:5182`) — giải quyết gọn bằng script khởi chạy chung (`npm run dev:full`) và cơ chế fallback thông minh về `Local JSON` khi `:4000` tắt. |

---

## 4. Thiết Kế Chi Tiết Từng Phân Hệ Kỹ Thuật

### 4.1 Ma Trận Định Danh & Phân Quyền Đa Tầng (`userID` × `branchID` RBAC)

Bảng gốc `gns_sim_oltp.partner_user_branch_access` (đồng bộ cùng cấu hình seed ở local để đối chiếu nhất quán) định nghĩa rõ 5 tài khoản mẫu phục vụ kiểm thử và trình diễn cho PM:

| `user_id` (`staff_user_id`) | Họ tên hiển thị | Tổ chức (`partner_id`) | Vai trò (`role_key`) | Chi nhánh được cấp (`allowed_branch_ids`) | Xem tùy chọn `"Toàn hệ thống"` (`can_view_chain_all`) | Xem Doanh thu & Sao kê (`can_view_financials`) | Chỉnh Giá sàn / Auto-Bid / Flash Sale (`can_manage_pricing`) |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **`USR-PARTNER-01`** | Nguyễn Bảo Minh | `HTL-PORTFOLIO-01` *(Chủ sở hữu hệ thống)* | `manager` *(Tổng quản lý / Chủ chuỗi)* | `["br_mykhe", "br_songhan", "br_anthuong", "stay_h11"]` | `true` | `true` | `true` |
| **`USR-MGR-MYKHE`** | Lê Hoàng Nam | `HTL-DN-024` *(Chuỗi L'amour)* | `branch_manager` *(Quản lý CN Mỹ Khê)* | `["br_mykhe"]` | `false` | `true` | `true` |
| **`USR-MGR-SONGHAN`** | Phạm Minh Tuấn | `HTL-DN-024` *(Chuỗi L'amour)* | `branch_manager` *(Quản lý CN Sông Hàn)* | `["br_songhan"]` | `false` | `true` | `true` |
| **`USR-STAFF-02`** | Trần Thu Hà | `HTL-DN-024` *(Chuỗi L'amour)* | `receptionist` *(Lễ tân CN Mỹ Khê)* | `["br_mykhe"]` | `false` | **`false`** | **`false`** |
| **`USR-MGR-H11`** | Kim Ji-hoon | `HTL-KR-011` *(Stay Hotel Seoul)* | `branch_manager` *(Quản lý Stay H11)* | `["stay_h11"]` | `false` | `true` | `true` |

> **Quyết định kỹ thuật từ bước Builder Check (Builder Calls)**:
> 1. **Tương thích 100% với 28 kịch bản Playwright E2E hiện hữu + Mở rộng RBAC 5 hồ sơ**:
>    - Tài khoản mặc định `USR-PARTNER-01` (`roleKey: "manager"`, nút chuyển nhanh `switch-role-manager`) giữ quyền truy cập toàn danh mục 4 cơ sở (`br_mykhe`, `br_songhan`, `br_anthuong`, `stay_h11`) để toàn bộ kịch bản kiểm thử hiện tại (`TC-FLOW`, `TC-LEFT`, `TC-RESP`) chạy xanh 100%, trong khi 3 tài khoản `branch_manager` (`USR-MGR-MYKHE`, `USR-MGR-SONGHAN`, `USR-MGR-H11`) chứng minh cô lập cứng từng `branchID` riêng biệt.
>    - Đối với `USR-STAFF-02` (`receptionist`, nút `switch-role-receptionist`): khóa phạm vi `topbar-property-select` vào `["br_mykhe"]`; giữ hành vi bấm nút sửa tài khoản ngân hàng / sửa giá sàn hiện thông báo từ chối quyền lịch sự (`hub-toast-banner` theo chuẩn `TC-LEFT-07`), đồng thời tại tầng **Backend BFF (`:4000`)** và màn hình **`BigQuery Live Viewport`**, mọi chỉ số tiền doanh thu / sao kê của `receptionist` đều bị che/ẩn ngay từ payload API (`canViewFinancials = false`). Cập nhật `master-data-contract.test.ts` từ 2 lên 5 `staffProfiles` theo đúng quy tắc `AGENTS.md` Mục 5.
> 2. **Xử lý thao tác ghi (Operational Mutations) khi bật chế độ `Live BigQuery (:4000)` & Tương thích BigQuery Sandbox**:
>    - BigQuery là kho phân tích (`OLAP`), không dùng câu lệnh SQL DML `UPDATE/INSERT` trực tiếp từ nút bấm giao diện (vừa tránh độ trễ 2–4 giây, vừa tương thích 100% kể cả khi GCP Project chạy chế độ BigQuery Sandbox miễn phí — toàn bộ dữ liệu trên `aevo-512307` được nạp qua `bq load` batch JSONL và tầng `gns_analytics_mart` xây dựng qua SQL Views/Tables chuẩn).
>    - Khi công tắc ở chế độ `Live BigQuery`, `GET /api/v1/analytics/bundle` lấy số liệu đấu giá, đơn hàng, doanh thu và hành vi **trực tiếp từ BigQuery** kết hợp các bảng vận hành (`roomInventory`, `hubInbox`, `biddingOperations`, `marketingCampaigns`) được lọc nghiêm ngặt theo `allowedBranchIds` tại BFF; mọi thao tác cập nhật vận hành tạm thời trong phiên được lưu trên lớp **In-Memory Session Overlay của BFF** (không ghi đè làm bẩn file `master-data/*.json` gốc).

**Quy tắc thực thi bắt buộc (Enforcement Rules)**:
1. **Tại Backend BFF (`:4000`)**:
   - Mọi request tới `/api/v1/analytics/*` phải đính kèm `Authorization: Bearer <jwt>`.
   - Payload JWT chứa `sub` (`user_id`), `partnerId`, `roleKey`, `allowedBranchIds`, `canViewChainAll`, `canViewFinancials`, `canManagePricing`.
   - Nếu client truyền tham số lọc `?branchId=br_songhan` nhưng `allowedBranchIds` của token chỉ có `["br_mykhe"]`, BFF **từ chối ngay lập tức với HTTP `403`** (`{ ok: false, errorCode: "FORBIDDEN_BRANCH_SCOPE", message: "..." }`) trước khi gọi BigQuery.
   - Nếu `branchId = "all"`:
     - Khi `canViewChainAll = true`: Truy vấn trên tập `allowedBranchIds` của chuỗi đó (`["br_mykhe", "br_songhan", "br_anthuong"]` — không bao giờ lẫn `stay_h11` của tổ chức khác!).
     - Khi `canViewChainAll = false`: Tự động thu hẹp hoặc trả `403` nếu cố tình ép xem toàn chuỗi.
   - Khi `canViewFinancials = false` (`receptionist`): Tại tầng SQL/Serializer của BFF, mọi trường doanh thu (`revenueVnd`, `netRevenueVnd`, `payoutLedgers.batches`, số tài khoản ngân hàng) bị che/đặt về `0` hoặc mảng rỗng ngay từ response API (không chỉ ẩn bằng CSS ở giao diện).
2. **Tại Giao diện `dashboard/dashboard` (`:5182`)**:
   - Khi đổi tài khoản sang `USR-MGR-MYKHE`, dropdown chọn cơ sở tự động lọc chỉ còn `CN Mỹ Khê` và tự chuyển `propertyKey` về `"br_mykhe"`.
   - Khi đổi sang `USR-STAFF-02` (`receptionist`), khóa vào `"br_mykhe"`, ẩn/khóa tab Sao kê đối soát (`payout`), che thẻ KPI Doanh thu trên trang Tổng quan và vô hiệu hóa các nút sửa giá sàn / bật tắt Auto-Bid / tạo chiến dịch.

---

### 4.2 Thiết Kế Bộ Dữ Liệu Giả Lập & Schema 3 Tầng Trên BigQuery (`aevo-512307`)

Một bộ script tự động (`dashboard/bigquery-bff/scripts/seed_bigquery_simulation.py` hoặc `.ts`) sẽ sinh dữ liệu tất định (deterministic PRNG có cố định seed để kiểm thử khớp 100% số liệu) trong khung 30 ngày (`2026-10-08` $\rightarrow$ `2026-11-06`, khớp với `referenceDate = "2026-11-06"` của `partner_hub_config.json`) và nạp lên project `aevo-512307`:

1. **Dataset `gns_sim_ga4` — Giả lập chuẩn GA4 BigQuery Export**:
   - Tạo các bảng ngày `events_20261008` .. `events_20261106` (hoặc nạp qua wildcard/sharded tables đúng chuẩn `events_YYYYMMDD` của GA4, tổng ~`8.000 – 15.000` sự kiện hành vi) với cấu trúc cột y hệt tài liệu Google:
     - `event_date STRING` (`YYYYMMDD`), `event_timestamp INT64` (microseconds), `event_name STRING`, `user_id STRING` (`traveler_user_id`), `user_pseudo_id STRING`.
     - `device STRUCT<category STRING, operating_system STRING>`, `geo STRUCT<country STRING, region STRING, city STRING>`.
     - `event_params ARRAY<STRUCT<key STRING, value STRUCT<string_value STRING, int_value INT64, float_value FLOAT64, double_value FLOAT64>>>` chứa đầy đủ: `ga_session_id`, `partner_id`, `branch_id` (`property_id`), `request_id`, `offer_id`, `room_id`, `match_rate_pct`, `saving_pct`, `content_category` (`property_views`, `facilities`, `dining`, `rooms`, `nearby_attractions`, `videos`), `media_type`, `dwell_ms`, `scroll_down_count`, `scroll_up_count`, `decision_duration_sec`.
   - Bao phủ chuỗi sự kiện phễu 8 bước: `booking_form_start` $\rightarrow$ `booking_form_complete` $\rightarrow$ `offer_card_impression` $\rightarrow$ `offer_browse_click` $\rightarrow$ `explore_stay_media_click` $\rightarrow$ `offer_select_click` $\rightarrow$ `payment_checkout_open` $\rightarrow$ `payment_complete` (kèm `offer_reject_click` & `offer_ttl_expired`).

2. **Dataset `gns_sim_oltp` — Dữ liệu Giao dịch, Đấu giá & Phân quyền**:
   - `partner_user_branch_access`: 5 dòng phân quyền nhân sự ở Mục 4.1.
   - `partner_branches`: Metadata 4 chi nhánh (`br_mykhe`, `br_songhan`, `br_anthuong`, `stay_h11`) và điểm đánh giá `reviewRating5`, `eloScore`.
   - `bid_offers_and_orders`: Đồng bộ từ 143 bản ghi chuẩn của `bid_records.json` (và mở rộng đầy đủ thuộc tính cho `stay_h11`), đảm bảo tổng doanh thu thuần 29 đơn hoàn tất của chuỗi L'amour khớp tuyệt đối con số đối soát **`66.360.000 ₫`** (GMV `83.945.400 ₫` theo công thức `×1.265`) để khi bật công tắc giữa `Local JSON` và `Live BigQuery`, số tiền đối soát khớp nhau từng đồng!

3. **Dataset `gns_analytics_mart` — Tầng Làm Phẳng & Gold Marts Cho Dashboard**:
   - `stg_ga4_behavior_events` (`PARTITION BY event_date CLUSTER BY partner_id, branch_id, event_name`): Bóc tách `UNNEST(event_params)` bằng Correlated Scalar Subquery.
   - `mart_partner_branch_daily` (`PARTITION BY metric_date CLUSTER BY partner_id, branch_id`, `require_partition_filter = true`): Gom sẵn doanh thu OLTP + kết quả đấu giá + lượt xem duy nhất (`unique_viewed_offers` vs `total_browse_clicks`) + thời gian quyết định trung bình theo từng ngày và từng `branch_id`.
   - `mart_branch_funnel_and_media` (`PARTITION BY metric_date CLUSTER BY partner_id, branch_id`, `require_partition_filter = true`): Gom sẵn số lượng qua từng bước của Phễu 8 bước và số lượt tương tác hình ảnh/video theo 5 danh mục nội dung + phân bố thiết bị (`ios` / `android` / `web`).

---

### 4.3 Kiến Trúc Microservice `dashboard/bigquery-bff` (Cổng `:4000`)

Thư mục `dashboard/bigquery-bff/` là một gói TypeScript gọn nhẹ, độc lập:
- **Dependencies tối giản**: `express` (hoặc `node:http` / `fastify` chuẩn TypeScript), `cors`, `@google-cloud/bigquery`, `jose` (hoặc `node:crypto` HMAC-SHA256 không cần phụ thuộc ngoài để ký/xác thực JWT chuẩn RFC 7519). *(Thiết kế ưu tiên dùng `node:http` + `node:crypto` + `@google-cloud/bigquery` để siêu nhẹ, khởi động `< 300ms` và không phình `node_modules`!)*.
- **Cấu hình môi trường (`.env` / biến mặc định an toàn)**:
  - `PORT=4000`
  - `GCP_PROJECT_ID=aevo-512307`
  - `BQ_LOCATION=asia-southeast1`
  - `BQ_MAX_BYTES_BILLED=52428800` (`50 MiB`)
  - `BFF_CACHE_TTL_MS=60000` (`60 giây`)
- **Danh sách REST Endpoints**:
  1. `GET /api/v1/health`: Trả trạng thái server, `projectId`, `location` và kết nối ADC.
  2. `GET /api/v1/auth/profiles`: Trả danh sách 5 hồ sơ nhân sự mẫu (không lộ secret) để thanh chuyển đổi tài khoản trên UI hiển thị dùng thử.
  3. `POST /api/v1/auth/session`: Nhận `{ userId }`, đối chiếu bảng `partner_user_branch_access` (cache trên RAM khi khởi động + đồng bộ từ BigQuery), ký và trả về `accessToken` (JWT) kèm đối tượng quyền `permissions`.
  4. `GET /api/v1/analytics/bundle?branchId=...`:
     - Dành cho **Công tắc chuyển nguồn toàn hệ thống (`Live BigQuery`)**.
     - Xác thực JWT $\rightarrow$ Kiểm tra `branchId` thuộc `allowedBranchIds` $\rightarrow$ Truy vấn BigQuery `gns_sim_oltp` + `gns_analytics_mart` để lắp ghép và trả về đối tượng `MasterDataBundle` đã được **cắt lọc đúng theo quyền của `userId`** (chỉ trả các `properties`, `bidRecords`, `roomInventory`, `payoutLedgers` thuộc `allowedBranchIds`; nếu `canViewFinancials = false` thì ẩn toàn bộ tiền doanh thu & sao kê) kèm metadata telemetry (`queryDurationMs`, `totalBytesProcessed`, `cacheHit`).
  5. `GET /api/v1/analytics/viewport?branchId=...&period=today|7d|30d`:
     - Dành riêng cho màn hình **`BigQuery Live Viewport`**.
     - Thực thi truy vấn có tham số (`@partnerId`, `@branchIds`, `@startDate`, `@endDate`) vào `mart_partner_branch_daily` và `mart_branch_funnel_and_media` trên `aevo-512307`, trả về:
       - `telemetry`: `{ projectId, dataset: "gns_analytics_mart", jobId, queryDurationMs, totalBytesProcessed, cacheHit, executedAt, appliedFilterSummary }`
       - `rbacContext`: `{ userId, roleKey, partnerId, allowedBranchIds, effectiveBranchIds, canViewFinancials, canManagePricing }`
       - `kpis`: `{ uniqueRequests, offersSent, uniqueViewedOffers, totalBrowseClicks, uniqueSelectedOffers, paidBookings, viewToSelectPct, selectToPayPct, avgDecisionSec, netRevenueVnd }`
       - `funnel8Steps`: Mảng 8 bước từ mở form tìm phòng $\rightarrow$ thanh toán thành công kèm tỷ lệ rớt phễu từng bước.
       - `mediaEngagement`: Số lượt click ảnh vs. video trên 5 danh mục (`property_views`, `facilities`, `dining`, `rooms`, `nearby_attractions`).
       - `deviceBreakdown`: Tỷ lệ chuyển đổi theo `ios`, `android`, `web`.
       - `aiDiagnostics`: 3 nhận định tự động "Tại sao Trúng thầu vs. Tại sao Không trúng thầu" rút trực tiếp từ dữ liệu BigQuery của chi nhánh đang chọn.

---

### 4.4 Thiết Kế Giao Diện Trên `dashboard/dashboard` (Cổng `:5182`)

1. **Thanh công tắc Nguồn dữ liệu & Hồ sơ nhân sự (`PartnerHubShell.tsx` + `App.tsx`)**:
   - Bổ sung công tắc trực quan trên Header: **`JSON Mock`** $\leftrightarrow$ **`BigQuery Live`** (kèm chấm xanh dương/ngọc báo trạng thái kết nối tới BFF `:4000`; nếu `:4000` đang tắt mà người dùng bấm sang `BigQuery Live`, hiển thị thông báo rõ ràng và giữ dữ liệu an toàn không văng lỗi).
   - Mở rộng menu chọn nhân sự hỗ trợ đầy đủ 5 hồ sơ (`USR-PARTNER-01`, `USR-MGR-MYKHE`, `USR-MGR-SONGHAN`, `USR-STAFF-02`, `USR-MGR-H11`).
   - Tự động khóa dropdown cơ sở lưu trú theo `allowedBranchIds` của hồ sơ đang đăng nhập và ẩn các thành phần tài chính / nút chỉnh giá khi `canViewFinancials === false` hoặc `canManagePricing === false`.

2. **Màn hình mới `BigQueryWarehouseView.tsx` (Mục menu trái: `BigQuery Live` / `Kho BigQuery`)**:
   - **Khối 1 — BigQuery Connection & Job Telemetry Bar**: Hiển thị trực tiếp `GCP Project: aevo-512307`, `Dataset: gns_analytics_mart`, thời gian phản hồi (`ms`), số byte BigQuery vừa quét (`KB`), trạng thái `Cache Hit` hay `Live Scan`, và nút **Làm mới truy vấn (`Force Live Query`)**.
   - **Khối 2 — Bộ Kiểm Chứng Phân Quyền `userID × branchID` (RBAC Scope Inspector)**: Hiển thị thẻ định danh JWT hiện tại (`user_id`, `partner_id`, `allowed_branch_ids`, quyền tài chính/giá) kèm nút bấm kiểm thử an toàn **"Thử truy cập trái phép chi nhánh khác (`Test Cross-Branch Guard`)"** — khi bấm sẽ gửi request thử nghiệm lấy dữ liệu của một chi nhánh ngoài phạm vi lên BFF `:4000` và hiển thị trực quan phản hồi chặn `HTTP 403 FORBIDDEN_BRANCH_SCOPE` từ Server (cực kỳ thuyết phục khi demo cho Quản lý Sản phẩm!).
   - **Khối 3 — Biểu Đồ Phễu Hành Vi GA4 8 Bước (`UNNEST(event_params)`)**: So sánh trực quan lượng rơi rụng qua từng bước và làm nổi bật sự khác biệt giữa `Tổng lượt bấm Xem (Total Clicks)` vs. `Đề nghị duy nhất được xem (Unique Viewed Offers)`.
   - **Khối 4 — Ma Trận Tương Tác Nội Dung 5 Danh Mục & Thiết Bị Đặt Phòng (`iOS / Android / Web`)**: Biểu đồ cột ngang điểm mạnh/yếu hình ảnh của chi nhánh và tỷ lệ chốt đơn theo thiết bị, kèm hộp gợi ý hành động cho khách sạn.

---

## 5. Chiến Lược Kiểm Thử & Đảm Bảo Chất Lượng (Zero-Regression Gate)

Tuân thủ nghiêm ngặt quy định tại `AGENTS.md` Mục 5 cho `dashboard/dashboard`:
1. **Kiểm thử trên `dashboard/bigquery-bff`**:
   - Unit & Integration tests xác nhận: JWT cấp đúng quyền cho 5 `userID`, chặn `403` khi truy cập chéo `branchID` hoặc chéo `partner_id`, che 100% số tiền đối với `USR-STAFF-02` (`receptionist`), và truy vấn thật thành công lên `aevo-512307.gns_analytics_mart` với `maximumBytesBilled` hoạt động đúng.
2. **Kiểm thử trên `dashboard/dashboard`**:
   - Bổ sung unit tests cho logic lọc phạm vi `allowedBranchIds` và ẩn/hiện quyền theo 5 hồ sơ nhân sự.
   - Bổ sung Playwright E2E tests kiểm tra màn hình `BigQuery Live Viewport`, công tắc chuyển nguồn dữ liệu, hành vi khóa dropdown chi nhánh khi đổi sang Quản lý chi nhánh, và kiểm tra responsive không tràn ngang (`scrollWidth <= innerWidth`) trên đủ **7 kích thước màn hình** (`1440×900`, `1280×800`, `1024×768`, `768×1024`, `390×844`, `375×667`, `360×800`).
   - Chạy trọn bộ `npm test` và `npm run build` đạt **100% pass, 0 lỗi TypeScript/Console**.
