# Cycle 11 Implementation Plan — 2026-04-19

Derived from `.context/reviews/_aggregate.md` (cycle 11).

## Active findings to address this cycle

### 1. C11-AGG-001 — MEDIUM — ExportPanel duration input hard-codes limits and resets to 30 on empty input

**Files:** `src/components/ExportPanel.tsx:270-277`

**Plan:**
- Replace hard-coded `5`/`600` with `EXPORT_LIMITS.duration.min`/`EXPORT_LIMITS.duration.max` in the input `min`/`max` attributes and `onChange` clamp.
- Handle `NaN` from empty input by keeping the previous `duration` value instead of defaulting to `30`.
- The `parseInt` call should be: `const parsed = parseInt(e.target.value); setDuration(Number.isFinite(parsed) ? Math.max(EXPORT_LIMITS.duration.min, Math.min(EXPORT_LIMITS.duration.max, parsed)) : duration)`

**Status:** TODO

---

### 2. C11-AGG-002 — MEDIUM — exportVideo frame loop missing abort check after renderFrame

**Files:** `src/lib/videoEncoder.ts:93-126`

**Plan:**
- After `await renderFrame(progress, cameraState)` on line 107, add:
  ```ts
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError')
  }
  ```
- This ensures that if abort happens during the synchronous renderFrame call, we exit immediately rather than continuing to waitForIdle and the frame capture.

**Status:** TODO

---

### 3. C11-AGG-003 — MEDIUM — downloadVideo fallback returns saved:true but download may not complete

**Files:** `src/lib/videoEncoder.ts:183-194`, `src/components/ExportPanel.tsx:208`

**Plan:**
- In ExportPanel.tsx line 208, change the success message when `downloadMethod === 'fallback'`:
  - Currently: `downloadMethod === 'picker' ? t('export.videoSaved') : t('export.savedToDownloads')`
  - Change to: `downloadMethod === 'picker' ? t('export.videoSaved') : t('export.downloadStarted')`
- Add a new i18n key `export.downloadStarted` in `src/lib/i18n.ts` for all locales with text like "Download started" (more honest than "saved to Downloads" since we can't confirm the save).
- Keep `saved: true` in the return value since the download was initiated (not confirmed).

**Status:** TODO

---

### 4. C11-AGG-004 — LOW — SceneRangeEditor keyboard navigation missing Home/End keys

**Files:** `src/components/SceneEditor.tsx:183-204`

**Plan:**
- In the `onKeyDown` handler for the SceneRangeEditor sliders, add cases for `Home` and `End`:
  - Home key on start handle: set startPercent to 0
  - End key on start handle: set startPercent to `endPercent - MIN_SCENE_SPAN`
  - Home key on end handle: set endPercent to `startPercent + MIN_SCENE_SPAN`
  - End key on end handle: set endPercent to 1
- Use `onChangeRef.current` to update, same as existing arrow key handlers.

**Status:** TODO

---

### 5. C11-AGG-005 — LOW — Toast returns null when messages empty, removing live region from DOM

**Files:** `src/components/Toast.tsx:63-66`

**Plan:**
- Remove the early return `if (messages.length === 0) return null`
- Always render the container `div` with `role="log" aria-live="polite"`
- The `{messages.map(...)}` will naturally render nothing when the array is empty
- This keeps the live region stable in the accessibility tree so screen readers can properly detect additions and removals

**Status:** TODO

---

### 6. C11-AGG-006 — LOW — TimelineSelector resolveRangeIndexes called on every render outside memo

**Files:** `src/components/TimelineSelector.tsx:245`

**Plan:**
- Wrap the `resolveRangeIndexes()` call at line 245 in `useMemo`:
  ```ts
  const { startIdx, endIdx } = useMemo(
    () => resolveRangeIndexes(),
    [startRatio, endRatio, cumulativeDistances]
  )
  ```
- Since `resolveRangeIndexes` is a `useCallback` that depends on `endRatio`, `points.length`, `startRatio`, and `cumulDist`, the memo deps should be `[startRatio, endRatio, cumulativeDistances]` (points.length is derived from track prop which changes infrequently).
- Actually, since `resolveRangeIndexes` is itself a `useCallback`, we should use it as a dep too. But simpler: just memo the result with the same effective deps.

**Status:** TODO

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
- DF-C5-001: TrackToolbar mobile menu focus trapping

New deferrals this cycle:
- C11-007 (LOW): ElevationProfile RTL click handling — exit criterion: re-open when RTL support is explicitly scoped
- C11-009 (LOW): Controls elapsed floating point wobble — exit criterion: re-open if user reports visible display glitch
- C11-005 (LOW): TrackWorkspace title overlap with scene editor — exit criterion: re-open during next layout polish pass
