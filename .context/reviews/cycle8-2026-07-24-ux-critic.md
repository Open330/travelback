# Cycle 8 UX, critic, and non-technical traveler review — 2026-07-24

Target: `9b3343cd0c01fabb84dc47f4f34c28238d98a99e`

## Verdict

**One genuinely new user-facing root survived the static full-journey review
and repository-wide historical deduplication.** It is Medium severity with
High confidence. The primary trip-to-video path remains coherent from static
evidence, but selecting Korean, Japanese, Chinese, or Spanish does not reach
MapLibre's own visible and assistive UI.

Browser work belonged to the parent lane. I did not launch a server, browser,
Playwright, Chromium, supervisor, or E2E process, and therefore created no
Chrome process to clean up.

## Review inventory and method

I first inventoried the review surface with tracked-file searches:

- Instructions and product context: the `review-plan-fix` skill,
  `.context/agents/non-tech-traveler-reviewer.md`, `.context/README.md`,
  `.context/development/01-conventions.md`,
  `.context/project/01-overview.md`,
  `.context/project/02-architecture.md`, and `README.md`.
- App and visual source: `src/app/{layout.tsx,page.tsx,globals.css,favicon.ico}`;
  every file under `src/components/` (`Controls`, `ElevationProfile`,
  `ErrorBoundary`, `ExportPanel`, `FileUpload`, `GlobalToolbar`, `GoogleGuide`,
  `JourneyCreator`, `KeyboardHelp`, `MapView`, `ModalDialog`, `SceneEditor`,
  `ThemeToggle`, `TimelineSelector`, `Toast`, `TrackToolbar`,
  `TrackWorkspace`, and their component/responsive tests).
- Supporting code: `src/types.ts` and every file under `src/lib/`, covering
  locale/theme state, playback, camera/interpolation, parsing and worker
  parity, map geometry/render/export presentation, export control/encoding,
  environment/base-path handling, and all associated unit tests.
- Shipped and verification surfaces: all files under `public/`, `scripts/`,
  and `e2e/`; the root package/lock, Next, TypeScript, ESLint, Vitest,
  Playwright, PostCSS configuration; the complete current E2E catalog and
  fixtures.
- History: all 873 tracked `.context/` files and all 39 tracked `plan/` files
  inventoried at review start, plus the current git history through Cycle 7.
  I searched them for matching map-control, localization, accessibility,
  toast, waypoint, focus, responsive, and full-journey roots before accepting
  the finding below.

The static journey followed landing → sample/file/manual-route ingress →
loaded map and playback → trim/elevation → Camera authoring/preview → Export,
cancel, encode, save/share → retry/reset. The cross-cutting sweep covered
information architecture, nontechnical copy, focus/keyboard and ARIA,
WCAG 2.2 concerns, target sizing, theme/contrast tokens, reduced motion,
short/mobile viewports and safe areas, loading/empty/error/validation states,
all five locales, current LTR-only scope, and perceived-performance/resource
ownership.

## UX8-01 — selected language does not reach MapLibre's own controls

- **Severity:** Medium
- **Confidence:** High
- **Status:** Source- and installed-dependency-confirmed; live assistive
  technology validation remains parent-owned
- **Regions:** `src/lib/i18n.ts:1953-1977`;
  `src/components/MapView.tsx:254-274,837-875,934-967,1159-1166`;
  `package.json:30`;
  installed `node_modules/maplibre-gl/dist/maplibre-gl.d.ts:10227-10239,11219-11224`
- **Exact rendered targets:** `[data-testid="map-container"]
  canvas.maplibregl-canvas`, `.maplibregl-ctrl-zoom-in`,
  `.maplibregl-ctrl-zoom-out`, `.maplibregl-ctrl-compass`, and
  `summary.maplibregl-ctrl-attrib-button`

`LocaleProvider` changes both React locale state and `<html lang>` when the
traveler chooses a language. `MapView`, however, reads only `t`, constructs
`new maplibregl.Map(...)` without its supported `locale` option, and installs
the stock `NavigationControl`. Its long-lived initialization effect also has
no selected-locale dependency or other control-label synchronization path.

The pinned MapLibre 5.24 type contract explicitly defines a `locale` patch for
UI strings and its default table includes `Map.Title`,
`NavigationControl.ResetBearing`, `NavigationControl.ZoomIn`,
`NavigationControl.ZoomOut`, and
`AttributionControl.ToggleAttribution`. With no patch, those defaults are
English. Historical rendered artifacts likewise record the actual labels
“Map,” “Zoom in,” “Zoom out,” and “Toggle attribution”; no current test
asserts that they change with the app locale.

### Concrete traveler and accessibility failure

Mina selects 한국어, loads her trip, then hovers a zoom button or tabs through
the map controls. The rest of the interface is Korean and the document
language is `ko`, but the visible tooltips and accessible names remain
English. A screen reader can therefore pronounce “Map,” “Zoom in,” “Zoom
out,” the verbose reset-bearing instruction, and “Toggle attribution” using
the Korean document voice. The same language leak affects Japanese, Chinese,
and Spanish. These are primary map-navigation controls, not hidden technical
details, and the missing language boundary is particularly harmful to users
who rely on their accessible names.

### Concrete fix and regression boundary

Add app-owned translations for the five MapLibre strings in every shipped
locale and supply the selected patch when creating the map. Also handle
locale changes after the map already exists: use supported authored/localized
controls or a deliberate synchronization lifecycle that updates both
`title` and accessible names without resetting the route, camera, playback,
Journey draft, or an active export. Do not casually add `locale` to the
whole-map initialization effect and accept destructive re-creation as the
interaction contract.

Add a focused component/integration seam for the locale mapping, then a
retries-off browser assertion that changes `en → ko → ja` after a track is
loaded and checks the canvas, zoom, compass, and attribution names while
confirming there is still exactly one map canvas and the current route/camera
state is retained.

### Deduplication

Earlier cycles fixed hard-coded English Scene sliders/range handles, localized
live status and manufactured track names, Spanish/Korean copy, attribution
geometry/keyboard operation, and English-only guide artwork. They did not
record or remediate MapLibre's own localization table. Searches for
`MapLibre locale`, `Map.Title`, `NavigationControl`, `Zoom in/out`, and
`Toggle attribution` found only dependency/runtime artifacts and unrelated
control geometry or keyboard findings. This is therefore a new root, not a
rephrasing of a Cycle 1–7 item.

## Static full-journey assessment and rejected duplicates

- Landing provides sample, file, Google-import guidance, and manual-route
  entry points with explicit pending, validation, and recovery states.
- The loaded workspace exposes understandable playback, trim, Camera, map
  style, Export, Help, and New Route paths; responsive dialogs have bounded
  scrolling, focus ownership, and safe-area/short-height treatment in source.
- Camera preview/cancel, semantic no-op export preservation, GPX fallback,
  wrapped geometry, export preview settlement, Unicode filenames, parser
  cardinality, and architecture documentation are current Cycle 6–7 fixes and
  were not refiled.
- Fixed-duration toast behavior overlaps the previously recorded toast
  auto-dismiss/countdown family, so it is not claimed as a fresh Cycle 8 root.
  Lack of a live waypoint-count announcement was retained as a possible
  enhancement rather than inflated into a source-proven blocker because the
  localized coordinate input, button enablement, Undo, Clear, and confirmation
  flow provide keyboard-visible alternatives.
- No RTL defect is claimed: all five shipped locales are LTR. Exact contrast,
  physical hit ownership, clipping, tooltip rendering, screen-reader speech,
  and real responsive geometry were not fabricated from static evidence.

## Final missed-file sweep

The closing sweep rechecked every component and locale consumer, app shell and
CSS media query, the MapLibre lifecycle and control DOM, component/unit/E2E
catalogs, public guide/map assets, configuration, current project/development
documentation, all Cycle 1–7 July 23–24 reviews and plans, older matching
reviews, and the latest git history. No second genuinely new actionable
UI/UX, critic, or non-technical-traveler root survived causal verification and
deduplication.
