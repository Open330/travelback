# Mina's Travelback Review — Cycle 9 (2026-07-17)

## Overall impression — B+

I got from the sample trip to a playable map and a ready MP4 without needing an account, and that is still Travelback's strongest trick. The vertical TikTok default makes sense, Play/Pause is obvious, and the export screen tells me size and time instead of making me guess.

The polish slips when I open Camera: every camera dropdown is chopped off on the right, including the little arrow that tells me it opens. On my phone, the end handle for the trip range also hangs off-screen. 그리고 한국어로 바꾸면 `지도: 어두운`이라고 나오는데, 이게 뭐지? It sounds like the sentence stopped halfway.

There is also an accessibility problem I would not notice with a mouse: starting export drops keyboard focus while the video is rendering. The moving dot is announced as a “Map marker” button even though pressing it does nothing. Those two details matter because the app otherwise tries hard to feel calm and trustworthy.

## Flow walkthrough

1. **Land and choose a trip:** The sample, Browse Files, manual journey, and data-help paths are distinct. The live desktop/mobile landing had no overflow or toolbar collision, and the main targets were finger-sized.
2. **Preview and play:** I loaded the Namsan sample, pressed Play, saw progress advance, and paused it. The progress control says both distance and percentage, which is much clearer than a mystery slider.
3. **Edit the camera:** Cinematic gave me six scenes quickly—good. Then the camera-mode dropdowns ran about 30px outside the panel and were clipped. That makes the “easy preset, optional fine-tuning” story look unfinished.
4. **Export:** The default was TikTok 1080×1920. I changed it to HD, 5 seconds, Low, saw the estimate update, started export, watched progress, and reached a ready video with a named `.mp4` link. The keyboard focus gap happens during this otherwise successful step.
5. **Phone and Korean:** At 390×844 the page itself did not scroll sideways, but the right timeline handle extended beyond the screen. Korean switched correctly and dates/controls localized; the map-style phrase was the obvious copy mistake.

## Issue table

| Severity | Location | What I experience | Recommendation | Confidence |
| --- | --- | --- | --- | --- |
| 🟡 Medium | Camera / `src/components/SceneEditor.tsx:560-684` | The camera dropdown runs under the panel edge and its arrow is cut off. It looks broken before I even try a different shot. | Let the dropdown shrink inside the card and test it with long labels on desktop and phone. | High / live confirmed |
| 🟡 Medium | Export rendering / `src/components/ExportPanel.tsx:242-379` | If I use a keyboard or screen reader, Start disappears and my focus drops out of the dialog while Cancel is sitting there. | Move focus to Cancel or the rendering message, then to the success message when done. | High / live confirmed |
| 🟢 Low | Mobile timeline / `src/components/TimelineSelector.tsx:555-639` | The end handle hangs about 13px off the 390px screen, so grabbing the very end is less forgiving. | Keep the whole 44px target inside the screen at both ends. | High / live confirmed |
| 🟢 Low | Loaded map / `src/components/MapView.tsx:775-797` | A screen reader calls the moving dot a button, but it has no action. “Did I miss something?” | Make it decorative to assistive tech, or give it a real useful action and label. | High / live confirmed |
| 🟢 Low | Korean map style / `src/lib/i18n.ts:521-526,683-689` | `지도: 어두운` sounds unfinished; `어두운` needs another word after it. | Use `라이트`/`다크` or complete phrases like `어두운 지도`. | High / live confirmed |

## What works well

- The sample-first path removes the scary “which file do I need?” decision.
- TikTok portrait is the default, with quality details kept understandable.
- Playback, camera presets, timeline dates, elevation, and export status all give visible feedback.
- The short live export completed, produced a playable video state, and offered a sensible filename.
- Light/dark modes, Korean switching, reduced-motion rules, errors, loading, empty states, and cancellation all have owned UI.

## E2E evidence and limitations

| Flow area | Evidence this review | Result |
| --- | --- | --- |
| Actual landing, sample, playback, scenes, export render/ready | Hardened exact-HEAD app via agent-browser at 1440×1000 | Completed |
| Actual phone layout and Korean controls | Same app at 390×844 | Completed; two Low issues above |
| GPX, KML, flat JSON, Records, Semantic History, Timeline Edits, Semantic Segments | Fresh production-static Chromium subset, retries off | 7/7 passed |
| Full KML and Records journey to export readiness | Same fresh subset | 2/2 passed |
| Every final browser/OS save/share destination | Not proven by this focused run | Keep the existing real-export/device gates |

I did not press Share because that can open an external communication surface. I also did not pretend a synthetic touch event proves iPhone Safari: dragging the selected timeline region still deserves a physical-device check. The map canvas's edge focus ring deserves a visual device check too; neither is listed as a confirmed failure here.

## Competitive view

Relive feels more automatic but wants me inside its workflow. Strava assumes I already understand activities. Polarsteps is good for building a travel diary over time. Travelback is nicer when I already have a route file and just want a social clip privately, without signing up. Its current problem is not the big journey—it is the little broken-looking controls that make a local-first tool feel less finished than those polished apps.

## Priority recommendations

1. Keep keyboard focus inside Export when rendering starts.
2. Fix the clipped Camera dropdowns at every locale/width.
3. Keep both full timeline handles inside the phone viewport.
4. Remove the fake Map marker button semantics.
5. Rewrite the Korean light/dark labels as complete names.

The final Mina sweep covered land → choose/import → map → play → trim → camera → export → ready/download, plus wrong-file/map/export recovery, phone layout, theme, language, motion, obvious jargon, and test evidence. These five issues are the only new drop-off or confidence points I could confirm.
