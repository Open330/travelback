# Architecture

## Component Architecture

```
page.tsx (Client Component — app shell / track-session boundary)
├── usePlaybackController — Animation loop, seek state, keyboard shortcuts
├── useExportController   — Export lifecycle, canvas resize, preview cleanup
├── MapView               — MapLibre GL map rendering (forwardRef for canvas/camera access)
├── FileUpload            — File input + drag-and-drop parsing
├── JourneyCreator        — Manual route creation by clicking on map
├── TrackWorkspace        — Loaded-track UI (trim + scenes + playback chrome)
│   ├── Controls          — Playback controls (play/pause, speed, progress, follow)
│   ├── ElevationProfile  — Elevation chart with gradient shading
│   ├── TimelineSelector  — Drag-based time range selector with density histogram
│   ├── SceneEditor       — Scene editor panel (camera mode, start/end %, params)
│   └── TrackToolbar      — Track-level toolbar (theme, locale, reset)
├── ExportPanel           — Video export settings (resolution, codec, FPS, bitrate)
├── GoogleGuide           — Phone-first travel data import guide (Google, fitness, and GPS apps)
├── Toast                 — Non-intrusive notification toast
└── KeyboardHelp          — Keyboard shortcuts reference overlay
```

## Data Flow

```
File Upload / Journey Creator → parser.ts → Track { name, points: TrackPoint[] }
                                                ↓
                          page.tsx (track-session boundary + modal state)
                                                ↓
                        TrackWorkspace / TimelineSelector (optional trim filtering)
                                                ↓
                               handleRangeChange → filtered track
                                                ↓
                     usePlaybackController (progress, seek, follow, hotkeys)
                                                ↓
                    ┌───────────────────────────────────────────┐
                    │ interpolate.ts → position, bearing        │
                    │ camera.ts → CameraState (per scene)       │
                    └───────────────────────────────────────────┘
                                                ↓
                              MapView (update marker, trail, camera)
```

## Export Pipeline

```
ExportPanel (config: resolution, codec, fps, bitrate, duration)
    ↓
useExportController.exportTrack()
    ↓
MapView.resize(width, height)  →  Resize map to export resolution
    ↓
videoEncoder.ts exportVideo()
    ↓
For each frame:
    1. camera.ts computeCameraForProgress() → CameraState
    2. MapView.renderFrameAndWait()          → Atomically update sources + camera
    3. map.once('render') + triggerRepaint() + rAF → Wait for the WebGL paint
    4. waitForIdle()                         → Confirm map/tile settling
    5. VideoFrame(canvas) → 2D staging canvas → Materialize pixels in CPU-backed storage
    6. VideoSample(staging canvas) → VideoSampleSource.add()
    ↓
mediabunny Output.finalize() with abort/deadline → BufferTarget ArrayBuffer (MP4)
    ↓
downloadVideo() → Browser download
    ↓
MapView.resetSize() → Restore original dimensions
```

Note: `waitForIdle()` is used after resize and again after each painted frame to confirm that map resources have settled before capture. `renderFrameAndWait()` subscribes to MapLibre's `render` event before changing the trail, marker, and camera, explicitly calls `triggerRepaint()` even when the camera is unchanged, and resolves on the following animation frame. A missing render event rejects after five seconds; there is no identical-camera shortcut because source-only changes still need to paint.

### Export / Playback separation

During export, `useExportController` sets `isExporting=true` on MapView. The progress-driven `useEffect` in MapView returns early when `isExporting` is true, preventing React-driven trail/marker/camera updates that would conflict with the export frame loop. Camera updates go exclusively through `renderFrameAndWait`. After export completes (or is cancelled), `isExporting` is set to `false` and the progress effect re-syncs trail and marker state.

### Trail rendering with precomputed segments

At track load time, `precomputeWrappedSegments()` applies antimeridian wrapping once, then `buildTrailChunks()` partitions the route into immutable features of at most 512 coordinates. The complete chunk collection is published once per track/style load. During playback, a binary search finds the last completed chunk, `trail-line` reveals completed chunks with a filter only when a chunk boundary is crossed, and `trail-head-line` republishes only the current bounded chunk plus its interpolated endpoint. Per-frame serialization is therefore bounded by the 512-coordinate chunk budget rather than the total traveled prefix; preprocessing and initial publication remain linear in track size.

### Export cleanup: resetSize

`resetSize()` clears container inline styles (`width`, `height`) before calling `map.resize()`. If `map.resize()` throws (e.g., the map was destroyed during export), the container is already restored to its natural dimensions. This prevents a permanently resized map on cleanup failure.

## Camera System

### Camera Modes

| Mode (internal key) | UI label | Zoom | Pitch | Bearing | Special |
|--------------------|----------|------|-------|---------|---------|
| Overview | Overview | 10 | 45° | Slow rotation (10°/s) | Centers on full track bounding box |
| Flyover | Flyover | 13 | 55° | Track direction | Standard follow |
| Orbit | Spin Around | 14 | 60° | Fast rotation (36°/s) | Orbits around current position |
| Ground | Ground-level Follow | 15.5 | 70° | Track direction | Low-angle route follow (no street imagery) |
| Closeup | Closeup | 17 | 30° | Track direction | Street-level view |
| Bird's Eye | Bird's Eye | 11 | 65° | Look-ahead bearing + drift | High-altitude tilted overview |

### Scene System

Scenes divide the animation into segments, each with its own camera mode. Key concepts:
- `startPercent` / `endPercent` (0–1) define the track portion
- Each scene has configurable `CameraParams` (zoom, pitch, bearingOffset, rotationSpeed)
- Transitions use smoothstep blending (`3t² - 2t³`) at scene boundaries
- With no scenes defined, playback and export use the ordinary follow camera for the full route; no scenes are generated automatically
- The opt-in Cinematic preset creates: Opening Overview → Bird's Eye → Flyover → Orbit Midpoint → Ground-level Follow → Closing Overview

### Camera State

```typescript
interface CameraState {
  center: [number, number]  // [lng, lat]
  zoom: number
  pitch: number
  bearing: number
}
```

## Key Design Decisions

### Local browser processing
All track parsing and video encoding happen in the browser. There is no app-owned server-side upload or processing pipeline. The application and its runtime resources are delivered as same-origin static assets. This means:
- No server-side file upload step for track parsing/export
- Raw track files stay local to the browser runtime
- Journey Creator coordinate jumps are resolved locally and do not use a geocoding service

This local-processing boundary is not an offline-after-first-paint guarantee. Travelback has no service worker or complete precache, and later interactions can still request same-origin resources such as the parser worker, map styles, sample data, and lazy JavaScript chunks. Disconnected use therefore depends on what the browser has already cached.

Privacy/trust-boundary note:
- Local style JSON, palette choices, and layer definitions are bundled with the app, so normal route display no longer needs any third-party map requests. The bundled themes are abstract/local backdrops rather than full road/city basemaps.
- Journey Creator includes a local-only coordinate jump tool that accepts pasted coordinates or coordinate-bearing links without geocoding.
- Users with strict privacy requirements can keep route planning fully local by clicking on the map or pasting coordinates.

Security hardening note:
- The app ships with a CSP and blocks `object-src`, `base-uri`, and inline script attributes by default
- Static exports are post-processed to replace the development `unsafe-inline` placeholder with hash-based `script-src` directives for the emitted inline Next.js bootstrap scripts
- Inline style attributes are isolated to `style-src-attr 'unsafe-inline'`; `style-src` and `style-src-elem` stay restricted to `'self'` so stylesheet loading does not regress to broad inline-style allowance.
- The static bundle rejects framed execution in the early bootstrap path. Production deployments on hosts/CDNs that support response headers should still send host-level anti-framing headers (`frame-ancestors 'none'` and/or `X-Frame-Options: DENY`) because meta CSP alone cannot enforce that control.
- As of cycle r4 (2026-04-23), the meta CSP no longer advertises `frame-ancestors 'none'` because Chromium/Firefox emit a console error when that directive is delivered via `<meta>` (it is header-only per the CSP spec). GitHub Pages cannot attach custom anti-framing headers for this static app, so the Pages deployment relies on the JS frame-buster unless it is fronted by a header-capable CDN. `scripts/smoke-static.mjs` has a regression guard that fails the build if `frame-ancestors` reappears in the emitted meta CSP.
- As of cycle r5 (2026-04-23), the Scene Editor and Journey Creator panels carry `role="region"` with `aria-labelledby` wired to their existing headings, so screen-reader landmark navigation can reach them alongside the `<main>` root added in cycle r4. `scripts/smoke-static.mjs` also asserts `object-src 'none'` and `base-uri 'none'` in the emitted CSP to guard the pinned directives in `scripts/harden-static-export.mjs`.

### Distance-Based Interpolation
Animation progress is mapped to distance traveled (not point index). This ensures uniform visual speed regardless of point density in the track.

### WebCodecs for Export (mediabunny)
Video export uses WebCodecs API via mediabunny for proper MP4 encoding with H.264/H.265/AV1. This replaces the earlier MediaRecorder approach for better quality and codec control. The map canvas has `preserveDrawingBuffer: true` for frame capture.

### Resize for Export
During export, the map container is resized to the target resolution (e.g., 1920x1080). After export completes, the original size is restored. This ensures pixel-perfect output regardless of viewport size.

### State Architecture
`page.tsx` still owns the high-level session boundary, but the most error-prone sub-concerns are now isolated:
- `fullTrack` / `track` / `trackSessionKey` — track-session boundary and trim lifecycle
- `scenes`, `transitionDuration`, `showSceneEditor` — scene authoring state
- `showExport`, `showGoogleGuide`, `isCreatingJourney`, `showKeyboardHelp` — modal / panel orchestration
- `usePlaybackController` — `progress`, `isPlaying`, `speed`, `duration`, `followCamera`, `seekNonce`, RAF loop, hotkeys
- `useExportController` — export progress/state, abort handling, blob URL cleanup, map resize / idle waiting

`loadTrackIntoSession()` and `startFreshJourneySession()` centralize the reset paths that previously tended to drift.

## Map Layers

| Layer ID | Source | Type | Purpose |
|----------|--------|------|---------|
| `reference-grid-minor` | `reference-grid` | line | Fine local reference grid |
| `reference-grid-major` | `reference-grid` | line | Emphasized major reference grid |
| `route-line` | `route` | line | Full track displayed at low opacity |
| `trail-line` | `trail` | line | Immutable completed trail chunks revealed by filter |
| `trail-head-line` | `trail-head` | line | Bounded active chunk and interpolated trail endpoint |
| `journey-line` | `journey-line` | line | Manual journey creator connecting line |
| `journey-points` | `journey-points` | circle | Manual journey creator waypoint markers |
| `current-position-layer` | `current-position` | circle | Canvas-rendered current position included in exports |
| Marker | HTML overlay | DOM | Pulsing current-position marker used during interactive playback |
