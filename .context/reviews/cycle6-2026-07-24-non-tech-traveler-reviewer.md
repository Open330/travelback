# Cycle 6 non-technical traveler review — 2026-07-24

Target: `099e85d8860456dea5e59cfa293a12defb27bd99`

## Traveler outcome

Provisional grade: **B+ from static evidence**.

The main journey remains understandable: choose a sample, file, or drawn
route; review the trip; optionally adjust Camera scenes; then export a
shareable video. Two new Camera interactions can nevertheless make the app
feel unreliable. They are the same canonical roots as `CR6-01` and
`CR6-02`, so the aggregate should count them only once each.

This was a source-and-test review under an explicit no-browser directive, not
a claimed hands-on traveler session. No Chrome process was launched.

## Traveler issue 1 — “I changed my mind, but the map did not go back”

- Severity: **Medium**
- Confidence: **High**
- Status: **Source-confirmed; manual validation pending**
- Same root as: **CR6-01 / C6-UI-01**

A traveler opens Camera and tries a Zoom or Pitch adjustment. They drag the
control away, decide the original was better, put it back on the same value,
and release. The number is unchanged, but the map can stay jumped to the
middle of that scene rather than the current point in the trip. A keyboard
traveler can reach the same mismatch by adjusting with a held Arrow key and
closing Camera with Escape.

That looks like the route or playback position changed by itself. The app
should always return to the current trip view after a cancelled, unchanged,
or closed preview. A real saved adjustment should end on the newly committed
view.

## Traveler issue 2 — “I put the scene back, but my finished video disappeared”

- Severity: **Medium**
- Confidence: **High**
- Status: **Source-confirmed; manual validation pending**
- Same root as: **CR6-02 / C6-UI-02**

After waiting for a video to finish, a traveler may reopen Camera to inspect
a scene. If they move a scene boundary and then put it exactly back before
releasing, the displayed percentages are unchanged. Travelback still clears
the completed export. When the traveler reopens Export, the ready video is
gone and they may think they must encode it again.

Putting a control back where it started should not destroy finished work.
Travelback should compare the effective scene values before clearing the
video.

## What remains reassuring

- The landing view offers concrete ways to begin without requiring track-file
  expertise.
- The workspace groups playback, route trimming, elevation, Camera, and
  Export into recognizable tasks.
- Unsupported input, map failure, empty scenes, export progress, cancellation,
  and recovery have explicit UI states and actions.
- Dialog naming, focus containment/restoration, visible focus, localized
  labels, theme handling, and responsive scrolling all have deliberate
  source and regression coverage.

Against the ordinary expectation set by non-destructive photo/video editors,
the two weak points are both undo/cancel semantics: a preview must end where
the committed timeline says it should, and a no-op edit must preserve
expensive finished output.

## Verification

Focused SceneEditor and hotkey tests passed **30/30**, but the two exact
composed journeys above are absent. No live viewport, E2E, real export,
Playwright, server, supervisor, or browser test ran in this workstream. The
next priorities are the preview terminal first, then semantic no-op export
preservation, with one real paused-map regression for each.
