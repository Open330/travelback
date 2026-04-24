# Code Review Summary — review-plan-fix cycle 1/100, Prompt 1

**Reviewer:** code-reviewer
**Repository:** `/Users/hletrd/flash-shared/Travelback`
**Date:** 2026-04-24
**Scope:** repository-wide code quality, logic, SOLID, maintainability, security-oriented review. No source files were modified.

## Stage 0 — Inventory

Review-relevant files inventoried and examined: **50**

- App shell/config: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.github/workflows/deploy-pages.yml`
- App routes/styles: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/styles/vitro-base.css`
- Components: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`
- Libraries/types: `src/lib/camera.ts`, `env.ts`, `i18n.ts`, `interpolate.ts`, `parser.ts`, `useExportController.ts`, `usePlaybackController.ts`, `videoEncoder.ts`, `src/types.ts`
- Worker/scripts/tests/assets: `public/workers/trackParser.worker.js`, `scripts/*.mjs`, `e2e/travelback.spec.ts`, `playwright*.config.ts`, local map-style JSON, font CSS

Current working tree source diff: none. Existing untracked review/plan artifacts were present before this review; this review only writes `.context/reviews/code-reviewer.md`.

## Stage 1 — Spec / Behavior Compliance

The implementation broadly matches the documented product shape in `.context/project/01-overview.md` and `.context/project/02-architecture.md`: client-only import/export, local map styles, GPX/KML/Google JSON parsing, scene camera controls, timeline trimming, playback, and static export hardening are all represented in code.

The main compliance gap found is in timeline trimming: `TrackWorkspace` renders the selector over `fullTrack` but passes cumulative distances for the currently filtered `track`. That breaks the documented distance-based timeline model after the first trim.

## Stage 2 — Diagnostics / Static Checks

- `git diff --stat`: no tracked source changes.
- `npm run typecheck`: **passed**.
- `npm run lint`: **passed**.
- `npm audit --audit-level=high`: **passed**, 0 vulnerabilities.
- Secret scan via ripgrep for API keys/secrets/tokens/passwords outside lockfile: **no hits**.
- MCP `lsp_diagnostics_directory` / `lsp_servers`: attempted, but the code-intel transport was closed. Fallback verification used `tsc --noEmit` and ESLint.

## Findings

### HIGH — Timeline trimming mixes full-track points with filtered-track distances

**Files / lines:**
- `src/components/TrackWorkspace.tsx:125-131`
- `src/app/page.tsx:97-100`

**Confidence:** High

**Issue:** `TrackWorkspace` passes `track={fullTrack}` to `TimelineSelector`, but passes `cumulativeDistances={cumulativeDistances}` where `cumulativeDistances` is computed from the currently filtered `track` in `page.tsx`. On initial load these match; after any trim, the selector has full-track points and filtered-track distances.

**Failure scenario:** Load a route, drag the timeline to trim to the middle, then drag a handle again. The selector renders/uses full-track indexes but its distance array is shorter and describes the already-trimmed slice. Subsequent trim operations can jump toward the beginning of the original track, mis-count points, or produce inconsistent histogram/index mapping.

**Fix:** Compute a separate `fullTrackCumulativeDistances = computeCumulativeDistances(fullTrack.points, fullTrack.segmentStartIndices)` and pass that to `TimelineSelector`. Keep the current `cumulativeDistances` for `track` consumers such as controls, elevation, map animation, and export. Add an e2e regression that performs two consecutive timeline trims and verifies the second trim stays in the selected region.

---

### MEDIUM — Keyboard timeline sliders update visuals but do not update the selected track

**File / lines:** `src/components/TimelineSelector.tsx:386-459` and `src/components/TimelineSelector.tsx:142-148`

**Confidence:** High

**Issue:** The start/end handle `onKeyDown` handlers update `startRatio` / `endRatio`, but never call `onRangeChange`. The only effect that notifies the parent intentionally depends only on `points.length`, not ratio changes.

**Failure scenario:** A keyboard-only user focuses a timeline handle and presses arrow/Home/End. The slider position and ARIA values change, but `page.tsx` never receives the new range, so the route, title count, playback, elevation, and export remain on the old track range.

**Fix:** Centralize ratio updates in a helper that both sets state and emits `onRangeChangeRef.current(resolveIndexesForRatios(...))`, or add a carefully throttled effect for ratio changes. Cover with a Playwright keyboard test that focuses `timeline-start-handle`, presses ArrowRight, and asserts the loaded point count changes.

---

### MEDIUM — Google JSON parser logic is duplicated between app code and the production worker

**Files / lines:**
- `src/lib/parser.ts:346-430` and `src/lib/parser.ts:538-542`
- `public/workers/trackParser.worker.js:137-205`

**Confidence:** High

**Issue:** The Google Location History parser exists once in TypeScript and again as hand-maintained JavaScript in `public/workers/trackParser.worker.js`. JSON imports use the worker by default, and `parser.ts` rejects worker-reported parse errors rather than falling back to the main-thread parser.

**Failure scenario:** A future parser fix or new Google Takeout variant is added to `src/lib/parser.ts` only. Production JSON uploads still fail because the stale worker parser runs first and returns an error, and the main parser is not tried for worker parse errors.

**Fix:** Move Google parsing into a shared pure module and build/import it into both main and worker paths, or generate the worker from the same TypeScript source. Add parity tests that run every JSON fixture through both the main parser and worker parser and compare point counts, timestamps, and segment starts.

---

### MEDIUM — Core UI files are large multi-responsibility modules, increasing regression risk

**File / lines:**
- `src/components/MapView.tsx:385-932`
- `src/components/JourneyCreator.tsx:113-532`
- `src/components/SceneEditor.tsx:239-640`
- `src/app/page.tsx:32-469`
- `src/lib/parser.ts:41-568`
- `src/lib/i18n.ts:11-1784`

**Confidence:** High

**Issue:** Several modules combine rendering, event binding, state orchestration, data transforms, side effects, and imperative APIs. This weakens single-responsibility boundaries and makes cross-file bugs harder to spot; the timeline distance bug above is an example of shared state semantics leaking across `page.tsx`, `TrackWorkspace`, and `TimelineSelector`.

**Failure scenario:** A change to map style reloads, trim semantics, or parser support requires editing a 600-950 line component with unrelated responsibilities, making it easy to miss stale closures, wrong dependency arrays, or mismatched data contracts.

**Fix:** Split by behavior, not by arbitrary line count: e.g. `useTimelineRange`, `useMapLayers`, `useMapCamera`, `useJourneyLayers`, and `googleLocationParser` modules. Move locale dictionaries into per-locale files while keeping `TranslationKey` type safety. Add focused unit tests for extracted pure functions before refactoring.

---

### LOW — Canceling the native save picker leaks the freshly created export object URL

**File / lines:** `src/lib/useExportController.ts:151-159`

**Confidence:** Medium

**Issue:** `exportTrack` creates `videoUrl` and then awaits `downloadVideo`. If `downloadVideo` returns `{ saved: false }` for a canceled File System Access picker, the code throws `AbortError` before storing `videoUrl` in state or revoking it.

**Failure scenario:** A user repeatedly completes expensive exports and cancels the save dialog. Each completed Blob URL can remain alive for the session, increasing memory usage for large videos.

**Fix:** Revoke `videoUrl` immediately before throwing on `!downloadResult.saved`, or wrap the post-encode download block in a local `try/catch` that revokes any URL not transferred into state.

## Severity Totals

- CRITICAL: 0
- HIGH: 1
- MEDIUM: 3
- LOW: 1

## Recommendation

**REQUEST CHANGES**

The repository passes lint/typecheck/audit and no hardcoded secrets were found, but the timeline range contract bug is user-visible and affects a core feature. Fix the full-track distance contract first, then add regression coverage for repeated trimming and keyboard trimming.
