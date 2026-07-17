# Cycle 12 reviewer B — source-only cross-functional review

Target: `d62b13ce3f7b89aefe71fbc2ad6bf0b3fbc0d789`

Date: 2026-07-17
Roles combined: critic, verifier, test engineer, debugger, designer, and Mina (non-technical traveler)

## Verdict

No Critical or High-severity application defect survived the review. Cycle 11's Journey snapshot, Escape precedence/focus, and file-intent repairs are present and causally sound. Two Medium/High-confidence focus failures remain reachable, however:

- `C12B-01`: opening Help or the import guide from mobile More removes the real opener before `ModalDialog` records it, so closing the modal cannot return focus to More.
- `C12B-02`: cancelling or failing an export removes the focused Cancel button but has no idle-state focus handoff, leaving focus outside the still-open modal.

Both are newly isolated edges of older acceptance language, not new Cycle 11 regressions. `C12B-01` reopens the unasserted mobile-focus clause in Cycle 7 P03; `C12B-02` is an incomplete post-cancel edge of Cycle 9 `AG9-03`. No fresh browser or runtime result is claimed: this assignment required source-only inspection and prohibited browsers, servers, and test/build commands.

## Findings

### C12B-01 — Mobile More loses its modal return-focus owner

- Severity: Medium
- Confidence: High
- Status: Source-confirmed focus lifecycle; browser assertion still required as the regression gate
- History: Reopened/incomplete Cycle 7 P03 acceptance edge, not a fresh root
- Locations: `src/components/TrackToolbar.tsx:72-77,124-127,207-254`; `src/components/ModalDialog.tsx:93-112,156-166`; `src/app/page.tsx:624-640,662-663`
- Missing right-reason coverage: `src/components/TrackToolbar.test.ts:62-105`; `e2e/travelback.spec.ts:1471-1508`

`runAndCloseMenu` invokes the parent modal-opening action and then closes the mobile menu. React batches those updates, so the focused Help/import-guide button is removed during the same commit that opens the portal. `ModalDialog` records `document.activeElement` only in its passive open effect. By then the focused menu item is detached, leaving `body` (or another non-opener) as `previousActiveElement`. The menu's queued animation-frame callback briefly focuses More, but the modal's later focus callback moves focus into the dialog; on close, `ModalDialog` can restore only the invalid element it captured.

Concrete traveler scenario: at a mobile width, open More, choose Help (or “Need help finding your file?”), then close with Escape or the Close button. The dialog closes, but focus does not return to More. A keyboard/switch user loses their position in the loaded toolbar and must rediscover it. The current browser test stops after asserting that mobile Help opens; only the desktop half closes the dialog and asserts restored focus. The component test covers Escape closing the More panel itself, not a modal launched from it.

Fix the ownership boundary explicitly. Either let `ModalDialog` accept an intentional return-focus element/ref, or close the menu, focus More, and only then open the requested modal. Apply the same helper to Help and import guide. Add component/E2E assertions for `More -> Help -> Escape -> More focused` and `More -> import guide -> Close -> More focused`; an “opens successfully” assertion is insufficient.

### C12B-02 — Export cancel/failure drops focus while the dialog stays open

- Severity: Medium
- Confidence: High
- Status: Source-confirmed DOM-state transition; browser assertion still required as the regression gate
- History: Incomplete post-cancel edge of Cycle 9 `AG9-03`, not a fresh rendering-focus root
- Locations: `src/components/ExportPanel.tsx:256-272,284-307,371-513`; `src/lib/useExportController.ts:273-329`; `src/components/ModalDialog.tsx:115-166`
- Missing right-reason coverage: `src/components/ExportPanel.test.ts:150-181`; completion-only browser path at `e2e/travelback.spec.ts:2748-2784`

The rendering transition correctly focuses `cancelExportButtonRef`, and successful completion correctly focuses the result heading. Cancellation and failure instead set `exportState` back to `idle`, then set `isExporting` false. That replaces the focused Cancel button with the idle form and restored header Close button. No effect focuses the newly stable state, and `ModalDialog`'s initial-focus effect does not rerun because the modal never closed. Its Tab trap also only wraps the first/last focused elements; it does not recover an active element outside the panel.

Concrete traveler scenario: focus Start Export, begin rendering, then activate Cancel or press Escape. Once cleanup finishes, the settings form is visible again and the cancellation toast may announce, but the focused Cancel node has been removed and the still-open dialog has no focused element. The same loss occurs after encoder/map failure. This is distinct from the fixed Cycle 9 bug in which focus was already on `body` during rendering.

Add an explicit `exporting -> idle` focus handoff to a stable panel heading or the first usable idle control, with `preventScroll`. Preserve the existing success-heading and dialog-opener contracts. Extend the component test through a return to idle and add a controllable cancellation browser path that asserts: Cancel is focused while rendering, the post-cancel focus remains inside Export, Tab remains contained, and closing Export restores the toolbar Export opener.

## Mina's source-only journey review

Overall grade: **B+**. The primary story is understandable without technical knowledge: try a sample, browse a GPX/KML/Google JSON file, or draw a route; inspect the map/timeline/elevation; play it; choose Camera scenes; then export locally. The current copy distinguishes a video that is merely ready from one whose save/download was initiated, and errors generally provide a recovery action. Cycle 11 also makes confirmation feel safer by freezing a valid Journey snapshot and makes the advertised Escape behavior work from ordinary controls.

The two remaining gaps happen at exactly the moments where I would expect the interface to remember me. On mobile I open help from More and return without a keyboard position. During export I deliberately cancel, but the still-open settings dialog no longer has a focused place. Neither loses trip data, but both weaken confidence and make keyboard/switch navigation feel less predictable.

Source-state inventory covered:

- landing, accepted/rejected/loading file intent, sample replacement, Google guide tabs, and manual Journey draft/confirmation/cancel;
- loaded map, map-error/retry, timeline/elevation/playback/seek/follow, Camera empty/authored/preset/trim-confirm states, and mobile More;
- export codec-checking, idle, rendering, cancel/failure, ready/download-started/saved, preview/download/share, reset, and close;
- desktop/mobile layout ownership, light/dark/system theme, five locales, reduced motion, safe-area declarations, alerts/live regions, modal/menu focus, and local-only privacy boundaries.

Physical iOS safe areas/browser chrome, forced-colors/representative zoom canvas focus, a real native save picker, and an external share destination remain device/manual evidence boundaries; source inspection does not close them.

## Inventory and evidence

- Confirmed exact target HEAD and a clean pre-artifact worktree. Reviewed all 57 tracked `src/` paths: app/layout/styles, all production components, parser/Google parser/interpolation/camera/map/playback/export/i18n helpers, worker source, shared types, and all 19 unit-test files; the favicon was inventoried as binary.
- Mapped the complete `e2e/travelback.spec.ts` catalog and all 19 fixtures (20 paths), including every import family, invalid/large files, stale intents, map retry/style ownership, Journey input, responsive geometry, playback/trim/scenes, dialog focus, cancellation/save/share, static execution, and real-MP4 gating.
- Inspected all seven scripts; workflow; README; package/lock metadata; Next, TypeScript, ESLint, Vitest, Playwright development/static, and PostCSS configuration. Inventoried all 19 public paths and checked textual map styles, worker ownership, font CSS, sample GPX, and SVG references.
- Read current project/development/review instructions, Cycle 11 aggregate and implementation evidence, pending cleanup inventory, and historical plans/reviews needed to classify both candidates. Historical searches prevented relabeling old “Export Again,” mobile-menu semantics, export rendering focus, or current blocked/deferred items as fresh defects.
- Per the source-only constraint, no browser, server, Playwright, unit suite, lint, typecheck, build, or long-running command was started. The accepted Cycle 11 exact-implementation matrix remains historical evidence only: lint/typecheck, 19 unit files/447 tests, worker/build/static smoke, 109 development and 109 static Playwright passes with one expected real-export skip each, and 1/1 isolated real static MP4.

## Carryovers, deduplication, and rejected candidates

- Cycle 11 `AG11-01` through `AG11-03` and reopened `R11-01` are implemented at this target. Stable Journey confirmation, Escape precedence/Scene trigger restoration, and unified file-intent invalidation did not reopen.
- Manual `M10-01` and `M9-01`, blocked `B01`-`B04`, performance deferrals `D01`-`D04`, and final provenance cleanup `U-2026-07-17-01` retain their existing owners and exits. They are not findings here.
- The missing workflow unit command, broad Pages/OIDC permissions, absent owner-supplied MIT license artifact, and `preserveDrawingBuffer` measurement need are exactly `B01`-`B04`; no new evidence changed their status.
- Confirmation-phase map/search events now resolve against a copied snapshot and guarded mutations; the still-visible search UI may be polish debt, but no corrupt commit path remains. Uppercase file extensions can miss only an advisory console warning, not validation or parsing. Neither met the reporting threshold.
- Historical “Export Again closes the panel” feedback and existing mobile More semantic debates were not relabeled. The retained findings have narrower, currently reachable focus causes and explicit missing terminal assertions.

## Final missed-issue sweep

The closing pass traced every represented external input—file picker/drop/fetch, worker messages, local storage and theme/locale media changes, keyboard, pointer/touch/cancel/blur, map style/error/render events, timers/RAF/visibility, encoder/finalizer, save/download/share—through session ownership, cleanup, output, and test coverage. It revisited empty/singleton/disconnected/antimeridian tracks, maximum import/export bounds, superseded async work, map/style retry, timeline and scene terminal events, modal stacking, object URLs, static path containment/CSP, generated-worker parity, workflow authority, responsive containment, and every Cycle 11 repaired invariant. No third reportable root survived causal tracing and historical deduplication.
