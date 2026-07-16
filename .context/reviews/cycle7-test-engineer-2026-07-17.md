# Cycle 7 Test Engineer Review — 2026-07-17

## Outcome

Review target: `2df1516`. The unit/component suite passed 368/368 with no warning. The E2E catalog remains broad across supported imports, map recovery, playback, trimming, scenes, localization, responsive layouts, dialogs, static hosting, and export states. Two narrow accessibility regressions and one fixed-affordance hit collision are currently invisible to the suite.

## Test inventory and evidence

- Read all `src/**/*.test.ts(x)` suites and the worker/parser fixture tables.
- Read all tests in `e2e/travelback.spec.ts`, including GPX, KML, Google Records, semantic timeline objects, timeline edits, semantic segments, duplicate branches, dateline travel, invalid files, map failures, mobile/desktop layout, locale, scenes, and export.
- Read both Playwright configs plus `scripts/run-dev-e2e.mjs`, `scripts/run-static-e2e.mjs`, `scripts/smoke-static.mjs`, worker-generation/parity scripts, and CSP generation/check scripts.
- Fresh unit result: 15 files, 368 passed, zero failed, zero React warnings.
- Current-source manual browser result: landing/upload/map/playback/More dialog/export dialog/Korean guide paths passed at 1440×1000 and 390×844, with empty console and page-error buffers.

## Confirmed findings

### TE7-01 — No regression proves segmented button focus remains visible inside clipped groups

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as VR7-01
- Locations: `src/components/GlobalToolbar.tsx:27-49`, `src/components/TrackToolbar.tsx:231-253`, `src/styles/vitro-base.css:615-623`, `e2e/travelback.spec.ts`
- Gap: tests assert many focus traps and focus restorations, but none tabs to the desktop or mobile unit buttons and checks the rendered indicator. Attribute/state assertions would not catch this defect because `:focus-visible` matches and `aria-pressed` is correct; the failure is the parent's paint clipping.
- Minimal regression: expose a stable unit-group test id or locate the named buttons, focus the first and last segment at desktop and mobile, inspect a purpose-built internal focus marker/computed inset treatment, and take geometry/paint evidence that all four sides remain inside the clipping parent. Retain pressed-state assertions.
- Acceptance: regression fails on current code, passes after the internal ring repair, and covers both edge positions in both render locations.

### TE7-02 — Timeline accessibility test accepts generic percentage text and misses endpoint dates

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as VR7-02
- Locations: `src/components/TimelineSelector.tsx:550-651`, `src/components/TimelineSelector.test.ts`, `e2e/travelback.spec.ts:1499-1539`
- Gap: the E2E expectation is only `/Start of range/` or `/End of range/`, so `0% Start of range` passes even when the thumb omits the meaningful timestamp. The component fixture contains no timestamps and has no accessible-value assertion.
- Minimal regression: render a deterministic dated track under a controlled locale/time zone; assert each thumb's initial `aria-valuetext` includes the expected localized date/time; issue a keyboard step; assert the updated endpoint text changes to the new resolved point. Add a timeless-track assertion preserving the percentage fallback.
- Acceptance: the test proves both meaning and update behavior, without relying on host-local date formatting.

### TE7-03 — Bottom-stack geometry tests omit the visible desktop Help affordance

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as VR7-03
- Locations: `src/components/KeyboardHelp.tsx:18-31`, `src/components/TrackWorkspace.tsx:142-173`, `e2e/travelback.spec.ts:1178-1209,1354-1404`
- Gap: the responsive bottom tests compare Timeline, Elevation, Reset, Controls, and attribution, but do not include the independently positioned desktop Help button. Current-source runtime geometry shows the entire 78.25×44 Help target underneath the bottom stack at 1440×1000, with Elevation owning its center hit.
- Minimal regression: load an elevation-bearing route at 1440×1000; require Help not to intersect the composed stack; require `elementFromPoint` at Help center to resolve to Help/a descendant; click the center; assert the Keyboard Shortcuts dialog opens and playback/elevation progress does not change.
- Acceptance: the regression fails on current code and prevents future fixed-corner affordances from drifting into the shared bottom clearance.

## Harness assessment

The dev/static wrappers reserve a candidate port and then release it before Playwright binds. This is theoretically racy, but this review did not reproduce a collision and does not promote it as a Cycle 7 finding. Existing ownership detection, unique-port selection, bounded Playwright lifecycle, and `PLAYWRIGHT_REUSE_EXISTING_SERVER` behavior remain preferable to interfering with a pre-existing server.

## Final missed-issue sweep

I mapped each user-facing branch to unit, integration, E2E, static, or real-export coverage and checked failure assertions for false positives, permissive regexes, async warning leakage, retries, hidden skips, and process ownership. Apart from TE7-01 through TE7-03, no new confirmed coverage defect was found. The opt-in real-WebCodecs case must still run with retries disabled in the implementation gate and assert a file larger than 1 KiB containing `ftyp`.
