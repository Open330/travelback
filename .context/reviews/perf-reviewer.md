# Performance Reviewer — Cycle 4 (2026-07-16)

## Result

**New performance findings: 0.** The current head introduces no new confirmed performance regression. The items below remain explicitly deferred or evidence-blocked carryovers and are not counted as Cycle 4 findings.

## Coverage and validation

Reviewed parsing limits and worker boundaries, React render ownership, playback and export frame loops, MapLibre source publication and camera work, manual-route gestures, elevation/timeline construction, codec probing, capture surfaces, static assets, and build/test scripts across the current 53-file `src/` surface and supporting configuration.

- `npm run lint`: passed.
- `npm test`: passed, 352 tests in 15 files.
- Independent typecheck evidence was unavailable because another active `next dev` process was concurrently writing `.next/dev/types/routes.d.ts`; this generated-artifact race is not treated as a product performance finding.

## Confirmed carryover register

### PERF4-CARRY-01 — Playback progress still commits root-owned React state every frame

Original severity/confidence: High / High
Current evidence: `src/lib/usePlaybackController.ts:98-155`; root consumers in `src/app/page.tsx`
Provenance: `.context/plans/deferred-findings-cycle2-2026-04-19.md:15-23` (`DF-C2-002`)

The rAF loop calls `setPlaybackProgress()` on essentially every visible frame. Progress is owned by the page-level controller, so playback continues to schedule broad React work instead of keeping map animation on an imperative/external-store boundary. This is an existing architecture deferral, not a Cycle 4 regression.

Exit criterion remains a dedicated performance cycle that profiles and restructures playback/map ownership without changing seek, scenes, camera follow, or export behavior.

### PERF4-CARRY-02 — Elevation SVG path size scales with the full track

Original severity/confidence: Medium / High
Current evidence: `src/components/ElevationProfile.tsx:20-60`
Provenance: `.context/plans/deferred-findings-cycle1-2026-04-25.md:105-109` (`DF-C1-20250425-016`)

Both line and area paths include every elevation sample. At the supported large-track ceiling this creates very large path strings and browser tessellation work. It remains intentionally deferred until large-track visual performance is profiled and a distance-aware downsampling strategy can be regression-tested.

### PERF4-CARRY-03 — Manual waypoint dragging recomputes total route distance per move

Original severity/confidence: Medium / High
Current evidence: `src/components/JourneyCreator.tsx:192-196`, `src/components/JourneyCreator.tsx:360-369`
Provenance: `.context/plans/deferred-findings-cycle2-2026-04-19.md:35-43` (`DF-C2-004`)

Every accepted drag move calls `syncUI()`, which scans all waypoints through `totalDistance()`. The established exit criterion is the next Journey Creator performance pass; an incremental adjacent-segment update or throttled preview plus exact terminal commit remains appropriate.

### PERF4-CARRY-04 — Always-on preserved WebGL buffers still require hardware evidence

Original severity/confidence: Medium / Medium
Current evidence: `src/components/MapView.tsx:582-592`
Provenance: `.context/plans/cycle3-implementation-2026-07-16.md:133-139` (`B04`)

`preserveDrawingBuffer` is required by the current export capture design and can impose interactive GPU cost, but representative mobile/low-end hardware measurements are still absent. This stays evidence-blocked; desktop emulation or code inspection cannot justify an architecture change.

## Positive checks

Cycle 3's terminal-only waypoint listener ownership and idle timeline early-return remove unnecessary global interaction work. Segmented camera-bound lookups are logarithmic at the lookup boundary, trail chunks remain bounded, and export progress remains throttled before React publication. No new unbounded loop, allocation multiplier, or network/bundle regression was found.
