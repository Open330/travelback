# Cycle 7 non-technical traveler review — Mina — 2026-07-24

Target: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`

## Overall impression

Provisional grade: **A- from static evidence**.

I can see a straightforward trip-making path: try the sample or choose my
file, watch the route, adjust Camera only if I want to, then export and save
an MP4. I did not find a new source-confirmed traveler blocker after removing
issues already handled in Cycles 1–6.

This is not a claimed hands-on session. Browser work belonged to the parent
lane, so I did not launch the app, Playwright, a server, or Chrome.

## My journey through the current interface

### 1. Landing and file choice

I get a demo, file picker/drop area, manual-route option, and import guide
before I need to understand GPX or KML. Pending, wrong-file, and sample-load
failure states have visible recovery copy.

### 2. Route and playback

The loaded screen groups the trip name, trimming, elevation, playback speed,
duration, progress, follow behavior, map style, and a clear New Route action.
The controls expose labels and keyboard semantics in source, rather than
depending on color or icons alone.

### 3. Camera

Camera presets let me make a polished result without learning zoom, pitch,
bearing, and rotation. Advanced values remain available. The recently fixed
preview-cancel behavior means changing my mind should restore the committed
trip view, and a net-zero edit should not erase a finished export.

### 4. Export and sharing

The panel starts with recognizable social-video sizes and quality presets,
while codec details stay under Advanced. Progress, cancellation, preview,
Download, Share, save completion, and recoverable save cancellation are
separate states. I can keep my route local and leave with a normal MP4,
without creating an account.

### 5. Mobile, language, theme, and errors

The source includes bounded mobile menus, safe-area spacing, 44px-oriented
actions, dark/light tokens, reduced-motion rules, localized dialogs and
alerts, focus restoration, and retry/reset paths. These still need a live
phone-sized pass before I would call them physically verified.

## New issue table

| Severity | Where I notice it | Result |
| --- | --- | --- |
| — | Full traveler flow | No new causal issue confirmed after historical deduplication |

The architecture-document mismatch reported as `DOC7-01` affects maintainers,
not my in-app journey, so I do not count it again as a traveler finding.

## What feels reassuring

- The sample route removes the fear of choosing the wrong file.
- Manual route drawing gives me a path even if I have no export file.
- Camera presets and social resolutions hide technical detail until I ask.
- Completed video state is preserved across changes that amount to no change.
- The no-account, local-processing model is easier to trust than an upload
  service for personal location history.

## E2E evidence

No live E2E or manual browser checks ran in this workstream. The table records
what current source/tests cover, not a fabricated Cycle 7 execution result.

| Journey | Static evidence | Live result this workstream |
| --- | --- | --- |
| GPX/KML/Google JSON import | Parser, worker, upload tests and E2E cases exist | Not run |
| Sample and manual journey | Component/session tests and E2E cases exist | Not run |
| Playback, trim, Camera | Controller/component tests and E2E cases exist | Not run |
| Export, cancel, save/share | Export controller/encoder/component/E2E cases exist | Not run |
| Mobile, Korean, theme, errors | Responsive CSS, locale tests, and E2E cases exist | Not run |

No Chrome process was launched, so stale-process cleanup was not applicable.

## Competitive comparison

Relive is more automatic but centers an account/service workflow. Strava
assumes activity-tracking familiarity, and Polarsteps is closer to a travel
diary. Travelback's useful difference is the direct local-file-to-MP4 path.
The sample, presets, and collapsed advanced export options make that
difference understandable to someone who is not technical.

## Priority recommendations

1. Preserve the current no-account, local-file workflow.
2. Keep the sample and phone-first import guide prominent.
3. Keep advanced Camera/export settings optional.
4. Retain regressions for non-destructive Camera and export behavior.
5. Re-run the complete traveler flow in the parent process-safe browser lane,
   including short mobile viewports, Korean, error recovery, and final save.

## Final missed-issue sweep

I reviewed every stage from landing through saved-video handoff, plus mobile,
theme, locale, invalid input, map failure, and retry/reset surfaces. After
deduplicating prior traveler and design findings, no additional
source-confirmed drop-off remained.
