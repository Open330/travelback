# Debugger Review — latent failure modes

Files reviewed: parser/worker, map lifecycle, playback/export controllers, timeline/filtering UI, static-export runtime, and the main page wiring.

## Findings

### 1) HIGH — Numeric parser helpers silently coerce null/empty values to `0`
**Regions:** `src/lib/parser.ts:19-21, 115-125, 192-200`; `public/workers/trackParser.worker.js:1-4, 40-50, 61-74, 99-111`

**Failure scenario:**
- A GPX trackpoint with a missing `lat`/`lon` attribute, or a Google JSON record with `latitude: null`, `longitude: null`, or `altitude: null`, is parsed as `0` instead of being treated as missing.
- That creates bogus points near `(0,0)` or bogus `0m` elevation and can silently corrupt the route, playback stats, and export.

**Why this happens:**
- `Number(null)` and `Number('')` both return `0`.
- `parseOptionalNumber()` currently accepts any finite numeric coercion, so null/empty fields survive as valid coordinates/elevation.
- `parseGPX()` also calls `Number(point.getAttribute(...))` directly, so missing GPX attributes become `0` too.

**Concrete fix:**
- Treat `null`, `undefined`, and empty strings as missing before numeric coercion.
- Reuse that stricter helper everywhere numeric optional fields are parsed.
- In GPX parsing, switch `lat`/`lon` attribute reads to the same helper instead of raw `Number(...)`.
- Mirror the same guard in `public/workers/trackParser.worker.js` so the production worker and the main-thread fallback stay in sync.

**Confidence:** high

---

### 2) MEDIUM — XML DTD stripping breaks valid GPX/KML files that use internal subsets
**Regions:** `src/lib/parser.ts:98-106`

**Failure scenario:**
- A GPX/KML file that includes a `<!DOCTYPE ... [ ... ]>` internal subset or entity declarations is rewritten into malformed XML before `DOMParser` sees it.
- The parser then throws `XML_PARSE_ERROR` even though the source file is otherwise valid XML.

**Why this happens:**
- `stripXmlEntities()` removes `<!DOCTYPE...>` only up to the first `>`.
- For declarations with an internal subset, that leaves the trailing `]>` behind, corrupting the document.

**Concrete fix:**
- Either reject any XML document containing `<!DOCTYPE` up front, or strip the *entire* DOCTYPE declaration with a parser/state-machine approach that consumes through the closing `]>` when an internal subset is present.
- Keep the XXE hardening, but avoid the current regex that truncates the declaration.

**Confidence:** high

---

### 3) MEDIUM — Map style changes are rehydrated twice, which can double-fit the bounds and cause visible jumps
**Regions:** `src/components/MapView.tsx:605-611, 645-663`

**Failure scenario:**
- After a track is loaded, switching map styles fires both the persistent `map.on('style.load', onGlobalStyleLoad)` handler and the extra `map.once('style.load', styleHandler)` path.
- Both handlers call `addReferenceGridLayers()` and `addTrackLayers()`, so `fitBounds()` and marker re-attachment can run twice.
- The user can see the map snap/jitter on every style cycle, especially when the app is already centered on a loaded route.

**Why this happens:**
- The mount effect keeps a permanent `style.load` listener.
- The style-change effect adds another one-time `style.load` listener for the same event.
- The second handler is redundant because the persistent listener already handles the rehydration.

**Concrete fix:**
- Remove the extra `map.once('style.load', styleHandler)` path from the style-change effect, or replace the mount listener with a single shared handler strategy.
- The goal is one rehydration pass per style load, not two.

**Confidence:** high

---

### 4) HIGH — Export cancellation does not restore the pre-export playback position
**Regions:** `src/lib/useExportController.ts:84-97, 137-206`

**Failure scenario:**
- Start an export while the user is midway through a track, then cancel it.
- The export loop has already driven `setPlaybackProgress()` and `mapHandle.applyCameraState()` through the export timeline.
- When the export aborts, the hook resets export UI state, but it never restores the track to the position the user had before export started.
- The app stays paused at the export’s last rendered frame, which feels like data loss during a cancel/retry flow.

**Why this happens:**
- `pausePlayback()` is called up front, but the hook does not snapshot the current playback progress before export begins.
- The render callback mutates live playback state on every frame.
- The `catch`/`finally` path only resets export bookkeeping; it never rehydrates the old playback position.

**Concrete fix:**
- Snapshot the current playback progress before starting export, and restore it in the abort/error path (or in `finally` if export should be fully non-destructive).
- If you want playback to resume exactly where the user left off, capture the paused/playing state too; otherwise, at minimum restore the old progress so cancel/retry does not leave the UI on an export frame.

**Confidence:** high

## Notes
- I did not change source code; this review note is the only artifact written.
- The most important untested edge cases are malformed numeric fields in parser inputs and export cancellation recovery after the map has already been scrubbed to the export timeline.
