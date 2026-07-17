# Cycle 11 debugger review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: debugger
Date: 2026-07-17

## Result

Three deterministic failure sequences reproduce from exact source: two fresh Medium/High defects and one Medium/High reopened `AG2-02` edge. No runtime claim depends on the incomplete primary dependency installation.

## Inventory and diagnostics

The debugging pass examined all 56 source/test paths, 20 E2E/fixtures, 19 public assets, seven scripts, root configs/manifests/docs, and workflow. It catalogued all 787 `.context/` and 39 `plan/` paths and searched historical failures/fixes to avoid replaying obsolete bugs. Binary/generated assets were inventoried; worker source ownership was inspected.

Fresh lint, unit, and worker commands failed to start because existing primary dependencies omit working ESLint, Vitest, and esbuild. No install/server/process mutation was authorized or performed. `git diff --check` found no reviewed-tree whitespace error. The prior accepted exact-code matrix is recorded only as historical context.

## Reproductions

### DBG11-01 — Delete after Done, then Create, produces a meaningless zero-point workspace

- Severity: Medium
- Confidence: High
- Status: Fresh, confirmed
- Locations: `src/components/JourneyCreator.tsx:336-369,705-721,925-962`; `src/app/page.tsx:196-210,332-347,409-412`; `src/components/MapView.tsx:836-856,1075-1139`; `src/components/TrackWorkspace.tsx:127-173`

1. Add waypoint A and B. `handleDone` observes length 2 and sets `showConfirm=true`.
2. The map listeners remain active. Click A and B; `onPointClick` replaces `waypointsRef.current` with arrays of length 1 then 0 and synchronizes UI. The Create button remains enabled.
3. Click Create. `handleConfirmCreate` performs no length check and passes the current empty array to `onComplete`.
4. `loadTrackIntoSession` stores the Track without validation.
5. Page-derived cumulative distances become `[]`. `MapView.hydrateCurrentStyle` returns at its empty-distance guard before `addTrackLayers`, while `TrackWorkspace` still renders the truthy Track and its playback controls.

Observed exact live outcome: the app settles into a stable loaded `0 / 0 locations` workspace with no route/trail layers and no ErrorBoundary transition, including after a two-second wait and style change. This disproves the earlier dereference prediction but confirms the underlying invariant failure: the UI has accepted a meaningless, non-renderable Track. With one deletion, an unsupported one-point session likewise bypasses the parser invariant and loads `1 / 1 locations` with zero-distance controls.

Fix/test: freeze or invalidate the confirmation draft, revalidate at commit, copy the points, and assert `onComplete` is not called after the route drops below two points.

### DBG11-02 — Camera button focus makes Escape a no-op

- Severity: Medium
- Confidence: High
- Status: Fresh, confirmed
- Locations: `src/components/TrackToolbar.tsx:129-140`; `src/lib/usePlaybackController.ts:200-249`; `src/app/page.tsx:243-259`

1. Click or keyboard-activate Camera. The button remains `document.activeElement`; SceneEditor opens.
2. Press Escape. The window listener receives the event with the button as target.
3. `target.closest('button, ...')` is truthy, so lines 207-209 return.
4. The Escape switch branch at lines 246-248 never runs; `closeOpenPanels` is not called.

The same failure occurs with focused SceneEditor inputs/selects/buttons/sliders. The KML E2E comment is a false assurance because it never checks that SceneEditor closed before clicking Export.

Fix/test: dispatch Escape before playback-command suppression with modal/menu/export precedence, and assert hidden state from multiple focused interactive targets.

### DBG11-03 — Unsupported drop loses against a delayed sample

- Severity: Medium
- Confidence: High
- Status: Reopened/incomplete `AG2-02`
- Locations: `src/app/page.tsx:145-156,414-447,604-609`; `src/components/FileUpload.tsx:64-66,126-140`

1. Intercept `/sample-trip.gpx`; click Try Sample and hold the response. Page generation is `g`, controller live.
2. Drop `route.fit`. `handleDrop` recognizes the unsupported extension, sets its local alert, and returns.
3. Because `handleFile` was never entered, `onImportStart -> invalidateSampleLoad` never runs. Generation remains `g`, controller remains live.
4. Release the sample response. `requestGeneration === sampleLoadGenerationRef.current` and the signal is not aborted.
5. `loadTrackIntoSession(parsedTrack)` replaces landing/error state with the older sample.

Picker invalid input differs because it enters `handleFile` and invalidates before parser rejection. Existing tests cover delayed sample versus Draw Route and callback order for accepted picker imports, leaving this branch unguarded.

Fix/test: invalidate on every newer file intent before extension preflight; add the held-response/drop regression.

## Falsified and deduplicated hypotheses

- The fixed active-seek, segmented-elevation, fallback-name, heading, mobile Cancel, export-completion, and Journey readiness bugs were replayed against current code and did not reopen.
- ModalDialog and mobile-menu Escape handlers work through their own listeners; they do not disprove DBG11-02 because SceneEditor is a nonmodal region without such a listener.
- Bidi display controls and dynamic file-too-large copy did not yield a reproducible injection or correctness failure at the core-review reporting threshold.
- `D01`-`D04`, `B01`-`B04`, `M10-01`, and `M9-01` remain prior ledgers rather than new debugger findings.

## Final missed-issue sweep

The final replay covered abort/timeout ordering, stale generation checks, drag/pointer/touch terminal events, visibility/RAF transitions, map style/track teardown, empty/singleton/segmented tracks, scene normalization, trim rejection, export failure/reset and URL cleanup, modal focus restoration, static-server error paths, XML/JSON budgets, and misleading test comments. No fourth reproducible failure chain remained after cleanup and history checks.
