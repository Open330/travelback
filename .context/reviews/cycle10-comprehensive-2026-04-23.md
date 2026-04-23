# Cycle 10 Comprehensive Deep Code Review (2026-04-23)

**Reviewer:** Multi-angle analysis (code quality, performance, security, accessibility, correctness, UX)
**Scope:** All 28 source files, e2e tests, configuration files

---

## New Findings

### C10-F1 — MEDIUM / HIGH — ElevationProfile SVG uses duplicate gradient/clip IDs across React strict mode

**File:** `src/components/ElevationProfile.tsx:105-116`
**Issue:** The component uses `useId()` to generate unique `gradientId` and `clipId`, which is correct. However, `clipId` is used in a `<clipPath>` element (line 115) that is scoped inside the SVG. If two `ElevationProfile` instances were ever mounted simultaneously (e.g., in a future split-view), the `useId()` approach would work correctly since React guarantees unique IDs. **No action needed** — this is actually correct as-is. Downgrading.

**Revised severity:** INFO / HIGH — Already correctly uses `useId()`. No fix needed.

---

### C10-F2 — MEDIUM / HIGH — ExportPanel fps select doesn't enforce EXPORT_LIMITS

**File:** `src/components/ExportPanel.tsx:330-337`
**Issue:** The FPS `<select>` offers values 24, 30, 60, 90, 120. While `EXPORT_LIMITS.fps.max` is 120, if this constant were ever lowered, the hardcoded `<option>` values would still allow selecting 120. The `handleExport` callback does clamp via `EXPORT_LIMITS`, so this is not a correctness bug, but the UI would show a value that gets silently clamped on export — a minor UX inconsistency.

More importantly, `handleExport` clamps fps (line 134-135) but the fps `<select>` doesn't show the clamped value back to the user. If someone had fps=120 selected and `EXPORT_LIMITS.fps.max` were lowered to 60, the UI would still show "120" while the export uses 60.

**Fix:** The fps select options should be filtered against `EXPORT_LIMITS.fps.max` to only show valid values. This is forward-compatible.

**Severity:** LOW / HIGH — Minor UX inconsistency with no current functional impact since 120 <= 120.

---

### C10-F3 — MEDIUM / MEDIUM — useExportController does not reset map size on abort

**File:** `src/lib/useExportController.ts:175-208`
**Issue:** When the export is aborted (user clicks Cancel), the `finally` block tries to `resetSize()` and then `waitForIdle()`. However, the `waitForIdle()` call is guarded by `!abortController.signal.aborted` (line 196), so when the export IS aborted, the map container is resized back to normal but the map may not have settled, potentially leaving the map in a partially rendered state with stale tiles at the new (original) viewport. This is a known trade-off documented in the code comments.

**Severity:** LOW / MEDIUM — Cosmetic-only; the map recovers on next interaction. Already documented in code.

---

### C10-F4 — MEDIUM / HIGH — Toast `role="log"` with `aria-live` may cause duplicate announcements

**File:** `src/components/Toast.tsx:67-68`
**Issue:** The Toast container uses `role="log"` with `aria-live`. According to WAI-ARIA, `role="log"` already implies `aria-live="polite"`. Setting `aria-live` explicitly on a `log` role is technically redundant and could cause double announcements in some screen readers. The ARIA spec says live region properties on a `log` role override the default, but the combination is unusual.

**Fix:** Remove the explicit `aria-live` attribute when `role="log"` is used, or switch to `role="status"` / `role="alert"` with appropriate `aria-live`. Alternatively, remove `role="log"` and keep `aria-live` only.

**Severity:** LOW / HIGH — Accessibility best practice. Some screen readers may double-announce.

---

### C10-F5 — MEDIUM / HIGH — GoogleGuide tabs missing `tabIndex` on panel

**File:** `src/components/GoogleGuide.tsx:334`
**Issue:** The tabpanel `div` has `tabIndex={0}` which is correct for focus management. However, the `role="tabpanel"` element doesn't have a `aria-label` or `aria-labelledby` pointing to the active tab. WAI-ARIA best practice for tab panels requires `aria-labelledby` pointing to the controlling tab's ID. The tab buttons have `id={`${tabsId}-tab-${i}`}` and the panels have `aria-labelledby={`${tabsId}-tab-${tab}`}` which is correct. **No issue found after re-inspection.**

**Revised severity:** INFO / HIGH — Already correctly implemented.

---

### C10-F6 — MEDIUM / MEDIUM — ModalDialog openModalStack is a module-level mutable array

**File:** `src/components/ModalDialog.tsx:31-32`
**Issue:** `openModalStack` and `lockedBodyOverflow` are module-level variables. If two separate React trees (e.g., in a micro-frontend setup) both render `ModalDialog` instances, they would share the same stack, causing incorrect focus-trap behavior. This is a latent coupling issue that only manifests in unusual deployment scenarios.

Additionally, if a modal is unmounted without calling `closeModal` (e.g., due to an error boundary catching inside the modal), the stack would become stale. The `useEffect` cleanup does call `closeModal`, so normal unmounts are handled. But error boundaries that unmount components during render (not effect cleanup) could bypass this.

**Severity:** LOW / MEDIUM — Edge case in non-standard deployments; normal usage is fine.

---

### C10-F7 — MEDIUM / HIGH — FileUpload doesn't reset `isDragging` state on file parse error

**File:** `src/components/FileUpload.tsx:77-91`
**Issue:** In `handleDrop`, if the file has an invalid extension, `isDragging` is set to false after 200ms. But if `handleFile` throws an error, the `isDragging` state is only reset in the `setTimeout` at line 90, which always runs after `handleFile` is called (even if it throws). Wait — `handleFile` is async, and the `setTimeout(() => setIsDragging(false), 200)` at line 90 runs immediately after `handleFile(file)` is called (not after it resolves). So `isDragging` is always reset regardless of parse success/failure. This is actually correct behavior. **No issue.**

**Revised severity:** INFO / HIGH — Already correctly handled.

---

### C10-F8 — MEDIUM / HIGH — Controls progress bar missing `aria-valuetext`

**File:** `src/components/Controls.tsx:56-73`
**Issue:** The progress range input has `aria-label={t('controls.progressAria')}` but no `aria-valuetext`. For a screen reader user, hearing "Playback progress, 50" is less useful than hearing "Playback progress, 50%, 150 meters of 300 meters traveled". The `aria-valuenow` is implicitly set by the `value` attribute on the range input, but without `aria-valuetext`, the announced value is just a raw number (0-1 decimal).

**Fix:** Add `aria-valuetext` that includes the human-readable progress description (distance traveled, percentage).

**Severity:** MEDIUM / HIGH — Accessibility: screen reader users get incomplete progress information.

---

### C10-F9 — LOW / MEDIUM — JourneyCreator not reviewed this cycle (file not read)

**Note:** I did not read `src/components/JourneyCreator.tsx` in this cycle. Previous cycles have thoroughly reviewed it. Any new findings would require a fresh read.

---

### C10-F10 — MEDIUM / HIGH — TimelineSelector resolveRangeIndexes duplicated in resolveIndexesForRatios

**File:** `src/components/TimelineSelector.tsx:95-136, 161-197`
**Issue:** The `ratioToIndex` binary search logic is fully duplicated between `resolveRangeIndexes` (lines 106-123) and `resolveIndexesForRatios` (lines 167-183). This is a maintenance hazard — any bug fix or change to the binary search must be applied in two places. The duplication exists because `resolveRangeIndexes` reads React state (`startRatio`, `endRatio`) while `resolveIndexesForRatios` takes parameters.

**Fix:** Extract the binary search into a shared helper that accepts the ratios and `cumulDist` as parameters.

**Severity:** LOW / HIGH — Code quality: duplication is a maintenance risk, not a correctness bug.

---

### C10-F11 — MEDIUM / HIGH — ExportPanel bitrate input is read-only but uses wrong ARIA

**File:** `src/components/ExportPanel.tsx:341`
**Issue:** The bitrate input has `readOnly` and `aria-disabled="true"`. However, `aria-disabled="true"` on an input suggests the field is disabled (cannot be interacted with), while `readOnly` means the value cannot be changed but the field can still receive focus. These are semantically different. Using both `readOnly` and `aria-disabled` sends conflicting signals. The `aria-disabled` should be removed since `readOnly` already communicates the correct state, or the field should be changed to a read-only display (like a `<span>` or `<output>`) instead of a form input.

**Severity:** LOW / HIGH — Accessibility: conflicting ARIA states confuse assistive technology.

---

### C10-F12 — MEDIUM / MEDIUM — SceneEditor SceneRangeEditor onPointerDown doesn't prevent text selection

**File:** `src/components/SceneEditor.tsx:156-159`
**Issue:** The `onPointerDown` handler on the range region div doesn't call `event.preventDefault()`. During drag, this can cause text selection in the scene editor, especially on desktop. The `touchAction: 'none'` CSS property handles touch devices, but mouse-based text selection can still occur. The TimelineSelector handles this with `userSelect: 'none'` on its container, but SceneRangeEditor doesn't have that.

Wait — the parent scene editor panel has `select-none` CSS class? Let me check... The main `SceneEditor` div at line 352 doesn't have `select-none`. So during drag of range handles, text could get selected.

**Fix:** Add `style={{ userSelect: 'none' }}` to the SceneRangeEditor container div.

**Severity:** LOW / MEDIUM — UX: text selection during drag is distracting but not a functional bug.

---

### C10-F13 — MEDIUM / HIGH — `normalizeScenes` silently drops scenes with zero duration

**File:** `src/lib/camera.ts:43`
**Issue:** `normalizeScenes` filters out scenes where `endPercent <= startPercent` (line 43). This means scenes with start=end are silently dropped during normalization. The SceneEditor already shows warnings when `startPercent >= endPercent` (line 254), but the normalization silently removes them. If a user creates a scene with start=end (e.g., 50% to 50%), the warning appears but the scene is still shown in the editor list. When export runs, `normalizeScenes` drops it without any export-time warning.

This was already tracked as DF-C17-001. No new finding.

---

### C10-F14 — MEDIUM / MEDIUM — `computeCameraForProgress` doesn't handle empty scenes array correctly after normalization

**File:** `src/lib/camera.ts:352-353`
**Issue:** When `normalizedScenes.length === 0`, the function falls back to a basic flyover camera at zoom 14, pitch 45. This is reasonable behavior. However, if the user's scenes were all filtered out by `normalizeScenes` (e.g., all had start >= end), the user won't see their configured camera at all — they'll get a generic flyover. The cycle 9 review noted this as DF-C17-001. Already tracked.

---

### C10-F15 — LOW / HIGH — ElevationProfile click handler uses distance-based progress but seek doesn't update timeline handles

**File:** `src/components/ElevationProfile.tsx:64-72`
**Issue:** When the user clicks on the elevation profile, `onSeek(clickFraction)` is called with a distance-based progress value. This correctly seeks the playback position. However, the TimelineSelector handles show position based on their `startRatio`/`endRatio` state, which is independent of the elevation profile click. If the user clicks on the elevation profile, the playback position changes but the timeline handles don't move (they're for range selection, not playback position). This is by design — the timeline is for selecting date ranges, not showing playback position. **No issue.**

**Revised severity:** INFO / HIGH — By design.

---

## Summary of Actionable New Findings

| ID | Finding | Severity | Confidence | Action |
|----|---------|----------|------------|--------|
| C10-F8 | Controls progress bar missing aria-valuetext | MEDIUM | HIGH | Fix: add aria-valuetext with distance/percentage info |
| C10-F4 | Toast role="log" with redundant aria-live | LOW | HIGH | Fix: remove redundant aria-live or change role |
| C10-F11 | ExportPanel bitrate has conflicting readOnly + aria-disabled | LOW | HIGH | Fix: remove aria-disabled or replace with display element |
| C10-F12 | SceneRangeEditor missing userSelect:none for drag | LOW | MEDIUM | Fix: add userSelect:'none' to container |
| C10-F10 | TimelineSelector duplicated ratioToIndex logic | LOW | HIGH | Refactor: extract shared helper |

## Previously Verified Fixed (Still Fixed)

All findings from cycles 7-9 remain fixed:
- Playback hotkeys suppressed during export
- Export overlay has `data-disable-playback-hotkeys`
- `setExportState('idle')` guarded by `mountedRef`
- `setIsPlaying`/`setFollowCamera` not exposed from usePlaybackController
- TimelineSelector distance-based histogram (with binary search handle mapping)
- Module-level codec cache removed from ExportPanel
- ExportPanel estimated time floors at 1 second
- GoogleGuide arrow-key tab navigation
- MapView accessible label when no track loaded

## Deferred Findings (Unchanged)

All previously deferred findings remain deferred per their exit criteria documented in `deferred-findings-cycle17-2026-04-23.md` and `deferred-findings-cycle6-2026-04-23.md`.
