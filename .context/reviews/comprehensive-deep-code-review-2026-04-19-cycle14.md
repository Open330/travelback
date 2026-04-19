# Comprehensive Deep Code Review -- Cycle 14

**Date:** 2026-04-19
**Reviewer:** Multi-angle deep review (code quality, security, performance, accessibility, correctness, UX, architecture)
**Scope:** All 29 source files in `src/`, 4 scripts in `scripts/`, E2E test, configuration files

---

## Executive Summary

After 13 previous review cycles and extensive remediation, the codebase is in excellent shape. TypeScript (`tsc --noEmit`) and ESLint both pass cleanly with zero errors. This cycle performed a full re-read of every source file, cross-referencing all previously deferred findings and verifying all previously fixed items. **One new finding** was identified at LOW severity. No security vulnerabilities, data-loss risks, or correctness bugs were found. The codebase is production-quality and has reached diminishing returns for further review.

---

## NEW-C16-1: GoogleGuide tab panel lacks `tabIndex={0}` on the tabpanel element for keyboard accessibility

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/GoogleGuide.tsx:310`
- **Problem:** The `role="tabpanel"` div in GoogleGuide does not have `tabIndex={0}`. Per WAI-ARIA Authoring Practices for tabs, the tabpanel element should be focusable (`tabIndex="0"`) so that keyboard users can tab into the panel content after selecting a tab. Without it, the tabpanel content is not directly reachable via Tab key navigation -- the focus skips from the tab buttons directly to the first focusable child inside the panel (if any), or skips it entirely.
- **Failure scenario:** A keyboard-only user selects a tab in the Google Guide, then presses Tab. The focus moves unpredictably instead of landing on the tabpanel content, making it harder to read the guide content.
- **Fix:** Add `tabIndex={0}` to the `role="tabpanel"` div at line 310 of GoogleGuide.tsx.

---

## Verified Previously Fixed (Still Fixed)

All findings from cycles 1-13 were verified as still fixed during this review. Key previously fixed items confirmed:

| ID | Finding | Status |
|----|---------|--------|
| NEW-C15-1 | JourneyCreator search options always `aria-selected="false"` | Confirmed NOT ACTIONABLE (aria-selected required by spec) |
| NEW-C15-2 | ExportPanel bitrate readOnly lacks disabled semantics | Confirmed fixed (aria-disabled="true" added) |
| NEW-C14-1 | ElevationProfile SVG missing `role="img"` | Confirmed fixed |
| NEW-C13-2 | Render-phase ref assignment in JourneyCreator.tsx | Confirmed fixed |
| NEW-C12-1 | Ref updates during render (Toast.tsx, ModalDialog.tsx) | Confirmed fixed |
| NEW-C12-2 | setState-in-effect warnings (ExportPanel, GoogleGuide) | Confirmed fixed |
| NEW-C12-5 | Missing `aria-selected` on JourneyCreator options | Confirmed fixed |
| NEW-C12-6 | Missing `t` dependency in FileUpload handleDrop | Confirmed fixed |
| NEW-C11-1 | TimelineSelector distance-ratio mapping | Confirmed fixed |
| NEW-C11-2 | ExportPanel Share button silently fails | Confirmed fixed |
| NEW-C8-1 | Playback hotkeys not suppressed during export | Confirmed fixed |
| NEW-C9-1 | setExportState not guarded by mountedRef | Confirmed fixed |

---

## Deferred Findings (Carried Forward)

All 12 previously deferred findings remain deferred (F4, F5, F6, F7, F8, F9, F11, F12, F14, F16, NEW-R3-2, NEW-C12-7, NEW-C13-1). No changes to deferral status.

---

## Specialist Angle Reviews

### Code Quality & Maintainability
- Clean component decomposition with 16 well-scoped React components
- Custom hooks (`useExportController`, `usePlaybackController`) properly separate concerns
- Type safety is thorough with TypeScript strict mode
- All `eslint-disable` comments include rationale
- No code duplication concerns
- Parser handles 5+ Google Location History formats robustly

### Security
- CSP is properly configured with `harden-static-export.mjs` post-processing
- CSP includes script hash computation for inline scripts
- No secrets or credentials in source
- No user-generated content rendered without sanitization
- File upload validates extensions and size
- No inline event handlers or `eval` patterns
- All external links use `rel="noopener noreferrer"`
- Static server includes comprehensive security headers (X-Content-Type-Options, X-Frame-Options, HSTS, COOP, CORP, Permissions-Policy)
- Path traversal protection in serve-static.mjs via `isInside()` check

### Performance
- Worker-based parsing for large JSON files
- `requestAnimationFrame` used for drag interactions
- `useMemo` for expensive computations (cumulative distances, histogram buckets)
- `useCallback` with proper dependency arrays throughout
- `memo` wrapping on TimelineSelector and SceneEditor
- No unnecessary re-renders detected
- Playback animation uses refs to avoid re-renders on every frame

### Accessibility
- Proper ARIA roles on modals, dialogs, tabs, combobox
- Focus trap implementation in ModalDialog with tab cycling
- Keyboard shortcuts with proper suppression during input focus
- `role="img"` on ElevationProfile SVG
- `prefers-reduced-motion` media query for animations
- Min 44px touch targets throughout
- `aria-disabled="true"` on ExportPanel bitrate input

### Architecture
- Clean separation: types, lib utilities, components, hooks
- i18n fully typed with TranslationKey
- Camera system well-abstracted with scene-based presets
- Map integration properly manages lifecycle and style changes
- Modal stack management with proper body overflow locking
- Worker fallback pattern for large file parsing

---

## Sweep: No Additional Files Skipped

All 29 source files in `src/` were reviewed. All 4 scripts in `scripts/` were reviewed. Configuration files (package.json, tsconfig.json, next.config.ts, eslint.config.mjs, playwright configs) were reviewed. No relevant files were skipped.

---

## Summary of New Actionable Findings

| ID | Finding | Severity | Confidence | Fix Effort |
|----|---------|----------|------------|------------|
| NEW-C16-1 | GoogleGuide tabpanel missing `tabIndex={0}` for keyboard accessibility | LOW | HIGH | Trivial |
