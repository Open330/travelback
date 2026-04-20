# Cycle 3 Aggregate Review -- 2026-04-21

**Date:** 2026-04-21
**Source reviews:** `cycle3-composite-2026-04-21.md`

---

## Summary

Deep review focused on 4 user-reported issues: broken UI color scheme on initial load, theme toggle required for correct display, UI button overlap, and map not loading. Review combined full source code analysis with live browser testing (dev server + production static export).

**13 new findings** this cycle, with 5 HIGH severity issues.

---

## New Findings

| ID | Finding | Severity | Confidence | User Issue |
|----|---------|----------|------------|------------|
| U1-1 | React hydration strips `data-mode` from `<html>` because server render doesn't include it | HIGH | HIGH | #1, #2 |
| U1-2 | Body `style="background:var(--bg);color:var(--t1)"` has no CSS fallback values | MEDIUM | HIGH | #1 |
| U1-3 | CSS layer ordering (`layer(base)`) may deprioritize Vitro theme variables vs unlayered CSS | LOW | MEDIUM | #1 |
| U2-1 | Same root cause as U1-1: hydration gap causes theme flash | HIGH | HIGH | #2 |
| U2-2 | ThemeToggle `detectInitialMode()` mutates DOM during render phase (line 23 sets `data-mode`) | MEDIUM | HIGH | #2 |
| U3-1 | GlobalToolbar (`z-10`) hidden behind FileUpload overlay (`z-10`) -- same z-index, DOM order loses | MEDIUM | HIGH | #3 |
| U3-2 | Mobile users lose theme/locale access when track loaded (GlobalToolbar `hidden` on <640px) | MEDIUM | MEDIUM | #3 |
| U3-3 | TrackToolbar and track title potential overlap on large screens | LOW | LOW | #3 |
| U4-1 | Map style fetch failure is silent -- MapLibre `error` event not listened to | HIGH | HIGH | #4 |
| U4-2 | Map style URL path may be wrong depending on hosting configuration | HIGH | MEDIUM | #4 |
| U4-3 | Map container has `inert` when no track loaded (by design, not a bug) | LOW | HIGH | #4 |
| A2 | `next/image` for static SVG adds unnecessary wrapper and LCP warning | LOW | HIGH | - |
| A3 | `<select>` dropdown doesn't match dark theme (native OS rendering) | LOW | MEDIUM | - |

---

## Cross-Finding Analysis

**U1-1 + U2-1 are the same root cause:** The `<html>` element in the server render lacks `data-mode`. The bootstrap script adds it, but React hydration removes it because its virtual DOM doesn't include it. The `useEffect` re-applies it, creating a flash. Fix: add `data-mode` to the `<html>` server render.

**U3-1 + U3-2 are related:** Both stem from the GlobalToolbar's z-index and visibility logic. The toolbar is hidden on mobile when a track is loaded, and obscured by the file upload overlay on desktop when no track is loaded. Fix: raise GlobalToolbar z-index above the upload overlay.

**U4-1 + U4-2 are related:** Both affect map loading reliability. The map style URL works for GitHub Pages but may fail on other hosting. The silent failure means users see a blank map with no explanation. Fix: add MapLibre `error` event listener.

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

---

## Agent Failures

None.
