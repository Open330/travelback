# Verifier Review — Cycle 1

Date: 2026-07-23
Reviewed revision: `994820a71b0b`
Deployment: not performed

## Result

Three discrepancies were verified between stated behavior and the current implementation: the offline-after-load guarantee, automatic default scenes, and the documented export-stub byte count.

## Verification scope

The verifier cross-checked README.md, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, package commands, deployment workflow, every source/config/script/public-asset path, all 21 unit/component test files, and the complete Playwright suite and fixtures. Historical reports were not treated as proof. Fresh unit tests passed (472/472), and generated-worker parity passed.

## Findings

### VER-01 — “Works offline after initial page load” is not guaranteed for import or export

Severity: **Medium**
Confidence: **High**
Status: **Confirmed from resource lifecycle**

Stated behavior:

- `.context/project/02-architecture.md:119-128` says the client-only app “Works offline after initial page load.”

Implementation evidence:

- `src/lib/parser.ts:383` creates `/workers/trackParser.worker.js` only when a Google JSON parse begins. The initial document does not preload that public worker; `src/lib/parser.ts:461-476` can recover on the main thread only while the retained fallback is small enough.
- `src/lib/videoEncoder.ts:158` and `src/lib/videoEncoder.ts:375` dynamically import `mediabunny` only when encoding or codec probing begins.
- The repository contains no service worker, Workbox/PWA setup, precache manifest, or runtime cache that makes those late-requested resources available after connectivity is lost.

Concrete failure scenario: a user opens the landing page online, disconnects before importing a Google JSON file larger than the 16 MB fallback threshold, and then selects it. Creating the parser worker requires a new same-origin fetch; if it fails offline, `src/lib/parser.ts:461-469` rejects instead of decoding the large file on the main thread. A first-time export can likewise require a not-yet-cached dynamic chunk. All processing may be local once code is loaded, but that is a different guarantee from complete offline operation after the first paint.

Suggested fix: either narrow the documentation to the verified privacy claim (“no app-owned upload or third-party runtime data request; already-loaded features process locally”) or ship and test a service-worker precache covering the static shell, all Next chunks, parser worker, map styles, fonts, and export dependencies. Add an offline Playwright scenario after a clean first load.

### VER-02 — Default cinematic scenes are not auto-generated

Severity: **Low**
Confidence: **High**
Status: **Confirmed**

Stated behavior:

- `.context/project/02-architecture.md:98-105` says that when no scenes are defined, the six-scene Opening Overview → Closing Overview sequence is auto-generated.

Implementation evidence:

- `src/app/page.tsx:131` initializes scenes to `[]`, and `src/app/page.tsx:324-330` resets every new track to `[]`.
- `src/lib/camera.ts:534-538` explicitly returns one ordinary default-follow camera when normalized scenes are empty.
- `src/components/SceneEditor.tsx:604-663` invokes `generateDefaultScenes()` only after the user clicks the Cinematic preset.

Concrete failure scenario: a user imports a track and exports immediately without opening Camera. The video uses the default follow camera, not the documented six-scene cinematic sequence.

Suggested fix: update the architecture note to describe the empty-scene follow behavior and the opt-in Cinematic preset, or actually initialize the preset on track load if automatic cinematic composition is desired.

### VER-03 — The developer export stub is 22 bytes, not 26

Severity: **Low**
Confidence: **High**
Status: **Confirmed**

Evidence:

- `src/lib/test-stub.ts:1-18` describes and logs a “26-byte stub.”
- `src/lib/useExportController.ts:203-213` encodes the literal `travelback-test-export`.
- `new TextEncoder().encode('travelback-test-export').byteLength` is 22.
- `e2e/travelback.spec.ts:2955-2957` repeats the 26-byte description.

Concrete failure scenario: diagnostics or tests that use the documented size to distinguish a stub artifact from a real MP4 report the wrong invariant.

Suggested fix: define the stub payload once, derive its length in diagnostics/tests, and remove hard-coded byte counts from comments.

## Missed-issue sweep

The final verifier pass checked import limits and supported JSON shapes, local-only map assets, base-path behavior, codec probing, resolution/duration limits, camera labels/defaults, localization parity, static CSP statements, and build/run commands. Other statements were either supported by code/tests or appropriately qualified.
