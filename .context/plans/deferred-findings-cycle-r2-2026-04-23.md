# Deferred Findings — Cycle 2 (2026-04-23, orchestrator run r2)

Findings from `_aggregate.md` that are NOT scheduled in `cycle-r2-implementation-2026-04-23.md`.

All deferrals respect the repo's strict deferred-fix rules (`.context/development/01-conventions.md` and cycle rubric):
- Original severity preserved; not downgraded to justify deferral.
- Each item records file+line citation, concrete reason, and re-open exit criterion.
- No security / correctness / data-loss findings are deferred this cycle. All deferrals are quality / DRY / polish / out-of-scope-refactor.
- Repo policies (GPG-sign, Conventional Commits + gitmoji, fine-grained commits, no `--no-verify`, no `Co-Authored-By`, Node 24 / Next 16 / React 19 / TypeScript 5.9+ toolchain) apply whenever these are picked up.

---

## DF-R2-001 — Duplicated approximate-distance helpers between MapView and JourneyCreator
- **Source finding**: R2-AGG-2 (R2-CQ-3 + R2-AR-3).
- **Severity / Confidence**: LOW / MEDIUM.
- **Files**: `src/components/MapView.tsx:70-75` (`centerDistanceMeters`), `src/components/JourneyCreator.tsx:29-34` (`approxDistanceMeters`).
- **Reason for deferral**: DRY cleanup. Math is correct today in both places. The only functional gap (JourneyCreator not using `shortestLngDelta`) fires only for routes drawn across the antimeridian — a rare user scenario. Consolidating requires touching two components and re-running E2E; the win is minor.
- **Exit criterion**: Re-open when a shared `src/lib/geo.ts` (or extending `src/lib/interpolate.ts`) is being introduced for any other reason, or when a user reports antimeridian proximity-suppression failing.

## DF-R2-002 — `smoothAngle` in MapView reuses `shortestLngDelta` semantically
- **Source finding**: R2-AGG-3 (R2-CQ-1).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/MapView.tsx:61-64`.
- **Reason for deferral**: naming/DRY. Math is correct today — both longitudes and bearings live on a modulo-360 circle. Risk is only theoretical (a future refactor could narrow `shortestLngDelta` to a longitude-specific semantic).
- **Exit criterion**: Re-open together with DF-R2-001 in a shared-geo-helpers pass.

## DF-R2-003 — `smoothCameraState` inlines longitude normalization instead of using `normalizeLng`
- **Source finding**: R2-AGG-4 (R2-CQ-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/MapView.tsx:77-88`.
- **Reason for deferral**: cosmetic DRY. Equivalent to `normalizeLng(...)` already exported from `interpolate.ts`.
- **Exit criterion**: Re-open together with DF-R2-001/-002 (shared-geo-helpers pass).

## DF-R2-004 — `.gpx/.kml` vs `.json` use different File-read APIs in the parser
- **Source finding**: R2-AGG-5 (R2-CQ-4).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/lib/parser.ts:538-566`.
- **Reason for deferral**: `.gpx`/`.kml` uses `FileReader.readAsText`; `.json` uses `file.arrayBuffer()`. Migrating the XML branch to `await file.text()` is non-breaking but requires re-running all GPX/KML E2E tests and reasoning about `onerror` equivalents. Out of scope for this cycle.
- **Exit criterion**: Re-open when a parser-reliability pass is scheduled (same trigger as DF-C17-002).

## DF-R2-005 — Units preference not bootstrapped (brief FOUC)
- **Source finding**: R2-AGG-6 (R2-CQ-5).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/app/page.tsx:68` uses state initializer; `src/app/layout.tsx:49` bootstrap script handles theme + mapstyle + locale but not units.
- **Reason for deferral**: cosmetic. The initial paint shows "km" even when localStorage has `imperial`; React's first render then repaints. No functional impact.
- **Exit criterion**: Re-open when the bootstrap script is next touched (e.g., for another preference), or when a user reports unit flicker.

## DF-R2-006 — `SceneRangeEditor` drag does not fire `clearPreview` on pointer-up
- **Source finding**: R2-AGG-7 (R2-CQ-6).
- **Severity / Confidence**: LOW / MEDIUM.
- **Files**: `src/components/SceneEditor.tsx:92-137` vs. the slider onPointerUp pattern at `:529,545,564,580`.
- **Reason for deferral**: minor UX polish — the live-preview camera stays sticky after a range drag until another slider is touched. Not a correctness issue.
- **Exit criterion**: Re-open during a SceneEditor UX refresh.

## DF-R2-007 — Landing page has `<h2>` as first heading; no `<h1>`
- **Source finding**: R2-AGG-8 (R2-A11Y-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/FileUpload.tsx:191`.
- **Reason for deferral**: WCAG 2.4.10 advisory; no functional blocker. Promoting to `<h1>` requires ensuring the track-loaded state transitions the `<h1>` appropriately to `TrackWorkspace`.
- **Exit criterion**: Re-open in the next accessibility pass (alongside DF-C17-018).

## DF-R2-008 — `ElevationProfile` uses `role="img"` but is keyboard-scrubbable
- **Source finding**: R2-AGG-9 (R2-A11Y-7).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/ElevationProfile.tsx:94-102`.
- **Reason for deferral**: switching to `role="slider"` requires adding `aria-valuenow/min/max/valuetext` with stable translation strings and re-testing screen reader behavior. The current `role="img"` + keyboard handler works for sighted users.
- **Exit criterion**: Re-open in the next accessibility pass.

## DF-R2-009 — `ExportPanel.handleShare` swallows non-AbortError share failures silently
- **Source finding**: R2-AGG-10 (R2-DB-11).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/ExportPanel.tsx:139-150`.
- **Reason for deferral**: requires a new i18n key across 5 locales (`app.shareFailed` or similar). Share failures are rare (user-initiated; the panel still shows the video preview + save button). Polish, not correctness.
- **Exit criterion**: Re-open when the i18n catalog is next extended or when a user reports a silent share failure.

## DF-R2-010 — Redundant `as TrackPoint[]` cast in `JourneyCreator.handleConfirmCreate`
- **Source finding**: R2-AGG-11 (R2-DB-4).
- **Severity / Confidence**: LOW / HIGH.
- **File**: `src/components/JourneyCreator.tsx:522-528`.
- **Reason for deferral**: purely cosmetic type-assertion redundancy; removing the cast compiles cleanly but the line currently sits inside a slightly larger callback whose re-flow would add diff noise.
- **Exit criterion**: Re-open when JourneyCreator is next modified (matches the DF-C17-015 exit criterion pattern).

## DF-R2-011 — Architecture doc doesn't mention JS-based frame-breaker
- **Source finding**: R2-AGG-12 (R2-DOC-1).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `.context/project/02-architecture.md:114-118`.
- **Reason for deferral**: documentation completeness only; code already implements the control. Adding a single sentence.
- **Exit criterion**: Re-open during the next doc sweep, or when security posture is documented for a third party.

## DF-R2-012 — `interpolate.ts` exports lack JSDoc
- **Source finding**: R2-AGG-13 (R2-DOC-2).
- **Severity / Confidence**: LOW / HIGH.
- **File**: `src/lib/interpolate.ts:161-185` (`formatDistance`, `formatElevation`, `formatDuration`).
- **Reason for deferral**: IDE-hover polish; signatures are already self-explanatory.
- **Exit criterion**: Re-open when `src/lib/interpolate.ts` is next modified.

## DF-R2-013 — Dead `cumulativeDistances` fallback code in MapView / useExportController
- **Source finding**: R2-AGG-14 (R2-PF-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **Files**: `src/components/MapView.tsx:772-773`, `src/lib/useExportController.ts:133-135`.
- **Reason for deferral**: fallbacks currently exist as defense-in-depth; `page.tsx` always passes a memoized array, so the fallback never executes. Removing it requires establishing the invariant explicitly. Low ROI.
- **Exit criterion**: Re-open when the `cumulativeDistances` flow is next restructured, or when invariants are formalized in types.

## DF-R2-014 — E2E "playback controls work" test doesn't verify progress advanced
- **Source finding**: R2-AGG-15 (R2-TE-6).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `e2e/travelback.spec.ts:444-457`.
- **Reason for deferral**: the camera-motion stability tests (`map camera movement stays stable during playback`) already cover progress advancement via `__travelbackDebug.getCamera()`. This is a duplicate-coverage addition, not a coverage gap fix.
- **Exit criterion**: Re-open during a test-suite audit.

## DF-R2-015 — No size guard on e2e JSON fixtures
- **Source finding**: R2-AGG-16 (R2-TE-7).
- **Severity / Confidence**: LOW / MEDIUM.
- **Files**: `e2e/fixtures/google-*.json`.
- **Reason for deferral**: defensive CI hygiene. Current fixtures are small; no observed problem.
- **Exit criterion**: Re-open if any fixture grows beyond 1 MB, or during CI-pipeline hardening (alongside DF-C17-003).

## DF-R2-016 — Mid-breakpoint (640–1024px) hides track title
- **Source finding**: R2-AGG-17 (R2-UX-2).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/TrackWorkspace.tsx:117-123` (`hidden … lg:block`).
- **Reason for deferral**: layout decision requiring design review; the `<title>` tag is not set dynamically either, so screen readers get the static page title in this viewport range.
- **Exit criterion**: Re-open in the next mobile-UX pass (alongside DF-C17-017).

## DF-R2-017 — No parse progress indicator for large files
- **Source finding**: R2-AGG-18 (R2-UX-4).
- **Severity / Confidence**: LOW / MEDIUM.
- **File**: `src/components/FileUpload.tsx:149-151`.
- **Reason for deferral**: feature addition (progress text), not a bug fix. Requires worker-to-main progress reporting for the JSON path.
- **Exit criterion**: Re-open during a file-upload UX pass.

---

## Process observation (not a code finding)

### R2-AGG-19 — Deferral backlog growth
- **Source finding**: R2-CR-1.
- **Severity**: MEDIUM process observation.
- **Reason for deferral**: process, not code. Recorded here for awareness — recommend picking one long-standing deferred item per 10 cycles to re-open.
- **Exit criterion**: n/a (process recommendation for orchestrator).

---

## Prior deferrals carried forward unchanged

From `.context/plans/deferred-findings-cycle17-2026-04-23.md` (minus RESOLVED DF-C17-007 and DF-C17-012):

- DF-C17-001, -002, -003, -004, -005, -006, -008, -009, -010, -011, -013, -014, -015, -016, -017, -018, -019.
- DF-C4-001, DF-C4-002.
- DF-C2-010.

Exit criteria unchanged.
