# Content-shaped skeleton loading

Delivered2026-10-08. Reusable presentation-only skeleton.tsx supplies table/chart/summary/detail/settings/page placeholders. Table shows5rows, responsive mobile metadata shape. Chart placeholders reserve actual240/270pxchartheight; form placeholders reflect code/input/preview, detail includes message/disclosures/notes. No backend/schema/dependency changes.

Data loading: inbox table, website list, detail, settings, Company analytics and platformcharts. Routing: platform overview vs generictable, Company inbox analytics+table, detail-specific,website-list-specific fallbacks. Header/sidebar stay with existing layouts while content loads. Settings detail form skeleton supplied by client data state, website-list route fallback by settings/loading.tsx.

Highcharts readiness separated from APIloading: overlay persists during dynamicmodule import/chartcreation and disappears only after synchronouschartconstructor succeeds. Real chart container remains measurable but hidden untilready; API/render errors stop skeleton and show retry. State cleanup destroysoldcharts/observers; request guards ignore stale replies. Actions save/send/Excel retain meaningful busy text, not replaced by page skeletons.

Placeholders aria-hidden; outer named role=status with hidden description. No permanently-busy status region: live status sits outside busy real-chart subtree, dynamicaria-busy cleared on success/error. Animation pulse1.4susesexistinglinetoken; prefers-reduced-motion makesanimationnone. No interactivefakecontrols.

Verification65unit/architecture,typecheck/buildpass,13productionE2Epass. Newtest holds real APIresponses:tableskeletonvisible untilrelease,503replaceserrorwithoutdanglingplaceholder,stats/detail/settings/website/platformactivityloading,successremoval,chartAPIerror,computedanimationnoneunderreducedmotion.390pxnooverflow,skeleton-mobile.pnginspected. App restarted3000healthreadywidget200anon401immutableauditrights. No DBintegrationrerun needed for presentation-onlychange; prior53DBevidence not claimedfresh.

Existingpgdeprecation/Nextstreamclosedwarningsduringtestnavigationpersist. Screenreaderactualspeech and Firefox/Safari not tested; namedstatus semantics checked through browser locator/inspection. Skeletonsizesapproximate expectedcontent, not fabricated live data.
