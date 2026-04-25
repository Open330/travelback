# Cycle 6 Aggregate Review — 2026-04-25

Source reviews:
- `cycle6-code-reviewer-2026-04-25.md`
- `cycle6-security-reviewer-2026-04-25.md`
- `cycle6-critic-2026-04-25.md`
- `cycle6-verifier-2026-04-25.md`
- `cycle6-test-engineer-2026-04-25.md`
- `cycle6-architect-2026-04-25.md`
- `cycle6-debugger-2026-04-25.md`
- `cycle6-designer-2026-04-25.md`

Requested but unavailable as registered native agent types in this environment: `perf-reviewer`, `tracer`, `document-specialist`. Their specialist concerns were partly covered by `critic`, `verifier`, `architect`, `debugger`, `security-reviewer`, and `test-engineer`.

Agent failure/provenance note: the `architect` retry returned a complete report but did not write its target file because its active role contract was read-only. The coordinator transcribed the returned report into `cycle6-architect-2026-04-25.md`.

## Merged Findings

### F6-01 — Export completion state can survive track mutations and show a stale video
- Severity/confidence: High / High
- Status: Confirmed
- Cross-agent agreement: code-reviewer
- Citations: `src/app/page.tsx:256-311`, `src/lib/useExportController.ts:56-62`, `src/lib/useExportController.ts:94-99`, `src/components/ExportPanel.tsx:222-279`
- Problem: `handleRangeChange()` changes the active track and can clear scenes, but it does not invalidate the completed export state held by `useExportController`.
- Failure scenario: export the full trip, close the export panel, trim the timeline, then reopen export. The panel can still show the old pre-trim video preview/download while the active track is now different.
- Suggested fix: reset export state whenever material export inputs change, at minimum on track trim/load/reset and preferably on scene/transition changes.

### F6-02 — Export duration UI can display 300 seconds while actual export clamps to 180 seconds
- Severity/confidence: High / High
- Status: Confirmed
- Cross-agent agreement: critic
- Citations: `src/components/Controls.tsx:23-24`, `src/components/Controls.tsx:114-128`, `src/types.ts:80-84`, `src/components/ExportPanel.tsx:81-105`, `src/components/ExportPanel.tsx:153-157`, `src/components/ExportPanel.tsx:321-334`
- Problem: playback offers a 300-second duration, export copies that value into panel state, but export requests clamp to `EXPORT_LIMITS.duration.max` of 180 seconds.
- Failure scenario: a user selects a 5-minute playback duration, sees `300` in the export duration field, and receives a 3-minute export without an obvious explanation.
- Suggested fix: align playback/export duration limits or visibly clamp/surface the cap before export starts.

### F6-03 — Scene preview clear signal is ignored
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: debugger
- Citations: `src/components/SceneEditor.tsx:366-368`, `src/app/page.tsx:384-389`, `e2e/travelback.spec.ts:956-1065`
- Problem: `SceneEditor` calls `onPreviewScene(null)` when preview should end, but `handlePreviewScene` returns early on `null` and never restores the live playback camera.
- Failure scenario: adjust a scene camera parameter, release the control, and the map remains stuck on the preview camera instead of returning to the current playback state.
- Suggested fix: treat `null` as a restore-to-current-camera signal and add regression coverage.

### F6-04 — GPX/KML XML imports still parse untrusted XML on the main thread
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: security-reviewer, verifier
- Citations: `src/lib/parser.ts:152-212`, `src/lib/parser.ts:521-523`, `src/lib/parser.ts:624-679`, `src/components/FileUpload.tsx:52-60`
- Problem: JSON imports are worker-isolated, but GPX/KML still use `FileReader.readAsText()` plus `DOMParser` and traversal on the UI thread.
- Failure scenario: a crafted or dense XML file within the current limit can freeze the tab before the user can cancel or recover.
- Suggested fix: move XML parsing behind a worker or lower the XML limit to a size safely parseable on the UI thread.

### F6-05 — Large Google JSON can exceed memory before point-cap rejection
- Severity/confidence: Medium / Medium-High
- Status: Likely
- Cross-agent agreement: security-reviewer, verifier
- Citations: `src/lib/parser.ts:465-469`, `src/lib/parser.ts:512-518`, `public/workers/trackParser.worker.js:207-241`, `public/workers/trackParser.worker.js:304-312`
- Problem: worker and fallback paths decode and `JSON.parse` the full payload before enforcing the 250k-point cap.
- Failure scenario: a dense 90-100 MB export can allocate a large string and object graph, then only reject after the browser or worker has already been put under heavy memory pressure.
- Suggested fix: enforce a running point budget during extraction, and consider streaming or chunked parsing before raising size limits.

### F6-06 — Timeline dragging commits O(n) filtered tracks during pointer movement
- Severity/confidence: High / High
- Status: Likely
- Cross-agent agreement: verifier, critic
- Citations: `src/components/TimelineSelector.tsx:201-245`, `src/app/page.tsx:286-312`, `src/components/MapView.tsx:894-900`
- Problem: every drag rAF can slice `fullTrack.points`, rebuild segment indices, reset playback, and force map geometry refreshes.
- Failure scenario: dragging trim handles on a long track hitches or locks the UI because track mutation and map updates scale with full-track size.
- Suggested fix: separate live trim preview from committed trim state, committing the track only on pointer-up or a debounce boundary.

### F6-07 — Playback/export render work scales with full track length per frame
- Severity/confidence: High / High
- Status: Likely
- Cross-agent agreement: critic, verifier
- Citations: `src/lib/parser.ts:4`, `src/lib/parser.ts:644-645`, `src/components/MapView.tsx:109-170`, `src/components/MapView.tsx:894-900`, `src/lib/useExportController.ts:173-186`, `src/lib/videoEncoder.ts:93-133`
- Problem: the accepted 250k-point ceiling is much higher than what the frame loop can cheaply rebuild as GeoJSON.
- Failure scenario: a legal large import can become impractical to preview or export because every progress tick rebuilds large trail geometry.
- Suggested fix: decimate render geometry, maintain incremental trail state, or add a separate visualization cap lower than the parser acceptance cap.

### F6-08 — Page-level playback state rerenders too much per animation tick
- Severity/confidence: Medium / High
- Status: Likely
- Cross-agent agreement: verifier
- Citations: `src/app/page.tsx:129-182`, `src/components/TrackWorkspace.tsx:122-166`, `src/lib/usePlaybackController.ts:17-154`
- Problem: high-frequency playback progress lives in the app shell and flows through broad workspace props.
- Failure scenario: normal playback and export progress updates rerender toolbar/workspace surfaces that do not need every frame, compounding map trail costs.
- Suggested fix: localize progress updates to the map and controls, or use a narrower store/context for high-frequency state.

### F6-09 — `npm run test:e2e` fails when another Next dev server is already running
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: code-reviewer
- Citations: `package.json:12-13`, `scripts/run-dev-e2e.mjs:34-45`, `playwright.config.ts:44-48`, `.context/project/01-overview.md:24-27`
- Problem: `run-dev-e2e.mjs` reserves a free Playwright port, but Playwright starts another `next dev` with `reuseExistingServer: false`; Next 16 rejects concurrent dev servers in the same workspace.
- Failure scenario: a developer runs `npm run dev` and then `npm run test:e2e`; the documented gate aborts before specs run.
- Suggested fix: make the dev E2E path stop/reuse existing servers or run against an isolated static/production server.

### F6-10 — Static CI runs the same smoke gate twice
- Severity/confidence: Low / High
- Status: Confirmed
- Cross-agent agreement: code-reviewer
- Citations: `.github/workflows/deploy-pages.yml:31-33`, `package.json:14-16`
- Problem: CI runs `npm run smoke:static`, then `npm run test:e2e:static:ci`, which itself starts with `npm run smoke:static`.
- Failure scenario: Pages builds pay duplicate time/log/failure surface for the same smoke gate.
- Suggested fix: remove the standalone workflow step or split the composite static E2E script.

### F6-11 — Journey Creator copy promises generic map-link support but only coordinate-bearing links work
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: critic
- Citations: `src/lib/i18n.ts:250-257`, `src/lib/i18n.ts:598-605`, `src/lib/i18n.ts:946-953`, `src/lib/i18n.ts:1294-1301`, `src/lib/i18n.ts:1642-1649`, `src/components/JourneyCreator.tsx:96-131`, `src/components/JourneyCreator.tsx:469-489`
- Problem: UI text says "coordinates or map link", while the parser only accepts links containing literal coordinates.
- Failure scenario: a user pastes a common place/share URL without embedded coordinates and sees a validation error despite the UI implying support.
- Suggested fix: narrow the copy to "coordinates or coordinate links", or add supported provider-specific decoders.

### F6-12 — Journey Creator combobox/listbox semantics use tabbable option buttons
- Severity/confidence: High / High
- Status: Confirmed
- Cross-agent agreement: designer
- Citations: `src/components/JourneyCreator.tsx:645-655`, `src/components/JourneyCreator.tsx:693-703`
- Problem: the input uses combobox semantics and `aria-activedescendant`, but options are rendered as tabbable `<button role="option">` controls.
- Failure scenario: keyboard focus can move into the popup options, making the widget behave like both a combobox and a button list.
- Suggested fix: keep focus on the input, render options as non-tabbable `role="option"` elements, and use active-descendant selection.

### F6-13 — Elevation profile is interactive but exposed as a static image
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: designer
- Citations: `src/components/ElevationProfile.tsx:64-85`, `src/components/ElevationProfile.tsx:96-105`
- Problem: the elevation chart is clickable and keyboard-seekable but is announced with `role="img"` and no value semantics.
- Failure scenario: keyboard and screen-reader users can operate it without receiving current value/range context.
- Suggested fix: expose slider semantics or synchronize it with a range input carrying `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.

### F6-14 — Mobile track toolbar popup advertises dialog semantics without implementing a dialog
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: designer, critic
- Citations: `src/components/TrackToolbar.tsx:145-153`, `src/components/TrackToolbar.tsx:160-168`
- Problem: the trigger uses `aria-haspopup="dialog"` while the popup is `role="group"` with no dialog semantics or focus trap.
- Failure scenario: assistive tech announces the wrong popup pattern and keyboard expectations do not match the DOM.
- Suggested fix: convert the flyout to a matching dialog/menu pattern or remove the misleading dialog claim.

### F6-15 — Scene deletion and scene-range correction feedback are visual only
- Severity/confidence: Medium / High
- Status: Confirmed
- Cross-agent agreement: designer
- Citations: `src/components/SceneEditor.tsx:252-278`, `src/components/SceneEditor.tsx:481-487`, `src/components/SceneEditor.tsx:656-666`
- Problem: normalization warnings and delete/undo feedback are rendered visually without live-region announcement.
- Failure scenario: screen-reader users miss destructive edits, automatic range corrections, and the available undo action.
- Suggested fix: add a status/live region for delete, undo, and normalization messages, and consider moving focus to undo after destructive deletion.

### F6-16 — Real export and cancellation paths lack automated coverage
- Severity/confidence: Medium-High / High
- Status: Confirmed test gap
- Cross-agent agreement: test-engineer
- Citations: `e2e/travelback.spec.ts:1194-1204`, `src/lib/useExportController.ts:20-29`, `src/lib/useExportController.ts:101-244`, `src/lib/videoEncoder.ts:40-159`, `src/components/MapView.tsx:515-568`
- Problem: the successful export test uses the local stub; real encoder, cancellation, map idle timeout, and download fallback paths are not automated.
- Failure scenario: an export abort/finalize/download regression ships because CI never exercises the real sequencing.
- Suggested fix: add at least one cancellation/cleanup integration test and a map-idle timeout path test, even if codec encoding stays stubbed.

### F6-17 — Parser/worker negative paths lack direct coverage
- Severity/confidence: Medium-High / High
- Status: Confirmed test gap
- Cross-agent agreement: test-engineer
- Citations: `src/lib/parser.ts:446-679`, `public/workers/trackParser.worker.js:206-321`, `e2e/travelback.spec.ts:1277-1290`, `scripts/smoke-static.mjs:172-190`
- Problem: complex parser/worker error-code and fallback branches are covered mostly by happy-path imports plus one unsupported file case.
- Failure scenario: worker/main-thread error codes drift or fallback behavior regresses without failing automation.
- Suggested fix: add direct tests for invalid JSON, JSON depth, unsupported Google format, file-size/point-count limits, worker creation failure, and worker crash fallback.

### F6-18 — Repo lacks a low-level unit/integration test layer
- Severity/confidence: High / High
- Status: Confirmed test architecture gap
- Cross-agent agreement: test-engineer
- Citations: `package.json:5-18`, `.github/workflows/deploy-pages.yml:27-33`, `src/lib/parser.ts:43-679`, `public/workers/trackParser.worker.js:1-321`, `src/lib/interpolate.ts:3-185`, `src/lib/camera.ts:19-428`, `src/lib/videoEncoder.ts:40-225`
- Problem: high-risk deterministic logic is protected mainly by Playwright and static smoke.
- Failure scenario: parser/camera/interpolation/export regressions ship if they are not surfaced through browser-level flows.
- Suggested fix: add a fast lower-layer test harness before broad parser/camera/playback/export refactors.

### F6-19 — Playwright suite still has fixed sleeps and copy-coupled assertions
- Severity/confidence: High / High for fixed sleeps; Medium / High for copy-coupling
- Status: Confirmed test reliability gap
- Cross-agent agreement: test-engineer
- Citations: `e2e/travelback.spec.ts:64-85`, `e2e/travelback.spec.ts:490`, `e2e/travelback.spec.ts:506`, `e2e/travelback.spec.ts:800`, `e2e/travelback.spec.ts:828`, `e2e/travelback.spec.ts:905`, `e2e/travelback.spec.ts:917`, `e2e/travelback.spec.ts:1302`, `e2e/travelback.spec.ts:1339`
- Problem: fixed sleeps and broad exact-copy selectors make the suite slow and flaky under CI variance or copy updates.
- Failure scenario: tests fail or slow down for timing/copy reasons unrelated to app behavior.
- Suggested fix: replace sleeps with state-based waits and prefer stable test IDs/roles for behavior checks, preserving only explicit localization smoke tests.

### F6-20 — Dev-server E2E path is not protected in CI
- Severity/confidence: Medium / High
- Status: Likely test gap
- Cross-agent agreement: test-engineer
- Citations: `package.json:12-15`, `.github/workflows/deploy-pages.yml:31-33`, `playwright.config.ts:44-49`, `playwright.static.config.ts:44-49`
- Problem: CI exercises static E2E but not the dev-server E2E path.
- Failure scenario: dev-only hydration/bootstrap regressions break local development while CI stays green.
- Suggested fix: add a small dev smoke shard or run dev E2E on a scheduled workflow.

### F6-21 — Startup preference/bootstrap state is duplicated across bootstrap, page, i18n, and map-style types
- Severity/confidence: High / High
- Status: Confirmed architecture risk
- Cross-agent agreement: architect
- Citations: `src/app/layout.tsx:53-66`, `src/app/page.tsx:61-99`, `src/app/page.tsx:210-229`, `src/lib/i18n.ts:1786-1813`, `src/types.ts:21-45`
- Problem: accepted themes, map styles, and locales are hardcoded across multiple initialization/persistence surfaces.
- Failure scenario: adding a locale or map style misses one surface and creates first-paint mismatch or broken persisted state.
- Suggested fix: centralize preference constants and derive bootstrap/client validation from the same source.

### F6-22 — Export rendering is architecturally coupled to the live interactive map
- Severity/confidence: High / Medium-High
- Status: Confirmed architecture risk
- Cross-agent agreement: architect
- Citations: `src/lib/useExportController.ts:105-186`, `src/components/MapView.tsx:472-569`, `src/components/MapView.tsx:902-977`
- Problem: export resizes and drives the same map instance used for live interaction.
- Failure scenario: map UI refactors break export, or export-specific hacks leak into normal playback behavior.
- Suggested fix: split export into a dedicated render pipeline or isolate export-only map state.

### F6-23 — Map overlay ownership is split across raw IDs and component-local listeners
- Severity/confidence: Medium / Medium
- Status: Likely architecture risk
- Cross-agent agreement: architect, test-engineer
- Citations: `src/components/MapView.tsx:699-860`, `src/components/JourneyCreator.tsx:193-252`, `src/components/JourneyCreator.tsx:279-452`
- Problem: route/trail/current marker and journey overlays are owned by separate components with direct MapLibre source/layer/listener management.
- Failure scenario: future overlay modes or active editing across style reloads can orphan layers or duplicate listeners.
- Suggested fix: introduce a small overlay manager or shared lifecycle helper before adding more overlay modes.

### F6-24 — E2E verification is bottlenecked into one serial mega-spec
- Severity/confidence: Medium / High
- Status: Confirmed architecture/test risk
- Cross-agent agreement: architect, test-engineer
- Citations: `playwright.config.ts:13-15`, `e2e/travelback.spec.ts:1-214`, `e2e/travelback.spec.ts:214-1351`
- Problem: one serial file owns the entire app suite.
- Failure scenario: one slow or flaky setup drags the whole suite and makes ownership/regression localization harder.
- Suggested fix: split tests by workflow boundary before adding substantial coverage.

### F6-25 — Public Pages deployment cannot enforce response-header anti-framing
- Severity/confidence: Low / High
- Status: Hardening risk
- Cross-agent agreement: security-reviewer
- Citations: `src/app/layout.tsx:53-66`, `scripts/harden-static-export.mjs:9-29`, `.github/workflows/deploy-pages.yml:34-46`, `scripts/serve-static.mjs:151-157`
- Problem: GitHub Pages cannot add `frame-ancestors` or `X-Frame-Options` headers, so the public site depends on JS frame-busting.
- Failure scenario: if bootstrap frame-busting regresses, Pages has weaker clickjacking resistance than local preview.
- Suggested fix: front the site with a header-capable CDN or keep the current limitation documented and guarded.

### F6-26 — Hardened CSP still allows inline styles
- Severity/confidence: Low / High
- Status: Hardening risk
- Cross-agent agreement: security-reviewer
- Citations: `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:15-29`
- Problem: `style-src 'self' 'unsafe-inline'` weakens CSP containment if future CSS/DOM injection appears.
- Failure scenario: a future injection sink has less CSP containment because inline styles remain allowed.
- Suggested fix: continue moving inline style usage to static styles, then remove `'unsafe-inline'`.

### F6-27 — Live map may render two current-position markers at once
- Severity/confidence: Low / Medium
- Status: Likely
- Cross-agent agreement: code-reviewer
- Citations: `src/components/MapView.tsx:761-780`, `src/components/MapView.tsx:783-805`, `src/components/MapView.tsx:889-892`
- Problem: both a DOM `maplibregl.Marker` and a canvas `POSITION_MARKER_LAYER` are updated every tick.
- Failure scenario: the marker appears heavier or jitters because two pipelines render the same point.
- Suggested fix: choose one live marker path or hide the export-captured layer during normal preview.

### F6-28 — Production debug bridge can be exposed by query string or localStorage
- Severity/confidence: Low / High
- Status: Manual-validation risk
- Cross-agent agreement: code-reviewer
- Citations: `src/components/MapView.tsx:595-633`
- Problem: `window.__travelbackDebug` can be exposed in production via `?__travelbackDebug=1` or `localStorage['travelback-debug']='1'`.
- Failure scenario: production users can introspect camera/map state. No direct exploit was found, but this is a production-only debug surface.
- Suggested fix: decide whether the threat model permits this; otherwise restrict the bridge to development/test builds.

### F6-29 — RTL is not wired into the layout system
- Severity/confidence: Low / High
- Status: Manual-validation risk
- Cross-agent agreement: designer
- Citations: `src/lib/i18n.ts:1758`, `src/app/layout.tsx:56`, `src/components/TrackToolbar.tsx:96-168`
- Problem: current supported locales are LTR, but layout has many hard-coded left/right positions.
- Failure scenario: adding an RTL locale later will require a dedicated mirroring pass.
- Suggested fix: defer until an RTL locale is planned; then add direction metadata and logical positioning.

### F6-30 — Dark-mode glass contrast still needs real-device validation
- Severity/confidence: Low / Medium
- Status: Manual-validation risk
- Cross-agent agreement: designer
- Citations: `src/styles/vitro-base.css:456`, `src/app/globals.css:147`
- Problem: no confirmed contrast failure, but translucent glass surfaces and small helper text are high-risk on real hardware.
- Failure scenario: lower-quality displays or backgrounds drop perceived contrast below WCAG expectations.
- Suggested fix: validate with real-device contrast/a11y checks before release.
