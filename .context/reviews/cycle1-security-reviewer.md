# Cycle 1 Security Review — security-reviewer

**Repository:** `/Users/hletrd/flash-shared/Travelback`  
**Date:** 2026-04-25  
**Reviewer:** security-reviewer  
**Risk Level:** MEDIUM

## Summary

- Critical Issues: 0
- High Issues: 0
- Medium Issues: 2
- Low Issues: 1
- Dependency audit: 0 known vulnerabilities from `npm audit --audit-level=high --json`
- Secrets: no hardcoded credentials found in active source/config paths
- Auth/authz: no app-owned auth/session/API/database surface found
- Static export smoke: `npm run smoke:static` passed

The app is a static-export, client-only Next.js application. Its main security-relevant surfaces are untrusted local file parsing, browser CSP/static deployment hardening, worker message boundaries, local static serving, browser storage, exports/downloads, and supply-chain/build scripts.

## Review-Relevant Inventory

Reviewed active source/config/build/test/public files under:

- `src/app/*`
- `src/components/*`
- `src/lib/*`
- `src/styles/*`
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`
- `public/*.svg`, guide SVGs, sample GPX
- `scripts/*.mjs`
- `.github/workflows/deploy-pages.yml`
- `package.json`, `package-lock.json`
- `next.config.ts`
- `playwright*.config.ts`
- `eslint.config.mjs`, `postcss.config.mjs`
- `e2e/*`

Excluded generated/vendor directories as requested:

- `node_modules`
- `.next`
- `out`
- `.git`

Also skipped prior review/plan artifacts for vulnerability conclusions, except where pattern scans produced false-positive matches.

## Evidence Run

- Inventory:
  - 927 non-generated files excluding `node_modules`, `.next`, `out`, `.git`
  - 84 tracked source/config/public/test files in primary review scope
- Secrets scan:
  - Current tracked source/config scan only found expected `.github/workflows/deploy-pages.yml:11` `id-token: write`
  - No `.env*`, private keys, API keys, bearer tokens, passwords, or client secrets found in active source/config paths
  - Git-history pattern scan produced review-text false positives only; no actual secret material identified in reviewed output
- Dependency audit:
  - `npm audit --audit-level=high --json`
  - Result: 0 total vulnerabilities
- Static export smoke:
  - `npm run smoke:static`
  - Result: `[smoke-static] OK`
  - Verified CSP hardening checks, local map styles, cache policy checks, and forbidden tool residue checks in static output

## Findings

### 1. Static GitHub Pages deployment cannot enforce `frame-ancestors`

**Severity:** MEDIUM  
**Confidence:** High  
**Status:** Confirmed  
**OWASP:** A05 Security Misconfiguration / A04 Insecure Design  
**Location:**  
- `src/app/layout.tsx:53`
- `scripts/harden-static-export.mjs:9-14`
- `src/app/layout.tsx:63-66`

**Issue:**

The production static CSP is delivered as a meta tag. The hardening script correctly omits `frame-ancestors` because that directive is header-only, but the GitHub Pages deployment does not provide a response-header equivalent. The app relies on a JavaScript frame-buster in `layout.tsx:53`.

**Exploit / failure scenario:**

If the app is embedded by a hostile site before or around script execution, the attacker can attempt clickjacking or UI-redress flows around file upload/export controls. The inline frame-buster reduces risk, but header-based `frame-ancestors 'none'` is the reliable browser-enforced control.

**Suggested fix:**

Serve production behind a header-capable host/CDN, or configure equivalent headers wherever possible:

```http
Content-Security-Policy: frame-ancestors 'none'; base-uri 'none'; object-src 'none'
X-Frame-Options: DENY
```

If staying on GitHub Pages, document this as an accepted residual risk and keep the JS frame-buster plus smoke coverage.

---

### 2. GPX/KML parsing remains synchronous on the main thread

**Severity:** MEDIUM  
**Confidence:** High  
**Status:** Confirmed  
**OWASP:** A05 Security Misconfiguration / A06 Vulnerable and Outdated Components context / Client-side DoS  
**Location:**  
- `src/lib/parser.ts:151-160`
- `src/lib/parser.ts:166-218`
- `src/lib/parser.ts:541-543`
- `src/lib/parser.ts:678-698`

**Issue:**

JSON imports are routed through a Web Worker with size/depth/point-count checks, but GPX/KML files are read as text and parsed synchronously with `DOMParser` on the UI thread. The 4 MB XML cap and entity stripping are good defenses, but a small, deeply nested, or dense XML/KML file can still force synchronous DOM construction and `@tmcw/togeojson` traversal.

**Exploit / failure scenario:**

A user drags a crafted 3–4 MB KML/GPX file with extreme nesting or dense coordinate data. The app can freeze the tab while `DOMParser` and extraction run, causing client-side availability loss. This is local-user impact, not remote code execution.

**Suggested fix:** Move XML parsing into a worker and add cheap pre-DOM scanning for entity/DOCTYPE and nesting depth before `DOMParser`.

---

### 3. Production CSP still allows inline styles

**Severity:** LOW  
**Confidence:** High  
**Status:** Confirmed  
**OWASP:** A05 Security Misconfiguration  
**Location:**  
- `src/app/layout.tsx:66`
- `scripts/harden-static-export.mjs:22`

**Issue:**

The production CSP uses `style-src 'self' 'unsafe-inline'`. This appears necessary for current React inline styles / MapLibre behavior, and script CSP is hardened with hashes by `scripts/harden-static-export.mjs`. Still, allowing inline styles weakens CSP as a defense-in-depth control against UI redress if another injection bug is introduced later.

**Exploit / failure scenario:**

If a future DOM injection bug allows attacker-controlled HTML but not script, inline style permission may make phishing overlays, hidden controls, or visual manipulation easier.

**Suggested fix:** Treat as defense-in-depth backlog unless MapLibre/React styling is refactored; prefer class/CSS-variable driven styling and a future `style-src 'self'` or nonce/hash-based style policy where feasible.

## Positive Security Findings

- No app-owned backend/API routes found.
- No auth/session/JWT/password/database code found.
- No SQL/NoSQL/command execution sinks found.
- No user-controlled `dangerouslySetInnerHTML` found.
- Single `dangerouslySetInnerHTML` use is a hardcoded bootstrap script in `src/app/layout.tsx:53-58`.
- Production postbuild hardening replaces placeholder script CSP with hash-based `script-src`.
- `scripts/smoke-static.mjs:111-155` verifies static CSP is hardened and no longer allows `script-src 'self' 'unsafe-inline'`.
- `scripts/serve-static.mjs:88-104` blocks path traversal with decoding, normalization, and `isInside()`.
- `scripts/serve-static.mjs:148-159` sets `nosniff`, `DENY`, referrer policy, HSTS, permissions policy, COOP, and CORP for local static serving.
- Worker boundary for Google JSON validates message shape and size in `public/workers/trackParser.worker.js:310-341`.
- Parser enforces coordinate bounds, JSON depth, file size limits, and max point count in `src/lib/parser.ts`.
- External links use `rel="noopener noreferrer"` in `src/components/GoogleGuide.tsx:367-371`.
- Export filenames are sanitized in `src/lib/videoEncoder.ts:157-166`.
- GitHub Pages workflow has least-privilege deployment permissions for Pages: `.github/workflows/deploy-pages.yml:8-11`.

## OWASP Top 10 Checklist

- [x] A01 Broken Access Control — no protected resources/auth routes present
- [x] A02 Cryptographic Failures — no secret storage/custom crypto; no credentials found
- [x] A03 Injection — no SQL/command sinks; React escaping used; XML parser DoS noted separately
- [x] A04 Insecure Design — static framing residual risk noted
- [x] A05 Security Misconfiguration — CSP/frame/style findings noted
- [x] A06 Vulnerable and Outdated Components — `npm audit` clean; outdated packages noted but no known audit CVEs
- [x] A07 Identification and Authentication Failures — no auth surface
- [x] A08 Software and Data Integrity Failures — lockfile present; CI uses `npm ci`; Actions pinned by major version
- [x] A09 Security Logging and Monitoring Failures — no backend monitoring surface; client logs do not expose secrets in reviewed paths
- [x] A10 SSRF — no server-side fetch; client fetches are same-origin sample/static checks

## Dependency Review

`npm audit --audit-level=high --json` result: Critical 0, High 0, Moderate 0, Low 0, Total 0.

`npm outdated --json` shows patch/minor updates available, but no audit-confirmed vulnerabilities. Do not mutate dependencies in this review lane.

## Skipped-File Confirmation

Skipped from manual security conclusions: `node_modules/`, `.next/`, `out/`, `.git/`, generated `test-results/`, `playwright-report/`, and prior review/plan documents except as false-positive scan context.

## Final Missed-Issue Sweep

Final pattern sweeps covered hardcoded secrets/tokens/keys, unsafe DOM APIs, `dangerouslySetInnerHTML`, `innerHTML`/`outerHTML`, `eval`/`new Function`, `postMessage`/worker messages, `DOMParser`/untrusted file parsing, fetch, storage, auth/session/JWT/password/database strings, and build/deploy scripts. No additional actionable security issues were identified.
