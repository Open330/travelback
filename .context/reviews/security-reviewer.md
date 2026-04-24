# Security Review Report

**Scope:** Entire repository review of current security-relevant code and docs: `src/app/*`, `src/components/*`, `src/lib/*`, `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `scripts/*.mjs`, `.github/workflows/deploy-pages.yml`, `.context/project/*.md`.
**Risk Level:** LOW

## Summary
- Critical Issues: 0
- High Issues: 0
- Medium Issues: 0
- Low Issues: 0 confirmed
- Dependency audit: `npm audit --json` returned 0 vulnerabilities on April 24, 2026.
- Build/security verification: `npm run build` passed and `npm run smoke:static` passed on April 24, 2026.

## Inventory Reviewed
- App shell / CSP / framing: `src/app/layout.tsx`, `src/app/page.tsx`, `next.config.ts`
- File ingestion and parsing: `src/components/FileUpload.tsx`, `src/lib/parser.ts`, `public/workers/trackParser.worker.js`
- Browser map/render/export surface: `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/lib/useExportController.ts`, `src/lib/videoEncoder.ts`, `src/types.ts`
- Static hardening / serving / CI: `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `.github/workflows/deploy-pages.yml`
- External-link / modal / misc browser safety: `src/components/GoogleGuide.tsx`, `src/components/ModalDialog.tsx`, `src/lib/env.ts`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`
- Local map-style assets and architecture docs: `public/map-styles/*.json`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`

## Findings
No confirmed exploitable security vulnerability was identified in the current repository.

## Evidence By Review Area

### Secrets Exposure
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- Current-source secret scan found no hardcoded API keys, bearer tokens, passwords, private keys, client secrets, or `.env*` files in active source/config paths.
- Git history spot-scan for common secret patterns did not reveal actual secret material in reviewed output.
- `.github/workflows/deploy-pages.yml:8-11` contains only expected GitHub Pages OIDC permissions (`contents: read`, `pages: write`, `id-token: write`).

### Dependency / Supply Chain
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- `package.json` contains a small browser-only dependency set.
- `npm audit --json` reported 0 known vulnerabilities.
- CI also enforces `npm audit --audit-level=high` in `.github/workflows/deploy-pages.yml:26-33`.

### Injection / XSS / DOM Sinks
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- The only `dangerouslySetInnerHTML` usage is the controlled bootstrap script in `src/app/layout.tsx:53-66`.
- Production builds replace the dev placeholder CSP with hash-based `script-src` values in `scripts/harden-static-export.mjs:57-115`.
- Static smoke coverage verifies no `unsafe-inline` remains for scripts and that hashes exist in `scripts/smoke-static.mjs:76-120`.
- No `eval`, `new Function`, `innerHTML` assignment, or `document.write` was found in current source.

### Untrusted File / Input Handling
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- Upload surface is extension-gated in `src/components/FileUpload.tsx:19-20,95-107,124-128,144-149,240-245`.
- File size is bounded in `src/lib/parser.ts:521-523,623-633`.
- XML parsing strips `DOCTYPE` and `ENTITY` declarations before `DOMParser` in `src/lib/parser.ts:145-157`, reducing XXE-style parser abuse in browser XML parsing.
- GPX/KML/JSON coordinate values are numeric/range-validated before use in `src/lib/parser.ts:19-30,55-63,165-176,233-239,342-369` and mirrored in `public/workers/trackParser.worker.js:29-42,119-143`.
- JSON nesting depth is bounded in `src/lib/parser.ts:446-463` and `public/workers/trackParser.worker.js:270-287`.
- Worker messages are shape-validated before parsing in `public/workers/trackParser.worker.js:289-320`.
- Main-thread fallback for workerless browsers is bounded to small JSON only in `src/lib/parser.ts:529-538,541-619`.

### Auth / Authz / Access Control
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- No API routes, middleware auth layer, session handling, JWT handling, password logic, database access, or server-side authorization surface was found under `src/app` or `scripts`.
- `next.config.ts:5-10` configures a static export (`output: 'export'`), materially shrinking the server attack surface.

### Browser / CSP / Network Posture
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- CSP placeholder is declared in `src/app/layout.tsx:63-67`; production CSP is hardened postbuild in `scripts/harden-static-export.mjs:14-29,103-115`.
- Static smoke tests assert hash-based script CSP, `connect-src 'self'`, no `frame-ancestors` meta misuse, and required `object-src 'none'` / `base-uri 'none'` in `scripts/smoke-static.mjs:76-120`.
- Map styles are local-only. `public/map-styles/*.json` declare empty `sources` and no `sprite`/`glyphs`; `scripts/smoke-static.mjs:122-145` verifies those invariants.
- External links in `src/components/GoogleGuide.tsx:367-375` correctly use `target="_blank"` with `rel="noopener noreferrer"`.

### File Serving / Path Traversal / Header Hardening
**Severity:** INFO
**Confidence:** HIGH
**Evidence:**
- Static preview server rejects traversal by normalizing the path and enforcing `isInside(outDir, absolutePath)` in `scripts/serve-static.mjs:20-22,86-118`.
- It rejects malformed paths and NUL bytes in `scripts/serve-static.mjs:87-95`.
- It sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS, `Permissions-Policy`, COOP, and CORP in `scripts/serve-static.mjs:146-158`.

## Residual Risks / Assumptions
These are not confirmed exploitable findings in the current repo, but they remain the main security assumptions:

### 1. Anti-framing on GitHub Pages depends on client-side execution
**Severity:** LOW
**Confidence:** HIGH
**Location:** `src/app/layout.tsx:53-66`, `.context/project/02-architecture.md:114-119`, `scripts/smoke-static.mjs:104-109`
**Failure scenario:** GitHub Pages cannot attach custom `frame-ancestors` / `X-Frame-Options` response headers. The repo compensates with a bootstrap frame-buster, but that means anti-clickjacking for the public Pages deployment depends on client JavaScript running successfully before meaningful UI use.
**Why not a confirmed vulnerability:** The app is a JS-heavy static client, the bootstrap actively blanks framed execution, and the repo documentation explicitly treats header-based anti-framing as a hosting limitation rather than an unfixed code bug.
**Suggested hardening:** If the app is fronted by a CDN or another host that can add headers, send `Content-Security-Policy: frame-ancestors 'none'` and/or `X-Frame-Options: DENY` there.

### 2. `style-src 'unsafe-inline'` remains a containment tradeoff
**Severity:** LOW
**Confidence:** MEDIUM
**Location:** `src/app/layout.tsx:66`, `scripts/harden-static-export.mjs:21`, `scripts/smoke-static.mjs:76-120`
**Failure scenario:** If a separate DOM/CSS injection bug were introduced later, inline-style allowance would slightly weaken CSP containment.
**Why not a confirmed vulnerability:** No current DOM injection sink was found, and the project appears to rely on inline style allowances for framework/runtime behavior.
**Suggested hardening:** Keep treating this as a deferred defense-in-depth item unless the rendering stack changes enough to remove the need.

## OWASP Top 10 Coverage
- A01 Broken Access Control: No app-owned backend/API/authz surface found.
- A02 Cryptographic Failures: No custom cryptography or secret storage; no secret material found.
- A03 Injection: No SQL/command/template injection paths found; uploads are locally parsed and validated.
- A04 Insecure Design: Local-only static architecture reduces trust boundaries; worker fallback is bounded.
- A05 Security Misconfiguration: CSP hardening, static smoke assertions, preview security headers, and local-only styles are in place.
- A06 Vulnerable and Outdated Components: `npm audit` clean.
- A07 Identification and Authentication Failures: Not applicable; no auth implementation present.
- A08 Software and Data Integrity Failures: Postbuild CSP hardening and CI checks exist; no unsafe dynamic code loading found.
- A09 Security Logging and Monitoring Failures: No backend monitoring surface; reviewed client logs do not expose secrets.
- A10 SSRF: No server-side fetch surface. Browser fetches are same-origin sample asset reads only.

## Security Checklist
- [x] No hardcoded secrets in active source/config paths
- [x] All reviewed untrusted inputs validated or bounded
- [x] Injection prevention verified for applicable surfaces
- [x] Authentication/authorization surface checked (none present)
- [x] Dependencies audited

## Final Verdict
No confirmed security issue remains in the current repository based on the reviewed code, docs, dependency audit, build output, and static smoke checks. The main residual concern is hosting-level anti-framing on GitHub Pages, which is documented and partially mitigated in code but would be stronger with header control at the CDN/host layer.
