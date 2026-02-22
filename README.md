# Travelback

Animate your GPX, KML, and Google Location History into cinematic travel videos — entirely in the browser.

**[Live Demo](https://open330.github.io/travelback/)**

## Features

- **Multi-format import** — GPX, KML, Google Maps Location History (all Takeout JSON variants)
- **Interactive map** — Pan, zoom, rotate with MapLibre GL JS on OSM-based vector tiles
- **Route animation** — Animated trail with a pulsing marker following the track
- **Timeline selector** — Drag handles to trim a time range from large location histories
- **Manual journey creator** — Click on the map to draw a custom route
- **6 camera modes** — Overview, Flyover, Orbit, Ground Follow, Closeup, Bird's Eye
- **Scene editor** — Compose cinematic sequences with per-segment camera modes and transitions
- **Scene presets** — Cinematic, Simple, Dynamic, Bird's Eye one-click compositions
- **Playback controls** — Play/pause, 6 speed levels (0.5×–16×), seekable progress bar
- **5 map styles** — Voyager, Light, Dark (CARTO), Liberty, Bright (OpenFreeMap)
- **Elevation profile** — SVG area chart synced to playback, click to seek
- **Video export** — Browser-side MP4 via WebCodecs (H.264, H.265/HEVC, AV1)
- **Resolution presets** — YouTube 1080p, TikTok/Reels 9:16, Instagram Square/Post, 4K
- **Keyboard shortcuts** — Space (play/pause), ←/→ (seek), F (follow camera), E (export), Esc (close)
- **Light / Dark mode** — Toggle with the theme button; animated liquid-glass UI
- **Google Takeout guide** — Step-by-step import instructions with a direct link

## Supported Formats

| Format | Extension | Source |
|--------|-----------|--------|
| GPX | `.gpx` | GPS devices, Strava, AllTrails, etc. |
| KML | `.kml` | Google Earth, Google Maps |
| Google Location History | `.json` | Google Takeout (all JSON variants) |

## Camera Modes

| Mode | Description |
|------|-------------|
| Overview | Full-track bird's-eye view with slow rotation |
| Flyover | Medium-altitude follow with forward-facing bearing |
| Orbit | Orbiting camera around the current position |
| Ground Follow | Low-altitude chase camera with steep pitch |
| Closeup | Street-level view with shallow pitch |
| Bird's Eye | High-altitude 3D flyover with look-ahead bearing and rotation drift |

## Tech Stack

- [Next.js](https://nextjs.org/) 16 — App Router, static export
- [React](https://react.dev/) 19, TypeScript (ESNext)
- [MapLibre GL JS](https://maplibre.org/) v5 — WebGL map rendering
- [Tailwind CSS](https://tailwindcss.com/) 4 — Utility-first layout
- [Vitro](https://github.com/circle-oo/vitro) — Liquid glass design system (adapted)
- [mediabunny](https://www.npmjs.com/package/mediabunny) — WebCodecs-based MP4 encoding
- [Playwright](https://playwright.dev/) — E2E testing

## Development

```bash
npm install
npm run dev
```

### Run tests

```bash
npx playwright install --with-deps chromium
npx playwright test
```

## Deploy

Automatically deployed to GitHub Pages on push to `main`.

## Acknowledgements

- **[Vitro](https://github.com/circle-oo/vitro)** by [Won Park](https://github.com/circle-oo) — The liquid glass UI design system used throughout Travelback. Vitro's glass material layers, mesh background animations, and color system were adapted into a custom Travelback theme. Licensed under MIT.
- **[MapLibre GL JS](https://maplibre.org/)** — Open-source map rendering engine.
- **[CARTO](https://carto.com/basemaps/)** and **[OpenFreeMap](https://openfreemap.org/)** — Vector tile basemaps built on OpenStreetMap data.
- **[mediabunny](https://github.com/nicosh/mediabunny)** — Browser-side video encoding via the WebCodecs API.

## License

MIT
