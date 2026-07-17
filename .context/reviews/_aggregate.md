# Aggregate Review — Travelback (Cycle 11, 2026-07-17)

## Outcome

All twelve required role reviews completed against `7273d464fdce24fc06350ce1444c3a2e8d26829d`, were read independently, and produced their canonical artifacts. Cross-report and historical deduplication retained **3 genuinely new Medium/High roots** plus **1 Medium/High reopened incomplete edge** of Cycle 2 `AG2-02/P04`. No fresh performance or security root survived the final sweep. Prompt 2 must cover all four actionable items without relabeling the reopened edge as new.

Fresh exact-HEAD evidence:

- A physical exact-HEAD review copy installed dependencies, passed generated-worker parity and a production build, and served the static app from a bounded isolated listener. The primary worktree's pre-existing dependency tree was incomplete, so no fresh primary lint/type/unit/full-Playwright claim is made. Cycle 10's accepted matrix applies to identical application code at `cc720a2` only as historical provenance.
- Live desktop reproduction proved that two valid Journey points can become one or zero behind the confirmation card while Create remains enabled. The resulting workspaces settled at `1 / 1 locations` or `0 / 0 locations`; the latter had no hydrated track layers but did **not** immediately crash.
- In a clean session, opening Camera left focus on the Camera button; after Escape the result was `{ panel: true, focus: 'Camera' }`, contradicting the advertised panel-close shortcut.
- Unsupported input followed by a successful sample left the prior red rejection alert visible over the loaded Namsan workspace. A separate held-sample plus newer unsupported-drop probe showed the older sample still wins, confirming the incomplete Cycle 2 edge.
- At 393×852, landing/workspace width stayed within the document, primary controls remained visible, playback and active seek advanced, and the locally stubbed export result used truthful `Video ready` copy. This is not physical-iOS, real-codec, save-picker, or external-share evidence.

## New actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG11-01 | Medium / High | `src/components/JourneyCreator.tsx:336-369,705-721,925-962`; `src/app/page.tsx:196-210,332-347,409-412`; CR/ARCH/DEBUG/TRACE/CRITIC/VR/TE/DESIGN/Mina; live exact-HEAD Journey probe | **Journey confirmation validates one route and can commit a later zero/one-point route.** Make confirmation own a stable valid draft or invalidate it when live editing drops below two points; disable Create, provide localized feedback, revalidate at commit, and pass a copied waypoint array. Add component and browser regressions that mutate between Done and Create and prove no invalid Track reaches the workspace. |
| AG11-02 | Medium / High | `src/lib/usePlaybackController.ts:189-249`; `src/app/page.tsx:237-259`; `src/components/KeyboardHelp.tsx:43-50`; all correctness/experience roles; live focused-Camera probe | **The interactive-target guard returns before Escape dispatch, so the advertised nonmodal panel-close command is unreachable from ordinary focused controls.** Resolve Escape before playback-only suppression while preserving export/modal/menu ownership. Assert SceneEditor becomes hidden from its trigger and representative input/select/button/slider focus; strengthen the misleading KML E2E comment with a terminal assertion. |
| AG11-03 | Medium / High | `src/components/FileUpload.tsx:23-27,64-80,161-190,219-244`; `src/app/page.tsx:414-447,603-611`; CRITIC/VR/TE/DOC/DESIGN/Mina; live unsupported-input → sample probe | **A successful sample leaves FileUpload's previous rejected-file alert visible indefinitely.** Clear child-owned rejection state whenever a newer valid sample/import intent starts or succeeds, keep the alert tied to its owning intent, and add a composed component/browser regression that requires loaded success to contain no stale alert. |

## Reopened confirmed historical gaps

| ID | Current severity / confidence | Historical provenance | Required outcome |
| --- | --- | --- | --- |
| R11-01 | Medium / High | Cycle 2 `AG2-02/P04` created the page-owned generation/AbortController boundary, but its tests covered valid import and manual Journey replacement rather than child-local rejection; current sources `src/components/FileUpload.tsx:64-66,126-140`, `src/app/page.tsx:145-156,414-447,603-610` | **An unsupported drop returns before `onImportStart`, so a previously held sample remains current and later overwrites the newer rejected-drop intent.** Notify the page owner before extension preflight (or remove the duplicate child preflight), preserve parser authority, and add a deterministic held-sample plus unsupported DragEvent regression that proves the stale sample never installs. |

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

- **D01 — High/High:** broad root playback-progress commits (`src/lib/usePlaybackController.ts:98-168`; `src/app/page.tsx:173-232,577-595`). Exit: profile representative tracks, then isolate frame-frequency ownership while preserving seek, camera, scenes, and export.
- **D02 — Medium/High:** elevation SVG strings contain every sample (`src/components/ElevationProfile.tsx`). Exit: profile near the supported point ceiling and implement distance-aware downsampling with endpoint/extrema guarantees.
- **D03 — Medium/High:** each waypoint drag move performs an O(n) route-distance scan (`src/components/JourneyCreator.tsx`). Exit: measure and use incremental adjacent-segment updates or a throttled preview with exact terminal reconciliation.
- **D04 — Medium/High:** export performs a second idle check for every captured frame (`src/lib/useExportController.ts`; `src/lib/videoEncoder.ts`). Exit: profile real exports and prove redundant waiting before changing capture correctness.

## Cross-review agreement and rejected hypotheses

All six core roles converged on AG11-01, AG11-02, and R11-01; performance and security correctly retained those as non-performance/non-security product failures. Critic, verifier, test engineer, designer, and the non-technical traveler independently converged on all four current failures, while documentation confirmed the three fresh user-facing contracts. AG11-03 was retained after the main agent independently traced FileUpload's local `error` ownership, inspected the live capture, and found no matching historical aggregate/plan.

The initial zero-point ErrorBoundary hypothesis was rejected: exact live evidence stayed mounted at `0 / 0 locations`, and `MapView.hydrateCurrentStyle` returns before layer hydration when cumulative distances are empty. `/tmp/cycle11-empty-track-crash.png`, `/tmp/cycle11-journey-confirm-one-point.png`, and `/tmp/cycle11-one-point-workspace.png` are provenance-only because their filenames or timing overstate their visible state; the aggregate relies on the exact DOM probes plus `/tmp/cycle11-one-point-workspace-confirmed.png` and `/tmp/cycle11-empty-track-after-settle.png`. Chromium's zero safe-area inset and the localhost export stub were not misrepresented as physical-iOS or real-MP4/save/share proof.

## Agent, process, and cleanup notes

All twelve Cycle 11 artifacts completed and were read before this aggregate. The durable inventory in `.context/plans/user-injected/pending-next-cycle.md` records the physical exact-HEAD review copy, dependency/build sessions, bounded server/port/PID, browser sessions, provenance lists, accessibility snapshot, and every visual capture. Two desktop browser sessions became nonresponsive and were left untouched; clean replacement sessions produced the terminal evidence. The 30-minute server wrapper exited naturally, and a read-only check found neither PID `62893` nor a listener on port `43117`. No temporary path, process, browser session, pre-existing server, or reserved port was stopped, killed, reused, or deleted. The user's final-cleanup instruction remains open for the loop's final stop condition. No deployment, workflow edit/dispatch, production mutation, external communication, or publication occurred.
