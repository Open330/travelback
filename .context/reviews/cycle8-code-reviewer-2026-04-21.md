# Cycle 8 Code Review -- 2026-04-21

## Scope
Full source review: src/app/page.tsx, src/components/*.tsx, src/lib/*.ts, src/styles/*.css

## Prior Fix Verification
All prior cycle fixes confirmed still applied:
- C7: TimelineSelector dragMovedRef (line 65, 165, 215-219)
- C7: Focus-visible outline for range inputs (globals.css:113-116)
- C7: Architecture doc TrackWorkspace children
- C7: Export time "approx" qualifier in i18n
- C6: MapView eslint-disable line reference
- C5: playback dt capping, parser worker buffer fallback, map resize reset
- C4: render-phase ref mutation fixes, NaN guards, hotkey suppression
- Earlier: MapLibre CSS specificity, dark mode vars, GoogleGuide tabpanel, etc.

## New Findings

### C8-CR-1: FileUpload error fallback relies on English message text [LOW]

- **File:** src/components/FileUpload.tsx:63
- **Issue:** Line 49 comment states "Map parser error codes to i18n keys (avoids relying on English message text)", but line 63 uses `message.includes('File is too large')` as a fallback. While `FILE_TOO_LARGE` is handled via error code on the same line, the `message.includes()` fallback contradicts the stated design principle and would break if parser error messages were ever changed or internationalized.
- **Fix:** Remove the `message.includes('File is too large')` fallback. The `code === 'FILE_TOO_LARGE'` check is sufficient since ParseError always sets a code. If the error isn't a ParseError with FILE_TOO_LARGE code, it should fall through to the generic `t('fileUpload.parseFailed')` handler, which is the correct i18n-safe behavior.
- **Confidence:** MEDIUM

### No Other New Findings

All useEffect cleanups are correct. No `as any` or `ts-ignore` usage. No unguarded state-after-unmount patterns (mountedRef in useExportController, cleanup in SceneEditor timer). All eslint-disable comments have explanatory annotations. The codebase has clearly converged.
