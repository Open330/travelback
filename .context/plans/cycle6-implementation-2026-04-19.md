# Cycle 6 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 6).

## Active findings to address this cycle

### 1. C6-AGG-001 — MEDIUM — Fix `cumulativeDistances` memo dependency in `page.tsx`

**Files:** `src/app/page.tsx:85-88`

**Plan:**
- Change `useMemo(() => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [], [track])` to use granular dependencies: `useMemo(() => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [], [track?.points, track?.segmentStartIndices])`.
- This prevents O(n) recomputation when only the track object reference changes but the points data is the same.

**Status:** DONE — Commit `8ec3c0f`

---

### 2. C6-AGG-002 — MEDIUM — Pass `cumulativeDistances` to `MapView` as prop instead of recomputing internally

**Files:** `src/components/MapView.tsx`, `src/app/page.tsx`

**Plan:**
- Add `cumulativeDistances?: number[]` to `MapViewProps` interface.
- In `page.tsx`, pass `cumulativeDistances={cumulativeDistances}` to `<MapView>`.
- In `MapView.tsx`, use prop to populate `cumulDistRef` with fallback to computing.
- Add `cumulativeDistancesProp` to the effect dependency array.

**Status:** DONE — Commit `8466dd8`

---

### 3. C6-AGG-003 — LOW — Pass `cumulativeDistances` through `useExportController`

**Files:** `src/lib/useExportController.ts`, `src/app/page.tsx`

**Plan:**
- Add `cumulativeDistances?: number[]` to `UseExportControllerOptions` interface.
- In `useExportController.ts`, use prop with fallback to computing.
- In `page.tsx`, move `cumulativeDistances` memo before `useExportController` and pass it.

**Status:** DONE — Commit `d95926d`

---

### 4. C6-AGG-004 — LOW — Fix `parseSemanticSegments` `continue` → `if` guard in main-thread parser

**Files:** `src/lib/parser.ts:305`

**Plan:**
- Replace `continue` with `if` guard so execution falls through to segment-start recording, matching the worker's behavior.

**Status:** DONE — Commit `f4773c5`

---

### 5. C6-AGG-005 — LOW — Fix `buildReferenceGridData` `expandedMinLng` → `expandedMinLat` copy-paste bug

**Files:** `src/components/MapView.tsx:306`

**Plan:**
- Change `Math.floor(expandedMinLng / step)` to `Math.floor(expandedMinLat / step)`.

**Status:** ALREADY FIXED — The current code already uses `expandedMinLat`. This was a false positive in the review (stale code reading).

---

### 6. C6-AGG-006 — LOW — Remove `appearance-none` from GlobalToolbar locale select

**Files:** `src/components/GlobalToolbar.tsx:53`

**Plan:**
- Remove `appearance-none` from the locale select className.

**Status:** DONE — Commit `78ce39f`

---

### 7. C6-AGG-007 — LOW — Remove redundant `aria-live="polite"` from Toast

**Files:** `src/components/Toast.tsx:66`

**Plan:**
- Remove `aria-live="polite"` since `role="status"` already provides it.

**Status:** DONE — Commit `e6ae0ea`

---

## Additional fixes

- Resolved eslint exhaustive-deps warnings: added eslint-disable comment for intentional granular memo deps, added `cumulativeDistancesProp` to `exportTrack` useCallback deps — Commit `5bc6808`

## Quality gates
- `eslint` — PASS (0 errors, 0 warnings)
- `tsc --noEmit` — PASS (0 errors)
- `next build` — PASS (compiled successfully, static export)

## Deployed
- Pushed to `main` at `9f62c88`

## Deferred findings (not scheduled this cycle)

All prior deferred items (DF-C1-*, DF-C2-*, DF-C4-001, DF-C5-001, DF-C5-002) remain deferred per their existing exit criteria in their respective plan files.

No new deferrals this cycle.
