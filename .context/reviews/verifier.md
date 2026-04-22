# Verifier Review — Cycle 1 (2026-04-23)

## Summary
Evidence-based correctness check against stated behavior. Verified by tracing code paths and validating assumptions.

---

## Finding 1: FileUpload duplicate size check breaks error code path — CONFIRMED
- **File**: `src/components/FileUpload.tsx` lines 39-42, `src/lib/parser.ts` lines 520-527
- **Severity**: Medium | **Confidence**: High
- **Evidence**: Traced the code path: (1) FileUpload checks `file.size > maxForType` and throws `new Error(t(...))` — a plain Error, NOT a ParseError. (2) In the catch block, `err instanceof ParseError` is false, so `code` is `''`, `matchedKey` is `''`, `isFileTooLarge` is false. (3) Falls through to `setError(t('fileUpload.parseFailed'))` — WRONG message for a file-too-large error. (4) Meanwhile, `parseTrackFile` has the same check with proper ParseError/FILE_TOO_LARGE code, but it never gets reached because FileUpload's check fires first.
- **Fix**: Remove the duplicate check from FileUpload, letting parseTrackFile handle it properly.

---

## Finding 2: Map style not persisted across page reloads — CONFIRMED
- **File**: `src/app/page.tsx` lines 293-303
- **Severity**: Medium | **Confidence**: High
- **Evidence**: (1) `handleModeChange` (line 281) calls `localStorage.setItem('travelback-theme', mode)`. (2) `cycleStyle` (line 293) sets `setMapStyleKey(nextKey)` and calls `applyDocumentMapStyle(nextKey)` but does NOT call `localStorage.setItem`. (3) Bootstrap script (layout.tsx line 49) only reads `travelback-theme` for mode, then derives mapstyle from mode: `m==='dark'?'dark':'voyager'`. (4) So cycling to e.g. "Liberty" style (which is light mode) loses the choice on reload — page shows "Voyager" instead.
- **Fix**: Persist the explicit map style choice to localStorage in `cycleStyle` and read it in the bootstrap script.

---

## Finding 3: `handleRangeChange` drops segment start at boundary — CONFIRMED
- **File**: `src/app/page.tsx` lines 180-186
- **Severity**: Medium | **Confidence**: Medium
- **Evidence**: Traced with example: track has segmentStartIndices=[5, 10], startIdx=5, endIdx=15. After filter: indices [5,10] pass. After map: [0,5]. After filter(index>0): [5]. The segment start at mapped index 0 (original index 5) is dropped. This means the first segment break in a sliced track is lost.
- **Fix**: The filter should be `index >= 0` but also the mapped index 0 should be preserved as a segment break in the sliced track.

---

## Finding 4: Export video filename sanitization works correctly — VERIFIED
- **File**: `src/lib/videoEncoder.ts` lines 147-153
- **Severity**: Info | **Confidence**: High
- **Evidence**: The sanitization: (1) NFKC normalization, (2) removes `<>:"/\|?*` and control chars, (3) collapses whitespace, (4) trims, (5) slices to 64 chars, (6) falls back to "Journey". This correctly handles Unicode track names and prevents filesystem-incompatible characters.

---

## Finding 5: Playback accumulator pattern correctly avoids drift — VERIFIED
- **File**: `src/lib/usePlaybackController.ts` lines 82-93
- **Severity**: Info | **Confidence**: High
- **Evidence**: The accumulator-based approach records `startTimestampRef` and `startProgressRef` when playback starts, then computes `nextProgress = startProgress + (elapsed * speed) / duration` from wall-clock time. This eliminates floating-point accumulation error and frame-rate dependency. Correct.

---

## Finding 6: Scene overlap i18n keys exist but are never triggered — CONFIRMED
- **File**: `src/lib/i18n.ts`, `src/components/SceneEditor.tsx`
- **Severity**: Low | **Confidence**: High
- **Evidence**: Searched all `.tsx` files for `scenes.overlap` and `scenes.overlapSuffix` usage. These keys are defined in i18n but never referenced in any component code. The overlap detection code is missing.

---

## Final Sweep
- All critical code paths traced and verified.
- Focus on correctness claims validated against actual implementation.
- No skipped files.
