# goodNstay Partner Dashboard — 4-Sheet Event Tracking & Master Data Metadata Mapping (`v4.0`)

Tài liệu này quy chuẩn hóa ánh xạ **1-1** giữa **4 Sheets Event Tracking** trên Google Sheets **`[GNS] Database Schema`** (`booking_form`, `offer_listing`, `explore_stays`, `payment_form` — tổng **45 events**) và **7 bảng Master Data JSON** của **Optibide Partner Hub** (`dashboard/dashboard/master-data/*.json` & `master-data/seed/*.json`).

---

## 1. Chuỗi Khóa Liên Kết Xuyên Suốt (End-to-End Entity Lineage)

```text
session_form_id (booking_form)
   └──► request_id / request_code (booking_form_complete -> bidding_operations.liveRequests / bid_records.id)
           └──► offer_id + property_id + room_id (offer_listing -> bid_records.telemetry.offer_listing)
                   ├──► view_session_id (offer_browse_click -> explore_stays popup CHỐT BID NGAY)
                   └──► checkout_session_id -> payment_code (PM-...) -> booking_id (#43..#71)
                           └──► payoutBatchId (STL-...) -> payout_ledgers.batches
```

---

## 2. Bất Biến Công Thức Tài Chính (`×1.265` Pricing & Settlement Invariant)

- **Doanh thu thuần khách sạn thực nhận (`base_price` / `netRevenueVnd`)**: `offeredRatePerNightVnd × stay_nights` (`100%` thanh toán về tài khoản ngân hàng của cơ sở, `0%` khấu trừ hoa hồng). Tổng 29 đơn hoàn tất `#43..#71` = **`66.360.000 ₫`**.
- **Phí dịch vụ nền tảng 15% (`platform_fee_amount`)**: `round(base_price × 0.15)` = **`9.954.000 ₫`** (Doanh thu ròng của sàn goodNstay).
- **Thuế GTGT 10% (`vat_amount`)**: `round((base_price + platform_fee_amount) × 0.10)` = **`7.631.400 ₫`**.
- **Tổng thanh toán của khách / GMV (`total_booking_amount` = `offer_total_price`)**: `base_price + platform_fee_amount + vat_amount` (`1.265 × base_price`) = **`83.945.400 ₫`**.

---

## 3. Ánh Xạ Chi Tiết 7 Bảng Master Data ↔ 4 Event Tracking Sheets

| Bảng Master Data (`master-data/`) | Nhóm Metadata bổ sung | Sheets ánh xạ | Events nguồn tiêu biểu | Các thuộc tính (`Key parameters`) đồng bộ trực tiếp |
| :--- | :--- | :--- | :--- | :--- |
| **`partner_hub_config.json`** (`hubConfig`) | `properties[].marketplaceIdentity` | `booking_form`, `offer_listing`, `explore_stays`, `payment_form` | `booking_destination_select`, `explore_stay_modal_view`, `explore_stay_gallery_tab_switch`, `explore_stay_review_inspect`, `payment_fx_quote_result` | `property_id`, `staying_country`, `staying_province`, `staying_city`, `staying_district`, `accommodation_type`, `partner_count`, `star_rating`, `review_score`, `review_count`, `content_category` (`videos`, `property_views`, `facilities`, `dining`, `rooms`, `nearby_attractions`), `exchange_rate` |
| **`bid_records.json`** (`bidRecords` — 143 bản ghi) | `telemetry.{booking_form, offer_listing, explore_stays, payment_form}` | Cả 4 sheets (`booking_form`, `offer_listing`, `explore_stays`, `payment_form`) | Toàn bộ vòng đời từ `booking_form_complete` → `offer_card_impression` / `offer_browse_click` / `offer_ttl_expired` → `explore_stay_*` → `payment_complete` | `session_form_id`, `request_id`, `request_code`, `device_os`, `booker_country`, `stay_nights`, `lead_time_days`, `adults`, `children`, `infants`, `pets`, `group_type`, `combo_signature`, `offer_id`, `is_auto_bid`, `match_rate_pct`, `unmatched_keys`, `ota_code`, `ota_price`, `saving_pct`, `browse_click_count`, `elapsed_since_bid_sec`, `browse_elapsed_sec_list` *(Distribution Curve)*, `scroll_down_count`, `scroll_up_count`, `description_dwell_ms`, `media_clicked_count`, `payment_code`, `base_price`, `platform_fee_amount`, `vat_amount`, `total_booking_amount`, `is_first_payment`, `time_since_signup_hours`, `days_since_prev_payment`, `select_to_paid_sec` |
| **`room_inventory.json`** (`roomInventory` — 15 hạng phòng, 48 phòng) | `roomTypes[].catalogMapping` | `booking_form`, `offer_listing`, `explore_stays` | `booking_preference_change`, `offer_room_option_switch`, `explore_stay_room_carousel_interact`, `explore_stay_media_click` | `room_id`, `room_type_key` (`standard`, `deluxe`, `family_suite`, `executive_suite`), `bed_type_key` (`doubleQueenKing`, `twinSingle`, `connectingBeds`), `service_option_keys`, `combo_signature`, `gallery_room_photos_count` |
| **`payout_ledgers.json`** (`payoutLedgers` — 12 kỳ sao kê) | `batches[].settlementBreakdown` | `payment_form` | `payment_complete`, `payment_fx_quote_result`, `payment_fail` | `payment_codes` (`PM-2026-0043..0071`), `booking_currency`, `partner_base_price_vnd` (`66.360.000 ₫`), `platform_fee_15pct_vnd` (`9.954.000 ₫`), `vat_10pct_vnd` (`7.631.400 ₫`), `total_booking_gmv_vnd` (`83.945.400 ₫`) |
| **`bidding_operations.json`** (`biddingOperations`) | `liveRequests[].requestTelemetry`, `autoBidRules[].guardrailTelemetry` | `booking_form`, `offer_listing` | `booking_form_complete`, `offer_listing_view`, `offer_card_impression`, `offer_ttl_expired` | `request_id`, `request_code`, `session_form_id`, `device_os`, `booker_country`, `lead_time_days`, `group_type`, `combo_signature`, `criteria_count`, `remaining_ttl_sec`, `is_auto_bid`, `match_rate_pct`, `saving_pct` |
| **`marketing_campaigns.json`** (`marketingCampaigns`) | Liên kết `lead_time_days = 0`, `stay_nights >= 2`, `saving_pct` | `booking_form`, `offer_listing`, `explore_stays` | `booking_stay_details_complete`, `offer_card_ota_expand`, `explore_stay_ota_compare_click` | `lead_time_days`, `stay_nights`, `saving_pct`, `offer_total_price`, `ota_price` |
| **`hub_inbox.json`** (`hubInbox`) | Liên kết `bookingCode` ↔ `payment_form.booking_id` | `payment_form`, `booking_form` | `payment_staying_info_update`, `payment_complete`, `payment_receipt_action` | `booking_id`, `property_id`, `guest_same_as_booker`, `post_pay_cta` (`download_receipt_pdf` cho khách công tác) |
