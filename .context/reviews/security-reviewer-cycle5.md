# Security Review Report — Cycle 5

**Reviewer:** security-reviewer
**Date:** 2026-04-25
**Scope:** Reviewed `package.json`, `package-lock.json`, `next.config.ts`, `playwright*.ts`, `scripts/*.mjs`, `src/app/*`, `src/components/*`, `src/lib/*`, `src/types.ts`, `public/workers/trackParser.worker.js`, bundled map styles, sample fixtures, and the existing cycle-5 security artifact.
**Risk Level:** MEDIUM

## Summary
- Critical Issues: 0
- High Issues: 0
- Medium Issues: 2
- Low Issues: 1

## Findings

### C5-S1. Large GPX/KML imports are still parsed on the main thread, enabling client-side DoS
- **Severity:** MEDIUM
- **Category:** OWASP A04: Insecure Design
- **Label:** Confirmed
- **Confidence:** High
- **Location:** `src/lib/parser.ts:152-154`, `src/lib/parser.ts:160-212`, `src/lib/parser.ts:521-523`, `src/lib/parser.ts:626-674`
- **Exploitability:** Local, unauthenticated; attacker must convince a user to import a crafted large XML file.
- **Blast Radius:** Browser tab freeze, excessive memory/CPU use, lost in-memory work, poor mobile-device stability.
- **Failure Scenario:** The JSON path has worker isolation and a 100 MB limit, but GPX/KML still allow up to 200 MB and are decoded via `FileReader.readAsText()` and synchronously parsed with `DOMParser` on the UI thread. A maliciously large or structurally dense GPX/KML file can lock the page before recovery UI is usable.
- **Issue:** Availability protection is asymmetric: JSON is bounded and worker-parsed; XML is not.
- **Concrete Fix:** Move GPX/KML parsing into the worker path too, or sharply reduce XML size limits and reject files before `readAsText()`.

### C5-S2. Vulnerable `postcss` versions remain in the dependency graph
- **Severity:** MEDIUM
- **Category:** OWASP A06: Vulnerable and Outdated Components
- **Label:** Likely
- **Confidence:** High
- **Location:** `package-lock.json:1645-1656`, `package-lock.json:5328-5334`, `package-lock.json:5376-5379`, `package-lock.json:5734-5755`
- **Exploitability:** Build-time, not direct runtime; requires attacker-controlled CSS entering the build pipeline.
- **Blast Radius:** If untrusted CSS is ever processed, the known `</style>` escaping issue can produce XSS in generated output or previews.
- **Failure Scenario:** `npm audit` reports GHSA-`qx2v-qp2m-jg93` for both `node_modules/next/node_modules/postcss@8.4.31` and top-level `postcss@8.5.6`, both below the patched range `<8.5.10`. This repo does not currently ingest user CSS at runtime, so exploitability is limited, but the vulnerable component is present.
- **Concrete Fix:** Upgrade to dependency versions that pull `postcss >= 8.5.10`, or pin an override after compatibility testing.

### C5-S3. CSP hardening still depends on a post-build mutation step
- **Severity:** LOW
- **Category:** OWASP A05: Security Misconfiguration
- **Label:** Risk
- **Confidence:** High
- **Location:** `src/app/layout.tsx:8-10`, `src/app/layout.tsx:58-66`, `scripts/harden-static-export.mjs:103-115`, `scripts/smoke-static.mjs:100-140`
- **Exploitability:** Deployment/configuration mistake; not directly exploitable from the app alone.
- **Blast Radius:** Site-wide loss of CSP defense-in-depth if un-hardened HTML is deployed.
- **Failure Scenario:** Source HTML still emits a placeholder CSP with `'unsafe-inline'` in production and relies on `postbuild` mutation to replace it with hash-based policy. The smoke test catches this on the normal build path, but any alternate deployment path that skips or bypasses `postbuild` would publish the weaker CSP.
- **Provenance:** Carries forward the existing deferred concern in `.context/reviews/security-reviewer-cycle5.md` (`DF-C17-003`).
- **Concrete Fix:** Fail the build if the placeholder remains, or generate the final hash-based CSP directly in the emitted output path rather than relying on a rewrite step.

## Confirmed Clean Areas
- No hardcoded secrets found in current source or obvious git history hits from targeted secret-pattern scans.
- Worker message validation is present and bounded: `public/workers/trackParser.worker.js:289-320`.
- JSON imports have depth and size guards plus worker isolation: `src/lib/parser.ts:469-621`, `public/workers/trackParser.worker.js:250-320`.
- No runtime auth/authz surface exists in this repo; this is a static client app with no API routes or session logic.
- No dangerous runtime HTML sinks were found beyond the controlled bootstrap script in `src/app/layout.tsx:53-58`.
- No remote geocoder or third-party data fetch path exists in the app runtime; network use is limited to local static assets and browser download/share flows.

## Security Checklist
- [x] Secrets scan completed
- [x] Dependency audit completed
- [x] Worker/message trust boundary reviewed
- [x] File parsing paths reviewed
- [x] Unsafe browser/XSS patterns reviewed
- [x] Auth/authz assumptions reviewed
- [ ] No vulnerable dependencies
- [ ] No client-side parsing DoS path
- [ ] CSP hardening independent of deployment path
