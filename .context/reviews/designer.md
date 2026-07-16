# Product Designer Review — Cycle 4 (2026-07-16)

Reviewed revision: `4917d39`

## Outcome

The responsive visual system remains cohesive, but two keyboard interactions undermine otherwise strong accessibility and traveler confidence. Both are **Medium/High** and reproduced in the rendered application.

## Actual-app coverage

Using the full browser skill suite, I reviewed the landing page and loaded-track workspace at 1440×1000 and 390×844, in light and dark schemes and with reduced motion. The journey covered sample/file load, map interaction, playback, timeline, Camera, More controls, Export form, codec readiness, modal focus/inert state, keyboard use, touch target geometry, overflow, console/page errors, and static asset requests.

## New findings

### DESIGN4-01 — Arrow keys on the focused map seek the movie instead of panning the map

Severity: **Medium** | Confidence: **High**

MapLibre exposes its canvas as a keyboard-focusable `region`. In the loaded app, focusing that canvas and pressing ArrowRight changed playback from 0% to 2%; the canvas received the event, but Travelback prevented its default behavior. The global filter at `src/lib/usePlaybackController.ts:188-218` does not recognize the map canvas as an interaction owner.

Traveler impact: a keyboard user sees the focus ring on the map and reasonably expects arrow-key panning. Instead the route marker jumps forward or backward, making the map feel unreliable and making precise spatial exploration impossible without a pointer.

Required outcome: when focus is on MapLibre's interactive canvas, all of MapLibre's own keyboard commands stay with the map. Global playback arrows must continue to work from neutral page context.

### DESIGN4-02 — An impossible trim action asks users to discard valid camera work

Severity: **Medium** | Confidence: **High**

After trimming the sample to 79% and adding a camera scene, the start handle correctly announced 0%. Pressing ArrowLeft could not move it and left the value at 0%, yet the destructive “Trimming the timeline” dialog appeared. Source flow is `src/components/TimelineSelector.tsx:350-367,576-593` into `src/app/page.tsx:344-362`.

Traveler impact: the product asks a frightening, irreversible-sounding question even though the traveler changed nothing. Choosing Discard deletes authored camera scenes; choosing Cancel interrupts the editing flow. Repeated boundary keys can make the timeline feel unsafe.

Required outcome: semantically unchanged accepted ranges must be silent no-ops. Preserve the scenes, point count, current playback/export state, and focus on the active handle.

## Verified clean scopes

- Desktop and 390px mobile landing, loaded toolbar, More controls, Camera, and Export fit without confirmed horizontal overflow.
- Reviewed primary controls meet the 44px interaction target.
- Export's modal correctly makes the application root inert, names the dialog, traps focus, and remains usable on mobile.
- Dark/light rendering and reduced-motion mode retained readable hierarchy and focus visibility.
- Fresh static journeys produced no application page errors; route files stayed local in the reviewed flow.
- More controls behaves as a focus-managed popover rather than a blocking modal, so its non-modal region semantics are appropriate.

## Final sweep

Revisited focus order, keyboard ownership, touch geometry, overlays, dialogs, overflow, color modes, motion, error recovery, playback, scene authoring, and export. No additional confirmed design defect remained.
