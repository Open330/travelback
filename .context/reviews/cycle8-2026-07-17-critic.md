# Cycle 8 Critic — 2026-07-17

Reviewed revision `81342b7fab1cc2577909b63025bb2452dcb5446b` read-only on `codex/review-plan-fix-2026-07-16`.

## Verdict

**PASS for new product/correctness findings.** New finding count: **0**. Travelback's implementation and visible claims are coherent after the nine Cycle 7 repairs: uncertain chronology is no longer silently reordered, missing elevation remains a gap, Help has an owned desktop location, keyboard focus/date semantics are covered, scene names remain opaque during interpolation, guide art follows locale, and import limits come from one policy.

One known legal/distribution contradiction, B03, remains blocked on owner input. The measured performance items and workflow authority items remain in their specialist ledgers; this critique does not disguise them as new product defects.

## Complete review inventory and provenance

The critique used the complete repository inventory, not only the Cycle 7 diff:

- 54 `src` paths (53 textual runtime/test paths plus favicon), covering the app shell; all 17 components; all 14 libraries; types, worker, and styles; and all 16 unit/component/worker suites.
- The full browser specification and its 18 fixtures; all seven scripts; Pages workflow; package/lock and every root build/test configuration.
- All 19 public assets, with generated worker handled by parity and binary font/favicon handled at their consumer/CSP/build boundaries.
- `README.md`, project architecture/overview, development conventions, current plan index, Cycle 6/7 implementation records, pending user instruction, aggregate, and all twelve dated Cycle 7 role reports. Superseded historical reviews/plans were inventoried and searched to avoid rediscovery, not treated as current product truth.

The whole-product trace covered file acquisition and privacy language, parse normalization, segmented/antimeridian route fidelity, map/playback/camera/scenes, timeline/elevation editing, Journey Creator, localization, responsive and keyboard/touch affordances, export estimates/codecs/save/share, error/recovery language, local-only assets/network behavior, static delivery/security claims, dependencies, testing, and licensing.

No fresh runtime or browser gate was run by this role. The exact-HEAD Cycle 7 record at `.context/plans/cycle7-implementation-2026-07-17.md:164-172` reports the complete unit/build/audit/dev/static/real-export matrix as green.

## New findings

None.

## Existing product/legal ledger — confirmed unchanged, not refiled

### B03 — The README declares MIT without a repository license grant

- Severity / confidence: **Medium / High**
- Status: **Confirmed existing; blocked on manual legal/owner input**
- File/region: `README.md:218-227`; absent root `LICENSE`
- Concrete failure: a downstream user sees “MIT” and may copy, modify, or redistribute believing the repository contains an operative grant, but the tree supplies no license text, copyright holder, or year/range. Dependency acknowledgements do not establish the application's own licensing intent.
- Fix: the owner must provide the intended license and attribution details. Then add the exact root license text and align README/package metadata. Do not infer legal intent or fabricate holder/year information.

## Whole-change criticism and rejected candidates

- The Cycle 7 parser rule now sorts only fully timed comparison domains (`src/lib/googleJsonParser.ts:228-264`), preserving producer order when chronology is uncertain. Direct and worker regressions cover the distinction. This restores trip fidelity without adding a misleading “repair.”
- Elevation geometry now emits separate valid runs (`src/components/ElevationProfile.tsx:15-82`) instead of turning unknown samples into the minimum. Its remaining linear SVG cost is D02, not a new truthfulness defect.
- The loaded desktop Help trigger moved into `TrackToolbar`, while the mobile action remains in the More dialog; current E2E proves geometry, center hit owner, dialog opening, and stable progress. The prior wrong-action failure is closed.
- All guide tabs now use locale-owned illustrations, and format limits are substituted from the enforced JSON/XML policy. Retained English static SVG files are no longer consumers; deleting them is cleanup, not a user-visible current defect, and deletion was not authorized in this review.
- A Google file whose raw accepted candidate count exceeds the point allocation cap can be rejected even if later deduplication would shrink it. The cap explicitly protects peak retained allocations before flattening (`src/lib/parse-utils.ts:45-61`; `src/lib/parser.test.ts:1419-1449`). Treating this as an output-count promise would weaken the current availability boundary, so it was not filed.
- Timeline selected-region touch behavior still needs physical browser/device evidence. No current failure was reproduced, and the gap predates Cycle 7; it remains a manual-validation note rather than a new critique.
- The bundled maps intentionally use local-only backgrounds/reference grids rather than remote cartography. README privacy language matches this design, and the route remains functional without a provider token. This is a product tradeoff, not a hidden behavior contradiction.

## What withstood the final sweep

- File formats, byte limits, local processing/privacy, worker ownership, cancellation, route segmentation, map-style privacy, export capabilities/limits, and recovery messages agree across source, UI copy, README, fixtures, and tests.
- Locale selection reaches loaded status, toolbar controls, timeline dates, guide illustrations/copy, scene normalization feedback, and export UI. No new English-only primary consumer or stale hard-coded limit was found.
- Responsive ownership now separates top toolbars, titles, bottom controls, attribution, editor panels, and Help; regressions use hit ownership and focus semantics rather than screenshots alone.
- Errors are recoverable without silently substituting an old track/export, and completed export URLs are revoked or invalidated on real state changes.

The missed-issue sweep revisited silent coercion, stale fallback, data loss, false success, misleading estimates, unsupported-browser behavior, privacy/network leakage, localization consumers, accessibility promises, static-host differences, licensing, and all Cycle 7 changed lines. No further non-duplicate issue crossed the actionable evidence threshold.
