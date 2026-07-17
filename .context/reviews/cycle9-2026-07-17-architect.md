# Cycle 9 architecture review — 2026-07-17

## Result

**New architecture findings: 1.** ARCH9-01 is the same deduplicated root as CR9-01: transition ownership is split among inclusive scene selection, a gap interpolator, and two scene-local boundary interpolators. No additional dependency cycle, duplicated parser authority, lifecycle-owner conflict, or Cycle 8 architectural regression was found.

## Scope

Reviewed exact HEAD `342b8c13` against `81342b7`, all 55 tracked `src` files, the complete unit/E2E/fixture set, public worker/assets, scripts/configuration/workflow, dependency graph, README, and active `.context` architecture/development/plan/review material. All 913 tracked paths were inventoried; 39 legacy plans and 747 non-active context documents were searched for provenance and duplicate suppression. Cross-file tracing covered import→parser/worker→track state, timeline trimming, scene authoring→camera preview/playback/export, MapLibre construction/style/pose readiness, Journey Creator map ownership, and export finalization.

## ARCH9-01 — Three branches claim the same camera-transition timeline

- **Location:** `src/lib/camera.ts:540-631`, especially inclusive first-match selection at `540-547`, full-gap ownership at `549-576`, and independent incoming/outgoing ownership at `612-631`. Authoring permits both touching scenes and gaps through `src/components/SceneEditor.tsx:356-405,444-490`; presets make touching scenes the default at `src/lib/camera.ts:394-445,475-519`.
- **Architecture fault:** `computeCameraForProgress` decides a scene first and then lets the selected scene blend toward both neighbors. That model has no boundary object or interval with exclusive authority. At a shared endpoint, first-match inclusivity selects A, so A completes A→B; immediately after, B restarts A→B. At an internal gap, the gap branch already defines A→B across the full gap, yet A's outgoing and B's incoming zones still pre-empt the endpoints, yielding three forward traversals separated by two backward resets.
- **Concrete failure:** A `[0,.5]` (`zoom=10,pitch=20,offset=0`) followed by B `[.5,1]` (`18,70,90`) returns B's `18/70/180°` state at `.5` on the eastbound unit track, then approximately A's `10/20/90°` state at `.500001`. With A `[0,.4]` and B `[.6,1]`, the center jumps from B-start `.6` to A-end `.4` just after the gap begins and again at the next-scene boundary. Both live MapView and encoder consume this shared function (`src/components/MapView.tsx:803-817`; `src/lib/videoEncoder.ts:228-237`).
- **Failure scenario:** the default multi-scene Cinematic/Dynamic sequence cannot maintain a continuous camera path across differently parameterized scenes; user-created gaps are worse and can jump backward by the whole uncovered track interval. The incorrect state is deterministic and exported, not a presentation-only smoothing artifact.
- **Fix:** introduce one transition resolver before ordinary scene evaluation. A touching boundary owns one centered interval and one monotone endpoint blend. A non-zero gap exclusively owns its whole interval; per-scene boundary blending is disabled across that gap. Ordinary scene evaluation owns only the remainder. Keep rotation endpoint stabilization in the single resolver, and make endpoint-inclusion rules explicit rather than dependent on array iteration order.
- **Regression:** table-drive touching and gapped scene pairs with distinct modes/centers/zoom/pitch/bearing. Sample `boundary±epsilon`, both `gapStart±epsilon` and `gapEnd±epsilon`, and assert continuity plus monotonic travel. Include rotation modes and prove `MapView`/encoder continue sharing the normalized resolver.
- **Severity:** Medium.
- **Confidence:** High.
- **Status:** Confirmed.

## Cycle 8 architecture comparison

- Parser identity is now correctly owned by ordered observations inside each semantic segment, with direct and worker adapters sharing `googleJsonParser.ts`.
- Drag-terminal suppression now has one bounded deadline consumed by both click handlers and retired independently of handler order.
- SSR locale state is deterministic and client preference resolution is post-mount, preserving hydration ownership.
- Map generation, style revision, and track hydration remain separate events, but `src/components/MapView.tsx:1101-1129` now explicitly retries the current revision and removes all readiness listeners on success/staleness/cleanup.
- Spanish copy changes do not alter translation-key authority or dictionary parity.

No new cycle/import inversion or duplicate source-of-truth was found elsewhere.

## Dependency architecture

The direct graph remains 7 runtime plus 12 development dependencies. Audit is clean; lockfile hosts/integrity are uniform. Two Tailwind packages have a compatible 4.3.3 patch available while locked at 4.3.2. TypeScript 7 is not an isolated upgrade because the current `typescript-eslint` peer cap is `<6.1.0`, and Node typings intentionally follow Node 24 LTS. These should be handled as deliberate dependency-set migrations, not ad hoc single-package edits. No library abstraction or replacement is justified by the current review.

## Existing ledger and final sweep

B01-B04 and D01-D04 remain documented in `.context/reviews/_aggregate.md:31-43` and were not re-counted. Fresh lint, no-emit typecheck, 17 suites/400 tests, worker parity, and audit passed. No server/build/browser/deployment process ran. The final architecture sweep checked component ownership, refs/effects, parser parity, worker generation, track/segment data flow, camera consumers, static build/hardening, and library boundaries; only ARCH9-01 survived.
