# Cycle 1 Implementation Plan

## Issues to Fix (from user-reported TODOs + review findings)

### Issue 1: Map does not load at all
- **Root cause**: MapLibre GL JS v5 adds class `maplibregl-map` to the container element, which sets `position: relative` in the MapLibre CSS. This overrides Tailwind's `absolute` utility class because of CSS specificity/cascade order. The map container gets `position: relative` and `height: 0` instead of being positioned absolutely with `inset: 0`.
- **Fix**: Override the MapLibre CSS position on the container. Either:
  - (A) Add `!important` via inline style: `style={{ position: 'absolute' }}` on the container div in `MapView.tsx`
  - (B) Add a CSS rule in `globals.css`: `.maplibregl-map.absolute { position: absolute !important; }` or override `.maplibregl-map` position when it has the `absolute` class.
- **Preferred**: Option B (CSS override) is cleaner and doesn't require inline style mixing.
- **File**: `src/components/MapView.tsx` line 933 OR `src/app/globals.css`
- **Status**: TODO

### Issue 2: UI color scheme broken on initial load
- **Root cause**: The `useEffect` in `page.tsx` line 297-300 calls `applyDocumentMode(colorMode)` after every render cycle. On initial mount, React's `colorMode` state reads `document.documentElement.getAttribute('data-mode')` which IS set by the bootstrap script. However, the `mapStyleKey` initializer (line 43-49) also sets `data-mapstyle` attribute synchronously in the `useState` initializer. This is fine. The actual issue is more nuanced:
  1. In the static export, the HTML is pre-rendered WITHOUT `data-mode` attribute
  2. The bootstrap script adds it at runtime, but there's a brief flash of unstyled/wrong-theme content
  3. The `colorMode` state and `mapStyleKey` state in `page.tsx` are initialized from DOM attributes, which should be correct after bootstrap script runs
  4. But the `useEffect` that calls `applyDocumentMode` runs AFTER first paint and could cause a re-render flash
- **Additional sub-issue**: The `mapStyleKey` initializer writes to `data-mapstyle` attribute (line 47), but this runs during `useState` initialization which is during render, not in an effect. Writing to the DOM during render is a side effect and could cause hydration mismatches.
- **Fix**:
  1. Remove the `useEffect` on line 297-300 that redundantly applies mode on mount (the bootstrap script already handles this)
  2. Move the `document.documentElement.setAttribute('data-mapstyle', key)` from the `useState` initializer into the `useEffect` or remove it (the bootstrap script handles `data-mapstyle` too)
  3. Ensure the `colorMode` state reads from localStorage directly as a fallback
- **Files**: `src/app/page.tsx`
- **Status**: TODO

### Issue 3: UI buttons overlap too much
- **Root cause**: After browser testing, the toolbar buttons are reasonably positioned on the landing page (1280px viewport). The overlap issue likely occurs:
  1. On smaller viewports where `flex-wrap` causes buttons to stack
  2. When both `GlobalToolbar` and `TrackToolbar` are visible simultaneously (shouldn't happen, but edge case)
  3. When the `Controls` component buttons wrap and overlap with the elevation profile
  4. The `min-h-11` (44px) touch targets plus `gap-2` (8px) may not leave enough room on narrow screens
- **Fix**:
  1. Add `flex-shrink-0` to toolbar button groups to prevent compression
  2. Ensure proper `gap` spacing in `TrackToolbar` and `GlobalToolbar`
  3. Add `overflow-x-auto` as fallback for very narrow screens
  4. Check that controls row doesn't overlap with elevation profile
- **Files**: `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`, `src/components/Controls.tsx`
- **Status**: TODO

### Issue 4 (from review): MapLibre GL v5 CSS layer order
- **Root cause**: In Tailwind CSS v4 with `@import`, the MapLibre CSS is imported BEFORE the Tailwind utilities, so its rules have equal specificity but appear earlier in the cascade. Tailwind utilities should override them, but the `@layer base` import in `globals.css` line 3 puts `vitro-base.css` in the base layer, while the MapLibre CSS import on line 2 is NOT in a layer. Un-layered styles have higher priority than layered styles.
- **Fix**: Ensure Tailwind utility classes override MapLibre CSS by either:
  - Moving the MapLibre CSS import into a layer
  - Adding explicit CSS overrides in `globals.css`
- **File**: `src/app/globals.css`
- **Status**: TODO

## Deferred Items
(none this cycle - all findings are scheduled for implementation)
