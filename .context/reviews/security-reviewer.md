# Security Review Report — review-plan-fix cycle 1/100 Prompt 1

**Reviewer:** security-reviewer specialist
**Repo:** `/Users/hletrd/flash-shared/Travelback`
**Date:** 2026-04-24
**Scope:** Repository-wide security review of the static Next.js frontend, user file parsing pipeline, worker boundary, export/download flows, CSP/static hosting scripts, dependency posture, client-side storage, and supply-chain/config files.

## Executive Summary

**Overall Risk Level:** **LOW**

- **Critical Issues:** 0
- **High Issues:** 0
- **Medium Issues:** 0
- **Low Issues:** 0 actionable new vulnerabilities
- **Security posture:** Strong for a static, client-only app. The app has no backend routes, no auth/session layer, no database, no server-side user input processing, and no hardcoded secrets found in reviewed source/config paths.

No actionable security vulnerabilities were found in this pass. The main risk-bearing areas are already constrained: uploaded GPX/KML/JSON files are processed locally with file size, point count, coordinate, JSON-depth, and worker-message checks; map assets are local-only; production CSP removes inline-script allowance and pins inline script hashes; static serving blocks path traversal and adds hardening headers.

## Inventory of Review-Relevant Files

Reviewed inventory:

- **Source:** 31 files under `src/`
  - App/root: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
  - Input/parsing/export: `src/lib/parser.ts`, `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `src/components/FileUpload.tsx`, `src/components/ExportPanel.tsx`
  - Map/journey UX: `src/components/MapView.tsx`, `src/components/JourneyCreator.tsx`, `src/components/SceneEditor.tsx`, `src/components/TimelineSelector.tsx`, `src/components/TrackWorkspace.tsx`, `src/components/TrackToolbar.tsx`, `src/components/Controls.tsx`, `src/components/GoogleGuide.tsx`
  - Client persistence/config/types: `src/lib/i18n.ts`, `src/lib/interpolate.ts`, `src/lib/env.ts`, `src/types.ts`
  - Modal/error/toast/toolbars/theme helpers: remaining components in `src/components/`
- **Public/static assets:** 19 files under `public/`, including `public/workers/trackParser.worker.js`, `public/map-styles/*.json`, SVGs, fonts, and `public/sample-trip.gpx`.
- **Build/serve scripts:** `scripts/harden-static-export.mjs`, `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`, `scripts/fetch-map-styles.mjs`.
- **Config/supply chain:** `package.json`, `package-lock.json`, `next.config.ts`, `playwright.config.ts`, `playwright.static.config.ts`, `eslint.config.mjs`, `tsconfig.json`.
- **API/auth inventory:** `find src/app -path '*/api/*' -o -name 'route.ts' -o -name 'route.js'` found **0** API routes. No authentication/authorization implementation is present.

## Verification Performed

- **Dependency audit:** `npm audit --json` returned **0 vulnerabilities** across 466 total dependencies.
- **Dependency inventory:** `npm ls --depth=0` confirmed direct versions including `next@16.2.3`, `react@19.2.3`, `maplibre-gl@5.18.0`, `mediabunny@1.34.4`, `@tmcw/togeojson@7.1.2`.
- **Secrets scan:** Source/config scan excluding generated outputs and review artifacts found **no API keys, tokens, passwords, private keys, client secrets, bearer tokens, credentials, or `.env*` files**.
- **Git history spot scan:** `git log --all -p -G(...)` found only prior review text mentioning security/secrets; no actual secret material was identified in reviewed output.
- **Dangerous sink scan:** Checked `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, `DOMParser`, `postMessage`, `fetch`, file reads/writes, `download`, `createObjectURL`, path normalization, and worker message handlers.
- **Path/API scan:** 0 API routes and 0 local env/secret files.

## Actionable Findings

None.

## Security-Relevant Findings / Verified Non-Issues

### 1. Inline bootstrap script is static and production CSP is hash-hardened

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A03 Injection / A05 Security Misconfiguration
**Location:** `src/app/layout.tsx:49-63`, `scripts/harden-static-export.mjs:14-29`, `scripts/harden-static-export.mjs:57-103`, `scripts/smoke-static.mjs:76-120`
**Failure scenario checked:** If user-controlled data reached `dangerouslySetInnerHTML`, or if production CSP continued to allow arbitrary inline scripts, an XSS payload could execute with access to locally loaded route data and generated video blobs.
**Evidence:** `bootstrapScript` is a static string, only reads allowlisted localStorage values and writes document attributes (`layout.tsx:49`). It is injected via `dangerouslySetInnerHTML` (`layout.tsx:54`), but production build hardening computes SHA-256 hashes for inline scripts (`harden-static-export.mjs:57-68`) and replaces the CSP meta tag (`harden-static-export.mjs:97-103`). The smoke test rejects `script-src 'self' 'unsafe-inline'` and requires script hashes (`smoke-static.mjs:88-94`).
**Verdict:** No actionable issue. Keep `scripts/smoke-static.mjs` CSP assertions as regression protection.

**If this regresses, fix pattern:**
```tsx
// BAD: never concatenate user-controlled data into the bootstrap script
const bootstrapScript = `window.appConfig = ${userControlledValue}`

// GOOD: keep bootstrap code static and pass data through React props or safe JSON script with escaping
const bootstrapScript = STATIC_BOOTSTRAP_SCRIPT
```

### 2. XML parsing has XXE-oriented stripping and validation before toGeoJSON fallback

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A03 Injection / A05 Security Misconfiguration
**Location:** `src/lib/parser.ts:98-107`, `src/lib/parser.ts:110-147`, `src/lib/parser.ts:150-161`, `src/lib/parser.ts:516-567`
**Failure scenario checked:** A malicious GPX/KML with `DOCTYPE`/`ENTITY` attempts XXE-style expansion, parser error confusion, or out-of-range coordinate injection.
**Evidence:** `stripXmlEntities` removes `DOCTYPE` and `ENTITY` declarations before `DOMParser.parseFromString` (`parser.ts:98-104`), parser errors are rejected (`parser.ts:105-107`), GPX points validate finite latitude/longitude and bounds (`parser.ts:115-118`), and final tracks require 2+ points and max 250,000 points (`parser.ts:528-535`).
**Verdict:** No actionable issue.

**Defensive hardening example if future XML parsing expands:**
```ts
// GOOD: reject declarations rather than trying to support entity expansion
if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
  throw new ParseError('Unsupported XML declaration', 'XML_UNSAFE_DECLARATION')
}
const doc = new DOMParser().parseFromString(text, 'application/xml')
```

### 3. Google JSON parsing is bounded and worker message input is validated

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A03 Injection / A04 Insecure Design / A08 Software and Data Integrity Failures
**Location:** `src/lib/parser.ts:324-353`, `src/lib/parser.ts:432-513`, `public/workers/trackParser.worker.js:208-280`
**Failure scenario checked:** A malicious or oversized Google JSON file attempts browser memory/CPU denial of service, invalid worker message exploitation, or prototype-shaped JSON confusion.
**Evidence:** JSON input has a 100MB file limit (`parser.ts:432-433`), nesting depth limit of 64 before parse (`parser.ts:324-347`), JSON parse errors are normalized (`parser.ts:349-353`), worker creation is same-origin via `${basePath}/workers/trackParser.worker.js` (`parser.ts:451-455`), worker messages require object, `ext === 'json'`, and an `ArrayBuffer` under 100MB (`trackParser.worker.js:247-264`), and parsed output is capped at 250,000 points (`trackParser.worker.js:268-270`, `parser.ts:532-534`).
**Verdict:** No actionable issue. Residual DoS from intentionally large valid files is limited and user-local; there is no remote attacker path without user file selection.

**Defensive hardening example if remote/import-by-URL is ever added:**
```ts
// GOOD: enforce byte limits before reading remote bodies into memory
const contentLength = Number(response.headers.get('content-length') ?? 0)
if (!Number.isFinite(contentLength) || contentLength > JSON_MAX_FILE_SIZE) {
  throw new ParseError('File is too large', 'FILE_TOO_LARGE')
}
```

### 4. File upload accepts only intended extensions and parser enforces actual limits

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A03 Injection / A04 Insecure Design
**Location:** `src/components/FileUpload.tsx:19-21`, `src/components/FileUpload.tsx:52-93`, `src/components/FileUpload.tsx:95-109`, `src/lib/parser.ts:516-567`
**Failure scenario checked:** A user drops an arbitrary file, hidden input accepts untrusted file content, or parser error leaks sensitive details.
**Evidence:** UI validates extension against `gpx`, `kml`, `json` on drop (`FileUpload.tsx:19-21`, `95-105`). Actual parser enforces file size by type and only dispatches `.json`, `.gpx`, `.kml` (`parser.ts:516-567`). Unknown parse errors are logged generically and user-facing errors map to known codes (`FileUpload.tsx:62-86`).
**Verdict:** No actionable issue.

### 5. Export/download flow sanitizes generated filenames and uses blob URLs only

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A01 Broken Access Control / A03 Injection / A04 Insecure Design
**Location:** `src/lib/videoEncoder.ts:147-158`, `src/lib/videoEncoder.ts:170-201`, `src/lib/useExportController.ts:151-163`, `src/lib/useExportController.ts:54-70`
**Failure scenario checked:** Malicious track names try path traversal, reserved filename characters, HTML injection through download attributes, or object URL leaks.
**Evidence:** Track name is NFKC-normalized, strips reserved filename/control characters, trims trailing dots/spaces, and is length-capped to 64 chars before `.mp4` generation (`videoEncoder.ts:147-156`). Download uses the File System Access picker when available and an `<a download>` blob URL fallback (`videoEncoder.ts:170-201`). Object URLs are revoked on reset/unmount (`useExportController.ts:54-70`) and previous URL is revoked before replacement (`useExportController.ts:151-156`).
**Verdict:** No actionable issue.

### 6. Map rendering is local-only with restrictive CSP and local style assets

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A05 Security Misconfiguration / A10 SSRF
**Location:** `src/types.ts:23-45`, `src/components/MapView.tsx:547-558`, `scripts/harden-static-export.mjs:14-29`, `scripts/smoke-static.mjs:122-145`
**Failure scenario checked:** Map style JSON causes client to fetch remote glyph/sprite/tile endpoints or expands CSP `connect-src` to external origins.
**Evidence:** Map style URLs are local `${BASE_PATH}/map-styles/*.json` (`types.ts:23-45`). MapLibre is initialized with that local style URL (`MapView.tsx:547-550`). Production CSP pins `connect-src 'self'` (`harden-static-export.mjs:24`). Smoke tests assert map styles do not declare external `sprite`, `glyphs`, or sources and reject Nominatim in CSP (`smoke-static.mjs:100-102`, `122-145`).
**Verdict:** No actionable issue.

### 7. Static server blocks traversal and adds response hardening headers

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A01 Broken Access Control / A05 Security Misconfiguration
**Location:** `scripts/serve-static.mjs:69-118`, `scripts/serve-static.mjs:121-158`
**Failure scenario checked:** A request such as `/travelback/../../.env` or encoded traversal reads files outside `out/`, or served content lacks basic browser hardening headers.
**Evidence:** `decodeURIComponent` errors return 400, NUL bytes return 400, path is normalized and resolved under `outDir`, and `isInside(outDir, absolutePath)` blocks traversal with 403 (`serve-static.mjs:86-102`). Only GET/HEAD are allowed (`serve-static.mjs:121-128`). Responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, HSTS, Permissions-Policy, COOP, and CORP (`serve-static.mjs:147-158`).
**Verdict:** No actionable issue.

### 8. Journey search is local coordinate parsing, not external geocoding

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A10 SSRF / Privacy
**Location:** `src/components/JourneyCreator.tsx:75-111`, `src/components/JourneyCreator.tsx:558-624`
**Failure scenario checked:** User-entered locations are sent to an external geocoding API or can inject script through result rendering.
**Evidence:** Search input is parsed locally by regex patterns for `geo:`, `@lat,lng`, `q=`, `ll=`, `#map=`, or raw `lat,lng`, then finite/range checked (`JourneyCreator.tsx:75-111`). UI labels the optional feature as privacy-sensitive (`JourneyCreator.tsx:561-579`, `622-624`), but no `fetch` is present in `JourneyCreator.tsx`. React renders result text safely (`JourneyCreator.tsx:633-638`).
**Verdict:** No actionable issue.

### 9. External guide link uses noopener/noreferrer

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A05 Security Misconfiguration
**Location:** `src/components/GoogleGuide.tsx:367-375`
**Failure scenario checked:** Reverse-tabnabbing through `target="_blank"`.
**Evidence:** External action link uses `target="_blank"` with `rel="noopener noreferrer"` (`GoogleGuide.tsx:367-370`).
**Verdict:** No actionable issue.

### 10. Auth/authz and server-side data risks are not applicable in current architecture

**Severity:** INFO
**Confidence:** High
**Category:** OWASP A01 Broken Access Control / A07 Identification and Authentication Failures
**Location:** `next.config.ts:3-10`, repository API inventory
**Failure scenario checked:** Missing authorization on API routes, insecure session handling, JWT validation errors, password hashing, or database injection.
**Evidence:** Static export is configured (`next.config.ts:3-10`), and repository scan found 0 `src/app/api` route handlers. There are no auth/session/JWT/password/database code paths in this repo.
**Verdict:** Not applicable.

## OWASP Top 10 Checklist

- **A01 Broken Access Control:** No API/backend/resources requiring authorization. Static server path traversal checked and blocked (`serve-static.mjs:86-102`).
- **A02 Cryptographic Failures:** No sensitive server-side data or custom cryptography. `crypto.randomUUID()` is used when available for UI IDs (`src/types.ts:1-5`); fallback is not used for security tokens.
- **A03 Injection:** No `eval`/`new Function`; only one audited static `dangerouslySetInnerHTML`; XML/JSON parsing bounded and validated; React output escaping used for user-derived names/errors.
- **A04 Insecure Design:** Local-only processing is appropriate for sensitive location data. File size/point/depth limits reduce local DoS.
- **A05 Security Misconfiguration:** Production CSP hardening and static-server headers are strong. Dev CSP permits inline scripts for Next bootstrap only; production smoke tests guard removal.
- **A06 Vulnerable/Outdated Components:** `npm audit --json` reports 0 vulnerabilities. Lockfile v3 present.
- **A07 Identification/Auth Failures:** Not applicable; no auth implementation.
- **A08 Software/Data Integrity Failures:** Worker input validated; map styles local and smoke-tested against remote source regressions; no untrusted dynamic imports beyond locked package chunks.
- **A09 Logging/Monitoring Failures:** Client-only app. Logs avoid secrets; parse errors are generic for users. No backend monitoring surface.
- **A10 SSRF:** Not applicable server-side. Client `fetch` is same-origin sample file only (`src/app/page.tsx:216-230`); no external user-controlled URL fetch.

## Supply Chain / Config Notes

- `npm audit --json`: 0 vulnerabilities.
- No `.env*`, private key, PEM, or credential files found in the repo scan excluding `node_modules`/`.git`.
- `scripts/fetch-map-styles.mjs` is a developer-time fetcher for map style snapshots; generated map styles are committed locally and production CSP/smoke tests prevent remote map asset dependencies.
- Playwright configs use localhost servers only. Test-only launch flags like `--disable-gpu-sandbox` are scoped to browser test runs, not production runtime.

## Recommendations

1. Keep `npm audit --audit-level=high` and `npm run smoke:static` in CI/release gates.
2. If future features add remote URL import, geocoding, auth, or API routes, re-review SSRF, access control, CORS, rate limiting, and privacy posture before implementation.
3. Keep `public/workers/trackParser.worker.js` synchronized with `src/lib/parser.ts` whenever parser limits or error codes change.
4. Do not add user-controlled data to the inline bootstrap script; route future boot-time state through React-safe props or carefully escaped JSON with CSP hash updates.

## Final Security Checklist

- [x] No hardcoded secrets in source/config scan
- [x] Dependency audit run: 0 vulnerabilities
- [x] User input parsing reviewed: GPX/KML/JSON, coordinate search, uploads
- [x] XSS sinks reviewed: one static inline bootstrap script with production CSP hash hardening
- [x] Export/download flow reviewed: filename sanitized, blob URL lifecycle handled
- [x] Auth/authz reviewed: not present / not applicable
- [x] API routes reviewed: none found
- [x] Static serving/path traversal reviewed
- [x] Supply-chain/config posture reviewed
