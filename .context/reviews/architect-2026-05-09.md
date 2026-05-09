# Architect — Travelback (2026-05-09, Cycle 10)

## Scope
Overall architecture, component boundaries, dependency direction, and module coupling.

## Findings

None. After reviewing all source files, no new architectural concerns were found.

## Analysis Details

### Component Architecture
- **App shell** (`page.tsx`): ~670 lines. Manages top-level state (track, scenes, modals, theme, locale, mapstyle). Orchestrates child components. This is reasonable for a Next.js app router page.
- **TrackWorkspace**: Clean container component. Receives all props explicitly, no hidden dependencies.
- **MapView**: Large component (~1200 lines) but well-organized. Exposes imperative handle for export pipeline. This is a known monolith (DEF-01, deferred) but not a new finding.
- **Component hierarchy**: App → TrackWorkspace/MapView/FileUpload/JourneyCreator/GoogleGuide/ErrorBoundary. TrackWorkspace → Controls/ElevationProfile/TimelineSelector/SceneEditor/TrackToolbar/KeyboardHelp. Clean parent-child relationships.

### State Management
- **No external state library**: React `useState` + `useCallback` + `useRef` is sufficient for the app's complexity.
- **Key pattern**: `trackSessionKey` forces TimelineSelector remount on track change. Simple and effective.
- **Theme/locale/mapstyle**: Stored in localStorage with explicit-choice tracking to distinguish user overrides from system defaults.
- **Scene editor**: Raw vs committed drag state prevents normalization counteracting the gesture. Good UX architecture.

### Module Boundaries
- `src/lib/`: Pure utilities (interpolate, camera, parser, i18n, videoEncoder). No React dependencies in core math/parsing modules.
- `src/components/`: React components. Components depend on `src/lib/` and `src/types`.
- `src/types.ts`: Shared types. No runtime dependencies.
- `src/app/`: Next.js app router files. `page.tsx` is the main orchestrator.
- `public/workers/`: Web Worker (plain JS, no build pipeline dependency).

### Build Pipeline
- Next.js 16 static export (`output: 'export'`).
- Postbuild CSP hardening (`scripts/harden-static-export.mjs`).
- Map styles generated locally (`scripts/fetch-map-styles.mjs`).
- Worker is hand-maintained copy of TypeScript source (documented limitation, DEF-05).
- Smoke tests verify worker/parser constant sync, CSP hardening, map style local-only-ness.

### Deferred Architectural Items (unchanged)
- **DEF-01**: MapView.tsx monolith (Low — requires large refactor).
- **DEF-05**: Worker/parser code duplication (Info — no build pipeline support for workers).

## Verdict

No new architectural findings. The codebase maintains clean separation between pure utilities and React components, with reasonable state management for its complexity level.
