# Cycle 4 Security Reviewer — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Methodology
Reviewed all source files for security issues: OWASP top 10, secrets, unsafe patterns, injection vectors, and auth/authz concerns.

## Findings

### C4-SR01 — Worker URL constructed from `basePath` without validation
- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:618`
- **Detail:** `new Worker(\`${basePath}/workers/trackParser.worker.js\`)` — the `basePath` comes from `process.env.NEXT_PUBLIC_BASE_PATH` via `normalizeBasePath` which rejects `..` path traversal. However, if the environment variable were compromised at build time, the worker URL could point to an arbitrary origin. In the static export context, `basePath` is a fixed build-time constant, so runtime manipulation is not possible.
- **Suggested fix:** No fix needed — `normalizeBasePath` already rejects `..` and the value is a build-time constant. Defense-in-depth is adequate.

### C4-SR02 — `stripXmlEntities` removes DOCTYPE/ENTITY declarations after `preflightXml` check
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/parser.ts:155-165, 188-195`
- **Detail:** `parseXml` first calls `preflightXml` which rejects DOCTYPE/ENTITY, then calls `stripXmlEntities` to remove any remaining entity-like patterns. The strip function uses regex that matches `<!DOCTYPE...>]>` and `<!DOCTYPE...>` and `<!ENTITY...>`. Since `preflightXml` already throws on DOCTYPE/ENTITY, the strip function is defense-in-depth. However, the regex patterns are not anchored and could match partial content in CDATA sections or comments. Since the preflight already rejects, this is harmless.
- **Suggested fix:** Already confirmed as defense-in-depth (C3-33 from prior cycle). No change needed.

### C4-SR03 — `debugWindow.__travelbackDebug` exposed on localhost
- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:714-753`
- **Detail:** Debug camera state is exposed on `window.__travelbackDebug` when running on localhost with the appropriate localStorage flag or URL parameter. This is gated by `process.env.NODE_ENV === 'development'` OR localhost + explicit opt-in. In production builds deployed to GitHub Pages, this code path is unreachable since the hostname check fails.
- **Suggested fix:** No fix needed — adequate gating. Could consider stripping the entire debug block in production builds via dead code elimination.

### C4-SR04 — `downloadVideo` uses `fetch(url)` from object URL as fallback
- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/videoEncoder.ts:213`
- **Detail:** When `blob` is not passed to `downloadVideo`, it falls back to `await (await fetch(url)).blob()`. The `url` is an object URL created by the same code. This fetch is safe (same-origin blob URL), but it represents an unnecessary network hop through the fetch API.
- **Suggested fix:** Make `blob` a required parameter. Currently the caller always provides it.

### C4-SR05 — No Content-Security-Policy for `worker-src`
- **Severity:** LOW
- **Confidence:** Low
- **Files:** `scripts/harden-static-export.mjs`
- **Detail:** The CSP hardening script adds `script-src` and `style-src` directives but may not include an explicit `worker-src` directive. Web Workers are controlled by `child-src` (deprecated) or `worker-src` in CSP. Without an explicit `worker-src`, the browser falls back to `script-src`, which should allow same-origin workers. Since the worker script is a bundled static asset, this should work. However, explicit `worker-src 'self'` would be more precise.
- **Suggested fix:** Add `worker-src 'self'` to the CSP if not already present. Low priority since `script-src 'self'` covers it.

### C4-SR06 — `parseSemanticPoint` regex could be exploited for ReDoS
- **Severity:** LOW
- **Confidence:** Low
- **Files:** `src/lib/parser.ts:371`
- **Detail:** The regex `/^\s*geo:\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:[;?].*)?\s*$/i` has no catastrophic backtracking patterns. The alternation `\d+(?:\.\d+)?|\.\d+` is unambiguous (starts with digit vs starts with dot). The input is controlled (comes from parsed JSON within the app), so external ReDoS is not a threat.
- **Suggested fix:** No fix needed.

## Summary
| Severity | Count |
|----------|-------|
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 5 |
| **Total** | **6** |
