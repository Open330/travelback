# Travelback

Animate your GPX, KML, and Google Location History into travel videos.

**[Live Demo](https://open330.github.io/travelback/)**

## Features

- **Multi-format support** — GPX, KML, Google Maps Location History (all Takeout variants)
- **Interactive map** — Pan, zoom, rotate with MapLibre GL JS and CARTO vector tiles (OSM-based)
- **Route animation** — Animated trail + pulsing marker following the track
- **Timeline selector** — Drag to select time range from your location history
- **Manual journey creator** — Click on the map to build a custom route
- **5 camera modes** — Overview, Flyover, Orbit, Ground Follow, Closeup
- **Scene editor** — Define cinematic scenes with different camera modes per segment
- **Playback controls** — Play/pause, 6 speed levels (0.5x–16x), seekable progress
- **3 map styles** — Voyager, Light, Dark
- **Video export** — MP4 via WebCodecs (H.264, H.265/HEVC, AV1) with resolution presets
- **Resolution presets** — YouTube 1080p, TikTok/Reels 9:16, Instagram Square/Post, 4K
- **Google Takeout guide** — Step-by-step import instructions with direct link

## Supported Formats

| Format | Extension | Source |
|--------|-----------|--------|
| GPX | `.gpx` | GPS devices, Strava, AllTrails, etc. |
| KML | `.kml` | Google Earth, Maps |
| Google Location History | `.json` | Google Takeout (all variants) |

## Camera Modes

| Mode | Description |
|------|-------------|
| Overview | Bird's-eye view of the full track with slow rotation |
| Flyover | Follow the route at medium altitude with forward-facing bearing |
| Orbit | Orbiting camera around the current position |
| Ground Follow | Low-altitude chase camera with high pitch |
| Closeup | Street-level view with low pitch |

## Tech Stack

- Next.js 16 (App Router, static export)
- React 19, TypeScript (ESNext)
- MapLibre GL JS v5
- Tailwind CSS 4
- mediabunny (WebCodecs-based MP4 encoding)

## Development

```bash
npm install
npm run dev
```

## Deploy

Automatically deployed to GitHub Pages on push to `main`.

## License

MIT
