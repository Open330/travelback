# Cycle 11 Verifier — 2026-04-27

## Verification of prior claims

### V11-01 — DOCTYPE rejection claim: NOT VERIFIED

- **Claim:** `preflightXml` rejects XML with DOCTYPE declarations
- **Evidence:** `npx vitest run` shows 2 test failures for DOCTYPE rejection. The code strips DOCTYPE before checking, so the rejection path is dead code.
- **Verdict:** The claim is FALSE in practice. The security intent exists in code but the execution order subverts it.

### V11-02 — Export frame timing: VERIFIED

- **Claim:** `renderFrameAndWait` waits for MapLibre `render` event after `jumpTo`
- **Evidence:** Code at MapView.tsx:616-658 shows `map.once('render', onRender)` after `map.jumpTo()`, with a 5s timeout fallback and identical-state fast path.
- **Verdict:** VERIFIED

### V11-03 — Precomputed segments: VERIFIED

- **Claim:** Trail geometry uses precomputed segments to avoid per-frame wrapping
- **Evidence:** MapView.tsx:116-131 defines `precomputeWrappedSegments`, stored in `precomputedSegmentsRef`, used in both the React progress effect and `renderFrameAndWait`.
- **Verdict:** VERIFIED

### V11-04 — `isExporting` guard: VERIFIED

- **Claim:** MapView skips React-driven progress effects during export
- **Evidence:** MapView.tsx:1062-1063: `if (isExporting) return` at the top of the progress effect.
- **Verdict:** VERIFIED

### V11-05 — Gate status: 3 of 4 gates PASS

- **ESLint:** PASS (0 errors)
- **tsc --noEmit:** PASS (0 errors)
- **next build:** PASS
- **vitest run:** FAIL (2 test failures in parser DOCTYPE rejection)
