# Cycle 10 Comprehensive Deep Code Review — 2026-04-19

**Scope:** Full repo — `src/**`, `public/**`, `scripts/**`, `e2e/**`, root configs
**Method:** Complete file-by-file review of all source files, cross-referenced against prior cycle reviews (1-9), deferred findings, and the current codebase state.

## Re-verification of prior-cycle active findings

All C9-AGG-001 through C9-AGG-003 verified as FIXED in the current codebase:
- C9-AGG-001: `useExportController.ts:181` — `abortController.signal.aborted` guard before `waitForIdle` in finally block
- C9-AGG-002: `Toast.tsx:66` — `role="log" aria-live="polite"` (changed from `role="status"`)
- C9-AGG-003: `parser.ts:429` — `[...new Set(adjustedSegStarts)]` dedup applied

Prior reviewer findings that are now resolved:
- `navigator.webdriver` debug surface: REMOVED from MapView
- `.omc` tool-state artifact: REMOVED from `public/`
- ThemeToggle `addListener` fallback: ALREADY PRESENT at line 47-48
- TimelineSelector RAF cleanup: ALREADY PRESENT via `rafRef` + `cancelAnimationFrame`
- ExportPanel codec gating: `codecReady` correctly blocks when `codecSupport[codec] !== true`

## New findings

### C10-001 — MEDIUM — TrackToolbar mobile menu callback ref steals focus on every re-render

**File:** `src/components/TrackToolbar.tsx:144`
**Confidence:** High

**Issue:**
The mobile menu div uses an inline callback ref:
```tsx
ref={(el) => el?.querySelector<HTMLButtonElement>('button')?.focus()}
```
Since this is an inline arrow function, React creates a new function reference on every render and calls the ref callback each time. This means the first button in the menu re-receives focus on every re-render while the menu is open.

**Concrete failure scenario:**
1. User opens the mobile menu on a touch device
2. User moves focus (or taps) to the "Map Style" button (second button)
3. A state change causes re-render (e.g., locale or mode change from the same menu)
4. The inline ref fires again, pulling focus back to the first button ("New Journey")
5. Keyboard and screen reader users lose their place in the menu

**Suggested fix:**
Replace the inline callback ref with a `useRef` + `useEffect` pattern that only focuses once when the menu opens:
```tsx
const menuPanelRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (menuOpen && menuPanelRef.current) {
    menuPanelRef.current.querySelector<HTMLButtonElement>('button')?.focus()
  }
}, [menuOpen])
```

---

### C10-002 — LOW — `seekTo` does not guard against NaN from parseFloat in slider onChange

**File:** `src/components/Controls.tsx:45-47`, `src/lib/usePlaybackController.ts:63-66`
**Confidence:** Medium

**Issue:**
The progress slider handler calls `onSeek(parseFloat(e.target.value))`. If `parseFloat` returns `NaN` (corrupt DOM state, SSR mismatch, or synthetic event edge case), the `seekTo` function's clamping `Math.min(1, Math.max(0, nextProgress))` does NOT protect against NaN because `Math.max(0, NaN) === NaN` and `Math.min(1, NaN) === NaN`. This would propagate `NaN` into the `progress` state, breaking the animation loop and display calculations.

**Concrete failure scenario:**
Extremely unlikely in normal use since `<input type="range">` always produces numeric values. However, in a corrupted DOM or test environment with synthetic events, passing `NaN` through `seekTo` would set `progress` to `NaN`, causing `total * progress` in Controls to be `NaN`, the animation effect to break (infinite loop or no movement), and the elevation profile to render with `NaN` coordinates.

**Suggested fix:**
Add a `Number.isFinite` guard in `seekTo`:
```ts
const seekTo = useCallback((nextProgress: number) => {
  const safe = Number.isFinite(nextProgress) ? nextProgress : 0
  const clampedProgress = Math.min(1, Math.max(0, safe))
  setPlaybackProgress(clampedProgress)
  setSeekNonce((nonce) => nonce + 1)
}, [setPlaybackProgress])
```

---

## Final sweep — commonly missed issues

I performed a final sweep specifically looking for:
- **Race conditions in async flows:** Export, parser worker, and codec probe all handle cancellation/cleanup correctly. The worker fallback pattern in `parser.ts` is sound.
- **Memory leaks:** Object URLs are revoked on reset/unmount. The mountedRef pattern in useExportController is correct. Worker cleanup is handled.
- **Edge cases in geometry building:** `buildTrackGeometry` handles single-point segments by duplicating the point (valid GeoJSON). `buildFitBounds` handles degenerate single-point bounds with padding.
- **Error boundary coverage:** ErrorBoundary wraps the entire app shell. Individual error states (mapError in MapView, parse errors in FileUpload) are handled locally.
- **ARIA/keyboard accessibility:** ModalDialog has focus trap and Escape handling. Toast uses `role="log"`. TimelineSelector handles have `role="slider"` with keyboard support. SceneRangeEditor handles have `role="slider"`.
- **Reduced motion:** CSS handles `prefers-reduced-motion: reduce` for spinner animations. The `animate-spin` class is overridden in globals.css.
- **i18n:** All user-facing strings go through `t()`. The `lang` attribute is set dynamically from locale.
- **Inline styles vs CSP:** Known deferred finding (DF-C2-009). The current `style-src 'unsafe-inline'` policy is accepted for now.

No additional confirmed findings surfaced beyond C10-001 and C10-002.

## Carried-forward deferred items (unchanged)

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001 through DF-C2-010 (all unchanged, per their exit criteria)

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003 — added ARIA roles, but not full focus trap)
