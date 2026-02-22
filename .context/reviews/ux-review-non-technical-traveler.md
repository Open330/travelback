# UX Review: Travelback — From a Non-Technical Traveler's Perspective

**Reviewer persona:** A casual traveler (30s) who uses Instagram, TikTok, and YouTube.
Comfortable with smartphone apps but not with technical jargon. Wants to turn their
travel GPS data into shareable videos. Has heard of "GPX files" but has never opened one.

**Review date:** 2026-02-22
**App version:** Travelback on GitHub Pages (latest main)
**Tested on:** Desktop (1280×800) and mobile viewport (390×844)

---

## Overall Impression

Travelback is a genuinely cool idea. The concept — upload your GPS track, watch it animate
on a map, export a video for social media — hits a real niche. No other free tool does this
in-browser without requiring an account, app install, or upload to a third-party server.

That said, the app currently speaks the language of developers and GPS hobbyists, not the
language of travelers who just want a pretty video for their Instagram story. The gap between
"what this app can do" and "what a regular person can figure out" is the central problem.

**Rating: 6.5/10** — Impressive technically, but needs UX polish before a non-technical
traveler could use it without help.

---

## 1. First Contact: The Landing Page

### What works
- The glass-effect UI looks modern and premium. First impression is "this is polished."
- The app name "Travelback" and tagline "Animate your journeys into video" immediately
  communicate what this does.
- The map background behind the upload dialog creates atmosphere.
- Dark mode by default feels cinematic and fits the "video maker" vibe.

### What doesn't work

**The drop hint is jargon-heavy:**
> "Drop your GPX, KML, or Google Location History JSON file here"

A non-technical traveler reads this and thinks: "What is a GPX? What is KML? What is JSON?"
These are file format acronyms that mean nothing to someone outside the GIS/dev community.

**Suggested rewrite:**
> "Drop your travel file here — from Strava, Google Maps, AllTrails, Garmin, or any GPS app"

This tells users *where* their data comes from, not *what format* it's in. People know they
use Strava; they don't know Strava exports GPX.

**No visual examples or preview:**
The landing page gives no hint of what the output looks like. A 5-second looping GIF or
video preview showing a sample animated journey would dramatically increase conversion
from "curious visitor" to "actual user."

**The "Browse Files" button is the only clear action:**
Good — it's prominent. But it leads to the native file picker, which for many users on
desktop means navigating to Downloads and hunting for a file they may not have yet.

**"or create a journey manually" link is easy to miss:**
This text-only button at the bottom of the page is the *only* option for users who don't
have a GPS file. It's styled as a subtle link, not a prominent alternative path. Many
users will never notice it. For someone thinking "I don't have a GPS file, what do I do?" —
this should be much more visible, perhaps as a secondary card alongside the upload area.

**No "try with a sample" option:**
First-time visitors want to see what the app does *before* going through the effort of
finding and exporting their data. A "Try with a sample trip" button that loads a demo track
would let people explore the full interface risk-free.

---

## 2. Getting Your Data: The Google Guide

### What works
- The "How to export Google Location History" button on the landing page is a thoughtful
  addition — most travelers have Google Maps data even if they don't know it.
- The two-tab layout ("From your phone" vs "From Google Takeout") is well-organized.
- Step-by-step numbered instructions with clear hierarchy.
- The "From your phone (recommended)" tab is labeled as recommended — good prioritization.
- The Tips section warning about on-device storage since 2024 is genuinely helpful context.
- Direct "Open Google Takeout" link saves users a Google search.

### What doesn't work

**Assumes users know what "Google Takeout" is:**
The second tab is labeled "From Google Takeout" — most people have never heard of this
service. A label like "From your computer (via Google export)" would be friendlier.

**No screenshots or visual aids:**
The instructions say "Tap your profile picture → Go to Your Timeline" but don't show
*what this looks like*. For a non-technical user, annotated screenshots of the Google Maps
app would eliminate most confusion. Even simple illustrations would help.

**"location-history.json" means nothing:**
Step 2 says "This downloads a location-history.json file." A traveler doesn't know what
a .json file is or where it gets saved on their phone. Adding "This saves a file to your
Downloads folder — you'll upload it in the next step" would close the loop.

**The Takeout flow is multi-day and confusing:**
Google Takeout can take hours to days to prepare an export. The instructions say "wait for
email" but don't warn how long this might take. A user who clicks "Create export" and
checks back 5 minutes later will think something broke. Adding a time estimate
("usually 10 minutes to a few hours") would set expectations.

**No guidance for non-Google users:**
What if someone uses Apple Maps, Strava, AllTrails, Garmin Connect, or Komoot? The guide
only covers Google. A brief "Other apps" section with one-liners ("In Strava: open an
activity → … → Export GPX") would serve a much wider audience.

**Where does GPX come from?**
The landing page accepts GPX and KML but provides zero guidance on where to get these
formats. A user who doesn't use Google Maps has no onramp at all.

---

## 3. The "Create Journey" Alternative

### What works
- The concept is sound: click on a map to manually create a route, no file needed.
- Shows a running point count and distance total as you add points.
- Undo button lets you remove the last point.

### What doesn't work

**Zero instructions when it opens:**
Clicking "or create a journey manually" switches to a mode where... nothing visibly changes
except the upload dialog disappears. There's no instruction text, no tooltip, no "Click on
the map to add waypoints" prompt. A first-time user will click the button and then stare
at a blank map wondering what to do.

**Requires geographic precision a casual user won't have:**
Creating a route by clicking points on a map requires knowing *exactly* where you walked.
Most travelers can't reconstruct their route from memory. This feature is more useful for
"I want to plan a future route" than "I want to relive my past trip" — but that disconnect
isn't communicated anywhere.

**No search/geocoding:**
Users can't type a place name or address to find their starting point. They have to manually
zoom and pan to the right city, the right neighborhood, the right street. For someone who
visited, say, "Bukchon Hanok Village in Seoul," this is tedious without a search bar.

**"Done" button has no confirmation:**
After clicking points, clicking "Done" immediately creates the track. There's no preview
of the route, no "Does this look right?" step. Accidental clicks on Done can't be undone.

---

## 4. Main Playback Interface

### What works
- **Track info bar** clearly shows the route name, point count, and date range at a glance.
- **Elevation profile** is a nice visual — the area chart with min/max/delta labels is
  informative for hikers and looks good even if you don't fully understand it.
- **Timeline selector** with date labels and draggable handles is genuinely useful for
  trimming large Google Location History dumps down to a single trip.
- **Play/pause** with a familiar ▶ icon is immediately recognizable.
- **Duration dropdown** with human-readable times (0:10, 0:30, 1:00, 2:00, 5:00) is
  well-designed — no jargon here.
- **Distance and time counters** (e.g., "0 m / 2.7 km" and "0:00 / 0:30") provide
  real-time feedback during playback.

### What doesn't work

**The toolbar buttons ("New", "Scenes", "Voyager", "Export") are cryptic:**
- "New" — New what? A new file? A new scene? It actually opens the journey creator.
- "Scenes" — This is a video editing concept. A traveler thinks in terms of their trip,
  not in terms of camera scenes. "Camera Styles" or "Video Looks" would be friendlier.
- "Voyager" — This is the current map style name, but there's no label saying "Map Style."
  A user has no reason to click a random proper noun. It should say "Map: Voyager" or
  use a map icon with a dropdown.
- "Export" — This one is fine. Universal term.

**The speed dropdown (0.5x – 16x) defaults to 1x but has no label:**
It shows "1x" in a dropdown but doesn't say *what* is 1x. Is this the playback speed?
The animation speed? The map zoom speed? Adding a visible "Speed" label would help.

**"Follow" button is ambiguous:**
There's a toggle labeled "Follow" — does the camera follow the route? Follow me? Follow
what? The tooltip says "Camera follow: ON (F)" which is better, but tooltips require
hovering and won't appear on touch devices. Renaming to "Track Camera" or "Lock Camera"
and adding a small camera icon would clarify.

**Timeline selector histogram bars are unexplained:**
The bars in the timeline selector represent GPS point density (more bars = more data
points recorded in that time period). But there's no legend or explanation. A user
looking at uneven bars will wonder "why are some tall and some short? Is something wrong
with my data?"

**Keyboard shortcuts are invisible:**
Space (play/pause), arrow keys (seek), F (follow toggle), E (export), Escape (close panels)
all work — but no user will discover them without documentation. There's no shortcut hint
overlay, no "?" help dialog, no tooltips showing shortcuts on hover.

**The playback progress slider is tiny:**
The thin slider line is hard to grab, especially for scrubbing to a specific point. A
thicker track or a more prominent handle would improve usability, particularly on
touch devices.

---

## 5. Scene Editor — The Jargon Wall

This is the most problematic panel for a non-technical user. Opening the Scene Editor
after clicking the "Cinematic" preset reveals a wall of parameters that belong in a
flight simulator, not a travel video maker.

### What works
- **Preset buttons** ("Cinematic", "Simple", "Bird's Eye", "Dynamic") are an excellent
  idea. One-click presets that set up a multi-scene composition are the right abstraction
  level for casual users.
- **Scene names** ("Opening Overview", "Bird's Eye", "Flyover", "Orbit Midpoint",
  "Ground Follow", "Closing Overview") in the Cinematic preset are descriptive.
- **The visual progress bar** showing 0%→50%→100% with scene segments gives spatial
  understanding of scene ordering.

### What doesn't work

**Every parameter label is technical jargon:**

| Parameter | What a traveler sees | What it actually means |
|-----------|---------------------|----------------------|
| Zoom 10 | "Zoom... 10 what? Percent? Miles?" | Map zoom level (abstract number) |
| Pitch 45° | "Pitch? Like baseball?" | Camera tilt angle from vertical |
| Bearing 0° | "Bearing? Like navigation?" | Camera compass direction offset |
| Rotation 10°/s | "Degrees per second? Of what?" | How fast the camera orbits |
| Start % / End % | "Percent of what?" | Portion of the route this scene covers |
| Blend 3% | "Blend what?" | Transition overlap between scenes |

For a user who chose the "Cinematic" preset because they wanted something that looks good,
being confronted with 6 scenes × 6 parameters = 36 adjustable values is paralysis-inducing.

**Suggested improvements:**
- **Hide advanced controls by default.** After applying a preset, show a collapsed
  "Advanced" section per scene. Most users will never expand it.
- **Use human language.** "Pitch" → "Camera tilt," "Bearing" → "Camera direction,"
  "Rotation" → "Orbit speed," "Blend" → "Transition."
- **Add visual previews.** When hovering or selecting a camera mode, show a small
  animation or icon demonstrating what "Orbit" vs "Flyover" vs "Ground Follow" looks like.
- **Live preview.** When adjusting a slider, the map should update in real-time to show
  the effect. Currently users must play the animation to see what changed.

**Camera mode names are GIS terminology:**
"Flyover," "Orbit," "Ground Follow," "Closeup," "Bird's Eye," "Overview" — these are
somewhat intuitive, but a brief one-line description in the dropdown would help enormously.
E.g., "Orbit — Camera circles around a point" or "Ground Follow — Street-level view
following the route."

**The delete button (trash icon) per scene has no confirmation:**
Clicking the tiny trash icon on a scene immediately deletes it with a 5-second "Undo"
toast. Accidental taps on mobile (where the trash icon is a small target near the
scene name text field) could be frustrating.

---

## 6. Export Panel — Almost There

### What works
- **Resolution presets named by platform** are a standout UX decision:
  - "YouTube / Landscape (1920×1080)"
  - "TikTok / Shorts / Reels (1080×1920)"
  - "Instagram Square (1080×1080)"
  - "Instagram Post (1080×1350)"

  This is exactly what a non-technical user needs. They don't think in pixels — they
  think "I want to post this on TikTok." Naming the presets by platform answers their
  question before they ask it. **This is the best UX decision in the entire app.**

- **Output summary line** showing "Output: 1920×1080 MP4 (H.264) at 8 Mbps · ~30 MB"
  is well-formatted and gives users a size estimate before committing to an export.

- **"Start Export" button** is clear and prominent.

### What doesn't work

**The codec dropdown (H.264 / H.265 / AV1) is meaningless to travelers:**
No regular person knows what a video codec is, let alone the difference between H.264
and H.265. They just want "video that works." The "(unsupported)" indicator is good for
preventing errors, but the choice itself shouldn't be exposed.

**Suggested fix:** Default to H.264 (universally supported), hide the codec dropdown behind
an "Advanced" toggle. If H.264 isn't available, auto-fall back to the next supported codec
with a brief note ("Using AV1 encoding — your browser doesn't support H.264").

**FPS dropdown (24/30/60) is another technical detail:**
Users don't know or care about frames per second. 30 is fine for everything. Hide this
behind "Advanced" too.

**"Mbps" bitrate input is the most alien element:**
"Megabits per second" is networking jargon that has no meaning to a casual user. They
don't know that 8 Mbps is "good quality" and 2 Mbps is "low quality." A "Quality" dropdown
with "Low / Medium / High / Maximum" labels (mapping to bitrate values internally) would
be much friendlier.

**No "what happens next" guidance:**
After clicking "Start Export," a progress bar appears, and eventually an MP4 downloads.
But there's no message like "Your video has been saved! Here's how to upload it to
TikTok/Instagram/YouTube." The user gets a file in their Downloads folder and has to
figure out the rest on their own.


---

## 7. Mobile Experience

Most travelers will encounter Travelback on their phone — it's where they have their GPS
data, where they browse social media, and where they'll want to share from. The mobile
experience needs to be at least as good as desktop.

### What works
- The landing page renders cleanly on mobile (390×844). The upload dialog, logo, and
  buttons all fit without horizontal scrolling.
- The map takes up the full background, maintaining the immersive feel.
- The toolbar ("New", "Scenes", "Voyager", "Export") wraps well on narrow screens.

### What doesn't work

**Distance and time stats are completely hidden on mobile:**
The desktop layout shows "0 m / 2.7 km" and "0:00 / 0:30" — essential feedback during
playback. These are wrapped in `hidden md:flex` and vanish entirely on mobile. A mobile
user playing back their route has no idea of the distance or current time position.

**Controls bar is cramped:**
The play button, speed dropdown, duration dropdown, and Follow toggle are all crammed
into a single row at the bottom. On a 390px-wide screen, these touch targets are dangerously
close together. Accidentally hitting "16x" speed when reaching for play/pause is plausible.

**Scene editor becomes a very long scroll:**
The Cinematic preset creates 6 scenes, each with ~6 controls. On mobile, this panel becomes
a vertically scrolling list that takes many screen-lengths to traverse. There's no collapse/
expand per scene — it's all open at once. Users will lose their place and give up.

**No swipe gestures:**
The playback progress slider is the only horizontal interaction. There are no swipe gestures
for navigating between scenes, scrubbing the timeline, or switching panels. This feels like
a desktop app squeezed into a phone, not a mobile-first experience.

**The timeline selector drag handles are too small for fingers:**
The start/end handles on the timeline selector are thin vertical lines. Grabbing them with
a finger (which covers ~40px on screen) while they're only a few pixels wide is frustrating.
Larger handles or a different interaction pattern (e.g., pinch to zoom the time range)
would help.

**File upload via "Browse Files" opens the native file picker:**
On mobile, this opens the system file picker, which most users haven't navigated before.
They need to find their Downloads folder or recent files. On iOS, this is especially
confusing since the Files app is unfamiliar to many users. There's no "share from Google
Maps to Travelback" flow.

---

## 8. Light Mode vs Dark Mode

### What works
- The toggle is easy to find (sun/moon icon in the corner).
- Both modes look cohesive — the Vitro glass design adapts well.
- Light mode uses a lighter map style automatically, which is a nice touch.

### What doesn't work

**Dark mode is the default with no respect for system preference:**
The app always starts in dark mode. If a user's phone/computer is set to light mode
system-wide, Travelback ignoring that preference feels inconsistent. The app should check
`prefers-color-scheme` and match the system default.

**The theme toggle has no label:**
It's just a sun/moon icon. Most users will figure it out, but adding "Light/Dark" text
or at least an aria-label that screen readers can use would improve accessibility.
(Note: the button does have an aria-label "Switch to light/dark mode" — good for
accessibility, but sighted users only see an icon.)

**Map style doesn't coordinate perfectly with theme:**
In dark mode, the default "Voyager" map is a light-colored map, which creates a visual
mismatch — glass-dark UI panels floating over a bright white map. Switching to the "Dark"
map style manually fixes this, but a non-technical user won't think to do that. The app
could auto-switch to a dark map style when dark mode is active.

---

## 9. Internationalization (EN/KO)

### What works
- The app detects browser locale and switches between English and Korean automatically.
- Coverage is excellent — virtually all user-facing strings are localized (~120 keys).
- No visible "language switcher" cluttering the UI for monolingual users.

### What doesn't work

**Only two languages for a travel app:**
Travelback is, by definition, used by people who travel. Limiting to English and Korean
means the app is inaccessible to the majority of the world's travelers. Even adding
Japanese, Chinese, and Spanish would dramatically expand the user base.

**No manual language override:**
If a Korean user has their browser set to English (common for developers or bilingual
users), they can't switch to Korean manually. A language picker — even a tiny one in the
footer — would give users control.

**Some UI text is still hardcoded in English:**
Camera mode labels ("Overview", "Flyover", "Orbit", "Ground Follow", "Closeup",
"Bird's Eye") in the `CAMERA_MODE_LABELS` constant in `types.ts` are not localized.
Similarly, codec labels ("H.264 (MP4)", "H.265/HEVC (MP4)", "AV1 (MP4)") and resolution
preset labels ("YouTube / Landscape (1920×1080)") are in English regardless of locale.
Map style names ("Voyager", "Light", "Dark", "Liberty", "Bright") are also hardcoded.

While codec names are arguably universal, camera mode names like "Ground Follow" and
resolution labels like "YouTube / Landscape" should be localized for Korean users.

---

## 10. The Last Mile: Getting Video to Social Media

This is the biggest gap in the entire user journey. The app's tagline is "Animate your
journeys into video" — but the *reason* users want that video is to share it on TikTok,
Instagram, or YouTube. The app stops one step short of the user's actual goal.

### The current flow
1. User exports video → MP4 file downloads to their computer/phone
2. ...then what?

### What's missing

**No post-export guidance at all:**
After the video downloads, there's no success screen, no "here's what to do next" message,
no tips. The user is left staring at a progress bar that says "Done" (or the panel just
closes) with a file somewhere in their Downloads folder.

**No platform-specific tips:**
Each social platform has quirks:
- **TikTok**: Prefers 9:16 vertical video, max 10 minutes, direct upload from phone gallery
- **Instagram Reels**: 9:16, max 90 seconds for Reels, different limit for regular posts
- **Instagram Stories**: 9:16, max 60 seconds per segment
- **YouTube Shorts**: 9:16, max 60 seconds
- **YouTube**: Any ratio, any length up to 12 hours

A simple post-export card saying "You selected TikTok format — to upload: open TikTok →
tap + → select from gallery → your video is in Downloads" would bridge the gap.

**No way to share directly from the browser:**
The Web Share API (`navigator.share()`) is supported on mobile Safari, Chrome, and Edge.
It could let users share the exported MP4 directly to TikTok, Instagram, WhatsApp, etc.
without ever opening a file manager. This single feature would transform the UX for mobile
users.

**No preview before sharing:**
After export, users can't preview the video in-app. They have to find it in their file
system and open it with a separate video player. A simple in-app video player showing the
result (with a "Share" and "Export Again" button) would complete the loop.

**The file downloads with a sanitized filename:**
The exported file uses a sanitized version of the track name (e.g.,
`Test_Route_Seoul_1920x1080_30fps.mp4`). While technically clean, this filename is
meaningless when it appears in a phone's gallery. The user sees a file called
`Test_Route_Seoul_1920x1080_30fps` alongside their vacation photos and has to guess
which one it is. Simpler names like `Travelback - Seoul Trip.mp4` would be friendlier.

---

## 11. Prioritized Recommendations

Grouped by effort and impact. "Effort" reflects development complexity; "Impact" reflects
how much it improves the experience for a non-technical traveler.

### 🔴 Critical (High Impact, Varies Effort)

| # | Recommendation | Effort | Impact |
|---|---------------|--------|--------|
| 1 | **Rewrite landing page copy** — replace file format jargon (GPX/KML/JSON) with source app names (Strava/Google Maps/Garmin/AllTrails) | Low | High |
| 2 | **Add a "Try with sample" button** on landing page that loads a demo track | Low | High |
| 3 | **Hide advanced export settings** (codec, FPS, Mbps) behind an "Advanced" toggle; default to H.264/30fps/8Mbps | Medium | High |
| 4 | **Add post-export guidance** — success screen with platform-specific upload instructions | Medium | High |
| 5 | **Hide scene editor parameters by default** — show presets prominently, collapse individual scene controls under "Customize" | Medium | High |

### 🟡 Important (Medium-High Impact)

| # | Recommendation | Effort | Impact |
|---|---------------|--------|--------|
| 6 | **Add visual example** on landing page (GIF/video of sample output) | Medium | High |
| 7 | **Rename toolbar buttons** — "Scenes"→"Camera Style", "Voyager"→"Map: Voyager", "New"→"New Route" | Low | Medium |
| 8 | **Respect system color scheme** via `prefers-color-scheme` media query | Low | Medium |
| 9 | **Add screenshots to Google Guide** — annotated images of the Google Maps export flow | Medium | Medium |
| 10 | **Replace "Mbps" with Quality dropdown** — Low/Medium/High/Maximum labels | Low | Medium |
| 11 | **Show distance/time stats on mobile** — these are currently `hidden md:flex` | Low | Medium |
| 12 | **Add "Instructions" overlay to Journey Creator** — "Click on the map to add waypoints" prompt | Low | Medium |

### 🟢 Nice to Have (Lower Effort or Lower Impact)

| # | Recommendation | Effort | Impact |
|---|---------------|--------|--------|
| 13 | **Use human-readable scene parameter names** — Pitch→Tilt, Bearing→Direction, Rotation→Orbit Speed | Low | Medium |
| 14 | **Add Web Share API support** for post-export sharing on mobile | Medium | Medium |
| 15 | **Add one-line descriptions to camera mode dropdown** | Low | Low |
| 16 | **Auto-match map style to dark/light mode** | Low | Low |
| 17 | **Add export guides for non-Google apps** (Strava, AllTrails, Garmin, Komoot) | Medium | Medium |
| 18 | **Add language picker** in footer or settings | Low | Low |
| 19 | **Larger timeline drag handles** for touch devices | Low | Medium |
| 20 | **Collapsible scenes** in the scene editor on mobile | Medium | Medium |

---

## 12. Competitive Context

How Travelback compares to alternatives a traveler might find:

### Relive (relive.cc)
- **Strengths:** Automatic — connects to Strava/Garmin, generates 3D flyover video with
  no user effort. Social features, music overlay, photos integrated. Mobile app.
- **Weaknesses:** Requires account creation, uploads data to their servers. Free tier is
  limited (720p, watermark). Premium is $6/month. 3D rendering is server-side.
- **Travelback's advantage:** No account, no data upload, no server, free, higher
  resolution options, runs entirely in browser.
- **Travelback's disadvantage:** Requires manual file handling. No automatic integration.
  No music, photos, or text overlay. No 3D terrain.

### Strava (strava.com)
- **Strengths:** Huge user base, automatic activity tracking, social feed.
  Generates simple 2D route videos with stats overlay.
- **Weaknesses:** Locked into Strava ecosystem. Video output is very basic (static map
  with animated line). No camera movement, no cinematic modes.
- **Travelback's advantage:** Far more cinematic output — 6 camera modes, scene
  composition, orbit shots. Works with any GPS data, not just Strava activities.
- **Travelback's disadvantage:** No automatic data import from Strava.

### Polarsteps (polarsteps.com)
- **Strengths:** Beautiful trip diary with photos, map, and timeline. Auto-tracking.
  Generates shareable trip pages and printed travel books.
- **Weaknesses:** Not really a video tool — it's a travel diary. Video generation
  is limited. Requires their app for tracking.
- **Travelback's advantage:** Focused on video output for social media. More
  cinematic camera work. No app install required.
- **Travelback's disadvantage:** No photo integration, no diary features, no
  automatic tracking.

### Travelback's unique position
Travelback occupies a niche that none of the above fully serves: **free, private,
browser-based cinematic video generation from any GPS source.** No account, no upload
to third-party servers, no subscription. The privacy angle alone is compelling —
your location data never leaves your device.

The challenge is that this niche is currently only accessible to users who:
1. Know how to export GPS data from their tracking app
2. Can navigate a file picker
3. Aren't intimidated by technical parameters

Bridging that accessibility gap — through the UX improvements outlined above — would
make Travelback a genuine mainstream tool rather than a developer's side project that
happens to be publicly accessible.

---

## Summary

Travelback has a strong technical foundation and a compelling privacy story. The core
rendering engine, camera system, and export pipeline all work well. The Vitro glass
design gives it a premium feel. Resolution presets named by social platform are a
genuinely user-centric touch.

The path from "interesting tool for GPS hobbyists" to "app my mom could use to make a
travel TikTok" requires three categories of change:

1. **Language** — Replace technical jargon with human terms throughout
2. **Defaults** — Hide complexity behind "Advanced" toggles; make the happy path
   one or two clicks
3. **Guidance** — Add onboarding hints, visual examples, and post-export instructions
   to close the gap between "I have a video file" and "I posted it on Instagram"

None of these require architectural changes. They're all UI copy, information hierarchy,
and a few new components. The engine is ready — it just needs a friendlier cockpit.