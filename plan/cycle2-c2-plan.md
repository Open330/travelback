# Cycle 2 Implementation Plan — 2026-04-24

## Review Summary

Cycle 2 deep review ran across the available registered review roles:
code-reviewer, security-reviewer, critic, verifier, test-engineer, architect,
debugger, and designer. The environment did not register perf-reviewer,
tracer, or document-specialist roles for this run.

Source aggregate: `.context/reviews/cycle-c2-aggregate-2026-04-24.md` and
`.context/reviews/_aggregate.md`.

## Repository rules consulted

- `.context/development/01-conventions.md`: TypeScript strict mode, no semicolons, single quotes, 2-space indentation, `npm run build` / `npm run lint` required, GPG-signed semantic gitmoji commits.
- `.context/README.md`, `.context/project/01-overview.md`, and `.context/project/02-architecture.md`: client-only/static-export privacy boundary, local map styles, camera/export architecture, and review/plan traceability.
- No `CLAUDE.md`, root `AGENTS.md`, `.cursorrules`, or `CONTRIBUTING.md` exists at the repo root.

## Findings Disposition

### Scheduled implementation items

#### C2-TASK-1 — Fix antimeridian scene/overview camera math

- **Findings:** C2-AGG-001, C2-AGG-007
- **Severity/confidence:** Medium / High
- **Files:** `src/lib/camera.ts`, `e2e/fixtures/antimeridian.gpx`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Shift crossed longitudes into a contiguous `[0, 360]` cluster using the same negative-longitude `+360` strategy as map fit-bounds.
  2. Interpolate camera center longitude with `shortestLngDelta()` and normalize the result.
  3. Add an antimeridian GPX fixture and an E2E regression for scene overview camera zoom/framing.
- **Status:** DONE

#### C2-TASK-2 — Make JourneyCreator duplicate suppression dateline-aware

- **Findings:** C2-AGG-002, C2-AGG-007
- **Severity/confidence:** Low / High
- **Files:** `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Use `shortestLngDelta()` inside JourneyCreator's local equirectangular distance helper.
  2. Add an E2E regression proving antimeridian-adjacent coordinate entries remain one waypoint.
- **Status:** DONE

#### C2-TASK-3 — Localize committed scene preset names

- **Finding:** C2-AGG-003
- **Severity/confidence:** Low / High
- **Files:** `src/components/SceneEditor.tsx`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Keep `camera.ts` locale-neutral, but translate preset scene names when SceneEditor commits a preset.
  2. Reuse existing camera and scene translation keys instead of adding a large new translation-key surface.
  3. Add an E2E regression for Korean preset names.
- **Status:** DONE

#### C2-TASK-4 — Preserve explicit map-style intent across reload

- **Finding:** C2-AGG-004
- **Severity/confidence:** Low / High
- **Files:** `src/app/page.tsx`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Persist a separate map-style explicitness flag when users cycle styles.
  2. Mark theme-derived map style writes as non-explicit.
  3. Infer explicitness for older stored non-theme styles so existing user choices survive migration.
  4. Extend the E2E map-style test to reload before toggling theme.
- **Status:** DONE

#### C2-TASK-5 — Complete JourneyCreator coordinate combobox keyboard behavior

- **Finding:** C2-AGG-005
- **Severity/confidence:** Medium / High
- **Files:** `src/components/JourneyCreator.tsx`, `e2e/travelback.spec.ts`
- **Plan:**
  1. Track an active result index.
  2. Wire `aria-activedescendant`, `aria-selected`, ArrowUp/ArrowDown/Home/End/Escape, and Enter-to-select behavior.
  3. Cover keyboard selection in E2E.
- **Status:** DONE

#### C2-TASK-6 — Add timeline slider value text

- **Finding:** C2-AGG-006
- **Severity/confidence:** Low / High
- **Files:** `src/components/TimelineSelector.tsx`, `e2e/travelback.spec.ts`
- **Plan:** Add localized `aria-valuetext` for start/end handles and assert it in E2E.
- **Status:** DONE

## Deferred Findings

Deferred items follow the repo rules and review-plan-fix deferred-fix rules: no silent drops, severity/confidence preserved, concrete reason and exit criterion recorded.

### C2-AGG-D01 — Large JSON imports can fall back to main-thread parsing if Worker creation is unavailable

- **Source:** code-reviewer
- **Citation:** `src/lib/parser.ts:429-628`, `public/workers/trackParser.worker.js:289-322`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** This is parser-worker architecture and import-limit strategy work already represented by review-plan-fix cycle 1 deferred items `DEF-001` and `DEF-002` in `plan/deferred-cycle1-review-plan-2026-04-24.md`. A narrow patch would risk masking the real worker/bundling design issue.
- **Exit criterion:** Re-open when adding a generated/shared worker bundle or streaming/chunked parser path.

### C2-AGG-D02 — Main and Worker Google parser logic remains duplicated

- **Source:** code-reviewer, architect non-finding
- **Citation:** `src/lib/parser.ts:429-628`, `public/workers/trackParser.worker.js:289-322`
- **Original severity/confidence:** Medium / High
- **Reason for deferral:** Already captured as `DEF-001` in `plan/deferred-cycle1-review-plan-2026-04-24.md`. Replacing duplicated public worker logic requires build-pipeline design and test-harness decisions.
- **Exit criterion:** Re-open when introducing a worker bundling/generation step; completion means one source of truth generates both main and worker parser behavior.

### C2-AGG-D03 — JourneyCreator can miss initialization if activated before the MapLibre handle exists

- **Source:** code-reviewer
- **Citation:** `src/components/JourneyCreator.tsx:221-412`
- **Original severity/confidence:** Low / Medium
- **Reason for deferral:** Current UI exposes Journey Creator after the app shell and MapView have mounted; no failing path was reproduced in review or gates. A retry/ready signal would touch shared map lifecycle boundaries and should be driven by a concrete reproduction.
- **Exit criterion:** Re-open if Journey Creator is exposed earlier in startup or if a test/user report shows an active panel without journey map layers.

## Implementation Progress

Status: complete as of 2026-04-24.

- [x] C2-TASK-1 — antimeridian camera math fixed and covered.
- [x] C2-TASK-2 — dateline-aware JourneyCreator duplicate suppression fixed and covered.
- [x] C2-TASK-3 — localized SceneEditor preset names fixed and covered.
- [x] C2-TASK-4 — explicit map-style persistence fixed and covered.
- [x] C2-TASK-5 — JourneyCreator coordinate combobox keyboard behavior fixed and covered.
- [x] C2-TASK-6 — Timeline handle `aria-valuetext` fixed and covered.

## Gate evidence

- [x] `npm run lint` — passed before commit.
- [x] `npm run typecheck` — passed before commit.
- [x] Targeted Playwright dev run (`journey coordinate search|scene overview camera|scene presets use localized|explicit map style choices`) — passed, 4 tests.
- [x] `npm audit --audit-level=high` — passed with 0 vulnerabilities.
- [x] `npm run build` — passed, including `postbuild` CSP hardening.
- [x] `npm run smoke:static` — passed.
- [x] `npm run test:e2e:static:ci` — passed, 59 tests.
