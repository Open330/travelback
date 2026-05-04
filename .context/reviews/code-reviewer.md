# Code Reviewer — Cycle 5 (2026-05-04)

## Scope
Full codebase review. Focus on deeper analysis of deferred items, recently modified files, and remaining substantive issues.

## Findings

### C5-F1. `isMapRenderExportError` uses fragile substring matching instead of error codes
**Severity**: Low (fragility) | **Confidence**: High
**File**: `src/lib/useExportController.ts:24-27`
**Issue**: `isMapRenderExportError` checks `error.message.includes('Map did not finish rendering')` to classify export errors. However, `ExportError` instances at lines 177 and 189 in `waitForStableMap` already carry codes `'EXPORT_MAP_RENDER'` and `'EXPORT_MAP_IDLE'`, which are mapped in `EXPORT_ERROR_I18N` at lines 17-22. The substring check is either dead code (if the ExportError code path always matches first) or a fragile fallback. If someone changes the error message text, classification breaks silently.
**Fix**: Remove `isMapRenderExportError` and rely solely on `error instanceof ExportError && EXPORT_ERROR_I18N[error.code]` in the catch block.

### C5-F2. MapView progress effect indentation inconsistency (carried from C4-F1)
**Severity**: Low (style) | **Confidence**: High
**File**: `src/components/MapView.tsx:1064-1067`
**Issue**: Lines inside the progress useEffect use 6-space indentation instead of the surrounding 4-space.
**Fix**: Re-indent to 4 spaces.

### C5-F3. SceneEditor scenes list indentation inconsistency
**Severity**: Low (style) | **Confidence**: High
**File**: `src/components/SceneEditor.tsx:568`
**Issue**: The scenes list rendering uses 8-space indentation (extra 4 spaces) compared to surrounding JSX at the same nesting level.
**Fix**: Dedent by 4 spaces.

### C5-F4. Verified: C4-F2 `hasTime` memoization is FIXED
**Severity**: N/A | **Confidence**: High
**File**: `src/components/TimelineSelector.tsx:363`
**Status**: `useMemo` wrapping confirmed. No action needed.

### C5-F5. Verified: C3-F2 camera smoothing consolidation is FIXED
**Severity**: N/A | **Confidence**: High
**File**: `src/components/MapView.tsx:77-79`
**Status**: `smoothCameraState` delegates to `lerpCamera` from camera.ts. No duplication.

## Summary
Codebase remains in excellent condition. The only actionable finding is removing the fragile substring error classification (C5-F1). Two minor indentation issues carried from prior cycles.