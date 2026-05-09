# Cycle 12 Implementation Plan — 2026-04-27

Based on cycle 12 aggregate review at `.context/reviews/_aggregate.md`.
6 deduplicated findings (1 MEDIUM, 4 LOW, 1 INFO).

## Status of prior plan items (cycle11-implementation-2026-04-27.md)

All prior plan items (11P01-11P02) are DONE. C11-F01 was fixed in commit 39650f4. C11-F02 was confirmed NOT A BUG.

## New plan items from cycle 12 reviews

---

### 12P01 — Fix `downloadVideo` user activation guard (C12-F01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:206-207`
- **Fix:**
  1. Remove the `hasUserActivation` guard (`const hasUserActivation = typeof navigator.userActivation === 'undefined' || navigator.userActivation.isActive`).
  2. Always attempt `showSaveFilePicker` when the API is available (`'showSaveFilePicker' in window`).
  3. The existing `catch` block already handles `AbortError` (user cancelled) and any other errors (falling through to the `<a>` download).
  4. If the browser requires user activation and it's not available, the `showSaveFilePicker` call will throw a `DOMException` with `name === 'SecurityError'` or `NotAllowedError`, which is caught by the existing catch block. No new error handling needed.
- **Effort:** Tiny
- **Status:** DONE — commit f258dae

---

### 12P02 — Throttle `setExportProgress` with time-based interval (C12-F02)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:214`
- **Fix:**
  1. Apply the same time-based throttle pattern used for playback progress (100ms interval) to the `setExportProgress` callback.
  2. Specifically, in the `onProgress` callback passed to `exportVideo`, check `performance.now() - lastProgressUpdateTimeRef.current >= 100` before calling `setExportProgress(nextProgress)`.
  3. This can be combined with the existing playback progress throttle since both use `lastProgressUpdateTimeRef`.
- **Effort:** Small
- **Status:** DONE — commit dea8f74

---

### 12P03 — Fix `buildFilteredTrack` degenerate fallback (C12-F03)

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/app/page.tsx:40-55`
- **Fix:**
  1. Change `buildFilteredTrack` to return `null` when `slicedPoints.length < 2` instead of returning the full track.
  2. Update the return type from `Track` to `Track | null`.
  3. Update callers (`handleRangeChange`, `confirmTrimClear`) to handle the `null` case (they already guard with `if (slicedPoints.length < 2) return`, so the `null` path is never reached, but the type system will enforce correct handling in future callers).
- **Effort:** Tiny
- **Status:** DONE — commit 2a0c797

---

### 12P04 — Add smooth CSS transition to export progress bar (C12-F04)

- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/components/ExportPanel.tsx:297`
- **Fix:**
  1. Add `transition: 'width 100ms linear'` to the progress bar inner div style.
  2. Verify the transition does not interfere with the progress bar reaching 100% at the end of export (the transition should be complete by the time the done state appears).
- **Effort:** Tiny
- **Status:** DONE — commit 88c7399

---

## Deferred findings (from this cycle and carried forward)

| ID | Issue | Reason for deferral | Exit criterion |
|----|-------|---------------------|----------------|
| C12-F05 | No test for `downloadVideo` | Requires JSDOM mocking of `showSaveFilePicker` and `navigator.userActivation`; the function primarily interacts with browser APIs that are hard to mock reliably in jsdom | Add browser API mocks to test infrastructure |
| C12-F06 | Diminishing review returns | Process observation, not a code issue | Accept as known pattern |
| AG6-05 | Worker message validation | Same-origin worker boundary mitigates | Extract shared module |
| AG6-09 | Bootstrap regex comments | Documentation only | Add comments |
| AG6-10 | Unsafe type casts | Low risk, requires type narrowing | Add type guards |
| AG6-11 | Stale frame logging | Debugging aid, not user-facing | Accept or remove |
| AG6-12 | Grid memo optimization | Low priority optimization | Memoize grid data |
| AG6-13 | Buffer copy optimization | Worker memory isolation | Profile and optimize |
| AG6-14 | Normalization warnings specificity | UX improvement | Show per-scene diffs |
| AG6-15 | Export progress bar transition | Being addressed by 12P04 | Close after 12P04 |
| AG6-16 | Toast z-index overlap | Low priority UX | Adjust z-index |
| AG6-17 | README accuracy | Documentation | Update README |
| AG6-18 | Camera unit test coverage | Test infrastructure needed | Add camera tests |
| AG6-19 | Architectural refactor | Large scope | Extract session reducer |
| C7-F06 | ElevationProfile SVG click padding | Latent, low impact | Add click padding |
| C7-F07 | handleSearchSubmit guard | Latent, low impact | Add guard |
| C8-F03 | SceneEditor locale cascade | Optimization | Cache locale |
| C10-F01 | handleLoadSample tRef pattern | Fixed in commit b35dbec | CLOSE — fixed |
| C10-F02 | Duplicated track-slicing logic | Low risk, requires refactor | Extract utility |
| C10-F03 | Degenerate GeoJSON fallback | Fixed in commit 9a943f3 | CLOSE — fixed |
| C10-F04 | Time-based export throttle | Fixed in commit 037e47e | CLOSE — fixed |
| C10-F05 | aria-valuenow clamp | Fixed in commit 7107579 | CLOSE — fixed |
| C10-F06 | Antimeridian unit tests | Test coverage | Add test fixtures |
| C10-F07 | Segment-remapping unit tests | Test coverage | Add tests |
| C10-F08 | Swipe dismiss visual affordance | UX improvement | Add affordance |
| C10-F09 | FileUpload tabIndex/aria-label | A11y improvement | Add attributes |
| C10-F10 | Cumulative distances recomputation | Optimization | Cache distances |

Note: C10-F01, C10-F03, C10-F04, C10-F05 were fixed in prior cycles and should be closed in the deferred list.

## Implementation order

1. **12P01** — Fix `downloadVideo` user activation guard (MEDIUM, tiny)
2. **12P02** — Throttle `setExportProgress` (LOW, small)
3. **12P03** — Fix `buildFilteredTrack` degenerate fallback (LOW, tiny)
4. **12P04** — Add progress bar CSS transition (LOW, tiny)

## Quality gates

After each commit:
- `npm run lint` — must pass (0 errors)
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npx vitest run` — must pass (112/112 tests)
- `git commit -S` — GPG-signed with conventional commit + gitmoji
