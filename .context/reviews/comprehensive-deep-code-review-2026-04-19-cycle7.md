# Comprehensive Deep Code Review - Cycle 7

**Date:** 2026-04-19
**Reviewer:** Multi-angle deep code review (cycle 7 of review-plan-fix loop)
**Scope:** Full source tree (`src/`, `public/`, `scripts/`, `e2e/`)

## Previous Cycle Verification

All findings from cycle 8 (the most recent prior review) have been verified:

- **NEW-C8-1** (Playback hotkeys not suppressed during video export): **FIXED** - `usePlaybackController.ts:151-153` now has `if (isExporting) return` at the top of the hotkey handler, before the switch statement.
- **NEW-C8-2** (Export overlay missing `data-disable-playback-hotkeys`): **FIXED** - `page.tsx:311` now has `data-disable-playback-hotkeys="true"` on the export overlay div.
- **NEW-C8-3** (harden-static-export.mjs walk() untyped parameter): No fix needed (noted for completeness).
- **NEW-C8-4** (serve-static uses 302 instead of 301): No fix needed (noted for awareness).

Prior findings from cycle 7 also verified:
- **NEW-C7-1** (TimelineSelector index-based histogram): **FIXED** - Now uses distance-based bucketing via `cumulDist` with index-based fallback when `totalDist <= 0`.

## Previously Deferred Finding Status Update

| ID | Finding | Original Status | Current Status |
|----|---------|-----------------|----------------|
| F4 | Reference grid dominates sparse map | Deferred | Still deferred (no change) |
| F5 | Map navigation control placement conflicts with toolbar | Deferred | Still deferred (no change) |
| F7 | downloadVideo fallback fetches URL that may already be revoked | Deferred | Still deferred (no change) |
| F8 | ElevationProfile SVG useId() SSR mismatch | Deferred | Still deferred (no change) |
| F9 | Worker parser fallback may silently lose data for large files | Deferred | Still deferred (no change) |
| F11 | Map interactive when aria-hidden | Deferred | Still deferred (no change) |
| F12 | TimelineSelector stale closure risk | Deferred | Still deferred (no change) |
| F14 | JourneyCreator coordinate validation | Deferred | Still deferred (no change) |
| F16 | SceneEditor start >= end validation | Deferred | Still deferred (no change) |
| NEW-R3-2 | Reference grid visible on empty map creates visual noise | Deferred | Still deferred (no change) |
| F6 | ErrorBoundary no i18n | Previously fixed | Still fixed |

## New Findings

### NEW-C9-1: `setExportState('idle')` in catch block not guarded by `mountedRef`

**Severity:** LOW
**File:** `src/lib/useExportController.ts:155`
**Category:** Correctness / consistency
**Confidence:** MEDIUM

**Description:**
In the `exportTrack` callback's catch block, `setExportState('idle')` is called without checking `mountedRef.current`. In contrast, the finally block guards `setIsExporting` and `setExportProgress` with `if (mountedRef.current)`:

```typescript
} catch (error) {
  // ...
  setExportState('idle')     // <-- NOT guarded by mountedRef
} finally {
  // ...
  if (mountedRef.current) {
    setIsExporting(false)    // <-- guarded
    setExportProgress(0)     // <-- guarded
  }
}
```

This is an inconsistency. If the component unmounts between the catch and finally blocks (extremely unlikely but theoretically possible), `setExportState` would attempt to update state on an unmounted component.

In React 19, setting state on an unmounted component is a no-op without warning, so there's no runtime impact. However, the inconsistency suggests the catch block was not reviewed with the same `mountedRef` discipline as the finally block.

**Concrete failure scenario:**
1. User starts a video export
2. The export fails with an error
3. Simultaneously, the component is unmounted (e.g., user navigates away)
4. `setExportState('idle')` is called on an unmounted component
5. No visible effect, but the state update is wasted

**Fix:** Wrap the catch block's `setExportState('idle')` in a `mountedRef.current` check, consistent with the finally block's pattern.

---

### NEW-C9-2: SceneEditor undo supports only single-delete undo

**Severity:** LOW
**File:** `src/components/SceneEditor.tsx:193,253-258`
**Category:** UX limitation
**Confidence:** HIGH

**Description:**
The SceneEditor's undo feature uses a single `deletedScene` state variable. If the user deletes multiple scenes in quick succession, only the most recently deleted scene can be undone. Earlier deletions are permanently lost once the `deletedScene` state is overwritten.

```typescript
const [deletedScene, setDeletedScene] = useState<{ scene: Scene; precedingSceneId: string | null } | null>(null)

const removeScene = useCallback((id: string) => {
  const idx = scenes.findIndex(s => s.id === id)
  if (idx >= 0) setDeletedScene({ scene: scenes[idx], precedingSceneId: idx > 0 ? scenes[idx - 1].id : null })
  // ^^^ This overwrites any previously stored deletedScene
  commitScenes(scenes.filter(s => s.id !== id))
}, [commitScenes, scenes])
```

This is a UX limitation rather than a bug. The undo banner appears for 5 seconds, so the user has a reasonable window to undo the most recent deletion. However, a more robust implementation could maintain an undo stack.

**No fix needed** -- noting for awareness. A full undo stack would be a feature enhancement.

---

### NEW-C9-3: `computeCumulativeDistances` computed redundantly across multiple components

**Severity:** INFO
**File:** `src/app/page.tsx:241`, `src/components/MapView.tsx:701`, `src/components/ElevationProfile.tsx:24`, `src/components/TimelineSelector.tsx:68`, `src/lib/videoEncoder.ts:65`
**Category:** Performance
**Confidence:** LOW

**Description:**
The `computeCumulativeDistances` function is called independently in at least 5 places for the same track data. Most of these are wrapped in `useMemo` and only recomputed when the track changes, so the practical performance impact is minimal. However, for large tracks (approaching the 250k point limit), the redundant computation is wasteful.

The calls:
1. `page.tsx:241` - For `handlePreviewScene`
2. `MapView.tsx:701` - For map animation (stored in `cumulDistRef`)
3. `ElevationProfile.tsx:24` - For SVG path generation
4. `TimelineSelector.tsx:68` - For histogram bucketing
5. `videoEncoder.ts:65` - For video frame camera computation

A shared context or memoized hook could compute this once and distribute it. However, this would require a significant refactor of the component tree's prop interface.

**No fix needed** -- noting for awareness only. The current approach is simple and correct, and the performance impact is negligible for typical track sizes.

---

### NEW-C9-4: Theoretical hotkey race window between export start and state update

**Severity:** INFO
**File:** `src/app/page.tsx:87-90`, `src/lib/usePlaybackController.ts:129-201`
**Category:** Correctness / race condition
**Confidence:** LOW

**Description:**
When the user starts a video export by clicking "Start Export" in the ExportPanel, the following sequence occurs:

1. `exportTrack` is called
2. `pausePlayback()` is called synchronously
3. `setIsExporting(true)` is called (state update is batched)
4. React re-renders, `isExporting` becomes `true`
5. The `usePlaybackHotkeys` effect re-registers the handler with `isExporting=true`

Between steps 3 and 5, the old hotkey handler (with `isExporting=false`) is still active. If the user were to press Space during this one-render-cycle window, `togglePlay()` could be called, creating a competing animation loop.

In practice, this window is extremely short (< 16ms) and the export panel already has `data-disable-playback-hotkeys="true"` which provides primary protection while the panel is open. The user would need to close the export panel and press Space within the same render cycle, which is practically impossible.

**No fix needed** -- the existing `data-disable-playback-hotkeys` attribute on the export panel and the `isExporting` early-return provide defense-in-depth that makes this race condition unreachable in practice.

---

## Multi-Angle Specialist Review Summary

### Code Quality / Logic / SOLID / Maintainability

**Overall: Good.** The codebase follows consistent patterns:
- `useCallback` and `useMemo` are used appropriately to prevent unnecessary re-renders
- Refs are used correctly for mutable state that shouldn't trigger re-renders (e.g., `cumulDistRef`, `trackRef`, `dragState`)
- The `mountedRef` pattern prevents state updates after unmount
- Error handling is thorough with proper `try/finally` cleanup

**Concerns (not new):** `MapView.tsx` (883 lines) and `JourneyCreator.tsx` (759 lines) are large single components. This is a maintainability concern but would require significant refactoring to address.

### Performance / Concurrency

**Overall: Good.** The codebase uses `requestAnimationFrame` for playback animation, `useMemo` for expensive computations, and `useCallback` for stable function references. The export pipeline properly awaits map idle events before capturing frames.

**No new performance findings.** The `computeCumulativeDistances` redundancy (NEW-C9-3) is the closest to a performance concern but is mitigated by memoization.

### Security

**Overall: Solid.** No new security issues found. The existing defenses remain intact:
- CSP hardening via post-build script
- XML entity stripping in parser
- JSON depth checking
- Worker isolation for large files
- No `eval()`, no unsanitized `innerHTML`
- External links use `rel="noopener noreferrer"`

### Accessibility

**Overall: Good.** Modal dialogs use proper focus trapping and `aria-modal`. The `data-disable-playback-hotkeys` attribute prevents keyboard interference from background controls. The mobile menu uses correct `role="menu"` and `role="menuitem"` (fixed in C6-4).

**Minor observation:** The JourneyCreator search uses `role="listbox"` with `role="option"` for search results. This is semantically correct for a selection list. The combobox pattern could benefit from `aria-selected` on options, but since results are immediately consumed on click, this is a very minor gap.

### Correctness / Edge Cases

**Overall: Good.** The antimeridian handling is consistent across `lerpCamera`, `smoothCameraState`, and `computeBoundingBox`. The `normalizeScenes` function properly handles overlapping scenes. The `interpolateAlongTrack` function handles empty and single-point tracks.

The only actionable correctness finding (NEW-C9-1) is a minor inconsistency in the `mountedRef` guard pattern, with no practical impact in React 19.

### Test Coverage

**Overall: Adequate for an e2e-tested app.** The Playwright test suite covers:
- File import (GPX, KML, Google JSON variants)
- Playback controls
- Scene editor
- Export panel
- Map style cycling
- Theme synchronization
- Layout overlap checks (desktop and mobile)
- Keyboard focus trapping in modals
- Accessibility semantics

**Not covered:** Unit tests for lib modules (parser, camera, interpolate, videoEncoder). These are tested indirectly through e2e tests, but edge cases would benefit from unit tests. This is a known gap best addressed as a separate initiative.

---

## Codebase Health Assessment

### Strengths (re-confirmed from previous cycles)

1. **Security posture remains solid**: CSP hardening, XML entity stripping, JSON depth checking, worker isolation, no `eval()`.
2. **Resource cleanup is thorough**: Object URLs revoked, MapLibre markers/layers removed on unmount, event listeners cleaned up, `mountedRef` pattern.
3. **Type safety is good**: `ParseError` class with machine-readable codes, proper TypeScript types, no `any` usage in source files.
4. **Antimeridian handling**: Consistent shifted-longitude interpolation across all camera functions.
5. **Accessibility**: Modal dialogs with focus trapping and `aria-modal`, keyboard navigation, `inert`/`aria-hidden` on background content.
6. **Defense-in-depth for parsing**: Multiple size checks, worker fallback, date field repair after structured clone.
7. **i18n completeness**: All user-facing strings use the translation system, including ErrorBoundary.
8. **No TODO/FIXME/HACK comments** in source code.
9. **All console statements justified**: No extraneous debug logging.
10. **All eslint-disable comments justified**: 5 total, each with documented reasons.

### No Regressions Detected

All previously fixed issues remain fixed:
- C8-1/C8-2 (playback hotkeys during export): Both fixes confirmed in place
- C7-1 (TimelineSelector distance-based histogram): Confirmed working
- C6-1 (redundant `!isExporting` check): Removed
- C6-4 (TrackToolbar mobile menu ARIA roles): Fixed to `role="menu"`/`role="menuitem"`
- F6 (ErrorBoundary i18n): Fixed

### Module-Level Assessment

| Module | Lines | Assessment |
|--------|-------|------------|
| `src/app/page.tsx` | 422 | Clean, C8-2 fix confirmed |
| `src/lib/usePlaybackController.ts` | 201 | Clean, C8-1 fix confirmed |
| `src/lib/useExportController.ts` | 191 | **Finding** (NEW-C9-1: mountedRef guard inconsistency) |
| `src/lib/parser.ts` | 566 | Robust, no new issues |
| `src/components/MapView.tsx` | 883 | Complex but well-structured, no new issues |
| `src/lib/camera.ts` | 445 | Clean antimeridian handling |
| `src/lib/videoEncoder.ts` | 191 | Proper abort handling, no new issues |
| `src/lib/i18n.ts` | ~1740 | Complete 5-locale coverage |
| `src/components/TimelineSelector.tsx` | 389 | Distance-based bucketing confirmed |
| `src/components/SceneEditor.tsx` | 569 | **Finding** (NEW-C9-2: single-delete undo) |
| `src/components/JourneyCreator.tsx` | 759 | No new issues |
| `src/components/ElevationProfile.tsx` | 141 | Clean |
| `src/components/ExportPanel.tsx` | 326 | Uses `data-disable-playback-hotkeys` correctly |
| `src/components/ModalDialog.tsx` | 188 | Proper stacking, focus trap |
| `src/components/ErrorBoundary.tsx` | 83 | Now uses i18n (F6 fix confirmed) |
| `src/components/TrackToolbar.tsx` | 227 | C6-4 ARIA role fix confirmed |
| `scripts/harden-static-export.mjs` | 102 | Clean CSP hardening |
| `scripts/serve-static.mjs` | 184 | Secure static file serving |

---

## Summary

| ID | Finding | Severity | Confidence | Files |
|----|---------|----------|------------|-------|
| NEW-C9-1 | `setExportState('idle')` not guarded by `mountedRef` | LOW | MEDIUM | `src/lib/useExportController.ts:155` |
| NEW-C9-2 | SceneEditor undo only supports single-delete | LOW | HIGH | `src/components/SceneEditor.tsx:193,253-258` |
| NEW-C9-3 | Redundant `computeCumulativeDistances` across components | INFO | LOW | Multiple files |
| NEW-C9-4 | Theoretical hotkey race window at export start | INFO | LOW | `src/app/page.tsx:87-90`, `src/lib/usePlaybackController.ts:129-201` |

**Net assessment:** The codebase is in excellent shape. All previously identified MEDIUM and HIGH severity issues have been fixed. The new findings this cycle are all LOW or INFO severity. No security, data-loss, or critical issues found. The C8-1/C8-2 fixes (playback hotkey suppression during export) are confirmed working correctly.
