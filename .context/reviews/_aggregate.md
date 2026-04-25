# Cycle 5 Aggregate Review — 2026-04-25

## Fan-out Coverage

Completed review lanes:
- `code-reviewer` → `.context/reviews/code-reviewer-cycle5.md`
- `security-reviewer` → `.context/reviews/security-reviewer-cycle5.md`
- `critic` → `.context/reviews/critic-cycle5.md`
- `verifier` → `.context/reviews/verifier-cycle5.md`
- `test-engineer` → `.context/reviews/test-engineer-cycle5.md`
- `architect` → `.context/reviews/architect-cycle5.md`
- `debugger` → `.context/reviews/debugger-cycle5.md`
- `designer` → `.context/reviews/designer-cycle5.md`
- `dependency-expert` as document specialist → `.context/reviews/document-specialist-cycle5.md`
- `default` as perf-reviewer → `.context/reviews/perf-reviewer-cycle5.md`
- `default` as tracer → `.context/reviews/tracer-cycle5.md`

Agent constraints:
- Environment enforced a hard thread cap, so the fan-out was completed in slot-cycled batches after the initial batch hit `agent thread limit reached`.
- `security-reviewer`, `architect`, and `code-reviewer` reported from read-only lanes. Their results were incorporated into their cycle-5 artifacts or already matched the existing artifact.

AGENT FAILURES: none unresolved.

## Merged Findings

### F5-01 — Playback and export hot paths rebuild too much per frame
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** critic, architect, perf-reviewer
- **Evidence:** `src/lib/usePlaybackController.ts:95-135`, `src/app/page.tsx:106-123`, `src/components/MapView.tsx:839-861`, `src/components/TrackWorkspace.tsx:52-170`, `src/lib/videoEncoder.ts:93-130`
- **Failure scenario:** Large tracks can trigger React churn, repeated GeoJSON allocation/upload, WebGL idle waits, and visible playback/export jank.
- **Fix:** Move high-frequency progress out of the full app shell, cache or incrementally render traveled geometry, and use an export-specific render path or narrower idle signal.

### F5-02 — Timeline drag performs full O(n) track commits during pointer movement
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** perf-reviewer
- **Evidence:** `src/components/TimelineSelector.tsx:182-226`, `src/app/page.tsx:231-257`, `src/components/MapView.tsx:770-830`
- **Failure scenario:** Dragging a 250k-point track can perform repeated full-array slices and map rebuilds, locking the UI.
- **Fix:** Separate live drag preview from committed track mutation; commit on pointer-up or debounce, and represent trim bounds as view state.

### F5-03 — GPX/KML imports parse large files on the main thread
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** security-reviewer, perf-reviewer, architect
- **Evidence:** `src/lib/parser.ts:152-212`, `src/lib/parser.ts:521-523`, `src/lib/parser.ts:626-674`
- **Failure scenario:** A crafted or legitimately large XML track can freeze the tab before recovery UI is available.
- **Fix:** Move XML parsing behind the worker boundary or lower XML limits until worker parsing exists.

### F5-04 — Worker/main-thread Google parser logic is duplicated
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** architect, code-reviewer, document-specialist
- **Evidence:** `src/lib/parser.ts:465-620`, `public/workers/trackParser.worker.js:1-322`
- **Failure scenario:** A Google export shape fix can land in one path but not the other, producing browser-dependent parsing.
- **Fix:** Extract a shared parser core and build the worker from that source with a typed message/error contract.

### F5-05 — Shipped map styles lack real geographic context
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** critic
- **Evidence:** `public/map-styles/voyager.json:4-28`, `scripts/fetch-map-styles.mjs:14-37`, `src/components/MapView.tsx:225-379`
- **Failure scenario:** Exported journeys render as lines over a plain background/grid, undercutting the product promise of recognizable travel maps.
- **Fix:** Ship real local basemap data/style, add an opt-in remote basemap mode, or narrow product positioning.

### F5-06 — Export lifecycle and encoded output are not exercised by tests
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** code-reviewer, test-engineer, verifier, tracer
- **Evidence:** `e2e/travelback.spec.ts:1139-1203`, `e2e/travelback.spec.ts:1292-1347`, `src/lib/useExportController.ts:91-181`, `src/lib/videoEncoder.ts:40-159`
- **Failure scenario:** Encoder, canvas capture, cleanup, save/share, or download fallback regressions pass CI because tests stop at the visible button.
- **Fix:** Add an export-path test that starts export and asserts done/download state, plus lower-layer controller/encoder tests or a bounded test seam.

### F5-07 — Exported videos omit the visible moving position marker
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** tracer
- **Evidence:** `src/components/MapView.tsx:746-767`, `src/components/MapView.tsx:849-853`, `src/lib/useExportController.ts:94-100`, `src/lib/videoEncoder.ts:80-85`
- **Failure scenario:** Playback shows a moving marker, but MP4 capture only records the WebGL canvas, so DOM marker overlays are missing.
- **Fix:** Render the moving marker as a MapLibre layer/source, or add an export-only point layer synchronized with playback.

### F5-08 — Controlled theme no longer follows OS changes after hydration
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** code-reviewer, debugger, architect
- **Evidence:** `src/app/page.tsx:63-84`, `src/app/page.tsx:344-358`, `src/components/ThemeToggle.tsx:36-55`
- **Failure scenario:** With no explicit override, a user leaves the app open through an OS theme change and the UI/map style stays stale.
- **Fix:** Own the `matchMedia` subscription in `page.tsx` or shared preference logic, gated on whether the user explicitly overrode theme/style.

### F5-09 — New tracks inherit previous playback/export settings
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** critic, debugger
- **Evidence:** `src/lib/usePlaybackController.ts:20-45`, `src/app/page.tsx:209-219`, `src/components/ExportPanel.tsx:70-117`
- **Failure scenario:** A new route starts with previous speed/duration/follow-camera/export choices, confusing session state.
- **Fix:** Reset session-scoped playback/export controls when loading a new track, while preserving intentional global preferences.

### F5-10 — Dev E2E harness hides overlays and relies on fixed sleeps
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** critic, test-engineer, perf-reviewer
- **Evidence:** `e2e/travelback.spec.ts:135-147`, `e2e/travelback.spec.ts:210-238`, fixed waits at `e2e/travelback.spec.ts:507`, `523`, `817`, `845`, `922`, `937`, `1299`, `1336`
- **Failure scenario:** Hydration/runtime overlay regressions are deleted from the DOM and timing issues become flaky retries instead of actionable failures.
- **Fix:** Fail on unexpected console/overlay errors and replace sleeps with state/readiness probes.

### F5-11 — No lower-layer test harness protects deterministic logic
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** test-engineer
- **Evidence:** `package.json:5-15`, `src/lib/interpolate.ts`, `src/lib/camera.ts`, `src/lib/parser.ts`, `src/lib/usePlaybackController.ts`, `src/lib/useExportController.ts`
- **Failure scenario:** Parser, interpolation, camera, playback, or export cleanup regressions rely on broad browser tests and can ship unobserved.
- **Fix:** Add a unit/component test lane for pure helpers and hooks before expanding browser coverage.

### F5-12 — Parser worker/fallback/error branches are under-tested
- **Severity:** HIGH
- **Confidence:** HIGH
- **Sources:** test-engineer
- **Evidence:** `src/lib/parser.ts:446-675`, `src/components/FileUpload.tsx:52-93`, `e2e/travelback.spec.ts:1215-1277`
- **Failure scenario:** Worker unavailable, worker creation failure, `READ_FAILED`, point caps, and size/depth guard regressions surface only in real browsers/files.
- **Fix:** Add tests with mocked `Worker`, `FileReader`, and `File` around parser branch behavior and UI error mapping.

### F5-13 — JSON worker enforces point cap after high-memory parsing
- **Severity:** HIGH
- **Confidence:** MEDIUM-HIGH
- **Sources:** perf-reviewer
- **Evidence:** `public/workers/trackParser.worker.js:207-241`, `public/workers/trackParser.worker.js:307-312`, `src/lib/parser.ts:465-519`
- **Failure scenario:** An under-100MB Google export with far more than 250k raw points materializes large strings/objects/sets before rejection.
- **Fix:** Enforce point budgets during extraction or switch large Google parsing to streaming/bounded parsing.

### F5-14 — Dependency tree contains vulnerable `postcss` versions
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** critic, security-reviewer
- **Evidence:** `package-lock.json:1645-1656`, `package-lock.json:5328-5334`, `package-lock.json:5376-5379`, `package-lock.json:5734-5755`
- **Failure scenario:** Build-time CSS processing remains exposed to known `postcss` advisories if untrusted CSS enters the toolchain.
- **Fix:** Upgrade consumers or add a tested `postcss >= 8.5.10` override.

### F5-15 — CSP hardening depends on post-build mutation
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** security-reviewer
- **Evidence:** `src/app/layout.tsx:8-10`, `src/app/layout.tsx:58-66`, `scripts/harden-static-export.mjs:103-115`, `scripts/smoke-static.mjs:100-140`
- **Failure scenario:** An alternate deploy path that skips `postbuild` can publish placeholder CSP with `'unsafe-inline'`.
- **Fix:** Fail closed if placeholder CSP remains or generate final CSP directly.

### F5-16 — Error boundary fallback removes the main landmark
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** verifier, debugger
- **Evidence:** `src/app/page.tsx:382-385`, `src/components/ErrorBoundary.tsx:37-72`
- **Failure scenario:** A fatal child error leaves assistive-tech users on a fallback page without a main region.
- **Fix:** Render fallback inside `<main>` or add `role="main"` and a labeled heading.

### F5-17 — `READ_FAILED` maps to the wrong user-facing message
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** code-reviewer, debugger
- **Evidence:** `src/components/FileUpload.tsx:63-72`, `src/lib/parser.ts:672`, `src/lib/i18n.ts:40`
- **Failure scenario:** A read failure is reported as parse failure, misdirecting users and support.
- **Fix:** Map `READ_FAILED` to `fileUpload.readFailed`.

### F5-18 — `waitForApp()` uses a weak/flaky readiness signal
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** verifier
- **Evidence:** `e2e/travelback.spec.ts:136-138`, flaky retry in static E2E
- **Failure scenario:** Tests retry or fail waiting for a heading even when the app root is ready.
- **Fix:** Wait on `main#app[data-travelback-app-root="true"]` or the map container first.

### F5-19 — Assertions are broad enough to pass against wrong controls
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** test-engineer
- **Evidence:** `e2e/travelback.spec.ts:310-311`, `406`, `416`, `698`, `1004`, `1169`, `1185`, `1219-1269`
- **Failure scenario:** Duplicate mobile/desktop controls or a new button can satisfy assertions while intended controls regress.
- **Fix:** Use scoped roles/test ids and panel-local locators.

### F5-20 — Timer/global-state UI behaviors lack direct tests
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** test-engineer
- **Evidence:** `src/components/ModalDialog.tsx:31-189`, `src/components/Toast.tsx:19-91`, `src/components/SceneEditor.tsx:244-333`, `src/components/TimelineSelector.tsx:76-148`
- **Failure scenario:** Modal inert/scroll cleanup, toast dismissal, scene undo, or timeline hint behavior regresses without focused failure.
- **Fix:** Add component tests with fake timers for those behaviors.

### F5-21 — Static worker-backed JSON import parity is only indirectly covered
- **Severity:** MEDIUM
- **Confidence:** MEDIUM
- **Sources:** test-engineer
- **Evidence:** `src/lib/parser.ts:536-620`, `playwright.static.config.ts:12-43`, `scripts/smoke-static.mjs:191-203`
- **Failure scenario:** `/travelback/workers/trackParser.worker.js` breaks in static deploy while small fixtures silently fall back.
- **Fix:** Add a static-mode worker request/instrumentation test with a fixture large enough to require worker path.

### F5-22 — Script branch behavior is under-tested
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** test-engineer
- **Evidence:** `scripts/serve-static.mjs:69-170`, `scripts/run-dev-e2e.mjs:5-58`, `scripts/run-static-e2e.mjs:5-58`, `scripts/smoke-static.mjs:70-203`
- **Failure scenario:** `400`, `403`, `405`, invalid-port, or port-fallback behavior regresses without focused failure.
- **Fix:** Add script-level tests around path resolution, headers, methods, and port fallback.

### F5-23 — Preference ownership is duplicated across bootstrap/page/widgets
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** architect
- **Evidence:** `src/app/layout.tsx:53-58`, `src/app/page.tsx:35-57`, `src/app/page.tsx:63-84`, `src/app/page.tsx:344-375`, `src/components/ThemeToggle.tsx:7-22`
- **Failure scenario:** First-render theme/style/locale behavior drifts across hand-maintained paths.
- **Fix:** Centralize preference resolution/persistence and generate bootstrap behavior from the same model.

### F5-24 — `HomeInner` remains a broad session orchestration hub
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** architect
- **Evidence:** `src/app/page.tsx:59-158`, `src/app/page.tsx:201-375`, `src/app/page.tsx:444-481`, `src/components/TrackWorkspace.tsx:13-50`
- **Failure scenario:** New workspace behavior requires touching page shell, forwarding component, and leaves, broadening regression risk.
- **Fix:** Introduce a `TrackSession`/workspace boundary with reducer/context closer to loaded-track UI.

### F5-25 — i18n payload and runtime logic are coupled in one large client module
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** architect, perf-reviewer
- **Evidence:** `src/lib/i18n.ts:11-1829`
- **Failure scenario:** Translation edits churn runtime logic and all locales load for every user as strings grow.
- **Fix:** Split locale payloads from provider/runtime code and move payloads to per-locale modules or JSON.

### F5-26 — Theme toggle first-frame accessible semantics are inverted in dark mode
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** critic
- **Evidence:** `src/components/ThemeToggle.tsx:27-30`, `src/components/ThemeToggle.tsx:65-78`
- **Failure scenario:** Screen reader users can hear “Switch to dark mode” while the app is already dark during the first hydrated frame.
- **Fix:** Derive accessible label from actual effective mode, deferring only visual icon if needed.

### F5-27 — JourneyCreator search validation is not bound to the combobox
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** designer
- **Evidence:** `src/components/JourneyCreator.tsx:645-689`
- **Failure scenario:** Screen reader users see no invalid state or described error on the field after failed search.
- **Fix:** Add `aria-invalid`, stable `aria-describedby`, and live error semantics.

### F5-28 — Mobile overflow menu does not restore focus to trigger
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** designer
- **Evidence:** `src/components/TrackToolbar.tsx:58-85`, `src/components/TrackToolbar.tsx:137-245`
- **Failure scenario:** Keyboard users lose focus context after dismissing the mobile menu.
- **Fix:** Store the trigger ref and restore focus on close; add menu popup semantics if retained.

### F5-29 — Unit switchers expose active state only visually
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** designer
- **Evidence:** `src/components/GlobalToolbar.tsx:27-47`, `src/components/TrackToolbar.tsx:197-218`
- **Failure scenario:** Screen reader users hear two generic buttons with no current unit state.
- **Fix:** Use radio-group semantics or `aria-pressed`/`aria-checked`.

### F5-30 — GoogleGuide tabs lack arrow-key navigation
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** designer
- **Evidence:** `src/components/GoogleGuide.tsx:289`
- **Failure scenario:** Tablist users must tab through each tab instead of using expected arrow-key navigation.
- **Fix:** Implement roving focus and Left/Right/Home/End tab navigation.

### F5-31 — FileUpload drop zone focus indicator remains weak
- **Severity:** LOW
- **Confidence:** MEDIUM
- **Sources:** designer
- **Evidence:** `src/components/FileUpload.tsx`
- **Failure scenario:** Keyboard users may not perceive when the drop zone is focused.
- **Fix:** Add an explicit visible focus style for the interactive drop zone.

### F5-32 — Overview doc overstates Google semantic visit support
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** document-specialist
- **Evidence:** `.context/project/01-overview.md:37-44`, `src/lib/parser.ts:329-369`
- **Failure scenario:** Structured `placeLocation` exports lose visit points despite docs implying support.
- **Fix:** Narrow docs to supported `latLng` string shape or extend parser/fixtures.

### F5-33 — Export UI advertises an envelope too large for in-memory `BufferTarget`
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Sources:** document-specialist
- **Evidence:** `src/types.ts:80-116`, `src/components/ExportPanel.tsx:87-117`, `src/lib/videoEncoder.ts:50-78`
- **Failure scenario:** Long high-bitrate/4K exports can exhaust memory before finalization.
- **Fix:** Reduce/qualify advertised limits or switch large exports to streaming/file-backed output.

### F5-34 — Worker comments claim constants “must match” without enforcement
- **Severity:** LOW
- **Confidence:** HIGH
- **Sources:** document-specialist
- **Evidence:** `public/workers/trackParser.worker.js:209`, `public/workers/trackParser.worker.js:213`
- **Failure scenario:** Parser/worker error codes or limits drift without type/build-time detection.
- **Fix:** Validate worker constants against TypeScript definitions or generate the worker from typed source.

## Cross-Agent Agreement

Highest-signal overlaps:
- Export lifecycle test gap: code-reviewer, test-engineer, verifier, tracer.
- Playback/export performance hot path: critic, architect, perf-reviewer.
- GPX/KML main-thread parsing: security-reviewer, perf-reviewer, architect.
- Theme/system preference drift: code-reviewer, debugger, architect.
- Error boundary landmark: verifier, debugger.
- `READ_FAILED` messaging: code-reviewer, debugger.
- Vulnerable `postcss`: critic, security-reviewer.

## Final Sweep

No review-relevant source, script, config, active context doc, or e2e file was intentionally skipped. Binary assets, generated output, screenshots, dependency directories, and historical archives were not treated as implementation surfaces except where referenced for provenance.
