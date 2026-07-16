# Security Reviewer — Deep Review (2026-07-16)

## Scope and threat model

Reviewed dependency/supply-chain state, GitHub Actions authority, local untrusted file parsing, worker boundaries, XML/JSON resource limits, static CSP hardening, URL/base-path handling, and export filename handling. Travelback is a client-only static export; therefore server-only Next.js advisory paths have reduced production exploitability, but development/build/test tooling and the CI policy remain in scope.

## Findings

### SR-01 — The dependency tree contains six known vulnerabilities and fails the CI audit gate

Severity: High | Confidence: High | Status: Confirmed inventory/policy failure; runtime applicability varies

Files: package.json:20-44, package-lock.json, .github/workflows/deploy-pages.yml:26-32

npm audit --audit-level=low exits non-zero with 3 High, 2 Moderate, and 1 Low vulnerabilities:

- Direct next 16.2.3 is affected by multiple advisories, including Server Components denial of service below 16.2.5 and an App Router middleware/proxy bypass below 16.2.6.
- Transitive vite 8.0.10 is affected by a Windows server.fs.deny bypass through 8.0.15.
- Transitive undici 7.25.0 is affected by TLS/proxy routing and WebSocket denial-of-service advisories below 7.28.0.
- Transitive js-yaml 4.1.1 and brace-expansion 5.0.4/5.0.5 have denial-of-service advisories; Babel 7.29.0 has a low-severity arbitrary file-read advisory.

The deployed app is static and does not enable most Next server features named by the advisories, so direct production exploitability must be evaluated advisory by advisory. Nevertheless the project’s own npm audit --audit-level=high workflow step now fails, and vulnerable tooling executes on developer and CI hosts.

Suggested fix: update direct dependencies and their lockfile to patched current releases, then rerun audit, lint, typecheck, unit, build, and static E2E. Do not suppress advisories merely because the production host is static.

### SR-02 — The build job receives deployment and OIDC write authority

Severity: Medium | Confidence: High | Status: Confirmed

File: .github/workflows/deploy-pages.yml:8-12 and 17-35

pages: write and id-token: write are declared at workflow scope. The build job therefore retains those permissions while running npm ci, Playwright browser installation, package scripts, Next build, and tests. A compromised dependency or lifecycle script has more authority than needed to produce an artifact.

Suggested fix: set contents: read on the build job and grant pages: write plus id-token: write only to the deploy job. Keep artifact upload authority as narrow as GitHub Pages permits.

### SR-03 — The point cap does not bound intermediate parser memory

Severity: Medium | Confidence: High | Status: Likely local availability attack

Files: src/lib/googleJsonParser.ts:74-117, 150-192, and 229-270; public/workers/trackParser.worker.js:68-105, 127-162, and 188-233

Per-segment arrays each receive their own 250,000-point allowance, while the aggregate is rejected only after all segments are stored and copied during sort/deduplication. A crafted user-selected Google JSON file can therefore force memory use far above the nominal track cap and crash the worker/tab before a clean TOO_MANY_POINTS response. The attack requires convincing a user to import the file, which limits reach but not the local availability impact.

Suggested fix: enforce one parse-wide point/allocation budget during ingestion and stop before retaining additional segment objects. Add adversarial many-segment fixtures in both main and worker parity tests.

### SR-04 — JSON depth validation trusts an unchecked 90 MiB suffix

Severity: Medium | Confidence: Medium | Status: Manual risk

Files: src/lib/googleJsonParser.ts:273-304, public/workers/trackParser.worker.js:277-321, src/lib/parser.ts:223-225 and 239-335

Files up to 100 MiB are accepted, but worker checkJsonDepth examines only the first 10 MiB. Deep nesting placed later bypasses the intended depth rejection and reaches JSON.parse. Depending on engine behavior, the result is excessive CPU/memory, a worker crash, or a generic failure instead of the bounded JSON_DEPTH_EXCEEDED path.

Suggested fix: perform a full linear structural scan in the worker or use a streaming parser with depth, byte, and point budgets. Add a cancellation/deadline path and a fixture whose deep suffix begins after byte 10 MiB.

## Controls verified

- XML preflight rejects DOCTYPE/ENTITY declarations and enforces tag, nesting, and 4 MiB limits before DOM conversion.
- Large JSON is transferred to a worker; only files at or below 16 MiB keep a main-thread fallback copy.
- Map styles/assets are local and the static hardener removes unsafe-inline script execution in the current build.
- No plaintext credentials or privileged network endpoints were found in the reviewed source/configuration surface.

## Summary

4 findings: 1 High and 3 Medium. Dependency state and CI permission scope are confirmed; the parser issues are availability risks requiring adversarial browser validation.
