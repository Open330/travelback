# Cycle 8 Architect — 2026-07-17

## Result

COMMENT. The client-only architecture remains coherent: format adapters converge on `Track`, the worker shares parser logic, map math and rendering are separated, lifecycle controllers own playback/export, and static delivery hardening remains fail-closed. Two Medium boundary contracts are incomplete: observation identity is conflated with coordinate equality when timestamps are absent, and drag-click suppression has two owners with incompatible lifetimes.

## Independent provenance and architecture inventory

- Targeted `81342b7fab1cc2577909b63025bb2452dcb5446b`; reviewed the complete Cycle 7 delta from `2df1516` and the current dependency graph without changing implementation files.
- Catalogued all 898 tracked paths. The architectural pass included 37 textual production files under `src`, 16 unit/component suites, the worker and generated-worker parity path, the 2,783-line E2E suite plus 18 fixtures, seven scripts, all root/test/build configurations, the Pages workflow, 19 public assets, and current project/development/plan/README documentation.
- Boundaries traced explicitly: upload → worker/direct parser → canonical `Track`; `Track` → distance/interpolation/map/timeline/scenes/export; map generation/style hydration → Journey Creator binding; mouse/touch/window terminal events → waypoint state; locale/theme/storage → UI; WebCodecs → finalized blob/save/share; source → static export/hardening/server/Pages.
- The current context set and all Cycle 7 reports were read for requirements and duplicate suppression. Historical `.context` and legacy `plan/` trees were indexed/searchable but superseded documents were not treated as active architecture. Binary font/favicon payloads were excluded from semantic review; declarations and delivery were included. Lockfile and generated worker were reviewed structurally/parity-wise.

## Architecture findings

### ARCH8-01 — The canonical adapter equates unknown observation identity with equal coordinates

- Severity: Medium
- Confidence: High
- Status: Confirmed current contract defect; same product root cause as CR8-01
- Location: `src/lib/googleJsonParser.ts:108-117,228-285`; `src/types.ts:1-12`; downstream trust in `src/lib/interpolate.ts:83-218` and `src/lib/map-geometry.ts:31-228`; missing contract coverage at `src/lib/parser.test.ts:536-548`

Boundary problem: `TrackPoint` has optional time, so two untimed points at the same coordinates are not provably the same observation. The Google adapter nevertheless derives identity from `{lat,lng,''}` and deduplicates across an entire segment. It thereby performs lossy semantic normalization before the canonical model is established.

Concrete failure scenario: a phone export's fallback waypoint path A → B → A crosses the adapter as A → B. Distance, interpolation, timeline, camera, map, and video layers all behave consistently on the wrong canonical track, and none has enough source context to restore the return visit.

Recommended fix: define observation identity as a parser invariant. Exact coordinate-plus-valid-timestamp equality can identify duplicate branches; missing time cannot. Preserve untimed sequence members, or introduce a narrowly scoped adjacent-noise policy with provenance. Encode the invariant in shared adapter contract cases exercised through both the direct call and worker boundary.

### ARCH8-02 — Drag suppression is split between an expiring deadline and an unbounded latch

- Severity: Medium
- Confidence: High
- Status: Confirmed current state-ownership defect; same product root cause as CR8-02
- Location: `src/components/JourneyCreator.tsx:189-192,328-411,437-504`; lifecycle coverage at `src/components/JourneyCreator.test.ts:149-248`

Ownership problem: one drag gesture creates two suppression mechanisms. `suppressMapClickUntilRef` belongs to the generic map click path and expires after 250 ms. `dragMovedRef` belongs to the waypoint layer path and has no clock or terminal reset; it is cleared only by a future layer click, a new drag, or full listener cleanup. A historical event is therefore allowed to reinterpret an unrelated future event.

Concrete failure scenario: a drag terminates through window `mouseup` without a subsequent layer click. Minutes later, the first click intended to delete any waypoint is consumed by the stale latch. A controlled component run reproduced the retained feature. The UI offers no explanation because the click handler exits before state changes.

Recommended fix: give the settled drag one time-bounded suppression owner consulted consistently by both click paths, with event ordering defined. Terminal handling must leave no indefinite state. Contract tests should cover mouse/touch, immediate synthetic click in either handler order, no synthetic click, time expiry, and the first later delete.

## Cross-boundary assessment

- Parser/worker parity is healthy but cannot validate semantics by equality alone: both sides import the same faulty normalization. Golden expected tracks are required for ARCH8-01.
- The E2E revisit case at `e2e/travelback.spec.ts:2697-2700` crosses segment boundaries and therefore validates a different invariant than same-segment observation identity.
- Journey Creator correctly centralizes transient listener removal and map-generation rebinding, but its click suppression predates that clearer lifecycle ownership. Consolidation should stay local to the component rather than add global map behavior.
- The Cycle 7 changes preserve their intended contracts. Shared import-size policy, localized presentation, parser chronology, and CSS clearance do not introduce a new dependency cycle or duplicated authority.
- Known B01-B04 and D01-D04 remain ledger items, not new architecture discoveries.

## Evidence and final sweep

Fresh lint, no-emit typecheck, 393/393 tests, worker parity, and audit all passed. Direct data and controlled component probes confirmed both architecture defects despite the green suite. No server/build/E2E process was started under the assignment constraint.

I re-evaluated module responsibility, canonical data invariants, shared constants, state ownership, lifecycle generation, recovery paths, static deployment boundaries, and every Cycle 7 changed interface. No further architecture issue met the reproducibility, reachability, and non-duplication threshold.
