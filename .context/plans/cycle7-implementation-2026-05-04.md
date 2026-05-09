# Cycle 7 Implementation Plan — 2026-05-04

Based on cycle 7 aggregate review at `.context/reviews/_aggregate.md`.
New findings this cycle: 2 LOW style, 1 LOW accessibility, 1 LOW test gap.
Cycle 6 plan items (P15, P16) all completed.

---

## Phase 1 — Style fixes

### P17 — Fix extra blank line in useExportController.ts (C7-F1)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/lib/useExportController.ts:117-118`
- **Issue**: Double blank line between callbacks.
- **Fix**: Remove the extra blank line.
- **Effort**: Trivial
- **Status**: TODO

### P18 — Fix indentation in FileUpload overlay container (C7-F2)

- **Severity**: Low (style) | **Confidence**: High
- **File**: `src/components/FileUpload.tsx:175-176`
- **Issue**: tabIndex and className indented at 10 spaces vs surrounding 6 spaces.
- **Fix**: Dedent by 4 spaces.
- **Effort**: Trivial
- **Status**: TODO

---

## Phase 2 — Accessibility fix

### P19 — Add prefers-reduced-motion media query (C7-DES1)

- **Severity**: Low (accessibility) | **Confidence**: High
- **File**: `src/app/globals.css`
- **Issue**: No reduced-motion overrides for animations.
- **Fix**: Add `@media (prefers-reduced-motion: reduce)` rule to disable animations and transitions.
- **Effort**: Trivial
- **Status**: TODO

---

## Phase 3 — Test improvement

### P20 — Add i18n locale key completeness test (C7-TE1)

- **Severity**: Low (test coverage) | **Confidence**: High
- **File**: `src/lib/i18n.test.ts`
- **Issue**: No test verifying all locales have the same keys.
- **Fix**: Add test that compares key sets across all 5 locales.
- **Effort**: Small
- **Status**: TODO

---

## Deferred findings (carried forward with exit criteria)

All items from cycles 1-6 carry forward unchanged:
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
| P17 — Fix extra blank line | DONE | 92d1586 | Removed double blank line between callbacks |
| P18 — Fix FileUpload indent | DONE | 92d1586 | Dedented tabIndex and className by 4 spaces |
| P19 — prefers-reduced-motion | DONE | bbc60f1 | Added @media (prefers-reduced-motion: reduce) to globals.css |
| P20 — i18n locale completeness test | ALREADY DONE | | Test existed in i18n.test.ts (lines 6-16) |