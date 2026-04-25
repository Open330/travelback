# Debugger Review — Cycle 1 (2026-04-25)

## Scope / inventory

### Project rules consulted
- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/plans/README.md`
- `plan/cycle7-review-plan-2026-04-25.md`
- `plan/deferred-cycle7-review-2026-04-25.md`

### Modified tree reviewed
- `src/app/page.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/TimelineSelector.tsx`
- `src/lib/i18n.ts`
- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/google-revisit-segments.json`

### Verification performed
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅
- `npm run smoke:static` ✅
- Targeted Playwright passes for existing trim/theme regressions:
  - `npx playwright test e2e/travelback.spec.ts -g "timeline trimming"` ✅
  - `npx playwright test e2e/travelback.spec.ts -g "theme toggle"` ✅
- Additional synthetic repros for the bugs below were executed in-browser.

## Findings

| File:line | Severity | Confidence | Failure scenario | Concrete fix |
|---|---:|---:|---|---|
| `src/components/TimelineSelector.tsx:202-242`, `src/components/TimelineSelector.tsx:295-308`, `src/app/page.tsx:274-301` | Medium | High | Releasing a timeline handle without actually moving it still calls `onRangeChange`. On a trimmed track, that no-op click resets playback/export and can clear scenes, even though the selection did not change. I reproduced this by trimming `sample.gpx`, adding one scene, then clicking/releasing the same handle at the same position: the scene editor closed and the scene count dropped to zero. | Preserve the old “only commit when moved” guard. In `endDrag`, only flush/apply if the pointer actually moved (`dragMovedRef.current` or `clientX !== originX`), or have `applyDragNow` return early when there is no delta. Do not call `applyDragNow(finalClientX)` unconditionally. |
| `src/lib/parser.ts:476-489`, `src/lib/parser.ts:253-266`, `src/lib/parser.ts:535-540` | Medium | High | The new pre-parse Google JSON point-budget scan rejects valid exports before validation/dedup can run. I reproduced this with a 6.9 MB flat-array JSON containing 250,001 invalid `latitudeE7` entries plus 2 valid records: upload shows `Track contains too many points...` even though `parseRecords()` would have discarded the invalid rows and accepted the two valid points. | Remove the raw-text regex budget gate, or move the limit check to after actual point validation so it counts accepted points instead of key occurrences. If an early guard is still desired, make it a soft preflight and keep the hard cap on parsed points only. |

## Notes

- The static export hardening and cache-policy changes in `scripts/serve-static.mjs` / `scripts/smoke-static.mjs` passed smoke.
- `ThemeToggle`, `FileUpload`, `ExportPanel`, and the worker mirrors did not surface additional blocking defects in the checks I ran.
- The two findings above are both user-visible regressions with clean, minimal fixes; they should be handled before the next review/fix cycle.
