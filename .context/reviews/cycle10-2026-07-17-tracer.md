# Cycle 10 data-flow tracer review

Target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`
Role: tracer
Date: 2026-07-17

## Result

Three cross-file flows terminate in reportable defects: active seek state loses ownership to a stale RAF base, segment metadata is dropped before elevation geometry, and XML name text reaches duplicated DOM/live-region consumers without a field bound.

## Inventory and trace coverage

The trace covered every one of the 55 `src/` paths and their state/data boundaries; `e2e/travelback.spec.ts` plus all 19 fixtures; all 19 public assets; all seven build/serve/smoke scripts; root manifests/configs/docs; and the Pages workflow. The generated worker was source-checked, dependency metadata was audited, and binary/generated assets were inventoried. All 774 `.context/` and 39 `plan/` paths were catalogued and searched for provenance and prior disposition. Dependency/build trees were excluded.

`npm run check:worker` passed and `npm audit --audit-level=low --json` found zero known vulnerabilities. Unit/lint commands could not launch from the incomplete existing `node_modules`, so no runtime-pass claim is made.

## Traces and findings

### C10-CORE-01 — Seek input → playback state → stale RAF base

- Severity: Medium
- Confidence: High
- Status: Confirmed

Trace:

1. The progress range (`src/components/Controls.tsx:45-62`), timeline selected-region click (`src/components/TimelineSelector.tsx:419-428`), elevation pointer/keys (`src/components/ElevationProfile.tsx:103-122`), and global arrows (`src/lib/usePlaybackController.ts:210-219`) all call `seekTo`/`stepSeek` without first pausing.
2. `seekTo` at `src/lib/usePlaybackController.ts:83-88` writes `progress` and `progressRef` and increments the camera seek nonce.
3. The live RAF at `src/lib/usePlaybackController.ts:122-145` ignores that ref as an origin and computes every later value from `startProgressRef` plus elapsed time from `startTimestampRef`.
4. Because neither origin is rebased, the next frame overwrites the requested target with the old trajectory.

Root fix: define one owner transition for active seek that updates public progress, progress ref, RAF origin, timestamp/first-frame state, and endpoint play state together. Cover each timing phase with fake RAF tests.

### C10-CORE-02 — Parser segment metadata → distance-aware model → metadata-blind elevation SVG

- Severity: Medium
- Confidence: High
- Status: Confirmed

Trace:

1. GPX/KML parsing records disconnected starts in `Track.segmentStartIndices` (`src/lib/parser.ts:183-235`).
2. `computeCumulativeDistances` at `src/lib/interpolate.ts:31-41` consumes those indices and correctly adds zero cross-gap distance.
3. `page.tsx:193-207` retains segment-aware cumulative distances and `TrackWorkspace.tsx:157` passes both the track and those distances to `ElevationProfile`.
4. `ElevationProfile.tsx:89-98` extracts only elevations and calls `buildElevationGeometry(elevations, distances)`. The builder at lines 48-66 splits only on invalid/missing elevations, so the segment metadata dies at this boundary.
5. Equal-distance boundary samples are connected by one SVG line/area, inventing a vertical transition between disconnected segments.

Root fix: carry the boundary indices through the geometry API and start a new run before every boundary sample. Add valid-elevation segmented unit and E2E fixtures.

### C10-CORE-03 — XML bytes → unbounded name → state → DOM/accessibility tree

- Severity: Low
- Confidence: Medium
- Status: Likely; manual impact validation required

Trace:

1. `src/lib/parse-utils.ts:18-27` permits GPX/KML files through 4 MiB.
2. XML preflight limits entities, tags, and depth, but `src/lib/parser.ts:214-230` copies name `textContent` with no field normalization or cap.
3. `src/app/page.tsx:330-340` stores the value in the track session and live-status state.
4. `src/app/page.tsx:636-640` emits it into a focused polite live region, while `src/components/TrackWorkspace.tsx:126-140` emits it into both responsive title nodes.
5. React escaping blocks script execution, but it does not bound DOM/accessibility work.

Root fix: terminate the flow at parsing with a shared bounded display-name helper and test every consumer receives that canonical value.

## Cross-flow non-findings

Export abort and object-URL ownership, parser worker settlement, map event teardown, sample-load generation guards, scene normalization, trim boundary rebuilding, static asset routing, and locale/theme storage all retained a credible owner through their terminal cleanup. The initially suspected ErrorBoundary/trim leak was disproved by `src/app/page.tsx:486-493`.

## Final missed-issue sweep

The closing trace started again from every external input (file, pointer, keyboard, local storage, URL path, worker message, visibility/animation clock) and followed it through state, derived data, DOM/map/export effects, error cleanup, and tests. No additional ownership loss or unsanitized terminal sink met the reporting threshold after deduplication.
