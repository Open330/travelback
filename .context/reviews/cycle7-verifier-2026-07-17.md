# Cycle 7 Verifier Review — 2026-07-17

## Verdict

Review target: `2df1516` on `codex/review-plan-fix-2026-07-16`.

The current product flow is stable and the Cycle 6 repairs remain present. A fresh `npm run test -- --reporter=verbose` completed with 368/368 tests passing and no warning. Manual current-source browser checks covered landing, GPX upload, map readiness, playback controls, mobile More-controls focus containment, export-dialog inertness and focus restoration, Korean locale switching, guide tabs, and responsive bottom-band separation. Two accessibility defects and one desktop hit-ownership defect remain reproducible and are not covered by the current assertions.

## Review inventory

- Application orchestration and state: `src/app/page.tsx`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/session.ts`.
- Import and parsing: `src/components/FileUpload.tsx`, `src/lib/parser.ts`, `src/workers/trackParser.worker.ts`, parser/worker tests, all E2E import fixtures.
- Primary UI: `GlobalToolbar`, `TrackToolbar`, `TrackWorkspace`, `MapView`, `Controls`, `TimelineSelector`, `ElevationProfile`, `SceneEditor`, `JourneyCreator`, `ExportPanel`, `ModalDialog`, `GoogleGuide`, `KeyboardHelp`, `Toast`, and `ErrorBoundary`.
- Styling and localization: `src/app/globals.css`, `src/styles/vitro-base.css`, `src/lib/i18n.ts`, guide assets.
- Test and build surfaces: component/unit tests, `e2e/travelback.spec.ts`, Playwright configs, development/static runners, static smoke, worker parity, and CSP scripts.
- Browser evidence: current-source static output at 1440×1000 and 390×844. The mobile control stack did not overlap; modal focus remained trapped; Escape restored the opener; Korean live status announced `트랙이 로드되었습니다: Test Route Seoul`; browser console and page-error buffers were empty.

## Confirmed findings

### VR7-01 — Segmented unit controls clip the keyboard focus indicator

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/components/GlobalToolbar.tsx:27-49`, `src/components/TrackToolbar.tsx:231-253`, `src/styles/vitro-base.css:615-623`
- Evidence: both unit groups use `overflow-hidden`. The global `:focus-visible` treatment removes the outline and draws a two-layer external box shadow. Browser inspection of the desktop metric button found a 44×44 button inside a 90×46 clipping parent; the button matched `:focus-visible`, but the 2px/4px shadow perimeter was cut off at the group edges. The mobile menu repeats the same structure.
- User-visible failure: a keyboard user tabs to `Metric` or `Imperial`; the focus indicator is absent on the outer, top, and bottom edges, leaving only an interior sliver at the shared button boundary. The pressed fill does not replace a distinct focus indication, especially when the already-selected button receives focus.
- Required outcome: provide a complete high-contrast internal focus treatment for both segmented controls without removing the group's clipped corners, and add a browser regression that focuses each edge button and verifies the focus indicator is not clipped.

### VR7-02 — Timeline thumbs announce a percentage instead of the selected date/time

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/components/TimelineSelector.tsx:132-139,481-483,550-651,665-680`; `e2e/travelback.spec.ts:1499-1539`
- Evidence: the UI resolves `startDate` and `endDate` and displays localized date/time strings beneath the range, but both slider thumbs set `aria-valuetext` to only the rounded percentage plus `Start of range`/`End of range`. The accessibility tree consequently exposes values such as `Start of range: 0` and `End of range: 100`; the dates are separate static text with no programmatic thumb association. The keyboard E2E only checks that the generic endpoint phrase exists.
- User-visible failure: on a multi-day trip, a screen-reader user presses an arrow key and hears only a changing percentage. They cannot determine which day/time is selected even though sighted users receive that exact feedback. WAI-ARIA's slider pattern calls for user-friendly `aria-valuetext` when the numeric position does not communicate the rendered value.
- Required outcome: include the currently resolved, locale-formatted endpoint date/time in each thumb's value text when timestamps exist, retain a percentage fallback for timeless tracks, and assert both initial and keyboard-updated localized values.

### VR7-03 — The composed bottom stack covers the desktop Help button

- Severity: Medium
- Confidence: High
- Status: Confirmed
- Locations: `src/components/KeyboardHelp.tsx:18-31`, `src/components/TrackWorkspace.tsx:142-173`, `src/app/page.tsx:618-659`
- Evidence: on the isolated current-source static build at 1440×1000 after loading the sample route, Help occupied `(1345.75,812,78.25,44)` while the bottom stack occupied `(0,697.47,1440,302.53)`. The entire Help button intersected the stack. At Help's center `(1384.875,834)`, `document.elementsFromPoint` returned the Elevation-profile SVG above the Help button.
- User-visible failure: clicking the visible Help affordance seeks through the elevation surface rather than opening Keyboard Shortcuts. Keyboard activation can still work after tab focus, so keyboard-only assertions do not expose the pointer failure.
- Required outcome: give Help and the bottom stack one collision-free placement contract, then assert non-intersection, center-point ownership, real click activation, and unchanged elevation/playback progress at the desktop viewport.

## Regression and claim verification

- Cycle 6 manual-camera retry state, bottom controls, localized scene-boundary labels, warning-free FileUpload testing, and guide illustration wording remain represented by source and regression tests.
- Map waiting/error semantics, dialog inertness, live regions, 44px primary targets, reduced-motion rules, theme mode, locale selection, route import variants, export reset behavior, and static CSP/worker parity remain covered.
- No failing test, console exception, page exception, hydration error, or stale Korean status text was observed on current source.

## Final missed-issue sweep

I rechecked interactive elements for names, roles, values, focusability, visible focus, target size, keyboard paths, live feedback, localization, overflow ownership, and responsive geometry. I also searched historical reviews/plans to ensure VR7-01 and the date/time aspect of VR7-02 are not already completed or deferred items. VR7-03 was retained only after the exact current-source hit test proved the Elevation SVG owned the visible Help center. No additional verifier finding met the confirmed/reproducible threshold.
