# Implementation Plan: Address Comprehensive Deep Code Review — Post-Remediation (2026-04-13)

**Primary source review:** `.context/reviews/comprehensive-deep-code-review-post-remediation-2026-04-13.md`  
**Supporting source review:** `.context/reviews/ultradeep-code-quality-review-post-remediation-2026-04-13.md`

**Goal:** close the remaining post-remediation correctness, maintainability, CI, test-coverage, and documentation issues that were identified after the earlier remediation waves completed.

---

## Findings mapping

| Review ID | Finding | Planned action |
|---|---|---|
| F1 | Timeline trimming can collapse to a 1-point track | Fix ratio/index gap logic and add regression coverage |
| F2 | Export filename sanitization strips non-Latin names | Replace ASCII-only sanitization with Unicode-aware filename handling |
| F3 | Deploy CI still does not run Playwright | Add a bounded Playwright gate to CI/deploy flow |
| F4 | Locale/unit paths remain weakly tested | Add a small non-English + imperial regression slice |
| F5 | `.context` / architecture docs still drift | Refresh `.context` structure and architecture docs to match current code |
| F7 | Main-thread parsing DoS risk remains | Define and implement a bounded parsing offload or staged mitigation plan |
| CQ-POST-5 / F10 | `page.tsx` remains a large orchestration hub | Do one more bounded extraction / state-boundary cleanup |

Out of scope for this plan:
- CSP residual-risk path and third-party search privacy policy details beyond what is needed for correctness docs (handled by the security follow-up plan)

---

## Progress update

- [ ] Phase A — correctness edge cases
- [ ] Phase B — CI and regression coverage
- [ ] Phase C — documentation alignment
- [ ] Phase D — parsing resilience and maintainability cleanup

---

## Implementation phases

### Phase A — Correctness edge cases

#### A.1 Prevent 1-point trimmed tracks
**Files:**
- `src/components/TimelineSelector.tsx`
- `src/app/page.tsx`
- `e2e/travelback.spec.ts`
- `e2e/fixtures/` if a new short-track fixture is needed

**Work:**
- Enforce minimum selection size in index space rather than only ratio space.
- Guarantee `endIdx >= startIdx + 1` before emitting `onRangeChange`.
- Add a regression that covers a very short track where rounding currently collapses the range.

**Acceptance criteria:**
- Timeline trimming cannot produce a filtered track with fewer than 2 points.
- The regression test fails before the fix and passes after.

#### A.2 Preserve non-Latin export filenames
**Files:**
- `src/lib/videoEncoder.ts`
- possibly `e2e/travelback.spec.ts` if filename behavior is testable in-browser

**Work:**
- Replace ASCII-only filename sanitization with Unicode-aware filtering.
- Keep filesystem-hostile characters removed, but preserve meaningful names from Korean/Japanese/Chinese/etc.

**Acceptance criteria:**
- A non-Latin track title does not collapse to the generic `Journey` filename unless truly empty.

### Phase B — CI and regression coverage

#### B.1 Add Playwright coverage to CI/deploy gating
**Files:**
- `.github/workflows/deploy-pages.yml`
- `package.json`

**Work:**
- Decide between:
  1. full `test:e2e:static`, or
  2. a bounded Playwright subset that covers the highest-value interaction risks.
- Integrate that into CI/deploy gating.

**Acceptance criteria:**
- CI no longer relies only on lint/typecheck/build/smoke when a working Playwright suite exists.

#### B.2 Add non-English and unit-system regression coverage
**Files:**
- `playwright.config.ts`
- `playwright.static.config.ts`
- `e2e/travelback.spec.ts`

**Work:**
- Add at least one locale-sensitive regression path outside English.
- Add at least one imperial-unit regression assertion.
- Prefer stable selectors over English visible text where possible.

**Acceptance criteria:**
- The automated suite exercises at least one non-English UI path and one imperial-unit path.

### Phase C — Documentation alignment

#### C.1 Refresh `.context` structure and archive references
**Files:**
- `.context/README.md`
- `.context/plans/archive/README.md` if needed

**Work:**
- Update the structure summary so it reflects the current reviews/plans/archive reality.

**Acceptance criteria:**
- `.context/README.md` no longer presents a misleadingly tiny structure snapshot.

#### C.2 Refresh architecture / overview docs to match current runtime
**Files:**
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`

**Work:**
- Update map-style trust-boundary language to match locally pinned style JSON + remote tiles/glyphs/sprites.
- Update the camera/system descriptions to include Bird’s Eye and the actual default scene flow.
- Recheck any remaining feature-count/path references.

**Acceptance criteria:**
- `.context/project/*` matches the current code behavior and current trust boundary.

### Phase D — Parsing resilience and maintainability cleanup

#### D.1 Reduce main-thread parsing risk
**Files:**
- `src/components/FileUpload.tsx`
- `src/lib/parser.ts`
- optional new worker file under `src/lib/` or `src/workers/`

**Work:**
- Decide on the smallest viable next step:
  - move parsing into a Web Worker, or
  - introduce staged/streamed guards that meaningfully reduce UI freeze risk.
- This phase should produce actual code changes, not just more documentation.

**Acceptance criteria:**
- The parser path is more resilient than the current whole-file main-thread parse model.

#### D.2 Continue bounded decomposition of `page.tsx`
**Files:**
- `src/app/page.tsx`
- optional new hook/component files

**Work:**
- Extract one more coherent concern from `page.tsx` (for example track-session state, export orchestration, or toolbar/header composition) without broad redesign.

**Acceptance criteria:**
- `page.tsx` shrinks in responsibility and the state-reset / orchestration logic becomes easier to reason about.

---

## Verification plan

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:static`
- updated Playwright suite / CI subset
- if parsing moves to a worker, targeted verification that large-file parse behavior still works correctly
