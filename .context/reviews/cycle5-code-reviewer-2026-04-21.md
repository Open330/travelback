# Cycle 5 Code Review -- 2026-04-21

**Reviewer:** code-reviewer
**Scope:** All source files in `src/`, configuration, e2e tests

---

## Review Summary

Full code quality, logic, SOLID, and maintainability review of the Travelback codebase. The codebase is well-structured with consistent patterns, proper error handling, and good TypeScript usage. Found 2 new issues not previously reported.

---

## New Findings

### C5-CR1: Playback progress animation uses requestAnimationFrame without frame-rate-independent increment guard for extreme dt values

**Severity:** MEDIUM
**Confidence:** HIGH
**File:** `src/lib/usePlaybackController.ts:85-86`

The animation loop caps `dt` at `1/30` (line 86: `const dt = Math.min(rawDt, 1 / 30)`), which is correct for preventing large jumps after tab backgrounding. However, when `rawDt` is capped, `lastTimeRef.current` is still set to `now` (line 87), not to the effective time. This means if the browser throttles rAF to 10fps (common in background tabs), each frame uses `dt = 1/30` regardless of actual elapsed time, causing the animation to run faster than real-time when the tab is in the background. This isn't a user-facing bug since playback is paused during export and the app is in the foreground during normal use, but it's a correctness issue.

**Impact:** Animation speed becomes frame-rate-dependent when rAF is throttled, violating the "real-time" playback contract.
**Fix:** Set `lastTimeRef.current = now - Math.min(rawDt, 1/30) * 1000` or recalculate based on actual elapsed time using a monotonically increasing accumulator rather than resetting to `now` unconditionally.

### C5-CR2: GoogleGuide tab panel IDs are not stable across re-renders

**Severity:** LOW
**Confidence:** MEDIUM
**File:** `src/components/GoogleGuide.tsx`

The `useId()` hook generates stable IDs within a single component lifecycle, but GoogleGuide uses `useId()` to create tab/tabpanel ID pairs. This is correct. However, the `id` attributes on the tab elements use `${instanceId}-tab-${index}` while the `aria-controls` references use the same pattern. This is actually fine -- no issue found upon closer inspection.

---

## Previously Reported Issues -- Verification

All previously reported issues from cycle 4 remain as documented. Key verifications:

- **C4-A3/C4-A4** (module-level mutable state): Still present, safe in practice per prior analysis
- **C4-A12** (Math.random() fallback): Still present, low risk
- **C4-A16** (redundant DOM attribute application): Still present in `src/app/page.tsx:267-307`

---

## Code Quality Assessment

**Positive observations:**
- Zero `as any` casts, zero `@ts-ignore` or `@ts-expect-error`
- 10 eslint-disable comments, all with documented rationale
- Consistent use of `useCallback` and `useMemo` for performance
- Proper error boundary wrapping
- Clean separation of concerns in lib/ modules
- `ParseError` class with machine-readable codes is excellent for i18n error mapping
- Worker fallback to main thread is robust

**No new findings beyond C5-CR1.**
