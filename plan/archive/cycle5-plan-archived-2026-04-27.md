# Cycle 5 Implementation Plan — 2026-04-27

Based on cycle 5 aggregate review findings (`.context/reviews/_aggregate.md`).

## Priority classification

### Must-fix this cycle (correctness, data-loss, user-facing bugs)

1. **CF5-01** — Export produces blank video after map unmount (HIGH)
2. **CF5-03** — Export "done" state persists stale video from previous track (MEDIUM-HIGH)
3. **CF5-04** — MapView cumulDistRef race condition on track change (MEDIUM-HIGH)
4. **CF5-07** — `window.confirm()` instead of ModalDialog (MEDIUM)
5. **CF5-11** — Timeline trim silently fails when <2 points (MEDIUM)
6. **CF5-06** — Debug API exposed in production on localhost (MEDIUM)
7. **CF5-15** — `checkJsonDepth` depth counter can go negative (LOW)
8. **CF5-17** — `generateId()` fallback non-unique IDs (LOW)
9. **CF5-18** — JourneyCreator re-implements `wrapLngNear` (LOW)
10. **CF5-16** — `stripXmlEntities` dead code after preflightXml (LOW)

### Should-fix this cycle (performance, UX, test gaps)

11. **CF5-02** — Trail geometry O(n) per frame, only update on segment change (HIGH — carried from cycle2)
12. **CF5-05** — Add unit tests for `computeCameraForProgress` (MEDIUM-HIGH)
13. **CF5-08** — Mobile menu focus trap (MEDIUM — carried from cycle2)
14. **CF5-09** — Pause mesh animation during export (MEDIUM — carried from cycle2)
15. **CF5-10** — Export progress bar CSS transition lag (LOW-MEDIUM)
16. **CF5-12** — Duplicate computeCumulativeDistances when track===fullTrack (MEDIUM)
17. **CF5-13** — Scene editor stale normalization warnings (MEDIUM — carried from cycle2)
18. **CF5-19** — Toast overlaps controls on small viewports (LOW-MEDIUM)

### Defer (architectural, requires design, or low impact)

- **CF5-14** — Export pipeline unified error model (MEDIUM) — requires design decision
- **CF5-20** — Harden script documentation (LOW-MEDIUM) — documentation-only, low risk

---

## Implementation tasks

### Task 1: Fix export blank video on map unmount (CF5-01)

**Files:** `src/lib/useExportController.ts`, `src/components/MapView.tsx`

- [ ] Abort `exportAbortRef.current` in the unmount cleanup effect of `useExportController`
- [ ] In `renderFrameAndWait`, reject the promise instead of resolving when `map` is null
- [ ] In the export loop, add a map validity check before each frame capture
- [ ] Test: start export, unmount component, verify abort triggers and no blank video produced

### Task 2: Fix export "done" state persisting stale video (CF5-03)

**Files:** `src/lib/useExportController.ts`

- [ ] Clear `exportedVideoUrl`, `exportedVideoBlob`, `exportedVideoFilename` at the start of each `exportTrack` call (before setting `isExporting`)
- [ ] Test: export track A, load track B, export track B fails, verify "done" state is not shown with track A's video

### Task 3: Fix MapView cumulDistRef race condition (CF5-04)

**Files:** `src/components/MapView.tsx`

- [ ] Add guard in progress effect: if `cumulDistRef.current.length === 0` or `cumulDistRef.current.length !== track.points.length`, skip interpolation
- [ ] Consider updating `cumulDistRef.current` synchronously when the track prop changes (in the same render cycle)

### Task 4: Replace `window.confirm()` with ModalDialog (CF5-07)

**Files:** `src/app/page.tsx`

- [ ] Add `showTrimConfirm` state variable
- [ ] Add `pendingTrimRange` ref to store the range that was attempted
- [ ] Replace `window.confirm()` with `ModalDialog` component
- [ ] On confirm: clear scenes and apply the trim. On cancel: close the dialog.

### Task 5: Add minimum range guard to TimelineSelector (CF5-11)

**Files:** `src/components/TimelineSelector.tsx`

- [ ] In `clampRatios`, ensure the minimum gap always produces at least 2 points in the resulting slice
- [ ] Compute `minGap` based on `1 / (points.length || 1)` which is already there, but add a secondary check
- [ ] Alternatively: show a brief toast when a trim attempt would result in <2 points

### Task 6: Restrict debug API to development-only (CF5-06)

**Files:** `src/components/MapView.tsx`

- [ ] Remove the `isLocalDebugHost && (debugParams || debugStorageEnabled)` condition
- [ ] Keep only `process.env.NODE_ENV === 'development'` as the gate
- [ ] Remove the `localStorage.travelback-debug` and `__travelbackDebug` URL parameter paths

### Task 7: Fix parser edge cases (CF5-15, CF5-16)

**Files:** `src/lib/parser.ts`

- [ ] Add `if (depth < 0) throw new ParseError('Invalid JSON structure', 'INVALID_GOOGLE_JSON')` after the depth decrement in `checkJsonDepth`
- [ ] Reorder `parseXml`: call `stripXmlEntities` before `preflightXml`, so stripping happens first and the preflight check validates the stripped result
- [ ] Add a comment documenting the defense-in-depth relationship between the two functions

### Task 8: Fix `generateId()` fallback uniqueness (CF5-17)

**Files:** `src/types.ts`

- [ ] Add a module-level counter: `let idCounter = 0`
- [ ] Update fallback: `${Date.now()}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2)}`

### Task 9: Import shared `wrapLngNear` in JourneyCreator (CF5-18)

**Files:** `src/components/JourneyCreator.tsx`

- [ ] Add `wrapLngNear` to the import from `@/lib/interpolate`
- [ ] Remove the local `wrapLngNear` closure in `buildLineGeoJSON`
- [ ] Use the imported function directly

### Task 10: Throttle trail geometry updates to segment-index changes (CF5-02)

**Files:** `src/components/MapView.tsx`

- [ ] Track `lastSegmentIndex` in a ref
- [ ] In the progress effect, only call `trailSource.setData()` when `segmentIndex !== lastSegmentIndex.current`
- [ ] Always update marker position (single-point update is cheap)
- [ ] Update `lastSegmentIndex.current` after trail update

### Task 11: Add unit tests for `computeCameraForProgress` (CF5-05)

**Files:** `src/lib/camera.test.ts`

- [ ] Test single scene playback at 0%, 50%, 100%
- [ ] Test two scenes with transition blending at the boundary
- [ ] Test gap between scenes (interpolation)
- [ ] Test progress before first scene
- [ ] Test progress after last scene
- [ ] Test zero-duration scene (degenerate case)
- [ ] Test overlapping scenes after normalization

### Task 12: Add focus trap to mobile "more controls" menu (CF5-08)

**Files:** `src/components/TrackToolbar.tsx`

- [ ] When menu is open, trap Tab/Shift+Tab within the menu panel
- [ ] On Escape, close menu and restore focus to trigger button
- [ ] Consider downgrading `role="dialog"` to `role="menu"` if modal behavior isn't appropriate

### Task 13: Pause mesh animation during export (CF5-09)

**Files:** `src/app/layout.tsx`, `src/styles/vitro-base.css`

- [ ] Add a CSS rule: `[data-travelback-exporting="true"] .mesh-bg { animation-play-state: paused !important }`
- [ ] In `page.tsx`, set `data-travelback-exporting` on the root element when `isExporting` is true
- [ ] Remove the attribute when export completes

### Task 14: Fix export progress bar CSS transition (CF5-10)

**Files:** `src/components/ExportPanel.tsx`

- [ ] Change `transition: 'width .3s linear'` to `transition: isExporting ? 'width .05s linear' : 'width .3s linear'`
- [ ] This reduces lag during active export while maintaining smooth appearance

### Task 15: Deduplicate computeCumulativeDistances (CF5-12)

**Files:** `src/app/page.tsx`

- [ ] When `track === fullTrack`, reuse `fullTrackCumulativeDistances` instead of recomputing
- [ ] Adjust the `useMemo` dependency array accordingly

### Task 16: Fix scene editor stale normalization warnings (CF5-13)

**Files:** `src/components/SceneEditor.tsx`

- [ ] Move the "start >= end" check to happen BEFORE `normalizeScenes`
- [ ] If a scene has start >= end, show "Scene X will be removed" instead of "has start >= end"
- [ ] After normalization, only show the "ranges adjusted" warning if scenes actually changed

### Task 17: Fix toast overlapping controls (CF5-19)

**Files:** `src/components/Toast.tsx`

- [ ] When a track is loaded, position toasts above the controls area (e.g., `bottom: 12rem` instead of default)
- [ ] Accept a `hasTrack` prop or use a CSS variable to adjust positioning

---

## Deferred items

### D5-01 — Export pipeline unified error model (CF5-14)

- Original severity/confidence: MEDIUM / High
- Citation: `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/components/MapView.tsx`
- Reason for deferral: Requires architectural design decision (error hierarchy shape, codes, i18n mapping). Not a confirmed runtime defect — the current string-based classification works but is fragile. Implementing correctly needs a focused design pass.
- Exit criterion: Reopen before any export pipeline refactor, before adding new error types to videoEncoder, or when a new error code is not properly surfaced in the UI.

### D5-02 — Harden script security rationale documentation (CF5-20)

- Original severity/confidence: LOW-MEDIUM / High
- Citation: `scripts/harden-static-export.mjs`
- Reason for deferral: Documentation-only, no runtime impact. The script is functional and correct. Adding inline docs is a quality improvement but not a correctness fix.
- Exit criterion: Reopen when modifying the hardening script, when onboarding new contributors, or when a security audit is planned.

---

## Progress tracking

| Task | Finding | Status | Commit |
|-------|---------|--------|--------|
| 1 | CF5-01 | pending | — |
| 2 | CF5-03 | pending | — |
| 3 | CF5-04 | pending | — |
| 4 | CF5-07 | pending | — |
| 5 | CF5-11 | pending | — |
| 6 | CF5-06 | pending | — |
| 7 | CF5-15, CF5-16 | pending | — |
| 8 | CF5-17 | pending | — |
| 9 | CF5-18 | pending | — |
| 10 | CF5-02 | pending | — |
| 11 | CF5-05 | pending | — |
| 12 | CF5-08 | pending | — |
| 13 | CF5-09 | pending | — |
| 14 | CF5-10 | pending | — |
| 15 | CF5-12 | pending | — |
| 16 | CF5-13 | pending | — |
| 17 | CF5-19 | pending | — |
