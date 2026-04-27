# Document Specialist — Cycle 5 (2026-04-27)

Repository: `/Users/hletrd/flash-shared/Travelback`
Reviewer: document-specialist

## Findings

### DS5-01 — `harden-static-export.mjs` has no inline documentation of its security rationale
- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **File:** `scripts/harden-static-export.mjs`
- **Description:** The hardening script performs critical security transformations (CSP injection, bootstrap script rewriting, SRI hash computation) but has minimal inline documentation explaining WHY each step is necessary and what would happen if it were removed. A future contributor could accidentally weaken or remove a hardening step without understanding its security purpose.
- **Failure scenario:** A contributor removes the CSP injection step thinking it's redundant with the `next.config.ts` headers. The static export no longer has CSP protection when served from GitHub Pages, which doesn't support custom headers.
- **Suggested fix:** Add JSDoc comments to each major function explaining: (1) what security property it enforces, (2) what would break if removed, (3) which deployment target requires it.

---

### DS5-02 — `checkJsonDepth` function is documented as "exported for worker" but the worker file doesn't import it
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/lib/parser.ts:504-525`, `public/workers/trackParser.worker.js`
- **Description:** The comment at line 504-507 says `checkJsonDepth` is "Exported for use by the Web Worker path" and that "the worker cannot recover from a RangeError (it crashes the process), so it uses this pre-flight check instead." However, examining `public/workers/trackParser.worker.js`, the worker does NOT import `checkJsonDepth` from the parser module — it has its own inline depth check. The exported function is only used on the main thread (where it's redundant with `JSON.parse`'s RangeError). The doc comment is misleading.
- **Failure scenario:** A developer reads the comment and assumes the worker uses the shared `checkJsonDepth` function. They fix a bug in the exported function, expecting it to also fix the worker path. But the worker has its own copy that remains unfixed.
- **Suggested fix:** Either update the comment to reflect that the worker has its own depth check (and the export is for external consumers), or refactor the worker to actually import the shared function.

---

### DS5-03 — `parseTrackFile` JSDoc missing — it's the primary public API of the parser module
- **Severity:** LOW
- **Confidence:** High
- **File:** `src/lib/parser.ts:694-753`
- **Description:** `parseTrackFile` is the main entry point for file parsing, yet it has no JSDoc comment. It handles file size limits, format detection, Web Worker delegation, and final track validation. A developer using this function for the first time must read the entire implementation to understand its behavior, error modes, and return type.
- **Failure scenario:** A developer adds a new file format and calls `parseTrackFile` without realizing it also validates point count and rejects tracks with <2 points. They add their own duplicate validation.
- **Suggested fix:** Add a JSDoc comment describing: (1) supported formats, (2) file size limits, (3) error codes that can be thrown, (4) the worker fallback behavior.

---

## Summary

| ID | Severity | Confidence | File |
|----|----------|------------|------|
| DS5-01 | LOW-MEDIUM | High | harden-static-export.mjs |
| DS5-02 | LOW | High | parser.ts |
| DS5-03 | LOW | High | parser.ts |
