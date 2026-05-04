# Cycle 2 Implementation Plan — 2026-05-04

Based on cycle 2 aggregate review at `.context/reviews/_aggregate.md`.
New findings this cycle: 1 MEDIUM, 4 LOW (after verification of test-stub).

## Status of prior plan items (cycle1/cycle2 plans from 2026-04-27)

Cycle 1 commits (90f4840..ce0bc6c) completed these items:
- ErrorBoundary "Try Again" clears state (cycle 1 F14)
- wrapLngNear non-finite guard (cycle 1 F11)
- prefers-reduced-motion for button hover (cycle 1 F10 partial)
- i18n key parity tests (cycle 1 F9)
- Camera blending tests (cycle 1 F6 partial)

Remaining deferred items from cycle 1/2 plans carry forward unchanged.

---

## Phase 1 — Must-address (correctness)

### P01 — Fix export progress restoration overwriting success value (C2-F1)

- **Severity**: MEDIUM | **Confidence**: HIGH
- **Files**: `src/lib/useExportController.ts:254,306-307`
- **Issue**: On successful export, `setPlaybackProgress(1)` at line 254 (in the try block) is immediately overwritten by `setPlaybackProgress(preExportProgress)` at line 307 (in the finally block). The user sees progress jump backward after a successful export.
- **Fix**:
  1. Track whether export completed successfully using a variable scoped to the try/catch/finally.
  2. In the finally block, only restore preExportProgress when the export did NOT complete successfully (i.e., was aborted or errored).
  3. On success, keep progress at 1.
- **Effort**: Small
- **Status**: TODO

---

## Phase 2 — Test coverage gaps

### P02 — Add unit tests for ExportError class and estimateEncodedBytes (C2-F3)

- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/lib/videoEncoder.ts:14-21,46-48`
- **Issue**: `ExportError` class (constructor, code property) and `estimateEncodedBytes` (pure function) have no tests.
- **Fix**:
  1. Add test: `new ExportError('msg', 'CODE')` has correct name, message, code.
  2. Add test: `estimateEncodedBytes(60, 8)` returns expected value.
  3. Add test: `estimateExportMemoryBytes` with various configs.
- **Effort**: Small
- **Status**: TODO

### P03 — Add tests for scene preset generators (C2-F4)

- **Severity**: LOW | **Confidence**: HIGH
- **Files**: `src/lib/camera.ts:225-350`
- **Issue**: `generateDefaultScenes`, `generateSimpleFlyover`, `generateBirdeyeFlyover`, `generateDynamicScenes` have no tests.
- **Fix**:
  1. Add test: each generator returns a non-empty array of valid Scene objects.
  2. Add test: scenes have non-overlapping, monotonically increasing percent ranges.
  3. Add test: first scene starts at 0, last scene ends at 1.
  4. Add test: all scene IDs are unique.
- **Effort**: Small
- **Status**: TODO

---

## Phase 3 — Accessibility

### P04 — Verify marker pulse respects prefers-reduced-motion (C2-F5)

- **Severity**: LOW | **Confidence**: MEDIUM
- **Files**: `src/app/globals.css`, `src/components/MapView.tsx:974`
- **Issue**: The `.marker-pulse` CSS class may have an animation that is not covered by the `prefers-reduced-motion: reduce` media query added in cycle 1.
- **Fix**:
  1. Check globals.css for `.marker-pulse` animation.
  2. If it exists and is not covered by the reduced-motion rule, add the override.
  3. If the marker pulse is purely inline styles (as it appears from line 974-975 of MapView.tsx), no CSS fix is needed.
- **Effort**: Tiny
- **Status**: TODO

---

## Deferred findings (carried forward)

All deferred items from cycle 1/2 plans (2026-04-27) carry forward unchanged:
- N10 Scene normalization mutates user intent (product decision)
- N11 Map layer ownership boundaries (architectural refactor)
- N12 Session state coupling (page.tsx refactor)
- N17 Mobile dialog semantics (accessibility)
- N23 RTL unreadiness (no RTL locales)
- N30-N33 Various (infrastructure-dependent)

Additionally, the following cycle 2 findings are deferred:
- C2-F2 (test stub in production): **Already addressed** — test-stub.ts already checks for `localhost` and includes `console.warn`. Not a real issue.

## Quality gates

After each commit:
- `npm run lint` — must pass
- `npx tsc --noEmit` — must pass
- `npm run build` — must pass
- `npm run test` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji
