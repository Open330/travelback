# Aggregate Deep Review — Cycle 5

Date: 2026-07-23
Reviewed revision: `97f66a63b3df97bce3f349a05248ebb8fef7886e`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The reviewer fan-out produced **6 genuinely new, deduplicated findings**:

- 0 Critical
- 2 High
- 3 Medium
- 1 Low

All six causal roots are scheduled for this cycle; none is deferred. Reports
shared by multiple roles are counted once at the highest supported severity.
Completed Cycle 1–4 work, the three explicit native/host-capability
deferrals, and the already-recorded Cycle 4 P05 gate residue were excluded
from the new-finding count.

Fresh review evidence:

- Vitest: 25 files / 565 tests passed; generated-worker parity passed.
- Focused parser, geometry, camera, rendering, and export checks passed
  204/204 and 62/62, while deterministic probes reproduced the six missing
  contracts below.
- A 250,000-point zero-distance camera call performed 500,001 indexed point
  reads; the export camera plus marker path performs 750,001 per frame.
- The actual GPX parser returned 50, 400, and 1,600 retained points for the
  same 50 physical points nested under 1, 8, and 32 `trkseg` elements.
- Four well-formed GPX/KML documents containing inert `DOCTYPE`/`ENTITY`
  literals in comments or CDATA were all rejected by the application.
- A held Track A export republished `done`, filename, success toast, and
  progress `1` after the current error-reset path had cleared the session.
- Real Chromium keyboard input changed an intended duration edit from
  `30 → 1 → 15` into `30 → 5 → 55`; clearing the field restored `30`.
- The isolated UI browser/server were closed by exact identity. Every owned
  browser, daemon, renderer, crashpad, listener, and server PID was absent;
  the profile had no holders; port 45184 and `.next/dev/lock` were absent;
  protected user Chrome PID 1368 was unchanged.
- No reviewer deployed, pushed, used global browser shutdown, `pkill`,
  `killall`, or broad name-only process termination.

## Review provenance

Current Cycle 5 reports:

- `cycle5-2026-07-23-code-reviewer.md`
- `cycle5-2026-07-23-architect.md`
- `cycle5-2026-07-23-critic.md`
- `cycle5-2026-07-23-perf-reviewer.md`
- `cycle5-2026-07-23-security-reviewer.md`
- `cycle5-2026-07-23-verifier.md`
- `cycle5-2026-07-23-tracer.md`
- `cycle5-2026-07-23-debugger.md`
- `cycle5-2026-07-23-test-engineer.md`
- `cycle5-2026-07-23-document-specialist.md`
- `cycle5-2026-07-23-designer.md`
- `cycle5-2026-07-23-non-tech-traveler-reviewer.md`

All requested roles completed. No reviewer-owned browser or server remains.

## Deduplicated findings

### AGG5-01 — Degenerate accepted tracks make each follow/export frame linear

Severity: **High**
Confidence: **High**
Agreement: performance reviewer

Evidence:

- `src/lib/interpolate.ts:104-192,222-231`
- `src/lib/camera.ts:62-106,353-368,505-524`
- `src/components/MapView.tsx:426-445,1069-1098`
- `src/lib/videoEncoder.ts:230-245`

Endpoint interpolation scans segment boundaries and both directions for a
usable bearing. Camera bearing resolution repeats a similar scan. A valid
250,000-point zero-distance Records track therefore performs 750,001 indexed
point reads for one export frame before painting or encoding; the supported
180-second/60-fps maximum can exceed 8.1 billion reads. Disconnected
singleton segments also make endpoint ownership linear.

Fix: make zero-total-distance interpolation and camera bearing constant time,
and keep segment-bound lookup and duplicate-bearing fallback logarithmic or
constant through prepared/indexed metadata. Preserve disconnected-segment
semantics. Add operation-count regressions at the 250,000-point limit for
identical points and singleton segments.

### AGG5-02 — Nested GPX segments multiply point allocation before the budget

Severity: **High**
Confidence: **High**
Agreement: performance reviewer, security reviewer

Evidence:

- `src/lib/parser.ts:215-320`
- `src/lib/parse-utils.ts:6-25,108-113`
- `src/lib/parser.test.ts:1416-1429,1461-1491,1556-1586`

The parser enumerates every `trkseg`, then uses descendant
`getElementsByTagName('trkpt')` for each one. A point nested under `d`
segments is constructed `d` times, and all amplified arrays are materialized
before the later point-budget reduce. A roughly 2.4 MiB document can stay
inside byte, tag, depth, and physical-point limits while requesting 12.6
million `TrackPoint` objects.

Fix: accept schema-owned direct `trkseg > trkpt` children only, reject nested
`trkseg`, and consume one shared running budget before each retained point
allocation. Add direct-child, nested-structure, and bounded early-rejection
regressions.

### AGG5-03 — Export frames permanently overwrite a Follow-off manual camera

Severity: **Medium**
Confidence: **High**
Agreement: code reviewer, architect, critic

Evidence:

- `src/lib/map-export-presentation.ts:13-63`
- `src/components/MapView.tsx:281-282,396-489,1063-1145`
- `src/lib/useExportController.ts:147-203,236-367`

The export presentation lease captures dimensions and DPR, but every real
frame also `jumpTo()`s the shared map camera. Cleanup never captures or
restores that camera. Follow-on happens to recompute its pose when export
ownership ends; Follow-off intentionally performs no camera update, so the
last encoded frame replaces the traveler’s manual center, zoom, pitch, and
bearing after success, failure, or cancellation.

Fix: include manual-camera ownership and pose in the MapView export
presentation transaction. Restore size/DPR first and the captured pose before
releasing the lease when Follow is still off; let Follow-on recompute current
progress. Cover success, failure, and abort with independent live/captured
camera state and a real-map cancellation assertion.

### AGG5-04 — Error recovery clears the session while its export remains live

Severity: **Medium**
Confidence: **High**
Agreement: verifier, tracer, debugger

Evidence:

- `src/app/page.tsx:183-243,598-612`
- `src/components/ErrorBoundary.tsx:22-39,98-108`
- `src/lib/useExportController.ts:127-145,267-366`

`useExportController` is owned above the descendant `ErrorBoundary`, so a
child crash removes MapView without unmounting or aborting the controller.
Try Again synchronously calls `resetExportSession()` and remounts. A held old
export can then publish its blob, filename, `done` state, toast, and progress
into the recovered session.

Fix: cancel/invalidate export ownership at error capture, make Try Again await
full lease settlement before reset/remount, and gate all late publications by
the current export/session generation. Add a held-encoder component
regression proving recovery waits and the old owner publishes nothing.

### AGG5-05 — Export duration clamps incomplete keyboard edits

Severity: **Medium**
Confidence: **High**
Agreement: designer, non-technical traveler reviewer

Evidence:

- `src/components/ExportPanel.tsx:443-456`
- `e2e/travelback.spec.ts:3367-3369,3501-3508`

The controlled number field parses and clamps every `onChange`. Typing `15`
one key at a time changes the first `1` to minimum `5`, then appends the
second key and produces `55`; clearing immediately restores `30`. Existing
atomic `fill()` coverage cannot observe ordinary keyboard editing.

Fix: preserve a focused string draft, validate and commit on blur, Enter, or
Start Export, and associate a localized inline error with invalid/empty or
out-of-range input. Add sequential-key, temporary-empty, boundary-error, and
recovery coverage.

### AGG5-06 — Raw XML declaration checks reject inert comments and CDATA

Severity: **Low**
Confidence: **High**
Agreement: verifier, tracer, debugger

Evidence:

- `src/lib/parser.ts:132-138,215-245`
- `src/lib/parser.test.ts:1392-1414,1432-1491`

`preflightXml()` applies a whole-document `DOCTYPE`/`ENTITY` regex before its
lexical scanner can skip comments, CDATA, and processing instructions.
`stripXmlEntities()` is context-blind too. Well-formed inert documentation is
therefore rejected or would be silently mutated.

Fix: detect and reject active declarations inside the lexical scanner after
inert contexts are skipped, and pass the verified raw text to `DOMParser`
without context-blind stripping. Retain real-declaration rejection and cover
GPX/KML comment and CDATA literals for both tokens.

## Required gate correction — not a new finding

The current 40-test supervisor suite reports 39 pass / 1 fail at
`scripts/e2e-process-supervisor.test.mjs:557`. Its real-Chromium fixture
correctly discovers nested profile locks, but the test incorrectly requires
each lock’s direct parent to equal the profile root. Cycle 4 already recorded
this P05 residue.

Correct the assertion to prove canonical containment anywhere under the exact
fixture-owned profile while retaining pre-removal existence, identity,
marker, listener, profile, lock, and unrelated-sentinel checks. Run the
focused real-Chromium case and all 40 tests with independent exact cleanup
audits.

## Review execution error

The test-engineer’s intended no-match Node command unexpectedly executed the
40 supervisor tests without the required pre-run inventory. It reproduced
the known 39/40 P05 failure. Its exact temporary root, matching marker
processes, ports 3099/4173/4183, and `.next/dev/lock` were independently
confirmed absent afterward, and protected Chrome PID 1368 was unchanged.
This is a recorded Cycle 5 process-hygiene error, not a product finding.

## Exclusions

- All completed Cycle 1–4 roots and archived UI target-size work.
- The three native/host P01 deferrals: identity erasure before observation,
  pidfd-grade atomic signalling, and host-environment marker discovery.
- The Cycle 4 P05 assertion residue, carried only as a gate correction above.
- Forced mobile-click, bounded multi-wrap geometry, Journey cancellation
  camera restoration, Retry Map hydration, save-copy, and documentation items
  already resolved in prior cycles.
