# Cycle 2 Security Review — 2026-04-26

**Reviewer:** security-reviewer  
**Scope:** Entire Travelback repository security surface: OWASP Top 10, secrets, trust boundaries, auth/authz, CSP, privacy, file parsing, static serving, worker messaging, export/download, CI/dependency supply chain, and active docs/context.  
**Overall risk level:** LOW  
**Finding counts:** Critical 0, High 0, Medium 0, Low 0.  
**Conclusion:** No actionable security vulnerability found in the current repository snapshot. Evidence below is from current code/config behavior, not comments or tests alone.

## Review Inventory

I built the review inventory before assessing findings. Security-relevant generated outputs and tool state were excluded from behavioral conclusions unless they affect shipping output; active source/config/scripts/tests/docs were included.

### Runtime source and app surface examined
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico`
- Components: `src/components/Controls.tsx`, `ElevationProfile.tsx`, `ErrorBoundary.tsx`, `ExportPanel.tsx`, `FileUpload.tsx`, `GlobalToolbar.tsx`, `GoogleGuide.tsx`, `JourneyCreator.tsx`, `KeyboardHelp.tsx`, `MapView.tsx`, `ModalDialog.tsx`, `SceneEditor.tsx`, `ThemeToggle.tsx`, `TimelineSelector.tsx`, `Toast.tsx`, `TrackToolbar.tsx`, `TrackWorkspace.tsx`
- Libraries/types/styles: `src/lib/camera.ts`, `env.ts`, `i18n.ts`, `interpolate.ts`, `parser.ts`, `useExportController.ts`, `usePlaybackController.ts`, `videoEncoder.ts`, `src/types.ts`, `src/styles/vitro-base.css`
- Public runtime assets: `public/workers/trackParser.worker.js`, `public/map-styles/{bright,dark,liberty,positron,voyager}.json`, public SVG/font/sample assets scanned for active content or remote references.

### Build, deploy, config, tests, docs/context examined
- Root/config: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `playwright.config.ts`, `playwright.static.config.ts`, `README.md`
- Scripts: `scripts/fetch-map-styles.mjs`, `harden-static-export.mjs`, `run-dev-e2e.mjs`, `run-static-e2e.mjs`, `serve-static.mjs`, `smoke-static.mjs`
- CI: `.github/workflows/deploy-pages.yml`
- E2E and fixtures: `e2e/travelback.spec.ts`, all files under `e2e/fixtures/`
- Active context docs: `.context/README.md`, `.context/agents/non-tech-traveler-reviewer.md`, `.context/development/01-conventions.md`, `.context/project/01-overview.md`, `.context/project/02-architecture.md`
- Existing/archival `.context/reviews`, `.context/plans`, `plan/`, `.omx/`, `.omc/`, `playwright-report/`, `test-results/`, `.next/`, `out/`, and `node_modules/` were not treated as live behavior. They were considered only for prior-risk awareness and excluded from current-source secret conclusions to avoid review-text false positives.

## Verification Performed

- Dependency audit:
  - `npm audit --omit=dev --audit-level=low` → `found 0 vulnerabilities`
  - `npm audit --audit-level=low` → `found 0 vulnerabilities`
- Current-source secrets scan excluding generated output, lockfile, review/plan archives, and tool state found only `.github/workflows/deploy-pages.yml:8-11` (`id-token: write`) as an expected GitHub Pages OIDC permission. No hardcoded API keys, bearer tokens, passwords, private keys, client secrets, `.env*`, or credential literals found.
- Git-history secret-pattern scan produced prior review text false positives only; no actual secret material identified in reviewed output.
- Dangerous sink scan covered `dangerouslySetInnerHTML`, `innerHTML`/`outerHTML`, `eval`, `new Function`, `DOMParser`, `Worker`, `postMessage`, `fetch`, `createObjectURL`, `localStorage`, external links, CSP, auth/session/database strings.
- SVG active-content scan found no `<script>`, event-handler attributes, `javascript:` URLs, `foreignObject`, or remote `href`/`xlink:href` in `public/` or `src/app/favicon.ico`.
- Package-lock source check found all `resolved` URLs use `https://registry.npmjs.org/`.

## Findings

No Critical, High, Medium, or Low actionable findings.

## Security Analysis by Area

### Secrets / Sensitive Data
**Status:** No issue found. **Confidence:** High.

Evidence:
- No auth/session/database/API-key code paths were found under `src/app` or `scripts`; `src/app` contains only `layout.tsx`, `page.tsx`, CSS, and favicon assets.
- Secret scan over current source/config found no credentials. The only live non-doc hit is `.github/workflows/deploy-pages.yml:8-11`, where `contents: read`, `pages: write`, and `id-token: write` are expected for Pages deployment.
- App data is client-local by design: parsing starts from user-provided `File` objects in `src/components/FileUpload.tsx:53-61` and `src/lib/parser.ts:685-743`; there is no upload endpoint.

### Authentication / Authorization / Access Control
**Status:** Not applicable to this static app; no issue found. **Confidence:** High.

Evidence:
- `next.config.ts:16-24` sets `output: 'export'`; no `src/app/api/**`, route handlers, middleware, cookie/session/JWT/password logic, or database layer exists.
- Browser-only route/track operations do not cross an authorization boundary; `JourneyCreator` normalizes local coordinates before adding waypoints (`src/components/JourneyCreator.tsx:35-40`, `309-318`, `349-358`).

### Injection / XSS / Unsafe DOM
**Status:** No issue found. **Confidence:** High.

Evidence:
- The only `dangerouslySetInnerHTML` is a static bootstrap string in `src/app/layout.tsx:53-58`; it reads allowlisted `localStorage` values and sets document attributes, but does not incorporate uploaded file content, URL parameters, or remote data.
- User-visible file/track names are rendered through React text nodes, and exported filenames are sanitized before use: `src/lib/videoEncoder.ts:172-182` removes forbidden filename/control characters, trims trailing dots/spaces, and caps length.
- No `eval`, `new Function`, `insertAdjacentHTML`, `document.write`, message-event listener, or user-controlled HTML sink was found in current source.
- External link hygiene is correct: the Google Takeout link is a constant and uses `target="_blank" rel="noopener noreferrer"` (`src/components/GoogleGuide.tsx:174-177`, `367-371`).

### File Parsing / Worker Trust Boundary / DoS Controls
**Status:** No actionable issue found. **Confidence:** Medium-High.

Evidence:
- Upload extension allowlist is enforced before parsing for drag/drop and browser file picker advertises `.gpx,.kml,.json` (`src/components/FileUpload.tsx:19-20`, `101-108`, `148-152`). Parser still enforces type-specific limits and supported-format errors (`src/lib/parser.ts:685-743`).
- XML parsing rejects DTD/entity declarations and bounds complexity before `DOMParser`: `src/lib/parser.ts:160-191` rejects `<!DOCTYPE`/`<!ENTITY`, caps tags at `XML_MAX_TAGS`, caps nesting at `XML_MAX_NESTING_DEPTH`, then checks browser parser errors. XML file size is capped at 4 MB (`src/lib/parser.ts:576-578`, `688-697`).
- Google JSON parsing is worker-isolated for large inputs: `src/lib/parser.ts:598-681` transfers an `ArrayBuffer` to `public/workers/trackParser.worker.js`, and large files avoid main-thread fallback (`src/lib/parser.ts:603-617`, `666-678`). Worker validates message shape, extension, buffer type, byte limit, JSON depth, and point count (`public/workers/trackParser.worker.js:316-348`, `270-294`, `297-313`).
- Coordinate extraction validates finite latitude/longitude bounds in both main parser and worker, e.g. `src/lib/parser.ts:200-205`, `520-567`; `public/workers/trackParser.worker.js:29-60`, `113-159`.

### CSP / Framing / Static Deployment Security
**Status:** No current code issue found; host-level anti-framing remains deployment-dependent by design. **Confidence:** Medium-High.

Evidence:
- Runtime placeholder CSP is restrictive except for development/static-export bootstrap needs: `src/app/layout.tsx:63-67` sets `default-src 'self'`, `script-src-attr 'none'`, `style-src 'self'`, `style-src-elem 'self'`, `object-src 'none'`, `base-uri 'none'`, `connect-src 'self'`, `worker-src 'self' blob:`, `form-action 'self'`, and `upgrade-insecure-requests`.
- Production hardening replaces the placeholder with hash-based script policy and refuses to publish `unsafe-inline` script allowance: `scripts/harden-static-export.mjs:15-32`, `60-71`, `97-129`.
- Static smoke checks assert no inline-script regression, no Nominatim/external connect allowance, no `frame-ancestors` in meta CSP, and required `object-src 'none'` / `base-uri 'none'`: `scripts/smoke-static.mjs:135-195`.
- Local static server adds defense-in-depth response headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Strict-Transport-Security`, `Permissions-Policy`, COOP, and CORP (`scripts/serve-static.mjs:151-162`).
- `frame-ancestors` is correctly not advertised in meta CSP because browsers ignore it there; the app includes an early frame-busting bootstrap (`src/app/layout.tsx:53-58`) and docs state header-capable hosts should send real anti-framing headers (`.context/project/02-architecture.md:114-120`). This is a known static-host limitation, not a newly introduced code vulnerability.

### Privacy / Network Egress
**Status:** No issue found. **Confidence:** High.

Evidence:
- Map styles are local and contain no sources, sprites, glyphs, or remote URLs (`public/map-styles/*.json`; generated by `scripts/fetch-map-styles.mjs:14-44`). Runtime map style URLs are same-origin (`src/types.ts:31-51`), and `MapView` consumes only those enum-backed style URLs (`src/components/MapView.tsx:576-583`, `677-696`).
- Manual journey search is local coordinate parsing only; no geocoder/network request exists. `parseCoordinateQuery` parses `geo:`, `@lat,lng`, `q/ll`, `#map`, or raw coordinates and rejects out-of-range values (`src/components/JourneyCreator.tsx:104-141`, `492-512`).
- Client fetches are limited to same-origin sample/runtime checks: sample load fetches `${basePath}/sample-trip.gpx` (`src/app/page.tsx:325-338`), and export picker fallback fetches an object URL only when no blob was passed (`src/lib/videoEncoder.ts:195-209`). CSP `connect-src 'self'` blocks arbitrary external client fetch in shipped app.
- Referrer exposure is minimized via `<meta name="referrer" content="no-referrer" />` (`src/app/layout.tsx:73`) and server `Referrer-Policy: no-referrer` in static preview (`scripts/serve-static.mjs:151-158`).

### Download / Object URL / Local Storage
**Status:** No issue found. **Confidence:** High.

Evidence:
- Export object URLs are revoked on reset/unmount/replacement (`src/lib/useExportController.ts:70-99`, `188-204`).
- Download filenames are sanitized (`src/lib/videoEncoder.ts:172-182`), and File System Access API writes are limited to a user-activated save dialog with MP4 accept types (`src/lib/videoEncoder.ts:196-209`).
- `localStorage` stores only preferences/test toggles (`travelback-theme`, `travelback-mapstyle`, locale, units, hint/debug/test flags), not uploaded track data, secrets, or auth tokens. Debug/export test toggles are constrained to development or localhost (`src/components/MapView.tsx:595-606`, `src/lib/useExportController.ts:20-29`, `src/components/ExportPanel.tsx:37-46`).

### Supply Chain / CI
**Status:** No issue found. **Confidence:** High.

Evidence:
- `npm audit` returned zero vulnerabilities for production-only and all dependencies.
- `package-lock.json` resolved URLs are registry HTTPS URLs only.
- CI gates lint, typecheck, high-severity audit, build, and static E2E before Pages artifact upload (`.github/workflows/deploy-pages.yml:26-35`).

## OWASP Top 10 Checklist

- [x] A01 Broken Access Control — no backend/API/authz surface; no protected resources in repo.
- [x] A02 Cryptographic Failures — no custom crypto or secret storage; `crypto.randomUUID()` in `src/types.ts:1-5` is for UI IDs, not security tokens.
- [x] A03 Injection — no SQL/NoSQL/command execution; React escaping used; only hardcoded bootstrap uses `dangerouslySetInnerHTML`; XML/JSON parser guards reviewed.
- [x] A04 Insecure Design — client-only privacy boundary reviewed; no app-owned upload/geocoder/tile exfiltration path.
- [x] A05 Security Misconfiguration — CSP/static hardening and static server headers reviewed; host-level anti-framing limitation documented.
- [x] A06 Vulnerable and Outdated Components — `npm audit` clean; lockfile registry URLs checked.
- [x] A07 Identification and Authentication Failures — no auth/session/password/JWT surface.
- [x] A08 Software and Data Integrity Failures — lockfile present, registry HTTPS sources, CI uses `npm ci`; no dynamic remote script/style/map asset dependency found.
- [x] A09 Security Logging and Monitoring Failures — no backend monitoring surface; client logs reviewed and do not expose secrets.
- [x] A10 SSRF — no server-side fetch; client fetches are same-origin/object-URL scoped and CSP limits `connect-src` to self.

## Final Sweep / Skipped File Confirmation

Final sweep covered every active security-relevant file in the inventory above: source, configs, scripts, worker, public map styles/SVG assets, CI, E2E fixtures/tests, and active docs/context. No current runtime/build/test/config source file relevant to OWASP, secrets, trust boundaries, auth, CSP, or privacy was skipped.

Excluded from behavioral review: generated output (`out/`, `.next/`, `playwright-report/`, `test-results/`), dependencies (`node_modules/`), tool/session state (`.omx/`, `.omc/`), and archival review/plan logs. Those files do not define current application behavior; including them in secret findings would create false positives from prior review prose. The one allowed write for this task is this artifact: `.context/reviews/cycle2-security-reviewer-2026-04-26.md`.
