# Architect Review — Cycle 2 (2026-07-23)

Reviewed revision: `279f5676eb34baa4929a536fa0c20e9cbc556f34`
Comparison base: `994820a71b0b87de78fdfd2a1fd2c17e7ad3b516`

## Result

**New architecture findings: 3.**

- **ARCH2-01 (Medium / High):** the no-scene camera program has three conflicting authorities.
- **ARCH2-02 (Medium / High):** `OwnedProcessTracker` exposes one cleanup contract but its Windows implementation owns only a root PID.
- **ARCH2-03 (Medium / High):** rendered geometry owns ordered longitude unwrapping, while three viewport consumers independently choose a different world copy.

These are the architecture roots of CR2-01 through CR2-03. The three explicit Cycle 1 deferrals remain excluded.

## System coverage

The review inventoried all 970 tracked paths and fully traced the 131 current product-relevant paths: static delivery and base-path policy; parser and generated-worker ownership; full/trimmed track models; segmented interpolation; camera/scene state; MapLibre construction, style revisions, retries, and export presentation; Journey and Scene Editor gesture boundaries; playback/export leases; modal/toast composition; static hardening/serving; and development/static test orchestration. All authored source, tests, fixtures, scripts, configuration, workflow, public text assets, and governing project/development context were covered. Historical reports/plans were searched for provenance and duplicate suppression.

No browser, Playwright, E2E suite, server, build, deployment, or source mutation was run by this role.

## Findings

### ARCH2-01 — No-scene camera behavior has three conflicting authorities

Severity: **Medium**
Confidence: **High**
Status: **Confirmed boundary inconsistency**
Related code finding: **CR2-01**

Exact regions:

- `src/components/MapView.tsx:813-840,1193-1217`
- `src/lib/camera.ts:381-388,525-538`
- `src/lib/useExportController.ts:169-176`
- `src/components/SceneEditor.tsx:790-822,853-879`
- `.context/project/02-architecture.md:98-105`

Architecture evidence:

- `MapView` owns one default-follow definition: point center, 600 m segment-local bearing, pitch 45, zoom 13.
- `camera.ts` owns a second: point center, interpolation bearing, pitch 45, zoom 14.
- `useExportController` bypasses both as a policy decision and converts an empty scene list into the Cinematic preset.
- `SceneEditor` correctly models Cinematic as an explicit user action, while the export boundary silently models it as a default.
- Cycle 1 corrected documentation and UI copy to match the first interpretation without changing the contradictory executable boundary.

The architectural problem is not merely a stale conditional. “Camera program” is implicit state reconstructed differently by the live renderer, encoder, and controller. Consequently preview/export equivalence cannot be stated or tested as one invariant.

Recommended boundary:

Represent camera intent explicitly:

- `CameraProgram = { kind: 'follow'; params: ... } | { kind: 'scenes'; scenes; transitionDuration }`;
- keep preset factories in the authoring layer and require the user action to turn a preset into a scene program;
- expose one pure `computeCameraForProgram(track, distances, program, progress, elapsed)` function to both MapView and export;
- make the controller transport the selected program, not invent one.

Contract tests should feed the same program and progress samples to preview and export and assert identical target camera states. Smoothing may remain a presentation concern after the shared target is computed.

### ARCH2-02 — Windows does not implement the ownership promised by `OwnedProcessTracker`

Severity: **Medium**
Confidence: **High**
Status: **Confirmed abstraction-contract violation**
Related code finding: **CR2-02**

Exact regions:

- `scripts/e2e-process-supervisor.mjs:85-240,262-348`
- `scripts/e2e-process-supervisor.test.mjs:115-223`

Architecture evidence:

- The orchestration layer is written against a common lifecycle shape—`start`, `stop`, `signalAndWait`, `describe`—and `stopOwnedProcessTree` assumes that a successful return means all owned descendants exited.
- The POSIX implementation establishes durable identities and discovers descendants/groups. The Windows implementation establishes no inventory or durable container; it retains only the root PID.
- The ordinary completion order is root status first, cleanup second. Once the Windows root is gone, its implementation cannot even attempt tree cleanup and nevertheless returns success.
- The platform contract suite is actually a POSIX-only suite. Every descendant-ownership assertion is skipped on Windows.

This means the interface name and success value overstate the capability of one implementation. Callers cannot distinguish “complete owned tree is gone” from “root PID is gone.”

Recommended boundary:

Make durable containment a prerequisite of `OwnedProcessTracker.start()`. On Windows, attach the spawned process to a Job Object before accepting ownership and close/terminate the job during cleanup. If that cannot be guaranteed, return an unsupported/error state rather than a successful tree cleanup. Keep exact process identity and “unrelated sentinel survives” as platform-neutral conformance tests, with Windows included in CI. Target-specific wrappers should continue to consume the supervisor as data; they must not gain platform cleanup branches of their own.

### ARCH2-03 — World-copy selection sits outside the prepared-geometry source of truth

Severity: **Medium**
Confidence: **High**
Status: **Confirmed duplicated domain policy**
Related code finding: **CR2-03**

Exact regions:

- `src/lib/map-geometry.ts:34-72,113-240`
- `src/lib/camera.ts:207-268`
- `src/components/MapView.tsx:184-293,843-924`

Architecture evidence:

- Cycle 1 established `PreparedTrackGeometry.wrappedSegments` as the single prepared graph for route and trail rendering.
- Fit bounds are computed earlier from raw points, Overview has a private `BoundingBox`, and reference-grid construction repeats another private bounds pass.
- All three external consumers use the same sign-based shift, but none consumes the actual ordered world copies in `wrappedSegments`.
- The counterexample `[-179, -1, 2]` proves the duplicated rule can map a 181° sequential extent to a 357° viewport and change its center by 91°.

The rendered line and its viewport therefore do not share a geographic coordinate-space owner. Any future correction must be made in at least three places and can still diverge from the route graph.

Recommended boundary:

Extend prepared geometry with canonical, segment-aware display bounds (and, if useful, a canonical display center). Compute them during the same ordered `wrapLngNear` pass, with explicit alignment policy for disconnected segments. Pass that prepared value to fit, reference-grid, and Overview-camera consumers. If camera purity requires a smaller shared value, expose a pure `computeTrackDisplayBounds(track)` helper used both while preparing geometry and while computing camera state; do not keep private sign-based variants.

Regression coverage should compare the shared bounds across ordinary, simple dateline, wide non-dateline, reverse traversal, multi-wrap, and disconnected-segment tracks.

## Existing debt and final sweep

The final architecture pass rechecked session and gesture ownership, map generation/style state, parser/worker duplication, export lifecycle boundaries, responsive measurement ownership, static-server trust boundaries, and test orchestration. The large app-shell/MapView surfaces remain existing debt rather than newly evidenced defects.

Cycle 1 deferrals D01-D03 were not reopened. No fourth architecture root met the reporting threshold.
