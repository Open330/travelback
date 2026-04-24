# Cycle C2 Debugger Review — 2026-04-24

**Reviewer:** debugger
**Scope:** latent bugs, edge cases, failure modes, regressions after cycle 1, suspicious flows
**Mode:** read-only source review; no source code modified
**Result:** 2 real current issues identified (1 Medium, 1 Low)
**Confidence:** High

## Context read first

- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`

## Inventory reviewed

Current source and supporting runtime files inspected:

- App shell/runtime: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Core logic: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/types.ts`
- User-facing components: `src/components/FileUpload.tsx`, `MapView.tsx`, `JourneyCreator.tsx`, `TimelineSelector.tsx`, `SceneEditor.tsx`, `ExportPanel.tsx`, `Controls.tsx`, `TrackWorkspace.tsx`, `TrackToolbar.tsx`, `GlobalToolbar.tsx`, `ThemeToggle.tsx`, `ModalDialog.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`, `GoogleGuide.tsx`, `KeyboardHelp.tsx`, `ElevationProfile.tsx`
- Build/static scripts and tests: `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `scripts/fetch-map-styles.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `e2e/travelback.spec.ts`
- Existing cycle context checked to avoid stale claims: prior cycle C2 review artifacts plus deferred finding notes

## Verification performed

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run build` — passed
- `npm run smoke:static` — passed
- Manual math reproduction against current source formulas for the two dateline-sensitive paths below

## Findings

### 1) Antimeridian camera math still uses the wrong shifted-longitude domain

**Severity:** Medium
**Confidence:** High
**Files:** `src/lib/camera.ts:53-94`, `src/lib/camera.ts:102-120`, `src/lib/camera.ts:137-163`, `src/lib/camera.ts:341-435`

`computeBoundingBox()` switches to a shifted-longitude path when `maxLng - minLng > 180`, but it maps longitudes with `((p.lng + 180) % 360 + 360) % 360` (`src/lib/camera.ts:64-72`). For a route that crosses the dateline, e.g. points near `170°E` and `170°W`, that produces a spread of `350°` and `10°` instead of a contiguous short span. `overviewZoomFromBox()` then treats the route as a near-world-sized box and clamps the overview zoom to a very wide view (`src/lib/camera.ts:86-94`).

The same shifted-domain mistake is repeated in `lerpCamera()` (`src/lib/camera.ts:102-120`). With the current code, interpolating from `[170, 0]` to `[-170, 0]` at `t = 0.25` yields `-63.125°` instead of staying near the short path across `180°`. That means dateline-crossing scene gaps and transition blends can sweep through the wrong hemisphere during playback/export.

The regression is visible in the scene pipeline because `computeCameraForScene()` uses `overviewZoomFromBox()` for overview scenes (`src/lib/camera.ts:137-163`) and `computeCameraForProgress()` blends scene boundaries/gaps through `lerpCamera()` (`src/lib/camera.ts:341-435`).

**Minimal reproduction:** current formulas give `overviewZoomFromBox` a `maxSpan` of `340` for a `170/-170` route, and `lerpCamera([170,0],[-170,0],0.25)` returns `[-63.125, 0]`.

**Fix direction:** use a dateline-safe domain consistently, e.g. `p.lng < 0 ? p.lng + 360 : p.lng` for crossed boxes or a shared helper built around `shortestLngDelta()` / `normalizeLng()`.

---

### 2) Manual route duplicate suppression is not antimeridian-aware

**Severity:** Low
**Confidence:** High
**Files:** `src/components/JourneyCreator.tsx:27-32`, `src/components/JourneyCreator.tsx:253-259`, `src/components/JourneyCreator.tsx:465-475`

`JourneyCreator` uses a local `approxDistanceMeters()` helper to reject accidental duplicate waypoints, but it computes raw longitude delta as `b.lng - a.lng` (`src/components/JourneyCreator.tsx:28-32`). That is fine for ordinary routes but breaks at the dateline: two points only a few hundred meters apart on opposite sides of `±180°` look like they are almost a full globe apart.

The guard is used in both the click-to-add path (`src/components/JourneyCreator.tsx:253-259`) and the coordinate-search path (`src/components/JourneyCreator.tsx:465-475`). With the current math, a pair like `{ lat: 0, lng: 179.999 }` and `{ lat: 0, lng: -179.999 }` computes as roughly `40,029 km`, so duplicate suppression fails exactly where the user expects it most near the antimeridian.

`src/lib/interpolate.ts:5-15` already has the correct `shortestLngDelta()` primitive, so this is a localized inconsistency rather than a missing primitive.

**Minimal reproduction:** current formula reports ~`40,029,951 m` for two points separated by about `0.002°` across the dateline, while the shortest-path distance is only about `223 m`.

**Fix direction:** reuse `shortestLngDelta()` in `approxDistanceMeters()` or replace the local helper with a shared distance utility from `src/lib/interpolate.ts`.

## Non-findings

- The previously reported parser segment-start off-by-one is fixed in both the main-thread parser and the worker (`src/lib/parser.ts:197-203`, `public/workers/trackParser.worker.js:197-203`).
- No other actionable regressions were found in FileUpload, export cleanup, playback, or static-export hardening during this pass.
