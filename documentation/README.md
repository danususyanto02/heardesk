# HearDesk portfolio documentation

Author: Muhammad Danu Susyanto. Language: English. Version: 1.0. These documents describe the implemented app and its recorded test results, not a certification or customer contract.

## Deliverables

- `docx/heardesk-functional-specification.docx`
- `docx/heardesk-technical-design.docx`
- `docx/heardesk-end-to-end-ui-test-report.docx`
- `docx/heardesk-sonarqube-code-quality-report.docx`
- `diagrams/source/`: self-contained HTML and extracted SVG source.
- `diagrams/exported/`: high-resolution PNG diagrams for Word and the portfolio.
- `screenshots/`: screenshots from isolated UI test fixtures, never customer data.
- `source/`: reproducible document and diagram builders, content, and dated evidence receipts.

Primary documents live in this directory. Download copies and public image assets are published to the portfolio's `public/docs/heardesk/` and `public/images/projects/heardesk/`. Integration covers only the standalone `preview-neo-brutalism.html`. Nuxt and application deployment are out of scope.

## Evidence policy

Editorial rule: descriptions, explanations, table content and diagram labels do not use semicolons. Required punctuation in JavaScript and CSS source is unchanged.

Write for readers who have not seen the code. Explain Company as a team workspace, use private tracking link/code rather than private receipt, and define necessary technical terms before using them. Public reply means a team reply visible through a private tracking link, not a discussion open to everyone. Keep exact source identifiers and recorded test names where they are needed to locate evidence.

Product behavior is traced to source files and tests. Results are dated and distinguish remote SonarQube metrics from local test coverage. Screenshots are illustrative test fixtures. No credentials, bearer codes, customer data, private infrastructure addresses, or environment files belong in public deliverables. Public role descriptions must not imply Platform Owner automatically reads Company feedback.

Diagram direction: editorial layouts based on https://github.com/cathrynlavery/diagram-design (MIT). The static diagrams use HearDesk blue, white backgrounds, dark text, orthogonal connectors and no shadows. The ERD is split for readability. Browser exports use Source Sans 3, while Word uses Calibri for compatibility with the installed Office renderer. This is a custom implementation of the published guidance, not an installed plugin or a claim of upstream validation.

## Rebuild

1. `python documentation/source/build_diagrams.py`
2. `node documentation/source/export-diagrams.mjs`
3. `python documentation/source/build_documents.py`
4. Windows Word pagination and PDF review: `python documentation/source/render_documents.py`, followed by `python documentation/source/inspect_rendered.py`. A PowerShell equivalent is provided where script policy permits.
5. `python documentation/source/publish.py` copies only the four DOCX files and approved diagrams/screenshots to the portfolio.

`collect_evidence.py` imports the approved run from the private local Playwright log only when it matches `source/evidence/execution-metadata.json`. For a new execution, record its exact commit, start time, build mode and exit codes first. Do not reuse the published metadata for another run. The publication script refuses missing or additional DOCX files, preventing drafts from becoming downloads accidentally.

Python prerequisites: python-docx and Pillow, plus PyMuPDF for rendered-page checks and pywin32 for Word automation. Browser export uses the project's Playwright and installed Chrome. Word COM is used only when Microsoft Word is available. The source scripts do not migrate or seed application data.
