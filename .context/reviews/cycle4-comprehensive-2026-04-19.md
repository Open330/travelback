# Cycle 4 Comprehensive Deep Code Review — 2026-04-19

Performed against the current `main` branch after cycle 1, 2, and 3 fixes.

## Review Angles Covered
- Code quality / logic / maintainability / SOLID
- Security (OWASP, secrets, unsafe patterns)
- Performance (startup, rendering, memory)
- UI/UX / accessibility / WCAG
- Correctness / edge cases
- Architecture / coupling
- Test coverage gaps
- Documentation-code mismatches
- Latent bugs / failure modes

## Prior-cycle finding verification

### Verified FIXED from cycle 3
| Prior ID | Description | Evidence |
|----------|-------------|----------|
| C3-AGG-001 | `parseSemanticSegments` misses segment boundaries | `parser.ts:291-292` adds `segStarts.push(preLen)` between timelinePath and visit blocks; worker also patched |
| C3-AGG-003 | Worker fallback rejects instead of retrying | `parser.ts:471-476` and `parser.ts:501-505` now fall back to `parseGoogleLocationHistory(decodeJsonBuffer(buffer))` |
| C3-AGG-004 | Map error shows raw WebGL dump | `MapView.tsx:928-935` now shows friendly message with `<details>` disclosure |
| C3-AGG-005 | Timeline handles not keyboard-accessible | `TimelineSelector.tsx:321-360` has `role="slider"`, `tabIndex={0}`, `aria-*` attrs, `onKeyDown` handlers, focus-visible ring |
| C3-AGG-006 | Error toast/file-upload lack live regions | `Toast.tsx:66` has `role="status" aria-live="polite"`; `FileUpload.tsx:250` has `role="alert"` |
| C3-AGG-002 | Scene editor dead normalization warnings | `SceneEditor.tsx:201-210` now validates raw scenes BEFORE normalization and displays warnings |
| C3-AGG-007 | Export download fallback claims success | `i18n.ts:120` key changed to "Your video download has started." |
| C3-AGG-009 | No build guard against tool-state leakage | `smoke-static.mjs:131-146` adds `assertNoToolResidue` scanning for `.omc`, `.omx`, `.claude`, `.codex`, `.git`; `.gitignore` has `.omc/` and `.omx/` |
| C3-AGG-008 | Misleading `--err-rgb` fallback | `page.tsx:325` now uses `rgba(var(--err-rgb),.7)` without fallback |

### Verified FIXED from cycles 1 & 2 (still holding)
All prior fixes from cycles 1 and 2 remain intact and verified.

---

## New findings from this cycle's deep review

### C4R-001 — MEDIUM — `preserveDrawingBuffer: true` forces full-canvas GPU readback every frame during export, hurting performance on low-end GPUs

**Severity:** MEDIUM / Confidence: HIGH

**Primary location:**
- `src/components/MapView.tsx:554` — `canvasContextAttributes: { preserveDrawingBuffer: true }`

**Why it matters:**
`preserveDrawingBuffer: true` is set unconditionally when the map is created. This flag forces the browser to keep the WebGL drawing buffer intact after compositing, which disables a common GPU optimization (discarding the buffer after presentation). The flag is only needed for video export (canvas capture). During normal playback and browsing, it adds GPU overhead for no benefit.

**Concrete failure scenario:**
On low-end mobile GPUs, the extra memory bandwidth from preserving the drawing buffer can cause visible frame drops during map animation and playback, especially on 4K displays.

**Suggested fix:**
Only set `preserveDrawingBuffer: true` when actively exporting. This could be done by:
1. Adding a prop like `isExporting` to MapView
2. When `isExporting` changes to true, destroy and recreate the map with `preserveDrawingBuffer: true`
3. When export finishes, recreate without it

However, this is a significant refactor. A simpler alternative: document the trade-off with a comment and defer to a performance-focused cycle.

---

### C4R-002 — MEDIUM — Worker `parseSemanticSegments` uses `var` and `continue` in wrong scope, potentially skipping visit points

**Severity:** MEDIUM / Confidence: HIGH

**Primary location:**
- `public/workers/trackParser.worker.js:122-126` — the `visit` processing block

**Why it matters:**
The worker file at line 122-126 has:
```js
if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
```
The `continue` statement here applies to the outer `for (const seg of segments)` loop, NOT just the visit block. If a visit has invalid coordinates, it skips the ENTIRE remaining processing for that segment, including the segment-start push at line 129. This means invalid visit coordinates can cause missing segment boundaries.

In the main-thread `parser.ts:305`, the equivalent uses `continue` inside the `if (m)` block which is within the `if (visit)` block, so it only skips the invalid visit point. But in the worker, the scoping is different because the `continue` is at the top level of the `for` loop.

**Concrete failure scenario:**
A Google phone export segment has a visit with malformed coordinates (e.g., "0°, 0°" after a regex match fails). The `continue` skips not just the visit but also the `if (out.length > afterPathLen && afterPathLen > 0) segStarts.push(afterPathLen)` at line 129, causing the next segment to not have a proper boundary.

**Suggested fix:**
In the worker's `parseSemanticSegments`, replace `continue` at line 125 with a nested structure that only skips the invalid visit, not the entire segment. Mirror the main-thread parser's structure more closely.

---

### C4R-003 — MEDIUM — `usePlaybackHotkeys` blocks arrow keys inside `<select>` elements but not inside `<input type="range">`

**Severity:** MEDIUM / Confidence: HIGH

**Primary location:**
- `src/lib/usePlaybackController.ts:141-147` — keyboard event filter

**Why it matters:**
The hotkey handler checks for `INPUT`, `TEXTAREA`, `SELECT` tag names and returns early to avoid intercepting typing. However, `<input type="range">` elements are also `INPUT` tags, so pressing arrow keys while focused on a range slider (like the progress bar or scene editor sliders) is swallowed by the hotkey handler instead of being handled by the slider's native arrow key behavior.

Wait — re-reading the code more carefully: lines 145-147 say:
```ts
if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || isInteractiveTarget) {
  return
}
```

This returns early for ALL input types, including `type="range"`. But range inputs use arrow keys natively for increment/decrement. The hotkey handler intercepts arrow keys for step-seeking, which means:
- When a user focuses a range slider and presses ArrowRight, the playback seeks +2% instead of the slider incrementing.
- The scene editor range sliders for zoom, pitch, bearing, rotation also have this problem.

Actually, looking more carefully, the `isInteractiveTarget` check at line 142 already catches buttons, dialogs, and elements with `data-disable-playback-hotkeys="true"`. But range inputs are NOT caught by that check — they're caught by the `tagName === 'INPUT'` check which returns early. So range inputs DO get their native behavior because the hotkey handler returns early.

Wait, but if the handler returns early for INPUT, then the native browser behavior should work fine because the handler doesn't call `preventDefault()`. Let me re-check...

Looking at lines 153-167:
```ts
case 'ArrowRight':
  event.preventDefault()
  onStepSeek(0.02)
  break
case 'ArrowLeft':
  event.preventDefault()
  onStepSeek(-0.02)
  break
```

These call `preventDefault()`. But they're inside the `switch` that only runs if the early return at line 145 doesn't fire. Since `tagName === 'INPUT'` causes a return, the `preventDefault()` is never called for inputs. So range inputs should work correctly.

**Revised assessment:** NOT CONFIRMED. The `tagName === 'INPUT'` guard correctly prevents the hotkey handler from intercepting arrow keys when any input (including range sliders) is focused. The native browser behavior is preserved.

**Status:** NOT AN ISSUE — the existing guard handles it correctly.

---

### C4R-004 — LOW — Worker `parseSemanticSegments` lacks `JSON_DEPTH_EXCEEDED` check before parsing

**Severity:** LOW / Confidence: MEDIUM

**Primary location:**
- `public/workers/trackParser.worker.js:246` — `checkJsonDepth(text)` is called before `parseGoogleLocationHistory`

**Why it matters:**
Actually, looking at the worker code, `checkJsonDepth` IS called at line 246. And `parseGoogleLocationHistory` at line 248 does NOT call `checkJsonDepth` internally (the worker version doesn't have the depth check inside the parser function). So the worker correctly does: decode buffer -> checkJsonDepth -> parse. This is fine.

**Revised assessment:** NOT AN ISSUE.

---

### C4R-005 — MEDIUM — `ExportPanel` success view still shows `export.savedToDownloads` key which says "download has started" even for `showSaveFilePicker` path where the file was actually saved

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/components/ExportPanel.tsx:204-205` — success message always uses `t('export.savedToDownloads')`
- `src/lib/videoEncoder.ts:154-181` — `downloadVideo` returns `true` for both paths

**Why it matters:**
The cycle 3 fix softened the message from "Your video is in your Downloads folder" to "Your video download has started." This is accurate for the `<a>` fallback path, but inaccurate for the `showSaveFilePicker` path where the user explicitly chose a save location and the file was actually written. The message "download has started" implies uncertainty that doesn't exist for the picker path.

**Concrete failure scenario:**
A user on Chrome uses `showSaveFilePicker` to save a video to their Desktop. The success screen says "Your video download has started" — which sounds like it's still in progress or uncertain, even though the file is already saved on their Desktop.

**Suggested fix:**
Track which download path was used (picker vs. fallback) and show different messages:
- Picker path: "Your video has been saved." (confident)
- Fallback path: "Your video download has started." (appropriately hedged)

Or, simpler: change to a neutral message like "Your video is ready." that works for both paths.

---

### C4R-006 — LOW — `SceneRangeEditor` handles have no ARIA slider semantics or keyboard interaction

**Severity:** LOW / Confidence: HIGH

**Primary location:**
- `src/components/SceneEditor.tsx:165-182` — start/end handle divs

**Why it matters:**
The `SceneRangeEditor` component (used within the scene editor for dragging scene boundaries) has handle divs with `onPointerDown` but no `tabIndex`, `role`, `aria-*` attributes, or keyboard handlers. Unlike the `TimelineSelector` handles that were fixed in cycle 3, these scene editor handles remain mouse/pointer-only.

**Concrete failure scenario:**
A keyboard-only user cannot adjust scene start/end boundaries in the scene editor. They must use the number inputs instead, which are less intuitive for spatial adjustment.

**Suggested fix:**
Add the same a11y treatment as the timeline handles: `tabIndex={0}`, `role="slider"`, `aria-*` attributes, and keyboard handlers.

---

### C4R-007 — MEDIUM — `computeCumulativeDistances` is called redundantly multiple times for the same track

**Severity:** MEDIUM / Confidence: HIGH

**Primary locations:**
- `src/app/page.tsx:245-248` — `useMemo` computes `cumulativeDistances` from `track`
- `src/components/MapView.tsx:760` — recomputes `cumulDistRef.current` from `track`
- `src/components/TimelineSelector.tsx:67-69` — recomputes `cumulDist` from `track`
- `src/components/ElevationProfile.tsx:23-25` — recomputes `cumulDist` from `track`

**Why it matters:**
`computeCumulativeDistances` iterates over all points and computes haversine distances for each consecutive pair. For a 250,000-point track, this is ~250K haversine calculations (each involving trig functions). This computation is done independently in at least 4 different components for the same track data.

`page.tsx` already computes it and passes it to `handlePreviewScene`, but it's not passed to MapView, TimelineSelector, or ElevationProfile — they each recompute it.

**Concrete failure scenario:**
A 250K-point track is loaded. The cumulative distances are computed 4+ times on mount, each taking ~5-10ms, wasting 15-30ms of startup time.

**Suggested fix:**
Compute `cumulativeDistances` once in `page.tsx` (already done) and pass it down to MapView, TimelineSelector, and ElevationProfile as a prop instead of having them recompute it. This also ensures consistency if the track changes.

---

### C4R-008 — LOW — `ErrorBoundary` uses emoji in its fallback UI which may not render on all systems

**Severity:** LOW / Confidence: MEDIUM

**Primary location:**
- `src/components/ErrorBoundary.tsx:43` — `<p className="text-5xl mb-4" aria-hidden="true">😵</p>`

**Why it matters:**
The dizzy face emoji may render differently across platforms and may not render at all on some minimal systems. Since it's `aria-hidden="true"`, it doesn't affect accessibility, but it could confuse users on systems where it renders as a square or question mark.

**Suggested fix:**
Replace with an SVG icon or remove entirely. The text message is sufficient.

---

### C4R-009 — MEDIUM — `downloadVideo` does not revoke the temporary `<a>` element's object URL on cleanup

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary location:**
- `src/lib/videoEncoder.ts:173-181` — `<a>` download fallback

**Why it matters:**
In the `<a>` fallback path (lines 174-180), a temporary anchor element is created, appended to the body, clicked, then removed. However, the object URL passed to `a.href` is NOT revoked in this path. The caller (`useExportController.ts:145`) creates the URL via `URL.createObjectURL(blob)` and stores it in state for the video preview. The URL is eventually revoked when the export session resets or the component unmounts. So the URL is intentionally kept alive for the video preview element.

**Revised assessment:** NOT A BUG — the URL is intentionally kept alive for the `<video>` preview. It gets revoked when the export session resets via `revokeExportedVideoUrl()` or on unmount. No leak.

**Status:** NOT AN ISSUE — the lifecycle is correct.

---

### C4R-010 — MEDIUM — `MapView` map initialization effect has no dependency on `mapStyleKey` for the initial style

**Severity:** MEDIUM / Confidence: HIGH

**Primary location:**
- `src/components/MapView.tsx:545-632` — map initialization `useEffect`

**Why it matters:**
The map initialization effect (line 545) runs only on mount (`[]` dependency). It reads `mapStyleKey` to set the initial style (`MAP_STYLES[mapStyleKey].url` at line 551). If `mapStyleKey` changes between the first render and when the map actually initializes (which happens asynchronously), the map could start with the wrong style.

The separate style-change effect (line 635) handles subsequent changes correctly. But there's a narrow race: if `mapStyleKey` changes during the first render cycle before the initialization effect fires, the map will use the stale initial value.

However, since `mapStyleKey` is derived from `colorMode` and both are initialized from `document.documentElement.getAttribute('data-mode')` synchronously, and the map initialization also happens synchronously within the effect, this race is extremely unlikely in practice.

**Revised assessment:** THEORETICAL RISK only. The dependency on `mapStyleKey` for the initial style is correctly captured by the separate style-change effect. The initial style is always consistent with the initial render because `mapStyleKey` state is set during the first render.

**Status:** NOT A PRACTICAL ISSUE — the current architecture handles it correctly.

---

### C4R-011 — MEDIUM — `JourneyCreator` does not validate waypoint proximity — duplicate/near-duplicate points create zero-length segments

**Severity:** MEDIUM / Confidence: MEDIUM

**Primary location:**
- `src/components/JourneyCreator.tsx:257-266` — click handler adds waypoints without proximity check

**Why it matters:**
When a user accidentally double-clicks the map or clicks very close to an existing waypoint, a near-duplicate point is added. This creates a zero-length segment in the journey track. While the app handles zero-length segments gracefully (interpolation guard at `interpolate.ts:84`), the resulting track has redundant points that waste memory and can cause subtle UI issues (e.g., the distance calculation is correct but the point count is misleadingly high).

**Suggested fix:**
Before adding a new waypoint, check if it's within a minimum distance threshold (e.g., 5 meters) of the last waypoint. If so, ignore the click or show a warning.

---

### C4R-012 — LOW — `TrackWorkspace` title uses `right-56` class which may overlap with toolbar on medium screens

**Severity:** LOW / Confidence: MEDIUM

**Primary location:**
- `src/components/TrackWorkspace.tsx:117` — `className="absolute left-4 right-56 top-4 z-10..."`

**Why it matters:**
The track title div uses `right-56` (14rem = 224px) to avoid overlapping with the right toolbar. However, on medium-sized screens (between `lg` and the toolbar width), the title may be truncated excessively while the toolbar buttons wrap, leaving unused space.

**Suggested fix:**
Consider using a more responsive approach, like `right-48 lg:right-56`, or using `pointer-events-none` to allow the title to extend behind the toolbar.

---

## Summary of active (non-deferred) findings by severity

| ID | Severity | Confidence | Category | Title | Status |
|----|----------|------------|----------|-------|--------|
| C4R-001 | MEDIUM | HIGH | Performance | `preserveDrawingBuffer: true` always on, hurts GPU perf | Open (defer candidate) |
| C4R-002 | MEDIUM | HIGH | Correctness | Worker `continue` in wrong scope skips segment boundaries | Open |
| C4R-005 | MEDIUM | HIGH | UX | Export success message too hedged for picker path | Open |
| C4R-006 | LOW | HIGH | Accessibility | SceneRangeEditor handles lack keyboard a11y | Open |
| C4R-007 | MEDIUM | HIGH | Performance | `computeCumulativeDistances` redundantly computed 4x | Open |
| C4R-008 | LOW | MEDIUM | UX | ErrorBoundary emoji may not render | Open |
| C4R-011 | MEDIUM | MEDIUM | UX | JourneyCreator lacks waypoint proximity validation | Open |
| C4R-012 | LOW | MEDIUM | UX | Track title `right-56` may truncate excessively | Open |

## Carried-forward deferred items (not re-opened this cycle)

These remain in `deferred-findings-cycle2-2026-04-19.md` and are NOT scheduled:
- DF-C2-001 through DF-C2-010: see deferred-findings doc for full list
- DF-C1-001 and DF-C1-002: see cycle 1 deferred findings

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C3R-003 | Export can start with codec still unknown | `codecReady === true` guard blocks button while null/false — already correct |
| C4R-003 | Playback hotkeys block range input arrow keys | `tagName === 'INPUT'` guard returns early, preserving native behavior |
| C4R-004 | Worker lacks JSON depth check | `checkJsonDepth` is called at worker line 246 before parsing |
| C4R-009 | downloadVideo doesn't revoke URL | URL intentionally kept alive for video preview; revoked on session reset |
| C4R-010 | MapView initial style race | Style-change effect handles subsequent changes; initial style consistent with first render |
