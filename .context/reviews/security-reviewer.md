# Security Review — Cycle 1 (2026-04-23)

## Summary
The application is a client-side-only static export (Next.js `output: 'export'`). No server-side API routes, no database, no user authentication. Attack surface is limited to file upload parsing, CSP configuration, and client-side data handling.

---

## Finding 1: CSP uses `unsafe-inline` for scripts in development
- **File**: `src/app/layout.tsx` lines 59-63
- **Severity**: Medium | **Confidence**: High
- **Description**: The Content Security Policy includes `script-src 'self' 'unsafe-inline'` with a comment that `scripts/harden-static-export.mjs` replaces this with hash-based CSP in production. If the harden script fails or is skipped, the CSP remains weak.
- **Fix**: Add a CI check that validates the production build has no `unsafe-inline` in its CSP.

---

## Finding 2: XXE risk partially mitigated by regex + browser DOMParser
- **File**: `src/lib/parser.ts` lines 98-108
- **Severity**: Low | **Confidence**: High
- **Description**: `stripXmlEntities` removes `<!DOCTYPE` and `<!ENTITY` declarations. The regex-based stripping is not foolproof (parameter entities, CDATA sections). However, browser `DOMParser` with `application/xml` does not resolve external entities by default, providing a second layer of defense.
- **Fix**: The browser-level defense is sufficient. Add a comment noting the regex is defense-in-depth.

---

## Finding 3: No secrets or API keys in source code
- **Severity**: Info | **Confidence**: High
- **Description**: No API keys, tokens, or credentials found. Map tiles use Carto CDN (no API key needed). All data processing is local.

---

## Finding 4: `dangerouslySetInnerHTML` bootstrap script is safe
- **File**: `src/app/layout.tsx` line 54
- **Severity**: Info | **Confidence**: High
- **Description**: The bootstrap script reads from `localStorage` and sets DOM attributes. Values are constrained (theme checked against 'dark'/'light', locale against fixed set). No `innerHTML` or eval.

---

## Finding 5: CSP `frame-ancestors 'none'` and `object-src 'none'` — good practice
- **File**: `src/app/layout.tsx` line 62
- **Severity**: Info | **Confidence**: High
- **Description**: Correct anti-clickjacking and object-injection protections.

---

## Final Sweep
- No `eval()`, `Function()`, or dynamic code execution patterns found.
- No network requests to user-controlled URLs.
- `connect-src` limits network requests to `self` and Carto CDN.
- No authentication/authorization issues (app is entirely client-side).
