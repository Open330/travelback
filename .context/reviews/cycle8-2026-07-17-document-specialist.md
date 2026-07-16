# Document Specialist Review — Cycle 8 (2026-07-17)

## Inventory and method

I compared `README.md`, `.context/README.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`, `.context/development/01-conventions.md`, `.context/plans/README.md`, the current Cycle 7 aggregate/plan, the custom traveler brief, root manifests/configuration, all seven scripts, production source, textual public assets, and tests. Historical reviews/plans were searched for provenance and duplicate rejection rather than treated as current authority. Generated worker and static output were checked through their parity/hardening contracts; binary assets were inventoried but not interpreted as prose.

Current framework, runtime, commands, base path, supported import shapes/limits, local-map/privacy claims, camera defaults, export presets, component/data flow, static CSP behavior, and test runner descriptions agree with current code. The already-recorded workflow-permission/test, license-authority, and measured-performance items remain governed by their existing exit criteria and are not new findings.

## Findings

### DOC8-01 — The documented localized experience is undermined by nondeterministic locale hydration

- Severity: Medium
- Confidence: High
- Status: Confirmed correctness/documentation mismatch
- Location: locale behavior in `src/lib/i18n.ts:1838-1888`; localized product surface described by `.context/project/01-overview.md:1-14,75-97`; browser test locale fixed at `playwright.config.ts:19-31`
- Problem: the repository presents five complete locale dictionaries and documents a responsive client-only experience, but the static document always renders English while the browser initializer can choose a different locale before hydration. This is not a harmless metadata difference: React reports a content mismatch and regenerates the localized subtree.
- Concrete failure: a Korean first visit produces English server text, Korean initial client text, one React hydration failure, and a replaced tree. Locale switching after an English hydration (the path current E2E exercises) does not validate the documented first-load behavior.
- Fix: make the hydration snapshot deterministic and apply preferred locale after mount. Document only the intentional static-English-to-preferred-locale transition if necessary, and add direct non-English SSR/hydration coverage rather than relying on dictionary parity.

### DOC8-02 — Two Spanish translations are not publication-quality

- Severity: Low
- Confidence: High
- Status: Confirmed prose defect
- Location: `src/lib/i18n.ts:1669,1699`; reviewed-language checks in `src/lib/i18n.test.ts:58-71`
- Problem: `datos del cronología` uses the wrong gender, and `Restablecer rango del timeline` leaves an avoidable English term in Spanish accessibility copy.
- Concrete failure: the main Google-data guidance and a core timeline action read like incomplete machine translation, even though surrounding copy is Spanish.
- Fix: change them to `datos de la cronología` and `Restablecer intervalo de la línea de tiempo`; pin the reviewed phrases in the existing language-quality test.

## Final consistency sweep

I rechecked every command named in current docs against `package.json`, every listed component/hook against source, camera and export constants against `src/types.ts`, parser claims against `parser.ts`/`googleJsonParser.ts`, privacy/network text against map styles and CSP, and generated/static claims against the scripts. No additional authoritative-doc mismatch met the actionable threshold, and no relevant current document was skipped.
