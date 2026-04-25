# Cycle 1 Aggregate Review — 2026-04-25

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review lanes completed

Completed and persisted per-agent reviews:

- `cycle1-code-reviewer.md`
- `cycle1-security-reviewer.md`
- `cycle1-critic.md`
- `cycle1-verifier.md`
- `cycle1-test-engineer.md`
- `cycle1-architect.md`
- `cycle1-debugger.md`
- `cycle1-designer.md`
- `cycle1-document-specialist.md` (writer-role substitute; requested `document-specialist` was not registered)
- `cycle1-perf-reviewer.md` (default-role substitute; requested `perf-reviewer` was not registered)
- `cycle1-tracer.md` (default-role substitute; requested `tracer` was not registered)
- `cycle1-non-tech-traveler-reviewer.md` (repo-specific reviewer from `.context/agents/non-tech-traveler-reviewer.md`)

## Agent failures / retries

- Initial fan-out hit the environment's maximum open-agent limit after two agents. The failed lanes were retried in later batches and completed.
- `document-specialist`, `perf-reviewer`, and `tracer` were requested but not registered as native `spawn_agent` roles in this environment, so equivalent registered/substitute lanes were used and their substitutions are recorded above.
- Some read-only agents returned `WRITE_FAILED`; the leader persisted their returned markdown verbatim/near-verbatim into the required per-agent files.

## Deduped findings

Severity/confidence preserves the highest level reported by any lane. “Agreement” lists lanes that independently flagged the same or overlapping issue.

### F01 — Worker parser is a manually duplicated fork of the main Google parser

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed maintainability/correctness risk
- **Files:** `src/lib/parser.ts:253-539`, `src/lib/parser.ts:557-641`, `public/workers/trackParser.worker.js:45-262`, `scripts/smoke-static.mjs:183-213`
- **Agreement:** code-reviewer, critic, test-engineer, architect, debugger
- **Failure scenario:** A Google format or bug fix lands in the TypeScript parser but not in the public worker; large JSON imports route through the stale worker and drop points or fail while small/fallback imports succeed.
- **Fix:** Add behavioral parity tests or generate/build the worker from shared parser logic.

### F02 — Production base path is hard-coded to `/travelback`

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed deployment correctness risk
- **Files:** `next.config.ts:3-10`, `src/lib/env.ts:1`, `src/types.ts:23-45`, `package.json:8`, `playwright.static.config.ts:17-18`, README deploy docs
- **Agreement:** code-reviewer, architect, debugger
- **Failure scenario:** Production build for a custom domain root or different subpath emits asset, worker, map-style, and route URLs under `/travelback`, breaking the app.
- **Fix:** Use one explicit validated base-path env/default and update static server/docs/tests.

### F03 — GPX/KML parsing remains synchronous DOM work on the main thread

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed client-side DoS/UI responsiveness risk
- **Files:** `src/lib/parser.ts:151-160`, `src/lib/parser.ts:166-218`, `src/lib/parser.ts:541-543`, `src/lib/parser.ts:678-698`
- **Agreement:** security-reviewer, perf-reviewer
- **Failure scenario:** A crafted 3–4 MB XML file with hostile structure freezes the tab during `DOMParser`/togeojson work.
- **Fix:** Move XML parsing to a worker or add stronger pre-DOM structure checks and responsiveness limits.

### F04 — JSON file-read and worker-crash paths lose structured `ParseError` codes

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed error-handling gap
- **Files:** `src/lib/parser.ts:625-637`, `src/lib/parser.ts:670-674`, `src/components/FileUpload.tsx:63-86`
- **Agreement:** code-reviewer, debugger
- **Failure scenario:** Browser/cloud file access or worker crash yields a generic parse message instead of the localized read/worker failure guidance.
- **Fix:** Wrap JSON `arrayBuffer()` and worker crash paths in stable `ParseError` codes.

### F05 — `semanticSegments[].timelinePath[].point` parsing drops URI variants

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed parser correctness bug
- **Files:** `src/lib/parser.ts` semantic-segment point parsing, `public/workers/trackParser.worker.js` mirrored logic
- **Agreement:** tracer
- **Failure scenario:** Google exports containing `GEO:`, `+` signed, or whitespace-padded `geo:` points silently drop valid locations before map/playback/export can run.
- **Fix:** Normalize and parse URI variants in both parser paths and add fixtures.

### F06 — Manual journey waypoints can store out-of-range longitudes

- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely/manual-validation
- **Files:** `src/components/JourneyCreator.tsx:300-308`, `src/components/JourneyCreator.tsx:338-345`, downstream `src/components/MapView.tsx:176-190`
- **Agreement:** critic
- **Failure scenario:** Wrapped-world map clicks/drags store `lng` outside `[-180,180]`, confusing bounds/camera/export assumptions.
- **Fix:** Normalize longitude and clamp latitude before storing manual waypoints.

### F07 — Scene overlap/range warnings are computed before normalization and can become stale

- **Severity:** Low-Medium
- **Confidence:** High
- **Status:** Confirmed UX/correctness confusion
- **Files:** `src/components/SceneEditor.tsx:254-278`
- **Agreement:** critic
- **Failure scenario:** UI warns about overlaps that `normalizeScenes()` has already corrected.
- **Fix:** Calculate warnings against the saved normalized scenes or present an explicit “auto-adjusted” status.

### F08 — Playback hotkeys mutate playback/follow state when no track is loaded

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed state-coupling issue
- **Files:** `src/lib/usePlaybackController.ts:202-220`
- **Agreement:** critic
- **Failure scenario:** Arrow and follow-camera keys change hidden state on the landing screen; later reset paths currently mask this coupling.
- **Fix:** Guard all playback-only hotkeys behind `track`.

### F09 — Map error overlay can remain after recoverable style/map errors

- **Severity:** Low-Medium
- **Confidence:** Medium
- **Status:** Likely
- **Files:** `src/components/MapView.tsx:636-648`, `src/components/MapView.tsx:675-692`
- **Agreement:** critic
- **Failure scenario:** A transient MapLibre error sets `mapError`; later style load succeeds but the blocking error overlay remains.
- **Fix:** Clear `mapError` on successful style/load/layer recovery.

### F10 — MapView and map overlays have unclear ownership boundaries

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed architecture risk
- **Files:** `src/components/MapView.tsx:26-34`, `571-781`; `src/components/JourneyCreator.tsx:20-253`; `src/lib/useExportController.ts:136-186`
- **Agreement:** architect, code-reviewer
- **Failure scenario:** Future overlay/style changes remove or duplicate layers because multiple components mutate the same MapLibre instance.
- **Fix:** Introduce a map-layer registry/controller boundary.

### F11 — App-shell/session state is highly coupled through `page.tsx` and broad prop contracts

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed architecture risk
- **Files:** `src/app/page.tsx:61-182`, `258-315`, `462-581`; `src/components/TrackWorkspace.tsx:13-50`
- **Agreement:** architect, code-reviewer
- **Failure scenario:** Multi-track/saved-project changes require touching many reset/export/scene paths with implicit invalidation rules.
- **Fix:** Extract a typed track-session reducer/controller.

### F12 — Large modules/specs concentrate too many responsibilities

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed maintainability risk
- **Files:** `src/components/MapView.tsx:410-985`, `src/components/SceneEditor.tsx:244-715`, `src/lib/i18n.ts:1-1849`, `e2e/travelback.spec.ts:216-1524`
- **Agreement:** code-reviewer, architect, test-engineer
- **Failure scenario:** Small feature changes have high blast radius and only broad E2E protection.
- **Fix:** Extract pure modules and split tests/translations by feature/locale boundaries.

### F13 — Export memory guard estimates encoded bytes, not total browser pressure

- **Severity:** High
- **Confidence:** Medium
- **Status:** Likely/manual-validation
- **Files:** `src/lib/videoEncoder.ts:7`, `32-34`, `70-96`; `src/lib/useExportController.ts:188-199`; `src/components/ExportPanel.tsx:100-110`
- **Agreement:** architect, debugger, perf-reviewer
- **Failure scenario:** Mobile/browser accepts a long 4K/1080p export under the encoded-size cap but crashes during mediabunny finalize/Blob/object URL creation.
- **Fix:** Use device-aware caps and include resolution/fps/duration/frame-work pressure in warnings/limits.

### F14 — Production framing protection relies on JS because GitHub Pages cannot serve `frame-ancestors`

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed residual security risk
- **Files:** `src/app/layout.tsx:53`, `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:9-14`
- **Agreement:** security-reviewer
- **Failure scenario:** Hostile embedding may attempt UI redress before script-based frame-buster executes.
- **Fix:** Serve via header-capable host/CDN or document accepted GitHub Pages residual risk.

### F15 — Production CSP allows inline styles

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed defense-in-depth gap
- **Files:** `src/app/layout.tsx:66`, `scripts/harden-static-export.mjs:22`
- **Agreement:** security-reviewer
- **Failure scenario:** Future HTML injection could use inline styling for phishing/UI redress even without script execution.
- **Fix:** Prefer class/CSS-variable styles and eventually tighten `style-src`.

### F16 — CSP/static hardening relies on brittle post-build Next HTML regex rewriting

- **Severity:** Low-Medium
- **Confidence:** High
- **Status:** Confirmed maintenance risk
- **Files:** `src/app/layout.tsx:53-67`, `scripts/harden-static-export.mjs:7`, `72-82`, `114-128`, `scripts/smoke-static.mjs:111-154`
- **Agreement:** architect, test-engineer
- **Failure scenario:** Next changes bootstrap serialization and hardening fails or becomes hard to diagnose.
- **Fix:** Add focused fixture tests for the rewriter and use a more stable bootstrap mechanism if available.

### F17 — No unit/component test layer protects parser/math/camera/export/hooks

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed test gap
- **Files:** `src/lib/*`, `src/components/*`, `e2e/travelback.spec.ts`
- **Agreement:** test-engineer
- **Failure scenario:** Pure edge cases require running the full browser suite and can regress silently between E2E flows.
- **Fix:** Add unit/component test tooling and focused tests.

### F18 — Real video encoding, abort, and download paths are only stubbed in E2E

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed test gap
- **Files:** `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `e2e/travelback.spec.ts`
- **Agreement:** test-engineer, non-tech-traveler-reviewer context
- **Failure scenario:** UI reaches success with mocked/stubbed export while real WebCodecs/mediabunny save path breaks on users' browsers.
- **Fix:** Add fuller export-path harness or explicit manual coverage.

### F19 — Fixed sleeps in Playwright tests create flake risk

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed test quality risk
- **Files:** `e2e/travelback.spec.ts`
- **Agreement:** test-engineer, perf-reviewer
- **Failure scenario:** Slow CI/mobile timing makes sleeps too short or masks readiness bugs.
- **Fix:** Replace sleeps with semantic waits/debug-state readiness checks.

### F20 — Playwright retries/single-worker execution hide flakes and concurrency issues

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed test harness risk
- **Files:** `playwright.config.ts`, `playwright.static.config.ts`, test scripts
- **Agreement:** test-engineer, perf-reviewer
- **Failure scenario:** Serial execution and retries make CI slow and hide order/concurrency problems.
- **Fix:** Add separate flake/concurrency lanes or reduce sleeps before enabling safe parallelism.

### F21 — Fixture coverage is thin for negative/parser-limit cases

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed test gap
- **Files:** `e2e/fixtures/*`, `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
- **Agreement:** test-engineer
- **Failure scenario:** Unsupported/malformed/limit files regress without targeted fixtures.
- **Fix:** Add fixtures for malformed JSON/XML, limit/depth cases, and each Google shape.

### F22 — Timeline trimming/scene/export reset behavior lacks direct boundary tests

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed test gap
- **Files:** `src/components/TimelineSelector.tsx`, `src/components/SceneEditor.tsx`, `src/lib/useExportController.ts`
- **Agreement:** test-engineer
- **Failure scenario:** Reset/session invalidation edge cases regress behind broad E2E flows.
- **Fix:** Add direct tests around trim/session/scene/export state transitions.

### F23 — Map geometry/antimeridian helpers lack unit-level assertions

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed test gap
- **Files:** `src/components/MapView.tsx`, `src/lib/interpolate.ts`, `src/lib/camera.ts`
- **Agreement:** test-engineer
- **Failure scenario:** Antimeridian and geometry simplification regress without precise assertions.
- **Fix:** Extract/test geometry helpers.

### F24 — Accessibility/i18n coverage is sampled, not systematic

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed test gap
- **Files:** `src/lib/i18n.ts`, `src/components/ModalDialog.tsx`, `e2e/travelback.spec.ts`
- **Agreement:** test-engineer, designer, non-tech-traveler-reviewer
- **Failure scenario:** New locale/modal flow misses aria/key parity or leaks English.
- **Fix:** Add key parity and modal interaction tests across locales.

### F25 — README scene preset count is wrong

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed docs mismatch
- **Files:** `README.md:52`; actual presets in `src/lib/camera.ts:208-332`
- **Agreement:** verifier, document-specialist
- **Failure scenario:** Users expect all presets to auto-generate 4–6 scenes; Simple/Bird’s Eye create 1 and Dynamic creates 8.
- **Fix:** Update README wording to describe actual preset shapes/counts.

### F26 — README E2E test count is stale

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed docs mismatch
- **Files:** `README.md:145`, `e2e/travelback.spec.ts`
- **Agreement:** verifier, document-specialist
- **Failure scenario:** Contributors underestimate suite size/coverage.
- **Fix:** Update README to say 74 Playwright tests or avoid exact count.

### F27 — README privacy guidance still mentions avoiding place search

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed docs mismatch
- **Files:** `README.md:211-216`
- **Agreement:** code-reviewer
- **Failure scenario:** Privacy-sensitive users infer a network-backed search remains.
- **Fix:** Replace with local-only coordinate/link guidance.

### F28 — `.context/development/01-conventions.md` overstates fully client-side component model

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed docs mismatch
- **Files:** `.context/development/01-conventions.md`; `src/app/layout.tsx`
- **Agreement:** document-specialist
- **Failure scenario:** Contributors may incorrectly add `'use client'` to server/layout files or misunderstand Next boundaries.
- **Fix:** Update the convention to distinguish App Router server layout from client components.

### F29 — Raw file input leaks into first-run UI/tab order

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed UI/accessibility issue
- **Files:** `src/components/FileUpload.tsx:250-256`
- **Agreement:** designer
- **Failure scenario:** Keyboard users encounter native English browser chrome in localized sessions and duplicate upload affordances.
- **Fix:** Visually hide the native input while preserving label/keyboard activation.

### F30 — Mobile “More controls” sheet lacks clear popup/dialog semantics

- **Severity:** Low-Medium
- **Confidence:** High
- **Status:** Confirmed accessibility issue
- **Files:** `src/components/TrackToolbar.tsx:145-170`, `172-257`
- **Agreement:** designer
- **Failure scenario:** Assistive tech users do not get clear expanded/popup relationship and context for the mobile controls sheet.
- **Fix:** Add `aria-haspopup`, `aria-controls`, `aria-expanded`, meaningful region/dialog labeling, and focus handling as needed.

### F31 — Landing upload copy is too vague for non-technical travelers

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed UX comprehension issue
- **Files:** `src/components/FileUpload.tsx`, visible upload copy
- **Agreement:** non-tech-traveler-reviewer
- **Failure scenario:** Casual users do not know which Google file or travel-log file to choose.
- **Fix:** Add explicit examples and direct “Google Timeline JSON / GPX / KML” guidance in plain language.

### F32 — Dropped-photo error lacks recovery guidance

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed UX error-state issue
- **Files:** `src/components/FileUpload.tsx` error mapping/copy
- **Agreement:** non-tech-traveler-reviewer
- **Failure scenario:** User drops a photo, sees a technically correct unsupported-format error, and does not know how to recover.
- **Fix:** Add accepted examples and next action to unsupported-format messaging.

### F33 — Export defaults to YouTube landscape instead of likely social portrait

- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Product/UX risk needing validation
- **Files:** `src/types.ts` export presets/defaults, `src/components/ExportPanel.tsx`
- **Agreement:** non-tech-traveler-reviewer
- **Failure scenario:** Instagram/TikTok users export landscape first, then need to redo.
- **Fix:** Consider a social-first default or clearer quick-choice copy.

### F34 — Export progress/estimate can make the app look stuck

- **Severity:** Medium
- **Confidence:** Medium
- **Status:** UX/perceived-performance risk
- **Files:** `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`
- **Agreement:** non-tech-traveler-reviewer, perf-reviewer
- **Failure scenario:** Real export stalls without clear “still working” reassurance or accurate remaining time.
- **Fix:** Improve progress copy, stages, and ETA caveats.

### F35 — Scene editor still feels too technical for casual travelers

- **Severity:** Low
- **Confidence:** High
- **Status:** UX complexity issue
- **Files:** `src/components/SceneEditor.tsx`, translations
- **Agreement:** non-tech-traveler-reviewer
- **Failure scenario:** Users are exposed to camera/editing terms rather than goal-oriented presets.
- **Fix:** Improve preset-oriented copy and hide advanced parameters behind disclosure.

### F36 — Korean export UI leaks technical/English wording

- **Severity:** Low
- **Confidence:** High
- **Status:** i18n copy issue
- **Files:** `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`
- **Agreement:** non-tech-traveler-reviewer, test-engineer (i18n coverage gap)
- **Failure scenario:** Korean users see awkward technical/English terms and lose confidence.
- **Fix:** Naturalize Korean export copy and add locale checks.

### F37 — Per-frame trail rendering rebuilds and sends a growing GeoJSON line

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed performance risk
- **Files:** `src/components/MapView.tsx`
- **Agreement:** perf-reviewer
- **Failure scenario:** Large tracks cause every animation frame/export frame to rebuild and set a growing line, hurting responsiveness/export speed.
- **Fix:** Cache/simplify geometry or update trail using a lighter representation.

### F38 — Real export drives React playback state every encoded frame

- **Severity:** High
- **Confidence:** High
- **Status:** Confirmed performance risk
- **Files:** `src/lib/useExportController.ts`, `src/components/MapView.tsx`
- **Agreement:** perf-reviewer
- **Failure scenario:** Export frame loop triggers expensive React/map update paths, slowing export and increasing jank.
- **Fix:** Drive export camera imperatively or isolate export state from UI playback state.

### F39 — Overview camera recomputes full-track bounds every frame

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed performance risk
- **Files:** `src/lib/camera.ts:53-95`, overview camera path
- **Agreement:** perf-reviewer
- **Failure scenario:** Overview scenes on large tracks scan all points per frame.
- **Fix:** Cache bounding box/overview camera per track.

### F40 — Follow-camera look-ahead uses a linear scan every frame

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed performance risk
- **Files:** `src/lib/interpolate.ts`, `src/lib/camera.ts`
- **Agreement:** perf-reviewer
- **Failure scenario:** Playback/export over large tracks repeatedly scans distance arrays.
- **Fix:** Use binary search or cursor caching for interpolation.

### F41 — Elevation profile renders one SVG path vertex per track point

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed performance risk
- **Files:** `src/components/ElevationProfile.tsx`
- **Agreement:** perf-reviewer
- **Failure scenario:** Very large tracks generate huge SVG paths and slow render/interaction.
- **Fix:** Downsample profile points to the rendered width.

### F42 — Timeline drag scans the full track to detect time data

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed performance risk
- **Files:** `src/components/TimelineSelector.tsx`
- **Agreement:** perf-reviewer
- **Failure scenario:** Dragging handles over huge tracks repeatedly performs full scans/calculations.
- **Fix:** Memoize/calculate once per track or derive from track metadata.

### F43 — JSON worker path still has high peak memory/clone cost

- **Severity:** Medium
- **Confidence:** Medium
- **Status:** Likely performance risk
- **Files:** `src/lib/parser.ts:557-641`, `public/workers/trackParser.worker.js`
- **Agreement:** perf-reviewer
- **Failure scenario:** Large JSON import still peaks high due text decode/object creation/structured clone of full track back to main thread.
- **Fix:** Consider transferable/chunked results or stricter size guidance.

### F44 — `preserveDrawingBuffer` is enabled for the interactive map at all times

- **Severity:** Medium
- **Confidence:** High
- **Status:** Confirmed GPU/performance risk
- **Files:** `src/components/MapView.tsx`
- **Agreement:** perf-reviewer
- **Failure scenario:** Interactive map pays persistent GPU/compositing cost even when not exporting.
- **Fix:** Enable only for export/capture path if feasible or document tradeoff.

### F45 — Glass/mesh effects add persistent GPU/compositing cost under WebGL map

- **Severity:** Low
- **Confidence:** Medium
- **Status:** Likely UI performance risk
- **Files:** `src/app/globals.css`, `src/styles/vitro-base.css`, app background layers
- **Agreement:** perf-reviewer
- **Failure scenario:** Lower-end devices render WebGL map plus glass/mesh effects with avoidable GPU cost.
- **Fix:** Disable/reduce effects under reduced motion/data/mobile or during export.

### F46 — Untracked manual Playwright helper is machine-specific and has import-time side effects

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed tooling hygiene issue
- **Files:** `.tmp-travelback-mina-manual.mjs:5-10`
- **Agreement:** code-reviewer
- **Failure scenario:** Another agent runs it outside this machine/session and gets misleading failures or temp-file residue.
- **Fix:** Move/document as manual helper or delete if obsolete; derive paths/env and use `mkdtemp` cleanup.

## Aggregate priority

1. Fix correctness/security/user-blocking issues: F01, F02, F03, F04, F05, F06, F08, F09, F25-F32.
2. Address high confidence performance/test risks: F13, F17-F20, F37-F44.
3. Plan larger architecture work: F10-F12.
4. Defer or document accepted residual risks where they require hosting/product decisions: F14, F15, F33-F36, F45-F46.
