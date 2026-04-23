# Cycle r3 — designer (UI/UX) review (2026-04-23)

Scope: component state, ARIA, visual consistency. Multimodal caveat: no live browser run performed; review is structural (DOM + computed-style + ARIA). Evidence-based description only.

## Findings

### R3-UX-1 (LOW, HIGH) — Exporting overlay lacks dialog semantics (duplicate of R3-A11Y-4)
- **File**: `src/app/page.tsx:329-345`.
- **Selector**: `[data-disable-playback-hotkeys] > .go`.
- **Detail**: The full-screen blocker should be `role="dialog" aria-modal="true" aria-labelledby`. Ties into focus management — currently focus is not trapped. Users can Tab outside the overlay into (now-invisible) map controls.
- **Fix**: add `role="dialog" aria-modal="true" aria-labelledby="export-rendering-title"`; add the label to the `<p>`. Optionally, when `isExporting` becomes true, `focus()` the Cancel button.
- **Confidence**: High.
- **Schedule**: yes — single-element fix.

### R3-UX-2 (LOW, MEDIUM) — Landing-preview CTA caption contrast
- **File**: `src/components/FileUpload.tsx:167-176`.
- **Selector**: `.absolute.inset-x-0.bottom-0 p.text-xs.text-white\/80`.
- **Detail**: White/80 text against a `from-black/80 via-black/35 to-transparent` gradient: in the middle of the gradient, the contrast is borderline for WCAG AA (the image contents can be light). Without a live run I can't measure; but the pattern is a known risk spot.
- **Confidence**: Medium — requires live render to verify.
- **Schedule**: defer.

### R3-UX-3 (LOW, MEDIUM) — `loading ? "Parsing…" : "Browse"` button label swap breaks `aria-label` continuity
- **File**: `src/components/FileUpload.tsx:206-210`.
- **Detail**: Button has a dynamic label via `{t('fileUpload.parsing')}` or `{t('fileUpload.browse')}`, but `aria-label` stays fixed as `t('fileUpload.browseAria')`. Screen readers will always say "browse" even during parsing. Low-severity because the spinner + disabled state convey intent visually.
- **Fix**: swap `aria-label` when `loading` is true.
- **Schedule**: defer — polish.

### R3-UX-4 (INFO, HIGH) — Drop-zone visual feedback (scale/border) is fine and non-flashing
- **File**: `FileUpload.tsx:141-146`.
- **Schedule**: N/A.

### R3-UX-5 (INFO, HIGH) — Toast system correctly stacks and dismisses with transitions
- **File**: `Toast.tsx`.
- **Schedule**: N/A.

## Final sweep

- No off-screen text without `aria-hidden` or `sr-only`.
- Focus-visible outlines preserved across components.
- Modal dialog pattern (`ModalDialog.tsx`) is solid — trap + return-focus both work.

## Recommendations

- Schedule R3-UX-1 (= R3-A11Y-4).
- Defer R3-UX-2, -3.
