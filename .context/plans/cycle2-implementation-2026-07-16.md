# Cycle 2 Implementation Plan — 2026-07-16

Source: `.context/reviews/_aggregate.md` (19 new deduplicated findings against `cc6f24f`, plus four carried-forward authority/input/evidence boundaries).

## Objective

Fix every authorized confirmed cycle-2 defect without deployment. Preserve the four carryovers as explicit blocked work until their stated authorization, legal input, or representative-device evidence exists.

## Rules and constraints

- No deployment command, manual workflow dispatch, production mutation, or CI/CD edit.
- Use `apply_patch` for authored edits and package/build tools only for mechanical generated output.
- Preserve unrelated user changes.
- Create GPG-signed Conventional Commit + gitmoji commits, one coherent fix per commit. Before every push, run `git pull --rebase`, then push.
- Run focused regressions for each fix and the complete final gate matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes CI/CD modification.
- Do not invent license ownership, year, or legal terms.
- Do not claim representative-device performance evidence from browser emulation.
- The requested Ralph helper is not installed in this environment; execute the approved plan directly with equivalent regression-first sequencing.

## Wave 0 — Review and security baseline

### P01 — Publish a bounded completed trail (AG2-01)

- Severity/confidence: High / High
- Files: `src/lib/map-geometry.ts`, `src/lib/map-geometry.test.ts`, `src/components/MapView.tsx`, targeted browser coverage
- Work: partition route edges into immutable bounded chunks, publish completed chunks without reconstructing a growing prefix, and keep only the current chunk/head mutable. Reset all chunk/filter state on route, style, and session replacement.
- Acceptance: a dense 250,000-point structural regression proves the active publication remains bounded and completed publication grows by chunk count rather than cumulative prefix length; antimeridian, singleton, interpolated-head, and final-endpoint behavior remains correct.
- Status: Completed (`30d2066`).

### P02 — Place CSP before executable head content (AG2-13)

- Severity/confidence: Medium / High
- Files: `src/app/layout.tsx`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, relevant tests
- Work: provide an early CSP anchor and make postbuild hardening remove/reinsert the hardened meta immediately after `<head>`. Recursively validate every emitted HTML file.
- Acceptance: each generated page has exactly one hardened CSP meta before every script, stylesheet, style element, module preload, or other active head content; build and static smoke pass without weakening directives.
- Status: Completed (`7dd3204`).

### P03 — Refresh the latest-compatible dependency baseline (AG2-14)

- Severity/confidence: Low / High
- Files: `package.json`, `package-lock.json`, compatibility fixes only if required
- Work: update compatible direct dependencies to registry-current stable releases verified on 2026-07-16. React 19.2.7, MapLibre GL 5.24.0, Lucide React 1.24.0, Playwright 1.61.1, and Tailwind 4.3.2 were current and compatible. ESLint 10.7.0 and TypeScript 7.0.2 were evaluated but rejected because the stable Next lint peer tree requires ESLint 9 and `typescript-eslint` 8.64.0 requires TypeScript below 6.1; use ESLint 9.39.5 and TypeScript 6.0.3 as the newest peer-compatible releases. Align `@types/node` to the Node 24 line rather than the unrelated Node 26 line.
- Acceptance: manifest and lock agree, `npm audit --audit-level=high` reports zero vulnerabilities, and the complete gate matrix passes. Any compatibility adjustment stays narrowly attributable to the upgrade.
- Status: Completed (`ca645b4`).

## Wave 1 — Async session and export lifecycle

### P04 — Make sample loading lose stale races (AG2-02)

- Severity/confidence: Medium / High
- Files: `src/app/page.tsx`, `src/components/FileUpload.tsx`, `src/lib/parser.ts`, unit/E2E coverage
- Work: give page-owned async producers one generation plus `AbortController` boundary. Invalidate an in-flight sample as soon as file import or Draw Route starts, when another sample starts, and on session/unmount replacement; pass the signal through parsing and guard every completion by generation.
- Acceptance: a delayed sample cannot overwrite a newer imported or manual journey; only the winning request changes track/session state; abort and cleanup remain once-only.
- Status: Completed (`7bf9c56`).

### P05 — Bound output finalization (AG2-04)

- Severity/confidence: Medium / High
- Files: `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `src/lib/i18n.ts`, unit/E2E coverage
- Work: race `Output.finalize()` at the caller boundary against the export signal and a documented deadline, attach handling to the underlying promise, add a distinct timeout error contract and localized feedback, and recheck abort state before blob/download completion. Do not claim dependency-level cancellation after Mediabunny enters `finalizing`.
- Acceptance: never-resolving finalizer tests settle through abort and timeout, no unhandled rejection occurs if the underlying promise settles later, successful finalization remains once-only, and cancelled output is never offered for download.
- Status: Completed (`32bb40e`).

### P06 — Restore the export mounted flag in every effect setup (AG2-08)

- Severity/confidence: Medium / High
- Files: `src/lib/useExportController.ts`, focused hook/component coverage
- Work: set `mountedRef.current = true` in effect setup and retain false/abort cleanup, matching the working playback-controller lifecycle.
- Acceptance: the React development setup-cleanup-setup probe leaves the active effect mounted, while real cleanup prevents late state updates and aborts in-flight export work.
- Status: Completed (`3c20416`).

### P07 — Report actual-file share rejection (AG2-10)

- Severity/confidence: Low / High
- Files: `src/components/ExportPanel.tsx`, E2E coverage
- Work: when `navigator.canShare({ files: [actualMp4] })` is false, set the existing localized share fallback instead of returning silently.
- Acceptance: a browser mock that accepts the initial capability probe but rejects the real file produces visible feedback and leaves download available.
- Status: Completed (`39ab86d`).

### P08 — Keep focus inside the completed export dialog (AG2-12)

- Severity/confidence: Low / High
- Files: `src/components/ExportPanel.tsx`, E2E coverage
- Work: give the success heading a programmatic focus target and focus it when the form subtree is replaced by completion content.
- Acceptance: after export completion, `document.activeElement` remains within the dialog on a meaningful success/result element; keyboard actions remain reachable.
- Status: Completed (`b6b810a`).

## Wave 2 — Timeline and scene interaction correctness

### P09 — Express timeline constraints in distance-ratio space (AG2-03)

- Severity/confidence: Medium / High
- Files: `src/components/TimelineSelector.tsx`, extracted pure helper/tests, E2E coverage
- Work: derive the minimum selectable ratio gap from adjacent cumulative-distance ratios, with an explicit zero-distance/plateau fallback, and use that same domain for pointer and keyboard constraints. Replace point-count and hard-coded `0.01` gaps.
- Acceptance: `[0, 1, 1000]` can select its first valid adjacent pair; duplicate-distance plateaus and two-point routes normalize deterministically; pointer and keyboard paths agree.
- Status: Completed (`cc2744e`).

### P10 — Remove the time-wide keyboard suppression guard (AG2-06)

- Severity/confidence: Medium / High
- Files: `src/components/TimelineSelector.tsx`, E2E coverage
- Work: remove the three-second window-level key listener/ref/constants and contain handled key events at the originating timeline handle using normal event propagation controls.
- Acceptance: a timeline arrow action changes the intended handle once, and immediately focusing another control allows its arrow keys without delay or suppression.
- Status: Completed (`89b27ea`).

### P11 — Restore deleted scenes without rewriting later edits (AG2-05)

- Severity/confidence: Medium / High
- Files: `src/components/SceneEditor.tsx`, pure camera/range helper and tests, `src/lib/i18n.ts`, E2E coverage
- Work: reinsert the deleted scene into the currently available gap, clipping only the restored range as needed. If no valid minimum-duration gap remains, reject that undo with localized feedback. Preserve current neighbors, ordering, camera, name, and all later work.
- Acceptance: delete → edit overlapping neighbor → undo never moves the edited neighbor; restoration either uses a valid current gap or reports why it cannot restore.
- Status: Completed (`7f63bf3`).

### P12 — Scope mobile scene dismissal to a header handle (AG2-07)

- Severity/confidence: Medium / High
- Files: `src/components/SceneEditor.tsx`, mobile E2E coverage
- Work: start swipe-to-dismiss only on a dedicated, accessible header/handle region and reject interactive descendants; keep horizontal sliders and range controls outside that recognizer.
- Acceptance: real touch drags on every horizontal scene control keep the editor open, while a qualifying header swipe still dismisses it.
- Status: Completed (`d2c8f75`).

### P13 — Unify pointer cancellation cleanup (AG2-09)

- Severity/confidence: Low / High
- Files: `src/components/SceneEditor.tsx`, focused tests/E2E
- Work: use pointer capture and route `pointerup`, `pointercancel`, lost capture, and window blur through one idempotent finish/cancel boundary. A cancelled gesture restores or safely normalizes the pre-gesture range.
- Acceptance: cancellation cannot leave stale drag state, listeners, or capture; the next drag begins normally and committed edits still normalize once.
- Status: Completed (`c153834`).

## Wave 3 — Parser contract and user-facing truth

### P14 — Reject non-container JSON roots intentionally (AG2-11)

- Severity/confidence: Low / High
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parser.test.ts`, generated worker artifact
- Work: validate the parsed root before format discovery and return the stable unsupported-Google-format `ParseError` for `null` and primitive JSON values.
- Acceptance: direct and worker/generated paths return the same explicit error class/code for `null`, strings, numbers, and booleans; no accidental `TypeError` escapes.
- Status: Completed (`83ff81f`).

### P15 — Remove unsupported Takeout duration promises (AG2-16)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, locale parity tests
- Work: replace numeric completion estimates in all five locales with an instruction to wait for Google's completion email.
- Acceptance: no locale promises a duration, meaning remains aligned across locales, and key parity/tests pass.
- Status: Completed (`d2a6654`).

### P16 — Correct malformed Korean, Japanese, and Chinese strings (AG2-18)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, locale tests
- Work: correct the Korean estimated-time label, Japanese add-one-point instruction, and Chinese estimated-time label while preserving tone and placeholders.
- Acceptance: the three phrases are grammatical and locale parity/tests pass.
- Status: Completed (`c37aa3b`). The `korean-naturalizer` skill was read and announced before editing the Korean phrase.

### P17 — Describe the Vitro stylesheet as adapted (AG2-17)

- Severity/confidence: Low / High
- File: `README.md`
- Work: replace the exact-copy claim with vendor-derived/adapted wording that acknowledges Travelback-specific theme and accessibility changes.
- Acceptance: documentation no longer encourages overwriting local adaptations with an upstream copy.
- Status: Completed (`94fe631`).

### P18 — Repair the Mediabunny acknowledgement link (AG2-19)

- Severity/confidence: Low / High
- File: `README.md`
- Work: point the acknowledgement at the canonical `Vanilagy/mediabunny` repository.
- Acceptance: the rendered link resolves to the maintained project.
- Status: Completed (`a202f0a`).

### P19 — Reconcile architecture docs with the implemented system (AG2-15)

- Severity/confidence: Medium / High
- Files: `.context/project/02-architecture.md`, `src/lib/videoEncoder.ts`
- Work: after P01/P05/P02, correct the Google-guide label, VideoSample/CPU-staging pipeline, repaint semantics, bounded trail complexity, trail-head/chunk layer inventory, and stale encoder source comment.
- Acceptance: each documented path matches current executable behavior and the trail complexity description reflects P01's actual bounds rather than merely renaming the prior defect.
- Status: Completed after its prerequisite code changes (`c7f526b`).

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

## Commit sequence

1. Review aggregate, role artifacts, plan, and plan index.
2. CSP placement and recursive emitted-HTML assertion.
3. Stale sample transaction boundary.
4. Timeline distance-domain constraints.
5. Timeline keyboard event containment.
6. Bounded trail publication.
7. Finalization deadline/abort contract.
8. Export mounted lifecycle.
9. Conflict-safe scene undo.
10. Scene-editor mobile swipe scoping.
11. Scene pointer cancellation.
12. Actual-file share feedback.
13. JSON root error contract.
14. Export completion focus.
15. Latest-compatible dependency baseline.
16. User-facing locale and README corrections in focused commits.
17. Architecture/source documentation reconciliation.
18. Gate-driven repairs, each in its own signed commit if any gate uncovers a new defect.

Each commit is pushed only after focused checks pass and `git pull --rebase` runs immediately before `git push`, as required by the repository-wide instructions.

## Required final gate matrix

1. `npm run lint` — passed.
2. `npm run typecheck` — passed with TypeScript 6.0.3.
3. `npm run test` — 295 tests passed across 14 files.
4. `npm audit --audit-level=high` — passed with zero vulnerabilities.
5. `npm run build` — passed; postbuild hardened three emitted HTML files.
6. `npm run smoke:static` — passed.
7. `npm run test:e2e` — 86 passed, one expected opt-in skip, zero failures.
8. `npm run test:e2e:static:ci` — static smoke plus 86 passed, one expected opt-in skip, zero failures.

The additional opt-in real WebCodecs/Mediabunny MP4 smoke passed 1/1. No gate-driven repair was required. All 19 scheduled findings were completed in focused signed commits; the four carryovers remain blocked on their documented authority, legal-input, or representative-device evidence boundaries. No deployment occurred.
