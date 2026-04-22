# Security Reviewer — Cycle 5 (2026-04-23)

## Methodology
Reviewed all source files for OWASP Top 10 vulnerabilities, unsafe patterns, secrets exposure, XSS, injection, and auth/authz issues. Cross-referenced prior cycle findings.

## New Findings

### C5-S1. ReDoS potential in parseSemanticSegments coordinate regex
- **Severity**: LOW | **Confidence**: MEDIUM
- **Files**: `src/lib/parser.ts:277, 300`, `public/workers/trackParser.worker.js:106, 124`
- **Issue**: The regex patterns used to parse coordinate strings from Google data use `([-\d.]+)` which could match very long numeric strings. However, these are applied to strings from parsed JSON data (already in memory), not user-typed input. The regex patterns themselves are not complex (no backtracking), so the ReDoS risk is negligible. The patterns are:
  - `/geo:([-\d.]+),([-\d.]+)/` — no alternation or backtracking
  - `/([-\d.]+)[°]?,\s*([-\d.]+)/` — simple alternation
- **Impact**: Negligible — these regexes don't have catastrophic backtracking patterns. The input is bounded by JSON.parse limits.

### C5-S2. CSP unsafe-inline remains in dev (acknowledged by prior finding)
- **Severity**: MEDIUM | **Confidence**: HIGH (already deferred as DF-C17-003)
- **File**: `src/app/layout.tsx:59-63`
- **Status**: No change from prior cycles. The harden script exists and runs during build. CI validation is deferred.

## Security Posture Summary
- No new security vulnerabilities found in this cycle
- XSS: No `dangerouslySetInnerHTML` except the bootstrap script (which is minified and controlled)
- Secrets: No API keys, tokens, or credentials in source code
- Input validation: Parser has proper bounds checking (NaN, coordinate limits, file size, depth limits)
- CSP: `frame-ancestors 'none'` prevents clickjacking; `object-src 'none'` prevents plugin injection
- The `showSaveFilePicker` type casting is safe — the API is feature-detected first
- Download fallback uses `document.createElement('a')` which is standard and safe
- `navigator.share` is feature-detected and file-type validated before use

## Previously Deferred (Carried Forward)
- DF-C17-003: CSP unsafe-inline CI check (MEDIUM/HIGH) — no change
