# Cycle 9 Aggregate Review (2026-04-27)

Consolidated from cycle9-focused-review-2026-04-27.md and prior cycle 8 aggregate.

---

## New Findings

### C9-F01 — MEDIUM — ElevationProfile SVG missing focus-visible indicator (WCAG 2.4.7)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/ElevationProfile.tsx:97-110`
- **Detail:** The SVG element has `role="slider"` and `tabIndex={0}` for keyboard accessibility, but no visible focus indicator. When a keyboard user tabs to the elevation profile, there is no visual ring or outline to indicate focus. This violates WCAG 2.4.7 (Focus Visible) and 2.4.11 (Focus Appearance).
- **Fix:** Add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` classes to the SVG element.
- **Cross-agent agreement:** New finding, consistent with prior C7-F06 (ElevationProfile SVG click padding — latent).

### C9-F02 — LOW-MEDIUM — Export progress bar lacks ARIA progressbar role (WCAG 4.1.2)

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:295-297`
- **Detail:** The export progress bar is a pair of `<div>` elements with no `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`. Screen readers cannot convey progress in the standard way.
- **Fix:** Add `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label` to the progress bar container.

### C9-F03 — LOW — TrackWorkspace `toLocaleString()` without explicit locale

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/TrackWorkspace.tsx:127,135`
- **Detail:** `track.points.length.toLocaleString()` and `fullTrack.points.length.toLocaleString()` use the browser's default locale instead of the app's selected locale, producing visual inconsistency.
- **Fix:** Pass `locale` prop to `toLocaleString(locale)`.

### C9-F04 — LOW — `loadTrackIntoSession` depends on `t` (same pattern as C8-F02)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:274-284`
- **Detail:** `loadTrackIntoSession` includes `t` in its dependency array solely for `setWorkspaceAnnouncement`. Same pattern that was fixed in C8-F02 for `useExportController`. Cascades to `handleTrackLoaded`, `handleJourneyComplete`, `handleLoadSample`.
- **Fix:** Use a `tRef` and read `tRef.current('app.trackLoaded')` inside the callback. Remove `t` from deps.

---

## Verified Already-Fixed (confirmed this cycle)

| ID | Original Severity | Verification |
|----|------------------|-------------|
| C8-F01 | MEDIUM | `elapsedSec=0` confirmed in transition-blending calls |
| C8-F02 | LOW-MEDIUM | `tRef` confirmed in useExportController, `t` removed from exportTrack deps |

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

C9-F01 (medium — add focus indicator to ElevationProfile SVG), C9-F02 (low-medium — add ARIA progressbar role to export progress bar), C9-F03 (low — pass locale to toLocaleString), C9-F04 (low — use tRef in loadTrackIntoSession)
