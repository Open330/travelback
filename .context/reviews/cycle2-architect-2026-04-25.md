# Cycle 2 Architect Review — 2026-04-25

## Summary

Architecture status: **WATCH**.

The core client-only architecture is coherent: `page.tsx` owns session state, `MapView` owns MapLibre rendering, parser/export work stays browser-side, and static map styles are intentionally local. The main design risks are not isolated syntax defects; they are boundary risks around duplicated parser logic, imperative shared map ownership, export frame readiness, and state-reset coupling across track/session/export/scene flows.

## Scope / Inventory

Reviewed project guidance and architecture docs:
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`

Reviewed architecture-relevant runtime/config files:
- `package.json`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/types.ts`
- `src/lib/parser.ts`
- `src/lib/interpolate.ts`
- `src/lib/camera.ts`
- `src/lib/videoEncoder.ts`
- `src/lib/useExportController.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/i18n.ts`
- `src/lib/env.ts`
- `src/components/*.tsx`
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`
- `scripts/harden-static-export.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `e2e/travelback.spec.ts` import/test coverage map

No files were modified.

## Findings

| ID | Severity | Confidence | Status |
|---|---:|---:|---|
| ARCH-01 | High | High | Open |
| ARCH-02 | Medium-High | Medium | Open |
| ARCH-03 | Medium | High | Open |
| ARCH-04 | Medium | High | Open |
| ARCH-05 | Medium | High | Open |
| ARCH-06 | Low-Medium | High | Open |

---

## ARCH-01 — Google JSON parsing has two behavioral sources of truth

**Evidence**
- Main parser implements Google format parsing and flattening in `src/lib/parser.ts:253-538`.
- Worker reimplements equivalent parsing logic in `public/workers/trackParser.worker.js:45-262`.
- Main path creates the worker from a static public file in `src/lib/parser.ts:557-640`.
- Static smoke only checks selected constant/error-code mirroring, not parse-output parity, in `scripts/smoke-static.mjs:183-212`.

**Failure scenario**

A future fix for one Google export shape lands in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small fallback imports and Worker-capable large imports then produce different `points`, `segmentStartIndices`, dedupe behavior, or error codes for the same logical data.

**Fix**

Move Google parser core into one shared TypeScript module and build/import it into both app and worker contexts, or generate the worker from the same source. Add parity tests that run the same fixtures through both paths and deep-compare normalized output.

---

## ARCH-02 — Export frame capture depends on a weak “idle” abstraction for local no-tile styles

**Evidence**
- Export applies a camera state, sets playback progress, waits one `requestAnimationFrame`, then delegates to `waitForStableMap`: `src/lib/useExportController.ts:173-184`.
- `exportVideo()` captures each frame after `waitForIdle`: `src/lib/videoEncoder.ts:126-140`.
- `MapView.waitForIdle()` resolves immediately when `!map.isMoving()` and `map.areTilesLoaded()` are true: `src/components/MapView.tsx:515-568`.
- Static style policy intentionally removes remote basemap sources/symbols: `scripts/smoke-static.mjs:165-179`.

**Failure scenario**

Because bundled map styles have no tile sources, `areTilesLoaded()` can be true even though the just-applied `jumpTo()` render has not painted to the WebGL canvas yet. Export may capture stale/duplicate frames under timing pressure, especially during rapid scene camera transitions.

**Fix**

Replace the generic `waitForIdle()` export path with a `renderFrameAndWait(cameraState, signal)` MapView API that owns `jumpTo`, waits for at least one MapLibre `render` after the camera mutation, then optionally waits for idle. Add an export regression that samples camera/canvas changes across consecutive frames.

---

## ARCH-03 — MapLibre ownership leaks across page, export, and journey creation

**Evidence**
- `MapViewHandle` exposes raw map/canvas and imperative map operations: `src/components/MapView.tsx:26-34`.
- Page calls `clearTrackArtifacts()` and `applyCameraState()` directly: `src/app/page.tsx:266-280`, `src/app/page.tsx:397-414`.
- Export controller resizes the map, applies camera state, waits for idle, and resets size through the ref: `src/lib/useExportController.ts:105-186`, `src/lib/useExportController.ts:218-243`.
- `JourneyCreator` reaches through `getMap()` and directly adds/removes sources, layers, listeners, and style-load handlers: `src/components/JourneyCreator.tsx:183-254`, `src/components/JourneyCreator.tsx:256-463`.
- `MapView` also owns style-load rehydration and track layers: `src/components/MapView.tsx:636-642`, `src/components/MapView.tsx:675-697`, `src/components/MapView.tsx:807-867`.

**Failure scenario**

A style reload or mode transition occurs while Journey Creator or export logic is active. Multiple owners may re-add/remove layers or listeners against the same MapLibre instance. Current guards reduce the risk, but the architecture requires every caller to know MapLibre lifecycle details.

**Fix**

Make `MapView` the only MapLibre mutator. Move journey overlay rendering into `MapView` as declarative props or expose narrow overlay methods (`setJourneyOverlay`, `clearJourneyOverlay`) instead of `getMap()`. Keep export as a single transactional MapView method rather than scattered `resize/apply/wait/reset` calls.

---

## ARCH-04 — Track session state is still spread across many independent state atoms

**Evidence**
- `page.tsx` owns `fullTrack`, `track`, theme/style, modals, scenes, export, playback, session key, units, and focus state separately: `src/app/page.tsx:61-112`.
- Reset logic is manually coordinated in `resetTrackWorkspace`, `loadTrackIntoSession`, and `startFreshJourneySession`: `src/app/page.tsx:258-286`.
- Timeline trimming mutates track, scenes, export, and playback in one callback: `src/app/page.tsx:288-315`.
- `TrackWorkspace` receives a wide prop surface spanning session, scene, playback, toolbar, export, locale, and trim concerns: `src/app/page.tsx:524-560`; `src/components/TrackWorkspace.tsx:13-50`.

**Failure scenario**

A future feature edits track/session state but forgets one coupled reset path. Examples: stale completed export remains after a scene edit, scenes authored against an old full track survive a trim, or playback/camera state is restored inconsistently after loading a new track.

**Fix**

Introduce a `useTrackSessionController` reducer for session-level transitions: `loadTrack`, `startJourney`, `trimRange`, `editScenes`, `resetExportResult`, `resetPlayback`. Keep derived distances and scene/export invalidation in the reducer boundary.

---

## ARCH-05 — Large JSON imports are worker-isolated but still all-at-once materialized

**Evidence**
- JSON files are accepted up to 100 MB: `src/lib/parser.ts:541-544`.
- JSON path reads the full file as an `ArrayBuffer`: `src/lib/parser.ts:670-672`.
- Worker decodes the full buffer to text, depth-scans it, then parses the full JSON object graph: `public/workers/trackParser.worker.js:325-331`.
- Main fallback also depth-scans and `JSON.parse`s full text: `src/lib/parser.ts:485-490`.
- Flattening sorts/deduplicates materialized segment arrays: `src/lib/parser.ts:400-463`; worker mirror at `public/workers/trackParser.worker.js:155-217`.

**Failure scenario**

A valid but dense Google export under the 100 MB byte cap can still allocate a large string, a full parsed object graph, intermediate segment arrays, and final points before rejection or completion. The worker protects UI responsiveness but not tab memory pressure.

**Fix**

Add a streaming/bounded JSON extraction strategy for Google formats, or lower limits based on measured browser memory. At minimum, instrument worker memory/error outcomes and add tests for large-but-valid and large-invalid JSON shapes.

---

## ARCH-06 — Scene authoring stores normalized ranges instead of preserving raw user intent

**Evidence**
- `normalizeScenes()` clamps, sorts, shifts starts to prior ends, and filters zero-width scenes: `src/lib/camera.ts:19-43`.
- `SceneEditor.commitScenes()` detects warnings on raw scenes, then immediately calls `onChange(normalizeScenes(nextScenes))`: `src/components/SceneEditor.tsx:254-278`.
- Playback/export also normalize scenes again before camera computation: `src/components/MapView.tsx:444-448`; `src/lib/videoEncoder.ts:78-80`.

**Failure scenario**

A user creates overlapping or invalid ranges. The editor mutates them into normalized ranges, so the UI loses the raw authoring intent while only showing a transient warning. Future editor features such as undo, timeline snapping, or explicit overlap visualization will be harder to reason about.

**Fix**

Store raw authored scenes in UI state. Derive normalized scenes only for playback/export. Surface validation and coverage warnings without destructively rewriting the editor model.

## Positive notes

- Client-only/static deployment is consistently represented in config: `next.config.ts:3-15`, `src/app/layout.tsx:63-66`.
- Local map styles are guarded against remote basemap dependencies by smoke checks: `scripts/smoke-static.mjs:165-179`.
- Playback timing is isolated from the app shell in `usePlaybackController`: `src/lib/usePlaybackController.ts:17-174`.
- Export lifecycle is isolated from UI controls in `useExportController`: `src/lib/useExportController.ts:44-270`.
- Distance-based interpolation is centralized in `src/lib/interpolate.ts:18-142`, with antimeridian support via `shortestLngDelta`.

## Recommended priority order

1. **ARCH-01** — eliminate parser duplication or add parity tests first.
2. **ARCH-02** — harden export frame readiness before deeper export features.
3. **ARCH-03** — reduce raw MapLibre access before adding more overlays/tools.
4. **ARCH-04** — consolidate session transitions once current feature churn slows.
5. **ARCH-05** — plan bounded/streaming import work if large Google Takeout files remain a target.
6. **ARCH-06** — preserve raw scene state before expanding scene editing UX.

## Verification / Final Sweep

- Read-only review only; no files changed.
- Did not run build/lint/typecheck because this Architect role is read-only and those commands can create generated artifacts such as `.next`.
- Final sweep checked source imports, app shell, parser/worker, camera/interpolation, map/export pipeline, session state, static hardening scripts, and relevant E2E coverage references.
