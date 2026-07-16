# Product designer review — cycle 002

Date: 2026-07-16
Reviewed revision: `cc6f24f`

## Actual-app coverage

I reviewed all 50 `src/` files, the design stylesheet/assets, all translation dictionaries, the complete Playwright specification and 17 fixtures, README/current project instructions, and the running app at 1440×900 plus iPhone 12 emulation. Generated output and archived review/plan files were excluded except for current-cycle traceability.

All nine available browser skills were read and used:

- `agent-browser`: sessions, navigation, snapshots.
- `agent-browser-interact`: click, focus, keyboard, select, upload, and real touch-event interaction.
- `agent-browser-query`: text, attributes, bounding boxes, accessibility tree, computed styles, and state.
- `agent-browser-wait`: load/text/time synchronization.
- `agent-browser-network`: request inspection during local file journeys.
- `agent-browser-visual`: desktop/mobile screenshots, highlighting, and annotated capture.
- `agent-browser-debug`: JavaScript evaluation, console, and page-error inspection.
- `agent-browser-state`: save/show/load session state.
- `agent-browser-config`: desktop/mobile viewport, iPhone device emulation, offline toggle, light/dark media, and reduced-motion configuration.

The flow covered landing, unsupported-file recovery, sample GPX upload, playback entry, camera tracking, scene add/customization, export form/stub completion/download/share controls, Google guide/dialog semantics, desktop/mobile responsiveness, console/page errors, network activity, Korean/English switching, explicit light/dark theme, and reduced motion. Fresh format Playwright coverage also passed 7/7 for GPX, KML, and the five documented Google JSON families.

## New confirmed findings

### DESIGN-C2-01 — Scene sliders and panel-dismiss compete for the same mobile gesture

- Severity: **Medium**
- Confidence: **High**
- Status: **Confirmed on iPhone 12 emulation with the actual rendered control**
- Runtime evidence: after sample load → Camera → Add → Customize, the accessibility tree exposed scene range, Zoom, Tilt, Direction, and Orbit sliders. A horizontal touch on the visible Zoom slider from x=181 to x=52 (dx=-129, no y movement, slider width 149px) changed the interaction context from `panelBefore: true` to `panelExists: false` within 300ms.
- Source evidence: `src/components/SceneEditor.tsx:338-349` treats any >80px horizontal left gesture as dismissal; `:489-492` listens on the entire panel. The sliders live at `:532-545` and `:655-735`.
- User scenario: on a phone, “drag Zoom farther left” is indistinguishable from “close Camera.” A traveler may think their scene disappeared or repeatedly reopen Customize just to finish one adjustment.
- Suggested fix: scope swipe-to-close to a visible header/drag handle, as Export already does at `src/components/ExportPanel.tsx:115-130` and `:223-224`, or reject gestures beginning in interactive descendants. Validate on 320/390/430px widths with real touch drags on every slider.

### DESIGN-C2-02 — Export success replaces the focused control without choosing a new focus destination

- Severity: **Low**
- Confidence: **High**
- Status: **Confirmed keyboard/accessibility state; announcement remains functional**
- Runtime evidence: Start Export was the active `BUTTON`; after stub completion and the visible “Video ready” state, `document.activeElement` was `BODY`. The accessibility tree exposed the Download MP4, Export Again, Share, and Close actions, and the live region announced “Video exported successfully!”, so this is specifically lost focus context.
- Source evidence: `src/components/ExportPanel.tsx:241-303` replaces the form subtree with success content. `src/components/ModalDialog.tsx:93-167` handles initial open/trap/return but not an internal state transition. Current E2E covers the initial trap at `e2e/travelback.spec.ts:1516-1530` and success visibility at `:1587-1597`, not post-transition focus.
- User scenario: a keyboard, switch-control, or screen-magnifier user reaches the final step and loses their exact position just as the actionable result appears.
- Suggested fix: focus a `tabIndex={-1}` success heading or the first download action in an effect keyed to the done transition, then assert focus stays inside the dialog.

## Verified clean scopes

- At 1440×900 the landing primary card and toolbar did not overlap; Browse measured about 414×52px and primary/close controls met the project's 44px minimum.
- iPhone 12 landing, loaded toolbar, Scene Editor placement, and Export dialog fit without confirmed horizontal overflow or dead-end action.
- Wrong `README.md` upload produced the plain-language alert “That file is not a travel route file”; a sample GPX then loaded successfully.
- The guide made the app root inert, kept focus in the dialog, and exposed current platform-specific official Google links.
- Korean selection immediately changed landing labels, and explicit light mode changed the toolbar action to “다크 모드로 전환”; the initial dark presentation also rendered correctly.
- Reduced-motion configuration and source fallbacks were present; no motion-specific unusable state was reproduced.
- Console/page errors were clean in the reviewed journeys, and no route-upload network request was observed.
- Playback, Camera, export success, download, and share affordances were discoverable by accessible names. The success toast remained announced.
- The suspected stale manual-journey name did not reproduce because the creator remount resets the state; it is intentionally not reported.

## Manual-validation boundary

Representative low-end hardware performance for `preserveDrawingBuffer` remains the cycle-1 deferred AG-21/P13 item. Desktop/mobile emulation cannot establish battery, thermal, or frame-budget impact, so this review makes no new performance finding.

## Final missed-issue sweep

I revisited mobile gesture ownership, focus before/after state replacement, accessible names/roles, touch geometry, overflow, guide/help, wrong-file recovery, playback, scenes, export actions, language, light/dark, reduced motion, console/errors, and local-network behavior. No additional confirmed visual, accessibility, responsive, or interaction defect remained. New confirmed count: **2** (1 Medium, 1 Low).
