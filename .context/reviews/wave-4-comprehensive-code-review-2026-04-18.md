# Wave 4 Comprehensive Code Review — 2026-04-18

**Reviewer:** Claude Opus (3 parallel review agents)
**Scope:** Full repository — 27 source files, 1 worker, 3 scripts, 14 e2e fixtures/tests
**Date:** 2026-04-18

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 4 |
| HIGH | 8 |
| MEDIUM | 15 |
| LOW | 8 |

---

## CRITICAL Issues

### C-1: Worker/main-thread sort divergence produces different track orderings

**Files:** `public/workers/trackParser.worker.js:164-169` vs `src/lib/parser.ts:352-358`
**Confidence:** High

The worker and main-thread sort comparators produce different results when one point has a timestamp and the other does not. The main-thread version explicitly places all timed points before untimed ones:

```ts
// parser.ts (main thread)
if (aTime != null && bTime != null) return aTime - bTime
if (aTime != null) return -1   // timed before untimed
if (bTime != null) return 1
return a.order - b.order
```

The worker version falls through to `a.order - b.order` when only one point has a time, causing untimed points to interleave among timed ones based on insertion order:

```js
// worker
if (aTime != null && bTime != null) return aTime - bTime
return a.order - b.order   // timed vs untimed: compared by order, not separated
```

**Impact:** Loading the same Google Location History file produces a visibly different route depending on whether the Web Worker succeeds or falls back to the main thread.

**Fix:** Add the two missing lines to the worker:
```js
if (aTime != null && bTime != null) return aTime - bTime
if (aTime != null) return -1
if (bTime != null) return 1
return a.order - b.order
```

---

### C-2: `lerpCamera` center interpolation produces wrong path across antimeridian

**File:** `src/lib/camera.ts:112-114`
**Confidence:** High

Camera center interpolation uses simple linear arithmetic on `[lng, lat]`:
```ts
center: [
  a.center[0] + (b.center[0] - a.center[0]) * s,
  a.center[1] + (b.center[1] - a.center[1]) * s,
],
```

For a track that crosses the antimeridian (e.g., from lng 170 to lng -170), this interpolates through 0 degrees (the prime meridian) rather than crossing through 180.

**Impact:** Pacific-crossing trips (Japan-Hawaii, NZ-Chile) show the camera sweeping across the entire globe during scene transitions.

**Fix:** Apply shortest-path angle interpolation to longitude:
```ts
center: [
  a.center[0] + (((b.center[0] - a.center[0] + 540) % 360) - 180) * s,
  a.center[1] + (b.center[1] - a.center[1]) * s,
],
```

---

### C-3: Toast auto-dismiss timer resets on every parent re-render

**File:** `src/components/Toast.tsx:22-33`
**Confidence:** High

`ToastItem` effect depends on `onDismiss`, which is an inline arrow function `() => onDismiss(msg.id)` created in the parent. Every time the parent re-renders (which happens frequently during playback due to `progress` state updates), a new `onDismiss` function is created, causing the `useEffect` to re-run and reset the 5000ms auto-dismiss timer.

**Impact:** During active playback, toasts may never auto-dismiss, accumulating and obscuring the UI.

**Fix:** Stabilize the `onDismiss` callback in `ToastItem` using a ref:
```tsx
const onDismissRef = useRef(onDismiss)
onDismissRef.current = onDismiss

useEffect(() => {
  // ... use onDismissRef.current instead of onDismiss ...
}, []) // remove onDismiss from deps
```

---

### C-4: CSP hardening script fails open — `unsafe-inline` ships if postbuild errors

**File:** `scripts/harden-static-export.mjs:72-73` and `src/app/layout.tsx:62`
**Confidence:** High

If the hardening script throws (e.g., no inline scripts found due to Next.js output changes), the HTML files retain the placeholder CSP that includes `script-src 'unsafe-inline'`. The fallback path is insecure.

**Fix:** Never fail open. If no inline scripts are found, still replace `unsafe-inline` with `'self'`:
```js
const hashes = computeScriptHashes(html)
const scriptSrc = hashes.length > 0
  ? [`'self'`, ...hashes].join(' ')
  : "'self'"
const csp = STYLE_POLICY.replace('__SCRIPT_HASHES__', scriptSrc)
```
Remove or convert the `throw` on line 73 to a warning, and always perform the replacement.

---

## HIGH Issues

### H-1: Worker does not enforce `MAX_TRACK_POINTS` before returning results

**File:** `public/workers/trackParser.worker.js:200-224`
**Confidence:** High

The main-thread `parseTrackFile` checks `track.points.length > MAX_TRACK_POINTS` after receiving the worker result, but the worker itself allocates and processes all points without any limit. A 200MB Google Location History JSON can contain millions of records.

**Impact:** On memory-constrained devices (mobile), the worker could trigger an OOM crash before the main thread can enforce the 250k point limit.

**Fix:** Add a point count check inside the worker after parsing, before dedup/sort:
```js
if (points.length > 250000) {
  throw new Error('Track contains too many points')
}
```

---

### H-2: `interpolateAlongTrack` segment search is O(n) per call

**File:** `src/lib/interpolate.ts:84-91`
**Confidence:** High

Linear scan through `cumulativeDistances` runs in O(n) for each interpolation. During video export (up to 7200 frames), this is called once per frame. For a 250k-point track, that's 1.8 billion comparisons total.

**Fix:** Replace with binary search (the array is sorted):
```ts
let lo = 0, hi = cumulativeDistances.length - 1
while (lo < hi - 1) {
  const mid = (lo + hi) >> 1
  if (cumulativeDistances[mid] <= targetDist) lo = mid
  else hi = mid
}
const segIdx = lo
```

---

### H-3: ModalDialog effect re-runs on un-memoized `onClose`

**File:** `src/components/ModalDialog.tsx:84-156`
**Confidence:** High

The `useEffect` depends on `onClose`. When callers pass inline functions (e.g., `() => setShowKeyboardHelp(false)`), identity changes on every render. This causes focus/inert-attribute thrashing and loses `previousActiveElement` reference.

**Fix:** Store `onClose` in a ref and remove from effect dependencies.

---

### H-4: ThemeToggle system preference listener overrides user's explicit choice

**File:** `src/components/ThemeToggle.tsx:34-47`
**Confidence:** High

The `matchMedia` change handler always calls `onModeChange?.(newMode)` even when `controlledMode` is provided. If the user explicitly toggled to "light" mode, and OS switches to dark (e.g., scheduled at sunset), the app overrides the user's choice.

**Fix:** Only propagate system preference when not controlled:
```tsx
const handler = (e: MediaQueryListEvent) => {
  const newMode = e.matches ? 'dark' : 'light'
  if (controlledMode == null) {
    setMode(newMode)
    onModeChange?.(newMode)
  }
}
```

---

### H-5: `normalizeScenes` silently produces zero-length scenes

**File:** `src/lib/camera.ts:31-34`
**Confidence:** High

When scenes overlap, normalization can create zero-length scenes (`startPercent === endPercent`). These are effectively dead but still iterated in the hot per-frame loop, and the user gets no feedback.

**Fix:** Filter out zero-length scenes after normalization: `.filter(s => s.endPercent > s.startPercent)`

---

### H-6: `serve-static.mjs` missing top-level try/catch and HEAD Content-Length

**File:** `scripts/serve-static.mjs:117`
**Confidence:** High

The async request handler has no top-level try/catch — unhandled rejections crash the server. HEAD responses are missing `Content-Length`, violating HTTP semantics.

**Fix:** Wrap handler in try/catch. Read file body before HEAD/GET branching to set `Content-Length`.

---

### H-7: `harden-static-export.mjs` CSP meta tag regex is fragile

**File:** `scripts/harden-static-export.mjs:57`
**Confidence:** High

The regex assumes `http-equiv` comes before `content` and uses double quotes. A Next.js update that reorders attributes could silently break the hardening pipeline, shipping `unsafe-inline` to production.

**Fix:** Use two-pass matching or a proper HTML parser. At minimum, include the actual found tag in the error message for debugging.

---

### H-8: FileUpload `isTouchDevice` causes hydration mismatch

**File:** `src/components/FileUpload.tsx:29-32`
**Confidence:** High

`useMemo` with `[]` deps evaluates `isTouchDevice` once. On server, `window` is undefined so it returns `false`. On a touch-device client, it returns `true`, creating a hydration mismatch.

**Fix:** Use `useEffect` to detect touch after hydration:
```tsx
const [isTouchDevice, setIsTouchDevice] = useState(false)
useEffect(() => {
  setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
}, [])
```

---

## MEDIUM Issues

### M-1: `computeCameraForProgress` — transition blending breaks when transitionDuration > sceneDuration

**File:** `src/lib/camera.ts:411-425`
**Confidence:** Medium

When `transitionDuration` is larger than a scene's duration, the blend zones overlap and the camera never reaches the pure scene state.

**Fix:** Cap `halfTrans` to `sceneDuration / 2`.

---

### M-2: Object URL leak — blob URL never revoked

**File:** `src/lib/useExportController.ts` (resetExportSession)
**Confidence:** Medium

Each export creates a new blob URL. The old one is never revoked with `URL.revokeObjectURL()`, leaking memory.

**Fix:** Revoke old URL when creating a new one or during reset.

---

### M-3: `handleShare` silently swallows all errors

**File:** `src/components/ExportPanel.tsx:121-131`
**Confidence:** High

The catch block treats all errors as "user cancelled", but genuine failures (e.g., `new File()` constructor errors) produce no feedback.

**Fix:** Distinguish `AbortError` from other errors and surface non-cancel errors.

---

### M-4: JourneyCreator `handleSelectPlace` flies but doesn't add waypoint

**File:** `src/components/JourneyCreator.tsx:470-475`
**Confidence:** High

Selecting a search result flies to the coordinates but doesn't add the point as a waypoint. The user must manually click on the map.

**Fix:** Add the point to `waypointsRef` after flying.

---

### M-5: SceneEditor undo restore inserts at wrong index if precedingSceneId was deleted

**File:** `src/components/SceneEditor.tsx:266-271`
**Confidence:** Medium

If the preceding scene was also deleted, `findIndex` returns `-1` and `insertIdx` becomes `0`, inserting at the beginning.

**Fix:** Guard: `const precedingIdx = ...findIndex(...); const insertIdx = precedingIdx >= 0 ? precedingIdx + 1 : 0`

---

### M-6: `parseGoogleLocationHistory` dedup key uses floating-point equality

**File:** `src/lib/parser.ts:344`
**Confidence:** Medium

Two points with the same coordinates but different floating-point representations won't deduplicate.

**Fix:** Round to 7 decimal places: `p.lat.toFixed(7)`.

---

### M-7: `parseGPX` `getElementsByTagName('ele')` picks up extension elements

**File:** `src/lib/parser.ts:100-101`
**Confidence:** Medium

`getElementsByTagName` searches all descendants. GPX extensions containing `<ele>` would produce incorrect elevation.

**Fix:** Use direct-child selection: `Array.from(point.children).find(c => c.localName === 'ele')`.

---

### M-8: `computeCameraForProgress` — gap at progress=0 when first scene doesn't start at 0%

**File:** `src/lib/camera.ts:366-369`
**Confidence:** Medium

If normalized scenes don't cover progress 0.0, `prevIdx` is -1 and the camera snaps to the next scene instead of interpolating from a default view.

**Fix:** When `prevIdx === -1`, compute prev camera from track center/overview at progress 0.

---

### M-9: `trackCenter`/`estimateOverviewZoom` iterate all points twice per frame

**File:** `src/lib/camera.ts:46-69` and `74-100`
**Confidence:** Medium

In overview scenes, both functions iterate the full point array. For 250k points, this doubles per-frame overhead.

**Fix:** Pre-compute the bounding box once and cache it.

---

### M-10: CSP allows `style-src 'unsafe-inline'` in production

**File:** `scripts/harden-static-export.mjs:17`
**Confidence:** Medium

`style-src 'unsafe-inline'` allows CSS-based data exfiltration attacks via attribute selectors reading CSRF tokens.

**Fix:** Compute style hashes or use a nonce-based approach. At minimum, add `style-src-attr 'none'`.

---

### M-11: `serve-static.mjs` missing `Strict-Transport-Security` header

**File:** `scripts/serve-static.mjs:143-149`
**Confidence:** Medium

HSTS header omitted. Without it, browsers don't enforce HTTPS on subsequent visits.

**Fix:** Add `Strict-Transport-Security: max-age=31536000; includeSubDomains` or document that HSTS should be at the CDN/proxy layer.

---

### M-12: `theme-init.js` doesn't check `localStorage` theme preference

**File:** `public/theme-init.js:6`
**Confidence:** Medium

The script only checks `prefers-color-scheme`, not `localStorage`. Users who explicitly toggled theme see a flash of wrong theme on every page load.

**Fix:** Check `localStorage` before falling back to `matchMedia`.

---

### M-13: TimelineSelector `onRangeChange` fires on every ratio change during drag

**File:** `src/components/TimelineSelector.tsx:98-102`
**Confidence:** Medium

The effect fires on every `startRatio`/`endRatio` state update during drag, causing excessive parent re-renders.

**Fix:** Debounce or only call on drag end.

---

### M-14: TrackToolbar mobile menu uses `role="menu"` without keyboard navigation

**File:** `src/components/TrackToolbar.tsx:137-140`
**Confidence:** Medium

ARIA menu role implies keyboard interaction (arrow keys, Home/End) that is not implemented.

**Fix:** Either implement full keyboard navigation or use a simpler role like `role="listbox"`.

---

### M-15: `harden-static-export.mjs` computes script hashes before HTML entity decoding

**File:** `scripts/harden-static-export.mjs:40-52`
**Confidence:** Medium

Script hashes are computed from raw innerHTML. Browsers decode entities before executing. If Next.js entity-encodes script content, computed hashes would not match.

**Fix:** Decode HTML entities in script content before hashing.

---

## LOW Issues

### L-1: `useExportController` — `finally` block state updates on unmounted component

**File:** `src/lib/useExportController.ts:151-157`
**Confidence:** Medium

The 200ms `setTimeout` in the finally block is not cleared on unmount and fires into a stale closure.

**Fix:** Track mounted state with a ref and skip state updates if unmounted.

---

### L-2: `videoEncoder.ts` silent clamping of duration/bitrate/fps without feedback

**File:** `src/lib/videoEncoder.ts:54-58`
**Confidence:** Medium

`safeDuration`, `safeFps`, `safeBitrate` silently clamp user values. A user requesting a 20-minute video gets a 10-minute one with no indication.

**Fix:** Compare against original values and warn/error if clamping occurred.

---

### L-3: ErrorBoundary `handleReset` does not reset child state

**File:** `src/components/ErrorBoundary.tsx:33-35`
**Confidence:** Medium

Resetting only clears error boundary state. If the error was caused by corrupted child state, it will re-throw.

**Fix:** Use a `key` prop to force the entire subtree to remount.

---

### L-4: GoogleGuide tab state persists across modal open/close

**File:** `src/components/GoogleGuide.tsx:137`
**Confidence:** High

The `tab` state is not reset when the modal reopens. Users see the last tab instead of the default.

**Fix:** Reset tab state when `isOpen` transitions to true.

---

### L-5: FileUpload drop handler does not validate file type

**File:** `src/components/FileUpload.tsx:73-78`
**Confidence:** Medium

Any file type can be dropped and passed to `parseTrackFile`, even though the input accepts only `.gpx,.kml,.json`.

**Fix:** Validate file extension before processing dropped files.

---

### L-6: `parseTrackFile` does not validate file size before reading

**File:** `src/lib/parser.ts:422-457`
**Confidence:** Medium

No file size check for GPX/KML files (which bypass the worker). Multi-gigabyte files could crash the tab.

**Fix:** Add size check before `reader.readAsText(file)`.

---

### L-7: E2E test writes and deletes temp file unsafely

**File:** `e2e/travelback.spec.ts:908-919`
**Confidence:** High

The test creates `fixtures/unsupported.txt` using a fixed path. Concurrent test workers would race on the same file.

**Fix:** Use a unique filename with process PID or `os.tmpdir()`.

---

### L-8: Console.error/warn calls in production code

**Files:** `page.tsx:190`, `MapView.tsx:550`, `FileUpload.tsx:42,57`, `ErrorBoundary.tsx:25`
**Confidence:** Low

Debug logging visible in production browser consoles. Current usage is acceptable for error paths.

---

## Positive Observations

- **Robust input validation in parser.ts**: Coordinate range checks, XML entity stripping, and four Google format branches with graceful fallbacks.
- **Smart worker fallback pattern**: Graceful main-thread fallback when Worker fails.
- **Defensive haversine clamping**: `Math.min(1, ...)` prevents NaN from floating-point rounding.
- **Animation frame cleanup**: Proper `cancelAnimationFrame` and ref-based state in playback controller.
- **Export abort handling**: Correctly skips `finalize()` on abort to avoid corrupt MP4 output.
- **CSP hardening pipeline**: Pragmatic two-phase approach (dev `unsafe-inline` then postbuild hash replacement).
- **Security headers in serve-static.mjs**: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`.
- **Accessibility foundations**: Consistent ARIA labels, modal focus trap with Tab cycling, `inert` attribute on background content.
- **Type safety**: Zero TypeScript errors across all source files.
- **No hardcoded secrets**: No `dangerouslySetInnerHTML`, proper `rel="noopener noreferrer"` on external links.

---

## Files Reviewed

### Source (27 files)
- `src/types.ts`
- `src/app/layout.tsx`, `src/app/page.tsx`
- `src/components/Controls.tsx`, `src/components/ErrorBoundary.tsx`, `src/components/ElevationProfile.tsx`
- `src/components/ExportPanel.tsx`, `src/components/FileUpload.tsx`, `src/components/GlobalToolbar.tsx`
- `src/components/GoogleGuide.tsx`, `src/components/JourneyCreator.tsx`, `src/components/KeyboardHelp.tsx`
- `src/components/MapView.tsx`, `src/components/ModalDialog.tsx`, `src/components/SceneEditor.tsx`
- `src/components/ThemeToggle.tsx`, `src/components/TimelineSelector.tsx`, `src/components/Toast.tsx`
- `src/components/TrackToolbar.tsx`, `src/components/TrackWorkspace.tsx`
- `src/lib/camera.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`
- `src/lib/parser.ts`, `src/lib/useExportController.ts`, `src/lib/usePlaybackController.ts`
- `src/lib/videoEncoder.ts`

### Worker (1 file)
- `public/workers/trackParser.worker.js`

### Scripts (3 files)
- `scripts/serve-static.mjs`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`

### Public assets (3 reviewed)
- `public/theme-init.js`, `public/sample-trip.gpx`, `public/favicon.svg`

### Tests (1 file)
- `e2e/travelback.spec.ts`

### Config (3 files)
- `next.config.ts`, `package.json`, `tsconfig.json`

---

## Recommendation

**REQUEST CHANGES** — 4 CRITICAL and 8 HIGH issues must be addressed before the next release.

Priority order for fixes:
1. C-1: Worker sort divergence (straightforward 2-line fix)
2. C-4: CSP fail-open (security-critical)
3. C-3: Toast timer reset (affects primary use case)
4. C-2: Antimeridian camera interpolation
5. H-1: Worker MAX_TRACK_POINTS guard
6. H-2: O(n) → O(log n) interpolation search
7. H-3: ModalDialog onClose ref
8. H-4: ThemeToggle system preference override
9. H-5 through H-8 and MEDIUM issues in follow-up pass
