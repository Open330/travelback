# Comprehensive Deep Code Review - Cycle 7

**Date:** 2026-04-19
**Reviewer:** Automated review cycle 7/100
**Scope:** Full source tree (`src/`, `public/`, `scripts/`, `e2e/`)

## Previous Cycle Verification

All findings from previous cycles have been verified as fixed in prior cycles. This review starts from a clean slate for new findings.

## New Findings

### NEW-C7-1: TimelineSelector histogram uses index-based bucketing instead of distance-based

**Severity:** MEDIUM
**File:** `src/components/TimelineSelector.tsx:70-78`
**Category:** Correctness / UX consistency
**Confidence:** HIGH

**Description:**
The TimelineSelector's histogram distributes points into buckets using point index:
```typescript
const b = Math.min(
  BUCKET_COUNT - 1,
  Math.floor((i / points.length) * BUCKET_COUNT)
)
```

However, the rest of the application consistently uses distance-based progress (not index-based). The `ElevationProfile` SVG uses distance-proportional x-coordinates. The playback progress is distance-based. The timeline handles use ratio-based positioning which maps to indexes via `resolveRangeIndexes()`.

When track points are unevenly distributed (dense in cities, sparse on highways), the histogram will visually misrepresent the data -- a dense cluster of 1000 points in a city block will take up a large portion of the histogram even though they represent very little distance, while a sparse highway segment of 50km will barely show.

This inconsistency with the distance-based paradigm used everywhere else could confuse users who expect the histogram to correlate with the distance shown in the controls.

**Fix:** Compute the histogram using cumulative distances. Each bucket should represent an equal distance range, and the bar height should reflect the number of points within that distance range. This would align the histogram visually with the distance-based progress used in playback and elevation profile.

---

### NEW-C7-2: `downloadVideo` fallback `<a>` download may fail for blob URLs in some browsers

**Severity:** LOW
**File:** `src/lib/videoEncoder.ts:174-179`
**Category:** Robustness
**Confidence:** MEDIUM

**Description:**
When the File System Access API is unavailable, `downloadVideo` creates a temporary `<a>` element pointing to the blob URL. In some browser configurations, programmatic clicks on `<a>` elements with blob URLs may be blocked by popup/download blockers because the click is not in direct response to a user gesture (the actual user gesture was the export button click, but by the time the video finishes encoding and `downloadVideo` is called, the user gesture context has expired).

The File System Access API path handles this correctly via `showSaveFilePicker`, but the fallback path could silently fail -- the `<a>` click might not trigger a download, and there is no feedback to the user.

However, since the blob is also stored in state (`exportedVideoBlob`) and displayed in the export panel via a `<video>` element, the user can still access the video. The impact is that the automatic download may not trigger.

**Fix (optional):** After the `<a>` click fallback, check if the download was likely blocked (there is no standard API for this, but a brief timeout check could help) and show a toast message telling the user they can use the video preview to save.

---

### NEW-C7-3: `handleRangeChange` in page.tsx produces empty segmentStartIndices when all indices filter out

**Severity:** LOW
**File:** `src/app/page.tsx:144-165`
**Category:** Edge case / Correctness
**Confidence:** MEDIUM

**Description:**
When the user trims the timeline range, `handleRangeChange` filters `segmentStartIndices` to those within `[startIdx, endIdx]` and remaps them:
```typescript
segmentStartIndices: fullTrack.segmentStartIndices
  .filter((index) => index >= startIdx && index <= endIdx)
  .map((index) => index - startIdx)
  .filter((index) => index > 0),
```

This is correct when there are segment starts within the trimmed range. However, if the user trims to a range that doesn't contain any segment start indices, the result is `segmentStartIndices: []` (an empty array), which is falsy in the `Track` type but gets spread as `{ segmentStartIndices: [] }`.

The `computeCumulativeDistances` function treats an empty array the same as `undefined`, so this is functionally correct -- but it's subtly different from omitting the property entirely. Code that checks `track.segmentStartIndices` truthiness would see an empty array as truthy and iterate over it unnecessarily.

More importantly, if the user trims to a range that starts in the middle of a segment (e.g., startIdx=500, endIdx=800, and there's a segment start at index 600), the result would be `segmentStartIndices: [600 - 500] = [100]`. This is correct. But if the range is entirely within one segment (no internal segment starts), we get an empty array, which means the entire trimmed range is treated as one continuous segment. This is actually the correct behavior.

**No fix needed** -- this is working as intended. Documenting for completeness.

---

### NEW-C7-4: JourneyCreator search only parses coordinate strings, not place names

**Severity:** LOW
**File:** `src/components/JourneyCreator.tsx:66-102`
**Category:** Feature limitation
**Confidence:** HIGH (confirmed by code)

**Description:**
The `parseCoordinateQuery` function only handles coordinate-format queries (geo: URIs, @lat,lng, Google Maps URLs, raw lat,lng). It does not support place name searches (e.g., "Tokyo Tower"). When a user enters a place name, the search returns no results and shows `t('journey.searchInvalid')`.

This is by design -- the JourneyCreator uses a local-only coordinate parser to avoid sending data to geocoding services, preserving privacy. The UI hints at this with the "search disabled / privacy" toggle.

However, the error message `journey.searchInvalid` could be more helpful. Currently it says something like "Invalid search query" which might confuse users who enter "Paris" expecting geocoding. A better message would be "Enter coordinates or a map link (e.g., 35.6762,139.6503 or geo:35.6762,139.6503)".

**Fix (optional):** ~~Improve the error message to guide users toward coordinate-format input.~~

**UPDATE:** Upon inspection, the `journey.searchInvalid` i18n key already provides helpful guidance with coordinate examples in all 5 locales (e.g., EN: "Could not read that location. Paste coordinates like 37.5665, 126.9780 or a supported map link."). No fix needed -- this finding was a false positive based on an incorrect assumption about the error message content.

---

### NEW-C7-5: ExportPanel file size estimate doesn't account for codec compression ratio

**Severity:** INFO
**File:** `src/components/ExportPanel.tsx:308`
**Category:** UX accuracy
**Confidence:** HIGH

**Description:**
The estimated file size shown in the export panel uses a simple formula:
```typescript
{((bitrate * duration) / 8).toFixed(0)} MB
```

This calculates the raw bitrate-based size but doesn't account for:
1. MP4 container overhead (~small, negligible)
2. Audio track (currently the app exports video-only, so this is not an issue)
3. Variable bitrate encoding (actual size may differ from CBR estimate)

The estimate is reasonable as a rough guide. No fix needed, but noting for awareness.

---

### NEW-C7-6: `checkJsonDepth` spot-check doesn't track string/escape state from the main scan

**Severity:** LOW
**File:** `src/lib/parser.ts:337-361` and `public/workers/trackParser.worker.js:220-245`
**Category:** Correctness (edge case)
**Confidence:** LOW

**Description:**
The `checkJsonDepth` function scans the first 1MB of text fully, tracking `inString` and `escape` state. For large files, it then spot-checks at 25%, 50%, 75%, and near the end. However, the spot-check starts with `sampleInString = false` and `sampleEscape = false`, which means if a JSON string starts before the sample window and continues into it, the spot-check will miscount brackets inside that string as real nesting depth.

For example, if a string value at the 25% mark contains `{[[[[[[[` (which is valid inside a JSON string), the spot-check would count these as real brackets and could falsely trigger the depth limit.

The main scan (first 1MB) handles this correctly by tracking state continuously. The spot-checks don't.

**Concrete failure scenario:** A JSON file >1MB where a long string value spans across the 25% offset boundary and contains many `{` or `[` characters. The spot-check would see these as real nesting and could throw `JSON_DEPTH_EXCEEDED` incorrectly.

**Mitigating factors:** 
- The depth limit is 64, so the string would need to contain 64+ bracket characters
- This is an edge case in real-world data
- The main 1MB scan catches real depth attacks
- The false positive (rejecting a valid file) is safer than a false negative

**Fix (optional):** For each sample window, scan backward from the start position to find whether we're inside a string (look for an odd number of unescaped quotes since the last known non-string position). This is complex and may not be worth the engineering effort given the low probability.

---

## Codebase Health Assessment

### Strengths (confirmed from previous cycles)

1. **Security posture is solid**: No `eval()`, `Function()`, or `innerHTML` usage (only `dangerouslySetInnerHTML` for the CSP-hashed theme-init script). CSP hardening via post-build script. XML entity stripping. JSON depth checking. Worker isolation for large JSON parsing.

2. **Resource cleanup is thorough**: Object URLs revoked in cleanup effects. Map markers/layers removed on unmount. Event listeners cleaned up in effect returns. `mountedRef` pattern prevents state updates after unmount. Worker `terminate()` in all exit paths.

3. **Type safety is good**: `ParseError` class with machine-readable codes for i18n mapping. Proper TypeScript types throughout. No `any` usage in source files. TypeScript `--noEmit` passes clean.

4. **Antimeridian handling**: Consistent shifted-longitude interpolation across `lerpCamera`, `smoothCameraState`, and `computeBoundingBox`.

5. **Accessibility**: Modal dialogs with focus trapping and `aria-modal`. Keyboard navigation support. `inert`/`aria-hidden` on background content when modals are open. ARIA labels on interactive elements.

6. **Defense-in-depth for parsing**: Multiple size checks (FileUpload pre-check, parser check, worker check). Worker fallback to main thread on failure. Date field repair after structured clone.

7. **No TODO/FIXME/HACK comments** in source code.

8. **All console statements justified**: No extraneous debug logging.

9. **All eslint-disable comments justified**: 5 total, each with documented reasons.

10. **i18n completeness**: All user-facing strings use the translation system. The `{max}` placeholder pattern for file size messages is properly implemented across all 5 locales.

### No Regressions Detected

All previously fixed issues remain fixed. No new code quality regressions, security issues, or architectural problems beyond the findings listed above.

### Module-Level Assessment

| Module | Lines | Assessment |
|--------|-------|------------|
| `src/app/page.tsx` | 422 | Central orchestrator, clean state management |
| `src/lib/parser.ts` | 566 | Robust parsing, 5 Google formats, defense-in-depth |
| `src/components/MapView.tsx` | 883 | Complex but well-structured, proper cleanup |
| `src/lib/camera.ts` | 445 | Clean antimeridian handling, good scene system |
| `src/lib/videoEncoder.ts` | 191 | Proper abort handling, config clamping |
| `src/lib/i18n.ts` | ~1740 | Complete 5-locale coverage, type-safe keys |
| `src/components/SceneEditor.tsx` | 569 | Complex drag handling, proper cleanup |
| `src/components/JourneyCreator.tsx` | 759 | Local-only search, map interaction cleanup |
| `src/components/ElevationProfile.tsx` | 141 | Clean -- previous seek bug is fixed |
| `src/components/ExportPanel.tsx` | 326 | Good codec support detection |
| `src/components/TimelineSelector.tsx` | 375 | **Finding** (NEW-C7-1: index-based histogram) |
| `src/components/ModalDialog.tsx` | 188 | Proper stacking, focus trap, body scroll lock |
| `src/components/FileUpload.tsx` | 256 | Proper error mapping, dynamic file size limits |
| `scripts/harden-static-export.mjs` | 102 | Clean CSP hardening, HTML entity handling |

---

## Summary

| ID | Finding | Severity | Confidence | Files |
|----|---------|----------|------------|-------|
| NEW-C7-1 | TimelineSelector histogram uses index-based bucketing instead of distance-based | MEDIUM | HIGH | `src/components/TimelineSelector.tsx:70-78` |
| NEW-C7-2 | `downloadVideo` fallback may silently fail for blob URLs | LOW | MEDIUM | `src/lib/videoEncoder.ts:174-179` |
| NEW-C7-3 | `handleRangeChange` empty segmentStartIndices edge case | LOW | MEDIUM | `src/app/page.tsx:144-165` |
| NEW-C7-4 | JourneyCreator search error message not helpful for place name queries | LOW | HIGH | `src/components/JourneyCreator.tsx:66-102` |
| NEW-C7-5 | ExportPanel file size estimate doesn't account for codec compression | INFO | HIGH | `src/components/ExportPanel.tsx:308` |
| NEW-C7-6 | `checkJsonDepth` spot-check doesn't track string/escape state | LOW | LOW | `src/lib/parser.ts:337-361`, `public/workers/trackParser.worker.js:220-245` |

**Net assessment:** The codebase remains in excellent shape. The most impactful finding is NEW-C7-1 (TimelineSelector index-based histogram), which is a consistency issue rather than a bug -- the histogram is visually misleading for tracks with unevenly distributed points but doesn't cause incorrect behavior. All other findings are LOW/INFO severity. No security, correctness, or data-loss issues were found.
