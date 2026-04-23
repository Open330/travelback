# Cycle 2 Code-Quality Review (2026-04-23, orchestrator run r2)

Scope: full `src/`, `scripts/`, `public/workers/`, `public/map-styles/`, `e2e/`, `.context/`. Inventory re-confirmed vs. cycle 1.

## Gate snapshot (local)
- ESLint: **PASS** (0 errors, 0 warnings).
- `tsc --noEmit`: **PASS** (0 errors).
- `next build`: **PASS**; `harden-static-export` hardened 3 HTML files.
- `npm audit --audit-level=high`: **PASS** (0 vulnerabilities).
- `npm run smoke:static`: **PASS**.
- `npm run test:e2e:static:ci`: running in background at the time of this review; not observed to fail.

## Findings

### R2-CQ-1 (low/medium) — `shortestLngDelta` misused as a general angular delta in `smoothAngle`
- File: `src/components/MapView.tsx:61-64` (`smoothAngle`).
- Evidence: `shortestLngDelta` is defined in `src/lib/interpolate.ts:6` for longitudes, and the naming is preserved there. In `MapView.tsx`, the helper `smoothAngle(from, to, factor)` calls `shortestLngDelta(from, to)` and then adds `diff * factor`. The math is correct (both longitudes and bearings live on a `mod 360` circle), but using the `Lng` helper for a bearing is semantically mismatched; a reader refactoring `shortestLngDelta` in the future could inadvertently narrow it to longitudes without realizing it feeds bearing smoothing here.
- Failure scenario: a follow-up author tightens `shortestLngDelta` to reject values outside `[-180, 180]` (a plausible longitude guard), breaking smooth bearing interpolation for scenes that briefly yield `bearing > 360` before `normBearing` clamps them.
- Fix: extract a `shortestAngleDelta` sibling helper (already implemented inline at `camera.ts:105-108` as `lerpAngle`; move to `interpolate.ts` and reuse). Confidence: **Medium**.

### R2-CQ-2 (low) — `smoothCameraState` returns `lngResult` computed through `mod 360` but the rest of the code-base normalizes via `normalizeLng` helper
- File: `src/components/MapView.tsx:77-88` recomputes longitude with `((previous.center[0] + delta + 180) % 360 + 360) % 360 - 180`.
- Evidence: `src/lib/interpolate.ts:5` already exports `normalizeLng`. `MapView.smoothCameraState` duplicates the formula inline.
- Fix: call `normalizeLng(previous.center[0] + shortestLngDelta(previous.center[0], target.center[0]) * factor)` to keep normalization in one place. Correctness: equivalent; just DRY. Confidence: **High** (cosmetic).

### R2-CQ-3 (low) — Duplicated approximate distance helper in two places
- Files: `src/components/MapView.tsx:70-75` (`centerDistanceMeters`) and `src/components/JourneyCreator.tsx:29-34` (`approxDistanceMeters`).
- Evidence: both implement an equirectangular approximation. The MapView version uses `shortestLngDelta`; the JourneyCreator version does not (straight subtraction). This inconsistency would manifest near the antimeridian: in `JourneyCreator`, adjacent waypoints with `lng=179` and `lng=-179` would be computed as ~358° apart rather than 2°, making `PROXIMITY_THRESHOLD_METERS` fail to suppress accidental double-clicks.
- Failure scenario: user creates a journey that crosses the antimeridian and taps very close to a waypoint on the other side — the duplicate-suppression guard does not fire.
- Fix: share one helper in `src/lib/interpolate.ts` (e.g., export `approxDistanceMeters`) and use it in both components; use `shortestLngDelta` for the lng term. Confidence: **Medium**.

### R2-CQ-4 (medium) — `parseTrackFile` reads `.json` via `file.arrayBuffer()` but `.gpx`/`.kml` via `FileReader.readAsText` — inconsistent
- File: `src/lib/parser.ts:538-566`.
- Evidence: the `.json` path uses `file.arrayBuffer()` → worker postMessage with transfer; `.gpx`/`.kml` use a `FileReader`. FileReader is older; modern code paths prefer `file.text()` (Blob API). The current inconsistency works but leaves two code paths in the same function and a `reader.onerror` branch that will never be unit-tested.
- Fix: migrate the `.gpx`/`.kml` branch to `await file.text()` inside an `async` version of `parseTrackFile`. Non-breaking; simplifies error handling. Confidence: **Medium**. *Ranked below scheduling threshold; record as deferred.*

### R2-CQ-5 (low/medium) — `getUnitPreference` is called during render via `useState(() => getUnitPreference())`
- File: `src/app/page.tsx:68`.
- Evidence: `getUnitPreference` reads `localStorage` (`src/lib/interpolate.ts:148-155`). Because the React state initializer runs only on first render, and `typeof window !== 'undefined'` guards it, this is safe. However, there is no symmetrical bootstrap-script path for units, so on the very first paint the server-rendered HTML's default is always `metric`. If the user has imperial set in localStorage, the first render paints "km" briefly. Cosmetic.
- Fix: either extend the bootstrap script in `layout.tsx:49` to set `data-units` (matching the theme/mapstyle pattern) or accept the brief flash as a trade-off. Confidence: **Medium** (cosmetic). *Below threshold; record as deferred.*

### R2-CQ-6 (low) — `clearPreview` is wired to `onPointerUp` on every range input in SceneEditor but not on the `SceneRangeEditor` region drag
- File: `src/components/SceneEditor.tsx:484-588` vs. `src/components/SceneEditor.tsx:92-137`.
- Evidence: zoom/pitch/bearing/rotation sliders call `clearPreview()` on `onPointerUp`, which clears the live-preview camera fly-to. The `SceneRangeEditor` pointer drags (start/end/region) do NOT call `clearPreview()` on pointer up, so if a user drags a scene range, the preview stays "sticky" until they drag a slider or close the editor. UX inconsistency — very mild.
- Fix: have the `onPointerUp` effect inside `SceneRangeEditor` invoke a new `onDragComplete` prop that the outer `SceneEditor` maps to `clearPreview`. Confidence: **Medium** (UX polish). *Below threshold; record as deferred.*

## No new regressions vs. cycle 1
All prior fixes (C17-P0-1..-8, C17-P1-1..-2, C1-T1) still present and correct. `eslint-disable` usage remains at 10 instances, all justified.

## Things that passed re-scrutiny
- `ModalDialog` focus trap handles visible-only focusables and restores previous focus on unmount.
- `useExportController` cleanup revokes the video URL in unmount effect using a ref snapshot — no leak on unmount mid-export.
- `Toast` uses `requestAnimationFrame` for the show-enter transition (avoids first-render layout jank).
- `usePlaybackController` uses the accumulator-based pattern to avoid drift on throttled tabs.

## Summary
- 3 below-threshold findings (R2-CQ-4, -5, -6) to be recorded as deferred.
- 3 cosmetic refactors (R2-CQ-1, -2, -3) — consolidate duplicated math helpers.
- 0 blocking issues.
