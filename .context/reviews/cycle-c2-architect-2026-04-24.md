# Architect Review — Cycle C2 — 2026-04-24

## Summary

Architecture is generally stable and matches the documented client-only/static-export design. I found one current actionable state-boundary defect: persisted map-style choice is restored, but the separate explicit-choice flag is not restored, so a later theme toggle can overwrite the user's saved map style. Broad structural concerns such as `HomeInner` size, MapView render-loop coupling, export-overlay modal migration, parser-worker duplication, and unit-test infrastructure remain already deferred rather than new C2 defects.

## Inventory Reviewed

- Project/context rules:
  - `.context/README.md:27-29`
  - `.context/development/01-conventions.md:5-15`
  - `.context/project/01-overview.md:17-28`
  - `.context/project/02-architecture.md:101-139`
- Static export/config:
  - `package.json:5-17`
  - `next.config.ts:3-14`
  - `src/app/layout.tsx:49-69`
  - `scripts/harden-static-export.mjs:8-29`
  - `scripts/smoke-static.mjs:76-145`
  - `scripts/serve-static.mjs:69-158`
  - `public/map-styles/*.json`
- App/data-flow/lifecycle:
  - `src/app/page.tsx:32-476`
  - `src/components/MapView.tsx:385-958`
  - `src/lib/usePlaybackController.ts:17-217`
  - `src/lib/useExportController.ts:28-243`
  - `src/lib/videoEncoder.ts:40-225`
  - `src/components/FileUpload.tsx:52-93`
  - `src/components/JourneyCreator.tsx:112-767`
  - `src/components/SceneEditor.tsx:239-642`
  - `src/components/TrackWorkspace.tsx:51-167`
  - `src/lib/parser.ts:429-628`
  - `public/workers/trackParser.worker.js:289-322`

## Findings

### C2-ARCH-001 — Persisted explicit map-style choice becomes implicit after reload

- **Severity:** Low
- **Confidence:** High
- **Status:** Actionable current defect
- **Area:** State architecture / persistence boundary / theme-map coupling

`page.tsx` restores the saved `travelback-mapstyle` into `mapStyleKey`, but it initializes `hasExplicitMapStyleChoice` to `false` unconditionally. That means after a reload, the UI knows the saved map style, but the decision layer no longer knows that the style was explicitly chosen by the user.

Evidence:

- Saved map style is restored in `mapStyleKey` initializer: `src/app/page.tsx:49-55`.
- Explicit-choice state is always initialized to `false`: `src/app/page.tsx:48`.
- Theme changes overwrite map style when `!hasExplicitMapStyleChoice`: `src/app/page.tsx:302-313`.
- `cycleStyle()` marks the choice explicit only for the current React session: `src/app/page.tsx:315-327`.
- The bootstrap script also treats saved map style as authoritative on first paint: `src/app/layout.tsx:49`.

Impact scenario:

1. User selects `positron`, `liberty`, or `bright` via map-style cycling.
2. `cycleStyle()` persists `travelback-mapstyle` and marks explicit for that session: `src/app/page.tsx:315-326`.
3. User reloads.
4. `mapStyleKey` restores the saved style: `src/app/page.tsx:49-55`.
5. `hasExplicitMapStyleChoice` resets to `false`: `src/app/page.tsx:48`.
6. User toggles light/dark theme.
7. `handleModeChange()` treats the restored style as implicit and overwrites it with `dark` or `voyager`, including localStorage: `src/app/page.tsx:307-312`.

This is not a broad refactor request; it is a narrow persistence-boundary bug. The map-style value and the explicitness metadata are coupled but persisted asymmetrically.

Recommended fix direction:

- Initialize `hasExplicitMapStyleChoice` from the presence of a valid `travelback-mapstyle` value, or persist a separate explicitness bit.
- Lower-risk option: derive initial explicitness from `localStorage.getItem('travelback-mapstyle')` being a valid `MAP_STYLES` key.
- Avoid writing `travelback-mapstyle` during theme changes when a valid explicit style was restored.

## Non-findings / Deferred Carryovers

These are real architectural tensions, but I do **not** classify them as new actionable C2 defects:

1. **`HomeInner` remains the session orchestrator.** It owns track/session/modal/theme/export/playback state in `src/app/page.tsx:32-476`, consistent with the documented state architecture in `.context/project/02-architecture.md:130-139`. The broad extraction/refactor is already deferred as DF-C17-006 in `.context/plans/deferred-findings-cycle17-2026-04-23.md:40-45`.

2. **MapView is still the imperative MapLibre boundary and receives progress-driven updates.** The animation effect is in `src/components/MapView.tsx:824-932`; the performance-oriented render-loop refactor is already deferred as DF-C17-005 in `.context/plans/deferred-findings-cycle17-2026-04-23.md:33-38`.

3. **Export overlay is still custom instead of fully migrated to `ModalDialog`.** Current overlay is in `src/app/page.tsx:351-375`. This matches the deferred R7 carryover for full migration/regression guard in `.context/plans/deferred-findings-cycle-r8-2026-04-23.md:17-22`.

4. **Worker/main parser duplication remains an architectural maintenance risk, not a newly observed defect.** Main JSON parser path is `src/lib/parser.ts:429-628`; worker parser entry is `public/workers/trackParser.worker.js:289-322`. Related worker fallback/parser consistency work is already deferred in `.context/plans/deferred-findings-cycle17-2026-04-23.md:12-17`.

5. **Static export constraints look intentionally guarded.** `next.config.ts:3-14` uses `output: 'export'` and production `/travelback` base path. `scripts/harden-static-export.mjs:14-29` pins the static CSP. `scripts/smoke-static.mjs:76-145` verifies hardened CSP and local-only map-style constraints. `scripts/serve-static.mjs:69-158` enforces base-path serving and hardened preview headers.

## Root Cause

The current architecture separates the persisted value (`mapStyleKey`) from its semantic state (`hasExplicitMapStyleChoice`) but only persists/restores the value. On reload, the app reconstructs the selected style without reconstructing whether that style should be protected from theme-derived defaults.

## Recommendations

1. **Fix C2-ARCH-001** — Low effort / Low-to-medium impact. Restore explicit map-style intent from localStorage alongside `mapStyleKey`, or derive it from a valid saved map-style key.
2. **Keep broad refactors deferred** — No immediate code churn. Do not reopen `HomeInner` extraction, MapView render ownership, ModalDialog export-overlay migration, or parser-worker consolidation unless their documented exit criteria are triggered.

## Trade-offs

| Option | Pros | Cons |
|---|---|---|
| Initialize explicitness from valid saved map style | Small, local, preserves user intent | Treats any saved style as explicit, including theme-derived writes from older sessions |
| Persist a separate explicitness flag | Most semantically precise | Requires migration/default behavior decision |
| Leave as-is | No churn | User-selected map styles can be silently overwritten after reload + theme toggle |

## References

- `.context/development/01-conventions.md:5-15` — project rules and client-side stack constraints.
- `.context/project/02-architecture.md:101-139` — client-only, static/local-only, state architecture contract.
- `next.config.ts:3-14` — static export and `/travelback` base path.
- `src/app/layout.tsx:49-69` — bootstrap theme/map-style restoration and CSP placeholder.
- `src/app/page.tsx:48-59` — map style restored but explicitness flag not restored.
- `src/app/page.tsx:302-327` — theme changes can overwrite map style unless current-session explicit flag is true.
- `src/app/page.tsx:351-375` — export overlay remains custom and matches deferred migration item.
- `src/components/MapView.tsx:824-932` — progress-driven MapView update effect.
- `src/lib/useExportController.ts:118-156` — export lifecycle uses MapView imperative boundary.
- `src/lib/videoEncoder.ts:93-133` — frame loop and map-render wait pipeline.
- `scripts/harden-static-export.mjs:14-29` — static CSP generation.
- `scripts/smoke-static.mjs:76-145` — static CSP and local map-style regression guards.
