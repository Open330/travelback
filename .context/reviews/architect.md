# Prompt 1 architecture review

_Path preserved from architect subagent output; the subagent reported it could not persist the file directly because its session was read-only._

1. **App shell is still the orchestration god object** — **Status: Confirmed** — **Confidence: High**  
   `src/app/page.tsx:32-142,294-416`, `src/components/TrackWorkspace.tsx:13-47,86-150`  
   Risk: track session, trim, scenes, export, theme, locale, help, journey mode, and hotkeys all reset from one component, with a very wide prop chain.  
   Failure scenario: a new panel/session flag gets added and one reset path misses it, causing stale export state, scene state, or modal state across tracks.  
   Fix: introduce a `trackSession` reducer/provider and separate persistent preferences from per-track workspace state.

2. **Export pipeline has split ownership, and export does not honor scene transition duration** — **Status: Confirmed** — **Confidence: High**  
   `src/components/ExportPanel.tsx:112-118`, `src/lib/useExportController.ts:77-136`, `src/lib/videoEncoder.ts:100-103`, `src/components/MapView.tsx:783-787`, `src/types.ts:109-116`  
   Risk: camera/export behavior is spread across panel → controller → encoder → map renderer.  
   Failure scenario: user adjusts scene blend in the editor, preview reflects it, but exported video still uses hardcoded `0.03`.  
   Fix: make a single export request model include scene/blend settings and have one shared camera timeline used by both preview and export.

3. **Google history parsing is duplicated in two implementations** — **Status: Confirmed** — **Confidence: High**  
   `src/lib/parser.ts:168-565`, `public/workers/trackParser.worker.js:1-275`  
   Risk: parser logic, limits, and format support can drift between main thread and worker.  
   Failure scenario: a new Google format or bugfix lands in `parser.ts` but not in the worker, so large files behave differently from small files.  
   Fix: move pure JSON parsing into a shared module and use a module worker/imported bundle instead of copy-pasted logic.

4. **Journey creator crosses the map ownership boundary** — **Status: Risk** — **Confidence: Medium-High**  
   `src/components/JourneyCreator.tsx:140-149,151-228,230-415`, `src/components/MapView.tsx:24-32,394-490`  
   Risk: `JourneyCreator` directly mutates MapLibre sources/layers/listeners through `MapViewHandle.getMap()`, while `MapView` also owns style reload, layers, marker, and export helpers.  
   Failure scenario: a future map style/layer lifecycle change breaks journey editing because two modules are independently managing the same map instance.  
   Fix: keep map mutation inside `MapView`; expose higher-level overlay APIs or a dedicated journey-overlay controller.

5. **Static-serving/privacy architecture is internally inconsistent, and the smoke gate is currently broken** — **Status: Confirmed** — **Confidence: High**  
   `.context/project/01-overview.md`, `.context/project/02-architecture.md:95-107`, `src/app/layout.tsx:53-60`, `scripts/harden-static-export.mjs:8-25`, `scripts/fetch-map-styles.mjs:1-12,18-29`, `public/map-styles/voyager.json:5-20`, `scripts/smoke-static.mjs:104-127`  
   Verification: `npm run smoke:static` failed with `bright.json still depends on remote sprite/glyph assets`.  
   Risk: docs say the app is fully local/offline-safe, but styles/CSP still depend on CARTO remote tiles, glyphs, or sprites.  
   Failure scenario: offline/privacy-sensitive use fails, or maintenance decisions are made from incorrect architecture docs.  
   Fix: choose one truth—either fully localize map assets and tighten CSP/tests, or update docs/tests/CSP to explicitly model remote basemap dependency.

6. **Localization and end-to-end test ownership are monolithic bottlenecks** — **Status: Likely** — **Confidence: Medium-High**  
   `src/lib/i18n.ts:11-1662,1713-1737`, `e2e/travelback.spec.ts:1-975`  
   Risk: all copy for five locales lives in one client file, and nearly all E2E coverage lives in one giant spec.  
   Failure scenario: a small copy or workflow change creates large merge conflicts and unrelated test failures across import/playback/export/static areas.  
   Fix: split locale dictionaries per language/domain and split Playwright specs by architecture slice (`import`, `playback`, `map`, `export`, `static`), with shared helpers.
