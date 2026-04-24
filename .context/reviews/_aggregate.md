# Aggregate Review — review-plan-fix cycle 1/100

**Date:** 2026-04-24
**Source reviews:** code-reviewer, security-reviewer, critic, verifier, test-engineer, architect, debugger, designer, perf-reviewer, tracer, document-specialist
**Agent failures:** none. The architect agent was constrained by a read-only role prompt, so its returned review was transcribed into `.context/reviews/architect.md` by the cycle owner.

## Deduplicated findings

### AGG-001 — Timeline selector mixes full-track points with filtered-track distances
- **Severity:** High
- **Confidence:** High
- **Agreement:** code-reviewer, critic, architect, tracer, test-engineer
- **Evidence:** `src/app/page.tsx:97-100`, `src/app/page.tsx:410-415`, `src/components/TrackWorkspace.tsx:125-131`, `src/components/TimelineSelector.tsx:97-140`
- **Problem:** The full-track timeline receives cumulative distances computed from the currently filtered track after the first trim.
- **Failure scenario:** Subsequent trim gestures map ratios to the wrong point indexes and can prevent expanding back across the full trip.
- **Suggested fix:** Keep separate active-track and full-track cumulative-distance arrays.

### AGG-002 — Timeline slider keyboard changes do not update the actual selected track
- **Severity:** High
- **Confidence:** High
- **Agreement:** code-reviewer, critic, designer, tracer
- **Evidence:** `src/components/TimelineSelector.tsx:386-460`
- **Problem:** Arrow/Home/End handlers only update local ratios, never call `onRangeChange`.
- **Failure scenario:** Keyboard users see the slider move while map/playback/export still use the old track range.
- **Suggested fix:** Route keyboard ratio updates through the same index resolution and parent notification path as drag updates.

### AGG-003 — Timeline slider arrow keys also reach global playback hotkeys
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** designer
- **Evidence:** `src/components/TimelineSelector.tsx:386-460`, `src/lib/usePlaybackController.ts:171-178`
- **Problem:** Slider ArrowLeft/ArrowRight events are not stopped, so global playback hotkeys can scrub playback while the user adjusts the trim range.
- **Failure scenario:** Keyboard trimming unexpectedly changes playback progress.
- **Suggested fix:** Stop propagation after handling slider navigation keys.

### AGG-004 — Playback speed or duration changes jump progress mid-play
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** critic
- **Evidence:** `src/lib/usePlaybackController.ts:34-39`, `src/lib/usePlaybackController.ts:94-101`, `src/components/Controls.tsx:98-120`
- **Problem:** The rAF loop rebases from the original start timestamp but uses the newly selected speed/duration.
- **Failure scenario:** Changing from 1x to 16x after a few seconds jumps far ahead instead of continuing smoothly.
- **Suggested fix:** Rebase `startTimestampRef` and `startProgressRef` whenever speed or duration changes during playback.

### AGG-005 — Export cancellation does not restore the pre-export playback position
- **Severity:** High
- **Confidence:** High
- **Agreement:** debugger
- **Evidence:** `src/lib/useExportController.ts:97`, `src/lib/useExportController.ts:141-145`, `src/lib/useExportController.ts:165-207`
- **Problem:** Export frame rendering drives playback progress, and cancellation/error cleanup does not restore the user's previous position.
- **Failure scenario:** A cancelled export leaves the interactive preview at whichever frame was last rendered.
- **Suggested fix:** Capture the pre-export progress and restore it after export cleanup.

### AGG-006 — Native save-picker cancellation loses or leaks the freshly encoded export
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** code-reviewer, critic, architect, tracer
- **Evidence:** `src/lib/useExportController.ts:151-164`, `src/lib/videoEncoder.ts:173-187`
- **Problem:** The controller creates an object URL, calls `downloadVideo`, and throws on picker cancellation before storing or revoking the URL/blob.
- **Failure scenario:** A long render is discarded and the object URL can remain alive until page unload.
- **Suggested fix:** Retain encoded output before download attempts, revoke on reset, and treat picker cancellation as an unsaved export rather than a failed render.

### AGG-007 — Fallback download cleanup is not guaranteed if `a.click()` throws
- **Severity:** Medium
- **Confidence:** Medium
- **Agreement:** verifier
- **Evidence:** `src/lib/videoEncoder.ts:190-200`
- **Problem:** The fallback anchor is appended before `click()` and removed only after the click call completes.
- **Failure scenario:** Browser/WebView click exceptions leave a hidden anchor in the document.
- **Suggested fix:** Wrap click/removal scheduling in `try`/`finally`.

### AGG-008 — Save picker is invoked after async rendering, likely outside user activation
- **Severity:** Medium
- **Confidence:** Medium-High
- **Agreement:** tracer
- **Evidence:** `src/lib/useExportController.ts:137-156`, `src/lib/videoEncoder.ts:171-187`
- **Problem:** The save picker is called after a long async render, when transient user activation may be gone.
- **Failure scenario:** Browsers reject the picker despite the user clicking Start Export.
- **Suggested fix:** Gate picker usage on `navigator.userActivation?.isActive` and fall back to anchor download when activation is unavailable.

### AGG-009 — Numeric parser helpers silently coerce null/empty values to zero
- **Severity:** High
- **Confidence:** High
- **Agreement:** debugger
- **Evidence:** `src/lib/parser.ts:19-22`, `public/workers/trackParser.worker.js:1-4`
- **Problem:** `Number(null)` and `Number('')` become `0`, so missing optional fields can be interpreted as real zero values.
- **Failure scenario:** Malformed Google/GeoJSON inputs can emit points at latitude/longitude/elevation zero rather than skipping missing data.
- **Suggested fix:** Treat `null`, `undefined`, and empty strings as absent before numeric coercion.

### AGG-010 — XML DTD stripping can leave valid GPX/KML malformed
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** debugger
- **Evidence:** `src/lib/parser.ts:98-104`
- **Problem:** The DOCTYPE stripping regex can remove only the opening portion of an internal subset, leaving dangling declarations.
- **Failure scenario:** GPX/KML files with internal subsets fail parsing even when their track data is otherwise valid.
- **Suggested fix:** Remove complete DOCTYPE internal subsets and standalone entity declarations without leaving fragments.

### AGG-011 — Google parser can corrupt segment boundaries after global point sorting
- **Severity:** High
- **Confidence:** High
- **Agreement:** architect
- **Evidence:** `src/lib/parser.ts:207-248`, `src/lib/parser.ts:269-312`, `src/lib/parser.ts:391-428`, `public/workers/trackParser.worker.js:54-87`, `public/workers/trackParser.worker.js:99-135`, `public/workers/trackParser.worker.js:170-205`
- **Problem:** Segment starts are captured before dedupe/sort, then remapped after point-level global sorting.
- **Failure scenario:** Segment breaks no longer align to contiguous logical trips; distance and route rendering can skip/connect the wrong legs.
- **Suggested fix:** Parse logical segments, dedupe, sort segments, then flatten and derive segment starts.

### AGG-012 — JourneyCreator uses runtime symbol labels with glyphless static styles
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** architect
- **Evidence:** `public/map-styles/voyager.json:1-28`, `scripts/smoke-static.mjs:122-145`, `src/components/JourneyCreator.tsx:208-222`
- **Problem:** Static map styles intentionally omit glyph URLs, but JourneyCreator adds a `symbol` layer that needs glyphs.
- **Failure scenario:** Waypoint labels can fail or emit MapLibre glyph warnings in static mode.
- **Suggested fix:** Remove/replace the runtime symbol label layer or bundle local glyphs and update static policy.

### AGG-013 — Mobile loaded state hides the only visible track-name confirmation
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** designer
- **Evidence:** `src/components/TrackWorkspace.tsx:117-123`
- **Problem:** The track title is hidden below the `lg` breakpoint.
- **Failure scenario:** Mobile users can load the wrong file and receive no persistent track-name confirmation.
- **Suggested fix:** Add a compact mobile track title/status chip.

### AGG-014 — Mobile additional-controls popup advertises menu semantics but contains non-menu widgets
- **Severity:** Low
- **Confidence:** High
- **Agreement:** designer
- **Evidence:** `src/components/TrackToolbar.tsx:146-237`
- **Problem:** The popup uses `role="menu"` while containing selects, toggles, and grouped controls that do not implement menu keyboard semantics.
- **Failure scenario:** Assistive technology announces a menu pattern that the UI does not honor.
- **Suggested fix:** Use group/dialog semantics and remove `menuitem` roles.

### AGG-015 — Main-thread / duplicated parser-worker implementation remains a performance and maintainability risk
- **Severity:** Medium-High
- **Confidence:** High
- **Agreement:** code-reviewer, architect, perf-reviewer, tracer, test-engineer
- **Evidence:** `src/lib/parser.ts:346-454`, `public/workers/trackParser.worker.js:137-268`
- **Problem:** Google JSON parsing logic and constants are duplicated; the main thread keeps a large decoded fallback copy.
- **Failure scenario:** Large imports freeze or exhaust memory, and parser fixes drift between main/worker copies.
- **Suggested fix:** Share/generate parser code and avoid large pre-transfer text copies.

### AGG-016 — GPX/KML imports up to 200 MB parse synchronously and enforce point limits late
- **Severity:** High
- **Confidence:** High
- **Agreement:** perf-reviewer
- **Evidence:** `src/lib/parser.ts:516-567`
- **Problem:** XML imports are fully read/materialized on the main thread before point limits are enforced.
- **Failure scenario:** Very large XML tracks can freeze the UI or run out of memory.
- **Suggested fix:** Stream/chunk parse or reduce limits/enforce early.

### AGG-017 — Playback/export rebuild a growing trail GeoJSON every progress frame
- **Severity:** High
- **Confidence:** High
- **Agreement:** perf-reviewer
- **Evidence:** `src/components/MapView.tsx:841-847`
- **Problem:** Each frame rebuilds and uploads route geometry from the start to the current segment.
- **Failure scenario:** Long tracks degrade playback/export responsiveness.
- **Suggested fix:** Use `line-gradient`, feature-state, or throttled/progressive geometry updates.

### AGG-018 — Export frame synchronization relies on async React state and app-wide per-frame renders
- **Severity:** High
- **Confidence:** Medium-High
- **Agreement:** perf-reviewer
- **Evidence:** `src/lib/useExportController.ts:141-146`, `src/lib/videoEncoder.ts:101-130`
- **Problem:** Export capture depends on React state-driven progress updates and map idle waits.
- **Failure scenario:** Captured frames can race the visual trail update and cause app-wide per-frame re-render overhead.
- **Suggested fix:** Use imperative map updates for export-only state and minimize React updates during frame capture.

### AGG-019 — Overview camera recomputes full-track bounding boxes on repeated frames
- **Severity:** High
- **Confidence:** High
- **Agreement:** perf-reviewer
- **Evidence:** `src/lib/camera.ts:153-162`, `src/lib/camera.ts:391-400`
- **Problem:** Overview scene camera computation scans all track points per frame.
- **Failure scenario:** Large tracks and high-FPS exports spend avoidable CPU repeatedly computing the same bounding box.
- **Suggested fix:** Memoize/carry precomputed overview bounds/zoom per track.

### AGG-020 — Export limits allow very large in-memory MP4 outputs
- **Severity:** High
- **Confidence:** High
- **Agreement:** perf-reviewer
- **Evidence:** `src/types.ts` export limits, `src/lib/videoEncoder.ts:73-86`, `src/lib/videoEncoder.ts:142-158`
- **Problem:** The MP4 target is an in-memory buffer, but allowed resolution/duration/bitrate combinations can exceed practical memory.
- **Failure scenario:** Long 4K/maximum exports crash or stall the tab.
- **Suggested fix:** Add memory-aware limits or streaming output when available.

### AGG-021 — ElevationProfile builds unbounded SVG path strings
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** perf-reviewer
- **Evidence:** `src/components/ElevationProfile.tsx`
- **Problem:** The chart path scales directly with every track point.
- **Failure scenario:** Very large tracks create huge DOM attributes and slow rendering.
- **Suggested fix:** Downsample for display while preserving source data for calculations.

### AGG-022 — Timeline live drag slices tracks and reloads map sources at pointer-frame cadence
- **Severity:** Medium-High
- **Confidence:** High
- **Agreement:** perf-reviewer, test-engineer
- **Evidence:** `src/components/TimelineSelector.tsx:182-229`, `src/app/page.tsx:185-205`, `src/components/MapView.tsx:756-816`
- **Problem:** Every drag frame creates a new sliced track and pushes it through map/elevation/playback/export state.
- **Failure scenario:** Long tracks stutter while trimming.
- **Suggested fix:** Debounce expensive map updates or preview trim cheaply until drag end.

### AGG-023 — Static preview server buffers every request, including HEAD
- **Severity:** Low-Medium
- **Confidence:** High
- **Agreement:** perf-reviewer
- **Evidence:** `scripts/serve-static.mjs`
- **Problem:** Static server reads full files before responding, even when no body is needed.
- **Failure scenario:** Local CI/development static tests waste memory and time on large files.
- **Suggested fix:** Stream responses and special-case HEAD.

### AGG-024 — Core UI modules are large multi-responsibility files
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** code-reviewer
- **Evidence:** `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/components/SceneEditor.tsx`, `src/app/page.tsx`
- **Problem:** Several files mix state orchestration, rendering, event binding, and domain logic.
- **Failure scenario:** Small fixes risk unrelated regressions.
- **Suggested fix:** Split along stable boundaries after behavior is locked.

### AGG-025 — Parser and worker parity lack deterministic tests
- **Severity:** High
- **Confidence:** High
- **Agreement:** test-engineer
- **Evidence:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `e2e/travelback.spec.ts`
- **Problem:** Parser correctness depends largely on browser E2E fixtures, not fast deterministic parity tests.
- **Failure scenario:** Main/worker parser drift ships unnoticed.
- **Suggested fix:** Add targeted parser and worker parity tests.

### AGG-026 — Export state machine and download/cancel paths lack coverage
- **Severity:** High
- **Confidence:** High
- **Agreement:** test-engineer, verifier
- **Evidence:** `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `e2e/travelback.spec.ts`
- **Problem:** Tests open the panel but do not exercise actual encode/download/cancel branches.
- **Failure scenario:** Export regressions reach users despite green tests.
- **Suggested fix:** Add unit/component seams or browser tests for cancel, retry, fallback download, and picker cancellation.

### AGG-027 — Playback/camera/map geometry depends on timing-heavy E2E coverage
- **Severity:** Medium-High
- **Confidence:** High
- **Agreement:** test-engineer
- **Evidence:** `src/lib/interpolate.ts`, `src/lib/camera.ts`, `e2e/travelback.spec.ts`
- **Problem:** Pure math and camera invariants are mostly covered indirectly through slow/flaky browser tests.
- **Failure scenario:** Edge cases regress without focused feedback.
- **Suggested fix:** Add pure-function tests for interpolation, scene normalization, antimeridian handling, and camera blending.

### AGG-028 — JourneyCreator map interactions and discard/complete flows lack coverage
- **Severity:** Medium-High
- **Confidence:** High
- **Agreement:** test-engineer
- **Evidence:** `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`
- **Problem:** Manual route creation is only smoke-tested.
- **Failure scenario:** Drag/delete/discard/search flows regress.
- **Suggested fix:** Add browser tests for waypoint add/drag/delete, discard confirm, and completion.

### AGG-029 — Static smoke gates are not part of the main static E2E script
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** test-engineer
- **Evidence:** `package.json` scripts, `scripts/smoke-static.mjs`, `playwright.static.config.ts`
- **Problem:** `npm run test:e2e:static` builds and runs Playwright but does not run the static smoke assertions.
- **Failure scenario:** Developers running the advertised static E2E script can miss static CSP/base-path/style regressions.
- **Suggested fix:** Chain `npm run smoke:static` into the static E2E script after build.

### AGG-030 — Fixed sleeps and global retries hide flaky-test root causes
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** test-engineer
- **Evidence:** `e2e/travelback.spec.ts`, `playwright*.config.ts`
- **Problem:** Tests use fixed waits and retry configuration in places where event-based readiness would be stronger.
- **Failure scenario:** Real race conditions become slower/flakier instead of deterministic failures.
- **Suggested fix:** Replace fixed sleeps with readiness probes and narrow retries.

### AGG-031 — Documentation/context contains stale or contradictory status claims
- **Severity:** Medium
- **Confidence:** High
- **Agreement:** document-specialist, verifier
- **Evidence:** `.context/README.md`, `.context/plans/README.md`, `plan/cycle2-c2-plan.md`
- **Problem:** Context docs and plans disagree about active plan state and prior plan chronology.
- **Failure scenario:** Future agents follow stale context and re-open already-resolved work.
- **Suggested fix:** Update docs/plans to reflect current active plans and history.

### AGG-032 — Anti-framing/deployment docs overstate what GitHub Pages actually ships
- **Severity:** High
- **Confidence:** High
- **Agreement:** document-specialist
- **Evidence:** `.context/project/01-overview.md:28`, `.context/project/02-architecture.md:115-118`, GitHub Pages/static export behavior
- **Problem:** Docs imply host-level anti-framing headers are part of the deployment, but GitHub Pages cannot set those headers for this static app.
- **Failure scenario:** Reviewers overestimate deployed clickjacking protection.
- **Suggested fix:** State that the shipped GitHub Pages artifact relies on JS frame-busting unless a different host/CDN provides headers.

### AGG-033 — Architecture docs list stale default scene names
- **Severity:** Low
- **Confidence:** High
- **Agreement:** document-specialist
- **Evidence:** `.context/project/02-architecture.md:88`, `src/lib/camera.ts:210-260`
- **Problem:** The documented default scene sequence no longer matches user-facing scene names.
- **Failure scenario:** Product/docs reviewers use stale terminology.
- **Suggested fix:** Update the documented scene names.

### AGG-034 — Export preset docs are incomplete
- **Severity:** Low
- **Confidence:** High
- **Agreement:** document-specialist
- **Evidence:** `.context/project/01-overview.md:90`, `src/types.ts` resolution presets
- **Problem:** Docs omit some available export presets.
- **Failure scenario:** Users/contributors rely on an incomplete feature list.
- **Suggested fix:** List all current resolution presets.

### AGG-035 — One deferred plan item is already resolved
- **Severity:** Low
- **Confidence:** High
- **Agreement:** document-specialist
- **Evidence:** `.context/plans/*deferred*`, `.context/project/02-architecture.md`
- **Problem:** A deferred documentation update remains open even though the architecture doc was updated.
- **Failure scenario:** Future cycles spend time on already-completed work.
- **Suggested fix:** Mark/archive the stale deferred item as resolved.

## Security review summary

The security-reviewer found no Critical/High/Medium/Low actionable security findings. Secret scans and `npm audit --audit-level=high` were clean at review time.
