# Cycle 11 skeptical critic review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: critic
Date: 2026-07-17

## Result

The adversarial pass retained three fresh user-visible roots and one reopened
async edge. Two normal commands lose their invariant or destination: Journey
Create can commit a route after it has fallen below two points, and the
advertised Escape command is filtered out precisely when focus is on a normal
control. FileUpload also retains a rejected-file alert after a successful
sample load. Finally, an unsupported drop still fails to defeat an older held
sample; that is an incomplete branch of Cycle 2 `AG2-02`, not a new async root.

The pass explicitly rejects the stronger claim that a zero-point Journey
immediately crashes. The live exact-HEAD app stayed mounted at `0 / 0`; the
source explains why: `hydrateCurrentStyle` returns `false` before
`addTrackLayers` when cumulative distances are empty. The real failure is an
accepted but non-hydrated, meaningless track session with listeners left
waiting for a state that cannot become valid.

## Inventory and method

- Inventoried the complete 113-path review surface: all 56 `src/` source/test
  paths, `e2e/travelback.spec.ts` and 19 fixtures, 19 public assets, seven
  scripts, workflow, README, manifests, and authored root configuration.
  Binary font/favicon assets were recorded rather than semantically decoded;
  the generated worker was traced to its source.
- Catalogued all tracked `.context/` and `plan/` paths. Read current project and
  development context, the Mina persona, Cycle 10 aggregate and completed plan,
  the pending cleanup inventory, blocked/deferred ledgers, and prior Cycle 10
  role reports. Historical searches classified each candidate before reporting.
- Challenged every external intent (file/drop/sample, map pointer, keyboard,
  storage, worker result, animation clock, export result) against its terminal
  DOM/map/session state instead of accepting comments or passing test names.
- Fresh primary-worktree lint/type/unit/worker commands were unavailable because
  the pre-existing dependency tree lacks their executables; no install or server
  mutation was made. `npm audit --audit-level=high` returned zero vulnerabilities.
  Cycle 10's full accepted matrix applies to identical application code at
  `cc720a2`, but is recorded only as historical provenance.
- Live evidence came from the inventoried exact-HEAD static server at
  `http://127.0.0.1:43117/travelback/`, with isolated desktop/mobile sessions.

## Findings

### CRIT11-01 — Journey confirmation validates once, then commits a different route

- Severity / confidence: Medium / High
- Status: Fresh, live and source confirmed
- Locations: `src/components/JourneyCreator.tsx:336-369,705-721,925-962`;
  `src/app/page.tsx:332-347,409-412`; canonical parser invariant
  `src/lib/parser.ts:492-520`; empty-map guard
  `src/components/MapView.tsx:848-856`

`Done` checks for two points, but the nonmodal confirmation card leaves waypoint
delete/drag/add handlers live. `Create Route` reads the mutable ref again without
copying or revalidating it and is never disabled when `pointCount` falls.

Live counterexample: two points -> Done -> delete one left `1 location`,
`1 locations · 0 m`, and an enabled Create button; Create installed a `1 / 1`
workspace with `0 m / 0 m`. Deleting both installed a `0 / 0` workspace. It did
not crash in the observed build, but it never acquired track layers because the
empty cumulative-distance guard rejects hydration. Both outcomes contradict the
same parser-enforced two-point domain invariant.

Root fix: make confirmation own an immutable valid snapshot, or keep it live but
disable Create and return to editing with localized feedback below two points.
Revalidate and copy at commit, ideally through one Track-construction validator
shared by parser and Journey ingress. Test mutation between Done and Create at
one and zero points.

### CRIT11-02 — The `Esc` promise is unreachable from ordinary focused controls

- Severity / confidence: Medium / High
- Status: Fresh, live and source confirmed
- Locations: `src/lib/usePlaybackController.ts:189-249`;
  `src/app/page.tsx:237-259`; `src/components/KeyboardHelp.tsx:43-50`;
  masking test `e2e/travelback.spec.ts:2994-3010`

The hotkey listener returns for buttons, inputs, selects, dialogs, sliders,
spinbuttons, links, and the map canvas before it switches on `event.key`.
Escape therefore cannot reach `onClosePanels` from the controls users actually
focus. In the clean live session, opening Camera left focus on the Camera button;
pressing Escape left both focus and SceneEditor unchanged.

Root fix: route global/topmost dismissal before playback-only interactive-target
suppression, with explicit export/modal/menu precedence. Strengthen the KML test
to assert SceneEditor is hidden before Export opens, and cover focused trigger,
name input, select, and slider cases.

### CRIT11-03 — A successful sample keeps the previous rejection alert forever

- Severity / confidence: Medium / High
- Status: Fresh, live and source confirmed
- Locations: `src/components/FileUpload.tsx:23-27,64-80,161-190,219-244`;
  `src/app/page.tsx:414-447,603-611`

FileUpload clears its local `error` only inside `handleFile`. The sample CTA calls
the parent callback directly, so a previous unsupported-file error survives the
successful external load and is rendered in FileUpload's loaded-state overlay.
Live, an SVG rejection followed by the sample displayed the route and
`Track loaded: Namsan Tower Walk` while the red "not a travel route file" alert
remained indefinitely over the upper-left map controls.

Root fix: give every replacement intent an explicit local-error reset (for
example, a FileUpload-owned sample wrapper) and assert that successful sample or
valid import state contains no stale alert. Do not use a timer to hide a state
ownership error.

### CRIT11-04 — Unsupported drop still loses to an older held sample

- Severity / confidence: Medium / High
- Status: Reopened/incomplete Cycle 2 `AG2-02/P04`, not fresh
- Locations: `src/components/FileUpload.tsx:64-66,126-140`;
  `src/app/page.tsx:145-156,414-447,603-610`; partial E2E coverage
  `e2e/travelback.spec.ts:917-937`

Accepted drops and picker attempts reach `handleFile`, which first invokes the
parent sample invalidator. Unsupported drops are rejected by child preflight and
return before that callback. A page-local 2.5-second sample hold reproduced the
race: the newer `.txt` drop displayed its recovery alert, then the released old
sample installed Namsan while the alert remained.

Root fix: notify the page of every new file intent before extension preflight, or
remove duplicated child preflight and let the parser own rejection. Add the held
sample plus unsupported DragEvent regression. History remains `AG2-02`: Cycle 2
created the generation/abort owner but missed this locally rejected branch.

## Rejected, duplicate, and carryover classification

- Rejected: immediate zero-point ErrorBoundary crash. Live evidence and the
  `hydrateCurrentStyle` guard contradict it; reports must use the accurate
  non-hydrated `0 / 0` outcome.
- Cycle 10 active-seek, segmented elevation, imported-name bound/localization,
  H1, Journey Cancel size, readiness, and export truthfulness fixes remain
  applied and were not repeated.
- `M10-01` real-iOS safe area and `M9-01` representative canvas-focus evidence
  remain manual-only. `B01`-`B04`, `D01`-`D04`, and final cleanup
  `U-2026-07-17-01` retain their recorded authority/evidence exits.

## Final missed-issue sweep

The closing pass replayed empty/singleton/segmented tracks, map-style hydration,
all parse intent orderings, pointer/drag terminals, focused command routing,
modal and nonmodal closure, locale changes, export ready/fallback/picker states,
object URLs, storage failures, CSP/static paths, and tests whose comments were
stronger than assertions. No fifth actionable root survived exact failure
tracing and historical deduplication.
