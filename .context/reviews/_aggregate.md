# Aggregate Deep Review — Cycle 6

Date: 2026-07-24
Reviewed revision: `099e85d8860456dea5e59cfa293a12defb27bd99`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The 12-role reviewer fan-out produced **4 genuinely new, deduplicated
findings**:

- 0 Critical
- 0 High
- 4 Medium
- 0 Low

All four causal roots are scheduled for Cycle 6; none is deferred. Reports
shared by multiple roles are counted once at the highest supported severity.
Completed Cycle 1–5 work, the three explicit native/host-capability
deferrals, and the final-loop-only user cleanup task were excluded.

Fresh browser-free review evidence:

- `npx vitest run src/lib/parser.test.ts` passed 174/174 tests.
- Focused SceneEditor and playback-hotkey Vitest passed 30/30 tests.
- Static reference tracing confirmed that no production consumer reads
  `PreparedTrackGeometry.wrappedSegments`.
- The pre-Cycle-5 parser source and the installed GPX fallback behavior
  independently confirmed the empty-track route regression.
- No reviewer ran a full suite, supervisor, E2E, Playwright, Chromium,
  browser, server, deploy, push, commit, or process-termination command.
- The pre-review ownership audit found only protected user Chrome rooted at
  PID 1368 and unrelated host services. Ports 3099, 4173, and 4183 were free,
  `.next/dev/lock` was absent, and the protected Chrome identity was
  unchanged after review.

## Review provenance

Current Cycle 6 reports:

- `cycle6-2026-07-24-code-reviewer.md`
- `cycle6-2026-07-24-architect.md`
- `cycle6-2026-07-24-critic.md`
- `cycle6-2026-07-24-perf-reviewer.md`
- `cycle6-2026-07-24-security-reviewer.md`
- `cycle6-2026-07-24-verifier.md`
- `cycle6-2026-07-24-tracer.md`
- `cycle6-2026-07-24-debugger.md`
- `cycle6-2026-07-24-test-engineer.md`
- `cycle6-2026-07-24-document-specialist.md`
- `cycle6-2026-07-24-designer.md`
- `cycle6-2026-07-24-non-tech-traveler-reviewer.md`

All requested roles completed. The concurrency-limited fan-out grouped
compatible roles without dropping any review. No reviewer-owned browser or
server exists.

## Deduplicated findings

### AGG6-01 — Empty semantic GPX tracks suppress a valid route fallback

Severity: **Medium**
Confidence: **High**
Agreement: verifier, debugger, critic

Evidence:

- `src/lib/parser.ts:318-400,670-702`
- `src/lib/parser.test.ts:995-1026,1051-1063,1334-1362`

`extractPointsFromGpxSegments()` returns a truthy semantic result whenever an
owned `trkseg` exists, even if every direct point is empty, malformed, or
out-of-range. `parseGPX()` then skips `@tmcw/togeojson`, discarding a valid
sibling route and eventually raising `TOO_FEW_POINTS`.

Before Cycle 5, empty retained segments were filtered before the fallback
decision. The regression is distinct from the older policy that a usable
track takes precedence over route features.

Fix: return `null` after bounded semantic extraction when zero valid points
were retained, preserving valid-track precedence and all namespace, nesting,
and point-budget protections. Cover both empty and all-invalid tracks
followed by a two-point route.

### AGG6-02 — Prepared tracks retain an obsolete coordinate graph

Severity: **Medium**
Confidence: **High**
Agreement: performance reviewer, tracer

Evidence:

- `src/lib/map-geometry.ts:202-211,274-360,489-506`
- `src/components/MapView.tsx:296,338-361,558-835,999-1023`
- `src/lib/map-geometry.test.ts:243-244,273-280,345,459,491`

`prepareTrackGeometry()` allocates the raw unwrapped segment graph, then
allocates a distinct renderer-rebased graph. Bounds, route geometry, trail
chunks, and the active head all use renderer data, but the returned prepared
object still retains the raw graph in `preparedTrackRef` for the entire track
session. At the supported limit, that keeps 250,000 otherwise-unused
coordinate tuple arrays strongly reachable.

This is not the old accepted cost of the raw graph when it was itself the
rendering cache. Renderer rebasing later made that field test-only and
production-unread.

Fix: remove `wrappedSegments` from `PreparedTrackGeometry` and its returned
object. Keep raw unwrapping coverage against the exported
`precomputeWrappedSegments()` helper and assert that prepared production
output contains only renderer-consumed fields.

### AGG6-03 — Scene-camera preview ownership can end without restoration

Severity: **Medium**
Confidence: **High**
Agreement: code reviewer, architect, test engineer, designer, non-technical
traveler reviewer

Evidence:

- `src/components/SceneEditor.tsx:436-650`
- `src/lib/usePlaybackController.ts:219-235`
- `src/app/page.tsx:259-268,511-551`
- `src/components/SceneEditor.test.ts:241-311`

Scene preview imperatively moves the live camera to a scene midpoint, but the
editor does not record whether a preview actually reached the map. A camera
slider can move away and back to its exact origin, then release without
committing or restoring. An applied keyboard preview can also survive global
Escape because unmount cancels only a pending frame. With paused playback or
Follow off, the camera remains visibly stale.

The parent now handles `onPreviewScene(null)` correctly, so this is distinct
from the historical ignored-clear defect. These terminal paths simply fail
to emit the clear.

Fix: model pending/applied preview ownership explicitly. Restore an applied
preview exactly once on cancel, net-zero settlement, Escape, or unmount;
transfer ownership cleanly on a real commit; and keep a close that never
published a preview camera-neutral. Add deterministic component regressions
for net-zero pointer settlement and preview-then-unmount.

### AGG6-04 — A net-zero scene-range drag revokes a completed export

Severity: **Medium**
Confidence: **High**
Agreement: code reviewer, architect, test engineer, designer, non-technical
traveler reviewer

Evidence:

- `src/components/SceneEditor.tsx:202-326,652-704,759-783`
- `src/app/page.tsx:502-509`
- `src/lib/useExportController.ts:113-126`
- `src/components/SceneEditor.test.ts:313-365`

`SceneRangeEditor` commits whenever any pointer move occurred, even when its
final canonical range exactly equals the drag origin. The editor publishes a
new but value-identical scene array; the page treats publication identity as
a real edit and revokes the completed export result.

This is a current SceneEditor transaction defect, not the completed Timeline
no-op release fix. The older direct scene/export coverage note did not fix or
record this concrete path.

Fix: suppress an origin-equivalent gesture commit and independently guard
the session boundary by complete scene-value equality. Add component
coverage for away/back/release and a pure equality regression so a future
same-values publication cannot invalidate export ownership.

## Exclusions

- All completed Cycle 1–5 causal roots and their gate corrections.
- The three explicit native/host process boundaries: pre-observation identity
  erasure, pidfd-grade atomic signaling, and host-environment marker
  discovery.
- The final-loop-only user task under
  `.context/plans/user-injected/pending-next-cycle.md`.
- Historical mixed-GPX feature policy, Timeline no-op handling, ignored
  preview-clear handling, and raw geometry caching before renderer rebasing.
- Browser-only responsive observations that lacked a distinct current
  source-backed failure.

No reviewer failed. No deployment occurred.
