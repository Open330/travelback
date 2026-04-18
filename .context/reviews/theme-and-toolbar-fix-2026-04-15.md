# Theme and Toolbar Fix Note — 2026-04-15

## User-reported issue
- Main page / sample view color scheme looked wrong until the light/dark toggle was clicked once.
- The top-right utility controls (`km/mi`, language switcher, theme toggle) were visually colliding with the main top-row UI after loading the sample trip.

## Root cause
1. **Initial theme attributes were being lost after hydration**
   - `data-mode` / `data-mapstyle` were not being re-applied from stable app state after hydration, so system dark mode could visually desync from the rest of the UI until the user toggled the theme manually.
2. **Loaded-state global toolbar shared the same top band as primary actions**
   - Even when not mathematically intersecting at all widths, the controls were crowded into the same visual lane as track actions/title.

## Fixes applied
- Added explicit `colorMode` state to the app shell and synchronized `data-mode` / `data-mapstyle` from app state after hydration.
- Made `ThemeToggle` support controlled mode so the toggle, theme state, and document attributes stay in sync.
- Repositioned the loaded-state global toolbar to a second row on desktop to separate it from the primary action row.

## Verification
- Reproduced with Playwright before fixing.
- Added regressions for:
  - dark system theme applying correctly on first render without a manual toggle
  - loaded desktop global toolbar sitting below the main top action row
- Full verification:
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm run build` ✅
  - `npm run test:e2e:static:ci` ✅ `50 passed`
