# Designer Review — Travelback (2026-05-04, Cycle 2)

## Summary

UI/UX remains well-implemented. The cycle 1 fixes (reduced motion for hover, ErrorBoundary recovery) are verified. One remaining accessibility item.

## Findings

### C2-DS-01. Marker pulse animation not respecting reduced motion — LOW risk, HIGH confidence
**File**: `src/components/MapView.tsx:974`, `src/app/globals.css`
**Issue**: The marker-pulse element (created at MapView line 974) has a CSS class `marker-pulse` that likely uses a CSS animation for the pulsing effect. If this animation is not covered by the `@media (prefers-reduced-motion: reduce)` rule added in cycle 1, users with reduced-motion preference will still see the animation.
**Suggestion**: Verify that the marker-pulse animation is covered by the reduced-motion media query. If not, add it.

### C2-DS-02. Scene editor dynamic ARIA bounds — VERIFIED
**File**: `src/components/SceneEditor.tsx:213-214`
**Issue**: Scene range sliders have dynamic `aria-valuemin`/`aria-valuemax` based on neighboring scene boundaries. This correctly addresses the cycle 1 accessibility finding.
**Suggestion**: No change needed.
