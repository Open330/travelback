# Cycle 8 Security Reviewer — 2026-07-17

Reviewed revision `81342b7fab1cc2577909b63025bb2452dcb5446b` read-only on `codex/review-plan-fix-2026-07-16` using the repository context and the security-review workflow.

## Outcome

**No new actionable security finding.** New finding count: **0** (Critical 0, High 0, Medium 0, Low 0). The static, browser-local architecture retains a strong posture. Two unchanged release-pipeline carryovers, B01 and B02, remain confirmed and authority-blocked.

This role did not rerun build, browser, audit, or deployment commands. The exact-HEAD Cycle 7 record reports 0 audit vulnerabilities, 393 unit tests, full dev/static E2E, hardened static output, and a real export as passing (`.context/plans/cycle7-implementation-2026-07-17.md:164-172`). No deployment, workflow mutation, external communication, service/process action, or secret handling occurred in this review.

## Complete review inventory and provenance

- All 54 `src` paths were inventoried: the 53 textual runtime/test paths and binary favicon. Every app shell, all 17 components, all 14 libraries, `types.ts`, `vitro-base.css`, the worker entry, and all 16 unit/component/worker suites were reviewed.
- `e2e/travelback.spec.ts` and all 18 fixtures were reviewed across valid/malformed GPX/KML, all Google JSON shapes, mixed duplicate branches, antimeridian/disconnected routes, elevation, responsive interactions, map recovery, export, and static hosting.
- All seven scripts and all root/delivery configuration were reviewed: worker generation, local style generation, CSP hardening, dev/static wrappers, static server/smoke, Pages workflow, manifests/lockfile, and Next/TypeScript/ESLint/Vitest/Playwright/PostCSS configuration.
- All 19 public assets were inventoried. The SVG/font CSS/sample/map-style content and URLs were inspected; the generated worker was validated by ownership/parity; binary favicon/font payloads were checked at their consumers and CSP paths rather than decoded.
- Current documentation/provenance reviewed: `README.md`; `.context/README.md`; both project documents; development conventions; current plans README, Cycle 6/7 implementation records, pending user instruction; aggregate; and all twelve dated Cycle 7 role reports. Historical plans/reviews were searched for security IDs and rejected hypotheses rather than treated as current code.

Trust-boundary traces followed untrusted file bytes through extension/size gates, FileReader, XML declaration/complexity checks, JSON depth, worker transfer/message validation, coordinate/time normalization, point budgets, Track consumers, React/MapLibre rendering, export/download/share, localStorage, object URLs, external guide links, local map/style assets, CSP generation, static path resolution/headers, package installation, GitHub Actions authority, artifact upload, and Pages deployment.

## New findings

None.

## Existing security/release-assurance ledger — confirmed unchanged, not refiled

### B01 — Pages deployment does not run the unit suite

- Severity / confidence: **High / High**
- Status: **Confirmed existing authority-blocked carryover**
- File/region: `.github/workflows/deploy-pages.yml:26-32`; configured suite at `package.json:14-20` and `vitest.config.ts:4-7`
- Concrete failure: a push to `main` can build, pass static E2E, upload, and deploy while a unit-only regression in parser limits, worker validation, map-render cleanup, export finalization, or component lifecycle is failing, because `npm test` is absent from the job.
- Fix: after explicit user authorization for a CI/CD modification, add `npm test` before artifact-producing build/upload, validate workflow syntax, and do not dispatch or deploy as part of the change.
- OWASP: A08 Software and Data Integrity Failures.

### B02 — Build inherits Pages and OIDC write authority

- Severity / confidence: **Medium / High**
- Status: **Confirmed existing authority-blocked carryover**
- File/region: `.github/workflows/deploy-pages.yml:8-11,17-45`
- Concrete failure: workflow-level `pages: write` and `id-token: write` reach `build`, where actions and `npm ci` execute code. A compromised dependency/action therefore receives deployment-related authority it does not need.
- Fix: after explicit CI/CD authorization, scope `build` to `contents: read` and grant Pages/OIDC writes only to `deploy`; preserve the environment approval boundary and do not run deployment.
- OWASP: A05 Security Misconfiguration; A08 Software and Data Integrity Failures.

## Controls verified

- Import availability controls are layered: format-specific byte limits (`src/lib/parse-utils.ts:6-33`), XML declaration/entity and complexity guards (`src/lib/parser.ts:138-180`), JSON depth (`src/lib/googleJsonParser.ts:287-323`), extraction-time candidate allocation limits (`src/lib/googleJsonParser.ts:48-220,325-383`), worker byte/message validation (`src/workers/trackParser.worker.ts:14-46`), and main-thread worker-output validation (`src/lib/parser.ts:270-296,408-451`).
- The only authored `dangerouslySetInnerHTML` is the fixed bootstrap string (`src/app/layout.tsx:56-70`). Production hardening hashes inline scripts, rejects placeholder/unsafe script policy, and places the CSP before active head content (`scripts/harden-static-export.mjs:70-194`). User-provided names terminate in React text/attributes; production export filenames are normalized and stripped (`src/lib/videoEncoder.ts:282-293`).
- Local map styles contain no remote tiles, glyphs, sprites, or sources. Application file parsing and rendering make no upload request. Fixed external guide links use safe relationship attributes. The developer export stub requires loopback hostname (`src/lib/test-stub.ts:11-23`).
- Object URLs are revoked on replacement/unmount/failure, workers terminate on settlement, export cancellation and finalization are bounded, and map/listener state has explicit ownership. No credential material or secret-dependent runtime path is present in current source.
- The app has no backend, account/session/authentication, database, server-side template, server-side URL fetch, JWT, password, or cryptographic-key surface. OWASP categories were still checked at the browser storage, workflow, static hosting, dependency, and external-link boundaries.

## Rejected or non-actionable hypotheses

- `scripts/serve-static.mjs:91-123,126-177` confines decoded lexical paths, methods, MIME types, and response headers. `stat` follows symlinks, but the current `out` and `public` inventories contain no symlink and the application cannot write its build tree. A symlink escape therefore requires prior artifact-host write authority and was not promoted as a reachable current vulnerability. If this helper is ever reused for an untrusted/writable document root, reject symlinks or enforce `realpath` containment before streaming.
- The pre-dedup point counter rejects candidate allocations above the cap by design. It limits peak memory before normalization and is explicitly covered; it is not a parser false-positive security bypass.
- Mutable major tags for official GitHub actions and physical-device browser coverage are longstanding supply-chain/evidence topics already present in historical provenance; this pass found no new change or exploit evidence that alters the current B01/B02 disposition.

## Final missed-issue sweep

A second pass rechecked DOM/script/style injection, XML entities, JSON/parser exhaustion, worker confusion, stale async generations, path/base-path traversal, symlink state, clickjacking/CSP fallbacks, localStorage trust, object URL/download/share handling, external network destinations, source maps/assets, package lock integrity, workflow authority, secrets, and cleanup failures. No additional reachable exploit or security-control regression met the evidence threshold.
