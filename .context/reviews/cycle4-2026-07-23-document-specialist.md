# Cycle 4 Document Specialist Review — 2026-07-23

Reviewed revision `975dded34c849db4eb972221ed9483d3d64fb81d`.

## Outcome

Two new, actionable copy/documentation mismatches remain. Prior-cycle findings
and the three explicit native/host deferrals were excluded.

### DOC4-01 — Closeup promises a street-level view on an abstract local map

- **Severity / confidence:** Low / High
- **Locations:** `README.md:74-83`;
  `.context/project/02-architecture.md:85-96,128-131`;
  `src/lib/i18n.ts:221-233`

README and architecture describe Closeup as a “Street-level view.” The in-app
description is “Tight zoom on the route,” while the documented privacy boundary
says the bundled themes are abstract backdrops rather than road/city basemaps.
“Street-level” can therefore create an imagery/context expectation the app
cannot satisfy.

**Fix:** call it a tight route closeup with shallow pitch in both tables.

### DOC4-02 — Save-failure recovery names a button that does not exist

- **Severity / confidence:** Low / High
- **Locations:** `src/lib/i18n.ts:324,698,1072,1446,1820`;
  `src/lib/useExportController.ts:250-269`; actual action labels at
  `src/lib/i18n.ts:144,518,892,1266,1640`

All five save-failure translations direct the traveler to a generic “Download
Video” action, but the recovery button is labelled “Download MP4” (with exact
localized equivalents). This weakens an important recovery instruction.

**Fix:** use the exact Download MP4 action name in all five translations and
assert the state-specific recovery copy.

## Evidence and hygiene

The supervised development E2E run finished **114 passed / 1 intentionally
skipped / 1 failed**. The failure was the mobile Journey geometry test: after
its forced click, the Import Guide dialog was open instead of Journey Creator.
That is a test-engineering issue, not a documentation finding.

No deploy, commit, push, branch change, or production/external action occurred.
