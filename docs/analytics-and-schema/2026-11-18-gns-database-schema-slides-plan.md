# [GNS] Database Schema Team Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 12-slide 16:9 presentation with Vietnamese Speaker Notes explaining `[GNS] Database Schema` to the entire goodNstay team and import it as a native Google Slides deck on `baominh.internship@gmail.com`.

**Architecture:** Extract and recompose the 4 UI screenshots from `/Users/iannwendy/Desktop/goodNstay/[GNS] Database Schema.xlsx` into balanced visual assets, define validated structured slide data enforcing `AGENTS.md` §8 business-prose hygiene, render a collision-free 16:9 `.pptx` via `python-pptx`, and convert it to native Google Slides via the `google-workspace` MCP server with visual PDF-to-PNG post-conversion verification.

**Tech Stack:** Python 3 (`uv run --with python-pptx --with pillow`), `unittest`, `pdftoppm`, `google-workspace` MCP (`import_to_google_slides`, `search_drive_files`).

**Spec:** `docs/superpowers/specs/2026-11-18-gns-database-schema-slides-design.md`

## Global Constraints

- Exact slide dimensions: `13.333 in × 7.5 in` (16:9 widescreen), exactly `12` slides, primary font `Arial` for 1:1 Google Slides metric fidelity.
- Exact sheet counts: `6` tabs total (`Sample` + 4 journey tabs `booking_form` [12], `offer_listing` [10], `explore_stays` [12], `payment_form` [11] = `45` events + `dashboard_overview` [`16` diagnostic groups]).
- Business-prose hygiene (`AGENTS.md` §8): Business explanation fields on Slides 8–11 (`formula_short`, `meaning_short`, `topic`, `question`, `when_won`, `when_lost`) must contain zero `snake_case` identifiers, zero SQL functions (`SUM`, `COUNT`, `DISTINCT`, `WHERE`, `ROUND`), and zero hardcoded mock names/amounts (`Stay Hotel H11`, `L'amour`, `Mỹ Khê`, `#69`, `#71`, `66.360.000`).
- Binary artifact git hygiene: `presentations/gns-database-schema/.gitignore` must ignore generated `assets/` and `*.pptx` so git commits contain pure Python source & tests while build/test tasks materialize the PNGs and `.pptx` on disk.
- Google Drive privacy: Import to `baominh.internship@gmail.com` via `import_to_google_slides`; do NOT set public (`anyone`) link sharing unless explicitly requested.

## Review Focus

- Vietnamese text wrapping overflow in Google Slides: multi-line Vietnamese copy wraps ~15% taller after conversion; foreground boxes must stay strictly within `[0, 13.333] × [0, 7.5]` inches, never overlap sibling foreground boxes, and pass conservative character-capacity checks per frame height.
- Ultra-wide screenshot illegibility: `explore_stays` (`image5.png`, `2681×544`) and `payment_form` (`image4.png`, `1574×564`) shrink to unreadable strips if placed raw in a half-slide column; recompose multi-panel strips into balanced `0.75..1.85` aspect-ratio composites.
- Image aspect-ratio stretching: `add_picture` calls specifying both width and height distort UI screenshots; compute scaled width/height preserving native aspect ratio within `< 1.5%` tolerance.
- Business-prose technical leakage on `dashboard_overview` slides: accidentally mixing `offer_card_impression` or `is_auto_bid` inside Vietnamese business prose instead of dedicated technical badge arrays.
- Non-native Drive upload: uploading `.pptx` without `import_to_google_slides` produces binary `application/vnd.openxmlformats-officedocument.presentationml.presentation` instead of editable `application/vnd.google-apps.presentation`.

---

### Task 1: UI Asset Extraction & Multi-Panel Composition

**Files:**
- Create: `presentations/gns-database-schema/.gitignore`
- Create: `presentations/gns-database-schema/prepare_assets.py`
- Create: `presentations/gns-database-schema/tests/__init__.py`
- Create: `presentations/gns-database-schema/tests/test_deck.py`

**Interfaces:**
- Consumes: `/Users/iannwendy/Desktop/goodNstay/[GNS] Database Schema.xlsx` (`xl/media/image1.png`, `image3.png`, `image4.png`, `image5.png`)
- Produces: `prepare_slide_assets(xlsx_path: Path, out_dir: Path) -> dict[str, Path]` returning keys `{"booking_form", "offer_listing", "explore_stays", "payment_form"}` pointing to crisp PNG files in `presentations/gns-database-schema/assets/`

- [ ] **Step 1: Write `presentations/gns-database-schema/.gitignore` and the failing asset tests in `presentations/gns-database-schema/tests/test_deck.py`**

Ignore `assets/`, `*.pptx`, and `__pycache__/` in `presentations/gns-database-schema/.gitignore`. Add empty `presentations/gns-database-schema/tests/__init__.py` and write:

```python
import unittest
from pathlib import Path
from PIL import Image
from prepare_assets import prepare_slide_assets

XLSX_PATH = Path("/Users/iannwendy/Desktop/goodNstay/[GNS] Database Schema.xlsx")
PKG_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = PKG_DIR / "assets"


class TestSlideAssets(unittest.TestCase):
    def test_assets_extracted_and_balanced_aspect_ratio(self):
        assets = prepare_slide_assets(XLSX_PATH, ASSETS_DIR)
        self.assertEqual(
            set(assets.keys()),
            {"booking_form", "offer_listing", "explore_stays", "payment_form"},
        )
        for key, path in assets.items():
            self.assertTrue(path.exists(), f"Missing {key}")
            with Image.open(path) as im:
                w, h = im.size
                ratio = w / h
                self.assertGreaterEqual(ratio, 0.75, f"{key} too tall: {ratio:.2f}")
                self.assertLessEqual(ratio, 1.85, f"{key} too wide for slide column: {ratio:.2f}")
                self.assertGreater(w, 900, f"{key} width too low-res: {w}")
                extrema = im.convert("L").getextrema()
                self.assertGreater(extrema[1] - extrema[0], 40, f"{key} appears blank")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pillow --with python-pptx python3 -m unittest discover -s presentations/gns-database-schema/tests -t presentations/gns-database-schema -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'prepare_assets'`

- [ ] **Step 3: Implement `prepare_slide_assets(xlsx_path: Path, out_dir: Path) -> dict[str, Path]` in `presentations/gns-database-schema/prepare_assets.py`**

Extract from `xlsx_path`:
- `booking_form` <- `xl/media/image3.png` (`1992×1870`, ratio `1.07`, saved directly)
- `offer_listing` <- `xl/media/image1.png` (`2048×1324`, ratio `1.55`, saved directly)
- `explore_stays` <- `xl/media/image5.png` (`2681×544`, 4 side-by-side panels): detect vertical white separator gutters (columns where mean luminance > 250 separating the 4 panels, falling back to equal quarters) and arrange the 4 panels in a clean 2×2 grid with 20px padding on `#F8FAFC` background (~`1370×1130`, ratio ~`1.21`).
- `payment_form` <- `xl/media/image4.png` (`1574×564`, 2 side-by-side checkout panels): detect the center white vertical separator gutter and stack the 2 panels vertically with 20px padding on `#F8FAFC` background (~`1180×1170` with horizontal padding so `0.95 <= w/h <= 1.35`, keeping `w > 900`).

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --with pillow --with python-pptx python3 -m unittest discover -s presentations/gns-database-schema/tests -t presentations/gns-database-schema -v`
Expected: PASS (`test_assets_extracted_and_balanced_aspect_ratio`)

- [ ] **Step 5: Commit**

```bash
git add presentations/gns-database-schema/.gitignore presentations/gns-database-schema/prepare_assets.py presentations/gns-database-schema/tests/__init__.py presentations/gns-database-schema/tests/test_deck.py
git commit -m "feat(slides): add UI screenshot asset extractor and multi-panel composer"
```

---

### Task 2: Structured Slide Content & Business-First Hygiene

**Files:**
- Create: `presentations/gns-database-schema/slides_content.py`
- Modify: `presentations/gns-database-schema/tests/test_deck.py`

**Interfaces:**
- Produces in `slides_content.py`:
  - `JOURNEY_STAGES: list[dict]` — 4 dicts with keys `{"tab", "step_badge", "title", "event_count", "asset_key", "join_keys", "sample_events", "highlights", "team_answer"}` where `event_count` values are `[12, 10, 12, 11]`.
  - `BACKBONE_KEYS: list[dict]` — 5 dicts with keys `{"key", "stage", "role"}` (`session_form_id`, `request_id`, `offer_id`, `property_id`, `checkout_session_id`, plus `view_session_id` noted in `explore_stays`).
  - `DIAGNOSTIC_GROUPS: list[dict]` — 16 dicts matching `dashboard_overview` rows 2–17 in order, each with keys `{"index", "title", "main_event", "formula_short", "meaning_short"}` (`index` `1..16`).
  - `AI_SHOWCASE_CASES: list[dict]` — 2 dicts with keys `{"topic", "tech_badge", "question", "when_won", "when_lost"}`.
  - `DISCUSSION_TOPICS: list[dict]` — 3 dicts with keys `{"role", "focus", "questions"}`.
  - `SPEAKER_NOTES: dict[int, str]` — Vietnamese presenter notes keyed `1..12`.

- [ ] **Step 1: Add content & business-hygiene tests to `presentations/gns-database-schema/tests/test_deck.py`**

```python
import re
from slides_content import (
    AI_SHOWCASE_CASES,
    BACKBONE_KEYS,
    DIAGNOSTIC_GROUPS,
    DISCUSSION_TOPICS,
    JOURNEY_STAGES,
    SPEAKER_NOTES,
)

SNAKE_RE = re.compile(r"\b[a-z]+_[a-z0-9_]+\b")
FORBIDDEN_TOKENS = (
    "SUM(",
    "COUNT(",
    "DISTINCT",
    "WHERE ",
    "ROUND(",
    "Stay Hotel H11",
    "L'amour",
    "Mỹ Khê",
    "#69",
    "#71",
    "66.360.000",
)


class TestSlidesContent(unittest.TestCase):
    def test_exact_sheet_counts_and_notes(self):
        self.assertEqual([s["tab"] for s in JOURNEY_STAGES], ["booking_form", "offer_listing", "explore_stays", "payment_form"])
        self.assertEqual([s["event_count"] for s in JOURNEY_STAGES], [12, 10, 12, 11])
        self.assertEqual(sum(s["event_count"] for s in JOURNEY_STAGES), 45)
        self.assertEqual(len(BACKBONE_KEYS), 5)
        self.assertEqual(len(DIAGNOSTIC_GROUPS), 16)
        self.assertEqual([g["index"] for g in DIAGNOSTIC_GROUPS], list(range(1, 17)))
        self.assertEqual(len(AI_SHOWCASE_CASES), 2)
        self.assertEqual(len(DISCUSSION_TOPICS), 3)
        self.assertEqual(set(SPEAKER_NOTES.keys()), set(range(1, 13)))
        for idx, note in SPEAKER_NOTES.items():
            self.assertGreater(len(note.strip()), 80, f"Slide {idx} speaker note too short")

    def test_business_prose_hygiene_rule_section_8(self):
        prose_texts = []
        for g in DIAGNOSTIC_GROUPS:
            prose_texts.extend([g["title"], g["formula_short"], g["meaning_short"]])
        for c in AI_SHOWCASE_CASES:
            prose_texts.extend([c["topic"], c["question"], c["when_won"], c["when_lost"]])
        for text in prose_texts:
            self.assertIsNone(SNAKE_RE.search(text), f"Leaked snake_case in business prose: {text}")
            for tok in FORBIDDEN_TOKENS:
                self.assertNotIn(tok, text, f"Forbidden token {tok} in: {text}")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pillow --with python-pptx python3 -m unittest discover -s presentations/gns-database-schema/tests -t presentations/gns-database-schema -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'slides_content'`

- [ ] **Step 3: Implement `presentations/gns-database-schema/slides_content.py`**

Populate accurate Vietnamese content grounded in the 6 tabs of `[GNS] Database Schema`:
- `JOURNEY_STAGES`:
  1. `booking_form` (`12` events, `asset_key="booking_form"`, `sample_events=["booking_form_view", "booking_stay_details_complete", "booking_form_complete", "booking_request_cancel"]`)
  2. `offer_listing` (`10` events, `asset_key="offer_listing"`, `sample_events=["offer_card_impression", "offer_card_ota_expand", "offer_browse_click", "offer_reject_confirm", "offer_ttl_expired"]`)
  3. `explore_stays` (`12` events, `asset_key="explore_stays"`, `sample_events=["explore_stay_modal_view", "explore_stay_ota_compare_click", "explore_stay_media_click", "explore_stay_map_interact", "explore_stay_review_inspect"]`)
  4. `payment_form` (`11` events, `asset_key="payment_form"`, `sample_events=["payment_form_view", "payment_fx_quote_result", "payment_session_interrupted", "payment_recovery_action", "payment_complete"]`)
- `DIAGNOSTIC_GROUPS`: All 16 rows of `dashboard_overview` (1. Sức khỏe thắng & trượt thầu; 2. Tốc độ báo giá tự động ngoài giờ; 3. Áp lực cạnh tranh khu vực; 4. Chênh lệch giá so với sàn khác; 5. Lý do từ chối & tiện ích thiếu; 6. Độ khớp tổ hợp phòng & đa lựa chọn; 7. Phục vụ theo nhóm khách & thú cưng; 8. Chính sách giá sát giờ & dài ngày; 9. Vị trí hiển thị thẻ & tỷ lệ bấm Xem; 10. Đường cong chú ý theo khung phút vàng; 11. Thư viện ảnh/video & mục trống tư liệu; 12. Cường độ cuộn đọc & dịch mô tả; 13. Tác động vị trí bản đồ thực tế; 14. Uy tín hạng sao & đánh giá; 15. Chốt chặn thu tiền & cứu đơn gián đoạn; 16. Trải nghiệm theo thiết bị người dùng), keeping concise formulas (`<= 75` chars) and concise meanings (`<= 95` chars) so 8 cards fit spaciously per 4×2 grid slide.
- `AI_SHOWCASE_CASES`: (1) Phản hồi tự động ngoài giờ hành chính (`is_auto_bid · elapsed_open_sec`); (2) Chốt chặn thanh toán ở vạch đích (`checkout_session_id · interruption_reason`).
- `SPEAKER_NOTES`: Natural 3–5 sentence presenter talk-track in Vietnamese for each of Slides 1–12 so the presenter can read/speak smoothly in front of the team.

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run --with pillow --with python-pptx python3 -m unittest discover -s presentations/gns-database-schema/tests -t presentations/gns-database-schema -v`
Expected: PASS (`TestSlideAssets` + `TestSlidesContent`)

- [ ] **Step 5: Commit**

```bash
git add presentations/gns-database-schema/slides_content.py presentations/gns-database-schema/tests/test_deck.py
git commit -m "feat(slides): add validated 12-slide content and speaker notes"
```

---

### Task 3: 16:9 `.pptx` Renderer & Geometry/Overflow Verification

**Files:**
- Create: `presentations/gns-database-schema/build_presentation.py`
- Modify: `presentations/gns-database-schema/tests/test_deck.py`

**Interfaces:**
- Consumes: `prepare_slide_assets`, `slides_content`
- Produces: `build_deck(output_path: Path, assets_dir: Path) -> Path` writing `presentations/gns-database-schema/GNS_Database_Schema_Team_Walkthrough.pptx` (and supporting CLI invocation `python3 presentations/gns-database-schema/build_presentation.py`)

- [ ] **Step 1: Add `.pptx` geometry, collision, aspect-ratio, and text-budget tests to `presentations/gns-database-schema/tests/test_deck.py`**

```python
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from build_presentation import build_deck

PPTX_OUT = PKG_DIR / "GNS_Database_Schema_Team_Walkthrough.pptx"
EMU_PER_INCH = 914400


class TestBuiltDeck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        prepare_slide_assets(XLSX_PATH, ASSETS_DIR)
        build_deck(PPTX_OUT, ASSETS_DIR)
        cls.prs = Presentation(str(PPTX_OUT))

    def test_slide_count_dimensions_and_notes(self):
        self.assertEqual(len(self.prs.slides), 12)
        self.assertAlmostEqual(self.prs.slide_width / EMU_PER_INCH, 13.333, places=2)
        self.assertAlmostEqual(self.prs.slide_height / EMU_PER_INCH, 7.50, places=2)
        for idx, slide in enumerate(self.prs.slides, 1):
            self.assertGreater(
                len(slide.notes_slide.notes_text_frame.text.strip()),
                80,
                f"Slide {idx} missing notes",
            )

    def test_bounds_and_image_aspect_preservation(self):
        pic_slides = []
        for idx, slide in enumerate(self.prs.slides, 1):
            for sh in slide.shapes:
                l, t = sh.left / EMU_PER_INCH, sh.top / EMU_PER_INCH
                r, b = (sh.left + sh.width) / EMU_PER_INCH, (sh.top + sh.height) / EMU_PER_INCH
                self.assertGreaterEqual(l, -0.02, f"Slide {idx} shape {sh.name} left out of bounds")
                self.assertGreaterEqual(t, -0.02, f"Slide {idx} shape {sh.name} top out of bounds")
                self.assertLessEqual(r, 13.36, f"Slide {idx} shape {sh.name} right out of bounds: {r:.2f}")
                self.assertLessEqual(b, 7.53, f"Slide {idx} shape {sh.name} bottom out of bounds: {b:.2f}")
                if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
                    pic_slides.append(idx)
                    iw, ih = sh.image.size
                    box_ratio = sh.width / sh.height
                    img_ratio = iw / ih
                    self.assertLess(abs(box_ratio - img_ratio) / img_ratio, 0.015, f"Slide {idx} image stretched")
        self.assertEqual(sorted(pic_slides), [4, 5, 6, 7])

    def test_no_text_box_collisions_and_text_fits_headroom(self):
        for idx, slide in enumerate(self.prs.slides, 1):
            text_boxes = []
            for sh in slide.shapes:
                if not sh.has_text_frame:
                    continue
                txt = sh.text_frame.text.strip()
                if not txt:
                    continue
                l, t = sh.left / EMU_PER_INCH, sh.top / EMU_PER_INCH
                r, b = (sh.left + sh.width) / EMU_PER_INCH, (sh.top + sh.height) / EMU_PER_INCH
                text_boxes.append((sh.name, l, t, r, b))

                w_pt = (sh.width / EMU_PER_INCH) * 72
                h_pt = (sh.height / EMU_PER_INCH) * 72
                sizes = [run.font.size.pt for p in sh.text_frame.paragraphs for run in p.runs if run.font.size]
                max_pt = max(sizes) if sizes else 12.0
                chars_per_line = max(8.0, (w_pt - 14.0) / (max_pt * 0.55))
                est_lines = sum(max(1, int((len(line) / chars_per_line) + 0.999)) for line in txt.splitlines())
                req_h_pt = est_lines * max_pt * 1.32
                self.assertLessEqual(
                    req_h_pt,
                    h_pt * 1.0,
                    f"Slide {idx} shape '{sh.name}' text overflow ({req_h_pt:.0f}pt > {h_pt:.0f}pt): {txt[:50]}",
                )

            for i in range(len(text_boxes)):
                n1, l1, t1, r1, b1 = text_boxes[i]
                for j in range(i + 1, len(text_boxes)):
                    n2, l2, t2, r2, b2 = text_boxes[j]
                    ox = max(0.0, min(r1, r2) - max(l1, l2))
                    oy = max(0.0, min(b1, b2) - max(t1, t2))
                    self.assertLess(
                        ox * oy,
                        0.02,
                        f"Slide {idx} text overlap between '{n1}' and '{n2}' ({ox:.2f}x{oy:.2f} in)",
                    )
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run --with pillow --with python-pptx python3 -m unittest discover -s presentations/gns-database-schema/tests -t presentations/gns-database-schema -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'build_presentation'`

- [ ] **Step 3: Implement `build_deck(output_path: Path, assets_dir: Path) -> Path` in `presentations/gns-database-schema/build_presentation.py`**

Build all 12 slides (`13.333 in × 7.5 in`, blank layout, `Arial`) with crisp executive design:
- Separate background card shapes (empty text frame) from foreground text boxes so text padding and collision detection remain exact.
- Palette: Slide bg `#F8FAFC` (Slide 1 cover `#0F172A` Deep Navy hero), card surface `#FFFFFF` with `#CBD5E1` 1pt border, primary navy `#1E3A8A`, royal blue `#2563EB`, amber `#D97706`, won emerald `#059669` (soft `#ECFDF5`), lost coral `#DC2626` (soft `#FEF2F2`), body slate `#334155`, muted `#64748B`.
- Slides 1–12 matching `docs/superpowers/specs/2026-11-18-gns-database-schema-slides-design.md` §5, fitting UI screenshots inside left showcase cards (`x=0.5..6.35 in, y=1.35..6.45 in`) via aspect-preserving scale, bottom join-key bar (`y=6.62..7.22 in`), and populating `slide.notes_slide.notes_text_frame.text = SPEAKER_NOTES[idx]`.

- [ ] **Step 4: Run full test suite and CLI build to verify 100% pass**

Run: `uv run --with pillow --with python-pptx python3 -m unittest discover -s presentations/gns-database-schema/tests -t presentations/gns-database-schema -v && uv run --with pillow --with python-pptx python3 presentations/gns-database-schema/build_presentation.py`
Expected: PASS (all tests pass with 0 warnings/errors and `GNS_Database_Schema_Team_Walkthrough.pptx` written)

- [ ] **Step 5: Commit**

```bash
git add presentations/gns-database-schema/build_presentation.py presentations/gns-database-schema/tests/test_deck.py
git commit -m "feat(slides): add 12-slide 16:9 pptx builder and geometry tests"
```

---

### Task 4: Native Google Slides Import & Post-Conversion Visual Verification

**Files:**
- Modify (only if post-conversion visual inspection reveals tight wrapping): `presentations/gns-database-schema/build_presentation.py`

**Interfaces:**
- Consumes: `presentations/gns-database-schema/GNS_Database_Schema_Team_Walkthrough.pptx`
- Produces: Native Google Slides presentation on `baominh.internship@gmail.com` (`https://docs.google.com/presentation/d/<file_id>/edit`) and a local mirror copy at `/Users/iannwendy/Desktop/goodNstay/docs/presentations/gns-database-schema/GNS_Database_Schema_Team_Walkthrough.pptx`

- [ ] **Step 1: Import `.pptx` to native Google Slides via `google-workspace` MCP**

Call `import_to_google_slides` (`user_google_email="baominh.internship@gmail.com"`, `file_name="[GNS] Database Schema — Thuyết trình Nhóm.pptx"`, `file_path="<worktree>/presentations/gns-database-schema/GNS_Database_Schema_Team_Walkthrough.pptx"`).
Expected: Returns Google Slides `file_id` and `https://docs.google.com/presentation/d/<file_id>/edit`.

- [ ] **Step 2: Verify native MIME type & inspect converted slide visuals**

Verify via `search_drive_files` that `mimeType == "application/vnd.google-apps.presentation"`, inspect converted slide visuals (via Drive PDF export + `pdftoppm` or Playwright snapshot on Google Slides preview if needed) to confirm zero text truncation or overlap across all 12 slides, and copy the final `.pptx` to `/Users/iannwendy/Desktop/goodNstay/docs/presentations/gns-database-schema/GNS_Database_Schema_Team_Walkthrough.pptx`.
