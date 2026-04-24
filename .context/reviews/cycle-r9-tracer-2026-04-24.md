# Tracer — Cycle r9 (2026-04-24)

## Causal Tracing of Suspicious Flows

### Trace 1: FileUpload error handling flow

**Path:** User drops file -> `handleDrop` -> `handleFile` -> `parseTrackFile` -> error -> `catch` block

1. `handleDrop` (line 95-109): Validates extension, calls `handleFile`
2. `handleFile` (line 52-93): Calls `parseTrackFile`, catches errors
3. Error handler (line 61-86):
   - Gets `code` from `ParseError` or empty string
   - Gets `message` from `Error` or empty string
   - `matchedKey = code && code in errorCodeMap ? code : ''` — holds the **code**, not the i18n key
   - `isFileTooLarge = code === 'FILE_TOO_LARGE'`
   - `isSafe = !!matchedKey || isFileTooLarge`
   - If `matchedKey` is truthy, calls `t(errorCodeMap[matchedKey])` — this correctly does a double lookup (code -> i18n key -> translated string)
   - If `isFileTooLarge`, uses `message` directly
   - Otherwise, generic "parse failed" message

**Hypothesis 1:** The `matchedKey` variable holding a code instead of a key could lead to an incorrect `t()` call if someone assumes `matchedKey` is already the i18n key.
- **Verdict:** CONFIRMED as a maintainability risk (C9-CR-001), but not a current bug.

**Hypothesis 2:** What if a non-ParseError error has a `code` property that matches a key in `errorCodeMap`?
- **Analysis:** Line 73: `const code = err instanceof ParseError ? err.code : ''` — only ParseError instances have their code checked. Non-ParseError errors always get `code = ''`. This is correct.

### Trace 2: Export abort flow

**Path:** User clicks Cancel -> `cancelExport` -> `exportAbortRef.current.abort()` -> AbortController.abort()

1. In `useExportController.ts:80-82`: `cancelExport` calls `exportAbortRef.current?.abort()`
2. In `videoEncoder.ts:94-96`: The frame loop checks `signal?.aborted` at the top of each iteration
3. In `videoEncoder.ts:112-114`: Also checks after `renderFrame` callback
4. In `useExportController.ts:167-168`: The catch block handles `AbortError` specifically

**Hypothesis:** Race condition between abort and finalize.
- **Analysis:** The `completed` flag in `videoEncoder.ts:89,134` ensures `finalize()` is only called when the loop completes normally. On abort, `completed` remains `false`, so `finalize()` is skipped in the `finally` block. This is correct.

### Trace 3: ModalDialog focus trap with export overlay

**Path:** Export starts -> overlay dialog shown -> Escape key pressed

1. `page.tsx:141-155`: Adds `keydown` listener for Escape when `isExporting` is true
2. `ModalDialog.tsx:109-118`: Also handles Escape key
3. Both try to handle the same Escape keypress

**Hypothesis:** Double-handling of Escape could cause double-cancel or unexpected behavior.
- **Analysis:** The export overlay in `page.tsx` is NOT a `ModalDialog` — it's a plain `<div role="dialog">`. The `useEffect` in `page.tsx` uses `capture: true` (via `addEventListener('keydown', onKeyDown, true)`) and calls `event.stopPropagation()`. This means the capture-phase listener in `page.tsx` fires first and stops propagation before `ModalDialog`'s bubble-phase listener can fire. However, there's a subtle issue: when the `ExportPanel` (which IS a `ModalDialog`) is open and the user starts exporting, both the `ExportPanel` ModalDialog AND the export overlay are present. The capture-phase listener in `page.tsx` correctly intercepts Escape first and calls `cancelExport()`, which sets `isExporting` to false, which removes the overlay. The ModalDialog's Escape handler is never reached because of `stopPropagation()`.

**Verdict:** This flow works correctly. The capture-phase listener takes priority, and the design is intentional.

### Findings

- No new bugs found through causal tracing
- C9-CR-001 confirmed as a maintainability issue (not a functional bug)

## Summary

- 0 new findings
- 3 flows traced, all correct
- Maintainability risk confirmed (C9-CR-001)
