# Comprehensive UI/UX Review — Travelback (2026-04-18)

**Reviewer:** Designer Agent (oh-my-claudecode)
**Scope:** All 17 component files, globals.css, vitro-base.css, i18n.ts
**Framework:** Next.js 16 static export + MapLibre GL JS v5 + Tailwind + Vitro glass design system
**Viewports tested conceptually:** iPhone SE (320px), iPhone 12 (390px), iPad (768px), Desktop (1280px+)

---

### [P1] Finding: SceneEditor absolutely positioned with fragile top/bottom values that break on mobile

**Component:** SceneEditor, TrackWorkspace
**Viewport:** mobile
**Problem:** SceneEditor uses `top-44 bottom-32` absolute positioning (line 291). On mobile, the top value of 11rem is meant to clear the toolbar, but the toolbar is only ~48px tall. The bottom-32 (8rem) is meant to clear the controls area, but the actual controls + elevation + timeline stack varies wildly per device. On iPhone SE, this creates either a tiny sliver of usable editor space or content clipped below the fold. The `sm:top-16 sm:w-80` desktop breakpoint is fine, but the mobile layout is essentially broken -- the panel overlaps with TrackToolbar buttons, and the bottom controls are obscured.

**User impact:** On any phone, the Scene Editor panel either covers the export/camera buttons at the top, or the timeline/controls at the bottom, making it impossible to use both simultaneously. Users must close the editor to access playback controls.

**Fix:** Use a bottom-sheet pattern on mobile instead of absolute positioning with magic numbers:
```tsx
// SceneEditor.tsx line 291
// Replace:
className="absolute left-4 right-4 top-44 bottom-32 z-20 w-auto gs ..."
// With:
className="absolute left-4 right-4 z-20 w-auto gs flex flex-col overflow-hidden
  sm:right-auto sm:top-16 sm:w-80 sm:max-w-[calc(100vw-2rem)] sm:bottom-auto
  bottom-0 max-h-[70vh] rounded-b-none sm:rounded-[var(--r-glass)]"
```

---

### [P1] Finding: TrackWorkspace bottom zone stacks 4 interactive layers competing for the same screen real estate on mobile

**Component:** TrackWorkspace, TimelineSelector, ElevationProfile, Controls
**Viewport:** mobile
**Problem:** When a track is loaded, the bottom of the screen contains: (1) TimelineSelector at `bottom-40` (10rem), (2) ElevationProfile at `bottom-0` with `mb-1.5`, (3) Controls with `mb-2` padding, and (4) the TrackToolbar at `top-4 right-4`. On a 667px-tall iPhone, this stacks: TimelineSelector (48-64px) + ElevationProfile (~40px) + Controls (~80px) = ~180px of bottom UI, plus the TrackToolbar at the top. The TimelineSelector `bottom-40` places it 10rem from the bottom, which means it floats in the middle of the map on small screens, visually severed from the controls it logically relates to. The elevation profile is tiny (h-6 on mobile = 24px) and nearly impossible to tap for seeking.

**User impact:** Mobile users see a cluttered bottom zone where timeline, elevation, and controls compete for space. The elevation profile is too small to interact with. The timeline appears disconnected from the controls.

**Fix:** Collapsible bottom panel on mobile:
```tsx
// TrackWorkspace.tsx -- wrap bottom zone in a collapsible sheet
<div className="absolute bottom-0 left-0 right-0 z-10 gs sm:bg-transparent"
  style={{ borderRadius: 'var(--r-glass) var(--r-glass) 0 0' }}>
  {/* Timeline only shown when expanded or on desktop */}
  <div className="hidden sm:block">
    <TimelineSelector ... />
  </div>
  <ElevationProfile ... />
  <Controls ... />
</div>
```
Also increase `h-6` to `h-10` minimum for ElevationProfile on mobile (already `sm:h-10` but mobile is too small).

---

### [P1] Finding: GlobalToolbar hidden when track is loaded on mobile -- no way to change locale, units, or theme

**Component:** GlobalToolbar, TrackToolbar
**Viewport:** mobile
**Problem:** GlobalToolbar (line 25) applies `hidden sm:flex` when `hasTrack` is true. This means on mobile, once a track is loaded, the locale picker, unit toggle, and theme toggle all disappear. The TrackToolbar mobile menu (Settings icon) does include units, locale, and theme -- but the Settings button itself is `sm:hidden` on the TrackToolbar, which means it IS visible on mobile. However, the Settings gear icon at 18px is small and the "more controls" label is hidden, making it hard to discover. More critically, the initial GlobalToolbar on the landing screen (when no track) does NOT have the "more controls" menu pattern -- so users learn the toolbar layout, then it completely changes when they load a track.

**User impact:** Users cannot find language, unit, or theme settings after loading a track on mobile. The discoverability of the Settings gear is poor. The UI pattern changes between landing and workspace states, which is disorienting.

**Fix:** Ensure the mobile menu in TrackToolbar is visually prominent:
```tsx
// TrackToolbar.tsx line 123 -- make the settings button more discoverable
<button
  type="button"
  onClick={() => setMenuOpen((open) => !open)}
  aria-label={t('app.moreControls')}
  aria-expanded={menuOpen}
  className="gi flex min-h-11 min-w-11 items-center justify-center px-2.5 py-2 text-sm font-medium cursor-pointer"
  style={{ color: 'rgb(var(--gl))', boxShadow: '0 0 0 1px rgba(var(--gl),.3)' }}
>
  <Settings size={18} strokeWidth={2.5} />
</button>
```

---

### [P1] Finding: ElevationProfile non-interactive on mobile (pointer-events-none) but looks clickable

**Component:** ElevationProfile
**Viewport:** mobile
**Problem:** The SVG has `pointer-events-none sm:pointer-events-auto sm:cursor-pointer` (line 71). On mobile, the elevation profile renders as a visual chart but cannot be clicked to seek. There is no visual indication that it is non-interactive on mobile vs. interactive on desktop. Users will tap it expecting to seek and get no response. The height on mobile is only `h-6` (24px), far below the 44px minimum touch target.

**User impact:** Mobile users tap the elevation chart expecting to jump to a point in the route. Nothing happens. The chart is also too small to read elevation values meaningfully.

**Fix:** Either make it interactive on mobile too (with a larger touch target) or visually distinguish it:
```tsx
// Option A: Make interactive with adequate touch target
className="h-10 w-full rounded sm:cursor-pointer cursor-pointer"
// Remove the pointer-events-none on mobile entirely

// Option B: If keeping non-interactive on mobile, add visual dimming
className="h-6 w-full rounded pointer-events-none opacity-50 sm:opacity-100 sm:pointer-events-auto sm:cursor-pointer sm:h-10"
```

---

### [P1] Finding: SceneEditor uses browser confirm() for destructive actions, breaking the glass UI

**Component:** SceneEditor
**Viewport:** both
**Problem:** Lines 312-327 use `confirm(t('scenes.replaceConfirm'))` for the preset buttons. The native browser confirm() dialog completely breaks the Vitro glass-morphism aesthetic, has no i18n control over button labels (OK/Cancel are always in the browser's language, not the app's selected locale), and on mobile it causes a jarring system dialog that blocks interaction with the page. This is also an accessibility issue because the native dialog is not styled and its button labels cannot be controlled.

**User impact:** Users selecting a preset see a jarring native browser dialog with untranslated button labels. On some mobile browsers, this triggers a full-screen system dialog. The experience is completely disconnected from the app's design language.

**Fix:** Replace with the app's own ModalDialog:
```tsx
const [pendingPreset, setPendingPreset] = useState<(() => void) | null>(null)
// ...
<button onClick={() => {
  if (scenes.length > 0) { setPendingPreset(() => () => commitScenes(generateDefaultScenes())) }
  else commitScenes(generateDefaultScenes())
}}>
// Then render a confirmation modal using ModalDialog
```

---

### [P1] Finding: JourneyCreator uses browser confirm() for discard action

**Component:** JourneyCreator
**Viewport:** both
**Problem:** Line 519 uses `confirm(t('journey.discardConfirm'))` in the cancel button's onClick handler. Same issues as the SceneEditor confirm() -- native dialog breaks the design, button labels are not localized, jarring on mobile.

**User impact:** Tapping "Cancel" with waypoints placed triggers a native browser dialog. The "OK" / "Cancel" buttons are not translated, confusing non-English users.

**Fix:** Same as above -- use ModalDialog for confirmation.

---

### [P2] Finding: KeyboardHelp kbd elements have 44px min-height, creating excessively tall shortcut rows

**Component:** KeyboardHelp
**Viewport:** both
**Problem:** Each `<kbd>` element uses `min-h-11` (44px) for touch targets (line 71). While this is correct for interactive elements, `<kbd>` elements here are purely decorative -- they display shortcut keys like "Space", "F", "Esc" but are not interactive. The 44px min-height on each of the 6 shortcuts makes the panel unnecessarily tall (~300px just for the kbd rows), pushing the panel to require scrolling on smaller screens. The entire modal is capped at `max-w-sm` (384px) wide, which is fine, but the height could exceed viewport on iPhone SE.

**User impact:** The keyboard shortcuts panel is taller than needed, potentially requiring scrolling on small screens for a simple reference panel.

**Fix:** Remove min-h-11 from non-interactive kbd elements:
```tsx
<kbd
  className="gi inline-flex min-w-[3rem] items-center justify-center px-2 py-1.5 text-[10px] font-mono font-bold"
  style={{ color: 'var(--t2)', textAlign: 'center' }}
>
```

---

### [P2] Finding: Toast position (bottom-24) may overlap with Controls on mobile

**Component:** Toast, Controls
**Viewport:** mobile
**Problem:** Toast is positioned at `fixed bottom-24 right-4 z-50` (line 59). On mobile with a track loaded, the Controls component occupies roughly the bottom 80px of the screen. `bottom-24` = 96px, which means the toast's bottom edge starts just above the controls. However, the toast itself is ~40-50px tall, so it would overlap with the controls area visually. More critically, the toast's dismiss button (X icon at 14px) is very small and has no min-height/width constraint, violating the 44px touch target guideline.

**User impact:** Error/info toasts partially overlap with playback controls on mobile, and the dismiss button is too small to tap reliably.

**Fix:**
```tsx
// Toast.tsx line 59 -- adjust position for mobile
<div className="fixed bottom-28 sm:bottom-24 right-4 z-50 flex flex-col gap-2">

// Toast.tsx line 45 -- enlarge dismiss button
<button onClick={onDismiss}
  className="cursor-pointer flex-shrink-0 flex min-h-11 min-w-11 items-center justify-center"
  style={{ color: 'var(--t4)' }}
  aria-label={t('toast.dismiss')}>
  <X size={14} strokeWidth={2} />
</button>
```

---

### [P2] Finding: Controls playback stats row wraps awkwardly on narrow screens

**Component:** Controls
**Viewport:** mobile
**Problem:** The stats row (line 139-145) uses `flex w-full items-center justify-between` on mobile with `sm:ml-auto sm:w-auto`. On iPhone SE (320px), the text `{traveled} / {total} | {elapsed} / {duration}` with distance values like "12.5 km / 25.3 km | 0:15 / 0:30" can easily exceed the available width, causing the row to wrap below the control buttons. The `text-xs` on mobile makes these numbers hard to read, especially the distance separator "/" which has no spacing around it.

**User impact:** On narrow phones, the distance/duration stats wrap to a second line, creating a taller-than-necessary control bar that eats into map space.

**Fix:**
```tsx
// Controls.tsx line 139 -- ensure compact layout on mobile
<div
  data-testid="playback-stats"
  className="flex items-center justify-between gap-2 text-[11px] sm:ml-auto sm:gap-3 sm:text-sm whitespace-nowrap"
  style={{ color: 'var(--t3)' }}
>
  <span className="truncate">{formatDistance(traveled, units)} / {formatDistance(total, units)}</span>
  <span className="truncate">{formatDuration(elapsed)} / {formatDuration(duration)}</span>
</div>
```

---

### [P2] Finding: FileUpload landing card exceeds 90vh on landscape orientation on small phones

**Component:** FileUpload
**Viewport:** mobile (landscape)
**Problem:** The landing card has `max-h-[90vh] overflow-y-auto` (line 125) which is correct for portrait. However, in landscape on an iPhone SE, 90vh is only ~270px. The card contains: preview image (~140px), title + subtitle (~60px), drop hint + format hint (~40px), browse button (~44px), draw route button (~44px), import guide link (~44px), iOS tip (~20px), error text (~20px) = ~412px total. This requires scrolling within the card on landscape, but the card itself is a scrollable island inside a blurred overlay, which feels odd. The overflow-y-auto creates a nested scroll context.

**User impact:** In landscape on small phones, the landing card requires scrolling within the card itself. Nested scrolling inside a blurred overlay is disorienting.

**Fix:** Reduce content density for landscape/small viewport:
```tsx
// FileUpload.tsx line 125 -- add landscape-specific max-height
className="gc w-full max-w-lg mx-4 p-4 sm:p-12 max-h-[90vh] overflow-y-auto ..."
// Also conditionally hide the preview image in landscape on small screens:
className="landing-preview-image block h-auto w-full ... max-h-[8rem] sm:max-h-none"
```

---

### [P2] Finding: Track name display uses fragile negative right margin and is hidden on most viewports

**Component:** TrackWorkspace
**Viewport:** desktop
**Problem:** Line 117 uses `right-[43rem]` which is an enormous negative right margin (688px from the right). This is only visible `lg:block` (1024px+). The intent is to show the track name in the top toolbar area, but the `right-[43rem]` value appears to be a hack that assumes the SceneEditor panel (w-80 = 320px) plus the right toolbar (~200px) are open. If neither is present, the track name extends too far right and overlaps with toolbar buttons. The title also uses `text-ellipsis whitespace-nowrap` but the container may have 0 effective width when `right-[43rem]` exceeds the available space.

**User impact:** On desktop, the track name is only visible on very wide screens (lg+), and even then may overlap with toolbar elements depending on what panels are open.

**Fix:** Use proper flex layout instead of absolute positioning with magic margins:
```tsx
// TrackWorkspace.tsx line 115-121
<div
  data-testid="track-title"
  className="absolute left-36 right-80 top-4 z-10 hidden overflow-hidden text-ellipsis whitespace-nowrap gi px-4 py-2 text-sm font-medium text-center lg:block"
  style={{ color: 'var(--t1)' }}
>
  {track.name}...
</div>
```
Better yet, integrate the track name into the TrackToolbar as a centered title.

---

### [P2] Finding: Scene range editor handles are 32px visual size in 44px hit area, but the visual handles are not centered

**Component:** SceneEditor (SceneRangeEditor)
**Viewport:** both
**Problem:** The drag handles (line 168) use `h-8 w-8` (32px) hit containers within a `-translate-y-1/2 -translate-x-1/2` centering transform. The visual handle inside is `h-6 w-3` (24x12px). The `-translate-x-1/2` centers the hit area on the percentage position, but the visual handle is only 12px wide, making it very hard to see and grab, especially on touch devices. The `touchAction: 'none'` on the region div prevents scrolling but there is no visual affordance that these are draggable.

**User impact:** Users cannot easily see or grab the scene range handles. On touch, the small visual target (12px wide) makes precise dragging difficult despite the larger 32px hit area.

**Fix:** Enlarge visual handles and add hover/active states:
```tsx
<div className="flex h-8 w-5 items-center justify-center rounded-full border-2 border-white/60 bg-[rgb(var(--gl))] shadow-lg transition-transform hover:scale-110 active:scale-95">
  <div className="h-4 w-0.5 rounded bg-black/30" />
</div>
```

---

### [P2] Finding: GoogleGuide SVG illustrations use fixed viewBox text that does not scale with i18n text length

**Component:** GoogleGuide (GuideIllustration)
**Viewport:** both
**Problem:** The SVG illustrations (e.g., lines 23-37) use `<text>` elements with fixed coordinates like `x="130" y="26"` inside a `viewBox="0 0 280 60"`. When translated text is longer than the English original (common in Japanese, Korean, German), the text overflows its `<rect>` container. For example, `t('guide.menuSettings')` in Japanese is "v -> Settei" which is similar length, but in Chinese "v -> Shezhi" could be shorter. The issue is most acute for `t('guide.yourTimeline')` which in Korean is "Naui Taimrain" -- potentially wider than the 72px rect allocation.

**User impact:** In some locales, the illustration text overflows its container box, making the flowchart diagrams look broken.

**Fix:** Use `textLength` attribute or dynamically size the SVG based on text content. Simpler fix: make the boxes wider and use smaller font sizes for longer translations:
```tsx
const text = { fill: 'var(--t3)', fontSize: 8, fontFamily: 'inherit', textLength: undefined as number | undefined }
// For each text element, compute textLength based on locale
```
Alternatively, use HTML/CSS flowcharts instead of SVG for better i18n support.

---

### [P2] Finding: ExportPanel "done" state checkmark animation does not respect prefers-reduced-motion

**Component:** ExportPanel, globals.css
**Viewport:** both
**Problem:** The `.export-checkmark` class (globals.css line 49-52) uses `animation: checkmark-in .3s ...`. While vitro-base.css has a `@media (prefers-reduced-motion: reduce)` rule that sets `animation-duration: 0.01ms !important`, this applies to `*, *::before, *::after`. However, the `.marker-pulse` animation has a specific `prefers-reduced-motion` override (globals.css line 38-42) that uses `display: none` instead of just reducing duration. The checkmark animation should similarly be handled -- a 0.01ms animation still fires, it just completes instantly, which for a scale(0) -> scale(1) animation means the element appears immediately (acceptable, but the code is inconsistent in how reduced motion is handled across components).

**User impact:** Minor -- the checkmark animation does technically respect reduced motion via the global rule, but the approach is inconsistent across the codebase.

**Fix:** For consistency, add explicit reduced-motion handling to the checkmark animation similar to how marker-pulse is handled:
```css
@media (prefers-reduced-motion: reduce) {
  .export-checkmark {
    animation: none;
  }
}
```

---

### [P2] Finding: JourneyCreator search results dropdown is positioned absolutely but may overflow the panel

**Component:** JourneyCreator
**Viewport:** both
**Problem:** The search results dropdown (line 599) uses `absolute left-4 right-4 top-full` positioning. The parent is the search bar container (`relative px-4 pt-2 pb-1`). However, the results dropdown may extend below the JourneyCreator panel, which has `overflow-hidden` on its root div (line 510). This means search results are clipped by the panel boundary. On mobile where the panel is only `w-72 max-w-[calc(100vw-2rem)]` wide, and the panel itself has limited height, the dropdown gets cut off.

**User impact:** When coordinate search returns results, the dropdown may be clipped by the panel, hiding valid results from the user.

**Fix:** Either remove `overflow-hidden` from the JourneyCreator root, or use a portal for the dropdown:
```tsx
// JourneyCreator.tsx line 510 -- change overflow-hidden to overflow-visible
className="absolute top-20 left-4 z-10 w-72 max-w-[calc(100vw-2rem)] gs overflow-visible sm:top-4"
```
Or render the dropdown via createPortal like ModalDialog does.

---

### [P2] Finding: FileUpload "Load New File" button has no visible focus indicator beyond the global ring

**Component:** FileUpload
**Viewport:** both
**Problem:** The load-new-file button (line 97-114) uses class `gi` which provides a glass background and border, but no explicit focus-visible styling. The global vitro-base.css does provide `box-shadow: var(--focus-ring)` for `button:focus-visible`, which works. However, the `gi` class itself has `transition: background .15s ease, border-color .15s ease, transform .15s ease` which does not include `box-shadow` in the transition list. This means the focus ring appears/disappears abruptly without a smooth transition, unlike other interactive elements.

**User impact:** Keyboard users see a jarring focus ring appear without transition, which feels inconsistent with the otherwise smooth Vitro design system.

**Fix:** Add box-shadow to the gi transition:
```css
/* vitro-base.css line 406 */
.gi {
  transition: background .15s ease, border-color .15s ease, transform .15s ease, box-shadow .15s ease;
}
```

---

### [P2] Finding: Controls progress slider has no haptic/sound feedback on mobile seek

**Component:** Controls
**Viewport:** mobile
**Problem:** The range input for progress (line 55-73) is a standard HTML range slider. On mobile, there is no visual indicator of the current time as the user drags the slider -- the value only updates in the stats row after `onChange` fires. The `step={0.001}` provides fine granularity but the visual feedback during drag is limited to the fill color change. There is no tooltip or time label that follows the thumb during drag, which makes precise seeking difficult.

**User impact:** Mobile users dragging the progress bar cannot see what time they are seeking to until they release. This makes it hard to jump to a specific moment in a long route.

**Fix:** Add a floating time indicator during drag:
```tsx
const [showSeekTooltip, setShowSeekTooltip] = useState(false)
const [seekTooltipValue, setSeekTooltipValue] = useState(0)

<input
  type="range"
  ...
  onPointerDown={() => setShowSeekTooltip(true)}
  onPointerUp={() => setShowSeekTooltip(false)}
  onInput={(e) => {
    const val = parseFloat(e.target.value)
    setSeekTooltipValue(val)
    onSeek(val)
  }}
/>
{showSeekTooltip && (
  <div className="absolute -top-8 left-[${seekTooltipValue * 100}%] ..." >
    {formatDuration(duration * seekTooltipValue)}
  </div>
)}
```

---

### [P2] Finding: GoogleGuide tab buttons use inline color override that breaks in dark mode

**Component:** GoogleGuide
**Viewport:** both
**Problem:** The tab buttons (line 293-296) use `style={{ background: tab === i ? 'rgb(var(--gl))' : 'var(--bg-gi)', color: tab === i ? '#fff' : 'var(--t3)' }}`. The `var(--bg-gi)` variable is not defined in either vitro-base.css or globals.css. The defined variables are `--gi-bg` (for the glass interactive background). This means inactive tabs get an undefined background, which falls back to transparent. The tabs thus appear as text floating on the modal backdrop with no background, making them hard to distinguish.

**User impact:** Inactive tabs in the GoogleGuide modal have no visible background, making them hard to identify as clickable elements.

**Fix:**
```tsx
// GoogleGuide.tsx line 294
style={{
  background: tab === i ? 'rgb(var(--gl))' : 'var(--gi-bg)',
  color: tab === i ? '#fff' : 'var(--t3)',
}}
```

---

### [P2] Finding: JourneyCreator icon selector buttons lack sufficient visual distinction between selected and unselected states

**Component:** JourneyCreator
**Viewport:** both
**Problem:** The travel icon buttons (line 618-640) show selected state via `borderColor: 'rgb(var(--gl))'` and `boxShadow: '0 0 0 1px rgba(var(--gl),.45) inset'`. This is a very subtle 1px difference that is hard to see, especially on mobile. The emoji inside each button is the same size regardless of selection state, and there is no background color change. The `gi` class provides a glass background for all buttons, making the selected one barely distinguishable.

**User impact:** Users cannot easily tell which travel icon is currently selected. On mobile, the subtle border change is nearly invisible.

**Fix:**
```tsx
style={{
  color: 'var(--t1)',
  background: isSelected ? 'rgba(var(--gl),.15)' : undefined,
  borderColor: isSelected ? 'rgb(var(--gl))' : undefined,
  boxShadow: isSelected ? '0 0 0 2px rgba(var(--gl),.5) inset' : undefined,
  transform: isSelected ? 'scale(1.1)' : undefined,
}}
```

---

### [P2] Finding: ElevationProfile hardcodes cyan (#06b6d4) instead of using design tokens

**Component:** ElevationProfile
**Viewport:** both
**Problem:** The SVG uses hardcoded colors: `stopColor="#06b6d4"` (lines 79-80), `stroke="#06b6d4"` (line 87), `fill="#06b6d4"` (line 93), and `stroke="#f97316"` (line 98) for the progress line. These should use the design system's `--gl` (glow) token and the trail color token, respectively. In dark mode with different map styles (e.g., Positron, Liberty), the glow color changes via `--gl`, but the elevation profile always shows cyan. This creates a visual disconnect when the map style is changed.

**User impact:** When using the Positron (cool silver-blue) or Liberty (warm olive-green) map style, the elevation profile still shows teal/cyan, which clashes with the rest of the UI that has adapted to the map's color theme.

**Fix:** Use CSS custom properties via SVG `style` attribute or inline styles:
```tsx
<stop offset="0%" stopColor="rgb(var(--gl))" stopOpacity="0.4" />
<stop offset="100%" stopColor="rgb(var(--gl))" stopOpacity="0.05" />
```
Note: SVG `stopColor` does not support CSS custom properties directly. The workaround is to use `style={{ stopColor: 'rgb(var(--gl))' }}` or render the SVG with HTML elements instead.

---

### [P2] Finding: SceneEditor scene name input has invisible focus state until focused

**Component:** SceneEditor
**Viewport:** both
**Problem:** The scene name input (line 381-385) uses `borderBottomColor: 'transparent'` by default, and switches to `borderBottomColor: 'rgb(var(--gl))'` on focus via inline event handlers (`onFocus` / `onBlur`). This approach has two problems: (1) it uses imperative DOM manipulation (`e.target.style.borderBottomColor = ...`) instead of React state, which can lead to stale state issues, and (2) the input has no visual affordance that it is editable -- it looks like plain text with no border, underline, or background differentiation.

**User impact:** Users do not realize the scene name is editable because there is no visual indicator. The input appears as static text until accidentally focused.

**Fix:** Use React state for the focus indicator and add a permanent subtle affordance:
```tsx
const [focusedSceneInput, setFocusedSceneInput] = useState<string | null>(null)
// ...
<input
  value={scene.name}
  onChange={e => updateScene(scene.id, { name: e.target.value })}
  className="text-xs font-semibold bg-transparent w-32 outline-none border-b"
  style={{
    color: 'var(--t1)',
    borderBottomColor: focusedSceneInput === scene.id
      ? 'rgb(var(--gl))'
      : 'var(--div)',
    transition: 'border-color .15s ease',
  }}
  onFocus={() => setFocusedSceneInput(scene.id)}
  onBlur={() => setFocusedSceneInput(null)}
/>
```

---

### [P2] Finding: ExportPanel progress bar animation during export can jank on low-end devices

**Component:** ExportPanel
**Viewport:** both
**Problem:** The export progress bar (line 215-217) uses `transition-all duration-200` on the width change. During active export, the progress value updates frequently (potentially every animation frame), causing the transition to be interrupted and restarted constantly. This creates visual jank where the bar stutters instead of smoothly advancing. The `transition-all` is also overly broad -- only `width` needs transitioning.

**User impact:** On low-end devices, the export progress bar stutters and jumps instead of smoothly advancing, giving an impression of poor performance.

**Fix:**
```tsx
<div className="h-full rounded-full" style={{
  width: `${exportProgress * 100}%`,
  background: 'rgb(var(--gl))',
  transition: 'width .3s linear',
}} />
```

---

### [P2] Finding: FileUpload drop zone feedback is subtle -- no text change on drag

**Component:** FileUpload
**Viewport:** desktop
**Problem:** When a file is dragged over the upload area, the visual feedback is: border color changes to `rgb(var(--gl))` and the card scales to `1.02`. The text still says "Drop your travel file here" -- it does not change to an active-state message like "Drop to upload" or "Release to load". On mobile, drag-and-drop is not possible, so the isDragging state never triggers, but the drop hint text "Drop your travel file here" is still shown, which is misleading.

**User impact:** Desktop users dragging a file see minimal visual change. Mobile users see "Drop your file here" text even though dropping is not supported on touch devices.

**Fix:**
```tsx
// FileUpload.tsx -- conditional drop hint
<p className="text-sm mb-1" style={{ color: 'var(--t4)' }}>
  {isDragging
    ? t('fileUpload.dropHint') + ' — Release to upload!'  // or add i18n key
    : isTouchDevice
      ? t('fileUpload.formatHint')
      : t('fileUpload.dropHint')
  }
</p>
```

---

### [P3] Finding: ThemeToggle sun/moon icons are 18px but the button is 44px -- icon is off-center visually

**Component:** ThemeToggle
**Viewport:** both
**Problem:** The button is `h-11 w-11` (44px) with `items-center justify-center`. The Sun/Moon icons are 18px, which should center correctly. However, the Sun icon at 18px with strokeWidth={2} appears slightly smaller than the Moon icon at the same size due to the Moon's filled crescent taking more visual space. The icons are also very similar in size to the surrounding text (11px), making the toggle feel small.

**User impact:** Minor visual inconsistency -- the sun and moon icons appear to be slightly different visual weights.

**Fix:** Increase icon size to 20px for better visual balance:
```tsx
<Sun size={20} strokeWidth={2} />
<Moon size={20} strokeWidth={2} />
```

---

### [P3] Finding: ErrorBoundary uses emoji in heading which may not render consistently

**Component:** ErrorBoundary
**Viewport:** both
**Problem:** Line 43 uses `<p className="text-5xl mb-4">😵</p>` as the error indicator. Emoji rendering varies across platforms -- on Windows it renders as a colorful emoji, on Linux it may render as a monochrome outline, and screen readers will announce it differently across platforms (some announce the emoji name, others skip it). There is no `aria-hidden` on the emoji, so screen readers may announce "dizzy face" or similar.

**User impact:** The error page appearance varies across platforms. Screen readers may announce an unexpected emoji name.

**Fix:**
```tsx
<span className="text-5xl mb-4 block" aria-hidden="true">😵</span>
// Or use an SVG icon from lucide-react for consistency:
import { AlertTriangle } from 'lucide-react'
<AlertTriangle size={48} strokeWidth={1.5} style={{ color: 'var(--err)' }} />
```

---

### [P3] Finding: Locale select in GlobalToolbar uses `appearance-none` but has no custom dropdown indicator

**Component:** GlobalToolbar
**Viewport:** both
**Problem:** The locale select (line 53) uses `appearance-none text-center` but has no custom dropdown chevron. Users see "EN" with no visual indicator that it is a dropdown/select element rather than a static label. The `cursor-pointer` helps slightly but there is no affordance for discoverability.

**User impact:** Users may not realize the language selector is interactive.

**Fix:** Add a small chevron indicator or use the `vitro-select` class which includes the proper styling:
```tsx
<select
  value={locale}
  onChange={e => setLocale(e.target.value as Locale)}
  aria-label={t('locale.label')}
  className="gi min-h-11 px-2 py-1.5 text-xs font-medium cursor-pointer text-center pr-6"
  style={{ color: 'var(--t2)', minWidth: '3.75rem', backgroundImage: 'url("data:image/svg+xml,...")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
>
```

---

### [P3] Finding: Controls speed label hidden on mobile but duration select always visible

**Component:** Controls
**Viewport:** mobile
**Problem:** The "Speed" label (line 95) uses `hidden sm:inline`, hiding it on mobile. But the duration select (line 110-120) has no hidden label. This creates an asymmetry where one dropdown has a label and the other does not on mobile. Both selects use `text-xs sm:text-sm` which is very small on mobile (approx 10.7px on iPhone SE with the 0.89 type scale).

**User impact:** On mobile, the speed dropdown has no label, while the duration dropdown has no label either but is visually identical. Users must rely on the dropdown options to understand what each control does.

**Fix:** Add aria-labels (already present) but also add a minimal inline label:
```tsx
// Speed select
<span className="text-[9px] mr-0.5 sm:hidden" style={{ color: 'var(--t4)' }}>x</span>
```

---

### [P3] Finding: MapView error state has no retry mechanism

**Component:** MapView
**Viewport:** both
**Problem:** When the map fails to load (line 840-843), the error message is displayed but there is no "Retry" or "Reload Map" button. The user must reload the entire page. The error message uses `t('app.mapLoadFailed').replace('{error}', mapError)` which is fine for display, but the replace() is not a proper i18n interpolation -- if the error message contains characters that break the sentence structure in other languages, the result could be grammatically incorrect.

**User impact:** Users who encounter a WebGL or map loading error have no way to retry without reloading the page.

**Fix:** Add a retry button:
```tsx
<div className="flex items-center justify-center h-full text-sm p-4 text-center" style={{ background: 'var(--bg)', color: 'var(--t3)' }}>
  <div>
    <p>{t('app.mapLoadFailed').replace('{error}', mapError)}</p>
    <button onClick={() => window.location.reload()}
      className="gi mt-4 px-4 py-2 text-sm cursor-pointer"
      style={{ color: 'var(--t1)' }}>
      {t('error.reloadPage')}
    </button>
  </div>
</div>
```

---

### [P3] Finding: SceneEditor coverage bar and range editor show redundant percentage labels

**Component:** SceneEditor
**Viewport:** both
**Problem:** The coverage bar (line 348-364) shows "0%" and "100%" labels. Each scene also shows "From X% · To Y%" text (line 405-407). The range editor (line 181-185) also shows "0%" and "100%". This means the 0-100% scale is shown three times in the same panel. The repeated labels add visual clutter without adding information.

**User impact:** The Scene Editor panel has redundant percentage labels, making it feel more complex than necessary.

**Fix:** Remove the coverage bar labels (they are the least useful since the bar is only 12px tall):
```tsx
// SceneEditor.tsx line 362-364 -- remove these
// <div className="flex justify-between text-[9px] mt-0.5" style={{ color: 'var(--t4)' }}>
//   <span>0%</span><span></span><span>100%</span>
// </div>
```

---

### [P3] Finding: GoogleGuide "Open Google Takeout" link uses vitro-btn-primary but navigates away from the app

**Component:** GoogleGuide
**Viewport:** both
**Problem:** The "Open Google Takeout" button (line 340-344) is styled as `vitro-btn-primary` and renders as an `<a>` tag with `target="_blank"`. The primary button styling (filled accent color) suggests this is the main call-to-action within the modal, potentially confusing users into thinking it will perform an action within the app rather than navigating to an external site. The `ExternalLink` icon is present but at 14px it is small.

**User impact:** Users may expect the "Open Google Takeout" button to do something within the app rather than opening a new browser tab.

**Fix:** Style as a secondary/outlined action instead:
```tsx
<a
  href={step.action.href}
  target="_blank"
  rel="noopener noreferrer"
  className="gi mt-3 inline-flex min-h-11 items-center gap-1.5 px-4 py-2 text-sm font-medium"
  style={{ color: 'rgb(var(--gl))' }}
>
```

---

### [P3] Finding: JourneyCreator "Done" and "Create Route" buttons use hardcoded #f97316 orange instead of design token

**Component:** JourneyCreator
**Viewport:** both
**Problem:** Lines 689 and 719 use `style={{ background: '#f97316' }}` for the "Done" and "Create Route" buttons. This orange color is the trail color used in the map but is hardcoded rather than using a CSS variable. In the Vitro design system, primary actions should use `rgba(var(--gl), .85)` (the accent/glow color), and the trail orange should be a named token like `--trail-color`. The inconsistency means these buttons will not adapt to map style changes that modify `--gl`.

**User impact:** The orange buttons stand out from the rest of the teal/cyan accent color system, which could be intentional (to distinguish the "Done" action) but it breaks the design system consistency.

**Fix:** Either use the design system primary style:
```tsx
className="vitro-btn-primary ..."
```
Or define a trail color token and reference it:
```css
:root { --trail: #f97316; }
```
```tsx
style={{ background: 'rgba(var(--gl),.85)' }}
```

---

### [P3] Finding: MapView map error div has no role="alert" for screen readers

**Component:** MapView
**Viewport:** both
**Problem:** The map error message (line 841) is a plain `<div>` with no ARIA role. Screen readers may not announce this error message automatically since it is not a live region or alert.

**User impact:** Screen reader users may not be notified when the map fails to load.

**Fix:**
```tsx
<div role="alert" data-testid="map-error" className="flex items-center justify-center h-full text-sm p-4 text-center" style={{ background: 'var(--bg)', color: 'var(--t3)' }}>
```

---

### [P3] Finding: ExportPanel "Share" button may silently fail without user feedback

**Component:** ExportPanel
**Viewport:** mobile
**Problem:** The `handleShare` function (lines 114-126) wraps the entire share flow in a try/catch that silently swallows errors, including `AbortError` (user cancel) and `NotSupportedError` (browser cannot share files). While catching `AbortError` is correct (user intentionally cancelled), other errors like network failures during the blob fetch or unsupported share targets should give the user feedback.

**User impact:** If sharing fails for a non-cancellation reason, the user sees no feedback and may think the share succeeded or the button is broken.

**Fix:**
```tsx
const handleShare = useCallback(async () => {
  if (!exportedVideoUrl) return
  try {
    const response = await fetch(exportedVideoUrl)
    const blob = await response.blob()
    const file = new File([blob], 'travelback.mp4', { type: 'video/mp4' })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Travelback' })
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    // Signal failure for other errors
    console.warn('Share failed:', err)
  }
}, [exportedVideoUrl])
```

---

### [P3] Finding: SceneEditor blend slider uses inline accent-color but the custom slider styling in globals.css only applies to `[type="range"]` in the global scope

**Component:** SceneEditor
**Viewport:** both
**Problem:** The blend slider (line 335-339) uses `style={{ accentColor: 'rgb(var(--gl))' }}` and `className="flex-1 h-2 cursor-pointer"`. However, globals.css defines custom slider thumb/track styles for `input[type="range"]` with webkit/moz pseudo-elements. The `accentColor` property is a fallback that only applies when the browser does not render the custom pseudo-elements. The SceneEditor sliders do not use the `vitro-btn` or any custom range class, so they may render inconsistently with the Controls progress slider which does have the custom webkit styling.

**User impact:** Scene parameter sliders may look different from the main progress slider in Controls.

**Fix:** Apply consistent range input styling across all sliders. Either add a shared class or use the globals.css custom styling:
```css
/* globals.css -- ensure all range inputs get the same styling */
input[type="range"] {
  /* shared styles already exist in globals.css */
}
```
Verify that SceneEditor's range inputs inherit these global styles correctly.

---

## Summary Table

| # | Severity | Component | Finding |
|---|----------|-----------|---------|
| 1 | P1 | SceneEditor | Absolute positioning with fragile top/bottom values breaks on mobile |
| 2 | P1 | TrackWorkspace | 4 interactive layers competing for bottom zone on mobile |
| 3 | P1 | GlobalToolbar | Hidden when track is loaded on mobile -- no locale/unit/theme access |
| 4 | P1 | ElevationProfile | Non-interactive on mobile but looks clickable; too small (24px) |
| 5 | P1 | SceneEditor | Browser confirm() breaks glass UI, no i18n on buttons |
| 6 | P1 | JourneyCreator | Browser confirm() for discard action breaks UI |
| 7 | P2 | KeyboardHelp | 44px min-height on non-interactive kbd creates excessively tall panel |
| 8 | P2 | Toast | Position overlaps Controls on mobile; dismiss button too small |
| 9 | P2 | Controls | Stats row wraps awkwardly on narrow screens |
| 10 | P2 | FileUpload | Landing card exceeds 90vh in landscape on small phones |
| 11 | P2 | TrackWorkspace | Track name uses fragile negative right margin, hidden on most viewports |
| 12 | P2 | SceneEditor | Range editor handles too small and lack visual affordance |
| 13 | P2 | GoogleGuide | SVG illustrations do not scale with i18n text length |
| 14 | P2 | ExportPanel | Checkmark animation reduced-motion handling inconsistent |
| 15 | P2 | JourneyCreator | Search results dropdown clipped by overflow-hidden |
| 16 | P2 | FileUpload | gi class transition missing box-shadow for smooth focus ring |
| 17 | P2 | Controls | Progress slider has no seek-time feedback during drag |
| 18 | P2 | GoogleGuide | Tab buttons use undefined --bg-gi variable |
| 19 | P2 | JourneyCreator | Icon selector selected state is nearly invisible |
| 20 | P2 | ElevationProfile | Hardcodes #06b6d4 instead of design tokens |
| 21 | P2 | SceneEditor | Scene name input has invisible focus state, uses imperative DOM |
| 22 | P2 | ExportPanel | Progress bar transition jank on frequent updates |
| 23 | P2 | FileUpload | Drop zone feedback is subtle; misleading on touch devices |
| 24 | P3 | ThemeToggle | Sun/moon icons appear slightly different visual weight |
| 25 | P3 | ErrorBoundary | Emoji in heading renders inconsistently across platforms |
| 26 | P3 | GlobalToolbar | Locale select has no dropdown chevron indicator |
| 27 | P3 | Controls | Speed label hidden on mobile but duration also unlabeled |
| 28 | P3 | MapView | Error state has no retry mechanism |
| 29 | P3 | SceneEditor | Redundant 0-100% labels shown three times |
| 30 | P3 | GoogleGuide | Primary-styled external link may confuse users |
| 31 | P3 | JourneyCreator | Hardcoded #f97316 instead of design token |
| 32 | P3 | MapView | Error div missing role="alert" for screen readers |
| 33 | P3 | ExportPanel | Share failure gives no user feedback |
| 34 | P3 | SceneEditor | Range slider styling inconsistent with Controls slider |

---

## Top 5 Most Impactful Fixes

1. **SceneEditor mobile layout (Finding #1)** -- The absolute positioning with hardcoded top/bottom makes the Scene Editor nearly unusable on phones. Switching to a bottom-sheet pattern on mobile would make it functional on all devices.

2. **Replace browser confirm() with ModalDialog (Findings #5 + #6)** -- The native browser dialogs completely break the Vitro glass design language and have non-localized button labels. This affects two components and is the most jarring visual inconsistency in the app.

3. **ElevationProfile mobile interactivity (Finding #4)** -- The 24px non-interactive chart on mobile is both too small to read and misleading (looks tappable but is not). Making it interactive with a 40px minimum height would significantly improve the mobile experience.

4. **Bottom zone stacking on mobile (Finding #2)** -- The timeline + elevation + controls stack takes ~180px on small screens. Collapsing the timeline on mobile and giving the elevation profile more space would dramatically improve the mobile viewing experience.

5. **GlobalToolbar visibility on mobile (Finding #3)** -- Once a track is loaded, users lose access to language, units, and theme settings on mobile. While the TrackToolbar menu exists, its Settings gear is not prominent enough. Highlighting it or adding a visible "Settings" label would restore discoverability.