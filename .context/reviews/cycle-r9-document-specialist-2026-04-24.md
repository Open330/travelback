# Document Specialist — Cycle r9 (2026-04-24)

## Documentation-Code Mismatch Analysis

### Inline Comments vs Code

1. **FileUpload.tsx:62** — Comment says "Map parser error codes to i18n keys (avoids relying on English message text)" — code correctly maps codes to i18n keys. The `matchedKey` variable name is misleading (it holds the code, not the key), but the comment accurately describes the intent. No documentation-code mismatch.

2. **MapView.tsx:552-558** — Comment about `preserveDrawingBuffer: true` accurately describes the trade-off (performance cost vs export capability). No mismatch.

3. **ExportPanel.tsx:30-31** — Comment about `initialCodecSupport` being "scoped to component state" is slightly misleading — the const is module-level, but it's only used as the initial value for `useState`, so it's effectively read-only from the component's perspective. The comment's intent is to explain why it's not a module-level cache (which was the old design). No functional mismatch.

### Code Comments Review

- All `eslint-disable-next-line` comments include explanations — good practice.
- The `eslint-disable-next-line react-hooks/exhaustive-deps` comments are well-documented with reasoning.
- The `eslint-disable-next-line react-hooks/set-state-in-effect` comment in ExportPanel:70 includes an explanation.

### Findings

No documentation-code mismatches found.

## Summary

- 0 new findings
- Documentation is accurate and well-maintained
