# Ultradeep Security Review — Travelback

**Date:** 2026-04-13  
**Reviewer:** Codex  
**Review type:** Repo-wide security and privacy audit  
**Recommendation:** **REQUEST CHANGES**

## Scope and method

This was a deep security-focused pass over the entire review-relevant repository.

### Coverage
Reviewed:
- all runtime code in `src/`
- deployment and preview-serving code
- dependency manifests / lockfile
- tests and fixtures relevant to trust boundaries
- documentation and privacy/security claims

### Security-specific checks performed
- repository secret-pattern scan ✅ no actual secrets found
- `npm audit --json` ✅ found 3 known vulnerabilities
- `npm ls next picomatch brace-expansion --all` ✅ traced vulnerable dependency paths
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npm run smoke:static` ✅

### Important context
This app is primarily a **static, client-side** application.
That means several classic server-side OWASP classes are mostly **not applicable** here:
- SQL injection
- server-side auth/session flaws
- server-side SSRF
- server-side RCE via request handling

The relevant security surface is instead:
- dependency risk,
- CSP / browser hardening,
- privacy / third-party data exposure,
- client-side availability abuse,
- supply-chain trust boundaries.

---

## Executive summary

I did **not** find hardcoded secrets or obvious direct XSS sinks beyond the framework-generated / app-owned inline script.

The biggest real security issues are:
1. **known vulnerable dependencies remain installed**,
2. **the CSP is too permissive to provide strong XSS containment**,
3. **the project’s privacy story is overstated** because third-party map/geocoder services do receive meaningful user-derived data,
4. **untrusted local file parsing can be abused for client-side denial of service**,
5. **remote map styles are mutable third-party supply-chain inputs**.

---

## Findings summary

| ID | Severity | Classification | Title |
|---|---|---|---|
| SEC1 | High | Confirmed | Known dependency vulnerabilities are present in installed packages |
| SEC2 | Medium | Confirmed | CSP is too permissive to be a strong XSS mitigation |
| SEC3 | Medium | Confirmed | Privacy/security claims overstate how little data leaves the browser |
| SEC4 | Medium | Likely | Untrusted local file parsing can be used for client-side availability DoS |
| SEC5 | Low | Likely | Remote map styles are mutable third-party supply-chain inputs |
| SEC6 | Low | Confirmed | No explicit anti-clickjacking protection is present |

---

## Detailed findings

### SEC1 — Known dependency vulnerabilities are present in installed packages
- **Severity:** High
- **Classification:** Confirmed
- **Files / regions:**
  - direct dependency: `package.json:17-35`
  - direct lockfile entry: `package-lock.json:5323-5333`
  - vulnerable transitive entries:
    - `package-lock.json:2384-2392`
    - `package-lock.json:5679-5685`
    - `package-lock.json:6554-6560`
- **Why this is a problem:**
  - `npm audit --json` reports:
    - **High:** `next@16.2.0` — GHSA-`q4gf-8mx6-v5v3` (“Next.js has a Denial of Service with Server Components”), affected `<16.2.3`
    - **High:** `picomatch@2.3.1` / `4.0.3` — GHSA-`c2c7-rcm5-vvqj` ReDoS via extglob quantifiers
    - **Moderate:** `brace-expansion@1.1.12` — GHSA-`f886-m6hf-6m8v` hang / memory exhaustion
- **Concrete failure scenario:**
  - The GitHub Pages deployment is static, which reduces runtime exposure to the specific Next server-components DoS.
  - But the repository still carries a direct high-severity vulnerable `next` version and high/moderate vulnerable toolchain packages. That leaves alternate deployments, local dev servers, CI, and future reuse of the repo exposed until upgraded.
- **Suggested fix:**
  - Upgrade `next` to at least `16.2.3` (or newer safe release).
  - Regenerate lockfile so `picomatch` and `brace-expansion` resolve to patched versions.
  - Add `npm audit` (or equivalent curated dependency scanning) to CI.
- **Confidence:** High

### SEC2 — CSP is too permissive to be a strong XSS mitigation
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/layout.tsx:47-52`
  - emitted output confirmation: `out/index.html:1`
- **Why this is a problem:**
  - The app sets a CSP, which is good, but it includes:
    - `script-src 'unsafe-inline' 'unsafe-eval'`
    - `style-src 'unsafe-inline'`
  - It also omits harder defense-in-depth directives such as `object-src 'none'`, `base-uri 'none'`, and `frame-ancestors`.
  - In practice, this means the CSP offers **limited XSS containment** if a future injection bug appears.
- **Concrete failure scenario:**
  - A future change accidentally introduces an HTML/script injection path through imported track metadata or some new rendering feature.
  - Because inline/eval are already allowed, the CSP does much less to contain the blast radius than a strict nonce/hash-based policy would.
- **Suggested fix:**
  - Move toward a stricter CSP using nonces or hashes where feasible.
  - Remove `unsafe-eval` if production build/runtime does not require it.
  - Add at least `object-src 'none'`, `base-uri 'none'`, and `frame-ancestors 'none'`.
- **Confidence:** High

### SEC3 — Privacy/security claims overstate how little data leaves the browser
- **Severity:** Medium
- **Classification:** Confirmed
- **Files / regions:**
  - privacy claims:
    - `README.md:222`
    - `.context/project/02-architecture.md:94-97`
  - third-party map/style endpoints:
    - `src/types.ts:15-35`
    - `src/components/MapView.tsx:203-211, 278-290`
  - third-party geocoder request:
    - `src/components/JourneyCreator.tsx:313-321`
- **Why this is a problem:**
  - The docs claim effectively “no server, no uploads” and even “no privacy concerns (tracks never leave the device)”.
  - But in practice the app uses third-party services:
    - CARTO / OpenFreeMap styles and tile infrastructure
    - OpenStreetMap/Nominatim geocoding in JourneyCreator
  - Even if raw files are not uploaded, these services can still observe:
    - map tile requests near the loaded route area,
    - fitBounds/playback movement over specific geography,
    - typed location-search queries.
- **Concrete failure scenario:**
  - A user loads a sensitive travel history (home/work/medical/legal locations).
  - The app pans/zooms over that geography, causing third-party tile/style services to receive requests revealing the approximate region.
  - If the user uses search, the exact place query is sent to Nominatim.
  - The user trusted the “no privacy concerns / no uploads” story and was not warned.
- **Suggested fix:**
  - Correct the privacy messaging: raw track files are processed locally, **but** map and search features rely on third-party services.
  - Offer an offline/self-hosted mode or allow users to disable geocoding / use self-hosted tiles.
  - Document the third-party data flows explicitly.
- **Confidence:** High

### SEC4 — Untrusted local file parsing can be used for client-side availability DoS
- **Severity:** Medium
- **Classification:** Likely
- **Files / regions:**
  - `src/components/FileUpload.tsx:17-18, 32-43`
  - `src/lib/parser.ts:46-64, 206-295`
- **Why this is a problem:**
  - The app accepts files up to **500 MB**.
  - Parsing happens on the main browser thread using `FileReader`, `DOMParser`, JSON parsing, and synchronous point extraction.
  - That creates a clear availability risk from maliciously large or adversarial files.
- **Concrete failure scenario:**
  - A user is sent a “travel file” that is technically under the size cap but intentionally pathological (huge JSON/XML, enormous point counts, parser-stressing structure).
  - Uploading it freezes the tab or makes the browser unresponsive for a long time.
- **Suggested fix:**
  - Lower the hard size ceiling.
  - Move parsing to a Web Worker.
  - Add point-count / structure caps and fail fast on suspiciously large inputs.
  - Consider progressive parsing instead of whole-file parse.
- **Confidence:** Medium

### SEC5 — Remote map styles are mutable third-party supply-chain inputs
- **Severity:** Low
- **Classification:** Likely
- **Files / regions:**
  - `src/types.ts:15-35`
  - `src/components/MapView.tsx:203-211, 278-290`
- **Why this is a problem:**
  - The app consumes style JSON from third-party endpoints at runtime.
  - Those are mutable remote assets outside the repo’s control.
  - A provider-side change can alter tile/glyph/sprite behavior or availability without any code change in this repo.
- **Concrete failure scenario:**
  - A provider changes a style definition, introduces a new remote asset dependency, or serves broken content.
  - The app’s map breaks or begins making unexpected remote requests while still appearing to be a local/static app.
- **Suggested fix:**
  - Self-host or pin audited style JSON/assets where practical.
  - At minimum, document the runtime trust boundary and monitor for upstream changes.
- **Confidence:** Medium

### SEC6 — No explicit anti-clickjacking protection is present
- **Severity:** Low
- **Classification:** Confirmed
- **Files / regions:**
  - `src/app/layout.tsx:49-52`
- **Why this is a problem:**
  - The CSP omits `frame-ancestors`.
  - That means the app can be embedded by other sites unless GitHub Pages or browser defaults prevent it.
- **Concrete failure scenario:**
  - A malicious site frames Travelback and overlays instructions or decoy UI to trick the user into interacting with file upload / search / export controls in a misleading context.
  - Impact is limited because the app has no authenticated account state, but it is still unnecessary exposure.
- **Suggested fix:**
  - Add `frame-ancestors 'none'` (or a deliberate allowlist if embedding is needed).
- **Confidence:** High

---

## What I did not find

- No hardcoded API keys, secrets, tokens, or private keys were found in the repository secret-pattern scan.
- No obvious direct XSS sink was found beyond the app-owned inline script in `layout.tsx`.
- No server-side auth/database/API code exists here, so many classical web-app vuln classes are not part of this repo’s active attack surface.

---

## Final missed-issues sweep

I did a final pass specifically for commonly missed security issues:
- hardcoded secrets,
- dangerous HTML/script sinks,
- unsafe file/path handling in the preview server,
- dependency risk,
- privacy/trust-boundary mismatches,
- weak browser hardening headers/CSP,
- abuse/DoS paths.

I do **not** believe any security-relevant source/config/doc file was skipped.

---

## Bottom line

For a static client-side app, the security posture is **not bad**, but it is **not as strong as the repo’s current messaging implies**.

The most important actions are:
1. upgrade vulnerable dependencies (`SEC1`),
2. tighten browser hardening / CSP (`SEC2`, `SEC6`),
3. correct privacy claims and document third-party data flows (`SEC3`),
4. reduce client-side parser DoS exposure (`SEC4`).

Until those are addressed, I would not describe the app as having “no privacy concerns,” and I would not consider the security posture production-hardened.
