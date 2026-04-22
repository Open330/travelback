# Cycle 17 Implementation Plan (2026-04-23)

Source: `.context/reviews/_aggregate.md` (cycle 1 fresh review, 9 agents)

## P0 — Correctness Bugs (must fix)

### P0-1: Remove FileUpload duplicate size check
- **Finding**: F1
- **Files**: `src/components/FileUpload.tsx:39-42`
- **Action**: Remove the `file.size > maxForType` check from `handleFile`. Let `parseTrackFile` handle it via `ParseError` with `FILE_TOO_LARGE` code. The existing `errorCodeMap` in FileUpload's catch block already handles `FILE_TOO_LARGE` correctly.
- **Verify**: Upload a >200MB non-JSON file; confirm "too large" message appears (not "parse failed").

### P0-2: Persist map style to localStorage on cycle
- **Finding**: F2
- **Files**: `src/app/page.tsx:293-303`, `src/app/layout.tsx:49`
- **Action**: (1) In `cycleStyle`, add `localStorage.setItem('travelback-mapstyle', nextKey)`. (2) In `handleModeChange`, when auto-setting mapstyle, also persist. (3) In bootstrap script, read `travelback-mapstyle` from localStorage and use it if present (otherwise derive from theme as now). (4) In the `mapStyleKey` useState initializer, also check localStorage.
- **Verify**: Cycle to Liberty style, reload, confirm Liberty persists.

### P0-3: Fix handleRangeChange segment index filter
- **Finding**: F3
- **Files**: `src/app/page.tsx:184`
- **Action**: Change `.filter((index) => index > 0)` to `.filter((index) => index >= 0)`. A segment start that maps to index 0 after subtraction represents a valid segment break at the beginning of the sliced track. The original filter incorrectly removes it.
- **Verify**: Load a track with multiple segments, set range starting at a segment boundary, confirm first segment break preserved.

### P0-4: Add unmount guard to usePlaybackController
- **Finding**: F6
- **Files**: `src/lib/usePlaybackController.ts`
- **Action**: Add `mountedRef` pattern: (1) `const mountedRef = useRef(true)`, (2) `useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])`, (3) Guard `setPlaybackProgress` and `setIsPlaying` calls in `animate` with `if (!mountedRef.current) return`.
- **Verify**: Start playback, navigate away quickly, confirm no React unmount warning.

### P0-5: Fix Korean export.at empty translation
- **Finding**: F7
- **Files**: `src/lib/i18n.ts:443`
- **Action**: Change `'export.at': ''` to `'export.at': 'at'` for Korean locale. Korean commonly uses English loanwords for short prepositions in tech contexts, and the existing CJK locales (ja, zh) use '/' which is a symbol, but Korean uses 'at' naturally in this spec-line context.
- **Verify**: Switch to Korean, open export panel, confirm spec reads "1920x1080 MP4 at 30fps" not "1920x1080 MP4  30fps".

### P0-6: Fix reader.onerror to use ParseError
- **Finding**: F8
- **Files**: `src/lib/parser.ts:566`
- **Action**: Change `reject(new Error('Failed to read file'))` to `reject(new ParseError('Failed to read file', 'READ_FAILED'))`. Add `'READ_FAILED': 'fileUpload.parseFailed'` to `errorCodeMap` in FileUpload.tsx.
- **Verify**: Trigger a file read error, confirm proper error message.

### P0-7: Fix ThemeToggle matchMedia calling onModeChange when controlled
- **Finding**: F9
- **Files**: `src/components/ThemeToggle.tsx:33-38`
- **Action**: In the matchMedia change handler, the `if (controlledMode == null)` guard already prevents `setMode` when controlled, but `onModeChange?.(newMode)` is called unconditionally. Move `onModeChange?.(newMode)` inside the `if (controlledMode == null)` block so that when a parent controls the mode, the OS-level preference change doesn't override the explicit user choice.
- **Verify**: Set dark mode via toolbar, change OS to light, confirm app stays dark.

### P0-8: Differentiate Toast aria-live by severity
- **Finding**: F23
- **Files**: `src/components/Toast.tsx:64`
- **Action**: Change the container `aria-live` to be dynamic: `aria-live={message.type === 'error' ? 'assertive' : 'polite'}`. Since messages have different types, this may require splitting into two regions or using a single region that changes. Simplest approach: split into two `div` containers — one `aria-live="assertive"` for errors, one `aria-live="polite"` for others.
- **Verify**: Trigger error toast, confirm screen reader announces immediately.

## P1 — Quality Improvements (should fix)

### P1-1: Implement scene overlap detection in SceneEditor
- **Finding**: F4
- **Files**: `src/components/SceneEditor.tsx`, `src/lib/i18n.ts`
- **Action**: Add overlap detection to `commitScenes` validation. Check if any scene's range overlaps another. Use existing i18n keys `scenes.overlap` and `scenes.overlapSuffix` to build warning message (e.g., "Scene A and Scene B overlap").
- **Verify**: Create two overlapping scenes, confirm warning appears.

### P1-2: Fire TimelineSelector onRangeChange during drag
- **Finding**: F10
- **Files**: `src/components/TimelineSelector.tsx`
- **Action**: In `applyDrag`, after updating `startRatio`/`endRatio` state, also call `onRangeChangeRef.current` with the resolved range indexes. The existing rAF throttle already prevents excessive updates.
- **Verify**: Drag timeline handles, confirm track data updates during drag (not just on release).

### P1-3: Add map-exists guard in export cleanup waitForIdle
- **Finding**: F18
- **Files**: `src/lib/useExportController.ts:195-200`
- **Action**: Before calling `mapViewRef.current?.waitForIdle`, add a guard: `if (!mapViewRef.current) return`. Also wrap in try/catch (already present) but also check if the map container still exists in the DOM.
- **Verify**: Cancel export while map is being destroyed, confirm no unhandled rejection.
