# Aggregate Review — Travelback (Cycle 4, 2026-07-16)

## Outcome

All twelve required role reviews completed against `4917d39`, were read independently, and passed artifact validation. After cross-report deduplication, this aggregate retains **6 new or newly confirmed actionable findings**: 4 Medium and 2 Low, all with High confidence. It also confirms **3 unresolved Medium/High correctness carryovers** that must be implemented in this cycle rather than deferred. The security review found zero new security issues. No deployment was attempted.

Fresh review evidence:

- `npm run lint` passed in the code/performance pass.
- `npm run test` passed 15/15 files and 352/352 tests, while exposing repeated React act-environment warnings isolated to `FileUpload.test.ts`.
- `npm audit --audit-level=high` reported zero vulnerabilities.
- The previously retry-only timeline keyboard test passed 10/10 consecutive static runs with retries disabled; Cycle 3 watch item W01 remains closed.
- Desktop 1440×1000 and mobile 390×844 browser journeys covered landing, loaded track, playback, timeline, Camera, More controls, Export, light/dark, reduced motion, focus, geometry, console/page errors, and local requests.
- Focused runtime traces reproduced map-arrow playback hijacking (`0` → `0.02`), an unchanged 0% trim handle opening the scene-discard dialog, loaded-map retry losing its marker, Journey Creator becoming inert after retry, and a system appearance change replacing map style during an active export.
- Independent Prompt 1 typecheck evidence was inconclusive because an already-running Next dev process concurrently regenerated `.next/dev/types/routes.d.ts`; this is a shared generated-artifact limitation, not a source finding. The final gate matrix will run from an isolated exact-HEAD copy.

## Deduplicated actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG4-01 | Medium / High | `src/components/MapView.tsx:577-671,841-1006`; `src/components/JourneyCreator.tsx:284-517`; two browser reproductions | **In-app Retry Map replaces the MapLibre object without rehydrating all consumers.** A loaded route loses its HTML marker/camera, and an active Journey Creator remains bound to the destroyed map. Make map generation/readiness observable, hydrate current track/progress/marker state for every generation, rebind creator listeners without losing waypoints, and cover both retry paths through the actual button. |
| AG4-02 | Medium / High | `src/app/page.tsx:265-291`; `src/components/MapView.tsx:452-478,673-697`; `src/lib/useExportController.ts:205-234` | **A system appearance event can call `map.setStyle()` during export.** Modal inertness blocks controls but not `MediaQueryList`; the shared render surface can lose sources or time out mid-frame. Freeze/defer theme-derived map-style changes for the export lease, then apply the latest system preference after cleanup, with deterministic concurrent E2E coverage. |
| AG4-03 | Medium / High | `src/lib/usePlaybackController.ts:188-218`; rendered MapLibre canvas | **Global playback arrows hijack MapLibre keyboard navigation.** When the focusable map canvas receives ArrowRight, playback advances 2% and the default map gesture is prevented. Exclude the interactive map canvas from playback hotkeys while preserving neutral-context seek behavior; add E2E coverage for both owners. |
| AG4-04 | Medium / High | `src/components/TimelineSelector.tsx:350-367,576-593`; `src/app/page.tsx:344-362`; focused runtime trace | **A semantic no-op trim asks to discard camera scenes.** At an already-accepted 0% boundary, ArrowLeft leaves the handle unchanged but still starts the destructive scene-invalidating transaction. Ignore accepted index pairs equal to the current accepted range before resetting export or prompting; preserve scenes, focus, playback/export state, and point count. |
| AG4-05 | Low / High | `src/components/FileUpload.test.ts:1-99`; fresh unit stderr | **FileUpload tests omit the React act-environment flag.** Green runs emit repeated act-configuration warnings, obscuring future real state-update warnings. Align this createRoot harness with the other component tests and require a warning-free focused run. |
| AG4-06 | Low / High | `README.md:155-184`; `.context/project/01-overview.md:15-28`; `package.json:16-20`; `scripts/run-dev-e2e.mjs:35-62` | **Contributor test instructions omit Vitest and recommend the low-level dev E2E command.** Document Vitest plus Playwright, list `npm test` and the canonical `npm run test:e2e` wrapper, and align the project overview. |

AG4-01 is a confirmed reopen of a historical map-readiness risk whose prior exit criterion required a failing active-panel path; the new Journey Creator reproduction meets it. AG4-02 is the still-live system-event variant of an older direct-control concern; direct controls are now inert during export, but media-query events bypass that boundary.

## Unresolved correctness carryovers to implement now

These are not counted as Cycle 4 discoveries, but current source tracing confirms them and no authority/evidence boundary prevents repair.

| ID | Original severity / confidence | Current evidence | Required outcome |
| --- | --- | --- | --- |
| CR4-CARRY-01 | Medium / High | `src/lib/useExportController.ts:131-146,279-318` | Acquire an export lease synchronously, reject same-tick re-entry, cancel the owner, and release only by controller identity. Add a concurrent controller test. |
| CR4-CARRY-02 | Medium / High | `src/lib/googleJsonParser.ts:97-123` | Choose semantic activity-path fallbacks by accepted-point result, not array presence. Cover empty/all-invalid preferred paths, regenerate the worker, and verify parity. |
| CR4-CARRY-03 | Medium / High | `src/components/JourneyCreator.tsx:360-399,519-531` | Expose one idempotent drag settlement to effect listeners and component actions. Settle before Undo, Clear, Cancel, completion, teardown, and unmount; test active mouse/touch mutations. |

## Explicit blocked and evidence-gated carryovers

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| B01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user authorizes the workflow edit; add the unit gate and validate without dispatch/deploy. |
| B02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | Build inherits Pages/OIDC writes. Same CI/CD authority block. Exit: explicit authorization; narrow build permissions and grant writes only to deploy. |
| B03 | Medium / High | `README.md:224-226`, absent root `LICENSE` | Intended license, holder, and year/range are unknown. Exit: user supplies exact legal intent/attribution, then add the grant or correct the README claim. |
| B04 | Medium / Medium | `src/components/MapView.tsx:582-592` | `preserveDrawingBuffer` cost needs representative low-end/mobile hardware evidence. Exit: record comparative p50/p95 frame time, memory, battery/thermal observations, then isolate export capture if material. |

## Existing performance deferrals

These non-correctness items were rechecked and not worsened by current code. They remain deferred only to their documented measurement or architecture boundaries:

- **PERF4-CARRY-01 — High/High:** root-owned playback progress commits broad React state per animation frame (`src/lib/usePlaybackController.ts:98-155`). Exit: a dedicated profiled ownership redesign preserving seek, scenes, camera, and export behavior.
- **PERF4-CARRY-02 — Medium/High:** elevation SVG paths scale with every point (`src/components/ElevationProfile.tsx:20-60`). Exit: large-track profiling plus distance-aware downsampling and visual regression coverage.
- **PERF4-CARRY-03 — Medium/High:** manual waypoint dragging recomputes total distance on every move (`src/components/JourneyCreator.tsx:192-196,360-369`). Exit: a Journey Creator performance pass with incremental/throttled preview and exact terminal commit.

## Cross-review agreement

Critic, verifier, and debugger independently converged on the two resource-ownership failures: map identity changes without consumer dependencies, and export ownership does not cover the independent system-theme map mutator. Test, design, and traveler reviews independently converged on map-arrow ownership and destructive no-op trimming. Code, architecture, and tracer reports agreed on the three unresolved correctness carryovers. Security found the client-only trust boundary, parser limits, CSP/static hardening, object URLs, downloads, worker isolation, and dependency state sound.

## Agent failures

None. All twelve required role artifacts were produced at their exact paths. Each assigned subagent completed successfully; the main cycle agent produced the remaining four roles and performed the final missed-issue sweep.
