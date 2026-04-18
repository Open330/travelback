# P0 Critical Correctness Fixes — Cycle 3 (2026-04-19)

**Priority:** P0 — correctness bugs that produce wrong output or inconsistent behavior
**Source:** comprehensive-deep-code-review-2026-04-19-cycle3 (NEW-C3-1, NEW-C3-2, NEW-C3-3)
**Estimated effort:** 30-45 minutes

---

## Findings addressed

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C3-1 | Worker MAX_MESSAGE_SIZE (200MB) inconsistent with JSON_MAX_FILE_SIZE (500MB) | HIGH | worker + parser |
| NEW-C3-2 | FileUpload.tsx duplicates size constants from parser.ts | MEDIUM | FileUpload.tsx |
| NEW-C3-3 | checkJsonDepth spot-checks start at depth 0 instead of cumulative | MEDIUM | parser.ts + worker |

---

## Implementation steps

### 1. Align worker MAX_MESSAGE_SIZE with main-thread JSON_MAX_FILE_SIZE (NEW-C3-1)

**File:** `public/workers/trackParser.worker.js:196`

**Current:** Worker rejects payloads > 200MB, but main thread allows JSON files up to 500MB.

```js
const MAX_MESSAGE_SIZE = 200 * 1024 * 1024 // 200MB
```

**Fix:** Raise to match `JSON_MAX_FILE_SIZE`:

```js
// Must match JSON_MAX_FILE_SIZE in src/lib/parser.ts
const MAX_MESSAGE_SIZE = 500 * 1024 * 1024 // 500MB — must stay in sync with src/lib/parser.ts
```

**Verification:** A 300MB JSON file should now be parsed in the worker (not fall back to main thread).

---

### 2. Export and share size constants between parser.ts and FileUpload.tsx (NEW-C3-2)

**File:** `src/lib/parser.ts:517-518`, `src/components/FileUpload.tsx:19-20`

**Current:** Both files define `MAX_FILE_SIZE` and `JSON_MAX_FILE_SIZE` independently.

**Fix:** Export from parser.ts and import in FileUpload.tsx.

In `src/lib/parser.ts`, change:
```ts
const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
const JSON_MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB for JSON (Google Location History files can be large)
```
to:
```ts
export const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
export const JSON_MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB for JSON (Google Location History files can be large)
```

In `src/components/FileUpload.tsx`, remove lines 19-20 and add import:
```ts
import { parseTrackFile, ParseError, MAX_FILE_SIZE, JSON_MAX_FILE_SIZE } from '@/lib/parser'
```

**Verification:** `npm run build` succeeds. FileUpload still rejects oversized files with the same thresholds.

---

### 3. Fix checkJsonDepth spot-checks to use cumulative depth (NEW-C3-3)

**File:** `src/lib/parser.ts:337-360`, `public/workers/trackParser.worker.js:219-242`

**Current:** After scanning the first 1MB, spot-checks at 25%/50%/75%/end start `sampleDepth = 0`, ignoring the cumulative depth already accumulated.

**Fix in `src/lib/parser.ts`:** Capture the final depth from the 1MB scan and use it as the starting depth for each spot-check:

```ts
// After the 1MB scan, depth holds the cumulative nesting level at scanEnd
const baseDepth = depth

// For large files, spot-check at 25%, 50%, 75%, and near the end
if (len > scanEnd) {
  const samples = [len * 0.25, len * 0.5, len * 0.75, len - 1024]
  for (const offset of samples) {
    const start = Math.floor(offset)
    const end = Math.min(start + 1024, len)
    let sampleDepth = baseDepth  // Start from cumulative depth, not 0
    // ... rest unchanged ...
```

Apply the same fix in `public/workers/trackParser.worker.js:225`:
```js
let sampleDepth = baseDepth  // Start from cumulative depth, not 0
```

And capture `baseDepth` after the 1MB scan loop:
```js
const baseDepth = depth
```

**Verification:** Create a deeply nested JSON file that nests to depth 50 in the first 1MB, then adds 20 more levels after 1MB. Confirm the spot-check detects the total depth of 70 (exceeding the 64 limit). A flat file should still pass.

---

## Verification checklist

- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e:static:ci` passes
- [ ] Worker accepts JSON files up to 500MB (NEW-C3-1)
- [ ] FileUpload uses imported constants from parser.ts (NEW-C3-2)
- [ ] checkJsonDepth spot-checks detect cumulative depth across boundaries (NEW-C3-3)
