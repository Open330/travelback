# Cycle 3 Designer and Accessibility Review

Review target: `3b6750f`

## Browser observations

The current mobile hierarchy is strong: the landing actions are named, the Journey Creator remains below the toolbar, the confirmation card fits within 390×844, and export completion moves focus to `Video ready`. All measured Journey Creator actions were about 45.8px high; their narrowest width was 28.9px, still above the WCAG 2.2 24px target minimum. I found no target-size defect.

Seven representative desktop Chromium imports also passed, covering every supported format family. The mobile manual flow produced no page/console errors.

## Findings

| ID | Severity | Confidence | UX/accessibility impact | Design recommendation |
|---|---|---|---|---|
| C3-PR-001 | Medium | High | A system-cancelled timeline gesture leaves a visually moved handle with no committed count change; the next map gesture silently converts that preview into a 5/20-location trim. This violates direct manipulation and can make a traveler believe the map, not the timeline, removed most of the trip. Evidence: `src/components/TimelineSelector.tsx:368-435` and the fresh 390×844 reproduction. | On cancellation, animate/snap the handle back to the accepted range and disarm the drag. Never let a later gesture inherit the timeline interaction. Consider an aria-live announcement only for committed trims, not previews.
| C3-PR-002 | Low | High | The Export sheet’s swipe affordance can inherit a cancelled gesture and dismiss on a later cross-boundary touch (`src/components/ExportPanel.tsx:116-133,235`). It is uncommon but breaks the expectation that cancelled gestures have no effect. | Clear swipe state on `touchcancel`; preserve the current vertical-dominance threshold for genuine swipes.
| C3-PR-003 | Medium | High | The focused completion screen offers Download MP4 but tells users to export again for a local copy and may imply the file is already in Downloads (`src/components/ExportPanel.tsx:253-288`; `src/lib/i18n.ts:131-136`). The primary recovery action and explanatory copy disagree. | In `ready`, make Download MP4 the explicit next step and say that the previous save was not completed. Keep preview and Share secondary; do not mention Downloads until a save/download attempt has begun.
| C3-PR-004 | Low | High | “Approx. estimated time” and its Japanese/Spanish equivalents make an otherwise polished export sheet sound machine-translated (`src/lib/i18n.ts:119,843,1567`). | Use one estimation term per locale and have the three replacements reviewed together.

## Accessibility checks that passed

- Landing controls had usable accessible names and pressed/selected state.
- Timeline handles retained slider semantics and keyboard behavior.
- Export completion focused the success heading; Download MP4 remained visible.
- The tested mobile action targets met WCAG 2.2 minimum geometry.

## Final sweep

No additional contrast, focus-trap, responsive-overlap, or accessible-name failure was confirmed in this pass.
