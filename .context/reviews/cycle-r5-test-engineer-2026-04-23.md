# Cycle r5 — test-engineer (2026-04-23)

## Scope

Review `e2e/travelback.spec.ts` and scripts — look for assertion gaps flagged in cycle-r4 deferred items, plus new coverage opportunities opened by cycle-r4 changes.

## Findings

### TE-1 (LOW, HIGH) — Add landmark assertion spec (cycle-r4 deferred D6)

- **Files**: `e2e/travelback.spec.ts`.
- **Evidence**: cycle-r4 added `<main>` landmark at `src/app/page.tsx:314`. Exit criterion for R4-AGG-D6 is: "next cycle adds a tiny spec asserting the `<main>` landmark exists." This is cheap — one `await expect(page.locator('main#app[data-travelback-app-root="true"]')).toBeVisible()`.
- **Fix**: add a single test `'exposes a main landmark on the landing page'` at the top of `test.describe('Travelback App', …)`.
- **Schedule**: YES — the exit criterion from cycle-r4 is now actionable.

### TE-2 (LOW, HIGH) — Smoke test assertion for no `unsafe-eval` in hardened CSP

- **Files**: `scripts/smoke-static.mjs:76-110`.
- **Evidence**: existing smoke asserts no `'unsafe-inline'` for `script-src`, asserts `sha256-` hashes, asserts no Nominatim, asserts no `frame-ancestors`. Would benefit from also asserting the emitted CSP declares `'none'` for `object-src` and `'self' 'unsafe-inline'` NOT being mixed anywhere (currently only flagged for script-src). Tiny hardening.
- **Fix**: assert `csp.includes("object-src 'none'")` and `csp.includes("base-uri 'none'")`.
- **Schedule**: YES — cheap + matches the STYLE_POLICY invariant in `harden-static-export.mjs`.

### TE-3 (LOW, MEDIUM) — Cycle-r4 carryover: Lighthouse / LCP / INP e2e spec

- **Files**: `e2e/` none.
- **Schedule**: DEFER (R4-AGG-D13).

### TE-4 (LOW, MEDIUM) — Cycle-r4 carryover: `prefers-reduced-motion` spec

- **Files**: `e2e/` none.
- **Schedule**: DEFER (R4-AGG-D12).

### TE-5 (INFO, HIGH) — Existing e2e confirms stability of cycle-r4 changes

- e2e at time of writing still running; last published status from earlier runs showed passing. We run again post-plan to confirm.

## Confidence summary

Schedule TE-1 (landmark spec) and TE-2 (smoke assertions). Defer TE-3 and TE-4.
