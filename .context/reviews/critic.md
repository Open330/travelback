# Critic — Adversarial Review (Cycle 4, 2026-07-16)

## Result

**Actionable findings: 2 Medium / High-confidence.** CRIT4-01 reopens a previously unconfirmed/deferred map-ownership risk now that its exit criterion has a concrete reproduction; CRIT4-02 is a new asynchronous variant of the older direct-style-during-export concern. Revision reviewed: 4917d39. No deployment was performed.

## Inventory and challenge method

Challenged the complete current product surface: all 53 src files, 15 unit-test files, the Playwright suite and 18 fixtures, public worker/map assets, all scripts, package and framework configuration, Pages workflow, README, and active architecture/development/plan documents. Historical review text was searched before assigning new status so fixed Cycle 3 findings and blocked B01-B04 were not reopened.

Fresh checks passed: npm test (352/352) and npm audit --audit-level=high (zero vulnerabilities). Focused static-browser probes used the already-running local preview and did not build, deploy, or modify production files.

## New findings

### CRIT4-01 — “Retry Map” replaces the map object without recovering its consumers

Severity: **Medium** | Confidence: **High** | Status: **Confirmed in two browser paths**

Evidence:

- src/components/MapView.tsx:577-671 creates and destroys the MapLibre object on mapRetryNonce. Its new style-load handler at lines 632-639 restores the reference grid and track layers only.
- The richer track attachment at src/components/MapView.tsx:841-903 computes per-track state, fits bounds, and creates the HTML marker, but depends only on track and cumulativeDistancesProp. A retry changes neither.
- The progress/camera effect at src/components/MapView.tsx:911-1006 also has no retry/map-generation dependency.
- src/components/JourneyCreator.tsx:284-517 captures one MapLibre instance and binds layers/listeners to it. Its bounded polling advances only when no map exists at effect entry; once it has captured the failed/old instance, retrying MapView does not rerun the effect.
- e2e/travelback.spec.ts:392-427 asserts that the error UI and page-reload recovery exist. It never clicks the in-app Retry Map action with a loaded track or active Journey Creator.

Provenance: .context/reviews/cycle2-code-reviewer-2026-04-26.md:74-82 predicted stale Journey Creator ownership after a map retry as a Risk, and .context/reviews/cycle-c2-aggregate-2026-04-24.md:89-94 deferred the readiness gap because no failing user path existed. The active-panel reproduction below satisfies that explicit reopen criterion; this is a confirmation/reopen, not a duplicate blocked carryover.

Runtime counterexamples:

1. Load the sample track, abort the next positron style request, cycle map style to show the error, unblock it, and click Retry Map. Before failure there was one .maplibregl-marker. After recovery there was one live canvas but zero HTML markers. The route layers return, yet the map starts from the constructor camera instead of the loaded trip state until a later playback/progress mutation happens.
2. Abort the initial Voyager style, enter Journey Creator, unblock the style, and click Retry Map. After the recovered canvas had settled, clicking its center left Undo disabled and the route at zero points. The same delayed click in a no-failure baseline enabled Undo and showed one location.

Failure scenario: the recovery action appears successful because the error disappears and a canvas/route renders, while the current trip loses its marker/camera or manual route editing remains inert. Reload Page works because it remounts every consumer; Retry Map does not.

Required fix: make the map instance generation/readiness an explicit observable contract. On each new ready instance, run one idempotent hydration path for the current track, current progress/camera, marker, and overlays, and notify Journey Creator so it can rebind without discarding waypoints. Add loaded-track and active-creator E2E retry regressions that assert marker, camera/route state, and a working canvas click.

### CRIT4-02 — The export UI is modal, but the map style is not immutable

Severity: **Medium** | Confidence: **High** | Status: **Confirmed reachable state race; corrupt-frame consequence follows from source**

Evidence:

- src/app/page.tsx:265-291 subscribes to prefers-color-scheme and changes mapStyleKey whenever the user has no explicit theme/map-style override. It does not check isExporting.
- src/components/ModalDialog.tsx:44-71 makes the app root inert, so direct toolbar interaction is blocked during export; media-query events are not user DOM interaction and still run.
- src/components/MapView.tsx:673-697 reacts by calling map.setStyle. MapLibre removes and asynchronously reconstructs style-owned sources/layers.
- src/components/MapView.tsx:452-478 and src/lib/useExportController.ts:205-234 drive the same live map per frame, assuming that its route, trail, marker, and style remain available.
- Existing tests at e2e/travelback.spec.ts:1577-1604 prove system-theme map changes and explicit override behavior separately, but no test changes the system theme during export.

Provenance: .context/reviews/tracer-2026-04-27.md:20-30 described a user clicking the style control during export. The current modal makes the app root inert and closes that direct interaction path. CRIT4-02 is the still-live MediaQueryList path, which does not pass through the disabled/inert controls.

Focused runtime proof: with a local export held in the exporting state, changing Playwright media from light to dark produced { exporting: true, style: dark }. With dark.json intercepted, the same transition produced { exporting: true, style: dark, mapError: true }. This confirms that the supposedly exclusive export interval still executes a style replacement and can enter map error. In the real frame loop, a transition between renderFrameAndWait and capture can yield background-only/partially loaded frames or a render/idle timeout.

Failure scenario: a first-run user exports around an OS scheduled dark-mode change, browser theme switch, or device appearance change. The app silently reloads the MapLibre style mid-video even though all visible map controls are disabled.

Required fix: snapshot/freeze the render style for the entire export lease. Queue theme-derived map-style changes while isExporting and apply the latest pending preference only after cleanup, or give export a dedicated immutable map renderer. Add an E2E regression that starts light with no explicit override, holds export, emulates dark, asserts no map-style request/change until export ends, then verifies the deferred preference applies.

## What survived challenge

Parser and generated-worker parity, Cycle 3 null/scalar validation, segmented endpoint and camera behavior, timeline cancellation, outside-map waypoint release, configuration-aware codec probing, picker-cancelled copy, local-only privacy, and current CSP ordering remain consistent with their tests and documentation. The four Cycle 3 blocked/evidence carryovers and the retry-only keyboard watch retain their existing status and are not counted above.

## Final sweep

Rechallenged every mutable owner shared by import, MapLibre, Journey Creator, playback, scene preview, and export. No additional issue met the confidence threshold. Actionable deduplicated critic count: **2 Medium** (1 reopened deferred risk, 1 new variant).
