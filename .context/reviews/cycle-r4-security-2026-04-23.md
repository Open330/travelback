# Cycle r4 — Security Reviewer — 2026-04-23

Scope: OWASP top 10, secrets, unsafe patterns, auth/authz, CSP, supply chain.

## SEC-1 (LOW, HIGH) — Meta `frame-ancestors 'none'` is ignored by browsers (repeated console error) — prior deferral should be closed

- `src/app/layout.tsx:62`, `scripts/harden-static-export.mjs:12`.
- Browser console error: `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.`
- Defense is retained via the JS frame-buster in the bootstrap `(window.top !== window.self)` check (`src/app/layout.tsx:49`) and via host-level CSP headers documented in `.context/project/02-architecture.md:117`.
- Fix: drop `frame-ancestors 'none'` from both meta policies. Keep the JS breaker. Document the drop in `.context/project/02-architecture.md` so the "host headers remain authoritative" prose becomes operational guidance.
- **Schedule this cycle** (matches BUI-1).

## SEC-2 (LOW, MEDIUM) — Nominatim search CSP `connect-src 'self'` — unchanged from cycle-r3

- `src/components/JourneyCreator.tsx:~80`-ish. The `parseCoordinateQuery` path is local-only; if Nominatim is ever invoked, it needs a CSP exemption OR a different UX (upload a local geocoder). Not invoked in the default flow.
- **Defer** (carryover; exit criterion unchanged).

## SEC-3 (LOW, HIGH) — No new secrets or dangerouslySet* usage introduced

- `src/app/layout.tsx:54` still uses `dangerouslySetInnerHTML` on the inline bootstrap script. The script content is static and hashed by `harden-static-export.mjs`. Correct.
- **No action.**

## SEC-4 (LOW, HIGH) — `npm audit --audit-level=high`: 0 vulnerabilities (re-verified)

- See the PROMPT 3 gate output.

## Summary

Schedule: SEC-1. Defer: SEC-2.
