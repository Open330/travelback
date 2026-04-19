# Cycle 5 Comprehensive Code Review — 2026-04-19

Covers code quality, security, performance, UX/accessibility, correctness, architecture, and testing angles for the current `main` branch.

## Review method

- Read every source file in `src/`, `public/workers/`, and config files.
- Re-verified all prior cycle findings (C1 through C4) against current code.
- Searched for patterns: `dangerouslySetInnerHTML`, `innerHTML`, `Object.assign(style`, `showSaveFilePicker`, `animate-spin`, `prefers-reduced-motion`.
- Cross-referenced the worker (`trackParser.worker.js`) against the main-thread parser (`parser.ts`) for parity.

## Prior findings verified as FIXED (C1-C4)

All items from `_aggregate.md` confirmed fixed. No regressions observed.

---

## New findings

### C5-001 — MEDIUM/HIGH — `downloadVideo` fallback `<a>` click may not trigger download on all browsers

**Files:** `src/lib/videoEncoder.ts:182-189`

**Description:** The fallback path in `downloadVideo` creates an `<a>` element, sets `a.download = filename`, appends it to the DOM, clicks it, and immediately removes it. Some browsers (notably Safari < 15.4 and some mobile WebViews) require the `<a>` element to remain in the DOM for at least one microtask for the download to initiate. The synchronous `appendChild → click → removeChild` sequence can be too fast for the browser to process the download intent.

**Failure scenario:** On affected browsers, clicking "Start Export" completes the encode but no download dialog or file save appears. The UI shows "Your video download has started" but nothing happens. The user has no way to retrieve the video.

**Suggested fix:** Wrap the removal in a `setTimeout(() => a.remove(), 100)` or use `requestAnimationFrame` to give the browser a chance to process the download. Alternatively, keep the anchor in the DOM and remove it on the next tick.

**Confidence:** Medium (Safari has improved but some WebViews still exhibit this)

---

### C5-002 — LOW/MEDIUM — `exportVideo` computes `cumulDist` internally even though the caller likely already has it

**Files:** `src/lib/videoEncoder.ts:65`

**Description:** `exportVideo` calls `computeCumulativeDistances(track.points, track.segmentStartIndices)` on line 65, but the caller (`useExportController.ts`) already has access to the same track and likely has computed cumulative distances in `page.tsx`. This is a redundant O(n) computation with ~250K trig operations for a max-size track. While the export itself is much more expensive than this computation, it still represents unnecessary work.

**Suggested fix:** Accept an optional `cumulDist` parameter in `exportVideo`, and only compute it if not provided. This aligns with the pattern already used for `normalizedScenes` (pre-computed and passed in).

**Confidence:** High

---

### C5-003 — LOW — `formatDuration` returns negative-looking strings for negative input

**Files:** `src/lib/interpolate.ts:179`

**Description:** `formatDuration` clamps `seconds` to 0 if negative, but the clamp happens *after* the parameter is already named `seconds`. The code reads `if (seconds < 0) seconds = 0` which is correct, but this silent mutation is a code smell. More importantly, if any caller passes `NaN` or `Infinity`, the result will be `NaN:NaN:NaN` or similar because the clamp does not guard non-finite values.

**Suggested fix:** Add `if (!Number.isFinite(seconds) || seconds < 0) seconds = 0` to also guard `NaN`/`Infinity`.

**Confidence:** High (defensive coding)

---

### C5-004 — MEDIUM — `MapView` animation effect depends on `addTrackLayers` and `ensureMarker` in its dependency array, causing unnecessary re-executions

**Files:** `src/components/MapView.tsx:922`

**Description:** The animation update effect at line 809 has `[progress, track, followCamera, suspendAutoCamera, seekNonce, addTrackLayers, ensureMarker]` in its dependency array. Both `addTrackLayers` and `ensureMarker` are `useCallback` with empty dependency arrays (lines 663 and 726), so they are stable. However, their presence in the dependency array is unnecessary — the effect only *calls* them as a fallback for missing layers, not because it needs to re-run when they change. If a future refactor adds a dependency to either callback, the animation effect will re-run on every frame, causing a performance regression. This is a latent correctness risk rather than a current bug.

**Suggested fix:** Remove `addTrackLayers` and `ensureMarker` from the dependency array and add an eslint-disable comment explaining why, or extract the "ensure layers exist" logic into a separate effect that doesn't gate the animation loop.

**Confidence:** Medium (latent risk, not a current bug)

---

### C5-005 — LOW — `SceneRangeEditor` keyboard step is 1% but visual precision suggests finer control

**Files:** `src/components/SceneEditor.tsx:184`

**Description:** The `onKeyDown` handler uses `const step = 0.01` (1%) for arrow key steps. While this is reasonable, the `SceneRangeEditor` `clampRange` function uses `MIN_SCENE_SPAN = 0.01`. This means a single arrow key press on the "end" handle can reduce a scene's span to exactly `MIN_SCENE_SPAN`, and a second press would make it smaller, which `clampRange` would then correct. The interaction is technically correct but feels coarse — a step of 0.005 (0.5%) would give finer control matching the visual precision of the slider.

**Suggested fix:** Consider using `step = 0.005` or adding Shift+Arrow for fine control (step = 0.001). Low priority UX improvement.

**Confidence:** Low (subjective UX preference)

---

### C5-006 — LOW — `GoogleGuide` `useEffect` to reset tab on reopen uses `setTab(0)` which could cause a flash

**Files:** `src/components/GoogleGuide.tsx:141-144`

**Description:** When the modal reopens, `setTab(0)` is called. Since the component only renders when `isOpen` is true (line 255 returns null otherwise), the effect runs after the first render with the stale tab value. This causes a brief render with the old tab before switching to tab 0. If the old tab had different content, users might see a momentary flash.

**Suggested fix:** Reset the tab in the parent's state before opening the modal, or use a key prop on the component to force a remount when `isOpen` transitions from false to true.

**Confidence:** Low (brief visual artifact, unlikely to be noticed)

---

### C5-007 — MEDIUM — `parseSemanticSegments` in worker uses `var` declarations, shadowing outer scope

**Files:** `public/workers/trackParser.worker.js:116-128`

**Description:** The worker's `parseSemanticSegments` function uses `var` for `afterPathLen` (line 116), `visit` (line 119), `m` (line 121), `lat` (line 123), and `lng` (line 124). Since `var` is function-scoped (not block-scoped), these variables are hoisted to the function scope and could theoretically interact with the outer `for` loop's variables. While the current code does not have a naming collision, the use of `var` in a `for` loop body is a well-known source of bugs in JavaScript (especially if the loop were ever restructured). The main-thread `parser.ts` correctly uses `const`/`let` for these same variables.

**Suggested fix:** Convert `var` to `const`/`let` in the worker's `parseSemanticSegments` function to match the main-thread parser's style and prevent future scoping bugs.

**Confidence:** High (code quality, latent risk)

---

### C5-008 — LOW — Worker `parseSemanticSegments` uses `Math.abs(lat) <= 90` while main-thread uses `Math.abs(lat) > 90` (inconsistent boundary check)

**Files:** `public/workers/trackParser.worker.js:125`, `src/lib/parser.ts:305`

**Description:** In the worker, the visit coordinate validation at line 125 uses `Math.abs(lat) <= 90 && Math.abs(lng) <= 180` (accepts boundary values). In the main-thread parser at line 305, the equivalent check uses `Math.abs(lat) > 90 || Math.abs(lng) > 180` (also accepts boundary values since `> 90` would not reject `90.0`). Both are semantically equivalent (both accept lat=90, lng=180), but the worker uses `<=` (whitelist style) while the main-thread uses `>` (blacklist style). This inconsistency could confuse maintainers.

**Suggested fix:** Normalize both to the same check style. The `> 90` style used in the main-thread parser is more consistent with the rest of the codebase.

**Confidence:** High (cosmetic, not a bug)

---

### C5-009 — LOW — `MapView` debug window exposure runs on every mount, including production

**Files:** `src/components/MapView.tsx:567-605`

**Description:** The debug camera exposure code checks `process.env.NODE_ENV === 'development'` OR `debugParams.get('__travelbackDebug') === '1'` OR `localStorage.getItem('travelback-debug') === '1'`. While the localStorage check is gated by a try/catch, the URL parameter check runs on every mount in production. This means any user who visits the site with `?__travelbackDebug=1` in the URL gets `window.__travelbackDebug` exposed. While this is intentional for debugging, it could be considered an information leak — the debug object exposes internal map state (hasRouteSource, hasTrailSource, etc.).

**Suggested fix:** Consider restricting the URL parameter check to development builds only, or adding a console warning when the debug interface is activated in production. Low priority since the debug data is read-only and not sensitive.

**Confidence:** Low (intentional feature, minor security hardening)

---

### C5-010 — MEDIUM — `JourneyCreator` search only supports coordinate parsing, not actual geocoding

**Files:** `src/components/JourneyCreator.tsx:446-463`

**Description:** The `runSearch` function only parses coordinate-like queries (geo: URIs, @lat,lng patterns, etc.). If a user types a place name like "Tokyo Tower" or "Eiffel Tower", the search returns no results and shows `journey.searchInvalid`. This is a UX issue because the search UI invites free-text input but only accepts coordinate formats. The placeholder says "Enter coordinates or geo: URI" but users may not read carefully.

**Suggested fix:** Either update the placeholder and error message to be more explicit about the coordinate-only limitation, or add a note in the UI explaining that only coordinate input is supported (for privacy reasons, as noted in the `searchDisabledPrivacy` text).

**Confidence:** High (UX clarity)

---

### C5-011 — LOW — `Controls` component re-computes `totalDistance` on every render

**Files:** `src/components/Controls.tsx:42`

**Description:** `const total = useMemo(() => totalDistance(track.points, track.segmentStartIndices), [track])` computes the total distance using `useMemo`. However, `track` is an object reference that changes on every parent re-render (even if the track data hasn't changed), causing the memo to recompute. Since `totalDistance` iterates all points with haversine calculations, this is potentially O(n) work on every render. The `TrackWorkspace` parent passes `track` as a prop, and `track` changes whenever playback progress changes (since `handleRangeChange` creates a new filtered track object).

**Suggested fix:** Either memoize the track object more carefully upstream, or use `track.points` and `track.segmentStartIndices` as the memo dependencies instead of `track` itself.

**Confidence:** Medium (depends on how often track reference changes)

---

### C5-012 — LOW — `TrackToolbar` mobile menu does not trap focus

**Files:** `src/components/TrackToolbar.tsx:135-220`

**Description:** The mobile dropdown menu (shown on small screens) opens with `aria-expanded` but does not implement focus trapping. When the menu is open, users can Tab out of it into the map or other controls. The `ModalDialog` component properly traps focus, but this dropdown uses a plain `<div>` without focus trapping.

**Suggested fix:** Add focus trapping to the mobile menu similar to `ModalDialog`, or use `inert` on sibling elements when the menu is open.

**Confidence:** Medium (a11y gap)

---

### C5-013 — LOW — Export progress overlay spinner uses `animate-spin` which may not respect `prefers-reduced-motion`

**Files:** `src/app/page.tsx:319`, `src/components/FileUpload.tsx:152`

**Description:** The export progress overlay and file upload loading spinner use Tailwind's `animate-spin` class. While `globals.css` has a `prefers-reduced-motion: reduce` media query that sets `animation-duration: 0.01ms !important` on `*`, this effectively stops the spin but leaves the spinner visible as a static partial circle. For users who prefer reduced motion, a static loading indicator would be more appropriate.

**Suggested fix:** In the `prefers-reduced-motion` media query, either hide the spinner and show a static "Loading..." text, or replace the spinner with a static progress indicator.

**Confidence:** Medium (existing CSS partially handles it, but the result is a broken-looking spinner)

---

### C5-014 — LOW — `ErrorBoundary` `handleReset` increments `resetKey` but does not clear the error boundary's internal error state across remounts

**Files:** `src/components/ErrorBoundary.tsx:33-35`

**Description:** The `handleReset` method sets `hasError: false` and increments `resetKey`, which causes the children to remount. This is correct. However, if the same error occurs again immediately after reset (e.g., a deterministic render error), the user will see the error boundary again with no indication that this is a recurring error. This is standard React error boundary behavior and not a bug, but worth noting as a UX consideration.

**Suggested fix:** Low priority. Consider adding a recurrence counter or suggesting a page reload after N consecutive resets.

**Confidence:** Low (standard pattern, UX enhancement)

---

## Items verified as NOT issues

| Item | Why not an issue |
|------|-----------------|
| `dangerouslySetInnerHTML` in layout.tsx | Only used for the CSP-gated bootstrap script; production builds replace it with a hash-based CSP |
| `Object.assign(style` in MapView marker | Used for programmatic DOM elements (not React), which is appropriate |
| Worker `var` hoisting in `parseSemanticSegments` | No actual variable collision exists; `var` is just stylistic inconsistency (C5-007) |
| `showSaveFilePicker` type assertion | Necessary because TypeScript does not include this API in its standard lib types |
| `downloadVideo` returns `{ saved: false }` for picker abort | Correctly handled by the caller which throws `AbortError` |

## Summary

- 14 new findings total
- 2 MEDIUM/HIGH (C5-001: download fallback timing, C5-002: redundant cumulDist)
- 4 MEDIUM (C5-004, C5-007, C5-010, C5-011)
- 8 LOW (C5-003, C5-005, C5-006, C5-008, C5-009, C5-012, C5-013, C5-014)
- No HIGH/CRITICAL security, correctness, or data-loss findings
- Prior deferred items (DF-C1-*, DF-C2-*, DF-C4-001) remain valid and not re-opened
