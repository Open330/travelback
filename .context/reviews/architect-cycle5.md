# Architect — Cycle 5 (2026-04-25)

## Provenance
Read existing `.context/reviews/architect-cycle5.md` from 2026-04-23 before reviewing the current repo state.

Prior finding `C5-A1` remains valid and is carried forward below as `A5-004`.
Prior finding `C5-A2` is resolved: shared longitude helpers now live in `src/lib/interpolate.ts:5-6` and are imported by `src/lib/camera.ts:3` and `src/components/MapView.tsx:7-8`.

## Inventory Reviewed
Reviewed all runtime-bearing files in `src/`, `public/workers/trackParser.worker.js`, app/config files (`package.json`, `next.config.ts`, `tsconfig.json`, `playwright*.ts`), static/export scripts under `scripts/`, project architecture docs, and the Playwright suite in `e2e/travelback.spec.ts`.

## Summary
The repo is still viable as a single-client static app, but its long-horizon risk is concentrated in boundary ownership rather than missing features. The biggest issues are high-frequency playback state fanning out through the entire UI tree, a duplicated worker/main-thread parser contract, and preference/session logic being split across multiple sources of truth.

## Findings

### A5-001 — Playback state still fans out through the full app shell
- **Severity:** HIGH
- **Confidence:** HIGH
- **Label:** confirmed
- **Evidence:** `src/lib/usePlaybackController.ts:95-135` updates `progress` on every animation frame; `src/app/page.tsx:106-123` lifts that state into `HomeInner`; `src/app/page.tsx:382-504` renders `MapView`, `TrackWorkspace`, modals, and toasts from the same component; `src/components/TrackWorkspace.tsx:52-170` receives `progress`, `isPlaying`, `speed`, `duration`, and forwards them alongside mostly static workspace UI.
- **Failure scenario:** Every playback tick forces the top-level session shell to reconcile the map, workspace chrome, timeline, elevation profile, controls, and modal wiring together. As new UI is added, playback smoothness and change safety will degrade in ways that are hard to localize.
- **Concrete fix:** Isolate playback into a dedicated store/context or a narrower subtree rooted near `MapView`/`Controls`, then memoize static workspace branches so only progress-sensitive leaves update at animation cadence.

### A5-002 — The worker/main-thread parser contract is duplicated and format-specific
- **Severity:** HIGH
- **Confidence:** HIGH
- **Label:** confirmed
- **Evidence:** `src/lib/parser.ts:521-550` and `src/lib/parser.ts:536-620` define the worker boundary; `src/lib/parser.ts:645-674` sends only JSON through the worker and keeps GPX/KML on the main thread; `public/workers/trackParser.worker.js:1-321` re-implements Google parsing logic and explicitly carries “must match” constants at `:250-261`; the same Google-format logic also exists in `src/lib/parser.ts:465-519`.
- **Failure scenario:** Support for a new Google export shape, size limit, or validation rule lands in one parser path but not the other, producing browser-dependent behavior. Separately, large GPX/KML imports still block the UI even though a worker mechanism already exists.
- **Concrete fix:** Extract a shared parser core into TypeScript and build the worker from that source, with a typed message schema. Either support all formats in the worker or make the main-thread fallback a thin compatibility wrapper over the same parser module.

### A5-003 — Theme and map-style ownership is split across bootstrap, page state, and control widgets
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Label:** confirmed
- **Evidence:** `src/app/layout.tsx:53-58` embeds bootstrap logic for theme, map style, and locale; `src/app/page.tsx:35-57`, `:63-84`, and `:344-375` independently resolve and persist theme/map-style state; `src/components/ThemeToggle.tsx:7-22` and `:36-63` re-run mode detection and OS preference logic again.
- **Failure scenario:** Adding a new style or changing default theme behavior requires updating multiple codepaths with slightly different rules. Drift here will show up as first-render mismatches, stale persisted choices, or hydration-era state discrepancies.
- **Concrete fix:** Centralize preference resolution and persistence in one shared module, then generate the bootstrap script from that same source instead of hand-maintaining parallel logic.

### A5-004 — `HomeInner` remains the session god-component and prop-drilling hub
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Label:** risk
- **Provenance:** Carries forward prior `C5-A1`.
- **Evidence:** `src/app/page.tsx:59-158` holds the main state surface; `src/app/page.tsx:201-375` owns most session resets, modal toggles, scene/export orchestration, and preference mutations; `src/app/page.tsx:444-481` passes a wide prop surface into `TrackWorkspace`; `src/components/TrackWorkspace.tsx:13-50` is largely a forwarding interface into toolbar/editor/timeline/control subtrees.
- **Failure scenario:** Adding one more workspace concern means editing `page.tsx`, `TrackWorkspace.tsx`, and multiple leaves at once. That broadens regression surface and makes unrelated features share the same orchestration boundary.
- **Concrete fix:** Introduce a `TrackSession` / `WorkspaceState` boundary so `page.tsx` only owns bootstrapping and top-level modal routing, while workspace composition and actions live behind a reducer/context closer to the loaded-track UI.

### A5-005 — Localization data and runtime logic are coupled into one oversized client module
- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Label:** risk
- **Evidence:** `src/lib/i18n.ts:11-1752` contains all locale payloads inline; `src/lib/i18n.ts:1755-1829` mixes key typing, locale detection, storage, provider logic, and hook exports in the same file. The module is 1,829 lines (`wc -l src/lib/i18n.ts`).
- **Failure scenario:** Every translation edit churns a core runtime module, makes ownership harder, and blocks future per-locale loading or cleaner review boundaries. This is manageable now, but it scales poorly as locales/features expand.
- **Concrete fix:** Split locale payloads from provider/runtime code, keep a typed key contract in one place, and move translations into per-locale modules or JSON files.

## Root Cause
The repo’s main design pressure is boundary concentration: high-frequency state is centralized in `HomeInner`, imperative seams like parsing and map/export control are only partially abstracted, and cross-cutting concerns such as preferences and i18n are implemented as duplicated client-side logic rather than single-source models.

## Recommendations
1. Break the playback/render loop out of `HomeInner` and stop routing every animation tick through the entire app shell.
2. Replace handwritten worker duplication with a shared parser core and typed worker protocol.
3. Centralize preference bootstrap/runtime persistence and shrink `page.tsx` into a real session boundary.
