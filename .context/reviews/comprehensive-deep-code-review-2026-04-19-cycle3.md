# Comprehensive Deep Code Review — Cycle 3 (2026-04-19)

**Reviewer:** automated deep review
**Scope:** full src/ + public/workers/ + e2e/
**Previous review:** comprehensive-deep-code-review-2026-04-19-cycle2.md

---

## Cycle 2 verification

All 7 findings from cycle 2 are verified fixed:

| # | Issue | Status |
|---|-------|--------|
| NEW-1 | smoothCameraState uses old shortest-path longitude wrapping | FIXED — shifted-longitude approach applied (src/components/MapView.tsx:76-98) |
| NEW-2 | JSON files bypass the 200MB size check | FIXED — JSON_MAX_FILE_SIZE=500MB with maxForType (src/lib/parser.ts:518-523) |
| NEW-3 | ElevationProfile click-to-seek uses linear scan | FIXED — binary search on cumulDist (src/components/ElevationProfile.tsx:66-84) |
| NEW-4 | SceneRangeEditor onChange stale closure | FIXED — onChangeRef pattern (src/components/SceneEditor.tsx) |
| NEW-5 | Empty catch blocks | MOSTLY RESOLVED — only 1 remaining localStorage catch (acceptable) |
| NEW-6 | eslint-disable without justification | FIXED — all have justification comments |
| NEW-7 | TrackToolbar mousedown missing passive flag | FIXED — { passive: true } added |

---

## New findings

### NEW-C3-1: Worker MAX_MESSAGE_SIZE (200MB) inconsistent with main-thread JSON_MAX_FILE_SIZE (500MB)

**Severity:** HIGH
**Component:** public/workers/trackParser.worker.js:196, src/lib/parser.ts:518

**Description:** The main-thread parser allows JSON files up to 500MB (`JSON_MAX_FILE_SIZE`), but the Web Worker rejects any message payload exceeding 200MB (`MAX_MESSAGE_SIZE`). When a user imports a 400MB Google Location History JSON file, the main thread passes the size check, reads the file into a string, and posts it to the worker — where it is rejected at line 260. The worker throws "Input too large: exceeds 200MB limit" and the main thread falls back to parsing on the main thread (blocking the UI for potentially tens of seconds). This defeats the purpose of the worker for the exact class of files (large JSON) it was designed to offload.

**Evidence:**
- `src/lib/parser.ts:518` — `const JSON_MAX_FILE_SIZE = 500 * 1024 * 1024`
- `public/workers/trackParser.worker.js:196` — `const MAX_MESSAGE_SIZE = 200 * 1024 * 1024`
- `public/workers/trackParser.worker.js:260` — `if (data.text.length > MAX_MESSAGE_SIZE) { throw new Error(...) }`

**Fix:** Raise `MAX_MESSAGE_SIZE` in the worker to match `JSON_MAX_FILE_SIZE` (500MB), or export the constant from `parser.ts` and import it in both places to prevent drift.

---

### NEW-C3-2: FileUpload.tsx duplicates MAX_FILE_SIZE and JSON_MAX_FILE_SIZE constants

**Severity:** MEDIUM
**Component:** src/components/FileUpload.tsx:19-20, src/lib/parser.ts:517-518

**Description:** `FileUpload.tsx` defines its own `MAX_FILE_SIZE` (200MB) and `JSON_MAX_FILE_SIZE` (500MB) at lines 19-20, duplicating the constants in `parser.ts` at lines 517-518. If either constant changes in `parser.ts`, the FileUpload duplicate will silently drift, causing the UI to show incorrect size warnings or allow files that the parser will reject (or vice versa).

**Evidence:**
- `src/components/FileUpload.tsx:19-20` — `const MAX_FILE_SIZE = 200 * 1024 * 1024` / `const JSON_MAX_FILE_SIZE = 500 * 1024 * 1024`
- `src/lib/parser.ts:517-518` — same values, not exported

**Fix:** Export the constants from `parser.ts` and import them in `FileUpload.tsx`. The worker cannot import TS modules, so it should keep its own copy but with a code comment referencing the canonical source.

---

### NEW-C3-3: checkJsonDepth spot-checks don't carry forward cumulative depth from 1MB scan

**Severity:** MEDIUM
**Component:** src/lib/parser.ts:337-360, public/workers/trackParser.worker.js:219-242

**Description:** After scanning the first 1MB and tracking depth, the spot-checks at 25%/50%/75%/end start their `sampleDepth` counter at 0. If a JSON file nests to depth 50 in the first 1MB, then adds 20 more levels of nesting after the 1MB mark, the spot-checks would measure `sampleDepth` up to 20 (well under the 64 limit), while the actual cumulative depth at that point would be 70 (exceeding the limit). The spot-checks would fail to detect the depth violation.

In practice, Google Location History files are flat arrays of objects (depth ~3), so this is unlikely to trigger in normal use. However, a maliciously crafted JSON file could exploit this gap.

Both the main-thread parser and the worker have this identical issue.

**Evidence:**
- `src/lib/parser.ts:343` — `let sampleDepth = 0` (should start from the final depth of the 1MB scan)
- `public/workers/trackParser.worker.js:225` — same pattern

**Fix:** Capture `depth` at the end of the 1MB scan and use it as the starting value for `sampleDepth` in each spot-check. This makes spot-checks reflect actual cumulative nesting rather than local-only nesting.

---

### NEW-C3-4: commitScenes generates warnings from raw scenes before normalization

**Severity:** LOW
**Component:** src/components/SceneEditor.tsx:201-218

**Description:** `commitScenes` first checks raw scene boundaries for start>=end and overlaps, generating warning strings. It then calls `normalizeScenes()` which silently clamps/adjusts boundaries. The warnings shown to the user may describe conditions (e.g., "Scene A overlaps Scene B") that no longer exist after normalization, causing confusing UX.

In practice, `normalizeScenes` in `camera.ts` resolves overlaps by expanding scenes to fill gaps, so the warnings are often about transient states that the user never sees. The warnings are still useful as educational feedback, but they can be misleading.

**Evidence:**
- `src/components/SceneEditor.tsx:202-216` — generates `w` from raw sorted scenes
- `src/components/SceneEditor.tsx:217` — `normalizeScenes(nextScenes)` may change boundaries

**Fix:** Generate warnings from the normalized result rather than the raw input. Compute `normalized = normalizeScenes(nextScenes)`, then compare the normalized boundaries against the original input to surface meaningful discrepancies (e.g., "Scene boundaries were adjusted to eliminate overlap").

---

### NEW-C3-5: Fixed 200ms setTimeout after canvas resize in useExportController

**Severity:** LOW
**Component:** src/lib/useExportController.ts:105

**Description:** After resizing the map canvas, the export controller does `await new Promise(resolve => setTimeout(resolve, 200))` before calling `waitForIdle`. This fixed delay is unnecessary — `waitForIdle` already waits for the map to finish rendering. The 200ms delay adds latency on fast devices and may be insufficient on slow ones. Since `waitForIdle` follows immediately and handles the actual wait, the setTimeout can be removed entirely.

**Evidence:**
- `src/lib/useExportController.ts:104-107`:
  ```ts
  mapHandle.resize(config.resolution.width, config.resolution.height)
  await new Promise((resolve) => setTimeout(resolve, 200))
  const mapSettledAfterResize = await mapHandle.waitForIdle(abortController.signal)
  ```

**Fix:** Remove the `setTimeout(resolve, 200)` line. The `waitForIdle` call on line 107 already ensures the map has finished rendering after the resize.

---

## Summary

| # | Issue | Severity | Component |
|---|-------|----------|-----------|
| NEW-C3-1 | Worker MAX_MESSAGE_SIZE (200MB) inconsistent with JSON_MAX_FILE_SIZE (500MB) | HIGH | worker + parser |
| NEW-C3-2 | FileUpload.tsx duplicates size constants from parser.ts | MEDIUM | FileUpload.tsx |
| NEW-C3-3 | checkJsonDepth spot-checks start at depth 0 instead of cumulative | MEDIUM | parser.ts + worker |
| NEW-C3-4 | commitScenes warns on raw scenes before normalization | LOW | SceneEditor.tsx |
| NEW-C3-5 | Unnecessary 200ms setTimeout before waitForIdle | LOW | useExportController.ts |

**5 new findings** (1 HIGH, 2 MEDIUM, 2 LOW)
**0 findings carried forward** from cycle 2 (all resolved)
