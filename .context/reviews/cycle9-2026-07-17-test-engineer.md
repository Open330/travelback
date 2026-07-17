# Cycle 9 Test Engineer — 2026-07-17

Reviewed revision `342b8c13f005c3abd072dddb27f002722c3fb1e8` read-only on `codex/review-plan-fix-2026-07-16`.

## Outcome

**Five focused regression gaps correspond to five confirmed current UI failures.** The broader journey harness is healthy: a fresh exact-HEAD production-static subset passed 9/9 with retries disabled, covering seven supported travel-log representations and two full journeys. The gaps are narrow assertions that stop before dynamic focus, inspect nominal rather than visible geometry, or omit accessibility-tree/copy quality.

## Test and repository inventory

- Catalogued all 16 Vitest suites and the complete Playwright specification/18-fixture set against all 54 `src` paths.
- Coverage mapping included import limits and all supported shapes, worker parity, map/error/style generation, playback, timeline mouse/keyboard/touch lifecycle, Journey Creator, scenes, localization/theme, dialogs/focus, export codec/cancel/save/share, mobile/desktop geometry, static base path, CSP assets, and opt-in real export.
- Reviewed both Playwright configurations, Vitest inclusion, TypeScript/ESLint/Next/PostCSS, package scripts, worker generation/parity, static server/smoke/hardening, workflow, package/lock structure, README, and current plans/reports.
- Fresh focused static run: 9/9 passed in 2.7m (GPX; KML; flat Google JSON; Records; Semantic Location History; Timeline Edits; Semantic Segments; full KML; full Records). This role does not represent it as a fresh full-suite run.

## New findings

### TE9-01 — Export tests skip the idle→rendering focus transition

- Severity / confidence: **Medium / High**
- Status: Confirmed gap with a confirmed live failure
- Locations: production transition `src/components/ExportPanel.tsx:242-249,352-379`; component suite `src/components/ExportPanel.test.ts:35-132`; E2E `e2e/travelback.spec.ts:2370-2384,2441-2450`
- Concrete gap: the E2E verifies an initially open dialog traps focus and later sees a success heading. It never asserts focus after Start Export unmounts the idle form. The live result during progress was `document.activeElement === document.body`.
- Regression: use the export stub, focus/activate Start Export, hold frames, and assert Cancel or the rendering status is focused inside the dialog before release; then retain success-heading and opener-restoration assertions.

### TE9-02 — Scene Editor geometry tests omit combobox containment

- Severity / confidence: **Medium / High**
- Status: Confirmed gap with a confirmed live failure
- Locations: layout `src/components/SceneEditor.tsx:560-562,656-684`; current responsive E2E `e2e/travelback.spec.ts:1658-1713`
- Concrete gap: tests prove the mobile panel avoids the toolbar and that scene sliders do not dismiss it, but never compare a camera-mode select with the panel bounds. Live desktop geometry showed the select extending 30px beyond the clipped panel.
- Regression: after creating/presetting scenes, assert each select's border box is contained by the panel content box at 390px and 1440px, including the longest shipped localized labels.

### TE9-03 — Timeline target tests measure nominal boxes, not viewport-visible boxes

- Severity / confidence: **Low / High**
- Status: Confirmed gap with a confirmed live usability failure
- Locations: endpoint layout `src/components/TimelineSelector.tsx:555-577,617-639`; unit suite `src/components/TimelineSelector.test.ts:64-266`; browser interactions `e2e/travelback.spec.ts:1428-1635`
- Concrete gap: keyboard/mouse/date semantics are well tested, but there is no mobile assertion that endpoint target rectangles remain wholly within the viewport/containing interaction surface. At 390px, about 13px of the end target lay beyond the viewport.
- Regression: at start/end extremes, intersect each handle rect with the viewport and assert the intersection equals the nominal 44×44 rect. This is an application touch-target promise, not a WCAG 2.5.8 failure (the visible width remained above 24px).

### TE9-04 — Map tests do not guard against third-party false control semantics

- Severity / confidence: **Low / High**
- Status: Confirmed gap with a confirmed live failure
- Locations: custom marker `src/components/MapView.tsx:775-797`; browser map coverage around `e2e/travelback.spec.ts:1638-1655,1715+`
- Concrete gap: current map assertions cover canvas keyboard ownership and operational controls, but not the accessibility tree of MapLibre-created marker DOM. The passive marker is announced as `button "Map marker"`.
- Regression: after route load, assert no button named Map marker exists (or assert the intended truthful semantics if a marker action is added). A role query is preferable to a CSS-only check.

### TE9-05 — Dictionary parity cannot catch unnatural composed Korean labels

- Severity / confidence: **Low / High**
- Status: Confirmed language-quality gap with a confirmed live defect
- Locations: strings `src/lib/i18n.ts:521-526,683-689`; reviewed-copy tests in `src/lib/i18n.test.ts`
- Concrete gap: key parity guarantees presence but not grammatical composition. `app.mapStylePrefix` plus `mapStyle.dark` renders `지도: 어두운`.
- Regression: add reviewed Korean assertions for the complete light/dark map control phrases, ideally testing the same composition function/component the user sees.

## Existing release-assurance ledger — unchanged

### B01 — Pages deployment still omits Vitest

- Severity / confidence: **High / High**
- Status: **Existing, authority-blocked; not refiled**
- Location: `.github/workflows/deploy-pages.yml:26-32`; test command in `package.json`; inclusion in `vitest.config.ts`
- Required outcome: after explicit CI/CD authorization, run the unit/component suite before artifact upload and validate without dispatching production.

## Manual-validation and flake sweep

- Selected-region touch drag remains a physical-device coverage item: `onTouchStart` exists but the region lacks `touchAction: 'none'`, and global touch movement is passive (`TimelineSelector.tsx:447-463,533-553`). Synthetic evidence was inconclusive, so no failing test claim is invented.
- Map-canvas focus-ring perceptibility at an exact viewport edge also remains a manual visual check; keyboard ownership itself is covered.
- The final sweep reviewed retry masking, hidden skips, test-stub leakage, host locale/time zone, async focus/RAF ownership, stale locators, generated-worker drift, temp-fixture cleanup, port ownership, static/dev parity, cancellation races, responsive hit-testing, reduced motion, and real MP4 gating. No additional concrete current failure lacked a right-reason regression.
