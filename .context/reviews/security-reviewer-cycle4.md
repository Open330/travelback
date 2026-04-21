# Security Reviewer -- Cycle 4 (2026-04-21)

## Summary
Security posture is strong. CSP is properly hardened post-build. Frame-busting is in place. Found 2 new findings and 1 carried item.

## Findings

### S4-001: Residual CSP allows inline styles [HIGH] (Carried: DF-C2-009)
- **File:** `src/app/layout.tsx` line 62
- **Issue:** The dev CSP includes `style-src 'self' 'unsafe-inline'`. The harden script replaces this post-build, but the source template still has `'unsafe-inline'` for styles. If the harden script is skipped or fails, inline styles are allowed in production.
- **Impact:** Inline styles are used extensively via React's `style` prop throughout the app (100+ instances). Removing `'unsafe-inline'` for styles would require converting all inline styles to CSS classes or using nonce-based CSP, which is a significant refactoring effort.
- **Status:** Already deferred as DF-C2-009. The harden script is the current mitigation.

### S4-002: `showSaveFilePicker` typed via `window as unknown as` cast [MEDIUM]
- **File:** `src/lib/videoEncoder.ts` lines 175-181
- **Issue:** The `showSaveFilePicker` API is accessed via `window as unknown as { showSaveFilePicker: ... }`. This bypasses TypeScript's type checking for the API. While the API is used correctly and guarded by `'showSaveFilePicker' in window`, the double cast is a code smell.
- **Impact:** No security vulnerability. The cast is safe because the API is feature-detected before use. But a cleaner approach would be a type declaration file.

### S4-003: DOMParser for XML parsing could be vulnerable to XXE in some environments [LOW]
- **File:** `src/lib/parser.ts` lines 98-108
- **Issue:** `stripXmlEntities` removes DOCTYPE and ENTITY declarations before parsing. This is a defense against XML External Entity (XXE) attacks. However, the regex-based stripping (`/<!DOCTYPE[\s\S]*?>/gi`) could be bypassed with nested or malformed DOCTYPE declarations. Modern browsers' DOMParser does not resolve external entities by default, making this a defense-in-depth measure.
- **Impact:** Very low. Browser DOMParser doesn't resolve external entities. The regex stripping is defense-in-depth and works for all practical cases.

### S4-004: Bootstrap script uses `dangerouslySetInnerHTML` [MEDIUM] (Known, mitigated)
- **File:** `src/app/layout.tsx` line 54
- **Issue:** The bootstrap script is injected via `dangerouslySetInnerHTML`. This is required for a blocking `<script>` in the `<head>` to prevent FOUC. The script content is static (no user input) and is hashed by the post-build CSP hardening script.
- **Impact:** Mitigated. The script is static and CSP-hashed in production.

## Positive Observations
- Frame-busting in bootstrap script prevents clickjacking
- `frame-ancestors 'none'` in CSP is a strong clickjacking defense
- `base-uri 'none'` prevents base tag injection
- `object-src 'none'` prevents Flash/plugin-based attacks
- File size limits prevent DoS via large file uploads
- JSON depth checking prevents deeply-nested JSON attacks
- `ParseError` with error codes avoids leaking internal details to users
- Track name sanitization in videoEncoder prevents path traversal in filenames
