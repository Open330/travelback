# P0 — Map Not Rendering (User-Injected, HIGH)

**Priority:** P0 — map is the core feature and is not showing up
**Source:** User-reported bug, confirmed in cycle 2 review (F1)
**Estimated effort:** 60 minutes

---

## Problem

The map is not rendering properly. The map style JSON files (`public/map-styles/*.json`) contain only 10 minimal layers each (background + 4 fill + 5 line), producing an extremely sparse map with no labels, no road names, minimal road detail, and no POIs. A proper CARTO basemap style has 50-100+ layers.

### Current state of styles

Each style file has only:
- `background` (background fill color)
- `landcover` (fill — wood, grass)
- `park` (fill)
- `water` (fill)
- `building` (fill)
- `waterway` (line)
- `boundary` (line)
- `road-minor` (line)
- `road-major` (line)
- `rail` (line)

Missing:
- All text/label layers (place names, road names, POI names)
- Road casing, bridges, tunnels, road classes at different zoom levels
- Water name labels
- Transportation name labels
- Admin boundary labels
- `glyphs` URL (required for any text rendering)
- `sprite` URL (required for any icon rendering)

---

## Implementation steps

### 1. Download official CARTO GL styles

Fetch the complete style specifications from CARTO CDN:
- Voyager: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`
- Positron: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
- Dark Matter: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`
- Liberty: `https://basemaps.cartocdn.com/gl/liberty-gl-style/style.json`
- Bright: Currently no official CARTO bright style — will adapt positron with bright color scheme

### 2. Adapt styles for local tile source reference

Replace the `sources.carto.url` (tilejson URL) with direct `tiles` array using CARTO CDN vector tile endpoints:
```json
{
  "type": "vector",
  "tiles": [
    "https://tiles-a.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt",
    "https://tiles-b.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt",
    "https://tiles-c.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt",
    "https://tiles-d.basemaps.cartocdn.com/vectortiles/carto.streets/v1/{z}/{x}/{y}.mvt"
  ],
  "minzoom": 0,
  "maxzoom": 14
}
```

### 3. Configure glyphs and sprite to use CARTO CDN

Point `glyphs` to CARTO's hosted font glyphs:
```
https://basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf
```

Point `sprite` to CARTO's hosted sprite:
```
https://basemaps.cartocdn.com/gl/voyager-gl-style/sprite
```
(Adjust path per style: voyager, positron, dark-matter, etc.)

### 4. Verify CSP allows all required domains

The current CSP already allows `https://*.basemaps.cartocdn.com` in `connect-src`. However, glyphs and sprites are fetched by MapLibre as regular network requests which may fall under `connect-src` or `img-src`. Verify:
- `connect-src 'self' https://*.basemaps.cartocdn.com` — should cover tile + glyph fetches
- `img-src 'self' blob: data:` — sprite images may need this; check if MapLibre uses img fetch

### 5. Write a script to automate style fetching/adaptation

Create `scripts/fetch-map-styles.mjs` that:
1. Downloads each style from CARTO CDN
2. Replaces the source URL pattern with direct tile URLs
3. Keeps the glyphs/sprite CDN URLs as-is (CARTO CDN hosted)
4. Writes the result to `public/map-styles/`

### 6. Handle the "bright" style

CARTO doesn't have a "bright" GL style. Options:
- Use a modified version of Positron with different accent colors
- Use Maptiler's basic bright style (but that's a different provider)
- Create a custom style based on Positron but with saturated colors

Simplest approach: Use the CARTO Voyager style as base for "bright" since it's already the most colorful option, or create a simple variant.

### 7. Build and verify

- `npm run build` must pass
- Load the app and verify maps render with full detail (roads, labels, POIs)
- Test all 5 style options (voyager, positron, dark, liberty, bright)
- Test dark mode and light mode

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] Map style JSONs now have 93 layers each (was 10)
- [x] All 5 map styles include glyphs and sprite references
- [x] All styles use direct tiles array (no TileJSON url) — CSP-compatible
- [x] Liberty and Bright styles derived from Voyager with color overrides
- [ ] Map renders with visible roads, labels, and features at all zoom levels (needs manual browser verification)
- [ ] Dark mode map style renders properly (needs manual browser verification)
- [ ] Light mode map styles render properly (needs manual browser verification)
- [ ] No CSP errors in browser console (needs manual browser verification)
