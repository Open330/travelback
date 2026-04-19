# Cycle 10 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 10).

## Active findings to address this cycle

### 1. C10-AGG-001 — MEDIUM — Replace TrackToolbar mobile menu callback ref with useRef+useEffect

**Files:** `src/components/TrackToolbar.tsx:144`

**Plan:**
- Add a `const menuPanelRef = useRef<HTMLDivElement>(null)` at the top of the TrackToolbar component.
- Add a `useEffect` that runs when `menuOpen` changes to `true`, focusing the first button inside the menu panel:
  ```tsx
  useEffect(() => {
    if (menuOpen && menuPanelRef.current) {
      menuPanelRef.current.querySelector<HTMLButtonElement>('button')?.focus()
    }
  }, [menuOpen])
  ```
- Replace the inline callback ref on the menu div:
  ```tsx
  // Before:
  ref={(el) => el?.querySelector<HTMLButtonElement>('button')?.focus()}
  
  // After:
  ref={menuPanelRef}
  ```
- This ensures focus is set exactly once when the menu opens, not on every re-render.

**Status:** PENDING

---

### 2. C10-AGG-002 — LOW — Add NaN guard in seekTo

**Files:** `src/lib/usePlaybackController.ts:63-66`

**Plan:**
- In the `seekTo` callback, add a `Number.isFinite` guard before the clamping:
  ```ts
  const seekTo = useCallback((nextProgress: number) => {
    const safe = Number.isFinite(nextProgress) ? nextProgress : 0
    const clampedProgress = Math.min(1, Math.max(0, safe))
    setPlaybackProgress(clampedProgress)
    setSeekNonce((nonce) => nonce + 1)
  }, [setPlaybackProgress])
  ```
- This prevents NaN from propagating into the `progress` state, which would break the animation loop, display calculations, and elevation profile rendering.

**Status:** PENDING

---

## Quality gates
- `eslint` — must pass with 0 errors
- `tsc --noEmit` — must pass with 0 errors
- `next build` — must pass

## Deferred findings (not scheduled this cycle)

All prior deferred items remain deferred per their existing exit criteria:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping (partially addressed by C7-AGG-003)

No new deferrals this cycle.
