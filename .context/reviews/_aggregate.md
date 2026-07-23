# Aggregate Deep Review — Cycle 2

Date: 2026-07-23
Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The reviewer fan-out produced **13 genuinely new, deduplicated findings**:

- 1 High
- 9 Medium
- 3 Low

All 13 are confirmed at the reviewed revision with High confidence. Repeated
reports were collapsed to one root and retain the highest reviewer-assigned
severity. The three explicit Cycle 1 deferrals were not reopened, and already
fixed Cycle 1 findings were not copied into this count.

Fresh review evidence:

- Vitest: 24 files / 520 tests passed.
- E2E process-supervisor regressions: 7 passed.
- Generated parser worker parity passed.
- Full and production-only dependency audits both reported zero
  vulnerabilities.
- A focused isolated Chromium check against the current static output
  reproduced the two landing-page UX findings at 320×480. It used unique port
  43177 and terminal session 20194; the ephemeral browser exited naturally,
  the exact owned server stopped, and no owned process or listener remained.
- No reviewer used a global browser close, `pkill`, `killall`, or a broad
  process match. Pre-existing user Chrome, shared agent-browser, and unrelated
  xylolabs processes were left untouched.

## Review provenance

Current Cycle 2 reports:

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

All requested roles completed. No reviewer failure remains unresolved.

## Deduplicated findings

### AGG2-01 — Polling ancestry is not durable process ownership

Severity: **High**
Confidence: **High**
Status: **Confirmed on POSIX by a bounded exact-PID diagnostic and confirmed
by source on Windows**
Agreement: test-engineer, security-reviewer, code-reviewer, architect, critic,
debugger

Evidence:

- `scripts/e2e-process-supervisor.mjs:85-195,203-240,262-348`
- `scripts/e2e-process-supervisor.test.mjs:115-223`
- `scripts/fixtures/fake-process-tree.mjs:28-68`

The POSIX tracker discovers ownership from full process-table snapshots taken
at start and every 100 ms. If a direct root launches a detached descendant and
exits before a snapshot records the new PID/group, the descendant is
reparented and no longer has an owned PPID or group. Cleanup then sees an empty
set and reports success. The current orphan fixture masks that window by
keeping the root alive for 250 ms. The test reviewer reproduced the faster
case with an exact PID, immediately terminated only that diagnostic process,
and confirmed it was gone.

Windows has an even weaker implementation: it keeps only the root PID, skips
all descendant conformance tests, and returns success as soon as that root is
dead even when a descendant can still be alive.

Failure scenario: Playwright, its server, or Chromium detaches just before the
launcher exits/crashes. The wrapper returns the launcher's status while a
browser, server, ffmpeg process, profile lock, or port survives into the next
cycle.

Fix: make durable OS-backed containment, or an inherited ownership identity
that survives reparenting, a prerequisite of `OwnedProcessTracker.start()`.
Do not claim successful tree cleanup when the platform cannot establish that
contract. Add an immediate-root-exit stubborn descendant fixture and
cross-platform conformance coverage that also proves an unrelated sentinel
survives.

### AGG2-02 — Process tracking forks and parses the full host table up to ten times per second

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**
Agreement: perf-reviewer; architect and security-reviewer support the durable
containment root

Evidence: `scripts/e2e-process-supervisor.mjs:10,50-82,98-103,120-163`.

Every supervised browser run launches `ps -axo ...` on a fixed 100 ms
interval. A ten-minute matrix can create roughly 6,000 subprocesses and
repeatedly parse every process on the host, including unrelated work. The
fixed rate remains high after ownership has stabilized.

Failure scenario: E2E orchestration itself adds CPU, process churn, and timing
noise to the browser workload, especially on shared or constrained CI hosts.

Fix: prefer the same event-driven/OS containment introduced for AGG2-01. If a
portable polling fallback remains, make it bounded and adaptive, cache only
validated identities, and test that steady-state snapshot frequency is
materially below the current ten-per-second rate without weakening cleanup.

### AGG2-03 — A teardown-time process-table failure can bypass fallback cleanup

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**
Agreement: tracer

Evidence: `scripts/e2e-process-supervisor.mjs:50-82,104-107,170-195,287-342`.

Startup tracking failures reach `forceRootGroupExitAfterTrackingFailure`, but
a later `ps` timeout/error propagates from `signalAndWait()` before any signal
is sent. The outer `finally` only clears the timer and handlers. Previously
validated PIDs/groups are therefore abandoned despite still being safe exact
targets.

Failure scenario: transient process-table exhaustion or a timed-out `ps`
during teardown causes the wrapper to throw while its already inventoried
server/browser groups remain alive.

Fix: retain the last validated identity snapshot and make teardown failure
itself enter bounded exact-target cleanup. Add injectable snapshot-reader
tests for failures before TERM, between TERM polls, and before KILL, while
proving PID-start identities and unrelated processes remain protected.

### AGG2-04 — Empty-scene export silently substitutes a Cinematic program

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by direct data flow**
Agreement: code-reviewer, architect, critic, verifier, document-specialist

Evidence:

- `src/lib/useExportController.ts:8,169-176`
- `src/lib/videoEncoder.ts:179-180,236-245`
- `src/components/MapView.tsx:813-840,1193-1217`
- `src/lib/camera.ts:381-388,525-538`
- `src/lib/useExportController.test.ts:61-96,113-307`
- `.context/project/02-architecture.md:98-105`
- `src/lib/i18n.ts:89,462,835,1208,1581`

The preview follows the route when no scenes exist, and the architecture plus
all five locales now say Cinematic is opt-in. At export start, however, the
controller replaces `[]` with `generateDefaultScenes()`, causing six
unselected camera segments. Removing that substitution alone would still
leave preview/export drift: MapView's default uses a 600 m segment-local
bearing and zoom 13, while `camera.ts` uses the immediate interpolation
bearing and zoom 14.

Failure scenario: a traveler previews ordinary follow, never chooses a camera
preset, and receives a saved video with six unexpected cinematic cuts.

Fix: pass the authored scene list unchanged and establish one executable
no-scene camera resolver shared by preview and export. Keep Cinematic
generation behind the explicit Scene Editor action. Test the exact controller
config and sampled center/zoom/pitch/bearing parity.

### AGG2-05 — Longitude world-copy selection can turn a 181° route into a 357° viewport

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by deterministic counterexample**
Agreement: code-reviewer, architect, critic

Evidence:

- `src/lib/map-geometry.ts:34-72,113-240`
- `src/lib/camera.ts:207-268`
- `src/components/MapView.tsx:173-293,843-924`
- `src/lib/map-geometry.test.ts:21-48`

Fit bounds, Overview camera, and reference-grid bounds independently apply
the same sign-based rule: when raw longitude span exceeds 180°, add 360° to
every negative longitude. For `[-179, -1, 2]`, route-ordered unwrapping spans
181° around center -88.5°, while the current rule spans 357° around -179.5°.
Rendered route/trail geometry already owns ordered `wrapLngNear` behavior, but
the three viewport consumers ignore it.

Failure scenario: a legitimate multi-country history is framed almost as the
whole world, uses an unnecessarily coarse grid, and centers Overview on the
wrong world copy.

Fix: make segment-aware, route-ordered display bounds one shared geometry
contract consumed by fit, reference grid, and Overview camera. Cover ordinary,
simple-dateline, wide, reverse, multi-wrap, and disconnected-segment tracks.

### AGG2-06 — Export cleanup pins a stale numeric device-pixel ratio

Severity: **Medium**
Confidence: **High**
Status: **Confirmed**
Agreement: tracer

Evidence:

- `src/lib/map-export-presentation.ts:3-43`
- `src/lib/map-export-presentation.test.ts:6-52`
- `src/components/MapView.tsx:580-620`

MapLibre begins in automatic DPR mode. Export snapshots the current numeric
ratio, forces 1, and restores by calling `setPixelRatio(oldNumber)`. MapLibre
uses `setPixelRatio(null)` to return to automatic tracking, so a successful,
cancelled, or failed export converts the map to a fixed override. Moving the
window between displays or changing browser scale then leaves an undersized
or oversized interactive drawing buffer.

Fix: preserve pixel-ratio ownership mode, not only its sampled number, and
restore automatic mode after export. Extend the harness so simulated device
DPR changes after restoration and the canvas follows it on every cleanup path.

### AGG2-07 — The required real-export gate accepts `ftyp` followed by junk

Severity: **Medium**
Confidence: **High**
Status: **Confirmed assertion gap**
Agreement: test-engineer

Evidence: `e2e/travelback.spec.ts:3149-3209` and
`.github/workflows/deploy-pages.yml:35`.

The required test exercises the actual mediabunny/WebCodecs path, but calls
the output valid when it is larger than 1,024 bytes and bytes 4–7 equal
`ftyp`. A truncated or corrupt MP4 can satisfy both checks without a valid
`moov`, `mdat`, track, duration, or decodable frame.

Failure scenario: mux/finalization produces an unplayable download while the
gate named “valid MP4” remains green.

Fix: parse the top-level box structure and load the downloaded object URL in a
browser video element. Assert one expected H.264 video track, 1280×720
dimensions, bounded duration/frame count, and successful first/last frame
decode or seek. If full decode is intentionally out of scope, rename the gate
to the narrower property it proves.

### AGG2-08 — Short-phone navigation and the mobile title paint in the same row

Severity: **Medium**
Confidence: **High**
Status: **Confirmed from deterministic CSS geometry**
Agreement: test-engineer, verifier

Evidence:

- `src/app/globals.css:250-253,294-339`
- `src/styles/vitro-base.css:513-520`
- `src/components/TrackWorkspace.tsx:193-199`
- `e2e/travelback.spec.ts:1508-1608`

At 320×480 and 320×568, MapLibre navigation begins around y=62 and the mobile
title begins at y=64. The title has `pointer-events: none`, so the existing
hit-test still reports the button even while the glass title obscures it.

Failure scenario: the route name/count and zoom/compass controls remain
technically clickable but are visually unreadable.

Fix: reserve distinct rows for the title and navigation at compact portrait
heights. Add a visible-box non-overlap assertion in addition to the existing
pointer-ownership check.

### AGG2-09 — Short-phone onboarding hides every own-file action below an un-signposted fold

Severity: **Medium**
Confidence: **High**
Status: **Confirmed in isolated 320×480 Chromium**
Agreement: designer, non-tech-traveler-reviewer

Evidence:

- `src/components/FileUpload.tsx:179-278`
- `src/app/page.tsx:608-626`
- the 320×480 measurement recorded in `designer.md`

The 410 px scrollable card contains 605 px of content. On first paint the
sample preview is visible, but Browse Files starts at y=486, Draw a route at
y=546, and Help at y=598. Overlay scrollbars provide no persistent clue that
these alternatives exist.

Failure scenario: a first-time traveler who wants their own file concludes
that the sample is the only path into the app.

Fix: for compact heights, shorten/progressively disclose the long format copy
and keep Browse Files visible, or expose an explicit continuation affordance
with equivalent keyboard/screen-reader context. Test initial visibility or
the continuation contract at 320×480.

### AGG2-10 — Delayed sample loading has no pending feedback or duplicate-activation guard

Severity: **Medium**
Confidence: **High**
Status: **Confirmed in isolated Chromium with a four-second route delay**
Agreement: designer, non-tech-traveler-reviewer

Evidence:

- `src/app/page.tsx:146-154,412-443,620`
- `src/components/FileUpload.tsx:143-147,232-245`
- `e2e/travelback.spec.ts:991-1077`

After 500 ms of a delayed sample request there is no visible status, no live
announcement, no busy state, and the sample trigger remains enabled. Existing
generation/abort logic prevents stale replacement but does not acknowledge
the user's action.

Failure scenario: on a slow connection the button appears broken and repeated
taps repeatedly replace the in-flight request.

Fix: expose sample loading state through the page and FileUpload, show and
announce localized progress, set appropriate busy semantics, disable duplicate
activation, and restore idle state after success, abort, or failure.

### AGG2-11 — Checkout persists an unnecessary GitHub token into build code

Severity: **Low**
Confidence: **High**
Status: **Confirmed configuration exposure; no compromise observed**
Agreement: security-reviewer

Evidence: `.github/workflows/deploy-pages.yml:17-30`.

The build job correctly has only `contents: read`, but checkout keeps its
credential in local Git configuration by default while `npm ci`, Playwright
installation, lint, tests, and build execute third-party code.

Failure scenario: a compromised lifecycle/build dependency reads and
exfiltrates a bearer token it does not need. Its read-only scope limits impact
but does not make the exposure necessary.

Fix: configure the pinned checkout action with
`persist-credentials: false`; retain current job-scoped permissions.

### AGG2-12 — CI audits only production packages while executing the development graph

Severity: **Low**
Confidence: **High**
Status: **Confirmed coverage gap; the full graph is currently clean**
Agreement: security-reviewer

Evidence:

- `.github/workflows/deploy-pages.yml:25-35`
- `package.json:36-48`
- `package-lock.json:19-31`

`npm ci` installs the complete lock and CI executes Playwright, ESLint,
TypeScript/Next, Vitest, and build tooling, but the only audit gate uses
`--omit=dev`. A future high advisory in an executed development package would
not block artifact creation.

Fix: run `npm audit --audit-level=high` against the installed graph. A
production-only audit may remain as an additional diagnostic.

### AGG2-13 — Korean file-recovery copy breaks its own product terminology

Severity: **Low**
Confidence: **High**
Status: **Confirmed**
Agreement: designer, non-tech-traveler-reviewer

Evidence:

- `src/lib/i18n.ts:403`
- `src/components/FileUpload.test.ts:62-82`

The Korean landing guidance uses `Google 타임라인`, while the recovery hint
shown during the same task switches to the English `Google Timeline`.

Failure scenario: error recovery looks unfinished and forces the traveler to
decide whether two different product names refer to the same source.

Fix: use `Google 타임라인` consistently and assert the exact localized
recovery phrase.

## Uncounted residual correction

`README.md:48` still says “Street View” although Cycle 1 AGG-29/P15 renamed
the mode to “Ground-level Follow.” This is an incomplete residue of an already
counted and nominally completed Cycle 1 finding, so it is deliberately **not**
included in the 13-new-finding total. It should be corrected alongside Cycle
2 documentation work rather than silently left behind or misreported as new.

## Final exclusion sweep

- The explicit Cycle 1 deferrals for root playback publication frequency,
  session-wide `preserveDrawingBuffer`, and offline geographic context remain
  unchanged and were not relabeled.
- Current full and production audits are clean; version drift without a
  demonstrated defect is not a finding.
- The generated parser worker is current.
- Previously repaired static-serving, CSP, map recovery, Journey ownership,
  export saving/error classification, locale detection, and responsive
  bottom-stack findings were checked but not repeated.
- No other current-HEAD issue met the actionable evidence threshold.
