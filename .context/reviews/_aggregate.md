# Aggregate Deep Review — Cycle 10

Date: 2026-07-24
Reviewed revision: `570aa3510b6ca1431b47001e860d43876df39e15`
Branch: `review-plan-fix/no-deploy-20260723`
Deployment: prohibited and not attempted

## Result

The grouped 12-role review plus the registered non-technical-traveler
perspective produced **3 genuinely new, deduplicated findings**:

- 0 Critical
- 0 High
- 1 Medium
- 2 Low

All three findings are actionable in Cycle 10 and none is deferred. Duplicate
reports retain the highest supported severity and confidence. Cycle 1–9 roots,
prior execution errors, and the three explicit native/host process boundaries
were excluded.

No reviewer ran a full suite, process-supervisor test, E2E, Playwright,
Chromium/browser, server, build, deployment, commit, push, or process signal.
One focused parser run passed 180/180 tests.

Three read-only inventory commands initially used unmatched zsh globs. They
changed no state and were rerun safely with bounded file discovery.

## Review provenance

- `cycle10-2026-07-24-core.md` — code quality, correctness, performance,
  security, concurrency, tracing, debugging, and architecture;
- `cycle10-2026-07-24-arch-tests.md` — architecture, verification, tests,
  parsers/workers, export/MP4, scripts, process-supervisor code, and docs; and
- `cycle10-2026-07-24-ux-critic.md` — critic, verifier, designer,
  accessibility, i18n, and non-technical-traveler perspectives.

Each group inventoried its complete relevant product, delivery, test, asset,
and documentation surface and performed a final missed-file sweep.

## Deduplicated findings

### AGG10-01 — XML display-name lookup ignores schema ownership

Severity: **Low**
Confidence: **High**
Agreement: architecture/test/documentation reviewer

Evidence:

- `src/lib/parser.ts:396-402`
- `src/lib/parser.ts:406-416`
- `src/lib/parser.test.ts:937-1049`
- `src/lib/parser.test.ts:1207-1274`

The GPX and KML geometry paths enforce schema namespace and ancestry
ownership, but display-name selection still uses namespace-blind
`querySelector` calls. A leading foreign extension can supply `trk > name`,
`metadata > name`, `Document > name`, or `Placemark > name` before the
schema-owned element. Current DOM behavior then publishes the extension name
as the visible title, live announcement, and export filename while geometry
correctly comes from the schema.

Fix: select direct schema-owned `name` children only from schema-owned GPX/KML
parents, preserving priority and fallback behavior. Add GPX and KML
foreign-before-real plus foreign-only fallback regressions.

### AGG10-02 — Paused elapsed-sensitive camera stays stale after a duration change

Severity: **Low**
Confidence: **High**
Agreement: core reviewer

Evidence:

- `src/components/MapView.tsx:319-325`
- `src/components/MapView.tsx:729-747`
- `src/components/MapView.tsx:1097-1173`
- `src/app/page.tsx:513-527`
- `src/app/page.tsx:720-725`

MapView updates `durationRef`, and elapsed-sensitive scene cameras derive
their bearing from `progress * duration`, but the animation effect does not
run when duration alone changes. At nonzero paused progress, changing the
animation duration leaves Orbit, Overview, or Bird's Eye at the old bearing
until another progress/camera event occurs. Export immediately uses the new
duration.

Fix: give duration changes a camera publication path using the proposed
duration when Follow owns the camera, while preserving the manual camera when
Follow is off. Add regression evidence for both paths.

### AGG10-03 — Retained-trip hotkeys remain live behind Journey Creator

Severity: **Medium**
Confidence: **High**
Agreement: UX/critic reviewer

Evidence:

- `src/app/page.tsx:259-268`
- `src/app/page.tsx:359-372`
- `src/app/page.tsx:622-640`
- `src/app/page.tsx:669-682`
- `src/lib/usePlaybackController.ts:219-287`

New Route retains the previous track while hiding its workspace, but the
global hotkey hook still receives that non-null track. The clicked toolbar
control then unmounts and focus ordinarily falls to the body, so trip hotkeys
pass the target filter: Space can resume hidden playback, arrows can change
progress, F can change Follow, and E can open Export over Journey Creator.
These operations violate the provisional session boundary.

Fix: suspend trip-dependent hotkeys while Journey Creator owns the interaction
without discarding the retained track. Preserve non-trip shortcuts and verify
the trip hotkeys resume after Cancel.

## Exclusions and final sweep

- Cycle 9 prospective export-duration eligibility, complete social metadata,
  and export-presentation documentation remain fixed.
- Cycle 8 MapLibre live localization remains intact.
- Cycle 7 collection bounds, Unicode filenames, and architecture ownership
  remain intact.
- Cycle 6 route fallback, wrapped-geometry release, preview settlement, and
  semantic no-op export preservation remain intact.
- Static English landing art remains Cycle 7's localization root.
- FileUpload settlement remains final-intent safe.
- Parser cardinality/spread/XML/fallback and export-finalizer boundaries were
  deduplicated or retained as prior accepted boundaries.
- Pre-observation identity erasure, pidfd-grade signaling, and exact global
  marker discovery without native/host support remain excluded platform
  boundaries.

The final missed-file sweep found no fourth distinct root. No deployment
occurred.
