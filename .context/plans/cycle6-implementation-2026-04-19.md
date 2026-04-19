# Cycle 6 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 6).

## Active findings to address this cycle

### 1. C6-AGG-001 — MEDIUM — Fix `cumulativeDistances` memo dependency in `page.tsx`

**Files:** `src/app/page.tsx:246-249`

**Plan:**
- Change `useMemo(() => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [], [track])` to use granular dependencies: `useMemo(() => track ? computeCumulativeDistances(track.points, track.segmentStartIndices) : [], [track?.points, track?.segmentStartIndices])`.
- This prevents O(n) recomputation when only the track object reference changes but the points data is the same.

**Status:** PENDING

---

### 2. C6-AGG-002 — MEDIUM — Pass `cumulativeDistances` to `MapView` as prop instead of recomputing internally

**Files:** `src/components/MapView.tsx:765`, `src/app/page.tsx:303-314`

**Plan:**
- Add `cumulativeDistances?: number[]` to `MapViewProps` interface.
- In `page.tsx`, pass `cumulativeDistances={cumulativeDistances}` to `<MapView>`.
- In `MapView.tsx`, change line 765 from:
  ```ts
  cumulDistRef.current = computeCumulativeDistances(track.points, track.segmentStartIndices)
  ```
  to:
  ```ts
  cumulDistRef.current = cumulativeDistances?.length ? cumulativeDistances : computeCumulativeDistances(track.points, track.segmentStartIndices)
  ```
- Remove the `computeCumulativeDistances` import if it becomes unused (it won't — it's still the fallback).
- Add `cumulativeDistances` to the effect dependency array at line 807.

**Status:** PENDING

---

### 3. C6-AGG-003 — LOW — Pass `cumulativeDistances` through `useExportController`

**Files:** `src/lib/useExportController.ts:131`, `src/app/page.tsx:95-104`

**Plan:**
- Add `cumulativeDistances?: number[]` to `UseExportControllerOptions` interface.
- In `useExportController.ts`, change line 131 from:
  ```ts
  const cumulDist = computeCumulativeDistances(track.points, track.segmentStartIndices)
  ```
  to:
  ```ts
  const cumulDist = cumulativeDistances?.length ? cumulativeDistances : computeCumulativeDistances(track.points, track.segmentStartIndices)
  ```
- In `page.tsx`, pass `cumulativeDistances` to `useExportController`.
- Remove the `computeCumulativeDistances` import from `useExportController.ts` if it becomes unused (it won't — it's still the fallback).

**Status:** PENDING

---

### 4. C6-AGG-004 — LOW — Fix `parseSemanticSegments` `continue` → `if` guard in main-thread parser

**Files:** `src/lib/parser.ts:305`

**Plan:**
- Change line 305 from:
  ```ts
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
  ```
  to:
  ```ts
  if (lat != null && lng != null && !(Math.abs(lat) > 90 || Math.abs(lng) > 180)) {
    out.push({ lat, lng, time: gTime(dur) })
  }
  ```
  and remove the `out.push({ lat, lng, time: gTime(dur) })` from line 306 (it's now inside the if block).
- This ensures execution falls through to the segment-start recording on line 311, matching the worker's behavior.

**Status:** PENDING

---

### 5. C6-AGG-005 — LOW — Fix `buildReferenceGridData` `expandedMinLng` → `expandedMinLat` copy-paste bug

**Files:** `src/components/MapView.tsx:306`

**Plan:**
- Change `Math.floor(expandedMinLng / step)` to `Math.floor(expandedMinLat / step)` on line 306.

**Status:** PENDING

---

### 6. C6-AGG-006 — LOW — Remove `appearance-none` from GlobalToolbar locale select

**Files:** `src/components/GlobalToolbar.tsx:53`

**Plan:**
- Remove `appearance-none` from the locale select className so the native dropdown indicator is shown.

**Status:** PENDING

---

### 7. C6-AGG-007 — LOW — Remove redundant `aria-live="polite"` from Toast

**Files:** `src/components/Toast.tsx:66`

**Plan:**
- Remove `aria-live="polite"` from the Toast container div since `role="status"` already provides implicit `aria-live="polite"`.

**Status:** PENDING

---

## Deferred findings (not scheduled this cycle)

All prior deferred items (DF-C1-*, DF-C2-*, DF-C4-001, DF-C5-001, DF-C5-002) remain deferred per their existing exit criteria in their respective plan files.

No new deferrals this cycle — all C6 findings are scheduled for implementation.
