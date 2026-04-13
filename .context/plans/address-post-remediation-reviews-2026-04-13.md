# Implementation Plan: Address Post-Remediation Review Follow-ups (2026-04-13)

**Source reviews:**
- `.context/reviews/ultradeep-code-quality-review-post-remediation-2026-04-13.md`
- `.context/reviews/ultradeep-security-review-post-remediation-2026-04-13.md`

**Goal:** close the remaining post-remediation issues that are small enough for one final bounded hardening pass: toolchain alignment, documentation/runtime consistency, plan hygiene, Journey Creator privacy fixes, style-trust reduction, and a small maintainability cleanup.

---

## Findings mapping

| Review ID | Theme | Planned action |
|---|---|---|
| CQ-POST-1 | TypeScript/toolchain peer mismatch | Align TypeScript to supported toolchain range |
| CQ-POST-2 | Node/docs/workflow drift | Align workflow/runtime docs and fix stale README workflow path |
| CQ-POST-3 | Stale historical plans still active | Move historical address plans into archive and update references |
| CQ-POST-4 | Per-scene global pointer listeners | Limit listener lifetime or move drag tracking to a lighter pattern |
| CQ-POST-5 | `page.tsx` orchestration hub | Do one bounded extraction of unrelated UI concerns to reduce coupling |
| SEC-POST-1 | Forbidden `User-Agent` header attempt | Remove dead header logic |
| SEC-POST-2 | Partial queries leak to third party | Add a minimum query length and clearer disclosure |
| SEC-POST-3 | CSP still uses `unsafe-inline` | Document as residual constraint unless a safe bounded removal path emerges |
| SEC-POST-4 | README still overclaims privacy at the closing tagline | Soften tagline to match actual documented behavior |
| SEC-POST-5 | Remote style JSON remains third-party mutable | Vendor/pin the style JSON locally while documenting remaining remote tile/glyph trust |

---

## Progress update

- [x] Phase A — capture/land the follow-up review baseline
- [x] Phase B — toolchain, workflow, and plan hygiene
- [x] Phase C — Journey Creator privacy and search hardening
- [x] Phase D — style trust reduction and residual privacy copy cleanup
- [x] Phase E — bounded maintainability cleanup and final verification

Completed so far:
- follow-up reviews and plan captured and committed
- TypeScript/toolchain and Node/doc/runtime expectations aligned
- stale historical plans moved into archive
- Journey Creator now requires a minimum query length and no longer attempts to set a forbidden browser `User-Agent` header
- map style JSON files are now vendored locally, reducing remote style-definition mutability at runtime
- the README closing tagline now matches the documented privacy/network behavior
- `SceneRangeEditor` no longer keeps always-on per-scene global pointer listeners while idle
- `page.tsx` had unrelated global-toolbar and keyboard-help UI extracted into dedicated components to reduce orchestration coupling

---

## Implementation phases

### Phase A — Capture the follow-up review baseline
**Files:**
- `.context/reviews/ultradeep-code-quality-review-post-remediation-2026-04-13.md`
- `.context/reviews/ultradeep-security-review-post-remediation-2026-04-13.md`
- `.context/plans/address-post-remediation-reviews-2026-04-13.md`

**Work:**
- Commit the fresh review artifacts and this follow-up plan before code changes.

### Phase B — Toolchain, workflow, and plan hygiene
**Files:**
- `package.json`
- `package-lock.json`
- `.github/workflows/deploy-pages.yml`
- `.context/development/01-conventions.md`
- `README.md`
- `.context/README.md`
- `.context/plans/review-implementation-backlog-2026-04-13.md`
- `.context/plans/address-*.md` historical files

**Work:**
- Pin TypeScript to a supported toolchain version.
- Align Node version expectations between docs and CI.
- Fix the stale README architecture workflow path.
- Archive the stale historical address plans and update all references.

### Phase C — Journey Creator privacy/search hardening
**Files:**
- `src/components/JourneyCreator.tsx`
- `src/lib/i18n.ts`
- `e2e/travelback.spec.ts` if testable

**Work:**
- Remove the forbidden `User-Agent` header attempt.
- Require a minimum query length before outbound search.
- Strengthen the UI disclosure so the search field clearly communicates third-party lookup behavior.

### Phase D — Style trust reduction and residual privacy copy cleanup
**Files:**
- `src/types.ts`
- `public/map-styles/` (new)
- `README.md`
- `.context/project/02-architecture.md`

**Work:**
- Vendor/pin the style JSON locally so style definitions are no longer fetched as mutable third-party documents at runtime.
- Keep docs accurate about the remaining remote tile/glyph trust.
- Soften the README closing tagline to match the real privacy/network model.

### Phase E — Bounded maintainability cleanup and final verification
**Files:**
- `src/components/SceneEditor.tsx`
- `src/app/page.tsx`
- optionally new small component files if extracted

**Work:**
- Reduce `SceneRangeEditor` listener overhead by avoiding always-on per-scene global listeners.
- Extract one unrelated concern out of `page.tsx` (for example toolbar/help UI) to reduce orchestration coupling without broad redesign.
- Re-run full verification.

---

## Verification plan

- `npm install --dry-run` (peer warning check)
- `npm audit --json`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run smoke:static`
- `npx playwright test -c playwright.static.config.ts --reporter=line`
- architect verification before final completion
