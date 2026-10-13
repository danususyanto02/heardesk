"""Inspect Word-rendered PDFs and build page contact sheets for manual review."""
import json
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "source/evidence/rendered"
receipt = []
for path in sorted(OUT.glob("*.pdf")):
    pdf = fitz.open(path)
    tiles = []
    issues = []
    for i, page in enumerate(pdf):
        words = page.get_text("words")
        if any(x0 < 0 or y0 < 0 or x1 > page.rect.width or y1 > page.rect.height for x0,y0,x1,y1,*_ in words):
            issues.append({"page": i+1, "type": "text outside page"})
        if "Error!" in page.get_text():
            issues.append({"page": i+1, "type": "Word field error"})
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5,0.5), alpha=False)
        image = Image.frombytes("RGB",[pix.width,pix.height],pix.samples)
        tile = Image.new("RGB",(320,460),"#e3e8ef")
        tile.paste(image,((320-image.width)//2,24))
        ImageDraw.Draw(tile).text((12,6),f"Page {i+1}",fill="#17243b")
        tiles.append(tile)
    cols=4
    sheet=Image.new("RGB",(cols*320,((len(tiles)+cols-1)//cols)*460),"#cad3df")
    for i,tile in enumerate(tiles):sheet.paste(tile,((i%cols)*320,(i//cols)*460))
    sheet.save(OUT/(path.stem+"-contact-sheet.png"))
    if issues: raise RuntimeError(str(issues))
    receipt.append({"document":path.stem,"pages":len(pdf),"fieldErrors":0,"pageOverflow":0,"tocRendered":len(pdf)>1 and "Contents" in pdf[1].get_text()})
(OUT/"render-checks.json").write_text(json.dumps(receipt,indent=2),encoding="utf-8")
print(json.dumps(receipt,indent=2))
