# Aggregate Review — Travelback (Cycle 10, 2026-07-17)

## Outcome

All twelve required role reviews completed against `3d74754369d22ad1bb9e7970634e0f0163d5b777`, were read independently, and produced their canonical artifacts. Cross-report and historical deduplication retained **4 genuinely new roots**: 2 Medium/High confirmed correctness defects, 1 Low/Medium source-confirmed security hardening gap with unmeasured runtime impact, and 1 Low/High confirmed mobile usability defect. The review also reopens **3 confirmed historical gaps** whose prior deferral or incomplete disposition no longer applies. Cycle 10 therefore schedules **7 implementation items**.

Fresh exact-HEAD evidence:

- The isolated review copy passed lint, Next type generation plus `tsc --noEmit`, generated-worker parity, all 17 Vitest files / 405 tests, production build, and CSP hardening across 3 HTML files.
- A one-worker, retries-disabled Chromium slice passed 13/13 landing/import/journey/export cases in 6.3 minutes.
- Deterministic traces proved active seeks are replaced by the stale RAF origin and valid elevations are joined across a disconnected segment boundary.
- The live accessibility tree contained an H2 `Travelback` and no H1. A Korean Google Records import announced `트랙이 로드되었습니다: Google Location History`.
- The fallback encoder contract returns `{ saved: false, method: 'fallback' }`, while the completion heading selects `Video saved!`.
- At 393×852, Journey Creator Cancel measured about 20.75×44.09px. This is a product touch-target inconsistency, not a claimed WCAG 2.5.8 failure.

## New actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG10-01 | Medium / High | `src/lib/usePlaybackController.ts:83-92,98-155`; CR/CRITIC/TRACE/DEBUG | **Seeking while playback is active is overwritten by the stale RAF accumulator.** Rebase the active progress origin and timestamp atomically, including the awaiting-first-frame phase and endpoint seeks. Add fake-RAF coverage before the first frame and mid-playback plus one real seek-surface browser regression while Pause is visible. |
| AG10-02 | Medium / High | `src/lib/interpolate.ts:31-41`; `src/components/ElevationProfile.tsx:23-98`; CR/CRITIC/TRACE/DEBUG | **The elevation SVG invents a connection between disconnected track segments.** Carry normalized `segmentStartIndices` into geometry and split line/area runs before every segment start, independently of missing elevations. Add pure geometry coverage and a segmented-elevation browser fixture/assertion. |
| AG10-03 | Low / Medium | `src/lib/parse-utils.ts:18-27`; `src/lib/parser.ts:214-230`; CR/PERF/SEC/CRITIC/TRACE/DEBUG | **A legal XML import can amplify an unbounded name into multi-megabyte visible/live-region work.** The practical stall remains unmeasured, but the missing output-field bound and terminal data flow are source-confirmed, and the security non-deferral rule requires safe hardening. Normalize controls/whitespace, supply blank fallbacks, cap names at a documented Unicode-aware display limit, and cover blank/control-heavy/over-limit GPX and KML names. |
| AG10-04 | Low / High | `src/components/JourneyCreator.tsx:740-750`; `src/styles/vitro-base.css:796-805`; live iPhone 15 emulation; VR/TE/DESIGN/Mina | **Journey Creator Cancel is only about 21px wide under the coarse-pointer mobile layout.** Give it a minimum 44px width or equivalent padding while retaining focus styling, and extend the existing mobile geometry regression to assert both dimensions. |

AG10-03 is transparent about its Medium confidence in runtime impact. It is scheduled because the absence of a field bound is confirmed, three independent core roles trace the amplification to visible and assistive-technology consumers, and the remedy is local and regression-testable—not because the review claims an unmeasured browser freeze.

## Reopened confirmed historical gaps

| ID | Current severity / confidence | Historical provenance | Required outcome |
| --- | --- | --- | --- |
| R10-01 | Medium / High | `DF-R2-007` (originally Low/Medium) and repeated accessibility review; live exact-HEAD confirmation at `src/components/FileUpload.tsx:259-261` | **The landing begins at H2 with no H1.** Its “next accessibility pass” exit criterion is now met. Make the visual Travelback title the landing H1 and preserve exactly one accessible H1 when the route transitions to the loaded workspace, using the visible track title there. |
| R10-02 | Medium / High | Wave-5 hard-coded-name review, never scheduled; current sources `src/lib/parser.ts:214-230` and `src/lib/googleJsonParser.ts:377-380` | **GPX, KML, and Google manufactured fallback names bypass the selected locale.** Keep parsers locale-neutral with structural fallback/source metadata, resolve display/live-status/export names through five-locale i18n, and distinguish a real source-provided name from a manufactured fallback. Test all three sources and a live locale switch. |
| R10-03 | Medium / High | Cycle 11 fallback-save finding was marked complete after only softening the paragraph; current mismatch at `src/lib/videoEncoder.ts:296-303,336-360`, `src/lib/useExportController.ts:250-264`, `src/components/ExportPanel.tsx:302-310` | **The fallback paragraph says download started, but the stronger heading still says `Video saved!` despite `saved:false`.** Give ready, download-started, and save-confirmed states truthful, exhaustive headings in all locales; preserve the explicit Download recovery action and focus contract. |

## Formal manual-validation items

| ID | Severity / confidence | Scope | Reason and exit criterion |
| --- | --- | --- | --- |
| M10-01 | Low / Medium | `src/app/page.tsx:579`; `src/components/TrackWorkspace.tsx:142-155`; real iOS Safari | Chromium iPhone emulation reported `safe-area-inset-bottom: 0`, and its controls fit with about 43px remaining, so it cannot establish nonzero home-indicator or collapsing-browser-chrome behavior. Exit: exercise portrait and landscape on representative physical iPhones with expanded/collapsed Safari chrome and record root/bottom-stack/control rectangles. If any control is occluded, use dynamic viewport sizing plus explicit safe-area ownership and add a deterministic injected-inset/WebKit regression. |
| M9-01 | Low / Medium | MapLibre canvas emitted by `src/components/MapView.tsx`; viewport clipping in `src/app/globals.css` | The exact-HEAD review did not add representative forced-colors/zoom evidence for the existing canvas focus-ring concern. Exit remains keyboard focus on desktop/mobile at 100% and 200% zoom in light, dark, and forced-colors; add an inset authored indicator if any edge is imperceptible. |

## Explicit blocked and evidence-gated carryovers

| ID | Original severity / confidence | Exact scope | Reason and exit criterion |
| --- | --- | --- | --- |
| B01 | High / High | `.github/workflows/deploy-pages.yml:26-32` | CI omits `npm test`. User-level destructive-action policy requires explicit confirmation before CI/CD modification. Exit: the user authorizes the edit; add the unit gate and validate syntax without dispatching or deploying. |
| B02 | Medium / High | `.github/workflows/deploy-pages.yml:8-45` | The build job inherits Pages/OIDC writes. Exit: the user authorizes the CI/CD edit; narrow permissions without dispatching or deploying. |
| B03 | Medium / High | `README.md:225-227`, absent root `LICENSE` | The README claims MIT, but intended license, holder, and year/range are unknown. Exit: the owner supplies exact legal intent and attribution. |
| B04 | Medium / Medium | `src/components/MapView.tsx:920-933` | Always-on `preserveDrawingBuffer` cost lacks representative GPU, memory, battery, and thermal evidence. Exit: record comparative p50/p95 frame time and memory plus battery/thermal observations, then isolate capture only if material. |

## Existing performance deferrals

- **D01 — High/High:** broad root playback-progress commits (`src/lib/usePlaybackController.ts:98-155`; `src/app/page.tsx:173-232,577-595`). Exit: profile representative tracks, then isolate frame-frequency ownership while preserving seek, camera, scenes, and export. AG10-01 repairs seek correctness without claiming to complete this architectural performance item.
- **D02 — Medium/High:** elevation SVG strings contain every sample (`src/components/ElevationProfile.tsx`). Exit: profile near the supported point ceiling and implement distance-aware downsampling with endpoint/extrema guarantees. AG10-02 repairs segment correctness without claiming to complete downsampling.
- **D03 — Medium/High:** each waypoint drag move performs an O(n) route-distance scan (`src/components/JourneyCreator.tsx`). Exit: measure and use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation.
- **D04 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts`; `src/lib/videoEncoder.ts`). Exit: profile real exports and prove redundant waiting before changing capture correctness.

## Cross-review agreement and rejected hypotheses

All six core roles converged on AG10-01 through AG10-03; code, critic, tracer, and debugger independently confirmed the first two. Verifier, test, designer, and the non-technical traveler converged on the four experience findings, with architecture and documentation independently confirming R10-02/R10-03. Designer and traveler added AG10-04 in the final mobile sweep.

The Scene Range endpoint-clipping hypothesis was rejected: the range was x=42…310 and endpoint centers were x=43/x309, with symmetric intentional overflow. The stale ErrorBoundary trim-modal hypothesis was rejected because `page.tsx:486-493` clears the pending range after scenes reset. The zero-inset Chromium mobile result was not misrepresented as real iOS safe-area proof.

## Agent, process, and cleanup notes

All twelve artifacts completed and were read before this aggregate. The durable inventory in `.context/plans/user-injected/pending-next-cycle.md` records the two Cycle 10 review/verification copies, failed copy, server/session/PIDs, browser sessions, six screenshots, focused E2E session, and large trace. No temporary path, process, browser session, pre-existing server, or reserved port was stopped, killed, reused, or deleted. The user's final-cleanup instruction remains open for the loop's final stop condition. No deployment, workflow edit/dispatch, production mutation, external communication, or publication occurred.
