# Cycle 6 Implementation Plan — 2026-05-04

Based on cycle 6 aggregate review at `.context/reviews/_aggregate.md`.
New findings this cycle: 2 LOW style. All quality gates pass clean.
Cycle 5 plan items (P12, P13, P14) all completed.

---

## Phase 1 — Style fixes

### P15 — Fix JSX indentation in JourneyCreator search input (C6-F1)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/components/JourneyCreator.tsx:677-683`
- **Issue**: Aria attributes indented at 18 spaces instead of 16.
- **Fix**: Dedent by 2 spaces.
- **Effort**: Trivial
- **Status**: TODO

### P16 — Fix indentation in SceneEditor blend duration onChange (C6-F2)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/components/SceneEditor.tsx:528-529`
- **Issue**: onChange handler body indented at 6 spaces instead of 4.
- **Fix**: Re-indent to 4 spaces.
- **Effort**: Trivial
- **Status**: TODO

---

## Deferred findings (carried forward with exit criteria)

All items from cycles 1-5 carry forward unchanged:
- DEF-01 MapView.tsx monolith (Low — requires large refactor)
- DEF-02 No tests for MapView pure utilities (Low — blocked by DEF-01)
- DEF-03 No tests for export controller (Low — complex async testing)
- DEF-04 No tests for parseCoordinateQuery (Low — easy but low priority)
- DEF-05 mediabunny no explicit cleanup API (Info — library limitation)
- DEF-06 waitForIdle type mismatch (Info — no runtime impact)

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
| P15 — Fix JourneyCreator JSX indent | TODO | | |
| P16 — Fix SceneEditor onChange indent | TODO | | |