# Cycle 8 Tracer — 2026-07-17

Reviewed revision `81342b7fab1cc2577909b63025bb2452dcb5446b` without modifying executable files.

## Result

Two current user-visible traces terminate in wrong behavior: an untimed route loses its return leg during import, and a settled drag can consume a much later delete click. Neither trace crosses a security boundary.

## Trace provenance and inventory

- Catalogued all 898 tracked paths. Traced every current authored production module/style, all 16 unit/component suites, worker and generated parity, full E2E suite and 18 fixtures, all seven scripts, build/test configuration, Pages workflow, public textual/runtime assets, README, and active context/plans.
- End-to-end paths followed: file choose/drop → format policy → FileReader → worker/direct adapter → canonical track → trim/distance/interpolation/map/camera/playback/export; Journey Creator readiness → style binding → add/drag/delete → completion; scene edit/normalization/live message → preview/export; map failure/retry/style generation; export support/frame/finalize/save/share/cancel; focus/localization/theme/storage; source → static hardening → serving → deployment.
- Historical documents were used for provenance and duplicate suppression. Binary font/favicon contents and dependency lockfile internals were excluded from semantic tracing, while their references/parity were checked. Existing ledger items were not re-counted.

## Findings

### TRACE8-01 — A supported untimed return leg disappears before the track reaches the UI

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Classification: Data-ingestion-to-export trace
- File/region: `src/lib/googleJsonParser.ts:88-141,228-285`; `src/lib/parser.ts:457-519`; downstream consumers `src/app/page.tsx:169-239`, `src/lib/interpolate.ts:83-218`, `src/components/MapView.tsx:1072-1195`; coverage `src/lib/parser.test.ts:536-548`, `e2e/travelback.spec.ts:2697-2705`
- Failure scenario: import a Google timeline object whose fallback waypoint path is home → destination → home without timestamps. Travelback reports two locations, animates only home → destination, and exports that shortened route.
- Causal trace:
  1. FileUpload accepts JSON and `parseTrackFile` sends its text through the worker/shared Google adapter.
  2. `parseTimelineObjects` accepts `waypointPath.waypoints` and emits all three untimed points in producer order.
  3. `flattenGoogleSegments` computes the same `lat,lng,''` key for the first and third home points and its segment-wide `Set` discards the third.
  4. The resulting two-point `Track` passes worker validation and becomes `fullTrack`/`track`; no error or warning records the loss.
  5. Distance, timeline, map geometry, camera, playback, and export consume that canonical two-point track, so the return leg is absent everywhere.
- Recommended fix: preserve untimed observation sequence and restrict identity-based dedup to observations with valid identifying metadata. Assert the same expected A → B → A through direct parser, worker request, and browser upload.

### TRACE8-02 — A completed drag reclassifies the next future layer click

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Classification: Pointer-input-to-silent-no-op trace
- File/region: `src/components/JourneyCreator.tsx:328-411,439-504`; coverage `src/components/JourneyCreator.test.ts:149-248`
- Failure scenario: reposition a waypoint, release without MapLibre dispatching a waypoint-layer click, and later click a waypoint once to delete it. The first click silently does nothing; the second deletes.
- Causal trace:
  1. Layer `mousedown`/`touchstart` calls `startDrag`, which resets the movement flag and installs terminal listeners.
  2. Movement updates the waypoint and raises `dragMovedRef`.
  3. Window/map terminal handling runs `settleDrag`; it restores map interaction and sets an expiring generic-click deadline but leaves `dragMovedRef` true.
  4. If no immediate layer click is delivered, no normal path clears that boolean.
  5. A later `onPointClick` sees the historical flag, clears it, and returns before splicing the waypoint. The UI emits no state or feedback.
- Recommended fix: represent the post-drag click window once, with an expiry consulted by both handlers, and retire all drag-history state on terminal settlement. Test no-immediate-click and delayed-delete traces explicitly.

## Closed and rejected traces

- Repeated untimed visits across distinct semantic segments are preserved and covered; TRACE8-01 is the separate same-segment path.
- Partially timestamped ordering, missing elevation, Help hit ownership, scene placeholder substitution, and timeline date announcements are closed at current HEAD.
- The Journey trace does not depend on a leaked listener or failed drag settlement; the controlled run showed normal settlement and only stale suppression remained.
- No executable injection trace was found in parser names, scene names, error details, or guide content; React/text and DOMParser boundaries remain escaped/guarded.

## Evidence and final sweep

Lint, no-emit typecheck, 393 tests, worker parity, and audit passed. The two traces were separately reproduced with current source. No server/build/browser process was started under the assignment rule.

The missed-path pass varied empty/invalid/mixed timestamps, same coordinates within/across segments, mouse/touch/cancel/blur/visibility terminals, handler order, absent synthetic clicks, stale async completions, repeated map retry/style swaps, trim/scene conflicts, export abort/finalize timeout, save/share cancellation, locale/theme changes, and base-path/static failures. No third unique reachable trace survived reproduction and duplicate suppression.
