# Implementation Plan: Address Ultradeep Security Review — Post-Remediation (2026-04-13)

**Primary source review:** `.context/reviews/ultradeep-security-review-post-remediation-2026-04-13.md`  
**Supporting source review:** `.context/reviews/comprehensive-deep-code-review-post-remediation-2026-04-13.md`

**Goal:** close the remaining post-remediation privacy and browser-hardening issues that are still open after the earlier security remediation wave.

---

## Findings mapping

| Review ID | Finding | Planned action |
|---|---|---|
| SEC-POST-2 / F6 | Partial place queries still leak to third party | Rework Journey Creator search interaction to reduce or eliminate implicit partial-query submission |
| SEC-POST-3 / F8 | CSP still relies on `unsafe-inline` | Investigate and, if feasible, replace with a stricter nonce/hash/static-safe path; otherwise produce a clearly bounded residual-risk implementation note |
| SEC-POST-5 / F9 | Vendored styles still depend on remote tiles/glyphs/sprites | Decide whether to pin/self-host remaining runtime assets or explicitly formalize the residual trust boundary |
| SEC-POST-4 | Privacy wording must remain aligned | Keep README / `.context` privacy statements synchronized with the chosen implementation path |

Out of scope for this plan:
- dependency audit cleanup from the earlier security wave (already complete)
- non-security maintainability refactors in `page.tsx` (covered by the quality follow-up plan)

---

## Progress update

- [x] Phase A — Journey Creator privacy minimization
- [x] Phase B — CSP hardening feasibility / implementation
- [x] Phase C — residual third-party asset trust reduction or explicit formalization
- [x] Phase D — privacy documentation alignment

Completed so far:
- Journey Creator search now requires explicit submit instead of sending partial queries on debounce pauses
- the CSP residual `unsafe-inline` requirement is now explicitly documented in code and architecture docs as a bounded static-export constraint
- local style JSON remains pinned in-repo and the remaining remote tile/glyph/sprite trust boundary is explicitly documented
- privacy wording remains aligned across README and `.context` docs with the actual runtime behavior

---

## Implementation phases

### Phase A — Journey Creator privacy minimization

#### A.1 Reduce or remove implicit partial-query submission
**Files:**
- `src/components/JourneyCreator.tsx`
- `src/lib/i18n.ts`
- `e2e/travelback.spec.ts` if search UX is testable

**Work:**
- Decide between:
  1. explicit submit button/search action,
  2. more conservative debounce + stronger threshold + no lookup until user intent is clearer,
  3. privacy mode that disables auto-search.
- Prefer a design that materially reduces unintended third-party disclosure, not just cosmetic copy changes.

**Acceptance criteria:**
- Users no longer send trivial partial place strings to Nominatim merely by pausing during typing.
- The UI communicates clearly when a third-party lookup will occur.

### Phase B — CSP hardening feasibility / implementation

#### B.1 Attempt a stricter script policy path
**Files:**
- `src/app/layout.tsx`
- build output inspection as needed
- `.context/project/02-architecture.md`

**Work:**
- Investigate whether the current static-export bootstrap can move away from broad `unsafe-inline`.
- If feasible, implement a stricter hash/nonce-compatible path.
- If not feasible in a bounded way, codify the residual risk and the precise blocker in docs/comments rather than leaving it implicit.

**Acceptance criteria:**
- Either the CSP becomes stricter in code, or the residual `unsafe-inline` dependency is formally justified and bounded.

### Phase C — Third-party runtime asset trust reduction or formalization

#### C.1 Decide how far to pin/self-host remote map assets
**Files:**
- `public/map-styles/*.json`
- optional new asset-hosting locations if selected
- `README.md`
- `.context/project/02-architecture.md`

**Work:**
- Evaluate the smallest viable next step for the remaining remote dependencies:
  - continue documenting the risk only,
  - pin more runtime asset references,
  - or self-host a subset of sprites/glyphs/tiles.
- Produce a clear implementation decision instead of leaving the trust boundary half-defined.

**Acceptance criteria:**
- The repo has an explicit, current statement of which map assets are local vs remote and why.

### Phase D — Privacy documentation alignment

#### D.1 Reconcile all privacy language after the chosen implementation path
**Files:**
- `README.md`
- `.context/project/02-architecture.md`
- any inline UI/help text touched by this plan

**Work:**
- Update docs after A/B/C so that all user-facing privacy claims match the actual runtime behavior.

**Acceptance criteria:**
- No user-facing doc or helper text overstates the privacy guarantees relative to the code.

---

## Verification plan

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:static`
- targeted manual/browser verification of Journey Creator search behavior
- emitted HTML/CSP inspection if the CSP changes
