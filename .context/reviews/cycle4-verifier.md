# Cycle 4 Verifier Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Evidence-based correctness check against stated behavior. Verified architecture doc claims against actual code.

## Findings

### C4-VR01 — Architecture doc says "5 local background themes" but code has 5 map styles
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/01-overview.md:95`, `src/types.ts:21`
- **Detail:** The overview says "5 local background themes: Voyager, Light, Dark, Liberty, Bright" and the code defines `MapStyleKey = 'voyager' | 'positron' | 'dark' | 'liberty' | 'bright'`. The code's `'positron'` maps to UI label "Light". This is consistent but the naming mismatch between internal key and UI label could confuse contributors.
- **Suggested fix:** No code change needed — the mapping is clear from `MAP_STYLES`.

### C4-VR02 — Architecture doc says Orbit rotation is "36deg/s" but default params say "rotationSpeed: 36"
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:91`, `src/types.ts:62`
- **Detail:** The architecture doc states Orbit bearing is "Fast rotation (36deg/s)". The `DEFAULT_CAMERA_PARAMS.orbit.rotationSpeed` is 36. In `computeCameraForScene` (camera.ts:177), `bearing: normBearing(elapsedSec * params.rotationSpeed + params.bearingOffset)`. This correctly applies degrees per second. Verified consistent.
- **Suggested fix:** No fix needed — verified correct.

### C4-VR03 — Export pipeline step 3 says "map.once('render') + rAF" but code uses different pattern
- **Severity:** LOW
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md:59`, `src/components/MapView.tsx:521-593`
- **Detail:** The architecture doc says the per-frame capture uses `map.once('render') + rAF`. The actual `renderFrameAndWait` implementation: (1) checks if camera state is identical and resolves immediately, (2) calls `map.jumpTo()`, (3) registers `map.once('render', onRender)`, (4) the render handler calls `requestAnimationFrame(() => resolve())`, (5) 5s timeout fallback. The "identical state fast path" and timeout are not documented.
- **Suggested fix:** Update architecture doc to mention the identical-state fast path and timeout fallback. Low priority.

### C4-VR04 — `useExportController` does not check if `mapHandle` is still valid after `waitForIdle`
- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/lib/useExportController.ts:136-138`
- **Detail:** After `mapHandle.waitForIdle(abortController.signal)` returns, the code proceeds without re-checking if the map was destroyed during the wait. The `renderFrameAndWait` method resolves immediately if `mapRef.current` is null. If the map was destroyed between resize and the first frame, `renderFrameAndWait` would resolve without painting, producing blank frames.
- **Suggested fix:** Add a null check on `mapHandle.getCanvas()` inside the frame loop after each `waitForIdle` call. Or verify the canvas is still attached to the DOM.

### C4-VR05 — `generateDefaultScenes` produces scenes covering 0-100% but scene IDs are not unique across calls
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/camera.ts:219-269`
- **Detail:** Default scenes use fixed IDs like `'scene-1'`, `'scene-2'`, etc. If `generateDefaultScenes()` is called twice, the scene IDs would collide. However, this function is only called when no scenes exist, so collision is not a practical issue.
- **Suggested fix:** Low priority. Could use `generateId()` for uniqueness.

### C4-VR06 — Worker postMessage transfers ArrayBuffer ownership, making it unusable on main thread
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:690`
- **Detail:** `worker.postMessage({ ext: 'json', buffer }, [buffer])` transfers the ArrayBuffer to the worker. After transfer, the main thread's `buffer` reference becomes detached (zero-length). The `fallbackBuffer` is created before transfer (line 614) as a copy for small files. For large files (>16MB), no fallback copy exists, and the original buffer is transferred away. If the worker crashes and there's no fallback buffer, the user gets an error and must re-upload. This is documented behavior but could be confusing.
- **Suggested fix:** Already noted as C3-10 (partially resolved). Document the 16MB fallback limit in the UI.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 4 |
| **Total** | **6** |
