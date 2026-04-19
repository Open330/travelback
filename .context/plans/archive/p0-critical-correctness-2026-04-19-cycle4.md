# P0 Critical Correctness Fixes — Cycle 4 (2026-04-19)

**Priority:** P0 — misleading error messages that give users incorrect information about file size limits
**Source:** comprehensive-deep-code-review-2026-04-19-cycle4 (NEW-C4-1, NEW-C4-2)
**Estimated effort:** 15-20 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C4-1 | Worker error message says "200MB" but `MAX_MESSAGE_SIZE` is 500MB | HIGH | `public/workers/trackParser.worker.js:263` |
| NEW-C4-2 | i18n strings say "max 200 MB" but JSON limit is 500MB | HIGH | `src/lib/i18n.ts`, `src/components/FileUpload.tsx` |

---

## Implementation steps

### 1. Fix worker error message to reflect actual 500MB limit (NEW-C4-1)

**File:** `public/workers/trackParser.worker.js:263`

**Current:**
```js
throw new Error('Input too large: exceeds 200MB limit')
```

**Fix:** Update to match the actual `MAX_MESSAGE_SIZE` constant (500MB):
```js
throw new Error('Input too large: exceeds 500MB limit')
```

**Verification:** Upload a JSON file > 500MB. Confirm the error message says "500MB".

---

### 2. Make file size limit dynamic in i18n and FileUpload (NEW-C4-2)

**File:** `src/components/FileUpload.tsx:39-41`, `src/lib/i18n.ts` (5 locale entries)

**Current:** `FileUpload.tsx` uses `maxForType` for the actual size check but shows a hardcoded "200 MB" string from i18n on error. The parser's `FILE_TOO_LARGE` error includes a correct dynamic message, but `FileUpload.tsx` replaces it with the generic (wrong-for-JSON) i18n string.

**Fix approach:** In `FileUpload.tsx`, when the pre-upload size check fails, construct the error message dynamically instead of using the hardcoded i18n string. For the parser's `FILE_TOO_LARGE` catch path, use the parser's own message (which is already dynamic and correct).

In `FileUpload.tsx`, change the pre-check error:
```ts
// Before:
if (file.size > maxForType) {
  throw new Error(t('fileUpload.fileTooLarge'))
}

// After:
if (file.size > maxForType) {
  throw new Error(t('fileUpload.fileTooLargeDynamic').replace('{max}', String(Math.round(maxForType / 1024 / 1024))))
}
```

In `src/lib/i18n.ts`, add a new key `fileUpload.fileTooLargeDynamic` to all 5 locales:
- en: `'File is too large (max {max} MB)'`
- ko: `'파일이 너무 큽니다 (최대 {max} MB)'`
- ja: `'ファイルが大きすぎます（最大{max}MB）'`
- zh: `'文件过大（最大 {max} MB）'`
- es: `'El archivo es demasiado grande (máx. {max} MB)'`

Also update the `FILE_TOO_LARGE` catch path in `FileUpload.tsx:60-66`. The parser already produces a correct dynamic message (`File is too large (600MB). Maximum size is 500MB.`), so when catching `FILE_TOO_LARGE`, use that message directly instead of the i18n string.

The old `fileUpload.fileTooLarge` key can be kept for backward compatibility or removed if no other references exist.

**Verification:**
- Upload a 600MB JSON file via FileUpload. Confirm error says "500 MB" (not "200 MB").
- Upload a 250MB GPX file. Confirm error says "200 MB" (GPX/KML limit).
- Confirm parser-thrown `FILE_TOO_LARGE` errors also show the correct limit.

---

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] Worker error message reflects 500MB limit (NEW-C4-1)
- [ ] FileUpload shows correct size limit based on file type (NEW-C4-2)
- [ ] All 5 locale strings are updated with `{max}` placeholder
