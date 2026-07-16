# Cycle 8 Code Reviewer — 2026-07-17

## Result

COMMENT. No new Critical or High defect was found. Two Medium correctness defects are current and reproducible: Google JSON normalization removes a legitimate return to an earlier coordinate when the observations have no timestamps, and Journey Creator can retain drag-suppression state long enough to ignore an unrelated later waypoint-delete click.

## Provenance and complete review inventory

- Review target: `81342b7fab1cc2577909b63025bb2452dcb5446b` on `codex/review-plan-fix-2026-07-16`. The worktree was clean before this report was added. The complete Cycle 7 source/test delta from `2df1516` through `81342b7` was inspected commit-by-commit and against the resulting tree.
- All 898 tracked paths were catalogued: `.context` 748, legacy `plan/` 39, `src` 54, `e2e` 19, `public` 19, `scripts` 7, workflow 1, and 11 root/configuration files.
- Production source inspected in full: `src/app/{layout,page,globals.css}`; all 17 components (`Controls`, `ElevationProfile`, `ErrorBoundary`, `ExportPanel`, `FileUpload`, `GlobalToolbar`, `GoogleGuide`, `JourneyCreator`, `KeyboardHelp`, `MapView`, `ModalDialog`, `SceneEditor`, `ThemeToggle`, `TimelineSelector`, `Toast`, `TrackToolbar`, `TrackWorkspace`); all 14 library modules (`camera`, `env`, `googleJsonParser`, `i18n`, `id`, `interpolate`, `map-geometry`, `map-render`, `parse-utils`, `parser`, `test-stub`, `useExportController`, `usePlaybackController`, `videoEncoder`); `src/types.ts`, `src/styles/vitro-base.css`, and `src/workers/trackParser.worker.ts`.
- Test inventory inspected: all 16 Vitest suites (`ElevationProfile`, `ExportPanel`, `FileUpload`, `JourneyCreator`, `SceneEditor`, `TimelineSelector`, `camera`, `env`, `i18n`, `interpolate`, `map-geometry`, `map-render`, `parser`, `useExportController`, `videoEncoder`, and worker); the complete 2,783-line `e2e/travelback.spec.ts`; and all 18 GPX/KML/JSON fixtures.
- Delivery and documentation inspected: `.github/workflows/deploy-pages.yml`, `.gitignore`, `README.md`, `package.json`, lockfile structure, Next/TypeScript/ESLint/Vitest/Playwright/PostCSS configuration, all seven scripts, all five map styles, guide/landing/icon SVGs, font CSS, sample GPX, and generated worker parity. Current context comprised `.context/README.md`, both project documents, the development conventions, plans index, Cycle 7 implementation plan, aggregate, pending-cycle instruction, and all Cycle 7 role reports.
- Superseded historical context and legacy plans were catalogued and searched for provenance/duplicate suppression, not treated as current requirements. The WOFF2 and favicon binary payloads were not decoded; their declarations and build paths were checked. `package-lock.json` was checked structurally rather than line-reviewed as authored logic.

## Findings

### CR8-01 — Per-segment deduplication deletes legitimate untimed loop/revisit points

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Location: `src/lib/googleJsonParser.ts:108-117,240-255`; coverage gaps at `src/lib/parser.test.ts:536-548`, `src/workers/trackParser.worker.test.ts:163-218`, and `e2e/travelback.spec.ts:2697-2705`

Evidence: `waypointPath.waypoints` is a supported fallback that produces points without timestamps. `flattenGoogleSegments` then creates one `Set` for the whole segment and keys each point by rounded latitude, longitude, and an empty timestamp. A coordinate seen anywhere earlier in that segment is discarded, even when the repeat is non-adjacent and means that the traveler returned to that place.

Concrete failure scenario: a supported `waypointPath` containing A(1,1) → B(2,2) → A(1,1) should preserve three observations and the return leg. A direct current-source probe returned only A → B. Playback, distance, camera, map geometry, and export therefore end at B and never render the recorded trip back to A. The existing E2E revisit fixture repeats A across separate semantic segments, which bypasses the per-segment `Set`; the direct dedup test covers only identical timed observations.

Suggested fix: preserve untimed observations unless duplicate identity is actually knowable. Keep the existing exact timed-observation deduplication across export branches, and either retain all untimed points or apply only an explicitly documented adjacent-noise rule. Add direct parser and generated-worker regressions for same-segment untimed A → B → A, plus an upload-level fixture that proves all three locations survive.

### CR8-02 — A completed drag can suppress an unrelated later waypoint deletion

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect under a reachable event sequence
- Location: `src/components/JourneyCreator.tsx:189-192,328-369,372-411,439-460`; coverage gap at `src/components/JourneyCreator.test.ts:149-248`

Evidence: moving a waypoint sets `dragMovedRef.current = true`. `settleDrag` ends the drag and sets a 250 ms generic-map-click deadline, but never clears `dragMovedRef`. Only `onPointClick` consumes that boolean. If no layer click follows the drag, the flag remains true indefinitely; the next point click, however much later, is treated as the drag's synthetic click and returned without deleting.

Concrete failure scenario: add one waypoint, drag it, release through the registered window `mouseup`, receive no immediate `click` on the waypoint layer, and later click the waypoint to delete it. A controlled current-component reproduction followed exactly that sequence and the source still contained one feature (`featureCountAfterLaterDeleteClick: 1`, expected 0). A second click works because the first unrelated click clears the stale flag. Existing tests stop after proving listener cleanup and drag-pan restoration; none performs a later deletion.

Suggested fix: make post-drag suppression time-bounded and owned by the settled drag. Clear the movement boolean when settling, and have both generic-map and waypoint-layer click paths consult a deadline that expires without requiring a click to consume it. Add fake-time component tests for (a) an immediate post-drag click being ignored and (b) no immediate click followed by a later intentional click deleting on the first attempt.

## Cross-file interaction and duplicate review

- CR8-01 originates at Google adapter canonicalization. Every downstream consumer correctly trusts `Track.points`, so repairing map/interpolation/export code would only mask corrupt input. Worker parity currently reproduces the same defect by design.
- CR8-02 is confined to Journey Creator gesture ownership. The newer `suppressMapClickUntilRef` protects the generic add-point path, while the older unbounded boolean independently protects the layer delete path; their divergent lifetimes create the defect.
- Cycle 7 repairs for partial timestamp ordering, elevation gaps, desktop Help placement, focus rings, timeline date announcements, opaque scene placeholders, localized guide art, and shared import limits are present with their regressions.
- Existing ledger items B01-B04 and D01-D04 were considered and not refiled as new Cycle 8 findings.

## Validation

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- `npm test -- --run` — passed: 16 suites, 393 tests.
- `npm run check:worker` — passed; generated worker is current.
- `npm audit --audit-level=high` — passed with 0 vulnerabilities.
- Direct parser probe — confirmed CR8-01: three supported untimed waypoints produced two points.
- Controlled current-component event probe — confirmed CR8-02: a later first delete click after drag left one feature instead of zero.
- Build/E2E/server commands were not started because this review assignment expressly prohibited starting or stopping processes. The Cycle 7 plan's prior full browser results were used only as provenance, not claimed as fresh Cycle 8 evidence.

## Final missed-issue sweep

The final pass challenged parser representation priority, dedup identity, partial chronology, point budgets, worker transport, segment boundaries, map/style generation ownership, playback/export cancellation, stale closures, event/listener/timer cleanup, modal focus, responsive hit ownership, localization interpolation, import policy, static hardening, CSP/base paths, workflow gates, and test-fixture reachability. Comments were checked against behavior rather than accepted as proof. No third non-duplicate issue reached the actionable-confidence threshold.
