# Mina's Non-Technical Traveler Review — Cycle 6 (2026-07-17)

Reviewed revision `1d2755c` as Mina: a traveler who wants a short trip video without learning map, camera, or encoding terminology.

## Overall impression — B+

The first-run path is still unusually friendly: the sample explains the product fast, import guidance names real file formats, the trip stays local, Camera is optional, and Export starts with a sensible vertical-video choice. Two moments break that confidence: a visible timeline reset icon does the wrong thing when clicked, and Retry Map can make a route seem to vanish if I turned camera following off. A smaller language issue appears when Camera corrects an overlapping scene.

## Findings

### MINA6-01 — The timeline Reset icon seeks the trip instead of resetting it

- Severity: Medium
- Confidence: High
- Classification: Confirmed on current desktop and phone layouts
- File/region: `src/components/TrackWorkspace.tsx:142-159`; `src/components/TimelineSelector.tsx:683-700`; `src/components/ElevationProfile.tsx:64-72,91-105`
- What I experience: after shortening the trip, I click the tiny circular-arrow icon beside the location count. The icon stays, the range stays short, and the playback marker jumps because the elevation chart is secretly on top of it.
- Failure scenario: I assume Reset is broken or that I misunderstood timeline editing.
- Fix: separate the timeline and elevation chart, enlarge Reset, and make a real phone/desktop click restore the full trip.

### MINA6-02 — Retry Map can look like it lost my trip

- Severity: Medium
- Confidence: High
- Classification: Confirmed deterministic recovery path
- File/region: `src/components/MapView.tsx:843-885,903-914,1055-1083,1195-1203`
- What I experience: I turn camera following off to inspect the route, a map style fails, and I press Retry Map. The alert disappears, but the replacement camera opens on a world view instead of where I was looking; my route may be offscreen.
- Failure scenario: because recovery says it succeeded, I may reload or re-import and worry that my data was lost.
- Fix: restore my prior view after Retry; if that cannot be restored, frame the full route automatically.

### MINA6-03 — Camera corrections mix English into translated UI

- Severity: Low
- Confidence: High
- Classification: Confirmed
- File/region: `src/components/SceneEditor.tsx:346-385,626-631`
- What I experience: in Korean/Japanese/Chinese/Spanish, an adjusted scene warning still says `start:` or `end:`. The hidden spoken status repeats the same mixture.
- Failure scenario: I already do not know why the app moved my scene, and the mixed-language explanation makes Camera feel more technical.
- Fix: translate the complete correction sentence naturally in every supported language.

## Journey notes and evidence boundary

Upload/sample, map playback, Camera presets, Export dialog, keyboard focus, theme, locale switching, invalid-file recovery, and local-only processing remain understandable. Current isolated gates passed: 366 unit tests, build/CSP/static smoke, and 94 browser tests; one real-WebCodecs export test was expectedly skipped, so I do not claim representative-device MP4 proof.

## Priority

1. Separate timeline/elevation and make Reset reliably clickable.
2. Preserve the manual map view across Retry Map.
3. Fully localize scene correction messages.

## Final sweep and skipped accounting

I repeated the supported landing-to-export journey on desktop and phone, including trim, errors, language, keyboard, and responsive hit ownership. Previous attribution and live-status defects are fixed and were not repeated. Established blocked/performance carryovers were excluded. Artwork/font internals and archived reviews were not treated as traveler-facing executable code; their rendered/build/provenance behavior was still checked.
