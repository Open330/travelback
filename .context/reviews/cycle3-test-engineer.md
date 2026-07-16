# Cycle 3 Test-Engineer Review

Review target: `3b6750f`

## Test evidence

- Fresh representative import run: 7 passed in 30.0 seconds (GPX, KML, Google flat JSON, Records.json, Semantic Location History, Timeline Edits, Semantic Segments).
- Fresh 390×844 touch-browser flow: landing → Journey Creator → coordinate route → discard → GPX import → timeline → export completed without page/console errors.
- Existing timeline unit coverage at `src/components/TimelineSelector.test.ts:1-63` tests only ratio helpers. Existing browser coverage at `e2e/travelback.spec.ts:854-914` exercises completed mouse drags and keyboard behavior, not interrupted touch lifecycles.

## Findings

| ID | Severity | Confidence | Coverage gap | Regression test to add |
|---|---|---|---|---|
| C3-PR-001 | Medium | High | No test dispatches `touchcancel` while a timeline handle/region is active or verifies that unrelated later touches cannot mutate/commit its range. The current implementation omits that terminal event at `src/components/TimelineSelector.tsx:413-435`. | In a 390×844 touch context, start and move the end handle, dispatch `touchcancel`, then perform a map gesture. Assert the handle returns to the last accepted ratio, the visible/full counts remain 20/20, and no trim-confirm dialog appears.
| C3-PR-002 | Low | High | Export swipe tests do not cover cancellation. `src/components/ExportPanel.tsx:116-133,235` has no cancel handler, while the related Scene Editor now does. | Open Export on a touch viewport; header `touchstart`, `touchcancel`, then a later cross-boundary touch ending inside the header. Assert the dialog stays open. Also assert a fresh valid downward swipe still closes it.
| C3-PR-003 | Medium | High | The completion test at `e2e/travelback.spec.ts:1687-1699` deliberately accepts either `/Video (ready|saved)/` and checks the download attribute, but never verifies state-specific recovery copy. That lets a picker-cancelled `ready` state instruct the user to rerender or look in Downloads. | Stub `showSaveFilePicker` to reject with `AbortError`; assert `Video ready`, a visible Download MP4 action, copy that says the save did not complete, and absence of “export again if you need a local copy”/“find the MP4 in Downloads” claims.
| C3-PR-004 | Low | High | The linguistic regression test at `src/lib/i18n.test.ts:33-36` is a hand-picked three-phrase list and missed the same redundant approximation pattern in English, Japanese, and Spanish. | Add reviewed expected values for all five `export.estimatedTime` strings, or a locale-owned reviewed fixture, while retaining key-parity coverage.

## What the suite already protects well

The current suite has meaningful import-format, map layout, timeline distance/keyboard, scene editing, modal focus, export lifecycle, and static-build coverage. The Journey Creator toggle-size test is narrow, but fresh measurement established that its other mobile actions also meet the 24px WCAG 2.2 target minimum and have about 45.8px height; I am not filing a target-size defect.

## Final sweep

No unrelated flaky or failing test was observed. These are four de-duplicated gaps matching the canonical `C3-PR-*` findings, not four additional product defects.
