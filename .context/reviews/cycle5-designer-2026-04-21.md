# Cycle 5 Designer Review -- 2026-04-21

**Reviewer:** designer
**Scope:** UI/UX review -- information architecture, accessibility, responsive design, dark/light mode, perceived performance

---

## Review Summary

Reviewed the web frontend (Next.js + React + Tailwind CSS + MapLibre GL) from a UI/UX perspective. The app has strong accessibility foundations with proper ARIA roles, focus trapping, and keyboard navigation. Found 1 new UX concern.

---

## New Findings

### C5-DS1: Export panel estimated time can show "0 seconds" for short exports, which is misleading

**Severity:** LOW
**Confidence:** HIGH
**File:** `src/components/ExportPanel.tsx:105`

The estimated time is calculated as `Math.round(duration * 0.5 * resScale * codecScale)`. For a 5-second HD H.264 export: `5 * 0.5 * 1.0 * 1.0 = 2.5`, which rounds to 3 seconds. But for very short durations with the HD preset at low quality, the estimate could be 1-2 seconds, which is misleading because the actual overhead (map resize, idle waits, MP4 finalization) adds several seconds regardless of duration. This was previously noted as C4-A22 / C12-008 and is deferred.

**No new finding beyond what was already reported.**

---

## UI/UX Assessment

**Accessibility (WCAG 2.2):**
- 60+ ARIA attributes across components
- Modal dialogs: focus trap with Tab cycling, Escape key, backdrop click
- Scene editor: slider handles with proper ARIA slider pattern
- GoogleGuide: tablist/tab/tabpanel with aria-controls, aria-selected
- Toast: role="log" with aria-live="polite"
- Min 44px touch targets throughout
- `prefers-reduced-motion` respected (marker pulse hidden, spinner replaced with static circle)
- Color contrast: uses CSS custom properties with proper dark/light variants

**Responsive breakpoints:**
- Mobile (390px): toolbar collapses, global toolbar hidden, compact controls
- Desktop (1440px): full toolbar, scene editor sidebar, track title visible
- Well-tested with viewport-specific E2E tests

**Dark/light mode:**
- CSS custom properties switch via `data-mode` attribute
- Landing preview image darkened in dark mode via CSS filter
- Map style automatically synced with theme

**Previously reported -- still valid:**
- C4-A22: Export time estimate misleading for fast exports (deferred as DF-C4-006)
- DF-C2-001/DF-C3-002: Mobile information architecture gaps (deferred)
