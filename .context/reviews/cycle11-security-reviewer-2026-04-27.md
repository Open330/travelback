# Cycle 11 Security Reviewer — 2026-04-27

## Inventory of reviewed files

- `src/lib/parser.ts` — full read (XML/JSON parsing, XXE defenses)
- `src/lib/env.ts` — full read (basePath normalization)
- `scripts/harden-static-export.mjs` — full read (CSP, bootstrap rewrite)
- `src/lib/videoEncoder.ts` — full read
- `src/lib/test-stub.ts` — full read
- `src/lib/useExportController.ts` — full read

## Findings

### SEC11-01 — `stripXmlEntities` runs before `preflightXml`, defeating DOCTYPE rejection (CONFIRMED, same as C11-01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:155-165,188-198`
- **Detail:** The defense-in-depth model is `stripXmlEntities` -> `preflightXml` -> `DOMParser`. However, `preflightXml` checks for `<!DOCTYPE|<!ENTITY` in the *already-stripped* text, so the rejection guard is dead code for simple DOCTYPE declarations without `]>`. The stripping removes the DOCTYPE, then the preflight check finds nothing to reject. The security posture is "strip and accept" instead of "reject DOCTYPE entirely."
- **Failure scenario:** An XML document with `<!DOCTYPE foo SYSTEM "http://attacker.com/dtd">` would have its DOCTYPE stripped, then be parsed. The external entity reference is removed so no XXE, but the document's DTD-based validation semantics are silently altered. The current behavior is safe against XXE (entities are stripped) but does not meet the stated "reject DOCTYPE" policy.
- **Suggested fix:** Run `preflightXml` on the raw text *before* `stripXmlEntities` to enforce "no DOCTYPE allowed" policy. Keep `stripXmlEntities` as defense-in-depth after the rejection check.

---

### SEC11-02 — `checkJsonDepth` has a unicode escape edge case

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/lib/parser.ts:511-529`
- **Detail:** The `checkJsonDepth` function handles `\"` and `\\` escapes but not `\uXXXX` unicode escapes. A JSON string like `"abc"def"` contains an escaped quote that the function would not recognize as being inside a string (since it only tracks `\"` as an escape). However, `"` is equivalent to `"` in JSON — if it appears outside a string context, `JSON.parse` would fail anyway, and if inside a string, the function correctly tracks string state via the preceding `"`.
- **Failure scenario:** The depth counter could be thrown off by `{` (which is `{`) inside a JSON string — the function would see `{` as a depth increase even though it's inside a string. This could cause false-positive `JSON_DEPTH_EXCEEDED` errors on deeply nested but valid JSON with unicode-escaped braces in strings.
- **Suggested fix:** Add unicode escape handling: after `\\u`, skip 4 more characters. This is a low-priority fix since the main-thread path doesn't call `checkJsonDepth` (only the worker does), and the 64-depth limit is generous.
