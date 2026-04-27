# Cycle 10 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review lanes completed

Completed and persisted per-agent reviews:

- `cycle10-code-reviewer-2026-04-27.md` — 5 findings (1 LOW-MEDIUM, 4 LOW)
- `cycle10-perf-reviewer-2026-04-27.md` — 2 findings (1 LOW-MEDIUM, 1 LOW)
- `cycle10-security-reviewer-2026-04-27.md` — 0 findings (clean)
- `cycle10-critic-2026-04-27.md` — 3 findings (1 LOW-MEDIUM, 2 LOW)
- `cycle10-verifier-2026-04-27.md` — 1 finding (1 LOW)
- `cycle10-test-engineer-2026-04-27.md` — 2 findings (1 LOW-MEDIUM, 1 LOW)
- `cycle10-tracer-2026-04-27.md` — 2 findings (1 LOW-MEDIUM, 1 LOW)
- `cycle10-architect-2026-04-27.md` — 2 findings (1 LOW-MEDIUM, 1 LOW)
- `cycle10-debugger-2026-04-27.md` — 2 findings (2 LOW)
- `cycle10-designer-2026-04-27.md` — 2 findings (2 LOW)
- `cycle10-document-specialist-2026-04-27.md` — 0 findings (clean)

Total: 21 raw findings across 11 reviewers.

## Deduplicated findings

Severity/confidence preserves the highest level reported by any lane. "Agreement" lists lanes that independently flagged the same or overlapping issue.

---

### C10-F01 — `handleLoadSample` closes over `t` directly (inconsistent with tRef pattern)

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:369-392`
- **Agreement:** code-reviewer (C10-CR-01), critic (C10-CT-01), tracer (C10-T-01), architect (C10-ARCH-01)
- **Detail:** After C8-F02 and C9-F04 systematically replaced `t` with `tRef` in `useExportController` and `loadTrackIntoSession`, `handleLoadSample` remains the one callback in `page.tsx` that closes over `t` directly. It includes `t` in its dependency array, causing unnecessary re-creation on locale changes.
- **Failure scenario:** When locale changes, `handleLoadSample` is recreated, causing `FileUpload` to re-render even when no sample load is in progress.
- **Suggested fix:** Use `tRef.current('app.sampleLoadFailed')` inside the callback and remove `t` from deps.

---

### C10-F02 — Duplicated track-slicing logic between `handleRangeChange` and `confirmTrimClear`

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed
- **Files:** `src/app/page.tsx:298-330, 332-355`
- **Agreement:** code-reviewer (C10-CR-02), critic (C10-CT-02), tracer (C10-T-02), architect (C10-ARCH-02)
- **Detail:** The track-slicing, segment-remapping, and filtered-track construction logic is copy-pasted between `handleRangeChange` and `confirmTrimClear`. The two differ only in that `confirmTrimClear` first clears scenes and `handleRangeChange` short-circuits when scenes exist.
- **Failure scenario:** A future fix to segment remapping in one path but not the other introduces behavioral drift.
- **Suggested fix:** Extract shared `buildFilteredTrack(fullTrack, startIdx, endIdx)` helper.

---

### C10-F03 — `buildTrackGeometry` fallback generates invalid GeoJSON when segments is empty

- **Severity:** LOW
- **Confidence:** High
- **Status:** Confirmed (latent)
- **Files:** `src/components/MapView.tsx:176-179`
- **Agreement:** code-reviewer (C10-CR-03), debugger (C10-DBG-01)
- **Detail:** When `segments` is empty, the fallback `buildWrappedCoordinates(points.slice(0, 1))` produces either an empty or single-point LineString coordinates array, which is invalid per the GeoJSON RFC 7946. MapLibre tolerates this but logs a console warning.
- **Failure scenario:** Console warning on degenerate tracks. Not user-visible currently because the parser enforces >= 2 valid points.
- **Suggested fix:** Return `{ type: 'LineString', coordinates: [] }` when `segments.length === 0`.

---

### C10-F04 — Export progress throttling uses absolute delta instead of time-based interval

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Status:** Likely
- **Files:** `src/lib/useExportController.ts:202-204`
- **Agreement:** perf-reviewer (C10-P-01)
- **Detail:** The export playback progress update is throttled when `nextProgress - exportProgressRef.current >= 0.02`. Since progress is linear in frames, the throttle fires more frequently for short exports and less for long ones. A time-based throttle would provide consistent ~10 Hz UI updates.
- **Failure scenario:** Short exports may have fewer progress updates than expected; long exports may have more. Not a user-facing bug but inconsistent UX timing.
- **Suggested fix:** Replace absolute-delta throttle with `performance.now()` based interval (100ms = 10 Hz).

---

### C10-F05 — Export progress bar `aria-valuenow` not defensively clamped

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/ExportPanel.tsx:295`
- **Agreement:** verifier (C10-V-01), debugger (C10-DBG-02)
- **Detail:** `aria-valuenow={Math.round(exportProgress * 100)}` could theoretically exceed 100 if `exportProgress` exceeds 1.0. Currently safe because the video encoder clamps progress, but no defensive guard exists at the display layer.
- **Suggested fix:** `aria-valuenow={Math.min(100, Math.round(exportProgress * 100))}`.

---

### C10-F06 — No unit test for antimeridian-crossing tracks

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/interpolate.test.ts`, `src/lib/camera.test.ts`
- **Agreement:** test-engineer (C10-TE-01)
- **Detail:** The `wrapLngNear`, `shortestLngDelta`, `buildFitBounds`, and `buildTrackGeometry` functions all have explicit antimeridian handling, but no unit test exercises tracks that cross the +-180 longitude boundary.
- **Failure scenario:** A refactor to antimeridian handling breaks silently because no test exercises those paths.
- **Suggested fix:** Add antimeridian-crossing test fixtures and test cases.

---

### C10-F07 — No unit test for segment-remapping in trimmed tracks

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:310-326`
- **Agreement:** test-engineer (C10-TE-02)
- **Detail:** The segment-start-index remapping logic in `handleRangeChange` (and duplicated in `confirmTrimClear`) is only tested through E2E. It should be extracted and unit-tested.
- **Failure scenario:** A change to the remapping logic breaks segment boundaries for trimmed tracks without being caught by E2E.
- **Suggested fix:** Extract `buildFilteredTrack` and add unit tests.

---

### C10-F08 — Export panel swipe-to-dismiss has no visual affordance on mobile

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:111-127`
- **Agreement:** designer (C10-D-01)
- **Detail:** The export panel supports a vertical swipe-to-dismiss gesture but provides no visual indicator (drag handle, chevron, hint text) that this gesture is available.
- **Suggested fix:** Add a subtle drag handle at the top of the modal panel for touch devices.

---

### C10-F09 — File upload drop zone is focusable via `tabIndex={-1}` with no keyboard action or ARIA label

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/FileUpload.tsx:175`
- **Agreement:** designer (C10-D-02)
- **Detail:** The drag-and-drop area has `tabIndex={-1}` making it focusable, but no keyboard action is provided. Screen-reader users may encounter a focusable element with no indication of its purpose.
- **Suggested fix:** Either remove `tabIndex={-1}` from the drop zone or add `aria-label` indicating it is a drop zone for mouse/touch users.

---

### C10-F10 — `computeCumulativeDistances` recomputed redundantly for trimmed tracks

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:158-168`
- **Agreement:** perf-reviewer (C10-P-02)
- **Detail:** When a track is trimmed (track !== fullTrack), cumulative distances are recomputed from scratch via O(n) haversine, even when the trim preserves most points.
- **Failure scenario:** Trimming a 250K-point track to 249K points recomputes all 249K distances unnecessarily. Minor since trim is user-initiated.
- **Suggested fix:** Consider slice-based reuse: if the trim starts at index 0, offset the full distances. Full optimization may not be worth the code complexity.

---

## Verified already-fixed (confirmed this cycle)

| ID | Original Severity | Verification |
|----|------------------|-------------|
| C9-F01 | MEDIUM | ElevationProfile SVG focus-visible confirmed at line 100 |
| C9-F02 | LOW-MEDIUM | Export progress bar ARIA progressbar role confirmed at line 295 |
| C9-F03 | LOW | toLocaleString(locale) confirmed at lines 127, 135 |
| C9-F04 | LOW | tRef in loadTrackIntoSession confirmed at line 284 |

## Carried forward (still open, not newly addressed)

| ID | Severity | Note |
|----|----------|------|
| AG6-05 | LOW-MEDIUM | Worker message validation |
| AG6-09 | LOW-MEDIUM | Bootstrap regex comments |
| AG6-10 | LOW | Unsafe type casts |
| AG6-11 | LOW | Stale frame logging |
| AG6-12 | LOW | Grid memo optimization |
| AG6-13 | LOW-MEDIUM | Buffer copy optimization |
| AG6-14 | LOW-MEDIUM | Normalization warnings specificity |
| AG6-15 | LOW-MEDIUM | Export progress bar transition |
| AG6-16 | LOW | Toast z-index overlap |
| AG6-17 | LOW | README accuracy |
| AG6-18 | MEDIUM | Camera unit test coverage |
| AG6-19 | MEDIUM | DEFERRED — architectural refactor |
| C7-F06 | LOW | ElevationProfile SVG click padding (latent) |
| C7-F07 | LOW | handleSearchSubmit guard (latent) |
| C8-F03 | LOW | SceneEditor locale cascade (optimization) |

## Finding count summary

| Severity | Count |
|----------|-------|
| LOW-MEDIUM | 3 (C10-F01, C10-F04, C10-F06) |
| LOW | 7 (C10-F02, C10-F03, C10-F05, C10-F07, C10-F08, C10-F09, C10-F10) |
| **Total** | **10** |

## Actionable this cycle

C10-F01 (low-medium — use tRef in handleLoadSample), C10-F02 (low — extract buildFilteredTrack), C10-F03 (low — fix degenerate GeoJSON fallback), C10-F05 (low — clamp aria-valuenow), C10-F04 (low-medium — time-based export throttle)
