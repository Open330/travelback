# Cycle r4 — Document Specialist — 2026-04-23

Doc / code-mismatch scan.

## DS-1 (LOW, HIGH) — `.context/project/02-architecture.md:117` already notes meta CSP cannot enforce `frame-ancestors`, but the live meta still advertises it

- Recommend dropping `frame-ancestors 'none'` from the two meta paths AND adding a one-liner to `.context/project/02-architecture.md` that says: "meta CSP no longer advertises frame-ancestors; enforce at the host level (X-Frame-Options or a real `Content-Security-Policy` HTTP header)."
- **Schedule this cycle.**

## DS-2 (LOW, HIGH) — `.context/development/01-conventions.md`: no change needed

- TypeScript/ESNext/React 19/Next 16 guidance still accurate.

## DS-3 (LOW, MEDIUM) — In-source "weight 100" comment in `src/app/globals.css:28`

- Accurately describes the vitro-base weight default. No doc drift.

## DS-4 (LOW, MEDIUM) — `scripts/harden-static-export.mjs:8-24` STYLE_POLICY constant drift

- Currently contains `frame-ancestors 'none'`. After the fix, that line is removed and a short comment explains why ("removed: meta-CSP cannot enforce; host headers are authoritative, see docs").

## Summary

Schedule: DS-1, DS-4 (both part of BUI-1 / SEC-1 fix).
