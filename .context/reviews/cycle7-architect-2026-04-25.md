# Cycle 7 Architect Review

Architectural status: WATCH

## Summary

The repo is functionally healthy in the baseline review: `npm run lint`, `npm run typecheck`, and `npm run smoke:static` passed in the architect lane. The main issues are architectural watch items: duplicated preference ownership, duplicated Google-history parsing logic, and oversized session/map boundaries that slow future changes and raise regression risk.

## Findings

### 1. MEDIUM — Preference state is split across three owners instead of one

- Evidence: `src/app/layout.tsx:53-56` bootstraps theme/map-style/locale into DOM attributes and localStorage; `src/app/page.tsx:32-35`, `src/app/page.tsx:37-59`, `src/app/page.tsx:65-99`, `src/app/page.tsx:209-238`, and `src/app/page.tsx:414-453` re-implement the same policy in React state; `src/components/ThemeToggle.tsx:7-21` and `src/components/ThemeToggle.tsx:37-64` also perform independent mode detection and media-query handling; locale persistence is separately owned in `src/lib/i18n.ts:1786-1813`.
- Scenario: Adding a third theme, changing explicit-vs-system semantics, or introducing persisted per-map-style defaults requires updating bootstrap JS, page state bootstrapping, and toggle behavior together. Missing one path creates first-paint versus hydrated-state drift.
- Confidence: High
- Suggested fix: Move theme/map-style/locale into one preferences provider/hook; keep the inline bootstrap as a minimal DOM seeding layer only.

### 2. MEDIUM — Google Location History parsing is duplicated in two implementations that can drift

- Evidence: Main parser logic in `src/lib/parser.ts:273-530`; worker reimplementation in `public/workers/trackParser.worker.js:64-253`; guard script only checks constants/error-code mirroring, not behavior parity, in `scripts/smoke-static.mjs:172-201`.
- Scenario: A future fix for one Google export shape lands in `src/lib/parser.ts` but not in `trackParser.worker.js`. Browsers with Worker support then parse differently from fallback/main-thread paths.
- Confidence: High
- Suggested fix: Extract one shared pure parser module and build the worker from it; add parity tests that exercise worker and fallback paths on the same fixtures.

### 3. MEDIUM — App shell and map boundary are too thick, with imperative coupling in the middle

- Evidence: `src/app/page.tsx:61-182` owns session, preferences, scenes, modal state, playback, export wiring, and accessibility state; reset logic is spread across `src/app/page.tsx:256-313`; `TrackWorkspace` exposes a wide prop surface in `src/components/TrackWorkspace.tsx:13-49`; `MapView` mixes map bootstrapping, track rendering, camera logic, export primitives, debug hooks, and error UI across `src/components/MapView.tsx:26-34`, `src/components/MapView.tsx:351-394`, `src/components/MapView.tsx:472-570`, `src/components/MapView.tsx:572-985`; export depends on an imperative map handle in `src/lib/useExportController.ts:105-186` and `src/lib/useExportController.ts:219-234`.
- Scenario: Changing trim/session semantics or swapping export rendering behavior means coordinating `page.tsx`, `MapView.tsx`, and `useExportController.ts` together because there is no narrow domain boundary between session state, render state, and export state.
- Confidence: High
- Suggested fix: Introduce a session-level controller/context and narrow the map adapter to explicit render/export commands instead of a broad imperative handle.

### 4. LOW — Localization is maintained as one giant client module

- Evidence: All five locale dictionaries live inline in `src/lib/i18n.ts:11-1752`, and the app imports that module via `src/app/page.tsx:19-29`; provider and persistence logic are in `src/lib/i18n.ts:1803-1829`.
- Scenario: Any copy edit churns a large client module, increases merge conflict risk, and guarantees all locales ride in the app shell.
- Confidence: Medium-High
- Suggested fix: Split locale catalogs into per-locale resources and lazy-load non-default locales, or at minimum separate dictionaries from provider/runtime code.

## Missed-Issue Sweep

No architectural BLOCK was found after a final pass across `src`, `scripts`, `e2e`, and `.context`.
