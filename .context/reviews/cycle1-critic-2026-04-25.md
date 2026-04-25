# Cycle 1 Critic Review — 2026-04-25

Scope: entire current working tree in `/Users/hletrd/flash-shared/Travelback`, including uncommitted changes. I did not edit source files.

## Inventory / rules checked

- Project rules: `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/plans/README.md`.
- Active source areas inspected: `src/app/page.tsx`, `src/components/{ExportPanel,FileUpload,JourneyCreator,ThemeToggle,TimelineSelector,MapView,TrackWorkspace}.tsx`, `src/lib/{parser,useExportController,videoEncoder,i18n}.ts`, `public/workers/trackParser.worker.js`, `scripts/{serve-static,smoke-static}.mjs`, `e2e/travelback.spec.ts`, fixtures.
- Uncommitted changes observed: parser/worker Google budget and segment de-dupe changes, XML cap reduction to 1MB, export-panel codec/swipe changes, FileUpload recovery hints, JourneyCreator drag suppression, ThemeToggle hydration label changes, TimelineSelector drag flushing, static cache smoke/serve changes, cycle review/plan files.
- Verification run: `npm run lint` passed; `npm run typecheck` passed; first `npm run build` was blocked by an already-running Next build lock, then rerun passed; `npm run smoke:static` passed. Full Playwright E2E was not run in this lane.

## Findings

### F1 — Google point-budget pre-scan can reject valid deduplicated multi-format Takeout exports

- **Severity:** High
- **Confidence:** High
- **Category:** Correctness / product import regression
- **Citations:** `src/lib/parser.ts:476`, `src/lib/parser.ts:487`, `src/lib/parser.ts:499`; mirrored worker path `public/workers/trackParser.worker.js:301`, `public/workers/trackParser.worker.js:330`.
- **Failure scenario:** A Google Takeout JSON containing both `locations` and `timelineObjects`/`semanticSegments` for the same trip can have more than 250,000 raw point-like keys while the final deduplicated track is under the app's `MAX_TRACK_POINTS`. The dispatcher explicitly allows multiple matching branches and dedupes later (`src/lib/parser.ts:499`), but the new raw regex pre-scan runs before `JSON.parse`/dedupe and throws `TOO_MANY_POINTS` as soon as the raw key count exceeds 250,000.
- **Why it matters:** This rejects a class of valid exports that the parser architecture is designed to accept, especially combined or redundant Google exports.
- **Concrete fix:** Remove the raw regex budget as an acceptance gate, or make it a much higher coarse DoS guard while enforcing the real 250k limit after normalized/deduped extraction. Add a regression fixture/test where duplicated branches exceed 250k raw candidates but dedupe below 250k final points.

### F2 — 1MB GPX/KML cap is a product regression against advertised format support

- **Severity:** Medium
- **Confidence:** High
- **Category:** Product / UX / compatibility
- **Citations:** Supported GPX/KML formats in `.context/project/01-overview.md:33`; hard cap in `src/lib/parser.ts:544`; test now locking the lower cap in `e2e/travelback.spec.ts:416`; smoke guard in `scripts/smoke-static.mjs:188`.
- **Failure scenario:** A legitimate GPX/KML from Garmin/Strava/Google Earth that is only a few MB is rejected with “Maximum size is 1MB” before parsing, despite being far below the 250k point budget. This is common for longer activities, high-frequency tracks, or KMLs with verbose placemark markup.
- **Why it matters:** The app’s core promise is importing GPX/KML/Google history. A 1MB XML cap trades away normal user imports to avoid main-thread XML cost.
- **Concrete fix:** Prefer moving XML parsing off the main thread or restoring a practical cap (for example the previous 4MB or a budget tied to measured parse time/point count). If 1MB is intentional, update product copy/import guide to disclose the limit and provide splitting/downsampling guidance.

### F3 — Clicking a timeline handle/region with no drag still resets playback/export state

- **Severity:** Medium
- **Confidence:** High
- **Category:** Correctness / UX
- **Citations:** `src/components/TimelineSelector.tsx:280`, `src/components/TimelineSelector.tsx:295`, `src/components/TimelineSelector.tsx:301`, parent side effects in `src/app/page.tsx:274`, `src/app/page.tsx:284`, `src/app/page.tsx:300`.
- **Failure scenario:** `startDrag()` stores the initial client X, then `endDrag()` always calls `applyDragNow(finalClientX)` while `dragging` is still set. With no pointer movement, `applyDragNow()` still marks the drag as moved and calls `onRangeChange`. The parent then resets export state and playback even though the range did not change. A user can lose a completed export panel state or have playback jump back just by clicking/tapping a timeline handle.
- **Concrete fix:** Track whether any move event occurred and/or whether ratios changed beyond a small threshold before calling `onRangeChange`. Do not set `dragMovedRef` or flush on `mouseup` for no-op clicks. Add an E2E regression: complete/stub an export, click a timeline handle without moving, reopen export, and assert the completed export is still present.

### F4 — Journey waypoint drag suppression can swallow the next intentional map click

- **Severity:** Medium
- **Confidence:** Medium-High
- **Category:** UX / interaction correctness
- **Citations:** Suppression set at `src/components/JourneyCreator.tsx:347`; consumed only by the generic map click at `src/components/JourneyCreator.tsx:290`.
- **Failure scenario:** After dragging a waypoint, `suppressNextMapClickRef` is set to `true`. If MapLibre does not emit a synthetic map `click` after that drag (common when the gesture is classified as a drag), the flag remains armed. The user’s next real click to add a waypoint is ignored and only clears the flag, forcing a second click.
- **Concrete fix:** Clear the suppression on the next tick/short timeout after pointerup, or tie suppression to the actual click event that immediately follows the drag. Add an E2E regression that drags a waypoint and then clicks once in an empty map area, expecting the waypoint count to increment.

### F5 — Track-loaded announcement no longer moves focus into the new workspace

- **Severity:** Medium
- **Confidence:** High
- **Category:** Accessibility / keyboard UX
- **Citations:** Track load only sets text at `src/app/page.tsx:253`; the status region is non-focusable at `src/app/page.tsx:507`.
- **Failure scenario:** After upload/import, screen-reader or keyboard users are left wherever the file input/browser picker returned focus. The newly mounted workspace is only announced through a live region that is created concurrently with its text, which is less reliable than moving focus to a stable status/landmark. Users may not know the import succeeded or where the controls are.
- **Concrete fix:** Restore a focusable status/landmark (`tabIndex={-1}` + ref) and focus it on the next animation frame after `track` mounts, or focus the first workspace control with an explicit announcement. Add an accessibility regression asserting focus moves to the workspace/status after successful import.

## Notes / non-findings

- I did not find a high-confidence security issue in the current diff. Static CSP/cache smoke checks pass locally.
- The current tests added for the revisit-segments fixture cover repeated untimed visits across separate semantic segments, but they do not cover mixed duplicate multi-branch Google exports, no-op timeline clicks, or drag-then-add Journey Creator behavior described above.
