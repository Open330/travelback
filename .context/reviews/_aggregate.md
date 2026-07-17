# Aggregate Review — Travelback (Cycle 9, 2026-07-17)

## Outcome

All twelve required role reviews completed against `342b8c13f005c3abd072dddb27f002722c3fb1e8`, were read independently, and produced their canonical artifacts. Cross-report deduplication retained **6 confirmed actionable roots**: 3 Medium and 3 Low, all with High confidence. Strict disposition of the source-evidenced but physical-device-inconclusive selected-region touch concern adds **1 authorized Medium/Medium hardening item** instead of silently dropping or downgrading it. Cycle 9 therefore schedules **7 new implementation items** in total. The map-canvas focus-ring suspicion remains a formal manual-validation item with a concrete exit criterion. No role failed.

Fresh evidence:

- Core review passed ESLint, direct no-emit TypeScript, generated-worker parity, all 17 Vitest suites / 400 tests, `git diff --check`, and `npm audit` with 0 vulnerabilities.
- Deterministic camera arithmetic reproduced an approximately 8-level zoom, 50-degree pitch, and 90-degree bearing reversal immediately after a touching boundary. With a supported 20% internal gap, the existing branches also produce two approximately 22 km backward center snaps.
- The hardened exact-HEAD static application built and completed agent-browser desktop/mobile, light/dark, English/Korean, accessibility-tree, focus, scene, playback, and export interaction. A focused production-static Playwright matrix passed 9/9 with retries disabled across seven supported travel-log representations and two full journeys.
- Live 1440x1000 geometry showed each Scene Editor camera select extending 30px past its clipped panel. Live export state showed `BODY` focused while progress and Cancel were visible. The accessibility tree exposed a non-actionable `button "Map marker"`.
- Live 390x844 geometry left only about 31px of the nominal 44px end-handle box inside the viewport. This remains above WCAG 2.5.8's 24px minimum, but contradicts the product's explicit 44px touch-target intent.
- The UX review used the required agent-browser core, configuration, interaction, query, wait, network, visual, debug, state, and storage workflows in `/tmp/travelback-cycle9-ux-review`. Its exact-HEAD static helper owns isolated port 48179 / unified exec session 6306 and is left to its natural bounded lifecycle; no process was stopped, killed, or reused.

## Deduplicated actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG9-01 | Medium / High | `src/lib/camera.ts:540-631`; CR/ARCH/DB/TRACE camera reviews | **Touching-scene transitions restart and internal-gap interpolation is replayed at both ends.** Give each adjacent-pair interval one exclusive owner: one monotone boundary-centered transition for touching scenes, the existing full interval for a real gap, and ordinary scene evaluation elsewhere. Preserve stable rotation anchors without freezing moving-mode centers. Add numeric continuity/monotonicity coverage at boundary/window/gap endpoints, unequal short scenes, and zero transition duration. |
| AG9-02 | Medium / High | `src/components/SceneEditor.tsx:560-562,656-684`; live 1440x1000 geometry; CR/VR/TE/DESIGN/Mina | **Camera-mode selects overflow the Scene Editor and lose their native disclosure affordance.** Make the flex child shrink within the panel (`min-w-0` plus an explicit width constraint) and assert containment at desktop/mobile widths and with long shipped locale labels. |
| AG9-03 | Medium / High | `src/components/ExportPanel.tsx:242-249,352-379`; `src/components/ModalDialog.tsx:93-167`; live active-element trace; CR/VR/TE/DESIGN/Mina | **Starting export unmounts the focused control and leaves focus on `body` while rendering.** Focus Cancel or a deliberate rendering status on the idle-to-exporting transition, preserve Escape cancellation and success focus, and regress the dynamic transition rather than only initial dialog trapping/completion. |
| AG9-04 | Low / High | `src/components/MapView.tsx:775-797`; MapLibre marker behavior; live accessibility tree; CR/VR/TE/DESIGN/Mina | **The decorative playback marker is announced as an actionable `Map marker` button.** Give the custom marker truthful decorative/presentation semantics before MapLibre attaches it and assert no false marker button is exposed. |
| AG9-05 | Low / High | `src/components/TimelineSelector.tsx:555-639`; live 390x844 geometry; CR/VR/TE/DESIGN/Mina | **Nominal 44px timeline endpoint targets extend beyond the mobile viewport.** Keep the complete hitboxes within the timeline interaction surface at 0% and 100% while preserving range values, and assert viewport intersection equals nominal geometry. |
| AG9-06 | Low / High | `src/lib/i18n.ts:521-526,683-689`; live Korean control; CR/VR/TE/DOC/DESIGN/Mina | **Korean map-style labels compose into adjective fragments (`지도: 밝은` / `지도: 어두운`).** Use standalone parallel style names (`라이트` / `다크`) and pin the reviewed complete phrases; dictionary-key parity alone is insufficient. |
| AG9-07 | Medium / Medium | `src/components/TimelineSelector.tsx:447-463,533-553`; handle parity at `555-639`; manual-only reviewer note | **The selected-region gesture owner leaves browser touch-action at `auto` while its handles opt out and movement is observed by a passive window listener.** Physical Safari/Android reproduction was inconclusive, but the failure mode can cancel or steal horizontal region movement. Apply the safe, standards-aligned `touchAction: 'none'` contract to the region and cover both the computed contract and a CDP touch drag after trimming. This explicit implementation disposition replaces deferral. |

AG9-01 is one resolver-ownership defect even though it manifests at touching boundaries and both endpoints of a real gap. AG9-02 through AG9-06 are five distinct user-facing roots shared across the UX reports. AG9-07 is intentionally transparent about its Medium confidence: it is scheduled because the source contract is inconsistent and the remedy is local, reversible, and regression-testable, not because the review invented a physical-device failure.

## Formal manual-validation item

| ID | Severity / confidence | Scope | Reason and exit criterion |
| --- | --- | --- | --- |
| M9-01 | Low / Medium | MapLibre canvas emitted by `src/components/MapView.tsx:1220-1265`; viewport clipping in `src/app/globals.css:19-25` | The focused full-viewport canvas computed only a 1px user-agent outline at the exact clipped viewport edge, but the browser pass did not establish reliable perceptibility loss. Exit: keyboard-focus the canvas on representative desktop/mobile browsers at 100% and 200% zoom in light, dark, and forced-colors modes; capture visual evidence and measure visible focus pixels. If any edge lacks a perceptible indicator, add an inset authored focus style plus automated computed-style/geometry coverage. |

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
- **D03 — Medium/High:** each waypoint drag move performs an O(n) route-distance scan (`src/components/JourneyCreator.tsx:197-201,372-381`). Exit: measure and use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation.
- **D04 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts:181-240`; `src/lib/videoEncoder.ts:223-268`). Exit: profile real exports and prove redundant waiting before changing capture correctness.

## Cross-review agreement and rejected hypotheses

Code, architecture, debugger, and tracer independently converged on AG9-01. Critic, verifier, test, designer, and the custom non-technical traveler role converged on AG9-02 through AG9-06; documentation independently confirmed AG9-06. Security and performance found no new root. Test review mapped each confirmed UX defect to a missing right-reason regression.

MapView `styledata` re-entrancy was rejected after tracing MapLibre 5.24 source: source/layer operations schedule style updates rather than synchronously emitting the readiness event, and successful/stale handlers remove their listener set synchronously. A cross-segment bearing hypothesis was rejected after following cumulative-distance plateau and segment-bound logic. Tailwind and `@tailwindcss/postcss` 4.3.3 are one compatible patch newer than the lock's 4.3.2, but ranges already admit the patch, audit is clean, and version freshness alone is not a defect. The selected-region physical-device failure was not claimed as confirmed; AG9-07 records the explicit safe-remediation decision. Canvas focus visibility remains M9-01 rather than an invented failure.

## Agent and process notes

All twelve required artifacts completed with no agent failure, and all twelve were read before aggregation. No deployment, workflow edit/dispatch, production mutation, deletion, external communication, or pre-existing process/port action occurred. The isolated UX helper is documented in the durable cleanup inventory and must exit through its own session lifecycle. The user's final-cleanup instruction and every previously inventoried run-created path remain pending for the loop's final stop condition.
