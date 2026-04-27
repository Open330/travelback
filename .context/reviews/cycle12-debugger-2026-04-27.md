# Cycle 12 Debugger Review — 2026-04-27

Reviewer: debugger
Scope: Latent bug surface, failure modes, regressions

## Findings

### DBG12-01 — `downloadVideo` user activation guard causes silent UX degradation

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:206-207`
- **Detail:** Same root cause as C12-CR-01. After any export taking > ~5 seconds, `navigator.userActivation.isActive` is `false`. The code skips `showSaveFilePicker` and uses the `<a>` fallback. The user sees their video auto-saved to Downloads with no choice of location. No error is thrown — the degradation is silent.
- **Failure scenario:** User exports a 2-minute video at 4K. After ~60 seconds of rendering, the video auto-downloads to their Downloads folder. They expected a save dialog to choose the destination.
- **Suggested fix:** Remove the `hasUserActivation` guard. Always try `showSaveFilePicker` first; the `catch` block handles rejection (including user cancellation and activation-required errors).

### DBG12-02 — `buildFilteredTrack` fallback returns wrong track on degenerate input

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:40-55`
- **Detail:** Same as C12-CR-02. The function returns the full track when the slice would be < 2 points. Currently unreachable but would produce incorrect map display if reached by new code.
- **Suggested fix:** Return `null` instead, forcing the caller to handle the degenerate case.

## Verified: no regressions from recent fixes

- parseXml ordering (C11-F01 fix): `preflightXml` correctly runs before `stripXmlEntities`.
- aria-valuenow clamp (commit 7107579): Progress bar correctly clamped.
- Time-based throttle (commit 037e47e): Uses `performance.now()` with 100ms interval.
- Degenerate GeoJSON fix (commit 9a943f3): `buildTrackGeometry` returns empty coordinates instead of `[undefined]`.
