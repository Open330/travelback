# Cycle 6 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` (5 actionable findings against `1d2755c`, 4 authority/legal/evidence-gated carryovers, and 4 measured performance deferrals).

## Objective

Fix all five actionable Cycle 6 findings without deployment. Preserve work that genuinely requires CI/CD authorization, legal input, representative hardware, or a separately measured performance redesign. Retain the user's final-cleanup instruction for the loop's final stop condition; do not delete any recorded tree during this cycle.

## Rules and constraints

- No deployment command, workflow dispatch, production mutation, CI/CD edit, deletion, or pre-existing process termination.
- Do not contact or interfere with the pre-existing server on port 3114 or the live Next owner recorded by `.next/dev/lock`.
- Use `apply_patch` for authored edits and preserve unrelated user changes.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per commit. Run `git pull --rebase` before each push, verify signatures, and do not deploy after pushing.
- Run focused regressions for every fix and the complete configured gate matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- Run the production-static real-WebCodecs export with `TRAVELBACK_REAL_EXPORT=1` and Playwright retries disabled; require an MP4 larger than 1 KiB with an `ftyp` box.
- Run build/browser gates in an isolated source mirror and record that mirror for final cleanup. Never delete the mirror during the active loop.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes CI/CD modification.
- Do not invent legal ownership, year, or license terms, and do not substitute browser emulation for representative-device performance evidence.
- The requested Ralph helper is not installed in this environment; execute the approved regression-first plan persistently through the review-plan-fix fallback.

## Wave 0 — Recovery state handoff

### P01 — Preserve manual camera ownership across Retry Map (AG6-01)

- Severity/confidence: Medium / High
- Files: `src/components/MapView.tsx`, `e2e/travelback.spec.ts`
- Work: capture center, zoom, pitch, and bearing from the outgoing live map when Retry is requested. Carry that snapshot only into the intended replacement generation. During successful hydration, automatic follow/scene camera remains higher priority; when Follow is off and export does not own the camera, replay the manual snapshot. Consume it only after successful hydration and clear it on track removal/replacement. If no valid snapshot exists, retain the new-track fit as the safe fallback.
- Acceptance: with a paused nonzero track and camera tracking disabled, a failed style followed by actual Retry Map restores the same camera, route, marker, and trail instead of `[0,20]`/zoom 2. Follow remains disabled, exactly one live canvas/marker exists, and automatic-follow hydration continues to pass.
- Focused verification: lint/typecheck plus a retries-disabled dev E2E exercising the actual error/Retry UI and comparing the pre/post camera pose.
- Status: Completed (`62694c1`).

## Wave 1 — Bottom-surface interaction ownership

### P02 — Compose timeline, elevation, and controls without overlap (AG6-02)

- Severity/confidence: Medium / High
- Files: `src/components/TrackWorkspace.tsx`, `src/components/TimelineSelector.tsx`, `e2e/travelback.spec.ts`
- Work: place Timeline, Elevation, and playback controls in one responsive bottom stack rather than independent absolute bands. Give the Reset button a 44×44 minimum target and centered icon while preserving existing focus treatment and accessible name.
- Acceptance: after trimming an elevation-bearing route at both 390×844 and 1440×1000, Timeline and Elevation do not intersect, Reset is at least 44×44, and its center hit resolves to Reset. A real click restores the full point count, removes Reset, and does not seek playback.
- Focused verification: retries-disabled static E2E at both viewports plus lint/typecheck.
- Status: Completed (`3b29a91`).

## Wave 2 — Localized and warning-free feedback

### P03 — Localize complete scene-boundary adjustment warnings (AG6-03)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, `src/components/SceneEditor.tsx`, `src/components/SceneEditor.test.ts`
- Work: add locale-owned start-adjusted and end-adjusted templates with placeholders for scene name and old/new percentages. Use them for both visible warnings and the shared polite live status; do not concatenate English fragments into translated text.
- Acceptance: all five locale dictionaries retain key/placeholder parity. A Korean normalization regression produces a Korean start/end correction with the scene name and percentages and contains neither literal `start:` nor `end:`.
- Focused verification: SceneEditor and i18n unit suites plus lint/typecheck.
- Status: Completed (`d8b99ad`).

### P04 — Settle the FileUpload ordering test inside `act(...)` (AG6-04)

- Severity/confidence: Low / High; test-only
- File: `src/components/FileUpload.test.ts`
- Work: replace the already-resolved parser mock with a deferred promise. Assert `onImportStart` precedes parser invocation, resolve/flush inside async `act`, and assert the loaded track after settlement.
- Acceptance: the focused test passes without React lifecycle warnings while preserving its ordering contract and proving settled output.
- Focused verification: run the FileUpload test with the verbose reporter and assert no `act(...)` warning, then run the full unit suite.
- Status: Completed (`77bbb98`).

## Wave 3 — Import-guide consistency

### P05 — Correct and guard the legacy Takeout illustration (AG6-05)

- Severity/confidence: Low / High
- Files: `public/guide/google-takeout-export.svg`, `src/lib/i18n.test.ts`
- Work: label the image as a legacy fallback available only when Takeout offers Location History. Replace the single `Records.json` outcome with compatible JSON wording that covers Records, Timeline Edits, and monthly JSON. Add a source-asset assertion rejecting the obsolete unconditional text.
- Acceptance: the rendered image no longer promises Location History or `Records.json` as the sole path, matches the adjacent phone-first/known-compatible guide contract, and the asset-content regression passes.
- Focused verification: i18n/asset unit test plus a static build/smoke pass.
- Status: Completed (`c4c9119`).

## Carried-forward blocked work

### B01 — Add the unit test gate to Pages CI

- Original severity/confidence: High / High
- Exact scope: `.github/workflows/deploy-pages.yml:26-32`
- Block reason: user-level destructive-action policy classifies CI/CD modification as destructive and requires explicit confirmation before the specific edit.
- Exit criterion: user explicitly authorizes the workflow edit; add `npm test` to the build job and validate syntax without dispatching or deploying.
- Status: Blocked; no edit authorized.

### B02 — Narrow Pages workflow permissions

- Original severity/confidence: Medium / High
- Exact scope: `.github/workflows/deploy-pages.yml:8-45`
- Block reason: same explicit CI/CD authority boundary as B01.
- Exit criterion: user authorizes the edit; scope read access to build and grant Pages/OIDC writes only to deploy, without dispatching or deploying.
- Status: Blocked; no edit authorized.

### B03 — Resolve the README MIT claim without a root grant

- Original severity/confidence: Medium / High
- Exact scope: `README.md:225-227`, absent root `LICENSE`
- Block reason: intended license, copyright holder, and year/range are legal facts the repository does not establish.
- Exit criterion: the owner supplies exact license intent and attribution; add the grant or correct the README claim.
- Status: Blocked on owner input.

### B04 — Measure always-on preserved WebGL buffers on representative hardware

- Original severity/confidence: Medium / Medium
- Exact scope: `src/components/MapView.tsx:903-914`
- Block reason: browser emulation cannot establish low-end/mobile GPU, memory, battery, or thermal cost.
- Exit criterion: record comparative p50/p95 frame time and memory plus battery/thermal observations on representative hardware; isolate export capture only if impact is material.
- Status: Evidence-gated.

## Carried-forward performance deferrals

### D01 — Move per-frame playback progress off broad root React ownership

- Severity/confidence: High / High
- Exact scope: `src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:180-232,577-595`
- Exit criterion: profile representative tracks and implement an imperative/external-store boundary preserving seek, follow camera, scenes, and export.
- Status: Deferred to measured architecture work.

### D02 — Downsample elevation paths with visual guarantees

- Severity/confidence: Medium / High
- Exact scope: `src/components/ElevationProfile.tsx:20-60,91-133`
- Exit criterion: profile near the supported point ceiling, implement distance-aware downsampling with endpoint/extrema guarantees, and add visual regressions.
- Status: Deferred to measured performance work.

### D03 — Avoid full-route distance scans during waypoint drag previews

- Severity/confidence: Medium / High
- Exact scope: `src/components/JourneyCreator.tsx:194-198,363-373`
- Exit criterion: implement and measure an incremental or throttled design at a documented route-size target while preserving exact committed distance.
- Status: Deferred to measured performance work.

### D04 — Measure the second per-frame export idle check

- Severity/confidence: Medium / High
- Exact scope: `src/lib/useExportController.ts:174-239`; `src/lib/videoEncoder.ts:223-247`
- Exit criterion: profile real exports and demonstrate redundant waiting before altering the capture contract.
- Status: Deferred to measured performance work.

## Retained user-injected final-cleanup instruction

### U-2026-07-17-01 — Final cleanup of run-created trees

- User wording (verbatim): “지금 많은 tree 만들어져있는데 모두 잘 정리하고 마무리해 끝날때.”
- Status: Ingested in Cycle 6 and retained for the loop's final stop condition. It is **not current implementation work and is not complete**.
- Required behavior: remove only temporary worktrees, validation mirrors, copied trees, and artifacts proven to have been created by this review-plan-fix run. Preserve primary, pre-existing, and user-owned trees and repository data. Do not stop processes to perform cleanup.
- Recorded run-created paths so far:
  - `/tmp/travelback-cycle5-recovery.KMkGf7`
  - `/tmp/travelback-cycle5-recovery.x0nOJV`
  - `/Users/hletrd/flash-shared/Travelback-cycle5-recovery.3ZvbIj`
  - `/tmp/travelback-cycle6-browser.tMtY4J`
  - `/tmp/travelback-cycle6-static.10O3N4`
  - `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-77834f04e42c1f49ba6c236505512ebd.log`
  - `/tmp/travelback-cycle6-focused.0jw7ns`
  - `/tmp/travelback-cycle6-gates.IzOqfp`
- No listed path was deleted during this cycle.

## Verification-driven repair record

- The first P02 typecheck caught that the new browser test used `selected`/`total` instead of the existing helper's `visible`/`full` fields. The test was corrected before commit; no production change or suppression was needed.
- P01's actual Retry UI regression passed 1/1 with retries disabled after turning Follow off, advancing the marker on the failed outgoing style, and comparing the recovered camera/pose.
- P02's two-viewport Reset regression passed 1/1 with retries disabled, and the existing two-viewport attribution geometry/keyboard regression passed 1/1 after the safe-area update.
- P03's SceneEditor/i18n regressions passed 14/14; P04's focused FileUpload suite passed 2/2 without the former React warning; P05's i18n/asset suite passed 11/11.
- The exact-HEAD validation mirror initially required its existing local `.bin` directory to be placed explicitly on PATH. No package install or repository change occurred; the exact configured commands then ran successfully.

## Required final gate matrix

1. `npm run lint` — passed with zero warnings.
2. `npm run typecheck` — passed.
3. `npm run test` — 368 tests passed across 15 files with no React lifecycle warning.
4. `npm audit --audit-level=high` — passed with zero vulnerabilities.
5. `npm run build` — passed with Next.js 16.2.10; generated-worker parity, TypeScript, 4 static pages, and CSP hardening across 3 HTML files passed.
6. `npm run smoke:static` — passed on the isolated production export.
7. `npm run test:e2e` — 95 passed, 1 expected opt-in real-export skip, zero failures or retries in 15.0 minutes.
8. `npm run test:e2e:static:ci` — static smoke passed; 95 passed, 1 expected opt-in real-export skip, zero failures or retries in 19.5 minutes.
9. Production-static real-MP4 smoke — passed 1/1 in 1.4 minutes with `TRAVELBACK_REAL_EXPORT=1` and retries disabled; the executed test required the downloaded MP4 to exceed 1 KiB and contain `ftyp`.

The build and browser matrix ran from the isolated exact-HEAD copy `/tmp/travelback-cycle6-gates.IzOqfp`; focused browser regressions ran from `/tmp/travelback-cycle6-focused.0jw7ns`. The pre-existing local Next process, port 3114, primary build artifacts, and all recorded cleanup paths were left untouched.

## Completion gate

Completed. P01-P05 were implemented in focused signed commits and pushed; every focused regression, the full configured gate matrix, and the retries-disabled real-MP4 smoke passed. B01-B04 and D01-D04 retain their documented authority, legal-input, representative-evidence, or measured-redesign exit criteria. No deployment, CI/CD edit, production mutation, deletion, or pre-existing process/port action occurred.
