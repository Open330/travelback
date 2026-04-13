# Review Remediation Gap Analysis (2026-04-13)

**Purpose:** read across every review artifact in `.context/reviews/`, identify which critique groups were already implemented by previous plan waves, identify what still appears open in the current codebase, and define the active implementation-plan set going forward.

---

## Reviews considered

1. `.context/reviews/ux-review-non-technical-traveler.md`
2. `.context/reviews/mina-review-2026-02-22.md`
3. `.context/reviews/comprehensive-code-review-2026-04-13.md`
4. `.context/reviews/ultradeep-code-quality-review-2026-04-13.md`
5. `.context/reviews/ultradeep-security-review-2026-04-13.md`
6. `.context/reviews/ultradeep-code-quality-review-post-remediation-2026-04-13.md`
7. `.context/reviews/ultradeep-security-review-post-remediation-2026-04-13.md`
8. `.context/reviews/comprehensive-deep-code-review-post-remediation-2026-04-13.md`

---

## What is already implemented / archived

The following plan waves are now fully implemented and archived:
- `archive/ux-overhaul-non-technical-traveler.md`
- `archive/address-ux-review-non-technical-traveler.md`
- `archive/address-mina-review-2026-02-22.md`
- `archive/address-review-gaps.md`
- `archive/address-comprehensive-code-review-2026-04-13.md`
- `archive/address-ultradeep-code-quality-review-2026-04-13.md`
- `archive/address-ultradeep-security-review-2026-04-13.md`
- `archive/address-open-ux-review-items-2026-04-13.md`
- `archive/address-post-remediation-reviews-2026-04-13.md`
- `archive/review-implementation-backlog-2026-04-13.md`

Those archives cover the earlier large remediation waves: onboarding/UX cleanup, state/session fixes, parser/scene/runtime stabilization, dependency hardening, privacy copy corrections, and the first post-remediation cleanup pass.

---

## Remaining open criticism clusters after reading all reviews

### A. Correctness / quality follow-ups
Source reviews:
- `comprehensive-deep-code-review-post-remediation-2026-04-13.md`
- `ultradeep-code-quality-review-post-remediation-2026-04-13.md`

Still-open tasks:
1. **Timeline trimming can still collapse to a 1-point track** due to ratio-gap logic rounding to the same index.
2. **Export filenames still strip non-Latin titles** because sanitization is ASCII-only.
3. **Playwright is still not part of deploy CI gating** even though the suite exists and is stable.
4. **Locale/unit paths are weakly tested** because the suite is almost entirely English-only and `en-US`-forced.
5. **`.context` docs still drift from code**:
   - `.context/README.md` structure summary is stale
   - `.context/project/01-overview.md` map/style trust boundary is stale
   - `.context/project/02-architecture.md` camera/default-scene description is stale
6. **`page.tsx` remains a large orchestration hub** and should continue to be decomposed in a bounded way.
7. **Main-thread parse DoS risk remains** even after the file cap / point cap work.

### B. Security / privacy follow-ups
Source reviews:
- `ultradeep-security-review-post-remediation-2026-04-13.md`
- overlapping items in `comprehensive-deep-code-review-post-remediation-2026-04-13.md`

Still-open tasks:
1. **Journey Creator search still auto-submits partial queries** to a third party after the minimum-length threshold.
2. **CSP still relies on `unsafe-inline`**, so XSS containment is still weaker than a nonce/hash path.
3. **Vendored style JSON still points at remote tiles/glyphs/sprites**, so some mutable third-party runtime trust remains.
4. **README / privacy messaging should stay aligned** with the true runtime trust boundary as the app evolves.

---

## Active plan set required now

To address the still-open criticism from the full review set, the repository now needs exactly these new active plans:

1. `address-comprehensive-deep-code-review-post-remediation-2026-04-13.md`
   - correctness, test coverage, docs drift, filename handling, maintainability follow-ups

2. `address-ultradeep-security-review-post-remediation-2026-04-13.md`
   - privacy/search behavior, CSP follow-up path, residual trust-boundary hardening

No additional UX-only remediation plan is needed right now because the remaining UX-related criticism is already subsumed by the correctness/security follow-up tasks above.

---

## Recommended execution order

1. `address-comprehensive-deep-code-review-post-remediation-2026-04-13.md`
   - fixes the live correctness/test/docs issues first
2. `address-ultradeep-security-review-post-remediation-2026-04-13.md`
   - resolves the remaining privacy/CSP/trust-boundary decisions after the quality/doc baseline is corrected

---

## Acceptance criteria for this planning pass

- every review file has either:
  - an archived implemented plan wave behind it, or
  - a new active plan that covers its remaining open criticism
- fully implemented plan waves are archived out of the active plans root
- the active plans root contains only the new unresolved work
