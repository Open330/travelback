# Implementation Plan: Address Remaining Issues from UX Review (Non-Technical Traveler)

**Source:** `.context/reviews/ux-review-non-technical-traveler.md`
**Previous plan:** `.context/plans/ux-overhaul-non-technical-traveler.md` (fully implemented as `9019e14`)
**Goal:** Address the remaining issues that were NOT resolved by the previous UX overhaul.

---

## Triage: What's Already Fixed vs What Remains

The previous overhaul (33 tasks, 8 phases) addressed the majority of the first review's 20 recommendations. Here's the status of each:

| # | Original Recommendation | Status | Notes |
|---|------------------------|--------|-------|
| 1 | Rewrite landing page copy (GPX/KML → app names) | ✅ Done | `fileUpload.dropHint` now says "from Google Maps, Strava, Garmin, AllTrails, or any GPS app" |
| 2 | Add "Try with sample" button | ✅ Done | `fileUpload.trySample` button loads Namsan Tower Walk |
| 3 | Hide advanced export settings behind toggle | ✅ Done | Advanced toggle hides Codec, FPS, Mbps |
| 4 | Add post-export guidance (success screen) | ✅ Done | Success screen with video preview, platform tips, Web Share API |
| 5 | Hide scene editor parameters by default | ✅ Done | "Customize" collapsible per scene |
| 6 | Add visual example on landing page (GIF/video) | ❌ Remains | No preview of output on landing page |
| 7 | Rename toolbar buttons | ✅ Done | "New Route", "Camera", "Map: {style}", "Export" |
| 8 | Respect system color scheme | ✅ Done | `prefers-color-scheme` detection in ThemeToggle |
| 9 | Add screenshots to Google Guide | ❌ Remains | Guide is text-only, no visual aids |
| 10 | Replace Mbps with Quality dropdown | ✅ Done | Low/Medium/High/Maximum dropdown |
| 11 | Show distance/time stats on mobile | ✅ Partial | Distance always visible; time still `hidden sm:inline` |
| 12 | Add instructions overlay to Journey Creator | ✅ Done | Shows "Click on the map to add waypoints" when 0 points |
| 13 | Use human-readable scene parameter names | ✅ Done | Pitch→Tilt, Bearing→Direction, Rotation→Orbit Speed |
| 14 | Add Web Share API support | ✅ Done | In post-export success screen |
| 15 | Add one-line descriptions to camera mode dropdown | ✅ Done | "Flyover — Follow the route from above" etc. |
| 16 | Auto-match map style to dark/light mode | ✅ Done | Dark mode → Dark map, Light mode → Voyager |
| 17 | Add export guides for non-Google apps | ✅ Done | 7-tab guide: Google Phone/Computer, Strava, Garmin, AllTrails, Komoot, Other |
| 18 | Add language picker | ❌ Remains | No manual language override UI |
| 19 | Larger timeline drag handles for touch | ❌ Remains | Handles are still thin vertical lines |
| 20 | Collapsible scenes on mobile | ✅ Done | Accordion-style scene collapse |

### Additional issues from the review body (not in the 20 recommendations):

| Issue | Section | Status |
|-------|---------|--------|
| No search/geocoding in Journey Creator | §3 | ❌ Remains |
| "Done" button in Journey Creator has no confirmation | §3 | ❌ Remains |
| Speed dropdown has no visible label | §4 | ❌ Remains |
| Timeline histogram bars are unexplained | §4 | ❌ Remains |
| Keyboard shortcuts are invisible (no help dialog) | §4 | ❌ Remains |
| Scene delete has no confirmation (only undo toast) | §5 | ✅ Acceptable — undo toast is standard pattern |
| "location-history.json" unexplained in Google Guide | §2 | ❌ Remains |
| Google Takeout time estimate missing | §2 | ❌ Remains |
| Export output summary still shows technical detail | §6 | ❌ Remains |
| Exported filename is technical | §10 | ❌ Remains — still `{name}_{W}x{H}_{fps}fps.mp4` |
| No swipe gestures on mobile | §7 | ❌ Remains (low priority) |

---

## Remaining Tasks (11 items, 4 phases)

### Phase A — Landing Page & Onboarding Polish (3 tasks)

#### A.1 Add animated preview to landing page

**Files:** `src/components/FileUpload.tsx`, `public/` (new asset)

The landing page gives no hint of what the output looks like. Add a short looping preview.

**Approach:**
- Create a 5-second looping WebM/MP4 clip showing a sample animated journey (can be screen-recorded from the app itself using the sample trip with Cinematic preset)
- Alternatively, use an animated GIF or CSS animation showing a stylized route animation
- Place it above the drop hint text, inside the glass card
- Keep it small (~200KB max) to avoid bloating the static site
- Use `<video autoPlay muted loop playsInline>` for smooth playback
- Add i18n alt text: `fileUpload.previewAlt` → "Sample animated journey"

**Sizing:** 320×180 (16:9) or 240×426 (9:16 to match TikTok vibe), with `object-fit: cover` and rounded corners.

**Fallback:** If creating a real video is too heavy, use a static screenshot with a play icon overlay and text "See what Travelback creates" that links to the sample trip loader.

#### A.2 Add screenshots to import guide

**Files:** `src/components/GoogleGuide.tsx`, `public/guide/` (new directory for images)

The import guide is text-only. Add annotated screenshots for at least the Google Maps flows.

**Approach:**
- Create 2-3 annotated screenshots per tab (at minimum for Google Maps Phone and Google Maps Computer)
- Store as optimized PNGs or WebPs in `public/guide/`
- Insert `<img>` elements between instruction steps
- Use `loading="lazy"` and explicit `width`/`height` to prevent layout shift
- Add i18n alt text for each image
- For non-Google tabs (Strava, Garmin, etc.), a single screenshot of the export button location is sufficient

**Screenshots needed (minimum):**
1. Google Maps Phone: Profile menu → Your Timeline → ⋮ → Export (3 images)
2. Google Maps Computer: Takeout page → Location History checkbox → Export button (2 images)
3. Strava: Activity page → ⋯ → Export GPX (1 image)

**Note:** Screenshots should be taken from the actual apps. If real screenshots can't be included (copyright), create simple SVG illustrations showing the UI flow with arrows.

#### A.3 Improve Google Guide copy

**Files:** `src/lib/i18n.ts`, `src/components/GoogleGuide.tsx`

The Google Guide tab copy mentions "location-history.json" and "Records.json" without explaining what they are. The Takeout flow doesn't mention how long the export takes.

**Changes:**
- Add a note under the Takeout tab: "Google may take a few minutes to a few hours to prepare your export, depending on how much location data you have. You'll get an email when it's ready."
- Replace bare filenames with context: "a file called `Records.json` (this is your location history)" instead of just "Records.json"
- New i18n keys: `google.takeoutWait`, `google.recordsExplain`
- For Korean: `google.takeoutWait` → "Google에서 내보내기를 준비하는 데 몇 분에서 몇 시간이 걸릴 수 있습니다. 준비가 되면 이메일을 받게 됩니다."

---

### Phase B — Playback & Controls Polish (4 tasks)

#### B.1 Add visible "Speed" label to speed dropdown

**Files:** `src/components/Controls.tsx`, `src/lib/i18n.ts`

The speed dropdown (`1×`, `2×`, etc.) has no label — it looks like a random number. Add a small label.

**Approach:**
- Add `<span className="text-[10px]" style={{ color: 'var(--t4)' }}>{t('controls.speed')}</span>` next to the speed `<select>`
- New i18n keys: `controls.speed` → "Speed" / "속도"
- On mobile, the label can be abbreviated or hidden if space is tight

#### B.2 Show time stats on mobile

**Files:** `src/components/Controls.tsx`

Time elapsed/total is currently `hidden sm:inline` (line 136). Show it on mobile too.

**Approach:**
- Remove `hidden sm:inline` from the time `<span>`, replace with just `inline`
- The stats row already uses `text-xs sm:text-sm` so sizing is handled
- If horizontal space is tight, abbreviate: show only elapsed time on mobile (drop the "/ total" part)
- Test on 320px-wide viewport to confirm no overflow

#### B.3 Larger timeline drag handles for touch

**Files:** `src/components/TimelineSelector.tsx`

The timeline selector handles (for trimming the route segment) are thin vertical lines that are hard to grab on touch screens.

**Approach:**
- Increase the hit target of drag handles to at least 44×44px (Apple HIG minimum)
- Visually, keep the line thin but add an invisible `::before` pseudo-element or a transparent overlay div that expands the touch area
- Add a small circular "grip" indicator at the center of each handle (8px circle, `var(--gl)` color)
- Add `touch-action: none` on the handle elements to prevent scroll interference during drag

#### B.4 Keyboard shortcut help overlay

**Files:** `src/app/page.tsx` (or new `src/components/KeyboardHelp.tsx`), `src/lib/i18n.ts`

Keyboard shortcuts (Space = play/pause, arrow keys = seek) are completely invisible.

**Approach:**
- Add a small `?` button in the bottom-right corner (or in the controls bar)
- On click (or pressing `?` key), show a modal/popover listing shortcuts:
  - `Space` — Play / Pause
  - `←` `→` — Seek backward / forward
  - `+` `-` — Speed up / slow down
  - `?` — Show this help
- Style as a Vitro glass overlay (`go` class)
- New i18n keys: `shortcuts.title`, `shortcuts.playPause`, `shortcuts.seek`, `shortcuts.speed`, `shortcuts.help`
- Auto-dismiss on any key press or click outside

---

### Phase C — Export & Post-Export Polish (3 tasks)

#### C.1 Simplify output summary line

**Files:** `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`

The current output summary (line 263-265) always shows codec and Mbps, even when Advanced is collapsed:
```
Output: 1920×1080 MP4 (H.264) at 8 Mbps · ~120 MB
```

**Approach:**
- When Advanced is **collapsed**, show simplified: `"1920×1080 MP4 · ~120 MB"`
- When Advanced is **expanded**, show full detail: `"1920×1080 MP4 (H.264) at 8 Mbps · ~120 MB"`
- Use the existing `showAdvanced` state to toggle between the two
- Update the `export.output` i18n key or add `export.outputSimple`

#### C.2 Friendlier export filename

**Files:** `src/lib/videoEncoder.ts` (or wherever the download filename is constructed)

The current filename pattern `{name}_{W}x{H}_{fps}fps.mp4` produces names like `Namsan_Tower_Walk_1920x1080_30fps.mp4`.

**Approach:**
- Change default pattern to `"Travelback - {trackName}.mp4"` (e.g., `"Travelback - Namsan Tower Walk.mp4"`)
- Keep the resolution/fps in the filename only when Advanced is expanded (user is a power user who cares about specs)
- Sanitize `trackName`: replace `/\/:*?"<>|` with `_`, trim whitespace
- If track name is empty, fall back to `"Travelback - Journey.mp4"`

#### C.3 Add export time estimate

**Files:** `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`

No indication of how long export will take. Users don't know if it's 10 seconds or 10 minutes.

**Approach:**
- Add an estimated time line above the "Start Export" button: `"Estimated time: ~{estimate}"`
- Estimate formula: `(duration × resolution_factor × codec_factor) / device_speed`
  - `resolution_factor`: 1080p=1.0, 720p=0.6, 4K=3.0
  - `codec_factor`: H.264=1.0, H.265=1.5, AV1=2.5
  - `device_speed`: Run a micro-benchmark on first render (encode a single black frame and measure time), or default to a conservative estimate
- For simplicity, start with a static heuristic: `estimate_seconds = duration_seconds * 0.5` for 1080p H.264, scaled by resolution and codec
- Show as "~30 seconds", "~2 minutes", "~5 minutes" (rounded to friendly units)
- New i18n keys: `export.estimatedTime`, `export.seconds`, `export.minutes`

---

### Phase D — Advanced Features (3 tasks)

#### D.1 Language picker

**Files:** `src/app/page.tsx` (or `src/components/LocalePicker.tsx`), `src/lib/i18n.ts`

Currently the app auto-detects language from `navigator.language` with no manual override.

**Approach:**
- Add a small globe icon button in the footer area (bottom-left) or next to the theme toggle
- On click, show a dropdown with available locales: `English`, `한국어`
- Selection updates `localStorage('travelback-locale')` and triggers re-render via `LocaleProvider`
- The `useLocale()` hook already checks localStorage first — just need the UI trigger
- Keep it minimal: a `<select>` or a two-item popover, not a full settings page
- New i18n keys: `locale.label` → "Language" / "언어", `locale.en` → "English", `locale.ko` → "한국어"

#### D.2 Journey Creator search/geocoding

**Files:** `src/components/JourneyCreator.tsx`, possibly `src/lib/geocoding.ts` (new)

Users can't search for a place — they have to manually scroll the map to find it. This makes the Journey Creator frustrating for users who don't know exact coordinates.

**Approach:**
- Add a search input at the top of the Journey Creator panel
- Use the Nominatim (OpenStreetMap) geocoding API: `https://nominatim.openstreetmap.org/search?q={query}&format=json`
- On search, fly the map to the result location using `map.flyTo()`
- Show a dropdown of results (max 5) for disambiguation
- Rate-limit to 1 request per second (Nominatim usage policy)
- Add a `User-Agent` header identifying Travelback (Nominatim requirement)
- New i18n keys: `journey.search`, `journey.searchPlaceholder` → "Search for a place" / "장소 검색"
- No API key needed — Nominatim is free for light usage

#### D.3 Journey Creator "Done" confirmation

**Files:** `src/components/JourneyCreator.tsx`, `src/lib/i18n.ts`

Clicking "Done" immediately commits the route with no confirmation. Users may accidentally tap it.

**Approach:**
- When "Done" is clicked with fewer than 2 points, show inline warning: "Add at least 2 points to create a route"
- When "Done" is clicked with 2+ points, show a brief confirmation: route preview with point count and approximate distance, with "Create Route" and "Keep Editing" buttons
- Keep it as an inline card expansion (not a modal) to feel lightweight
- New i18n keys: `journey.confirmTitle`, `journey.confirmCreate`, `journey.confirmEdit`, `journey.tooFewPoints`

---

## Implementation Order & Effort Estimates

| Phase | Task | Effort | Priority | Files Modified |
|-------|------|--------|----------|----------------|
| A | A.3 Google Guide copy | S (30 min) | High | i18n.ts, GoogleGuide.tsx |
| B | B.1 Speed label | XS (15 min) | Medium | Controls.tsx, i18n.ts |
| B | B.2 Mobile time stats | XS (15 min) | Medium | Controls.tsx |
| C | C.1 Simplified summary | S (30 min) | Medium | ExportPanel.tsx, i18n.ts |
| C | C.2 Friendly filename | S (30 min) | Medium | videoEncoder.ts |
| C | C.3 Export time estimate | M (1-2 hr) | High | ExportPanel.tsx, i18n.ts |
| A | A.1 Landing preview | M (1-2 hr) | High | FileUpload.tsx, public/ |
| A | A.2 Guide screenshots | L (2-4 hr) | High | GoogleGuide.tsx, public/guide/ |
| D | D.1 Language picker | S (45 min) | Medium | page.tsx or new component, i18n.ts |
| B | B.3 Timeline handles | M (1-2 hr) | Low | TimelineSelector.tsx |
| B | B.4 Keyboard help | S (45 min) | Low | page.tsx or new component, i18n.ts |
| D | D.2 Geocoding search | L (2-4 hr) | Low | JourneyCreator.tsx, new geocoding.ts |
| D | D.3 Done confirmation | S (30 min) | Low | JourneyCreator.tsx, i18n.ts |

**Total estimated effort:** ~12-18 hours

**Recommended order:** A.3 → B.1 → B.2 → C.1 → C.2 → C.3 → A.1 → D.1 → B.4 → B.3 → A.2 → D.3 → D.2

Quick copy/config wins first (A.3, B.1, B.2, C.1, C.2), then medium features (C.3, A.1, D.1, B.4), then larger features (B.3, A.2, D.3, D.2).
