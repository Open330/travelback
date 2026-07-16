# Critic — Cycle 6 (2026-07-17)

Reviewed revision: `1d2755c` on `codex/review-plan-fix-2026-07-16`

## Result

**Two user-visible gaps were confirmed:** one Medium map-recovery defect and one Low import-guide contradiction. These are the same two root causes reported as CR6-01 and DOC6-01; do not double-count the role aliases below.

## Coverage and challenge method

I read every current implementation, unit test, E2E test/fixture, script, configuration, textual public asset, README section, and active context/provenance record. I challenged success claims at state-boundary variants: automatic versus manual camera ownership, ordinary style replacement versus map-generation replacement, scan-first versus prose-first import guidance, current versus legacy Google exports, dev versus static runners, cancellation/timeout paths, and locale/theme changes.

## Findings

### CRIT6-01 — The retry regression proves only the default automatic-camera branch

- Root alias: **CR6-01**
- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed by source and test preconditions**

Evidence:

- Follow defaults on at `src/lib/usePlaybackController.ts:17-23`.
- The retry test at `e2e/travelback.spec.ts:594-705` never toggles it off, so hydration's automatic `jumpTo` at `src/components/MapView.tsx:868-878` masks the replacement map's `[0,20]`/zoom-2 constructor state (`:899-914`).
- For a same-track retry, `preparedTrackRef` prevents the fit flag from being re-armed (`:1072-1077`), while the Retry button changes only the generation nonce (`:1197-1200`).
- This leaves the manual-camera branch with no camera writer after hydration, contrary to the broad “camera is no longer the constructor world view” acceptance in `.context/plans/cycle4-implementation-2026-07-16.md:28-29`.

User scenario: a traveler deliberately turns Follow off to inspect a city, then recovers from a map error. The app appears to recover its route but silently teleports the map to a world view where the trip may not be visible. The unchanged Follow-off control makes that look like data loss rather than an ownership transition.

Fix: preserve and replay the outgoing manual camera across the map-generation transaction, then test the actual error/Retry path with Follow off and a camera distinguishable from both the world view and the automatic route pose.

### CRIT6-02 — The most glanceable legacy Takeout instruction contradicts the corrected copy

- Root alias: **DOC6-01**
- Severity: **Low**
- Confidence: **High**
- Classification: **Confirmed documentation/UI mismatch**

Evidence:

- `public/guide/google-takeout-export.svg:12-26` unconditionally tells the user to select Location History, find `Records.json`, and upload `Records.json`.
- The image is shown in the legacy tab at `src/components/GoogleGuide.tsx:266-270,351-360`.
- The adjacent English contract at `src/lib/i18n.ts:167,182-190,211` correctly says the Takeout fallback may not be offered or complete, accepts `Records.json`, `Timeline Edits.json`, and compatible monthly JSON, and sends users to phone export otherwise.

User scenario: a nontechnical user scans the illustration instead of the smaller prose, cannot find `Records.json`, and concludes their export is unsupported even though another compatible JSON file is present—or spends time trying Takeout after their Timeline has moved on-device.

Fix: update the illustration to say “Legacy only, if Location History is offered” and “upload a compatible JSON file,” with examples matching the localized copy. Avoid embedding a single guaranteed filename in a non-localized image.

## What did not survive challenge

- A stale MapLibre string-style request was not treated as a new race: MapLibre 5.24 aborts and filters the superseded request, shipped styles have no downstream remote resources, and the E2E explicitly releases a stale request without an error or pose mutation.
- Current locale dictionaries have identical key sets and placeholder shapes; no partially translated control branch was confirmed.
- The environment-local `npm ls` report of orphaned optional WASM packages does not prove a tracked lockfile failure and was not elevated to a product finding.
- B01-B04 and D01-D04 were left in their existing blocked/evidence/deferred categories; no new evidence changes their disposition.

## Final missed-issue sweep and skips

The last pass re-challenged import rejection, retry/reload choice, track replacement, playback at zero/nonzero/end progress, follow toggling, creator retry, export cancellation/save fallback, modal/keyboard behavior, compact attribution, and phone/legacy guidance. No third root cause met the threshold.

Of 721 tracked `.context/` files, 21 active/provenance records were read and 700 superseded artifacts skipped; all 39 root `plan/` files were also skipped as historical. The sole binary WOFF2 body and generated lockfile boilerplate were not read as prose, but their integration/metadata were checked. No tracked source, config, script, textual public asset, test, or fixture was skipped.
