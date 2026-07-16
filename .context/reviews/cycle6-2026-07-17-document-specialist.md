# Document Specialist — Cycle 6 (2026-07-17)

Reviewed revision: `1d2755c` on `codex/review-plan-fix-2026-07-16`

## Result

**One new Low/High documentation finding.** README, current project/development references, setup/test/build/base-path instructions, privacy claims, supported-format caveats, localization keys, inline comments, and Cycle 5 completion records otherwise match the implementation, subject to the known B03 license boundary and the CR6-01 cross-role note below.

## Documentation coverage

- Read README, package scripts/configuration/workflow, all seven operational scripts, all textual public assets, every traveler-visible string in all five locale dictionaries, relevant alt/ARIA labels, and inline comments/JSDoc across all 53 source files.
- Compared `.context/README.md`, both project documents, development conventions, plan index, Cycle 4/5 implementation plans, current aggregate, and all current Cycle 5 reviewer provenance against code and tests.
- Verified programmatically that all five locale dictionaries contain the same 323 keys and matching interpolation placeholders.
- Rechecked current Google export guidance against Google's official phone Timeline and general Takeout documentation on 2026-07-17.

## Finding

### DOC6-01 — The legacy Takeout illustration guarantees an obsolete/single-file workflow that the surrounding guide correctly qualifies

- Severity: **Low**
- Confidence: **High**
- Classification: **Confirmed user-facing documentation mismatch**

Exact evidence:

- `public/guide/google-takeout-export.svg:12-15` says “Select Location History” without the surrounding guide's availability caveat.
- `public/guide/google-takeout-export.svg:24-26` says “Find Records.json” and “upload Records.json” as the only terminal path.
- `src/components/GoogleGuide.tsx:266-270,351-360` renders that image prominently in the legacy Takeout tab.
- The corrected English copy at `src/lib/i18n.ts:167,182-190,211` says this is a legacy fallback only if the account still offers Location History, current device-based Timeline may not be included, and `Records.json`, `Timeline Edits.json`, or compatible monthly JSON may work. It sends the user to phone export when none are present.
- README `:42,64,72` and `.context/project/01-overview.md:39-44,97` use the same phone-first/known-compatible contract; the illustration is the outlier.

Concrete failure scenario: a user with a compatible `Timeline Edits.json` or monthly file scans the large illustration, searches only for `Records.json`, and abandons a valid import. A migrated account can instead spend time creating a Takeout archive that does not contain current on-device Timeline data.

Recommended fix:

- Change the image to label the path “Legacy only / if Location History is offered.”
- Replace the single-filename instruction with “Find a compatible Timeline JSON” and examples that match the localized prose, or remove filename-specific text from the non-localized bitmap/vector asset entirely.
- Add a lightweight content assertion for the guide asset or render these instructions as localized HTML so future copy and illustration updates cannot diverge silently.

Current authoritative references:

- Google Maps iOS Timeline export: <https://support.google.com/maps/answer/6258979?co=GENIE.Platform%3DiOS&hl=en>
- Google Maps Android Timeline export: <https://support.google.com/maps/answer/14169818?co=GENIE.Platform%3DAndroid&hl=en-419>
- Google Takeout's general export contract (which does not guarantee a Timeline product or `Records.json`): <https://support.google.com/accounts/answer/3024190?hl=en>

## Cross-role consistency note (not a second finding)

`.context/plans/cycle4-implementation-2026-07-16.md:28-30` records the map-generation camera acceptance as complete, but CR6-01 demonstrates that the claim is too broad for Follow-off/manual-camera retry. This is product/acceptance evidence for CR6-01, not an independent documentation root cause. Once camera handoff is fixed—or the intended reset semantics are documented—the plan record and implementation can agree again.

## Accurate or intentionally bounded material

- README test commands correctly distinguish Vitest, safe dev E2E orchestration, static E2E, build, and preview/base-path behavior.
- Privacy/network claims match local styles/assets and the only app fetch (the bundled sample); imported tracks remain local.
- Supported GPX/KML/Google wording now says known compatible shapes rather than universal compatibility.
- B03 remains unchanged: README `:225-227` says MIT while no root LICENSE supplies the grant, and ownership/year/legal intent still require owner input. It was not re-reported.
- The preserved-buffer performance comment remains B04 evidence-gated, not a newly established documentation fact.

## Final missed-issue sweep and explicit skips

Rechecked commands, paths, ports, test counts/runner semantics, asset base paths, import/export terms, privacy, licensing, accessibility labels, inline API/lifecycle comments, locale parity, and current plan status claims. No second documentation root cause was confirmed.

Of 721 tracked `.context/` files, 21 current/provenance records were read and 700 superseded historical artifacts skipped. All 39 legacy root `plan/` files were skipped as superseded. The WOFF2 binary body and generated lockfile boilerplate were not prose-reviewed, though their integration/metadata were checked. Every tracked textual public asset, source/config comment, script, test, and fixture was included.
