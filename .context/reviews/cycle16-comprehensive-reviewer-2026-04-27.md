# Cycle 16 Comprehensive Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology

Single-pass deep code review examining all source files with full context from 6 prior aggregate reviews (50+ findings across cycles 1, 2, 12, 13, 14, and 15). Focus on genuinely new findings, verifying carried findings remain open, and cross-file interaction issues. Every source file was examined.

## Carried findings — resolution verification

### Confirmed resolved since last aggregate

| Prior ID | Finding | Resolution |
|----------|---------|------------|
| C15-F01 | JourneyCreator cleanup ref overwrites on style reload | RESOLVED — `cleanupRef = useRef<(() => void)[]>([])` with push/clear pattern at JourneyCreator.tsx:177,296-298,432-449,469-470 |
| C15-F04 | checkJsonDepth uses index-based iteration | RESOLVED — `for (const ch of text)` at parser.ts:515 |
| C15-F05 | useExportController resetSize() called without mountedRef guard | RESOLVED — mountedRef guard + best-effort fallback at useExportController.ts:276-292 |
| C15-F08 | buildFitBounds antimeridian degenerate padding | RESOLVED — documented that bounds are already in shifted space at MapView.tsx:218-228 |

### Still open (carried forward)

| Prior ID | Severity | Summary |
|----------|----------|---------|
| N02 | HIGH | No unit test layer for pure functions |
| N03 | HIGH | E2E export success path exercises only stub |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main |
| N01 | MEDIUM-HIGH | Per-frame trail geometry rebuild (partially resolved by precomputed segments) |
| N08 | MEDIUM | Scene editor static aria-valuemin/aria-valuemax |
| N11 | MEDIUM | Map layer ownership split across components |
| N12 | MEDIUM | Track session state spread across 12+ atoms |
| N14 | MEDIUM | Export memory guard underestimates 4K peak |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal |
| C13-F03 | LOW | iOS Safari download fallback |
| C13-F05 | LOW | Timeline click-to-seek on selected region |
| C15-F03 | LOW | ErrorBoundary does not show error details in development |
| C15-F06 | LOW | MapView addTrackLayers called from multiple effect paths without deduplication |
| C15-F07 | INFO | ElevationProfile SVG stroke width inconsistency (cosmetic) |

## New findings (deduplicated)

---

### C16-F01 — useEffect in MediaQuery listener uses deprecated addListener/removeListener

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:268-273`
- **Detail:** The `mediaQuery.addListener(handler)` / `media.removeListener(handler)` fallback path at lines 272-273 uses the deprecated `addListener`/`removeListener` API. While the primary path uses `addEventListener('change', handler)`, the fallback is only reached when `addEventListener` is not a function on `MediaQueryList`. All modern browsers support `addEventListener` on `MediaQueryList` (since Safari 14, Chrome 80, Firefox 65). The deprecated API may be removed in future browser versions, and the fallback may never actually execute.
- **Failure scenario:** If a browser removes the deprecated `addListener` API while still not supporting `addEventListener` on `MediaQueryList`, the theme would stop following system preference changes silently. In practice this is extremely unlikely given current browser support.
- **Suggested fix:** Remove the deprecated `addListener`/`removeListener` fallback and only use `addEventListener`/`removeEventListener`. Add a comment noting the minimum browser support.

---

### C16-F02 — ErrorBoundary does not reset error state when locale changes

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ErrorBoundary.tsx:33-35`
- **Detail:** When the user changes locale, the `ErrorBoundaryInner` component receives a new `locale` prop, but the error state (`hasError`, `error`) is not reset. The error fallback will be re-rendered with the new locale's translated strings, but if the underlying error was transient, the user has no way to dismiss it beyond clicking "Try Again" (which increments `resetKey`). This is consistent behavior, but the `resetKey` mechanism only resets on explicit user action.
- **Failure scenario:** No functional failure. The error boundary correctly preserves error state across prop changes. This is documented for awareness only.
- **Suggested fix:** No change needed — current behavior is correct.

---

### C16-F03 — Timeline selector startRatio/endRatio can drift from onRangeChange callback due to stale closure

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/TimelineSelector.tsx:292-305`
- **Detail:** The `startDrag` function captures `startRatio` and `endRatio` from the render closure (lines 299-300), but these are React state values that may be stale if the component re-renders between mousedown and the first mousemove. The `applyDragNow` function reads from `dragState.current` which holds the captured values. In practice, since React batches state updates, this is unlikely to cause visible issues, but it's a latent inconsistency with the ref-based pattern used elsewhere in this component (e.g., `onRangeChangeRef`, `ratioRef`).
- **Failure scenario:** If a rapid state update changes `startRatio` or `endRatio` between the mousedown event and the first drag processing, the drag origin would be based on the stale value, producing a small jump in the handle position.
- **Suggested fix:** Read `ratioRef.current` at drag start time instead of the state variable directly.

---

### C16-F04 — Download fallback anchor element leak on rapid click

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/videoEncoder.ts:229-248`
- **Detail:** The `downloadVideo` fallback creates an `<a>` element, appends it to `document.body`, and removes it after 100ms via `setTimeout`. If `downloadVideo` is called rapidly (e.g., user clicks "Download MP4" multiple times quickly), multiple anchor elements could be created and appended to the DOM before the 100ms timeout fires for the first one. Each `a.click()` may initiate a download, but the DOM nodes accumulate briefly.
- **Failure scenario:** Rapid clicks create multiple transient DOM nodes and potentially multiple download attempts. The 100ms timeout will eventually clean them up, but the user may get multiple download prompts.
- **Suggested fix:** Track the anchor element in a module-level variable and remove the previous one before creating a new one, or debounce the download function at the UI level.

---

### C16-F05 — SceneRangeEditor drag state captures startPercent/endPercent from closure

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/SceneEditor.tsx:100-109`
- **Detail:** `startDrag` in `SceneRangeEditor` captures `startPercent` and `endPercent` from the render closure at lines 104-105. If the parent re-renders the scene (e.g., due to `updateSceneRaw` called from a sibling component), the captured drag origin values could be slightly stale. The `useEffect`-based pointermove handler (lines 111-168) closes over `dragState.current` which holds the captured values, so the drag delta computation would be correct relative to the captured origin but could drift from the actual current scene range.
- **Failure scenario:** During a drag gesture, if `updateSceneRaw` triggers a re-render that changes the scene's `startPercent`/`endPercent`, the drag origin would be based on the pre-update value, producing a small position jump.
- **Suggested fix:** Use refs for the origin values similar to how `onRangeChangeRef` is used in TimelineSelector, or capture the values from the DOM event target.

---

### C16-F06 — ExportPanel does not reset codec support cache on reopen

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:36,88,138-161`
- **Detail:** The `initialCodecSupport` object at line 36 is defined outside the component and shared across all renders. When the `useEffect` at lines 138-161 probes codecs, it updates `codecSupport` state. But the `initialCodecSupport` object is never mutated — it's only used as the initial state value. This means that if the panel is closed and reopened, the codec support results from the previous open are preserved (which is actually desirable for UX). However, if the browser gains or loses codec support between opens (e.g., after a browser update), the cached values would be stale.
- **Failure scenario:** After a browser update that adds or removes codec support, the ExportPanel would show incorrect codec availability until the user refreshes the page.
- **Suggested fix:** This is a very low-probability edge case. The current behavior (preserving codec support across panel opens within the same page load) is correct. No change needed.

---

### C16-F07 — usePlaybackController fallback timer could fire after unmount

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/usePlaybackController.ts:117-119`
- **Detail:** The `fallbackTimerRef` timer is set with `window.setTimeout(() => animate(performance.now()), 250)` at line 119. The cleanup at lines 149-153 clears `animFrameRef` and `fallbackTimerRef`, but there's a narrow window where the fallback timer could fire after the cleanup function runs but before `mountedRef.current` is set to false by the unmount effect at lines 99-102. The `animate` function checks `mountedRef.current` at line 125, so the timer callback would exit early if unmounted. However, the `setPlaybackProgress` and `setIsPlaying` calls at lines 129 and 138-139 would execute on the next tick before the unmount effect fires.
- **Failure scenario:** If the component unmounts between a `scheduleNextFrame()` call and the fallback timer firing, `animate` would call `setPlaybackProgress` on an unmounted component. React 19 suppresses the warning for this, but it's still a latent state-update-after-unmount.
- **Suggested fix:** Move the `mountedRef.current = false` assignment into the animation effect's cleanup function instead of relying on a separate unmount effect, or check `mountedRef.current` before each state setter call inside `animate`.

---

### C16-F08 — Worker buffer transfer leaves main thread with no ArrayBuffer reference for small files

- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/lib/parser.ts:617`
- **Detail:** At line 617, for small files (`buffer.byteLength <= MAIN_THREAD_JSON_FALLBACK_SIZE`), a `fallbackBuffer` is created via `buffer.slice(0)`. Then at line 699, `worker.postMessage({ ext: 'json', buffer }, [buffer])` transfers the original `buffer`. After transfer, the original `ArrayBuffer` becomes detached. The `fallbackBuffer` is a copy made before transfer, so it's safe to use in fallback paths. This is correct behavior. However, if the file size is exactly at the boundary (16 MB), both the original and fallback buffers exist briefly, doubling memory usage. For a 16 MB file, this means ~32 MB temporarily.
- **Failure scenario:** On memory-constrained devices, a 16 MB JSON file could cause a brief ~32 MB memory spike during worker creation before the transfer.
- **Suggested fix:** Consider using a threshold slightly below 16 MB (e.g., 14 MB) to account for overhead, or skip the fallback buffer for files that are well within the main-thread safety limit.

---

## Finding count summary

| Severity | Count | New this cycle | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 2 | 0 | N02, N03 |
| MEDIUM-HIGH | 2 | 0 | N01, N04 |
| MEDIUM | 5 | 0 | N08, N11, N12, N14, N17 |
| LOW-MEDIUM | 2 | 2 (C16-F01, C16-F07) | 0 |
| LOW | 17 | 5 (C16-F03, F04, F05, F06, F08) | 12 carried |
| INFO | 1 | 0 | C15-F07 |
| **Total new** | **7** | **7** | — |

## Actionable this cycle

1. **C16-F01** (LOW-MEDIUM) — Remove deprecated `addListener`/`removeListener` fallback in MediaQuery handler
2. **C16-F07** (LOW-MEDIUM) — Fix potential state-update-after-unmount in usePlaybackController fallback timer by checking mountedRef before state setters
3. **C16-F03** (LOW) — Use ratioRef.current in TimelineSelector startDrag instead of closure-captured state
4. **C16-F04** (LOW) — Guard against duplicate download anchor elements in videoEncoder fallback
5. **C16-F05** (LOW) — Use refs for SceneRangeEditor drag origin values instead of closure-captured props
