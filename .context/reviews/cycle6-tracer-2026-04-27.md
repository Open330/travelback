# Tracer — Cycle 6 (2026-04-27)

## Causal trace of export visual correctness

### T6-01 — Export trail/marker freeze: causal chain from optimization to regression

- **Severity:** HIGH
- **Confidence:** High
- **Root cause chain:**
  1. CF5-02 identified O(n) trail rebuild on every frame.
  2. Optimization added: skip trail update when segment index unchanged (MapView.tsx:1023-1025).
  3. Additional optimization added: skip entire progress effect when `isExporting` (MapView.tsx:997-1001).
  4. The `isExporting` guard was intended to prevent "redundant state updates and React re-render overhead."
  5. But the guard skips ALL visual updates, not just the redundant camera update.
  6. The `renderFrameAndWait` method only updates the camera, NOT the trail/marker.
  7. The comment on line 999 incorrectly claims trail/marker are handled by `renderFrameAndWait`.
- **Competing hypothesis 1:** The `isExporting` guard was always intended to skip only camera updates, and the trail/marker omission is a bug. Evidence: the comment says "camera/trail/marker" but only camera is updated.
- **Competing hypothesis 2:** The export was designed to not update trail/marker, making the video intentionally show only the camera path. Evidence: none — no design doc or commit message supports this.
- **Verdict:** Hypothesis 1 is correct. The guard is a regression bug. The comment documents the intent but the implementation doesn't match.
- **Files:** `src/components/MapView.tsx:997-1004`, `src/components/MapView.tsx:512-589`

### T6-02 — `hadExistingExport` stale flag: causal trace of the misleading 'done' state

- **Severity:** MEDIUM
- **Confidence:** High
- **Root cause chain:**
  1. CF5-03 identified that a failed new export showed the old video in 'done' state.
  2. Fix: call `revokeExportedVideoUrl()` at the start of export (line 131).
  3. The `hadExistingExport` flag is captured before the revoke (line 121).
  4. On failure, `setExportState(hadExistingExport ? 'done' : 'idle')` uses the stale flag.
  5. Since the video was revoked, 'done' state shows an empty preview area.
- **Verdict:** The CF5-03 fix was incomplete. It prevented the old video from being displayed, but didn't update the state logic to account for the revoked video.
- **Files:** `src/lib/useExportController.ts:121, 131, 233`
