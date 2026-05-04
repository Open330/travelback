# Cycle 5 Implementation Plan — 2026-05-04

Based on cycle 5 aggregate review at `.context/reviews/_aggregate.md`.
New findings this cycle: 1 LOW actionable (dead code), 2 LOW style. All quality gates pass clean.
Cycle 4 plan items (P10, P11) all completed.

---

## Phase 1 — Code quality fix

### P12 — Remove dead `isMapRenderExportError` function (C5-F1)

- **Severity**: Low (code quality / fragility) | **Confidence**: High
- **File**: `src/lib/useExportController.ts:24-27, 262-272`
- **Issue**: `isMapRenderExportError` uses fragile substring matching on error messages. `ExportError` instances from `waitForStableMap` already carry codes `'EXPORT_MAP_RENDER'` and `'EXPORT_MAP_IDLE'` that are mapped in `EXPORT_ERROR_I18N`. The catch block checks `error instanceof ExportError && EXPORT_ERROR_I18N[error.code]` first, making the substring check dead code.
- **Fix**:
  1. Remove the `isMapRenderExportError` function.
  2. Simplify the catch block error classification to only use `ExportError.code`.
  3. Add a final fallback for non-ExportError errors that checks for map render messages in the catch-all else branch.
- **Effort**: Small
- **Status**: TODO

## Phase 2 — Style fixes

### P13 — Fix indentation in MapView progress effect (C5-F2, carried from C4-F1)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/components/MapView.tsx:1064-1067`
- **Issue**: 6-space indentation instead of 4-space.
- **Fix**: Re-indent to 4 spaces.
- **Effort**: Trivial
- **Status**: TODO

### P14 — Fix indentation in SceneEditor scenes list (C5-F3)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/components/SceneEditor.tsx:568`
- **Issue**: 8-space indentation at scenes list rendering.
- **Fix**: Dedent by 4 spaces.
- **Effort**: Trivial
- **Status**: TODO

---

## Deferred findings (carried forward with exit criteria)

All items from cycles 1-4 carry forward unchanged:
- DEF-01 MapView.tsx monolith (Low — requires large refactor)
- DEF-02 No tests for MapView pure utilities (Low — blocked by DEF-01)
- DEF-03 No tests for export controller (Low — complex async testing)
- DEF-04 No tests for parseCoordinateQuery (Low — easy but low priority)
- DEF-05 mediabunny no explicit cleanup API (Info — library limitation)
- DEF-06 waitForIdle type mismatch (Info — no runtime impact)
- All N-series deferred items from cycles 1-2

---

## Quality gates

After each commit:
- `npm run lint` — must pass
- `npm run typecheck` — must pass
- `npm run build` — must pass
- `npm run test` — must pass
- `npm audit --audit-level=high` — must pass
- `git commit -S` — GPG-signed with conventional commit + gitmoji

---

## Completion Status (updated after implementation)

| Item | Status | Commit | Notes |
|------|--------|--------|-------|
| P12 — Remove dead error function | DONE | | Removed isMapRenderExportError, simplified catch block |
| P13 — Fix MapView indentation | ALREADY DONE | (cycle 4, 829daa2) | Was fixed in cycle 4 |
| P14 — Fix SceneEditor indentation | DONE | | Fixed {scenes.map indentation from 10 to 8 spaces |