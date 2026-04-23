# Cycle r8 — Security Reviewer (2026-04-23)

## Scope

Security review at cycle-r8 start. `npm audit --audit-level=high`
passes with 0 vulnerabilities. Static-export CSP hardening still
ran on the build (`[harden-static-export] Hardened CSP across 3 HTML
file(s)`). Smoke invariants (`object-src 'none'`, `base-uri 'none'`,
no meta `frame-ancestors`) pass.

## Observations

1. The Escape-to-cancel listener added in cycle r7 uses `capture:true`
   but only runs while `isExporting === true`; it does NOT expose any
   new DOM surface to untrusted input (the export-overlay is triggered
   from a same-origin user gesture on an already-loaded app). It does
   not re-enter any remote code path.
2. No new network egress endpoints.
3. Deferred security-adjacent items (Nominatim CSP allowance
   R4-AGG-D9) remain deferred; no geocoding was re-enabled.
4. MediaBunny/WebCodecs boundary untouched.

## Findings

### SR8-1 — No new security findings (INFO)

## Verdict

No action required from the security lane.
