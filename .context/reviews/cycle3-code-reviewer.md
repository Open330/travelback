# Cycle 3 — Code Reviewer

Reviewed current HEAD `3b6750f` on 2026-07-16. This was a read-only review: no implementation, deployment, commit, or push was performed.

## Scope

The review inventoried and traced the complete application surface: `src/app`, every component, parser/worker code, interpolation/camera/map geometry and rendering, playback/export controllers, video encoding, localization, types and environment helpers; all unit tests and the full Playwright suite/fixtures; build/static-server/hardening/smoke scripts; root TypeScript/ESLint/Next/Vitest/Playwright/package configuration; the Pages workflow; bundled styles/assets/worker; README; and current `.context` architecture, plans, and aggregate reviews. A final filename and suspicious-API sweep found no missed implementation surface. Known cycle-2 carryovers are not recounted below.

## Findings

### C3-CR-01 — Waypoint drag never settles when mouseup occurs outside the map

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/components/JourneyCreator.tsx:358-395`, `src/components/JourneyCreator.tsx:408-416`, `src/components/JourneyCreator.tsx:444-460`
- The drag begins by setting `draggingIndexRef` and disabling `map.dragPan`, but its only ordinary mouse settlement is a MapLibre `map.on('mouseup', ...)` listener. In the installed MapLibre 5.24 handler, an element `mouseup` becomes the public map `mouseup`, while the owner-document listener is routed internally as `mouseupWindow`; the custom map listener therefore does not receive an outside-canvas release.
- Failure scenario: drag a waypoint, move over the Journey Creator panel or outside the canvas, and release. `draggingIndexRef` remains set and panning remains disabled. Returning the pointer to the map keeps moving the waypoint without a pressed button. Undo/Clear can further operate while this stale drag still owns the map.
- Required fix: use pointer capture or explicit owner-document/window `pointerup`/`mouseup`, `pointercancel`, and `blur` listeners. Route every finish/cancel path through one idempotent settlement function that removes transient listeners, clears drag refs, restores the cursor, and re-enables `dragPan`. Add an outside-canvas release regression test.

### C3-CR-02 — Timeline drag cancellation leaves a live transaction behind

- Severity: **Low**
- Confidence: **High**
- Evidence: `src/components/TimelineSelector.tsx:368-411`, `src/components/TimelineSelector.tsx:413-435`
- The global drag protocol handles only `mouseup` and `touchend`. It has no `touchcancel`, pointer-capture loss, or window-blur cancellation path, even though `dragState.current.dragging` is cleared only by `endDrag()`.
- Failure scenario: the OS/browser cancels a touch drag, or the window loses focus during a mouse drag. The next unrelated global move is interpreted against the stale timeline origin; the next global end event can commit that accidental trim and reset playback/export state.
- Required fix: consolidate on Pointer Events and pointer capture, or at minimum add `touchcancel` and `blur` cleanup. Cancellation should cancel the pending rAF, clear all transient refs, and either restore the pre-gesture ratios or intentionally commit a documented final value. Cover cancel, blur, and the next unrelated gesture.

### C3-CR-03 — Codec availability is probed without the configuration that will be encoded

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/components/ExportPanel.tsx:94-114`, `src/components/ExportPanel.tsx:144-173`, `src/lib/videoEncoder.ts:162-177`, `src/lib/videoEncoder.ts:205-217`, `src/lib/videoEncoder.ts:363-368`
- `ExportPanel` enables export from `isCodecSupported(codec)`, but that helper calls Mediabunny `canEncode(codec)` with no width, height, or bitrate. The actual job later uses the selected preset dimensions and bitrate. The installed Mediabunny API exposes `canEncodeVideo(codec, { width, height, bitrate })`; its generic probe uses defaults instead.
- Failure scenario: a browser reports that H.264/HEVC/AV1 is generally available at the probe defaults but rejects the selected portrait/high-resolution/high-bitrate encoder configuration. The UI enables Start Export and then fails only after entering the export pipeline.
- Required fix: make capability probing accept the selected resolution and bitrate and call `canEncodeVideo` with the same values used by `VideoSampleSource`. Re-probe/cache by configuration, and retain a defensive encoder-start error. Test a codec that is generally supported but rejects the selected dimensions.

### C3-CR-04 — Google JSON arrays trust compile-time object types at runtime

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/lib/googleJsonParser.ts:60-73`, `src/lib/googleJsonParser.ts:80-100`, `src/lib/googleJsonParser.ts:128-139`, `src/lib/googleJsonParser.ts:156-170`, `src/lib/googleJsonParser.ts:347-367`, `src/lib/parse-utils.ts:32-38`
- JSON arrays are cast to `Record<string, unknown>[]`, then their entries are dereferenced without verifying that each entry is a non-null object. The same assumption exists for nested point arrays. Separately, `parseOptionalNumber` applies `Number(value)` to every non-string/non-number value, so `true` becomes `1` and `[]` becomes `0`.
- Reproduction: `parseGoogleLocationHistory('{"locations":[null,{"latitudeE7":374000000,"longitudeE7":1270000000}]}')` dereferences `null`. Null entries in `timelineObjects`, `simplifiedRawPath.points`, `timelineEdits`, `semanticSegments`, or `timelinePath` hit equivalent paths. Two malformed records containing boolean/array coordinates can instead be accepted as a route around coordinates `0`/`1`.
- Failure scenario: one malformed/null observation rejects an otherwise usable Google export through a generic worker parse error; coercible malformed fields silently create false locations and can distort bounds, distance, camera, and export output.
- Required fix: validate every outer and nested array entry as a non-null object before property access. Make optional numeric parsing accept only finite numbers and intentionally supported numeric strings, never booleans/arrays/objects. Skip invalid observations or return a stable `ParseError` according to one documented policy, and cover direct plus generated-worker paths.

### C3-CR-05 — Distance interpolation cannot reach zero-length final segments

- Severity: **Medium**
- Confidence: **High**
- Evidence: `src/lib/interpolate.ts:31-40`, `src/lib/interpolate.ts:90-145`, `src/components/MapView.tsx:452-470`, `src/components/MapView.tsx:925-933`
- A segment break creates a cumulative-distance plateau. If total distance is zero, interpolation returns the first point for every progress value. If a non-zero route is followed by a singleton segment, progress `1` selects the zero-length edge immediately before that singleton and returns its left endpoint.
- Reproduction: points `[A,B]` with cumulative distances `[0,0]` return `A` at progress `1`; `[A,B,C]` with `[0,d,d]` return `B`, never trailing singleton `C`. The shipped semantic Google fixture shape (timeline path followed by a visit) can produce exactly the latter structure.
- Failure scenario: playback and every exported frame can finish at the end of the prior path rather than the user's final visit, potentially in another city. All-zero segmented tracks never leave their first point.
- Required fix: define endpoint and plateau semantics explicitly. At clamped progress `1`, return the final track point; for all-zero tracks, use a deterministic index/time fallback so progress can traverse distinct singleton observations. Preserve segment-local bearing and add zero-total plus trailing-singleton tests through interpolation, MapView, and camera/export consumers.

## Validation

`npm run lint`, `npm run typecheck`, and `npm test` completed successfully (14 files, 295 tests). Existing unit/E2E coverage does not exercise outside-map waypoint release, timeline cancellation/blur, configuration-specific codec rejection, null array members/scalar coercion, or segmented zero-distance endpoints.
