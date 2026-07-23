# Aggregate Deep Review — Cycle 3

Date: 2026-07-23
Reviewed revision: `7f013a207e64ca54c0864edc5aaf061ebfb36bdf`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The reviewer fan-out produced **7 genuinely new, deduplicated findings**:

- 2 High
- 3 Medium
- 2 Low

All seven roots are scheduled for this cycle. Repeated reports retain the
highest reviewer-assigned severity and confidence. The 13 completed Cycle 2
findings and its three explicit native/host-capability deferrals were excluded
rather than relitigated.

Fresh review evidence:

- Vitest: 25 files / 541 tests passed.
- E2E process-supervisor tests: 34 passed.
- ESLint, strict TypeScript, and generated parser worker parity passed.
- Bounded arithmetic diagnostics counted exactly 9,944,394,996 one-world
  adjustments for a parser-valid 200,000-point canonical longitude sequence.
- A deterministic allocation calculation produced 14,319,930 reference-grid
  features for a valid route-ordered span of 35,799,821 degrees.
- Browser launch was unnecessary for the review phase: layout, state, and
  process defects were reproducible from deterministic source geometry or
  no-process probes. A pre-existing agent-browser tree and an unrelated
  Judgekit Playwright Chromium were inventoried and left untouched. Neither
  belonged to this cycle; the former exited naturally. Ports 3099, 4173, and
  4183 were clear after every reviewer.
- No reviewer used `agent-browser close`, `pkill`, `killall`, global browser
  shutdown, or broad process matching.

## Review provenance

Current Cycle 3 reports:

- `cycle3-2026-07-23-code-reviewer.md`
- `cycle3-2026-07-23-architect.md`
- `cycle3-2026-07-23-perf-reviewer.md`
- `cycle3-2026-07-23-security-reviewer.md`
- `cycle3-2026-07-23-critic.md`
- `cycle3-2026-07-23-verifier.md`
- `cycle3-2026-07-23-test-engineer.md`
- `cycle3-2026-07-23-tracer.md`
- `cycle3-2026-07-23-debugger.md`
- `cycle3-2026-07-23-document-specialist.md`
- `cycle3-2026-07-23-designer.md`
- `cycle3-2026-07-23-non-tech-traveler-reviewer.md`

All requested roles completed. No reviewer failure remains unresolved.

## Deduplicated findings

### AGG3-01 — Canonical multi-wrap tracks make longitude preparation quadratic

Severity: **High**
Confidence: **High**
Status: **Confirmed by source trace and exact bounded arithmetic diagnostic**
Agreement: performance-reviewer, security-reviewer, code-reviewer, architect

Evidence:

- `src/lib/interpolate.ts:13-18`
- `src/lib/map-geometry.ts` callers of `precomputeWrappedSegments`
- parser limit and longitude normalization paths

`wrapLngNear` moves a longitude toward its reference with `while` loops, one
360-degree world at a time. The next reference is the previously unwrapped
longitude, so a valid canonical series can make the distance from the current
`[-180, 180]` input grow with every point. For
`normalizeLng(i * 179), i = 0..199999`, the current implementation performs
exactly 9,944,394,996 loop adjustments before the map can render. A
250,000-point repeating `[0, 120, -120]` construction requires roughly
10.4 billion.

Failure scenario: importing a large but valid history synchronously blocks the
main thread during geometry preparation. Route fit, playback, and export never
become interactive despite the input satisfying parser bounds.

Fix: replace repeated world stepping with a constant-time arithmetic quotient
that preserves the current inclusive `±180` tie behavior and finite-value
contract. Cover exact ties, distant finite references, canonical multi-wrap
sequences near the parser limit, segmented tracks, and late active trails.

### AGG3-02 — Reference-grid generation can allocate more than 14 million features

Severity: **High**
Confidence: **High**
Status: **Confirmed by source trace and exact allocation-count diagnostic**
Agreement: performance-reviewer, security-reviewer

Evidence:

- `src/components/MapView.tsx:173-278`
- `src/components/MapView.tsx:1061-1085`
- route-ordered display bounds introduced in Cycle 2

The reference grid chooses a fixed maximum longitude step of ten degrees, then
adds 1.5 route spans on both sides. A valid route-ordered longitude span of
35,799,821 degrees therefore requests exactly 14,319,930 longitude line
features before MapLibre receives the GeoJSON. Making longitude wrapping
constant-time does not bound this independent allocation path.

Failure scenario: after geometry preparation succeeds, grid construction
allocates millions of coordinate arrays and GeoJSON objects on the UI thread,
causing memory exhaustion, long garbage-collection pauses, or a browser crash.

Fix: give grid construction explicit per-axis and total feature budgets and
adapt its “nice” step upward when expanded display bounds exceed that budget.
Extract the calculation into a pure helper. Test ordinary, dateline, 480-degree,
and approximately 35-million-degree bounds for finite coordinates, useful
ordinary spacing, and a hard feature cap.

### AGG3-03 — More controls cannot fit or scroll at 844×390

Severity: **Medium**
Confidence: **High**
Status: **Confirmed from deterministic layout constraints**
Agreement: critic, verifier, tracer, designer, non-technical traveler

Evidence:

- `src/components/TrackToolbar.tsx:200-317`
- `src/app/globals.css:19-25,351-363`
- `src/app/page.tsx:604`
- current E2E viewport coverage

At 844×390, the short-layout CSS deliberately moves commands into the More
popup. The popup begins around y=68 and its conservative content height is at
least 392 px, but only about 322 px remains. The page itself suppresses
overflow, while the popup has neither an available-height limit nor internal
scrolling. Terminal commands such as Help can therefore be unreachable.

Fix: make the popup's maximum block size derive from `100dvh` and the safe-area
inset, and give it owned vertical scrolling plus overscroll containment. Add
small-portrait and 844×390 E2E coverage that opens More, reaches and activates
the terminal controls, and proves pointer/focus ownership.

### AGG3-04 — A failed Share warning leaks into the next export session

Severity: **Low**
Confidence: **High**
Status: **Confirmed by state and ownership trace**
Agreement: critic, verifier, tracer, designer, non-technical traveler

Evidence:

- `src/components/ExportPanel.tsx:226-243`
- `src/components/ExportPanel.tsx:335-394`
- the parent keeps `ExportPanel` mounted across Export Again

`shareError` is local state. Export Again resets the export controller but
does not clear that local error. Because the panel remains mounted, a failed
share from export A disappears during progress and then resurfaces as soon as
export B reaches `done`, before the traveler attempts to share export B. The
alert is also placed inside the non-wrapping action row, so its
`col-span-full` class does not make it full width.

Fix: clear share-local state at the export-session boundary and render the
alert below the action row. Regress failed Share → Export Again → second
completion, asserting no alert until a new Share attempt.

### AGG3-05 — Responsive toolbar switching can leave focus in a CSS-hidden dialog

Severity: **Medium**
Confidence: **Medium-high**
Status: **State/DOM mismatch confirmed; exact user-agent focus endpoint pending browser regression**
Agreement: critic, verifier, tracer, designer, non-technical traveler

Evidence:

- `src/components/TrackToolbar.tsx:53-122,200-223`
- short-layout responsive overrides in `src/app/globals.css`

When More is open, CSS alone can switch to the desktop toolbar after a viewport
change. React's `menuOpen` remains true, the hidden dialog stays mounted, the
document focus-trap handler stays installed, and focus can remain in hidden
content. The More button itself may also be hidden, so its ordinary close
focus target is not stable.

Fix: reconcile open state with the component's live rendering mode. On a
transition that hides the overflow toolbar, close the dialog and move focus to
an always-visible stable control. Cover the mode change with a dynamic-viewport
browser regression in addition to component-level state coverage.

### AGG3-06 — The accepted tracker contract omits a method required by cleanup

Severity: **Medium**
Confidence: **High**
Status: **Confirmed by deterministic no-process probe**
Agreement: test-engineer, debugger

Evidence:

- `scripts/e2e-process-supervisor.mjs:405-425`
- `scripts/e2e-process-supervisor.mjs:509-520`
- `scripts/e2e-process-supervisor.test.mjs`

`assertTrackerContract` accepts trackers that expose `start`,
`signalAndWait`, and `stop`. `stopOwnedProcessTree`, however, unconditionally
calls `tracker.describe()` in both the survivor and cleanup-error paths. An
atomic provider can therefore pass contract validation, correctly report that
owned processes survived TERM/KILL, and have that termination evidence replaced
by `TypeError: tracker.describe is not a function`.

Fix: make the provider contract and cleanup helper agree, and make diagnostic
formatting total so the original cleanup failure remains authoritative. Before
the production edit, add and run a focused regression that fails on the current
implementation. After the edit, independently audit the focused regression,
the complete process suite, and an exact marker/PID/UID/start-token survivor
scan that also proves an unrelated sentinel is untouched. This is the cycle's
mandatory P01 implementation finding.

### AGG3-07 — Supervised E2E commands are documented without their Windows refusal

Severity: **Low**
Confidence: **High**
Status: **Confirmed documentation defect**
Agreement: document-specialist

Evidence:

- `README.md` E2E command section
- `.context/project/01-overview.md` development commands
- `scripts/e2e-process-supervisor.mjs` platform contract

The primary documentation lists `test:e2e` and `test:e2e:static:ci` as
ordinary cleanup-safe commands. The supervisor intentionally refuses Windows
unless an atomic Job Object provider is supplied, and the repository ships no
such provider. A Windows contributor therefore reaches a deliberate startup
failure that the command documentation never predicts.

Fix: state that the supervised commands currently require POSIX and that
Windows fails safely before target launch until a Job Object provider exists.
Do not advertise the unsupervised development command as cleanup-safe.

## Exclusion sweep

- Cycle 2's 13 implemented roots remain fixed at this reviewed revision.
- The Cycle 2 P01 native/host-capability boundaries remain explicit deferrals;
  this review does not disguise them as new findings or broaden their claims.
- “Ground Follow” in `.context/project/01-overview.md` is accurate internal
  shorthand and not a terminology defect.
- No additional validated root remained after route import/export, camera,
  parser/worker, responsive interaction, process ownership, documentation,
  generated artifacts, accessibility, security, and performance sweeps.
