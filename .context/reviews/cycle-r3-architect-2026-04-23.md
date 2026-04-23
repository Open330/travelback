# Cycle r3 — architect review (2026-04-23)

Scope: module layering, coupling, feature flags, data flow.

## Findings

### R3-AR-1 (LOW, MEDIUM) — Geo helpers still split between `interpolate.ts`, `camera.ts`, `MapView.tsx`, and `JourneyCreator.tsx`
- **File**: various.
- **Detail**: Same architectural observation as DF-R2-001..003. Status: still 4 call-sites for longitude/bearing/distance helpers. The cleanest refactor is extracting `src/lib/geo.ts` and re-exporting.
- **Schedule**: defer — carry-over to a shared-geo pass.

### R3-AR-2 (LOW, MEDIUM) — `useExportController` imports `computeCumulativeDistances` but also receives `cumulativeDistances` as a prop
- **File**: `src/lib/useExportController.ts` header + `src/app/page.tsx:122`.
- **Detail**: `useExportController` accepts `cumulativeDistances` via its opts, and also the track itself. `videoEncoder.exportVideo` re-derives cumulative distances internally if `cumulDistParam` is missing (`videoEncoder.ts:66`). Consistent — the prop is the caller's cache. No action needed; noting for architectural clarity.
- **Schedule**: N/A.

### R3-AR-3 (LOW, MEDIUM) — `page.tsx` holds 18 top-level `useState` values
- **File**: `src/app/page.tsx:34-69`.
- **Detail**: `HomeInner` manages 18 pieces of state (track, full track, scenes, map-style key, color mode, toasts, etc.). This is organically grown. A reducer or `zustand`/context split could improve testability — however, the current code is readable and each state has a clear owner. Deferring until further pressure justifies the refactor.
- **Schedule**: defer — architectural refactor; not a correctness finding.

### R3-AR-4 (INFO, HIGH) — Boundary between `usePlaybackController` and `MapView` is clean
- **File**: `src/lib/usePlaybackController.ts`.
- **Detail**: The playback controller owns timing; `MapView` owns map state. No leakage.
- **Schedule**: N/A.

## Final sweep

- No circular imports (mental grep of component imports clean; TypeScript would also have failed the gate otherwise).
- No indirect coupling via module-level singletons (other than `getUnitPreference` localStorage reads, which are intentional).
- All env-gated code behind `typeof window === 'undefined'` guards at module-init time.

## Recommendations

No scheduled architecture work this cycle. All findings are carry-overs.
