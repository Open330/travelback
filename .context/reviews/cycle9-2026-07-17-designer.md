# Designer Review — Cycle 9 (2026-07-17)

Review target: `342b8c13f005c3abd072dddb27f002722c3fb1e8`.

## Scope and live evidence

The UI inventory covered the app shell, all 17 production components, both controller hooks, shared types/localization, authored styles, public visual assets, configuration, all component/unit suites, and the complete browser journey/fixtures. I traced landing, every acquisition path, loaded map, playback, timeline/elevation, scenes, Journey Creator, export, dialogs, errors, empty/loading states, locales, themes, responsive layouts, and motion preferences.

Using the required agent-browser core, configuration, interaction, query, wait, network, visual, debug, state, and storage workflows, I exercised the actual hardened exact-HEAD static app. Desktop checks used 1440×1000; mobile checks used 390×844. The pass covered fresh light and dark sessions, English and Korean, accessibility snapshots, focus and tab order, computed geometry, play/pause/progress semantics, Cinematic scenes, export option changes, rendering, cancel availability, and a completed ready MP4. No external network or page/console error appeared in the exercised primary flow. A filtered exact-HEAD production-static suite then passed 9/9 travel-log cases.

## Findings

### DESIGN9-01 — Camera-mode controls are clipped by the Scene Editor

- Severity / confidence: **Medium / High**
- Status: Confirmed live/source responsive defect
- Location: `src/components/SceneEditor.tsx:560-562,656-684`
- Evidence: desktop panel x=16…336; camera select x=66…366. `overflow-hidden` removes the last ~30px, including the disclosure arrow. `flex-1` lacks `min-w-0`, so native intrinsic width wins.
- Fix: make the select shrinkable and width-constrained; test containment at desktop/mobile and with the longest locale strings.

### DESIGN9-02 — Focus continuity breaks while export is rendering

- Severity / confidence: **Medium / High**
- Status: Confirmed live/source accessibility defect
- WCAG relevance: focus order/meaningful progression (2.4.3); the modal remains open but focus leaves its interactive state.
- Location: `src/components/ExportPanel.tsx:242-249,352-379`; `src/components/ModalDialog.tsx:93-167`
- Evidence: activating Start Export unmounted the focused button and left `BODY` active while progress and Cancel were visible. Completion correctly focused “Video saved!”, so the missing state is specifically rendering.
- Fix: focus Cancel or a rendering status on transition, keep Escape cancellation, and test the full focus sequence: opener → dialog → Start → rendering → success/cancel → opener.

### DESIGN9-03 — Decorative route position has false button semantics

- Severity / confidence: **Low / High**
- Status: Confirmed live/source accessibility defect
- WCAG relevance: Name, Role, Value (4.1.2); the role communicates an unavailable action.
- Location: `src/components/MapView.tsx:775-797`; MapLibre default at `node_modules/maplibre-gl/src/ui/marker.ts:336-356`
- Evidence: the accessibility snapshot announces `button "Map marker"`; the custom pulse/dot has no product action or popup.
- Fix: hide it from assistive technology/present it decoratively, or make a real marker interaction with a specific name. Test the accessibility tree, not only keyboard tabs.

### DESIGN9-04 — The mobile end-range target is only partly visible

- Severity / confidence: **Low / High**
- Status: Confirmed live usability defect; not a WCAG 2.5.8 violation
- Location: `src/components/TimelineSelector.tsx:555-577,617-639`; `src/components/TrackWorkspace.tsx:142-155`; viewport clipping in `src/app/page.tsx:579` and `src/app/globals.css:19-25`
- Evidence: at 390px width the 44px end box ran from x=359 to x=403, leaving ~31px visible. That is above WCAG 2.5.8's 24px minimum but below Travelback's explicit 44px touch-target intent.
- Fix: inset handles or pad/remap the timeline so full hitboxes stay inside the interaction surface at 0% and 100%.

### DESIGN9-05 — Korean map-style text sounds unfinished

- Severity / confidence: **Low / High**
- Status: Confirmed live/source localization defect
- Location: `src/lib/i18n.ts:521-526,683-689`
- Evidence: the live control reads `지도: 어두운`; `어두운` is an adjective form awaiting a noun. `밝은` has the same issue.
- Fix: use standalone names such as `라이트`/`다크`, or translate complete phrases. Add reviewed composed-label tests.

## Cross-cutting UX assessment

- **Keyboard/focus:** landing and loaded controls had visible focus; sliders expose useful names/values/dates; dialogs are modal/inert and trap focus. DESIGN9-02 and DESIGN9-03 are the two confirmed semantic exceptions. Canvas-edge focus perceptibility remains a manual visual check, not a finding.
- **Contrast/theme:** sampled text/control states remained legible in light and dark modes; fresh light boot selected light/Voyager deterministically. No new contrast failure was measured.
- **Motion:** marker pulse, spinner, success animation, and primary-button motion have reduced-motion fallbacks in `src/app/globals.css:37-80`.
- **Responsive/touch:** no document overflow occurred at 390×844 or 1440×1000; primary buttons and controls were nominally 44px or larger. DESIGN9-01 and DESIGN9-04 are the confirmed containment exceptions. Selected-region touch behavior still needs physical Safari/Android evidence because its region lacks the handles' `touch-action: none`; it was not promoted without reproduction.
- **Errors/loading/empty:** upload rejection, map retry, empty scenes/Journey Creator, codec checking, render progress/cancel, export ready/failure, alerts/status, and session reset all have explicit UI paths. No dead end was found.
- **i18n/RTL:** five complete LTR locales ship, locale/date/document state changed live, and no English-only primary flow was found. RTL is not claimed as a defect because no RTL locale ships; DESIGN9-05 is the confirmed Korean quality issue.
- **Perceived performance:** sample load, playback, panel opening, and short export provided timely status. No new measured performance finding was established; retain D01–D04/B04 evidence gates.

The final design sweep revisited information hierarchy, affordance truth, safe areas, hit ownership, intrinsic localized widths, focus restoration, color-independent state, zoom/motion, busy/success feedback, and the full land→video path. No sixth design issue crossed the confirmed threshold.
