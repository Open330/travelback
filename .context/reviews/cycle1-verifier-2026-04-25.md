# Cycle 1 Verifier Review — 2026-04-25

**Verdict:** PARTIAL

## Scope / inventory

Reviewed repo rules and current working tree, including uncommitted changes, with emphasis on the files touched by the current cycle:

- Project rules: `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/plans/README.md`
- Cycle plans: `plan/cycle1-current-plan-2026-04-24.md`, `plan/deferred-cycle1-current-2026-04-24.md`
- Changed code: `src/app/page.tsx`, `src/components/ExportPanel.tsx`, `src/components/FileUpload.tsx`, `src/components/JourneyCreator.tsx`, `src/components/ThemeToggle.tsx`, `src/components/TimelineSelector.tsx`, `src/lib/i18n.ts`, `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `e2e/travelback.spec.ts`

## Checks run

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run smoke:static` — passed
- Direct parser repro via `npx --yes tsx` against a synthetic Google JSON export — reproduced `TOO_MANY_POINTS`

## Confirmed defects

| File:line | Severity | Confidence | Failure scenario | Concrete fix |
|---|---:|---:|---|---|
| `src/components/TimelineSelector.tsx:202-242,295-308` <br> `src/app/page.tsx:274-300` | Medium | High | Releasing a timeline handle without actually moving it still flushes the last drag position and calls `onRangeChange`. On a trimmed track, `handleRangeChange` then resets export state, resets playback, and clears scenes even though the selection did not change. | Only flush the final drag when the pointer actually moved. Preserve the old no-op guard by comparing `clientX` against the drag origin or by returning early when `dragMovedRef.current` is still false. |
| `src/lib/parser.ts:253-261,476-489,503-512,535-540` <br> `public/workers/trackParser.worker.js:301-334` | Medium | High | The new pre-parse Google JSON budget scan counts raw key occurrences, not accepted points. A valid export with many invalid `latitudeE7` / `longitudeE7` rows plus a few good rows is rejected before `parseRecords()` can discard the invalid rows. I reproduced this with a synthetic 250,001-row invalid `locations` array plus two valid records; the parser returned `ParseError: Track contains too many points` with code `TOO_MANY_POINTS`. | Move the hard point cap to after validation/dedupe so it counts parsed points, not raw key matches, or make the regex pass only an advisory preflight. Keep the worker mirror aligned with the main parser. |

## Gaps

| File:line | Severity | Confidence | Gap | Concrete fix |
|---|---:|---:|---|---|
| `scripts/smoke-static.mjs:221-231` | Low | High | The new runtime asset cache-policy check verifies `cache-control`, but it does not assert that the worker / map-style URLs actually returned `200`. A `404` response with `no-cache` could still satisfy the check. | Assert `status === 200` before checking the header on each runtime asset URL. |
| `e2e/travelback.spec.ts:698-710,1307-1314` | Medium | High | Existing timeline regression coverage only uses stepped drags. It does not exercise the zero-delta release path that triggered the no-op release bug above, so the regression could reappear without a test failure. | Add a quick-release case that presses, moves once, and releases immediately; assert the track range changes only when the handle actually moved. |

## Notes

- The static smoke and repo-level gates are currently green, so the issues above are logic / coverage problems rather than build or lint regressions.
- I did not modify source files.
