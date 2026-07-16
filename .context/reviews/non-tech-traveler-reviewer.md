# Mina's Non-Technical Traveler Review — Cycle 4 (2026-07-16)

Reviewed revision: `4917d39`
Trip goal: load a saved trip, shape the route, add camera direction, and make a vertical travel video without learning editing software

## Overall impression — A-

Travelback still feels focused and unusually approachable for a private, browser-only video tool. The sample trip is immediate, file guidance is plain, map/playback controls are discoverable, Camera stays optional, and the export defaults do not force me to understand codecs. Desktop and phone layouts both held together.

Two keyboard moments break that confidence. Arrow keys do the wrong thing when the map itself is focused, and pressing left on a timeline handle that is already at the beginning asks whether I want to throw away my camera scenes. Neither requires an unusual setup; both can happen during ordinary keyboard exploration.

## My journey

### 1. Getting started

The landing page quickly explains what goes in and what comes out. Browse, sample, manual route, help, units, language, and theme remained readable at 1440×1000 and 390×844. The loaded route clearly announced its name and location count. I did not encounter sideways scrolling, an unreachable action, or an application error.

### 2. Map and playback

Mouse/touch map controls and the playback bar are easy to understand. Keyboard behavior is less trustworthy. MapLibre gives its canvas a focusable map region, so I focused it and pressed ArrowRight expecting the map to pan. Playback jumped from 0% to 2% instead. Travelback's global key handler at `src/lib/usePlaybackController.ts:188-218` claims the arrow before the map can use it.

This matters because the focus ring says “you are using the map,” while the result changes a different part of the product.

### 3. Timeline and Camera

Trimming and Camera scenes are understandable when used separately. Together, one harmless key becomes alarming: I trimmed the end to 79%, added Scene 1, focused the start handle at 0%, and pressed ArrowLeft. The value stayed at 0%, but Travelback asked me to discard scenes because of “Trimming the timeline.”

I did not trim anything. If I choose Discard, real camera work disappears; if I cancel, I must recover from a warning I never deserved. The app should simply ignore a boundary key that cannot change the accepted trip.

### 4. Export and phone use

Export still has strong defaults and keeps advanced settings out of the way. On the phone-sized view the modal fit, Close remained reachable, and focus stayed inside the modal while the rest of the app was inert. More controls and Camera fit below the loaded toolbar. I found no new touch-target or overflow problem.

### 5. Help, language, and visual comfort

Dark and light themes were readable, reduced-motion mode did not remove essential state, and the import/help structure remained approachable. The application made no unexpected route-upload request in the reviewed journey.

## Issue table

| Severity | Traveler experience | Evidence | Needed change | Confidence |
| --- | --- | --- | --- | --- |
| Medium | Arrow keys on the focused map move playback rather than the map | Runtime: progress `0` → `0.02`; `src/lib/usePlaybackController.ts:188-218` | Let MapLibre own keys while its canvas is focused; retain global seek elsewhere | High |
| Medium | A boundary key that changes nothing asks to discard camera scenes | Runtime: start value `0` → `0`, discard dialog visible; `TimelineSelector.tsx:350-367,576-593`, `page.tsx:344-362` | Ignore accepted-range no-ops and preserve scenes/focus/state | High |

## What works well

- The first screen has one obvious route-loading path plus a safe sample.
- Loaded-trip identity, counts, timeline, map, playback, Camera, and Export have clear labels.
- Desktop and phone layouts remained usable without confirmed overlap or sideways overflow.
- Primary touch targets met the project's 44px minimum.
- Export uses proper modal focus and inert background behavior.
- Theme, language, reduced motion, and local-file privacy remained understandable.

## Priority recommendation

Fix both keyboard ownership defects before adding new polish. They are small code paths with outsized trust impact: one action changes the wrong subsystem, and the other threatens to delete work when nothing changed.

## Final sweep

I repeated the journey in traveler order—landing, load, map, playback, trim, Camera, More, Export, phone fit, theme, and help—and rechecked errors, focus, target sizes, and privacy. No third confirmed traveler-facing defect remained. Deployment was not run.
