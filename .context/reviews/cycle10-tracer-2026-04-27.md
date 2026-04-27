# Cycle 10 Tracer Review — 2026-04-27

## Review Scope
Causal tracing of suspicious flows, competing hypotheses for latent bugs.

## Findings

### C10-T-01 — LOW-MEDIUM — `handleLoadSample` closes over `t` — cascade from C8-F02 / C9-F04

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:369-392`
- **Detail:** Tracing the `t` dependency through `page.tsx`: `handleLoadSample` -> `addToast(t('app.sampleLoadFailed'), 'error')`. The `t` function changes on every locale change (via `useLocale`), causing `handleLoadSample` to be recreated, which causes `FileUpload` to re-render (since `onLoadSample` prop changes). Same bug class as C8-F02 (useExportController) and C9-F04 (loadTrackIntoSession), both fixed with `tRef`.
- **Hypothesis:** This was likely missed during the C9 fix because C9-F04 only fixed `loadTrackIntoSession` (the callback named in the finding), but didn't audit all other callbacks in the same component.
- **Fix:** Use `tRef.current('app.sampleLoadFailed')` and remove `t` from deps.

### C10-T-02 — LOW — `confirmTrimClear` duplicates `handleRangeChange` slicing logic — latent drift risk

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:298-330, 332-355`
- **Detail:** Tracing the trim flow: (1) User drags timeline -> `handleRangeChange` -> if scenes exist, set `pendingTrimRange`. (2) User confirms -> `confirmTrimClear` -> clears scenes -> rebuilds same filtered track. The track-slicing logic is identical in both paths. If a bug fix is applied to one path but not the other, they will diverge.
- **Fix:** Extract shared `buildFilteredTrack` helper.

## Summary

| Severity | Count |
|----------|-------|
| LOW-MEDIUM | 1 |
| LOW | 1 |
