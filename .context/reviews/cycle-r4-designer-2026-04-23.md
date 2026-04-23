# Cycle r4 — Designer / UI-UX (browser-driven) — 2026-04-23

This lane is the authoritative browser-driven UI/UX review for U-2026-04-23-01.
See `cycle-r4-ui-ux-browser-2026-04-23.md` for the full measurements and raw
evidence. This file is a shorter restatement of the UI/UX lane's findings for
the aggregate fan-out.

## Schedule this cycle

- BUI-1 — remove `frame-ancestors 'none'` from the meta CSP (dev + prod hardened output). Browser console emits `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.` on every page load; JS frame-buster + host header remain authoritative. Files: `src/app/layout.tsx:62`, `scripts/harden-static-export.mjs:12`.
- BUI-2 — change `src/app/page.tsx:314` root wrapper from `<div>` to `<main>`. Only landmark currently exposed is `{role:"region", name:"Map"}`.
- BUI-3 — label the landing drop-zone: add `role="group" aria-labelledby aria-describedby` to `src/components/FileUpload.tsx:153-165`.
- BUI-4 — wrap the sample-preview button caption in `aria-hidden="true"` so the AX name is exactly `aria-label`. File: `src/components/FileUpload.tsx:186-194`.
- BUI-18 — add `min-h-11` to the `Reload Page` button in the map-error fallback. File: `src/components/MapView.tsx:949`.
- BUI-19 — add a `focus-visible` outline utility to the sample-preview button. File: `src/components/FileUpload.tsx:176-195`.

## Defer with criteria

- BUI-5 — "Need help finding your file?" button: expand aria-label to include "Google Location History" for SR discoverability. Exit criterion: next UX pass reviews i18n consistency of the expanded aria-label.
- BUI-7 — toolbar language `<select>` uses 2-letter codes; consider native language names. Not a bug; stylistic preference.
- BUI-8 — primary CTA contrast 3.08:1 (cyan) vs WCAG AA 4.5:1 for normal text. Exit criterion: design owner decides whether to darken cyan or keep current brand color; MEDIUM-severity defer because the button is typically oversized (the "Browse" CTA is 52px tall, WCAG 2.2 1.4.3 allows ≥3:1 for 18pt+ text — 13.35px at weight 500 is NOT large enough, so this is a real AA gap but the button has been this shade since before the repo started and changing it has visual/branding impact).
- BUI-11(b) — i18n overflow at 320w + ko — need targeted probe; exit criterion: next cycle runs the script with `VIEWPORTS=[{name:"320w-ko",width:320,height:640}]` + locale=ko.
- Real-WebGL LCP/INP probe — exit criterion: re-run with `angle` / `swiftshader-flagless` and capture LargestContentfulPaint entries.

## Evidence quickref

- Hard measurements live in the companion browser review at `./.context/reviews/cycle-r4-ui-ux-browser-2026-04-23.md`.
- Raw Playwright JSON: `/tmp/tb-uiux-review.json` (43 KB).
- Probe script: `e2e/_tmp-uiux-review.mjs` (deleted after use, preserved in git history if checked in).
