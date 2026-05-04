# Security Review — Travelback (2026-05-04)

## Summary

The security posture is strong for a client-side-only app. CSP is well-implemented with hash-based script-src, XML entity declarations are rejected before parsing, and file size limits prevent memory exhaustion. The main attack surface is file parsing.

## Findings

### 1. XML entity stripping is defense-in-depth only — LOW risk, HIGH confidence
**File**: `src/lib/parser.ts:119-124,126-150`
**Issue**: `preflightXml` rejects DOCTYPE/ENTITY declarations before DOMParser. `stripXmlEntities` removes any that slip through. This two-layer approach is sound. However, the regex `<!ENTITY[\s\S]*?>` is non-greedy and could miss malformed entities in edge cases. Since `preflightXml` is the primary guard and it runs first, this is defense-in-depth only.
**Suggestion**: No change needed — the primary guard is the regex check in preflightXml.

### 2. CSP meta tag replacement relies on regex matching — MEDIUM risk, HIGH confidence
**File**: `scripts/harden-static-export.mjs:9,104-123`
**Issue**: `inlineTravelbackBootstrap` uses a regex to match the Next.js `__next_s.push` output and extract the bootstrap script. If Next.js changes its serialization format, the regex fails silently (the build-time assertion catches this). The regex pattern at line 105 is correct for current Next.js 16 output.
**Suggestion**: The build-time assertion at line 118-120 properly catches format drift. This is well-guarded.

### 3. JSON depth check is bounded to 10MB scan — LOW risk, HIGH confidence
**File**: `src/lib/googleJsonParser.ts:283-304`
**Issue**: `checkJsonDepth` scans only the first 10MB of input. A file with safe nesting in the first 10MB but deeper nesting later would pass the check. However, `JSON.parse` itself has a depth limit and throws `RangeError`, which is caught on the main thread path. The worker path uses `checkJsonDepth` as a pre-flight.
**Suggestion**: The worker should catch RangeError from its own `JSON.parse` as a fallback safety net. Currently it crashes the worker if nesting is deep past the 10MB mark.

### 4. WebWorker script loaded from public directory — LOW risk, HIGH confidence
**File**: `src/lib/parser.ts:256`, `public/workers/trackParser.worker.js`
**Issue**: The worker is loaded via `new Worker(\`${basePath}/workers/trackParser.worker.js\`)`. The CSP allows `worker-src 'self' blob:` which covers this. The worker receives an ArrayBuffer via `postMessage` with transfer, which is safe.
**Suggestion**: No change needed.

### 5. File extension validation is client-side only — LOW risk, HIGH confidence
**File**: `src/components/FileUpload.tsx:21`, `src/lib/parser.ts:340-352`
**Issue**: File type validation checks extension only (`.gpx`, `.kml`, `.json`). A file named `malicious.json` with arbitrary content would be parsed as JSON. Since parsing is client-side and the output is a Track object (not rendered as HTML), the risk is limited to parser bugs causing crashes or excessive memory use.
**Suggestion**: The file size limits (4MB XML, 100MB JSON) and point budget (250K) effectively bound the attack surface.

### 6. No secrets in client code — LOW risk, HIGH confidence
**File**: entire codebase
**Issue**: No API keys, tokens, or secrets found. Map tiles are bundled locally. No external network requests during normal operation.
**Suggestion**: None needed.

### 7. Frame-busting bootstrap script — LOW risk, HIGH confidence
**File**: `src/app/layout.tsx:53,58`
**Issue**: The bootstrap script contains a frame-buster (`window.top !== window.self`). It uses try/catch to handle cross-origin frame access. The CSP hash-based approach ensures only the known script runs.
**Suggestion**: None needed — well-implemented.

### 8. localStorage access is try-caught — LOW risk, HIGH confidence
**Files**: Multiple (page.tsx, interpolate.ts, i18n.ts)
**Issue**: All localStorage access is wrapped in try/catch for Safari private browsing compatibility. This is consistently applied throughout.
**Suggestion**: None needed.

### 9. sanitizeInput not needed — N/A
**File**: `src/lib/videoEncoder.ts:180-186`
**Issue**: The video filename sanitization at line 180 uses NFKC normalization and strips dangerous characters. This is used for the download filename, not for HTML rendering. The sanitization is appropriate for its use case.
**Suggestion**: None needed.

### 10. Dynamic import of mediabunny — LOW risk, HIGH confidence
**File**: `src/lib/videoEncoder.ts:89`
**Issue**: `mediabunny` is dynamically imported to avoid loading WebCodecs code on initial page load. Since it's a bundled dependency, this is safe. The CSP `connect-src 'self'` prevents loading from external CDN.
**Suggestion**: None needed.

## Overall Assessment

The application has a strong security posture for its architecture (client-side static). The CSP hardening pipeline, XML parsing guards, file size limits, and point budgets create multiple layers of defense. No critical or high-severity issues found.