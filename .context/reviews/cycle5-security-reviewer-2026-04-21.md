# Cycle 5 Security Review -- 2026-04-21

**Reviewer:** security-reviewer
**Scope:** OWASP top 10, secrets, unsafe patterns, auth/authz, CSP, input validation

---

## Review Summary

The codebase has a strong security posture: CSP is properly hardened in production via `scripts/harden-static-export.mjs`, no server-side endpoints exist (static export only), no secrets in code, and all user input is properly validated. Found 0 new security issues.

---

## New Findings

None.

---

## Security Verification

**CSP:**
- Production CSP is hash-based (hardened by postbuild script)
- `frame-ancestors 'none'` prevents clickjacking
- `object-src 'none'` prevents plugin injection
- `base-uri 'none'` prevents base tag hijacking
- `upgrade-insecure-requests` forces HTTPS

**Input validation:**
- GPX/KML parsing uses `DOMParser` (safe, no XXE with `application/xml` parser)
- `stripXmlEntities` removes `<!DOCTYPE>` and `<!ENTITY>` to prevent XXE
- JSON depth check (`checkJsonDepth`) prevents deep-nesting DoS
- File size limits enforced before parsing (200MB GPX, 100MB JSON)
- Track point count capped at 250,000
- Coordinate validation rejects `|lat| > 90` and `|lng| > 180`

**XSS prevention:**
- No `innerHTML` usage anywhere
- Single `dangerouslySetInnerHTML` for bootstrap script, with CSP hash
- React's default escaping protects all rendered content

**Data handling:**
- All processing is client-side only (no network requests except map tiles)
- `navigator.share` checked with `canShare` before offering
- `showSaveFilePicker` with proper error handling
- localStorage writes wrapped in try/catch

**Previously reported -- still valid:**
- C4-A6: `showSaveFilePicker` typed via double cast (LOW risk, deferred)
- DF-C2-009: Residual CSP allows inline styles (HIGH/HIGH, deferred)
