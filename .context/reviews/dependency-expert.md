# Dependency / API Review

Scope reviewed:
- `package.json`, `package-lock.json`
- `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- `src/components/ExportPanel.tsx`, `src/lib/videoEncoder.ts`, `src/lib/parser.ts`
- `src/components/MapView.tsx`, `src/types.ts`, `src/lib/env.ts`
- `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`
- deployment/static scripts and smoke config

Verification performed:
- `npm run build` ✅
- `npm run smoke:static` ✅

## Findings

### D1 - Export pipeline can exhaust browser memory on allowed presets

- **Severity:** High
- **Confidence:** High
- **Files/regions:** `src/lib/videoEncoder.ts:73-86`, `src/components/ExportPanel.tsx:96-136`, `src/types.ts:80-107`
- **Problem:** The export path always uses mediabunny `BufferTarget` plus `Mp4OutputFormat({ fastStart: 'in-memory' })`, while the UI exposes exports up to 4K, 120 fps, 600s, and 50 Mbps. Mediabunny’s own docs say `BufferTarget` is best for small files and that large outputs can crash the page due to memory exhaustion; `fastStart: 'in-memory'` also increases memory pressure during finalization.
- **Concrete failure scenario:** A user selects a large preset such as 4K Landscape, 120 fps, 600 seconds, and a high bitrate. The resulting MP4 can be multiple gigabytes. The browser tab can stall or OOM during encoding/finalization before a file is ever produced, even though the UI allows that configuration.
- **Suggested fix:** Add a pre-flight size/memory budget guard before export, reduce or disable unsafe preset combinations, or switch large exports to a streaming target (`StreamTarget` / file-backed output) instead of buffering the entire MP4 in memory.

### D2 - GPX/KML parsing is narrower than the package/docs imply

- **Severity:** Medium
- **Confidence:** Medium-High
- **Files/regions:** `src/lib/parser.ts:116-121`, `src/lib/parser.ts:124-176`, `.context/project/01-overview.md:12-13`
- **Problem:** GPX/KML parsing is done through the browser’s `DOMParser` and then passed into `@tmcw/togeojson`. The official `@tmcw/togeojson` docs explicitly note that `DOMParser` requires valid XML and recommend `xmldom` because many real-world KML/GPX files are only partially valid. The current code strips DOCTYPE/entities, but it still relies on strict browser XML parsing, so the app’s real compatibility is narrower than the project docs suggest.
- **Concrete failure scenario:** A GPX/KML export from another tool contains a namespace quirk, stray entity, or other well-formedness issue that `DOMParser` rejects. The file is then rejected with `XML_PARSE_ERROR` even though the source data is otherwise useful and `togeojson` can handle it in a more forgiving parser environment.
- **Suggested fix:** Either move XML parsing to a forgiving parser path in a worker (`xmldom`/equivalent) or narrow the documented support contract to “well-formed GPX/KML only” and surface that constraint in the upload UI/error copy.

## Final Sweep Note

I did not find any additional current dependency/API breakage in the Next/React/MapLibre/static-export wiring beyond the two items above. The current production build and static smoke both pass, so the remaining risk is primarily around large export memory usage and parser compatibility boundaries rather than immediate build failure.

## Sources

- https://mediabunny.dev/api/BufferTarget
- https://mediabunny.dev/guide/writing-media-files
- https://mediabunny.dev/guide/output-formats
- https://www.npmjs.com/package/%40tmcw/togeojson
