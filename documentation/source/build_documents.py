"""Build styled, reproducible Word documents with embedded diagrams and evidence."""
import json
from datetime import date
from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from PIL import Image
from content import AUTHOR, DOCUMENTS

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docx"
OUTPUT.mkdir(parents=True, exist_ok=True)
EVIDENCE = json.loads((ROOT / "source/evidence/e2e.json").read_text(encoding="utf-8"))
BLUE = "1463D6"
INK = "17243B"


def field(paragraph, instruction):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    code = OxmlElement("w:instrText")
    code.set(qn("xml:space"), "preserve")
    code.text = instruction
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend([begin, code, end])


def configure(doc, title):
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21), Cm(29.7)
    sec.top_margin, sec.bottom_margin = Cm(2.2), Cm(2.0)
    sec.left_margin, sec.right_margin = Cm(2.1), Cm(2.1)
    sec.header_distance, sec.footer_distance = Cm(0.9), Cm(0.9)
    normal = doc.styles["Normal"]
    normal.font.name, normal.font.size = "Calibri", Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(INK)
    normal.paragraph_format.space_after = Pt(8)
    normal.paragraph_format.line_spacing = 1.12
    for name, size in [("Title", 32), ("Heading 1", 18), ("Heading 2", 13)]:
        style = doc.styles[name]
        style.font.name, style.font.size = "Calibri", Pt(size)
        style.font.color.rgb = RGBColor.from_string(BLUE)
        style.paragraph_format.keep_with_next = True
    doc.styles["Caption"].font.size = Pt(9)
    doc.styles["Caption"].font.name = "Calibri"
    doc.styles["Caption"].font.color.rgb = RGBColor.from_string("46566D")
    sec.different_first_page_header_footer = True
    header = sec.header.paragraphs[0]
    header.add_run("HEARDESK  /  " + title).font.size = Pt(8)
    header.paragraph_format.space_after = Pt(0)
    foot = sec.footer.paragraphs[0]
    foot.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    foot.add_run("Muhammad Danu Susyanto  •  v1.0  |  Page ").font.size = Pt(8)
    field(foot, "PAGE")
    foot.add_run(" of ")
    field(foot, "NUMPAGES")
    doc.core_properties.title = "HearDesk: " + title
    doc.core_properties.author = AUTHOR
    doc.core_properties.subject = "As-built engineering portfolio documentation"
    settings = doc.settings.element
    update = OxmlElement("w:updateFields")
    update.set(qn("w:val"), "true")
    settings.append(update)


def table(doc, rows, number, title):
    p = doc.add_paragraph(f"Table {number}. {title}", "Caption")
    p.paragraph_format.keep_with_next = True
    t = doc.add_table(rows=1, cols=len(rows[0]))
    t.style = "Light Shading Accent 1"
    for i, value in enumerate(rows[0]):
        t.rows[0].cells[i].text = value
    repeat = OxmlElement("w:tblHeader")
    t.rows[0]._tr.get_or_add_trPr().append(repeat)
    for cell in t.rows[0].cells:
        for paragraph in cell.paragraphs:
            paragraph.paragraph_format.keep_with_next = True
    for data in rows[1:]:
        cells = t.add_row().cells
        for cell, value in zip(cells, data):
            cell.text = str(value)
        props = t.rows[-1]._tr.get_or_add_trPr()
        props.append(OxmlElement("w:cantSplit"))
    for row in t.rows:
        for cell in row.cells:
            for p in cell.paragraphs:
                p.paragraph_format.space_after = Pt(4)
                p.paragraph_format.line_spacing = 1.05
                for run in p.runs:
                    run.font.size = Pt(9)
                    run.font.name = "Calibri"
    spacer = doc.add_paragraph()
    spacer.paragraph_format.space_after = Pt(0)
    spacer.paragraph_format.line_spacing = Pt(1)
    spacer.add_run().font.size = Pt(1)


def figure(doc, path, number, caption):
    width, height = Image.open(path).size
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    target_w = 6.55
    target_h = target_w * height / width
    if target_h > 6.8:
        target_w = 6.8 * width / height
    shape = p.add_run().add_picture(str(path), width=Inches(target_w))
    shape._inline.docPr.set("descr", caption)
    doc.add_paragraph(f"Figure {number}. {caption}", "Caption")


for slug, title, subtitle, sections in DOCUMENTS:
    doc = Document()
    configure(doc, title)
    doc.add_paragraph("HearDesk", "Title")
    doc.add_paragraph(title, "Subtitle")
    p = doc.add_paragraph(subtitle)
    p.paragraph_format.space_after = Pt(48)
    doc.add_paragraph("Website feedback. Ready for your team.")
    doc.add_paragraph("A personal full-stack engineering project")
    doc.add_paragraph("Prepared by " + AUTHOR)
    doc.add_paragraph("Version 1.0  •  " + date.today().strftime("%d %B %Y"))
    doc.add_paragraph("Portfolio edition describing the implemented app, with test examples and dated results.")
    doc.add_page_break()
    doc.add_heading("Contents", level=1)
    field(doc.add_paragraph(), 'TOC \\o "1-1" \\h \\z \\u')
    doc.add_page_break()
    figures = tables = 0
    for index, item in enumerate(sections, 1):
        heading = doc.add_heading(f"{index}. {item['title']}", level=1)
        if index > 1 and (item.get("image") or item["title"] in ["Functional requirements", "Recorded scenario results", "Data dictionary: application records"]):
            heading.paragraph_format.page_break_before = True
        for paragraph in item["paragraphs"]:
            doc.add_paragraph(paragraph)
        rows = item.get("table")
        if rows == "E2E_RESULTS":
            stats = EVIDENCE["stats"]
            doc.add_paragraph(f"Recorded start (UTC): {stats['startTime']}. Duration: {stats['duration']/1000:.1f} seconds. Results: {stats['expected']} completed as expected, {stats['unexpected']} unexpected outcomes, {stats['skipped']} skipped and {stats['flaky']} flaky.")
            rows = [["ID / file", "Executed scenario", "Result / duration"]]
            for n, scenario in enumerate(EVIDENCE["scenarios"], 1):
                rows.append([f"E2E-{n:02d}\n{scenario['file']}", scenario["title"], f"{scenario['status'].upper()}\n{scenario['durationMs']/1000:.1f} s"])
        if rows:
            tables += 1
            table(doc, rows, tables, item["title"])
        if item.get("diagram"):
            figures += 1
            figure(doc, ROOT / "diagrams/exported" / (item["diagram"] + ".png"), figures, item["title"])
        if item.get("image"):
            figures += 1
            figure(doc, ROOT / "screenshots" / item["image"], figures, "Test environment screenshot: " + item["title"].split(":")[-1].strip())
    doc.save(OUTPUT / (slug + ".docx"))
    # Text sources remain easy to diff and independently review.
    lines = ["# HearDesk: " + title, "", "Author: " + AUTHOR, ""]
    for n, item in enumerate(sections, 1):
        lines += [f"## {n}. {item['title']}", "", *item["paragraphs"], ""]
        if isinstance(item.get("table"), list):
            lines.extend(" | ".join(map(str, row)) for row in item["table"])
            lines.append("")
    (ROOT / "source" / (slug + ".md")).write_text("\n\n".join(lines), encoding="utf-8")
    print("Built", slug + ".docx")
