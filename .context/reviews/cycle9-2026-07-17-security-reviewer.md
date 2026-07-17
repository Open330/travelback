# Cycle 9 security review — 2026-07-17

## Result

**New security findings: 0.** No new secret exposure, injection, unsafe XML/JSON parsing, path traversal, cross-origin data leak, retained sensitive data, unbounded hostile-input work, vulnerable dependency, or authorization defect survived review. Known workflow-permission items B01/B02 remain ledger entries and were not re-filed.

## Scope and threat model

Reviewed exact HEAD `342b8c13`, every current production/test/E2E/script/configuration/public-text file, the package lock, Pages workflow, README privacy claims, and active context; the complete 913-file inventory and historical plans/reviews were catalogued and searched. The application is a static browser app with no app-owned backend, user account/session, database, password, JWT, server-side template, or server-side URL-fetch surface. Relevant trust boundaries are local travel-file parsing, browser storage, worker messages, static asset serving, outbound links, WebCodecs/file output, dependency installation, and CI deployment authority.

## Current controls checked clean

- `src/lib/parse-utils.ts:7-89` centralizes file/point budgets; `src/lib/googleJsonParser.ts:226-336` bounds JSON depth; `src/lib/parser.ts:32-33,138-177,491-516` rejects DOCTYPE/ENTITY declarations before DOM parsing and bounds XML size/tags/depth. Direct and generated-worker parser paths share the same implementation, and parity passed.
- The Cycle 8 revisit change at `src/lib/googleJsonParser.ts:176-220` preserves producer observations but still consumes the point budget before accepting each coordinate. It does not reopen an unbounded-input path.
- `src/app/layout.tsx:56-70` places only a source-owned constant bootstrap string into `dangerouslySetInnerHTML`; no user input reaches it. Static hardening scripts compute the corresponding policy material rather than enabling arbitrary runtime HTML.
- `src/components/GoogleGuide.tsx:371-373` uses `noopener noreferrer` on its external tab. Runtime map styles/assets are local, and `src/app/page.tsx:417` fetches the source-owned sample path, not a user-controlled URL.
- `scripts/serve-static.mjs` normalizes request paths and checks containment before serving; review found no user-writable upload root or remote-command surface. E2E/dev runner process cleanup was read but not executed.
- Theme/style/locale/hint values in localStorage are enum-validated or boolean markers and are rendered through React. The export test stub is development-only behavior selected by a local key and emits a visible console warning; it does not transmit track data.

## Dependency and supply-chain review

- `npm audit --json` reported 0 info/low/moderate/high/critical vulnerabilities across 579 dependency entries.
- Lockfile v3 contains 580 records including the root. Every resolved tarball is from `registry.npmjs.org`; every resolved package has integrity metadata. Five transitive packages declare install scripts (`esbuild`, `fsevents` twice, `sharp`, `unrs-resolver`), all locked to registry artifacts.
- Registry freshness lookup found `tailwindcss` and `@tailwindcss/postcss` 4.3.3 while the lock has 4.3.2; the declared ranges already allow the patch and no advisory was present. Major `latest` versions for Node typings/ESLint/TypeScript require LTS and peer-range evaluation, particularly the locked `typescript-eslint` `<6.1.0` TypeScript peer. These are maintenance observations, not evidence of a current exploit.
- `npm ls --depth=0` reports five extraneous WASM-helper directories in the local install, but they are absent from package declarations and lockfile and therefore are not part of reproducible CI installs. No destructive cleanup was attempted.

## Existing authority/legal ledger, not re-counted

- **B01 — High/High:** `.github/workflows/deploy-pages.yml:26-32` omits the 400-test unit gate. Changing CI/CD requires explicit authority.
- **B02 — Medium/High:** `.github/workflows/deploy-pages.yml:8-45` grants `pages: write` and `id-token: write` at workflow scope, so the build job and dependency/action execution inherit deployment authority they do not need. Narrowing it requires explicit CI/CD authority.
- **B03 — Medium/High:** `README.md:225-227` says MIT while no root `LICENSE` is tracked; exact owner/year/legal intent is unavailable.

CR9-01 affects camera continuity only; it does not cross a security boundary or expose travel data.

## Validation and final sweep

Lint, no-emit typecheck, all 17 unit suites/400 tests, worker parity, and the full npm audit passed. No deployment, workflow mutation, external communication, server/browser process, secret handling, or destructive action occurred. The final sweep covered HTML/script sinks, storage, links, network calls, DOMParser defenses, worker message parsing, file/object URLs, static-server path handling, CSP/hardening scripts, dependency provenance/install scripts, and workflow permissions. Zero new security findings remain.
