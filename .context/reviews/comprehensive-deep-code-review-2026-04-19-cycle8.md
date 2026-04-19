# Comprehensive Deep Code Review - Cycle 8

**Date:** 2026-04-19
**Reviewer:** Deep code review (cycle 5 of review-plan-fix loop)
**Scope:** Full source tree (`src/`, `public/`, `scripts/`, `e2e/`)

## Previous Cycle Verification

All findings from cycle 7 have been verified:
- **NEW-C7-1** (TimelineSelector histogram index-based bucketing): **FIXED** - Now uses distance-based bucketing via `cumulDist` with index-based fallback when `totalDist <= 0`.
- **NEW-C7-2** through **NEW-C7-6**: Status unchanged (deferred or no-fix-needed).

## Previously Deferred Finding Status Update

| ID | Finding | Original Status | Current Status |
|----|---------|-----------------|----------------|
| F6 | ErrorBoundary no i18n | Deferred | **FIXED** - ErrorBoundary now uses `useLocale()` and `t()` for all strings |
| F4, F5, F7, F8, F9, F11, F12, F14, F16 | Various deferred | Deferred | Still deferred (no change) |

## New Findings

### NEW-C8-1: Playback hotkeys not suppressed during video export

**Severity:** MEDIUM
**File:** `src/lib/usePlaybackController.ts:140-196` (hotkey handler)
**Category:** Correctness / UX
**Confidence:** HIGH

**Description:**
The `usePlaybackHotkeys` keyboard event handler does not check `isExporting` for the Space (play/pause), ArrowLeft, or ArrowRight keys. Only the `E` key handler includes an `!isExporting` guard:

```typescript
case 'e':
case 'E':
  if (track && !isExporting) {   // <-- guarded
    onToggleExport()
  }
  break
case ' ':
  event.preventDefault()
  if (track) {                   // <-- no isExporting check
    onTogglePlay()
  }
  break
case 'ArrowRight':
  event.preventDefault()
  onStepSeek(0.02)               // <-- no isExporting check
  break
```

During video export, the `useExportController` pauses playback and manually drives `progress` via `setPlaybackProgress` for each frame. If the user presses Space, `togglePlay` sets `isPlaying = true`, which activates the `requestAnimationFrame` animation loop in `usePlaybackController`. This loop also increments `progress` based on elapsed time. The result is two competing writers to `progress`:

1. The export controller setting `progress` to the exact frame position
2. The animation loop incrementing `progress` based on `speed / duration`

This causes the map camera to jump between the export-intended position and the animation-intended position, producing visual glitches in the exported video.

Arrow key presses during export would similarly seek to a different position, corrupting the export.

**Concrete failure scenario:**
1. User starts a video export
2. Export overlay appears with progress bar
3. User presses Space (perhaps reflexively) or Arrow keys
4. Playback state becomes `isPlaying = true` or progress jumps
5. The exported video contains camera jumps/glitches as the two progress drivers fight

**Fix:** Add `isExporting` checks to the Space and Arrow key handlers, or add `data-disable-playback-hotkeys="true"` to the export overlay div in `page.tsx:310-326`. The overlay-based approach is simpler and also prevents the `f`/`F` key from toggling follow camera during export.

---

### NEW-C8-2: Export overlay div missing `data-disable-playback-hotkeys` attribute

**Severity:** MEDIUM (complements NEW-C8-1)
**File:** `src/app/page.tsx:310-326`
**Category:** UX / Correctness
**Confidence:** HIGH

**Description:**
The export overlay (shown during video rendering) does not carry the `data-disable-playback-hotkeys="true"` attribute. Other modal-like UI sections (like ExportPanel at line 153) use this attribute to prevent hotkey interference. The export overlay is a full-screen blocking overlay (`z-20`, `inset-0`), so it should similarly suppress hotkeys.

```jsx
{isExporting && (
  <div className="absolute inset-0 z-20 flex items-center justify-center" ...>
    {/* Missing: data-disable-playback-hotkeys="true" */}
```

However, even adding this attribute alone won't fully fix NEW-C8-1, because the hotkey handler only checks `target?.closest(...)` against interactive elements -- it doesn't prevent hotkeys when focus is on a plain `<div>`. The Space/Arrow key handlers also need explicit `isExporting` guards (or the handler should early-return when `isExporting` is true at the top level).

**Fix:** Two changes needed:
1. Add `data-disable-playback-hotkeys="true"` to the export overlay div
2. Add an `isExporting` early-return at the top of the hotkey handler (before the switch statement)

---

### NEW-C8-3: `harden-static-export.mjs` `walk()` function uses implicit `any` for directory entries

**Severity:** LOW
**File:** `scripts/harden-static-export.mjs:27`
**Category:** Code quality
**Confidence:** HIGH

**Description:**
The `walk` function parameter has no JSDoc type annotation:
```javascript
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
```

While this is a plain `.mjs` script (not TypeScript), the `directory` parameter is untyped and could be confused with an `fs.Dirent` array. This is minor since the script works correctly and has no consumers other than the `postbuild` npm script.

**No fix needed** -- noting for completeness only.

---

### NEW-C8-4: `serve-static.mjs` redirects use 302 instead of 301 for canonical path redirects

**Severity:** INFO
**File:** `scripts/serve-static.mjs:135`
**Category:** HTTP semantics
**Confidence:** HIGH

**Description:**
When the base path redirect fires (e.g., `/` to `/travelback/`), the server uses a 302 Found redirect:
```javascript
res.writeHead(302, { Location: resolved.redirect })
```

For canonical path redirects that don't depend on any dynamic state, a 301 Moved Permanently would be more semantically correct and allow browsers/proxies to cache the redirect. However, since this is a development/preview server (the production deployment is via GitHub Pages static hosting), the 302 is acceptable.

**No fix needed** -- noting for awareness.

---

## Codebase Health Assessment

### Strengths (re-confirmed from previous cycles)

1. **Security posture remains solid**: No `eval()`, no `innerHTML` (only `dangerouslySetInnerHTML` for CSP-hashed theme-init), proper CSP hardening via post-build script, XML entity stripping, JSON depth checking, worker isolation.

2. **Resource cleanup is thorough**: Object URLs revoked in cleanup effects, MapLibre markers/layers removed on unmount, event listeners cleaned up, `mountedRef` pattern prevents state updates after unmount, worker `terminate()` in all exit paths.

3. **Type safety is good**: `ParseError` class with machine-readable codes for i18n mapping, proper TypeScript types throughout, no `any` usage in source files.

4. **Antimeridian handling**: Consistent shifted-longitude interpolation across `lerpCamera`, `smoothCameraState`, and `computeBoundingBox`.

5. **Accessibility**: Modal dialogs with focus trapping and `aria-modal`, keyboard navigation, `inert`/`aria-hidden` on background content when modals open, ARIA labels on interactive elements.

6. **Defense-in-depth for parsing**: Multiple size checks, worker fallback to main thread, date field repair after structured clone.

7. **i18n completeness**: All user-facing strings use the translation system. ErrorBoundary now also uses i18n (F6 fix confirmed).

8. **No TODO/FIXME/HACK comments** in source code.

9. **All console statements justified**: No extraneous debug logging.

10. **All eslint-disable comments justified**: 5 total, each with documented reasons.

### No Regressions Detected

All previously fixed issues remain fixed. The NEW-C7-1 fix (distance-based histogram) is confirmed working correctly in the code.

### Module-Level Assessment

| Module | Lines | Assessment |
|--------|-------|------------|
| `src/app/page.tsx` | 422 | **Finding** (NEW-C8-1/2: export overlay missing hotkey suppression) |
| `src/lib/usePlaybackController.ts` | 197 | **Finding** (NEW-C8-1: Space/Arrow hotkeys not guarded during export) |
| `src/lib/parser.ts` | 566 | Robust, no new issues |
| `src/components/MapView.tsx` | 883 | Complex but well-structured, no new issues |
| `src/lib/camera.ts` | 445 | Clean antimeridian handling |
| `src/lib/videoEncoder.ts` | 191 | Proper abort handling, no new issues |
| `src/lib/i18n.ts` | ~1740 | Complete 5-locale coverage |
| `src/components/TimelineSelector.tsx` | 375 | Distance-based bucketing confirmed working |
| `src/components/SceneEditor.tsx` | 569 | No new issues |
| `src/components/JourneyCreator.tsx` | 759 | No new issues |
| `src/components/ElevationProfile.tsx` | 141 | Clean |
| `src/components/ExportPanel.tsx` | 326 | Uses `data-disable-playback-hotkeys` correctly |
| `src/components/ModalDialog.tsx` | 188 | Proper stacking, focus trap |
| `src/components/ErrorBoundary.tsx` | 83 | Now uses i18n (F6 fix confirmed) |
| `scripts/harden-static-export.mjs` | 102 | Clean CSP hardening |
| `scripts/serve-static.mjs` | 184 | Secure static file serving |

---

## Summary

| ID | Finding | Severity | Confidence | Files |
|----|---------|----------|------------|-------|
| NEW-C8-1 | Playback hotkeys not suppressed during video export | MEDIUM | HIGH | `src/lib/usePlaybackController.ts:140-196` |
| NEW-C8-2 | Export overlay missing `data-disable-playback-hotkeys` | MEDIUM | HIGH | `src/app/page.tsx:310-326` |
| NEW-C8-3 | `harden-static-export.mjs` walk() untyped parameter | LOW | HIGH | `scripts/harden-static-export.mjs:27` |
| NEW-C8-4 | serve-static uses 302 instead of 301 for canonical redirects | INFO | HIGH | `scripts/serve-static.mjs:135` |

**Previously deferred findings now resolved:**
- F6 (ErrorBoundary no i18n): **FIXED** - ErrorBoundary now uses `useLocale()` and `t()`
- NEW-C7-1 (TimelineSelector index-based histogram): **FIXED** - Now uses distance-based bucketing

**Net assessment:** The codebase remains in excellent shape. The most impactful new finding is NEW-C8-1/C8-2 (playback hotkeys during export), which is a real correctness bug that can produce corrupted video exports. All other findings are LOW/INFO severity. No security, data-loss, or critical issues found.
