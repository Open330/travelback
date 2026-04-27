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
├── GoogleGuide           — Google Takeout import guide modal
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
    2. MapView.renderFrameAndWait()          → Update map view + wait for render event
    3. map.once('render') + rAF              → Ensure WebGL canvas is painted
    4. mediabunny CanvasSource.add()         → Capture frame
    ↓
mediabunny Output.finalize() → ArrayBuffer (MP4)
    ↓
downloadVideo() → Browser download
    ↓
MapView.resetSize() → Restore original dimensions
```

Note: `waitForIdle()` is still used for initial map settling after resize (before the frame loop starts). The per-frame capture uses `renderFrameAndWait()` instead, which waits for MapLibre's `render` event with a 5-second timeout fallback.

## Camera System

### Camera Modes

| Mode (internal key) | UI label | Zoom | Pitch | Bearing | Special |
|--------------------|----------|------|-------|---------|---------|
| Overview | Overview | 10 | 45° | Slow rotation (10°/s) | Centers on full track bounding box |
| Flyover | Flyover | 13 | 55° | Track direction | Standard follow |
| Orbit | Spin Around | 14 | 60° | Fast rotation (36°/s) | Orbits around current position |
| Ground | Street View | 15.5 | 70° | Track direction | Low-altitude chase |
| Closeup | Closeup | 17 | 30° | Track direction | Street-level view |
| Bird's Eye | Bird's Eye | 11 | 65° | Look-ahead bearing + drift | High-altitude tilted overview |

### Scene System

Scenes divide the animation into segments, each with its own camera mode. Key concepts:
- `startPercent` / `endPercent` (0–1) define the track portion
- Each scene has configurable `CameraParams` (zoom, pitch, bearingOffset, rotationSpeed)
- Transitions use smoothstep blending (`3t² - 2t³`) at scene boundaries
- Default scenes auto-generated if none defined: Opening Overview → Bird's Eye → Flyover → Orbit Midpoint → Ground Follow → Closing Overview

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

### Client-Side Only
All track parsing and video encoding happen in the browser. There is no app-owned server-side upload or processing pipeline. This means:
- No server-side file upload step for track parsing/export
- Raw track files stay local to the browser runtime
- Works offline after initial page load, including Journey Creator coordinate jumps

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

| Layer ID | Type | Purpose |
|----------|------|---------|
| `route-line` | line | Full track displayed at low opacity |
| `trail-line` | line | Traveled portion, high opacity, grows with progress |
| `journey-line` | line | Manual journey creator connecting line |
| `journey-points` | circle | Manual journey creator waypoint markers |
| Marker | HTML overlay | Pulsing red dot at current interpolated position |
