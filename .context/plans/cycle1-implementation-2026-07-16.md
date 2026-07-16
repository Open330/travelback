# Cycle 1 Implementation Plan — 2026-07-16

Source: `.context/reviews/_aggregate.md` (31 deduplicated findings against `df8f08a`).

## Objective

Restore release-gate integrity and fix every authorized confirmed correctness, security, data-loss, accessibility, and documentation defect without deploying. Keep only explicit authority gaps and evidence-only performance/maintenance risks outside the implementation wave.

## Rules and constraints

- No deployment command or manual workflow dispatch.
- Use `apply_patch` for authored edits and package/build tools only for mechanical generated output.
- Preserve unrelated user changes.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent change per commit. Before each push run `git pull --rebase`, then push.
- Run the complete gate matrix after implementation: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- `.github/workflows/deploy-pages.yml` is read-only until the user explicitly authorizes CI/CD modification.
- Do not invent license ownership or legal attribution.
- The requested Ralph implementation helper is not installed in this environment; execute the approved plan directly with equivalent regression-first sequencing.

## Wave 0 — Release integrity

### P01 — Patch vulnerable dependencies (AG-01)

- Severity/confidence: High / High
- Files: `package.json`, `package-lock.json`
- Work: verify current stable registry versions; update direct minimums and lockfile so `next`, `vite`, `undici`, `js-yaml`, `brace-expansion`, and Babel resolve to patched releases.
- Acceptance: `npm audit --audit-level=high` exits 0; all downstream gates remain green.
- Status: Completed. Patched direct and transitive resolutions; the final high-severity audit reports zero vulnerabilities.

### P02 — Repair static parser parity smoke (AG-02)

- Severity/confidence: High / High
- Files: `scripts/smoke-static.mjs`, parser/worker sources after P06
- Work: stop looking for moved symbols in `parser.ts`; assert actual generated-worker ownership and behavioral constants from their real modules.
- Acceptance: `npm run smoke:static` reaches and passes every assertion after a fresh build.
- Status: Completed with P06. Static smoke now checks the generated worker and the shared typed parser sources, and passes after the final build.

### P03 — Make the real MP4 smoke executable (AG-03)

- Severity/confidence: High / High
- Files: `e2e/travelback.spec.ts`, optionally a fixture/helper under `e2e/`
- Work: select a supported/minimum export duration, download the resulting file, and assert MP4 signature plus a nontrivial byte size. Keep the fast stub test explicitly scoped to UI state.
- Acceptance: the opt-in test reaches WebCodecs/Mediabunny and passes locally on configured Chromium, or records a precise platform capability failure rather than silently returning.
- Status: Completed locally. The opt-in production-static Chromium test encoded and downloaded a real MP4, asserted a nontrivial size and `ftyp` signature, and passed 1/1 in 55.1 seconds. Adding a CI lane remains blocked by P28.

### P04 — Restore desktop settings (AG-24)

- Severity/confidence: Medium / High
- Files: `src/components/TrackToolbar.tsx`, `src/components/GlobalToolbar.tsx`, `e2e/travelback.spec.ts`
- Work: expose exactly one desktop language/unit/theme group after track load while keeping the existing mobile menu.
- Acceptance: existing locale and desktop-toolbar browser tests pass; desktop and mobile each have one visible accessible settings surface.
- Status: Completed. Desktop and tablet workspaces expose one accessible settings group without duplicating the mobile surface.

### P05 — Fix development CSP without weakening production (AG-06)

- Severity/confidence: Low / High
- Files: `src/app/layout.tsx`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`
- Work: allow the development-only style elements Next emits; retain strict `style-src`/`style-src-elem` in hardened output.
- Acceptance: dev console no longer reports blocked Next style elements; static smoke still rejects unsafe production styles/scripts.
- Status: Completed. Development permits Next's emitted styles; postbuild hardening restores the strict production CSP, which static smoke verifies.

## Wave 1 — One bounded Google parser path

### P06 — Generate the worker from shared TypeScript (AG-22, AG-02)

- Severity/confidence: High / High
- Files: `scripts/build-worker.mjs`, `src/lib/googleJsonParser.ts`, a typed worker entry under `src/workers/`, generated `public/workers/trackParser.worker.js`, package scripts
- Work: replace the manual worker parser copy with a deterministic browser bundle built from the tested parser source. Make generation/checking real and fail on drift.
- Acceptance: build-worker produces deterministic output, worker and main fixtures return equivalent tracks/error codes, and no parser implementation is manually duplicated.
- Status: Completed. A deterministic ESNext worker bundle is generated from the shared typed parser implementation, and prebuild drift detection passes.

### P07 — Enforce a parse-wide allocation budget (AG-19)

- Severity/confidence: Medium / High
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parse-utils.ts`, parser tests, generated worker
- Work: pass one budget through Records/timeline/semantic ingestion and reject before retaining more than `MAX_TRACK_POINTS` across all segment arrays.
- Acceptance: adversarial many-segment fixtures fail with `TOO_MANY_POINTS` before aggregate flatten/sort copies are created; ordinary formats remain equivalent.
- Status: Completed. One parse-wide budget now bounds retained points before aggregate copies, with adversarial regression coverage.

### P08 — Validate full depth and bound worker lifetime (AG-20)

- Severity/confidence: Medium / Medium
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parser.ts`, worker entry, tests
- Work: perform a complete structural depth scan in the worker path, add a bounded timeout/abort cleanup path, and preserve the small-file fallback behavior.
- Acceptance: a deep suffix after 10 MiB returns `JSON_DEPTH_EXCEEDED`; timeout/abort terminates once and reports a stable code.
- Status: Completed. Full structural depth validation, stable timeout/abort errors, and once-only worker cleanup are regression-covered.

### P09 — Reject unsupported extensions before reading (AG-18)

- Severity/confidence: Medium / High
- Files: `src/lib/parser.ts`, `src/lib/parser.test.ts`
- Work: validate extension before `FileReader` or `arrayBuffer` allocation.
- Acceptance: unsupported/missing-extension tests return `UNSUPPORTED_FORMAT` and prove no reader method was called.
- Status: Completed. Unsupported or missing extensions are rejected before any file read or allocation.

## Wave 2 — Map rendering correctness

### P10 — Split completed trail geometry from the active head (AG-07, AG-09)

- Severity/confidence: High / High and Medium / High
- Files: `src/components/MapView.tsx`, extracted pure geometry module/tests, browser debug assertions
- Work: cache completed route geometry by vertex/segment, maintain a tiny active-head source that follows every interpolated point, normalize singleton completed segments, and reset both sources on track/style/session replacement.
- Acceptance: two progress values within the same vertex pair have different endpoints; the final endpoint reaches the destination; mixed visit/path fixtures contain valid line members.
- Status: Completed. Completed geometry and the interpolated active head use separate sources, including valid singleton normalization and final-endpoint coverage.

### P11 — Make export source mutation-to-paint atomic (AG-08)

- Severity/confidence: High / High
- Files: `src/components/MapView.tsx`, map/export tests
- Work: install render/abort/timeout listeners before source/camera mutation, request repaint even for unchanged cameras, and resolve only after the resulting render plus animation frame. Timeout must reject rather than encode knowingly stale content.
- Acceptance: unchanged-camera frames wait for a render and no listener/timer survives resolve, reject, or abort.
- Status: Completed. Paint listeners are installed before mutation, repaint is requested for unchanged cameras, and abort/timeout/listener cleanup is covered.

### P12 — Extract and test pure MapView geometry (AG-23)

- Severity/confidence: Low / Medium maintenance risk
- Files: new `src/lib/map-geometry.ts` and test, `src/components/MapView.tsx`
- Work: move only the pure segment/trail builders needed by P10 behind typed functions; do not redesign the whole component.
- Acceptance: MapView shrinks without behavior churn and P10/P11 regressions are unit-covered.
- Status: Completed. Pure trail/segment construction lives in a typed geometry module with focused unit coverage.

### P13 — Measure `preserveDrawingBuffer` cost (AG-21)

- Severity/confidence: Medium / Medium risk
- Files: no production edit until measurement; record evidence in the implementation plan/review follow-up
- Work: capture frame-time/memory evidence on representative low-end/mobile hardware.
- Exit criterion: if p95 frame time or memory materially regresses versus a non-preserved export-isolated map, schedule that architecture; otherwise document the measured budget.
- Status: Deferred evidence task — current environment cannot represent the required devices, and no defect is confirmed.

## Wave 3 — State and async transaction boundaries

### P14 — Keep accepted trim state authoritative (AG-10)

- Severity/confidence: Medium / High
- Files: `src/components/TimelineSelector.tsx`, `src/components/TrackWorkspace.tsx`, `src/app/page.tsx`, E2E
- Work: make accepted selection ratios parent-controlled or provide an explicit revert token; cancel restores handles/counts/labels and confirm commits them.
- Acceptance: separate confirm/cancel tests keep selector, map, active track, and scenes consistent.
- Status: Completed. Accepted ratios are parent-authoritative; confirm commits and cancel restores selector, active track, map, and scene state.

### P15 — Convert full-track seek to active progress (AG-11)

- Severity/confidence: Medium / High
- Files: `src/components/TimelineSelector.tsx`, tests
- Work: normalize clicks within the accepted selection and use explicit coordinate-domain names.
- Acceptance: midpoint of a 25–50% full-track selection seeks active progress 0.5.
- Status: Completed. Timeline clicks are converted from the accepted full-track range into active-track progress, including duplicate-coordinate plateaus.

### P16 — Clear journey source on destructive edits (AG-12)

- Severity/confidence: Medium / High
- Files: `src/components/JourneyCreator.tsx`, source-data test
- Work: always set line data, including empty geometry for 0/1 waypoints.
- Acceptance: delete, undo, and clear from two points leave no stale line.
- Status: Completed. The journey line source is updated with empty geometry whenever fewer than two waypoints remain.

### P17 — Make scene undo an inverse operation (AG-13)

- Severity/confidence: Medium / High
- Files: `src/components/SceneEditor.tsx`, tests
- Work: retain deleted scene/index and reinsert into current state; never replace newer state wholesale.
- Acceptance: delete → edit/add/reorder → undo restores only the deleted scene and keeps later work.
- Status: Completed. Undo reinserts only the deleted scene at its prior index and preserves subsequent edits.

### P18 — Commit keyboard scene ranges (AG-14)

- Severity/confidence: Medium / High
- Files: `src/components/SceneEditor.tsx`, keyboard tests
- Work: call the normalized commit path once per keyboard action.
- Acceptance: keyboard-created overlaps are normalized identically to pointer commits and preview/export match displayed timing.
- Status: Completed. Keyboard changes use the same committed normalization path as pointer changes.

### P19 — Invalidate stale import completion (AG-15)

- Severity/confidence: Medium / High
- Files: `src/components/FileUpload.tsx`, `src/lib/parser.ts`, tests
- Work: abort/invalidate parse on unmount or session replacement and guard callbacks by request generation.
- Acceptance: a deferred old parse cannot replace a subsequently started manual journey; worker/reader cleanup is once-only.
- Status: Completed. Request-generation and abort guards prevent old parse completion from replacing a newer journey, with once-only cleanup.

### P20 — Cancel incomplete encoder output (AG-16)

- Severity/confidence: Medium / High
- Files: `src/lib/videoEncoder.ts`, unit tests
- Work: await `Output.cancel()` after start on abort/render/codec/finalization failure while preserving the primary failure.
- Acceptance: success finalizes once and never cancels; every incomplete path cancels once.
- Status: Completed within Mediabunny's public lifecycle. Pre-finalization failures await one cancel while preserving the primary error; success finalizes once and never cancels. Because Mediabunny intentionally makes `cancel()` a no-op after `finalize()` enters `finalizing`, a bounded timeout still protects the caller without claiming dependency-level cancellation. CPU-backed frame rematerialization also prevents the observed Chromium MapLibre-frame `VideoEncoder.flush()` stall.

## Wave 4 — Product contract, accessibility, and documentation

### P21 — Align export presets with the memory envelope (AG-17)

- Severity/confidence: Medium / High
- Files: `src/types.ts`, `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`, README/tests
- Work: remove unreachable 4K choices from the advertised catalog unless measurement proves a safe feasible configuration; keep the encoded/memory guard.
- Acceptance: every visible preset has at least one valid minimum-duration/default-codec configuration under the enforced cap.
- Status: Completed. The visible catalog contains five feasible presets from 720p through 1080p and retains the encoded-memory guard.

### P22 — Associate export labels and controls (AG-31)

- Severity/confidence: Medium / High
- Files: `src/components/ExportPanel.tsx`, E2E
- Work: add stable IDs and `htmlFor` for resolution, duration, quality, codec, FPS, and Mbps.
- Acceptance: all six controls are queryable by their localized accessible names.
- Status: Completed. Resolution, duration, quality, codec, FPS, and bitrate controls are queryable by localized accessible names.

### P23 — Name manual journeys and widen icon targets (AG-26, AG-29)

- Severity/confidence: Medium / High
- Files: `src/components/JourneyCreator.tsx`, `src/lib/i18n.ts`, tests
- Work: relabel icon choice, enforce 44×44 targets with wrapping, add an optional prefilled name to confirmation, trim/fallback safely, and use it for `Track.name`.
- Acceptance: named and blank-fallback journeys work; 320/390/430 px layouts keep all targets accessible.
- Status: Completed. Manual journeys accept trimmed names with a safe fallback, and icon toggles meet the 44-pixel target at supported mobile widths.

### P24 — Update Google export guidance (AG-25)

- Severity/confidence: High / High
- Files: `src/lib/i18n.ts`, `src/components/GoogleGuide.tsx`, `README.md`, `.context/project/01-overview.md`, tests
- Work: make current device export primary; label Takeout legacy/conditional; narrow compatibility wording to known JSON shapes. Use official Google device-export links cited in the review.
- Acceptance: every locale and repository doc distinguishes acquisition guidance from parser compatibility; i18n key parity passes.
- Status: Completed. All locales and repository guidance are phone-first, identify Takeout as legacy/conditional, preserve locale/platform links, and narrow format claims to supported JSON shapes.

### P25 — Fix Korean export summary (AG-30)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`, i18n tests
- Work: use a locale-neutral separator or localized full pattern rather than English `at`.
- Acceptance: Korean advanced summary contains no English connector; other locales remain natural.
- Status: Completed. The advanced export summary uses a locale-neutral separator and contains no English connector in Korean.

### P26 — Correct executable documentation (AG-28)

- Severity/confidence: Low / High
- Files: `README.md`
- Work: remove the brittle exact E2E count and describe the suite by coverage.
- Acceptance: README remains accurate when tests are added/removed.
- Status: Completed. README describes E2E coverage without a brittle exact test count.

### P27 — Resolve the missing license grant (AG-27)

- Severity/confidence: Medium / High
- Files: `README.md`, root `LICENSE` after direction
- Required input: intended license, copyright holder, and year/range.
- Exit criterion: ship the exact intended grant and link it, or explicitly correct the README claim.
- Status: Blocked by user/legal attribution; no guessed edit permitted.

## Authority-gated CI hardening

### P28 — Add unit/real-export gates and least-privilege jobs (AG-04, AG-05, AG-03)

- Severity/confidence: High / High, Medium / High
- File: `.github/workflows/deploy-pages.yml`
- Work after authorization: run `npm test`; move `pages: write`/`id-token: write` to deploy only; decide whether the real export smoke is a supported CI lane.
- Exit criterion: explicit user confirmation to modify CI/CD, then a validated workflow diff with no deployment/manual dispatch.
- Status: Blocked by explicit destructive-action safety rule.

## Commit sequence

1. Review and implementation-plan artifacts.
2. Patched dependency baseline.
3. Generated/bounded parser worker and static smoke.
4. Trail geometry and export frame synchronization.
5. Timeline coordinate/state consistency.
6. Journey and stale-import lifecycle.
7. Scene undo/keyboard normalization.
8. Encoder cleanup and feasible preset catalog.
9. Desktop settings, export labels, and development CSP as separate focused commits.
10. Journey naming/touch targets, Google guidance, Korean copy, and README corrections as separate focused commits.

Each commit will be signed and pushed only after its focused checks pass, with `git pull --rebase` immediately before `git push` as required by repository-wide user instructions.

## Required final gate matrix

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. `npm audit --audit-level=high`
5. `npm run build`
6. `npm run smoke:static`
7. `npm run test:e2e`
8. `npm run test:e2e:static:ci`

No warning or failure may be silently ignored. Gate-driven repairs are counted separately from review-plan fixes.

## Final implementation result

- Completed: P01–P12 and P14–P26 (25 authorized items covering 27 of the 31 aggregate findings).
- Evidence-deferred: P13, because representative low-end/mobile hardware is not available in this environment and the review identified a measurement risk rather than a confirmed defect.
- Blocked by required legal input: P27; the intended license, copyright holder, and year/range remain unknown, so no license claim was invented.
- Blocked by required CI/CD authorization: P28; `.github/workflows/deploy-pages.yml` remains unchanged.
- Deployment: none. No deploy command, manual workflow dispatch, or production mutation was performed.

### Final gate evidence on the implementation head

1. `npm run lint` — passed with no findings.
2. `npm run typecheck` — passed after generating current Next route types.
3. `npm run test` — 12 files and 266 tests passed.
4. `npm audit --audit-level=high` — passed with zero vulnerabilities.
5. `npm run build` — passed on Next.js 16.2.10; generated-worker drift check, TypeScript, static generation, and postbuild CSP hardening across three HTML files all passed.
6. `npm run smoke:static` — passed against the hardened static export.
7. `npm run test:e2e` — 82 passed, one explicitly opt-in real-encoder case skipped, zero failed, in 5.3 minutes.
8. `npm run test:e2e:static:ci` — static smoke passed, then 82 production-static cases passed, the same opt-in encoder case skipped, and zero failed, in 4.6 minutes.

The opt-in production-static real-export gate was then run separately with `TRAVELBACK_REAL_EXPORT=1`: 1/1 passed in 55.1 seconds. It exercised WebCodecs and Mediabunny without the stub, forced the normal save-picker rejection/download fallback, confirmed one fallback attempt, downloaded more than 1 KiB, and verified the MP4 `ftyp` signature.

### Gate-driven repairs retained

- Corrected the inclusive two-point trim minimum uncovered by the complete browser matrix.
- Waited for observable MapLibre readiness before asserting antimeridian camera state.
- Replaced production-static assertions that depended on development-only debug hooks with equivalent public UI/security assertions while retaining deeper checks in development mode.
- Made the real-export harness wait for codec support, use an automatable save fallback, and assert the downloaded bytes.
- Rematerialized rendered map frames through a reusable CPU-backed canvas before encoding, preventing the reproduced Chromium `VideoEncoder.flush()` stall while preserving the requested output dimensions.
