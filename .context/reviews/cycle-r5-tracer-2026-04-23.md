# Cycle r5 — tracer (2026-04-23)

## Scope

Trace runtime flows for (a) the TrackToolbar mobile menu (reported CR-1 / CT-1), (b) the drop-zone drag events (CR-2), (c) the landmark vs. modal inert toggle integration.

## T-1: TrackToolbar mobile menu ref resolution

1. `TrackToolbar` renders with `menuOpen = false` → DOM is `<div ref={menuRef}>…<button onClick=…>Settings</button></div>`. `menuRef.current` = wrapper.
2. User taps Settings → `setMenuOpen(true)`. React re-renders.
3. React reconciliation calls all ref callbacks on the mount order. The outer `ref={menuRef}` is re-attached to the wrapper (no change), then the inner conditional `<div role="menu" … ref={menuRef}>` runs its ref callback. `menuRef.current` now points to the inner menu panel.
4. The effect at L55-77 subscribes `handlePointerDown` on `document`.
5. User mousedown anywhere outside the panel (including the trigger button) → `handlePointerDown(event)` runs: `if (menuRef.current?.contains(event.target as Node)) return` — the panel does NOT contain the trigger, so the guard returns false. `setMenuOpen(false)` fires.
6. Because the trigger's `onClick` also toggles, the click first closes (pointerdown) then toggles to reopen (click) — or vice-versa, depending on timing.

**Observation**: the mobile menu's open-state is fragile because React assigns only the last-rendered `ref={menuRef}` object. The outer wrapper can never be read back after open. This is the root of CR-1 / CT-1. Recommendation: drop the inner `ref={menuRef}`. `useFocusFirstOnOpen` uses `panelRef.current.querySelector('button')` — this still works on the outer wrapper because the wrapper contains the menu's first button.

## T-2: FileUpload drag state reset

1. User drags file over the drop zone → `handleDragOver` fires, sets `isDragging = true`.
2. Browser fires `dragleave` when the pointer briefly exits (e.g., crosses a child element). `handleDragLeave` sets `isDragging = false` synchronously.
3. Browser fires `dragover` again when the pointer re-enters (same drag). `setIsDragging(true)`.
4. On drop, `handleDrop` calls `scheduleDragEnd()`; the 200ms timer clears `isDragging` later.

**Observation**: a pending 200ms timer from a prior `scheduleDragEnd` can race with step 2 because `handleDragLeave` does not clear the timer. The timer eventually fires `setIsDragging(false)` again (harmless no-op at that point). The real bug is visual flicker: steps 2+3 can produce rapid border/scale flicker at 200ms+ intervals.

**Fix path**: route `handleDragLeave` through `scheduleDragEnd()` for a uniform debounce.

## T-3: Landmark-vs.-inert integration after cycle r4

1. A modal opens → `ModalDialog.openModal` runs `document.querySelector<HTMLElement>('[data-travelback-app-root="true"]')`.
2. In cycle r4 this attribute moved from `<div>` to `<main>` on `page.tsx:314`.
3. `document.querySelector` resolves to the `<main>`. `setAttribute('inert', '')` and `setAttribute('aria-hidden', 'true')` both succeed.
4. On modal close, `removeAttribute` restores. No regression.

**Observation**: compatibility with cycle-r4 change verified.

## T-4: Sample-preview caption aria-hidden (cycle r4 P-4)

- Trace: browser computes accessible name for the button via AccName algorithm. `aria-hidden="true"` on the caption wrapper excludes it from name computation. `aria-label="Try with a sample trip"` on the button takes precedence. Good.

## Confidence

- T-1: CONFIRMED bug, scheduled.
- T-2: CONFIRMED flicker race, scheduled.
- T-3: No regression.
- T-4: No regression.
