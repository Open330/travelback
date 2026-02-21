# Architecture

## Component Architecture

```
page.tsx (Client Component — state orchestrator)
├── MapView        — MapLibre GL map rendering (forwardRef for canvas access)
├── FileUpload     — File input + drag-and-drop parsing
├── Controls       — Playback UI (play/pause, speed, seek, follow toggle)
└── ExportPanel    — Video export modal with settings
```

## Data Flow

```
File Upload → parser.ts → Track { name, points: TrackPoint[] }
                              ↓
                    page.tsx (state: track, progress, speed, duration)
                              ↓
                    Animation Loop (requestAnimationFrame)
                              ↓
                    interpolate.ts → InterpolationResult { point, bearing, segmentIndex }
                              ↓
                    MapView (update marker, trail, camera)
```

## Key Design Decisions

### Client-Side Only
All processing happens in the browser. No server-side track parsing or video encoding. This means:
- No file size limits from server
- No privacy concerns (tracks never leave the device)
- Works offline after initial page load

### Distance-Based Interpolation
Animation progress is mapped to distance traveled (not point index). This ensures uniform visual speed regardless of point density in the track.

### Canvas Capture for Export
Video export uses `canvas.captureStream()` + `MediaRecorder`. The map is initialized with `canvasContextAttributes: { preserveDrawingBuffer: true }` to enable frame capture from the WebGL context.

### State Architecture
All animation state lives in `page.tsx` as the single source of truth:
- `track` — parsed track data
- `progress` (0–1) — current animation position
- `speed` — playback speed multiplier
- `duration` — total animation length in seconds
- `isPlaying` — animation running state
- `followCamera` — whether camera tracks the marker

A `progressRef` keeps the animation loop in sync without re-triggering effects on every frame.

## Map Layers

| Layer ID | Type | Purpose |
|----------|------|---------|
| `route-line` | line | Full track displayed at low opacity |
| `trail-line` | line | Traveled portion, high opacity, grows with progress |
| Marker | HTML overlay | Pulsing red dot at current interpolated position |
