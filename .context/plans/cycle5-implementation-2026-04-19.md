# Cycle 5 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 5).

## Active findings to address this cycle

### 1. C5-AGG-001 — MEDIUM — Fix `downloadVideo` fallback `<a>` removal timing

**Files:** `src/lib/videoEncoder.ts:182-189`

**Plan:**
- In `downloadVideo`, change the fallback `<a>` download path to use `setTimeout(() => { if (a.parentNode) document.body.removeChild(a) }, 100)` instead of synchronous `document.body.removeChild(a)`.
- This gives the browser time to process the download intent before the element is removed.
- Keep the `a.click()` synchronous (required for the download to start).

**Status:** TODO

---

### 2. C5-AGG-004 — MEDIUM — Convert worker `var` to `const`/`let` in `parseSemanticSegments`

**Files:** `public/workers/trackParser.worker.js:116-128`

**Plan:**
- In the worker's `parseSemanticSegments` function, change:
  - `var afterPathLen` → `const afterPathLen` (line 116)
  - `var visit` → `const visit` (line 119)
  - `var m` → `const m` (line 121)
  - `var lat` → `const lat` (line 123)
  - `var lng` → `const lng` (line 124)
- Verify the worker still passes all parsing tests (no scoping behavior change expected).

**Status:** TODO

---

### 3. C5-AGG-005 — LOW — Normalize worker boundary-check style to match main-thread parser

**Files:** `public/workers/trackParser.worker.js:125`

**Plan:**
- Change the worker's visit coordinate check from `Math.abs(lat) <= 90 && Math.abs(lng) <= 180` to the same pattern as the main-thread: remove the `<=` whitelist and instead use the `> 90` / `> 180` blacklist guard that `pushE7` already applies.
- Since `pushE7` already validates coordinates, and the direct `out.push` in the worker's visit block also validates, the simplest fix is to change the `<=` check in line 125 to match the `> 90` / `> 180` style of `parser.ts:305`.
- Specifically: change `if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180)` to `if (lat != null && lng != null && !(Math.abs(lat) > 90 || Math.abs(lng) > 180))` or equivalently keep `Math.abs(lat) <= 90 && Math.abs(lng) <= 180` (semantically identical) but add a comment noting parity with main-thread.

**Decision:** Add a comment noting the parity with `parser.ts` since both styles are semantically equivalent. The `<=` style in the worker is actually clearer. No code change needed — just a comment for maintainer clarity.

**Status:** TODO

---

### 4. C5-AGG-002 — LOW — Accept optional `cumulDist` parameter in `exportVideo`

**Files:** `src/lib/videoEncoder.ts:65`, `src/lib/useExportController.ts`

**Plan:**
- Add an optional `cumulDist?: number[]` parameter to the `exportVideo` function signature.
- On line 65, change `const cumulDist = computeCumulativeDistances(...)` to `const cumulDist = cumulDistParam ?? computeCumulativeDistances(track.points, track.segmentStartIndices)`.
- In `useExportController.ts`, pass the `cumulativeDistances` to `exportVideo` from the controller context. Since `useExportController` doesn't currently have access to `cumulativeDistances`, add it as a parameter to the hook options.
- In `page.tsx`, pass `cumulativeDistances` to `useExportController`.

**Status:** TODO

---

### 5. C5-AGG-003 — LOW — Guard `NaN`/`Infinity` in `formatDuration`

**Files:** `src/lib/interpolate.ts:179`

**Plan:**
- Change `if (seconds < 0) seconds = 0` to `if (!Number.isFinite(seconds) || seconds < 0) seconds = 0`.

**Status:** TODO

---

### 6. C5-AGG-006 — LOW — Improve JourneyCreator search error message clarity

**Files:** `src/components/JourneyCreator.tsx:457`, `src/lib/i18n.ts`

**Plan:**
- Add a new i18n key `journey.searchCoordOnly` with a clearer message like "Enter coordinates (e.g., 35.6762, 139.6503) or a geo: URI".
- In `runSearch`, when `parseCoordinateQuery` returns null and the query is long enough, show the new message instead of `journey.searchInvalid`.
- Keep `journey.searchInvalid` for truly malformed input (empty after trim, etc.).
- Actually, reviewing the code more carefully: `searchInvalid` is shown when `parseCoordinateQuery` returns null, meaning the input didn't match any coordinate pattern. The simplest fix is to update the `journey.searchInvalid` message text itself to be more specific.

**Status:** TODO

---

### 7. C5-AGG-007 — LOW — Fix Controls `totalDistance` memo dependency

**Files:** `src/components/Controls.tsx:42`

**Plan:**
- Change `useMemo(() => totalDistance(track.points, track.segmentStartIndices), [track])` to use more granular dependencies: `useMemo(() => totalDistance(track.points, track.segmentStartIndices), [track.points, track.segmentStartIndices])`.
- This avoids recomputation when the `track` object reference changes but the points data is the same.

**Status:** TODO

---

### 8. C5-AGG-008 — LOW — Fix reduced-motion spinner appearance

**Files:** `src/app/globals.css`, `src/app/page.tsx:319`, `src/components/FileUpload.tsx:152`

**Plan:**
- In `globals.css`, within the `@media (prefers-reduced-motion: reduce)` block, add a rule that replaces the spinner with a static indicator.
- Specifically, add a class like `.animate-spin` override that sets it to a static circle (full border, no transparent edge) and optionally shows a "Loading..." text alternative.
- The simplest approach: in the reduced-motion media query, set `.animate-spin` to `animation: none` and override the border to be a full circle.

**Status:** TODO

---

## Quality gates
- `eslint` — must pass
- `tsc --noEmit` — must pass
- `next build` — must pass

## Deferred findings (not scheduled this cycle)

### DF-C5-001 — TrackToolbar mobile menu focus trapping
- **Source finding:** C5-012
- **Original severity / confidence:** LOW / MEDIUM
- **File citations:** `src/components/TrackToolbar.tsx:135-220`
- **Reason for deferral:** Focus trapping in a dropdown menu is an a11y enhancement beyond current scope. The menu already has `aria-expanded` and closes on outside click/Escape.
- **Exit criterion:** Re-open in an a11y-focused cycle that also addresses DF-C1-001 and DF-C2-001 mobile IA issues.

### DF-C5-002 — MapView animation effect stable callback dependencies (latent risk)
- **Source finding:** C5-004
- **Original severity / confidence:** LOW / MEDIUM
- **File citations:** `src/components/MapView.tsx:922`
- **Reason for deferral:** `addTrackLayers` and `ensureMarker` are currently stable `useCallback([])`. The latent risk is that a future refactor adds dependencies to these callbacks, which would cause the animation effect to re-run on every frame. Not a current bug.
- **Exit criterion:** Re-open if either callback gains a dependency, or during a MapView refactor cycle.

All prior deferred items (DF-C1-*, DF-C2-*, DF-C4-001) remain deferred per their existing exit criteria.
