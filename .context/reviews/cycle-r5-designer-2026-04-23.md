# Cycle r5 — designer / UI-UX review (2026-04-23)

## Scope

Source-side UI-UX review this cycle (no new UI work landed in cycle r4 that was unreviewed — the browser-driven probe was U-2026-04-23-01 in cycle r4). Look for small visual / affordance gaps not caught by the cycle-r4 probe.

## Findings

### UX-1 (LOW, HIGH) — `TimelineSelector` reset button lacks focus-visible outline

- **Files**: `src/components/TimelineSelector.tsx:497-512`.
- **Evidence**: same as CT-3. Control is only rendered when the user has actually trimmed; keyboard Tab lands on it blind.
- **Fix**: append `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`.
- **Schedule**: YES (merges with CT-3).

### UX-2 (LOW, HIGH) — `GlobalToolbar` language select lacks focus-visible outline

- **Files**: `src/components/GlobalToolbar.tsx:49-61`.
- **Evidence**: same as CR-3. Consistent pattern with other `gi` controls would be to add `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--gl))]`.
- **Schedule**: YES (merges with CR-3).

### UX-3 (LOW, MEDIUM) — Journey creator "Cancel" button has no `type="button"`

- **Files**: `src/components/JourneyCreator.tsx:545-550`.
- **Evidence**: defensive hardening. Currently inside a `<div>` (no form ancestor), but future refactors could place it inside a `<form>` and default-submit. Add `type="button"`.
- **Schedule**: YES (merges with CT-4).

### UX-4 (LOW, MEDIUM) — SceneEditor + JourneyCreator panels unnamed as landmarks

- **Files**: `src/components/SceneEditor.tsx:352`, `src/components/JourneyCreator.tsx:537`.
- **Evidence**: panels have `data-testid` but no `role="region"`/landmark. Screen reader users can't rotor-navigate to these panels as named regions. Not a WCAG fail (panels may be reachable via tab order), but a clear discoverability win and aligns with the cycle-r4 landmark direction.
- **Fix**: see AR-3 / AR-4.
- **Schedule**: YES (same as AR-3 / AR-4).

### UX-5 (LOW, MEDIUM) — Google guide "Need help finding your file?" copy item (cycle-r4 deferred D11)

- **Schedule**: DEFER (copy-owner review needed).

### UX-6 (LOW, MEDIUM) — 2-letter language codes (cycle-r4 deferred D10)

- **Schedule**: DEFER (copy-owner review needed).

### UX-7 (LOW, MEDIUM) — Primary CTA contrast 3.08:1 (cycle-r4 deferred D1)

- **Schedule**: DEFER (design-owner sign-off needed).

## Confidence summary

Schedule UX-1, UX-2, UX-3, UX-4 (all merge with sibling reviews). Defer UX-5..UX-7 (cycle-r4 carryovers).
