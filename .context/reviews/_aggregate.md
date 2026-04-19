# Prompt 1 aggregate review — cycle 2 (refresh)

Generated on 2026-04-19 after a fresh comprehensive review of the current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle2-comprehensive-2026-04-19.md`) covering code quality, security, performance, UX, correctness, architecture, accessibility
- Prior aggregate (`_aggregate.md` from earlier this session) reviewed for carried-forward items
- Prior deferred findings (`deferred-findings-cycle2-2026-04-19.md`) reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- Deduped overlapping findings and kept the highest severity / confidence.
- Promoted C2R-001 (CSP blocks tiles) to CRITICAL — it directly breaks the core map feature.
- Carried forward still-valid deferred items as-is (they remain deferred per the existing rules).

## Merged findings (active, to be addressed)

### C2-AGG-001 — CRITICAL — CSP `connect-src 'self'` blocks CARTO raster tile requests
**Cross-agent agreement:** fresh review, security angle
**Primary locations:**
- `src/app/layout.tsx:62`
- `scripts/harden-static-export.mjs:19`
- `public/map-styles/voyager.json:7-10`
- `public/map-styles/dark.json:7-10`
- `public/map-styles/positron.json`, `liberty.json`, `bright.json`

**Why it matters:**
Cycle 1 added CARTO raster tile sources but did not update CSP. `connect-src 'self'` blocks MapLibre's `fetch()` calls to `*.basemaps.cartocdn.com`, making the map blank in production — the same symptom as the original bug.

**Suggested fix:**
Add `https://*.basemaps.cartocdn.com` to `connect-src` in both layout.tsx and the hardening script.

**Confidence:** High

---

### C2-AGG-002 — MEDIUM — Dead `public/theme-init.js` ships in static builds
**Cross-agent agreement:** fresh review, code quality angle
**Primary location:**
- `public/theme-init.js`

**Why it matters:**
Dead code that duplicates the inline bootstrap script. Ships as a public asset for no reason.

**Suggested fix:**
Delete the file.

**Confidence:** High

---

### C2-AGG-003 — MEDIUM — `navigator.webdriver` still exposes debug surface in production
**Cross-agent agreement:** fresh review, security angle; also flagged in prior aggregate as C2-AGG-004
**Primary location:**
- `src/components/MapView.tsx:546-556`

**Why it matters:**
Production sessions where `navigator.webdriver` is truthy (automation extensions, corporate monitoring) expose `window.__travelbackDebug`.

**Suggested fix:**
Remove the `navigator.webdriver` check. Use query param + localStorage flag for test automation only.

**Confidence:** High

---

### C2-AGG-004 — HIGH — ExportPanel eagerly probes codecs and imports mediabunny
**Cross-agent agreement:** fresh review, perf angle; same as prior C2-AGG-001
**Primary locations:**
- `src/app/page.tsx:410-423`
- `src/components/ExportPanel.tsx:93-113`

**Why it matters:**
Codec checks run sequentially and each triggers a dynamic import. First-open latency is noticeable on mobile.

**Suggested fix:**
1. Run codec checks in parallel with `Promise.all`.
2. Cache results globally to avoid re-probing on re-mount.
3. Consider `React.lazy` for the entire ExportPanel.

**Confidence:** High

---

### C2-AGG-005 — MEDIUM — `buildFitBounds` fails for single-point / coincident-point tracks
**Cross-agent agreement:** fresh review, correctness angle
**Primary location:**
- `src/components/MapView.tsx:172-190`

**Why it matters:**
Zero-size bounds cause `fitBounds` to zoom to maximum level.

**Suggested fix:**
Detect degenerate bounds and add a small default padding (e.g., 0.01 degrees).

**Confidence:** Medium

---

### C2-AGG-006 — MEDIUM — TrackToolbar mobile menu lacks proper ARIA focus management
**Cross-agent agreement:** fresh review, accessibility angle
**Primary location:**
- `src/components/TrackToolbar.tsx:135-222`

**Why it matters:**
`role="menu"` / `role="menuitem"` without arrow-key navigation or focus management is an ARIA violation.

**Suggested fix:**
Move focus into menu on open. Implement Up/Down arrow-key navigation, or use a simpler disclosure pattern without `role="menu"`.

**Confidence:** High

---

### C2-AGG-007 — MEDIUM — `<html lang>` hardcoded to "en" — SSR/client mismatch
**Cross-agent agreement:** fresh review, accessibility/i18n angle; same as prior C2-AGG-009
**Primary locations:**
- `src/app/layout.tsx:52`
- `src/app/page.tsx:61-63`

**Why it matters:**
Screen readers announce the wrong language before the effect runs. Hydration warning risk.

**Suggested fix:**
Set `lang` in the bootstrap script or read from a cookie.

**Confidence:** High

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in `deferred-findings-cycle2-2026-04-19.md` and are NOT scheduled for this cycle:
- DF-C2-001: Mobile information architecture gaps (designer)
- DF-C2-002: Playback progress drives whole-app rerenders
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap

## Recommended implementation order for this cycle
1. **C2-AGG-001 (CRITICAL)**: Fix CSP to allow CARTO tile requests — without this the map is broken in production.
2. **C2-AGG-002**: Delete dead `theme-init.js`.
3. **C2-AGG-003**: Remove `navigator.webdriver` debug surface.
4. **C2-AGG-004**: Parallelize codec checks and cache results.
5. **C2-AGG-005**: Fix single-point `buildFitBounds`.
6. **C2-AGG-006**: Fix mobile menu ARIA.
7. **C2-AGG-007**: Fix `<html lang>` SSR/client mismatch.
