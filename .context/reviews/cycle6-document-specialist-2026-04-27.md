# Document Specialist — Cycle 6 (2026-04-27)

## Files reviewed
All source files, `scripts/harden-static-export.mjs`, `.context/project/02-architecture.md`, `README.md`.

## Findings

### DS6-01 — `renderFrameAndWait` JSDoc comment claims trail/marker are updated but they are not

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/components/MapView.tsx:999`
- The comment "During export, camera/trail/marker updates are handled by renderFrameAndWait" is factually incorrect. `renderFrameAndWait` only updates the camera. This misleading documentation could cause future developers to assume the export path is correct when it is not.
- **Suggested fix:** Update the comment to accurately describe what `renderFrameAndWait` does (camera only), and document the need for a separate trail/marker update path during export.

### DS6-02 — `harden-static-export.mjs` lacks inline rationale for the bootstrap inlining regex

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `scripts/harden-static-export.mjs:75`
- The regex at line 75 is complex and tightly coupled to Next.js's output format, but has no comments explaining its structure, expected input, or failure modes. The CF5-20 finding (add JSDoc comments) was partially addressed for the CSP injection but not for the bootstrap inlining regex.
- **Suggested fix:** Add comments explaining: (a) what the regex matches, (b) the expected Next.js output format, (c) what happens if the format changes, (d) why inlining is necessary (CSP hash computation).

### DS6-03 — `README.md` may not reflect current export capabilities

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `README.md`
- The README describes the export feature but may not reflect the current codec support (H.264/H.265/AV1) or the resolution presets. Need to verify against the current `ExportPanel.tsx` and `types.ts`.
- **Suggested fix:** Verify README export section matches current code and update if needed.
