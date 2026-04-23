# Cycle r5 — critic review (2026-04-23)

## Scope

Skeptical source review: look for "too clever", false invariants, accessibility-vs.-UX tensions, comment/code drift, and places where cycle-r4 changes created a regression.

## Findings

### CT-1 (LOW, HIGH) — `TrackToolbar` dual-ref regression introduced in cycle 12/13 still lurking

- **Files**: `src/components/TrackToolbar.tsx:134-155`.
- **Evidence**: see code-reviewer CR-1. Confirming the regression: when `menuOpen = true`, React reconciles and assigns `menuRef.current` to the inner `<div role="menu">` (last ref wins). Then `handlePointerDown(event)` at L58-60 checks `menuRef.current?.contains(event.target)`. The trigger button lives inside the outer wrapper but is NOT inside the panel — `contains` returns false for every click on the trigger. Result: clicking the gear icon to close re-fires `setMenuOpen(false)` regardless of user intent, but since `menuOpen` was already true, pointerdown → `setMenuOpen(false)` → React closes. Seems to work by accident: the trigger's own onClick toggles, pointerdown closes, toggle back to open racey … actual behavior is user hits the trigger and the menu closes then immediately reopens, producing a flicker on certain pointer orderings. Low severity because the test `uses force:true` hides it.
- **Fix**: drop inner `ref={menuRef}`. See CR-1.
- **Schedule**: YES (same item as CR-1).

### CT-2 (LOW, HIGH) — `FileUpload.handleDragLeave` comment-free synchronous reset

- **Files**: `src/components/FileUpload.tsx:116-119`.
- **Evidence**: agrees with CR-2. Source inconsistency: drop-zone uses debounced `scheduleDragEnd` everywhere except the leave path; the asymmetry is subtle and not called out in comments.
- **Schedule**: YES (same item as CR-2).

### CT-3 (LOW, MEDIUM) — `timelineSelector.reset` button has no visible focus outline

- **Files**: `src/components/TimelineSelector.tsx:497-512`.
- **Evidence**: rendered only when `startRatio > 0.001 || endRatio < 0.999`. Uses `inline-flex items-center gap-0.5 cursor-pointer` with no `focus-visible:outline`. A keyboard user tabbing through the timeline skip through this control blind. Low severity; quick add.
- **Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`.
- **Schedule**: YES.

### CT-4 (LOW, MEDIUM) — `JourneyCreator.onCancel` top-right button lacks aria-label

- **Files**: `src/components/JourneyCreator.tsx:545-550`.
- **Evidence**: `<button onClick={…} className="text-xs transition-colors" …>{t('journey.cancel')}</button>`. The visible text is localized ("Cancel"), so screen readers get that, but there's no `type="button"` (defaults to submit when inside a form, though here there's no form). No discernable-name issue; just missing explicit `type="button"`. Low severity defensive fix.
- **Fix**: add `type="button"`.
- **Schedule**: YES (trivial hardening).

### CT-5 (INFO, HIGH) — comment at `TrackToolbar.tsx:153` describes intent contradicted by double-ref

- **Files**: `src/components/TrackToolbar.tsx:153-155`.
- **Evidence**: "// Focus is managed by useFocusFirstOnOpen — fires once when menu opens". Correct intent; implementation just happens to work because `useFocusFirstOnOpen` looks for the first `<button>` descendant and that descendant exists in either ref target. After CT-1 fix, the comment remains accurate and no code change is needed beyond dropping the duplicate ref.
- **Schedule**: no action (resolved by CT-1 fix).

## Confidence summary

Schedule CT-1 (merge with CR-1), CT-2 (merge with CR-2), CT-3, CT-4. CT-5 resolves as a side-effect of CT-1.
