# Comprehensive Deep Code Review - Cycle 3 (Review-Plan-Fix Loop)

**Date:** 2026-04-19
**Reviewer:** Automated deep review (cycle 3 of review-plan-fix loop)
**Scope:** Full source tree (`src/`, `public/`, `scripts/`, `e2e/`)

## Previous Cycle Verification

All prior findings have been verified as fixed or are tracked in deferred findings:

| Source | Finding | Status |
|--------|---------|--------|
| Cycle 2 (F1) | Map not rendering - sparse 10-layer styles | FIXED - 93-layer CARTO styles |
| Cycle 2 (F2) | Theme wrong on first visit | FIXED - `:root:not([data-mode])` fallback |
| Cycle 2 (F3) | Default unit to km/SI | VERIFIED - already working |
| Cycle 4 (NEW-C4-1) | Worker error message says "200MB" but limit is 500MB | FIXED |
| Cycle 4 (NEW-C4-2) | i18n strings say "max 200 MB" but JSON limit is 500MB | FIXED |
| Cycle 4 (NEW-C4-3) | downloadVideo unnecessary blob URL roundtrip | FIXED - blob passed directly |
| Cycle 4 (NEW-C4-4) | Drag-and-drop silently ignores unsupported files | FIXED - error message shown |
| Cycle 5 (NEW-C5-1) | ElevationProfile click-to-seek wrong conversion | FIXED - uses clickFraction directly |

## New Findings

### NEW-R3-1: Missing `--gc-solid-bg` variable in dark mode causes upload card readability issue

**Severity:** MEDIUM
**File:** `src/styles/vitro-base.css:261-301`
**Category:** Correctness / Visual bug

**Description:**
The `[data-mode=dark]` block in `vitro-base.css` does not define `--gc-solid-bg`. This variable is defined in:
- `[data-mode=light]` block (line 219): `--gc-solid-bg: rgba(255, 255, 255, .88)`
- `:root:not([data-mode])` fallback block (line 49): `--gc-solid-bg: rgba(255, 255, 255, .88)`

But it is absent from the dark mode definition.

The `--gc-solid-bg` variable is referenced in `FileUpload.tsx` line 146:
```tsx
background: 'var(--gc-solid-bg, var(--gc-bg))',
```

The fallback `var(--gc-bg)` is defined in dark mode as `rgba(22, 26, 38, .52)` -- a semi-transparent value. This means in dark mode, the file upload card background is semi-transparent, allowing the map grid and reference lines to show through, reducing readability of the upload card text.

**Concrete scenario:** User visits the app in dark mode. The file upload card's background is translucent, making the "Upload your GPX, KML, or Google Location History file" text and buttons harder to read against the map reference grid visible behind the card.

**Fix:** Add `--gc-solid-bg` to the `[data-mode=dark]` block:
```css
[data-mode=dark] {
  --gc-solid-bg: rgba(10, 13, 20, .92);
  /* ... existing variables ... */
}
```

**Confidence:** HIGH

---

### NEW-R3-2: `MapView` reference grid still added when no track is loaded, creating visual noise in dark mode

**Severity:** LOW
**File:** `src/components/MapView.tsx:543-548, 692`
**Category:** UX

**Description:**
When the map initializes (line 543-548), the `onGlobalStyleLoad` handler always calls `addReferenceGridLayers(map, styleKeyRef.current, activeTrack)`. When `activeTrack` is null, this adds a global lat/lng grid covering -150 to 150 longitude and -60 to 60 latitude with 30-degree spacing.

In dark mode, the grid lines (`rgba(148, 163, 184, 0.26)` minor and `rgba(148, 163, 184, 0.46)` major) are visible against the dark map background. Combined with the translucent upload card (NEW-R3-1), this creates visual noise behind the upload UI.

This is already tracked in deferred findings as F4 ("Reference grid dominates sparse map"). Since the map styles are now full 93-layer CARTO styles (F1 fixed), the grid is less visually dominant. However, the grid is still unnecessary when no track is loaded -- it serves no purpose until a track is being visualized.

**Confidence:** MEDIUM -- The grid does provide a visual reference for the empty map state, so removing it entirely when no track is loaded is a design decision.

---

## Codebase Health Assessment

### Strengths (confirmed from previous cycles)

1. **Security posture is solid**: CSP hardening via post-build script, no `eval()`/`innerHTML`, XML entity stripping, JSON depth checking with spot-checks, worker isolation, hash-based inline script allowlisting.

2. **Resource cleanup is thorough**: Object URLs revoked in cleanup effects, map markers/layers removed on unmount, event listeners cleaned up in effect returns, `mountedRef` pattern, worker `terminate()` in all exit paths.

3. **Type safety is good**: `ParseError` class with machine-readable codes for i18n mapping, proper TypeScript types throughout, no `any` usage.

4. **Antimeridian handling**: Consistent shifted-longitude interpolation across `lerpCamera`, `smoothCameraState`, and `computeBoundingBox`.

5. **Accessibility**: Modal dialogs with focus trapping and `aria-modal`, keyboard navigation, `inert`/`aria-hidden` on background content, ARIA labels on interactive elements.

6. **Defense-in-depth for parsing**: Multiple size checks, worker fallback to main thread on failure, date field repair after structured clone.

7. **No TODO/FIXME/HACK comments** in source code.

8. **All console statements justified** and all eslint-disable comments documented.

### No Regressions Detected

All previously fixed issues remain fixed. No new code quality regressions, security issues, or architectural problems beyond the findings listed above.

### Module-Level Assessment

| Module | Lines | Assessment |
|--------|-------|------------|
| `src/app/page.tsx` | 422 | Central orchestrator, clean state management |
| `src/lib/parser.ts` | 566 | Robust multi-format parsing, 5 Google formats |
| `src/components/MapView.tsx` | 883 | Complex but well-structured, proper cleanup |
| `src/lib/camera.ts` | 445 | Clean antimeridian handling, good scene system |
| `src/lib/videoEncoder.ts` | 191 | Proper abort handling, config clamping |
| `src/lib/i18n.ts` | ~1740 | Complete 5-locale coverage, type-safe keys |
| `src/components/SceneEditor.tsx` | 569 | Complex drag handling, proper cleanup |
| `src/components/JourneyCreator.tsx` | 759 | Local-only search, proper map interaction cleanup |
| `src/components/ElevationProfile.tsx` | 141 | Fixed (click-to-seek now correct) |
| `src/components/ExportPanel.tsx` | 326 | Good codec support detection |
| `src/components/TimelineSelector.tsx` | 375 | Consistent design |
| `src/components/ModalDialog.tsx` | 188 | Proper stacking, focus trap, body scroll lock |
| `scripts/harden-static-export.mjs` | 102 | Clean CSP hardening |
| `src/styles/vitro-base.css` | 735 | Missing `--gc-solid-bg` in dark mode (NEW-R3-1) |

---

## Summary

| ID | Finding | Severity | Confidence | File |
|----|---------|----------|------------|------|
| NEW-R3-1 | Missing `--gc-solid-bg` in dark mode CSS | MEDIUM | HIGH | `src/styles/vitro-base.css` |
| NEW-R3-2 | Reference grid visible on empty map creates noise | LOW | MEDIUM | `src/components/MapView.tsx` |

**Net assessment:** The codebase remains in excellent shape after 5 prior review cycles. Only 2 findings this cycle, with 1 MEDIUM and 1 LOW. The MEDIUM finding is a missing CSS variable that causes reduced readability of the upload card in dark mode -- a straightforward one-line fix.
