# Cycle 5 Designer UI/UX Review — 2026-07-23

## Review target and verdict

- Target: `97f66a63b3df97bce3f349a05248ebb8fef7886e`
- Role: interaction/product designer, with WCAG 2.2 and responsive-layout review
- Verdict: **one new actionable UI root**. No additional new issue survived source inspection, live-browser verification, and comparison with Cycles 1–4 and the archived UI plans.

## New finding

### C5-UI-01 — The export-duration field rewrites incomplete keyboard input

- Severity: **Medium**
- Confidence: **High**
- Primary region: `src/components/ExportPanel.tsx:443-456`
- Test gap: `e2e/travelback.spec.ts:3367-3369` uses `fill('5')`; `e2e/travelback.spec.ts:3501-3508` verifies an upstream maximum clamp, but neither test exercises ordinary sequential keystrokes in this controlled field.

#### Concrete failure

The number field applies the 5–180 second clamp during every `onChange`. A partial edit is therefore treated as a final value:

1. Open Export; Duration starts at `30`.
2. Select the field contents and type `1` with the keyboard.
3. The controlled value immediately becomes `5`, the minimum, instead of retaining the user's partial `1`.
4. Type the intended second digit, `5`.
5. The result is `55`, not the intended `15`.

Clearing the field also immediately restores `30`, so the user cannot create the normal temporary empty state used to replace a number. This is not merely native number-input validation: lines 450–455 parse, clamp, and publish each intermediate string back through the controlled `value`.

#### Evidence

- A live Chromium run reproduced `30 → 5 → 55` using real select-and-type keyboard input.
- Select-all followed by Backspace left/restored `30`.
- The source implements exactly that transition with `parseInt`, immediate `Math.max`/`Math.min`, and the existing `duration` fallback for an empty string.
- The duration also drives the visible export estimates, so the mistaken `55` looks accepted and can substantially increase encoding time and output size without any validation message.

#### Recommended fix

Keep a string draft for the focused field and allow transient empty or partial values. Validate and commit the numeric duration on blur, Enter, or Start Export. If the draft is absent or outside 5–180 seconds, retain focus and expose a localized inline error associated with the field; do not silently rewrite the user's keystrokes. Continue clamping upstream playback-derived defaults separately.

Add a component or browser regression that uses sequential keyboard input rather than `fill()`:

- starting from `30`, select all, type `1`, then `5`, and assert `15`;
- select all and Backspace, and assert that a temporary empty draft is possible;
- verify below-minimum, above-maximum, and invalid drafts at the chosen commit boundary;
- verify the error and recovery path by accessible name/status.

#### Historical deduplication

Earlier work covered duration bounds, invalid numeric state, prop synchronization, and upstream playback-duration clamping. It did not cover the controlled field corrupting a valid multi-digit edit through its intermediate keystrokes. That interaction-state root is distinct.

## Coverage with no additional new findings

The review covered:

- information architecture and first-run affordances on the landing, loaded-track workspace, camera editor, More menu, help, and export flow;
- keyboard order, modal focus/inert behavior, focus visibility, status announcements, labels, roles, names, and control state;
- WCAG 2.2-oriented target sizing, contrast/theming, ARIA, overflow, and zoom-sensitive layout;
- desktop at 1440×900 and a short mobile viewport at 320×480, including internal panel scrolling and terminal actions;
- loading, empty, unsupported-file, error, delete/undo, export-ready, and recovery states;
- light and dark themes plus English and Korean UI. The five currently supported locales are LTR, so there is no active RTL locale surface to assess;
- perceived-performance cues and the effect of user-entered export settings on estimates and work performed.

At 320×480, the primary toolbar, More menu, timeline, elevation/playback controls, and Camera panel remained reachable without measured document overflow. The unsupported-file path exposed a clear alert and import-guide recovery. The export modal used a named modal dialog, moved focus inside, and made the background inert. The final browser console and page-error queries were empty.

Potential findings already represented in prior work were excluded, including the desktop slider hit-area concern, short-layout/More-menu behavior, geographic-context proposals, responsive forced-click behavior, toast timing, and previously documented export/save/session states. Explicitly deferred architecture choices were not refiled as UI defects.

## Inventory and method

Static review included:

- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, and `src/styles/vitro-base.css`;
- all UI components in `src/components/`: Controls, ElevationProfile, ErrorBoundary, ExportPanel, FileUpload, GlobalToolbar, GoogleGuide, JourneyCreator, KeyboardHelp, MapView, ModalDialog, SceneEditor, ThemeToggle, TimelineSelector, Toast, TrackToolbar, and TrackWorkspace;
- UI-facing hooks/types and localization in `src/lib/`, particularly `i18n.ts`, `usePlaybackController.ts`, `useExportController.ts`, `videoEncoder.ts`, and parser/error paths;
- component/layout/localization/contrast tests, `e2e/travelback.spec.ts`, fixtures, public guide/map assets, README, and project/persona/context documents.

Live verification used one uniquely owned static server and one uniquely named `agent-browser` session/profile, with no full E2E run and no real MP4 export. The exact browser session was closed, all owned browser/daemon/renderer/crashpad PIDs and its CDP listener were absent afterward, and the profile had no open file holders. The exact server was stopped and its PID/port were absent. The pre-existing user Chrome process was unchanged.
