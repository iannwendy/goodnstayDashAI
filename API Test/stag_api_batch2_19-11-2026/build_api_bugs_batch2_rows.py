#!/usr/bin/env python3
"""Generate QA-Guide & OWASP-2025 compliant Vietnamese 20-column rows for API_BUGS (BUG-API-07 .. BUG-API-12)."""

from __future__ import annotations

import json
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent
UPLOADED = json.loads((BASE_DIR / "uploaded_jira_tickets.json").read_text(encoding="utf-8"))
by_id = {t["bug_id"]: t for t in UPLOADED["tickets"]}


def _ev_label(bug_id: str, fname: str) -> str:
    return f"{fname} ({by_id[bug_id]['issue_key']})"


def _ev_url(bug_id: str) -> str:
    urls = by_id[bug_id].get("attachment_urls") or []
    return urls[0] if urls else by_id[bug_id]["issue_url"]


rows = [
    {
        "bug_id": "BUG-API-07",
        "summary": (
            "[Accommodation Request API - POST /api/traveler/request-bids] Phản hồi HTTP 200 OK khi tạo yêu cầu đặt phòng "
            "trả nguyên đối tượng data.customerRequest.user làm lộ các trường nhạy cảm nội bộ (password, resetPasswordToken, confirmationToken)"
        ),
        "area": "Accommodation Request – Bid Submission Response DTO (/api/traveler/request-bids)",
        "type": "FUNCTIONAL",
        "severity": "CRITICAL",
        "steps": (
            "1. Chuẩn bị fixture hợp lệ hoàn chỉnh fixtures/valid-request-bids.json bằng dữ liệu QA giả lập (QA Tester, qa-sample@example.test, +84900000000, KR / KR-11, guestCount = 2, roomCount = 1).\n"
            "2. Gửi POST https://services.stag.goodnstay.com/api/traveler/request-bids kèm Authorization: Bearer <REDACTED_QA_TOKEN>.\n"
            "3. Kiểm tra các khóa trả về bên trong đối tượng data.customerRequest.user của JSON response (HTTP 200 OK).\n"
            "4. Gọi GET https://services.stag.goodnstay.com/api/customer-requests xác nhận bản ghi #1536 đã tạo rồi hủy dọn sạch đơn test #1536."
        ),
        "expected": (
            "- Theo API Standard (Confluence 524593) và nguyên tắc lọc DTO đầu ra (OWASP API3:2023), phản hồi 2xx tạo yêu cầu phòng chỉ được trả các trường biên nhận công khai, tuyệt đối không trả các cột nhạy cảm nội bộ của bảng up_users (password, resetPasswordToken, confirmationToken).\n"
            "- Bản ghi Customer Request được lưu chuẩn khi đọc lại qua GET /api/customer-requests."
        ),
        "actual": (
            "- POST /api/traveler/request-bids trả HTTP 200 OK tạo Customer Request #1536 nhưng nhúng nguyên thực thể up_users chưa lọc bên trong data.customerRequest.user:\n"
            "  • data.customerRequest.user.password (\"<REDACTED_HASH>\")\n"
            "  • data.customerRequest.user.resetPasswordToken\n"
            "  • data.customerRequest.user.confirmationToken"
        ),
        "environment": "STAG",
        "device_locale": "Staging API & Chrome · 1440×900 · en-US",
        "evidence_label": _ev_label("BUG-API-07", "bug_api07_request_bids_response_user_columns_1440x900.png"),
        "evidence_url": _ev_url("BUG-API-07"),
        "qa_stage": "NEW",
        "jira_url": by_id["BUG-API-07"]["issue_url"],
        "reported_by": "Nguyen Bao Minh",
        "reported_on": "2026-11-19",
        "retest_result": "NOT RUN",
        "notes": (
            f"Test Case: STAG-API-203 (Positive DTO Sanitization) | Đã hủy dọn sạch đơn test #1536 sau khi readback. "
            f"| OWASP: A04:2025 & A01:2025 (CWE-201) · API3:2023 BOPLA | Khắc phục: Áp dụng DTO allow-list / sanitizeOutput (https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) | Jira: {by_id['BUG-API-07']['issue_key']}."
        ),
    },
    {
        "bug_id": "BUG-API-08",
        "summary": (
            "[Customer Requests API - GET /api/customer-requests] Bearer token đã đăng xuất qua POST /api/traveler/logout "
            "vẫn gọi được GET /api/customer-requests trả HTTP 200 OK kèm toàn bộ danh sách yêu cầu phòng"
        ),
        "area": "Authentication & Accommodation Requests – Session Revocation (/api/customer-requests)",
        "type": "FUNCTIONAL",
        "severity": "CRITICAL",
        "steps": (
            "1. Tạo phiên đăng nhập QA độc lập qua POST https://services.stag.goodnstay.com/api/traveler/login.\n"
            "2. Thu hồi phiên bằng POST https://services.stag.goodnstay.com/api/traveler/logout -> trả HTTP 200 OK ('Logged out successfully.').\n"
            "3. Kiểm chứng chuẩn thu hồi phiên trên GET /api/traveler/me và PUT /api/customer-requests/:id -> đều trả HTTP 401 ('You are not logged in.').\n"
            "4. Biến đổi đơn biến trạng thái phiên: Dùng chính Bearer token vừa đăng xuất gọi GET https://services.stag.goodnstay.com/api/customer-requests."
        ),
        "expected": (
            "- Theo chuẩn quản lý vòng đời phiên Fail-Closed (Confluence 524593) và đồng nhất với GET /api/traveler/me & PUT /api/customer-requests/:id (HTTP 401), GET /api/customer-requests phải từ chối mọi Bearer token đã đăng xuất bằng HTTP 401 Unauthorized.\n"
            "- Không trả về bất kỳ bản ghi Customer Request nào sau khi đăng xuất."
        ),
        "actual": (
            "- GET /api/customer-requests vẫn chấp nhận Bearer token đã đăng xuất, trả về HTTP 200 OK kèm toàn bộ 31 bản ghi Customer Request (id, checkInDate, checkOutDate, stayingCity, notes, hotelBids)."
        ),
        "environment": "STAG",
        "device_locale": "Staging API & Chrome · 1440×900 · en-US",
        "evidence_label": _ev_label("BUG-API-08", "bug_api08_customer_requests_after_logout_1440x900.png"),
        "evidence_url": _ev_url("BUG-API-08"),
        "qa_stage": "NEW",
        "jira_url": by_id["BUG-API-08"]["issue_url"],
        "reported_by": "Nguyen Bao Minh",
        "reported_on": "2026-11-19",
        "retest_result": "NOT RUN",
        "notes": (
            f"Test Case: STAG-API-204 (Permission — Session Revocation) | Route collection Strapi chỉ kiểm chữ ký JWT mà bỏ qua kiểm tra thu hồi phiên trong login-devices. "
            f"| OWASP: A07:2025 (CWE-613) & A01:2025 · API2:2023 | Khắc phục: Đồng bộ middleware kiểm tra phiên hoạt động (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Jira: {by_id['BUG-API-08']['issue_key']}."
        ),
    },
    {
        "bug_id": "BUG-API-09",
        "summary": (
            "[Notification API - POST /api/v1/notifications/mark-all-read] Bearer token đã đăng xuất qua POST /api/traveler/logout "
            "vẫn cập nhật được trạng thái đã đọc thông báo với HTTP 200 OK (updated = 8)"
        ),
        "area": "Notifications & API Gateway – Cross-Service Session Revocation (/api/v1/notifications/mark-all-read)",
        "type": "FUNCTIONAL",
        "severity": "CRITICAL",
        "steps": (
            "1. Tạo phiên đăng nhập QA độc lập qua POST https://services.stag.goodnstay.com/api/traveler/login.\n"
            "2. Gọi POST https://services.stag.goodnstay.com/api/traveler/logout (HTTP 200 OK) và xác nhận GET /api/traveler/me từ chối token với HTTP 401.\n"
            "3. Biến đổi đơn biến trạng thái phiên: Dùng Bearer token đã đăng xuất gọi POST https://services.stag.goodnstay.com/api/v1/notifications/mark-all-read.\n"
            "4. Ghi nhận HTTP status, data.updated và meta.requestId."
        ),
        "expected": (
            "- Theo chuẩn đồng bộ thu hồi phiên liên dịch vụ (Confluence 524593), sau khi đăng xuất thành công, API Gateway / Notification Service (/api/v1/notifications/*) phải từ chối token đã thu hồi bằng HTTP 401 AUTH_UNAUTHORIZED.\n"
            "- Không được phép thay đổi trạng thái bản ghi thông báo bằng token đã đăng xuất."
        ),
        "actual": (
            "- POST /api/v1/notifications/mark-all-read chấp nhận Bearer token đã đăng xuất và trả về HTTP 200 OK: {\"data\": {\"updated\": 8}, \"meta\": {\"requestId\": \"32306f87-02cb-437b-9039-c1ae4db87a1a\"}}, sửa đổi 8 thông báo sau khi đã đăng xuất."
        ),
        "environment": "STAG",
        "device_locale": "Staging API & Chrome · 1440×900 · en-US",
        "evidence_label": _ev_label("BUG-API-09", "bug_api09_notifications_mark_read_after_logout_1440x900.png"),
        "evidence_url": _ev_url("BUG-API-09"),
        "qa_stage": "NEW",
        "jira_url": by_id["BUG-API-09"]["issue_url"],
        "reported_by": "Nguyen Bao Minh",
        "reported_on": "2026-11-19",
        "retest_result": "NOT RUN",
        "notes": (
            f"Test Case: STAG-API-205 | requestId: 32306f87-02cb-437b-9039-c1ae4db87a1a | Chunk FE: 0lu641k7h1gc_.js "
            f"| OWASP: A07:2025 (CWE-613) & A01:2025 · API2:2023 | Khắc phục: Bổ sung kiểm tra danh sách thu hồi phiên / jti denylist tại Gateway (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | Jira: {by_id['BUG-API-09']['issue_key']}."
        ),
    },
    {
        "bug_id": "BUG-API-10",
        "summary": (
            "[Accommodation Request API - POST /api/traveler/request-bids] Truyền ngày trả phòng sớm hơn ngày nhận phòng "
            "(checkOutDate = '2026-12-18' < checkInDate = '2026-12-20') vẫn trả HTTP 200 OK và lưu đơn mở vào DB"
        ),
        "area": "Accommodation Request – Stay Date Boundary Validation (/api/traveler/request-bids)",
        "type": "DATA INVALID",
        "severity": "HIGH",
        "steps": (
            "1. Chuẩn bị fixture hợp lệ hoàn chỉnh fixtures/valid-request-bids.json (checkInDate = '2026-12-20', checkOutDate = '2026-12-22').\n"
            "2. Biến đổi đơn biến: Nhân bản valid-request-bids.json và chỉ đổi duy nhất data.checkOutDate thành '2026-12-18' (sớm hơn checkInDate 2 ngày; fixtures/request-bids-inverted-checkout-date.json).\n"
            "3. Gửi POST https://services.stag.goodnstay.com/api/traveler/request-bids kèm Authorization: Bearer <REDACTED_QA_TOKEN>.\n"
            "4. Gọi GET https://services.stag.goodnstay.com/api/customer-requests kiểm chứng bản ghi lưu trong DB (sau đó hủy dọn sạch đơn test #1537)."
        ),
        "expected": (
            "- Theo Accommodation Route Contract (Confluence 166952975) và GNS-FORM-001 (174227515), Backend bắt buộc kiểm tra checkOutDate > checkInDate (>= 1 đêm) và từ chối khoảng ngày ngược bằng lỗi 4xx (<CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>).\n"
            "- Không tạo bản ghi Customer Request mới trong cơ sở dữ liệu."
        ),
        "actual": (
            "- POST /api/traveler/request-bids trả HTTP 200 OK ({\"success\": true, \"message\": \"Rating created successfully.\"}).\n"
            "- Đọc lại qua GET /api/customer-requests xác nhận đơn mở #1537 đã được lưu vào PostgreSQL với checkInDate = '2026-12-20' và checkOutDate = '2026-12-18'."
        ),
        "environment": "STAG",
        "device_locale": "Staging API & Chrome · 1440×900 · en-US",
        "evidence_label": _ev_label("BUG-API-10", "bug_api10_request_bids_inverted_dates_1440x900.png"),
        "evidence_url": _ev_url("BUG-API-10"),
        "qa_stage": "NEW",
        "jira_url": by_id["BUG-API-10"]["issue_url"],
        "reported_by": "Nguyen Bao Minh",
        "reported_on": "2026-11-19",
        "retest_result": "NOT RUN",
        "notes": (
            f"Test Case: STAG-API-206 | Biến đổi đơn biến: data.checkOutDate ('2026-12-22' -> '2026-12-18'). Đã hủy đơn test #1537 sau khi readback. "
            f"| OWASP: A06:2025 (CWE-840) & A10:2025 (CWE-636) · API6:2023 | Khắc phục: Kiểm tra ràng buộc checkOutDate > checkInDate phía server (https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html) | Jira: {by_id['BUG-API-10']['issue_key']}."
        ),
    },
    {
        "bug_id": "BUG-API-11",
        "summary": (
            "[Notification API - GET /api/v1/notifications] Gửi header Origin ngoài danh sách cho phép làm văng lỗi máy chủ "
            "HTTP 500 INTERNAL_ERROR thay vì từ chối CORS chuẩn"
        ),
        "area": "Notifications & API Gateway – CORS & Error Handling (/api/v1/notifications)",
        "type": "FUNCTIONAL",
        "severity": "HIGH",
        "steps": (
            "1. Xác nhận lời gọi chuẩn GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 với Origin: https://web.stag.goodnstay.com trả HTTP 200 OK.\n"
            "2. Đối chứng cùng host trên GET /api/traveler/me với Origin: https://untrusted-origin.example.test -> hệ thống chỉ lược bỏ Access-Control-Allow-Origin êm mà không văng lỗi 500.\n"
            "3. Biến đổi đơn biến ở Header: Đổi duy nhất header Origin sang https://untrusted-origin.example.test trên GET https://services.stag.goodnstay.com/api/v1/notifications?limit=5 và ghi nhận phản hồi."
        ),
        "expected": (
            "- Theo chuẩn phân tách lỗi 4xx vs 5xx (OpenAPI Governance Confluence 144015744) và đồng nhất với /api/traveler/me, Origin không hợp lệ từ phía client tuyệt đối không được gây lỗi máy chủ HTTP 500 INTERNAL_ERROR (cần trả callback(null, false) hoặc 403 chuẩn <CHECK_OPENAPI>)."
        ),
        "actual": (
            "- Dịch vụ văng lỗi máy chủ HTTP 500 Internal Server Error: {\"error\": {\"code\": \"INTERNAL_ERROR\", \"messageKey\": \"errors.internal\", \"details\": {\"name\": \"Error\", \"message\": \"Origin https://untrusted-origin.example.test is not allowed by CORS\"}}}."
        ),
        "environment": "STAG",
        "device_locale": "Staging API & Chrome · 1440×900 · en-US",
        "evidence_label": _ev_label("BUG-API-11", "bug_api11_notifications_cors_500_error_1440x900.png"),
        "evidence_url": _ev_url("BUG-API-11"),
        "qa_stage": "NEW",
        "jira_url": by_id["BUG-API-11"]["issue_url"],
        "reported_by": "Nguyen Bao Minh",
        "reported_on": "2026-11-19",
        "retest_result": "NOT RUN",
        "notes": (
            f"Test Case: STAG-API-207 | Biến đổi đơn biến: Header Origin | OWASP: A10:2025 (CWE-755, CWE-209) & A02:2025 · API8:2023 "
            f"| Khắc phục: Trả callback(null, false) trong cấu hình CORS thay vì ném Error ra global 500 filter (https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html) | Jira: {by_id['BUG-API-11']['issue_key']}."
        ),
    },
    {
        "bug_id": "BUG-API-12",
        "summary": (
            "[Location Pin API - POST /api/translations/stay-location-pin] Lời gọi thiếu Authorization header vẫn thực thi định vị qua OpenAI "
            "và trả HTTP 200 OK (Cần xác nhận OpenAPI Auth Contract)"
        ),
        "area": "Accommodation Offers – Map Location Pin OpenAI API (/api/translations/stay-location-pin)",
        "type": "FUNCTIONAL",
        "severity": "MEDIUM",
        "steps": (
            "1. Chuẩn bị fixture hợp lệ fixtures/valid-stay-location-pin.json ({\"hotelName\": \"QA Sample Hotel\", \"hotelAddress\": \"Jung-gu, Seoul, KR\"}).\n"
            "2. Biến đổi đơn biến ở Header: Bỏ duy nhất header Authorization Bearer (trong khi chunk 0v23-8ja2iskk.js trên web luôn đính kèm token đăng nhập).\n"
            "3. Gửi POST https://services.stag.goodnstay.com/api/translations/stay-location-pin và ghi nhận mã HTTP cùng trường data.provider."
        ),
        "expected": (
            "- <CHECK_OPENAPI> / <CHECK_ERROR_REGISTRY>: Do tài liệu STAGING OpenAPI hiện chưa được xuất bản (/openapi.json trả 404), cần xác nhận với Backend / Architecture Owner xem endpoint định vị OpenAI này bắt buộc xác thực Traveler Bearer token (trả HTTP 401 cùng nhóm OP-1951) hay chủ đích mở công khai kèm giới hạn tần suất."
        ),
        "actual": (
            "- POST /api/translations/stay-location-pin không có Authorization header vẫn gọi trực tiếp nhà cung cấp 'openai' và trả HTTP 200 OK (lat = 37.5665, lng = 126.978)."
        ),
        "environment": "STAG",
        "device_locale": "Staging API & Chrome · 1440×900 · en-US",
        "evidence_label": _ev_label("BUG-API-12", "bug_api12_stay_location_pin_unauth_check_1440x900.png"),
        "evidence_url": _ev_url("BUG-API-12"),
        "qa_stage": "NEEDS REVIEW",
        "jira_url": by_id["BUG-API-12"]["issue_url"],
        "reported_by": "Nguyen Bao Minh",
        "reported_on": "2026-11-19",
        "retest_result": "BLOCKED",
        "notes": (
            f"Test Case: STAG-API-208 (BLOCKED — API contract missing theo QA Guide §2) | Phân loại trên Jira: Needs Verification "
            f"| OWASP: A02:2025 & X01:2025 (CWE-400) · API4:2023 (https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html) | Jira: {by_id['BUG-API-12']['issue_key']}."
        ),
    },
]

out_file = BASE_DIR / "api_bugs_batch2_sheet_rows.json"
out_file.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(rows)} QA-Guide-compliant rows to {out_file}")
