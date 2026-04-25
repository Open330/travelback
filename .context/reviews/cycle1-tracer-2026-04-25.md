# Tracer Review — Cycle 1 (2026-04-25)

Scope: `/Users/hletrd/flash-shared/Travelback`

## Inventory / rules consulted

Project rules and context reviewed before tracing:

- `.context/README.md`
- `.context/development/01-conventions.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/plans/README.md`
- `plan/cycle1-current-plan-2026-04-24.md`
- `plan/deferred-cycle1-current-2026-04-24.md`

Current working-tree areas traced:

- Parser / worker: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
- Session shell: `src/app/page.tsx`, `src/components/TrackWorkspace.tsx`
- Timeline / playback: `src/components/TimelineSelector.tsx`, `src/lib/usePlaybackController.ts`
- Export pipeline: `src/components/ExportPanel.tsx`, `src/lib/useExportController.ts`
- Map / journey path: `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`
- Static serving / smoke: `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`
- Import surface: `src/components/FileUpload.tsx`

I also cross-checked the other cycle-1 lane reports already present under `.context/reviews/` to avoid duplicating a rejected hypothesis as a fresh finding.

## Competing hypotheses and traced outcomes

| Hypothesis | Status | Severity | Confidence | Failure path | Concrete fix |
|---|---|---:|---:|---|---|
| Google JSON pre-parse point-budget scan is safe | **Confirmed bug** | High | High | `src/lib/parser.ts:476-489` and `public/workers/trackParser.worker.js:301-334` count raw `"(latitudeE7|latE7|latitude|point|latLng)"` occurrences before `JSON.parse()`. That means valid exports with lots of candidate keys but few accepted points are rejected before validation/dedupe can run. `src/components/FileUpload.tsx:52-87` then surfaces this as `TOO_MANY_POINTS` to the user. | Move the hard cap to normalized extraction time, or count accepted points only. If a coarse DoS guard is still needed, make it advisory/soft and keep the real limit after parsing. |
| Timeline trimming only affects the visible trim state | **Confirmed bug** | High | High | `src/components/TimelineSelector.tsx:202-307` now calls `onRangeChange()` during every rAF while dragging and also flushes on mouseup/touchend even for no-op clicks because `dragMovedRef.current` is set unconditionally. `src/app/page.tsx:274-301` then slices `fullTrack`, clears scenes, calls `resetExportSession()`, and resets playback on every emitted range. `src/lib/useExportController.ts:82-99` revokes the existing export blob URL as part of that reset. Result: dragging the timeline can delete a completed export and destroy the scene/export session repeatedly. | Split preview vs commit. Commit only on pointer-up when the range actually changed, and do not call `resetExportSession()`/`resetPlayback()` for every drag frame. Preserve an already-exported blob until the user explicitly chooses “Export Again” or commits a real trim change. |
| The 1MB XML cap is a safe parser guard | **Confirmed regression** | Medium | High | `src/lib/parser.ts:544-546` hard-limits GPX/KML to 1MB, and `src/lib/parser.ts:647-701` enforces that limit before parsing. `scripts/smoke-static.mjs:188-191` now pins the lower ceiling in CI. This rejects ordinary GPX/KML exports that are larger than 1MB but still far below the app’s 250k point budget. The failure reaches the user as `FILE_TOO_LARGE` from `FileUpload`. | Either move XML parsing off the main thread so the cap can be raised safely, or restore a practical XML ceiling and document the limitation explicitly in import guidance. |
| Static-serving cache policy causes stale runtime assets | **Rejected** | — | — | `scripts/serve-static.mjs:62-67` returns `no-cache, must-revalidate` for `workers/` and `map-styles/`, and `scripts/smoke-static.mjs:221-233` asserts that policy for both runtime asset URLs. I did not find a failure path here. | None needed for the current diff. |

## Trace notes

### 1) Parser → upload surface

- The parser’s raw Google JSON point-count gate runs before `JSON.parse()` and before the multi-branch Google-format extraction path.
- Because `parseRecords()`, `parseTimelineObjects()`, `parseTimelineEdits()`, and `parseSemanticSegments()` all normalize and dedupe later, the pre-scan is not counting the same thing the parser ultimately accepts.
- The user-facing failure is immediate and local: `FileUpload` maps `TOO_MANY_POINTS` to the “too many points” message, so valid-but-large Google exports are blocked at import time.

### 2) Page/session → timeline/playback → export

- `TrackWorkspace` always wires the full-track timeline into `TimelineSelector` (`src/components/TrackWorkspace.tsx:138-145`).
- `TimelineSelector` now emits range changes while the pointer is still moving, not only on commit.
- `page.tsx` treats every range change as a committed trim and tears down export/playback state.
- `useExportController` revokes the old object URL during that teardown, so a drag can destroy the just-exported video rather than merely changing the preview range.

### 3) Static serving

- `serve-static.mjs`’s new cache policy for runtime assets is consistent with `smoke-static.mjs`.
- I did not find a distinct static-serving defect in this cycle; the file lines checked there look aligned with the intended “always reload runtime worker/style assets” behavior.

## Bottom line

The two highest-risk real failure paths are:

1. Google JSON can be rejected before valid points are even parsed.
2. Timeline trimming can revoke export artifacts and reset the session on every drag frame / no-op release.

The XML cap is the clearest remaining product regression in the parser/import path.
