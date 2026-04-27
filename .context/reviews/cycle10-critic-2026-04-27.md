# Cycle 10 Critic Review — 2026-04-27

## Review Scope
Multi-perspective critique of the whole change surface and existing code quality.

## Findings

### C10-CT-01 — LOW-MEDIUM — `handleLoadSample` is the last callback still depending on `t` directly

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:369-392`
- **Detail:** After C8-F02 and C9-F04 systematically replaced `t` with `tRef` in `useExportController` and `loadTrackIntoSession`, `handleLoadSample` remains the one callback in `page.tsx` that closes over `t` directly. This causes unnecessary re-creation on locale changes, and is inconsistent with the established pattern.
- **Agreement:** code-reviewer (C10-CR-01)
- **Fix:** Use `tRef.current('app.sampleLoadFailed')` and remove `t` from deps.

### C10-CT-02 — LOW — Duplicated track-slicing logic between `handleRangeChange` and `confirmTrimClear`

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:298-330, 332-355`
- **Detail:** The track-slicing, segment-remapping, and filtered-track construction logic is copy-pasted between `handleRangeChange` and `confirmTrimClear`. This is a DRY violation that was acceptable when the logic was simple but is now a maintenance risk.
- **Agreement:** code-reviewer (C10-CR-02)
- **Fix:** Extract shared `buildFilteredTrack(fullTrack, startIdx, endIdx)`.

### C10-CT-03 — LOW — No automated test for the `tRef` pattern

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:114-115`, `src/lib/useExportController.ts:65-66`
- **Detail:** Two cycles have fixed `t`-direct-dependency bugs (C8-F02, C9-F04). There is no unit test verifying that `tRef.current` is read inside callbacks rather than `t`. If a future contributor adds a new callback with `t` in the closure, the same bug class reappears.
- **Fix:** Consider a lint rule or code-search pattern that flags `t(` inside `useCallback` bodies (excluding `tRef.current(`). Low priority — this is a process/awareness issue rather than a code bug.

## Summary

| Severity | Count |
|----------|-------|
| LOW-MEDIUM | 1 |
| LOW | 2 |
