# Cycle 14 Aggregate Review — 2026-04-27

Repository: `/Users/hletrd/flash-shared/Travelback`

## Review methodology

Single-pass deep code review by one agent examining all source files with full context from 4 prior aggregate reviews (50+ findings across cycles 1, 2, 12, and 13). Focus on:
1. Genuinely new findings not previously reported
2. Verifying status of carried findings
3. Cross-file interaction issues that may have been missed
4. Current committed code state

## Carried findings — status update

### Resolved since last aggregate

| Prior ID | Finding | Resolution |
|----------|---------|------------|
| C13-F01 | handleRangeChange stale pendingTrimRange | RESOLVED — `handleScenesChange` now clears `pendingTrimRange` when scenes become empty (page.tsx line 434) |
| C13-F04 | computeCameraForProgress negative gapT | RESOLVED — defensive guard added at camera.ts line 395-397, treats as within previous scene |
| C13-F06 | buildFitBounds degenerate padding too small | RESOLVED — DEGENERATE_PADDING increased to 0.1 (MapView.tsx line 217) |
| C13-F07 | exportVideo progress unclamped | RESOLVED — progress clamped with Math.max(0, Math.min(1, progress)) at videoEncoder.ts line 165 |
| C13-F08 | Scene normalization on every drag move | RESOLVED — `updateSceneRaw` applies without normalization during drag; `onCommit` fires on pointerup with normalization (SceneEditor.tsx lines 413-434, 648-651) |
| C13-F09 | isLocalExportTestStubEnabled duplicated | RESOLVED — ExportPanel now imports from `@/lib/test-stub` (ExportPanel.tsx line 11) |
| C13-F10 | 0.01ms animation duration for reduced-motion | RESOLVED — `animation: none !important` used at vitro-base.css line 769 |

### Still open (carried forward unchanged)

| Prior ID | Severity | Summary |
|----------|----------|---------|
| N01 | MEDIUM-HIGH | Per-frame trail geometry rebuild (partially resolved by precomputed segments) |
| N02 | HIGH | No unit test layer for pure functions |
| N03 | HIGH | E2E export success path exercises only stub |
| N04 | MEDIUM-HIGH | Google JSON parser duplicated in worker vs main |
| N07 | MEDIUM | normalizeBasePath triplication (partially resolved) |
| N08 | MEDIUM | Scene editor static aria-valuemin/aria-valuemax |
| N09 | MEDIUM | handleRangeChange clears all scenes on non-full trim |
| N10 | MEDIUM | Scene normalization silently mutates user intent |
| N11 | MEDIUM | Map layer ownership split across components |
| N12 | MEDIUM | Track session state spread across 12+ atoms |
| N13 | MEDIUM | Animated mesh vs prefers-reduced-motion (partially resolved — animation:none applied but `transition-duration: 0.01ms !important` still present at vitro-base.css line 770) |
| N14 | MEDIUM | Export memory guard underestimates 4K peak |
| N15 | MEDIUM | Worker crash fallback 16MB limit (partially resolved) |
| N17 | MEDIUM | Mobile toolbar dialog not truly modal |
| N18 | LOW | ExportError consistency (partially resolved — ExportError exists but videoEncoder still throws generic Error in some paths) |
| N19 | LOW | Export test stub not documented |
| N21 | LOW | isLocalExportTestStubEnabled duplicated (RESOLVED — fixed in C13-F09) |
| N22 | LOW | computeCumulativeDistances fallback in MapView |
| N23 | LOW | RTL unreadiness |
| N24 | LOW | Architecture doc missing isExporting/precomputed segments (partially resolved) |
| N25 | MEDIUM | videoEncoder double-rAF fallback without tile guarantee |
| N26 | LOW | Playback timer unmount race |
| N27 | LOW | Reference grid caching (RESOLVED — useMemo keyed on track) |
| N29 | MEDIUM | checkJsonDepth double traversal |
| N30 | MEDIUM | No test for isExporting guard |
| N31 | MEDIUM | isExporting implicit contract |
| N32 | LOW | Trail update strategy split |
| N33 | INFO | stripXmlEntities redundancy |
| N34 | LOW | Architecture doc incomplete |
| N35 | LOW | Export panel swipe conflict |
| C12-F02 | LOW | setExportProgress fires on every frame without throttling (RESOLVED — time-based throttle) |
| C12-F03 | LOW | buildFilteredTrack returns full track on degenerate slice |
| C12-F05 | LOW | No test for downloadVideo behavior |
| C13-F02 | LOW | ModalDialog openModalStack HMR stale state |
| C13-F03 | LOW | downloadVideo fallback <a> click may fail on iOS Safari |
| C13-F05 | LOW | TimelineSelector never calls onRangeChange on click-without-drag |

## New findings (deduplicated)

---

### C14-F01 — `reduced-motion: reduce` still uses `transition-duration: 0.01ms !important` instead of `0ms`

- **Severity:** LOW
- **Confidence:** High
- **Status:** Related to N13 (carried forward — animation fixed but transition not)
- **Files:** `src/styles/vitro-base.css:770`
- **Detail:** While `animation: none !important` was correctly applied (C13-F10), the `transition-duration: 0.01ms !important` remains in the reduced-motion block. A 0.01ms transition still triggers the CSS transition machinery (style recalculation + compositing step) even though the visual change is imperceptible. For users with vestibular disorders, the correct approach is `transition-duration: 0ms !important` or `transition: none !important`. The difference from animation is that transitions still "run" at 0.01ms — they complete in one frame but still invoke the transition start/end callbacks and cause a compositing step.
- **Failure scenario:** On a low-power device with reduced-motion enabled, elements that have CSS transitions (hover effects, color changes) still cause unnecessary style recalculations and compositing work per transition, even though the visual effect is imperceptible.
- **Suggested fix:** Change `transition-duration: 0.01ms !important` to `transition-duration: 0ms !important` in the `@media (prefers-reduced-motion: reduce)` block.

---

### C14-F02 — `handleScenesChange` reads stale `scenes` from closure via `value(scenes)` pattern

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/app/page.tsx:430-437`
- **Detail:** `handleScenesChange` accepts `SetStateAction<Scene[]>` and calls `const resolved = typeof value === 'function' ? value(scenes) : value` to detect when scenes become empty and clear `pendingTrimRange`. However, `scenes` in this closure is captured from the component's render scope, not from a ref. If `setScenes(value)` triggers a re-render that commits before `resolved` is computed, the `scenes` variable used in `value(scenes)` could be stale. In React 18+ with automatic batching this is unlikely to cause issues in practice, but the pattern is fragile — it depends on the synchronous nature of `setScenes` and the function updater running against the current state at the time of the call, not the render-scope `scenes`.
- **Failure scenario:** In a concurrent rendering scenario, `scenes` in the closure could be stale, causing `resolved` to reflect an outdated state. The `pendingTrimRange` cleanup may not fire when it should, or may fire incorrectly.
- **Suggested fix:** Move the `pendingTrimRange` cleanup into a `useEffect` that watches `scenes.length` and `pendingTrimRange`, rather than trying to compute it synchronously in the callback. Alternatively, use a ref for `scenes` to avoid stale closures.

---

### C14-F03 — `useExportController` `exportTrack` depends on `scenes` in its dependency array but reads `scenes` directly for `exportScenes`

- **Severity:** LOW-MEDIUM
- **Confidence:** High
- **Files:** `src/lib/useExportController.ts:152-154`
- **Detail:** In `exportTrack`, `const exportScenes = scenes.length > 0 ? scenes : generateDefaultScenes()` reads `scenes` directly from the callback's closure. While `scenes` is in the dependency array (line 297), this means `exportTrack` is recreated on every scenes change. For an async function that may be running during a scenes change, the old closure's `scenes` value is used for the already-running export (which is correct behavior — you don't want mid-export scene changes). However, the dependency array inclusion means `exportTrack` identity changes frequently, which could cause unnecessary re-renders in components that receive it as a prop.
- **Failure scenario:** Frequent scene edits cause `exportTrack` to be recreated on every change. Components receiving `exportTrack` as a prop re-render unnecessarily.
- **Suggested fix:** Store `scenes` in a ref (`scenesRef`) and read from the ref inside `exportTrack`, removing `scenes` from the dependency array. The export already captures scenes at the start of the async function, so this is semantically equivalent.

---

### C14-F04 — `usePlaybackController` fallback timer can fire after component unmount

- **Severity:** LOW
- **Confidence:** High
- **Status:** Related to N26 (carried forward) but more specific
- **Files:** `src/lib/usePlaybackController.ts:119`
- **Detail:** The `animate` function is scheduled via both `requestAnimationFrame` and a 250ms `setTimeout` fallback. The cleanup function at line 149-153 cancels both. However, the `animate` function calls `scheduleNextFrame()` which schedules a new pair. If the component unmounts between when `animate` runs and when the cleanup function cancels the timers, the `mountedRef.current` guard (line 125) prevents state updates. But the `setTimeout` fallback timer is still scheduled and will fire — the only thing preventing state mutation is the `mountedRef` check inside `animate`. If `animate` is called by the fallback timer after unmount, it reads `isPlayingRef.current` (false after unmount) and returns early. This is safe in practice but wastes a timer callback.
- **Failure scenario:** Minor — a 250ms timer fires after component unmount, reads `isPlayingRef.current === false`, returns early. No state mutation, but unnecessary work.
- **Suggested fix:** No action needed — the existing `mountedRef` guard is sufficient. Documenting as a known minor pattern.

---

### C14-F05 — `checkJsonDepth` does not handle multi-byte UTF-8 characters correctly in string detection

- **Severity:** LOW
- **Confidence:** Medium
- **Status:** Related to N29 (carried forward)
- **Files:** `src/lib/parser.ts:511-529`
- **Detail:** `checkJsonDepth` iterates character-by-character (`text[i]`) to track JSON nesting depth while skipping string literals. In JavaScript, `string[i]` returns UTF-16 code units, not Unicode code points. For strings containing characters outside the Basic Multilingual Plane (e.g., emoji, CJK extension B), a single character is represented as two UTF-16 code units (a surrogate pair). The `ch === '"'` check will never match the second half of a surrogate pair, so it cannot prematurely break out of a string. However, if a JSON key or value contains a lone surrogate (which is invalid JSON but could appear in a malformed file), the character-by-character iteration could miscount depth if a `"` appears as the second half of a surrogate pair. In practice, `JSON.parse` would reject such files before `checkJsonDepth` is called on the main thread, but the worker uses `checkJsonDepth` as a preflight check.
- **Failure scenario:** A malformed Google JSON file with lone surrogates could cause `checkJsonDepth` to miscount nesting depth, either passing a file that should fail or rejecting a valid file. Extremely unlikely in practice since Google exports use ASCII keys and the depth tracker only matters for `{`/`}` outside strings.
- **Suggested fix:** Use `for (const ch of text)` instead of `for (let i = 0; i < text.length; i++)` to iterate over Unicode code points rather than UTF-16 code units. This is semantically more correct and handles surrogate pairs properly.

---

### C14-F06 — `SceneEditor` `removeScene` calls `commitScenes` which normalizes, but `setDeletedScene` stores the pre-normalization scene for undo

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/SceneEditor.tsx:363-367`
- **Detail:** When a scene is removed, `removeScene` first captures the scene from the current array (`scenes[idx]`) into `deletedScene`, then calls `commitScenes(scenes.filter(...))` which normalizes the remaining scenes. If the user then clicks "Undo", the scene is re-inserted at its original position with its original (pre-normalization) range values. When `commitScenes` is called on the restored array, normalization may adjust the restored scene's ranges, potentially producing a different result than the original state before the deletion.
- **Failure scenario:** User has scenes A(0-0.3) and B(0.3-0.6). They delete scene A. Scene B is normalized to B(0-0.6). User undoes. Scene A(0-0.3) is re-inserted before B(0.3-0.6). But the undo restored B's range as (0.3-0.6), not the original. If B had been adjusted during normalization after deletion, undo restores stale values. In this specific case the values happen to be consistent, but with overlapping scenes the undo could produce unexpected results.
- **Suggested fix:** Store the entire scenes array snapshot before deletion and restore it on undo, rather than splicing a single scene back into the current (post-normalization) array.

---

### C14-F07 — `buildFitBounds` does not handle antimeridian-wrapped degenerate bounds correctly

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/MapView.tsx:193-228`
- **Detail:** When all track points are coincident and the track crosses the antimeridian (e.g., a point at longitude 179.9 and another at -179.9), `buildFitBounds` first extends the bounds in shifted coordinates (0-360 range), then checks for degenerate bounds using `bounds.getSouthWest().lng` vs `bounds.getNorthEast().lng`. However, after wrapping the shifted coordinates through `bounds.extend()`, the SW/NE values may be in shifted space (e.g., SW.lng=179.9, NE.lng=180.1). The degenerate check uses `Math.abs(SW.lng - NE.lng) < 1e-10`, which would correctly detect the non-degenerate case. But the `DEGENERATE_PADDING` of 0.1 degrees is applied in the original coordinate space, not the shifted space, which could produce an asymmetric padding when the center is near the antimeridian.
- **Failure scenario:** A degenerate track at longitude 179.95 produces bounds centered near 180 degrees. Adding 0.1 degrees of padding gives SW.lng=179.85, NE.lng=180.05, but the NE value may wrap to -179.95, producing a bounds that spans the entire world instead of a small region around 180.
- **Suggested fix:** Apply `DEGENERATE_PADDING` in the same coordinate space as the bounds — if the bounds were computed in shifted space, pad in shifted space.

---

### C14-F08 — `ExportPanel` `handleShare` silently fails without user feedback when `navigator.share` throws non-AbortError

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/components/ExportPanel.tsx:169-180`
- **Detail:** `handleShare` catches `DOMException` with `name === 'AbortError'` (user cancelled share dialog) and returns silently, which is correct. But for other errors (e.g., `NotAllowedError` when share is called without user activation, or `DataError` when the file is too large for the share API), the function only logs to console.error without showing any user feedback. The user taps "Share" and nothing happens visible — no toast, no error message.
- **Failure scenario:** User taps Share on a device where `navigator.share` is supported for files but the share dialog fails for a non-obvious reason (e.g., the file is too large for the system share sheet). No error is shown.
- **Suggested fix:** Add a toast message for non-AbortError share failures, similar to the export error handling pattern.

---

## Verified this cycle

| Claim | Verdict |
|-------|---------|
| ESLint passes with zero errors/warnings | VERIFIED |
| TypeScript `--noEmit` passes | VERIFIED |
| `next build` succeeds | VERIFIED |
| `isExporting` guard suppresses MapView progress effect | VERIFIED — line 1063 of MapView.tsx |
| Precomputed segments used for trail updates | VERIFIED — lines 1087-1135 of MapView.tsx |
| `renderFrameAndWait` has 5s timeout | VERIFIED — line 647 of MapView.tsx |
| `resetSize` clears container styles before map.resize() | VERIFIED — lines 683-698 of MapView.tsx |
| `downloadVideo` no longer checks user activation | VERIFIED — line 211 of videoEncoder.ts |
| Export progress throttle uses 100ms interval | VERIFIED — lines 209-212 of useExportController.ts |
| Reference grid cached via useMemo keyed on track | VERIFIED — line 473 of MapView.tsx |
| `normalizeBasePath` rejects `..` | VERIFIED — line 5 of env.ts |
| `buildFilteredTrack` returns `null` for degenerate slices | VERIFIED — line 42 of page.tsx |
| `pendingTrimRange` cleared when scenes emptied | VERIFIED — lines 434-436 of page.tsx |
| Gap negative-t guard in computeCameraForProgress | VERIFIED — lines 395-397 of camera.ts |
| DEGENERATE_PADDING is 0.1 | VERIFIED — line 217 of MapView.tsx |
| Progress clamped to [0,1] in exportVideo | VERIFIED — line 165 of videoEncoder.ts |
| SceneEditor uses updateSceneRaw during drag + onCommit | VERIFIED — lines 413-434, 648-651 of SceneEditor.tsx |
| ExportPanel imports isLocalExportTestStubEnabled from test-stub.ts | VERIFIED — line 11 of ExportPanel.tsx |
| `animation: none !important` for reduced-motion | VERIFIED — line 769 of vitro-base.css |
| `handleScenesChange` clears pendingTrimRange when scenes empty | VERIFIED — lines 434-436 of page.tsx |

## Finding count summary

| Severity | Count | New this cycle | Carried from prior cycles |
|----------|-------|----------------|--------------------------|
| HIGH | 2 | 0 | N02, N03 |
| MEDIUM-HIGH | 2 | 0 | N01, N04 |
| MEDIUM | 13 | 1 (C14-F02) | 12 carried |
| LOW-MEDIUM | 2 | 1 (C14-F03) | 1 carried (C13-F04 resolved) |
| LOW | 12 | 5 (C14-F01, C14-F05, C14-F06, C14-F07, C14-F08) | 7 carried |
| INFO | 1 | 0 | N33 |
| **Total new** | **7** | **7** | — |

## Actionable this cycle

1. **C14-F01** (LOW) — Change `transition-duration: 0.01ms !important` to `0ms !important` in reduced-motion block
2. **C14-F02** (MEDIUM) — Move `pendingTrimRange` cleanup to a `useEffect` watching `scenes.length` instead of computing in `handleScenesChange` closure
3. **C14-F03** (LOW-MEDIUM) — Store `scenes` in a ref inside `useExportController` to avoid recreating `exportTrack` on every scene change
4. **C14-F06** (LOW) — Store full scenes array snapshot before deletion for undo instead of splicing single scene back
5. **C14-F08** (LOW) — Add toast feedback for non-AbortError share failures in ExportPanel
