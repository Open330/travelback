# Cycle 10 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` (4 genuinely new roots, 3 reopened confirmed historical gaps, 2 formal manual-validation items, 4 authority/legal/evidence-gated carryovers, and 4 measured performance deferrals).

## Objective

Implement all seven authorized Cycle 10 items without deployment, preserve work that needs new authority or representative evidence, and retain the user's final-cleanup instruction for the loop's final stop condition. No recorded temporary path, browser session, or process is deleted or stopped during this cycle.

## Rules and constraints

- Remain on `codex/review-plan-fix-2026-07-16`; never switch to or push `main`.
- No deployment, workflow dispatch/edit, production mutation, external communication, publication, deletion, process termination, or interference with reserved/pre-existing ports 3114, 3106, 9323, or 48179.
- Do not reuse or stop the Cycle 10 exact-HEAD review server on port 4177 or its browser/process sessions. Use new isolated physical copies and unique ports for implementation browser work.
- Use `apply_patch` for authored edits and preserve unrelated user work.
- Add or strengthen a right-reason regression before each behavior change where mechanically observable. Do not add suppressions or weaken assertions.
- Create one coherent GPG-signed Conventional Commit + gitmoji commit per finding. Run `git pull --rebase` before every push, verify the signature, and push only the review branch.
- Record every new mirror/helper/artifact path and owned process/session in `.context/plans/user-injected/pending-next-cycle.md` immediately. Leave all such resources to natural bounded lifecycles.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes CI/CD changes. Do not infer license facts or substitute emulation for representative hardware.
- The requested Ralph helper is unavailable. Execute this approved regression-first plan through the documented review-plan-fix fallback and record focused/full verification here.
- Fully implemented prior plans remain indexed in place. Moving/deleting plan files is a destructive filesystem action and is not authorized in this cycle, so no physical archive operation is performed.

## Wave 0 — Playback and visualization correctness

### P01 — Rebase the active playback clock when seeking (AG10-01)

- Severity/confidence: Medium / High
- Files: `src/lib/usePlaybackController.ts`, new focused hook test under `src/lib/`, `e2e/travelback.spec.ts`
- Work: when `seekTo` runs during playback, update public progress, `progressRef`, `startProgressRef`, and `startTimestampRef` as one ownership transition. Clear or reconcile `awaitingFirstFrameRef` so a seek before the first callback survives. Seeking to 100% must settle playback at the endpoint instead of scheduling another stale frame.
- Acceptance: a seek before the first RAF and a seek during established playback both advance from the requested target; keyboard/range/elevation/timeline consumers keep playback active except at 100%; replay from the endpoint remains correct.
- Focused verification: fake-clock/fake-RAF hook cases for pre-first-frame, mid-playback, and endpoint; a retries-disabled browser case that seeks through the progress range while Pause is visible; lint/typecheck.
- Status: Pending.

### P02 — Split elevation geometry at track segment boundaries (AG10-02)

- Severity/confidence: Medium / High
- Files: `src/components/ElevationProfile.tsx`, `src/components/ElevationProfile.test.ts`, a segmented-elevation E2E fixture, `e2e/travelback.spec.ts`
- Work: extend `buildElevationGeometry` with normalized segment starts and end the current SVG run before each valid boundary sample. Preserve existing missing-elevation gaps, distance/index fallback behavior, finite one-point/flat geometry, and progress seeking.
- Acceptance: two valid-elevation segments generate two `M` line subpaths and independent area polygons; no zero-distance vertical bridge is drawn; existing all-valid and missing-elevation geometry stays stable.
- Focused verification: pure geometry tests plus a loaded segmented-elevation browser assertion; lint/typecheck.
- Status: Pending.

## Wave 1 — Parser output bounds and locale ownership

### P03 — Canonicalize and bound imported XML display names (AG10-03)

- Severity/confidence: Low / Medium
- Files: `src/lib/parse-utils.ts` or `src/lib/parser.ts`, `src/lib/parser.test.ts`
- Work: define one documented parser-boundary helper for GPX/KML names. Collapse controls and whitespace, treat empty/whitespace-only values as missing, and cap retained text at 256 Unicode code points without splitting surrogate pairs. Preserve source-provided names below the limit and existing format fallbacks.
- Acceptance: no parsed GPX/KML display name exceeds 256 code points; blank/control-heavy names use the established fallback; ordinary CJK/emoji names remain valid; visible/live-region consumers receive only the canonical value.
- Focused verification: table-driven GPX/KML tests for blank, whitespace/control-heavy, exact-boundary, over-limit, CJK, and emoji names; parser suite, lint/typecheck.
- Status: Pending. The runtime stall impact remains unmeasured, but security hardening is scheduled under the non-deferral rule.

### P04 — Localize manufactured GPX/KML/Google fallback names (R10-02)

- Severity/confidence: Medium / High
- Files: `src/types.ts`, `src/lib/parser.ts`, `src/lib/googleJsonParser.ts`, `src/lib/i18n.ts`, `src/lib/i18n.test.ts`, `src/app/page.tsx`, `src/components/TrackWorkspace.tsx`, parser/worker tests, `e2e/travelback.spec.ts`
- Work: add stable optional source/fallback metadata to `Track` without making parsers locale-dependent. Mark only manufactured GPX/KML/Google names, preserve explicit source names (including a real name equal to an English fallback), carry metadata through trimming/worker validation, and resolve display/live-status/export names through five-locale i18n.
- Acceptance: unnamed GPX, KML, and Google imports use locale-owned fallback copy; switching locale updates the title and live status; exported filenames use the current localized fallback; explicit source names remain opaque and unchanged; worker/main-thread parity remains intact.
- Focused verification: parser fallback-marker tests for all three sources, five-locale key/phrase tests, worker parity, and a retries-disabled Korean Google import/local-switch browser regression.
- Status: Pending.

## Wave 2 — Semantic hierarchy and mobile action geometry

### P05 — Preserve one level-one heading across landing and loaded states (R10-01)

- Severity/confidence: Medium / High (reopened from original Low/Medium `DF-R2-007`)
- Files: `src/components/FileUpload.tsx`, `src/components/TrackWorkspace.tsx`, `e2e/travelback.spec.ts`
- Work: promote the visible landing `Travelback` title to H1. Render the mutually exclusive responsive loaded track title as H1 so the same route retains exactly one accessible top-level heading after import without visual changes.
- Acceptance: landing exposes exactly one H1 named Travelback; the loaded workspace exposes exactly one visible/accessibility-tree H1 containing the track name at desktop and mobile widths; no heading-level skip is introduced in dialogs/panels.
- Focused verification: role/level queries in the shared landing and visible-track helpers across desktop/mobile; lint/typecheck.
- Status: Pending.

### P06 — Make Journey Creator Cancel finger-sized (AG10-04)

- Severity/confidence: Low / High
- Files: `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`
- Work: give the header Cancel action a minimum 44px width or equivalent padding, retain its 44px height, focus indicator, text, and header containment, and avoid falsely labeling the prior state a WCAG violation.
- Acceptance: Cancel measures at least 44×44px at 320, 390, and 430px mobile widths; the title/subtitle remain contained; cancel/discard-confirm behavior and focus remain unchanged.
- Focused verification: extend the existing coarse-pointer Journey Creator geometry test and run the focused journey cases; lint/typecheck.
- Status: Pending.

## Wave 3 — Truthful export completion

### P07 — Distinguish download-started from save-confirmed headings (R10-03)

- Severity/confidence: Medium / High
- Files: `src/components/ExportPanel.tsx`, `src/components/ExportPanel.test.ts`, `src/lib/i18n.ts`, `src/lib/i18n.test.ts`, `e2e/travelback.spec.ts`
- Work: make the existing `ready | fallback | picker` completion union exhaustive for heading copy. Add reviewed five-locale download-started heading text for fallback, reserve `export.success` for confirmed picker saves, retain ready copy after picker cancellation, and keep the accurate supporting paragraph, Download recovery action, and success-heading focus.
- Acceptance: `ready` never claims a download/save; `fallback` says download started but never saved; `picker` says saved only after `saved:true`; every branch retains a usable Download action and focused heading.
- Focused verification: table-driven rendered-state unit assertions for ready/fallback/picker plus existing picker-cancel/local-export E2E; i18n parity/phrase tests; lint/typecheck.
- Status: Pending.

## Formal manual-validation work

### M10-01 — Validate real iOS safe-area and dynamic browser chrome

- Severity/confidence: Low / Medium
- Scope: root viewport and loaded bottom stack on representative physical iPhones.
- Reason: Chromium emulation returned a zero inset and cannot establish Safari home-indicator/dynamic-chrome behavior.
- Exit: record portrait/landscape geometry with expanded/collapsed chrome. If any action is occluded, implement dynamic viewport and explicit safe-area ownership with a deterministic regression.
- Status: Deferred for representative physical-device evidence.

### M9-01 — Verify map-canvas focus-ring perceptibility

- Severity/confidence: Low / Medium
- Scope/exit: unchanged from the aggregate; representative zoom/theme/forced-colors visual evidence is required before an inset authored focus change.
- Status: Deferred for representative evidence.

## Carried-forward blocked work

- **B01 — High/High:** add `npm test` to Pages CI only after explicit CI/CD edit authorization.
- **B02 — Medium/High:** narrow Pages workflow permissions only after the same explicit authorization.
- **B03 — Medium/High:** resolve the README MIT claim only after the owner supplies intended license, holder, and year/range.
- **B04 — Medium/Medium:** change `preserveDrawingBuffer` only after representative GPU/memory/battery/thermal measurements.

## Carried-forward performance deferrals

- **D01 — High/High:** profile and isolate broad root playback-progress updates; P01 repairs correctness only.
- **D02 — Medium/High:** profile and distance-downsample elevation paths with endpoint/extrema guarantees; P02 repairs segment correctness only.
- **D03 — Medium/High:** measure and replace O(n) waypoint-drag preview scans with incremental or throttled work plus exact terminal reconciliation.
- **D04 — Medium/High:** profile the second per-frame export idle wait and change it only after proving redundancy.

## Retained user-injected final-cleanup instruction

### U-2026-07-17-01 — Final cleanup of run-created trees

- User wording (verbatim): “지금 많은 tree 만들어져있는데 모두 잘 정리하고 마무리해 끝날때.”
- Status: Ingested and retained for the loop's final stop condition. It is not current Cycle 10 implementation work and remains incomplete.
- Inventory authority: `.context/plans/user-injected/pending-next-cycle.md`, including every Cycle 10 copy, server/session/PID, browser session, screenshot, and trace.
- Required behavior: at the final loop stop only, remove resources proven to belong to this run after re-verifying provenance and primary-worktree health. Preserve all pre-existing/user-owned resources and do not stop processes to clean up.
- No listed resource is deleted or stopped during Cycle 10.

## Required final gate matrix

Run from a new exact-implementation-HEAD physical copy on unique, non-reserved ports, with every path/session inventoried before use:

1. `npm run lint`.
2. `npm run typecheck`.
3. `npm run test`.
4. `npm audit --audit-level=high`.
5. `npm run build`.
6. `npm run smoke:static`.
7. `npm run test:e2e` with one worker and retries disabled by configuration.
8. `npm run test:e2e:static:ci` with one worker and retries disabled by configuration.
9. Production-static real MP4 with `TRAVELBACK_REAL_EXPORT=1`, Playwright retries 0, one worker, output larger than 1 KiB, and `ftyp` at bytes 4–7.

## Completion gate

P01–P07 implemented in focused signed commits and pushed; every focused/full gate passes; gate-driven repairs are separately recorded and committed. M10-01, M9-01, B01–B04, D01–D04, and final cleanup retain their exact exit criteria and are not silently treated as complete. Deployment remains none.
