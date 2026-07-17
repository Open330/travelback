# Cycle 9 Critic — 2026-07-17

Reviewed revision `342b8c13f005c3abd072dddb27f002722c3fb1e8` read-only on `codex/review-plan-fix-2026-07-16`.

## Verdict

**Five new user-facing inconsistencies are actionable: two Medium and three Low.** The main Travelback journey is coherent and completes successfully, but the current UI still contradicts several of its own affordances. A Scene Editor control is visibly cut off inside its panel; keyboard focus disappears when export starts; the animated route position is announced as a button although it has no user action; one endpoint target is partially outside the mobile viewport; and Korean map-style copy is assembled into the unnatural phrase `지도: 어두운`.

No Critical or High correctness, privacy, security, or data-loss failure was found. Existing authority/evidence ledgers B01–B04 and D01–D04 remain unchanged and are not counted as Cycle 9 findings.

## Complete review inventory and live provenance

- Inventoried all 54 `src` paths, all production components and hooks, the five-locale dictionary, authored styles, public assets, root manifests/configuration, scripts, workflow, README/current project context, tests/fixtures, current plans, and the dated Cycle 8 reports. Historical material was searched for provenance and duplicate rejection rather than treated as current truth.
- Traced landing → sample/import/manual journey → loaded map → playback → trim/elevation → camera scenes → export → ready/download, including loading, empty, cancellation, failure, locale, theme, keyboard, touch, and responsive branches.
- Built the exact revision in an isolated temporary tree and served its hardened production-static output at an isolated loopback origin. Agent-browser interaction exercised 1440×1000 desktop and 390×844 mobile, light/dark modes, English/Korean, the accessibility tree, focus, computed geometry, playback, Scene Editor, export rendering, and export success.
- A fresh exact-HEAD production-static Playwright subset passed **9/9** with retries disabled: GPX, KML, Google flat JSON, Records, Semantic Location History, Timeline Edits, Semantic Segments, and full KML/Records journeys. This is focused evidence, not a claim that the full suite was freshly rerun by this role.

## New findings

### CR9-01 — Scene camera-mode selects extend beyond their clipped panel

- Severity / confidence: **Medium / High**
- Status: **Confirmed live and in source**
- Location: `src/components/SceneEditor.tsx:560-562,656-684`
- Concrete failure: at 1440×1000 the desktop Scene Editor panel ended at x=336 while each native camera-mode select ended at x=366. The panel's `overflow-hidden` clips roughly 30px, including the native disclosure arrow. The flex child has `flex-1` but no `min-w-0`, so its intrinsic longest option defeats the intended 320px panel width.
- User impact: camera choice looks broken and the affordance used to open the list is partly hidden, especially for longer localized labels.
- Fix: constrain the select as a shrinkable flex child (`min-w-0 w-full`, with the row itself constrained if necessary) and add desktop/mobile geometry assertions that every select lies within the panel's content box.

### CR9-02 — Starting export drops keyboard focus onto `body`

- Severity / confidence: **Medium / High**
- Status: **Confirmed live and in source**
- Location: `src/components/ExportPanel.tsx:242-249,352-379`; dialog focus lifecycle at `src/components/ModalDialog.tsx:93-167`
- Concrete failure: after focusing and activating **Start Export**, the idle form unmounts. During visible rendering progress the active element was `BODY`, not the newly available Cancel button or progress status. The only transition-specific focus effect handles `exportState === 'done'`; the dialog's open effect does not rerun when its children change.
- User impact: a keyboard or assistive-technology user loses their place at the point where cancellation is most time-sensitive. Success focus works, but that does not repair the rendering interval.
- Fix: on the idle→exporting transition, focus the Cancel button or a deliberately focusable rendering heading/status with `preventScroll`; preserve Escape cancellation and final focus restoration. Add a transition-level browser regression.

### CR9-03 — The passive playback marker is exposed as an actionable button

- Severity / confidence: **Low / High**
- Status: **Confirmed in the live accessibility tree and dependency behavior**
- Location: marker creation at `src/components/MapView.tsx:775-797`; MapLibre's default semantics at `node_modules/maplibre-gl/src/ui/marker.ts:336-356`
- Concrete failure: the loaded-map accessibility tree announces `button "Map marker"`. Travelback supplies a purely visual pulse/dot and no click, popup, or keyboard action; MapLibre adds the generic label and button role during `addTo`.
- User impact: screen-reader browse navigation promises a control that cannot do anything, adding noise to the main map.
- Fix: give the custom marker truthful presentation semantics before constructing `Marker` (for example `aria-hidden="true"` and a presentation role where appropriate), or implement and label a real action. Assert that no false marker button is exposed.

### CR9-04 — A 44px timeline endpoint target is partly outside the narrow viewport

- Severity / confidence: **Low / High**
- Status: **Confirmed live; mobile-usability issue, not a WCAG 2.5.8 failure**
- Location: target promise and positioning at `src/components/TimelineSelector.tsx:555-577,617-639`; containing layout at `src/components/TrackWorkspace.tsx:142-155`; viewport clipping at `src/app/page.tsx:579` and `src/app/globals.css:19-25`
- Concrete failure: at 390×844 the end handle's nominal 44×44 box occupied x=359…403, leaving about 31px visible. The start target also lost a few pixels to the containing edge. The visible end area still exceeds WCAG 2.5.8's 24px minimum, so this is not filed as a standards violation; it contradicts the code's explicit “44px min touch target” intent and makes edge grabs less forgiving.
- Fix: inset endpoint hitboxes, add side padding to the timeline coordinate space, or otherwise keep the full interactive boxes inside the viewport while preserving 0%/100% values. Test viewport intersection, not only nominal width/height.

### CR9-05 — Korean map-style composition reads as an adjective fragment

- Severity / confidence: **Low / High**
- Status: **Confirmed live and in source**
- Location: `src/lib/i18n.ts:521-526,683-689`
- Concrete failure: the mobile toolbar rendered `지도: 어두운`. `어두운` expects a noun (“dark …”), so the composed control reads unfinished rather than as a map-style name. `밝은` has the same construction risk.
- Fix: use complete, parallel style names such as `라이트` / `다크`, or localize the full composed control rather than concatenating a prefix and adjective. Pin reviewed Korean phrases in tests.

## Rejected and manual-only candidates

- `MapView` style hydration listeners are removed synchronously after a successful hydration; MapLibre source/layer additions schedule style updates and do not synchronously recurse through `styledata`. The proposed re-entrancy defect was rejected.
- The selected timeline region has touch handlers but lacks the handles' `touchAction: 'none'` (`TimelineSelector.tsx:533-553`), while its global `touchmove` listener is passive (`:447-463`). A synthetic probe did not yield trustworthy physical-browser evidence. Retain a real iOS/Android manual validation, but do not report a runtime failure yet.
- The map canvas receives a one-pixel user-agent outline at the exact viewport edge. Whether enough of that indicator is perceptible requires a reliable visual/device check; it was not promoted from a source/geometry suspicion.

## Final missed-issue sweep

The last pass revisited file truthfulness, local-only privacy/network behavior, stale success and cancellation, map generation changes, focus order/traps, keyboard sliders, color contrast, reduced motion, mobile safe areas and target ownership, loading/empty/error recovery, all five locales, RTL expectations, export estimates/save/share, responsive overflow, and perceived-performance ledgers. All shipped locales are LTR, so no RTL-specific defect is claimed. No additional non-duplicate issue crossed the actionable evidence threshold.
