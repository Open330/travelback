# Architect — Cycle 3 (2026-05-04)

## Scope
Architectural/design risks, coupling, layering.

## Findings

### C3-A1. MapView.tsx violates separation of concerns
**Severity**: Medium | **Confidence**: High
**File**: `src/components/MapView.tsx`
**Issue**: 1214 lines mixing 7+ concerns. Top extraction targets: geometry functions (pure, no React), grid functions (data + MapLibre API), camera smoothing (duplicates camera.ts).
**Effort**: Large

### C3-A2. Layer boundaries are well-maintained
**Severity**: N/A | **Confidence**: High
**Issue**: src/lib/ has no React component imports. Components import from lib. page.tsx orchestrates. Clean layering despite MapView size.

### C3-A3. Hook composition in page.tsx is appropriate
**Severity**: N/A | **Confidence**: High
**Issue**: usePlaybackController, useExportController, usePlaybackHotkeys compose cleanly. Shared state passed as props.

### C3-A4. Export pipeline callback architecture is sound
**Severity**: N/A | **Confidence**: High
**Issue**: exportVideo takes renderFrame/waitForIdle callbacks, keeping encoding decoupled from map implementation.

### C3-A5. Parser module extraction is well-structured
**Severity**: N/A | **Confidence**: High
**Issue**: Google JSON parser extracted to shared module. Worker and main-thread paths share parsing logic.

## Summary
Architecture is sound. Main concern is MapView.tsx size (same as C3-A1/C3-F1). No new architectural risks.
