# Security Review Report

**Scope:** Whole-repo review of `.context/**`, `package.json`, configs, `src/**`, `scripts/**`, `e2e/**`, and `public/**`
**Date:** 2026-04-19
**Risk Level:** HIGH

## Build inventory
- Framework/runtime: Next.js 16 static export, React 19, TypeScript, Node-based static hardening/serve scripts
- Inventory counts reviewed: `.context` 149 files, `src` 31 files, `scripts` 4 files, `e2e` 14 files, `public` 21 files, plus 7 top-level config files
- Untrusted inputs: user-supplied GPX/KML/Google Location History JSON, localStorage theme/locale/unit prefs, browser share/save APIs
- Trust boundaries reviewed:
  - upload -> `FileReader`/parser -> worker/main-thread parse -> UI rendering -> export/download/share
  - build -> `fetch-map-styles` -> `harden-static-export` -> `serve-static`
  - runtime map display -> third-party CARTO tile/glyph/sprite endpoints

## Verification performed
- Secrets scan: repo grep across requested paths and git history spot-scan for common credential patterns
- Dependency audit: `npm audit --json` -> **0 known vulnerabilities**
- Static hardening verification:
  - `npm run build` -> success
  - `npm run smoke:static` -> **failed** with `bright.json still depends on remote sprite/glyph assets`
  - Built-artifact spot check (`out/map-styles/*.json`) confirms every shipped style still contains remote `sprite`, remote `glyphs`, one external `carto` source, and 27 `symbol` layers
  - Built CSP spot check (`out/index.html`) confirms production uses hash-based `script-src`, but still ships `style-src 'self' 'unsafe-inline'` and `connect-src 'self' https://*.basemaps.cartocdn.com`
  - Fresh static-server header probe on `/travelback/` and `/travelback/sample-trip.gpx` confirmed `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, and `Cross-Origin-Resource-Policy: same-origin`
  - Fresh method probe confirmed `POST /travelback/` returns `405 Method Not Allowed`
  - Fresh edge-path probes using `curl --path-as-is` confirmed traversal attempts `/travelback/../sample-trip.gpx` and `/travelback/%2e%2e/sample-trip.gpx` return `404 Not Found`
  - Fresh HEAD probe confirmed `HEAD /travelback/` preserves the same hardening headers as GET
  - Full shipped-style count check confirmed all 5 built style JSONs still have `hasSprite=true`, `hasGlyphs=true`, `sourceKeys=1`, and `symbolLayers=27`
  - Raw socket probe confirmed malformed request path `GET /%ZZ` returns `404 Not Found`
  - Exact built-output grep shows shipped remote references are present directly in `out/map-styles/*.json` as CARTO tile endpoints plus remote `sprite`/`glyphs` URLs
  - Aggregate shipped-output count confirms the build currently embeds **20** remote CARTO tile URLs, **5** remote sprite URLs, **5** remote glyph URLs, and **135** symbol layers across the 5 shipped styles
  - Fresh CSP consistency check on `out/index.html` and `out/_not-found.html` confirmed **8 inline scripts / 8 matching SHA-256 hashes**, no production `script-src 'unsafe-inline'`, but persistent `style-src 'unsafe-inline'`
  - Fresh cache-control probe confirmed the static server serves HTML with `Cache-Control: no-cache` and uploaded sample assets with `Cache-Control: public, max-age=3600`
  - Fresh full-HTML audit confirmed all 3 emitted HTML files (`out/index.html`, `out/_not-found.html`, `out/404.html`) carry the hardened `data-travelback-csp="static-export"` marker, include script hashes, and no longer contain the CSP placeholder or production `script-src 'unsafe-inline'`
  - Fresh source/build secret-pattern pass found no confirmed credentials in app code or built output; remaining matches were confined to historical review docs / git metadata rather than live source secrets
  - Fresh dangerous-sink enumeration across `src`/`public`/`scripts` found **12** relevant sink-like sites, dominated by the known CSP-hashed theme bootstrap, XML parsing, worker messaging, file reads, object URLs, and save-file APIs; no `eval`, `new Function`, or unsanctioned raw HTML sinks were surfaced
  - Fresh parser/worker parity check confirmed the main thread and worker both enforce the same **500 MB JSON limit**, **64-level JSON depth limit**, and **250,000-point ceiling**, but the app still reads the full file as text and posts the full JSON string to the worker
  - Fresh CSP directive audit across all emitted HTML files confirmed presence of `script-src-attr 'none'`, `style-src-attr 'none'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, `form-action 'self'`, `worker-src 'self' blob:`, `child-src 'self' blob:`, and `media-src 'self' blob:`
  - Fresh route-surface audit of `src/app` found only `layout.tsx` and `page.tsx` app code with **no app-owned API routes / route handlers**, reinforcing that no server-side upload endpoint exists in this repo
  - Fresh network-surface census found runtime-relevant outbound surfaces concentrated in: CARTO tile/sprite/glyph references, the local sample-file fetch, the static worker asset load, file-save/share APIs, and the explicit external Google Takeout link; no hidden app-owned backend fetch surface was found
  - Fresh upload-surface audit confirmed the UI only accepts `.gpx`, `.kml`, and `.json`, warns at **100 MB**, enforces parser-side limits of **200 MB** for GPX/KML and **500 MB** for JSON, strips XML entities before parsing, checks for XML parser errors, and rejects unsupported formats / too-few / too-many-point tracks
  - Fresh file-path audit confirmed app-authored file handling is limited to extension checks via `file.name.split('.')`, `FileReader` reads, and synthetic `File` objects for local sample/share flows; no arbitrary path reads/writes are present in client code
  - Fresh worker-fallback verification confirmed that when worker parsing fails, payloads over **50 MB** are explicitly rejected instead of retrying on the main thread
  - Fresh base-path probe confirmed the static server redirects both `/` and bare `/travelback` to `/travelback/`, while off-base asset requests like `/sample-trip.gpx` return `404 Not Found`
  - Fresh build-pipeline audit confirmed the hardening script is wired as `postbuild`, while `smoke:static` is a separate explicit gate rather than an automatic part of `npm run build`
  - Fresh dependency-surface audit confirmed the root manifest is small and frontend-focused (7 prod deps / 9 dev deps); lockfile install scripts appear only in transitive toolchain/native packages (`fsevents`, `sharp`, `unrs-resolver`), with no app-authored install-time script surface beyond the declared npm scripts
  - Fresh smoke-static rerun reconfirmed the exact enforcement failure at `scripts/smoke-static.mjs:112-126,141-142`: build output still fails the pinned-local style contract with `bright.json still depends on remote sprite/glyph assets`
  - Fresh local-asset probe confirmed the worker script, bundled font CSS/WOFF2, sample GPX, and landing preview SVG are all shipped from same-origin static assets; runtime requests for `/travelback/workers/trackParser.worker.js`, `/travelback/fonts/pretendard.css`, and `/travelback/fonts/PretendardVariable.woff2` return 200 with local content types and cacheable responses
  - Fresh metadata/link audit of shipped HTML confirmed same-origin references for the worker, bundled fonts, sample GPX, and landing preview assets, while public metadata remains anchored to `https://open330.github.io/travelback/` and shipped pages still expose CARTO-related external references only through the known map stack / policy surface
  - Fresh fixture audit confirmed the checked-in E2E fixtures cover multiple supported Google JSON shapes plus GPX/KML edge cases, but they currently contain **no** XML `<!DOCTYPE` / `<!ENTITY` payloads or deeply nested JSON adversarial samples that would directly exercise the parser-abuse paths documented in this review
  - Fresh test-surface audit confirmed the repo already checks pinned-local map styles, hardened static CSP, off-base 404 behavior, and uploads across GPX/KML/multiple Google JSON fixtures, but it still lacks direct automated coverage for the JSON depth-bypass case and the runtime privacy leak from remote CARTO map requests
  - Fresh service-worker/auth audit found no shipped service-worker files, no app manifest/PWA offline interception surface beyond Next build manifests, and no app-owned auth/session/backend-auth code paths in the reviewed source tree
  - Fresh static-response audit confirmed the server source contains no `Set-Cookie` or auth-header logic, and live responses for both HTML and sample asset requests emitted no `Set-Cookie` / `WWW-Authenticate` headers
  - Fresh form-surface audit confirmed all emitted HTML files contain **0** `<form>` elements and **0** `action=` attributes, matching the restrictive `form-action 'self'` CSP and the app's no-backend design
  - Fresh embed-surface audit confirmed all emitted HTML files contain **0** `<object>`, **0** `<embed>`, **0** `<iframe>`, and **0** `<frame>` elements, consistent with the shipped `object-src 'none'` and `frame-ancestors 'none'` posture
  - Fresh inline-handler audit confirmed all emitted HTML files contain **0** inline `on*` event-handler attributes, matching the shipped `script-src-attr 'none'` CSP posture
  - Fresh link-scheme audit confirmed emitted HTML contains **0** `javascript:` URLs and **0** `data:text/html` navigation targets, and no such schemes were found in the reviewed `src` / `public` tree
  - Fresh inline-style-attribute audit found shipped HTML still contains inline `style=` attributes (**15** in `out/index.html`, **5** each in `out/_not-found.html` and `out/404.html`), which is consistent with the current `style-src 'unsafe-inline'` allowance and means `style-src-attr 'none'` is not effectively constraining those emitted attributes in practice
  - Fresh CSP/style audit reconfirmed that all 3 emitted HTML files simultaneously contain `style-src 'self' 'unsafe-inline'`, `style-src-attr 'none'`, and inline `style=` attributes, so the shipped policy/markup combination is internally inconsistent from a defense-in-depth standpoint
  - Fresh external-reference audit of emitted HTML confirmed the only absolute `https://` URL serialized directly into shipped pages is the public metadata base / `og:url` (`https://open330.github.io/travelback/`); runtime CARTO exposure remains driven by shipped style JSON/CSP rather than direct absolute script/link tags in the HTML shell
  - Fresh shell-asset audit confirmed emitted HTML `href`/`src` references are otherwise same-origin `/travelback/...` assets only (scripts, CSS, icons, fonts, landing preview), with no direct third-party script/style/image tags in the HTML shell
  - Fresh raw-HTML sink audit confirmed reviewed source files contain exactly **1** intentional `dangerouslySetInnerHTML` usage in `src/app/layout.tsx` (theme bootstrap), while additional matches appear only in generated/bundled Next output rather than app-authored source
  - Fresh sink-path audit confirmed user-controlled `track.name` is rendered as plain React text in `src/components/TrackWorkspace.tsx` and export filenames are normalized/sanitized in `src/lib/videoEncoder.ts` before download (`NFKC`, forbidden-character stripping, whitespace collapse, trim, length cap)
  - Fresh external-link audit confirmed the app-authored Google Takeout link uses `target="_blank"` with `rel="noopener noreferrer"`; separately, generated map-style attribution links use `rel="noopener"` when targeting a new tab
  - Fresh raw-sink audit confirmed app-authored `src` / `public` / `scripts` files contain **0** direct `innerHTML` assignment sinks
  - Fresh dynamic-script audit confirmed app-authored `src` / `public` / `scripts` files contain **0** dynamic script-insertion sinks (`createElement('script')`, script `appendChild`, `insertAdjacentHTML`, or `document.write`)
  - Fresh HTML-injection sink audit confirmed app-authored `src` / `public` / `scripts` files contain **0** `srcdoc`, `outerHTML=` assignments, `insertAdjacentHTML(...)`, contextual-fragment creation, or `DOMParser(..., 'text/html')` usage
  - Fresh URL/navigation audit confirmed the reviewed source has no query-param driven navigation logic; the only relevant URL/location uses are metadata URL construction, static-server request parsing, and explicit `window.location.reload()` recovery paths
  - Fresh code-execution audit confirmed app-authored `src` / `public` / `scripts` files contain **0** `eval(...)` or `new Function(...)` sinks
  - Fresh command-execution audit found only test/helper use of `spawn()` in `scripts/smoke-static.mjs` to launch the local static server; no app-runtime command-execution surface exists in reviewed client code
  - Fresh storage audit confirmed `localStorage` usage is limited to non-sensitive UI preferences / hints (theme, locale, units, timeline hint dismissal); no track files, parsed track points, or export blobs are persisted in `localStorage` / `sessionStorage`
  - Fresh outbound-request audit confirmed reviewed app/runtime code contains no XHR, WebSocket, EventSource, or beacon surfaces; the only `fetch()` calls are the local sample-file load, the blob re-read fallback in export download, and Node-side build/test helpers (`fetch-map-styles`, `smoke-static`)
  - Fresh upload-network audit found no `FormData`, multipart upload, or network submission surface in app-authored runtime code; remaining `upload` string matches are UI copy/CSS labels rather than transport logic
  - Fresh share-surface audit confirmed the only clipboard/share-adjacent runtime capability is optional `navigator.share` file sharing in `src/components/ExportPanel.tsx`; no clipboard read/write surface exists in app-authored code
  - Fresh crypto/auth audit confirmed app-authored source contains no token/JWT/password-hashing/auth crypto flows; the only crypto usage is browser `crypto.randomUUID()` for local IDs and Node `crypto.createHash('sha256')` for CSP hash generation in the build hardening script
  - Fresh capability audit confirmed app-authored source contains no geolocation, payment, USB, serial, Bluetooth, or camera/microphone API usage, aligning with the restrictive shipped `Permissions-Policy`
  - Fresh persistence-surface audit confirmed app-authored source contains no IndexedDB, Cache API, localforage, or WebSQL usage, further supporting that uploaded track data is not persisted beyond in-memory session state and limited UI preference storage
  - Fresh messaging audit confirmed the only `postMessage` usage is the same-origin parser worker request/response path; no window-level `message` listeners, `window.postMessage`, `MessageChannel`, or `BroadcastChannel` surfaces were found
  - Fresh event/timer audit confirmed app-authored event-loop usage is limited to UI timers, animation frames, and local interaction listeners (`keydown`, pointer/mouse/touch, media-query change, abort signals); no cross-origin messaging or hidden background polling surface was found
  - Fresh parser-shape audit confirmed the app-authored parsing surface is narrow: one `DOMParser(..., 'application/xml')` path for GPX/KML, one `JSON.parse(...)` path in the main parser, one mirrored `JSON.parse(...)` path in the worker, and GeoJSON conversion only through the trusted `@tmcw/togeojson` GPX/KML adapters
  - Fresh worker/blob audit confirmed parser worker loading is sourced from the same-origin static worker path in source, export object URLs are created once and revoked on multiple cleanup paths, and the download helper still retains a blob-URL fetch fallback (`blob ?? await (await fetch(url)).blob()`) that is functionally local but adds unnecessary blob re-read complexity
  - Fresh CSP/asset-model audit confirmed all emitted HTML files ship `connect-src 'self' https://*.basemaps.cartocdn.com`, `img-src 'self' blob: data:`, `font-src 'self'`, and same-origin `worker-src`/`media-src`; the only non-self network hosts required by shipped style JSON are CARTO tile hosts (`tiles-a`..`tiles-d`.basemaps.cartocdn.com) plus `tiles.basemaps.cartocdn.com` for sprite/glyph assets
  - Fresh blob/data-scheme audit confirmed emitted HTML only references `blob:` / `data:` through CSP directives (not direct shell URLs), while app-authored source uses data URIs only for local decorative CSS and uses object URLs strictly for local export blob handling
  - Depth-guard PoC: a synthetic 1,048,750-byte JSON with actual nesting depth **70** passed `checkJsonDepth()` and still parsed via `JSON.parse()`

## Summary
- Critical Issues: 0
- High Issues: 1
- Medium Issues: 3
- Low Issues: 1

---

## High Issues

### 1. Runtime map stack still depends on third-party CARTO assets, leaking user map activity and breaking the pinned-local hardening contract
**Severity:** HIGH  
**Category:** OWASP A04 Insecure Design / A05 Security Misconfiguration / Privacy leak  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `scripts/fetch-map-styles.mjs:1-10,44-74,99-136`
- `public/map-styles/voyager.json:5-20`
- `public/map-styles/bright.json:5-20`
- same pattern also present in `public/map-styles/{positron,dark,liberty}.json`
- `src/components/MapView.tsx:500-502,578-581`
- `scripts/smoke-static.mjs:104-126`

**Why it matters:**
The repo’s build/test/docs all imply map assets are pinned locally, but the shipped style JSON still references remote CARTO vector tiles, sprites, and glyphs. Every map view therefore makes third-party network requests. For a privacy-sensitive app that visualizes users’ local travel history, those requests disclose IP, user agent, timing, and approximate viewport/journey geography to CARTO/CDN infrastructure.

**Concrete exploit/failure scenario:**
A user imports a sensitive GPX/Google Location History file and previews/exports it. As the camera animates across the route, the browser requests corresponding map tiles/glyphs from `*.basemaps.cartocdn.com` / `tiles.basemaps.cartocdn.com`, exposing where the route is being viewed. This is also a release-hardening failure: `npm run smoke:static` currently fails because the styles are not actually pinned local. Fresh built-artifact inspection showed all 5 shipped styles still expose a remote `sprite`, remote `glyphs`, `sourceKeys: ['carto']`, and `symbolLayers: 27`.

**Suggested fix:**
- Make the checked-in styles truly self-contained before runtime use:
  - remove `sprite`, `glyphs`, and external `sources`
  - strip or replace symbol layers that require them
  - vendor the exact assets locally if labels/sprites are required
- Make `fetch-map-styles.mjs` enforce that contract instead of only rewriting vector tile URLs
- Keep `smoke-static` as a release gate and fail CI on any regression

```js
// BAD: leaves live third-party dependencies in shipped style JSON
function adaptStyle(style, targetName, overrides) {
  const adapted = JSON.parse(JSON.stringify(style))
  // ...rewrites sources only...
  return adapted
}

// GOOD: enforce a fully local/pinned runtime contract
function adaptStyle(style, targetName, overrides) {
  const adapted = JSON.parse(JSON.stringify(style))

  delete adapted.sprite
  delete adapted.glyphs
  adapted.sources = {}
  adapted.layers = (adapted.layers || []).filter((layer) => layer.type !== 'symbol')

  // apply only locally supported layers/overrides here
  adapted.name = targetName.charAt(0).toUpperCase() + targetName.slice(1)
  return adapted
}
```

---

## Medium Issues

### 2. Large JSON imports are still read and duplicated on the main thread before worker isolation, enabling easy browser memory/CPU exhaustion
**Severity:** MEDIUM  
**Category:** OWASP A04 Insecure Design / Availability  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `src/lib/parser.ts:450-545,521-563`
- `public/workers/trackParser.worker.js:247-267`

**Why it matters:**
JSON files up to 500 MB are accepted. But the browser first does `FileReader.readAsText(file)` on the main thread, creating a giant JS string, and then `worker.postMessage({ ext: 'json', text })`, which clones that payload into the worker. The worker helps with `JSON.parse`, but not with the initial read/clone cost.

**Concrete exploit/failure scenario:**
A user is told to import a “Google export” that is near the 500 MB limit. The page allocates a very large UTF-16 string in the main thread, then duplicates it into the worker, then parses it again. On typical laptops/phones this can freeze the tab or crash the browser before any safety bound helps.

**Suggested fix:**
- Reduce the accepted JSON size to something aligned with in-browser memory reality
- Move heavy parsing to chunked/streamed worker-side processing if supported
- Prefer `file.arrayBuffer()` plus worker-side decode/parse to avoid redundant giant main-thread strings
- Reject oversized files earlier with a conservative limit based on device/browser constraints

```ts
// BAD
const reader = new FileReader()
reader.onload = async () => {
  const text = reader.result as string
  track = await parseGoogleLocationHistoryInWorker(text)
}
reader.readAsText(file)

// GOOD
const MAX_SAFE_JSON_BYTES = 50 * 1024 * 1024
if (file.size > MAX_SAFE_JSON_BYTES) {
  throw new ParseError('JSON file is too large for safe in-browser parsing', 'FILE_TOO_LARGE')
}

const buffer = await file.arrayBuffer()
track = await parseGoogleLocationHistoryInWorkerBuffer(buffer)
```

### 3. JSON depth protection is heuristic and bypassable, so maliciously nested payloads can still hit expensive `JSON.parse()` paths
**Severity:** MEDIUM  
**Category:** OWASP A04 Insecure Design / Parser abuse  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `src/lib/parser.ts:320-368`
- `public/workers/trackParser.worker.js:200-267`

**Why it matters:**
The depth guard scans only the first 1 MB, then four 1 KB spot-check windows at 25%, 50%, 75%, and near EOF. An attacker can place deeply nested structures between those windows and bypass the guard entirely. Fresh verification confirmed this: a synthetic 1,048,750-byte payload with actual depth 70 passed `checkJsonDepth()` and then parsed successfully with `JSON.parse()`.

**Concrete exploit/failure scenario:**
A crafted JSON file keeps the first megabyte and sampled windows shallow, but places 65+ nested arrays/objects in an unsampled region. `checkJsonDepth()` passes, then `JSON.parse()` processes the malicious nesting anyway, causing worker failure or a UI freeze; for smaller files, the worker fallback can then retry on the main thread.

**Suggested fix:**
- Replace sampling with a full streaming depth scan over the entire file text/buffer before `JSON.parse`
- If performance is a concern, scan the full payload once in the worker and remove the fallback-to-main-thread path for malformed/deep JSON

```ts
// BAD: sampled windows miss adversarial nesting
const samples = [len * 0.25, len * 0.5, len * 0.75, len - 1024]

// GOOD: linear full scan before JSON.parse
for (let i = 0; i < text.length; i++) {
  const ch = text[i]
  // track escape/string state, then enforce full-file depth bound
}
```

### 4. Production CSP still allows `style-src 'unsafe-inline'`, weakening XSS containment and UI integrity defenses
**Severity:** MEDIUM  
**Category:** OWASP A05 Security Misconfiguration / XSS containment  
**Status:** Risk  
**Confidence:** Medium  
**Location:**
- `src/app/layout.tsx:52-60`
- `scripts/harden-static-export.mjs:8-23`

**Why it matters:**
The script hardening is good in production, but style injection remains broadly allowed. That means any future HTML/CSS injection bug would have a much easier path to phishing overlays, clickjacking-like UI deception inside the app, or CSS-based data exposure techniques.

**Concrete exploit/failure scenario:**
If any future component or third-party library introduces a markup/style injection sink, the current CSP will still permit attacker-controlled inline styles in production. Even without arbitrary JS, that is enough to hide controls, spoof export dialogs, or manipulate what the user clicks during upload/export.

**Suggested fix:**
- Move toward hash/nonce-based style allowances or eliminate inline style generation where feasible
- At minimum, treat `style-src 'unsafe-inline'` as an explicit residual risk and keep it out of privacy/security claims

```ts
// BAD
"style-src 'self' 'unsafe-inline'"

// BETTER
"style-src 'self' 'sha256-<known-style-hash>'"
// or use a nonce-based approach if the framework path supports it
```

---

## Low Issues

### 5. `.context` documentation overstates the privacy boundary and can mislead reviewers/operators about real third-party exposure
**Severity:** LOW  
**Category:** OWASP A04 Insecure Design / Documentation trust failure  
**Status:** Confirmed  
**Confidence:** High  
**Location:**
- `.context/project/01-overview.md:11-15`
- `.context/project/02-architecture.md:95-103`
- contradicted by `public/map-styles/*.json:5-20`

**Why it matters:**
The internal project context says map assets are fully local and normal map display no longer needs third-party requests. That is false in the current repo state. Security/privacy reviewers and maintainers can make bad deployment or messaging decisions if they trust those notes.

**Concrete exploit/failure scenario:**
A maintainer signs off on a privacy-sensitive deployment or user-facing statement based on `.context` docs, assuming imported route viewing stays local. In reality, runtime map requests still go to CARTO endpoints for tiles/glyphs/sprites.

**Suggested fix:**
Update `.context` docs immediately to reflect the current trust boundary, or better, make the code match the docs by actually pinning map assets locally.

```md
<!-- BAD -->
Map Assets: Fully local bundled map themes; runtime map display no longer depends on external tiles, glyphs, or sprites

<!-- GOOD -->
Map display currently depends on CARTO-hosted vector tiles/glyphs/sprites. Uploaded track files stay in-browser, but map rendering still makes third-party requests unless styles are fully vendored locally.
```

---

## Dependency / secrets results
- **npm audit:** 0 vulnerabilities reported
- **Hardcoded secrets scan:** no confirmed API keys, tokens, passwords, or private keys found in reviewed repo paths
- **Git history secret grep:** no confirmed secrets surfaced by pattern scan

## OWASP sweep
- **A01 Broken Access Control:** N/A for a static client app; static server path traversal protections looked reasonable (`scripts/serve-static.mjs`)
- **A02 Cryptographic Failures:** no custom crypto/auth flows found; no secrets found
- **A03 Injection:** no live `eval`/`Function` sinks found; main residual issue is weaker CSP containment for future UI/style injection
- **A04 Insecure Design:** confirmed parser-abuse/availability risks and incorrect privacy assumptions around map assets
- **A05 Security Misconfiguration:** confirmed residual CSP weakness and shipped remote asset dependencies contrary to hardening expectations
- **A06 Vulnerable/Outdated Components:** `npm audit` clean
- **A07 Identification/Auth Failures:** not applicable; no auth stack present
- **A08 Software/Data Integrity Failures:** build-time map-style ingestion still trusts remote upstream style JSON without pinning/integrity verification
- **A09 Logging/Monitoring Failures:** mostly client-side console logging only; limited applicability
- **A10 SSRF:** not applicable in the static client/runtime model reviewed

## Security checklist
- [x] No hardcoded secrets found
- [ ] All untrusted file inputs safely bounded against parser-abuse DoS
- [ ] Runtime map/privacy boundary fully local or accurately disclosed
- [~] XSS containment partially hardened (script CSP good in production, style CSP still weak)
- [x] Dependencies audited

## Immediate priorities
1. Fix the map-style pipeline so shipped styles are truly local/pinned and smoke-static passes.
2. Lower/reshape JSON parsing limits so untrusted large files cannot trivially freeze the browser.
3. Replace the heuristic JSON depth sampler with a full-pass bound.
4. Either tighten `style-src` or clearly track it as residual risk in docs/reviews.
5. Correct `.context` privacy claims.
