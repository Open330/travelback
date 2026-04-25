# Cycle 1 Architect Review — Travelback

Repository: `/Users/hletrd/flash-shared/Travelback`  
Date: 2026-04-25  
Lane: architect / deep review  
Architectural Status: WATCH  
Status: persisted by leader after reviewer WRITE_FAILED due read-only constraints.

## Summary

Travelback’s core design is coherent for a static, browser-only app: parsing, map rendering, camera playback, and MP4 export all stay client-side, matching the documented privacy boundary. The main long-term risks are not missing features but architectural drift: duplicated parser/worker logic, a highly coupled `page.tsx` app shell, an imperative shared MapLibre surface used by map display, journey creation, and export, and deployment assumptions baked into static-export/base-path handling.

No critical architectural blocker was found, but several WATCH-level risks should be addressed before the app grows more formats, export modes, map-layer features, or deployment targets.

## Review-Relevant File Inventory

Examined source/config/docs: root config/docs, app/layout, all components, all lib/types, public worker/map styles/assets, scripts, e2e, and `.context` project/development/agent docs. Generated/vendor/historical bulk excluded: `node_modules/`, `out/`, `.next/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`, archived `.context/plans/**`, historical `.context/reviews/**`, historical `.context/reports/**`.

## Findings

### 1. Worker parser is a manually duplicated fork of the main parser

- **Severity:** HIGH
- **Confidence:** High
- **Validation:** Confirmed
- **Files/regions:** `src/lib/parser.ts:253-539`, `src/lib/parser.ts:557-641`, `public/workers/trackParser.worker.js:45-262`, `scripts/smoke-static.mjs:183-213`

The app has two implementations of the Google Location History parser: TypeScript source in `src/lib/parser.ts` and hand-maintained JavaScript in `public/workers/trackParser.worker.js`. The smoke guard checks size constants and some error-code strings, but it does not prove that `parseRecords`, `parseTimelineObjects`, `parseTimelineEdits`, `parseSemanticSegments`, dedupe, sorting, or future format handling stay equivalent.

**Concrete failure scenario:** A future fix adds support for a new Google export shape in `src/lib/parser.ts`. Small files may work through the bounded main-thread fallback, while large files routed to the worker fail or silently drop data because the public worker copy was not updated.

**Suggested fix / tradeoff:** Move shared Google parsing logic into a worker-safe module and build/import it into the worker instead of manually copying it. If the static-export worker must remain a plain public JS file, add a generation step plus E2E/unit parity tests that run the same fixtures through both parser paths.

### 2. MapView is both rendering engine, map lifecycle owner, export surface, and extension point

- **Severity:** MEDIUM
- **Confidence:** High
- **Validation:** Confirmed
- **Files/regions:** `src/components/MapView.tsx:26-34`, `571-673`, `675-697`, `699-781`; `src/components/JourneyCreator.tsx:20-23`, `194-253`; `src/lib/useExportController.ts:136-186`

`MapView` is the shared mutable integration point for normal playback, style reloads, journey drawing, and export capture. `JourneyCreator` reaches into the same MapLibre instance and installs its own sources/layers/listeners, while `useExportController` resizes the same live map container and drives the camera imperatively.

**Concrete failure scenario:** A new feature adds another overlay layer or another style reload listener. On a style change during journey creation or export, layer re-add order and cleanup responsibilities become ambiguous. A layer can disappear, be re-added twice, or be removed by the wrong owner.

**Suggested fix / tradeoff:** Introduce a small map-layer boundary such as a `useMapLayerRegistry` or explicit `MapOverlayController` API owned by `MapView`.

### 3. App-shell state remains a broad orchestration hub with high prop coupling

- **Severity:** MEDIUM
- **Confidence:** High
- **Validation:** Confirmed
- **Files/regions:** `src/app/page.tsx:61-182`, `258-315`, `462-581`; `src/components/TrackWorkspace.tsx:13-50`; `.context/project/02-architecture.md:130-138`

The shell has become the mediator for nearly every concern. `TrackWorkspace` receives a wide prop surface, and export/playback/scene changes cross several components through callbacks.

**Concrete failure scenario:** A future multiple-tracks or saved-projects feature would require touching `page.tsx`, `TrackWorkspace`, `MapView`, `useExportController`, scene state, trim state, and export reset logic at once.

**Suggested fix / tradeoff:** Introduce a typed session reducer or `useTrackSessionController` that owns `fullTrack`, `track`, `trackSessionKey`, trim, scene invalidation, and export-reset triggers.

### 4. Static-export deployment assumptions are hard-coded around `/travelback`

- **Severity:** MEDIUM
- **Confidence:** High
- **Validation:** Confirmed
- **Files/regions:** `next.config.ts:3-10`, `src/lib/env.ts:1`, `src/types.ts:23-45`, `package.json:8`, `playwright.static.config.ts:17-18`, `README.md:21`, `README.md:202-203`

The code is internally consistent for GitHub Pages, but deployment target is encoded through `NODE_ENV === 'production'` rather than an explicit deploy base-path setting. Production builds for root hosting, preview hosting, or a fork under a different repository path will emit incorrect asset URLs unless the code is changed.

**Suggested fix / tradeoff:** Make base path explicit (`NEXT_PUBLIC_BASE_PATH` / `TRAVELBACK_BASE_PATH` / `BASE_PATH`), defaulting to `''`, with CI setting `/travelback` for GitHub Pages.

### 5. Export memory guard estimates encoded output only, not total browser memory pressure

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Validation:** Likely; manual validation needed on lower-memory devices
- **Files/regions:** `src/lib/videoEncoder.ts:7`, `32-34`, `70-72`, `84-96`; `src/lib/useExportController.ts:188-199`; `src/components/ExportPanel.tsx:100-110`

The browser-only export memory accounting is optimistic. Encoded output size is only part of the footprint; the MapLibre canvas, WebCodecs/mediabunny internals, output buffer, Blob wrapping, preview video, and object URL all add pressure.

**Concrete failure scenario:** A mobile browser accepts a 4K or long 1080p export because estimated encoded bytes are under 256 MB, then crashes or kills the tab during finalize or Blob creation.

**Suggested fix / tradeoff:** Add device/browser-aware export presets and a lower default cap for mobile/touch devices; warn when resolution × fps × duration crosses a frame-work threshold even if encoded bytes are below the cap.

### 6. CSP/static hardening depends on post-build HTML rewriting with fragile Next output assumptions

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Validation:** Confirmed design risk
- **Files/regions:** `src/app/layout.tsx:53-67`, `scripts/harden-static-export.mjs:7`, `72-82`, `114-128`, `scripts/smoke-static.mjs:111-154`

The hardening script is well guarded, but it relies on matching Next’s emitted inline script shape. A Next serialization change can break production builds or leave an unexpected CSP shape if not caught.

**Suggested fix / tradeoff:** Keep the smoke guard, but isolate the bootstrap script in the most stable supported Next mechanism available, or add a fixture test that runs `harden-static-export` against representative emitted HTML.

## Positive Architecture Notes

Browser-only privacy boundary is consistently documented and mostly enforced. Static smoke checks are strong. Export cancellation/cleanup and playback timing are explicit. Distance-based interpolation and timeline selection are internally aligned.

## Root Cause

The repository has grown by incrementally hardening specific bugs and edge cases while preserving a single-page static architecture. That has produced strong localized fixes, but also a few gravity wells: duplicated parser logic, a central page shell, and a shared imperative map instance.

## Recommendations

1. Unify parser/worker logic.
2. Create a map-layer ownership boundary.
3. Extract track-session orchestration from `page.tsx`.
4. Parameterize base path.
5. Make export limits device-aware.
6. Keep hardening smoke tests and add fixture coverage for HTML rewriting.

## Missed-Issue Sweep

Checked static export/CSP, browser/server boundary, worker/data flow, parser architecture, export architecture, state management, and tests. No immediate architecture blocker beyond listed risks.

## Skipped-File Confirmation

Skipped generated/vendor/runtime-output directories and files: `node_modules/`, `out/`, `.next/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo`. Historical plans/reviews/reports under `.context` were not treated as current architecture source.
