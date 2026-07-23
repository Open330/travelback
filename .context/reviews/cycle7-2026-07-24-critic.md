# Cycle 7 critic review — 2026-07-24

Target: `216001ff2bc4ff8c31da333e50e6d0e982816b5b`

## Verdict

One new Low-severity documentation root survived the repository-wide review
and historical deduplication. It is the same root as `V7-01` and `DOC7-01`,
not an additional aggregate finding. I found no new runtime correctness,
security, performance, or user-journey defect from this lens.

## CR7-01 — the authoritative architecture diagram describes obsolete ownership boundaries

- **Severity:** Low
- **Confidence:** High
- **Status:** Confirmed
- **Regions:** `.context/project/02-architecture.md:5-43`;
  `src/components/TrackToolbar.tsx:149-335`;
  `src/components/JourneyCreator.tsx:791-807`;
  `src/components/FileUpload.tsx:79-94`;
  `src/app/page.tsx:416-447`

The component tree describes `TrackToolbar` as a theme/locale/reset toolbar.
In current source it owns New Route, Camera, map style, Help, Export, and the
mobile settings dialog. Theme and locale exist only in that mobile overflow
branch, and there is no control named Reset.

More importantly, the data-flow diagram says both File Upload and Journey
Creator pass through `parser.ts`. File and sample imports do call
`parseTrackFile`, but Journey Creator constructs a `Track` directly from its
confirmed waypoints and sends it through `handleJourneyComplete` to
`loadTrackIntoSession`. The parser is not on that path.

### Concrete failure scenario

A maintainer uses the project architecture file to choose a validation or
session-reset boundary. They put a creator invariant in `parser.ts`, believing
all ingress passes through it, and the manual-route path silently bypasses the
new check. Alternatively, they search `TrackToolbar` for a documented Reset
contract while missing its actual session actions and breakpoint-dependent
settings ownership.

### Suggested fix

Split ingress in the diagram:

1. `FileUpload / sample → parseTrackFile() → Track`
2. `JourneyCreator → validated direct Track assembly`
3. both paths converge at `loadTrackIntoSession()`

Describe `TrackToolbar` as loaded-session actions plus mobile settings, naming
its important actions without claiming a Reset control.

## Inventory, deduplication, and final sweep

The review inventoried the application shell, all UI components, controller
hooks, parser/camera/interpolation/map/export libraries, workers, styles,
public assets, configuration, scripts, unit/component/E2E catalogs, README,
current project/development context, and prior review/plan ledgers. Cross-file
flows checked included import/session replacement, trim/playback/camera,
scene preview/commit, export/save/share, map-style recovery, localization,
responsive menus, focus/dialog ownership, and cleanup.

Cycle 1–6 roots from July 23–24 were not refiled, including the Cycle 6 GPX
fallback, wrapped-geometry release, preview settlement, and semantic no-op
export fixes. Historical searches found prior statements that the architecture
matched source, but no recorded finding for these two current false edges.

The final missed-issue sweep found no additional actionable root. Browser
execution was assigned to the parent workstream, so this report used static
source, test, and documentation evidence only. No server, browser,
Playwright, Chromium, supervisor, deployment, or process-cleanup command ran.
