<h1 align="center">Travelback</h1>

<p align="center">
  <strong>Animate your journeys into cinematic travel videos — entirely in the browser</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-ESNext-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/MapLibre_GL-v5-396CB2?logo=maplibre&logoColor=white" alt="MapLibre GL v5">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4">
  <img src="https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white" alt="Playwright">
</p>

<p align="center">
  <a href="https://open330.github.io/travelback/"><strong>Live Demo →</strong></a>
</p>

<p align="center">
  Drop a GPX, KML, or Google Location History file. Travelback renders your route on an interactive map, lets you compose cinematic camera sequences, and exports browser-side MP4 video via WebCodecs.
</p>

---

## Features

**Multi-Format Import** — GPX, KML, and all Google Maps Location History JSON variants (Takeout). Drag-and-drop or browse.

**Interactive Map** — Pan, zoom, rotate with MapLibre GL JS on OSM-based vector tiles. 5 map styles: Voyager, Light, Dark (CARTO), Liberty, Bright (OpenFreeMap).

**Route Animation** — Animated trail with a pulsing marker following the track. Seekable progress bar with 6 speed levels (0.5×–16×).

**6 Camera Modes** — Overview, Flyover, Orbit, Ground Follow, Closeup, Bird's Eye. Each with configurable zoom, pitch, bearing offset, and rotation speed.

**Scene Editor** — Compose multi-segment cinematic sequences with per-scene camera modes and smooth transitions. Coverage bar shows scene boundaries.

**Scene Presets** — Cinematic, Simple, Dynamic, Bird's Eye — one-click compositions that auto-generate 4–6 scenes.

**Timeline Selector** — Drag handles to trim a time range from large location histories. Shows point count and date range.

**Manual Journey Creator** — Click on the map to draw a custom route point by point.

**Elevation Profile** — SVG area chart synced to playback. Click anywhere on the chart to seek.

**Video Export** — Browser-side MP4 via WebCodecs. H.264, H.265/HEVC, AV1 codecs. 7 resolution presets from 720p to 4K, including TikTok/Reels 9:16 and Instagram Square.

**Liquid Glass UI** — [Vitro](https://github.com/circle-oo/vitro) design system with 4-level glass materials, animated mesh background, and light/dark mode toggle.

**Google Takeout Guide** — Step-by-step instructions with a direct link to export your Google Location History.

## Supported Formats

| Format                  | Extension | Source                                |
| ----------------------- | --------- | ------------------------------------- |
| GPX                     | `.gpx`    | GPS devices, Strava, AllTrails, etc.  |
| KML                     | `.kml`    | Google Earth, Google Maps             |
| Google Location History | `.json`   | Google Takeout (all JSON variants)    |

## Camera Modes

| Mode           | Zoom | Pitch | Description                                                  |
| -------------- | ---- | ----- | ------------------------------------------------------------ |
| Overview       | 10   | 45°   | Full-track bird's-eye view with slow rotation                |
| Flyover        | 13   | 55°   | Medium-altitude follow with forward-facing bearing           |
| Orbit          | 14   | 60°   | Orbiting camera around the current position (36°/s)          |
| Ground Follow  | 15.5 | 70°   | Low-altitude chase camera with steep pitch                   |
| Closeup        | 17   | 30°   | Street-level view with shallow pitch                         |
| Bird's Eye     | 11   | 65°   | High-altitude 3D flyover with look-ahead bearing and drift   |

## Export Presets

| Preset                          | Resolution  | Aspect |
| ------------------------------- | ----------- | ------ |
| YouTube / Landscape             | 1920 × 1080 | 16:9   |
| TikTok / Shorts / Reels        | 1080 × 1920 | 9:16   |
| Instagram Square                | 1080 × 1080 | 1:1    |
| Instagram Post                  | 1080 × 1350 | 4:5    |
| HD Landscape                    | 1280 × 720  | 16:9   |
| 4K Landscape                    | 3840 × 2160 | 16:9   |
| 4K Portrait                     | 2160 × 3840 | 9:16   |

## Keyboard Shortcuts

| Action              | Shortcut  |
| ------------------- | --------- |
| Play / Pause        | `Space`   |
| Seek backward       | `←`       |
| Seek forward        | `→`       |
| Toggle follow cam   | `F`       |
| Open export panel   | `E`       |
| Close panel / modal | `Esc`     |

## Architecture

```
travelback/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout — Vitro data attributes, mesh/noise layers
│   │   ├── page.tsx                  # Main app — state management, animation loop, keyboard shortcuts
│   │   └── globals.css              # Tailwind + Vitro imports, glass button/input helpers
│   │
│   ├── components/
│   │   ├── MapView.tsx              # MapLibre GL map — track rendering, markers, camera control
│   │   ├── Controls.tsx             # Playback controls — play/pause, speed, duration, follow toggle
│   │   ├── SceneEditor.tsx          # Scene composition — presets, per-scene camera params, coverage bar
│   │   ├── ExportPanel.tsx          # Export modal — resolution, codec, FPS, bitrate, file size estimate
│   │   ├── FileUpload.tsx           # Drag-and-drop file upload with format detection
│   │   ├── TimelineSelector.tsx     # Time range trimmer with dual drag handles
│   │   ├── ElevationProfile.tsx     # SVG elevation chart synced to playback
│   │   ├── JourneyCreator.tsx       # Manual route drawing via map clicks
│   │   ├── GoogleGuide.tsx          # Google Takeout export instructions
│   │   ├── ThemeToggle.tsx          # Light/dark mode toggle
│   │   ├── Toast.tsx                # Notification toasts (error/success/info)
│   │   └── ErrorBoundary.tsx        # React error boundary with reload UI
│   │
│   ├── lib/
│   │   ├── parser.ts               # GPX, KML, Google JSON parsing (all Takeout variants)
│   │   ├── camera.ts               # Camera state computation — 6 modes, scene blending, bearing smoothing
│   │   ├── interpolate.ts          # Track interpolation — distance-based point sampling, bearing calc
│   │   └── videoEncoder.ts         # WebCodecs MP4 encoding via mediabunny
│   │
│   ├── styles/
│   │   └── vitro-base.css          # Vitro liquid glass design system (exact upstream copy + service theme)
│   │
│   └── types.ts                    # TrackPoint, Scene, CameraMode, ExportConfig, resolution presets
│
├── e2e/
│   ├── travelback.spec.ts          # 10 Playwright E2E tests
│   └── fixtures/                   # GPX, KML, JSON test fixtures
│
├── public/                         # Static assets
└── .github/workflows/deploy.yml    # GitHub Pages deployment
```

## Tech Stack

| Layer      | Technology                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| Framework  | [Next.js](https://nextjs.org/) 16 — App Router, static export             |
| UI         | [React](https://react.dev/) 19, [TypeScript](https://typescriptlang.org/) |
| Styling    | [Tailwind CSS](https://tailwindcss.com/) 4 + [Vitro](https://github.com/circle-oo/vitro) liquid glass |
| Map        | [MapLibre GL JS](https://maplibre.org/) v5 — WebGL vector map rendering   |
| Video      | [mediabunny](https://www.npmjs.com/package/mediabunny) — WebCodecs MP4    |
| Icons      | [Lucide React](https://lucide.dev/)                                        |
| Testing    | [Playwright](https://playwright.dev/) — E2E with headless Chromium        |

## Quick Start

```bash
# Clone
git clone https://github.com/Open330/travelback.git
cd travelback

# Install
npm install

# Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run Tests

```bash
npx playwright install --with-deps chromium
npx playwright test
```

### Build

```bash
npm run build
```

Static output is generated in `out/` for deployment.

## Deploy

Automatically deployed to GitHub Pages on push to `main` via `.github/workflows/deploy.yml`.

## Acknowledgements

- **[Vitro](https://github.com/circle-oo/vitro)** by [Won Park](https://github.com/circle-oo) — Liquid glass design system. Glass material layers, mesh background animations, and color system adapted into a Travelback service theme. MIT License.
- **[MapLibre GL JS](https://maplibre.org/)** — Open-source WebGL map rendering engine.
- **[CARTO](https://carto.com/basemaps/)** and **[OpenFreeMap](https://openfreemap.org/)** — Vector tile basemaps built on OpenStreetMap data.
- **[mediabunny](https://github.com/nicosh/mediabunny)** — Browser-side video encoding via the WebCodecs API.

## License

MIT

---

<p align="center">
  <sub>Built with Next.js, React, MapLibre GL, and WebCodecs. Everything runs in your browser — no server, no uploads.</sub>
</p>
