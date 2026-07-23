# Cycle 5 Non-Technical Traveler Review — 2026-07-23

## Review target and traveler outcome

- Target: `97f66a63b3df97bce3f349a05248ebb8fef7886e`
- Perspective: a first-time traveler who wants to turn a route into a short shareable video without understanding tracks, codecs, or browser internals
- Outcome: the core path is understandable and usable across the reviewed desktop and short-mobile layouts. **One new interaction root** can make a traveler export a much longer video than requested.

## New finding

### C5-UI-01 — Asking for a 15-second video can silently produce a 55-second setting

- Severity: **Medium**
- Confidence: **High**
- Region: `src/components/ExportPanel.tsx:443-456`
- Same canonical root as `C5-UI-01` in the designer report; it should be counted once in the aggregate.

#### Traveler scenario

A traveler opens Export, sees the default `30`, and wants a brief 15-second clip:

1. They select `30`.
2. They type `1`.
3. Travelback silently changes it to the minimum `5`.
4. They type the next digit, `5`.
5. The field now reads `55`.

Trying to erase the default first is also confusing: an empty field immediately returns to `30`. There is no message explaining that Travelback changed the input.

For a non-technical user, `55` looks like an accepted choice. The estimates update around that value, and starting the export can mean substantially more waiting and a larger file than intended. The traveler is unlikely to infer that the first digit was clamped while they were still typing.

#### Evidence

- Reproduced in the live English export dialog with real keyboard input: `30 → 5 → 55`.
- Select-all plus Backspace left/restored `30`.
- `ExportPanel.tsx:450-455` immediately parses and clamps every intermediate edit to 5–180 seconds.
- Existing browser coverage enters the minimum with `fill('5')`, which replaces the value atomically and does not reproduce normal human typing.

#### Traveler-centered fix

Let the traveler finish typing before judging the value. Preserve the text while the field is active, then validate on blur, Enter, or Start Export. If the result is missing or outside 5–180 seconds, keep the field editable and show a short localized message such as “Enter a duration from 5 to 180 seconds.” Do not silently substitute a different number.

Add a regression using the actual traveler sequence—select `30`, type `15` one key at a time, and confirm that the final setting and estimates use `15`.

#### Why this is new

Prior reviews and plans addressed export limits, invalid values, playback-to-export clamping, and several export completion/save states. They did not record valid multi-digit input being transformed by the field's intermediate controlled state. The separate thin-slider candidate was removed because archived UI work already covers that root.

## First-time journey observations

No other new journey blocker survived deduplication:

- The landing view presents three concrete starts—sample route, own file, and drawn journey—along with Help.
- An unsupported README upload produced a clear error alert and a direct guide to supported import options.
- After loading the sample, focus moved to Play and the workspace exposed route, timeline, elevation, camera, and export controls in a workable order.
- The export surface clearly grouped resolution, duration, quality, advanced settings, estimates, and the start action.
- On a 320×480 Korean dark-theme viewport, the main toolbar, More menu, timeline/elevation/playback controls, and Camera editor remained reachable. Scrollable panels exposed their last settings rather than clipping them.
- Light/dark switching and English/Korean content remained legible in the exercised paths. All currently supported locales are LTR, so no active RTL traveler journey exists yet.
- Empty Camera content, scene creation, deletion/Undo, and unsupported-file recovery exposed understandable states and actions.

Known Cycle 1–4 items, archived target-size work, the Cycle 4 forced-mobile-click issue, geographic-context proposals, and explicitly deferred architectural constraints were not reported again.

## Scope and verification

The review inventoried the landing and workspace composition, global styles, every component in `src/components/`, UI-facing localization and export/playback hooks, component and responsive tests, the complete E2E case inventory, fixtures/assets, README, and the non-technical traveler persona/context documents.

Live checks covered 1440×900 desktop and 320×480 short mobile, English and Korean, light and dark themes, keyboard interaction, modal focus, alerts/status, empty/error/recovery states, and responsive reachability. No full E2E suite or real MP4 export was run. Final console/page-error queries were empty.

The uniquely named browser session and profile were closed with the exact session command. Post-close checks found no owned browser, daemon, renderer, or crashpad PID; no CDP listener; and no profile file holder. The exact static server was also stopped and its PID/listener were absent. No unrelated browser or server process was touched.
