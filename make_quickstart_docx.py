#!/usr/bin/env python3
"""Convert QUICKSTART.md into a beautifully styled, publication-grade Word DOCX file."""

from pathlib import Path
from datetime import date
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# XML 1.0 illegal characters regex
XML_ILLEGAL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]")

def clean_xml(text: str) -> str:
    return XML_ILLEGAL_CHARS.sub("", text)

ROOT = Path(__file__).resolve().parent
INPUT_MD = ROOT / "QUICKSTART.md"
OUTPUT_DOCX = ROOT / "QUICKSTART.docx"

# Color Palette (Teal & Slate Modern Research Theme)
PRIMARY = RGBColor(15, 118, 110)       # #0F766E (Teal 700)
PRIMARY_HEX = "0F766E"
SECONDARY = RGBColor(30, 41, 59)      # #1E293B (Slate 800)
SECONDARY_HEX = "1E293B"
MUTED = RGBColor(100, 116, 139)       # #64748B (Slate 500)
TEXT_DARK = RGBColor(30, 41, 59)      # #1E293B
BG_LIGHT_HEX = "F8FAFC"               # Slate 50
CODE_BG_HEX = "F1F5F9"                # Slate 100
BORDER_HEX = "E2E8F0"                 # Slate 200
CALLOUT_BG_HEX = "F0FDFA"             # Teal 50

def set_cell_shading(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color_hex)
    tcPr.append(shd)

def set_paragraph_shading(p, color_hex):
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), color_hex)
    pPr.append(shd)

def set_cell_borders(cell, top=BORDER_HEX, bottom=BORDER_HEX, left=BORDER_HEX, right=BORDER_HEX, sz="4", val="single"):
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for edge, color in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if color:
            b = OxmlElement(f"w:{edge}")
            b.set(qn("w:val"), val)
            b.set(qn("w:sz"), sz)
            b.set(qn("w:space"), "0")
            b.set(qn("w:color"), color)
            tcBorders.append(b)
        else:
            b = OxmlElement(f"w:{edge}")
            b.set(qn("w:val"), "none")
            tcBorders.append(b)
    tcPr.append(tcBorders)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement("w:tcMar")
    for edge, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        node = OxmlElement(f"w:{edge}")
        node.set(qn("w:w"), str(val))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)

def add_left_callout_border(p, color_hex=PRIMARY_HEX, sz="24"):
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    left = OxmlElement("w:left")
    left.set(qn("w:val"), "single")
    left.set(qn("w:sz"), sz)
    left.set(qn("w:space"), "12")
    left.set(qn("w:color"), color_hex)
    pBdr.append(left)
    pPr.append(pBdr)

def add_page_number(p):
    run = p.add_run()
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED
    begin = OxmlElement("w:fldChar"); begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = " PAGE "
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    run._r.append(begin); run._r.append(instr); run._r.append(end)

TOKEN_RE = re.compile(r"(\*\*.*?\*\*|\*.*?\*|`.*?`|\$\$.*?\$\$|\$.*?\$|\[.*?\]\(.*?\))")

def add_formatted_runs(paragraph, text: str, base_font_size=10, is_quote=False):
    text = clean_xml(text)
    parts = TOKEN_RE.split(text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**") and len(part) >= 4:
            r = paragraph.add_run(part[2:-2])
            r.bold = True
            r.font.size = Pt(base_font_size)
            if is_quote:
                r.font.color.rgb = PRIMARY
        elif part.startswith("*") and part.endswith("*") and len(part) >= 2:
            r = paragraph.add_run(part[1:-1])
            r.italic = True
            r.font.size = Pt(base_font_size)
        elif part.startswith("`") and part.endswith("`") and len(part) >= 2:
            r = paragraph.add_run(part[1:-1])
            r.font.name = "Consolas"
            r.font.size = Pt(base_font_size - 0.5)
            r.font.color.rgb = PRIMARY
        elif part.startswith("$$") and part.endswith("$$") and len(part) >= 4:
            # Display Math
            math_text = part[2:-2].strip()
            math_text = math_text.replace(r"\times", "×").replace(r"\text", "")
            math_text = math_text.replace("{", "").replace("}", "").replace(r"\alpha", "α")
            math_text = math_text.replace(r"\beta", "β").replace(r"\gamma", "γ").replace(r"\delta", "δ")
            r = paragraph.add_run(f" {math_text} ")
            r.bold = True
            r.font.name = "Cambria Math"
            r.font.size = Pt(base_font_size + 0.5)
            r.font.color.rgb = PRIMARY
        elif part.startswith("$") and part.endswith("$") and len(part) >= 2:
            # Inline Math
            math_text = part[1:-1].strip()
            math_text = math_text.replace(r"\alpha", "α").replace(r"\beta", "β")
            math_text = math_text.replace(r"\gamma", "γ").replace(r"\delta", "δ")
            math_text = math_text.replace(r"\times", "×").replace(r"\text", "")
            math_text = math_text.replace("{", "").replace("}", "")
            r = paragraph.add_run(math_text)
            r.font.name = "Cambria Math"
            r.font.size = Pt(base_font_size)
            r.font.color.rgb = PRIMARY
        elif part.startswith("[") and "](" in part and part.endswith(")"):
            m = re.match(r"\[(.*?)\]\((.*?)\)", part)
            if m:
                label = m.group(1)
                r = paragraph.add_run(label)
                r.font.color.rgb = PRIMARY
                r.underline = True
                r.font.size = Pt(base_font_size)
            else:
                r = paragraph.add_run(part)
                r.font.size = Pt(base_font_size)
        else:
            r = paragraph.add_run(part)
            r.font.size = Pt(base_font_size)
            if is_quote:
                r.font.color.rgb = SECONDARY

def render_code_block(doc, code_lines, lang=""):
    code_text = clean_xml("\n".join(code_lines))
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.8)
    set_cell_shading(cell, CODE_BG_HEX)
    set_cell_borders(cell, top=BORDER_HEX, bottom=BORDER_HEX, left=PRIMARY_HEX, right=BORDER_HEX, sz="12", val="single")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.05
    
    # Optional language badge
    if lang and lang.lower() not in {"text", ""}:
        badge_run = p.add_run(f"[{lang.upper()}]\n")
        badge_run.font.name = "Consolas"
        badge_run.font.size = Pt(7.5)
        badge_run.bold = True
        badge_run.font.color.rgb = MUTED
        
    code_run = p.add_run(code_text)
    code_run.font.name = "Consolas"
    code_run.font.size = Pt(8.5)
    code_run.font.color.rgb = SECONDARY
    
    # Spacer
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(6)

def render_table(doc, table_lines):
    rows = []
    for line in table_lines:
        raw_cells = [c.strip() for c in line.strip().split("|")]
        # remove empty edges from leading/trailing pipe
        if len(raw_cells) > 0 and raw_cells[0] == "":
            raw_cells.pop(0)
        if len(raw_cells) > 0 and raw_cells[-1] == "":
            raw_cells.pop(-1)
        if raw_cells:
            rows.append(raw_cells)
    
    if len(rows) < 2:
        return
        
    header = rows[0]
    # Check if row 1 is separator (:---, ---:, etc.)
    data_start = 1
    alignments = []
    if len(rows) > 1 and all(re.match(r"^:?-+:?$", cell.replace(" ", "")) for cell in rows[1]):
        data_start = 2
        for cell in rows[1]:
            c = cell.replace(" ", "")
            if c.startswith(":") and c.endswith(":"):
                alignments.append(WD_ALIGN_PARAGRAPH.CENTER)
            elif c.endswith(":"):
                alignments.append(WD_ALIGN_PARAGRAPH.RIGHT)
            else:
                alignments.append(WD_ALIGN_PARAGRAPH.LEFT)
    else:
        alignments = [WD_ALIGN_PARAGRAPH.LEFT] * len(header)
        
    data_rows = rows[data_start:]
    table = doc.add_table(rows=len(data_rows) + 1, cols=len(header))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    
    # Header Row
    hdr_cells = table.rows[0].cells
    for col_idx, text in enumerate(header):
        cell = hdr_cells[col_idx]
        set_cell_shading(cell, SECONDARY_HEX)
        set_cell_borders(cell, top=SECONDARY_HEX, bottom=PRIMARY_HEX, left=SECONDARY_HEX, right=SECONDARY_HEX, sz="8")
        set_cell_margins(cell, top=140, bottom=140, left=160, right=160)
        p = cell.paragraphs[0]
        p.alignment = alignments[col_idx] if col_idx < len(alignments) else WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(clean_xml(text))
        r.bold = True
        r.font.size = Pt(9)
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    # Data Rows
    for row_idx, r_data in enumerate(data_rows):
        row_cells = table.rows[row_idx + 1].cells
        bg_color = BG_LIGHT_HEX if (row_idx % 2 == 1) else "FFFFFF"
        for col_idx in range(len(header)):
            cell = row_cells[col_idx]
            text = r_data[col_idx] if col_idx < len(r_data) else ""
            set_cell_shading(cell, bg_color)
            set_cell_borders(cell, top=BORDER_HEX, bottom=BORDER_HEX, left=BORDER_HEX, right=BORDER_HEX, sz="4")
            set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
            p = cell.paragraphs[0]
            p.alignment = alignments[col_idx] if col_idx < len(alignments) else WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            add_formatted_runs(p, text, base_font_size=8.5)
            
    # Spacer
    sp = doc.add_paragraph()
    sp.paragraph_format.space_before = Pt(0)
    sp.paragraph_format.space_after = Pt(6)

def build_docx():
    content = INPUT_MD.read_text(encoding="utf-8")
    lines = content.splitlines()
    
    doc = Document()
    
    # Configure Page Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.85)
        section.right_margin = Inches(0.85)
        
        # Configure Header & Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_p.paragraph_format.space_before = Pt(12)
        r_f1 = f_p.add_run("DEA-MedRAG Quickstart Guide  |  Page ")
        r_f1.font.size = Pt(8.5)
        r_f1.font.color.rgb = MUTED
        add_page_number(f_p)

    # Base typography
    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Segoe UI"
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = TEXT_DARK
    
    in_code = False
    code_lang = ""
    code_lines = []
    
    in_table = False
    table_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Handle code blocks
        if stripped.startswith("```"):
            if not in_code:
                # Flush pending table if any
                if in_table:
                    render_table(doc, table_lines)
                    in_table = False
                    table_lines = []
                in_code = True
                code_lang = stripped[3:].strip()
                code_lines = []
            else:
                in_code = False
                render_code_block(doc, code_lines, code_lang)
                code_lines = []
            continue
            
        if in_code:
            code_lines.append(line)
            continue
            
        # Handle tables
        if stripped.startswith("|") and stripped.endswith("|"):
            if not in_table:
                in_table = True
                table_lines = [stripped]
            else:
                table_lines.append(stripped)
            continue
        else:
            if in_table:
                render_table(doc, table_lines)
                in_table = False
                table_lines = []

        if not stripped:
            continue
            
        # Horizontal Rule
        if stripped == "---":
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(8)
            set_paragraph_shading(p, BORDER_HEX)
            r = p.add_run(" ")
            r.font.size = Pt(1)
            continue
            
        # Title (H1)
        if stripped.startswith("# "):
            title_text = stripped[2:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(title_text)
            r.bold = True
            r.font.name = "Segoe UI Semibold"
            r.font.size = Pt(22)
            r.font.color.rgb = PRIMARY
            continue
            
        # Section Header (H2)
        if stripped.startswith("## "):
            h2_text = stripped[3:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(h2_text)
            r.bold = True
            r.font.name = "Segoe UI Semibold"
            r.font.size = Pt(14)
            r.font.color.rgb = SECONDARY
            
            # Subtle accent underline
            p_bar = doc.add_paragraph()
            p_bar.paragraph_format.space_before = Pt(0)
            p_bar.paragraph_format.space_after = Pt(8)
            set_paragraph_shading(p_bar, PRIMARY_HEX)
            r_bar = p_bar.add_run(" ")
            r_bar.font.size = Pt(1.5)
            continue

        # Sub-header (H3)
        if stripped.startswith("### "):
            h3_text = stripped[4:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(h3_text)
            r.bold = True
            r.font.name = "Segoe UI Semibold"
            r.font.size = Pt(11.5)
            r.font.color.rgb = PRIMARY
            continue

        # Blockquote / Callout
        if stripped.startswith("> "):
            quote_text = stripped[2:].strip()
            table = doc.add_table(rows=1, cols=1)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            table.autofit = False
            cell = table.cell(0, 0)
            cell.width = Inches(6.8)
            set_cell_shading(cell, CALLOUT_BG_HEX)
            set_cell_borders(cell, top=None, bottom=None, left=PRIMARY_HEX, right=None, sz="24")
            set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
            p = cell.paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.15
            add_formatted_runs(p, quote_text, base_font_size=9.5, is_quote=True)
            sp = doc.add_paragraph()
            sp.paragraph_format.space_before = Pt(0)
            sp.paragraph_format.space_after = Pt(4)
            continue

        # Unordered list item
        if stripped.startswith("- ") or stripped.startswith("* "):
            item_text = stripped[2:].strip()
            p = doc.add_paragraph(style="List Bullet")
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            add_formatted_runs(p, item_text, base_font_size=9.5)
            continue

        # Numbered list item
        m_num = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        if m_num:
            item_text = m_num.group(2)
            p = doc.add_paragraph(style="List Number")
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.15
            add_formatted_runs(p, item_text, base_font_size=9.5)
            continue

        # Regular paragraph
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.15
        add_formatted_runs(p, stripped, base_font_size=9.5)

    # Flush dangling table if ended with table
    if in_table:
        render_table(doc, table_lines)

    doc.save(OUTPUT_DOCX)
    print(f"Successfully converted QUICKSTART.md -> {OUTPUT_DOCX}")

if __name__ == "__main__":
    build_docx()
