# Aggregate Deep Review — Cycle 4

Date: 2026-07-23
Reviewed revision: `975dded34c849db4eb972221ed9483d3d64fb81d`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The reviewer fan-out produced **9 genuinely new, deduplicated findings**:

- 0 Critical or High
- 5 Medium
- 4 Low

All nine roots are scheduled for this cycle. Repeated renderer reports retain
one root at the highest assigned severity and confidence. The seven completed
Cycle 3 findings and the three explicit native/host-capability deferrals were
excluded rather than relitigated.

Fresh review evidence:

- Vitest: 25 files / 551 tests passed.
- Development E2E: 114 passed, 1 intentional real-export skip, and 1 failed.
  The failed mobile Journey test left the Import Guide open after a forced
  click; isolated stable semantic clicks opened Journey Creator correctly at
  the reviewed mobile widths.
- A pure-Node probe of the installed `@maplibre/geojson-vt` tiler confirmed
  that a late `[600,720]` feature is absent at zooms 0, 1, 2, 4, 8, and 14
  when the application publishes cumulative multi-wrap longitudes.
- A source-equivalent XML probe showed 1,001 real element levels scanning as
  a maximum depth of 2 when comments interleave fake closing tags.
- Isolated UI review covered landing, Journey Creator, sample import,
  playback, Camera, Export/cancel, More, Korean guidance, dark appearance,
  focus restoration, and 320×480 through 1440×900 layouts.
- Every exact review-owned browser, server, listener, and temporary profile
  was absent after cleanup. Ports 3099 and 4183 were clear. The unrelated
  user Chrome, shared agent-browser, and port-4173 owner were never signaled;
  unrelated owners later exited naturally.
- No reviewer used `agent-browser close`, a global/shared close, `pkill`,
  `killall`, broad name-only termination, or a deployment command.

## Review provenance

Current Cycle 4 reports:

- `cycle4-2026-07-23-code-reviewer.md`
- `cycle4-2026-07-23-architect.md`
- `cycle4-2026-07-23-perf-reviewer.md`
- `cycle4-2026-07-23-security-reviewer.md`
- `cycle4-2026-07-23-critic.md`
- `cycle4-2026-07-23-verifier.md`
- `cycle4-2026-07-23-test-engineer.md`
- `cycle4-2026-07-23-tracer.md`
- `cycle4-2026-07-23-debugger.md`
- `cycle4-2026-07-23-document-specialist.md`
- `cycle4-2026-07-23-designer.md`
- `cycle4-2026-07-23-non-tech-traveler-reviewer.md`

All requested roles completed. No reviewer failure remains unresolved.

## Deduplicated findings

### AGG4-01 — Multi-wrap route and trail coordinates leave MapLibre's renderable domain

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by source trace and the installed renderer's tiler**
Agreement: tracer, debugger, performance reviewer

Evidence:

- `src/lib/map-geometry.ts:265-315,327-480`
- `src/components/MapView.tsx:406-455,525-653,730-785,955-1065`
- `src/lib/interpolate.ts:213-215`
- `src/lib/camera.ts:209-239,353-368`

Parser-valid repeated canonical longitudes become cumulative display
coordinates such as `0,120,240,360,480,600,720`. The application publishes
that unbounded chronology directly to MapLibre route, completed-trail, and
active-head GeoJSON sources. MapLibre's tiler projects longitude linearly and
retains only the center and immediate adjacent source worlds. Late geometry is
therefore clipped or positioned outside the tile extent while the normalized
marker and camera continue moving.

Fix: retain the unbounded graph only as internal chronology. Derive a
renderer-owned graph that splits at world-copy changes, rebases each part into
a bounded center/adjacent-world domain, preserves segment and seam ownership,
uses the same bounded part for the active head, and drives fit/grid coverage
from bounded geographic coverage. Prove the contract through the installed
tiler for eastbound, westbound, repeated-lap, disconnected, completed-trail,
and active-head cases.

### AGG4-02 — A pending import can replace the track underneath an active export

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by async ownership and state trace**
Agreement: architect

Evidence:

- `src/components/FileUpload.tsx:79-94,133-144,186-216`
- `src/app/page.tsx:331-354,622-631,680-727`
- `src/lib/useExportController.ts:120-338`
- `src/components/MapView.tsx:406-455`

File parsing and export own unrelated leases. If a slow replacement import
finishes after export starts, `loadTrackIntoSession` resets and replaces the
track without aborting or awaiting the export. The export captured the old
camera program, but its imperative frame renderer reads mutable current-track
refs, so it can mix tracks and later publish result, progress, toast, and map
cleanup into the replacement session.

Fix: expose an abort-and-settle export lease, await it before any track-session
mutation, suppress replacement-driven cancellation publication, and keep the
import busy until the handoff finishes. Add a deterministic held-export
regression proving cleanup settles before the replacement commits and no late
old-session state is published.

### AGG4-03 — XML comments can cancel real nesting in the preflight depth counter

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by deterministic source-equivalent probe**
Agreement: critic

Evidence:

- `src/lib/parser.ts:147-180`

The XML preflight counts tag-shaped raw text without recognizing lexical
contexts. Valid comments containing `</x>` decrement its depth, allowing a
1,001-level document to scan at depth 2 and reach `DOMParser` despite the
advertised limit of 128. Tag-like text in comments or CDATA can also falsely
reject shallow input.

Fix: replace the regular-expression counter with a linear XML-aware scanner
that skips comments, CDATA, processing instructions, and declarations; honors
quoted `>` characters; and counts only real start, end, and self-closing tags.
Cover both GPX and KML with deep bypass and shallow lexical-context cases.

### AGG4-04 — Throwing cleanup evidence can replace forced-survivor evidence

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by two deterministic no-process probes**
Agreement: test engineer

Evidence:

- `scripts/e2e-process-supervisor.mjs:405-438,521-533`
- `scripts/e2e-process-supervisor.test.mjs:1147-1190,1260-1354`

Cycle 3 made tracker descriptions total, but
`tracker.cleanupError?.()` is still called directly. If that diagnostic
accessor throws after both TERM and KILL report failure, its exception replaces
the authoritative “survived forced termination” evidence.

Fix: make cleanup-evidence retrieval total, keep forced-survivor evidence
primary, and attach or aggregate accessor failures. Cover the direct helper
and the full contained-provider path, including signal order, tracker stop,
provider disposal, survivor wording, and cause preservation.

### AGG4-05 — No real-Chromium failure-path regression proves supervised cleanup

Severity: **Medium**
Confidence: **High**
Status: **Confirmed coverage gap at the actual browser topology**
Agreement: test engineer

Evidence:

- `package.json:18-23`
- `scripts/run-dev-e2e.mjs:21-35`
- `scripts/run-static-e2e.mjs:19-33`
- `scripts/e2e-process-supervisor.test.mjs`
- `playwright.config.ts:9-49`
- `playwright.static.config.ts:15-55`

Synthetic process trees deeply exercise ownership logic, while successful
matrices incidentally exercise Chromium. No committed negative-path integration
launches the configured browser and owned listener, deliberately exits
nonzero or is interrupted after both are live, then asserts that every exact
PID/UID/start-token/marker identity, profile lock, and listener is absent while
an unrelated sentinel survives.

Fix: add one serialized POSIX-only integration fixture using the repository's
configured Playwright Chromium, a unique marker/profile/listener, an intentional
nonzero outcome, exact post-run absence assertions, and exact bounded emergency
cleanup. Preserve the existing safe Windows pre-launch refusal.

### AGG4-06 — Cancelling provisional New Route discards the manual map pose

Severity: **Low**
Confidence: **High**
Status: **Confirmed by deterministic source trace**
Agreement: code reviewer

Evidence:

- `src/app/page.tsx:356-363,469-475,605-618`
- `src/components/MapView.tsx:749-785,955-985`
- nearest E2E at `e2e/travelback.spec.ts:2324-2397`

New Route retains the prior session but passes `track=null` to `MapView`,
clearing prepared and camera refs. Cancel restores the same track, which is
then treated as new and fit to overview. A traveler who disabled Follow loses
their center, zoom, pitch, and bearing even though the provisional replacement
was cancelled.

Fix: capture a narrow camera snapshot before provisional replacement, queue it
for post-hydration restoration when Follow is off, and discard it on commit or
session reset. Extend the existing cancellation E2E with a distinguishable
manual pose and normal MapLibre tolerances.

### AGG4-07 — Closeup documentation promises a street-level view

Severity: **Low**
Confidence: **High**
Status: **Confirmed documentation mismatch**
Agreement: document specialist

Evidence:

- `README.md:74-83`
- `.context/project/02-architecture.md:85-96,128-131`
- `src/lib/i18n.ts:221-233`

README and architecture call Closeup a “Street-level view,” while the
application accurately calls it a tight route zoom and the privacy boundary
states that local maps are abstract backdrops without road or city basemaps.

Fix: describe Closeup consistently as a tight route closeup with shallow pitch.

### AGG4-08 — Save-failure recovery names a button that does not exist

Severity: **Low**
Confidence: **High**
Status: **Confirmed copy/action mismatch in all five locales**
Agreement: document specialist

Evidence:

- `src/lib/i18n.ts:144,324,518,698,892,1072,1266,1446,1640,1820`
- `src/lib/useExportController.ts:250-269`

All five save-failure messages direct the traveler to a generic “Download
Video” action, but the recovery button is labelled “Download MP4” with exact
localized equivalents.

Fix: use the exact localized Download MP4 action name in every save-failure
message and add a state-specific copy regression.

### AGG4-09 — Forced mobile Journey clicks can hit the adjacent Import Guide action

Severity: **Low**
Confidence: **Medium-high**
Status: **Observed in the full development matrix; stable semantic retry passed**
Agreement: designer, non-technical traveler, review supervisor

Evidence:

- `e2e/travelback.spec.ts:1228-1260`
- development E2E failure artifact under
  `test-results/travelback-Travelback-App--651ef--at-supported-mobile-widths-chromium/`
- responsive landing transition in `src/components/FileUpload.tsx:219-365`

The width-loop test resizes the viewport and immediately uses a forced pointer
click. One full matrix click landed on the adjacent Help action, leaving the
Import Guide dialog open and timing out on Journey Creator. Isolated semantic
clicks at the same widths opened Journey Creator correctly, so this is a test
ownership/stability defect rather than a product interaction failure.

Fix: wait for the responsive target to be stable and hit-owned, use the normal
semantic click without `force`, and assert that the Import Guide remains absent
before measuring Journey controls.

## Exclusion sweep

- All seven Cycle 3 roots are fixed at the reviewed revision.
- The three native/host limitations in
  `.context/plans/deferred-p01-platform-boundaries-cycle2-2026-07-23.md`
  retain their explicit exit criteria. AGG4-04 repairs diagnostic precedence
  within the supported tracker contract; AGG4-05 adds real-browser evidence.
  Neither claims pidfd-grade signaling or zero host-environment discovery.
- The isolated UI pass found no additional design or non-technical-traveler
  defect after responsive layout, semantics, focus, localization, appearance,
  playback, camera, export, cancellation, and recovery sweeps.
- No additional validated root remained after parser/worker, geometry,
  session ownership, camera, export, accessibility, documentation, static
  hosting, security, dependency, workflow, and process-boundary review.
