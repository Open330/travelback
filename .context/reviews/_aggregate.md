# Aggregate Review — Travelback (2026-05-04, Cycle 2)

## Overview

10 review agents completed. No agent failures. The key new finding is a playback progress restoration bug in the export pipeline that was introduced by the cycle 1 `isExporting`/`renderFrameAndWait` changes.

## Deduplicated Findings (ordered by severity/confidence)

### MEDIUM PRIORITY

#### C2-F1. Export progress restoration overwrites final playback position on success
**Severity**: Medium | **Confidence**: High
**Agents**: code-reviewer, debugger, tracer, critic, verifier, architect
**Files**: `src/lib/useExportController.ts:254,306-307`
**Issue**: The `finally` block unconditionally calls `setPlaybackProgress(preExportProgress)`, overwriting the `setPlaybackProgress(1)` called in the success path. After a successful export, playback progress resets to wherever it was before export.
**Fix**: Only restore preExportProgress on abort/failure. On success, preserve progress=1.

### LOW PRIORITY

#### C2-F2. Test stub bypass accessible in production via URL parameter
**Severity**: Low | **Confidence**: High
**Agents**: code-reviewer, security-reviewer
**File**: `src/lib/test-stub.ts`
**Issue**: `isLocalExportTestStubEnabled()` checks URL parameter without development-mode gate.
**Fix**: Gate behind `process.env.NODE_ENV === 'development'`.

#### C2-F3. No unit tests for `ExportError` class and `estimateEncodedBytes`
**Severity**: Low | **Confidence**: High
**Agents**: test-engineer
**File**: `src/lib/videoEncoder.ts:14-21,46-48`
**Issue**: The ExportError class and estimateEncodedBytes function have no tests.
**Fix**: Add unit tests.

#### C2-F4. No tests for scene preset generators
**Severity**: Low | **Confidence**: High
**Agents**: test-engineer
**File**: `src/lib/camera.ts:225-350`
**Issue**: `generateDefaultScenes`, `generateSimpleFlyover`, etc. have no tests.
**Fix**: Add tests verifying scene validity.

#### C2-F5. Marker pulse animation may not respect reduced motion
**Severity**: Low | **Confidence**: Medium
**Agents**: designer
**File**: `src/components/MapView.tsx:974`
**Issue**: Marker-pulse CSS animation may not be covered by `prefers-reduced-motion` rule.
**Fix**: Verify and add animation override if missing.

#### C2-F6. Architecture doc missing isExporting/renderFrameAndWait details
**Severity**: Low | **Confidence**: High
**Agents**: document-specialist
**File**: `.context/project/02-architecture.md`
**Issue**: Export pipeline section is stale after cycle 1 changes.
**Fix**: Update doc. Already planned as P17.

### VERIFIED FIXES FROM CYCLE 1

- **ErrorBoundary "Try Again"** recovery: Verified working (clears state before re-render)
- **prefers-reduced-motion** for button hover: Verified
- **i18n key parity** tests: Verified (commit 8ccb68a)
- **Camera blending** tests: Verified (commit 975ee4f)
- **wrapLngNear** non-finite guard: Verified (commit ce0bc6c)
- **Scene editor** dynamic ARIA bounds: Verified
- **Trim confirmation** dialog: Verified
- **resetSize** style-first cleanup: Verified
- **isExporting** gating: Verified

## AGENT FAILURES

None. All 10 agents completed successfully.

## Cross-Agent Agreement Summary

| Finding | Agents Agreeing | Signal Strength |
|---------|----------------|-----------------|
| C2-F1 Export progress bug | code-reviewer, debugger, tracer, critic, verifier, architect | Very High |
| C2-F2 Test stub in production | code-reviewer, security-reviewer | Medium |
| C2-F3 ExportError tests | test-engineer | Medium |
| C2-F5 Reduced motion marker | designer | Low |
