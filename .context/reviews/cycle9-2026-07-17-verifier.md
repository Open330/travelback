# Cycle 9 Verifier Review — 2026-07-17

Review target: `342b8c13f005c3abd072dddb27f002722c3fb1e8` on `codex/review-plan-fix-2026-07-16`.

## Verdict

The exact revision builds, the focused production-static travel-log matrix passes 9/9, and the full primary flow reaches a valid ready MP4 state in a live browser. Five smaller UI claims are nevertheless false under current geometry or accessibility state: Scene Editor containment, export focus continuity, marker role, full mobile endpoint target visibility, and natural Korean map-style wording.

## Independent inventory and evidence scope

- Enumerated the complete tracked tree and mapped all 54 `src` paths, every component/hook/state owner, locale/style/public consumers, scripts/configuration/workflow, README/current context, 16 unit suites, the full browser specification, and its 18 fixtures.
- Compared the Cycle 8 implementation and reports with current source to avoid re-filing closed parser, gesture, locale-hydration, Spanish-copy, and map-style hydration work.
- Built exact HEAD in an isolated temporary copy. In the hardened static application, agent-browser exercised desktop 1440×1000 and mobile 390×844, light/dark theme boot, English/Korean, accessibility snapshots, computed DOM geometry, tab focus, play/pause, camera presets, export option changes, rendering progress/cancel availability, and completed MP4 readiness.
- Fresh filtered static Playwright run, Chromium, one worker, retries 0: **9 passed in 2.7m**. The cases covered GPX, KML, Google flat JSON, Records, Semantic Location History, Timeline Edits, Semantic Segments, plus full KML and Records journeys.

## Confirmed findings

### VR9-01 — Scene select containment fails at the standard desktop breakpoint

- Severity: Medium
- Confidence: High
- Status: Confirmed live/source defect
- Locations: `src/components/SceneEditor.tsx:560-562,656-684`
- Reproduction: load the sample at 1440×1000, open Camera, apply Cinematic, and inspect a camera-mode combobox. Panel bounds were x=16…336; select bounds were x=66…366. The final 30px, including the native arrow, was clipped by `overflow-hidden`.
- Required outcome: make the select shrink inside the flex row and prove `selectBox.right <= panelContentBox.right` across desktop, mobile, and long-label locales.

### VR9-02 — Export rendering has no focused element inside its modal

- Severity: Medium
- Confidence: High
- Status: Confirmed live/source accessibility defect
- Locations: `src/components/ExportPanel.tsx:242-249,352-379`; `src/components/ModalDialog.tsx:93-167`; incomplete E2E at `e2e/travelback.spec.ts:2370-2384,2441-2450`
- Reproduction: open Export, choose HD/5s/Low, focus and activate Start Export, then query `document.activeElement` while the progressbar and Cancel button are visible. The result was `BODY`. At completion the existing effect correctly focused the “Video saved!” heading.
- Required outcome: focus Cancel or a rendering status on transition and assert it before releasing the test export frames.

### VR9-03 — Accessibility tree exposes a false `Map marker` button

- Severity: Low
- Confidence: High
- Status: Confirmed live/source/dependency interaction
- Locations: `src/components/MapView.tsx:775-797`; `node_modules/maplibre-gl/src/ui/marker.ts:336-356`
- Reproduction: load a route and inspect the accessibility tree/marker DOM. The custom element becomes `role="button" aria-label="Map marker"`, but Travelback attaches no marker action or popup. It is absent from sequential tab order yet still appears in screen-reader browse navigation.
- Required outcome: suppress decorative marker semantics or provide a real, accurately named interaction; verify the accessibility tree rather than tab order alone.

### VR9-04 — Nominal mobile handle size overstates the visible hit area

- Severity: Low
- Confidence: High
- Status: Confirmed live/source usability defect
- Locations: `src/components/TimelineSelector.tsx:555-577,617-639`; `src/components/TrackWorkspace.tsx:142-155`; `src/app/page.tsx:579`; `src/app/globals.css:19-25`
- Reproduction: at 390×844 with the full range selected, the end handle measured x=359…403 against a 390px viewport, so only about 31px of its 44px width remained visible. This still clears the WCAG 2.5.8 24px threshold; the false claim is the implementation comment/intent that a full 44px target is available.
- Required outcome: keep full endpoint hitboxes inside the viewport and assert rectangle intersection equals the nominal target rectangle at both extremes.

### VR9-05 — Korean live label is grammatically incomplete

- Severity: Low
- Confidence: High
- Status: Confirmed live/source prose defect
- Locations: `src/lib/i18n.ts:521-526,683-689`
- Reproduction: switch the mobile More dialog to 한국어. The map-style control becomes `지도: 어두운`; `어두운` is an attributive adjective without its noun.
- Required outcome: use standalone style names or translate the full combined label; add reviewed-copy assertions for both light and dark states.

## Gate and claim verification

- Exact-HEAD isolated production build and static hardening: passed.
- Exact-HEAD filtered production-static Chromium matrix: 9/9 passed, retries disabled.
- Live short export: progress appeared, Cancel remained present, completion focused the success heading, the video reached `readyState=4`, and a named `.mp4` download link appeared.
- Live layout: no document horizontal overflow at 390×844 or 1440×1000; landing targets and primary loaded controls were at least 44px except the viewport-clipped portion described by VR9-04.
- Live theme/locale: fresh light scheme booted light/Voyager without a dark-style request; dark mode and Korean switching updated document state and primary labels.
- B01–B04 and D01–D04 remain existing ledgers, not new Cycle 9 verification findings.

## Challenged candidates and final sweep

- Rejected synchronous `styledata` recursion: successful listeners unregister before later style notifications, and MapLibre's add-source/layer operations schedule updates rather than synchronously firing the event.
- Kept timeline selected-region touch behavior as manual-only: the passive move listener and absent `touch-action` deserve physical Safari/Chrome validation, but no trustworthy failure was reproduced.
- Kept canvas focus visibility as manual-only: source and computed outline geometry suggest edge clipping, but no reliable perceptibility failure was established.

The missed-issue sweep challenged shared-oracle tests, localized intrinsic widths, dynamic modal children, non-tab accessibility nodes, target viewport intersection, hydration/theme bootstrap, map generation races, cancellation, stale exports, loading/error recovery, reduced motion, contrast, RTL, and static-base-path behavior. No sixth confirmed issue met the evidence threshold.
