# Cycle 2 Deep Code Review — Code Reviewer

Date: 2026-04-25  
Repo: `/Users/hletrd/flash-shared/Travelback`  
Verdict: **REQUEST CHANGES**

## Coverage

Reviewed every review-relevant source/config/runtime/test file, not a sample.

- Application source: 30 files under `src/`
- Scripts: 6 files under `scripts/`
- E2E tests: `e2e/travelback.spec.ts`
- Config/CI: 9 files (`package*.json`, Next/TS/ESLint/PostCSS/Playwright configs, Pages workflow)
- Runtime public assets: 6 files (`public/workers/trackParser.worker.js`, `public/map-styles/*.json`)
- Fixtures/sample contracts: 18 GPX/KML/JSON/sample files

Excluded as not review-relevant code: historical `.context/` reviews/plans except required conventions, generated `.next/`/`out/`, `node_modules/`, fonts/icons/screenshots/static decorative SVGs.

## Verification Performed

- `git status --short`: only untracked `.context/reviews/_cycle2-started.txt`; no tracked diff.
- `git diff --stat`: empty.
- `npm run lint && npm run typecheck`: passed.
- `npm audit --audit-level=high --omit=dev`: passed, 0 vulnerabilities.
- `npm run smoke:static`: passed against existing `out/`.
- `npm run build`: blocked by existing/stale Next dev lock: `.next/dev/lock` referenced PID `95817`, but no such process was present.
- Static sweep for `console`, empty catches, secrets, dangerous eval/HTML patterns: no hardcoded secrets found. Known inline bootstrap/CSP hardening reviewed.

## Findings

### HIGH — Exported video resolution is wrong on high-DPI displays

File: `src/components/MapView.tsx:494-503`, `src/components/MapView.tsx:577-588`; `src/lib/videoEncoder.ts:90-95`; `src/components/ExportPanel.tsx:398-400`  
Status: **Confirmed**  
Confidence: **High**

Issue: export resizing sets the MapLibre container CSS size to the selected preset, then captures the MapLibre canvas. The map is created without an explicit `pixelRatio`, so MapLibre defaults to `devicePixelRatio`. On a Retina/Mac display (`devicePixelRatio = 2`), selecting 1920×1080 produces a canvas around 3840×2160; 4K can become 8K-class. The UI still labels the output as the selected resolution.

Failure scenario: user selects “YouTube / Landscape (1920×1080)” on a DPR=2 laptop. `resize(1920,1080)` sets CSS size, MapLibre creates a 3840×2160 backing canvas, `CanvasSource(canvas, ...)` encodes that larger canvas, causing wrong output resolution and much higher memory/encode cost.

Suggested fix: during export, store the original MapLibre pixel ratio, call `map.setPixelRatio(1)` before `map.resize()`, and restore the previous/default pixel ratio in cleanup. Alternatively render to an explicit fixed-size export canvas.

---

### MEDIUM — Codec support check validates generic 720p support, not the selected export settings

File: `src/lib/videoEncoder.ts:225-229`; `src/components/ExportPanel.tsx:137-166`  
Status: **Confirmed**  
Confidence: **High**

Issue: `isCodecSupported()` calls `canEncode(codec)` with Mediabunny defaults, not the selected width/height/bitrate/fps. The Export button can be enabled for a codec that is generally supported but unsupported for the chosen 4K/portrait/high-bitrate config.

Failure scenario: browser supports H.264 at default 1280×720 but not 4K portrait at the selected bitrate. The panel enables export, then encoding fails after resize/render setup.

Suggested fix: expose an `isCodecSupportedForConfig(codec, resolution, bitrate, fps)` wrapper using Mediabunny `canEncodeVideo(codec, { width, height, bitrate })`, and re-run it when resolution/quality/codec changes.

---

### MEDIUM — Export can be started concurrently before React disables the button

File: `src/lib/useExportController.ts:64`, `src/lib/useExportController.ts:105-120`; `src/components/ExportPanel.tsx:425`  
Status: **Confirmed**  
Confidence: **High**

Issue: `exportTrack` has no synchronous in-flight guard. `setIsExporting(true)` is asynchronous, so a double click/keyboard activation in the same render window can start two exports. The second overwrites `exportAbortRef`, while both jobs mutate the same map/canvas/playback state.

Failure scenario: user double-clicks “Start Export.” Two encoders run against one MapLibre canvas; cancel controls only the latest controller, and either export can reset map size/playback or revoke URLs unexpectedly.

Suggested fix: add a ref guard at the start of `exportTrack`, e.g. `if (exportAbortRef.current) return`, and clear it only in `finally`.

---

### MEDIUM — Google semantic parser drops fallback path data when `simplifiedRawPath.points` exists but is empty

File: `src/lib/parser.ts:281-301`; duplicate worker path `public/workers/trackParser.worker.js:72-85`  
Status: **Confirmed**  
Confidence: **Medium**

Issue: `parseTimelineObjects()` chooses `simplifiedRawPath.points` whenever the array exists, even if it is empty. It only checks `waypointPath` or start/end fallback in the `else` branch. A valid Google activity segment with an empty simplified path but populated waypoint/start/end data yields no movement points.

Failure scenario: Google export includes `{ simplifiedRawPath: { points: [] }, waypointPath: { waypoints: [...] } }`. Travelback parses zero activity points and may show a too-short route or fail with “too few points.”

Suggested fix: attempt fallbacks when the preferred branch produces no points. Apply the same behavior in the worker parser and add a fixture covering empty preferred arrays.

---

### MEDIUM — Large file parse can complete after the user switches to manual route creation

File: `src/components/FileUpload.tsx:52-60`, `src/components/FileUpload.tsx:262-267`; `src/app/page.tsx:480-514`  
Status: **Likely**  
Confidence: **High**

Issue: `handleFile()` has no mounted/session token guard, and the “Draw a route on the map” action remains enabled while `loading` is true. If a slow parse is running and the user starts manual route creation, the hidden/unmounted upload flow can still call `onTrackLoaded()` later and replace the manual journey state.

Failure scenario: user chooses a large JSON, sees parsing spinner, then clicks “Draw a route.” When worker parsing finishes, `onTrackLoaded(track)` loads the parsed file and exits/overwrites the manual route flow.

Suggested fix: disable alternate entry actions while parsing and track a parse session id or mounted flag so stale parse completions are ignored.

---

### LOW — Static preview server uses lexical path containment and follows symlinks

File: `scripts/serve-static.mjs:99-117`  
Status: **Risk**  
Confidence: **Medium**

Issue: `resolveFile()` checks `path.resolve()` containment before `stat()`, but does not `realpath()` the resolved target. If `out/` contains a symlink to a file outside `out/`, the local preview server can serve it.

Failure scenario: a copied/generated symlink under `out/` points outside the export directory; requesting that path passes lexical containment and streams the symlink target.

Suggested fix: compare `realpath(outDir)` and `realpath(absolutePath)` before serving, or reject symlinks with `lstat()`.

## Missed-Issues Sweep

Final sweep covered parser/worker parity, export flow, map resizing/camera behavior, modal/focus state, timeline slicing, manual journey state, CSP/static serving, config/CI, and test coverage. No CRITICAL issues or hardcoded secrets found.

## Recommendation

**REQUEST CHANGES** due to the high-confidence export-resolution bug and multiple medium state/edge-case issues. Fix the high item before treating export as reliable on common high-DPI devices.
