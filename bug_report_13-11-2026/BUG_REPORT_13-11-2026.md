# QA UX / UI / Responsive Bug Report — `web.stag.goodnstay.com/en-US/home` (13/11/2026)

- **Target Environment**: Staging (`https://web.stag.goodnstay.com/en-US/home`)
- **Audit Scope**: Multi-Viewport UX / UI / Responsive Inspection (`1920×1080`, `1440×900`, `1366×768`, `1280×800`, `1024×768`, `820×1180`, `768×1024`, `430×932`, `390×844`, `375×667`, `360×800`, `320×568`)
- **Jira Scrum Board**: [Internship Program 2026 — Board `#135`](https://optibide-org.atlassian.net/jira/software/c/projects/OP/boards/135/backlog)
- **Excel Tracking File**: [`gns_Bug_Report_Tracking (1).xlsx`](../gns_Bug_Report_Tracking%20(1).xlsx) (`Rows 60–66`, `BUG-046` – `BUG-052`)

---

## Summary Matrix

| Excel Row | Bug ID | Jira Ticket | Type | Severity / Priority | Summary | Evidence Screenshots |
| :---: | :---: | :---: | :---: | :---: | --- | --- |
| **60** | `BUG-046` | [**OP-1781**](https://optibide-org.atlassian.net/browse/OP-1781) | `RESPONSIVE` | `CRITICAL` (`S1` / `P0`) | **`[Global Home - Header & Navigation Drawer]`** `"Log in"` action disappears on all viewports `<= 1439px` (Laptop, Tablet & Mobile) with `222×48px` blank dead space in Mobile Header & no Drawer fallback | `bug46a_missing_login_laptop_1280x800.png`, `bug46b_missing_login_mobile_deadspace_390x844.png` |
| **61** | `BUG-047` | [**OP-1782**](https://optibide-org.atlassian.net/browse/OP-1782) | `RESPONSIVE` | `HIGH` (`S2` / `P1`) | **`[Global Home - Mobile Navigation Drawer]`** Hamburger Drawer overflows off left viewport edge (`-10px` to `-25px` on `<= 399px` viewports), clipping left border & inner action buttons | `bug47a_mobile_drawer_left_overflow_touch_375x667.png`, `bug47b_mobile_drawer_buttons_clipped_390x844.png` |
| **62** | `BUG-048` | [**OP-1783**](https://optibide-org.atlassian.net/browse/OP-1783) | `UI/UX (FE)` | `HIGH` (`S2` / `P1`) | **`[Global Home - Hero Travelers Popover]`** Travelers dialog hardcodes `left: 16px` detached from trigger (`311px` offset on `1920px`) & clamps height hiding `Cancel / OK` behind inner scrollbar | `bug48a_travelers_popover_detached_left16_1920x1080.png`, `bug48b_travelers_popover_clamped_scroll_768x1024.png` |
| **63** | `BUG-049` | [**OP-1784**](https://optibide-org.atlassian.net/browse/OP-1784) | `UI/UX (FE)` | `MEDIUM` (`S3` / `P2`) | **`[Global Home - Hero Property Type Popover]`** Property portal clips `"Clear / Done"` footer buttons on `1440×860–900` Desktop viewports due to `overflow: hidden` & late upward-flip threshold | `bug49_property_portal_clips_footer_1440x900.png` |
| **64** | `BUG-050` | [**OP-1785**](https://optibide-org.atlassian.net/browse/OP-1785) | `RESPONSIVE` | `HIGH` (`S2` / `P1`) | **`[Global Home - Destination Carousel Responsive]`** Featured card locked at `620×316px` overflows Mobile/Tablet carousel (`358×280px`), clipping top `36px` & slicing `"Rome"` down to `"e"` / `"me"` | `bug50a_dest_featured_card_clipped_390x844.png`, `bug50b_dest_featured_card_clipped_375x667.png` |
| **65** | `BUG-051` | [**OP-1786**](https://optibide-org.atlassian.net/browse/OP-1786) | `RESPONSIVE` | `MEDIUM` (`S3` / `P2`) | **`[Global Home - Partner Network Responsive]`** Editorial banner photo (`.gns-home-partners-photo`) locked at `563×237px` on `758px–1439px` viewports, leaving up to `669px` (`54%`) blank gap | `bug51_partners_editorial_photo_563px_gap_1280x800.png` |
| **66** | `BUG-052` | [**OP-1787**](https://optibide-org.atlassian.net/browse/OP-1787) | `FUNCTIONAL` | `HIGH` (`S2` / `P1`) | **`[Accommodation - Location Picker (Korea)]`** Submitting bid request fails with `HTTP 400 INVALID_DISTRICT_CODE` / `INVALID_CITY_CODE` due to `LocationPicker` shifting Korean `ward` (`읍·면·동`) into `stayingDistrict` & `district` (`구`) into `stayingCity` | `bug52a_kr_invalid_district_code_gapyeong_1440x900.png`, `bug52b_kr_invalid_city_code_seoul_gangnam_1440x900.png` |

---

## Verification Checklist
- **Anti-Duplicate Cross-Check**: Excluded all previously reported issues (`BUG-001`..`BUG-051` in Excel & `OP-1663`..`OP-1671`, `OP-1748`..`OP-1786` on Jira).
- **Jira Board `#135` Live Verification**: `7/7` issues verified `on_board_135 = True`, `assignee = Nguyen Bao Minh`, `12/12` `.png` screenshots uploaded & inline-embedded (`mediaSingle`), and `0` missing custom fields across all 12 `OP` structured fields (`Reporting`, `Expectation`, `RCA`).
- **Excel Integrity Verification**: `gns_Bug_Report_Tracking (1).xlsx` passed ZIP CRC + OpenXML schema parsing, `Table1` expanded cleanly to `A10:T66`, all dropdown columns (`Type`, `Severity`, `Environment = STAG`, `QA Stage = NEW`, `Retest Result = NOT RUN`) validated, and clickable hyperlinks bound on columns `L` & `N`.
