# Cycle r6 Implementation Plan (2026-04-23)

Source-side plan derived from the eleven per-agent reviews + aggregate at `.context/reviews/cycle-r6-*.md` / `_aggregate.md`.

## Context

- Starting commit: `0000000b72` (cycle-r5 doc commit).
- Gates at start: all green (lint / typecheck / build / smoke / e2e / audit).
- User-injected queue: empty.

## Scheduled items

### P-1 (LOW, HIGH) — Focus-visible ring coverage sweep (R6-AGG-1)

Append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to command-surface buttons that currently rely on inherited defaults. Group per file so one commit per file.

Files touched:

1. `src/components/ThemeToggle.tsx:63` — toggle button.
2. `src/components/ErrorBoundary.tsx:53,60` — tryAgain + reload.
3. `src/components/MapView.tsx:949` — map-error reload.
4. `src/components/KeyboardHelp.tsx:25,53` — help toggle + close.
5. `src/components/TrackToolbar.tsx:94,105,119,129,140,165,175,184,199,207` — New/Camera/Style/Export/mobile-menu trigger + items + units.
6. `src/components/SceneEditor.tsx:358,362,374,378,382,386,450,474,608` — add/close/presets/delete/customize/undo.
7. `src/components/ExportPanel.tsx:194,228,307` — close/Export Again/Advanced.
8. `src/components/GoogleGuide.tsx:281` — close.
9. `src/components/FileUpload.tsx:137` — load-new-file.
10. `src/components/Controls.tsx:84,134` — play/pause + follow-camera.
11. `src/components/Toast.tsx:52` — dismiss.
12. `src/components/JourneyCreator.tsx:548,574,601,614,662,715,720,734,742,750,770,774` — cancel/enable-search/submit/disable/icon/confirm actions/undo/clear/done/discard-modal.
13. `src/components/TimelineSelector.tsx:330` — drag-hint overlay.

Acceptance: each listed button renders the keyboard focus ring on tab-focus. Verified via lint+typecheck+build+e2e green. Primary-button buttons (`.vitro-btn-primary`) already carry their own focus styling in the base class and are not rewritten.

### P-2 (LOW, HIGH) — Defensive `type="button"` coverage sweep (R6-AGG-2)

Add `type="button"` to every non-submit `<button>` in the codebase. Bundle with P-1 per file to minimize diffs.

Files touched:

1. `src/components/ErrorBoundary.tsx:51,58`
2. `src/components/Controls.tsx:80,130`
3. `src/components/Toast.tsx:52`
4. `src/components/TimelineSelector.tsx:328`
5. `src/components/FileUpload.tsx:132,178,227,249,261`
6. `src/components/SceneEditor.tsx:358,362,373,377,381,385,449,473,607,618,622`
7. `src/components/JourneyCreator.tsx:634,714,719,732,740,748,769,773`
8. `src/components/MapView.tsx:949`
9. `src/components/ThemeToggle.tsx:59`
10. `src/components/KeyboardHelp.tsx:20`

Acceptance: `ast-grep` or grep shows zero `<button` in src/components without a `type=` attribute after the sweep. Existing `type="button"` buttons untouched. No behavior change on current call sites. Gates remain green.

### P-3 (LOW, MEDIUM) — E2E regression guard for scene-editor / journey-creator region landmarks (R6-AGG-3)

Add two `expect(page.getByRole('region', ...)).toBeVisible()` assertions — one in an existing scene-editor test and one in an existing journey-creator test.

Files touched: `e2e/travelback.spec.ts`.

Target tests:
- "scene editor opens and allows adding scenes" (around L834) — after the panel is visible, assert `getByRole('region', { name: 'Scenes' })` is attached.
- "mobile journey creator panel stays below the top toolbar" (around L583) — after the creator panel is visible, assert `getByRole('region', { name: 'Create your journey' })` is attached (or whatever `t('journey.title')` resolves to in English — inspect source to confirm).

Acceptance: the two assertions pass in the existing CI run. No net new tests — assertions fold into existing ones.

## Dependencies

- P-1 and P-2 share the same file set and touch disjoint attributes; bundle per file as one commit per file for smaller diff surface.
- P-3 lands independently.

## Out of scope (carryover deferred)

- R4-AGG-D1..D13: all cycle-r4 deferreds unchanged.
- R5-AGG-D14..D17: all cycle-r5 deferreds unchanged.
- R6-AGG-D18..D20: new deferred items this cycle (see `.context/plans/deferred-findings-cycle-r6-2026-04-23.md`).

## DEPLOY

DEPLOY_MODE = none (record `DEPLOY: none` in the end-of-cycle report).
