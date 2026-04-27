# Security Reviewer — Cycle 6 (2026-04-27)

## Files reviewed
All source files, `scripts/harden-static-export.mjs`, `public/workers/trackParser.worker.js`.

## Findings

### S6-01 — Debug camera API still exposed in production via URL parameter/localStorage (CF5-06 partially fixed)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:717-720`
- The condition `process.env.NODE_ENV === 'development' || debugParams.get('__travelbackDebug') === '1'` allows the debug API to be exposed in production builds. The `debugStorageEnabled` check (localStorage `travelback-debug`) was removed since cycle 5, but the URL parameter escape hatch remains.
- **Failure scenario:** Attacker with access to a user's browser (via XSS or physical access) appends `?__travelbackDebug=1` to the URL. The `window.__travelbackDebug` API is exposed, leaking map camera state (which can reveal user location).
- **Suggested fix:** Remove the `|| debugParams.get('__travelbackDebug') === '1'` clause entirely. If debug access is needed in production, it should require a separate build-time flag.

### S6-02 — Worker message not validated before accessing properties

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:643-673`
- The worker `onmessage` handler accesses `event.data.error`, `event.data.track`, and `event.data.code` without validating the message structure. A buggy or compromised worker could send unexpected data shapes.
- **Failure scenario:** Worker sends `{ error: undefined, track: undefined }` (neither error nor track). The handler falls into the `!event.data.track` branch and attempts main-thread fallback, which may succeed or fail silently. No explicit validation or logging.
- **Suggested fix:** Add runtime type checks for the worker message shape: verify that `error` is a string (if present) and `track` has the expected structure.

### S6-03 — `harden-static-export.mjs` regex for bootstrap inlining is fragile

- **Severity:** LOW-MEDIUM
- **Confidence:** Medium
- **Files:** `scripts/harden-static-export.mjs:75`
- The regex `/<script>\(self\.__next_s=self\.__next_s\|\|\[\]\)\.push\(\[0,(\{"children":"(?:\\.|[^"\\])*","id":"travelback-bootstrap"\})\]\)<\/script>/i` is tightly coupled to Next.js's output format. If Next.js changes how it serializes inline scripts (e.g., adding whitespace, changing attribute order, using different encoding), the regex will silently fail to match. The error on line 89 catches this case, but only if the bootstrap id is present in the HTML.
- **Failure scenario:** Next.js update changes the script output format. The regex fails to match. The `hasBootstrap && !replaced` check throws, breaking the build. While this is caught at build time, the error message doesn't explain the regex failure clearly.
- **Suggested fix:** Add a comment explaining the regex's expected format, and consider a more robust parsing approach (e.g., using an HTML parser instead of regex).
