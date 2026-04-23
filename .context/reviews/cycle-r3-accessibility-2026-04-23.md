# Cycle r3 — accessibility review (2026-04-23)

Scope: ARIA usage, keyboard navigation, screen reader support across all components.

## Findings

### R3-A11Y-1 (LOW, MEDIUM) — `ElevationProfile` still uses `role="img"` but handles arrow keys → should be `role="slider"` or paired with an invisible `<input type="range">`
- **File**: `src/components/ElevationProfile.tsx:94-102`.
- **Detail**: Same as DF-R2-008 (deferred). Still active. Component declares `role="img"` with `aria-label`, but then binds `onKeyDown` that moves `progress` by 2%. Screen readers will announce "graphic" not a slider, and the arrow-key behavior is undiscoverable.
- **Confidence**: Medium. Action deferred per DF-R2-008 exit criterion.

### R3-A11Y-2 (LOW, HIGH) — `FileUpload` landing heading is `<h2>` with no `<h1>`
- **File**: `src/components/FileUpload.tsx:191`.
- **Detail**: Carry-over of DF-R2-007. Active.

### R3-A11Y-3 (LOW, MEDIUM) — `<div role="slider">` in `SceneEditor` SceneRangeEditor lacks `aria-orientation`
- **File**: `src/components/SceneEditor.tsx:170-184`.
- **Detail**: The scene-range handles have `role="slider"`, `aria-valuenow/min/max/text`, and `tabIndex={0}`. Spec recommends `aria-orientation` for sliders that aren't visually vertical (ARIA 1.2 defaults to horizontal, so this is informational only — most screen readers assume horizontal). Adding it is a 1-line improvement.
- **Fix**: add `aria-orientation="horizontal"` to each `role="slider"` `div`.
- **Schedule**: defer — informational, no screen reader will misbehave today.

### R3-A11Y-4 (LOW, HIGH) — `isExporting` overlay `div` lacks `role="dialog"` / `aria-modal`
- **File**: `src/app/page.tsx:329-345`.
- **Detail**: The "Rendering video" overlay is a full-screen blocker with a Cancel button. It visually blocks interaction but has no dialog semantics. A sighted user with a keyboard can Tab out; screen reader users get no indication that the rest of the page is inert.
- **Fix**: wrap in `role="dialog" aria-modal="true" aria-labelledby="..."` with the label pointing at the "Rendering video" `<p>`.
- **Confidence**: High.
- **Schedule**: consider scheduling this cycle — single-attribute addition, one-line label id wiring.

### R3-A11Y-5 (INFO, HIGH) — Toast messages correctly use `role="status"` / `role="alert"` patterns
- **File**: `src/components/Toast.tsx` + `FileUpload.tsx:248` (`role="alert"` on error message).
- **Schedule**: N/A.

### R3-A11Y-6 (LOW, MEDIUM) — `ModalDialog` focus-trap correctness
- **File**: `src/components/ModalDialog.tsx`.
- **Detail**: Good — focuses first focusable on open, returns focus to opener on close, traps Tab via `keydown`. No finding.
- **Schedule**: N/A.

### R3-A11Y-7 (LOW, HIGH) — Inline-style color contrast not auditable without a browser run
- **Detail**: Many elements use CSS custom properties (`var(--t1)`, `var(--t3)`, `var(--gl)`) that are theme-dependent. Without a live theme render, we can't confirm WCAG AA contrast. Past cycles covered this via Playwright color audits; no new regressions in this cycle's diff (diff since cycle r2 is only the `Circle` aria-hidden addition).
- **Schedule**: N/A — no new changes.

## Final sweep

- No label-less form inputs (grep confirmed every `<input>` has a paired `<label>` or `aria-label`).
- No keyboard traps outside intentional modal dialogs.
- `aria-live` regions present on Toast for status announcements.
- Focus-visible outlines preserved (`focus-visible:outline-2`).

## Recommendations

- **Schedule R3-A11Y-4** this cycle (one-line addition, high confidence, material screen-reader improvement).
- Carry R3-A11Y-1/2/3 in deferred list.
