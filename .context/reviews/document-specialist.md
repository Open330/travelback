# Documentation Specialist Review — Cycle 4 (2026-07-16)

Reviewed revision: `4917d39`

## Result

**One new Low/High documentation finding.** User-facing format, privacy, export, language, and base-path claims otherwise match the current implementation. Existing legal and CI-policy carryovers remain separated because they require user input or explicit authorization.

## Coverage

Reviewed README, package scripts and configuration, all current `.context/project` and `.context/development` references, the active plan index, inline runtime comments for playback/map/timeline/export, the Pages workflow, and traveler-visible copy in all five locale dictionaries. Historical material was consulted only to identify already-known carryovers.

## New finding

### DOC4-01 — Contributor test instructions omit Vitest and recommend the low-level dev E2E entry point

Severity: **Low** | Confidence: **High**

Evidence:

- `README.md:155-160` says testing is Playwright only, while `package.json:16` defines the 352-test Vitest suite.
- `README.md:178-184` omits `npm test` and tells contributors to run `npm run test:e2e:dev`.
- `package.json:17-20` exposes `npm run test:e2e` as the canonical wrapper and `test:e2e:dev` as the lower-level Playwright command.
- `scripts/run-dev-e2e.mjs:35-62` detects an active Next dev lock, reuses its port when appropriate, and otherwise reserves a collision-free port. The direct command lacks that orchestration and can hit Next's single-worktree dev lock.
- `.context/project/01-overview.md:15-28` also describes testing as Playwright-only and omits `npm test` from the verification commands.

Failure scenario: a contributor follows the README, never runs 352 unit regressions, then sees an avoidable Next dev-lock failure even though the repository provides a safer wrapper.

Required fix: describe testing as Vitest plus Playwright; list `npm test`, `npm run test:e2e`, and `npm run test:e2e:static`; document `test:e2e:dev` only as the direct/internal variant if it remains worth mentioning. Align the project overview in the same change.

## Verified accurate scopes

- README's supported formats and installed dependency versions match package/source behavior.
- The `/travelback` production base path and static preview commands match `next.config.ts` and `scripts/serve-static.mjs`.
- Current phone-first Google Timeline guidance, local-processing language, codec/resolution descriptions, and map-theme descriptions remain consistent with the application.
- No stale Cycle 3 finding was reintroduced in architecture or product copy.

## Existing non-new boundaries

- README still claims MIT without a root `LICENSE`; holder/year/legal intent remain unknown and are carried forward for owner input.
- CI unit-gate and permission-scope changes remain carried forward because user-level policy requires explicit confirmation before CI/CD modification.
- No deployment documentation or production configuration was changed during review.

## Final sweep

Rechecked commands, test runners, base paths, supported inputs, dependency names, export language, privacy claims, locale parity, licensing, and current context references. No second new documentation defect was confirmed.
