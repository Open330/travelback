# Cycle 15 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review methodology

Single-pass deep code review examining all source files with full context from 5 prior aggregate reviews (50+ findings across cycles 1, 2, 12, 13, and 14). Focus on genuinely new findings, verifying carried findings, and cross-file interaction issues.

## Review lanes completed

- `cycle15-comprehensive-reviewer-2026-04-27.md` — 7 findings (1 MEDIUM, 1 LOW-MEDIUM, 4 LOW, 1 INFO)

No agent failures. Single comprehensive review was performed given the depth of prior multi-agent reviews across cycles 1-2 and 12-14.

## Carried findings — resolution verification

### Confirmed resolved since last aggregate

| Prior ID | Finding | Resolution |
|----------|---------|------------|
| C14-F01 | transition-duration 0.01ms should be 0ms | RESOLVED — `transition-duration: 0ms !important` at vitro-base.css:770 |
| C14-F02 | handleScenesChange stale pendingTrimRange | RESOLVED — useEffect at page.tsx:434-436 |
| C14-F03 | useExportController scenes in dep array | RESOLVED — scenesRef used at useExportController.ts:68,159 |
| C14-F06 | removeScene stores single scene for undo | RESOLVED — full preDeletionScenes array at SceneEditor.tsx:365 |
| C14-F08 | handleShare silently fails on non-AbortError | RESOLVED — shareError state with toast at ExportPanel.tsx:169-183 |

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

## New findings (deduplicated)

---

### C15-F01 — JourneyCreator cleanup ref accumulation for style reload race

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/JourneyCreator.tsx:271-482`
- **Detail:** When `handleStyleReload` fires and re-runs `bindListeners()`, `cleanupRef.current` is overwritten with the new cleanup function. The inner listeners from the previous `bindListeners()` call are no longer tracked and may leak. Additionally, `map.on('style.load', handleStyleReload)` is registered inside `handleInitialStyleLoad` (line 460), but the outer cleanup at line 474-475 removes `handleStyleReload` — however, if `handleStyleReload` already fired before cleanup, its inner listeners are only cleaned by the overwritten `cleanupRef.current`.
- **Failure scenario:** Multiple style reloads cause event listener accumulation. Each reload calls `bindListeners()` which adds new click/mousedown/etc. listeners. Only the most recent set is removed on unmount; earlier sets leak.
- **Suggested fix:** Accumulate cleanup functions in an array instead of overwriting a single ref, or restructure to use a single cleanup function that removes all registered listeners.

---

### C15-F05 — useExportController resetSize() called without mountedRef guard in finally block

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:274-281`
- **Detail:** The `finally` block calls `mapViewRef.current?.resetSize()` outside the `if (mountedRef.current)` guard at line 293. If the component unmounts during export (e.g., error boundary), `resetSize()` may be called on a destroyed map, potentially throwing.
- **Failure scenario:** React error boundary catches an error during export. The finally block calls `resetSize()` on a destroyed map reference, which could throw an unhandled exception.
- **Suggested fix:** Move `resetSize()` call inside the `if (mountedRef.current)` guard, or add a try/catch specifically around `resetSize()`.

---

### C15-F04 — checkJsonDepth uses index-based iteration instead of for...of for Unicode correctness

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:511-529`
- **Detail:** (Carried from C14-F05.) `checkJsonDepth` iterates with `for (let i = 0; i < text.length; i++)` returning UTF-16 code units. Using `for (const ch of text)` would iterate over Unicode code points and be semantically correct for strings containing characters outside the BMP.
- **Suggested fix:** Change to `for (const ch of text)`.

---

### C15-F03 — ErrorBoundary does not show error details in development

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ErrorBoundary.tsx`
- **Detail:** The ErrorBoundary fallback does not display the error message or stack trace, even in development mode.
- **Suggested fix:** Show error details in development mode fallback.

---

### C15-F06 — MapView addTrackLayers called from multiple effect paths without deduplication

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:990-1050`
- **Detail:** `addTrackLayers` can be called from multiple effect paths (track-load effect, onGlobalStyleLoad, progress effect guard). The function is idempotent but wasteful.
- **Suggested fix:** Low priority — function is idempotent.

---

### C15-F07 — ElevationProfile SVG stroke width inconsistency (cosmetic)

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/components/ElevationProfile.tsx:97-133`
- **Detail:** Area fill paths don't use `vectorEffect="non-scaling-stroke"` unlike the main path line. This is cosmetic — the area fill is a fill, not a stroke, so no action needed.

---

### C15-F08 — buildFitBounds antimeridian degenerate padding coordinate space

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:193-228`
- **Detail:** (Carried from C14-F07.) When a degenerate track is near the antimeridian, `DEGENERATE_PADDING` is applied in the wrong coordinate space.
- **Suggested fix:** Apply padding in the same coordinate space as the bounds computation.

---

## Finding count summary

| Severity | Count | New this cycle | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 2 | 0 | N02, N03 |
| MEDIUM-HIGH | 2 | 0 | N01, N04 |
| MEDIUM | 14 | 1 (C15-F01) | 13 carried |
| LOW-MEDIUM | 2 | 1 (C15-F05) | 1 carried |
| LOW | 13 | 4 (C15-F03, F04, F06, F08) | 9 carried |
| INFO | 2 | 1 (C15-F07) | 1 carried |
| **Total new** | **7** | **7** | — |

## Actionable this cycle

1. **C15-F01** (MEDIUM) — Fix JourneyCreator cleanup ref accumulation for style reload race
2. **C15-F04** (LOW) — Change `checkJsonDepth` from index-based to `for...of` iteration
3. **C15-F05** (LOW-MEDIUM) — Guard `resetSize()` in export finally block with `mountedRef` check
4. **C15-F08** (LOW) — Fix antimeridian degenerate bounds padding coordinate space
