from pathlib import Path
from datetime import date
import os
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# Remove XML 1.0 illegal characters (control characters that crash lxml/docx)
XML_ILLEGAL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]")

def clean_xml(text: str) -> str:
    return XML_ILLEGAL_CHARS.sub("", text)

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "DEA_MedRAG_Source_Code.docx"
EXTENSIONS = {".py",".ts",".tsx",".js",".jsx",".mjs",".cjs",".html",".css",".scss",".sql",".sh",".ps1",".yml",".yaml",".toml",".ini",".cfg",".md",".json"}
FILENAMES = {"Dockerfile","Makefile",".gitignore",".dockerignore","requirements.txt","Procfile"}
EXCLUDED_DIRS = {".git",".venv","venv","env","node_modules","__pycache__",".next","dist","build","coverage",".pytest_cache",".mypy_cache",".ruff_cache",".turbo",".cache","screenshots","chroma_db","chromadb","evaluation_results"}
EXCLUDED_PREFIXES = ("data/benchmarks/","data/datasets/","data/raw/","vendor/","site-packages/")
EXCLUDED_FILES = {".env",".env.local",".env.production",".env.development","package-lock.json","pnpm-lock.yaml","yarn.lock","poetry.lock","uv.lock"}
MAX_BYTES = 1_000_000

def shade(p):
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), "F7F8FA")
    pPr.append(shd)

def page_number(p):
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Page ")
    begin = OxmlElement("w:fldChar"); begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve"); instr.text = " PAGE "
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    r._r.append(begin); r._r.append(instr); r._r.append(end)

def collect():
    result = []
    for current, dirs, names in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith("."))
        for name in names:
            p = Path(current) / name
            if p.resolve() == OUTPUT.resolve() or name in EXCLUDED_FILES or name.startswith(".env"):
                continue
            rel = p.relative_to(ROOT).as_posix()
            if rel.startswith(EXCLUDED_PREFIXES):
                continue
            if p.suffix.lower() not in EXTENSIONS and name not in FILENAMES:
                continue
            try:
                if p.stat().st_size > MAX_BYTES:
                    print(f"Skipping large file (>1 MB): {rel}")
                    continue
                p.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                print(f"Skipping unreadable file: {rel}")
                continue
            result.append(p)
    return sorted(result, key=lambda p: p.relative_to(ROOT).as_posix().lower())

def main():
    files = collect()
    if not files:
        raise SystemExit("No matching files found. Run this script from the project root.")
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(.65); sec.bottom_margin = Inches(.65)
    sec.left_margin = Inches(.7); sec.right_margin = Inches(.7)
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(9)

    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(90)
    r = p.add_run("DEA-MedRAG")
    r.bold = True; r.font.size = Pt(28); r.font.color.rgb = RGBColor(31,78,121)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Source Code Documentation")
    r.bold = True; r.font.size = Pt(18)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Deterministic Epistemic Arbitration in Multi-Agent RAG\nResearch Prototype\n\n")
    p.add_run(f"Generated: {date.today().isoformat()}\nProject folder: {ROOT.name}\nFiles included: {len(files)}")
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("\nAutomatically generated from source files. Secrets, dependency folders, build outputs, and large datasets are excluded.")
    r.italic = True; r.font.size = Pt(9)
    doc.add_page_break()

    doc.add_heading("Contents — Included Files", level=1)
    doc.add_paragraph("Each listed file begins on a new page.")
    for f in files:
        doc.add_paragraph(clean_xml(f.relative_to(ROOT).as_posix()), style="List Bullet")
    doc.add_page_break()

    for i, f in enumerate(files):
        rel = f.relative_to(ROOT).as_posix()
        doc.add_heading(clean_xml(rel), level=1)
        p = doc.add_paragraph(f"File {i+1} of {len(files)}")
        p.paragraph_format.space_after = Pt(4)
        raw_text = clean_xml(f.read_text(encoding="utf-8", errors="replace"))
        for line in (raw_text.splitlines() or ["[Empty file]"]):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.0
            clean_line = clean_xml(line)
            r = p.add_run(clean_line if clean_line else " ")
            r.font.name = "Consolas"; r.font.size = Pt(7); r.font.color.rgb = RGBColor(35,35,35)
            shade(p)
        if i < len(files)-1:
            doc.add_page_break()
    for s in doc.sections:
        page_number(s.footer.paragraphs[0])
    doc.save(OUTPUT)
    print(f"Created: {OUTPUT}")
    print(f"Included {len(files)} files. Review the DOCX before submitting and add your student details to the cover page if needed.")

if __name__ == "__main__":
    main()
