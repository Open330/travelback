# Test Engineer Review — Cycle r7 (2026-04-23)

## Methodology

Read `e2e/travelback.spec.ts` (1134 LOC, 54 tests). Looked for
regression guards around the export-overlay dialog (the dialog that
appears while the video is rendering, not the ExportPanel config
dialog).

## Findings

### TE-1 (LOW, MEDIUM) — No regression guard for export-overlay a11y

- **File**: `e2e/travelback.spec.ts`.
- **Evidence**: `export panel uses dialog semantics and traps keyboard
  focus` at L952 asserts ExportPanel semantics. There is no test that
  covers the **export-overlay** (page.tsx:329) dialog that appears
  during rendering — specifically its `aria-modal="true"` attribute
  and (post-fix) its Escape-to-cancel behavior. Without a guard any
  future refactor of the overlay can regress these attributes silently.
- **Fix**: defer a full end-to-end export-driven test (would require
  actually triggering a video export, which we avoid in CI), but
  instead add a **static** attribute assertion: after opening
  ExportPanel and clicking Export (which yields an actual export
  flow in CI on the `virtual` codec), capture the transient overlay
  and assert `aria-modal="true"`. Since triggering a real export in
  CI is lengthy, this item is deferred to a future cycle — documented
  in the deferred register.
- **Schedule**: DEFER. Document as deferred item with exit criterion
  "export flow mockable in CI."

## Summary

One deferred finding (TE-1). No blocker for this cycle's landing.
