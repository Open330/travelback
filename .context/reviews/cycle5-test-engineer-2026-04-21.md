# Cycle 5 Test Engineer Review -- 2026-04-21

**Reviewer:** test-engineer
**Scope:** Test coverage gaps, flaky tests, TDD opportunities

---

## Review Summary

The E2E test suite is comprehensive with 40+ tests covering file import, playback, camera, export, accessibility, mobile layout, and theme persistence. No flaky tests detected. Found 1 new test gap.

---

## New Findings

### C5-TE1: No E2E test for map error recovery via reload button

**Severity:** MEDIUM
**Confidence:** HIGH
**File:** `e2e/travelback.spec.ts`

The existing test `map error UI appears when map style fails to load` (line 323) verifies the error UI appears but does not test the reload button functionality. The error UI has a "Reload Page" button (MapView.tsx line 952) that calls `window.location.reload()`. This should be tested to ensure the reload actually clears the error state and re-attempts map initialization.

**Impact:** The reload recovery path is untested; a regression could leave users stuck on the error screen.
**Fix:** Add a test that: (1) blocks the map style, (2) verifies error UI, (3) unblocks the map style, (4) clicks the reload button, (5) verifies the map loads successfully after reload.

---

## Previously Reported -- Still Valid

- C4-A1: No E2E test for theme toggle persistence (now EXISTS -- test added at line 289-321)
- C4-A9: No E2E test for map load error handling (partially addressed -- error UI is tested, reload is not)

---

## Test Quality Assessment

**Positive:**
- Good use of `expect.poll()` for async state verification
- Helper functions (`waitForApp`, `uploadGpx`, `collectCameraSamples`) reduce duplication
- Camera stability test uses statistical analysis (median, P95) rather than brittle thresholds
- Debug API (`__travelbackDebug`) enables internal state assertions without UI coupling
- Next.js dev overlay hidden via `addInitScript` to prevent interference
- Mobile viewport tests at realistic dimensions (390x844)

**Previously reported -- still valid:**
- C4-A25: No unit test for parser error code mapping
