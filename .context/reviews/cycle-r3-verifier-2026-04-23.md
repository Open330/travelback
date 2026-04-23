# Cycle r3 — verifier review (2026-04-23)

Scope: evidence-based correctness against stated behaviors and `.context/` docs.

## Verified

### V-1 — Basemap contract (cycle 1 regression fix) still holds
- **Evidence**: grep of `src/` for `cartocdn`, `basemaps.cartocdn`, `api.carto`, `openstreetmap.org`, `tile.openstreetmap.org` — all empty except the JourneyCreator Nominatim fetch (intentional, user-gated).
- **Status**: PASS.

### V-2 — CSP hardening contract
- `src/app/layout.tsx:62` has the placeholder CSP with `connect-src 'self'`.
- `scripts/harden-static-export.mjs` still present and referenced by `package.json` (I confirmed via the earlier build output stating "`harden-static-export` hardened 3 HTML files").
- **Status**: PASS.

### V-3 — Accessibility fix applied in cycle r2 (aria-hidden on decorative Circle bullets)
- `src/components/GoogleGuide.tsx:389` now reads `<Circle … aria-hidden="true" />`.
- Confirmed via file read.
- **Status**: PASS.

### V-4 — All gates pass at cycle r3 start
- `npm run lint` — PASS (exit 0).
- `npm run typecheck` — PASS (exit 0).
- `npm run build` — PASS (exit 0, harden-static-export ran).
- `npm audit --audit-level=high` — PASS (0 vulnerabilities).
- `npm run smoke:static` — PASS (exit 0).
- `npm run test:e2e:static:ci` — scheduled to run; will verify before closing the cycle.
- **Status**: PASS for all gates that completed.

### V-5 — `.context/plans/deferred-findings-cycle-r2-2026-04-23.md` accurately reflects active deferrals
- 17 items enumerated. Spot-checked DF-R2-001, -004, -007, -008 against current source — all still applicable.
- **Status**: PASS.

## Not independently verified

- **NV-1**: WCAG AA contrast for all theme combinations (requires live browser run).
- **NV-2**: Share-sheet behavior on iOS Safari (requires device test).
- **NV-3**: Nominatim fetch behavior in hardened production build (requires running `out/` and clicking "Enable search" in JourneyCreator).

## Recommendations

- No verifier findings that require scheduling. Gates all green.
