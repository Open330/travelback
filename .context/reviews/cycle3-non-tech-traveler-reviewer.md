# Cycle 3 Non-Technical Traveler Review

Review target: `3b6750f`

## Overall verdict

**B+ — the normal trip-to-video path feels approachable, but one interrupted mobile timeline gesture can still remove most of a trip.**

I could understand the landing page without technical knowledge, draw a route from coordinates, discard it safely, import a GPX, adjust the trip, and reach a focused video-ready screen. The defaults and progressive disclosure are good. The main trust problem is that a cancelled timeline gesture can stay alive invisibly.

## My journey through the app

The upload screen told me which files work and where an iPhone download lives. The manual route tool was readable and all its buttons were comfortably tall. After importing the Seoul GPX, the map, location count, timeline, camera, and export actions formed a sensible flow. Export finished with a preview and a clear Download MP4 button.

The confusing moment came when I interrupted a timeline drag as a phone can do when the browser/OS takes over a touch. The handle stopped at 68%, but my trip still said 20/20. When I next dragged the map, the timeline moved again and my trip became 5/20. I would assume the app had lost my route.

## Issues

| ID | Priority | What I experience | Evidence | What would make it clear |
|---|---|---|---|---|
| C3-PR-001 | P1 | After an interrupted timeline drag, touching the map can silently cut 20 locations down to 5. | Confirmed at 390×844; `src/components/TimelineSelector.tsx:368-435`. Severity Medium / confidence High. | Cancel the trim completely, return the handle to its old position, and make the map gesture affect only the map.
| C3-PR-003 | P1 | If I cancel the save picker, the finished screen says to export again for a local copy even though Download MP4 is right there; it may also tell me to look in Downloads before anything was saved. | `src/components/ExportPanel.tsx:253-288`; `src/lib/i18n.ts:131-136`. Severity Medium / confidence High. | Say the save was not completed and tell me to tap Download MP4 or Share—no second render.
| C3-PR-002 | P2 | A cancelled swipe on the Export header can make a later touch close the sheet. | Confirmed focused touch reproduction; `src/components/ExportPanel.tsx:116-133,235`. Severity Low / confidence High. | Forget cancelled swipes immediately.
| C3-PR-004 | P2 | “Approx. estimated time” sounds awkward; Japanese and Spanish repeat the same idea. | `src/lib/i18n.ts:119,843,1567`. Severity Low / confidence High. | Use one natural phrase for “estimated time” in each language.

## What worked well

- The landing screen explains GPX, KML, and Google Timeline JSON without requiring me to know parser terminology.
- The mobile route actions measured 45.8px high; even Go was 28.9×45.8px, so the controls were not fiddly.
- The video screen moved focus to `Video ready` and retained preview plus Download MP4.
- The running flow emitted no page or console errors.
- Local-only coordinate search and local processing are reassuring for private travel history.

## Format confidence

Fresh desktop Playwright checks passed for all seven representative formats:

| Format | Result |
|---|---|
| GPX | Pass |
| KML | Pass |
| Google flat JSON | Pass |
| Google Records.json | Pass |
| Google Semantic Location History | Pass |
| Google Timeline Edits | Pass |
| Google Semantic Segments | Pass |

## Product comparison

Compared with the usual travel-video workflow of importing media into a general editor, Travelback is much simpler because it starts from route files and hides technical video settings under Advanced. Its privacy explanation is also a real advantage. To feel equally trustworthy, however, mobile gestures must never survive cancellation, and the final save instructions must match the exact save state.

## Recommended order

1. Fix C3-PR-001 before polishing anything else; it affects trust in the trip data.
2. Align the picker-cancelled completion copy and platform tip with Download MP4 (C3-PR-003).
3. Clear the Export swipe state on cancellation (C3-PR-002).
4. Clean the three redundant estimated-time translations (C3-PR-004).

No deployment was performed.
