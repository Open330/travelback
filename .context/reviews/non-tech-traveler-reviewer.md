# Mina's non-technical traveler review — cycle 002

Date: 2026-07-16
Reviewed revision: `cc6f24f`
Trip goal: turn a Google Maps trip into a vertical Reel from a phone or laptop

## Overall impression — B+

Travelback still feels private, focused, and much less intimidating than a video editor. I can try a sample before finding my own file, the phone guide now starts with the current Google export path, and the default export is already shaped for TikTok/Reels. Fresh browser tests loaded GPX, KML, and every documented Google JSON family **7/7**.

The main drop in confidence happens in Camera on a phone: dragging a perfectly ordinary slider can close the whole editor. The end of export also loses keyboard focus, and a few translated lines still look machine-edited. None of these proves a lost route or bad MP4, but they make a polished local-first tool feel less dependable.

I reviewed the complete traveler-facing source/copy/style set within all 50 `src/` files, the Playwright journey and 17 fixtures, current README/help/project instructions, and the running desktop and iPhone-sized app. Generated output and old review archives were excluded.

## My journey

### 1. Landing and getting a file

At 1440×900 and iPhone 12 size, the landing page had one obvious Browse action, a sample, Draw a route, and help. The primary button was over 44px high and nothing important overlapped. Uploading `README.md` gave “That file is not a travel route file,” so I knew what I had done wrong and could recover.

The current phone guide is now good: `src/lib/i18n.ts:172-177` matches Google's current iPhone and Android support steps, and the old Takeout route is clearly called legacy at `:166` and `:181-187`. One sentence still overpromises: all five languages say the Takeout email “usually” arrives in 10 minutes to a few hours (`:186`, `:546`, `:906`, `:1266`, `:1626`). Google's official Takeout help promises an email when ready but does not promise that window.

### 2. Upload, map, and playback

The sample GPX loaded, the map had normal zoom/rotation controls, and Play was obvious. The targeted Playwright journey also loaded GPX, KML, Google flat JSON, Records, Semantic Location History, Timeline Edits, and Semantic Segments. I saw no application console/page error and no route-file upload request leaving the browser in the reviewed flow.

### 3. Camera and scenes

Camera → Add → Customize is understandable, and accessible labels explain Start/End, Zoom, Tilt, Direction, and Orbit. But on the emulated phone I dragged Zoom left across 129px and the entire Camera panel closed. The code listens for a left swipe on the whole panel (`src/components/SceneEditor.tsx:338-349`, `:489-492`), including the sliders at `:655-735`.

As a traveler I would not think “dismiss gesture.” I would think “the slider or my scene is broken,” reopen Camera, and possibly repeat the same mistake.

### 4. Export, download, and share

The export defaults are still strong: portrait social format, H.264 when available, and technical settings tucked behind Advanced. The local test path reached Video ready with preview, Download MP4, Export Again, and Share.

For keyboard use, the focused Start Export button disappears when the success screen replaces the form (`src/components/ExportPanel.tsx:241-303`). In the running app focus moved to the page body, even though the success toast was announced. That makes the last step less confident for someone using Tab or a switch device.

### 5. Phone, themes, and language

The phone layouts I visited fit without a confirmed sideways overflow. Dark mode was readable; switching to light worked; changing to Korean immediately translated the landing controls. Three shipped strings still look plainly wrong: Korean repeats “approximate/estimated” at `src/lib/i18n.ts:478`, Japanese misses a connective at `:974`, and Chinese repeats the estimate wording at `:1198`.

The suspected old manual-route name did not come back when reopening the creator. I am not reporting it.

## Issue table

| Severity | What a traveler experiences | Exact evidence | Suggested change | Status / confidence |
| --- | --- | --- | --- | --- |
| Medium | Dragging a Camera slider left closes Camera | `SceneEditor.tsx:338-349`, `:489-492`, `:655-735`; reproduced dx=-129 on the rendered Zoom slider | Limit swipe-close to a visible handle or ignore interactive controls; add real mobile drag tests | Confirmed / High |
| Low | Keyboard focus disappears just when the video is ready | `ExportPanel.tsx:241-303`; active element changed from Start Export to `BODY` | Focus the success heading or Download MP4 action | Confirmed / High |
| Low | Takeout sets an unreliable wait expectation | `i18n.ts:186`, `:546`, `:906`, `:1266`, `:1626`; official help has no such bound | Say “wait for Google's completion email” without a time promise | Unsupported claim confirmed; duration varies / High |
| Low | Korean/Japanese/Chinese copy looks unfinished | `i18n.ts:478`, `:974`, `:1198` | Native-speaker edit of the affected flows | Confirmed copy defect / High |

## What works well

- The first screen answers what the app does and offers a no-risk sample.
- Wrong-file recovery uses ordinary language.
- The current Google phone export steps and official links are correct; Takeout is clearly demoted to a legacy fallback.
- All seven freshly exercised import families loaded.
- Map/playback, Camera, and Export are discoverable without reading documentation.
- Portrait export is the default; advanced codec/FPS/bitrate choices stay optional.
- Export success includes preview, download, retry, share, and a platform tip.
- Desktop/mobile geometry, dark/light switching, Korean selection, dialog announcement, and local-file privacy held up in the reviewed paths.

## Priority recommendations

1. Stop slider drags from dismissing the Scene Editor.
2. Put focus on the success heading or Download action after export.
3. Remove the Takeout duration promise.
4. Have a native speaker repair the three malformed strings.

## Final sweep

I repeated the order a traveler actually follows—landing → file help/error → import → map/playback → Camera/scenes → export → download/share—then rechecked phone fit, theme, language, focus, errors, and privacy. No other new confirmed traveler-blocking defect remained. New confirmed count: **4** (1 Medium, 3 Low). Deployment was not run.
