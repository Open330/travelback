# Cycle 6 Architect Review

Coordinator note: the `architect` retry returned this complete report but did not write the file because its active role contract was read-only. This file transcribes that agent output for Prompt 1 provenance.

## Summary

The repo is functional and currently passes `npm run typecheck` and `npm run lint`, but its architecture is still `WATCH`: several core behaviors are duplicated across runtime surfaces instead of being owned by one shared boundary. The highest-leverage fixes are to unify startup preference/bootstrap logic, eliminate the duplicated Google JSON parser, and decouple video export from the live interactive map.

## Inventory

Reviewed as architecture-relevant: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, both Playwright configs, all files under `src/app/*.tsx`, `src/lib/*.ts`, `src/components/*.tsx`, all `scripts/*.mjs`, `public/workers/trackParser.worker.js`, and `e2e/travelback.spec.ts`. Final sweep excluded `plan/**`, `e2e/fixtures/**`, and static asset/data files under `public/` other than the worker because they are docs/data/assets rather than runtime control flow.

## Analysis

1. Confirmed issue, `HIGH`, confidence `high`: Google JSON parsing is duplicated in two implementations, and drift protection only checks constants/error codes, not parsing behavior.
   Evidence: `src/lib/parser.ts:246-375`, `src/lib/parser.ts:465-652`, `public/workers/trackParser.worker.js:44-149`, `public/workers/trackParser.worker.js:174-320`.
   Drift guard is shallow: `scripts/smoke-static.mjs:172-190` only compares size/error-code parity.
   The worker also sits outside TS compilation coverage: `tsconfig.json:25-31`.
   Failure scenario: a future fix for a new Google export shape lands in `src/lib/parser.ts` but not the worker, so small files parsed on the main-thread fallback succeed while larger files parsed in the worker fail differently.

2. Confirmed issue, `HIGH`, confidence `high`: first-paint preference/bootstrap logic is hardcoded in multiple places.
   Evidence: `src/app/layout.tsx:53-66` inlines accepted themes, map styles, and locales inside one bootstrap script; `src/app/page.tsx:61-99` reimplements theme/map-style initialization; `src/app/page.tsx:210-229` reimplements persistence/update rules; `src/lib/i18n.ts:1786-1813` separately owns locale validity/persistence; `src/types.ts:21-45` is yet another source of truth for map-style keys.
   Failure scenario: adding a locale or map style requires synchronized edits across layout bootstrap, hydrated client state, i18n validation, and type definitions; one missed edit produces first-paint mismatch or broken persisted state.

3. Confirmed issue, `HIGH`, confidence `medium-high`: export rendering is coupled to the live interactive map instance.
   Evidence: `src/lib/useExportController.ts:105-186` resizes the current map, drives camera state frame-by-frame, and mutates playback progress during export; `src/components/MapView.tsx:472-569` exposes imperative `resize`, `resetSize`, `applyCameraState`, and `waitForIdle`; `src/components/MapView.tsx:902-977` uses the same camera path for interactive playback.
   Failure scenario: a future UI/map refactor breaks both playback and export together, or export-specific workarounds keep leaking back into normal map behavior because both modes share one renderer.

4. Likely issue, `MEDIUM`, confidence `medium`: map overlay ownership is split across components with raw IDs and direct listener binding.
   Evidence: `src/components/MapView.tsx:699-860` owns `route`, `trail`, and marker lifecycle; `src/components/JourneyCreator.tsx:193-252` adds/removes its own map sources/layers; `src/components/JourneyCreator.tsx:279-452` binds raw map events and style-reload recovery itself.
   Failure scenario: once another overlay mode is introduced, or journey editing is allowed alongside a loaded track, cleanup/order bugs become likely because there is no shared overlay registry or scene manager.

5. Confirmed issue, `MEDIUM`, confidence `high`: E2E verification is structurally bottlenecked into one serial mega-spec.
   Evidence: `playwright.config.ts:13-15` forces `fullyParallel: false` and `workers: 1`; `e2e/travelback.spec.ts:1-214` is a large helper layer and `e2e/travelback.spec.ts:214-1351` holds the entire app suite in one file.
   Failure scenario: one flaky setup path or slow scenario drags the entire suite, and test ownership/regression localization gets worse as coverage grows.

## Root Cause

The repo lacks shared domain boundaries for startup state, parsing, map-scene ownership, and export rendering. Features are implemented at the UI/runtime edge that needs them first, which keeps shipping velocity up short-term but creates duplicated logic and cross-surface coupling.

## Recommendations

1. Highest priority, `medium` effort, `high` impact: move Google JSON parsing and startup preference/bootstrap rules into shared modules with one source of truth; derive the worker from the same parser source instead of maintaining a second implementation.
2. Next, `medium-high` effort, `high` impact: split export onto a dedicated render pipeline/service and introduce a small map overlay manager so `MapView` and `JourneyCreator` stop owning independent source/layer/event lifecycles.
3. Next, `medium` effort, `medium-high` impact: decompose `HomeInner` and the Playwright suite by workflow boundary (`session`, `import`, `journey`, `playback`, `export`) to reduce prop-drilling and improve test isolation.

## Architectural Status

`WATCH`

## Trade-offs

| Option | Pros | Cons |
|--------|------|------|
| Keep current edge-owned logic | Fast to ship, minimal upfront refactor | More drift, harder debugging, more size-dependent/runtime-specific regressions |
| Extract shared domain boundaries now | One source of truth, cleaner ownership, better long-term change safety | Short-term refactor cost and temporary migration risk |

## Risks Needing Manual Validation

`src/components/MapView.tsx:582-587` keeps `preserveDrawingBuffer: true` enabled for the main map at all times. That may be acceptable, but GPU/battery cost on lower-end mobile devices needs measurement; the repo has no perf validation for it.

## Verification

`npm run typecheck` passed.  
`npm run lint` passed.  
E2E was reviewed structurally but not executed in this review pass.
