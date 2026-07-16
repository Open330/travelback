# Cycle 7 Document Specialist — 2026-07-17

## Result

COMMENT. The README and current project/development context accurately describe the application, supported formats, client-only architecture, toolchain, static export, and verification workflow. Three Low documentation defects remain: English-only instructional art bypasses localized art, the guide promises slow parsing above the actual hard limit, and a maintenance comment still attributes the current Next 16 serialization shape to Next 15.

## Documentation and asset inventory

- Current authored context read in full: .context/README.md, .context/project/01-overview.md, .context/project/02-architecture.md, .context/development/01-conventions.md, .context/plans/README.md, .context/plans/cycle6-implementation-2026-07-17.md, .context/reviews/_aggregate.md, all 13 Cycle 6 role reports, and .context/plans/user-injected/pending-next-cycle.md.
- User/developer documentation read in full: README.md, package.json, all root configuration, the workflow, and all seven scripts.
- User-facing content checked at its consumers: all five locale dictionaries in src/lib/i18n.ts, GoogleGuide, FileUpload errors, toolbars, dialogs, status/toast copy, public guide SVGs, icons, landing preview, sample GPX, font declaration, and five map styles.
- All 884 tracked paths were enumerated. The 735 .context and 39 root plan paths were catalogued; superseded histories were searched for provenance and stale-current references rather than presented as active documentation. Binary font/favicon bodies were excluded from prose inspection.

## Findings

### DOC7-01 — Static English diagrams bypass the localized guide illustrations

- Severity: Low
- Confidence: High
- Status: Confirmed current documentation defect
- Location: src/components/GoogleGuide.tsx:33-64, 265-270, 351-363; public/guide/google-maps-phone-export.svg:6-32; public/guide/google-takeout-export.svg:9-26

Evidence: GuideIllustration contains localized text branches for the Phone and Takeout tabs, but guidePreviewImage is non-null for exactly those tabs, so the branches are unreachable. Both selected SVG files embed multiple English instructional sentences.

Concrete failure scenario: after switching the application to Korean, Japanese, Chinese, or Spanish, a traveler opens the localized import guide. The headings and steps change language, while the primary phone/Takeout visual continues to say “Your Timeline,” “Legacy fallback,” and other English instructions.

Suggested fix: restore the localized code-native illustrations for tabs 0 and 1, create locale-specific image assets selected by locale, or remove instructional text from the static art. Add a rendered non-English regression; locale-key parity cannot detect text embedded in assets. If the localized branches remain dead, remove or update them so they do not become a stale fallback.

### DOC7-02 — “100MB+ may take a moment” contradicts the enforced limit

- Severity: Low
- Confidence: High
- Status: Confirmed current documentation defect; architectural root is ARCH7-04
- Location: src/lib/i18n.ts:214, 578, 942, 1306, 1670; src/lib/parse-utils.ts:9-12; src/lib/parser.ts:481-492; src/components/FileUpload.tsx:20, 73-76

Evidence: every locale tells users that files of 100 MB or more may parse slowly. JSON is hard-rejected above 100 MB, and GPX/KML is hard-rejected above 4 MB. FileUpload repeats the same above-100 MB slow-parse warning immediately before delegating to that rejection.

Concrete failure scenario: a user follows the guide and selects a 101 MB JSON export expecting a wait. The parser rejects it before reading. For an XML file, even 5 MB is already too large, making the generic 100 MB guidance still less applicable.

Suggested fix: describe the actual per-format maximums and, if useful, a below-limit “large file” expectation. Derive inserted size values from shared policy rather than hard-coding them into five locale strings.

### DOC7-03 — Static-export maintenance notes name the wrong Next.js major

- Severity: Low
- Confidence: High
- Status: Confirmed stale maintenance documentation
- Location: scripts/harden-static-export.mjs:90-103; package.json:24-31; README.md:12, 35; .context/project/01-overview.md:8

Evidence: the hardening comment says its regular expression matches the exact output of Next.js 15. The repository runs Next 16.2.10, all current docs say Next 16, and Cycle 6 records a successful Next 16.2.10 hardened build. The build guard is sound; the explanatory version attribution is stale.

Concrete failure scenario: a maintainer investigating a Next 16 upgrade or serialization change treats the regular expression as an unverified Next 15 remnant, or preserves obsolete version-specific guidance while changing the guard.

Suggested fix: say the shape is validated against the repository's current Next 16 static export, or avoid a major-version claim and state that smoke/build assertions are the authority. Keep the fail-closed explanation at lines 100-103.

## Current claim audit

| Claim surface | Source-of-truth comparison | Result |
| --- | --- | --- |
| README stack and prerequisites | package.json, next.config.ts, scripts | Accurate |
| Supported GPX/KML/Google JSON formats | parser branches, fixtures, tests | Accurate |
| 4 MB XML safety cap in project overview | parse-utils and parser enforcement | Accurate |
| Client-only/local processing | architecture, worker, export path | Accurate |
| Static Pages deployment and base path | workflow, Next config, serving scripts | Accurate |
| Guide language coverage | locale dictionaries versus rendered static art | DOC7-01 |
| Large-file guidance | i18n/FileUpload versus parser limits | DOC7-02 |
| Next serialization maintenance note | package/toolchain and successful builds | DOC7-03 |

## Existing item not refiled

README.md:225-227 still labels the project MIT while no LICENSE file is tracked. This is the existing authority-blocked B03 legal decision in the aggregate, not a new Cycle 7 documentation finding.

Cycle 6's stale Takeout workflow finding is fixed: the asset now labels Takeout as a conditional legacy fallback and names multiple compatible JSON forms. DOC7-01 is distinct; it concerns cross-locale rendering, not the corrected workflow content.

## Validation and final missed-issue sweep

ESLint, direct TypeScript checking, generated-worker parity, and all 368 unit tests passed. I searched active docs, scripts, comments, locale values, public text assets, package/configuration facts, and current plan/review references for obsolete versions, broken paths, unsupported promises, inconsistent limits, untranslated consumer content, and stale Cycle 6 claims. Aside from the three findings and known B03, no additional current documentation mismatch reached actionable confidence.
