# Cycle 12 Reviewer A — source-only review

## Review boundary

- Target: `d62b13ce3f7b89aefe71fbc2ad6bf0b3fbc0d789`
- Perspectives: code quality and logic, architecture and cross-file tracing, performance, security, documentation, and dependency/configuration consistency.
- Method: exhaustive source-only inventory and inspection of tracked application, component, library, worker, script, style, test, workflow, configuration, and project-documentation files. Generated dependency/build trees and binary asset contents were excluded; their tracked references and configuration were inspected.
- Runtime/browser work was intentionally not performed. The requested designer-browser pass is infeasible under this cycle's source-only/no-browser constraint.

## Outcome

- Confirmed new findings: **3** (`3 Medium`)
- Likely findings: **0**
- New manual-validation findings: **0**
- Existing carryovers preserved, not relabeled: `B01`–`B04`, `M10-01`/`M9-01`, `D01`–`D04`, and `U-2026-07-17-01`.

## Confirmed findings

### C12-A01 — A newer drop is silently discarded while file parsing is pending

- Severity: **Medium**
- Confidence: **High**
- Locations:
  - `src/components/FileUpload.tsx:118-150`
  - `src/components/FileUpload.tsx:165-169`
  - `src/app/page.tsx:603-610`
  - `src/components/FileUpload.test.ts:81-155`
  - `.context/plans/cycle11-implementation-2026-07-17.md:99-118`
- Cause and trace: `handleFileIntent` owns the intended replacement protocol: it calls `onImportStart`, invalidates the previous parse generation, aborts the previous controller, preflights the new file, and starts its parse. `handleDrop`, however, returns immediately when `loading` is true, before it reads the dropped file or reaches `handleFileIntent`. The drop zone remains a live drop target while the picker is disabled, so this path is user-reachable. At the page boundary, `onImportStart` is the callback that invalidates held sample/import ownership.
- Failure scenario: a user drops a large or slow file, notices it is the wrong one, and drops the correct file before parsing finishes. The newer intent produces no feedback, does not abort the first parse, and does not notify the parent. The original file eventually wins and loads despite the user's later action.
- Evidence: the component tests cover accepted and rejected picker/drop intents while idle, and the held-parse test covers sample invalidation, but no test holds one file parse and drops a second file. The Cycle 11 ownership contract explicitly requires notification exactly once for every newer file intent; the pre-handler loading return bypasses that contract.
- Deduplication note: Cycle 4 intentionally introduced the loading-time no-op to prevent concurrent parsing. This is not a re-report of that old race: Cycle 11 subsequently introduced abort/generation ownership and broadened the callback contract to every newer file intent, but the older guard was not reconciled with it.
- Suggested fix: route a drop received during loading through `handleFileIntent` as a replacement intent and rely on the existing abort plus generation guard to prevent stale completion. Keeping the native picker disabled is compatible with this change. Add a regression that holds parse A, drops file B, asserts A is aborted, asserts `onImportStart` fires once for each intent, lets stale A settle without effect, and verifies B alone owns completion.

### C12-A02 — Committed scene camera changes do not refresh a paused map pose

- Severity: **Medium**
- Confidence: **High**
- Locations:
  - `src/app/page.tsx:487-523`
  - `src/components/SceneEditor.tsx:462-490`
  - `src/components/MapView.tsx:447-451`
  - `src/components/MapView.tsx:806-820`
  - `src/components/MapView.tsx:1147-1223`
  - `e2e/travelback.spec.ts:2327-2399`
  - `e2e/travelback.spec.ts:2492-2510`
- Cause and trace: committing scene changes only updates root scene state and resets export state. `MapView` copies the new scenes into refs and clears `lastCameraStateRef`, but its camera-application effect is not keyed by scenes or a scene revision. At a stable paused progress value, that effect therefore does not rerun. `SceneEditor.updateScene` invokes the imperative preview callback only when `patch.params` is present; a camera-mode change resets params internally but sends a `cameraMode` patch, so it does not preview. Preset, add/delete, range, and transition commits similarly have no general current-pose refresh path.
- Failure scenario: pause at the middle of a journey and change the active scene from Flyover to Orbit/Ground or apply a camera preset. The editor and eventual export use the new scene, while the visible map remains in the previous pose until the user seeks, resumes playback, or triggers another camera hydration event. The paused preview therefore disagrees with the saved/exported result.
- Evidence: the existing parameter-preview E2E path validates temporary parameter preview and clearing. The camera-mode test asserts the selected control value, but does not assert the live map camera after a paused mode or preset commit. The source dependency graph has no other imperative camera update for these commits.
- Deduplication note: this is distinct from the earlier parameter-preview clear fix, style-retry stale-pose work, and transition-interpolation findings. It concerns committed scene revisions while progress is stationary.
- Suggested fix: give `MapView` a committed-scene revision trigger or an imperative `refreshCurrentPose` operation that recomputes the camera from the new normalized scenes at the current progress. Use that single path for mode, preset, add/delete, range, and transition commits, while preserving temporary parameter preview behavior. Add a paused-map regression that observes the debug camera before and after a mode/preset commit without seeking or playing.

### C12-A03 — Degenerate tracks near a pole generate an invalid fit-bounds latitude

- Severity: **Medium**
- Confidence: **High**
- Locations:
  - `src/components/MapView.tsx:99-135`
  - `src/components/MapView.tsx:897-899`
  - `src/lib/parser.ts:45-58`
  - `src/lib/parser.ts:185-203`
  - `src/lib/googleJsonParser.ts:48-80`
  - `src/lib/parser.test.ts:1130-1139`
  - `package-lock.json:6502-6506`
- Cause and trace: all import paths correctly accept geographic boundary latitudes of `-90` and `90`, and the parser regression explicitly treats them as valid. For a degenerate bounding box, `buildFitBounds` expands both coordinates by `0.1` without clamping latitude. Coincident points at latitude `90` therefore produce a north bound of `90.1` (and coincident points above `89.9` can do the same). The locked MapLibre implementation validates `LngLat` latitude and throws outside `[-90, 90]`; the new-track hydration path passes the generated bounds directly to `map.fitBounds`.
- Failure scenario: a valid file containing two coincident observations at the North or South Pole passes parsing and the minimum-point check, then fails while the map hydrates its fit bounds. The same failure is possible for any all-identical track sufficiently close to a pole.
- Evidence: parser validation and tests establish that the input is accepted by design; the degenerate expansion is unconditional; and MapLibre `5.24.0` is the resolved dependency. No bounds test covers pole-adjacent identical points.
- Deduplication note: earlier review of the fixed `0.1` degenerate padding discussed visual distortion, and the antimeridian work addressed shifted longitude space. Neither identified the out-of-domain latitude passed to MapLibre.
- Suggested fix: clamp the expanded latitude to the valid rendering domain and make pole expansion asymmetric/inward when one side is already at the ceiling. Extract the bounds calculation into a testable pure helper and cover identical points at `90`, `-90`, and near-pole values, alongside the existing antimeridian cases.

## Likely findings

None. All new items above have complete source-level causal traces; speculative observations were excluded.

## Manual validation

No new manual-only item was added. The existing physical-device/accessibility carryovers `M10-01` and `M9-01` remain open and unchanged. No browser or live visual validation was attempted in this source-only pass.

## Perspective closure

- Security: no new exploitable trust-boundary defect was found. Workflow permission/test omissions remain the already-ledgered `B01` and `B02`.
- Performance: no new unique performance defect was found. The root progress fan-out, elevation ceiling, drag-time distance scan, duplicate export idle wait, and always-on drawing-buffer costs remain `D01`–`D04` and `B04`.
- Architecture/trace: the two ownership/update propagation gaps above are the new cross-component findings.
- Documentation/legal: no new documentation defect was found. Missing license artifact/legal inputs remain `B03`.
- Dependencies/configuration: manifest and lockfile references were internally consistent for the inspected dependency paths. No new source-evident version/configuration defect was found; external advisory freshness was not re-queried because this cycle was constrained to source-only review.
- Cleanup: `U-2026-07-17-01` remains the final-stop cleanup item; this review performed no deletion or cleanup mutation.
