# Cycle 2 Architecture Review (2026-04-23, orchestrator run r2)

Scope: module boundaries, prop drilling, coupling, reuse of duplicated concerns, hook ownership, data-flow between `page.tsx`, `TrackWorkspace`, `MapView`, and the export controller.

## Observations

### Layering stays clean
- `src/lib/` has pure utilities (parser, interpolate, camera, videoEncoder, env, i18n).
- `src/lib/useExportController.ts` and `src/lib/usePlaybackController.ts` are hooks that own side effects.
- `src/components/` is UI-only; MapView owns the MapLibre instance through a `forwardRef` handle.
- `src/app/page.tsx` is the session boundary.
- Dependency direction is one-way: `app → components → lib`. No circular imports detected.

### R2-AR-1 (medium) — `HomeInner` in `src/app/page.tsx` is still the god-file DF-C17-006 flagged
- File: `src/app/page.tsx:32-445` = 413 lines containing 17 `useState` / `useRef` / `useMemo` hook calls plus 20+ `useCallback`s.
- Evidence: DF-C17-006 is active. The surface area makes per-feature reasoning painful (e.g., "where does the theme-toggle side effect actually fire?").
- Confidence: **High** (already-identified); same exit criterion: "when a code-structure pass is explicitly scheduled". No change this cycle.

### R2-AR-2 (medium) — `MapView` owns both map lifecycle AND the render-loop effect
- File: `src/components/MapView.tsx:543-643` (init) + `:825-932` (animation).
- Evidence: the animation effect runs on every progress tick, which couples MapView to React's render cadence. This is exactly DF-C17-005. Related architectural problem: the ref-stable pattern for props (scenesRef, durationRef, transitionDurationRef) proliferates to avoid re-registering listeners but makes the effect hard to reason about (the effect's deps list includes `progress, track, followCamera, suspendAutoCamera, seekNonce, cumulativeDistancesProp` — but reads other mutables from refs).
- Proposed shape (for the eventual refactor): extract a `useMapPlayback(mapRef, track, scenes, progress, …)` hook that owns the rAF and subscribes to progress instead of re-firing a React effect every tick.
- **Carry-forward DF-C17-005.** No new action this cycle.

### R2-AR-3 (low) — Cross-module duplication: `normalizeLng`/`shortestLngDelta` are defined once but bearing-analogues live in two components
- Files: `src/lib/interpolate.ts:5-6` vs. `src/components/MapView.tsx:61-75` (smoothAngle, centerDistanceMeters) vs. `src/components/JourneyCreator.tsx:29-34` (approxDistanceMeters) vs. `src/lib/camera.ts:104-107` (lerpAngle inside lerpCamera).
- Evidence: bearing smoothing, distance approximation, and antimeridian-wrap handling appear in 3–4 places with slightly different implementations. The risk is future drift — e.g., one copy handling antimeridian and another not.
- Fix: pull `approxDistanceMeters(a, b)` and `shortestAngleDelta(from, to)` into `src/lib/interpolate.ts` and reuse. Same issue noted in the Code-Quality review as R2-CQ-3.
- Confidence: **Medium**. *Below threshold; record as deferred.*

### R2-AR-4 (info) — `useExportController` correctly isolates the export lifecycle
- File: `src/lib/useExportController.ts`.
- Evidence: owns `AbortController`, blob URL revocation, mount guard, and recovery path for resetSize failure. Clean separation from `usePlaybackController`.
- **Positive finding.**

### R2-AR-5 (info) — `TrackWorkspace` is pure prop-drilling — 33 props, no state
- File: `src/components/TrackWorkspace.tsx:13-48`.
- Evidence: it bundles many page-level props into child components. Since it owns no state, it functions as a layout wrapper rather than a component with concerns. That is acceptable and mirrors `page.tsx` decomposition, but does compound the "page.tsx owns too much" feeling from R2-AR-1.
- No new action this cycle.

### R2-AR-6 (low) — `ModalDialog` manages a module-level `openModalStack` for stacked modals
- File: `src/components/ModalDialog.tsx:31-67`.
- Evidence: mutable module state for modal ordering + body-overflow lock. Works correctly for the current modal set (export, scene-editor confirm, google-guide, keyboard-help, discard-journey). Edge case: if two ModalDialogs with the same `instanceId` are ever mounted simultaneously, the `lastIndexOf` stack would mis-track. `useId` makes duplicates extremely unlikely. Acceptable.
- **Positive finding.**

### R2-AR-7 (low) — `useLocale` is imported by every component including by pure-utility-like places (ErrorBoundary needs it to translate the fallback)
- File: `src/components/ErrorBoundary.tsx:3-82`.
- Evidence: ErrorBoundary wraps an inner class with a `useLocale()` hook result threaded in. Works fine. No architectural concern.
- **Positive finding.**

## Net assessment
- All prior architectural deferrals (DF-C17-005 "MapView re-renders", DF-C17-006 "HomeInner god-component") remain active with their original exit criteria.
- One new observation (R2-AR-3 — duplicated math helpers) is a cosmetic cleanup — defer.
- No scheduling-required architectural issue this cycle.
