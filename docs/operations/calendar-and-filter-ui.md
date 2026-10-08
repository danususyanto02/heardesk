# Calendar filters, usage indicators, and inbox popover

Delivered2026-10-08 after owner approved 80% warning threshold and floating list-group filters.

## Platform activity

Reports received uses Monthly/Annual selection. Monthly selects Jan-Dec plus year and returns daily counts for the chosen UTC calendar month. Annual selects year and returns12monthly buckets. Defaults current UTCmonth/year. Available years derived from feedback data plus current year. Zero-fill retained, leap-month tested. Legacy days7/30/90 API supported for compatibility but not exposed in new UI.

Highcharts remains dynamically imported on chart surface; data is aggregated count-only, platform guard and persisted role/account check remain required. No customer message/body/file data enters chart response. Accessible UTCdata list available. Company status chart unchanged.

## Usage

Per metric: below80% green Normal; >=80% and <100% amber Near limit; >=100% red Limit reached; limit0 red Tidak tersedia with no percentage division. Count/limit and text accompany color. BigInt thresholds avoid precision loss for storage; percentage display truncated to2decimals, status decision uses exact integer comparison.

Occupied seats = member count + distinct normalized pending/unexpired invite emails not already members. Same rule as backend admission, batched Company-page SQL. User/member email is used for counting only; no invite emails exposed in platform usage DTO. Tables show member/reserved breakdown.

## UI

Rows per page at far right after previous/next navigation in Platform, Websites, and Inbox footers. Mobile controls wrap/right-align. Same10/25/50/100size validation and offset/limit backend.

Inbox chart header: shortened visible Tahun label,44px dropdown/export aligned at top with heading, short website/status/UTCcaption, longer scope note below chart. Inbox privat removed: it was informational noninteractive label, not an action; actual Company restrictions remain enforced.

Filter opens portaled fixed list-group panel with Website/Jenis/Status radios, selected tint, Reset filter/Terapkan actions. Draft picks do not change URL until apply. Preserve Company/search/pageSize, reset page on applying filters. Panel height bounded with internal scroll. Escape/explicit close restore trigger focus; click/focus outside closes without stealing destination focus; ShiftTab from initial panel restores trigger; panel closes if trigger scrolls outside viewport. No extra table row/reflow from opening panel.

Website options now collected from server pages of100 rather than silently truncating at first100. Stale Company response ignored; failure visible. Main tables remain backend paginated. Very large website sets may warrant async searchable options later; current implementation loads all authorized selection options through bounded requests.

## Evidence

65unit/architecture,53PostgreSQLintegration,12productionE2E pass,typecheck/buildpass. Tests80/100/0BigIntboundary, monthlyleap29/annual12/UTCwindows, distinct/nonmember/unexpired invitation count, popover application preserving URL/no table shift, Escape/outside/ShiftTab,390pxbounds, pageSizefar-right and existing Excel/Companyisolation regression. App restarted3000,health/widget/script200,anon401,auditrights preserved. No migration.

Screenshots test-results/inbox-filter-mobile.png and inbox-chart-mobile.png inspected. Existing Vite extensionless-config/pgdeprecation/Nextstreamclose logs persist; tests green, logs not declared clean. Screen reader/Firefox/Safari not tested. Highcharts evaluation license condition still applies before commercial launch.
