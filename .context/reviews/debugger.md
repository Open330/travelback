# Debugger review

**Review date:** 2026-07-23
**Reviewer:** debugger
**Scope:** repository-wide latent bug, edge-case, regression, and failure-mode review
**Overall assessment:** core parsing/playback behavior is well tested, but browser/process lifecycle and high-DPI export paths contain release-relevant gaps

## Executive summary

I found nine actionable defects: two high, four medium, and three low. The most consequential repository-level failure is that both E2E wrappers can leave Playwright, Next, Chromium, and media-helper descendants alive when the wrapper is interrupted. The most consequential application failure is that export eligibility estimates the requested video frame but not MapLibre’s larger device-pixel-ratio WebGL canvas, so a mobile/Retina browser can be allowed to start a job whose working set exceeds the 256 MiB guard.

No critical defect was found. Unit, lint, and type checks pass. The full E2E result and the exact browser cleanup audit are recorded after the owned run finishes.

## Coverage and method

I first inventoried all 961 tracked files. The debugger pass read every executable and test/config text file: all 60 files under `src/`, all 20 E2E specs/fixtures, all 7 scripts, all public styles/generated worker/static text assets, root configs, the deployment workflow, package metadata/lockfile, and repository architecture/convention docs. Binary assets were type/hash checked. Archived plans and historical review prose were inventoried but not treated as executable product code.

The pass traced state and failure interactions across:

- import/drop/sample/manual-journey cancellation and replacement;
- parser limits, XML rejection, worker transfer/abort/timeout, and segmented tracks;
- map initialization/style retry/render/idle/resize/teardown;
- playback refs, animation frames, hidden-tab timers, trim/scenes, and hotkeys;
- export validation, memory/codec checks, per-frame rendering, cancellation/finalization, save/download/share, cleanup, and repeated export;
- dev/static build, CSP hardening, preview server, Playwright wrappers, retries, and process shutdown.

A final missed-findings sweep revisited every `catch`, timer, event listener, object URL, state reset, process spawn, file write, and boundary-value clamp. Findings below are independent of prior review reports.

## Findings at a glance

| ID | Severity | Confidence | Status | Location |
|---|---|---:|---|---|
| DBG-01 | High | High | Confirmed lifecycle gap; interruption path manual | `scripts/run-dev-e2e.mjs:60-76`; `scripts/run-static-e2e.mjs:44-60` |
| DBG-02 | High | High | Confirmed in live DPR=2 Chromium | `src/components/MapView.tsx:530-539`, `892-903`; `src/components/ExportPanel.tsx:120-142`; `src/lib/videoEncoder.ts:117-132`, `184-200` |
| DBG-03 | Medium | High | Confirmed error-classification path | `src/components/MapView.tsx:490-516`; `src/lib/map-render.ts:58-88`; `src/lib/useExportController.ts:273-285` |
| DBG-04 | Medium | High | Confirmed state transition | `src/components/TrackToolbar.tsx:143-152`; `src/app/page.tsx:324-360`, `462-464` |
| DBG-05 | Medium | High | Confirmed UI behavior | `src/components/ExportPanel.tsx:347-366`; `src/app/page.tsx:482-485` |
| DBG-06 | Medium | High | Confirmed error-handling path; OS write failure manual | `src/lib/videoEncoder.ts:311-360` |
| DBG-07 | Low | Medium | Likely scheduling race | `src/lib/usePlaybackController.ts:36-71`, `110-167` |
| DBG-08 | Low | High | Confirmed validation gap | `scripts/run-dev-e2e.mjs:35-57`; `playwright.config.ts:44-49` |
| DBG-09 | Low | High | Confirmed locale edge case | `src/lib/i18n.ts:1883-1891`; `src/lib/i18n.test.ts:146-150` |

## DBG-01 — Interrupted E2E wrappers do not terminate their child process trees

**Severity:** High
**Confidence:** High
**Status:** Missing lifecycle handling is confirmed; effect occurs when an external signal/timeout interrupts the wrapper

### Evidence

Both wrappers spawn Playwright as an ordinary attached child:

- `scripts/run-dev-e2e.mjs:60-68`
- `scripts/run-static-e2e.mjs:44-52`

Their only lifecycle handler listens for the **child’s** exit (`run-dev-e2e.mjs:70-76`, `run-static-e2e.mjs:54-60`). Neither wrapper handles its own `SIGINT`, `SIGTERM`, uncaught spawn error, or shutdown timeout. The child is not put in a deliberately owned process group.

### Concrete failure scenario

A CI timeout, review-cycle interruption, terminal close, or parent-agent cancellation sends `SIGTERM` to the npm/wrapper PID. Node performs its default termination without forwarding the signal to Playwright. Playwright’s Next server, Chromium process tree, ffmpeg/video helpers, and worker may be reparented and continue running. The next test cycle can inherit ports, locks, profiles, CPU/GPU use, or memory pressure and fail for reasons unrelated to the code under test.

### Recommended fix

Give each wrapper explicit, idempotent process ownership:

1. install `SIGINT`/`SIGTERM` handlers before or immediately after spawn;
2. forward the signal to the owned child/process group;
3. wait a short bounded grace period;
4. kill only surviving members of that exact owned group;
5. handle `child.on('error')`, normal exit, and repeated signals without double-exit.

On POSIX, a detached process group plus a negative-PGID signal is the simplest tree cleanup; provide a Windows-safe fallback. Add an integration test with a fake long-lived child/grandchild and assert both disappear after wrapper termination. Never use broad process-name matching.

## DBG-02 — Export memory guard undercounts the HiDPI MapLibre source canvas

**Severity:** High
**Confidence:** High
**Status:** Confirmed in a live DPR=2 Chromium run

### Evidence

- `MapView.resize()` sets the map container’s CSS size to the requested output dimensions and calls `map.resize()` (`src/components/MapView.tsx:530-539`).
- The MapLibre constructor at lines 892-903 does not override `pixelRatio`, so MapLibre uses `devicePixelRatio` and may clamp only at its 4096×4096 default canvas ceiling.
- `estimateExportMemoryBytes()` uses only `resolution.width × resolution.height × 4` (`src/lib/videoEncoder.ts:117-132`).
- The export panel trusts that estimate for the 256 MiB gate (`src/components/ExportPanel.tsx:128-142`), and `exportVideo()` repeats the same estimate at lines 171-173.
- The encoder intentionally creates a requested-size CPU staging canvas (`src/lib/videoEncoder.ts:184-200`), but the larger source WebGL drawing buffer still exists and is read/downscaled into it.

For the default vertical 1080×1920 preset:

- estimated source frame: 7.9 MiB;
- actual source frame at DPR 2: 2160×3840 = 31.6 MiB;
- the current `8×` estimate plus a 30-second, 8 Mbps output is about 92 MiB and allows export;
- applying the same headroom to the actual source alone is about 253 MiB, before the output buffer, requested-size staging canvas, codec/GPU allocations, and bookkeeping.

The live mobile walkthrough confirmed the path: with a 390×844 viewport and `devicePixelRatio === 2`, starting the default 1080×1920 export resized the MapLibre canvas to **2160×3840** while its CSS size remained 1080×1920.

### Concrete failure scenario

On a DPR 2 or DPR 3 phone/Retina display, a traveler accepts the default TikTok/Reels preset. The UI says the job is safe to start, but resizing creates a much larger preserved WebGL drawing buffer. A memory-constrained browser can lose the WebGL context, kill the tab, or fail encoding after the user waits—precisely where the 256 MiB guard is intended to prevent failure.

### Recommended fix

For export, set the map pixel ratio to 1 before resizing and restore the prior override afterward. Alternatively, incorporate the **actual** `canvas.width × canvas.height × 4` into eligibility after resize and include both source and staging canvases plus GPU/codec overhead. The first option gives deterministic output/memory and avoids rendering pixels that are immediately downscaled.

Add DPR 1/2/3 browser tests that start a held export and assert the physical source canvas dimensions, eligibility decision, and restoration after success, cancel, failure, and unmount.

## DBG-03 — Map teardown and frame timeout report the wrong export error

**Severity:** Medium
**Confidence:** High
**Status:** Confirmed error-classification path

### Evidence

- If the map disappears between export setup and a frame, `MapView.renderFrameAndWait()` rejects an `AbortError` (`src/components/MapView.tsx:490-494`).
- A per-frame render timeout rejects a plain `Error` (`src/lib/map-render.ts:76-88`).
- The controller treats **every** `AbortError` as user cancellation (`src/lib/useExportController.ts:278-280`).
- Any ordinary non-`ExportError` receives the generic codec/browser-support suffix (`src/lib/useExportController.ts:281-285`), despite the existing `app.exportMapRenderFailed` translations and `EXPORT_MAP_RENDER` mapping at lines 16-23.

### Concrete failure scenario

If the map is destroyed during export, the toast says the traveler cancelled even when they did not. If a render event times out, the toast suggests the browser may not support the codec, steering them toward the wrong recovery and hiding a map/render defect.

### Recommended fix

Reserve `AbortError` for an aborted controller signal. Reject missing-map and render-timeout conditions as typed `ExportError('…', 'EXPORT_MAP_RENDER')` (or a dedicated map-lost code mapped to the same localized recovery). Add controller tests for user abort, map teardown, and per-frame timeout.

## DBG-04 — “New route” destroys the current unsaved session before the new route exists

**Severity:** Medium
**Confidence:** High
**Status:** Confirmed state transition

### Evidence

- The desktop and mobile New actions invoke `onStartNewTrack` directly (`src/components/TrackToolbar.tsx:143-152`, `232`).
- `startFreshJourneySession()` immediately closes editors/export, clears scenes/results, clears map artifacts, sets both track states to `null`, resets trim/playback, and then opens Journey Creator (`src/app/page.tsx:324-360`).
- Journey Creator’s Cancel handler only sets `isCreatingJourney` false (`src/app/page.tsx:462-464`); it does not restore the previous track, trim, scenes, or export result.

### Concrete failure scenario

A traveler imports and trims a route, authors scenes, clicks **New**, then clicks **Cancel** after realizing they do not have coordinates ready. They return to the landing state and all work is gone. The app has no persistence or undo path.

### Recommended fix

If a session has a track or edits, ask for confirmation before discarding it. Better, keep the old session intact while Journey Creator is provisional and commit replacement only when the new route is accepted; Cancel then naturally restores the workspace. Add a browser regression covering imported route + scene + New + Cancel.

## DBG-05 — “Export Again” closes the export panel

**Severity:** Medium
**Confidence:** High
**Status:** Confirmed UI behavior

### Evidence

- The success action is labeled `export.exportAgain` and calls `onResetExport` (`src/components/ExportPanel.tsx:347-366`).
- Its page handler resets the result **and sets `showExport(false)`** (`src/app/page.tsx:482-485`).

### Concrete failure scenario

After completing an export, the traveler chooses **Export Again** expecting the configuration screen. Instead the dialog vanishes. They must rediscover and press the separate Export toolbar action. No data is lost, but the command does not do what it says at a high-attention point.

### Recommended fix

Reset the export session while keeping the panel open and return focus to its idle heading or first setting. If closing is intentional, relabel the action **Done** or **Close**. Add an E2E assertion for the post-click state; existing export tests stop at the success screen.

## DBG-06 — File System Access write errors silently trigger a second download path

**Severity:** Medium
**Confidence:** High
**Status:** Confirmed error-handling path; actual disk/permission failure remains manual

### Evidence

`downloadVideo()` puts picker acquisition, `createWritable()`, `write()`, and `close()` inside one `try` (`src/lib/videoEncoder.ts:319-329`). It specially returns only for `AbortError`; every other exception falls through to an anchor download (`330-360`).

### Concrete failure scenario

The user picks a destination, but disk space runs out or permission is revoked during `write()`/`close()`. The chosen file may be partial. Travelback silently starts a second download and later describes that fallback, without explaining the failed chosen save or attempting to abort the writable stream. The user can end up with a corrupt partial file plus an unexpected duplicate.

### Recommended fix

Separate picker acquisition from stream write/finalization. Falling back is reasonable for picker unavailability/activation errors before a handle is chosen; after a handle is chosen, abort/close the stream best-effort and surface a localized save failure while retaining the in-memory video and explicit Download button. Unit-test `createWritable`, `write`, and `close` failures independently.

## DBG-07 — Pause/reset leave a queued animation frame temporarily authorized

**Severity:** Low
**Confidence:** Medium
**Status:** Likely scheduling race; not reproduced as a persistent visible failure

### Evidence

- `isPlayingRef` is synchronized only in a passive effect (`src/lib/usePlaybackController.ts:36-39`).
- `pausePlayback`, `resetPlayback`, and `resetPlaybackSession` update React state but do not synchronously clear the ref or cancel the queued RAF/hidden-tab timer (`56-71`).
- `animate()` trusts the ref and can write progress/schedule another frame (`134-156`); cleanup occurs only when the effect reruns (`161-167`).

### Concrete failure scenario

A reset or session replacement lands after a frame is queued but before the passive-effect cleanup. That old callback still sees `isPlayingRef.current === true` and overwrites the requested reset progress for a frame, potentially causing a visible jump or stale camera update during New/import/export pause.

### Recommended fix

In pause/reset/session-reset, synchronously set `isPlayingRef.current = false`, clear `awaitingFirstFrameRef`, cancel the RAF and fallback timer, then update state. Add a fake-RAF unit test that invokes the previously queued callback between the reset call and effect cleanup.

## DBG-08 — A live PID in `.next/dev/lock` is trusted as the correct Travelback server

**Severity:** Low
**Confidence:** High
**Status:** Confirmed validation gap

### Evidence

`readActiveNextDevLock()` reads the PID and port, calls only `process.kill(pid, 0)`, and returns the port (`scripts/run-dev-e2e.mjs:35-46`). Lines 49-57 then tell Playwright to reuse the existing server. The config checks only the port URL (`playwright.config.ts:44-49`).

### Concrete failure scenario

A stale lock survives and its PID is reused by another live process, or the recorded port now serves a different application. The wrapper skips isolated startup. Tests then wait on or interact with the wrong service, producing misleading failures and potentially touching an unrelated local process.

### Recommended fix

Before reuse, fetch the recorded origin and require an application-specific marker/version, such as the Travelback root heading plus a stable build marker. Treat any uncertainty as stale and reserve/start a fresh isolated port. Process identity checks can supplement the HTTP marker but should not be the sole portable test.

## DBG-09 — Korean locale detection handles only `ko` and `ko-KR`

**Severity:** Low
**Confidence:** High
**Status:** Confirmed edge case

### Evidence

`detectLocale()` handles Korean with exact equality but Japanese, Chinese, and Spanish with prefix checks (`src/lib/i18n.ts:1883-1891`). A browser locale such as `ko-KP` or another valid Korean regional tag falls through to English. The sole test at `src/lib/i18n.test.ts:146-150` only asserts that the environment’s result is one of the supported locales.

### Concrete failure scenario

A Korean-speaking user with a non-`ko-KR` regional browser tag lands in English even though Korean is bundled. Changing language manually works, but first-run localization is wrong.

### Recommended fix

Use `lang.toLowerCase().startsWith('ko')`, consistent with the other languages, and table-test bare and regional tags (`ko`, `ko-KR`, `ko-KP`, uppercase/mixed-case forms, plus unsupported languages).

## Validation

| Check | Result |
|---|---|
| `npm test -- --reporter=verbose` | Passed: 21 files, 472 tests |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| Full `npm run test:e2e` on isolated port | Passed: 110 tests; 1 explicitly gated real-WebCodecs test skipped; 0 failed |
| DPR=2 mobile held-export probe | Confirmed 1080×1920 CSS / 2160×3840 drawing buffer |
| Owned-process cleanup audit | E2E groups 55207/55937/59805 and walkthrough group 14838 gone; ports 31997/32197 free |
| Production dependency audit | Failed: 2 high findings (reported separately by security-reviewer) |
| Secret/sink/process/file-boundary sweeps | Completed |

## Strong areas and negative findings

- Parser failure handling is extensive: caps, aborts, worker termination, entity rejection, malformed coordinate/elevation cases, segment preservation, and fallback names have regression tests.
- Sample-load generations and abort controllers prevent late responses from replacing newer manual/import sessions.
- Map style retry/revision ownership and track artifact cleanup are carefully guarded.
- Export uses an abort controller as a synchronous lease, revokes prior/pending object URLs, restores map size/progress, and bounds finalization.
- Scene normalization, dateline geometry, distance interpolation, trim confirmation, and keyboard/modal behavior have broad unit/E2E coverage.
- I found no evidence for duplicate-distance interpolation corruption, cross-segment route lines, NaN export configuration, or XML entity expansion after tracing those candidate paths; they are therefore not reported as defects.

## Residual manual checks

The final MP4 path is gated in the ordinary suite and needs an explicit WebCodecs-capable run. Hardware-specific memory/context-loss behavior cannot be completely established in SwiftShader. File System Access disk-full/revocation, mobile OS share sheets, hidden-tab throttling, and actual browser crash recovery remain manual/device checks even after the recommended automated regressions.
