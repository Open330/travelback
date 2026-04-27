# Security Reviewer — Cycle 2 (2026-04-27)

## Re-evaluation of carried findings

| Prior | Status | Notes |
|-------|--------|-------|
| N04 (duplicated Google parser) | UNCHANGED | Worker and main-thread parsers remain separate. A fix in one path may not be applied to the other. |
| N14 (export memory guard) | UNCHANGED | No mobile-specific memory cap. |
| N28 (path traversal in normalizeBasePath) | RESOLVED | `normalizeBasePath` now rejects `..` (env.ts:5). Defense-in-depth satisfied. |
| N07 (normalizeBasePath triplication) | PARTIALLY RESOLVED | parser.ts now imports from env.ts. types.ts may still have a duplicate. |

## New findings

### SEC2-01 — `stripXmlEntities` is redundant with `preflightXml` DOCTYPE/ENTITY rejection

- **Severity:** INFO
- **Confidence:** High
- **Files:** `src/lib/parser.ts:155-160,162-165`
- **Detail:** `preflightXml` (line 162) rejects files containing DOCTYPE/ENTITY with a `ParseError` before `stripXmlEntities` is called (line 190). Since `preflightXml` runs first and throws, `stripXmlEntities` is never reached for files containing these declarations. The function is dead code in the current flow.
- **Impact:** No security risk — redundant defense-in-depth. Could be removed for clarity or kept as a safety net.

### SEC2-02 — CSP `style-src-attr 'unsafe-inline'` allows inline style injection via DOM manipulation

- **Severity:** LOW
- **Confidence:** High
- **Files:** `scripts/harden-static-export.mjs:24`
- **Detail:** The CSP allows `'unsafe-inline'` for `style-src-attr` but restricts `style-src` and `style-src-elem` to `'self'`. An XSS that achieves DOM manipulation could set inline `style` attributes (e.g., `style="position:fixed;inset:0;z-index:9999"` for clickjacking). However, without an XSS vector (blocked by `script-src` hashes), this is not directly exploitable.
- **Impact:** Low — requires a script injection vector that CSP already prevents.

### SEC2-03 — `parseSemanticPoint` regex accepts `geo:` URIs with trailing parameters that could contain data exfiltration attempts

- **Severity:** INFO
- **Confidence:** Low
- **Files:** `src/lib/parser.ts:370-377`
- **Detail:** The regex `geo:\s*...(?:[;?].*)?\s*$` allows arbitrary trailing parameters after coordinates. These parameters are discarded after the regex match. No data is sent anywhere. This is a parsing flexibility, not a security issue.
- **Impact:** None — coordinates are validated and parameters are discarded.

## Summary

- Carried forward: 4 findings evaluated (1 resolved, 1 partially resolved, 2 unchanged)
- New findings: 3 (1 INFO, 1 LOW, 1 INFO)
