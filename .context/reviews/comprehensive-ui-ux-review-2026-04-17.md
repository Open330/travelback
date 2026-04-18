# Comprehensive UI/UX Review — Deep Critical Analysis

**Date:** 2026-04-17
**Reviewer:** Automated deep code + visual audit
**Scope:** Full UI/UX across all components, viewports, themes, and interaction states
**Method:** Source code analysis (all 17 components, design system, i18n) + browser-based visual verification

---

## Executive Summary

The app has a polished Vitro glass-morphism design system and most prior review findings are resolved. However, this deep audit identifies **31 issues** across 7 categories: 6 critical, 10 high, 15 medium. Key problem areas are information density at the loaded-state bottom zone, CJK typography regressions from the font-weight override, accessibility gaps in dynamic content, and several mobile interaction failures.

---

## 1. Critical Issues (P0)

### 1.1 Bottom zone vertical crush — controls + elevation + timeline compete for ~200px on mobile

`TrackWorkspace.tsx:124-151` stacks three heavy UI bands at the viewport bottom:

```
bottom-40 → TimelineSelector (h-12 sm:h-16 = ~48-64px)
bottom-0  → ElevationProfile (h-6 sm:h-10 = ~24-40px) + Controls (gc card with progress bar + button row)
```

On a 667px iPhone 8 viewport: map visible area shrinks to ~350px. On 568px iPhone SE: **~270px of map**. The timeline selector at `bottom-40` (160px from bottom) places it directly atop the elevation+controls stack with only ~20px gap on small phones.

**Impact:** Users cannot see enough map to orient themselves. The timeline handles (44px touch targets) may overlap the elevation profile on very small screens.

**Fix:** Collapsible bottom sheet pattern — collapse timeline and elevation into a single swipe-up tray. Or move timeline to a horizontal scroll strip inside the controls card.

### 1.2 `font-weight: 400` override breaks CJK line-height calculations

`globals.css:21-24`:
```css
body, [lang] {
  font-family: 'Pretendard Variable', ...;
  font-weight: 400;
}
```

But `vitro-base.css:79-98` sets `font-weight: 100` for `[lang="ko"]`, `[lang="ja"]`, `[lang="en"]`. The globals.css rule comes *after* the vitro-base import in the cascade (`@import "../styles/vitro-base.css" layer(base)`) — but since globals.css is not in a layer and vitro-base is in the `base` layer, unlayered styles win. This means **all CJK text renders at weight 400 instead of 100**, and the line-height values calibrated for weight-100 CJK (1.66 for Korean, 1.7 for Japanese) now produce excessively loose vertical rhythm.

**Impact:** Korean and Japanese UI text looks bolder and more loosely spaced than intended by the design system. Paragraph-style text (Google Guide steps, Journey Creator instructions) is noticeably heavier than the thin, airy aesthetic the Vitro system was designed for.

**Fix:** Remove the `font-weight: 400` override from `globals.css`, or change it to `font-weight: 100` to match the design system. If readability at weight 100 is the concern, adjust the design system variables instead of overriding per-lang.

### 1.3 Track title bar invisible on all viewports below 1280px

`TrackWorkspace.tsx:117-121`:
```jsx
className="... hidden ... xl:block"
```

The track name + point count is `hidden` on everything below `xl` (1280px). On the vast majority of laptops (1366×768 is still the most common resolution, and with browser chrome that's below 1280px viewport), users see **no track identification at all** after loading a file. There is no fallback indicator.

**Impact:** If a user loads multiple tracks in a session, they cannot tell which track they're viewing. The "2,847 / 12,431 locations" count is invisible on most devices.

**Fix:** Show a condensed version (track name only, no counts) at the `lg` breakpoint. Or show the name inside the controls card as a small subtitle.

### 1.4 Scene editor positioning creates dead zone on mobile

`SceneEditor.tsx:291`:
```jsx
className="absolute left-4 right-4 top-44 bottom-32 z-20 w-auto gs ..."
```

`top-44` (176px from top) + `bottom-32` (128px from bottom) = 304px consumed, leaving the editor at roughly 463px on iPhone 8. But the toolbar at `top-4` (16px) plus scene editor at `top-44` means there's a **128px dead zone** between the toolbar bottom edge (~56px) and the scene editor top (176px) where the map shows through but the scene editor doesn't cover. On mobile, this is wasted space in an already cramped layout.

More critically: the scene editor overlaps the track toolbar on desktop at `sm:right-auto sm:top-16 sm:w-80`. The toolbar is at `top-4 right-4` and the scene editor is at `top-16 left-4` — they're in different corners, but on narrow screens (say 768px tablet portrait), the scene editor at `w-80` (320px) + `left-4` takes up nearly half the screen width, and the toolbar buttons on the right may get pushed behind it.

**Fix:** Use a slide-over drawer pattern for the scene editor on mobile. On desktop, ensure the right toolbar buttons remain accessible by adding a right margin that matches the toolbar width.

### 1.5 Export panel has no duration sync with playback controls

`ExportPanel.tsx` maintains its own `duration` state (line 56), initialized to `30`, independent of the playback duration in `Controls.tsx`. When a user sets the animation duration to 60s in the playback controls, then opens the export panel, they see `30` (the default). If they don't notice and export, they get a 30-second video instead of the 60-second one they were previewing.

**Impact:** Silent data loss — user expects the exported video to match what they see, but it doesn't.

**Fix:** Pass the current playback `duration` as the initial value for the export panel's duration, or display a warning if they differ.

### 1.6 Keyboard shortcut "?" conflicts with text input

`usePlaybackController.ts` registers global keyboard handlers including "?" for help. But when a user is typing in the Journey Creator search input, the Scene Editor name input, or the Export duration input, pressing "?" triggers the help modal instead of typing the character.

`KeyboardHelp.tsx:62` and `page.tsx:98-112` — the `usePlaybackHotkeys` hook checks for `isExporting` but not for active text input focus.

**Impact:** Cannot type "?" in any input field. This is a basic input failure.

**Fix:** Check `document.activeElement` — if it's an `input`, `textarea`, or `select`, skip hotkey processing. This is a standard pattern.

---

## 2. High Priority Issues (P1)

### 2.1 Google Guide tabs overflow on mobile

`GoogleGuide.tsx:282`:
```jsx
className="mb-3 grid grid-cols-2 gap-1.5 px-5 sm:grid-cols-4"
```

7 tabs in a 2-column grid on mobile = 4 rows of tabs. Each tab has `min-h-11` (44px) + 6px gap = ~200px of vertical space consumed just by tab buttons. On a 568px screen with the modal header (~80px), that leaves only ~290px for the actual guide content, images, and tips section.

**Impact:** Google Guide is nearly unusable on small phones. Most of the modal is tabs; little room for the actual instructions.

**Fix:** Use a horizontally scrollable tab strip instead of a grid on mobile. Or use an accordion/collapsible section list instead of tabs.

### 2.2 No loading/empty state for map tiles

When the map first loads (especially on slow connections), the user sees a blank gray rectangle. There's no loading indicator, skeleton, or any feedback that the map is loading. `MapView.tsx:471-477` creates the map with no loading state exposed.

**Impact:** On slow networks, the landing page looks broken — just a gray box with the upload card on top. Users may think the app is non-functional.

**Fix:** Show a subtle loading spinner or "Loading map..." text centered in the map container until the `style.load` event fires.

### 2.3 Follow camera toggle button lacks clear state indication on desktop

`Controls.tsx:123-135`: On desktop (non-coarse pointer), the button shows only "Track" text regardless of state. When active, it gets a colored background — but "Track" doesn't clearly communicate "camera is following the route." The mobile version shows "Track: ON" / "Track: OFF" which is clearer, but desktop users don't get this.

**Impact:** Desktop users don't understand what the toggle does. "Track" is ambiguous — it could mean "show the track" or "track/follow the position."

**Fix:** On desktop, show a small indicator like "Follow" when off and "Following" when on. Or add a small icon (e.g., crosshair/locate).

### 2.4 Elevation profile seek is imprecise on mobile

`ElevationProfile.tsx:53-56`: The SVG is only `h-6` (24px) tall on mobile. The click handler converts clientX to progress, but with a 24px tall target area, precise seeking is nearly impossible, especially while walking or on a bumpy commute.

**Impact:** The elevation profile is effectively decorative on mobile — it's too small to interact with meaningfully.

**Fix:** Increase the tap target height to at least 44px (with transparent padding if visual height should stay small). Or make the elevation profile non-interactive on mobile and rely solely on the progress bar in Controls.

### 2.5 TimelineSelector date labels use `toLocaleString` with `undefined` locale

`TimelineSelector.tsx:21-27`:
```js
date.toLocaleString(undefined, { month: 'short', ... })
```

The `undefined` locale means the browser's locale is used, which may not match the app's selected locale. If a user selects Korean (KO) in the locale picker but their browser is set to English, dates in the timeline still show in English.

**Impact:** Inconsistent localization — dates don't respect the user's language choice.

**Fix:** Pass the current locale to `toLocaleString` instead of `undefined`.

### 2.6 Scene editor preset buttons replace scenes without confirmation

`SceneEditor.tsx:312-327`: Clicking any preset button (Cinematic, Simple, Bird's Eye, Dynamic) immediately replaces all existing scenes. If a user has spent time customizing scenes and accidentally clicks a preset, their work is gone with no undo (the undo only works for single-scene deletions).

**Impact:** Destructive action without confirmation. Users can lose significant work.

**Fix:** Show a confirmation dialog when replacing scenes that already exist. Or implement a full undo stack.

### 2.7 Journey Creator undo doesn't restore map state properly

`JourneyCreator.tsx:414-419`: The `handleUndo` removes the last waypoint from the array and calls `updateMapData`, but doesn't handle the case where the removed waypoint was being dragged. If a user starts dragging a waypoint and then triggers undo (unlikely but possible via keyboard), the drag state can become inconsistent.

**Fix:** Cancel any active drag when undo fires.

### 2.8 No visual feedback when drag-and-drop file upload fails format check

`FileUpload.tsx:73-78`: When a user drops a file with an unsupported extension (e.g., `.csv`), the `handleFile` callback runs `parseTrackFile` which will throw. But during the brief parsing attempt, there's no visual feedback that the drop was received. The `isDragging` state is reset immediately on `handleDrop`, so the blue border highlight disappears before the error appears.

**Impact:** User may drop a file and think nothing happened for a moment before the error message appears.

**Fix:** Show a brief "Processing..." state after drop, or keep the border highlight until the parse result is known.

### 2.9 Mobile "more controls" menu doesn't close on route change

`TrackToolbar.tsx:46-65`: The mobile menu's close-on-outside-click uses `mousedown` events, but it doesn't close when the user interacts with the map (which sits behind the menu). If the menu is open and the user pans the map, the menu stays open and may obscure map controls.

**Fix:** Close the menu on any map interaction (add a map `movestart` listener), or add a more prominent close affordance.

### 2.10 GlobalToolbar hidden on loaded state — locale/unit settings become undiscoverable

`GlobalToolbar.tsx:25`:
```jsx
className={`... ${hasTrack ? 'hidden sm:flex sm:top-[4.75rem]' : 'top-4 flex'}`}
```

On mobile with a track loaded, the global toolbar (units + locale + theme) is completely hidden. The only way to access these settings on mobile is through the TrackToolbar's "..." menu. But the "..." menu is at the top-right, and the toolbar buttons (Scenes, Export) are prominent — the overflow menu is not obviously where you'd look for settings.

**Impact:** Mobile users may never discover they can change units, language, or theme after loading a track.

**Fix:** Move a minimal settings trigger (gear icon) to a more prominent position in the loaded-state mobile UI.

---

## 3. Medium Priority Issues (P2)

### 3.1 Upload card `p-12` is excessive on small phones

`FileUpload.tsx:125`: `p-12` (48px padding) on a 320px wide screen means 96px is just padding. The content area is only ~224px wide, forcing the title, subtitle, and buttons into a very narrow column.

**Fix:** Use responsive padding: `p-6 sm:p-12`.

### 3.2 Progress bar slider thumb invisible on dark backgrounds in dark mode

`Controls.tsx:67-71`: The custom slider thumb uses `border: 2px solid rgba(255,255,255,.8)` and `background: rgb(var(--gl))`. In dark mode with the Dark map style, the teal thumb on a nearly-invisible track (rgba(gl, .15) against dark background) can be hard to see, especially the filled vs unfilled portions.

**Fix:** Increase the track fill opacity in dark mode, or add a distinct fill color that contrasts with the glass background.

### 3.3 Export panel's bitrate field is `readOnly` but looks editable

`ExportPanel.tsx:289`:
```jsx
<input type="number" ... value={bitrate} className="vitro-input ..." readOnly />
```

The bitrate input uses the same styling as editable inputs but is `readOnly`. Users will click it, try to type, and nothing will happen. This is confusing.

**Fix:** Either make it editable (with validation), or style it differently (e.g., as a plain text display, not an input field) and add a tooltip explaining that bitrate is derived from the quality setting.

### 3.4 Scene range editor handles are 32×32px on desktop — below 44px touch target

`SceneEditor.tsx:168`: The drag handles are `h-8 w-8` (32×32px). While acceptable for mouse, they're below the 44px minimum for touch. On a tablet in the scene editor, dragging range boundaries would be frustrating.

**Fix:** Use the same transparent-touch-target pattern as TimelineSelector (visible element is small but the touch target is 44px).

### 3.5 No confirmation when leaving JourneyCreator with waypoints

If a user adds waypoints in the Journey Creator and then clicks "Cancel" or navigates away, all waypoints are silently discarded. There's no "Are you sure?" prompt.

**Fix:** Add a confirmation dialog when canceling with ≥1 waypoint.

### 3.6 Google Guide "Open Google Takeout" link opens in same tab on some configurations

`GoogleGuide.tsx:341`: The link uses `target="_blank" rel="noopener noreferrer"`, which is correct. However, if the browser blocks popups/new tabs, the link may open in the same tab, navigating away from Travelback and losing the user's work.

**Fix:** Add `onClick` handler that warns if the current track session would be lost.

### 3.7 Loading spinner in FileUpload uses teal border without checking theme contrast

`FileUpload.tsx:137`:
```jsx
style={{ borderColor: 'rgb(var(--gl))', borderTopColor: 'transparent' }}
```

On the Positron map style (which changes `--gl` to `100, 116, 160` — a muted blue-gray), the spinner may have very low contrast against the glass background.

**Fix:** Use a more visible spinner color, or add a subtle background to the spinner area.

### 3.8 Map reference grid persists when switching to non-map views

The reference grid (`MapView.tsx:262-305`) is always drawn when the style loads. If the user is on the landing page with no track, they see the global reference grid (every 30°) which is cosmetic but adds visual noise to the otherwise clean landing.

**Impact:** Minor visual clutter on the landing page map.

### 3.9 Controls stats row uses `text-[10px]` on mobile

`Controls.tsx:142`: The distance and time stats are 10px on mobile. This is below the recommended 12px minimum for readable text, especially on non-retina devices.

**Fix:** Use `text-xs` (12px) as the minimum, even on mobile.

### 3.10 Export "estimated time" can be wildly inaccurate

`ExportPanel.tsx:77-83`: The estimate uses a simple linear formula based on resolution pixels and codec. It doesn't account for:
- GPU availability (WebCodecs can be 10x faster with hardware acceleration)
- Number of track points (rendering 100k points is much slower than 500)
- Scene complexity (orbit scenes with rotation are slower)

**Impact:** Users may see "~2 minutes" and it takes 8, or see "~5 minutes" and it takes 30 seconds. Either way, the estimate erodes trust.

**Fix:** Add wide confidence ranges ("~1-5 min"), or show the estimate as a rough order of magnitude rather than a precise number.

### 3.11 Toast notifications have no progress bar or auto-dismiss timer

The Toast component (`Toast.tsx`) shows notifications that auto-dismiss, but there's no visual countdown. Users don't know how long they have to read the message before it disappears.

**Fix:** Add a subtle progress bar that shows remaining time.

### 3.12 Theme toggle button has no focus indicator beyond the vitro focus ring

`ThemeToggle.tsx:62`: The 44×44px button relies on the vitro `focus-visible` ring (`var(--focus-ring)`). On the glass background, the ring may be difficult to see, especially in dark mode where the glow color is similar to the background.

**Fix:** Ensure the focus ring has sufficient contrast in both themes. Consider adding a visible outline offset.

### 3.13 JourneyCreator search results dropdown can extend below viewport

`JourneyCreator.tsx:598`: The search results dropdown is positioned `absolute top-full` relative to the search input. Since the JourneyCreator panel is already positioned at `top-20` (80px from top) and is ~400px tall, the dropdown may extend below the panel's overflow boundary or below the viewport.

**Fix:** Add `overflow: visible` to the panel, or use a portal-based dropdown.

### 3.14 `isIOS` detection is fragile and doesn't handle iPadOS 13+

`FileUpload.tsx:29-32`:
```js
const isIOS = useMemo(() => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}, [])
```

This is a well-known detection pattern, but it relies on `navigator.platform` which is deprecated and may return inconsistent values. The iOS tip may show incorrectly on MacBooks with touch bars, or not show on iPads that request desktop sites.

**Fix:** Consider using feature detection instead, or simply show the tip on all platforms (it's helpful for non-technical users regardless).

### 3.15 Scene editor blend slider uses `h-1` height

`SceneEditor.tsx:339`: The blend duration range input has `h-1` (4px) height. This is below the standard 8px track height defined in globals.css for range inputs, making it harder to click/drag.

**Fix:** Use the standard slider height or at minimum `h-2`.

---

## 4. Cross-Cutting Concerns

### 4.1 CJK text rendering — weight and line-height cascade conflict

As detailed in 1.2, the `font-weight: 400` in `globals.css` overrides the design system's `font-weight: 100` for CJK languages. This is the single most impactful typography issue. Korean and Japanese text will look significantly bolder and more loosely spaced than intended, affecting every screen in the app.

### 4.2 Glass morphism performance on low-end devices

The Vitro design system uses multiple `backdrop-filter: blur()` layers at different intensities (16px–48px). On low-end mobile devices, backdrop-filter is GPU-intensive. The scene editor (`gs` class, 42px blur), controls card (`gc`, 26px blur), and multiple `gi` elements (16px blur) all apply simultaneously.

**Impact:** On budget Android phones, the loaded track screen may render at 15-20fps during scrolling/interaction due to backdrop-filter recomputation.

**Fix:** Consider adding a `prefers-reduced-motion` media query that disables backdrop-filter, or a performance detection mechanism that falls back to solid backgrounds.

### 4.3 No prefers-color-scheme synchronization for map style

When the user's OS switches from light to dark mode (e.g., at sunset), the app's color mode changes (ThemeToggle listens to `matchMedia`), but the map style only auto-syncs if `hasExplicitMapStyleChoice` is false. Once the user has manually cycled the style, the map no longer follows OS theme changes, creating a mismatch between the glass UI (dark) and the map (light).

**Fix:** Consider auto-syncing the map style when the OS theme changes, or showing a subtle notification that the map style doesn't match the current theme.

### 4.4 i18n completeness — missing translation keys for some edge cases

The following user-facing strings are hardcoded in English and not localized:
- "km" / "mi" unit labels (rendered directly in `GlobalToolbar.tsx:37,44` and `TrackToolbar.tsx:177,184`)
- Resolution dimensions like "1920×1080" in `ExportPanel.tsx` — technically these are numbers, but the context ("YouTube / Landscape") is localized while the parenthetical is not, creating mixed-language labels in CJK
- The "💡" emoji in the export success tip (`ExportPanel.tsx:182`) — emojis render differently across platforms

### 4.5 Color contrast gaps

- `var(--t4)` text (e.g., `color: #6E7A96` in light mode) on glass backgrounds: Against `--gc-bg` (72% white = ~#b3b3b3 effective), the contrast ratio is approximately 2.8:1 — below WCAG AA's 4.5:1 requirement for small text. Affects: drop hints, format hints, speed labels, percentage labels.
- `var(--t4)` in dark mode (`#6E7C9A`) on `--gc-bg` (rgba(22,26,38,.52)): roughly 3.2:1 — still below AA.
- The 10px stat text in Controls (`text-[10px]`) at `color: var(--t3)` is borderline: `#424E6E` on glass at approximately 3.5:1.

---

## 5. Interaction Design Issues

### 5.1 Double duration control — Controls + Export both have duration

The playback Controls have a duration selector (10s–5min), and the Export panel has its own duration field (5–600s). These are not connected (see 1.5). Users must set duration in two places, which is confusing. The mental model should be: there's one animation, and you export what you see.

### 5.2 No way to reset the timeline selection

Once the user drags the timeline selector to a subset of points, there's no obvious way to reset it back to the full range. They have to manually drag both handles back to 0% and 100%.

**Fix:** Add a small reset button or double-tap-to-reset gesture on the timeline.

### 5.3 JourneyCreator "Done" button is disabled with <2 points but there's no visual hint why

`JourneyCreator.tsx:717-718`: The "Done" button is `disabled` and `opacity-40` when `pointCount < 2`. But with 1 point, the button looks dim and the user may not realize they need to add another point. The hint text says "Click on the map to add locations" but doesn't explicitly state "Add at least 2 points to create a route."

**Fix:** Show a clearer message like "Add 1 more point to create a route" when pointCount is 1.

### 5.4 Playback progress bar doesn't show the filled portion clearly

`Controls.tsx:56-74`: The progress bar uses `background: 'rgba(var(--gl),.15)'` for the full track and `accentColor: 'rgb(var(--gl))'` for the fill. But CSS range input fill behavior is inconsistent across browsers. In Firefox, the fill may not show at all with this approach (the `-moz-range-track` style overrides the fill color).

**Fix:** Use a separate div-based progress indicator (like the export progress bar) for cross-browser consistency, or add Firefox-specific fill styles.

### 5.5 Map zoom controls move position when track loads

`globals.css:162-168`: The MapLibre zoom controls are at default position on the landing page, then jump to `clamp(3.25rem, 8vw, 4.5rem)` from top when a track loads. This sudden jump can be disorienting.

**Fix:** Either keep the controls in the same position, or animate the transition.

---

## 6. Responsive Design Issues

### 6.1 TrackToolbar `sm:right-[18rem]` assumes scene editor is always open on desktop

`TrackToolbar.tsx:75`:
```jsx
className="... sm:right-[18rem] ..."
```

This pushes the toolbar buttons 18rem from the right on `sm` screens, but the scene editor is not always open. When the scene editor is closed, there's an 18rem gap on the right with no content, making the toolbar look misaligned.

**Fix:** Only apply the right offset when the scene editor is actually open.

### 6.2 Upload card doesn't adapt to landscape mobile

In landscape orientation on mobile (e.g., 812×375), the upload card with `max-w-lg` (512px) and `p-12` (48px) may be wider than the viewport height allows. The card's vertical content (image + title + subtitle + buttons) may overflow.

**Fix:** Add `max-h-[90vh] overflow-y-auto` to the upload card container.

### 6.3 Scene editor at `sm:w-80` is too narrow for its content on small tablets

On a 768px tablet in portrait, the scene editor at `w-80` (320px) takes up nearly half the screen. The camera mode dropdowns and range editors are cramped at this width.

**Fix:** Consider a bottom sheet or full-screen overlay on screens below `lg`.

---

## 7. Visual Polish Issues

### 7.1 Marker pulse animation doesn't respect `prefers-reduced-motion`

`globals.css:30-37`: The `.marker-pulse` animation runs continuously. While `vitro-base.css` has a `prefers-reduced-motion` override, it targets `*` with `animation-duration: 0.01ms`, which effectively removes the animation but leaves the pulse div visible at full size/opacity, creating a large red circle behind the marker.

**Fix:** Add a specific override that hides the pulse div under reduced motion.

### 7.2 Landing page sample preview image has no dark-mode variant

`FileUpload.tsx:149-153`: The `landing-preview.svg` image is the same regardless of theme. In dark mode, a light-colored preview image can look jarring against the dark glass card.

**Fix:** Provide a dark-variant SVG and switch based on theme.

### 7.3 Export success checkmark animation missing

`ExportPanel.tsx:166-167`: The success checkmark appears instantly with no animation. A brief scale-in or fade-in would reinforce the success state.

### 7.4 Scene coverage bar percentages are not aligned with actual scene boundaries

`SceneEditor.tsx:348-363`: The coverage bar shows percentage labels (0%, 50%, 100%) at fixed positions, but scene boundaries may not align with these markers. This can create visual confusion where a scene appears to start at 50% but actually starts at 48%.

**Fix:** Consider removing the percentage labels or making them dynamic based on scene boundaries.

---

## Summary Table

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1.1 | Bottom zone vertical crush on mobile | P0 | Layout |
| 1.2 | font-weight: 400 breaks CJK design system | P0 | Typography |
| 1.3 | Track title invisible below xl | P0 | Information |
| 1.4 | Scene editor dead zone / overlap on mobile | P0 | Layout |
| 1.5 | Export duration not synced with playback | P0 | Interaction |
| 1.6 | "?" hotkey fires in text inputs | P0 | Interaction |
| 2.1 | Google Guide tabs overflow on mobile | P1 | Responsive |
| 2.2 | No map tile loading indicator | P1 | Feedback |
| 2.3 | Follow camera toggle unclear on desktop | P1 | Clarity |
| 2.4 | Elevation profile seek imprecise on mobile | P1 | Touch |
| 2.5 | TimelineSelector dates ignore app locale | P1 | i18n |
| 2.6 | Scene presets replace without confirmation | P1 | Destructive |
| 2.7 | JourneyCreator undo during drag | P1 | Interaction |
| 2.8 | No drop-received feedback before parse | P1 | Feedback |
| 2.9 | Mobile menu doesn't close on map pan | P1 | Interaction |
| 2.10 | Settings undiscoverable on mobile loaded state | P1 | Discovery |
| 3.1 | Upload card p-12 excessive on small phones | P2 | Spacing |
| 3.2 | Progress bar thumb low contrast in dark mode | P2 | Contrast |
| 3.3 | Read-only bitrate looks editable | P2 | Clarity |
| 3.4 | Scene range handles below 44px touch | P2 | Touch |
| 3.5 | No cancel confirmation in JourneyCreator | P2 | Destructive |
| 3.6 | Takeout link may navigate away from app | P2 | Navigation |
| 3.7 | Loading spinner low contrast on Positron | P2 | Contrast |
| 3.8 | Reference grid noise on landing page | P2 | Visual |
| 3.9 | 10px stat text below readability minimum | P2 | Typography |
| 3.10 | Export time estimate unreliable | P2 | Accuracy |
| 3.11 | Toast has no countdown | P2 | Feedback |
| 3.12 | Theme toggle focus ring low contrast | P2 | A11y |
| 3.13 | Search dropdown extends below viewport | P2 | Layout |
| 3.14 | isIOS detection fragile | P2 | Robustness |
| 3.15 | Blend slider too thin | P2 | Touch |

---

## Priority Recommendations

### Immediate (P0 — fix before next release)
1. Add hotkey guard for text inputs (1.6) — one-line fix, high user impact
2. Sync export duration with playback (1.5) — pass prop, moderate refactor
3. Fix CJK font-weight cascade (1.2) — remove override, verify visual result
4. Add track name fallback below xl breakpoint (1.3) — small component change

### Short-term (P1 — fix within 1 week)
5. Add confirmation before scene preset replacement (2.6)
6. Fix Google Guide mobile tabs (2.1)
7. Pass app locale to TimelineSelector date formatting (2.5)
8. Add map loading indicator (2.2)
9. Make settings discoverable on mobile loaded state (2.10)

### Medium-term (P2 — fix within 2 weeks)
10. Redesign bottom zone for mobile (1.1, 3.1, 2.4) — this is the largest design task
11. Address all WCAG contrast gaps (3.2, 3.9, 3.12, 4.5)
12. Improve scene editor mobile experience (1.4, 3.4, 6.3)
