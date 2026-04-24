# Code Reviewer — Cycle r9 (2026-04-24)

## Inventory

All 28 source files under `src/` reviewed, plus `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `playwright.static.config.ts`, and e2e test files.

## Findings

### C9-CR-001: FileUpload error handler `matchedKey` lookup uses wrong key [MEDIUM/HIGH]

**File:** `src/components/FileUpload.tsx:75`

```js
const matchedKey = code && code in errorCodeMap ? code : ''
```

The variable `matchedKey` is assigned the **error code** (e.g. `'UNSUPPORTED_FORMAT'`), not the **i18n key** from `errorCodeMap`. The subsequent `errorCodeMap[matchedKey]` lookup on line 81 works correctly because it does a second lookup. However, the `isSafe` check on line 78 uses `!!matchedKey` which checks if the code exists in the map -- this works but is confusing and redundant with `isFileTooLarge`. The variable name `matchedKey` is misleading: it holds the code, not the key. This was partially addressed in cycle 8 (removing the English message text fallback), but the naming remains confusing and the logic could be simplified.

**Impact:** No functional bug, but the variable naming is misleading for maintainers. A future edit could easily introduce a bug by treating `matchedKey` as the i18n key.

**Fix:** Rename `matchedKey` to `matchedCode` and simplify the flow:
```ts
const knownCode = code && code in errorCodeMap
const isFileTooLarge = code === 'FILE_TOO_LARGE'
const isSafe = !!knownCode || isFileTooLarge
if (!isSafe) console.error(...)
if (knownCode) {
  setError(t(errorCodeMap[code as keyof typeof errorCodeMap]))
} else if (isFileTooLarge) {
  setError(message)
} else {
  setError(t('fileUpload.parseFailed'))
}
```

### C9-CR-002: `generateId()` fallback uses `Math.random()` — non-cryptographic [LOW/HIGH]

**File:** `src/types.ts:5`

The `generateId()` function falls back to `Date.now() + Math.random()` when `crypto.randomUUID` is unavailable. This produces predictable IDs. In the current codebase, IDs are only used as React keys and scene identifiers (not security-sensitive), so this is LOW severity. However, the `Toast` component's `useToast` hook uses `generateId()` for toast message IDs, and if this were ever used in a security context, it would be problematic.

**Status:** Already deferred as DF-C4-009. No new action needed.

### C9-CR-003: ExportPanel `initialCodecSupport` is module-level mutable state [LOW/HIGH]

**File:** `src/components/ExportPanel.tsx:32`

```ts
const initialCodecSupport: Record<VideoCodec, boolean | null> = { h264: null, h265: null, av1: null }
```

This is module-level state that is used as the initial value for `useState`. While the `useState` initializer only reads it once, the object itself is shared across all instances. If `initialCodecSupport` were mutated (e.g., by a bug), all instances would see the mutation. This is already deferred as DF-C7-001.

**Status:** Already deferred. No new action needed.

## Summary

- 1 new finding (C9-CR-001: misleading `matchedKey` variable name in FileUpload error handler)
- 2 carried-forward deferred items confirmed still applicable
- All prior fixes confirmed still in place
