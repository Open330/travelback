# Cycle 11 Debugger — 2026-04-27

## Inventory of reviewed files

- `src/lib/parser.ts` — full read
- `src/lib/useExportController.ts` — full read
- `src/lib/videoEncoder.ts` — full read
- `src/components/MapView.tsx` — full read
- `src/components/JourneyCreator.tsx` — full read

## Findings

### DBG11-01 — DOCTYPE test failure is a latent code defect, not just a test issue (CONFIRMED, same as C11-01)

- **Severity:** MEDIUM
- **Confidence:** High
- **Files:** `src/lib/parser.ts:155-198`
- **Detail:** Tracing the code flow for `parseGPX(gpxWithDoctype)`:
  1. `parseXml(text, 'GPX')` is called
  2. `stripXmlEntities(text)` removes `<!DOCTYPE kml SYSTEM "http://evil.com/kml.dtd">` (matched by `<!DOCTYPE[^>]*>`)
  3. `preflightXml(safeText, 'GPX')` checks `if (/<!DOCTYPE|<!ENTITY/i.test(text))` — but `text` is now `safeText` which has no DOCTYPE
  4. The check passes, document is parsed normally
  5. No `ParseError` is thrown — test fails
  
  The function variable naming is misleading: `preflightXml(safeText, formatName)` passes the *already-stripped* text, but the regex checks for DOCTYPE/ENTITY that have already been removed.
- **Failure scenario:** A crafted XML with DOCTYPE is silently accepted instead of rejected. Entities are stripped so no XXE, but the stated security policy ("reject DOCTYPE") is not enforced.
- **Suggested fix:** Run `preflightXml` on the original `text` before `stripXmlEntities`.

---

### DBG11-02 — `exportVideo` double-checks `signal?.aborted` but `waitForIdle` can throw `AbortError` on abort

- **Severity:** LOW
- **Confidence:** High
- **Files:** `src/lib/videoEncoder.ts:134-161`, `src/lib/useExportController.ts:168-179`
- **Detail:** In the export frame loop, after `renderFrame` completes and the abort signal is re-checked (line 154), `waitForIdle()` is called (line 159). `waitForIdle` in MapView rejects with `AbortError` when the signal fires. But `useExportController` provides its own `waitForStableMap` wrapper that increments `consecutiveIdleTimeouts`. If the user aborts between the signal check and `waitForIdle`, the `AbortError` from `waitForIdle` propagates up to the `catch` block in `useExportController` which correctly handles it. This is not a bug — the abort path is correctly handled.
- **Failure scenario:** None — abort is handled correctly at every level.
- **Suggested fix:** No action needed. The flow is correct.

---

### DBG11-03 — `JourneyCreator` cleanup handler removes map event listeners but not always mouse/touch global listeners

- **Severity:** LOW
- **Confidence:** Medium
- **Files:** `src/components/JourneyCreator.tsx:433-450`
- **Detail:** The `cleanupRef.current` function removes map-specific listeners (`click`, `mousedown`, `touchstart`, etc.) and re-enables `dragPan`. However, if a drag is in progress when the component unmounts (user clicks "Cancel" while dragging), the global `mousemove`/`mouseup`/`touchmove`/`touchend` listeners attached in `onMouseDownPoint`/`onTouchStartPoint` may not be removed because the cleanup only removes map-level listeners.
- **Failure scenario:** If the user starts dragging a waypoint and immediately clicks "Cancel" to close JourneyCreator, the global mouse/touch listeners from the drag remain active until they fire once and the `onMouseUp`/`onTouchEnd` handler runs. This could cause a stale `updateDraggedPoint` call that tries to access a removed map source.
- **Suggested fix:** In the cleanup function, also call `map.off('mousemove', onMouseMove)`, `map.off('mouseup', onMouseUp)`, etc. for the drag handlers. Or use a single `AbortController` for all event listeners.
