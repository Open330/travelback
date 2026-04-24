# Security Review Report

**Scope:** Entire repository review focused on OWASP-style client security, privacy, CSP, unsafe browser patterns, client-side file handling, dependency attack surface, and auth/authz if present.

**Risk Level:** LOW

## Inventory Reviewed

Review-relevant files examined:
- App/bootstrap/config: `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/env.ts`, `src/types.ts`
- Parsing and file-handling pipeline: `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/components/FileUpload.tsx`, `src/components/JourneyCreator.tsx`
- Export/download pipeline: `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`
- Browser/UI trust boundaries: `src/components/MapView.tsx`, `src/components/ModalDialog.tsx`, `src/components/GoogleGuide.tsx`, `src/components/ErrorBoundary.tsx`, `src/lib/i18n.ts`, `src/lib/interpolate.ts`
- Security/deploy scripts: `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `.github/workflows/deploy-pages.yml`
- Dependency manifests and tests: `package.json`, `package-lock.json`, `e2e/travelback.spec.ts`
- Context/docs reviewed for intended architecture and deployment constraints: `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`

## Summary
- Critical Issues: 0
- High Issues: 0
- Medium Issues: 0
- Low Issues: 0 confirmed
- Likely Risks / Hardening Gaps: 2

## Findings

### 1. Browser-enforced anti-framing is missing in the GitHub Pages deployment path
**Status:** Likely risk, not a confirmed exploit in current code

**Severity:** LOW

**Confidence:** HIGH

**Category:** OWASP A05 Security Misconfiguration

**Location:** `src/app/layout.tsx:49-63`, `scripts/harden-static-export.mjs:8-29`, `.github/workflows/deploy-pages.yml:34-46`, `scripts/serve-static.mjs:147-157`

**Why this is a problem:**
The application explicitly omits `frame-ancestors` from the production CSP because it is header-only and cannot be enforced from a `<meta>` tag. The local preview server compensates by setting `X-Frame-Options: DENY`, but the actual GitHub Pages deployment workflow uploads static files directly and does not attach equivalent response headers. That leaves the production Pages deployment relying on JavaScript frame-busting alone instead of a browser-enforced anti-clickjacking control.

**Concrete failure scenario:**
An attacker embeds the GitHub Pages deployment in an iframe on a hostile site. The bootstrap script in `layout.tsx` will usually try to escape or blank the frame, which materially reduces risk, but that protection is still weaker than a browser-enforced header. If the frame is sandboxed or browser behavior changes, the app can end up framed until script execution runs or fails, creating a narrower but still real clickjacking surface.

**Suggested fix:**
Serve the production site behind a header-capable CDN or hosting layer and add `Content-Security-Policy: frame-ancestors 'none'` and/or `X-Frame-Options: DENY` there. Treat the current JS frame-buster as defense-in-depth, not the primary control.

**Why this is only a likely risk:**
The repo does include an early bootstrap frame-buster in `src/app/layout.tsx:49-49`, and the preview server proves the intended header policy in `scripts/serve-static.mjs:151-157`. I did not find a confirmed path that keeps the current app interactable inside a frame under normal browser conditions, but the deployment path still lacks the stronger browser-enforced control.

### 2. Production CSP still requires `style-src 'unsafe-inline'`, which weakens XSS containment if an injection sink is introduced later
**Status:** Likely risk, not a confirmed exploit in current code

**Severity:** LOW

**Confidence:** HIGH

**Category:** OWASP A05 Security Misconfiguration / defense-in-depth gap

**Location:** `src/app/layout.tsx:59-63`, `scripts/harden-static-export.mjs:14-29`

**Why this is a problem:**
The hardened production CSP removes `unsafe-inline` from scripts, which is good, but it still allows inline styles globally. That means the CSP is not positioned to contain CSS-based UI manipulation if a future DOM XSS sink, third-party script, or unsafe HTML rendering path is introduced. In a React app with many inline `style={...}` props, this is understandable, but it remains a meaningful hardening debt.

**Concrete failure scenario:**
A later feature adds an unsafe HTML sink or a compromised dependency gains DOM write access. Even without inline script execution, the attacker can inject arbitrary CSS overlays, hide warnings, restyle controls, or create convincing phishing UI inside the app because the production CSP explicitly permits inline styles.

**Suggested fix:**
Reduce inline-style usage over time and move styling into static CSS classes or hashed/nonced style blocks where feasible. Once the inline-style dependency is gone, tighten production CSP to remove `unsafe-inline` from `style-src`.

**Why this is only a likely risk:**
I did not find a current HTML/script injection sink that makes this exploitable today. The issue is that the CSP cannot meaningfully constrain style injection if one appears later.

## Confirmed Good Controls / No-Issue Evidence

### Secrets and privacy
- Current-source secret scan found no hardcoded API keys, bearer tokens, passwords, private keys, client secrets, or `.env*` files. The only live non-doc match was the expected GitHub Pages OIDC permission in `.github/workflows/deploy-pages.yml:8-11`.
- Git history spot scan for common secret patterns did not return actual secret material.
- The app is client-only and keeps uploaded travel files in-browser; there is no app-owned backend upload or processing path in the reviewed source.

### Input validation and unsafe parsing
- XML parsing strips `DOCTYPE`/`ENTITY` declarations before `DOMParser` use, reducing XXE/entity-expansion risk: `src/lib/parser.ts:109-121`.
- Coordinate/time/elevation parsing is range-checked and invalid values are discarded throughout the GPX/KML/Google parsers: `src/lib/parser.ts:124-225` and related Google-format branches.
- JSON parsing is guarded by both file-size limits and explicit nesting-depth checks on the main thread and in the worker: `src/lib/parser.ts:485-603`, `public/workers/trackParser.worker.js:270-321`.
- Worker messages are validated for shape and buffer type before parsing: `public/workers/trackParser.worker.js:289-306`.
- Journey Creator “search” is local parsing only; it does not geocode or issue remote requests and only accepts coordinate-like patterns after bounds checks: `src/components/JourneyCreator.tsx:74-110`.

### XSS / unsafe browser sinks
- I found one `dangerouslySetInnerHTML` use, but it is a static bootstrap string controlled by source, not user input: `src/app/layout.tsx:49-54`.
- No `eval`, `new Function`, `innerHTML` assignments, `insertAdjacentHTML`, `document.write`, or unsafe `postMessage` handlers were found in current app code.
- External link handling is correct where present: `src/components/GoogleGuide.tsx:367-370` uses `target="_blank"` with `rel="noopener noreferrer"`.
- Export filenames are sanitized before download: `src/lib/videoEncoder.ts:147-157`.
- Downloaded videos use object URLs with cleanup in the controller: `src/lib/useExportController.ts:58-72`, `src/lib/useExportController.ts:158-173`.

### Auth / authz / server-side attack surface
- No auth/session/JWT/password/database code paths were found in the repository.
- No API routes or server handlers were found under `src/app/api`, `pages/api`, `server`, or similar paths.
- Static export is explicit in `next.config.ts:5-12`, which matches the client-only architecture docs.

### Dependency and supply-chain surface
- `npm audit --json` returned zero known vulnerabilities in the current dependency graph.
- Runtime dependency surface is comparatively small: `next`, `react`, `react-dom`, `maplibre-gl`, `mediabunny`, `lucide-react`, and `@tmcw/togeojson`.
- The Pages workflow also runs `npm audit --audit-level=high` during CI: `.github/workflows/deploy-pages.yml:26-33`.

## OWASP Sweep
- **A01 Broken Access Control:** No server routes, authz gates, or privileged backend operations found.
- **A02 Cryptographic Failures:** No custom cryptography or sensitive secret storage. `crypto.randomUUID()` is used only for UI IDs; fallback use is not security-sensitive.
- **A03 Injection:** No SQL/command/template injection surface. No unsafe HTML rendering path found. Parser inputs are range-checked and structurally constrained.
- **A04 Insecure Design:** Client-only architecture keeps uploaded files local; worker isolation and file-size limits materially reduce parsing abuse.
- **A05 Security Misconfiguration:** Two low-severity hardening gaps noted above: no browser-enforced anti-framing on Pages and continued inline-style allowance in CSP.
- **A06 Vulnerable and Outdated Components:** `npm audit` clean at review time; no vulnerable package was identified.
- **A07 Identification and Authentication Failures:** No auth layer present.
- **A08 Software and Data Integrity Failures:** No dynamic remote code loading found. Map styles are bundled locally and smoke-checked to avoid remote sprite/glyph/tile dependencies.
- **A09 Security Logging and Monitoring Failures:** No backend monitoring surface. Client logs do not expose secrets in reviewed paths.
- **A10 SSRF:** No server-side request capability present. Client fetch usage is same-origin sample loading only.

## Final Assessment
No confirmed exploitable security vulnerability was identified in the current repository. The codebase is materially stronger than a typical client-only app: local-only map assets, no backend/API surface, no secret material, bounded file parsing, worker isolation for large JSON imports, correct external-link hygiene, and a production script-hash CSP for inline scripts.

The remaining issues are hardening gaps rather than active breakpoints:
- browser-enforced anti-framing is absent on the actual GitHub Pages deployment path,
- production CSP still permits inline styles.

## Final Sweep Note
Examined all current repository files that materially affect security, privacy, CSP, parsing, file handling, export/download, deployment headers, and dependency surface, plus the relevant `.context` architecture/overview docs. Secrets scan and dependency audit were completed. I did not find any skipped security-relevant source area in the current tree. One AST-based helper tool was unavailable during the review, so pattern verification fell back to direct source inspection plus ripgrep-based scanning; that did not change the review outcome.
