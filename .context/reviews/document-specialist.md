# Document Specialist — Travelback (2026-05-04, Cycle 2)

## Summary

Architecture documentation is partially stale after cycle 1 changes. One documentation mismatch found.

## Findings

### C2-DOC-01. Architecture doc missing isExporting and renderFrameAndWait details — LOW risk, HIGH confidence
**File**: `.context/project/02-architecture.md`
**Issue**: The Export Pipeline section does not document the `isExporting` prop pattern (which gates the progress-driven useEffect in MapView), the `renderFrameAndWait` method (which replaced direct canvas capture), or the `resetSize` style-first cleanup pattern.
**Suggestion**: Update the architecture doc to reflect these patterns. This was already planned as P17 in the cycle 2 plan.

### C2-DOC-02. Map style JSON external resource verification — LOW risk (unchanged from cycle 1)
**Files**: `public/map-styles/*.json`
**Issue**: The verifier noted that bundled map styles may reference external tile/glyph/sprite URLs. If they do, offline support is broken.
**Suggestion**: Verify all style JSON resources are locally bundled or use data URIs.
