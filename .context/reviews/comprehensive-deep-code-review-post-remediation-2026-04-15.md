# Comprehensive Deep Code Review — Post-Remediation Note

**Date:** 2026-04-15

This note records the remediation work completed after `comprehensive-deep-code-review-2026-04-15.md`.

## Fixed from the deep code review

### 1. GPX/KML parser correctness restored
- Removed the runtime dependency on the simplified worker parser for GPX/KML.
- GPX and KML now use the canonical DOMParser / toGeoJSON parsing path directly.
- Google JSON still uses the worker, but worker failures now fall back to the canonical parser on the main thread.

### 2. Invalid numeric/date payloads are sanitized at the parse boundary
- Elevation and timestamp parsing now reject non-finite / invalid values instead of passing `NaN` / `Invalid Date` into the UI.
- ElevationProfile now ignores malformed elevation values instead of generating broken SVG path data.

### 3. Explicit map-style selection is preserved across later theme/system changes
- Theme changes no longer blindly overwrite a user-selected map style.
- Added regression coverage for this behavior.

### 4. Scene runtime invariants tightened
- Scene normalization now enforces ordered, non-overlapping progression before runtime/export use.

### 5. Export memory duplication reduced
- The export success flow now creates one object URL and reuses it for both preview and download instead of creating duplicate large blobs/URLs.

### 6. Parser/theme regression tests added
- Added regression fixtures/tests for:
  - GPX with single-quoted XML attributes
  - KML composed from point placemarks
  - malformed elevation values
  - preserving explicit map style across theme changes

### 7. Documentation updated
- README test count updated to current reality.
- Overview docs updated to mention the shared modal dialog component.

## Verification
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:static` ✅
- `npm run test:e2e:static:ci` ✅ `48 passed`

## Remaining items not fully closed
- JourneyCreator touch dragging still deserves manual validation on real mobile hardware.
- Modal stack handling is still single-dialog oriented; this is acceptable for the current app, but would need a small modal manager if nested/concurrent dialogs are introduced later.
