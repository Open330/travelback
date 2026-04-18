# Security Hardening — 2026-04-18

**Priority:** HIGH — defense-in-depth and trust boundary tightening
**Source:** comprehensive-security-review-2026-04-18 (HIGH-2, MED-5, MED-7, MED-9, MED-10, LOW-11, LOW-15)
**Estimated effort:** 4-6 hours

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| SEC-HIGH-2 | CSP `unsafe-inline` for styles + broad CDN trust | HIGH | layout.tsx, harden-static-export.mjs |
| SEC-MED-5 | CDN font without full sub-resource integrity | MED | layout.tsx |
| SEC-MED-7 | Blob URL memory accumulation on repeated exports | MED | useExportController.ts |
| SEC-MED-9 | No global Referrer-Policy header | MED | layout.tsx |
| SEC-MED-10 | Prototype pollution in transitive dependency | MED | package.json |
| SEC-LOW-11 | Debug interface exposed in WebDriver mode | LOW | MapView.tsx |
| SEC-LOW-15 | Console error messages may leak file fragments | LOW | FileUpload.tsx, parser.ts |

---

## Implementation steps

### 1. Self-host Pretendard font, remove CDN from CSP

**Files:** `src/app/layout.tsx`, `scripts/harden-static-export.mjs`

**Current:** Pretendard font CSS loaded from `cdn.jsdelivr.net` with SRI. CSP allows `https://cdn.jsdelivr.net` in `style-src` and `font-src`.

**Fix:**
1. Download the Pretendard Variable CSS and woff2 subsets to `public/fonts/`
2. Replace the CDN `<link>` in `layout.tsx` with a local reference:
   ```html
   <link rel="stylesheet" href={`${basePath}/fonts/pretendardvariable-dynamic-subset.min.css`} />
   ```
3. Remove `https://cdn.jsdelivr.net` from CSP in both `layout.tsx` and `harden-static-export.mjs`:
   ```
   style-src 'self' 'unsafe-inline';
   font-src 'self';
   ```
4. Remove the `integrity` and `crossOrigin` attributes (no longer needed for local resources)

**Verification:** Load the app. Confirm Pretendard font renders correctly. Check DevTools Network tab — no requests to cdn.jsdelivr.net. CSP headers in production build contain no CDN URLs.

---

### 2. Add global Referrer-Policy meta tag

**File:** `src/app/layout.tsx`

**Current:** No `Referrer-Policy` header or meta tag. Default is `strict-origin-when-cross-origin`.

**Fix:** Add to `<head>`:
```html
<meta name="referrer" content="no-referrer" />
```

**Verification:** Click the Google Takeout link in GoogleGuide. Confirm no `Referer` header is sent (check in DevTools Network tab).

---

### 3. Update protocol-buffers-schema dependency

**File:** `package.json`

**Current:** Transitive dependency `protocol-buffers-schema` has a known prototype pollution CVE (GHSA-j452-xhg8-qg39).

**Fix:**
```bash
npm update protocol-buffers-schema
```
Or add an explicit override in `package.json`:
```json
"overrides": {
  "protocol-buffers-schema": "^3.6.1"
}
```

**Verification:** Run `npm audit`. Confirm no moderate+ vulnerabilities remain.

---

### 4. Auto-revoke blob URLs after export download

**File:** `src/lib/useExportController.ts`

**Current:** Blob URL persists in state until `resetExportSession` is called. Multiple exports accumulate blob URLs and their backing ArrayBuffers in memory.

**Fix:** After `downloadVideo()`, schedule auto-revocation and clear the state URL:
```ts
const blob = new Blob([result.buffer], { type: result.mimeType })
const videoUrl = URL.createObjectURL(blob)
downloadVideo(videoUrl, result.filename)
// Keep URL in state briefly for the video preview, then auto-revoke
setExportedVideoUrl(videoUrl)
```

In `resetExportSession`, revoke immediately. Also add a timeout-based auto-revocation:
```ts
// In the done state handler or useEffect
useEffect(() => {
  if (exportState === 'done' && exportedVideoUrl) {
    const timer = setTimeout(() => {
      URL.revokeObjectURL(exportedVideoUrl)
    }, 60000) // 1 minute to allow preview
    return () => clearTimeout(timer)
  }
}, [exportState, exportedVideoUrl])
```

**Verification:** Export two large videos in sequence without clicking "Export Again". Monitor memory in DevTools. Confirm memory does not accumulate linearly.

---

### 5. Restrict debug interface to development mode only

**File:** `src/components/MapView.tsx:484-512`

**Current:** `window.__travelbackDebug` is exposed when `navigator.webdriver` is truthy. This can be true for users with automation extensions or corporate monitoring software.

**Fix:** Replace the webdriver check with a development-only check:
```ts
const canExposeDebugCamera = process.env.NODE_ENV === 'development'
```

**Verification:** In production build, confirm `window.__travelbackDebug` is not exposed even with webdriver flag set.

---

### 6. Sanitize console error logging

**File:** `src/components/FileUpload.tsx:57`, `src/lib/parser.ts:371,385`

**Current:** `console.error('[Travelback] Parse error:', err)` logs the full error object which may include file content fragments.

**Fix:** Log only the error message, not the full object:
```ts
// FileUpload.tsx
if (!isSafe) console.error('[Travelback] Parse error:', err instanceof Error ? err.message : 'Unknown error')

// parser.ts — similar change for all console.error calls
```

**Verification:** Load an invalid file. Check console — confirm no file content fragments appear in error output.

---

## Verification checklist

- [x] `npm run build` succeeds
- [x] `npm run test:e2e:static:ci` passes
- [x] No CDN requests in production build (Network tab clean)
- [x] CSP in production build has no CDN URLs
- [x] Referrer-Policy: no-referrer set
- [x] `npm audit` shows 0 moderate+ vulnerabilities
- [x] Debug interface not exposed in production
- [x] Console errors do not leak file content

**Status: COMPLETE** — All 7 findings implemented. Commit: `7fb5006`
