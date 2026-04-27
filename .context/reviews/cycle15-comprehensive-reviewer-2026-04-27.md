# Cycle 15 Comprehensive Code Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review methodology

Single-pass deep code review examining all source files with full context from 5 prior aggregate reviews (50+ findings across cycles 1, 2, 12, 13, and 14). Focus on:
1. Genuinely new findings not previously reported
2. Verifying resolution of carried findings
3. Cross-file interaction issues that may have been missed
4. Current committed code state (cycle 14 fixes are all committed)

## Carried findings — resolution verification

### Confirmed resolved since last aggregate

| Prior ID | Finding | Verification |
|----------|---------|--------------|
| C14-F01 | transition-duration 0.01ms should be 0ms | RESOLVED — `transition-duration: 0ms !important` at vitro-base.css:770 |
| C14-F02 | handleScenesChange stale pendingTrimRange | RESOLVED — useEffect at page.tsx:434-436 clears pendingTrimRange when scenes.length===0 |
| C14-F03 | useExportController scenes in dep array | RESOLVED — scenesRef used at useExportController.ts:68,159 |
| C14-F06 | removeScene stores single scene for undo | RESOLVED — setDeletedScene stores full preDeletionScenes array at SceneEditor.tsx:365 |
| C14-F08 | handleShare silently fails on non-AbortError | RESOLVED — shareError state with toast at ExportPanel.tsx:169-183,293 |

### Still open (carried forward)

All findings from the cycle 14 aggregate remain open unless noted above. Key remaining items:

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

## New findings (deduplicated)

---

### C15-F01 — `JourneyCreator` map event listeners leak when component unmounts during `bindListeners` setup

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:271-482`
- **Detail:** The main `useEffect` at line 271 registers event listeners in `bindListeners()`, which is called either immediately (if style loaded) or via `handleInitialStyleLoad` / `handleStyleReload`. The cleanup function at line 469-480 calls `cleanupRef.current()` and `removeLayers(map)`. However, `cleanupRef.current` is only set inside `bindListeners()`. If the component unmounts before `bindListeners()` runs (e.g., style not yet loaded and user cancels quickly), `cleanupRef.current` is null, so the map event listeners registered by `handleInitialStyleLoad` and `handleStyleReload` are never removed. The `map.off('style.load', handleInitialStyleLoad)` and `map.off('style.load', handleStyleReload)` at lines 474-475 are called, but these are the outer listener registrations — if `handleInitialStyleLoad` already fired and called `bindListeners()`, its inner listeners are cleaned by `cleanupRef.current()`. But if `handleInitialStyleLoad` hasn't fired yet and is still pending, the `map.off` calls correctly remove it.
- **Failure scenario:** Race condition: user opens JourneyCreator, style is not loaded yet, `map.once('style.load', handleInitialStyleLoad)` is registered. Before the style loads, user cancels. The cleanup runs `map.off('style.load', handleInitialStyleLoad)` which removes the pending listener. This is actually fine. But if the style loads between the render that produced the cleanup function and the cleanup execution (React 18 concurrent mode), `handleInitialStyleLoad` fires, calls `bindListeners()`, sets `cleanupRef.current`, and then the cleanup runs and calls `cleanupRef.current()` — this works. The real risk is that `handleStyleReload` (line 453-456) is registered inside `handleInitialStyleLoad` (line 460), but the outer cleanup at line 474 only removes `handleStyleReload` from `style.load`, not the inner listeners set by `bindListeners()` if called from `handleStyleReload`. Actually, `cleanupRef.current` is overwritten each time `bindListeners()` runs, so only the most recent cleanup function is called. This means if `handleStyleReload` fires and re-runs `bindListeners()`, the cleanup function from the first `bindListeners()` call is overwritten, and the inner listeners from that first call may leak.
- **Suggested fix:** Accumulate cleanup functions instead of overwriting, or use a single array of cleanup refs that are all called on unmount.

---

### C15-F02 — `GoogleGuide` component is imported but file was not reviewable (missing from file listing)

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/components/GoogleGuide.tsx`
- **Detail:** The GoogleGuide component was not fully read during this review pass. It is imported in `page.tsx` and rendered when `showGoogleGuide` is true. This is noted for completeness — no findings are claimed for this file.

---

### C15-F03 — `ErrorBoundary` component is imported but minimal (no stack trace display or error recovery)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ErrorBoundary.tsx`
- **Detail:** The ErrorBoundary wraps the entire app. If it catches an error, it renders a fallback. However, the fallback does not display the error message or stack trace, even in development mode. This makes debugging production errors harder since the user sees only a generic "something went wrong" message and the developer has no in-app visibility into what failed.
- **Failure scenario:** A runtime error in any component shows a generic error screen with no diagnostic information. Developer must check browser console to find the actual error.
- **Suggested fix:** In development mode, show the error message and component stack in the fallback UI. In production, log the error to an error reporting service and show a user-friendly message with a retry button.

---

### C15-F04 — `checkJsonDepth` uses character-by-character iteration instead of `for...of` for Unicode correctness

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:511-529`
- **Detail:** (Carried from C14-F05, restated for emphasis since it was not scheduled for implementation.) `checkJsonDepth` iterates with `for (let i = 0; i < text.length; i++)` and accesses `text[i]`, which returns UTF-16 code units. For strings containing characters outside the BMP (emoji, CJK extension B), a single character is represented as a surrogate pair. While the `ch === '"'` check won't match a surrogate half, making premature string-exit unlikely, the iteration is semantically incorrect for multi-byte characters. Using `for (const ch of text)` would iterate over Unicode code points and be semantically correct.
- **Failure scenario:** A Google JSON file with emoji in string values (extremely unlikely in Google exports, which use ASCII keys) could theoretically cause `checkJsonDepth` to miscount depth. In practice, Google exports have ASCII keys, making this a theoretical concern only.
- **Suggested fix:** Change `for (let i = 0; i < text.length; i++) { const ch = text[i]` to `for (const ch of text)`.

---

### C15-F05 — `useExportController` does not reset `isExporting` on unmount if export is in progress

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:88-96`
- **Detail:** The unmount cleanup effect at line 88-96 aborts the export controller but does not reset `isExporting` state. If the component unmounts while an export is in progress (e.g., due to a React error boundary catching an unrelated error), the `setIsExporting(false)` in the `finally` block at line 293-297 will attempt to update state on an unmounted component. While the `mountedRef.current` guard at line 293 prevents the actual state update, the `mapViewRef.current?.resetSize()` call at line 274-281 still executes, potentially operating on a destroyed map.
- **Failure scenario:** React error boundary catches an error during export. The unmount effect aborts the controller, but the export's `finally` block still calls `resetSize()` on a potentially destroyed map reference, which could throw.
- **Suggested fix:** Check `mountedRef.current` before calling `resetSize()` in the finally block. Alternatively, move the `resetSize()` call inside the `if (mountedRef.current)` guard.

---

### C15-F06 — `MapView` `addTrackLayers` is called from multiple effect paths without deduplication

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:990-1050`
- **Detail:** When a track is loaded, `addTrackLayers` can be called from: (1) the track-load effect's `attachTrackToReadyStyle()` function, (2) the `onGlobalStyleLoad` handler registered in the map-init effect, and (3) the progress effect's layer-existence guard at line 1068-1070. The function itself is idempotent (it checks `if (map.getSource('route'))` before adding), but the repeated calls waste time rebuilding and setting the same GeoJSON data. More importantly, the `addTrackLayers` callback has an empty dependency array (line 963), meaning it captures the initial `buildTrackGeometry` and `markerPointFeature` functions from its closure. Since these are pure functions, this is fine, but the pattern is fragile.
- **Failure scenario:** On a style reload, `addTrackLayers` is called from both `onGlobalStyleLoad` and the track-load effect's `onStyleReady`, potentially setting the same GeoJSON data twice in rapid succession.
- **Suggested fix:** Add a guard flag or use a single source of truth for layer creation timing. Not critical since the function is idempotent.

---

### C15-F07 — `ElevationProfile` SVG `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` distorts the elevation profile on non-square containers

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ElevationProfile.tsx:97-133`
- **Detail:** The SVG uses `viewBox="0 0 100 100"` with `preserveAspectRatio="none"` and a height of `h-10` (2.5rem). The path data is computed with `w=100, h=100` constants. With `preserveAspectRatio="none"`, the SVG stretches to fill the container width. This is intentional — the x-axis maps to distance and the y-axis maps to elevation. However, the `strokeWidth: 1.5` on the path and `strokeWidth: 1.5` on the progress line are not using `vectorEffect="non-scaling-stroke"`, unlike the main path line (which does use `vectorEffect` at line 120). The progress indicator line at line 128-132 does use `vectorEffect="non-scaling-stroke"`, but the area fill path and the gradient path do not. This means stroke widths scale with the SVG viewport, producing inconsistent line thickness.
- **Failure scenario:** On very wide containers, the area fill path lines appear thinner than intended. On narrow containers, they appear thicker. The main path line (with `vectorEffect`) maintains consistent thickness regardless of container size.
- **Suggested fix:** Not actionable for the area fill path (it's a fill, not a stroke). The main path line already uses `vectorEffect="non-scaling-stroke"`. No action needed — this is cosmetic and the current behavior is acceptable.

---

### C15-F08 — `buildFitBounds` antimeridian degenerate padding may wrap incorrectly (carried from C14-F07)

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:193-228`
- **Detail:** (Restating C14-F07 for scheduling.) When a degenerate track (all coincident points) is at a longitude near the antimeridian (e.g., 179.95), the shifted-coordinate bounds calculation may produce padding that wraps incorrectly. The `DEGENERATE_PADDING` of 0.1 degrees is added in the original coordinate space, which may produce a bounds spanning the entire world when the center is near 180 degrees.
- **Failure scenario:** A single-point track at longitude 179.95 produces bounds from 179.85 to 180.05, where 180.05 may wrap to -179.95, creating a world-spanning bounds.
- **Suggested fix:** Apply `DEGENERATE_PADDING` in the same coordinate space as the bounds computation.

---

## Verified this cycle

| Claim | Verdict |
|-------|---------|
| ESLint passes with zero errors/warnings | VERIFIED |
| TypeScript `--noEmit` passes | VERIFIED |
| `transition-duration: 0ms !important` for reduced-motion | VERIFIED — vitro-base.css:770 |
| `pendingTrimRange` cleared via useEffect when scenes empty | VERIFIED — page.tsx:434-436 |
| `scenesRef` used in useExportController exportTrack | VERIFIED — useExportController.ts:68,159 |
| `removeScene` stores full preDeletionScenes snapshot | VERIFIED — SceneEditor.tsx:365 |
| `shareError` state added for non-AbortError share failures | VERIFIED — ExportPanel.tsx:169-183 |
| Precomputed segments used for trail updates | VERIFIED — MapView.tsx:1087-1135 |
| `isExporting` guard suppresses MapView progress effect | VERIFIED — MapView.tsx:1063 |
| `renderFrameAndWait` has 5s timeout | VERIFIED — MapView.tsx:647 |
| Export progress throttle uses 100ms interval | VERIFIED — useExportController.ts:209-212 |
| `animation: none !important` for reduced-motion | VERIFIED — vitro-base.css:769 |

## Finding count summary

| Severity | Count | New this cycle | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 2 | 0 | N02, N03 |
| MEDIUM-HIGH | 2 | 0 | N01, N04 |
| MEDIUM | 14 | 1 (C15-F01) | 13 carried |
| LOW-MEDIUM | 2 | 1 (C15-F05) | 1 carried |
| LOW | 13 | 4 (C15-F03, F04, F06, F08) | 9 carried |
| INFO | 2 | 1 (C15-F02) | 1 carried |
| **Total new** | **7** | **7** | — |

## Actionable this cycle

1. **C15-F01** (MEDIUM) — Fix JourneyCreator cleanup ref accumulation for style reload race
2. **C15-F04** (LOW) — Change `checkJsonDepth` from index-based to `for...of` iteration
3. **C15-F05** (LOW-MEDIUM) — Guard `resetSize()` in export finally block with `mountedRef` check
4. **C15-F08** (LOW) — Fix antimeridian degenerate bounds padding coordinate space
