# Cycle 6 Aggregate Review — 2026-04-19

Generated after comprehensive full-repo review of current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle6-comprehensive-2026-04-19.md`)
- All prior cycle reviews and aggregates reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C5 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C6-AGG.

## All cycle 5 active findings verified as FIXED

| Prior ID | Description | Fix verification |
|----------|-------------|------------------|
| C5-AGG-001 | `downloadVideo` fallback `<a>` removal timing | `setTimeout` at `videoEncoder.ts:193` |
| C5-AGG-002 | `exportVideo` accepts optional `cumulDistParam` | Parameter added at `videoEncoder.ts:48` |
| C5-AGG-003 | `formatDuration` NaN/Infinity guard | Guard at `interpolate.ts:179` |
| C5-AGG-004 | Worker `var` to `const`/`let` | Worker lines 116-128 use `const` |
| C5-AGG-005 | Worker boundary-check style parity comment | Comment at worker line 120-121 |
| C5-AGG-006 | JourneyCreator search error message clarity | Already clear |
| C5-AGG-007 | Controls `totalDistance` memo deps | Fixed at `Controls.tsx:42` |
| C5-AGG-008 | Reduced-motion spinner | Fixed at `globals.css:44-47` |

## Merged findings (active, to be addressed this cycle)

### C6-AGG-001 — MEDIUM — `cumulativeDistances` memo depends on `track` object reference

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/app/page.tsx:246-249` — `useMemo(() => computeCumulativeDistances(...), [track])`

**Why it matters:**
The `track` object is a new reference on every `setTrack()` call. This triggers an O(n) haversine recomputation unnecessarily when only the reference changed but the data is the same. The same issue was fixed in `Controls.tsx` last cycle but persists here. Additionally, `computeCumulativeDistances` is redundantly called inside `MapView.tsx:765` — a second O(n) computation on every track change.

**Suggested fix:**
1. Change memo deps to `[track?.points, track?.segmentStartIndices]` in `page.tsx:248`.
2. Pass `cumulativeDistances` as a prop to `MapView` and use it instead of recomputing internally.

**Confidence:** High

---

### C6-AGG-002 — MEDIUM — `MapView` recomputes `cumulDist` internally despite caller already computing it

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/components/MapView.tsx:765` — `computeCumulativeDistances(track.points, track.segmentStartIndices)`

**Why it matters:**
Redundant O(n) computation. `page.tsx` already computes `cumulativeDistances` and passes it through `TrackWorkspace` to children. `MapView` is rendered directly from `page.tsx` but does not receive `cumulativeDistances` as a prop.

**Suggested fix:**
Add `cumulativeDistances` as a prop to `MapView` and use it to populate `cumulDistRef` instead of recomputing. Fall back to computing only when the prop is empty/undefined.

**Confidence:** High

---

### C6-AGG-003 — LOW — `useExportController` still computes `cumulDist` locally despite `cumulDistParam` existing in `exportVideo`

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/lib/useExportController.ts:131` — `const cumulDist = computeCumulativeDistances(...)`

**Why it matters:**
Cycle 5 added `cumulDistParam` support to `exportVideo`, but the controller still computes locally and passes it. The `page.tsx` already has `cumulativeDistances` available but does not pass it to `useExportController`.

**Suggested fix:**
Add `cumulativeDistances` to `UseExportControllerOptions` and pass it through to `exportVideo` as `cumulDistParam`.

**Confidence:** High

---

### C6-AGG-004 — LOW — Main-thread `parseSemanticSegments` uses `continue` which skips segment-start index recording for invalid visits

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/lib/parser.ts:305` — `if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue`
- `public/workers/trackParser.worker.js:128` — uses `if` guard instead (correct behavior)

**Why it matters:**
When a semantic segment has a timelinePath with valid points followed by a visit with invalid coordinates, the main-thread `continue` skips the segment-start recording on line 311. The worker correctly falls through because it uses an `if` guard. This creates inconsistent segmentation between the two parser paths.

**Suggested fix:**
Replace the `continue` in `parser.ts:305` with an `if` guard (same pattern as the worker), so execution falls through to the segment-start recording.

**Confidence:** Medium (main-thread fallback is low-frequency path, but inconsistency is real)

---

### C6-AGG-005 — LOW — `buildReferenceGridData` uses `expandedMinLng` instead of `expandedMinLat` for latitude count calculation

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/components/MapView.tsx:306` — `Math.floor(expandedMinLng / step)` should be `Math.floor(expandedMinLat / step)`

**Why it matters:**
Clear copy-paste bug. The latitude grid line count uses the longitude minimum instead of the latitude minimum, producing an incorrect starting position and count. For most tracks this creates a slightly misaligned grid that still looks acceptable, but for tracks near the poles or with large latitude spans, the grid may be visibly off.

**Suggested fix:**
Change `Math.floor(expandedMinLng / step)` to `Math.floor(expandedMinLat / step)` on line 306.

**Confidence:** High — this is a clear copy-paste bug

---

### C6-AGG-006 — LOW — GlobalToolbar locale select uses `appearance-none` without a custom dropdown indicator

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/components/GlobalToolbar.tsx:53` — `appearance-none` class hides native dropdown arrow

**Why it matters:**
On most browsers, the select element appears as plain text with no indication it's interactive. Other selects in the app (ExportPanel, SceneEditor) retain their native indicators.

**Suggested fix:**
Remove `appearance-none` from the locale select in GlobalToolbar.

**Confidence:** Medium

---

### C6-AGG-007 — LOW — Toast redundant `aria-live="polite"` with `role="status"`

**Cross-agent agreement:** cycle6-comprehensive
**Primary locations:**
- `src/components/Toast.tsx:66` — `role="status" aria-live="polite"`

**Why it matters:**
`role="status"` already implies `aria-live="polite"` per the ARIA spec. The explicit attribute is redundant but harmless.

**Suggested fix:**
Remove the explicit `aria-live="polite"` since `role="status"` already provides it.

**Confidence:** High (cosmetic)

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in their existing files and are NOT scheduled for this cycle:

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH — still the most impactful perf issue)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on, wasting GPU resources

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping
- DF-C5-002: MapView animation effect stable callback dependencies (latent risk)

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C6-005 | ElevationProfile SVG `useId()` colons | `useId()` is the correct React pattern; colon IDs work in modern browsers. Not a real issue. |
| C6-009 | `downloadVideo` fallback URL race condition | The URL is held in React state by the caller and revoked only on cleanup/reset. The 100ms `<a>` removal timeout is well within the URL's lifetime. Risk is negligible. |

## Recommended implementation order for this cycle

1. **C6-AGG-001 (MEDIUM)**: Fix `cumulativeDistances` memo deps — performance
2. **C6-AGG-002 (MEDIUM)**: Pass `cumulativeDistances` to MapView — performance (eliminates redundant O(n) computation)
3. **C6-AGG-003 (LOW)**: Pass `cumulativeDistances` through `useExportController` — completes the C5-AGG-002 fix
4. **C6-AGG-004 (LOW)**: Fix `parseSemanticSegments` `continue` → `if` guard — correctness / parser consistency
5. **C6-AGG-005 (LOW)**: Fix `buildReferenceGridData` `expandedMinLng` → `expandedMinLat` — copy-paste bug
6. **C6-AGG-006 (LOW)**: Remove `appearance-none` from GlobalToolbar locale select — UX
7. **C6-AGG-007 (LOW)**: Remove redundant `aria-live` from Toast — code cleanliness
