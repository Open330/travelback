# Cycle 10 Verifier Review — 2026-07-17

Review target: `3d74754369d22ad1bb9e7970634e0f0163d5b777` on `codex/review-plan-fix-2026-07-16`.

## Verdict

The primary sample journey is operational at the exact revision on desktop and mobile, but three user-facing claims remain false: the landing page has no top-level heading, unnamed imported trips bypass the selected locale, and a fallback download is headed “Video saved!” even though the encoder explicitly reports that saving was not confirmed. Journey Creator's mobile Cancel target is also much narrower than the product's coarse-pointer convention. A suspected Scene Editor endpoint-clipping regression was rejected by live geometry.

## Independent inventory and evidence scope

- Enumerated the full 102-file product surface: all `src` app/component/lib/worker paths; the full Playwright specification and 18 import fixtures; public assets, bundled map styles, sample and generated worker; scripts; root manifests/configuration; workflow; README; and current project/development/traveler context.
- Traced landing/import → parser worker → track state → map/playback/trim/scenes → encoder → save/share, including all five locale dictionaries and responsive ownership.
- Exercised the exact-HEAD development app in an isolated copy at 1440×900 and iPhone 15 emulation (393×852) with agent-browser. The pass covered accessibility snapshots, tab focus, sample import, loaded map/timeline/elevation/playback, Camera/scene editing, desktop/mobile geometry, console/page errors, storage, and network state.
- Evidence images: `/tmp/cycle10-landing-desktop.png`, `/tmp/cycle10-workspace-desktop.png`, `/tmp/cycle10-scene-endpoints.png`, `/tmp/cycle10-mobile-loaded.png`, `/tmp/cycle10-localized-google.png`, and `/tmp/cycle10-mobile-journey.png`.

## Confirmed findings

### VR10-01 — The landing page has no level-one heading

- Severity: Medium
- Confidence: High
- Status: Confirmed live and source defect; reopened historical `DF-R2-007`
- Location: `src/components/FileUpload.tsx:194-205,259-261`
- Evidence: the live accessibility tree exposes the product heading as `heading "Travelback" level=2`; a DOM sweep found no `h1` anywhere on the landing page. The upload shell is already the page's main named group, so this is not a nested section that follows another visible heading.
- Failure scenario: a screen-reader user navigating by headings lands on level 2 with no page topic; outline/SEO consumers receive the same broken hierarchy.
- Root fix: render the primary product title as one `h1`, preserve its current visual treatment, and assert exactly one level-one heading on the landing route.

### VR10-02 — Unnamed imports ignore the selected language

- Severity: Medium
- Confidence: High
- Status: Confirmed deterministic source defect
- Locations: GPX fallback `src/lib/parser.ts:214-216`; KML fallback `src/lib/parser.ts:228-230`; Google JSON fallback `src/lib/googleJsonParser.ts:377-380`
- Evidence: the three parser paths inject literal English display names (`GPX Track`, `KML Track`, and `Google Location History`). Their APIs receive no locale and the dictionaries contain no import-fallback keys. Any Korean, Japanese, Chinese, or Spanish session therefore surfaces English as the trip title whenever the input lacks a usable name.
- Failure scenario: a Korean traveler imports an unnamed GPX/KML or a supported Google export and immediately sees an English title at the top of an otherwise Korean workspace and in downstream export naming.
- Root fix: keep parsers locale-neutral by returning missing-name metadata or a stable source-kind value, then resolve the displayed/exported fallback through i18n at the UI boundary. Cover each of the three sources separately.

### VR10-03 — An unconfirmed fallback download is titled “Video saved!”

- Severity: Medium
- Confidence: High
- Status: Confirmed source/state defect
- Locations: fallback contract `src/lib/videoEncoder.ts:296-303,336-360`; result mapping `src/lib/useExportController.ts:250-264`; heading selection `src/components/ExportPanel.tsx:302-310`
- Evidence: the anchor fallback deliberately returns `saved: false` because the browser may block or redirect the synthetic download. The controller maps that to `downloadMethod: 'fallback'`, but ExportPanel selects `export.success` (“Video saved!”) for every method other than `ready`. The paragraph `export.savedToDownloads` only claims that the download started; the false claim is specifically the heading.
- Failure scenario: on a browser without the file picker, or after user activation is lost during rendering, the browser blocks the anchor download yet Travelback announces that the video was saved.
- Root fix: model generated, download-started, and save-confirmed as separate completion states. Use a truthful fallback heading such as “Video ready — download started” and retain an explicit Download action for recovery.

### VR10-04 — Journey Creator's mobile Cancel target is only 21px wide

- Severity: Low
- Confidence: High
- Status: Confirmed live and source usability defect; not claimed as a WCAG 2.5.8 failure
- Location: `src/components/JourneyCreator.tsx:740-750`; coarse-pointer rule `src/styles/vitro-base.css:796-805`
- Evidence: at 393×852 with a coarse-pointer iPhone profile, Cancel measured 20.75×44.09px. The responsive base rule protects only minimum height, whereas adjacent journey-icon targets are 44×44. The target is isolated enough for WCAG's target-spacing exception, so this is about Travelback's own finger-target consistency rather than a fabricated standards violation.
- Failure scenario: a traveler using one thumb taps the narrow, visually subdued Cancel label and misses it while trying to exit a map-oriented task.
- Root fix: give the header action a minimum 44px width or equivalent horizontal padding while retaining visible focus, then assert both dimensions under a coarse-pointer mobile profile.

## Gate and claim verification

- Live exact-HEAD sample import reached the loaded workspace with status `Track loaded: Namsan Tower Walk`; map, timeline, elevation, playback, Camera, and scene controls were present.
- A live Korean Google Records import reached `트랙이 로드되었습니다: Google Location History`, directly corroborating the locale-fallback finding.
- Desktop 1440×900 and mobile 393×852 had no document horizontal overflow in the exercised sample flow. Landing tab targets showed visible focus; primary loaded mobile controls remained above the emulator's viewport bottom.
- No application page errors occurred. The console contained only development/HMR notices.
- Isolated exact-HEAD lint, Next type generation/TypeScript, generated-worker parity, 17 Vitest files/405 tests, production build, and static hardening all passed.
- A retries-off, one-worker Chromium slice passed 13/13 in 6.3 minutes against the isolated exact-HEAD server: landing/main, GPX, KML, five Google representations, local export, picker cancellation, and complete KML/Records journeys.

## Challenged candidates and final sweep

- **Rejected — Scene endpoint clipping:** at 1440×900 the scene track was x=42…310; the 0% and 100% handle centers were x=43 and x=309. Their symmetric ~15px visual overhang is intentional `overflow-visible`, not one-sided clipping or lost reachability.
- **Manual validation only — mobile safe area/dynamic browser chrome:** the iPhone emulator reported `env(safe-area-inset-bottom) = 0`, so it cannot prove behavior with a real nonzero home-indicator inset or collapsing Safari chrome. Relevant ownership is `src/app/page.tsx:579` and `src/components/TrackWorkspace.tsx:142-155`; this is not promoted to a failure.
- The final sweep challenged unsupported-file recovery, all import families, locale fallbacks, heading order, responsive containment, touch target viewport intersection, reduced motion, focus continuity, save-state truth, generated-worker parity, cancellation, stale state, and static-base-path ownership. Only the narrow Journey Creator exit target joined the three Medium findings above.

## Review-resource inventory

- Exact-HEAD app copy and live server: `/tmp/travelback-cycle10-review-zXT6qY`, `http://localhost:4177`, listener PID 41643 (launcher 41617; build worker 42406), unified command session 94145.
- Exact-HEAD verification copy: `/tmp/travelback-cycle10-verify-0ihDrO`; lint/type/unit/build/E2E commands have exited.
- Failed non-mutating server attempt retained for cleanup: `/tmp/travelback-cycle10-review-0p2TE2`; its server command exited after rejecting the out-of-root dependency symlink.
- Browser sessions left open: `cycle10-experience`, `cycle10-experience-2`, `cycle10-mobile`, and `cycle10-localization`.
- Visual/debug files left in `/tmp`: the six PNGs listed above and `/tmp/cycle10-sample-trace.json` (about 130 MB).
- No process, session, temporary path, or artifact was stopped or deleted during this review.
