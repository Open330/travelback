# Prompt 1 aggregate review — cycle 5

Generated on 2026-04-19 after a fresh comprehensive review of the current `main` branch.

## Review lanes considered
- Fresh comprehensive review (`cycle5-comprehensive-2026-04-19.md`) covering code quality, security, performance, UX, correctness, architecture, accessibility
- Prior cycle 4 aggregate (`_aggregate.md`) and all per-agent reviews reviewed for carried-forward items
- Prior deferred findings reviewed for items that should re-open

## Aggregation method
- Re-verified every prior finding against the current codebase.
- All C4 active findings confirmed FIXED in prior cycle.
- Deduped overlapping findings and kept the highest severity / confidence.
- Carried forward still-valid deferred items as-is.
- New findings from this cycle are prefixed C5-AGG.

## All cycle 4 active findings verified as FIXED

| Prior ID | Description | Fix verification |
|----------|-------------|------------------|
| C4-AGG-001 | Worker `continue` scope in `parseSemanticSegments` | Worker restructured with nested `if` — no `continue` at loop level |
| C4-AGG-002 | Export success message differentiated by download path | `downloadMethod` tracked; `export.videoSaved` vs `export.savedToDownloads` shown correctly |
| C4-AGG-003 | `computeCumulativeDistances` redundantly computed | Passed as prop from `page.tsx` through `TrackWorkspace` to children |
| C4-AGG-004 | SceneRangeEditor keyboard accessibility | Has `role="slider"`, `tabIndex={0}`, `aria-*`, `onKeyDown`, focus ring |
| C4-AGG-006 | Waypoint proximity validation | Both click handler and `handleSelectPlace` check `PROXIMITY_THRESHOLD_METERS` |
| C4-AGG-007 | ErrorBoundary emoji replaced with SVG | SVG circle-exclamation icon at `ErrorBoundary.tsx:43` |
| C4-AGG-005 | `preserveDrawingBuffer` trade-off documented | Comment at `MapView.tsx:554-558` explains the trade-off |

## Merged findings (active, to be addressed this cycle)

### C5-AGG-001 — MEDIUM — `downloadVideo` fallback `<a>` removal is synchronous, may not trigger download on all browsers

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `src/lib/videoEncoder.ts:182-189` — `appendChild → click → removeChild` is synchronous

**Why it matters:**
Some browsers (notably Safari < 15.4 and certain mobile WebViews) require the `<a>` element to remain in the DOM for at least one event loop tick for the download to initiate. The synchronous removal can cause the download to silently fail — the user sees "Your video download has started" but nothing happens, and the video is irretrievable.

**Suggested fix:**
Delay the removal: `setTimeout(() => { document.body.removeChild(a) }, 100)`.

**Confidence:** Medium

---

### C5-AGG-002 — LOW — `exportVideo` computes `cumulDist` internally when caller already has it

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `src/lib/videoEncoder.ts:65` — `computeCumulativeDistances(track.points, track.segmentStartIndices)`
- `src/app/page.tsx:246-248` — already computes `cumulativeDistances`

**Why it matters:**
Redundant O(n) computation with ~250K trig operations for a max-size track. While small compared to the export itself, it's wasteful and inconsistent with the pattern used for `normalizedScenes` (passed in pre-computed).

**Suggested fix:**
Accept an optional `cumulDist` parameter in `exportVideo`. Compute only if not provided.

**Confidence:** High

---

### C5-AGG-003 — LOW — `formatDuration` does not guard `NaN`/`Infinity` input

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `src/lib/interpolate.ts:179` — `if (seconds < 0) seconds = 0`

**Why it matters:**
If `NaN` or `Infinity` is passed, the function returns broken output like `NaN:NaN:NaN`.

**Suggested fix:**
Change guard to `if (!Number.isFinite(seconds) || seconds < 0) seconds = 0`.

**Confidence:** High

---

### C5-AGG-004 — MEDIUM — Worker `parseSemanticSegments` uses `var` declarations instead of `const`/`let`

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `public/workers/trackParser.worker.js:116-128` — `var afterPathLen`, `var visit`, `var m`, `var lat`, `var lng`

**Why it matters:**
`var` is function-scoped and hoisted, which is a well-known source of bugs in `for` loop bodies. The main-thread `parser.ts` correctly uses `const`/`let`. The inconsistency could confuse maintainers and introduces latent scoping risk if the loop is ever restructured.

**Suggested fix:**
Convert `var` to `const`/`let` in the worker's `parseSemanticSegments` to match the main-thread parser.

**Confidence:** High

---

### C5-AGG-005 — LOW — Worker and main-thread `parseSemanticSegments` use inconsistent boundary-check style

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `public/workers/trackParser.worker.js:125` — `Math.abs(lat) <= 90 && Math.abs(lng) <= 180`
- `src/lib/parser.ts:305` — `Math.abs(lat) > 90 || Math.abs(lng) > 180`

**Why it matters:**
Both checks are semantically equivalent (both accept boundary values), but the worker uses whitelist style (`<=`) while the main-thread uses blacklist style (`>`). Inconsistency can confuse maintainers.

**Suggested fix:**
Normalize the worker to use the same `> 90` / `> 180` pattern as the main-thread parser.

**Confidence:** High (cosmetic, not a bug)

---

### C5-AGG-006 — LOW — `JourneyCreator` search error message could be clearer about coordinate-only limitation

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `src/components/JourneyCreator.tsx:446-463` — `runSearch` only parses coordinate queries
- `src/components/JourneyCreator.tsx:457` — shows `journey.searchInvalid` for non-coordinate text

**Why it matters:**
Users typing place names get "Invalid coordinates" which is confusing when the UI invites free-text input.

**Suggested fix:**
Update the error message to explicitly say coordinate input is required, or add a helper text below the search input.

**Confidence:** High

---

### C5-AGG-007 — LOW — `Controls` component `totalDistance` memo depends on `track` object reference

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `src/components/Controls.tsx:42` — `useMemo(() => totalDistance(...), [track])`

**Why it matters:**
If `track` is a new object reference on each render (e.g., from slicing), the memo recomputes unnecessarily. This is O(n) haversine work per render.

**Suggested fix:**
Use `track.points` and `track.segmentStartIndices` as memo dependencies, or accept `cumulativeDistances` as a prop and derive total distance from the last element.

**Confidence:** Medium

---

### C5-AGG-008 — LOW — Export overlay and file-upload spinners leave a broken-looking static circle under `prefers-reduced-motion`

**Cross-agent agreement:** cycle5-comprehensive
**Primary locations:**
- `src/app/page.tsx:319` — `animate-spin` on export overlay spinner
- `src/components/FileUpload.tsx:152` — `animate-spin` on loading spinner
- `src/app/globals.css:38` — `prefers-reduced-motion` sets `animation-duration: 0.01ms`

**Why it matters:**
With reduced motion, the spinner freezes mid-rotation showing a partial circle with one transparent border edge. This looks broken rather than intentionally static.

**Suggested fix:**
In the `prefers-reduced-motion` media query, replace the spinner with a static loading indicator or a "Loading..." text.

**Confidence:** Medium

---

## Carried-forward deferred items (not re-opened this cycle)

These remain in their existing files and are NOT scheduled for this cycle:

From `deferred-findings-cycle2-2026-04-19.md`:
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

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on, wasting GPU resources

## Items verified as already fixed or not actual issues

| Prior ID | Description | Why closed |
|----------|-------------|------------|
| C5-004 | MapView animation effect depends on stable callbacks | `addTrackLayers` and `ensureMarker` are stable `useCallback([])` — not a current bug, latent risk too low to schedule |
| C5-005 | SceneRangeEditor keyboard step is 1% | Subjective UX preference, not a bug |
| C5-006 | GoogleGuide tab reset flash | Too brief to notice, not worth the complexity |
| C5-009 | Debug window exposed via URL param in production | Intentional feature for production debugging, not a security issue (read-only, non-sensitive) |
| C5-012 | TrackToolbar mobile menu focus trapping | Enhancement beyond current a11y scope, deferred |
| C5-014 | ErrorBoundary reset recurrence | Standard React pattern, low priority UX |

## Recommended implementation order for this cycle
1. **C5-AGG-001 (MEDIUM)**: Fix `downloadVideo` fallback `<a>` removal timing — download reliability
2. **C5-AGG-004 (MEDIUM)**: Convert worker `var` to `const`/`let` — code quality, latent bug risk
3. **C5-AGG-005 (LOW)**: Normalize worker boundary-check style — consistency
4. **C5-AGG-002 (LOW)**: Accept optional `cumulDist` in `exportVideo` — performance
5. **C5-AGG-003 (LOW)**: Guard `NaN`/`Infinity` in `formatDuration` — robustness
6. **C5-AGG-006 (LOW)**: Improve JourneyCreator search error message — UX clarity
7. **C5-AGG-007 (LOW)**: Fix Controls `totalDistance` memo dependency — performance
8. **C5-AGG-008 (LOW)**: Fix reduced-motion spinner appearance — a11y
