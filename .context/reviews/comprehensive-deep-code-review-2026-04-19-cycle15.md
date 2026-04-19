# Cycle 15 Deep Code Review — 2026-04-19

## User-Injected TODOs

### TODO #1: Broken UI color scheme on initial load
> "기본 로드 상태에서 UI 컬러 스키마가 엉망이고, light / dark mode toggle을 한번이라도 클릭해야 올바른 테마로 표시되는데 수정해 주세요"

**Root Cause Analysis:**

The theme initialization chain is: bootstrap script (layout.tsx inline `<script>`) → sets `data-mode`/`data-mapstyle` on `<html>` → CSS variables resolve via `[data-mode=light]`/`[data-mode=dark]` selectors → React hydrates and reads DOM.

Two defects identified:

1. **ThemeToggle `hadExplicitMode` suppresses initial propagation** (`src/components/ThemeToggle.tsx:33-36`):
   When the bootstrap script has already set `data-mode`, `detectInitialMode()` returns `hadExplicitMode: true`. The `useEffect` then SKIPS calling `onModeChange`, so the parent (HomeInner) never gets a confirmatory callback. While HomeInner reads the DOM directly in its own `useState` initializer, this means there's no explicit sync signal from ThemeToggle to parent on first mount. If there's any state desync (e.g., during hydration reconciliation), it goes uncorrected until the user manually toggles.

2. **Missing CSS custom properties in dark mode** (`src/styles/vitro-base.css:261-302`):
   The `[data-mode=dark]` block is missing `--gi-sh` (glass interactive shadow). The `:root:not([data-mode])` fallback block defines it at line 73, and `[data-mode=light]` defines it at line 242, but `[data-mode=dark]` omits it. The `.gi` class uses `box-shadow: var(--gi-sh, none)`, so dark mode gets `none` instead of an appropriate dark shadow. Similarly, `--gs-sh` is missing from dark mode (light mode line 223, fallback line 54).

3. **CSS layer cascade concern**: `@import "../styles/vitro-base.css" layer(base)` in globals.css merges vitro into Tailwind's base layer. This works for CSS custom properties (which inherit regardless of layer), but could cause subtle specificity issues if any vitro selectors conflict with Tailwind's preflight.

**Severity: HIGH** — Directly impacts first impression for every user.

---

### TODO #2: UI buttons overlapping too much
> "UI 버튼이 너무 많이 겹치는데 수정해 주세요"

**Root Cause Analysis:**

1. **Track title uses `right-[43rem]`** (`src/components/TrackWorkspace.tsx:117`):
   ```jsx
   className="absolute left-36 right-[43rem] top-4 z-10 ... lg:block"
   ```
   On a 1440px viewport, this leaves only `1440 - 36*4 - 43*16 = 1440 - 144 - 688 = 608px` minus padding for the title, but on smaller viewports the `right-[43rem]` (688px!) makes the title invisible or zero-width. Even on large screens, this is extreme.

2. **TrackToolbar has no flex-wrap** (`src/components/TrackToolbar.tsx:77`):
   ```jsx
   className="absolute top-4 right-4 z-10 flex items-center gap-1.5 sm:flex-wrap sm:justify-end sm:gap-2 ..."
   ```
   On small screens (sm breakpoint), `flex-wrap` is applied but the toolbar has multiple buttons (New, Scenes, Map Style, Export) plus a mobile menu that can overflow.

3. **GlobalToolbar and TrackToolbar both at `top-4 right-4`**: This is handled by conditional rendering (`hasTrack` prop), but on the transition between no-track and has-track states, there can be layout jumps.

4. **No minimum spacing between toolbar buttons and map controls**: MapLibre zoom controls (`.maplibregl-ctrl-top-right`) overlap with the toolbar area.

**Severity: MEDIUM** — Functional but visually broken on common viewport sizes.

---

### TODO #3: Map not loading
> "지도는 로드가 안 되는데 수정해 주세요"

**Root Cause: CONFIRMED — All 5 map style JSON files are empty stubs.**

Every file in `/public/map-styles/` (voyager.json, dark.json, positron.json, liberty.json, bright.json) has:
```json
{
  "version": 8,
  "name": "...",
  "sources": {},       // <-- NO tile sources
  "layers": [
    {
      "id": "background",
      "type": "background",
      "paint": { "background-color": "..." }  // Only a solid color
    }
  ],
  "metadata": {
    "travelback:bundled": true,
    "travelback:description": "Minimal bundled base style with no remote tiles, glyphs, or sprites."
  }
}
```

MapLibre GL JS requires actual tile sources to render map imagery. Without any tile URLs in `sources`, the map renders as a blank solid-color rectangle.

**Fix**: Replace all 5 style files with proper MapLibre style specs using free, no-API-key-required raster tile services from Carto/CartoDB:
- Voyager: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`
- Positron: `https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`
- Dark: `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png`
- Liberty: OpenStreetMap standard tiles
- Bright: CartoDB voyager labels under bright style

**Severity: CRITICAL** — The app's core functionality (map display) is completely non-functional.

---

## Additional Findings (Deferred)

1. **Err-rgb variable undefined**: `src/app/page.tsx:325` references `rgba(var(--err-rgb, 244,63,94),.7)` but `--err-rgb` is never defined in any CSS block. Only `--err: #F43F5E` exists. The fallback `244,63,94` matches the hex, so it works, but the variable should be properly defined.

2. **Public theme-init.js unused**: `/public/theme-init.js` contains the same logic as the inline bootstrap script but is never referenced in layout.tsx. Dead file.

3. **MapLibre attribution compliance**: When using CartoDB/OpenStreetMap tiles, proper attribution must be included in the style spec's `attribution` field.
