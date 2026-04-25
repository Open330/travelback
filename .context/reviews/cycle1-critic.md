# Cycle 1 Critic Review — Travelback

Repository: `/Users/hletrd/flash-shared/Travelback`  
Role: critic  
Status: persisted by leader after reviewer WRITE_FAILED due read-only constraints.

## Verification performed

- Inventory: tracked files reviewed with generated/vendor exclusions: `node_modules`, `.next`, `out`, `.git`, `test-results`, `playwright-report`.
- Examined: core app files under `src/`, parser/worker, components, scripts, configs, workflow, README/project docs, and E2E structure.
- Commands:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
  - `npm run smoke:static` ✅
  - `npm audit --audit-level=high` ✅ 0 vulnerabilities
  - `npm run test:e2e:static:ci` started; stopped after 55/74 tests had begun/passed without reported failure.

## Findings

### 1. Manual journey points can store out-of-range longitudes from wrapped map worlds

- **File/region**: `src/components/JourneyCreator.tsx:300-308`, `338-345`; downstream assumptions in `src/components/MapView.tsx:176-190`
- **Severity**: MEDIUM
- **Confidence**: Medium
- **Status**: likely / manual-validation
- **Scenario**: MapLibre can expose clicked/dragged `lngLat.lng` values outside `[-180, 180]` when world copies are visible. JourneyCreator stores those raw values directly. Later fit bounds, route geometry, export camera, and marker logic mostly assume normalized track coordinates.
- **Suggested fix**: Normalize all manually created/dragged longitudes with `normalizeLng()` and clamp/validate latitudes before storing waypoints.

### 2. Scene overlap/range warnings are based on raw input, but saved scenes are immediately normalized

- **File/region**: `src/components/SceneEditor.tsx:254-278`
- **Severity**: LOW-MEDIUM
- **Confidence**: High
- **Status**: confirmed by code inspection
- **Scenario**: User creates overlapping scenes. `commitScenes()` records warnings from raw scenes, then immediately calls `normalizeScenes()` and saves corrected scenes. The UI can show an overlap warning for scenes that are no longer actually overlapping, making the warning confusing and hard to act on.
- **Suggested fix**: Either reject/keep raw invalid ranges until the user fixes them, or calculate warnings against the normalized result and show a “ranges auto-adjusted” message instead of stale overlap warnings.

### 3. Global hotkeys mutate playback state even when no track is loaded

- **File/region**: `src/lib/usePlaybackController.ts:202-220`
- **Severity**: LOW
- **Confidence**: High
- **Status**: confirmed by code inspection
- **Scenario**: On the landing screen, ArrowLeft/ArrowRight and `F` still call seek/follow handlers even though no track exists. Track loading later resets state, so this is not currently severe, but it is hidden coupling between “no track” and playback state.
- **Suggested fix**: Guard all playback-only hotkeys with `if (!track) return`, not just Space and Export.

### 4. Map error overlay can remain after recoverable style/map errors

- **File/region**: `src/components/MapView.tsx:636-648`, `675-692`
- **Severity**: LOW-MEDIUM
- **Confidence**: Medium
- **Status**: likely
- **Scenario**: Any MapLibre `error` event sets `mapError`. Successful later `style.load`/style recovery does not clear it. A transient style or resource error can leave a blocking error overlay even if the map becomes usable.
- **Suggested fix**: Clear `mapError` after a successful style load or after `addReferenceGridLayers`/`addTrackLayers` succeeds.

### 5. Parser logic is duplicated between TypeScript and public worker with limited parity checks

- **File/region**: `src/lib/parser.ts:485-539`, `public/workers/trackParser.worker.js:220-262`, partial guard in `scripts/smoke-static.mjs:183-213`
- **Severity**: MEDIUM
- **Confidence**: High
- **Status**: confirmed maintainability risk
- **Scenario**: Google JSON parsing exists in two hand-maintained implementations. The smoke test checks constants/error codes, but not behavioral parity across formats. A future parser fix can land in `parser.ts` while large JSON imports via worker keep old behavior.
- **Suggested fix**: Extract shared parser logic into a worker-bundleable module or add parity tests that run the same fixtures through both main parser and worker parser.

## Missed-issue sweep

- No high-confidence security vulnerability found in reviewed code.
- No failing lint/typecheck/build/smoke/audit evidence.
- Primary remaining blind spot: the full 74-test static E2E suite was interrupted at status-check time after test 55/74 started; no failure had appeared before termination.

## Skipped-file confirmation

Excluded generated/vendor/runtime-output dirs as requested: `node_modules`, `.next`, `out`, `.git`, `test-results`, `playwright-report`.

Also treated `.omx`, `.omc`, historical `.context/reviews`, archived plans, and generated session/log state as non-review-source artifacts for this cycle.
