# Security Review Report

**Scope:** Full repository security review of current repo content on April 25, 2026.

Inventoried and examined all security-relevant files under:
- app shell/config: `next.config.ts`, `package.json`, `package-lock.json`, `playwright.config.ts`, `playwright.static.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`
- app source: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- components: every file under `src/components/*.tsx`
- libraries/types: every file under `src/lib/*.ts` plus `src/types.ts`
- worker/static assets affecting trust boundaries: `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, `public/fonts/pretendard.css`, `public/sample-trip.gpx`, `public/guide/*.svg`
- build/deploy/runtime scripts: every file under `scripts/*.mjs`, plus `.github/workflows/deploy-pages.yml`
- test/security fixtures: `e2e/travelback.spec.ts` and all parser fixtures under `e2e/fixtures/*`
- repo instructions: repo-root `AGENTS.md` only; no deeper repo-local `AGENTS.md` was found

**Risk Level:** MEDIUM

## Summary
- Critical Issues: 0
- High Issues: 0
- Medium Issues: 2
- Low Issues: 2 residual hardening risks
- Dependency audit: `npm audit --json` and `npm audit --omit=dev --json` both returned 0 vulnerabilities.
- Secrets scan: no hardcoded API keys, passwords, private keys, bearer tokens, or `.env*` files in active repo content.
- Auth/authz surface: none present; this is a static-export client app with no API routes, no session layer, and no backend code.

## Confirmed Issues

### 1. GPX/KML imports still parse untrusted XML on the main thread
**Severity:** MEDIUM
**Category:** OWASP A04 Insecure Design / A05 Security Misconfiguration
**Location:** `src/lib/parser.ts:521-523`, `src/lib/parser.ts:624-679`, `src/lib/parser.ts:152-212`, `src/components/FileUpload.tsx:52-60`
**Exploitability:** Local, unauthenticated; attacker only needs to convince a user to import a crafted XML file.
**Blast Radius:** Browser tab freeze or crash during import; user loses in-memory work for that session.
**Confidence:** HIGH

**Issue:** JSON imports are worker-isolated, but GPX/KML imports are still read and parsed on the UI thread. The size cap is better than earlier versions, but the current flow still does `FileReader.readAsText()` followed by `DOMParser` and full document traversal on the main thread.

**Failure scenario:** A crafted 10-16 MB GPX/KML with huge node counts, deeply repeated elements, or browser-hostile XML structure is dropped into the app. The file passes the extension and size checks, then blocks the main thread long enough to freeze the UI before the user can recover.

**Remediation:** Move XML parsing behind the worker boundary too, or reduce XML limits to a size that is safely parseable on the main thread.

```ts
// BAD: untrusted XML is parsed on the UI thread
const reader = new FileReader()
reader.onload = () => {
  const text = reader.result as string
  const track = ext === 'gpx' ? parseGPX(text) : parseKML(text)
  finalizeTrack(track)
}
reader.readAsText(file)

// GOOD: keep the UI responsive by pushing XML parsing into a worker
const buffer = await file.arrayBuffer()
const track = await parseTrackInWorker({ ext, buffer })
finalizeTrack(track)
```

## Likely Issues

### 2. Large Google JSON can still exhaust memory before the point cap is enforced
**Severity:** MEDIUM
**Category:** OWASP A04 Insecure Design / availability hardening
**Location:** `src/lib/parser.ts:465-469`, `public/workers/trackParser.worker.js:304-312`, `public/workers/trackParser.worker.js:307-314`
**Exploitability:** Local, unauthenticated; attacker supplies a compact but very large valid Google export under the 100 MB transport limit.
**Blast Radius:** Worker OOM or browser instability during import; can still take down the tab on memory-constrained devices.
**Confidence:** MEDIUM-HIGH

**Issue:** The worker validates message size and JSON depth, but it still decodes the entire buffer into a string and `JSON.parse`s it before enforcing the 250k-point cap. That means the effective safety limit is not point count but whether the browser survives the full parse and intermediate object graph construction.

**Failure scenario:** A 90-100 MB JSON file with extremely dense location objects passes the transport gate, consumes large memory during string decode + parse + dedup set construction, then only gets rejected after `track.points.length > 250000`. On lower-memory devices, the worker or tab may crash before the rejection path runs.

**Remediation:** Enforce a running point budget during extraction, or move to a streaming / chunked parser that can stop before materializing the full object graph.

```js
// BAD: parse everything first, reject later
const text = new TextDecoder('utf-8', { fatal: false }).decode(data.buffer)
const track = parseGoogleLocationHistory(text)
if (track.points.length > 250000) {
  throw new WorkerParseError('Track contains too many points', ERROR_CODE.TOO_MANY_POINTS)
}

// GOOD: stop extraction as soon as the budget is exceeded
function pushPointWithBudget(out, point, budget) {
  if (out.length >= budget) {
    throw new WorkerParseError('Track contains too many points', ERROR_CODE.TOO_MANY_POINTS)
  }
  out.push(point)
}
```

## Risks Needing Manual Validation / Hardening

### 3. Public GitHub Pages deployment cannot enforce response-header anti-framing
**Severity:** LOW
**Category:** OWASP A05 Security Misconfiguration
**Location:** `src/app/layout.tsx:53-66`, `scripts/harden-static-export.mjs:9-29`, `.github/workflows/deploy-pages.yml:34-46`, `scripts/serve-static.mjs:151-157`
**Exploitability:** Remote, unauthenticated.
**Blast Radius:** Clickjacking resistance for the public Pages deployment depends on client JavaScript running, instead of being blocked by browser-enforced response headers.
**Confidence:** HIGH

**Issue:** The app correctly omits `frame-ancestors` from the meta CSP because browsers ignore that directive in meta delivery, and local preview adds `X-Frame-Options: DENY`. But the GitHub Pages deployment path cannot set equivalent response headers, so the live site relies on the bootstrap frame-buster in `layout.tsx` rather than true browser-enforced anti-framing.

**Failure scenario:** If framing protections ever regress in the bootstrap path, or if an embedding edge case runs before the frame-buster takes effect, the public Pages site has weaker clickjacking protection than the local preview server.

**Remediation:** Front the site with a host/CDN that can add `Content-Security-Policy: frame-ancestors 'none'` and/or `X-Frame-Options: DENY`.

```ts
// Current mitigation: JS frame-buster only
if (window.top !== window.self) {
  window.top.location = window.self.location.href
}

// Stronger deployment-side mitigation: send real headers
Content-Security-Policy: frame-ancestors 'none'
X-Frame-Options: DENY
```

### 4. Hardened CSP still allows inline styles
**Severity:** LOW
**Category:** OWASP A05 Security Misconfiguration
**Location:** `src/app/layout.tsx:63-66`, `scripts/harden-static-export.mjs:15-29`
**Exploitability:** Depends on a separate injection bug; not directly exploitable from current code.
**Blast Radius:** Weakens CSP containment if a future DOM/CSS injection sink is introduced.
**Confidence:** HIGH

**Issue:** Production script CSP is well hardened with hashes, but the final policy still includes `style-src 'self' 'unsafe-inline'`. I did not find a current XSS or CSS injection sink, so this is defense-in-depth debt rather than a confirmed exploit path.

**Failure scenario:** A future DOM injection bug lands elsewhere in the app. Because inline styles are already permitted, CSP provides less containment than it otherwise could.

**Remediation:** Continue moving inline style usage to classes/static styles, then drop `'unsafe-inline'` from `style-src`.

```ts
// BAD
style-src 'self' 'unsafe-inline'

// GOOD
style-src 'self'
```

## No-Issue Evidence

### Secrets / Sensitive Data
- Secret-pattern scans across active source/config/workflow files found no hardcoded credentials or key material.
- Git-history spot scan for common secret patterns did not reveal actual secret material.
- No analytics keys, map tokens, OAuth secrets, or third-party API credentials are present.

### Injection / XSS / Unsafe Browser APIs
- The only `dangerouslySetInnerHTML` usage is the source-controlled bootstrap in `src/app/layout.tsx:53-58`.
- Production postbuild CSP hashing is enforced in `scripts/harden-static-export.mjs:58-127`.
- No current use of `eval`, `new Function`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` was found in active source.
- External links use `rel="noopener noreferrer"` in `src/components/GoogleGuide.tsx:367-370`.

### Input Validation / File Handling
- Uploads are extension-gated in `src/components/FileUpload.tsx:19-20`, `src/components/FileUpload.tsx:95-107`.
- XML entity stripping is present before browser XML parsing in `src/lib/parser.ts:145-157`.
- Coordinates and timestamps are range-validated throughout the parser and worker before entering app state.
- Worker messages are shape-validated in `public/workers/trackParser.worker.js:289-320`.

### Auth / Authz / Backend Surface
- No API routes, middleware, JWT/session logic, database queries, or server actions were found.
- `next.config.ts:5-10` uses `output: "export"`, keeping runtime server attack surface out of this repo.

### Static Export / Supply Chain
- Local map styles are pinned to bundled local JSON with empty `sources` and no `sprite`/`glyphs` references in `public/map-styles/*.json`.
- `scripts/smoke-static.mjs` verifies CSP hardening, local-only styles, worker constant parity, and absence of tool-state residue in exported assets.
- CI runs `npm audit --audit-level=high` in `.github/workflows/deploy-pages.yml:26-33`.

## OWASP Top 10 Coverage
- A01 Broken Access Control: No app-owned authz/backend surface found.
- A02 Cryptographic Failures: No custom cryptography or secret storage found.
- A03 Injection: No SQL/command/template injection surface found; reviewed DOM sinks are controlled.
- A04 Insecure Design: Availability risks remain in import parsing paths.
- A05 Security Misconfiguration: CSP and anti-framing are mostly strong, with the residual risks noted above.
- A06 Vulnerable and Outdated Components: Audit clean.
- A07 Identification and Authentication Failures: Not applicable; no auth implementation.
- A08 Software and Data Integrity Failures: No unsafe remote code loading; build hardening present.
- A09 Security Logging and Monitoring Failures: No backend monitoring surface in scope.
- A10 SSRF: No server-side fetch surface; only same-origin client fetches for local assets.

## Security Checklist
- [x] No hardcoded secrets in active source/config paths
- [x] Injection/XSS sinks reviewed
- [x] Untrusted file/input handling reviewed
- [x] Authentication/authorization surface reviewed
- [x] Dependencies audited
- [x] Static export / CSP / clickjacking posture reviewed

## Final Sweep
- Reviewed every current security-relevant source file, worker, workflow, script, config, parser fixture set, and static trust-boundary asset in the repository inventory above.
- Did not rely on sampling a subset.
- No additional skipped-file concerns were found after the final pattern sweep for secrets, unsafe DOM APIs, worker messaging, file operations, and static export regressions.
