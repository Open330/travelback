# Cycle 3 Documentation and Copy Review

Review target: `3b6750f`

## Findings

| ID | Severity | Confidence | Copy problem | Suggested wording |
|---|---|---|---|---|
| C3-PR-003 | Medium | High | A cancelled native save picker becomes the `ready` state (`src/lib/useExportController.ts:244-255`), but every locale’s `export.readyDescription` follows the English logic at `src/lib/i18n.ts:131`: preview/share or export again “if you still need a local copy.” The same screen already has Download MP4 at `src/components/ExportPanel.tsx:279-288`. English platform tips at `i18n.ts:134-136` can also say to find the MP4 in Downloads before a download has happened. This is especially costly after a long render. | State the outcome and next action directly: “Your video is ready, but it has not been saved yet. Choose Download MP4 or Share.” For `ready`, change platform guidance to “Choose Download MP4 first, then upload the saved file,” while keeping the existing post-download wording for `picker`/`fallback` states.
| C3-PR-004 | Low | High | `Approx. estimated time:` (`src/lib/i18n.ts:119`), `概算推定時間:` (`:843`), and `Tiempo aprox. estimado:` (`:1567`) each express approximation twice. The English phrase was reproduced in the running export panel. The reviewed-copy assertions at `src/lib/i18n.test.ts:33-36` cover only Korean, a different Japanese phrase, and Chinese. | English: `Estimated time:`. Japanese: `所要時間の目安:` (native review recommended). Spanish: `Tiempo estimado:`.

## Consistency notes

- The corrected Korean `예상 소요 시간:` and Chinese `预计时间:` are concise and should remain.
- `Video ready` is the correct heading after picker cancellation; the defect is the description and unconditional platform instruction, not the heading.
- The landing-page file-format and on-device privacy wording remained clear in the fresh accessibility snapshot.

## Final sweep

No README contradiction beyond the known LICENSE/legal-input carryover was confirmed, so that prior item is not re-filed. This role contributes two canonical findings and no additional IDs.
