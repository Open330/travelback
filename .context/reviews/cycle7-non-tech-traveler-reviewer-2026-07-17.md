# Cycle 7 Non-Technical Traveler Review — Mina — 2026-07-17

## Overall impression — A-

I can go from a travel file to a moving map without feeling like I accidentally opened developer software. The sample route, Korean UI, big mobile controls, camera presets, and simple export defaults make the main path easy. On my phone-sized screen the buttons no longer fight with the timeline at the bottom, which is a huge improvement.

Three things still break trust: the km/mi keyboard highlight almost disappears, the trip-range handles tell a screen reader `42%` instead of the day and time, and the visible desktop Help button is actually covered by the elevation chart. For a travel app, the date is the point—and Help should open help.

## Flow walkthrough

### 1. Landing

The sample route is a clear low-risk first action, and the upload card says which files work. The Google import guide is visible before I need it. I do not hit a dead end.

### 2. File selection

I uploaded the Seoul GPX fixture successfully. The app showed `Test Route Seoul`, the map appeared, and the Korean live status became `트랙이 로드되었습니다: Test Route Seoul`. The supported Google variants are represented in the automated fixture matrix, including Records, Semantic Location History, Timeline Edits, and Semantic Segments.

### 3. Map and playback

Play, progress, timeline, elevation, map style, and follow controls are understandable. On 390×844, the timeline, elevation, and playback bands stayed separate. The More-controls sheet trapped focus and closed with Escape.

### 4. Camera and scenes

The presets let me make something polished without learning pitch or bearing. Advanced controls are still there if I want them, but they do not block the easy route.

### 5. Export

The export panel leads with resolution and quality, hides codec details under Advanced, and shows one obvious Start Export action. The modal kept background controls inert and returned me to the opener after Escape.

### 6. Post-export and sharing

MP4 and the in-app preview make the handoff to Instagram, TikTok, or CapCut familiar. The app stays correctly client-only; I do not want an account or a social-media login added here.

### 7. Mobile, theme, errors, and language

The 390×844 layout had 44px controls, no horizontal overflow, and no bottom-band collision in the checked flow. Dark/light tokens and reduced-motion rules are present. Korean labels and the guide switched correctly in the exercised path. Error and recovery surfaces have alerts and clear actions.

## Issues

| Severity | Location | What I experience | Recommendation |
| --- | --- | --- | --- |
| 🟡 Medium | Desktop km/mi selector and mobile More → Units | When I tab to km or mi, most of the focus ring is cut off by the rounded group. If the selected button already has a cyan background, I can barely tell where the keyboard is. | Draw the focus mark inside each segment and test the first and last button in light and dark themes. |
| 🟡 Medium | Timeline start/end handles | A screen reader says a percentage, while the screen shows the actual date and time. On a Bali trip across several days, `42%` makes me say “이게 언제지?” | Announce the localized selected date/time after every keyboard change, with percentage only as fallback/supporting context. |
| 🟡 Medium | Desktop Help above the bottom controls | The Help button looks tappable, but the elevation chart is layered over its whole target. My click seeks the trip instead of opening shortcuts. | Put Help in the top action bar or give it shared bottom clearance; prove a real center click opens Help without moving progress. |

## What works well

- The sample trip removes the fear of choosing the wrong file.
- The main mobile actions are large enough to tap and the control stack stays readable.
- Korean live feedback confirms that an upload actually worked.
- Camera presets and export defaults hide jargon until I ask for advanced settings.
- Dialogs behave like real dialogs: background controls stop responding and focus comes back afterward.

## E2E evidence

The fresh unit pass completed 368/368. Current-source manual checks covered desktop and mobile upload/map/playback/dialog/locale flows with no console or page error. The repository's current full format matrix covers the rows below; final dev, static, and real-MP4 matrices remain mandatory implementation gates and are not replaced by this review pass.

| Format | Upload/name | Map/playback | Camera/export state | Result |
| --- | --- | --- | --- | --- |
| GPX | Covered; manually rechecked with Seoul route | Covered; manually rechecked | Covered by E2E | Pass |
| KML / gx:Track | Covered by fixture E2E | Covered | Covered | Pass |
| Google Records JSON | Covered by fixture E2E | Covered | Covered | Pass |
| Semantic Location History | Covered by fixture E2E | Covered | Covered | Pass |
| Timeline Edits | Covered by fixture E2E | Covered | Covered | Pass |
| Semantic Segments | Covered by fixture E2E | Covered | Covered | Pass |
| Unsupported/invalid input | Alert/recovery covered | App remains usable | Not applicable | Pass |

## Competitive comparison

Relive feels more automatic but pushes me into an account and a service workflow. Strava assumes I understand activity tracking. Polarsteps is better for a trip diary than a route video. Travelback's advantage is that I can keep my file local and make an MP4 directly; the sample, presets, and simple export now make that advantage understandable to a casual traveler.

## Priority recommendations

1. Fix the clipped km/mi keyboard focus indicator.
2. Make the visible desktop Help action genuinely clickable.
3. Announce real dates/times from the timeline handles.
4. Keep the current no-account, local-file workflow.
5. Keep Advanced export options collapsed by default and preserve bottom-stack separation.

## Final missed-issue sweep

I repeated the full Mina journey in both English and Korean paths available during the live pass, checked the obvious wrong-file/recovery surfaces in source and tests, and inspected mobile tap/scroll/focus behavior. The final desktop center-hit probe confirmed the Help failure; I did not find another confirmed drop-off point beyond the three issues above.
