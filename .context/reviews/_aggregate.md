# Aggregate Deep Review — Cycle 1

Date: 2026-07-23
Reviewed revision: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`
Deployment: prohibited and not attempted

## Result

The reviewer fan-out produced **36 deduplicated findings**:

- 1 Critical
- 9 High
- 20 Medium
- 6 Low

All findings below are either confirmed or explicitly marked as requiring
measurement. Duplicate reports preserve the highest severity and confidence
assigned by any reviewer. Cross-agent agreement is called out because it
raises confidence in the shared root.

Fresh validation performed during review:

- lint: passed
- typecheck: passed
- unit/component tests: 21 files, 472 tests passed
- generated worker parity: passed
- development Chromium E2E: 110 passed, 1 explicitly gated real-MP4 test
  skipped, 0 failed
- production dependency audit: failed with 2 high findings

## Review provenance

Current reports:

- `code-reviewer.md`
- `architect.md`
- `perf-reviewer.md`
- `security-reviewer.md`
- `critic.md`
- `verifier.md`
- `test-engineer.md`
- `tracer.md`
- `debugger.md`
- `document-specialist.md`
- `designer.md`
- `non-tech-traveler-reviewer.md`

The initial nested performance scan was interrupted before handoff. Its
required one retry completed successfully, validated the parent report, and
added PERF-05/PERF-06. There are no unresolved reviewer failures.

## Deduplicated findings

### AGG-01 — Interrupted E2E wrappers can orphan their owned process trees

Severity: **High**
Confidence: **High**
Status: **Confirmed lifecycle defect; activation requires interruption**
Agreement: code-reviewer, architect, critic, test-engineer, tracer, debugger

Evidence: `scripts/run-dev-e2e.mjs:60-76`,
`scripts/run-static-e2e.mjs:44-60`, `playwright.config.ts:44-49`, and
`playwright.static.config.ts:50-55`. Both wrappers handle only child exit.
They do not handle wrapper `SIGINT`/`SIGTERM`/`SIGHUP`, forward termination,
wait for Playwright cleanup, or escalate only exact owned descendants.

Failure scenario: a cycle controller terminates the wrapper PID and leaves
Playwright, Next/static server, Chromium, ffmpeg, and worker descendants alive.
Later cycles inherit ports, `.next/dev/lock`, profiles, CPU/GPU load, and
misleading failures.

Fix: share one lifecycle-owning runner; continuously inventory exact owned
descendants, relay signals, wait a bounded grace period, escalate only exact
survivors, preserve unrelated/pre-existing processes, and test it with a fake
child/grandchild tree.

### AGG-02 — Failed TTY E2E runs can wait indefinitely in the HTML reporter

Severity: **Medium**
Confidence: **High**
Status: **Confirmed for installed Playwright behavior; TTY-dependent**
Agreement: tracer, test-engineer (related diagnostics concern)

Evidence: both Playwright configs use `reporter: 'html'` without
`open: 'never'`, while the wrappers inherit the terminal. Playwright 1.61.1
can open and await the report server after a failed interactive run.

Failure scenario: a failed review gate never returns its nonzero result; an
external timeout then activates AGG-01.

Fix: configure the HTML reporter with `open: 'never'` for automated entry
points and test a failing pseudo-TTY run.

### AGG-03 — Retries can hide E2E flakes and CI retains no diagnostics

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**
Agreement: test-engineer

Evidence: `playwright.config.ts:14-21` and
`playwright.static.config.ts:20-27` unconditionally retry once and create
trace/screenshot/video/report artifacts; the Pages workflow uploads none of
those artifacts.

Failure scenario: a first-attempt failure passes on retry, deployment proceeds,
and the only evidence disappears with the runner.

Fix: make authoritative gates retries-free and upload Playwright reports and
test results on success or failure with short retention.

### AGG-04 — Pages build omits the full unit/component suite

Severity: **High**
Confidence: **High**
Status: **Confirmed**
Agreement: test-engineer

Evidence: `.github/workflows/deploy-pages.yml:26-35` runs lint, typecheck,
audit, build, and static E2E but never `npm test`, which currently owns 472
tests.

Failure scenario: parser, camera, worker, export, or component regressions fail
Vitest while the smaller browser matrix passes, and the artifact proceeds.

Fix: add a separately named `npm test` step before artifact creation.

### AGG-05 — Required CI never exercises a real mediabunny/WebCodecs MP4

Severity: **High**
Confidence: **High**
Status: **Confirmed coverage gap**
Agreement: test-engineer, non-tech-traveler-reviewer

Evidence: `e2e/travelback.spec.ts:2955-3017` skips the real MP4 test unless
`TRAVELBACK_REAL_EXPORT=1`; normal export journeys use the small localhost
stub, and the Pages workflow does not set the variable.

Failure scenario: a mediabunny upgrade, CSP chunk issue, WebGL capture defect,
or invalid MP4 finalization ships while all required tests are green.

Fix: add one required, isolated, lowest-cost H.264 static real-export gate on
Chromium, with exact process cleanup and retained failure artifacts.

### AGG-06 — Production audit reports vulnerable Next and Sharp versions

Severity: **High**
Confidence: **High**
Status: **Confirmed by live audit; current static runtime exploitability low**
Agreement: security-reviewer

Evidence: `package-lock.json` installs `next@16.2.10` and `sharp@0.34.5`;
`npm audit --omit=dev --json` reports two high findings with fixes available.
The current static export avoids the listed server-side Next paths, but the
configured audit gate is red and Sharp remains a build/install dependency.

Failure scenario: every Pages build is blocked; a later server feature could
also make an advisory path reachable.

Fix: upgrade Next, `eslint-config-next`, and Sharp to patched compatible stable
versions, retain the audit gate, and rerun the complete matrix.

### AGG-07 — Build job receives deployment authority and actions use mutable tags

Severity: **Medium**
Confidence: **High**
Status: **Confirmed configuration weakness**
Agreement: security-reviewer

Evidence: workflow-scoped `pages: write` and `id-token: write` reach the build
job, which executes dependencies and repository scripts. External actions use
mutable major tags.

Failure scenario: compromised build code or an action has unnecessary Pages
and OIDC authority.

Fix: grant build only `contents: read`, grant Pages/OIDC only to deploy, and
pin external actions to immutable commit SHAs with version comments.

### AGG-08 — Preview server follows out-of-tree symlinks and binds beyond loopback

Severity: **Low**
Confidence: **High**
Status: **Confirmed local-preview path**
Agreement: security-reviewer

Evidence: `scripts/serve-static.mjs:16-18,97-115,164-178` performs lexical
containment, uses symlink-following `stat`/streaming, and omits an explicit
listen host.

Failure scenario: a tampered `out/` symlink exposes a readable local file to a
machine that can reach the preview port.

Fix: default to `127.0.0.1`, require explicit host opt-in, validate real paths,
and stream the validated file descriptor. Add a symlink-escape test.

### AGG-09 — CSP hardener hashes decoded rather than literal script text

Severity: **Low**
Confidence: **High**
Status: **Confirmed latent availability defect**
Agreement: security-reviewer

Evidence: `scripts/harden-static-export.mjs:52-87` decodes HTML entities before
hashing inline scripts even though `<script>` is raw text; static smoke does
not recompute literal script-body hashes.

Failure scenario: a future inline bootstrap containing entity-shaped text gets
a mismatched CSP hash and hydration/bootstrap is blocked.

Fix: hash exact serialized script bodies and add literal entity fixtures plus
static-smoke verification.

### AGG-10 — Export memory guard undercounts the HiDPI MapLibre canvas

Severity: **High**
Confidence: **High**
Status: **Confirmed in live DPR=2 Chromium**
Agreement: debugger, non-tech-traveler-reviewer

Evidence: `MapView.resize()` applies requested dimensions as CSS pixels while
MapLibre retains device pixel ratio. A 1080×1920 export produced a
2160×3840 drawing buffer at DPR 2, but memory estimation counts only
1080×1920.

Failure scenario: a default vertical export passes the 256 MiB guard and then
loses its WebGL context or tab on a memory-constrained DPR 2/3 device.

Fix: force MapLibre pixel ratio 1 for export and restore the prior ratio on
every success/cancel/failure/unmount path; test DPR 1/2/3 physical canvas
dimensions and restoration.

### AGG-11 — Map loss and per-frame timeout report cancellation/codec failure

Severity: **Medium**
Confidence: **High**
Status: **Confirmed error-classification path**
Agreement: tracer, debugger

Evidence: `MapView.renderFrameAndWait()` uses `AbortError` for a missing map,
the render helper throws a plain timeout error, and the controller maps those
to cancellation or generic WebCodecs incompatibility instead of the existing
map-render recovery.

Failure scenario: travelers change codecs after a map-render failure, or are
told they cancelled when the map disappeared.

Fix: reserve `AbortError` for a signaled controller and translate map loss,
frame timeout, and capture-canvas allocation into typed localized export
errors. Test the full helper-to-toast chain.

### AGG-12 — File System Access write failures silently start a second download

Severity: **Medium**
Confidence: **High**
Status: **Confirmed error path; OS failure activation manual**
Agreement: debugger

Evidence: `src/lib/videoEncoder.ts:311-360` catches picker acquisition and
post-handle write/close errors in one block; every non-Abort error falls
through to the anchor download.

Failure scenario: disk-full or revoked permission leaves a partial chosen file
and silently starts an unexpected duplicate download.

Fix: separate picker acquisition from writing, abort the writable best-effort,
retain the in-memory video, surface a localized save error, and unit-test
create/write/close failures.

### AGG-13 — “New route” destroys the current unsaved session before replacement

Severity: **Medium**
Confidence: **High**
Status: **Confirmed data-loss workflow**
Agreement: critic, debugger, non-tech-traveler-reviewer

Evidence: `src/app/page.tsx:324-360` clears track, trim, scenes, playback, and
export state before Journey Creator opens; Cancel only closes the creator.

Failure scenario: a traveler accidentally chooses New, cancels, and loses an
imported/trimmed/manual route and authored scenes with no persistence or undo.

Fix: keep the existing session while the new journey is provisional and swap
only after Done; add imported/manual session New→Cancel regressions.

### AGG-14 — “Export Again” closes instead of resetting the open panel

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**
Agreement: critic, test-engineer, debugger, non-tech-traveler-reviewer

Evidence: the completion action calls `onResetExport`, whose page handler
resets and immediately sets `showExport(false)`.

Failure scenario: the traveler must rediscover and reopen Export to change a
setting and render again.

Fix: clear the result while keeping the idle panel open, restore useful focus,
and add component/E2E coverage.

### AGG-15 — Queued playback work remains temporarily authorized after pause/reset

Severity: **Low**
Confidence: **Medium**
Status: **Likely scheduling race**
Agreement: debugger

Evidence: pause/reset updates state but synchronizes `isPlayingRef` only in a
passive effect; an already queued RAF/timer can still write progress and
schedule another frame.

Failure scenario: session reset, import, or export pause briefly receives a
stale camera/progress update.

Fix: synchronously clear the playing/first-frame refs and cancel owned
RAF/timer work before state updates; add a fake-RAF race test.

### AGG-16 — A live PID in the Next dev lock is trusted as Travelback

Severity: **Low**
Confidence: **High**
Status: **Confirmed validation gap**
Agreement: debugger

Evidence: `scripts/run-dev-e2e.mjs:35-57` checks only PID liveness and reuses
the recorded port; it never verifies the origin serves Travelback.

Failure scenario: a reused PID or stale lock points tests at another service,
creating misleading failures and touching unrelated local work.

Fix: require a stable Travelback HTTP marker before reuse; otherwise fail safe
and select an isolated strategy without signaling the process.

### AGG-17 — Playback commits root React state at animation-frame frequency

Severity: **High**
Confidence: **High**
Status: **Confirmed architecture cost; representative-device magnitude unmeasured**
Agreement: perf-reviewer

Evidence: `usePlaybackController` calls the root progress setter on each RAF;
the page passes progress through MapView and non-memoized TrackWorkspace.

Failure scenario: React reconciliation competes with MapLibre paint at 60 Hz,
especially on a low-power phone or a track with a large elevation chart.

Fix: keep frame-authoritative progress behind a narrow imperative/external
boundary and publish a lower-frequency React/accessibility snapshot while
preserving exact seek/end/export semantics.

### AGG-18 — Elevation chart expands every accepted point into duplicate SVG data

Severity: **High**
Confidence: **High**
Status: **Confirmed at supported input scale**
Agreement: perf-reviewer

Evidence: `ElevationProfile.tsx:23-91,145-173` allocates per-point objects,
builds full path and area strings, and parses the area path twice for inputs up
to 250,000 points.

Failure scenario: importing a ceiling-size elevated track causes a
multi-megabyte allocation/paint pause on the main thread.

Fix: distance-aware downsampling with segment-gap/end-point/extrema
preservation, one shared coordinate representation, and a ceiling-size
regression budget.

### AGG-19 — Journey drag rebuilds the full route on every native move event

Severity: **Medium**
Confidence: **High**
Status: **Confirmed pointer-hot-path cost**
Agreement: perf-reviewer

Evidence: `JourneyCreator.tsx:70-119,198-202,375-387` clones all waypoints,
rebuilds point/line GeoJSON, recomputes every segment distance, and commits
state on each unthrottled move.

Failure scenario: detailed manual routes become increasingly sticky while one
point is dragged.

Fix: coalesce preview work to one RAF, update adjacent distance deltas, and
publish exact full geometry/state once on the terminal event.

### AGG-20 — Map hydration builds the wrapped coordinate graph twice

Severity: **Medium**
Confidence: **High**
Status: **Confirmed duplicate O(n) work**
Agreement: perf-reviewer retry

Evidence: MapView prepares wrapped segments for trail chunks, then
`buildTrackGeometry()` repeats the same preparation. The 250k-point diagnostic
measured about 21.6 MiB retained by the redundant graph.

Failure scenario: large-track load or style retry incurs avoidable latency and
peak memory before MapLibre serialization.

Fix: prepare wrapped segments, route geometry, and trail chunks once per track
identity/generation and reuse them across hydration.

### AGG-21 — Scene gestures publish root state at native input frequency

Severity: **Medium**
Confidence: **High**
Status: **Confirmed input-hot-path amplification**
Agreement: perf-reviewer retry

Evidence: scene range and camera sliders rebuild scene arrays and invoke the
page setter for each pointer/input event; the page also resets export state.

Failure scenario: a drag repeatedly reconciles the workspace and performs live
camera work faster than paint on lower-power devices.

Fix: hold transient gesture state locally, coalesce preview to one RAF, and
publish normalized root scenes/export invalidation once on commit while
preserving keyboard semantics and cancellation.

### AGG-22 — Preserve-drawing-buffer cost is imposed for the whole session

Severity: **Medium**
Confidence: **Medium**
Status: **Policy confirmed; material device impact requires profiling**
Agreement: perf-reviewer

Evidence: MapLibre is always created with `preserveDrawingBuffer: true` solely
for later export capture.

Failure scenario: travelers who never export may still pay GPU throughput,
memory, or thermal costs.

Fix/decision gate: profile interactive playback/pan with the option on/off on
representative low-end/mobile devices. If material, isolate export in a
dedicated context; the attribute cannot be toggled in place.

### AGG-23 — Offline-after-first-load documentation is not guaranteed

Severity: **Medium**
Confidence: **High**
Status: **Confirmed documentation mismatch**
Agreement: verifier, document-specialist

Evidence: `.context/project/02-architecture.md:119-128` promises offline use,
but the app has no service worker/precache and lazily requests the parser
worker, map styles, sample, and export chunks.

Failure scenario: after first paint and disconnect, a >16 MiB JSON import,
uncached style/sample, or first export fails.

Fix: narrow the statement to local/privacy behavior unless a complete
service-worker precache and offline integration test are intentionally added.

### AGG-24 — Architecture says cinematic scenes are automatic when they are opt-in

Severity: **Low**
Confidence: **High**
Status: **Confirmed documentation mismatch**
Agreement: verifier

Evidence: `.context/project/02-architecture.md:98-105` says the six-scene
sequence is auto-generated, while empty scenes use ordinary follow and the
Cinematic preset appears only after a user action.

Failure scenario: maintainers/users expect immediate exports to use six
cinematic scenes when they do not.

Fix: document empty-scene follow behavior and the opt-in preset.

### AGG-25 — Hooks-only convention contradicts the required ErrorBoundary class

Severity: **Low**
Confidence: **High**
Status: **Confirmed documentation mismatch**
Agreement: document-specialist

Evidence: `.context/development/01-conventions.md` forbids class components,
while `ErrorBoundaryInner` intentionally requires React class error
lifecycles.

Failure scenario: a contributor follows the rule and removes render-error
recovery.

Fix: document the ErrorBoundary class as the explicit exception.

### AGG-26 — Export stub is documented as 26 bytes but emits 22

Severity: **Low**
Confidence: **High**
Status: **Confirmed**
Agreement: verifier, document-specialist

Evidence: `test-stub.ts` and the E2E comment say 26 bytes; the literal
`travelback-test-export` is 22 bytes.

Failure scenario: diagnostics or assertions use a false invariant.

Fix: derive the payload length from one exported constant or avoid a duplicated
numeric claim.

### AGG-27 — Korean regional locale tags can fall back to English

Severity: **Low**
Confidence: **High**
Status: **Confirmed**
Agreement: debugger, non-tech-traveler-reviewer

Evidence: `detectLocale()` special-cases only `ko` and `ko-KR`, unlike the
prefix logic for other supported languages.

Failure scenario: `ko-KP` or a mixed-case Korean regional tag lands in English.

Fix: normalize and match `ko`/`ko-*`; add a locale-tag table test.

### AGG-28 — Korean landing copy hides the actual supported file extensions

Severity: **Medium**
Confidence: **High**
Status: **Confirmed product-copy mismatch**
Agreement: non-tech-traveler-reviewer

Evidence: English first-screen copy exposes JSON/GPX/KML; Korean copy lists app
brands without the extensions.

Failure scenario: a traveler chooses FIT, TCX, or CSV from a named fitness app
and receives an avoidable rejection.

Fix: show `.json`, `.gpx`, and `.kml` in every locale and explain that named
apps must export one of those formats.

### AGG-29 — “Street View” promises imagery the camera mode does not provide

Severity: **Medium**
Confidence: **High**
Status: **Confirmed misleading label**
Agreement: non-tech-traveler-reviewer

Evidence: the `ground` camera mode is a low-angle route follow over an abstract
background, not street imagery.

Failure scenario: travelers expect Google-like road photos or a street map and
interpret the result as broken.

Fix: localize a truthful “Ground-level follow” name and description.

### AGG-30 — Blank abstract map removes geographic travel context

Severity: **Critical**
Confidence: **High**
Status: **Confirmed product/UX gap; implementation requires product/data decision**
Agreement: non-tech-traveler-reviewer

Evidence: all bundled styles have empty sources and background-only layers;
MapView adds a coordinate grid and route but no coastline, countries, cities,
roads, or labels.

Failure scenario: a Seoul-to-Japan route is a line on a color field; travelers
cannot verify place context or produce a recognizable travel story.

Fix/decision gate: bundle a legally approved lightweight offline
coastline/country/city layer, or explicitly define and label a Private Grid
mode alongside an approved geography option. Record asset source, license,
size, simplification, localization, and offline/privacy constraints.

### AGG-31 — Short workspaces cover MapLibre controls and attribution

Severity: **High**
Confidence: **High**
Status: **Confirmed live at 320×568 and 320×480**
Agreement: designer

Evidence: the bottom stack is content-sized while MapLibre controls use a
fixed `clamp(...vh...)` offset. Hit tests returned timeline content over
attribution/zoom controls.

Failure scenario: required attribution and map navigation become visually and
pointer inaccessible on short phones.

Fix: expose measured bottom-stack height via ResizeObserver/CSS property,
position controls from it, and add short/landscape ownership tests.

### AGG-32 — Journey Creator footer is unreachable on short/landscape screens

Severity: **High**
Confidence: **High**
Status: **Confirmed live at 320×480 and 844×390**
Agreement: designer

Evidence: the absolute panel uses `overflow-hidden` with no viewport max-height
or internal scroll; Done/Clear render below the fixed viewport.

Failure scenario: a traveler can add route points but cannot finish or clear
the journey.

Fix: bound the panel with `100dvh`, add an internal scroll region and sticky
header/footer, respect safe-area insets, and test the complete flow.

### AGG-33 — Camera-mode comboboxes have no accessible names

Severity: **High**
Confidence: **High**
Status: **Confirmed in accessibility tree**
Agreement: designer

Evidence: `SceneEditor.tsx:715-742` renders scene mode selects without a label,
`aria-label`, or `aria-labelledby`; six preset fields appear as anonymous
comboboxes.

Failure scenario: screen-reader users cannot tell which scene or setting each
field controls.

Fix: add localized scene-specific labels and query them by accessible role/name
in component and E2E tests.

### AGG-34 — Light-mode cyan text and focus rings fail contrast

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by computed styles and WCAG ratios**
Agreement: designer

Evidence: `#06B6D4` against the light canvas is 2.09:1; it is used for normal
small text and a translucent focus ring, below 4.5:1 and 3:1 requirements.

Failure scenario: low-vision and keyboard users cannot reliably read actions
or locate focus.

Fix: separate decorative cyan from darker light-mode semantic/focus tokens and
add contrast tests across light glass/canvas surfaces.

### AGG-35 — Landing toolbar covers the upload card on short screens

Severity: **Medium**
Confidence: **High**
Status: **Confirmed at 320×480**
Agreement: designer

Evidence: the absolute toolbar overlaps the vertically centered, 90vh upload
card and wins pointer hit testing.

Failure scenario: settings obscure and intercept the upload card’s preview/header
region.

Fix: reserve a toolbar safe area or move settings into card flow on short
screens; add height-aware tests.

### AGG-36 — Desktop title and primary track toolbar visually overlap

Severity: **Medium**
Confidence: **High**
Status: **Confirmed at 768/1024/1440 widths**
Agreement: designer

Evidence: the title reserves 224px while the toolbar is about 468px; both use
the same absolute top layer, leaving roughly 260px overlap.

Failure scenario: long localized/imported track names render under the toolbar.

Fix: place title/actions in one layout or reserve measured toolbar width and
test long names at common desktop widths.

## Process-hygiene audit

Cycle-owned review processes were enumerated and verified absent:

- development E2E groups rooted at 55207, 55937, and 59805; port 31997 free
- non-technical walkthrough group 14838 and short runner PIDs; port 32197 free
- designer server group 58358; port 41861 free
- designer agent-browser/Chrome roots 8676/8722 and crashpads 8742/8745 absent

Pre-existing user Google Chrome rooted at PID/PGID 1368 remains alive.

Recorded incident: the designer used the normal named-session
`agent-browser close` command, which also caused the pre-existing shared
agent-browser daemon 45037 and Chrome 45069 to exit. No broad kill command or
direct signal was sent to that tree, but the side effect crossed the required
ownership boundary and must be reported as a cycle error. Future cleanup must
avoid a global/shared daemon close and use only session-scoped closure plus
exact owned-PID verification.

## AGENT FAILURES

None after the required performance-scan retry.
