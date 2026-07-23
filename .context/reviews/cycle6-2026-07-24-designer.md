# Cycle 6 designer UI/UX review — 2026-07-24

Target: `099e85d8860456dea5e59cfa293a12defb27bd99`

## Verdict and method

Static review found two new interaction-state roots. They are the same roots
as `CR6-01` and `CR6-02`, not additional aggregate findings. I reviewed the
landing and loaded-workspace information architecture, every component,
focus/keyboard semantics, target sizing and contrast, responsive classes,
loading/empty/error/recovery states, all locale keys, component/layout tests,
the full E2E catalog, and public guide/map assets.

The cycle prohibited browser execution, so responsive geometry and the exact
physical interactions below remain manual/browser validation items. That
execution limitation is not itself a finding. No Chrome-capable process was
started.

## C6-UI-01 — A cancelled camera adjustment can leave the route view somewhere else

- Severity: **Medium**
- Confidence: **High**
- Status: **Source-confirmed; hands-on validation pending**
- Same canonical root as: **CR6-01 / ARCH6-01 / TE6-01**
- Regions: `src/components/SceneEditor.tsx:436-650`,
  `src/app/page.tsx:511-551`

The preview is useful feedback, but its visual contract is broken at two
natural exits. A user can drag Zoom, Pitch, Direction, or Rotation away and
back to the starting notch, release with the setting unchanged, and still
leave the map showing the scene midpoint. A keyboard user can likewise hold
an Arrow adjustment and close Camera with Escape before keyup; the panel and
focus close correctly, but an applied preview is not restored.

The visible result contradicts the controls: the parameter and playback
position say nothing changed, while the route view has jumped. At paused
playback or with Follow off, the mismatch persists.

Treat preview as a reversible visual transaction. On cancel, no-op, Escape,
or unmount, restore only if a preview actually reached the map. On a real
commit, make the committed current-progress pose the terminal visual state.
Add pointer and keyboard regressions using a non-midpoint playback position.

This is not the older ignored-clear defect; the parent now honors a clear,
but these paths do not send one.

## C6-UI-02 — Returning a scene boundary to its start can discard a finished video

- Severity: **Medium**
- Confidence: **High**
- Status: **Source-confirmed; hands-on validation pending**
- Same canonical root as: **CR6-02 / ARCH6-02 / TE6-02**
- Regions: `src/components/SceneEditor.tsx:202-326,652-704`,
  `src/app/page.tsx:502-509`

A user who has already encoded a video can inspect a scene range, drag a
boundary, reconsider, and put it exactly back. The interface shows the same
percentages, but the gesture still publishes an edit and clears the completed
export. Reopening Export therefore loses the ready video even though no
visible scene setting changed.

Net-zero gestures should be non-destructive. Suppress the scene commit when
the final canonical range equals its origin, and independently preserve the
export when the effective scene array is unchanged. Cover the complete
finished-export → net-zero Camera edit → reopen Export journey.

## Static UI sweep with no additional new root

The existing source provides named dialogs, focus trapping and restoration,
visible focus styles, 44px-oriented primary targets, live regions for
important state, responsive internal scrolling, localized error/recovery
copy, theme contrast variables, reduced-motion handling, and explicit
loading/export states. Prior slider-target, mobile menu, jargon, geographic
context, save-state, and duration-draft findings were deduplicated rather
than refiled.

Focused non-browser tests passed 30/30. No server, browser, E2E, supervisor,
deployment, or browser cleanup command ran.
