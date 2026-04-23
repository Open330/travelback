# Cycle r5 — code-reviewer review (2026-04-23)

## Scope

Source review at the top of cycle r5 with repo in clean state (tip `00000002d docs(review): record cycle r4 review, plan, deferred findings, and ingest U-2026-04-23-01`). All six quality gates were green at the start.

## Findings

### CR-1 (LOW, HIGH) — `useFocusFirstOnOpen` registers `menuRef` twice in TrackToolbar mobile menu

- **Files**: `src/components/TrackToolbar.tsx:134-156`.
- **Evidence**: The outer wrapper `<div className="relative sm:hidden" ref={menuRef}>` at L134 assigns the ref, then the inner `<div role="menu" … ref={menuRef}>` at L147 reassigns the same ref inside the conditional `menuOpen` branch (L155). React assigns the last ref callback to win, so after the menu opens the ref no longer points to the wrapper — the outside-click listener at L58-60 (`menuRef.current?.contains(event.target as Node)`) therefore evaluates against the inner panel only. Clicks on the trigger button (which is inside the wrapper but outside the panel) will close the menu. The existing e2e passes because `force: true` clicks bypass pointer-down propagation, but a real user tapping the Settings gear would see the menu collapse when they move the mouse onto a menu item that is geometrically outside the portal-less panel. It also violates the comment at L153: "Focus is managed by useFocusFirstOnOpen — fires once when menu opens".
- **Fix**: drop the second `ref={menuRef}` on the inner `<div role="menu">` — it is only used inside `useFocusFirstOnOpen` via the panel query, and `useFocusFirstOnOpen` accepts any ref that contains the first `<button>`. Alternatively, split refs (`wrapperRef` + `panelRef`) and widen the outside-click check to include either.
- **Confidence**: HIGH.

### CR-2 (LOW, HIGH) — `FileUpload.handleDragLeave` cancels the scheduled re-entry timer

- **Files**: `src/components/FileUpload.tsx:116-119` vs. `44-50`.
- **Evidence**: `scheduleDragEnd` defers clearing `isDragging` for 200ms to survive a leave-then-enter bounce. `handleDragLeave` sets `setIsDragging(false)` synchronously without first draining the timer. When the user drags slowly across the zone the synchronous `setIsDragging(false)` fires, then a pending timer can clobber future re-entries (the timer fires, tries `setIsDragging(false)` again — no-op, but we lost the bounce protection). The fix is to either (a) route `handleDragLeave` through `scheduleDragEnd` for uniform debouncing, or (b) clear the timer in `handleDragLeave` before the synchronous set.
- **Fix**: replace `setIsDragging(false)` in `handleDragLeave` with `scheduleDragEnd()`.
- **Confidence**: HIGH.

### CR-3 (LOW, HIGH) — Language `<select>` in `GlobalToolbar` has no visible focus ring like other `gi` controls

- **Files**: `src/components/GlobalToolbar.tsx:49-61`.
- **Evidence**: This select uses `className="gi min-h-11 shrink-0 px-2 py-1.5 text-xs font-medium cursor-pointer text-center"` with no `focus-visible:outline-…` utilities. The timeline handles (`TimelineSelector.tsx:370`) and the sample-preview button (cycle-r4 fix) explicitly add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`. Keyboard users who Tab onto the language control cannot see they are focused because browser default outlines are suppressed by `gi`'s normalization. Same applies to the ExportPanel resolution/quality `<select>`s which rely on `vitro-select` and should inherit a visible ring via their shared class — verify.
- **Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]` to `GlobalToolbar.tsx:53`.
- **Confidence**: HIGH.

### CR-4 (LOW, HIGH) — Cycle-r4 carryover: `videoEncoder.ts` `window as unknown as …` casts

- **Files**: `src/lib/videoEncoder.ts:175-183`.
- **Evidence**: still present; logged in deferred-findings-cycle-r4 R4-AGG-D8. Revisit when WICG types land.
- **Schedule**: defer (cycle-r4 carryover).

### CR-5 (NITS, HIGH) — `FileUpload.tsx:17` `handle` and related sample-preview props duplication can be tightened

- **Files**: `src/components/FileUpload.tsx:17`.
- **Evidence**: `onShowGoogleGuide`, `onLoadSample`, `onCreateJourney` are all optional props, but the landing variant always receives all three (`page.tsx:355-361`). Consider removing the optionality so the eight `onShowGoogleGuide ? …` / `onCreateJourney ? …` guards become unconditional. Purely stylistic; skip this cycle.
- **Schedule**: DEFER (nit, out-of-scope polish).

## Confidence summary

- CR-1, CR-2, CR-3: schedule this cycle.
- CR-4: carryover defer.
- CR-5: nit defer.
