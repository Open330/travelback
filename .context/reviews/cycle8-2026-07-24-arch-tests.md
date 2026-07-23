# Cycle 8 architecture, performance, verification, test, and documentation review — 2026-07-24

Target: `9b3343cd0c01fabb84dc47f4f34c28238d98a99e`
Branch: `review-plan-fix/no-deploy-20260723`
Roles: performance reviewer, architect, verifier, test engineer, document specialist
Outcome: **zero genuinely new Cycle 8 roots**

## Review inventory

The repository was inventoried before review: 1,043 tracked paths, including
67 `src/` paths (41 runtime/source/style/binary paths and 26 Vitest files), 12
scripts/fixtures/process-test paths, 21 E2E paths, 19 public assets, 873
`.context/` paths, and the separate 30-file `plan/` history.

The complete review-relevant inventory was:

- Application and shared contracts: `src/app/{layout.tsx,page.tsx,globals.css}`,
  all 17 components, all library modules, `src/{types.ts,styles/vitro-base.css}`,
  and `src/workers/trackParser.worker.ts`.
- Tests: every `src/**/*.test.ts` file; the process-supervisor test and its
  three fixtures; `e2e/{travelback.spec.ts,mp4-validation.ts}` and all 19 E2E
  data fixtures.
- Build/runtime boundaries: all 12 `scripts/` paths, both Playwright configs,
  Next/Vitest/TypeScript/ESLint/PostCSS configuration, `package.json`,
  `package-lock.json`, `.gitignore`, and the Pages workflow.
- Published assets: the generated parser worker, five map styles, sample GPX,
  guide artwork, fonts/styles, icons, and preview artwork. Binary font/favicon
  payloads were inventoried; their code-facing paths and provenance were
  checked rather than interpreting binary bytes as source.
- Documentation and history: `README.md`, `.context/README.md`,
  `.context/project/{01-overview.md,02-architecture.md}`,
  `.context/development/01-conventions.md`, all current aggregates and Cycle
  1–7 review/implementation records, all active/deferred/archive files under
  `.context/plans/`, and the separate `plan/` ledger.

Cross-file traces covered import bytes through XML/JSON preflight, worker
transport, parser budgets, session replacement, interpolation and renderer
geometry, map/style lifecycle, playback, timeline and scene transactions,
Journey Creator, export leasing/frame capture/finalization/save/share,
localization and preference hydration, modal/focus ownership, static
hardening/serving, CI, and supervised E2E ownership.

## Role results

### Architecture and verification

No new ownership, lifecycle, or claim-to-code contradiction survived.
In particular:

- File/sample parsing and direct Journey Creator assembly now have separate
  documented ingress edges that converge at `loadTrackIntoSession()`
  (`.context/project/02-architecture.md:24-44`;
  `src/app/page.tsx:416-447`;
  `src/components/JourneyCreator.tsx:791-807`).
- The loaded-session toolbar description matches its desktop actions and
  mobile settings ownership
  (`.context/project/02-architecture.md:12-21`;
  `src/components/TrackToolbar.tsx:149-335`).
- Export/playback exclusion, map resize restoration, per-frame paint/idle
  ordering, and bounded trail publication in the architecture guide agree
  with `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`,
  `src/components/MapView.tsx`, and `src/lib/map-geometry.ts`.
- Session replacement, export lease settlement, scene-preview restoration,
  semantic scene no-op handling, and GPX route fallback retain one clear
  owner each. The Cycle 5–7 regressions exercise the previously failing
  boundaries.

### Performance

No new performance root survived history deduplication and source tracing.
The current parser uses bounded iteration instead of user-sized argument
spreads in `src/lib/googleJsonParser.ts:63-83,244-381` and
`src/lib/parser.ts:39-67`; the generated worker has the same implementation.
The accepted point budget, segment indexes, and producer order remain intact.

Other apparent hotspots were not promoted:

- main-thread XML parsing and conversion materialization;
- session-wide `preserveDrawingBuffer`;
- app-shell/loaded-workspace progress rerenders;
- linear initial map geometry and elevation/timeline preparation;
- in-memory MP4 finalization and browser memory limits;
- conservative pre-dedup point-budget accounting; and
- finalizer/browser/host capability limits.

Each is already fixed where a deterministic defect existed, explicitly
deferred with an exit criterion, dependent on browser measurement, or an
intentional bounded tradeoff in prior reviews. None is a new Cycle 8 root.

### Test engineering

The 26 Vitest files were mapped to their production owners, and the complete
Playwright catalogue, process-supervisor suite, static smoke checks, generated
worker parity gate, and real-MP4 assertions were inspected for false-positive
assertions, hidden focus/skip markers, retry masking, missing boundary
ownership, and stale fixtures.

The prior Cycle 7 baseline is 614 unit tests plus 40 process-supervisor tests.
Its 118-case browser catalogue also completed both development and static
matrices, with only the documented target-specific skips, and the isolated
real-MP4 gate validated container structure, AVC packets/timing, dimensions,
first/last decode, canvas readback, preview, and download. No new missing test
was tied to a current, historically distinct defect. In particular, the Cycle
7 parser and filename roots now have deterministic high-cardinality,
segment-boundary, large-LineString, over-budget, code-point-boundary, and
well-formed-filename regressions.

No supervisor candidate was filed. There is no deterministic pre-fix failure
or exact survivor evidence beyond already repaired/deferred process roots, so
the 614+40 baseline was not disturbed.

### Documentation

The README's commands, workflow name, base path, supported formats, import
limits, presets, local-runtime privacy boundary, and supervised-platform note
match package/config/source behavior. The project overview and architecture
guide match the current component graph, parser/session ingress, camera
defaults, scene behavior, export pipeline, local map assets, CSP/anti-framing
boundary, and offline limitations. Development guidance matches the current
runtime and explicit class-component exception.

No stale authoritative statement or missing maintainer-critical edge survived
the final document-to-source comparison.

## Historical deduplication

Cycle 1–7 findings and plans were searched before counting candidates. This
review expressly did not recount:

- Cycle 7 bounded import collection, 250,000/125,000 parser regressions,
  generated-worker refresh, Unicode-safe filename truncation, or the corrected
  toolbar/Journey ingress documentation;
- Cycle 6 empty/invalid GPX semantic-track fallback, obsolete wrapped-geometry
  release, Scene Editor preview settlement, or semantic no-op scene exports;
- earlier parser, map-wrap, interpolation, camera, export recovery, modal,
  localization, static-serving, or process-cleanup repairs; or
- the three native/host process-capability residuals recorded in
  `.context/plans/deferred-p01-platform-boundaries-cycle2-2026-07-23.md`.

## Static checks and final missed-file sweep

Only review-safe static checks were used:

- `node scripts/build-worker.mjs --check` — generated worker current.
- `git diff --check` — clean before this review artifact.
- repository-wide searches found no `.only`, `fixme`, or unexpected
  TODO/FIXME/HACK marker in current source/tests/scripts/docs.
- bundled map-style/runtime-origin and generated-artifact searches remained
  consistent with the local-resource contract.

The closing filename/API sweep rechecked unbounded spreads, array extrema,
timers/listeners/rAF cleanup, object URLs, map sources/layers, abort paths,
DOM/portal ownership, skips/retries, network origins, CSP claims, generated
files, and every inventory category above. No additional new root survived.

No full suite, supervisor fixture, E2E, Playwright, Chromium/browser, server,
build, deploy, process signal, commit, or push was run by this workstream.
