# Cycle 6 Designer Review -- 2026-04-23

**Reviewer:** designer
**Scope:** UI/UX, accessibility, responsive design, i18n, dark/light mode, WCAG 2.2

---

## Review Summary

UI/UX review of all interactive components. The app has comprehensive i18n support and good accessibility foundations. Found 1 new accessibility issue.

---

## New Findings

### C6-D1: SceneRangeEditor handle aria-valuetext uses hardcoded English -- same class as C5-F1

**Severity:** MEDIUM
**Confidence:** HIGH
**File:** `src/components/SceneEditor.tsx:175`

The SceneRangeEditor range handles have `aria-valuetext` that uses hardcoded English "start" and "end" labels:

```
aria-valuetext={`${Math.round(value * 100)}% ${type === 'start' ? 'start' : 'end'}`}
```

This was not fixed when C5-F1 addressed the parameter sliders. For a Korean screen reader user, the announcement would be "50% start" -- mixing Korean and English. This violates WCAG 2.2 SC 3.1.2 (Language of Parts).

**Fix:** Add `scenes.rangeStart` and `scenes.rangeEnd` translation keys to all 5 locales.

---

## Accessibility Verification

**ARIA patterns:**
- Map container uses `aria-hidden` when no track loaded
- Export overlay uses `data-disable-playback-hotkeys="true"` to suppress keyboard shortcuts
- Modal dialogs use `labelledBy` for accessible names
- SceneEditor sliders have `aria-label` and `aria-valuetext` (now i18n for parameter sliders)
- TimelineSelector handles have `role="slider"` with `aria-label`

**Responsive:**
- Mobile-first design with `sm:` breakpoint utilities
- Touch-friendly 44px minimum tap targets
- `isTouchDevice` detection for context-appropriate UI

**Dark/light mode:**
- CSS custom properties for all colors
- Bootstrap script reads localStorage + matchMedia to prevent flash
- Map style auto-switches with theme (when no explicit style choice)

**Previously reported -- still valid:**
- DF-C17-012: GoogleGuide tabs not keyboard accessible (LOW/HIGH)
- DF-C17-018: FileUpload drop zone focus indicator (LOW/MEDIUM)
