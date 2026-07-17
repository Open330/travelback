# Document Specialist Review — Cycle 9 (2026-07-17)

Reviewed revision `342b8c13f005c3abd072dddb27f002722c3fb1e8`.

## Inventory and method

I compared `README.md`, `.context/README.md`, project overview/architecture, development conventions, current plan index and Cycle 8 records, the traveler brief, manifests/configuration, all scripts, workflow, production source, locale dictionaries, authored/textual public assets, and test claims. Runtime/version/commands, base path, supported formats and byte/point limits, local-only map/privacy behavior, camera/export defaults, state ownership, CSP/static delivery, and testing descriptions were traced to their current implementations. Historical reports/plans were searched for duplicates and provenance, not treated as current authority.

The exact revision built in an isolated tree. A live production-static pass switched the actual UI to Korean, and a focused seven-format/two-full-journey static browser matrix passed 9/9. This review found one new publication-quality copy defect; B03 remains a separate owner/legal-input issue.

## Finding

### DOC9-01 — Korean map-style labels are fragments when composed with the toolbar prefix

- Severity: Low
- Confidence: High
- Status: Confirmed source and live-copy defect
- Location: `src/lib/i18n.ts:521-526,683-689`
- Problem: the dictionary stores `mapStyle.positron` as `밝은` and `mapStyle.dark` as `어두운`, then displays the value after `app.mapStylePrefix` (`지도:`). These are attributive adjective forms that normally require a following noun.
- Concrete failure: the live mobile control reads `지도: 어두운`—roughly “Map: dark …”—rather than a complete style name. The same pattern affects `지도: 밝은`.
- Fix: choose standalone, parallel names (`라이트` / `다크` is concise and familiar in this UI), or translate the entire composed control as a complete phrase (`밝은 지도` / `어두운 지도`). Add reviewed Korean phrases to the i18n quality test; key-count parity alone cannot protect grammar.

## Existing legal/document ledger — unchanged

### B03 — README says MIT but the repository has no root license grant

- Severity / confidence: **Medium / High**
- Status: **Confirmed existing; blocked on owner/legal input, not refiled**
- Location: `README.md:218-227`; missing root `LICENSE`
- Required outcome: the owner supplies intended license text, holder, and date/range; then align repository and package metadata. Do not infer legal intent.

## Final consistency sweep

- README commands match `package.json`; named components/hooks and data flow match current source.
- Import representations, size/point protections, worker use, file-local privacy, bundled map behavior, export presets/limits, static base path, and hardening claims remain aligned.
- Error, empty, loading, cancellation, save/share, localized-guide, theme, reduced-motion, and accessibility copy were compared with their consuming components. The five shipped locales are LTR; no current RTL promise is made.
- The Korean fragment above was the only new authoritative-copy issue. UI geometry/focus/role findings belong to the design/test ledgers and are not duplicated as documentation failures.

No relevant current document was skipped in the final claim-to-code pass.
