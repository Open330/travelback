# Debugger Review - Cycle 3 (2026-04-24)

## Scope

Read-only inspection of the live source/config/test tree plus the fresh review artifacts:

- `.context/reviews/code-reviewer.md`
- `.context/reviews/security-reviewer.md`
- `.context/reviews/test-engineer.md`
- `.context/reviews/designer.md`
- `.context/reviews/critic.md`

I also checked the current source regions those reports point at so I could tell whether there were any new latent runtime bugs in the live tree.

## Result

No new confirmed debugger findings beyond the existing fresh reports.

The live code still contains the same runtime failure modes already documented in prior reviews, but this pass did not surface an additional confirmed bug that was not already captured elsewhere.

## Still-Live Runtime Bugs Already Confirmed

### 1. XML entity stripping is still incomplete
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/parser.ts:145-157`
- **Failure scenario:** `stripXmlEntities()` still uses `<!ENTITY[\s\S]*?>`, which can miss multi-line entity declarations. A GPX/KML payload with a multi-line `<!ENTITY>` block can still reach `DOMParser`, defeating the intended sanitizer and leaving parser failure modes in play.
- **Suggested fix:** Reject any DTD/entity block outright, or use a newline-safe removal pattern before parsing.
- **Status:** Already confirmed in the prior debugger review; not a new finding in this pass.

### 2. Failed export retries can destroy the previous export preview
- **Severity:** Medium
- **Confidence:** High
- **Evidence:** `src/lib/useExportController.ts:92-180`
- **Failure scenario:** `revokeExportedVideoUrl()` is still reachable before the new export path is fully validated. If a retry fails early because the track, canvas, or map handle is unavailable, the previous working preview can be revoked even though the new export never started.
- **Suggested fix:** Delay revoking the prior object URL until after validation or until the new export pipeline is definitely live.
- **Status:** Already confirmed in the prior debugger review; not a new finding in this pass.

### 3. Journey Creator can miss initialization if the map handle appears late
- **Severity:** Low
- **Confidence:** High
- **Evidence:** `src/components/JourneyCreator.tsx:243-250,417-425`
- **Failure scenario:** The effect only retries off `isActive`. If Journey Creator activates before `mapRef.current?.getMap()` exists, the initialization path can stop retrying and the panel stays inert until the user toggles the mode off and on again.
- **Suggested fix:** Add a map-ready signal to the effect dependencies, or gate activation until the map handle is available.
- **Status:** Already confirmed in the prior debugger review; not a new finding in this pass.

## Cross-Check Against Fresh Reports

- `.context/reviews/critic.md` already confirms additional runtime defects in `src/components/FileUpload.tsx`, `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`, and `src/components/JourneyCreator.tsx`.
- `.context/reviews/designer.md` already confirms the map error hard-stop in `src/components/MapView.tsx`.
- `.context/reviews/test-engineer.md` already confirms parser/export/journey coverage gaps and the dev-overlay masking issue in `e2e/travelback.spec.ts`.
- `.context/reviews/security-reviewer.md` reports no confirmed security issue.
- None of those fresh reports introduced a new debugger-specific runtime bug beyond the three already listed above.

## Conclusion

This debugger pass did not uncover any new confirmed latent runtime bug beyond what the fresh reviews already documented. The live tree still exhibits the same known failure modes, but there is no additional debugger finding to add for cycle 3.
