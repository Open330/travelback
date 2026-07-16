# Cycle 7 Critic — 2026-07-17

## Verdict

COMMENT. Travelback's core local-file workflow is coherent and unusually well defended by tests, but two silent transformations undermine faithful trip representation and one desktop affordance sends a click to the wrong control. A lower-severity localization inconsistency also weakens an otherwise complete five-language import experience.

This critique used the same 884-path inventory and current/Cycle 6 baseline documented in cycle7-code-reviewer-2026-07-17.md. It independently pressure-tested the visible claims against parser, chart, localization, fixtures, and delivery behavior.

## Findings

### CRIT7-01 — The parser “repairs” uncertainty by changing the journey

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as CODE7-01 and ARCH7-01
- Location: src/lib/googleJsonParser.ts:228-239, 246-270; src/lib/parser.test.ts:548-560, 980-1013

The product can tolerate missing timestamps, but it does not merely tolerate them: it moves all known-time points ahead of unknown-time points. That policy creates false route order while presenting the result as authoritative.

Concrete failure scenario: source observations A?, B@10:00, C? become B, A, C. A traveler sees a backwards leg and may trim, edit scenes, or export video around a route error Travelback introduced. The UI provides no indication that ordering was inferred.

Suggested fix: uncertainty should preserve evidence, not manufacture chronology. Keep producer order unless the entire segment is chronologically comparable, and test mixed timestamp quality at the parser and worker boundary.

### CRIT7-02 — The elevation chart converts “unknown” into “lowest”

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as CODE7-02 and ARCH7-02
- Location: src/components/ElevationProfile.tsx:20-22, 30-60; e2e/fixtures/invalid-elevation.gpx:6-16; e2e/travelback.spec.ts:899-907

The code correctly recognizes invalid elevation as null, then erases that distinction by substituting the valid minimum. This is visually tidy but semantically false.

Concrete failure scenario: a telemetry dropout between two ridge samples is drawn as a descent to the trip minimum. A user reviewing or sharing a mountain trip sees dramatic terrain that was never recorded. The current E2E check only rejects NaN markup, so the polished falsehood passes.

Suggested fix: render gaps, or explicitly documented bounded interpolation, and assert the semantic path rather than only syntactic SVG validity.

### CRIT7-03 — Localized instructions lead with an English-only diagram

- Severity: Low
- Confidence: High
- Status: Confirmed; same root cause as DOC7-01
- Location: src/components/GoogleGuide.tsx:33-64, 265-270, 351-363; public/guide/google-maps-phone-export.svg:6-32; public/guide/google-takeout-export.svg:9-26

The import modal translates its tabs and steps into Korean, Japanese, Chinese, and Spanish, but the two most prominent method panels replace the localized code-native illustration with static art containing English instructions.

Concrete failure scenario: a Korean user selects the Korean phone-export guide and the primary visual still says “Your Timeline,” “Settings,” and “Upload the saved JSON file.” The surrounding copy is usable, but the first-scanned artifact contradicts the selected language.

Suggested fix: use the already-localized GuideIllustration branches, generate locale-specific assets, or make the static artwork text-free. Add a non-English guide regression that checks the rendered consumer, not only translation-key parity.

### CRIT7-04 — “Help” performs an elevation seek on desktop

- Severity: Medium
- Confidence: High
- Status: Confirmed; same root cause as CODE7-03 and ARCH7-03
- Location: src/components/KeyboardHelp.tsx:19-30; src/app/page.tsx:618-684; src/components/TrackWorkspace.tsx:142-173; src/components/TrackToolbar.tsx:162-224

The cycle-composed bottom stack and the Help control share z-10, but the stack renders later. Exact 1440×1000 geometry puts all 78.25×44 pixels of Help inside the stack. The elevation SVG, not the button, owns the Help center hit point.

Concrete failure scenario: a traveler clicks a plainly labelled Help affordance and unexpectedly changes playback position through the elevation slider. On desktop, the alternate Help entry is absent because it lives only in the mobile More menu. This is more damaging than a cosmetic overlap: the visible promise and resulting action disagree.

Suggested fix: give Help a position and stacking contract outside the bottom controls, or make it a desktop toolbar action. Acceptance must prove no rectangle intersection, center-point ownership by Help, and that an unforced center click opens the shortcuts dialog.

## What withstood criticism

- Supported formats, local-only processing claims, worker parity, cancellation/generation guards, scene normalization, static-export hardening, and modal focus behavior agree across source and tests.
- The Cycle 6 corrections are present and targeted tests pass.
- The desktop Help collision was promoted only after bounded browser geometry proved complete overlap and wrong hit ownership; visual-only checks were insufficient.
- Existing release-permission, license-authority, and measured-performance items remain in the aggregate; repeating them would not add evidence.

## Validation and missed-issue sweep

ESLint, direct TypeScript checking, worker parity, and all 368 unit tests passed. I then revisited every silent fallback, default, data-loss boundary, optimistic UI claim, localized asset consumer, and Cycle 6 behavior change. No further critique crossed the line from preference or hypothetical risk to an actionable current defect.
