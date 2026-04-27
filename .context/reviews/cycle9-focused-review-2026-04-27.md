# Cycle 9 Focused Review (2026-04-27)

Reviewer: cycle-9-focused-review
Scope: Full codebase, emphasis on modified files and previously unfound issues.

---

## New Findings

### C9-F01 — MEDIUM — ElevationProfile SVG missing focus-visible indicator (WCAG 2.4.7)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/ElevationProfile.tsx:97-110`
- **Detail:** The SVG element has `role="slider"` and `tabIndex={0}` for keyboard accessibility, but no visible focus indicator. When a keyboard user tabs to the elevation profile, there is no visual ring or outline to indicate focus. This violates WCAG 2.4.7 (Focus Visible) and 2.4.11 (Focus Appearance).
- **Failure scenario:** A keyboard-only user presses Tab to navigate to the elevation profile. They cannot see which element has focus. They may not realize the chart is interactive (clickable for seek, arrow-key navigable).
- **Fix:** Add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` classes to the SVG element, consistent with the focus styles used on other interactive elements in the codebase (e.g., TimelineSelector handles, ExportPanel buttons).

### C9-F02 — LOW-MEDIUM — Export progress bar lacks ARIA progressbar role (WCAG 4.1.2)

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:295-297`
- **Detail:** The export progress bar is a pair of `<div>` elements styled to look like a progress bar. It has no `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, or `aria-valuemax` attributes. While the text "Rendering 50%" above it conveys the progress information, the bar itself is not semantically marked up as a progress indicator. Screen readers cannot convey the progress in the standard way for progress bars.
- **Failure scenario:** A screen reader user initiates an export. The progress text is announced as static text ("Rendering 50%"), but the progress bar widget semantics are missing. The user cannot use standard screen reader progress bar navigation (e.g., JAWS "announce progress bar") to monitor the export.
- **Fix:** Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label` to the progress bar container. Update `aria-valuenow` to `Math.round(exportProgress * 100)`.

### C9-F03 — LOW — TrackWorkspace `toLocaleString()` without explicit locale

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/TrackWorkspace.tsx:127,135`
- **Detail:** `track.points.length.toLocaleString()` and `fullTrack.points.length.toLocaleString()` are called without passing the app's chosen locale. This causes number formatting to use the browser's default locale instead of the user's selected locale, producing visual inconsistency (e.g., a Korean-language app displaying "1,234" instead of "1,234" or vice versa depending on browser locale).
- **Failure scenario:** User sets the app to Korean. Browser is set to English. Track point count "1,234" appears with English formatting (comma as thousands separator) instead of Korean formatting. Minor but inconsistent with the localized UI.
- **Fix:** Pass `locale` (already available as a prop) to `toLocaleString(locale)`. Change `track.points.length.toLocaleString()` to `track.points.length.toLocaleString(locale)` and similarly for `fullTrack.points.length.toLocaleString(locale)`.

### C9-F04 — LOW — `loadTrackIntoSession` depends on `t` (same pattern as C8-F02)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:274-284`
- **Detail:** `loadTrackIntoSession` includes `t` in its dependency array solely for `setWorkspaceAnnouncement(\`${t('app.trackLoaded')} ${nextTrack.name}\`)`. This causes unnecessary callback recreation on locale change, cascading to `handleTrackLoaded`, `handleJourneyComplete`, and `handleLoadSample`. Same pattern that was fixed in C8-F02 for `useExportController`.
- **Failure scenario:** User changes locale. Four callbacks are unnecessarily recreated. No visible bug, just unnecessary work. Same category as C8-F03 (SceneEditor locale cascade).
- **Fix:** Add a `tRef` (or use an existing locale ref) and read `tRef.current('app.trackLoaded')` inside `loadTrackIntoSession`. Remove `t` from the deps array.

---

## Verified Already-Fixed (confirmed this cycle)

| ID | Original Severity | Verification |
|----|------------------|-------------|
| C8-F01 | MEDIUM | `elapsedSec=0` confirmed in both transition-blending calls (camera.ts:439, 448) |
| C8-F02 | LOW-MEDIUM | `tRef` confirmed in useExportController.ts, `t` removed from exportTrack deps |

---

## Carried Forward (still open, not newly addressed)

| ID | Severity | Note |
|----|----------|------|
| AG6-05 | LOW-MEDIUM | Worker message validation |
| AG6-09 | LOW-MEDIUM | Bootstrap regex comments |
| AG6-10 | LOW | Unsafe type casts |
| AG6-11 | LOW | Stale frame logging |
| AG6-12 | LOW | Grid memo optimization |
| AG6-13 | LOW-MEDIUM | Buffer copy optimization |
| AG6-14 | LOW-MEDIUM | Normalization warnings specificity |
| AG6-15 | LOW-MEDIUM | Export progress bar transition |
| AG6-16 | LOW | Toast z-index overlap |
| AG6-17 | LOW | README accuracy |
| AG6-18 | MEDIUM | Camera unit test coverage |
| AG6-19 | MEDIUM | DEFERRED — architectural refactor |
| C7-F06 | LOW | ElevationProfile SVG click padding (latent) |
| C7-F07 | LOW | handleSearchSubmit guard (latent) |
| C8-F03 | LOW | SceneEditor locale cascade (optimization) |

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| MEDIUM | 1 | C9-F01 |
| LOW-MEDIUM | 1 | C9-F02 |
| LOW | 2 | C9-F03, C9-F04 |

## Actionable this cycle

C9-F01 (medium — add focus indicator to ElevationProfile SVG), C9-F02 (low-medium — add ARIA progressbar role to export progress bar)
