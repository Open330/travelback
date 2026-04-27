# Cycle 4 Implementation Plan — 2026-04-27

Based on cycle 4 aggregate review at `.context/reviews/_aggregate.md`.
35 deduplicated findings (1 HIGH, 1 MEDIUM-HIGH, 17 MEDIUM, 16 LOW, 9 CLOSED).

## Status of prior plan items (cycle3-implementation-2026-04-27.md)

| Item | Finding | Prior status | Current status | Commit |
|------|---------|-------------|----------------|--------|
| 3P01 | C3-05 (scene editor aria) | RESOLVED | RESOLVED | 11fb8da |
| 3P02 | C3-25 (parser unit tests) | RESOLVED | RESOLVED | 8d48131 |
| 3P03 | C3-12 (waitForIdle required) | RESOLVED | RESOLVED | 5eefd24 |
| 3P04 | C3-15/24 (ESLint t dep) | RESOLVED | RESOLVED | 1b33835 |
| 3P05 | C3-17 (test stub JSDoc) | RESOLVED | RESOLVED | (already present) |
| 3P06 | C3-20 (playback timer unmount) | RESOLVED | RESOLVED | (mountedRef check) |
| 3P07 | C3-23 (initial trail geometry) | RESOLVED | RESOLVED | ae0407a |

## New plan items from cycle 4 reviews

---

### 4P01 — Extract `wrapLngNear` to `interpolate.ts` (C4-01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:120-125, 146-151, 1030-1035`, `src/lib/interpolate.ts`
- **Fix:**
  1. Add `export function wrapLngNear(referenceLng: number, nextLng: number): number` to `src/lib/interpolate.ts`
  2. Import `wrapLngNear` in `MapView.tsx`
  3. Replace the three inline `wrapLngNear` definitions in MapView with the imported version
  4. Verify all existing tests still pass
- **Effort:** Small
- **Status:** DONE (92abc61)

---

### 4P02 — Fix reference grid paint properties on style change (C4-04)

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:382-424`
- **Fix:**
  1. In `addReferenceGridLayers`, after updating the source data, also update the paint properties of existing layers using `map.setPaintProperty()`
  2. Update `REFERENCE_GRID_MINOR_LAYER` line-color to `gridPaint.minor`
  3. Update `REFERENCE_GRID_MAJOR_LAYER` line-color to `gridPaint.major`
- **Effort:** Small
- **Status:** DONE (33ad683)

---

### 4P03 — Make `downloadVideo` blob param required (C4-13)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:204-244`
- **Fix:**
  1. Change `blob?: Blob` to `blob: Blob` in the `downloadVideo` function signature
  2. Remove the `blob ??` fallback from `const writeBlob = blob ?? await (await fetch(url)).blob()`
  3. Verify the caller (`useExportController.ts:191`) always provides `blob`
- **Effort:** Tiny
- **Status:** DONE (63a8b12)

---

### 4P04 — Cache `getBoundingClientRect` width in SceneRangeEditor drag (C4-14)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:94-101, 104-149`
- **Fix:**
  1. In `startDrag`, capture `containerRef.current.getBoundingClientRect().width` into a ref (e.g., `dragWidthRef`)
  2. In `onPointerMove`, use `dragWidthRef.current` instead of reading `getBoundingClientRect().width` every frame
  3. Reset `dragWidthRef.current` to 0 on drag end
- **Effort:** Tiny
- **Status:** DONE (491a644)

---

### 4P05 — Update architecture doc with missing layer and fast path (C4-17)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `.context/project/02-architecture.md`
- **Fix:**
  1. Add `current-position` / `current-position-layer` to the Map Layers table
  2. Add note about `renderFrameAndWait` identical-state fast path and 5s timeout in the Export Pipeline section
- **Effort:** Tiny
- **Status:** DONE (a4ba2b1)

---

### 4P06 — Add GPX/KML parser tests (C4-02)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.test.ts`
- **Fix:**
  1. Import `parseTrackFile` (or test `parseGPX`/`parseKML` directly if `DOMParser` available in jsdom)
  2. Add GPX test fixture with multi-segment track
  3. Add GPX test fixture with elevation and time
  4. Add KML test fixture with LineString
  5. Add KML test fixture with MultiGeometry
  6. Add test for `parseTrackFile` file size limits (JSON, XML)
  7. Add test for `preflightXml` DOCTYPE rejection
  8. Add test for XML nesting depth limit
- **Effort:** Medium
- **Status:** DONE (11499fb)

---

### 4P07 — Add MapLibre focus-visible CSS override (C4-L11)

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/app/globals.css`
- **Fix:**
  1. Add CSS rule for `.maplibregl-ctrl button:focus-visible` with outline matching the app's focus style
- **Effort:** Tiny
- **Status:** DONE (7072918)

---

### 4P08 — Fix `handleRangeChange` segment index remapping (C4-15)

- **Severity:** MEDIUM
- **Confidence:** Medium
- **Files:** `src/app/page.tsx:304-311`
- **Fix:**
  1. When remapping `segmentStartIndices`, ensure that a segment starting at exactly `startIdx` maps to index 0, which is then filtered by `normalizeSegmentStarts` (which requires `index > 0`)
  2. This is arguably correct behavior (a segment boundary at the first point is meaningless), but add a comment documenting this design decision
  3. If preserving segment boundaries at trim start is desired, change the filter in `normalizeSegmentStarts` to allow 0 when it comes from a trim operation (but this would require a flag)
- **Effort:** Tiny (add comment)
- **Status:** DONE (1e154a2)

---

## Deferred findings (unchanged from cycle 3)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| C3-03 | Google parser duplication | Large refactor requiring worker build changes | Extract shared module |
| C3-06 | Scene normalization mutates intent | Product decision on undo/versioning | Store raw scenes |
| C3-07 | Map layer ownership | Architectural refactor | Replace getMap() with overlay APIs |
| C3-08 | Session state coupling | Requires `useTrackSessionController` reducer | Extract session reducer |
| C3-09 | Export memory guard | Needs mobile-specific investigation | Lower limit for mobile |
| C3-10 | Worker crash 16MB fallback | Known browser limitation | Accept or raise threshold |
| C3-11 | Mobile dialog semantics | Accessibility fix, not correctness | Reuse ModalDialog |
| C3-13 | No test for isExporting guard | Requires component test infrastructure | Add after parser tests |
| C3-14 | isExporting implicit contract | Architectural pattern | Consider state machine |
| C3-16 | ExportError consistency | Low priority, pattern already established | Already uses ExportError |
| C3-18 | Trail update strategy split | Low risk, needs test coverage | Add parity test |
| C3-19 | RTL unreadiness | No RTL locales currently | Set dir attribute |
| C4-03 | Hook tests (useExportController/usePlaybackController) | Large effort, requires test infra setup | Add after parser tests |
| C4-16 | Map validity after waitForIdle | Needs investigation of failure mode | Add canvas null check in frame loop |

## New deferred findings (cycle 4)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| C4-05 | Mobile dialog semantics (C3-11) | Deferred from cycle 3 | Reuse ModalDialog |
| C4-06 | Scene normalization mutates intent (C3-06) | Deferred from cycle 3 | Store raw scenes |
| C4-07 | Map layer ownership (C3-07) | Deferred from cycle 3 | Replace getMap() with overlay APIs |
| C4-08 | Session state coupling (C3-08) | Deferred from cycle 3 | Extract session reducer |
| C4-L01 | addTrackLayers empty deps comment | Very low priority | Add inline comment |
| C4-L02 | ExportError/ParseError shared base | Very low priority | Extract CodedError base |
| C4-L03 | normalizeWaypoint drops ele/time | Intentional for manual journeys | No fix needed |
| C4-L04 | checkJsonDepth unicode escapes | Low risk, worker path only | Add \u handling |
| C4-L05 | Trail Feature wrapper per-frame alloc | Low GC pressure | Reuse Feature object |
| C4-L06 | precomputedWrappedSegments memory | Intentional trade-off | No fix needed |
| C4-L07 | Worker URL from basePath | Build-time constant, adequate | No fix needed |
| C4-L08 | worker-src in CSP | Covered by script-src 'self' | Add explicit directive |
| C4-L09 | GPX ignores waypoints when tracks exist | Design decision | Document behavior |
| C4-L10 | Worker message contract | Documentation only | Add comment |
| C4-L12 | reduced-motion doesn't reduce camera | Feature enhancement | Check media query |
| C4-L13 | Error boundary only page reload | Feature enhancement | Add Try Again button |
| C4-L14 | SceneRangeEditor drag state leak | Edge case, pointercancel/blur | Add listeners |
| C4-L15 | generateDefaultScenes non-unique IDs | Not a practical issue | Use generateId() |
| C4-L16 | Reference grid recomputed on track ref | Mostly correct, minor | Key on points instead |

## Implementation order

1. **4P01** — Extract `wrapLngNear` to interpolate.ts (MEDIUM, small)
2. **4P03** — Make `downloadVideo` blob param required (MEDIUM, tiny)
3. **4P04** — Cache getBoundingClientRect width in drag (MEDIUM, tiny)
4. **4P02** — Fix reference grid paint properties (MEDIUM, small)
5. **4P07** — MapLibre focus-visible CSS override (LOW, tiny)
6. **4P08** — Document handleRangeChange segment index behavior (MEDIUM, tiny)
7. **4P05** — Update architecture doc (MEDIUM, tiny)
8. **4P06** — Add GPX/KML parser tests (MEDIUM, medium)

## Quality gates

After each commit:
- `npm run lint` — must pass (0 errors)
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npx vitest run` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji
