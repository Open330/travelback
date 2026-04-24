# Architect Review - Review-Plan-Fix Cycle 3

## Inventory

Reviewed architecture-relevant runtime/config files (`package.json`, `next.config.ts`, `playwright*.ts`), all files under `src/app`, `src/components`, `src/lib`, the static export scripts, `e2e/travelback.spec.ts`, and `public/workers/trackParser.worker.js`.

## Findings

### ARCH-C3-001 - Google JSON parsing is duplicated between main thread and worker
- Severity: High
- Confidence: High
- Evidence: `src/lib/parser.ts:218-621`, `public/workers/trackParser.worker.js:14-322`
- Failure scenario: a future Google Location History format fix lands in one parser path but not the other, so worker-backed imports and fallback imports diverge.
- Suggested fix: move Google JSON parsing into one shared pure implementation or add a drift-proof generation/check path for the worker.

### ARCH-C3-002 - Export request shape overloads `scenes: []`
- Severity: Medium
- Confidence: High
- Evidence: `src/components/ExportPanel.tsx:140-144`, `src/lib/useExportController.ts:112-123`
- Failure scenario: callers can pass an empty scene list expecting no scenes, but the controller substitutes ambient editor state or generated defaults.
- Suggested fix: remove scene ownership from the panel-facing request type and let the controller resolve export scenes explicitly.

### ARCH-C3-003 - Export cleanup reaches through the map abstraction
- Severity: Medium
- Confidence: High
- Evidence: `src/lib/useExportController.ts:196-209`, `src/components/MapView.tsx:26-34`
- Failure scenario: if `resetSize()` throws and the DOM selector changes, the map container can remain stuck at the export resolution.
- Suggested fix: make the `MapViewHandle.resetSize()` method itself robust enough to clear forced dimensions without controller-side DOM queries.

### ARCH-C3-004 - Theme/map-style bootstrap duplicates style keys and defaults
- Severity: Medium
- Confidence: High
- Evidence: `src/app/layout.tsx:53-67`, `src/app/page.tsx:32-84`, `src/types.ts:21-46`
- Failure scenario: adding or renaming a style in `MAP_STYLES` without updating the inline bootstrap whitelist causes first-paint and hydrated state to disagree.
- Suggested fix: derive bootstrap data from the same style registry or generate the bootstrap from shared constants.

### ARCH-C3-005 - `JourneyCreator` mutates the raw MapLibre instance
- Severity: Medium
- Confidence: Medium
- Evidence: `src/components/MapView.tsx:26-34`, `src/components/JourneyCreator.tsx:170-441`
- Failure scenario: a future `MapView` lifecycle or layer-id refactor breaks journey drawing because `JourneyCreator` owns its own sources/listeners on the same map instance.
- Suggested fix: move journey overlays behind a narrower `MapViewHandle` API or into `MapView`.

### ARCH-C3-006 - Static CSP hardening depends on a Next internal script serialization shape
- Severity: Medium
- Confidence: High
- Evidence: `scripts/harden-static-export.mjs:71-80`, `scripts/harden-static-export.mjs:103-116`, `scripts/smoke-static.mjs:76-119`
- Failure scenario: a Next upgrade changes the emitted bootstrap wrapper and the postbuild hardener fails or hashes the wrong payload.
- Suggested fix: own the bootstrap as a static asset or replace the narrow regex with a more generic emitted-HTML transform.

## Verification

The architect lane reported `npm run typecheck` and `npm run lint` passed. It did not modify source code.
