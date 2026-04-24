# Code Reviewer — Cycle C2 (2026-04-24)

## Scope

Repo-wide review for **code quality, logic, SOLID boundaries, and maintainability**. Source code was not modified. This file was updated as the requested review artifact.

## Context and rules read

- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- Existing `.context/reviews/cycle-c2-code-reviewer-2026-04-24.md`

## Inventory reviewed

Runtime/source:
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Components: `Controls`, `ElevationProfile`, `ErrorBoundary`, `ExportPanel`, `FileUpload`, `GlobalToolbar`, `GoogleGuide`, `JourneyCreator`, `KeyboardHelp`, `MapView`, `ModalDialog`, `SceneEditor`, `ThemeToggle`, `TimelineSelector`, `Toast`, `TrackToolbar`, `TrackWorkspace`
- Libraries: `camera`, `env`, `i18n`, `interpolate`, `parser`, `useExportController`, `usePlaybackController`, `videoEncoder`
- Types/constants: `src/types.ts`
- Worker: `public/workers/trackParser.worker.js`

Project/test/config:
- `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, Playwright configs
- `scripts/fetch-map-styles.mjs`, `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- `e2e/travelback.spec.ts` and fixtures

Git state during review:
- No tracked source diff (`git diff --name-only` empty).
- Existing untracked review artifacts under `.context/reviews/` were present; I did not touch other agents' review files.

## Verification performed

- `git status --short` / `git diff --name-only` / `git diff --stat`
- `npm run typecheck` — passed
- `npm run lint` — passed
- `npm run build` — passed, including `postbuild` CSP hardening
- `npm run smoke:static` — passed
- Pattern scan fallback for `console.log`, empty catches, secret-like literals — no source-code blockers found; script logging only
- Attempted OMX code-intel `lsp_diagnostics_directory` / `ast_grep_search`; code-intel was unavailable, so review used `tsc --noEmit`, ESLint, grep, and manual inspection as fallback.

## Findings

### [MEDIUM] Large JSON imports can still fall back to main-thread parsing when Worker creation is unavailable

**File:** `src/lib/parser.ts:485-515`, `src/lib/parser.ts:557-569`  
**Confidence:** High

`JSON_MAX_FILE_SIZE` allows JSON files up to 100 MB, while `MAIN_THREAD_JSON_FALLBACK_SIZE` intentionally limits safe main-thread fallback copies to 16 MB. That safety boundary is enforced for worker runtime errors (`worker.onerror`) but not for the two earlier fallback paths:

- `typeof Worker === 'undefined'` directly decodes/parses the full transferred buffer (`493-495`).
- synchronous worker-construction failure logs a warning and decodes/parses the full buffer (`504-515`).

That means a browser/environment without worker support, or one where the worker constructor fails synchronously due CSP/path/runtime policy, can still parse a 100 MB Google JSON on the main thread and freeze the app. The later `worker.onerror` path correctly avoids large main-thread fallback when `fallbackBuffer` is absent (`557-569`), so the inconsistency is local and fixable.

**Suggested fix:** Route all no-worker / worker-creation-failed paths through the same bounded fallback policy: only decode on the main thread when `buffer.byteLength <= MAIN_THREAD_JSON_FALLBACK_SIZE`; otherwise reject with a user-facing parse/runtime error asking for a supported browser or smaller file.

---

### [MEDIUM] Google JSON parser logic is duplicated across TypeScript source and a hand-maintained public worker

**Files:**
- `src/lib/parser.ts:182-483`, `src/lib/parser.ts:485-572`
- `public/workers/trackParser.worker.js:44-248`, `public/workers/trackParser.worker.js:250-321`

**Confidence:** High

The Google Location History parsing pipeline exists twice: once in `src/lib/parser.ts` and again as hand-written JavaScript in `public/workers/trackParser.worker.js`. The duplicate includes format detection, E7/decimal parsing, semantic segment handling, dedupe/sort rules, size/depth constants, and point limits.

This is a real maintainability/SOLID risk because parser fixes must be applied in two places with no compile-time linkage. It also leaves the worker copy outside the main TypeScript type-safety path, while the app relies on equivalent behavior between worker and fallback parsing.

**Suggested fix:** Move shared Google parser logic into a worker-importable module and generate/bundle the worker from the same TypeScript source, or add a small build/check script that verifies the public worker is generated from the shared source and not hand-edited. At minimum, add regression tests that parse the same fixtures through both the worker and main-thread path and compare normalized tracks.

---

### [LOW] Saved explicit map style is not restored into the explicit-choice flag, so a later theme toggle can overwrite it

**File:** `src/app/page.tsx:48-59`, `src/app/page.tsx:302-327`  
**Confidence:** High

`mapStyleKey` correctly restores `travelback-mapstyle` from localStorage (`49-59`), and `cycleStyle` marks the current session as explicit (`315-326`). However, `hasExplicitMapStyleChoice` always initializes to `false` (`48`). After a reload with a saved non-theme-derived map style, the next manual theme toggle enters `handleModeChange`, sees `!hasExplicitMapStyleChoice`, and rewrites the saved map style to `dark` or `voyager` (`302-313`).

Existing tests cover explicit map style surviving later system-theme changes in the same session, but not the persisted-style-after-reload path.

**Suggested fix:** Initialize `hasExplicitMapStyleChoice` from the presence of a valid saved `travelback-mapstyle`, or derive this from storage alongside `mapStyleKey` so persisted explicit choices remain explicit after reload.

---

### [LOW] Journey Creator can miss initialization if activated before the MapLibre handle exists

**File:** `src/components/JourneyCreator.tsx:221-245`, `src/components/JourneyCreator.tsx:393-412`  
**Confidence:** Medium

The Journey Creator setup effect only depends on `isActive` and immediately returns if `mapRef.current?.getMap()` is unavailable (`221-223`). If the user activates route drawing before `MapView` has finished creating the MapLibre instance, the effect exits and will not retry because neither `mapRef.current` nor map readiness is a React dependency. The UI can remain active without click/drag listeners or journey layers.

The race is narrow because map initialization normally happens quickly, but the code path is real and can show up on slow devices, blocked style loads, or delayed WebGL initialization.

**Suggested fix:** Expose map readiness as state from `MapView`/`Home`, disable the Draw Route action until the map handle is ready, or have `JourneyCreator` subscribe/retry on map `load`/`style.load` rather than relying on a one-shot `isActive` effect.

## Non-findings / current positives

- No tracked source diff was present, so there were no implementation-specific spec regressions to review.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke:static` all passed.
- Previously reported Nominatim/free-form search privacy issue is not current: Journey Creator now parses coordinate/map-link input locally (`src/components/JourneyCreator.tsx:74-110`, `428-445`) and static CSP smoke asserts Nominatim is not allowed (`scripts/smoke-static.mjs:96-102`).
- Static CSP hardening and local map-style checks are covered by `scripts/harden-static-export.mjs` and `scripts/smoke-static.mjs`.

## Recommendation

**COMMENT** — no high/critical blockers found. Address the two medium maintainability/performance items before further expanding parser/import functionality; queue the low logic/race items with preference-state and Journey Creator polish.
