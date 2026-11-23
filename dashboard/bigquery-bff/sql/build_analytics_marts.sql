-- ============================================================================
-- goodNstay BigQuery Medallion Pipeline (Silver + Gold Marts)
-- Target Project: aevo-512307 · Location: asia-southeast1
-- ============================================================================

-- 1. SILVER LAYER: Flatten nested GA4 event_params via Correlated Scalar Subqueries
--    (Preserves strict 1 row = 1 GA4 event without CROSS JOIN row fan-out)
CREATE OR REPLACE TABLE `aevo-512307.gns_analytics_mart.stg_ga4_behavior_events`
PARTITION BY event_date
CLUSTER BY partner_id, branch_id, event_name, offer_id
OPTIONS (
  require_partition_filter = true,
  description = 'Flattened GA4 behavioral events from gns_sim_ga4.events_* using scalar UNNEST subqueries'
) AS
SELECT
  PARSE_DATE('%Y%m%d', event_date) AS event_date,
  TIMESTAMP_MICROS(event_timestamp) AS occurred_at,
  event_name,
  user_id AS traveler_id,
  user_pseudo_id,
  platform,
  device.category AS device_category,
  device.operating_system AS device_os_label,
  geo.country AS geo_country,
  traffic_source.source AS utm_source,
  traffic_source.medium AS utm_medium,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS ga_session_id,
  COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'partner_id'), 'UNKNOWN') AS partner_id,
  COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'branch_id'), 'UNKNOWN') AS branch_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'request_id') AS request_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'request_code') AS request_code,
  COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'offer_id'), '') AS offer_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'room_id') AS room_id,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'device_os') AS device_os,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'booker_country') AS booker_country,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'accommodation_type') AS accommodation_type,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'group_type') AS group_type,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'content_category') AS content_category,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'media_type') AS media_type,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'primary_unmatched_key') AS primary_unmatched_key,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'dwell_ms') AS dwell_ms,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'scroll_down_count') AS scroll_down_count,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'scroll_up_count') AS scroll_up_count,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'decision_duration_sec') AS decision_duration_sec,
  (SELECT COALESCE(value.double_value, value.float_value, CAST(value.int_value AS FLOAT64))
   FROM UNNEST(event_params) WHERE key = 'match_rate_pct') AS match_rate_pct,
  (SELECT COALESCE(value.double_value, value.float_value, CAST(value.int_value AS FLOAT64))
   FROM UNNEST(event_params) WHERE key = 'saving_pct') AS saving_pct
FROM `aevo-512307.gns_sim_ga4.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20261008' AND '20261106';

-- 2. GOLD MART 1: Daily Partner & Branch KPIs (OLTP Revenue/Bids + GA4 Unique vs Total Clicks)
CREATE OR REPLACE TABLE `aevo-512307.gns_analytics_mart.mart_partner_branch_daily`
PARTITION BY metric_date
CLUSTER BY partner_id, branch_id
OPTIONS (
  require_partition_filter = true,
  description = 'Gold daily KPI mart per (metric_date, partner_id, branch_id) combining OLTP financial truth with GA4 funnel behavior'
) AS
WITH date_spine AS (
  SELECT
    d AS metric_date,
    b.partner_id,
    b.branch_id
  FROM UNNEST(GENERATE_DATE_ARRAY(DATE '2026-10-08', DATE '2026-11-06')) AS d
  CROSS JOIN `aevo-512307.gns_sim_oltp.partner_branches` AS b
),
oltp_daily AS (
  SELECT
    session_date AS metric_date,
    partner_id,
    branch_id,
    COUNT(*) AS total_bids,
    COUNTIF(bid_mode = 'auto') AS auto_bids_count,
    COUNTIF(status = 'accepted') AS accepted_paid_bids,
    COUNTIF(status = 'expired') AS expired_bids,
    COUNTIF(status = 'rejected') AS rejected_bids,
    COUNTIF(status = 'cancelled') AS cancelled_bids,
    SUM(net_revenue_vnd) AS hotel_net_revenue_vnd,
    SUM(platform_fee_vnd) AS platform_fee_vnd,
    SUM(vat_amount_vnd) AS vat_amount_vnd,
    SUM(gross_gmv_vnd) AS gross_gmv_vnd,
    AVG(match_rate_pct) AS avg_match_rate_pct,
    AVG(saving_pct) AS avg_saving_pct,
    AVG(CAST(decision_duration_sec AS FLOAT64)) AS avg_decision_duration_sec
  FROM `aevo-512307.gns_sim_oltp.bid_offers_and_orders`
  GROUP BY 1, 2, 3
),
ga4_daily AS (
  SELECT
    event_date AS metric_date,
    partner_id,
    branch_id,
    COUNT(DISTINCT IF(event_name = 'booking_form_start', request_id, NULL)) AS step1_form_starts,
    COUNT(DISTINCT IF(event_name = 'booking_form_complete', request_id, NULL)) AS step2_requests_submitted,
    COUNT(DISTINCT IF(event_name = 'offer_card_impression' AND offer_id != '', offer_id, NULL)) AS step3_offers_impressed,
    COUNTIF(event_name = 'offer_browse_click') AS total_browse_clicks,
    COUNT(DISTINCT IF(event_name = 'offer_browse_click' AND offer_id != '', offer_id, NULL)) AS step4_unique_viewed_offers,
    COUNT(DISTINCT IF(event_name = 'explore_stay_media_click' AND offer_id != '', offer_id, NULL)) AS step5_media_engaged_offers,
    COUNT(DISTINCT IF(event_name = 'offer_select_click' AND offer_id != '', offer_id, NULL)) AS step6_unique_selected_offers,
    COUNT(DISTINCT IF(event_name = 'payment_checkout_open' AND offer_id != '', offer_id, NULL)) AS step7_checkout_opened_offers,
    COUNT(DISTINCT IF(event_name = 'payment_complete' AND offer_id != '', offer_id, NULL)) AS step8_paid_completed_offers,
    AVG(IF(event_name = 'explore_stay_modal_scroll', CAST(dwell_ms AS FLOAT64), NULL)) AS avg_description_dwell_ms
  FROM `aevo-512307.gns_analytics_mart.stg_ga4_behavior_events`
  WHERE event_date BETWEEN DATE '2026-10-08' AND DATE '2026-11-06'
  GROUP BY 1, 2, 3
)
SELECT
  s.metric_date,
  s.partner_id,
  s.branch_id,
  COALESCE(o.total_bids, 0) AS total_bids,
  COALESCE(o.auto_bids_count, 0) AS auto_bids_count,
  COALESCE(o.accepted_paid_bids, 0) AS accepted_paid_bids,
  COALESCE(o.expired_bids, 0) AS expired_bids,
  COALESCE(o.rejected_bids, 0) AS rejected_bids,
  COALESCE(o.cancelled_bids, 0) AS cancelled_bids,
  COALESCE(o.hotel_net_revenue_vnd, 0) AS hotel_net_revenue_vnd,
  COALESCE(o.platform_fee_vnd, 0) AS platform_fee_vnd,
  COALESCE(o.vat_amount_vnd, 0) AS vat_amount_vnd,
  COALESCE(o.gross_gmv_vnd, 0) AS gross_gmv_vnd,
  ROUND(COALESCE(o.avg_match_rate_pct, 0), 2) AS avg_match_rate_pct,
  ROUND(COALESCE(o.avg_saving_pct, 0), 2) AS avg_saving_pct,
  ROUND(COALESCE(o.avg_decision_duration_sec, 0), 1) AS avg_decision_duration_sec,
  COALESCE(g.step1_form_starts, 0) AS step1_form_starts,
  COALESCE(g.step2_requests_submitted, 0) AS step2_requests_submitted,
  COALESCE(g.step3_offers_impressed, 0) AS step3_offers_impressed,
  COALESCE(g.total_browse_clicks, 0) AS total_browse_clicks,
  COALESCE(g.step4_unique_viewed_offers, 0) AS step4_unique_viewed_offers,
  COALESCE(g.step5_media_engaged_offers, 0) AS step5_media_engaged_offers,
  COALESCE(g.step6_unique_selected_offers, 0) AS step6_unique_selected_offers,
  COALESCE(g.step7_checkout_opened_offers, 0) AS step7_checkout_opened_offers,
  COALESCE(g.step8_paid_completed_offers, 0) AS step8_paid_completed_offers,
  ROUND(COALESCE(g.avg_description_dwell_ms, 0), 0) AS avg_description_dwell_ms
FROM date_spine AS s
LEFT JOIN oltp_daily AS o
  ON s.metric_date = o.metric_date AND s.partner_id = o.partner_id AND s.branch_id = o.branch_id
LEFT JOIN ga4_daily AS g
  ON s.metric_date = g.metric_date AND s.partner_id = g.partner_id AND s.branch_id = g.branch_id;

-- 3. GOLD MART 2: Daily 5-Category Media Engagement & Device OS Conversion Breakdown
CREATE OR REPLACE TABLE `aevo-512307.gns_analytics_mart.mart_branch_media_and_devices`
PARTITION BY metric_date
CLUSTER BY partner_id, branch_id
OPTIONS (
  require_partition_filter = true,
  description = 'Gold daily media category clicks (image vs video) and device OS breakdown per branch'
) AS
SELECT
  event_date AS metric_date,
  partner_id,
  branch_id,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'property_views' AND media_type = 'image') AS grounds_image_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'property_views' AND media_type = 'video') AS grounds_video_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'facilities' AND media_type = 'image') AS facility_image_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'facilities' AND media_type = 'video') AS facility_video_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'dining' AND media_type = 'image') AS dining_image_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'dining' AND media_type = 'video') AS dining_video_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'rooms' AND media_type = 'image') AS room_image_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'rooms' AND media_type = 'video') AS room_video_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'nearby_attractions' AND media_type = 'image') AS nearby_image_clicks,
  COUNTIF(event_name = 'explore_stay_media_click' AND content_category = 'nearby_attractions' AND media_type = 'video') AS nearby_video_clicks,
  COUNT(DISTINCT IF(event_name = 'booking_form_complete' AND device_os = 'ios', request_id, NULL)) AS ios_requests,
  COUNT(DISTINCT IF(event_name = 'payment_complete' AND device_os = 'ios', offer_id, NULL)) AS ios_paid,
  COUNT(DISTINCT IF(event_name = 'booking_form_complete' AND device_os = 'android', request_id, NULL)) AS android_requests,
  COUNT(DISTINCT IF(event_name = 'payment_complete' AND device_os = 'android', offer_id, NULL)) AS android_paid,
  COUNT(DISTINCT IF(event_name = 'booking_form_complete' AND device_os = 'web', request_id, NULL)) AS web_requests,
  COUNT(DISTINCT IF(event_name = 'payment_complete' AND device_os = 'web', offer_id, NULL)) AS web_paid
FROM `aevo-512307.gns_analytics_mart.stg_ga4_behavior_events`
WHERE event_date BETWEEN DATE '2026-10-08' AND DATE '2026-11-06'
GROUP BY 1, 2, 3;

-- 4. GOLD MART 3: Branch AI Advisor Win vs Loss Diagnostic Snapshots
CREATE OR REPLACE TABLE `aevo-512307.gns_analytics_mart.mart_branch_ai_advisor_snapshots`
CLUSTER BY partner_id, branch_id
OPTIONS (
  description = 'Precomputed Why Won vs Why Lost AI diagnostics per branch across 30d window'
) AS
WITH unmatched_exploded AS (
  SELECT
    partner_id,
    branch_id,
    uk AS unmatched_key,
    COUNT(*) AS miss_count
  FROM `aevo-512307.gns_sim_oltp.bid_offers_and_orders`,
  UNNEST(unmatched_keys) AS uk
  WHERE status IN ('rejected', 'expired')
  GROUP BY 1, 2, 3
),
top_unmatched AS (
  SELECT
    partner_id,
    branch_id,
    ARRAY_AGG(STRUCT(unmatched_key, miss_count) ORDER BY miss_count DESC LIMIT 3) AS top_missing_criteria
  FROM unmatched_exploded
  GROUP BY 1, 2
),
branch_stats AS (
  SELECT
    partner_id,
    branch_id,
    COUNT(*) AS total_bids_30d,
    COUNTIF(status = 'accepted') AS won_bids_30d,
    COUNTIF(status = 'rejected') AS rejected_bids_30d,
    COUNTIF(status = 'expired') AS expired_bids_30d,
    ROUND(AVG(IF(status = 'accepted', saving_pct, NULL)), 1) AS avg_won_saving_pct,
    ROUND(AVG(IF(status = 'rejected', saving_pct, NULL)), 1) AS avg_rejected_saving_pct,
    ROUND(AVG(IF(status = 'accepted', match_rate_pct, NULL)), 1) AS avg_won_match_pct,
    ROUND(AVG(IF(status = 'rejected', match_rate_pct, NULL)), 1) AS avg_rejected_match_pct,
    ROUND(AVG(CAST(decision_duration_sec AS FLOAT64)), 0) AS avg_decision_sec
  FROM `aevo-512307.gns_sim_oltp.bid_offers_and_orders`
  GROUP BY 1, 2
)
SELECT
  bs.*,
  tu.top_missing_criteria
FROM branch_stats AS bs
LEFT JOIN top_unmatched AS tu
  ON bs.partner_id = tu.partner_id AND bs.branch_id = tu.branch_id;
