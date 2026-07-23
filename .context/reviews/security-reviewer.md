# Security review

**Review date:** 2026-07-23
**Reviewer:** security-reviewer
**Scope:** repository-wide, read-only review of the current worktree
**Overall risk:** **High release risk / low exposed runtime attack surface**

## Executive summary

Travelback has a small and unusually well-contained production trust boundary: it is a static export, route files are parsed in the browser, map assets are bundled locally, React owns user-visible text rendering, and the build adds a restrictive CSP. I found no embedded credentials, direct DOM injection from imported route data, remote map/data exfiltration, `eval`/`Function` use, or server-side request handler in the deployed application.

The release is nevertheless blocked by a confirmed production dependency finding: the lockfile installs `next@16.2.10` and `sharp@0.34.5`, and the live production audit reports both as **high severity**. The listed Next exploit paths mostly require middleware, Server Actions, rewrites, a custom server, or image optimization, none of which the static GitHub Pages artifact exposes. That materially reduces present deployed exploitability, but it does not make the failing audit or vulnerable build dependency acceptable.

Four findings are recorded below. There are no critical findings.

## Coverage and method

The repository inventory contained 961 tracked files: 60 under `src/`, 20 under `e2e/`, 19 under `public/`, 7 under `scripts/`, 39 under `plan/`, 804 under `.context/`, and the root/build configuration files. I inventoried the full tree before reviewing it.

The line-by-line security pass covered every executable or security-relevant text file in:

- all 60 `src/` files, including application code, parsers, worker source, hooks, CSS, and all unit tests;
- all 20 E2E files and fixtures;
- all 7 scripts;
- all 19 public assets/styles, including the generated worker; the two binary assets were type/hash checked;
- `package.json`, `package-lock.json`, `.github/workflows/deploy-pages.yml`, both Playwright configs, Next/TypeScript/Vitest/ESLint/PostCSS configs, and `.gitignore`;
- `README.md`, `.context/README.md`, project architecture/conventions, and reviewer instructions.

Archived plans, prior review prose, and historical `.context` artifacts were inventoried but excluded from source-level vulnerability analysis after confirming they are not shipped or executed. The review then traced interactions across file parsing → worker → React/map rendering → video export/download, and build → CSP hardening → static server → Pages workflow. A final missed-findings sweep covered secrets, sinks, browser storage, object URLs, workers, XML, path handling, network calls, dependency state, and CI permissions.

## Findings at a glance

| ID | Severity | Confidence | Status | Location |
|---|---|---:|---|---|
| SEC-01 | High | High | Confirmed by live audit | `package.json:24-31`; `package-lock.json:6689-6717`, `7539-7549`; `.github/workflows/deploy-pages.yml:26-31` |
| SEC-02 | Medium | High | Confirmed configuration weakness | `.github/workflows/deploy-pages.yml:8-11`, `18-35`, `37-45` |
| SEC-03 | Low | High | Confirmed local-preview path | `scripts/serve-static.mjs:16-18`, `97-115`, `164-178` |
| SEC-04 | Low | High | Confirmed latent availability bug | `scripts/harden-static-export.mjs:52-87`; `scripts/smoke-static.mjs:144-240` |

## SEC-01 — Production audit has two high-severity vulnerable packages

**Severity:** High for dependency policy/release integrity; current static deployment exploitability is low and not confirmed
**Confidence:** High
**Status:** Confirmed by `npm audit --omit=dev --json` on 2026-07-23

### Evidence

- `package.json:29` permits `next@^16.2.10`.
- `package-lock.json:6689-6693` locks Next to `16.2.10`.
- `package-lock.json:6708-6717` pulls `sharp@^0.34.5` as a Next optional dependency.
- `package-lock.json:7539-7545` locks Sharp to `0.34.5`.
- `.github/workflows/deploy-pages.yml:30` intentionally fails deployment on high audit findings.
- The live production audit returned exit code 1, with 2 high / 0 critical findings and `fixAvailable: true`:
  - Next `<16.2.11`: four high advisories involving middleware/proxy bypass, Server Actions DoS, custom-server Server Action SSRF, and attacker-controlled rewrite SSRF, plus moderate advisories.
  - Sharp `<0.35.0`: inherited libvips vulnerabilities grouped under [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj).

### Concrete failure scenario

Every push to `main` reaches `npm audit --audit-level=high` and fails before the static build/deployment. If the project later adds one of the affected Next server features without first upgrading, the corresponding high-severity path becomes reachable. Sharp also runs during build/install even though the deployed site disables Next image optimization.

`next.config.ts:9-17` confirms the current mitigating context: `output: 'export'` and `images.unoptimized: true`. I found no Server Actions, middleware, rewrites, custom production Next server, or image optimizer route. Therefore this is a real release/supply-chain defect, not evidence that the present Pages bundle is remotely exploitable through those Next advisories.

### Recommended fix

Upgrade and lock Next to a patched stable release at or above the advisory-fixed range (`>=16.2.11` for the listed Next findings) and ensure the resulting tree resolves Sharp to `>=0.35.0`. Update `eslint-config-next` in step with Next. Then rerun:

1. `npm audit --omit=dev --json`
2. `npm test`
3. `npm run lint`
4. `npm run typecheck`
5. static build/smoke/E2E

Do not bypass or remove the audit gate to make the workflow green.

## SEC-02 — Build job receives deployment/OIDC authority and executes tag-pinned supply-chain code

**Severity:** Medium
**Confidence:** High
**Status:** Confirmed configuration weakness

### Evidence

- `.github/workflows/deploy-pages.yml:8-11` grants `contents: read`, `pages: write`, and `id-token: write` at workflow scope.
- Those permissions therefore apply to the `build` job at lines 18-35, which executes checkout/setup actions, `npm ci`, Playwright browser installation, repository scripts, and the artifact uploader.
- Lines 21, 22, 33, and 45 reference mutable major-version action tags rather than immutable commit SHAs.

### Concrete failure scenario

If a compromised package install script, repository build script, or mutable action runs in the build job, it runs in a job allowed to request an OIDC token and carrying Pages write authority. Whether that token can be exchanged depends on the repository’s configured trust policy, but the capability is unnecessary during build and expands the blast radius of a supply-chain compromise.

### Recommended fix

Move permissions to job scope:

- `build`: `contents: read` only;
- `deploy`: `pages: write`, `id-token: write`, and only any additional permission the Pages action explicitly requires.

Pin all external actions to full commit SHAs, retain version comments for maintainability, and use Dependabot/Renovate to advance those SHAs. Keep the protected `github-pages` environment on the deploy job.

## SEC-03 — Preview server follows symlinks outside `out/` and listens beyond localhost

**Severity:** Low
**Confidence:** High
**Status:** Confirmed code path; local preview only

### Evidence

- `scripts/serve-static.mjs:16-18` checks only whether the lexical resolved path begins with the lexical `outDir`.
- Lines 97-115 call `stat()` on that path. `stat()` follows symlinks; the code never compares the target’s `realpath()` with the real output root.
- Line 164 streams the same path, following the symlink again.
- Lines 175-178 call `server.listen(port)` without a host while logging a `localhost` URL. On ordinary Node platforms, the omitted host listens on the unspecified address rather than explicitly restricting the listener to loopback.

### Concrete failure scenario

A malicious or stale symlink such as `out/leak -> /path/to/readable/local/file` passes the lexical containment check. While the developer runs `npm start`, another machine able to reach the preview port can request `/travelback/leak` and receive that file. Normal Next builds create a trusted `out/`, so this requires local output tampering and does not affect GitHub Pages.

### Recommended fix

Bind to `127.0.0.1` by default and require an explicit `--host` opt-in for LAN exposure. Resolve the real output root and candidate with `realpath()`, then enforce containment on the real paths immediately before opening. Where supported, open without following a final symlink and stream from the validated file descriptor to reduce check/use races. Add a preview-server test containing an in-tree symlink to an out-of-tree temporary file.

## SEC-04 — CSP hardener hashes decoded script text, although `<script>` is raw text

**Severity:** Low
**Confidence:** High
**Status:** Confirmed latent availability bug; no current emitted-script trigger observed

### Evidence

- `scripts/harden-static-export.mjs:52-68` decodes HTML entities.
- `scripts/harden-static-export.mjs:76-84` hashes the decoded value for every inline script.
- HTML script elements are raw-text elements. For example, parsing `<script>window.x="&amp;"</script>` yields literal script text `window.x="&amp;"`, not `window.x="&"`. The repository’s own style-hash comment at lines 90-93 recognizes the same raw-text rule for `<style>` but applies the opposite rule to scripts.
- `scripts/smoke-static.mjs:144-240` verifies that script hashes exist, but unlike its inline-style loop at lines 220-229, it never recomputes each hash from the exact serialized script body.

### Concrete failure scenario

If a future Next bootstrap or application inline script contains an entity-shaped literal such as `&amp;`, the hardener authorizes the hash of a different string. The browser rejects the legitimate script under CSP, potentially preventing hydration or the early theme/frame bootstrap. This is fail-closed rather than a CSP bypass.

### Recommended fix

Remove entity decoding from `computeScriptHashes()` and hash `match[1]` exactly as serialized, just as styles are handled. Extend the static smoke check to extract every non-`src` script, hash the literal body, and require that exact source in `script-src`. Add a focused fixture containing `&amp;`, numeric entities, and ordinary `<`/`>` JavaScript syntax.

## Positive controls verified

- Untrusted imports are bounded by file size, XML depth/tag count, Google entry count, and track-point limits; parsing is abortable and the largest JSON path is isolated in a worker.
- XML containing `DOCTYPE`/`ENTITY` is rejected before DOM parsing, and the parser strips any residual entity syntax.
- Imported names are rendered through React rather than assigned to HTML. Filename construction is sanitized.
- The only `dangerouslySetInnerHTML` use is a fixed bootstrap string defined in the same module; it contains no user-controlled value.
- No application `eval`, `new Function`, credential-bearing request, wildcard `postMessage` receiver, or remote map/font/script source was found.
- The static CSP restricts `default-src`, scripts, stylesheets, objects, base URLs, frames via the documented fallback, media, workers, and connections. Static smoke checks cover most policy invariants.
- Map styles have empty `sources` and no sprites/glyphs; route files remain local to the browser.
- Object URLs are revoked across reset, replacement, failure, and unmount paths.
- External help links use `noopener noreferrer`.
- The export test stub is limited to localhost/loopback and emits a warning when active.
- Repository-wide credential-pattern search returned no matches.

## Validation

| Check | Result |
|---|---|
| `npm audit --omit=dev --json` | **Failed as expected:** 2 high, 0 critical; Next and Sharp |
| `npm audit --json` | **Failed as expected:** same 2 high findings |
| `npm test -- --reporter=verbose` | Passed: 21 files, 472 tests |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| Full Chromium E2E | Passed: 110 tests; 1 explicitly gated real-WebCodecs test skipped; 0 failed |
| Secret-pattern sweep | No matches |

## Residual manual checks

The actual host-level headers for GitHub Pages/CDN cannot be proven from the repository. The architecture correctly notes that meta CSP cannot enforce `frame-ancestors`; a deployed-header check remains necessary wherever a header-capable front end is used. Real malicious-file fuzzing, browser codec fuzzing, and third-party package provenance review were outside this source audit.
