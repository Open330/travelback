# Deferred Findings — Cycle 17 (2026-04-23)

Findings from `_aggregate.md` not scheduled in `cycle17-implementation-2026-04-23.md`.

## DF-C17-001 — normalizeScenes silently drops zero-duration scenes during export
- **Source finding**: F5
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/lib/camera.ts:43`
- **Reason for deferral**: The SceneEditor already shows warnings for zero-duration scenes. Adding export-time warnings requires UX decisions about blocking export vs. soft warnings. The editor-side validation is sufficient for now.
- **Exit criterion**: Re-open when export-blocking UX for invalid scenes is defined.

## DF-C17-002 — Worker fallback path inconsistency
- **Source finding**: F11
- **Severity / Confidence**: MEDIUM / MEDIUM
- **File**: `src/lib/parser.ts:440-515`
- **Reason for deferral**: Changing the fallback strategy requires careful regression testing across worker/main-thread paths. The current behavior (fallback on crash, no fallback on parse error) is defensible: a parse error means the data is genuinely invalid.
- **Exit criterion**: Re-open when a parser reliability pass can test both paths systematically.

## DF-C17-003 — CSP unsafe-inline CI check
- **Source finding**: F12
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/app/layout.tsx:59-63`
- **Reason for deferral**: The harden script exists and works. Adding CI validation is infra work outside the current code-fix scope.
- **Exit criterion**: Re-open when CI pipeline hardening is in scope.

## DF-C17-004 — Video export sequential waitForIdle performance
- **Source finding**: F13
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/lib/videoEncoder.ts:93-133`
- **Reason for deferral**: Changing the waitForIdle timeout or strategy requires careful testing to avoid producing incomplete frames. This is a performance optimization, not a correctness bug.
- **Exit criterion**: Re-open in a dedicated export-performance pass.

## DF-C17-005 — MapView re-renders every progress change
- **Source finding**: F14
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/components/MapView.tsx:822-936`
- **Reason for deferral**: Restructuring MapView to use direct rAF instead of React render cycle is a significant refactor with regression risk.
- **Exit criterion**: Re-open when a dedicated map-performance pass can safely restructure playback state and map animation ownership.

## DF-C17-006 — HomeInner 440-line god component
- **Source finding**: F15
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/app/page.tsx`
- **Reason for deferral**: Extracting custom hooks is a refactor that would touch the main page component extensively. Not a correctness or security issue.
- **Exit criterion**: Re-open when a code-structure pass is explicitly scheduled.

## DF-C17-007 — Missing aria-valuetext on SceneEditor sliders
- **Source finding**: F16
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/components/SceneEditor.tsx`
- **Reason for deferral**: Accessibility improvement that requires reading SceneEditor in detail. Not a correctness blocker.
- **Exit criterion**: Re-open in the next accessibility pass.

## DF-C17-008 — No unit tests
- **Source finding**: F17
- **Severity / Confidence**: HIGH / HIGH
- **Reason for deferral**: Adding unit tests for parser, interpolate, camera, videoEncoder is a large scope expansion. The E2E tests provide regression coverage.
- **Exit criterion**: Re-open when a test-infrastructure pass is scheduled.

## DF-C17-009 — No undo/redo for scene edits
- **Source finding**: F19
- **Severity / Confidence**: MEDIUM / HIGH
- **File**: `src/components/SceneEditor.tsx`
- **Reason for deferral**: Implementing undo/redo is a feature addition, not a bug fix.
- **Exit criterion**: Re-open when scene editor UX enhancements are scheduled.

## DF-C17-010 — CSS custom properties without fallbacks
- **Source finding**: F20
- **Severity / Confidence**: LOW / MEDIUM
- **Reason for deferral**: Adding fallbacks to all inline style var() calls is a broad cosmetic change. The CSS file loading is reliable for this static-export site.
- **Exit criterion**: Re-open when CSS robustness is in scope.

## DF-C17-011 — No granular error boundaries
- **Source finding**: F21
- **Severity / Confidence**: LOW / MEDIUM
- **File**: `src/app/page.tsx`
- **Reason for deferral**: Adding per-component error boundaries is an enhancement, not a bug.
- **Exit criterion**: Re-open when error-resilience improvements are scheduled.

## DF-C17-012 — GoogleGuide tabs not keyboard accessible
- **Source finding**: F22
- **Severity / Confidence**: LOW / HIGH
- **File**: `src/components/GoogleGuide.tsx:289`
- **Reason for deferral**: Arrow-key navigation for tabs is an accessibility enhancement.
- **Exit criterion**: Re-open in the next accessibility pass.

## DF-C17-013 — interpolateAlongTrack edge case at progress=1.0
- **Source finding**: F24
- **Severity / Confidence**: LOW / MEDIUM
- **File**: `src/lib/interpolate.ts:97-103`
- **Reason for deferral**: The binary search already handles this case via the fallback. The behavior difference is negligible in practice.
- **Exit criterion**: Re-open in a math/interpolation correctness pass.

## DF-C17-014 — showSaveFilePicker type casting
- **Source finding**: F25
- **Severity / Confidence**: LOW / HIGH
- **File**: `src/lib/videoEncoder.ts:175-180`
- **Reason for deferral**: Type safety improvement only; the casting works correctly.
- **Exit criterion**: Re-open when video encoder is refactored.

## DF-C17-015 — JourneyCreator totalDistance without segmentStartIndices
- **Source finding**: F26
- **Severity / Confidence**: LOW / HIGH
- **File**: `src/components/JourneyCreator.tsx:141`
- **Reason for deferral**: Functionally correct; intent clarity only.
- **Exit criterion**: Re-open when JourneyCreator is next modified.

## DF-C17-016 — i18n translations bundled inline
- **Source finding**: F27
- **Severity / Confidence**: LOW / HIGH
- **Reason for deferral**: Code-splitting locales is an optimization for a static-export site.
- **Exit criterion**: Re-open when bundle-size optimization is in scope.

## DF-C17-017 — Mobile density on small screens
- **Source finding**: F28
- **Severity / Confidence**: LOW / MEDIUM
- **Reason for deferral**: Layout optimization requiring design decisions.
- **Exit criterion**: Re-open in a mobile-UX pass.

## DF-C17-018 — FileUpload drop zone focus indicator
- **Source finding**: F29
- **Severity / Confidence**: LOW / MEDIUM
- **Reason for deferral**: Minor accessibility enhancement.
- **Exit criterion**: Re-open in the next accessibility pass.

## DF-C17-019 — Export frame count display inaccuracy
- **Source finding**: F30
- **Severity / Confidence**: LOW / MEDIUM
- **Reason for deferral**: Minor display inaccuracy, not a correctness bug.
- **Exit criterion**: Re-open when export panel is next modified.
