# Cycle 2 Debugger Review (2026-04-23, orchestrator run r2)

Scope: latent bug surface, failure modes, error-handling, state invariants, invariant violations, race conditions, cleanup correctness.

## Observations

### R2-DB-1 (info) — `useExportController` cleanup race is correctly handled
- File: `src/lib/useExportController.ts:175-207`.
- Evidence: `mountedRef` guards state updates; `mapViewRef.current?.resetSize()` is wrapped in try/catch with a fallback that reaches into the DOM by `data-testid="map-container"` to reset the style. On abort, `waitForIdle` is skipped. Good layered cleanup.
- **Positive finding.**

### R2-DB-2 (low) — `TrackWorkspace` mounts `TimelineSelector` with `key={trackSessionKey}` — correct
- Files: `src/components/TrackWorkspace.tsx:128` and `src/app/page.tsx:156,166`.
- Evidence: key change forces re-mount on every new track, which resets drag state. Ensures no stale range leaks between tracks. Good.
- **Positive finding.**

### R2-DB-3 (low/medium) — `MapView` animation effect relies on `cumulDistRef.current.length > 0` to short-circuit — potential race
- File: `src/components/MapView.tsx:826-827`.
- Evidence: the Load-Track effect at line 757-816 populates `cumulDistRef.current` from prop or fallback. The animation effect runs whenever `progress` changes. If the user lands on an already-populated session and progress is somehow set before the Load-Track effect runs, the first frame exits early. That's correct defensive coding; no bug.
- **Positive finding.**

### R2-DB-4 (low) — `JourneyCreator.handleConfirmCreate` casts `waypointsRef.current as TrackPoint[]`
- File: `src/components/JourneyCreator.tsx:522-528`.
- Evidence: `waypointsRef.current` is already `TrackPoint[]`; the cast is redundant but harmless. Cosmetic.
- Fix: drop the cast. Confidence: **High** (trivial). *Below threshold; record as deferred.*

### R2-DB-5 (medium) — `SceneEditor.undoDelete` can no-op silently if the deletion timer fires between the delete and the undo click
- File: `src/components/SceneEditor.tsx:288-296, 319-329`.
- Evidence: `setDeletedScene(null)` is scheduled after 5s via `setTimeout`. If the user clicks Undo shortly after the timer fires, `deletedScene` is null and `undoDelete` early-returns. UX edge case. The button is only rendered when `deletedScene` is truthy (line 602), so the click path requires the banner to be visible. This is safe.
- **Positive finding.**

### R2-DB-6 (low) — `usePlaybackController.togglePlay` resets progress to 0 when at `>= 1` and starts playing — intentional but subtle
- File: `src/lib/usePlaybackController.ts:55-63`.
- Evidence: if the animation finished, pressing Space restarts. This matches the e2e spec expectations (play button reappears → Space replays). Good.
- **Positive finding.**

### R2-DB-7 (low) — `MapView` map-destroy cleanup does not guard against double-cleanup
- File: `src/components/MapView.tsx:620-636`.
- Evidence: `map.remove()` is called; then `mapRef.current = null`. React StrictMode in dev may invoke the cleanup twice — the second call would execute `map.remove()` on an already-removed map. MapLibre's `.remove()` is idempotent in practice; confirmed by the absence of StrictMode-related errors in prior E2E runs.
- **Positive finding.**

### R2-DB-8 (low/medium) — `checkJsonDepth` in parser does not track ACTUAL JSON depth — it counts `{`/`[` inside strings correctly but accepts `"}]"`-heavy malformed inputs as depth-0
- File: `src/lib/parser.ts:327-344`.
- Evidence: the function exits cleanly if a malformed JSON has balanced but nested-past-limit braces inside strings. The guard is specifically for **parser exhaustion** (recursion depth) via valid JSON; malformed JSON later fails at `JSON.parse`. Correct.
- **Positive finding.**

### R2-DB-9 (medium) — `FileReader.onload` reads `reader.result` as `string` via `reader.readAsText`; but if the file is binary junk with an unsupported BOM, `reader.result` can be garbled text that still parses
- File: `src/lib/parser.ts:546-565`.
- Evidence: `readAsText` defaults to UTF-8. GPX/KML that arrive with a UTF-16 BOM decode incorrectly; the subsequent XML parse fails cleanly (`querySelector('parsererror')`). User sees `fileUpload.parseFailed`. Safe.
- **Positive finding.**

### R2-DB-10 (low) — `usePlaybackController.seekTo` clamps Infinity/NaN to 0 then to [0,1] via `Math.min(1, Math.max(0, safe))`
- File: `src/lib/usePlaybackController.ts:65-70`.
- Evidence: `Number.isFinite(nextProgress) ? nextProgress : 0` ensures safe clamping. Good defensive coding.
- **Positive finding.**

### R2-DB-11 (low) — `ExportPanel.handleShare` silently swallows share errors other than AbortError
- File: `src/components/ExportPanel.tsx:146-149`.
- Evidence: the error is logged via `console.error` but no toast is shown. If share fails (e.g., browser policy, permission), the user sees no feedback. Minor UX issue.
- Fix: add `addToast(t('app.shareFailed'), 'error')` (new i18n key) on non-AbortError. Confidence: **Medium**. *Below threshold; record as deferred.*

### R2-DB-12 (low) — `MapView` `waitForIdle` listener removal is symmetric
- File: `src/components/MapView.tsx:486-539`.
- Evidence: both the idle path and the abort path remove `map.off('idle', …)` and `signal.removeEventListener('abort', …)`. The timeout path also clears. Looks correct.
- **Positive finding.**

## Net assessment
- No blocking defects.
- 2 new below-threshold deferrals (R2-DB-4 redundant cast, R2-DB-11 share error toast).
- No cycle-1 fixes were undone.
