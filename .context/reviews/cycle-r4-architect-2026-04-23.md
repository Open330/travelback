# Cycle r4 — Architect — 2026-04-23

Design risks, coupling, longevity.

## AR-1 — Landmark gap on root is a systemic design smell

- Prior cycles did not raise it. With the browser probe confirming only the Map region is a landmark, the plan adds `<main>` at the root (see BUI-2).
- **Schedule this cycle.**

## AR-2 — CSP meta policy mixes header-only directives with meta-only directives

- `frame-ancestors` / `report-to` / `sandbox` are response-header-only. The current meta CSP mixes them anyway. This is an architectural choice that conflates defense-in-depth documentation with runtime enforcement.
- Separating them: keep meta for the directives that are actually enforceable (`default-src`, `script-src`, `style-src`, `connect-src`, `img-src`, `font-src`, `worker-src`, `child-src`, `media-src`, `object-src`, `base-uri`, `form-action`, `upgrade-insecure-requests`). Move `frame-ancestors` to host-header-only with documentation to reinforce.
- **Schedule this cycle.** (Covered by BUI-1 / SEC-1.)

## AR-3 — MapView `preserveDrawingBuffer=true` couples runtime perf to export feature

- Design trade-off is documented in-source. Long-term architectural fix would be a separate offscreen render pass during export. Out of scope for a review-plan-fix cycle.
- **Defer**.

## AR-4 — `JourneyCreator.tsx` grew to ~600 lines with search + drawing state machine

- No split needed yet; still readable. Log a watch-item for future growth.
- **No action.**

## Summary

Schedule: AR-1, AR-2 (both match existing plan entries). Defer: AR-3.
