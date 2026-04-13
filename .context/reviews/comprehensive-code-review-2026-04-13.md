# Comprehensive Code Review — Travelback

**Date:** 2026-04-13  
**Reviewer:** Codex  
**Recommendation:** **REQUEST CHANGES**

## Scope and method

This review was done as a repo-wide audit, not a spot check.

### Inventory built first

I inventoried **66 non-generated files** in the repository and then reviewed all files that materially affect runtime behavior, deployment, tests, or user-facing documentation.

#### Runtime / build / test files reviewed in detail
- App/runtime source:
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/globals.css`
  - `src/components/Controls.tsx`
  - `src/components/ElevationProfile.tsx`
  - `src/components/ErrorBoundary.tsx`
  - `src/components/ExportPanel.tsx`
  - `src/components/FileUpload.tsx`
  - `src/components/GoogleGuide.tsx`
  - `src/components/JourneyCreator.tsx`
  - `src/components/MapView.tsx`
  - `src/components/SceneEditor.tsx`
  - `src/components/ThemeToggle.tsx`
  - `src/components/TimelineSelector.tsx`
  - `src/components/Toast.tsx`
  - `src/lib/camera.ts`
  - `src/lib/i18n.ts`
  - `src/lib/interpolate.ts`
  - `src/lib/parser.ts`
  - `src/lib/videoEncoder.ts`
  - `src/styles/vitro-base.css`
  - `src/types.ts`
- Tooling / config / deploy:
  - `package.json`
  - `next.config.ts`
  - `eslint.config.mjs`
  - `postcss.config.mjs`
  - `tsconfig.json`
  - `playwright.config.ts`
  - `playwright.static.config.ts`
  - `scripts/serve-static.mjs`
  - `scripts/smoke-static.mjs`
  - `.github/workflows/deploy-pages.yml`
  - `.gitignore`
- Tests / fixtures:
  - `e2e/travelback.spec.ts`
  - all files under `e2e/fixtures/`
- Documentation reviewed for code/docs consistency:
  - `README.md`
  - `.context/README.md`
  - `.context/development/01-conventions.md`
  - `.context/project/01-overview.md`
  - `.context/project/02-architecture.md`
  - `.context/agents/non-tech-traveler-reviewer.md`
  - `.context/plans/*.md`
  - `.context/reviews/*.md`

#### Inventoried but not deep-reviewed for logic
- Binary/static assets such as `src/app/favicon.ico` and the `public/*.svg` icons.
- Generated/vendor/state directories: `.git/`, `.next/`, `node_modules/`, `out/`, `.omx/`, `.omc/`.

One generated file **was** inspected intentionally for behavioral confirmation:
- `out/index.html` — used as evidence for the emitted initial theme/base-path behavior.

### Verification performed
- `npm run lint` ✅ passed
- `npm run typecheck` ✅ passed
- Static export artifact inspection (`out/index.html`) ✅ used for emitted-output verification

I did **not** use a full build or Playwright run as acceptance evidence because long-running `next` / Playwright processes did not return reliable completion output in this environment.

---

## Findings summary

| ID | Severity | Classification | Title |
|---|---|---|---|
| F1 | High | Confirmed | Initial system dark mode is never applied on first load |
| F2 | High | Confirmed | Export success state and blob URL persist after close/new track |
| F3 | High | Confirmed | Timeline trim selection leaks into newly loaded tracks |
| F4 | High | Confirmed | Scene runtime depends on unsorted array order |
| F5 | Medium | Confirmed | Scene percentage inputs can write `NaN` / invalid ranges into runtime state |
| F6 | High | Confirmed | Playback re-computes full-track distance on every render/frame |
| F7 | High | Confirmed | GPX/KML multi-segment tracks are flattened into fake straight-line travel |
| F8 | Medium | Confirmed | Google parser reorders untimed points to the start of the track |
| F9 | Medium | Confirmed | JourneyCreator search has stale-response race conditions |
| F10 | Medium | Confirmed | JourneyCreator overlays break after theme/style reloads |
| F11 | Low | Confirmed | Error boundary ignores the user-selected locale |
| F12 | Medium | Confirmed | Full route line is defined but rendered invisible |
| F13 | High | Confirmed | Deployment workflow does not enforce lint/typecheck/tests/smoke |
| F14 | Low | Confirmed | Documentation is materially stale in several places |
| F15 | Medium | Likely | Re-selecting the same file likely does not trigger upload again |
| F16 | Low | Likely | Static preview server immutable-caches non-fingerprinted sample data |
| F17 | Medium | Risk needing manual validation | Export can degrade into repeated 5s idle timeouts under tile-load failure |

---

## Detailed findings

### F1 — Initial system dark mode is never applied on first load
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/layout.tsx:46-48`
  - `src/components/ThemeToggle.tsx:7-18, 26-44`
  - `src/app/page.tsx:41-47`
  - confirmed in emitted output: `out/index.html:1`
- **Why this is a problem:**
  - The app hardcodes `<html ... data-mode="light">` in the layout and the inline script only fills in `light` if the attribute is missing.
  - `ThemeToggle` subscribes to `matchMedia('(prefers-color-scheme: dark)')` **changes**, but it never reads the initial match result.
  - `page.tsx` also initializes `mapStyleKey` from the already-hardcoded `data-mode`, so the map starts in Voyager/light mode too.
- **Concrete failure scenario:**
  - A first-time user with OS/browser dark mode enabled opens the app. The UI still renders light, and the map style starts as Voyager instead of Dark. This directly contradicts the current tests/docs claiming system theme matching.
- **Suggested fix:**
  - Remove the hardcoded `data-mode="light"` default from the layout, or replace it with an inline script that reads `matchMedia('(prefers-color-scheme: dark)')` before hydration.
  - In `ThemeToggle`, initialize from the current media-query value, not only change events.
  - In `page.tsx`, derive initial `mapStyleKey` from the real initial mode or persist a shared theme state.
- **Confidence:** High

### F2 — Export success state and blob URL persist after close/new track
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/page.tsx:52-53, 293-297, 214-220, 320-327`
  - `src/app/page.tsx:173-188, 226-230`
  - `src/components/ExportPanel.tsx:128-196`
- **Why this is a problem:**
  - `exportState` and `exportedVideoUrl` are only cleared by `handleResetExport()`.
  - Closing the modal via `handleCloseExport()` only hides it.
  - Loading a new track or creating a new journey also does not revoke the old blob URL or reset export state.
- **Concrete failure scenario:**
  - Export trip A successfully.
  - Close the modal with the X button.
  - Load trip B and click Export.
  - The panel reopens directly on the **old success screen** for trip A, and the old blob URL remains live in memory.
- **Suggested fix:**
  - Reset export state and revoke any prior blob URL when:
    - the modal is closed from the done state,
    - a new track is loaded,
    - a manual journey is completed,
    - a “start new track/journey” flow begins.
  - Consider centralizing export session cleanup in one helper.
- **Confidence:** High

### F3 — Timeline trim selection leaks into newly loaded tracks
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/TimelineSelector.tsx:39-40, 90-93`
  - `src/app/page.tsx:162-171, 173-179`
- **Why this is a problem:**
  - `TimelineSelector` stores `startRatio` / `endRatio` in component state, but never resets them when `track` changes.
  - On a new track, the effect immediately calls `onRangeChange()` with the **old** ratios against the **new** point array.
- **Concrete failure scenario:**
  - User trims track A down to the middle 20%.
  - User loads track B.
  - Track B appears already cropped to the middle 20%, even though the user never trimmed it.
- **Suggested fix:**
  - Add a `useEffect` keyed on `track` (or a stable track identity) that resets `startRatio` to `0` and `endRatio` to `1`.
  - Alternatively key the component in `page.tsx` by track identity/name/load counter so it remounts cleanly.
- **Confidence:** High

### F4 — Scene runtime depends on unsorted array order
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/SceneEditor.tsx:102-116, 122-139`
  - `src/lib/camera.ts:304-364`
  - `src/components/MapView.tsx:475-479`
- **Why this is a problem:**
  - `SceneEditor` lets the user edit `startPercent` / `endPercent`, but it never normalizes/sorts the resulting scene array.
  - `computeCameraForProgress()` assumes `scenes` are in correct chronological order when it:
    - finds the containing scene,
    - chooses `prevScene` / `nextScene`,
    - blends across boundaries.
- **Concrete failure scenario:**
  - The user creates scenes A and B, then edits B so it starts earlier than A.
  - Runtime playback/export still uses the old array order, so boundary blending can happen against the wrong scene or produce wrong “previous/next” transitions.
- **Suggested fix:**
  - Sort scenes by `startPercent` before storing them or at least before every runtime/export use.
  - Validate and normalize overlapping/gapped scenes in one shared utility instead of relying on editor-only warnings.
- **Confidence:** High

### F5 — Scene percentage inputs can write `NaN` / invalid ranges into runtime state
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/SceneEditor.tsx:258-267`
  - downstream use: `src/lib/camera.ts:304-346`
- **Why this is a problem:**
  - The number inputs write `parseInt(e.target.value) / 100` directly.
  - If the field is temporarily empty or malformed, this becomes `NaN`.
  - HTML `min/max` attributes are not enough; they do not guarantee sanitized React state.
- **Concrete failure scenario:**
  - User focuses “From %”, presses Backspace, leaving the field empty.
  - `startPercent` becomes `NaN`.
  - Coverage bar styles become `NaN%`, warnings become unreliable, and camera selection logic can silently fail because all comparisons with `NaN` are false.
- **Suggested fix:**
  - Sanitize on input change: reject `NaN`, clamp to `[0, 1]`, and only commit valid numeric values.
  - Consider separate temporary string state for the input and normalized numeric scene state.
- **Confidence:** High

### F6 — Playback re-computes full-track distance on every render/frame
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/Controls.tsx:39-42`
  - `src/lib/interpolate.ts:23-29`
  - `src/app/page.tsx:97-99, 586-598`
- **Why this is a problem:**
  - `Controls` calls `totalDistance(track.points)` on every render.
  - `page.tsx` updates `progress` during playback, which re-renders `Controls` every animation frame.
  - For large Google history imports, this turns playback into an `O(n)` full-track scan per frame.
- **Concrete failure scenario:**
  - User imports a long Google Location History file with tens/hundreds of thousands of points.
  - Playback stutters badly because every progress tick recomputes the entire route distance from scratch.
- **Suggested fix:**
  - Memoize the total distance per track (`useMemo`) or reuse `computeCumulativeDistances()` and read the last value.
  - Prefer computing once when the track changes, not when progress changes.
- **Confidence:** High

### F7 — GPX/KML multi-segment tracks are flattened into fake straight-line travel
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/lib/parser.ts:11-32`
  - downstream effects: `src/lib/interpolate.ts:49-123`, `src/components/MapView.tsx:299-356`, `src/lib/videoEncoder.ts:39-131`
- **Why this is a problem:**
  - `extractPointsFromGeoJSON()` concatenates every `LineString` / `MultiLineString` segment into one continuous point list.
  - Segment boundaries are discarded.
  - The rest of the system then interpolates and renders a single continuous path.
- **Concrete failure scenario:**
  - A GPX file contains two separated track segments (common when a recorder pauses/stops, or in ferry/train gaps).
  - Travelback invents a straight line between the segments and animates the user “teleporting” across it.
- **Suggested fix:**
  - Preserve segment breaks in the parsed model (e.g. `TrackSegment[]` or explicit discontinuity markers).
  - Update interpolation/render/export logic to stop drawing/interpolating across discontinuities.
- **Confidence:** High

### F8 — Google parser reorders untimed points to the start of the track
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - untimed fallback generation: `src/lib/parser.ts:119-132`
  - final sort: `src/lib/parser.ts:231-240`
- **Why this is a problem:**
  - The parser adds points from several Google formats, including some fallback branches that do not have timestamps.
  - It then globally sorts with `(time?.getTime() ?? 0)`, which treats untimed points as Unix epoch `0`.
- **Concrete failure scenario:**
  - A semantic-location export falls back to `waypointPath.waypoints[]` without timestamps.
  - Those points get sorted ahead of the real timed points, scrambling route order and producing incorrect geometry/animation.
- **Suggested fix:**
  - Preserve insertion order for untimed points.
  - Only sort when both sides have timestamps, or use a stable sort that keeps original order when timestamps are missing.
- **Confidence:** High

### F9 — JourneyCreator search has stale-response race conditions
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:65-69, 309-321`
- **Why this is a problem:**
  - Search requests are debounced, but in-flight requests are not cancelled and responses are not versioned.
  - Any earlier response can overwrite results for a later query.
- **Concrete failure scenario:**
  - User types “Seoul”, then quickly changes to “Tokyo”.
  - The “Tokyo” request returns first, then the slower “Seoul” request returns and replaces the dropdown with stale Seoul results.
- **Suggested fix:**
  - Use `AbortController` to cancel the previous request, or track a monotonically increasing request id and ignore stale responses.
- **Confidence:** High

### F10 — JourneyCreator overlays break after theme/style reloads
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:96-159, 172-294`
  - `src/components/ThemeToggle.tsx:35-50`
  - `src/components/MapView.tsx:278-296`
  - `src/app/page.tsx:369-381, 427-443`
- **Why this is a problem:**
  - JourneyCreator adds custom map sources/layers once and tracks that with `layersAddedRef`.
  - MapLibre style reloads (`map.setStyle(...)`) remove custom layers.
  - During active journey creation, the global theme toggle is still visible and can trigger a style change, but JourneyCreator does not re-add its layers after that reload.
- **Concrete failure scenario:**
  - Start manual journey creation, add a few waypoints, then toggle theme.
  - The map style reloads; the waypoint/line overlays disappear and the creator is left in a broken state until reopened.
- **Suggested fix:**
  - Listen for style reloads while JourneyCreator is active and re-add sources/layers.
  - Avoid using only a boolean `layersAddedRef` as truth; verify source/layer existence after style changes.
- **Confidence:** Medium-High

### F11 — Error boundary ignores the user-selected locale
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/ErrorBoundary.tsx:37-64`
  - `src/lib/i18n.ts:1563-1589`
- **Why this is a problem:**
  - The app has a locale provider and manual locale picker.
  - The error boundary does not read the current locale context; it calls `detectLocale()` directly from browser settings.
- **Concrete failure scenario:**
  - User manually switches the app to Japanese on an English browser.
  - A render error occurs.
  - The fallback UI appears in English, not Japanese.
- **Suggested fix:**
  - Bridge locale context into the boundary (e.g. wrapper component, `contextType`, or a functional boundary wrapper).
- **Confidence:** High

### F12 — Full route line is defined but rendered invisible
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/MapView.tsx:301-327`
  - docs claiming it exists visibly:
    - `.context/project/01-overview.md:64-77`
    - `.context/project/02-architecture.md:123-126`
- **Why this is a problem:**
  - The code creates a `route-line` layer, but sets `'line-opacity': 0`.
  - That means users only see the traveled trail, not the full route context.
  - The docs/architecture explicitly describe a visible low-opacity full route line.
- **Concrete failure scenario:**
  - A user loads a track and expects to see the overall route context before playback/export.
  - Instead, the “full route” layer is effectively invisible.
- **Suggested fix:**
  - If the intended behavior is a visible overview route, set the opacity to a non-zero value (e.g. `0.2`–`0.35`).
  - If the invisible route is intentional, update the docs/comments/tests accordingly.
- **Confidence:** High

### F13 — Deployment workflow does not enforce lint/typecheck/tests/smoke
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `.github/workflows/deploy-pages.yml:17-30`
  - available scripts not used by CI: `package.json:10-15`
  - relevant verification tooling omitted from deploy path:
    - `scripts/smoke-static.mjs:67-84`
    - `e2e/travelback.spec.ts`
- **Why this is a problem:**
  - The deploy workflow runs only `npm ci` and `npm run build`, then publishes `out/`.
  - Lint, typecheck, e2e, and static smoke verification all exist but are not enforced before deploy.
- **Concrete failure scenario:**
  - A regression like F1/F3/F4 ships to Pages because CI never executes the tests or smoke checks that should catch it.
- **Suggested fix:**
  - Add at least `npm run lint`, `npm run typecheck`, and `npm run smoke:static` before deployment.
  - Consider gating deployment on a targeted Playwright subset if full e2e is too heavy for every push.
- **Confidence:** High

### F14 — Documentation is materially stale in several places
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - `README.md:144, 148, 206`
  - `.context/project/01-overview.md:70-77`
  - `.context/agents/non-tech-traveler-reviewer.md:57-60`
- **Why this is a problem:**
  - The repository-level docs no longer match the current code/test surface.
  - Examples:
    - README still says `travelback.spec.ts` has **10** tests.
    - README points to `.github/workflows/deploy.yml`, but the actual file is `deploy-pages.yml`.
    - `.context/project/01-overview.md` still says **5 camera modes** and **3 map styles**, while code now has 6 camera modes and 5 styles.
    - the reviewer agent doc also still says the suite has 10 tests.
- **Concrete failure scenario:**
  - Contributors/debuggers trust outdated docs and miss current functionality, wrong file paths, or wrong expected test coverage.
- **Suggested fix:**
  - Update the docs together with code changes, or generate the inventory/test-count sections from source.
- **Confidence:** High

### F15 — Re-selecting the same file likely does not trigger upload again
- **Severity:** Medium
- **Classification:** Likely issue
- **Files / regions:**
  - `src/components/FileUpload.tsx:84-87, 99-105, 181-186`
- **Why this is a problem:**
  - The file inputs never reset their value after handling a file.
  - On most browsers, selecting the same file again does not fire `change`.
- **Concrete failure scenario:**
  - User uploads `trip.gpx`, then wants to reload the same file after editing it externally or after clearing the app.
  - The chooser returns the same file and nothing happens because `onChange` does not fire.
- **Suggested fix:**
  - After processing, clear the input value (`e.currentTarget.value = ''` / reset the ref’d input) so same-file re-selection works.
- **Confidence:** Medium-High

### F16 — Static preview server immutable-caches non-fingerprinted sample data
- **Severity:** Low
- **Classification:** Likely issue
- **Files / regions:**
  - `scripts/serve-static.mjs:136-139`
  - `public/sample-trip.gpx`
  - sample consumer: `src/app/page.tsx:329-353`
- **Why this is a problem:**
  - The preview server serves **every non-HTML asset** with `public, max-age=31536000, immutable`.
  - That includes `sample-trip.gpx`, which is not fingerprinted.
- **Concrete failure scenario:**
  - The sample trip is updated in a later release.
  - A returning browser using the local/static preview path can keep serving the old cached GPX forever because the URL is stable and marked immutable.
- **Suggested fix:**
  - Restrict immutable caching to fingerprinted build assets under `/_next/`.
  - Serve `public/` data files like `sample-trip.gpx` with a normal cache policy.
- **Confidence:** Medium

### F17 — Export can degrade into repeated 5s idle timeouts under tile-load failure
- **Severity:** Medium
- **Classification:** Risk needing manual validation
- **Files / regions:**
  - `src/components/MapView.tsx:42, 152-194`
  - `src/app/page.tsx:273-289`
- **Why this may be a problem:**
  - `waitForIdle()` falls back to a fixed **5 second timeout**.
  - Export calls it once before export and then once **per frame** during rendering.
  - If the map never reaches a healthy idle state (tile outage, blocked CDN, flaky network), export may continue frame-by-frame with repeated timeout waits instead of failing fast.
- **Concrete failure scenario:**
  - User starts export on a weak connection or when tile endpoints are failing.
  - The UI appears stuck or absurdly slow because each frame waits for the timeout path.
- **Suggested fix:**
  - Track consecutive idle timeouts / tile errors and abort export with a clear actionable error after a threshold.
  - Treat explicit source/tile failures differently from normal render settling.
- **Confidence:** Medium

---

## Test gaps / cross-file blind spots

These are not separate findings above, but they are worth calling out because they explain why some of the bugs above are easy to miss:

1. **No regression coverage for timeline reset on new track** (`TimelineSelector` + `page.tsx`).
2. **No regression coverage for stale export state after closing/reopening or loading a new track** (`page.tsx` + `ExportPanel.tsx`).
3. **No regression coverage for reordered/invalid scenes affecting runtime camera selection** (`SceneEditor` + `camera.ts` + `MapView.tsx`).
4. **No parser coverage for GPX/KML multi-segment discontinuities.** Fixtures are mostly single continuous trips.
5. **No parser coverage for untimed Google fallback points.**
6. **No coverage for JourneyCreator search races or style reload during active creation.**

---

## Final missed-issues sweep

I did an explicit second pass for issues that are commonly missed in fast reviews:

- **State reset bugs across data-source changes:** found F2 and F3.
- **Array ordering assumptions across UI/runtime boundaries:** found F4.
- **Invalid numeric state propagation:** found F5.
- **Hot-path performance traps hidden inside “small” components:** found F6.
- **Parser/data-model discontinuities that only show up cross-file:** found F7 and F8.
- **Async race conditions in UI helpers:** found F9.
- **Layer/style lifecycle problems around MapLibre custom layers:** found F10.
- **Localization fallback mismatches outside the main happy path:** found F11.
- **Docs/CI drift that lets regressions ship:** found F13 and F14.

### File-skip confirmation

I do **not** believe any review-relevant source/config/test/doc file was skipped.

- All source files under `src/` were examined.
- All scripts/config/workflow files were examined.
- The entire Playwright spec and all fixtures were examined.
- Repository and `.context/` documentation were examined for code/docs mismatches.
- Non-logic-bearing binary/public assets were inventoried and excluded deliberately.

---

## Bottom line

The repo is clean enough to pass lint/typecheck, but there are several **real cross-file correctness and lifecycle bugs** that would matter in production:

- first-load theme/map-style sync is broken,
- export state leaks across sessions,
- track trimming leaks across newly loaded tracks,
- scene ordering/validation is unsafe,
- parser semantics are wrong for multi-segment and untimed data,
- playback has a real large-track performance trap,
- and CI is not enforcing the checks that would keep these regressions out.

If I were triaging fixes, I would address in this order: **F1, F2, F3, F4, F6, F7, F13**, then the rest.
