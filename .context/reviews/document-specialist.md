# Documentation specialist review — cycle 001

Date: 2026-07-16

Reviewed revision: `df8f08a`

## Coverage and method

I compared README, `.context/README.md`, both project-context documents, development conventions, the active/deferred plan index, package scripts, source labels, parser formats, the Playwright inventory, and repository legal files. Historical plans/reviews were treated as traceability records, not current product documentation. Current Google instructions were checked against official Google support pages because this workflow changes over time.

## Findings

### DOC-01 — Current and legacy Google Timeline acquisition paths are conflated

- Severity: **High**
- Confidence: **High**
- Classification: **Confirmed documentation mismatch; account-specific Takeout contents require manual validation**
- Evidence in product copy: the “computer” method instructs users to select Location History and find `Records.json` at `src/lib/i18n.ts:180-189` and `src/lib/i18n.ts:537-546`. `src/components/GoogleGuide.tsx:167-189` gives that path a normal top-level tab and Takeout link. The landing page leads with a Takeout ZIP tip at `src/lib/i18n.ts:20`.
- Evidence in repository docs: `README.md:42`, `README.md:64`, and `README.md:72` frame Google Location History primarily as Takeout; `.context/project/01-overview.md:38-45` calls every supported JSON shape a Takeout export, and `.context/project/01-overview.md:80` says “all Takeout variants.”
- Current authoritative path: Google's current iOS instructions use Google Maps → profile → Settings → Location & Privacy → Export Timeline data; Android uses Settings → Location → Location services → Timeline → Export Timeline data. See [Google Maps Timeline for iPhone/iPad](https://support.google.com/maps/answer/6258979?co=GENIE.Platform%3DiOS&hl=en) and [Google Maps Timeline controls for Android](https://support.google.com/maps/answer/14169818?co=GENIE.Platform%3DAndroid&hl=en-419).
- Failure scenario: a reader waits for a Takeout archive and searches for a filename that may not be present after Timeline's device-based migration, despite already having an export route on the phone.
- Recommended fix: document phone export first and precisely. Rename the computer/Takeout path “Legacy Takeout export,” add a conditional warning, and describe formats as “known supported Google Timeline JSON shapes” rather than the unbounded “all variants.” Keep parser-shape examples, but separate file compatibility from instructions for obtaining a current export.

### DOC-02 — The README's executable test inventory is stale

- Severity: **Low**
- Confidence: **High**
- Classification: **Confirmed factual defect**
- Evidence: `README.md:145` says `e2e/travelback.spec.ts` contains 74 Playwright tests. `npx playwright test --list -c playwright.config.ts --reporter=list` reports **75 tests in 1 file**.
- Failure scenario: a contributor uses the documented count as a completeness check and assumes a missing or extra test is a runner problem.
- Recommended fix: update to 75, or remove the brittle count and describe the suite by coverage areas.

### DOC-03 — “MIT” is asserted without shipping the license grant

- Severity: **Medium**
- Confidence: **High**
- Classification: **Confirmed repository/documentation defect**
- Evidence: `README.md:226-228` declares MIT, but the repository has no root `LICENSE`, `LICENSE.md`, or `COPYING` file. `package.json:1-44` is private and does not contain a `license` field.
- Failure scenario: a downstream user or contributor cannot find the actual permission notice, conditions, copyright holder, or year needed to rely on the stated license.
- Recommended fix: add the complete MIT license text with the intended copyright holder/year, then link it from README. If MIT is not the intended grant, correct the README instead.

## Accuracy notes that passed

The documented static preview command matches `package.json:8-9`; the `/travelback` base-path explanation at `README.md:202-204` matches the project context; the seven resolution presets at `README.md:85-95` match `src/types.ts:96-103`; and the context correctly distinguishes the local abstract map backdrops from full basemaps at `.context/project/01-overview.md:92`.

## Final sweep

I searched current documentation for test counts, Takeout/Timeline wording, license claims, build/run commands, supported formats, and export claims, then cross-checked each against source/config or an authoritative external page. Archived implementation records were not flagged for historically accurate statements. No other confirmed user-blocking documentation error remained.
