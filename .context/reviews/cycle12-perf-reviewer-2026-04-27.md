# Cycle 12 Performance Review — 2026-04-27

Reviewer: perf-reviewer
Scope: CPU/memory/UI responsiveness

## Findings

### C12-P-01 — `setExportProgress` fires on every export frame without throttling

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:214`
- **Detail:** The `onProgress` callback passed to `exportVideo` calls `setExportProgress(nextProgress)` on every frame. For a 30-second, 30 FPS export, this triggers 900 React state updates and re-renders of the `ExportPanel` component. The playback progress was fixed with time-based throttling (100ms interval) in commit 037e47e, but the export progress display was not similarly optimized. Since the ExportPanel is a modal with only a progress bar updating, the re-renders are cheap but unnecessary.
- **Failure scenario:** During a 4K 60 FPS export, 1800 React state updates are triggered just for the progress display. On lower-end devices, this could contribute to jank in the progress bar animation.
- **Suggested fix:** Apply the same time-based throttle pattern (100ms interval) to the `setExportProgress` callback, or consolidate both progress updates into a single throttled effect.

### Verified correct

- Playback progress throttle: Uses `performance.now()` with 100ms interval at `useExportController.ts:207`. Working as intended.
- Trail update optimization: Segment index check skips expensive GeoJSON rebuild when only the marker moves (`MapView.tsx:1085-1087`).
- Precomputed segments: `precomputeWrappedSegments` avoids recomputing wrapped coordinates on every frame (`MapView.tsx:1007`).
- Cumulative distance reuse: Full-track distances are shared when no trimming is applied (`page.tsx:187-188`).
