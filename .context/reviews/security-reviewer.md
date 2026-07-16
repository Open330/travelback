# Security Reviewer — Cycle 2 (2026-07-16)

## Inventory and coverage

Reviewed the 110 current nonhistorical tracked paths at cc6f24f: all application/worker source and tests, parsers and fixtures, public static assets, build/serve/hardening scripts, dependency manifest/lock, Pages workflow, configs, README, and active architecture/context. Examined untrusted GPX/KML/JSON handling, point/depth/file limits, worker lifecycle, DOM insertion, filenames/download/share, CSP, frame handling, static path normalization/cache headers, local-only privacy claims, dependency advisories, and workflow privilege.

Validation: npm audit --audit-level=high reports zero vulnerabilities; lint, typecheck, 266 unit tests, production build, generated-worker check, and static smoke pass.

## Findings

### SEC2-01 — The emitted CSP starts after executable scripts

Severity: Medium | Confidence: High | Status: Confirmed emitted-artifact defect

Evidence: layout.tsx:60-70 places the beforeInteractive bootstrap before the CSP declaration. harden-static-export.mjs:125-173 replaces the meta tag in place and asserts its contents, but never moves it before executable content or asserts ordering. A fresh build produced out/index.html with the first script at byte 492, CSP at byte 1159, and seven scripts before the policy; out/404.html and out/_not-found.html each had five scripts before CSP. The W3C CSP specification states that meta-delivered policies are not applied to content that precedes them: https://www.w3.org/TR/CSP/latest/#meta-element

Failure scenario: the seven early script fetch/execution decisions are outside the hash-based policy. This weakens the documented injection mitigation and means the static smoke can pass while part of the document is not protected.

Fix: postprocess the CSP meta to the earliest valid head position before every script/link execution boundary, or deliver CSP as an HTTP response header on capable hosts. Add a build/smoke invariant that the CSP offset precedes the first script and other policy-controlled active content in every emitted HTML file.

### SEC2-02 — Build/test retains Pages and OIDC write permissions

Severity: Medium | Confidence: High | Status: Confirmed, carried from AG-05; change remains authorization-blocked

Evidence: .github/workflows/deploy-pages.yml:8-11 grants pages:write and id-token:write at workflow scope; the build job at lines 17-35 therefore inherits them while installing and executing repository dependencies and tests. The deploy job at lines 37-45 is the only job that needs those permissions.

Failure scenario: a compromised install/build/test dependency executes with a GitHub OIDC token minting surface and Pages write authority rather than read-only build authority.

Fix: after explicit CI/CD authorization, set top-level permissions to contents:read and grant pages:write/id-token:write only to deploy. Do not deploy or dispatch while validating.

### SEC2-03 — CI still omits the unit security/correctness corpus

Severity: High | Confidence: High | Status: Confirmed, carried from AG-04; change remains authorization-blocked

Evidence: package.json:14-21 defines npm test, while deploy-pages.yml:26-32 runs install, browser install, lint, typecheck, audit, build, and static E2E without npm test. The current unit suite contains parser entity/depth/budget tests, worker validation/lifecycle tests, abort cleanup, and encoder cleanup checks.

Failure scenario: a parser/worker/encoder safety regression can merge and deploy while the exact unit guard that catches it is never run in CI.

Fix: after explicit CI/CD authorization, add npm test before build and retain audit/build/static E2E. Validate the workflow without dispatching or deploying.

## Verified controls / no finding

XML DOCTYPE/entity rejection, 4 MB XML and 100 MB JSON limits, 250k parse-wide point budget, complete depth validation in a generated worker, worker abort/timeout/schema validation, local-only map styles, path traversal rejection in the static server, filename sanitization, object/base restrictions, hashed inline scripts after the CSP point, and zero current npm advisories were all verified. No secret, network exfiltration path, unsafe HTML derived from user track data, or external map/geocoder runtime dependency was found.

## Missed-issue sweep

Rechecked untrusted input to DOM/map/export sinks, all fetch/worker URLs, CSP directives and ordering, server request normalization, storage use, external links, package advisories, and workflow authority. No additional new confirmed security finding met the threshold.
