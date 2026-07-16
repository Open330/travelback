# Code Reviewer — Deep Review (Cycle 4, 2026-07-16)

## Result

**New findings: 0.** Three deterministic defects remain on `4917d39`, but each has prior review or plan provenance and is therefore recorded as an unresolved **CARRYOVER**, not a Cycle 4 discovery. No fixed finding or evidence-blocked item is reopened.

## Inventory and coverage

Reviewed the complete current application surface: all 53 tracked `src/` files (including 15 unit-test files), 19 E2E files and fixtures, 19 public assets, 7 scripts, package/configuration files, the Pages workflow, README, and the active context documents. Cross-file review covered import and session replacement, Google semantic parsing, segmented interpolation and camera bearings, map ownership and gesture settlement, timeline cancellation, playback, scene editing, export encoding/finalization, static-output hardening, and test coverage.

Validation on this head:

- `npm run lint`: passed.
- `npm test`: passed, 15 files and 352 tests.
- `npm run typecheck`: could not produce independent evidence because another active review process was running `next dev` and concurrently regenerating `.next/dev/types/routes.d.ts`. The generated file was observed mid-write. This is a shared-artifact verification limitation, not a source finding.

## Unresolved carryovers confirmed on current HEAD

### CR4-CARRY-01 — Export startup has no synchronous single-owner guard

Severity: Medium | Confidence: High | Status: Confirmed carryover

Current evidence: `src/lib/useExportController.ts:131-146`, `src/lib/useExportController.ts:279-318`
Prior provenance: `.context/reviews/cycle2-code-reviewer-2026-04-25.md:60-70`

`exportTrack()` checks the map and track but not whether another export already owns the pipeline. React does not synchronously commit `setIsExporting(true)`, so two activations in the same event/render window can both pass. The second call overwrites `exportAbortRef.current`; both jobs then resize and render through the same map/canvas, and either `finally` can clear the other job's controller and reset shared map/playback state.

Failure scenario: double-click or same-tick programmatic activation starts exports A and B. Cancel reaches only B, while A continues. Whichever job finishes first clears the shared ref and performs cleanup while the other is still active.

Required fix: acquire export ownership synchronously at function entry, reject re-entry while an owner exists, and clear the ref only if it still belongs to that invocation. Add a focused controller test for same-tick double invocation and cancellation ownership.

### CR4-CARRY-02 — An empty preferred Google path prevents valid fallback parsing

Severity: Medium | Confidence: High | Status: Confirmed carryover

Current evidence: `src/lib/googleJsonParser.ts:97-123`
Prior provenance: `.context/reviews/cycle2-code-reviewer-2026-04-25.md:74-84`

`parseTimelineObjects()` selects `simplifiedRawPath.points` whenever that property is an array. It only considers `waypointPath.waypoints` or start/end locations in the `else` branches. An empty preferred array—or an array whose entries are all rejected—therefore suppresses valid lower-priority path data.

Failure scenario: an activity contains `simplifiedRawPath: { points: [] }` and populated `waypointPath.waypoints`. The activity contributes no movement segment, producing a shortened route or a too-few-points error.

Required fix: model the sources as a first-success fallback chain. Try the next representation whenever the preceding representation adds zero accepted points, then regenerate/check the worker and add empty/all-invalid preferred-path fixtures.

### CR4-CARRY-03 — Undo and Clear bypass the active waypoint-drag settlement transaction

Severity: Medium | Confidence: High | Status: Confirmed incomplete carryover

Current evidence: `src/components/JourneyCreator.tsx:360-399`, `src/components/JourneyCreator.tsx:519-531`
Prior provenance: `.context/plans/archive/interaction-state-correctness-2026-04-17.md:67-84`; the later outside-release work is `.context/plans/cycle3-implementation-2026-07-16.md:57-62`

Cycle 3 correctly centralized map/window terminal events in local `settleDrag()`, but toolbar actions cannot call that function because it is scoped inside the setup effect. `handleUndo()` clears only `draggingIndexRef`; `handleClear()` does not clear any drag state. Neither removes transient listeners, clears `activeDragInput`, restores the cursor, nor re-enables map panning.

Failure scenarios:

- During a drag, keyboard-activating Undo leaves `activeDragInput` and listeners live and leaves `dragPan` disabled until some later terminal event.
- During a drag, keyboard-activating Clear empties the route, but a subsequent pointer move writes to the stale drag index and can recreate a waypoint in the supposedly cleared array.

Required fix: expose one idempotent drag-settlement owner to both effect listeners and component actions. Settle before Undo, Clear, Cancel, completion, style teardown, and unmount. Add focused tests for Undo/Clear while a mouse or touch drag is active.

## Cycle 3 regression check

The reviewed implementations for Google runtime-shape handling, segmented endpoint interpolation and bearings, outside-map waypoint release, timeline cancel/blur cleanup, export codec/recovery state, and stable hotkey callbacks remain internally consistent and covered by the passing unit suite. No regression in those fixes was found.
