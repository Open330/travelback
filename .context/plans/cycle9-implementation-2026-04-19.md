# Cycle 9 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 9).

## Active findings to address this cycle

### 1. C9-AGG-001 — MEDIUM — Skip `waitForIdle` in export finally block when aborted

**Files:** `src/lib/useExportController.ts:175-188`

**Plan:**
- In the `finally` block of `exportTrack`, check `abortController.signal.aborted` before calling `waitForIdle`.
- When aborted, just call `resetSize()` and skip the idle wait entirely — the abort path already means the export was cancelled, so waiting for the map to settle serves no purpose.
- When not aborted (normal completion), keep the existing `waitForIdle` call so the map settles properly before resuming interactive mode.
- The `abortController` variable is already in scope from line 89. After the `finally` block sets `exportAbortRef.current = null` (line 176), the signal's aborted state is still accessible via `abortController.signal.aborted`.

**Status:** DONE

---

### 2. C9-AGG-002 — MEDIUM — Change Toast container from `role="status"` to `role="log"` for better sequential announcement

**Files:** `src/components/Toast.tsx:66`

**Plan:**
- Change `<div role="status">` to `<div role="log" aria-live="polite">`.
- `role="log"` is semantically designed for sequential entries where new items are added over time (like chat messages, logs, or toasts), and it defaults to `aria-live="polite"`. Being explicit about `aria-live="polite"` ensures consistency across AT implementations.
- Unlike `role="status"` (which has `aria-atomic="true"` by default), `role="log"` does not force atomic announcements of the entire container, so each new toast will be announced individually.
- Verify this doesn't break any existing E2E tests that might reference `role="status"`.

**Status:** DONE

---

### 3. C9-AGG-003 — LOW — Deduplicate `adjustedSegStarts` in Google JSON parser

**Files:** `src/lib/parser.ts:416-424`

**Plan:**
- After computing `adjustedSegStarts` on line 416-424, apply deduplication before using it in the return value.
- Change line 429 from:
  ```ts
  ...(adjustedSegStarts.length > 0 ? { segmentStartIndices: adjustedSegStarts } : {}),
  ```
  to:
  ```ts
  ...(adjustedSegStarts.length > 0 ? { segmentStartIndices: [...new Set(adjustedSegStarts)] } : {}),
  ```
- This ensures the returned Track object has a clean segment-start array with no duplicate indices.
- The downstream `normalizeSegmentStarts` in MapView already deduplicates with `new Set`, so this is purely a data-purity improvement at the source.

**Status:** DONE

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
