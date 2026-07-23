# Verifier Review — Cycle 2

Date: 2026-07-23
Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Deployment/browser execution: not performed

## Result

Two current-head discrepancies were verified. First, the Cycle 1 documentation
repair says an empty scene list remains an ordinary follow camera during
export, but the export controller silently substitutes the six-scene Cinematic
preset. Second, the short-phone layout asserted as repaired places the map
navigation row and mobile route-title glass in the same rectangle.

## Verification scope

The verifier cross-checked README, project/development documentation, package
commands, deployment workflow, source/configuration/scripts/public assets,
all unit/component/process tests, the complete Playwright specification and
fixtures, and the Cycle 1 aggregate/implementation record. Fresh non-browser
evidence was 520/520 Vitest tests, 7/7 process tests, and a passing generated
worker check. No Playwright, browser, server, build, deployment, push, or commit
was run.

## Findings

### VER2-01 — Empty-scene export silently uses Cinematic, contrary to the repaired architecture contract

Severity: **Medium**
Confidence: **High**
Status: **Confirmed cross-file behavior mismatch**

Regions:

- `.context/project/02-architecture.md:98-105`
- `src/lib/useExportController.ts:169-176`
- `src/lib/useExportController.ts:216-245`
- `src/lib/videoEncoder.ts:160-180`
- `src/lib/videoEncoder.ts:239-245`
- `src/lib/useExportController.test.ts:61-96`
- `src/lib/useExportController.test.ts:113-307`

The architecture now states that, with no scenes, “playback and export use the
ordinary follow camera” and that no scenes are generated automatically. The
playback camera helper does use ordinary follow for `[]`, but export takes a
different path: `useExportController` replaces `scenesRef.current` with
`generateDefaultScenes()` whenever it is empty, passes those six scenes in the
encoder config, and `exportVideo` computes every frame from that normalized
scene list.

The prior Cycle 1 verifier inferred immediate-export behavior from page
initialization, the playback camera helper, and the Scene Editor button, but it
did not trace this controller substitution. P14 then changed the documentation
to the opposite of the executable export behavior. The current controller
tests all mount with `scenes: []`, yet none inspects the config argument passed
to the mocked `exportVideo`, so all 520 tests pass while the repaired statement
is false.

Concrete failure scenario: a user imports a track and previews it without
opening Camera. Playback follows the route with one ordinary camera. The user
exports immediately and receives an Opening Overview → Bird's Eye → Flyover →
Orbit → Ground Follow → Closing Overview composition they never selected.
Documentation and preview both predict a different video.

Suggested fix: make the product decision explicit and align all three surfaces.
If empty scenes mean ordinary follow, pass `[]` through to `exportVideo`. If
automatic Cinematic export is intentional, document the playback/export
divergence and expose the selected export behavior before encoding so it is not
a surprise. In either case, add a controller test that asserts the exact
`ExportConfig.scenes` argument for empty and authored scene lists, plus an
export-camera integration assertion.

### VER2-02 — Short-phone navigation and the mobile route title occupy the same top row

Severity: **Medium**
Confidence: **High**
Status: **Confirmed from deterministic CSS geometry; browser measurement not run**

Regions:

- `src/app/globals.css:250-253`
- `src/app/globals.css:294-339`
- `src/styles/vitro-base.css:513-520`
- `src/components/TrackWorkspace.tsx:193-199`
- `e2e/travelback.spec.ts:1508-1608`

For both new portrait regression sizes, 320×480 and 320×568, the navigation
wrapper is positioned at 52 px. MapLibre's own top-left rule adds a 10 px
margin, so the horizontal 44 px button row begins at about y=62. The mobile
title begins at y=64, spans almost the full viewport (`left-4 right-4`), and
paints a bordered, blurred glass surface with vertical padding. Their boxes
therefore overlap through most of the title height.

The Cycle 1 acceptance statement was limited to visibility and pointer
ownership, and the new E2E test proves exactly those properties. The title has
`pointerEvents: 'none'`, so `elementFromPoint` still returns a navigation
button even when the title glass paints above it. The test never checks
navigation against the title, which is why the required matrix can pass this
visual collision.

Concrete failure scenario: after loading a route on a short phone, the route
name/count and the zoom/compass row obscure each other. Controls remain
technically clickable, but neither layer is visually clear.

Suggested fix: give the mobile title and navigation separate reserved rows at
heights below 36rem, then add bounding-box non-overlap between the navigation
group and whichever title variant is visible at every responsive matrix size.
Keep the existing hit-ownership assertions as a separate interaction check.

This is the same underlying defect recorded as `TE2-03` in the test-engineer
report and should be counted once when aggregating.

## Missed-issue and exclusion sweep

The final pass rechecked supported import formats/limits, generated-worker
parity, local-processing/offline wording, camera labels and defaults, export
limits/save/share states, responsive claims, static base paths/CSP, CI commands,
and repository version statements. The generated worker is current and shares
the Google parser implementation, so parser semantic drift was not re-filed.
The actual browser Worker-transport gap remains an older explicit deferral.

`README.md:48` still contains the legacy “Street View” phrase, but that is a
residual occurrence of Cycle 1 `AGG-29`/P15 rather than a genuinely new Cycle 2
finding, so it is noted but not counted. The three current documented
deferrals—root playback publication architecture, session-wide
`preserveDrawingBuffer`, and offline geographic context—were likewise excluded.
No other new stated-versus-executed discrepancy survived the final duplicate
and current-head sweep.
