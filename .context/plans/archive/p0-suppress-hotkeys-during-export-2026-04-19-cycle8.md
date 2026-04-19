# P0: Suppress Playback Hotkeys During Video Export

**Created:** 2026-04-19 (cycle 8)
**Status:** Completed
**Severity:** MEDIUM (correctness bug -- can corrupt exported video)
**Findings:** NEW-C8-1, NEW-C8-2

## Problem

During video export, the `usePlaybackHotkeys` handler does not suppress Space (play/pause), ArrowLeft/ArrowRight (seek), or F (follow camera toggle) key presses. If the user presses any of these keys while the export overlay is visible:

1. **Space** sets `isPlaying = true`, which activates the `requestAnimationFrame` animation loop in `usePlaybackController`. This loop increments `progress` based on elapsed time, competing with the export controller that also sets `progress` for each frame. The result is camera jumps/glitches in the exported video.

2. **Arrow keys** seek to a different position, also corrupting the export.

3. The export overlay in `page.tsx` also lacks `data-disable-playback-hotkeys="true"`, which would at least suppress hotkeys when focus is on that element.

## Implementation Plan

### Step 1: Add `isExporting` early-return guard to hotkey handler

**File:** `src/lib/usePlaybackController.ts`

In the `usePlaybackHotkeys` hook's `handleKey` function, add an early return after the interactive-element check:

```typescript
if (isExporting) return
```

This is the simplest and most robust approach -- it blocks ALL playback hotkeys during export, not just the ones we remember to guard individually.

### Step 2: Add `data-disable-playback-hotkeys="true"` to export overlay

**File:** `src/app/page.tsx`

Add the attribute to the export overlay div at line ~310:

```jsx
<div data-disable-playback-hotkeys="true" className="absolute inset-0 z-20 flex items-center justify-center" ...>
```

This provides defense-in-depth: even if someone refactors the early-return guard out later, the overlay still suppresses hotkeys when focused.

### Step 3: Verify build passes

```bash
npm run build
```

### Step 4: Verify no regressions in hotkey behavior when NOT exporting

Manual test: load a track, press Space/Arrow/F keys -- all should work normally.

## Progress

- [x] Step 1: Add `isExporting` guard to hotkey handler
- [x] Step 2: Add `data-disable-playback-hotkeys` to export overlay
- [x] Step 3: Build verification (passes)
- [x] Step 4: Commit and push (commit c1cb6b8)
