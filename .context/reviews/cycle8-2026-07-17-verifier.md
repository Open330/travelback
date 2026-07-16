# Cycle 8 Verifier Review — 2026-07-17

## Verdict

Review target: `81342b7fab1cc2577909b63025bb2452dcb5446b` on `codex/review-plan-fix-2026-07-16`.

Fresh static gates are green: ESLint, no-emit TypeScript, all 393 Vitest tests, worker parity, and high-severity dependency audit passed. The Cycle 7 fixes and their regressions remain present. Two Medium behavioral claims are nevertheless false under uncovered inputs: same-segment untimed revisits are not preserved, and the first intentional waypoint click after some completed drags is not guaranteed to delete.

## Independent review inventory and evidence scope

- Enumerated all 898 tracked paths and reviewed the complete Cycle 7 delta plus the resulting tree.
- Application/state inventory: `src/app/{layout,page}`, `usePlaybackController`, `useExportController`, all track/scene/map/export/session state flows, types, and styles.
- Import inventory: `FileUpload`, parse policy/utilities, `parser`, `googleJsonParser`, worker entry/generated bundle, all parser/worker tests, all Google/GPX/KML fixtures and import E2E cases.
- UI inventory: all 17 components, their six component suites, global CSS/Vitro CSS, five locales and i18n tests, guide art, map styles, icons, and sample trip.
- Delivery inventory: package/lock structure, Next/TS/ESLint/Vitest/Playwright/PostCSS configs, all seven scripts, both Playwright modes, smoke/hardening/worker parity, Pages workflow, README and current context/plans.
- The entire 2,783-line E2E suite and all 18 fixtures were inspected for assertion reachability. Historical reports/plans were indexed for provenance rather than treated as active verification claims. Binary font/favicon payloads were not decoded; generated and lockfile content was verified by declaration/structure/parity.

## Confirmed findings

### VR8-01 — Revisit coverage proves the wrong deduplication boundary

- Severity: Medium
- Confidence: High
- Status: Confirmed implementation defect and test-claim gap
- Locations: `src/lib/googleJsonParser.ts:108-117,240-255`; `src/lib/parser.test.ts:536-548`; `src/workers/trackParser.worker.test.ts:163-218`; `e2e/fixtures/google-revisit-segments.json:1-30`; `e2e/travelback.spec.ts:2697-2705`
- Evidence: the upload regression preserves repeated untimed coordinates only when each occurrence belongs to a different semantic segment. The parser's `seen` set is recreated for each segment, so that test never exercises the segment-wide loss. The direct dedup test uses matching valid timestamps and therefore validates the legitimate narrow case. A current-source waypoint-path A → B → A probe returned only A → B.
- User-visible failure: an untimed loop or out-and-back within one activity segment is shortened and its final location, distance, animation, and exported frames are wrong.
- Required outcome: add a supported same-segment untimed fixture and assert the exact three-point sequence through direct parser, worker, and upload UI. Retain a separate exact-timed cross-branch case. The implementation must not deduplicate observations whose identity is unknown.

### VR8-02 — Drag lifecycle tests stop before the next meaningful user action

- Severity: Medium
- Confidence: High
- Status: Confirmed implementation defect and regression gap
- Locations: `src/components/JourneyCreator.tsx:189-192,353-411`; `src/components/JourneyCreator.test.ts:149-248`
- Evidence: current tests prove drag listeners stop receiving movement, cursor/pan restore, and undo/clear settle first. They never omit an immediate layer click and then exercise a later waypoint delete. A controlled current-component sequence did so and the first later click left one feature instead of deleting it, because `dragMovedRef` was still true.
- User-visible failure: after dragging a waypoint, the next intentional deletion can require two clicks with no feedback after the first.
- Required outcome: test the full gesture aftermath with fake time: immediate synthetic generic/layer clicks must be suppressed regardless of handler order, suppression must expire even when no click arrives, and the first later point click must delete. Mirror the terminal case for touch/cancel as appropriate.

## Gate and claim verification

- `npm run lint` — passed.
- `npx tsc --noEmit --incremental false` — passed.
- `npm test -- --run` — 16/16 suites and 393/393 tests passed.
- `npm run check:worker` — passed.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- Parser A → B → A probe — failed the intended semantic claim, returning two points.
- Journey add → drag → terminal → later delete probe — failed the intended interaction claim, retaining one feature.
- Build, development E2E, static E2E, smoke, and server-backed browser checks were not freshly run because the assignment prohibited starting/stopping processes. Cycle 7's recorded browser gates are provenance only, not substituted as fresh evidence.
- B01 (workflow does not run unit tests), B02 (broad Pages permissions), B03 (license file/legal input), B04 (representative preserveDrawingBuffer measurement), and D01-D04 remain known ledger items and are not counted here.

## Final missed-issue sweep

I challenged test oracles that compare shared implementations, fixture branches that miss local scope, assertions that stop at cleanup rather than subsequent behavior, happy-path comments, locale-only snapshots, finite-but-wrong geometry, mocked browser API ordering, responsive hit ownership, cancellation timing, and static delivery claims. All current tests/comments were treated skeptically and traced back to runtime state. No additional verifier issue met the confirmed/reproducible threshold.
