# Aggregate Review — Travelback (2026-05-04, Cycle 2)

## Overview

12 review agents completed. No agent failures. Findings are predominantly LOW risk with good cross-agent agreement on the codebase's overall quality.

## Deduplicated Findings (ordered by severity/confidence)

### HIGH PRIORITY

#### F1. Export/playback state coupling creates maintenance risk
**Severity**: Medium | **Confidence**: High
**Agents**: code-reviewer, tracer, architect
**Files**: `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`, `src/app/page.tsx`
**Issue**: `useExportController` depends on `pausePlayback` and `setPlaybackProgress` from `usePlaybackController`. This tight coupling means changes to one controller's API can break the other. The progress state lives in `usePlaybackController` but is imperatively driven by `useExportController` during export.
**Suggestion**: Consider a mediator pattern where page.tsx owns progress state and both controllers receive it via options, or use a state machine for the progress source-of-truth.

#### F2. WebGL context loss during export produces blank frames silently
**Severity**: Medium | **Confidence**: Low
**Agents**: debugger
**File**: `src/lib/videoEncoder.ts:162`
**Issue**: If the WebGL context is lost during export (GPU reset, memory pressure), `videoSource.add()` would capture blank frames. There is no `webglcontextlost` event listener on the canvas during export.
**Suggestion**: Add a `webglcontextlost` event listener on the canvas during export that triggers abort with a meaningful error message.

#### F3. Default scenes generated only on export, not during preview
**Severity**: Medium | **Confidence**: High
**Agents**: critic
**File**: `src/lib/useExportController.ts:161-163`
**Issue**: When scenes is empty, default cinematic scenes are auto-generated during export. During playback preview, the user sees a plain follow camera. The exported video will look different from the preview.
**Suggestion**: Either auto-generate default scenes on track load or clearly indicate in the UI that scenes will be auto-generated on export.

### MEDIUM PRIORITY

#### F4. WebWorker depth check may miss deep nesting past 10MB boundary
**Severity**: Medium | **Confidence**: Medium
**Agents**: security-reviewer
**File**: `src/lib/googleJsonParser.ts:283-304`
**Issue**: `checkJsonDepth` scans only the first 10MB of input. On the worker path, a file with safe nesting in the first 10MB but deeper nesting later would pass the check, and the worker's `JSON.parse` would throw a `RangeError` that crashes the worker (the main thread catches RangeError, but the worker does not).
**Suggestion**: Add a RangeError catch in the worker's JSON.parse path.

#### F5. MapView.tsx is ~1200 lines — extractable utility functions
**Severity**: Low | **Confidence**: High
**Agents**: code-reviewer, test-engineer
**File**: `src/components/MapView.tsx`
**Issue**: The file contains pure utility functions (geometry builders, reference grid, camera smoothing) that could be extracted to lib modules and unit-tested independently.
**Suggestion**: Extract `buildReferenceGridData`, `buildTrackGeometry`, `precomputeWrappedSegments`, `buildTrailGeoJSONFromSegments` to `src/lib/mapGeometry.ts`.

#### F6. No unit tests for camera scene blending logic
**Severity**: Medium | **Confidence**: High
**Agents**: test-engineer
**File**: `src/lib/camera.ts:356-466`
**Issue**: The complex scene blending logic in `computeCameraForProgress` — gap interpolation, transition blending, boundary handling — has no unit tests.
**Suggestion**: Add tests for empty scenes, single scene, overlapping scenes, and progress at exact scene boundaries.

#### F7. No unit tests for usePlaybackController and useExportController
**Severity**: Medium | **Confidence**: High
**Agents**: test-engineer
**Files**: `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`
**Issue**: Playback animation loop, speed changes, export lifecycle, and abort handling have no unit tests.
**Suggestion**: Add React hook tests for state transitions and edge cases.

#### F8. No unit tests for videoEncoder pure functions
**Severity**: Medium | **Confidence**: High
**Agents**: test-engineer
**File**: `src/lib/videoEncoder.ts`
**Issue**: `estimateExportMemoryBytes`, `estimateEncodedBytes`, and filename sanitization are pure functions without tests.
**Suggestion**: Add unit tests for memory estimation and filename sanitization.

#### F9. i18n locale key completeness not verified by tests
**Severity**: Low | **Confidence**: High
**Agents**: test-engineer, critic
**File**: `src/lib/i18n.ts`
**Issue**: No test verifies that all 5 locales have the same set of translation keys. Adding a key in `en` without adding it to other locales silently falls back to English.
**Suggestion**: Add a test that verifies key parity across locales.

#### F10. Reduced motion preference not respected
**Severity**: Low | **Confidence**: Medium
**Agents**: designer
**Files**: `src/app/globals.css`
**Issue**: CSS animations (marker-pulse, hover transitions) don't respect `prefers-reduced-motion`.
**Suggestion**: Add `@media (prefers-reduced-motion: reduce)` rules.

### LOW PRIORITY

#### F11. wrapLngNear could infinite-loop on NaN/Infinity input
**Severity**: Low | **Confidence**: High
**Agents**: debugger
**File**: `src/lib/interpolate.ts:14-18`
**Issue**: While loop depends on finite input. All current callers validate coordinates, but a guard would be defensive.
**Suggestion**: Add `if (!Number.isFinite(...)) return nextLng` guard.

#### F12. parseTrackFile mixes Promise chains and async/await
**Severity**: Low | **Confidence**: Medium
**Agents**: code-reviewer
**File**: `src/lib/parser.ts:338-397`
**Issue**: The JSON parsing path uses `.catch().then().catch()` chain while the XML path uses `FileReader.onload` callback wrapped in a Promise.
**Suggestion**: Refactor to use consistent async/await.

#### F13. FileSystemWritableFileStream type cast is unsafe
**Severity**: Low | **Confidence**: High
**Agents**: code-reviewer
**File**: `src/lib/videoEncoder.ts:219-224`
**Issue**: Double `as unknown` cast for File System Access API. No compile-time safety.
**Suggestion**: Add a type declaration file for the File System Access API.

#### F14. Error boundary "Try Again" may re-trigger the same error
**Severity**: Low | **Confidence**: Medium
**Agents**: critic
**File**: `src/components/ErrorBoundary.tsx:36-37`
**Issue**: Resetting error state without clearing the offending track/state may re-trigger the error.
**Suggestion**: Clear track state on "Try Again" for a genuine recovery path.

#### F15. Export memory estimation may underestimate for 4K on mobile
**Severity**: Low | **Confidence**: Medium
**Agents**: critic
**File**: `src/lib/videoEncoder.ts:50-66`
**Issue**: The 8x multiplier may not account for MapLibre's GPU memory. 256MB threshold may be too generous for mobile devices.
**Suggestion**: Consider device-aware memory limits.

#### F16. Four localStorage keys for theme/style tracking
**Severity**: Low | **Confidence**: Medium
**Agents**: critic
**File**: `src/app/page.tsx:57-60`
**Issue**: Complex localStorage scheme for tracking explicit vs. system-derived theme/map style choices.
**Suggestion**: Consider a single JSON object to reduce key count.

#### F17. Overview camera WeakMap cache is module-level global state
**Severity**: Low | **Confidence**: Medium
**Agents**: code-reviewer
**File**: `src/lib/camera.ts:103`
**Issue**: Module-level WeakMap for caching overview camera computation.
**Suggestion**: Add a brief comment that WeakMap is intentional for GC behavior.

#### F18. Map style JSONs may reference external resources
**Severity**: Low | **Confidence**: Low
**Agents**: verifier
**Files**: `public/map-styles/*.json`
**Issue**: If bundled map style JSONs reference external tile/glyph/sprite URLs, the "fully local" claim and offline support would be broken.
**Suggestion**: Verify that all map style resources are bundled locally.

## AGENT FAILURES

None. All 12 agents completed successfully.

## Cross-Agent Agreement Summary

| Finding | Agents Agreeing | Signal Strength |
|---------|----------------|-----------------|
| F1 Export/playback coupling | code-reviewer, tracer, architect | High |
| F5 MapView size | code-reviewer, test-engineer | High |
| F6-F8 Missing unit tests | test-engineer (multiple) | High |
| F9 i18n key parity | test-engineer, critic | Medium |
| F10 Reduced motion | designer | Medium |
| F13 Unsafe type cast | code-reviewer | Medium |