# Cycle 11 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle11-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C10 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C11-AGG.

## Prior incorrect findings corrected
- `--err-rgb` IS defined in `:root` at vitro-base.css:30 (cycle-15 review was wrong)
- `--gi-sh` and `--gs-sh` ARE defined in `[data-mode=dark]` at vitro-base.css:276,286 (cycle-15 review was wrong)

## Merged findings (active, to be addressed this cycle)

### C11-AGG-001 — MEDIUM — ExportPanel duration input hard-codes limits and resets to 30 on empty input

**Cross-agent agreement:** cycle11-comprehensive
**Primary locations:**
- `src/components/ExportPanel.tsx:270-277`

**Why it matters:**
The HTML `min`/`max` and `onChange` clamp hard-code `5`/`600` instead of `EXPORT_LIMITS.duration.min`/`max`. More importantly, `parseInt(e.target.value)` returns `NaN` for empty input, and `|| 30` silently resets the field to 30 mid-keystroke when the user clears it to type a new value.

**Suggested fix:**
Use `EXPORT_LIMITS` constants, and handle NaN from empty input by keeping the previous value.

**Confidence:** High

---

### C11-AGG-002 — MEDIUM — exportVideo frame loop does not check abort between renderFrame and waitForIdle

**Cross-agent agreement:** cycle11-comprehensive
**Primary locations:**
- `src/lib/videoEncoder.ts:93-126`

**Why it matters:**
If the user cancels during `renderFrame`, the loop continues through `waitForIdle` (which does check the signal and will reject). But `renderFrame` itself runs synchronously and is not abort-aware, so a cancelled export still applies one more camera state and progress update before the abort is detected.

**Suggested fix:**
Add `if (signal?.aborted) throw new DOMException('Export cancelled', 'AbortError')` after `await renderFrame()`.

**Confidence:** Medium

---

### C11-AGG-003 — MEDIUM — downloadVideo fallback returns saved:true but download may not complete

**Cross-agent agreement:** cycle11-comprehensive, critic.md (prior), debugger.md (prior)
**Primary locations:**
- `src/lib/videoEncoder.ts:183-194`
- `src/components/ExportPanel.tsx:208`

**Why it matters:**
The `<a download>` fallback returns `{ saved: true }` immediately, but browsers (especially Safari < 15.4, mobile WebViews) may silently fail. The UI shows "saved to Downloads" even when no file was saved.

**Suggested fix:**
Change the fallback success message from "Video saved" / "saved to Downloads" to "Download started" when `method === 'fallback'`, since the save cannot be confirmed. Use the existing `downloadMethod` prop that is already tracked.

**Confidence:** High (prior finding carried forward from multiple reviewers)

---

### C11-AGG-004 — LOW — SceneRangeEditor keyboard navigation missing Home/End keys

**Cross-agent agreement:** cycle11-comprehensive
**Primary locations:**
- `src/components/SceneEditor.tsx:183-204`

**Why it matters:**
WCAG 2.1 SC 4.1.2 requires slider widgets to support expected keyboard patterns. Home/End are standard slider key bindings per WAI-ARIA authoring practices.

**Suggested fix:**
Add Home/End key handlers for the SceneRangeEditor slider handles.

**Confidence:** High

---

### C11-AGG-005 — LOW — Toast returns null when messages empty, removing live region from DOM

**Cross-agent agreement:** cycle11-comprehensive
**Primary locations:**
- `src/components/Toast.tsx:63-66`

**Why it matters:**
When the Toast component returns `null`, the live region (`role="log"`) is removed from the DOM. Screen readers that have already announced toasts need the region to persist so they can detect removals. Removing and re-adding the live region can cause inconsistent announcements.

**Suggested fix:**
Always render the container `div` with `role="log" aria-live="polite"`, even when messages is empty.

**Confidence:** Medium

---

### C11-AGG-006 — LOW — TimelineSelector resolveRangeIndexes called on every render outside memo

**Cross-agent agreement:** cycle11-comprehensive
**Primary locations:**
- `src/components/TimelineSelector.tsx:245`

**Why it matters:**
During timeline drag, every pointer move triggers `resolveRangeIndexes()` which does binary search. Wrapping in `useMemo` would avoid unnecessary recomputation.

**Suggested fix:**
Wrap the result in `useMemo` keyed on `[startRatio, endRatio, cumulativeDistances]`.

**Confidence:** Medium

---

## Carried-forward deferred items (not re-opened this cycle)

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

## Recommended implementation order for this cycle

1. **C11-AGG-001 (MEDIUM)**: Fix ExportPanel duration input hard-coded limits and NaN handling
2. **C11-AGG-002 (MEDIUM)**: Add abort check in exportVideo after renderFrame
3. **C11-AGG-003 (MEDIUM)**: Fix fallback download success message
4. **C11-AGG-004 (LOW)**: Add Home/End key handlers in SceneRangeEditor
5. **C11-AGG-005 (LOW)**: Keep Toast live region in DOM when empty
6. **C11-AGG-006 (LOW)**: Memoize resolveRangeIndexes in TimelineSelector
