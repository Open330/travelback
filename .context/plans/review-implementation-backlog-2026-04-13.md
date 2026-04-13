# Review Implementation Backlog & Coverage Matrix (2026-04-13)

**Purpose:** consolidate all current review artifacts, identify which critiques already have active implementation plans, identify missing work that was not yet planned, and define the archive/active plan set before any implementation begins.

---

## Review → Plan coverage matrix

| Review | Focus | Status | Active plan(s) |
|---|---|---|---|
| `.context/reviews/ux-review-non-technical-traveler.md` | Broad UX issues for non-technical travelers | **Refreshed coverage added in this pass** | `.context/plans/address-open-ux-review-items-2026-04-13.md` (preferred), plus historical refs: `.context/plans/address-ux-review-non-technical-traveler.md`, `.context/plans/address-review-gaps.md` |
| `.context/reviews/mina-review-2026-02-22.md` | Persona-specific UX review from Mina | **Refreshed coverage added in this pass** | `.context/plans/address-open-ux-review-items-2026-04-13.md` (preferred), plus historical refs: `.context/plans/address-mina-review-2026-02-22.md`, `.context/plans/address-review-gaps.md` |
| `.context/reviews/comprehensive-code-review-2026-04-13.md` | Repo-wide correctness / maintainability / release-quality review | **New plan added in this pass** | `.context/plans/address-comprehensive-code-review-2026-04-13.md` |
| `.context/reviews/ultradeep-code-quality-review-2026-04-13.md` | Deep code-quality / lifecycle / parser / performance review | **New plan added in this pass** | `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md` |
| `.context/reviews/ultradeep-security-review-2026-04-13.md` | Deep security / privacy / dependency / CSP review | **New plan added in this pass** | `.context/plans/address-ultradeep-security-review-2026-04-13.md` |

---

## Archive decisions

### Archived now
- `.context/plans/archive/ux-overhaul-non-technical-traveler.md`
  - **Reason:** explicitly described by later planning docs as fully implemented (`9019e14`), and now superseded by narrower follow-up plans for remaining UX work.

### Kept active
- `.context/plans/address-open-ux-review-items-2026-04-13.md`
  - **Reason:** this is now the preferred consolidated execution plan for the remaining open UX issues from the older UX review family.
- Historical reference plans kept in place for provenance and task history:
  - `.context/plans/address-ux-review-non-technical-traveler.md`
  - `.context/plans/address-mina-review-2026-02-22.md`
  - `.context/plans/address-review-gaps.md`
  - **Reason:** these documents are partially stale but still useful as source-trace records; they are not fully implemented and therefore were not archived in this pass.

---

## Missing work that did not yet have dedicated implementation plans

Before this pass, the following review areas had findings but no dedicated remediation plans:

### 1. Core correctness / lifecycle isolation
From:
- `.context/reviews/comprehensive-code-review-2026-04-13.md`
- `.context/reviews/ultradeep-code-quality-review-2026-04-13.md`

Missing plan coverage included:
- track-scoped state reset rules (timeline/scenes/export session leakage)
- runtime scene normalization and validation
- parser fidelity for segmented / untimed travel data
- hot-path playback performance improvements
- MapLibre style-reload lifecycle handling
- CI/deploy verification hardening for code-quality regressions

### 2. Security / privacy / dependency hardening
From:
- `.context/reviews/ultradeep-security-review-2026-04-13.md`

Missing plan coverage included:
- dependency vulnerability remediation
- CSP tightening / browser hardening
- privacy-copy corrections for third-party tile/geocoder flows
- client-side parsing abuse resistance
- remote-style supply-chain trust reduction

### 3. Comprehensive-review-only cleanup items not fully captured by the ultradeep quality plan
From:
- `.context/reviews/comprehensive-code-review-2026-04-13.md`

Missing plan coverage included:
- first-load system theme synchronization
- error-boundary locale consistency
- same-file re-upload reliability
- static preview cache policy for non-fingerprinted assets
- export idle-timeout failure handling

---

## New plan set created in this pass

1. `.context/plans/address-comprehensive-code-review-2026-04-13.md`
   - Covers comprehensive-review-specific issues and cross-links overlapping deep-quality work.

2. `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md`
   - Covers lifecycle isolation, scene correctness, parser fidelity, performance, CI/docs drift, and related regression testing.

3. `.context/plans/address-ultradeep-security-review-2026-04-13.md`
   - Covers dependency security, CSP/browser hardening, privacy messaging, client-side abuse resistance, and trust-boundary documentation.

4. `.context/plans/address-open-ux-review-items-2026-04-13.md`
   - Re-triages the older UX review family against the current codebase and isolates the still-open UX tasks that remain worth doing.

---

## Recommended implementation order across active plans

### Wave 1 — Security and release risk reduction
1. `.context/plans/address-ultradeep-security-review-2026-04-13.md`
2. dependency / CI portions of `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md`

### Wave 2 — Correctness and state isolation
3. `.context/plans/address-ultradeep-code-quality-review-2026-04-13.md`
4. `.context/plans/address-comprehensive-code-review-2026-04-13.md`

### Wave 3 — UX and onboarding polish
5. `.context/plans/address-open-ux-review-items-2026-04-13.md`
6. Use the older UX plan files only as source/reference while executing the refreshed UX plan above.

This order keeps security/dependency risk and correctness regressions ahead of UX polish, while consolidating the older UX review family into one fresher execution lane.

---

## Acceptance criteria for this planning pass

- Every review file in `.context/reviews/` has either:
  - an existing active implementation plan, or
  - a new implementation plan created in this pass.
- Fully implemented/superseded plans are archived out of the active plans root.
- No source code is changed as part of this planning pass.
- The final active plan set remains readable and non-duplicative enough to execute in phases.
