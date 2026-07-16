# Aggregate Review — Travelback (Cycle 8, 2026-07-17)

## Outcome

All twelve required role reviews completed against `81342b7`, were read independently, and produced their canonical artifacts. Cross-report deduplication initially retained 4 findings; the mandatory exact-HEAD development gate then exposed one additional reproducible root cause. Cycle 8 therefore retains **5 new actionable findings**: 4 Medium and 1 Low, all with High confidence. No role failed. Security, performance, test, and critic review found no additional pre-gate root cause; the established authority, legal-input, representative-hardware, and measured-redesign carryovers remain unchanged.

Fresh evidence:

- `npm run lint`, direct no-emit TypeScript, generated-worker parity, `git diff --check`, all 393 unit tests, and `npm audit --audit-level=high` passed in the core review pass.
- A current-source parser probe passed one supported untimed `waypointPath` segment with A → B → A coordinates to the canonical adapter and received only A → B.
- A controlled current-component sequence dragged a Journey waypoint, delivered no immediate layer click, and then clicked the waypoint later; the first intentional delete was ignored because the drag latch was still set.
- A real-provider in-memory SSR/hydration probe rendered English statically and hydrated under `ko-KR`. React emitted one hydration-failure diagnostic, regenerated the tree, and then displayed Korean.
- The exact-HEAD development gate twice advanced playback while all 24 scene-camera samples remained at MapLibre's constructor pose `[0, 20]`, bearing `0`. The loaded UI reached 44.8% and 56.4% progress, while the track effect had made only one failed hydration attempt during a transient `isStyleLoaded() === false` window.
- Current hardened-output DOM, accessibility, and computed-style checks at 390×844 and 1440×1000 found no valid landing overflow, card/toolbar collision, or sub-44px exercised primary target. The unstyled `file://` native-input candidate was rejected after applying the real stylesheet in-page.
- No server, port, process, worktree, or temporary filesystem path was created or stopped during review. Interaction-dependent browser claims were not inferred from the non-hydrated `file://` session.

## Deduplicated actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG8-01 | Medium / High | `src/lib/googleJsonParser.ts:108-117,240-255`; parser probe; CR8-01, ARCH8-01, DB8-01, TRACE8-01, VR8-01 | **Segment-wide coordinate deduplication deletes legitimate untimed revisits.** A supported same-segment `waypointPath` A → B → A becomes A → B because unknown timestamps all contribute the same empty identity component. Preserve untimed observations in producer order while retaining exact timed-observation deduplication. Prove the exact three-point sequence through direct parser, generated worker, and upload UI coverage. |
| AG8-02 | Medium / High | `src/components/JourneyCreator.tsx:189-192,328-411,439-460`; controlled component reproduction; CR8-02, ARCH8-02, DB8-02, TRACE8-02, VR8-02 | **A completed drag can suppress an unrelated later waypoint deletion.** `settleDrag` starts a bounded generic-map-click deadline but leaves `dragMovedRef` latched until a point click consumes it, so the first future intentional point click may be ignored indefinitely. Give post-drag map and point suppression one bounded lifecycle independent of handler order; cover immediate synthetic clicks, expiry without a click, and the first later intentional delete. |
| AG8-03 | Medium / High | `src/lib/i18n.ts:1838-1845,1869-1888`; real-provider SSR/hydration probe; DESIGN8-01, DOC8-01, Mina | **Supported non-English preferences cause the static and hydration snapshots to disagree.** Static rendering selects English while the browser state initializer can select storage or `navigator.language` before hydration, making React discard and regenerate the localized provider tree. Hydrate from deterministic English, resolve the stored/browser preference after mount, update `document.lang`, and directly regress non-English SSR → hydration with no mismatch diagnostic. |
| AG8-04 | Low / High | `src/lib/i18n.ts:1669,1699`; DESIGN8-02, DOC8-02, Mina | **Two Spanish strings contain broken or mixed-language copy.** Replace `datos del cronología` with `datos de la cronología` and `Restablecer rango del timeline` with `Restablecer intervalo de la línea de tiempo`; pin both phrases in the reviewed-language regression. |
| AG8-05 | Medium / High | `src/components/MapView.tsx:1072-1111`; exact-HEAD dev gate trace and two failed attempts | **A track loaded during a transient not-ready style can remain detached from the map.** The track effect attempts hydration once and registers no later readiness callback, so playback state advances while route/trail/marker ownership and camera updates remain absent. Retry hydration on revision-owned `style.load`, `styledata`, and `idle` events until it succeeds; remove listeners on success, staleness, dependency cleanup, or unmount. Replace the scene-camera test's fixed delay with exact pose readiness and keep its authored scene active throughout sampling. |

AG8-01's parser, worker, and upload gaps are verification surfaces for one adapter-identity defect. AG8-02's stale point suppression and bounded generic-map suppression are one drag-terminal lifecycle defect. AG8-03 covers the first-load runtime failure; AG8-04 is a separate publication-quality copy defect. AG8-05 is a gate-discovered map lifecycle root cause, not a reclassification of the scene test's sampling window.

## Explicit blocked and evidence-gated carryovers

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| B01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user explicitly authorizes the workflow edit; add the unit gate and validate syntax without dispatching or deploying. |
| B02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | The build job inherits Pages/OIDC writes. The same explicit CI/CD authority boundary applies. Exit: user authorizes the edit; narrow permissions without dispatching or deploying. |
| B03 | Medium / High | `README.md:225-227`, absent root `LICENSE` | The README claims MIT, but intended license, copyright holder, and year/range are unknown. Exit: the owner supplies exact legal intent and attribution. |
| B04 | Medium / Medium | `src/components/MapView.tsx:920-930` | Always-on `preserveDrawingBuffer` cost lacks representative low-end/mobile GPU, memory, battery, and thermal evidence. Exit: record comparative p50/p95 frame time and memory plus battery/thermal observations, then isolate capture only if material. |

## Existing performance deferrals

- **D01 — High/High:** root-owned playback progress commits broad React state per foreground frame (`src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:173-232,577-595`). Exit: profile representative tracks, then isolate frame-frequency ownership while preserving seek, camera, scenes, and export.
- **D02 — Medium/High:** elevation SVG strings contain every sample (`src/components/ElevationProfile.tsx:20-60,91-133`). Exit: profile near the supported point ceiling and implement distance-aware downsampling with endpoint/extrema guarantees.
- **D03 — Medium/High:** each waypoint drag move performs an O(n) route-distance scan (`src/components/JourneyCreator.tsx:197-201,372-381`). Exit: measure and use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation. AG8-02 is a correctness-only lifecycle repair and does not perform this redesign.
- **D04 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts:181-240`; `src/lib/videoEncoder.ts:223-268`). Exit: profile real exports and prove redundant waiting before changing capture correctness.

## Cross-review agreement and rejected hypotheses

Code, architecture, debugger, tracer, and verifier independently converged on AG8-01 and AG8-02. Designer, documentation, and the custom non-technical traveler role converged on AG8-03 and AG8-04. Security rechecked all current trust boundaries without a new issue. Performance found only B04/D01-D04. Test review confirmed the current Cycle 7 regression catalog and retained only B01. Critic found no new root cause and retained only the known legal-input item B03.

AG8-05 surfaced after the role artifacts closed: the mandatory development matrix failed the same scene-camera case on its configured retry, and the retained trace showed that every camera sample was the constructor pose despite advancing playback. A retries-disabled isolated rerun without readiness happened to pass once, but a full-track scene rerun failed again; source tracing then confirmed the one-shot track/style hydration race. This evidence promoted the defect rather than weakening the motion threshold or recording it as harness-only flakiness.

The apparent unstyled native file input and invalid `file://` geometry were rejected once current CSS was loaded into the page. The existing semantic-revisit E2E fixture was not treated as proof against AG8-01 because its repeats occur in separate segments and therefore never meet the segment-local `Set`. Point-budget deduplication before normalization remains an intentional memory-protection boundary rather than a new defect. Timeline touch behavior remains an existing representative-device evidence question, not a new reproduced failure. No new secret, injection, retained-resource, unbounded-work, or unsupported-branch defect survived the final sweep.

## Agent and process notes

All twelve required artifacts completed with no agent failure. No deployment, CI/CD mutation, production action, deletion, temporary-tree creation, or pre-existing process/port action occurred. The durable user-injected cleanup item remains pending for the loop's final stop condition; Cycle 8 review added no filesystem path to its inventory.
