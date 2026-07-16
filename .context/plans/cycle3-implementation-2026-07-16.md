# Cycle 3 Implementation Plan — 2026-07-16

Source: `.context/reviews/_aggregate.md` (11 new deduplicated findings against `3b6750f`, plus four carried-forward authority/input/evidence boundaries).

## Objective

Fix every authorized confirmed cycle-3 defect without deployment. Preserve the four carryovers until their explicit CI/CD authorization, legal input, or representative-device evidence exists.

## Rules and constraints

- No deployment command, manual workflow dispatch, production mutation, or CI/CD edit.
- Use `apply_patch` for authored edits and build tools only for mechanical generated output.
- Preserve unrelated user changes.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per commit. Before every push, run `git pull --rebase`, then push.
- Run focused regressions for each fix and the complete final gate matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes CI/CD modification.
- Do not invent license ownership, year, or legal terms.
- Do not claim representative-device performance evidence from browser emulation.
- The requested Ralph helper is not installed in this environment; execute this approved plan directly with equivalent regression-first sequencing.

## Wave 0 — Import, playback, and camera correctness

### P01 — Validate Google JSON records at every runtime boundary (AG3-04)

- Severity/confidence: Medium / High
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parse-utils.ts`, `src/lib/parser.test.ts`, `src/workers/trackParser.worker.test.ts`, generated worker artifact
- Work: introduce a non-null record guard and use it for outer and nested Google arrays/objects before every property access. Restrict optional number/date parsing to intentionally supported scalar types so booleans, arrays, and objects cannot become coordinates or timestamps. Skip malformed observations while retaining valid siblings and preserving format recognition, point budgets, and direct/worker parity.
- Acceptance: null/primitive entries in all five Google array families and nested point arrays never throw; malformed scalar coordinates/timestamps are ignored; valid siblings remain; direct parser and worker return identical tracks/error codes; generated worker is current.
- Status: Completed (`59a3d8e`).

### P02 — Make every playback endpoint reachable (AG3-05)

- Severity/confidence: Medium / High
- Files: `src/lib/interpolate.ts`, `src/lib/interpolate.test.ts`, downstream geometry/camera tests as needed
- Work: make clamped progress 1 return the final point even when its incoming cumulative edge is zero. For all-zero tracks, distribute progress deterministically in index space as discrete observations so playback can advance without interpolating a false line across segment breaks. Keep distance traveled/total truthful and derive only segment-local endpoint bearing.
- Acceptance: `[0,0]` reaches its last point at progress 1; `[0,d,d]` reaches the trailing singleton; intermediate all-zero progress advances deterministically without synthetic cross-gap coordinates; normal positive-distance, antimeridian, trail, and export endpoint tests remain green.
- Status: Completed (`82dacd6`).

### P03 — Keep camera anticipation inside the current segment (AG3-03)

- Severity/confidence: Medium / High
- Files: `src/lib/camera.ts`, `src/lib/camera.test.ts`, `src/components/MapView.tsx`, shared interpolation helpers/tests
- Work: derive the active segment's inclusive bounds from `segmentStartIndices`. Clamp distance-based default-follow and bird's-eye look-ahead to that segment; at its endpoint use the last distinct in-segment direction or a neutral hold, never a disconnected next segment.
- Acceptance: a fixture whose later segment lies across a conflicting bearing cannot influence anticipation before the break; both default follow and bird's-eye share the tested segment-local helper; continuous and antimeridian camera behavior remains unchanged.
- Status: Completed (`82dacd6`).

## Wave 1 — Export capability and gesture transactions

### P04 — Probe the selected encoder configuration (AG3-08)

- Severity/confidence: Medium / High
- Files: `src/lib/videoEncoder.ts`, `src/lib/videoEncoder.test.ts`, `src/components/ExportPanel.tsx`, focused browser coverage if needed
- Work: replace generic `canEncode` with Mediabunny `canEncodeVideo`, passing the selected width, height, and clamped bitrate in bps. Key support state by that exact configuration so a stale successful probe cannot enable a changed preset/quality while the new check is pending.
- Acceptance: the probe receives the same dimensions/bitrate used by the export pipeline; changing resolution/quality invalidates the old status; a generally supported codec that rejects the selected configuration remains disabled; local export test mode and runtime error handling remain intact.
- Status: Completed (`05d2a23`).

### P05 — Settle waypoint drag outside the map (AG3-01)

- Severity/confidence: Medium / High
- Files: `src/components/JourneyCreator.tsx`, `src/components/JourneyCreator.test.ts` and/or focused browser coverage
- Work: give the active waypoint drag explicit window/document terminal ownership. Route map mouse/touch ends, outside release, cancellation, blur, style cleanup, and unmount through one idempotent function that removes transient listeners, clears the active index, restores the cursor, and re-enables `dragPan`.
- Acceptance: releasing over the Journey Creator panel or outside the canvas settles once; later hover cannot move the waypoint; pan is restored; normal mouse/touch drags and style reload cleanup remain correct.
- Status: Completed (`787f03d`).

### P06 — Cancel timeline gestures and eliminate idle rAF churn (AG3-02, AG3-06)

- Severity/confidence: Medium / High and Low / High
- Files: `src/components/TimelineSelector.tsx`, `src/components/TimelineSelector.test.ts`, focused mobile E2E coverage
- Work: add an explicit cancel path that restores origin ratios, cancels pending rAF, clears all transient refs, and never notifies the parent. Wire it to `touchcancel` and blur (or consolidate onto pointer capture). Reject global move events immediately when no drag is active.
- Acceptance: touch cancel and blur restore the accepted/origin range; a later unrelated gesture cannot mutate or commit it; ordinary end commits once; idle window movement schedules no animation frame.
- Status: Completed (`34464fd`).

### P07 — Clear cancelled export-sheet swipes (AG3-10)

- Severity/confidence: Low / High
- Files: `src/components/ExportPanel.tsx`, focused browser coverage
- Work: clear `touchStartRef` on `touchcancel`, close, and unmount while preserving the existing header-only, vertical-dominant dismissal rule.
- Acceptance: a cancelled header swipe followed by a cross-boundary touch end keeps the dialog open; a fresh qualifying downward swipe still closes it.
- Status: Completed (`05d2a23`).

## Wave 2 — Hot path and user-facing truth

### P08 — Keep the playback hotkey listener stable (AG3-07)

- Severity/confidence: Low / High
- Files: `src/app/page.tsx`, focused hook coverage if practical
- Work: memoize page-owned export/help/close hotkey callbacks so playback progress renders do not change effect dependencies or reinstall the global listener.
- Acceptance: progress-only rerenders keep callback identities/listener registration stable; all current hotkeys and panel-close behavior remain correct.
- Status: Completed (`3bc8768`).

### P09 — Tell picker-cancelled users that the video is unsaved (AG3-09)

- Severity/confidence: Medium / High
- Files: `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`, `src/lib/i18n.test.ts`, E2E coverage
- Work: rewrite every locale's ready-state description to state that rendering succeeded but saving did not, directing users to Download MP4 (and Share where available). Hide post-download platform tips while `downloadMethod === 'ready'`.
- Acceptance: an aborted save picker reaches `Video ready`, keeps the blob/download link, explicitly says it is not saved, never recommends rerendering, and does not claim a file exists in Downloads.
- Status: Completed (`05d2a23`).

### P10 — Remove duplicated estimation wording (AG3-11)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, `src/lib/i18n.test.ts`
- Work: use `Estimated time:`, `所要時間の目安:`, and `Tiempo estimado:` while retaining the reviewed Korean and Chinese phrases.
- Acceptance: all five locale values match the reviewed fixture, placeholders/key parity remain unchanged, and export copy is natural in each affected language.
- Status: Completed (`05d2a23`).

## Carried-forward blocked work

### B01 — Add the unit test gate to Pages CI (CARRY-01)

- Original severity/confidence: High / High
- Exact file/scope: `.github/workflows/deploy-pages.yml:26-32`
- Block reason: the user-level destructive-action rule classifies CI/CD modification as destructive and requires explicit confirmation before the specific edit. The current request says no deployment but does not grant CI modification authority.
- Exit criterion: the user explicitly authorizes editing the workflow; add `npm test` to the build job and validate the workflow without dispatching or deploying.
- Status: Blocked; no file edit authorized.

### B02 — Narrow Pages workflow permissions (CARRY-02)

- Original severity/confidence: Medium / High
- Exact file/scope: `.github/workflows/deploy-pages.yml:8-45`
- Block reason: same explicit CI/CD authorization boundary as B01.
- Exit criterion: the user explicitly authorizes the workflow edit; remove inherited build-job writes and grant Pages/OIDC writes only to deploy, validating syntax without dispatch or deployment.
- Status: Blocked; no file edit authorized.

### B03 — Resolve the missing license grant (CARRY-03)

- Original severity/confidence: Medium / High
- Exact file/scope: `README.md:224-226`, absent root `LICENSE`
- Block reason: the intended license, holder, and year/range are legal facts unavailable in the repository; inventing them would be unsafe.
- Exit criterion: the user supplies the exact license and attribution, then add that grant or correct the README claim.
- Status: Blocked by required legal input.

### B04 — Measure `preserveDrawingBuffer` on representative hardware (CARRY-04)

- Original severity/confidence: Medium / Medium
- Exact file/scope: `src/components/MapView.tsx:586-591`
- Block reason: this is an evidence requirement, not a confirmed correctness defect. Desktop/mobile emulation cannot establish real GPU, memory, battery, or thermal cost.
- Exit criterion: record comparative p50/p95 frame time and memory on representative low-end/mobile hardware; isolate export capture if the impact is material.
- Status: Evidence-blocked; no production change justified.

## Gate warning retained for follow-up

### W01 — Static timeline keyboard propagation had one retry-only failure

- Original gate-observation severity/confidence: Low / Low.
- Exact scope: `e2e/travelback.spec.ts:961-999`; the existing timeline-handle keyboard containment is in `src/components/TimelineSelector.tsx:576-648`.
- Evidence: the first attempt inside `npm run test:e2e:static:ci` observed two bubbled `ArrowLeft` events where the assertion expected zero. Playwright's configured retry passed and the full static command exited zero. The same test passed in the full dev suite, then passed 5/5 in a production-static repeat with retries disabled. Cycle 3 changed drag cancellation/global movement handling but did not change the handle keyboard handlers.
- Disposition: evidence-watch only. The isolated first-attempt result is not reproducible enough to justify an unrelated focus/keyboard patch, and it is not silently treated as absent.
- Reopen criterion: reopen immediately if this assertion fails once in a retries-disabled 10-run static sample or recurs in two CI runs. Capture a Playwright trace that records the focused element after every key before changing the handler.

## Commit sequence

1. Review aggregate, role artifacts, plan, and plan index.
2. Google parser runtime-shape and scalar-validation contract plus generated worker.
3. Playback endpoint and segment-local camera semantics.
4. Configuration-aware codec discovery.
5. Journey Creator outside-map drag settlement.
6. Timeline cancellation and idle-rAF cleanup.
7. Export swipe cancellation.
8. Stable playback-hotkey callbacks.
9. Picker-cancelled save guidance and estimated-time copy.
10. Gate-driven repairs, each in its own signed commit if any gate uncovers a new defect.

Each commit is pushed only after focused checks pass and `git pull --rebase` runs immediately before `git push`, as required by the repository-wide instructions.

## Required final gate matrix

1. `npm run lint` — passed; ESLint clean.
2. `npm run typecheck` — passed.
3. `npm run test` — 352 tests passed across 15 files.
4. `npm audit --audit-level=high` — passed with zero vulnerabilities.
5. `npm run build` — passed with Next.js 16.2.10; four static pages generated and three emitted HTML files hardened.
6. `npm run smoke:static` — passed.
7. `npm run test:e2e` — 87 passed, one expected opt-in real-export skip, zero failures.
8. `npm run test:e2e:static:ci` — static smoke passed; 86 passed, one expected opt-in skip, and W01 passed its configured retry. The command exited zero; the exact W01 test then passed 5/5 with retries disabled.

The additional production-static real WebCodecs/Mediabunny MP4 smoke passed 1/1 after the six source commits. Independent implementation review found one duplicate-endpoint bearing regression before the full matrix; the segment-bounded repair passed re-review plus 130 focused interpolation/camera tests. All 10 plan items covering the 11 new findings are complete. The four carryovers and W01 retain their explicit exit/reopen criteria. No deployment command was run.
