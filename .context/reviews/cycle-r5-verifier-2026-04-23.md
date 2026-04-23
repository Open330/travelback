# Cycle r5 — verifier (2026-04-23)

## Scope

Verify that (a) gates green at the start of cycle r5 reflect repo HEAD, (b) cycle-r4 scheduled items remain present and correct, (c) no cycle-r4 finding silently dropped.

## Evidence

### V-1 — Gates at cycle-r5 start

- `npm run lint` → PASS (exit 0, empty output). Exit code verified via background task.
- `npm run typecheck` → PASS (exit 0, `tsc --noEmit` clean).
- `npm audit --audit-level=high` → PASS (`found 0 vulnerabilities`).
- `npm run build` → PASS (exit 0).
- `npm run smoke:static` → PASS (exit 0). `scripts/smoke-static.mjs:107-109` frame-ancestors guard fires successfully.
- `npm run test:e2e:static:ci` → running at verifier-write time (pid 34245 chromium_headless_shell-1208); we include a check post-plan.

### V-2 — Cycle-r4 scheduled items still in place (regressions check)

- P-1 (`frame-ancestors` drop from meta CSP):
  - `src/app/layout.tsx:62` — CSP content attribute contains no `frame-ancestors`. Verified via Read.
  - `scripts/harden-static-export.mjs:14-29` — `STYLE_POLICY` array has no `frame-ancestors` entry. The comment at L8-13 explains why. Verified.
- P-2 (root `<main>` landmark):
  - `src/app/page.tsx:314` — `<main id="app" className="relative w-screen h-screen overflow-hidden" data-travelback-app-root="true">`. Verified.
  - `ModalDialog.tsx:94` — `document.querySelector<HTMLElement>('[data-travelback-app-root="true"]')` still resolves since the attribute is preserved on `<main>`. Verified by Read.
- P-3 (drop-zone labeled):
  - `src/components/FileUpload.tsx:153-156` — `role="group" aria-labelledby="fileupload-title" aria-describedby="fileupload-drop-hint"`. Verified.
  - L212 `id="fileupload-title"`, L218 `id="fileupload-drop-hint"` — both set. Verified.
- P-4 (sample-preview caption hidden from a11y name):
  - `src/components/FileUpload.tsx:189` — caption div wrapped with `aria-hidden="true"`. Verified.
- P-5 (map-error Reload button `min-h-11`):
  - `src/components/MapView.tsx:949` — `className="gi mt-4 min-h-11 px-4 py-2 text-sm cursor-pointer"`. Verified.
- P-6 (sample-preview focus-visible ring):
  - `src/components/FileUpload.tsx:180` — `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`. Verified.
- P-7 (smoke regression guard):
  - `scripts/smoke-static.mjs:107-109` — `if (csp.includes('frame-ancestors')) throw new Error(…)`. Verified. Smoke run passed.
- P-8 (architecture doc update):
  - `.context/project/02-architecture.md:117-118` — cycle-r4 meta CSP note present. Verified.
- P-9 (user-injected queue cleared):
  - `.context/plans/user-injected/pending-next-cycle.md` — content states "(no pending items — U-2026-04-23-01 was ingested and removed in cycle r4;…)". Verified.

### V-3 — Cycle-r4 deferred items carry over unchanged

- R4-AGG-D1 through D13 — all remain in `.context/plans/deferred-findings-cycle-r4-2026-04-23.md`. Inspected. No exit criteria triggered this cycle (no design-owner sign-off, no forced-colors probe run, no 320w+ko probe run, no Lighthouse run).

### V-4 — No silent drops

- Aggregate `_aggregate.md` (cycle-r4 section) lists R4-AGG-1..R4-AGG-7 scheduled and R4-AGG-D1..R4-AGG-D13 deferred. All are either (a) implemented and verified present above, or (b) still deferred in deferred-findings-cycle-r4. No item was dropped without a record.

## Confidence summary

Gates green at cycle-r5 start. Cycle-r4 outcomes verified in place. No regressions.
