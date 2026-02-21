# Travelback

Web application to animate GPX, KML, and Google Maps Location History into travel videos.

## Tech Stack

- **Runtime**: Node.js 24 LTS
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript (ESNext target, strict mode)
- **Map**: MapLibre GL JS v5 (open-source, no API key required)
- **Track Parsing**: @tmcw/togeojson (GPX/KML), custom parser (Google Location History JSON)
- **Video Export**: mediabunny (WebCodecs-based MP4 encoding with H.264, H.265, AV1)
- **Map Tiles**: CARTO free vector tiles (Voyager, Positron, Dark Matter)
- **Testing**: Playwright (E2E)

## Build & Run

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```

## Supported Input Formats

1. **GPX** (.gpx) — Standard GPS Exchange Format with tracks, timestamps, elevation
2. **KML** (.kml) — Keyhole Markup Language from Google Earth and similar tools
3. **Google Location History JSON** (.json) — Google Takeout export formats:
   - Legacy format: `{ "locations": [{ "latitudeE7", "longitudeE7", "timestampMs" }] }`
   - New format: `{ "locations": [{ "latitudeE7", "longitudeE7", "timestamp" }] }`
   - Records format: array of location objects
   - Semantic segments format: `{ "semanticSegments": [{ "timelinePath": [...] }] }`

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with SEO/OG metadata and fonts
│   ├── page.tsx                # Main page — orchestrates all state and components
│   └── globals.css             # Tailwind imports, MapLibre CSS, custom animations
├── components/
│   ├── MapView.tsx             # MapLibre GL map with route, trail, marker, scene-based camera
│   ├── FileUpload.tsx          # Drag-and-drop file upload with format detection
│   ├── Controls.tsx            # Playback controls (play/pause, speed, progress, follow)
│   ├── ExportPanel.tsx         # Video export settings (resolution, codec, FPS, bitrate)
│   ├── TimelineSelector.tsx    # Drag-based time range selector with density histogram
│   ├── JourneyCreator.tsx      # Manual route creator (click-to-add waypoints on map)
│   ├── SceneEditor.tsx         # Scene editor panel (camera mode, start/end %, params)
│   └── GoogleGuide.tsx         # Google Takeout import guide modal
├── lib/
│   ├── parser.ts               # GPX/KML/Google JSON parsing to Track
│   ├── interpolate.ts          # Haversine distance, position interpolation, formatting
│   ├── camera.ts               # Camera state computation, scene blending, defaults
│   └── videoEncoder.ts         # WebCodecs MP4 encoding via mediabunny
└── types.ts                    # Shared types (Track, CameraMode, Scene, ExportConfig, etc.)
```

## Features

- **Multi-format support**: GPX, KML, Google Maps Location History (all Takeout variants)
- **Interactive map**: Pan, zoom, rotate with MapLibre GL JS
- **Route visualization**: Full route line + animated trail showing progress
- **Animated marker**: Pulsing dot following the track with camera tracking
- **Timeline selector**: Drag-based time range selection with point density histogram
- **Manual journey creator**: Click-to-add waypoints, drag to reposition, distance display
- **5 camera modes**: Overview, Flyover, Orbit, Ground Follow, Closeup
- **Scene system**: Define cinematic scenes assigning camera modes to track segments
- **Scene blending**: Smooth transitions between scenes with smoothstep interpolation
- **Playback controls**: Play/pause, 6 speed levels (0.5x–16x), seekable progress bar
- **Configurable duration**: 10s to 5min animation length
- **3 map styles**: Voyager (colorful), Positron (light), Dark Matter (dark)
- **Video export**: MP4 via WebCodecs with H.264, H.265/HEVC, AV1 codecs
- **Resolution presets**: YouTube 1080p, TikTok 9:16, Instagram Square/Post, 4K
- **Configurable bitrate**: 1–50 Mbps
- **Google Takeout guide**: Step-by-step import instructions with direct link
- **SEO + Open Graph**: Full metadata for social sharing
- **Responsive UI**: Floating controls with backdrop blur, mobile-friendly
