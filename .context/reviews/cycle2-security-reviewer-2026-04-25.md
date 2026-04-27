# Cycle 2 Security Review — 2026-04-25

**Reviewer:** security-reviewer  
**Scope:** Deep whole-repo security review of the current Travelback repository: OWASP Top 10, CSP/static-export hardening, unsafe DOM/file parsing, XSS, dependencies/secrets/supply chain, privacy boundaries, frame protections, and browser APIs.  
**Overall risk level:** **LOW** for the current static, client-only app.  
**Confidence:** **High** for current app-source findings; **medium** for supply-chain residual risk because mutable upstream GitHub Action tags are an external trust dependency.

## Inventory reviewed

Repository rules and context:
- `.context/development/01-conventions.md`
- project/security-relevant prior context in `.context/project/*`, `.context/reviews/*`, and `plan/deferred-*` where it described current known parser/CSP/frame-hosting assumptions.

Application and configuration:
- `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `playwright.config.ts`, `playwright.static.config.ts`
- `.github/workflows/deploy-pages.yml`

Current app source:
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- every component under `src/components/*.tsx`
- every library/type/style file under `src/lib/*.ts`, `src/types.ts`, `src/styles/vitro-base.css`

Static/runtime trust-boundary assets:
- `public/workers/trackParser.worker.js`
- `public/map-styles/*.json`
- `public/fonts/pretendard.css`, `public/fonts/PretendardVariable.woff2`
- `public/*.svg`, `public/guide/*.svg`, `public/sample-trip.gpx`

Build/test/runtime scripts and fixtures:
- every file under `scripts/*.mjs`
- `e2e/travelback.spec.ts` and all parser fixtures under `e2e/fixtures/*`

Inventory notes:
- No app-owned `src/app/api/*`, `route.ts`, middleware, server actions, database layer, session/JWT/password code, or backend authorization boundary exists.
- Repo-local `AGENTS.md` was not present outside OMX state snapshots; the applicable repo rule file supplied by the user was `.context/development/01-conventions.md`.

## Verification performed

- `npm audit --audit-level=low --json` → **0 vulnerabilities** across 471 dependencies.
- Current-source secret scan excluding generated outputs, lockfile, test reports, and review/plan prose → only `.github/workflows/deploy-pages.yml:11` (`id-token: write`, expected GitHub Pages OIDC permission); **no hardcoded secrets** found.
- Git-history secret-pattern scan excluding generated/review/plan noise → only expected historical `id-token: write` and benign prose/design-token matches; **no secret material** found.
- Unsafe-pattern sweep for `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `document.write`, `postMessage`, `Worker`, `FileReader`, `DOMParser`, `fetch`, `localStorage`, file operations, CSP directives, and browser APIs.
- API/auth inventory: no API routes, auth, session, JWT, SQL, Prisma/Mongoose, or server request handlers found.
- Map-style remote-reference scan: all `public/map-styles/*.json` have empty `sources`, no `sprite`, no `glyphs`, and no symbol layers.
- `npm run smoke:static` → **passed**; confirms static serving, CSP hardening, local-only map styles, worker/parser constant parity, and no tool-state residue in `public`/`out`.

## Summary

- Critical Issues: 0
- High Issues: 0
- Medium Issues: 0
- Low Issues: 1 supply-chain hardening finding
- Residual risks / accepted constraints: 3 defense-in-depth notes, not current exploitable vulnerabilities

## Low Issues

### 1. GitHub Actions are referenced by mutable major-version tags

**Severity:** LOW  
**Category:** OWASP A08:2021 — Software and Data Integrity Failures / supply chain  
**Status:** Risk  
**Location:** `.github/workflows/deploy-pages.yml:21-23`, `.github/workflows/deploy-pages.yml:33-45`  
**Exploitability:** Remote upstream supply-chain compromise or tag-retarget scenario; no direct app-user exploit from current source.  
**Blast Radius:** A compromised action version used during CI could run with `pages: write` and `id-token: write`, tamper with the static artifact, or publish a malicious Pages deployment.  
**Confidence:** MEDIUM

**Issue:** The deployment workflow uses floating major tags (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4`). Major tags are standard but mutable trust anchors. Because this workflow has Pages deployment authority, mutable action references are a supply-chain risk even though the current application code and dependency audit are clean.

**Failure scenario:** An upstream action tag is maliciously moved or a release process is compromised. The next push to `main` executes attacker-controlled action code with the workflow's Pages/OIDC permissions and publishes modified static output.

**Fix:** Pin third-party actions to reviewed commit SHAs and use Dependabot/Renovate to update them intentionally.

```yaml
# Current
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-pages-artifact@v3
- uses: actions/deploy-pages@v4

# Safer pattern: pin to immutable commits and update via review automation
- uses: actions/checkout@<reviewed-commit-sha>
- uses: actions/setup-node@<reviewed-commit-sha>
- uses: actions/upload-pages-artifact@<reviewed-commit-sha>
- uses: actions/deploy-pages@<reviewed-commit-sha>
```

## Residual risks / accepted constraints

These are tracked as defense-in-depth or hosting/design constraints. I did not find a current exploit path in the reviewed code.

### R1. Public GitHub Pages deployment cannot enforce header-level anti-framing

**Severity:** LOW  
**Category:** OWASP A05:2021 — Security Misconfiguration  
**Status:** Risk  
**Location:** `src/app/layout.tsx:53-66`, `scripts/harden-static-export.mjs:9-29`, `scripts/serve-static.mjs:148-158`, `.github/workflows/deploy-pages.yml:33-45`  
**Confidence:** HIGH

The app correctly omits `frame-ancestors` from the meta CSP because browsers ignore it in meta-delivered CSP. Local preview sends `X-Frame-Options: DENY`, but GitHub Pages cannot attach equivalent custom response headers for the public deployment. The current mitigation is a source-controlled frame-buster in the bootstrap script. That is reasonable for the current static host, but weaker than browser-enforced headers.

**Fix if deployment changes:** front the site with a header-capable host/CDN and set real response headers:

```http
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

### R2. Production CSP still allows inline styles

**Severity:** LOW  
**Category:** OWASP A05:2021 — Security Misconfiguration  
**Status:** Risk  
**Location:** `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:15-29`  
**Confidence:** HIGH

Static export hardening removes production script `unsafe-inline` and replaces inline script allowance with hashes, but `style-src 'self' 'unsafe-inline'` remains. I did not find a current CSS/HTML injection sink, so this is containment debt rather than a confirmed XSS.

**Fix when feasible:** migrate remaining inline style needs to classes/static CSS and drop inline-style allowance.

```ts
// Current CSP fragment
"style-src 'self' 'unsafe-inline'"

// Stronger target
"style-src 'self'"
```

### R3. Large local file parsing remains an availability boundary, not a data-exfiltration boundary

**Severity:** LOW  
**Category:** OWASP A04:2021 — Insecure Design / availability  
**Status:** Risk  
**Location:** `src/lib/parser.ts:151-163`, `src/lib/parser.ts:541-699`, `public/workers/trackParser.worker.js:250-342`  
**Confidence:** HIGH

The current parser has meaningful controls: XML files are capped at 4 MB before main-thread `DOMParser`, JSON files are capped at 100 MB and normally parsed in a same-origin worker, JSON nesting depth is capped, and accepted tracks are capped at 250,000 points. This is not a current security finding. The remaining risk is browser availability on unusually memory-constrained clients or adversarial-but-under-limit files.

**Fix if larger imports become a product requirement:** move XML parsing to the worker and/or use a streaming parser that enforces point budget before materializing full documents.

```ts
// Current: XML parse path is bounded but main-thread
reader.readAsText(file)

// Stronger target: all untrusted import formats cross the worker boundary
const buffer = await file.arrayBuffer()
const track = await parseTrackInWorker({ ext, buffer })
```

## No current findings by review area

### CSP / static export hardening

- `src/app/layout.tsx:53-58` uses `dangerouslySetInnerHTML` only for a constant, source-controlled bootstrap script. It is not built from uploaded files, URL parameters, localStorage values, or user-provided strings.
- `src/app/layout.tsx:63-66` provides a placeholder CSP for Next bootstrap, with `script-src-attr 'none'`, `object-src 'none'`, `base-uri 'none'`, `connect-src 'self'`, worker/media/blob constraints, and `upgrade-insecure-requests`.
- `scripts/harden-static-export.mjs:58-127` hashes emitted inline scripts and refuses to publish HTML with the placeholder script CSP still present.
- `scripts/smoke-static.mjs:111-155` verifies the emitted static CSP has script hashes, no production `script-src 'self' 'unsafe-inline'`, `connect-src 'self'`, no meta `frame-ancestors`, `object-src 'none'`, and `base-uri 'none'`.
- `npm run smoke:static` passed in this review.

### Unsafe DOM / XSS

- No active-source uses of `eval`, `new Function`, `document.write`, `outerHTML`, or `insertAdjacentHTML` were found.
- No active-source user-controlled `innerHTML` sinks were found. E2E reads `innerHTML()` only for test assertions.
- React renders uploaded track names, search text, errors, and translations as text/props, not HTML.
- `src/components/GoogleGuide.tsx` uses fixed external links and `target="_blank" rel="noopener noreferrer"`.
- MapLibre data is generated from validated coordinates and fixed app-provided style keys (`src/types.ts:21-45`, `src/components/MapView.tsx:577-681`).

### File parsing and browser APIs

- Upload UI gates extensions to `.gpx`, `.kml`, `.json` (`src/components/FileUpload.tsx:19-20`, `src/components/FileUpload.tsx:96-107`), and parser-side extension handling rejects unsupported formats (`src/lib/parser.ts:646-690`).
- XML declarations/entities/doctype content are stripped before `DOMParser` (`src/lib/parser.ts:151-160`), reducing XXE/entity-expansion risk in the browser XML context.
- GPX/KML and Google JSON coordinates are finite and lat/lon range-checked before entering app state (`src/lib/parser.ts:61-68`, `src/lib/parser.ts:171-181`, `src/lib/parser.ts:239-246`, `src/lib/parser.ts:350-379`).
- JSON depth is pre-scanned before `JSON.parse` (`src/lib/parser.ts:466-489`) and worker messages validate extension, buffer type, byte length, and returned track shape (`public/workers/trackParser.worker.js:250-342`).
- Track acceptance requires 2 to 250,000 points (`src/lib/parser.ts:660-666`).
- Export download uses app-created blob/object URLs, sanitizes track-derived filenames (`src/lib/videoEncoder.ts:157-168`), and revokes object URLs on replacement/reset/unmount (`src/lib/useExportController.ts:74-90`, `src/lib/useExportController.ts:188-205`).
- File System Access API use is user-activation gated and falls back safely (`src/lib/videoEncoder.ts:180-221`).

### Privacy boundaries

- The app is static/client-only (`next.config.ts:5-10`) with no backend upload endpoint.
- Uploaded travel files are parsed locally; no telemetry, analytics, geocoder, or third-party map tile requests were found.
- `src/app/layout.tsx:73` sets `<meta name="referrer" content="no-referrer" />`.
- Journey coordinate search is local parsing only (`src/components/JourneyCreator.tsx:96-132`, `src/components/JourneyCreator.tsx:479-529`); UI copy warns about privacy, and no network geocoding call is present.
- All bundled map styles have no external sources, sprites, glyphs, or symbol layers; verified by script during this review and by `scripts/smoke-static.mjs:157-180`.

### Authentication / authorization / server-side attack surface

- No API routes, middleware, server actions, DB queries, authentication, authorization, JWT, cookie/session, password hashing, payment, or SSRF-capable server fetch surface exists.
- `scripts/serve-static.mjs:71-120` resolves preview-server paths under `out`, rejects bad percent-encoding/NUL bytes, normalizes paths, and denies traversal outside `out`.
- `scripts/serve-static.mjs:123-159` serves only `GET`/`HEAD` and adds preview hardening headers (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS, Permissions-Policy, COOP, CORP).

### Dependencies / secrets / supply chain

- `npm audit --audit-level=low --json` reported zero vulnerabilities.
- No hardcoded API keys, passwords, bearer tokens, private keys, OAuth secrets, map provider tokens, or `.env*` files were found in active source/config.
- Git-history secret pattern scan did not reveal credential material.
- `package-lock.json` is present and CI uses `npm ci`, which makes dependency installation reproducible from the lockfile.
- CI runs lint, typecheck, `npm audit --audit-level=high`, build, smoke, and static E2E before Pages deploy (`.github/workflows/deploy-pages.yml:26-32`). The only current supply-chain finding is mutable action tag pinning above.

## OWASP Top 10 checklist

- [x] A01 Broken Access Control — No backend/authz surface; preview path traversal guarded.
- [x] A02 Cryptographic Failures — No custom crypto or secret storage; no secrets found.
- [x] A03 Injection — No SQL/NoSQL/command/template injection surface; DOM/XSS sinks reviewed and controlled.
- [x] A04 Insecure Design — Static client-only privacy boundary is sound; residual parser availability risk documented.
- [x] A05 Security Misconfiguration — Static CSP and preview headers are hardened; frame-header and inline-style residuals documented.
- [x] A06 Vulnerable and Outdated Components — `npm audit --audit-level=low` clean.
- [x] A07 Identification and Authentication Failures — Not applicable; no auth implementation.
- [x] A08 Software and Data Integrity Failures — No remote code/data loading in app; GitHub Action tag pinning risk documented.
- [x] A09 Security Logging and Monitoring Failures — Not applicable for a backend-less static app; console logs do not expose secrets in reviewed paths.
- [x] A10 SSRF — No server-side fetch surface; client fetches are same-origin/static or app-created blob URLs.

## Final sweep

- Re-ran unsafe API and secret pattern sweeps after reviewing the primary files.
- Re-ran static smoke verification after inventorying CSP/map-style/parser-worker controls.
- Checked current source, worker, scripts, workflow, public trust-boundary assets, and E2E fixtures rather than sampling a subset.
- No critical, high, or medium exploitable security issue remains confirmed in the current repository state.
