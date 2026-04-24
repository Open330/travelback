# Aggregate Review — review-plan-fix cycle 1/100 — 2026-04-24

Sources: `code-reviewer.md`, `security-reviewer.md`, `critic.md`, `verifier.md`, `test-engineer.md`, `architect.md`, `debugger.md`, `designer.md`, `dependency-expert.md`, `perf-reviewer.md`, `tracer.md`, `document-specialist.md`, and `non-tech-traveler-reviewer.md`.

## Executive Summary

The review found 54 unique findings. The highest-signal bounded fixes are export state ownership, scene-editor correctness, KML/JSON parser robustness, keyboard/accessibility defects, and misleading download/export states. Broader performance, architecture, deployment, documentation, and test-harness items are recorded for explicit scheduling or deferral in `plan/cycle1-current-plan-2026-04-24.md` and `plan/deferred-cycle1-current-2026-04-24.md`.

## High / Correctness / Data-Loss Findings

### AGG-001 — Export is split across two modal systems
- **Sources:** architect, debugger
- **Severity / confidence:** High / High
- **Citations:** `src/app/page.tsx:382-405`, `src/app/page.tsx:487-500`, `src/components/ExportPanel.tsx:175-267`, `src/components/ModalDialog.tsx:43-49`
- **Problem:** The cancel button is rendered behind a modal that marks the app root inert.
- **Failure scenario:** Long export cannot be cancelled by mouse/keyboard even though a cancel button appears.
- **Fix:** Make export progress/cancel a single owner inside `ExportPanel`, or remove the overlapping overlay.

### AGG-002 — Closing a completed export destroys the only rendered video state
- **Sources:** debugger
- **Severity / confidence:** Medium / High
- **Citations:** `src/app/page.tsx:300-305`, `src/components/ExportPanel.tsx:201-247`
- **Problem:** Modal close calls `resetExportSession()` after success, revoking the blob URL and clearing the MP4.
- **Failure scenario:** User closes the panel after a long export and loses the result before saving/sharing.
- **Fix:** Make close non-destructive; reserve reset for `Export Again`.

### AGG-003 — Fallback download reports success without a confirmed saved file
- **Sources:** critic, tracer, non-tech traveler
- **Severity / confidence:** High / Medium-High
- **Citations:** `src/lib/videoEncoder.ts:171-211`, `src/lib/useExportController.ts:158-170`, `src/components/ExportPanel.tsx:207-214`
- **Problem:** A delayed synthetic `<a download>` click is reported as `saved: true`.
- **Failure scenario:** Mobile browser blocks the delayed click, but the UI says the video was saved.
- **Fix:** Treat fallback as ready/download-available, keep a real user-gesture download button, and reserve saved status for confirmed picker writes.

### AGG-004 — Export silently no-ops if map/canvas is unavailable
- **Sources:** critic
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/MapView.tsx:613-639`, `src/app/page.tsx:365-500`, `src/lib/useExportController.ts:87-90`
- **Problem:** `exportTrack()` returns with no user-facing feedback when there is no map handle/canvas.
- **Failure scenario:** WebGL/style failure leaves controls visible; Start Export does nothing.
- **Fix:** Surface an error toast or disable export until map readiness is known.

### AGG-005 — A single custom scene freezes camera after that scene ends
- **Sources:** tracer
- **Severity / confidence:** High / High
- **Citations:** `src/components/SceneEditor.tsx:298-312`, `src/lib/camera.ts:350-404`, `src/components/MapView.tsx:849-857`, `src/lib/useExportController.ts:106-116`
- **Problem:** Progress after the last scene reuses the last scene at local progress `1`.
- **Failure scenario:** A 15% opening scene pins the camera for the remaining 85% of playback/export.
- **Fix:** Fill uncovered scene tails or fall back to normal follow camera after the final scene.

### AGG-006 — Invalid scene range edits can silently delete the scene
- **Sources:** tracer
- **Severity / confidence:** Medium-High / High
- **Citations:** `src/components/SceneEditor.tsx:250-273`, `src/components/SceneEditor.tsx:524-543`, `src/lib/camera.ts:19-44`
- **Problem:** Raw invalid intermediate input is normalized and filtered out immediately.
- **Failure scenario:** User types a start percent above the current end and loses the scene without clicking delete.
- **Fix:** Clamp paired range edits or keep invalid raw state without committing normalized deletion.

### AGG-007 — KML GeometryCollection / MultiGeometry routes are ignored
- **Sources:** tracer
- **Severity / confidence:** Medium / Medium-High
- **Citations:** `src/lib/parser.ts:43-107`, `src/lib/parser.ts:164-168`
- **Problem:** Extractor only handles `LineString`, `MultiLineString`, and `Point`.
- **Failure scenario:** KML `MultiGeometry` with a valid nested LineString imports as empty or too few points.
- **Fix:** Recursively extract supported geometries from `GeometryCollection`.

### AGG-008 — Large JSON worker-construction failure falls back to main-thread parsing
- **Sources:** code-reviewer
- **Severity / confidence:** Medium / High
- **Citations:** `src/lib/parser.ts:498-515`
- **Problem:** The worker constructor failure path decodes the full buffer on the main thread without the bounded fallback guard.
- **Failure scenario:** Worker-blocked browser imports an 80-100 MB Google file and freezes.
- **Fix:** Only main-thread fallback for `MAIN_THREAD_JSON_FALLBACK_SIZE`; otherwise reject with a clear parser error.

### AGG-009 — Journey Creator map can be disabled by the no-track inert state
- **Sources:** aggregate final sweep
- **Severity / confidence:** High / High
- **Citations:** `src/components/MapView.tsx:430-441`, `src/app/page.tsx:435-442`, `src/components/JourneyCreator.tsx:248-364`
- **Problem:** `MapView` marks the map container inert whenever there is no loaded track, but journey creation intentionally runs with no track and depends on map clicks.
- **Failure scenario:** User chooses Draw Route, but map clicks are suppressed or removed from assistive interaction because the map container remains inert.
- **Fix:** Add an explicit journey-creation interaction mode so the map is not inert while Journey Creator is active.

## Accessibility / UX Findings

### AGG-010 — Scene range keyboard controls leak into global playback hotkeys
- **Sources:** code-reviewer, tracer
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/SceneEditor.tsx:173-225`, `src/lib/usePlaybackController.ts:156-185`, `src/components/ElevationProfile.tsx:74-83`
- **Problem:** Custom slider key handlers call `preventDefault()` but do not stop propagation; the global hotkey handler does not ignore sliders.
- **Failure scenario:** Adjusting a scene boundary also seeks playback.
- **Fix:** Stop propagation in consumed key handlers and/or mark editor/elevation controls as hotkey-disabled.

### AGG-011 — Mobile toolbar focus management focuses the trigger
- **Sources:** code-reviewer
- **Severity / confidence:** Low / High
- **Citations:** `src/components/TrackToolbar.tsx:10-17`, `src/components/TrackToolbar.tsx:134-159`
- **Problem:** The focus-first hook queries from a wrapper containing the trigger button.
- **Failure scenario:** Opening the mobile overflow menu leaves focus on the toggle instead of moving into the popup.
- **Fix:** Use a separate popup-panel ref for focus.

### AGG-012 — Journey search combobox has no accessible name
- **Sources:** designer
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/JourneyCreator.tsx:604-617`
- **Failure scenario:** Screen-reader/voice users encounter a nameless combobox.
- **Fix:** Add a localized label or `aria-label`.

### AGG-013 — Scene-name input has no accessible name
- **Sources:** designer
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/SceneEditor.tsx:478-483`
- **Failure scenario:** Scene title editing is anonymous to assistive tech.
- **Fix:** Add a stable localized `aria-label` or associated label.

### AGG-014 — Journey creation does not move keyboard focus into the active workflow
- **Sources:** designer
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/JourneyCreator.tsx:555-640`, `src/components/GlobalToolbar.tsx:19-67`
- **Failure scenario:** After Draw Route, Tab reaches unrelated global controls before the active journey panel.
- **Fix:** Focus the first meaningful Journey Creator control on open.

### AGG-015 — Default export preset is landscape instead of portrait social video
- **Sources:** non-tech traveler
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/ExportPanel.tsx:61`, `src/types.ts:99`
- **Failure scenario:** Casual users export a landscape video before noticing the dropdown.
- **Fix:** Default to the TikTok/Reels/Shorts portrait preset or make social portrait the recommended first choice.

### AGG-016 — Import errors are too generic for recovery
- **Sources:** non-tech traveler
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/FileUpload.tsx:63-86`, `src/lib/i18n.ts:26`, `src/lib/i18n.ts:35`
- **Failure scenario:** User uploads a zip/photo/wrong JSON and gets no next action.
- **Fix:** Pair parse/format errors with clearer supported-file guidance and guide access.

### AGG-017 — Post-export UI lacks a reliable explicit download fallback
- **Sources:** non-tech traveler, tracer
- **Severity / confidence:** Low-Medium / Medium
- **Citations:** `src/components/ExportPanel.tsx:201-247`, `src/lib/videoEncoder.ts:191-211`
- **Failure scenario:** Unsupported share/download browser leaves user unsure where the MP4 went.
- **Fix:** Always show an explicit Download MP4 link/button when a blob URL exists.

## Performance / Architecture / Tooling Findings

### AGG-018 — Export memory limits exceed the in-memory MP4 pipeline
- **Sources:** dependency-expert, perf-reviewer
- **Severity / confidence:** High / High
- **Citations:** `src/types.ts:80-107`, `src/components/ExportPanel.tsx:96-136`, `src/lib/videoEncoder.ts:73-86`, `src/lib/videoEncoder.ts:142-158`
- **Failure scenario:** Multi-GB 4K/long-duration export OOMs during finalization.
- **Fix:** Add preflight budget guard or stream large outputs to a file-backed target.

### AGG-019 — GPX/KML up to 200 MB parse synchronously on UI thread
- **Sources:** perf-reviewer, dependency-expert
- **Severity / confidence:** High / High
- **Citations:** `src/lib/parser.ts:116-176`, `src/lib/parser.ts:576-627`
- **Fix:** Worker/stream XML parsing or lower main-thread XML limits.

### AGG-020 — Google JSON worker enforces point limits after full parse/materialization
- **Sources:** perf-reviewer
- **Severity / confidence:** Medium-High / High
- **Citations:** `public/workers/trackParser.worker.js:307-314`
- **Fix:** Count/abort while parsing branches before full sort/dedupe materialization.

### AGG-021 — Playback/export rebuild growing trail GeoJSON every frame
- **Sources:** perf-reviewer
- **Severity / confidence:** High / High
- **Citations:** `src/components/MapView.tsx:106-167`, `src/components/MapView.tsx:824-847`
- **Fix:** Precompute route geometry and drive progress with cheaper layer expressions or decimated preview geometry.

### AGG-022 — Playback progress is app-wide React state
- **Sources:** perf-reviewer
- **Severity / confidence:** Medium-High / High
- **Citations:** `src/lib/usePlaybackController.ts:48-51`, `src/app/page.tsx:368-484`, `src/lib/useExportController.ts:147-153`
- **Fix:** Use imperative map frame APIs for high-frequency progress and throttle React UI updates.

### AGG-023 — Overview camera scans the full track repeatedly
- **Sources:** perf-reviewer
- **Severity / confidence:** High / High
- **Citations:** `src/lib/camera.ts:53-75`, `src/lib/camera.ts:141-150`, `src/lib/camera.ts:329-423`
- **Fix:** Cache track bounds/overview metrics per track.

### AGG-024 — Interactive map always pays `preserveDrawingBuffer` overhead
- **Sources:** perf-reviewer
- **Severity / confidence:** Medium / Medium
- **Citations:** `src/components/MapView.tsx:547-558`
- **Fix:** Use a dedicated export map/canvas or document/limit the tradeoff.

### AGG-025 — ElevationProfile renders unbounded SVG path strings
- **Sources:** perf-reviewer
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/ElevationProfile.tsx:20-118`
- **Fix:** Downsample to display resolution before rendering.

### AGG-026 — Timeline live drag rebuilds track/map state at pointer-frame cadence
- **Sources:** architect, perf-reviewer
- **Severity / confidence:** Medium-High / High
- **Citations:** `src/components/TimelineSelector.tsx:182-226`, `src/app/page.tsx:216-237`, `src/components/MapView.tsx:756-816`
- **Fix:** Separate drag preview from committed track replacement.

### AGG-027 — Static preview server buffers every file and reads bodies for HEAD
- **Sources:** perf-reviewer
- **Severity / confidence:** Low-Medium / High
- **Citations:** `scripts/serve-static.mjs:121-165`
- **Fix:** `stat` for headers, stream GET bodies, and return HEAD without reading.

### AGG-028 — Google parser logic is duplicated between TS and public worker JS
- **Sources:** code-reviewer, critic, architect, test-engineer
- **Severity / confidence:** Medium / High
- **Citations:** `src/lib/parser.ts:182-574`, `public/workers/trackParser.worker.js:1-322`
- **Fix:** Generate/bundle the worker from shared parser source and add parity tests.

### AGG-029 — Production base path/site URL is hard-coded to `/travelback`
- **Sources:** critic, architect
- **Severity / confidence:** Medium / High
- **Citations:** `next.config.ts:3-10`, `package.json:8`, `playwright.static.config.ts:14`, `scripts/smoke-static.mjs:20`
- **Fix:** Centralize base path and public URL as deployment configuration.

### AGG-030 — GitHub Pages production lacks browser-enforced anti-framing headers
- **Sources:** security-reviewer, architect
- **Severity / confidence:** Low-Medium / High
- **Citations:** `src/app/layout.tsx:49-63`, `.github/workflows/deploy-pages.yml:34-46`, `scripts/serve-static.mjs:147-157`
- **Fix:** Use header-capable hosting/CDN for `frame-ancestors`/`X-Frame-Options`, or keep docs/tests explicit about the Pages limitation.

### AGG-031 — CSP still requires `style-src 'unsafe-inline'`
- **Sources:** security-reviewer
- **Severity / confidence:** Low / High
- **Citations:** `src/app/layout.tsx:59-63`, `scripts/harden-static-export.mjs:14-29`
- **Fix:** Reduce inline styles over time before tightening CSP.

## Test / Documentation Findings

### AGG-032 — Parser and worker parity lack deterministic tests
- **Sources:** test-engineer, critic
- **Severity / confidence:** High / High
- **Citations:** `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/components/FileUpload.tsx:61-86`

### AGG-033 — Export state machine is not tested through Start Export
- **Sources:** test-engineer, document-specialist, non-tech traveler
- **Severity / confidence:** High / High
- **Citations:** `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `e2e/travelback.spec.ts:1111-1173`, `e2e/travelback.spec.ts:1237-1292`

### AGG-034 — Static smoke protections are omitted from the CI-oriented static Playwright command
- **Sources:** test-engineer, document-specialist
- **Severity / confidence:** Medium / High
- **Citations:** `package.json:12-17`, `scripts/smoke-static.mjs`

### AGG-035 — Playwright suite relies on fixed sleeps and global retry
- **Sources:** test-engineer, non-tech traveler
- **Severity / confidence:** Medium / High
- **Citations:** `playwright.config.ts:7-11`, `playwright.static.config.ts:7-11`, `e2e/travelback.spec.ts`

### AGG-036 — Mobile coverage is viewport-only for touch-specific paths
- **Sources:** test-engineer
- **Severity / confidence:** Medium / Medium-High
- **Citations:** `playwright.config.ts:21-38`, `src/components/JourneyCreator.tsx:318-347`, `src/components/TimelineSelector.tsx`, `src/components/ExportPanel.tsx:84-94`

### AGG-037 — E2E selectors are coupled to English copy
- **Sources:** code-reviewer
- **Severity / confidence:** Low / High
- **Citations:** `e2e/travelback.spec.ts:137-193`, `e2e/travelback.spec.ts:254-257`

### AGG-038 — Architecture docs list removed Journey Creator label layer
- **Sources:** document-specialist
- **Severity / confidence:** Medium / High
- **Citations:** `.context/project/02-architecture.md:140-149`, `src/components/JourneyCreator.tsx:20-219`

### AGG-039 — `.context/plans/README.md` is stale
- **Sources:** document-specialist
- **Severity / confidence:** Medium / High
- **Citations:** `.context/plans/README.md`, `.context/plans/deferred-findings-cycle-r8-2026-04-23.md`, `plan/deferred-cycle1-review-plan-2026-04-24.md`

### AGG-040 — Cycle 10 plan downgrades active deferred severities by implication
- **Sources:** document-specialist
- **Severity / confidence:** Medium / High
- **Citations:** `plan/cycle10-plan.md:37-41`, `plan/deferred-cycle1-review-plan-2026-04-24.md:14-47`

### AGG-041 — Non-tech reviewer docs overstate export E2E coverage
- **Sources:** document-specialist
- **Severity / confidence:** Medium / High
- **Citations:** `.context/agents/non-tech-traveler-reviewer.md:51-101`, `e2e/travelback.spec.ts:1111-1292`

### AGG-042 — Project docs omit configured gates
- **Sources:** document-specialist
- **Severity / confidence:** Medium / High
- **Citations:** `.context/project/01-overview.md:17-25`, `.context/development/01-conventions.md:52-57`, `package.json:10-17`

### AGG-043 — Project overview under-documents current import-guide scope
- **Sources:** document-specialist
- **Severity / confidence:** Low / High
- **Citations:** `.context/project/01-overview.md:62-63`, `src/components/GoogleGuide.tsx:146-245`

### AGG-044 — Map-style docs do not match user-facing labels
- **Sources:** document-specialist
- **Severity / confidence:** Low / High
- **Citations:** `.context/project/01-overview.md:88`, `src/lib/i18n.ts:142-147`

### AGG-045 — Camera customization exposes too much numeric tuning
- **Sources:** non-tech traveler
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`

### AGG-046 — Journey creation is coordinate-first for casual users
- **Sources:** non-tech traveler
- **Severity / confidence:** Medium / Medium
- **Citations:** `src/components/JourneyCreator.tsx:576-617`, `src/lib/i18n.ts:246`

### AGG-047 — Mobile help is buried behind an icon after upload
- **Sources:** non-tech traveler
- **Severity / confidence:** Medium / Medium
- **Citations:** `src/components/TrackToolbar.tsx:134-184`, `src/components/GlobalToolbar.tsx:25`

### AGG-048 — Journey travel-icon picker is a no-op
- **Sources:** critic
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/JourneyCreator.tsx:41-60`, `src/components/JourneyCreator.tsx:184-205`, `src/components/JourneyCreator.tsx:665-692`

### AGG-049 — GPX/KML support docs imply broader parser compatibility than DOMParser allows
- **Sources:** dependency-expert
- **Severity / confidence:** Medium / Medium-High
- **Citations:** `src/lib/parser.ts:116-176`, `.context/project/01-overview.md:12-13`

### AGG-050 — Map-style explicitness can be misclassified for older persisted state
- **Sources:** debugger
- **Severity / confidence:** Low / Medium
- **Citations:** `src/app/page.tsx:44-56`, `src/app/page.tsx:327-339`

### AGG-051 — Toast enter animation can set state after unmount
- **Sources:** debugger
- **Severity / confidence:** Low / High
- **Citations:** `src/components/Toast.tsx:25-35`

### AGG-052 — Manual-route preview does not wrap antimeridian crossings
- **Sources:** critic
- **Severity / confidence:** Medium / High
- **Citations:** `src/components/JourneyCreator.tsx:63-70`, `src/components/MapView.tsx:106-166`

### AGG-053 — Actual video export last mile is slow/not proven in manual review
- **Sources:** non-tech traveler, verifier
- **Severity / confidence:** Critical UX concern / Medium
- **Citations:** `e2e/travelback.spec.ts:1237`, `e2e/travelback.spec.ts:1274`
- **Note:** Treat as overlapping with AGG-003, AGG-018, and AGG-033 for planning.

### AGG-054 — Full app exports/test suite had one flaky retry artifact
- **Sources:** verifier, non-tech traveler
- **Severity / confidence:** Low / Medium
- **Citations:** `test-results/.last-run.json`, static theme retry evidence
- **Note:** Isolated rerun passed; track under AGG-035.

## Agent Failures

The architect lane was read-only and could not write its own file. The returned architect report was preserved by the orchestrator in `architect.md`.

## Final Sweep

The aggregate deduplicates overlapping items and preserves the highest severity/confidence reported by any lane. Cross-agent agreement is strongest around export/download correctness, parser duplication/parity, large-export memory risk, scene keyboard/range issues, static deployment assumptions, and missing export-completion tests.
