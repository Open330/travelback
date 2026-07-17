# Cycle 10 Document Specialist Review — 2026-07-17

Reviewed revision `3d74754369d22ad1bb9e7970634e0f0163d5b777`.

## Inventory and result

Compared `README.md`, `.context/README.md`, project overview/architecture, development conventions, the traveler brief, manifests/configuration, scripts/workflow, all user-facing source strings and locale dictionaries, authored public guides/assets, parser names, export-state copy, and test claims. Commands, runtime assumptions, import formats/limits, local-only privacy, map assets, camera/export defaults, static base path, CSP delivery, and support claims were traced back to implementation.

Two current copy contracts are inaccurate in non-default paths: import fallback titles are English-only, and an unconfirmed fallback download receives the heading “Video saved!” The broader README/project documentation remains consistent with current implementation in the reviewed areas.

## Findings

### DOC10-01 — Localized sessions contain undocumented English fallback titles

- Severity: Medium
- Confidence: High
- Status: Confirmed source copy defect
- Locations: GPX `src/lib/parser.ts:214-216`; KML `src/lib/parser.ts:228-230`; Google JSON `src/lib/googleJsonParser.ts:377-380`; missing presentation keys in `src/lib/i18n.ts`
- Problem: `GPX Track`, `KML Track`, and `Google Location History` are user-visible authored copy but live outside the five dictionaries. The app therefore cannot fulfill its localized-interface promise for unnamed imports.
- Failure scenario: a traveler chooses 한국어 and imports an unnamed supported file; the most prominent trip label changes back to English and can appear in the export name.
- Root fix: add reviewed fallback concepts to the translation contract and resolve them at display/export boundaries. Cite and test GPX, KML, and Google sources independently even though they share one ownership root.

### DOC10-02 — Fallback completion heading promises a saved file without confirmation

- Severity: Medium
- Confidence: High
- Status: Confirmed source copy/state defect
- Locations: fallback contract `src/lib/videoEncoder.ts:296-303,336-360`; `src/lib/useExportController.ts:250-264`; heading composition `src/components/ExportPanel.tsx:302-310`; translations of `export.success` in `src/lib/i18n.ts`
- Problem: every non-`ready` method is headed with `export.success`, whose English copy is “Video saved!”, even when the encoder returns `saved:false`. The adjacent `export.savedToDownloads` paragraph accurately says the download started; it is the heading that overclaims persistence.
- Failure scenario: a browser blocks the fallback anchor download and the traveler stops looking for a recovery action because Travelback says the file is saved.
- Root fix: author distinct generated-ready, download-started, and save-confirmed headings across all five locales and map them to explicit completion states.

## Consistency sweep

- README commands and named scripts match `package.json`; import families, local-only processing, bundled map behavior, size/point protections, static base path, and export limits align with current source.
- Current project architecture correctly identifies the worker parser, map/playback controls, camera scenes, export controller, and static hardening boundaries.
- Error, loading, empty, cancel, ready/download/share, guide, theme, motion, and accessibility strings were compared with consumers. Five LTR locales are shipped; no RTL support claim is made.
- The missing landing H1 is recorded by verifier/design rather than duplicated as prose documentation. No additional authoritative documentation mismatch met the evidence threshold.
- Verification context: isolated lint/type/worker/build gates and 17 files/405 unit tests passed; a 13-case, retries-off Chromium slice covering the supported import families and two complete journeys passed in 6.3 minutes. A live Korean Records import still rendered the English fallback title, so DOC10-01 is not inferred from dead code.
