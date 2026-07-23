# Test Engineer Review — Cycle 2

Date: 2026-07-23
Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Deployment/browser execution: not performed

## Result

Three new, actionable test/evidence defects remain at the current head. The most
important is a confirmed hole in the new E2E process supervisor: a descendant
that detaches and outlives a quickly exiting root can escape before the first
100 ms inventory poll. The required real-export lane also proves only an MP4
signature, not a valid/playable video, and the short-viewport layout test
declares the navigation pointer-safe while allowing it to overlap the track
title.

## Scope and fresh evidence

The review inventoried all repository-owned source, scripts, configuration,
workflow, public worker, documentation, Vitest files, process-supervisor tests,
Playwright specifications, and fixtures. It traced Cycle 1 changes from
`994820a71b0b` through the reviewed revision and compared candidates against
the prior aggregate and recorded deferrals.

Fresh non-browser gates:

- `npm run test:unit -- --reporter=dot`: **24/24 files and 520/520 tests passed**
- `npm run test:processes`: **7/7 tests passed**
- `npm run check:worker`: **passed; generated worker is current**
- A bounded fast-orphan diagnostic launched a detached grandchild, let its
  direct supervised root exit immediately, and then checked the exact recorded
  PID. `runSupervisedProcess()` returned `{ code: 0 }` while the grandchild was
  still alive. The diagnostic immediately killed that exact PID and confirmed
  it was gone.

Per review constraints, no Playwright command, browser, application server,
static server, build, deployment, push, or commit was run.

## Findings

### TE2-01 — The supervisor loses descendants that orphan between process-table polls

Severity: **High**
Confidence: **High**
Status: **Confirmed by control flow and focused process diagnostic**

Regions:

- `scripts/e2e-process-supervisor.mjs:85-164`
- `scripts/e2e-process-supervisor.mjs:187-240`
- `scripts/e2e-process-supervisor.mjs:311-338`
- `scripts/fixtures/fake-process-tree.mjs:38-57`
- `scripts/e2e-process-supervisor.test.mjs:115-223`

The POSIX tracker discovers ownership from a sampled PPID or an already known
process group and polls every 100 ms. Once a detached grandchild's parent has
exited, its PPID is no longer owned and its new PGID is not reachable from any
known live group. `signalAndWait()` then sees an empty set and reports success.
The new orphan fixture masks this race by deliberately keeping the root alive
for 250 ms after the detached grandchild reports ready, guaranteeing at least
two inventory opportunities. The focused diagnostic removed that delay and
reproduced the leak while all seven committed process tests remained green.

The Windows branch is weaker still: `WindowsOwnedProcessTracker.signalAndWait()`
returns success as soon as the root PID is gone, so it never calls
`taskkill /t` for descendants that survive root exit. All meaningful tree,
orphan, signal, escalation, and unrelated-sentinel tests are skipped when
`process.platform === 'win32'`; CI runs only Ubuntu.

Concrete failure scenario: Playwright or a browser launcher creates a detached
browser/utility group and its direct CLI root exits before the next inventory
sample. The wrapper preserves the root's zero/nonzero outcome and reports clean
termination while Chromium, ffmpeg, or a static server survives into the next
cycle.

Suggested fix: use an ownership primitive that does not depend on observing the
parent-child edge during a polling window (for example a Windows Job Object
with kill-on-close and a POSIX supervisor/subreaper or platform containment
helper). Add a zero-delay detached-orphan fixture, assert the wrapper cannot
return while its PID is alive, and run the ownership suite on Windows as well
as POSIX. Keep the unrelated-sentinel assertion so broader name-based cleanup
cannot satisfy the test.

### TE2-02 — The required “valid MP4” gate accepts an `ftyp` header followed by junk

Severity: **Medium**
Confidence: **High**
Status: **Confirmed assertion weakness**

Regions:

- `e2e/travelback.spec.ts:3148-3210`
- `package.json:22`
- `.github/workflows/deploy-pages.yml:25-44`

The real-export test exercises WebCodecs and Mediabunny and downloads the real
artifact, which is materially better than the local text stub. Its only file
validity assertions, however, are `byteLength > 1024` and ASCII `ftyp` at bytes
4-7. A truncated file, an MP4 with no `moov`, no video track, invalid samples,
wrong dimensions/duration, or an undecodable H.264 stream can satisfy both.
The test name says “produces a valid MP4,” and the workflow now treats it as a
required deployment gate, so this is a false-positive contract rather than
merely a weak optional smoke.

Concrete failure scenario: finalization writes the file-type box and more than
1 KiB of partial output, then omits or corrupts the movie metadata/sample table.
The test and deployment job pass, but the downloaded result cannot load, seek,
or play.

Suggested fix: validate the downloaded artifact independently. Parse its box
and track metadata (or run a pinned `ffprobe`) and require a movie box, media
data, one H.264 video track, 1280×720 dimensions, and duration/frame-count
tolerances; then load/decode at least the first and last sample or seek a
browser video element through the produced duration. If only the two byte
checks are intended, rename the test and documentation to “MP4 container smoke”
instead of claiming validity.

### TE2-03 — The short-viewport navigation test passes while navigation overlaps the title

Severity: **Medium**
Confidence: **High**
Status: **Confirmed from deterministic CSS geometry; browser measurement not run**

Regions:

- `src/app/globals.css:250-253`
- `src/app/globals.css:294-339`
- `src/components/TrackWorkspace.tsx:185-199`
- `e2e/travelback.spec.ts:1330-1357`
- `e2e/travelback.spec.ts:1508-1608`

At 320×480 and 320×568, the top-left MapLibre control container starts at
52 px (`3.25rem`), MapLibre adds its 10 px control margin, and the three 44 px
buttons are changed to a horizontal row. The mobile title starts at 64 px,
spans from 16 px to 304 px, and has a glass background plus roughly 31 px of
height. The two layers therefore intersect vertically from about 64-95 px and
horizontally across the left part of the title.

The new matrix checks that each navigation button is in the viewport and owns
its center hit. That remains true because the title explicitly has
`pointerEvents: 'none'`. Its only non-overlap loop compares attribution against
bottom-stack elements; it never compares navigation with either visible title.
The older “top toolbars” test runs at the default viewport and likewise omits
the title.

Concrete failure scenario: a short-phone user sees the route-name glass panel
painted over the zoom/compass row. Pointer checks stay green, but the controls
and title obscure one another and the route name is difficult to read.

Suggested fix: reserve distinct short-phone rows for the mobile title and map
navigation (or hide/move one layer). Extend the existing viewport matrix to
select the visible `track-title` variant, assert its bounding box does not
overlap the navigation group, and retain the current viewport and hit-owner
checks.

This is the same underlying product discrepancy recorded as `VER2-02` in the
verifier report and should be counted once when aggregating.

## Coverage and false-positive sweep

The Cycle 1 fixes genuinely close the previously counted omissions for Vitest
in CI, retries/diagnostics, the Export Again controller path, and generated
worker freshness. Parser semantics now flow through the shared
`googleJsonParser` source; the worker entry has result-parity tables and
`prebuild` rejects a stale generated bundle. An actual browser Worker transport
can still fall back silently for small JSON, but that is the already recorded
worker-path deferral rather than a new Cycle 2 finding.

The final sweep also checked conditional skips, permissive assertions, timer
ownership, save/share branches, responsive matrices, export-controller mocks,
CI ordering, and reporter configuration. The no-scene export mismatch is
reported once by the verifier because it is primarily a stated-versus-executed
contract defect. Root playback publication, session-wide
`preserveDrawingBuffer`, offline geographic context, and prior explicitly
deferred worker/full-browser evidence were not re-filed.
