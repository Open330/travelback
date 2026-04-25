# Cycle 1 UX Review — Non-Technical Traveler Reviewer (Mina)

Reviewer: Mina, casual traveler from Seoul  
Scope: landing, upload, preview/playback, camera/scenes, export/share, mobile, error states, Korean/i18n leakage  
Evidence sources: code inspection, Playwright E2E, manual browser pass on desktop and mobile viewport

## Overall impression

I can see the app now. It looks polished and the basic promise is clear: “turn my route into an animated video.” The sample preview, sample trip, and map animation are doing a lot of good work. I would probably try it once.

My grade is **B-** for Mina. The core flow works, but the product still assumes I know what a “travel file,” GPX/KML/JSON, codec, Mbps, and scene ranges mean. The biggest drop-off is not the map. It is “which file do I pick?” and “which export setting gets me a Reel/TikTok without 망했다?”

## Review evidence

- Ran full E2E suite: `npx playwright test --reporter=list` → **74 passed (4.9m)**.
- Manual desktop browser pass at `http://localhost:3101`:
  - uploaded `e2e/fixtures/sample.gpx`
  - opened import guide
  - dropped a fake `bali-selfie.png`
  - played/previewed route controls
  - opened Camera, added a scene
  - opened Export, advanced options, and attempted real export
- Manual mobile viewport pass (`390×844`, Korean locale):
  - landed in Korean UI
  - uploaded `e2e/fixtures/korea-japan.json`
  - opened mobile more menu
  - opened Korean export panel
- Temporary screenshots/results were saved under `/tmp/travelback-mina-*` and `/tmp/travelback-mina-manual-results.json`; they were not committed.

## Flow walkthrough

### 1. Landing page

The landing page feels attractive. I immediately see a preview card, “Browse Files,” “Draw a route on the map,” and “Need help finding your file?” That is good.

Where I hesitate: “Drop your travel file here” sounds friendly, but I do not know what a travel file is. On my iPhone, I have Photos, Google Maps, Downloads, maybe a ZIP from Google Takeout. The visible copy does not say “choose your Google Timeline JSON, GPX, or KML.” I have to open the guide to learn that.

### 2. File selection / import guide

The guide is useful and the tabs cover Google Maps phone/computer, Strava, Garmin, AllTrails, Komoot, and other apps. This is better than making me Google it.

But the guide still has a lot of export-file vocabulary. The landing page should do more of the reassuring work before I open a modal.

### 3. Map + playback preview

After upload, the track name and point count appear, map canvas exists, and controls are visible. The E2E tests confirm playback controls work. The bottom controls are understandable enough: Play, speed, duration, camera following, distance/time.

This part is better than expected. I know I uploaded something successfully.

### 4. Camera / scenes

“Camera” is a good label. Presets are promising. But once I open it, I see “+ Add,” “Presets,” “Cinematic,” “Dynamic,” “From %,” “To %,” and “Customize.” 이게 뭐지? I am not sure if I *need* to touch this or if export will handle it. “No scenes yet... or scenes will be auto-generated on export” helps, but it is buried in the panel.

### 5. Export / share

Export opens cleanly, but the default is **YouTube / Landscape (1920×1080)**. For Mina, TikTok / Shorts / Reels is probably the safer first choice. The panel has useful options, but it also exposes Resolution, Quality, Advanced, Codec, FPS, Mbps, MP4, and estimated MB. That is a lot of “not my language.”

The final share tips are good, but they appear after export. I need guidance before export so I pick the right shape.

### 6. Mobile

Mobile is usable. Touch targets are generally large. The loaded-track row has `새 파일`, `카메라`, `내보내기`, and a gear menu. The more menu includes New Route, map style, import guide, help, units, language, and theme. This is compact and reasonable.

Korean UI mostly works, but the export screen still leaks English/technical labels (`MP4`, `YouTube`, `Instagram`, `HD`, `4K`, `코덱`, `FPS`, `Mbps`, `Voyager`). Some are brand names, but the overall feeling is still “developer settings.”

### 7. Error states

Uploading an unsupported file through the tested file-input path shows an error and does not crash. Dropping a fake photo manually produced the short message “Unsupported file format.” That is technically correct, but Mina needs a recovery sentence right there: “Photos/videos do not include route data. Use Google Timeline JSON, GPX, or KML.”

## Issue table

| # | Severity | Location / selector / region | Status | Description | Recommendation |
|---|---|---|---|---|---|
| 1 | 🟡 Medium | `src/components/FileUpload.tsx:235-240`, `src/lib/i18n.ts:371-372`, selector `[aria-labelledby="fileupload-title"]` | confirmed | Landing says “travel file” and app sources, but not the exact file Mina should choose. | Put accepted file types and Google Timeline wording next to Browse. |
| 2 | 🟡 Medium | `src/components/FileUpload.tsx:101-104`, selector `p[role="alert"]` after dropped `.png` | confirmed | Dropped-photo error is too terse and lacks recovery. | Reuse recovery hint for drag/drop and explain photos/videos are not route files. |
| 3 | 🟡 Medium | `src/components/ExportPanel.tsx:80`, `src/types.ts:99-103`, export dialog resolution select | confirmed | Export defaults to landscape YouTube instead of TikTok/Reels/Shorts. | Default to a social portrait preset or ask “Where will you post?” first. |
| 4 | 🟡 Medium | `src/components/ExportPanel.tsx:128-135`, `src/components/ExportPanel.tsx:291-303`, `src/components/ExportPanel.tsx:418-423` | manual-validation | Export estimate/progress can feel frozen; manual low/HD/5s export was still at 95% after 90s in headless Chromium. | Show elapsed time, “finalizing,” and conservative ranges; do not overpromise. |
| 5 | 🟢 Low | `src/components/SceneEditor.tsx:430-467`, `src/components/SceneEditor.tsx:498-666` | confirmed | Camera editor exposes scene/range jargon before explaining the simple path. | Add one obvious “Make it cinematic automatically” CTA and move ranges under Advanced. |
| 6 | 🟢 Low | `src/lib/i18n.ts:455-490`, `src/lib/i18n.ts:492-506`, `src/components/ExportPanel.tsx:398-400`, mobile export dialog | confirmed | Korean UI leaks English/technical export language. | Localize technical copy or hide it behind Advanced with friendlier Korean labels. |

## Detailed findings

### 1) Landing does not tell me exactly which file to choose

- **Location:** `src/components/FileUpload.tsx:235-240`; Korean strings at `src/lib/i18n.ts:371-372`; selector `[aria-labelledby="fileupload-title"]`.
- **Severity:** 🟡 Medium
- **Confidence:** High
- **Status:** confirmed
- **Evidence:** Manual desktop landing text: “Drop your travel file here — from Google Maps, Strava, Garmin, AllTrails, or any GPS app” and “Works with files from Google Maps...” Manual mobile Korean had the same issue with “여행 파일.”
- **Mina failure scenario:** I want my Bali recap from Google Maps, but I have a ZIP, photos, and maybe a JSON somewhere. “Travel file” sounds like a file I do not have, so I may leave before trying the guide.
- **Suggested fix:** Change the primary hint to something like: “Choose a Google Timeline `.json`, GPX, or KML file. If Google gave you a ZIP, unzip it first.” Make the guide CTA more explicit: “Step-by-step: export from Google Maps.”

### 2) Dropping a photo gives a technically correct but unhelpful error

- **Location:** `src/components/FileUpload.tsx:101-104`; selector `p[role="alert"]` in the upload panel.
- **Severity:** 🟡 Medium
- **Confidence:** High
- **Status:** confirmed
- **Evidence:** Manual drag/drop with `bali-selfie.png` reached the drop-path alert: “Unsupported file format.” Code sets only `t('fileUpload.unsupportedFormat')` for drag/drop, while parse errors add a recovery hint at `src/components/FileUpload.tsx:80-86`.
- **Mina failure scenario:** I drag my trip photo or a downloaded ZIP, see “Unsupported file format,” and think the app is broken. I need the app to say what to try next.
- **Suggested fix:** Use the same recovery hint for invalid drag/drop as the file-input parse path. Even better: “Photos/videos do not contain route data. Upload a Google Timeline JSON, GPX, or KML file. ZIP files need to be unzipped first.”

### 3) Export defaults to YouTube landscape, not the social format Mina probably wants

- **Location:** `src/components/ExportPanel.tsx:80`; preset ordering at `src/types.ts:99-103`; selector `Export Video` dialog → first resolution `<select>`.
- **Severity:** 🟡 Medium
- **Confidence:** High
- **Status:** confirmed
- **Evidence:** Manual desktop and Korean mobile export both defaulted to “YouTube / Landscape (1920×1080).” The E2E test also asserts this current default at `e2e/travelback.spec.ts:1274-1280`.
- **Mina failure scenario:** I export the default, upload to TikTok/Reels, and it looks wrong with landscape framing. I blame the app, not my setting choice.
- **Suggested fix:** Either default to “TikTok / Shorts / Reels (1080×1920)” or add a first-step choice: “Where are you posting?” with TikTok/Reels, YouTube, Instagram square/post. Label one as “Recommended for phone videos.”

### 4) Export progress/estimate can make the app look stuck

- **Location:** estimate formula at `src/components/ExportPanel.tsx:128-135`; progress UI at `src/components/ExportPanel.tsx:291-303`; estimate display at `src/components/ExportPanel.tsx:418-423`; export loop starts in `src/lib/useExportController.ts:136-186`.
- **Severity:** 🟡 Medium
- **Confidence:** Medium
- **Status:** manual-validation
- **Evidence:** Manual real export attempt with `HD Landscape`, `5s`, `Low`, `H.264` in headless Chromium/SwiftShader did not complete within 90 seconds; the dialog showed “Rendering... 95% Frame 143 / 150.” E2E success uses the local export stub at `e2e/travelback.spec.ts:1297-1306`, so final real MP4 save remains a manual/browser-performance gap.
- **Mina failure scenario:** I see an estimate, wait much longer, then close the tab at 95% because it feels frozen. On a MacBook Air or iPhone, this anxiety is real even if the app eventually finishes.
- **Suggested fix:** Make the copy conservative: “This can take a minute or more. Keep this tab open.” Show elapsed time and a final “Finishing video...” phase after frame rendering. Consider defaulting to lower-cost social presets before exposing 1080p landscape/4K.

### 5) Camera/scenes has a good idea but still feels like editing software

- **Location:** preset controls at `src/components/SceneEditor.tsx:430-449`; blend/range/settings at `src/components/SceneEditor.tsx:451-666`; scene labels at `src/lib/i18n.ts:415-453`.
- **Severity:** 🟢 Low
- **Confidence:** High
- **Status:** confirmed
- **Evidence:** Manual scene panel text after opening Camera: “Presets: Cinematic Simple Bird's Eye Dynamic No scenes yet. Click '+ Add'...” After clicking `+ Add`, the panel shows “From % 0% · To % 15% Customize.”
- **Mina failure scenario:** I open Camera to “make it cooler” and immediately wonder if I am supposed to design scenes manually. Percent ranges feel like a timeline editor, not travel content.
- **Suggested fix:** Make the default path one button: “Auto make cinematic camera.” Keep `+ Add`, percent ranges, zoom, tilt, and orbit speed under an “Advanced camera timing” disclosure.

### 6) Korean UI still leaks technical/English export language

- **Location:** Korean export strings at `src/lib/i18n.ts:455-490`; resolution/map labels at `src/lib/i18n.ts:492-506`; hard-coded output wording at `src/components/ExportPanel.tsx:398-400`; mobile export dialog.
- **Severity:** 🟢 Low
- **Confidence:** High
- **Status:** confirmed
- **Evidence:** Manual Korean mobile export text included “YouTube / 가로,” “Instagram,” “HD,” “4K,” “MP4,” “코덱,” “FPS,” and “Mbps.” `export.at` is still `'at'` in Korean at `src/lib/i18n.ts:466`.
- **Mina failure scenario:** I can read English, but Korean mode makes me expect a comfortable Korean product. The export panel still feels like a developer panel.
- **Suggested fix:** Keep brand names, but translate the surrounding concepts: “릴스/쇼츠용 세로 영상,” “초당 프레임,” “예상 파일 크기,” and replace `at` with Korean punctuation/copy. Hide codec/FPS/Mbps unless Advanced is open.

## What works well

- The sample preview and “Try with a sample trip” are exactly what a non-technical traveler needs.
- The import guide is broad and useful; I like that Google Maps phone export is first.
- Upload success is visible: track title and point count appear, and the map route renders.
- Playback controls are large enough and not scary.
- Mobile loaded view stays compact; important actions remain reachable.
- Export success UI has the right idea: video preview, download, share when available, and platform tips.
- E2E coverage is strong for import robustness and core flows.

## E2E test results

Command: `npx playwright test --reporter=list`  
Result: **74 passed (4.9m)**

| Area / fixture | Upload/import | Map render | Playback | Camera/scenes | Export panel | Export execution | Error details |
|---|---:|---:|---:|---:|---:|---:|---|
| GPX `sample.gpx` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ stubbed local export path | No failures |
| GPX variants: single-quote, multiline entity, large valid, invalid elevation, antimeridian, segmented, tiny trim | ✅ | ✅ | ✅ where relevant | ✅ where relevant | ✅ where relevant | Not every variant executes final export | No failures |
| KML `korea-japan.kml` | ✅ | ✅ | ✅ | ✅ | ✅ | Export panel readiness only in full journey | No failures |
| KML point placemarks | ✅ | ✅ | Not full journey | Not full journey | Not full journey | Not covered | No failures |
| Google JSON flat array `korea-japan.json` | ✅ | ✅ | Import-focused | Not full journey | Not full journey | Not covered | No failures |
| Google `Records.json` | ✅ | ✅ | ✅ | Not in full journey | ✅ | Panel readiness only in full journey | No failures |
| Google Semantic Location History | ✅ | ✅ | Import-focused | Not full journey | Not full journey | Not covered | No failures |
| Google Timeline Edits | ✅ | ✅ | Import-focused | Not full journey | Not full journey | Not covered | No failures |
| Google Semantic Segments / duplicate variants | ✅ | ✅ | Import-focused | Not full journey | Not full journey | Not covered | No failures |
| Unsupported `.txt` | ✅ rejects | ✅ app stays alive | n/a | n/a | n/a | n/a | No crash; alert shown |

Important testing note: `e2e/travelback.spec.ts:1297-1306` verifies the local export success UI with `travelback-export-test-stub`. That is useful, but it does not prove every real browser MP4 encode/save path. My manual real-export attempt did not complete within 90 seconds in headless Chromium.

## Competitive comparison

- **Relive:** Relive is easier at the “make this look cool” step because it does not ask me about codec/FPS/Mbps. Travelback is more private and flexible, but less hand-holdy.
- **Strava:** Strava’s export language is also nerdy, but Strava users expect workouts and files. Travelback is aiming at casual trip memories, so it needs more plain-language guidance.
- **Polarsteps:** Polarsteps is strongest at storytelling and “what happens next.” Travelback has the animated route strength, but needs more “now download this shape for Reels” guidance.

## Priority recommendations

1. **Make the landing upload instruction concrete:** Google Timeline JSON / GPX / KML, ZIP must be unzipped.
2. **Change export default or first step to social platform:** TikTok/Reels/Shorts should be a recommended path, not option #2 hidden in a select.
3. **Improve wrong-file recovery:** photo/ZIP/text errors should say exactly what to try next.
4. **Make export wait states trustworthy:** elapsed time, finalizing copy, and conservative estimates.
5. **Simplify Camera for non-editors:** one-click cinematic preset first; advanced scene timing second.

## Final sweep and skipped-file confirmation

- Reviewed repo-specific reviewer prompt: `.context/agents/non-tech-traveler-reviewer.md`.
- Inspected relevant source files: upload, guide, playback controls, toolbar, scene editor, timeline, export, map error UI, i18n, and E2E spec.
- Ran the full Playwright E2E suite and a manual browser pass on desktop and mobile.
- Skipped generated or dependency-heavy directories/files for review purposes: `node_modules/`, `.next/`, `out/`, `playwright-report/`, `test-results/`, and unrelated existing review/plan files.
- Did not delete or intentionally modify unrelated files. Intended repo write for this task: `.context/reviews/cycle1-non-tech-traveler-reviewer.md` only.
