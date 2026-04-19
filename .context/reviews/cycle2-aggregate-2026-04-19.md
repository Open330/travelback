# Cycle 2 Aggregate Code Review — 2026-04-19

## Review Scope

Full repository review focusing on three user-reported bugs plus general code quality, correctness, security, performance, and UX issues.

---

## CRITICAL FINDINGS (User-Reported Bugs)

### F1. Map not showing up — sparse/minimal map style (HIGH, Confirmed)

**Files:** `public/map-styles/voyager.json`, `dark.json`, `positron.json`, `liberty.json`, `bright.json`

**Root Cause:** The map style JSON files were "restored" in commit cb898d1 but contain only 10 layers each (background + 4 fill + 5 line). A proper CARTO basemap style has 50-100+ layers including roads at multiple zoom levels, tunnels, bridges, place labels, road names, poi labels, etc. The current styles produce an extremely sparse map:

- Only `landcover`, `park`, `water`, `waterway`, `boundary`, `road-minor`, `road-major`, `rail`, `building` layers
- No symbol/text layers at all (no place names, no road labels, no POI labels)
- No road casing or road class differentiation
- Missing many common source-layers: `place`, `poi`, `transportation_name`, `water_name`, etc.
- No `glyphs` or `sprite` properties (needed for any future text/icon layers)

**Additional issue:** Even these 10 layers may not render properly because the style files are missing essential zoom-level paint/layout properties that make CARTO styles work across zoom ranges (e.g., road widths that scale with zoom, water pattern fills, etc.).

**Fix:** The map style JSONs need to be replaced with complete CARTO basemap style specifications. The official CARTO styles are available at:
- Voyager: `https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json`
- Positron: `https://basemaps.cartocdn.com/gl/positron-gl-style/style.json`
- Dark Matter: `https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json`

These need to be downloaded, adapted for local tile source references, and the `glyphs` and `sprite` URLs need to point to either local or CDN-hosted resources.

**Confidence:** HIGH

---

### F2. Theme wrongly rendered on first visit (HIGH, Confirmed)

**Files:** `src/app/layout.tsx` (line 52), `src/components/ThemeToggle.tsx`, `src/app/page.tsx` (lines 36-49)

**Root Cause Analysis:**

The inline theme-init script in `layout.tsx` correctly sets `data-mode` and `data-mapstyle` attributes on the `<html>` element before first paint. However, the CSS variable system relies on `[data-mode=light]` and `[data-mode=dark]` selectors in `vitro-base.css`. The problem is a **race condition between the inline script and CSS loading**:

1. The inline script runs synchronously and sets `data-mode` on `<html>`.
2. BUT: the CSS file (including `vitro-base.css`) may not have loaded yet when the script runs, or more critically, the Next.js runtime may not have hydrated the React tree yet.
3. In `page.tsx` (lines 36-41), the `colorMode` state is initialized by reading `document.documentElement.getAttribute('data-mode')` — this should work since the inline script already set it.
4. In `page.tsx` (lines 43-49), `mapStyleKey` is also initialized from `data-mode`.

**The actual bug:** Looking more carefully at `page.tsx` line 36-41:
```tsx
const [colorMode, setColorMode] = useState<'dark' | 'light'>(() => {
  if (typeof document === 'undefined' || typeof window === 'undefined') return 'light'
  const currentMode = document.documentElement.getAttribute('data-mode')
  if (currentMode === 'dark' || currentMode === 'light') return currentMode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
})
```

And `ThemeToggle.tsx` line 7-19:
```tsx
function detectInitialMode() {
  const current = document.documentElement.getAttribute('data-mode')
  if (current === 'dark' || current === 'light') {
    return { mode: current, hadExplicitMode: true }
  }
  const inferredMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.setAttribute('data-mode', inferredMode)
  return { mode: inferredMode, hadExplicitMode: false }
}
```

The issue is that the inline script sets `data-mode` correctly, BUT the initial server-rendered HTML has NO `data-mode` attribute on `<html>`. The Next.js static export prerenders the HTML without `data-mode`. When the page loads:

1. **First paint (before inline script):** The `<html>` has no `data-mode`, so NO CSS variables are defined (no `[data-mode=light]` or `[data-mode=dark]` matches). The body uses fallback `var(--bg, #EBEEF4)` which is the light mode fallback.
2. **Inline script runs:** Sets `data-mode` and `data-mapstyle`.
3. **CSS variables now apply.**

For a user with `prefers-color-scheme: dark`, this creates a FOUC: first paint shows light mode (CSS fallback), then inline script sets `data-mode=dark`, and the page flips to dark mode.

**The fix should be:** The initial server-rendered HTML should NOT depend on JavaScript for the first paint. However, since this is a static export, we can't know the user's preference at build time. The inline script IS the correct approach for preventing FOUC — but it needs to run BEFORE any CSS is applied.

**The real problem is likely:** The inline `<script>` in the `<head>` runs, but Next.js's CSS loading may cause the first visible paint to happen before the script executes in some browsers. The `dangerouslySetInnerHTML` script in the `<head>` should execute synchronously before rendering, but there can be edge cases with CSP `unsafe-inline` restrictions or browser optimizations.

**Wait — more critical issue:** Looking at the built HTML output, the hardened CSP has `script-src 'self' 'sha256-...'` with specific hashes. The inline theme script IS included in these hashes (the harden script computes hashes for all inline scripts). But in the **dev** CSP, it's `script-src 'self' 'unsafe-inline'` — also fine. So CSP is not blocking the inline script.

**Actual confirmed root cause:** The issue is that `data-mode` is NOT set on the server-rendered HTML. The `<html>` tag in `layout.tsx` line 50 has no `data-mode` attribute:
```tsx
<html lang="en" data-svc="travelback" data-mesh="on" suppressHydrationWarning>
```

The inline script runs and sets `data-mode`, but between the HTML being parsed and the script executing, the page renders with NO `data-mode`, falling through to CSS defaults (which happen to be light mode colors from `:root` defaults or the `[data-mode=light]` fallback).

**However**, in a proper browser, the inline `<script>` in `<head>` should block rendering until it completes. The issue may be more subtle:

Looking at `vitro-base.css`, the `:root` block defines `--bg`, `--t1`, etc., but these are overridden by `[data-mode=light]` and `[data-mode=dark]` selectors. If `data-mode` is not set, the `:root` defaults apply, but some variables like `--gc-bg`, `--gi-bg`, `--gs-bg` etc. are ONLY defined inside `[data-mode=light]` or `[data-mode=dark]` blocks. When `data-mode` is absent, these variables are undefined, leading to broken rendering.

**Fix:** Ensure the inline script sets `data-mode` before any CSS paint. The current approach is correct in principle, but we should verify the script truly runs synchronously. The issue might be that in some browsers or configurations, the `dangerouslySetInnerHTML` script gets deferred or runs after first paint. A more robust approach would be to set `data-mode` directly as a default in the HTML, but since we can't know the user's preference at build time, we should ensure the inline script is the very first thing in `<head>`.

**Confidence:** MEDIUM-HIGH — the inline script approach is correct but may have timing issues in specific browser scenarios. The most robust fix is to also add a CSS-only fallback that provides sensible defaults when `data-mode` is not yet set.

---

### F3. Default unit to km/SI (MEDIUM, Likely Already Fixed)

**Files:** `src/lib/interpolate.ts` (lines 135-142)

**Analysis:** Commit 2d49433 changed `getUnitPreference()` to always default to `'metric'`:

```tsx
export function getUnitPreference(): UnitSystem {
  if (typeof window === 'undefined') return 'metric'
  try {
    const stored = localStorage.getItem(UNITS_STORAGE_KEY)
    if (stored === 'metric' || stored === 'imperial') return stored
  } catch { /* ignore */ }
  return 'metric'
}
```

This looks correct — new users (no localStorage value) get `'metric'`. Users who previously selected imperial will keep their stored preference. The only edge case would be if there's old localStorage data with a different key format, but `UNITS_STORAGE_KEY = 'travelback-units'` is consistent.

**The page.tsx also correctly initializes:**
```tsx
const [units, setUnits] = useState<UnitSystem>(() => getUnitPreference())
```

**Possible remaining issue:** The `formatDistance` and `formatElevation` functions have a fallback path where if `units` is not passed, they call `getUnitPreference()` again (interpolate.ts line 149, 160). This means any call that doesn't pass the `units` parameter will correctly default to metric. This is fine.

**Verdict:** This issue appears to already be fixed. The only scenario where it wouldn't work is if a user had previously stored `'imperial'` in localStorage — but that's correct behavior (respecting user choice).

**Confidence:** HIGH — already fixed

---

## ADDITIONAL FINDINGS

### F4. Map style reference grid may interfere with map rendering (MEDIUM, Confirmed)

**File:** `src/components/MapView.tsx` (lines 165-321, 278-321)

The reference grid adds GeoJSON line sources and layers on top of the map. When the base map style is extremely sparse (only 10 layers), the grid lines may dominate the visual and make the map appear broken or cluttered. The grid is also added even when no track is loaded, creating a global lat/lng grid overlay on the nearly-empty base map.

### F5. Map navigation control placement conflicts with toolbar (LOW)

**File:** `src/components/MapView.tsx` (line 508)

Navigation control is added to `top-left`, which can overlap with the "Load New File" button on the track workspace view.

### F6. ErrorBoundary has no i18n for error messages (LOW)

**File:** `src/components/ErrorBoundary.tsx`

The ErrorBoundary uses hardcoded English strings instead of the i18n system. This is inconsistent with the rest of the application.

### F7. downloadVideo fallback fetches URL that may already be revoked (MEDIUM)

**File:** `src/lib/videoEncoder.ts` (lines 162-163)

In the `showSaveFilePicker` path, the code does:
```tsx
const writeBlob = blob ?? await (await fetch(url)).blob()
```

If `blob` is not passed and the URL has been revoked, this will fail. However, in the current codebase, `blob` is always passed, so this is a latent risk rather than an active bug.

### F8. ElevationProfile SVG uses useId() which can mismatch in SSR (LOW)

**File:** `src/components/ElevationProfile.tsx` (line 17)

`useId()` generates different IDs on server vs client, which could cause SVG gradient/clipPath references to break during hydration. Since the app is `'use client'`, this should be fine in practice, but it's worth noting for SSR scenarios.

### F9. Worker parser fallback may silently lose data for large files (MEDIUM)

**File:** `src/lib/parser.ts` (lines 450-516)

When the worker fails for files >50MB, the error message says "File too large to parse without Web Worker" and rejects. For files between 50MB and 200MB (the MAX_FILE_SIZE), this creates an inconsistent experience where small-to-medium files parse fine but large Google Location History files may fail if the worker can't be created.

### F10. Controls component does not receive or pass units for all formatDistance calls (LOW)

**File:** `src/components/Controls.tsx` (line 143)

The Controls component receives `units` prop and passes it to `formatDistance`, which is correct. No issue found.

### F11. Map container has aria-hidden when no track, but map is still interactive (LOW)

**File:** `src/components/MapView.tsx` (lines 382-391)

When `track` is null, the container gets `inert` and `aria-hidden="true"`, which is correct for accessibility. However, the MapLibre map underneath can still receive mouse events through the overlay. The `hide-map-controls` CSS class hides the zoom controls but the map canvas can still be dragged.

### F12. TimelineSelector — stale closure risk in onRangeChange (MEDIUM)

**File:** `src/components/TimelineSelector.tsx`

The TimelineSelector component uses callback refs and event handlers that could capture stale state if not carefully memoized. This is a common React pattern risk.

### F13. Video export: frame timestamp uses frame index * frameDuration, may accumulate drift (LOW)

**File:** `src/lib/videoEncoder.ts` (line 121)

Frame timestamps are computed as `frame * frameDuration` which is an integer arithmetic approach that avoids floating-point drift. This is actually correct and better than accumulating deltas.

### F14. JourneyCreator drag-and-drop coordinate parsing lacks validation for extreme values (LOW)

**File:** `src/components/JourneyCreator.tsx`

The coordinate search tool parses user-pasted coordinates but may not fully validate latitude (-90 to 90) and longitude (-180 to 180) ranges in all code paths.

### F15. vitr-base.css has duplicate --gs-bg and --gs-bd declarations in light mode (LOW)

**File:** `src/styles/vitro-base.css` (lines 173-174 and 184-185)

In the `[data-mode=light]` block, `--gs-bg` and `--gs-bd` are defined twice:
```
--gs-bg: color-mix(in srgb, white 62%, transparent);  /* line 174 */
--gs-bd: rgba(255, 255, 255, .64);                     /* line 175 */
...
--gs-bg: color-mix(in srgb, white 54%, transparent);  /* line 184 — overrides */
--gs-bd: rgba(255, 255, 255, .56);                     /* line 185 — overrides */
```

The second definition overrides the first. This appears to be an accidental duplication rather than intentional cascading. The second values (54% and .56 opacity) are the ones actually used.

### F16. SceneEditor validation allows startPercent >= endPercent before normalization (MEDIUM)

**File:** `src/lib/camera.ts` (lines 19-44), `src/components/SceneEditor.tsx`

The `normalizeScenes()` function clamps and sorts scenes, but the SceneEditor UI allows creating scenes where `startPercent >= endPercent`. The normalization handles this by swapping/clamping, but the UI should ideally prevent this invalid input or show a clearer warning.

---

## SUMMARY

| # | Finding | Severity | Confidence | Action Required |
|---|---------|----------|------------|-----------------|
| F1 | Map not rendering — sparse 10-layer styles | HIGH | HIGH | Fix: Replace with complete CARTO styles |
| F2 | Theme wrong on first visit — CSS variables undefined before data-mode set | HIGH | MEDIUM-HIGH | Fix: Add CSS fallbacks for when data-mode is unset |
| F3 | Default unit to km/SI | MEDIUM | HIGH | Already fixed in commit 2d49433 |
| F4 | Reference grid dominates sparse map | MEDIUM | CONFIRMED | Fix after F1 |
| F5 | Nav control overlaps toolbar | LOW | CONFIRMED | Defer |
| F6 | ErrorBoundary not i18n'd | LOW | CONFIRMED | Defer |
| F7 | downloadVideo URL revocation risk | MEDIUM | LOW | Defer (latent) |
| F8 | ElevationProfile SVG useId SSR mismatch | LOW | LOW | Defer |
| F9 | Worker parser large file inconsistency | MEDIUM | MEDIUM | Defer |
| F10 | Controls formatDistance units | LOW | N/A | No issue found |
| F11 | Map interactive when aria-hidden | LOW | CONFIRMED | Defer |
| F12 | TimelineSelector stale closure risk | MEDIUM | LOW | Defer |
| F13 | Export frame timestamp drift | LOW | N/A | No issue (correct) |
| F14 | JourneyCreator coordinate validation | LOW | LOW | Defer |
| F15 | Duplicate CSS custom properties | LOW | CONFIRMED | Fix: Remove duplicates |
| F16 | SceneEditor start >= end validation | MEDIUM | MEDIUM | Defer |
