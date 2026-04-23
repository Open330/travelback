# Cycle r4 — Accessibility Reviewer — 2026-04-23

WCAG 2.2 scan with evidence from the browser-driven probe.

## A11Y-1 (MEDIUM, HIGH) — No `<main>` landmark on the root (WCAG 1.3.1 / 2.4.1)

- Evidence: CDP AX tree lists only `{role:"region", name:"Map"}` as a landmark.
- Fix: `<div>` → `<main>` at `src/app/page.tsx:314`.
- **Schedule this cycle** (BUI-2).

## A11Y-2 (MEDIUM, HIGH) — Landing drop-zone is an unlabeled generic container (WCAG 1.3.1, 2.4.6, 4.1.2)

- Evidence: `dropZoneRole: null, dropZoneAriaLabel: null, dropZoneTag: DIV`.
- Fix: add `role="group"` + `aria-labelledby` + `aria-describedby`.
- **Schedule this cycle** (BUI-3).

## A11Y-3 (LOW, HIGH) — Sample-preview button accessible name concatenation (WCAG 4.1.2)

- Evidence: tab-order entry #4 `text: "Sample output previewTry with a sample tripLoad demo"`, `aria: "Try with a sample trip"`.
- Fix: wrap inner caption in `aria-hidden="true"`.
- **Schedule this cycle** (BUI-4).

## A11Y-4 (LOW, HIGH) — Sample-preview button has no visible focus ring (WCAG 2.4.7)

- Evidence: `outline: none 0px`, `boxShadow: 0 0 0 0` on focus.
- Fix: add `focus-visible:ring-2 focus-visible:ring-[rgb(var(--gl))] focus-visible:ring-offset-2`.
- **Schedule this cycle** (BUI-19).

## A11Y-5 (LOW, HIGH) — `Reload Page` button in map-error fallback is 38px tall (< 44px, WCAG 2.2 2.5.8)

- Evidence: small-targets probe at 1024w flagged it.
- Fix: add `min-h-11`.
- **Schedule this cycle** (BUI-18).

## A11Y-6 (LOW, MEDIUM) — Primary CTA contrast 3.08:1 (WCAG 1.4.3 AA requires 4.5:1 for normal text)

- Evidence: `.vitro-btn-primary` white on rgba(6,182,212,.85).
- Fix: darken the cyan or raise its saturation. Visual-brand change.
- **Defer** (BUI-8).

## A11Y-7 (LOW, HIGH) — Reduced-motion honored

- Evidence: `prefers-reduced-motion: reduce` → 0 animated elements on landing. Spinner is replaced with static circle in CSS.
- **Pass.**

## A11Y-8 (LOW, HIGH) — Forced-colors renders readably

- Evidence: h2 / body render with OS foreground/background.
- Sub-point: `.vitro-btn-primary` and other brand-color buttons may lose contrast in forced-colors mode; needs Windows probe.
- **Defer**.

## A11Y-9 (LOW, HIGH) — i18n: five locales render without truncation at 1440w

- Evidence: `i18n.locales.*.overflow = []` for all five.
- **Pass.** (320w + ko probe queued as deferred; see BUI-11).

## A11Y-10 (LOW, HIGH) — Modal focus trap + Escape confirmed on open path

- Evidence: exportPanel opened and closed successfully via Escape, labelledBy + aria-modal present.
- **Pass.**

## Summary

Schedule: A11Y-1, A11Y-2, A11Y-3, A11Y-4, A11Y-5.
Defer: A11Y-6, A11Y-8.
