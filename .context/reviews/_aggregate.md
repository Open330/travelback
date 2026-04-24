# Aggregate Review — review-plan-fix cycle 2/100 — 2026-04-24

Sources: `code-reviewer.md`, `security-reviewer.md`, `critic.md`,
`verifier.md`, `test-engineer.md`, `architect.md`, `debugger.md`, and
`designer.md`.

Unavailable registered reviewer roles in this environment: `perf-reviewer`,
`tracer`, and `document-specialist`.

## Executive Summary

The fresh review found 21 unique findings. The actionable correctness/security
fixes for this cycle are XML entity hardening, export-session preservation on
failed retries, trim/scene state ownership, Journey Creator map-readiness retry,
antimeridian reference-grid bounds, more accurate export failure messaging,
mobile file-replacement discoverability, and an in-app map retry path. Broader
architecture, performance, deployment, CSP, and test-harness issues are recorded
for explicit scheduling or deferral in the cycle plan.

## Deduplicated Findings

### C2-AGG-001 — XML entity hardening is incomplete

- **Severity/confidence:** Medium / High
- **Agreement:** debugger
- **Evidence:** `src/lib/parser.ts:145-157`
- **Problem:** The `<!ENTITY[^>]*>` sanitizer only matches single-line entity
  declarations; multi-line declarations can survive before `DOMParser`.
- **Failure scenario:** A GPX/KML file with a multi-line entity declaration
  bypasses the intended prefilter and reaches browser XML parsing.
- **Suggested fix:** Strip newline-spanning entity declarations or reject any
  DTD/entity block before parsing.

### C2-AGG-002 — GPX/KML imports can lock the UI via main-thread XML parsing

- **Severity/confidence:** Medium / High
- **Agreement:** security-reviewer
- **Evidence:** `src/lib/parser.ts:521-523`, `src/lib/parser.ts:653-673`,
  `src/components/FileUpload.tsx:19-20`, `src/components/FileUpload.tsx:52-60`
- **Problem:** XML files are accepted up to `200MB` and parsed on the main
  thread with `FileReader` and `DOMParser`.
- **Failure scenario:** A large crafted GPX/KML freezes or crashes the tab.
- **Suggested fix:** Workerize XML parsing or reduce XML limits.

### C2-AGG-003 — Failed export attempts can destroy the previous export preview

- **Severity/confidence:** Medium / High
- **Agreement:** debugger
- **Evidence:** `src/lib/useExportController.ts:87-103`,
  `src/lib/useExportController.ts:174-186`
- **Problem:** `exportTrack()` revokes the current object URL before validating
  that the new export can start.
- **Failure scenario:** A user with a finished export retries while the map
  canvas is unavailable; the retry fails and the previous preview is gone.
- **Suggested fix:** Revoke the old export only after validation and after the
  new pipeline has started.

### C2-AGG-004 — Scene ownership is not trim-aware

- **Severity/confidence:** Medium / High
- **Agreement:** architect
- **Evidence:** `.context/project/02-architecture.md:130-138`,
  `src/app/page.tsx:188-237`, `src/lib/camera.ts:125-137`,
  `src/lib/camera.ts:339-428`
- **Problem:** Trimming replaces `track` but leaves scenes authored against the
  previous full-track coordinate space.
- **Failure scenario:** A user authors scenes, trims to a subsection, then
  exports with the same percentages applied to a different route slice.
- **Suggested fix:** Clear scenes on trim or re-project scenes in full-track
  distance space.

### C2-AGG-005 — Journey Creator can miss map initialization and never retry

- **Severity/confidence:** Low / Medium
- **Agreement:** architect, debugger
- **Evidence:** `src/components/JourneyCreator.tsx:242-257`,
  `src/components/JourneyCreator.tsx:421-433`,
  `src/app/page.tsx:407-414`
- **Problem:** The effect reads `mapRef.current?.getMap()` once and only depends
  on `isActive`.
- **Failure scenario:** If creation activates before MapLibre is ready, the
  panel appears without journey layers/listeners.
- **Suggested fix:** Add a map-ready signal or retry until the handle exists.

### C2-AGG-006 — Dateline trips get world-scale reference-grid bounds

- **Severity/confidence:** Medium / High
- **Agreement:** critic
- **Evidence:** `src/components/MapView.tsx:107-204`,
  `src/components/MapView.tsx:263-319`
- **Problem:** Route and fit-bounds logic handle antimeridian wrapping, but
  `buildReferenceGridData()` uses raw min/max longitude span.
- **Failure scenario:** A local route around `179` to `-179` renders with a
  near-global reference grid.
- **Suggested fix:** Reuse the same wrapped-longitude domain for grid extent.

### C2-AGG-007 — Export failure messaging blames codecs for all failures

- **Severity/confidence:** Medium / High
- **Agreement:** critic
- **Evidence:** `src/lib/useExportController.ts:123-139`,
  `src/lib/useExportController.ts:174-186`, `src/lib/i18n.ts:294-295`
- **Problem:** Map idle/resize failures and generic exceptions are surfaced as
  codec/WebCodecs guidance.
- **Failure scenario:** A map render timeout tells the user to change browser or
  codec support rather than explaining render-time failure.
- **Suggested fix:** Classify map-render failures separately from codec/encoder
  failures.

### C2-AGG-008 — Mobile file replacement collapses to an icon-only control

- **Severity/confidence:** Medium / High
- **Agreement:** designer
- **Evidence:** `src/components/FileUpload.tsx:130-143`
- **Problem:** On mobile, the persistent replace-file action has no visible
  text.
- **Failure scenario:** Sighted mobile users must infer that a small folder icon
  replaces the current track.
- **Suggested fix:** Keep a short visible mobile label or move the action into
  the mobile toolbar.

### C2-AGG-009 — Map failure path only offers page reload

- **Severity/confidence:** Medium / High
- **Agreement:** designer
- **Evidence:** `src/components/MapView.tsx:945-954`
- **Problem:** A map error hard-stops the workspace with only a reload CTA.
- **Failure scenario:** WebGL/context errors force reload and risk losing
  in-memory edits.
- **Suggested fix:** Add an in-app retry/reinitialize action.

### C2-AGG-010 — The shipped map style is a route grid, not a real basemap

- **Severity/confidence:** High / High
- **Agreement:** critic
- **Evidence:** `src/types.ts:25-45`, `public/map-styles/*.json`,
  `src/components/MapView.tsx:225-369`
- **Problem:** The product copy promises an interactive map, but bundled map
  styles intentionally contain no basemap sources, roads, coastlines, or labels.
- **Failure scenario:** Users expect recognizable geography but get a route on a
  synthetic grid.
- **Suggested fix:** Ship real local basemap assets or reposition product copy
  around grid-based route videos.

### C2-AGG-011 — The File System Access save path likely loses user activation

- **Severity/confidence:** Medium / Medium
- **Agreement:** critic
- **Evidence:** `src/lib/useExportController.ts:146-163`,
  `src/lib/videoEncoder.ts:171-188`
- **Problem:** `showSaveFilePicker()` is attempted only after long async
  encoding, when user activation has likely expired.
- **Failure scenario:** Browsers that support picker saves silently fall back to
  anchor download semantics.
- **Suggested fix:** Request the handle before encoding or treat the picker
  branch as opportunistic and document/test it.

### C2-AGG-012 — Google JSON parsing is duplicated between main and worker paths

- **Severity/confidence:** Medium / High
- **Agreement:** code-reviewer, critic, test-engineer, architect
- **Evidence:** `src/lib/parser.ts:242-620`,
  `public/workers/trackParser.worker.js:44-320`
- **Problem:** Two implementations can drift by file size, Worker support, or
  future maintenance.
- **Failure scenario:** A parser fix lands in one copy but not the other.
- **Suggested fix:** Generate/bundle the worker from a shared parser module.

### C2-AGG-013 — Large JSON worker failures are too generic

- **Severity/confidence:** Medium / High
- **Agreement:** code-reviewer, debugger
- **Evidence:** `src/lib/parser.ts:529-560`,
  `src/components/FileUpload.tsx:62-85`
- **Problem:** Worker-unavailable large JSON failures map to generic
  `INVALID_GOOGLE_JSON`/parse-failed copy.
- **Failure scenario:** A valid large Google JSON file fails because Worker
  support is unavailable, but the UI says only that parsing failed.
- **Suggested fix:** Add a dedicated worker-required error code and copy.

### C2-AGG-014 — Core export flow is not tested end-to-end

- **Severity/confidence:** High / High
- **Agreement:** code-reviewer, test-engineer, architect, critic
- **Evidence:** `e2e/travelback.spec.ts:1111-1173`,
  `e2e/travelback.spec.ts:1237-1291`,
  `src/lib/useExportController.ts:87-220`, `src/lib/videoEncoder.ts:40-159`
- **Problem:** Tests open the export panel but do not start export, cancel, or
  assert result/download state.
- **Failure scenario:** Export encode/save regressions ship while browser tests
  remain green.
- **Suggested fix:** Add deterministic controller tests or one browser-level
  low-cost export smoke.

### C2-AGG-015 — Pure parser/camera/interpolate/controller logic lacks a deterministic harness

- **Severity/confidence:** High / High
- **Agreement:** test-engineer, verifier
- **Evidence:** `package.json:5-17`, `src/lib/parser.ts`,
  `src/lib/interpolate.ts`, `src/lib/camera.ts`,
  `src/lib/usePlaybackController.ts`
- **Problem:** The repo relies on Playwright for logic that could be tested
  deterministically.
- **Failure scenario:** Math/fallback regressions survive broad browser tests.
- **Suggested fix:** Add low-level tests for parser/interpolate/camera/controller
  contracts.

### C2-AGG-016 — Playback/export frame loop rebuilds expensive geometry

- **Severity/confidence:** Medium / High
- **Agreement:** code-reviewer
- **Evidence:** `src/components/MapView.tsx:107-167`,
  `src/components/MapView.tsx:844-850`, `src/lib/camera.ts:53-95`,
  `src/lib/camera.ts:339-427`
- **Problem:** The trail GeoJSON and overview bounds are rebuilt repeatedly on
  playback/export frames.
- **Failure scenario:** Long tracks or high-FPS exports jank and slow down.
- **Suggested fix:** Cache invariant overview metrics and avoid full per-frame
  GeoJSON regeneration.

### C2-AGG-017 — Playwright suite is monolithic and timing/actionability fragile

- **Severity/confidence:** Medium / High
- **Agreement:** code-reviewer, test-engineer, debugger, verifier
- **Evidence:** `e2e/travelback.spec.ts`, `playwright.config.ts:7-11`,
  `playwright.static.config.ts:7-11`
- **Problem:** The suite uses fixed waits, many forced clicks, copy-heavy
  selectors, one giant spec file, and global retries.
- **Failure scenario:** False negatives/positives hide layout or timing
  regressions.
- **Suggested fix:** Split by feature, reduce `force: true`, and replace sleeps
  with explicit readiness predicates.

### C2-AGG-018 — Static export/deployment is hard-coupled to `/travelback`

- **Severity/confidence:** Medium / High
- **Agreement:** architect
- **Evidence:** `next.config.ts:3-10`, `package.json:8-16`,
  `playwright.static.config.ts:13-43`,
  `.github/workflows/deploy-pages.yml:17-46`
- **Problem:** Production path is spread across build, preview, tests, and
  runtime assumptions.
- **Failure scenario:** Serving from another path breaks assets and metadata.
- **Suggested fix:** Centralize `basePath` and site origin as build-time config.

### C2-AGG-019 — Locale bootstrapping is weaker than theme bootstrapping

- **Severity/confidence:** Medium / Medium
- **Agreement:** architect
- **Evidence:** `src/app/layout.tsx:50-53`, `src/lib/i18n.ts:1738-1788`
- **Problem:** Static HTML starts as English until client locale resolution.
- **Failure scenario:** Localized users see/announce English before hydration.
- **Suggested fix:** Align bootstrap and provider initial locale resolution.

### C2-AGG-020 — Anti-framing and style CSP remain deployment/hardening risks

- **Severity/confidence:** Low / High
- **Agreement:** security-reviewer, code-reviewer
- **Evidence:** `src/app/layout.tsx:60-64`,
  `.github/workflows/deploy-pages.yml:34-46`,
  `scripts/serve-static.mjs:147-158`,
  `scripts/harden-static-export.mjs:14-29`
- **Problem:** GitHub Pages lacks header-enforced anti-framing, and style CSP
  still allows inline styles.
- **Failure scenario:** Browser-enforced containment differs between local
  preview and production Pages.
- **Suggested fix:** Use header-capable hosting/CDN and reduce inline styles over
  time.

### C2-AGG-021 — RTL assumptions are not wired through document or controls

- **Severity/confidence:** Low / High
- **Agreement:** designer
- **Evidence:** `src/app/layout.tsx:50-53`, `src/components/GoogleGuide.tsx:289-310`,
  `src/components/TimelineSelector.tsx:396-415`,
  `src/components/SceneEditor.tsx:186-229`,
  `src/components/TrackWorkspace.tsx:122-166`
- **Problem:** Future RTL locales would inherit LTR document direction and
  physical left/right behavior.
- **Failure scenario:** Arabic/Hebrew support would feel reversed and may
  overlap.
- **Suggested fix:** Derive `dir` from locale and switch directional controls to
  locale-aware behavior before adding RTL locales.

## Agent Failures

None. The security-reviewer and architect agents returned read-only review
content; the cycle owner transcribed that content into the required per-agent
files for provenance.
