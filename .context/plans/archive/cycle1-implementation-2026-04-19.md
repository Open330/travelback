# Cycle 1 Implementation Plan

**Date:** 2026-04-19
**Source review:** `.context/reviews/_aggregate.md`

## Scope
This plan converts every merged Prompt 1 review finding into either:
- **planned implementation work in this cycle**, or
- **an explicit deferred record** in `.context/plans/deferred-findings-cycle1-2026-04-19.md`.

Security, correctness, and data-loss findings are scheduled for implementation in this cycle per repo policy and the cycle instructions.

All individual per-agent review findings from `.context/reviews/*.md` were triaged through the deduped aggregate IDs `AGG-001`..`AGG-010`; duplicate source findings are considered covered when their merged aggregate issue is planned or deferred below.

---

## Planned for implementation this cycle

### AGG-001 — Runtime map styles still violate the local-only contract
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `public/map-styles/*.json`, `scripts/fetch-map-styles.mjs`, `scripts/smoke-static.mjs`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `src/app/layout.tsx`
- **Status:** TODO
- **Plan:**
  1. Replace the shipped style JSON files with self-contained local styles that do not depend on remote tiles, sprites, or glyphs.
  2. Update the style-generation script to emit the same local-only contract going forward.
  3. Keep `smoke-static` enforcing the local-style contract.
  4. Update project docs to describe the new bundled-map behavior accurately.
- **Exit criteria:**
  - `npm run smoke:static` passes.
  - No shipped `out/map-styles/*.json` contains `sprite`, `glyphs`, or external sources.
  - Project docs no longer claim behavior the build does not provide.

### AGG-002 — Timeline default range drops the final point
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `src/components/TimelineSelector.tsx`, `src/app/page.tsx`
- **Status:** TODO
- **Plan:**
  1. Make the end-range mapping inclusive of the last point.
  2. Preserve the start-range lower-bound behavior.
  3. Add regression coverage through the existing E2E/static test surface if feasible this cycle.
- **Exit criteria:**
  - Loading a track without trimming keeps the original last point.
  - No regressions in timeline drag behavior.

### AGG-003 — Google JSON intake is too expensive and too permissive
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/components/FileUpload.tsx`, `.context/project/01-overview.md`
- **Status:** TODO
- **Plan:**
  1. Lower the practical JSON file-size limit to a browser-safe ceiling.
  2. Stop materializing large JSON as a main-thread string before worker handoff.
  3. Replace sampled JSON depth checks with a full linear scan.
  4. Align worker fallback behavior with the supported-file contract.
  5. Update docs/user guidance to match the actual limit.
- **Exit criteria:**
  - JSON uploads no longer clone a giant main-thread string into the worker.
  - Depth validation is full-file, not sampled.
  - Supported-file messaging matches the real limit and fallback behavior.

### AGG-004 — Export correctness bugs (scene blend, save cancellation, cleanup)
- **Severity:** HIGH
- **Confidence:** HIGH
- **Primary files:** `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`, `src/types.ts`, `src/components/MapView.tsx`
- **Status:** TODO
- **Plan:**
  1. Thread scene transition duration through the export pipeline.
  2. Treat save-dialog cancellation as cancellation, not success.
  3. Make post-cancel cleanup abort-aware.
  4. Prevent export launch until codec support is known / supported.
- **Exit criteria:**
  - Export uses the configured scene blend duration.
  - Canceling save or export no longer reports success.
  - Unsupported codecs cannot be launched accidentally.

### AGG-005 — CSP/style-attribute mismatch breaks UI affordances
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `src/app/layout.tsx`, `scripts/harden-static-export.mjs`
- **Status:** TODO
- **Plan:**
  1. Remove or otherwise resolve the contradictory `style-src-attr 'none'` policy.
  2. Verify active-state styling is visible again in the static build.
- **Exit criteria:**
  - No runtime CSP violations from required inline style attributes.
  - Selected controls retain their intended visual affordances in the shipped app.

### AGG-006 — Static Playwright coverage is brittle and partly dev-hook dependent
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `e2e/travelback.spec.ts`, `src/components/MapView.tsx`, `playwright.static.config.ts`
- **Status:** TODO
- **Plan:**
  1. Make the static test surface production-compatible.
  2. Remove or reduce fixed sleeps in the most brittle flows.
  3. Investigate and fix the static-suite server-lifecycle failure if it reproduces.
- **Exit criteria:**
  - `npm run test:e2e:static:ci` passes.
  - Static tests no longer depend on a hook that only exists in dev builds.

### AGG-007 — Playback/interpolation edge cases
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `src/lib/interpolate.ts`, `src/components/MapView.tsx`
- **Status:** TODO
- **Plan:**
  1. Fix zero-distance interpolation to start from the first point.
  2. Apply antimeridian-aware calculations in the remaining map camera/bounds helpers.
  3. Cancel pending timeline drag RAF work on teardown.
  4. Add the ThemeToggle media-query fallback called out by the debugger review.
- **Exit criteria:**
  - Zero-distance tracks no longer jump to a later point.
  - Dateline-crossing routes do not compute world-spanning jumps in follow mode.
  - Timeline drag cleanup is teardown-safe.
  - Theme toggle works in older MediaQueryList implementations.

### AGG-008 — Core docs and runtime behavior drift
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Primary files:** `.context/project/01-overview.md`, `.context/project/02-architecture.md`
- **Status:** TODO
- **Plan:**
  1. Update docs to describe the static start command correctly.
  2. Expand the Google JSON support matrix.
  3. Document the real playback/export duration ranges.
- **Exit criteria:**
  - Docs match the shipped scripts and parser behavior.

---

## Deferred in this cycle
See `.context/plans/deferred-findings-cycle1-2026-04-19.md`.

---

## Progress log
- 2026-04-19 — Plan created from Prompt 1 aggregate review.
