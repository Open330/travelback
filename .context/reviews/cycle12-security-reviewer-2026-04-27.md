# Cycle 12 Security Review — 2026-04-27

Reviewer: security-reviewer
Scope: OWASP top 10, secrets, unsafe patterns, auth/authz

## Findings

No new security findings this cycle.

### Verified correct

- `parseXml` ordering: `preflightXml` (DOCTYPE/ENTITY rejection) runs before `stripXmlEntities` (sanitization). Defense-in-depth model is correctly implemented at `parser.ts:188-198`.
- File size limits: JSON (100MB), XML (4MB), general (200MB) enforced in `parser.ts:707-711`.
- XML entity budget: `XML_MAX_TAGS` (150K) and `XML_MAX_NESTING_DEPTH` (128) enforced in `preflightXml`.
- JSON depth check: `checkJsonDepth` limits nesting to 64 levels for the worker path.
- Worker message validation: `onmessage` handler validates `event.data` shape before accessing properties (`parser.ts:646-648`).
- CSP hardening: `harden-static-export.mjs` computes SHA-256 hashes for inline scripts and enforces strict CSP. Placeholder CSP is rejected at build time.
- Worker ArrayBuffer transfer: Large file buffers are transferred (not copied) to the worker to avoid doubling memory.
- Export filename sanitization: Track name is normalized (NFKC), control characters stripped, length capped at 64 chars (`videoEncoder.ts:180-186`).

### Carried forward (unchanged)

- Worker message deep validation (AG6-05, LOW-MEDIUM) — deferred, same-origin worker boundary mitigates.
