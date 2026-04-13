# Ultradeep Code Quality Review — Travelback

**Date:** 2026-04-13  
**Reviewer:** Codex  
**Review type:** Repo-wide code quality audit  
**Recommendation:** **REQUEST CHANGES**

## Scope and method

This was a second-pass, deeper quality review focused specifically on correctness, state management, performance, maintainability, cross-file interactions, tests, and code/docs drift.

### Coverage
I rebuilt the repo inventory and re-checked the entire review-relevant codebase:
- all `src/` runtime files
- all config / script / workflow files
- `e2e/travelback.spec.ts` and all fixtures
- repo and `.context/` documentation for code/docs consistency

### Verification run during this pass
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run smoke:static` ✅

I did **not** use a full Next build or full Playwright suite as acceptance evidence because long-running `next` / Playwright processes were not returning reliable completion output in this environment.

---

## Executive summary

The codebase is thoughtfully built and typechecked, but there are still several **real cross-file quality bugs** caused by session state leakage, scene/runtime assumptions, parser modeling shortcuts, and hidden hot-path work.

The most important problems are:
1. **track/session state leaks** (trim selection, scenes, export result) across newly loaded tracks,
2. **scene runtime correctness bugs** (unsorted scenes, invalid numeric scene state),
3. **parser/modeling bugs** that invent route geometry or reorder travel history,
4. **avoidable playback hot-path work** on large tracks,
5. **release-quality gaps** where CI and docs no longer match the shipped code.

---

## Findings summary

| ID | Severity | Classification | Title |
|---|---|---|---|
| CQ1 | High | Confirmed | Track-specific scene state persists across newly loaded tracks |
| CQ2 | High | Confirmed | Export success state and blob URL persist after close/new track |
| CQ3 | High | Confirmed | Timeline trim selection leaks into newly loaded tracks |
| CQ4 | High | Confirmed | Scene runtime depends on unsorted scene order |
| CQ5 | Medium | Confirmed | Scene percentage inputs can write invalid `NaN` state into runtime logic |
| CQ6 | High | Confirmed | Playback recomputes total route distance on every render/frame |
| CQ7 | High | Confirmed | GPX/KML multi-segment tracks are flattened into fake straight-line travel |
| CQ8 | Medium | Confirmed | Google parser reorders untimed points to the start of the route |
| CQ9 | Medium | Confirmed | JourneyCreator search results have stale-response race conditions |
| CQ10 | Medium | Confirmed | JourneyCreator overlays break after style/theme reloads |
| CQ11 | Medium | Confirmed | Full route line is implemented but rendered invisible |
| CQ12 | Medium | Likely | Re-selecting the same file likely does not trigger upload again |
| CQ13 | High | Confirmed | CI deploy path does not enforce the project’s available verification steps |
| CQ14 | Low | Confirmed | Documentation is materially stale in multiple important places |
| CQ15 | Low | Risk needing manual validation | `page.tsx` is a monolithic state hub that is already causing cross-feature regressions |

---

## Detailed findings

### CQ1 — Track-specific scene state persists across newly loaded tracks
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/page.tsx:56-58`
  - `src/app/page.tsx:173-188`
  - `src/app/page.tsx:226-230`
  - `src/app/page.tsx:262-267`
  - `src/app/page.tsx:541-550`
- **Why this is a problem:**
  - `scenes` and `transitionDuration` are conceptually tied to the current track.
  - But `handleTrackLoaded()`, `handleJourneyComplete()`, and `handleStartNewTrack()` do not reset them.
  - Export logic prefers user scenes over defaults, so stale scenes silently carry into the next trip.
- **Concrete failure scenario:**
  - User customizes scenes for trip A.
  - User loads trip B.
  - Export for trip B reuses trip A’s scene structure and transitions even though the user never configured B.
- **Suggested fix:**
  - Reset `scenes`, `showSceneEditor`, and `transitionDuration` whenever a new track/session begins.
  - Better: group track-scoped state into one “current session” model so resets are explicit and centralized.
- **Confidence:** High

### CQ2 — Export success state and blob URL persist after close/new track
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/page.tsx:52-53, 293-297, 320-327`
  - `src/app/page.tsx:214-220`
  - `src/components/ExportPanel.tsx:128-196`
- **Why this is a problem:**
  - The “done” state is only cleared by `handleResetExport()`.
  - Closing the modal does not reset it.
  - Loading another track does not revoke the old object URL or clear the export state.
- **Concrete failure scenario:**
  - Export trip A, close the modal, load trip B, open export.
  - Instead of export settings for B, the user sees the success screen for A and an old preview blob stays retained.
- **Suggested fix:**
  - Centralize export-session cleanup and call it when:
    - modal closes from success state,
    - a new track is loaded,
    - the user starts a new journey/session.
- **Confidence:** High

### CQ3 — Timeline trim selection leaks into newly loaded tracks
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/TimelineSelector.tsx:39-40, 90-93`
  - `src/app/page.tsx:162-171, 173-179`
- **Why this is a problem:**
  - `TimelineSelector` keeps `startRatio` / `endRatio` in local state and never resets them when `track` changes.
  - Its effect immediately calls `onRangeChange()` with those stale ratios against the new point array.
- **Concrete failure scenario:**
  - Trim track A to 20%-40%.
  - Load track B.
  - B immediately loads pre-trimmed to 20%-40% without the user touching the selector.
- **Suggested fix:**
  - Reset selector state on track identity change, or remount the component with a `key` derived from the active full track.
- **Confidence:** High

### CQ4 — Scene runtime depends on unsorted scene order
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/SceneEditor.tsx:102-139`
  - `src/lib/camera.ts:304-364`
  - `src/components/MapView.tsx:475-479`
- **Why this is a problem:**
  - The editor allows arbitrary percent edits but does not sort/normalize the scene array.
  - `computeCameraForProgress()` assumes array order is the playback order when choosing containing/previous/next scenes and blends.
- **Concrete failure scenario:**
  - Scene B is edited so it now starts before scene A, but the array order is unchanged.
  - Playback/export blends with the wrong previous/next scenes and camera motion becomes inconsistent.
- **Suggested fix:**
  - Normalize scenes before storing or before runtime use.
  - Use one shared utility to sort, clamp, and validate scene boundaries.
- **Confidence:** High

### CQ5 — Scene percentage inputs can write invalid `NaN` state into runtime logic
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/SceneEditor.tsx:258-267`
  - downstream: `src/lib/camera.ts:304-346`
- **Why this is a problem:**
  - `parseInt(e.target.value) / 100` is stored directly.
  - Empty or malformed input becomes `NaN`.
  - Numeric comparisons and CSS percentage calculations then degrade silently.
- **Concrete failure scenario:**
  - User clears a percent field while editing.
  - Coverage bar, warnings, and scene-selection logic all become unreliable because `NaN` poisons comparisons.
- **Suggested fix:**
  - Keep temporary string input state and only commit validated/clamped numbers.
  - Reject `NaN` before mutating the canonical scene array.
- **Confidence:** High

### CQ6 — Playback recomputes total route distance on every render/frame
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/Controls.tsx:39-42`
  - `src/lib/interpolate.ts:23-29`
  - `src/app/page.tsx:97-99, 586-598`
- **Why this is a problem:**
  - `Controls` recalculates full-track distance on every render.
  - Playback updates `progress` continuously, so this becomes repeated `O(n)` work in the hot path.
- **Concrete failure scenario:**
  - A large Google Location History file causes visible playback stutter because total distance is rescanned every frame.
- **Suggested fix:**
  - Memoize total distance per track or derive it from the cumulative-distance array already used elsewhere.
- **Confidence:** High

### CQ7 — GPX/KML multi-segment tracks are flattened into fake straight-line travel
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `src/lib/parser.ts:11-32`
  - downstream effects:
    - `src/lib/interpolate.ts:49-123`
    - `src/components/MapView.tsx:299-356`
    - `src/lib/videoEncoder.ts:39-131`
- **Why this is a problem:**
  - Multi-segment geometry is concatenated into one continuous point list.
  - Discontinuities are lost.
  - The rest of the system interpolates and renders across the gap as if the path were continuous.
- **Concrete failure scenario:**
  - A recorder pause, ferry gap, or separate hiking segments become one invented straight line that the app animates as real travel.
- **Suggested fix:**
  - Preserve segment boundaries in the parsed model and make interpolation/rendering discontinuity-aware.
- **Confidence:** High

### CQ8 — Google parser reorders untimed points to the start of the route
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - untimed point generation: `src/lib/parser.ts:119-132`
  - final sort: `src/lib/parser.ts:231-240`
- **Why this is a problem:**
  - Untimed points are globally sorted using `0` as a fallback timestamp.
  - That moves them to the start of the list and can scramble route order.
- **Concrete failure scenario:**
  - A Takeout format falls back to waypoint-only data without timestamps.
  - Those points appear at the front of the track even if they belong later in the route.
- **Suggested fix:**
  - Preserve insertion order for untimed data and only sort points with real timestamps.
- **Confidence:** High

### CQ9 — JourneyCreator search results have stale-response race conditions
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:65-69, 309-321`
- **Why this is a problem:**
  - Search is debounced but not cancellable.
  - Earlier requests can resolve later and overwrite newer results.
- **Concrete failure scenario:**
  - User types “Seoul”, then changes to “Tokyo”.
  - Tokyo results appear, then a slower Seoul response replaces them.
- **Suggested fix:**
  - Use `AbortController` or request ids to discard stale responses.
- **Confidence:** High

### CQ10 — JourneyCreator overlays break after style/theme reloads
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/JourneyCreator.tsx:96-170, 172-294`
  - `src/components/ThemeToggle.tsx:35-50`
  - `src/components/MapView.tsx:278-296`
  - `src/app/page.tsx:369-381, 427-443`
- **Why this is a problem:**
  - JourneyCreator assumes its layers continue to exist once added.
  - But `map.setStyle()` removes custom sources/layers.
  - Theme/style changes remain available during active creation.
- **Concrete failure scenario:**
  - User starts manual journey creation, adds points, toggles theme or map style.
  - The custom overlays disappear and the creator session becomes inconsistent.
- **Suggested fix:**
  - Re-add JourneyCreator sources/layers on style reload while active.
  - Verify existence instead of trusting only `layersAddedRef`.
- **Confidence:** Medium-High

### CQ11 — Full route line is implemented but rendered invisible
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/components/MapView.tsx:301-327`
  - docs that claim it is visible:
    - `.context/project/01-overview.md:64-77`
    - `.context/project/02-architecture.md:123-126`
- **Why this is a problem:**
  - The code creates the `route-line` layer but sets `line-opacity: 0`.
  - That makes the “full route context” effectively nonexistent.
- **Concrete failure scenario:**
  - A user cannot see the full route outline before or during playback, only the growing trail.
  - This also conflicts with documentation and feature descriptions.
- **Suggested fix:**
  - Either render it at a visible low opacity, or explicitly remove the feature claim from docs/comments/tests.
- **Confidence:** High

### CQ12 — Re-selecting the same file likely does not trigger upload again
- **Severity:** Medium
- **Classification:** Likely issue
- **Files / regions:**
  - `src/components/FileUpload.tsx:84-87, 99-105, 181-186`
- **Why this is a problem:**
  - File inputs are never reset after use.
  - Many browsers suppress `change` when the same file is selected again.
- **Concrete failure scenario:**
  - User retries with the same GPX after clearing state or after editing it externally.
  - Nothing happens because the input value did not change.
- **Suggested fix:**
  - Clear the input value after processing or before reopening the picker.
- **Confidence:** Medium

### CQ13 — CI deploy path does not enforce the project’s available verification steps
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - `.github/workflows/deploy-pages.yml:17-30`
  - available but unused checks:
    - `package.json:10-15`
    - `scripts/smoke-static.mjs:67-84`
- **Why this is a problem:**
  - Deployment currently gates only on `npm run build`.
  - Lint, typecheck, and static smoke verification exist but are not enforced.
- **Concrete failure scenario:**
  - Regressions like state leakage or broken static serving can ship to Pages because the deploy workflow never runs the available checks.
- **Suggested fix:**
  - Add at least `npm run lint`, `npm run typecheck`, and `npm run smoke:static` to the deploy build job.
  - Add targeted e2e gating if the runtime budget allows.
- **Confidence:** High

### CQ14 — Documentation is materially stale in multiple important places
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - `README.md:144, 148, 206`
  - `.context/project/01-overview.md:70-77`
  - `.context/agents/non-tech-traveler-reviewer.md:57-60`
- **Why this is a problem:**
  - Multiple docs still describe an older state of the repo.
  - Examples:
    - README says `travelback.spec.ts` has 10 tests.
    - README references `.github/workflows/deploy.yml`, but the repo uses `deploy-pages.yml`.
    - `.context/project/01-overview.md` still says 5 camera modes and 3 map styles.
- **Concrete failure scenario:**
  - Contributors rely on docs for review expectations and verify against the wrong workflow / feature count / test surface.
- **Suggested fix:**
  - Update docs now and keep counts/paths generated or source-derived where possible.
- **Confidence:** High

### CQ15 — `page.tsx` is a monolithic state hub that is already causing cross-feature regressions
- **Severity:** Low
- **Classification:** Risk needing manual validation
- **Files / regions:**
  - `src/app/page.tsx:33-617`
- **Why this is a problem:**
  - One component owns track loading, trim state, export state, theme/map style coupling, locale UI, keyboard help, journey creation, scene editing, and playback.
  - The existing bugs above (scene leakage, export leakage, trim leakage) are exactly the kind of regressions this structure makes likely.
- **Concrete failure scenario:**
  - A future feature adds another track-scoped flag or modal and forgets to reset it on new track load, creating another silent cross-session bug.
- **Suggested fix:**
  - Extract track-session state into a dedicated reducer/hook.
  - Separate export/session/theme concerns from the route playback orchestration component.
- **Confidence:** Medium-High

---

## Final missed-issues sweep

I did a separate final pass specifically for issue classes that are easy to miss:
- state reset / lifecycle leaks between sessions,
- array-order assumptions between editor state and runtime,
- `NaN` propagation from numeric inputs,
- hidden hot-path recomputation during animation,
- parser discontinuities that only show up downstream,
- map-style reload interactions with custom layers,
- test/docs/CI drift.

I do **not** believe any review-relevant source, config, script, test, or documentation file was skipped.

---

## Bottom line

The project is in decent shape structurally, but it still has several **high-value quality defects** that will surface in real usage:
- per-track state is not cleanly isolated,
- scenes are not normalized before runtime use,
- some route parsers model the wrong thing,
- playback does avoidable work in the hottest path,
- and release verification is weaker than the repo’s own tooling suggests.

If I were fixing in order, I would do:
1. `CQ1` + `CQ2` + `CQ3` (session-state leaks)
2. `CQ4` + `CQ5` (scene correctness)
3. `CQ6` (performance)
4. `CQ7` + `CQ8` (parser correctness)
5. `CQ13` + `CQ14` (release hygiene)
