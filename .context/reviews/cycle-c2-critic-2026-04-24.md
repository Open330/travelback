# Cycle C2 Critic Review — 2026-04-24

**Reviewer:** critic  
**Scope:** multi-perspective critique, hidden assumptions, user-facing failure modes, issue triage.  
**Mode:** read-only source review; no source code modified.  
**Result:** 3 real current issues identified (1 Medium, 2 Low). No Critical/High blockers.

## Context and rules read first

- `.context/README.md` — project purpose and context layout.
- `.context/development/01-conventions.md` — strict TypeScript/Next/React conventions and required verification commands.
- `.context/project/01-overview.md` — supported formats, client-only/static-export expectations, local map assets.
- `.context/project/02-architecture.md` — component/data flow, camera/export pipeline, CSP/static-hosting constraints.

## Inventory reviewed

Current-source and runtime-relevant files inspected:

- App shell/config: `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.github/workflows/deploy-pages.yml`.
- App entry/runtime: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`.
- Core track/camera/export logic: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/lib/i18n.ts`, `src/types.ts`.
- User-facing components: `src/components/FileUpload.tsx`, `MapView.tsx`, `JourneyCreator.tsx`, `TimelineSelector.tsx`, `ElevationProfile.tsx`, `Controls.tsx`, `TrackWorkspace.tsx`, `TrackToolbar.tsx`, `GlobalToolbar.tsx`, `ThemeToggle.tsx`, `SceneEditor.tsx`, `ExportPanel.tsx`, `ModalDialog.tsx`, `GoogleGuide.tsx`, `KeyboardHelp.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`.
- Build/static scripts and tests: `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `scripts/fetch-map-styles.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `e2e/travelback.spec.ts`, representative fixtures under `e2e/fixtures/`.
- Existing cycle context checked to avoid duplicating stale/non-current claims: `.context/reviews/cycle-c2-aggregate-2026-04-24.md`, `.context/reviews/cycle-c2-code-reviewer-2026-04-24.md`, `.context/reviews/cycle-c2-security-reviewer-2026-04-24.md`, and deferred antimeridian notes under `.context/plans/deferred-findings-cycle-r2-2026-04-23.md` / `.context/plans/deferred-findings-cycle-r3-2026-04-23.md`.

## Verification performed

- `npm run lint` — passed with no output.
- `npx tsc --noEmit --incremental false` — passed with no output.
- `npm audit --audit-level=low --json` — 0 vulnerabilities (`critical/high/moderate/low/info` all 0).
- `git status --short` after verification showed only other agents' untracked `.context/reviews/cycle-c2-*` artifacts plus this review target; no source files were modified.

## Findings

### C2-CRIT-001 — Antimeridian camera math still uses the wrong shifted-longitude domain

**Severity:** Medium  
**Confidence:** High  
**Perspective:** hidden geographic assumption / user-facing export failure  
**Files:** `src/lib/camera.ts:53-94`, `src/lib/camera.ts:102-120`, `src/lib/camera.ts:137-163`, `src/lib/camera.ts:341-435`; contrast with route rendering in `src/components/MapView.tsx:112-166` and fit-bounds handling in `src/components/MapView.tsx:169-203`.

`camera.ts` detects dateline-crossing boxes when `maxLng - minLng > 180`, but then shifts longitude with `((p.lng + 180) % 360 + 360) % 360` (`src/lib/camera.ts:64-72`). For a route with points at `170°E` and `170°W`, that maps `170` to `350` and `-170` to `10`, producing a shifted span of `340°` instead of the real `20°`. `overviewZoomFromBox()` then uses that bad shifted span (`src/lib/camera.ts:86-94`) and clamps the overview camera down near world view instead of framing the route.

The same shifted-domain mistake appears in `lerpCamera()` (`src/lib/camera.ts:102-120`). For scene transitions/gaps across the dateline, interpolating `170 -> -170` at 25% yields roughly `-95°`, so the camera can sweep through the wrong hemisphere rather than staying over the Pacific. This affects scene-based playback and export because `computeCameraForScene()` uses overview cameras for default opening/closing scenes (`src/lib/camera.ts:137-163`), and `computeCameraForProgress()` blends scene boundaries/gaps through `lerpCamera()` (`src/lib/camera.ts:341-435`).

This is inconsistent with map geometry code that already uses shortest wrapping for route display (`src/components/MapView.tsx:112-166`) and with `buildFitBounds()` which shifts negative longitudes by `+360` when the raw span crosses the antimeridian (`src/components/MapView.tsx:183-187`).

**User impact:** A Pacific/dateline trip (Tokyo → Anchorage, Fiji → Samoa, etc.) can render the route itself correctly while overview/default cinematic camera scenes zoom out to a world view or transition across the wrong side of the globe. Exports would preserve the bad camera path.

**Suggested fix:** Normalize crossed longitudes into a domain where the cluster is contiguous, e.g. for crossed boxes use `p.lng < 0 ? p.lng + 360 : p.lng` (matching `MapView.tsx:183-187`) or centralize this in a tested geo helper. For camera lerp, use `normalizeLng(a + shortestLngDelta(a, b) * easedT)`. Add an antimeridian fixture/regression covering overview zoom and scene transition centers.

---

### C2-CRIT-002 — Manual-route duplicate suppression is not antimeridian-aware

**Severity:** Low  
**Confidence:** High  
**Perspective:** user-facing edge case / carryover deferred correctness issue  
**Files:** `src/components/JourneyCreator.tsx:27-32`, `src/components/JourneyCreator.tsx:253-259`, `src/components/JourneyCreator.tsx:470-475`; related correct helper in `src/lib/interpolate.ts:5-15`.

`JourneyCreator` uses `approxDistanceMeters()` for the "too close to last waypoint" guard, but it computes raw longitude delta as `b.lng - a.lng` (`src/components/JourneyCreator.tsx:27-32`). At the antimeridian, points such as `179.999°` and `-179.999°` are meters apart but the raw delta is almost `360°`, so the guard in the map-click path (`src/components/JourneyCreator.tsx:253-259`) and coordinate-input path (`src/components/JourneyCreator.tsx:470-475`) will not suppress accidental duplicate/nearly duplicate waypoints.

The rest of the distance stack already handles this correctly via `shortestLngDelta()` in `src/lib/interpolate.ts:5-15`, so this is a localized inconsistency. It appears already acknowledged as deferred in `.context/plans/deferred-findings-cycle-r2-2026-04-23.md`, but it remains a real current issue.

**User impact:** A traveler manually drawing a route around Fiji/Samoa or the Aleutians can accidentally add duplicate points right across the dateline, producing confusing extra waypoint counts and tiny/zero-distance route segments that the UI should have rejected.

**Suggested fix:** Reuse `shortestLngDelta()` in `approxDistanceMeters()` or replace this local helper with a shared distance helper from `interpolate.ts`. Add a small regression for two manually entered coordinates straddling ±180°.

---

### C2-CRIT-003 — Scene preset names bypass localization and appear in English in non-English UI

**Severity:** Low  
**Confidence:** High  
**Perspective:** i18n/user-facing polish  
**Files:** `src/lib/camera.ts:210-334`, `src/components/SceneEditor.tsx:439-448`, `src/lib/i18n.ts:1720-1735`.

The locale system is complete at the key level (`TranslationKey` and `t()` in `src/lib/i18n.ts:1720-1735`), and most UI strings flow through translations. Scene presets are an exception: `generateDefaultScenes()`, `generateSimpleFlyover()`, `generateBirdeyeFlyover()`, and `generateDynamicScenes()` hardcode English names such as `Opening Overview`, `Bird's Eye`, `Flyover`, `Wide Open`, and `Street Level` (`src/lib/camera.ts:210-334`). `SceneEditor` renders `scene.name` directly in the editable textbox (`src/components/SceneEditor.tsx:439-448`), so users who switch to Korean/Japanese/Chinese/Spanish still see English preset scene names.

**User impact:** The scene editor breaks the otherwise localized experience for exactly the feature that non-technical users are likely to use via presets. The names are editable, so this is not blocking, but it is visible polish debt.

**Suggested fix:** Move user-facing preset naming out of `camera.ts` or pass translated names from `SceneEditor` when applying presets. Prefer keeping `camera.ts` as locale-neutral scene-shape generation and assigning names with `t()` at the UI boundary.

## Non-findings / triage notes

- **Security/privacy:** No current actionable security findings. CSP/static hardening, local-only map styles, parser bounds, filename sanitization, and dependency audit were verified. The app has no backend/API/auth boundary.
- **Build health:** Lint, TypeScript, and low-level audit are clean. I did not run `npm run build` or Playwright E2E in this critic pass because they write/update `out`, `.next`, and test artifacts while other agents are active.
- **Existing low-risk C2 code-review notes:** Prior C2 notes about `FileUpload` parent-callback error handling and fallback anchor cleanup are not counted here; current implementations are acceptable and the latter is already guarded by `finally` in `src/lib/videoEncoder.ts:191-211`.
- **Known deferred test gap:** There is still no antimeridian regression fixture in Playwright (`e2e/fixtures/` are Korea/Japan and Google-format focused). This matters because both C2-CRIT-001 and C2-CRIT-002 are dateline-only failures.

## Summary

- **Critical:** 0
- **High:** 0
- **Medium:** 1
- **Low:** 2
- **Total current issues:** 3
