# Document Specialist — Cycle 5 (2026-04-23)

## Methodology
Reviewed code comments, JSDoc, and documentation for accuracy against implementation. Checked for doc/code mismatches.

## New Findings

### C5-DS1. Worker ERROR_CODE comment says "must match" but no enforcement
- **Severity**: LOW | **Confidence**: HIGH
- **File**: `public/workers/trackParser.worker.js:213`
- **Issue**: The comment says `// Error codes — must match ParseError codes in src/lib/parser.ts` but there's no build-time or runtime enforcement. The worker is a plain JS file that isn't type-checked. If a new error code is added to `parser.ts` but not to the worker (or vice versa), the mismatch would only be caught by manual testing.
- **Impact**: Currently the codes match. Low risk but worth noting for future maintenance.
- **Fix consideration**: Could add a build step that validates worker error codes against the TypeScript definitions, or convert the worker to a TypeScript-compiled file.

### C5-DS2. MAX_MESSAGE_SIZE comment references parser.ts constant
- **Severity**: LOW | **Confidence**: HIGH
- **File**: `public/workers/trackParser.worker.js:209`
- **Issue**: `// Must match JSON_MAX_FILE_SIZE in src/lib/parser.ts` — the worker uses `100 * 1024 * 1024` while parser.ts uses `100 * 1024 * 1024`. They currently match. Same maintenance concern as C5-DS1.

## Doc/Code Match Summary
- JSDoc on `exportVideo` accurately describes the frame-by-frame flow
- `ParseError` class documentation matches usage
- `normalizeScenes` doc comment is accurate
- Bootstrap script in layout.tsx is well-commented
- All i18n translation keys have corresponding code usage (verified by type system)

## Cycle 5 Addendum (2026-04-25)

### C5-DS3. Overview doc overstates `semanticSegments.visit` support
- **Severity**: MEDIUM | **Confidence**: HIGH
- **Files**: `.context/project/01-overview.md:37-44`, `src/lib/parser.ts:329-369`
- **Issue**: The overview says `semanticSegments.visit.topCandidate.placeLocation` has supported variants, but `parseSemanticSegments()` only reads `placeLocation.latLng` as a string. There is no code path for decimal or E7 `placeLocation` objects.
- **Failure scenario**: A Google Takeout phone export that uses a structured `placeLocation` object instead of the current `latLng` string format will load with missing visit points, so the resulting track skips stops and can collapse segment boundaries.
- **Concrete fix**: Either narrow the overview to the exact supported `latLng` string shape, or extend the parser to accept the documented `placeLocation` variants and add a regression fixture for each supported shape.

### C5-DS4. Export docs advertise sizes that the Mediabunny target is not meant to hold in memory
- **Severity**: MEDIUM | **Confidence**: HIGH
- **Files**: `src/types.ts:80-116`, `src/components/ExportPanel.tsx:87-117`, `src/lib/videoEncoder.ts:50-78`
- **Issue**: The UI and shared export limits advertise up to 600 seconds, 120 fps, and 50 Mbps, including 4K presets, but `exportVideo()` writes the entire MP4 into `new BufferTarget()` and finalizes to an in-memory `ArrayBuffer`. Mediabunny's BufferTarget docs describe it as an in-memory target that is not suitable for very large files and recommend `StreamTarget` for that case.
- **Failure scenario**: A user picks a long, high-bitrate export and the browser tab runs out of memory or crashes before finalization, even though the app presents the preset as supported.
- **Concrete fix**: Either qualify/reduce the advertised export envelope so it matches the in-memory target, or switch the large-export path to a streaming/file-backed target and keep `BufferTarget` only for small outputs.

## API Touchpoints Checked
- Next.js static-export/base-path wiring in `next.config.ts` matched the current Next config model: https://nextjs.org/docs/app/api-reference/config/next-config-js
- MapLibre canvas/map usage stayed within the published GL JS API: https://maplibre.org/maplibre-gl-js/docs/API/classes/CanvasSource/
- `@tmcw/togeojson` usage stayed within its GPX/KML-to-GeoJSON contract: https://www.npmjs.com/package/%40tmcw/togeojson
- Mediabunny export target behavior came from the official docs for `BufferTarget` and `StreamTarget`: https://mediabunny.dev/api/BufferTarget and https://mediabunny.dev/api/StreamTarget
