# Sample Map and Toolbar Follow-up — 2026-04-15

## User-reported issues
- Main/sample page color scheme looked wrong until the light/dark toggle was clicked.
- `km/mi`, language switcher, and theme toggle looked crowded against the main top-row controls.
- Sample-loaded map looked too empty / map-like context was weak.

## Fixes applied
1. **Hydration-safe theme sync**
   - Added explicit app-shell `colorMode` state.
   - Re-applied `data-mode` / `data-mapstyle` from app state after hydration.
   - Made `ThemeToggle` work in controlled mode so the document state, toggle icon, and app state stay aligned.

2. **Desktop toolbar separation**
   - Moved the loaded-state global utility toolbar to a second desktop row below the primary action row.
   - Added Playwright regression coverage so it stays below the primary top row.

3. **Sample map context improvement**
   - Reworked the local reference grid from a very sparse world-scale grid to a denser track-aware local grid.
   - Increased grid contrast slightly so the sample map reads as a map instead of a flat empty background.

4. **Reference-grid load guard**
   - Guarded grid-layer insertion so it never tries to add sources before the style is loaded.

## Verification
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:static` ✅
- `npm run test:e2e:static:ci` ✅ `50 passed`

## Added regressions
- dark system theme applies correctly on first render without a manual toggle
- loaded desktop global toolbar sits below the primary top action row
