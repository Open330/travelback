# Cycle 11 architecture review

Target: `7273d464fdce24fc06350ce1444c3a2e8d26829d`
Role: architect
Date: 2026-07-17

## Result

Two fresh ownership faults and one reopened lifecycle edge explain the reportable failures:

1. Journey's confirmation phase does not own a stable, valid draft; live map mutation remains authoritative after validation.
2. A playback-hotkey filter owns the global panel-close command, so playback suppression accidentally suppresses Escape.
3. FileUpload's duplicated extension preflight bypasses the page's sample-generation owner; this reopens an edge of `AG2-02`.

No new dependency cycle, parser/worker implementation fork, export-state ambiguity, map-generation split-brain, or static-build ownership fault survived the final sweep.

## Architecture inventory

Inventoried and traced imports/state across the complete 56-file `src/` surface, 20 E2E/fixtures, 19 public assets, seven scripts, root configs/manifests/docs, and Pages workflow. The pass followed the application boundaries for file/worker parsing, sample/import/manual session creation, Track invariants, map lifecycle and imperative handle, Journey editing, playback/hotkeys, scene/camera interpolation, export finalization/download state, locale/theme hydration, modal/menu ownership, and static export hardening. All 787 `.context/` and 39 `plan/` paths were catalogued; current instructions, Cycle 10 aggregate/plan, pending inventory, and relevant historical architecture reviews were read or searched.

Fresh local gates could not launch because primary dependencies are incomplete. No dependency install, server, copy reuse, workflow change, or deployment occurred. Application code is identical to historically accepted exact-code commit `cc720a2`; that provenance does not replace fresh validation.

## Findings

### ARCH11-01 — Journey's two-phase commit has no draft/invariant owner

- Severity: Medium
- Confidence: High
- Status: Fresh, confirmed
- Locations: `src/components/JourneyCreator.tsx:336-369,705-721,925-962`; `src/app/page.tsx:196-210,332-347,409-412`; `src/lib/parser.ts:492-520`; `src/components/MapView.tsx:836-856,1075-1139`; `src/components/TrackWorkspace.tsx:127-173`

The editor validates the mutable waypoint ref to enter confirmation, but confirmation neither freezes that collection nor owns a copied draft. Map listeners continue writing the ref, while Create commits whatever array happens to exist later. The application also has two Track ingress contracts: parser ingress enforces two points, whereas Journey ingress calls `loadTrackIntoSession` directly with no common domain validator. The empty aggregate still satisfies page truthiness and enters the loaded-workspace contract, even though cumulative-distance and map-hydration guards leave it with no renderable route.

Failure scenario: two valid points cross the Done boundary; live deletion reduces them to zero; Create commits the invalid aggregate. Exact live reproduction settles into a stable `0 / 0 locations` workspace with playback controls and no track layers rather than crashing, exposing two incompatible definitions of a loaded Track. A one-point commit similarly loads `1 / 1 locations` with zero-distance controls.

Architectural correction: define a single valid-Track construction boundary shared by every producer, and make confirmation an explicit state machine (`editing -> confirming(valid snapshot) -> committed`) or keep it live with invariant-aware invalidation. Presentation buttons must derive enabled state from the same owner. Tests should cover mutation between validation and commit, not only each phase in isolation.

History: fresh. Earlier journey work addressed line geometry, drag/readiness, touch sizing, instructions, and map ownership, not this phase boundary.

### ARCH11-02 — Global command routing is embedded inside playback suppression

- Severity: Medium
- Confidence: High
- Status: Fresh, confirmed
- Locations: `src/lib/usePlaybackController.ts:189-249`; `src/app/page.tsx:237-259`; nonmodal consumer `src/components/SceneEditor.tsx:560-876`

`usePlaybackHotkeys` owns both playback commands and global UI commands. Its first decision is an interactive-target suppression appropriate for Space/arrows/F/E, but Escape is dispatched only afterward. That makes the structural target classification—not panel/modal state—the accidental owner of whether panels can close.

Failure scenario: Camera opens from its toolbar button and focus remains there; the button matches the guard, so Escape never reaches the page panel coordinator.

Architectural correction: separate global dismissal from playback shortcuts. A top-level command router should resolve export capture, top modal/menu, then nonmodal panels; playback-specific commands can retain the interactive-target guard. At minimum, route Escape before the playback guard with clear precedence and consumed-event rules.

History: fresh. Export overlay, ModalDialog, and mobile menu Escape paths are historical but separate owners.

### ARCH11-03 — Child preflight bypasses the page-owned async intent boundary

- Severity: Medium
- Confidence: High
- Status: Reopened/incomplete `AG2-02`, not fresh
- Locations: `src/components/FileUpload.tsx:64-66,126-140`; `src/app/page.tsx:145-156,414-447,604-609`

Cycle 2 correctly placed sample generation/abort ownership in the page and exposed `onImportStart` to FileUpload. FileUpload then retained a child-only extension preflight that can terminate an import intent before notifying that owner. Valid imports and picker-invalid files cross the owner boundary; drag-invalid files do not.

Failure scenario: a delayed sample is still current after an unsupported drop and later installs itself despite the newer user action.

Architectural correction: send intent/lifecycle notification before child validation, or consolidate extension validation at the parser boundary. Parent-owned async generations must be invalidated by every newer mutually exclusive session intent, including intents rejected locally.

## Boundary non-findings and carryovers

Main-thread and worker Google parsing still share one implementation/limit contract. Cycle 10 moved manufactured-name localization to presentation and made export completion states truthful; neither boundary reopened. Map generation/style ownership, camera math sharing, URL/blob cleanup, theme/locale storage, CSP postbuild rewriting, and static base-path routing retain clear owners.

Manual `M10-01`/`M9-01`, blocked `B01`-`B03`, evidence-gated `B04`, performance `D01`-`D04`, and pending final cleanup remain their own ledgers and are not architectural rediscoveries.

## Final missed-issue sweep

The last architecture pass challenged every duplicated state/ref, async producer, derived-data cache, worker/main boundary, modal stack, map effect, scene interval, export lease, parser invariant, and build/runtime authority. It also compared every candidate with current aggregate and implementation plans. No fourth ownership failure met the evidence and freshness threshold.
