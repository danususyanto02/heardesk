# Company feedback chart and Excel reports

Delivered 2026-10-08. Open Laporan to view annual Highcharts line chart with three series: Masalah, Saran, Pujian. Year defaults to current UTC year; available years come from scoped feedback plus current year. Twelve months are always shown, zero-filled. Website filter applies to statistics; table search/type/status/date/page filters are separate and do not alter annual chart. All statuses including archived are counted by received createdAt, UTC.

Export Excel opens a period/site form:

- Bulanan: year/month, daily rows (leap years supported), monthly total.
- Tahunan: year, January-December rows, annual total.
- Semua periode: every month from first feedback through current month, overall total.

Every row has Masalah/Saran/Pujian/Total numeric cells. Workbook includes Company, website, period, generated UTC timestamp, timezone; no message bodies, sender emails, screenshot keys or notes. Empty period returns422 EXPORT_EMPTY and user-facing message before download. No clipping by inbox pagination. Filename is generated from validated period/year/month, not Company user text. Workbook strings are literal cells, never formulas. ExcelJS4.4.0 is server-only; uuid11.1.1 override removes transitive advisory, npm audit0 vulnerabilities. Deprecated transitive install warnings remain.

Statistics domain/port and application validate reporting period; Prisma adapter performs Company-authorized SQL GROUP BY labels/type and scopes site ownership. Excel adapter serializes same DTO. Endpoints `/api/companies/[companyId]/feedback/statistics` and `/export` require fresh account/session, active Company membership and feedback:read (including Viewer). Export limiter10 per minute per account. No migrations for reporting.

Company Switch moved to header right beside logout. Website actions split into Installation code/Settings, icon+text full-cell links pointing to correct anchor with Company/site IDs. Website names, platform Company/user cells, account action and inbox report title have expanded hit areas, native anchors/keyboard focus and hover. Date/count cells stay informational. Native cell link overlay is bounded by positioned cell, not full table column or row.

Company URL/header scope unified: page proxy derives x-heardesk-company from validated-length URL selection, overwrites incoming page header; server authorizes membership, cookies remain landing preference. Navigation links carry Company, API helper uses explicit URL before rendered Company. Website Settings keyed by Company/site and clears prior draft/config on scope change, preventing stale save/rotation. Website-list errors terminate loading and provide retry.

Verification:63unit/architecture tests,52PostgreSQL integration,11productionE2E pass;typecheck/buildpass,livehealth/widget200/anon401. XLSX bytes read back in unit/browser tests, monthly/annual/all totals equal API, annual12/leap29/allmonth tests,foreignCompany/site/suspended denied. Browser checks full-cell edge click, header-right placement, expired/empty export, two-tab Company navigation and390px chart SVG <=350px. ResizeObserver reflows Highcharts; screenshot `test-results/inbox-chart-mobile.png` inspected with whole calendar and legend visible.

Known limits: website dropdown loads first100 websites (table is independently paginated); all-period report constructs bounded calendar rows (year validation1900..9998 for chosen periods), no pagination of calendar labels. Existing pg deprecation, Vite config warning and occasional Next stream-close logs persist; tests pass, logs not declared clean. Screen reader/Firefox/Safari not tested. Highcharts evaluation licensing condition remains before commercial use.
