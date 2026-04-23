# Security Review — Cycle 1 (2026-04-23)

**Reviewer**: security
**Scope**: All 28 source files
**Methodology**: OWASP-aligned check for injection, XSS, data exposure, unsafe patterns, and CSP compliance.

---

## NEW FINDINGS

**None.**

### Areas checked with no new issues:

1. **XSS prevention**: No `innerHTML`, `dangerouslySetInnerHTML`, `eval()`, or `Function()` usage
2. **Injection**: XML entity stripping in parser, JSON depth limiting, file size limits enforced
3. **Data exposure**: No secrets, API keys, or credentials in source code
4. **CSP compliance**: `scripts/harden-static-export.mjs` computes Sha-256 hashes for inline scripts, replaces `unsafe-inline`
5. **localStorage safety**: All access wrapped in try/catch — no unhandled exceptions on blocked storage
6. **Input validation**: File type and size validation in FileUpload, codec probing in ExportPanel
7. **URL safety**: External links use `rel="noopener noreferrer"` (GoogleGuide)
8. **Web Worker**: Parser runs in isolated Worker context — no main-thread parsing of untrusted data
9. **Export cleanup**: Abort signal + mountedRef guard prevent use-after-free on cancelled exports

---

## DEFERRED ITEMS REVIEWED

- DF-C4-001 (CSP nonce vs hash): Still deferred, appropriate — hash-based CSP is correct for static export
- DF-C4-002 (Subresource Integrity for CDN): Still deferred, appropriate — no external CDN scripts loaded

---

## POSITIVE OBSERVATIONS

- No secrets or credentials anywhere in source
- Web Worker isolation for untrusted JSON parsing
- File size limits enforced before parsing
- Abort signal pattern prevents resource leaks on cancelled exports
