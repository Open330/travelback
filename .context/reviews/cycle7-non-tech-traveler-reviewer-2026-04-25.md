# Cycle 7 Non-Technical Traveler Review - 2026-04-25

Reviewer persona: Mina, non-technical Korean traveler making a Bali-trip recap for Instagram/TikTok.

## Inventory Reviewed

- App shell and session flow: `src/app/page.tsx`
- Landing/upload: `src/components/FileUpload.tsx`
- Import guide: `src/components/GoogleGuide.tsx`, `src/lib/i18n.ts`
- Loaded workspace: `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/Controls.tsx`, `src/components/TimelineSelector.tsx`, `src/components/ElevationProfile.tsx`
- Camera editing: `src/components/SceneEditor.tsx`, `src/lib/camera.ts`
- Manual route creation: `src/components/JourneyCreator.tsx`
- Export: `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/types.ts`
- Product/docs/test context: `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/agents/non-tech-traveler-reviewer.md`, `e2e/travelback.spec.ts`

## Overall Impression

Grade: B-

My gut reaction: the app can absolutely make a route video, and the sample trip path makes the first screen less scary. But if I arrive with my actual Google Maps timeline, the guidance is currently where I would get stuck. 이게 뭐지? The app promises "Google Maps timeline to video", but the phone export instructions do not match current official Google instructions for either iPhone or Android.

The preview/edit/export parts feel much more complete than earlier review waves. The weak spots now are the "last mile" traveler details: how to get the right file, what to do when the browser cannot export, and how to move an MP4 into TikTok/Instagram without knowing where downloads go.

## Flow Walkthrough

### 1. Landing

The first screen has a clear Travelback title, sample preview, "Browse Files", "Draw a route on the map", and "Need help finding your file?" from `src/components/FileUpload.tsx:228-282`. This is understandable for Mina. The global language/theme/unit toolbar is available before upload at `src/components/GlobalToolbar.tsx:23-68`, and locale auto-detection exists in `src/lib/i18n.ts:1757-1800`.

Main anxiety point: the landing copy says files from Google Maps/Strava/Garmin/AllTrails work, but the file picker only accepts `.gpx,.kml,.json` at `src/components/FileUpload.tsx:249-253`. A non-technical traveler can still wonder, "Which file from Google Maps?"

### 2. File Selection / Import Guidance

The import guide is the biggest problem. The guide has a single "Google Maps (Phone)" tab and tells users to use Google Maps -> Timeline -> More -> Settings -> Export Timeline data via translations at `src/lib/i18n.ts:163-171` and `src/lib/i18n.ts:511-519`, rendered by `src/components/GoogleGuide.tsx:146-166`.

Current official Google Help says iPhone export is Google Maps -> profile -> Settings -> Location & Privacy -> Export Timeline data, then Save to Files. It says Android export is from the Android Settings app -> Location -> Location services -> Timeline -> Export Timeline data. Sources checked: Google Maps Help iPhone/iPad lines 84-90 and Android lines 86-94.

### 3. Map + Playback

After upload, track title/counts appear via `data-testid="track-title"` and `data-testid="track-title-mobile"` in `src/components/TrackWorkspace.tsx:122-136`. Playback controls are clear enough: Play, speed, duration, follow camera, distance/time stats in `src/components/Controls.tsx:77-154`.

The mobile layout has explicit E2E guards for toolbar and stats rows (`e2e/travelback.spec.ts:568-631`), and those passed in the run.

### 4. Camera / Scene Editing

The Camera panel is usable if I stick to presets. `SceneEditor` exposes "Cinematic", "Simple", "Bird's Eye", and "Dynamic" presets at `src/components/SceneEditor.tsx:430-448`, which is good. The deeper "Customize" section still has numbers, percentages, degrees, and speed (`src/components/SceneEditor.tsx:529-655`), so it is not Mina-friendly, but it is hidden behind a button.

### 5. Export

Export opens with Resolution, Duration, Quality, and a hidden Advanced section (`src/components/ExportPanel.tsx:314-410`). The resolution presets are social-aware (`src/types.ts:99-106`), but the default is YouTube landscape, not TikTok/Reels portrait.

The bigger issue is failure/readiness language. If codec probing says H.264 is not supported, `canStartExport` becomes false at `src/components/ExportPanel.tsx:102-110`, and the only obvious result is a disabled Start Export button at `src/components/ExportPanel.tsx:410-412`. The explanatory "(unsupported)" text is hidden inside Advanced codec options at `src/components/ExportPanel.tsx:362-370`.

### 6. Post-Export / Sharing

The success screen shows preview, Download MP4, Export Again, and maybe Share at `src/components/ExportPanel.tsx:226-281`. Good.

The sharing tip is too optimistic. It tells me to open TikTok/Instagram and select the video from gallery (`src/lib/i18n.ts:129-131`, Korean at `src/lib/i18n.ts:477-479`), but the code may save via the File System Access picker or a fallback `<a download>` path (`src/lib/videoEncoder.ts:171-211`). On desktop, that is Downloads. On iPhone, it may be Files, not Photos. The app does not explain that bridge.

### 7. Mobile, Theme, Language, Errors

Mobile layout coverage is strong: toolbar, playback stats, journey creator, timeline labels, and scene editor all have E2E tests. Theme behavior has tests and app bootstrap support.

Korean is mostly natural, but a few product-critical export strings still leak tech-English: `export.at: 'at'`, `FPS`, `Mbps`, H.264/H.265/AV1 at `src/lib/i18n.ts:451-483` and `src/lib/i18n.ts:568-570`. I can understand them, but my less technical friends would not.

Unsupported/failed-file errors are too generic. The app maps many parser problems to "Failed to parse file" at `src/components/FileUpload.tsx:63-86`, and unsupported drag/drop just says "Unsupported file format" from `src/components/FileUpload.tsx:100-104` plus `src/lib/i18n.ts:37-40`.

## Issue Table

| Severity | Location / selector | What Mina sees | Scenario | Confidence | Fix |
|---|---|---|---|---|---|
| Critical | `src/lib/i18n.ts:163-171`, `src/lib/i18n.ts:511-519`; guide tabs rendered in `src/components/GoogleGuide.tsx:146-166`; selector: `role=dialog[name="How to Get Your Travel Data"]`, phone tab | The Google phone guide sends me to the wrong place. It says Google Maps Timeline -> More -> Settings -> export. | I use iPhone 15. Official Google Help says Google Maps -> profile -> Settings -> Location & Privacy -> Export Timeline data -> Save to Files. Android is different again: Android Settings -> Location -> Location services -> Timeline -> Export Timeline data. | High | Split "Google Maps (Phone)" into iPhone and Android, or show separate platform subsections. Update steps to match current Google Help and include the expected saved file location/name. |
| Medium | `src/components/ExportPanel.tsx:102-110`, `src/components/ExportPanel.tsx:362-370`, `src/components/ExportPanel.tsx:410-412`; selector: export dialog `button[name="Start Export"]` | Start Export can become disabled with no visible reason unless I open Advanced. | Browser lacks selected codec/WebCodecs support, or codec probe fails. Mina sees a dead button and closes the tab. | High | Show an inline readiness/error message near the disabled button: "This browser cannot export H.264 video. Try Chrome/Safari or choose a supported option." Keep Advanced optional. |
| Medium | `src/lib/videoEncoder.ts:171-211`, `src/components/ExportPanel.tsx:226-281`, `src/lib/i18n.ts:129-131`, Korean `src/lib/i18n.ts:477-479`; selector: success dialog tip box | The app says select the video from gallery, but the app creates an MP4 download/file. | I export on MacBook and want TikTok. The file is in Downloads, not my phone gallery. On iPhone, it may land in Files unless Share is available. | High | Make post-export tips path-aware: "On desktop: send/download the MP4, then upload in TikTok/Instagram. On iPhone: if Share appears, use Share; otherwise save to Files/Photos first." |
| Medium | `src/components/FileUpload.tsx:63-86`, `src/components/FileUpload.tsx:100-104`, `src/lib/i18n.ts:28-40`; selector: upload alert `role=alert` | Wrong-file and parse errors are blunt: "Unsupported file format" or "Failed to parse file." | I drag a photo, a Takeout zip, or the wrong JSON. I do not know what to try next. | High | Include the next action in the error: "Use a .json Timeline export, .gpx, or .kml file. ZIP files must be extracted first." For Google JSON parse failures, add "Try Records.json, Timeline Edits.json, or monthly JSON files." |
| Low | `src/types.ts:99-106`, `src/components/ExportPanel.tsx:82-85`, `src/components/ExportPanel.tsx:314-321`; selector: first export resolution combobox | Export defaults to YouTube landscape even though the social promise highlights Reels/TikTok-style output. | I want a Reel, export without changing anything, and get a horizontal video. | Medium | Consider defaulting to the last chosen resolution, or use TikTok/Reels portrait as the first-run default when no preference exists. |
| Low | Korean export strings at `src/lib/i18n.ts:451-483`, codec copy at `src/lib/i18n.ts:568-570`; selector: Korean export dialog | Korean UI still contains "at", FPS, Mbps, H.264, AV1. | I switch to Korean and open Export/Advanced. The easy words are Korean, but the important export terms are still codec jargon. | Medium | Keep technical labels in Advanced, but add plain Korean helper text: "대부분은 기본값 그대로 사용하면 됩니다" and rename visible "FPS/Mbps" explanations to "영상 부드러움" / "파일 크기와 화질". |
| Low | `e2e/travelback.spec.ts:1412-1444`, `e2e/travelback.spec.ts:1449-1466`, export stub at `e2e/travelback.spec.ts:1274-1283` | Tests call KML/Google "full journey" but stop at Start Export visibility; only the local stub export completes. | A future parser/export regression could pass the full-journey tests without proving final MP4 readiness for KML/Google Records. | High | Either rename those tests to "export panel readiness" or run the local export stub for KML and each Google variant, then assert success preview/download link. |

## What Works Well

- The sample preview and "Try with a sample trip" path reduce first-run fear (`src/components/FileUpload.tsx:188-213`).
- The app has real import coverage for GPX, KML, flat Google JSON, Records.json, Semantic Location History, Timeline Edits, and Semantic Segments (`e2e/travelback.spec.ts:393-430`, `e2e/travelback.spec.ts:1335-1388`).
- The mobile toolbar/playback layout has dedicated tests and passed in this run (`e2e/travelback.spec.ts:568-631`).
- The export success screen gives preview plus a real download link (`src/components/ExportPanel.tsx:242-261`).
- The app respects browser/system locale and persists chosen locale (`src/lib/i18n.ts:1757-1813`).

## E2E Test Results

Command run: `npm run test:e2e -- --reporter=list`

Result: 68 passed, 1 flaky, total 28.0m.

Flaky test:

| Test | Result | Evidence |
|---|---|---|
| `loads homepage with map container` | Flaky: first attempt timed out at 120s, retry passed | Playwright reported timeout for `e2e/travelback.spec.ts:223:7`, then final summary showed "1 flaky" and "68 passed". |

Format / flow coverage observed:

| Format / fixture | Upload | Track visible | Playback | Camera/scenes | Export panel | Export success |
|---|---:|---:|---:|---:|---:|---:|
| GPX `sample.gpx` | Pass | Pass | Pass | Pass | Pass | Pass via local export stub only |
| GPX variants | Pass | Pass | Partial | Not all | Not all | Not covered |
| KML `korea-japan.kml` | Pass | Pass | Pass in "full journey" test | Pass | Pass | Not clicked in format journey |
| KML point placemarks | Pass | Pass | Not covered | Not covered | Not covered | Not covered |
| Google flat JSON | Pass | Pass | Not covered | Not covered | Not covered | Not covered |
| Google Records.json | Pass | Pass | Pass in "full journey" test | Partial | Pass | Not clicked in format journey |
| Google Semantic Location History | Pass | Pass | Not covered | Not covered | Not covered | Not covered |
| Google Timeline Edits | Pass | Pass | Not covered | Not covered | Not covered | Not covered |
| Google Semantic Segments | Pass | Pass | Not covered | Not covered | Not covered | Not covered |
| Unsupported `.txt` | Pass | Alert shown | N/A | N/A | N/A | N/A |

## Competitive Comparison

Relive feels more guided because it assumes I want a shareable travel video and keeps technical choices away from me. Travelback is more private and more flexible, but I have to understand files.

Strava is familiar if the trip is an activity, but not for a whole vacation. Travelback is better for "my whole Bali trip" once the file import works.

Polarsteps is easier for storytelling and posting, but it is account/app based. Travelback's no-account local processing is a trust win, especially for location data, but the app needs clearer import and post-export handholding.

## Priority Recommendations

1. Fix the Google Timeline guide now. It is the first real drop-off for Mina.
2. Add actionable error messages for wrong files, ZIP files, and unsupported Google JSON shapes.
3. Add visible export compatibility messaging when Start Export is disabled.
4. Make post-export tips honest about Downloads/Files/Photos/Gallery and desktop-to-phone transfer.
5. Rename or expand the "full journey" E2E tests so format-specific export success is actually covered.

## Final Missed-Issue Sweep

- Rechecked landing, upload, guide, loaded workspace, mobile toolbar, scene editor, export panel, i18n, docs, parser/export test surfaces.
- No source files were modified.
- The strongest product-promise mismatch is the Google Timeline import guide, not the rendering/editing core.
- Remaining risk: I stopped additional manual browser exploration after the status-check instruction, so this review relies on the completed E2E run, source inspection, docs inspection, and official Google Help verification rather than new screenshot capture.

