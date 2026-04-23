# Cycle r4 — Code Reviewer — 2026-04-23

Reviewed: `src/app/`, `src/components/`, `src/lib/`, `scripts/`. Compared against cycle-r3 deferred list to avoid double-logging.

## CR-1 (LOW, HIGH) — `src/app/page.tsx:314`: landing-root `<div>` should be `<main>` landmark

- Line 314: `<div className="relative w-screen h-screen overflow-hidden" data-travelback-app-root="true">` — no landmark semantic.
- Browser AX tree (cycle-r4 browser probe) confirms only the MapView region is exposed.
- Fix: change `<div>` → `<main>`. `ModalDialog` already targets `[data-travelback-app-root="true"]` via attribute, so no JS change needed.
- **Schedule this cycle.**

## CR-2 (LOW, HIGH) — `src/components/FileUpload.tsx:176-195`: sample-preview button concatenates visual caption and aria-label

- Child `<div class="absolute inset-x-0 bottom-0 …">` includes both an accessible caption and the pill label "Load demo". `<button>`'s accessible name (via SR fallback) ends up reading as three stacked labels.
- Fix: wrap the full caption `<div>` (lines 186-194) in `aria-hidden="true"` so AT announce only the button's `aria-label`.
- **Schedule this cycle.**

## CR-3 (LOW, HIGH) — `src/components/MapView.tsx:949`: Reload button in map-error fallback is 38px tall (< 44px touch target)

- Line 949: `className="gi mt-4 px-4 py-2 text-sm cursor-pointer"` — no `min-h-11`.
- Fix: add `min-h-11`. Aligns with every other primary button in the codebase.
- **Schedule this cycle.**

## CR-4 (LOW, HIGH) — `src/components/FileUpload.tsx:176`: no visible focus-visible ring on the sample-preview button

- Browser probe shows `boxShadow: rgba(0,0,0,0)` on focus, `outline: none 0px`.
- Fix: add `focus-visible:ring-2 focus-visible:ring-[rgb(var(--gl))] focus-visible:ring-offset-2` (or equivalent Tailwind utility).
- **Schedule this cycle.**

## CR-5 (LOW, MEDIUM) — `src/app/page.tsx:340`: `<p id="export-overlay-title">` labels the dialog but is the progress line, not the title

- Line 340 renders `<p id="export-overlay-title" className="text-lg font-medium">{t('app.renderingVideo')}</p>`. The label copy is correct ("Rendering video"), but the visual hierarchy places it second-primary after the spinner. Works functionally. No change.
- **No action.**

## CR-6 (LOW, MEDIUM) — `src/lib/videoEncoder.ts:173-183`: `showSaveFilePicker` uses `(window as unknown as …)` casts

- Carried from cycle-r3 R3-AGG-4. Still in the codebase; typing cleanup deferred.
- **Defer** (cycle-r3 carryover; unchanged).

## CR-7 (LOW, MEDIUM) — `src/components/SceneEditor.tsx:289-296`: undo-delete timer cleanup is correct but sets a new ref without nulling the stale id before reassigning

- Line 292-293: `if (undoTimerRef.current) clearTimeout(undoTimerRef.current); undoTimerRef.current = setTimeout(…)`. Correct — this is clearing before reassigning, matching the pattern introduced in cycle-r3 for `FileUpload.dragEndTimerRef`.
- **No action.**

## Summary

Schedule: CR-1, CR-2, CR-3, CR-4 (all match BUI-2, BUI-4, BUI-18, BUI-19).
Defer: CR-6 (carryover).
No other new findings this pass.
