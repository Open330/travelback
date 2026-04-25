# Cycle 7 Code Reviewer Report

## Summary

Files reviewed: 47 active code/config/doc files

Recommendation: REQUEST CHANGES

## Findings

### 1. HIGH — Google JSON import can silently drop legitimate revisits across segment boundaries

- Location: `src/lib/parser.ts:414`, mirrored in `public/workers/trackParser.worker.js:169`
- Type: Confirmed correctness/data-loss issue
- Confidence: High
- Issue: `pointKey()` only uses `lat/lng/time`, and `flattenGoogleSegments()` keeps one global `seen` set across all segments. Identical points in later segments are discarded even when the repeat is semantically real.
- Failure scenario: `[[A, B], [A]]` becomes `[A, B]` with no second segment; a user who returns to the same untimed waypoint/place can lose that revisit entirely. This is especially risky in supported Google formats that omit per-point timestamps such as `waypointPath` and some visit-derived points.
- Suggested fix: Dedupe only within a segment, or include segment identity/order in the dedupe key. At minimum, do not globally collapse untimed points across segment boundaries.

### 2. MEDIUM — Waypoint drag can fall through to map click-add

- Location: `src/components/JourneyCreator.tsx:288`, `src/components/JourneyCreator.tsx:324`, `src/components/JourneyCreator.tsx:398`
- Type: Likely interaction bug
- Confidence: Medium
- Issue: `dragMovedRef` suppresses delete-on-click in `onPointClick`, but the generic map `onClick` path has no equivalent drag guard.
- Failure scenario: After a short point reposition, if MapLibre still emits a click on release, `onClick` can append a new waypoint at the drop location.
- Suggested fix: Suppress the next map click whenever a drag moved, or guard `onClick` with `dragMovedRef.current` / a short-lived "drag just ended" flag.

### 3. LOW — Export modal swipe-to-dismiss conflicts with its own scrollable content

- Location: `src/components/ExportPanel.tsx:111`, `src/components/ExportPanel.tsx:205`
- Type: Confirmed mobile UX issue
- Confidence: High
- Issue: Any downward touch swipe over 80px closes the dialog, but the panel is also `overflow-y-auto`. The gesture handler does not check `scrollTop`, touchmove intent, or whether the gesture started on a dedicated drag handle.
- Failure scenario: On mobile, a user dragging downward while reading or adjusting settings near the top of the export dialog can close it unexpectedly and lose in-progress form state.
- Suggested fix: Only enable swipe-dismiss from a non-scrollable header/handle and only when the panel is already scrolled to the top, or cancel dismissal once vertical scrolling is detected.

### 4. MEDIUM — The real export path is not covered by automated E2E

- Location: `src/lib/useExportController.ts:157`, `e2e/travelback.spec.ts:1274`, `e2e/travelback.spec.ts:1296`
- Type: Manual-validation risk
- Confidence: High
- Issue: The E2E suite validates the export UI using `travelback-export-test-stub`, so the actual `mediabunny`/WebCodecs/render-idle/save flow can regress without a browser test catching it.
- Suggested fix: Add at least one non-stub export smoke path in Chromium, even if it only asserts successful completion and a non-empty MP4 blob under a tiny fixture.

## Verification

- `npm run typecheck` passed in the review lane.
- `npm run lint` passed in the review lane.
- `npm run build` passed in the review lane.
- `npm run test:e2e:static:ci` was started by the review lane but not treated as completed evidence.

## Scope

No active runtime source/test/script/doc file was intentionally skipped: `src/**`, `e2e/travelback.spec.ts`, `scripts/**`, root config files, `public/workers/trackParser.worker.js`, and active `.context` guidance docs were reviewed. Generated output, binary/static art assets, raw fixture payloads, and archival review/plan traces were omitted unless relevant to an output contract.
