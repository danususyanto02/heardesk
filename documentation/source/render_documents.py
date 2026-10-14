"""Update document contents and render through installed Microsoft Word on Windows."""
import argparse
from pathlib import Path
import win32com.client

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--only", choices=[file.stem for file in (ROOT / "docx").glob("*.docx") if not file.name.startswith("~$")])
args = parser.parse_args()
OUT = ROOT / "source/evidence/rendered"
OUT.mkdir(parents=True, exist_ok=True)
word = win32com.client.DispatchEx("Word.Application")
word.Visible = False
word.DisplayAlerts = 0
try:
    for file in sorted((ROOT / "docx").glob("*.docx")):
        if args.only and file.stem != args.only:
            continue
        print("Render", file.name, flush=True)
        document = word.Documents.Open(str(file), ReadOnly=False, AddToRecentFiles=False)
        try:
            for contents in document.TablesOfContents:
                contents.Update()
            document.Repaginate()
            document.Save()
            document.ExportAsFixedFormat(str(OUT / (file.stem + ".pdf")), 17)
            print(document.ComputeStatistics(2), "pages", flush=True)
        finally:
            document.Close(False)
finally:
    word.Quit()
