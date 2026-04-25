# Performance / Dependency Review — Cycle 1 (2026-04-25)

Scope: current working tree, including uncommitted changes, plus the project rules under `.context/**`.

## Inventory reviewed

### Project rules and context
- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/reviews/perf-reviewer.md`
- `.context/reviews/dependency-expert.md`

### Source / config / toolchain files reviewed
- `package.json`
- `next.config.ts`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`
- `src/app/page.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/TimelineSelector.tsx`
- `src/lib/parser.ts`
- `public/workers/trackParser.worker.js`
- `src/lib/videoEncoder.ts`
- `src/types.ts`
- `e2e/travelback.spec.ts`

## Verification
- `npm run build` ✅
- `npm run smoke:static` ✅

## Findings

### PERF-01 — The export pipeline still permits in-memory MP4s that exceed the documented safe envelope
**Severity:** High  
**Confidence:** High  
**Evidence:** `src/lib/videoEncoder.ts:73-77`, `src/components/ExportPanel.tsx:29-111`, `src/types.ts:80-107`

`exportVideo()` always uses `new BufferTarget()` with `new Mp4OutputFormat({ fastStart: 'in-memory' })`, while the UI still allows exports up to 180s, 60 fps, and 20 Mbps. That combination can produce a theoretical output of about 450 MB before container overhead, which is far beyond Mediabunny’s own guidance that `BufferTarget` is best for small-ish files and that large outputs should use `StreamTarget` instead.

Failure scenario: a user selects a long 4K export with max duration/bitrate. Encoding succeeds for a while, then finalization or `Blob` creation pushes the tab into memory exhaustion and the browser crashes or becomes unresponsive before the file is saved.

Concrete fix: add a hard preflight memory/size guard that rejects unsafe combinations, or switch large exports to `StreamTarget` / file-backed output instead of buffering the full MP4 in memory.

Sources:
- https://mediabunny.dev/guide/writing-media-files
- https://mediabunny.dev/api/StreamTarget
- https://www.npmjs.com/package/mediabunny

### PERF-02 — XML imports are now capped at 1 MB, which is too aggressive for the supported GPX/KML feature set
**Severity:** Medium  
**Confidence:** High  
**Evidence:** `src/lib/parser.ts:544-545`, `src/lib/parser.ts:647-660`, `src/components/FileUpload.tsx:52-86`, `scripts/smoke-static.mjs:188-191`

`XML_MAX_FILE_SIZE` was reduced to 1 MB and `parseTrackFile()` rejects any GPX/KML file above that limit before parsing. The upload UI turns that into a hard failure, so the app now rejects a large class of legitimate GPX/KML exports up front.

Failure scenario: a real-world route export from Garmin, Komoot, AllTrails, or a long GPX from a watch/app lands just above 1 MB. The file is rejected immediately even though it is a valid track file and the project docs still advertise GPX/KML support. That is a compatibility regression, not just a performance tradeoff.

Concrete fix: either raise the XML cap back to a more realistic threshold, or move XML parsing off the main thread so the cap can be relaxed without risking UI freezes. If the 1 MB limit is intentional, surface that constraint in the docs and upload copy explicitly.

### COMPAT-03 — Browser XML parsing is still strict, so slightly malformed GPX/KML can fail even when the data is salvageable
**Severity:** Medium  
**Confidence:** Medium-High  
**Evidence:** `src/lib/parser.ts:158-163`, `src/lib/parser.ts:206-217`

`parseXml()` uses the browser’s `DOMParser` and throws on any `parsererror`. `parseKML()` and `parseGPX()` then hand the document to `@tmcw/togeojson`. The package’s own docs note that real-world XML is often only partially parseable by DOMParser and recommend `@xmldom/xmldom` for more forgiving parsing in non-browser runtimes.

Failure scenario: a GPX or KML export contains a namespace quirk, stray entity, or other XML oddity that a forgiving parser would recover from. This app rejects the file with `XML_PARSE_ERROR`, so a user loses data that the rest of the export could have preserved.

Concrete fix: move GPX/KML parsing to a Worker that uses a more forgiving XML parser, or narrow the documented support contract to “strictly well-formed GPX/KML only” and make that constraint explicit in the UI.

Sources:
- https://www.npmjs.com/package/@tmcw/togeojson
- https://github.com/mapbox/togeojson
- https://github.com/xmldom/xmldom

### PERF-04 — The static preview server still buffers entire files into memory before responding
**Severity:** Low-Medium  
**Confidence:** High  
**Evidence:** `scripts/serve-static.mjs:122-166`

`serve-static.mjs` always calls `readFile()` on the full asset before checking whether the request is `HEAD`, and it uses the same buffering approach for every GET response. That means static preview and smoke runs pay full-file allocation cost even for requests that do not need a body.

Failure scenario: the static preview server serves several assets at once during Playwright or manual smoke testing. Each request allocates the whole file in memory, which is avoidable pressure for large future assets or concurrent requests.

Concrete fix: use `stat()` for `Content-Length`, short-circuit `HEAD` before loading the body, and stream GET responses with `createReadStream()`/`pipeline()` instead of buffering whole files.

## Dependency snapshot

No freshness or license red flags were found in the direct runtime dependencies that matter here:
- `mediabunny` is current and active on npm (v1.13.0, published a day ago, MPL-2.0, ~9.1k weekly downloads).
- `@tmcw/togeojson` is also active (v7.1.2, published 3 months ago, BSD-2-Clause, ~68k weekly downloads).

So the main dependency risk in this tree is not package abandonment; it is how the current code uses those packages (`BufferTarget` for large outputs and strict browser XML parsing for GPX/KML).

Sources:
- https://www.npmjs.com/package/mediabunny
- https://www.npmjs.com/package/%40tmcw/togeojson

## Bottom line

The build and static smoke checks pass, but the tree still has two high-value risk areas:
1. in-memory video export can overrun browser memory on allowed presets, and
2. XML import compatibility is still narrower than the project’s GPX/KML support implies.

The static preview server buffering issue is smaller but still worth fixing because it affects every local preview and smoke run.
