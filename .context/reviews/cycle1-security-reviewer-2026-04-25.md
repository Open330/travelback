# Security Review Report — cycle 1 security-reviewer (2026-04-25)

**Scope:** Entire current working tree, including uncommitted changes, for Travelback static Next.js app: `.context/**` project rules, `src/app`, `src/components`, `src/lib`, `public/**`, `scripts/**`, `.github/workflows/**`, package/dependency config, static export/download path, CSP and privacy boundaries.

**Project rules inventoried:**
- `.context/README.md` — Travelback is a browser app for GPX/KML/Google Location History animation/export.
- `.context/development/01-conventions.md` — Next.js 16 static export, React 19, strict TypeScript, no new dependencies, run build/lint/typecheck/e2e before commits.
- `.context/project/01-overview.md` — client-side parsing/export, local bundled map assets, supported private location-history formats.
- `.context/project/02-architecture.md` — no app-owned server upload path; raw tracks remain in browser; CSP/static hardening and JS frame-buster are intentional; hosts with header support should send `frame-ancestors 'none'` / `X-Frame-Options: DENY`.

**Risk Level:** MEDIUM

## Verification performed

- `git status --short` reviewed to include uncommitted changes.
- Secrets scan over source/config/public/scripts/e2e using patterns for API keys, passwords, tokens, private keys, dangerous DOM/file/URL patterns.
- Git history scan for common secret patterns: no credible secrets found; only false positives such as `id-token: write` and review text.
- Dependency audit: `npm audit --json` returned **0 vulnerabilities** across 471 total dependencies.
- Static smoke/security regression: `npm run smoke:static` passed; it checks hardened CSP, local map styles, no tool residue, worker/parser constants, cache policy, and static path handling.
- Static code review of CSP, unsafe HTML, file parsing, worker messaging, downloads/share, localStorage, route creation, external links, and static server path traversal controls.

## Summary

- Critical Issues: 0
- High Issues: 0
- Medium Issues: 2
- Low Issues: 1

## Medium Issues

### 1. Header-only anti-framing is not enforced on the primary GitHub Pages deployment

**Severity:** MEDIUM  
**Confidence:** HIGH  
**Category:** OWASP A05:2021 Security Misconfiguration / clickjacking defense-in-depth  
**Location:** `src/app/layout.tsx:53`, `src/app/layout.tsx:66`, `scripts/harden-static-export.mjs:10-15`, `.github/workflows/deploy-pages.yml:33-45`  
**Exploitability:** Remote, unauthenticated framing by any third-party page unless the browser-side frame-buster wins early enough.  
**Blast Radius:** UI redress/clickjacking against a privacy-sensitive static app. The attacker should not be able to read cross-origin iframe pixels or uploaded files, but can frame the app and try to trick users into interacting with private route data in an attacker-controlled page.

**Failure scenario:**
The app intentionally omits `frame-ancestors` from the meta CSP because it is header-only (`scripts/harden-static-export.mjs:10-15`), and the runtime protection is the inline JS frame-buster (`src/app/layout.tsx:53`). The static preview server does send `X-Frame-Options: DENY` (`scripts/serve-static.mjs:152-153`), but the production workflow uploads `out` directly to GitHub Pages (`.github/workflows/deploy-pages.yml:33-45`), where this Node server and its headers are not used. A malicious site can embed the Pages URL and race/abuse the JS-only busting path.

**Concrete fix:**
Deploy through a header-capable host/CDN, and make header enforcement a release requirement. Keep the JS frame-buster as fallback, not the primary control.

```nginx
# GOOD: production response headers from CDN / edge / host
Content-Security-Policy: frame-ancestors 'none'; base-uri 'none'; object-src 'none'
X-Frame-Options: DENY
Referrer-Policy: no-referrer
X-Content-Type-Options: nosniff
```

For Netlify-style static hosting, add a headers file during export; for Cloudflare Pages, configure response headers in `_headers` or edge rules:

```text
/travelback/*
  Content-Security-Policy: frame-ancestors 'none'; base-uri 'none'; object-src 'none'
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
```

If GitHub Pages remains the only target, document that anti-framing is best-effort only and avoid claiming header-level clickjacking protection for that deployment.

---

### 2. GPX/KML parsing still accepts attacker-controlled XML on the main UI thread

**Severity:** MEDIUM  
**Confidence:** MEDIUM-HIGH  
**Category:** OWASP A05:2021 Security Misconfiguration / A04:2021 Insecure Design (client-side parser DoS)  
**Location:** `src/lib/parser.ts:151-160`, `src/lib/parser.ts:544-546`, `src/lib/parser.ts:681-701`, `src/components/FileUpload.tsx:52-60`  
**Exploitability:** Local user-assisted; attacker sends a crafted `.gpx`/`.kml` and convinces the user to open it.  
**Blast Radius:** Browser-tab denial of service while parsing private route files; unsaved UI/export state may be lost. No server compromise because parsing is client-only.

**Failure scenario:**
JSON imports have a worker boundary and pre-parse depth/point checks, but XML imports still go through `FileReader.readAsText()` and `DOMParser.parseFromString()` on the main thread (`src/lib/parser.ts:681-701`, `src/lib/parser.ts:158-160`). The 1 MB `XML_MAX_FILE_SIZE` cap (`src/lib/parser.ts:544-546`) is helpful, and `stripXmlEntities()` removes DTD/entity declarations (`src/lib/parser.ts:151-156`), but a small-but-pathological KML/GPX can still contain deeply nested tags or dense coordinate text that forces synchronous DOM construction and `@tmcw/togeojson` traversal before the app can yield or abort.

**Concrete fix:**
Move GPX/KML parsing into the worker too, with pre-parse XML budget checks and abort/error propagation matching the JSON worker. Keep the main-thread fallback very small.

```ts
// GOOD: route XML through a worker instead of DOMParser on the UI thread
const XML_WORKER_FALLBACK_SIZE = 128 * 1024

async function parseXmlInWorkerBuffer(buffer: ArrayBuffer, ext: 'gpx' | 'kml'): Promise<Track> {
  if (buffer.byteLength > XML_MAX_FILE_SIZE) {
    throw new ParseError('File is too large', 'FILE_TOO_LARGE')
  }
  if (typeof Worker === 'undefined') {
    if (buffer.byteLength > XML_WORKER_FALLBACK_SIZE) {
      throw new ParseError('XML imports require Web Worker support in this browser.', 'XML_PARSE_ERROR')
    }
    return parseXmlMainThread(new TextDecoder().decode(buffer), ext)
  }

  const worker = new Worker(`${basePath}/workers/trackParser.worker.js`)
  worker.postMessage({ ext, buffer }, [buffer])
  // worker validates: byte size, nesting depth, coordinate count, no DOCTYPE/ENTITY
}
```

Also add a worker-side XML scanner before `DOMParser`, for example rejecting any `<!DOCTYPE`, `<!ENTITY`, excessive nesting depth, and more than `MAX_TRACK_POINTS` coordinate candidates before constructing a DOM.

## Low Issues

### 3. Production debug bridge can be enabled by URL/localStorage

**Severity:** LOW  
**Confidence:** HIGH  
**Category:** OWASP A05:2021 Security Misconfiguration / privacy hardening  
**Location:** `src/components/MapView.tsx:595-606`, `src/components/MapView.tsx:609-631`  
**Exploitability:** Remote opt-in by URL parameter or same-origin/local browser state; no direct cross-origin read without a separate script execution issue.  
**Blast Radius:** Exposes camera center, zoom, bearing, pitch, and layer/artifact presence to any same-origin script when enabled. It does not expose full track points, but it is production introspection around private journey data.

**Failure scenario:**
`__travelbackDebug` is exposed not only in development, but also when `?__travelbackDebug=1` is present or `localStorage['travelback-debug'] === '1'` (`src/components/MapView.tsx:595-606`). A shared URL can leave the app in debug mode for a session, and any future same-origin script gadget/dependency regression could read live camera/location state via `getCamera()` (`src/components/MapView.tsx:609-618`).

**Concrete fix:**
Restrict debug exposure to development/test builds or localhost only. Prefer Playwright enabling through a test-only build flag rather than a production URL switch.

```ts
// GOOD: do not expose debug bridge on production public origins
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const canExposeDebugCamera =
  process.env.NODE_ENV === 'development'
  || (process.env.NEXT_PUBLIC_E2E_DEBUG === '1' && isLocalhost)

if (canExposeDebugCamera) {
  ;(window as TravelbackDebugWindow).__travelbackDebug = { getCamera, getMapState }
}
```

## Positive security observations

- No app-owned server upload or authentication surface was found; raw user tracks stay in the browser per `.context/project/02-architecture.md`.
- CSP is strong for a static app: `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `script-src-attr 'none'`; static export replaces production inline-script allowance with hashes (`src/app/layout.tsx:66`, `scripts/harden-static-export.mjs:16-28`, verified by `npm run smoke:static`).
- `dangerouslySetInnerHTML` is limited to a hardcoded bootstrap script (`src/app/layout.tsx:53-58`), not user-controlled content.
- Export filenames are normalized and stripped of filesystem-dangerous characters (`src/lib/videoEncoder.ts:147-156`).
- Blob URL lifecycle is managed and old export URLs are revoked (`src/lib/useExportController.ts:74-90`, `src/lib/useExportController.ts:188-205`).
- External Takeout link is a constant and uses `target="_blank"` with `rel="noopener noreferrer"` (`src/components/GoogleGuide.tsx:174-177`, `src/components/GoogleGuide.tsx:367-370`).
- Static preview server prevents traversal with `decodeURIComponent`, NUL rejection, `path.resolve`, and an `isInside()` check (`scripts/serve-static.mjs:70-103`).
- GitHub Actions uses least-privilege Pages permissions and runs `npm audit --audit-level=high` before build/deploy (`.github/workflows/deploy-pages.yml:8-31`).

## OWASP checklist

- [x] A01 Broken Access Control — no protected server routes/auth; static server traversal checked. Header anti-framing gap noted above.
- [x] A02 Cryptographic Failures — no credential storage/crypto workflows; HTTPS/HSTS present in local static server headers, but GitHub Pages header limits remain deployment-dependent.
- [x] A03 Injection — no SQL/command execution; React escaping used; `dangerouslySetInnerHTML` is hardcoded; XML parser DoS noted separately.
- [x] A04 Insecure Design — client-only privacy boundary reviewed; XML parser worker gap noted.
- [x] A05 Security Misconfiguration — CSP reviewed; debug bridge and deployment anti-framing gap noted.
- [x] A06 Vulnerable and Outdated Components — `npm audit --json` found 0 vulnerabilities.
- [x] A07 Identification and Authentication Failures — not applicable; no auth/session code.
- [x] A08 Software and Data Integrity Failures — GitHub Pages workflow pins official actions by major version and runs lint/typecheck/audit/build/static E2E; no dynamic third-party runtime code found.
- [x] A09 Security Logging and Monitoring Failures — static client app; parse/export errors avoid exposing secrets. No server monitoring surface.
- [x] A10 SSRF — no server-side fetch; client `fetch()` is same-origin sample load only (`src/app/page.tsx:311-324`), and CSP `connect-src 'self'` blocks external client fetches.

## Recommendation

Do not block release for Critical/High issues; none were found. Prioritize the two Medium hardening items before broad public sharing of privacy-sensitive route files: use a header-capable production host/CDN for anti-framing, and move XML parsing off the main thread with pre-parse structural budgets.
