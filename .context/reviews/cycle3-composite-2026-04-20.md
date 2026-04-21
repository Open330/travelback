# Cycle 3 Composite Code Review -- 2026-04-20

**Date:** 2026-04-20
**Reviewer:** Independent full-scope review (code quality, security, performance, accessibility, correctness, UX, architecture)
**Scope:** All source files in `src/`, CSS, configuration, scripts, e2e tests

---

## Executive Summary

This is cycle 3 of a fresh 100-cycle review-plan-fix loop on a codebase that has already undergone 18+ prior review cycles (cycles 1-16 in the previous loop, cycles 1-2 in this loop). The last several cycles have produced zero or near-zero new findings. This review performed independent pattern-based searches covering: useEffect cleanup, event listener lifecycle, ref mutation patterns, catch blocks, type safety, NaN guards, Object URL lifecycle, dangerouslySetInnerHTML, setTimeout/RAF cleanup, Worker lifecycle, textContent/innerHTML XSS, aria accessibility, eslint-disable rationale, transferable objects, postMessage patterns, console output hygiene, and cross-component state consistency.

**0 new findings** were identified. The codebase remains production-quality with no regressions or newly introduced issues.

---

## Verification: Cycle 2 Findings Re-Examined

### NEW-C2-1: E2E test strict mode violation -- RESOLVED

The cycle 2 review claimed that `e2e/travelback.spec.ts` line 941 used `page.locator('text=/Unsupported file format|parse|error/i')` which would match the Next.js dev overlay "Console Error" label. However, upon inspecting the actual current code:

- Line 951 (the actual error assertion) uses `page.locator('p[role="alert"]')` which is a specific selector targeting only the `<p role="alert">` element in the app's FileUpload component.
- The Next.js dev overlay does not use `<p role="alert">`, so there is no strict mode violation.
- The `addInitScript` in `beforeEach` (lines 196-202) already hides the Next.js dev overlay with CSS `[id^="nextjs"]{display:none!important;}`.

**Verdict:** This finding was either already fixed before this cycle or was a false positive in cycle 2. The current code does not exhibit the described problem. No action needed.

### NEW-C2-2: Hydration mismatch from bootstrap script -- MITIGATED

- `suppressHydrationWarning` is already on both `<html>` (line 52) and `<body>` (line 73) in `layout.tsx`.
- The E2E test suite hides the Next.js dev overlay via `addInitScript` before every test.
- This is a dev-only issue that does not affect production static export.

**Verdict:** Already mitigated. The cycle 2 plan listed fix options but the existing mitigations (suppressHydrationWarning + CSS overlay hiding in E2E) are sufficient. No further action needed.

---

## Verification: Pattern Search Results

### useEffect Cleanup
- All useEffect hooks that subscribe to events properly remove listeners in cleanup functions (TrackToolbar, ModalDialog, SceneEditor, TimelineSelector, ThemeToggle, usePlaybackController).
- Timer-based effects clear timeouts in cleanup returns (SceneEditor undo timer, Toast dismiss timer).
- `mountedRef` pattern in useExportController prevents state updates after unmount.

### Event Listener Lifecycle
- All window/document event listeners are properly cleaned up:
  - usePlaybackController: keydown removed in cleanup (line 189)
  - SceneEditor: pointermove/pointerup removed in cleanup (lines 132-134)
  - TimelineSelector: mousemove/mouseup/touchmove/touchend removed in cleanup (lines 235-238)
  - ModalDialog: keydown removed in cleanup (line 155)
  - TrackToolbar: mousedown/touchstart/keydown removed in cleanup (lines 73-75)

### Ref Mutation Patterns
- All ref mutations occur in useEffect or event handlers (never during render).
- MapView tracks multiple refs with dedicated sync effects.
- Toast, ModalDialog, SceneEditor, TimelineSelector use `onXxxRef.current = xxx` pattern with sync effects.

### Catch Blocks
- 18 catch blocks found, all appropriate:
  - localStorage access (6 instances): swallowed with `/* ignore */`
  - Parser error handling (4 instances): proper error propagation
  - Codec support probing (1 instance): expected to fail on unsupported browsers
  - Export/encoding errors (2 instances): proper error state management
  - MapView camera/bounds (1 instance): graceful fallback
  - JourneyCreator geocoding (1 instance): graceful degradation
  - i18n localStorage (2 instances): same as above
  - Units localStorage (2 instances): same as above

### Type Safety
- Zero `as any` casts found
- Zero `@ts-ignore` or `@ts-expect-error` comments found
- 9 eslint-disable comments, all with rationale

### NaN Guards
- All parseFloat/parseInt in onChange handlers are guarded with `Number.isFinite()`:
  - Controls.tsx: speed, duration, progress inputs
  - ExportPanel.tsx: quality, fps, bitrate inputs
  - SceneEditor.tsx: camera parameter sliders, range editors

### Object URL Lifecycle
- useExportController properly revokes previous URLs before creating new ones
- Cleanup effect revokes URL on unmount
- No URL leaks found

### dangerouslySetInnerHTML
- Single usage in layout.tsx for bootstrap script
- CSP hardening script computes SHA-256 hash and adds it to CSP
- No XSS risk

### Accessibility
- 60+ aria attributes across components
- Modal dialog: focus trap with tab cycling, Escape key, backdrop click
- Scene editor: slider handles with aria-valuenow/aria-valuemin/aria-valuemax
- Timeline selector: slider handles with proper ARIA slider pattern
- GoogleGuide: tablist/tab/tabpanel with proper aria-controls, aria-selected
- JourneyCreator: combobox pattern with aria-expanded, aria-autocomplete, role="listbox"
- Toast: role="log" with aria-live="polite"
- MapView: aria-hidden when no track loaded
- ElevationProfile SVG: role="img" with aria-label
- Min 44px touch targets throughout

### postMessage / Transferable
- `worker.postMessage({ ext: 'json', buffer }, [buffer])` in parser.ts line 509 correctly transfers the ArrayBuffer to the worker thread, avoiding a copy. This is correct usage.

### Worker Lifecycle
- parser.ts Worker is terminated after use (line 489) and in catch block (line 504)
- Graceful fallback to main thread if Worker creation fails

### Console Output Hygiene
- All console.error/warn calls use meaningful messages with proper error extraction
- No sensitive data leaked in console output
- ErrorBoundary logs are appropriate for development

---

## Previously Fixed (Verified Still Fixed)

All findings from prior cycles verified as still fixed during this review. Key verified items:
- MapLibre CSS specificity fix (`.maplibregl-map.absolute { position: absolute !important }`)
- Dark mode CSS variables
- TrackWorkspace title layout
- Map style tile sources
- GoogleGuide tabpanel tabIndex
- ExportPanel aria-disabled
- ElevationProfile role="img"
- Render-phase ref fixes
- NaN guards on camera params
- Playback hotkey suppression during export
- setState-in-effect ESLint warnings resolved

---

## New Findings

| ID | Finding | Severity | Confidence | Fix Effort |
|----|---------|----------|------------|------------|
| (none) | | | | |

No new findings this cycle.

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
