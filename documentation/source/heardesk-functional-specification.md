# HearDesk: Functional Specification Document



Author: Muhammad Danu Susyanto



## 1. About this document



This document explains the HearDesk features and code reviewed for this portfolio. The results describe the recorded version and test environment. They do not represent a customer contract, independent certification or measured business results.

Version 1.0, written in English by Muhammad Danu Susyanto. This Functional Specification Document describes what users can do and the checks used to confirm each feature works.

Intended readers include recruiters, website owners, testers and developers. The reviewed source-code version, identified by its Git commit, is afb4f54a83eafcd0f10232adbbeeae92292c293a.



Item | Description

Product | HearDesk website feedback workspace

Document purpose | Explain features, user permissions, workflows and expected results

Publication | Portfolio edition based on implemented behavior

Maintenance | Update feature descriptions and related tests when behavior changes



## 2. Purpose and problem statement



Adding feedback to a website involves more than displaying a form. Developers also need to check submitted information, store reports and screenshots, and build tools for the team to review and answer reports. Building these features separately for every website adds development and maintenance work.

HearDesk provides a feedback system that website owners can connect to an existing site. They register the website, copy the script provided by HearDesk, and add it to the website. HearDesk supplies the form, stores the reports and provides the team's inbox.

Visitors can send feedback without creating an account. After submission, they save a private tracking link and code to check their report's status and read team replies. Internal notes and screenshots are available only to team members with permission.

The HearDesk service must be available. The installed script must use the correct website code, the website address must match its registration, and the website's security settings must allow the widget to load.

The project demonstrates full-stack development, access control and automated testing. No user count, revenue or measured time saving is claimed.



## 3. Terms used in this document





Term | Meaning in HearDesk

Company | A workspace for a team and its websites. Each Company has its own reports and members.

Site | A website registered within a Company.

Widget | The small feedback form opened from a button on the registered website.

Report / feedback | A visitor's submitted issue, suggestion or compliment.

Public reply | A team reply visible through the report's private tracking link or code. It is not an open internet discussion.

Internal note | A message visible only to Company team members who can access the report.

Platform Owner | An account that manages the HearDesk service, including Companies, accounts and usage limits. Company membership separately controls inbox access.

Acceptance criterion | An observable result used to check that a requirement works.



## 4. System context



The website owner adds a HearDesk script to the website. That script opens the feedback form inside an embedded page supplied by HearDesk. The visitor sends a report, and the website team reviews it in HearDesk.

Platform Owners manage the service. Their Company membership determines which Company inboxes they can read, including their own Company's inbox.



## 5. Included features and current limitations



The application supports team sign-in, Company membership, website setup, visitor reports, optional screenshots, report filters, status changes, internal notes, team replies, private tracking, charts, Excel reports and platform management.

Visitors can read replies but cannot reply through the tracking page. Lost tracking links and codes cannot be recovered by email. The page shows the current status, not a history of every status change.

Local email tests use a test mailbox. Real email delivery, billing, native mobile apps and public deployment are outside this documented release. The report does not establish uptime guarantees or a data-retention policy.



## 6. Users and responsibilities





User | What they can do

Visitor | Submit without login and read one report using its private link or code.

Company OWNER | Manage the Company and all supported Company actions.

Company ADMIN | Manage feedback, websites and non-owner team functions. Cannot change Company settings or transfer ownership.

Company AGENT | Read websites and reports, change report status, write internal notes and reply to visitors.

Company VIEWER | Read Company information, websites and reports. Cannot change reports or send replies.

Platform Owner | Manage HearDesk Companies, accounts and usage limits. Reading any Company's inbox requires membership and permission in that Company.



## 7. Company permission matrix



The table describes permissions within one Company. The server also checks that the account is active, the email is verified, the membership is current and the Company is active.



Action | OWNER | ADMIN | AGENT | VIEWER

Read reports and websites | Yes | Yes | Yes | Yes

Change report status | Yes | Yes | Yes | No

Write internal note or team reply | Yes | Yes | Yes | No

Manage websites | Yes | Yes | No | No

Manage non-owner team members | Yes | Yes | No | No

Read usage totals | Yes | Yes | No | No

Company settings and ownership transfer | Yes | No | No | No



## 8. Report access and privacy



Each Company has its own inbox for authorized team members. Platform Owners can read their own Company’s reports through their Company membership. Reading another Company’s reports requires membership and permission in that Company.

Visitors can view their submitted message, report status, and public team replies using a private tracking link or code. Anyone with that link or code can view the report, so visitors should keep it private.

The tracking page does not show email addresses, page details, screenshots, internal notes, or staff identities.



## 9. Functional requirements





ID | Feature | Acceptance criterion

FR-01 | Team sign-in | Users with a valid login and the required permissions can open the workspace. Visitors who are not signed in cannot open the team inbox.

FR-02 | Separate Company reports | A member cannot read or change reports, notes or screenshots in another Company unless they also have permission there.

FR-03 | Website settings | Allowed team members can set the registered website address, button label and position. The same address cannot be registered twice within one Company.

FR-04 | Widget installation | The supplied script opens the form when HearDesk is available, the website code and registered address match, and the website allows the script and embedded page to load.

FR-05 | Visitor submission | Visitors can submit an issue, suggestion or compliment without signing in.

FR-06 | Optional screenshot | One supported image is processed and stored privately. Unsupported or oversized files show an error.

FR-07 | Retry without duplicates | Repeating an unchanged submission with the same request identity returns the saved result without creating another report or consuming the report allowance again.

FR-08 | Private tracking access | A tracked submission returns a private code. An unchanged retry returns the same code. Reusing the request identity with a different code is rejected.

FR-09 | Inbox search and filters | Team members can search and filter their Company's reports. Page sizes are 10, 25, 50 or 100 reports.

FR-10 | Report status | Allowed team members can set NEW, REVIEWING, DONE or ARCHIVED. The screen shows the new status after the server saves it.

FR-11 | Internal notes | Saved notes appear to the team but never on the visitor tracking page.

FR-12 | Replies for visitors | OWNER, ADMIN and AGENT can reply to reports that have tracking access. VIEWER and unauthorized members of other Companies cannot reply.

FR-13 | Tracking without login | A valid private link or code shows the report message, current status and team replies. Private team data stays hidden.

FR-14 | Charts and Excel reports | The monthly chart and Excel reports agree with the Company's report totals for the selected period.

FR-15 | Platform management | Platform Owners use a separate console to manage the service. Supported management actions record who acted and what changed.

FR-16 | Usage limits | Website creation, team membership, report submission and storage follow the Company's configured limits and active status.

FR-17 | Loading and errors | Users can see loading, empty and error states. A delayed response for an earlier tracking code cannot replace the report they are currently viewing.



## 10. Use case UC-01: send feedback



Who: a website visitor. Before starting: the website is registered in an active Company and the HearDesk widget is available.

Steps: open the widget, choose a category, enter a message, optionally provide an email or screenshot, and submit. Save the private tracking link and code shown after success.

If the request fails because of invalid input, a usage limit or a rate limit, the form shows an error. If the connection fails after the report was saved, retrying the unchanged form reuses its request identity and tracking code. Changing the form creates a new submission identity.

Expected result: one accepted report, correct usage totals and a saved tracking code. The visitor is told to keep the code private because anyone holding it can read the report.



## 11. Use case UC-02: review and reply



Who: a Company team member with permission to update reports. Open the inbox, select a report, read its message and any available private details, then update the status or write an internal note.

To answer the visitor, use the separate public-reply form. Here, public means visible to someone holding that report's private link or code. Replies appear as 'Tim website', which means 'Website team'. The tracking page does not display the individual staff member's identity.

Retrying the same reply request does not create a second reply. Older reports without tracking access do not become visible to visitors automatically.



## 12. Use case UC-03: check a report



Who: a visitor with the saved private tracking link or code. Open the link or enter the code on the tracking page. Read the current status and team replies, then use 'Perbarui status' ('Refresh status') to check for changes.

An invalid or unknown code displays an error. Reports from a suspended Company are not shown. If the visitor enters another code, responses still arriving for the old code are ignored.

The visitor must keep the link or code. Providing an optional email address when submitting a report does not enable recovery of a lost code.



## 13. Input rules and limits





Input or rule | Observed behavior

Message, note or reply | Leading and trailing spaces are removed. The remaining text must contain 1 to 5,000 characters.

Category | Issue, suggestion or compliment. Stored values are ISSUE, SUGGESTION and COMPLIMENT.

Email | Optional. If supplied, it must be a valid email address of at most 254 characters.

Screenshot | Up to 5 MiB of image input. The complete upload request is limited to 6 MiB. MiB is the binary unit used by these checks.

Tracking code | A random 48-character code. The database stores a calculated hash rather than the original code. Technical details are in the TDD.

Website code | Identifies the website for widget setup. It does not log anyone into the team inbox.

Page address | An HTTP/HTTPS URL of at most 2,048 characters. Query text after '?' and the fragment after '#' are removed before storage.

Request limits | In a 60-second window, submission allows 5 requests per client key and 100 globally. Tracking allows 30 per client key and 300 globally. The client key is a server-generated rate-limit identifier, not a visitor account.

Tracking access | Requires a matching code and an active Company. Email, page details, screenshots, internal notes and staff identities stay hidden.

Monthly reporting | Month-based report counts and allowances use UTC boundaries, not the visitor's local timezone.



## 14. What the status values mean



NEW means received, REVIEWING means under review, DONE means completed, and ARCHIVED means archived. These values describe the current status.

The diagram shows a typical review order. The application does not force users to follow that order. Staff with permission can choose any supported value, including reopening a report. The visitor page does not show a timeline of previous status changes.



## 15. Screen checklist





Screen | Purpose | Expected behavior

Landing and demo | Explain the product | The example widget is labeled as a demo and does not save reports. Its dialog can be opened and closed with a keyboard.

Website settings | Set up a widget | The script and website code match saved settings. Replacing a code retires the old one.

Widget | Send feedback | The form, upload errors and private tracking link work inside the website and on small screens.

Inbox and report detail | Review and respond | Saved status is visible. Internal notes and replies for visitors have separate forms.

Tracking | Check progress | Link and manual-code access work. Loading, errors, no-reply messages and refresh are visible.

Platform console | Manage the service | Management access does not replace the Company membership required to read reports.



## 16. Requirements and supporting tests



Requirement IDs connect this document to the automated tests. These references help a maintainer find the checks for a feature. They do not mean every possible user action has been tested.



Requirements | Principal test files

FR-01, FR-04 to FR-08 | tests/e2e/application.spec.ts
tests/integration/visitor-request.test.ts

FR-02, FR-12 | tests/e2e/zz-company-isolation.spec.ts
tests/integration/feedback-tracking.test.ts

FR-03, FR-09 | tests/e2e/visual.spec.ts
tests/e2e/zz-filter-ui.spec.ts

FR-10 to FR-13 | tests/e2e/zz-tracking.spec.ts
tests/components/detail.test.tsx

FR-14 | tests/e2e/zz-feedback-reporting.spec.ts

FR-15 | tests/e2e/zz-platform.spec.ts

FR-17 | tests/e2e/zz-skeleton.spec.ts
tests/components/feedback-tracking.test.tsx



## 17. Limits of this specification and sources



The tests cover selected workflows in a stated environment. They do not establish support for every browser or compliance with every accessibility requirement. Real email delivery, data-retention rules and service commitments need separate decisions before customer use.

Primary sources: src/lib/validation.ts, src/modules/companies/domain/access.ts, src/modules/feedback/application/company-feedback.ts, src/server/feedback.ts, src/app/api/feedback/track/route.ts and prisma/schema.prisma. Companion documents describe the technical design, browser test results and SonarQube findings.

