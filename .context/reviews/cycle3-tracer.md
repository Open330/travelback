# Cycle 3 — Tracer

Reviewed current HEAD `3b6750f` by following user events and data across component, controller, algorithm, MapLibre, and export boundaries. The final trace sweep covered import/session replacement, trim/scene invalidation, playback/hotkeys, map style reload, journey creation, segmented rendering/camera, export start/frame/finalize/download/cancel, modal focus, locale/theme persistence, worker fallback, and error recovery.

## Confirmed traces

### C3-TR-01 — Outside-map waypoint release

1. Layer `mousedown` calls `startDrag()` (`src/components/JourneyCreator.tsx:408-415`).
2. `startDrag()` stores the index and disables `map.dragPan` (`src/components/JourneyCreator.tsx:358-364`).
3. Movement mutates the referenced waypoint and republishes both map sources/UI state (`src/components/JourneyCreator.tsx:366-375`).
4. Normal settlement exists only on public map `mouseup` (`src/components/JourneyCreator.tsx:391-395`). An outside-canvas release is routed by MapLibre's document handler to its internal window-handler name, not that public event.
5. No settlement runs: the index remains live and pan remains disabled until style/component cleanup (`src/components/JourneyCreator.tsx:444-460`). Returning to the canvas continues step 3.

Result: **Confirmed, Medium severity / High confidence** (dedupe with C3-CR-01).

### C3-TR-02 — Cancelled timeline drag contaminates the next gesture

1. A handle/region stores its type, origin coordinate, and origin ratios (`src/components/TimelineSelector.tsx:368-381`).
2. Global move events schedule a rAF and update local ratio refs/state (`src/components/TimelineSelector.tsx:291-347`, `src/components/TimelineSelector.tsx:413-424`).
3. Only `mouseup`/`touchend` call `endDrag()`, which clears the transaction and may notify the page (`src/components/TimelineSelector.tsx:383-411`).
4. `touchcancel` and window blur have no handler (`src/components/TimelineSelector.tsx:413-435`), so cancellation leaves `dragging` non-null.
5. Because listeners are permanently global, a later unrelated move reuses the stale origin; its end event executes step 3 and can commit the unintended range into `page.tsx`'s trim/export reset flow.

Result: **Confirmed, Low severity / High confidence** (dedupe with C3-CR-02). The same trace also establishes idle-rAF finding C3-PR-01: step 2 schedules before checking whether step 1 ever occurred.

### C3-TR-03 — Segment gap becomes a camera bearing edge

1. Parser output carries `segmentStartIndices`; cumulative distance assigns zero length to the previous-to-new-segment edge (`src/lib/interpolate.ts:31-40`).
2. Geometry consumers split the route at those indices, so no visual connector is published (`src/lib/map-geometry.ts:23-57`).
3. Interpolation reports a point/segment and global distance progress (`src/lib/interpolate.ts:90-174`).
4. Default follow searches the global cumulative array 600 m ahead and can land beyond the zero-distance plateau (`src/components/MapView.tsx:945-958`). Bird's-eye independently interpolates at global progress + 0.05 (`src/lib/camera.ts:274-288`).
5. Both compute a bearing from the current segment toward the disconnected later segment, contradicting step 2.

Result: **Confirmed, Medium severity / High confidence** (dedupe with C3-CT-01).

### C3-TR-04 — Probe success does not imply encoder-configuration success

1. Opening Export probes each codec and stores a codec-only boolean (`src/components/ExportPanel.tsx:144-167`).
2. That boolean gates Start Export (`src/components/ExportPanel.tsx:96-114`, `src/components/ExportPanel.tsx:169-173`).
3. The probe calls generic Mediabunny `canEncode(codec)` (`src/lib/videoEncoder.ts:363-368`), which does not receive the selected dimensions/bitrate.
4. The actual job later creates `VideoSampleSource` with bitrate and discovers dimensions from the selected-resolution frame pipeline (`src/lib/videoEncoder.ts:182-217`, `src/lib/videoEncoder.ts:249-266`).
5. A browser may accept step 3's defaults and reject step 4's configuration, so the gated operation fails after it has begun.

Result: **Confirmed, Medium severity / High confidence** (dedupe with C3-CR-03/C3-AR-02).

### C3-TR-05 — Malformed Google array members bypass the parser's shape contract

1. `JSON.parse` returns runtime `unknown`, but the dispatcher casts recognized arrays to object-array types (`src/lib/googleJsonParser.ts:317-367`).
2. `parseRecords` and the four other format walkers immediately read properties from each entry (`src/lib/googleJsonParser.ts:60-73`, `src/lib/googleJsonParser.ts:80-100`, `src/lib/googleJsonParser.ts:128-170`).
3. A `null` entry therefore throws before later valid observations can be retained. The worker catches it only at its outer boundary and converts it to generic `INVALID_GOOGLE_JSON` (`src/workers/trackParser.worker.ts:38-45`).
4. Non-null wrong types take another path: `parseOptionalNumber` calls `Number(value)`, turning booleans/arrays into finite coordinates (`src/lib/parse-utils.ts:32-38`).
5. The result is either whole-import rejection or silent false points, depending only on JavaScript coercibility rather than the documented Google schemas.

Result: **Confirmed, Medium severity / High confidence** (dedupe with C3-CR-04).

### C3-TR-06 — Final cumulative plateau hides the final point

1. A segment start adds zero to cumulative distance (`src/lib/interpolate.ts:31-40`). For path `[A,B]` plus singleton final segment `[C]`, distances are `[0,d,d]`.
2. At progress `1`, the binary search advances to index 1; the next edge has length zero, so interpolation uses `t = 0` and returns `B` (`src/lib/interpolate.ts:128-154`).
3. For a fully zero-distance track, the earlier guard returns `points[0]` for every progress, including 1 (`src/lib/interpolate.ts:115-126`).
4. MapView uses that result for both live and imperative export marker/trail publication (`src/components/MapView.tsx:452-470`, `src/components/MapView.tsx:925-933`), while camera computation shares the same interpolator.
5. The imported final point remains in the track and point count but is unreachable by playback/export.

Result: **Confirmed, Medium severity / High confidence** (dedupe with C3-CR-05/C3-CT-02).

## Clean traces

No additional stuck transaction was found in sample-vs-import generation handling, file parser cancellation, SceneEditor pointer cancellation, export abort/finalize cleanup, map render waits, modal stack/focus cleanup, style listener teardown, object-URL revocation, or locale/theme persistence. Security-specific tracing produced zero new findings.
