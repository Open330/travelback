# Security Reviewer — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: security-reviewer

## Findings

### S5-01 — Debug camera API exposed on `window.__travelbackDebug` without same-origin verification
- **Severity:** MEDIUM
- **Confidence:** High
- **File:** `src/components/MapView.tsx:704-743`
- **Description:** The debug camera API (`__travelbackDebug`) is exposed on the `window` object when: (1) `NODE_ENV === 'development'`, OR (2) the hostname is localhost/127.0.0.1 AND either a URL parameter or localStorage flag is set. Condition (2) means that in production builds, any page running on localhost with `?__travelbackDebug=1` or `localStorage.travelback-debug=1` exposes the debug API. This is accessible to any same-origin script, including third-party scripts loaded by the page or browser extensions.
- **Failure scenario:** A malicious browser extension or injected script on a localhost development server reads `window.__travelbackDebug.getCamera()` to extract user location data from the map state. While this requires same-origin access, it expands the attack surface beyond what's necessary.
- **Suggested fix:** Restrict debug API exposure to `NODE_ENV === 'development'` only. Remove the localStorage/URL-parameter production escape hatch. If production debugging is needed, require an explicit opt-in via a more secure mechanism (e.g., a dedicated debug build).

---

### S5-02 — `checkJsonDepth` depth counter can go negative on malformed JSON
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/lib/parser.ts:508-525`
- **Description:** The `checkJsonDepth` function decrements `depth` on `}` and `]` characters. If the JSON string has more closing brackets than opening ones, `depth` goes negative. While this doesn't cause a security vulnerability (the function only checks `depth > maxDepth`), it means malformed JSON with excessive closing brackets could pass the depth check when it shouldn't, and the subsequent `JSON.parse` would still fail but with a less-specific error message.
- **Failure scenario:** A crafted JSON file with `}}}}}}}}}}` prefixes passes the depth check but then fails at `JSON.parse` with a generic error instead of the more helpful "JSON nesting depth exceeds limit" error code.
- **Suggested fix:** Add `if (depth < 0) throw new ParseError('Invalid JSON structure', 'INVALID_GOOGLE_JSON')` after the depth decrement.

---

### S5-03 — `stripXmlEntities` runs after `preflightXml` rejects DOCTYPE/ENTITY, creating dead code
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/lib/parser.ts:155-195`
- **Description:** `parseXml` calls `preflightXml` which throws on DOCTYPE/ENTITY presence, then calls `stripXmlEntities` on the same text. Since `preflightXml` already rejected the input if it contains DOCTYPE/ENTITY, `stripXmlEntities` is dead code in the normal path. It only executes if `preflightXml` passes (no DOCTYPE/ENTITY found) — but then there's nothing to strip. This creates a false sense of defense-in-depth.
- **Failure scenario:** A developer sees `stripXmlEntities` and assumes it provides XXE protection, not realizing that `preflightXml` already blocks the input. If `preflightXml`'s regex is bypassed by a novel entity encoding, `stripXmlEntities` would also be bypassed since it uses the same pattern.
- **Suggested fix:** Either make `stripXmlEntities` the primary defense (run it BEFORE `preflightXml`) and have `preflightXml` as a redundant check, or remove `stripXmlEntities` and document that `preflightXml` is the sole XXE guard.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| S5-01 | MEDIUM | High | MapView.tsx |
| S5-02 | LOW | High | parser.ts |
| S5-03 | LOW | High | parser.ts |

The codebase maintains strong security posture overall. The XML parser has proper XXE guards, the JSON parser has depth limits and file size caps, and the export controller properly handles AbortController cleanup. The main new finding (S5-01) is about an overly broad debug API exposure condition.
