# Comprehensive Deep Code Review — Cycle 10

**Date:** 2026-04-19
**Reviewer:** Multi-angle review (code quality, security, performance, accessibility, correctness, UX)
**Scope:** All source files in `src/`, `scripts/`, `e2e/`

---

## Executive Summary

After 9 previous review cycles and extensive remediation, the codebase is in very good shape. Most critical and high-severity issues have been addressed. This cycle produced findings primarily in the **lint hygiene** and **React patterns** categories, plus one accessibility gap and one minor correctness concern. No security vulnerabilities or data-loss risks were found.

---

## NEW-C12-1: ESLint `react-hooks/refs` errors — ref updates during render

- **Severity:** MEDIUM
- **Confidence:** HIGH
- **Files:**
  - `src/components/Toast.tsx:22-23` — `onDismissRef.current = onDismiss`
  - `src/components/ModalDialog.tsx:84-85` — `onCloseRef.current = onClose`
- **Problem:** Both components write to a ref's `.current` during the render phase, which React 19's strict lint rules flag as an error. While this pattern works correctly in practice (it's a common stable-callback ref pattern), it violates the React team's recommended usage and the ESLint rule `react-hooks/refs` now errors on it.
- **Failure scenario:** In concurrent mode, render-phase ref mutations could be torn and re-executed, leading to stale callback values. The current app is client-side only and doesn't use concurrent features heavily, so this is a latent risk rather than an active bug.
- **Fix:** Move the ref assignment into a `useEffect`:
  ```tsx
  useEffect(() => { onDismissRef.current = onDismiss }, [onDismiss])
  ```
  This is the standard pattern recommended by the React docs for keeping a ref synchronized with a prop.

---

## NEW-C12-2: ESLint `react-hooks/set-state-in-effect` warnings — cascading renders

- **Severity:** LOW
- **Confidence:** HIGH
- **Files:**
  - `src/components/ExportPanel.tsx:60-62` — `useEffect(() => { if (playbackDuration != null) setDuration(playbackDuration) }, [playbackDuration])`
  - `src/components/GoogleGuide.tsx:141` — `useEffect(() => { if (isOpen) setTab(0) }, [isOpen])`
- **Problem:** Both effects call `setState` synchronously, causing an extra render cycle. React 19's lint rules flag this as an anti-pattern.
- **Failure scenario:** Extra render per playback duration change or modal open. No functional bug, but unnecessary re-renders.
- **Fix:**
  - ExportPanel: Derive `duration` from `playbackDuration` using a `useMemo` or make the initial state sync with `useState(() => playbackDuration ?? 30)` and use a ref to track previous value. Alternatively, use `useSyncExternalStore` or simply accept the extra render but suppress the lint warning with a documented comment.
  - GoogleGuide: Reset tab in the `onClose` callback or use a key prop on the modal to force remount, rather than an effect.

---

## NEW-C12-3: Unused import `useMemo` in SceneEditor

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/components/SceneEditor.tsx:3`
- **Problem:** `useMemo` is imported but never used in the component.
- **Fix:** Remove the unused import.

---

## NEW-C12-4: Unused function `computeOverviewCamera` in camera.ts

- **Severity:** INFO
- **Confidence:** HIGH
- **File:** `src/lib/camera.ts:97`
- **Problem:** `computeOverviewCamera` is defined but never called. It was likely superseded by the inline overview camera logic in `computeCameraForScene`.
- **Fix:** Remove the dead function, or prefix with `_` if intentionally kept for future use.

---

## NEW-C12-5: Missing `aria-selected` on JourneyCreator search result options

- **Severity:** LOW
- **Confidence:** HIGH
- **File:** `src/components/JourneyCreator.tsx:610`
- **Problem:** Elements with `role="option"` must have `aria-selected` per WAI-ARIA spec and the `jsx-a11y/role-has-required-aria-props` rule.
- **Failure scenario:** Screen readers cannot communicate the selection state of search results.
- **Fix:** Add `aria-selected={false}` (or `true` if a result is highlighted) to the option button elements.

---

## NEW-C12-6: Missing dependency `t` in FileUpload `handleDrop` useCallback

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/components/FileUpload.tsx:94`
- **Problem:** The `handleDrop` callback uses `t` for the unsupported format error message, but `t` is not in the dependency array. If the locale changes while the component is mounted, the error message would be stale.
- **Failure scenario:** User changes locale from EN to KO, then drags an unsupported file — the error message would still appear in English until the component remounts.
- **Fix:** Add `t` to the dependency array of the `handleDrop` useCallback.

---

## NEW-C12-7: `checkJsonDepth` spot-check depth tracking is incorrect for large files

- **Severity:** LOW
- **Confidence:** MEDIUM
- **File:** `src/lib/parser.ts:338-360`
- **Problem:** When spot-checking at 25%, 50%, 75% offsets in large files, the code sets `sampleDepth = baseDepth` (depth at the end of the first 1MB scan). But JSON structure at those offsets may have already closed many brackets, so `sampleDepth` should really start from 0 (or the parser should track depth continuously). Starting from `baseDepth` means the spot-check could undercount nesting depth.
- **Failure scenario:** A deeply nested JSON payload that nests deep in the middle (e.g., offset 25%) but not at the start or end would pass the depth check despite exceeding the limit.
- **Fix:** Either scan the entire file linearly (simpler, slower for very large files), or track cumulative depth by also scanning the gaps between the first 1MB and each sample point. For a 500MB file this matters, but the current spot-check is a reasonable tradeoff. Low severity because the depth check is a DoS mitigation, not a correctness requirement.

---

## NEW-C12-8: `downloadVideo` fallback fetches URL that may already be revoked

- **Severity:** MEDIUM
- **Confidence:** LOW (previously deferred as F7)
- **File:** `src/lib/videoEncoder.ts:162`
- **Problem:** This is a previously deferred finding (F7). Re-noting it because it's still present. The `blob ?? await (await fetch(url)).blob()` fallback would fail if the blob URL has been revoked. In practice, `blob` is always passed, so the fetch branch is dead code.
- **Fix:** Remove the `fetch(url)` fallback entirely, or add a guard comment. This is already tracked in the deferred list.

---

## Verified Previously Fixed (Still Fixed)

| ID | Finding | Status |
|----|---------|--------|
| NEW-C11-1 | TimelineSelector distance-ratio to point-index mapping mismatch | Confirmed fixed — binary search in `ratioToIndex` |
| NEW-C11-2 | ExportPanel Share button silently fails when file sharing unsupported | Confirmed fixed — `canShare` check with test file |
| NEW-C8-1 | Playback hotkeys not suppressed during export | Confirmed fixed |
| NEW-C8-2 | Export overlay missing `data-disable-playback-hotkeys` | Confirmed fixed |
| NEW-C9-1 | `setExportState('idle')` not guarded by `mountedRef` | Confirmed fixed |
| NEW-C10-1 | `setIsPlaying`/`setFollowCamera` exposed from usePlaybackController | Confirmed fixed |

---

## Sweep: No Additional Files Skipped

All 29 source files in `src/` were reviewed. All 4 scripts in `scripts/` were reviewed. The single E2E test file was noted but not deeply analyzed (test coverage is a known gap tracked in deferred findings). No relevant files were skipped.

---

## Summary of New Actionable Findings

| ID | Finding | Severity | Confidence | Fix Effort |
|----|---------|----------|------------|------------|
| NEW-C12-1 | Ref updates during render (Toast, ModalDialog) | MEDIUM | HIGH | Small |
| NEW-C12-2 | setState-in-effect warnings (ExportPanel, GoogleGuide) | LOW | HIGH | Small |
| NEW-C12-3 | Unused `useMemo` import in SceneEditor | INFO | HIGH | Trivial |
| NEW-C12-4 | Unused `computeOverviewCamera` function | INFO | HIGH | Trivial |
| NEW-C12-5 | Missing `aria-selected` on JourneyCreator options | LOW | HIGH | Trivial |
| NEW-C12-6 | Missing `t` dependency in FileUpload handleDrop | LOW | MEDIUM | Trivial |
| NEW-C12-7 | checkJsonDepth spot-check depth undercount | LOW | MEDIUM | Medium (or defer) |
| NEW-C12-8 | downloadVideo fetch fallback for revoked URL | MEDIUM | LOW | Small (already deferred as F7) |
