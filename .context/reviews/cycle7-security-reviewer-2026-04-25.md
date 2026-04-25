# Cycle 7 Security Review Report

Risk level: MEDIUM

## Summary

- Critical issues: 0
- High issues: 0
- Medium issues: 1
- Low issues: 1

## Findings

### 1. MEDIUM — Main-thread XML parsing still allows local-file UI DoS

- Location: `src/lib/parser.ts:158`, `src/lib/parser.ts:533`, `src/lib/parser.ts:669`, `src/components/FileUpload.tsx:52`, `scripts/smoke-static.mjs:188`
- Category: OWASP A04 / CWE-400 uncontrolled resource consumption
- Exploitability: Local, user-assisted
- Blast radius: Single tab/app session freeze or long unresponsiveness during import
- Confidence: High
- Issue: GPX/KML files are still read and parsed on the main thread. The repo caps XML at 4 MB, but `FileReader.readAsText()` plus `DOMParser.parseFromString()` still happen on the UI thread before point-budget rejection. A crafted or pathologically dense XML file under the cap can stall the app hard enough to create a practical availability failure.
- Exploit scenario: An attacker shares a "sample route" GPX/KML that stays under the size limit but contains enough XML structure/coordinates to keep the browser busy for seconds or longer. The user imports it and the UI hangs before the app can recover or show a safe error.
- Suggested fix: Move GPX/KML parsing to a worker, or reduce the XML size cap to a safer synchronous parsing limit and document the product tradeoff.

### 2. LOW — GitHub Pages deployment path cannot deliver the response-header hardening tested locally

- Location: `.github/workflows/deploy-pages.yml:33`, `scripts/serve-static.mjs:147`, `.context/project/01-overview.md:30`, `.context/project/02-architecture.md:114`, `src/app/layout.tsx:63`
- Category: OWASP A05 security misconfiguration
- Exploitability: Remote, browser-side
- Blast radius: Production pages lose header-enforced anti-framing and isolation controls
- Confidence: High
- Issue: Local/static smoke validation relies on `scripts/serve-static.mjs` adding `X-Frame-Options`, `Cross-Origin-Opener-Policy`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, and HSTS. The actual deployment workflow uploads raw `out/` to GitHub Pages, and repo docs note that Pages cannot attach custom anti-framing headers.
- Exploit scenario: The deployed Pages app runs without header-level controls exercised in local smoke tests, weakening clickjacking resistance and opener/isolation guarantees in the real host environment.
- Suggested fix: Deploy behind a header-capable CDN/host and enforce required headers there, or keep documentation explicit that GitHub Pages relies on the JS frame-buster and cannot provide equivalent protection.

## Clean Areas

- No hardcoded API keys, passwords, bearer tokens, private keys, or `.env*` files were found in active source/config.
- `npm audit --json` returned no current prod/dev vulnerabilities in the review lane.
- No unsafe DOM/script patterns such as `eval`, `new Function`, `innerHTML`, `document.write`, or untrusted `dangerouslySetInnerHTML` were found.
- No auth/session/database surface exists in this static client app.

## Final Sweep

A final repo-wide sweep for secrets, unsafe DOM APIs, worker messaging, fetch/network use, file parsing, frame/script CSP regressions, and auth assumptions did not produce additional actionable issues.

