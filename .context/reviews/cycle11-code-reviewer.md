# Cycle 11 code review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: code reviewer
Date: 2026-07-17

## Result

Two fresh Medium/High correctness roots and one Medium/High reopened edge survived complete source tracing, test inspection, history comparison, and the final missed-issue sweep:

- `C11-CORE-01`: Journey confirmation permits the mutable route to fall below the canonical two-point invariant and can commit an accepted but meaningless, non-renderable zero-point session.
- `C11-CORE-02`: the global interactive-target guard returns before dispatching Escape, so the advertised close-panels shortcut fails from normal focused controls.
- `C11-REOPEN-01`: unsupported drag/drop bypasses the page-owned sample invalidation callback; this is an incomplete edge of historical `AG2-02`, not a fresh async root.

No Critical or High-severity application defect was found.

## Inventory and coverage

- Read and cross-referenced all 56 tracked `src/` paths: `src/app/{layout,page,globals}`, all 17 components and their colocated tests, every `src/lib/` parser/interpolation/camera/map/export/playback/i18n helper and test, `src/types.ts`, both worker source/test paths, and the Vitro stylesheet. The favicon was inventoried as binary.
- Read `e2e/travelback.spec.ts` and all 19 fixtures (20 paths), including journey, delayed-sample, segmented-track, antimeridian, trim, elevation, XML, KML, and Google-history cases.
- Inspected all 19 public assets: five map-style JSON files, source/generated worker ownership, sample GPX, font CSS, SVGs, and guide illustrations. The font and icon binaries were inventoried rather than semantically decoded.
- Read all seven scripts, `.github/workflows/deploy-pages.yml`, `README.md`, `package.json`/lock metadata, and the authored Next, TypeScript, ESLint, Vitest, Playwright, static-Playwright, and PostCSS configs.
- Catalogued all 787 tracked `.context/` paths and 39 `plan/` paths. Read `.context/README.md`, every current `project/*` and `development/*` instruction, `.context/plans/README.md`, Cycle 10 aggregate/implementation plan, the pending user inventory, and the active blocked/deferred ledger. Searched the historical review/plan corpus for each candidate's exact flow and prior disposition.
- Excluded dependency/build/tool-output trees (`.git/`, `node_modules/`, `.next/`, `out/`, reports) from semantic review. Concurrent changes to `.context/plans/user-injected/pending-next-cycle.md` were preserved and not treated as target-HEAD content.

## Validation evidence

- Current `git rev-parse HEAD` matched the requested target. `git diff --check` over the reviewed tree produced no whitespace error.
- Fresh `npm run lint`, `npm test -- --reporter=dot`, and `npm run check:worker` attempts could not launch from the primary workspace: its pre-existing dependency tree lacks the ESLint/Vitest executables and a usable `esbuild` package. No install, server, dependency mutation, or reuse of an inventoried validation copy was performed.
- Application code at the target is identical to code commit `cc720a2`; only Cycle 10 planning documents changed afterward. The accepted isolated Cycle 10 matrix recorded lint/typecheck, 18 files/431 unit tests, zero high-severity audit findings, generated-worker parity, production build/static smoke, 106 development plus 106 static browser passes (one expected skip in each), and one real MP4 pass. That is historical exact-code evidence, not a claim that the fresh commands ran here.

## Findings

### C11-CORE-01 — Journey confirmation can commit an invalid zero/one-point track

- Severity: Medium
- Confidence: High
- Status: Confirmed by deterministic state and terminal-consumer trace
- Locations: `src/components/JourneyCreator.tsx:336-369`, `src/components/JourneyCreator.tsx:705-721`, `src/components/JourneyCreator.tsx:925-962`; terminal consumers at `src/app/page.tsx:196-210,332-347,409-412`, `src/components/MapView.tsx:836-856,1075-1139`, `src/components/TrackWorkspace.tsx:127-173`; canonical imported-track check at `src/lib/parser.ts:492-520`

`handleDone` checks `waypointsRef.current.length >= 2` only when it opens the naming card. The map's add/delete/drag handlers remain installed while that card is visible, and the card is a nonmodal section rather than an interaction boundary. `handleConfirmCreate` settles a drag but neither snapshots nor revalidates the mutable ref; its Create button also remains enabled regardless of the live `pointCount`.

Concrete failure: add two points, choose Done, then click both still-visible waypoint markers to delete them and choose Create Route. `onComplete` receives an empty `Track`, and `loadTrackIntoSession` accepts it directly. Exact live reproduction settled into a loaded `0 / 0 locations` workspace with playback controls but no track layers: cumulative distances are empty, so `MapView`'s hydration guard returns before adding route state. The app does not immediately crash, but it has accepted a meaningless, non-renderable session that ordinary import correctly rejects. Deleting only one point similarly commits a one-point track that bypasses the parser's canonical `TOO_FEW_POINTS` rule and leaves the session unsupported.

Root fix: give the confirmation phase explicit ownership of a stable valid draft. Either suspend map editing while the card is open, or keep editing live but revalidate on every mutation and at Create, disable Create below two points, return to editing with localized feedback, and pass a copied waypoint snapshot. Add a component/browser regression for `two points -> Done -> delete to one/zero -> Create`, asserting that no invalid `Track` reaches `onComplete`.

History classification: **fresh root**. Historical journey findings cover pre-two-point line geometry, touch targets, drag cleanup, instructions, dateline distance, and map readiness. No prior aggregate or plan records the confirmation card's mutable-ref/time-of-check-to-time-of-use failure.

### C11-CORE-02 — Escape-to-close is unreachable from ordinary focused controls

- Severity: Medium
- Confidence: High
- Status: Confirmed by event-target dispatch trace
- Locations: `src/lib/usePlaybackController.ts:189-249`, `src/app/page.tsx:237-259`, `src/components/TrackToolbar.tsx:129-140`, `src/components/SceneEditor.tsx:560-876`, `src/components/KeyboardHelp.tsx:36-53`; masking test at `e2e/travelback.spec.ts:3000-3010`

`usePlaybackHotkeys` classifies inputs, textareas, selects, buttons, links, dialogs, sliders, spinbuttons, contenteditable nodes, and the MapLibre canvas as interactive, then returns before its key switch. Escape is in that same switch. Normal activation of Camera leaves focus on the Camera button; focus inside SceneEditor lands on a button/input/select/slider. Therefore Escape never calls `closeOpenPanels` from the normal keyboard positions where a user would try it. SceneEditor is a nonmodal `role="region"` and has no independent Escape handler.

The shortcut help explicitly advertises `Esc - Close panels`. The KML E2E comments that Escape closes SceneEditor, but it does not assert the editor became hidden; the following Export click opens its independent modal and masks the failure.

Root fix: dispatch global Escape before suppressing playback commands for interactive targets, while preserving the export capture handler and topmost-modal/component-specific Escape ownership. Apply the interactive guard only to Space/arrows/F/E/? as appropriate. Add focused-trigger and focused SceneEditor input/select/button tests that assert the editor closes; strengthen the existing KML case to assert its panel is hidden before opening Export.

History classification: **fresh root**. Prior Escape reports concern the export rendering overlay, ModalDialog behavior, and the mobile overflow menu. Historical searches found no report that the pre-switch interactive guard defeats the global nonmodal close command.

### C11-REOPEN-01 — Unsupported drop fails to invalidate a delayed sample load

- Severity: Medium
- Confidence: High
- Status: Confirmed; reopened/incomplete historical edge
- Locations: `src/components/FileUpload.tsx:64-66,126-140,155-159`, `src/app/page.tsx:145-156,404-447,604-609`; incomplete coverage at `src/components/FileUpload.test.ts:80-116` and `e2e/travelback.spec.ts:907-942`

The parent passes `invalidateSampleLoad` as `onImportStart`. Picker input and accepted drops enter `handleFile`, which calls that callback before parsing. Unsupported drops are prevalidated in `handleDrop`; they set a local error and return before `handleFile`, so they never advance or abort the page-owned sample generation.

Concrete failure: hold `/sample-trip.gpx` response pending, click Try Sample, then drag a newer unsupported file such as `route.fit`. The UI reports the unsupported format, but the old sample remains current. When its response resolves, `handleLoadSample` passes the unchanged generation check and `loadTrackIntoSession` installs the sample, overriding the user's newer error/recovery flow. The equivalent invalid picker attempt does invalidate because it reaches `handleFile`.

Root fix: route every import attempt through one intent boundary before format-specific preflight, or call `onImportStart` at the beginning of a non-loading drop with a file. Keep parsing authority in `parseTrackFile`, avoid duplicated lifecycle semantics, and add a delayed-sample plus unsupported-drop regression.

History classification: **reopened/incomplete edge of `AG2-02` / Cycle 2 P04**, not a fresh async root. P04 established the page generation/AbortController owner and intended stale sample results to lose to newer import/manual intent; its tests cover a valid import and a manual journey, but not a locally rejected drag path that bypasses the callback.

## Duplicate, carryover, and rejected classification

- Cycle 10 `AG10-01` through `AG10-04` and `R10-01` through `R10-03` are implemented at this target and were not repeated.
- Manual-only `M10-01` (physical iOS safe-area/browser chrome) and `M9-01` (canvas focus at representative zoom/forced colors) retain their evidence exits.
- Blocked `B01` (workflow lacks `npm test`), `B02` (workflow-wide Pages/OIDC writes), `B03` (MIT claim without owner-supplied LICENSE details), and evidence-gated `B04` (`preserveDrawingBuffer`) remain separate.
- Performance deferrals `D01`-`D04` remain open and were not relabeled as fresh defects. Pending cleanup `U-2026-07-17-01` remains an end-of-loop provenance task; nothing listed there was reused, stopped, or removed.
- The unused localized `fileUpload.fileTooLarge` copy was challenged, but the current parser's format-dependent message is intentional and the residual mixed-language UX does not establish a new correctness/security root for this core pass. Unicode directional controls in local imported names were also challenged; React text rendering and the fixed `.mp4` extension prevent injection or extension spoofing, so no separate security finding was raised.

## Final missed-issue sweep

The closing pass rechecked every external input (file, pointer/touch, keyboard, local storage, URL path, worker message, timer/RAF/visibility signal) through parsing, session ownership, map/style/layer effects, playback/scene interpolation, export/finalization/download, DOM/accessibility output, cleanup, and relevant tests. It specifically replayed parser budgets, XML guards, worker settlement, sample/import generations, waypoint drag terminal paths, timeline cancellation, modal/menu focus, object-URL revocation, static path containment, CSP placement, workflow authority, and Cycle 10 repaired invariants. No fourth reportable core issue survived causal tracing and historical deduplication.
