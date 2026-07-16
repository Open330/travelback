# Cycle 6 Security Review — 2026-07-17

Reviewed revision `1d2755c` read-only. Verdict: **no new actionable security finding**.

## Coverage and evidence

Reviewed the complete executable surface under `src/app`, `src/components`, `src/lib`, `src/workers`, `scripts`, root build/test configuration, and `.github/workflows/deploy-pages.yml`. I also checked parser limits and worker trust boundaries, export/download sinks, external links, CSP generation, the static server, local storage, object URLs, browser workers, child-process wrappers, and dependency provenance.

- `npm audit --audit-level=high --json`: 579 dependencies, 0 vulnerabilities.
- Current-source secret-pattern scan: no credential material; the only token-like workflow match was the expected `id-token: write` permission.
- Dangerous-sink scan: the only `dangerouslySetInnerHTML` is the build-owned bootstrap in `src/app/layout.tsx:56-70`; the hardened static build hashes inline scripts and passed CSP smoke validation.
- `src/lib/parser.ts:134-176,481-512` rejects XML declarations/entities, caps XML at 4 MB and JSON at 100 MB, limits XML complexity, validates coordinates, and requires at least two points.
- `src/lib/googleJsonParser.ts:225-397` caps JSON depth and retained points; `src/workers/trackParser.worker.ts:14-46` validates the transferred message and size.
- `scripts/serve-static.mjs:74-177` decodes safely, rejects NUL/traversal outside `out`, permits only GET/HEAD, uses known MIME types, and emits defensive headers.
- Isolated current-HEAD build, CSP hardening, static smoke, lint, 366 unit tests, and 94 browser tests all passed; one real-WebCodecs browser test was expectedly skipped.

## Findings

None. No new exploitable data flow, injection path, secret exposure, unsafe remote dependency, or parser resource-boundary bypass was found.

## Explicit non-findings and carryovers

- `.github/workflows/deploy-pages.yml:8-45` still has broad Pages/OIDC permissions and omits `npm test`; these are existing B02/B01 authorization-blocked carryovers and are not refiled.
- The README license claim without a root license is existing B03, not a new security result.
- The unrevisioned global map `error` listener in `src/components/MapView.tsx:991-997` does not yield a concrete stale-style exploit/defect with the shipped local styles. MapLibre 5.24 aborts superseded style requests and suppresses their abort errors; the held-request E2E also stays clean. I rejected that hypothesis rather than manufacturing a finding.

## Missed-issue sweep and skipped accounting

A second pass rechecked trust-boundary crossings, error text, worker messages, generated asset ownership, headers, CSP placement/hashes, and external URLs. Fixtures were structurally inspected and exercised by tests. Generated `public/workers/trackParser.worker.js` was parity-checked by the build/smoke guard rather than hand-reviewed separately from its TypeScript source. Fonts, icons, guide SVG artwork, and local style JSON were not line-reviewed as executable code; their manifest paths, CSP/network behavior, and test use were checked. Historical plans/reviews were searched only for provenance and duplicate suppression.
