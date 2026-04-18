# P1 Quality & Polish — Cycle 4 (2026-04-19)

**Priority:** P1 — minor robustness and UX improvements
**Source:** comprehensive-deep-code-review-2026-04-19-cycle4 (NEW-C4-3, NEW-C4-4)
**Estimated effort:** 10-15 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C4-3 | `downloadVideo` fetches blob URL only to re-create blob | LOW | `src/lib/videoEncoder.ts:162` |
| NEW-C4-4 | Drag-and-drop silently ignores unsupported file types | INFO | `src/components/FileUpload.tsx:84-88` |

---

## Implementation steps

### 1. Pass blob directly to downloadVideo to avoid unnecessary fetch (NEW-C4-3)

**File:** `src/lib/videoEncoder.ts:154-172`, `src/lib/useExportController.ts:143`

**Current:** `useExportController` creates a blob URL, then `downloadVideo` fetches it back to get a blob. This is an unnecessary roundtrip.

**Fix:** Modify `downloadVideo` to accept an optional `Blob` parameter. When provided, use it directly instead of fetching the URL:

```ts
export async function downloadVideo(url: string, filename: string, blob?: Blob): Promise<void> {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<unknown> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{ accept: { 'video/mp4': ['.mp4'] } }],
      }) as FileSystemWritableFileStream
      const writableBlob = blob ?? await (await fetch(url)).blob()
      const writable = await (handle as unknown as { createWritable: () => Promise<FileSystemWritableFileStream> }).createWritable()
      await writable.write(writableBlob)
      await writable.close()
      return
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
  }

  // Fallback: programmatic <a> download (unchanged)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
```

In `useExportController.ts:143`, pass the blob:
```ts
await downloadVideo(videoUrl, result.filename, blob)
```

Note: The `blob` variable is created on line 138, before the `downloadVideo` call on line 143, so it's available.

**Verification:** Export a video. Confirm the download works correctly (both with and without File System Access API).

---

### 2. Show error message for unsupported drag-and-drop file types (NEW-C4-4)

**File:** `src/components/FileUpload.tsx:84-88`

**Current:**
```ts
const ext = file.name.split('.').pop()?.toLowerCase()
if (!ext || !VALID_EXTENSIONS.has(ext)) {
  setTimeout(() => setIsDragging(false), 200)
  return
}
```

**Fix:** Show a brief error before returning:
```ts
const ext = file.name.split('.').pop()?.toLowerCase()
if (!ext || !VALID_EXTENSIONS.has(ext)) {
  setError(t('fileUpload.unsupportedFormat'))
  setTimeout(() => setIsDragging(false), 200)
  return
}
```

The i18n key `fileUpload.unsupportedFormat` already exists in all 5 locales (used by the parser's `UNSUPPORTED_FORMAT` error). This reuses it for the drag-and-drop case.

**Verification:** Drag a `.txt` or `.tcx` file onto the upload area. Confirm an error message appears.

---

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] Video download works correctly with blob passed directly (NEW-C4-3)
- [ ] Dragging unsupported file type shows error message (NEW-C4-4)
