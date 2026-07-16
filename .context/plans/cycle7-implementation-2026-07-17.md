# Cycle 7 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` (9 actionable findings against `2df1516`, 4 authority/legal/evidence-gated carryovers, and 4 measured performance deferrals).

## Objective

Implement every authorized Cycle 7 finding without deployment, preserve the known work that requires new authority or external evidence, and retain the user's final-cleanup instruction for the loop's final stop condition. No recorded run-created path is deleted during this cycle.

## Rules and constraints

- No deployment command, workflow dispatch, CI/CD edit, production mutation, deletion, or pre-existing process termination.
- Remain on `codex/review-plan-fix-2026-07-16`; never switch to or push `main`.
- Do not contact or interfere with port 3114 or the live process recorded by the primary worktree's `.next/dev/lock`.
- Use `apply_patch` for authored edits and preserve unrelated user changes.
- Create one coherent GPG-signed Conventional Commit + gitmoji commit per finding. Run `git pull --rebase` before each push, verify signatures, and push only the named review branch.
- Run focused regressions for each fix and the complete configured matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- Run the production-static real-WebCodecs export with `TRAVELBACK_REAL_EXPORT=1` and Playwright retries disabled; require an MP4 larger than 1 KiB containing an `ftyp` box.
- Run build/browser gates from an isolated exact-HEAD mirror. Record every new mirror/artifact in `.context/plans/user-injected/pending-next-cycle.md` immediately and never delete it during the active loop.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes that destructive CI/CD edit. Do not infer license facts or substitute emulation for representative-device performance evidence.
- The requested Ralph helper is not installed. Execute this approved regression-first plan persistently through the review-plan-fix fallback, recording status and gate-driven repairs here.

## Wave 0 — Canonical trip data fidelity

### P01 — Preserve producer order for partially timestamped Google data (AG7-01)

- Severity/confidence: Medium / High
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parser.test.ts`, `src/workers/trackParser.worker.test.ts`, generated worker
- Work: chronologically sort points only when every retained point in the segment has a valid timestamp. Sort segments only when every retained segment is fully comparable; otherwise preserve producer order for the whole comparison domain. Keep stable chronological sorting and deduplication for fully timed data. Regenerate the worker from the shared source.
- Acceptance: mixed valid/missing/empty/invalid timestamps preserve source point and segment order through direct and worker transports; fully timed out-of-order records remain chronological; generated-worker parity passes.
- Focused verification: parser and worker suites, `npm run build:worker`, `npm run check:worker`, lint, and typecheck.
- Status: Pending.

### P02 — Preserve missing elevation as gaps (AG7-02)

- Severity/confidence: Medium / High
- Files: `src/components/ElevationProfile.tsx`, a focused ElevationProfile test, existing invalid-elevation browser coverage
- Work: extract deterministic elevation geometry construction that emits separate SVG subpaths for contiguous valid runs. Do not substitute the minimum for missing leading, interior, or trailing samples. Keep finite min/max labels and distance-proportional x positions.
- Acceptance: missing samples never produce vertices at an invented elevation; leading/trailing gaps are omitted; an interior gap separates paths; all-valid tracks preserve the existing profile; zero-distance and single-valid-run inputs remain finite.
- Focused verification: new pure/component geometry tests, existing invalid-elevation E2E, lint, and typecheck.
- Status: Pending.

## Wave 1 — Interaction and accessibility ownership

### P03 — Move desktop Help out of the bottom stack's hit region (AG7-03)

- Severity/confidence: Medium / High
- Files: `src/components/KeyboardHelp.tsx`, `src/components/TrackToolbar.tsx`, `src/app/page.tsx`, `e2e/travelback.spec.ts`
- Work: make `KeyboardHelp` own only the dialog and place the desktop Help trigger in the loaded TrackToolbar, while retaining the mobile More-menu action. Remove the independently bottom-positioned duplicate so one normal layout owner determines pointer order.
- Acceptance: at 1440×1000, Help and the composed bottom stack do not intersect; Help's center hit resolves to Help/a descendant; a real click opens Keyboard Shortcuts; playback/elevation progress does not move. Mobile More → Help and dialog focus restoration still pass.
- Focused verification: retries-disabled static E2E for desktop hit ownership and mobile Help, plus lint/typecheck.
- Status: Pending.

### P04 — Render segmented-unit focus inside clipped groups (AG7-04)

- Severity/confidence: Medium / High
- Files: `src/components/GlobalToolbar.tsx`, `src/components/TrackToolbar.tsx`, `src/styles/vitro-base.css`, `e2e/travelback.spec.ts`
- Work: add a shared segmented-control button class whose `:focus-visible` treatment paints a complete two-tone high-contrast ring inside the button. Apply it to both desktop and mobile unit selectors while retaining joined clipped corners, pressed fill, and the 44px target.
- Acceptance: first/last unit segments in both placements show a complete internal computed focus treatment in selected and unselected states; keyboard activation and `aria-pressed` continue to work in light and dark themes.
- Focused verification: retries-disabled browser focus regression, lint, and typecheck.
- Status: Pending.

### P05 — Announce timeline endpoint dates and times (AG7-05)

- Severity/confidence: Medium / High
- Files: `src/components/TimelineSelector.tsx`, `src/components/TimelineSelector.test.ts`, `e2e/travelback.spec.ts`
- Work: include each resolved, locale-formatted endpoint date/time in the corresponding thumb's `aria-valuetext`, with concise endpoint/percentage context. Keep the existing localized percentage-only fallback when no timestamp exists.
- Acceptance: initial and keyboard-updated values contain the same localized date/time shown for the selected endpoint; a timeless track exposes a meaningful percentage fallback; range min/max and keyboard trimming semantics remain unchanged.
- Focused verification: TimelineSelector component suite, a browser assertion comparing accessible value with rendered date text before/after keyboard movement, lint, and typecheck.
- Status: Pending.

## Wave 2 — Localized feedback and guide truthfulness

### P06 — Make scene-warning interpolation opaque (AG7-06)

- Severity/confidence: Low / High
- Files: `src/components/SceneEditor.tsx`, `src/components/SceneEditor.test.ts`
- Work: replace the serial placeholder mutations with one pass over the untouched locale template, mapping only recognized template tokens. Preserve braces and other valid user text as literal content.
- Acceptance: scene names `{from}` and `{to}` remain unchanged while the actual numeric placeholders resolve exactly once in both visible warning and polite live status; all ordinary five-locale templates remain correct.
- Focused verification: SceneEditor and i18n suites, lint, and typecheck.
- Status: Pending.

### P07 — Render localized guide illustrations (AG7-07)

- Severity/confidence: Low / High
- Files: `src/components/GoogleGuide.tsx`, a focused GoogleGuide/browser regression
- Work: use the existing locale-owned code-native `GuideIllustration` for Phone and Takeout instead of the English-text static images. Remove now-unused consumer imports/state but retain public assets on disk because deletion is not authorized.
- Acceptance: Korean, Japanese, Chinese, and Spanish guide panels no longer lead with English instructional art; the English path remains clear; all guide tabs, arrow navigation, and modal behavior remain intact.
- Focused verification: rendered Korean guide assertion (inline localized SVG, no English static image consumer), i18n suite, lint, and typecheck.
- Status: Pending.

### P08 — Centralize enforceable import-size policy and copy (AG7-08)

- Severity/confidence: Low / High
- Files: `src/lib/parse-utils.ts`, `src/lib/parser.ts`, `src/components/FileUpload.tsx`, `src/components/GoogleGuide.tsx`, `src/lib/i18n.ts`, focused parser/FileUpload/i18n tests
- Work: expose typed JSON/XML policy metadata with maximum and below-limit warning thresholds; derive legacy exported constants and FileUpload warning behavior from it. Change all five guide strings to use format-specific placeholder limits and explain that near-limit accepted files may take longer.
- Acceptance: JSON above 100 MiB and XML above 4 MiB remain rejected; warnings occur only for accepted near-limit files; rendered guide copy names both enforceable limits in every locale; one policy-consistency test prevents drift.
- Focused verification: parser, FileUpload, and i18n suites, lint, typecheck, and static smoke.
- Status: Pending.

### P09 — Remove the stale Next.js 15 maintenance claim (AG7-09)

- Severity/confidence: Low / High
- File: `scripts/harden-static-export.mjs`
- Work: describe the matched serialization shape as repository-current static output guarded by hardening/smoke assertions, without pinning the explanatory comment to an obsolete major.
- Acceptance: the comment is accurate for the current Next 16 toolchain and the fail-closed guard remains byte-for-byte functional.
- Focused verification: `node --check scripts/harden-static-export.mjs`, build, and static smoke.
- Status: Pending.

## Carried-forward blocked work

### B01 — Add the unit test gate to Pages CI

- Severity/confidence: High / High
- Scope: `.github/workflows/deploy-pages.yml:26-32`
- Block: CI/CD modification requires explicit user confirmation. Exit: authorize the edit; add `npm test`, validate syntax, and do not dispatch or deploy.

### B02 — Narrow Pages workflow permissions

- Severity/confidence: Medium / High
- Scope: `.github/workflows/deploy-pages.yml:8-45`
- Block: same CI/CD authority boundary. Exit: authorize the edit; scope read access to build and Pages/OIDC writes to deploy only.

### B03 — Resolve the README MIT claim without a root grant

- Severity/confidence: Medium / High
- Scope: `README.md:225-227`, absent root `LICENSE`
- Block: repository does not establish intended license, holder, or year. Exit: owner provides exact legal intent and attribution.

### B04 — Measure preserved WebGL buffers on representative hardware

- Severity/confidence: Medium / Medium
- Scope: `src/components/MapView.tsx:920-930`
- Block: emulation cannot establish GPU, memory, battery, or thermal cost. Exit: representative comparative p50/p95 frame/memory plus battery/thermal evidence.

## Carried-forward performance deferrals

- **D01 — High/High:** profile and isolate broad root playback-progress updates while preserving seek, camera, scenes, and export.
- **D02 — Medium/High:** profile and distance-downsample elevation paths with endpoint/extrema guarantees. P02 changes missing-data correctness only and does not perform this redesign.
- **D03 — Medium/High:** measure and replace O(n) waypoint-drag preview scans with incremental or throttled work plus exact terminal reconciliation.
- **D04 — Medium/High:** profile the second per-frame export idle wait and change it only after proving redundancy.

## Retained user-injected final-cleanup instruction

### U-2026-07-17-01 — Final cleanup of run-created trees

- User wording (verbatim): “지금 많은 tree 만들어져있는데 모두 잘 정리하고 마무리해 끝날때.”
- Status: Ingested previously and retained for the loop's final stop condition. It is not current Cycle 7 implementation work and is not complete.
- Required behavior: remove only temporary worktrees, validation mirrors, copied trees, and artifacts proven to have been created by this review-plan-fix run. Preserve primary, pre-existing, and user-owned trees and repository data. Do not stop processes to clean up.
- Recorded paths: `/tmp/travelback-cycle5-recovery.KMkGf7`, `/tmp/travelback-cycle5-recovery.x0nOJV`, `/Users/hletrd/flash-shared/Travelback-cycle5-recovery.3ZvbIj`, `/tmp/travelback-cycle6-browser.tMtY4J`, `/tmp/travelback-cycle6-static.10O3N4`, `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-77834f04e42c1f49ba6c236505512ebd.log`, `/tmp/travelback-cycle6-focused.0jw7ns`, `/tmp/travelback-cycle6-gates.IzOqfp`, `/tmp/travelback-cycle7-browser-state.json`, `/tmp/travelback-cycle7-a11y-baseline.txt`, `/tmp/travelback-cycle7-static-server.mjs`, `/tmp/travelback-cycle7-focused.Im7MbJ`, `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-35199d5637ccdb78dc5bc086890c807f.log`, `/tmp/travelback-cycle7-focused-copy.8mgPDR`, and `/tmp/travelback-cycle7-gates.Osfw8C`.
- No listed path is deleted during Cycle 7. Append every later Cycle 7 validation path before it is used.

## Required final gate matrix

1. `npm run lint`.
2. `npm run typecheck`.
3. `npm run test`.
4. `npm audit --audit-level=high`.
5. `npm run build`.
6. `npm run smoke:static`.
7. `npm run test:e2e`.
8. `npm run test:e2e:static:ci`.
9. Production-static real-MP4 smoke with `TRAVELBACK_REAL_EXPORT=1`, retries disabled, output >1 KiB, and `ftyp` asserted.

## Completion gate

Pending. P01-P09 must be implemented and pushed in focused signed commits, all focused regressions and the full matrix must pass, and no deployment, destructive cleanup, CI/CD edit, or pre-existing process/port action may occur.
