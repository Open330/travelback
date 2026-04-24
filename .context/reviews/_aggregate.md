# Aggregate Review - Review-Plan-Fix Cycle 3

## Review Lanes

- `code-reviewer.md`: 3 confirmed findings.
- `security-reviewer.md`: 0 confirmed security findings; 2 residual hardening assumptions.
- `test-engineer.md`: 6 confirmed test/gate coverage findings.
- `architect.md`: 6 architecture findings.
- `designer.md`: 3 confirmed UI/accessibility findings.
- `critic.md`: 4 confirmed runtime/UX findings.
- `debugger.md`: 0 new debugger findings beyond the fresh reports.
- `verifier.md`: 0 new verifier findings beyond the fresh reports.

The first debugger and verifier lanes hung and were closed; both were retried once with bounded read-only prompts and returned. No final agent failure remains.

## Deduplicated Findings

### FIX-C3-001 - Confirmation dialogs render unstyled
- Severity: Medium
- Confidence: High
- Sources: `code-reviewer.md`
- Evidence: `src/components/SceneEditor.tsx:669-690`, `src/components/JourneyCreator.tsx:817-830`, `src/components/ModalDialog.tsx:74-76`
- Failure scenario: replace/discard confirmations render as bare full-width strips instead of centered modal panels.

### FIX-C3-002 - Follow camera skips progress zero
- Severity: Medium
- Confidence: High
- Sources: `code-reviewer.md`
- Evidence: `src/components/MapView.tsx:863`
- Failure scenario: seeking/restarting at the beginning resets marker/trail but leaves the camera at a stale mid-route view until progress advances.

### FIX-C3-003 - Export follow-up actions lose generated filename
- Severity: Medium
- Confidence: High
- Sources: `code-reviewer.md`, `critic.md`
- Evidence: `src/lib/videoEncoder.ts:147-157`, `src/lib/useExportController.ts:165-173`, `src/components/ExportPanel.tsx:146-152`, `src/components/ExportPanel.tsx:237-240`
- Failure scenario: post-export download/share uses `travelback.mp4` instead of the generated `Travelback - <track>.mp4`.

### FIX-C3-004 - Fallback downloads are shown as only ready
- Severity: Medium
- Confidence: High
- Sources: `critic.md`
- Evidence: `src/lib/videoEncoder.ts:161-211`, `src/lib/useExportController.ts:165-172`, `src/components/ExportPanel.tsx:215-222`
- Failure scenario: browsers that use anchor-download fallback start a download, but the UI says the video is merely ready, encouraging duplicate downloads.

### FIX-C3-005 - Replacement uploads fail silently after a track is loaded
- Severity: Medium
- Confidence: High
- Sources: `critic.md`, `verifier.md`
- Evidence: `src/components/FileUpload.tsx:52-152`
- Failure scenario: after a successful import, choosing an invalid replacement file records an error that is never rendered in the compact loaded-track branch.

### FIX-C3-006 - Journey icon picker does not affect route visuals
- Severity: Low
- Confidence: High
- Sources: `critic.md`, `verifier.md`
- Evidence: `src/components/JourneyCreator.tsx:52-60`, `src/components/JourneyCreator.tsx:170-227`, `src/components/JourneyCreator.tsx:695-719`
- Failure scenario: the UI presents a travel-icon picker, but the map renders only circles; the icon only prefixes the final track name.

### FIX-C3-007 - Landing map error is hidden behind the upload overlay
- Severity: High
- Confidence: High
- Sources: `designer.md`
- Evidence: `src/components/MapView.tsx:947-975`, `src/components/FileUpload.tsx:155-172`
- Failure scenario: first-load map failure leaves visible upload UI on top of invisible retry controls and creates confusing tab order.

### FIX-C3-008 - Primary accent buttons fail text contrast
- Severity: High
- Confidence: High
- Sources: `designer.md`
- Evidence: `src/app/globals.css:127-132`, `src/components/FileUpload.tsx:231-239`, `src/components/Controls.tsx:80-87`, `src/components/GlobalToolbar.tsx:27-42`
- Failure scenario: white text/icons on the teal accent fill measure about 2.15:1, below WCAG contrast for normal-size controls.

### FIX-C3-009 - Landing helper and guide CTA contrast is too low
- Severity: Medium
- Confidence: High
- Sources: `designer.md`
- Evidence: `src/components/FileUpload.tsx:225-229`, `src/components/FileUpload.tsx:265-286`
- Failure scenario: format helper copy and the import-guide CTA are hard to read on the landing card.

### FIX-C3-010 - Static e2e gate uses a fixed port
- Severity: Medium
- Confidence: High
- Sources: `test-engineer.md`
- Evidence: `playwright.static.config.ts:3-44`, `package.json:14-16`
- Failure scenario: `npm run test:e2e:static:ci` fails in shared/local workspaces when port 4173 is already occupied.

### FIX-C3-011 - Export request shape overloads ambient scene state
- Severity: Medium
- Confidence: High
- Sources: `architect.md`
- Evidence: `src/components/ExportPanel.tsx:140-144`, `src/lib/useExportController.ts:112-123`
- Failure scenario: an empty `scenes` request can unexpectedly use editor scenes or generated scenes.

### FIX-C3-012 - Export cleanup falls through to DOM test selectors
- Severity: Medium
- Confidence: High
- Sources: `architect.md`
- Evidence: `src/lib/useExportController.ts:196-209`, `src/components/MapView.tsx:26-34`
- Failure scenario: cleanup can fail to restore map dimensions if the selector changes after a map reset failure.

## Deferred Findings

The following review findings are recorded in `plan/deferred-cycle3-review-2026-04-24.md`: parser implementation duplication, theme bootstrap duplication, raw MapLibre ownership, CSP hardener fragility, dev overlay masking, parser/export/journey coverage gaps, English-copy-coupled assertions, security hardening assumptions, and the stale debugger repeats that were not confirmed in the current source.
