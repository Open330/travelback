# Multi-Perspective Critique — Travelback (Cycle 1, 2026-05-04)

**Reviewer**: critic
**Scope**: Cross-cutting concerns, UX gaps, inconsistencies

## Findings

### CT-01: User perspective — Export codec selection exposes technical jargon
**Perspective**: User
**Severity**: Medium
**File**: `src/components/ExportPanel.tsx`, `src/lib/i18n.ts`
**Description**: Codec options show "H.264 (MP4)", "H.265/HEVC (MP4)", "AV1 (MP4)" — technical codec names that most users won't understand. The quality presets (Low/Medium/High/Maximum) are more user-friendly but are hidden in the Advanced section.
**Recommendation**: Lead with quality presets, make codec selection a "for experts" option.

### CT-02: Developer perspective — Inconsistent error handling patterns
**Perspective**: Developer
**Severity**: Medium
**File**: Various
**Description**: Three different error handling patterns coexist: ParseError with codes (parser.ts), ExportError with codes (videoEncoder.ts), and plain Error throws (camera.ts). Error mapping to i18n keys is done in different places (FileUpload for parse errors, useExportController for export errors).
**Recommendation**: Standardize on coded errors with a shared i18n mapping pattern.

### CT-03: Accessibility — Focus management on track load
**Perspective**: Accessibility
**Severity**: Medium
**File**: `src/app/page.tsx:234-243`
**Description**: When a track loads, focus is moved to the first workspace control via `pendingWorkspaceFocus`. This is good a11y. However, if no track controls are found (unlikely but possible), focus falls to `workspaceStatusRef` which has `tabIndex={-1}` — it's focusable programmatically but not via Tab.
**Recommendation**: The fallback to `workspaceStatusRef` is correct (live region announces the load). No change needed.

### CT-04: Consistency — CSS class naming convention inconsistency
**Perspective**: Developer
**Severity**: Low
**File**: Various components
**Description**: Components use a mix of Tailwind utility classes and custom CSS classes like `gc`, `gi`, `go`, `vitro-btn-primary`. These short class names are not self-documenting and require knowledge of the global CSS to understand.
**Recommendation**: Document these class names in the conventions file or rename to more descriptive names.

### CT-05: i18n — No RTL support
**Perspective**: Accessibility/Internationalization
**Severity**: Low
**File**: `src/lib/i18n.ts`
**Description**: The app supports 5 locales (en, ko, ja, zh, es) but none are RTL languages. If Arabic or Hebrew support is added in the future, significant layout work would be needed. This is currently not an issue.
**Recommendation**: No action needed now. Note for future RTL support.

### CT-06: Edge case UX — Empty state after track clear
**Perspective**: User
**Severity**: Low
**File**: `src/app/page.tsx`
**Description**: When the user starts a new journey session (`startFreshJourneySession`), the track is cleared and JourneyCreator activates. The transition is clean. However, if the user cancels the journey, they return to the empty landing state — any previous track is gone.
**Recommendation**: Consider a "restore previous track" option after journey cancellation.

### CT-07: Developer experience — Large component prop interfaces
**Perspective**: Developer
**Severity**: Medium
**File**: `src/components/TrackWorkspace.tsx`
**Description**: TrackWorkspace receives ~25 props from page.tsx. This makes the component hard to refactor and creates tight coupling.
**Recommendation**: Group related props into sub-interfaces or use context.

### CT-08: Progressive enhancement — App requires JavaScript
**Perspective**: Accessibility
**Severity**: Low
**File**: `src/app/layout.tsx`
**Description**: The app is entirely client-side with no SSR content. Without JavaScript, users see nothing. This is acceptable for a web application that inherently requires JS for its core functionality (map rendering, video export).
**Recommendation**: Consider a minimal noscript message.

## Summary

| Severity | Count |
|----------|-------|
| High     | 0     |
| Medium   | 4     |
| Low      | 4     |
