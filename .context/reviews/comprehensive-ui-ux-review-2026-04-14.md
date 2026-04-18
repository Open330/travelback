# Comprehensive UI/UX Review — Travelback

**Date:** 2026-04-14  
**Reviewer:** Codex UI/UX audit  
**Method:** Static production build (`npm run build`) + local Playwright verification on:
- Desktop: 1440×900
- Mobile: iPhone 12 class viewport (390×664 CSS px)
- Short mobile: iPhone SE class viewport (320×568 CSS px)

**Artifacts:**
- `./.context/reviews/ui-ux-review-2026-04-14-artifacts/review-data.json`
- `./.context/reviews/ui-ux-review-2026-04-14-artifacts/modal-focus-audit.json`
- `./.context/reviews/ui-ux-review-2026-04-14-artifacts/layout-probes.json`
- `./.context/reviews/ui-ux-review-2026-04-14-artifacts/screenshots/`

---

## Executive summary

Travelback is **meaningfully better** than the earlier non-technical-traveler review. The first-run story is now much stronger: there is a sample preview, a sample trip, a broader travel-data guide, clearer route-creation guidance, and friendlier labels in the loaded workspace.

The remaining problems are concentrated in three places:
1. **modal/accessibility behavior is not production-grade**,
2. **the loaded workspace is over-chromed**, especially on smaller screens,
3. **responsive layout breaks under realistic laptop/short-phone conditions**.

### Bottom line
- **Onboarding / first-run comprehension:** strong
- **Desktop working flow:** decent, but layout collisions exist
- **Mobile editing/export flow:** usable on taller phones, cramped on shorter ones
- **Keyboard/accessibility quality:** weak

If I were prioritizing release work, I would treat the **modal/focus issues**, **desktop top-bar collision**, and **short-phone export overflow** as the first fixes.

---

## What is clearly better than before

These are real improvements, not cosmetic ones:

- **Sample preview + sample trip CTA** make the app immediately understandable (`src/components/FileUpload.tsx:137-161`, `207-229`).
- **The “find your file” guide is now much broader**: Google, Strava, Garmin, AllTrails, Komoot, and “Other Apps” are all represented (`src/components/GoogleGuide.tsx:166-244`).
- **Journey Creator is much less mysterious**: it now gives explicit instructions and a local-only coordinate jump tool instead of dropping the user onto a blank map (`src/components/JourneyCreator.tsx:442-467`, `562-607`).
- **Loaded-state labels are better**: “New Route,” “Camera,” and “Map: …” are clearer than the older jargon-heavy toolbar (`src/components/TrackToolbar.tsx:27-63`).
- **Timeline readability improved**: the histogram now explains itself (“Taller bars = more GPS data”), which fixes a previous comprehension gap.

This is important context: the app now has a genuinely good hook. The remaining issues are less about concept clarity and more about **interaction discipline**.

---

## Severity legend

- **P1** = should be fixed before calling the UI polished / accessible
- **P2** = strong next-wave improvements
- **P3** = worthwhile cleanup / refinement

---

## P1 findings

### 1) Overlays look like dialogs, but they do not behave like dialogs

**Severity:** P1  
**Areas:** Google guide, export modal, keyboard help

### Evidence

From `modal-focus-audit.json`:

- **Guide root:** `role: null`, `ariaModal: null`
- **Export root:** `role: null`, `ariaModal: null`
- **Guide tab order** starts outside the guide:
  1. `km`
  2. `mi`
  3. `Language`
  4. `Theme`
  5. only then reaches the guide close button
- **Export tab order** starts outside the export modal:
  1. timeline selector
  2. playback progress
  3. play button
  4. speed select
  5. duration select
  6. follow toggle
  7. only then reaches export controls

### Why this matters

Visually, these are modal overlays. Behaviorally, background UI is still part of the active keyboard path. That causes:
- broken mental model,
- weak accessibility,
- accidental context switching,
- poor screen-reader expectations.

### Source evidence

- `src/components/GoogleGuide.tsx:259-264`
- `src/components/ExportPanel.tsx:140-144`
- `src/components/KeyboardHelp.tsx:26-28`

All three surfaces are plain overlay containers without dialog semantics or focus trapping.

### Recommendation

- Add `role="dialog"` + `aria-modal="true"` to modal roots.
- Move focus into the dialog on open.
- Trap focus inside while open.
- Restore focus to the trigger on close.
- Mark the background inert while a modal is active.

---

### 2) Desktop top controls physically collide at 1440px width

**Severity:** P1  
**Area:** loaded track workspace, desktop

### Evidence

From `layout-probes.json` at **1440×900**:

- Global controls:
  - `km`: `x=1204.25..1235.44`
  - `mi`: `x=1235.44..1263.33`
  - language select: `x=1272.33..1328.33`
- Track toolbar:
  - `Export`: `x=1235.89..1312.00`

So the **Export button overlaps the units/language cluster** in the exact width range many laptops use.

### Why this matters

This is not a theoretical container overlap; it is a real control collision. It creates:
- ambiguous click targets,
- visual clutter right where key actions live,
- a feeling that the UI is “stacked on itself.”

### Source evidence

- Global toolbar positioning: `src/components/GlobalToolbar.tsx:20-63`
- Track toolbar positioning: `src/components/TrackToolbar.tsx:27-63`
- Desktop title reserve space: `src/components/TrackWorkspace.tsx:96-102`

### Recommendation

Pick one of these directions:
- move the global toolbar to the **left side / bottom bar / collapsed menu** after a track loads,
- make the track toolbar a **single overflow menu** below ~1600px,
- reserve explicit space for both bars instead of letting them free-float.

Right now the workspace chrome is competing for the same corner.

---

### 3) The export modal breaks on short phones

**Severity:** P1  
**Area:** export flow, small mobile heights

### Evidence

From `review-data.json` / `mobileShortExportAdvanced`:

- viewport: **320×568**
- export panel: **y = -75**, **height = 718**
- derived overflow: **75px clipped beyond the viewport**

In other words: on an iPhone SE-class viewport, the advanced export form is too tall and is rendered partly off-screen.

### Why this matters

Export is one of the app’s core promises. If the export surface clips off-screen on a still-common short-phone size, that is a real product issue, not polish.

### Source evidence

- Modal shell has no max-height / no internal scroll container: `src/components/ExportPanel.tsx:140-144`

### Recommendation

Turn export into a true responsive sheet:
- add `max-height: min(90vh, ...)`,
- add `overflow-y-auto`,
- pin action area / close affordance,
- consider a bottom sheet presentation on narrow screens.

---

## P2 findings

### 4) Mobile workspace chrome consumes too much of the map

**Severity:** P2  
**Area:** loaded track workspace, mobile

### Evidence

From `review-data.json`:

- On iPhone 12-class viewport, the clear map band between top chrome and bottom chrome is only **203px / 30.6%** of the viewport.
- On iPhone SE-class viewport, the clear map band is only **65px / 11.4%** of the viewport.

The stacked contributors are:
- top utility bar,
- loaded-state toolbar,
- mobile title chip,
- timeline selector,
- elevation profile,
- playback controls.

There is also a **mobile title / timeline overlap** in the runtime probe:
- title `y=413.875..438.375`
- timeline `y=402.203..488.000`

So the title chip is not just near the timeline; it sits inside the same vertical band.

### Why this matters

Travelback’s core delight is the map animation. On short phones, the UI leaves almost no map visible. The result feels like controlling the trip *around* the map instead of through it.

### Source evidence

- Toolbar placement: `src/components/TrackToolbar.tsx:27-63`
- Desktop/mobile title and bottom stack: `src/components/TrackWorkspace.tsx:96-140`
- Playback control wrapping: `src/components/Controls.tsx:76-145`

### Recommendation

Reduce simultaneous chrome on mobile:
- collapse the top toolbar into a **single “More” menu**,
- merge title + stats into one compact header,
- make timeline a **toggleable drawer** instead of always-on,
- let the export / camera actions live in a persistent bottom action bar.

The app needs a clearer “map-first on mobile” mode.

---

### 5) Touch target sizing is still too small in several app-owned controls

**Severity:** P2  
**Area:** global controls, playback, shortcuts, scene controls

### Evidence

From Playwright target audits:

Desktop examples:
- `km`: **31×29**
- `mi`: **28×29**
- language select: **56×28**
- theme toggle: **36×36**
- shortcuts trigger: **32×32**
- play button: **40×40**

Mobile examples:
- `km`: **31×46**
- `mi`: **28×46**
- theme toggle: **36×46**
- play button: **40×46**

### Why this matters

This app is trying to be touch-friendly and traveler-friendly, but several high-frequency controls still sit below the common **44×44** ergonomic target.

### Source evidence

- `src/components/GlobalToolbar.tsx:22-61`
- `src/components/KeyboardHelp.tsx:18-23`
- `src/components/Controls.tsx:79-135`

### Recommendation

Normalize app-owned controls to at least ~44×44 hit areas, especially:
- unit toggles,
- theme toggle,
- play control,
- shortcut help trigger,
- scene editor close / preset chips.

---

### 6) The scene editor is improved, but still too dense for the product’s audience

**Severity:** P2  
**Area:** camera/scene workflow

### What improved

This is notably better than before:
- “Scenes” is now **“Camera”** in the main toolbar.
- Parameter labels like **Tilt**, **Direction**, and **Orbit Speed** are much friendlier.
- Presets are front-loaded.

### Remaining issue

The editor still feels like a semi-pro control panel inside a consumer flow.

Evidence:
- On mobile, the scene panel still consumes **49.4% of the viewport height**.
- Playwright target audit found multiple tiny internal controls, including a **16px unlabeled close button**.
- Preset chips and utility buttons are visually small and dense.

### Source evidence

- panel shell: `src/components/SceneEditor.tsx:291-305`
- preset cluster / tiny chips: `src/components/SceneEditor.tsx:308-326`
- tiny close icon: `src/components/SceneEditor.tsx:301-304`

### Recommendation

Split the camera experience into two levels:
- **Default level:** presets only + maybe one “intensity” slider
- **Advanced level:** detailed scene editing

That would preserve power without confronting casual users with a parameter wall.

---

### 7) Export close affordance is visually present but semantically weak

**Severity:** P2  
**Area:** export modal accessibility

### Evidence

The export modal’s close button is an unlabeled icon button:
- source: `src/components/ExportPanel.tsx:147-151`
- Playwright captured a visible button with **blank accessible text** inside the export modal.

The scene editor has the same problem:
- `src/components/SceneEditor.tsx:301-304`

### Why this matters

These are common controls in high-attention contexts. Leaving them unlabeled hurts screen readers, automation, and general clarity.

### Recommendation

Add `aria-label` values like:
- `Close export panel`
- `Close camera panel`

---

## P3 findings

### 8) Landing keyboard flow still prioritizes the map before the primary task

**Severity:** P3  
**Area:** first-run keyboard experience

### Evidence

Desktop landing tab order starts like this:
1. map canvas
2. attribution summary
3. MapLibre link
4. only then the preview card and real CTAs

### Why this matters

For a first-run task-driven app, the primary goal is “get a file or try a sample,” not “inspect the map implementation.” The focus order should reflect that.

### Recommendation

When the landing card is present, consider making it the first keyboard focus region and demoting map/attribution until after the primary actions.

---

### 9) Secondary landing CTAs are useful, but still too lightweight on desktop

**Severity:** P3  
**Area:** landing page

### Evidence

The desktop audit recorded these as very small text-only targets:
- “Try with a sample trip”
- “Draw a route on the map”
- “Need help finding your file?”

The preview card helps a lot, but the secondary actions underneath the primary upload button still read like helper links rather than strong alternate paths.

### Source evidence

- `src/components/FileUpload.tsx:207-229`

### Recommendation

Promote at least one of these paths into stronger visual hierarchy, especially:
- **Try sample**
- **Find my file**

The app’s first-run success depends on these branches being obvious.

---

### 10) Shortcut discovery remains weak

**Severity:** P3  
**Area:** desktop power-user affordance

### Evidence

- Trigger is desktop-only: `hidden sm:flex` (`src/components/KeyboardHelp.tsx:21`)
- Trigger size is only **32×32** in the target audit
- Trigger is just `?`, bottom-right, visually subtle

### Why this matters

The shortcut system itself is good. Discovery is the weak part.

### Recommendation

Consider one of:
- small “Shortcuts” text label instead of bare `?`,
- a first-run tooltip the first time a track loads,
- merge it into a visible “Help” menu.

---

## What is working well

To balance the critique: several product decisions are now genuinely strong.

### Strongest UX wins

- **The sample-trip path is now excellent.** It lowers commitment immediately.
- **The app speaks more traveler language than before.** This is a major improvement.
- **The travel-data guide is broad and practical.** It now feels like product onboarding, not just documentation.
- **Timeline comprehension is materially better.** The histogram explanation helps.
- **Journey Creator is no longer mysterious.** The “click on the map to trace your route” instruction is exactly the kind of scaffolding this app needed.

The good news is that Travelback no longer has a “what is this?” problem. It now has a more specific problem:

> once the user is inside the tool, the UI becomes too chrome-heavy and too under-disciplined about focus, layout, and responsive constraints.

That is a much more fixable problem.

---

## Recommended priority order

### Fix next (highest value)
1. **Add real dialog semantics + focus trapping** to guide/export/help
2. **Resolve desktop toolbar collision** between track controls and global controls
3. **Make export modal scrollable / sheet-based on short mobile heights**

### Then
4. **Reduce mobile chrome density** so the map remains visible
5. **Normalize app-owned targets to 44×44-ish hit areas**
6. **Split camera editing into simple vs advanced layers**

### Nice-to-have after that
7. Improve landing keyboard priority
8. Make help/shortcuts more discoverable
9. Strengthen alternate-path CTA hierarchy

---

## Final verdict

**Concept:** strong  
**First-run experience:** much improved  
**Working-state polish:** mixed  
**Accessibility / modal discipline:** below standard  
**Mobile resilience:** acceptable on tall phones, weak on short ones

I would describe the current UI as:

**“Compelling and increasingly approachable, but still over-instrumented once a track loads.”**

The app is now close enough that a focused UX pass could noticeably elevate it. The next round should not add more features; it should simplify, contain, and harden the interaction model.
