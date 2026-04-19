# Security Review Report

**Scope:** Entire repository review of `src/`, `public/`, `scripts/`, `e2e/`, root config/manifests, and relevant `.context` docs (`.context/README.md`, `.context/project/*`, `.context/development/01-conventions.md`, prior security-plan/review docs).

**Risk Level:** MEDIUM

## Review method
- Built a complete file inventory for the requested paths; no source/config sampling.
- Read the app/runtime code paths for: CSP/static export hardening, parser/worker safety, browser file handling, MapLibre/network behavior, export/download flows, and static serving.
- Ran targeted unsafe-pattern scans (`dangerouslySetInnerHTML`, `DOMParser`, `FileReader`, `Worker`, `fetch`, `createObjectURL`, storage, external links, dynamic code execution, secrets patterns).
- Ran dependency/secrets verification:
  - `npm audit --json` → **0 vulnerabilities**
  - `git log -p --all | rg ...` secret-pattern scan → **no confirmed historical secrets**
- Ran build/runtime verification:
  - `npm run build` → **passed**
  - `npm run smoke:static` → **passed**

## Full inventory

### Root manifests / config
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `next.config.ts`
- `eslint.config.mjs`
- `playwright.config.ts`
- `playwright.static.config.ts`
- `postcss.config.mjs`

### src/
- `src/app/favicon.ico`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/Controls.tsx`
- `src/components/ElevationProfile.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/ExportPanel.tsx`
- `src/components/FileUpload.tsx`
- `src/components/GlobalToolbar.tsx`
- `src/components/GoogleGuide.tsx`
- `src/components/JourneyCreator.tsx`
- `src/components/KeyboardHelp.tsx`
- `src/components/MapView.tsx`
- `src/components/ModalDialog.tsx`
- `src/components/SceneEditor.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/TimelineSelector.tsx`
- `src/components/Toast.tsx`
- `src/components/TrackToolbar.tsx`
- `src/components/TrackWorkspace.tsx`
- `src/lib/camera.ts`
- `src/lib/env.ts`
- `src/lib/i18n.ts`
- `src/lib/interpolate.ts`
- `src/lib/parser.ts`
- `src/lib/useExportController.ts`
- `src/lib/usePlaybackController.ts`
- `src/lib/videoEncoder.ts`
- `src/styles/vitro-base.css`
- `src/types.ts`

### public/
- `public/favicon.svg`
- `public/file.svg`
- `public/fonts/.omc/state/last-tool-error.json`
- `public/fonts/PretendardVariable.woff2`
- `public/fonts/pretendard.css`
- `public/globe.svg`
- `public/guide/google-maps-phone-export.svg`
- `public/guide/google-takeout-export.svg`
- `public/icon.svg`
- `public/landing-preview.svg`
- `public/map-styles/bright.json`
- `public/map-styles/dark.json`
- `public/map-styles/liberty.json`
- `public/map-styles/positron.json`
- `public/map-styles/voyager.json`
- `public/next.svg`
- `public/sample-trip.gpx`
- `public/theme-init.js`
- `public/vercel.svg`
- `public/window.svg`
- `public/workers/trackParser.worker.js`

### scripts/
- `scripts/fetch-map-styles.mjs`
- `scripts/harden-static-export.mjs`
- `scripts/serve-static.mjs`
- `scripts/smoke-static.mjs`

### e2e/
- `e2e/fixtures/google-records.json`
- `e2e/fixtures/google-semantic-location.json`
- `e2e/fixtures/google-semantic-segments.json`
- `e2e/fixtures/google-timeline-edits.json`
- `e2e/fixtures/invalid-elevation.gpx`
- `e2e/fixtures/korea-japan.gpx`
- `e2e/fixtures/korea-japan.json`
- `e2e/fixtures/korea-japan.kml`
- `e2e/fixtures/point-placemarks.kml`
- `e2e/fixtures/sample.gpx`
- `e2e/fixtures/segmented-city-hop.gpx`
- `e2e/fixtures/single-quote-attrs.gpx`
- `e2e/fixtures/tiny-trim.gpx`
- `e2e/travelback.spec.ts`

### Relevant .context docs reviewed
- `.context/README.md`
- `.context/project/01-overview.md`
- `.context/project/02-architecture.md`
- `.context/development/01-conventions.md`
- `.context/plans/archive/security-hardening-2026-04-18.md`
- `.context/reviews/comprehensive-security-review-2026-04-18.md`
- prior `.context/reviews/security-reviewer.md` for regression context

## Summary
- Critical Issues: 0
- High Issues: 0
- Medium Issues: 1
- Low Issues: 3

## Confirmed findings

### 1. Static deployment clickjacking protection is incomplete because framing policy is delivered only via meta CSP
**Severity:** MEDIUM  
**Category:** OWASP A05 Security Misconfiguration / trust-boundary mismatch  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `src/app/layout.tsx:57-60`
- `scripts/harden-static-export.mjs:8-24,66-97`
- `scripts/serve-static.mjs:147-158`

**Issue:**
The repository’s actual static build relies on a `<meta http-equiv="Content-Security-Policy">` tag for `frame-ancestors 'none'`. That works for many fetch directives, but `frame-ancestors` is not enforced when CSP is delivered via `<meta>`. The local preview server compensates by adding `X-Frame-Options: DENY`, but that protection exists only in `scripts/serve-static.mjs`; it is not part of the shipped static artifact itself.

**Concrete exploit / failure scenario:**
If the app is deployed as a plain static site (which this repo is configured to do via `next.config.ts` `output: 'export'`), an attacker-controlled site can iframe the production app and overlay decoy UI on top of it. A user could be tricked into opening or interacting with sensitive local travel data inside a framed page while believing they are using the original app directly.

**Why this matters here:**
This repo explicitly positions itself as a privacy-preserving local-processing app. The trust boundary is undermined if the actual production artifact can still be framed on hosts that do not inject `X-Frame-Options` or CSP response headers.

**Remediation:**
Serve the CSP as an HTTP response header on the real deployment target, or add an equivalent host-level `X-Frame-Options: DENY` / `Content-Security-Policy: frame-ancestors 'none'` header there.

```tsx
// BAD: static export relies on meta-delivered frame-ancestors
<meta
  httpEquiv="Content-Security-Policy"
  content="... frame-ancestors 'none'; ..."
/>

// GOOD: keep the meta CSP for static fetch controls if needed,
// but enforce anti-framing at the hosting layer via response headers.
// Example header:
// Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; ...
// X-Frame-Options: DENY
```

### 2. Internal OMX tool-state artifact is being shipped publicly under `public/`
**Severity:** LOW  
**Category:** OWASP A05 Security Misconfiguration / information exposure  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `public/fonts/.omc/state/last-tool-error.json:1-7`
- generated proof: `out/fonts/.omc/state/last-tool-error.json`

**Issue:**
An internal OMX state/debug artifact is committed under `public/`, so it becomes part of the published app. The current file exposes internal tool names, a URL target, prompt-preview content, timestamp, and failure metadata.

**Concrete exploit / failure scenario:**
Today the leak is small, but it demonstrates that local agent/tooling residue can silently cross the trust boundary into public assets. Future `.omc` files could expose absolute paths, internal prompts, private endpoints, or investigation notes if the same pattern recurs.

**Remediation:**
Remove the file from `public/`, purge it from built output, and add a guard so hidden tool-state directories cannot be published from `public/`.

```bash
# BAD
public/fonts/.omc/state/last-tool-error.json

# GOOD
rm -rf public/fonts/.omc
# then add a repo guard, e.g. CI check:
find public -path '*/.omc/*' -o -path '*/.codex/*' -o -path '*/.git/*' | grep . && exit 1
```

### 3. Production build still exposes a debug inspection surface when `navigator.webdriver` is true
**Severity:** LOW  
**Category:** OWASP A05 Security Misconfiguration / privacy-hardening gap  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `src/components/MapView.tsx:537-565`
- test consumers: `e2e/travelback.spec.ts:588-609,616-663,767-777`

**Issue:**
The app publishes `window.__travelbackDebug` not only in development, but also whenever `navigator.webdriver` is truthy. That is convenient for Playwright, but it widens the production surface for any browser session flagged as automated.

**Concrete exploit / failure scenario:**
A production session running with enterprise automation tooling, browser instrumentation, or test automation can expose map state and camera state through a stable global object. This is not a full compromise by itself, but it weakens the principle that imported route data remains minimally exposed to other in-page code.

**Remediation:**
Gate the debug API behind development-only or explicit build flags rather than `navigator.webdriver`.

```ts
// BAD
const canExposeDebugCamera = process.env.NODE_ENV === 'development' || navigator.webdriver

// GOOD
const canExposeDebugCamera = process.env.NODE_ENV === 'development'
// or use an explicit compile-time flag:
// const canExposeDebugCamera = process.env.NEXT_PUBLIC_ENABLE_DEBUG_MAP === 'true'
```

## Residual risk / likely issue

### 4. Production CSP still allows inline styles, which weakens XSS containment even though script hardening is good
**Severity:** LOW  
**Category:** OWASP A05 Security Misconfiguration / defense in depth  
**Status:** Risk  
**Confidence:** Medium  
**Location:**
- `src/app/layout.tsx:57-60`
- `scripts/harden-static-export.mjs:8-24`
- generated evidence: `out/index.html:1` (inline `style=` attributes and inline `<style>` blocks remain present)

**Issue:**
The repo correctly hardens `script-src` with hashes in the exported HTML, and `npm run smoke:static` proves that. However, `style-src 'unsafe-inline'` remains in production. That means any future markup/style injection bug would retain a much easier path to UI redressing and deceptive overlays.

**Concrete exploit / failure scenario:**
If a future React/component/library bug ever introduces attacker-controlled HTML or style injection, the current production policy still permits inline CSS that can hide warnings, spoof dialogs, or visually manipulate the export/import flow.

**Remediation:**
Track this as explicit residual risk, and reduce inline-style dependence over time so production CSP can move toward hashed or nonce-based styles.

```ts
// Current policy
"style-src 'self' 'unsafe-inline'"

// Target posture
"style-src 'self' 'sha256-...'"
// or a nonce-based host-level CSP if the deployment stack can support it
```

## Validated controls / passes

### Parser safety
- `src/lib/parser.ts` and `public/workers/trackParser.worker.js` enforce:
  - file-size caps: `200 MB` for GPX/KML, `100 MB` for JSON (`src/lib/parser.ts:422-423,486-489`; worker `196-198,231-236`)
  - point-count cap: `250,000` (`src/lib/parser.ts:500-502`; worker `240-243`)
  - XML entity stripping before browser XML parse (`src/lib/parser.ts:98-107`)
  - coordinate range validation across GPX/KML/Google JSON paths
  - JSON parsing offloaded to a same-origin worker via `ArrayBuffer` transfer (`src/lib/parser.ts:429-481`)
- I did **not** find `eval`, `new Function`, HTML-parsing `DOMParser(..., 'text/html')`, or raw `innerHTML=` assignment sinks in app-authored source.

### Browser file handling
- Upload UI accepts only `.gpx`, `.kml`, `.json` and revalidates parser-side (`src/components/FileUpload.tsx:20,34-46,81-94`; `src/lib/parser.ts:484-536`).
- Imported track data stays in browser memory only; I found no app-owned upload endpoint, no `FormData`, no XHR/WebSocket/EventSource/beacon submission path.
- Download/export object URLs are revoked on reset/unmount (`src/lib/useExportController.ts:50-66,141-151`).

### MapLibre / network exposure
- Bundled map styles are local-only and contain no remote tile/glyph/sprite sources (`public/map-styles/*.json`; `scripts/fetch-map-styles.mjs:14-48`).
- `npm run smoke:static` passed the repo’s own hardening assertions, including local-only style validation and same-origin CSP checks (`scripts/smoke-static.mjs:104-143`).
- Runtime fetch surface is narrow:
  - same-origin sample-file fetch (`src/app/page.tsx:176-199`)
  - same-origin worker load (`src/lib/parser.ts:437-440`)
  - optional local blob re-read during save fallback (`src/lib/videoEncoder.ts:156-165`)
  - explicit external Google Takeout help link with `rel="noopener noreferrer"` (`src/components/GoogleGuide.tsx:342-347`)

### Supply chain / dependency posture
- `npm audit --json` returned **0** known vulnerabilities.
- No hardcoded secrets were found in requested repo paths; history grep also found no confirmed leaked credentials.
- Package surface is relatively small and frontend-focused; no app-authored install hooks exist in `package.json`.

### Auth / access control surface
- No app-owned authentication/session/backend authorization layer exists in the reviewed source tree.
- No API routes, route handlers, cookies, bearer-token handling, or credential storage were found.

## OWASP-style sweep
- **A01 Broken Access Control:** no backend/API auth surface in repo; main residual issue is framing/trust-boundary mismatch.
- **A02 Cryptographic Failures:** no custom auth crypto; only local ID generation and CSP hash generation.
- **A03 Injection:** no SQL/command/template injection surface found; parser inputs are constrained to file parsing and React text rendering.
- **A04 Insecure Design:** static deployment trust assumptions are stronger than actual anti-framing enforcement.
- **A05 Security Misconfiguration:** confirmed for meta-only framing control, shipped `.omc` artifact, webdriver debug surface, residual inline-style CSP allowance.
- **A06 Vulnerable and Outdated Components:** `npm audit` clean.
- **A07 Identification and Authentication Failures:** not applicable in current repo surface.
- **A08 Software and Data Integrity Failures:** no obvious client-side update/plugin execution path; one public tooling artifact indicates build/publish hygiene gap.
- **A09 Security Logging and Monitoring Failures:** not a primary app concern here; no backend telemetry surface reviewed.
- **A10 SSRF:** no server-side request surface in the app runtime.

## Final missed-issues sweep
I re-swept for:
- `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, dynamic script insertion
- `fetch`, `Worker`, `FileReader`, `DOMParser`, `postMessage`, `createObjectURL`
- secrets patterns in source and git history
- remote URLs in built output and map styles
- static-export CSP hardening and off-base asset behavior via `npm run smoke:static`

No additional confirmed security/privacy/supply-chain findings surfaced beyond the four items above.

## Security checklist
- [x] No confirmed hardcoded secrets in live source
- [x] Input parsing validates file type/size/point-count and uses worker isolation for JSON
- [x] Injection/code-execution sink sweep completed
- [x] MapLibre runtime validated as local-only / no third-party tile dependency
- [x] Dependencies audited (`npm audit` clean)
- [x] Static export hardening validated with build + smoke test
- [ ] Anti-framing protection is reliably enforced on the real static host
- [ ] Internal tooling artifacts are fully excluded from `public/`
