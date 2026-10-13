# HearDesk

Personal project · Website feedback · 2026

## Overview

I built HearDesk to help website owners collect feedback and issue reports without building their own feedback system. They register their website in HearDesk and add a short script provided by the app. Visitors can then send feedback through a widget, a small form that opens on the website.

The team reviews reports in its HearDesk inbox. Visitors receive a private tracking link and code to check their report's status and read replies from the team without creating an account.

## Role and stack

Full-stack Developer · Testing & code quality (personal project).

Next.js 16 / React 19 / Prisma 7 / PostgreSQL / Playwright / SonarQube.

## The problem

Adding feedback to a website involves more than displaying a form. Developers also need to check submitted information, store reports and screenshots, and build tools for the team to review and answer reports.

Building and maintaining these features for every website adds work. Website owners need a way to connect a ready-made feedback system, give their team one place to manage reports, and let visitors check what happened after they submitted a report.

## The solution

Website owners register their website, copy the script from HearDesk, and add it to their website. HearDesk provides the form, stores reports, and gives the team an inbox for reviewing and responding to them.

In HearDesk, a Company is a workspace for a team and its websites. Each Company has its own reports and member permissions. A Platform Owner manages the HearDesk service, including Companies, accounts and usage limits. This service-management role is separate from membership in a Company.

The HearDesk service must be available, the script must use the code generated for that website, and the website address must match its registration. The website's security settings must allow the HearDesk script and embedded form to load.

## Engineering decisions

I built HearDesk as one application organized into separate modules for accounts, Companies, websites, feedback, usage limits and platform management. This keeps related code together and allows the application to be deployed as one unit.

I added checks to prevent duplicate reports and replies when a request is retried after a connection problem. An unchanged retry uses the same request ID. Reusing that ID with changed content produces an error instead of replacing the saved report or reply.

The database stores a hash of each tracking code, a value calculated from the code. The server compares these values to check a code without storing the original code itself.

## Report access and privacy

Each Company has its own inbox for authorized team members. Platform Owners can read their own Company’s reports through their Company membership. Reading another Company’s reports requires membership and permission in that Company.

Visitors can view their submitted message, report status, and public team replies using a private tracking link or code. Anyone with that link or code can view the report, so visitors should keep it private.

The tracking page does not show email addresses, page details, screenshots, internal notes, or staff identities.

## Testing and quality

On 13 October 2026, all 19 automated browser test scenarios passed using Playwright and Chrome against a production build in a separate test environment. They covered workflows such as submitting feedback, reviewing reports and checking replies through a private tracking link.

SonarQube checks source code for potential problems. The results retrieved for the master analysis at 03:37 UTC on 13 October 2026 showed a Passed Quality Gate, meaning the configured checks were met. Test coverage was 80.4% for new code and 80.6% overall, with zero new issues.

Coverage measures how much code the tests exercised, not the percentage of the application guaranteed to be correct.

## Current limitations

Visitors can read replies from the team but cannot reply through the tracking page yet. If they lose their tracking link and code, they cannot recover access by email. Real email delivery and public deployment still need to be configured.

## Documentation

Four English Word documents explain the features, technical design, browser test results and SonarQube results. Each document has its own download link. Version 1.0, prepared by Muhammad Danu Susyanto.
