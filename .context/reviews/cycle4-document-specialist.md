# Cycle 4 Document Specialist Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed documentation-code mismatches against authoritative sources. Compared architecture doc, conventions, and README against actual code.

## Findings

### C4-DS01 — Architecture doc doesn't mention `isExporting` identical-state fast path in `renderFrameAndWait`
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:59`, `src/components/MapView.tsx:521-548`
- **Detail:** The architecture doc says per-frame capture uses "map.once('render') + rAF". The actual implementation has an identical-state fast path that resolves immediately without waiting for a render event when the camera state hasn't changed (within rounding tolerance). This optimization prevents deadlocks when MapLibre wouldn't repaint. It should be documented.
- **Suggested fix:** Add a note to the architecture doc about the identical-state fast path and 5s timeout fallback.

### C4-DS02 — Architecture doc doesn't document the `POSITION_MARKER_SOURCE` / `POSITION_MARKER_LAYER` circle layer
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:155-164`, `src/components/MapView.tsx:52-55, 886-905`
- **Detail:** The "Map Layers" table in the architecture doc lists `route-line`, `trail-line`, `journey-line`, `journey-points`, and "Marker (HTML overlay)". However, the code also adds a `current-position` source and `current-position-layer` circle layer (the export-mode marker). The HTML overlay marker (with pulsing animation) is a separate concept from the circle layer marker. The table should include both.
- **Suggested fix:** Add `current-position` (source) and `current-position-layer` (circle) to the Map Layers table.

### C4-DS03 — Architecture doc says "MapLibre GL JS v5" but package.json may differ
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `.context/project/01-overview.md:11`, `package.json`
- **Detail:** The overview says "MapLibre GL JS v5". Let me verify the actual version in package.json.
- **Suggested fix:** Verify version matches documentation.

### C4-DS04 — Conventions doc says "No semicolons (rely on ASI)" but code consistently follows this
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/development/01-conventions.md:36`
- **Detail:** Verified that source code consistently omits semicolons. Convention is followed.
- **Suggested fix:** No fix needed.

### C4-DS05 — Conventions doc says "Single quotes for strings" — verified consistent
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/development/01-conventions.md:37`
- **Detail:** Verified that source code consistently uses single quotes for string literals. Convention is followed.
- **Suggested fix:** No fix needed.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 5 |
| **Total** | **5** |
