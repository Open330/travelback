# Mina's Non-Technical Traveler Review — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7
Trip goal: turn a saved route into a vertical short video without learning map or video jargon

## Overall impression — B+

I can still get from “what is this?” to a moving trip quickly. The sample is excellent, file guidance is plain, Camera is optional, and Export starts with a useful TikTok-style vertical preset instead of asking me to understand codecs.

The phone view has one surprisingly messy corner: MapLibre credit sits directly on top of my distance/time row. It looks broken and I cannot reliably tap the map credit button. Korean mode is mostly natural, but after switching languages the screen-reader status secretly stays English. 눈에는 한국어인데 읽어 주는 문장은 영어예요.

## Flow walkthrough

### 1. Landing and choosing a route

At 1440×1000 and 390×844, Travelback's promise and next actions are obvious. I tried the sample, the file picker, the Google help path, and manual-route entry. The unsupported-file message in Korean clearly told me what formats to choose. The reviewed route data stayed in the browser; I did not see it sent to an app server.

### 2. Map and playback

The Namsan sample loaded with its name and 56 / 56 locations. Play, speed, duration, camera following, timeline, and elevation all make sense without a tutorial. Map zoom controls stay clear of the top bars.

At the bottom-right, though, the map attribution appears through the glass playback panel. On my phone-size view it overlaps the distance/time line exactly. “MapLibre,” two icons, “3.7 km,” and “0:00 / 0:30” become one pile. 이게 뭐지? The time text wins the tap, so the map credit control underneath is not dependable.

### 3. Camera editing

Camera opens as an optional panel, presets are discoverable, and adding a scene works without forcing me to learn bearing/pitch first. The panel and timeline fit on both tested viewports. I did not find a new scene-editing dead end.

### 4. Export and sharing

Export opens with vertical short-form output, High quality, and advanced codec controls hidden. The dialog has a reachable close action, keeps keyboard focus inside, and makes the map behind it inactive. The ordinary E2E path completes a local stub export and covers download/share states.

The real WebCodecs MP4 test is opt-in and was skipped in this run, so I am not claiming that every browser's final save path was proven today. That is a test/evidence boundary, not a new product failure.

### 5. Mobile, theme, language, and errors

No horizontal scrolling appeared. Primary buttons were easy to tap; dark and light modes remained readable. Switching to KO translated the visible loaded workspace, and the invalid-file explanation was clear.

One accessibility-only sentence did not switch: the loaded-track role=status remained “Track loaded: Namsan Tower Walk” after the document language became Korean. A screen-reader user gets mixed language even though the UI looks fully switched.

## Issue table

| Severity | Location | What I see or feel | Evidence/status | Recommendation |
| --- | --- | --- | --- | --- |
| 🟡 Medium | Loaded map, bottom-right on phone and desktop | Map credit/icons collide with distance and elapsed time; the control underneath loses the tap | Confirmed runtime; src/app/globals.css:214-257, TrackWorkspace.tsx:142-174, Controls.tsx:147-154 | Give attribution its own unobscured safe area above/beside playback and test tap ownership |
| 🟢 Low | Loaded route after EN→KO switch | Everything looks Korean, but the hidden status sentence stays English | Confirmed runtime; src/app/page.tsx:329-341, 638-642 | Rebuild the status from the current language and track name, with a screen-reader regression |

## What works well

- Sample mode gets me to the “aha” moment immediately.
- Upload guidance names the formats and explains Google data without requiring GPX knowledge.
- Map, playback, timeline, Camera, and Export have a clear order.
- Vertical social-video defaults reduce technical choices.
- Mobile layout has no sideways scroll and key actions meet the 44px project target.
- Export focus handling is much better than many canvas-heavy tools.
- Theme, Korean visible labels, and local-processing/privacy cues inspire confidence.

## E2E test results

Full command result: **91 passed, 1 flaky, 1 skipped** across 93 tests in 12.3 minutes. The flaky map-retry journey test passed on its retry and then passed a separate retries-disabled 3/3 run. Because a separate browser export probe was loading the machine during the full suite, I treat this as an intermittent readiness/test finding, not a confirmed traveler-facing map bug.

| Format / scenario | Import and map | Playback | Camera/scenes | Export panel/state | Result |
| --- | --- | --- | --- | --- | --- |
| GPX sample and edge fixtures | Pass | Pass | Pass in main journey | Stub export/download/share states pass | Pass |
| KML korea-japan | Pass | Pass | Pass | Panel readiness pass | Pass |
| Google flat JSON | Pass | Import-focused | Not full journey | Not full journey | Pass for covered scope |
| Google Records.json | Pass | Pass | Not full Camera journey | Panel readiness pass | Pass |
| Semantic Location History | Pass | Import-focused | Not covered end-to-end | Not covered end-to-end | Pass for import scope |
| Timeline Edits | Pass | Import-focused | Not covered end-to-end | Not covered end-to-end | Pass for import scope |
| Semantic Segments/duplicate variants | Pass | Import-focused | Not covered end-to-end | Not covered end-to-end | Pass for import scope |
| Unsupported file | Clear error, app stays usable | N/A | N/A | N/A | Pass |
| Real WebCodecs MP4 | N/A | N/A | N/A | Opt-in test skipped | Manual/runner evidence gap |

The import-only versus full-journey split is established historical coverage debt, not a new Cycle 5 issue.

## Competitive comparison

Relive feels more guided after import, while Strava and Polarsteps benefit from accounts and stored trip history. Travelback's advantage is different: it is fast, private, and does not make me sign in. Camera and export already feel more controllable than a simple map replay. The bottom-corner collision is the kind of polish problem those mature apps avoid, so it matters more than its size suggests.

## Priority recommendations

1. Move MapLibre attribution out of the playback layer and add phone/desktop hit-target tests.
2. Translate the loaded live status when locale changes.
3. Replace the flaky journey-map fixed wait with a real readiness condition.
4. Keep expanding format-specific journeys from import-only to playback/Camera/export completion.
5. Preserve the current simple sample, private local processing, and vertical export defaults while validating real MP4 saves on representative browsers.

## Final sweep

I repeated landing → sample/upload → map → playback → Camera → Export → share states on desktop and phone, then checked keyboard focus, touch size, dark/light, Korean, invalid upload, network, console, loading/error behavior, and responsive overlap. No third new traveler-facing defect was confirmed. No deployment was run.
