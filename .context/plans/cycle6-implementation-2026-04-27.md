# Cycle 6 Implementation Plan — 2026-04-27

Based on cycle 6 aggregate review at `.context/reviews/_aggregate.md`.

## Plan structure

Each finding below has: severity, file/region, fix description, and effort estimate.

## Actionable this cycle (ordered by severity then dependency)

---

### P01 — Export trail/marker freeze: update trail and marker imperatively in `renderFrameAndWait` (AG6-01, AG6-06, AG6-08)

- **Severity:** HIGH
- **File region:** `src/components/MapView.tsx:512-589`, `src/components/MapView.tsx:997-1004`
- **Fix:**
  1. Extend `renderFrameAndWait` to accept `progress` and `track` info (via refs already available in the component) so it can update trail source and marker position imperatively before waiting for the render event.
  2. Extract the trail/marker update logic from the progress effect into a reusable `applyProgressVisuals(map, track, cumulDist, progress, precomputedSegments, lastTrailSegmentIndexRef)` function.
  3. Call this function from both the progress effect AND `renderFrameAndWait`.
  4. Update the comment on line 998-999 to accurately reflect the new contract.
  5. Keep the `isExporting` guard to skip camera computation (already handled by `renderFrameAndWait`) but NOT trail/marker updates. Actually, since `renderFrameAndWait` will handle everything imperatively, the entire progress effect can remain gated during export — the key is that `renderFrameAndWait` now does ALL visual updates, not just camera.
- **Effort:** Medium

---

### P02 — Fix stale `hadExistingExport` flag: always show 'idle' on export failure (AG6-02)

- **Severity:** MEDIUM
- **File region:** `src/lib/useExportController.ts:233`
- **Fix:**
  1. Change `setExportState(hadExistingExport ? 'done' : 'idle')` to `setExportState('idle')` in the catch block.
  2. Since `revokeExportedVideoUrl()` was called at export start, there is never a valid video to show in 'done' state on failure.
- **Effort:** Tiny

---

### P03 — Camera gap transition: lerp from last scene to follow camera in after-last-scene gap (AG6-03)

- **Severity:** MEDIUM
- **File region:** `src/lib/camera.ts:401-402`
- **Fix:**
  1. When `prevIdx >= 0 && nextIdx === -1` (after-last-scene gap), compute the last scene's end camera and the default follow camera, then lerp between them based on gap progress.
  2. Use the same lerp pattern as the between-scenes gap: `gapT = (globalProgress - prevScene.endPercent) / (1.0 - prevScene.endPercent)`, clamped to [0, 1].
- **Effort:** Small

---

### P04 — Remove production debug camera URL parameter escape hatch (AG6-04)

- **Severity:** MEDIUM
- **File region:** `src/components/MapView.tsx:717-720`
- **Fix:**
  1. Remove `|| debugParams.get('__travelbackDebug') === '1'` from the condition.
  2. Also remove the `debugStorageEnabled` / localStorage check (lines 711-716) since it's already dead code per the review.
  3. Keep only `process.env.NODE_ENV === 'development'` guard.
- **Effort:** Tiny

---

### P05 — Add worker message validation (AG6-05)

- **Severity:** LOW-MEDIUM
- **File region:** `src/lib/parser.ts:643-673`
- **Fix:**
  1. Validate that `event.data` exists and is an object before accessing properties.
  2. If neither `error` nor `track` is present and no fallback buffer, reject with a specific error message.
  3. If `error` is present but not a string, coerce to string.
- **Effort:** Small

---

### P06 — Move `playbackProgress` to ref in `exportTrack` dependency array (AG6-07)

- **Severity:** LOW-MEDIUM
- **File region:** `src/lib/useExportController.ts:262`
- **Fix:**
  1. Add a `playbackProgressRef` that mirrors `playbackProgress` via a useEffect.
  2. In `exportTrack`, read `playbackProgressRef.current` instead of closing over `playbackProgress`.
  3. Remove `playbackProgress` from the `exportTrack` dependency array.
- **Effort:** Small

---

### P07 — Add inline rationale for `harden-static-export.mjs` bootstrap inlining regex (AG6-09)

- **Severity:** LOW-MEDIUM
- **File region:** `scripts/harden-static-export.mjs:74-75`
- **Fix:**
  1. Add comments above the regex explaining: what it matches, expected Next.js output format, failure modes, and why inlining is necessary for CSP.
- **Effort:** Tiny

---

### P08 — Improve normalization warning specificity (AG6-14)

- **Severity:** LOW-MEDIUM
- **File region:** `src/components/SceneEditor.tsx:268-289`
- **Fix:**
  1. Instead of generic "ranges adjusted", compare each scene's start/end before and after normalization and list specific adjustments.
  2. For example: "Scene X start moved from 15% to 20%" or "Scene X end moved from 80% to 75%".
- **Effort:** Small

---

### P09 — Remove export progress bar transition during active export (AG6-15)

- **Severity:** LOW-MEDIUM
- **File region:** `src/components/ExportPanel.tsx:296`
- **Fix:**
  1. Remove `transition: 'width .05s linear'` from the progress bar during active export.
  2. Only apply a transition on the final jump to 100% (or no transition at all — the bar width is already updated per-frame).
- **Effort:** Tiny

---

## Deferred findings (require larger refactors, test infrastructure, or product decisions)

| ID | Issue | Reason for deferral | Exit criterion |
|-----|-------|---------------------|----------------|
| AG6-08 | Double camera computation | Resolved by P01 (renderFrameAndWait handles everything) | P01 implemented |
| AG6-10 | downloadVideo unsafe type casts | LOW, API compatibility risk | Type narrowing with `in` operator |
| AG6-11 | renderFrameAndWait silent timeout | LOW, observability only | Add console.warn on timeout |
| AG6-12 | referenceGridData recomputation | LOW, optimization | Hash-based memo key |
| AG6-13 | Fallback buffer memory doubling | LOW-MEDIUM, design tradeoff | Transferable or lower threshold |
| AG6-16 | Toast z-index overlaps modals | LOW, UX polish | Reduce z-index or add data-modal-open |
| AG6-17 | README export capabilities | LOW, documentation | Verify and update |
| AG6-18 | Camera test coverage | MEDIUM, test infrastructure | Add gap/transition/blend tests |
| AG6-19 | useExportController split | MEDIUM, architectural refactor | Split into focused hooks |

## Implementation order

1. **P02** (stale hadExistingExport) — trivial, one-line fix
2. **P04** (remove debug URL param) — trivial, small scope
3. **P07** (harden-static-export regex comments) — trivial, docs only
4. **P09** (remove progress bar transition) — trivial, CSS tweak
5. **P05** (worker message validation) — small, safety improvement
6. **P06** (playbackProgress ref) — small, performance fix
7. **P03** (camera gap lerp) — small, camera.ts only
8. **P08** (normalization warning specificity) — small, SceneEditor only
9. **P01** (export trail/marker freeze) — medium, core fix

## Quality gates

After implementation:
- `npx eslint src/` — must pass
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- GPG-signed commits with conventional commit + gitmoji
