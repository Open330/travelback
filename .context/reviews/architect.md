# Architect Review — review-plan-fix cycle 1/100 Prompt 1

**Reviewer:** architect
**Repository:** `/Users/hletrd/flash-shared/Travelback`
**Date:** 2026-04-24
**Scope:** app shell, composition root, map/rendering layer, parser + worker boundary, playback/export hooks, video encoder, static-export scripts/configs, and E2E harness.

## Findings

### 1. TimelineSelector mixes full-track points with filtered-track distances

- **Severity:** High
- **Confidence:** High
- **Evidence:** `src/app/page.tsx:97-100` computes `cumulativeDistances` from `track`, which becomes the filtered slice; `src/app/page.tsx:410-415` passes both `fullTrack` and that filtered-distance array into `TrackWorkspace`; `src/components/TrackWorkspace.tsx:125-131` passes `track={fullTrack}` and `cumulativeDistances` into `TimelineSelector`; `src/components/TimelineSelector.tsx:97-140` assumes the point array and cumulative-distance array describe the same coordinate space.
- **Failure scenario:** After the user trims a route, `handleRangeChange` sets `track` to a slice. The selector still renders against `fullTrack`, but its distance array now belongs to the slice, so subsequent trims and histogram buckets can jump to wrong indexes or collapse distance mapping.
- **Suggested fix:** Maintain separate `fullTrackCumulativeDistances` for the timeline selector and active-track distances for map/playback/elevation/export.

### 2. Google parser corrupts segment boundaries after global sort

- **Severity:** High
- **Confidence:** High
- **Evidence:** Segment starts are recorded while parsing insertion-order objects in `src/lib/parser.ts:207-248` and `src/lib/parser.ts:269-312`; points are then deduplicated and globally sorted by timestamp in `src/lib/parser.ts:391-410`; segment starts are remapped from original point order to sorted indexes in `src/lib/parser.ts:412-428`. The worker duplicates the same shape in `public/workers/trackParser.worker.js:54-87`, `99-135`, and `170-205`.
- **Failure scenario:** Google semantic exports with out-of-order segments, visits, or mixed formats can have segment boundaries that no longer align with contiguous point groups. `computeCumulativeDistances` can then skip or connect the wrong legs, affecting playback, camera, route geometry, and distance totals.
- **Suggested fix:** Parse into logical segments, dedupe within/between segments, sort whole segments by segment start time, then flatten and derive `segmentStartIndices` after final ordering.

### 3. Worker interface duplicates parser logic and defeats memory isolation

- **Severity:** Medium-High
- **Confidence:** High
- **Evidence:** Main Google parsing lives in `src/lib/parser.ts:346-429`; the worker has a separate implementation in `public/workers/trackParser.worker.js:137-205`; constants must manually match in `src/lib/parser.ts:432-433` and `public/workers/trackParser.worker.js:208-219`; the main thread decodes a full `textCopy` before transfer in `src/lib/parser.ts:445-454` and the worker decodes again at `public/workers/trackParser.worker.js:265-268`.
- **Failure scenario:** A 100 MB JSON import allocates/decodes on the main thread before worker parsing starts, causing UI freezes or memory pressure. Parser fixes can also drift between TS and public JS copies.
- **Suggested fix:** Generate the worker from shared parser code or move Google parsing into a shared worker bundle. Avoid full pre-transfer text copies for large inputs.

### 4. Export pipeline discards encoded video on save-picker cancellation

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** Encoding completes before `downloadVideo` in `src/lib/useExportController.ts:137-156`; if `downloadVideo` returns `saved: false`, the controller throws `AbortError` before storing the blob/url in `src/lib/useExportController.ts:157-164`; `downloadVideo` returns `saved: false` for picker cancellation in `src/lib/videoEncoder.ts:173-187`.
- **Failure scenario:** A user waits through a long render, cancels the native save dialog, and the app treats the whole export as cancelled with no preview, retained blob, or retry path.
- **Suggested fix:** Retain the encoded blob/object URL immediately after encoding and treat picker cancellation as an unsaved-but-complete export, not as a lost export.

### 5. JourneyCreator adds symbol text over glyphless static map styles

- **Severity:** Medium
- **Confidence:** High
- **Evidence:** Bundled map styles omit glyph/sprite URLs (for example `public/map-styles/voyager.json:1-28`); static smoke checks forbid style-level symbol layers requiring external glyph/sprite assets in `scripts/smoke-static.mjs:122-145`; `JourneyCreator` adds a runtime `symbol` layer with `text-field` in `src/components/JourneyCreator.tsx:208-222`.
- **Failure scenario:** Journey waypoint labels can fail to render or emit MapLibre glyph warnings/errors under the same static-export constraints the repo otherwise enforces.
- **Suggested fix:** Replace the symbol label layer with DOM/HTML markers or bundle local glyphs and update style/CSP/smoke tests consistently.

## Final sweep

The most important cross-file issue is state ownership: full-track controls must use full-track derived data, while playback/export/map surfaces must use the active filtered track. The parser and export findings are adjacent architectural risks because they cross worker/runtime and user-visible output boundaries.
