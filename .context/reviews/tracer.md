# Tracer — Causal Flow Review (Cycle 4, 2026-07-16)

## Result

**New causal findings: 0.** Three unresolved historical defects reproduce from current control flow. The traces below confirm those carryovers without assigning new Cycle 4 finding IDs.

## Coverage

Traced producer → owner → mutation → consumer/cleanup across import parsing, session replacement, segmented distance/camera interpolation, Journey Creator gestures, timeline cancellation, playback, scene preview, export encoding/finalization, map reset, and static-output gates on `4917d39`. Lint and all 352 unit tests passed; typecheck evidence was unavailable because another active process concurrently regenerated Next's `.next/dev/types/routes.d.ts`.

## Carryover traces

### TRACE4-CARRY-01 — Reentrant export → controller overwrite → cross-session cleanup

Related finding: `CR4-CARRY-01`
Evidence: `src/lib/useExportController.ts:131-146`, `src/lib/useExportController.ts:279-318`

1. Activation A enters `exportTrack()` while `exportAbortRef.current` is null.
2. A stores controller A and schedules `setIsExporting(true)`, but React has not yet committed disabled UI.
3. Activation B enters in the same window because there is no ref guard; it stores controller B over controller A.
4. Both invocations resize and render through the same MapLibre canvas and publish to shared progress/playback state.
5. Cancel aborts only controller B. A remains live but is no longer externally addressable.
6. The first invocation to reach `finally` unconditionally clears the shared ref, resets the map, and updates shared state even if the other invocation still owns work.

Trace result: deterministic ownership violation under same-tick re-entry. Fix at the acquisition boundary and release by controller/session identity.

### TRACE4-CARRY-02 — Empty preferred Google representation → skipped fallbacks → lost activity

Related finding: `CR4-CARRY-02`
Evidence: `src/lib/googleJsonParser.ts:97-123`

1. The parser recognizes an `activitySegment`.
2. `simplifiedRawPath.points` exists and is an array, so the preferred branch is selected.
3. The array is empty, or every entry is invalid, so zero points are accepted.
4. Because selection was based on property existence, the `else` branch containing `waypointPath` and start/end fallbacks is never entered.
5. `currentSegment.length` remains zero and the activity is omitted.

Trace result: deterministic data loss for a valid fallback-bearing shape. Choose fallback based on decoder result, not merely property presence.

### TRACE4-CARRY-03 — Active waypoint drag → destructive toolbar action → stale gesture owner

Related finding: `CR4-CARRY-03`
Evidence: `src/components/JourneyCreator.tsx:360-399`, `src/components/JourneyCreator.tsx:519-531`

1. Drag start sets a waypoint index and `activeDragInput`, attaches transient map/window listeners, changes the cursor, and disables `dragPan`.
2. While the pointer remains held, keyboard activation invokes Undo or Clear from the Journey Creator panel.
3. Undo nulls only the index; Clear leaves both drag markers untouched. Neither calls `settleDrag()` because it is scoped inside the setup effect.
4. After Undo, listeners and disabled panning remain until a later terminal event. After Clear, the next move clones the empty array and writes the dragged waypoint at the stale index, recreating data after a destructive clear.
5. Only a subsequent mouse/touch terminal, blur, visibility change, or effect cleanup restores the full interaction state.

Trace result: deterministic state-machine split under overlapping pointer and keyboard inputs. All mutations that invalidate a drag must first call the single idempotent settlement path.

## Closed-path traces checked

Segment endpoints now resolve within their segment, camera bearing lookup honors segment boundaries, outside-map release reaches the centralized terminal path, timeline cancel/blur clears pending frames and refs, codec support re-evaluates selected dimensions/bitrate, failed export recovery resets copied state, and global hotkey listeners retain stable callback identities. No broken link was found in those Cycle 3 flows.
