# Aggregate Review — Travelback (Cycle 6, 2026-07-17)

## Outcome

All thirteen required role reviews completed against `1d2755c`, were read independently, and produced their canonical artifacts. Cross-report deduplication retains **5 new actionable findings**: 2 Medium and 3 Low, all with High confidence. Three are product or user-facing documentation defects, one is a test-harness lifecycle defect, and one is a guide-asset mismatch. Security, performance, and dependency review found no new actionable issue.

Fresh evidence:

- `npm audit --audit-level=high --json` reported zero vulnerabilities across 579 dependencies; a current-source secret scan found no credential material.
- All 366 unit tests passed, but two independent runs emitted React's `act(...)` warning from the FileUpload import-ordering test.
- The isolated current-HEAD build, generated-worker parity, TypeScript, static generation, CSP hardening, and static smoke passed. Static Chromium then reported 94 passed, 1 expected opt-in real-WebCodecs skip, and zero failures or retries in 13.2 minutes.
- A second same-worktree dev server was not started because the existing `.next/dev/lock` belonged to live PID 80360 on port 3106. No process or port 3114 was touched; the browser pass used an isolated static workspace.
- At 1440×1000, Timeline occupied `(16,754,1408,102)`, Elevation occupied `(16,821.69,1408,40)`, and the 10×10 Reset center belonged to the elevation SVG. At 390×844, Reset was 10×45.77 and its center was still owned by Elevation. A real click sought playback while leaving the trim in place.
- Source-flow tracing confirmed that Retry Map preserves track preparation identity but carries no manual camera state, while detailed scene-normalization warnings bypass translations for their boundary labels.

## Deduplicated actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG6-01 | Medium / High | `src/components/MapView.tsx:843-885,899-914,1055-1083,1195-1203`; `e2e/travelback.spec.ts:594-704`; CR6-01, ARCH6-01, VR6-01, TRACE6-01, DB6-01, TE6-02, MINA6-02 | **Retry Map loses a manually controlled camera when Follow is off.** The replacement generation starts at `[0,20]`/zoom 2; the same track does not re-arm its consumed fit, and no manual camera snapshot survives teardown. Snapshot the outgoing center/zoom/pitch/bearing for the intended retry generation, restore it only under manual ownership, clear it on track replacement/removal, retain route-fit as a fallback, and cover the actual error/Retry path with Follow off. |
| AG6-02 | Medium / High | `src/components/TrackWorkspace.tsx:142-159`; `src/components/TimelineSelector.tsx:683-700`; `src/components/ElevationProfile.tsx:64-72,91-105`; current-browser geometry; VR6-02, TRACE6-02, DB6-02, DESIGN6-01, TE6-03, MINA6-01 | **Independent bottom bands overlap and route Reset clicks into Elevation.** Compose timeline, elevation, and playback in one non-overlapping responsive stack, give Reset the project's 44px target, and prove sibling separation, center-point ownership, successful reset, and unchanged playback at desktop and mobile viewports. |
| AG6-03 | Low / High | `src/components/SceneEditor.tsx:346-385,501-554,626-631`; `src/lib/i18n.ts` scene dictionaries; VR6-03, TRACE6-03, DB6-03, DESIGN6-02, TE6-04, MINA6-03 | **Detailed scene-normalization warnings hardcode `start:` and `end:`.** Render the whole correction through locale-owned templates so both visible and polite live-status output stay in the selected language. Cover a non-English adjusted-boundary path. |
| AG6-04 | Low / High | `src/components/FileUpload.test.ts:80-104`; verbose unit output; TE6-01, DB6-04 | **The FileUpload ordering test lets a resolved parse promise update React outside `act(...)`.** Drive a deferred promise to completion inside async `act`, retain the invocation-order assertion, and verify the settled result so green unit output is warning-free. |
| AG6-05 | Low / High | `public/guide/google-takeout-export.svg:12-26`; `src/components/GoogleGuide.tsx:266-270,351-360`; `src/lib/i18n.ts:167,182-190,211`; DOC6-01, CRIT6-02 | **The legacy Takeout illustration unconditionally promises Location History and `Records.json`.** Make the image explicitly conditional and legacy-only, accept compatible Timeline JSON variants in its wording, and add a lightweight asset-content regression so the prominent illustration cannot silently contradict the localized guide again. |

AG6-01 is the manual-ownership branch left outside Cycle 5's automatic style-pose repair, not a duplicate of the completed follow-on path. AG6-02's target size and missing test are part of the same overlap/hit-ownership defect. AG6-03's missing locale regression is likewise part of one localization defect. AG6-04 is test-only; AG6-05 is documentation-only.

## Explicit blocked and evidence-gated carryovers

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| B01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user explicitly authorizes the workflow edit; add the unit gate and validate syntax without dispatching or deploying. |
| B02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | The build job inherits Pages/OIDC writes. The same explicit CI/CD authority boundary applies. Exit: user authorizes the edit; narrow build permissions and grant write scopes only to deploy, without dispatching or deploying. |
| B03 | Medium / High | `README.md:225-227`, absent root `LICENSE` | The README claims MIT, but intended license, copyright holder, and year/range are unknown. Exit: the owner supplies exact legal intent and attribution; add the grant or correct the README claim. |
| B04 | Medium / Medium | `src/components/MapView.tsx:903-914` | Always-on `preserveDrawingBuffer` cost and the nearby “negligible” claim lack representative low-end/mobile GPU, memory, battery, and thermal evidence. Exit: record comparative p50/p95 frame time and memory plus battery/thermal observations on representative hardware, then isolate export capture if material. |

## Existing performance deferrals

These are not Cycle 6 discoveries and remain deferred only to their documented measurement or architecture boundaries:

- **D01 — High/High:** root-owned playback progress commits broad React state per foreground frame (`src/lib/usePlaybackController.ts:98-155`; consumers `src/app/page.tsx:180-232,577-595`). Exit: profile representative tracks, then introduce an imperative/external-store animation boundary preserving seek, camera follow, scenes, and export.
- **D02 — Medium/High:** elevation SVG strings contain every sample (`src/components/ElevationProfile.tsx:20-60,91-133`). Exit: profile near the supported point ceiling, implement distance-aware downsampling with endpoint/extrema guarantees, and add visual regressions.
- **D03 — Medium/High:** each waypoint drag move performs an O(n) total-distance scan (`src/components/JourneyCreator.tsx:194-198,363-373`). Exit: use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation, verified at a documented route-size target.
- **D04 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts:174-239`; `src/lib/videoEncoder.ts:223-247`). Exit: profile real exports and prove the second wait redundant before changing frame-correctness behavior.

B04 appears once under its existing representative-hardware evidence gate.

## Cross-review agreement

Code, architecture, verifier, tracer, debugger, test, critic, and traveler roles converged on AG6-01's missing manual-camera handoff. Verifier, tracer, debugger, designer, test, and traveler roles independently reproduced AG6-02's overlap and wrong pointer owner at both required viewports. The same roles converged on AG6-03's visible and live-region localization leak. Test and debugger roles isolated AG6-04 to a test promise lifecycle; documentation and critic roles identified AG6-05. Security rechecked trust boundaries, CSP/static hardening, parsers, workers, downloads, and dependencies without a new finding.

The proposed stale superseded-style error was rejected: MapLibre 5.24 aborts and suppresses superseded diff requests, the five bundled styles have no asynchronous source/sprite/glyph fan-out, and the existing held-request E2E released a stale request without error or pose mutation. Tailwind 4.3.3 registry drift from the locked 4.3.2 is maintenance-only, not a demonstrated current defect.

## Agent and process notes

All thirteen required role artifacts completed with no agent failure. No deployment, CI/CD mutation, production action, deletion, or pre-existing process/port action occurred. The isolated review created `/tmp/travelback-cycle6-browser.tMtY4J`, `/tmp/travelback-cycle6-static.10O3N4`, and `/var/folders/kz/t1c9x6qj5zgb2sg_4lv0nh900000gn/T/next-panic-77834f04e42c1f49ba6c236505512ebd.log`; none was deleted. They are added to the durable user-injected final-cleanup inventory and may be removed only at the loop's final stop condition after verifying they were run-created.
