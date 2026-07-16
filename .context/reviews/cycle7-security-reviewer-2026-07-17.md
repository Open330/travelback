# Cycle 7 Security Reviewer — 2026-07-17

Reviewed revision `2df151642576b1b662e2fe7695c5723012e88747` read-only on `codex/review-plan-fix-2026-07-16`.

## Result

**No new actionable security finding.** No Critical finding was present. The only new correctness issue found in this review is confined to text interpolation in `SceneEditor`; React renders the result as escaped text, so it does not create HTML/script injection.

- New Critical: 0
- New High: 0
- New Medium: 0
- New Low: 0
- Overall posture: strong for a local-only static client, with two unchanged CI authority/assurance carryovers documented below.

## Review surface and evidence

The review covered every authored executable file under `src/app`, `src/components`, `src/lib`, and `src/workers`; all 15 unit suites and the complete E2E specification/fixture inventory; all seven scripts; the workflow, manifests, lockfile, and root configuration; public map styles, SVGs, font CSS, generated worker, and the hardened static export; and active project/development context plus Cycle 6 provenance. Trust-boundary traces included file import, DOM/XML and JSON parsing, worker messages, map/style loading, storage, external links, video export/download, CSP generation, static serving, GitHub Actions, and dependency lifecycle execution.

Current read-only checks:

- `npm run lint`: pass, zero warnings.
- `npx tsc --noEmit --incremental false`: pass.
- `npm test`: pass, 15 files / 368 tests, with no React lifecycle warning.
- `npm run check:worker`: generated worker is current.
- `npm audit --audit-level=high --json`: 0 vulnerabilities across 579 dependencies.
- Static hash verifier: every non-empty inline script in `out/index.html` (9/9) and `out/404.html` (8/8) has its SHA-256 token in the first CSP meta; production `script-src` has no `unsafe-inline`, and `script-src-attr 'none'` is present.
- `git diff --check`: pass.

## Findings

None.

## Existing carryovers, not refiled

These are unchanged known items; this pass found no new evidence that changes their disposition.

### B02 — Workflow-wide deployment credentials reach the build job

- Severity / confidence: Medium / High
- Status: Existing authority-blocked carryover
- File/region: `.github/workflows/deploy-pages.yml:8-11,17-45`
- Failure scenario: a compromised third-party action or dependency lifecycle script executing in `build` can run with workflow-global `pages: write` and `id-token: write`, although only `deploy` needs those capabilities.
- Causal trace: workflow-level `permissions` → inherited by both jobs → checkout/setup and `npm ci` execute third-party code in `build` → unnecessary Pages/OIDC authority is available to that code.
- Recommended fix: move permissions to job scope; give `build` only `contents: read`, and give `deploy` only the Pages/OIDC permissions it needs. Editing CI remains authority-blocked by the repository's destructive-action rule until explicitly confirmed.
- OWASP mapping: A05 Security Misconfiguration; A08 Software and Data Integrity Failures.

### B01 — Unit tests are absent from the deploy gate

- Severity / confidence: High / High
- Status: Existing authority-blocked release-assurance carryover
- File/region: `.github/workflows/deploy-pages.yml:26-32`
- Failure scenario: a unit-only regression in parser budgets, worker validation, CSP hardening, cleanup, or another guarded branch can reach the Pages artifact when lint, typecheck, build, and the selected browser flows still pass.
- Causal trace: push to `main` → deploy workflow runs the listed checks → `npm test` is never invoked → artifact upload/deploy is allowed without the 368-test suite.
- Recommended fix: add `npm test` before artifact-producing build/deploy steps. The same explicit CI-change confirmation requirement applies.
- OWASP mapping: A08 Software and Data Integrity Failures (release-pipeline assurance).

## Security controls verified

- `src/lib/parser.ts:134-176,481-512` bounds input size and XML complexity, rejects declarations/entities, validates coordinates, and requires a usable track.
- `src/lib/googleJsonParser.ts:225-397` caps JSON depth and retained points; `src/workers/trackParser.worker.ts:14-46` validates the transferred message and byte size; main-thread fallback and worker output are independently bounded/validated.
- `src/app/layout.tsx:56-70` contains the only authored `dangerouslySetInnerHTML`, a fixed bootstrap owned by the build. `scripts/harden-static-export.mjs:73-160` hashes inline scripts and rejects a placeholder/unsafe production CSP.
- `scripts/serve-static.mjs:74-177` limits methods, decodes and confines paths to `out`, rejects NUL/traversal, uses known MIME types, and supplies defensive headers.
- Uploaded names and scene names terminate in React text/attributes; production filenames are sanitized. External guide links are fixed URLs with `noopener noreferrer`.
- Shipped map styles use local assets and contain no remote sources, sprites, or glyph endpoints. The test-only export stub is restricted to loopback hosts.
- Current-source secret scanning found no credential material. Lockfile resolution is registry-owned; the local `npm ls` report of five extraneous optional WASM helpers is environment state, not a tracked dependency/provenance defect.
- OWASP coverage not otherwise applicable: the repository has no server, database, account/authentication, session, password, JWT, cryptographic-key, logging backend, or server-side URL-fetch surface. A01/A02/A07/A09/A10 were still checked at workflow, browser-storage, external-link, and static-host boundaries; no reachable finding resulted.

## Final missed-issue sweep and skipped accounting

A second pass rechecked injection sinks, parser exhaustion, worker trust, cross-generation callbacks, object-URL lifetime, export cancellation, storage, clickjacking/CSP fallback, static path handling, workflow authority, and external network destinations. No additional reachable exploit or security-control regression met the evidence threshold.

No authored source, test, script, configuration, textual public asset, or active documentation file relevant to current behavior was skipped. Generated `public/workers/trackParser.worker.js` was checked by source parity rather than reviewed independently from its TypeScript source. Minified `out/_next` chunks were validated through source review, current static provenance, and CSP/hash checks rather than line-reviewed as duplicate generated code. The WOFF2 binary was not decoded; its local CSS/load/CSP path was checked. Lockfile integrity entries were inspected structurally. Superseded historical `.context` and legacy `plan/` artifacts were searched for provenance/deduplication but not line-reviewed as current implementation.
