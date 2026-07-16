# Product Designer Review — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7

## Outcome

The product remains visually coherent and responsive, but one bottom-corner collision harms both legibility and attribution interaction, and one language switch leaves an accessibility-only sentence behind. Findings: **DESIGN5-01 Medium/High, DESIGN5-02 Low/High**.

## Actual-app coverage

I used every required agent-browser skill family: core navigation/session handling, interaction, query/accessibility snapshots, waits, network/storage inspection, visual screenshots/comparison, debug console/evaluation, saved state, and viewport/media configuration.

The audit covered:

- 1440×1000 desktop and 390×844 phone layouts
- landing, sample/file load, map, playback, timeline, Camera/scene creation, Export, More/settings, and invalid upload
- pointer and keyboard navigation, focus rings, modal trap/inert behavior, roles/names/live regions, and hit targets
- dark/light, reduced motion, EN/KO, loading/error states, console/page errors, runtime requests, horizontal overflow, and perceived responsiveness

Primary actions remained at least 44px in the reviewed paths; the 40px-high elevation slider still exceeds WCAG 2.2's 24px target minimum. No horizontal overflow was found.

## New findings

### DESIGN5-01 — Attribution occupies the playback statistics layer

Severity: **Medium** | Confidence: **High**

Source regions: src/app/globals.css:214-257; src/components/TrackWorkspace.tsx:142-174; src/components/Controls.tsx:147-154.

The CSS moves MapLibre's top controls away from the app toolbar but leaves the bottom-right attribution at the viewport edge. The app then draws its full-width timeline/elevation/playback stack over that edge at z-index 10.

At 390×844, the attribution rectangle (295.64,810,84.36,24) overlaps both playback-stats (27,809,336,16) and the time label (307.89,809,55.11,16). The screenshot visibly merges “MapLibre”/icons with distance and time. Hit testing the collision lands on the time span, so the attribution action below is not pointer accessible. At 1440×1000 the attribution is likewise visible underneath the translucent playback surface.

Traveler impact: elapsed time becomes hard to parse at a glance, the corner looks broken, and map credit/help cannot be reliably opened.

Required outcome: establish a responsive bottom safe area for MapLibre attribution or reserve a dedicated unobscured corner. Verify visual separation, pointer hit ownership, focus visibility, and keyboard activation at desktop and mobile sizes. Do not solve it by hiding attribution.

### DESIGN5-02 — Locale switching updates the visible workspace but not its live status

Severity: **Low** | Confidence: **High**

Source regions: src/app/page.tsx:329-341, 638-642; src/lib/i18n.ts:1873-1887.

After loading the sample in English and selecting KO, document.lang becomes ko and visible controls translate, but role=status continues to expose “Track loaded: Namsan Tower Walk.” The stored string was translated only at load time.

Accessibility impact: the visual design communicates a complete language change while the screen-reader layer remains partly English under a Korean language context. This breaks consistency and may trigger the wrong voice/pronunciation.

Required outcome: derive the status from current locale plus stable track data, or deliberately clear/re-announce it on locale change. Add a live-region localization regression.

## Verified clean scopes

- Loaded desktop and phone headers, More controls, Camera, timeline, and Export fit without sideways scrolling.
- Export has a named dialog, focus containment, inert background, reachable Close/Cancel, and usable mobile form layout.
- Keyboard focus indicators remain visible; map zoom controls no longer collide with the top action rows.
- Dark/light and reduced-motion rendering retain hierarchy and state.
- Invalid upload messaging is clear in Korean; no application page error or unexpected route-data network request appeared.

## Final sweep

Revisited responsive geometry, overlay stacking, focus order, pointer/keyboard ownership, target size, color modes, motion, i18n, status/error/loading feedback, Camera, export, and perceived performance. No third new design defect met the evidence threshold. No deployment was attempted.
