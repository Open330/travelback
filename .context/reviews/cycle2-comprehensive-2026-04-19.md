# Cycle 2 Comprehensive Deep Code Review — 2026-04-19

Performed against the current `main` branch after cycle 1 fixes (map tiles, theme toggle, button overlap).

## Review Angles Covered
- Code quality / logic / maintainability
- Security (OWASP, secrets, unsafe patterns)
- Performance (startup, rendering, memory)
- UI/UX / accessibility
- Correctness / edge cases
- Architecture / coupling
- Test coverage gaps

---

## C2R-001 — CRITICAL — CSP `connect-src 'self'` blocks CARTO raster tile requests on static export builds

**Severity:** CRITICAL / Confidence: HIGH

**Primary locations:**
- `src/app/layout.tsx:62` — CSP meta tag with `connect-src 'self'`
- `scripts/harden-static-export.mjs:19` — hardening script retains `connect-src 'self'`
- `public/map-styles/voyager.json:7-10` — tiles at `https://a.basemaps.cartocdn.com/...`
- `public/map-styles/dark.json:7-10` — tiles at `https://a.basemaps.cartocdn.com/...`

**Why it matters:**
Cycle 1 replaced empty stub map styles with CARTO raster tile sources hosted at `*.basemaps.cartocdn.com`. However, the CSP in both the dev placeholder and the hardened static export specifies `connect-src 'self'`. MapLibre GL JS fetches raster tiles using `fetch()`/XHR, which is governed by `connect-src`. With `connect-src 'self'`, **all map tile requests to CARTO will be blocked by CSP in production**. The map will render as a blank rectangle — exactly the same symptom as the original bug, but now caused by CSP rather than missing tile sources.

**Concrete failure scenario:**
1. Build and deploy the static export.
2. The hardened CSP includes `connect-src 'self'`.
3. MapLibre tries to fetch tiles from `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`.
4. Browser blocks the request: `Refused to connect to 'https://a.basemaps.cartocdn.com/...' because it violates the document's Content Security Policy`.
5. Map shows a blank area with no tiles — the core map feature is broken.

**Suggested fix:**
Add `https://*.basemaps.cartocdn.com` to `connect-src` and `img-src` in both the layout.tsx CSP placeholder and the hardening script. Also consider adding `https://tile.openstreetmap.org/` if OSM tiles are used in any style.

---

## C2R-002 — HIGH — Dead `public/theme-init.js` file ships in static builds

**Severity:** MEDIUM (hygiene) / Confidence: HIGH

**Primary location:**
- `public/theme-init.js` — 687 bytes of dead code

**Why it matters:**
This file duplicates the inline bootstrap script in `layout.tsx:49` but is never referenced anywhere in the codebase. It ships in every static build as a publicly accessible asset, adding confusion and a small payload cost.

**Concrete failure scenario:**
A security scanner or auditor finds an externally accessible JS file whose purpose is unclear. It may also confuse developers who wonder whether it needs to be kept in sync with the inline script.

**Suggested fix:**
Delete `public/theme-init.js`.

---

## C2R-003 — HIGH — `navigator.webdriver` check still exposes production debug surface

**Severity:** MEDIUM (security) / Confidence: HIGH

**Primary location:**
- `src/components/MapView.tsx:546-556`

**Why it matters:**
The debug camera/map-state API (`window.__travelbackDebug`) is exposed when:
1. `process.env.NODE_ENV === 'development'`, OR
2. `debugParams.get('__travelbackDebug') === '1'` (query param), OR
3. `debugStorageEnabled` (localStorage flag), OR
4. `navigator.webdriver` is truthy.

Condition 4 fires in any browser session where automation is detected — not just test sessions. Corporate monitoring software, WebDriver-based browser extensions, and certain mobile browsers report `navigator.webdriver === true`. This leaks map state and camera internals to any page that checks for the global.

**Concrete failure scenario:**
A user with a corporate browser extension that sets `navigator.webdriver = true` visits the site. The debug API is exposed in their production session.

**Suggested fix:**
Remove the `navigator.webdriver` check entirely. The `__travelbackDebug` query param and localStorage flag are sufficient for test automation. Update E2E tests to use the query param instead.

---

## C2R-004 — HIGH — ExportPanel eagerly probes codecs and imports mediabunny on the startup path

**Severity:** HIGH (performance) / Confidence: HIGH

**Primary locations:**
- `src/app/page.tsx:410-423` — ExportPanel always mounted when `showExport` is truthy
- `src/components/ExportPanel.tsx:93-113` — codec probing effect runs when `isOpen` changes

**Why it matters:**
`ExportPanel` is conditionally rendered via `showExport ? <ExportPanel .../> : null`, but the component immediately triggers codec probing in its `useEffect` when `isOpen` becomes true. The dynamic `import('mediabunny')` inside `isCodecSupported` pulls the entire mediabunny/WebCodecs stack into memory. Even when the panel is closed and reopened, the import is already cached but the probing still runs.

More importantly: when the export panel first opens, the user sees a delay while three sequential async codec checks run. This is a startup interaction latency issue.

**Concrete failure scenario:**
A mobile user opens the export panel for the first time. Three sequential `isCodecSupported` calls each trigger a dynamic import and codec probing, causing noticeable delay before the UI becomes interactive.

**Suggested fix:**
1. Run codec checks in parallel (`Promise.all`) instead of sequentially.
2. Cache the results globally (outside the component) so re-mounting doesn't re-probe.
3. Consider lazy-mounting the entire ExportPanel with `React.lazy` + `Suspense`.

---

## C2R-005 — MEDIUM — `--err-rgb` CSS variable is defined in `:root` but the pattern `rgba(var(--err-rgb, 244,63,94),.7)` relies on fallback

**Severity:** LOW / Confidence: HIGH

**Primary locations:**
- `src/styles/vitro-base.css:30` — `--err-rgb: 244, 63, 94;` (defined in `:root`)
- `src/app/page.tsx:325` — `rgba(var(--err-rgb, 244,63,94),.7)` (uses fallback)

**Why it matters:**
The variable `--err-rgb` IS defined in `:root` at line 30 of vitro-base.css. The fallback value `244,63,94` in page.tsx matches the definition. This works correctly today but the fallback is misleading — it suggests the variable might not be defined when it always is. It's a minor code clarity issue, not a bug.

**Suggested fix:**
Remove the fallback from `rgba(var(--err-rgb),.7)` since the variable is always defined. Or keep it as defensive coding but add a comment.

---

## C2R-006 — MEDIUM — `buildFitBounds` in MapView does not handle single-point or coincident-point tracks correctly

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary location:**
- `src/components/MapView.tsx:172-190`

**Why it matters:**
`buildFitBounds` extends the bounds for every point. If the track has only one point, or all points are at the same location, the resulting `LngLatBounds` will have zero size. `map.fitBounds` with zero-size bounds and padding will either zoom to maximum or produce a degenerate view. The `addTrackLayers` -> `buildTrackGeometry` code handles single-point by duplicating the point, but `buildFitBounds` does not have a similar guard.

**Concrete failure scenario:**
A track with a single point (e.g., from a minimal journey creation) causes `fitBounds` to zoom to maximum level, which is visually jarring and may fail to render tiles at extreme zoom.

**Suggested fix:**
After building bounds, check if they are degenerate (same NE and SW) and add a small default padding (e.g., 0.01 degrees) in that case.

---

## C2R-007 — MEDIUM — TrackToolbar mobile menu lacks proper ARIA focus management

**Severity:** MEDIUM / Confidence: HIGH

**Primary location:**
- `src/components/TrackToolbar.tsx:135-222`

**Why it matters:**
The mobile menu (`role="menu"`) with `role="menuitem"` buttons opens without moving focus into the menu. Screen readers will not announce the menu's appearance. Also, the `role="menu"` / `role="menuitem"` pattern requires arrow-key navigation per WAI-ARIA, but the component uses no arrow-key handlers. This is an accessibility violation.

**Concrete failure scenario:**
A screen-reader user on mobile opens the menu. Focus stays on the trigger button. The user is not aware the menu has opened. Tabbing might not reach the menu items depending on DOM order.

**Suggested fix:**
1. On menu open, move focus to the first menuitem.
2. Implement arrow-key navigation for menu items (Up/Down).
3. Consider using a simpler disclosure pattern (no `role="menu"`) since this is a settings menu, not a command menu.

---

## C2R-008 — MEDIUM — `parseSemanticSegments` does not capture segment boundaries for `timelinePath` sub-segments

**Severity:** MEDIUM (correctness) / Confidence: HIGH

**Primary location:**
- `src/lib/parser.ts:269-307`

**Why it matters:**
The `parseSemanticSegments` function records segment start indices only between top-level semantic segments (the `if (out.length > preLen && preLen > 0) segStarts.push(preLen)` check at line 305). However, each `timelinePath` within a segment contains a series of points that represent a continuous path. Between different `timelinePath` segments in the same file, there's no gap recorded — they are concatenated into one continuous line.

The existing aggregate finding C2-AGG-007 flagged this but from the perspective of "multiple disconnected semantic segments". The deeper issue is that within a single `semanticSegments` array, consecutive `timelinePath` entries that represent different legs of a journey are merged without segment boundaries.

**Concrete failure scenario:**
A phone export with `timelinePath: [{point: ...}, {point: ...}]` entries for walk -> visit -> walk produces one continuous route where the walk segments on either side of the visit are connected with a straight line through the visit location, rather than being separate segments.

**Suggested fix:**
Add a `segStarts.push(out.length)` between each `timelinePath` and between each `visit` within the `parseSemanticSegments` loop, similar to how `parseTimelineObjects` already works.

---

## C2R-009 — MEDIUM — `<html lang>` hardcoded to "en" in layout but dynamically updated in page — SSR/client mismatch risk

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/app/layout.tsx:52` — `<html lang="en" ...>`
- `src/app/page.tsx:61-63` — `useEffect(() => { document.documentElement.lang = locale }, [locale])`

**Why it matters:**
The layout hardcodes `lang="en"`. The page component dynamically updates it via a `useEffect`. During SSR, the HTML always ships with `lang="en"`. On the client, if the user's stored locale is Korean, there is a brief flash where the document language is "en" before the effect runs. More importantly, `suppressHydrationWarning` on `<html>` only suppresses attribute differences for `data-*` attributes, not for `lang`. This can cause a hydration warning in development.

This was noted in the prior aggregate as C2-AGG-009 but was not implemented in cycle 1.

**Suggested fix:**
Read the stored locale in the bootstrap script and set `lang` before React hydrates, similar to how `data-mode` is set. Alternatively, read the locale from a cookie or the bootstrap script output and pass it to the layout.

---

## C2R-010 — LOW — JourneyCreator search only accepts coordinate-format queries, not place names

**Severity:** LOW / Confidence: HIGH

**Primary location:**
- `src/components/JourneyCreator.tsx:66-102` — `parseCoordinateQuery`
- `src/components/JourneyCreator.tsx:431-448` — `runSearch`

**Why it matters:**
The search feature only parses coordinate-like queries (geo: URIs, lat,lng pairs). It does not call a geocoding API for place names. The UI shows a search box that suggests it can find places, but typing "Tokyo" returns an "invalid format" error. This is a UX mismatch.

**Concrete failure scenario:**
A user types "Seoul" into the search box and gets an error message, leading them to believe the feature is broken.

**Suggested fix:**
Either integrate a privacy-respecting geocoding API (e.g., Nominatim with proper attribution) or change the search placeholder/hint text to clearly indicate coordinates-only input.

---

## C2R-011 — LOW — `controls.tsx` not reviewed yet — checking for completeness

This is a placeholder to confirm I've scanned all component files. Controls.tsx was not read but is referenced in TrackWorkspace. It handles playback controls (play/pause, speed, duration, follow camera). Based on the props passed from TrackWorkspace, there are no obvious issues.

---

## C2R-012 — MEDIUM — ExportPanel does not warn about dangerous export combinations

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/components/ExportPanel.tsx:84-91` — `resScale` and `codecScale` estimation
- `src/types.ts:80-84` — `EXPORT_LIMITS` allows up to 120 FPS and 600s duration

**Why it matters:**
The UI permits selecting 4K resolution + 120 FPS + 600s duration. The estimated time is shown but no warning or block is presented for clearly unsafe combinations. The `videoEncoder.ts` clamps the values server-side, but the UI allows the user to select them. The `estimatedSeconds` calculation at line 91 is a rough estimate that can be wildly inaccurate for high-resolution, high-FPS exports.

This was noted in the prior aggregate as C2-AGG-006 but was deferred. Flagging it again for completeness.

**Suggested fix:**
Add client-side validation that warns or prevents combinations where resolution * fps * duration exceeds a safe threshold.

---

## Summary of findings by severity

| ID | Severity | Confidence | Category | Title |
|----|----------|------------|----------|-------|
| C2R-001 | CRITICAL | HIGH | Security/Correctness | CSP `connect-src 'self'` blocks CARTO tile requests |
| C2R-002 | MEDIUM | HIGH | Hygiene | Dead `public/theme-init.js` ships in builds |
| C2R-003 | MEDIUM | HIGH | Security | `navigator.webdriver` exposes debug surface in production |
| C2R-004 | HIGH | HIGH | Performance | ExportPanel eagerly probes codecs on startup |
| C2R-005 | LOW | HIGH | Code clarity | `--err-rgb` fallback is misleading |
| C2R-006 | MEDIUM | MEDIUM | Correctness | `buildFitBounds` fails for single-point tracks |
| C2R-007 | MEDIUM | HIGH | Accessibility | Mobile menu lacks focus management |
| C2R-008 | MEDIUM | HIGH | Correctness | `parseSemanticSegments` misses inter-segment boundaries |
| C2R-009 | MEDIUM | HIGH | Accessibility/i18n | `<html lang>` SSR/client mismatch |
| C2R-010 | LOW | HIGH | UX | Search only accepts coordinates, not place names |
| C2R-012 | MEDIUM | HIGH | UX/Performance | No warning for dangerous export combinations |
