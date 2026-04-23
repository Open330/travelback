# Cycle r3 — test-engineer review (2026-04-23)

Scope: test coverage, flakiness risk, TDD opportunities.

## Findings

### R3-TE-1 (LOW, MEDIUM) — No direct test coverage for antimeridian-crossing interpolation
- **File**: nothing under `e2e/` exercises a track whose points straddle ±180° longitude.
- **Detail**: The project has antimeridian-aware math in `camera.ts` (`computeBoundingBox` shifted-longitude branch at :64-73) and `interpolate.ts` (`shortestLngDelta`, `normalizeLng`). A targeted unit test (or a static GPX fixture near the dateline) would protect this branch from regression. There is no `tests/` unit-test directory; all testing is Playwright E2E, so this would need a dateline-crossing fixture.
- **Schedule**: defer — test-addition requires a new fixture; lower priority than code fixes.

### R3-TE-2 (LOW, MEDIUM) — Export cancellation path not covered
- **File**: `src/lib/videoEncoder.ts:92-140` (try/finally completion flag).
- **Detail**: The `completed` flag behavior (skip finalize on abort) is a correctness-critical branch. No E2E test appears to cancel an export mid-flight.
- **Schedule**: defer — hard to test reliably in CI due to timing.

### R3-TE-3 (LOW, HIGH) — `navigator.canShare` Safari/iOS detection logic unit-testable
- **File**: `src/components/ExportPanel.tsx:152-164`.
- **Detail**: The `canShare` memo builds a fake `File` to probe. This could be abstracted into a pure function and unit-tested. Not a defect; an enhancement.
- **Schedule**: defer.

### R3-TE-4 (INFO, HIGH) — E2E suite at 53 tests, ~2.6 min runtime — within healthy range
- **Schedule**: N/A.

### R3-TE-5 (LOW, MEDIUM) — `smoothCameraState` has no test; its antimeridian branch is easy to regress
- **File**: `src/components/MapView.tsx:77-88`.
- **Detail**: If the deferred DF-R2-003 refactor happens, having a smoke test of the inline normalization would catch a copy-paste error.
- **Schedule**: defer — pair with DF-R2-003 when that unblocks.

## Final sweep

- No disabled / skipped Playwright tests (`test.skip`, `test.only`, `test.fixme` — grep clean).
- Playwright config uses `--ci` mode and static preview server — no flakiness from real-network dependencies.

## Recommendations

- All test-engineering findings are deferrable. No scheduled test-writing this cycle.
