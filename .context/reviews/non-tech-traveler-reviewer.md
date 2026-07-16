# Mina's non-technical traveler review — cycle 001

Date: 2026-07-16

Trip goal: turn my Google Maps Bali history into a vertical Reel from an iPhone 15 or MacBook Air

## Overall impression — B+

My first reaction is, “Okay, I know where to start.” The landing card tells me this makes a video, Browse Files is obvious, there is a demo, and the default export is already TikTok/Reels-shaped (`src/components/ExportPanel.tsx:70`). On my phone-sized screen the card fits, the top controls stay out of the way, and the main buttons are big enough. It looks polished, not like a developer tool wearing a glass filter.

The score drops at the beginning and the very end. The Google “computer” instructions can make me wait for the wrong archive, and the only test that is supposed to prove a real MP4 cannot even start. That second item does **not** prove the app's encoder is broken, but as the person about to spend time rendering a Reel, “probably works” is not comforting.

## Flow walkthrough

### 1. Landing

Desktop at 1440×900 and iPhone 15 at 393×852 both looked clean. I saw one obvious primary action, a sample, “Draw a route,” and help. The mobile card had no sideways scrolling, and the toolbar buttons did not cover the content. Good: I can decide in under ten seconds.

The line leading with “Google Takeout downloads as ZIP” (`src/lib/i18n.ts:20`) is the first anxiety point. I use Google Maps on my phone; I do not know whether “Takeout” is an app, a menu, or takeaway food.

### 2. Finding and selecting a file

The phone guide starts with current iPhone and Android export steps (`src/lib/i18n.ts:168-179`), which is exactly what I need. The problem is the equal “Google Maps (computer)” tab. It tells me to request Takeout, select Location History, wait for email, and find `Records.json` (`src/lib/i18n.ts:180-189`). Current Google instructions point to exporting Timeline data from the phone. If my migrated data is device-based, I can waste an hour and still have nothing to upload. 이게 뭐지?

Once I have a real `.json`, `.gpx`, or `.kml`, the upload path is strong. The supported-format tests passed, and dropping a wrong type produces a plain-language error plus a recovery hint and help button (`src/components/FileUpload.tsx:63-88`, `289-303`). I would not close the tab here.

### 3. Map and playback

The tested KML and Google Records journeys loaded, exposed Play, advanced progress, and reached Export. Playback labels are normal words, and camera tracking is discoverable. The map is an abstract local backdrop rather than a detailed road map; the project context says so at `.context/project/01-overview.md:92`, but a tiny first-run hint would prevent me wondering why street names are missing.

### 4. Camera and scene editing

The KML journey opened Camera, added “Scene 1,” and returned to Export successfully (`e2e/travelback.spec.ts:1494-1527`). Presets keep me away from zoom, pitch, and bearing unless I choose to go deeper. That is the right order for me.

The manual-route icon row is less comfortable on mobile: each emoji target measured about 33×44px, backed by the compact buttons at `src/components/JourneyCreator.tsx:741-764`. Also, “Route name icon” sounds like naming is coming, but every route becomes emoji + “Custom Journey” at `src/components/JourneyCreator.tsx:607-614`. Let me type “Bali 2026” once.

### 5. Export

This screen makes good default decisions. TikTok/Shorts/Reels portrait is selected, H.264 is default, and codec/FPS/bitrate live under Advanced (`src/components/ExportPanel.tsx:70-88`). I can press Start Export without learning what Mbps means.

The simulated local-export path passed and showed a Download MP4 link. The real WebCodecs test did not: it tries to select a nonexistent 3-second playback duration at `e2e/travelback.spec.ts:1311-1320`, while the allowed values begin at 10 seconds (`src/components/Controls.tsx:23-24`). It failed twice before the Export panel, so final MP4 creation is still a release-harness gap, not a proven app failure.

### 6. Download and share

The success design is thoughtful: preview, Download MP4, Export Again, conditional sharing, and a platform tip are together at `src/components/ExportPanel.tsx:252-285`. This bridges the gap from “video exists” to “put it in my camera roll/feed” without adding an account or social API.

### 7. Mobile, themes, errors, and Korean

The tested mobile toolbar, playback, journey panel, timeline, scene editor, and export dialog layouts passed. System dark mode and language switching passed. Focus stays in dialogs and returns when they close. Korean is mostly natural, but Advanced export literally uses English `at` (`src/lib/i18n.ts:474`, rendered at `src/components/ExportPanel.tsx:408-411`). Small, but this is already the scary technical section.

## Issue table

| Severity | Location | What I see or feel | Recommendation | Status / confidence |
|---|---|---|---|---|
| 🔴 Critical | Real MP4 release journey | The real-export test cannot reach encoding, so nobody has shown me that the final promise survived this revision. | Fix the invalid duration and require a real supported-browser MP4 smoke or documented manual release check. | Confirmed test defect; actual export unproven / High |
| 🟡 Medium | Google import guide | “Computer” sends me through Takeout and promises `Records.json`, even though current Timeline export is device-based. | Make phone export the current path and label Takeout legacy/conditional. | Confirmed guidance mismatch; account contents need manual validation / High |
| 🟡 Medium | Manual journey | I cannot name Bali, Seoul, or Kyoto; all become “Custom Journey.” | Add an optional prefilled name to confirmation. | Confirmed / High |
| 🟡 Medium | Mobile journey icons | Six emoji targets are only ~33px wide, so the wrong vehicle is easy to tap. | Make each target at least 44×44px and allow wrapping. | Confirmed measurement / High |
| 🟢 Low | Korean advanced export | The summary says Korean copy plus English “at 8 Mbps.” | Localize the whole output sentence or use separators. | Confirmed / High |

## What works well

- The landing screen answers “what is this?” and “what do I do?” quickly.
- Wrong-file errors explain how to recover instead of showing parser jargon.
- Privacy is credible: route files, map display, and coordinate jumps stay local (`README.md:210-217`).
- Portrait social export is the default, and technical controls are optional.
- The post-export screen has a preview, real download action, reset, and practical platform guidance.
- Desktop/mobile geometry, dark mode, dialog focus, and reduced-motion handling held up in the targeted checks.

## E2E test results

Commands were run against the current dev app with configured Chromium/WebGL flags. The supported-format subset passed **12/12**; the mobile/theme/language/dialog/error subset passed **10/10**; the stubbed local export passed **1/1**. The suite lists 75 tests total, but this review ran targeted journeys rather than claiming a full-suite result.

| Format / scenario | Upload + track | Map / playback | Camera / scene | Export panel | Export execution |
|---|---:|---:|---:|---:|---:|
| GPX (`sample.gpx`, single-quote fixture) | Pass | Pass in GPX journey coverage | Covered elsewhere in suite; not re-run per fixture | Pass | Stub path pass; real MP4 **blocked by broken test input** |
| KML (`korea-japan.kml`, point placemarks) | Pass | Pass | Pass: scene added | Pass | Not executed in KML full-flow test |
| Google flat/Records | Pass | Records full journey pass | Not exercised in Records full-flow test | Pass | Not executed |
| Google Semantic Location / Timeline Edits / Semantic Segments | Pass | Import/render assertions pass | Not exercised per variant | Not exercised per variant | Not exercised |
| Wrong extension | Rejected as expected | App remained usable | N/A | N/A | N/A |

Real-export failure details: `e2e/travelback.spec.ts:1319` calls `selectOption('3')`; `src/components/Controls.tsx:24` has no `3` option. The initial run and retry both timed out after 15 seconds before encoding. The default suite hides this because `e2e/travelback.spec.ts:1315` returns when `TRAVELBACK_REAL_EXPORT` is unset.

## Competitive comparison

Relive felt more like “pick an activity and accept the story.” Strava and Polarsteps also feel familiar because the activity/trip already has a name and a guided sharing path. Travelback asks me to bring a file, but gives me much more privacy and camera control once I get past that step. Its best differentiator is local processing; its biggest disadvantage is that file acquisition and final-export confidence require more trust from me.

## Priority recommendations

1. Repair and operationalize the real MP4 smoke test—the last mile decides whether I return.
2. Rewrite Google import around current phone export; demote Takeout to a clearly marked fallback.
3. Let me name a manual journey in the confirmation card.
4. Widen the manual-route emoji targets to 44px.
5. Remove the Korean `at` leakage and keep technical summaries sentence-level localized.

## Final sweep

I walked the order I would actually use—landing → file → playback → scenes → export → download—then rechecked mobile, theme, errors, Korean, and every supported import shape included in the targeted run. I did not suggest accounts, a backend, social API integrations, or new dependencies.
