"""Extract public-safe test receipts and approved fixture screenshots."""
import json
import re
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DOC = ROOT / "documentation"
raw = (ROOT / ".superpowers/documentation-e2e.log").read_text(encoding="utf-16")
start = raw.find('{\n  "config"')
if start < 0:
    start = raw.find('{\r\n  "config"')
if start < 0:
    raise RuntimeError("Cannot locate Playwright JSON report")
result = json.loads(raw[start:])
metadata = json.loads((DOC / "source/evidence/execution-metadata.json").read_text(encoding="utf-8"))
if metadata["startTime"] != result["stats"]["startTime"] or metadata["testExitCode"] != 0 or metadata["buildExitCode"] != 0 or not metadata["production"]:
    raise RuntimeError("Execution metadata does not match a successful production run")
scenarios = []


def collect(suite):
    for spec in suite.get("specs", []):
        for test in spec["tests"]:
            run = test["results"][-1]
            scenarios.append({"title": spec["title"], "file": spec["file"], "line": spec["line"], "status": run["status"], "durationMs": run["duration"], "expectedStatus": test["expectedStatus"]})
    for child in suite.get("suites", []):
        collect(child)


for suite in result["suites"]:
    collect(suite)
warning_lines = sorted(set(line.strip() for line in raw[:start].splitlines() if "DeprecationWarning:" in line or "Warning:" in line or "(!)" in line))
receipt = {"sourceBaseline": metadata["sourceBaseline"], "source": "Fresh Playwright production JSON report with explicit execution metadata", "execution": metadata, "stats": result["stats"], "scenarios": scenarios, "warnings": warning_lines}
if receipt["stats"]["unexpected"] or receipt["stats"]["skipped"] or receipt["stats"]["flaky"] or result.get("errors") or not scenarios or len(scenarios) != receipt["stats"]["expected"] or any(s["status"] != "passed" or s["expectedStatus"] != "passed" for s in scenarios):
    raise RuntimeError("Suite not fully passed; report honestly before publishing")
(DOC / "source/evidence/e2e.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
screens = DOC / "screenshots"
screens.mkdir(parents=True, exist_ok=True)
approved = ["landing-desktop.png", "landing-mobile.png", "workspace-desktop.png", "workspace-mobile.png", "widget-mobile.png", "platform-desktop.png"]
for name in approved:
    shutil.copy2(ROOT / "test-results" / name, screens / name)
shutil.copy2(ROOT / "test-results/inbox-summary-desktop.png", screens / "workspace-desktop.png")
Image.open(screens / "landing-desktop.png").crop((0, 0, 1440, 960)).save(screens / "landing-overview.png")
print("Collected", len(scenarios), "scenarios and", len(approved), "fixture screenshots")
