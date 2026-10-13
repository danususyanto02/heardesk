"""Publish exact download copies and approved images; never rewrite UI source."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORTFOLIO = Path(r"F:\PC\Project\Laragon\www\portofolio")
TARGET = PORTFOLIO / "public/docs/heardesk"
IMAGES = PORTFOLIO / "public/images/projects/heardesk"
TARGET.mkdir(parents=True, exist_ok=True)
IMAGES.mkdir(parents=True, exist_ok=True)
files = []
approved = {
    "heardesk-functional-specification.docx",
    "heardesk-technical-design.docx",
    "heardesk-end-to-end-ui-test-report.docx",
    "heardesk-sonarqube-code-quality-report.docx",
}
actual = {item.name for item in (ROOT / "docx").glob("*.docx") if not item.name.startswith("~$")}
if actual != approved:
    raise RuntimeError(f"Publication allowlist mismatch: missing={approved-actual}, unexpected={actual-approved}")
for name in sorted(approved):
    item = ROOT / "docx" / name
    destination = TARGET / item.name
    shutil.copy2(item, destination)
    digest = hashlib.sha256(item.read_bytes()).hexdigest()
    if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
        raise RuntimeError("Published copy mismatch")
    files.append({"filename": item.name, "bytes": item.stat().st_size, "sha256": digest})
for name in ["landing-overview.png", "landing-desktop.png", "workspace-desktop.png", "widget-mobile.png"]:
    shutil.copy2(ROOT / "screenshots" / name, IMAGES / name)
for name in ["application-architecture", "system-context"]:
    shutil.copy2(ROOT / "diagrams/exported" / (name + ".png"), IMAGES / (name + ".png"))
(TARGET / "manifest.json").write_text(json.dumps({"author": "Muhammad Danu Susyanto", "version": "1.0", "documents": files}, indent=2), encoding="utf-8")
print("Published", len(files), "verified DOCX copies")
