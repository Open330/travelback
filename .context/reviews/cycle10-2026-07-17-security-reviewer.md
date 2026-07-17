# Cycle 10 security review

Target: `3d74754369d22ad1bb9e7970634e0f0163d5b777`
Role: security reviewer
Date: 2026-07-17

## Result

One Low, likely/manual-validation local availability issue was found. No Critical, High, or Medium security issue, secret exposure, XSS path, unsafe remote request, privilege boundary violation, or known vulnerable dependency was confirmed.

## Inventory and threat surface coverage

The security pass read all 55 source/test paths; the 20 E2E/fixture paths; all 19 public assets; all seven scripts; root manifests/configs/README; and `.github/workflows/deploy-pages.yml`. The generated worker was checked against source, binary assets were inventoried, and the lock graph was audited. The 774 `.context/` and 39 `plan/` paths were catalogued and searched to distinguish current defects from accepted/deferred or fixed security findings. Dependency/build/generated trees were excluded from semantic review.

Threat flows checked included local GPX/KML/Google JSON parsing, worker messages and transferable buffers, DOM rendering and `dangerouslySetInnerHTML`, URL/filename construction, object URLs and download/save APIs, map style/resource loading, local storage, static file path resolution and headers, error text, workflow token permissions, third-party dependencies, and credential-like strings.

## Finding

### C10-CORE-03 — Missing output-field bound permits a user-triggered local availability/AT denial

- Severity: Low
- Confidence: Medium
- Status: Likely; manual browser/assistive-technology validation required
- OWASP lens: A04 Insecure Design (resource/output bounding)
- Locations: `src/lib/parse-utils.ts:18-27`, `src/lib/parser.ts:145-180`, `src/lib/parser.ts:214-230`, `src/app/page.tsx:330-340`, `src/app/page.tsx:636-640`, `src/components/TrackWorkspace.tsx:126-140`

XML imports are limited to 4 MiB and XML tag/depth/entity hazards are separately guarded, but a single `<name>` text node has no extracted-field limit. A crafted yet valid local GPX/KML file can place almost all allowed bytes in that node, retain two points, and cause the application to create multiple large title/live-region strings. The user must explicitly import the file, there is no persistence or cross-user delivery, and the practical browser/AT stall has not been measured, which keeps this Low. It is not an injection finding: React renders the value as text, and `src/lib/videoEncoder.ts:282-291` independently normalizes and caps the download filename.

Root fix: use a shared parser-boundary display-name normalizer for GPX/KML that rejects/collapses controls and whitespace, supplies a blank fallback, and caps Unicode length. Test over-limit names and confirm that both visible titles and the live region receive only the bounded value.

## Security controls verified

- Repository-wide secret-pattern and credential-file scans found no committed credential material. The workflow's `id-token: write` is an existing tracked permissions concern, not a newly introduced secret.
- `npm audit --audit-level=low --json` reported zero known vulnerabilities for the lock graph.
- `npm run check:worker` passed, preventing unnoticed drift between worker source and the public bundle.
- XML entity declarations are rejected before DOM parsing; XML depth/tag, file-size, point-count, JSON-depth, timeout, and abort controls are present.
- User-controlled track names and errors flow through React text nodes, not user-controlled HTML. The only inline bootstrap script is a static application string.
- Export filenames remove reserved/control characters and are length-bounded. Object URLs are revoked through controller cleanup.
- Bundled map styles declare no remote sources, glyphs, or sprites. No application fetch accepts a user-controlled URL.
- Static serving normalizes and contains requested paths and emits `nosniff`, frame, referrer, permissions, opener, and resource-policy headers. The known static-host/header limitations remain in the existing ledger and were not duplicated.

## Final missed-issue sweep

The closing OWASP/privacy pass rechecked access control (none exists because the app is client-only), cryptography (none used), injection, unsafe design/resource bounds, misconfiguration, dependency integrity, authentication assumptions, data integrity, logging/privacy, SSRF, path traversal, DOM sinks, browser storage, CI permissions, and local-file metadata exposure. No additional reportable issue survived exploitability analysis or historical deduplication.
