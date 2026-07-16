# Aggregate Review — Travelback (2026-07-16, Cycle 3)

## Outcome

All twelve required role reviews completed against `3b6750f`, were read independently, and passed artifact validation. After cross-report deduplication, this aggregate retains **11 new confirmed findings**: 7 Medium and 4 Low, all with High confidence. The security reviewer found zero new security issues. Four unresolved cycle-1/2 items remain explicitly separated as authority-, legal-input-, or representative-evidence-gated carryovers. No deployment was attempted.

Fresh review evidence:

- `npm run lint`, `npm run typecheck`, `npm run test` (295/295), `npm audit --audit-level=high` (zero vulnerabilities), `npm run build`, the generated-worker drift check, and `npm run smoke:static` passed.
- Targeted Playwright journeys passed 7/7 for GPX, KML, and the five documented Google JSON families, with no page or console errors.
- A 390×844 touch-browser trace reproduced stale timeline cancellation and export-sheet swipe transactions. The timeline trace moved from 20/20 points to 5/20 after an unrelated post-cancel gesture.
- Installed Mediabunny 1.40.1 source/types confirmed that generic `canEncode(codec)` probes 1280×720 at 1 Mbps while `canEncodeVideo(codec, { width, height, bitrate })` accepts the actual configuration.
- Focused parser/interpolation traces confirmed null-member dereferences, scalar numeric coercion, all-zero playback pinning, and an unreachable final singleton segment.

## Deduplicated new findings

### Runtime correctness, lifecycle, and camera semantics

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG3-01 | Medium / High | `src/components/JourneyCreator.tsx:358-395,408-416,444-460` | **Waypoint drag does not settle after an outside-map mouse release.** The live index and disabled `dragPan` survive because settlement listens only for MapLibre's public map `mouseup`. Use an explicit window/document terminal event or pointer capture, route all exits through idempotent cleanup, and regression-test outside-canvas release. |
| AG3-02 | Medium / High | `src/components/TimelineSelector.tsx:291-347,368-435`; fresh mobile trace | **A cancelled timeline drag remains armed and can commit a later unrelated gesture.** Add a true cancellation path for `touchcancel` and blur that restores the origin/accepted ratios, cancels pending rAF work, clears transient refs, and never calls `onRangeChange`. Prove the next gesture is isolated. |
| AG3-03 | Medium / High | `src/lib/camera.ts:274-288`, `src/components/MapView.tsx:945-958`, `src/lib/map-geometry.ts:23-57` | **Camera look-ahead crosses deliberate segment breaks.** Default follow and bird's-eye can turn toward a disconnected later city even though route/trail geometry does not connect it. Derive current segment bounds, clamp anticipation within them, and use an in-segment fallback bearing at the endpoint. |
| AG3-04 | Medium / High | `src/lib/googleJsonParser.ts:60-170,347-367`, `src/lib/parse-utils.ts:32-38` | **Google JSON walkers dereference null array members and coerce malformed scalars into coordinates.** Validate every outer/nested record before access and accept only finite numbers or supported numeric strings. Preserve valid observations while skipping malformed entries; cover direct and worker/generated paths. |
| AG3-05 | Medium / High | `src/lib/interpolate.ts:90-154`, `src/components/MapView.tsx:452-470,925-933` | **Distance interpolation cannot reach zero-length final segments.** Progress 1 returns the previous point for `[0,d,d]`, and all-zero segmented tracks stay at point 0 forever. Guarantee the final endpoint and define deterministic index-space fallback semantics without drawing cross-segment edges. |
| AG3-06 | Low / High | `src/components/TimelineSelector.tsx:291-347,413-435` | **Idle global mouse/touch movement schedules timeline animation frames.** Reject movement before writing refs or scheduling rAF when no drag is active, ideally as part of the AG3-02 transaction cleanup. Add an idle-listener regression. |
| AG3-07 | Low / High | `src/app/page.tsx:230-244`, `src/lib/usePlaybackController.ts:177-251` | **Playback rerenders reinstall the global hotkey listener.** Memoize the three page-owned inline callbacks (or use callback refs) so progress-only renders do not tear down and recreate the window listener. |

### Export capability and completion truth

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG3-08 | Medium / High | `src/components/ExportPanel.tsx:94-173`, `src/lib/videoEncoder.ts:162-217,363-368`, installed `mediabunny/src/encode.ts:654-775` | **Codec-only support probing does not match the selected encoder configuration.** Probe `canEncodeVideo` with the selected width, height, and clamped bitrate, key support state by that configuration, and keep runtime failure defensive. |
| AG3-09 | Medium / High | `src/lib/videoEncoder.ts:319-333`, `src/lib/useExportController.ts:244-255`, `src/components/ExportPanel.tsx:253-288`, `src/lib/i18n.ts:131-136` | **Picker-cancelled completion gives false save guidance.** The ready screen offers Download MP4 but tells users to export again and may claim the file is already in Downloads. State that the video is ready but unsaved, point to Download/Share, and suppress post-download platform tips until a save/download starts. |
| AG3-10 | Low / High | `src/components/ExportPanel.tsx:116-133,235`; fresh mobile trace | **A cancelled export-sheet swipe contaminates a later touch.** Clear the swipe origin on `touchcancel`, close, and unmount; regression-test cancel followed by a cross-boundary end. |

### Product copy

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG3-11 | Low / High | `src/lib/i18n.ts:119,843,1567`, `src/lib/i18n.test.ts:33-36` | **English, Japanese, and Spanish repeat the approximation in the estimated-time label.** Use `Estimated time:`, `所要時間の目安:`, and `Tiempo estimado:` and extend reviewed-copy assertions. |

## Carried-forward authority, input, and evidence boundaries

These remain current but are not counted as new cycle-3 findings:

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| CARRY-01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: user authorizes the workflow edit; add the unit gate and validate without dispatch/deploy. |
| CARRY-02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | Build inherits Pages/OIDC write permissions. Same CI/CD authority block. Exit: explicit authorization; narrow top-level/build permissions and grant writes only to deploy. |
| CARRY-03 | Medium / High | `README.md:224-226`, absent root `LICENSE` | Intended license, holder, and year/range are unknown. Exit: user supplies exact legal intent/attribution, then add the grant or explicitly correct the README claim. |
| CARRY-04 | Medium / Medium | `src/components/MapView.tsx:586-591` | `preserveDrawingBuffer` impact needs representative low-end/mobile hardware evidence; emulation cannot establish GPU, battery, or thermal cost. Exit: record comparative p50/p95 frame time and memory, then isolate export capture if material. |

No correctness, accessibility, product-truth, or data-loss item is deferred for convenience. The four carryovers remain separated only because repository authority, legal input, or representative-device evidence prevents responsible implementation.

## Cross-review agreement

The strongest agreement was on the two stale gesture transactions, segment-crossing anticipation, configuration-blind codec discovery, and picker-cancelled recovery text. Focused follow-up traces added corroborated parser-shape and zero-distance endpoint findings. The security review explicitly found the current local-only trust boundary, CSP, worker limits, static path handling, object URLs, and filename handling sound.

## Agent failures

None. All twelve required role artifacts were produced at their exact paths. One optional bounded validator was interrupted after the required reports independently confirmed the same parser/interpolation cases; it produced no required artifact and does not affect review completeness.
