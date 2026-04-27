# Cycle 2 Code Reviewer Review — 2026-04-26

## Scope, inventory, and method

Review angle: code quality, logic, SOLID boundaries, and maintainability. I did not edit application code, commit, push, or run destructive commands.

Inventory was built before analysis. Review-relevant files examined:

- Runtime/source: 31 files under `src/` (`src/app/*`, 17 `src/components/*.tsx`, 8 `src/lib/*.ts`, `src/types.ts`, CSS files).
- Scripts/configs: 6 files under `scripts/`; root configs `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `postcss.config.mjs`, `next-env.d.ts`.
- Tests/fixtures: `e2e/travelback.spec.ts` plus 17 fixtures.
- Public runtime assets: `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, public SVG/sample route assets relevant to static export and runtime paths.
- Docs/context: `README.md`, `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/*`, `.context/plans/**`, `.context/reviews/**`, `plan/**`, and `.omx/context/review-plan-fix-cycle2-prompt.md` were inventoried/scanned for constraints, active/deferred findings, and behavior claims.
- Current worktree extras: existing untracked review artifacts and `.tmp-travelback-mina-manual.mjs` were considered so this pass did not mistake another agent's files for product code.

Verification/evidence collected:

- `git diff --name-status` / `git diff --stat`: no tracked code diff under review.
- `npm run lint`: passed.
- `npm run typecheck`: passed (`next typegen && tsc --noEmit`).
- MCP `lsp_diagnostics_directory` / `ast_grep_search` were attempted but the code-intel transport closed; the TypeScript gate above is the fallback diagnostic evidence.
- Behavior was validated from source code, not comments or tests.

## Finding summary

- CRITICAL: 0
- HIGH: 0
- MEDIUM: 6
- LOW: 2
- Total: 8

## Findings

### C2-CR-01 — Google parser logic is hand-mirrored in two runtimes

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Code region:** `src/lib/parser.ts:254-539`, `src/lib/parser.ts:557-640`; mirrored in `public/workers/trackParser.worker.js:1-343`; parity guard only checks constants/tokens in `scripts/smoke-static.mjs:223-260`.
- **Issue:** The main-thread fallback parser and worker parser independently implement Google JSON shape detection, E7 conversion, semantic segment parsing, sorting, deduplication, point budgets, depth checks, and error-code mapping. The smoke guard checks size constants/error-code tokens and function-name presence, but it does not prove semantic parity of parser output.
- **Failure scenario:** A future fix changes `parseSemanticSegments`, timed-observation deduplication, visit handling, or error mapping in only one file. Users on browsers with Worker support get one route shape, while browsers using the fallback get a different route, different segment boundaries, or different error messaging.
- **Suggested fix:** Move Google parsing into a single worker-importable module or generate the worker from shared source. Add parity tests that run every JSON fixture through both paths and compare normalized `{ points, segmentStartIndices }` including serialized dates and error codes.

### C2-CR-02 — GPX/KML point limits are enforced after full in-memory materialization

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Risk
- **Code region:** `src/lib/parser.ts:51-146`, `src/lib/parser.ts:195-224`, `src/lib/parser.ts:704-715`.
- **Issue:** `extractPointsFromGeoJSON()` and the GPX `segments.reduce()` path accumulate all points first; the `MAX_TRACK_POINTS` check is applied later in `finalizeTrack()`. Unlike the Google JSON helpers, these XML-derived paths do not call `assertPointBudget()` while building segments.
- **Failure scenario:** A dense but under-4MB GPX/KML file, or a future larger XML limit, can force the browser to allocate and transform excessive points before rejection. The post-parse guard preserves the final invariant but not responsiveness/memory during parsing.
- **Suggested fix:** Thread `assertPointBudget()` into `pushSegment()`/GPX segment accumulation before pushing or before each batch append. Prefer rejecting at the extraction boundary, not after the complete `Track` has been built.

### C2-CR-03 — Static hardening silently tolerates a failed bootstrap-script rewrite

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Code region:** `scripts/harden-static-export.mjs:74-84`, `scripts/harden-static-export.mjs:116-128`; source bootstrap is in `src/app/layout.tsx:53-58`.
- **Issue:** `inlineTravelbackBootstrap()` uses one exact regex for Next's serialized `travelback-bootstrap` script and returns `html.replace(...)` without reporting whether a replacement occurred. The caller only asserts CSP meta replacement, so a Next output-shape change can leave the bootstrap serialized in a different form while the postbuild still succeeds.
- **Failure scenario:** Next changes the `self.__next_s` payload key order, escaping, whitespace, or wrapper. `npm run build` still computes hashes and hardens CSP, but the early frame-busting/theme bootstrap is no longer rewritten into the intended direct inline script, weakening first-paint behavior and anti-framing fallback without a build failure.
- **Suggested fix:** Return `{ html, replaced }` from `inlineTravelbackBootstrap()` and throw when the source contains `travelback-bootstrap` but no replacement occurred. Add fixture tests with representative Next HTML and at least one intentionally changed payload shape.

### C2-CR-04 — JourneyCreator publishes invalid/degenerate line geometry for fewer than two waypoints

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Status:** Likely
- **Code region:** `src/components/JourneyCreator.tsx:80-101`, `src/components/JourneyCreator.tsx:199-211`; contrast with `src/components/MapView.tsx:150-155`.
- **Issue:** `buildLineGeoJSON()` always returns a `LineString` with however many waypoints exist, including `[]` during layer initialization and a single coordinate after the first click. GeoJSON `LineString` consumers generally expect at least two positions; `MapView.buildTrackGeometry()` explicitly duplicates a single coordinate before feeding a line layer, but JourneyCreator does not.
- **Failure scenario:** Entering Journey Creator or adding the first waypoint can produce MapLibre worker validation errors or a dropped line source/layer. The visible point layer may still work, making the bug intermittent and easy to miss until a browser/MapLibre upgrade tightens validation.
- **Suggested fix:** For 0 points, use an empty `FeatureCollection` or do not set the line source yet. For 1 point, either duplicate the coordinate as `MapView` does or emit a `MultiLineString`/empty line only once at least two points exist.

### C2-CR-05 — Map layer ownership is split across `MapView` and feature code

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Risk
- **Code region:** `src/components/MapView.tsx:26-34`, `src/components/MapView.tsx:571-871`, `src/components/JourneyCreator.tsx:203-263`, `src/components/JourneyCreator.tsx:265-476`.
- **Issue:** `MapView` exposes the raw MapLibre map (`getMap`) while also owning style lifecycle, route/trail/marker layers, export resize/idle behavior, and debug state. `JourneyCreator` then independently adds/removes sources, layers, and style reload listeners against the same map. This violates a clear ownership boundary: two components coordinate MapLibre internals through shared mutable side effects.
- **Failure scenario:** A style reload, map retry, export resize, or future layer ID change can leave JourneyCreator listeners bound to a stale style, remove layers out of order, or re-add feature layers at the wrong time. These failures are cross-file and will not be caught by type checking because the contract is implicit.
- **Suggested fix:** Keep raw MapLibre ownership in one module. Replace `getMap()` feature access with explicit overlay registration/update APIs (e.g. `registerJourneyOverlay`, `updateJourneyData`, `removeJourneyOverlay`) or extract a shared map-layer controller hook with a documented source/layer namespace contract.

### C2-CR-06 — `HomeInner` remains a god component for unrelated state machines

- **Severity:** MEDIUM
- **Confidence:** High
- **Status:** Risk
- **Code region:** `src/app/page.tsx:61-182`, `src/app/page.tsx:258-315`, `src/app/page.tsx:397-455`, `src/app/page.tsx:462-583`.
- **Issue:** `HomeInner` coordinates track session state, full/trimmed tracks, theme and map-style persistence, playback, export lifecycle, scene editing, journey creation, focus announcements, modal visibility, and hotkeys in one component. Reset semantics are distributed across `resetTrackWorkspace()`, `loadTrackIntoSession()`, `startFreshJourneySession()`, `handleRangeChange()`, `handleScenesChange()`, and export callbacks.
- **Failure scenario:** A future path that loads/replaces a track, changes scenes, changes theme defaults, or starts a journey can easily forget one reset (stale export blob, stale scenes after trim, focus target not updated, modal left open). The current code already depends on several call-order assumptions (`resetTrackWorkspace()` before `setTrack`, export reset before scene mutation) rather than a single session transition model.
- **Suggested fix:** Extract a track-session reducer/controller that owns transitions (`loadTrack`, `trimTrack`, `startJourney`, `replaceScenes`, `resetExport`) and returns one coherent state object. Keep theme/style preference persistence in a separate hook so preference changes do not share the same component boundary as track/export/session changes.

### C2-CR-07 — Timeline end-handle mapping can under-select sparse tracks

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** Likely
- **Code region:** `src/components/TimelineSelector.tsx:29-52`, `src/components/TimelineSelector.tsx:154-168`, `src/app/page.tsx:288-315`.
- **Issue:** For non-exact distance ratios, `ratioToIndex(..., 'end', ...)` returns the lower index (`lo`) unless `cumulDist[hi] <= targetDist`. That means an end handle at 75% of a sparse 0m/10m/20m track returns index 1, and `handleRangeChange()` slices only through that point instead of including the point/segment after the selected distance.
- **Failure scenario:** A traveler trims a sparse track to include roughly the first three quarters of the route, but the app exports/previews only through the previous recorded point. On unevenly sampled tracks this can remove a large visible portion while the selected histogram region appears larger.
- **Suggested fix:** Decide a boundary policy explicitly. Either insert interpolated trim boundary points or map end ratios to the first index at or after the target distance (while start ratios map to the first point at or after/inside the start boundary). Add deterministic tests for uneven cumulative distances.

### C2-CR-08 — Temporary Playwright script remains in the repository root

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Code region:** `.tmp-travelback-mina-manual.mjs:1-129`.
- **Issue:** The worktree contains an untracked root-level manual Playwright script with absolute local paths (`.tmp-travelback-mina-manual.mjs:5-7`) and localhost assumptions. Even though it is untracked, it is executable code sitting beside product scripts and can be accidentally run, copied, or committed.
- **Failure scenario:** A future agent or contributor mistakes it for an endorsed helper, runs it against a different server/locale, or commits machine-specific paths into the repository.
- **Suggested fix:** Move ad-hoc scripts under an ignored scratch directory outside the repository, or convert the useful parts into a maintained script/test with relative paths and documented invocation.

## Positive evidence / no issues found in this specialty

- Root configs are coherent for a strict Next/React/TypeScript static-export app: `strict: true` in `tsconfig.json`, static export/base-path handling in `next.config.ts`, and lint/typecheck both pass.
- Export blob URL ownership is centralized in `useExportController` and revokes prior/completed URLs on reset/unmount (`src/lib/useExportController.ts:70-99`, `src/lib/useExportController.ts:188-204`).
- Playback loop avoids frame-rate-dependent accumulation by using start timestamp/progress refs (`src/lib/usePlaybackController.ts:104-154`).
- MapView's track rendering path is segment-aware and antimeridian-aware in the main route geometry builder (`src/components/MapView.tsx:109-170`).

## Final sweep — skipped-file confirmation

No review-relevant category was intentionally skipped. I inventoried 623 review-relevant files after excluding generated/private state (`.git`, `node_modules`, `.next`, `out`, `.omx`, `.omc`). Every runtime code/config/test/script file was examined directly or via targeted source scans; docs/context/plan/review files were inventoried and scanned for active constraints, architecture claims, and existing deferred context. Historical archive files were not treated as executable behavior, but they were included in the inventory sweep so active policy or deferred-finding signals were not missed.
