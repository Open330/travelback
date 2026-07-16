# Cycle 8 Implementation Plan — 2026-07-17

Source: `.context/reviews/_aggregate.md` (4 actionable findings against `81342b7`, 4 authority/legal/evidence-gated carryovers, and 4 measured performance deferrals).

## Objective

Implement every authorized Cycle 8 finding without deployment, preserve the known work that requires new authority or external evidence, and retain the user's final-cleanup instruction for the loop's final stop condition. No recorded run-created path is deleted during this cycle.

## Rules and constraints

- No deployment command, workflow dispatch, CI/CD edit, production mutation, deletion, or pre-existing process termination.
- Remain on `codex/review-plan-fix-2026-07-16`; never switch to or push `main`.
- Do not contact or interfere with ports 3114 or 3106 or any process owned outside this cycle.
- Use `apply_patch` for authored edits and preserve unrelated user changes.
- Create one coherent GPG-signed Conventional Commit + gitmoji commit per finding. Run `git pull --rebase` before each push, verify signatures, and push only the named review branch.
- Run focused regressions for each fix and the complete configured matrix: lint, typecheck, unit, high-severity audit, build, static smoke, dev E2E, and static E2E.
- Run the production-static real-WebCodecs export with `TRAVELBACK_REAL_EXPORT=1` and Playwright retries disabled; require an MP4 larger than 1 KiB containing an `ftyp` box.
- Run build/browser gates from an isolated exact-HEAD mirror. Record every new mirror/artifact in `.context/plans/user-injected/pending-next-cycle.md` immediately and never delete it during the active loop.
- `.github/workflows/deploy-pages.yml` remains read-only until the user explicitly authorizes that destructive CI/CD edit. Do not infer license facts or substitute emulation for representative-device performance evidence.
- The requested Ralph helper is not installed. Execute this approved regression-first plan persistently through the review-plan-fix fallback, recording status and gate-driven repairs here.

## Wave 0 — Canonical trip data fidelity

### P01 — Preserve untimed observations within a Google segment (AG8-01)

- Severity/confidence: Medium / High
- Files: `src/lib/googleJsonParser.ts`, `src/lib/parser.test.ts`, `src/workers/trackParser.worker.test.ts`, a same-segment upload fixture and `e2e/travelback.spec.ts`, generated worker
- Work: restrict exact-observation deduplication to points with a valid timestamp. Preserve all supported untimed occurrences, including non-adjacent same-coordinate returns, in producer order. Retain exact timed duplicate removal and regenerate the worker from shared source.
- Acceptance: one supported same-segment untimed A → B → A route remains exactly three points through direct parser, worker transport, and upload UI; exact duplicate timed observations remain deduplicated; semantic segments and point-budget protection remain unchanged.
- Focused verification: parser and worker suites, the focused upload regression, `npm run build:worker`, `npm run check:worker`, lint, and typecheck.
- Status: Pending.

## Wave 1 — Bounded gesture aftermath

### P02 — Expire post-drag point-click suppression (AG8-02)

- Severity/confidence: Medium / High
- Files: `src/components/JourneyCreator.tsx`, `src/components/JourneyCreator.test.ts`
- Work: replace the indefinite moved latch with bounded post-drag suppression for both generic-map and point-layer click handlers. Establish both deadlines when a real drag settles, retire movement state at the terminal event, and make immediate synthetic-click suppression independent of handler order.
- Acceptance: immediate post-drag generic and point clicks are ignored; suppression expires even when no synthetic click arrives; the first later intentional point click deletes the waypoint; click-only and cleanup/unmount paths remain correct.
- Focused verification: JourneyCreator component suite with controlled time and both handler orders, lint, and typecheck.
- Status: Pending.

## Wave 2 — Deterministic localized first load

### P03 — Hydrate locale from the static snapshot before resolving preference (AG8-03)

- Severity/confidence: Medium / High
- Files: `src/lib/i18n.ts`, a focused SSR/hydration regression
- Work: initialize `LocaleProvider` to deterministic English for both static render and hydration. After mount, resolve storage then browser preference, update provider state and `document.lang`, and keep explicit locale changes persisted and reflected in the document.
- Acceptance: a Korean navigator and a stored supported locale hydrate the English static provider tree without a mismatch diagnostic, then show the preferred locale and matching `document.lang`; unsupported preferences still fall back to English; explicit switching remains stable.
- Focused verification: direct `renderToString` → `hydrateRoot` tests using the real provider, existing i18n suite, lint, and typecheck.
- Status: Pending.

### P04 — Correct reviewed Spanish timeline language (AG8-04)

- Severity/confidence: Low / High
- Files: `src/lib/i18n.ts`, `src/lib/i18n.test.ts`
- Work: change `datos del cronología` to `datos de la cronología` and the mixed-language reset label to `Restablecer intervalo de la línea de tiempo`.
- Acceptance: both production strings are publication-quality Spanish and are pinned by reviewed-phrase assertions; all five locale dictionaries remain structurally complete.
- Focused verification: i18n suite, lint, and typecheck.
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
- **D02 — Medium/High:** profile and distance-downsample elevation paths with endpoint/extrema guarantees.
- **D03 — Medium/High:** measure and replace O(n) waypoint-drag preview scans with incremental or throttled work plus exact terminal reconciliation. P02 changes correctness only and does not perform this redesign.
- **D04 — Medium/High:** profile the second per-frame export idle wait and change it only after proving redundancy.

## Retained user-injected final-cleanup instruction

### U-2026-07-17-01 — Final cleanup of run-created trees

- User wording (verbatim): “지금 많은 tree 만들어져있는데 모두 잘 정리하고 마무리해 끝날때.”
- Status: Ingested and retained for the loop's final stop condition. It is not current Cycle 8 implementation work and is not complete.
- Required behavior: remove only temporary worktrees, validation mirrors, copied trees, and artifacts proven to have been created by this review-plan-fix run. Preserve primary, pre-existing, and user-owned trees and repository data. Do not stop processes to clean up.
- Inventory authority: `.context/plans/user-injected/pending-next-cycle.md`. Cycle 8 review created no new temporary filesystem path. Append every later Cycle 8 validation path immediately before it is used.
- No listed path is deleted during Cycle 8.

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

Pending. Complete only after P01-P04, all focused regressions, the full configured gate matrix, and the clean retries-disabled real-MP4 smoke pass on the named review branch. Preserve B01-B04 and D01-D04 with their exact exit criteria; final cleanup remains deliberately incomplete until the loop's final stop condition.
