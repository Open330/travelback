# User-Injected TODOs — Cycle 2 Status

These issues were reported by the user during cycle 1 and addressed in cycle 2.

## 1. Map not showing up (HIGH priority) — FIXED
- **Description:** Map is not rendering/displaying at all. The map tiles are not appearing.
- **Context:** Recent commit cb898d1 attempted to restore CARTO basemap tiles and update CSP, but maps are still not showing.
- **Fix:** Replaced sparse 10-layer map style JSONs with complete 93-layer CARTO basemap styles including labels, road names, POIs, glyphs, and sprites. Commit a22c404.
- **Status:** FIXED (needs manual browser verification for visual confirmation)

## 2. Theme wrongly rendered on first visit (HIGH priority) — FIXED
- **Description:** Theme is incorrectly rendered on first visit. It only becomes correct after at least one toggle of dark/light mode.
- **Context:** Recent commit a6f76b9 attempted to fix FOUC by inlining theme-init script, but the issue persists.
- **Fix:** Added `:root:not([data-mode])` CSS fallback block providing light-mode defaults for all theme variables, ensuring correct rendering even before the inline script sets `data-mode`. Also fixed duplicate CSS property declarations. Commit c9e535c.
- **Status:** FIXED (needs manual browser verification for visual confirmation)

## 3. Set default unit to km/SI (MEDIUM priority) — ALREADY FIXED
- **Description:** Default unit should be km (SI/metric) for all locales.
- **Context:** Recent commit 2d49433 attempted to default to metric for all locales, but may not be fully working.
- **Fix:** No code change needed — verified that `getUnitPreference()` already returns `'metric'` as the default when no stored preference exists. The existing implementation is correct.
- **Status:** VERIFIED (already working correctly from commit 2d49433)
