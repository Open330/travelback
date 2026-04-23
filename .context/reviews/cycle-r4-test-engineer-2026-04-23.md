# Cycle r4 — Test Engineer — 2026-04-23

Scope: Playwright + unit coverage gaps and flakiness risk.

## TE-1 (LOW, HIGH) — E2E coverage does not assert the CSP meta has no `frame-ancestors`

- Post-BUI-1 we will need a regression test that asserts the emitted `out/index.html` has no `frame-ancestors` substring in the meta CSP.
- Add to `scripts/smoke-static.mjs` (which already walks `out/*.html`).
- **Schedule this cycle** (small gate hardening) — added to plan.

## TE-2 (LOW, HIGH) — E2E coverage does not assert landmark semantics

- No test currently checks `document.querySelector('main')` exists.
- **Defer** — WAI-ARIA-heavy, needs an axe-core integration; out of cycle-r4 scope.

## TE-3 (LOW, MEDIUM) — Playwright `test:e2e:static:ci` runs headless-chromium; LCP/CLS are not captured

- Add a Lighthouse run or a `PerformanceObserver` wrapper in a new spec.
- **Defer**.

## TE-4 (LOW, MEDIUM) — No test exercises the `prefers-reduced-motion` path

- `.animate-spin` + `.marker-pulse` would need a test that sets `reducedMotion: 'reduce'` in the context, waits, and asserts `animation: none`.
- **Defer**.

## Summary

Schedule: TE-1 (tiny smoke-test extension).
Defer: TE-2, TE-3, TE-4.
