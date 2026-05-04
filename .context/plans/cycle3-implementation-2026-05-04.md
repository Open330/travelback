# Cycle 3 Implementation Plan — 2026-05-04

Based on cycle 3 aggregate review at `.context/reviews/_aggregate.md`.
New findings this cycle: 2 MEDIUM, 7 LOW. All quality gates pass clean.
Cycle 2 plan items (P01-P04) all completed.

---

## Phase 1 — Quick fixes (trivial/small)

### P05 — Fix missing referenceGridData dependency in style-change effect (C3-F3)

- **Severity**: Low | **Confidence**: Medium
- **File**: `src/components/MapView.tsx:857-880`
- **Issue**: Style-change effect reads `referenceGridData` from closure but depends only on `[mapStyleKey]`.
- **Fix**: Add `referenceGridData` to the dependency array. It's already memoized so no performance impact.
- **Effort**: Trivial
- **Status**: TODO

### P06 — Consolidate duplicated camera smoothing (C3-F2)

- **Severity**: Low | **Confidence**: High
- **Files**: `src/components/MapView.tsx:66-93` vs `src/lib/camera.ts:120-138`
- **Issue**: `smoothCameraState()` duplicates `lerpCamera()` without smoothstep easing, causing inconsistent smoothing.
- **Fix**: Add an optional `easingFn` parameter to `lerpCamera` (defaulting to smoothstep) or create a `lerpCameraLinear` variant. Replace `smoothCameraState` in MapView with the shared function.
- **Effort**: Small
- **Status**: TODO

### P07 — Optimize playback fallback timer (C3-P1)

- **Severity**: Low | **Confidence**: Medium
- **File**: `src/lib/usePlaybackController.ts:115`
- **Issue**: Fallback setTimeout(250) runs alongside every rAF even in foreground.
- **Fix**: Only schedule the fallback timer when `document.visibilityState === 'hidden'`.
- **Effort**: Small
- **Status**: TODO

### P08 — Add tests for interpolate degenerate inputs (C3-TE2)

- **Severity**: Low | **Confidence**: Medium
- **File**: `src/lib/interpolate.test.ts`
- **Issue**: 0-point, 1-point, and zero-total-distance guard paths in `interpolateAlongTrack` are untested.
- **Fix**: Add 3 tests: empty points array, single point array, all-same-point array.
- **Effort**: Small
- **Status**: TODO

---

## Phase 2 — Deferred findings cleanup

### P09 — Clean up stale deferred findings (C3-C1)

- **Severity**: Medium | **Confidence**: High
- **Files**: `.context/plans/deferred-findings-*.md`
- **Issue**: Multiple findings carried forward without re-validation. N10 (scene normalization mutation) was corrected — does NOT mutate originals. N01 (per-frame trail rebuild) addressed by precomputed segments.
- **Fix**: Archive stale findings. Update N10 and N01 status.
- **Effort**: Small
- **Status**: TODO

---

## Deferred findings (carried forward with exit criteria)

### C3-F1. MapView.tsx monolith (1214 lines, 7+ concerns)
- **Severity**: Medium | **Confidence**: High
- **Reason**: Large refactor requiring extraction of ~300 lines of pure functions to src/lib/, followed by test creation. Too large for a single cycle.
- **Exit criterion**: When a cycle has capacity for a large refactor, or when a change to MapView causes merge conflicts that would have been avoided with extraction.
- **Repo rule**: No specific rule preventing deferral. This is a maintainability concern, not a correctness or security issue.

### C3-F4. exportVideo does not explicitly clean up Output on abort
- **Severity**: Low | **Confidence**: Medium
- **Reason**: Requires investigation of mediabunny's cleanup behavior. The Output object may self-clean on GC. Low impact since exports are infrequent.
- **Exit criterion**: If mediabunny adds an explicit cancel/cleanup API, or if memory leak is observed during export cancel.

### C3-DS1. Architecture doc stale (already P17)
- Carried as P17 from cycle 2. No change.

### Previously deferred items (from cycles 1-2)
All items from `.context/plans/cycle1-implementation-2026-04-27-r2.md` carry forward unchanged:
- N04 Google parser worker/main dedup (Large)
- N11 Map layer ownership boundaries (Large)
- N12 Session state coupling (Medium)
- N17 Mobile toolbar dialog not modal (Medium)
- N23 RTL unreadiness (no RTL locales)
- N30-N33 Various (infrastructure-dependent)
- C13-F03 iOS Safari download fallback (Small)
- C15-F03 ErrorBoundary no error details in dev (Small)
- C15-F06 addTrackLayers called from multiple effects (Small)
- C15-F07 ElevationProfile SVG stroke width (Trivial)

**CORRECTIONS**:
- N01 (Per-frame trail rebuild): ADDRESSED by precomputeWrappedSegments. Archive.
- N10 (Scene normalization mutates intent): CORRECTED — does NOT mutate originals. Still a valid product-level concern (visual reordering) but not a code bug. Update description.

---

## Quality gates

After each commit:
- `npm run lint` — must pass
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npm run test` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji

---

## Completion Status (updated after implementation)

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| P05 — Missing referenceGridData dep | DONE | | Added referenceGridData to dependency array |
| P06 — Consolidate camera smoothing | DONE | | lerpCamera now accepts easingFn + bearingFactor; MapView delegates to it |
| P07 — Optimize playback fallback timer | DONE | | Only schedule setTimeout when document.hidden |
| P08 — Interpolate degenerate input tests | ALREADY DONE | | Tests existed in interpolate.test.ts (lines 141-151, 499-504) |
| P09 — Clean up stale deferred findings | DONE | | N01 archived, N10 corrected |
