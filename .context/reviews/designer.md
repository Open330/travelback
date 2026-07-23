# Product Designer / Browser Review — Cycle 1 (2026-07-23)

## Outcome

Travelback has a coherent glass-map visual system, clear primary flows, strong modal focus handling, and generally good 44px touch targets. The main weaknesses appear when viewport height, rather than width, becomes constrained. The loaded workspace and manual-route workflow both become partially unusable on short phones and landscape phones. I confirmed six actionable findings:

- **DESIGN1-01 High** — loaded map controls and attribution are covered on short viewports
- **DESIGN1-02 High** — the Journey Creator cannot be completed on short/landscape viewports
- **DESIGN1-03 High** — Camera mode comboboxes have no accessible names
- **DESIGN1-04 Medium** — the cyan action/focus token fails light-mode contrast
- **DESIGN1-05 Medium** — the landing toolbar covers the upload card on short viewports
- **DESIGN1-06 Medium** — the desktop track title and primary toolbar occupy the same layer

All six findings are **confirmed** with **high confidence**. No deployment was attempted.

## Review scope and method

I inspected the app shell, both global style sheets, all runtime components, UI-facing hooks/controllers and i18n data, bundled visual/font assets, all component UI tests, the theme-contrast test, and the 3,240-line Playwright suite. I then exercised the real app in a browser from an isolated repository snapshot.

Live coverage included:

- 1440×900 desktop, 1024px and 768px intermediate widths
- 390×844 tall phone, 320×568 and 320×480 short phones, and 844×390 landscape
- landing/sample flow, manual Journey Creator, loaded map, timeline, elevation, playback, Camera presets, Export, import guide, and mobile More controls
- pointer hit ownership, keyboard focus, accessible names/roles, modal focus containment, scroll/reflow, target size, console errors, light/dark state, and computed styles

The existing E2E suite only uses 390×844, 1440×900, and 1440×1000. It has no short-height or landscape viewport, which explains why three height-dependent regressions pass current responsive tests.

## Findings

### DESIGN1-01 — Loaded map controls and attribution are covered on short viewports

Severity: **High**

Confidence: **High**

Status: **Confirmed**

Source:

- `src/app/globals.css:218-227`
- `src/components/TrackWorkspace.tsx:146-177`
- `e2e/travelback.spec.ts:1366-1470`

The bottom-right MapLibre controls are moved up by a fixed formula:

`calc(clamp(19rem, 36vh, 20rem) + safe-area)`

The actual timeline/elevation/playback stack is content-sized and reached 353.2px in the live 320px layout. At 320×568, the stack started at y=214.8 while the attribution link occupied y=224–238. Hit testing the link center returned timeline text instead of the attribution link.

At 320×480 the failure is broader:

- bottom stack: y=126.8–480, z-index 10
- top-left map controls: y=52–194, z-index 2
- attribution: y=112–176, z-index 2
- hit tests over the lower zoom controls and attribution returned timeline content

The same layout passed at 390×844, matching the current E2E test's blind spot. This removes pointer access to required map attribution and some map controls, while visually collapsing the map into a narrow strip.

Required outcome:

- Make the bottom stack height-aware or collapsible on short viewports.
- Publish its measured height through a CSS custom property/`ResizeObserver`, then position MapLibre controls from that value.
- Add short portrait and landscape tests that verify bounding-box separation and `elementFromPoint` ownership for zoom/navigation and attribution.

### DESIGN1-02 — Journey Creator cannot be completed on short/landscape viewports

Severity: **High**

Confidence: **High**

Status: **Confirmed**

Source:

- `src/components/JourneyCreator.tsx:780-789`
- `src/components/JourneyCreator.tsx:1000-1037`
- `e2e/travelback.spec.ts:1064-1098`
- `e2e/travelback.spec.ts:1524-1550`

The creator panel is positioned absolutely, uses `overflow-hidden`, and has neither a viewport-relative maximum height nor a scrolling content region.

At 320×480:

- panel: y=80, height=478.5, bottom=558.5
- Undo/Clear/Done row: y=499.8–545.5
- document/body: fixed to 320×480 with no page scroll

At 844×390 landscape:

- panel: y=16, height=462.8, bottom=478.8
- Done: y=436.8–464.8, outside the viewport

The footer actions are therefore neither visible nor hittable. A traveler can place route points but cannot finish or clear the journey. Current tests verify 44px actions and top-toolbar separation only at 390×844; they do not verify that the footer remains reachable.

Required outcome:

- Constrain the panel with `max-height: calc(100dvh - top inset - bottom inset)`.
- Use an internal `overflow-y:auto` region with sticky header/footer actions.
- Respect safe-area insets and test 320×480 plus 844×390 through the complete two-point → Done flow.

### DESIGN1-03 — Camera mode comboboxes have no accessible names

Severity: **High**

Confidence: **High**

Status: **Confirmed**

Source:

- `src/components/SceneEditor.tsx:715-742`
- `src/components/SceneEditor.test.ts:302-303`
- `e2e/travelback.spec.ts:2231-2294`

Each scene's camera-mode `<select>` has no `<label>`, `aria-label`, or `aria-labelledby`. The adjacent camera icon is decorative and cannot name the field.

After applying the Cinematic preset, the accessibility tree exposed six indistinguishable entries as simply `combobox [expanded=false]`. DOM inspection confirmed a null accessible name for every select. A screen-reader user cannot tell which control changes which scene, or even that the field is a camera mode.

The tests locate these controls through `.space-y-2 select` and assert containment/value, so the missing accessible name is not guarded.

Required outcome:

- Give each select a localized, scene-specific name such as “Camera mode for {scene name}”.
- Prefer a visible `<label>` where space allows; otherwise use `aria-labelledby` linking the scene name and a localized field label.
- Query the field by role and accessible name in component and E2E tests.

### DESIGN1-04 — Cyan action text and focus rings fail light-mode contrast

Severity: **Medium**

Confidence: **High**

Status: **Confirmed**

Source:

- `src/styles/vitro-base.css:41`
- `src/styles/vitro-base.css:251-278`
- `src/styles/vitro-base.css:619-627`
- `src/components/JourneyCreator.tsx:823-830`
- `src/components/JourneyCreator.tsx:856-866`
- `src/components/JourneyCreator.tsx:1031-1034`
- `src/components/TimelineSelector.tsx:518-530`
- `src/components/SceneEditor.tsx:888-897`
- `src/lib/theme-contrast.test.ts:35-48`

The service cyan is `#06B6D4`; the light canvas is `#EBEEF4`. Their WCAG contrast ratio is **2.09:1**. The actual “Open tool” control rendered as 10px, weight 500, color `rgb(6,182,212)` over a 76%-white glass surface. Similar cyan microcopy appears in the first-use timeline hint, Journey guidance, search action, and Scene undo action. These normal-size labels require 4.5:1.

The global focus indicator uses an even weaker `rgba(var(--gl), .6)` outer ring. A focused upload action computed to:

`0 0 0 2px #EBEEF4, 0 0 0 4px rgba(6,182,212,.6)`

with `outline: none`. Even fully opaque cyan is only 2.09:1 against the light canvas, below the 3:1 focus-appearance threshold.

The existing contrast test checks only warning/error tokens, so the interactive accent is untested. Dark mode does not share this defect; cyan against `#0A0D14` is approximately 8:1.

Required outcome:

- Separate decorative/accent cyan from semantic text and focus tokens.
- Use a darker teal for light-mode text and a 3:1-or-better focus color; keep the current bright cyan for fills where dark foreground supplies the contrast.
- Add tests for accent text (4.5:1) and focus appearance (3:1) against every light glass/canvas surface.

### DESIGN1-05 — Landing toolbar covers the upload card on short viewports

Severity: **Medium**

Confidence: **High**

Status: **Confirmed**

Source:

- `src/components/GlobalToolbar.tsx:23-26`
- `src/components/FileUpload.tsx:209-227`

The landing toolbar is always absolutely positioned at `top-4`, while the upload card is vertically centered with `max-height:90vh`.

At 320×480:

- upload card: x=16, y=24, width=288, height=432
- toolbar: x=80, y=16, width=224, height=55.8
- overlap: y=24–71.8

Hit testing within the card's upper-right preview area returned Metric/theme controls, proving that the toolbar owns the overlap. The card itself scrolls, but the obscured preview/header region cannot be scrolled away from the fixed toolbar cleanly.

Required outcome:

- Reserve a toolbar safe area before vertically centering the card, or place landing settings in the card/header flow on short screens.
- Add a height-aware layout test at 320×480 and landscape, not only a width breakpoint.

### DESIGN1-06 — Desktop track title and primary toolbar occupy the same layer

Severity: **Medium**

Confidence: **High**

Status: **Confirmed**

Source:

- `src/components/TrackWorkspace.tsx:130-136`
- `src/components/TrackToolbar.tsx:137-141`
- `e2e/travelback.spec.ts:1278-1300`

The desktop title reserves only `right-56` (224px), but the primary toolbar is about 468px wide. Both are absolute at `top-4` and `z-20`.

Measured overlap:

- 1440px viewport: title x=16–1216; toolbar x=955.8–1424; overlap ≈260px
- 1024px viewport: title right=800; toolbar left≈539.8; overlap ≈260px
- 768px viewport: title right=544; toolbar left≈283.8; overlap ≈260px

The short sample name happens to remain centered away from the buttons, but longer localized/file-derived names can render under the toolbar, and the title's glass surface is painted in the same control layer. `pointer-events:none` prevents click theft but does not fix visual collision.

The existing responsive-title test compares the title only with the separate global settings toolbar, not with the primary track toolbar.

Required outcome:

- Put title and actions in one header grid/flex layout, or reserve the measured toolbar width rather than a fixed 224px.
- Test long names at 768, 1024, and 1440 widths and assert separation from the primary toolbar.

## Verified clean areas

- Landing hierarchy and primary actions are understandable without documentation.
- Guide and Export dialogs have names, focus entry/containment, inert background behavior, and reachable close actions.
- Mobile More and Camera panels restore focus appropriately; timeline handles expose useful values.
- Common interactive targets met the reviewed 44px target size.
- Dark mode retained clear hierarchy and produced no horizontal overflow at 390×844.
- Loading, error, empty, and confirmation states are present and localized; the live run produced no application page errors.
- The five current locales are LTR; no unsupported RTL locale is advertised. Locale switching and loaded status have regression coverage.
- Reduced-motion overrides cover global animations and component transitions in CSS.
- Landing image dimensions reserve layout space, reducing CLS risk. Common clicks and map interactions responded immediately in the live run.

The 2,057,688-byte Pretendard variable font is a measurable LCP/font-swap risk, but development-server timing is not a valid production Core Web Vitals result. It should be measured in a production build/RUM before assigning design severity.

## Browser/process hygiene

- The live app ran from an isolated temporary snapshot on port 41861; the protected repository server/port 31997 and unrelated E2E/browser trees were not signaled.
- Exact owned server PGID 58358 (child 58713) exited on `TERM`; no `KILL` escalation was needed.
- Exact owned browser roots 8676/8722 and crashpad roots 8742/8745 were already absent at final cleanup.
- Final verification found port 41861 free, all exact owned PIDs absent, the owned profile marker absent, and temporary snapshot/screenshot artifacts moved to Trash.
- Incident: the normal named-session `agent-browser close` command also caused the pre-existing shared agent-browser daemon 45037/Chrome 45069 to exit. I sent no direct signal to that tree and performed no broad `pkill`/`killall`, but the side effect is recorded explicitly because it crossed the intended process boundary. No further browser cleanup command was run.

## Final sweep

I rechecked information architecture, responsive width and height, overlay stacking, pointer ownership, keyboard/focus behavior, semantics, contrast, touch targets, themes, motion, localization, state feedback, and perceived performance. The six findings above are the issues that met the evidence threshold.
