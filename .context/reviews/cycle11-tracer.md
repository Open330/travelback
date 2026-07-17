# Cycle 11 data-flow tracer review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: tracer
Date: 2026-07-17

## Result

Three terminal traces lose an invariant or command owner: Journey validation loses to later ref mutation, Escape loses to the interactive playback guard, and unsupported drop never reaches the sample-generation invalidator. The first two are fresh; the third is a reopened/incomplete `AG2-02` edge.

## Inventory and trace coverage

The pass followed every external-input and state/output boundary through all 56 source/test paths; all 20 E2E/fixtures; all 19 public assets; seven build/serve/smoke scripts; workflow, README, root manifests/configs; and worker/generated asset ownership. All 787 `.context/` and 39 `plan/` paths were catalogued, with current instructions/aggregate/plan/pending/blocked inventory read and historical candidate flows searched. Dependency/build/report trees were excluded.

Fresh lint/unit/worker tools were absent from the primary install, so the traces below are exact control/data traces rather than fresh browser claims. No install, server, process, cleanup, workflow, or deployment mutation occurred.

## Traces

### TRACE11-01 — Waypoint ref -> one-time validation -> continued map writes -> invalid loaded workspace

- Severity: Medium
- Confidence: High
- Status: Fresh

1. Map click/delete/drag handlers write `waypointsRef.current` and UI state at `src/components/JourneyCreator.tsx:336-383`.
2. Done reads the ref length once at `:705-710` and opens confirmation.
3. Confirmation does not detach the map writers. The UI even reflects the changing `pointCount` at `:925-933`, proving the draft remains live.
4. Create at `:712-721` reads the mutable ref again, but does not validate or copy it.
5. Page Journey ingress at `src/app/page.tsx:409-412` sends it directly to the generic session loader; unlike `parseTrackFile` at `src/lib/parser.ts:492-520`, that boundary has no two-point validation.
6. Empty points yield empty cumulative distances at `src/app/page.tsx:196-210`. `MapView` returns at `src/components/MapView.tsx:850-854` before adding track layers, but `TrackWorkspace` still renders the truthy Track at `src/components/TrackWorkspace.tsx:127-173`. Exact live evidence therefore terminates in a stable `0 / 0 locations` workspace with playback controls and no renderable route, not a crash; the one-point variant loads `1 / 1 locations` with zero-distance controls.

Fix: preserve the Track cardinality invariant through a stable confirmation snapshot or live invalidation and central valid-Track construction. Add a mutation-between-check-and-commit regression.

History: no matching prior flow; fresh root.

### TRACE11-02 — Keyboard event -> broad interactive classification -> early return -> lost Escape command

- Severity: Medium
- Confidence: High
- Status: Fresh

1. Toolbar Camera activation at `src/components/TrackToolbar.tsx:129-140` leaves focus on an interactive button and opens a nonmodal SceneEditor.
2. Window keydown enters `usePlaybackHotkeys` at `src/lib/usePlaybackController.ts:199-205`.
3. Button/input/select/slider/dialog/canvas classification causes the unconditional return at `:207-209`.
4. Escape dispatch at `:246-248` is downstream of that return, so the event never reaches `onClosePanels`.
5. Page's panel coordinator at `src/app/page.tsx:243-259` consequently retains `showSceneEditor=true`, contradicting `KeyboardHelp`'s Close panels contract.

Fix: give dismissal routing precedence over playback suppression, with explicit export/modal/menu consumption order. Test the terminal panel state, not just the key press.

History: prior export-overlay, ModalDialog, and menu Escape paths terminate in different listeners; this lost global command is fresh.

### TRACE11-03 — Sample generation -> unsupported child preflight -> missing invalidation -> stale sample session

- Severity: Medium
- Confidence: High
- Status: Reopened/incomplete `AG2-02`

1. `handleLoadSample` at `src/app/page.tsx:414-447` advances generation, creates an AbortController, fetches/parses the fixed sample, and guards completion by generation/signal.
2. Page passes the generation invalidator to FileUpload as `onImportStart` at `:604-609`.
3. Accepted drop and picker input reach `handleFile`, whose first action at `src/components/FileUpload.tsx:64-66` invokes that callback.
4. Unsupported drop is intercepted at `:126-135`; it emits a local error and returns before the callback.
5. The older sample's completion guard still succeeds and terminates in `loadTrackIntoSession`, replacing the newer error flow.

Fix: make file-attempt intent cross the page lifecycle boundary before local validation, or remove the child-only preflight and use the parser's authoritative format error. Add a deferred response regression.

History: same stale-result ownership root as Cycle 2 `AG2-02/P04`, newly evidenced incomplete branch; do not count as fresh.

## Cross-flow non-findings and carryovers

Parser worker messages retain one implementation and bounded settlement; Cycle 10 name/fallback metadata reaches localized display/export correctly; playback seek origin now rebases; elevation retains segment metadata; export result states remain exhaustive; map style/generation, object URLs, modal stacks, and static path/CSP flows reach credible cleanup owners.

`M10-01`, `M9-01`, `B01`-`B04`, `D01`-`D04`, and final cleanup `U-2026-07-17-01` retain their prior classification and exits. No inventoried process/path was reused, stopped, or removed.

## Final missed-issue sweep

The closing trace restarted at files, pointer/touch, keyboard, storage, URL, worker message, fetch, animation/visibility, and export signals, then followed each through refs/state, derived structures, map/DOM/video terminals, failure cleanup, and tests. Every additional candidate either terminated safely, matched a fixed historical issue, or belonged to an explicit carryover. No fourth ownership loss survived.
