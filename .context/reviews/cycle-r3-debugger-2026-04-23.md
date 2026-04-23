# Cycle r3 — debugger review (2026-04-23)

Scope: latent bugs, failure modes, edge cases.

## Findings

### R3-DB-1 (LOW, HIGH) — `FileUpload.handleDrop` `setTimeout` leaks on rapid successful drop
- **File**: `src/components/FileUpload.tsx:85, 90`.
- **Detail**: See R3-CR-1 (code-reviewer review). After a fast-parsing drop, `onTrackLoaded` unmounts the overlay before the 200 ms `setTimeout` fires; the timer still triggers `setIsDragging(false)` on an unmounted component. React may log a dev-mode warning; the memory cost is negligible but the pattern is ugly.
- **Fix**: track the timer id in a ref; clear on unmount. Or drop the JS timeout and use CSS transitions.
- **Confidence**: High.
- **Schedule**: yes — one-line ref + cleanup.

### R3-DB-2 (LOW, MEDIUM) — `videoEncoder.exportVideo` re-computes `cumulativeDistances` if caller omits the arg
- **File**: `src/lib/videoEncoder.ts:66`.
- **Detail**: The current call-site (`useExportController`) always passes the param, so this is theoretical. But if a future entry-point forgets it, an O(n) recompute slips into the frame-0 hot path. A defaultless API and/or a `console.warn` would make the contract explicit.
- **Fix**: require `cumulDistParam` in the type (remove `?`), or drop the fallback entirely.
- **Schedule**: defer — no current-caller bug.

### R3-DB-3 (LOW, MEDIUM) — `ElevationProfile` returns `null` when `!hasElevation` but runs the `useMemo` cost beforehand
- **File**: `src/components/ElevationProfile.tsx:30, 62`.
- **Detail**: The `{minEle, maxEle, pathD, areaD}` memo still allocates empty arrays / strings even when the component is about to return null. No correctness bug. Cosmetic.
- **Schedule**: defer — cosmetic.

### R3-DB-4 (INFO, HIGH) — `MapView.waitForIdle` signal abort path is correct
- **File**: `src/components/MapView.tsx:486-530`.
- **Detail**: The promise settles at most once (`settled` flag), both timeout and abort clear the timer, all listener cleanups execute. Good.
- **Schedule**: N/A.

### R3-DB-5 (LOW, MEDIUM) — `isCodecSupported` swallows module-load errors silently
- Duplicate of R3-CR-3. Scheduled there.

### R3-DB-6 (LOW, MEDIUM) — `parseCoordinateQuery` in `JourneyCreator.tsx` — no finding found under current scope re-read; note deferred from prior cycles remains.
- **Schedule**: N/A this cycle.

### R3-DB-7 (LOW, MEDIUM) — `SceneEditor` undo timer correctly cleared on re-deletion (`SceneEditor.tsx:292-294`).
- **Schedule**: N/A.

### R3-DB-8 (LOW, MEDIUM) — `Toast` dismiss pipeline correctly tears down both timers on unmount (`Toast.tsx:27-35`).
- **Schedule**: N/A.

## Final sweep

- No unhandled Promise rejections in visible paths.
- No `.catch(() => {})` without logging in user-initiated flows except `isCodecSupported` (see R3-CR-3).
- No race between `setPlaybackProgress` and `seekTo` (both gated by `seekNonce`).

## Recommendations

- Schedule R3-DB-1.
- Defer rest.
