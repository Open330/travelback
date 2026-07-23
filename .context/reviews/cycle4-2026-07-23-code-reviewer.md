# Cycle 4 code review — 2026-07-23

**Role:** code reviewer

**Reviewed revision:** `975dded` on `review-plan-fix/no-deploy-20260723`

**Outcome:** one genuinely new actionable finding (Low, high confidence)

## Scope and method

I inventoried all 989 tracked repository paths before reviewing the current
cross-file behavior. The relevant authored surface included:

- all 66 paths under `src/`, including all 25 unit/component/worker test paths;
- all 21 E2E paths and fixtures, all 11 scripts, all 19 public paths, the
  generated worker, package metadata, and root build/test/type/lint
  configuration;
- the Pages workflow, base-path/static-hardening boundary, README and governing
  project/development documentation;
- the current aggregate, Cycle 3 implementation record, explicit process
  platform-boundary deferrals, plan index, and the historical review/plan
  corpus for provenance and duplicate suppression.

The source trace covered import and replacement ownership, full/trimmed track
state, playback and hotkeys, scenes and camera consumers, MapLibre
style/generation hydration, Journey Creator transactions, export
capture/finalization/save/share/cancel paths, localization/theme persistence,
error recovery, generated-worker parity, process supervision, static serving,
and CI delivery.

## CR4-01 — Cancelling a provisional New Route discards the prior manual map pose

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed by deterministic source trace
- **Locations:** `src/app/page.tsx:356-363,469-475,605-618`;
  `src/components/MapView.tsx:749-785,955-985`
- **Missing regression:** `e2e/travelback.spec.ts:2324-2397`

The loaded-session replacement flow is intentionally provisional:
`startFreshJourneySession()` retains the existing track, scenes, trim,
playback, and export state and only sets `isCreatingJourney`. The render path
nevertheless changes the map's `track` prop to `null`. `MapView` responds by
clearing `lastCameraStateRef`, `preparedTrackRef`, `fitTrackOnReadyRef`, and
`retryCameraStateRef`.

When the user cancels, the same retained `Track` object is passed back to
`MapView`. Because its prepared-track ref was cleared, `MapView` classifies it
as a new track and arms `fitTrackOnReadyRef`. During hydration, a user who had
disabled camera following has no retry snapshot, so the fallback branch calls
`fitBounds()`. The map therefore returns to a route overview instead of the
center, zoom, pitch, and bearing the user had established before opening New
Route.

A concrete failure is:

1. import a trip, disable Follow, and pan/zoom/rotate to a useful manual view;
2. open **New Route** without committing a replacement;
3. press **Cancel**;
4. the title, progress, scenes, and route return, but the manual view does not.

This is not merely initial-track fitting: Cycle 1 P07 explicitly defines
Journey Creator as a provisional replacement and requires imported and manual
sessions to survive New → Cancel “exactly.” The existing E2E test asserts the
title, progress, scene, and layer/marker restoration, but never disables Follow
or compares the camera before and after cancellation.

**Fix:** snapshot the current camera through a narrow `MapViewHandle` method
before entering the provisional replacement, then restore that snapshot after
the retained track is rehydrated on cancel when Follow is off. Discard the
snapshot when a replacement is committed. An alternative is to separate
artifact visibility from track/preparation ownership so temporarily hiding the
old route does not destroy its camera transaction state. Extend the existing
New Route cancellation E2E path to record a distinguishable manual
center/zoom/pitch/bearing, cancel, and compare the restored pose within normal
MapLibre tolerances.

**Duplicate audit:** the original AGG-13 finding concerned immediate
destruction of the entire track session and is fixed for the durable state
covered by the current browser test. The older Retry Map camera finding
concerned replacement-map failure recovery. Neither identifies this
provisional Journey Creator transition or its unconditional clearing of the
retry/preparation refs.

## Final missed-issue sweep

The sweep rejected several tempting duplicates:

- the trimmed-track scenes → full-range Reset invalidation defect is still
  visible, but it was already reported verbatim in
  `cycle2-debugger-2026-04-25.md`, so it is not new and is not counted;
- all seven Cycle 3 aggregate findings are fixed at this revision;
- the three process-supervisor limitations remain the explicitly documented
  platform boundaries and have no materially new evidence;
- completed-export share recovery, distance-plateau trim ownership, and
  MediaBunny finalization hypotheses did not survive current-source tracing.

No Critical, High, or Medium finding survived duplicate suppression. Total:
**1 new actionable finding (1 Low)**.

No unit, browser, Playwright, E2E, Chrome, server, build, deployment, commit,
push, or branch-switch command was run. No browser process was started.
