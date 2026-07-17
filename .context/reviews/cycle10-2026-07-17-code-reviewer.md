# Cycle 10 code review

Target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`
Role: code reviewer
Date: 2026-07-17

## Result

Three distinct issues survived source tracing, test inspection, historical deduplication, and the final missed-issue sweep: two Medium confirmed correctness defects and one Low likely/manual-validation responsiveness defect. No Critical or High issue was found.

## Inventory and coverage

- Read all 55 paths under `src/`: application code, styles, workers, types, and every colocated unit test. The binary favicon was inventoried as a binary asset.
- Read `e2e/travelback.spec.ts` and all 19 fixtures (20 paths total), including the segmented, elevation, trimming, antimeridian, Google-history, and XML edge-case inputs.
- Inspected all 19 `public/` assets. SVG/CSS/GPX/map-style payloads were read; the font and favicon were treated as binary; the generated parser worker was checked against its source.
- Read all seven `scripts/` files, the Pages workflow, `README.md`, `.gitignore`, and the authored root configs/manifests. `package-lock.json` was dependency-audited; generated `next-env.d.ts` and `tsconfig.tsbuildinfo` were inventoried but excluded from semantic line review.
- Catalogued 774 `.context/` and 39 `plan/` paths, read the current project/development instructions and active review ledger, and searched historical reviews/plans for resolved, deferred, or duplicate reports. Generated/dependency/build trees such as `.git/`, `node_modules/`, `.next/`, and `out/` were excluded.

## Validation evidence

- `npm run check:worker` passed: the committed worker matches its source.
- `npm audit --audit-level=low --json` reported 0 vulnerabilities across the installed lock graph.
- `npm test -- --run` and `npm run lint` could not start because this workspace's existing `node_modules` is incomplete and has no `.bin` entries (exit 127). Direct package-entry attempts also found incomplete package directories. No install or other workspace mutation was made, so these are unavailable gates rather than passing results.

## Findings

### C10-CORE-01 — An active seek is overwritten by the next playback frame

- Severity: Medium
- Confidence: High
- Status: Confirmed by deterministic ref/state trace
- Locations: `src/lib/usePlaybackController.ts:83-92`, `src/lib/usePlaybackController.ts:98-155`; consumers at `src/components/Controls.tsx:45-62`, `src/components/TimelineSelector.tsx:419-428`, `src/components/ElevationProfile.tsx:103-122`, and `src/lib/usePlaybackController.ts:210-219`

`seekTo` updates React state and `progressRef`, but it does not rebase `startProgressRef` or `startTimestampRef`. While playback is active, `animate` continues computing from the pre-seek accumulator base. For example, if playback starts at 0.20 and the user scrubs to 0.80, the next frame calculates approximately `0.20 + elapsed / duration` and visibly snaps the route back near 0.20. The same defect affects the progress range, the elevation chart, timeline click-to-seek, and global arrow-key stepping. A seek before the first scheduled frame is also reset by the `awaitingFirstFrameRef` branch.

Root fix: make active seeking an accumulator rebase. Atomically update the public progress and the active timing base, with explicit handling for the awaiting-first-frame state and endpoint seeks. A fake-RAF hook test should prove that a seek during playback, including one before the first frame, advances from the requested target on later frames instead of the old base. Add one browser regression through a real seek surface while the Pause button is visible.

### C10-CORE-02 — The elevation chart invents a connection across disconnected track segments

- Severity: Medium
- Confidence: High
- Status: Confirmed by deterministic geometry trace
- Locations: `src/lib/interpolate.ts:31-41`, `src/components/ElevationProfile.tsx:23-82`, `src/components/ElevationProfile.tsx:85-98`, `src/components/TrackWorkspace.tsx:157`; missing coverage at `src/components/ElevationProfile.test.ts:4-56` and `e2e/fixtures/segmented-city-hop.gpx:5-12`

`computeCumulativeDistances` correctly gives a segment start the same cumulative distance as the preceding segment end. `ElevationProfile`, however, discards `track.segmentStartIndices` and starts a new SVG run only for a missing elevation. With valid elevations `[10, 20, 100, 110]`, cumulative distances `[0, 10, 10, 20]`, and a segment start at index 2, it emits one path that connects the two middle points at the same x coordinate. The line and filled area therefore depict a zero-distance elevation transition between disconnected places.

Root fix: pass normalized segment boundaries into `buildElevationGeometry` and split the line and area before every segment start, independent of elevation validity. Add a unit case with valid elevations on both sides of a boundary and an end-to-end segmented fixture that includes elevation; the current segmented fixture has no `<ele>` values and only validates distance statistics.

### C10-CORE-03 — Parsed XML track names have no display/announcement bound

- Severity: Low
- Confidence: Medium
- Status: Likely; browser and assistive-technology impact needs manual measurement
- Locations: `src/lib/parse-utils.ts:18-27`, `src/lib/parser.ts:214-230`, `src/app/page.tsx:330-340`, `src/app/page.tsx:636-640`, `src/components/TrackWorkspace.tsx:126-140`

GPX/KML files are capped at 4 MiB, but their `<name>` text is copied without trimming, control-character cleanup, or a name-specific length cap. A valid file can devote almost the whole allowance to the name while retaining two points. That string is then rendered in two title nodes and inserted into a focused polite live region. React escapes it, so this is not XSS, and export filenames are independently sanitized and capped at `src/lib/videoEncoder.ts:282-291`. The remaining risk is local UI/accessibility responsiveness: an imported multi-megabyte name can create large DOM text nodes and an extremely long screen-reader announcement.

Root fix: canonicalize user-facing track names at the parser boundary (blank fallback, control cleanup/whitespace normalization, and a documented Unicode-aware display limit such as 256 code points). Apply one helper to GPX and KML and test blank, control-heavy, and over-limit names. Manually measure the capped and uncapped cases in a browser with the live region enabled.

## Rejected and deduplicated hypotheses

- A proposed stale trim-confirmation modal after ErrorBoundary reset was rejected. `handleErrorReset` empties scenes, and `src/app/page.tsx:486-493` clears `pendingTrimRange` when `scenes.length` becomes zero; the hypothesized persistent modal is not present.
- Existing ledger items for missing unit tests in CI, broad workflow permissions, the missing license, static-host frame-header limitations, and the already measured D01-D04 performance debt were verified as still tracked and were not re-reported.
- Previously fixed camera monotonicity, scene clipping, export focus, marker semantics, timeline endpoint, Korean style-label, selected-region touch, missing-elevation-gap, and import-policy findings were checked against current HEAD and not repeated.

## Final missed-issue sweep

The final pass rechecked parser budgets and abort cleanup, worker message ownership, playback/export state ownership, object-URL cleanup, map/event listener teardown, segmented geometry, scene normalization, modal focus, local-storage fallbacks, static-path containment, workflow permissions, secret patterns, user-controlled rendering, and tests that could encode an incorrect assumption. No fourth reportable issue survived causal tracing and historical deduplication.
