# CTO 45-Min Visual Presentation & AI Dashboard Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task, followed by an adversarial visual & editorial critique wave.

**Goal:** Build an interactive standalone HTML AI Dashboard prototype (`ai-dashboard-proposal.html`) integrated into the `Optibide Partner Hub` shell and a human-crafted, minimal-text, visual-first 22-slide `.pptx` deck (`CTO_AI_Dashboard_And_Bidding_Analytics_45min.pptx`) for a 45-minute CTO alignment session.

**Architecture:**
1. Standalone offline-safe HTML/CSS/SVG+JS dashboard (`presentations/cto-deck-v2/dashboard/ai-dashboard-proposal.html`) answering CTO's 3 Big Questions with interactive charts, Property A (`91` bids) / Property B (`75` bids) scenarios, `Tiếng Việt ⇄ English`, and `CTO Data Lineage Mode`.
2. Playwright `@2x` Retina visual pipeline (`presentations/cto-deck-v2/generate_visuals.mjs`) rendering precision-annotated UI screenshots (spotlight dimming + crisp callout frames `① ② ③`), live Google Sheet table zoom-ins, bespoke Swiss-editorial diagrams, and live HTML dashboard crops.
3. Editorial Swiss-grid `.pptx` builder (`presentations/cto-deck-v2/build_cto_deck.py` + `slides_spec.py`) producing 22 slides (`13.333 × 7.5 in`) with `<= 45` body words per content slide, zero nested rounded-rectangle AI slop, full 45-minute Vietnamese Speaker Notes, and 1:1 visual slide previews (`preview_slides/slide-01..22.png`) audited by an independent Adversarial Design & CTO Critic subagent.

**Tech Stack:** HTML5/CSS3/SVG Vanilla JS, Node.js + local Playwright 1.65.0 (`NODE_PATH=/Users/iannwendy/Desktop/goodNstay/dashboard/dashboard/node_modules`), Python 3 (`uv run --with python-pptx --with pillow`), `unittest`.

**Spec:** `docs/superpowers/specs/2026-11-19-cto-ai-dashboard-and-45min-slides-design.md`

## Global Constraints

- **Anti-AI-Slop Visual Rules (Strict):**
  - NEVER draw nested pastel `ROUNDED_RECTANGLE` cards inside cards ("box-ception").
  - NEVER put `[ CATEGORY PILL ]` bordered rectangles at the top of slides or full-width colored top stripes on content slides.
  - Use clean Swiss editorial layout: `#FFFFFF` canvas on content slides (`#0B0F19` carbon only on Slide 1 Cover & 3 Section Dividers), plain tracked uppercase section kicker (`9.5pt` `#64748B`), bold 1-line Action Title (`22–24pt` `#0F172A`) stating the exact insight, `70%+` slide area dedicated to high-DPI annotated visuals, and `2–3` crisp numbered side-rail callouts separated by `0.5pt` `#E2E8F0` hairlines.
  - Strict body-copy ceiling: `<= 45` words of native body text per content slide (excluding Action Title & visual image labels), while keeping every Action Title + callout self-explanatory in 5 seconds.
- **Exact Data Reconciliation:**
  - Google Sheet `[GNS] Database Schema`: `6` tabs, `45` events (`12 + 10 + 12 + 11`), `66` `dashboard_overview` rows (`R2..R67`) partitioned cleanly into `14` Core Chart rows + `38` Silent AI Advisor rows (`= 52` Partner rows: `22` Winning Price + `30` Why Lost) + `14` Internal GNS Ops rows (`= 66`).
  - Scenario A (`Cơ sở lưu trú A · Đang hoạt động`): `91` bids = `17` Won (`18,7%`) + `74` Not Won (`9` khuất màn hình/quá hạn chưa xem + `24` gạt ngay ngoài thẻ + `14` thua khi đối chiếu giá sàn ngoài + `19` thoát sau khi mở xem chi tiết + `8` đã bấm Chọn nhưng rớt bước thanh toán).
  - Scenario B (`Cơ sở lưu trú B · Cơ sở mới`): `75` bids = `0` Won (`0,0%`) + `75` Not Won (`18` điểm hiển thị 800 khuất sâu + `12` gạt ngoài thẻ + `8` so giá sàn ngoài + `35` thoát chi tiết do `0` đánh giá & tab Video trống + `2` rớt thanh toán).
- **Business-First Hygiene (`AGENTS.md` §8):** Zero `snake_case` keys, SQL keywords (`SUM`, `COUNT`, `DISTINCT`, `WHERE`, `ROUND`), or hardcoded real/mock hotel names (`Stay Hotel H11`, `L'amour`, `Mỹ Khê`, `#69`, `#71`, `66.360.000`) in default Partner view or slide business copy (`snake_case` allowed only inside dedicated technical sheet/lineage tags).
- **Deliverable Locations:** Sync final `.pptx` and `ai-dashboard-proposal.html` to `/Users/iannwendy/Desktop/goodNstay/docs/presentations/cto-ai-dashboard-proposal/`.

---

### Task 1: Standalone Interactive HTML AI Dashboard Prototype (`ai-dashboard-proposal.html`)

**Files:**
- Create: `presentations/cto-deck-v2/.gitignore`
- Create: `presentations/cto-deck-v2/dashboard/ai-dashboard-proposal.html`
- Create: `presentations/cto-deck-v2/tests/verify_dashboard.mjs`

**Interfaces:**
- Produces: Self-contained `presentations/cto-deck-v2/dashboard/ai-dashboard-proposal.html` with deterministic DOM `data-capture="<region>"` attributes (`full-hub`, `winning-price-section`, `loss-diagnosis-section`, `ai-advisor-section`) so Task 2 can screenshot exact crisp regions via Playwright.

- [ ] **Step 1: Write `presentations/cto-deck-v2/.gitignore` and Playwright verification script `presentations/cto-deck-v2/tests/verify_dashboard.mjs`**
  - Ignore `assets/`, `preview_slides/`, `*.pptx`, `__pycache__/`.
  - Verify via Playwright (`1440×900` and `1280×800`): 0 console/page errors, `scrollWidth <= innerWidth`, default `Tiếng Việt` has zero `snake_case` in visible text, Scenario A reconciles `91 = 17 + 74` (`9+24+14+19+8`), Scenario B switches cleanly to `75` bids / `0` won, `English` toggle works, Quick-Ask AI chips update the answer panel, and `CTO Data Lineage Mode` reveals `R52`, `R37`, `R40`, `R62` lineage badges.
- [ ] **Step 2: Run verification to confirm RED failure (missing HTML)**
- [ ] **Step 3: Implement `presentations/cto-deck-v2/dashboard/ai-dashboard-proposal.html`**
  - Faithful `Optibide Partner Hub` shell (`#F8F9FB` canvas, crisp `#FFFFFF` cards, subtle `1px solid #E5E7EB` borders, clean Inter/system-ui typography) upgrading the middle analytics zone with:
    1. **5 KPI Cards** + **Dual-Axis Revenue & Completed Bookings SVG Chart**
    2. **Block 1 — Phân tích Giá Trúng Thầu (Câu hỏi lớn 1):**
       - *Chart A (Combo Bar + Smooth Line + Shaded Sweet-Spot Band `10–15%`):* Dải Giá Trúng Thầu theo Mức Tiết Kiệm so với Sàn Ngoài (`<0%`, `0–5%`, `5–10%`, `10–15% ★ Đỉnh 46,2%`, `>15%`).
       - *Chart B (Horizontal Grouped Bars):* Tỷ lệ Thắng theo 4 Ngữ cảnh (Đặt sát giờ `0–1 ngày` vs Đặt sớm · Lưu trú `≥3 đêm` vs ngắn ngày · Báo giá tự động vs Thủ công · Đính kèm `≥2 phương án phòng` vs `1 phòng`).
    3. **Block 2 — Giải phẫu Lý do Không Trúng Thầu (Câu hỏi lớn 2):**
       - *Chart C (5-Stage Horizontal Loss Waterfall Bar):* Phân rã 100% đơn không trúng qua 5 tầng hành vi, nổi bật nhãn bảo vệ: *"8 đơn (10,8%) khách ĐÃ bấm Chọn nhưng rớt bước Thanh toán — Không giảm giá oan!"*
       - *Chart D (Dual Horizontal Pareto Breakdown):* Cột trái: Top tiện ích khuyết bị khách bấm Từ chối; Cột phải: Top lý do khách thoát sau khi mở Cửa sổ chi tiết (Mục Video/Ảnh trống · Xem Bản đồ thoát ngay · Chưa đủ đánh giá).
    4. **Block 3 — Trợ lý AI Chẩn đoán theo Ngưỡng (`<30% · 30–70% · >70%`) & Hỏi đáp Nhanh (Câu hỏi lớn 3):**
       - 3–4 prioritized AI Diagnostic Cards with visual 3-zone threshold gauge (`<30%` / `30–70%` / `>70%`), concrete business action, plus interactive Quick-Ask chips.
    5. **Bottom Compact Row:** *Đánh giá & Điểm ưu tiên hiển thị (`1.680` cho Cơ sở A / `800` cho Cơ sở B)* + *Đơn đặt phòng gần đây*.
- [ ] **Step 4: Run `NODE_PATH=/Users/iannwendy/Desktop/goodNstay/dashboard/dashboard/node_modules node presentations/cto-deck-v2/tests/verify_dashboard.mjs` to confirm GREEN**
- [ ] **Step 5: Commit Task 1**

---

### Task 2: Retina Annotated Screenshots, Sheet Zoom-Ins & Bespoke Editorial Diagrams (`generate_visuals.mjs`)

**Files:**
- Create: `presentations/cto-deck-v2/generate_visuals.mjs`
- Modify: `presentations/cto-deck-v2/tests/verify_dashboard.mjs` (or `presentations/cto-deck-v2/tests/test_cto_deck.py`)

**Interfaces:**
- Consumes:
  - `/Users/iannwendy/Desktop/goodNstay/dashboard/demo_new/1.png` & `2.png`
  - `/Users/iannwendy/Desktop/goodNstay/[GNS] Database Schema.xlsx` (`image1,3,4,5.png` + real sheet rows)
  - `presentations/cto-deck-v2/dashboard/ai-dashboard-proposal.html`
- Produces 19 crisp `@2x` PNG plates (`>= 1600px` wide) in `presentations/cto-deck-v2/assets/`:
  1. `s02_roadmap.png` — Clean 4-part 45-min visual agenda timeline + 3 CTO sign-off goals
  2. `s03_opening_active.png` — Cropped & spotlight-annotated `2.png` circling ① `Accept% 18.7%`, ② `Rejected 80.0%`, ③ generic `goodNstay AI Advisor`
  3. `s04_opening_coldstart.png` — Cropped & spotlight-annotated `1.png` circling ① `0 ₩ / 75 Bids`, ② `67 Rejected / 8 Expired`, ③ `ELO 800 · ★0.0`
  4. `s05_three_questions.png` — Editorial architectural diagram of the 3 Big Questions
  5. `s06_solution_architecture.png` — End-to-end visual pipeline: `4 Traveler Screens` → `Sheet (45 Events · 66 Formulas)` → `3-Tier Filter` → `Partner AI Hub`
  6. `s07_ev_booking_form.png` — Annotated `booking_form` UI screenshot circling ① Khu vực, ② Ngày & Đoàn khách, ③ Hạng phòng & Tiện ích bắt buộc
  7. `s08_ev_offer_listing.png` — Annotated `offer_listing` UI screenshot circling ① Thứ hạng & Tỷ lệ khớp `90%`, ② So giá bên A/B, ③ Đổi gói phòng `<1/2>`, ④ Hết hạn / Từ chối
  8. `s09_ev_explore_stays.png` — Annotated `explore_stays` 2×2 UI composite circling ① Bảng `SO SÁNH GIÁ` 4 sàn, ② Tab `Video (0)` & `Điểm tham quan (0)` trống, ③ `Mở trên bản đồ`, ④ `Chưa có đánh giá`
  9. `s10_ev_payment_form.png` — Annotated `payment_form` UI screenshot circling ① Quy đổi ngoại tệ, ② Cổng `NHN KCP / PayPal`, ③ Khung thông tin khách lưu trú
  10. `s11_sheet_events_backbone.png` — High-res visual of real Google Sheet 9-column event table (`Cột 1–3` + `Cột 4–9` circled) + 5 foreign-key chain (`session_form_id` → `request_id` → `offer_id` / `property_id` → `checkout_session_id`)
  11. `s12_sheet_overview_66rows.png` — High-res visual of real `dashboard_overview` table rows circling `Calculation` + 5-step `AI Assistance` (`Câu hỏi` → `Công thức AI` → `<30%` · `30–70%` · `>70%`)
  12. `s13_q1_winning_price_map.png` — Visual taxonomy of **5 Winning-Price Angles (22 questions)** with `[Chart]` vs `[AI Ngầm]` tags
  13. `s14_q2_why_lost_layers.png` — Visual comparison: Old blind `Rejected 80%` bar vs. **5 Behavioral Loss Layers (30 questions)**
  14. `s15_q3_66_to_charts_funnel.png` — Proportional **66 → 14 Chart / 38 Silent AI / 14 Internal Ops** selection funnel + 3 filtering criteria
  15. `s16_chart_selection_matrix.png` — Visual Chart Matrix showing miniature previews of the 4 new chart types & why each fits its analytical question
  16. `s17_demo_full_hub.png` — Full-frame annotated screenshot of `ai-dashboard-proposal.html` inside `Optibide Partner Hub`
  17. `s18_demo_winning_price.png` — Zoomed annotated capture of `[data-capture="winning-price-section"]` highlighting the `10–15%` Sweet Spot & Context uplift bars
  18. `s19_demo_loss_diagnosis.png` — Zoomed annotated capture of `[data-capture="loss-diagnosis-section"]` highlighting the 5-Stage Waterfall (`8 đơn rớt thanh toán`) & Missing Amenities / Empty Gallery Pareto
  19. `s20_demo_ai_advisor.png` — Side-by-side capture of `[data-capture="ai-advisor-section"]` comparing *Cơ sở A (Đang hoạt động, bật CTO Lineage)* vs *Cơ sở B (Cơ sở mới 0 đánh giá)*
  20. `s21_before_after.png` — Side-by-side visual comparison of `2.png` (Before: blind generic AI) vs `ai-dashboard-proposal.html` (After: behavioral X-ray & Sweet Spot)

- [ ] **Step 1: Write asset verification tests checking all 20 PNGs exist, `width >= 1500`, aspect ratio `1.25..2.15`, non-blank variance**
- [ ] **Step 2: Implement `presentations/cto-deck-v2/generate_visuals.mjs` using Playwright HTML/SVG/CSS compositing over exact pixel coordinates**
- [ ] **Step 3: Run generator + asset tests to confirm GREEN**
- [ ] **Step 4: Commit Task 2**

---

### Task 3: Minimal-Text Editorial 22-Slide `.pptx` Builder & 1:1 Slide Preview Renderer

**Files:**
- Create: `presentations/cto-deck-v2/slides_spec.py`
- Create: `presentations/cto-deck-v2/build_cto_deck.py`
- Create: `presentations/cto-deck-v2/render_previews.mjs`
- Create: `presentations/cto-deck-v2/tests/test_cto_deck.py`

**Interfaces:**
- Produces:
  - `presentations/cto-deck-v2/CTO_AI_Dashboard_And_Bidding_Analytics_45min.pptx` (`22` slides, `13.333 × 7.5 in`)
  - `presentations/cto-deck-v2/preview_slides/slide-01.png` .. `slide-22.png` (exact `1920×1080` visual renders of the `.pptx` slides for adversarial visual critique)

- [ ] **Step 1: Write unit & editorial-discipline tests in `presentations/cto-deck-v2/tests/test_cto_deck.py`**
  - Assert `22` slides, `13.333 × 7.5 in`, `shadow.inherit is False` on every shape.
  - **Anti-AI-Slop Assertions:**
    - Assert ZERO `ROUNDED_RECTANGLE` shapes on content Slides `2..21` (only crisp hairlines `RECTANGLE` `height <= 0.03 in` or `width <= 0.04 in`, native `PICTURE`, and clean `TEXT_BOX` — eliminating boxy AI card-ception structurally!).
    - Assert native body word count (excluding Action Title & small footer/kicker) on every content slide `2..21` is **`<= 48` words** and **`>= 12` words** (scannable in 5 seconds, never empty buzzwords, never walls of text!).
    - Assert zero text-box overlap (`< 0.01 sq in`), `>= 22%` vertical headroom on every text box, all 22 Speaker Notes present with minute pacing summing to `45` minutes, and `AGENTS.md` §8 business-prose hygiene.
- [ ] **Step 2: Run RED test**
- [ ] **Step 3: Implement `slides_spec.py`, `build_cto_deck.py`, and `render_previews.mjs` (which reads the actual `.pptx` XML shapes/images/positions and renders 1:1 `1920×1080` PNGs via Playwright)**
- [ ] **Step 4: Run `unittest` (`-W error`) + preview renderer to confirm GREEN**
- [ ] **Step 5: Commit Task 3**

---

### Task 4: Adversarial Design & CTO Critique Loop ("Tự Review & Tự Phản Biện") + Final Sync

**Files:**
- Modify (based on adversarial critique): `presentations/cto-deck-v2/*`
- Output sync: `/Users/iannwendy/Desktop/goodNstay/docs/presentations/cto-ai-dashboard-proposal/`

- [ ] **Step 1: Dispatch independent Adversarial Design & CTO Critic Subagent (`research`, `inherit`)**
  - Inspects `ai-dashboard-proposal.html` captures AND all 22 slide previews (`slide-01.png`..`slide-22.png`) via `read_file` against 4 strict gates: (1) Zero "AI-generated slide" tells, (2) Instant 5-second comprehension with minimal words, (3) Millimeter-accurate callout highlights `① ② ③`, (4) Complete & convincing answers to CTO's 3 Big Questions.
- [ ] **Step 2: Dispatch Refinement Implementer Subagent (`self`, `inherit`) to fix every issue flagged by the Critic, re-run tests & re-render previews**
- [ ] **Step 3: Run independent Re-Review verification & copy final `CTO_AI_Dashboard_And_Bidding_Analytics_45min.pptx` + `ai-dashboard-proposal.html` to `/Users/iannwendy/Desktop/goodNstay/docs/presentations/cto-ai-dashboard-proposal/`**
