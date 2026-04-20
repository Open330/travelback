# Cycle 3 Deep Review -- 2026-04-21

**Date:** 2026-04-21
**Focus:** User-reported issues: broken theme on initial load, theme toggle required for correct display, UI button overlap, map not loading
**Methodology:** Full source code review + live browser testing (dev + production static export) + CSP analysis + CSS cascade analysis

---

## USER-REPORTED ISSUE 1: UI color scheme broken on initial load

### Finding U1-1: React hydration strips data-mode attribute from <html>
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `src/app/layout.tsx` line 52, `src/app/page.tsx` lines 36-47, 304-307

**Root Cause:** The `RootLayout` renders `<html data-svc="travelback" data-mesh="on" suppressHydrationWarning>` WITHOUT `data-mode`. The inline bootstrap script (line 49) adds `data-mode` to `<html>` before React hydrates. However, `suppressHydrationWarning` only suppresses the React warning about the mismatch -- it does NOT prevent React from reconciling the DOM to match its virtual DOM during hydration. When React hydrates the `<html>` element, it sees that its virtual DOM has no `data-mode` attribute, so it **removes** the `data-mode` attribute that the bootstrap script just set. The `useEffect` in `page.tsx` line 304 then re-applies `data-mode`, but there is a gap between hydration and the effect execution where `data-mode` is absent from `<html>`.

During this gap, `:root:not([data-mode])` matches and the light-mode fallback variables apply. If the user prefers dark mode, they see a brief flash of light-mode colors. More critically, if the CSS hasn't fully loaded yet, the variables may be completely undefined.

**Evidence:** Browser testing confirmed that on the production static build, `--bg`, `--t1`, `--gl` CSS variables are empty strings when using a simple static file server that doesn't handle basePath correctly. This means the variables are not being set at all in some configurations.

**Fix:** Add `data-mode` and `data-mapstyle` to the `<html>` element in the server-rendered layout, using a sensible default. Since we can't read localStorage server-side, use `data-mode="light"` as the default (matching the `:root:not([data-mode])` fallback). The bootstrap script will override it before first paint if dark mode is preferred. This way, React's virtual DOM includes `data-mode`, preventing hydration from stripping it.

### Finding U1-2: Body style lacks CSS variable fallbacks
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `src/app/layout.tsx` line 73

The body element uses `style="background:var(--bg);color:var(--t1)"` with no CSS fallback values. If `--bg` or `--t1` are undefined (e.g., during the hydration gap described in U1-1), the background defaults to transparent and text color defaults to the browser's initial value (typically black). This creates a white/transparent background with potentially invisible text.

**Fix:** Add inline fallback values: `style="background:var(--bg,#EBEEF4);color:var(--t1,#050810)"`.

### Finding U1-3: CSS layer ordering may deprioritize theme variables
- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/app/globals.css` line 3, `src/styles/vitro-base.css` line 48

`vitro-base.css` is imported as `@import "../styles/vitro-base.css" layer(base)`. The `:root:not([data-mode])` fallback and `[data-mode=light]`/`[data-mode=dark]` blocks are inside this layer. Tailwind v4's `@theme inline` block sets some `:root` variables outside any layer. While the specific Tailwind theme variables (`--color-background`, `--color-foreground`) don't conflict with the Vitro variables, the layer ordering means any unlayered `:root` rule would override the layered Vitro variables.

Currently this doesn't cause a problem because no unlayered CSS sets the Vitro variables. But it's a fragile arrangement.

---

## USER-REPORTED ISSUE 2: Must click theme toggle once for correct theme

### Finding U2-1: React hydration strips data-mode (same root cause as U1-1)
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** Same as U1-1

The same hydration issue causes this symptom. After the `useEffect` re-applies `data-mode`, the CSS variables resolve correctly. But the `colorMode` React state was already initialized from `data-mode` BEFORE hydration stripped it. So the React state is correct, but the DOM attribute was temporarily wrong. When the user clicks the theme toggle, `handleModeChange` sets both the React state AND the DOM attribute, and from that point forward everything is in sync.

The key insight: the user doesn't need to click the toggle to "fix" the theme -- the useEffect already fixes it. But the brief flash of wrong theme (between hydration and useEffect) makes it *appear* broken. On slower connections or devices, this flash is more noticeable and may persist long enough that the user thinks it's stuck.

### Finding U2-2: ThemeToggle detectInitialMode() mutates DOM during render
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `src/components/ThemeToggle.tsx` lines 7-25, especially line 23

`detectInitialMode()` is called in `useState(() => detectInitialMode())` which executes during render. On line 23, if neither `data-mode` attribute nor `localStorage` provides a value, it calls `document.documentElement.setAttribute('data-mode', inferredMode)`. This is a DOM mutation during the render phase, which is a React anti-pattern. In concurrent mode, this could cause issues. In strict mode, it may execute twice.

When the parent component already controls the mode (which it always does in this app -- `controlledMode` is always provided), the internal `mode` state and `detectInitialMode()` are unnecessary.

**Fix:** When `controlledMode` is provided, skip the `detectInitialMode()` call entirely. Or better, remove the uncontrolled mode from ThemeToggle since it's always controlled.

---

## USER-REPORTED ISSUE 3: UI buttons overlap too much

### Finding U3-1: GlobalToolbar hidden behind FileUpload overlay at same z-index
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **File:** `src/components/GlobalToolbar.tsx` line 25, `src/components/FileUpload.tsx` line 135

`GlobalToolbar` uses `absolute right-4 z-10` and `FileUpload` uses `absolute inset-0 z-10`. Both are at z-10. The FileUpload renders AFTER GlobalToolbar in the DOM (page.tsx lines 344-362), so it stacks on top. The FileUpload has a semi-transparent background (`rgba(0,0,0,.32)`) with `backdrop-filter: blur(6px)`, making the toolbar buttons behind it blurry and hard to read.

**Fix:** Raise the GlobalToolbar z-index to `z-20` when the file upload overlay is showing, or restructure so the toolbar is above the overlay.

### Finding U3-2: Mobile users lose theme/locale access when track is loaded
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **File:** `src/components/GlobalToolbar.tsx` line 25

When `hasTrack` is true, the GlobalToolbar becomes `hidden sm:flex sm:top-[4.75rem]`, which means it's completely hidden on mobile (<640px). The theme toggle and language selector are only accessible through the TrackToolbar's mobile menu (Settings icon). This is a discoverability issue -- users may not know to look in the Settings menu for theme/locale options.

### Finding U3-3: TrackToolbar and track title may overlap on large screens
- **Severity:** LOW
- **Confidence:** LOW
- **File:** `src/components/TrackToolbar.tsx` line 87, `src/components/TrackWorkspace.tsx` line 119

The TrackToolbar is at `absolute top-4 right-4 z-10` and the track title is at `absolute left-4 right-56 top-4 z-10`. On desktop, the title's `right-56` (224px) should clear the toolbar. But if the toolbar wraps to multiple lines, it may extend down into the map controls area.

---

## USER-REPORTED ISSUE 4: Map does not load

### Finding U4-1: Map style fetch failure is silent
- **Severity:** HIGH
- **Confidence:** HIGH
- **File:** `src/components/MapView.tsx` lines 547-639

The MapView constructor only catches errors from `new maplibregl.Map()`. If the style JSON URL is incorrect or the fetch fails (network error, 404, CSP block), MapLibre fires an `error` event on the map instance but the component doesn't listen for it. The map container will be blank with no error message shown to the user.

**Fix:** Add `map.on('error', (e) => { ... })` listener to detect style load failures and show the `mapError` state.

### Finding U4-2: Map style URL path may be wrong depending on hosting
- **Severity:** HIGH
- **Confidence:** MEDIUM
- **File:** `src/types.ts` lines 23-46

The `MAP_STYLES` object constructs URLs using `BASE_PATH`:
```ts
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''
url: `${BASE_PATH}/map-styles/voyager.json`
```

In production, `BASE_PATH` is `/travelback`, so the URL becomes `/travelback/map-styles/voyager.json`. The built files are at `out/map-styles/voyager.json`. For GitHub Pages deployment, the site root is at `https://open330.github.io/travelback/` and files are served from the repository root, so `/travelback/map-styles/voyager.json` maps to `out/map-styles/voyager.json` -- this is correct.

However, MapLibre fetches the style JSON using `fetch()`, which uses the browser's URL resolution. The `connect-src 'self'` CSP directive allows same-origin requests. This should work on the deployed site.

**But:** If the app is accessed from a different URL path (e.g., local development where `BASE_PATH` is empty, but the production build is served), the URLs will be wrong. The `basePath` in `next.config.ts` is only set to `/travelback` in production mode. In development, `BASE_PATH` is empty and the map style URLs are `/map-styles/voyager.json`, which works with the Next.js dev server.

**Actual likely cause of user's map not loading:** The map may fail to load tiles if the CARTO CDN is unreachable (network restrictions, ad blockers, corporate firewalls). The raster tile URLs in the style JSON point to `https://*.basemaps.cartocdn.com`, which some ad blockers or privacy tools may block. The map container would appear but show a blank/gray area.

### Finding U4-3: Map container has `inert` and `aria-hidden` when no track loaded
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/MapView.tsx` lines 436-445

When no track is loaded, the map container has `inert` and `aria-hidden="true"` attributes set (line 438-439). The `inert` attribute prevents all user interaction with the map (panning, zooming, etc.) even though the map is visible. This is intentional -- on the landing page, the map is just a decorative background behind the file upload overlay. But it means users cannot interact with the map at all until they load a track.

This is by design and not a bug, but it could confuse users who expect to pan/zoom the map on the landing page.

---

## ADDITIONAL FINDINGS

### Finding A1: CSP `style-src 'unsafe-inline'` is required for MapLibre
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `scripts/harden-static-export.mjs` line 16

MapLibre GL JS dynamically injects `<style>` elements into the DOM for its internal styling. The production CSP includes `style-src 'self' 'unsafe-inline'` which allows this. This is a security trade-off -- removing `'unsafe-inline'` from `style-src` would break MapLibre. This is documented in deferred finding DF-C2-009.

### Finding A2: `next/image` used for static SVG adds unnecessary complexity
- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/FileUpload.tsx` lines 163-168

Using `next/image` for `landing-preview.svg` generates a wrapper `<span>` element and triggers an LCP warning about needing `loading="eager"`. A simple `<img>` tag would be sufficient for SVG files.

### Finding A3: Select dropdown doesn't match dark theme
- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/GlobalToolbar.tsx` lines 49-60

The `<select>` element's `<option>` children cannot be styled with CSS and will use the OS's native rendering. In dark mode, the dropdown will appear light-themed, creating a jarring contrast.

---

## SUMMARY OF FINDINGS

| ID | Finding | Severity | Confidence | User Issue |
|----|---------|----------|------------|------------|
| U1-1 | React hydration strips data-mode from <html> | HIGH | HIGH | #1, #2 |
| U1-2 | Body style lacks CSS variable fallbacks | MEDIUM | HIGH | #1 |
| U1-3 | CSS layer ordering may deprioritize theme vars | LOW | MEDIUM | #1 |
| U2-1 | Same root cause as U1-1 | HIGH | HIGH | #2 |
| U2-2 | ThemeToggle mutates DOM during render | MEDIUM | HIGH | #2 |
| U3-1 | GlobalToolbar hidden behind FileUpload overlay | MEDIUM | HIGH | #3 |
| U3-2 | Mobile users lose theme/locale access | MEDIUM | MEDIUM | #3 |
| U3-3 | TrackToolbar/title overlap potential | LOW | LOW | #3 |
| U4-1 | Map style fetch failure is silent | HIGH | HIGH | #4 |
| U4-2 | Map style URL path may be wrong on some hosts | HIGH | MEDIUM | #4 |
| U4-3 | Map container inert when no track (by design) | LOW | HIGH | #4 |
| A1 | CSP style-src unsafe-inline needed for MapLibre | LOW | HIGH | - |
| A2 | next/image for static SVG | LOW | HIGH | - |
| A3 | Select dropdown doesn't match dark theme | LOW | MEDIUM | - |
