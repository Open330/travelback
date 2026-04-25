# Cycle 1 Architect Review — 2026-04-25

## Inventory

### Project rules reviewed

- `.context/README.md:27-29` — Product purpose: animate GPX/KML/Google Location History into travel videos.
- `.context/development/01-conventions.md:5-16` — Rules: `.context/` is authoritative; Next 16, React 19, TS strict, client-side app.
- `.context/development/01-conventions.md:52-66` — Required verification expectations and dependency constraints.
- `.context/project/01-overview.md:17-28` — Build/test commands.
- `.context/project/02-architecture.md:24-43` — Intended data flow: upload/creator → parser → page session boundary → workspace/playback/map.
- `.context/project/02-architecture.md:45-67` — Intended export pipeline.
- `.context/project/02-architecture.md:103-139` — Client-only trust boundary and state architecture.

### Current working-tree areas reviewed

Uncommitted changes are concentrated in parser/worker, timeline trim, export UI, static serving/smoke checks, i18n, and E2E fixtures/tests. Key reviewed files:

- Parser/worker: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
- State shell: `src/app/page.tsx`, `src/components/TrackWorkspace.tsx`
- Map/export boundary: `src/components/MapView.tsx`, `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`
- Timeline and journey editing: `src/components/TimelineSelector.tsx`, `src/components/JourneyCreator.tsx`
- Static serving/tests: `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `e2e/travelback.spec.ts`
- Project docs and aggregate context: `.context/project/*`, `.context/reviews/_aggregate.md`

`git diff --check` reported no whitespace errors.

---

## Findings

### 1. HIGH — Timeline drag now commits expensive session state on every animation frame

**Evidence**

- `src/components/TimelineSelector.tsx:202-243` updates ratios and calls `onRangeChangeRef.current(...)` inside `applyDragNow`.
- `src/components/TimelineSelector.tsx:245-255` schedules that work via `requestAnimationFrame` during drag.
- `src/app/page.tsx:274-301` handles every range change by slicing `fullTrack.points`, resetting export state, setting a new `track`, and resetting playback.
- `src/app/page.tsx:147-150` recomputes cumulative distances when the sliced `track.points` reference changes.
- `src/components/TrackWorkspace.tsx:138-145` wires the full-track timeline directly to `handleRangeChange`.

**Failure scenario**

On a large Google/GPX track near the 250k point cap, dragging either timeline handle can emit ~60 commits/sec. Each commit slices arrays, resets export state, creates a new track object, and triggers distance recomputation. This can jank or freeze trimming, repeatedly revoke an existing export preview, and make playback jump while the user is still dragging.

**Severity:** High  
**Confidence:** High

**Concrete fix**

Separate transient drag state from committed track state:

1. Let `TimelineSelector` update visual handle positions locally during drag.
2. Commit `onRangeChange` only on pointer-up/keyboard commit, or introduce separate `onRangePreview` throttled/debounced without session resets.
3. In `page.tsx`, call `resetExportSession()` only when the committed range actually changes.
4. Consider `useTransition` for large track slicing.

---

### 2. MEDIUM-HIGH — Google parser logic is duplicated across main thread and public worker

**Evidence**

- Main parser Google logic lives in `src/lib/parser.ts:253-535`.
- Worker parser duplicates equivalent logic in `public/workers/trackParser.worker.js:45-253`.
- Worker constants/errors are manually mirrored at `public/workers/trackParser.worker.js:255-267`.
- The static smoke guard checks only constants/error-code shape, not parser behavior parity: `scripts/smoke-static.mjs:172-202`.
- The new revisit regression is E2E-only: `e2e/travelback.spec.ts:1393-1395`.

**Failure scenario**

A future Google Takeout format fix can land in `src/lib/parser.ts` but not in `public/workers/trackParser.worker.js`. Small JSON fallback and large worker-based imports would then parse the same user file differently. This is especially likely because the worker is a hand-copied public JS file rather than generated from the TypeScript parser source.

**Severity:** Medium-High  
**Confidence:** High

**Concrete fix**

Generate the worker from shared TypeScript parser code:

1. Move pure Google extraction/validation to a shared module.
2. Build `public/workers/trackParser.worker.js` from that module.
3. Add parity tests that run the same fixtures through main parser and worker wrapper.
4. Keep smoke-static as a deployment guard, not as the only parity mechanism.

---

### 3. HIGH — Google JSON point-budget guard is still heuristic and still requires full text decode / object parse

**Evidence**

- Main pre-parse budget is regex-based: `src/lib/parser.ts:476-485`.
- Main parser still performs full `JSON.parse(text)` after the scan: `src/lib/parser.ts:487-493`.
- Worker decodes the entire transferred buffer to text before checks: `public/workers/trackParser.worker.js:330-334`.
- JSON files up to 100 MB are accepted: `src/lib/parser.ts:546`.

**Failure scenario**

A 100 MB Google export with large metadata objects but fewer than 250k point-like keys still builds a full JSON object graph. The regex guard reduces one failure mode but does not bound parse-time memory. Conversely, unrelated JSON with many `"point"` keys can be rejected as `TOO_MANY_POINTS` before format recognition.

**Severity:** High  
**Confidence:** Medium-High

**Concrete fix**

Replace the regex budget with a schema-aware bounded parser path:

1. Prefer streaming/SAX-style extraction for known Google shapes.
2. Enforce point budget during extraction before retaining full objects.
3. Keep worker isolation, but do not rely on worker isolation as the memory budget.
4. If streaming is deferred, lower `JSON_MAX_FILE_SIZE` and document the limitation.

---

### 4. MEDIUM-HIGH — GPX/KML scalability is handled by a hard 1 MB product cap instead of a parser boundary

**Evidence**

- XML parsing is synchronous DOMParser work: `src/lib/parser.ts:158-160`.
- GPX/KML parse on the main thread: `src/lib/parser.ts:166-209`.
- Non-JSON uploads use `FileReader.readAsText` and parse inline: `src/lib/parser.ts:681-701`.
- XML limit is now 1 MB: `src/lib/parser.ts:545`.
- E2E locks rejection above 1 MB: `e2e/travelback.spec.ts:416-423`.

**Failure scenario**

Legitimate GPX/KML exports from long hikes, rides, or trips can exceed 1 MB and are rejected. If the limit is raised later to satisfy users, the app re-enters the original main-thread freeze risk.

**Severity:** Medium-High  
**Confidence:** High

**Concrete fix**

Workerize GPX/KML too, or add a streaming XML parser boundary. Keep the 1 MB cap only as a temporary safety limit. Update user-facing copy/docs to explain that large XML files are unsupported until XML parsing is moved off the main thread.

---

### 5. MEDIUM-HIGH — Map ownership leaks through `MapViewHandle`, coupling export and journey editing to MapLibre internals

**Evidence**

- `MapViewHandle` exposes raw map access plus export commands: `src/components/MapView.tsx:26-34`.
- Export directly resizes/applies camera/waits for idle through the handle: `src/lib/useExportController.ts:136-186`.
- JourneyCreator directly obtains the MapLibre map and mutates sources/layers/listeners: `src/components/JourneyCreator.tsx:183-192`, `src/components/JourneyCreator.tsx:256-286`, `src/components/JourneyCreator.tsx:406-430`.
- Architecture intends MapView to own map rendering: `.context/project/02-architecture.md:41-67`.

**Failure scenario**

Style reload, export resize, and journey overlay editing can all touch the same MapLibre instance. A future style or export change can accidentally remove JourneyCreator layers, leave `dragPan` disabled, or race listener cleanup because ownership is split between MapView, JourneyCreator, and export controller.

**Severity:** Medium-High  
**Confidence:** High

**Concrete fix**

Narrow the map boundary:

1. Keep raw `getMap()` private to MapView except possibly test-only debug access.
2. Move journey overlay sources/layers into MapView via declarative props.
3. Expose export as a small adapter: `resizeForExport`, `captureFrameWithCamera`, `restoreViewport`.
4. Keep all MapLibre layer/listener lifecycle cleanup in one owner.

---

### 6. MEDIUM — Preference state ownership remains split across bootstrap, app shell, and ThemeToggle

**Evidence**

- Bootstrap script owns first-paint theme/mapstyle/localStorage policy: `src/app/layout.tsx:53-66`.
- `page.tsx` duplicates storage keys and initial preference reads: `src/app/page.tsx:32-99`.
- `page.tsx` owns OS theme sync and map-style coupling: `src/app/page.tsx:198-227`.
- `page.tsx` owns manual theme/style mutations: `src/app/page.tsx:402-441`.
- `ThemeToggle` independently detects mode and listens to OS preference changes: `src/components/ThemeToggle.tsx:7-31`, `src/components/ThemeToggle.tsx:38-57`.

**Failure scenario**

A future preference-policy change, such as separating visual theme from map backdrop or changing system-theme behavior, requires edits in multiple places. That increases first-paint/hydration drift risk and makes tests brittle around theme state.

**Severity:** Medium  
**Confidence:** High

**Concrete fix**

Extract a `PreferencesProvider` / `usePreferences` boundary:

1. One reducer owns theme, map style, explicit-choice flags, locale, and units.
2. Bootstrap and React provider share the same storage schema constants.
3. ThemeToggle becomes fully controlled and has no independent OS listener.

---

### 7. MEDIUM — Product/docs still over-promise “map styles” as basemap context

**Evidence**

- Overview says MapLibre map support and fully local bundled map assets: `.context/project/01-overview.md:11-14`.
- Feature list advertises “5 map styles”: `.context/project/01-overview.md:91`.
- Architecture says normal map display no longer needs third-party map requests: `.context/project/02-architecture.md:109-112`.
- Bundled styles have no sources and only a background layer: `public/map-styles/voyager.json:1-28`, `public/map-styles/dark.json:1-28`.

**Failure scenario**

Users may expect a real basemap with roads/cities/terrain from names like Voyager/Liberty, but the app ships abstract backgrounds plus app-rendered route/grid context. This creates product expectation debt and future pressure to reintroduce remote tile dependencies.

**Severity:** Medium  
**Confidence:** High

**Concrete fix**

Rename UI/docs from “map styles” to “background themes” unless real local basemap assets are shipped. If true map context is required, add an explicit basemap provider boundary and privacy opt-in.

---

## Root Cause

The main architectural risk is that boundaries are still mostly component/ref based rather than capability based. `page.tsx` owns broad session state, `MapView` leaks its imperative MapLibre instance, and parser behavior is split between hand-maintained main-thread and worker implementations. Recent fixes address symptoms, but several long-term seams remain fragile under large files, timeline drag frequency, and future format/style/export changes.

## Recommendations

1. **Commit/preview split for timeline trimming** — Medium effort, high impact.
2. **Generate worker parser from shared parser source** — Medium/high effort, high impact.
3. **Move all parsing to bounded worker paths** — High effort, high impact.
4. **Introduce a narrow map/export adapter boundary** — Medium effort, medium-high impact.
5. **Extract preferences provider** — Medium effort, medium impact.
6. **Rename or re-scope “map styles” product language** — Low effort, medium impact.

## Trade-offs

| Option | Pros | Cons |
|---|---|---|
| Keep current caps/refs and add tests | Fast, low churn | Maintains duplicated parser/map ownership risk |
| Shared parser + generated worker | Removes drift and improves trust boundary | Requires build-step/tooling work |
| Streaming parser for all formats | Strongest large-file behavior | Highest implementation complexity |
| Declarative MapView ownership | Cleaner lifecycle and fewer races | Requires JourneyCreator/export refactor |
