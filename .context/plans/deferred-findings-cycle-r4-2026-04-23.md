# Deferred Findings — Cycle r4 (2026-04-23)

Every finding below is explicitly deferred with file+line, original severity,
concrete reason, and exit criterion. No silent drops.

---

## R4-AGG-D1 — Primary CTA contrast 3.08:1 below WCAG AA 4.5:1

- **Source**: BUI-8 / A11Y-6.
- **File+line**: `src/app/globals.css:127-132` (`.vitro-btn-primary { background: rgba(var(--gl), .85); color: #fff; }`).
- **Original severity / confidence**: MEDIUM / MEDIUM (not downgraded).
- **Reason**: darkening the primary cyan is a brand-visual change. The repo's conventions
  (`.context/development/01-conventions.md`) do not authorize visual-brand changes without
  owner sign-off. Changing this without coordination would visibly alter every primary
  button across the app (FileUpload, Controls, TrackToolbar, ExportPanel, SceneEditor).
- **Exit criterion**: design-owner decision logged. When agreed, bump to `rgb(8,145,178)`
  (Tailwind cyan-700 equivalent). White-on-cyan-700 measures ~4.78:1 against white.

## R4-AGG-D2 — Tab order puts map-error controls before the upload overlay in WebGL-fail path

- **Source**: T-2 / DB-1.
- **File+line**: `src/components/MapView.tsx:429-441` (inert/aria-hidden toggle), `src/app/page.tsx:315-327` (MapView mounted first).
- **Original severity / confidence**: LOW / MEDIUM (not downgraded).
- **Reason**: only reproduces when WebGL initialization fails. The fix requires either
  hoisting the map-error panel out of the MapView container into a separate alertdialog,
  OR reordering the component tree — both non-trivial structural changes outside the
  "quick-win" scope of this cycle.
- **Exit criterion**: when the repo re-architects the WebGL-fail UI (e.g. adds a
  pre-MapView error fallback), revisit.

## R4-AGG-D3 — 320w + ko touch-target audit not yet performed

- **Source**: BUI-11b / A11Y-9.
- **File+line**: n/a (probe-script coverage gap).
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: the browser probe ran at 1440w with locale=en. Re-running at 320×640 with
  `localStorage['travelback-locale']='ko'` would surface narrow-viewport wrapping/clipping
  issues not yet observed.
- **Exit criterion**: next UI/UX cycle's probe runs with `VIEWPORTS=[{name:'320w-ko',width:320,height:640}]`
  and sets the locale before navigating.

## R4-AGG-D4 — Real-WebGL LCP / CLS / INP numbers not captured

- **Source**: BUI-11c.
- **File+line**: n/a (probe-environment limitation).
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: Playwright Chromium on darwin/arm64 headless SwiftShader did not emit
  `LargestContentfulPaint` entries; WebGL context creation failed so MapView took the
  error path, making LCP irrelevant for that run.
- **Exit criterion**: retry with `--use-gl=angle` or on hardware with real WebGL.

## R4-AGG-D5 — Forced-colors audit incomplete for brand-colored buttons

- **Source**: A11Y-8.
- **File+line**: `src/app/globals.css:127-132` (`.vitro-btn-primary`) plus any button using `rgb(var(--gl))` as fill.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: forced-colors (Windows High Contrast) replaces background colors, but
  custom-fill buttons may lose contrast. Need a Windows probe.
- **Exit criterion**: run the probe under Windows forced-colors or use Edge
  DevTools' Emulation > Forced-colors on a real Windows machine.

## R4-AGG-D6 — Landmark e2e test not authored

- **Source**: TE-2.
- **File+line**: `e2e/` has no spec asserting `document.querySelector('main')`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: would need axe-core integration or dedicated landmark assertions; not in
  cycle-r4 scope.
- **Exit criterion**: next cycle adds a tiny spec asserting the `<main>` landmark exists.

## R4-AGG-D7 — `preserveDrawingBuffer=true` as default (documented trade-off)

- **Source**: PR-2 / AR-3 (cycle-r3 carryover).
- **File+line**: `src/components/MapView.tsx:553-558`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: necessary for `captureStream()` during export; documented as a trade-off
  in-source. MapLibre does not support flipping the flag without re-initialization.
- **Exit criterion**: architectural refactor with a separate offscreen canvas during export.

## R4-AGG-D8 — `videoEncoder.ts` `window as unknown as …` casts (cycle-r3 carryover)

- **Source**: CR-6.
- **File+line**: `src/lib/videoEncoder.ts:173-183`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: typing polish; no runtime impact.
- **Exit criterion**: when a follow-up introduces WICG `window.showSaveFilePicker` types,
  remove casts.

## R4-AGG-D9 — Nominatim search vs. CSP `connect-src 'self'` (cycle-r3 carryover)

- **Source**: SEC-2.
- **File+line**: `src/components/JourneyCreator.tsx` (search path) + `src/app/layout.tsx:62`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason (security deferral permitted)**: the app defaults to in-browser geocoding only;
  no Nominatim traffic is issued without an explicit upgrade to include a new host. The
  repo's architecture doc (`.context/project/02-architecture.md`) explicitly delegates
  CSP exemptions for external hosts to host-header configuration: "For plain static
  hosting, configure anti-framing headers at the host/CDN layer … The app also ships a
  client-side … fallback, but host headers remain the authoritative protection." The same
  boundary applies to connect-src exemptions.
- **Exit criterion**: production-build verification that a Nominatim lookup actually fires
  and records the CSP behavior. Until then, status unchanged from cycle-r3.

## R4-AGG-D10 — Language `<select>` shows 2-letter codes

- **Source**: BUI-7 / CT-4.
- **File+line**: `src/components/GlobalToolbar.tsx:55-60`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: stylistic — the brand / copy-owner's call. `aria-label="Language"` already
  makes the control reachable.
- **Exit criterion**: copy-owner decides native names vs. 2-letter codes.

## R4-AGG-D11 — "Need help finding your file?" aria-label could mention Google Location History

- **Source**: BUI-5.
- **File+line**: `src/components/FileUpload.tsx:253-264`.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: copy / discoverability question — not a WCAG failure; current English label
  is fine for sighted users.
- **Exit criterion**: copy-owner review.

## R4-AGG-D12 — Playwright spec for `prefers-reduced-motion` not authored

- **Source**: TE-4.
- **File+line**: `e2e/` has no spec.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: out of cycle-r4 scope.
- **Exit criterion**: next cycle.

## R4-AGG-D13 — Lighthouse / LCP / INP e2e spec not authored

- **Source**: TE-3.
- **File+line**: `e2e/` has no spec.
- **Original severity / confidence**: LOW / MEDIUM.
- **Reason**: out of cycle-r4 scope.
- **Exit criterion**: next cycle.
