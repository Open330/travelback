# Archived: Address Comprehensive Deep Code Review 2026-04-15

**Archived on:** 2026-04-17
**Reason:** 8 of 11 findings from `comprehensive-deep-code-review-2026-04-15.md` are confirmed fixed. The 3 remaining unfixed/partial items (F7, F8, F6) are carried forward into active plans.

## Findings and their resolution status

| ID | Finding | Status | Carried forward to |
|---|---------|--------|-------------------|
| F1 | Worker parser rejects valid GPX/KML | FIXED | — |
| F2 | Invalid elevation/date values break UI | FIXED | — |
| F3 | Map styles overwritten by theme changes | FIXED | — |
| F4 | Overlapping scenes allowed into runtime | FIXED | — |
| F5 | Export memory duplication | FIXED | — |
| F6 | JourneyCreator touch dragging missing | PARTIAL | interaction-state-correctness (manual validation needed) |
| F7 | JourneyCreator stale icons after style reload | UNFIXED | interaction-state-correctness |
| F8 | Metadata/icon URLs hardcoded to /travelback | UNFIXED | code-quality-infrastructure |
| F9 | Documentation stale | FIXED | — |
| F10 | E2E suite misses regressions | FIXED | — |
| F11 | Modal not stack-aware | FIXED | — |

## Source reviews
- Original: `.context/reviews/comprehensive-deep-code-review-2026-04-15.md`
- Post-remediation: `.context/reviews/comprehensive-deep-code-review-post-remediation-2026-04-15.md`
- Follow-up: `.context/reviews/deep-review-followup-2026-04-15.md`
