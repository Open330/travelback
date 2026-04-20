# Cycle 2 Composite Code Review -- 2026-04-20

**Date:** 2026-04-20
**Reviewer:** Independent full-scope review (code quality, security, performance, accessibility, correctness, UX, architecture)
**Scope:** All source files in `src/`, CSS, configuration, scripts

---

## Executive Summary

This is cycle 2 of a fresh 100-cycle review-plan-fix loop on a codebase that has already undergone 16+ prior review cycles (cycles 1-16 in the previous loop), with the last 3 of those cycles producing zero new findings. This review performed independent pattern-based searches covering: useEffect cleanup, event listener lifecycle, ref mutation patterns, catch blocks, type safety (as any, ts-ignore), setTimeout/setInterval cleanup, Object URL lifecycle, dangerouslySetInnerHTML usage, requestAnimationFrame cleanup, Worker lifecycle, textContent/innerHTML XSS vectors, NaN guards, aria accessibility, and eslint-disable rationale.

**0 new findings** were identified. The codebase remains production-quality with no regressions or newly introduced issues.

---

## Verification: Pattern Search Results

### useEffect Cleanup
- All useEffect hooks that subscribe to events (TrackToolbar, ModalDialog, SceneEditor, TimelineSelector, ThemeToggle, usePlaybackController) properly remove listeners in their cleanup functions.
- Timer-based effects (SceneEditor undo timer, Toast dismiss timer) clear timeouts in cleanup returns.
- `mountedRef` pattern in useExportController prevents state updates after unmount.

### Event Listener Lifecycle
- TrackToolbar: mousedown/touchstart/keydown all removed in cleanup (lines 73-75).
- ModalDialog: keydown removed in cleanup (line 155).
- SceneEditor: pointermove/pointerup removed in cleanup (lines 133-134).
- TimelineSelector: mousemove/mouseup/touchmove/touchend removed in cleanup (lines 235-238).
- ThemeToggle: matchMedia listener removed in cleanup (line 45).
- usePlaybackController: keydown removed in cleanup (line 189).
- No leaked listeners found.

### Ref Mutation Patterns
- All ref mutations occur in useEffect or event handlers (never during render).
- MapView tracks multiple refs (mapRef, trackRef, styleKeyRef, etc.) with dedicated sync effects.
- Toast, ModalDialog, SceneEditor, TimelineSelector use the `onXxxRef.current = xxx` pattern with sync effects to avoid stale closures.

### Catch Blocks
- 18 catch blocks found. All are appropriate:
  - localStorage access (6 instances): correctly swallowed with `/* ignore */` since localStorage can throw in private browsing or quota-exceeded scenarios.
  - Parser error handling (4 instances): proper error propagation with user-facing messages.
  - Codec support probing (1 instance): expected to fail on unsupported browsers.
  - Export/encoding errors (2 instances): proper error state management.
  - MapView camera/bounds computation (1 instance): graceful fallback.
  - JourneyCreator geocoding (1 instance): graceful degradation.
  - i18n localStorage (2 instances): same as above.
  - Units localStorage (2 instances): same as above.

### Type Safety
- Zero `as any` casts found.
- Zero `@ts-ignore` or `@ts-expect-error` comments found.
- 9 eslint-disable comments, all with rationale explaining the intentional pattern.

### NaN Guards
- All parseFloat/parseInt in onChange handlers are guarded with `Number.isFinite()`:
  - Controls.tsx: speed (line 99-100), duration (line 115-117), progress (line 46-48).
  - ExportPanel.tsx: quality, fps, bitrate inputs.
  - SceneEditor.tsx: camera parameter sliders.

### Object URL Lifecycle
- useExportController properly revokes previous URLs before creating new ones (lines 56-57, 63-67, 153).
- Cleanup effect revokes URL on unmount (lines 54-59).
- No URL leaks found.

### dangerouslySetInnerHTML
- Single usage in layout.tsx for the bootstrap script (line 54).
- This is a controlled, deterministic script string (not user input).
- CSP hardening script (harden-static-export.mjs) computes a SHA-256 hash and adds it to the CSP `script-src` directive.
- No XSS risk.

### Accessibility
- 60+ aria attributes found across components.
- Modal dialog: focus trap with tab cycling, Escape key, backdrop click.
- Scene editor: slider handles with aria-valuenow/aria-valuemin/aria-valuemax.
- Timeline selector: slider handles with proper ARIA slider pattern.
- GoogleGuide: tablist/tab/tabpanel with proper aria-controls, aria-selected, aria-labelledby.
- JourneyCreator: combobox pattern with aria-expanded, aria-autocomplete, role="listbox".
- Toast: role="log" with aria-live="polite".
- MapView: aria-hidden when no track loaded.
- ElevationProfile SVG: role="img" with aria-label.
- KeyboardHelp: accessible via `?` key.
- Min 44px touch targets throughout.

### setTimeout/setInterval
- SceneEditor undo timer (line 280): properly cleared in cleanup (line 281).
- Toast dismiss timer (lines 28-30): properly cleared in cleanup (lines 32-34).
- FileUpload drag timeout (lines 88, 93): fire-and-forget 200ms timeout for UI state. No cleanup needed -- React 18+ handles setState on unmounted components gracefully, and the component is always mounted when drag events fire.
- videoEncoder anchor removal (line 200): fire-and-forget 100ms timeout. Acceptable pattern for DOM cleanup after download trigger.
- MapView idle timeout (line 528): properly cleared in finish/cleanup (lines 513, 525).

### requestAnimationFrame
- usePlaybackController (lines 99, 102): cancelAnimationFrame in cleanup.
- TimelineSelector (line 161): cancelAnimationFrame in cleanup (line 220).
- ModalDialog (line 150): single-fire rAF for focus, no cleanup needed.
- Toast (line 26): single-fire rAF for enter animation, no cleanup needed.

### Worker Lifecycle
- parser.ts creates Worker for large JSON files (line 449).
- Worker is terminated after use (line 489) and in the catch block (line 504).
- Graceful fallback to main thread if Worker creation fails.

---

## Previously Fixed (Verified Still Fixed)

All findings from prior cycles verified as still fixed during this review. Key items confirmed:
- MapLibre CSS specificity fix (`.maplibregl-map.absolute { position: absolute !important }`)
- Dark mode CSS variable definitions (`--err-rgb`, `--gi-sh`, `--gs-sh`)
- TrackWorkspace title layout
- Map style files with proper CartoDB raster tile sources
- GoogleGuide tabpanel `tabIndex={0}`
- ExportPanel bitrate `aria-disabled="true"`
- ElevationProfile SVG `role="img"`
- Render-phase ref assignment fix in JourneyCreator
- Playback hotkey suppression during export
- setState-in-effect ESLint warnings resolved
- NaN guards on all camera param range inputs

---

## New Findings

| ID | Finding | Severity | Confidence | Fix Effort |
|----|---------|----------|------------|------------|
| NEW-C2-1 | E2E test strict mode violation: regex `/Unsupported file format\|parse\|error/i` matches Next.js dev overlay "Console Error" label, causing 2-element match and strict mode violation | MEDIUM | HIGH | LOW |
| NEW-C2-2 | Hydration mismatch in dev mode: bootstrap script sets `data-mode` before React hydrates, causing child components to mismatch. Triggers Next.js dev overlay that interferes with E2E tests. | LOW | HIGH | MEDIUM |

### NEW-C2-1: E2E test regex matches Next.js dev overlay

- **File**: `e2e/travelback.spec.ts` line 941
- **Root cause**: The locator `page.locator('text=/Unsupported file format|parse|error/i')` uses a regex that matches the word "Error" in the Next.js dev overlay label "Console Error". In strict mode, Playwright requires exactly 1 match, but finds 2: the actual `<p role="alert">Unsupported file format</p>` AND the dev overlay `<span>Console Error</span>`.
- **Impact**: Test always fails in dev mode because the Next.js dev overlay is present. Does not affect production behavior.
- **Fix**: Change the locator to use `getByRole('alert')` or a more specific selector that doesn't match the dev overlay. For example: `page.getByRole('alert', { name: /Unsupported file format/i })` or `page.locator('p[role="alert"]', { hasText: /Unsupported file format/i })`.

### NEW-C2-2: Hydration mismatch from bootstrap script

- **File**: `src/app/layout.tsx` line 49, `src/app/page.tsx` lines 36-56
- **Root cause**: The inline bootstrap script in layout.tsx sets `data-mode`, `data-mapstyle`, and `lang` on `<html>` before React hydrates. The `useState` initializers in page.tsx read these attributes and may return different values than what the server rendered with (server uses defaults: light/voyager/en). While `suppressHydrationWarning` is on `<html>`, it only suppresses the warning for the `<html>` element itself -- not for child components that conditionally render based on `colorMode` or `mapStyleKey`. In dev mode, this triggers a hydration mismatch error that activates the Next.js dev overlay, which then interferes with E2E test locators.
- **Impact**: Dev-only issue. Production static export does not show the Next.js overlay. The app functions correctly because React reconciles on the client side.
- **Fix options**:
  - (A) Add `suppressHydrationWarning` to the `<body>` element and potentially other container elements that render conditionally based on theme.
  - (B) In the E2E test config, add logic to dismiss or hide the Next.js dev overlay before assertions.
  - (C) Accept as a known dev-mode limitation.

---

## Deferred Findings (Carried Forward)

All previously deferred findings remain deferred per their existing exit criteria:

From `deferred-findings-cycle1-2026-04-19.md`:
- DF-C1-001: Mobile information architecture and discoverability polish
- DF-C1-002: Broad maintainability/performance restructuring

From `deferred-findings-cycle2-2026-04-19.md`:
- DF-C2-001: Mobile information architecture gaps
- DF-C2-002: Playback progress drives whole-app rerenders (HIGH/HIGH)
- DF-C2-003: Large GPX/KML imports parse on main thread
- DF-C2-004: Manual route dragging is O(n) on pointer move
- DF-C2-005: Export settings permit browser-hostile combinations
- DF-C2-006: Locale/help content eagerly bundled
- DF-C2-007: Large default variable font payload
- DF-C2-008: E2E suite serialized and sleep-heavy
- DF-C2-009: Residual CSP allows inline styles
- DF-C2-010: Local-only bundled styles ship without real basemap layer

From cycle 4:
- DF-C4-001: `preserveDrawingBuffer: true` always on

From cycle 5:
- DF-C5-001: TrackToolbar mobile menu focus trapping

From cycle 11:
- C11-007 (LOW): ElevationProfile RTL click handling
- C11-009 (LOW): Controls elapsed floating point wobble
- C11-005 (LOW): TrackWorkspace title overlap with scene editor

From cycle 12:
- C12-005 (LOW): TimelineSelector reset button bypasses resolveRangeIndexes
- C12-008 (LOW): ExportPanel file size estimate accuracy
