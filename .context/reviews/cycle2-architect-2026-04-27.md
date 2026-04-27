# Architect — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N01 (trail O(n) rebuild) | PARTIALLY RESOLVED | Precomputed segments are a good intermediate step. Full resolution requires MapLibre `line-gradient` + feature-state or segment-level source updates. |
| N04 (duplicated Google parser) | UNCHANGED | Worker and main-thread paths remain separate. Architectural debt persists. |
| N05 (export React entanglement) | RESOLVED | `isExporting` prop cleanly separates export camera path from React-driven playback path. |
| N10 (scene normalization) | UNCHANGED | No raw/authored scene separation. |
| N11 (map layer ownership) | UNCHANGED | MapView, JourneyCreator, and export controller still independently mutate the same MapLibre instance. |
| N12 (session state coupling) | UNCHANGED | 12+ independent state atoms in page.tsx. |

## New findings

### ARCH2-01 — `isExporting` prop creates an implicit contract between useExportController and MapView

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:25,454,1000`, `src/app/page.tsx`
- **Detail:** The `isExporting` boolean prop is the sole mechanism for suppressing React-driven side effects during export. If a future developer adds a new `useEffect` to MapView that updates map state, they must remember to add the `isExporting` guard. There's no type-level or lint-level enforcement of this contract.
- **Suggested fix:** Consider a MapView internal state machine (`idle` | `playback` | `export`) that gates effect execution, rather than scattering `if (isExporting) return` checks.

### ARCH2-02 — Precomputed segments ref and cumulativeDistances ref have independent lifecycle

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:463-464,943-944`
- **Detail:** `cumulDistRef` and `precomputedSegmentsRef` are populated in the same `useEffect` (lines 943-944), but they're consumed separately — `cumulDistRef` in the progress effect and `precomputedSegmentsRef` also in the progress effect. If a future change updates one but not the other, they could get out of sync. Currently this is safe because both are set from the same `track` and `cumulativeDistancesProp` values.
- **Impact:** Low — both are set atomically in the same effect.

### ARCH2-03 — Trail geometry update strategy is split between precomputed-segment path and buildTrackGeometry fallback

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:1019-1076`
- **Detail:** The progress effect has two code paths for trail updates: the precomputed-segment path (lines 1019-1069) and the `buildTrackGeometry` fallback (lines 1070-1076). The fallback exists for when `precomputedSegmentsRef.current` is empty. These two paths must produce identical visual results, but they're implemented differently (one uses precomputed coordinates, the other re-wraps on the fly). There's no test verifying visual parity.
- **Impact:** Low — both paths produce the same visual result in practice, but the split adds maintenance burden.

## Summary

- Carried forward: 6 findings evaluated (1 resolved, 1 partially resolved, 4 unchanged)
- New findings: 3 (1 MEDIUM, 2 LOW)
