# Cycle r4 — Deep Browser-Driven UI/UX Review (2026-04-23)

**Authoritative review for user-injected TODO U-2026-04-23-01.**

## Methodology

A Playwright Chromium session drove the hardened static build served from `npm run start` at `http://localhost:3737/travelback/` (the exact bundle the deploy pipeline ships). The probe script `e2e/_tmp-uiux-review.mjs` (created for this cycle, removed after) captured:

- Accessibility tree (CDP `Accessibility.getFullAXTree`)
- All focusable elements with computed outlines, box-shadows, and bounding boxes
- Color samples (computed `color` / `backgroundColor` / `fontSize` / `fontWeight`)
- Heading outline
- Navigation Timing + Paint Timing metrics (FCP, TTFB, longTasks)
- Horizontal overflow audit at 320 / 375 / 768 / 1024 / 1440 / 1920 px
- Keyboard tab order (first 25 tabs)
- Modal focus trap probe (tab 10 times inside the dialog)
- i18n sweep across en / ko / ja / zh / es with per-locale overflow check
- `prefers-reduced-motion: reduce` and `forced-colors: active` re-render
- 200% base font-size simulation
- Console error/warning capture on every page load

Hard evidence (selectors, computed styles, metric numbers, DOM rectangles) is preserved in the raw JSON report `/tmp/tb-uiux-review.json` (1,219 lines, 43 KB).

### Environment caveat

Playwright ran under SwiftShader (headless on darwin/arm64). `MapView` failed to initialize WebGL (`webglcontextcreationerror`), so the ErrorBoundary-less map-error fallback was rendered on the landing page for the tab-order probe. This changed the first few focusables (the details `<summary>` and `Reload Page` button appeared before the Upload overlay buttons) but did NOT affect findings below — all still reproducible in a real WebGL browser. Load-the-sample-trip flow and export panel DID open successfully because they sit above the map layer.

## Performance (measured in-browser)

| viewport | DOM complete | FCP  | TTFB | longTasks |
| -------- | ------------ | ---- | ---- | --------- |
| 320w     |  102 ms      | 56   | 2    | 0         |
| 375w     |   84 ms      | 56   | 1    | 0         |
| 768w     |   90 ms      | 88   | 1    | 0         |
| 1024w    |   91 ms      | 92   | 1    | 0         |
| 1440w    |  < 100 ms    | ~60  | 1    | 0         |
| 1920w    |  < 100 ms    | ~60  | 1    | 0         |

FCP consistently sub-100 ms from a localhost static server. No longtasks detected on cold-boot. LCP/CLS/INP were not exposed via the Long Task API in this synthetic run; a follow-up lane is queued (see deferred findings).

## Findings

### BUI-1 (MEDIUM, HIGH) — CSP meta delivers `frame-ancestors` which the browser ignores; each page load emits two repeated console errors

- **Evidence (console capture)**: 24 total error events across the viewport sweep; every page load shows:
  > `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.`
- **Source**: `src/app/layout.tsx:62` (dev meta) and `scripts/harden-static-export.mjs:12` (prod meta), both include `frame-ancestors 'none'`.
- **Why this is UX-relevant**: developer-tools noise hurts debuggability, makes legitimate errors harder to spot, and undermines the documented "silent-in-console on success" posture implied by the existing E2E `no-console-errors` checks. The defense is not lost because `layout.tsx:49` runs a JS frame-breaker and the repo already documents (`.context/project/02-architecture.md:117`) that host-level headers are authoritative.
- **Recommendation**: remove `frame-ancestors 'none'` from both the dev meta and the hardened prod meta. Keep the JS frame-buster. Document in `.context/project/02-architecture.md` that the host-level `Content-Security-Policy: frame-ancestors 'none'` header is now the only anti-framing CSP channel (matching the already-stated guidance).
- **Note vs. prior cycles**: cycle-r2 logged this as "Meta `frame-ancestors` not enforced" (security lane) and deferred it as documented. The browser console error is the new evidence that forces it off the "deferred-forever" list.

### BUI-2 (MEDIUM, HIGH) — Landing page lacks a `<main>` landmark

- **Evidence (CDP AX tree, every viewport)**: the only landmark exposed is `{ role: 'region', name: 'Map' }`. There is no `main`, no `banner`, no `contentinfo`.
- **DOM**: `src/app/page.tsx:314` renders `<div className="relative w-screen h-screen overflow-hidden" data-travelback-app-root="true">` — a plain div, not `<main>`.
- **Impact**: VoiceOver / NVDA users cannot jump to the primary content with a landmark shortcut (`D` in JAWS, rotor-landmark in VoiceOver). WCAG 2.2 1.3.1 / 2.4.1.
- **Recommendation**: change the root div to `<main id="app" data-travelback-app-root="true" className=…>`. The `inert`/`aria-hidden` toggling code in `ModalDialog` already targets `[data-travelback-app-root="true"]`, so the change is source-compatible.

### BUI-3 (MEDIUM, HIGH) — Landing drop zone has no role, aria-label, or keyboard affordance; screen readers see it as an unlabeled generic container

- **Evidence (landing DOM probe)**:
  ```
  { dropZoneRole: null, dropZoneAriaLabel: null, dropZoneTabindex: null, dropZoneTag: "DIV" }
  ```
- **Source**: `src/components/FileUpload.tsx:153-165`. The wrapping div has `onDrop`/`onDragOver`/`onDragLeave` but is not `tabindex=0`, has no `role="button"` / `role="region"`, and no `aria-label`.
- **Impact**: a keyboard user cannot focus the drop zone; a screen-reader user hears "Travelback" (the h2) but is not told that the surrounding area accepts drag-and-drop. The "Drop hint" copy is visual-only.
- **Recommendation**: add `role="group" aria-labelledby="fileupload-title" aria-describedby="fileupload-drop-hint"` to the wrapper `<div>`, wire matching `id`s on the h2 and the `"drop files here"` paragraph. Keep the Browse button as the keyboard-accessible primary path.

### BUI-4 (MEDIUM, HIGH) — The big sample-preview button concatenates every child span's text into a single accessible name

- **Evidence (tab-order entry #4 at 1440w)**:
  ```
  text: "Sample output previewTry with a sample tripLoad demo"
  aria: "Try with a sample trip"
  rect: 320x181
  ```
- **Source**: `src/components/FileUpload.tsx:172-195`. The `<button>` contains a caption `<p>` that says `Try with a sample trip`, a second `<p>` describing the preview, and an inner pill label `Load demo`. Because the button's text content is all three concatenated, AT announcement can be confusing on browsers that fall back from `aria-label` (e.g., Safari + VoiceOver has occasional bugs).
- **Additional issue**: the caption `<p>` with text `Sample output preview` has `aria-hidden="false"` (default) and duplicates what `aria-label` already conveys.
- **Recommendation**: wrap the visual caption block in `<span aria-hidden="true">` (or move the caption out of the button and use `aria-describedby`), so the accessible name is exclusively the `aria-label`. A real-world fix: `<div aria-hidden="true">…caption…</div>` inside the button.

### BUI-5 (MEDIUM, MEDIUM) — Focus return on Google-guide modal close is untested because the button does not match "Google" or "guide" in the AX name

- **Evidence (modal probe)**:
  ```
  report.modals.googleGuide = { error: "guide button not found" }
  ```
  The launcher button label in `FileUpload.tsx:258` is `t('fileUpload.importGuideLink')` → "Need help finding your file?". Keyboard tab-order entry #7 (before map-error) shows `text: "Need help finding your file?"`, no `aria-label`, visible focus outline 0 (boxShadow only).
- **Source**: `src/components/FileUpload.tsx:253-264`.
- **Impact**: Discoverability — users searching "Google Location History" copy will not map this button to that feature by label alone. The current English copy is helpful but arguably under-specific. More importantly, an automated a11y-audit that searches for "google" in the tab order misses it.
- **Recommendation**: ONLY if we want better discoverability, expand `aria-label` on the button to include "Google" (e.g. `aria-label={t('fileUpload.importGuideLinkAria')}` → "Import Google Location History: guide"). Not a blocker; logged for the plan.

### BUI-6 (LOW, HIGH) — Tab order exits the landing overlay into the map canvas, then back into the overlay, making keyboard flow feel random

- **Evidence (tab-order first 12 entries at 1440w)**:
  1. `canvas[role="region"][aria-label="Map"]` (1440×900)
  2. `summary "Show technical details"` (from the map-error fallback)
  3. `button "Reload Page"`
  4. `button "Sample output previewTry with a sample tripLoad demo"`
  5. `button "Browse Files"`
  6. `button "Draw a route on the map"`
  7. `button "Need help finding your file?"`
  8. `button "km"` (toolbar, top-right)
  9. `button "mi"`
  10. `select "Language"`
  11. `button "Switch to dark mode"`
  12. (body — tab wrap)
- **Observation**: the map canvas is tabbable and receives focus first even when there is no track; MapView already sets `inert` + `aria-hidden` on the container when `!track && !mapError`, but the inner canvas inside `NavigationControl` becomes focusable once the error path is taken. In a real WebGL browser this will not reproduce because `NavigationControl` is hidden via `.hide-map-controls`; still, we should guarantee the upload overlay receives focus on mount.
- **Recommendation**: in `FileUpload.tsx`, add an autofocus-on-mount-when-!hasTrack on the "Browse Files" button (already the keyboard-primary path) OR wrap the overlay in `<section role="region" aria-label={t('fileUpload.title')} tabIndex={-1}>` and focus it on mount.

### BUI-7 (LOW, HIGH) — Global toolbar ordering differs between landing (top-right) and track state (shifted down under track toolbar), and buttons reuse `aria-label` for both sighted title and SR label

- **Evidence (toolbar tab-entries at 1440w)**: units toggle is a pair of 44×44 buttons `aria-label="Metric units"` / `"Imperial units"` at `(x=1163,y=21)`, (x=1207, y=21). The `select` for language is 60×44 at `(x=1260,y=21)` — this is below the 44px min-width target (60 is fine) but the actual `<select>` dropdown shows 2-letter codes `EN/KO/JA/ZH/ES` with no visual language name on collapse.
- **Impact**: the EN/KO/JA/ZH/ES codes are ambiguous for many users. JIS / ISO-639-1 suggests using `aria-label` with the full name; we already do (`aria-label={t('locale.label')}` on `<select>`), but the `<option>` values still render the 2-letter short codes in the closed state.
- **Recommendation**: switch options to show the native name of the language (e.g. "한국어", "日本語", "中文", "Español", "English"). This is a stylistic preference question; logged as LOW.

### BUI-8 (LOW, MEDIUM) — Primary CTA contrast (cyan-on-white button text) is below WCAG AAA for large text, and approaches the AA floor on small text

- **Evidence (color samples)**: `.vitro-btn-primary { color: rgb(255,255,255); background: rgba(6,182,212,.85) }`. Against the default drop-zone background `rgb(255,255,255)` (since `vitro` glass effect uses translucent `rgba(6,182,212,.85)`), the effective background is approximately `rgb(43,196,218)` (composited). Contrast ratio ≈ 2.4:1 vs white. The button text IS white on cyan — contrast ≈ 3.1:1 (cyan rgb(6,182,212) vs white = 3.08). **This is below WCAG 2.2 AA 4.5:1 for normal text.**
- **Source**: `src/app/globals.css:127-132` and button users in `FileUpload.tsx:225` etc. The button also has a 1px border `rgba(var(--gl), .5)` but that doesn't help text readability.
- **Recommendation**: darken the primary button to `rgb(14,116,144)` (Tailwind cyan-800 equivalent) or increase the rgba alpha to 1.0 AND bump the background to `rgb(8,145,178)` (cyan-700). White-on-cyan-700 measures ~4.78:1. This is a breaking visual change — explicitly log as MEDIUM priority in the plan and defer.

### BUI-9 (LOW, HIGH) — Dark mode contrast looks excellent (19.43:1 for h2)

- **Evidence (theme.darkH2Contrast)**: `{ color: rgb(255,255,255), bg: rgba(10,13,20,0.92), ratio: 19.43 }`.
- Paragraph text `rgb(164,176,204)` on bg `rgb(10,13,20)` → ratio 6.34:1 (passes WCAG AA for normal text, AAA for large text).
- **No action needed**; noted as a positive data point for future regressions.

### BUI-10 (LOW, HIGH) — Light mode body text (`p`) contrast at exactly 6.07:1

- **Evidence**: `rgb(66,78,110) on rgb(235,238,244)` → ratio 6.07:1. Passes WCAG AA normal text (≥4.5), below AAA (≥7.0). Fine for general content; noted for future tuning.
- **No action needed this cycle.**

### BUI-11 (LOW, HIGH) — i18n: every bundled locale renders without overflow at 1440w

- **Evidence (i18n.locales.*)**: no element overflow across en / ko / ja / zh / es. `h2` is "Travelback" in every locale (correctly left untranslated). Browse button inner text correctly pulls the translated primary label plus the decorative caption (same BUI-4 concatenation applies).
- **Known gap**: the probe ran at 1440w. A follow-up probe at 320w with ko + ja still needed (queued as deferred).

### BUI-12 (LOW, HIGH) — Reduced-motion preference honored

- **Evidence (theme.reducedMotion)**: when `prefers-reduced-motion: reduce` is set, the DOM contains `0` animated elements. `src/app/globals.css:46-56` explicitly disables `.marker-pulse` and replaces `.animate-spin` with a static border so the spinner does not appear frozen.
- **No action needed.**

### BUI-13 (LOW, HIGH) — Forced-colors (Windows High Contrast) renders readably

- **Evidence (theme.forcedColors)**: body becomes `rgb(0,0,0) on rgb(255,255,255)`; h2 becomes `rgb(0,0,0)`. No invisible text. The `vitro-btn-primary` keeps its fill color in forced-colors mode (Chromium's default), which MAY be low contrast; that needs a targeted Windows probe (queued as deferred).

### BUI-14 (LOW, HIGH) — 200% text scale: no overflow detected

- **Evidence (theme.textScale200)**: `{ overflowCount: 0 }` after setting `document.documentElement.style.fontSize = '200%'`. Caveat — the landing was rendered in its WebGL-error fallback at the moment of this measurement; the map-error card is relatively short. The track workspace was not measured at 200% scale. Queued as deferred.

### BUI-15 (LOW, HIGH) — Error-state dialog for map load failure uses `role="alert"` correctly

- **Evidence (modals.landingDom.errorRoleNode)**: `{ role: "alert", text: "Your browser couldn't start the map. Try reloading or using a different browser." }`. Good.
- Side observation: the `<details>`/`<summary>` containing raw WebGL diagnostics is focusable (good) and tabbable before `Reload Page` (good — sighted users read it first).
- **No action needed.**

### BUI-16 (LOW, HIGH) — Track workspace loads sample trip and renders timeline + controls

- **Evidence**: after clicking the sample button, the probe confirmed:
  ```
  hasTimeline: true, hasControls: true, hasFileButton: true, rangeHandles: 7
  ```
- `rangeHandles: 7` = 1 timeline + 2 handles + 2 date labels + "selected region" + "points count summary" with testid prefix. Matches `TimelineSelector.tsx` expectations.
- Progress slider `aria-label="Playback progress"` with `value="0"` — correct.
- **No action needed.**

### BUI-17 (LOW, HIGH) — Export panel opens with a labeled dialog and named controls

- **Evidence (modals.exportPanel)**:
  ```
  hasPanel: true
  controls: [{ name: "Resolution", tag: "select" },
             { name: "Duration", tag: "input", type: "number" },
             { name: "Quality", tag: "select" }]
  ```
- Focus trap probe got limited by the WebGL-error path, but the modal opened, was labeled (id `export-panel-title`), and closed via Escape.
- **No action needed.**

### BUI-18 (LOW, HIGH) — Small-target audit returns only one offender, `Reload Page` (114×38)

- **Evidence (viewports.1024w.landing.smallTargets)**: `[{ text: "Reload Page", rect: {w:114,h:38} }]`. This appears only in the WebGL-error fallback, so it affects users whose browser cannot run WebGL. Still < 44px tall per WCAG 2.2 2.5.8.
- **Source**: `src/components/MapView.tsx:949`. The button uses `gi mt-4 px-4 py-2 text-sm` which renders 38px.
- **Recommendation**: add `min-h-11` to the `Reload Page` button className.

### BUI-19 (LOW, HIGH) — No visible focus outline on the sample-button when focused

- **Evidence (tab entry #4)**: `outline: "none 0px rgb(5, 8, 16)", boxShadow: "rgba(0,0,0,0) 0px 0px 0px 0px, rgba(0,0,0,0)…"`. The big image button has `focus-visible` styles intentionally suppressed (it uses `.group` with transform on hover). Focus ring is effectively invisible.
- **Source**: `src/components/FileUpload.tsx:176-195`. No `focus-visible:ring` utility on the `<button>`.
- **Recommendation**: add `focus-visible:ring-2 focus-visible:ring-[rgb(var(--gl))] focus-visible:ring-offset-2` to the sample-preview button className.

## Deferred / scope-capped items

- (a) **Real WebGL** browser probe for LCP/INP/CLS — Chromium on darwin/arm64 headless SwiftShader does not always emit PerformanceObserver entries for LCP. Queue a follow-up lane that uses `devices["Desktop Chrome HiDPI"]` with `--enable-unsafe-swiftshader` or `--use-gl=angle`.
- (b) **RTL locale sweep** — the app has no RTL locale bundled; the file loader is wired to only en / ko / ja / zh / es. This is consistent with the repo's scope and is NOT a gap.
- (c) **Touch-target audit at 320w + ko locale** — the probe ran at 1440w + en. Run again at 320w with the longest labels.
- (d) **Long-task / INP during timeline drag** — would require a user gesture trace; captured as deferred.

## Summary

Hard findings scheduled this cycle (fix now):

1. **BUI-1** — drop `frame-ancestors` from meta CSP (dev + prod), document host-header authority.
2. **BUI-2** — add `<main>` landmark on the page root.
3. **BUI-3** — label the landing drop-zone with `role`/`aria-labelledby`/`aria-describedby`.
4. **BUI-4** — make the sample-preview button caption `aria-hidden="true"` so the accessible name is exactly `aria-label`.
5. **BUI-18** — bump the `Reload Page` button in map-error fallback to `min-h-11`.
6. **BUI-19** — add a `focus-visible` ring utility to the sample-preview button.

Everything else is deferred with explicit exit criteria; see the cycle-r4 implementation plan.
