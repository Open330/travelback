# Critic -- Cycle 7 (2026-04-21)

## Methodology

Multi-perspective critique examining the entire change surface from usability, correctness, maintainability, and design angles.

## Cross-Angle Findings

### C7-CT-1: HomeInner has 20+ useState hooks and 15+ useCallback hooks -- complexity is high but manageable [LOW/LOW]

**File:** src/app/page.tsx:32-437
**Confidence:** LOW

HomeInner has grown to 437 lines with 20+ state variables. This is the "god component" concern noted as DF-C4-001. The component is well-organized with clear section boundaries (state, effects, handlers, JSX), and the extracted hooks (usePlaybackController, useExportController) handle the most complex logic. Further decomposition would add prop-drilling overhead without clear benefit.

**Verdict:** Defer to DF-C4-001. The current structure is acceptable for a single-page client app.

### C7-CT-2: ExportPanel shows "estimated time" that can be misleading for 4K exports [LOW/MEDIUM]

**File:** src/components/ExportPanel.tsx:98-105
**Confidence:** MEDIUM

The estimated time formula is `duration * 0.5 * resScale * codecScale`. For 4K + AV1, this gives `30 * 0.5 * 3.0 * 2.5 = 112.5 seconds`. In practice, 4K AV1 exports can take 5-10 minutes depending on the machine. The estimate is intentionally conservative (0.5x multiplier) but the formula doesn't account for the per-frame idle wait time, which dominates the actual export duration.

**Scenario:** User sees "estimated time: ~2 min" for a 4K AV1 export that actually takes 8 minutes. This sets incorrect expectations.

**Fix:** Could add a "minimum" or "approximately" qualifier to the UI text. The estimate formula itself is acceptable as a rough guide.

### C7-CT-3: Mobile controls bottom sheet may overlap with Toast notifications [LOW/LOW]

**File:** src/components/Toast.tsx:64, src/components/TrackWorkspace.tsx:136-154
**Confidence:** LOW

The Toast container is positioned at `bottom-28 sm:bottom-24 right-4 z-50`, while the Controls component sits at the bottom of the screen. On mobile, the controls area (elevation profile + playback controls) is approximately 160px tall. The toast at `bottom-28` (112px) overlaps with the controls area. The z-50 ensures the toast renders above, but it may partially obscure the playback stats.

**Fix:** LOW priority. The toast auto-dismisses in 5 seconds and is small. Could dynamically adjust the toast position based on whether controls are visible.

## Convergence

No critical or high-severity concerns. The codebase is mature and well-maintained. Remaining issues are UX polish and minor edge cases.
