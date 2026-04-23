## Cycle r6 — Tracer

### T-1 (INFO, HIGH) — follow-up on cycle r5 R5-AGG-1 (TrackToolbar menuRef)

`src/components/TrackToolbar.tsx:134-158`. The single-ref design traces cleanly:
1. outer wrapper receives `menuRef` (L134).
2. mousedown listener at L58-60 uses `menuRef.current?.contains(event.target as Node)`.
3. Trigger button at L135 is a descendant of the wrapper → inside → no close-then-reopen.
4. Inner menu panel (L147-159) is also a descendant of the wrapper → inside → no close when clicking a menu item other than via `runAndCloseMenu`.

Verified under `mousedown` + `touchstart`. No regression.

### T-2 (INFO, HIGH) — follow-up on cycle r5 R5-AGG-2 (FileUpload debounce)

`src/components/FileUpload.tsx:44-50, 116-122`. `scheduleDragEnd` clears the prior timer before re-scheduling. The unmount cleanup at L36-43 also clears. Full trace:

- DragOver fires → `isDragging=true` synchronously.
- DragLeave fires → `scheduleDragEnd()` (200ms pending).
- DragEnter fires on child element → `handleDragOver` → `isDragging=true`, but pending timer still runs and sets `isDragging=false` after 200ms unless…

Wait — that's a bug. `handleDragOver` (L111-114) does NOT cancel the pending `dragEndTimerRef`, so a leave-then-reenter-then-idle pattern will still flip to `isDragging=false` 200ms after the last dragleave, even though the pointer is now sitting inside the zone.

Let me verify: dragover fires continuously while the pointer moves inside, so after a real reenter the repeated dragover should override the stale false (via `setIsDragging(true)` at L113). Yes — subsequent `dragover` events keep `isDragging=true`. The stale timer will still call `setIsDragging(false)` once, but the next dragover tick immediately re-flips to true.

So: one-frame flicker possible if the user re-enters and then holds the pointer perfectly still (no dragover events) for 200ms. Very narrow. No schedule.

### T-3 (INFO, HIGH) — follow-up on cycle r5 R5-AGG-7 (e2e main landmark)

`e2e/travelback.spec.ts:233-238` — `main#app[data-travelback-app-root="true"]` assertion present. `src/app/page.tsx:314` sets the `<main>` element with both `id="app"` and `data-travelback-app-root="true"`. Trace closes cleanly.

### T-4 (LOW, MEDIUM) — `seekNonce` ref update on the non-follow path at MapView.tsx:929

`src/components/MapView.tsx:927-930`. On the no-follow branch, `lastSeekNonceRef.current = seekNonce` even when `seekNonce` didn't change. Not incorrect — the ref becomes a write-write on unchanged nonces — but it masks the intent. Minor. Already called out in critic CT-2.

No schedule.

### T-5 (INFO, HIGH) — `cleanupRef.current` lifecycle in JourneyCreator.tsx

`src/components/JourneyCreator.tsx:382-398`. Handlers registered with `map.on(...)` are all removed on cleanup. `mousemove`/`mouseup` are registered on-demand inside `onMouseDownPoint` (L352-353) and removed in `onMouseUp` (L331-332). Cleanup also calls `map.off` for them (L388-389). Double-off is safe in MapLibre. Trace clean.

---

No new scheduled findings from tracing.
