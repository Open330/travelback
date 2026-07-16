# Cycle 6 Test Engineering Review — 2026-07-17

Reviewed revision `1d2755c` and the complete current test surface: 15 Vitest files (366 tests), `e2e/travelback.spec.ts` (95 configured cases), 18 fixtures, both Playwright configs, wrappers, static smoke, and CI wiring.

## Findings

### TE6-01 — FileUpload ordering test finishes with an unwrapped React update

- Severity: Low
- Confidence: High
- Classification: Confirmed by two independent test runs
- File/region: `src/components/FileUpload.test.ts:80-104`
- Failure scenario: `parseTrackFile.mockResolvedValue(...)` settles after the synchronous `act(() => dispatchEvent(...))` boundary. React prints `An update to FileUpload inside a test was not wrapped in act(...)`; noisy green output can hide a later real async-state warning, and the case does not prove its final settled UI.
- Fix: use a deferred parse promise, assert `onImportStart` precedes parser invocation, then resolve and flush it inside async `act`; assert the settled result. Consider failing targeted tests on unexpected React console warnings.

### TE6-02 — Retry coverage omits the follow-off branch that resets to the world view

- Severity: Medium
- Confidence: High
- Classification: Confirmed coverage gap paired with VR6-01
- File/region: `e2e/travelback.spec.ts:594-704`; `src/components/MapView.tsx:843-885,1055-1083`
- Failure scenario: the existing retry test leaves camera tracking enabled, so pose hydration passes while the follow-off branch never fits or restores the route on a new map generation.
- Fix: disable camera tracking, establish a manual pose, fail a style, retry, then assert the recovered camera/marker remains in the route context. Do not skip the pose assertion in the static lane without an equivalent DOM/geometry assertion.

### TE6-03 — Geometry tests protect attribution but never compare timeline with elevation

- Severity: Medium
- Confidence: High
- Classification: Confirmed coverage gap paired with VR6-02
- File/region: `e2e/travelback.spec.ts:1157-1260,1326-1476`; `src/components/TrackWorkspace.tsx:142-159`
- Failure scenario: the attribution regression asserts attribution against each bottom surface, but never asserts those protected surfaces against each other. Functional trim tests manipulate handles and never click the rendered Reset target, so 94 browser tests pass while elevation owns its center hit.
- Fix: after a trim at 390×844 and 1440×1000, assert timeline/elevation boxes do not intersect, Reset is at least 24×24, `elementFromPoint(center).closest(button)` is Reset, and a real pointer click restores 100% without changing playback.

### TE6-04 — Scene normalization tests omit warning content and locale

- Severity: Low
- Confidence: High
- Classification: Confirmed coverage gap paired with VR6-03
- File/region: `src/components/SceneEditor.test.ts:7-126`; `e2e/travelback.spec.ts:1841-1854,2008-2021`
- Failure scenario: component tests cover only exported range-editor pointer mechanics, while E2E checks a clamped value and localized preset name. Hardcoded English boundary labels can ship unnoticed in visible/live warnings.
- Fix: render the full editor under a real non-English locale, trigger an adjusted start and end, and assert both visible warning and `role=status` contain no English boundary label.

## Gate result and provenance

Unit: 366/366 passed with TE6-01 warning. Static browser: 94 passed, 1 opt-in real-WebCodecs test skipped, 0 failures/retries. Build/TypeScript, lint, audit, CSP smoke, and worker parity passed. CI's missing `npm test` is existing B01 and was not refiled.

## Missed-issue sweep and skipped accounting

The second pass mapped every production branch touched by the three product findings to unit/E2E coverage and rechecked fixture ownership. No additional high-severity blind spot was promoted. Fixture bodies were structurally sampled and exercised by parser/browser tests; generated worker parity was checked mechanically; artwork/fonts and archived reviews were excluded from line-level test review but accounted for through build/smoke/provenance searches.
