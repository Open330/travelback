# Security Reviewer -- Cycle 7 (2026-04-21)

## Methodology

Reviewed all source files for OWASP Top 10, secrets, unsafe patterns, auth/authz issues. Cross-referenced prior deferred items.

## Prior Fix Verification

- CSP placeholder with harden-static-export.mjs: Confirmed (layout.tsx:59-63)
- Frame-busting bootstrap script: Confirmed (layout.tsx:49)
- No inline style CSP in production: Placeholder replaced by harden script

## New Findings

### C7-SR-1: GoogleGuide external link opens without noreferrer validation [LOW/LOW]

**File:** src/components/GoogleGuide.tsx:347-350
**Confidence:** LOW

The "Open Google Takeout" link uses `target="_blank" rel="noopener noreferrer"` which is correct. No issue found. Noting for completeness that this is properly handled.

### C7-SR-2: Worker source URL constructed from env variable without validation [LOW/LOW]

**File:** src/lib/parser.ts:454
**Confidence:** LOW

```typescript
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
worker = new Worker(`${basePath}/workers/trackParser.worker.js`)
```

The `NEXT_PUBLIC_BASE_PATH` is an environment variable set at build time. If somehow compromised, it could point the Worker to an arbitrary URL. However, this is a build-time constant baked into the static export, so it cannot be changed at runtime by an attacker. No exploitable path.

### No New Security Findings

The codebase's security posture remains solid. All prior deferred items (DF-C2-009: residual CSP inline styles) carry forward. No new HIGH or MEDIUM security findings.
