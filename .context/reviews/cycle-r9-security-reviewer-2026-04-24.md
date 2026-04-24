# Security Reviewer — Cycle r9 (2026-04-24)

## Inventory

All source files reviewed for OWASP top 10, secrets, unsafe patterns, auth/authz issues.

## Findings

### C9-SR-001: Bootstrap script uses `dangerouslySetInnerHTML` with inline CSP allowing `unsafe-inline` [INFO/HIGH]

**File:** `src/app/layout.tsx:49-63`

The inline bootstrap script and the CSP `unsafe-inline` directive are already well-documented and understood. The `harden-static-export.mjs` script replaces the placeholder CSP with a hash-based CSP in production builds. This is an intentional architecture decision, not a new finding.

**Status:** Already deferred as DF-C2-009. No new action needed.

### C9-SR-002: `localStorage` read/write failures silently ignored [LOW/MEDIUM]

Multiple files catch `localStorage` errors silently:

- `src/app/page.tsx:44,55,299,305,319` — theme/style persistence
- `src/lib/i18n.ts:1748,1767` — locale persistence
- `src/lib/interpolate.ts:151,158` — unit preference persistence
- `src/components/TimelineSelector.tsx:80,85` — hint dismissal

This is standard practice for progressive web apps that must function when storage is unavailable (private browsing, storage quota exceeded, etc.). Silent failure is the correct behavior here.

**Status:** Already deferred as DF-C4-014. No new action needed.

### C9-SR-003: External link in GoogleGuide opens without `noopener` duplication check [INFO/LOW]

**File:** `src/components/GoogleGuide.tsx:368-374`

The Google Takeout link uses `target="_blank" rel="noopener noreferrer"` which is correct. No issue found.

## Summary

- 0 new actionable findings
- All prior security deferred items confirmed still applicable
- No secrets, no XSS vectors, no injection risks found
