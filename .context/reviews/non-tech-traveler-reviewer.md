# Non-Tech Traveler UX Review - Cycle 1

## Overall Impression

I tested this as Mina: I want to turn a Bali/Seoul trip file into something I can post without learning GPS vocabulary. The first screen is friendly and the happy path mostly makes sense. The app feels much better than a developer demo.

Grade: **B-**. I can probably upload and preview a trip, but camera editing and the final export/share step still make me think "이게 뭐지?" at the exact moment I need confidence.

## Evidence

- Ran `npx playwright test --reporter=list --output=/tmp/travelback-pw-results`: **58 passed, 1 flaky retry, 15.2m**.
- Manual desktop browser pass reached landing, guide modal, GPX upload, playback controls, scene editor, and export modal.
- Manual export attempt clicked `Start Export` and waited for selector `text=Export Again`; it did **not** appear within 120s in this browser run.
- Mobile manual pass was cut short per lead status request; mobile coverage below uses the passing Playwright mobile layout tests plus source/DOM inspection.

## Flow Walkthrough

### Landing and File Selection

The landing page works: "Browse Files", "Try with a sample trip", "Draw a route on the map", and "Need help finding your file?" are visible and understandable. The import guide is useful, especially the Google Maps phone tab.

The weak part is error recovery. If I drop a photo, a zip, or the wrong Google file, I see a short error but no next action. I need the app to tell me exactly what file to choose next.

### Import, Preview, and Playback

GPX, KML, and Google Location History variants import in the E2E suite. Playback controls are usable, but some labels are still creator-tool language: "Following", speed multipliers, duration, and camera tracking are okay after experimenting, not instantly obvious.

### Journey Creation

"Draw a route on the map" is a good backup idea, but the journey creator starts with map clicks and a coordinate/link tool. Casual travelers think in places, not coordinates. I would expect "Add Seoul", "Add Tokyo", or "Paste Google Maps link" before I expect "37.5665, 126.9780".

### Camera and Scene Editing

Presets are the right idea. The problem is that "Customize" opens percent ranges, zoom, tilt, direction, and orbit speed. This is where I stop trusting myself. I do not know whether "Tilt 45 degrees" will make the video cooler or worse.

### Export and Sharing

The export modal is clean, but it defaults to YouTube landscape. Mina is much more likely trying to make a Reel/TikTok/Short. Also, the automated "full journey" tests stop at seeing the export button/configuration; they do not prove the MP4 is actually produced. My manual export attempt did not reach the success state within 120s, so the last mile needs stronger product and test coverage.

## Findings

| Severity | Location | What I saw / failure scenario | Suggested fix | Confidence |
|---|---|---|---|---|
| Critical | `e2e/travelback.spec.ts:1237` and `e2e/travelback.spec.ts:1274`; export success selector `text=Export Again` | Tests named "completes full journey" only open Export and assert `Start Export` is visible. They do not click it or verify the done state. My manual desktop run clicked `Start Export` and never saw `Export Again` within 120s. A traveler can do everything right and still not know whether a usable MP4 exists. | Add a real export-completion E2E path for GPX/KML/Google Records using the existing success UI (`Export Again`, `video`). If export fails or is slow, show plain-language recovery and estimated time. | Medium |
| Medium | `src/components/ExportPanel.tsx:61`, `src/types.ts:99`, selector `[role="dialog"] select` in Export | The export default is the first resolution preset: YouTube / landscape. Mina probably wants TikTok/Reels/Shorts. She can export the wrong shape before noticing the dropdown. | Default to `TikTok / Shorts / Reels (1080x1920)` or add a first-choice "Recommended for Reels/TikTok" preset. | High |
| Medium | `src/components/SceneEditor.tsx:503`, `src/components/SceneEditor.tsx:521`, `src/components/SceneEditor.tsx:556`, `src/lib/i18n.ts:70` | Camera customization exposes `From %`, `To %`, `Zoom`, `Tilt`, `Direction`, and `Orbit Speed`. A non-technical traveler cannot predict the result and may abandon editing. | Make presets the main path. Rename fine controls into outcomes like "start earlier", "closer", "more dramatic angle", and hide numeric tuning behind "Advanced". | High |
| Medium | `src/components/JourneyCreator.tsx:576`, `src/components/JourneyCreator.tsx:604`, `src/lib/i18n.ts:246` | Journey creation asks me to click the map or paste coordinates/map links. If I want to recreate "Seoul to Busan", I do not know where to click first or how accurate I need to be. | Lead with a simple stop list flow: "Add place or paste map link", then let map-click and coordinates remain as secondary tools. | Medium |
| Medium | `src/components/FileUpload.tsx:63`, `src/components/FileUpload.tsx:80`, `src/lib/i18n.ts:26`, `src/lib/i18n.ts:35` | Wrong-file errors collapse to "Unsupported file format" or "Failed to parse file". If I upload a Google Takeout zip, a photo, or the wrong JSON, I get no useful next step. | Error copy should say what to do next: "Use a .gpx, .kml, or Google Timeline .json file. Zip files need to be unzipped first." Add a guide link beside the error. | High |
| Medium | `src/components/TrackToolbar.tsx:134`, `src/components/TrackToolbar.tsx:178`, `src/components/GlobalToolbar.tsx:25` | After a track loads on mobile, language/theme/help are behind an icon-only settings button. This is exactly when I need help most. | Keep a visible `Help` or `?` button after upload on mobile, or label the gear as `More`. | Medium |
| Low | `src/components/ExportPanel.tsx:167`, `src/components/ExportPanel.tsx:223`, `src/components/ExportPanel.tsx:237`, `src/lib/i18n.ts:123` | Post-export guidance depends on resolution and the Share button only appears when file sharing is supported. On desktop or unsupported browsers, I may not know where the video went or how to move it to Instagram/TikTok. | Always show a clear "Download MP4" fallback and device-aware copy: iPhone Files/Photos, desktop Downloads, Android Downloads/Gallery. | Medium |

## E2E Test Results

| Area | Result | Notes |
|---|---|---|
| GPX import | Pass | `imports GPX file and displays track` passed. |
| KML import | Pass | KML import and point-placemark KML passed. |
| Google JSON imports | Pass | Flat array, Records.json, Semantic Location History, Timeline Edits, and Semantic Segments passed. |
| Playback / camera stability | Mostly pass | One antimeridian scene camera test failed first with zoom `2` expected `>3`, then passed on retry. |
| Journey creator | Pass with UX concerns | Icon options and coordinate jump tests passed; flow still feels coordinate-first. |
| Mobile layout | Pass with UX concerns | Header, playback controls, journey panel, timeline, and scene editor layout tests passed. Help is still buried after upload. |
| Export panel | Pass | Dialog semantics, focus trap, close, and TikTok resolution selection passed. |
| Actual video export | Not proven | Existing tests stop before rendering; manual export attempt did not reach `Export Again` within 120s. |
| Unsupported files | Pass with UX concerns | Error appears, but copy is too generic for recovery. |

## What Works Well

- The landing screen is calm and has a clear upload action.
- The sample trip preview lowers anxiety.
- The import guide has real, useful Google Maps and Takeout steps.
- Format coverage is strong: GPX, KML, and multiple Google JSON shapes pass automated import tests.
- Basic playback and mobile layout are covered by regression tests.

## Competitive Comparison

Relive feels more guided: pick activity, preview story, export/share. Strava is less creative but clear about activity files. Polarsteps is more diary-like, but it speaks traveler language. Travelback has stronger file-format flexibility, but it still exposes too much "GPS/video tool" vocabulary before the final shareable result.

## Priority Recommendations

1. Prove actual MP4 export in E2E and fix any slow/failing export path before calling the journey complete.
2. Default export to portrait social video, not YouTube landscape.
3. Simplify camera editing so presets are safe and numeric controls are advanced.
4. Make import errors tell me exactly what file to choose next.
5. Keep mobile help visible after upload.

## Final Sweep Note

I reviewed the actual running app where feasible, ran the configured Playwright suite, inspected the traveler-facing components and tests, and only changed this review file. No fixes were implemented.
