# Non-tech traveler UX review — current state (2026-04-19)

## Evidence + inventory

I reviewed the live app at `http://localhost:3000` on desktop and used existing mobile/runtime artifacts when the mobile automation lane started hanging again.

**Runtime evidence used**
- `./.context/reviews/non-tech-traveler-artifacts/current/desktop-landing.png`
- `./.context/reviews/non-tech-traveler-artifacts/current/desktop-guide.png`
- `./.context/reviews/non-tech-traveler-artifacts/current/desktop-loaded.png`
- `./.context/reviews/non-tech-traveler-artifacts/current/desktop-export.png`
- `./.context/reviews/non-tech-traveler-artifacts/current/desktop.json`
- `./.context/reviews/non-tech-traveler-artifacts/mobile-light.json`

**Relevant files inventoried**
- `src/app/page.tsx`
- `src/components/FileUpload.tsx`
- `src/components/GoogleGuide.tsx`
- `src/components/TrackWorkspace.tsx`
- `src/components/TrackToolbar.tsx`
- `src/components/Controls.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/MapView.tsx`
- `src/components/KeyboardHelp.tsx`
- `src/components/GlobalToolbar.tsx`
- `src/lib/i18n.ts`
- `src/types.ts`
- `e2e/travelback.spec.ts`

## Overall impression

My gut reaction: the landing screen looks polished and friendly, but the app still gets stressful the second something goes wrong or I try to make the video “cooler.” Grade: **B-**.

The happy path is close. The scary part is that the failure path, mobile settings path, and camera-editing path still feel like they were written for someone more technical than Mina.

## Quick flow notes

- **Landing:** pretty, clear primary CTA, sample preview helps.
- **Upload:** file types are explained well.
- **Preview/playback:** basic controls look simple enough.
- **Camera editing:** this is where I go “이게 뭐지?” fast.
- **Export:** clean modal, but defaults are aimed at YouTube instead of Reels/TikTok.
- **Share/post-export:** still assumes I understand where the MP4 went on my device.

## Highest-signal issues

| Severity | Issue | Exact location / citation | Failure scenario | Suggested fix | Confidence | Status |
|---|---|---|---|---|---|---|
| 🔴 Critical | Raw WebGL/debug dump is shown directly to the user when the map fails | Runtime selector: `[data-testid="map-error"]` in `./.context/reviews/non-tech-traveler-artifacts/current/desktop-loaded.png`; code: `src/components/MapView.tsx:892-896`, `src/lib/i18n.ts:301` | I uploaded a valid sample trip and got a giant machine-looking error blob (`webglcontextcreationerror`, GPU/vendor text) plus a blank map. For a casual traveler, this looks like the app is broken and unsafe. | Replace the raw error text with plain-language fallback copy (“Your browser couldn’t start the map”) + 2-3 simple recovery actions. Keep raw diagnostics behind a hidden “Copy technical details” affordance. | High | Open |
| 🟡 Medium | Export defaults to landscape YouTube, not the social format Mina is most likely trying to make | Runtime selector: export modal first resolution combobox in `./.context/reviews/non-tech-traveler-artifacts/current/desktop-export.png`; code: `src/components/ExportPanel.tsx:55`, `src/types.ts:99-106` | I click **Export** expecting a Reel/TikTok-style video, but the default is `YouTube / Landscape (1920×1080)`. That increases the chance I export the wrong shape before I even notice. | Make `TikTok / Shorts / Reels (1080×1920)` the default, or add a clear “Recommended for social posts” default state. | High | Open |
| 🟡 Medium | Camera editing still uses creator-tool jargon instead of beginner language | Selector path: `[data-testid="track-toolbar"] button:has-text("Camera")` → Scene editor labels; code: `src/components/SceneEditor.tsx:405-512`, `src/lib/i18n.ts:61-94` | After clicking **Camera**, I immediately see `From %`, `To %`, `Zoom`, `Tilt`, `Direction`, `Orbit Speed`. I can use presets, but the moment I try to customize, I’m doing percentage math and camera jargon. | Keep presets as the main path. Move these controls behind a secondary “Fine-tune (advanced)” layer, and rename labels into plain outcomes like “Start earlier / later”, “Closer / farther”, “Spin more / less”. | High | Open |
| 🟡 Medium | On mobile, help/settings disappear behind an unlabeled gear workflow right after upload | Runtime evidence: top-row mobile toolbar in `mobile-light.json` (`toolbarText: "New RouteCameraMap: VoyagerExport"`); code: `src/components/TrackToolbar.tsx:123-172`, `src/components/KeyboardHelp.tsx:19-30`, `src/components/GlobalToolbar.tsx:23-26` | On the landing screen I can see language/theme quickly. After upload on phone, those controls vanish and help is no longer obvious; I have to discover the gear menu first. That is a bad time to hide reassurance. | Keep at least one obvious help/localization entry visible after upload on mobile—e.g. a persistent `? Help` chip or a labeled `More` button instead of icon-only gear. | Medium | Open |
| 🟡 Medium | Post-export copy still assumes I understand file management, especially on iPhone | Selector path: export success state in `[role="dialog"]`; code: `src/components/ExportPanel.tsx:186-226`, `src/lib/i18n.ts:119-120` | If export finishes, the app says “Your video is in your Downloads folder.” For iPhone/social-first users, that still leaves a real question: is it in Photos, Files, Safari downloads, or somewhere else? | Add device-aware last-mile copy: e.g. on iPhone, explain `Share → Save Video` or `Files app`; on desktop, say exactly which browser download flow to expect. | Medium | Open |

## What works well

- The landing page is calm and attractive. I understand the app’s basic promise quickly.
- **Browse Files** is the obvious main action, which is good.
- The sample preview is smart — it lowers the fear of uploading the wrong thing.
- The export modal itself is visually clean and not overloaded by default.
- The file-source help guide is useful content-wise; it just still needs gentler mobile/product packaging.

## Bottom line

If I stay on the happy path, I can imagine finishing. If I hit one weird browser/device edge case or I want to customize the camera, confidence drops fast.

**Top 3 fixes I’d do first:**
1. Remove the raw debug dump from the map failure state.
2. Make portrait/social export the default.
3. Simplify the Camera editor so presets are the real path, not a doorway into jargon.
