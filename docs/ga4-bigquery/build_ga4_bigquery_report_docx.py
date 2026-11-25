#!/usr/bin/env python3
"""
Living Document Generator: goodNstay GA4 & BigQuery Comprehensive Technical & Executive Report (.docx)

Generates:
  docs/ga4-bigquery/goodNstay_GA4_BigQuery_Bao_Cao_Tong_Hop_Va_Lo_Trinh.docx

How to update in future iterations:
  1. Append a new entry to REVISION_HISTORY and PHASE_TIMELINE below.
  2. Update metrics/tables/roadmap rows as Staging or Production milestones land.
  3. Re-run: python3 docs/ga4-bigquery/build_ga4_bigquery_report_docx.py
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from docx.shared import Cm, Inches, Pt, RGBColor

REPO_ROOT = Path(__file__).resolve().parents[2]
DOCS_DIR = Path(__file__).resolve().parent
OUTPUT_DOCX = DOCS_DIR / "goodNstay_GA4_BigQuery_Bao_Cao_Tong_Hop_Va_Lo_Trinh.docx"
CHART_TMP_DIR = Path(
    "/Users/iannwendy/.gemini/antigravity/brain/1456efda-0d8c-4647-a261-3c36ec7d8d81/scratch/docx_charts"
)

# Brand Palette
HEX_NAVY = "1E3A8A"
HEX_INDIGO = "4F46E5"
HEX_SKY = "0284C7"
HEX_EMERALD = "047857"
HEX_AMBER = "B45309"
HEX_SLATE = "1E293B"
HEX_MUTED = "475569"
HEX_BORDER = "CBD5E1"
HEX_ZEBRA = "F8FAFC"
HEX_INDIGO_BG = "EEF2FF"
HEX_EMERALD_BG = "ECFDF5"
HEX_AMBER_BG = "FFFBEB"

RGB_NAVY = RGBColor(0x1E, 0x3A, 0x8A)
RGB_INDIGO = RGBColor(0x4F, 0x46, 0xE5)
RGB_EMERALD = RGBColor(0x04, 0x78, 0x57)
RGB_AMBER = RGBColor(0xB4, 0x53, 0x09)
RGB_SLATE = RGBColor(0x1E, 0x29, 0x3B)
RGB_MUTED = RGBColor(0x47, 0x55, 0x69)
RGB_WHITE = RGBColor(0xFF, 0xFF, 0xFF)


# ==============================================================================
# 1. HIGH-DPI EXECUTIVE DIAGRAMS (300 DPI, VIETNAMESE-SAFE ARIAL)
# ==============================================================================
def setup_mpl() -> None:
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans"]
    plt.rcParams["axes.unicode_minus"] = False


def render_fig1_architecture(out_path: Path) -> None:
    """End-to-End 4-Tier Architecture: GA4 -> BigQuery Warehouse -> BFF (:4000) -> Partner Hub (:5182)."""
    setup_mpl()
    fig, ax = plt.subplots(figsize=(12.6, 5.6), dpi=300)
    ax.set_xlim(0, 108)
    ax.set_ylim(0, 56)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    # Title band
    ax.text(
        54,
        53.2,
        "KIẾN TRÚC 4 TẦNG TÍCH HỢP GA4 + BIGQUERY + MULTI-TENANT BFF (PHƯƠNG ÁN B)",
        ha="center",
        va="center",
        fontsize=12.8,
        fontweight="bold",
        color="#1E3A8A",
    )
    ax.text(
        54,
        50.2,
        "Tách biệt hoàn toàn lớp dữ liệu thô, lớp tính toán Gold Mart, lớp bảo mật/kiểm soát chi phí BFF và giao diện Đối tác",
        ha="center",
        va="center",
        fontsize=8.9,
        color="#475569",
    )

    def draw_box(x, y, w, h, title, lines, border_c, fill_c, header_c):
        rect = FancyBboxPatch(
            (x, y),
            w,
            h,
            boxstyle="round,pad=0.35,rounding_size=1.1",
            linewidth=1.5,
            edgecolor=border_c,
            facecolor=fill_c,
        )
        ax.add_patch(rect)
        hdr = FancyBboxPatch(
            (x, y + h - 5.2),
            w,
            5.2,
            boxstyle="round,pad=0.35,rounding_size=1.1",
            linewidth=0,
            facecolor=header_c,
        )
        ax.add_patch(hdr)
        ax.text(
            x + w / 2,
            y + h - 2.6,
            title,
            ha="center",
            va="center",
            fontsize=8.6,
            fontweight="bold",
            color="white",
        )
        start_y = y + h - 8.0
        step_y = (h - 7.4) / max(len(lines), 1)
        for idx, line in enumerate(lines):
            ax.text(
                x + 1.1,
                start_y - idx * min(step_y, 3.25),
                line,
                ha="left",
                va="top",
                fontsize=7.5,
                color="#1E293B",
            )

    # 4 vertical tier cards with generous 6.8-unit connector channels between cards
    draw_box(
        1.5,
        10.5,
        20.8,
        35.5,
        "1. NGUỒN SỰ KIỆN & OLTP",
        [
            "• GA4 BigQuery Export",
            "  30 bảng ngày events_*",
            "  + events_intraday_*",
            "  (1.630 sự kiện, 0% PII)",
            "• OLTP Nghiệp vụ (4 bảng)",
            "  - partner_user_branch_access",
            "  - partner_branches (4 CS)",
            "  - bid_offers_and_orders (161)",
            "  - payout_batches (16 kỳ)",
        ],
        border_c="#0284C7",
        fill_c="#F0F9FF",
        header_c="#0369A1",
    )

    draw_box(
        29.2,
        10.5,
        21.6,
        35.5,
        "2. BIGQUERY (aevo-512307)",
        [
            "• Tầng Silver (UNNEST an toàn)",
            "  stg_ga4_behavior_events",
            "  Scalar subquery (0 fan-out)",
            "• Tầng Gold Marts (Tối ưu phí)",
            "  - mart_partner_branch_daily",
            "    PARTITION BY metric_date",
            "    CLUSTER BY partner, branch",
            "  - mart_branch_media_and_devices",
            "  - mart_branch_ai_advisor_...",
        ],
        border_c="#4F46E5",
        fill_c="#EEF2FF",
        header_c="#3730A3",
    )

    draw_box(
        57.8,
        10.5,
        21.4,
        35.5,
        "3. BACKEND BFF (:4000)",
        [
            "• HS256 JWT Auth Session",
            "• Multi-Tenant RBAC Guard:",
            "  Ép branch_id IN (@branchIds)",
            "  Chặn chéo HTTP 403 (0B quét)",
            "  Che tài chính Lễ tân từ SQL",
            "• 6 Lớp Chặn Chi Phí (CTO):",
            "  Dry-Run ($0) + Cap 25 MiB",
            "  TTL Cache + Singleflight",
            "  Rate Limit + Budget 500 MiB/d",
        ],
        border_c="#047857",
        fill_c="#ECFDF5",
        header_c="#065F46",
    )

    draw_box(
        86.2,
        10.5,
        20.3,
        35.5,
        "4. PARTNER HUB (:5182)",
        [
            "• Nút chuyển nguồn toàn cục:",
            "  Local JSON <-> BigQuery",
            "• 5 Hồ sơ user_id × branch_id",
            "  Khóa cứng dropdown chi nhánh",
            "• Trang Tổng quan (Inline):",
            "  3 Biểu đồ CTO (0%–100%)",
            "  Phễu 8 bước + Media + OS",
            "• Tab Kho BigQuery:",
            "  Giám sát 6 lớp phí & Test 403",
        ],
        border_c="#1E3A8A",
        fill_c="#F8FAFC",
        header_c="#1E3A8A",
    )

    # Arrows strictly inside the 6.8-unit channels with crisp pill badges
    arrow_pairs = [(22.9, 28.6), (51.4, 57.2), (79.8, 85.6)]
    arrow_labels = ["SQL ETL\nGold Mart", "BQ Query\n+ Labels", "HTTPS\nJWT JSON"]
    for (x1, x2), lbl in zip(arrow_pairs, arrow_labels):
        arr = FancyArrowPatch(
            (x1, 27.5),
            (x2, 27.5),
            arrowstyle="-|>,head_length=6.5,head_width=4.0",
            linewidth=2.0,
            color="#334155",
        )
        ax.add_patch(arr)
        ax.text(
            (x1 + x2) / 2,
            30.6,
            lbl,
            ha="center",
            va="bottom",
            fontsize=6.8,
            fontweight="bold",
            color="#1E293B",
            bbox=dict(boxstyle="round,pad=0.25", facecolor="#FFFFFF", edgecolor="#CBD5E1", lw=0.8),
        )

    # Bottom governance bar
    gov = FancyBboxPatch(
        (1.5, 1.8),
        105.0,
        6.0,
        boxstyle="round,pad=0.3,rounding_size=0.9",
        linewidth=1.2,
        edgecolor="#D97706",
        facecolor="#FFFBEB",
    )
    ax.add_patch(gov)
    ax.text(
        54,
        4.8,
        "Lớp Quản Trị & Kiểm Định Tự Động:  Zero-PII (TRV-XXXX)  |  Gắn nhãn chi phí datacloud:antigravity  |  73/73 Test Tự Động (Python + BFF + Unit + Playwright + 7 Viewports)",
        ha="center",
        va="center",
        fontsize=8.2,
        fontweight="bold",
        color="#92400E",
    )

    fig.tight_layout(pad=0.2)
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def render_fig2_cost_guardrails(out_path: Path) -> None:
    """6-Layer BigQuery Cost Guardrail & Actual Scanned Bytes vs Ceilings."""
    setup_mpl()
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11.2, 4.4), dpi=300, gridspec_kw={"width_ratios": [1.15, 1.0]})
    fig.patch.set_facecolor("white")

    # Left: 6 Layers Defense Stack
    ax1.set_xlim(0, 100)
    ax1.set_ylim(0, 68)
    ax1.axis("off")
    ax1.text(
        50,
        65.2,
        "6 LỚP PHÒNG THỦ CHI PHÍ BIGQUERY (CTO BUDGET SHIELD)",
        ha="center",
        va="center",
        fontsize=10.0,
        fontweight="bold",
        color="#1E3A8A",
    )

    layers = [
        ("Lớp 6", "maximumBytesBilled = 25 MiB (trần cứng 100 MiB) + Timeout 10s", "#065F46", "#ECFDF5"),
        ("Lớp 5", "Dry-Run Pre-Flight ($0): ước lượng bytes trước khi chạy thật", "#047857", "#ECFDF5"),
        ("Lớp 4", "Circuit Breaker 24h: khóa tự động nếu vượt 500 MiB / ngày", "#0284C7", "#F0F9FF"),
        ("Lớp 3", "TTL Cache (60s / 15p) + Singleflight + BigQuery 24h Cache ($0)", "#4F46E5", "#EEF2FF"),
        ("Lớp 2", "Rate Limiter theo user (60 req/phút; ép refresh tối đa 10/phút)", "#6D28D9", "#F5F3FF"),
        ("Lớp 1", "Static SQL Guard: cấm SELECT *, cấm DDL/DML, bắt buộc Partition", "#1E3A8A", "#EFF6FF"),
    ]
    for i, (tag, desc, c_dark, c_light) in enumerate(layers):
        y = 4.0 + i * 9.5
        box = FancyBboxPatch(
            (2, y),
            96,
            7.6,
            boxstyle="round,pad=0.25,rounding_size=0.8",
            linewidth=1.2,
            edgecolor=c_dark,
            facecolor=c_light,
        )
        ax1.add_patch(box)
        badge = FancyBboxPatch(
            (3.2, y + 1.3),
            13.5,
            5.0,
            boxstyle="round,pad=0.2,rounding_size=0.6",
            linewidth=0,
            facecolor=c_dark,
        )
        ax1.add_patch(badge)
        ax1.text(9.95, y + 3.8, tag, ha="center", va="center", fontsize=8.0, fontweight="bold", color="white")
        ax1.text(19.0, y + 3.8, desc, ha="left", va="center", fontsize=7.8, color="#1E293B")

    # Right: Log-scale Bytes Comparison (KB -> TiB)
    labels = [
        "1 truy vấn thực tế\n(Gold Mart ~43 KB)",
        "Trần / 1 truy vấn\n(BFF Default 25 MiB)",
        "Trần cứng Server\n(Hard Cap 100 MiB)",
        "Ngân sách 24 giờ\n(Circuit 500 MiB)",
        "Free Tier GCP / tháng\n(1 TiB = 1.048.576 MiB)",
    ]
    values_mb = [0.042, 25.0, 100.0, 500.0, 1_048_576.0]
    colors = ["#059669", "#4F46E5", "#2563EB", "#D97706", "#64748B"]

    y_pos = range(len(labels))
    bars = ax2.barh(y_pos, values_mb, color=colors, height=0.56, edgecolor="none")
    ax2.set_xscale("log")
    ax2.set_yticks(list(y_pos))
    ax2.set_yticklabels(labels, fontsize=8.0, color="#1E293B")
    ax2.invert_yaxis()
    ax2.set_xlim(0.01, 25_000_000)
    ax2.set_xlabel("Dung lượng quét (MiB — thang logarit)", fontsize=8.2, color="#475569")
    ax2.set_title(
        "SO SÁNH MỨC QUÉT THỰC TẾ VS. NGƯỠNG AN TOÀN",
        fontsize=9.5,
        fontweight="bold",
        color="#1E3A8A",
        pad=10,
    )
    ax2.grid(axis="x", linestyle="--", alpha=0.4, color="#CBD5E1")
    ax2.spines["top"].set_visible(False)
    ax2.spines["right"].set_visible(False)

    annotations = [
        "0.042 MiB (~$0.0000003)",
        "25 MiB (≤ $0.00015)",
        "100 MiB (≤ $0.00060)",
        "500 MiB (≤ $0.003/ngày)",
        "1 TiB ($0 miễn phí/tháng)",
    ]
    for bar, note in zip(bars, annotations):
        ax2.text(
            bar.get_width() * 1.35,
            bar.get_y() + bar.get_height() / 2,
            note,
            va="center",
            ha="left",
            fontsize=7.6,
            fontweight="bold",
            color="#1E293B",
        )

    fig.tight_layout(pad=0.8)
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


def render_fig3_local_vs_bigquery(out_path: Path) -> None:
    """Side-by-side comparison of Local JSON vs Live BigQuery (aevo-512307) 30d revenue by branch."""
    setup_mpl()
    fig, ax = plt.subplots(figsize=(10.5, 4.2), dpi=300)
    fig.patch.set_facecolor("white")

    branches = [
        "CN Mỹ Khê\n(br_mykhe)",
        "CN Sông Hàn\n(br_songhan)",
        "CN An Thượng\n(br_anthuong)",
        "Stay Hotel H11\n(stay_h11)",
        "Toàn chuỗi L'amour\n(3 CN Đà Nẵng)",
    ]
    local_tr = [28.29, 22.71, 15.36, 0.0, 66.36]
    bq_tr = [46.49, 35.51, 22.36, 7.60, 104.36]

    x = list(range(len(branches)))
    width = 0.36

    b1 = ax.bar([i - width / 2 for i in x], local_tr, width, label="Local JSON (dữ liệu mẫu trên máy)", color="#94A3B8")
    b2 = ax.bar([i + width / 2 for i in x], bq_tr, width, label="BigQuery Live (aevo-512307 trên GCP)", color="#4F46E5")

    ax.set_ylabel("Doanh thu thuần 30 ngày (triệu VND)", fontsize=9.0, fontweight="bold", color="#334155")
    ax.set_title(
        "ĐỐI CHIẾU DOANH THU 30 NGÀY: LOCAL JSON VS. BIGQUERY LIVE (aevo-512307)",
        fontsize=11.0,
        fontweight="bold",
        color="#1E3A8A",
        pad=12,
    )
    ax.set_xticks(x)
    ax.set_xticklabels(branches, fontsize=8.5, color="#1E293B")
    ax.set_ylim(0, 122)
    ax.grid(axis="y", linestyle="--", alpha=0.45, color="#CBD5E1")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.legend(frameon=True, facecolor="#F8FAFC", edgecolor="#CBD5E1", fontsize=8.5, loc="upper left")

    for bars, col in [(b1, "#475569"), (b2, "#312E81")]:
        for bar in bars:
            h = bar.get_height()
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                h + 1.8,
                f"{h:.2f}tr" if h > 0 else "0",
                ha="center",
                va="bottom",
                fontsize=8.0,
                fontweight="bold",
                color=col,
            )

    # Highlight delta note for Stay H11 (point cleanly above the "7.60tr" bar label)
    ax.annotate(
        "2 đơn mở hàng #81–#82\ntrên BigQuery Cloud!",
        xy=(3 + width / 2, 14.5),
        xytext=(3.05, 40),
        ha="center",
        fontsize=7.8,
        fontweight="bold",
        color="#047857",
        bbox=dict(boxstyle="round,pad=0.35", facecolor="#ECFDF5", edgecolor="#059669"),
        arrowprops=dict(arrowstyle="->", color="#059669", lw=1.3),
    )

    fig.tight_layout(pad=0.6)
    fig.savefig(out_path, dpi=300, bbox_inches="tight")
    plt.close(fig)


# ==============================================================================
# 2. PYTHON-DOCX STYLING HELPERS
# ==============================================================================
def set_cell_shading(cell, fill_hex: str) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=100, bottom=100, left=140, right=140) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{side}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_borders(cell, top=None, bottom=None, left=None, right=None) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side, spec in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if spec is None:
            continue
        el = OxmlElement(f"w:{side}")
        el.set(qn("w:val"), spec.get("val", "single"))
        el.set(qn("w:sz"), str(spec.get("sz", 4)))
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), spec.get("color", HEX_BORDER))
        tcBorders.append(el)
    tcPr.append(tcBorders)


def set_row_cant_split(row) -> None:
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def set_row_header(row) -> None:
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:tblHeader"))


def add_field(paragraph, field_text: str, font_size: int = 8.5, color: RGBColor = RGB_MUTED) -> None:
    run_begin = paragraph.add_run()
    run_begin.font.name = "Arial"
    run_begin.font.size = Pt(font_size)
    run_begin.font.color.rgb = color
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    run_begin._r.append(fld_begin)

    run_instr = paragraph.add_run()
    run_instr.font.name = "Arial"
    run_instr.font.size = Pt(font_size)
    run_instr.font.color.rgb = color
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = f" {field_text} "
    run_instr._r.append(instr)

    run_sep = paragraph.add_run()
    fld_sep = OxmlElement("w:fldChar")
    fld_sep.set(qn("w:fldCharType"), "separate")
    run_sep._r.append(fld_sep)

    run_end = paragraph.add_run()
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run_end._r.append(fld_end)


def style_run(run, size: float = 10.0, bold: bool = False, italic: bool = False, color: RGBColor = RGB_SLATE, font: str = "Arial"):
    run.font.name = font
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    return run


def add_h1(doc: Document, number_str: str, title: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    # Bottom accent border on H1
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="10" w:space="4" w:color="{HEX_INDIGO}"/></w:pBdr>'
    )
    pPr.append(pBdr)
    r_num = p.add_run(f"{number_str}  ")
    style_run(r_num, size=14.5, bold=True, color=RGB_INDIGO)
    r_txt = p.add_run(title)
    style_run(r_txt, size=14.5, bold=True, color=RGB_NAVY)


def add_h2(doc: Document, title: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(title)
    style_run(r, size=11.5, bold=True, color=RGB_INDIGO)


def add_body(doc: Document, text: str, bold_prefix: str | None = None, space_after: float = 5.0) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.22
    if bold_prefix:
        r0 = p.add_run(bold_prefix)
        style_run(r0, size=10.0, bold=True, color=RGB_SLATE)
    r1 = p.add_run(text)
    style_run(r1, size=10.0, color=RGB_SLATE)


def add_bullet(doc: Document, bold_lead: str, body: str) -> None:
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.65)
    p.paragraph_format.first_line_indent = Cm(-0.35)
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3.5)
    p.paragraph_format.line_spacing = 1.18
    r_dot = p.add_run("▸  ")
    style_run(r_dot, size=9.5, bold=True, color=RGB_INDIGO)
    if bold_lead:
        r_b = p.add_run(bold_lead)
        style_run(r_b, size=9.8, bold=True, color=RGB_SLATE)
    r_t = p.add_run(body)
    style_run(r_t, size=9.8, color=RGB_SLATE)


def add_callout(doc: Document, title: str, lines: Iterable[str], tone: str = "indigo") -> None:
    palette = {
        "indigo": (HEX_INDIGO, HEX_INDIGO_BG, RGB_INDIGO),
        "emerald": (HEX_EMERALD, HEX_EMERALD_BG, RGB_EMERALD),
        "amber": (HEX_AMBER, HEX_AMBER_BG, RGB_AMBER),
    }
    accent_hex, bg_hex, title_rgb = palette.get(tone, palette["indigo"])
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Cm(16.6)
    set_cell_shading(cell, bg_hex)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=160)
    set_cell_borders(
        cell,
        top={"val": "single", "sz": 4, "color": HEX_BORDER},
        bottom={"val": "single", "sz": 4, "color": HEX_BORDER},
        right={"val": "single", "sz": 4, "color": HEX_BORDER},
        left={"val": "single", "sz": 24, "color": accent_hex},
    )
    set_row_cant_split(tbl.rows[0])

    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after = Pt(4)
    style_run(p0.add_run(title), size=10.2, bold=True, color=title_rgb)

    for line in lines:
        p = cell.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2.5)
        p.paragraph_format.line_spacing = 1.15
        style_run(p.add_run(line), size=9.5, color=RGB_SLATE)

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_before = Pt(0)
    spacer.paragraph_format.space_after = Pt(4)


def set_table_fixed_widths(tbl, col_widths_cm: list[float]) -> None:
    total_dxa = int(round(sum(col_widths_cm) * 566.929))
    tblPr = tbl._tbl.tblPr
    tblW = parse_xml(f'<w:tblW {nsdecls("w")} w:w="{total_dxa}" w:type="dxa"/>')
    tblLayout = parse_xml(f'<w:tblLayout {nsdecls("w")} w:type="fixed"/>')
    tblPr.append(tblW)
    tblPr.append(tblLayout)

    # Set exact tblGrid columns
    old_grid = tbl._tbl.find(qn("w:tblGrid"))
    if old_grid is not None:
        tbl._tbl.remove(old_grid)
    new_grid = OxmlElement("w:tblGrid")
    for w_cm in col_widths_cm:
        gc = OxmlElement("w:gridCol")
        gc.set(qn("w:w"), str(int(round(w_cm * 566.929))))
        new_grid.append(gc)
    tblPr.addnext(new_grid)


def set_cell_width_dxa(cell, w_cm: float) -> None:
    tcPr = cell._tc.get_or_add_tcPr()
    for existing in tcPr.findall(qn("w:tcW")):
        tcPr.remove(existing)
    tcW = OxmlElement("w:tcW")
    tcW.set(qn("w:w"), str(int(round(w_cm * 566.929))))
    tcW.set(qn("w:type"), "dxa")
    tcPr.append(tcW)


def add_styled_table(
    doc: Document,
    headers: list[str],
    rows: list[list[str]],
    col_widths_cm: list[float],
    header_bg: str = HEX_NAVY,
    font_size: float = 8.8,
) -> None:
    tbl = doc.add_table(rows=1 + len(rows), cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    set_table_fixed_widths(tbl, col_widths_cm)

    # Header row
    hdr_row = tbl.rows[0]
    set_row_header(hdr_row)
    set_row_cant_split(hdr_row)
    for j, (h_text, w_cm) in enumerate(zip(headers, col_widths_cm)):
        c = hdr_row.cells[j]
        set_cell_width_dxa(c, w_cm)
        c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_shading(c, header_bg)
        set_cell_margins(c, top=95, bottom=95, left=110, right=110)
        set_cell_borders(
            c,
            top={"val": "single", "sz": 6, "color": header_bg},
            bottom={"val": "single", "sz": 8, "color": header_bg},
            left={"val": "single", "sz": 4, "color": "3B82F6"},
            right={"val": "single", "sz": 4, "color": "3B82F6"},
        )
        p = c.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        style_run(p.add_run(h_text), size=font_size, bold=True, color=RGB_WHITE)

    # Data rows
    for i, row_vals in enumerate(rows):
        row = tbl.rows[i + 1]
        set_row_cant_split(row)
        bg = HEX_ZEBRA if i % 2 == 1 else "FFFFFF"
        for j, (val, w_cm) in enumerate(zip(row_vals, col_widths_cm)):
            c = row.cells[j]
            set_cell_width_dxa(c, w_cm)
            c.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_shading(c, bg)
            set_cell_margins(c, top=80, bottom=80, left=110, right=110)
            set_cell_borders(
                c,
                top={"val": "single", "sz": 4, "color": HEX_BORDER},
                bottom={"val": "single", "sz": 4, "color": HEX_BORDER},
                left={"val": "single", "sz": 4, "color": HEX_BORDER},
                right={"val": "single", "sz": 4, "color": HEX_BORDER},
            )
            p = c.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            is_pass = "PASS" in val or "Hoàn tất" in val or "Đạt" in val
            txt_color = RGB_EMERALD if (j == len(row_vals) - 1 and is_pass) else RGB_SLATE
            style_run(p.add_run(val), size=font_size, bold=(j == 0 or (j == len(row_vals) - 1 and is_pass)), color=txt_color)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(5)


def add_figure(doc: Document, img_path: Path, caption: str, width_cm: float = 16.4) -> None:
    p_img = doc.add_paragraph()
    p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_img.paragraph_format.space_before = Pt(4)
    p_img.paragraph_format.space_after = Pt(3)
    p_img.paragraph_format.keep_with_next = True
    p_img.add_run().add_picture(str(img_path), width=Cm(width_cm))

    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(0)
    p_cap.paragraph_format.space_after = Pt(8)
    style_run(p_cap.add_run(caption), size=8.8, italic=True, color=RGB_MUTED)


# ==============================================================================
# 3. LIVING DOCUMENT CONTENT DATA (EASY TO APPEND IN FUTURE VERSIONS)
# ==============================================================================
DOC_VERSION = "v1.4"
DOC_DATE = "25/11/2026"

REVISION_HISTORY = [
    ["v1.0", "23/11/2026", "Nghiên cứu nền tảng GA4 + BigQuery, tổ chức lại thư mục docs/, thiết kế Phương án B (3 phase) và giải pháp phân quyền branch_id × user_id theo ý tưởng CTO.", "Hoàn tất"],
    ["v1.1", "23/11/2026", "Phase 1: Dựng kho dữ liệu giả lập 30 ngày trên GCP aevo-512307 (US) gồm 30 shard GA4, 4 bảng OLTP/RBAC và 4 bảng Silver/Gold Mart phân vùng & gom cụm.", "Hoàn tất"],
    ["v1.2", "25/11/2026", "Phase 2: Xây dựng Backend BFF độc lập dashboard/bigquery-bff (:4000) với HS256 JWT, chặn chéo 403, che tài chính Lễ tân và 6 lớp khóa chi phí BigQuery theo yêu cầu CTO (14/14 tests PASS).", "Hoàn tất"],
    ["v1.3", "25/11/2026", "Phase 3: Tích hợp vào Optibide Partner Hub (:5182) — nút chuyển nguồn Local JSON ↔ BigQuery, 5 hồ sơ RBAC, tab Kho BigQuery & kiểm định 7 kích thước màn hình.", "Hoàn tất"],
    ["v1.4", "25/11/2026", "Cải tiến trải nghiệm Demo & CTO: (1) Tách số liệu BigQuery riêng biệt (+45,6tr ₫, +11 đơn #72–#82, Stay H11 có 2 đơn mở hàng) cho dễ phân biệt với Local JSON; (2) Gắn trực tiếp bộ biểu đồ BigQuery (3 biểu đồ CTO, Phễu 8 bước, Media, OS) lên trang Tổng quan khi bật chế độ BigQuery (73/73 tests PASS).", "Hoàn tất"],
    ["v1.5+", "Kế tiếp", "Khu vực cập nhật tiếp: Chuyển SQL Mart sang Incremental Scheduled Query / Dataform, nối GA4 Export & Auth JWT thật của goodNstay, đóng gói Docker/Redis và tích hợp AI Chatbot Gemini.", "Đang lập kế hoạch"],
]


# ==============================================================================
# 4. BUILD COMPLETE DOCX REPORT
# ==============================================================================
def build_docx() -> Path:
    CHART_TMP_DIR.mkdir(parents=True, exist_ok=True)
    fig1 = CHART_TMP_DIR / "fig1_architecture.png"
    fig2 = CHART_TMP_DIR / "fig2_cost_guardrails.png"
    fig3 = CHART_TMP_DIR / "fig3_local_vs_bigquery_delta.png"

    render_fig1_architecture(fig1)
    render_fig2_cost_guardrails(fig2)
    render_fig3_local_vs_bigquery(fig3)

    doc = Document()

    # Configure A4 page setup
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.PORTRAIT
    sec.page_width = Cm(21.0)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(2.0)
    sec.bottom_margin = Cm(2.0)
    sec.left_margin = Cm(2.2)
    sec.right_margin = Cm(2.2)
    sec.different_first_page_header_footer = True

    # Running Header (pages 2+)
    hdr = sec.header.paragraphs[0]
    hdr.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    style_run(
        hdr.add_run(f"goodNstay · Optibide Partner Hub  |  Báo Cáo Tổng Hợp GA4 & BigQuery ({DOC_VERSION} · {DOC_DATE})"),
        size=8.3,
        italic=True,
        color=RGB_MUTED,
    )

    # Running Footer (pages 2+) with Page X / Y
    ftr = sec.footer.paragraphs[0]
    ftr.alignment = WD_ALIGN_PARAGRAPH.CENTER
    style_run(ftr.add_run("Tài liệu sống (Living Document) — Dự án GCP: aevo-512307 (US)   |   Trang "), size=8.3, color=RGB_MUTED)
    add_field(ftr, "PAGE", font_size=8.3)
    style_run(ftr.add_run(" / "), size=8.3, color=RGB_MUTED)
    add_field(ftr, "NUMPAGES", font_size=8.3)

    # Default Normal style
    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(10)
    normal.font.color.rgb = RGB_SLATE

    # ==========================================================================
    # COVER PAGE
    # ==========================================================================
    banner = doc.add_table(rows=1, cols=1)
    banner.alignment = WD_TABLE_ALIGNMENT.CENTER
    banner.autofit = False
    bcell = banner.cell(0, 0)
    bcell.width = Cm(16.6)
    set_cell_shading(bcell, HEX_NAVY)
    set_cell_margins(bcell, top=320, bottom=320, left=260, right=260)
    set_cell_borders(bcell, bottom={"val": "single", "sz": 24, "color": HEX_INDIGO})

    bp0 = bcell.paragraphs[0]
    bp0.paragraph_format.space_after = Pt(8)
    style_run(bp0.add_run("GOODNSTAY · OPTIBIDE PARTNER HUB"), size=10.5, bold=True, color=RGBColor(0x93, 0xC5, 0xFD))

    bp1 = bcell.add_paragraph()
    bp1.paragraph_format.space_after = Pt(8)
    style_run(
        bp1.add_run("BÁO CÁO TỔNG HỢP TRIỂN KHAI\nGOOGLE ANALYTICS 4 & BIGQUERY"),
        size=21.0,
        bold=True,
        color=RGB_WHITE,
    )

    bp2 = bcell.add_paragraph()
    bp2.paragraph_format.space_after = Pt(0)
    style_run(
        bp2.add_run(
            "Kiến trúc kho dữ liệu đa chi nhánh · Phân quyền user_id × branch_id · "
            "Bảo vệ chi phí 6 lớp (CTO Budget Shield) · Tích hợp Dashboard trực tiếp & Lộ trình cải tiến"
        ),
        size=10.8,
        color=RGBColor(0xE0, 0xE7, 0xFF),
    )

    sp_cov = doc.add_paragraph()
    sp_cov.paragraph_format.space_after = Pt(10)

    # 4 Executive Metric Cards on Cover
    cards_tbl = doc.add_table(rows=1, cols=4)
    cards_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cards_tbl.autofit = False
    card_specs = [
        ("35 + 4", "Bảng BigQuery Live", "aevo-512307 (US)", HEX_INDIGO_BG, RGB_INDIGO),
        ("6 Lớp", "Chặn Chi Phí CTO", "≤ 25 MiB · Dry-Run $0", HEX_EMERALD_BG, RGB_EMERALD),
        ("5 Hồ Sơ", "RBAC Đa Chi Nhánh", "user_id × branch_id", HEX_INDIGO_BG, RGB_NAVY),
        ("73 / 73", "Test Tự Động PASS", "Unit + BFF + E2E + 7 VP", HEX_EMERALD_BG, RGB_EMERALD),
    ]
    for idx, (big_v, lbl, sub, bg_h, c_rgb) in enumerate(card_specs):
        c = cards_tbl.cell(0, idx)
        c.width = Cm(4.15)
        set_cell_shading(c, bg_h)
        set_cell_margins(c, top=140, bottom=140, left=100, right=100)
        set_cell_borders(
            c,
            top={"val": "single", "sz": 6, "color": HEX_BORDER},
            bottom={"val": "single", "sz": 6, "color": HEX_BORDER},
            left={"val": "single", "sz": 6, "color": HEX_BORDER},
            right={"val": "single", "sz": 6, "color": HEX_BORDER},
        )
        p1 = c.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1.paragraph_format.space_after = Pt(2)
        style_run(p1.add_run(big_v), size=15.0, bold=True, color=c_rgb)
        p2 = c.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.space_after = Pt(1)
        style_run(p2.add_run(lbl), size=8.6, bold=True, color=RGB_SLATE)
        p3 = c.add_paragraph()
        p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p3.paragraph_format.space_after = Pt(0)
        style_run(p3.add_run(sub), size=7.6, color=RGB_MUTED)

    sp_cov2 = doc.add_paragraph()
    sp_cov2.paragraph_format.space_after = Pt(12)

    # Document Control Metadata Table
    add_styled_table(
        doc,
        headers=["Thông tin tài liệu", "Chi tiết hiện hành"],
        rows=[
            ["Loại tài liệu", "Tài liệu tổng hợp sống (Living Document) — cập nhật xuyên suốt mọi giai đoạn & cải tiến"],
            ["Phiên bản & Ngày cập nhật", f"{DOC_VERSION} — Cập nhật ngày {DOC_DATE}"],
            ["Môi trường GCP / BigQuery", "Project ID: aevo-512307 · Vùng thực thi: US · 3 dataset (gns_sim_ga4, gns_sim_oltp, gns_analytics_mart)"],
            ["Hệ thống tích hợp", "Backend BFF dashboard/bigquery-bff (:4000) ↔ Optibide Partner Hub dashboard/dashboard (:5182)"],
            ["Đối tượng đọc", "Ban Giám đốc / CTO (nắm kiến trúc, phân quyền, chi phí) & Team Kỹ thuật / QA (triển khai, kiểm thử, vận hành)"],
            ["Trạng thái hiện tại", "Hoàn tất 100% POC/Demo (Phase 1–3 + Cải tiến tách số liệu BigQuery & nhúng chart trực tiếp lên Tổng quan)"],
            ["Người biên soạn", "Nguyễn Bảo Minh (goodNstay Internship Program 2026)"],
        ],
        col_widths_cm=[5.2, 11.4],
        header_bg=HEX_NAVY,
        font_size=9.2,
    )

    add_callout(
        doc,
        "Cách sử dụng & duy trì tài liệu này cho các phiên bản sau",
        [
            "• File này được thiết kế làm nguồn sự thật duy nhất (Single Source of Truth) về toàn bộ quá trình nghiên cứu, dựng kho BigQuery, bảo mật phân quyền, kiểm soát chi phí và tích hợp GA4 lên Optibide Partner Hub.",
            "• Mọi cải tiến tiếp theo (Incremental Scheduled Query, nối GA4/Auth thật, Docker/Redis, AI Chatbot Gemini) chỉ cần bổ sung vào Bảng Lịch Sử Phiên Bản và Chương 8 trong script build_ga4_bigquery_report_docx.py rồi chạy lại để xuất file .docx mới nhất đồng bộ 100%.",
        ],
        tone="indigo",
    )

    doc.add_page_break()

    # ==========================================================================
    # REVISION HISTORY & TABLE OF CONTENTS OVERVIEW
    # ==========================================================================
    add_h1(doc, "0.", "Lịch Sử Phiên Bản & Cấu Trúc Báo Cáo")
    add_body(
        doc,
        "Bảng dưới đây ghi nhận toàn bộ tiến trình từ lúc nghiên cứu giải pháp đến các vòng triển khai thực tế và cải tiến sau demo. Khi bước sang các giai đoạn Staging/Production, mỗi mốc mới sẽ được cộng dồn trực tiếp tại đây.",
    )
    add_styled_table(
        doc,
        headers=["Phiên bản", "Ngày", "Nội dung cập nhật & cải tiến chính", "Trạng thái"],
        rows=REVISION_HISTORY,
        col_widths_cm=[2.0, 2.3, 9.9, 2.4],
        header_bg=HEX_INDIGO,
        font_size=8.6,
    )

    add_h2(doc, "Tóm lược nội dung 8 chương chính")
    add_bullet(doc, "Chương 1 — Tóm tắt điều hành: ", "Bài toán kinh doanh, lý do chọn kiến trúc Phương án B và 4 kết quả đạt được.")
    add_bullet(doc, "Chương 2 — Kiến trúc tổng thể 4 tầng: ", "Luồng dữ liệu xuyên suốt từ GA4 → BigQuery → BFF (:4000) → Dashboard (:5182).")
    add_bullet(doc, "Chương 3 — Thiết kế kho dữ liệu GA4 & BigQuery (aevo-512307): ", "3 tầng Bronze/Silver/Gold, chống fan-out UNNEST, Zero-PII và bảng đối chiếu số liệu Local JSON vs BigQuery.")
    add_bullet(doc, "Chương 4 — Giải pháp phân quyền user_id × branch_id & 3 biểu đồ CTO: ", "Mô hình phân quyền đa chi nhánh (không dùng brand), chặn chéo 403 và chuẩn hóa tỷ lệ 0%–100%.")
    add_bullet(doc, "Chương 5 — Kiểm soát chi phí BigQuery 6 lớp (CTO Budget Shield): ", "Cơ chế tính phí On-Demand và 6 lớp bảo vệ đã kiểm chứng thực tế.")
    add_bullet(doc, "Chương 6 — Tích hợp giao diện Optibide Partner Hub (:5182): ", "Nút chuyển nguồn Local JSON ↔ BigQuery, biểu đồ BigQuery trực tiếp trên Tổng quan và tab Kho BigQuery.")
    add_bullet(doc, "Chương 7 — Nhật ký triển khai, sự cố thực tế đã xử lý & QA Gate: ", "Toàn bộ 5 bài học kỹ thuật đã xử lý dứt điểm và bảng kết quả 73/73 bài test tự động.")
    add_bullet(doc, "Chương 8 — Lộ trình cải tiến lên Staging & Production: ", "Kế hoạch 4 chặng bàn giao cho DevOps/BE và định hướng mở rộng AI Chatbot.")

    # ==========================================================================
    # CHAPTER 1: EXECUTIVE SUMMARY
    # ==========================================================================
    add_h1(doc, "1.", "Tóm Tắt Điều Hành (Executive Summary)")
    add_body(
        doc,
        "Trong mô hình đấu giá ngược của goodNstay, chủ khách sạn và quản lý chi nhánh không chỉ cần biết tổng doanh thu đã chốt mà còn cần nhìn rõ toàn bộ hành trình khách du lịch từ lúc mở form tìm phòng, nhận báo giá, bấm xem ảnh/video chi tiết đến lúc thanh toán hoặc bỏ qua. Trước khi triển khai giải pháp này, Optibide Partner Hub mới chỉ đọc dữ liệu mẫu tĩnh (Local JSON) trên máy cục bộ và chưa tách được quyền xem dữ liệu theo từng chi nhánh cụ thể.",
    )
    add_body(
        doc,
        "Để giải quyết triệt để bài toán phân tích hành vi (GA4), lưu trữ truy vấn lớn (BigQuery), bảo mật đa chi nhánh và kiểm soát chặt ngân sách đám mây theo chỉ đạo của CTO, dự án đã lựa chọn và hoàn thiện trọn vẹn Kiến trúc Phương án B — triển khai kho dữ liệu BigQuery thật (aevo-512307), dựng dịch vụ trung gian Backend-for-Frontend (BFF) độc lập trên cổng :4000, và tích hợp mượt mà vào giao diện Partner Hub (:5182).",
    )

    add_callout(
        doc,
        "4 Giá Trị Cốt Lõi Đã Chứng Minh Thực Tế",
        [
            "1. Dữ liệu sống 100% từ Google Cloud BigQuery: 30 ngày sự kiện GA4 (1.630 sự kiện, 0% PII) kết nối trực tiếp dữ liệu đặt phòng OLTP và tổng hợp sẵn thành bảng Gold Mart phân vùng theo ngày.",
            "2. Phân quyền chặt chẽ ở tầng Máy chủ (user_id × branch_id): Mỗi tài khoản chỉ nhìn thấy đúng chi nhánh được cấp; mọi hành vi cố tình xem chi nhánh khác bị chặn ngay lập tức bằng HTTP 403 với 0 bytes quét BigQuery; Lễ tân tự động bị che toàn bộ số tiền doanh thu ngay từ câu lệnh SQL.",
            "3. Khóa chi phí BigQuery 6 lớp theo nhắc nhở CTO: Mức quét thực tế chỉ ~43 KB/truy vấn (≈ $0.0000003), đi kèm Dry-Run Pre-Flight ($0), trần cứng 25 MiB/truy vấn, TTL Cache + Singleflight, Rate Limit và cầu dao ngân sách 500 MiB/24 giờ.",
            "4. Trải nghiệm trực quan cho Ban Lãnh Đạo & Đối tác: Gạt 1 nút Local JSON ↔ BigQuery ngay trên đầu trang là thấy số liệu nhảy trực tiếp (+66,4tr ₫ → +104,4tr ₫) kèm bộ 3 biểu đồ CTO, Phễu 8 bước, Media Ảnh/Video và Thiết bị OS hiện ngay trên trang Tổng quan.",
        ],
        tone="emerald",
    )

    # ==========================================================================
    # CHAPTER 2: ARCHITECTURE
    # ==========================================================================
    add_h1(doc, "2.", "Kiến Trúc Tổng Thể Hệ Thống (4 Tầng)")
    add_body(
        doc,
        "Thay vì để trình duyệt của khách sạn gọi trực tiếp vào BigQuery hoặc nhúng báo cáo iframe bên ngoài (vừa lộ dữ liệu chi nhánh khác, vừa không khóa được chi phí truy vấn), hệ thống tách làm 4 tầng rõ ràng như Hình 1.",
    )
    add_figure(
        doc,
        fig1,
        "Hình 1: Kiến trúc 4 tầng kết nối GA4 → BigQuery (aevo-512307) → Multi-Tenant BFF (:4000) → Optibide Partner Hub (:5182).",
        width_cm=16.5,
    )

    add_h2(doc, "Vì sao không nhúng trực tiếp BigQuery Console hay Looker Studio vào Portal đối tác?")
    add_bullet(
        doc,
        "BigQuery Studio bị chặn nhúng: ",
        "Trang console.cloud.google.com/bigquery áp dụng chính sách X-Frame-Options: DENY nên trình duyệt không cho nhúng iframe.",
    )
    add_bullet(
        doc,
        "Rủi ro phân quyền & chi phí của Looker Studio iframe: ",
        "Nếu dùng iframe công khai kèm tham số URL (?branch_id=...), người dùng có thể tự sửa URL để xem dữ liệu chi nhánh khác; đồng thời mỗi lượt F5 của khách sạn sẽ bắn truy vấn thẳng vào BigQuery mà không đi qua 6 lớp kiểm soát chi phí.",
    )
    add_bullet(
        doc,
        "Ưu thế vượt trội của mô hình BFF (:4000) + Biểu đồ gốc (Recharts): ",
        "Mọi truy vấn đều đi qua một cửa duy nhất có xác thực JWT, ép bộ lọc chi nhánh ở server, kiểm soát từng byte quét, đồng bộ trọn vẹn 3 ngôn ngữ (Việt / Anh / Hàn), 3 tiền tệ (VND / KRW / USD) và hiển thị mượt từ màn hình rộng 1440px xuống điện thoại 360px.",
    )

    doc.add_page_break()

    # ==========================================================================
    # CHAPTER 3: BIGQUERY WAREHOUSE DESIGN
    # ==========================================================================
    add_h1(doc, "3.", "Thiết Kế Kho Dữ Liệu GA4 & BigQuery (aevo-512307)")
    add_body(
        doc,
        "Kho dữ liệu mô phỏng trên Google Cloud Project aevo-512307 (vùng thực thi US — đồng bộ 100% với cả SDK @google-cloud/bigquery lẫn BigQuery MCP) được xây dựng theo chuẩn Medallion 3 tầng (Bronze → Silver → Gold) sát với cấu trúc GA4 BigQuery Export thực tế của Google.",
    )

    add_styled_table(
        doc,
        headers=["Dataset / Tầng", "Danh sách bảng chính", "Quy mô hiện tại", "Tối ưu lưu trữ & Quy tắc thiết kế"],
        rows=[
            [
                "gns_sim_ga4\n(Bronze · Raw GA4)",
                "events_20261008 .. events_20261106\n+ events_intraday_20261106",
                "30 bảng ngày + 1 bảng intraday\n1.630 sự kiện (183 intraday)",
                "Cấu trúc lồng nhau chuẩn GA4 ARRAY<STRUCT> event_params; giới hạn ≤25 params/event, ≤40 ký tự key; 100% ẩn danh TRV-XXXX (0% PII).",
            ],
            [
                "gns_sim_oltp\n(Bronze · Nghiệp vụ)",
                "partner_user_branch_access\npartner_branches\nbid_offers_and_orders\npayout_batches",
                "5 tài khoản RBAC · 4 cơ sở\n161 lượt báo giá (40 đơn paid)\n16 kỳ sao kê đối soát",
                "bid_offers_and_orders phân vùng theo session_date, gom cụm (partner_id, branch_id, status). Khớp chuẩn công thức ×1.265 (15% phí sàn + 10% VAT).",
            ],
            [
                "gns_analytics_mart\n(Silver · Làm phẳng)",
                "stg_ga4_behavior_events",
                "1.630 dòng (tỷ lệ 1:1 chuẩn xác)",
                "PARTITION BY event_date (require_partition_filter=true). Dùng Scalar Subquery cho từng param thay vì CROSS JOIN UNNEST để tuyệt đối không bị nhân bản dòng (0% fan-out).",
            ],
            [
                "gns_analytics_mart\n(Gold · Phục vụ UI)",
                "mart_partner_branch_daily\nmart_branch_media_and_devices\nmart_branch_ai_advisor_snapshots",
                "120 dòng ngày (30d × 4 CS)\n5 nhóm media · 3 loại OS\n4 hồ sơ chẩn đoán AI",
                "PARTITION BY metric_date (bắt buộc lọc ngày), CLUSTER BY partner_id, branch_id. Dashboard chỉ đọc tầng Gold nên mỗi truy vấn chỉ quét ~43 KB.",
            ],
        ],
        col_widths_cm=[3.3, 4.3, 3.6, 5.4],
        header_bg=HEX_NAVY,
        font_size=8.4,
    )

    add_h2(doc, "3.1. Chuẩn hóa Phễu hành vi 8 bước & Dữ liệu tương tác")
    add_bullet(doc, "Phễu 8 bước chuẩn xuyên suốt: ", "1. Mở form tìm phòng (booking_form_start) → 2. Gửi yêu cầu (booking_form_complete) → 3. Hiển thị thẻ chào giá (offer_card_impression) → 4. Xem chi tiết duy nhất (offer_browse_click — COUNT DISTINCT offer_id) → 5. Xem ảnh/video Gallery (explore_stay_media_click) → 6. Bấm chọn phòng (offer_select_click) → 7. Mở trang thanh toán (payment_checkout_open) → 8. Thanh toán thành công (payment_complete).")
    add_bullet(doc, "Phân tích nội dung trực quan: ", "Thống kê 5 nhóm nội dung phòng/khách sạn (Phòng, Tiện ích, Ngoại cảnh, Ẩm thực, Điểm gần đó) tách riêng lượt bấm Ảnh vs Video, kết hợp chuyển đổi theo 3 hệ điều hành (iOS, Android, Web) và thời gian đọc mô tả trung bình (dwell_ms).")
    add_bullet(doc, "Chuẩn dữ liệu AI Trúng thầu vs. Rớt thầu: ", "Bảng mart_branch_ai_advisor_snapshots tính sẵn chênh lệch mức giảm giá (saving_pct), độ khớp tiêu chí (match_rate_pct), thời gian khách ra quyết định (decision_duration_sec) và Top 3 tiêu chí bị thiếu nhiều nhất (top_missing_criteria) cho từng chi nhánh.")

    add_h2(doc, "3.2. Cải tiến v1.4 — Tách biệt rõ số liệu BigQuery Live so với Local JSON")
    add_body(
        doc,
        "Theo yêu cầu thực tế để Ban Lãnh Đạo dễ dàng phân biệt ngay bằng mắt thường khi bật/tắt công tắc Local JSON ↔ BigQuery, kho BigQuery aevo-512307 được bổ sung thêm một đợt giao dịch Cloud (+18 lượt báo giá, +11 đơn đã thanh toán mã #72 đến #82, +45.600.000 ₫ doanh thu thuần, +4 kỳ đối soát STL-BQ-* và điểm đánh giá/ELO cập nhật) trong khi giữ nguyên 100% bộ seed Local JSON.",
    )
    add_figure(
        doc,
        fig3,
        "Hình 2: So sánh trực quan doanh thu thuần 30 ngày giữa Local JSON và BigQuery Live (aevo-512307) trên từng chi nhánh.",
        width_cm=15.8,
    )

    add_styled_table(
        doc,
        headers=["Cơ sở / Phạm vi", "Local JSON (trên máy)", "BigQuery Live (aevo-512307)", "Điểm khác biệt trực quan"],
        rows=[
            ["Toàn chuỗi L'amour (3 CN)", "66.360.000 ₫ (+66,4tr) · 68 bids · 29 đơn · ELO 1680", "104.360.000 ₫ (+104,4tr) · 83 bids · 38 đơn · ELO 1783", "+38.000.000 ₫ (+9 đơn mới #72..#80)"],
            ["Kho BigQuery (đủ 4 CS)", "(Chỉ có trên BigQuery)", "111.960.000 ₫ · 161 bids · 40 đơn · GMV 141,63tr ₫", "Gộp cả chuỗi L'amour + Stay Hotel H11"],
            ["CN Mỹ Khê (br_mykhe)", "28.290.000 ₫ (+28,3tr) · 26 bids · 13 đơn · ELO 1720", "46.490.000 ₫ (+46,5tr) · 32 bids · 17 đơn · ELO 1845", "+18.200.000 ₫ (+4 đơn #72..#75)"],
            ["CN Sông Hàn (br_songhan)", "22.710.000 ₫ (+22,7tr) · 22 bids · 9 đơn · ELO 1665", "35.510.000 ₫ (+35,5tr) · 27 bids · 12 đơn · ELO 1790", "+12.800.000 ₫ (+3 đơn #76..#78)"],
            ["CN An Thượng (br_anthuong)", "15.360.000 ₫ (+15,4tr) · 20 bids · 7 đơn · ELO 1610", "22.360.000 ₫ (+22,4tr) · 24 bids · 9 đơn · ELO 1715", "+7.000.000 ₫ (+2 đơn #79..#80)"],
            ["Stay Hotel H11 (stay_h11)", "0 ₫ · 75 bids · 0 đơn · ELO 800", "7.600.000 ₫ (+7,6tr) · 78 bids · 2 đơn · ELO 960", "Có ngay 2 đơn mở hàng #81 & #82 trên Cloud"],
        ],
        col_widths_cm=[3.6, 4.3, 4.7, 4.0],
        header_bg=HEX_NAVY,
        font_size=8.2,
    )

    doc.add_page_break()

    # ==========================================================================
    # CHAPTER 4: RBAC & CTO DASHBOARD IDEA
    # ==========================================================================
    add_h1(doc, "4.", "Phân Quyền user_id × branch_id & Ý Tưởng Dashboard Của CTO")
    add_h2(doc, "4.1. Thống nhất mô hình thực thể (Không có brand_id — chỉ dùng branch_id và user_id)")
    add_body(
        doc,
        "Trong hệ thống goodNstay không tồn tại thực thể brand_id. Toàn bộ cấu trúc quản trị và phân quyền xoay quanh đúng 2 khóa chính là branch_id (định danh từng chi nhánh / cơ sở lưu trú) và user_id (định danh tài khoản nhân sự đối tác đăng nhập cổng quản trị, tách biệt hoàn toàn với tài khoản khách du lịch đặt phòng). Chủ sở hữu nhiều chi nhánh đơn giản là một user_id được gán danh sách nhiều branch_id trong bảng quyền partner_user_branch_access.",
    )

    add_h2(doc, "4.2. Cơ chế khóa quyền 4 bước ở Backend BFF (Chống truy cập chéo BOLA)")
    add_bullet(doc, "Bước 1 — Cấp thẻ phiên JWT ký HS256: ", "Khi đăng nhập, BFF tra bảng partner_user_branch_access trên BigQuery để lấy chính xác allowed_branch_ids, can_view_chain_all, can_view_financials và can_manage_pricing rồi ký vào token (không tin dữ liệu client tự gửi).")
    add_bullet(doc, "Bước 2 — Chặn truy cập chéo trước khi chạm BigQuery: ", "Nếu Quản lý chi nhánh Mỹ Khê (chỉ có br_mykhe) cố gửi yêu cầu ?branchId=br_songhan hoặc ?branchId=all, BFF lập tức trả HTTP 403 (FORBIDDEN_BRANCH_SCOPE) và tiêu tốn đúng 0 bytes BigQuery.")
    add_bullet(doc, "Bước 3 — Ép điều kiện SQL cứng bằng tham số hóa: ", "Mọi câu truy vấn xuống BigQuery đều ép mệnh đề WHERE branch_id IN UNNEST(@branchIds) theo tập quyền của token, loại bỏ hoàn toàn nguy cơ SQL Injection và rò rỉ dữ liệu liên chi nhánh.")
    add_bullet(doc, "Bước 4 — Che dữ liệu tài chính từ tầng SQL cho Lễ tân: ", "Với vai trò Lễ tân (can_view_financials = false), câu SQL trả về NULL/0 ngay tại BigQuery và BFF xóa danh sách sao kê ngân hàng trước khi gửi HTTP JSON — bảo đảm dù mở DevTools (F12) cũng không thấy số tiền thật.")

    add_styled_table(
        doc,
        headers=["user_id", "Vai trò (role_key)", "Chi nhánh được phép", "Tài chính & Giá", "Kết quả kiểm thử trên BigQuery"],
        rows=[
            ["USR-PARTNER-01", "Tổng quản lý (manager)", "all + cả 4 cơ sở\n(br_mykhe, br_songhan, br_anthuong, stay_h11)", "Xem đầy đủ & Sửa giá", "111.960.000 ₫ (4 CS) / 104.360.000 ₫ (L'amour) — PASS"],
            ["USR-MGR-MYKHE", "Quản lý CN Mỹ Khê (branch_manager)", "Chỉ br_mykhe", "Xem đầy đủ & Sửa giá", "46.490.000 ₫ · Thử gọi br_songhan/all → 403 PASS"],
            ["USR-MGR-SONGHAN", "Quản lý CN Sông Hàn (branch_manager)", "Chỉ br_songhan", "Xem đầy đủ & Sửa giá", "35.510.000 ₫ · Khóa cứng dropdown br_songhan — PASS"],
            ["USR-STAFF-02", "Lễ tân ca trực (receptionist)", "Chỉ br_mykhe", "Che tài chính & Khóa sửa giá", "Doanh thu null/•••••• ₫ · PUT payout/pricing → 403 PASS"],
            ["USR-MGR-H11", "Quản lý Stay H11 (branch_manager)", "Chỉ stay_h11", "Xem đầy đủ & Sửa giá", "7.600.000 ₫ (2/78 bids) · Chặn sang Đà Nẵng → 403 PASS"],
        ],
        col_widths_cm=[2.8, 3.2, 3.8, 2.7, 4.1],
        header_bg=HEX_INDIGO,
        font_size=8.1,
    )

    add_h2(doc, "4.3. Hiện thực hóa trọn vẹn ý tưởng 3 biểu đồ theo ngày của CTO (dashboard_sample)")
    add_body(
        doc,
        "Qua phân tích trực tiếp sheet dashboard_sample do CTO phác thảo, yêu cầu cốt lõi là thể hiện 3 biểu đồ đường theo ngày song song (1. Đầu vào hàng ngày · 2. Đầu ra hoàn tất hàng ngày · 3. Tỷ lệ chuyển đổi %) gắn chặt bộ lọc branch_id và user_id. Ở bản phác thảo mẫu có hiện tượng tỷ lệ nhảy trên 100% do số liệu ngẫu nhiên hoặc chia tổng lượt bấm lặp lại cho số lượng duy nhất.",
    )
    add_callout(
        doc,
        "Cách xử lý chuẩn xác trên Gold Mart BigQuery (luôn đảm bảo 0% ≤ Tỷ lệ ≤ 100%)",
        [
            "• Tách rạch ròi 2 chỉ số: Tổng lượt bấm xem (total_browse_clicks — phản ánh mức độ khách quay lại cân nhắc nhiều lần) và Số đề nghị duy nhất được xem (step4_unique_viewed_offers = COUNT DISTINCT offer_id).",
            "• Mọi công thức tỷ lệ đều dùng mẫu số duy nhất (SAFE_DIVIDE và giới hạn chuẩn hóa 0%–100%): Tỷ lệ hoàn tất Form (form_completed / form_views) và Tỷ lệ Chọn sau khi Xem (unique_selected_offers / unique_viewed_offers).",
            "• Giao diện cung cấp nút chuyển nhanh 2 góc nhìn ngay trên bộ 3 biểu đồ CTO: (1) Hiệu suất chào giá và (2) Nhu cầu tìm phòng, giữ trục Y của Biểu đồ 3 khóa cứng trong khoảng 0%–100%.",
        ],
        tone="indigo",
    )

    # ==========================================================================
    # CHAPTER 5: 6-LAYER COST GUARDRAIL
    # ==========================================================================
    add_h1(doc, "5.", "Chiến Lược Kiểm Soát Chi Phí BigQuery 6 Lớp (CTO Budget Shield)")
    add_body(
        doc,
        "Đáp ứng trực tiếp lưu ý quan trọng của CTO về việc giới hạn chi phí cho từng lời gọi BigQuery (tránh trường hợp một câu SQL thiếu bộ lọc hoặc vòng lặp giao diện làm phát sinh hóa đơn GCP bất ngờ), Backend BFF áp dụng kiến trúc phòng thủ đa tầng gồm 6 lớp nối tiếp nhau.",
    )
    add_figure(
        doc,
        fig2,
        "Hình 3: Kiến trúc 6 lớp chặn chi phí BigQuery và so sánh mức quét thực tế (~43 KB) với các ngưỡng an toàn.",
        width_cm=16.5,
    )

    add_styled_table(
        doc,
        headers=["Lớp bảo vệ", "Cơ chế kỹ thuật", "Ngưỡng mặc định", "Tác dụng & Bằng chứng kiểm thử"],
        rows=[
            ["Lớp 1\nSQL Safety Guard", "Phân tích tĩnh trước khi gọi GCP: cấm SELECT *, cấm DDL/DML, cấm nhiều câu lệnh.", "Chỉ cho phép SELECT tường minh cột", "TC-COST: chặn 100% câu SQL quét toàn bộ cột hoặc lệnh ghi/xóa."],
            ["Lớp 2\nPer-User Rate Limit", "Giới hạn cửa sổ trượt theo từng user_id + giới hạn riêng cho nút ép làm mới.", "60 req/phút\n(Force Refresh: 10/phút)", "Đã chứng minh giá trị thực tế: tự động chặn HTTP 429 khi QA phát hiện vòng lặp React useEffect!"],
            ["Lớp 3\nCache & Singleflight", "TTL Cache trong BFF + gộp truy vấn đồng thời (Singleflight) + BigQuery 24h Native Cache.", "60 giây (hôm nay)\n15 phút (7d / 30d)", "15 request đồng thời chỉ chạy đúng 1 job BigQuery; các lần gọi lặp lại tốn $0 (0 B billed)."],
            ["Lớp 4\n24h Circuit Breaker", "Cộng dồn tổng bytes tính phí trong 24 giờ trên toàn server BFF.", "500 MiB / 24 giờ\n(tối đa ~$0.003/ngày)", "Tự động ngắt toàn bộ truy vấn mới (HTTP 503) nếu chạm trần ngày."],
            ["Lớp 5\nDry-Run Pre-Flight", "Chạy ước lượng (dryRun: true — Google tính phí $0) trước mỗi job thật.", "Bật mặc định (ON)", "TC-LIVE-07: hạ trần xuống 1 KiB → Dry-Run phát hiện 14 KiB và chặn HTTP 400 với $0 bị trừ."],
            ["Lớp 6\nHard Cap & Timeout", "Truyền maximumBytesBilled + jobTimeoutMs xuống thẳng BigQuery Job API.", "25 MiB/query (trần cứng 100 MiB) · Timeout 10s", "Mọi cấu hình .env gõ nhầm quá 100 MiB đều bị kẹp cứng ở 100 MiB (~$0.0006/query)."],
        ],
        col_widths_cm=[2.9, 4.7, 3.3, 5.7],
        header_bg=HEX_EMERALD,
        font_size=8.3,
    )

    add_callout(
        doc,
        "Hiệu quả chi phí đo thực tế trên project aevo-512307",
        [
            "• Theo bảng giá On-Demand của Google Cloud BigQuery: $6.25 / TiB (và 1 TiB đầu tiên mỗi tháng hoàn toàn MIỄN PHÍ — Free Tier).",
            "• Nhờ phân vùng theo ngày (PARTITION BY metric_date) và chỉ đọc bảng Gold Mart, mỗi truy vấn thực tế từ Dashboard chỉ quét ~42,7 KB (nhỏ hơn trần 25 MiB gần 600 lần) và phần lớn lượt mở trang được phục vụ từ BFF TTL Cache / BigQuery Cache với chi phí $0.",
            "• Ngay cả khi ép hủy cache hoàn toàn ở kịch bản xấu nhất, trần ngày 500 MiB đảm bảo chi phí tối đa không bao giờ vượt quá $0.003/ngày (~75 đồng VND/ngày).",
        ],
        tone="emerald",
    )

    doc.add_page_break()

    # ==========================================================================
    # CHAPTER 6: DASHBOARD INTEGRATION
    # ==========================================================================
    add_h1(doc, "6.", "Tích Hợp Giao Diện Optibide Partner Hub (:5182)")
    add_body(
        doc,
        "Thay vì thay thế hoàn toàn bộ dữ liệu mẫu Local JSON (có thể gây rủi ro khi demo offline hoặc làm gãy các bài kiểm thử cũ), giao diện Partner Hub được nâng cấp theo mô hình Kép (Dual-Mode) kết hợp nhúng trực tiếp biểu đồ BigQuery lên trang Tổng quan:",
    )

    add_bullet(
        doc,
        "1. Bộ chuyển nguồn toàn cục Local JSON ↔ BigQuery trên đầu trang: ",
        "Mặc định khởi động ở Local JSON (0 request ra ngoài). Khi gạt sang BigQuery, toàn bộ trang Tổng quan, Đối soát doanh thu, Lịch đặt phòng, Phòng, Báo giá và ELO lập tức nạp dữ liệu theo đúng quyền user_id từ BFF :4000. Nếu :4000 đang tắt, giao diện tự động quay về Local JSON kèm thông báo an toàn mà không bị trắng trang.",
    )
    add_bullet(
        doc,
        "2. Cụm biểu đồ BigQuery hiển thị trực tiếp ngay trên trang Tổng quan (Cải tiến v1.4): ",
        "Ngay khi bật chế độ BigQuery, component OverviewBigQueryChartsPanel xuất hiện ngay dưới hàng 5 thẻ KPI — trình bày trực tiếp Bộ 3 biểu đồ ngày của CTO (đổi góc nhìn Hiệu suất chào giá ↔ Nhu cầu tìm phòng), Phễu GA4 8 bước, Biểu đồ 5 nhóm Media Ảnh/Video, Tỷ lệ chốt theo iOS/Android/Web, Tóm tắt AI BigQuery, dòng SQL Scope đang áp dụng và nút 1-click nhảy sang kiểm thử 403.",
    )
    add_bullet(
        doc,
        "3. Tab chuyên sâu Kho BigQuery trên menu trái: ",
        "Dành cho buổi demo kỹ thuật cùng CTO & QA — hiển thị bảng theo dõi 6 lớp chặn chi phí theo thời gian thực (Dry-Run bytes, Actual billed, ngân sách 24h, Cache/Singleflight hits) và nút tương tác 'Kiểm thử chặn chéo chi nhánh (403)' chứng minh trực tiếp HTTP 403 FORBIDDEN_BRANCH_SCOPE.",
    )
    add_bullet(
        doc,
        "4. Chuyển đổi nhanh 5 tài khoản phân quyền & Lưu tạm In-Memory: ",
        "Click vào avatar góc phải để đổi giữa 5 hồ sơ (hiển thị sẵn user_id, chip branch_id được cấp và nhãn 'Che tài chính' với Lễ tân). Các thao tác sửa đổi vận hành khi ở chế độ BigQuery được lưu vào lớp Session Overlay trong RAM của BFF (không phát sinh chi phí BigQuery DML và không làm bẩn file seed JSON).",
    )
    add_bullet(
        doc,
        "5. Đa ngôn ngữ, đa tiền tệ & Responsive 7 màn hình: ",
        "Toàn bộ nhãn mới dịch chuẩn 3 ngôn ngữ (Tiếng Việt / English / 한국어), đổi tiền tệ VND / KRW / USD tức thì và vượt qua kiểm tra không tràn ngang trên đủ 7 kích thước (1440×900, 1280×800, 1024×768, 768×1024, 390×844, 375×667 và 360×800).",
    )

    # ==========================================================================
    # CHAPTER 7: IMPLEMENTATION LOG, INCIDENTS FIXED & QA GATE
    # ==========================================================================
    add_h1(doc, "7.", "Nhật Ký Triển Khai, Bài Học Kỹ Thuật & Kết Quả Kiểm Định (QA Gate)")
    add_h2(doc, "7.1. Các vấn đề thực tế đã phát hiện và xử lý dứt điểm trong quá trình xây dựng")
    add_styled_table(
        doc,
        headers=["Vấn đề thực tế gặp phải", "Nguyên nhân gốc rễ", "Giải pháp xử lý & Phòng ngừa lâu dài"],
        rows=[
            [
                "Lỗi lệch vùng BigQuery khi chạy MCP",
                "BigQuery MCP mặc định thực thi tại vùng US, xung đột khi tạo dataset ở asia-southeast1.",
                "Thống nhất toàn bộ 3 dataset trên aevo-512307 ở vùng US, đồng bộ script deploy + BFF config (khi lên Production thật sẽ đặt đồng bộ tại asia-southeast1).",
            ],
            [
                "BigQuery SDK v8 trả về 0 dòng với tham số ngày",
                "Truyền chuỗi '2026-10-08' kèm types: {startDate: 'DATE'} bị SDK v8 serialize thành NULL.",
                "Bọc tường minh bằng BigQuery.date(window.startDate) và BigQuery.date(window.endDate) trong bigqueryService.ts; xác minh bằng 7 test tích hợp sống.",
            ],
            [
                "Vòng lặp fetch vô hạn trên Frontend khi bật BigQuery",
                "Đưa mảng effectiveAllowedBranches vào dependency array của useEffect khiến setBundle kích hoạt gọi lại liên tục — và chính Lớp 2 Rate Limiter (60 req/p) của BFF đã bắt và chặn bằng HTTP 429!",
                "Chỉ dùng 3 biến nguyên thủy (dataSourceMode, targetUserId, bundleScopeBranch) làm dependency; mỗi lần chuyển nguồn/tài khoản chỉ gọi đúng 1 lượt duy nhất.",
            ],
            [
                "Popover Thông báo đè lên nút Chuông trên Mobile (≤390px)",
                "Khi thêm cụm Local JSON | BigQuery, header di động bọc thành 3 hàng (~138px), làm popover fixed top-28 (112px) đè lên nút chuông.",
                "Nâng vị trí popover lên top-36 (144px) trên mobile trong PartnerHubShell.tsx; cả 7/7 viewport pass 100%.",
            ],
            [
                "Nút 'Chi phí & Test 403' bị đẩy tràn mép phải trên 360×800",
                "Thẻ chứa cụm nút trên thanh tiêu đề biểu đồ dùng shrink-0, đẩy nút ra ngoài khung hiển thị 360px.",
                "Thay shrink-0 bằng min-w-0 max-w-full và thêm bài test TC-BQ-06 kiểm chứng click thực tế ở độ phân giải 360×800.",
            ],
        ],
        col_widths_cm=[3.9, 5.8, 6.9],
        header_bg=HEX_AMBER,
        font_size=8.2,
    )

    add_h2(doc, "7.2. Tổng hợp kết quả kiểm định tự động (73 / 73 PASS · 0 Lỗi)")
    add_styled_table(
        doc,
        headers=["Hạng mục kiểm định", "Phạm vi & Mã kịch bản kiểm thử", "Kết quả"],
        rows=[
            ["Python Warehouse Generator", "30 shard GA4, giới hạn ≤25 params/40 chars, 5 hồ sơ RBAC, 0% PII, khớp chính xác 111.960.000 ₫ (161 bids).", "3 / 3 PASS"],
            ["BigQuery BFF (:4000)\nUnit + Live GCP aevo-512307", "HS256 JWT, chặn 401/403 BOLA (0B quét), che tài chính Lễ tân, 6 lớp Cost Guard (TC-LIVE-01..07 gồm Dry-Run $0).", "14 / 14 PASS"],
            ["Dashboard Unit, Contract,\nRBAC & TypeScript Gate", "TC-BUILD-01 (tsc --noEmit), TC-DATA-01..11 (5 hồ sơ RBAC), TC-RBAC-01..03, TC-OVW, TC-MOD, TC-UNIT.", "32 / 32 PASS"],
            ["Playwright E2E, BigQuery Live\n& 7-Viewport Responsive", "TC-API, TC-BQ-01..06 (số nhảy +66,4tr→+104,4tr, biểu đồ inline Tổng quan, 403 sống, mobile 360×800), TC-UI, TC-LEFT, TC-FLOW, 7/7 Viewports.", "24 / 24 PASS"],
            ["Production Build & Graphify", "tsc -b && vite build (dist/ sạch 0 lỗi) + khôi phục seed JSON tự động + đồng bộ graphify.", "Đạt (0 lỗi)"],
        ],
        col_widths_cm=[4.2, 9.8, 2.6],
        header_bg=HEX_NAVY,
        font_size=8.4,
    )

    doc.add_page_break()

    # ==========================================================================
    # CHAPTER 8: ROADMAP FOR STAGING & PRODUCTION
    # ==========================================================================
    add_h1(doc, "8.", "Lộ Trình Cải Tiến Tiếp Theo (Từ POC Lên Staging & Production)")
    add_body(
        doc,
        "Bản triển khai hiện tại (v1.4) đã sẵn sàng 100% để trình diễn trực tiếp cho CTO và Ban Lãnh Đạo. Để đưa kiến trúc này vào vận hành thực tế trên dữ liệu thật của goodNstay, lộ trình phát triển tiếp theo được chia thành 4 chặng rõ ràng (sẽ được cập nhật trạng thái vào tài liệu này sau mỗi sprint):",
    )

    add_styled_table(
        doc,
        headers=["Chặng / Mục tiêu", "Đầu việc cụ thể", "Phụ thuộc / Phối hợp", "Ưu tiên"],
        rows=[
            [
                "Chặng 1\nTối ưu Kho & Khóa Chi Phí Tầng GCP",
                "• Chuyển build_analytics_marts.sql từ chạy toàn phần sang Scheduled Query / Dataform Incremental (chỉ MERGE 1–2 ngày gần nhất).\n• Bật GCP Billing Budget Alert (50%/80%/100%) và BigQuery Custom Quota (QueryUsagePerDay).",
                "Có thể chuẩn bị sẵn SQL ngay; bật Quota cần quyền Admin GCP.",
                "P0 — Làm trước khi mở Staging",
            ],
            [
                "Chặng 2\nKết Nối Dữ Liệu Thật & Xác Thực Production",
                "• Bật GA4 → BigQuery Export (Daily + Intraday) trên GCP chính thức của goodNstay, đặt tại vùng asia-southeast1 (Singapore).\n• Đồng bộ 4 bảng OLTP thật sang BigQuery (Datastream/CDC hoặc batch hằng ngày).\n• Thay endpoint login demo bằng xác thực JWT thật của API Gateway goodNstay (verify JWKS) + Service Account quyền tối thiểu (chỉ đọc gns_analytics_mart).",
                "Phối hợp CTO, Backend Team & DevOps goodNstay.",
                "P0 — Điều kiện lên Production",
            ],
            [
                "Chặng 3\nĐóng Gói Hạ Tầng & Mở Rộng Tải",
                "• Tạo Dockerfile, .env.example và CI/CD deploy dashboard/bigquery-bff lên Cloud Run / Kubernetes.\n• Chuyển TTL Cache & Rate Limiter từ RAM sang Redis để chia sẻ trạng thái giữa nhiều instance BFF.\n• Cấu hình CORS theo domain thật (partner.stag.goodnstay.com / partner.goodnstay.com).",
                "Phối hợp DevOps / Infrastructure.",
                "P1 — Triển khai Staging",
            ],
            [
                "Chặng 4\nNâng Cấp AI Advisor Chatbot (Gemini)",
                "• Kết nối trực tiếp Gemini API vào mart_branch_ai_advisor_snapshots (áp dụng cùng lớp phân quyền user_id × branch_id).\n• Cho phép chủ khách sạn hỏi đáp bằng tiếng Việt/Anh/Hàn: 'Vì sao tuần này chi nhánh Mỹ Khê thắng thầu nhiều hơn Sông Hàn và cần chỉnh tiêu chí nào?'.",
                "Tận dụng ngay tầng Gold Mart & BFF đã dựng sẵn.",
                "P2 — Mở rộng giá trị kinh doanh",
            ],
        ],
        col_widths_cm=[3.2, 7.6, 3.3, 2.5],
        header_bg=HEX_INDIGO,
        font_size=8.3,
    )

    add_h2(doc, "Hướng dẫn chạy Demo & Hướng dẫn cập nhật tài liệu về sau")
    add_callout(
        doc,
        "Lệnh khởi chạy Demo trực tiếp (2 Terminal song song) & Cập nhật file .docx",
        [
            "1. Bật Backend BigQuery BFF (:4000):   cd dashboard/bigquery-bff && npm run dev",
            "2. Bật Optibide Partner Hub (:5182):   cd dashboard/dashboard && npm run dev",
            "3. Truy cập http://localhost:5182 → Gạt Local JSON ↔ BigQuery để thấy số liệu nhảy (+66,4tr ₫ → +104,4tr ₫) kèm 3 biểu đồ CTO hiện ngay trên Tổng quan → Click avatar đổi 5 tài khoản → Bấm 'Chi phí & Test 403' để xem chặn chéo 403 thực tế.",
            "4. Quy trình cập nhật báo cáo này ở các sprint sau: chỉnh sửa bảng REVISION_HISTORY / số liệu / trạng thái trong docs/ga4-bigquery/build_ga4_bigquery_report_docx.py rồi chạy lệnh python3 docs/ga4-bigquery/build_ga4_bigquery_report_docx.py để tự động vẽ lại biểu đồ và xuất lại file .docx sạch đẹp.",
        ],
        tone="indigo",
    )

    OUTPUT_DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUTPUT_DOCX))
    return OUTPUT_DOCX


if __name__ == "__main__":
    out = build_docx()
    print(f"Successfully generated: {out} ({out.stat().st_size:,} bytes)")
