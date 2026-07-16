# Test Engineer Review — Cycle 4 (2026-07-16)

Reviewed revision: `4917d39`

## Result

Fresh verification found **two product regressions without coverage** and **one test-harness warning defect**. The current unit suite still passes 352/352, and the previously retry-only timeline-keyboard case passed 10/10 consecutive retries-disabled static runs.

## Inventory and execution

Reviewed all 15 Vitest files, the complete 2,034-line Playwright journey, its fixtures/configuration, all build/smoke/server scripts, package commands, and the runtime surfaces tied to playback hotkeys, timeline trimming, scenes, map recovery, export, and responsive behavior.

Fresh evidence:

- `npm run test -- --reporter=dot`: 15/15 files and 352/352 tests passed, but `FileUpload.test.ts` emitted repeated React `act(...)` environment warnings.
- `npx playwright test -c playwright.static.config.ts -g "timeline keyboard trimming updates the track without scrubbing playback" --retries=0 --repeat-each=10 --reporter=line`: 10/10 passed. The Cycle 3 retry-only follow-up remains closed.
- Desktop and mobile static journeys loaded a GPX track, exercised playback, Camera, More controls, and Export without page errors or horizontal overflow.
- Focused browser probes reproduced both product failures below against the rendered app.

## New findings

### TE4-01 — Map keyboard navigation is unprotected from global playback hotkeys

Severity: **Medium** | Confidence: **High**

Evidence: `src/lib/usePlaybackController.ts:188-218` ignores inputs, buttons, dialogs, and sliders, but not MapLibre's focusable canvas. MapLibre renders that canvas as `canvas.maplibregl-canvas[role="region"][tabindex="0"]` inside `src/components/MapView.tsx:1008-1015`. No E2E assertion focuses the canvas and presses an arrow key.

Runtime proof: with a loaded track, focusing `canvas[role="region"]` and pressing ArrowRight changed Playback progress from `0` to `0.02`; the key event target was `CANVAS`, and the application set `defaultPrevented=true`. MapLibre therefore never receives its documented keyboard-pan gesture.

Required coverage: focus the live map canvas, press ArrowRight/ArrowLeft, and assert playback does not move while the map retains ownership. Keep a separate assertion that the same global key still seeks when focus is on the page background.

### TE4-02 — Scene-invalidating trim coverage misses semantic no-op keys

Severity: **Medium** | Confidence: **High**

Evidence: current E2E covers real scene-invalidating trims and cancellation (`e2e/travelback.spec.ts:1438-1489`) plus mouse no-op clicks when no scenes exist (`:1856-1874`). It does not exercise an unchanged keyboard boundary after a track is already trimmed and scenes exist. `TimelineSelector` always publishes clamped ratios at `src/components/TimelineSelector.tsx:350-367,576-593`, while `src/app/page.tsx:344-362` opens the discard transaction before checking whether the accepted indices actually changed.

Runtime proof: trim the sample track end to 79%, add Scene 1, focus the start handle at 0%, then press ArrowLeft. The handle stays `0` before and after, yet the “Trimming the timeline” discard dialog becomes visible.

Required coverage: add an E2E case that repeats this sequence and asserts the dialog stays absent, the scene remains, and the accepted point count is unchanged. The application boundary should ignore equivalent accepted index pairs, not rely only on control-level ratio equality.

### TE4-03 — FileUpload tests emit React act-environment warnings on a green run

Severity: **Low** | Confidence: **High**

Evidence: `src/components/FileUpload.test.ts:1-99` uses `createRoot()` and `act()` but does not set `globalThis.IS_REACT_ACT_ENVIRONMENT`. Every other createRoot-based component test establishes that flag (`ExportPanel.test.ts:20`, `JourneyCreator.test.ts:16`, `SceneEditor.test.ts:14`, `TimelineSelector.test.ts:15`). The fresh unit command printed repeated “The current testing environment is not configured to support act(...)” warnings from both FileUpload lifecycle cases.

Failure scenario: persistent expected noise makes a future real unwrapped state-update warning easy to overlook and leaves the gate non-clean despite passing assertions.

Required fix: establish the React act environment in the FileUpload test harness and require a warning-free focused run.

## Clean and bounded scopes

- The timeline keyboard-trimming propagation case is stable across 10 retries-disabled repetitions, so prior W01 is not reopened.
- The 352 unit assertions passed; there is no broad parser, camera, export, or component-test failure.
- Desktop 1440×1000 and mobile 390×844 checks found no new confirmed fit, target-size, dialog-focus, console, or network regression.
- Deployment was not attempted.

## Final missed-issue sweep

After reproducing both failures, I remapped every current E2E case around map focus, global keys, accepted trim revisions, scene invalidation, no-op pointer actions, and export preservation. I also rechecked test stderr across all 15 unit files. No additional confirmed test defect remained.
