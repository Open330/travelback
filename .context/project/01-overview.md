# Travelback

Web application to animate GPX, KML, and Google Maps Location History into travel videos.

## Tech Stack

- **Runtime**: Node.js 24 LTS
- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript (ESNext target, strict mode)
- **Map**: MapLibre GL JS v5 (open-source, no API key required)
- **Track Parsing**: @tmcw/togeojson (GPX/KML), custom parser (Google Location History JSON)
- **Video Export**: MediaRecorder API + Canvas captureStream
- **Map Tiles**: CARTO free vector tiles (Voyager, Positron, Dark Matter)

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
│   ├── layout.tsx          # Root layout with metadata and fonts
│   ├── page.tsx            # Main page — orchestrates all state and components
│   └── globals.css         # Tailwind imports, MapLibre CSS, custom animations
├── components/
│   ├── MapView.tsx         # MapLibre GL map with route, trail, marker, camera
│   ├── FileUpload.tsx      # Drag-and-drop file upload with format detection
│   ├── Controls.tsx        # Playback controls (play/pause, speed, progress, follow)
│   └── ExportPanel.tsx     # Video export settings and recording UI
├── lib/
│   ├── parser.ts           # GPX/KML/Google JSON parsing to Track
│   └── interpolate.ts      # Haversine distance, position interpolation, formatting
└── types.ts                # Shared TypeScript types (Track, TrackPoint, MapStyleKey)
```

## Features

- **Multi-format support**: GPX, KML, Google Maps Location History (all Takeout variants)
- **Interactive map**: Pan, zoom, rotate with MapLibre GL JS
- **Route visualization**: Full route line + animated trail showing progress
- **Animated marker**: Pulsing dot following the track with camera tracking
- **Playback controls**: Play/pause, 6 speed levels (0.5x–16x), seekable progress bar
- **Configurable duration**: 10s to 5min animation length
- **Camera modes**: Follow mode (pitch + bearing) or free navigation
- **3 map styles**: Voyager (colorful), Positron (light), Dark Matter (dark)
- **Video export**: WebM recording at 24/30/60 FPS via MediaRecorder API
- **Responsive UI**: Floating controls with backdrop blur, mobile-friendly
