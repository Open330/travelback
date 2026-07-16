# Cycle 6 Debugger — 2026-07-17

Reviewed revision `1d2755c`. Root causes below are narrowed to current code; no fixes were applied.

## Findings

### DB6-01 — Retry generation preserves track preparation state but not manual camera state

- Severity: Medium
- Confidence: High
- Classification: Confirmed static root cause
- File/region: `src/components/MapView.tsx:435-439,843-885,903-914,1055-1083,1197-1200`
- Root cause: retry reuses component refs. `preparedTrackRef` correctly prevents expensive “new track” work, but the same identity guard also prevents `fitTrackOnReadyRef` from being armed. No ref captures the outgoing user-controlled map camera. The new MapLibre instance therefore retains its constructor world camera when follow is off.
- Failure scenario: Retry clears the alert and restores layers/marker but strands them outside the viewport.
- Fix: distinguish “same data” from “new map generation.” Save/restore manual camera per generation; route-fit only as fallback. Add a follow-off retry test.

### DB6-02 — Two independent bottom offsets assume heights that their children exceed

- Severity: Medium
- Confidence: High
- Classification: Confirmed runtime root cause
- File/region: `src/components/TrackWorkspace.tsx:142-159`; `src/components/TimelineSelector.tsx:486-700`; `src/components/ElevationProfile.tsx:91-105`
- Root cause: Timeline uses `bottom-40 sm:bottom-36`, while elevation/controls are a separate `bottom-0` stack. Timeline's real box includes the 48/64px histogram, optional date row, and count/Reset row (102px desktop; 115.56px mobile in the reproduction). The later elevation subtree paints across its lower portion and wins hit testing.
- Failure scenario: Reset is visible but pointer-inoperable at both official responsive viewports.
- Fix: use one flex/grid bottom stack with explicit gaps and safe-area padding; then assert sibling non-overlap and hit ownership.

### DB6-03 — Scene warning localization stops at sentence fragments

- Severity: Low
- Confidence: High
- Classification: Confirmed root cause
- File/region: `src/components/SceneEditor.tsx:346-385`; `src/lib/i18n.ts` locale scene sections
- Root cause: removal/fallback messages call `t(...)`, but detailed adjustment branches interpolate English boundary labels directly. Both visible and live-status consumers reuse the contaminated string.
- Failure scenario: non-English users receive mixed-language corrective feedback.
- Fix: locale-owned full templates for adjusted-start and adjusted-end messages, including punctuation/order.

### DB6-04 — A resolved mock escapes the test's synchronous act boundary

- Severity: Low
- Confidence: High
- Classification: Confirmed test-only root cause
- File/region: `src/components/FileUpload.test.ts:80-104`
- Root cause: the change event is wrapped in synchronous `act`, but the already-resolved parser promise resumes later and updates component state outside that boundary.
- Failure scenario: green test output contains a React lifecycle warning and does not verify settled UI.
- Fix: resolve a deferred parser promise and flush it inside async `act`.

## Rejected hypothesis, sweep, and skips

The same-map stale-style-error hypothesis was rejected after tracing MapLibre abort suppression and local style contents; synthetic `map.fire('error')` would not represent a shipped request. Final debugging sweep covered lifecycle cleanup, listeners/timers, parser budgets, export leases, modal focus, trim state, and map revisions. Established B01-B04/D01-D04 were not duplicated. Static/generated/history exclusions match the security report's explicit accounting.
