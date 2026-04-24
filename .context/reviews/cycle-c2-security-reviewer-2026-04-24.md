# Cycle C2 Security Review — 2026-04-24

**Reviewer:** security-reviewer  
**Scope:** security/privacy, CSP/static export, secrets, unsafe parsing/download patterns, auth/authz if present.  
**Result:** **0 real current security/privacy findings**.  
**Overall risk level:** **LOW** for a static, client-only app.  
**Confidence:** **High** — all current source/security-relevant scripts were inspected, dependency audit and static smoke checks were run, and previous generated/review artifacts were excluded from current-source secret conclusions.

## Inventory reviewed

- Project/context rules: `.context/README.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`.
- Static export / CSP / deployment: `next.config.ts`, `src/app/layout.tsx`, `scripts/harden-static-export.mjs`, `scripts/smoke-static.mjs`, `scripts/serve-static.mjs`, `.github/workflows/deploy-pages.yml`, current `out/index.html` CSP.
- Client input and privacy surfaces: `src/components/FileUpload.tsx`, `src/lib/parser.ts`, `public/workers/trackParser.worker.js`, `src/components/JourneyCreator.tsx`, `src/app/page.tsx`, `src/components/GoogleGuide.tsx`, `src/components/MapView.tsx`.
- Download/export surfaces: `src/lib/videoEncoder.ts`, `src/lib/useExportController.ts`, `src/components/ExportPanel.tsx`.
- Auth/API/data surfaces: `src/app/**`, `src/lib/**`, `scripts/**`, package/dependency config.

## Verification performed

- `npm audit --audit-level=low --json` → **0 vulnerabilities** across 466 total dependencies.
- `npm run smoke:static` → **passed**; validates static serving, hardened CSP, local-only map styles, no forbidden tool-state directories in `public`/`out`.
- Current-source secret scan excluding generated outputs, lockfile, prior review/plan text: only `.github/workflows/deploy-pages.yml:11` (`id-token: write`, expected GitHub Pages OIDC permission) matched; **no hardcoded credentials/secrets** found.
- Git-history secret-pattern scan excluding lockfile and review/plan text found only GitHub Pages OIDC workflow permission history; **no actual secret material** found in reviewed output.
- API/auth inventory: `find src/app -type f \( -name 'route.ts' -o -name 'route.js' \)` and `find src/app -path '*/api/*'` returned **0 routes**.

## Findings

No Critical, High, Medium, or Low actionable security findings were identified in the current codebase.

## Evidence by scope

### CSP and static export — no current finding

- `src/app/layout.tsx:49-63` uses one inline bootstrap script and a development/static-export placeholder CSP. The inline script is constant application code, not built from user-controlled input, and the placeholder still blocks `script-src-attr`, `object-src`, `base-uri`, restricts `connect-src` to self, and sets `upgrade-insecure-requests`.
- `scripts/harden-static-export.mjs:14-29` replaces the production static CSP with hash-based `script-src`, keeps `base-uri 'none'`, `object-src 'none'`, `form-action 'self'`, `connect-src 'self'`, and `worker-src 'self' blob:`.
- `scripts/harden-static-export.mjs:57-68` computes hashes for emitted inline scripts; `scripts/harden-static-export.mjs:71-102` replaces the CSP meta and fails if no CSP meta is replaced.
- `scripts/smoke-static.mjs:76-120` checks the emitted CSP has script hashes, rejects production `script-src 'self' 'unsafe-inline'`, confirms `connect-src 'self'`, confirms absence of meta `frame-ancestors`, and verifies `object-src 'none'` / `base-uri 'none'`.
- Current `out/index.html` inspection confirmed: `script-src 'self' 'sha256-...'`, no production script `unsafe-inline`, no `frame-ancestors` in meta CSP, and 8 hashed inline scripts.
- `scripts/serve-static.mjs:147-158` adds hardening headers for local static preview, including `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, HSTS, Permissions-Policy, COOP, and CORP.

### Secrets and privacy — no current finding

- Secret scans of current source/config found no API keys, passwords, bearer tokens, private keys, client secrets, or `.env*` files. The only non-doc hit was `.github/workflows/deploy-pages.yml:8-11`, where `id-token: write` is the expected OIDC permission for GitHub Pages deploy.
- `src/app/layout.tsx:69` sets `<meta name="referrer" content="no-referrer" />`.
- Map styles are local-only: `scripts/smoke-static.mjs:122-145` rejects sprite/glyph/source/symbol-layer dependencies, and direct inspection of `public/map-styles/*.json` showed empty `sources`, no `sprite`, no `glyphs`, and no symbol layers.
- Journey coordinate search is local parsing only: `src/components/JourneyCreator.tsx:74-109` decodes pasted text/URLs and extracts coordinates with bounded lat/lon validation; there is no geocoder/network request.
- External guide links are fixed app-provided values and use `target="_blank"` with `rel="noopener noreferrer"` at `src/components/GoogleGuide.tsx:366-375`.

### Unsafe parsing / file handling — no current finding

- Upload accepts only `.gpx`, `.kml`, `.json` in UI paths (`src/components/FileUpload.tsx:19-20`, `src/components/FileUpload.tsx:95-107`) and delegates parser-side enforcement to `parseTrackFile`.
- Parser file-size caps are enforced before reading/parsing: `src/lib/parser.ts:485-486` sets 200 MB overall / 100 MB JSON limits, and `src/lib/parser.ts:576-586` rejects oversized input before parse.
- XML parsing strips declarations/entities before DOM parsing (`src/lib/parser.ts:109-121`), and GPX/KML coordinates are finite and range-checked before use (`src/lib/parser.ts:49-68`, `src/lib/parser.ts:124-161`, `src/lib/parser.ts:164-176`). This materially reduces XXE/entity-expansion and coordinate-poisoning risk in the browser parser context.
- Google JSON parser enforces max nesting depth before `JSON.parse` (`src/lib/parser.ts:410-435`) and validates all supported coordinate formats (`src/lib/parser.ts:210-225`, `src/lib/parser.ts:229-340`).
- Large JSON is parsed in a same-origin worker (`src/lib/parser.ts:493-573`); worker messages validate shape, extension, buffer type, byte size, JSON depth, and point count (`public/workers/trackParser.worker.js:250-320`).
- Parsed tracks must have at least 2 points and at most 250,000 points before acceptance (`src/lib/parser.ts:588-595`).

### Download/export — no current finding

- Export filenames are sanitized before download: `src/lib/videoEncoder.ts:147-157` normalizes the track name, removes path separators/control characters and reserved filename characters, trims trailing dots/spaces, limits to 64 chars, and appends `.mp4`.
- File System Access API use is gated on user activation and falls back safely on cancellation (`src/lib/videoEncoder.ts:171-189`).
- Fallback anchor download uses a blob/object URL generated by the app, not untrusted remote URL input, and removes the temporary anchor (`src/lib/videoEncoder.ts:191-211`).
- Export object URLs are tracked and revoked on replacement/error/reset (`src/lib/useExportController.ts:158-173`), reducing blob lifetime/data retention risk.

### Auth/authz / server-side access control — not applicable

- No `src/app/api` directory or `route.ts`/`route.js` handlers are present.
- `next.config.ts:3-10` configures `output: 'export'` with a static base path. There is no app-owned backend, database layer, cookie/session/JWT/password code, or authorization boundary in current source.
- Local preview path traversal is guarded: `scripts/serve-static.mjs:86-102` decodes, normalizes, resolves against `out`, rejects NUL bytes, and returns 403 if a request resolves outside `out`.

## OWASP Top 10 checklist

- [x] A01 Broken Access Control — N/A for app backend; static preview path traversal guarded (`scripts/serve-static.mjs:86-102`).
- [x] A02 Cryptographic Failures — No custom crypto or stored sensitive server data; no secrets found.
- [x] A03 Injection — No SQL/command sinks; no `eval`/`new Function`; fixed inline bootstrap is CSP-hashed for static export; XML/JSON/coordinate parsing bounded/validated.
- [x] A04 Insecure Design — Client-only design keeps raw travel files local; normal map display uses local styles only.
- [x] A05 Security Misconfiguration — Static CSP/header posture is hardened and smoke-tested.
- [x] A06 Vulnerable and Outdated Components — `npm audit --audit-level=low --json` reported 0 vulnerabilities.
- [x] A07 Identification and Authentication Failures — N/A; no auth implementation.
- [x] A08 Software and Data Integrity Failures — Static build hardening and smoke checks present; GitHub Pages workflow includes lint/typecheck/audit/build/smoke/e2e gates.
- [x] A09 Security Logging and Monitoring Failures — N/A for backend monitoring; client errors do not expose secrets in reviewed paths.
- [x] A10 SSRF — No server-side fetch surface; client fetches are same-origin sample/static resources (`src/app/page.tsx:222-235`, `src/lib/videoEncoder.ts:180` fallback only fetches an app-created blob URL when no blob arg is supplied).

## Remaining non-finding notes

- GitHub Pages cannot enforce `frame-ancestors` via response headers by itself; this is documented in `.context/project/02-architecture.md` and mitigated by the inline frame-buster plus `X-Frame-Options: DENY` in the local preview server. This is a known host limitation, not a new current code issue.
- Production `style-src 'unsafe-inline'` remains because the app/framework uses inline styles. I did not identify an exploit path from current code because untrusted user content is rendered through React text/props rather than injected CSS/HTML.
