# Test Engineer Review

**Reviewer**: test-engineer  
**Date**: 2026-04-27

---

## Finding 1: No unit tests for `useExportController` hook

**File**: `src/lib/useExportController.ts`  
**Severity**: Medium  
**Confidence**: High  

The most complex hook has zero unit tests. Cover: normal export flow, abort during rendering, abort during idle wait, map resize cleanup, blob URL revocation.

**Fix**: Create `src/lib/useExportController.test.ts`.

---

## Finding 2: No unit tests for `usePlaybackController` hook

**File**: `src/lib/usePlaybackController.ts`  
**Severity**: Medium  
**Confidence**: High  

The playback controller manages RAF animation, accumulator-based progress, and speed changes. No unit tests exist.

**Fix**: Create `src/lib/usePlaybackController.test.ts`.

---

## Finding 3: No unit tests for `JourneyCreator` component

**File**: `src/components/JourneyCreator.tsx`  
**Severity**: Medium  
**Confidence**: High  

JourneyCreator has complex map interaction logic. None tested.

**Fix**: Add integration tests with mocked maplibregl.Map.

---

## Finding 4: No E2E test for export flow

**Severity**: Medium  
**Confidence**: Medium  

No E2E test covers the export flow (the primary user action). The export test stub exists but may not be used in E2E.

**Fix**: Add an E2E test that enables the export test stub and verifies the done state.

---

## Finding 5: No `normalizeScenes` edge case tests

**File**: `src/lib/camera.test.ts`  
**Severity**: Low  
**Confidence**: High  

Should test: empty array, single scene, overlapping scenes, out-of-order scenes, zero-width scenes, scenes with gap.

**Fix**: Add explicit `describe('normalizeScenes', ...)` test cases.

---

## Summary

| # | Finding | Severity | Confidence |
|---|---------|----------|------------|
| 1 | No useExportController tests | Medium | High |
| 2 | No usePlaybackController tests | Medium | High |
| 3 | No JourneyCreator tests | Medium | High |
| 4 | No E2E export flow test | Medium | Medium |
| 5 | No normalizeScenes edge case tests | Low | High |
