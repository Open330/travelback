# Cycle 20 Comprehensive Code Review — 2026-04-28

**Reviewer:** Comprehensive multi-perspective review (code quality, performance, security, architecture, testing, UI/UX)
**Scope:** All 37 source files (~10K lines), 19 carried findings from 19 prior aggregate reviews
**Methodology:** Full file-by-file review with cross-file interaction analysis

## Carried Findings Verification

All 19 carried findings from `_aggregate.md` verified against current source:

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| N01 | HIGH | Per-frame trail geometry rebuild during playback | PARTIALLY RESOLVED — shared builder extracted (buildTrailGeoJSONFromSegments) |
| N02 | HIGH | No unit test layer for pure functions | STILL OPEN — only camera.test.ts, interpolate.test.ts, env.test.ts, parser.test.ts, videoEncoder.test.ts exist |
| N03 | HIGH | E2E export success path exercises only stub | STILL OPEN |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main | STILL OPEN |
| N10 | MEDIUM | Scene normalization mutates user intent | PARTIALLY RESOLVED — deferred normalization with warnings |
| N11 | MEDIUM | Map layer ownership split across components | STILL OPEN |
| N12 | MEDIUM | Track session state spread across 15+ atoms | STILL OPEN |
| N14 | MEDIUM | Export memory guard underestimates 4K peak | STILL OPEN |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal | PARTIALLY RESOLVED — focus trap added |
| C13-F03 | LOW | iOS Safari download fallback | STILL OPEN |
| C13-F05 | LOW | Timeline click-to-seek on selected region | STILL OPEN — documented as deferred with exit criterion |
| C15-F06 | LOW | MapView addTrackLayers called from multiple paths | STILL OPEN — idempotent, no functional impact |
| C15-F07 | INFO | ElevationProfile SVG stroke inconsistency | STILL OPEN — cosmetic |
| C18-F01 | LOW | generateId() in types.ts violates SRP | RESOLVED (cycle 18) |
| C18-F03 | MEDIUM | Trail geometry duplication | RESOLVED (cycle 18) |
| C18-F04 | LOW | Export progress transition timing | RESOLVED (cycle 18) |
| C19-F01 | LOW | Module-level fallback anchor state in videoEncoder | RESOLVED — documented with comment |
| C19-F02 | LOW | normalizeLng returns NaN for Infinity inputs | RESOLVED (cycle 19) |
| C19-F05 | LOW | checkJsonDepth full-file character scan | RESOLVED (cycle 19) |

## New Findings

### C20-F01: SceneEditor undo timer not cleaned up on unmount
- **File:** `src/components/SceneEditor.tsx:344-350`
- **Severity:** LOW
- **Confidence:** HIGH
- **Description:** The `useEffect` for auto-clearing undo stores a timer ID in `undoTimerRef` and returns a cleanup function. However, the cleanup function checks `if (undoTimerRef.current)` before clearing, which is correct. But if the component unmounts while the timer is still active (e.g., rapid scene editor open/close), the timer fires and calls `setDeletedScene(null)` on an unmounted component. React 18+ handles this gracefully (no-ops on unmounted state updates), so this is not a runtime error but is technically incorrect state management.
- **Fix:** The cleanup is already correct for React 19 (React silently ignores setState on unmounted components). No code change needed. Document as a known benign pattern.

### C20-F02: potentialRoundingErrorInCheckJsonDepth
- **File:** `src/lib/parser.ts:523`
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Description:** `checkJsonDepth` uses `Math.min(text.length, MAX_DEPTH_SCAN_CHARS)` to cap the scan. For files exactly at the boundary (10MB), the scan processes all characters. For a file that starts with deeply nested JSON in the first 10MB and then flattens out, the guard correctly catches it. For a file that is flat in the first 10MB and deeply nested after, the guard would miss it. However, the main-thread path uses `JSON.parse` which throws `RangeError` on excessive nesting, and the worker path calls `checkJsonDepth` as a pre-flight before `JSON.parse`. So the worst case is that the worker's `JSON.parse` still throws a `RangeError` and crashes the worker, which is handled by the fallback path (for small files) or rejected (for large files). The existing comment at line 512-517 documents this design tradeoff clearly.
- **Fix:** No code change needed. The existing defense-in-depth is adequate.

### C20-F03: MapView useEffect depends on cumulativeDistancesProp but reads from ref
- **File:** `src/components/MapView.tsx:1062`
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Description:** The track-loading `useEffect` at line 1002 lists `cumulativeDistancesProp` in its dependency array and assigns it to `cumulDistRef.current`. However, the animation `useEffect` at line 1071 reads from `cumulDistRef.current` but also lists `cumulativeDistancesProp` in its deps. This means both effects re-run when `cumulativeDistancesProp` changes. The track-loading effect unnecessarily re-runs (idempotent, but wasteful), and the animation effect correctly re-runs. This is a minor efficiency issue, not a bug.
- **Fix:** Consider removing `cumulativeDistancesProp` from the track-loading effect's deps and using a separate ref-sync effect. Low priority.

### C20-F04: HomeInner component renders 15+ useState hooks — potential performance concern
- **File:** `src/app/page.tsx:86-136`
- **Severity:** LOW
- **Confidence:** HIGH
- **Description:** This is a variant of the existing N12 finding (track session state spread across 15+ atoms). Each `useState` call that changes triggers a re-render of the entire `HomeInner` component, which includes the MapView (heavy), all panels, and the file upload area. React 19's compiler may help, but the current code has no memoization barrier between state changes and the heavy MapView component.
- **Fix:** This is already tracked as N12. No new action needed.

### C20-F05: ExportPanel initial duration sync only happens once on panel open
- **File:** `src/components/ExportPanel.tsx:74-85`
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Description:** The `panelOpenedRef` pattern ensures `setDuration(playbackDuration)` only fires on the first panel open. If the user opens the export panel, changes duration, closes it, then the playback duration changes externally (e.g., via hotkey), reopening the panel will not sync to the new playback duration because `panelOpenedRef.current` was reset to `false` when the panel closed, but the condition `!panelOpenedRef.current && playbackDuration != null` only fires on the transition to `isOpen=true` once. Actually, re-reading the code: when `isOpen` goes false, `panelOpenedRef.current = false`, so on the next open the condition fires again. This is actually correct behavior. No issue.
- **Fix:** No issue found. False alarm.

### C20-F06: usePlaybackController speed/duration change mid-playback resets progress anchor
- **File:** `src/lib/usePlaybackController.ts:43-49`
- **Severity:** LOW
- **Confidence:** HIGH
- **Description:** When `speed` or `duration` changes while playing, the effect resets `startTimestampRef` and `startProgressRef`. This is correct behavior — it ensures the animation continues from the current progress with the new speed/duration. However, there's a subtle issue: the `awaitingFirstFrameRef.current = false` is set, which means the next frame will NOT wait for a first-frame timestamp. If `speed` or `duration` changes via state update, the next `animate` call will compute elapsed from the new `startTimestampRef.current` (set to `performance.now()` in this effect). But this effect runs asynchronously (after render), so there's a tiny gap where `startTimestampRef` is updated but `startProgressRef` may not yet reflect the latest rendered progress. In practice, this gap is sub-millisecond and never observable.
- **Fix:** No code change needed. The existing behavior is correct and the theoretical gap is imperceptible.

## Non-Findings (verified as correct)

The following areas were examined and found to be correctly implemented:

1. **Worker fallback chain** (parser.ts): The fallback buffer logic is correct — small files get a copy, large files don't, and the worker creation failure path handles both cases.

2. **Export abort/cleanup** (useExportController.ts): The `finally` block correctly resets map size, handles unmounted state, and aborts cleanly. The `mountedRef` pattern prevents setState on unmounted components.

3. **ModalDialog stacking** (ModalDialog.tsx): The module-level stack correctly manages body overflow and inert attributes across nested modals. The HMR comment documents the edge case.

4. **Trail geometry deduplication** (MapView.tsx): The `buildTrailGeoJSONFromSegments` shared function is correctly used by both the export path and the playback path.

5. **normalizeLng guard** (interpolate.ts): The `Number.isFinite` guard added in cycle 19 correctly handles Infinity, NaN, and undefined inputs.

6. **checkJsonDepth scan limit** (parser.ts): The `MAX_DEPTH_SCAN_CHARS` cap at 10MB is correctly implemented with the documented tradeoff.

## Summary

This review found **0 actionable new issues** requiring code changes. All 6 items examined are either:
- Already tracked as existing findings (C20-F04 = N12 variant)
- Correct by design with adequate documentation (C20-F01, C20-F02, C20-F06)
- Minor efficiency concerns that don't justify code churn (C20-F03)
- False alarms upon closer inspection (C20-F05)

The codebase is in good shape following 19 prior review cycles. The remaining 12 open carried findings are all architectural/infrastructure improvements appropriately deferred pending significant effort investment.

## New Findings Count

| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 actionable (6 examined, 0 requiring changes) |
| **Total new** | **0** |
