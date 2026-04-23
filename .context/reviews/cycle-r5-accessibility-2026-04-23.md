# Cycle r5 — accessibility (2026-04-23)

## Scope

WCAG 2.2 focus: focus visibility, landmarks, form labels, keyboard reachability. Inspect cycle-r4 outputs for post-landing a11y gaps.

## Findings

### A11Y-1 (LOW, HIGH) — TimelineSelector reset button no focus-visible (WCAG 2.4.7)

- **Files**: `src/components/TimelineSelector.tsx:497-512`.
- **Fix**: add `focus-visible:outline-…`.
- **Schedule**: YES (merges UX-1 / CT-3).

### A11Y-2 (LOW, HIGH) — GlobalToolbar language select no focus-visible (WCAG 2.4.7)

- **Files**: `src/components/GlobalToolbar.tsx:49-61`.
- **Schedule**: YES (merges UX-2 / CR-3).

### A11Y-3 (LOW, MEDIUM) — Scene editor panel missing region role (WCAG 1.3.1, 4.1.2)

- **Files**: `src/components/SceneEditor.tsx:352`.
- **Schedule**: YES (merges AR-3 / UX-4).

### A11Y-4 (LOW, MEDIUM) — Journey creator panel missing region role (WCAG 1.3.1, 4.1.2)

- **Files**: `src/components/JourneyCreator.tsx:537`.
- **Schedule**: YES (merges AR-4 / UX-4).

### A11Y-5 (LOW, MEDIUM) — `<button>` missing `type="button"` in JourneyCreator cancel

- **Files**: `src/components/JourneyCreator.tsx:545-550`.
- **Schedule**: YES (defensive; merges UX-3 / CT-4).

### A11Y-6 (LOW, MEDIUM) — Cycle-r4 D1 contrast carryover

- **Schedule**: DEFER.

### A11Y-7 (LOW, MEDIUM) — Cycle-r4 D5 forced-colors carryover

- **Schedule**: DEFER.

### A11Y-8 (LOW, MEDIUM) — No `<main>` landmark assertion in e2e (cycle-r4 D6)

- **Fix**: add spec per TE-1.
- **Schedule**: YES (merges TE-1).

## Confidence summary

Schedule A11Y-1..A11Y-5 + A11Y-8 (all merging with sibling reviews). Defer A11Y-6/A11Y-7 as cycle-r4 carryovers.
