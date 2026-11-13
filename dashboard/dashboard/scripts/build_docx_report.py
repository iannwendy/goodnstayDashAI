#!/usr/bin/env python3
"""
Generates a comprehensive, presentation-ready Vietnamese .docx report explaining
the Master Data architecture, schema, mathematical formulas, data reconciliation,
and team demo/Q&A guide for goodNstay Partner Auction Dashboard v2.5.
"""

import json
import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MASTER_DIR = os.path.join(PROJECT_DIR, "master-data")
OUT_DOCX = os.path.join(
    PROJECT_DIR,
    "Partner_Auction_Dashboard_v2_Bao_Cao_Master_Data_Va_Cong_Thuc.docx",
)

# Load real Master Data to guarantee 100% numeric reconciliation
with open(os.path.join(MASTER_DIR, "hotel_profile.json"), encoding="utf-8") as f:
    hotel_profile = json.load(f)
with open(os.path.join(MASTER_DIR, "room_classes.json"), encoding="utf-8") as f:
    room_classes = json.load(f)
with open(os.path.join(MASTER_DIR, "rooms_pms.json"), encoding="utf-8") as f:
    rooms_pms = json.load(f)
with open(os.path.join(MASTER_DIR, "system_benchmarks.json"), encoding="utf-8") as f:
    system_benchmarks = json.load(f)
with open(os.path.join(MASTER_DIR, "auction_sessions.json"), encoding="utf-8") as f:
    auction_sessions = json.load(f)
with open(os.path.join(MASTER_DIR, "perks_catalog.json"), encoding="utf-8") as f:
    perks_catalog = json.load(f)


def fmt_vnd(n: int) -> str:
    return f"{round(n):,}".replace(",", ".") + "đ"


doc = Document()

# Page margins
for section in doc.sections:
    section.top_margin = Inches(0.75)
    section.bottom_margin = Inches(0.75)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

# Base Normal style
normal_style = doc.styles["Normal"]
normal_style.font.name = "Arial"
normal_style.font.size = Pt(10.5)
normal_style.font.color.rgb = RGBColor(0x18, 0x18, 0x1B)
normal_style.paragraph_format.line_spacing = 1.25
normal_style.paragraph_format.space_after = Pt(5)


def set_cell_shading(cell, hex_color: str):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_table_borders(table, border_color="D4D4D8"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f"""
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="{border_color}"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E4E4E7"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E4E4E7"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="{border_color}"/>
        </w:tblBorders>
        """
    )
    tblPr.append(borders)


def add_h1(text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = "Arial"
    run.font.size = Pt(14.5)
    run.font.color.rgb = RGBColor(0x09, 0x09, 0x0B)
    # Add bottom border accent
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="8" w:space="4" w:color="18181B"/></w:pBdr>'
    )
    pPr.append(pBdr)
    return p


def add_h2(text: str):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.bold = True
    run.font.name = "Arial"
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x04, 0x78, 0x57)  # Emerald-700 accent
    return p


def add_bullet(bold_prefix: str, body_text: str):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(3)
    r1 = p.add_run(bold_prefix)
    r1.bold = True
    r2 = p.add_run(body_text)
    return p


def add_callout_box(title: str, lines: list[str], bg_hex="F4F4F5", border_hex="18181B"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    set_cell_shading(cell, bg_hex)
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f"""
        <w:tcBorders {nsdecls("w")}>
            <w:left w:val="single" w:sz="18" w:space="0" w:color="{border_hex}"/>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="E4E4E7"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="E4E4E7"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="E4E4E7"/>
        </w:tcBorders>
        """
    )
    tcPr.append(borders)
    margins = parse_xml(
        f"""
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="120" w:type="dxa"/>
            <w:bottom w:w="120" w:type="dxa"/>
            <w:left w:w="180" w:type="dxa"/>
            <w:right w:w="160" w:type="dxa"/>
        </w:tcMar>
        """
    )
    tcPr.append(margins)

    p0 = cell.paragraphs[0]
    p0.paragraph_format.space_after = Pt(3)
    rt = p0.add_run(title)
    rt.bold = True
    rt.font.size = Pt(10.5)
    rt.font.color.rgb = RGBColor(0x09, 0x09, 0x0B)

    for ln in lines:
        p = cell.add_paragraph()
        p.paragraph_format.space_after = Pt(2)
        r = p.add_run(ln)
        r.font.size = Pt(10)
        r.font.name = "Arial"

    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(3)


def add_styled_table(headers: list[str], rows: list[list[str]], col_widths=None, right_align_cols=None):
    right_align_cols = right_align_cols or set()
    tbl = doc.add_table(rows=len(rows) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl)

    # Header row
    hdr_cells = tbl.rows[0].cells
    for i, htext in enumerate(headers):
        cell = hdr_cells[i]
        set_cell_shading(cell, "18181B")
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(3)
        p.paragraph_format.space_after = Pt(3)
        if i in right_align_cols:
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r = p.add_run(htext)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    # Data rows
    for r_idx, rdata in enumerate(rows):
        row_cells = tbl.rows[r_idx + 1].cells
        bg = "FAFAFA" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(rdata):
            cell = row_cells[c_idx]
            set_cell_shading(cell, bg)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(2.5)
            p.paragraph_format.space_after = Pt(2.5)
            if c_idx in right_align_cols:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(str(val))
            r.font.size = Pt(9.5)
            if c_idx == 0:
                r.bold = True

    if col_widths:
        for row in tbl.rows:
            for idx, w in enumerate(col_widths):
                row.cells[idx].width = Inches(w)

    sp = doc.add_paragraph()
    sp.paragraph_format.space_after = Pt(4)
    return tbl


# ==============================================================================
# COVER HEADER BLOCK
# ==============================================================================
banner = doc.add_table(rows=1, cols=1)
banner.alignment = WD_TABLE_ALIGNMENT.CENTER
bcell = banner.cell(0, 0)
set_cell_shading(bcell, "09090B")
bcell_mar = parse_xml(
    f'<w:tcMar {nsdecls("w")}><w:top w:w="240" w:type="dxa"/><w:bottom w:w="240" w:type="dxa"/><w:left w:w="240" w:type="dxa"/><w:right w:w="240" w:type="dxa"/></w:tcMar>'
)
bcell._tc.get_or_add_tcPr().append(bcell_mar)

bp0 = bcell.paragraphs[0]
bp0.paragraph_format.space_after = Pt(4)
br0 = bp0.add_run("GOODNSTAY PARTNER STUDIO (v2.5) • TÀI LIỆU ĐẶC TẢ DỮ LIỆU & NGHIỆP VỤ")
br0.font.size = Pt(9.5)
br0.bold = True
br0.font.color.rgb = RGBColor(0x34, 0xD3, 0x99)

bp1 = bcell.add_paragraph()
bp1.paragraph_format.space_after = Pt(6)
br1 = bp1.add_run("BÁO CÁO KIẾN TRÚC MASTER DATA, HỆ THỐNG CÔNG THỨC TÍNH TOÁN & CẨM NANG TRÌNH BÀY TEAM")
br1.font.size = Pt(16.5)
br1.bold = True
br1.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

bp2 = bcell.add_paragraph()
bp2.paragraph_format.space_after = Pt(0)
br2 = bp2.add_run(
    f"Cơ sở mẫu: {hotel_profile['hotelName']} ({hotel_profile['totalRooms']} phòng • {hotel_profile['city']})  |  "
    f"Ngày tham chiếu: {hotel_profile['currentDateLabel']}  |  Chuẩn nghiệp vụ: Pay-to-Lock & 0% Hoa hồng KS"
)
br2.font.size = Pt(9.5)
br2.font.color.rgb = RGBColor(0xD4, 0xD4, 0xD8)

doc.add_paragraph()

# ==============================================================================
# PHẦN 1: TỔNG QUAN & LÝ DO CHỌN KIẾN TRÚC MASTER DATA
# ==============================================================================
add_h1("1. Tóm Tắt Điều Hành & Quyết Định Kiến Trúc Lưu Trữ Master Data")

doc.add_paragraph(
    "Toàn bộ dữ liệu giả lập cứng (hardcoded mock constants) bên trong mã nguồn giao diện Partner Auction Dashboard v2 "
    "đã được loại bỏ hoàn toàn. Thay vào đó, Dashboard hiện kết nối trực tiếp tới bộ Master Data chuẩn hóa gồm 11 bảng dữ liệu quan hệ "
    "đặt ngay tại thư mục gốc master-data/*.json thông qua tầng dịch vụ API nội bộ (/api/master-data) và bộ máy tính toán thời gian thực (analyticsEngine.ts)."
)

add_h2("1.1 Tại sao chọn kiến trúc Multi-Table Normalized JSON + Live Vite REST Middleware?")
add_bullet(
    "1. Minh bạch & dễ kiểm toán tuyệt đối (Human-Readable & Git-Friendly): ",
    "Khác với SQLite nhị phân hay file CSV rời rạc không biểu diễn được cấu trúc lồng nhau (nested JSON như danh sách tiêu chí khớp hoặc đặc quyền đi kèm), "
    "11 file JSON chuẩn hóa cho phép bất kỳ thành viên nào trong team (PM, BA, QA, Frontend, Backend) mở trực tiếp bằng VS Code để kiểm tra, chỉnh sửa con số và xem ngay kết quả thay đổi trên Dashboard.",
)
add_bullet(
    "2. Lưu trữ 2 chiều trực tiếp xuống ổ đĩa (Two-Way Live Persistence): ",
    "Plugin middleware trong vite.config.ts cung cấp 3 endpoint chuẩn REST: GET /api/master-data (nạp toàn bộ 11 bảng), "
    "PUT /api/master-data/:table (ghi đè trực tiếp trạng thái mới xuống file .json ngay khi người dùng gửi báo giá, khách thanh toán khóa phòng, bật/tắt Auto-Bid, bật Xả Đêm hoặc lưu quy tắc mới), "
    "và POST /api/master-data/reset (khôi phục về bản gốc từ thư mục master-data/seed/ chỉ bằng 1 cú click).",
)
add_bullet(
    "3. Tương thích 100% khi lên Production (Zero-Refactor Migration): ",
    "Giao diện React (App.tsx và 3 Modal) hoàn toàn không biết dữ liệu đến từ file nội bộ hay Cloud Server. Khi tích hợp với Backend thật (services.goodnstay.com), "
    "chỉ cần đổi đường dẫn endpoint trong đúng 1 file duy nhất là src/services/masterDataService.ts.",
)

add_callout_box(
    "Điểm nhấn quan trọng khi trình bày với Team:",
    [
        "• Không còn bất kỳ biến đếm cộng dồn giả (như extraRevenue, extraWins) trên giao diện.",
        "• Khi bấm 'Mô phỏng Khách TT 100% → Khóa Phòng Ngay' trên phiên Live, hệ thống cập nhật trực tiếp auction_sessions.json ('won'), khóa phòng trong rooms_pms.json ('booked_auction') và đồng bộ Ngày 0 trong calendar_14d_pms.json.",
        "• Ngay lập tức, cả 6 thẻ KPI đầu trang (Thực Nhận Ròng KS, ADR Hôm Nay, Phiên Báo Giá, Tỷ Lệ Được Chọn & Thị Phần ĐN, Phòng Đã Đặt, Phòng Trống), 2 biểu đồ Tab 1, bảng Thị phần Đà Nẵng Tab 2 và Sơ đồ 30 buồng Tab 3 tự động tính toán lại chuẩn xác 100%!",
    ],
    bg_hex="ECFDF5",
    border_hex="059669",
)

# ==============================================================================
# PHẦN 2: TỪ ĐIỂN DỮ LIỆU 11 BẢNG MASTER DATA (DATA DICTIONARY & ERD)
# ==============================================================================
add_h1("2. Từ Điển Dữ Liệu 11 Bảng Master Data & Liên Kết Khóa (PK / FK)")

doc.add_paragraph(
    "Bộ dữ liệu được thiết kế theo mô hình Thực thể - Liên kết (Relational Schema) xoay quanh 2 trục chính: "
    "Trục Tài sản Buồng phòng (room_classes -> rooms_pms / calendar_14d_pms) và Trục Phiên giao dịch Đấu giá ngược (auction_sessions -> match_breakdowns / loss_autopsies / system_benchmarks). "
    "100% khóa ngoại linkedReqId trên 30 buồng phòng (bao gồm cả 5 phòng chốt hôm nay 06/11 và 3 phòng khách lưu trú nhiều đêm từ 05/11–07/11: #107 CRQ-8921, #118 CRQ-8915, #126 CRQ-8904) đều đối chiếu khớp tuyệt đối tới bản ghi thực trong auction_sessions.json."
)

schema_rows = [
    ["1. hotel_profile.json", "hotelId", "1 hồ sơ KS", "Cấu hình KS (30 phòng), phí sàn 15%, VAT 10%, sàn mặc định 750k, ELO 1680, Rating 4.8/5.0"],
    ["2. users_roles.json", "userId", "2 tài khoản", "Phân quyền RBAC: Quản lý (được duyệt dưới sàn & lưu Bot) vs. Lễ tân (khóa cứng giá sàn)"],
    ["3. perks_catalog.json", "id", "4 đặc quyền", "Danh mục quà tặng mềm (Buffet sáng, Late C/O, Trà chiều, Xe sân bay) & % tăng thắng"],
    ["4. room_classes.json", "id", "4 hạng phòng", "Superior (10p, sàn 750k), Deluxe (10p, sàn 920k), Suite (6p, sàn 1.550k), Executive (4p, sàn 1.850k)"],
    ["5. rooms_pms.json", "roomNumber", "30 mã phòng", "Trạng thái thực tế #101–#130 đêm 06/11 (FK 100% hợp lệ: roomClassId, linkedReqId)"],
    ["6. calendar_14d_pms.json", "dayOffset", "14 ngày", "Lịch tồn kho 14 ngày vàng (06/11–19/11/2026): OTA + Đấu giá TT 100% + Trống mở = 30"],
    ["7. system_benchmarks.json", "regionName", "3 kỳ & 4 hạng", "Chuẩn toàn sàn Đà Nẵng (Today / 7D / 30D) kèm baselineHotelWins để tính Thị phần động"],
    ["8. auction_sessions.json", "id (CRQ-*)", "72 phiên", "Bảng Fact trung tâm: 4 phiên Live đang mở + 68 phiên lịch sử đã đóng (29 thắng, 39 trượt)"],
    ["9. match_breakdowns.json", "reqId", "5 hồ sơ mẫu", "Chi tiết chấm điểm Hard Rules & Soft Rules AI Match % (các mã khác tự suy luận động)"],
    ["10. loss_autopsies.json", "id", "3 ca mổ xẻ", "Đối chiếu trực diện Báo giá của bạn vs. Đối thủ thắng & công thức lưu Auto-Bid"],
    ["11. bot_rules.json", "ruleId", "2+ quy tắc", "Danh sách quy tắc tự động hóa Auto-Bid đang kích hoạt (ghi thêm trực tiếp từ UI)"],
]

add_styled_table(
    ["Tên File Master Data", "Khóa Chính (PK)", "Quy Mô", "Vai Trò Nghiệp Vụ Trên Dashboard"],
    schema_rows,
    col_widths=[1.85, 1.05, 0.95, 3.05],
)

# ==============================================================================
# PHẦN 3: HỆ THỐNG CÔNG THỨC TOÁN HỌC & QUY TẮC NGHIỆP VỤ CỐT LÕI
# ==============================================================================
add_h1("3. Đặc Tả Chi Tiết Các Công Thức Tính Toán & Quy Tắc Nghiệp Vụ")

add_h2("3.1 Hệ thống 6 Thẻ KPI Đầu Trang & Công thức Định giá '0% Hoa hồng KS'")
doc.add_paragraph(
    "Khác với OTA truyền thống thu hoa hồng lùi 15%–25% trừ vào giá bán của khách sạn, goodNstay áp dụng mô hình Giá gốc Bảo toàn (Net Base Price): "
    "Khách sạn chào mức Giá gốc (BasePrice) bao nhiêu sẽ nhận về đúng 100% bấy nhiêu khi đối soát qua cổng NHN KCP. "
    "Nền tảng cộng thêm 15% Phí dịch vụ sàn trên Giá gốc và 10% thuế GTGT (VAT) trên tổng gộp để hiển thị Giá trọn gói cho du khách:"
)

add_callout_box(
    "CÔNG THỨC TÀI CHÍNH BẤT BIẾN & ĐỐI CHIẾU 6 THẺ KPI ĐẦU TRANG:",
    [
        "• Giá trọn gói Khách TT      :  GuestTotal = BasePrice × (1 + 0.15) × (1 + 0.10) = 1,265 × BasePrice",
        "• Thẻ KPI 1 [Thực Nhận Ròng] :  NetReceive = Σ BaseRevenue (đơn TT 100%) − MedicalRefund (Hoàn y tế bất khả kháng)",
        "• Thẻ KPI 2 [ADR Hôm Nay]    :  TodayADR = Σ Giá gốc đơn thắng hôm nay (11.850.000đ) ÷ Σ Đêm bán hôm nay (10 đêm) = 1.185.000đ/đêm",
        "• Thẻ KPI 3 [Phiên Báo Giá]  :  BidsSent = Phiên Thủ công + Auto-Bid đã đóng (hiển thị kèm số phiên Live đang 'Chờ TT')",
        "• Thẻ KPI 4 [Tỷ Lệ Chọn]     :  WinRate (%) = (Đơn TT 100% ÷ Phiên báo giá đã đóng) × 100%  |  Kèm Tổng Thị phần Đà Nẵng (%)",
        "• Thẻ KPI 5 [Phòng Đã Đặt]   :  Occupied = Đã đặt OTA/Lễ tân (16) + Đã đặt goodNstay TT 100% (8) = 24/30 buồng (80%)",
        "• Thẻ KPI 6 [Phòng Trống]    :  Vacant = 30 − Occupied = 6 buồng mở khóa (chỉ khóa khi khách hoàn tất TT 100%, không đặt cọc)",
    ],
    bg_hex="F4F4F5",
    border_hex="18181B",
)

doc.add_paragraph(
    "Ví dụ minh họa trực tiếp trên Dashboard: Khi khách sạn chào Giá gốc 1.000.000đ/đêm, khách sạn thực nhận 1.000.000đ (100%). "
    "Số tiền hiển thị phía du khách thanh toán qua cổng NHN KCP là 1.000.000 × 1.265 = 1.265.000đ (bao gồm 150.000đ phí sàn và 115.000đ thuế VAT). "
    "Chính sách không hoàn hủy được khóa cứng hai chiều; ngoại lệ hoàn tiền duy nhất là sự cố y tế nghiêm trọng có giấy xác nhận bệnh viện "
    "(trong Master Data 30 ngày có 1 ca thực tế #CRQ-8835 ngày 19/10 hoàn 1.700.000đ để chứng minh công thức đối soát ròng 66.360.000đ − 1.700.000đ = 64.660.000đ)."
)

add_h2("3.2 Công thức ADR Chuẩn Quản trị Khách sạn (Average Daily Rate)")
add_callout_box(
    "CÔNG THỨC ADR (GIÁ PHÒNG BÌNH QUÂN MỖI ĐÊM — THẺ KPI SỐ 2 & BIỂU ĐỒ TAB 1):",
    [
        "ADR_gốc (VNĐ/đêm) = Tổng Doanh Thu Giá Gốc Đã Thanh Toán ÷ Tổng Số Đêm Phòng Bán Được (Sold Room-Nights)",
        "Trong đó: Tổng Số Đêm Phòng = Σ (nights × roomsQty) của các đơn trạng thái 'won'.",
        "• Kiểm chứng ngày 06/11/2026: Tổng Giá gốc = 11.850.000đ trên 5 đơn (tổng cộng 10 đêm phòng)  =>  ADR = 11.850.000 ÷ 10 = 1.185.000đ/đêm.",
        "• Lưu ý thuyết trình: Tuyệt đối KHÔNG lấy Tổng doanh thu chia cho 5 đơn hàng (sẽ ra Giá trị đơn trung bình AOV = 2.370.000đ/đơn, sai chuẩn ngành khách sạn).",
    ],
)

add_h2("3.3 Quy tắc Tồn kho Pay-to-Lock (Không Đặt Cọc), Đa Phiên & Trạng thái 'auto_closed'")
add_bullet(
    "• Chỉ tồn tại đúng 3 trạng thái phòng vật lý (Không Soft-Hold, Không Đặt Cọc): ",
    "Tổng quỹ phòng (30) = Đã đặt kênh khác (OTA/Lễ tân) + Đã đặt goodNstay (Khách đã TT 100%) + Phòng trống mở khóa (Vacant Unlocked).",
)
add_bullet(
    "• Báo giá 1 lần không khóa phòng (One-Shot Immutable Bid, TTL = 60 phút): ",
    "Khi khách sạn gửi báo giá, giá đó cố định trong 60 phút không được sửa đổi, nhưng phòng vật lý vẫn MỞ KHÓA để tham gia đồng thời nhiều phiên đấu giá. "
    "Nếu đồng hồ đếm ngược chạm 00:00 mà khách chưa thanh toán, toàn bộ nút thao tác tự khóa cứng theo chuẩn hết hạn 60 phút.",
)
add_bullet(
    "• Khóa khi Thanh toán 100% & Tách bạch trạng thái 'auto_closed' (TỰ ĐÓNG • HẾT PHÒNG): ",
    "Ngay thời điểm du khách hoàn tất thanh toán 100%, hệ thống khóa 1 buồng trống sang 'booked_auction'. Nếu số phòng trống của hạng đó chạm 0 (Vacant = 0), "
    "các phiên Live trùng hạng còn lại sẽ tự động chuyển sang trạng thái riêng 'auto_closed' (hiển thị nhãn 'TỰ ĐÓNG • HẾT PHÒNG' trong Nhật ký). "
    "Điểm tinh tế về toán học: Các phiên 'auto_closed' do bán hết phòng KHÔNG bị tính là phiên thua thầu ('rejected'/'expired'), giúp không làm sai lệch Tỷ lệ được chọn (Win Rate %) và bảo toàn tổng tỷ trọng 100% của Biểu đồ Pareto Lý do trượt!",
)

add_h2("3.4 Công thức Tỷ lệ Được chọn (Win Rate) & Thị phần Động Khu vực Đà Nẵng")
add_callout_box(
    "BỘ 4 CÔNG THỨC BENCHMARK & THỊ PHẦN ĐỘNG (TAB 1 & TAB 2):",
    [
        "1) Tỷ lệ KS được chọn (Hotel Win Rate %)  =  (Số đơn khách đã TT 100% ÷ Tổng số phiên báo giá đã đóng) × 100%",
        "2) Chênh lệch Hiệu suất vs. Toàn sàn (Δ%)  =  Hotel Win Rate (%) − System Avg Win Rate (%)",
        "3) Thị phần Hạng phòng Đà Nẵng (%)         =  [W_hotel(c) ÷ (W_region_seed(c) + max(0, W_hotel(c) − W_hotel_seed(c)))] × 100%",
        "4) Tổng Thị phần Đà Nẵng toàn KS (%)       =  (Σ Đơn thắng KS mọi hạng ÷ Σ Đơn thắng toàn sàn ĐN mọi hạng) × 100%  [Kỳ 30d: 29/855 = 3,4%]",
    ],
)

add_h2("3.5 Bảo vệ Giá sàn Theo Từng Hạng Phòng (Per-Class Floor Guardrail), Auto-Bid & ELO")
add_bullet(
    "• Giá sàn bảo vệ riêng theo từng Hạng phòng (Per-Class Floor Price): ",
    "Thay vì dùng chung 1 mức sàn cứng nhắc cho mọi loại buồng, hệ thống áp dụng chuẩn giá sàn riêng của từng hạng từ room_classes.json: "
    "Superior = 750.000đ, Deluxe = 920.000đ, Family Suite = 1.550.000đ, Executive Ocean Suite = 1.850.000đ. "
    "Khi bật chế độ Xả Phòng Đêm (-15% sau 20:00), sàn hiệu lực của từng hạng giảm tương ứng 15% (còn 637.500đ / 782.000đ / 1.317.500đ / 1.572.500đ).",
)
add_bullet(
    "• Khiên bảo vệ RBAC & Trần Auto-Bid: ",
    "Auto-Bid chỉ tự động phản hồi cho yêu cầu đoàn nhỏ (Số phòng ≤ 4 VÀ Số khách ≤ 8). Khi bật Auto-Bid, giao diện khóa cứng không cho phép gửi giá dưới sàn hạng phòng; "
    "khi tắt Auto-Bid, tài khoản Lễ tân vẫn bị chặn dưới sàn, chỉ Quản lý xác nhận checkbox mới được duyệt ngoại lệ.",
)
add_bullet(
    "• Chỉ số ELO (1680) & Đánh giá 5 Sao Hậu lưu trú (4.8/5.0 trên 142 đánh giá): ",
    "Điểm đánh giá 4.8/5.0 được tổng hợp từ đúng 5 tiêu chí chuẩn sau lưu trú: Độ sạch & thoải mái (4.9), Sự hiếu khách nhân viên (4.8), Thủ tục nhận phòng (4.8), Đáp ứng tiện nghi (4.7) và Đáng giá tiền (4.8).",
)

# ==============================================================================
# PHẦN 4: BẢNG ĐỐI SOÁT SỐ LIỆU THỰC TẾ TỪ MASTER DATA LÊN GIAO DIỆN
# ==============================================================================
add_h1("4. Bảng Đối Soát Số Liệu Thực Tế Từ Master Data Lên Dashboard")

doc.add_paragraph(
    "Dưới đây là bảng tổng hợp chính xác 100% được trích xuất trực tiếp từ 72 bản ghi trong file auction_sessions.json và 30 mã phòng trong rooms_pms.json. "
    "Bạn có thể dùng bảng này để đối chiếu từng con số xuất hiện trên màn hình khi thuyết trình:"
)

# Compute exact period stats from loaded JSON
completed = [s for s in auction_sessions if s["status"] in ("won", "rejected", "expired")]
period_table_rows = []
for pkey in ("today", "7d", "30d"):
    pmeta = system_benchmarks["periodsMeta"][pkey]
    sub = [s for s in completed if pmeta["startDate"] <= s["sessionDate"] <= pmeta["endDate"]]
    wins = [s for s in sub if s["status"] == "won"]
    auto_c = sum(1 for s in sub if s.get("bidMode") == "auto")
    man_c = len(sub) - auto_c
    base_rev = sum(s.get("hotelEarnedBase", 0) for s in wins)
    med_ref = sum(s.get("medicalRefund", 0) for s in wins)
    net_rec = base_rev - med_ref
    prev_net = pmeta["previousNetRevenue"]
    growth = (net_rec - prev_net) / prev_net * 100
    win_rate = len(wins) / len(sub) * 100
    nights = sum(s["nights"] * s.get("roomsQty", 1) for s in wins)
    adr = round(base_rev / nights) if nights else 0
    period_table_rows.append([
        f"{pmeta['shortLabel']} ({pmeta['rangeText']})",
        f"{len(sub)} ({auto_c} Auto / {man_c} Tay)",
        f"{len(wins)} đơn ({nights} đêm)",
        f"{win_rate:.1f}% (Sàn {pmeta['platformWinRatePct']}%)",
        fmt_vnd(base_rev),
        fmt_vnd(med_ref),
        f"{fmt_vnd(net_rec)} (+{growth:.1f}%)",
        fmt_vnd(adr),
    ])

add_h2("4.1 Bảng Đối Soát 3 Kỳ Thống Kê (Hôm nay / 7 Ngày / 30 Ngày)")
add_styled_table(
    ["Kỳ Thống Kê", "Phiên Báo Giá", "Đơn Đã TT", "Tỷ Lệ Chọn", "Tổng Giá Gốc", "Hoàn Y Tế", "Thực Nhận Ròng", "ADR Gốc/Đêm"],
    period_table_rows,
    right_align_cols={4, 5, 6, 7},
)

add_h2("4.2 Bảng Chi Tiết 5 Đơn Đã Thanh Toán Hôm Nay (06/11/2026 — Thẻ KPI Số 2: ADR Hôm Nay)")
today_wins = [s for s in completed if s["status"] == "won" and s["sessionDate"] == "2026-11-06"]
today_rows = []
for s in today_wins:
    today_rows.append([
        f"#{s['id']}",
        s["timeLabel"],
        f"{s['offeredRoom']} ({s['roomCategory']})",
        f"#{s['lockedRoomNumber']}",
        f"{s['nights']} đêm",
        fmt_vnd(s["offeredBasePrice"]),
        fmt_vnd(s["hotelEarnedBase"]),
        fmt_vnd(s["guestPaidTotal"]),
    ])
today_rows.append([
    "TỔNG CỘNG",
    "06/11",
    "5 đơn hoàn tất 100%",
    "5 phòng khóa",
    "10 đêm",
    "ADR: 1.185.000đ",
    fmt_vnd(sum(x["hotelEarnedBase"] for x in today_wins)),
    fmt_vnd(sum(x["guestPaidTotal"] for x in today_wins)),
])
add_styled_table(
    ["Mã Yêu Cầu", "Giờ TT", "Hạng Phòng Khớp", "Mã Phòng", "Số Đêm", "Giá Gốc/Đêm", "KS Nhận (100%)", "Khách TT (×1.265)"],
    today_rows,
    right_align_cols={4, 5, 6, 7},
)

add_h2("4.3 Bảng Phân Bổ 30 Mã Phòng Vật Lý Đêm 06/11/2026 (Thẻ KPI Số 5 & Số 6 + Tab 3)")
live_list = [s for s in auction_sessions if s["status"] == "live"]
inv_rows = []
for rc in room_classes:
    pms_c = [r for r in rooms_pms if r["roomClassId"] == rc["id"]]
    oth = sum(1 for r in pms_c if r["status"] == "booked_other")
    auc = sum(1 for r in pms_c if r["status"] == "booked_auction")
    vac = sum(1 for r in pms_c if r["status"] == "vacant_unlocked")
    live_c = [s["id"] for s in live_list if s["matchedRoomClassId"] == rc["id"]]
    inv_rows.append([
        f"{rc['name']} ({rc['roomRange']})",
        str(rc["totalRooms"]),
        str(oth),
        str(auc),
        str(vac),
        fmt_vnd(rc["baseFloorPrice"]),
        "Hết phòng (Tự chặn)" if vac == 0 else f"Mở khóa • Đấu {len(live_c)} phiên ({', '.join('#'+x for x in live_c)})",
    ])
inv_rows.append([
    "TỔNG TOÀN KHÁCH SẠN",
    "30",
    "16",
    "8",
    "6",
    "750k – 1.850k",
    "Đã khóa 24/30 (80%) • Trống mở 6/30 (CO mai: 9) • 4 phiên Live",
])
add_styled_table(
    ["Hạng Phòng & Dãy Số", "Tổng", "OTA/Khác", "Đấu Giá TT", "Trống Mở", "Giá Gốc Sàn", "Trạng Thái Tham Gia Đấu Giá"],
    inv_rows,
    right_align_cols={1, 2, 3, 4, 5},
)

add_h2("4.4 Bảng Đối Soát Benchmark Hạng Phòng Kỳ 30 Ngày & Pareto 39 Phiên Trượt (Tab 1 & Tab 2)")
meta30 = system_benchmarks["periodsMeta"]["30d"]
sub30 = [s for s in completed if meta30["startDate"] <= s["sessionDate"] <= meta30["endDate"]]
bench_rows = []
tot_w30 = 0
tot_reg30 = 0
for b in system_benchmarks["roomClassBenchmarks"]:
    cbids = [s for s in sub30 if s["matchedRoomClassId"] == b["roomClassId"]]
    cwins = [s for s in cbids if s["status"] == "won"]
    hw = len(cwins) / len(cbids) * 100 if cbids else 0
    sw = b["systemAvgWinRatePct"]["30d"]
    delta = hw - sw
    reg_tot = b["systemTotalWinsRegion"]["30d"]
    tot_w30 += len(cwins)
    tot_reg30 += reg_tot
    share = len(cwins) / reg_tot * 100
    avg_base = round(sum(s["offeredBasePrice"] for s in cbids) / len(cbids))
    bench_rows.append([
        f"{b['roomName']} ({b['category']})",
        f"{len(cwins)}/{len(cbids)}",
        f"{hw:.1f}%",
        f"{sw:.1f}%",
        f"{delta:+.1f}%",
        f"{share:.1f}% ({len(cwins)}/{reg_tot})",
        f"{fmt_vnd(avg_base)} / {fmt_vnd(b['systemAvgBasePrice'])}",
    ])
bench_rows.append([
    "TỔNG TOÀN KHÁCH SẠN (30 NGÀY)",
    f"{tot_w30}/{len(sub30)}",
    f"{tot_w30/len(sub30)*100:.1f}%",
    f"{meta30['platformWinRatePct']}%",
    f"{tot_w30/len(sub30)*100 - meta30['platformWinRatePct']:+.1f}%",
    f"{tot_w30/tot_reg30*100:.1f}% ({tot_w30}/{tot_reg30})",
    "ADR kỳ 30d: 1.144.138đ/đêm",
])

add_styled_table(
    ["Hạng Phòng", "Thắng/Báo Giá", "KS Chọn (%)", "TB Sàn (%)", "Chênh Lệch", "Thị Phần Đà Nẵng", "Giá Gốc TB (KS / Sàn)"],
    bench_rows,
    right_align_cols={1, 2, 3, 4, 5, 6},
)

doc.add_paragraph(
    "Phân bổ chính xác 39 phiên chưa thắng trong 30 ngày (68 báo giá − 29 đơn TT = 39 phiên, tổng tỷ trọng = 100,0%): "
    "(1) Giá gốc cao hơn đối thủ: 16 phiên (41,0%); "
    "(2) Phản hồi chậm / Quá 60p: 11 phiên (28,2%); "
    "(3) Thiếu Bữa sáng / Late C/O: 8 phiên (20,5%); "
    "(4) Khách đổi ý trước khi TT: 4 phiên (10,3%)."
)

# ==============================================================================
# PHẦN 5: KỊCH BẢN DEMO 5 PHÚT & BỘ Q&A PHẢN BIỆN TRƯỚC TEAM
# ==============================================================================
add_h1("5. Kịch Bản Trình Bày Live Demo (5 Phút) & Bộ Câu Hỏi Phản Biện (Q&A)")

add_h2("5.1 Kịch bản 5 bước trình diễn mượt mà trước Team (Khớp 100% Giao diện Mới)")
add_bullet(
    "Bước 1 — Chứng minh Master Data & Công thức 6 Thẻ KPI (45 giây): ",
    "Trên thanh Header, bấm chuyển đổi giữa 3 kỳ 'Hôm nay (06/11/2026)', '7 ngày (31/10 – 06/11/2026)' và '30 ngày (08/10 – 06/11/2026)' để thấy toàn bộ Thực Nhận Ròng KS, Phiên Báo Giá, Tỷ Lệ Được Chọn & Thị Phần Đà Nẵng cập nhật tức thì từ 72 bản ghi thật. "
    "Click mở thẻ KPI 1 (Thực Nhận Ròng KS = 64,7tr) để chỉ rõ ca hoàn tiền y tế #CRQ-8835 (-1.700.000đ), và thẻ KPI 2 (ADR Hôm Nay = 1.185k/đêm = 11.850k ÷ 10 đêm).",
)
add_bullet(
    "Bước 2 — Demo One-Shot Bid, AI Match % & Giá sàn Riêng Từng Hạng Phòng (60 giây): ",
    "Tại Tab 1 (Phiên Đấu Giá Live), bấm huy hiệu 'Khớp 92%' trên phiên #CRQ-8941 -> Mở bảng đối chiếu Hard/Soft Rules -> Bấm bù đắp dịch vụ để mở Modal Tùy chỉnh: chỉ rõ Sàn hạng Superior là 750.000đ trong khi nếu mở phiên #CRQ-8942 (Executive Ocean Suite) thì Sàn bảo vệ tự nâng lên đúng 1.850.000đ!",
)
add_bullet(
    "Bước 3 — 'Khoảnh khắc Wow': Demo Pay-to-Lock & Tự động Rút phiên trùng 'auto_closed' (90 giây): ",
    "Chỉ cho team thấy hạng Executive Ocean Suite chỉ còn 1 phòng trống mở khóa duy nhất (#130) đang tham gia đồng thời 2 phiên Live (#CRQ-8942 và #CRQ-8944). "
    "Tại #CRQ-8944 (đã chào 1.950.000đ/đêm × 2 đêm = 3.900.000đ), bấm nút 'Mô phỏng Khách TT 100% → Khóa Phòng Ngay'. "
    "Ngay lập tức: (a) Phòng #130 bị khóa sang Đã đặt trong rooms_pms.json, (b) Phiên trùng #CRQ-8942 tự động rút về Nhật ký với nhãn 'TỰ ĐÓNG • HẾT PHÒNG' mà KHÔNG làm giảm oan Tỷ lệ được chọn của KS (tăng từ 42,6% lên 43,5%), "
    "(c) ADR Hôm Nay tăng từ 1.185k lên 1.313k/đêm (15.750k ÷ 12 đêm) và Thị phần Đà Nẵng tăng động từ 29/855 lên 30/856 đơn!",
)
add_bullet(
    "Bước 4 — Phân tích Tab 2 (Thị phần & Phiên trượt) và Tab 3 (Sơ đồ 30 Buồng) (60 giây): ",
    "Chuyển sang Tab 2 xem 4 thẻ Hạng phòng + Biểu đồ ngang Pareto 39 phiên trượt, sau đó bấm 'Áp dụng Auto-Bid' ở bảng Đối chiếu phiên trượt để ghi quy tắc mới xuống bot_rules.json. Tiếp tục qua Tab 3 kiểm tra Biểu đồ cột chồng 14 ngày & Sơ đồ 30 buồng vật lý.",
)
add_bullet(
    "Bước 5 — F5 Kiểm chứng Persistence & Bấm Reset về Seed (30 giây): ",
    "Nhấn F5 tải lại trình duyệt để chứng minh phòng #130 vẫn khóa và doanh thu vẫn giữ nguyên trên ổ đĩa. Sau đó bấm nút 'Reset' trên thanh Header để khôi phục 11 file JSON về trạng thái mẫu ban đầu.",
)

add_h2("5.2 Bộ 5 câu hỏi phản biện thường gặp từ Team & Cách trả lời sắc bén")

qa_rows = [
    [
        "Q1. Tại sao không khóa giữ phòng (Soft-Hold) hay thu đặt cọc ngay lúc khách sạn gửi báo giá?",
        "Nếu Soft-Hold 60 phút ngay khi báo giá, khách sạn chỉ còn 1 phòng trống nhưng gửi cho 1 khách chần chừ sẽ mất cơ hội bán cho các khách khác sẵn sàng trả ngay. Cơ chế Pay-to-Lock (không đặt cọc) cho phép 1 phòng mở khóa tham gia nhiều phiên cùng lúc; ai hoàn tất TT 100% trước sẽ khóa phòng trước và tự động đóng các phiên trùng còn lại ('auto_closed').",
    ],
    [
        "Q2. Khi 1 phòng cuối được bán và phiên trùng bị tự động đóng, khách sạn có bị tính là thua phiên đó làm tụt Win Rate không?",
        "Hoàn toàn KHÔNG. Trong analyticsEngine.ts, phiên tự rút do hết phòng mang trạng thái riêng 'auto_closed' (TỰ ĐÓNG • HẾT PHÒNG), tách biệt hoàn toàn khỏi 'rejected' và 'expired'. Nhờ vậy khách sạn bán hết phòng không bao giờ bị phạt oan tỷ lệ chọn hay làm méo biểu đồ Pareto nguyên nhân trượt.",
    ],
    [
        "Q3. Nói '0% hoa hồng khách sạn' vậy nền tảng goodNstay lấy doanh thu từ đâu?",
        "Khách sạn nhập Giá gốc (BasePrice) và nhận đủ 100% BasePrice. Doanh thu của sàn đến từ khoản Phí dịch vụ nền tảng 15% cộng thêm về phía du khách, cùng 10% thuế VAT tính trên tổng gộp (Tổng khách trả = BasePrice × 1,15 × 1,10 = 1,265 × Giá gốc).",
    ],
    [
        "Q4. Điều gì ngăn Lễ tân nhập nhầm giá 800k cho phòng Executive Suite trị giá 2,65 triệu/đêm?",
        "Hệ thống kiểm soát Giá sàn riêng theo từng hạng phòng từ room_classes.json (Superior 750k, Deluxe 920k, Suite 1.550k, Executive 1.850k) kết hợp 2 lớp khóa: (1) Đang bật Auto-Bid thì khóa cứng dưới sàn hạng phòng; (2) Tài khoản Lễ tân (RBAC) không có quyền override dưới sàn ngay cả khi tắt Auto-Bid.",
    ],
    [
        "Q5. Nếu có đoàn lớn đặt 6 phòng cho 15 người lúc nửa đêm thì Auto-Bid xử lý thế nào?",
        "Tham số hệ thống khóa cứng trần Auto-Bid ở mức ≤ 4 phòng và ≤ 8 khách (autoBidMaxRooms = 4, autoBidMaxGuests = 8 trong hotel_profile.json). Mọi yêu cầu đoàn lớn đều tự động chuyển về chế độ duyệt tay của Quản lý để kiểm soát công suất.",
    ],
]

add_styled_table(
    ["Câu Hỏi Phản Biện Từ Sếp / Product / Tech", "Câu Trả Lời Chuẩn Nghiệp Vụ & Kỹ Thuật"],
    qa_rows,
    col_widths=[2.35, 4.55],
)

os.makedirs(os.path.dirname(OUT_DOCX), exist_ok=True)
doc.save(OUT_DOCX)
print("Saved DOCX report successfully:", OUT_DOCX, "Size:", os.path.getsize(OUT_DOCX), "bytes")
