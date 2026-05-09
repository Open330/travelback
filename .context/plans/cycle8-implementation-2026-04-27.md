# Cycle 8 Implementation Plan — 2026-04-27

Derived from `.context/reviews/_aggregate.md` (cycle 8).

## Active findings to address this cycle

### 1. C8-F01 — MEDIUM — Fix scene transition blending bearing wobble

**Files:** `src/lib/camera.ts:436, 442`

**Problem:** In `computeCameraForProgress`, the transition-blending code at scene boundaries passes `elapsedSec` to `computeCameraForScene` for the previous/next scene's boundary camera. For rotation-dependent modes (orbit, overview, birdeye), this makes the lerp start/end points move with time, causing visible bearing wobble.

The gap-blending code (lines 393-395) already correctly uses `0` for `elapsedSec` in both boundary cameras.

**Fix:**
- Line 436: Change `computeCameraForScene(track, cumulDist, prevScene, 1.0, elapsedSec)` to `computeCameraForScene(track, cumulDist, prevScene, 1.0, 0)`
- Line 442: Change `computeCameraForScene(track, cumulDist, nextScene, 0.0, elapsedSec)` to `computeCameraForScene(track, cumulDist, nextScene, 0.0, 0)`

**Status:** DONE

---

### 2. C8-F02 — LOW-MEDIUM — Use tRef in useExportController exportTrack

**Files:** `src/lib/useExportController.ts`

**Problem:** `t` is in the dependency array of `exportTrack` useCallback. It changes on every locale change, causing the entire export callback to be recreated. The `t` function is only used in error/success toast messages (non-critical path). Using a ref pattern (same as `playbackProgressRef`) avoids unnecessary recreation.

**Fix:**
- Add `const tRef = useRef(t)` 
- Add `useEffect(() => { tRef.current = t }, [t])`
- Replace all `t(` calls inside `exportTrack` with `tRef.current(`
- Remove `t` from the `exportTrack` dependency array

**Status:** DONE

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

C8-F03: SceneEditor locale cascade (LOW/LOW) — exit: when locale changes cause perceptible UI lag. Not scheduling this cycle as it is an optimization, not a bug.

No new deferrals this cycle.
