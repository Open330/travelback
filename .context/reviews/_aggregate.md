# Aggregate Review — Travelback (Cycle 13, 2026-07-17)

## Outcome

Exactly two source-only reviewer reports completed against
`86e35c56ef2c5e8231a7a4009e19f7a94b3ceb84`, covering all twelve requested
roles plus Mina. Both reports were read in full. Independent source tracing and
historical deduplication retained **four genuinely new roots** and **one
reopened/incomplete historical edge**. Prompt 2 must cover all five actionable
items without relabeling the base-path edge as wholly new.

No browser, agent-browser, Playwright, server, build, test suite, or long-lived
process was started during Prompt 1. The accepted Cycle 12 matrix remains
historical evidence only. Current source was inspected read-only;
implementation and runtime validation belong to Prompt 3.

## New actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG13-01 | Medium / High | `src/components/SceneEditor.tsx:430-450,579-582`; reviewer A; independent scene-coverage trace | **Add Scene silently fails when only an interior gap is available.** Addition considers only the final scene's end and returns when it is `1`, although deletion and range editing intentionally permit earlier gaps. Find the first usable free range, insert a valid scene there, and disable Add only when no range can hold `MIN_SCENE_SPAN`. |
| AG13-02 | Medium / High | `src/components/ModalDialog.tsx:44-70,93-103,171-194`; `src/app/page.tsx:592-718`; `src/components/Toast.tsx:63-73`; `src/lib/useExportController.ts:273-287`; reviewer B; independent modal-tree trace | **Modal inertness hides global Toast announcements.** Export cancellation and failure add their only explanation to a live region beneath the inert and `aria-hidden` application root while the dialog remains open outside that root. Keep notifications outside the hidden subtree and cover the composed accessibility ancestry. |
| AG13-03 | Low / High | `src/components/FileUpload.tsx:26-125`; `src/components/JourneyCreator.tsx:160-173,623-647,881-884`; `src/components/SceneEditor.tsx:348-407,452-463,649-653`; reviewer B; independent state trace | **Retained validation and warning text does not follow locale changes.** These components store already-translated strings, so a later locale switch changes surrounding UI but leaves recovery guidance in the former language. Store semantic keys/parameters and translate at render time. |
| AG13-04 | Medium / High | `src/styles/vitro-base.css:28-33,44-73,263-305`; warning/error consumers in FileUpload, JourneyCreator, SceneEditor, ExportPanel, and GoogleGuide; reviewer B; independent token-use trace | **Light-theme warning/error text fails normal-text contrast.** `--warn` is 1.78–2.15:1 and `--err` is 3.04–3.67:1 against declared light surfaces, below the 4.5:1 requirement for the shipped 10–14px text. Add contrast-safe theme-specific foreground tokens while retaining brighter accent tokens for non-text decoration. |

## Reopened confirmed historical gaps

| ID | Current severity / confidence | Historical provenance | Required outcome |
| --- | --- | --- | --- |
| R13-01 | Medium / High | Cycle 2 `N07/N28` centralized browser consumers and accepted substring-wide `..` rejection as defense-in-depth, but did not align build/serve/test normalization; `next.config.ts:3-14`; `src/lib/env.ts:1-9`; `scripts/serve-static.mjs:15-30`; `scripts/smoke-static.mjs:12-18`; `playwright.static.config.ts:4-14`; reviewer A | **Base-path normalizers disagree across build and runtime.** A valid literal segment such as `/release..candidate` is accepted and injected by the build yet silently becomes root in the browser; actual traversal is also accepted by other surfaces. Establish one shared normalizer, accept literal dots, reject real dot segments explicitly, and table-test every consumer. |

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

Reviewer A supplied the scene and base-path candidates. Reviewer B supplied
the modal notification, retained translation, and semantic-contrast candidates.
The main agent independently validated all five causes against current source
and searched historical plans/reviews before classification. AG13-01 through
AG13-04 have no matching owned exit. R13-01 shares the old `N07/N28` root and
is therefore an incomplete historical edge, not a fresh hardening finding.

The historical zero-length terminal Add bug, visual toast z-index note, loaded
track-status localization, primary-button contrast, workflow, license,
`preserveDrawingBuffer`, and measured performance items were not relabeled.
An export-size copy hypothesis was rejected as unreachable through the current
UI guard. Speculative stacked-dialog behavior and other low-confidence polish
did not establish additional current actionable roots.

## Agent, process, and cleanup notes

Both source-only reports completed and were read before this aggregate. The
reviewers used no browser, agent-browser, server, Playwright, build, test suite,
temporary copy, child agent, commit, or push. The main process check found zero
browser processes and all dedicated ports free. Prompt 1 stopped or killed
nothing. The final-cleanup ledger remains open for the loop's final stop
condition. No deployment, workflow edit/dispatch, production mutation,
external communication, or publication occurred.
