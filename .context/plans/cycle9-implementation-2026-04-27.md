# Cycle 9 Implementation Plan — 2026-04-27

Derived from `.context/reviews/_aggregate.md` (cycle 9).

## Active findings to address this cycle

### 1. C9-F01 — MEDIUM — Add focus-visible indicator to ElevationProfile SVG

**Files:** `src/components/ElevationProfile.tsx:97-110`

**Problem:** The SVG element has `role="slider"` and `tabIndex={0}` but no visible focus indicator. When a keyboard user tabs to the elevation profile, there is no visual ring or outline. This violates WCAG 2.4.7 (Focus Visible).

**Fix:** Add Tailwind focus-visible outline classes to the SVG element, consistent with other interactive elements:
- Add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to the SVG className

**Status:** TODO

---

### 2. C9-F02 — LOW-MEDIUM — Add ARIA progressbar role to export progress bar

**Files:** `src/components/ExportPanel.tsx:295-297`

**Problem:** The export progress bar is a pair of `<div>` elements with no `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`. Screen readers cannot convey progress in the standard way.

**Fix:** On the progress bar container div (the one with `h-3 w-full overflow-hidden rounded-full`):
- Add `role="progressbar"`
- Add `aria-valuenow={Math.round(exportProgress * 100)}`
- Add `aria-valuemin={0}`
- Add `aria-valuemax={100}`
- Add `aria-label={t('export.rendering')}`

**Status:** TODO

---

### 3. C9-F03 — LOW — Pass locale to toLocaleString in TrackWorkspace

**Files:** `src/components/TrackWorkspace.tsx:127,135`

**Problem:** `track.points.length.toLocaleString()` and `fullTrack.points.length.toLocaleString()` use the browser's default locale instead of the app's selected locale.

**Fix:** Change `track.points.length.toLocaleString()` to `track.points.length.toLocaleString(locale)` and `fullTrack.points.length.toLocaleString()` to `fullTrack.points.length.toLocaleString(locale)`.

**Status:** TODO

---

### 4. C9-F04 — LOW — Use tRef in loadTrackIntoSession

**Files:** `src/app/page.tsx:274-284`

**Problem:** `loadTrackIntoSession` includes `t` in its dependency array solely for `setWorkspaceAnnouncement(\`${t('app.trackLoaded')} ${nextTrack.name}\`)`. Same pattern fixed in C8-F02 for useExportController. Cascades to `handleTrackLoaded`, `handleJourneyComplete`, `handleLoadSample`.

**Fix:**
- Add `const tRef = useRef(t)` 
- Add `useEffect(() => { tRef.current = t }, [t])`
- Replace `t('app.trackLoaded')` with `tRef.current('app.trackLoaded')` inside `loadTrackIntoSession`
- Remove `t` from `loadTrackIntoSession` dependency array

**Status:** TODO

---

## Deferred findings (not scheduled this cycle)

All prior deferred items remain deferred per their existing exit criteria.

From prior cycles:
- AG6-05: Worker message validation (LOW-MEDIUM/HIGH) — exit: when worker receives untrusted input from postMessage
- AG6-09: Bootstrap regex comments (LOW-MEDIUM/HIGH) — exit: when regex fails to match in production
- AG6-10: Unsafe type casts (LOW/LOW) — exit: when TS strict mode upgrade
- AG6-11: Stale frame logging (LOW/LOW) — exit: when frame debugging is needed
- AG6-12: Grid memo optimization (LOW/LOW) — exit: when grid computation shows on profiler
- AG6-13: Buffer copy optimization (LOW-MEDIUM/LOW) — exit: when large JSON import perf is a user complaint
- AG6-14: Normalization warnings specificity (LOW-MEDIUM/LOW) — exit: when users report confusing warnings
- AG6-15: Export progress bar transition (LOW-MEDIUM/LOW) — exit: when CSS transition causes visual glitch
- AG6-16: Toast z-index overlap (LOW/LOW) — exit: when toast is obscured during export
- AG6-17: README accuracy (LOW/LOW) — exit: when next docs pass
- AG6-18: Camera unit test coverage (MEDIUM/MEDIUM) — exit: when camera behavior regresses without detection
- AG6-19: Architectural refactor of useExportController (MEDIUM/DEFERRED) — exit: when callback deps cause real bugs
- C7-F06: ElevationProfile SVG click padding (LOW/latent) — exit: when CSS padding is added to the SVG
- C7-F07: handleSearchSubmit guard redundant (LOW/latent) — exit: when search becomes toggleable without UI guard
- C8-F03: SceneEditor locale cascade (LOW/LOW) — exit: when locale changes cause perceptible UI lag

No new deferrals this cycle.
