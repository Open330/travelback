# Travelback

Animate your GPX, KML, and Google Location History into travel videos.

**[Live Demo](https://open330.github.io/travelback/)**

## Features

- **Multi-format support** — GPX, KML, Google Maps Location History (all Takeout variants)
- **Interactive map** — Pan, zoom, rotate with MapLibre GL JS and CARTO vector tiles
- **Route animation** — Animated trail + pulsing marker following the track
- **Timeline selector** — Drag to select time range from your location history
- **Playback controls** — Play/pause, 6 speed levels (0.5x–16x), seekable progress
- **Camera follow** — Auto-tracking with bearing and 3D pitch
- **3 map styles** — Voyager, Light, Dark
- **Video export** — WebM recording at 24/30/60 FPS

## Supported Formats

| Format | Extension | Source |
|--------|-----------|--------|
| GPX | `.gpx` | GPS devices, Strava, AllTrails, etc. |
| KML | `.kml` | Google Earth, Maps |
| Google Location History | `.json` | Google Takeout (all variants) |

## Tech Stack

- Next.js 16 (App Router, static export)
- React 19, TypeScript (ESNext)
- MapLibre GL JS v5
- Tailwind CSS 4
- MediaRecorder API for video export

## Development

```bash
npm install
npm run dev
```

## Deploy

Automatically deployed to GitHub Pages on push to `main`.

## License

MIT
