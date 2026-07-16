# Test engineer review — cycle 002

Date: 2026-07-16
Reviewed revision: `cc6f24f`

## Inventory and execution

I mapped all 12 Vitest files, the complete `e2e/travelback.spec.ts`, all 17 committed fixtures, the 7 build/smoke/worker scripts, and package/Vitest/Playwright/workflow configuration back to the 50 runtime/source files. Generated outputs and archived reviews were excluded. The cycle-1 gate record was used only as prior evidence.

Fresh cycle-2 execution:

- `npm test -- --run`: **12/12 files, 266/266 tests passed**.
- Targeted Playwright against the already-running dev server: **7/7 passed** for GPX, KML, Google flat JSON, Records, Semantic Location History, Timeline Edits, and Semantic Segments (`e2e/travelback.spec.ts:425-435`, `:1735-1790`). A unique `/tmp` output directory and `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` avoided altering project artifacts or stopping the shared server.
- The browser review separately exercised wrong-extension recovery, sample load/playback entry, mobile scenes, export completion, dialog/a11y state, theme/media configuration, console/errors, and desktop/mobile DOM geometry.
- Deployment was not run.

## New confirmed test findings

### TE-C2-01 — Scene-editor tests check placement, but not the gesture/control conflict

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed coverage gap paired with a reproduced product failure**
- Evidence: `e2e/travelback.spec.ts:947-973` verifies only that the mobile Scene Editor does not overlap the toolbar. There is no Scene Editor `TouchEvent`/touch-drag case. Meanwhile `src/components/SceneEditor.tsx:338-349` accepts any >80px horizontal left swipe, and `:489-492` attaches it above every child control, including the horizontal range inputs at `:537-545` and `:655-735`.
- Reproduction: a bubbling touch sequence on the Zoom slider from x=181 to x=52 at constant y closed `scene-editor-panel` on iPhone 12 emulation.
- Failure scenario: all tests remain green while a primary mobile customization gesture closes the editor.
- Suggested fix: add pointer/touch E2E coverage that opens Customize and drags scene range, Zoom, Tilt, Direction, Orbit, and Blend in both directions. Assert both the value change and continued panel visibility; also keep one positive test for a deliberate handle swipe if dismissal remains.

### TE-C2-02 — The null-root parser test codifies an accidental `TypeError`

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed test-oracle defect**
- Evidence: `src/lib/parser.test.ts:634-637` says a `null` parse “causes a TypeError” and accepts any thrown value. `src/lib/googleJsonParser.ts:321-344` permits the null cast and dereferences `data.locations`; the stable `ParseError('UNSUPPORTED_GOOGLE_FORMAT')` path is later at `:366-368`.
- Failure scenario: refactors can change the raw exception text/type, worker behavior can diverge, and the test will still pass even though callers no longer receive an intentional parser error code.
- Suggested fix: first add a non-null root guard, then require `ParseError` and an exact code/message contract. Exercise the same input through direct parsing and worker/fallback dispatch.

### TE-C2-03 — Export tests miss focus after the form-to-success transition

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed coverage gap paired with a reproduced accessibility failure**
- Evidence: `e2e/travelback.spec.ts:1516-1530` checks focus containment while the initial dialog subtree is stable. `e2e/travelback.spec.ts:1587-1597` completes the stub export and checks only the success heading and download attribute. `src/components/ExportPanel.tsx:241-303` replaces the focused form subtree; `src/components/ModalDialog.tsx:93-167` has no state-transition focus repair.
- Reproduction: active element was the Start Export button before activation and `BODY` after the success heading appeared. The success live region still announced completion.
- Failure scenario: a release keeps passing both dialog tests while keyboard/switch users lose their position at the last step.
- Suggested fix: extend the local-export test to assert `activeElement` is the success heading or first action and remains inside the dialog; then Tab through Download, Export Again, Share (when supported), and Close.

## Existing gates and deliberately clean scopes

- Fresh format imports passed 7/7; no new confirmed GPX/KML/known-Google-shape regression was found.
- Fresh unit tests passed 266/266; the findings above concern weak or missing assertions, not a broad unit failure.
- Cycle-1 already records the CI unit-test omission/permissions question, legal file question, and `preserveDrawingBuffer` hardware profiling as carried-forward authorization/manual-validation work. They are not recounted here.
- I searched tests for the suspected stale manual-journey name and checked the component mount boundary; it did not reproduce and is not a finding.

## Final missed-issue sweep

After drafting, I remapped every new runtime finding to unit/E2E coverage, searched the full spec for touch gestures, post-export `activeElement`, parser error codes, all supported format fixtures, mobile layout, theme, language, errors, playback, scenes, and export. No additional confirmed test defect was found. New confirmed count: **3** (1 Medium, 2 Low). Fresh checks: **266 unit + 7 Playwright = 273 passed assertions/tests at command level**, with no deployment.
