# Cycle 9 Implementation Plan — 2026-04-24

## Review Summary

Deep review across 11 agents. **1 new actionable finding** after dedup and
false-positive elimination. All prior cycle fixes confirmed still applied.

See `.context/reviews/_aggregate.md` and `.context/reviews/cycle-r9-*-2026-04-24.md`.

## Cycle 8 Plan Status

| Task | Status |
|------|--------|
| TASK-1: Remove English message text fallback from FileUpload error handler | ROLLED INTO C9-TASK-1 |

## Findings Disposition

### C9-AGG-001: FileUpload `matchedKey` holds error code, not i18n key — SCHEDULED

- **Source:** code-reviewer (C9-CR-001), confirmed by critic and tracer
- **Severity:** LOW/MEDIUM (maintainability)
- **Supersedes:** Cycle 8 TASK-1 (same root cause)

### C9-AGG-002: No `prefers-reduced-motion` support — FALSE POSITIVE

- **Source:** designer (C9-DS-001)
- **Reason:** `vitro-base.css:758-763` already has the global
  `prefers-reduced-motion: reduce` rule that sets
  `animation-duration: 0.01ms !important` and
  `transition-duration: 0.01ms !important` on all elements.
  Additionally, `globals.css:46-56` and `globals.css:67-71` add
  component-specific reduced-motion handling for `.marker-pulse`,
  `.animate-spin`, and `.export-checkmark`.
- **Action:** Close as already implemented.

### C9-AGG-D23: `buildReferenceGridData` not memoized — DEFERRED

- **Source:** perf-reviewer (C9-PR-001)
- **Severity:** LOW/MEDIUM
- **Reason:** Unfavorable cost/benefit ratio. Already deferred as DF-C4-003.

## Active Implementation Items

### C9-TASK-1: Rename `matchedKey` to `matchedCode` and simplify FileUpload error flow

- **File:** `src/components/FileUpload.tsx:73-86`
- **Fix:**
  1. Rename `matchedKey` to `matchedCode` (it holds the error code, not the i18n key)
  2. Introduce `knownCode` boolean for the `isSafe` check
  3. Simplify the flow to eliminate redundant logic

  Before:
  ```ts
  const matchedKey = code && code in errorCodeMap ? code : ''
  const isFileTooLarge = code === 'FILE_TOO_LARGE'
  const isSafe = !!matchedKey || isFileTooLarge
  if (!isSafe) console.error(...)
  if (matchedKey) {
    setError(t(errorCodeMap[matchedKey] as ...))
  } else if (isFileTooLarge) {
    setError(message)
  } else {
    setError(t('fileUpload.parseFailed'))
  }
  ```

  After:
  ```ts
  const knownCode = code && code in errorCodeMap
  const isFileTooLarge = code === 'FILE_TOO_LARGE'
  const isSafe = knownCode || isFileTooLarge
  if (!isSafe) console.error(...)
  if (knownCode) {
    setError(t(errorCodeMap[code as keyof typeof errorCodeMap]))
  } else if (isFileTooLarge) {
    setError(message)
  } else {
    setError(t('fileUpload.parseFailed'))
  }
  ```

## Deferred Items

### No New Deferred Findings

C9-AGG-D23 (`buildReferenceGridData` memoization) is already covered by
DF-C4-003 in the carryover list.

### Previously Deferred (Carried Forward)

All items from cycle 8 plan carried forward unchanged:
DF-C1-001, DF-C1-002, DF-C2-001 through DF-C2-010, DF-C3-001 through
DF-C3-006, DF-C4-001 through DF-C4-017, DF-C7-001, R4-AGG-D1 through
R4-AGG-D13, R5-AGG-D14 through R5-AGG-D17, R6-AGG-D18 through
R6-AGG-D20, R7-AGG-D21, R7-AGG-D22.
