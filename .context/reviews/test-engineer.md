# Test Engineer Review — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7

## Result

Fresh testing found **three actionable test findings**: one intermittent readiness test, one missing responsive overlay regression, and one missing loaded-locale accessibility regression. Only the latter two accompany confirmed product defects. The map-retry flake did not reproduce in an isolated retries-disabled run, so it is not classified as a product failure.

## Inventory and execution

Reviewed all 15 Vitest files, every test in the 2,214-line Playwright spec, all 18 fixtures, Playwright dev/static configuration, test/build/smoke/server scripts, package commands, Pages CI, and source paths tied to map readiness, bottom overlays, localization, playback, scenes, import, and export.

Fresh evidence:

- npm run test:e2e: 91 passed, 1 skipped, 1 flaky in 12.3 minutes. The flaky test was e2e/travelback.spec.ts:444-489.
- Focused command with a non-HTML list reporter, retries=0, repeat-each=3: the same test passed 3/3 in 1.3 minutes.
- The skipped case is the opt-in real WebCodecs export at e2e/travelback.spec.ts:1938-1959.
- A separate live-browser export probe was active during the full run, adding uncontrolled CPU/GPU load. That explains why the first failure is not evidence of a repo product defect; it does not remove the test's confirmed dependence on fixed timing.
- Browser geometry and DOM inspection independently confirmed TEST5-02/03 against the actual app.

## New findings

### TEST5-01 — Map-retry journey regression is intermittently timing-dependent

Severity: **Medium** | Confidence: **High** for test flakiness; **Unconfirmed** as product defect

Region: e2e/travelback.spec.ts:444-489; readiness implementation in src/components/JourneyCreator.tsx:286-318.

The full suite failed its first attempt at line 461 because the blind center-canvas click did not produce “1 location” within 10 seconds, then passed on Playwright's retry. The test waits for networkidle plus a fixed 500 ms at lines 454-460 before clicking. JourneyCreator, meanwhile, may poll for the MapView handle every 100 ms and binds route listeners only after style readiness.

Concrete failure scenario: under a loaded CI runner, the click happens before the journey layers/listeners are bound. A retry hides the timing weakness and lengthens the suite; a future genuine retry regression is harder to distinguish from noise.

Required fix/test: expose or await a deterministic journey-map-ready condition after the layer/listener binding completes, then click. Keep retries disabled for a focused reliability gate and require at least 10 consecutive passes. If an early real-user click is intentionally accepted before readiness, queue it or visibly disable the instruction; do not merely increase the sleep.

### TEST5-02 — Responsive tests omit bottom attribution versus playback geometry and hit testing

Severity: **Medium** | Confidence: **High**

Region: e2e/travelback.spec.ts:710-837; source layout at src/app/globals.css:214-257, src/components/TrackWorkspace.tsx:142-174, and src/components/Controls.tsx:147-154.

Existing layout tests compare zoom controls with top toolbars and settings with titles. None locate .maplibregl-ctrl-bottom-right, playback-stats, or the full bottom control panel.

Confirmed missed failure: at 390×844 the attribution box (295.64,810,84.36,24) intersects the time text (307.89,809,55.11,16); hit testing returns the time span, not attribution. Desktop also places attribution under the playback surface.

Required test: after loading a track at mobile and desktop sizes, assert no intersection between attribution and every bottom overlay, then verify the attribution summary/link is the pointer hit target and can be activated by keyboard. Preserve visible attribution rather than hiding it.

### TEST5-03 — Locale tests do not verify already-populated live-region content

Severity: **Low** | Confidence: **High**

Region: e2e/travelback.spec.ts:299-329 and src/lib/i18n.test.ts; source at src/app/page.tsx:329-341, 638-642 and src/lib/i18n.ts:1873-1887.

Current tests switch landing labels and a loaded toolbar, and assert document.lang. They do not load a track in one language, change locale, and inspect role=status.

Confirmed missed failure: after EN→KO, document.lang and visible controls are Korean while the status remains “Track loaded: Namsan Tower Walk.”

Required test: load in English, switch to each supported locale or at minimum KO, assert document.lang and translated status text, and specify whether the change should trigger a new announcement.

## Existing boundaries, not new

- B01 remains blocked: .github/workflows/deploy-pages.yml:26-32 still does not run npm test, and CI edits need explicit authorization.
- Final real MP4 encoding remains opt-in rather than part of the ordinary 93-test run.
- Format imports are broad, but several Google variants remain import-focused rather than full-journey; this is historical coverage debt and is not recounted as a Cycle 5 ID.

## Final missed-issue sweep

Mapped all 93 E2E cases to the 15 unit suites, fixtures, parser/worker paths, layout states, accessibility surfaces, export states, and current carryovers. No additional new test defect met the threshold. No process was killed and no deployment was attempted.
