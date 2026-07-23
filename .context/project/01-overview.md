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
- **Map Assets**: Fully local bundled map themes with no runtime dependency on external tiles, glyphs, or sprites once the static bundle is built
- **Testing**: Vitest (unit/component), Playwright (E2E)

## Build, Run & Verify

```bash
npm install
npm run dev      # Development server
npm run build    # Static production build into ./out
npm run start    # Static preview server for ./out at /travelback
npm run lint     # ESLint
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:static
```

The supervised `test:e2e` and `test:e2e:static` workflows currently require POSIX process semantics. On Windows, they refuse before launching the target unless an atomic Windows Job Object containment provider is supplied. The lower-level `test:e2e:dev` entry bypasses that supervision and is not a cleanup-safe substitute.

Deployment note:
- The static bundle ships a client-side frame-busting fallback. Hosts/CDNs that support response headers should also send `Content-Security-Policy: frame-ancestors 'none'` and/or `X-Frame-Options: DENY`; GitHub Pages cannot attach those custom headers, so the Pages deployment relies on the JS fallback unless it is fronted by a header-capable CDN.
- Production builds default to the GitHub Pages mount path `/travelback`. Set `TRAVELBACK_BASE_PATH` for another mount path and use the same value when serving `out/` with `scripts/serve-static.mjs`.

## Supported Input Formats

1. **GPX** (.gpx) — Standard GPS Exchange Format with tracks, timestamps, elevation; current browser-side XML parsing is capped at 4 MB to avoid UI freezes
2. **KML** (.kml) — Keyhole Markup Language from Google Earth and similar tools; browser parsing depends on `DOMParser` plus `@tmcw/togeojson`, so malformed XML, unsupported KML extensions, or files above the 4 MB XML safety cap may be rejected
3. **Google Timeline JSON** (.json) — known compatible shapes from current device exports and legacy Google Takeout archives:
   - Legacy format: `{ "locations": [{ "latitudeE7", "longitudeE7", "timestampMs" }] }`
   - New format: `{ "locations": [{ "latitudeE7", "longitudeE7", "timestamp" }] }`
   - Records format: array of location objects
   - Semantic Location History: `{ "timelineObjects": [{ "activitySegment" | "placeVisit" }] }`
   - Timeline Edits: `{ "timelineEdits": [{ "rawSignal": { "signal": { "position": {...} } } }] }`
   - Semantic segments format: `{ "semanticSegments": [{ "timelinePath": [...] }] }`
   - `semanticSegments.visit.topCandidate.placeLocation.latLng` string points

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with SEO/OG metadata and fonts
│   ├── page.tsx                # App shell — track-session boundary, modal wiring, map integration
│   └── globals.css             # Tailwind imports, MapLibre CSS, custom animations
├── components/
│   ├── MapView.tsx             # MapLibre GL map with route, trail, marker, scene-based camera
│   ├── FileUpload.tsx          # Drag-and-drop file upload with format detection
│   ├── Controls.tsx            # Playback controls (play/pause, speed, progress, follow)
│   ├── ExportPanel.tsx         # Video export settings (resolution, codec, FPS, bitrate)
│   ├── ModalDialog.tsx         # Shared dialog shell with focus management/inert background
│   ├── TimelineSelector.tsx    # Drag-based time range selector with density histogram
│   ├── TrackWorkspace.tsx      # Loaded-track workspace (trim, scenes, playback, export entry points)
│   ├── JourneyCreator.tsx      # Manual route creator (click-to-add waypoints on map)
│   ├── SceneEditor.tsx         # Scene editor panel (camera mode, start/end %, params)
│   ├── Toast.tsx               # Non-intrusive notification toast
│   ├── KeyboardHelp.tsx        # Keyboard shortcuts reference overlay
│   └── GoogleGuide.tsx         # Import guide for Google Maps, Strava, Garmin, AllTrails, Komoot, and generic GPX/KML apps
├── lib/
│   ├── parser.ts               # GPX/KML/Google JSON parsing to Track
│   ├── interpolate.ts          # Haversine distance, position interpolation, formatting
│   ├── camera.ts               # Camera state computation, scene blending, defaults
│   ├── usePlaybackController.ts # Playback animation loop + keyboard shortcuts
│   ├── useExportController.ts   # Export lifecycle, resize/idle waits, preview cleanup
│   └── videoEncoder.ts         # WebCodecs MP4 encoding via mediabunny
└── types.ts                    # Shared types (Track, CameraMode, Scene, ExportConfig, etc.)
```

## Features

- **Multi-format support**: GPX, KML, and known compatible Google Timeline JSON shapes
- **Interactive map**: Pan, zoom, rotate with MapLibre GL JS
- **Route visualization**: Full route line + animated trail showing progress
- **Animated marker**: Pulsing dot following the track with camera tracking
- **Timeline selector**: Drag-based time range selection with point density histogram
- **Manual journey creator**: Click-to-add waypoints, drag to reposition, distance display
- **6 camera modes**: Overview, Flyover, Orbit, Ground Follow, Closeup, Bird's Eye
- **Scene system**: Define cinematic scenes assigning camera modes to track segments
- **Scene blending**: Smooth transitions between scenes with smoothstep interpolation
- **Playback controls**: Play/pause, 6 speed levels (0.5x–16x), seekable progress bar
- **Configurable playback duration**: 10s to 5min presets in the playback controls
- **Configurable export duration**: 5s to 3min in the export panel
- **5 local background themes**: Voyager, Light, Dark, Liberty, Bright; these are privacy-preserving route backdrops, not full road/city basemaps
- **Video export**: MP4 via WebCodecs with H.264, H.265/HEVC, AV1 codecs
- **Resolution presets**: YouTube / Landscape 1080p, TikTok / Shorts / Reels 9:16, Instagram Square, Instagram Post, HD Landscape
- **Configurable bitrate**: 1–20 Mbps
- **Import guide**: Current phone-first Google Timeline export steps, a legacy/conditional Takeout fallback, and common GPS/fitness app exports
- **SEO + Open Graph**: Full metadata for social sharing
- **Responsive UI**: Floating controls with backdrop blur, mobile-friendly
