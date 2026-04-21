# Cycle 6 Security Review -- 2026-04-21

**Reviewer:** security-reviewer
**Scope:** OWASP top 10, secrets, unsafe patterns, auth/authz, CSP, input validation

---

## Review Summary

The codebase maintains a strong security posture. No new security issues found this cycle. All prior security findings remain documented and deferred.

---

## New Findings

None.

---

## Security Verification

**Input validation:**
- GPX/KML parsing: `stripXmlEntities` + `DOMParser` with `application/xml` -- safe from XXE
- JSON: `checkJsonDepth` prevents deep-nesting DoS
- File size limits: 200MB GPX, 100MB JSON
- Track point count: capped at 250,000
- Coordinate validation: `|lat| > 90` and `|lng| > 180` rejected

**XSS prevention:**
- No `innerHTML` usage
- Single `dangerouslySetInnerHTML` for bootstrap script (CSP-hashed in production)
- React's default escaping protects all rendered content

**CSP:**
- Production CSP is hash-based (hardened by `scripts/harden-static-export.mjs`)
- `frame-ancestors 'none'` prevents clickjacking
- `object-src 'none'` prevents plugin injection
- `base-uri 'none'` prevents base tag hijacking

**Data handling:**
- All processing is client-side only
- localStorage writes wrapped in try/catch
- `showSaveFilePicker` with proper error handling

**Previously reported -- still valid:**
- DF-C2-009: Residual CSP allows inline styles (HIGH/HIGH, deferred)
- C4-A6: `showSaveFilePicker` typed via double cast (LOW risk, deferred)
