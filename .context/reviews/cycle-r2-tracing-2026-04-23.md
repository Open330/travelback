# Cycle 2 Tracing Review (2026-04-23, orchestrator run r2)

Causal tracing of the most error-prone flows; competing hypotheses for each.

## Flow 1 — theme bootstrap race

Scenario: user has `travelback-theme=dark` in localStorage; opens the static site.

Trace:
1. Browser parses `out/index.html`, sees inline `<script>` hash-pinned by CSP. Executes before any CSS.
2. Script reads `localStorage.getItem('travelback-theme')` → 'dark'.
3. Sets `document.documentElement.setAttribute('data-mode','dark')`.
4. Script reads `travelback-mapstyle` → 'dark' (or inferred from theme).
5. Sets `data-mapstyle='dark'`.
6. Sets `d.lang` if stored locale is one of en/ko/ja/zh/es.
7. CSS `@import` loads; `[data-mode=dark]` rules apply. No flash.
8. React hydrates; `page.tsx` state initializer reads `data-mode` first, then localStorage, then matchMedia.

Hypothesis A (null): the above trace is correct. No visible flash.
Hypothesis B (cache miss): if the bootstrap script executes but `CSP` denies it before it runs (unlikely — hash is pinned), the DOM has no `data-mode` and CSS fallback `:root:not([data-mode])` serves light-mode values until React's useEffect at `src/app/page.tsx:71-75` applies `data-mode` post-mount. This would cause a FOUC-dark-on-light flash.

Evidence for B: none observed; the smoke test confirms the hash-pinned CSP allows the inline script.

**Conclusion: Hypothesis A holds.** Cycle 17 earlier hardened both paths. No new finding.

## Flow 2 — map style change with track loaded

Scenario: user clicks "Map: Voyager" cycle button with a track displayed.

Trace:
1. `cycleStyle()` in page.tsx:293-305 updates state and calls `setStyle`.
2. MapView's style-change effect at `:645-667` calls `map.setStyle(MAP_STYLES[mapStyleKey].url)`.
3. Once style loads, re-adds reference grid and track layers via `addReferenceGridLayers` + `addTrackLayers`.
4. Cleanup: `map.off('style.load', styleHandler)`.

Hypothesis A: the listener is removed once style loads. Good.
Hypothesis B: rapid cycle-through (user mashes the button) could leave multiple pending listeners if MapLibre fires style.load multiple times.

Check: `map.once('style.load', styleHandler)` is `once`, and the effect's cleanup removes the same handler with `off`. Even on rapid cycling, the effect re-runs — deps `[mapStyleKey]` — which triggers `if (styleKeyRef.current === mapStyleKey) return` early-out when re-rendered with same value. When different, the old listener is cleaned up, then new one registered.

**Conclusion: Hypothesis A holds.** Verified by E2E test "map style cycling works across all bundled themes".

## Flow 3 — export cancel mid-frame

Scenario: user clicks "Cancel" during export.

Trace:
1. `cancelExport` calls `exportAbortRef.current?.abort()`.
2. `AbortController.abort()` fires the 'abort' event on `signal`.
3. `exportVideo` loop checks `signal.aborted` at top and after `renderFrame`, throws `DOMException('Export cancelled', 'AbortError')`.
4. `waitForIdle` sees `signal.aborted` and rejects with AbortError.
5. `try/finally` of exportVideo skips `finalize()` because `completed = false`.
6. Catch in useExportController sees AbortError, toasts 'app.exportCancelled'.
7. Finally: resets size, waits for idle (skipped because aborted), sets isExporting=false.

Hypothesis A: flow is clean.
Hypothesis B: `waitForIdle` rejects with `AbortError` but the finally's `await mapViewRef.current?.waitForIdle(…)` could then also reject and be swallowed.

Check: `if (!abortController.signal.aborted && mapViewRef.current)` — the second waitForIdle only runs when NOT aborted. Good.

**Conclusion: Hypothesis A holds.**

## Flow 4 — Worker parse fails for malformed Google JSON

Scenario: user uploads corrupted `.json` that the worker can't parse.

Trace:
1. `parseGoogleLocationHistoryInWorkerBuffer` creates a Worker.
2. `textCopy = decodeJsonBuffer(buffer)` is captured BEFORE postMessage transfers the buffer.
3. Worker fails in `JSON.parse` → `catch (error)` → posts `{error, code: 'INVALID_GOOGLE_JSON'}`.
4. Main thread `onmessage` sees `event.data.error`, rejects with `ParseError(message, code)`.
5. FileUpload maps code to i18n key `fileUpload.parseFailed` and shows.

Hypothesis A: clean.
Hypothesis B: If the worker reports a parse error AND the main-thread parser would have succeeded (theoretically impossible — same logic), we'd miss the successful path.

Check: the worker reimplements the same format detection and parse logic as `parseGoogleLocationHistory` in parser.ts. Same output for same input. If the worker reports a parse error with a code, main-thread fallback is skipped — which is correct.

**Conclusion: Hypothesis A holds.** No fallback-to-main-thread-after-parse-error. This matches DF-C17-002 (intentional behavior).

## Flow 5 — TimelineSelector range change during playback

Scenario: user drags the timeline end handle while playback is active.

Trace:
1. `pointermove` → `applyDrag` (throttled via rAF).
2. `applyDrag` updates local `startRatio`/`endRatio` state AND calls `onRangeChangeRef.current(startIdx, endIdx)` (`src/components/TimelineSelector.tsx:182-229`).
3. `onRangeChange` in page.tsx (`:169-190`) slices `fullTrack.points`, sets `track`, calls `resetPlayback()`.
4. `resetPlayback()` sets progress=0 and isPlaying=false → playback stops.
5. Filtered track flows to MapView, which re-runs load-track effect.

Hypothesis A: playback stops on trim — intentional per resetPlayback.
Hypothesis B: the RAF'd fire might race with a queued React update, briefly causing a zero-length slice.

Check: `slicedPoints.length < 2` early-returns in page.tsx:173. `resolveIndexesForRatios` enforces `endIdx > startIdx` via `Math.min(lastIndex, startIdx + 1)` (line 175-177). No zero-length possible.

**Conclusion: Hypothesis A holds.**

## Net tracing outcome
All 5 critical flows are well-ordered and defensive. No race conditions or stale-state leaks identified this cycle.
