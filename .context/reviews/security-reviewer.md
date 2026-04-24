# Security Reviewer Review — review-plan-fix cycle 2

## Summary

Whole-repository security review of source, config, worker, scripts, tests,
deploy workflow, and current architecture docs.

- Critical issues: 0
- High issues: 0
- Medium issues: 1
- Low issues: 0
- Manual-validation / hardening risks: 2

## Inventory Reviewed

- App/config: `next.config.ts`, `package.json`, `package-lock.json`,
  `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/env.ts`, `src/types.ts`
- Parsing/file handling: `src/lib/parser.ts`,
  `public/workers/trackParser.worker.js`, `src/components/FileUpload.tsx`
- Map/trust boundary/export: `src/components/MapView.tsx`,
  `src/components/JourneyCreator.tsx`, `src/lib/useExportController.ts`,
  `src/lib/videoEncoder.ts`, `src/components/ExportPanel.tsx`,
  `src/components/GoogleGuide.tsx`, `src/components/ModalDialog.tsx`
- Storage/i18n/preferences: `src/lib/i18n.ts`, `src/lib/interpolate.ts`,
  `src/components/TimelineSelector.tsx`
- Static/deploy/security scripts: `scripts/harden-static-export.mjs`,
  `scripts/serve-static.mjs`, `scripts/smoke-static.mjs`,
  `scripts/fetch-map-styles.mjs`, `.github/workflows/deploy-pages.yml`
- Test/doc surfaces: `e2e/travelback.spec.ts`, `.context/README.md`,
  `.context/project/01-overview.md`, `.context/project/02-architecture.md`

## Confirmed Issues

### SEC-001 — GPX/KML imports can still lock the UI via main-thread XML parsing

- **Severity/confidence:** Medium / High
- **Category:** OWASP A04 Insecure Design / availability hardening
- **Evidence:** `src/lib/parser.ts:521-523`, `src/lib/parser.ts:653-673`,
  `src/components/FileUpload.tsx:19-20`, `src/components/FileUpload.tsx:52-60`
- **Problem:** GPX/KML files are allowed up to `200MB`, then parsed on the
  main thread via `FileReader.readAsText()` and `DOMParser`, while only JSON
  gets worker isolation.
- **Failure scenario:** A crafted `.gpx` or `.kml` file is valid enough to pass
  extension checks but expensive to parse. Opening it freezes or crashes the tab
  before recovery UI appears.
- **Suggested fix:** Move GPX/KML parsing into a worker too, or reduce XML
  limits sharply and reject complex files before DOM parsing.

## Risks Requiring Manual Validation / Hardening

### SEC-R01 — GitHub Pages deployment lacks browser-enforced anti-framing headers

- **Severity/confidence:** Low / High
- **Category:** OWASP A05 Security Misconfiguration
- **Evidence:** `src/app/layout.tsx:50-63`,
  `scripts/harden-static-export.mjs:8-29`,
  `.github/workflows/deploy-pages.yml:34-46`,
  `scripts/serve-static.mjs:147-157`
- **Scenario:** The app relies on a JS frame-buster in production because meta
  CSP cannot enforce `frame-ancestors`. The local preview server adds
  `X-Frame-Options: DENY`, but the GitHub Pages deploy path cannot attach
  equivalent headers.
- **Suggested fix:** Front the Pages site with a header-capable CDN or host
  that adds `Content-Security-Policy: frame-ancestors 'none'` and/or
  `X-Frame-Options: DENY`.

### SEC-R02 — Hardened CSP still permits inline styles

- **Severity/confidence:** Low / High
- **Category:** OWASP A05 Security Misconfiguration
- **Evidence:** `src/app/layout.tsx:60-64`,
  `scripts/harden-static-export.mjs:14-29`
- **Scenario:** Script CSP is strong after postbuild hashing, but
  `style-src 'unsafe-inline'` remains. No current XSS sink was found, so this
  is a containment weakness rather than a directly exploitable issue today.
- **Suggested fix:** Migrate inline styles to classes/static CSS and then remove
  `unsafe-inline` from `style-src`.

## No-Issue Evidence

- Secrets scan found no hardcoded API keys, bearer tokens, passwords, private
  keys, or `.env*` files in current source/config.
- `npm audit --json` and `npm audit --omit=dev --json` both returned
  `0` vulnerabilities.
- `npm run smoke:static` passed and confirmed hashed static CSP, local-only map
  styles, and no tool-state leakage into `out/`.
- No auth/session/JWT/backend/API route surface exists in current repo.
- No current unsafe sinks found beyond the static bootstrap
  `dangerouslySetInnerHTML` in `src/app/layout.tsx:55`, which is
  source-controlled and postbuild-hashed.
- External links use `rel="noopener noreferrer"` in
  `src/components/GoogleGuide.tsx:367-370`.
- Worker message validation is present in
  `public/workers/trackParser.worker.js:289-320`.

## Final Sweep

No relevant current source/config/test/doc file affecting secrets, parsing, DOM
sinks, worker trust boundaries, export/download behavior, CSP, static export, or
dependency posture was skipped. Historical review files under `.context/reviews/`
were not treated as authoritative runtime inputs.
