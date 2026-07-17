# Aggregate Review — Travelback (Cycle 12, 2026-07-17)

## Outcome

Exactly two source-only reviewer artifacts completed against
`d62b13ce3f7b89aefe71fbc2ad6bf0b3fbc0d789`, covering all twelve requested
roles plus Mina. Both artifacts were read in full. Independent source tracing
and historical deduplication retained **2 genuinely new Medium/High roots**
plus **4 Medium/High reopened or incomplete historical edges**. Prompt 2 must
cover all six actionable items without relabeling the four historical edges as
new.

No browser, Playwright, server, build, test suite, or long-lived process was
started during Prompt 1. The accepted Cycle 11 matrix remains historical
evidence only. Current source and the existing generated static output were
inspected read-only; implementation and runtime validation belong to Prompt 3.

## New actionable findings

| ID | Severity / confidence | Evidence | Finding and required outcome |
| --- | --- | --- | --- |
| AG12-01 | Medium / High | `src/app/page.tsx:487-523`; `src/components/SceneEditor.tsx:356-490,591-603,857-864`; `src/components/MapView.tsx:406-451,1147-1223`; reviewer A; independent dependency trace | **Committed scene changes do not refresh a paused map pose.** MapView updates scene refs and clears its previous-camera cache, but its camera effect is not keyed by scenes or a committed-scene revision. Mode, preset, add/delete, range, and transition changes can therefore leave the visible paused map on the old pose while playback/export uses the new scenes. Add one committed-current-pose refresh boundary that preserves temporary parameter preview, plus component/browser coverage at stationary progress. |
| AG12-02 | Medium / High | `src/components/MapView.tsx:99-135,897-899`; parser coordinate guards and boundary regression; MapLibre `LngLat` validation; reviewer A; independent source validation | **Degenerate pole-adjacent tracks create invalid fit-bounds latitudes.** The accepted latitude domain includes ±90, but the fixed ±0.1° degenerate padding can extend past it and throw before `fitBounds`. Clamp latitude padding and make it inward/asymmetric at a pole while preserving shifted-longitude antimeridian behavior. Extract a pure bounds contract and test ±90 plus near-pole coincident points. |

## Reopened confirmed historical gaps

| ID | Current severity / confidence | Historical provenance | Required outcome |
| --- | --- | --- | --- |
| R12-01 | Medium / High | Cycle 7 `P03` explicitly required mobile More → Help focus restoration, but the browser case asserted opening only; `src/components/TrackToolbar.tsx:72-77,124-127,207-254`; `src/components/ModalDialog.tsx:93-166`; reviewer B | **A modal launched from mobile More loses the More trigger as its return-focus owner.** The action opens the parent modal in the same batch that removes the focused menu item; ModalDialog captures focus only after that removal. Establish More as the opener before Help/import-guide opens, and assert both modal close paths restore it. |
| R12-02 | Medium / High | Cycle 9 `AG9-03/P05` required success, cancellation, and opener focus continuity, but covered only idle → rendering and success; `src/components/ExportPanel.tsx:256-307,371-513`; reviewer B | **Export cancellation or failure removes the focused Cancel button without handing focus to the still-open idle panel.** Add an exporting → idle focus transfer to a stable panel target, preserve success and opener restoration, and cover cancellation plus keyboard containment. |
| R12-03 | Medium / High | Cycle 11 `R11-01/P04` required `onImportStart` exactly once for every newer file intent; the older loading guard at `src/components/FileUpload.tsx:165-169` still bypasses the unified abort/generation owner; reviewer A | **A newer drop during an in-flight parse is silently ignored, allowing the older file to win.** Let a drop replace the active parse through the existing generation/AbortController protocol, keep the native picker disabled, and prove parse A aborts/stales while B alone completes. |
| R12-04 | Medium / High | Cycle 1 `P05` required strict production style CSP while allowing Next development styles, but smoke only checks policy strings; `scripts/harden-static-export.mjs:18-31,71-86,177-191`; `scripts/smoke-static.mjs:149-222`; existing `out/404.html` and `out/_not-found.html` each contain one nonempty inline style | **The hardened static CSP blocks Next's own inline 404-page style.** `style-src` and `style-src-elem` contain only `'self'`, while the hardener hashes scripts only. Compute deterministic hashes for every nonempty inline style, authorize them in both style directives without `unsafe-inline`, and make static smoke verify that every inline style is covered. |

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

Reviewer A supplied the three application/data-path candidates; reviewer B
supplied the two focus-lifecycle candidates. The main agent independently
validated all five causes against the current source, added R12-04 from a
separate CSP/output trace, and searched historical plans/reviews before
classification. AG12-01 and AG12-02 have no matching owned historical exit.
R12-01 through R12-04 each map to explicit older acceptance language and are
therefore reopened/incomplete edges, not fresh roots.

The broad historical `style-src-attr 'unsafe-inline'` debt was not relabeled:
R12-04 concerns blocked `<style>` elements on generated error pages, while
legacy React style attributes remain isolated under their existing policy.
The fixed loading-time no-op was likewise not called a new parser race; only
the unreconciled Cycle 11 replacement contract is reopened. Uppercase extension
warnings, confirmation search polish, generic scene-performance concerns, and
older antimeridian padding discussion did not establish additional current
actionable roots.

## Agent, process, and cleanup notes

Both source-only artifacts completed and were read before this aggregate. The
reviewers used no browser, server, Playwright, build, test suite, temporary
copy, child agent, commit, or push. Prompt 1 created no process/session/port
inventory and stopped or killed nothing. The user's final-cleanup instruction
remains open for the loop's final stop condition. No deployment, workflow
edit/dispatch, production mutation, external communication, or publication
occurred.
