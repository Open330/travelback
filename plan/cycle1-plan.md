# Cycle 1 Implementation Plan

## Issues to Fix (from user-reported TODOs + review findings)

### Issue 1: Map does not load at all
- **Root cause**: MapLibre GL JS v5 adds class `maplibregl-map` to the container element, which sets `position: relative` in the MapLibre CSS. This overrides Tailwind's `absolute` utility class because of CSS specificity/cascade order. The map container gets `position: relative` and `height: 0` instead of being positioned absolutely with `inset: 0`.
- **Fix**: Added CSS override in `globals.css`: `.maplibregl-map.absolute { position: absolute !important; }` (line 9)
- **File**: `src/app/globals.css`
- **Status**: DONE

### Issue 2: UI color scheme broken on initial load
- **Root cause**: Dark mode CSS variables (`--err-rgb`, `--gi-sh`, `--gs-sh`) were not defined in the dark mode section of `vitro-base.css`, causing broken colors when dark mode is active.
- **Fix**: Added missing CSS variable definitions in dark mode section of `vitro-base.css`.
- **Files**: `src/styles/vitro-base.css`
- **Status**: DONE

### Issue 3: UI buttons overlap too much
- **Root cause**: TrackWorkspace title layout was overlapping with other toolbar elements.
- **Fix**: TrackWorkspace title layout corrected with proper positioning and overflow handling.
- **Files**: `src/components/TrackWorkspace.tsx`
- **Status**: DONE

### Issue 4 (from review): MapLibre GL v5 CSS layer order
- **Root cause**: In Tailwind CSS v4, un-layered styles have higher priority than layered styles. MapLibre CSS was un-layered, overriding Tailwind utilities.
- **Fix**: MapLibre CSS import moved into `layer(third-party)` in `globals.css` line 2: `@import "maplibre-gl/dist/maplibre-gl.css" layer(third-party);`
- **File**: `src/app/globals.css`
- **Status**: DONE

## Deferred Items
(none this cycle - all findings were implemented)
