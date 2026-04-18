# Wave 5 Ultradeep Code Quality + Security Review — 2026-04-18

**Reviewer:** Claude Opus (3 parallel agents: code quality, security, architecture + slop analyzer)
**Scope:** Full repository — 27 source files, 1 worker, 3 scripts
**Date:** 2026-04-18

---

## Summary

| Severity | Count |
|----------|-------|
| HIGH | 2 |
| MEDIUM | 4 |
| LOW | 5 |
| SLOP | 12 |

---

## Previously Fixed (verified in wave-5 re-audit)

The following wave-4 issues are confirmed **fixed** in the current codebase:

- C-1: Worker sort divergence (worker:164-170 now matches parser.ts:353-359)
- C-2: Antimeridian interpolation (camera.ts:116 uses shortest-path)
- C-3: Toast timer reset (Toast.tsx:21-22 uses ref)
- H-2: O(n) interpolation search (interpolate.ts now uses binary search)
- H-3: ModalDialog onClose ref (ModalDialog.tsx:84-85 uses ref)
- H-4: ThemeToggle system preference override (ThemeToggle.tsx:40 checks controlledMode)
- H-5: Zero-length scenes filtered (camera.ts:43)
- H-6: serve-static try/catch + HEAD Content-Length
- H-8: FileUpload isTouchDevice hydration (uses useState+useEffect)
- M-2: Blob URL revoke (useExportController.ts:51-53, 59, 141)
- M-6: Floating-point dedup key in main-thread (parser.ts:345 uses .toFixed(7))
- M-7: GPX getElementsByTagName (parser.ts:100 uses direct-child selection)
- M-9: BoundingBox cached (camera.ts:53-75)
- M-12: theme-init.js localStorage check
- M-13: GoogleGuide tab reset (GoogleGuide.tsx:142)
- M-15: Script hash entity decoding (harden-static-export.mjs:41-51)
- L-1: useExportController mountedRef (useExportController.ts:40)
- L-7: E2E temp file PID (travelback.spec.ts:908)

---

## NEW Issues Found

### N-1: Worker dedup key uses raw float while main-thread uses .toFixed(7) — STILL DIVERGENT

**Severity:** HIGH
**File:** `public/workers/trackParser.worker.js:158` vs `src/lib/parser.ts:345`
**Confidence:** High

Wave-4 fixed M-6 in the main-thread parser by adding `.toFixed(7)` to the dedup key. However, the worker at line 158 still uses raw floating-point:

```js
const key = `${point.lat},${point.lng},${point.time ? point.time.getTime() : ''}`
```

Main-thread at parser.ts:345 uses:
```ts
`${p.lat.toFixed(7)},${p.lng.toFixed(7)}`
```

**Impact:** Different point counts depending on whether worker or main thread handles the parse. Near-duplicate GPS points not deduplicated in worker path.

**Fix:** Add `.toFixed(7)` to worker dedup key.

---

### N-2: segmentStartIndices off-by-one during timeline range slicing

**Severity:** HIGH
**File:** `src/app/page.tsx:152-159`
**Confidence:** High

`handleRangeChange` filters segment starts with `index > startIdx`, excluding a segment that starts at exactly `startIdx`. When slicing from index 5, a segment that starts at index 5 should still be marked as a segment start.

```ts
segmentStartIndices: fullTrack.segmentStartIndices
  .filter((index) => index > startIdx && index <= endIdx)  // should be >=
  .map((index) => index - startIdx),
```

Additionally, if the original track had a segment break between `startIdx-1` and `startIdx`, the sliced track silently merges two disconnected segments.

**Impact:** Trail line draws straight lines across geographic gaps in trimmed tracks. Cumulative distance includes gap distance.

**Fix:** Change to `index >= startIdx` and always add `0` if there was a segment break at the slice boundary.

---

### N-3: Worker Date serialization fragility across postMessage

**Severity:** MEDIUM
**File:** `public/workers/trackParser.worker.js:226` and `src/lib/parser.ts:397-408`
**Confidence:** Medium

If the worker communication ever changes (e.g., switching to JSON.stringify/parse), `Date` objects become strings. Any future change could silently break time-based sorting. Add a validation pass after receiving the worker result.

**Fix:** After receiving worker result, validate that `time` fields are `Date` instances.

---

### N-4: computeCameraForProgress re-normalizes scenes every frame during playback

**Severity:** MEDIUM
**File:** `src/lib/camera.ts:342` and `src/components/MapView.tsx:766-768`
**Confidence:** High

During playback, `computeCameraForProgress` is called without `preNormalized`, causing `normalizeScenes` to re-sort, re-clamp, and re-filter on every frame. The export path already passes `preNormalized: true`.

**Fix:** Pre-normalize scenes in MapView when they change and pass `preNormalized: true` during playback.

---

### N-5: ExportPanel clamping constants diverge from videoEncoder clamping

**Severity:** MEDIUM
**File:** `src/components/ExportPanel.tsx:117` vs `src/lib/videoEncoder.ts:56`
**Confidence:** Medium

ExportPanel clamps bitrate to max 50, videoEncoder to max 100. ExportPanel clamps duration min to 5, videoEncoder to min 1. Not currently user-visible but represents divergent constants.

**Fix:** Extract shared clamping constants from a single source.

---

### N-6: crypto.randomUUID() without fallback for non-secure contexts

**Severity:** MEDIUM
**File:** `src/components/SceneEditor.tsx:246` and `src/components/Toast.tsx:78`
**Confidence:** Medium

`crypto.randomUUID()` requires secure context. In non-HTTPS environments, it's undefined and throws TypeError.

**Fix:** Add fallback: `typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : fallbackId()`.

---

### N-7: Map style not persisted in localStorage

**Severity:** LOW
**File:** `public/theme-init.js:14` and `src/app/page.tsx:42-48`
**Confidence:** Medium

Theme preference is persisted in localStorage but map style is not. On refresh, the user's chosen map style is lost and reset to theme-inferred default.

**Fix:** Persist chosen map style key in localStorage and read it in theme-init.js.

---

### N-8: downloadVideo appends/removes DOM element on every export

**Severity:** LOW
**File:** `src/lib/videoEncoder.ts:153-160`
**Confidence:** Low

Creates and appends an `<a>` element for each download, triggering layout reflow. Negligible impact.

**Fix:** Reuse a hidden anchor element stored at module level.

---

### N-9: Hardcoded English strings in parser and metadata

**Severity:** LOW
**Files:** `src/lib/parser.ts:124,141,362`, `src/app/layout.tsx:12-14,20-31`, `src/types.ts:73-77`
**Confidence:** High

Track names (`'GPX Track'`, `'KML Track'`, `'Google Location History'`), page metadata, and codec labels are hardcoded in English.

**Fix:** Use i18n keys for user-visible strings. (Lower priority — metadata is less critical.)

---

## Security Findings (from previous review, status updated)

### S-1: XML entity expansion (billion laughs) via GPX/KML — STILL OPEN

**Severity:** HIGH (Security)
**File:** `src/lib/parser.ts:86-87,125-126`

`DOMParser` with `application/xml` does not neutralize XML entity expansion attacks. A small file with deeply nested entities can crash the browser tab.

**Fix:** Strip DTD/entity declarations before DOMParser. Add `<parsererror>` detection.

### S-2: CSP unsafe-inline for styles — STILL OPEN

**Severity:** MEDIUM (Security, partially mitigated by `style-src-attr 'none'`)

`style-src 'unsafe-inline'` allows CSS injection. Mitigated by `style-src-attr 'none'` added in wave-4. CDN still trusted.

### S-3: No input validation in Web Worker — STILL OPEN

**Severity:** MEDIUM (Security)

Worker accepts postMessage without validating message structure, types, or size.

**Fix:** Validate message structure and size in worker.

### S-4: CDN dependency without full SRI — STILL OPEN

**Severity:** MEDIUM (Security)

Pretendard font from cdn.jsdelivr.net has SRI on the CSS file but sub-resources are not integrity-checked.

### S-5: No global Referrer-Policy — STILL OPEN

**Severity:** MEDIUM (Security)

No `<meta name="referrer" content="no-referrer" />` in layout.tsx.

### S-6: Debug interface exposed in WebDriver mode

**Severity:** LOW (Security)
**File:** `src/components/MapView.tsx:484-512`

`window.__travelbackDebug` exposed when `navigator.webdriver` is truthy, which can happen in non-development contexts.

**Fix:** Only expose in development mode.

### S-7: Console error messages may leak file fragments

**Severity:** LOW (Security)
**File:** `src/lib/parser.ts:371,385`, `src/components/FileUpload.tsx:57`

Full error objects logged to console may include file content previews.

**Fix:** Log only error.message, not the full error object.

---

## Slop Findings

### SL-1: handleTrackLoaded and handleJourneyComplete are identical wrappers
**File:** `src/app/page.tsx:165-171`
**Fix:** Pass `loadTrackIntoSession` directly.

### SL-2: basePath computation repeated across 4 files
**Files:** layout.tsx:5, page.tsx:174, FileUpload.tsx:20, GoogleGuide.tsx:9
**Fix:** Extract shared constant from `lib/env.ts`.

### SL-3: MAX_FILE_SIZE defined in 3 places
**Files:** FileUpload.tsx:18, parser.ts:423, trackParser.worker.js:180
**Fix:** Define once in shared location.

### SL-4: ExportState type defined in two files
**Files:** ExportPanel.tsx:11, useExportController.ts:11
**Fix:** Export from useExportController.ts.

### SL-5: parseGPX and parseKML share identical XML preamble
**File:** parser.ts:89-93 and 132-136
**Fix:** Extract `parseXml(text, formatName)` helper.

### SL-6: handleReload dead setState before window.location.reload
**File:** ErrorBoundary.tsx:29-32
**Fix:** Remove setState call.

### SL-7: Six trivial useCallback wrappers for simple state setters
**File:** page.tsx:199-226
**Fix:** Remove and use inline arrows or pass setters directly.

### SL-8: ThemeToggle uncontrolled mode is dead code
**File:** ThemeToggle.tsx:7-56
**Fix:** Simplify to purely controlled component.

### SL-9: FileUpload contains parser-level error mapping logic
**File:** FileUpload.tsx:47-64
**Fix:** Use typed parse errors with error codes.

### SL-10: addTrackLayers parameter shadows i18n `t`
**File:** MapView.tsx:580
**Fix:** Rename parameter to `track`.

### SL-11: Four separate useEffects for ref syncing
**File:** usePlaybackController.ts:32-45
**Fix:** Consolidate into single useEffect.

### SL-12: VALID_EXTENSIONS Set recreated every render
**File:** FileUpload.tsx:73
**Fix:** Move to module scope.

---

## Priority Fix Order

1. N-1: Worker dedup key (.toFixed(7)) — 1 line, high impact
2. N-2: segmentStartIndices off-by-one — real visual bug
3. S-1: Strip XML entities before DOMParser — security
4. S-3: Worker input validation — security
5. N-6: crypto.randomUUID fallback — crash prevention
6. N-4: Pre-normalize scenes during playback — performance
7. N-5: Shared clamping constants — correctness
8. N-3: Worker Date serialization validation — robustness
9. S-5: Global Referrer-Policy meta tag — privacy
10. S-6: Debug interface only in dev mode — security
11. S-7: Console error log only message — privacy
12. SL-1 through SL-12: Slop cleanup
