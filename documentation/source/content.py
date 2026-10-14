"""English documentation content, with plain explanations before technical detail."""

BASELINE = "afb4f54a83eafcd0f10232adbbeeae92292c293a"
AUTHOR = "Muhammad Danu Susyanto"
COMMON = (
    "This document explains the HearDesk features and code reviewed for this portfolio. "
    "The results describe the recorded version and test environment. They do not represent "
    "a customer contract, independent certification or measured business results."
)
ACCESS = [
    "Each Company has its own inbox for authorized team members. Platform Owners can read their own Company’s reports through their Company membership. Reading another Company’s reports requires membership and permission in that Company.",
    "Visitors can view their submitted message, report status, and public team replies using a private tracking link or code. Anyone with that link or code can view the report, so visitors should keep it private.",
    "The tracking page does not show email addresses, page details, screenshots, internal notes, or staff identities.",
]


def section(title, paragraphs=(), table=None, diagram=None, image=None):
    return {
        "title": title,
        "paragraphs": list(paragraphs),
        "table": table,
        "diagram": diagram,
        "image": image,
    }


FSD = [
    section("About this document", [
        COMMON,
        "Version 1.0, written in English by " + AUTHOR + ". This Functional Specification Document describes what users can do and the checks used to confirm each feature works.",
        "Intended readers include recruiters, website owners, testers and developers. The reviewed source-code version, identified by its Git commit, is " + BASELINE + ".",
    ], table=[
        ["Item", "Description"],
        ["Product", "HearDesk website feedback workspace"],
        ["Document purpose", "Explain features, user permissions, workflows and expected results"],
        ["Publication", "Portfolio edition based on implemented behavior"],
        ["Maintenance", "Update feature descriptions and related tests when behavior changes"],
    ]),
    section("Purpose and problem statement", [
        "Adding feedback to a website involves more than displaying a form. Developers also need to check submitted information, store reports and screenshots, and build tools for the team to review and answer reports. Building these features separately for every website adds development and maintenance work.",
        "HearDesk provides a feedback system that website owners can connect to an existing site. They register the website, copy the script provided by HearDesk, and add it to the website. HearDesk supplies the form, stores the reports and provides the team's inbox.",
        "Visitors can send feedback without creating an account. After submission, they save a private tracking link and code to check their report's status and read team replies. Internal notes and screenshots are available only to team members with permission.",
        "The HearDesk service must be available. The installed script must use the correct website code, the website address must match its registration, and the website's security settings must allow the widget to load.",
        "The project demonstrates full-stack development, access control and automated testing. No user count, revenue or measured time saving is claimed.",
    ]),
    section("Terms used in this document", table=[
        ["Term", "Meaning in HearDesk"],
        ["Company", "A workspace for a team and its websites. Each Company has its own reports and members."],
        ["Site", "A website registered within a Company."],
        ["Widget", "The small feedback form opened from a button on the registered website."],
        ["Report / feedback", "A visitor's submitted issue, suggestion or compliment."],
        ["Public reply", "A team reply visible through the report's private tracking link or code. It is not an open internet discussion."],
        ["Internal note", "A message visible only to Company team members who can access the report."],
        ["Platform Owner", "An account that manages the HearDesk service, including Companies, accounts and usage limits. Company membership separately controls inbox access."],
        ["Acceptance criterion", "An observable result used to check that a requirement works."],
    ]),
    section("System context", [
        "The website owner adds a HearDesk script to the website. That script opens the feedback form inside an embedded page supplied by HearDesk. The visitor sends a report, and the website team reviews it in HearDesk.",
        "Platform Owners manage the service. Their Company membership determines which Company inboxes they can read, including their own Company's inbox.",
    ], diagram="system-context"),
    section("Included features and current limitations", [
        "The application supports team sign-in, Company membership, website setup, visitor reports, optional screenshots, report filters, status changes, internal notes, team replies, private tracking, charts, Excel reports and platform management.",
        "Visitors can read replies but cannot reply through the tracking page. Lost tracking links and codes cannot be recovered by email. The page shows the current status, not a history of every status change.",
        "Local email tests use a test mailbox. Real email delivery, billing, native mobile apps and public deployment are outside this documented release. The report does not establish uptime guarantees or a data-retention policy.",
    ]),
    section("Users and responsibilities", table=[
        ["User", "What they can do"],
        ["Visitor", "Submit without login and read one report using its private link or code."],
        ["Company OWNER", "Manage the Company and all supported Company actions."],
        ["Company ADMIN", "Manage feedback, websites and non-owner team functions. Cannot change Company settings or transfer ownership."],
        ["Company AGENT", "Read websites and reports, change report status, write internal notes and reply to visitors."],
        ["Company VIEWER", "Read Company information, websites and reports. Cannot change reports or send replies."],
        ["Platform Owner", "Manage HearDesk Companies, accounts and usage limits. Reading any Company's inbox requires membership and permission in that Company."],
    ]),
    section("Company permission matrix", [
        "The table describes permissions within one Company. The server also checks that the account is active, the email is verified, the membership is current and the Company is active.",
    ], table=[
        ["Action", "OWNER", "ADMIN", "AGENT", "VIEWER"],
        ["Read reports and websites", "Yes", "Yes", "Yes", "Yes"],
        ["Change report status", "Yes", "Yes", "Yes", "No"],
        ["Write internal note or team reply", "Yes", "Yes", "Yes", "No"],
        ["Manage websites", "Yes", "Yes", "No", "No"],
        ["Manage non-owner team members", "Yes", "Yes", "No", "No"],
        ["Read usage totals", "Yes", "Yes", "No", "No"],
        ["Company settings and ownership transfer", "Yes", "No", "No", "No"],
    ]),
    section("Report access and privacy", ACCESS),
    section("Functional requirements", table=[
        ["ID", "Feature", "Acceptance criterion"],
        ["FR-01", "Team sign-in", "Users with a valid login and the required permissions can open the workspace. Visitors who are not signed in cannot open the team inbox."],
        ["FR-02", "Separate Company reports", "A member cannot read or change reports, notes or screenshots in another Company unless they also have permission there."],
        ["FR-03", "Website settings", "Allowed team members can set the registered website address, button label and position. The same address cannot be registered twice within one Company."],
        ["FR-04", "Widget installation", "The supplied script opens the form when HearDesk is available, the website code and registered address match, and the website allows the script and embedded page to load."],
        ["FR-05", "Visitor submission", "Visitors can submit an issue, suggestion or compliment without signing in."],
        ["FR-06", "Optional screenshot", "One supported image is processed and stored privately. Unsupported or oversized files show an error."],
        ["FR-07", "Retry without duplicates", "Repeating an unchanged submission with the same request identity returns the saved result without creating another report or consuming the report allowance again."],
        ["FR-08", "Private tracking access", "A tracked submission returns a private code. An unchanged retry returns the same code. Reusing the request identity with a different code is rejected."],
        ["FR-09", "Inbox search and filters", "Team members can search and filter their Company's reports. Page sizes are 10, 25, 50 or 100 reports."],
        ["FR-10", "Report status", "Allowed team members can set NEW, REVIEWING, DONE or ARCHIVED. The screen shows the new status after the server saves it."],
        ["FR-11", "Internal notes", "Saved notes appear to the team but never on the visitor tracking page."],
        ["FR-12", "Replies for visitors", "OWNER, ADMIN and AGENT can reply to reports that have tracking access. VIEWER and unauthorized members of other Companies cannot reply."],
        ["FR-13", "Tracking without login", "A valid private link or code shows the report message, current status and team replies. Private team data stays hidden."],
        ["FR-14", "Charts and Excel reports", "The monthly chart and Excel reports agree with the Company's report totals for the selected period."],
        ["FR-15", "Platform management", "Platform Owners use a separate console to manage the service. Supported management actions record who acted and what changed."],
        ["FR-16", "Usage limits", "Website creation, team membership, report submission and storage follow the Company's configured limits and active status."],
        ["FR-17", "Loading and errors", "Users can see loading, empty and error states. A delayed response for an earlier tracking code cannot replace the report they are currently viewing."],
    ]),
    section("Use case UC-01: send feedback", [
        "Who: a website visitor. Before starting: the website is registered in an active Company and the HearDesk widget is available.",
        "Steps: open the widget, choose a category, enter a message, optionally provide an email or screenshot, and submit. Save the private tracking link and code shown after success.",
        "If the request fails because of invalid input, a usage limit or a rate limit, the form shows an error. If the connection fails after the report was saved, retrying the unchanged form reuses its request identity and tracking code. Changing the form creates a new submission identity.",
        "Expected result: one accepted report, correct usage totals and a saved tracking code. The visitor is told to keep the code private because anyone holding it can read the report.",
    ]),
    section("Use case UC-02: review and reply", [
        "Who: a Company team member with permission to update reports. Open the inbox, select a report, read its message and any available private details, then update the status or write an internal note.",
        "To answer the visitor, use the separate public-reply form. Here, public means visible to someone holding that report's private link or code. Replies appear as 'Tim website', which means 'Website team'. The tracking page does not display the individual staff member's identity.",
        "Retrying the same reply request does not create a second reply. Older reports without tracking access do not become visible to visitors automatically.",
    ]),
    section("Use case UC-03: check a report", [
        "Who: a visitor with the saved private tracking link or code. Open the link or enter the code on the tracking page. Read the current status and team replies, then use 'Perbarui status' ('Refresh status') to check for changes.",
        "An invalid or unknown code displays an error. Reports from a suspended Company are not shown. If the visitor enters another code, responses still arriving for the old code are ignored.",
        "The visitor must keep the link or code. Providing an optional email address when submitting a report does not enable recovery of a lost code.",
    ], diagram="tracking-sequence"),
    section("Input rules and limits", table=[
        ["Input or rule", "Observed behavior"],
        ["Message, note or reply", "Leading and trailing spaces are removed. The remaining text must contain 1 to 5,000 characters."],
        ["Category", "Issue, suggestion or compliment. Stored values are ISSUE, SUGGESTION and COMPLIMENT."],
        ["Email", "Optional. If supplied, it must be a valid email address of at most 254 characters."],
        ["Screenshot", "Up to 5 MiB of image input. The complete upload request is limited to 6 MiB. MiB is the binary unit used by these checks."],
        ["Tracking code", "A random 48-character code. The database stores a calculated hash rather than the original code. Technical details are in the TDD."],
        ["Website code", "Identifies the website for widget setup. It does not log anyone into the team inbox."],
        ["Page address", "An HTTP/HTTPS URL of at most 2,048 characters. Query text after '?' and the fragment after '#' are removed before storage."],
        ["Request limits", "In a 60-second window, submission allows 5 requests per client key and 100 globally. Tracking allows 30 per client key and 300 globally. The client key is a server-generated rate-limit identifier, not a visitor account."],
        ["Tracking access", "Requires a matching code and an active Company. Email, page details, screenshots, internal notes and staff identities stay hidden."],
        ["Monthly reporting", "Month-based report counts and allowances use UTC boundaries, not the visitor's local timezone."],
    ]),
    section("What the status values mean", [
        "NEW means received, REVIEWING means under review, DONE means completed, and ARCHIVED means archived. These values describe the current status.",
        "The diagram shows a typical review order. The application does not force users to follow that order. Staff with permission can choose any supported value, including reopening a report. The visitor page does not show a timeline of previous status changes.",
    ], diagram="feedback-status"),
    section("Screen checklist", table=[
        ["Screen", "Purpose", "Expected behavior"],
        ["Landing and demo", "Explain the product", "The example widget is labeled as a demo and does not save reports. Its dialog can be opened and closed with a keyboard."],
        ["Website settings", "Set up a widget", "The script and website code match saved settings. Replacing a code retires the old one."],
        ["Widget", "Send feedback", "The form, upload errors and private tracking link work inside the website and on small screens."],
        ["Inbox and report detail", "Review and respond", "Saved status is visible. Internal notes and replies for visitors have separate forms."],
        ["Tracking", "Check progress", "Link and manual-code access work. Loading, errors, no-reply messages and refresh are visible."],
        ["Platform console", "Manage the service", "Management access does not replace the Company membership required to read reports."],
    ]),
    section("Requirements and supporting tests", [
        "Requirement IDs connect this document to the automated tests. These references help a maintainer find the checks for a feature. They do not mean every possible user action has been tested.",
    ], table=[
        ["Requirements", "Principal test files"],
        ["FR-01, FR-04 to FR-08", "tests/e2e/application.spec.ts\ntests/integration/visitor-request.test.ts"],
        ["FR-02, FR-12", "tests/e2e/zz-company-isolation.spec.ts\ntests/integration/feedback-tracking.test.ts"],
        ["FR-03, FR-09", "tests/e2e/visual.spec.ts\ntests/e2e/zz-filter-ui.spec.ts"],
        ["FR-10 to FR-13", "tests/e2e/zz-tracking.spec.ts\ntests/components/detail.test.tsx"],
        ["FR-14", "tests/e2e/zz-feedback-reporting.spec.ts"],
        ["FR-15", "tests/e2e/zz-platform.spec.ts"],
        ["FR-17", "tests/e2e/zz-skeleton.spec.ts\ntests/components/feedback-tracking.test.tsx"],
    ]),
    section("Limits of this specification and sources", [
        "The tests cover selected workflows in a stated environment. They do not establish support for every browser or compliance with every accessibility requirement. Real email delivery, data-retention rules and service commitments need separate decisions before customer use.",
        "Primary sources: src/lib/validation.ts, src/modules/companies/domain/access.ts, src/modules/feedback/application/company-feedback.ts, src/server/feedback.ts, src/app/api/feedback/track/route.ts and prisma/schema.prisma. Companion documents describe the technical design, browser test results and SonarQube findings.",
    ]),
]

TDD = [
    section("About the design", [
        COMMON,
        "This Technical Design Document explains how the implemented application works. The reviewed source-code version is Git commit " + BASELINE + ".",
        "HearDesk runs as one application divided into feature modules. This is a modular monolith. Modules keep related code together, while the application can still be deployed as one unit. The modules are not separate network services.",
        "Package versions in the reviewed code: Next.js 16.3.8, React 19.3.0, Prisma 7.10.0, Better Auth 1.7.7, pg 8.23.1, Zod 4.6.5, Sharp 0.35.5, Playwright 1.63.0, Vitest 5.0.3 and GSAP 3.15.0. The Node engine requirement is ^22.18.0 || >=24.11.0. This records project configuration rather than a support commitment from those libraries.",
    ]),
    section("Terms used in the design", table=[
        ["Term", "Meaning"],
        ["Company / Site", "A Company is a team workspace. A Site is one website registered in that workspace. Organization is the database model behind Company."],
        ["Origin", "The protocol, hostname and port of a website, such as https://example.com. A path or query is not part of the origin."],
        ["iframe", "An embedded page inside another page. The widget form is served by HearDesk inside the website."],
        ["API and DTO", "An API is an interface used to send requests. A DTO (data transfer object) is the selected set of fields returned to a caller."],
        ["Use case / port / adapter", "A use case performs a business action. A port defines an operation it needs. An adapter implements that operation using a database, file store or other service."],
        ["Repository", "Code that reads or writes stored records and applies the required query restrictions."],
        ["Transaction / unit of work (UoW)", "A transaction groups database changes so they succeed or fail together. The Company UoW supplies the access checks and repositories used inside that operation."],
        ["Hash / fingerprint", "A hash is a value calculated from input. A fingerprint is a hash used here to compare submission content. Hashing is not reversible encryption."],
        ["Bearer code", "A secret that grants access to its holder. Anyone with the tracking code can read the corresponding report."],
        ["Idempotency", "Repeating the same identified request does not create another report or reply. The request identity and content must match."],
        ["Reservation / quota", "A reservation temporarily claims capacity before a report is saved. A quota is a configured usage limit."],
        ["PK / FK / nullable", "Primary key identifies a record. Foreign key links it to another record. Nullable means the field may be absent."],
    ]),
    section("Application topology", [
        "The website owner registers a Site and adds the supplied script. The script opens the HearDesk form in an iframe. HearDesk then checks the input, stores the report and provides the team and visitor screens. The host website does not need its own feedback backend or review dashboard.",
        "Setup requires an available HearDesk service, the correct Site key, a matching registered origin and host security settings that permit the script and iframe. Content Security Policy (CSP) is the browser policy that can restrict which scripts and embedded pages a website loads.",
        "The browser calls Next.js routes. The routes validate requests and call application logic. Database adapters use Prisma and PostgreSQL, while private screenshot files use separate storage. Company membership and permissions control team access. The platform console has its own service-management checks.",
    ], diagram="application-architecture"),
    section("Module responsibilities and dependency direction", table=[
        ["Area", "Responsibility", "Source"],
        ["identity", "Sign-in, sessions, email verification and the current user", "src/modules/identity"],
        ["companies", "Company membership, roles, ownership and active status", "src/modules/companies"],
        ["websites", "Website addresses, widget codes and Company ownership", "src/modules/websites"],
        ["feedback", "Submission, report access, replies and report summaries", "src/modules/feedback"],
        ["usage", "Report and storage limits, reservations and counts", "src/modules/usage"],
        ["platform", "Service-management views, actions and audit records", "src/modules/platform"],
        ["HTTP / UI", "Request checks, responses and user interaction", "src/app, src/components, src/server"],
        ["Composition", "Connects business operations to access checks and storage adapters", "src/server/composition"],
    ]),
    section("Why these design choices were made", table=[
        ["Choice", "Reason", "Trade-off"],
        ["Script and iframe", "Reuse one feedback system across existing websites.", "The website still needs the snippet, correct registration and compatible security settings."],
        ["Modular monolith", "Keep related code together and deploy one application.", "Code checks and tests enforce module boundaries. They are not network isolation."],
        ["Company ownership", "Follow each report's Site to its Company and check current membership.", "Every relevant query and write must apply the Company restriction."],
        ["Capacity reservations", "Prevent simultaneous requests or retries from bypassing usage limits.", "Failures need cleanup of temporary records and any staged files."],
        ["Hash-only tracking", "Check a code without storing its original value.", "Lost codes cannot be recovered. The browser must retain the code for an unchanged retry."],
        ["Separate reply records", "Make replies visible to visitors an explicit action distinct from internal notes.", "The team manages two separate message histories."],
        ["Private screenshot storage", "Serve screenshots only after a permission check.", "A usable backup must include both database records and image files."],
        ["Native dialog and GSAP", "Use browser dialog behavior with controlled animation and reduced-motion support.", "Code-analysis tools may not immediately recognize newer HTML attributes."],
    ]),
    section("Company authorization and transactions", [
        "createCompanyServices connects the Company access UoW to its repositories. For an operation, it receives the user (actor), Company ID and required permission. It checks the current account, verified email, membership, role and Company status. A Company ID supplied by a request is not trusted as proof of access.",
        "The FSD contains the Company permission matrix. Writing a public reply uses feedback:note, the permission held by OWNER, ADMIN and AGENT. Here, public means visible through the report's private tracking link.",
        "Platform Owners can read their own Company's reports through their Company membership. Reading another Company's reports requires membership and permission in that Company. The server applies these checks regardless of platform role. Older /api/admin routes resolve the Company and call the same services.",
        "Repository queries filter on Site.companyId. A missing report, an unauthorized report or a report without tracking access cannot receive a public reply. Supported platform-management actions record an audit event. This is not a claim that every report change has its own audit event.",
    ], diagram="identity-company-model"),
    section("Core data relationships", [
        "The entity relationship diagram (ERD) shows records and how they connect. It is split into two diagrams so the labels remain readable. Organization stores the Company, Member links a user to a Company, and Site links reports to the correct Company.",
        "Each Feedback record may have one Attachment and many InternalNote and PublicReply records. An internal note is team-only. A PublicReply is visible to someone with that report's private code. The following tables name the important database fields and constraints.",
    ], diagram="feedback-data-model"),
    section("Data dictionary: application records", table=[
        ["Model", "Key fields / constraints", "Purpose"],
        ["Organization / Member", "Organization.id\nunique Member(organizationId,userId)", "Company workspace and user membership. The same user cannot have duplicate memberships in one Company."],
        ["CompanyProfile", "organizationId PK/FK\nACTIVE/SUSPENDED", "Whether the Company is active or suspended."],
        ["Site", "id, companyId, unique publicKey\nunique(companyId,origin)", "Registered website and widget settings."],
        ["Feedback", "id, siteId, fingerprint\nunique(siteId,submissionId)\nnullable unique trackingHash", "Report content and status, with request matching and optional private tracking."],
        ["Attachment", "unique feedbackId, unique storage key\nfilename, mime, size", "Private image-file details. Image bytes are stored separately."],
        ["InternalNote", "feedbackId, authorId, body, createdAt", "Messages for the team only."],
        ["PublicReply", "feedbackId, authorId\nunique(feedbackId,requestId)", "Replies visible through tracking. The writer's identity is stored privately."],
        ["CompanyLimits / Usage", "Company FK, limits, storedBytes", "Allowed usage and the number of stored bytes."],
        ["ReportUsagePeriod / Reservation", "UTC period, expiry\nunique(siteId,submissionId)", "Monthly report counts and temporary claims for in-progress submissions."],
        ["AuditEvent", "actorSnapshot, action, resource\noptional Company, timestamp", "Who performed a supported management action, what it affected and when."],
    ]),
    section("Other supporting records", [
        "User, Session, Account and Verification support Better Auth sign-in and email verification. A session identifies an ongoing login. Session tokens and account secrets remain private. Invitation records support team invitations.",
        "CompanyCreationRequest keeps the identity and content fingerprint needed to avoid duplicate Company creation on retry. RateBucket and rateLimit count requests for application and authentication limits. StorageBudget and UploadReservation track available storage and temporary uploads.",
        "The full schema, including which fields are optional and which indexes help queries, is in prisma/schema.prisma. The diagrams omit some support tables for readability rather than implying those tables do not exist.",
    ]),
    section("Submission and retry handling", [
        "Before sending a report, the widget creates a submissionId (a UUID used to identify the request) and a 24-byte random tracking code. Multipart means the request can carry form text and an image file together. readFeedbackForm checks the allowed fields, rejects repeated field values, requires multipart input and limits the complete request to 6 MiB. feedbackInput then checks the content.",
        "The server calculates a SHA-256 fingerprint from the checked feedback fields, image hash and tracking-code hash when provided. SHA-256 produces a fixed-length value used for comparison. Reusing the same Site and submissionId with matching content is idempotent, so it does not create another report. Changed content or a changed tracking code under the same identity returns a conflict instead of replacing the saved report.",
        "Older clients may omit trackingCode and continue to submit without tracking access. A submission UUID alone cannot reveal or replace the visitor's tracking code.",
        "submitVisitorFeedback finds the Site and Company, reserves capacity, prepares an image if present, and saves the report and usage totals. On failure it releases reservations and removes prepared files when needed. A new saved report returns HTTP 201. A matching retry returns HTTP 200 and the same caller-supplied tracking code. An empty screenshot is treated as no screenshot.",
    ], diagram="submit-sequence"),
    section("Private tracking and the visitor response", [
        "The link is /track#code=<secret>. The part after '#' is a URL fragment, which the browser does not send as the page request path or query. The tracking page reads it and sends the code in the body of POST /api/feedback/track. It omits cookies and asks for no caching. This reduces exposure in URL logs, but anyone holding the link or code still has access to the report.",
        "The server accepts only the expected JSON fields, checks the request origin, applies request limits, hashes the code and searches for the matching report in an active Company. The DTO, or response field set, contains website name, message, category, current status, timestamps and replies. Each reply includes its ID, text and timestamp, without the writer's identity.",
        "The response excludes the report ID, Company ID, email, page URL, screenshot and internal notes. Cache-Control: private, no-store prevents storage by compliant caches. X-Content-Type-Options: nosniff tells browsers not to guess another response type. Page headers also control referrer information.",
        "There is no email recovery for a lost code. Visitors must save their private tracking link or code, and documentation screenshots must not expose a live code.",
    ], diagram="tracking-sequence"),
    section("Public API contract", [
        "An API contract describes the request fields and the server's response. HTTP 2xx codes indicate success. The listed 4xx and 5xx codes identify rejected requests or server failures. Routes containing [key] or [companyId] use the actual value at that position.",
    ], table=[
        ["Method / route", "Input", "Response / important failures"],
        ["POST /api/feedback", "Multipart: siteKey, submissionId, type, message. Optional: email, pageUrl, screenshot, trackingCode.", "201 new report or 200 matching retry. 400 invalid input, 404 missing/inactive widget at first lookup, 413 too large, 415 unsupported media, 409 changed/in-progress/invalid reservation, 422 Company allowance exhausted, 403 suspension during processing, 429 too many requests, 503 capacity/processing/unexpected failure."],
        ["POST /api/feedback/track", "JSON with one code of 48 lowercase hexadecimal characters.", "200 selected visitor fields. 400 invalid request, 403 origin rejected, 404 unknown code or inactive Company, 429 too many requests."],
        ["GET /widget/[key]", "Site public key and optional parentOrigin.", "The configured form or a not-found response when the key/origin is not allowed."],
        ["GET /api/health", "No customer data.", "Readiness status without report content."],
    ]),
    section("Company API contract", [
        "These routes require a signed-in user and Company permissions. The prefix for shortened routes is /api/companies/[companyId]. Each returned report must belong to that Company.",
    ], table=[
        ["Method / route", "Permission / request", "Behavior"],
        ["GET /api/companies/[companyId]/feedback", "feedback:read, checked filters and pagination", "Reports for the authorized Company, divided into pages."],
        ["GET/PATCH .../feedback/[feedbackId]", "feedback:read or feedback:status, supported status value", "Read detail or save status. Reject reports outside the allowed Company."],
        ["POST .../feedback/[feedbackId]/notes", "feedback:note, body of 1 to 5,000 characters", "201 team-only note."],
        ["POST .../feedback/[feedbackId]/replies", "feedback:note, body and requestId UUID", "201 team reply. Matching retries return the same record, while changed text under the same requestId is rejected."],
        ["GET .../attachments/[attachmentId]", "feedback:read", "Private image download after permission checks."],
        ["GET .../feedback/statistics", "Company feedback-read permission", "Checked monthly report totals."],
        ["GET .../feedback/export", "Company feedback-read permission", "Excel report for a supported reporting period."],
        ["/api/admin/*", "Older routes with explicit Company context", "Call the same restricted services rather than providing access to every Company's inbox."],
    ]),
    section("Errors, files and delayed responses", [
        "Zod checks input and returns field errors when it is invalid. HttpError carries an intended status and message. Company errors distinguish missing login, insufficient permission and a resource that cannot be found. Unexpected errors return a generic message and request ID rather than database details.",
        "The error response's error.requestId is a server-generated reference for troubleshooting that failure. It is separate from the client-generated report submissionId and reply requestId. Keep the original client-generated ID when retrying unchanged content. Do not use the error reference as a retry ID.",
        "Sharp processes screenshot images into the supported stored format. Image files are private, with authorized downloads through the server. Temporary uploads and reservations are cleaned up after failures. Database records alone are not a complete backup because the image bytes live in separate files.",
        "The tracking component numbers its requests. A delayed result from an earlier code lookup is ignored after a newer lookup starts. The report-detail page similarly avoids displaying a previous report under a new report ID. Reply retries retain their request ID until the text changes or the send succeeds.",
        "GSAP animations remove their effects when components are no longer active and respect reduced-motion preferences. The UI displays a changed report status only after the server saves it.",
    ]),
    section("Operation and design limits", [
        "Use the project's Node version requirement and generate the Prisma client before building. Database migrations are versioned schema changes. Review them and back up both the database and screenshot files before applying them. The application's normal database account and the account allowed to migrate the schema have separate privileges.",
        "The E2E runner checks that it targets ureport_test before clearing test data. It must never point to the application database. Local email is written to a test mailbox rather than delivered to a real recipient.",
        "Visitors cannot reply through tracking, lost codes cannot be recovered, and status history is not implemented. These are current design limits. Hosting details and a public application address are not claimed by this documentation.",
    ]),
    section("Verification and source references", [
        "Unit tests check small business operations. Component tests exercise individual UI components. Integration tests use PostgreSQL to check real queries, permissions and usage counts. End-to-end tests drive the browser against the running application. Each type checks a different layer.",
        "SonarQube imports LCOV files, a format that records which code tests executed. These figures are separate from browser scenario pass counts. The companion test and quality reports retain dates and results.",
        "Sources: prisma/schema.prisma, src/server/composition/company-services.ts, src/modules/feedback/application/submit-visitor-feedback.ts, src/modules/usage/infrastructure/prisma-visitor-usage.ts, src/proxy.ts, public/widget.js, docs/adr/0001-modular-monolith.md and docs/adr/0002-company-data-ownership.md.",
    ]),
]

E2E_SCENARIO_SUMMARIES = {
    ("application.spec.ts", "successful setup with failed auto-login does not ask to create account again"):
        "Account setup remains complete if automatic sign-in fails. The user is not asked to create the account again.",
    ("application.spec.ts", "setup, private admin, anonymous widget, attachments and logout"):
        "Users can complete setup, access the admin workspace, submit anonymous feedback with an image attachment, and sign out.",
    ("application.spec.ts", "anonymous retries, conflicting payloads, invalid files and request limits"):
        "Retrying an unchanged submission does not create a duplicate report. Reusing its ID with changed content, uploading an invalid image, or exceeding request limits is rejected.",
    ("landing.spec.ts", "landing motion settles after rapid interaction and respects reduced motion"):
        "Landing page animations finish correctly after rapid interaction and follow reduced-motion settings.",
    ("landing.spec.ts", "completed entrances remain settled across resizing and preference changes"):
        "Completed opening animations stay in their final position when the window is resized or motion preferences change.",
    ("landing.spec.ts", "widget illustration contents fit at intermediate widths"):
        "The example widget illustration on the landing page fits within its container at widths between mobile and desktop layouts.",
    ("landing.spec.ts", "public landing demo never writes feedback and works on mobile"):
        "The landing page demo works on mobile and does not send or save real feedback.",
    ("visual.spec.ts", "website list and add form align side-by-side on desktop and stack on mobile"):
        "The website list and add-website form appear side by side on desktop and stack vertically on mobile.",
    ("visual.spec.ts", "desktop and mobile workspace render without overflow"):
        "The workspace fits desktop and mobile screens without content overflowing the layout.",
    ("visual.spec.ts", "search, filters, settings persistence and public widget configuration"):
        "Search and category/status filters show matching reports or an empty state. The saved website name, button label, and button position remain after reload and appear in the visitor widget.",
    ("visual.spec.ts", "widget key rotation requires confirmation and retires old key without deleting reports"):
        "Replacing a widget key requires confirmation. The previous key stops working, while existing reports are retained.",
    ("zz-company-isolation.spec.ts", "Company API and legacy routes reject foreign reports, notes, attachments and platform-only access"):
        "Company APIs and older endpoints block access to another Company's reports, notes, and attachments. Platform-level permissions alone do not grant access.",
    ("zz-feedback-reporting.spec.ts", "Company monthly line chart and three Excel periods match aggregate data"):
        "The Company's monthly chart loads. Annual, monthly, and all-time Excel exports match the report totals and row counts returned for each period.",
    ("zz-filter-ui.spec.ts", "filter popover floats without shifting table and preserves URL context"):
        "Opening the filter panel does not move the table. Applying a filter keeps the selected page size in the URL.",
    ("zz-platform.spec.ts", "platform owner has separate console, real metadata and audited Company management"):
        "The Platform Owner has a separate console with activity charts, Company records, and account controls. Company suspension, reactivation, and website-limit changes work, and the saved limit change appears in the audit log.",
    ("zz-session-navigation.spec.ts", "landing and login recognize current owner session and revoked cookies"):
        "The landing and login pages recognize an active Platform Owner session. Reusing its cookies after sign-out does not restore access.",
    ("zz-skeleton.spec.ts", "data skeletons remain until response, disappear on success/error and respect reduced motion"):
        "Loading placeholders remain visible while requests are pending, disappear after success or an error, and follow reduced-motion settings.",
    ("zz-tracking.spec.ts", "visitor tracks an anonymous report and sees public replies but never internal notes"):
        "Visitors can track an anonymous report and read public team replies. Internal notes remain hidden.",
    ("zzz-onboarding.spec.ts", "local client verifies email, creates Company, connects website and resets password"):
        "A new user can verify their email through the local test mailbox, create a Company, add a website, and reset their password.",
}

E2E = [
    section("Purpose and recorded version", [
        COMMON,
        "End-to-End UI testing means using a real browser to follow a user workflow through the running application. Playwright performs actions such as filling the feedback form and checking the result on screen. These tests used a production build, meaning the compiled application intended for deployment, in a separate local test environment.",
        "The run recorded here started on 13 October 2026 at 04:14:49.928 UTC. It tested Git commit " + BASELINE + ". The result is historical evidence, not a new test execution caused by a wording update to this document.",
        "The scenario table comes from the Playwright result file. A scenario is one named test and can contain several steps and checks. A check in test code is called an assertion.",
    ]),
    section("Test environment", table=[
        ["Item", "Configuration and meaning"],
        ["Test tool", "Playwright 1.63.0 with Chrome on Windows. Headless means the browser ran without a visible desktop window."],
        ["Application", "Next.js production build with E2E_PRODUCTION=true, served locally on port 3100."],
        ["Example website", "A local website on port 3200 that embeds the widget."],
        ["Database", "ureport_test, checked by the runner before data cleanup. The application database was not used."],
        ["Execution order", "One worker runs tests sequentially. Some scenarios depend on records created by earlier scenarios."],
        ["Saved evidence", "Structured result file, selected screenshots and failure traces when a test fails."],
        ["Email", "A local test mailbox. No real email delivery is tested."],
        ["Source version", BASELINE],
    ]),
    section("How the tests were run", [
        "The application was built in .next-sonar, a separate build directory. The test runner checked its database target, applied test-database migrations, cleared previous test records and started both the application and example website. Tests used sample accounts and reports, not customer data.",
        "Recorded command: HEARDESK_BUILD_DIR=.next-sonar E2E_PRODUCTION=true npm run test:e2e -- --reporter=json. On Windows, these environment variables are set before running npm. The JSON option saves results in a structured format that can be checked automatically.",
        "Successful process exit codes and scenario results are separate checks. Log warnings also need review. A test fixture means the sample accounts, websites and reports created for the tests.",
    ]),
    section("Features covered by the browser tests", table=[
        ["Group", "FSD IDs", "What the tests check"],
        ["Sign-in and setup", "FR-01, FR-02", "Create or verify a test account, open the right workspace and reject a session that has been revoked."],
        ["Visitor widget", "FR-04 to FR-08", "Open the embedded form, submit a report, attach an image, save tracking access and retry without a second report."],
        ["Inbox and settings", "FR-03, FR-09 to FR-11", "Search reports, use filters, save website settings, update status and add internal notes."],
        ["Private tracking", "FR-12, FR-13", "Open the private tracking page, read team replies and refresh status without exposing internal notes."],
        ["Company separation", "FR-02, FR-06", "Reject requests for another Company's reports, notes and screenshots without the required membership."],
        ["Reporting", "FR-14", "Compare the monthly chart and Excel output with stored report totals."],
        ["Platform management", "FR-15", "Use the separate service-management console and check records of supported administrative actions."],
        ["Screen behavior", "FR-17", "Check loading placeholders, errors, dialogs, reduced motion and layouts at different screen widths."],
    ]),
    section("UI test UC-01: send feedback and save tracking access", [
        "Starting state: a registered test website belongs to an active Company. The visitor does not have a login session.",
        "Steps: open the example website and its feedback widget. Enter a message, optionally attach a screenshot, and submit. Read the success message and save the private tracking link and code.",
        "Expected result: one report is saved and the code has 48 hexadecimal characters. The link opens /track#code=… without requiring visitor login. Retrying the same identified request with unchanged content does not create a second report.",
        "Related rejection checks cover changed content under a reused request identity, unsupported files and too many requests. The recorded scenario outcomes appear in the results table.",
    ]),
    section("UI test UC-02: read team replies without seeing internal notes", [
        "Starting state: a tracked report exists and a test team account can update it.",
        "Steps: send a reply to the visitor, add a separate internal note and set the report to REVIEWING. Open the tracking link in a visitor browser context, which has no team login. Check the reply and status, then set DONE in the team view and refresh the visitor page.",
        "Expected result: the visitor sees the team reply and updated status, but cannot see the internal note. The link also opens in a new tab from the widget. An unknown code shows an error, and entering the correct code restores the report view.",
        "The scenario checks page width on phone-sized and desktop screens. It uses separate team and visitor contexts so a team login cannot accidentally make the anonymous flow pass.",
    ], diagram="tracking-sequence"),
    section("UI test UC-03: dialogs, loading and screen sizes", [
        "Landing tests open and close the demo, press Escape, click outside the dialog and use the interactive preview. They also check that animations finish correctly after resizing and that reduced-motion preferences are respected.",
        "Inbox tests check filters, website settings and loading placeholders. A skeleton is a temporary placeholder shown while a request is loading. The tests check that placeholders disappear when results or errors arrive.",
        "Screenshots show appearance, while assertions check behavior. Passing in this Chrome environment does not establish full compatibility with every other browser or assistive technology.",
    ]),
    section("Test results", [
        "All 19 scenarios passed. A scenario is marked Passed when all checks in its automated test succeed. No scenarios failed unexpectedly or were skipped, and none passed only after a retry.",
        "Table 3 summarizes the workflows and application behavior checked during this run. Section 14 lists the original test names and source files using the same scenario IDs.",
    ], table="E2E_RESULTS"),
    section("Screenshot: landing page", [
        "Captured during the recorded browser run. The reports shown in the landing preview are examples, not customer submissions.",
    ], image="landing-desktop.png"),
    section("Screenshot: team inbox", [
        "The inbox contains test reports in a separate test environment. It shows the screen used to review feedback and does not represent real customer activity.",
    ], image="workspace-desktop.png"),
    section("Screenshot: visitor widget", [
        "The registered test website displays the feedback form at a phone-sized screen width. The selected screenshot does not display a live private tracking code or a password.",
    ], image="widget-mobile.png"),
    section("What the results establish", [
        "All recorded scenarios passed on the stated version and environment. This verifies those workflows, not every possible use of the app. It does not measure heavy-load performance, prove that all vulnerabilities are absent, or establish production availability.",
        "Earlier test logs contained warnings about concurrent pg queries and Vite configuration compatibility. A warning is different from a failed assertion and should still be reviewed. Some tests need the records produced by earlier tests, so running a single file may require additional setup.",
        "Separate recorded checks passed 269 unit/component tests and 90 integration tests on 13 October 2026. Those counts are supporting evidence and are not included in the 19 browser scenarios.",
    ]),
    section("How to maintain this report", [
        "Keep the test date, Git commit, browser, result file and screenshots together. When a feature changes, update its FSD requirement and test assertions before recording new results. Traces can include form data and are not automatically published.",
        "Source files: tests/e2e/application.spec.ts, landing.spec.ts, visual.spec.ts, zz-company-isolation.spec.ts, zz-feedback-reporting.spec.ts, zz-filter-ui.spec.ts, zz-platform.spec.ts, zz-skeleton.spec.ts, zz-session-navigation.spec.ts, zz-tracking.spec.ts and zzz-onboarding.spec.ts.",
    ]),
    section("Test source references", [
        "The original automated test names are listed here for readers who want to locate the checks in the code. The source files are in tests/e2e. Each ID matches the plain-language description in Table 3. File names and line numbers refer to the recorded source version.",
    ], table="E2E_REFERENCES"),
]

SONAR = [
    section("About this report", [
        COMMON,
        "SonarQube checks source code for potential problems and imports test coverage results. This report records project heardesk on branch master. The results retrieved for the analysis dated 13 October 2026 at 03:37:04 UTC (10:37:04 WIB) showed Quality Gate OK.",
        "The available SonarQube API response did not identify the exact Git commit analyzed. The documentation uses local commit " + BASELINE + ". These identifiers are recorded separately rather than assumed to refer to the same source revision.",
    ]),
    section("What the terms mean", table=[
        ["Term", "Meaning"],
        ["Static analysis", "Checking source code for rule violations without proving every possible runtime behavior."],
        ["Quality Gate", "A set of pass/fail rules configured in SonarQube, such as minimum coverage and no new issues."],
        ["Coverage", "How much executable code and its decision paths the tests exercised. It is not a percentage of guaranteed correctness."],
        ["New code", "Code that SonarQube considers new or changed in the configured comparison period. It is not always just the latest commit."],
        ["Duplication", "Code blocks the analyzer identifies as repeated."],
        ["Issue", "A finding raised by an analysis rule. It needs review to establish whether it represents a real problem."],
        ["False Positive", "A finding reviewed as an incorrect warning about valid code. The reason should be recorded."],
        ["Security hotspot", "Code marked for security review. It is not automatically a confirmed vulnerability."],
        ["LCOV", "A file format used to tell SonarQube which lines and branches were executed by tests."],
    ]),
    section("Recorded quality result", [
        "The retrieved result was Passed (API status OK). New-code coverage was 80.4%, overall coverage was 80.6%, new issues were 0, and new duplicated lines were 0.0%. Reported bugs, vulnerabilities and security hotspots were also 0.",
        "The figures describe that retrieved snapshot. They do not certify security or show that every runtime path works. The 80.4% new-code result is only slightly above the configured minimum of 80%.",
    ], table=[
        ["Check", "Required value", "Recorded value", "Outcome"],
        ["New-code coverage", "At least 80%", "80.4%", "Passed"],
        ["New duplicated lines", "At most 3%", "0.0%", "Passed"],
        ["New issues", "0", "0", "Passed"],
        ["New security hotspots reviewed", "100% when applicable", "No numeric value was returned. The condition status was OK.", "Passed"],
    ]),
    section("How analysis and test results are collected", [
        "sonar-project.properties tells SonarQube to analyze src, scripts and public, and to treat tests as test code. Generated Prisma code is excluded. Coverage is imported from coverage/lcov.info and coverage/integration/lcov.info.",
        "The two coverage files describe unit/component and database integration runs. Their percentages must not simply be added. SonarQube combines the covered code when processing the reports.",
        "Jenkins runs automated build and analysis work. In the approved configuration, the scanner does not wait for the final Quality Gate result. A successful Jenkins job and a Passed SonarQube gate are therefore separate facts that both need checking. Test or scanner errors still fail the job.",
    ], diagram="quality-workflow"),
    section("Changes across recorded checks", [
        "These rows show the gate and metrics retrieved during the review sessions. A current Overview status can differ from an Activity entry recorded earlier, for example after issue review. This table is a record of retrieved checks, not an independently verified history of every status change.",
    ], table=[
        ["Analysis time (UTC)", "New coverage", "New issues", "Retrieved gate", "What remained"],
        ["12 Oct 2026 11:43:09", "80.0%", "9", "ERROR", "Coverage met its threshold, but nine code findings failed the gate."],
        ["13 Oct 2026 03:16:22", "79.9%", "1", "ERROR", "Eight fixes were recognized. Coverage was below 80%, and the dialog-attribute finding remained."],
        ["13 Oct 2026 03:37:04", "80.4%", "0", "OK", "All reported gate conditions passed in the retrieved snapshot."],
    ]),
    section("Findings and their fixes", [
        "The rule IDs below identify SonarQube checks. Their descriptions explain why each change was made. Syntax examples are included so a developer can locate the exact change.",
    ], table=[
        ["Rule / count", "Meaning of the finding", "Change made"],
        ["S3776 / 1", "The submit function's cognitive complexity score was 19, above the allowed 15. This score estimates how difficult the control flow is to follow.", "Moved multipart reading and field checks into feedback-form-request.ts while keeping the same validation order, limits and errors."],
        ["S6582 / 2", "Longer null checks could use optional chaining, the ?. syntax that safely handles missing values.", "Used item?.id and report?.trackingHash while keeping the same report-identity and missing-target checks."],
        ["S7718 / 2", "The catch error variable did not follow the configured naming convention.", "Renamed problem to error_ without changing error handling."],
        ["S6772 / 3", "Spacing between label text and a form control was unclear in JSX markup.", "Wrapped the label text in a span without changing the control's accessible name."],
        ["S6747 / 1", "The analyzer did not recognize the dialog's closedby attribute.", "Kept the valid browser behavior and supplied a False Positive review rationale."],
    ]),
    section("Why the dialog attribute was kept", [
        "The HTML attribute closedby=\"any\" allows a dialog to close when the user clicks outside it, presses Escape or uses its close button. MDN documents the attribute, and HearDesk's browser tests check Escape and click-outside behavior.",
        "Removing this attribute just to clear the warning would remove an intended interaction. The recommendation was to review the finding as a False Positive rather than change the dialog behavior.",
        "The retrieved result showed no open issues. The available response did not include a complete issue-resolution history, so this document does not claim who changed the finding or which action produced the final status.",
        "Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog#closedby.",
    ]),
    section("How test coverage improved", [
        "Five additional tracking-page component tests check an incomplete code, a correctly formatted request, reply and status refresh, recovery from an error, and old responses arriving after a newer lookup. They verify useful behavior rather than just checking that source text exists.",
        "Tracking-component coverage rose from 33 of 46 lines and 15 of 22 branches to all 46 lines and 22 branches. A branch is a different route through a decision, such as the valid-code and invalid-code paths.",
        "The locally calculated combined LCOV estimate rose from 79.73% to 80.12%. SonarQube later reported 80.4% on new code and 80.6% overall. Those numbers use different scopes and calculations and should not be presented as interchangeable.",
        "The recorded follow-up passed 269 unit/component tests and 90 integration tests. No application behavior was changed to raise coverage during that follow-up.",
    ]),
    section("Reading the metrics correctly", table=[
        ["Metric", "Value", "What it tells the reader"],
        ["Overall coverage", "80.6%", "Coverage across the analyzed code, not only the code in the comparison period."],
        ["New-code coverage", "80.4%", "Coverage of code selected by SonarQube's new-code definition."],
        ["New duplicated lines", "0.0%", "No measured duplication in that new-code scope. It does not establish perfect architecture."],
        ["Open issues", "0", "The query for OPEN and CONFIRMED findings returned none."],
        ["Bugs / vulnerabilities", "0 / 0", "No such findings were reported by this analysis. Runtime testing and security review remain separate."],
        ["Security hotspots", "0", "No hotspots were reported in the retrieved snapshot."],
    ]),
    section("Repeating the checks and updating the report", [
        "Run npm run test:coverage:all and retain both coverage files. Check every test result, run the Sonar scanner with the project's configuration, then retrieve the gate, metrics and issues for the intended branch.",
        "Record the analysis time and exact commit when available. Explain any False Positive decision using source evidence and behavior tests. Do not weaken thresholds or remove source from analysis merely to obtain a better result.",
        "As the code grows, add tests for meaningful missing behavior. Keep a margin above the minimum coverage rather than depending on one rounded value.",
    ]),
    section("Evidence files and limits", [
        "The saved remote result is documentation/source/evidence/sonarqube.json. Configuration and test references are sonar-project.properties, package.json, vitest.config.ts, vitest.integration.config.ts, tests/components/feedback-tracking.test.tsx and tests/feedback-form-request.test.ts.",
        "This report excludes access tokens, infrastructure credentials and private user details. It describes static code checks and imported test coverage. The separate End-to-End UI Test Report explains browser behavior checks. Neither report is a claim that all security risks have been eliminated.",
    ]),
]

DOCUMENTS = [
    ("heardesk-functional-specification", "Functional Specification Document", "Features • User permissions • Expected behavior", FSD),
    ("heardesk-technical-design", "Technical Design Document", "Application structure • Data storage • Access control", TDD),
    ("heardesk-end-to-end-ui-test-report", "End-to-End UI Test Report", "Browser workflows • Recorded results • Screenshots", E2E),
    ("heardesk-sonarqube-code-quality-report", "SonarQube Code Quality Report", "Code checks • Test coverage • Findings and fixes", SONAR),
]
