# Debugger — Root-Cause Report (2026-07-16)

## Scope

Focused on reproducible gate failures and bugs with an actionable failing scenario. No source fixes were applied.

## Findings

### DB-01 — Static smoke exits on an obsolete source-location assumption

Severity: High | Confidence: High | Status: Reproduced

Reproduction:

1. Run npm run build; the static export and CSP postbuild succeed.
2. Run npm run smoke:static.
3. Observe “Worker MAX_TRACK_POINTS must match MAX_TRACK_POINTS in src/lib/parser.ts”.

Root cause: scripts/smoke-static.mjs:223-236 reads parser.ts and regexes a declaration that moved to src/lib/parse-utils.ts:7. Worker and shared values both equal 250000. The next check at smoke-static lines 254-258 is also stale because parseSemanticPoint moved to googleJsonParser.ts:138.

Suggested fix: update the checker to actual ownership or replace textual synchronization with a generated worker plus fixture parity tests.

### DB-02 — Loaded desktop locale tests time out because the control is deliberately hidden

Severity: Medium | Confidence: High | Status: Reproduced twice per case

Reproduction: load a GPX at the static desktop viewport, then locate the Language combobox or global toolbar. Japanese and Spanish selection tests at e2e/travelback.spec.ts:274-300, plus loaded toolbar tests at lines 537-590, time out on retry.

Root cause: GlobalToolbar.tsx:25 applies hidden for hasTrack. TrackToolbar’s settings exist only inside the sm:hidden menu at lines 162-280, so no desktop replacement is visible.

Suggested fix: restore a visible desktop settings surface and use the existing four failures as the acceptance test.

### DB-03 — Trail freezes because the cache key excludes interpolated position

Severity: High | Confidence: High | Status: Confirmed

Reproduction: use any two-point route, start playback, and compare marker position with the trail endpoint before reaching point two.

Root cause: MapView.tsx:570 and 1072 cache solely by segmentIndex. The geometry function also depends on point, but point is absent from the invalidation key.

Suggested fix: cache completed segments, not the active geometry. In test/debug mode log or expose the trail source’s final coordinate at progress 0.25 and 0.75.

### DB-04 — Stationary export cameras can encode the preceding source frame

Severity: High | Confidence: High | Status: Confirmed ordering bug

Reproduction: configure an overview scene with unchanged camera/zero rotation, export a short route, and inspect consecutive marker/trail frames.

Root cause: MapView.tsx:563-578 schedules source updates, but lines 598-603 resolve immediately when camera values match. The render listener is registered only later. waitForIdle can also return immediately when tiles are loaded, so videoEncoder captures without a paint barrier.

Suggested fix: register before mutation and await a source-aware render. A deterministic test should mock render delivery and assert CanvasSource.add occurs after it.

### DB-05 — 4K Start Export is disabled by an invariant, not codec detection

Severity: Medium | Confidence: High | Status: Confirmed

Reproduction: open Export, choose either 4K preset, and observe the too-large warning/disabled Start Export for any duration, FPS, quality, or codec.

Root cause: videoEncoder.ts:59-65 assigns about 379.7 MiB to 4K raw-frame buffers before encoded bytes; the global cap is 256 MiB at line 7. ExportPanel.tsx:104-108 disables the action whenever that estimate exceeds the cap.

Suggested fix: reconcile product presets with the enforced resource model rather than tuning UI state.

### DB-06 — Journey line cleanup is skipped exactly when it is needed

Severity: Medium | Confidence: High | Status: Confirmed

Reproduction: create two waypoints, then delete one, press Undo until one remains, or Clear. Points/count update, but the old line stays drawn.

Root cause: JourneyCreator.tsx:204-207 guards line source updates with length >= 2 even though buildLineGeoJSON at lines 80-89 returns the required empty geometry for smaller arrays.

Suggested fix: remove the guard and assert the source receives an empty LineString.

### DB-07 — Encoder abort path omits the library cleanup operation

Severity: Medium | Confidence: High | Status: Confirmed

Reproduction: cancel after Output.start or force renderFrame to reject; repeat export/cancel and monitor WebCodecs/GPU resources.

Root cause: videoEncoder.ts:168-173 finalizes successful output and performs no action otherwise. Mediabunny Output.cancel explicitly releases internal encoders.

Suggested fix: cancel in the non-completed finally path and preserve the original thrown error if cleanup also fails.

## Diagnostic status

lint, typecheck, 219 unit tests, and production build pass. Dependency audit, static smoke, and observed static browser cases do not. The browser suite also reported a three-point timeline-trim assertion failure at e2e/travelback.spec.ts:720-735; isolate it after the deterministic toolbar and smoke failures are repaired.

## Summary

7 root causes: 3 High and 4 Medium. Six have deterministic reproductions; the remaining timeline E2E failure is preserved for targeted isolation.
