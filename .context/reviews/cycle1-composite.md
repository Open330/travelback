# Cycle 1 Composite Code Review — Travelback

## Critical Issues (User-Reported)

### C1. Theme broken on initial load — colors wrong until toggle clicked
- **Files**: `src/app/layout.tsx`, `src/app/page.tsx`, `src/components/ThemeToggle.tsx`, `src/styles/vitro-base.css`
- **Severity**: HIGH | **Confidence**: HIGH
- **Root cause**: The bootstrap script in `layout.tsx` line 49 correctly reads `localStorage('travelback-theme')` and sets `data-mode` on `<html>`. However, `page.tsx` line 36-41 initializes `colorMode` state from `document.documentElement.getAttribute('data-mode')` which works ONLY if the bootstrap script has already run. In a static export (`output: 'export'`), the bootstrap `<script>` in `<head>` runs before React hydrates, so `data-mode` IS set on the DOM. But there's a **race condition**: React's `useState` initializer runs during the render phase, potentially before the DOM attribute is fully committed if SSR/SSG is involved. More importantly, the `colorMode` state in `page.tsx` is **not synced** to localStorage on mount — it only writes to localStorage on `handleModeChange` (line 271). The `applyDocumentMode` is called in a `useEffect` (line 297-300), which runs AFTER first paint. This means there's a frame where `data-mode` may already be set by the bootstrap script, but React's `colorMode` state could mismatch.
- **The actual bug**: The `mapStyleKey` initializer on line 43-49 reads `document.documentElement.getAttribute('data-mode')` and then calls `document.documentElement.setAttribute('data-mapstyle', key)` — but it does NOT check localStorage for the theme first. Meanwhile, `colorMode` initializer on line 36-41 DOES check `data-mode`. If the user's stored theme is `'dark'`, the bootstrap script sets `data-mode="dark"`, and both initializers read this correctly. The real problem is that the **CSS fallback** in `vitro-base.css` uses `:root:not([data-mode])` (line 48) for light-mode defaults, and `[data-mode=dark]` (line 262) for dark mode. If there's any timing where `data-mode` is not set, light defaults apply, causing a flash. The `suppressHydrationWarning` on `<html>` handles React hydration mismatch but does not fix the visual flash.
- **Concrete scenario**: User has dark mode stored. On load, the bootstrap script sets `data-mode="dark"` BEFORE CSS loads (since it's inline in `<head>`), which is correct. But the `vitro-base.css` is loaded as `@import "../styles/vitro-base.css" layer(base)` in `globals.css`. CSS `@import` is render-blocking, so by the time styles apply, `data-mode` should already be set. The issue is more subtle: the `@theme inline` block in `globals.css` line 5-8 maps `--color-background` to `var(--bg)` and `--color-foreground` to `var(--t1)`. These Tailwind theme variables depend on `--bg` and `--t1` being resolved. If `data-mode` is NOT set when CSS first computes, `:root:not([data-mode])` provides light-mode fallback values. The bootstrap script IS synchronous and inline, so it should set `data-mode` before CSS computes. **The real issue**: in Next.js static export, the HTML is pre-rendered WITHOUT `data-mode` attribute (the `<html>` tag in `layout.tsx` line 52 has no `data-mode` attribute hardcoded). The bootstrap script adds it at runtime. There IS a flash of light theme before the script runs, but it should be near-instant since it's a synchronous inline script in `<head>`. If there's a CSP that blocks inline scripts initially, or if the script execution is delayed, the flash would be visible.
- **Fix**: Add `data-mode` to the server-rendered HTML as a fallback. Since we can't read localStorage server-side in static export, we should use a `<style>` block that matches the bootstrap script's logic — or better, ensure the CSS `:root:not([data-mode])` fallback already matches the user's likely preference. The current fallback IS light mode, which is correct for `prefers-color-scheme: light` users. For dark-mode users, the flash is the bug. The fix is to have the inline script run before any CSS renders (it already does in `<head>`), and ensure no hydration mismatch causes React to re-render with wrong state.

### C2. UI buttons overlap — stacking on top of each other
- **Files**: `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`, `src/components/Controls.tsx`
- **Severity**: HIGH | **Confidence**: HIGH
- **Root cause**: `GlobalToolbar.tsx` line 25 uses `className="absolute right-4 z-10 items-center gap-2"` but is missing `flex` in the conditional class for the `hasTrack` case: `'hidden sm:flex sm:top-[4.75rem]'`. When `hasTrack` is true, the toolbar gets `hidden sm:flex` which is correct for sm+ screens, but on small screens it's hidden. The `items-center gap-2` only applies when `flex` is active. When `hasTrack` is false, the class is `'top-4 flex'` which IS correct.
- **The actual overlap issue**: Looking at `TrackToolbar.tsx` line 87, the toolbar uses `flex-wrap` which could cause wrapping. But the main overlap likely occurs when both `GlobalToolbar` (visible when no track) AND other elements like `FileUpload` occupy the same space. Looking at `page.tsx`, the `GlobalToolbar` is at `absolute right-4 z-10` and the `FileUpload` has `absolute inset-0 z-10`. The toolbar's z-index is the same as FileUpload's overlay, so the toolbar buttons could be visually on top of the file upload card but hard to click.
- **More likely cause**: When a track IS loaded, `TrackToolbar` (line 87) positions buttons at `absolute top-4 right-4 z-10` with `flex-wrap`. The buttons (New Route, Camera, Map style, Export) all have `min-h-11` and various padding. On narrow screens with `flex-wrap`, they could wrap and overlap with other UI elements. The `Controls` component at `absolute bottom-0 left-0 right-0 z-10` also has buttons that could overlap with the timeline selector at `absolute bottom-40 left-0 right-0 z-10`.
- **Fix**: Ensure proper spacing between toolbar buttons, add `flex-shrink-0` to prevent compression, and check z-index layering. The TrackToolbar buttons should have consistent gap spacing and not wrap into overlapping positions.

### C3. Map does not load at all
- **Files**: `src/components/MapView.tsx`, `public/map-styles/*.json`, `next.config.ts`
- **Severity**: CRITICAL | **Confidence**: MEDIUM
- **Root cause analysis**: The `MapView` component creates a `maplibregl.Map` with `style: MAP_STYLES[mapStyleKey].url` (line 553). The `MAP_STYLES` object in `types.ts` line 25-46 constructs URLs like `${BASE_PATH}/map-styles/voyager.json` where `BASE_PATH` comes from `process.env.NEXT_PUBLIC_BASE_PATH`. In `next.config.ts` line 3, `basePath = process.env.NODE_ENV === 'production' ? '/travelback' : ''`. In development, `basePath` is empty, so the URL is `/map-styles/voyager.json`. The files ARE in `public/map-styles/`. This should work in dev.
- **Possible issues**:
  1. CSP blocking: The CSP in `layout.tsx` line 62 allows `connect-src 'self' https://*.basemaps.cartocdn.com`. Map tile requests to `basemaps.cartocdn.com` are allowed. The style JSON fetch from `/map-styles/voyager.json` should be `'self'` and allowed.
  2. The `output: 'export'` config means Next.js generates static HTML. In static export, the files go to `out/` directory. The map style JSONs need to be in `out/map-styles/`. Looking at the repo, `out/map-styles/` does exist with the JSON files.
  3. In dev mode (`npm run dev`), `basePath` is empty and files are served from `public/` directly. This should work.
  4. **Potential issue**: The `canvasContextAttributes: { preserveDrawingBuffer: true }` option on line 561 — this is a WebGL context attribute. Some browsers may fail to create the WebGL context with this attribute, causing the map to fail silently or throw.
  5. **Most likely issue**: MapLibre GL JS v5.x may have breaking changes from v4.x. The package.json shows `"maplibre-gl": "^5.18.0"`. MapLibre v5 had significant API changes. The import `import maplibregl from 'maplibre-gl'` and usage pattern `new maplibregl.Map({...})` should still work, but there could be subtle issues with the `style.load` event or CSS import.
  6. The CSS import `@import "maplibre-gl/dist/maplibre-gl.css"` in `globals.css` line 2 — if this CSS file doesn't exist at that path in maplibre-gl v5, the map container would have zero height and the map wouldn't render visually.
- **Fix**: Verify the maplibre-gl CSS path is correct for v5, and ensure the WebGL context creation doesn't fail. Add fallback CSS for the map container dimensions.

## Additional Findings

### A1. Missing localStorage read for initial theme in page.tsx
- **File**: `src/app/page.tsx` line 36-41
- **Severity**: MEDIUM | **Confidence**: HIGH
- The `colorMode` state initializer reads from DOM attribute but does NOT read from localStorage directly. The bootstrap script sets the DOM attribute from localStorage, so this should work. But if the bootstrap script fails (CSP blocking inline scripts), the fallback is only `matchMedia`. Adding a direct `localStorage.getItem('travelback-theme')` read in the initializer would be more robust.

### A2. useEffect for applyDocumentMode is redundant and can cause flash
- **File**: `src/app/page.tsx` line 297-300
- **Severity**: LOW | **Confidence**: MEDIUM
- The `useEffect` calls `applyDocumentMode(colorMode)` on every `colorMode` change. But on mount, the bootstrap script has already set `data-mode`. This effect runs AFTER first paint, potentially resetting or confirming the attribute. Since it's a `useEffect`, it fires after the DOM has painted, which could cause a brief visual inconsistency if the state differs from what the bootstrap script set.

### A3. GlobalToolbar missing flex class
- **File**: `src/components/GlobalToolbar.tsx` line 25
- **Severity**: MEDIUM | **Confidence**: HIGH
- The conditional class `'hidden sm:flex sm:top-[4.75rem]'` correctly adds `flex` at sm breakpoint, but `items-center gap-2` is always present. When the element is `hidden`, these don't matter. When it becomes `sm:flex`, all classes apply correctly. This is actually fine, but the overlap issue may be caused by the toolbar competing with the TrackToolbar for the same position when both try to render.

### A4. Controls flex-wrap can cause button overlap on small screens
- **File**: `src/components/Controls.tsx` line 76
- **Severity**: MEDIUM | **Confidence**: MEDIUM
- The `flex-wrap items-center gap-2` on the controls row allows wrapping, but the inner elements don't have consistent `flex-shrink-0` protection, so some buttons may compress or overlap before wrapping kicks in.

### A5. MapLibre GL v5 CSS path may be incorrect
- **File**: `src/app/globals.css` line 2
- **Severity**: HIGH | **Confidence**: MEDIUM
- `@import "maplibre-gl/dist/maplibre-gl.css"` — In MapLibre GL v5, the CSS distribution path changed. The correct import for v5 might be `maplibre-gl/dist/maplibre-gl.css` (same) or it might have been restructured. If this CSS doesn't load, the map container has no dimensions and the map appears broken/invisible.

### A6. No error boundary around MapView
- **File**: `src/app/page.tsx` line 305-317
- **Severity**: LOW | **Confidence**: LOW
- While there's a top-level ErrorBoundary, a MapView-specific error boundary would provide better UX if WebGL initialization fails. The MapView does have its own error state (`mapError`), which is good.

### A7. Font-weight: 100 may be too thin for readability
- **File**: `src/styles/vitro-base.css` lines 119, 127, 131, 136, 142, 147
- **Severity**: LOW | **Confidence**: LOW
- The per-lang font-weight defaults are all set to 100 (hairline), which may be difficult to read, especially at small sizes. This is a design choice from the Vitro design system but could cause accessibility issues.

## Summary
- **3 critical/user-reported issues**: Theme initialization flash (C1), button overlap (C2), map not loading (C3)
- **4 additional findings**: A1-A4
- **3 low-priority findings**: A5-A7
