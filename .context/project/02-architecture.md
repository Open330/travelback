# Architecture

## Component Architecture

```
page.tsx (Client Component — state orchestrator)
├── MapView             — MapLibre GL map rendering (forwardRef for canvas/camera access)
├── FileUpload          — File input + drag-and-drop parsing
├── JourneyCreator      — Manual route creation by clicking on map
├── TimelineSelector    — Drag-based time range filter with density histogram
├── Controls            — Playback UI (play/pause, speed, seek, follow toggle)
├── SceneEditor         — Define camera modes per track segment
├── ExportPanel         — Video export settings (resolution, codec, FPS, bitrate)
└── GoogleGuide         — Google Takeout import guide modal
```

## Data Flow

```
File Upload / Journey Creator → parser.ts → Track { name, points: TrackPoint[] }
                                                ↓
                              TimelineSelector (optional filtering)
                                                ↓
                              page.tsx (state: fullTrack, track, progress, scenes, etc.)
                                                ↓
                              Animation Loop (requestAnimationFrame)
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
page.tsx handleExport()
    ↓
MapView.resize(width, height)  →  Resize map to export resolution
    ↓
videoEncoder.ts exportVideo()
    ↓
For each frame:
    1. camera.ts computeCameraForProgress() → CameraState
    2. MapView.applyCameraState()           → Update map view
    3. waitForIdle()                        → Wait for tiles/render
    4. mediabunny CanvasSource.add()        → Capture frame
    ↓
mediabunny Output.finalize() → ArrayBuffer (MP4)
    ↓
downloadVideo() → Browser download
    ↓
MapView.resetSize() → Restore original dimensions
```

## Camera System

### Camera Modes

| Mode | Zoom | Pitch | Bearing | Special |
|------|------|-------|---------|---------|
| Overview | 10 | 45° | Slow rotation (10°/s) | Centers on full track bounding box |
| Flyover | 13 | 55° | Track direction | Standard follow |
| Orbit | 14 | 60° | Fast rotation (36°/s) | Orbits around current position |
| Ground | 15.5 | 70° | Track direction | Low-altitude chase |
| Closeup | 17 | 30° | Track direction | Street-level view |

### Scene System

Scenes divide the animation into segments, each with its own camera mode. Key concepts:
- `startPercent` / `endPercent` (0–1) define the track portion
- Each scene has configurable `CameraParams` (zoom, pitch, bearingOffset, rotationSpeed)
- Transitions use smoothstep blending (`3t² - 2t³`) at scene boundaries
- Default scenes auto-generated if none defined: Opening Overview → Flyover → Orbit → Ground → Closing Overview

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
All processing happens in the browser. No server-side track parsing or video encoding. This means:
- No file size limits from server
- No privacy concerns (tracks never leave the device)
- Works offline after initial page load

### Distance-Based Interpolation
Animation progress is mapped to distance traveled (not point index). This ensures uniform visual speed regardless of point density in the track.

### WebCodecs for Export (mediabunny)
Video export uses WebCodecs API via mediabunny for proper MP4 encoding with H.264/H.265/AV1. This replaces the earlier MediaRecorder approach for better quality and codec control. The map canvas has `preserveDrawingBuffer: true` for frame capture.

### Resize for Export
During export, the map container is resized to the target resolution (e.g., 1920x1080). After export completes, the original size is restored. This ensures pixel-perfect output regardless of viewport size.

### State Architecture
All animation state lives in `page.tsx` as the single source of truth:
- `fullTrack` — original parsed track data
- `track` — filtered subset (after timeline selection)
- `progress` (0–1) — current animation position
- `speed` — playback speed multiplier
- `duration` — total animation length in seconds
- `isPlaying` — animation running state
- `followCamera` — whether camera tracks the marker
- `scenes` — array of Scene definitions for camera behavior

A `progressRef` keeps the animation loop in sync without re-triggering effects on every frame.

## Map Layers

| Layer ID | Type | Purpose |
|----------|------|---------|
| `route-line` | line | Full track displayed at low opacity |
| `trail-line` | line | Traveled portion, high opacity, grows with progress |
| `journey-line` | line | Manual journey creator connecting line |
| `journey-points` | circle | Manual journey creator waypoint markers |
| `journey-points-labels` | symbol | Numbered labels on waypoints |
| Marker | HTML overlay | Pulsing red dot at current interpolated position |
