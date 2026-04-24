# Architect Review — review-plan-fix cycle 1/100

## Summary

The main confirmed defects are cross-layer ownership problems: export is modeled by two modal systems at once, and timeline trimming mutates the same `track` state that `MapView` treats as a fresh load. The repo also bakes GitHub Pages deployment assumptions into the build/runtime path contract, and Google JSON parsing is still duplicated across the main thread and worker.

## Findings

### A1. Export is split across two modal systems

- **Status:** Confirmed issue
- **Severity:** High
- **Confidence:** High
- **Evidence:** `src/app/page.tsx:382-405` renders an inline export overlay with the cancel button inside `<main>`; `src/app/page.tsx:487-500` keeps `ExportPanel` mounted during export; `src/components/ExportPanel.tsx:175-182` renders the panel through `ModalDialog`, and `src/components/ExportPanel.tsx:249-267` shows export progress without any cancel affordance; `src/components/ModalDialog.tsx:43-49` marks the app root `inert` and `aria-hidden` when the modal opens.
- **Problem:** The cancel button lives in the subtree that the modal intentionally disables, while the modal itself sits above it (`z-30` vs `z-20`).
- **Failure scenario:** A user starts a long export, sees a cancel button in the background overlay, but cannot click or focus it because the export modal has inerted the app root. Screen readers also see overlapping modal semantics.
- **Suggested fix:** Make export a single-owner surface. Either keep `ExportPanel` as the only export UI and add cancel there, or close it before showing the full-screen export overlay. Do not render two modal layers for the same state.

### A2. Timeline trimming is coupled to loaded-track identity

- **Status:** Confirmed issue
- **Severity:** Medium-High
- **Confidence:** High
- **Evidence:** `src/components/TimelineSelector.tsx:221-226` calls `onRangeChange` on every drag frame; `src/app/page.tsx:216-237` responds by slicing `fullTrack` and replacing `track`; `src/components/MapView.tsx:756-816` treats any `track` change as a reload, rebuilds layers, recreates the marker, and calls `fitBounds(..., { duration: 1000 })` at `src/components/MapView.tsx:783-790`.
- **Problem:** A view-level range edit is interpreted as "load a new track".
- **Failure scenario:** Dragging a trim handle causes repeated `fitBounds` animations and marker resets while the user is still dragging, producing camera thrash and unnecessary map work.
- **Suggested fix:** Separate `selectionRange` from `track` ownership. Let `TimelineSelector` update a range model live and only derive or commit the filtered track on drag end, or teach `MapView` to handle trim updates without re-fitting the map.

### A3. Production deployment path is spread across multiple layers

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `next.config.ts:3-10` hardcodes production `basePath` to `/travelback`; `package.json:8` hardcodes preview to `--base-path /travelback`; `playwright.static.config.ts:14` and `playwright.static.config.ts:41` do the same; `scripts/smoke-static.mjs:20` and `scripts/smoke-static.mjs:168-175` also assume `/travelback`; runtime asset URLs are derived from that compiled value in `src/types.ts:23`, `src/app/layout.tsx:6`, `src/app/page.tsx:248`, `src/lib/parser.ts:506`, `src/components/FileUpload.tsx:186`, and `src/components/GoogleGuide.tsx:249`.
- **Problem:** The static build is tightly coupled to one GitHub Pages subpath, but that assumption is spread across app code, scripts, and tests instead of being a single deployment input.
- **Failure scenario:** Serving the exported app from `/` or another subpath makes worker, style, sample, and font URLs 404 even though the bundle itself is otherwise static-safe.
- **Suggested fix:** Make base path an explicit build contract (`BASE_PATH` / `NEXT_PUBLIC_BASE_PATH`) and let Pages set it to `/travelback`; preview, smoke, and static Playwright should consume the same variable rather than embedding the path in multiple places.

### A4. Google JSON parsing is duplicated across runtime boundaries

- **Status:** Confirmed issue
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** Google parsing rules live in `src/lib/parser.ts:352-483` plus worker orchestration at `src/lib/parser.ts:493-573`, while a second implementation exists in `public/workers/trackParser.worker.js:151-247` and `public/workers/trackParser.worker.js:250-322`.
- **Problem:** A single domain boundary is implemented twice, once in TypeScript and once in checked-in public JavaScript, with duplicated format detection, segment flattening, limits, and error codes.
- **Failure scenario:** A future parser fix lands in `src/lib/parser.ts` but not in the worker copy, so modern browsers parse JSON differently from the fallback path.
- **Suggested fix:** Move Google parsing into a shared module that is bundled for both the main thread and the worker, or generate the worker from the shared source during build.

### A5. Local preview is more hardened than the actual Pages deployment

- **Status:** Likely risk
- **Severity:** Medium
- **Confidence:** Medium
- **Evidence:** `scripts/serve-static.mjs:147-158` adds `X-Frame-Options`, HSTS, COOP/CORP, and Permissions-Policy in preview; `.github/workflows/deploy-pages.yml:34-46` uploads `out/` directly to GitHub Pages; `.context/project/01-overview.md:27` and `.context/project/02-architecture.md:114` already note that Pages cannot attach those headers.
- **Problem:** Local preview and CI can look safer than the real production host.
- **Failure scenario:** A future change appears safe in local preview because the custom server injects headers that GitHub Pages will never emit.
- **Suggested fix:** Either front Pages with a header-capable CDN, or make CI distinguish Pages-realistic validation from header-capable preview validation so production assumptions stay explicit.

## Root Cause

- `track` is both session identity and live trim output.
- Export state is owned by both page-level overlay logic and modal logic.
- Deployment path is encoded in multiple layers instead of one contract.
- Google parsing logic is split across runtime boundaries instead of shared.

## Recommendations

1. Consolidate export into one modal/state owner and keep cancel inside that owner.
2. Decouple trim selection from loaded-track identity so `MapView` stops re-fitting on every drag.
3. Centralize `BASE_PATH` as a real build/deploy contract and drive Next config, preview, smoke, and static tests from it.
4. Share the Google parser implementation between main-thread fallback and worker codegen/bundle.

## Final Sweep

Examined: `src/app/*`, all `src/components/*`, all `src/lib/*`, `src/types.ts`, `next.config.ts`, `package.json`, `.github/workflows/deploy-pages.yml`, `scripts/*`, `public/workers/trackParser.worker.js`, bundled map-style/font assets, `e2e/travelback.spec.ts`, and the relevant `.context` docs in `.context/README.md`, `.context/project/*`, and `.context/development/01-conventions.md`.

Skipped as non-review-relevant/generated: `node_modules/`, `.next/`, `.git/`, `playwright-report/`, `test-results/`, most historical `.context/reviews/*`, and `.context/plans/archive/*` beyond spot-checking current context. The architect lane reported `npm run typecheck` and `npm run lint` both completed clean.
