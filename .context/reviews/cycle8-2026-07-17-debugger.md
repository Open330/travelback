# Cycle 8 Debugger — 2026-07-17

Reviewed revision `81342b7fab1cc2577909b63025bb2452dcb5446b` read-only before adding this report. No implementation fix was applied.

## Result

Two Medium deterministic root causes were reproduced. Both are current defects rather than speculative browser or data-provider behavior.

## Debugging provenance and inventory

- Enumerated 898 tracked paths and inspected the complete Cycle 7 delta, all 37 textual production files, all 16 Vitest suites, the E2E suite and 18 fixtures, all scripts/configurations/workflow/public text assets, worker source/generated parity, and current context/README/plans.
- Debug traces covered parser input-shape guards and budgets; sorting/dedup/segment flattening; worker request validation; map style generations; Journey Creator listener installation/removal and mouse/touch/window terminals; playback/export leases, aborts, timers, RAFs, finalization, object URLs, and map resize restoration; timeline/scene drag cancellation; modal/focus restoration; locale/theme/storage; and static hardening.
- Historical context/legacy plans were searched for already-known roots. Binary payloads were not decoded; lockfile and generated output were checked structurally. Existing B01-B04/D01-D04 were excluded from new counts.

## Findings

### DB8-01 — The dedup key collapses every untimed repeat of a coordinate

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Classification: Deterministic data-loss root cause
- File/region: `src/lib/googleJsonParser.ts:108-117,240-255`; missed case in `src/lib/parser.test.ts:536-548`
- Root cause: `pointKey` substitutes the empty string for absent time. `flattenGoogleSegments` retains that key in a segment-wide `Set`, not merely across adjacent observations. Thus every untimed occurrence of a coordinate after the first is defined as a duplicate regardless of intervening travel.
- Minimal reproduction: supported `timelineObjects[0].activitySegment.waypointPath.waypoints` containing E7 coordinates A(1,1), B(2,2), A(1,1) returned `[{lat:1,lng:1},{lat:2,lng:2}]`. The third observation and return edge were absent.
- Failure scenario: a user imports a route that starts at home, visits a destination, and returns home in one untimed waypoint path. Travelback renders only the outbound trip and exports a video that ends at the destination.
- Recommended fix: never infer duplicate identity for non-adjacent untimed observations. Preserve them; keep exact timestamped cross-branch dedup separately. Add direct, worker, and upload regressions with explicit expected point arrays and segment starts.

### DB8-02 — Drag terminal handling promotes a moved flag but never retires it

- Severity: Medium
- Confidence: High
- Status: Confirmed current defect
- Classification: Deterministic stale-state root cause
- File/region: `src/components/JourneyCreator.tsx:189-192,353-411,439-460,491-504`; missed case in `src/components/JourneyCreator.test.ts:149-248`
- Root cause: `updateDraggedPoint` raises `dragMovedRef`. `settleDrag` removes transient listeners, clears active input/index, restores cursor/pan, and creates a generic-click deadline, but leaves the boolean raised. `onPointClick` is the only normal path that lowers it, so absence of an immediate layer click makes the next unrelated layer click pay the suppression cost.
- Minimal reproduction: render the current component against its map mock, add one point, trigger layer `mousedown`, map `mousemove`, window `mouseup`, omit a post-drag layer click, then trigger a later layer click. The last points GeoJSON had one feature; deletion expected zero.
- Failure scenario: after repositioning a waypoint, a user later clicks a waypoint once to delete it. Nothing happens; only the second click deletes it.
- Recommended fix: replace the unbounded latch with an expiring post-drag suppression state shared by both click handlers. Test immediate and expired paths with controlled time and both mouse/touch terminal events.

## Diagnostics, rejected hypotheses, and validation

- The same-coordinate behavior across separate semantic segments remains correct because the segment-local `Set` is recreated; the existing E2E fixture proves that different path. This does not refute DB8-01.
- Exact repeated timed observations still have a legitimate cross-branch dedup case; the fix should not remove that narrower behavior.
- The Journey failure is not caused by listener leakage: transient listeners were removed and drag pan was re-enabled. It is specifically the retained boolean after successful settlement.
- FileUpload's nested file input can cause a synthetic bubbled handler re-entry in jsdom, but the current handler's only effect is another guarded picker activation and no user-visible failure was established; it was not promoted.
- Fresh results: lint passed; no-emit typecheck passed; 16 suites/393 tests passed; worker parity passed; audit reported 0 vulnerabilities. No server/build/E2E command was run under the process constraint.

## Final debugging sweep

I repeated searches for stale refs/closures, event-order assumptions, missing terminal resets, cleanup after throw/abort/unmount, lossy coercion, partial metadata, invalid numeric/date states, segment discontinuities, map style races, save/share fallback errors, and assertions that only compare two implementations sharing one root. No third root cause retained a concrete reproduction and actionable user impact.
