# Implementation Plan: UX Overhaul for Non-Technical Travelers

**Source:** `.context/reviews/ux-review-non-technical-traveler.md`
**Goal:** Make Travelback usable by a casual traveler who wants to post travel videos
to TikTok, Instagram, or YouTube — without requiring technical knowledge.
**Principle:** Hide complexity, don't remove it. Power users keep full access via
"Advanced" toggles. Casual users get a streamlined happy path.

---

## Phase 1 — Language & Copy (Low Effort, High Impact)

All changes in this phase are i18n string updates and minor component text changes.
No new components, no architectural changes. Ship as a single commit.

### 1.1 Rewrite landing page drop hint

**Files:** `src/lib/i18n.ts`, `src/components/FileUpload.tsx`

Replace file-format jargon with source-app names:

```
Current:  "Drop your GPX, KML, or Google Location History JSON file here"
Proposed: "Drop your travel file here — from Google Maps, Strava, Garmin, AllTrails, or any GPS app"
```

Update both `en` and `ko` translations for `fileUpload.dropHint`.
Keep the actual file parser accepting the same formats — this is a copy change only.

Add a small muted line below: `"Supports GPX, KML, and Google Location History JSON"`
so power users still see format info. New i18n key: `fileUpload.formatHint`.

### 1.2 Rename toolbar buttons

**Files:** `src/lib/i18n.ts`

| Current | Proposed (EN) | Proposed (KO) | i18n key |
|---------|--------------|---------------|----------|
| "New" (with icon) | "New Route" | "새 경로" | `app.new` |
| "Scenes" | "Camera" | "카메라" | `app.scenes` |

The map style button currently shows the style name directly (e.g., "Voyager").
Prefix it with a label:

**Files:** `src/app/page.tsx` (toolbar rendering, ~line 351)

Change the map style button to render `"Map: {styleName}"` / `"지도: {styleName}"`.
New i18n key: `app.mapStylePrefix` → `"Map:"` / `"지도:"`.

### 1.3 Rename scene editor parameter labels

**Files:** `src/lib/i18n.ts`

| Current | Proposed (EN) | Proposed (KO) |
|---------|--------------|---------------|
| Pitch | Tilt | 기울기 |
| Bearing | Direction | 방향 |
| Rotation | Orbit Speed | 공전 속도 |
| Blend | Transition | 전환 |
| Start % | Route Start % | 경로 시작 % |
| End % | Route End % | 경로 끝 % |

Update i18n keys: `scenes.pitch`, `scenes.bearing`, `scenes.rotation`,
`scenes.blend`, `scenes.startPct`, `scenes.endPct`.

### 1.4 Add speed label to playback controls

**Files:** `src/components/Controls.tsx` (~line 91), `src/lib/i18n.ts`

Add a visible "Speed" label before the speed dropdown (not just an aria-label).
New i18n key: `controls.speedLabel` → `"Speed"` / `"속도"`.

### 1.5 Rename "Follow" button

**Files:** `src/lib/i18n.ts`

Change `controls.follow` from `"Follow"` / `"따라가기"` to
`"Track"` / `"추적"`. Update tooltip keys accordingly.

### 1.6 Simplify exported filename

**Files:** `src/lib/videoEncoder.ts` (~line 125-129)

Change filename pattern from:
`{sanitizedName}_travelback_{width}x{height}_{codec}.mp4`
to:
`Travelback - {trackName}.mp4`

Keep the sanitization and 64-char cap. Drop resolution/codec from the filename —
users don't need that in their gallery.

### 1.7 Rename Google Takeout tab label

**Files:** `src/lib/i18n.ts`

Change `google.takeoutTab` from `"From Google Takeout"` to
`"From your computer"` / `"컴퓨터에서"`.

### 1.8 Add time estimate to Takeout instructions

**Files:** `src/lib/i18n.ts`, `src/components/GoogleGuide.tsx`

In the Takeout tab step 2, after "wait for email," add:
`"(usually 10 minutes to a few hours)"` / `"(보통 10분에서 몇 시간 소요)"`.

### 1.9 Clarify file download location in Google Guide

**Files:** `src/lib/i18n.ts`

In the phone tab step 2, change:
`"This downloads a location-history.json file"`
to:
`"This saves a file to your Downloads folder — you'll upload it in the next step"`

Update both `en` and `ko` translations.

---

## Phase 2 — Hide Complexity (Medium Effort, High Impact)

Add "Advanced" toggles to the export panel and scene editor so casual users see
a clean interface while power users retain full control.

### 2.1 Export panel: hide codec, FPS, bitrate behind "Advanced"

**Files:** `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`

**Current layout:**
```
Resolution: [dropdown]
Codec:      [dropdown]
Duration: [input]  FPS: [dropdown]  Mbps: [input]
Output: 1920×1080 MP4 (H.264) at 8 Mbps · ~30 MB
[Start Export]
```

**Proposed layout:**
```
Resolution: [dropdown]
Duration:   [input]

▸ Advanced                          ← collapsed by default
  Codec:    [dropdown]
  FPS:      [dropdown]
  Quality:  [Low / Medium / High / Maximum]   ← replaces raw Mbps

Output: 1920×1080 MP4 · ~30 MB
[Start Export]
```

Implementation:
- Add `const [showAdvanced, setShowAdvanced] = useState(false)` to ExportPanel.
- Wrap codec, FPS, and quality rows in a `{showAdvanced && (...)}` block.
- Replace the Mbps number input with a Quality dropdown:
  - Low → 2 Mbps
  - Medium → 5 Mbps
  - High → 8 Mbps (default)
  - Maximum → 20 Mbps
- New i18n keys: `export.advanced`, `export.quality`,
  `export.qualityLow`, `export.qualityMedium`, `export.qualityHigh`,
  `export.qualityMaximum`.
- When Advanced is collapsed, use defaults: H.264, 30 FPS, High (8 Mbps).
- The output summary line still shows all details regardless of toggle state.

### 2.2 Scene editor: collapse per-scene parameters

**Files:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`

**Current behavior:** Clicking a preset (e.g., "Cinematic") immediately shows all
6 scenes with all parameters expanded — 36+ controls visible at once.

**Proposed behavior:**
- After applying a preset, each scene shows only its **name** and **camera mode**
  in a compact row.
- A "▸ Customize" chevron per scene expands the full parameter set (zoom, tilt,
  direction, orbit speed, route start/end %).
- The blend/transition slider at the top stays always visible.
- On mobile, only one scene can be expanded at a time (accordion behavior).

Implementation:
- Add `const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null)`
  to SceneEditor.
- Wrap the parameter sliders (zoom, pitch, bearing, rotation, start%, end%) in a
  collapsible section keyed by `expandedSceneId === scene.id`.
- The scene header row (name + camera mode dropdown + delete button) stays visible.
- New i18n key: `scenes.customize` → `"Customize"` / `"사용자 지정"`.

### 2.3 Add "Try with sample" button to landing page

**Files:** `src/components/FileUpload.tsx`, `src/app/page.tsx`,
`src/lib/i18n.ts`, `public/sample-trip.gpx` (new asset)

Add a secondary button below "Browse Files":
```
[Browse Files]
[✨ Try with a sample trip]
or create a journey manually
```

Implementation:
- Create a sample GPX file (`public/sample-trip.gpx`) with a scenic ~5km route
  (e.g., a walk around a park or waterfront). Include timestamps and elevation.
  Keep file size under 50KB.
- Add a `onLoadSample` callback prop to FileUpload.
- In page.tsx, `onLoadSample` fetches `/sample-trip.gpx`, parses it with the
  existing parser, and sets the track state — same flow as a file upload.
- New i18n keys: `fileUpload.trySample` → `"Try with a sample trip"` /
  `"샘플 여행으로 체험하기"`.
- Style as a ghost/outline button to differentiate from the primary "Browse Files."

### 2.4 Make "Create Journey" more visible

**Files:** `src/components/FileUpload.tsx`, `src/lib/i18n.ts`

The "or create a journey manually" link is currently a subtle text button at the
very bottom of the page. Promote it:

- Move it into the upload dialog card, below the sample button.
- Style as a secondary outlined button with a MapPin icon.
- Change copy: `"or create a journey manually"` → `"Draw a route on the map"` /
  `"지도에 경로 그리기"`.

### 2.5 Add instructions overlay to Journey Creator

**Files:** `src/components/JourneyCreator.tsx`, `src/lib/i18n.ts`

When the journey creator opens and has 0 points, show a centered overlay on the map:
```
📍 Click on the map to add waypoints
   Click "Done" when finished
```

Implementation:
- Conditionally render the overlay when `points.length === 0`.
- Fade out after the first point is added.
- New i18n keys: `journey.instructionTitle`, `journey.instructionSubtitle`.

---

## Phase 3 — Post-Export Experience (Medium Effort, High Impact)

Bridge the gap between "video exported" and "video posted on social media."

### 3.1 Post-export success screen with platform tips

**Files:** `src/components/ExportPanel.tsx` (or new `ExportSuccess.tsx`),
`src/lib/i18n.ts`, `src/app/page.tsx`

After export completes and the video downloads, replace the progress bar with a
success card:

```
✅ Video saved!

Your video is in your Downloads folder.

📱 Upload to TikTok:
   Open TikTok → tap + → Upload → select from gallery

📸 Upload to Instagram:
   Open Instagram → tap + → Reel/Post → select from gallery

▶️ Upload to YouTube:
   Open YouTube → tap + → Upload video → select file

[Export Again]  [Share...]
```

Implementation:
- Add an `exportState` to ExportPanel: `'idle' | 'exporting' | 'done'`.
- When `exportState === 'done'`, render the success card instead of the settings.
- The platform tips are conditional on the selected resolution preset:
  - TikTok/Shorts/Reels preset → show TikTok + Instagram Reels tips
  - YouTube/Landscape preset → show YouTube tip
  - Instagram Square/Post preset → show Instagram tip
  - Always show all three, but highlight the relevant one.
- New i18n keys: `export.success`, `export.savedToDownloads`,
  `export.tipTikTok`, `export.tipInstagram`, `export.tipYouTube`,
  `export.exportAgain`.

### 3.2 Web Share API integration

**Files:** `src/lib/videoEncoder.ts`, `src/components/ExportPanel.tsx`,
`src/lib/i18n.ts`

Add a "Share" button on the success screen that uses `navigator.share()`:

```typescript
if (navigator.canShare && navigator.canShare({ files: [file] })) {
  await navigator.share({
    files: [file],
    title: 'My Travel Video',
    text: 'Made with Travelback',
  })
}
```

Implementation:
- Store the exported blob in a ref after export completes (don't revoke URL yet).
- Show "Share" button only when `navigator.canShare` is available (mobile browsers).
- On desktop, show "Open Downloads Folder" hint instead.
- Revoke the blob URL when the panel is closed or a new export starts.
- New i18n key: `export.share` → `"Share"` / `"공유"`.

### 3.3 In-app video preview after export

**Files:** `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`

After export, show a `<video>` element playing the exported MP4 in the success card:

```html
<video src={blobUrl} controls autoPlay muted loop
       style={{ maxWidth: '100%', borderRadius: '8px' }} />
```

Implementation:
- Use the same blob URL created for download.
- Delay `URL.revokeObjectURL` until the panel is closed (not on a 60s timer).
- The video preview sits above the platform tips in the success card.
- On mobile, the video is full-width. On desktop, constrained to panel width.

---

## Phase 4 — Mobile & Touch Improvements (Medium Effort, Medium-High Impact)

### 4.1 Show distance/time stats on mobile

**Files:** `src/components/Controls.tsx` (~line 134)

The stats container uses `hidden md:flex` which hides it on screens < 768px.
Change to always visible but with a compact layout on mobile:

- Replace `hidden md:flex` with `flex`.
- On mobile (`< md`), render stats in a single condensed line above the controls:
  `"0.5 km / 2.7 km · 0:12 / 0:30"` instead of two separate blocks.
- Use smaller text (`text-xs`) on mobile.

### 4.2 Larger timeline selector drag handles

**Files:** `src/components/TimelineSelector.tsx`

The start/end drag handles are thin vertical lines. Make them touch-friendly:

- Increase the visible handle width from ~2px to 8px with rounded ends.
- Add a 44×44px invisible hit area around each handle (minimum touch target per
  Apple HIG and Material Design guidelines).
- Add a subtle grab cursor and active state (slightly larger + colored).

### 4.3 Thicker playback progress slider

**Files:** `src/components/Controls.tsx` (~line 53-71)

The progress slider track is thin and hard to grab on touch devices:

- Increase track height from default to 6px (8px on hover/active).
- Increase thumb size to 20px diameter (from browser default ~12px).
- Add a larger invisible hit area for the thumb.

### 4.4 Collapsible scenes on mobile (accordion)

**Files:** `src/components/SceneEditor.tsx`

This is partially addressed by 2.2 (collapse per-scene parameters). Additional
mobile-specific behavior:

- On screens < 768px, enforce accordion mode: expanding one scene auto-collapses
  the previously expanded scene.
- On desktop, allow multiple scenes to be expanded simultaneously.
- Use `window.matchMedia('(max-width: 768px)')` or a `useMediaQuery` hook.

### 4.5 Mobile controls layout improvement

**Files:** `src/components/Controls.tsx`

On mobile (< 640px), the play button, speed dropdown, duration dropdown, and
Follow toggle are all in one cramped row. Restructure:

- Row 1: Play button (large, centered) + progress slider
- Row 2: Speed | Duration | Track (Follow) — evenly spaced
- This gives each control more breathing room and makes the play button the
  dominant touch target.

---

## Phase 5 — Theme & Visual Polish (Low Effort, Medium Impact)

### 5.1 Respect system color scheme

**Files:** `src/app/page.tsx` (or wherever theme state is initialized)

Currently the app always starts in dark mode. Change initialization:

```typescript
const [isDark, setIsDark] = useState(() => {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
})
```

Also listen for system theme changes:
```typescript
useEffect(() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}, [])
```

### 5.2 Auto-match map style to dark/light mode

**Files:** `src/app/page.tsx`

When the user toggles dark/light mode, auto-switch the map style:
- Dark mode → `'dark'` map style (Dark Matter)
- Light mode → `'voyager'` map style (Voyager)

Only auto-switch if the user hasn't manually selected a different map style.
Track this with a `userSelectedMapStyle` boolean ref.

### 5.3 Add camera mode descriptions to dropdown

**Files:** `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`

Add one-line descriptions to the camera mode dropdown options:

| Mode | Description (EN) | Description (KO) |
|------|-----------------|-----------------|
| Overview | Wide view of the full route | 전체 경로 넓은 시야 |
| Flyover | Follow the route from above | 위에서 경로를 따라감 |
| Orbit | Circle around a point | 한 지점을 중심으로 회전 |
| Ground Follow | Street-level chase view | 지면 수준 추적 시점 |
| Closeup | Tight zoom on the route | 경로에 가까이 확대 |
| Bird's Eye | High-altitude tilted view | 높은 고도 기울어진 시야 |

Implementation:
- New i18n keys: `camera.overviewDesc`, `camera.flyoverDesc`, etc.
- Render as `<option>` with the description in parentheses or as a
  `<select>` with `<optgroup>` or a custom dropdown component.
- Simplest approach: `"Orbit — Circle around a point"` as the option text.

---

## Phase 6 — Internationalization Expansion (Medium Effort, Medium Impact)

### 6.1 Localize camera mode labels

**Files:** `src/types.ts`, `src/lib/i18n.ts`, `src/components/SceneEditor.tsx`

`CAMERA_MODE_LABELS` in types.ts (lines 41-48) is a static `Record<CameraMode, string>`
with hardcoded English. This breaks the i18n story — Korean users see English labels
in the camera mode dropdown.

**Option A (recommended):** Convert to a function of locale:
```typescript
// i18n.ts — add keys:
'camera.overview': 'Overview',     // KO: '전체 보기'
'camera.flyover': 'Flyover',      // KO: '비행'
'camera.orbit': 'Orbit',          // KO: '궤도'
'camera.ground': 'Ground Follow', // KO: '지면 추적'
'camera.closeup': 'Closeup',      // KO: '클로즈업'
'camera.birdeye': "Bird's Eye",   // KO: '조감도'
```

Then in SceneEditor.tsx, replace `CAMERA_MODE_LABELS[mode]` with `t('camera.' + mode)`
(or a helper that maps `CameraMode` enum values to i18n keys).

**Option B (simpler):** Keep `CAMERA_MODE_LABELS` for internal use and add a
`getCameraModeLabel(mode, t)` utility that falls back to the static map.

### 6.2 Localize codec labels

**Files:** `src/types.ts`, `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`

`CODEC_LABELS` (lines 79-83) has `"H.264 (MP4)"`, `"H.265/HEVC (MP4)"`, `"AV1 (MP4)"`.
These are technical names that don't need translation per se, but the surrounding
UI context should be localized. Two approaches:

- **Keep as-is:** Codec names are universal technical terms. A Korean user would
  recognize "H.264 (MP4)" without translation. This is acceptable.
- **Add context:** Change labels to `"H.264 — Best compatibility"` / `"H.264 — 호환성 최고"`
  and `"AV1 — Smallest file"` / `"AV1 — 파일 크기 최소"` to help non-technical users
  pick the right codec. New i18n keys: `codec.h264Desc`, `codec.h265Desc`, `codec.av1Desc`.

Recommended: Add descriptive suffixes via i18n while keeping the technical name.

### 6.3 Localize resolution preset labels

**Files:** `src/types.ts`, `src/lib/i18n.ts`, `src/components/ExportPanel.tsx`

`RESOLUTION_PRESETS` (lines 92-100) has labels like `"YouTube / Landscape (1920×1080)"`.
The platform names (YouTube, TikTok, Instagram) are universal and should stay in
English. The dimensional suffixes are already numbers. No translation needed here
— mark as **no action required**.

Exception: if we later add descriptive text (e.g., "Best for TikTok"), that should
go through i18n.

### 6.4 Add language picker

**Files:** `src/app/page.tsx`, `src/lib/i18n.ts`, `src/components/LocaleProvider.tsx`
(or wherever the locale context lives)

Currently the locale auto-detects from `navigator.language` with no override.
Add a language picker:

- Position: in the top-right area next to the theme toggle.
- Render as a small button showing the current locale flag/code: `🌐 EN` / `🌐 KO`.
- Clicking toggles between available locales (EN ↔ KO for now).
- Store the preference in `localStorage` so it persists across sessions.
- On load: check `localStorage` first → fall back to `navigator.language`.

Implementation:
- Update `LocaleProvider` to accept an override locale from state.
- Add `const [localeOverride, setLocaleOverride] = useState<string | null>(() => localStorage.getItem('travelback-locale'))`.
- New i18n keys: none needed (the picker shows language codes, not translated text).

### 6.5 Stub structure for additional languages

**Files:** `src/lib/i18n.ts`

Prepare the i18n system for future languages without actually translating everything:

- Add empty/English-fallback entries for `ja` (Japanese), `zh` (Chinese), `es` (Spanish).
- Document the process for adding a new language in a code comment at the top of i18n.ts.
- Each new locale only needs to override keys where the translation differs from English.
  Missing keys fall back to `en`.

This is a structural change only — actual translations can be crowd-sourced or
added incrementally.

---

## Phase 7 — Data Onboarding Guides (Medium Effort, Medium Impact)

### 7.1 Add export guides for non-Google apps

**Files:** `src/components/GoogleGuide.tsx` (rename to `ImportGuide.tsx`),
`src/lib/i18n.ts`, `src/app/page.tsx`

The current Google Guide only helps Google Maps users. Travelers who use Strava,
AllTrails, Garmin Connect, or Komoot are on their own. Expand:

**Rename `GoogleGuide.tsx` → `ImportGuide.tsx`** and restructure as a tabbed guide:

| Tab | Content |
|-----|---------|
| Google Maps (Phone) | Existing phone export instructions |
| Google Maps (Takeout) | Existing Takeout instructions |
| Strava | Export GPX: Profile → Settings → My Account → Download Request → Activities |
| AllTrails | Export GPX: Open trail → ⋯ → Export GPX |
| Garmin Connect | Export GPX: Activities → select → ⚙ → Export to GPX |
| Komoot | Export GPX: Tour → ⋯ → Download as GPX |
| Other Apps | "Most GPS apps can export GPX files. Look for 'Export' or 'Share as GPX'." |

Implementation:
- Change the component name and all references (page.tsx, FileUpload.tsx, i18n keys).
- Add a new `methods` array for each platform with step-by-step instructions.
- Each tab is a vertical step list, same UI pattern as the current Google Guide.
- New i18n keys: `import.title`, `import.stravaTab`, `import.allTrailsTab`,
  `import.garminTab`, `import.komootTab`, `import.otherTab`,
  plus step descriptions for each platform (EN + KO).
- The button in FileUpload.tsx changes from `t('fileUpload.googleGuideLink')`
  to `t('fileUpload.importGuideLink')` → `"How to get your travel data"` /
  `"여행 데이터 가져오는 방법"`.

### 7.2 Add "where does my file come from?" helper

**Files:** `src/components/FileUpload.tsx`, `src/lib/i18n.ts`

Below the drop hint and format line, add a collapsible helper:

```
▸ Where do I find my travel file?
  → Google Maps: [open guide]
  → Strava, Garmin, AllTrails: [open guide]
  → "Most GPS and fitness apps let you export GPX files"
```

This links directly to the relevant tab in the import guide modal.

Implementation:
- Add a `<details>` element (or a custom collapsible) below `fileUpload.formatHint`.
- Each line opens the ImportGuide modal scrolled to the relevant tab.
- New i18n keys: `fileUpload.whereToFind`, `fileUpload.fromGoogle`,
  `fileUpload.fromOtherApps`.

### 7.3 Add visual aids to Google Guide

**Files:** `src/components/ImportGuide.tsx`, `public/guides/` (new directory)

The current guide is text-only. Add annotated screenshots or diagrams:

- **Phone export:** Screenshot of Google Maps Timeline → ⋯ → Export with arrows.
- **Takeout:** Screenshot of takeout.google.com selection page.

Implementation:
- Create `public/guides/` directory with optimized PNG/WebP images (< 100KB each).
- Add `<Image>` or `<img>` tags between instruction steps.
- Keep images optional — the text instructions should stand alone.
- Use `alt` text for accessibility.
- Total new assets: 2-4 images, < 400KB combined.

---

## Phase 8 — Implementation Order & Dependencies

### Recommended execution order

```
Phase 1 (Language & Copy)           ← do first, no dependencies, instant UX lift
  ↓
Phase 2 (Hide Complexity)           ← depends on 1.3 for label names
  ↓
Phase 3 (Post-Export Experience)    ← depends on 2.1 for Advanced toggle structure
  ↓
Phase 5 (Theme & Visual Polish)    ← independent, can run in parallel with 2/3
  ↓
Phase 4 (Mobile & Touch)           ← depends on 2.2 for collapsible scenes
  ↓
Phase 6 (i18n Expansion)           ← depends on 1.x for finalized label text
  ↓
Phase 7 (Data Onboarding Guides)   ← independent, can run any time
```

### Dependency graph (task-level)

| Task | Depends on | Reason |
|------|-----------|--------|
| 2.1 | — | Self-contained |
| 2.2 | 1.3 | Uses renamed parameter labels |
| 2.3 | — | Self-contained (new button + sample file) |
| 2.4 | — | Self-contained (button move) |
| 2.5 | — | Self-contained |
| 3.1 | 2.1 | Success screen replaces export panel state |
| 3.2 | 3.1 | Share button lives in the success screen |
| 3.3 | 3.1 | Video preview lives in the success screen |
| 4.2 | — | Self-contained |
| 4.3 | — | Self-contained |
| 4.4 | 2.2 | Builds on collapsible scene parameters |
| 4.5 | 4.1 | Builds on mobile stats visibility |
| 5.1 | — | Self-contained |
| 5.2 | 5.1 | Needs dark/light state to auto-match map |
| 5.3 | 6.1 | Camera descriptions need localized mode names |
| 6.1 | 1.3 | Final label text must be settled first |
| 6.4 | — | Self-contained |
| 7.1 | — | Self-contained (can start anytime) |
| 7.2 | 7.1 | Links to ImportGuide tabs |
| 7.3 | 7.1 | Screenshots go inside ImportGuide |

### Effort estimates

| Phase | Tasks | Estimated effort | New i18n keys |
|-------|-------|-----------------|---------------|
| 1 — Language & Copy | 9 | 2-3 hours | ~15 |
| 2 — Hide Complexity | 5 | 4-6 hours | ~10 |
| 3 — Post-Export | 3 | 4-5 hours | ~10 |
| 4 — Mobile & Touch | 5 | 3-4 hours | ~2 |
| 5 — Theme & Polish | 3 | 2-3 hours | ~8 |
| 6 — i18n Expansion | 5 | 3-4 hours | ~15 |
| 7 — Data Onboarding | 3 | 4-6 hours | ~30 |
| **Total** | **33** | **22-31 hours** | **~90** |

### Testing strategy

Each phase should be verified with:

1. **Build check:** `npx next build` — no TypeScript or build errors.
2. **E2E tests:** `npx playwright test` — all 10 existing tests pass.
3. **Manual check (desktop):** Walk through the full flow from file upload → export.
4. **Manual check (mobile):** Use Chrome DevTools device emulation (iPhone 14 Pro,
   Samsung Galaxy S24) for Phases 4 and 4.5 specifically.
5. **i18n check:** Switch to Korean locale and verify no English text leaks through
   in areas touched by the phase.
6. **Light mode check:** Toggle to light mode and verify all new UI elements have
   correct contrast and styling.

### New files created across all phases

| File | Phase | Purpose |
|------|-------|---------|
| `public/sample-trip.gpx` | 2.3 | Sample GPS track for "Try" button |
| `public/guides/*.webp` | 7.3 | Visual aids for import guide (2-4 images) |

### Files with heaviest modifications

| File | Phases touching it | Nature of changes |
|------|--------------------|-------------------|
| `src/lib/i18n.ts` | 1-7 (all) | ~90 new translation keys |
| `src/components/ExportPanel.tsx` | 2.1, 3.1, 3.2, 3.3 | Advanced toggle + success screen |
| `src/components/SceneEditor.tsx` | 1.3, 2.2, 4.4, 5.3 | Label renames + collapsible + descriptions |
| `src/components/Controls.tsx` | 1.4, 1.5, 4.1, 4.3, 4.5 | Labels + mobile layout + slider styling |
| `src/components/FileUpload.tsx` | 1.1, 2.3, 2.4, 7.2 | Copy + sample button + helper |
| `src/components/GoogleGuide.tsx` | 1.7-1.9, 7.1-7.3 | Rename + expand to multi-platform guide |
| `src/app/page.tsx` | 1.2, 2.3, 3.1, 5.1, 5.2, 6.4 | Toolbar + theme + language picker |

---

*Plan written 2026-02-22. Based on UX review at
`.context/reviews/ux-review-non-technical-traveler.md`.*