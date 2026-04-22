# Architect — Cycle 5 (2026-04-23)

## Methodology
Reviewed the system architecture for coupling, layering, separation of concerns, and design risks. Evaluated component boundaries, state management patterns, and data flow.

## New Findings

### C5-A1. HomeInner component still 450+ lines despite TrackWorkspace extraction
- **Severity**: MEDIUM | **Confidence**: HIGH (already deferred as DF-C17-006)
- **File**: `src/app/page.tsx:32-449`
- **Issue**: HomeInner still contains ~420 lines with 20+ state variables and 20+ callback handlers. The TrackWorkspace extraction helped but the page component still orchestrates all the high-level state. This is a structural concern, not a bug.
- **Status**: Already deferred as DF-C17-006.

### C5-A2. Duplicate longitude wrapping logic across modules
- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/lib/interpolate.ts:5-6`, `src/lib/camera.ts` (multiple), `src/components/MapView.tsx:61-63`
- **Issue**: The functions `normalizeLng`, `shortestLngDelta`, and `shortestLongitudeDelta` are reimplemented across three files. `interpolate.ts` exports `normalizeLng` and `shortestLngDelta`, but `MapView.tsx` and `camera.ts` have their own local copies with slightly different names (`shortestLongitudeDelta` in MapView). The logic is identical but the duplication risks divergence if one is updated without the others.
- **Fix**: Import from `interpolate.ts` in `camera.ts` and `MapView.tsx` instead of duplicating.
- **Impact**: Maintenance risk — if the wrapping algorithm needs updating (e.g., for edge cases near antimeridian), all three copies must be found and updated.

## Architectural Summary
- Clean separation between parser (lib), camera/interpolation (lib), and UI (components)
- Worker offloading for heavy JSON parsing is well-designed
- State management is centralized in HomeInner with prop drilling — acceptable for this app's size
- The TrackWorkspace extraction reduced HomeInner complexity
- Export controller properly separates concerns (state management vs encoding logic)
- i18n architecture is solid — context provider pattern with type-safe keys
- The scene system (camera.ts) has clean separation between computation and rendering

## Previously Deferred (Carried Forward)
- DF-C17-006: HomeInner 440-line god component
