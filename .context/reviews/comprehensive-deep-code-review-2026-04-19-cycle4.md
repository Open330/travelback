# Comprehensive Deep Code Review - Cycle 4

**Date:** 2026-04-19
**Reviewer:** Automated review cycle 4/100
**Scope:** Full source tree (`src/`, `public/`, `scripts/`, `e2e/`)

## Previous Cycle Verification

All 5 findings from cycle 3 have been verified as fixed or partially fixed:

| ID | Finding | Status |
|----|---------|--------|
| NEW-C3-1 | Worker `MAX_MESSAGE_SIZE` (200MB) inconsistent with `JSON_MAX_FILE_SIZE` (500MB) | PARTIALLY FIXED -- constant raised to 500MB but error message string not updated (see NEW-C4-1) |
| NEW-C3-2 | `FileUpload.tsx` duplicated `MAX_FILE_SIZE`/`JSON_MAX_FILE_SIZE` constants | FIXED -- now imports from `parser.ts` |
| NEW-C3-3 | `checkJsonDepth` spot-checks used stale `depth` instead of `baseDepth` | FIXED -- both main-thread and worker now use `baseDepth` |
| NEW-C3-4 | `commitScenes` generated warnings from un-normalized scenes | FIXED -- normalizes first, then generates warnings from normalized result |
| NEW-C3-5 | 200ms `setTimeout` before `waitForIdle` in export | FIXED -- removed, now directly calls `waitForIdle` after resize |

## New Findings

### NEW-C4-1: Worker error message says "200MB" but `MAX_MESSAGE_SIZE` is 500MB

**Severity:** HIGH
**File:** `public/workers/trackParser.worker.js:263`
**Category:** Correctness / Misleading error

**Description:**
When the NEW-C3-1 fix raised `MAX_MESSAGE_SIZE` from 200MB to 500MB in the worker, the error message on line 263 was not updated. It still reads:

```javascript
throw new Error('Input too large: exceeds 200MB limit')
```

But the actual limit is now 500MB:

```javascript
const MAX_MESSAGE_SIZE = 500 * 1024 * 1024 // 500MB
```

Users who hit the 500MB limit will see a confusing error saying "200MB limit", leading them to believe the limit is lower than it actually is.

**Fix:** Change line 263 to `throw new Error('Input too large: exceeds 500MB limit')`

---

### NEW-C4-2: i18n `fileUpload.fileTooLarge` says "max 200 MB" in all locales, but JSON limit is 500MB

**Severity:** HIGH
**Files:**
- `src/lib/i18n.ts:27` (en)
- `src/lib/i18n.ts:357` (ko)
- `src/lib/i18n.ts:687` (ja)
- `src/lib/i18n.ts:1017` (zh)
- `src/lib/i18n.ts:1347` (es)
- `src/components/FileUpload.tsx:39-41`

**Category:** Correctness / Misleading error

**Description:**
All 5 locale strings for `fileUpload.fileTooLarge` contain a hardcoded "200 MB" limit:

| Locale | String |
|--------|--------|
| en | `File is too large (max 200 MB)` |
| ko | `파일이 너무 큽니다 (최대 200 MB)` |
| ja | `ファイルが大きすぎます（最大200MB）` |
| zh | `文件过大（最大 200 MB）` |
| es | `El archivo es demasiado grande (máx. 200 MB)` |

However, `FileUpload.tsx` correctly uses `maxForType` (500MB for JSON, 200MB for GPX/KML) for the actual size comparison at line 39. The error message is always the generic i18n string, regardless of file type.

Additionally, `parser.ts:524-530` throws a `ParseError` with a dynamically computed message including the correct limit, but `FileUpload.tsx:60-66` catches `FILE_TOO_LARGE` errors and replaces the message with the generic (and incorrect for JSON) i18n string.

This means a user uploading a 600MB JSON file sees "File is too large (max 200 MB)" when the actual limit is 500MB -- both the limit number and the file type context are wrong.

**Fix options:**
1. Add a `{max}` placeholder to the i18n strings and pass the actual limit at runtime
2. Or, when catching `FILE_TOO_LARGE` in `FileUpload.tsx`, use the parser's dynamic message (which is already correct) instead of replacing it with the i18n string
3. For the `FileUpload.tsx` pre-check (line 41), construct the error message dynamically using `maxForType`

Option 3 is most straightforward since `maxForType` is already computed at the check site. The i18n string could be changed to a template like `'File is too large (max {max} MB)'` or the error message can be built inline using `Math.round(maxForType / 1024 / 1024)`.

---

### NEW-C4-3: `downloadVideo` fetches a blob URL only to re-create the blob (unnecessary roundtrip)

**Severity:** LOW
**File:** `src/lib/videoEncoder.ts:162`

**Category:** Performance (minor)

**Description:**
In the `downloadVideo` function, when the File System Access API is available, the code does:

```typescript
const response = await fetch(url)     // url is a blob:// URL
const blob = await response.blob()    // re-creates the blob from the fetch
```

The `url` was created via `URL.createObjectURL(blob)` in `useExportController.ts:142`. So the data flow is: `Blob` -> `blob:// URL` -> `fetch` -> `Response` -> `Blob`. This is an unnecessary serialization roundtrip. The caller (`useExportController.ts`) has both the blob and the URL available and could pass the blob directly.

However, since blob URL fetches are local (no network), the performance impact is negligible. The real cost is in the video encoding itself, not this extra copy.

**Fix (optional):** Refactor `downloadVideo` to accept either a URL or a Blob, and when a Blob is provided, skip the fetch step.

---

### NEW-C4-4: Drag-and-drop silently ignores unsupported file types with no user feedback

**Severity:** INFO
**File:** `src/components/FileUpload.tsx:84-88`

**Category:** UX

**Description:**
When a user drags a file with an unsupported extension (e.g., `.tcx`, `.fit`, `.gpxz`), the `handleDrop` callback silently returns without showing any error message:

```typescript
const ext = file.name.split('.').pop()?.toLowerCase()
if (!ext || !VALID_EXTENSIONS.has(ext)) {
  setTimeout(() => setIsDragging(false), 200)
  return  // no error shown
}
```

Users may be confused about why their file was rejected. A brief toast or error message like "Unsupported file format: .tcx" would improve the experience.

**Fix (optional):** Show a brief error message when a dropped file has an unsupported extension.

---

## Codebase Health Assessment

### Strengths (confirmed from previous cycles)

1. **Security posture is solid**: No `eval()`, `Function()`, `dangerouslySetInnerHTML`, or `innerHTML` usage. CSP hardening via post-build script. XML entity stripping. JSON depth checking with spot-checks. Worker isolation for large JSON parsing.

2. **Resource cleanup is thorough**: Object URLs are revoked in cleanup effects. Map markers/layers are removed on unmount. Event listeners are cleaned up in effect returns. `mountedRef` pattern prevents state updates after unmount.

3. **Type safety is good**: `ParseError` class with machine-readable codes for i18n mapping. Proper TypeScript types throughout. No `any` usage in source files.

4. **Antimeridian handling**: Consistent shifted-longitude interpolation across `lerpCamera`, `smoothCameraState`, and `computeBoundingBox`. Previous fixes for this are holding.

5. **Accessibility**: Modal dialogs with focus trapping and `aria-modal`. Keyboard navigation support. `inert`/`aria-hidden` on background content when modals are open.

6. **Defense-in-depth for parsing**: Multiple size checks (FileUpload pre-check, parser check, worker check). Worker fallback to main thread on failure. Date field repair after structured clone.

### No Regressions Detected

All previously fixed issues remain fixed. No new code quality regressions, security issues, or architectural problems were found beyond the findings listed above.

### Console Statements

All `console.warn`/`console.error` calls are justified:
- `videoEncoder.ts:60` -- config clamping warning
- `useExportController.ts:152` -- export failure
- `parser.ts:469,483,504` -- worker fallback warnings
- `ExportPanel.tsx:129` -- share failure
- `MapView.tsx:568` -- map init failure
- `FileUpload.tsx:44,64` -- large file warning and parse error
- `ErrorBoundary.tsx:26` -- caught errors
- `page.tsx:191` -- sample load failure

None are extraneous debug logging.

### Eslint-disable Comments

All 5 eslint-disable comments have justifications:
- `JourneyCreator.tsx:413` -- "map ref and handlers are stable; only re-run when active state changes"
- `TimelineSelector.tsx:104,151` -- documented reasons for dependency arrays
- `MapView.tsx:572,596` -- mount-only effects

---

## Summary

| ID | Finding | Severity | Files |
|----|---------|----------|-------|
| NEW-C4-1 | Worker error message says "200MB" but limit is 500MB | HIGH | `public/workers/trackParser.worker.js:263` |
| NEW-C4-2 | i18n strings say "max 200 MB" but JSON limit is 500MB | HIGH | `src/lib/i18n.ts`, `src/components/FileUpload.tsx` |
| NEW-C4-3 | `downloadVideo` unnecessary blob URL roundtrip | LOW | `src/lib/videoEncoder.ts:162` |
| NEW-C4-4 | Drag-and-drop silently ignores unsupported files | INFO | `src/components/FileUpload.tsx:84-88` |

**Net assessment:** The codebase is in good shape. The two HIGH findings are both remnants of the cycle 3 fix that raised the JSON size limit from 200MB to 500MB -- the constants were updated but the human-facing strings were not. These are simple, low-risk fixes.
