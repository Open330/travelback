# Cycle 10 Implementation Plan — 2026-04-27

## Review Summary

Deep review across 11 agents. **10 new findings** after dedup (3 LOW-MEDIUM, 7 LOW).
All prior cycle fixes (C9-F01 through C9-F04) confirmed still applied.

See `.context/reviews/_aggregate.md` and `.context/reviews/cycle10-*-2026-04-27.md`.

## Cycle 9 Plan Status

| Task | Status |
|------|--------|
| C9-TASK-1: Rename `matchedKey` to `matchedCode` and simplify FileUpload error flow | COMPLETED |

## Findings Disposition

### Scheduled for Implementation

| ID | Severity | Description | Agents |
|----|----------|-------------|--------|
| C10-F01 | LOW-MEDIUM | `handleLoadSample` closes over `t` directly | CR, CT, TR, ARCH |
| C10-F02 | LOW | Duplicated track-slicing logic | CR, CT, TR, ARCH |
| C10-F03 | LOW | Degenerate GeoJSON fallback in buildTrackGeometry | CR, DBG |
| C10-F04 | LOW-MEDIUM | Export progress throttle uses absolute delta | P |
| C10-F05 | LOW | Export progress bar aria-valuenow not clamped | V, DBG |

### Deferred

| ID | Severity | Reason |
|----|----------|--------|
| C10-F06 | LOW-MEDIUM | Antimeridian unit tests — test coverage gap, not a code defect; requires new test fixtures |
| C10-F07 | LOW | Segment-remapping unit tests — depends on C10-F02 (extract buildFilteredTrack); test-first approach |
| C10-F08 | LOW | Export panel swipe affordance — UX enhancement, no functional impact |
| C10-F09 | LOW | FileUpload drop zone tabIndex — minor a11y, keyboard users have browse button |
| C10-F10 | LOW | Cumulative distance recomputation for trimmed tracks — performance optimization, minor impact |

Deferred item details:

- **C10-F06** (antimeridian tests): Requires constructing test fixtures for tracks crossing +-180 longitude. Test infrastructure work, not a code defect. Exit criterion: re-open when adding interpolation/camera test coverage or when antimeridian handling is refactored.
- **C10-F07** (segment-remapping tests): Depends on C10-F02 extracting `buildFilteredTrack`. Once extracted, unit tests should be added. Exit criterion: re-open after C10-F02 is implemented to add the tests.
- **C10-F08** (swipe affordance): Minor UX enhancement with no functional impact. Exit criterion: re-open during mobile UX polish.
- **C10-F09** (drop zone tabIndex): Minor a11y issue; keyboard users have the browse button as the accessible path. Exit criterion: re-open during accessibility audit.
- **C10-F10** (cumulative distance recomputation): Performance optimization with minor practical impact. Exit criterion: re-open if trimming large tracks becomes noticeably slow.

## Active Implementation Items

### C10-TASK-1: Use tRef in handleLoadSample (C10-F01) — COMPLETED

- **Commit:** b35dbec

### C10-TASK-2: Extract buildFilteredTrack and deduplicate trim logic (C10-F02) — COMPLETED

- **Commit:** b35dbec

### C10-TASK-3: Fix degenerate GeoJSON fallback in buildTrackGeometry (C10-F03) — COMPLETED

- **Commit:** 9a943f3

### C10-TASK-4: Replace absolute-delta export progress throttle with time-based (C10-F04) — COMPLETED

- **Commit:** 037e47e

### C10-TASK-5: Clamp export progress bar aria-valuenow (C10-F05) — COMPLETED

- **Commit:** 7107579

## Deferred Items

### New Deferred Findings

See table above for C10-F06 through C10-F10.

### Previously Deferred (Carried Forward)

All items from cycle 9 plan carried forward unchanged:
DF-C1-001 through DF-C1-002, DF-C2-001 through DF-C2-010, DF-C3-001 through
DF-C3-006, DF-C4-001 through DF-C4-017, DF-C7-001, R4-AGG-D1 through
R4-AGG-D13, R5-AGG-D14 through R5-AGG-D17, R6-AGG-D18 through
R6-AGG-D20, R7-AGG-D21, R7-AGG-D22, C9-AGG-D23.
