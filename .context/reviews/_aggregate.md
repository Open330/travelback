# Prompt 1 aggregate review — cycle 4

Generated on 2026-04-19 after a fresh comprehensive review of the current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle4-comprehensive-2026-04-19.md`) covering code quality, security, performance, UX, correctness, architecture, accessibility
- Prior cycle 3 aggregate (`_aggregate.md`) and all per-agent reviews reviewed for carried-forward items
- Prior deferred findings (`deferred-findings-cycle1-2026-04-19.md`, `deferred-findings-cycle2-2026-04-19.md`) reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- Deduped overlapping findings and kept the highest severity / confidence.
- Marked items as NOT CONFIRMED where the current code already handles the issue.
- Carried forward still-valid deferred items as-is (they remain deferred per the existing rules).
- New findings from this cycle are prefixed C4-AGG.

## All cycle 3 active findings verified as FIXED

| Prior ID | Description | Fix verification |
|----------|-------------|------------------|
| C3-AGG-001 | `parseSemanticSegments` segment boundaries | `parser.ts:291-292` adds break between timelinePath and visit; worker also patched |
| C3-AGG-002 | Scene editor dead normalization warnings | `SceneEditor.tsx:201-210` validates raw scenes BEFORE normalization |
| C3-AGG-003 | Worker fallback rejects instead of retrying | `parser.ts:471-476`, `parser.ts:501-505` fall back to main-thread parser |
| C3-AGG-004 | Map error shows raw WebGL dump | `MapView.tsx:928-935` friendly message with `<details>` disclosure |
| C3-AGG-005 | Timeline handles not keyboard-accessible | `TimelineSelector.tsx:321-360` has slider role, tabIndex, aria, keyboard handlers, focus ring |
| C3-AGG-006 | Error toast/file-upload lack live regions | `Toast.tsx:66` has role="status" aria-live="polite"; `FileUpload.tsx:250` has role="alert" |
| C3-AGG-007 | Export download fallback claims success | `i18n.ts:120` key changed to "Your video download has started." |
| C3-AGG-008 | Misleading `--err-rgb` fallback | `page.tsx:325` now uses `rgba(var(--err-rgb),.7)` without fallback |
| C3-AGG-009 | No build guard against tool-state leakage | `smoke-static.mjs:131-146` adds `assertNoToolResidue`; `.gitignore` has `.omc/` and `.omx/` |

## Merged findings (active, to be addressed this cycle)

### C4-AGG-001 — MEDIUM — Worker `parseSemanticSegments` uses `continue` in wrong scope, skipping segment boundaries for invalid visits

**Cross-agent agreement:** cycle4-comprehensive
**Primary locations:**
- `public/workers/trackParser.worker.js:122-126` — `continue` applies to the outer `for` loop

**Why it matters:**
In the worker's `parseSemanticSegments`, when a visit has invalid coordinates (failing the `Math.abs(lat) > 90 || Math.abs(lng) > 180` check at line 125), the `continue` statement skips the ENTIRE remaining processing for that segment, including the segment-start push at line 129 (`if (out.length > afterPathLen && afterPathLen > 0) segStarts.push(afterPathLen)`). This means invalid visit coordinates can cause missing segment boundaries.

The main-thread `parser.ts:305` does NOT have this bug because the `continue` is inside the `if (m)` block within the `if (visit)` block — it only skips the invalid point, not the segment boundary push.

**Suggested fix:**
In the worker's `parseSemanticSegments`, restructure the visit block to avoid using `continue` at the top level of the `for` loop. Use nested `if` blocks or an `else` structure to skip only the invalid visit, not the segment boundary logic.

**Confidence:** High

---

### C4-AGG-002 — MEDIUM — Export success message is too hedged for `showSaveFilePicker` path

**Cross-agent agreement:** cycle4-comprehensive, critic (cycle 3)
**Primary locations:**
- `src/components/ExportPanel.tsx:204-205` — always shows `t('export.savedToDownloads')`
- `src/lib/videoEncoder.ts:154-181` — `downloadVideo` returns `true` for both paths

**Why it matters:**
The cycle 3 fix softened the message from "Your video is in your Downloads folder" to "Your video download has started." This is accurate for the `<a>` fallback path but inaccurate for the `showSaveFilePicker` path where the user explicitly chose a save location and the file was written successfully. The message "download has started" implies uncertainty that doesn't exist when the picker completed.

**Suggested fix:**
Track which download path was used and show different messages, or use a neutral message like "Your video is ready." that works for both paths.

**Confidence:** High

---

### C4-AGG-003 — MEDIUM — `computeCumulativeDistances` redundantly computed 4+ times for the same track

**Cross-agent agreement:** cycle4-comprehensive, perf-reviewer (cycle 2)
**Primary locations:**
- `src/app/page.tsx:245-248` — computes `cumulativeDistances` from `track`
- `src/components/MapView.tsx:760` — recomputes from `track`
- `src/components/TimelineSelector.tsx:67-69` — recomputes from `track`
- `src/components/ElevationProfile.tsx:23-25` — recomputes from `track`

**Why it matters:**
`computeCumulativeDistances` iterates over all points with haversine calculations (~250K trig operations for a max-size track). This computation is done independently in at least 4 components for the same track data. `page.tsx` already computes it but doesn't pass it down.

**Suggested fix:**
Compute `cumulativeDistances` once in `page.tsx` and pass it as a prop to MapView, TimelineSelector, and ElevationProfile instead of having them recompute it.

**Confidence:** High

---

### C4-AGG-004 — LOW — `SceneRangeEditor` handles lack keyboard accessibility (same class of issue as fixed C3-AGG-005)

**Cross-agent agreement:** cycle4-comprehensive, designer (cycle 3)
**Primary locations:**
- `src/components/SceneEditor.tsx:165-182` — start/end handle divs have no tabIndex, role, or keyboard handlers

**Why it matters:**
The `SceneRangeEditor` component has handle divs with `onPointerDown` but no `tabIndex`, `role`, `aria-*` attributes, or keyboard handlers. Unlike the `TimelineSelector` handles fixed in cycle 3, these remain pointer-only.

**Suggested fix:**
Add `tabIndex={0}`, `role="slider"`, `aria-*` attributes, and keyboard handlers to the scene editor range handles.

**Confidence:** High

---

### C4-AGG-005 — MEDIUM — `preserveDrawingBuffer: true` is always on, wasting GPU resources except during export

**Cross-agent agreement:** cycle4-comprehensive, perf-reviewer (cycle 2 as Perf-5)
**Primary locations:**
- `src/components/MapView.tsx:554` — `canvasContextAttributes: { preserveDrawingBuffer: true }`

**Why it matters:**
This flag forces the browser to keep the WebGL drawing buffer intact after compositing, which disables a common GPU optimization. The flag is only needed for video export (canvas capture), but it's set unconditionally on map creation. During normal playback and browsing, it adds GPU overhead for no benefit.

**Suggested fix:**
Defer to a performance-focused cycle. The fix requires destroying and recreating the map with the flag only during export, which is a significant refactor. Document the trade-off with a comment in the meantime.

**Confidence:** High

---

### C4-AGG-006 — MEDIUM — `JourneyCreator` does not validate waypoint proximity — duplicate/near-duplicate points create zero-length segments

**Cross-agent agreement:** cycle4-comprehensive
**Primary locations:**
- `src/components/JourneyCreator.tsx:257-266` — click handler adds waypoints without proximity check

**Why it matters:**
Double-clicking or clicking very close to an existing waypoint creates near-duplicate points. While the app handles zero-length segments gracefully, the track has redundant points that waste memory and produce misleading point counts.

**Suggested fix:**
Before adding a new waypoint, check if it's within a minimum distance threshold (e.g., 5 meters) of the last waypoint. If so, ignore the click or update the existing waypoint instead.

**Confidence:** Medium

---

### C4-AGG-007 — LOW — ErrorBoundary uses emoji that may not render on all systems

**Cross-agent agreement:** cycle4-comprehensive
**Primary locations:**
- `src/components/ErrorBoundary.tsx:43` — `<p aria-hidden="true">😵</p>`

**Why it matters:**
The dizzy face emoji may render as a square or question mark on minimal systems. Since it's `aria-hidden`, it doesn't affect accessibility, but it could confuse users.

**Suggested fix:**
Replace with an SVG icon or remove entirely. The text message is sufficient.

**Confidence:** Medium

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in `deferred-findings-cycle2-2026-04-19.md` and are NOT scheduled for this cycle:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap

And from cycle 1:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C3-AGG-001 through C3-AGG-009 | Cycle 3 active findings | All verified fixed in current code |
| C4R-003 | Playback hotkeys block range inputs | `tagName === 'INPUT'` guard returns early, native behavior preserved |
| C4R-004 | Worker lacks JSON depth check | `checkJsonDepth` is called at worker line 246 before parsing |
| C4R-009 | downloadVideo doesn't revoke URL | URL intentionally kept for video preview; revoked on session reset |
| C4R-010 | MapView initial style race | Style-change effect handles changes; initial style consistent with first render |
| C3R-003 | Export can start with unknown codec | `codecReady === true` guard correctly blocks while null/false |
| C3R-002 | Antimeridian interpolation | Code uses `shortestLngDelta`, `wrapLngNear`, shifted-longitude lerp correctly |
| C3R-012 | Theme toggle assumes modern APIs | `addListener` fallback already exists at ThemeToggle.tsx:48-53 |

## Recommended implementation order for this cycle
1. **C4-AGG-001 (MEDIUM)**: Fix worker `continue` scope in `parseSemanticSegments` — correctness bug
2. **C4-AGG-002 (MEDIUM)**: Differentiate export success message by download path — UX honesty
3. **C4-AGG-003 (MEDIUM)**: Pass `cumulativeDistances` as prop instead of recomputing — performance
4. **C4-AGG-004 (LOW)**: Add keyboard a11y to SceneRangeEditor handles — accessibility
5. **C4-AGG-006 (MEDIUM)**: Add waypoint proximity validation in JourneyCreator — UX correctness
6. **C4-AGG-007 (LOW)**: Replace ErrorBoundary emoji with SVG — robustness
7. **C4-AGG-005 (MEDIUM)**: Defer `preserveDrawingBuffer` to perf cycle — needs significant refactor, add comment
