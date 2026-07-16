# Documentation Specialist Review — Cycle 5 (2026-07-16)

Reviewed revision: bdfb1d7

## Result

**One new Medium/High documentation finding.** User-facing format, privacy, base-path, export, language, and contributor test claims otherwise match current behavior. Existing license, CI-policy, and hardware-evidence items remain carryovers.

## Coverage

Reviewed README.md, package.json, framework/Playwright/Vitest configuration, all scripts, Pages workflow, .context/README.md, current project/development references, the active plan index, Mina's reviewer runbook, inline map/playback/export/parser comments, and traveler-visible copy across all five locale dictionaries. Historical reviews were used only to avoid duplicate IDs.

## New finding

### DOC5-01 — Mina's E2E runbook recommends destructive process killing and bypasses the repository's safe wrapper

Severity: **Medium** | Confidence: **High**

Evidence:

- .context/agents/non-tech-traveler-reviewer.md:133-148 tells reviewers to find any process on port 3099 and send kill -9, then run npx playwright test directly.
- package.json:17-20 defines npm run test:e2e as the canonical dev wrapper.
- scripts/run-dev-e2e.mjs:14-57 safely detects a live Next lock, reuses that server when appropriate, or reserves another available port.
- playwright.config.ts:44-48 makes reuseExistingServer conditional, while the runbook's line 58 says it is always false.
- The runbook still says “50+ tests” at line 59 although the suite now has 93, and its four-fixture summary omits most of the current 18-file fixture inventory. Those are secondary signs that this section has drifted.

Concrete failure scenario: a contributor follows the reviewer documentation while port 3099 belongs to another project or an unsaved debugging session. The kill pipeline terminates that unrelated process without confirmation. The subsequent direct command also bypasses dynamic-port/lock orchestration and can collide with Next's single-worktree dev lock or open a blocking HTML report on failure.

Required fix: remove the kill command entirely. Make npm run test:e2e the ordinary instruction, document a focused non-HTML reporter command only for diagnosis, and state that the wrapper owns server/port selection. Update reuse semantics, current test count, and fixture coverage without relying on a brittle exact number if desired.

## Verified accurate scopes

- README.md:178-203 now correctly distinguishes npm test, the safe dev E2E wrapper, static E2E, build, and static preview/base path.
- README supported formats, privacy/network behavior, installed dependencies, and local map claims match current source/configuration.
- .context/project/01-overview.md now includes Vitest plus Playwright commands.
- Architecture's parser, export, and local-map descriptions still match their implemented paths.

## Existing non-new boundaries

- B03: README.md:225-227 says MIT, but no root LICENSE contains the actual grant. Exact holder/year/legal intent still require owner input.
- B01/B02: the Pages workflow still omits npm test and grants Pages/OIDC writes at workflow scope; changing CI/CD requires explicit authorization.
- B04: src/components/MapView.tsx:589-594 claims preserved-buffer cost is negligible without representative evidence. Treat that assertion as unproven until the existing hardware-measurement exit criterion is met.

## Final missed-issue sweep

Rechecked setup/test/build commands, ports, test runners, supported inputs, base paths, privacy, locale parity, export terms, licensing, inline claims, and active context references. No second new documentation defect was confirmed. No deployment or production configuration change was made.
