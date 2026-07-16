# Aggregate Review — Travelback (Cycle 5, 2026-07-16)

## Outcome

All twelve required role reviews completed against `bdfb1d7`, were read independently, and produced their canonical artifacts. Cross-report deduplication retains **5 new actionable findings**: 4 Medium and 1 Low, all with High confidence in the reported defect or test/documentation weakness. The security and performance reviews found no new issues. No deployment, CI/CD mutation, process termination, or production action occurred.

Fresh evidence:

- `npm audit --audit-level=high --json` reported zero vulnerabilities, and the secret scan found no credentials.
- The full dev E2E run reported 91 passed, 1 skipped, and 1 flaky across 93 tests in 12.3 minutes. The retry-only Journey Creator case then passed a focused retries-disabled 3/3 run; uncontrolled concurrent browser-export load makes the first failure unsuitable as evidence of a product defect, but the fixed-delay test remains demonstrably timing-dependent.
- Actual-app browser coverage included 1440×1000 desktop and 390×844 mobile, landing and loaded workspaces, playback, Camera, Export, light/dark, EN/KO, reduced motion, keyboard/focus, responsive geometry, error/loading states, runtime requests, and storage.
- At 390×844, attribution occupied `(295.64, 810, 84.36, 24)` while the playback time occupied `(307.89, 809, 55.11, 16)`; hit testing returned the time element instead of attribution. Desktop also placed attribution under the translucent playback surface.
- A loaded workspace switched from English to Korean visually and updated `document.lang`, but its existing `role=status` content remained `Track loaded: Namsan Tower Walk`.
- Source control-flow tracing confirmed that style readiness recreates track sources and trail state but does not rerun the current playback marker/camera transaction.

## Deduplicated actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG5-01 | Medium / High | `src/components/MapView.tsx:676-700,791-817,844-1009`; `e2e/travelback.spec.ts:429-442`; CR5-01, ARCH5-01, DB5-01, TRACE5-01, VR5-01 | **Post-style hydration restores layers but not the current playback pose.** At paused nonzero progress, ordinary style replacement can reset the GeoJSON marker while leaving the HTML marker current; Retry Map resets both markers and fits the whole route instead of restoring follow/scene camera state. Publish a stale-safe style-ready revision or run one idempotent post-style transaction that restores trail, both marker representations, and current camera ownership. Cover ordinary style replacement and the actual Retry Map path at nonzero progress. |
| AG5-02 | Medium / High | `src/app/globals.css:214-257`; `src/components/TrackWorkspace.tsx:142-174`; `src/components/Controls.tsx:147-154`; runtime geometry; CRIT5-01, DESIGN5-01, TEST5-02 | **MapLibre attribution overlaps playback controls and loses pointer ownership.** Reserve an unobscured responsive attribution safe area without hiding credit, then prove non-intersection, pointer hit ownership, focus visibility, and keyboard activation on desktop and mobile. |
| AG5-03 | Low / High | `src/app/page.tsx:329-341,638-642`; `src/lib/i18n.ts:1873-1887`; runtime EN→KO trace; CRIT5-02, DESIGN5-02, TEST5-03 | **An already-populated live status keeps its load-time language.** Store semantic track data rather than a translated sentence, and derive the status from the current locale so visual and assistive layers remain consistent. Add a loaded-workspace locale-switch regression. |
| AG5-04 | Medium / High for test weakness; product defect unconfirmed | `e2e/travelback.spec.ts:444-489`; `src/components/JourneyCreator.tsx:286-318`; full-suite retry plus focused 3/3 run; TEST5-01 | **The active Journey Creator retry test clicks after a fixed delay instead of deterministic interaction readiness.** Expose and await the state reached only after layers and listeners bind, then require a retries-disabled repeated regression. Do not lengthen the sleep. If early clicks are part of the product contract, queue or visibly gate them. |
| AG5-05 | Medium / High | `.context/agents/non-tech-traveler-reviewer.md:133-148`; `package.json:17-20`; `scripts/run-dev-e2e.mjs:14-57`; `playwright.config.ts:44-48`; DOC5-01 | **Mina's runbook recommends `kill -9`, bypasses the safe E2E wrapper, and describes stale runner semantics.** Remove process-killing instructions, make `npm run test:e2e` the ordinary path, document the wrapper's server/port ownership and an explicitly owned focused diagnostic path, and update the suite/fixture summary without a brittle exact count. |

AG5-01 is the style-readiness variant left after Cycle 4 fixed constructor replacement and consumer rebinding. AG5-02 and AG5-03 are each one product defect independently reported by critic, designer, traveler, and test coverage roles; their missing regressions are not separate findings. AG5-04 is scheduled because retry-masked timing is itself actionable even though the product failed only under uncontrolled load. AG5-05 is documentation-only and requires no process action.

## Explicit blocked and evidence-gated carryovers

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| B01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user explicitly authorizes the workflow edit; add the unit gate and validate syntax without dispatching or deploying. |
| B02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | The build job inherits Pages/OIDC writes. The same explicit CI/CD authority boundary applies. Exit: user authorizes the edit; narrow build permissions and grant write scopes only to deploy, without dispatching or deploying. |
| B03 | Medium / High | `README.md:225-227`, absent root `LICENSE` | The README claims MIT, but intended license, copyright holder, and year/range are unknown. Exit: the owner supplies exact legal intent and attribution; add the grant or correct the README claim. |
| B04 | Medium / Medium | `src/components/MapView.tsx:582-595` | Always-on `preserveDrawingBuffer` cost and the nearby “negligible” claim lack representative low-end/mobile GPU, memory, battery, and thermal evidence. Exit: record comparative p50/p95 frame time and memory plus battery/thermal observations on representative hardware, then isolate export capture if material. |

## Existing performance deferrals

These are not Cycle 5 discoveries and remain deferred only to their documented measurement or architecture boundaries:

- **PERF5-CARRY-01 — High/High:** root-owned playback progress commits broad React state per foreground frame (`src/lib/usePlaybackController.ts:98-155`; consumers `src/app/page.tsx:180-232,577-595`). Exit: profile representative tracks, then introduce an imperative/external-store animation boundary preserving seek, camera follow, scenes, and export.
- **PERF5-CARRY-02 — Medium/High:** elevation SVG strings contain every sample (`src/components/ElevationProfile.tsx:20-60,91-133`). Exit: profile near the supported point ceiling, implement distance-aware downsampling with endpoint/extrema guarantees, and add visual regressions.
- **PERF5-CARRY-03 — Medium/High:** each waypoint drag move performs an O(n) total-distance scan (`src/components/JourneyCreator.tsx:194-198,363-373`). Exit: use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation, verified at a documented route-size target.
- **PERF5-CARRY-05 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts:174-239`; `src/lib/videoEncoder.ts:223-247`). Exit: profile real exports and prove the second wait redundant before changing frame-correctness behavior.

B04 is also catalogued by the performance review as PERF5-CARRY-04; it appears once in this aggregate under its existing evidence-gated ID.

## Cross-review agreement

Code, architecture, debugger, tracer, and verifier roles converged on AG5-01's split style/pose transaction. Critic, designer, traveler, and test roles independently reproduced AG5-02 and AG5-03. The test role isolated AG5-04 from a product claim by rerunning it without retries, while the documentation role connected AG5-05 to the repository's lock-aware wrapper. Security rechecked client trust boundaries, CSP/static hardening, parsers, workers, object URLs/downloads, and dependencies without a new finding.

## Agent and process notes

All twelve required role artifacts completed. The full E2E run's HTML reporter opened a local report viewer after the flaky first attempt. No OS process was stopped or killed; only the review subagent turn was interrupted and resumed with a non-HTML reporter. The pre-existing viewer processes remain outside this cycle's mutations.
