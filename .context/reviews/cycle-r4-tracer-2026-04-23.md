# Cycle r4 — Tracer — 2026-04-23

Causal tracing for bug-ish symptoms.

## T-1 — Browser console error "CSP directive 'frame-ancestors' ignored when delivered via a <meta>"

- Trace: user opens any page → layout.tsx emits `<meta http-equiv="Content-Security-Policy" content="…; frame-ancestors 'none'; …">` → Chromium's CSP parser warns that frame-ancestors is a response-header-only directive → console.error.
- Root cause: the CSP contains a header-only directive; meta-delivered CSP does not support frame-ancestors.
- Remediation surface: `src/app/layout.tsx:62` AND `scripts/harden-static-export.mjs:12`.
- **Folded into BUI-1 / SEC-1.**

## T-2 — Tab order puts the map canvas before the upload overlay in the WebGL-fail path

- Trace: MapView mount → initial maplibregl.Map construction throws webglcontextcreationerror → `setMapError(message)` → the map-error panel renders inside the `<div ref=containerRef>` → that div is no longer `inert` (the code removes `inert`/`aria-hidden` when `mapError || track`, see `src/components/MapView.tsx:429-441`) → the canvas AND the details/reload controls are focusable.
- Meanwhile the upload overlay mounts with `absolute inset-0 z-10` and is above the map visually, but in tab order (document order) the MapView mounts first.
- This is also the explanation for why the tab-order probe at 1440w put `canvas` and `Reload Page` before `Browse Files`.
- Severity: LOW; only reproduces when WebGL is broken.
- **Defer** (capture in the plan as a deferred item).

## T-3 — Sample-button announces all inner text because its `<p>` / `<div>` children are not `aria-hidden`

- Trace: SR reads `<button>` → accessible name = aria-label (expected "Try with a sample trip") → but Chrome's fallback algorithm on Safari/VoiceOver sometimes uses the flattened text content when `aria-label` is empty or whitespace-only; measurements show the concatenated string in the AX tree.
- Remediation surface: `src/components/FileUpload.tsx:186-194`.
- **Folded into BUI-4.**

## T-4 — Reload Page button in map-error fallback is 38px tall

- Trace: `<button className="gi mt-4 px-4 py-2 text-sm cursor-pointer">` in `MapView.tsx:949` → Tailwind `py-2` = 8px top + 8px bottom = 16 + 16px line-height + border → effective 38px.
- Remediation surface: add `min-h-11`.
- **Folded into BUI-18.**

## Summary

Traces all resolve to the six BUI-* findings already scheduled. No orphan traces.
