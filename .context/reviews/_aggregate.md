# Cycle 10 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle10-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C9 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C10-AGG.

## All cycle 9 active findings verified as FIXED

| Prior ID | Description | Fix verification |
|----------|-------------|------------------|
| C9-AGG-001 | Export finally block awaits waitForIdle with aborted signal | `useExportController.ts:181` — `abortController.signal.aborted` guard present |
| C9-AGG-002 | Toast container role="status" suppresses sequential announcements | `Toast.tsx:66` — now `role="log" aria-live="polite"` |
| C9-AGG-003 | Duplicate segment-start indices in Google JSON parser | `parser.ts:429` — `[...new Set(adjustedSegStarts)]` dedup applied |

Additionally verified as now resolved from earlier cycles:
- `navigator.webdriver` debug surface: removed from MapView
- `.omc` tool-state artifact: removed from `public/`
- ThemeToggle `addListener` fallback: already present
- TimelineSelector RAF cleanup: already present via `rafRef`
- ExportPanel codec gating: `codecReady` blocks when support unknown

## Merged findings (active, to be addressed this cycle)

### C10-AGG-001 — MEDIUM — TrackToolbar mobile menu callback ref steals focus on every re-render

**Cross-agent agreement:** cycle10-comprehensive
**Primary locations:**
- `src/components/TrackToolbar.tsx:144`

**Why it matters:**
The inline callback ref `(el) => el?.querySelector<HTMLButtonElement>('button')?.focus()` creates a new function reference on every render. React calls the ref callback with `null` (old ref) then with the DOM node (new ref) each time the function reference changes. This re-focuses the first button on every re-render while the menu is open, disrupting keyboard and screen reader navigation.

**Suggested fix:**
Replace the inline callback ref with a `useRef` + `useEffect` pattern that only focuses when `menuOpen` transitions to `true`:
```tsx
const menuPanelRef = useRef<HTMLDivElement>(null)
useEffect(() => {
  if (menuOpen && menuPanelRef.current) {
    menuPanelRef.current.querySelector<HTMLButtonElement>('button')?.focus()
  }
}, [menuOpen])
```
Then use `ref={menuPanelRef}` on the menu div instead of the inline callback.

**Confidence:** High

---

### C10-AGG-002 — LOW — `seekTo` does not guard against NaN progress

**Cross-agent agreement:** cycle10-comprehensive
**Primary locations:**
- `src/lib/usePlaybackController.ts:63-66`
- `src/components/Controls.tsx:45-47`

**Why it matters:**
`Math.max(0, NaN) === NaN` and `Math.min(1, NaN) === NaN`. If `NaN` ever reaches `seekTo`, it propagates into the `progress` state, breaking the animation loop, display calculations, and elevation profile rendering.

While `<input type="range">` always produces numeric values in normal operation, a `Number.isFinite` guard is a cheap safety net against corrupted DOM state, SSR mismatches, or synthetic events in tests.

**Suggested fix:**
Add a `Number.isFinite` guard at the top of `seekTo`:
```ts
const seekTo = useCallback((nextProgress: number) => {
  const safe = Number.isFinite(nextProgress) ? nextProgress : 0
  const clampedProgress = Math.min(1, Math.max(0, safe))
  setPlaybackProgress(clampedProgress)
  setSeekNonce((nonce) => nonce + 1)
}, [setPlaybackProgress])
```

**Confidence:** Medium

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in their existing files and are NOT scheduled for this cycle:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH — still the most impactful perf issue)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on, wasting GPU resources

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003 — added ARIA roles, but not full focus trap)

## Recommended implementation order for this cycle

1. **C10-AGG-001 (MEDIUM)**: Replace inline callback ref with useRef+useEffect in TrackToolbar mobile menu
2. **C10-AGG-002 (LOW)**: Add NaN guard in seekTo
