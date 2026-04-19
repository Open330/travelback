# Cycle 4 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 4).

## Active findings to address this cycle

### 1. C4-AGG-001 — MEDIUM — Fix worker `continue` scope in `parseSemanticSegments`

**Files:** `public/workers/trackParser.worker.js:99-131`

**Plan:**
- In the worker's `parseSemanticSegments` function, the `continue` statement at line 125 (inside the visit block's coordinate validation) applies to the outer `for` loop, skipping the segment boundary push at line 129.
- Restructure the visit block to use nested `if`/`else` instead of `continue`, so invalid visit coordinates only skip the visit point, not the segment boundary logic.
- Mirror the main-thread `parser.ts:295-309` structure where `continue` is inside the `if (m)` block.

**Status:** PENDING

---

### 2. C4-AGG-002 — MEDIUM — Differentiate export success message by download path

**Files:** `src/lib/videoEncoder.ts:154-181`, `src/components/ExportPanel.tsx:204-205`, `src/lib/useExportController.ts:146`, `src/lib/i18n.ts`

**Plan:**
- Change `downloadVideo` to return a richer result: `{ saved: boolean; method: 'picker' | 'fallback' }` instead of just `boolean`.
- In `useExportController`, track which method was used.
- Pass the method info to the export state so ExportPanel can show the right message.
- Add a new i18n key `export.videoSaved` with text "Your video has been saved." for the picker path.
- Use `export.savedToDownloads` ("Your video download has started.") for the fallback path.
- Alternatively, use a simpler neutral message "Your video is ready." for both paths.

**Status:** PENDING

---

### 3. C4-AGG-003 — MEDIUM — Pass `cumulativeDistances` as prop instead of recomputing

**Files:** `src/app/page.tsx`, `src/components/MapView.tsx`, `src/components/TimelineSelector.tsx`, `src/components/ElevationProfile.tsx`, `src/components/TrackWorkspace.tsx`

**Plan:**
- `page.tsx` already computes `cumulativeDistances` at line 245-248.
- Pass `cumulativeDistances` through `TrackWorkspace` to `TimelineSelector` and `ElevationProfile` as a new prop.
- Pass `cumulativeDistances` to `MapView` as a new prop (or via MapViewHandle).
- Remove the internal `useMemo` computations of `cumulDist` in `TimelineSelector`, `ElevationProfile`, and `MapView` (replace with the prop).
- For `MapView`, the `cumulDistRef` needs to stay in sync with the prop — update it via an effect.

**Status:** PENDING

---

### 4. C4-AGG-004 — LOW — Add keyboard accessibility to SceneRangeEditor handles

**Files:** `src/components/SceneEditor.tsx:165-182`

**Plan:**
- Add `tabIndex={0}`, `role="slider"`, `aria-label`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}` to the handle divs in `SceneRangeEditor`.
- Add `onKeyDown` handlers for ArrowLeft/Right (step by 1%), Home (0%), End (100%).
- Add visible focus ring via `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` class.

**Status:** PENDING

---

### 5. C4-AGG-006 — MEDIUM — Add waypoint proximity validation in JourneyCreator

**Files:** `src/components/JourneyCreator.tsx:257-266`

**Plan:**
- Before adding a new waypoint in the click handler, compute the haversine distance to the last waypoint.
- If the distance is less than 5 meters, ignore the click (the point is too close to be meaningful).
- Import `haversineDistance` from `interpolate.ts` or compute inline.
- Alternatively, use a simpler great-circle approximation for the check.

**Status:** PENDING

---

### 6. C4-AGG-007 — LOW — Replace ErrorBoundary emoji with SVG icon

**Files:** `src/components/ErrorBoundary.tsx:43`

**Plan:**
- Replace the `😵` emoji with an inline SVG alert/triangle icon.
- Keep `aria-hidden="true"` on the icon.

**Status:** PENDING

---

### 7. C4-AGG-005 — MEDIUM — Defer `preserveDrawingBuffer` to performance cycle (add comment)

**Files:** `src/components/MapView.tsx:554`

**Plan:**
- Add a comment explaining the trade-off: `preserveDrawingBuffer: true` is required for canvas capture during export but hurts GPU performance during normal use.
- Defer the actual fix (conditional flag) to a performance-focused cycle.
- Record as a deferred finding with exit criterion.

**Status:** PENDING (defer with comment)

---

## Quality gates
- `eslint` — must pass with zero errors
- `tsc --noEmit` — must pass with zero errors
- `next build` — must compile successfully

## Deferred findings (not scheduled this cycle)

### DF-C4-001 — `preserveDrawingBuffer: true` always on, wasting GPU resources
- **Source finding:** C4-AGG-005
- **Original severity / confidence:** MEDIUM / HIGH
- **File citations:** `src/components/MapView.tsx:554`
- **Reason for deferral:** Fix requires destroying and recreating the map with the flag only during export, which is a significant refactor. A code comment documenting the trade-off will be added this cycle.
- **Exit criterion:** Re-open when a dedicated performance cycle can safely implement conditional `preserveDrawingBuffer` without breaking export canvas capture.

See `.context/plans/deferred-findings-cycle2-2026-04-19.md` and `.context/plans/deferred-findings-cycle1-2026-04-19.md` for the existing deferred lists from prior cycles.

### Existing deferred items carried forward (not re-opened)
All DF-C2-* and DF-C1-* items remain deferred per their existing exit criteria.
