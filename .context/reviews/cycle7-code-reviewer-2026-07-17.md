# Cycle 7 Code Reviewer — 2026-07-17

## Result

COMMENT. The current tree has no new Critical or High code defect in this review surface. Three Medium, actionable correctness defects remain: partially timestamped Google exports can be reordered into a route that never existed, missing elevation samples are drawn as real minimum-altitude samples, and the loaded desktop Help control is fully covered by the elevation slider.

## Review baseline and complete inventory

- Reviewed HEAD 2df151642576b1b662e2fe7695c5723012e88747 and the complete Cycle 6 delta from 1d2755c through 2df1516, including the five implementation commits and their regression tests.
- Enumerated all 884 tracked paths: src 53, e2e 19, scripts 7, public 19, .context 735, plan 39, workflow 1, and 11 root/configuration files.
- Read all 38 production source modules/styles plus all 15 Vitest suites; e2e/travelback.spec.ts and all 18 fixtures; all seven scripts; every root/build/test configuration; the workflow; package metadata and lockfile structure; every textual public asset; and the generated worker against its TypeScript source.
- Read the required current context and documentation: .context/README.md, .context/project/01-overview.md, .context/project/02-architecture.md, .context/development/01-conventions.md, .context/plans/README.md, README.md, package.json, the Cycle 6 implementation plan, aggregate, all 13 Cycle 6 role reports, and the pending next-cycle instruction.
- The 735 .context files and 39 root plan files were fully catalogued. Superseded historical plans/reviews were searched for provenance and duplicate findings rather than treated as current requirements. Binary font/favicon payloads were not decoded; their declarations, paths, and build handling were inspected. package-lock.json was checked structurally rather than line-reviewed as authored source.

Production inventory covered:

- App shell: src/app/layout.tsx, page.tsx, globals.css.
- UI: Controls, ElevationProfile, ErrorBoundary, ExportPanel, FileUpload, GlobalToolbar, GoogleGuide, JourneyCreator, KeyboardHelp, MapView, ModalDialog, SceneEditor, ThemeToggle, TimelineSelector, Toast, TrackToolbar, and TrackWorkspace.
- Domain/runtime: camera, env, googleJsonParser, i18n, id, interpolate, map-geometry, map-render, parse-utils, parser, test-stub, useExportController, usePlaybackController, videoEncoder, types, and the track-parser worker.
- Tests: every colocated .test.ts/.test.tsx suite plus e2e/travelback.spec.ts and every e2e/fixtures asset.
- Delivery: .github/workflows/deploy-pages.yml; next, TypeScript, ESLint, Vitest, Playwright, PostCSS configs; all scripts; map styles, guide art, sample trip, font CSS, icons, and generated worker.

## Findings

### CODE7-01 — A single valid timestamp moves earlier untimed observations behind it

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Location: src/lib/googleJsonParser.ts:228-239, 246-270; coverage gap at src/lib/parser.test.ts:548-560 and 980-1013

Evidence: sortPointsWithinSegment sorts every timed point before every untimed point. The segment comparator applies the same rule to segments using their first timestamp. Stability therefore preserves order only within the timed and untimed partitions, not the producer's order across them.

Concrete failure scenario: a Google locations array in source order A (no timestamp), B (valid timestamp), C (no timestamp) parses as B, A, C. A direct current-source probe returned latitude order 20, 10, 30 for input 10, 20, 30. Playback then draws and animates a B→A→C detour that is an artifact of the parser, not the trip. Existing tests cover all-timed chronology and all-untimed tolerance, but not a mixed segment.

Suggested fix: preserve source order whenever a segment has incomplete time metadata. Chronologically sort only when every retained point in the comparison domain has a valid timestamp, or define an explicit stable partial-order policy that never relocates an untimed observation across timed neighbors. Apply the same rule to segment ordering. Add direct parser and worker-parity regressions for mixed valid, missing, empty, and invalid timestamps.

### CODE7-02 — Missing elevation is rendered as a measured minimum

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Location: src/components/ElevationProfile.tsx:20-22, 30-60; e2e/fixtures/invalid-elevation.gpx:6-16; insufficient assertion at e2e/travelback.spec.ts:899-907

Evidence: invalid or absent elevation becomes null, but path construction immediately converts null to the track's minimum valid elevation at line 51. The SVG consequently contains a real line vertex at the minimum rather than a gap or unknown sample.

Concrete failure scenario: the existing malformed-elevation fixture has elevations unknown, 12 m, 18 m. The profile draws the unknown first point at 12 m. In a partially sampled mountain route, every telemetry gap becomes an invented descent to the minimum and climb back, changing the story told by the chart. The E2E regression proves only that the SVG contains no NaN; it does not prove that unknown data remains unknown.

Suggested fix: choose and encode a missing-data policy. Prefer drawing separate contiguous valid runs; interpolation between bounded valid neighbors is acceptable if explicitly intended, but leading/trailing gaps should not be invented. Add a component-level path assertion for leading, interior, and trailing missing samples, while retaining the no-NaN E2E check.

### CODE7-03 — The loaded desktop Help button is painted beneath the elevation slider

- Severity: Medium
- Confidence: High
- Status: Confirmed by bounded current-source browser geometry; same root cause as CRIT7-04 and ARCH7-03
- Location: src/components/KeyboardHelp.tsx:19-30; src/app/page.tsx:618-684; src/components/TrackWorkspace.tsx:142-173; src/components/TrackToolbar.tsx:162-224; E2E gap near e2e/travelback.spec.ts:1167-1200

Evidence: KeyboardHelp places its desktop control at bottom-36 with z-10. TrackWorkspace is rendered later and places the composed timeline/elevation/playback stack at the same z-10. At 1440×1000 after loading the sample, a bounded current-source browser pass measured Help at x=1345.75, y=812, width=78.25, height=44 and the stack at x=0, y=697.47, width=1440, height=302.53. Their intersection is the entire Help rectangle. elementsFromPoint at the button center, 1384.875×834, returns the SVG labelled “Elevation profile” above the button.

Concrete failure scenario: a desktop mouse user sees or targets Help at the lower right, but the click seeks the elevation profile instead of opening keyboard shortcuts. The only other toolbar Help action is inside the sm:hidden mobile More dialog, so there is no desktop pointer fallback. The existing overlap regression protects map attribution, not KeyboardHelp.

Suggested fix: position Help from the same loaded-stack clearance contract used by other floating consumers, or move the desktop action into TrackToolbar. Add a 1440×1000 loaded-track E2E assertion that the Help and timeline/elevation/control boxes do not intersect, the Help center's hit owner is the Help button, and a real center click opens the keyboard-help dialog.

## Cycle 6 interaction review and deduplication

- The Cycle 6 timeline-stack change, camera-retry preservation, localized scene feedback, FileUpload act settlement, and corrected Takeout art are present and their targeted regressions pass.
- The initial source-only keyboard-help hypothesis was retained for bounded validation; exact current-source geometry then confirmed CODE7-03 and overturned the earlier visual-only impression that the bottom surfaces were separated.
- The historical MapLibre string-style error hypothesis remains rejected because aborted style fetches and local style URLs do not establish a current defect.
- B01-B04 and D01-D04 remain existing blocked/deferred ledger items and are not refiled here.

## Validation

- npm run lint — passed.
- npx tsc --noEmit --incremental false — passed.
- npm run check:worker — passed; generated worker is current.
- npm test — passed, 15 suites and 368 tests.
- Direct bundled parser probe — confirmed CODE7-01 with output order 20, 10, 30 from source order 10, 20, 30.
- Bounded current-source browser geometry — confirmed CODE7-03 with full-rectangle overlap and the elevation SVG owning the Help center hit.
- PID 80360 was a pre-existing unresponsive Next dev service and was not stopped; the bounded static-browser path supplied the required layout evidence without violating the destructive-action rule.

## Final missed-issue sweep

I repeated searches across parsing order, missing/null coercions, async generations and aborts, playback/export state ownership, map/style fallbacks, responsive fixed layers, localization consumers, worker parity, test-fixture reachability, delivery scripts, and Cycle 6 changed lines. I also compared every candidate with the aggregate and Cycle 6 provenance. No additional non-duplicate code issue reached the actionable-confidence threshold.
